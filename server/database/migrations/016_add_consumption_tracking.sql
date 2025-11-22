-- Migration: 016_add_consumption_tracking.sql
-- Fogyasztás tracking támogatása az inventory táblában

-- Hozzáadjuk a last_quantity_change mezőt
ALTER TABLE household_inventory 
ADD COLUMN IF NOT EXISTS last_quantity_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Frissítjük a meglévő adatokat
UPDATE household_inventory 
SET last_quantity_change = updated_at
WHERE last_quantity_change IS NULL;

-- Index a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_inventory_last_change 
ON household_inventory(household_id, product_master_id, last_quantity_change);

-- Komment
COMMENT ON COLUMN household_inventory.last_quantity_change IS 'Utolsó mennyiség változás időpontja (fogyasztás tracking)';
