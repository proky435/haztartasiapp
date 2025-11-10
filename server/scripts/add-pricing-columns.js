const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function addPricingColumns() {
  try {
    console.log('🔄 Árbeállítások oszlopok hozzáadása...');
    
    await connectDatabase();
    
    const alterQueries = [
      // Alapdíj (havi fix költség)
      `ALTER TABLE household_utility_settings ADD COLUMN IF NOT EXISTS base_fee DECIMAL(8,2) DEFAULT 0`,
      
      // Közös költség
      `ALTER TABLE household_utility_settings ADD COLUMN IF NOT EXISTS common_cost DECIMAL(8,2) DEFAULT 0`,
      
      // Árváltozás dátuma
      `ALTER TABLE household_utility_settings ADD COLUMN IF NOT EXISTS price_valid_from DATE DEFAULT CURRENT_DATE`,
      
      // Automatikus számítás engedélyezése
      `ALTER TABLE household_utility_settings ADD COLUMN IF NOT EXISTS auto_calculate_cost BOOLEAN DEFAULT TRUE`,
      
      // Szolgáltató neve
      `ALTER TABLE household_utility_settings ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100)`,
      
      // Ügyfélszám
      `ALTER TABLE household_utility_settings ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50)`
    ];
    
    for (const [index, alterQuery] of alterQueries.entries()) {
      try {
        await query(alterQuery);
        console.log(`✅ ${index + 1}. oszlop hozzáadva`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ ${index + 1}. oszlop már létezik`);
        } else {
          console.log(`❌ ${index + 1}. hiba:`, error.message);
        }
      }
    }
    
    // Ellenőrzés
    const columns = await query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'household_utility_settings' 
        AND column_name IN ('base_fee', 'common_cost', 'price_valid_from', 'auto_calculate_cost', 'provider_name', 'customer_number')
      ORDER BY column_name
    `);
    
    console.log('\n📊 Hozzáadott oszlopok:');
    columns.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n🎉 Oszlopok sikeresen hozzáadva!');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addPricingColumns();
