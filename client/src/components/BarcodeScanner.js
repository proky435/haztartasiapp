import React, { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';
import productsService from '../services/productsService';
import './BarcodeScanner.css';
import { isCameraSupported, isSecureContext } from '../utils/cameraUtils';

function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const isQuaggaStartedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // onScan ref frissítése
  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Timeout az inicializáláshoz
    const initTimeout = setTimeout(() => {
      setError('Vonalkód scanner inicializálása túl sokáig tart. Próbáld újra vagy használj manuális bevitelt.');
      setIsInitializing(false);
    }, 8000); // 8 másodperc

    // Kamera támogatás ellenőrzése
    if (!isCameraSupported()) {
      setError('Kamera hozzáférés nem támogatott ebben a böngészőben');
      setIsInitializing(false);
      clearTimeout(initTimeout);
      return;
    }

    // HTTPS ellenőrzés (figyelmeztetés, de nem blokkoló)
    if (!isSecureContext()) {
      console.warn('Kamera hozzáféréshez HTTPS kapcsolat ajánlott. Próbáld meg: https://192.168.0.19:3000');
    }

    if (scannerRef.current) {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 1, // Egy worker a stabilitásért
        frequency: 10, // Közepes frekvencia
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader"
          ]
        },
        locate: true
      }, (err) => {
        clearTimeout(initTimeout);
        if (err) {
          console.error('Quagga init error:', err);
          setError('Vonalkód scanner inicializálási hiba: ' + (err.message || err.toString()));
          setIsInitializing(false);
          return;
        }
        
        console.log("Quagga initialization finished");
        
        Quagga.onProcessed((result) => {
          if (result) {
            setIsScanning(true);
          }
        });

        Quagga.onDetected(async (result) => {
          const code = result.codeResult.code;
          console.log('Vonalkód felismerve:', code);
          
          if (isQuaggaStartedRef.current) {
            try {
              Quagga.stop();
              isQuaggaStartedRef.current = false;
            } catch (stopErr) {
              console.warn('Error stopping Quagga after detection:', stopErr);
            }
          }
          
          // Termék keresése a backend API-ban
          try {
            setIsScanning(true);
            const product = await productsService.getProductByBarcode(code);
            
            if (product) {
              // Termék találva
              const formattedProduct = productsService.formatProductForDisplay(product);
              onScanRef.current(code, formattedProduct);
            } else {
              // Termék nem található
              onScanRef.current(code, null);
            }
          } catch (error) {
            console.error('Product lookup error:', error);
            // Hiba esetén is visszaadjuk a vonalkódot
            onScanRef.current(code, null);
          } finally {
            setIsScanning(false);
          }
        });

        Quagga.start((startErr) => {
          if (startErr) {
            console.error('Quagga start error:', startErr);
            setError('Vonalkód scanner indítási hiba: ' + (startErr.message || startErr.toString()));
            setIsInitializing(false);
          } else {
            console.log('Quagga successfully started');
            isQuaggaStartedRef.current = true;
            setIsInitializing(false);
          }
        });
      });
    }

    return () => {
      clearTimeout(initTimeout);
      if (isQuaggaStartedRef.current) {
        try {
          Quagga.stop();
          isQuaggaStartedRef.current = false;
        } catch (cleanupErr) {
          console.warn('Error stopping Quagga during cleanup:', cleanupErr);
        }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (isQuaggaStartedRef.current) {
      try {
        Quagga.stop();
        isQuaggaStartedRef.current = false;
      } catch (closeErr) {
        console.warn('Error stopping Quagga on close:', closeErr);
      }
    }
    setIsScanning(false);
    onClose();
  };

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-container">
        <div className="scanner-header">
          <h3>Vonalkód Beolvasása</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="scanner-content">
          {error ? (
            <div className="scanner-error">
              <p>❌ {error}</p>
              <div className="error-suggestions">
                <h4>Megoldási javaslatok:</h4>
                <ul>
                  <li>Használj HTTPS kapcsolatot: <strong>https://192.168.0.19:3000</strong></li>
                  <li>Frissítsd a böngészőt a legújabb verzióra</li>
                  <li>Engedélyezd a kamera hozzáférést</li>
                  <li>Ellenőrizd, hogy más alkalmazás nem használja-e a kamerát</li>
                </ul>
                <button 
                  onClick={() => window.location.reload()} 
                  className="retry-button"
                >
                  🔄 Oldal újratöltése
                </button>
              </div>
            </div>
          ) : isInitializing ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Vonalkód scanner inicializálása...</p>
            </div>
          ) : (
            <>
              <div ref={scannerRef} className="scanner-viewport"></div>
              <div className="scanner-instructions">
                <p>Irányítsd a kamerát a vonalkódra</p>
                {isScanning && <div className="scanning-indicator">Keresés...</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BarcodeScanner;
