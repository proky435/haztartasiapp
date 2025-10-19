// Kamera utility funkciók és polyfill

// getUserMedia polyfill régebbi böngészőkhöz
export const getUserMediaPolyfill = () => {
  // Modern getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  }

  // Régebbi API-k fallback
  const getUserMedia = 
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  if (getUserMedia) {
    return (constraints) => {
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  return null;
};

// Ellenőrzi, hogy elérhető-e a kamera
export const isCameraSupported = () => {
  const getUserMedia = getUserMediaPolyfill();
  return getUserMedia !== null;
};

// Biztonságos kamera hozzáférés
export const safeGetUserMedia = async (constraints) => {
  const getUserMedia = getUserMediaPolyfill();
  
  if (!getUserMedia) {
    throw new Error('Kamera hozzáférés nem támogatott ebben a böngészőben');
  }

  try {
    return await getUserMedia(constraints);
  } catch (error) {
    console.error('Kamera hozzáférési hiba:', error);
    
    // Próbáljunk egyszerűbb constraints-ekkel
    if (constraints.video && typeof constraints.video === 'object') {
      try {
        return await getUserMedia({ video: true });
      } catch (fallbackError) {
        throw new Error(`Kamera hozzáférés sikertelen: ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
};

// HTTPS ellenőrzés
export const isSecureContext = () => {
  return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
};

// Kamera engedélyek ellenőrzése
export const checkCameraPermissions = async () => {
  if (!navigator.permissions) {
    return 'unknown';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    return permission.state; // 'granted', 'denied', 'prompt'
  } catch (error) {
    return 'unknown';
  }
};
