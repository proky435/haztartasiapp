const fs = require('fs');
const path = require('path');
const { query } = require('./connection');
const logger = require('../utils/logger');

/**
 * Database Migration Runner
 * Futtatja az SQL migrációs fájlokat
 */

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Ellenőrizzük, hogy létezik-e a migrations mappa
    if (!fs.existsSync(migrationsDir)) {
      logger.error('Migrations directory not found:', migrationsDir);
      process.exit(1);
    }
    
    // Olvassuk be az összes .sql fájlt
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // ABC sorrendben
    
    logger.info(`Found ${files.length} migration files`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Futtatjuk egyenként a migrációkat
    for (const file of files) {
      try {
        logger.info(`Running migration: ${file}`);
        
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Futtatjuk az SQL-t
        await query(sql);
        
        logger.info(`✅ Migration completed: ${file}`);
        successCount++;
        
      } catch (error) {
        logger.error(`❌ Migration failed: ${file}`, error.message);
        errorCount++;
        
        // Ha kritikus hiba, állítsuk le a folyamatot
        if (error.message.includes('syntax error') || error.message.includes('does not exist')) {
          logger.error('Critical error detected, stopping migrations');
          break;
        }
      }
    }
    
    logger.info('\n=================================');
    logger.info('Migration Summary:');
    logger.info(`✅ Successful: ${successCount}`);
    logger.info(`❌ Failed: ${errorCount}`);
    logger.info('=================================\n');
    
    if (errorCount === 0) {
      logger.info('🎉 All migrations completed successfully!');
      process.exit(0);
    } else {
      logger.warn('⚠️ Some migrations failed. Please check the logs.');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Fatal error during migrations:', error);
    process.exit(1);
  }
}

// Futtatás, ha közvetlenül hívják
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
