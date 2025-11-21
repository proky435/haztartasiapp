/**
 * Product Expiry Patterns Migration Runner
 * Futtatja a 012_create_product_expiry_patterns.sql migrációt
 */

const fs = require('fs');
const path = require('path');
const { connectDatabase, query, closeDatabase } = require('../src/database/connection');
require('dotenv').config();

async function runExpiryPatternsMigration() {
  try {
    console.log('🧠 Lejárati Minták Tanulás Migráció');
    console.log('====================================\n');

    // Adatbázis kapcsolat
    console.log('🔌 Adatbázis kapcsolat létrehozása...');
    await connectDatabase();

    // SQL fájl beolvasása
    const sqlPath = path.join(__dirname, '../database/migrations/012_create_product_expiry_patterns.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migráció fájl nem található: ${sqlPath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL fájl beolvasva:', sqlPath);
    console.log('📏 SQL méret:', sqlContent.length, 'karakter\n');

    // Migráció futtatása
    console.log('🚀 Migráció futtatása...');
    await query(sqlContent);

    console.log('✅ product_expiry_patterns tábla sikeresen létrehozva!');

    // Tábla ellenőrzése
    console.log('\n📋 Tábla struktúra ellenőrzése...');
    const tableInfo = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'product_expiry_patterns'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Oszlopok:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Indexek ellenőrzése
    const indexInfo = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'product_expiry_patterns'
    `);

    console.log('\n🔍 Indexek:');
    indexInfo.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Constraint-ek ellenőrzése
    const constraintInfo = await query(`
      SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'product_expiry_patterns'
    `);

    console.log('\n🔒 Constraint-ek:');
    constraintInfo.rows.forEach(con => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'c': 'CHECK',
        'u': 'UNIQUE'
      }[con.constraint_type] || con.constraint_type;
      console.log(`  - ${con.constraint_name} (${type})`);
    });

    // Kapcsolat lezárása
    await closeDatabase();

    console.log('\n✨ Migráció sikeresen befejezve!');
    console.log('\n📝 Következő lépések:');
    console.log('  1. Backend újraindítása (ha fut)');
    console.log('  2. Frontend tesztelése - adj hozzá terméket lejárati dátummal');
    console.log('  3. 3. hozzáadás után megjelenik a javaslat! 🎉');

  } catch (error) {
    console.error('\n❌ Migráció hiba:', error.message);
    console.error('\n📋 Részletek:', error);
    process.exit(1);
  }
}

// Script futtatása
if (require.main === module) {
  runExpiryPatternsMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Kritikus hiba:', error);
      process.exit(1);
    });
}

module.exports = { runExpiryPatternsMigration };
