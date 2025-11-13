/**
 * Debug Detailed Calculation - Részletes számítás hibakeresés
 */

const { Client } = require('pg');
require('dotenv').config();

async function debugDetailedCalculation() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'haztartasi_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔍 Részletes számítás hibakeresés');
    console.log('==================================\n');

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';
    const utilityTypeId = '6f833edf-27d3-4ec5-80b3-04acd414897f'; // Hideg víz
    const consumption = 2;

    await client.connect();

    // Szimuláljuk a calculateWaterCost függvényt
    console.log('🧮 Víz költségszámítás szimulálása:');
    console.log('===================================\n');

    // 1. Árazási sávok lekérdezése
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

    console.log('Árazási sávok:');
    pricingTiers.rows.forEach(tier => {
      console.log(`  ${tier.tier_number}. ${tier.tier_name}: ${tier.price_per_unit} Ft (típus: ${typeof tier.price_per_unit})`);
    });

    // 2. Utility info lekérdezése
    const utilityInfo = await client.query(`
      SELECT 
        ut.name as utility_name,
        ut.display_name,
        ut.unit,
        hus.base_fee
      FROM utility_types ut
      LEFT JOIN household_utility_settings hus ON ut.id = hus.utility_type_id AND hus.household_id = $1
      WHERE ut.id = $2
    `, [householdId, utilityTypeId]);

    const info = utilityInfo.rows[0];
    console.log(`\nUtility info:`);
    console.log(`  base_fee: ${info.base_fee} (típus: ${typeof info.base_fee})`);

    // 3. Manuális számítás lépésről lépésre
    console.log('\n🔢 Lépésről lépésre számítás:');
    console.log('==============================');

    let totalCost = 0;
    const breakdown = [];

    for (const tier of pricingTiers.rows) {
      const pricePerUnit = parseFloat(tier.price_per_unit);
      const tierCost = consumption * pricePerUnit;
      
      console.log(`\n${tier.tier_name}:`);
      console.log(`  price_per_unit: ${tier.price_per_unit} -> parseFloat: ${pricePerUnit}`);
      console.log(`  tierCost: ${consumption} × ${pricePerUnit} = ${tierCost}`);
      
      breakdown.push({
        tier_name: tier.tier_name,
        consumption: consumption,
        price_per_unit: pricePerUnit,
        tier_cost: tierCost
      });

      totalCost += tierCost;
    }

    const baseFee = parseFloat(info.base_fee) || 0;
    const finalTotalCost = totalCost + baseFee;

    console.log(`\n📊 Végeredmény:`);
    console.log(`  totalCost (fogyasztás): ${totalCost}`);
    console.log(`  baseFee: ${info.base_fee} -> parseFloat: ${baseFee}`);
    console.log(`  finalTotalCost: ${totalCost} + ${baseFee} = ${finalTotalCost}`);
    console.log(`  Math.round(finalTotalCost * 100) / 100 = ${Math.round(finalTotalCost * 100) / 100}`);

    // 4. Ellenőrizzük, hogy van-e valami furcsa az adatbázisban
    console.log('\n🔍 Adatbázis ellenőrzés:');
    console.log('========================');

    const rawData = await client.query(`
      SELECT 
        tier_number,
        tier_name,
        price_per_unit,
        pg_typeof(price_per_unit) as price_type,
        limit_value,
        pg_typeof(limit_value) as limit_type
      FROM utility_pricing_tiers
      WHERE utility_type_id = $1 AND household_id = $2 AND is_active = true
      ORDER BY tier_number
    `, [utilityTypeId, householdId]);

    rawData.rows.forEach(row => {
      console.log(`  ${row.tier_name}: ${row.price_per_unit} (${row.price_type})`);
    });

  } catch (error) {
    console.error('❌ Hiba:', error.message);
  } finally {
    await client.end();
  }
}

// Script futtatása
if (require.main === module) {
  debugDetailedCalculation()
    .then(() => {
      console.log('\n✅ Hibakeresés befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { debugDetailedCalculation };
