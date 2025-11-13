const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const utilityCostCalculator = require('../services/utilityCostCalculator');
const logger = require('../utils/logger');

/**
 * POST /api/v1/utility-calculator/calculate
 * Közműköltség számítása fogyasztás alapján
 */
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { household_id, utility_type_id, consumption, consumption_unit } = req.body;

    // Input validáció
    if (!household_id || !utility_type_id || consumption === undefined || consumption === null) {
      return res.status(400).json({
        success: false,
        error: 'Hiányzó kötelező mezők: household_id, utility_type_id, consumption'
      });
    }

    if (consumption < 0) {
      return res.status(400).json({
        success: false,
        error: 'A fogyasztás nem lehet negatív'
      });
    }

    // Debug: Felhasználó és háztartás adatok
    logger.info('Calculator request debug:', {
      user_id: req.user?.id,
      user_household_id: req.user?.household_id,
      requested_household_id: household_id,
      user_object: req.user
    });

    // Háztartás jogosultság ellenőrzése
    if (req.user.household_id !== household_id) {
      logger.warn('Household access denied:', {
        user_household_id: req.user.household_id,
        requested_household_id: household_id
      });
      return res.status(403).json({
        success: false,
        error: `Nincs jogosultsága ehhez a háztartáshoz. User household: ${req.user.household_id}, Requested: ${household_id}`
      });
    }

    // Költségszámítás
    const result = await utilityCostCalculator.calculateUtilityCost(
      household_id,
      utility_type_id,
      parseFloat(consumption),
      consumption_unit
    );

    logger.info(`Utility cost calculated for household ${household_id}, utility ${utility_type_id}: ${result.total_cost} Ft`);

    res.json(result);

  } catch (error) {
    logger.error('Error calculating utility cost:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Hiba a költségszámítás során'
    });
  }
});

/**
 * POST /api/v1/utility-calculator/calculate-between-readings
 * Költségszámítás két óraállás között
 */
router.post('/calculate-between-readings', authenticateToken, async (req, res) => {
  try {
    const { household_id, utility_type_id, previous_reading, current_reading } = req.body;

    // Input validáció
    if (!household_id || !utility_type_id || previous_reading === undefined || current_reading === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Hiányzó kötelező mezők: household_id, utility_type_id, previous_reading, current_reading'
      });
    }

    // Háztartás jogosultság ellenőrzése
    if (req.user.household_id !== household_id) {
      return res.status(403).json({
        success: false,
        error: 'Nincs jogosultsága ehhez a háztartáshoz'
      });
    }

    // Költségszámítás két óraállás között
    const result = await utilityCostCalculator.calculateCostBetweenReadings(
      household_id,
      utility_type_id,
      parseFloat(previous_reading),
      parseFloat(current_reading)
    );

    logger.info(`Utility cost calculated between readings for household ${household_id}: ${result.total_cost} Ft`);

    res.json(result);

  } catch (error) {
    logger.error('Error calculating cost between readings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Hiba a költségszámítás során'
    });
  }
});

/**
 * GET /api/v1/utility-calculator/pricing-info/:household_id/:utility_type_id
 * Árazási információk lekérése (sávok, alapdíj, stb.)
 */
router.get('/pricing-info/:household_id/:utility_type_id', authenticateToken, async (req, res) => {
  try {
    const { household_id, utility_type_id } = req.params;

    // Háztartás jogosultság ellenőrzése
    if (req.user.household_id !== household_id) {
      return res.status(403).json({
        success: false,
        error: 'Nincs jogosultsága ehhez a háztartáshoz'
      });
    }

    // Közműtípus információk lekérése
    const utilityInfo = await utilityCostCalculator.getUtilityInfo(household_id, utility_type_id);
    if (!utilityInfo) {
      return res.status(404).json({
        success: false,
        error: 'Közműtípus nem található'
      });
    }

    // Árazási sávok lekérése
    const pricingTiers = await utilityCostCalculator.getPricingTiers(household_id, utility_type_id);

    res.json({
      success: true,
      utility_info: utilityInfo,
      pricing_tiers: pricingTiers,
      has_tiered_pricing: pricingTiers && pricingTiers.length > 0
    });

  } catch (error) {
    logger.error('Error fetching pricing info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Hiba az árazási információk lekérése során'
    });
  }
});

module.exports = router;
