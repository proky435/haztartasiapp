import React, { useRef, useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import './DateOCRScanner.css';
import { safeGetUserMedia, isCameraSupported, isSecureContext } from '../utils/cameraUtils';

function DateOCRScanner({ onDateDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedText, setDetectedText] = useState('');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      // Kamera támogatás ellenőrzése
      if (!isCameraSupported()) {
        throw new Error('Kamera hozzáférés nem támogatott ebben a böngészőben');
      }

      // HTTPS ellenőrzés (figyelmeztetés, de nem blokkoló)
      if (!isSecureContext()) {
        console.warn('Kamera hozzáféréshez HTTPS kapcsolat ajánlott. Próbáld meg: https://192.168.0.19:3000');
        // Nem throw, hanem folytatjuk a próbálkozást
      }

      const mediaStream = await safeGetUserMedia({
        video: { 
          facingMode: 'environment',
          width: { min: 320, ideal: 640, max: 1920 },
          height: { min: 240, ideal: 480, max: 1080 }
        }
      });
      
      setStream(mediaStream);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  // Video stream kezelése külön useEffect-ben
  React.useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [stream]);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      console.warn('Video, canvas vagy stream nem elérhető');
      return;
    }

    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ellenőrizzük, hogy a video készen áll-e
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.warn('Video még nem készen áll a feldolgozásra');
      setIsScanning(false);
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Canvas-t dataURL-ként konvertáljuk
      const imageDataURL = canvas.toDataURL('image/jpeg', 0.8);
      
      console.log('Starting OCR recognition...');
      const { data: { text } } = await Tesseract.recognize(imageDataURL, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      setDetectedText(text);
      
      // Dátum pattern keresése
      const datePatterns = [
        /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/g, // YYYY.MM.DD, YYYY-MM-DD, YYYY/MM/DD
        /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/g, // DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
        /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2})/g,  // DD.MM.YY, DD-MM-YY, DD/MM/YY
      ];

      let foundDate = null;
      
      for (const pattern of datePatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
          const match = matches[0];
          if (pattern === datePatterns[0]) { // YYYY.MM.DD format
            foundDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else if (pattern === datePatterns[1]) { // DD.MM.YYYY format
            foundDate = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
          } else if (pattern === datePatterns[2]) { // DD.MM.YY format
            const year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
            foundDate = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
          }
          break;
        }
      }

      if (foundDate) {
        onDateDetected(foundDate);
      }
    } catch (error) {
      console.error('OCR hiba:', error);
      setDetectedText('Hiba történt a szövegfelismerés során. Próbáld újra jobb megvilágítás mellett.');
      
      // Alternatív megközelítés: egyszerűbb képfeldolgozás
      try {
        console.log('Trying alternative OCR approach...');
        const simpleImageData = canvas.toDataURL('image/png');
        const { data: { text: altText } } = await Tesseract.recognize(simpleImageData, 'eng', {
          logger: () => {}, // Csendes mód
          tessedit_char_whitelist: '0123456789./-' // Csak számok és dátum karakterek
        });
        
        if (altText.trim()) {
          setDetectedText('Alternatív felismerés: ' + altText);
        }
      } catch (altError) {
        console.error('Alternatív OCR is failed:', altError);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div className="date-ocr-overlay" onClick={handleClose}>
      <div className="date-ocr-container" onClick={(e) => e.stopPropagation()}>
        <div className="ocr-header">
          <h3>Lejárati Dátum Felismerése</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="ocr-content">
          {error ? (
            <div className="ocr-error">
              <p>❌ {error}</p>
              <div className="error-suggestions">
                <h4>Megoldási javaslatok:</h4>
                <ul>
                  <li>Használj HTTPS kapcsolatot: <strong>https://192.168.0.19:3000</strong></li>
                  <li>Frissítsd a böngészőt a legújabb verzióra</li>
                  <li>Engedélyezd a kamera hozzáférést</li>
                  <li>Próbáld újra indítani a kamerát</li>
                </ul>
                <button onClick={startCamera} className="retry-button">
                  🔄 Újrapróbálás
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Kamera inicializálása...</p>
            </div>
          ) : (
            <>
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    maxWidth: '500px',
                    maxHeight: '400px'
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
              <div className="ocr-controls">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    captureAndScan();
                  }}
                  disabled={isScanning || !stream}
                  className="scan-button"
                >
                  {isScanning ? 'Felismerés...' : 'Dátum Felismerése'}
                </button>
              </div>
              {detectedText && (
                <div className="detected-text">
                  <h4>Felismert szöveg:</h4>
                  <p>{detectedText}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DateOCRScanner;
