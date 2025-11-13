/**
 * Test Utilities API - Teszteli a utilities API endpoint-ot
 */

const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function testUtilitiesAPI() {
  try {
    console.log('🌐 Utilities API endpoint tesztelése');
    console.log('====================================\n');

    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';

    // Szimuláljuk az API hívást
    console.log('📊 API logika tesztelése...');
    
    // Mérések lekérdezése (mint az API endpoint)
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
      LIMIT 100
    `, [householdId]);

    // Statisztikák lekérdezése (mint az API endpoint)
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

    // API válasz formátum
    const apiResponse = {
      success: true,
      data: {
        readings: readingsResult.rows,
        statistics: statsResult.rows
      }
    };

    console.log('✅ API válasz szimuláció:');
    console.log(`📋 Mérések: ${apiResponse.data.readings.length}`);
    console.log(`📊 Statisztikák: ${apiResponse.data.statistics.length}\n`);

    // Részletes mérések
    if (apiResponse.data.readings.length > 0) {
      console.log('🔍 Mérések részletei:');
      apiResponse.data.readings.forEach((reading, index) => {
        console.log(`${index + 1}. ${reading.display_name} - ${reading.reading_date}`);
        console.log(`   ID: ${reading.id}`);
        console.log(`   Mérőállás: ${reading.meter_reading} ${reading.unit}`);
        console.log(`   Fogyasztás: ${reading.consumption || 'nincs'} ${reading.unit}`);
        console.log(`   Költség: ${reading.cost || 'nincs'} Ft\n`);
      });
    } else {
      console.log('⚠️ Nincsenek mérések!');
    }

    // Frontend formátum tesztelése
    console.log('🎨 Frontend formátum:');
    console.log('readingsResponse.data?.readings:', apiResponse.data.readings.length);
    console.log('readingsResponse.data?.statistics:', apiResponse.data.statistics.length);

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  testUtilitiesAPI()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testUtilitiesAPI };
