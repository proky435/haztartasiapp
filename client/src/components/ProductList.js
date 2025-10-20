import React, { useState, useMemo, useEffect } from 'react';
import ProductListItem from './ProductListItem';
import './ProductList.css';
import { differenceInDays, parseISO } from 'date-fns';
import inventoryService from '../services/inventoryService';

function ProductList({ products, onUpdate, onDelete }) {
  const [locationFilter, setLocationFilter] = useState('Összes');
  const [sortBy, setSortBy] = useState('expiry');

  const sortedAndFilteredProducts = useMemo(() => {
    let filtered = products;
    
    // Hely szerinti szűrés
    if (locationFilter !== 'Összes') {
      filtered = products.filter(product => product.location === locationFilter);
    }

    // Rendezés
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'expiry') {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        
        const daysA = differenceInDays(parseISO(a.expiryDate), new Date());
        const daysB = differenceInDays(parseISO(b.expiryDate), new Date());
        return daysA - daysB;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return sorted;
  }, [products, locationFilter, sortBy]);

  const locations = ['Összes', 'Hűtő', 'Fagyasztó', 'Kamra', 'Egyéb'];

  return (
    <div className="product-list-container">
      <div className="list-controls">
        <div className="filter-controls">
          <label>
            Hely:
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </label>
          
          <label>
            Rendezés:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="expiry">Lejárat szerint</option>
              <option value="name">Név szerint</option>
            </select>
          </label>
        </div>
      </div>

      <div className="products-grid">
        {sortedAndFilteredProducts.length === 0 ? (
          <div className="no-products">
            {locationFilter === 'Összes' 
              ? 'Nincsenek termékek' 
              : `Nincs termék itt: ${locationFilter}`}
          </div>
        ) : (
          sortedAndFilteredProducts.map(product => (
            <ProductListItem 
              key={product.id} 
              product={product} 
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ProductList;
