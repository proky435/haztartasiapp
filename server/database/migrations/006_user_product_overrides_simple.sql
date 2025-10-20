CREATE TABLE IF NOT EXISTS user_product_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barcode VARCHAR(20) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    custom_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_user_product_overrides_user_barcode ON user_product_overrides(user_id, barcode);
CREATE INDEX IF NOT EXISTS idx_user_product_overrides_barcode ON user_product_overrides(barcode);
