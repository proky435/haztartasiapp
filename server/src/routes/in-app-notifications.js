const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * In-App Notifications API Routes
 * Értesítési központ backend
 */

/**
 * GET /api/v1/in-app-notifications
 * Felhasználó értesítéseinek lekérése
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let queryText = `
      SELECT 
        id,
        type,
        title,
        message,
        data,
        is_read as read,
        read_at,
        created_at
      FROM notifications
      WHERE user_id = $1
    `;

    const params = [userId];

    if (unread_only === 'true') {
      queryText += ' AND is_read = false';
    }

    queryText += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    res.json({
      notifications: result.rows,
      total: result.rows.length,
      hasMore: result.rows.length === parseInt(limit)
    });

  } catch (error) {
    logger.error('Értesítések lekérési hiba:', error);
    res.status(500).json({ error: 'Hiba történt az értesítések lekérésekor' });
  }
});

/**
 * GET /api/v1/in-app-notifications/unread-count
 * Olvasatlan értesítések számának lekérése
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [userId]);

    res.json({ count: parseInt(result.rows[0].count) });

  } catch (error) {
    logger.error('Olvasatlan értesítések számának lekérési hiba:', error);
    res.status(500).json({ error: 'Hiba történt' });
  }
});

/**
 * PATCH /api/v1/in-app-notifications/:id/read
 * Értesítés olvasottnak jelölése
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(`
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, type, title, message, data, is_read as read, read_at, created_at
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Értesítés nem található' });
    }

    res.json({ notification: result.rows[0] });

  } catch (error) {
    logger.error('Értesítés olvasottnak jelölési hiba:', error);
    res.status(500).json({ error: 'Hiba történt' });
  }
});

/**
 * POST /api/v1/in-app-notifications/mark-all-read
 * Összes értesítés olvasottnak jelölése
 */
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(`
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
      RETURNING id
    `, [userId]);

    res.json({ 
      message: 'Összes értesítés olvasottnak jelölve',
      count: result.rows.length 
    });

  } catch (error) {
    logger.error('Összes értesítés olvasottnak jelölési hiba:', error);
    res.status(500).json({ error: 'Hiba történt' });
  }
});

/**
 * DELETE /api/v1/in-app-notifications/:id
 * Értesítés törlése
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(`
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Értesítés nem található' });
    }

    res.json({ message: 'Értesítés törölve' });

  } catch (error) {
    logger.error('Értesítés törlési hiba:', error);
    res.status(500).json({ error: 'Hiba történt' });
  }
});

/**
 * POST /api/v1/in-app-notifications
 * Új értesítés létrehozása (belső használatra - cron job-ok, események)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, household_id, type, title, message, data } = req.body;

    // Csak admin vagy rendszer hozhat létre értesítést
    // TODO: Admin check implementálása

    const result = await query(`
      INSERT INTO notifications (user_id, household_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [user_id, household_id, type, title, message, JSON.stringify(data || {})]);

    res.status(201).json({ notification: result.rows[0] });

  } catch (error) {
    logger.error('Értesítés létrehozási hiba:', error);
    res.status(500).json({ error: 'Hiba történt' });
  }
});

module.exports = router;
