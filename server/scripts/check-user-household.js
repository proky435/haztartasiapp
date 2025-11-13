const { query, connectDatabase } = require('../src/database/connection');

async function checkUserHousehold() {
  // Initialize database connection
  await connectDatabase();
  try {
    // Check users table structure
    const tableInfo = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('Users table columns:', tableInfo.rows);

    const result = await query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['proky2003@gmail.com']
    );

    console.log('User data:', result.rows[0]);

    if (result.rows[0]?.household_id) {
      const householdResult = await query(
        'SELECT id, name FROM households WHERE id = $1',
        [result.rows[0].household_id]
      );
      console.log('Household data:', householdResult.rows[0]);
    } else {
      console.log('❌ User has no household_id!');
      
      // Check household_members table
      const memberResult = await query(
        'SELECT hm.household_id, h.name as household_name FROM household_members hm JOIN households h ON hm.household_id = h.id WHERE hm.user_id = $1',
        [result.rows[0].id]
      );
      console.log('User household memberships:', memberResult.rows);
      
      // Check available households
      const householdsResult = await query('SELECT id, name FROM households LIMIT 5');
      console.log('Available households:', householdsResult.rows);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserHousehold();
