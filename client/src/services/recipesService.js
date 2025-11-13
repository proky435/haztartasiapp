import apiService from './api';

class RecipesService {
  constructor() {
    // Spoonacular API kulcs - environment változóból
    this.apiKey = process.env.REACT_APP_SPOONACULAR_API_KEY;
    this.baseURL = 'https://api.spoonacular.com/recipes';
    
    // Debug: API kulcs ellenőrzése
    console.log('Spoonacular API Key loaded:', this.apiKey ? 'Yes' : 'No');
    if (!this.apiKey || this.apiKey === 'demo-key') {
      console.warn('⚠️ Spoonacular API kulcs nincs beállítva! A receptek funkció nem fog működni.');
    }
  }

  // Receptek keresése hozzávalók alapján
  async findRecipesByIngredients(ingredients, options = {}) {
    // API kulcs ellenőrzése
    if (!this.apiKey || this.apiKey === 'demo-key') {
      throw new Error('Spoonacular API kulcs nincs beállítva. Kérlek add meg a .env fájlban!');
    }

    try {
      const ingredientList = Array.isArray(ingredients) ? ingredients.join(',') : ingredients;
      
      const params = {
        ingredients: ingredientList,
        number: options.number || 12,
        ranking: options.ranking || 1, // 1 = maximize used ingredients, 2 = minimize missing ingredients
        ignorePantry: options.ignorePantry || true,
        apiKey: this.apiKey
      };

      const response = await this.makeSpoonacularRequest('/findByIngredients', params);
      return this.formatRecipeResults(response);
    } catch (error) {
      console.error('Find recipes by ingredients error:', error);
      
      // Ha 402 (Payment Required) hibát kapunk, visszaadunk üres listát
      if (error.message.includes('402')) {
        console.warn('Spoonacular API kvóta elfogyott. Üres recept lista visszaadása.');
        return [];
      }
      
      throw error;
    }
  }

  // Recept részletes adatainak lekérése
  async getRecipeDetails(recipeId) {
    try {
      const params = {
        includeNutrition: true,
        apiKey: this.apiKey
      };

      const response = await this.makeSpoonacularRequest(`/${recipeId}/information`, params);
      return this.formatRecipeDetails(response);
    } catch (error) {
      console.error('Get recipe details error:', error);
      throw error;
    }
  }

  // Hasonló receptek keresése
  async getSimilarRecipes(recipeId, number = 6) {
    try {
      const params = {
        number,
        apiKey: this.apiKey
      };

      const response = await this.makeSpoonacularRequest(`/${recipeId}/similar`, params);
      return response;
    } catch (error) {
      console.error('Get similar recipes error:', error);
      throw error;
    }
  }

  // Receptek keresése szöveg alapján
  async searchRecipes(query, options = {}) {
    try {
      const params = {
        query,
        number: options.number || 12,
        offset: options.offset || 0,
        type: options.type || '', // main course, side dish, dessert, appetizer, salad, bread, breakfast, soup, beverage, sauce, marinade, fingerfood, snack, drink
        cuisine: options.cuisine || '', // african, american, british, cajun, caribbean, chinese, eastern european, european, french, german, greek, indian, irish, italian, japanese, jewish, korean, latin american, mediterranean, mexican, middle eastern, nordic, southern, spanish, thai, vietnamese
        diet: options.diet || '', // gluten free, ketogenic, vegetarian, lacto-vegetarian, ovo-vegetarian, vegan, pescetarian, paleo, primal, whole30
        intolerances: options.intolerances || '', // dairy, egg, gluten, grain, peanut, seafood, sesame, shellfish, soy, sulfite, tree nut, wheat
        includeIngredients: options.includeIngredients || '',
        excludeIngredients: options.excludeIngredients || '',
        sort: options.sort || 'popularity', // popularity, healthiness, price, time, random, max-used-ingredients, min-missing-ingredients
        sortDirection: options.sortDirection || 'desc',
        maxReadyTime: options.maxReadyTime || '',
        minCalories: options.minCalories || '',
        maxCalories: options.maxCalories || '',
        apiKey: this.apiKey
      };

      const response = await this.makeSpoonacularRequest('/complexSearch', params);
      return {
        recipes: this.formatRecipeResults(response.results || []),
        totalResults: response.totalResults || 0,
        offset: response.offset || 0,
        number: response.number || 0
      };
    } catch (error) {
      console.error('Search recipes error:', error);
      throw error;
    }
  }

  // Napi menü javaslat generálása
  async generateMealPlan(options = {}) {
    try {
      const params = {
        timeFrame: options.timeFrame || 'day', // day, week
        targetCalories: options.targetCalories || 2000,
        diet: options.diet || '',
        exclude: options.exclude || '',
        apiKey: this.apiKey
      };

      const response = await this.makeSpoonacularRequest('/mealplans/generate', params);
      return this.formatMealPlan(response);
    } catch (error) {
      console.error('Generate meal plan error:', error);
      throw error;
    }
  }

  // Készletből hiányzó hozzávalók számítása
  async calculateMissingIngredients(recipeId, availableIngredients) {
    try {
      const recipeDetails = await this.getRecipeDetails(recipeId);
      const requiredIngredients = recipeDetails.extendedIngredients || [];
      
      const missing = [];
      const available = [];

      requiredIngredients.forEach(ingredient => {
        const isAvailable = availableIngredients.some(available => 
          this.ingredientMatches(available.name, ingredient.name)
        );

        if (isAvailable) {
          available.push(ingredient);
        } else {
          missing.push(ingredient);
        }
      });

      return {
        missing,
        available,
        missingCount: missing.length,
        availableCount: available.length,
        completionRate: Math.round((available.length / requiredIngredients.length) * 100)
      };
    } catch (error) {
      console.error('Calculate missing ingredients error:', error);
      throw error;
    }
  }

  // Spoonacular API kérés küldése
  async makeSpoonacularRequest(endpoint, params = {}) {
    try {
      const url = new URL(this.baseURL + endpoint);
      Object.keys(params).forEach(key => {
        if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Spoonacular API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Spoonacular request error:', error);
      throw error;
    }
  }

  // Recept eredmények formázása
  formatRecipeResults(recipes) {
    return recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      imageType: recipe.imageType,
      usedIngredientCount: recipe.usedIngredientCount || 0,
      missedIngredientCount: recipe.missedIngredientCount || 0,
      missedIngredients: recipe.missedIngredients || [],
      usedIngredients: recipe.usedIngredients || [],
      unusedIngredients: recipe.unusedIngredients || [],
      likes: recipe.likes || recipe.aggregateLikes || 0,
      readyInMinutes: recipe.readyInMinutes || 0,
      servings: recipe.servings || 0,
      sourceUrl: recipe.sourceUrl || recipe.spoonacularSourceUrl,
      summary: recipe.summary || '',
      cuisines: recipe.cuisines || [],
      dishTypes: recipe.dishTypes || [],
      diets: recipe.diets || [],
      occasions: recipe.occasions || [],
      winePairing: recipe.winePairing || null,
      instructions: recipe.instructions || recipe.analyzedInstructions || [],
      nutrition: recipe.nutrition || null,
      pricePerServing: recipe.pricePerServing || 0,
      healthScore: recipe.healthScore || 0,
      spoonacularScore: recipe.spoonacularScore || 0,
      creditsText: recipe.creditsText || '',
      license: recipe.license || '',
      sourceName: recipe.sourceName || '',
      extendedIngredients: recipe.extendedIngredients || []
    }));
  }

  // Recept részletek formázása
  formatRecipeDetails(recipe) {
    return {
      ...this.formatRecipeResults([recipe])[0],
      analyzedInstructions: recipe.analyzedInstructions || [],
      originalId: recipe.originalId || null,
      vegetarian: recipe.vegetarian || false,
      vegan: recipe.vegan || false,
      glutenFree: recipe.glutenFree || false,
      dairyFree: recipe.dairyFree || false,
      veryHealthy: recipe.veryHealthy || false,
      cheap: recipe.cheap || false,
      veryPopular: recipe.veryPopular || false,
      sustainable: recipe.sustainable || false,
      lowFodmap: recipe.lowFodmap || false,
      weightWatcherSmartPoints: recipe.weightWatcherSmartPoints || 0,
      gaps: recipe.gaps || '',
      preparationMinutes: recipe.preparationMinutes || 0,
      cookingMinutes: recipe.cookingMinutes || 0,
      aggregateLikes: recipe.aggregateLikes || 0,
      spoonacularSourceUrl: recipe.spoonacularSourceUrl || ''
    };
  }

  // Étkezési terv formázása
  formatMealPlan(mealPlan) {
    return {
      meals: mealPlan.meals || [],
      nutrients: mealPlan.nutrients || {},
      timeFrame: mealPlan.timeFrame || 'day'
    };
  }

  // Hozzávaló egyezés ellenőrzése
  ingredientMatches(available, required) {
    const normalize = (str) => str.toLowerCase().trim();
    const availableNorm = normalize(available);
    const requiredNorm = normalize(required);

    // Pontos egyezés
    if (availableNorm === requiredNorm) return true;

    // Részleges egyezés
    if (availableNorm.includes(requiredNorm) || requiredNorm.includes(availableNorm)) {
      return true;
    }

    // Szinonimák ellenőrzése (bővíthető)
    const synonyms = {
      'tomato': ['tomatoes', 'cherry tomatoes', 'roma tomatoes'],
      'onion': ['onions', 'yellow onion', 'white onion', 'red onion'],
      'garlic': ['garlic cloves', 'garlic powder'],
      'cheese': ['cheddar', 'mozzarella', 'parmesan', 'gouda'],
      'milk': ['whole milk', 'skim milk', '2% milk'],
      'butter': ['unsalted butter', 'salted butter'],
      'oil': ['olive oil', 'vegetable oil', 'canola oil'],
      'salt': ['table salt', 'sea salt', 'kosher salt'],
      'pepper': ['black pepper', 'white pepper', 'ground pepper']
    };

    for (const [base, variants] of Object.entries(synonyms)) {
      if ((availableNorm.includes(base) || variants.some(v => availableNorm.includes(v))) &&
          (requiredNorm.includes(base) || variants.some(v => requiredNorm.includes(v)))) {
        return true;
      }
    }

    return false;
  }

  // Receptek cache-elése
  cacheRecipe(recipe) {
    try {
      const cached = this.getCachedRecipes();
      const updated = [recipe, ...cached.filter(r => r.id !== recipe.id)].slice(0, 50);
      
      localStorage.setItem('cachedRecipes', JSON.stringify({
        recipes: updated,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching recipe:', error);
    }
  }

  // Cache-elt receptek lekérése
  getCachedRecipes() {
    try {
      const cached = localStorage.getItem('cachedRecipes');
      if (cached) {
        const data = JSON.parse(cached);
        const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000; // 24 óra
        
        if (!isExpired) {
          return data.recipes;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting cached recipes:', error);
      return [];
    }
  }

  // Receptek szűrése diétás preferenciák alapján
  filterRecipesByDiet(recipes, dietPreferences = []) {
    if (!dietPreferences.length) return recipes;

    return recipes.filter(recipe => {
      return dietPreferences.every(diet => {
        switch (diet) {
          case 'vegetarian':
            return recipe.vegetarian;
          case 'vegan':
            return recipe.vegan;
          case 'gluten-free':
            return recipe.glutenFree;
          case 'dairy-free':
            return recipe.dairyFree;
          default:
            return true;
        }
      });
    });
  }

  // Receptek értékelése készlet alapján
  scoreRecipesByAvailability(recipes, availableIngredients) {
    return recipes.map(recipe => {
      const totalIngredients = recipe.extendedIngredients?.length || 0;
      if (totalIngredients === 0) {
        return { ...recipe, availabilityScore: 0 };
      }

      const availableCount = recipe.extendedIngredients.filter(ingredient =>
        availableIngredients.some(available =>
          this.ingredientMatches(available.name, ingredient.name)
        )
      ).length;

      const availabilityScore = Math.round((availableCount / totalIngredients) * 100);
      
      return {
        ...recipe,
        availabilityScore,
        availableIngredients: availableCount,
        totalIngredients,
        missingIngredients: totalIngredients - availableCount
      };
    }).sort((a, b) => b.availabilityScore - a.availabilityScore);
  }
}

// Singleton instance
const recipesService = new RecipesService();

export default recipesService;
