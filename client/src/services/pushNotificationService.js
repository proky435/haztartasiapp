import api from './api';

/**
 * Push Notification Service
 * Web Push API kezelése
 */

let vapidPublicKey = null;

/**
 * URL-safe Base64 konvertálás
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * VAPID public key lekérése
 */
async function getVapidPublicKey() {
  if (vapidPublicKey) {
    return vapidPublicKey;
  }

  try {
    const response = await api.get('/push/vapid-public-key');
    vapidPublicKey = response.publicKey;
    return vapidPublicKey;
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    throw error;
  }
}

/**
 * Service Worker regisztrálása vagy meglévő lekérése
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker nem támogatott ebben a böngészőben');
  }

  try {
    // Először nézzük meg, van-e már regisztrált Service Worker
    const existingRegistration = await navigator.serviceWorker.getRegistration();
    if (existingRegistration) {
      console.log('Service Worker már regisztrálva:', existingRegistration);
      return existingRegistration;
    }

    // Ha nincs, regisztráljuk
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker újonnan regisztrálva:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker regisztráció sikertelen:', error);
    throw error;
  }
}

/**
 * Push notification támogatás ellenőrzése
 */
function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Notification engedély kérése
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notification API nem támogatott');
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

/**
 * Push notification feliratkozás
 */
async function subscribeToPushNotifications(deviceName = null) {
  try {
    // Ellenőrizzük a támogatást
    if (!isPushNotificationSupported()) {
      throw new Error('Push notification nem támogatott ebben a böngészőben');
    }

    // Kérjük az engedélyt
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification engedély megtagadva');
    }

    // Service Worker regisztrálása
    const registration = await registerServiceWorker();
    
    // Várjuk meg, amíg a Service Worker aktív lesz
    await navigator.serviceWorker.ready;

    // VAPID public key lekérése
    const publicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Push subscription létrehozása
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log('Push subscription létrehozva:', subscription);

    // Subscription mentése a backend-en
    await api.post('/push/subscribe', {
      subscription: subscription.toJSON(),
      deviceName: deviceName || getDeviceName()
    });

    console.log('Push subscription mentve a backend-en');
    return { success: true, subscription };

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Push notification leiratkozás
 */
async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('Nincs aktív push subscription');
      return { success: true, message: 'Nincs aktív feliratkozás' };
    }

    // Leiratkozás a backend-en
    await api.post('/push/unsubscribe', {
      endpoint: subscription.endpoint
    });

    // Leiratkozás a böngészőben
    const unsubscribed = await subscription.unsubscribe();
    console.log('Push subscription törölve:', unsubscribed);

    return { success: true };

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

/**
 * Jelenlegi subscription lekérése
 */
async function getCurrentSubscription() {
  try {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;

  } catch (error) {
    console.error('Error getting current subscription:', error);
    return null;
  }
}

/**
 * Feliratkozás állapotának ellenőrzése
 */
async function isSubscribed() {
  try {
    const subscription = await getCurrentSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Felhasználó összes subscription-je (backend-ről)
 */
async function getUserSubscriptions() {
  try {
    const response = await api.get('/push/subscriptions');
    return response.subscriptions || [];
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    throw error;
  }
}

/**
 * Teszt notification küldése
 */
async function sendTestNotification() {
  try {
    const response = await api.post('/push/test');
    return response;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
}

/**
 * Eszköz név meghatározása
 */
function getDeviceName() {
  const userAgent = navigator.userAgent;
  
  if (/mobile/i.test(userAgent)) {
    if (/android/i.test(userAgent)) return 'Android Telefon';
    if (/iphone/i.test(userAgent)) return 'iPhone';
    return 'Mobil Eszköz';
  }
  
  if (/tablet/i.test(userAgent)) {
    if (/ipad/i.test(userAgent)) return 'iPad';
    return 'Tablet';
  }
  
  if (/windows/i.test(userAgent)) return 'Windows PC';
  if (/mac/i.test(userAgent)) return 'Mac';
  if (/linux/i.test(userAgent)) return 'Linux PC';
  
  return 'Számítógép';
}

export default {
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentSubscription,
  isSubscribed,
  getUserSubscriptions,
  sendTestNotification,
  getVapidPublicKey
};
