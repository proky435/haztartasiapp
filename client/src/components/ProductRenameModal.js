import React, { useState } from 'react';
import productsService from '../services/productsService';
import './ProductRenameModal.css';

function ProductRenameModal({ product, onClose, onRenamed }) {
  const [customName, setCustomName] = useState(product?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      setError('Az új név megadása kötelező');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await productsService.renameProduct(product.barcode, customName.trim());
      
      console.log('Termék átnevezve:', {
        barcode: product.barcode,
        originalName: product.name,
        newName: customName.trim()
      });

      if (onRenamed) {
        onRenamed({
          ...product,
          name: customName.trim(),
          originalName: product.name,
          isCustomName: true
        });
      }

      onClose();
    } catch (error) {
      console.error('Rename error:', error);
      setError(error.message || 'Hiba történt az átnevezés során');
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  return (
    <div className="product-rename-overlay" onClick={onClose}>
      <div className="product-rename-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Termék Átnevezése</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="product-info">
            <div className="product-details">
              <p><strong>Vonalkód:</strong> {product.barcode}</p>
              <p><strong>Eredeti név:</strong> {product.name}</p>
              {product.brand && <p><strong>Márka:</strong> {product.brand}</p>}
              {product.isUnknown && (
                <p><small style={{color: '#f59e0b', fontStyle: 'italic'}}>
                  ⚠️ Ismeretlen vonalkód - egyedi név létrehozása
                </small></p>
              )}
            </div>
            {product.image_url && (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="product-image"
              />
            )}
          </div>

          <form onSubmit={handleSubmit} className="rename-form">
            <div className="form-group">
              <label htmlFor="customName">Új név:</label>
              <input
                id="customName"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="pl. Lidlis csoki puding"
                className="custom-name-input"
                maxLength={255}
                autoFocus
              />
              <small className="form-hint">
                Ez a név fog megjelenni a következő beolvasáskor
              </small>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={onClose}
                className="cancel-button"
                disabled={isLoading}
              >
                Mégse
              </button>
              <button 
                type="submit" 
                className="save-button"
                disabled={isLoading || !customName.trim()}
              >
                {isLoading ? 'Mentés...' : '✓ Mentés'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProductRenameModal;
