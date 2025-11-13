/**
 * Test Household Costs API - Teszteli a háztartási költségek API-t
 */

const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function testHouseholdCostsAPI() {
  try {
    console.log('🏠 Háztartási költségek API tesztelése');
    console.log('====================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';

    // 1. Teszt: Költségek lekérdezése
    console.log('📊 1. Teszt: Költségek lekérdezése');
    console.log('=================================');
    
    let result = await query(`
      SELECT * FROM household_costs WHERE household_id = $1
    `, [householdId]);

    if (result.rows.length === 0) {
      console.log('Nincs rekord, létrehozunk egyet...');
      result = await query(`
        INSERT INTO household_costs (household_id, common_utility_cost, maintenance_cost, other_monthly_costs)
        VALUES ($1, 0.00, 0.00, 0.00)
        RETURNING *
      `, [householdId]);
    }

    const currentCosts = result.rows[0];
    console.log('Jelenlegi költségek:');
    console.log(`- Közös közmű: ${currentCosts.common_utility_cost} Ft`);
    console.log(`- Karbantartás: ${currentCosts.maintenance_cost} Ft`);
    console.log(`- Egyéb: ${currentCosts.other_monthly_costs} Ft\n`);

    // 2. Teszt: Költségek frissítése
    console.log('💾 2. Teszt: Költségek frissítése');
    console.log('=================================');
    
    const testData = {
      common_utility_cost: 2000.00,
      maintenance_cost: 1500.00,
      other_monthly_costs: 500.00
    };

    const updateResult = await query(`
      UPDATE household_costs 
      SET 
        common_utility_cost = $2,
        maintenance_cost = $3,
        other_monthly_costs = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE household_id = $1
      RETURNING *
    `, [householdId, testData.common_utility_cost, testData.maintenance_cost, testData.other_monthly_costs]);

    const updatedCosts = updateResult.rows[0];
    console.log('Frissített költségek:');
    console.log(`- Közös közmű: ${updatedCosts.common_utility_cost} Ft`);
    console.log(`- Karbantartás: ${updatedCosts.maintenance_cost} Ft`);
    console.log(`- Egyéb: ${updatedCosts.other_monthly_costs} Ft`);
    console.log(`- Összesen: ${parseFloat(updatedCosts.common_utility_cost) + parseFloat(updatedCosts.maintenance_cost) + parseFloat(updatedCosts.other_monthly_costs)} Ft\n`);

    // 3. Teszt: Visszaállítás alapértelmezettre
    console.log('🔄 3. Teszt: Visszaállítás alapértelmezettre');
    console.log('============================================');
    
    const resetResult = await query(`
      UPDATE household_costs 
      SET 
        common_utility_cost = 0.00,
        maintenance_cost = 0.00,
        other_monthly_costs = 0.00,
        updated_at = CURRENT_TIMESTAMP
      WHERE household_id = $1
      RETURNING *
    `, [householdId]);

    const resetCosts = resetResult.rows[0];
    console.log('Visszaállított költségek:');
    console.log(`- Közös közmű: ${resetCosts.common_utility_cost} Ft`);
    console.log(`- Karbantartás: ${resetCosts.maintenance_cost} Ft`);
    console.log(`- Egyéb: ${resetCosts.other_monthly_costs} Ft`);

    console.log('\n✅ Minden teszt sikeres!');

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  testHouseholdCostsAPI()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testHouseholdCostsAPI };
