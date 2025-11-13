/**
 * Utility Pricing Tiers Migration Runner
 * Futtatja a 008_create_utility_pricing_tiers.sql migrációt
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
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
    
    // Migráció fájl beolvasása
    const migrationPath = path.join(__dirname, '../database/migrations/008_create_utility_pricing_tiers.sql');
    console.log('📄 Migráció fájl beolvasása:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migráció fájl nem található: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Migráció futtatása...');
    
    // Migráció futtatása
    await client.query(migrationSQL);
    
    console.log('✅ Migráció sikeresen lefutott!');
    
    // Ellenőrizzük, hogy létrejött-e a tábla
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'utility_pricing_tiers'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ utility_pricing_tiers tábla sikeresen létrehozva');
      
      // Ellenőrizzük, hogy vannak-e alapértelmezett adatok
      const dataCheck = await client.query('SELECT COUNT(*) as count FROM utility_pricing_tiers');
      const recordCount = parseInt(dataCheck.rows[0].count);
      
      console.log(`📊 Beszúrt rekordok száma: ${recordCount}`);
      
      if (recordCount > 0) {
        // Mutassunk néhány példa rekordot
        const sampleData = await client.query(`
          SELECT 
            ut.display_name,
            upt.tier_number,
            upt.tier_name,
            upt.price_per_unit,
            upt.limit_value,
            upt.limit_unit
          FROM utility_pricing_tiers upt
          JOIN utility_types ut ON upt.utility_type_id = ut.id
          ORDER BY ut.display_name, upt.tier_number
          LIMIT 10
        `);
        
        console.log('\n📋 Példa árazási sávok:');
        sampleData.rows.forEach(row => {
          const limit = row.limit_value ? `${row.limit_value} ${row.limit_unit}` : 'Nincs limit';
          console.log(`  ${row.display_name} - ${row.tier_name}: ${row.price_per_unit} Ft (limit: ${limit})`);
        });
      }
    } else {
      console.log('❌ Hiba: utility_pricing_tiers tábla nem jött létre');
    }
    
  } catch (error) {
    console.error('❌ Hiba a migráció futtatásakor:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  A tábla már létezik, ez normális ha korábban már futtattad a migrációt');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Adatbázis kapcsolat lezárva');
  }
}

// Script futtatása
if (require.main === module) {
  console.log('🏗️  Utility Pricing Tiers Migration Runner');
  console.log('==========================================\n');
  
  runMigration()
    .then(() => {
      console.log('\n🎉 Migráció befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
