const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

class RecipeImportService {
  
  // URL-ből recept importálás
  async importFromUrl(url) {
    try {
      logger.info(`Importing recipe from URL: ${url}`);
      
      // URL validáció
      if (!this.isValidUrl(url)) {
        throw new Error('Érvénytelen URL formátum');
      }

      // Weboldal letöltése
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // JSON-LD structured data keresése (leggyakoribb recept formátum)
      const jsonLdData = this.extractJsonLd($);
      if (jsonLdData) {
        return jsonLdData;
      }

      // Microdata keresése
      const microdataRecipe = this.extractMicrodata($);
      if (microdataRecipe) {
        return microdataRecipe;
      }

      // Általános HTML parsing
      const htmlRecipe = this.extractFromHtml($);
      if (htmlRecipe) {
        return htmlRecipe;
      }

      throw new Error('Nem sikerült recept adatokat találni az oldalon');

    } catch (error) {
      logger.error('URL import error:', error);
      throw new Error(`Hiba az URL importálásakor: ${error.message}`);
    }
  }

  // PDF-ből recept importálás
  async importFromPdf(pdfBuffer) {
    try {
      logger.info('Importing recipe from PDF');
      
      // PDF szöveg kinyerése
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;

      if (!text || text.trim().length === 0) {
        throw new Error('A PDF fájl nem tartalmaz olvasható szöveget');
      }

      // Recept adatok kinyerése a szövegből
      const recipe = this.parseRecipeFromText(text);
      
      return recipe;

    } catch (error) {
      logger.error('PDF import error:', error);
      throw new Error(`Hiba a PDF importálásakor: ${error.message}`);
    }
  }

  // JSON-LD structured data kinyerése
  extractJsonLd($) {
    try {
      const scripts = $('script[type="application/ld+json"]');
      
      for (let i = 0; i < scripts.length; i++) {
        const scriptContent = $(scripts[i]).html();
        if (!scriptContent) continue;

        try {
          const jsonData = JSON.parse(scriptContent);
          const recipes = Array.isArray(jsonData) ? jsonData : [jsonData];
          
          for (const item of recipes) {
            if (item['@type'] === 'Recipe' || (item['@graph'] && item['@graph'].find(g => g['@type'] === 'Recipe'))) {
              const recipe = item['@type'] === 'Recipe' ? item : item['@graph'].find(g => g['@type'] === 'Recipe');
              
              return {
                title: recipe.name || 'Importált recept',
                description: recipe.description || '',
                ingredients: this.extractIngredients(recipe.recipeIngredient || []),
                instructions: this.extractInstructions(recipe.recipeInstructions || []),
                cookingTime: this.extractTime(recipe.cookTime || recipe.totalTime),
                servings: recipe.recipeYield || recipe.yield || null,
                difficulty: 'Közepes',
                imageUrl: this.extractImage(recipe.image)
              };
            }
          }
        } catch (parseError) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('JSON-LD extraction error:', error);
      return null;
    }
  }

  // Microdata kinyerése
  extractMicrodata($) {
    try {
      const recipeElement = $('[itemtype*="Recipe"]').first();
      if (recipeElement.length === 0) return null;

      return {
        title: recipeElement.find('[itemprop="name"]').first().text().trim() || 'Importált recept',
        description: recipeElement.find('[itemprop="description"]').first().text().trim() || '',
        ingredients: recipeElement.find('[itemprop="recipeIngredient"]').map((i, el) => $(el).text().trim()).get(),
        instructions: recipeElement.find('[itemprop="recipeInstructions"]').map((i, el) => $(el).text().trim()).get(),
        cookingTime: this.extractTimeFromText(recipeElement.find('[itemprop="cookTime"], [itemprop="totalTime"]').first().attr('datetime') || ''),
        servings: recipeElement.find('[itemprop="recipeYield"]').first().text().trim() || null,
        difficulty: 'Közepes',
        imageUrl: recipeElement.find('[itemprop="image"]').first().attr('src')
      };
    } catch (error) {
      logger.error('Microdata extraction error:', error);
      return null;
    }
  }

  // Általános HTML parsing
  extractFromHtml($) {
    try {
      // Cím keresése
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   'Importált recept';

      // Hozzávalók keresése
      const ingredients = [];
      $('ul li, ol li').each((i, el) => {
        const text = $(el).text().trim();
        if (this.looksLikeIngredient(text)) {
          ingredients.push(text);
        }
      });

      // Utasítások keresése
      const instructions = [];
      $('ol li, .instructions li, .steps li').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 10) {
          instructions.push(text);
        }
      });

      if (ingredients.length === 0 && instructions.length === 0) {
        return null;
      }

      return {
        title: title,
        description: '',
        ingredients: ingredients,
        instructions: instructions,
        cookingTime: null,
        servings: null,
        difficulty: 'Közepes',
        imageUrl: null
      };
    } catch (error) {
      logger.error('HTML extraction error:', error);
      return null;
    }
  }

  // PDF szövegből recept parsing
  parseRecipeFromText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let title = 'Importált recept';
    let ingredients = [];
    let instructions = [];
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Cím keresése (első nem üres sor)
      if (i === 0 || (i < 3 && line.length < 100)) {
        title = line;
        continue;
      }

      // Szekciók azonosítása
      if (this.isIngredientsSection(line)) {
        currentSection = 'ingredients';
        continue;
      }
      
      if (this.isInstructionsSection(line)) {
        currentSection = 'instructions';
        continue;
      }

      // Tartalom hozzáadása a megfelelő szekcióhoz
      if (currentSection === 'ingredients' && this.looksLikeIngredient(line)) {
        ingredients.push(line);
      } else if (currentSection === 'instructions' && line.length > 10) {
        instructions.push(line);
      } else if (!currentSection && this.looksLikeIngredient(line)) {
        ingredients.push(line);
      }
    }

    return {
      title: title,
      description: '',
      ingredients: ingredients,
      instructions: instructions,
      cookingTime: null,
      servings: null,
      difficulty: 'Közepes',
      imageUrl: null
    };
  }

  // Segéd függvények
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  extractIngredients(ingredients) {
    if (!Array.isArray(ingredients)) return [];
    return ingredients.map(ing => {
      if (typeof ing === 'string') return ing.trim();
      if (ing.text) return ing.text.trim();
      return String(ing).trim();
    }).filter(ing => ing.length > 0);
  }

  extractInstructions(instructions) {
    if (!Array.isArray(instructions)) return [];
    return instructions.map(inst => {
      if (typeof inst === 'string') return inst.trim();
      if (inst.text) return inst.text.trim();
      if (inst.name) return inst.name.trim();
      return String(inst).trim();
    }).filter(inst => inst.length > 0);
  }

  extractTime(timeString) {
    if (!timeString) return null;
    
    // ISO 8601 duration format (PT30M)
    const isoMatch = timeString.match(/PT(\d+H)?(\d+M)?/);
    if (isoMatch) {
      const hours = isoMatch[1] ? parseInt(isoMatch[1]) : 0;
      const minutes = isoMatch[2] ? parseInt(isoMatch[2]) : 0;
      return hours * 60 + minutes;
    }
    
    // Egyszerű szám
    const numberMatch = timeString.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }
    
    return null;
  }

  extractTimeFromText(text) {
    if (!text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  extractImage(image) {
    if (!image) return null;
    if (typeof image === 'string') return image;
    if (Array.isArray(image) && image.length > 0) {
      return typeof image[0] === 'string' ? image[0] : image[0].url;
    }
    if (image.url) return image.url;
    return null;
  }

  looksLikeIngredient(text) {
    if (!text || text.length < 3) return false;
    
    // Gyakori hozzávaló minták
    const ingredientPatterns = [
      /\d+.*?(gramm|g|kg|dkg|ml|dl|l|db|csomag|tasak|evőkanál|teáskanál|csésze)/i,
      /\d+.*?(tojás|hagyma|fokhagyma|paradicsom|krumpli|burgonya)/i,
      /(só|bors|cukor|liszt|olaj|vaj|tej|víz|citrom)/i
    ];
    
    return ingredientPatterns.some(pattern => pattern.test(text));
  }

  isIngredientsSection(text) {
    const patterns = [
      /hozzávalók?/i,
      /ingredients?/i,
      /alapanyagok?/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  isInstructionsSection(text) {
    const patterns = [
      /elkészítés/i,
      /utasítások?/i,
      /instructions?/i,
      /lépések?/i,
      /directions?/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }
}

module.exports = new RecipeImportService();
