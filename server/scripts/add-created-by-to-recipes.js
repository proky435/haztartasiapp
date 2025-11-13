const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function addCreatedByToRecipes() {
  try {
    // Adatbázis kapcsolat inicializálása
    await connectDatabase();
    console.log('🔄 Receptek tábla frissítése - created_by mező hozzáadása...');

    // Ellenőrizzük, hogy létezik-e már a created_by mező
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' AND column_name = 'created_by'
    `);

    if (columnExists.rows.length > 0) {
      console.log('✅ A created_by mező már létezik a recipes táblában');
      return;
    }

    // Hozzáadjuk a created_by mezőt
    await query(`
      ALTER TABLE recipes 
      ADD COLUMN created_by UUID
    `);

    console.log('✅ created_by mező hozzáadva');

    // Frissítjük a meglévő recepteket - beállítjuk az első felhasználót
    const firstUser = await query(`
      SELECT id FROM users ORDER BY created_at LIMIT 1
    `);

    if (firstUser.rows.length > 0) {
      await query(`
        UPDATE recipes 
        SET created_by = $1 
        WHERE created_by IS NULL
      `, [firstUser.rows[0].id]);

      console.log('✅ Meglévő receptek frissítve az első felhasználóval');
    }

    // Most hozzáadjuk a NOT NULL constraint-et
    await query(`
      ALTER TABLE recipes 
      ALTER COLUMN created_by SET NOT NULL
    `);

    console.log('✅ NOT NULL constraint hozzáadva');

    // Hozzáadjuk a foreign key constraint-et
    await query(`
      ALTER TABLE recipes 
      ADD CONSTRAINT fk_recipes_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    `);

    console.log('✅ Foreign key constraint hozzáadva');

    // Hozzáadjuk az indexet
    await query(`
      CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by)
    `);

    console.log('✅ Index létrehozva a created_by mezőhöz');

    console.log('🎉 Receptek tábla sikeresen frissítve!');

  } catch (error) {
    console.error('❌ Hiba a tábla frissítésekor:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Script futtatása
if (require.main === module) {
  addCreatedByToRecipes()
    .then(() => {
      console.log('✅ Migráció befejezve');
    })
    .catch((error) => {
      console.error('💥 Migráció sikertelen:', error);
      process.exit(1);
    });
}

module.exports = { addCreatedByToRecipes };
