const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { query: dbQuery, transaction } = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// VALIDÁCIÓS SZABÁLYOK
// =====================================================

const validateUtilitySettings = [
  body('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  body('base_fee').optional().isFloat({ min: 0 }).withMessage('Az alapdíj nem lehet negatív'),
  body('current_unit_price').optional().isFloat({ min: 0 }).withMessage('Az egységár nem lehet negatív'),
  body('common_cost').optional().isFloat({ min: 0 }).withMessage('A közös költség nem lehet negatív'),
  body('provider_name').optional().isLength({ max: 100 }).withMessage('A szolgáltató neve maximum 100 karakter'),
  body('customer_number').optional().isLength({ max: 50 }).withMessage('Az ügyfélszám maximum 50 karakter'),
  body('auto_calculate_cost').optional().isBoolean().withMessage('Az automatikus számítás boolean értéket kell tartalmazzon'),
  body('is_enabled').optional().isBoolean().withMessage('Az engedélyezés boolean értéket kell tartalmazzon')
];

// =====================================================
// HÁZTARTÁS KÖZMŰBEÁLLÍTÁSAI
// =====================================================

/**
 * GET /api/v1/utility-settings/:household_id
 * Háztartás összes közműbeállításának lekérdezése
 */
router.get('/:household_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges')
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

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await dbQuery(`
      SELECT 1 FROM household_members 
      WHERE household_id = $1 AND user_id = $2
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultság ehhez a háztartáshoz'
      });
    }

    // Beállítások lekérdezése
    const result = await dbQuery(`
      SELECT 
        hus.id,
        hus.utility_type_id,
        ut.name as utility_name,
        ut.display_name,
        ut.unit,
        ut.icon,
        ut.color,
        hus.is_enabled,
        hus.meter_number,
        hus.base_fee,
        hus.current_unit_price,
        hus.common_cost,
        hus.billing_cycle_day,
        hus.target_monthly_consumption,
        hus.alert_threshold_percent,
        hus.auto_calculate_cost,
        hus.provider_name,
        hus.customer_number,
        hus.price_valid_from,
        hus.notes,
        hus.created_at,
        hus.updated_at
      FROM household_utility_settings hus
      JOIN utility_types ut ON hus.utility_type_id = ut.id
      WHERE hus.household_id = $1
      ORDER BY ut.sort_order
    `, [household_id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching utility settings:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a beállítások lekérdezésekor'
    });
  }
});

/**
 * POST /api/v1/utility-settings/:household_id
 * Új közműbeállítás létrehozása vagy meglévő frissítése
 */
router.post('/:household_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  ...validateUtilitySettings
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

    const { household_id } = req.params;
    const {
      utility_type_id,
      base_fee = 0,
      current_unit_price,
      common_cost = 0,
      provider_name,
      customer_number,
      meter_number,
      billing_cycle_day = 1,
      target_monthly_consumption,
      alert_threshold_percent = 120,
      auto_calculate_cost = true,
      is_enabled = true,
      notes
    } = req.body;

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await dbQuery(`
      SELECT 1 FROM household_members 
      WHERE household_id = $1 AND user_id = $2
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultság ehhez a háztartáshoz'
      });
    }

    // Ellenőrizzük, hogy létezik-e a közműtípus
    const utilityTypeCheck = await dbQuery(`
      SELECT id, display_name FROM utility_types WHERE id = $1
    `, [utility_type_id]);

    if (utilityTypeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'A megadott közműtípus nem található'
      });
    }

    // Beállítás létrehozása vagy frissítése
    const result = await dbQuery(`
      INSERT INTO household_utility_settings (
        household_id,
        utility_type_id,
        is_enabled,
        meter_number,
        base_fee,
        current_unit_price,
        common_cost,
        billing_cycle_day,
        target_monthly_consumption,
        alert_threshold_percent,
        auto_calculate_cost,
        provider_name,
        customer_number,
        price_valid_from,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_DATE, $14)
      ON CONFLICT (household_id, utility_type_id)
      DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        meter_number = EXCLUDED.meter_number,
        base_fee = EXCLUDED.base_fee,
        current_unit_price = EXCLUDED.current_unit_price,
        common_cost = EXCLUDED.common_cost,
        billing_cycle_day = EXCLUDED.billing_cycle_day,
        target_monthly_consumption = EXCLUDED.target_monthly_consumption,
        alert_threshold_percent = EXCLUDED.alert_threshold_percent,
        auto_calculate_cost = EXCLUDED.auto_calculate_cost,
        provider_name = EXCLUDED.provider_name,
        customer_number = EXCLUDED.customer_number,
        price_valid_from = CURRENT_DATE,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [
      household_id,
      utility_type_id,
      is_enabled,
      meter_number,
      base_fee,
      current_unit_price,
      common_cost,
      billing_cycle_day,
      target_monthly_consumption,
      alert_threshold_percent,
      auto_calculate_cost,
      provider_name,
      customer_number,
      notes
    ]);

    // Részletes válasz a közműtípus adataival
    const detailedResult = await dbQuery(`
      SELECT 
        hus.*,
        ut.name as utility_name,
        ut.display_name,
        ut.unit,
        ut.icon,
        ut.color
      FROM household_utility_settings hus
      JOIN utility_types ut ON hus.utility_type_id = ut.id
      WHERE hus.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: `${utilityTypeCheck.rows[0].display_name} beállítások sikeresen mentve`,
      data: detailedResult.rows[0]
    });

  } catch (error) {
    logger.error('Error creating/updating utility settings:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a beállítások mentésekor'
    });
  }
});

/**
 * PUT /api/v1/utility-settings/:household_id/:utility_type_id
 * Konkrét közműbeállítás frissítése
 */
router.put('/:household_id/:utility_type_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  param('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  ...validateUtilitySettings.slice(1) // Kihagyjuk az utility_type_id validációt
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

    const { household_id, utility_type_id } = req.params;

    // Ellenőrizzük, hogy létezik-e a beállítás
    const existingSettings = await dbQuery(`
      SELECT hus.*, ut.display_name
      FROM household_utility_settings hus
      JOIN utility_types ut ON hus.utility_type_id = ut.id
      WHERE hus.household_id = $1 AND hus.utility_type_id = $2
    `, [household_id, utility_type_id]);

    if (existingSettings.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'A megadott közműbeállítás nem található'
      });
    }

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await dbQuery(`
      SELECT 1 FROM household_members 
      WHERE household_id = $1 AND user_id = $2
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultság ehhez a háztartáshoz'
      });
    }

    // Csak a megadott mezők frissítése
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    const updatableFields = {
      'is_enabled': req.body.is_enabled,
      'meter_number': req.body.meter_number,
      'base_fee': req.body.base_fee,
      'current_unit_price': req.body.current_unit_price,
      'common_cost': req.body.common_cost,
      'billing_cycle_day': req.body.billing_cycle_day,
      'target_monthly_consumption': req.body.target_monthly_consumption,
      'alert_threshold_percent': req.body.alert_threshold_percent,
      'auto_calculate_cost': req.body.auto_calculate_cost,
      'provider_name': req.body.provider_name,
      'customer_number': req.body.customer_number,
      'notes': req.body.notes
    };

    for (const [field, value] of Object.entries(updatableFields)) {
      if (value !== undefined) {
        updateFields.push(`${field} = $${valueIndex}`);
        updateValues.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nincs frissítendő mező megadva'
      });
    }

    // Ár változás esetén frissítjük a dátumot is
    if (req.body.base_fee !== undefined || req.body.current_unit_price !== undefined || req.body.common_cost !== undefined) {
      updateFields.push(`price_valid_from = CURRENT_DATE`);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(household_id, utility_type_id);

    const updateQuery = `
      UPDATE household_utility_settings 
      SET ${updateFields.join(', ')}
      WHERE household_id = $${valueIndex} AND utility_type_id = $${valueIndex + 1}
      RETURNING *
    `;

    const result = await dbQuery(updateQuery, updateValues);

    res.json({
      success: true,
      message: `${existingSettings.rows[0].display_name} beállítások sikeresen frissítve`,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating utility settings:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a beállítások frissítésekor'
    });
  }
});

/**
 * DELETE /api/v1/utility-settings/:household_id/:utility_type_id
 * Közműbeállítás törlése (letiltása)
 */
router.delete('/:household_id/:utility_type_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  param('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges')
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

    const { household_id, utility_type_id } = req.params;

    // Ellenőrizzük, hogy a felhasználó tagja-e a háztartásnak
    const memberCheck = await dbQuery(`
      SELECT 1 FROM household_members 
      WHERE household_id = $1 AND user_id = $2
    `, [household_id, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultság ehhez a háztartáshoz'
      });
    }

    // Beállítás letiltása (nem töröljük, csak letiltjuk)
    const result = await dbQuery(`
      UPDATE household_utility_settings 
      SET is_enabled = FALSE, updated_at = NOW()
      WHERE household_id = $1 AND utility_type_id = $2
      RETURNING hus.*, ut.display_name
      FROM utility_types ut
      WHERE ut.id = utility_type_id
    `, [household_id, utility_type_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'A megadott közműbeállítás nem található'
      });
    }

    res.json({
      success: true,
      message: `${result.rows[0].display_name} beállítások letiltva`
    });

  } catch (error) {
    logger.error('Error disabling utility settings:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a beállítások letiltásakor'
    });
  }
});

/**
 * GET /api/v1/utility-settings/:household_id/calculate/:utility_type_id
 * Költségkalkulátor - adott fogyasztásra számított költség
 */
router.get('/:household_id/calculate/:utility_type_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  param('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  query('consumption').isFloat({ min: 0 }).withMessage('A fogyasztás nem lehet negatív')
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

    const { household_id, utility_type_id } = req.params;
    const { consumption } = req.query;

    // Beállítások lekérdezése
    const settings = await dbQuery(`
      SELECT 
        hus.base_fee,
        hus.current_unit_price,
        hus.common_cost,
        hus.auto_calculate_cost,
        ut.display_name,
        ut.unit
      FROM household_utility_settings hus
      JOIN utility_types ut ON hus.utility_type_id = ut.id
      WHERE hus.household_id = $1 AND hus.utility_type_id = $2 AND hus.is_enabled = TRUE
    `, [household_id, utility_type_id]);

    if (settings.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nem található aktív beállítás ehhez a közműhöz'
      });
    }

    const setting = settings.rows[0];
    const consumptionAmount = parseFloat(consumption);

    // Költség számítása
    const baseFee = setting.base_fee || 0;
    const unitPrice = setting.current_unit_price || 0;
    const commonCost = setting.common_cost || 0;
    
    const consumptionCost = unitPrice * consumptionAmount;
    const totalCost = baseFee + consumptionCost + commonCost;

    res.json({
      success: true,
      data: {
        utility_name: setting.display_name,
        unit: setting.unit,
        consumption: consumptionAmount,
        calculation: {
          base_fee: baseFee,
          unit_price: unitPrice,
          consumption_cost: consumptionCost,
          common_cost: commonCost,
          total_cost: totalCost
        },
        formula: `${baseFee} + (${unitPrice} × ${consumptionAmount}) + ${commonCost} = ${totalCost} Ft`
      }
    });

  } catch (error) {
    logger.error('Error calculating utility cost:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a költségszámításkor'
    });
  }
});

module.exports = router;
