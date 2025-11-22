import React, { useEffect, useRef } from 'react';
import './ProductListItem.css';
import { differenceInDays, parseISO, format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

function ProductListItem({ product, onUpdate, onDelete }) {
  const { theme } = useTheme();
  const itemRef = useRef(null);
  
  const getExpiryStatus = () => {
    if (!product.expiryDate) return null;
    
    const today = new Date();
    const expiryDate = parseISO(product.expiryDate);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    
    // Ha 7 napon belül van, napokban jelenítjük meg
    // Ha 7 napon túl van, dátum formátumban
    let displayText;
    if (daysUntilExpiry <= 7) {
      if (daysUntilExpiry < 0) {
        displayText = 'Lejárt';
      } else if (daysUntilExpiry === 0) {
        displayText = 'Ma jár le';
      } else {
        displayText = `${daysUntilExpiry} nap`;
      }
    } else {
      // 7 napon túl: dátum formátumban
      displayText = format(expiryDate, 'yyyy.MM.dd', { locale: hu });
    }
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', text: displayText, class: 'expired' };
    } else if (daysUntilExpiry === 0) {
      return { status: 'today', text: displayText, class: 'expires-today' };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'soon', text: displayText, class: 'expires-soon' };
    } else {
      return { status: 'ok', text: displayText, class: 'expires-ok' };
    }
  };

  const expiryStatus = getExpiryStatus();

  // Force dark theme background colors
  useEffect(() => {
    if (itemRef.current) {
      const element = itemRef.current;
      
      // Remove any inline white backgrounds from the main element
      element.style.removeProperty('background');
      element.style.removeProperty('background-color');
      
      if (theme === 'dark') {
        // Force dark background
        const status = getExpiryStatus();
        if (status?.class === 'expired' || status?.class === 'expires-today' || status?.class === 'expires-soon') {
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

  return (
    <div 
      ref={itemRef}
      className={`product-list-item ${expiryStatus?.class || ''} theme-${theme}`}
    >
      <div className="product-info">
        <span className="product-name">{product.name}</span>
        <div className="product-details">
          {product.location && (
            <span className="product-location">
              {product.location}
            </span>
          )}
          {product.expiryDate && (
            <span className={`expiry-date ${expiryStatus?.class || ''}`}>
              📅 {expiryStatus?.text}
            </span>
          )}
          {product.price && (
            <span 
              className="product-price"
              style={theme === 'dark' ? {
                color: '#ffffff',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 0.8)'
              } : {}}
            >
              💰 {parseFloat(product.price).toLocaleString('hu-HU')} Ft
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
