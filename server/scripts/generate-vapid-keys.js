const webpush = require('web-push');

/**
 * VAPID kulcsok generálása Web Push-hoz
 * Ezeket a .env fájlba kell másolni
 */

console.log('🔑 VAPID Kulcsok Generálása\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Másold be ezeket a .env fájlba:\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_SUBJECT=mailto:proky2003@gmail.com');
console.log('\n✅ Kész!');
