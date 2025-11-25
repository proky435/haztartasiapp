const { query } = require('../database/connection');
const pushService = require('./pushNotificationService');
const consumptionService = require('./consumptionTrackingService');
const logger = require('../utils/logger');

/**
 * Notification Scheduler Service
 * Automatikus értesítések küldése fogyasztási adatok alapján
 */

/**
 * Készlet elfogyási értesítések
 * Minden nap futtatható - ellenőrzi, hogy mely termékek fogynak el hamarosan
 */
async function sendLowStockNotifications() {
  try {
    logger.info('Starting low stock notifications check...');
    
    // Lekérjük az összes háztartást, ahol engedélyezett a tracking
    const householdsResult = await query(`
      SELECT DISTINCT h.id, h.name
      FROM households h
      JOIN household_settings hs ON h.id = hs.household_id
      WHERE hs.consumption_tracking_enabled = true
      AND hs.auto_suggestions_enabled = true
    `);
    
    logger.info(`Checking ${householdsResult.rows.length} households for low stock`);
    
    let totalNotificationsSent = 0;
    
    for (const household of householdsResult.rows) {
      try {
        // Lekérjük a háztartás tagjait, akik engedélyezték az értesítéseket
        const membersResult = await query(`
          SELECT DISTINCT u.id, u.name, u.email
          FROM users u
          JOIN household_members hm ON u.id = hm.user_id
          JOIN user_settings us ON u.id = us.user_id
          WHERE hm.household_id = $1 
          AND hm.left_at IS NULL
          AND (us.consumption_notifications->>'low_stock_predictions')::boolean = true
        `, [household.id]);
        
        if (membersResult.rows.length === 0) {
          continue;
        }
        
        // Lekérjük az összes készlet tételt
        const inventoryResult = await query(`
          SELECT id, product_master_id, custom_name, quantity, unit
          FROM household_inventory
          WHERE household_id = $1 AND quantity > 0
        `, [household.id]);
        
        const lowStockItems = [];
        
        // Minden termékre előrejelzés
        for (const item of inventoryResult.rows) {
          try {
            const prediction = await consumptionService.predictStockDepletion(
              household.id,
              item.id
            );
            
            // Ha 3 napon belül elfogy
            if (prediction.status === 'success' && prediction.daysUntilEmpty <= 3) {
              lowStockItems.push({
                name: item.custom_name,
                quantity: item.quantity,
                unit: item.unit,
                daysUntilEmpty: Math.floor(prediction.daysUntilEmpty)
              });
            }
          } catch (error) {
            // Hibát nem dobunk, csak logoljuk
            logger.error(`Error predicting stock for item ${item.id}:`, error.message);
          }
        }
        
        // Ha van elfogyó termék, küldünk értesítést
        if (lowStockItems.length > 0) {
          const notification = {
            title: '⚠️ Készlet Figyelmeztetés',
            body: `${lowStockItems.length} termék hamarosan elfogy a ${household.name} háztartásban`,
            type: 'low_stock',
            data: {
              url: '/inventory',
              householdId: household.id,
              items: lowStockItems
            }
          };
          
          // Értesítés küldése minden tagnak
          for (const member of membersResult.rows) {
            try {
              await pushService.sendNotificationToUser(member.id, notification);
              totalNotificationsSent++;
            } catch (error) {
              logger.error(`Error sending notification to user ${member.id}:`, error.message);
            }
          }
          
          logger.info(`Sent low stock notification for household ${household.name} to ${membersResult.rows.length} members`);
        }
        
      } catch (error) {
        logger.error(`Error processing household ${household.id}:`, error);
      }
    }
    
    logger.info(`Low stock notifications completed. Sent ${totalNotificationsSent} notifications`);
    return { success: true, notificationsSent: totalNotificationsSent };
    
  } catch (error) {
    logger.error('Error in sendLowStockNotifications:', error);
    throw error;
  }
}

/**
 * Lejárati figyelmeztetések
 * Minden nap futtatható - ellenőrzi a hamarosan lejáró termékeket
 */
async function sendExpiryWarnings() {
  try {
    logger.info('Starting expiry warnings check...');
    
    // Lekérjük a 3 napon belül lejáró termékeket
    const expiringItemsResult = await query(`
      SELECT 
        hi.id,
        hi.household_id,
        hi.custom_name,
        hi.quantity,
        hi.unit,
        hi.expiry_date,
        h.name as household_name,
        EXTRACT(DAY FROM (hi.expiry_date - NOW())) as days_until_expiry
      FROM household_inventory hi
      JOIN households h ON hi.household_id = h.id
      WHERE hi.expiry_date IS NOT NULL
      AND hi.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND hi.quantity > 0
      ORDER BY hi.expiry_date ASC
    `);
    
    logger.info(`Found ${expiringItemsResult.rows.length} expiring items`);
    
    // Csoportosítás háztartás szerint
    const itemsByHousehold = {};
    for (const item of expiringItemsResult.rows) {
      if (!itemsByHousehold[item.household_id]) {
        itemsByHousehold[item.household_id] = {
          householdName: item.household_name,
          items: []
        };
      }
      itemsByHousehold[item.household_id].items.push({
        name: item.custom_name,
        quantity: item.quantity,
        unit: item.unit,
        daysUntilExpiry: Math.floor(item.days_until_expiry)
      });
    }
    
    let totalNotificationsSent = 0;
    
    // Értesítések küldése háztartásonként
    for (const [householdId, data] of Object.entries(itemsByHousehold)) {
      try {
        // Lekérjük a tagokat, akik engedélyezték az értesítéseket
        const membersResult = await query(`
          SELECT DISTINCT u.id
          FROM users u
          JOIN household_members hm ON u.id = hm.user_id
          JOIN user_settings us ON u.id = us.user_id
          WHERE hm.household_id = $1 
          AND hm.left_at IS NULL
          AND (us.consumption_notifications->>'waste_alerts')::boolean = true
        `, [householdId]);
        
        if (membersResult.rows.length === 0) {
          continue;
        }
        
        const notification = {
          title: '⏰ Lejárati Figyelmeztetés',
          body: `${data.items.length} termék hamarosan lejár a ${data.householdName} háztartásban`,
          type: 'expiry_warning',
          data: {
            url: '/inventory',
            householdId: householdId,
            items: data.items
          }
        };
        
        // Értesítés küldése
        for (const member of membersResult.rows) {
          try {
            await pushService.sendNotificationToUser(member.id, notification);
            totalNotificationsSent++;
          } catch (error) {
            logger.error(`Error sending expiry warning to user ${member.id}:`, error.message);
          }
        }
        
      } catch (error) {
        logger.error(`Error processing expiry warnings for household ${householdId}:`, error);
      }
    }
    
    logger.info(`Expiry warnings completed. Sent ${totalNotificationsSent} notifications`);
    return { success: true, notificationsSent: totalNotificationsSent };
    
  } catch (error) {
    logger.error('Error in sendExpiryWarnings:', error);
    throw error;
  }
}

/**
 * Vásárlási emlékeztetők
 * Heti mintázatok alapján - pl. minden hétfőn emlékeztető tejre
 */
async function sendShoppingReminders() {
  try {
    logger.info('Starting shopping reminders check...');
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = vasárnap, 1 = hétfő, stb.
    
    // Lekérjük azokat a termékeket, amiket általában ezen a napon vásárolnak
    const reminderItemsResult = await query(`
      SELECT 
        slih.household_id,
        slih.product_master_id,
        pm.name as product_name,
        slih.custom_name,
        h.name as household_name,
        COUNT(*) as purchase_count,
        AVG(slih.quantity) as avg_quantity,
        slih.unit
      FROM shopping_list_item_history slih
      JOIN households h ON slih.household_id = h.id
      LEFT JOIN products_master pm ON slih.product_master_id = pm.id
      WHERE EXTRACT(DOW FROM slih.added_to_list_date) = $1
      AND slih.added_to_list_date >= NOW() - INTERVAL '8 weeks'
      GROUP BY slih.household_id, slih.product_master_id, pm.name, slih.custom_name, h.name, slih.unit
      HAVING COUNT(*) >= 2
      ORDER BY purchase_count DESC
    `, [dayOfWeek]);
    
    logger.info(`Found ${reminderItemsResult.rows.length} shopping pattern matches for day ${dayOfWeek}`);
    
    // Csoportosítás háztartás szerint
    const itemsByHousehold = {};
    for (const item of reminderItemsResult.rows) {
      if (!itemsByHousehold[item.household_id]) {
        itemsByHousehold[item.household_id] = {
          householdName: item.household_name,
          items: []
        };
      }
      itemsByHousehold[item.household_id].items.push({
        name: item.product_name || item.custom_name,
        avgQuantity: Math.ceil(item.avg_quantity),
        unit: item.unit,
        purchaseCount: item.purchase_count
      });
    }
    
    let totalNotificationsSent = 0;
    
    // Értesítések küldése
    for (const [householdId, data] of Object.entries(itemsByHousehold)) {
      try {
        // Lekérjük a tagokat
        const membersResult = await query(`
          SELECT DISTINCT u.id
          FROM users u
          JOIN household_members hm ON u.id = hm.user_id
          JOIN user_settings us ON u.id = us.user_id
          WHERE hm.household_id = $1 
          AND hm.left_at IS NULL
          AND (us.consumption_notifications->>'shopping_pattern_suggestions')::boolean = true
        `, [householdId]);
        
        if (membersResult.rows.length === 0) {
          continue;
        }
        
        const notification = {
          title: '🛒 Bevásárlási Emlékeztető',
          body: `Általában ma szoktál vásárolni: ${data.items.slice(0, 2).map(i => i.name).join(', ')}`,
          type: 'shopping_reminder',
          data: {
            url: '/shopping-list',
            householdId: householdId,
            items: data.items
          }
        };
        
        for (const member of membersResult.rows) {
          try {
            await pushService.sendNotificationToUser(member.id, notification);
            totalNotificationsSent++;
          } catch (error) {
            logger.error(`Error sending shopping reminder to user ${member.id}:`, error.message);
          }
        }
        
      } catch (error) {
        logger.error(`Error processing shopping reminders for household ${householdId}:`, error);
      }
    }
    
    logger.info(`Shopping reminders completed. Sent ${totalNotificationsSent} notifications`);
    return { success: true, notificationsSent: totalNotificationsSent };
    
  } catch (error) {
    logger.error('Error in sendShoppingReminders:', error);
    throw error;
  }
}

/**
 * Automatikus törlés - Régen lejárt termékek
 * Törli azokat a termékeket, amik már X napja lejártak
 */
async function deleteExpiredProducts(daysAfterExpiry = 7) {
  try {
    logger.info(`Starting auto-delete for products expired more than ${daysAfterExpiry} days ago...`);
    
    // Lekérjük a törlendő termékeket
    const expiredItemsResult = await query(`
      SELECT 
        hi.id,
        hi.household_id,
        hi.custom_name,
        hi.quantity,
        hi.unit,
        hi.expiry_date,
        h.name as household_name,
        EXTRACT(DAY FROM (NOW() - hi.expiry_date)) as days_since_expiry
      FROM household_inventory hi
      JOIN households h ON hi.household_id = h.id
      WHERE hi.expiry_date IS NOT NULL
      AND hi.expiry_date < NOW() - INTERVAL '${daysAfterExpiry} days'
      AND hi.quantity > 0
      ORDER BY hi.expiry_date ASC
    `);
    
    logger.info(`Found ${expiredItemsResult.rows.length} expired items to delete`);
    
    if (expiredItemsResult.rows.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    
    // Csoportosítás háztartás szerint
    const itemsByHousehold = {};
    for (const item of expiredItemsResult.rows) {
      if (!itemsByHousehold[item.household_id]) {
        itemsByHousehold[item.household_id] = {
          householdName: item.household_name,
          items: []
        };
      }
      itemsByHousehold[item.household_id].items.push({
        id: item.id,
        name: item.custom_name,
        quantity: item.quantity,
        unit: item.unit,
        daysSinceExpiry: Math.floor(item.days_since_expiry)
      });
    }
    
    let totalDeleted = 0;
    let totalNotificationsSent = 0;
    
    // Törlés és értesítés háztartásonként
    for (const [householdId, data] of Object.entries(itemsByHousehold)) {
      try {
        // Töröljük a termékeket (quantity = 0)
        const itemIds = data.items.map(item => item.id);
        await query(`
          UPDATE household_inventory
          SET quantity = 0, updated_at = NOW()
          WHERE id = ANY($1)
        `, [itemIds]);
        
        totalDeleted += itemIds.length;
        
        logger.info(`Deleted ${itemIds.length} expired items from household ${data.householdName}`);
        
        // Értesítés küldése a háztartás tagjainak
        const membersResult = await query(`
          SELECT DISTINCT u.id
          FROM users u
          JOIN household_members hm ON u.id = hm.user_id
          JOIN user_settings us ON u.id = us.user_id
          WHERE hm.household_id = $1 
          AND hm.left_at IS NULL
          AND (us.consumption_notifications->>'waste_alerts')::boolean = true
        `, [householdId]);
        
        if (membersResult.rows.length > 0) {
          const notification = {
            title: '🗑️ Lejárt Termékek Törölve',
            body: `${data.items.length} régen lejárt termék automatikusan törölve lett a ${data.householdName} háztartásból`,
            type: 'expired_deleted',
            data: {
              url: '/inventory',
              householdId: householdId,
              items: data.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                daysSinceExpiry: item.daysSinceExpiry
              }))
            }
          };
          
          for (const member of membersResult.rows) {
            try {
              await pushService.sendNotificationToUser(member.id, notification);
              totalNotificationsSent++;
            } catch (error) {
              logger.error(`Error sending deletion notification to user ${member.id}:`, error.message);
            }
          }
        }
        
      } catch (error) {
        logger.error(`Error deleting expired items for household ${householdId}:`, error);
      }
    }
    
    logger.info(`Auto-delete completed. Deleted ${totalDeleted} items, sent ${totalNotificationsSent} notifications`);
    return { 
      success: true, 
      deletedCount: totalDeleted,
      notificationsSent: totalNotificationsSent
    };
    
  } catch (error) {
    logger.error('Error in deleteExpiredProducts:', error);
    throw error;
  }
}

/**
 * Összes scheduler futtatása (manuális trigger)
 */
async function runAllSchedulers() {
  try {
    logger.info('Running all notification schedulers...');
    
    const results = {
      lowStock: await sendLowStockNotifications(),
      expiry: await sendExpiryWarnings(),
      shopping: await sendShoppingReminders(),
      autoDelete: await deleteExpiredProducts()
    };
    
    const totalSent = 
      results.lowStock.notificationsSent +
      results.expiry.notificationsSent +
      results.shopping.notificationsSent +
      (results.autoDelete.notificationsSent || 0);
    
    logger.info(`All schedulers completed. Total notifications sent: ${totalSent}`);
    
    return {
      success: true,
      totalNotificationsSent: totalSent,
      details: results
    };
    
  } catch (error) {
    logger.error('Error running all schedulers:', error);
    throw error;
  }
}

module.exports = {
  sendLowStockNotifications,
  sendExpiryWarnings,
  sendShoppingReminders,
  deleteExpiredProducts,
  runAllSchedulers
};
