const express = require('express');
const { param, query: queryValidator, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const consumptionService = require('../services/consumptionTrackingService');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/v1/households/:householdId/consumption/stats/:productId
 * Fogyasztási statisztika egy termékhez
 */
router.get('/stats/:productId', [
  authenticateToken,
  param('householdId').isUUID(),
  param('productId').isUUID(),
  queryValidator('customName').optional().trim()
], requireRole('viewer'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId, productId } = req.params;
    const { customName } = req.query;

    const stats = await consumptionService.getCombinedConsumptionStats(
      householdId,
      productId,
      customName
    );

    res.json(stats);

  } catch (error) {
    logger.error('Error getting consumption stats:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Fogyasztási statisztika lekérése sikertelen'
    });
  }
});

/**
 * GET /api/v1/households/:householdId/consumption/prediction/:inventoryId
 * Előrejelzés: mikor fogy el a készlet
 */
router.get('/prediction/:inventoryId', [
  authenticateToken,
  param('householdId').isUUID(),
  param('inventoryId').isUUID()
], requireRole('viewer'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId, inventoryId } = req.params;

    const prediction = await consumptionService.predictStockDepletion(
      householdId,
      inventoryId
    );

    res.json(prediction);

  } catch (error) {
    logger.error('Error predicting stock depletion:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Készlet előrejelzés sikertelen'
    });
  }
});

/**
 * GET /api/v1/households/:householdId/consumption/suggestions
 * Automatikus bevásárlási javaslatok
 */
router.get('/suggestions', [
  authenticateToken,
  param('householdId').isUUID()
], requireRole('viewer'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId } = req.params;

    const suggestions = await consumptionService.generateAutoSuggestions(householdId);

    res.json(suggestions);

  } catch (error) {
    logger.error('Error generating suggestions:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Javaslatok generálása sikertelen'
    });
  }
});

/**
 * GET /api/v1/households/:householdId/consumption/waste
 * Pazarlás statisztika
 */
router.get('/waste', [
  authenticateToken,
  param('householdId').isUUID(),
  queryValidator('months').optional().isInt({ min: 1, max: 12 })
], requireRole('viewer'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validációs hiba',
        details: errors.array()
      });
    }

    const { householdId } = req.params;
    const { months = 1 } = req.query;

    const wasteStats = await consumptionService.getWasteStatistics(
      householdId,
      parseInt(months)
    );

    res.json(wasteStats);

  } catch (error) {
    logger.error('Error getting waste statistics:', error);
    res.status(500).json({
      error: 'Szerver hiba',
      message: 'Pazarlás statisztika lekérése sikertelen'
    });
  }
});

module.exports = router;
