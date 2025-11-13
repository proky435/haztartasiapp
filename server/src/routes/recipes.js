const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/recipes - Saját receptek lekérése
router.get('/', authenticateToken, async (req, res) => {
  try {
    const householdId = req.user.household_id;
    
    if (!householdId) {
      return res.status(400).json({ error: 'Nincs aktív háztartás' });
    }

    const recipes = await db.query(`
      SELECT 
        r.*,
        u.name as created_by_name,
        u.email as created_by_email,
        COALESCE(
          JSON_AGG(
            CASE WHEN ri.ingredient IS NOT NULL 
            THEN ri.ingredient 
            ELSE NULL END
          ) FILTER (WHERE ri.ingredient IS NOT NULL), 
          '[]'::json
        ) as ingredients,
        COALESCE(
          JSON_AGG(
            CASE WHEN inst.instruction IS NOT NULL 
            THEN inst.instruction 
            ELSE NULL END ORDER BY inst.step_order
          ) FILTER (WHERE inst.instruction IS NOT NULL), 
          '[]'::json
        ) as instructions
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN recipe_instructions inst ON r.id = inst.recipe_id
      WHERE r.household_id = $1
      GROUP BY r.id, u.name, u.email
      ORDER BY r.created_at DESC
    `, [householdId]);

    // PostgreSQL már JSON tömböt ad vissza, nincs szükség tisztításra
    const cleanedRecipes = recipes.rows.map(recipe => ({
      ...recipe,
      isCustom: true
    }));

    res.json(cleanedRecipes);
  } catch (error) {
    console.error('Hiba a receptek lekérésekor:', error);
    res.status(500).json({ error: 'Szerver hiba' });
  }
});

// POST /api/recipes - Új recept létrehozása
router.post('/', authenticateToken, async (req, res) => {
  try {
    const householdId = req.user.household_id;
    
    if (!householdId) {
      return res.status(400).json({ error: 'Nincs aktív háztartás' });
    }

    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      servings,
      difficulty
    } = req.body;

    if (!title || !ingredients || ingredients.length === 0) {
      return res.status(400).json({ 
        error: 'A recept címe és legalább egy hozzávaló kötelező' 
      });
    }

    // PostgreSQL tranzakció kezdése
    await db.query('BEGIN');

    try {
      // Recept alapadatok mentése
      const recipeResult = await db.query(`
        INSERT INTO recipes (
          household_id, 
          created_by,
          title, 
          description, 
          cooking_time, 
          servings, 
          difficulty,
          image_url,
          image_filename,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `, [householdId, req.user.id, title, description, cookingTime, servings, difficulty, req.body.imageUrl || null, req.body.imageFilename || null]);

      const recipeId = recipeResult.rows[0].id;

      // Hozzávalók mentése
      if (ingredients && ingredients.length > 0) {
        const filteredIngredients = ingredients.filter(ing => ing && ing.trim());
        
        for (const ingredient of filteredIngredients) {
          await db.query(`
            INSERT INTO recipe_ingredients (recipe_id, ingredient) 
            VALUES ($1, $2)
          `, [recipeId, ingredient.trim()]);
        }
      }

      // Utasítások mentése
      if (instructions && instructions.length > 0) {
        const filteredInstructions = instructions.filter(inst => inst && inst.trim());
        
        for (let i = 0; i < filteredInstructions.length; i++) {
          await db.query(`
            INSERT INTO recipe_instructions (recipe_id, instruction, step_order) 
            VALUES ($1, $2, $3)
          `, [recipeId, filteredInstructions[i].trim(), i + 1]);
        }
      }

      // Tranzakció véglegesítése
      await db.query('COMMIT');

      // Teljes recept visszaadása
      const newRecipe = await db.query(`
        SELECT 
          r.*,
          u.name as created_by_name,
          u.email as created_by_email,
          COALESCE(
            JSON_AGG(
              CASE WHEN ri.ingredient IS NOT NULL 
              THEN ri.ingredient 
              ELSE NULL END
            ) FILTER (WHERE ri.ingredient IS NOT NULL), 
            '[]'::json
          ) as ingredients,
          COALESCE(
            JSON_AGG(
              CASE WHEN inst.instruction IS NOT NULL 
              THEN inst.instruction 
              ELSE NULL END ORDER BY inst.step_order
            ) FILTER (WHERE inst.instruction IS NOT NULL), 
            '[]'::json
          ) as instructions
        FROM recipes r
        LEFT JOIN users u ON r.created_by = u.id
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN recipe_instructions inst ON r.id = inst.recipe_id
        WHERE r.id = $1
        GROUP BY r.id, u.name, u.email
      `, [recipeId]);

      const recipe = {
        ...newRecipe.rows[0],
        isCustom: true
      };

      res.status(201).json(recipe);
    } catch (error) {
      // Tranzakció visszavonása
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Hiba a recept létrehozásakor:', error);
    res.status(500).json({ error: 'Szerver hiba' });
  }
});

// DELETE /api/recipes/:id - Recept törlése
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const householdId = req.user.household_id;
    const recipeId = req.params.id;
    
    if (!householdId) {
      return res.status(400).json({ error: 'Nincs aktív háztartás' });
    }

    // Ellenőrizzük, hogy a recept a felhasználó háztartásához tartozik-e és jogosult-e törölni
    const recipe = await db.query(`
      SELECT id, created_by FROM recipes 
      WHERE id = $1 AND household_id = $2
    `, [recipeId, householdId]);

    if (recipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recept nem található' });
    }

    // Ellenőrizzük, hogy a felhasználó jogosult-e törölni (csak a létrehozó törölheti)
    if (recipe.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a receptet' });
    }

    // PostgreSQL tranzakció kezdése
    await db.query('BEGIN');

    try {
      // Hozzávalók törlése
      await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
      
      // Utasítások törlése
      await db.query('DELETE FROM recipe_instructions WHERE recipe_id = $1', [recipeId]);
      
      // Recept törlése
      await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);

      // Tranzakció véglegesítése
      await db.query('COMMIT');
      res.json({ message: 'Recept sikeresen törölve' });
    } catch (error) {
      // Tranzakció visszavonása
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Hiba a recept törlésekor:', error);
    res.status(500).json({ error: 'Szerver hiba' });
  }
});

module.exports = router;
