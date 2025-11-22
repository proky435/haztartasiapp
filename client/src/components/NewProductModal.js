import React, { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import SimpleBarcodeScanner from './SimpleBarcodeScanner';
import SimpleAutoScanner from './SimpleAutoScanner';
import DateOCRScanner from './DateOCRScanner';
import CameraWarning from './CameraWarning';
import ErrorBoundary from './ErrorBoundary';
import ProductRenameModal from './ProductRenameModal';
import productsService from '../services/productsService';
import expiryPatternService from '../services/expiryPatternService';
import { isSecureContext } from '../utils/cameraUtils';
import './NewProductModal.css';

function NewProductModal({ onClose, onAdd, householdId }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState('Hűtő');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [expirySuggestion, setExpirySuggestion] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDateScanner, setShowDateScanner] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [showCameraWarning, setShowCameraWarning] = useState(false);
  const [pendingCameraAction, setPendingCameraAction] = useState(null);
  const [useSimpleScanner, setUseSimpleScanner] = useState(true); // Alapértelmezetten egyszerű scanner
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  // Backend API hívás vonalkód alapján
  const fetchProductByBarcode = async (barcodeValue) => {
    setIsLoadingProduct(true);
    try {
      const product = await productsService.getProductByBarcode(barcodeValue);
      
      if (product) {
        const formattedProduct = productsService.formatProductForDisplay(product);
        const productName = formattedProduct.displayName || 'Ismeretlen termék';
        setName(productName);
        setBarcode(barcodeValue);
        setCurrentProduct(product); // Termék mentése átnevezéshez
        
        // Ha van mentett ár, használjuk azt
        if (product.savedPrice) {
          setPrice(product.savedPrice);
        }
        
        // Lekérjük a lejárati javaslatot
        await fetchExpirySuggestion(barcodeValue, productName);
      } else {
        setBarcode(barcodeValue);
        setName(''); // Ismeretlen termék, kézi bevitel szükséges
        // Létrehozunk egy placeholder product objektumot az átnevezéshez
        setCurrentProduct({
          barcode: barcodeValue,
          name: 'Ismeretlen termék',
          isUnknown: true
        });
      }
    } catch (error) {
      console.error('Hiba a termék lekérdezésében:', error);
      
      // Ha 404 hiba és van canCreateCustom flag, akkor ismeretlen vonalkód
      if (error.status === 404 && error.data?.canCreateCustom) {
        setBarcode(barcodeValue);
        setName(''); // Kézi bevitel szükséges
        // Létrehozunk egy placeholder product objektumot az átnevezéshez
        setCurrentProduct({
          barcode: barcodeValue,
          name: 'Ismeretlen termék',
          isUnknown: true
        });
      } else {
        setBarcode(barcodeValue);
        setName(''); // Hiba esetén kézi bevitel
        setCurrentProduct(null);
      }
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleBarcodeScanned = async (scannedBarcode, productData = null) => {
    // Ne zárjuk be azonnal a scanner-t, várjuk meg az adatok betöltését
    
    if (productData) {
      // Termék adatok már megvannak a scanner-től
      setBarcode(scannedBarcode);
      setName(productData.displayName || '');
      setIsLoadingProduct(false);
      
      // Lekérjük a lejárati javaslatot
      await fetchExpirySuggestion(scannedBarcode, productData.displayName);
      
      // Most zárjuk be a scanner-t
      setShowBarcodeScanner(false);
    } else {
      // Fallback: kézi lekérdezés
      await fetchProductByBarcode(scannedBarcode);
      
      // Most zárjuk be a scanner-t
      setShowBarcodeScanner(false);
    }
  };

  const handleDateDetected = (detectedDate) => {
    setShowDateScanner(false);
    setExpiryDate(detectedDate);
  };

  // Kamera funkciók kezelése
  const handleCameraAction = (action, feature) => {
    if (!isSecureContext()) {
      setPendingCameraAction({ action, feature });
      setShowCameraWarning(true);
    } else {
      action();
    }
  };

  const handleCameraWarningProceed = () => {
    setShowCameraWarning(false);
    if (pendingCameraAction) {
      pendingCameraAction.action();
      setPendingCameraAction(null);
    }
  };

  const handleCameraWarningCancel = () => {
    setShowCameraWarning(false);
    setPendingCameraAction(null);
    // Itt maradunk a manuális bevitelnél
  };

  // Termék átnevezés kezelése
  const handleRenameProduct = () => {
    if (currentProduct) {
      setShowRenameModal(true);
    }
  };

  const handleProductRenamed = (renamedProduct) => {
    setName(renamedProduct.name);
    setCurrentProduct(renamedProduct);
    setShowRenameModal(false);
  };

  // Lejárati javaslat lekérése
  const fetchExpirySuggestion = async (productBarcode, productName) => {
    if (!householdId) return;
    
    try {
      const suggestion = await expiryPatternService.getExpirySuggestion(
        householdId,
        productBarcode,
        productName
      );
      
      if (suggestion && suggestion.hasPattern) {
        setExpirySuggestion(suggestion);
        setShowSuggestion(true);
      } else {
        setExpirySuggestion(null);
        setShowSuggestion(false);
      }
    } catch (error) {
      console.error('Hiba a lejárati javaslat lekérésekor:', error);
    }
  };

  // Javaslat alkalmazása
  const applySuggestion = () => {
    if (expirySuggestion && expirySuggestion.suggestedExpiryDate) {
      setExpiryDate(expirySuggestion.suggestedExpiryDate);
      setShowSuggestion(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit called', { name, quantity });
    if (name && quantity > 0) {
      // Ha van ár és vonalkód, mentjük az árat
      if (price && barcode) {
        try {
          await productsService.saveProductPrice(barcode, name, parseFloat(price));
          console.log('Price saved successfully');
        } catch (error) {
          console.error('Error saving price:', error);
          // Folytatjuk a termék hozzáadását, még ha az ár mentése sikertelen is
        }
      }

      const productData = { 
        custom_name: name,  // Backend vár custom_name-et
        quantity: parseInt(quantity, 10),
        expiry_date: expiryDate || null,  // Backend snake_case-t használ
        location,
        barcode: barcode || null,
        price: price ? parseFloat(price) : null,
        purchase_date: new Date().toISOString().split('T')[0], // Mai dátum
        notes: notes || null
      };
      console.log('Calling onAdd with:', productData);
      onAdd(productData);
    } else {
      console.warn('Validation failed:', { name, quantity });
    }
  };

  // Hely ikonok
  const locationIcons = {
    'Hűtő': '❄️',
    'Fagyasztó': '🧊',
    'Kamra': '🏺',
    'Egyéb': '📦'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {isLoadingProduct && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        <div className="modal-header">
          <h2>🛒 Új Termék Hozzáadása</h2>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* 1. Termék Neve */}
            <div className="form-group">
              <label>
                <span className="label-icon">🏷️</span>
                Termék Neve
              </label>
              <div className="name-input-group">
                <input 
                  type="text" 
                  name="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="pl. Tej, Kenyér, Alma..."
                  required 
                  disabled={isLoadingProduct}
                />
                {barcode && name && (
                  <button 
                    type="button" 
                    onClick={handleRenameProduct}
                    className="rename-button"
                    title="Termék átnevezése"
                  >
                    ✏️ Átnevezés
                  </button>
                )}
              </div>
              {currentProduct && currentProduct.isCustomName && (
                <small className="custom-name-indicator">
                  ✓ Egyedi név használatban
                </small>
              )}
            </div>

            {/* 2. Gyors Bevitel */}
            <div className="scan-options">
              <div className="scan-options-title">⚡ Gyors Bevitel</div>
              <div className="button-group">
                <button 
                  type="button" 
                  className="scan-button barcode-scan-btn"
                  onClick={() => handleCameraAction(
                    () => {
                      setUseSimpleScanner('auto');
                      setShowBarcodeScanner(true);
                    },
                    'Vonalkód Beolvasás'
                  )}
                  disabled={isLoadingProduct}
                >
                  <span className="scan-icon">📷</span>
                  Vonalkód Beolvasás
                </button>
                <button 
                  type="button" 
                  className="scan-button date-scan-btn"
                  onClick={() => handleCameraAction(
                    () => setShowDateScanner(true),
                    'Dátum OCR'
                  )}
                >
                  <span className="scan-icon">📅</span>
                  Dátum OCR
                </button>
              </div>
            </div>

            {barcode && (
              <div className="barcode-info">
                <strong>Vonalkód:</strong> {barcode}
              </div>
            )}

            {/* 3. Lejárati Dátum */}
            <div className="form-group">
              <label>
                <span className="label-icon">📅</span>
                Lejárati Dátum
              </label>
              <input 
                type="date" 
                name="expiryDate" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)} 
              />
              
              {showSuggestion && expirySuggestion && (
                <div className="expiry-suggestion">
                  <div className="suggestion-header">
                    <span className="suggestion-icon">💡</span>
                    <span className="suggestion-title">Javaslat a korábbi vásárlásaid alapján</span>
                  </div>
                  <div className="suggestion-message">
                    {expirySuggestion.message}
                  </div>
                  <div className="suggestion-actions">
                    <button 
                      type="button" 
                      className="suggestion-apply-btn"
                      onClick={applySuggestion}
                    >
                      ✅ Alkalmazás ({new Date(expirySuggestion.suggestedExpiryDate).toLocaleDateString('hu-HU')})
                    </button>
                    <button 
                      type="button" 
                      className="suggestion-dismiss-btn"
                      onClick={() => setShowSuggestion(false)}
                    >
                      ❌ Elvetés
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Ár */}
            <div className="form-group">
              <label>
                <span className="label-icon">💰</span>
                Ár (opcionális)
                {currentProduct && currentProduct.savedPrice && !isEditingPrice && (
                  <span className="saved-price-indicator">
                    💾 Mentett ár
                  </span>
                )}
              </label>
              <div className="price-input-wrapper">
                <input 
                  type="number" 
                  name="price" 
                  value={price} 
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setIsEditingPrice(true);
                  }} 
                  min="0"
                  step="0.01"
                  placeholder="pl. 450"
                  disabled={!isEditingPrice && currentProduct && currentProduct.savedPrice}
                />
                <span className="price-currency">Ft</span>
                {currentProduct && currentProduct.savedPrice && !isEditingPrice && (
                  <button 
                    type="button" 
                    onClick={() => setIsEditingPrice(true)}
                    className="edit-price-button"
                    title="Ár szerkesztése"
                  >
                    ✏️
                  </button>
                )}
              </div>
              {isEditingPrice && currentProduct && currentProduct.savedPrice && (
                <small className="price-edit-info">
                  ℹ️ Az új ár mentésre kerül a termék hozzáadásakor
                </small>
              )}
            </div>

            {/* 5. Mennyiség */}
            <div className="form-group">
              <label>
                <span className="label-icon">🔢</span>
                Mennyiség
              </label>
              <div className="quantity-input-wrapper">
                <input 
                  type="number" 
                  name="quantity" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  min="1" 
                  placeholder="Darabszám"
                  required 
                />
              </div>
              <div className="quantity-stepper">
                <button 
                  type="button" 
                  className="quantity-stepper-btn"
                  onClick={() => setQuantity(Math.max(1, parseInt(quantity) - 1))}
                  disabled={parseInt(quantity) <= 1}
                >
                  ➖
                </button>
                <div className="quantity-display">{quantity}</div>
                <button 
                  type="button" 
                  className="quantity-stepper-btn"
                  onClick={() => setQuantity(parseInt(quantity) + 1)}
                >
                  ➕
                </button>
              </div>
              <div className="quantity-quick-buttons">
                <button type="button" className="quantity-btn" onClick={() => setQuantity(1)}>1 db</button>
                <button type="button" className="quantity-btn" onClick={() => setQuantity(2)}>2 db</button>
                <button type="button" className="quantity-btn" onClick={() => setQuantity(5)}>5 db</button>
                <button type="button" className="quantity-btn" onClick={() => setQuantity(10)}>10 db</button>
              </div>
            </div>

            {/* 6. Tárolási Hely */}
            <div className="form-group">
              <label>
                <span className="label-icon">📍</span>
                Tárolási Hely
              </label>
              <div className="location-options">
                {['Hűtő', 'Fagyasztó', 'Kamra', 'Egyéb'].map((loc) => (
                  <div
                    key={loc}
                    className={`location-option ${location === loc ? 'selected' : ''}`}
                    onClick={() => setLocation(loc)}
                  >
                    <span className="location-icon">{locationIcons[loc]}</span>
                    <span className="location-label">{loc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Megjegyzés */}
            <div className="form-group">
              <label>
                <span className="label-icon">📝</span>
                Megjegyzés (opcionális)
              </label>
              <textarea 
                name="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="pl. Bio termék, kedvezményes..."
                rows="3"
                className="notes-textarea"
              />
            </div>
          
            <div className="form-actions">
              <button type="button" onClick={onClose}>❌ Mégse</button>
              <button type="submit" disabled={isLoadingProduct}>
                {isLoadingProduct ? '⏳ Betöltés...' : '✅ Mentés'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {showBarcodeScanner && (
        <ErrorBoundary>
          {useSimpleScanner === 'auto' ? (
            <SimpleAutoScanner 
              onScan={handleBarcodeScanned}
              onClose={() => setShowBarcodeScanner(false)}
            />
          ) : useSimpleScanner ? (
            <SimpleBarcodeScanner 
              onScan={handleBarcodeScanned}
              onClose={() => setShowBarcodeScanner(false)}
            />
          ) : (
            <BarcodeScanner 
              onScan={handleBarcodeScanned}
              onClose={() => setShowBarcodeScanner(false)}
            />
          )}
        </ErrorBoundary>
      )}
      
      {showDateScanner && (
        <DateOCRScanner 
          onDateDetected={handleDateDetected}
          onClose={() => setShowDateScanner(false)}
        />
      )}

      {showCameraWarning && (
        <CameraWarning 
          onProceed={handleCameraWarningProceed}
          onCancel={handleCameraWarningCancel}
          feature={pendingCameraAction?.feature || 'Kamera funkció'}
        />
      )}

      {showRenameModal && currentProduct && (
        <ProductRenameModal 
          product={currentProduct}
          onClose={() => setShowRenameModal(false)}
          onRenamed={handleProductRenamed}
        />
      )}
    </div>
  );
}

export default NewProductModal;
