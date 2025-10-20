-- Products tábla létrehozása
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    brand VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    image_url TEXT,
    nutrition_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexek létrehozása
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Household inventory tábla módosítása (ha szükséges)
ALTER TABLE household_inventory 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- Shopping list items tábla módosítása (ha szükséges)
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
