/**
 * Háztartási közös költségek migráció futtatása
 */

const fs = require('fs');
const path = require('path');
const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function runHouseholdCostsMigration() {
  try {
    console.log('🏠 Háztartási közös költségek migráció futtatása');
    console.log('===============================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    // SQL fájl beolvasása
    const sqlPath = path.join(__dirname, '../database/migrations/010_create_household_costs.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL fájl beolvasva:', sqlPath);
    console.log('📏 SQL tartalom hossza:', sqlContent.length, 'karakter\n');

    // SQL futtatása
    console.log('⚡ Migráció futtatása...');
    await query(sqlContent);

    console.log('✅ Migráció sikeresen lefutott!');
    console.log('\n🎯 Létrehozott elemek:');
    console.log('- household_costs tábla');
    console.log('- update_household_costs_updated_at() trigger függvény');
    console.log('- Alapértelmezett rekordok meglévő háztartásokhoz');

    // Ellenőrizzük a tábla létezését
    const tableCheck = await query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'household_costs'
      ORDER BY ordinal_position
    `);

    if (tableCheck.rows.length > 0) {
      console.log('\n✅ Tábla ellenőrzése sikeres:');
      tableCheck.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // Ellenőrizzük, hogy vannak-e rekordok
    const recordCheck = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN common_utility_cost > 0 THEN 1 END) as with_utility_costs,
        COUNT(CASE WHEN maintenance_cost > 0 THEN 1 END) as with_maintenance_costs,
        COUNT(CASE WHEN other_monthly_costs > 0 THEN 1 END) as with_other_costs
      FROM household_costs
    `);

    if (recordCheck.rows.length > 0) {
      const stats = recordCheck.rows[0];
      console.log('\n📊 Rekordok statisztikája:');
      console.log(`- Összes háztartás: ${stats.total_records}`);
      console.log(`- Közműköltséggel: ${stats.with_utility_costs}`);
      console.log(`- Karbantartási költséggel: ${stats.with_maintenance_costs}`);
      console.log(`- Egyéb költségekkel: ${stats.with_other_costs}`);
    }

  } catch (error) {
    console.error('❌ Hiba a migráció során:', error.message);
    if (error.detail) {
      console.error('Részletek:', error.detail);
    }
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  runHouseholdCostsMigration()
    .then(() => {
      console.log('\n🎉 Migráció befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { runHouseholdCostsMigration };
