/**
 * Test Calculator - Teszteli a költségszámítót
 */

const utilityCostCalculator = require('../src/services/utilityCostCalculator');
require('dotenv').config();

async function testCalculator() {
  try {
    console.log('🧮 Költségszámító tesztelése');
    console.log('============================\n');

    // Tesztelendő háztartás és közműtípus ID-k (a képekből)
    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';
    const utilityTypeId = '6f833edf-27d3-4ec5-80b3-04acd414897f'; // Hideg víz

    console.log(`Háztartás ID: ${householdId}`);
    console.log(`Közműtípus ID: ${utilityTypeId}`);
    console.log(`Fogyasztás: 10 m³\n`);

    // Költségszámítás tesztelése
    const result = await utilityCostCalculator.calculateUtilityCost(
      householdId,
      utilityTypeId,
      10
    );

    console.log('✅ Számítás eredménye:');
    console.log('======================');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Script futtatása
if (require.main === module) {
  testCalculator()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testCalculator };
