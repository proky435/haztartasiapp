import React from 'react';
import ProductListItem from './ProductListItem';
import './ProductList.css';

function ProductList({ products, onUpdate, onDelete }) {
  return (
    <div className="product-list-container">
      {products.map(product => (
        <ProductListItem 
          key={product.id} 
          product={product} 
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default ProductList;
