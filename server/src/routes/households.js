const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');
const expiryPatternService = require('../services/expiryPatternService');

const router = express.Router();

/**
 * GET /api/v1/households
 * Felhasználó háztartásainak listája
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        h.id, h.name, h.description, h.created_at,
        hm.role, hm.joined_at,
        COUNT(hm2.id) as member_count
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      LEFT JOIN household_members hm2 ON h.id = hm2.household_id AND hm2.left_at IS NULL
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
      GROUP BY h.id, h.name, h.description, h.created_at, hm.role, hm.joined_at
      ORDER BY hm.joined_at ASC
    `, [req.user.id]);

    res.json({
      households: result.rows.map(household => ({
        id: household.id,
        name: household.name,
        description: household.description,
        role: household.role,
        memberCount: parseInt(household.member_count),
        joinedAt: household.joined_at,
        createdAt: household.created_at
      }))
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getUserHouseholds' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Háztartások lekérése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households
 * Új háztartás létrehozása
 */
router.post('/', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('A háztartás nevének 2-255 karakter hosszúnak kell lennie'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('A leírás maximum 500 karakter lehet')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { name, description } = req.body;

    // Ellenőrizzük, hogy a felhasználó hány háztartásnak a tagja
    const householdCountResult = await query(`
      SELECT COUNT(*) as count
      FROM household_members hm
      JOIN households h ON hm.household_id = h.id
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
    `, [req.user.id]);

    const currentHouseholdCount = parseInt(householdCountResult.rows[0].count);
    
    if (currentHouseholdCount >= 5) {
      return res.status(400).json({
        error: 'Háztartás limit elérve',
        message: 'Legfeljebb 5 háztartásnak lehet tagja egyszerre'
      });
    }

    // Generate unique invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const result = await transaction(async (client) => {
      // Create household
      const householdResult = await client.query(`
        INSERT INTO households (name, description, invite_code, invite_code_expires)
        VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
        RETURNING *
      `, [name, description || null, inviteCode]);

      const household = householdResult.rows[0];

      // Add creator as admin
      await client.query(`
        INSERT INTO household_members (household_id, user_id, role, invited_by_user_id)
        VALUES ($1, $2, 'admin', $2)
      `, [household.id, req.user.id]);

      // Create default household settings
      await client.query(`
        INSERT INTO household_settings (
          household_id, auto_shopping_enabled, expiry_warning_days, 
          low_stock_threshold, preferred_stores, budget_settings
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        household.id,
        true,
        3,
        1.0,
        JSON.stringify([]),
        JSON.stringify({ monthly_limit: null, categories: {} })
      ]);

      return household;
    });

    logger.info('Household created successfully', {
      householdId: result.id,
      name: result.name,
      createdBy: req.user.id
    });

    res.status(201).json({
      message: 'Háztartás sikeresen létrehozva',
      household: {
        id: result.id,
        name: result.name,
        description: result.description,
        inviteCode: result.invite_code,
        inviteCodeExpires: result.invite_code_expires,
        role: 'admin',
        createdAt: result.created_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'createHousehold' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Háztartás létrehozása során hiba történt'
    });
  }
});

/**
 * GET /api/v1/households/:id
 * Háztartás részletes adatai
 */
router.get('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen háztartás azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const householdId = req.params.id;

    // Check if user is member of this household
    const membershipResult = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (membershipResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Nem vagy tagja ennek a háztartásnak'
      });
    }

    const userRole = membershipResult.rows[0].role;

    // Get household details
    const householdResult = await query(`
      SELECT h.*, hs.auto_shopping_enabled, hs.expiry_warning_days, 
             hs.low_stock_threshold, hs.preferred_stores, hs.budget_settings
      FROM households h
      LEFT JOIN household_settings hs ON h.id = hs.household_id
      WHERE h.id = $1
    `, [householdId]);

    if (householdResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Háztartás nem található'
      });
    }

    const household = householdResult.rows[0];

    // Get members
    const membersResult = await query(`
      SELECT 
        u.id, u.name, u.email, 
        hm.role, hm.joined_at, hm.permissions
      FROM household_members hm
      JOIN users u ON hm.user_id = u.id
      WHERE hm.household_id = $1 AND hm.left_at IS NULL
      ORDER BY hm.joined_at ASC
    `, [householdId]);

    // Get inventory summary
    const inventoryResult = await query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN quantity <= minimum_stock AND minimum_stock > 0 THEN 1 END) as low_stock
      FROM household_inventory
      WHERE household_id = $1
    `, [householdId]);

    // Get active shopping lists count
    const shoppingListsResult = await query(`
      SELECT COUNT(*) as active_lists
      FROM shopping_lists
      WHERE household_id = $1 AND status = 'active'
    `, [householdId]);

    const inventoryStats = inventoryResult.rows[0];
    const shoppingStats = shoppingListsResult.rows[0];

    res.json({
      household: {
        id: household.id,
        name: household.name,
        description: household.description,
        inviteCode: userRole === 'admin' ? household.invite_code : null,
        inviteCodeExpires: userRole === 'admin' ? household.invite_code_expires : null,
        createdAt: household.created_at,
        userRole,
        settings: {
          autoShoppingEnabled: household.auto_shopping_enabled,
          expiryWarningDays: household.expiry_warning_days,
          lowStockThreshold: household.low_stock_threshold,
          preferredStores: typeof household.preferred_stores === 'string' 
            ? JSON.parse(household.preferred_stores) 
            : household.preferred_stores,
          budgetSettings: typeof household.budget_settings === 'string' 
            ? JSON.parse(household.budget_settings) 
            : household.budget_settings
        },
        members: membersResult.rows.map(member => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          joinedAt: member.joined_at,
          permissions: member.permissions || {}
        })),
        stats: {
          totalItems: parseInt(inventoryStats.total_items),
          expiringSoon: parseInt(inventoryStats.expiring_soon),
          lowStock: parseInt(inventoryStats.low_stock),
          activeShoppingLists: parseInt(shoppingStats.active_lists)
        }
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getHouseholdDetails' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Háztartás adatok lekérése során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/households/:id
 * Háztartás adatainak módosítása
 */
router.put('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('A háztartás nevének 2-255 karakter hosszúnak kell lennie'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('A leírás maximum 500 karakter lehet')
], requireRole('admin'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const householdId = req.params.id;
    const { name, description } = req.body;

    const result = await query(`
      UPDATE households 
      SET name = COALESCE($1, name), description = COALESCE($2, description)
      WHERE id = $3
      RETURNING *
    `, [name, description, householdId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Háztartás nem található'
      });
    }

    logger.info('Household updated successfully', {
      householdId,
      updatedBy: req.user.id
    });

    res.json({
      message: 'Háztartás sikeresen frissítve',
      household: result.rows[0]
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateHousehold' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Háztartás frissítése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households/:id/invite
 * Új meghívó kód generálása
 */
router.post('/:id/invite', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen háztartás azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const householdId = req.params.id;

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await query(`
      SELECT id FROM household_members
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Csak a háztartás tagjai generálhatnak meghívó kódot'
      });
    }

    const newInviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const result = await query(`
      UPDATE households 
      SET invite_code = $1, invite_code_expires = NOW() + INTERVAL '30 days'
      WHERE id = $2
      RETURNING invite_code, invite_code_expires
    `, [newInviteCode, householdId]);

    logger.info('New invite code generated', {
      householdId,
      generatedBy: req.user.id
    });

    res.json({
      message: 'Új meghívó kód generálva',
      inviteCode: result.rows[0].invite_code,
      expiresAt: result.rows[0].invite_code_expires
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'generateInviteCode' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Meghívó kód generálása során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households/join/:code
 * Csatlakozás háztartáshoz meghívó kóddal
 */
router.post('/join/:code', [
  authenticateToken,
  param('code')
    .isLength({ min: 8, max: 8 })
    .isAlphanumeric()
    .withMessage('Érvénytelen meghívó kód formátum')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const inviteCode = req.params.code.toUpperCase();

    // Find household by invite code
    const householdResult = await query(`
      SELECT id, name, invite_code_expires
      FROM households
      WHERE invite_code = $1
    `, [inviteCode]);

    if (householdResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Érvénytelen meghívó kód',
        message: 'A megadott meghívó kód nem létezik'
      });
    }

    const household = householdResult.rows[0];

    // Check if invite code is expired
    if (new Date() > new Date(household.invite_code_expires)) {
      return res.status(410).json({
        error: 'Lejárt meghívó kód',
        message: 'A meghívó kód lejárt'
      });
    }

    // Check if user is already a member
    const existingMemberResult = await query(`
      SELECT id FROM household_members
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [household.id, req.user.id]);

    if (existingMemberResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Már tag vagy',
        message: 'Már tagja vagy ennek a háztartásnak'
      });
    }

    // Ellenőrizzük a háztartás limitet
    const householdCountResult = await query(`
      SELECT COUNT(*) as count
      FROM household_members hm
      JOIN households h ON hm.household_id = h.id
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
    `, [req.user.id]);

    const currentHouseholdCount = parseInt(householdCountResult.rows[0].count);
    
    if (currentHouseholdCount >= 5) {
      return res.status(400).json({
        error: 'Háztartás limit elérve',
        message: 'Legfeljebb 5 háztartásnak lehet tagja egyszerre'
      });
    }

    // Add user to household
    await query(`
      INSERT INTO household_members (household_id, user_id, role)
      VALUES ($1, $2, 'member')
    `, [household.id, req.user.id]);

    logger.info('User joined household successfully', {
      householdId: household.id,
      userId: req.user.id,
      inviteCode
    });

    res.json({
      message: 'Sikeresen csatlakoztál a háztartáshoz',
      household: {
        id: household.id,
        name: household.name,
        role: 'member'
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'joinHousehold' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Háztartáshoz csatlakozás során hiba történt'
    });
  }
});

/**
 * DELETE /api/v1/households/:id/members/:userId
 * Tag eltávolítása háztartásból
 */
router.delete('/:id/members/:userId', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  param('userId').isUUID().withMessage('Érvénytelen felhasználó azonosító')
], requireRole('admin'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { id: householdId, userId } = req.params;

    // Can't remove yourself if you're the only admin
    if (userId === req.user.id) {
      const adminCount = await query(`
        SELECT COUNT(*) as admin_count
        FROM household_members
        WHERE household_id = $1 AND role = 'admin' AND left_at IS NULL
      `, [householdId]);

      if (parseInt(adminCount.rows[0].admin_count) <= 1) {
        return res.status(400).json({
          error: 'Nem távolíthatod el magad',
          message: 'Legalább egy adminnak maradnia kell a háztartásban'
        });
      }
    }

    // Remove member
    const result = await query(`
      UPDATE household_members
      SET left_at = NOW()
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING *
    `, [householdId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tag nem található',
        message: 'A felhasználó nem tagja ennek a háztartásnak'
      });
    }

    logger.info('Member removed from household', {
      householdId,
      removedUserId: userId,
      removedBy: req.user.id
    });

    res.json({
      message: 'Tag sikeresen eltávolítva a háztartásból'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'removeMember' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tag eltávolítása során hiba történt'
    });
  }
});

/**
 * GET /api/v1/households/:id/inventory
 * Háztartás készletének lekérése
 */
router.get('/:id/inventory', authenticateToken, async (req, res) => {
  try {
    const householdId = req.params.id;
    
    // Check if user is member of household
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Nem vagy tagja ennek a háztartásnak'
      });
    }

    // Get inventory items (simplified query based on actual table structure)
    const inventoryResult = await query(`
      SELECT 
        hi.*,
        hi.custom_name as product_name,
        NULL as brand,
        NULL as category,
        NULL as image_url,
        NULL as nutrition_data,
        pp.price as saved_price,
        CASE 
          WHEN hi.expiry_date <= CURRENT_DATE THEN 'expired'
          WHEN hi.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'critical'
          WHEN hi.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
          ELSE 'good'
        END as expiry_status
      FROM household_inventory hi
      LEFT JOIN product_prices pp ON pp.barcode = hi.barcode AND pp.user_id = $2
      WHERE hi.household_id = $1
      ORDER BY hi.expiry_date ASC NULLS LAST, hi.created_at DESC
    `, [householdId, req.user.id]);

    // Get stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN quantity <= minimum_stock AND minimum_stock > 0 THEN 1 END) as low_stock
      FROM household_inventory
      WHERE household_id = $1
    `, [householdId]);

    const stats = statsResult.rows[0];

    res.json({
      items: inventoryResult.rows.map(item => ({
        id: item.id,
        name: item.custom_name || item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiry_date,
        location: item.location,
        notes: item.notes,
        barcode: item.barcode,
        price: item.saved_price,
        brand: item.brand,
        category: item.category,
        image_url: item.image_url,
        nutrition_data: item.nutrition_data,
        expiry_status: item.expiry_status,
        created_at: item.created_at,
        updated_at: item.updated_at
      })),
      stats: {
        totalItems: parseInt(stats.total_items),
        expiringSoon: parseInt(stats.expiring_soon),
        expired: parseInt(stats.expired),
        lowStock: parseInt(stats.low_stock)
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getHouseholdInventory' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Készlet lekérése során hiba történt'
    });
  }
});

/**
 * GET /api/v1/households/:id/inventory/expiry-suggestion
 * Lejárati dátum javaslat lekérése egy termékhez
 */
router.get('/:id/inventory/expiry-suggestion', [
  authenticateToken,
  queryValidator('barcode').optional().trim(),
  queryValidator('productName').optional().trim()
], async (req, res) => {
  try {
    const householdId = req.params.id;
    const { barcode, productName } = req.query;

    if (!barcode && !productName) {
      return res.status(400).json({
        error: 'Hiányzó paraméter',
        message: 'Barcode vagy productName megadása kötelező'
      });
    }

    const suggestion = await expiryPatternService.getExpirySuggestion(
      householdId,
      barcode,
      productName
    );

    if (!suggestion) {
      return res.json({
        hasPattern: false,
        message: 'Nincs elég adat ehhez a termékhez (minimum 3 minta szükséges)'
      });
    }

    res.json(suggestion);

  } catch (error) {
    logger.logError(error, req, { operation: 'getExpirySuggestion' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Lejárati javaslat lekérése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households/:id/inventory
 * Új tétel hozzáadása a háztartás készletéhez
 */
router.post('/:id/inventory', [
  authenticateToken,
  body('custom_name').trim().isLength({ min: 1, max: 255 }).withMessage('Termék neve kötelező'),
  body('quantity').isNumeric().withMessage('Mennyiség számnak kell lennie'),
  body('unit').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('location').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('expiry_date').optional({ nullable: true }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Érvényes dátum szükséges'),
  body('barcode').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('price').optional({ nullable: true }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
  }).withMessage('Az árnak pozitív számnak kell lennie'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen adatok',
        details: errors.array()
      });
    }

    const householdId = req.params.id;
    const { custom_name, quantity, unit, location, expiry_date, barcode, notes, price, purchase_date } = req.body;
    
    console.log('📦 Adding inventory item:', { custom_name, quantity, expiry_date, location, barcode, price, purchase_date });
    
    // Check if user is member of household
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Nem vagy tagja ennek a háztartásnak'
      });
    }

    // Disable audit trigger temporarily and handle manually
    await query('ALTER TABLE household_inventory DISABLE TRIGGER inventory_audit_trigger');

    // Add inventory item
    const result = await query(`
      INSERT INTO household_inventory (
        household_id, custom_name, quantity, unit, location, 
        expiry_date, notes, barcode, price, purchase_date, added_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      householdId, custom_name, quantity, unit || 'db', location || 'Egyéb',
      expiry_date || null, notes || null, barcode || null, 
      price ? parseFloat(price) : null, 
      purchase_date || new Date().toISOString().split('T')[0], 
      req.user.id
    ]);
    
    // Re-enable audit trigger
    await query('ALTER TABLE household_inventory ENABLE TRIGGER inventory_audit_trigger');
    
    // Manual audit log entry
    const item = result.rows[0];
    await query(`
      INSERT INTO inventory_changes (
        household_inventory_id, user_id, change_type,
        old_quantity, new_quantity, quantity_change, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      item.id, req.user.id, 'add',
      0, parseFloat(quantity), parseFloat(quantity), 'Új termék hozzáadása'
    ]);

    res.status(201).json({
      item: {
        id: item.id,
        name: item.custom_name,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        expiryDate: item.expiry_date,
        notes: item.notes,
        barcode: item.barcode,
        created_at: item.created_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'addInventoryItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel hozzáadása során hiba történt'
    });
  }
});

/**
 * GET /api/v1/households/:id/shopping-lists
 * Háztartás bevásárlólistáinak lekérése
 */
router.get('/:id/shopping-lists', authenticateToken, async (req, res) => {
  try {
    const householdId = req.params.id;
    
    // Check if user is member of household
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Nem vagy tagja ennek a háztartásnak'
      });
    }

    // Get shopping lists
    const listsResult = await query(`
      SELECT 
        sl.*,
        COUNT(sli.id) as item_count,
        COUNT(CASE WHEN sli.purchased = true THEN 1 END) as purchased_count
      FROM shopping_lists sl
      LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
      WHERE sl.household_id = $1 AND sl.status = 'active'
      GROUP BY sl.id
      ORDER BY sl.created_at DESC
    `, [householdId]);

    res.json({
      shoppingLists: listsResult.rows.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        status: list.status,
        itemCount: parseInt(list.item_count),
        purchasedCount: parseInt(list.purchased_count),
        isDefault: list.name === 'Bevásárlólista',
        created_at: list.created_at,
        updated_at: list.updated_at
      }))
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getShoppingLists' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Bevásárlólisták lekérése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households/:id/shopping-lists
 * Új bevásárlólista létrehozása
 */
router.post('/:id/shopping-lists', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Lista neve kötelező'),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen adatok',
        details: errors.array()
      });
    }

    const householdId = req.params.id;
    const { name, description } = req.body;
    
    // Check if user is member of household
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Nem vagy tagja ennek a háztartásnak'
      });
    }

    // Create shopping list
    const result = await query(`
      INSERT INTO shopping_lists (household_id, name, description, created_by_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [householdId, name, description || null, req.user.id]);

    const list = result.rows[0];

    res.status(201).json({
      shoppingList: {
        id: list.id,
        name: list.name,
        description: list.description,
        status: list.status,
        created_at: list.created_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'createShoppingList' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Bevásárlólista létrehozása során hiba történt'
    });
  }
});

/**
 * GET /api/v1/shopping-lists/:id
 * Bevásárlólista részletes adatainak lekérése
 */
router.get('/shopping-lists/:listId', authenticateToken, async (req, res) => {
  try {
    const listId = req.params.listId;
    
    console.log('Shopping list access attempt:', {
      listId: listId,
      userId: req.user.id,
      userEmail: req.user.email
    });
    
    // Get shopping list with items
    const listResult = await query(`
      SELECT sl.*, h.id as household_id
      FROM shopping_lists sl
      JOIN households h ON sl.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE sl.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [listId, req.user.id]);

    console.log('Shopping list query result:', {
      found: listResult.rows.length > 0,
      listId: listId,
      userId: req.user.id
    });

    if (listResult.rows.length === 0) {
      // Extra debug: ellenőrizzük, hogy létezik-e a lista
      const listExists = await query('SELECT id, household_id FROM shopping_lists WHERE id = $1', [listId]);
      console.log('List exists check:', {
        exists: listExists.rows.length > 0,
        householdId: listExists.rows[0]?.household_id
      });
      
      if (listExists.rows.length > 0) {
        // Ellenőrizzük a user háztartás tagságát
        const memberCheck = await query(`
          SELECT role FROM household_members 
          WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
        `, [listExists.rows[0].household_id, req.user.id]);
        
        console.log('User membership check:', {
          householdId: listExists.rows[0].household_id,
          userId: req.user.id,
          isMember: memberCheck.rows.length > 0,
          role: memberCheck.rows[0]?.role
        });
      }
      
      return res.status(403).json({
        error: 'Hozzáférés megtagadva',
        message: 'Bevásárlólista nem található vagy nincs hozzáférésed'
      });
    }

    const list = listResult.rows[0];

    // Get list items (simplified query without product_id for now)
    const itemsResult = await query(`
      SELECT sli.*, 
             sli.custom_name as product_name, 
             NULL as barcode, 
             NULL as brand, 
             NULL as category
      FROM shopping_list_items sli
      WHERE sli.shopping_list_id = $1
      ORDER BY sli.created_at DESC
    `, [listId]);

    res.json({
      shoppingList: {
        id: list.id,
        name: list.name,
        description: list.description,
        status: list.status,
        created_at: list.created_at,
        updated_at: list.updated_at,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          name: item.custom_name || item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          purchased: item.purchased,
          notes: item.notes,
          barcode: item.barcode,
          brand: item.brand,
          category: item.category,
          created_at: item.created_at,
          purchased_at: item.purchased_at
        }))
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getShoppingListDetails' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Bevásárlólista lekérése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/shopping-lists/:id/items
 * Tétel hozzáadása bevásárlólistához
 */
router.post('/shopping-lists/:listId/items', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Tétel neve kötelező'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Mennyiség pozitív szám kell legyen'),
  body('unit').optional().trim().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen adatok',
        details: errors.array()
      });
    }

    const listId = req.params.listId;
    const { name, quantity, unit, notes } = req.body;
    
    // Check if user has access to shopping list
    const listCheck = await query(`
      SELECT sl.id
      FROM shopping_lists sl
      JOIN households h ON sl.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE sl.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [listId, req.user.id]);

    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Nem található',
        message: 'Bevásárlólista nem található vagy nincs hozzáférésed'
      });
    }

    // Add item to shopping list
    const result = await query(`
      INSERT INTO shopping_list_items (
        shopping_list_id, custom_name, quantity, unit, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [listId, name, quantity || 1, unit || 'db', notes || null]);

    const item = result.rows[0];

    res.status(201).json({
      item: {
        id: item.id,
        name: item.custom_name,
        quantity: item.quantity,
        unit: item.unit,
        purchased: item.purchased,
        notes: item.notes,
        created_at: item.created_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'addShoppingListItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel hozzáadása során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/shopping-lists/items/:itemId/purchase
 * Tétel megvásárlásának jelölése/visszavonása
 */
router.put('/shopping-lists/items/:itemId/purchase', [
  authenticateToken,
  body('purchased').isBoolean().withMessage('Purchased értéke boolean kell legyen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen adatok',
        details: errors.array()
      });
    }

    const itemId = req.params.itemId;
    const { purchased } = req.body;
    
    // Check if user has access to shopping list item
    const itemCheck = await query(`
      SELECT sli.id
      FROM shopping_list_items sli
      JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
      JOIN households h ON sl.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE sli.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [itemId, req.user.id]);

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Nem található',
        message: 'Tétel nem található vagy nincs hozzáférésed'
      });
    }

    // Update item purchase status
    const result = await query(`
      UPDATE shopping_list_items 
      SET purchased = $1, purchased_at = $2, purchased_by_user_id = $3
      WHERE id = $4
      RETURNING *
    `, [purchased, purchased ? new Date() : null, purchased ? req.user.id : null, itemId]);

    const item = result.rows[0];

    res.json({
      item: {
        id: item.id,
        purchased: item.purchased,
        purchased_at: item.purchased_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateItemPurchaseStatus' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel frissítése során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/inventory/:itemId
 * Készlet tétel frissítése
 */
router.put('/inventory/:itemId', [
  authenticateToken,
  body('quantity').optional().isInt({ min: 0 }).withMessage('Mennyiség nem lehet negatív'),
  body('location').optional().trim().isLength({ max: 100 }),
  body('expiryDate').optional().isISO8601().withMessage('Érvényes dátum szükséges')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen adatok',
        details: errors.array()
      });
    }

    const itemId = req.params.itemId;
    const updates = req.body;
    
    // Check if user has access to inventory item
    const itemCheck = await query(`
      SELECT hi.id
      FROM household_inventory hi
      JOIN households h ON hi.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hi.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [itemId, req.user.id]);

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Nem található',
        message: 'Tétel nem található vagy nincs hozzáférésed'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.quantity !== undefined) {
      updateFields.push(`quantity = $${paramIndex++}`);
      updateValues.push(updates.quantity);
    }
    if (updates.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(updates.location);
    }
    if (updates.expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramIndex++}`);
      updateValues.push(updates.expiryDate);
    }
    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateValues.push(updates.notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nincs frissítendő adat'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(itemId);

    const result = await query(`
      UPDATE household_inventory 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    const item = result.rows[0];

    res.json({
      item: {
        id: item.id,
        name: item.custom_name,
        quantity: item.quantity,
        location: item.location,
        expiryDate: item.expiry_date,
        notes: item.notes,
        updated_at: item.updated_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateInventoryItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel frissítése során hiba történt'
    });
  }
});

/**
 * DELETE /api/v1/inventory/:itemId
 * Készlet tétel törlése
 */
router.delete('/inventory/:itemId', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    
    // Check if user has access to inventory item
    const itemCheck = await query(`
      SELECT hi.id
      FROM household_inventory hi
      JOIN households h ON hi.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hi.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [itemId, req.user.id]);

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Nem található',
        message: 'Tétel nem található vagy nincs hozzáférésed'
      });
    }

    // Delete inventory item
    await query(`DELETE FROM household_inventory WHERE id = $1`, [itemId]);

    res.json({
      message: 'Tétel sikeresen törölve'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'deleteInventoryItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel törlése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households/:householdId/shopping-lists/:listId/items
 * Tétel hozzáadása háztartás bevásárlólistájához
 */
router.post('/:householdId/shopping-lists/:listId/items', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Tétel neve kötelező'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Mennyiség pozitív szám kell legyen'),
  body('unit').optional().trim().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen adatok',
        details: errors.array()
      });
    }

    const householdId = req.params.householdId;
    const listId = req.params.listId;
    const { name, quantity, unit, notes } = req.body;
    
    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      logger.warn('Security Event', {
        event: 'UNAUTHORIZED_HOUSEHOLD_ACCESS',
        userId: req.user.id,
        householdId: householdId
      });
      return res.status(403).json({
        error: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }
    
    // Ellenőrizzük, hogy a shopping list valóban ehhez a háztartáshoz tartozik-e
    const listCheck = await query(`
      SELECT id FROM shopping_lists 
      WHERE id = $1 AND household_id = $2
    `, [listId, householdId]);

    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Bevásárlólista nem található ebben a háztartásban'
      });
    }

    // Tétel hozzáadása
    const result = await query(`
      INSERT INTO shopping_list_items (
        shopping_list_id, custom_name, quantity, unit, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      listId, name, quantity || 1, unit || 'db', notes || null
    ]);

    logger.info('Shopping list item added successfully', {
      itemId: result.rows[0].id,
      listId: listId,
      householdId: householdId,
      addedBy: req.user.id,
      itemName: name
    });

    res.status(201).json({
      message: 'Tétel sikeresen hozzáadva',
      item: result.rows[0]
    });

  } catch (error) {
    logger.error('Add shopping list item error:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel hozzáadása során hiba történt'
    });
  }
});

/**
 * GET /api/v1/households/:householdId/shopping-lists/:listId/items
 * Háztartás bevásárlólista tételeinek lekérése
 */
router.get('/:householdId/shopping-lists/:listId/items', authenticateToken, async (req, res) => {
  try {
    const householdId = req.params.householdId;
    const listId = req.params.listId;
    
    console.log('Shopping list items lekérése:', {
      householdId: householdId,
      listId: listId,
      userId: req.user.id
    });
    
    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      logger.warn('Security Event', {
        event: 'UNAUTHORIZED_HOUSEHOLD_ACCESS',
        userId: req.user.id,
        householdId: householdId
      });
      return res.status(403).json({
        error: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }
    
    // Ellenőrizzük, hogy a shopping list valóban ehhez a háztartáshoz tartozik-e
    const listCheck = await query(`
      SELECT id, name FROM shopping_lists 
      WHERE id = $1 AND household_id = $2
    `, [listId, householdId]);

    if (listCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Bevásárlólista nem található ebben a háztartásban'
      });
    }

    const list = listCheck.rows[0];

    // Lekérjük a shopping list items-eket
    const itemsResult = await query(`
      SELECT sli.*, 
             sli.custom_name as product_name, 
             NULL as barcode, 
             NULL as brand, 
             NULL as category,
             NULL as image_url,
             NULL as nutrition_data
      FROM shopping_list_items sli
      WHERE sli.shopping_list_id = $1
      ORDER BY sli.created_at DESC
    `, [listId]);

    console.log('Shopping list items találat:', itemsResult.rows.length, 'tétel');

    res.json({
      shoppingList: {
        id: list.id,
        name: list.name,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          name: item.custom_name || item.product_name,
          custom_name: item.custom_name,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          purchased: item.purchased,
          notes: item.notes,
          barcode: item.barcode,
          brand: item.brand,
          category: item.category,
          image_url: item.image_url,
          nutrition_data: item.nutrition_data,
          created_at: item.created_at,
          purchased_at: item.purchased_at
        }))
      }
    });

  } catch (error) {
    logger.error('Get shopping list items error:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Shopping list items lekérése során hiba történt'
    });
  }
});

/**
 * DELETE /api/v1/households/:householdId/shopping-lists/:listId/items/:itemId
 * Tétel törlése háztartás bevásárlólistájáról
 */
router.delete('/:householdId/shopping-lists/:listId/items/:itemId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  param('listId').isUUID().withMessage('Érvénytelen lista azonosító'),
  param('itemId').isUUID().withMessage('Érvénytelen tétel azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId, listId, itemId } = req.params;

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await query(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      logger.warn('Security Event', {
        event: 'UNAUTHORIZED_HOUSEHOLD_ACCESS',
        userId: req.user.id,
        householdId: householdId
      });
      return res.status(403).json({
        error: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    // Ellenőrizzük, hogy a tétel létezik és a megfelelő listához tartozik
    const itemCheck = await query(`
      SELECT sli.id, sl.household_id, sl.name as list_name
      FROM shopping_list_items sli
      JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
      WHERE sli.id = $1 AND sl.id = $2 AND sl.household_id = $3
    `, [itemId, listId, householdId]);

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Nem található',
        message: 'A tétel nem található vagy nem tartozik ehhez a listához'
      });
    }

    // Töröljük a tételt
    await query(`
      DELETE FROM shopping_list_items 
      WHERE id = $1
    `, [itemId]);

    logger.info('Shopping list item deleted from household', {
      itemId,
      listId,
      householdId,
      deletedBy: req.user.id
    });

    res.json({
      message: 'Tétel sikeresen törölve a bevásárlólistáról'
    });

  } catch (error) {
    logger.error('Delete shopping list item error:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel törlése során hiba történt'
    });
  }
});

module.exports = router;
