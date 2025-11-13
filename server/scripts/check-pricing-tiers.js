/**
 * Utility Pricing Tiers Checker
 * Ellenőrzi az árazási sávok adatait
 */

const { Client } = require('pg');
require('dotenv').config();

async function checkPricingTiers() {
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
    
    // Egy háztartás árazási sávjainak lekérdezése
    const result = await client.query(`
      SELECT 
        ut.display_name,
        ut.name as utility_name,
        upt.tier_number,
        upt.tier_name,
        upt.price_per_unit,
        upt.limit_value,
        upt.limit_unit,
        upt.conversion_factor,
        upt.conversion_unit,
        upt.system_usage_fee
      FROM utility_pricing_tiers upt
      JOIN utility_types ut ON upt.utility_type_id = ut.id
      WHERE upt.household_id = (SELECT id FROM households LIMIT 1)
        AND upt.is_active = true
      ORDER BY ut.display_name, upt.tier_number
    `);
    
    console.log('\n📊 Árazási sávok egy háztartáshoz:');
    console.log('=====================================\n');
    
    let currentUtility = '';
    result.rows.forEach(row => {
      if (currentUtility !== row.display_name) {
        currentUtility = row.display_name;
        console.log(`🔌 ${row.display_name} (${row.utility_name}):`);
      }
      
      const limit = row.limit_value ? `${row.limit_value} ${row.limit_unit}` : 'Nincs limit';
      const conversion = row.conversion_factor ? ` (konverzió: ${row.conversion_factor} ${row.conversion_unit})` : '';
      const systemFee = row.system_usage_fee ? ` + ${row.system_usage_fee} Ft rendszerhasználati díj` : '';
      
      console.log(`  ${row.tier_number}. ${row.tier_name}: ${row.price_per_unit} Ft/${row.limit_unit || 'egység'}`);
      console.log(`     Limit: ${limit}${conversion}${systemFee}`);
    });
    
    // Összesítő statisztikák
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_tiers,
        COUNT(DISTINCT utility_type_id) as utility_types,
        COUNT(DISTINCT household_id) as households
      FROM utility_pricing_tiers
      WHERE is_active = true
    `);
    
    console.log('\n📈 Összesítő statisztikák:');
    console.log('==========================');
    console.log(`Összes aktív sáv: ${stats.rows[0].total_tiers}`);
    console.log(`Közműtípusok száma: ${stats.rows[0].utility_types}`);
    console.log(`Háztartások száma: ${stats.rows[0].households}`);
    
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
  console.log('🔍 Utility Pricing Tiers Checker');
  console.log('=================================\n');
  
  checkPricingTiers()
    .then(() => {
      console.log('\n✅ Ellenőrzés befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { checkPricingTiers };
