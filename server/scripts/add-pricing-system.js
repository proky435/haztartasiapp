const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function addPricingSystem() {
  try {
    console.log('🔄 Árkalkulátor rendszer hozzáadása...');
    
    await connectDatabase();
    
    // 1. Új oszlopok hozzáadása a household_utility_settings táblához
    console.log('📊 Árbeállítások oszlopok hozzáadása...');
    
    const alterQueries = [
      // Alapdíj (havi fix költség)
      `ALTER TABLE household_utility_settings 
       ADD COLUMN IF NOT EXISTS base_fee DECIMAL(8,2) DEFAULT 0 
       COMMENT 'Havi alapdíj (Ft)'`,
      
      // Egységár (már létezik, de frissítjük a kommentet)
      `COMMENT ON COLUMN household_utility_settings.current_unit_price IS 'Egységár (Ft/kWh, Ft/m³, Ft/GJ)'`,
      
      // Közös költség
      `ALTER TABLE household_utility_settings 
       ADD COLUMN IF NOT EXISTS common_cost DECIMAL(8,2) DEFAULT 0 
       COMMENT 'Havi közös költség (Ft)'`,
      
      // Árváltozás dátuma
      `ALTER TABLE household_utility_settings 
       ADD COLUMN IF NOT EXISTS price_valid_from DATE DEFAULT CURRENT_DATE 
       COMMENT 'Ár érvényességi dátuma'`,
      
      // Automatikus számítás engedélyezése
      `ALTER TABLE household_utility_settings 
       ADD COLUMN IF NOT EXISTS auto_calculate_cost BOOLEAN DEFAULT TRUE 
       COMMENT 'Automatikus költségszámítás engedélyezve'`,
      
      // Szolgáltató neve
      `ALTER TABLE household_utility_settings 
       ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100) 
       COMMENT 'Szolgáltató neve'`,
      
      // Ügyfélszám
      `ALTER TABLE household_utility_settings 
       ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50) 
       COMMENT 'Ügyfélszám'`
    ];
    
    for (const alterQuery of alterQueries) {
      try {
        await query(alterQuery);
        console.log('✅ Oszlop hozzáadva');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('már létezik')) {
          console.log('⚠️ Oszlop már létezik, kihagyás');
        } else {
          console.log('❌ Hiba:', error.message);
        }
      }
    }
    
    // 2. Új tábla: utility_price_history (árelőzmények)
    console.log('\n📈 Árelőzmények tábla létrehozása...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS utility_price_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
        base_fee DECIMAL(8,2) NOT NULL DEFAULT 0,
        unit_price DECIMAL(8,2) NOT NULL DEFAULT 0,
        common_cost DECIMAL(8,2) NOT NULL DEFAULT 0,
        valid_from DATE NOT NULL,
        valid_to DATE,
        provider_name VARCHAR(100),
        notes TEXT,
        created_by_user_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ utility_price_history tábla létrehozva');
    
    // 3. Indexek az új táblához
    await query('CREATE INDEX IF NOT EXISTS idx_price_history_household_utility ON utility_price_history(household_id, utility_type_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_price_history_dates ON utility_price_history(valid_from, valid_to)');
    
    console.log('✅ Indexek létrehozva');
    
    // 4. Trigger függvény frissítése a költségszámításhoz
    console.log('\n⚙️ Költségszámítás trigger frissítése...');
    
    await query(`
      CREATE OR REPLACE FUNCTION calculate_utility_cost()
      RETURNS TRIGGER AS $$
      DECLARE
        settings_record RECORD;
        calculated_cost DECIMAL(10,2);
        consumption_amount DECIMAL(10,3);
      BEGIN
        -- Ha nincs fogyasztás, nem számolunk költséget
        IF NEW.consumption IS NULL OR NEW.consumption <= 0 THEN
          NEW.cost := NULL;
          RETURN NEW;
        END IF;
        
        -- Beállítások lekérése
        SELECT 
          base_fee,
          current_unit_price,
          common_cost,
          auto_calculate_cost
        INTO settings_record
        FROM household_utility_settings 
        WHERE household_id = NEW.household_id 
          AND utility_type_id = NEW.utility_type_id;
        
        -- Ha nincs beállítás vagy nincs automatikus számítás
        IF NOT FOUND OR NOT COALESCE(settings_record.auto_calculate_cost, FALSE) THEN
          -- Régi módszer: egységár * fogyasztás
          IF NEW.unit_price IS NOT NULL AND NEW.unit_price > 0 THEN
            NEW.cost := NEW.unit_price * NEW.consumption;
          END IF;
          RETURN NEW;
        END IF;
        
        -- Új módszer: Alapdíj + (Egységár * Fogyasztás) + Közös költség
        calculated_cost := COALESCE(settings_record.base_fee, 0);
        
        IF settings_record.current_unit_price IS NOT NULL AND settings_record.current_unit_price > 0 THEN
          calculated_cost := calculated_cost + (settings_record.current_unit_price * NEW.consumption);
        END IF;
        
        calculated_cost := calculated_cost + COALESCE(settings_record.common_cost, 0);
        
        NEW.cost := calculated_cost;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Trigger függvény frissítve');
    
    // 5. Mintaadatok hozzáadása
    console.log('\n📝 Minta árbeállítások hozzáadása...');
    
    // Első háztartás lekérése
    const householdResult = await query('SELECT id FROM households LIMIT 1');
    if (householdResult.rows.length > 0) {
      const householdId = householdResult.rows[0].id;
      
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
          
          console.log(`  ✅ ${utilityType.display_name}: ${baseFee} Ft alapdíj + ${unitPrice} Ft/egység + ${commonCost} Ft közös`);
        } catch (error) {
          console.log(`  ❌ ${utilityType.display_name}: ${error.message}`);
        }
      }
    }
    
    // 6. Ellenőrzés
    console.log('\n📋 Frissített táblák ellenőrzése...');
    
    const tables = await query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_name IN ('household_utility_settings', 'utility_price_history')
      ORDER BY table_name
    `);
    
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name} (${row.column_count} oszlop)`);
    });
    
    console.log('\n🎉 Árkalkulátor rendszer sikeresen hozzáadva!');
    console.log('\n💡 Új funkciók:');
    console.log('  - Alapdíj beállítása');
    console.log('  - Egységár kezelése');
    console.log('  - Közös költség');
    console.log('  - Automatikus költségszámítás');
    console.log('  - Árelőzmények tárolása');
    console.log('  - Szolgáltató adatok');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addPricingSystem();
