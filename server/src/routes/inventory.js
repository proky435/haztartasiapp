const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../database/connection');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const expiryPatternService = require('../services/expiryPatternService');

const router = express.Router();

/**
 * GET /api/v1/households/:householdId/inventory/expiry-suggestion
 * Lejárati dátum javaslat lekérése egy termékhez
 */
router.get('/expiry-suggestion', [
  authenticateToken,
  queryValidator('barcode').optional().trim(),
  queryValidator('productName').optional().trim()
], requireRole('viewer'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Expiry suggestion validation error', {
        errors: errors.array(),
        params: req.params,
        query: req.query
      });
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId } = req.params;
    const { barcode, productName } = req.query;

    logger.info('Expiry suggestion request', {
      householdId,
      barcode,
      productName,
      params: req.params,
      query: req.query
    });

    if (!householdId) {
      return res.status(400).json({
        error: 'Hiányzó paraméter',
        message: 'Household ID megadása kötelező'
      });
    }

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
    logger.error('Hiba a lejárati javaslat lekérésekor:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Lejárati javaslat lekérése során hiba történt'
    });
  }
});

/**
 * GET /api/v1/households/:householdId/inventory
 * Háztartási készlet lekérése
 */
router.get('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  queryValidator('category').optional().trim(),
  queryValidator('location').optional().trim(),
  queryValidator('expiring').optional().isBoolean(),
  queryValidator('low_stock').optional().isBoolean(),
  queryValidator('search').optional().trim(),
  queryValidator('sort').optional().isIn(['name', 'expiry_date', 'quantity', 'created_at']),
  queryValidator('order').optional().isIn(['asc', 'desc']),
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 })
], requireRole('viewer'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId } = req.params;
    const {
      category,
      location,
      expiring,
      low_stock,
      search,
      sort = 'created_at',
      order = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build WHERE conditions
    let whereConditions = ['hi.household_id = $1'];
    let queryParams = [householdId];
    let paramIndex = 2;

    if (category) {
      whereConditions.push(`pm.category ILIKE $${paramIndex}`);
      queryParams.push(`%${category}%`);
      paramIndex++;
    }

    if (location) {
      whereConditions.push(`hi.location ILIKE $${paramIndex}`);
      queryParams.push(`%${location}%`);
      paramIndex++;
    }

    if (expiring === 'true') {
      whereConditions.push(`hi.expiry_date <= CURRENT_DATE + INTERVAL '7 days'`);
    }

    if (low_stock === 'true') {
      whereConditions.push(`hi.quantity <= hi.minimum_stock AND hi.minimum_stock > 0`);
    }

    if (search) {
      whereConditions.push(`(
        COALESCE(pm.name, hi.custom_name) ILIKE $${paramIndex} OR
        COALESCE(pm.brand, hi.custom_brand) ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    const validSortColumns = {
      'name': 'COALESCE(pm.name, hi.custom_name)',
      'expiry_date': 'hi.expiry_date',
      'quantity': 'hi.quantity',
      'created_at': 'hi.created_at'
    };

    const orderBy = `${validSortColumns[sort]} ${order.toUpperCase()}`;

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM household_inventory hi
      LEFT JOIN products_master pm ON hi.product_master_id = pm.id
      WHERE ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // Get inventory items
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        hi.id, hi.product_master_id, hi.custom_name, hi.custom_brand,
        hi.quantity, hi.unit, hi.location, hi.expiry_date, hi.purchase_date,
        hi.price, hi.store, hi.notes, hi.is_favorite, hi.minimum_stock,
        hi.added_by_user_id, hi.created_at, hi.updated_at,
        pm.id as product_id, pm.barcode, pm.name as product_name, 
        pm.brand as product_brand, pm.category, pm.image_url, pm.thumbnail_url,
        pm.nutrition_data, pm.allergens,
        u.name as added_by_name
      FROM household_inventory hi
      LEFT JOIN products_master pm ON hi.product_master_id = pm.id
      LEFT JOIN users u ON hi.added_by_user_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    const items = result.rows.map(item => ({
      id: item.id,
      product: item.product_master_id ? {
        id: item.product_id,
        barcode: item.barcode,
        name: item.product_name,
        brand: item.product_brand,
        category: item.category,
        image_url: item.image_url,
        thumbnail_url: item.thumbnail_url,
        nutrition_data: typeof item.nutrition_data === 'string' 
          ? JSON.parse(item.nutrition_data) 
          : item.nutrition_data,
        allergens: item.allergens
      } : null,
      customName: item.custom_name,
      customBrand: item.custom_brand,
      displayName: item.product_name || item.custom_name,
      displayBrand: item.product_brand || item.custom_brand,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      location: item.location,
      expiryDate: item.expiry_date,
      purchaseDate: item.purchase_date,
      price: item.price ? parseFloat(item.price) : null,
      store: item.store,
      notes: item.notes,
      isFavorite: item.is_favorite,
      minimumStock: item.minimum_stock ? parseFloat(item.minimum_stock) : 0,
      addedBy: {
        id: item.added_by_user_id,
        name: item.added_by_name
      },
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      // Status indicators
      isExpiringSoon: item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExpired: item.expiry_date && new Date(item.expiry_date) < new Date(),
      isLowStock: item.minimum_stock > 0 && parseFloat(item.quantity) <= parseFloat(item.minimum_stock)
    }));

    // Get summary statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(hi.quantity) as total_quantity,
        COUNT(CASE WHEN hi.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN hi.expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN hi.quantity <= hi.minimum_stock AND hi.minimum_stock > 0 THEN 1 END) as low_stock,
        COUNT(DISTINCT hi.location) as locations_count,
        COUNT(DISTINCT pm.category) as categories_count
      FROM household_inventory hi
      LEFT JOIN products_master pm ON hi.product_master_id = pm.id
      WHERE hi.household_id = $1
    `, [householdId]);

    const stats = statsResult.rows[0];

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalItems: parseInt(stats.total_items),
        totalQuantity: parseFloat(stats.total_quantity || 0),
        expiringSoon: parseInt(stats.expiring_soon),
        expired: parseInt(stats.expired),
        lowStock: parseInt(stats.low_stock),
        locationsCount: parseInt(stats.locations_count),
        categoriesCount: parseInt(stats.categories_count)
      },
      filters: {
        category,
        location,
        expiring: expiring === 'true',
        lowStock: low_stock === 'true',
        search
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getInventory' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Készlet lekérése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/households/:householdId/inventory
 * Új termék hozzáadása a készlethez
 */
router.post('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  body('product_master_id').optional().isUUID().withMessage('Érvénytelen termék azonosító'),
  body('custom_name').optional().trim().isLength({ min: 1, max: 255 }),
  body('custom_brand').optional().trim().isLength({ max: 255 }),
  body('barcode').optional().trim().isLength({ min: 8, max: 20 }).withMessage('Érvénytelen vonalkód'),
  body('quantity').isNumeric().withMessage('A mennyiségnek számnak kell lennie'),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('location').optional().trim().isLength({ max: 100 }),
  body('expiry_date').optional().isISO8601().withMessage('Érvénytelen dátum formátum'),
  body('purchase_date').optional().isISO8601().withMessage('Érvénytelen dátum formátum'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Az árnak pozitív számnak kell lennie'),
  body('store').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('minimum_stock').optional().isFloat({ min: 0 }).withMessage('A minimum készletnek pozitív számnak kell lennie')
], requireRole('member'), requirePermission('add_inventory'), async (req, res) => {
  try {
    console.log('📦 Inventory add request:', {
      body: req.body,
      params: req.params
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      logger.warn('Inventory add validation error', {
        errors: errors.array(),
        body: req.body,
        params: req.params
      });
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    console.log('✅ Validation passed');
    const { householdId } = req.params;
    const {
      product_master_id,
      custom_name,
      custom_brand,
      barcode,
      quantity,
      unit = 'db',
      location,
      expiry_date,
      purchase_date,
      price,
      store,
      notes,
      minimum_stock = 0
    } = req.body;

    // Validate that either product_master_id or custom_name is provided
    if (!product_master_id && !custom_name) {
      return res.status(400).json({
        error: 'Validációs hiba',
        message: 'Termék azonosító vagy egyedi név megadása kötelező'
      });
    }

    // If product_master_id is provided, verify it exists
    if (product_master_id) {
      const productResult = await query(
        'SELECT id FROM products_master WHERE id = $1',
        [product_master_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Termék nem található',
          message: 'A megadott termék azonosító nem létezik'
        });
      }
    }

    const result = await query(`
      INSERT INTO household_inventory (
        household_id, product_master_id, custom_name, custom_brand,
        quantity, unit, location, expiry_date, purchase_date, price,
        store, notes, minimum_stock, added_by_user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `, [
      householdId,
      product_master_id || null,
      custom_name || null,
      custom_brand || null,
      quantity,
      unit,
      location || null,
      expiry_date || null,
      purchase_date || null,
      price || null,
      store || null,
      notes || null,
      minimum_stock,
      req.user.id
    ]);

    const inventoryItem = result.rows[0];

    // Get product details if available
    let productDetails = null;
    if (product_master_id) {
      const productResult = await query(
        'SELECT * FROM products_master WHERE id = $1',
        [product_master_id]
      );
      productDetails = productResult.rows[0];
    }

    // Lejárati minta rögzítése (ha van expiry_date és purchase_date)
    if (expiry_date && purchase_date) {
      try {
        const purchaseDateTime = new Date(purchase_date);
        const expiryDateTime = new Date(expiry_date);
        const shelfLifeDays = Math.round((expiryDateTime - purchaseDateTime) / (1000 * 60 * 60 * 24));
        
        if (shelfLifeDays >= 0) {
          await expiryPatternService.recordExpiryPattern(
            householdId,
            productDetails?.barcode || null,
            productDetails?.name || custom_name,
            shelfLifeDays
          );
        }
      } catch (patternError) {
        // Ne dobjunk hibát, csak logoljuk
        logger.warn('Lejárati minta rögzítése sikertelen:', patternError);
      }
    } else if (expiry_date) {
      // Ha nincs purchase_date, használjuk a mai napot
      try {
        const today = new Date();
        const expiryDateTime = new Date(expiry_date);
        const shelfLifeDays = Math.round((expiryDateTime - today) / (1000 * 60 * 60 * 24));
        
        if (shelfLifeDays >= 0) {
          await expiryPatternService.recordExpiryPattern(
            householdId,
            productDetails?.barcode || null,
            productDetails?.name || custom_name,
            shelfLifeDays
          );
        }
      } catch (patternError) {
        logger.warn('Lejárati minta rögzítése sikertelen:', patternError);
      }
    }

    logger.info('Inventory item added successfully', {
      inventoryId: inventoryItem.id,
      householdId,
      productId: product_master_id,
      customName: custom_name,
      quantity,
      addedBy: req.user.id
    });

    res.status(201).json({
      message: 'Termék sikeresen hozzáadva a készlethez',
      item: {
        id: inventoryItem.id,
        product: productDetails ? {
          id: productDetails.id,
          barcode: productDetails.barcode,
          name: productDetails.name,
          brand: productDetails.brand,
          category: productDetails.category,
          image_url: productDetails.image_url
        } : null,
        customName: inventoryItem.custom_name,
        customBrand: inventoryItem.custom_brand,
        displayName: productDetails?.name || inventoryItem.custom_name,
        displayBrand: productDetails?.brand || inventoryItem.custom_brand,
        quantity: parseFloat(inventoryItem.quantity),
        unit: inventoryItem.unit,
        location: inventoryItem.location,
        expiryDate: inventoryItem.expiry_date,
        purchaseDate: inventoryItem.purchase_date,
        price: inventoryItem.price ? parseFloat(inventoryItem.price) : null,
        store: inventoryItem.store,
        notes: inventoryItem.notes,
        minimumStock: parseFloat(inventoryItem.minimum_stock),
        createdAt: inventoryItem.created_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'addInventoryItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Termék hozzáadása során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/inventory/:id
 * Készlet tétel módosítása
 */
router.put('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen készlet tétel azonosító'),
  body('quantity').optional().isFloat({ min: 0 }).withMessage('A mennyiségnek pozitív számnak kell lennie'),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('location').optional().trim().isLength({ max: 100 }),
  body('expiry_date').optional().isISO8601().withMessage('Érvénytelen dátum formátum'),
  body('purchase_date').optional().isISO8601().withMessage('Érvénytelen dátum formátum'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Az árnak pozitív számnak kell lennie'),
  body('store').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('minimum_stock').optional().isFloat({ min: 0 }).withMessage('A minimum készletnek pozitív számnak kell lennie'),
  body('is_favorite').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const inventoryId = req.params.id;

    // Check if item exists and user has access
    const existingItemResult = await query(`
      SELECT hi.*, h.id as household_id
      FROM household_inventory hi
      JOIN households h ON hi.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hi.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [inventoryId, req.user.id]);

    if (existingItemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Készlet tétel nem található',
        message: 'A tétel nem létezik vagy nincs hozzáférésed'
      });
    }

    const existingItem = existingItemResult.rows[0];

    // Check permissions
    const memberResult = await query(`
      SELECT role FROM household_members
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [existingItem.household_id, req.user.id]);

    const userRole = memberResult.rows[0]?.role;
    if (!['admin', 'member'].includes(userRole)) {
      return res.status(403).json({
        error: 'Nincs jogosultságod',
        message: 'Csak admin és member jogosultságú felhasználók módosíthatják a készletet'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Build dynamic update query
    const allowedFields = [
      'quantity', 'unit', 'location', 'expiry_date', 'purchase_date',
      'price', 'store', 'notes', 'minimum_stock', 'is_favorite'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(req.body[field]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nincs módosítandó adat',
        message: 'Legalább egy mezőt meg kell adni a módosításhoz'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(inventoryId);

    // Disable audit trigger temporarily and handle manually
    await query('ALTER TABLE household_inventory DISABLE TRIGGER inventory_audit_trigger');
    
    const result = await query(`
      UPDATE household_inventory 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);
    
    // Re-enable audit trigger
    await query('ALTER TABLE household_inventory ENABLE TRIGGER inventory_audit_trigger');
    
    // Manual audit log entry
    if (req.body.quantity !== undefined) {
      const oldQuantity = existingItem.quantity;
      const newQuantity = parseFloat(req.body.quantity);
      
      await query(`
        INSERT INTO inventory_changes (
          household_inventory_id, user_id, change_type,
          old_quantity, new_quantity, quantity_change, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        inventoryId, req.user.id, 'update',
        oldQuantity, newQuantity, newQuantity - oldQuantity, 'Mennyiség módosítása'
      ]);
    }

    const updatedItem = result.rows[0];

    logger.info('Inventory item updated successfully', {
      inventoryId,
      householdId: existingItem.household_id,
      updatedBy: req.user.id,
      changes: Object.keys(req.body)
    });

    res.json({
      message: 'Készlet tétel sikeresen frissítve',
      item: {
        id: updatedItem.id,
        quantity: parseFloat(updatedItem.quantity),
        unit: updatedItem.unit,
        location: updatedItem.location,
        expiryDate: updatedItem.expiry_date,
        purchaseDate: updatedItem.purchase_date,
        price: updatedItem.price ? parseFloat(updatedItem.price) : null,
        store: updatedItem.store,
        notes: updatedItem.notes,
        minimumStock: parseFloat(updatedItem.minimum_stock),
        isFavorite: updatedItem.is_favorite,
        updatedAt: updatedItem.updated_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateInventoryItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Készlet tétel frissítése során hiba történt'
    });
  }
});

/**
 * DELETE /api/v1/inventory/:id
 * Készlet tétel törlése
 */
router.delete('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen készlet tétel azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const inventoryId = req.params.id;

    // Check if item exists and user has access
    const existingItemResult = await query(`
      SELECT hi.*, h.id as household_id
      FROM household_inventory hi
      JOIN households h ON hi.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hi.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [inventoryId, req.user.id]);

    if (existingItemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Készlet tétel nem található',
        message: 'A tétel nem létezik vagy nincs hozzáférésed'
      });
    }

    const existingItem = existingItemResult.rows[0];

    // Check permissions
    const memberResult = await query(`
      SELECT role FROM household_members
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [existingItem.household_id, req.user.id]);

    const userRole = memberResult.rows[0]?.role;
    if (!['admin', 'member'].includes(userRole)) {
      return res.status(403).json({
        error: 'Nincs jogosultságod',
        message: 'Csak admin és member jogosultságú felhasználók törölhetik a készlet tételeket'
      });
    }

    // Disable audit trigger temporarily and handle manually
    await query('ALTER TABLE household_inventory DISABLE TRIGGER inventory_audit_trigger');
    
    // Manual audit log entry before deletion
    await query(`
      INSERT INTO inventory_changes (
        household_inventory_id, user_id, change_type,
        old_quantity, new_quantity, quantity_change, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      inventoryId, req.user.id, 'remove',
      existingItem.quantity, 0, -existingItem.quantity, 'Termék eltávolítása'
    ]);

    // Delete the item
    await query('DELETE FROM household_inventory WHERE id = $1', [inventoryId]);
    
    // Re-enable audit trigger
    await query('ALTER TABLE household_inventory ENABLE TRIGGER inventory_audit_trigger');

    logger.info('Inventory item deleted successfully', {
      inventoryId,
      householdId: existingItem.household_id,
      deletedBy: req.user.id
    });

    res.json({
      message: 'Készlet tétel sikeresen törölve'
    });

  } catch (error) {
    console.error('Inventory törlés hiba:', error);
    logger.logError(error, req, { operation: 'deleteInventoryItem' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Készlet tétel törlése során hiba történt'
    });
  }
});

module.exports = router;
