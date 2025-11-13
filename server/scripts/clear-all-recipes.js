const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function clearAllRecipes() {
  try {
    // Adatbázis kapcsolat inicializálása
    await connectDatabase();
    console.log('🗑️ Összes saját recept törlése...');

    // Először lekérjük, hány recept van
    const recipeCount = await query(`SELECT COUNT(*) as count FROM recipes`);
    const ingredientCount = await query(`SELECT COUNT(*) as count FROM recipe_ingredients`);
    const instructionCount = await query(`SELECT COUNT(*) as count FROM recipe_instructions`);

    console.log(`📊 Jelenlegi állapot:`);
    console.log(`   - Receptek: ${recipeCount.rows[0].count}`);
    console.log(`   - Hozzávalók: ${ingredientCount.rows[0].count}`);
    console.log(`   - Utasítások: ${instructionCount.rows[0].count}`);

    if (recipeCount.rows[0].count === '0') {
      console.log('✅ Nincs törlendő recept az adatbázisban');
      return;
    }

    // Megerősítés kérése
    console.log('\n⚠️  FIGYELEM: Ez törölni fogja az ÖSSZES saját receptet!');
    console.log('🔄 Törlés megkezdése 3 másodperc múlva...');
    
    // 3 másodperc várakozás
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Tranzakció kezdése
    await query('BEGIN');

    try {
      // 1. Recept utasítások törlése
      const deletedInstructions = await query(`DELETE FROM recipe_instructions`);
      console.log(`✅ ${deletedInstructions.rowCount} utasítás törölve`);

      // 2. Recept hozzávalók törlése
      const deletedIngredients = await query(`DELETE FROM recipe_ingredients`);
      console.log(`✅ ${deletedIngredients.rowCount} hozzávaló törölve`);

      // 3. Receptek törlése
      const deletedRecipes = await query(`DELETE FROM recipes`);
      console.log(`✅ ${deletedRecipes.rowCount} recept törölve`);

      // Tranzakció véglegesítése
      await query('COMMIT');

      console.log('\n🎉 Összes saját recept sikeresen törölve!');
      
      // Ellenőrzés
      const finalCount = await query(`SELECT COUNT(*) as count FROM recipes`);
      console.log(`📊 Végső állapot: ${finalCount.rows[0].count} recept maradt`);

    } catch (error) {
      // Tranzakció visszavonása hiba esetén
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Hiba a receptek törlésekor:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Interaktív megerősítés funkció
async function confirmDeletion() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Biztosan törölni szeretnéd az ÖSSZES saját receptet? (igen/nem): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'igen' || answer.toLowerCase() === 'i' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Script futtatása
if (require.main === module) {
  (async () => {
    try {
      console.log('🍳 Receptek törlése script');
      console.log('================================');
      
      const confirmed = await confirmDeletion();
      
      if (!confirmed) {
        console.log('❌ Törlés megszakítva a felhasználó által');
        process.exit(0);
      }

      await clearAllRecipes();
      console.log('✅ Script befejezve');
      
    } catch (error) {
      console.error('💥 Script sikertelen:', error);
      process.exit(1);
    }
  })();
}

module.exports = { clearAllRecipes };
