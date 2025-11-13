/**
 * Lakbér költségek migráció futtatása
 */

const { connectDatabase, query } = require('../src/database/connection');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runRentCostsMigration() {
  try {
    console.log('🏠 Lakbér költségek migráció indítása');
    console.log('=====================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    // Migráció fájl beolvasása
    const migrationPath = path.join(__dirname, '../database/migrations/011_add_rent_costs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migráció fájl betöltve:', migrationPath);

    // Migráció futtatása
    console.log('🔄 Migráció futtatása...');
    await query(migrationSQL);

    console.log('✅ Lakbér költségek oszlopok sikeresen hozzáadva!');

    // Ellenőrzés
    console.log('\n🔍 Tábla struktúra ellenőrzése...');
    const tableInfo = await query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'household_costs' 
      AND column_name IN ('rent_amount', 'garage_rent', 'insurance_cost')
      ORDER BY ordinal_position;
    `);

    console.log('📊 Új oszlopok:');
    tableInfo.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
    });

    // Teszt rekord ellenőrzése
    console.log('\n🧪 Teszt rekord ellenőrzése...');
    const testRecord = await query(`
      SELECT rent_amount, garage_rent, insurance_cost 
      FROM household_costs 
      WHERE household_id = '6f21276c-07c9-42db-a5ac-606f40173b77'
      LIMIT 1;
    `);

    if (testRecord.rows.length > 0) {
      const record = testRecord.rows[0];
      console.log('✅ Teszt rekord:');
      console.log(`- Lakbér: ${record.rent_amount} Ft`);
      console.log(`- Garázs: ${record.garage_rent} Ft`);
      console.log(`- Biztosítás: ${record.insurance_cost} Ft`);
    }

    console.log('\n🎉 Migráció sikeresen befejezve!');

  } catch (error) {
    console.error('❌ Hiba a migráció során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  runRentCostsMigration()
    .then(() => {
      console.log('\n✨ Lakbér költségek migráció kész!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { runRentCostsMigration };
