const { connectDatabase, query } = require('../src/database/connection');
require('dotenv').config();

async function setTestCosts() {
  await connectDatabase();
  
  const result = await query(`
    UPDATE household_costs 
    SET 
      common_utility_cost = $2,
      maintenance_cost = $3,
      other_monthly_costs = $4
    WHERE household_id = $1
    RETURNING *
  `, ['6f21276c-07c9-42db-a5ac-606f40173b77', 2000, 1500, 500]);
  
  console.log('Teszt költségek beállítva:', result.rows[0]);
}

setTestCosts().catch(console.error);
