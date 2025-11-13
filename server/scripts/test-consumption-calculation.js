/**
 * Test Consumption Calculation - Teszteli a fogyasztás számítást
 */

const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function testConsumptionCalculation() {
  try {
    console.log('🧮 Fogyasztás számítás tesztelése');
    console.log('=================================\n');

    // Adatbázis kapcsolat inicializálása
    await connectDatabase();

    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';
    const waterTypeId = '6f833edf-27d3-4ec5-80b3-04acd414897f'; // Hideg víz

    // Jelenlegi mérések lekérdezése
    console.log('📊 Jelenlegi mérések:');
    const currentReadings = await query(`
      SELECT 
        reading_date,
        meter_reading,
        previous_reading,
        consumption,
        unit_price,
        cost
      FROM household_utilities
      WHERE household_id = $1 AND utility_type_id = $2
      ORDER BY reading_date ASC
    `, [householdId, waterTypeId]);

    currentReadings.rows.forEach((reading, index) => {
      console.log(`${index + 1}. ${reading.reading_date}: ${reading.meter_reading} m³`);
      console.log(`   Előző: ${reading.previous_reading || 'nincs'} m³`);
      console.log(`   Fogyasztás: ${reading.consumption || 'nincs'} m³`);
      console.log(`   Egységár: ${reading.unit_price || 'nincs'} Ft`);
      console.log(`   Költség: ${reading.cost || 'nincs'} Ft\n`);
    });

    // Új teszt mérés hozzáadása
    console.log('➕ Új teszt mérés hozzáadása...');
    const newReading = {
      household_id: householdId,
      utility_type_id: waterTypeId,
      reading_date: '2025-11-12',
      meter_reading: 12.000, // 2 m³ növekedés a legutóbbi 10.000-ről
      unit_price: 580.50,
      estimated: false,
      notes: 'Automatikus számítás teszt',
      invoice_number: 'TEST-001',
      added_by_user_id: '11111111-1111-1111-1111-111111111111' // Valós user ID
    };

    const insertResult = await query(`
      INSERT INTO household_utilities (
        household_id,
        utility_type_id,
        reading_date,
        meter_reading,
        unit_price,
        estimated,
        notes,
        invoice_number,
        added_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      newReading.household_id,
      newReading.utility_type_id,
      newReading.reading_date,
      newReading.meter_reading,
      newReading.unit_price,
      newReading.estimated,
      newReading.notes,
      newReading.invoice_number,
      newReading.added_by_user_id
    ]);

    const inserted = insertResult.rows[0];
    console.log('✅ Új mérés beszúrva:');
    console.log(`   ID: ${inserted.id}`);
    console.log(`   Mérőállás: ${inserted.meter_reading} m³`);
    console.log(`   Előző mérés: ${inserted.previous_reading} m³`);
    console.log(`   Fogyasztás: ${inserted.consumption} m³`);
    console.log(`   Egységár: ${inserted.unit_price} Ft`);
    console.log(`   Költség: ${inserted.cost} Ft`);

    // Ellenőrzés
    const expectedConsumption = inserted.meter_reading - inserted.previous_reading;
    const expectedCost = expectedConsumption * inserted.unit_price;

    console.log('\n🔍 Ellenőrzés:');
    console.log(`   Várt fogyasztás: ${expectedConsumption} m³`);
    console.log(`   Tényleges fogyasztás: ${inserted.consumption} m³`);
    console.log(`   Várt költség: ${expectedCost} Ft`);
    console.log(`   Tényleges költség: ${inserted.cost} Ft`);

    if (Math.abs(inserted.consumption - expectedConsumption) < 0.001 && 
        Math.abs(inserted.cost - expectedCost) < 0.01) {
      console.log('✅ Számítás helyes!');
    } else {
      console.log('❌ Számítási hiba!');
    }

    // Teszt mérés törlése
    console.log('\n🗑️ Teszt mérés törlése...');
    await query('DELETE FROM household_utilities WHERE id = $1', [inserted.id]);
    console.log('✅ Teszt mérés törölve.');

  } catch (error) {
    console.error('❌ Hiba a tesztelés során:', error.message);
    throw error;
  }
}

// Script futtatása
if (require.main === module) {
  testConsumptionCalculation()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { testConsumptionCalculation };
