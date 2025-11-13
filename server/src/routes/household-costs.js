/**
 * Háztartási közös költségek API routes
 */

const express = require('express');
const router = express.Router();
const { query: dbQuery } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// =====================================================
// HÁZTARTÁSI KÖZÖS KÖLTSÉGEK LEKÉRDEZÉSE
// =====================================================

/**
 * GET /api/v1/household-costs/:householdId
 * Háztartási közös költségek lekérdezése
 */
router.get('/:householdId', authenticateToken, async (req, res) => {
  try {
    const { householdId } = req.params;

    // Ellenőrizzük a háztartás tagságot
    const memberCheck = await dbQuery(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    // Közös költségek lekérdezése
    const result = await dbQuery(`
      SELECT 
        id,
        household_id,
        common_utility_cost,
        maintenance_cost,
        other_monthly_costs,
        rent_amount,
        garage_rent,
        insurance_cost,
        notes,
        created_at,
        updated_at
      FROM household_costs 
      WHERE household_id = $1
    `, [householdId]);

    // Ha nincs rekord, létrehozunk egy alapértelmezettet
    if (result.rows.length === 0) {
      const insertResult = await dbQuery(`
        INSERT INTO household_costs (household_id, common_utility_cost, maintenance_cost, other_monthly_costs, rent_amount, garage_rent, insurance_cost)
        VALUES ($1, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
        RETURNING *
      `, [householdId]);
      
      return res.json({
        success: true,
        data: insertResult.rows[0]
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching household costs:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a háztartási költségek lekérdezésekor'
    });
  }
});

// =====================================================
// HÁZTARTÁSI KÖZÖS KÖLTSÉGEK FRISSÍTÉSE
// =====================================================

/**
 * PUT /api/v1/household-costs/:householdId
 * Háztartási közös költségek frissítése
 */
router.put('/:householdId', authenticateToken, async (req, res) => {
  try {
    const { householdId } = req.params;
    const { 
      common_utility_cost, 
      maintenance_cost, 
      other_monthly_costs,
      rent_amount,
      garage_rent,
      insurance_cost,
      notes 
    } = req.body;

    // Ellenőrizzük a háztartás tagságot (csak admin/owner módosíthat)
    const memberCheck = await dbQuery(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    const userRole = memberCheck.rows[0].role;
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Csak a háztartás tulajdonosa vagy adminisztrátor módosíthatja a közös költségeket'
      });
    }

    // Adatok validálása
    const validatedData = {
      common_utility_cost: parseFloat(common_utility_cost) || 0,
      maintenance_cost: parseFloat(maintenance_cost) || 0,
      other_monthly_costs: parseFloat(other_monthly_costs) || 0,
      rent_amount: parseFloat(rent_amount) || 0,
      garage_rent: parseFloat(garage_rent) || 0,
      insurance_cost: parseFloat(insurance_cost) || 0,
      notes: notes || null
    };

    // Debug log a mentendő adatokról
    console.log('💾 Saving household costs data:', {
      householdId,
      validatedData
    });

    // Frissítés vagy beszúrás (UPSERT)
    const result = await dbQuery(`
      INSERT INTO household_costs (
        household_id, 
        common_utility_cost, 
        maintenance_cost, 
        other_monthly_costs, 
        rent_amount,
        garage_rent,
        insurance_cost,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (household_id) 
      DO UPDATE SET
        common_utility_cost = COALESCE($2, household_costs.common_utility_cost),
        maintenance_cost = COALESCE($3, household_costs.maintenance_cost),
        other_monthly_costs = COALESCE($4, household_costs.other_monthly_costs),
        rent_amount = COALESCE($5, household_costs.rent_amount),
        garage_rent = COALESCE($6, household_costs.garage_rent),
        insurance_cost = COALESCE($7, household_costs.insurance_cost),
        notes = COALESCE($8, household_costs.notes),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      householdId,
      validatedData.common_utility_cost,
      validatedData.maintenance_cost,
      validatedData.other_monthly_costs,
      validatedData.rent_amount,
      validatedData.garage_rent,
      validatedData.insurance_cost,
      validatedData.notes
    ]);

    console.log('💾 Database result:', result.rows[0]);

    logger.info(`Household costs updated for household ${householdId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Háztartási közös költségek sikeresen frissítve',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating household costs:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a háztartási költségek frissítésekor'
    });
  }
});

// =====================================================
// HÁZTARTÁSI KÖZÖS KÖLTSÉGEK TÖRLÉSE
// =====================================================

/**
 * DELETE /api/v1/household-costs/:householdId
 * Háztartási közös költségek visszaállítása alapértelmezettre
 */
router.delete('/:householdId', authenticateToken, async (req, res) => {
  try {
    const { householdId } = req.params;

    // Ellenőrizzük a háztartás tagságot (csak owner törölhet)
    const memberCheck = await dbQuery(`
      SELECT role FROM household_members 
      WHERE household_id = $1 AND user_id = $2 AND left_at IS NULL
    `, [householdId, req.user.id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nincs jogosultságod ehhez a háztartáshoz'
      });
    }

    const userRole = memberCheck.rows[0].role;
    if (userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Csak a háztartás tulajdonosa állíthatja vissza a közös költségeket'
      });
    }

    // Visszaállítás alapértelmezettre
    const result = await dbQuery(`
      UPDATE household_costs 
      SET 
        common_utility_cost = 0.00,
        maintenance_cost = 0.00,
        other_monthly_costs = 0.00,
        notes = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE household_id = $1
      RETURNING *
    `, [householdId]);

    logger.info(`Household costs reset for household ${householdId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Háztartási közös költségek visszaállítva alapértelmezettre',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error resetting household costs:', error);
    res.status(500).json({
      success: false,
      message: 'Hiba történt a háztartási költségek visszaállításakor'
    });
  }
});

module.exports = router;
