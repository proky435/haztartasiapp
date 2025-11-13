const express = require('express');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Publikus recept megtekintése (nincs auth szükség)
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    // Recept lekérése share_id alapján
    const recipeResult = await query(`
      SELECT 
        r.*,
        u.name as created_by_name,
        u.email as created_by_email,
        h.name as household_name,
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
      LEFT JOIN households h ON r.household_id = h.id
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN recipe_instructions inst ON r.id = inst.recipe_id
      WHERE r.share_id = $1 AND r.is_public = true
      GROUP BY r.id, u.name, u.email, h.name
    `, [shareId]);

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Recept nem található',
        details: 'A recept nem létezik vagy nem publikus'
      });
    }

    const recipe = recipeResult.rows[0];
    
    // Látogatás számláló növelése
    await query(`
      UPDATE recipes 
      SET view_count = COALESCE(view_count, 0) + 1 
      WHERE share_id = $1
    `, [shareId]);

    logger.info(`Public recipe viewed: ${shareId} - ${recipe.title}`);

    res.json({
      success: true,
      data: {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        cookingTime: recipe.cooking_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        imageUrl: recipe.image_url,
        createdBy: recipe.created_by_name,
        householdName: recipe.household_name,
        viewCount: recipe.view_count + 1,
        createdAt: recipe.created_at,
        shareId: recipe.share_id
      }
    });

  } catch (error) {
    logger.error('Public recipe fetch error:', error);
    res.status(500).json({
      error: 'Hiba a recept lekérésekor',
      details: error.message
    });
  }
});

// Recept publikusság beállítása (auth szükséges)
router.put('/:recipeId/share', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { isPublic } = req.body;
    
    // Ellenőrizzük, hogy a felhasználó tulajdonosa-e a receptnek
    const ownerCheck = await query(`
      SELECT id, created_by, share_id 
      FROM recipes 
      WHERE id = $1
    `, [recipeId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Recept nem található'
      });
    }

    const recipe = ownerCheck.rows[0];
    
    // Share ID generálása ha még nincs
    let shareId = recipe.share_id;
    if (!shareId) {
      shareId = require('crypto').randomBytes(16).toString('hex');
    }

    // Publikusság frissítése
    await query(`
      UPDATE recipes 
      SET is_public = $1, share_id = $2, updated_at = NOW()
      WHERE id = $3
    `, [isPublic, shareId, recipeId]);

    logger.info(`Recipe sharing updated: ${recipeId} - public: ${isPublic}`);

    res.json({
      success: true,
      data: {
        shareId: isPublic ? shareId : null,
        isPublic: isPublic,
        shareUrl: isPublic ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared-recipe/${shareId}` : null
      }
    });

  } catch (error) {
    logger.error('Recipe sharing error:', error);
    res.status(500).json({
      error: 'Hiba a megosztás beállításakor',
      details: error.message
    });
  }
});

module.exports = router;
