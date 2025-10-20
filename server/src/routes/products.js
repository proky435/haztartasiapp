const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const openFoodFactsService = require('../services/openFoodFacts');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/products/search
 * Termék keresés név alapján
 */
router.get('/search', [
  optionalAuth,
  queryValidator('q')
    .trim()
    .isLength({ min: 2 })
    .withMessage('A keresési kifejezésnek legalább 2 karakter hosszúnak kell lennie'),
  queryValidator('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Az oldal számnak pozitív egész számnak kell lennie'),
  queryValidator('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('A limit 1 és 50 között lehet')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const searchTerm = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    logger.debug('Product search request', {
      searchTerm,
      page,
      limit,
      userId: req.user?.id
    });

    // First search in our cached products
    const cachedResults = await query(`
      SELECT 
        id, barcode, name, brand, category, image_url, thumbnail_url,
        nutrition_data, allergens, data_quality_score, last_updated
      FROM products_master
      WHERE 
        to_tsvector('simple', COALESCE(name, '') || ' ' || COALESCE(brand, '')) 
        @@ plainto_tsquery('simple', $1)
      ORDER BY data_quality_score DESC, last_updated DESC
      LIMIT $2 OFFSET $3
    `, [searchTerm, limit, (page - 1) * limit]);

    let results = {
      products: cachedResults.rows.map(product => ({
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image_url: product.image_url,
        thumbnail_url: product.thumbnail_url,
        nutrition_data: typeof product.nutrition_data === 'string' 
          ? JSON.parse(product.nutrition_data) 
          : product.nutrition_data,
        allergens: product.allergens,
        data_quality_score: product.data_quality_score,
        source: 'cached'
      })),
      pagination: {
        page,
        limit,
        total: cachedResults.rows.length
      }
    };

    // If we don't have enough cached results, search OpenFoodFacts
    if (cachedResults.rows.length < limit && page === 1) {
      try {
        const openFoodFactsResults = await openFoodFactsService.searchProducts(
          searchTerm, 
          1, 
          limit - cachedResults.rows.length
        );

        // Add OpenFoodFacts results
        const offProducts = openFoodFactsResults.products.map(product => ({
          ...product,
          source: 'openfoodfacts'
        }));

        results.products = [...results.products, ...offProducts];
        results.pagination.total += openFoodFactsResults.count;

      } catch (offError) {
        logger.warn('OpenFoodFacts search failed, returning cached results only', {
          error: offError.message,
          searchTerm
        });
      }
    }

    logger.info('Product search completed', {
      searchTerm,
      resultsCount: results.products.length,
      userId: req.user?.id
    });

    res.json(results);

  } catch (error) {
    logger.logError(error, req, { operation: 'searchProducts' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Termék keresés során hiba történt'
    });
  }
});

/**
 * GET /api/v1/products/barcode/:barcode
 * Termék keresés vonalkód alapján
 */
router.get('/barcode/:barcode', [
  optionalAuth,
  param('barcode')
    .isLength({ min: 8, max: 20 })
    .isNumeric()
    .withMessage('A vonalkód 8-20 számjegyből állhat')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Érvénytelen vonalkód',
        details: errors.array()
      });
    }

    const barcode = req.params.barcode;

    logger.debug('Barcode search request', {
      barcode,
      userId: req.user?.id
    });

    // Create user_product_overrides table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS user_product_overrides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        barcode VARCHAR(20) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        custom_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, barcode)
      )
    `);

    // Try to get product from OpenFoodFacts (includes caching)
    let product = await openFoodFactsService.getProductByBarcode(barcode);

    if (!product) {
      // Check if user has a custom name for this unknown barcode
      if (req.user?.id) {
        const overrideResult = await query(`
          SELECT custom_name FROM user_product_overrides 
          WHERE user_id = $1 AND barcode = $2
        `, [req.user.id, barcode]);

        if (overrideResult.rows.length > 0) {
          // Create a minimal product object with custom name
          product = {
            barcode: barcode,
            name: overrideResult.rows[0].custom_name,
            isCustomName: true,
            source: 'user_override'
          };
          
          logger.info('Using custom name for unknown barcode', {
            barcode,
            customName: product.name,
            userId: req.user.id
          });
        } else {
          logger.info('Product not found by barcode', { barcode });
          return res.status(404).json({
            error: 'Termék nem található',
            message: 'A megadott vonalkódhoz nem található termék',
            barcode,
            canCreateCustom: true // Jelezzük, hogy lehet egyedi terméket létrehozni
          });
        }
      } else {
        logger.info('Product not found by barcode', { barcode });
        return res.status(404).json({
          error: 'Termék nem található',
          message: 'A megadott vonalkódhoz nem található termék',
          barcode
        });
      }
    }

    // Check if user has a custom name for this product
    if (req.user?.id) {
      const overrideResult = await query(`
        SELECT custom_name FROM user_product_overrides 
        WHERE user_id = $1 AND barcode = $2
      `, [req.user.id, barcode]);

      if (overrideResult.rows.length > 0) {
        product.originalName = product.name;
        product.name = overrideResult.rows[0].custom_name;
        product.isCustomName = true;
        logger.info('Using custom product name', {
          barcode,
          originalName: product.originalName,
          customName: product.name,
          userId: req.user.id
        });
      }
    }

    logger.info('Product found by barcode', {
      barcode,
      productName: product.name,
      userId: req.user?.id
    });

    res.json({
      product: {
        ...product,
        source: 'openfoodfacts'
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getProductByBarcode', barcode: req.params.barcode });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Vonalkód keresés során hiba történt'
    });
  }
});

/**
 * POST /api/v1/products/custom
 * Egyedi termék létrehozása (ha nincs az adatbázisban)
 */
router.post('/custom', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('A termék nevének 2-255 karakter hosszúnak kell lennie'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('A márka neve maximum 255 karakter lehet'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('A kategória maximum 100 karakter lehet'),
  body('barcode')
    .optional()
    .isLength({ min: 8, max: 20 })
    .isNumeric()
    .withMessage('A vonalkód 8-20 számjegyből állhat'),
  body('nutrition_data')
    .optional()
    .isObject()
    .withMessage('A tápanyag adatok objektum formátumban adhatók meg'),
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Az allergének tömb formátumban adhatók meg')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const {
      name,
      brand,
      category,
      barcode,
      nutrition_data,
      allergens,
      ingredients,
      packaging
    } = req.body;

    // Check if barcode already exists
    if (barcode) {
      const existingProduct = await query(
        'SELECT id FROM products_master WHERE barcode = $1',
        [barcode]
      );

      if (existingProduct.rows.length > 0) {
        return res.status(409).json({
          error: 'Vonalkód már létezik',
          message: 'Ez a vonalkód már regisztrálva van egy másik termékhez'
        });
      }
    }

    // Create custom product
    const result = await query(`
      INSERT INTO products_master (
        barcode, name, brand, category, nutrition_data, allergens, 
        ingredients, packaging, data_source, data_quality_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'custom', $9
      )
      RETURNING *
    `, [
      barcode || null,
      name,
      brand || null,
      category || null,
      JSON.stringify(nutrition_data || {}),
      allergens || null,
      ingredients || null,
      packaging || null,
      50 // Default quality score for custom products
    ]);

    const product = result.rows[0];

    logger.info('Custom product created', {
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Egyedi termék sikeresen létrehozva',
      product: {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        category: product.category,
        nutrition_data: typeof product.nutrition_data === 'string' 
          ? JSON.parse(product.nutrition_data) 
          : product.nutrition_data,
        allergens: product.allergens,
        ingredients: product.ingredients,
        packaging: product.packaging,
        data_quality_score: product.data_quality_score,
        source: 'custom'
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'createCustomProduct' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Egyedi termék létrehozása során hiba történt'
    });
  }
});

/**
 * GET /api/v1/products/:id
 * Termék részletek lekérése ID alapján
 */
router.get('/:id', [
  optionalAuth,
  queryValidator('id')
    .isUUID()
    .withMessage('Érvénytelen termék azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const productId = req.params.id;

    const result = await query(`
      SELECT 
        id, barcode, name, brand, category, subcategory, image_url, thumbnail_url,
        nutrition_data, allergens, ingredients, packaging, labels, countries, stores,
        data_source, data_quality_score, last_updated, created_at
      FROM products_master
      WHERE id = $1
    `, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Termék nem található',
        message: 'A megadott azonosítóhoz nem található termék'
      });
    }

    const product = result.rows[0];

    res.json({
      product: {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        image_url: product.image_url,
        thumbnail_url: product.thumbnail_url,
        nutrition_data: typeof product.nutrition_data === 'string' 
          ? JSON.parse(product.nutrition_data) 
          : product.nutrition_data,
        allergens: product.allergens,
        ingredients: product.ingredients,
        packaging: product.packaging,
        labels: product.labels,
        countries: product.countries,
        stores: product.stores,
        data_source: product.data_source,
        data_quality_score: product.data_quality_score,
        last_updated: product.last_updated,
        created_at: product.created_at
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getProductById' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Termék adatok lekérése során hiba történt'
    });
  }
});

/**
 * GET /api/v1/products/stats
 * Termék adatbázis statisztikák (fejlesztői endpoint)
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const stats = await openFoodFactsService.getStats();
    
    const additionalStats = await query(`
      SELECT 
        data_source,
        COUNT(*) as count,
        AVG(data_quality_score) as avg_quality
      FROM products_master
      GROUP BY data_source
    `);

    res.json({
      openFoodFacts: stats,
      bySource: additionalStats.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getProductStats' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Statisztikák lekérése során hiba történt'
    });
  }
});

/**
 * POST /api/v1/products/barcode/:barcode/rename
 * Termék átnevezése felhasználó számára
 */
router.post('/barcode/:barcode/rename', [
  authenticateToken,
  param('barcode')
    .isLength({ min: 8, max: 20 })
    .isNumeric()
    .withMessage('A vonalkód 8-20 számjegyből állhat'),
  body('customName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Az egyedi név 1-255 karakter között kell legyen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const barcode = req.params.barcode;
    const { customName } = req.body;

    // Get original product info or create placeholder for unknown barcode
    let product = await openFoodFactsService.getProductByBarcode(barcode);
    let originalName = 'Ismeretlen termék';
    
    if (product) {
      originalName = product.name;
    } else {
      // For unknown barcodes, check if user already has a custom name
      const existingOverride = await query(`
        SELECT custom_name FROM user_product_overrides 
        WHERE user_id = $1 AND barcode = $2
      `, [req.user.id, barcode]);
      
      if (existingOverride.rows.length > 0) {
        originalName = existingOverride.rows[0].custom_name;
      }
    }

    // Create table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS user_product_overrides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        barcode VARCHAR(20) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        custom_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, barcode)
      )
    `);

    // Save or update custom name
    await query(`
      INSERT INTO user_product_overrides (user_id, barcode, original_name, custom_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, barcode)
      DO UPDATE SET 
        custom_name = EXCLUDED.custom_name,
        updated_at = NOW()
    `, [req.user.id, barcode, originalName, customName]);

    logger.info('Product renamed by user', {
      barcode,
      originalName,
      customName,
      userId: req.user.id
    });

    res.json({
      message: 'Termék sikeresen átnevezve',
      barcode,
      originalName,
      customName
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'renameProduct', barcode: req.params.barcode });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Termék átnevezése során hiba történt'
    });
  }
});

module.exports = router;
