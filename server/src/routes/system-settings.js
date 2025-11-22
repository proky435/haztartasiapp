const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const cronScheduler = require('../services/cronScheduler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/v1/system-settings/cron
 * Cron beállítások lekérése
 */
router.get('/cron', authenticateToken, async (req, res) => {
  try {
    // Csak admin vagy development módban
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet',
        message: 'Csak admin érheti el a rendszer beállításokat'
      });
    }
    
    const settings = await cronScheduler.getCronSettings();
    const status = cronScheduler.getCronStatus();
    
    res.json({
      success: true,
      settings,
      status
    });
    
  } catch (error) {
    logger.error('Error getting cron settings:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Cron beállítások lekérése sikertelen'
    });
  }
});

/**
 * PUT /api/v1/system-settings/cron
 * Cron beállítások frissítése
 */
router.put('/cron', authenticateToken, async (req, res) => {
  try {
    // Csak admin vagy development módban
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet',
        message: 'Csak admin módosíthatja a rendszer beállításokat'
      });
    }
    
    const {
      cron_enabled,
      low_stock_cron,
      expiry_warning_cron,
      shopping_reminder_cron
    } = req.body;
    
    await cronScheduler.updateCronSettings({
      cron_enabled,
      low_stock_cron,
      expiry_warning_cron,
      shopping_reminder_cron
    });
    
    const status = cronScheduler.getCronStatus();
    
    res.json({
      success: true,
      message: 'Cron beállítások frissítve',
      status
    });
    
  } catch (error) {
    logger.error('Error updating cron settings:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: error.message || 'Cron beállítások frissítése sikertelen'
    });
  }
});

/**
 * POST /api/v1/system-settings/cron/restart
 * Cron újraindítása
 */
router.post('/cron/restart', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet'
      });
    }
    
    await cronScheduler.restartCronJobs();
    const status = cronScheduler.getCronStatus();
    
    res.json({
      success: true,
      message: 'Cron újraindítva',
      status
    });
    
  } catch (error) {
    logger.error('Error restarting cron:', error);
    res.status(500).json({
      error: 'Szerver hiba'
    });
  }
});

module.exports = router;
