const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/households/:householdId/shopping-lists
 * Háztartás bevásárlólistáinak lekérése
 */
router.get('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  queryValidator('status').optional().isIn(['active', 'completed', 'archived']),
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 })
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
    const { status, page = 1, limit = 20 } = req.query;

    let whereClause = 'sl.household_id = $1';
    let queryParams = [householdId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND sl.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        sl.id, sl.name, sl.description, sl.status, sl.priority,
        sl.estimated_total, sl.actual_total, sl.created_at, sl.updated_at, sl.completed_at,
        creator.name as created_by_name,
        assignee.name as assigned_to_name,
        COUNT(sli.id) as item_count,
        COUNT(CASE WHEN sli.purchased = true THEN 1 END) as purchased_count
      FROM shopping_lists sl
      LEFT JOIN users creator ON sl.created_by_user_id = creator.id
      LEFT JOIN users assignee ON sl.assigned_to_user_id = assignee.id
      LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
      WHERE ${whereClause}
      GROUP BY sl.id, creator.name, assignee.name
      ORDER BY sl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    const lists = result.rows.map(list => ({
      id: list.id,
      name: list.name,
      description: list.description,
      status: list.status,
      priority: list.priority,
      estimatedTotal: list.estimated_total ? parseFloat(list.estimated_total) : null,
      actualTotal: list.actual_total ? parseFloat(list.actual_total) : null,
      createdBy: list.created_by_name,
      assignedTo: list.assigned_to_name,
      itemCount: parseInt(list.item_count),
      purchasedCount: parseInt(list.purchased_count),
      progress: list.item_count > 0 ? Math.round((list.purchased_count / list.item_count) * 100) : 0,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      completedAt: list.completed_at
    }));

    res.json({
      shoppingLists: lists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: lists.length
      }
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
 * POST /api/v1/households/:householdId/shopping-lists
 * Új bevásárlólista létrehozása
 */
router.post('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('A lista nevének 1-255 karakter hosszúnak kell lennie'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('priority').optional().isInt({ min: 1, max: 5 }),
  body('assigned_to_user_id').optional().isUUID()
], requireRole('member'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId } = req.params;
    const { name, description, priority = 1, assigned_to_user_id } = req.body;

    // If assigned_to_user_id is provided, verify they are a member
    if (assigned_to_user_id) {
      const memberResult = await query(`
        SELECT id FROM household_members
        WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
      `, [householdId, assigned_to_user_id]);

      if (memberResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Érvénytelen hozzárendelés',
          message: 'A megadott felhasználó nem tagja a háztartásnak'
        });
      }
    }

    const result = await query(`
      INSERT INTO shopping_lists (
        household_id, name, description, priority, 
        created_by_user_id, assigned_to_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [householdId, name, description || null, priority, req.user.id, assigned_to_user_id || null]);

    const shoppingList = result.rows[0];

    logger.info('Shopping list created', {
      listId: shoppingList.id,
      householdId,
      createdBy: req.user.id
    });

    res.status(201).json({
      message: 'Bevásárlólista sikeresen létrehozva',
      shoppingList: {
        id: shoppingList.id,
        name: shoppingList.name,
        description: shoppingList.description,
        status: shoppingList.status,
        priority: shoppingList.priority,
        createdAt: shoppingList.created_at
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
 * Bevásárlólista részletes adatai
 */
router.get('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen lista azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const listId = req.params.id;

    // Check if user has access to this shopping list
    const accessResult = await query(`
      SELECT sl.*, h.id as household_id
      FROM shopping_lists sl
      JOIN households h ON sl.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      WHERE sl.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [listId, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Bevásárlólista nem található',
        message: 'A lista nem létezik vagy nincs hozzáférésed'
      });
    }

    const shoppingList = accessResult.rows[0];

    // Get shopping list items
    const itemsResult = await query(`
      SELECT 
        sli.id, sli.custom_name, sli.custom_brand, sli.quantity, sli.unit,
        sli.priority, sli.category, sli.purchased, sli.purchased_at,
        sli.estimated_price, sli.actual_price, sli.store, sli.notes,
        sli.auto_generated, sli.created_at,
        pm.id as product_id, pm.barcode, pm.name as product_name,
        pm.brand as product_brand, pm.category as product_category,
        pm.image_url, pm.thumbnail_url,
        purchaser.name as purchased_by_name
      FROM shopping_list_items sli
      LEFT JOIN products_master pm ON sli.product_master_id = pm.id
      LEFT JOIN users purchaser ON sli.purchased_by_user_id = purchaser.id
      WHERE sli.shopping_list_id = $1
      ORDER BY sli.priority DESC, sli.created_at ASC
    `, [listId]);

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      product: item.product_id ? {
        id: item.product_id,
        barcode: item.barcode,
        name: item.product_name,
        brand: item.product_brand,
        category: item.product_category,
        image_url: item.image_url,
        thumbnail_url: item.thumbnail_url
      } : null,
      customName: item.custom_name,
      customBrand: item.custom_brand,
      displayName: item.product_name || item.custom_name,
      displayBrand: item.product_brand || item.custom_brand,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      priority: item.priority,
      category: item.category,
      purchased: item.purchased,
      purchasedAt: item.purchased_at,
      purchasedBy: item.purchased_by_name,
      estimatedPrice: item.estimated_price ? parseFloat(item.estimated_price) : null,
      actualPrice: item.actual_price ? parseFloat(item.actual_price) : null,
      store: item.store,
      notes: item.notes,
      autoGenerated: item.auto_generated,
      createdAt: item.created_at
    }));

    res.json({
      shoppingList: {
        id: shoppingList.id,
        name: shoppingList.name,
        description: shoppingList.description,
        status: shoppingList.status,
        priority: shoppingList.priority,
        estimatedTotal: shoppingList.estimated_total ? parseFloat(shoppingList.estimated_total) : null,
        actualTotal: shoppingList.actual_total ? parseFloat(shoppingList.actual_total) : null,
        createdAt: shoppingList.created_at,
        updatedAt: shoppingList.updated_at,
        completedAt: shoppingList.completed_at,
        items
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
router.post('/:id/items', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen lista azonosító'),
  body('product_master_id').optional().isUUID(),
  body('custom_name').optional().trim().isLength({ min: 1, max: 255 }),
  body('custom_brand').optional().trim().isLength({ max: 255 }),
  body('quantity').isFloat({ min: 0.01 }).withMessage('A mennyiségnek pozitív számnak kell lennie'),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('priority').optional().isInt({ min: 1, max: 5 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('estimated_price').optional().isFloat({ min: 0 }),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const listId = req.params.id;
    const {
      product_master_id,
      custom_name,
      custom_brand,
      quantity,
      unit = 'db',
      priority = 1,
      category,
      estimated_price,
      notes
    } = req.body;

    // Validate that either product_master_id or custom_name is provided
    if (!product_master_id && !custom_name) {
      return res.status(400).json({
        error: 'Validációs hiba',
        message: 'Termék azonosító vagy egyedi név megadása kötelező'
      });
    }

    // Check if user has access to this shopping list
    const accessResult = await query(`
      SELECT sl.household_id
      FROM shopping_lists sl
      JOIN household_members hm ON sl.household_id = hm.household_id
      WHERE sl.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [listId, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Bevásárlólista nem található',
        message: 'A lista nem létezik vagy nincs hozzáférésed'
      });
    }

    const result = await query(`
      INSERT INTO shopping_list_items (
        shopping_list_id, product_master_id, custom_name, custom_brand,
        quantity, unit, priority, category, estimated_price, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      listId,
      product_master_id || null,
      custom_name || null,
      custom_brand || null,
      quantity,
      unit,
      priority,
      category || null,
      estimated_price || null,
      notes || null
    ]);

    const item = result.rows[0];

    logger.info('Shopping list item added', {
      itemId: item.id,
      listId,
      addedBy: req.user.id
    });

    res.status(201).json({
      message: 'Tétel sikeresen hozzáadva a bevásárlólistához',
      item: {
        id: item.id,
        customName: item.custom_name,
        customBrand: item.custom_brand,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        priority: item.priority,
        category: item.category,
        estimatedPrice: item.estimated_price ? parseFloat(item.estimated_price) : null,
        notes: item.notes,
        createdAt: item.created_at
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
 * Tétel megvásárlásának jelölése
 */
router.put('/items/:itemId/purchase', [
  authenticateToken,
  param('itemId').isUUID().withMessage('Érvénytelen tétel azonosító'),
  body('purchased').isBoolean().withMessage('A purchased mező boolean értéket kell tartalmazzon'),
  body('actual_price').optional().isFloat({ min: 0 }),
  body('store').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const itemId = req.params.itemId;
    const { purchased, actual_price, store } = req.body;

    // Check if user has access to this item
    const accessResult = await query(`
      SELECT sli.shopping_list_id
      FROM shopping_list_items sli
      JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
      JOIN household_members hm ON sl.household_id = hm.household_id
      WHERE sli.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [itemId, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tétel nem található',
        message: 'A tétel nem létezik vagy nincs hozzáférésed'
      });
    }

    const updateFields = ['purchased = $2'];
    const updateValues = [itemId, purchased];
    let paramIndex = 3;

    if (purchased) {
      updateFields.push(`purchased_by_user_id = $${paramIndex}`);
      updateValues.push(req.user.id);
      paramIndex++;

      updateFields.push(`purchased_at = NOW()`);

      if (actual_price !== undefined) {
        updateFields.push(`actual_price = $${paramIndex}`);
        updateValues.push(actual_price);
        paramIndex++;
      }

      if (store !== undefined) {
        updateFields.push(`store = $${paramIndex}`);
        updateValues.push(store);
        paramIndex++;
      }
    } else {
      updateFields.push(`purchased_by_user_id = NULL`);
      updateFields.push(`purchased_at = NULL`);
      updateFields.push(`actual_price = NULL`);
      updateFields.push(`store = NULL`);
    }

    await query(`
      UPDATE shopping_list_items 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
    `, updateValues);

    logger.info('Shopping list item purchase status updated', {
      itemId,
      purchased,
      updatedBy: req.user.id
    });

    res.json({
      message: purchased ? 'Tétel megvásárlásra jelölve' : 'Tétel megvásárlása visszavonva'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateItemPurchaseStatus' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Tétel frissítése során hiba történt'
    });
  }
});

module.exports = router;
