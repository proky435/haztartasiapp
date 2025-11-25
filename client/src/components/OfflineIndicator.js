import React, { useState, useEffect } from 'react';
import './OfflineIndicator.css';

/**
 * Offline Indicator Component
 * Jelzi, ha nincs internetkapcsolat
 */
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: ONLINE');
      setIsOnline(true);
      setShowIndicator(true);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      console.log('Network: OFFLINE');
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      console.log('Initial state: OFFLINE');
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) {
    return null;
  }

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="offline-indicator-content">
        {isOnline ? (
          <>
            <span className="offline-icon">✓</span>
            <span>Kapcsolat helyreállt</span>
          </>
        ) : (
          <>
            <span className="offline-icon">⚠</span>
            <span>Offline mód - Korlátozott funkciók</span>
          </>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
