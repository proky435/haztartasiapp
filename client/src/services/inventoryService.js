import apiService from './api';
import householdsService from './householdsService';

class InventoryService {
  // Háztartás készletének lekérése
  async getHouseholdInventory(householdId, filters = {}) {
    try {
      const response = await householdsService.getHouseholdInventory(householdId, filters);
      return response;
    } catch (error) {
      console.error('Get household inventory error:', error);
      throw error;
    }
  }

  // Aktuális háztartás készletének lekérése
  async getCurrentHouseholdInventory(filters = {}) {
    const currentHousehold = householdsService.getCurrentHousehold();
    if (!currentHousehold) {
      console.warn('Nincs kiválasztott háztartás, üres készlet visszaadása');
      return { items: [], stats: { totalItems: 0, expiringSoon: 0, expired: 0, lowStock: 0 } };
    }
    
    console.log('Készlet lekérése háztartáshoz:', currentHousehold.name, currentHousehold.id);
    
    try {
      const result = await this.getHouseholdInventory(currentHousehold.id, filters);
      console.log('Készlet sikeresen lekérve:', result.items.length, 'tétel');
      return result;
    } catch (error) {
      console.error('Backend inventory hiba:', error);
      console.warn('Fallback üres készletre');
      return { items: [], stats: { totalItems: 0, expiringSoon: 0, expired: 0, lowStock: 0 } };
    }
  }

  // Termék hozzáadása a készlethez
  async addInventoryItem(itemData) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold) {
        // Fallback: lokális hozzáadás
        return this.addLocalInventoryItem(itemData);
      }

      try {
        const response = await householdsService.addInventoryItem(currentHousehold.id, itemData);
        return response;
      } catch (backendError) {
        console.warn('Backend hiba, lokális tárolás használata:', backendError.message);
        return this.addLocalInventoryItem(itemData);
      }
    } catch (error) {
      console.error('Add inventory item error:', error);
      throw error;
    }
  }

  // Lokális inventory kezelése (fallback)
  getLocalInventoryItems() {
    try {
      const items = localStorage.getItem('inventoryItems');
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error('Local inventory storage error:', error);
      return [];
    }
  }

  saveLocalInventoryItems(items) {
    try {
      localStorage.setItem('inventoryItems', JSON.stringify(items));
    } catch (error) {
      console.error('Local inventory save error:', error);
    }
  }

  addLocalInventoryItem(itemData) {
    const localItems = this.getLocalInventoryItems();
    const newItem = {
      id: Date.now().toString(),
      ...itemData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedItems = [...localItems, newItem];
    this.saveLocalInventoryItems(updatedItems);
    
    return { item: newItem };
  }

  // Készlet tétel frissítése
  async updateInventoryItem(itemId, updateData) {
    try {
      const response = await householdsService.updateInventoryItem(itemId, updateData);
      return response;
    } catch (error) {
      console.error('Update inventory item error:', error);
      throw error;
    }
  }

  // Készlet tétel törlése
  async deleteInventoryItem(itemId) {
    try {
      await householdsService.deleteInventoryItem(itemId);
      return true;
    } catch (error) {
      console.error('Delete inventory item error:', error);
      throw error;
    }
  }

  // Mennyiség frissítése
  async updateQuantity(itemId, newQuantity) {
    try {
      const response = await this.updateInventoryItem(itemId, { 
        quantity: newQuantity 
      });
      return response;
    } catch (error) {
      console.error('Update quantity error:', error);
      throw error;
    }
  }

  // Lejárati dátum frissítése
  async updateExpiryDate(itemId, newExpiryDate) {
    try {
      const response = await this.updateInventoryItem(itemId, { 
        expiryDate: newExpiryDate 
      });
      return response;
    } catch (error) {
      console.error('Update expiry date error:', error);
      throw error;
    }
  }

  // Hely frissítése
  async updateLocation(itemId, newLocation) {
    try {
      const response = await this.updateInventoryItem(itemId, { 
        location: newLocation 
      });
      return response;
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  }

  // Lejáró termékek lekérése
  async getExpiringItems(days = 7) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold) {
        return [];
      }

      const expiringItems = await householdsService.getExpiringItems(currentHousehold.id, days);
      return expiringItems;
    } catch (error) {
      console.error('Get expiring items error:', error);
      return [];
    }
  }

  // Alacsony készletű termékek lekérése
  async getLowStockItems() {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold) {
        return [];
      }

      const lowStockItems = await householdsService.getLowStockItems(currentHousehold.id);
      return lowStockItems;
    } catch (error) {
      console.error('Get low stock items error:', error);
      return [];
    }
  }

  // Készlet statisztikák
  async getInventoryStats() {
    try {
      const inventory = await this.getCurrentHouseholdInventory();
      const items = inventory.items || [];
      
      const stats = {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        expiringSoon: 0,
        expired: 0,
        lowStock: 0,
        byLocation: {},
        byCategory: {}
      };

      const today = new Date();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      items.forEach(item => {
        // Lejárat ellenőrzése
        if (item.expiryDate) {
          const expiryDate = new Date(item.expiryDate);
          if (expiryDate < today) {
            stats.expired++;
          } else if (expiryDate <= sevenDaysFromNow) {
            stats.expiringSoon++;
          }
        }

        // Alacsony készlet ellenőrzése
        if (item.quantity <= (item.minQuantity || 1)) {
          stats.lowStock++;
        }

        // Hely szerinti csoportosítás
        const location = item.location || 'Ismeretlen';
        stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;

        // Kategória szerinti csoportosítás
        const category = item.category || 'Egyéb';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get inventory stats error:', error);
      return {
        totalItems: 0,
        totalQuantity: 0,
        expiringSoon: 0,
        expired: 0,
        lowStock: 0,
        byLocation: {},
        byCategory: {}
      };
    }
  }

  // Termék keresés a készletben
  async searchInventory(query, filters = {}) {
    try {
      const searchFilters = {
        ...filters,
        search: query
      };
      
      const inventory = await this.getCurrentHouseholdInventory(searchFilters);
      return inventory;
    } catch (error) {
      console.error('Search inventory error:', error);
      throw error;
    }
  }

  // Készlet export (CSV formátumban)
  exportInventoryToCSV(items) {
    const headers = ['Név', 'Mennyiség', 'Lejárati dátum', 'Hely', 'Kategória', 'Vonalkód'];
    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        `"${item.name || ''}"`,
        item.quantity || 0,
        item.expiryDate || '',
        `"${item.location || ''}"`,
        `"${item.category || ''}"`,
        item.barcode || ''
      ].join(','))
    ].join('\n');

    // CSV fájl letöltése
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `keszlet_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Termék formázása megjelenítéshez
  formatItemForDisplay(item) {
    const today = new Date();
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
    
    let expiryStatus = 'good';
    let daysUntilExpiry = null;
    
    if (expiryDate) {
      const diffTime = expiryDate - today;
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        expiryStatus = 'expired';
      } else if (daysUntilExpiry <= 3) {
        expiryStatus = 'critical';
      } else if (daysUntilExpiry <= 7) {
        expiryStatus = 'warning';
      }
    }

    return {
      ...item,
      expiryStatus,
      daysUntilExpiry,
      isLowStock: item.quantity <= (item.minQuantity || 1),
      displayExpiryDate: expiryDate ? expiryDate.toLocaleDateString('hu-HU') : null
    };
  }
}

// Singleton instance
const inventoryService = new InventoryService();

export default inventoryService;
