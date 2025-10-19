import React from 'react';
import './CameraWarning.css';

function CameraWarning({ onProceed, onCancel, feature }) {
  const currentUrl = window.location.href;
  const httpsUrl = currentUrl.replace('http://', 'https://');

  return (
    <div className="camera-warning-overlay">
      <div className="camera-warning-container">
        <div className="warning-header">
          <h3>📷 Kamera Hozzáférés Szükséges</h3>
        </div>
        
        <div className="warning-content">
          <p>A <strong>{feature}</strong> funkció használatához kamera hozzáférés szükséges.</p>
          
          <div className="warning-options">
            <div className="option-card recommended">
              <h4>🔒 Ajánlott: HTTPS Használata</h4>
              <p>A kamera funkciók megbízható működéséhez használj HTTPS kapcsolatot:</p>
              <a 
                href={httpsUrl} 
                className="https-link"
                target="_self"
              >
                🚀 Váltás HTTPS-re
              </a>
              <small>Fogadd el a tanúsítvány figyelmeztetést a böngészőben</small>
            </div>

            <div className="option-card alternative">
              <h4>⚠️ Alternatíva: HTTP Próbálkozás</h4>
              <p>Megpróbálhatod HTTP-n is, de korlátozott lehet:</p>
              <button 
                onClick={onProceed}
                className="proceed-button"
              >
                🎯 Próbálkozás HTTP-n
              </button>
              <small>Nem minden böngésző támogatja HTTP-n</small>
            </div>
          </div>

          <div className="manual-option">
            <h4>✋ Manuális Bevitel</h4>
            <p>Vagy add meg az adatokat kézzel:</p>
            <button 
              onClick={onCancel}
              className="manual-button"
            >
              ⌨️ Manuális Bevitel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraWarning;
