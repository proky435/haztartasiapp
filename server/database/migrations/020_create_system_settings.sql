-- Migration: 020_create_system_settings.sql
-- Rendszer szintű beállítások (cron, stb.)

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  cron_enabled BOOLEAN DEFAULT TRUE,
  low_stock_cron VARCHAR(50) DEFAULT '0 9 * * *',
  expiry_warning_cron VARCHAR(50) DEFAULT '0 8 * * *',
  shopping_reminder_cron VARCHAR(50) DEFAULT '0 8 * * 1',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Default beállítások beszúrása
INSERT INTO system_settings (id, cron_enabled, low_stock_cron, expiry_warning_cron, shopping_reminder_cron)
VALUES (1, TRUE, '0 9 * * *', '0 8 * * *', '0 8 * * 1')
ON CONFLICT (id) DO NOTHING;

-- Trigger az updated_at frissítésére
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Kommentek
COMMENT ON TABLE system_settings IS 'Rendszer szintű beállítások';
COMMENT ON COLUMN system_settings.cron_enabled IS 'Automatikus értesítések be/ki kapcsolása';
COMMENT ON COLUMN system_settings.low_stock_cron IS 'Készlet elfogyási értesítések ütemezése (cron formátum)';
COMMENT ON COLUMN system_settings.expiry_warning_cron IS 'Lejárati figyelmeztetések ütemezése (cron formátum)';
COMMENT ON COLUMN system_settings.shopping_reminder_cron IS 'Vásárlási emlékeztetők ütemezése (cron formátum)';
