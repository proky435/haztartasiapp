const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const recipeImportService = require('../services/recipeImportService');
const logger = require('../utils/logger');

const router = express.Router();

// Multer konfiguráció PDF feltöltéshez
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Csak PDF fájlok engedélyezettek'), false);
    }
  }
});

// URL-ből recept importálás
router.post('/url', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL megadása kötelező',
        details: 'Kérlek adj meg egy érvényes URL-t'
      });
    }

    logger.info(`Recipe import from URL requested by user ${req.user.id}: ${url}`);

    // Recept importálás
    const recipe = await recipeImportService.importFromUrl(url);
    
    // Felhasználó és háztartás adatok hozzáadása
    const enrichedRecipe = {
      ...recipe,
      source: 'url',
      sourceUrl: url,
      createdBy: req.user.id,
      householdId: req.user.household_id
    };

    logger.info(`Recipe successfully imported from URL: ${recipe.title}`);

    res.json({
      success: true,
      message: 'Recept sikeresen importálva URL-ből',
      data: enrichedRecipe
    });

  } catch (error) {
    logger.error('URL import error:', error);
    res.status(400).json({
      error: 'Hiba az URL importálásakor',
      details: error.message
    });
  }
});

// PDF-ből recept importálás
router.post('/pdf', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'PDF fájl megadása kötelező',
        details: 'Kérlek tölts fel egy PDF fájlt'
      });
    }

    logger.info(`Recipe import from PDF requested by user ${req.user.id}: ${req.file.originalname}`);

    // Recept importálás
    const recipe = await recipeImportService.importFromPdf(req.file.buffer);
    
    // Felhasználó és háztartás adatok hozzáadása
    const enrichedRecipe = {
      ...recipe,
      source: 'pdf',
      sourceFilename: req.file.originalname,
      createdBy: req.user.id,
      householdId: req.user.household_id
    };

    logger.info(`Recipe successfully imported from PDF: ${recipe.title}`);

    res.json({
      success: true,
      message: 'Recept sikeresen importálva PDF-ből',
      data: enrichedRecipe
    });

  } catch (error) {
    logger.error('PDF import error:', error);
    res.status(400).json({
      error: 'Hiba a PDF importálásakor',
      details: error.message
    });
  }
});

// Importált recept mentése
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      ingredients, 
      instructions, 
      cookingTime, 
      servings, 
      difficulty,
      imageUrl,
      source,
      sourceUrl,
      sourceFilename
    } = req.body;

    if (!title || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        error: 'Hiányzó kötelező adatok',
        details: 'Cím és legalább egy hozzávaló megadása kötelező'
      });
    }

    const householdId = req.user.household_id;
    if (!householdId) {
      return res.status(400).json({
        error: 'Háztartás azonosító hiányzik'
      });
    }

    // Recept mentése az adatbázisba
    const { query } = require('../database/connection');
    
    const recipeResult = await query(`
      INSERT INTO recipes (
        household_id, 
        created_by,
        title, 
        description, 
        cooking_time, 
        servings, 
        difficulty,
        image_url,
        source_type,
        source_url,
        source_filename,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id
    `, [
      householdId, 
      req.user.id, 
      title, 
      description, 
      cookingTime, 
      servings, 
      difficulty,
      imageUrl,
      source || 'import',
      sourceUrl,
      sourceFilename
    ]);

    const recipeId = recipeResult.rows[0].id;

    // Hozzávalók mentése
    if (ingredients && ingredients.length > 0) {
      const filteredIngredients = ingredients.filter(ing => ing && ing.trim());
      
      for (const ingredient of filteredIngredients) {
        await query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient) 
          VALUES ($1, $2)
        `, [recipeId, ingredient.trim()]);
      }
    }

    // Utasítások mentése
    if (instructions && instructions.length > 0) {
      const filteredInstructions = instructions.filter(inst => inst && inst.trim());
      
      for (let i = 0; i < filteredInstructions.length; i++) {
        await query(`
          INSERT INTO recipe_instructions (recipe_id, step_order, instruction) 
          VALUES ($1, $2, $3)
        `, [recipeId, i + 1, filteredInstructions[i].trim()]);
      }
    }

    logger.info(`Imported recipe saved: ${recipeId} - ${title}`);

    res.json({
      success: true,
      message: 'Importált recept sikeresen mentve',
      data: {
        id: recipeId,
        title: title
      }
    });

  } catch (error) {
    logger.error('Save imported recipe error:', error);
    res.status(500).json({
      error: 'Hiba a recept mentésekor',
      details: error.message
    });
  }
});

module.exports = router;
