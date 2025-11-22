-- Add barcode column to household_inventory table
ALTER TABLE household_inventory 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(20);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_inventory_barcode ON household_inventory(barcode);
