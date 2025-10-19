import React, { useState } from 'react';
import './WelcomeMessage.css';

function WelcomeMessage({ user, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <div className="welcome-header">
          <div className="welcome-icon">👋</div>
          <h2>Üdvözlünk, {user.name}!</h2>
          <button className="close-welcome" onClick={handleDismiss}>×</button>
        </div>
        
        <div className="welcome-content">
          <p>Örülünk, hogy csatlakoztál a Háztartási App-hoz!</p>
          
          <div className="feature-highlights">
            <div className="feature-item">
              <span className="feature-icon">📦</span>
              <div>
                <h4>Készletkezelés</h4>
                <p>Kövesd nyomon a háztartásod készleteit és lejárati dátumokat</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">🛒</span>
              <div>
                <h4>Bevásárlólista</h4>
                <p>Automatikus bevásárlólista az elfogyott termékekből</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">📱</span>
              <div>
                <h4>Vonalkód Scanner</h4>
                <p>Gyors termék hozzáadás vonalkód beolvasással</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">📅</span>
              <div>
                <h4>Dátum Felismerés</h4>
                <p>OCR technológiával automatikus lejárati dátum felismerés</p>
              </div>
            </div>
          </div>
          
          <div className="welcome-tips">
            <h4>💡 Tippek a kezdéshez:</h4>
            <ul>
              <li>Kezdd azzal, hogy hozzáadsz néhány terméket a készletedhez</li>
              <li>Használd a vonalkód scannert a gyors hozzáadáshoz</li>
              <li>Ellenőrizd rendszeresen a lejárati dátumokat</li>
              <li>A bevásárlólistád automatikusan frissül az elfogyott termékekkel</li>
            </ul>
          </div>
        </div>
        
        <div className="welcome-footer">
          <button className="start-button" onClick={handleDismiss}>
            🚀 Kezdjük el!
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeMessage;
