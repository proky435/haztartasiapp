const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { query: dbQuery, transaction } = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// ÁRAZÁSI SÁVOK KEZELÉSE
// =====================================================

/**
 * GET /api/v1/utility-pricing/:household_id/:utility_type_id
 * Közműtípus árazási sávjainak lekérdezése
 */
router.get('/:household_id/:utility_type_id', authenticateToken, [
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

    // Árazási sávok lekérdezése
    const result = await dbQuery(`
      SELECT 
        upt.id,
        upt.tier_number,
        upt.tier_name,
        upt.limit_value,
        upt.limit_unit,
        upt.price_per_unit,
        upt.conversion_factor,
        upt.conversion_unit,
        upt.system_usage_fee,
        upt.valid_from,
        upt.valid_until,
        upt.is_active,
        ut.name as utility_name,
        ut.display_name as utility_display_name,
        ut.unit as utility_unit
      FROM utility_pricing_tiers upt
      JOIN utility_types ut ON upt.utility_type_id = ut.id
      WHERE upt.household_id = $1 
        AND upt.utility_type_id = $2
        AND upt.is_active = true
      ORDER BY upt.tier_number
    `, [household_id, utility_type_id]);

    res.json({
      success: true,
      data: {
        utility_type_id: utility_type_id,
        utility_name: result.rows[0]?.utility_name,
        utility_display_name: result.rows[0]?.utility_display_name,
        utility_unit: result.rows[0]?.utility_unit,
        pricing_tiers: result.rows
      }
    });

  } catch (error) {
    logger.error('Error fetching utility pricing tiers:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt az árazási sávok lekérdezésekor'
    });
  }
});

/**
 * POST /api/v1/utility-pricing/:household_id/:utility_type_id
 * Új árazási sáv létrehozása vagy meglévő frissítése
 */
router.post('/:household_id/:utility_type_id', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  param('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  body('tier_number').isInt({ min: 1 }).withMessage('A sáv számának pozitív egész számnak kell lennie'),
  body('tier_name').optional().isLength({ max: 100 }).withMessage('A sáv neve maximum 100 karakter'),
  body('price_per_unit').isFloat({ min: 0 }).withMessage('Az egységár nem lehet negatív'),
  body('limit_value').optional().isFloat({ min: 0 }).withMessage('A sávhatár nem lehet negatív'),
  body('system_usage_fee').optional().isFloat({ min: 0 }).withMessage('A rendszerhasználati díj nem lehet negatív')
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
    const {
      tier_number,
      tier_name,
      limit_value,
      limit_unit,
      price_per_unit,
      conversion_factor,
      conversion_unit,
      system_usage_fee
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

    // Árazási sáv létrehozása vagy frissítése
    const result = await dbQuery(`
      INSERT INTO utility_pricing_tiers (
        utility_type_id, household_id, tier_number, tier_name,
        limit_value, limit_unit, price_per_unit,
        conversion_factor, conversion_unit, system_usage_fee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (utility_type_id, household_id, tier_number)
      DO UPDATE SET
        tier_name = EXCLUDED.tier_name,
        limit_value = EXCLUDED.limit_value,
        limit_unit = EXCLUDED.limit_unit,
        price_per_unit = EXCLUDED.price_per_unit,
        conversion_factor = EXCLUDED.conversion_factor,
        conversion_unit = EXCLUDED.conversion_unit,
        system_usage_fee = EXCLUDED.system_usage_fee,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      utility_type_id, household_id, tier_number, tier_name,
      limit_value, limit_unit, price_per_unit,
      conversion_factor, conversion_unit, system_usage_fee || 0
    ]);

    res.json({
      success: true,
      message: 'Árazási sáv sikeresen mentve',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error saving utility pricing tier:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt az árazási sáv mentésekor'
    });
  }
});

/**
 * DELETE /api/v1/utility-pricing/:household_id/:utility_type_id/:tier_number
 * Árazási sáv törlése
 */
router.delete('/:household_id/:utility_type_id/:tier_number', authenticateToken, [
  param('household_id').isUUID().withMessage('Érvényes háztartás ID szükséges'),
  param('utility_type_id').isUUID().withMessage('Érvényes közműtípus ID szükséges'),
  param('tier_number').isInt({ min: 1 }).withMessage('Érvényes sáv szám szükséges')
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

    const { household_id, utility_type_id, tier_number } = req.params;

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

    // Árazási sáv törlése (soft delete)
    const result = await dbQuery(`
      UPDATE utility_pricing_tiers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE household_id = $1 
        AND utility_type_id = $2 
        AND tier_number = $3
      RETURNING tier_name
    `, [household_id, utility_type_id, tier_number]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'A megadott árazási sáv nem található'
      });
    }

    res.json({
      success: true,
      message: `${result.rows[0].tier_name || 'Árazási sáv'} sikeresen törölve`
    });

  } catch (error) {
    logger.error('Error deleting utility pricing tier:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt az árazási sáv törlésekor'
    });
  }
});

/**
 * POST /api/v1/utility-pricing/:household_id/:utility_type_id/reset-defaults
 * Alapértelmezett magyar árazási sávok visszaállítása
 */
router.post('/:household_id/:utility_type_id/reset-defaults', authenticateToken, [
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

    // Közműtípus lekérdezése
    const utilityType = await dbQuery(`
      SELECT name FROM utility_types WHERE id = $1
    `, [utility_type_id]);

    if (utilityType.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Közműtípus nem található'
      });
    }

    const utilityName = utilityType.rows[0].name;

    // Meglévő sávok deaktiválása
    await dbQuery(`
      UPDATE utility_pricing_tiers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE household_id = $1 AND utility_type_id = $2
    `, [household_id, utility_type_id]);

    // Alapértelmezett sávok beszúrása közműtípus szerint
    let insertedTiers = [];

    switch (utilityName) {
      case 'electricity':
        // Villany sávok
        const electricityTiers = [
          { tier: 1, name: 'Rezsicsökkentett', limit: 210.25, unit: 'kWh', price: 36.0, system_fee: 8.5 },
          { tier: 2, name: 'Piaci ár', limit: null, unit: 'kWh', price: 70.0, system_fee: 8.5 }
        ];
        
        for (const tier of electricityTiers) {
          const result = await dbQuery(`
            INSERT INTO utility_pricing_tiers (
              utility_type_id, household_id, tier_number, tier_name,
              limit_value, limit_unit, price_per_unit, system_usage_fee
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `, [utility_type_id, household_id, tier.tier, tier.name, tier.limit, tier.unit, tier.price, tier.system_fee]);
          insertedTiers.push(result.rows[0]);
        }
        break;

      case 'gas':
        // Gáz sávok
        const gasTiers = [
          { tier: 1, name: 'Rezsicsökkentett', limit: 5303, unit: 'MJ', price: 2.8, conversion: 34.5, system_fee: 5.2 },
          { tier: 2, name: 'Piaci ár', limit: null, unit: 'MJ', price: 22.0, conversion: 34.5, system_fee: 5.2 }
        ];
        
        for (const tier of gasTiers) {
          const result = await dbQuery(`
            INSERT INTO utility_pricing_tiers (
              utility_type_id, household_id, tier_number, tier_name,
              limit_value, limit_unit, price_per_unit, 
              conversion_factor, conversion_unit, system_usage_fee
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `, [utility_type_id, household_id, tier.tier, tier.name, tier.limit, tier.unit, tier.price, tier.conversion, 'MJ/m3', tier.system_fee]);
          insertedTiers.push(result.rows[0]);
        }
        break;

      case 'water_cold':
        // Hideg víz sávok
        const waterColdTiers = [
          { tier: 1, name: 'Vízfogyasztás', limit: null, unit: 'm3', price: 350.0 },
          { tier: 2, name: 'Csatornahasználat', limit: null, unit: 'm3', price: 280.0 }
        ];
        
        for (const tier of waterColdTiers) {
          const result = await dbQuery(`
            INSERT INTO utility_pricing_tiers (
              utility_type_id, household_id, tier_number, tier_name,
              limit_value, limit_unit, price_per_unit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [utility_type_id, household_id, tier.tier, tier.name, tier.limit, tier.unit, tier.price]);
          insertedTiers.push(result.rows[0]);
        }
        break;

      case 'water_hot':
        // Meleg víz (elektromos) sávok
        const waterHotTiers = [
          { tier: 1, name: 'Rezsicsökkentett', limit: 210.25, unit: 'kWh', price: 36.0, system_fee: 8.5 },
          { tier: 2, name: 'Piaci ár', limit: null, unit: 'kWh', price: 70.0, system_fee: 8.5 }
        ];
        
        for (const tier of waterHotTiers) {
          const result = await dbQuery(`
            INSERT INTO utility_pricing_tiers (
              utility_type_id, household_id, tier_number, tier_name,
              limit_value, limit_unit, price_per_unit, system_usage_fee
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `, [utility_type_id, household_id, tier.tier, tier.name, tier.limit, tier.unit, tier.price, tier.system_fee]);
          insertedTiers.push(result.rows[0]);
        }
        break;

      case 'heating':
        // Távfűtés sáv
        const result = await dbQuery(`
          INSERT INTO utility_pricing_tiers (
            utility_type_id, household_id, tier_number, tier_name,
            limit_value, limit_unit, price_per_unit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [utility_type_id, household_id, 1, 'Hőenergia', null, 'GJ', 4500.0]);
        insertedTiers.push(result.rows[0]);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Nem támogatott közműtípus: ${utilityName}`
        });
    }

    res.json({
      success: true,
      message: 'Alapértelmezett árazási sávok sikeresen visszaállítva',
      data: {
        utility_name: utilityName,
        inserted_tiers: insertedTiers
      }
    });

  } catch (error) {
    logger.error('Error resetting default pricing tiers:', error);
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt az alapértelmezett sávok visszaállításakor'
    });
  }
});

module.exports = router;
