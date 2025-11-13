/**
 * Test API Call - Teszteli a teljes API hívást
 */

const utilityCostCalculator = require('../src/services/utilityCostCalculator');
const { connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function testApiCall() {
  try {
    console.log('🌐 API hívás tesztelése');
    console.log('=======================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';
    const utilityTypeId = '6f833edf-27d3-4ec5-80b3-04acd414897f'; // Hideg víz
    const consumption = 2;

    console.log(`Háztartás ID: ${householdId}`);
    console.log(`Közműtípus ID: ${utilityTypeId}`);
    console.log(`Fogyasztás: ${consumption} m³\n`);

    // Költségszámítás tesztelése
    const result = await utilityCostCalculator.calculateUtilityCost(
      householdId,
      utilityTypeId,
      consumption
    );

    console.log('✅ API válasz:');
    console.log('==============');
    console.log(JSON.stringify(result, null, 2));

    // Ellenőrizzük a konkrét értékeket
    console.log('\n🔍 Értékek ellenőrzése:');
    console.log('=======================');
    console.log(`total_cost: ${result.total_cost} (típus: ${typeof result.total_cost})`);
    console.log(`calculation.total_cost: ${result.calculation.total_cost} (típus: ${typeof result.calculation.total_cost})`);
    console.log(`calculation.base_fee: ${result.calculation.base_fee} (típus: ${typeof result.calculation.base_fee})`);
    console.log(`calculation.consumption_cost: ${result.calculation.consumption_cost} (típus: ${typeof result.calculation.consumption_cost})`);

    // Ellenőrizzük a breakdown-t
    if (result.calculation.breakdown) {
      console.log('\n📋 Breakdown ellenőrzése:');
      result.calculation.breakdown.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.tier_name}: ${item.tier_cost} Ft (${item.consumption} × ${item.price_per_unit})`);
      });
    }

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Script futtatása
if (require.main === module) {
  testApiCall()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testApiCall };
