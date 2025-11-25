-- Migration: Add auto-delete settings for expired products
-- Description: Adds columns to system_settings for automatic deletion of expired products

-- Add auto_delete_expired_cron column
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS auto_delete_expired_cron VARCHAR(50) DEFAULT '0 2 * * *';

-- Add auto_delete_days_after_expiry column
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS auto_delete_days_after_expiry INTEGER DEFAULT 7;

-- Add comment
COMMENT ON COLUMN system_settings.auto_delete_expired_cron IS 'Cron expression for automatic deletion of expired products (default: 2:00 AM daily)';
COMMENT ON COLUMN system_settings.auto_delete_days_after_expiry IS 'Number of days after expiry date before automatic deletion (default: 7 days)';

-- Update existing row if exists
UPDATE system_settings 
SET 
  auto_delete_expired_cron = '0 2 * * *',
  auto_delete_days_after_expiry = 3
WHERE id = 1 
AND auto_delete_expired_cron IS NULL;

-- Insert default values if no row exists
INSERT INTO system_settings (
  id, 
  cron_enabled, 
  low_stock_cron, 
  expiry_warning_cron, 
  shopping_reminder_cron,
  auto_delete_expired_cron,
  auto_delete_days_after_expiry
)
VALUES (
  1, 
  true, 
  '0 9 * * *', 
  '0 8 * * *', 
  '0 8 * * 1',
  '0 2 * * *',
  7
)
ON CONFLICT (id) DO NOTHING;
