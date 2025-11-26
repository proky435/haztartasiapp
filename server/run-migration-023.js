const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migráció futtatása: 023_add_created_by_to_households.sql');
    
    const migrationPath = path.join(__dirname, 'database', 'migrations', '023_add_created_by_to_households.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migráció sikeresen lefutott!');
    console.log('');
    console.log('📊 Ellenőrzés:');
    
    // Ellenőrizzük az oszlopot
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'households' AND column_name = 'created_by'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ created_by oszlop létezik:');
      console.log(checkResult.rows[0]);
    }
    
    // Ellenőrizzük a háztartásokat
    const householdsResult = await client.query(`
      SELECT id, name, created_by
      FROM households
      LIMIT 5
    `);
    
    console.log('');
    console.log('📋 Háztartások (első 5):');
    householdsResult.rows.forEach(h => {
      console.log(`  - ${h.name}: created_by = ${h.created_by || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Hiba a migráció futtatása során:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('');
    console.log('🎉 Kész! Most indítsd újra a backend-et.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Hiba:', error);
    process.exit(1);
  });
