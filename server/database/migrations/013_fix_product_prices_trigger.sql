-- Töröljük a hibás trigger-t
DROP TRIGGER IF EXISTS update_product_prices_updated_at ON product_prices;

-- Létrehozzuk a helyes trigger függvényt
CREATE OR REPLACE FUNCTION update_product_prices_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Létrehozzuk a trigger-t
CREATE TRIGGER update_product_prices_last_updated 
    BEFORE UPDATE ON product_prices 
    FOR EACH ROW EXECUTE FUNCTION update_product_prices_last_updated();
