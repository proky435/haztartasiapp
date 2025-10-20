-- User Product Overrides Migration
-- Felhasználó-specifikus termék átnevezések

CREATE TABLE user_product_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barcode VARCHAR(20) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    custom_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, barcode)
);

-- Index for fast lookups
CREATE INDEX idx_user_product_overrides_user_barcode ON user_product_overrides(user_id, barcode);
CREATE INDEX idx_user_product_overrides_barcode ON user_product_overrides(barcode);

-- Updated_at trigger
CREATE TRIGGER update_user_product_overrides_updated_at 
    BEFORE UPDATE ON user_product_overrides 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_product_overrides IS 'Felhasználó-specifikus termék átnevezések';
COMMENT ON COLUMN user_product_overrides.barcode IS 'Termék vonalkódja';
COMMENT ON COLUMN user_product_overrides.original_name IS 'Eredeti termék név (Open Food Facts-ból)';
COMMENT ON COLUMN user_product_overrides.custom_name IS 'Felhasználó által megadott név';
