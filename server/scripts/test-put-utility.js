const { query, connectDatabase } = require('../src/database/connection');

async function testPutUtility() {
  await connectDatabase();
  
  try {
    // Check if the utility setting exists
    const checkResult = await query(`
      SELECT * FROM household_utility_settings 
      WHERE household_id = $1 AND utility_type_id = $2
    `, [
      '6f21276c-07c9-42db-a5ac-606f40173b77',
      'd3d9977b-864d-4968-ab1a-80265a67c538'
    ]);

    console.log('Existing utility setting:', checkResult.rows[0]);

    if (checkResult.rows.length === 0) {
      console.log('❌ No utility setting found! Creating one...');
      
      // Create the utility setting first
      const insertResult = await query(`
        INSERT INTO household_utility_settings (
          household_id, 
          utility_type_id, 
          base_fee, 
          current_unit_price, 
          provider_name, 
          is_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        '6f21276c-07c9-42db-a5ac-606f40173b77',
        'd3d9977b-864d-4968-ab1a-80265a67c538',
        1500,
        45.5,
        'Test Provider',
        true
      ]);
      
      console.log('✅ Created utility setting:', insertResult.rows[0]);
    }

    // Test the PUT operation
    const updateResult = await query(`
      UPDATE household_utility_settings 
      SET 
        base_fee = $3,
        current_unit_price = $4,
        provider_name = $5,
        is_enabled = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE household_id = $1 AND utility_type_id = $2
      RETURNING *
    `, [
      '6f21276c-07c9-42db-a5ac-606f40173b77',
      'd3d9977b-864d-4968-ab1a-80265a67c538',
      2000,
      50.0,
      'Updated Provider',
      true
    ]);

    console.log('✅ Updated utility setting:', updateResult.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPutUtility();
