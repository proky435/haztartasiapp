const { query, connectDatabase } = require('../src/database/connection');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Push Notification Migration futtatása
 */

async function runPushMigration() {
  try {
    console.log('🚀 Push Notification Migration Futtatása\n');
    
    await connectDatabase();
    console.log('✅ Adatbázis kapcsolat OK\n');
    
    // Migration fájl beolvasása
    const migrationPath = path.join(__dirname, '../database/migrations/019_create_push_subscriptions.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration fájl beolvasva: 019_create_push_subscriptions.sql');
    console.log('📊 Migration végrehajtása...\n');
    
    // Egyben futtatjuk az egész migration-t
    try {
      await query(migrationSQL);
      console.log('  ✅ Migration sikeresen végrehajtva');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ℹ️  Táblák már léteznek, folytatás...');
      } else {
        throw error;
      }
    }
    
    console.log('\n🔍 Ellenőrzés...');
    
    // Ellenőrizzük a táblák létezését
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('push_subscriptions', 'notification_logs')
      ORDER BY table_name
    `);
    
    console.log(`\n✅ Létrehozott táblák (${tables.rows.length}):`);
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Push Notification Migration Sikeres!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
}

runPushMigration();
