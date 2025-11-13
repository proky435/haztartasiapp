/**
 * Debug Water Calculation - Hibakeresés a víz számításnál
 */

const { Client } = require('pg');
require('dotenv').config();

async function debugWaterCalculation() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'haztartasi_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔍 Víz számítás hibakeresés');
    console.log('============================\n');

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';
    const utilityTypeId = '6f833edf-27d3-4ec5-80b3-04acd414897f'; // Hideg víz

    await client.connect();

    // 1. Közműtípus információ
    console.log('1. Közműtípus információ:');
    const utilityInfo = await client.query(`
      SELECT 
        ut.id,
        ut.name,
        ut.display_name,
        ut.unit,
        hus.base_fee,
        hus.current_unit_price,
        hus.auto_calculate_cost,
        hus.is_enabled
      FROM utility_types ut
      LEFT JOIN household_utility_settings hus ON ut.id = hus.utility_type_id AND hus.household_id = $1
      WHERE ut.id = $2
    `, [householdId, utilityTypeId]);

    console.log(JSON.stringify(utilityInfo.rows[0], null, 2));

    // 2. Árazási sávok
    console.log('\n2. Árazási sávok:');
    const pricingTiers = await client.query(`
      SELECT 
        tier_number,
        tier_name,
        price_per_unit,
        limit_value,
        limit_unit
      FROM utility_pricing_tiers
      WHERE utility_type_id = $1 AND household_id = $2 AND is_active = true
      ORDER BY tier_number
    `, [utilityTypeId, householdId]);

    pricingTiers.rows.forEach(tier => {
      console.log(`  ${tier.tier_number}. ${tier.tier_name}: ${tier.price_per_unit} Ft/${tier.limit_unit || 'm³'}`);
    });

    // 3. Manuális számítás
    console.log('\n3. Manuális számítás (2 m³):');
    const consumption = 2;
    const baseFee = utilityInfo.rows[0]?.base_fee || 0;
    
    console.log(`Alapdíj: ${baseFee} Ft`);
    
    let totalCost = 0;
    pricingTiers.rows.forEach(tier => {
      const tierCost = consumption * tier.price_per_unit;
      console.log(`${tier.tier_name}: ${consumption} m³ × ${tier.price_per_unit} Ft = ${tierCost} Ft`);
      totalCost += tierCost;
    });
    
    const finalTotal = totalCost + baseFee;
    console.log(`Fogyasztási költség összesen: ${totalCost} Ft`);
    console.log(`Végösszeg: ${finalTotal} Ft`);

    // 4. Ellenőrizzük, hogy van-e valami furcsa a beállításokban
    console.log('\n4. Háztartás beállítások ellenőrzése:');
    const householdSettings = await client.query(`
      SELECT * FROM household_utility_settings 
      WHERE household_id = $1 AND utility_type_id = $2
    `, [householdId, utilityTypeId]);

    if (householdSettings.rows.length > 0) {
      console.log('Beállítások találva:');
      console.log(JSON.stringify(householdSettings.rows[0], null, 2));
    } else {
      console.log('Nincsenek egyedi beállítások ehhez a közműhöz.');
    }

  } catch (error) {
    console.error('❌ Hiba:', error.message);
  } finally {
    await client.end();
  }
}

// Script futtatása
if (require.main === module) {
  debugWaterCalculation()
    .then(() => {
      console.log('\n✅ Hibakeresés befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { debugWaterCalculation };
