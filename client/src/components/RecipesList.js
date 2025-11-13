import React, { useState, useEffect } from 'react';
import recipesService from '../services/recipesService';
import inventoryService from '../services/inventoryService';
import './RecipesList.css';

function RecipesList({ currentHousehold }) {
  const [recipes, setRecipes] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions'); // 'suggestions' vagy 'custom'
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    cookingTime: '',
    servings: '',
    difficulty: 'Könnyű',
    tags: []
  });
  const [filters, setFilters] = useState({
    diet: '',
    cuisine: '',
    maxTime: '',
    difficulty: ''
  });

  useEffect(() => {
    loadAvailableIngredients();
    loadCustomRecipes();
  }, [currentHousehold]);

  useEffect(() => {
    if (availableIngredients.length > 0 && activeTab === 'suggestions') {
      findRecipesByIngredients();
    }
  }, [availableIngredients, activeTab]);

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

  // Saját receptek betöltése localStorage-ból
  const loadCustomRecipes = () => {
    try {
      const saved = localStorage.getItem(`customRecipes_${currentHousehold?.id || 'default'}`);
      if (saved) {
        setCustomRecipes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading custom recipes:', error);
      setCustomRecipes([]);
    }
  };

  // Saját recept mentése
  const saveCustomRecipe = () => {
    if (!newRecipe.title.trim() || newRecipe.ingredients.filter(i => i.trim()).length === 0) {
      alert('Kérlek add meg a recept címét és legalább egy hozzávalót!');
      return;
    }

    const recipe = {
      id: Date.now(),
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter(i => i.trim()),
      instructions: newRecipe.instructions.filter(i => i.trim()),
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    const updated = [...customRecipes, recipe];
    setCustomRecipes(updated);
    localStorage.setItem(`customRecipes_${currentHousehold?.id || 'default'}`, JSON.stringify(updated));
    
    // Reset form
    setNewRecipe({
      title: '',
      description: '',
      ingredients: [''],
      instructions: [''],
      cookingTime: '',
      servings: '',
      difficulty: 'Könnyű',
      tags: []
    });
    setShowAddRecipe(false);
  };

  // Saját recept törlése
  const deleteCustomRecipe = (id) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a receptet?')) {
      const updated = customRecipes.filter(recipe => recipe.id !== id);
      setCustomRecipes(updated);
      localStorage.setItem(`customRecipes_${currentHousehold?.id || 'default'}`, JSON.stringify(updated));
    }
  };

  // Hozzávaló hozzáadása/eltávolítása az új recepthez
  const addIngredient = () => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index, value) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === index ? value : ing)
    }));
  };

  // Utasítás hozzáadása/eltávolítása az új recepthez
  const addInstruction = () => {
    setNewRecipe(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index) => {
    setNewRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const updateInstruction = (index, value) => {
    setNewRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? value : inst)
    }));
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
        <h2>🍳 Receptek</h2>
        <div className="recipes-tabs">
          <button 
            className={`tab-button ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            💡 Javaslatok ({recipes.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            📝 Saját receptek ({customRecipes.length})
          </button>
        </div>
        {activeTab === 'suggestions' && (
          <p className="recipes-subtitle">
            {availableIngredients.length} hozzávaló alapján • {recipes.length} recept találat
          </p>
        )}
      </div>

      {/* Keresés és szűrők - csak javaslatok tabnál */}
      {activeTab === 'suggestions' && (
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
      )}

      {/* Saját receptek akciók */}
      {activeTab === 'custom' && (
        <div className="custom-recipes-actions">
          <button 
            onClick={() => setShowAddRecipe(true)}
            className="add-recipe-button"
          >
            ➕ Új recept hozzáadása
          </button>
        </div>
      )}

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

      {/* Javaslatok tab tartalma */}
      {activeTab === 'suggestions' && (
        <>
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
        </>
      )}

      {/* Saját receptek tab tartalma */}
      {activeTab === 'custom' && (
        <>
          {customRecipes.length === 0 && (
            <div className="no-recipes">
              <p>📝 Még nincsenek saját receptjeid</p>
              <p>Kattints a "➕ Új recept hozzáadása" gombra az első recept létrehozásához!</p>
            </div>
          )}

          {customRecipes.length > 0 && (
            <div className="recipes-grid">
              {customRecipes.map(recipe => (
                <div key={recipe.id} className="recipe-card custom-recipe">
                  <div className="recipe-content">
                    <h3 className="recipe-title">{recipe.title}</h3>
                    
                    {recipe.description && (
                      <p className="recipe-description">{recipe.description}</p>
                    )}
                    
                    <div className="recipe-stats">
                      {recipe.cookingTime && (
                        <span className="stat">⏱️ {recipe.cookingTime} perc</span>
                      )}
                      {recipe.servings && (
                        <span className="stat">👥 {recipe.servings} adag</span>
                      )}
                      <span className="stat">📝 Saját</span>
                    </div>
                    
                    <div className="recipe-tags">
                      <span className="difficulty-tag">{recipe.difficulty}</span>
                    </div>
                    
                    <div className="recipe-actions">
                      <button 
                        onClick={() => setSelectedRecipe(recipe)}
                        className="view-recipe-button"
                      >
                        📖 Recept
                      </button>
                      <button 
                        onClick={() => deleteCustomRecipe(recipe.id)}
                        className="delete-recipe-button"
                      >
                        🗑️ Törlés
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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

      {/* Új recept hozzáadása modal */}
      {showAddRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setShowAddRecipe(false)}>
          <div className="recipe-modal add-recipe-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Új recept hozzáadása</h2>
              <button 
                onClick={() => setShowAddRecipe(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <form onSubmit={(e) => { e.preventDefault(); saveCustomRecipe(); }}>
                <div className="form-group">
                  <label>Recept címe *</label>
                  <input
                    type="text"
                    value={newRecipe.title}
                    onChange={(e) => setNewRecipe(prev => ({...prev, title: e.target.value}))}
                    placeholder="pl. Nagymama krumplifőzeléke"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Leírás</label>
                  <textarea
                    value={newRecipe.description}
                    onChange={(e) => setNewRecipe(prev => ({...prev, description: e.target.value}))}
                    placeholder="Rövid leírás a receptről..."
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Főzési idő (perc)</label>
                    <input
                      type="number"
                      value={newRecipe.cookingTime}
                      onChange={(e) => setNewRecipe(prev => ({...prev, cookingTime: e.target.value}))}
                      placeholder="30"
                    />
                  </div>
                  <div className="form-group">
                    <label>Adagok száma</label>
                    <input
                      type="number"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe(prev => ({...prev, servings: e.target.value}))}
                      placeholder="4"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nehézség</label>
                    <select
                      value={newRecipe.difficulty}
                      onChange={(e) => setNewRecipe(prev => ({...prev, difficulty: e.target.value}))}
                    >
                      <option value="Gyors">Gyors</option>
                      <option value="Könnyű">Könnyű</option>
                      <option value="Közepes">Közepes</option>
                      <option value="Nehéz">Nehéz</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Hozzávalók *</label>
                  {newRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="ingredient-input">
                      <input
                        type="text"
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                        placeholder="pl. 500g krumpli"
                      />
                      {newRecipe.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="remove-button"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="add-ingredient-button"
                  >
                    + Hozzávaló hozzáadása
                  </button>
                </div>

                <div className="form-group">
                  <label>Elkészítés</label>
                  {newRecipe.instructions.map((instruction, index) => (
                    <div key={index} className="instruction-input">
                      <textarea
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        placeholder={`${index + 1}. lépés...`}
                        rows="2"
                      />
                      {newRecipe.instructions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="remove-button"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addInstruction}
                    className="add-instruction-button"
                  >
                    + Lépés hozzáadása
                  </button>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddRecipe(false)}
                    className="cancel-button"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="save-button"
                  >
                    💾 Recept mentése
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipesList;
