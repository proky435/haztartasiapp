import householdsService from './householdsService';

class ShoppingListService {
  // Háztartás bevásárlólistáinak lekérése
  async getHouseholdShoppingLists(householdId, filters = {}) {
    try {
      const response = await householdsService.getShoppingLists(householdId, filters);
      return response;
    } catch (error) {
      console.error('Get household shopping lists error:', error);
      throw error;
    }
  }

  // Aktuális háztartás bevásárlólistáinak lekérése
  async getCurrentHouseholdShoppingLists(filters = {}) {
    const currentHousehold = householdsService.getCurrentHousehold();
    if (!currentHousehold) {
      console.warn('Nincs kiválasztott háztartás, üres lista visszaadása');
      return { shoppingLists: [] };
    }
    
    try {
      return await this.getHouseholdShoppingLists(currentHousehold.id, filters);
    } catch (error) {
      console.warn('Backend shopping lists hiba, fallback üres listára:', error.message);
      return { shoppingLists: [] };
    }
  }

  // Új bevásárlólista létrehozása
  async createShoppingList(listData) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold) {
        throw new Error('Nincs kiválasztott háztartás');
      }

      const response = await householdsService.createShoppingList(currentHousehold.id, listData);
      return response;
    } catch (error) {
      console.error('Create shopping list error:', error);
      throw error;
    }
  }

  // Alapértelmezett bevásárlólista lekérése vagy létrehozása
  async getOrCreateDefaultShoppingList() {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold) {
        throw new Error('Nincs kiválasztott háztartás');
      }
      
      // Mindig friss adatokat kérünk le, ne használjunk cache-t
      const lists = await householdsService.getShoppingLists(currentHousehold.id);
      console.log('Available shopping lists:', lists.shoppingLists.map(l => ({ id: l.id, name: l.name })));
      
      // Keresünk egy "Bevásárlólista" nevű listát
      let defaultList = lists.shoppingLists.find(list => 
        list.name === 'Bevásárlólista' || list.isDefault
      );
      
      // Ha nincs, létrehozzuk
      if (!defaultList) {
        console.log('Nincs alapértelmezett lista, új létrehozása...');
        defaultList = await this.createShoppingList({
          name: 'Bevásárlólista',
          description: 'Alapértelmezett bevásárlólista',
          isDefault: true
        });
        console.log('Új alapértelmezett lista létrehozva:', defaultList.id);
      } else {
        console.log('Meglévő alapértelmezett lista használata:', defaultList.id);
      }
      
      return defaultList;
    } catch (error) {
      console.error('Get or create default shopping list error:', error);
      throw error;
    }
  }

  // Bevásárlólista részletes adatainak lekérése
  async getShoppingListDetails(listId) {
    try {
      const response = await householdsService.getShoppingListDetails(listId);
      return response;
    } catch (error) {
      console.error('Get shopping list details error:', error);
      throw error;
    }
  }

  // Tétel hozzáadása bevásárlólistához
  async addShoppingListItem(listId, itemData) {
    try {
      const response = await householdsService.addShoppingListItem(listId, itemData);
      return response;
    } catch (error) {
      console.error('Add shopping list item error:', error);
      throw error;
    }
  }

  // Tétel hozzáadása az alapértelmezett listához
  async addItemToDefaultList(itemData) {
    try {
      const defaultList = await this.getOrCreateDefaultShoppingList();
      return await this.addShoppingListItem(defaultList.id, itemData);
    } catch (error) {
      console.error('Add item to default list error:', error);
      throw error;
    }
  }

  // Tétel megvásárlásának jelölése
  async markItemAsPurchased(itemId, purchaseData = {}) {
    try {
      await householdsService.markItemAsPurchased(itemId, purchaseData);
      return true;
    } catch (error) {
      console.error('Mark item as purchased error:', error);
      throw error;
    }
  }

  // Tétel megvásárlásának visszavonása
  async unmarkItemAsPurchased(itemId) {
    try {
      await householdsService.unmarkItemAsPurchased(itemId);
      return true;
    } catch (error) {
      console.error('Unmark item as purchased error:', error);
      throw error;
    }
  }

  // Tétel törlése bevásárlólistáról
  async removeShoppingListItem(itemId) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold) {
        throw new Error('Nincs kiválasztott háztartás');
      }

      // Alapértelmezett lista lekérése
      const defaultList = await this.getOrCreateDefaultShoppingList();
      
      // DELETE kérés küldése a backend-nek
      const response = await householdsService.deleteShoppingListItem(
        currentHousehold.id, 
        defaultList.id, 
        itemId
      );
      
      console.log('Shopping list item deleted:', itemId);
      return response;
    } catch (error) {
      console.error('Remove shopping list item error:', error);
      throw error;
    }
  }

  // Alapértelmezett lista tételeinek lekérése
  async getDefaultListItems() {
    try {
      const defaultList = await this.getOrCreateDefaultShoppingList();
      console.log('Using default shopping list:', defaultList.id, defaultList.name);
      
      const listDetails = await this.getShoppingListDetails(defaultList.id);
      return listDetails.items || [];
    } catch (error) {
      console.error('Get default list items error:', error);
      
      // Fallback: lokális tárolás használata
      console.log('Fallback to local storage');
      return this.getLocalShoppingItems();
    }
  }

  // Lokális shopping items kezelése (fallback)
  getLocalShoppingItems() {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      const key = currentHousehold ? `shoppingItems_${currentHousehold.id}` : 'shoppingItems';
      const items = localStorage.getItem(key);
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error('Local storage error:', error);
      return [];
    }
  }

  saveLocalShoppingItems(items) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      const key = currentHousehold ? `shoppingItems_${currentHousehold.id}` : 'shoppingItems';
      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      console.error('Local storage save error:', error);
    }
  }

  // Cache tisztítás háztartás váltáskor
  clearShoppingListCache() {
    try {
      // Töröljük az összes shopping list cache-t
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('shoppingItems_') || 
        key.startsWith('defaultShoppingList_') ||
        key.includes('shoppingList')
      );
      keys.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('shoppingItems');
      localStorage.removeItem('defaultShoppingList');
      console.log('Shopping list cache törölve (teljes)');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Bevásárlólista tétel formázása megjelenítéshez
  formatItemForDisplay(item) {
    return {
      ...item,
      displayName: item.custom_name || item.product_name || item.name || item.productName || 'Névtelen tétel',
      addedDate: item.created_at || item.createdAt || item.addedDate,
      isPurchased: item.purchased || item.isPurchased || false,
      canEdit: true // Alapértelmezetten szerkeszthető
    };
  }

  // Tételek csoportosítása állapot szerint
  groupItemsByStatus(items) {
    const pending = [];
    const purchased = [];
    
    items.forEach(item => {
      if (item.purchased || item.isPurchased) {
        purchased.push(item);
      } else {
        pending.push(item);
      }
    });
    
    return { pending, purchased };
  }

  // Bevásárlólista statisztikák
  getShoppingListStats(items) {
    const total = items.length;
    const purchased = items.filter(item => item.purchased || item.isPurchased).length;
    const pending = total - purchased;
    const completionRate = total > 0 ? Math.round((purchased / total) * 100) : 0;
    
    return {
      total,
      purchased,
      pending,
      completionRate
    };
  }
}

// Singleton instance
const shoppingListService = new ShoppingListService();

export default shoppingListService;
