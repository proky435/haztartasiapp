/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications
const CACHE_NAME = 'haztartasi-app-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'Háztartási App',
    body: 'Új értesítés érkezett',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {}
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
        tag: data.type || 'general',
        requireInteraction: data.requireInteraction || false
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: [200, 100, 200]
    }
  );
  
  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Ne irányítsunk át, ha nincs URL megadva
  const urlToOpen = event.notification.data?.url;
  
  if (!urlToOpen) {
    console.log('No URL specified in notification, skipping navigation');
    return;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Ha már van nyitott ablak, azt használjuk
        for (const client of clientList) {
          if ('focus' in client) {
            // Csak akkor navigáljunk, ha van URL
            if (urlToOpen && !client.url.includes(urlToOpen)) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        
        // Ha nincs nyitott ablak, nyissunk újat
        if (self.clients.openWindow && urlToOpen) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
  
  // Track notification click (optional)
  if (event.notification.data?.notificationId) {
    fetch('/api/v1/push/track-click/' + event.notification.data.notificationId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(err => console.error('Error tracking click:', err));
  }
});

// Background sync (optional - for offline support)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync logic here
      Promise.resolve()
    );
  }
});
