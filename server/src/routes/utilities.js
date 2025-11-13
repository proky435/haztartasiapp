const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { query: dbQuery, transaction } = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// VALIDÁCIÓS SZABÁLYOK
// =====================================================

const validateUtilityReading = [
  body('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  body('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  body('reading_date').isISO8601().withMessage('Érvényes dátum szükséges (YYYY-MM-DD)'),
  body('meter_reading').isFloat({ min: 0 }).withMessage('A mérőóra állás nem lehet negatív'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Az egységár nem lehet negatív'),
  body('estimated').optional().isBoolean().withMessage('A becsült mező boolean értéket kell tartalmazzon'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('A megjegyzés maximum 1000 karakter lehet'),
  body('invoice_number').optional().isString().isLength({ max: 100 }).withMessage('A számla szám maximum 100 karakter lehet')
];

const validateUtilityReadingUpdate = [
  body('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  body('reading_date').isISO8601().withMessage('Érvényes dátum szükséges (YYYY-MM-DD)'),
  body('meter_reading').isFloat({ min: 0 }).withMessage('A mérőóra állás nem lehet negatív'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Az egységár nem lehet negatív'),
  body('estimated').optional().isBoolean().withMessage('A becsült mező boolean értéket kell tartalmazzon'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('A megjegyzés maximum 1000 karakter lehet'),
  body('invoice_number').optional().isString().isLength({ max: 100 }).withMessage('A számla szám maximum 100 karakter lehet')
];

const validateUtilitySettings = [
  body('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  body('is_enabled').optional().isBoolean(),
  body('meter_number').optional().isString().isLength({ max: 50 }),
  body('current_unit_price').optional().isFloat({ min: 0 }),
  body('billing_cycle_day').optional().isInt({ min: 1, max: 31 }),
  body('target_monthly_consumption').optional().isFloat({ min: 0 }),
  body('alert_threshold_percent').optional().isInt({ min: 1 }),
  body('notes').optional().isString().isLength({ max: 1000 })
];

// =====================================================
// KÖZMŰTÍPUSOK LEKÉRDEZÉSE
// =====================================================

/**
 * GET /api/v1/utilities/types
 * Összes elérhető közműtípus lekérdezése
 */
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT 
        id,
        name,
        display_name,
        unit,
        icon,
        color,
        sort_order
      FROM utility_types 
      WHERE is_active = true 
      ORDER BY sort_order, display_name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching utility types:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a közműtípusok lekérdezésekor'
    });
  }
});

// =====================================================
// HÁZTARTÁSI KÖZMŰFOGYASZTÁS LEKÉRDEZÉSE
// =====================================================

/**
 * GET /api/v1/utilities/household/:householdId
 * Háztartás közműfogyasztásainak lekérdezése URL paraméterrel
 */
router.get('/household/:householdId', authenticateToken, [
  param('householdId').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  query('utility_type').optional(),
  query('date_range').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen paraméterek',
        errors: errors.array()
      });
    }

    const { householdId } = req.params;
    const { utility_type, date_range } = req.query;

    // Ellenőrizzük a háztartás tagságot
    const memberCheck = await dbQuery(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    // Dátum szűrő beállítása
    let dateFilter = '';
    const params = [householdId];
    
    if (date_range) {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (date_range) {
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      
      dateFilter = ' AND hu.reading_date >= $' + (params.length + 1);
      params.push(startDate.toISOString().split('T')[0]);
    }

    // Közműtípus szűrő
    let utilityTypeFilter = '';
    if (utility_type && utility_type !== 'all') {
      utilityTypeFilter = ' AND ut.name = $' + (params.length + 1);
      params.push(utility_type);
    }

    // Mérések lekérdezése
    const readingsResult = await dbQuery(`
      SELECT 
        hu.id,
        hu.reading_date,
        hu.meter_reading,
        hu.previous_reading,
        hu.consumption,
        hu.unit_price,
        hu.cost,
        hu.estimated,
        hu.notes,
        hu.invoice_number,
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        u.name as added_by_name
      FROM household_utilities hu
      JOIN utility_types ut ON hu.utility_type_id = ut.id
      LEFT JOIN users u ON hu.added_by_user_id = u.id
      WHERE hu.household_id = $1 ${dateFilter} ${utilityTypeFilter}
      ORDER BY hu.reading_date DESC, ut.sort_order
      LIMIT 100
    `, params);

    // Statisztikák lekérdezése
    const statsResult = await dbQuery(`
      SELECT 
        ut.id as utility_type_id,
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        ut.icon,
        COUNT(hu.id) as reading_count,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_consumption
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1 ${dateFilter} ${utilityTypeFilter}
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.icon, ut.sort_order
      ORDER BY ut.sort_order
    `, params);

    res.json({
      success: true,
      data: {
        readings: readingsResult.rows,
        statistics: statsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching utilities:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a közműadatok lekérdezésekor'
    });
  }
});

/**
 * GET /api/v1/utilities
 * Aktuális háztartás közműfogyasztásainak lekérdezése
 */
router.get('/', authenticateToken, [
  query('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  query('utility_type_id').optional().isUUID(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen paraméterek',
        errors: errors.array()
      });
    }

    const { household_id, utility_type_id, start_date, end_date, limit = 100, offset = 0 } = req.query;

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await dbQuery(`
      SELECT 1 FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    // Lekérdezés építése
    let whereConditions = ['hu.household_id = $1'];
    let queryParams = [household_id];
    let paramIndex = 2;

    if (utility_type_id) {
      whereConditions.push(`hu.utility_type_id = $${paramIndex}`);
      queryParams.push(utility_type_id);
      paramIndex++;
    }

    if (start_date) {
      whereConditions.push(`hu.reading_date >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`hu.reading_date <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    queryParams.push(limit, offset);

    const result = await dbQuery(`
      SELECT 
        hu.id,
        hu.reading_date,
        hu.meter_reading,
        hu.previous_reading,
        hu.consumption,
        hu.unit_price,
        hu.cost,
        hu.estimated,
        hu.notes,
        hu.invoice_number,
        hu.created_at,
        ut.name as utility_type,
        ut.display_name as utility_display_name,
        ut.unit,
        ut.icon,
        ut.color,
        u.name as added_by_name
      FROM household_utilities hu
      JOIN utility_types ut ON hu.utility_type_id = ut.id
      JOIN users u ON hu.added_by_user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY hu.reading_date DESC, ut.sort_order
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Összesítő statisztikák
    const statsResult = await dbQuery(`
      SELECT 
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        ut.icon,
        ut.color,
        COUNT(hu.id) as reading_count,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_consumption,
        MAX(hu.reading_date) as last_reading_date,
        MAX(hu.meter_reading) as current_reading
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1
        ${start_date ? `AND hu.reading_date >= '${start_date}'` : ''}
        ${end_date ? `AND hu.reading_date <= '${end_date}'` : ''}
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.icon, ut.color, ut.sort_order
      ORDER BY ut.sort_order
    `, [household_id]);

    res.json({
      success: true,
      data: {
        readings: result.rows,
        statistics: statsResult.rows,
        pagination: {
          limit,
          offset,
          total: result.rows.length
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching utilities:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a közműfogyasztások lekérdezésekor'
    });
  }
});

// =====================================================
// ÚJ MÉRŐÓRA ÁLLÁS RÖGZÍTÉSE
// =====================================================

/**
 * POST /api/v1/utilities
 * Új mérőóra állás rögzítése
 */
router.post('/', authenticateToken, validateUtilityReading, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen adatok',
        errors: errors.array()
      });
    }

    const {
      household_id,
      utility_type_id,
      reading_date,
      meter_reading,
      unit_price,
      estimated = false,
      notes,
      invoice_number
    } = req.body;

    // Ellenőrizzük a háztartás tagságot
    const memberCheck = await dbQuery(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    // Ellenőrizzük, hogy létezik-e már mérés erre a napra
    const existingReading = await dbQuery(`
      SELECT id FROM household_utilities 
      WHERE household_id = $1 AND utility_type_id = $2 AND reading_date = $3
    `, [household_id, utility_type_id, reading_date]);

    if (existingReading.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Erre a napra már van rögzített mérés. Használd a PUT metódust a módosításhoz.'
      });
    }

    // Új mérés beszúrása (a trigger automatikusan kiszámítja a fogyasztást)
    const result = await dbQuery(`
      INSERT INTO household_utilities (
        household_id,
        utility_type_id,
        reading_date,
        meter_reading,
        unit_price,
        estimated,
        notes,
        invoice_number,
        added_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      household_id,
      utility_type_id,
      reading_date,
      meter_reading,
      unit_price,
      estimated,
      notes,
      invoice_number,
      req.user.id
    ]);

    // Visszaadjuk a beszúrt adatot a közműtípus információkkal együtt
    const detailedResult = await dbQuery(`
      SELECT 
        hu.*,
        ut.name as utility_type,
        ut.display_name as utility_display_name,
        ut.unit,
        ut.icon,
        ut.color
      FROM household_utilities hu
      JOIN utility_types ut ON hu.utility_type_id = ut.id
      WHERE hu.id = $1
    `, [result.rows[0].id]);

    logger.info(`New utility reading added: ${utility_type_id} for household ${household_id}`);

    res.status(201).json({
      success: true,
      message: 'Mérőóra állás sikeresen rögzítve',
      data: detailedResult.rows[0]
    });
  } catch (error) {
    logger.error('Error adding utility reading:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a mérőóra állás rögzítésekor'
    });
  }
});

// =====================================================
// MÉRŐÓRA ÁLLÁS MÓDOSÍTÁSA
// =====================================================

/**
 * PUT /api/v1/utilities/:id
 * Meglévő mérőóra állás módosítása
 */
router.put('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Érvényes ID szükséges'),
  ...validateUtilityReadingUpdate
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen adatok',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      reading_date,
      meter_reading,
      unit_price,
      estimated,
      notes,
      invoice_number
    } = req.body;

    // Ellenőrizzük, hogy létezik-e a mérés és jogosult-e a felhasználó
    const existingReading = await dbQuery(`
      SELECT hu.*, hm.role
      FROM household_utilities hu
      JOIN household_members hm ON hu.household_id = hm.household_id
      WHERE hu.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [id, req.user.id]);

    if (existingReading.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mérés nem található vagy nincs jogosultságod hozzá'
      });
    }

    // Módosítás végrehajtása
    const result = await dbQuery(`
      UPDATE household_utilities 
      SET 
        reading_date = $2,
        meter_reading = $3,
        unit_price = $4,
        estimated = $5,
        notes = $6,
        invoice_number = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, reading_date, meter_reading, unit_price, estimated, notes, invoice_number]);

    // Visszaadjuk a módosított adatot
    const detailedResult = await dbQuery(`
      SELECT 
        hu.*,
        ut.name as utility_type,
        ut.display_name as utility_display_name,
        ut.unit,
        ut.icon,
        ut.color
      FROM household_utilities hu
      JOIN utility_types ut ON hu.utility_type_id = ut.id
      WHERE hu.id = $1
    `, [id]);

    logger.info(`Utility reading updated: ${id}`);

    res.json({
      success: true,
      message: 'Mérőóra állás sikeresen módosítva',
      data: detailedResult.rows[0]
    });
  } catch (error) {
    logger.error('Error updating utility reading:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a mérőóra állás módosításakor'
    });
  }
});

// =====================================================
// MÉRŐÓRA ÁLLÁS TÖRLÉSE
// =====================================================

/**
 * DELETE /api/v1/utilities/:id
 * Mérőóra állás törlése
 */
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Érvényes ID szükséges')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen ID',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Ellenőrizzük a jogosultságot
    const existingReading = await dbQuery(`
      SELECT hu.*, hm.role
      FROM household_utilities hu
      JOIN household_members hm ON hu.household_id = hm.household_id
      WHERE hu.id = $1 AND hm.user_id = $2 AND hm.left_at IS NULL
    `, [id, req.user.id]);

    if (existingReading.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mérés nem található vagy nincs jogosultságod hozzá'
      });
    }

    // Törlés végrehajtása
    await dbQuery('DELETE FROM household_utilities WHERE id = $1', [id]);

    logger.info(`Utility reading deleted: ${id}`);

    res.json({
      success: true,
      message: 'Mérőóra állás sikeresen törölve'
    });
  } catch (error) {
    logger.error('Error deleting utility reading:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a mérőóra állás törlésekor'
    });
  }
});

// =====================================================
// STATISZTIKÁK ÉS RIPORTOK
// =====================================================

/**
 * GET /api/v1/utilities/stats/:household_id
 * Részletes statisztikák egy háztartáshoz
 */
router.get('/stats/:household_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  query('period').optional().isIn(['month', 'quarter', 'year']).withMessage('Érvényes időszak: month, quarter, year')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Érvénytelen paraméterek',
        errors: errors.array()
      });
    }

    const { household_id } = req.params;
    const { period = 'month' } = req.query;

    // Jogosultság ellenőrzése
    const memberCheck = await dbQuery(`
      SELECT 1 FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    // Időszak meghatározása
    let dateFilter = '';
    switch (period) {
      case 'month':
        dateFilter = "AND hu.reading_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')";
        break;
      case 'quarter':
        dateFilter = "AND hu.reading_date >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '2 years')";
        break;
      case 'year':
        dateFilter = "AND hu.reading_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '5 years')";
        break;
    }

    // Havi fogyasztás trend
    const trendResult = await dbQuery(`
      SELECT 
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        ut.icon,
        ut.color,
        DATE_TRUNC('month', hu.reading_date) as month,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_consumption,
        COUNT(hu.id) as reading_count
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1 ${dateFilter}
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.icon, ut.color, DATE_TRUNC('month', hu.reading_date)
      ORDER BY ut.sort_order, month DESC
    `, [household_id]);

    // Összesítő statisztikák
    const summaryResult = await dbQuery(`
      SELECT 
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        ut.icon,
        ut.color,
        COUNT(hu.id) as total_readings,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_monthly_consumption,
        MIN(hu.reading_date) as first_reading_date,
        MAX(hu.reading_date) as last_reading_date,
        MAX(hu.meter_reading) as current_meter_reading
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1 ${dateFilter}
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.icon, ut.color, ut.sort_order
      ORDER BY ut.sort_order
    `, [household_id]);

    res.json({
      success: true,
      data: {
        period,
        trends: trendResult.rows,
        summary: summaryResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching utility stats:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a statisztikák lekérdezésekor'
    });
  }
});

module.exports = router;
