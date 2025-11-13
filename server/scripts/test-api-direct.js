/**
 * Test API Direct - Teszteli az API endpoint-ot közvetlenül
 */

const axios = require('axios');

async function testAPIDirect() {
  try {
    console.log('🌐 API endpoint közvetlen tesztelése');
    console.log('====================================\n');

    const baseURL = 'http://localhost:3001/api/v1';
    const householdId = '6f21276c-07c9-42db-a5ac-606f40173b77';
    
    // Először be kell jelentkezni, hogy token-t kapjunk
    console.log('🔐 Bejelentkezés...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'test@example.com', // Használj valós email címet
      password: 'password123'    // Használj valós jelszót
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Sikeres bejelentkezés\n');

    // Most teszteljük az új endpoint-ot
    console.log('📊 Utilities endpoint tesztelése...');
    const utilitiesResponse = await axios.get(
      `${baseURL}/utilities/household/${householdId}?date_range=3months`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = utilitiesResponse.data;
    console.log('✅ Sikeres API hívás');
    console.log(`📈 Mérések: ${data.data.readings.length}`);
    console.log(`📊 Statisztikák: ${data.data.statistics.length}`);
    
    // Első néhány mérés megjelenítése
    if (data.data.readings.length > 0) {
      console.log('\n🔍 Első 3 mérés:');
      data.data.readings.slice(0, 3).forEach((reading, index) => {
        console.log(`${index + 1}. ${reading.display_name} - ${reading.reading_date}`);
        console.log(`   Mérőállás: ${reading.meter_reading} ${reading.unit}`);
        console.log(`   Fogyasztás: ${reading.consumption || 'nincs'} ${reading.unit}`);
      });
    }

    console.log('\n✅ API endpoint működik!');

  } catch (error) {
    console.error('❌ Hiba az API tesztelés során:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data?.message || error.response.statusText}`);
    } else {
      console.error(error.message);
    }
  }
}

// Script futtatása
if (require.main === module) {
  testAPIDirect()
    .then(() => {
      console.log('\n🎉 Teszt befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error.message);
      process.exit(1);
    });
}

module.exports = { testAPIDirect };
