-- Product Expiry Patterns Migration
-- Termék lejárati minták tanulása felhasználónként

-- Termék lejárati minták tábla
-- Ez a tábla tárolja, hogy egy adott felhasználó/háztartás milyen lejárati időket használ
-- egy adott termékhez (vonalkód vagy név alapján)
CREATE TABLE IF NOT EXISTS product_expiry_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Termék azonosítás (barcode vagy custom_name alapján)
    barcode VARCHAR(20),
    product_name VARCHAR(255),
    
    -- Lejárati statisztikák
    average_shelf_life_days INTEGER NOT NULL, -- Átlagos eltarthatóság napokban
    sample_count INTEGER DEFAULT 1, -- Hányszor lett kitöltve
    last_shelf_life_days INTEGER, -- Utolsó kitöltött érték
    
    -- Metaadatok
    first_recorded_at TIMESTAMP DEFAULT NOW(),
    last_recorded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraint: vagy barcode vagy product_name kell
    CONSTRAINT check_product_identifier CHECK (
        (barcode IS NOT NULL AND barcode != '') OR 
        (product_name IS NOT NULL AND product_name != '')
    ),
    
    -- Unique constraint: egy háztartásban egy termékhez egy minta
    CONSTRAINT unique_household_product UNIQUE (household_id, barcode, product_name)
);

-- Indexek a gyors lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_expiry_patterns_household 
    ON product_expiry_patterns(household_id);

CREATE INDEX IF NOT EXISTS idx_expiry_patterns_barcode 
    ON product_expiry_patterns(household_id, barcode) 
    WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expiry_patterns_name 
    ON product_expiry_patterns(household_id, product_name) 
    WHERE product_name IS NOT NULL;

-- Trigger: automatikus updated_at frissítés
CREATE OR REPLACE FUNCTION update_expiry_pattern_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expiry_pattern_timestamp
    BEFORE UPDATE ON product_expiry_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_expiry_pattern_timestamp();

-- Kommentek
COMMENT ON TABLE product_expiry_patterns IS 'Tárolja a felhasználók termék-specifikus lejárati szokásait tanulás céljából';
COMMENT ON COLUMN product_expiry_patterns.average_shelf_life_days IS 'Átlagos eltarthatóság napokban (vásárlás és lejárat közötti idő)';
COMMENT ON COLUMN product_expiry_patterns.sample_count IS 'Hányszor lett ez a termék hozzáadva lejárati dátummal';
COMMENT ON COLUMN product_expiry_patterns.last_shelf_life_days IS 'Utoljára megadott eltarthatóság napokban';
