const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { query, connectDatabase } = require('../src/database/connection');

async function runUtilitiesMigration() {
  try {
    console.log('🔄 Utilities Migration futtatása...');
    
    // Adatbázis kapcsolat inicializálása
    console.log('🔌 Adatbázis kapcsolat létrehozása...');
    await connectDatabase();
    
    // Migration fájl beolvasása
    const migrationPath = path.join(__dirname, '../database/migrations/007_utilities_clean.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration fájl nem található:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // SQL parancsok szétválasztása
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.match(/^\s*$/));
    
    console.log(`📝 ${commands.length} SQL parancs végrehajtása...`);
    
    // Debug: listázzuk a parancsokat
    console.log('Talált parancsok:');
    commands.forEach((cmd, i) => {
      console.log(`${i + 1}: ${cmd.substring(0, 100)}...`);
    });
    
    // Parancsok végrehajtása egyenként
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          const preview = command.substring(0, 80).replace(/\s+/g, ' ');
          console.log(`⏳ ${i + 1}/${commands.length}: ${preview}...`);
          await query(command);
          console.log(`✅ Sikeres`);
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('már létezik') ||
              error.message.includes('duplicate key')) {
            console.log(`⚠️  Már létezik, kihagyás`);
          } else {
            console.error(`❌ Hiba:`, error.message);
            console.error(`SQL parancs:`, command.substring(0, 200));
          }
        }
      }
    }
    
    console.log('🎉 Utilities Migration befejezve!');
    
    // Új táblák ellenőrzése
    console.log('\n📋 Utilities táblák ellenőrzése...');
    const utilityTables = await query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_name IN ('utility_types', 'household_utilities', 'household_utility_settings')
      ORDER BY table_name
    `);
    
    console.log('Utilities táblák:');
    utilityTables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name} (${row.column_count} oszlop)`);
    });
    
    // Közműtípusok ellenőrzése
    console.log('\n🔌 Közműtípusok ellenőrzése...');
    const types = await query('SELECT name, display_name, unit FROM utility_types ORDER BY sort_order');
    
    if (types.rows.length > 0) {
      console.log('Létrehozott közműtípusok:');
      types.rows.forEach(type => {
        console.log(`  📊 ${type.display_name} (${type.unit})`);
      });
    } else {
      console.log('⚠️  Nincsenek közműtípusok - lehet, hogy az INSERT parancsok nem futottak le');
    }
    
    // Indexek ellenőrzése
    console.log('\n📇 Indexek ellenőrzése...');
    const indexes = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('utility_types', 'household_utilities', 'household_utility_settings')
      ORDER BY indexname
    `);
    
    console.log(`Létrehozott indexek: ${indexes.rows.length} db`);
    indexes.rows.forEach(idx => {
      console.log(`  🔍 ${idx.indexname}`);
    });
    
  } catch (error) {
    console.error('💥 Migration hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Futtatás
runUtilitiesMigration();
