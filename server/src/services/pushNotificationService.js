const webpush = require('web-push');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

// VAPID konfiguráció
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:proky2003@gmail.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  logger.error('VAPID kulcsok hiányoznak! Futtasd: node scripts/generate-vapid-keys.js');
} else {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Push subscription mentése
 */
async function saveSubscription(userId, subscription, userAgent = null, deviceName = null) {
  try {
    const { endpoint, keys } = subscription;
    
    const result = await query(`
      INSERT INTO push_subscriptions (
        user_id, endpoint, p256dh, auth, user_agent, device_name
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, endpoint) 
      DO UPDATE SET 
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        is_active = TRUE,
        last_used_at = NOW(),
        updated_at = NOW()
      RETURNING id
    `, [userId, endpoint, keys.p256dh, keys.auth, userAgent, deviceName]);
    
    logger.info(`Push subscription saved for user ${userId}`);
    return { success: true, subscriptionId: result.rows[0].id };
    
  } catch (error) {
    logger.error('Error saving push subscription:', error);
    throw error;
  }
}

/**
 * Push subscription törlése
 */
async function deleteSubscription(userId, endpoint) {
  try {
    await query(`
      UPDATE push_subscriptions 
      SET is_active = FALSE, updated_at = NOW()
      WHERE user_id = $1 AND endpoint = $2
    `, [userId, endpoint]);
    
    logger.info(`Push subscription deleted for user ${userId}`);
    return { success: true };
    
  } catch (error) {
    logger.error('Error deleting push subscription:', error);
    throw error;
  }
}

/**
 * Felhasználó összes aktív subscription-je
 */
async function getUserSubscriptions(userId) {
  try {
    const result = await query(`
      SELECT id, endpoint, p256dh, auth, device_name, last_used_at
      FROM push_subscriptions
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY last_used_at DESC
    `, [userId]);
    
    return result.rows;
    
  } catch (error) {
    logger.error('Error getting user subscriptions:', error);
    throw error;
  }
}

/**
 * Push notification küldése egy felhasználónak
 */
async function sendNotificationToUser(userId, notification) {
  try {
    const subscriptions = await getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      logger.info(`No active subscriptions for user ${userId}`);
      return { success: false, message: 'No active subscriptions' };
    }
    
    const payload = JSON.stringify(notification);
    const results = [];
    
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        
        await webpush.sendNotification(pushSubscription, payload);
        
        // Log sikeres küldés
        await logNotification(userId, sub.id, notification, 'sent');
        
        results.push({ subscriptionId: sub.id, success: true });
        logger.info(`Notification sent to user ${userId}, subscription ${sub.id}`);
        
      } catch (error) {
        // Ha a subscription lejárt vagy invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
          await deleteSubscription(userId, sub.endpoint);
          logger.info(`Expired subscription removed for user ${userId}`);
        }
        
        // Log sikertelen küldés
        await logNotification(userId, sub.id, notification, 'failed', error.message);
        
        results.push({ subscriptionId: sub.id, success: false, error: error.message });
        logger.error(`Failed to send notification to user ${userId}:`, error);
      }
    }
    
    return { 
      success: results.some(r => r.success), 
      results,
      sentCount: results.filter(r => r.success).length,
      totalCount: results.length
    };
    
  } catch (error) {
    logger.error('Error sending notification to user:', error);
    throw error;
  }
}

/**
 * Push notification küldése több felhasználónak
 */
async function sendNotificationToUsers(userIds, notification) {
  try {
    const results = [];
    
    for (const userId of userIds) {
      const result = await sendNotificationToUser(userId, notification);
      results.push({ userId, ...result });
    }
    
    return {
      success: true,
      results,
      totalUsers: userIds.length,
      successfulUsers: results.filter(r => r.success).length
    };
    
  } catch (error) {
    logger.error('Error sending notifications to users:', error);
    throw error;
  }
}

/**
 * Notification log mentése
 */
async function logNotification(userId, subscriptionId, notification, status, errorMessage = null) {
  try {
    await query(`
      INSERT INTO notification_logs (
        user_id, subscription_id, notification_type,
        title, body, data, status, error_message, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      userId,
      subscriptionId,
      notification.type || 'general',
      notification.title,
      notification.body,
      JSON.stringify(notification.data || {}),
      status,
      errorMessage,
      status === 'sent' ? new Date() : null
    ]);
    
  } catch (error) {
    logger.error('Error logging notification:', error);
  }
}

/**
 * Notification click tracking
 */
async function trackNotificationClick(notificationId) {
  try {
    await query(`
      UPDATE notification_logs
      SET status = 'clicked', clicked_at = NOW()
      WHERE id = $1
    `, [notificationId]);
    
    logger.info(`Notification ${notificationId} clicked`);
    return { success: true };
    
  } catch (error) {
    logger.error('Error tracking notification click:', error);
    throw error;
  }
}

/**
 * VAPID public key lekérése (frontend számára)
 */
function getVapidPublicKey() {
  return vapidPublicKey;
}

module.exports = {
  saveSubscription,
  deleteSubscription,
  getUserSubscriptions,
  sendNotificationToUser,
  sendNotificationToUsers,
  trackNotificationClick,
  getVapidPublicKey
};
