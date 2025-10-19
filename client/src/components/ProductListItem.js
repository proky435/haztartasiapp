import React from 'react';
import './ProductListItem.css';
import { differenceInDays, parseISO } from 'date-fns';

function ProductListItem({ product, onUpdate, onDelete }) {
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
    <div className={`product-list-item ${expiryStatus?.class || ''}`}>
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
        <button onClick={() => onUpdate(product.id, product.quantity - 1)}>-</button>
        <span className="product-quantity">{product.quantity}</span>
        <button onClick={() => onUpdate(product.id, product.quantity + 1)}>+</button>
      </div>
      <button className="delete-button" onClick={() => onDelete(product.id)}>Törlés</button>
    </div>
  );
}

export default ProductListItem;
