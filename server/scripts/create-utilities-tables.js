const { query, connectDatabase } = require('../src/database/connection');
require('dotenv').config();

async function createUtilitiesTables() {
  try {
    console.log('🔄 Utilities táblák létrehozása...');
    
    // Adatbázis kapcsolat
    await connectDatabase();
    
    // 1. utility_types tábla
    console.log('📊 utility_types tábla létrehozása...');
    await query(`
      CREATE TABLE IF NOT EXISTS utility_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        unit VARCHAR(10) NOT NULL,
        icon VARCHAR(20) DEFAULT '⚡',
        color VARCHAR(7) DEFAULT '#3498db',
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ utility_types tábla létrehozva');
    
    // 2. household_utilities tábla
    console.log('🏠 household_utilities tábla létrehozása...');
    await query(`
      CREATE TABLE IF NOT EXISTS household_utilities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
        reading_date DATE NOT NULL,
        meter_reading DECIMAL(12,3) NOT NULL CHECK (meter_reading >= 0),
        previous_reading DECIMAL(12,3),
        consumption DECIMAL(10,3),
        unit_price DECIMAL(8,2),
        cost DECIMAL(10,2),
        estimated BOOLEAN DEFAULT FALSE,
        notes TEXT,
        invoice_number VARCHAR(100),
        added_by_user_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(household_id, utility_type_id, reading_date)
      )
    `);
    console.log('✅ household_utilities tábla létrehozva');
    
    // 3. household_utility_settings tábla
    console.log('⚙️ household_utility_settings tábla létrehozása...');
    await query(`
      CREATE TABLE IF NOT EXISTS household_utility_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT TRUE,
        meter_number VARCHAR(50),
        current_unit_price DECIMAL(8,2),
        billing_cycle_day INTEGER DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 31),
        target_monthly_consumption DECIMAL(10,3),
        alert_threshold_percent INTEGER DEFAULT 120 CHECK (alert_threshold_percent > 0),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(household_id, utility_type_id)
      )
    `);
    console.log('✅ household_utility_settings tábla létrehozva');
    
    // 4. Indexek létrehozása
    console.log('🔍 Indexek létrehozása...');
    
    await query('CREATE INDEX IF NOT EXISTS idx_household_utilities_household_date ON household_utilities(household_id, reading_date DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_household_utilities_type_date ON household_utilities(utility_type_id, reading_date DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_household_utilities_household_type ON household_utilities(household_id, utility_type_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_utility_settings_household ON household_utility_settings(household_id)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_settings_household_type ON household_utility_settings(household_id, utility_type_id)');
    
    console.log('✅ Indexek létrehozva');
    
    // 5. Alapértelmezett adatok beszúrása
    console.log('📝 Alapértelmezett közműtípusok beszúrása...');
    
    const utilityTypes = [
      ['water_cold', 'Hideg viz', 'm3', '💧', '#3498db', 1],
      ['water_hot', 'Meleg viz', 'm3', '🔥', '#e74c3c', 2],
      ['gas', 'Gaz', 'm3', '🔥', '#f39c12', 3],
      ['electricity', 'Villany', 'kWh', '⚡', '#f1c40f', 4],
      ['heating', 'Tavfutes', 'GJ', '🏠', '#9b59b6', 5]
    ];
    
    for (const [name, display_name, unit, icon, color, sort_order] of utilityTypes) {
      try {
        await query(`
          INSERT INTO utility_types (name, display_name, unit, icon, color, sort_order) 
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (name) DO NOTHING
        `, [name, display_name, unit, icon, color, sort_order]);
        console.log(`  ✅ ${display_name} (${unit})`);
      } catch (error) {
        console.log(`  ⚠️ ${display_name} már létezik`);
      }
    }
    
    // 6. Ellenőrzés
    console.log('\n📋 Táblák ellenőrzése...');
    
    const tables = await query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_name IN ('utility_types', 'household_utilities', 'household_utility_settings')
      ORDER BY table_name
    `);
    
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name} (${row.column_count} oszlop)`);
    });
    
    const types = await query('SELECT name, display_name, unit FROM utility_types ORDER BY sort_order');
    console.log('\n🔌 Közműtípusok:');
    types.rows.forEach(type => {
      console.log(`  📊 ${type.display_name} (${type.unit})`);
    });
    
    console.log('\n🎉 Utilities táblák sikeresen létrehozva!');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createUtilitiesTables();
