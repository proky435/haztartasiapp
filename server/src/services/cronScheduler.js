const cron = require('node-cron');
const { query } = require('../database/connection');
const notificationScheduler = require('./notificationSchedulerService');
const logger = require('../utils/logger');

/**
 * Cron Scheduler Service
 * Automatikus értesítések ütemezése
 */

let cronJobs = {
  lowStock: null,
  expiry: null,
  shopping: null,
  autoDelete: null
};

let isEnabled = false;

/**
 * Cron beállítások lekérése az adatbázisból
 */
async function getCronSettings() {
  try {
    const result = await query(`
      SELECT 
        cron_enabled,
        low_stock_cron,
        expiry_warning_cron,
        shopping_reminder_cron,
        auto_delete_expired_cron,
        auto_delete_days_after_expiry
      FROM system_settings
      WHERE id = 1
    `);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Default értékek, ha nincs még beállítás
    return {
      cron_enabled: true,
      low_stock_cron: '0 9 * * *',      // Naponta 9:00
      expiry_warning_cron: '0 8 * * *', // Naponta 8:00
      shopping_reminder_cron: '0 8 * * 1', // Hétfő 8:00
      auto_delete_expired_cron: '0 2 * * *', // Naponta 2:00
      auto_delete_days_after_expiry: 7  // 7 nap után törlés
    };
  } catch (error) {
    logger.error('Error getting cron settings:', error);
    return null;
  }
}

/**
 * Cron job indítása
 */
async function startCronJobs() {
  try {
    const settings = await getCronSettings();
    
    if (!settings || !settings.cron_enabled) {
      logger.info('Cron jobs disabled in settings');
      return;
    }
    
    logger.info('Starting cron jobs...');
    
    // Készlet elfogyási értesítések
    if (cronJobs.lowStock) {
      cronJobs.lowStock.stop();
    }
    cronJobs.lowStock = cron.schedule(settings.low_stock_cron, async () => {
      logger.info('Running scheduled low stock notifications...');
      try {
        await notificationScheduler.sendLowStockNotifications();
      } catch (error) {
        logger.error('Error in scheduled low stock notifications:', error);
      }
    });
    logger.info(`Low stock notifications scheduled: ${settings.low_stock_cron}`);
    
    // Lejárati figyelmeztetések
    if (cronJobs.expiry) {
      cronJobs.expiry.stop();
    }
    cronJobs.expiry = cron.schedule(settings.expiry_warning_cron, async () => {
      logger.info('Running scheduled expiry warnings...');
      try {
        await notificationScheduler.sendExpiryWarnings();
      } catch (error) {
        logger.error('Error in scheduled expiry warnings:', error);
      }
    });
    logger.info(`Expiry warnings scheduled: ${settings.expiry_warning_cron}`);
    
    // Vásárlási emlékeztetők
    if (cronJobs.shopping) {
      cronJobs.shopping.stop();
    }
    cronJobs.shopping = cron.schedule(settings.shopping_reminder_cron, async () => {
      logger.info('Running scheduled shopping reminders...');
      try {
        await notificationScheduler.sendShoppingReminders();
      } catch (error) {
        logger.error('Error in scheduled shopping reminders:', error);
      }
    });
    logger.info(`Shopping reminders scheduled: ${settings.shopping_reminder_cron}`);
    
    // Automatikus törlés - lejárt termékek
    if (cronJobs.autoDelete) {
      cronJobs.autoDelete.stop();
    }
    const daysAfterExpiry = settings.auto_delete_days_after_expiry || 7;
    cronJobs.autoDelete = cron.schedule(settings.auto_delete_expired_cron, async () => {
      logger.info(`Running scheduled auto-delete for products expired more than ${daysAfterExpiry} days ago...`);
      try {
        await notificationScheduler.deleteExpiredProducts(daysAfterExpiry);
      } catch (error) {
        logger.error('Error in scheduled auto-delete:', error);
      }
    });
    logger.info(`Auto-delete expired products scheduled: ${settings.auto_delete_expired_cron} (${daysAfterExpiry} days after expiry)`);
    
    isEnabled = true;
    logger.info('✅ All cron jobs started successfully');
    
  } catch (error) {
    logger.error('Error starting cron jobs:', error);
    throw error;
  }
}

/**
 * Cron job leállítása
 */
function stopCronJobs() {
  logger.info('Stopping all cron jobs...');
  
  if (cronJobs.lowStock) {
    cronJobs.lowStock.stop();
    cronJobs.lowStock = null;
  }
  
  if (cronJobs.expiry) {
    cronJobs.expiry.stop();
    cronJobs.expiry = null;
  }
  
  if (cronJobs.shopping) {
    cronJobs.shopping.stop();
    cronJobs.shopping = null;
  }
  
  if (cronJobs.autoDelete) {
    cronJobs.autoDelete.stop();
    cronJobs.autoDelete = null;
  }
  
  isEnabled = false;
  logger.info('✅ All cron jobs stopped');
}

/**
 * Cron job újraindítása (beállítások változásakor)
 */
async function restartCronJobs() {
  logger.info('Restarting cron jobs...');
  stopCronJobs();
  await startCronJobs();
}

/**
 * Cron állapot lekérése
 */
function getCronStatus() {
  return {
    enabled: isEnabled,
    jobs: {
      lowStock: cronJobs.lowStock !== null,
      expiry: cronJobs.expiry !== null,
      shopping: cronJobs.shopping !== null,
      autoDelete: cronJobs.autoDelete !== null
    }
  };
}

/**
 * Cron beállítások frissítése
 */
async function updateCronSettings(settings) {
  try {
    const {
      cron_enabled,
      low_stock_cron,
      expiry_warning_cron,
      shopping_reminder_cron,
      auto_delete_expired_cron,
      auto_delete_days_after_expiry
    } = settings;
    
    // Validáljuk a cron kifejezéseket
    if (low_stock_cron && !cron.validate(low_stock_cron)) {
      throw new Error('Invalid low_stock_cron expression');
    }
    if (expiry_warning_cron && !cron.validate(expiry_warning_cron)) {
      throw new Error('Invalid expiry_warning_cron expression');
    }
    if (shopping_reminder_cron && !cron.validate(shopping_reminder_cron)) {
      throw new Error('Invalid shopping_reminder_cron expression');
    }
    if (auto_delete_expired_cron && !cron.validate(auto_delete_expired_cron)) {
      throw new Error('Invalid auto_delete_expired_cron expression');
    }
    
    // Frissítjük az adatbázisban
    await query(`
      INSERT INTO system_settings (
        id, cron_enabled, low_stock_cron, expiry_warning_cron, 
        shopping_reminder_cron, auto_delete_expired_cron, auto_delete_days_after_expiry
      )
      VALUES (1, $1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        cron_enabled = $1,
        low_stock_cron = $2,
        expiry_warning_cron = $3,
        shopping_reminder_cron = $4,
        auto_delete_expired_cron = $5,
        auto_delete_days_after_expiry = $6,
        updated_at = NOW()
    `, [cron_enabled, low_stock_cron, expiry_warning_cron, shopping_reminder_cron, 
        auto_delete_expired_cron, auto_delete_days_after_expiry]);
    
    // Újraindítjuk a cron job-okat
    await restartCronJobs();
    
    logger.info('Cron settings updated successfully');
    return { success: true };
    
  } catch (error) {
    logger.error('Error updating cron settings:', error);
    throw error;
  }
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  restartCronJobs,
  getCronStatus,
  getCronSettings,
  updateCronSettings
};
