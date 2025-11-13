const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function addSharingToRecipes() {
  try {
    await connectDatabase();
    console.log('🔗 Megosztás mezők hozzáadása a receptek táblához...');

    // Ellenőrizzük, hogy léteznek-e már a mezők
    const columnsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      AND column_name IN ('share_id', 'is_public', 'view_count')
    `);

    const existingColumns = columnsCheck.rows.map(row => row.column_name);

    // share_id mező hozzáadása
    if (!existingColumns.includes('share_id')) {
      await query(`
        ALTER TABLE recipes 
        ADD COLUMN share_id VARCHAR(32) UNIQUE
      `);
      console.log('✅ share_id mező hozzáadva');
    } else {
      console.log('✅ share_id mező már létezik');
    }

    // is_public mező hozzáadása
    if (!existingColumns.includes('is_public')) {
      await query(`
        ALTER TABLE recipes 
        ADD COLUMN is_public BOOLEAN DEFAULT false
      `);
      console.log('✅ is_public mező hozzáadva');
    } else {
      console.log('✅ is_public mező már létezik');
    }

    // view_count mező hozzáadása
    if (!existingColumns.includes('view_count')) {
      await query(`
        ALTER TABLE recipes 
        ADD COLUMN view_count INTEGER DEFAULT 0
      `);
      console.log('✅ view_count mező hozzáadva');
    } else {
      console.log('✅ view_count mező már létezik');
    }

    // Index hozzáadása a share_id-hez
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_recipes_share_id 
        ON recipes(share_id) 
        WHERE share_id IS NOT NULL
      `);
      console.log('✅ share_id index hozzáadva');
    } catch (error) {
      console.log('ℹ️ share_id index már létezik');
    }

    // Index hozzáadása a publikus receptekhez
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_recipes_public 
        ON recipes(is_public) 
        WHERE is_public = true
      `);
      console.log('✅ is_public index hozzáadva');
    } catch (error) {
      console.log('ℹ️ is_public index már létezik');
    }

    console.log('🎉 Receptek tábla sikeresen frissítve megosztás támogatással!');

  } catch (error) {
    console.error('❌ Hiba a tábla frissítésekor:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Script futtatása
if (require.main === module) {
  addSharingToRecipes()
    .then(() => {
      console.log('✅ Migráció befejezve');
    })
    .catch((error) => {
      console.error('💥 Migráció sikertelen:', error);
      process.exit(1);
    });
}

module.exports = { addSharingToRecipes };
