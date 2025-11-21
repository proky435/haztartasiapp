import React, { useRef, useState, useEffect } from 'react';
import './BarcodeScanner.css';

function SimpleBarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setStream(mediaStream);
      
      // Kis késleltetés a video elem inicializálásához
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Kamera hozzáférési hiba. Használd a manuális bevitelt.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div className="barcode-scanner-overlay" onClick={handleClose}>
      <div className="barcode-scanner-container" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h3>Vonalkód Beolvasása</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="scanner-content">
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
                maxHeight: '400px',
                display: error ? 'none' : 'block'
              }}
            />
            {error && (
              <div className="camera-placeholder">
                <p>📷 Kamera nem elérhető</p>
                <small>{error}</small>
              </div>
            )}
          </div>
          
          <div className="manual-input-section">
            <h4>Manuális Vonalkód Bevitel</h4>
            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Írd be a vonalkódot..."
                className="manual-code-input"
                autoFocus
              />
              <button type="submit" className="manual-submit-button">
                ✓ Hozzáadás
              </button>
            </form>
          </div>
          
          <div className="scanner-instructions">
            <p>📷 Irányítsd a kamerát a vonalkódra, vagy írd be manuálisan</p>
            <p><small>Automatikus felismerés fejlesztés alatt</small></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleBarcodeScanner;
