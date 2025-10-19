import React from 'react';
import './ProductListItem.css';

function ProductListItem({ product, onUpdate, onDelete }) {
  return (
    <div className="product-list-item">
      <span className="product-name">{product.name}</span>
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
