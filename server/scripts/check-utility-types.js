/**
 * Utility Types Checker
 * Ellenőrzi a közműtípusokat
 */

const { Client } = require('pg');
require('dotenv').config();

async function checkUtilityTypes() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'haztartasi_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔌 Csatlakozás az adatbázishoz...');
    await client.connect();
    
    // Közműtípusok lekérdezése
    const result = await client.query(`
      SELECT 
        id,
        name,
        display_name,
        unit,
        icon,
        color,
        sort_order,
        is_active
      FROM utility_types
      ORDER BY sort_order
    `);
    
    console.log('\n📊 Közműtípusok:');
    console.log('================\n');
    
    result.rows.forEach(row => {
      const status = row.is_active ? '✅ Aktív' : '❌ Inaktív';
      console.log(`${row.icon} ${row.display_name} (${row.name})`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Egység: ${row.unit}`);
      console.log(`   Státusz: ${status}`);
      console.log(`   Sorrend: ${row.sort_order}`);
      console.log('');
    });
    
    // Ellenőrizzük, hogy van-e víz típus
    const waterCheck = await client.query(`
      SELECT * FROM utility_types WHERE name = 'water'
    `);
    
    if (waterCheck.rows.length === 0) {
      console.log('⚠️  FIGYELEM: Nincs "water" nevű közműtípus!');
      console.log('   Ez okozhatja a víz árazási sávok hiányát.');
    }
    
  } catch (error) {
    console.error('❌ Hiba:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Adatbázis kapcsolat lezárva');
  }
}

// Script futtatása
if (require.main === module) {
  console.log('🔍 Utility Types Checker');
  console.log('========================\n');
  
  checkUtilityTypes()
    .then(() => {
      console.log('\n✅ Ellenőrzés befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { checkUtilityTypes };
