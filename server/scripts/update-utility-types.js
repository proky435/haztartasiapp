const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function updateUtilityTypes() {
  try {
    console.log('🔄 Közműtípusok frissítése...');
    
    await connectDatabase();
    
    // Meleg víz módosítása m³-ről kWh-ra
    await query(`
      UPDATE utility_types 
      SET unit = 'kWh', display_name = 'Meleg víz (elektromos)' 
      WHERE name = 'water_hot'
    `);
    
    console.log('✅ Meleg víz frissítve: kWh mértékegységre');
    
    // Távfűtés magyarázat frissítése
    await query(`
      UPDATE utility_types 
      SET display_name = 'Távfűtés (GJ = Gigajoule)' 
      WHERE name = 'heating'
    `);
    
    console.log('✅ Távfűtés frissítve: magyarázattal');
    
    // Ellenőrzés
    const result = await query('SELECT name, display_name, unit FROM utility_types ORDER BY sort_order');
    console.log('\n📊 Frissített közműtípusok:');
    result.rows.forEach(type => {
      console.log(`  ${type.display_name}: ${type.unit}`);
    });
    
    console.log('\n🎉 Közműtípusok sikeresen frissítve!');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

updateUtilityTypes();
