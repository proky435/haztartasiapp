-- Migration: 018_add_tracking_settings.sql
-- Consumption tracking és notification beállítások

-- Household settings bővítése
ALTER TABLE household_settings 
ADD COLUMN IF NOT EXISTS consumption_tracking_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE household_settings 
ADD COLUMN IF NOT EXISTS shopping_pattern_analysis_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE household_settings 
ADD COLUMN IF NOT EXISTS auto_suggestions_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE household_settings 
ADD COLUMN IF NOT EXISTS consumption_tracking_settings JSONB DEFAULT '{"min_data_points": 5, "history_months": 6, "confidence_threshold": "medium"}'::jsonb;

-- User settings bővítése (egyéni notification preferenciák)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS consumption_notifications JSONB DEFAULT '{"low_stock_predictions": true, "shopping_pattern_suggestions": true, "waste_alerts": true, "weekly_summary": false}'::jsonb;

-- Frissítjük a meglévő household_settings rekordokat
UPDATE household_settings 
SET 
  consumption_tracking_enabled = TRUE,
  shopping_pattern_analysis_enabled = TRUE,
  auto_suggestions_enabled = TRUE
WHERE consumption_tracking_enabled IS NULL;

-- Kommentek
COMMENT ON COLUMN household_settings.consumption_tracking_enabled IS 'Fogyasztás tracking be/ki kapcsolása';

COMMENT ON COLUMN household_settings.shopping_pattern_analysis_enabled IS 'Vásárlási mintázat elemzés be/ki kapcsolása';

COMMENT ON COLUMN household_settings.auto_suggestions_enabled IS 'Automatikus javaslatok be/ki kapcsolása';

COMMENT ON COLUMN household_settings.consumption_tracking_settings IS 'Tracking beállítások: min_data_points, history_months, confidence_threshold';

COMMENT ON COLUMN user_settings.consumption_notifications IS 'Egyéni értesítési preferenciák a consumption trackinghez';
