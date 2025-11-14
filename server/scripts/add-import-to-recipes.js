const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function addImportToRecipes() {
  try {
    await connectDatabase();
    console.log('📥 Import mezők hozzáadása a receptek táblához...');

    // Ellenőrizzük, hogy léteznek-e már a mezők
    const columnsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      AND column_name IN ('source_type', 'source_url', 'source_filename')
    `);

    const existingColumns = columnsCheck.rows.map(row => row.column_name);

    // source_type mező hozzáadása
    if (!existingColumns.includes('source_type')) {
      await query(`
        ALTER TABLE recipes 
        ADD COLUMN source_type VARCHAR(50) DEFAULT 'manual'
      `);
      console.log('✅ source_type mező hozzáadva');
    } else {
      console.log('✅ source_type mező már létezik');
    }

    // source_url mező hozzáadása
    if (!existingColumns.includes('source_url')) {
      await query(`
        ALTER TABLE recipes 
        ADD COLUMN source_url TEXT
      `);
      console.log('✅ source_url mező hozzáadva');
    } else {
      console.log('✅ source_url mező már létezik');
    }

    // source_filename mező hozzáadása
    if (!existingColumns.includes('source_filename')) {
      await query(`
        ALTER TABLE recipes 
        ADD COLUMN source_filename VARCHAR(255)
      `);
      console.log('✅ source_filename mező hozzáadva');
    } else {
      console.log('✅ source_filename mező már létezik');
    }

    // Index hozzáadása a source_type-hoz
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_recipes_source_type 
        ON recipes(source_type)
      `);
      console.log('✅ source_type index hozzáadva');
    } catch (error) {
      console.log('ℹ️ source_type index már létezik');
    }

    console.log('🎉 Receptek tábla sikeresen frissítve import támogatással!');

  } catch (error) {
    console.error('❌ Hiba a tábla frissítésekor:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Script futtatása
if (require.main === module) {
  addImportToRecipes()
    .then(() => {
      console.log('✅ Migráció befejezve');
    })
    .catch((error) => {
      console.error('💥 Migráció sikertelen:', error);
      process.exit(1);
    });
}

module.exports = { addImportToRecipes };
