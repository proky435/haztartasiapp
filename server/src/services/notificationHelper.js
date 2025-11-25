const { query } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Notification Helper Service
 * In-app értesítések létrehozására szolgáló helper függvények
 */

/**
 * Értesítés létrehozása egy felhasználónak
 */
async function createNotification({ userId, householdId, type, title, message, data = {} }) {
  try {
    const result = await query(`
      INSERT INTO notifications (user_id, household_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, householdId, type, title, message, JSON.stringify(data)]);

    logger.info(`Értesítés létrehozva: ${title} (User: ${userId})`);
    return result.rows[0];
  } catch (error) {
    logger.error('Értesítés létrehozási hiba:', error);
    throw error;
  }
}

/**
 * Értesítés létrehozása egy háztartás összes tagjának
 */
async function createNotificationForHousehold({ householdId, type, title, message, data = {}, excludeUserId = null }) {
  try {
    logger.info('🏠 createNotificationForHousehold hívva', { householdId, type, title, excludeUserId });
    
    // Lekérjük a háztartás tagjait
    const membersResult = await query(`
      SELECT user_id
      FROM household_members
      WHERE household_id = $1
      ${excludeUserId ? 'AND user_id != $2' : ''}
    `, excludeUserId ? [householdId, excludeUserId] : [householdId]);

    const members = membersResult.rows;
    logger.info(`👥 Háztartás tagjai: ${members.length} fő`, { members: members.map(m => m.user_id) });

    if (members.length === 0) {
      logger.warn(`Nincs tag a háztartásban: ${householdId}`);
      return [];
    }

    // Értesítés létrehozása minden tagnak
    const notifications = [];
    for (const member of members) {
      logger.info(`📨 Értesítés létrehozása: ${member.user_id}`);
      const notification = await createNotification({
        userId: member.user_id,
        householdId,
        type,
        title,
        message,
        data
      });
      notifications.push(notification);
      logger.info(`✅ Értesítés létrehozva: ${notification.id}`);
    }

    logger.info(`${notifications.length} értesítés létrehozva a háztartásnak: ${householdId}`);
    return notifications;
  } catch (error) {
    logger.error('Háztartás értesítés létrehozási hiba:', error);
    throw error;
  }
}

/**
 * Lejáró termékek értesítés
 */
async function notifyExpiringProducts({ userId, householdId, products }) {
  if (!products || products.length === 0) return;

  const productNames = products.slice(0, 3).map(p => p.name).join(', ');
  const moreCount = products.length > 3 ? ` (+${products.length - 3} további)` : '';

  await createNotification({
    userId,
    householdId,
    type: 'expiry_warning',
    title: `⚠️ ${products.length} termék hamarosan lejár`,
    message: `${productNames}${moreCount}`,
    data: { products: products.map(p => ({ id: p.id, name: p.name, daysLeft: p.daysLeft })) }
  });
}

/**
 * Alacsony készlet értesítés
 */
async function notifyLowStock({ userId, householdId, products }) {
  if (!products || products.length === 0) return;

  const productNames = products.slice(0, 3).map(p => p.name).join(', ');
  const moreCount = products.length > 3 ? ` (+${products.length - 3} további)` : '';

  await createNotification({
    userId,
    householdId,
    type: 'low_stock',
    title: `🔴 ${products.length} termék alacsony készleten`,
    message: `${productNames}${moreCount}`,
    data: { products: products.map(p => ({ id: p.id, name: p.name, quantity: p.quantity, unit: p.unit })) }
  });
}

/**
 * Termék hozzáadva értesítés
 */
async function notifyProductAdded({ userId, householdId, productName, quantity, unit }) {
  logger.info('🔔 notifyProductAdded hívva', { userId, householdId, productName, quantity, unit });
  
  // Lekérjük a felhasználó nevét
  const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
  const userName = userResult.rows[0]?.name || 'Valaki';
  
  const result = await createNotificationForHousehold({
    householdId,
    type: 'success',
    title: '✅ Új termék hozzáadva',
    message: `${userName} hozzáadta: ${productName} (${quantity} ${unit})`,
    data: { productName, quantity, unit, addedBy: userName, addedByUserId: userId }
    // Mindenki kapjon értesítést, beleértve azt is aki hozzáadta
  });
  
  logger.info('🔔 notifyProductAdded befejezve', { notificationCount: result?.length || 0 });
  return result;
}

/**
 * Termék törölve értesítés
 */
async function notifyProductDeleted({ userId, householdId, productName }) {
  // Lekérjük a felhasználó nevét
  const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
  const userName = userResult.rows[0]?.name || 'Valaki';
  
  await createNotificationForHousehold({
    householdId,
    type: 'info',
    title: 'ℹ️ Termék törölve',
    message: `${userName} eltávolította: ${productName}`,
    data: { productName, deletedBy: userName, deletedByUserId: userId }
    // Mindenki kapjon értesítést
  });
}

/**
 * Bevásárlólista tétel hozzáadva
 */
async function notifyShoppingItemAdded({ userId, householdId, itemName }) {
  // Lekérjük a felhasználó nevét
  const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
  const userName = userResult.rows[0]?.name || 'Valaki';
  
  await createNotificationForHousehold({
    householdId,
    type: 'shopping_reminder',
    title: '🛒 Új tétel a bevásárlólistán',
    message: `${userName} hozzáadta: ${itemName}`,
    data: { itemName, addedBy: userName, addedByUserId: userId }
    // Mindenki kapjon értesítést
  });
}

/**
 * Bevásárlólista tétel megvásárolva
 */
async function notifyShoppingItemPurchased({ userId, householdId, itemName }) {
  // Lekérjük a felhasználó nevét
  const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
  const userName = userResult.rows[0]?.name || 'Valaki';
  
  await createNotificationForHousehold({
    householdId,
    type: 'success',
    title: '✅ Tétel megvásárolva',
    message: `${userName} megvásárolta: ${itemName}`,
    data: { itemName, purchasedBy: userName, purchasedByUserId: userId }
    // Mindenki kapjon értesítést
  });
}

/**
 * Recept megosztva
 */
async function notifyRecipeShared({ userId, householdId, recipeName, sharedByName }) {
  await createNotification({
    userId,
    householdId,
    type: 'recipe_shared',
    title: '🍳 Új recept megosztva',
    message: `${sharedByName} megosztotta: "${recipeName}"`,
    data: { recipeName, sharedByName }
  });
}

/**
 * Pazarlás figyelmeztetés
 */
async function notifyWasteAlert({ userId, householdId, wastedProducts }) {
  if (!wastedProducts || wastedProducts.length === 0) return;

  const productNames = wastedProducts.slice(0, 3).map(p => p.name).join(', ');
  const moreCount = wastedProducts.length > 3 ? ` (+${wastedProducts.length - 3} további)` : '';

  await createNotification({
    userId,
    householdId,
    type: 'waste_alert',
    title: '🗑️ Pazarlás figyelmeztetés',
    message: `${wastedProducts.length} termék lejárt: ${productNames}${moreCount}`,
    data: { wastedProducts: wastedProducts.map(p => ({ id: p.id, name: p.name })) }
  });
}

module.exports = {
  createNotification,
  createNotificationForHousehold,
  notifyExpiringProducts,
  notifyLowStock,
  notifyProductAdded,
  notifyProductDeleted,
  notifyShoppingItemAdded,
  notifyShoppingItemPurchased,
  notifyRecipeShared,
  notifyWasteAlert
};
