import React, { useState } from 'react';
import './ShoppingList.css';

function ShoppingList({ shoppingItems, onItemPurchased, onItemRemoved }) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItem.trim()) {
      const item = {
        id: Date.now(),
        name: newItem.trim(),
        addedDate: new Date().toISOString(),
        purchased: false
      };
      // Ez egy callback lenne a szülő komponensnek
      console.log('Új tétel hozzáadva:', item);
      setNewItem('');
    }
  };

  return (
    <div className="shopping-list-container">
      <div className="shopping-header">
        <h2>Bevásárlólista</h2>
        <span className="item-count">
          {shoppingItems.filter(item => !item.purchased).length} tétel
        </span>
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
        {shoppingItems.length === 0 ? (
          <div className="no-items">
            <p>Nincs tétel a bevásárlólistán</p>
            <small>A termékek automatikusan ide kerülnek, amikor elfogynak</small>
          </div>
        ) : (
          shoppingItems.map(item => (
            <div 
              key={item.id} 
              className={`shopping-item ${item.purchased ? 'purchased' : ''}`}
            >
              <div className="item-info">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={item.purchased}
                    onChange={() => onItemPurchased(item.id, !item.purchased)}
                  />
                  <span className="checkmark"></span>
                </label>
                <span className={`item-name ${item.purchased ? 'crossed-out' : ''}`}>
                  {item.name}
                </span>
              </div>
              
              <div className="item-actions">
                {item.purchased && (
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
                  onClick={() => onItemRemoved(item.id)}
                  title="Eltávolítás a listáról"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {shoppingItems.some(item => item.purchased) && (
        <div className="purchased-section">
          <h3>Megvásárolt tételek</h3>
          <p className="purchased-hint">
            Kattints a "Beolvas" gombra a megvásárolt termékek készletbe való visszahelyezéséhez
          </p>
        </div>
      )}
    </div>
  );
}

export default ShoppingList;
