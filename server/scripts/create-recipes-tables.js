const { connectDatabase } = require('../src/database/connection');
const db = require('../src/database/connection');

async function createRecipesTables() {
  try {
    // Adatbázis kapcsolat inicializálása
    await connectDatabase();
    console.log('🍳 Receptek táblák létrehozása...');

    // Receptek fő tábla
    await db.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        household_id UUID NOT NULL,
        created_by UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        cooking_time INTEGER,
        servings INTEGER,
        difficulty VARCHAR(20) DEFAULT 'Könnyű' CHECK (difficulty IN ('Gyors', 'Könnyű', 'Közepes', 'Nehéz')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Index létrehozása
    await db.query(`CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at)`);

    // Recept hozzávalók tábla
    await db.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        ingredient VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    // Index létrehozása
    await db.query(`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)`);

    // Recept utasítások tábla
    await db.query(`
      CREATE TABLE IF NOT EXISTS recipe_instructions (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        instruction TEXT NOT NULL,
        step_order INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    // Index létrehozása
    await db.query(`CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_recipe_instructions_step_order ON recipe_instructions(step_order)`);

    console.log('✅ Receptek táblák sikeresen létrehozva!');
    
    // Tesztelés - táblák ellenőrzése
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('recipes', 'recipe_ingredients', 'recipe_instructions')
    `);
    
    console.log('📋 Létrehozott táblák:', tables.rows.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Hiba a receptek táblák létrehozásakor:', error);
    throw error;
  }
}

// Futtatás, ha közvetlenül hívják
if (require.main === module) {
  createRecipesTables()
    .then(() => {
      console.log('🎉 Receptek adatbázis migráció befejezve!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migráció sikertelen:', error);
      process.exit(1);
    });
}

module.exports = createRecipesTables;
