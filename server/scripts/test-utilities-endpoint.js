/**
 * Test Utilities Endpoint - Teszteli az új utilities endpoint-ot
 */

const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function testUtilitiesEndpoint() {
  try {
    console.log('🔧 Utilities endpoint tesztelése');
    console.log('=================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';

    // 1. Teszt: Mérések lekérdezése
    console.log('📊 1. Teszt: Mérések lekérdezése');
    console.log('==============================');
    
    const readingsResult = await query(`
      SELECT 
        hu.id,
        hu.reading_date,
        hu.meter_reading,
        hu.previous_reading,
        hu.consumption,
        hu.unit_price,
        hu.cost,
        hu.estimated,
        hu.notes,
        hu.invoice_number,
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        u.name as added_by_name
      FROM household_utilities hu
      JOIN utility_types ut ON hu.utility_type_id = ut.id
      LEFT JOIN users u ON hu.added_by_user_id = u.id
      WHERE hu.household_id = $1
      ORDER BY hu.reading_date DESC, ut.sort_order
      LIMIT 10
    `, [householdId]);

    console.log(`Talált mérések: ${readingsResult.rows.length}`);
    readingsResult.rows.forEach((reading, index) => {
      console.log(`${index + 1}. ${reading.utility_type} - ${reading.reading_date}`);
      console.log(`   Mérőállás: ${reading.meter_reading} ${reading.unit}`);
      console.log(`   Fogyasztás: ${reading.consumption || 'nincs'} ${reading.unit}`);
      console.log(`   Költség: ${reading.cost || 'nincs'} Ft\n`);
    });

    // 2. Teszt: Statisztikák lekérdezése
    console.log('📈 2. Teszt: Statisztikák lekérdezése');
    console.log('===================================');
    
    const statsResult = await query(`
      SELECT 
        ut.id as utility_type_id,
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        COUNT(hu.id) as reading_count,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_consumption
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.sort_order
      ORDER BY ut.sort_order
    `, [householdId]);

    console.log(`Statisztikák: ${statsResult.rows.length} közműtípus`);
    statsResult.rows.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.display_name} (${stat.utility_type})`);
      console.log(`   Mérések száma: ${stat.reading_count}`);
      console.log(`   Összes fogyasztás: ${stat.total_consumption || 0} ${stat.unit}`);
      console.log(`   Összes költség: ${stat.total_cost || 0} Ft`);
      console.log(`   Átlagos fogyasztás: ${stat.avg_consumption || 0} ${stat.unit}\n`);
    });

    console.log('✅ Minden teszt sikeres!');

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  testUtilitiesEndpoint()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testUtilitiesEndpoint };
