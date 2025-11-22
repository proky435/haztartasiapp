const fs = require('fs');
const path = require('path');
const { query, connectDatabase } = require('./connection');

async function runMigration(migrationFile) {
  try {
    // Inicializáljuk az adatbázis kapcsolatot
    await connectDatabase();
    
    const migrationPath = path.join(__dirname, '../../database/migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Running migration: ${migrationFile}`);
    await query(sql);
    console.log(`✅ Migration completed successfully: ${migrationFile}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node runMigration.js <migration-file>');
  process.exit(1);
}

runMigration(migrationFile);
