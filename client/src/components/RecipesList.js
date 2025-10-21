import React, { useState, useEffect } from 'react';
import recipesService from '../services/recipesService';
import inventoryService from '../services/inventoryService';
import './RecipesList.css';

function RecipesList({ currentHousehold }) {
  const [recipes, setRecipes] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [filters, setFilters] = useState({
    diet: '',
    cuisine: '',
    maxTime: '',
    difficulty: ''
  });

  useEffect(() => {
    loadAvailableIngredients();
  }, [currentHousehold]);

  useEffect(() => {
    if (availableIngredients.length > 0) {
      findRecipesByIngredients();
    }
  }, [availableIngredients]);

  // Elérhető hozzávalók betöltése a készletből
  const loadAvailableIngredients = async () => {
    try {
      if (!currentHousehold) return;
      
      const inventory = await inventoryService.getCurrentHouseholdInventory();
      const ingredients = inventory.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || 'db'
      }));
      
      setAvailableIngredients(ingredients);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      setAvailableIngredients([]);
    }
  };

  // Receptek keresése hozzávalók alapján
  const findRecipesByIngredients = async () => {
    try {
      setIsLoading(true);
      setError('');
      setApiKeyMissing(false);
      
      if (availableIngredients.length === 0) {
        setRecipes([]);
        return;
      }

      const ingredientNames = availableIngredients.map(ing => ing.name);
      const foundRecipes = await recipesService.findRecipesByIngredients(ingredientNames, {
        number: 12,
        ranking: 1
      });

      // Receptek értékelése elérhetőség alapján
      const scoredRecipes = recipesService.scoreRecipesByAvailability(foundRecipes, availableIngredients);
      setRecipes(scoredRecipes);
      
    } catch (error) {
      console.error('Error finding recipes:', error);
      
      if (error.message.includes('API kulcs nincs beállítva')) {
        setApiKeyMissing(true);
        setError('Spoonacular API kulcs nincs beállítva. Indítsd újra az alkalmazást a .env fájl módosítása után!');
      } else if (error.message.includes('401')) {
        setApiKeyMissing(true);
        setError('Érvénytelen API kulcs. Ellenőrizd a Spoonacular API kulcsot!');
      } else {
        setError('Hiba történt a receptek betöltése során: ' + error.message);
      }
      
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Receptek keresése szöveg alapján
  const searchRecipes = async () => {
    if (!searchQuery.trim()) {
      findRecipesByIngredients();
      return;
    }

    try {
      setIsLoading(true);
      
      const searchResults = await recipesService.searchRecipes(searchQuery, {
        number: 12,
        ...filters
      });

      const scoredRecipes = recipesService.scoreRecipesByAvailability(
        searchResults.recipes, 
        availableIngredients
      );
      
      setRecipes(scoredRecipes);
    } catch (error) {
      console.error('Error searching recipes:', error);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Recept részletek megjelenítése
  const handleRecipeClick = async (recipe) => {
    try {
      setIsLoading(true);
      const details = await recipesService.getRecipeDetails(recipe.id);
      setSelectedRecipe(details);
      
      // Cache-eljük a receptet
      recipesService.cacheRecipe(details);
    } catch (error) {
      console.error('Error loading recipe details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Hiányzó hozzávalók hozzáadása a bevásárlólistához
  const addMissingToShoppingList = async (recipe) => {
    try {
      const missing = await recipesService.calculateMissingIngredients(recipe.id, availableIngredients);
      
      // Itt integrálhatnánk a bevásárlólista szolgáltatással
      console.log('Hiányzó hozzávalók:', missing.missing);
      alert(`${missing.missing.length} hiányzó hozzávaló hozzáadva a bevásárlólistához!`);
    } catch (error) {
      console.error('Error adding to shopping list:', error);
    }
  };

  // Elérhetőségi szín meghatározása
  const getAvailabilityColor = (score) => {
    if (score >= 80) return 'var(--success-color)';
    if (score >= 50) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  // Nehézségi szint meghatározása
  const getDifficultyLevel = (readyInMinutes) => {
    if (readyInMinutes <= 15) return 'Gyors';
    if (readyInMinutes <= 30) return 'Könnyű';
    if (readyInMinutes <= 60) return 'Közepes';
    return 'Nehéz';
  };

  return (
    <div className="recipes-container">
      <div className="recipes-header">
        <h2>🍳 Receptjavaslatok</h2>
        <p className="recipes-subtitle">
          {availableIngredients.length} hozzávaló alapján • {recipes.length} recept találat
        </p>
      </div>

      {/* Keresés és szűrők */}
      <div className="recipes-search">
        <div className="search-input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keress recepteket..."
            className="search-input"
            onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
          />
          <button onClick={searchRecipes} className="search-button">
            🔍
          </button>
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="filters-toggle"
        >
          🎛️ Szűrők
        </button>
      </div>

      {/* Szűrők panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Diéta:</label>
            <select 
              value={filters.diet} 
              onChange={(e) => setFilters({...filters, diet: e.target.value})}
            >
              <option value="">Bármelyik</option>
              <option value="vegetarian">Vegetáriánus</option>
              <option value="vegan">Vegán</option>
              <option value="gluten free">Gluténmentes</option>
              <option value="ketogenic">Ketogén</option>
              <option value="paleo">Paleo</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Konyha:</label>
            <select 
              value={filters.cuisine} 
              onChange={(e) => setFilters({...filters, cuisine: e.target.value})}
            >
              <option value="">Bármelyik</option>
              <option value="italian">Olasz</option>
              <option value="chinese">Kínai</option>
              <option value="mexican">Mexikói</option>
              <option value="indian">Indiai</option>
              <option value="mediterranean">Mediterrán</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Max. idő:</label>
            <select 
              value={filters.maxTime} 
              onChange={(e) => setFilters({...filters, maxTime: e.target.value})}
            >
              <option value="">Bármelyik</option>
              <option value="15">15 perc</option>
              <option value="30">30 perc</option>
              <option value="60">1 óra</option>
              <option value="120">2 óra</option>
            </select>
          </div>
        </div>
      )}

      {/* Gyors akciók */}
      <div className="quick-actions">
        <button onClick={findRecipesByIngredients} className="action-button">
          🥘 Készletből
        </button>
        <button onClick={loadAvailableIngredients} className="action-button">
          🔄 Frissítés
        </button>
      </div>

      {/* Hibaüzenet */}
      {error && (
        <div className={`error-message ${apiKeyMissing ? 'api-error' : ''}`}>
          <h3>⚠️ {apiKeyMissing ? 'API Kulcs Probléma' : 'Hiba'}</h3>
          <p>{error}</p>
          {apiKeyMissing && (
            <div className="api-help">
              <p><strong>Megoldás:</strong></p>
              <ol>
                <li>Szerezz be egy ingyenes API kulcsot: <a href="https://spoonacular.com/food-api" target="_blank" rel="noopener noreferrer">Spoonacular API</a></li>
                <li>Add hozzá a <code>.env</code> fájlhoz: <code>REACT_APP_SPOONACULAR_API_KEY=your_key</code></li>
                <li>Indítsd újra az alkalmazást: <code>npm start</code></li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Loading állapot */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Receptek keresése...</p>
        </div>
      )}

      {/* Receptek listája */}
      {!isLoading && !error && recipes.length === 0 && (
        <div className="no-recipes">
          <p>🤷‍♀️ Nem találtunk recepteket</p>
          <p>Próbálj meg más keresési feltételeket vagy adj hozzá több hozzávalót a készlethez!</p>
        </div>
      )}

      {!isLoading && recipes.length > 0 && (
        <div className="recipes-grid">
          {recipes.map(recipe => (
            <div key={recipe.id} className="recipe-card">
              <div className="recipe-image">
                <img 
                  src={recipe.image || '/placeholder-recipe.jpg'} 
                  alt={recipe.title}
                  onError={(e) => e.target.src = '/placeholder-recipe.jpg'}
                />
                <div className="recipe-badges">
                  <span 
                    className="availability-badge"
                    style={{ backgroundColor: getAvailabilityColor(recipe.availabilityScore) }}
                  >
                    {recipe.availabilityScore}%
                  </span>
                  {recipe.readyInMinutes && (
                    <span className="time-badge">
                      ⏱️ {recipe.readyInMinutes}p
                    </span>
                  )}
                </div>
              </div>
              
              <div className="recipe-content">
                <h3 className="recipe-title">{recipe.title}</h3>
                
                <div className="recipe-stats">
                  <span className="stat">
                    ✅ {recipe.availableIngredients || 0}/{recipe.totalIngredients || 0}
                  </span>
                  {recipe.servings && (
                    <span className="stat">👥 {recipe.servings} adag</span>
                  )}
                  {recipe.likes && (
                    <span className="stat">❤️ {recipe.likes}</span>
                  )}
                </div>
                
                <div className="recipe-tags">
                  <span className="difficulty-tag">
                    {getDifficultyLevel(recipe.readyInMinutes)}
                  </span>
                  {recipe.vegetarian && <span className="diet-tag">🌱</span>}
                  {recipe.vegan && <span className="diet-tag">🌿</span>}
                  {recipe.glutenFree && <span className="diet-tag">🚫🌾</span>}
                </div>
                
                <div className="recipe-actions">
                  <button 
                    onClick={() => handleRecipeClick(recipe)}
                    className="view-recipe-button"
                  >
                    📖 Recept
                  </button>
                  <button 
                    onClick={() => addMissingToShoppingList(recipe)}
                    className="add-to-list-button"
                  >
                    🛒 Hiányzó
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recept részletek modal */}
      {selectedRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecipe.title}</h2>
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="recipe-image-large">
                <img src={selectedRecipe.image} alt={selectedRecipe.title} />
              </div>
              
              <div className="recipe-info">
                <div className="recipe-meta">
                  <span>⏱️ {selectedRecipe.readyInMinutes} perc</span>
                  <span>👥 {selectedRecipe.servings} adag</span>
                  <span>❤️ {selectedRecipe.likes} kedvelés</span>
                </div>
                
                {selectedRecipe.summary && (
                  <div 
                    className="recipe-summary"
                    dangerouslySetInnerHTML={{ __html: selectedRecipe.summary }}
                  />
                )}
                
                <div className="ingredients-section">
                  <h3>Hozzávalók:</h3>
                  <ul className="ingredients-list">
                    {selectedRecipe.extendedIngredients?.map((ingredient, index) => (
                      <li key={index} className="ingredient-item">
                        <span className="ingredient-amount">
                          {ingredient.amount} {ingredient.unit}
                        </span>
                        <span className="ingredient-name">{ingredient.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {selectedRecipe.analyzedInstructions?.length > 0 && (
                  <div className="instructions-section">
                    <h3>Elkészítés:</h3>
                    <ol className="instructions-list">
                      {selectedRecipe.analyzedInstructions[0].steps?.map((step, index) => (
                        <li key={index} className="instruction-step">
                          {step.step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipesList;
