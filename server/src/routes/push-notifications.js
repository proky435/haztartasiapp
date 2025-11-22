const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const pushService = require('../services/pushNotificationService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/push/vapid-public-key
 * VAPID public key lekérése (frontend számára)
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushService.getVapidPublicKey();
    
    if (!publicKey) {
      return res.status(500).json({
        error: 'VAPID kulcs nem elérhető',
        message: 'Push notification szolgáltatás nincs konfigurálva'
      });
    }
    
    res.json({ publicKey });
    
  } catch (error) {
    logger.error('Error getting VAPID public key:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'VAPID kulcs lekérése sikertelen'
    });
  }
});

/**
 * POST /api/v1/push/subscribe
 * Push notification feliratkozás
 */
router.post('/subscribe', [
  authenticateToken,
  body('subscription').isObject().withMessage('Subscription objektum kötelező'),
  body('subscription.endpoint').isURL().withMessage('Érvényes endpoint URL szükséges'),
  body('subscription.keys').isObject().withMessage('Keys objektum kötelező'),
  body('subscription.keys.p256dh').notEmpty().withMessage('p256dh kulcs kötelező'),
  body('subscription.keys.auth').notEmpty().withMessage('auth kulcs kötelező'),
  body('deviceName').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }
    
    const { subscription, deviceName } = req.body;
    const userId = req.user.id;
    const userAgent = req.headers['user-agent'];
    
    const result = await pushService.saveSubscription(
      userId,
      subscription,
      userAgent,
      deviceName
    );
    
    res.json({
      success: true,
      message: 'Push notification feliratkozás sikeres',
      subscriptionId: result.subscriptionId
    });
    
  } catch (error) {
    logger.error('Error subscribing to push notifications:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Feliratkozás sikertelen'
    });
  }
});

/**
 * POST /api/v1/push/unsubscribe
 * Push notification leiratkozás
 */
router.post('/unsubscribe', [
  authenticateToken,
  body('endpoint').isURL().withMessage('Érvényes endpoint URL szükséges')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }
    
    const { endpoint } = req.body;
    const userId = req.user.id;
    
    await pushService.deleteSubscription(userId, endpoint);
    
    res.json({
      success: true,
      message: 'Push notification leiratkozás sikeres'
    });
    
  } catch (error) {
    logger.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Leiratkozás sikertelen'
    });
  }
});

/**
 * GET /api/v1/push/subscriptions
 * Felhasználó aktív subscription-jei
 */
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = await pushService.getUserSubscriptions(userId);
    
    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        deviceName: sub.device_name,
        lastUsed: sub.last_used_at
      }))
    });
    
  } catch (error) {
    logger.error('Error getting user subscriptions:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Feliratkozások lekérése sikertelen'
    });
  }
});

/**
 * POST /api/v1/push/test
 * Teszt notification küldése (csak development-ben)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Tiltott művelet',
        message: 'Teszt notification csak development módban elérhető'
      });
    }
    
    const userId = req.user.id;
    
    const notification = {
      title: '🧪 Teszt Értesítés',
      body: 'Ez egy teszt push notification a Háztartási App-tól',
      type: 'test',
      data: {
        url: '/dashboard',
        timestamp: new Date().toISOString()
      }
    };
    
    const result = await pushService.sendNotificationToUser(userId, notification);
    
    res.json({
      success: result.success,
      message: result.success ? 'Teszt notification elküldve' : 'Nincs aktív feliratkozás',
      details: result
    });
    
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Teszt notification küldése sikertelen'
    });
  }
});

/**
 * POST /api/v1/push/track-click/:notificationId
 * Notification kattintás követése
 */
router.post('/track-click/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await pushService.trackNotificationClick(notificationId);
    
    res.json({
      success: true,
      message: 'Kattintás rögzítve'
    });
    
  } catch (error) {
    logger.error('Error tracking notification click:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Kattintás rögzítése sikertelen'
    });
  }
});

module.exports = router;
