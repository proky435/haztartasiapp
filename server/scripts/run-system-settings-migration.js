const fs = require('fs');
const path = require('path');
const { connectDatabase, query, closeDatabase } = require('../src/database/connection');

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    console.log('Running system_settings migration...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/020_create_system_settings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    
    console.log('✅ Migration completed successfully!');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

runMigration();
