const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/users/profile
 * Felhasználói profil lekérése
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, u.email, u.name, u.email_verified, u.last_login, u.created_at,
        us.notification_preferences, us.ui_preferences, us.language
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Felhasználó nem található'
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        settings: {
          notifications: user.notification_preferences || {},
          ui: user.ui_preferences || {},
          language: user.language || 'hu'
        }
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getUserProfile' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Profil lekérése során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/users/profile
 * Felhasználói profil frissítése
 */
router.put('/profile', [
  authenticateToken,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('A név 2-100 karakter hosszú lehet'),
  body('language')
    .optional()
    .isIn(['hu', 'en'])
    .withMessage('Csak magyar (hu) és angol (en) nyelv támogatott')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { name, language } = req.body;
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (updateFields.length > 0) {
      updateValues.push(req.user.id);
      await query(`
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
      `, updateValues);
    }

    if (language !== undefined) {
      await query(`
        UPDATE user_settings 
        SET language = $1, updated_at = NOW()
        WHERE user_id = $2
      `, [language, req.user.id]);
    }

    logger.info('User profile updated', {
      userId: req.user.id,
      changes: Object.keys(req.body)
    });

    // Frissített profil lekérése
    const result = await query(`
      SELECT 
        u.id, u.email, u.name, u.email_verified, u.last_login, u.created_at,
        us.notification_preferences, us.ui_preferences, us.language
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    const user = result.rows[0];

    res.json({
      message: 'Profil sikeresen frissítve',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        settings: {
          notifications: user.notification_preferences || {},
          ui: user.ui_preferences || {},
          language: user.language || 'hu'
        }
      }
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateUserProfile' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Profil frissítése során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/users/settings
 * Felhasználói beállítások frissítése
 */
router.put('/settings', [
  authenticateToken,
  body('notification_preferences').optional().isObject(),
  body('ui_preferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { notification_preferences, ui_preferences } = req.body;
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (notification_preferences !== undefined) {
      updateFields.push(`notification_preferences = $${paramIndex}`);
      updateValues.push(JSON.stringify(notification_preferences));
      paramIndex++;
    }

    if (ui_preferences !== undefined) {
      updateFields.push(`ui_preferences = $${paramIndex}`);
      updateValues.push(JSON.stringify(ui_preferences));
      paramIndex++;
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(req.user.id);

      await query(`
        UPDATE user_settings 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex}
      `, updateValues);
    }

    logger.info('User settings updated', {
      userId: req.user.id,
      changes: Object.keys(req.body)
    });

    res.json({
      message: 'Beállítások sikeresen frissítve'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'updateUserSettings' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Beállítások frissítése során hiba történt'
    });
  }
});

module.exports = router;
