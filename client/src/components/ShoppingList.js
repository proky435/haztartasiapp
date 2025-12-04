import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import shoppingListService from '../services/shoppingListService';
import { getAutoSuggestions } from '../services/consumptionService';
import './ShoppingList.css';

function ShoppingList({ onItemsChange, currentHousehold }) {
  const [newItem, setNewItem] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadShoppingItems();
  }, []);

  // Háztartás váltáskor újratöltés
  useEffect(() => {
    if (currentHousehold) {
      console.log('Háztartás változott, bevásárlólista újratöltése:', currentHousehold.name);
      // Tisztítsuk a lokális cache-t háztartás váltáskor
      shoppingListService.clearShoppingListCache();
      loadShoppingItems();
    }
  }, [currentHousehold?.id]); // currentHousehold ID változásra reagál

  const loadShoppingItems = async () => {
    try {
      setIsLoading(true);
      
      // Próbáljuk meg a backend-et használni
      try {
        const defaultListItems = await shoppingListService.getDefaultListItems();
        const formattedItems = defaultListItems.map(item => 
          shoppingListService.formatItemForDisplay(item)
        );
        setItems(formattedItems);
        
        // Értesítsük a szülő komponenst
        if (onItemsChange) {
          onItemsChange(formattedItems);
        }
      } catch (backendError) {
        console.warn('Backend shopping list hiba, lokális tárolás használata:', backendError.message);
        
        // Fallback: lokális tárolás használata
        const localItems = shoppingListService.getLocalShoppingItems();
        const formattedItems = localItems.map(item => 
          shoppingListService.formatItemForDisplay(item)
        );
        setItems(formattedItems);
        
        if (onItemsChange) {
          onItemsChange(formattedItems);
        }
      }
    } catch (error) {
      console.error('Error loading shopping items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowSuggestions = async () => {
    if (!currentHousehold?.id) {
      toast.warning('Nincs kiválasztott háztartás! ⚠️');
      return;
    }

    try {
      setLoadingSuggestions(true);
      setShowSuggestionsModal(true);
      const response = await getAutoSuggestions(currentHousehold.id);
      
      console.log('Suggestions response:', response);
      
      if (response && response.status === 'success') {
        setSuggestions(response.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Hiba a javaslatok betöltésekor: ' + (error.message || 'Ismeretlen hiba'));
      setShowSuggestionsModal(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = async (suggestion) => {
    try {
      await shoppingListService.addItemToDefaultList({
        name: suggestion.productName,
        quantity: suggestion.suggestedQuantity || 1
      });
      await loadShoppingItems();
      toast.success(`${suggestion.productName} hozzáadva a listához! 🛍️`);
    } catch (error) {
      console.error('Error adding suggestion:', error);
      toast.error('Hiba a tétel hozzáadásakor!');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      setIsLoading(true);
      
      // Próbáljuk meg a backend-et használni
      try {
        await shoppingListService.addItemToDefaultList({
          name: newItem.trim(),
          quantity: 1
        });
      } catch (backendError) {
        console.warn('Backend hiba, lokális tárolás használata:', backendError.message);
        
        // Fallback: lokális hozzáadás
        const localItems = shoppingListService.getLocalShoppingItems();
        const newLocalItem = {
          id: Date.now().toString(),
          name: newItem.trim(),
          quantity: 1,
          purchased: false,
          created_at: new Date().toISOString()
        };
        
        const updatedItems = [...localItems, newLocalItem];
        shoppingListService.saveLocalShoppingItems(updatedItems);
      }
      
      setNewItem('');
      await loadShoppingItems(); // Frissítjük a listát
      toast.success('Tétel hozzáadva! ✅');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Hiba történt a tétel hozzáadásakor: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPurchased = async (itemId, purchased) => {
    try {
      // Próbáljuk meg a backend-et használni
      try {
        if (purchased) {
          await shoppingListService.markItemAsPurchased(itemId);
        } else {
          await shoppingListService.unmarkItemAsPurchased(itemId);
        }
      } catch (backendError) {
        console.warn('Backend hiba, lokális frissítés:', backendError.message);
        
        // Fallback: lokális frissítés
        const localItems = shoppingListService.getLocalShoppingItems();
        const updatedItems = localItems.map(item => 
          item.id === itemId ? { ...item, purchased } : item
        );
        shoppingListService.saveLocalShoppingItems(updatedItems);
      }
      
      await loadShoppingItems(); // Frissítjük a listát
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Hiba történt a tétel frissítésekor: ' + error.message);
    }
  };

  const handleItemRemoved = async (itemId) => {
    try {
      // Próbáljuk meg a backend-et használni
      try {
        await shoppingListService.removeShoppingListItem(itemId);
      } catch (backendError) {
        console.warn('Backend hiba, lokális törlés:', backendError.message);
        
        // Fallback: lokális törlés
        const localItems = shoppingListService.getLocalShoppingItems();
        const updatedItems = localItems.filter(item => item.id !== itemId);
        shoppingListService.saveLocalShoppingItems(updatedItems);
      }
      
      await loadShoppingItems(); // Frissítjük a listát
    } catch (error) {
      console.error('Error removing item:', error);
      // Helyi eltávolítás ha minden más sikertelen
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  return (
    <div className="shopping-list-container">
      <div className="shopping-header">
        <h2>Bevásárlólista</h2>
        <div className="header-actions">
          <button 
            className="suggestions-button"
            onClick={handleShowSuggestions}
            title="Intelligens javaslatok"
          >
            💡 Javaslatok
          </button>
          <span className="item-count">
            {items.filter(item => !item.purchased && !item.isPurchased).length} tétel
          </span>
        </div>
      </div>

      <form onSubmit={handleAddItem} className="add-item-form">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Új tétel hozzáadása..."
          className="add-item-input"
        />
        <button type="submit" className="add-item-button">Hozzáad</button>
      </form>

      <div className="shopping-items">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Betöltés...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="no-items">
            <p>Nincs tétel a bevásárlólistán</p>
            <small>Add hozzá az első tételt a fenti mezőben</small>
          </div>
        ) : (
          items.map(item => (
            <div 
              key={item.id} 
              className={`shopping-item ${item.purchased ? 'purchased' : ''}`}
            >
              <div className="item-info">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={item.purchased || item.isPurchased}
                    onChange={() => handleItemPurchased(item.id, !(item.purchased || item.isPurchased))}
                  />
                  <span className="checkmark"></span>
                </label>
                <span className={`item-name ${(item.purchased || item.isPurchased) ? 'crossed-out' : ''}`}>
                  {item.displayName || item.name}
                </span>
              </div>
              
              <div className="item-actions">
                {(item.purchased || item.isPurchased) && (
                  <button 
                    className="rescan-button"
                    onClick={() => console.log('Újra beolvasás:', item.name)}
                    title="Termék újra beolvasása"
                  >
                    📷 Beolvas
                  </button>
                )}
                <button 
                  className="remove-button"
                  onClick={() => handleItemRemoved(item.id)}
                  title="Eltávolítás a listáról"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {items.some(item => item.purchased || item.isPurchased) && (
        <div className="purchased-section">
          <h3>Megvásárolt tételek</h3>
          <p className="purchased-hint">
            Kattints a "Beolvas" gombra a megvásárolt termékek készletbe való visszahelyezéséhez
          </p>
        </div>
      )}

      {/* Suggestions Modal */}
      {showSuggestionsModal && (
        <div className="modal-overlay" onClick={() => setShowSuggestionsModal(false)}>
          <div className="suggestions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💡 Bevásárlási Javaslatok</h3>
              <button className="modal-close" onClick={() => setShowSuggestionsModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {loadingSuggestions ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Javaslatok betöltése...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="no-suggestions">
                  <p>📭 Jelenleg nincs javaslat</p>
                  <small>A rendszer elemzi a fogyasztási szokásaidat</small>
                </div>
              ) : (
                <div className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="suggestion-card">
                      <div className="suggestion-info">
                        <h4>{suggestion.productName}</h4>
                        {suggestion.brand && <span className="brand">{suggestion.brand}</span>}
                        <p className="reason">{suggestion.message}</p>
                        <div className="suggestion-meta">
                          <span className={`confidence ${suggestion.confidence}`}>
                            {suggestion.confidence === 'high' ? '🎯 Magas' : '📊 Közepes'} bizonyosság
                          </span>
                          {suggestion.currentQuantity !== undefined && (
                            <span className="current-stock">
                              Jelenlegi: {suggestion.currentQuantity} {suggestion.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="add-suggestion-btn"
                        onClick={() => handleAddSuggestion(suggestion)}
                      >
                        + Hozzáad
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShoppingList;
