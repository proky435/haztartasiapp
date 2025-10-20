const express = require('express');
const { param, query: queryValidator, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/notifications
 * Felhasználó értesítéseinek lekérése
 */
router.get('/', [
  authenticateToken,
  queryValidator('unread_only').optional().isBoolean(),
  queryValidator('type').optional().trim(),
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 })
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
      unread_only,
      type,
      page = 1,
      limit = 20
    } = req.query;

    let whereConditions = ['user_id = $1'];
    let queryParams = [req.user.id];
    let paramIndex = 2;

    if (unread_only === 'true') {
      whereConditions.push('read_at IS NULL');
    }

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    // Don't show expired notifications
    whereConditions.push('(expires_at IS NULL OR expires_at > NOW())');

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        id, household_id, type, title, message, data, priority,
        read_at, action_url, expires_at, created_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Get unread count
    const unreadResult = await query(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND read_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
    `, [req.user.id]);

    const notifications = result.rows.map(notification => ({
      id: notification.id,
      householdId: notification.household_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: typeof notification.data === 'string' 
        ? JSON.parse(notification.data) 
        : notification.data,
      priority: notification.priority,
      isRead: !!notification.read_at,
      readAt: notification.read_at,
      actionUrl: notification.action_url,
      expiresAt: notification.expires_at,
      createdAt: notification.created_at
    }));

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.length
      },
      unreadCount: parseInt(unreadResult.rows[0].unread_count)
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'getNotifications' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Értesítések lekérése során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Értesítés olvasottnak jelölése
 */
router.put('/:id/read', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen értesítés azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const notificationId = req.params.id;

    const result = await query(`
      UPDATE notifications 
      SET read_at = NOW()
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING id
    `, [notificationId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Értesítés nem található',
        message: 'Az értesítés nem létezik vagy már olvasott'
      });
    }

    logger.debug('Notification marked as read', {
      notificationId,
      userId: req.user.id
    });

    res.json({
      message: 'Értesítés olvasottnak jelölve'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'markNotificationAsRead' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Értesítés frissítése során hiba történt'
    });
  }
});

/**
 * PUT /api/v1/notifications/read-all
 * Összes értesítés olvasottnak jelölése
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      UPDATE notifications 
      SET read_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL
      RETURNING id
    `, [req.user.id]);

    logger.info('All notifications marked as read', {
      userId: req.user.id,
      count: result.rows.length
    });

    res.json({
      message: `${result.rows.length} értesítés olvasottnak jelölve`
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'markAllNotificationsAsRead' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Értesítések frissítése során hiba történt'
    });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Értesítés törlése
 */
router.delete('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('Érvénytelen értesítés azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const notificationId = req.params.id;

    const result = await query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [notificationId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Értesítés nem található'
      });
    }

    logger.debug('Notification deleted', {
      notificationId,
      userId: req.user.id
    });

    res.json({
      message: 'Értesítés törölve'
    });

  } catch (error) {
    logger.logError(error, req, { operation: 'deleteNotification' });
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Értesítés törlése során hiba történt'
    });
  }
});

module.exports = router;
