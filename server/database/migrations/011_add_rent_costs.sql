-- Lakbér költségek hozzáadása a household_costs táblához
-- Migráció: 011_add_rent_costs.sql

-- Lakbér oszlopok hozzáadása
ALTER TABLE household_costs 
ADD COLUMN rent_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN garage_rent DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN insurance_cost DECIMAL(10,2) DEFAULT 0.00;

-- Kommentek hozzáadása
COMMENT ON COLUMN household_costs.rent_amount IS 'Havi lakbér összege';
COMMENT ON COLUMN household_costs.garage_rent IS 'Havi garázs bérlet';
COMMENT ON COLUMN household_costs.insurance_cost IS 'Havi biztosítási díj';

-- Alapértelmezett értékek beállítása meglévő rekordokhoz
UPDATE household_costs 
SET 
  rent_amount = 0.00,
  garage_rent = 0.00,
  insurance_cost = 0.00
WHERE rent_amount IS NULL;
