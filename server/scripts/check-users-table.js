const { connectDatabase } = require('../src/database/connection');
const { query } = require('../src/database/connection');

async function checkUsersTable() {
  try {
    await connectDatabase();
    console.log('🔍 Users tábla struktúra ellenőrzése...\n');

    // Users tábla oszlopai
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('👥 USERS tábla oszlopai:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Household_members tábla ellenőrzése
    console.log('\n🏠 HOUSEHOLD_MEMBERS tábla ellenőrzése:');
    const householdMembersExists = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'household_members'
    `);

    if (householdMembersExists.rows.length > 0) {
      console.log('✅ household_members tábla létezik');
      
      const memberColumns = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'household_members'
        ORDER BY ordinal_position
      `);
      
      console.log('   Oszlopai:');
      memberColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });

      // Household members adatok
      const members = await query(`
        SELECT hm.*, u.name, u.email, h.name as household_name
        FROM household_members hm
        JOIN users u ON hm.user_id = u.id
        JOIN households h ON hm.household_id = h.id
        ORDER BY h.name, u.name
      `);
      
      console.log('\n   Jelenlegi tagságok:');
      members.rows.forEach(m => {
        console.log(`   - ${m.name} (${m.email}) → ${m.household_name} (${m.role})`);
      });

    } else {
      console.log('❌ household_members tábla NEM létezik');
    }

  } catch (error) {
    console.error('❌ Hiba:', error);
  } finally {
    process.exit(0);
  }
}

checkUsersTable();
