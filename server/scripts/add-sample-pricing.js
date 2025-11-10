const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function addSamplePricing() {
  try {
    console.log('🔄 Minta árbeállítások hozzáadása...');
    
    await connectDatabase();
    
    // Első háztartás lekérése
    const householdResult = await query('SELECT id FROM households LIMIT 1');
    if (householdResult.rows.length === 0) {
      console.log('❌ Nincs háztartás az adatbázisban');
      process.exit(1);
    }
    
    const householdId = householdResult.rows[0].id;
    console.log(`📋 Háztartás ID: ${householdId}`);
    
    // Közműtípusok lekérése
    const utilityTypes = await query('SELECT id, name, display_name FROM utility_types ORDER BY sort_order');
    
    for (const utilityType of utilityTypes.rows) {
      let baseFee, unitPrice, commonCost, providerName;
      
      switch (utilityType.name) {
        case 'electricity':
          baseFee = 2500; // Ft/hó
          unitPrice = 70; // Ft/kWh
          commonCost = 800; // Ft/hó közös
          providerName = 'E.ON Energiaszolgáltató';
          break;
        case 'gas':
          baseFee = 1800;
          unitPrice = 280; // Ft/m³
          commonCost = 0;
          providerName = 'FŐGÁZ';
          break;
        case 'water_cold':
          baseFee = 1200;
          unitPrice = 580; // Ft/m³
          commonCost = 400;
          providerName = 'Fővárosi Vízművek';
          break;
        case 'water_hot':
          baseFee = 0; // Elektromos, nincs külön alapdíj
          unitPrice = 70; // Ft/kWh (ugyanaz mint villany)
          commonCost = 0;
          providerName = 'Saját elektromos bojler';
          break;
        case 'heating':
          baseFee = 3500;
          unitPrice = 8500; // Ft/GJ
          commonCost = 1200;
          providerName = 'FŐTÁV';
          break;
        default:
          continue;
      }
      
      try {
        await query(`
          INSERT INTO household_utility_settings 
          (household_id, utility_type_id, base_fee, current_unit_price, common_cost, 
           provider_name, auto_calculate_cost, price_valid_from, is_enabled)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_DATE, TRUE)
          ON CONFLICT (household_id, utility_type_id) 
          DO UPDATE SET
            base_fee = EXCLUDED.base_fee,
            current_unit_price = EXCLUDED.current_unit_price,
            common_cost = EXCLUDED.common_cost,
            provider_name = EXCLUDED.provider_name,
            auto_calculate_cost = TRUE,
            price_valid_from = CURRENT_DATE
        `, [householdId, utilityType.id, baseFee, unitPrice, commonCost, providerName]);
        
        console.log(`  ✅ ${utilityType.display_name}:`);
        console.log(`     Alapdíj: ${baseFee} Ft/hó`);
        console.log(`     Egységár: ${unitPrice} Ft/egység`);
        console.log(`     Közös költség: ${commonCost} Ft/hó`);
        console.log(`     Szolgáltató: ${providerName}`);
        console.log(`     Képlet: ${baseFee} + (${unitPrice} × fogyasztás) + ${commonCost}`);
        console.log('');
      } catch (error) {
        console.log(`  ❌ ${utilityType.display_name}: ${error.message}`);
      }
    }
    
    // Ellenőrzés
    console.log('📊 Beállított árak:');
    const settings = await query(`
      SELECT 
        ut.display_name,
        ut.unit,
        hus.base_fee,
        hus.current_unit_price,
        hus.common_cost,
        hus.provider_name,
        hus.auto_calculate_cost
      FROM household_utility_settings hus
      JOIN utility_types ut ON hus.utility_type_id = ut.id
      WHERE hus.household_id = $1
      ORDER BY ut.sort_order
    `, [householdId]);
    
    settings.rows.forEach(setting => {
      const totalExample = setting.base_fee + (setting.current_unit_price * 100) + setting.common_cost;
      console.log(`\n🔌 ${setting.display_name}:`);
      console.log(`   Alapdíj: ${setting.base_fee} Ft`);
      console.log(`   Egységár: ${setting.current_unit_price} Ft/${setting.unit}`);
      console.log(`   Közös: ${setting.common_cost} Ft`);
      console.log(`   Szolgáltató: ${setting.provider_name}`);
      console.log(`   Példa 100 ${setting.unit} fogyasztásra: ${totalExample} Ft`);
    });
    
    console.log('\n🎉 Minta árbeállítások sikeresen hozzáadva!');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addSamplePricing();
