const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1';

class CustomRecipesService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/recipes`;
  }

  // Helper method az API hívásokhoz
  async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    // Get current household for API requests
    const getCurrentHouseholdId = () => {
      try {
        const currentHousehold = localStorage.getItem('currentHousehold');
        return currentHousehold ? JSON.parse(currentHousehold).id : null;
      } catch (error) {
        return null;
      }
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        // Add current household header
        ...(getCurrentHouseholdId() && { 'X-Current-Household': getCurrentHouseholdId() }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Összes saját recept lekérése
  async getCustomRecipes() {
    try {
      return await this.apiCall('');
    } catch (error) {
      console.error('Hiba a saját receptek lekérésekor:', error);
      throw error;
    }
  }

  // Új recept létrehozása
  async createRecipe(recipeData) {
    try {
      const cleanedData = {
        title: recipeData.title?.trim(),
        description: recipeData.description?.trim() || null,
        ingredients: recipeData.ingredients?.filter(ing => ing && ing.trim()) || [],
        instructions: recipeData.instructions?.filter(inst => inst && inst.trim()) || [],
        cookingTime: recipeData.cookingTime ? parseInt(recipeData.cookingTime) : null,
        servings: recipeData.servings ? parseInt(recipeData.servings) : null,
        difficulty: recipeData.difficulty || 'Könnyű'
      };

      return await this.apiCall('', {
        method: 'POST',
        body: JSON.stringify(cleanedData),
      });
    } catch (error) {
      console.error('Hiba a recept létrehozásakor:', error);
      throw error;
    }
  }

  // Recept törlése
  async deleteRecipe(recipeId) {
    try {
      return await this.apiCall(`/${recipeId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Hiba a recept törlésekor:', error);
      throw error;
    }
  }

  // LocalStorage szinkronizálás
  async syncWithLocalStorage(householdId) {
    try {
      const localKey = `customRecipes_${householdId || 'default'}`;
      
      // API-ból lekérjük a recepteket
      const apiRecipes = await this.getCustomRecipes();
      
      // Ha van API adat, azt használjuk és frissítjük a localStorage-t
      if (apiRecipes && apiRecipes.length >= 0) {
        localStorage.setItem(localKey, JSON.stringify(apiRecipes));
        return apiRecipes;
      }
      
      // Ha nincs API adat, localStorage-ból töltünk
      const localRecipes = JSON.parse(localStorage.getItem(localKey) || '[]');
      return localRecipes;
    } catch (error) {
      console.error('Hiba a szinkronizálás során:', error);
      // Ha az API nem elérhető, visszaadjuk a helyi recepteket
      const localKey = `customRecipes_${householdId || 'default'}`;
      return JSON.parse(localStorage.getItem(localKey) || '[]');
    }
  }

  // Offline mentés LocalStorage-ba
  saveToLocalStorage(recipes, householdId) {
    try {
      const localKey = `customRecipes_${householdId || 'default'}`;
      localStorage.setItem(localKey, JSON.stringify(recipes));
    } catch (error) {
      console.error('Hiba a helyi mentés során:', error);
    }
  }

  // LocalStorage-ból betöltés
  loadFromLocalStorage(householdId) {
    try {
      const localKey = `customRecipes_${householdId || 'default'}`;
      return JSON.parse(localStorage.getItem(localKey) || '[]');
    } catch (error) {
      console.error('Hiba a helyi betöltés során:', error);
      return [];
    }
  }

  // LocalStorage tisztítása (duplikátumok eltávolítása)
  clearLocalStorage(householdId) {
    try {
      const localKey = `customRecipes_${householdId || 'default'}`;
      localStorage.removeItem(localKey);
      console.log('LocalStorage receptek törölve:', localKey);
    } catch (error) {
      console.error('Hiba a localStorage tisztítása során:', error);
    }
  }
}

const customRecipesService = new CustomRecipesService();
export default customRecipesService;
