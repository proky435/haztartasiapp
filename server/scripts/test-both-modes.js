/**
 * Test Both Modes - Teszteli mindkét számítási módot
 */

const utilityCostCalculator = require('../src/services/utilityCostCalculator');
const { connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function testBothModes() {
  try {
    console.log('🧮 Mindkét számítási mód tesztelése');
    console.log('==================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';

    // 1. Teszt: Hideg víz (nincs sáv) - egyszerű számítás
    console.log('🔵 1. Teszt: Hideg víz (egyszerű árazás)');
    console.log('==========================================');
    const waterTypeId = '6f833edf-27d3-4ec5-80b3-04acd414897f';
    
    const waterResult = await utilityCostCalculator.calculateUtilityCost(
      householdId,
      waterTypeId,
      2
    );
    
    console.log(`Eredmény: ${waterResult.total_cost} Ft`);
    console.log(`Mód: ${waterResult.calculation.pricing_mode || 'tiered'}`);
    console.log(`Képlet: ${waterResult.calculation.formula_description}\n`);

    // 2. Teszt: Villany (van sáv) - sávos számítás
    console.log('🟡 2. Teszt: Villany (sávos árazás)');
    console.log('===================================');
    const electricityTypeId = '56158252-dd3c-4a42-9dc9-b51e8eef8f51';
    
    const electricityResult = await utilityCostCalculator.calculateUtilityCost(
      householdId,
      electricityTypeId,
      300 // 300 kWh - átlép a második sávba
    );
    
    console.log(`Eredmény: ${electricityResult.total_cost} Ft`);
    console.log(`Mód: ${electricityResult.calculation.pricing_mode || 'tiered'}`);
    console.log(`Sávok száma: ${electricityResult.calculation.breakdown?.length || 0}`);
    
    if (electricityResult.calculation.breakdown) {
      electricityResult.calculation.breakdown.forEach((tier, index) => {
        console.log(`  ${index + 1}. ${tier.tier_name}: ${tier.consumption} kWh × ${tier.price_per_unit} Ft = ${tier.tier_cost} Ft`);
      });
    }

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
  }
}

// Script futtatása
if (require.main === module) {
  testBothModes()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testBothModes };
