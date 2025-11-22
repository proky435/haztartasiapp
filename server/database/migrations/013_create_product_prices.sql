-- Termék árak tábla létrehozása
-- Ez a tábla tárolja a felhasználók által megadott termékárakat
CREATE TABLE IF NOT EXISTS product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barcode VARCHAR(20) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, barcode)
);

-- Indexek létrehozása
CREATE INDEX IF NOT EXISTS idx_product_prices_user_id ON product_prices(user_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_barcode ON product_prices(barcode);
CREATE INDEX IF NOT EXISTS idx_product_prices_user_barcode ON product_prices(user_id, barcode);

-- Trigger az last_updated automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_product_prices_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_prices_last_updated 
    BEFORE UPDATE ON product_prices 
    FOR EACH ROW EXECUTE FUNCTION update_product_prices_last_updated();
