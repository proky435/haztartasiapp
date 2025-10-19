import React, { useRef, useState, useEffect } from 'react';
import './BarcodeScanner.css';
import { BrowserMultiFormatReader } from '@zxing/library';

function SimpleAutoScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const codeReaderRef = useRef(null);

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
    stopAutoScan();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const startAutoScan = async () => {
    if (!videoRef.current || autoScanEnabled) return;
    
    try {
      setIsScanning(true);
      setAutoScanEnabled(true);
      
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;
      
      console.log('Automatikus vonalkód felismerés indítása...');
      
      const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoRef.current);
      
      if (result) {
        console.log('Vonalkód felismerve:', result.text);
        onScan(result.text);
      }
    } catch (err) {
      console.error('Automatikus felismerés hiba:', err);
      setError('Automatikus felismerés sikertelen. Próbáld a manuális bevitelt.');
    } finally {
      setIsScanning(false);
      setAutoScanEnabled(false);
    }
  };

  const stopAutoScan = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setAutoScanEnabled(false);
    setIsScanning(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Kép alapú felismerés próbálkozás
    tryImageRecognition(canvas);
  };

  const tryImageRecognition = async (canvas) => {
    try {
      setIsScanning(true);
      const codeReader = new BrowserMultiFormatReader();
      
      const imageData = canvas.toDataURL('image/png');
      const result = await codeReader.decodeFromImage(undefined, imageData);
      
      if (result) {
        console.log('Vonalkód felismerve képből:', result.text);
        onScan(result.text);
      } else {
        console.log('Nem sikerült felismerni a vonalkódot a képből');
      }
    } catch (err) {
      console.error('Kép alapú felismerés hiba:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-container">
        <div className="scanner-header">
          <h3>Automatikus Vonalkód Scanner</h3>
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
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {error && (
              <div className="camera-placeholder">
                <p>📷 Kamera nem elérhető</p>
                <small>{error}</small>
              </div>
            )}
          </div>
          
          <div className="scanner-controls">
            <button 
              onClick={autoScanEnabled ? stopAutoScan : startAutoScan}
              className={autoScanEnabled ? "stop-scan-button" : "start-scan-button"}
              disabled={!stream || error || isScanning}
            >
              {isScanning ? '🔄 Felismerés...' : autoScanEnabled ? '⏹️ Leállítás' : '🎯 Automatikus Felismerés'}
            </button>
            <button 
              onClick={captureImage}
              className="capture-button"
              disabled={!stream || error || isScanning}
            >
              📸 Kép Felismerése
            </button>
          </div>
          
          <div className="manual-input-section">
            <h4>Vagy Írd Be Manuálisan</h4>
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
            <p>🎯 Irányítsd a kamerát a vonalkódra és nyomd meg az "Automatikus Felismerés" gombot</p>
            <p><small>Vagy használd a "Kép Felismerése" gombot egy pillanatfelvételhez</small></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleAutoScanner;
