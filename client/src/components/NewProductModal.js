import React, { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import SimpleBarcodeScanner from './SimpleBarcodeScanner';
import SimpleAutoScanner from './SimpleAutoScanner';
import DateOCRScanner from './DateOCRScanner';
import CameraWarning from './CameraWarning';
import ErrorBoundary from './ErrorBoundary';
import ProductRenameModal from './ProductRenameModal';
import productsService from '../services/productsService';
import { isSecureContext, isCameraSupported } from '../utils/cameraUtils';
import './NewProductModal.css';

function NewProductModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState('Hűtő');
  const [barcode, setBarcode] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDateScanner, setShowDateScanner] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [showCameraWarning, setShowCameraWarning] = useState(false);
  const [pendingCameraAction, setPendingCameraAction] = useState(null);
  const [useSimpleScanner, setUseSimpleScanner] = useState(true); // Alapértelmezetten egyszerű scanner
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Backend API hívás vonalkód alapján
  const fetchProductByBarcode = async (barcodeValue) => {
    setIsLoadingProduct(true);
    try {
      const product = await productsService.getProductByBarcode(barcodeValue);
      
      if (product) {
        const formattedProduct = productsService.formatProductForDisplay(product);
        setName(formattedProduct.displayName || 'Ismeretlen termék');
        setBarcode(barcodeValue);
        setCurrentProduct(product); // Termék mentése átnevezéshez
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

  const handleBarcodeScanned = (scannedBarcode, productData = null) => {
    setShowBarcodeScanner(false);
    
    if (productData) {
      // Termék adatok már megvannak a scanner-től
      setBarcode(scannedBarcode);
      setName(productData.displayName || '');
      setIsLoadingProduct(false);
    } else {
      // Fallback: kézi lekérdezés
      fetchProductByBarcode(scannedBarcode);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && quantity > 0) {
      onAdd({ 
        name, 
        quantity: parseInt(quantity, 10),
        expiryDate: expiryDate || null,
        location,
        barcode: barcode || null
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Új Termék Hozzáadása</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Termék Neve:
            <div className="name-input-group">
              <input 
                type="text" 
                name="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                disabled={isLoadingProduct}
              />
              {currentProduct && (
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
          </label>
          
          <label>
            Mennyiség:
            <input 
              type="number" 
              name="quantity" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              min="1" 
              required 
            />
          </label>

          <label>
            Lejárati Dátum:
            <input 
              type="date" 
              name="expiryDate" 
              value={expiryDate} 
              onChange={(e) => setExpiryDate(e.target.value)} 
            />
          </label>

          <label>
            Hely:
            <select 
              name="location" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="Hűtő">Hűtő</option>
              <option value="Fagyasztó">Fagyasztó</option>
              <option value="Kamra">Kamra</option>
              <option value="Egyéb">Egyéb</option>
            </select>
          </label>

          {barcode && (
            <div className="barcode-info">
              <strong>Vonalkód:</strong> {barcode}
            </div>
          )}

          <div className="button-group">
            <button 
              type="button" 
              onClick={() => {
                setUseSimpleScanner(true);
                setShowBarcodeScanner(true);
              }}
              disabled={isLoadingProduct}
            >
              {isLoadingProduct ? 'Betöltés...' : '📝 Vonalkód Bevitel'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setUseSimpleScanner('auto');
                setShowBarcodeScanner(true);
              }}
              disabled={isLoadingProduct}
            >
              📷 Kamera + Manuális
            </button>
            <button 
              type="button" 
              onClick={() => handleCameraAction(
                () => setShowDateScanner(true),
                'Dátum Felismerése (OCR)'
              )}
            >
              📅 Dátum Felismerése (OCR)
            </button>
          </div>
          
          <div className="form-actions">
            <button type="submit" disabled={isLoadingProduct}>Mentés</button>
            <button type="button" onClick={onClose}>Mégse</button>
          </div>
        </form>
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
