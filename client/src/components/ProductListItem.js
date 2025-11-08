import React, { useEffect, useRef } from 'react';
import './ProductListItem.css';
import { differenceInDays, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

function ProductListItem({ product, onUpdate, onDelete }) {
  const { theme } = useTheme();
  const itemRef = useRef(null);
  
  // Force dark theme background colors
  useEffect(() => {
    if (itemRef.current) {
      const element = itemRef.current;
      
      // Remove any inline white backgrounds from the main element
      element.style.removeProperty('background');
      element.style.removeProperty('background-color');
      
      if (theme === 'dark') {
        // Force dark background
        const expiryStatus = getExpiryStatus();
        if (expiryStatus?.class === 'expired' || expiryStatus?.class === 'expires-today' || expiryStatus?.class === 'expires-soon') {
          element.style.setProperty('background-color', '#334155', 'important');
          element.style.setProperty('background', '#334155', 'important');
        } else {
          element.style.setProperty('background-color', '#1e293b', 'important');
          element.style.setProperty('background', '#1e293b', 'important');
        }
      }
      
      // Ensure buttons keep their proper colors
      const quantityButtons = element.querySelectorAll('.quantity-controls button');
      const deleteButton = element.querySelector('.delete-button');
      
      quantityButtons.forEach(btn => {
        btn.style.removeProperty('background');
        btn.style.removeProperty('background-color');
        btn.style.removeProperty('color');
      });
      
      if (deleteButton) {
        deleteButton.style.removeProperty('background');
        deleteButton.style.removeProperty('background-color');
        deleteButton.style.removeProperty('color');
      }
    }
  }, [theme, product.expiryDate]);
  
  const getExpiryStatus = () => {
    if (!product.expiryDate) return null;
    
    const today = new Date();
    const expiryDate = parseISO(product.expiryDate);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', text: 'Lejárt', class: 'expired' };
    } else if (daysUntilExpiry === 0) {
      return { status: 'today', text: 'Ma jár le', class: 'expires-today' };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'soon', text: `${daysUntilExpiry} nap`, class: 'expires-soon' };
    } else {
      return { status: 'ok', text: `${daysUntilExpiry} nap`, class: 'expires-ok' };
    }
  };

  const expiryStatus = getExpiryStatus();

  return (
    <div 
      ref={itemRef}
      className={`product-list-item ${expiryStatus?.class || ''} theme-${theme}`}
    >
      <div className="product-info">
        <span className="product-name">{product.name}</span>
        <div className="product-details">
          {product.location && <span className="product-location">{product.location}</span>}
          {product.expiryDate && (
            <span className={`expiry-date ${expiryStatus?.class || ''}`}>
              {expiryStatus?.text}
            </span>
          )}
        </div>
      </div>
      <div className="quantity-controls">
        <button onClick={() => onUpdate(product.id, parseFloat(product.quantity) - 1)}>-</button>
        <span className="product-quantity">{product.quantity}</span>
        <button onClick={() => onUpdate(product.id, parseFloat(product.quantity) + 1)}>+</button>
      </div>
      <button className="delete-button" onClick={() => onDelete(product)}>Törlés</button>
    </div>
  );
}

export default ProductListItem;
