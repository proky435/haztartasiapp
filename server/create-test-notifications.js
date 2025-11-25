/**
 * Teszt értesítések létrehozása
 * Futtatás: node create-test-notifications.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function createTestNotifications() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Connecting to database...');
    
    // Lekérjük a proky2003@gmail.com felhasználót
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', ['proky2003@gmail.com']);
    
    if (userResult.rows.length === 0) {
      console.error('❌ A proky2003@gmail.com felhasználó nem található!');
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    
    // Lekérjük a felhasználó háztartását
    const householdResult = await client.query(`
      SELECT h.id 
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1
      LIMIT 1
    `, [userId]);
    
    const householdId = householdResult.rows.length > 0 ? householdResult.rows[0].id : null;
    
    console.log(`✅ User ID: ${userId}`);
    console.log(`✅ Household ID: ${householdId || 'N/A'}`);
    
    // Teszt értesítések
    const notifications = [
      {
        type: 'expiry_warning',
        title: '⚠️ 3 termék hamarosan lejár',
        message: 'Tej (1 nap), Kenyér (2 nap), Sajt (3 nap)',
        data: {
          items: [
            { id: 1, name: 'Tej', daysLeft: 1 },
            { id: 2, name: 'Kenyér', daysLeft: 2 },
            { id: 3, name: 'Sajt', daysLeft: 3 }
          ]
        }
      },
      {
        type: 'low_stock',
        title: '🔴 Alacsony készlet figyelmeztetés',
        message: 'Liszt (0.5 kg), Cukor (0.2 kg)',
        data: {
          items: [
            { id: 4, name: 'Liszt', quantity: 0.5, unit: 'kg' },
            { id: 5, name: 'Cukor', quantity: 0.2, unit: 'kg' }
          ]
        }
      },
      {
        type: 'budget_alert',
        title: '💰 Költségvetés figyelmeztetés',
        message: 'A havi költségvetés 85%-át elérted (102,000 Ft / 120,000 Ft)',
        data: {
          spent: 102000,
          total: 120000,
          percentage: 85
        }
      },
      {
        type: 'recipe_shared',
        title: '🍳 Új recept megosztva',
        message: 'Anna megosztotta veled: "Olasz Pizza"',
        data: {
          recipeId: 123,
          recipeName: 'Olasz Pizza',
          sharedBy: 'Anna'
        }
      },
      {
        type: 'shopping_reminder',
        title: '🛒 Bevásárlólista emlékeztető',
        message: '5 tétel vár a bevásárlólistán',
        data: {
          itemCount: 5
        }
      },
      {
        type: 'success',
        title: '✅ Sikeres mentés',
        message: 'A készlet sikeresen frissítve!',
        data: {}
      }
    ];
    
    console.log('\n📝 Creating test notifications...');
    
    for (const notif of notifications) {
      await client.query(`
        INSERT INTO notifications (user_id, household_id, type, title, message, data, is_read)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, householdId, notif.type, notif.title, notif.message, JSON.stringify(notif.data), false]);
      
      console.log(`   ✅ ${notif.title}`);
    }
    
    // Egy régebbi, már olvasott értesítés
    await client.query(`
      INSERT INTO notifications (user_id, household_id, type, title, message, data, is_read, read_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 days')
    `, [
      userId,
      householdId,
      'info',
      'ℹ️ Rendszer frissítés',
      'Az alkalmazás sikeresen frissítve lett a legújabb verzióra.',
      JSON.stringify({}),
      true
    ]);
    
    console.log(`   ✅ ℹ️ Rendszer frissítés (olvasott)`);
    
    // Statisztika
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
      FROM notifications
      WHERE user_id = $1
    `, [userId]);
    
    console.log('\n📊 Statisztika:');
    console.log(`   Összes értesítés: ${countResult.rows[0].total}`);
    console.log(`   Olvasatlan: ${countResult.rows[0].unread}`);
    
    console.log('\n🎉 Done! Frissítsd a böngészőt (F5)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestNotifications();
