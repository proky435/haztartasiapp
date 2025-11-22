const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const schedulerService = require('../services/notificationSchedulerService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/v1/scheduler/run-all
 * Összes scheduler futtatása (admin/development)
 */
router.post('/run-all', authenticateToken, async (req, res) => {
  try {
    // Csak development módban vagy admin jogosultsággal
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet',
        message: 'Csak admin futtathatja a scheduler-t production-ben'
      });
    }
    
    logger.info(`Manual scheduler run triggered by user ${req.user.id}`);
    
    const results = await schedulerService.runAllSchedulers();
    
    res.json({
      success: true,
      message: `${results.totalNotificationsSent} értesítés elküldve`,
      details: results.details
    });
    
  } catch (error) {
    logger.error('Error running schedulers:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Scheduler futtatása sikertelen'
    });
  }
});

/**
 * POST /api/v1/scheduler/low-stock
 * Készlet elfogyási értesítések
 */
router.post('/low-stock', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet'
      });
    }
    
    const result = await schedulerService.sendLowStockNotifications();
    
    res.json({
      success: true,
      message: `${result.notificationsSent} készlet értesítés elküldve`
    });
    
  } catch (error) {
    logger.error('Error running low stock scheduler:', error);
    res.status(500).json({
      error: 'Szerver hiba'
    });
  }
});

/**
 * POST /api/v1/scheduler/expiry
 * Lejárati figyelmeztetések
 */
router.post('/expiry', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet'
      });
    }
    
    const result = await schedulerService.sendExpiryWarnings();
    
    res.json({
      success: true,
      message: `${result.notificationsSent} lejárati értesítés elküldve`
    });
    
  } catch (error) {
    logger.error('Error running expiry scheduler:', error);
    res.status(500).json({
      error: 'Szerver hiba'
    });
  }
});

/**
 * POST /api/v1/scheduler/shopping
 * Vásárlási emlékeztetők
 */
router.post('/shopping', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Tiltott művelet'
      });
    }
    
    const result = await schedulerService.sendShoppingReminders();
    
    res.json({
      success: true,
      message: `${result.notificationsSent} vásárlási emlékeztető elküldve`
    });
    
  } catch (error) {
    logger.error('Error running shopping scheduler:', error);
    res.status(500).json({
      error: 'Szerver hiba'
    });
  }
});

module.exports = router;
