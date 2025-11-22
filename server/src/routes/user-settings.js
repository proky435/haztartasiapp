const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/users/:userId/settings
 * Felhasználói beállítások lekérése
 */
router.get('/:userId/settings', [
  authenticateToken,
  param('userId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { userId } = req.params;

    // Ellenőrizzük, hogy a user saját beállításait kéri-e
    if (req.user.id !== userId) {
      return res.status(403).json({
        error: 'Nincs jogosultságod',
        message: 'Csak a saját beállításaidat kérheted le'
      });
    }

    // Lekérjük a user settings-t
    const result = await query(`
      SELECT * FROM user_settings
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // Ha nincs még settings, létrehozunk egy alapértelmezettet
      const createResult = await query(`
        INSERT INTO user_settings (
          user_id,
          consumption_notifications,
          notification_preferences,
          ui_preferences,
          language,
          timezone
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId,
        JSON.stringify({
          low_stock_predictions: true,
          shopping_pattern_suggestions: true,
          waste_alerts: true,
          weekly_summary: false
        }),
        JSON.stringify({}),
        JSON.stringify({}),
        'hu',
        'Europe/Budapest'
      ]);

      return res.json(createResult.rows[0]);
    }

    res.json(result.rows[0]);

  } catch (error) {
    logger.error('Error getting user settings:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Beállítások lekérése sikertelen'
    });
  }
});

/**
 * PUT /api/v1/users/:userId/settings
 * Felhasználói beállítások frissítése
 */
router.put('/:userId/settings', [
  authenticateToken,
  param('userId').isUUID(),
  body('consumption_notifications').optional().isObject(),
  body('notification_preferences').optional().isObject(),
  body('ui_preferences').optional().isObject(),
  body('language').optional().isString(),
  body('timezone').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const updates = req.body;

    // Ellenőrizzük, hogy a user saját beállításait módosítja-e
    if (req.user.id !== userId) {
      return res.status(403).json({
        error: 'Nincs jogosultságod',
        message: 'Csak a saját beállításaidat módosíthatod'
      });
    }

    // Ellenőrizzük, hogy létezik-e a settings
    const existingResult = await query(`
      SELECT id FROM user_settings
      WHERE user_id = $1
    `, [userId]);

    if (existingResult.rows.length === 0) {
      // Létrehozzuk, ha nem létezik
      const createResult = await query(`
        INSERT INTO user_settings (
          user_id,
          consumption_notifications,
          notification_preferences,
          ui_preferences,
          language,
          timezone
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId,
        updates.consumption_notifications ?? {
          low_stock_predictions: true,
          shopping_pattern_suggestions: true,
          waste_alerts: true,
          weekly_summary: false
        },
        updates.notification_preferences ?? {},
        updates.ui_preferences ?? {},
        updates.language ?? 'hu',
        updates.timezone ?? 'Europe/Budapest'
      ]);

      return res.json(createResult.rows[0]);
    }

    // Frissítjük a meglévő beállításokat
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.consumption_notifications !== undefined) {
      updateFields.push(`consumption_notifications = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.consumption_notifications));
      paramIndex++;
    }

    if (updates.notification_preferences !== undefined) {
      updateFields.push(`notification_preferences = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.notification_preferences));
      paramIndex++;
    }

    if (updates.ui_preferences !== undefined) {
      updateFields.push(`ui_preferences = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.ui_preferences));
      paramIndex++;
    }

    if (updates.language !== undefined) {
      updateFields.push(`language = $${paramIndex}`);
      updateValues.push(updates.language);
      paramIndex++;
    }

    if (updates.timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex}`);
      updateValues.push(updates.timezone);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nincs frissítendő mező'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    const result = await query(`
      UPDATE user_settings 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `, updateValues);

    logger.info('User settings updated', {
      userId
    });

    res.json(result.rows[0]);

  } catch (error) {
    logger.error('Error updating user settings:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Beállítások frissítése sikertelen'
    });
  }
});

module.exports = router;
