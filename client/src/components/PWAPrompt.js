import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import './PWAPrompt.css';

const PWAPrompt = () => {
  const {
    isInstallable,
    isOnline,
    updateAvailable,
    installPWA,
    updateServiceWorker,
    requestNotificationPermission,
    canInstall
  } = usePWA();

  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(true);
  const [showOfflinePrompt, setShowOfflinePrompt] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  // Handle PWA installation
  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const installed = await installPWA();
      
      if (installed) {
        setShowInstallPrompt(false);
        
        // Request notification permission after install
        setTimeout(() => {
          requestNotificationPermission();
        }, 1000);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Handle service worker update
  const handleUpdate = () => {
    updateServiceWorker();
    setShowUpdatePrompt(false);
  };

  // Dismiss prompts
  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Remember user choice for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  const dismissUpdatePrompt = () => {
    setShowUpdatePrompt(false);
  };

  const dismissOfflinePrompt = () => {
    setShowOfflinePrompt(false);
  };

  // Check if install prompt was already dismissed
  const wasInstallDismissed = sessionStorage.getItem('pwa-install-dismissed');

  return (
    <>
      {/* Install Prompt */}
      {canInstall && showInstallPrompt && !wasInstallDismissed && (
        <div className="pwa-prompt pwa-install-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-icon">📱</div>
            <div className="pwa-prompt-text">
              <h4>Telepítsd az alkalmazást!</h4>
              <p>Gyorsabb hozzáférés és offline használat</p>
            </div>
            <div className="pwa-prompt-actions">
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={handleInstall}
                disabled={isInstalling}
              >
                {isInstalling ? 'Telepítés...' : 'Telepítés'}
              </button>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={dismissInstallPrompt}
              >
                Később
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Prompt */}
      {updateAvailable && showUpdatePrompt && (
        <div className="pwa-prompt pwa-update-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-icon">🔄</div>
            <div className="pwa-prompt-text">
              <h4>Frissítés elérhető!</h4>
              <p>Új funkciók és hibajavítások</p>
            </div>
            <div className="pwa-prompt-actions">
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={handleUpdate}
              >
                Frissítés
              </button>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={dismissUpdatePrompt}
              >
                Később
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && showOfflinePrompt && (
        <div className="pwa-prompt pwa-offline-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-icon">📡</div>
            <div className="pwa-prompt-text">
              <h4>Offline módban vagy</h4>
              <p>Egyes funkciók korlátozottan elérhetők</p>
            </div>
            <div className="pwa-prompt-actions">
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={dismissOfflinePrompt}
              >
                Értem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAPrompt;
