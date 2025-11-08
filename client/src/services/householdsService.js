import apiService from './api';

class HouseholdsService {
  // Felhasználó háztartásainak lekérése
  async getUserHouseholds() {
    try {
      const response = await apiService.get('/households');
      return response.households || [];
    } catch (error) {
      console.error('Get user households error:', error);
      throw error;
    }
  }

  // Háztartás részletes adatainak lekérése
  async getHouseholdDetails(householdId) {
    try {
      const response = await apiService.get(`/households/${householdId}`);
      return response.household;
    } catch (error) {
      console.error('Get household details error:', error);
      throw error;
    }
  }

  // Új háztartás létrehozása
  async createHousehold(householdData) {
    try {
      const response = await apiService.post('/households', householdData);
      return response.household;
    } catch (error) {
      console.error('Create household error:', error);
      throw error;
    }
  }

  // Háztartás adatainak frissítése
  async updateHousehold(householdId, updateData) {
    try {
      const response = await apiService.put(`/households/${householdId}`, updateData);
      return response.household;
    } catch (error) {
      console.error('Update household error:', error);
      throw error;
    }
  }

  // Új meghívó kód generálása
  async generateInviteCode(householdId) {
    try {
      const response = await apiService.post(`/households/${householdId}/invite`);
      return {
        inviteCode: response.inviteCode,
        expiresAt: response.expiresAt
      };
    } catch (error) {
      console.error('Generate invite code error:', error);
      throw error;
    }
  }

  // Csatlakozás háztartáshoz meghívó kóddal
  async joinHousehold(inviteCode) {
    try {
      const response = await apiService.post(`/households/join/${inviteCode}`);
      return response.household;
    } catch (error) {
      console.error('Join household error:', error);
      throw error;
    }
  }

  // Tag eltávolítása háztartásból
  async removeMember(householdId, userId) {
    try {
      await apiService.delete(`/households/${householdId}/members/${userId}`);
      return true;
    } catch (error) {
      console.error('Remove member error:', error);
      throw error;
    }
  }

  // Háztartás készletének lekérése
  async getHouseholdInventory(householdId, filters = {}) {
    try {
      const response = await apiService.get(`/households/${householdId}/inventory`, filters);
      return {
        items: response.items || [],
        pagination: response.pagination || {},
        stats: response.stats || {},
        filters: response.filters || {}
      };
    } catch (error) {
      console.error('Get household inventory error:', error);
      throw error;
    }
  }

  // Termék hozzáadása a készlethez
  async addInventoryItem(householdId, itemData) {
    try {
      const response = await apiService.post(`/households/${householdId}/inventory`, itemData);
      return response.item;
    } catch (error) {
      console.error('Add inventory item error:', error);
      throw error;
    }
  }

  // Készlet tétel frissítése
  async updateInventoryItem(itemId, updateData) {
    try {
      const response = await apiService.put(`/inventory/${itemId}`, updateData);
      return response.item;
    } catch (error) {
      console.error('Update inventory item error:', error);
      throw error;
    }
  }

  // Készlet tétel törlése
  async deleteInventoryItem(itemId) {
    try {
      await apiService.delete(`/inventory/${itemId}`);
      return true;
    } catch (error) {
      console.error('Delete inventory item error:', error);
      throw error;
    }
  }

  // Háztartás bevásárlólistáinak lekérése
  async getShoppingLists(householdId, filters = {}) {
    try {
      const response = await apiService.get(`/households/${householdId}/shopping-lists`, filters);
      return {
        shoppingLists: response.shoppingLists || [],
        pagination: response.pagination || {}
      };
    } catch (error) {
      console.error('Get shopping lists error:', error);
      throw error;
    }
  }

  // Új bevásárlólista létrehozása
  async createShoppingList(householdId, listData) {
    try {
      const response = await apiService.post(`/households/${householdId}/shopping-lists`, listData);
      return response.shoppingList;
    } catch (error) {
      console.error('Create shopping list error:', error);
      throw error;
    }
  }

  // Bevásárlólista részletes adatainak lekérése
  async getShoppingListDetails(listId) {
    try {
      const currentHousehold = this.getCurrentHousehold();
      if (!currentHousehold) {
        throw new Error('Nincs kiválasztott háztartás');
      }
      
      console.log('Shopping list details lekérése:', {
        listId: listId,
        householdId: currentHousehold.id,
        householdName: currentHousehold.name
      });
      
      // Használjuk az új háztartás-specifikus shopping list items endpoint-ot
      const response = await apiService.get(`/households/${currentHousehold.id}/shopping-lists/${listId}/items`);
      
      console.log('Shopping list items sikeresen lekérve:', response.shoppingList.items.length, 'tétel');
      
      return response.shoppingList;
    } catch (error) {
      console.error('Get shopping list details error:', error);
      throw error;
    }
  }

  // Tétel hozzáadása bevásárlólistához
  async addShoppingListItem(listId, itemData) {
    try {
      const currentHousehold = this.getCurrentHousehold();
      if (!currentHousehold) {
        throw new Error('Nincs kiválasztott háztartás');
      }
      
      // Használjuk a háztartás shopping list endpoint-ot
      const response = await apiService.post(`/households/${currentHousehold.id}/shopping-lists/${listId}/items`, itemData);
      return response.item;
    } catch (error) {
      console.error('Add shopping list item error:', error);
      throw error;
    }
  }

  // Bevásárlólista tétel megvásárlásának jelölése
  async markItemAsPurchased(itemId, purchaseData) {
    try {
      await apiService.put(`/shopping-lists/items/${itemId}/purchase`, {
        purchased: true,
        ...purchaseData
      });
      return true;
    } catch (error) {
      console.error('Mark item as purchased error:', error);
      throw error;
    }
  }

  // Bevásárlólista tétel megvásárlásának visszavonása
  async unmarkItemAsPurchased(itemId) {
    try {
      await apiService.put(`/shopping-lists/items/${itemId}/purchase`, {
        purchased: false
      });
      return true;
    } catch (error) {
      console.error('Unmark item as purchased error:', error);
      throw error;
    }
  }

  // Bevásárlólista tétel törlése
  async deleteShoppingListItem(householdId, listId, itemId) {
    try {
      const response = await apiService.delete(`/households/${householdId}/shopping-lists/${listId}/items/${itemId}`);
      console.log('Shopping list item deleted via API:', itemId);
      return response;
    } catch (error) {
      console.error('Delete shopping list item error:', error);
      throw error;
    }
  }

  // Aktuális háztartás beállítása
  setCurrentHousehold(household) {
    this.currentHousehold = household;
    if (household) {
      localStorage.setItem('currentHousehold', JSON.stringify(household));
      console.log('Aktuális háztartás beállítva:', household.name, household.id);
    } else {
      localStorage.removeItem('currentHousehold');
      console.log('Aktuális háztartás törölve');
    }
  }

  // Aktuális háztartás lekérése
  getCurrentHousehold() {
    if (this.currentHousehold) {
      return this.currentHousehold;
    }
    
    try {
      const saved = localStorage.getItem('currentHousehold');
      if (saved) {
        this.currentHousehold = JSON.parse(saved);
        console.log('Mentett háztartás betöltve:', this.currentHousehold.name, this.currentHousehold.id);
        
        // Extra debug: ellenőrizzük a user háztartásait is
        const userHouseholds = localStorage.getItem('userHouseholds');
        const households = userHouseholds ? JSON.parse(userHouseholds) : [];
        console.log('Available households:', households.map(h => ({ name: h.name, id: h.id, role: h.userRole })));
        
        return this.currentHousehold;
      }
    } catch (error) {
      console.error('Error loading current household:', error);
      localStorage.removeItem('currentHousehold');
    }
    
    console.log('Nincs aktuális háztartás');
    return null;
  }

  // Aktuális háztartás cache törlése
  clearCurrentHouseholdCache() {
    this.currentHousehold = null;
    localStorage.removeItem('currentHousehold');
    console.log('Current household cache törölve');
  }

  // Teljes cache tisztítás (debug célra)
  clearAllCache() {
    this.currentHousehold = null;
    localStorage.removeItem('currentHousehold');
    localStorage.removeItem('userHouseholds');
    localStorage.removeItem('shoppingItems');
    localStorage.removeItem('inventoryItems');
    localStorage.removeItem('defaultShoppingList');
    // Töröljük az összes háztartás-specifikus cache-t
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith('shoppingItems_') || 
      key.startsWith('inventoryItems_') ||
      key.startsWith('defaultShoppingList_') ||
      key.includes('household') ||
      key.includes('shopping') ||
      key.includes('inventory')
    );
    keys.forEach(key => localStorage.removeItem(key));
    console.log('Teljes cache törölve - minden háztartás és shopping list adat');
  }

  // Teljes reset és újrainicializálás
  async forceReset() {
    console.log('🔄 TELJES RESET INDÍTÁSA...');
    
    // 1. Teljes cache törlés
    this.clearAllCache();
    
    // 2. Oldal újratöltése
    console.log('Oldal újratöltése...');
    window.location.reload();
  }

  // Háztartás szerepkör ellenőrzése
  hasPermission(household, permission) {
    if (!household || !household.userRole) return false;

    const rolePermissions = {
      admin: ['all'],
      member: ['view_inventory', 'add_inventory', 'update_inventory', 'create_shopping_list', 'update_shopping_list'],
      viewer: ['view_inventory', 'view_shopping_list']
    };

    const userPermissions = rolePermissions[household.userRole] || [];
    
    return userPermissions.includes('all') || userPermissions.includes(permission);
  }

  // Lejáró termékek lekérése
  async getExpiringItems(householdId, days = 7) {
    try {
      const response = await this.getHouseholdInventory(householdId, {
        expiring: true
      });
      
      return response.items.filter(item => {
        if (!item.expiryDate) return false;
        
        const expiryDate = new Date(item.expiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= days && diffDays >= 0;
      });
    } catch (error) {
      console.error('Get expiring items error:', error);
      throw error;
    }
  }

  // Alacsony készletű termékek lekérése
  async getLowStockItems(householdId) {
    try {
      const response = await this.getHouseholdInventory(householdId, {
        low_stock: true
      });
      
      return response.items;
    } catch (error) {
      console.error('Get low stock items error:', error);
      throw error;
    }
  }

  // Háztartás statisztikák formázása
  formatHouseholdStats(stats) {
    return {
      totalItems: stats.totalItems || 0,
      expiringSoon: stats.expiringSoon || 0,
      expired: stats.expired || 0,
      lowStock: stats.lowStock || 0,
      activeShoppingLists: stats.activeShoppingLists || 0,
      locationsCount: stats.locationsCount || 0,
      categoriesCount: stats.categoriesCount || 0
    };
  }
}

// Singleton instance
const householdsService = new HouseholdsService();

export default householdsService;
