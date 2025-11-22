const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { query, connectDatabase } = require('../src/database/connection');

/**
 * Consumption Tracking Migrations Futtatása
 * Futtatja a 3 új migration fájlt sorban
 */

const migrations = [
  '016_add_consumption_tracking.sql',
  '017_create_shopping_history.sql',
  '018_add_tracking_settings.sql'
];

async function runMigrations() {
  try {
    console.log('🚀 Consumption Tracking Migrations Futtatása\n');
    
    // Adatbázis kapcsolat inicializálása
    console.log('🔌 Adatbázis kapcsolat létrehozása...');
    await connectDatabase();
    console.log('✅ Kapcsolat létrehozva\n');
    
    // Minden migration futtatása
    for (const migrationFile of migrations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Migration: ${migrationFile}`);
      console.log('='.repeat(60));
      
      try {
        const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);
        
        // Ellenőrizzük, hogy létezik-e a fájl
        if (!fs.existsSync(migrationPath)) {
          console.error(`❌ Fájl nem található: ${migrationPath}`);
          continue;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // SQL parancsok szétválasztása
        const commands = migrationSQL
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📝 ${commands.length} SQL parancs végrehajtása...\n`);
        
        // Parancsok végrehajtása egyenként
        for (let i = 0; i < commands.length; i++) {
          const command = commands[i];
          if (command.trim()) {
            try {
              // Rövidített parancs megjelenítése
              const preview = command.substring(0, 80).replace(/\n/g, ' ');
              console.log(`⏳ [${i + 1}/${commands.length}] ${preview}...`);
              
              await query(command);
              console.log(`✅ Sikeres\n`);
            } catch (error) {
              // Kezeljük a gyakori hibákat
              if (error.message.includes('already exists')) {
                console.log(`⚠️  Már létezik, kihagyás\n`);
              } else if (error.message.includes('does not exist')) {
                console.log(`⚠️  Nem létezik, kihagyás\n`);
              } else if (error.message.includes('duplicate column')) {
                console.log(`⚠️  Oszlop már létezik, kihagyás\n`);
              } else {
                console.error(`❌ Hiba: ${error.message}\n`);
                // Ne állítsuk le a folyamatot, folytassuk a következő paranccsal
              }
            }
          }
        }
        
        console.log(`✅ ${migrationFile} befejezve!`);
        
      } catch (error) {
        console.error(`❌ Hiba a ${migrationFile} futtatásakor:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Összes Migration Befejezve!');
    console.log('='.repeat(60));
    
    // Ellenőrizzük az új struktúrákat
    console.log('\n📋 Új struktúrák ellenőrzése...\n');
    
    // 1. Ellenőrizzük a household_inventory tábla új oszlopát
    try {
      const inventoryColumns = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'household_inventory' 
          AND column_name = 'last_quantity_change'
      `);
      
      if (inventoryColumns.rows.length > 0) {
        console.log('✅ household_inventory.last_quantity_change létezik');
      } else {
        console.log('⚠️  household_inventory.last_quantity_change NEM létezik');
      }
    } catch (error) {
      console.log('⚠️  Nem sikerült ellenőrizni a household_inventory táblát');
    }
    
    // 2. Ellenőrizzük a shopping_list_item_history táblát
    try {
      const historyTable = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'shopping_list_item_history'
      `);
      
      if (historyTable.rows.length > 0) {
        console.log('✅ shopping_list_item_history tábla létezik');
        
        // Oszlopok száma
        const columns = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns 
          WHERE table_name = 'shopping_list_item_history'
        `);
        console.log(`   - Oszlopok száma: ${columns.rows[0].count}`);
      } else {
        console.log('⚠️  shopping_list_item_history tábla NEM létezik');
      }
    } catch (error) {
      console.log('⚠️  Nem sikerült ellenőrizni a shopping_list_item_history táblát');
    }
    
    // 3. Ellenőrizzük a household_settings új oszlopait
    try {
      const settingsColumns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'household_settings' 
          AND column_name IN (
            'consumption_tracking_enabled',
            'shopping_pattern_analysis_enabled',
            'auto_suggestions_enabled'
          )
        ORDER BY column_name
      `);
      
      if (settingsColumns.rows.length > 0) {
        console.log('✅ household_settings tracking oszlopok:');
        settingsColumns.rows.forEach(row => {
          console.log(`   - ${row.column_name}`);
        });
      } else {
        console.log('⚠️  household_settings tracking oszlopok NEM léteznek');
      }
    } catch (error) {
      console.log('⚠️  Nem sikerült ellenőrizni a household_settings táblát');
    }
    
    // 4. Ellenőrizzük a user_settings új oszlopát
    try {
      const userSettingsColumns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
          AND column_name = 'consumption_notifications'
      `);
      
      if (userSettingsColumns.rows.length > 0) {
        console.log('✅ user_settings.consumption_notifications létezik');
      } else {
        console.log('⚠️  user_settings.consumption_notifications NEM létezik');
      }
    } catch (error) {
      console.log('⚠️  Nem sikerült ellenőrizni a user_settings táblát');
    }
    
    console.log('\n✨ Migration ellenőrzés kész!\n');
    
  } catch (error) {
    console.error('\n💥 Kritikus hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Futtatás
console.log('\n');
runMigrations();
