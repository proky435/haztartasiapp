const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function addImageToRecipes() {
  try {
    await connectDatabase();
    console.log('🖼️ Kép mező hozzáadása a receptek táblához...');

    // Ellenőrizzük, hogy létezik-e már az image_url mező
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' AND column_name = 'image_url'
    `);

    if (columnExists.rows.length > 0) {
      console.log('✅ Az image_url mező már létezik a recipes táblában');
      return;
    }

    // Hozzáadjuk az image_url mezőt
    await query(`
      ALTER TABLE recipes 
      ADD COLUMN image_url VARCHAR(500)
    `);

    console.log('✅ image_url mező hozzáadva');

    // Hozzáadjuk az image_filename mezőt is (eredeti fájlnév tárolásához)
    await query(`
      ALTER TABLE recipes 
      ADD COLUMN image_filename VARCHAR(255)
    `);

    console.log('✅ image_filename mező hozzáadva');

    console.log('🎉 Receptek tábla sikeresen frissítve képek támogatásával!');

  } catch (error) {
    console.error('❌ Hiba a tábla frissítésekor:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Script futtatása
if (require.main === module) {
  addImageToRecipes()
    .then(() => {
      console.log('✅ Migráció befejezve');
    })
    .catch((error) => {
      console.error('💥 Migráció sikertelen:', error);
      process.exit(1);
    });
}

module.exports = { addImageToRecipes };
