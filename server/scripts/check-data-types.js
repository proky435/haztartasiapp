/**
 * Check Data Types - Ellenőrzi az adatok típusait
 */

const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function checkDataTypes() {
  try {
    console.log('🔍 Adatok típusainak ellenőrzése');
    console.log('=================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';

    // Mérések lekérdezése
    console.log('📊 Mérések adatainak típusai:');
    const readings = await query(`
      SELECT 
        id,
        reading_date,
        meter_reading,
        previous_reading,
        consumption,
        unit_price,
        cost,
        pg_typeof(meter_reading) as meter_reading_type,
        pg_typeof(previous_reading) as previous_reading_type,
        pg_typeof(consumption) as consumption_type,
        pg_typeof(unit_price) as unit_price_type,
        pg_typeof(cost) as cost_type
      FROM household_utilities
      WHERE household_id = $1
      ORDER BY reading_date DESC
      LIMIT 3
    `, [householdId]);

    readings.rows.forEach((reading, index) => {
      console.log(`\n${index + 1}. Mérés (${reading.reading_date}):`);
      console.log(`   meter_reading: ${reading.meter_reading} (${reading.meter_reading_type})`);
      console.log(`   previous_reading: ${reading.previous_reading} (${reading.previous_reading_type})`);
      console.log(`   consumption: ${reading.consumption} (${reading.consumption_type})`);
      console.log(`   unit_price: ${reading.unit_price} (${reading.unit_price_type})`);
      console.log(`   cost: ${reading.cost} (${reading.cost_type})`);
      
      // JavaScript típusok ellenőrzése
      console.log(`   JS typeof consumption: ${typeof reading.consumption}`);
      console.log(`   JS typeof cost: ${typeof reading.cost}`);
    });

    // Statisztikák lekérdezése
    console.log('\n📈 Statisztikák adatainak típusai:');
    const stats = await query(`
      SELECT 
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        COUNT(hu.id) as reading_count,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_consumption,
        pg_typeof(SUM(hu.consumption)) as total_consumption_type,
        pg_typeof(SUM(hu.cost)) as total_cost_type,
        pg_typeof(AVG(hu.consumption)) as avg_consumption_type
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.sort_order
      ORDER BY ut.sort_order
      LIMIT 3
    `, [householdId]);

    stats.rows.forEach((stat, index) => {
      console.log(`\n${index + 1}. Statisztika (${stat.utility_type}):`);
      console.log(`   total_consumption: ${stat.total_consumption} (${stat.total_consumption_type})`);
      console.log(`   total_cost: ${stat.total_cost} (${stat.total_cost_type})`);
      console.log(`   avg_consumption: ${stat.avg_consumption} (${stat.avg_consumption_type})`);
      
      // JavaScript típusok ellenőrzése
      console.log(`   JS typeof total_consumption: ${typeof stat.total_consumption}`);
      console.log(`   JS typeof total_cost: ${typeof stat.total_cost}`);
      console.log(`   JS typeof avg_consumption: ${typeof stat.avg_consumption}`);
    });

  } catch (error) {
    console.error('❌ Hiba az ellenőrzés során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  checkDataTypes()
    .then(() => {
      console.log('\n🎉 Ellenőrzés befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { checkDataTypes };
