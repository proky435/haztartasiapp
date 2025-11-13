/**
 * Test API Response - Teszteli az API válasz formátumát
 */

const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function testAPIResponse() {
  try {
    console.log('🔍 API válasz formátum tesztelése');
    console.log('==================================\n');

    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';

    // Szimuláljuk a teljes API endpoint válaszát
    console.log('📊 Teljes API endpoint szimuláció...');
    
    // Mérések lekérdezése
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

    // Statisztikák lekérdezése
    const statsResult = await query(`
      SELECT 
        ut.id as utility_type_id,
        ut.name as utility_type,
        ut.display_name,
        ut.unit,
        ut.icon,
        COUNT(hu.id) as reading_count,
        SUM(hu.consumption) as total_consumption,
        SUM(hu.cost) as total_cost,
        AVG(hu.consumption) as avg_consumption
      FROM utility_types ut
      LEFT JOIN household_utilities hu ON ut.id = hu.utility_type_id 
        AND hu.household_id = $1
      WHERE ut.is_active = true
      GROUP BY ut.id, ut.name, ut.display_name, ut.unit, ut.icon, ut.sort_order
      ORDER BY ut.sort_order
    `, [householdId]);

    // Pontos API válasz formátum
    const apiResponse = {
      success: true,
      data: {
        readings: readingsResult.rows,
        statistics: statsResult.rows
      }
    };

    console.log('✅ API válasz struktúra:');
    console.log('success:', apiResponse.success);
    console.log('data.readings.length:', apiResponse.data.readings.length);
    console.log('data.statistics.length:', apiResponse.data.statistics.length);
    console.log('\n📋 Első mérés példa:');
    if (apiResponse.data.readings.length > 0) {
      console.log(JSON.stringify(apiResponse.data.readings[0], null, 2));
    }
    console.log('\n📊 Első statisztika példa:');
    if (apiResponse.data.statistics.length > 0) {
      console.log(JSON.stringify(apiResponse.data.statistics[0], null, 2));
    }

    // Frontend feldolgozás szimuláció
    console.log('\n🎨 Frontend feldolgozás:');
    const readings = apiResponse.data?.readings || [];
    const statistics = apiResponse.data?.statistics || [];
    
    console.log('Frontend readings:', readings.length);
    console.log('Frontend statistics:', statistics.length);

    // Ellenőrizzük az icon mezőket
    console.log('\n🎭 Icon mezők:');
    statistics.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.display_name}: icon = "${stat.icon}"`);
    });

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  testAPIResponse()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testAPIResponse };
