import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

/**
 * PWA Install Prompt Component
 * "Add to Home Screen" prompt megjelenítése
 */
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Ellenőrizzük, hogy már telepítve van-e
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App már telepítve van (standalone mode)');
      setIsInstalled(true);
      return;
    }

    // Ellenőrizzük iOS Safari-t (nem támogatja a beforeinstallprompt-ot)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    if (isIOS && !isInStandaloneMode) {
      console.log('iOS detected - showing manual install instructions');
      // iOS-en manuális telepítés kell
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return;
    }

    // beforeinstallprompt event figyelése
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Ellenőrizzük, hogy nemrég elutasította-e
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          console.log('Install prompt dismissed recently, not showing');
          return;
        }
      }
      
      // Várunk egy kicsit, mielőtt megjelenítjük
      setTimeout(() => {
        console.log('Showing install prompt');
        setShowPrompt(true);
      }, 5000); // 5 másodperc után
    };

    // App installed event
    const handleAppInstalled = () => {
      console.log('PWA telepítve!');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Debug: ellenőrizzük hogy az event már megtörtént-e
    console.log('Install prompt listener registered');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Prompt megjelenítése
    deferredPrompt.prompt();

    // Várjuk a user választását
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('User elfogadta a telepítést');
    } else {
      console.log('User elutasította a telepítést');
    }

    // Prompt elrejtése
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Emlékezz, hogy elutasította (localStorage)
    localStorage.setItem('pwa-install-dismissed', Date.now());
  };

  // Ne mutassuk, ha már telepítve van
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <button className="install-prompt-close" onClick={handleDismiss}>
          ✕
        </button>
        
        <div className="install-prompt-icon">
          📱
        </div>
        
        <div className="install-prompt-text">
          <h3>Telepítsd az alkalmazást!</h3>
          <p>Gyorsabb hozzáférés, offline működés, push értesítések</p>
        </div>
        
        <button className="install-prompt-button" onClick={handleInstallClick}>
          Telepítés
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
