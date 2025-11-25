-- Migration: Create notifications table
-- Description: In-app értesítési rendszer táblája

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'expiry_warning', 'low_stock', 'budget_alert', 'recipe_shared', stb.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB, -- Extra adatok (termék ID-k, linkek, stb.)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexek a gyors lekérdezéshez
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_household ON notifications(household_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);

-- Kommentek
COMMENT ON TABLE notifications IS 'In-app értesítések táblája';
COMMENT ON COLUMN notifications.type IS 'Értesítés típusa: expiry_warning, low_stock, budget_alert, recipe_shared, shopping_reminder, waste_alert';
COMMENT ON COLUMN notifications.data IS 'JSON formátumú extra adatok (pl. termék ID-k, linkek)';
COMMENT ON COLUMN notifications.is_read IS 'Olvasott-e az értesítés';

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();
