const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { query, connectDatabase } = require('../src/database/connection');

/**
 * Egyszerűsített Migration Futtatás
 * Minden migration fájlt egyben futtat
 */

async function runMigrations() {
  try {
    console.log('🚀 Consumption Tracking Migrations\n');
    
    await connectDatabase();
    console.log('✅ Adatbázis kapcsolat OK\n');
    
    // Migration 1: household_inventory.last_quantity_change
    console.log('📄 Migration 1: household_inventory.last_quantity_change');
    try {
      await query(`
        ALTER TABLE household_inventory 
        ADD COLUMN IF NOT EXISTS last_quantity_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Oszlop hozzáadva');
      
      await query(`
        UPDATE household_inventory 
        SET last_quantity_change = updated_at
        WHERE last_quantity_change IS NULL
      `);
      console.log('✅ Meglévő adatok frissítve');
      
      await query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_last_change 
        ON household_inventory(household_id, product_master_id, last_quantity_change)
      `);
      console.log('✅ Index létrehozva\n');
    } catch (error) {
      console.log(`⚠️  ${error.message}\n`);
    }
    
    // Migration 2: shopping_list_item_history tábla
    console.log('📄 Migration 2: shopping_list_item_history tábla');
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS shopping_list_item_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
          product_master_id UUID REFERENCES products_master(id),
          custom_name VARCHAR(255),
          custom_brand VARCHAR(255),
          added_to_list_date TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_date TIMESTAMP,
          removed_date TIMESTAMP,
          quantity DECIMAL(10,2),
          unit VARCHAR(20),
          source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'auto_suggestion', 'low_stock', 'pattern')),
          shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE SET NULL,
          shopping_list_item_id UUID REFERENCES shopping_list_items(id) ON DELETE SET NULL,
          added_by_user_id UUID REFERENCES users(id),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tábla létrehozva');
      
      await query(`
        CREATE INDEX IF NOT EXISTS idx_shopping_history_household 
        ON shopping_list_item_history(household_id, product_master_id)
      `);
      
      await query(`
        CREATE INDEX IF NOT EXISTS idx_shopping_history_dates 
        ON shopping_list_item_history(added_to_list_date, completed_date)
      `);
      
      await query(`
        CREATE INDEX IF NOT EXISTS idx_shopping_history_source 
        ON shopping_list_item_history(household_id, source)
      `);
      console.log('✅ Indexek létrehozva\n');
    } catch (error) {
      console.log(`⚠️  ${error.message}\n`);
    }
    
    // Migration 3: household_settings tracking oszlopok
    console.log('📄 Migration 3: household_settings tracking oszlopok');
    try {
      await query(`
        ALTER TABLE household_settings 
        ADD COLUMN IF NOT EXISTS consumption_tracking_enabled BOOLEAN DEFAULT TRUE
      `);
      
      await query(`
        ALTER TABLE household_settings 
        ADD COLUMN IF NOT EXISTS shopping_pattern_analysis_enabled BOOLEAN DEFAULT TRUE
      `);
      
      await query(`
        ALTER TABLE household_settings 
        ADD COLUMN IF NOT EXISTS auto_suggestions_enabled BOOLEAN DEFAULT TRUE
      `);
      
      await query(`
        ALTER TABLE household_settings 
        ADD COLUMN IF NOT EXISTS consumption_tracking_settings JSONB DEFAULT '{"min_data_points": 5, "history_months": 6, "confidence_threshold": "medium"}'::jsonb
      `);
      console.log('✅ household_settings oszlopok hozzáadva');
      
      await query(`
        UPDATE household_settings 
        SET 
          consumption_tracking_enabled = TRUE,
          shopping_pattern_analysis_enabled = TRUE,
          auto_suggestions_enabled = TRUE
        WHERE consumption_tracking_enabled IS NULL
      `);
      console.log('✅ Meglévő rekordok frissítve\n');
    } catch (error) {
      console.log(`⚠️  ${error.message}\n`);
    }
    
    // Migration 4: user_settings consumption_notifications
    console.log('📄 Migration 4: user_settings.consumption_notifications');
    try {
      await query(`
        ALTER TABLE user_settings 
        ADD COLUMN IF NOT EXISTS consumption_notifications JSONB DEFAULT '{"low_stock_predictions": true, "shopping_pattern_suggestions": true, "waste_alerts": true, "weekly_summary": false}'::jsonb
      `);
      console.log('✅ user_settings oszlop hozzáadva\n');
    } catch (error) {
      console.log(`⚠️  ${error.message}\n`);
    }
    
    // Ellenőrzés
    console.log('='.repeat(60));
    console.log('📋 Struktúra Ellenőrzés\n');
    
    // 1. household_inventory.last_quantity_change
    const invCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'household_inventory' 
        AND column_name = 'last_quantity_change'
    `);
    console.log(invCheck.rows.length > 0 
      ? '✅ household_inventory.last_quantity_change' 
      : '❌ household_inventory.last_quantity_change HIÁNYZIK');
    
    // 2. shopping_list_item_history tábla
    const histCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'shopping_list_item_history'
    `);
    console.log(histCheck.rows.length > 0 
      ? '✅ shopping_list_item_history tábla' 
      : '❌ shopping_list_item_history HIÁNYZIK');
    
    // 3. household_settings tracking oszlopok
    const hsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'household_settings' 
        AND column_name IN ('consumption_tracking_enabled', 'shopping_pattern_analysis_enabled', 'auto_suggestions_enabled')
    `);
    console.log(hsCheck.rows.length === 3 
      ? '✅ household_settings tracking oszlopok (3/3)' 
      : `⚠️  household_settings tracking oszlopok (${hsCheck.rows.length}/3)`);
    
    // 4. user_settings.consumption_notifications
    const usCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
        AND column_name = 'consumption_notifications'
    `);
    console.log(usCheck.rows.length > 0 
      ? '✅ user_settings.consumption_notifications' 
      : '❌ user_settings.consumption_notifications HIÁNYZIK');
    
    console.log('\n🎉 Migration befejezve!\n');
    
  } catch (error) {
    console.error('💥 Hiba:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigrations();
