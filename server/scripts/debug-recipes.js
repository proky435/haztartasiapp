const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function debugRecipes() {
  try {
    await connectDatabase();
    console.log('🔍 Receptek debug információk...\n');

    // 1. Háztartások listája
    console.log('🏠 HÁZTARTÁSOK:');
    const households = await query(`
      SELECT id, name, created_at 
      FROM households 
      ORDER BY created_at
    `);
    
    households.rows.forEach(h => {
      console.log(`   - ${h.name} (ID: ${h.id})`);
    });

    // 2. Felhasználók és háztartásaik
    console.log('\n👥 FELHASZNÁLÓK:');
    const users = await query(`
      SELECT u.id, u.name, u.email
      FROM users u
      ORDER BY u.created_at
    `);
    
    users.rows.forEach(u => {
      console.log(`   - ${u.name} (${u.email})`);
    });

    // 3. Receptek részletesen
    console.log('\n🍳 RECEPTEK:');
    const recipes = await query(`
      SELECT 
        r.id, 
        r.title, 
        r.household_id,
        r.created_by,
        h.name as household_name,
        u.name as creator_name,
        u.email as creator_email
      FROM recipes r
      LEFT JOIN households h ON r.household_id = h.id
      LEFT JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at
    `);
    
    if (recipes.rows.length === 0) {
      console.log('   Nincs recept az adatbázisban');
    } else {
      recipes.rows.forEach(r => {
        console.log(`   - "${r.title}"`);
        console.log(`     Háztartás: ${r.household_name} (${r.household_id})`);
        console.log(`     Létrehozó: ${r.creator_name} (${r.creator_email})`);
        console.log('');
      });
    }

    // 4. Háztartás tagok
    console.log('🏠 HÁZTARTÁS TAGOK:');
    for (const household of households.rows) {
      const members = await query(`
        SELECT u.name, u.email, hm.role 
        FROM household_members hm
        JOIN users u ON hm.user_id = u.id
        WHERE hm.household_id = $1 AND hm.left_at IS NULL
        ORDER BY hm.joined_at
      `, [household.id]);
      
      console.log(`\n   ${household.name} háztartás tagjai:`);
      if (members.rows.length === 0) {
        console.log('     Nincs tag');
      } else {
        members.rows.forEach(m => {
          console.log(`     - ${m.name} (${m.email}) - ${m.role}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Hiba:', error);
  } finally {
    process.exit(0);
  }
}

debugRecipes();
