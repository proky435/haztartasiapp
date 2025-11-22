const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

/**
 * Bevásárlólista tisztítása és új tételek hozzáadása
 */

async function cleanShoppingList() {
  try {
    console.log('🧹 Bevásárlólista Tisztítása\n');
    
    await connectDatabase();
    console.log('✅ Adatbázis kapcsolat OK\n');
    
    // Felhasználó keresése
    const userResult = await query(`
      SELECT id FROM users WHERE email = 'proky2003@gmail.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Felhasználó nem található!');
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    
    // Háztartás keresése
    const householdResult = await query(`
      SELECT h.id 
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1 AND hm.left_at IS NULL
      LIMIT 1
    `, [userId]);
    
    if (householdResult.rows.length === 0) {
      console.log('❌ Nincs háztartás!');
      process.exit(1);
    }
    
    const householdId = householdResult.rows[0].id;
    console.log(`✅ Háztartás: ${householdId}\n`);
    
    // Összes bevásárlólista lekérése
    const listsResult = await query(`
      SELECT id, name FROM shopping_lists
      WHERE household_id = $1
    `, [householdId]);
    
    console.log(`📋 Talált bevásárlólisták: ${listsResult.rows.length}\n`);
    
    // Minden lista tételeinek törlése
    for (const list of listsResult.rows) {
      console.log(`🗑️  Lista: ${list.name} (${list.id})`);
      
      const deleteResult = await query(`
        DELETE FROM shopping_list_items
        WHERE shopping_list_id = $1
      `, [list.id]);
      
      console.log(`   ✅ ${deleteResult.rowCount} tétel törölve\n`);
    }
    
    console.log('✅ Bevásárlólista tisztítva!\n');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

cleanShoppingList();
