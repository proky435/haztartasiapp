import { useState, useEffect } from 'react';

// Custom hook for PWA functionality
export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = window.navigator.standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('PWA: App is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('PWA: App is offline');
      setIsOnline(false);
    };

    // Service Worker update detection
    const handleSWUpdate = () => {
      console.log('PWA: Service Worker update available');
      setUpdateAvailable(true);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker registration and update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', handleSWUpdate);
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install the PWA
  const installPWA = async () => {
    if (!deferredPrompt) {
      console.log('PWA: No install prompt available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA: User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA: Error during installation:', error);
      return false;
    }
  };

  // Update the service worker
  const updateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.waiting) {
          // Send message to waiting SW to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Reload the page to activate the new SW
          window.location.reload();
        }
      } catch (error) {
        console.error('PWA: Error updating service worker:', error);
      }
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('PWA: This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log(`PWA: Notification permission: ${permission}`);
      return permission === 'granted';
    } catch (error) {
      console.error('PWA: Error requesting notification permission:', error);
      return false;
    }
  };

  // Show local notification
  const showNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    
    console.log('PWA: Notification permission not granted');
    return null;
  };

  // Get app info
  const getAppInfo = () => ({
    isInstallable,
    isInstalled,
    isOnline,
    updateAvailable,
    canInstall: isInstallable && !isInstalled,
    isPWA: isInstalled
  });

  return {
    // State
    isInstallable,
    isInstalled,
    isOnline,
    updateAvailable,
    
    // Actions
    installPWA,
    updateServiceWorker,
    requestNotificationPermission,
    showNotification,
    getAppInfo,
    
    // Computed
    canInstall: isInstallable && !isInstalled,
    isPWA: isInstalled
  };
};

export default usePWA;
