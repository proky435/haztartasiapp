/**
 * Fogyasztás számítás trigger migráció futtatása
 */

const fs = require('fs');
const path = require('path');
const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function runConsumptionTriggerMigration() {
  try {
    console.log('🔧 Fogyasztás számítás trigger migráció futtatása');
    console.log('==================================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    // SQL fájl beolvasása
    const sqlPath = path.join(__dirname, '../database/migrations/009_add_consumption_calculation_trigger.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL fájl beolvasva:', sqlPath);
    console.log('📏 SQL tartalom hossza:', sqlContent.length, 'karakter\n');

    // SQL futtatása
    console.log('⚡ Migráció futtatása...');
    await query(sqlContent);

    console.log('✅ Migráció sikeresen lefutott!');
    console.log('\n🎯 Létrehozott elemek:');
    console.log('- calculate_consumption_and_cost() függvény');
    console.log('- trigger_calculate_consumption trigger');
    console.log('- Meglévő mérések újraszámítása');

    // Ellenőrizzük a trigger létezését
    const triggerCheck = await query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_calculate_consumption'
    `);

    if (triggerCheck.rows.length > 0) {
      console.log('\n✅ Trigger ellenőrzése sikeres:');
      triggerCheck.rows.forEach(row => {
        console.log(`- ${row.trigger_name}: ${row.action_timing} ${row.event_manipulation}`);
      });
    }

    // Ellenőrizzük, hogy van-e számított fogyasztás
    const consumptionCheck = await query(`
      SELECT 
        COUNT(*) as total_readings,
        COUNT(consumption) as readings_with_consumption,
        COUNT(cost) as readings_with_cost
      FROM household_utilities
    `);

    if (consumptionCheck.rows.length > 0) {
      const stats = consumptionCheck.rows[0];
      console.log('\n📊 Mérések statisztikája:');
      console.log(`- Összes mérés: ${stats.total_readings}`);
      console.log(`- Fogyasztással: ${stats.readings_with_consumption}`);
      console.log(`- Költséggel: ${stats.readings_with_cost}`);
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
  runConsumptionTriggerMigration()
    .then(() => {
      console.log('\n🎉 Migráció befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { runConsumptionTriggerMigration };
