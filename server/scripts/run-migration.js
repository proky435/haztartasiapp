const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { query, connectDatabase } = require('../src/database/connection');

async function runMigration() {
  try {
    console.log('🔄 Migration futtatása...');
    
    // Adatbázis kapcsolat inicializálása
    console.log('🔌 Adatbázis kapcsolat létrehozása...');
    await connectDatabase();
    
    // Migration fájl beolvasása
    const migrationPath = path.join(__dirname, '../database/migrations/004_create_products_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // SQL parancsok szétválasztása
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📝 ${commands.length} SQL parancs végrehajtása...`);
    
    // Parancsok végrehajtása egyenként
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`⏳ ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`);
          await query(command);
          console.log(`✅ Sikeres`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Már létezik, kihagyás`);
          } else {
            console.error(`❌ Hiba:`, error.message);
          }
        }
      }
    }
    
    console.log('🎉 Migration befejezve!');
    
    // Táblák ellenőrzése
    console.log('\n📋 Táblák ellenőrzése...');
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Létező táblák:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('💥 Migration hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Futtatás
runMigration();
