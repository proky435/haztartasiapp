const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/households/:householdId/settings
 * Háztartás beállításainak lekérése
 */
router.get('/:householdId/settings', [
  authenticateToken,
  param('householdId').isUUID()
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

    // Lekérjük a household settings-t
    const result = await query(`
      SELECT * FROM household_settings
      WHERE household_id = $1
    `, [householdId]);

    if (result.rows.length === 0) {
      // Ha nincs még settings, létrehozunk egy alapértelmezettet
      const createResult = await query(`
        INSERT INTO household_settings (
          household_id,
          consumption_tracking_enabled,
          shopping_pattern_analysis_enabled,
          auto_suggestions_enabled,
          consumption_tracking_settings
        ) VALUES ($1, TRUE, TRUE, TRUE, $2)
        RETURNING *
      `, [
        householdId,
        JSON.stringify({
          min_data_points: 5,
          history_months: 6,
          confidence_threshold: 'medium'
        })
      ]);

      return res.json(createResult.rows[0]);
    }

    res.json(result.rows[0]);

  } catch (error) {
    logger.error('Error getting household settings:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Beállítások lekérése sikertelen'
    });
  }
});

/**
 * PUT /api/v1/households/:householdId/settings
 * Háztartás beállításainak frissítése
 */
router.put('/:householdId/settings', [
  authenticateToken,
  param('householdId').isUUID(),
  body('consumption_tracking_enabled').optional().isBoolean(),
  body('shopping_pattern_analysis_enabled').optional().isBoolean(),
  body('auto_suggestions_enabled').optional().isBoolean(),
  body('consumption_tracking_settings').optional().isObject()
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
    const updates = req.body;

    // Ellenőrizzük, hogy létezik-e a settings
    const existingResult = await query(`
      SELECT id FROM household_settings
      WHERE household_id = $1
    `, [householdId]);

    if (existingResult.rows.length === 0) {
      // Létrehozzuk, ha nem létezik
      const createResult = await query(`
        INSERT INTO household_settings (
          household_id,
          consumption_tracking_enabled,
          shopping_pattern_analysis_enabled,
          auto_suggestions_enabled,
          consumption_tracking_settings
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        householdId,
        updates.consumption_tracking_enabled ?? true,
        updates.shopping_pattern_analysis_enabled ?? true,
        updates.auto_suggestions_enabled ?? true,
        updates.consumption_tracking_settings ?? {
          min_data_points: 5,
          history_months: 6,
          confidence_threshold: 'medium'
        }
      ]);

      return res.json(createResult.rows[0]);
    }

    // Frissítjük a meglévő beállításokat
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.consumption_tracking_enabled !== undefined) {
      updateFields.push(`consumption_tracking_enabled = $${paramIndex}`);
      updateValues.push(updates.consumption_tracking_enabled);
      paramIndex++;
    }

    if (updates.shopping_pattern_analysis_enabled !== undefined) {
      updateFields.push(`shopping_pattern_analysis_enabled = $${paramIndex}`);
      updateValues.push(updates.shopping_pattern_analysis_enabled);
      paramIndex++;
    }

    if (updates.auto_suggestions_enabled !== undefined) {
      updateFields.push(`auto_suggestions_enabled = $${paramIndex}`);
      updateValues.push(updates.auto_suggestions_enabled);
      paramIndex++;
    }

    if (updates.consumption_tracking_settings !== undefined) {
      updateFields.push(`consumption_tracking_settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.consumption_tracking_settings));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nincs frissítendő mező'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(householdId);

    const result = await query(`
      UPDATE household_settings 
      SET ${updateFields.join(', ')}
      WHERE household_id = $${paramIndex}
      RETURNING *
    `, updateValues);

    logger.info('Household settings updated', {
      householdId,
      updatedBy: req.user.id
    });

    res.json(result.rows[0]);

  } catch (error) {
    logger.error('Error updating household settings:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Beállítások frissítése sikertelen'
    });
  }
});

module.exports = router;
