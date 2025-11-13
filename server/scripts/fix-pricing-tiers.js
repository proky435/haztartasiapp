/**
 * Fix Pricing Tiers - Javítja a hiányzó árazási sávokat
 */

const { Client } = require('pg');
require('dotenv').config();

async function fixPricingTiers() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'haztartasi_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔌 Csatlakozás az adatbázishoz...');
    await client.connect();
    
    console.log('🔧 Hiányzó árazási sávok hozzáadása...');
    
    // Hideg víz sávok
    console.log('💧 Hideg víz sávok hozzáadása...');
    await client.query(`
      INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit)
      SELECT 
        ut.id,
        h.id,
        1,
        'Vízfogyasztás',
        NULL,
        'm3',
        350.0
      FROM utility_types ut
      CROSS JOIN households h
      WHERE ut.name = 'water_cold'
      ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING
    `);

    await client.query(`
      INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit)
      SELECT 
        ut.id,
        h.id,
        2,
        'Csatornahasználat',
        NULL,
        'm3',
        280.0
      FROM utility_types ut
      CROSS JOIN households h
      WHERE ut.name = 'water_cold'
      ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING
    `);

    // Meleg víz (elektromos) sávok
    console.log('🔥 Meleg víz (elektromos) sávok hozzáadása...');
    await client.query(`
      INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit, system_usage_fee)
      SELECT 
        ut.id,
        h.id,
        1,
        'Rezsicsökkentett',
        210.25,
        'kWh',
        36.0,
        8.5
      FROM utility_types ut
      CROSS JOIN households h
      WHERE ut.name = 'water_hot'
      ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING
    `);

    await client.query(`
      INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit, system_usage_fee)
      SELECT 
        ut.id,
        h.id,
        2,
        'Piaci ár',
        NULL,
        'kWh',
        70.0,
        8.5
      FROM utility_types ut
      CROSS JOIN households h
      WHERE ut.name = 'water_hot'
      ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING
    `);

    // Ellenőrizzük az eredményt
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_tiers,
        COUNT(DISTINCT utility_type_id) as utility_types,
        COUNT(DISTINCT household_id) as households
      FROM utility_pricing_tiers
      WHERE is_active = true
    `);

    console.log('\n📈 Frissített statisztikák:');
    console.log('============================');
    console.log(`Összes aktív sáv: ${result.rows[0].total_tiers}`);
    console.log(`Közműtípusok száma: ${result.rows[0].utility_types}`);
    console.log(`Háztartások száma: ${result.rows[0].households}`);

    // Mutassunk példa sávokat minden típushoz
    const sampleData = await client.query(`
      SELECT 
        ut.display_name,
        ut.name,
        upt.tier_number,
        upt.tier_name,
        upt.price_per_unit,
        upt.limit_value,
        upt.limit_unit
      FROM utility_pricing_tiers upt
      JOIN utility_types ut ON upt.utility_type_id = ut.id
      WHERE upt.household_id = (SELECT id FROM households LIMIT 1)
      ORDER BY ut.sort_order, upt.tier_number
    `);

    console.log('\n📋 Árazási sávok (egy háztartáshoz):');
    sampleData.rows.forEach(row => {
      const limit = row.limit_value ? `${row.limit_value} ${row.limit_unit}` : 'Nincs limit';
      console.log(`  ${row.display_name} (${row.name}) - ${row.tier_name}: ${row.price_per_unit} Ft (limit: ${limit})`);
    });

    console.log('\n✅ Árazási sávok sikeresen javítva!');
    
  } catch (error) {
    console.error('❌ Hiba:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Adatbázis kapcsolat lezárva');
  }
}

// Script futtatása
if (require.main === module) {
  console.log('🔧 Pricing Tiers Fixer');
  console.log('=======================\n');
  
  fixPricingTiers()
    .then(() => {
      console.log('\n🎉 Javítás befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { fixPricingTiers };
