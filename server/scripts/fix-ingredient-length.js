const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function fixIngredientLength() {
  try {
    await connectDatabase();
    console.log('🔧 Hozzávaló mező méret növelése...');

    // Növeljük a recipe_ingredients.ingredient mező méretét
    await query(`
      ALTER TABLE recipe_ingredients 
      ALTER COLUMN ingredient TYPE TEXT
    `);
    console.log('✅ recipe_ingredients.ingredient mező TEXT típusra változtatva');

    // Növeljük a recipe_instructions.instruction mező méretét is
    await query(`
      ALTER TABLE recipe_instructions 
      ALTER COLUMN instruction TYPE TEXT
    `);
    console.log('✅ recipe_instructions.instruction mező TEXT típusra változtatva');

    console.log('🎉 Adatbázis mezők sikeresen frissítve!');

  } catch (error) {
    console.error('❌ Hiba a mezők frissítésekor:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Script futtatása
if (require.main === module) {
  fixIngredientLength()
    .then(() => {
      console.log('✅ Migráció befejezve');
    })
    .catch((error) => {
      console.error('💥 Migráció sikertelen:', error);
      process.exit(1);
    });
}

module.exports = { fixIngredientLength };
