-- Háztartási App - Táblák létrehozása
-- Futtatási sorrend: 02-create-tables.sql

-- =====================================================
-- 1. FELHASZNÁLÓK ÉS HÁZTARTÁSOK
-- =====================================================

-- Felhasználók tábla
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Háztartások tábla
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    invite_code VARCHAR(10) UNIQUE,
    invite_code_expires TIMESTAMP,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Háztartás tagság
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    invited_by_user_id UUID REFERENCES users(id),
    UNIQUE(household_id, user_id, left_at)
);

-- =====================================================
-- 2. TERMÉKEK ÉS KÉSZLET
-- =====================================================

-- Termék master adatok (Open Food Facts cache)
CREATE TABLE products_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    image_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    nutrition_data JSONB DEFAULT '{}',
    allergens TEXT[],
    ingredients TEXT,
    packaging VARCHAR(100),
    labels TEXT[],
    countries TEXT[],
    stores TEXT[],
    data_source VARCHAR(50) DEFAULT 'openfoodfacts',
    data_quality_score INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Háztartási készlet
CREATE TABLE household_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    product_master_id UUID REFERENCES products_master(id),
    custom_name VARCHAR(255), -- Ha nincs master termék
    custom_brand VARCHAR(255),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(20) DEFAULT 'db',
    location VARCHAR(100),
    expiry_date DATE,
    purchase_date DATE,
    price DECIMAL(10,2),
    store VARCHAR(100),
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    minimum_stock DECIMAL(10,2) DEFAULT 0,
    added_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Készlet változások (audit log)
CREATE TABLE inventory_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_inventory_id UUID NOT NULL REFERENCES household_inventory(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('add', 'update', 'remove', 'consume', 'expire')),
    old_quantity DECIMAL(10,2),
    new_quantity DECIMAL(10,2),
    quantity_change DECIMAL(10,2),
    reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. BEVÁSÁRLÓLISTÁK
-- =====================================================

-- Bevásárlólisták
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    estimated_total DECIMAL(10,2),
    actual_total DECIMAL(10,2),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    assigned_to_user_id UUID REFERENCES users(id),
    shared_with_users UUID[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Bevásárlólista tételek
CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_master_id UUID REFERENCES products_master(id),
    custom_name VARCHAR(255),
    custom_brand VARCHAR(255),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) DEFAULT 'db',
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    category VARCHAR(100),
    purchased BOOLEAN DEFAULT FALSE,
    purchased_quantity DECIMAL(10,2),
    purchased_by_user_id UUID REFERENCES users(id),
    purchased_at TIMESTAMP,
    estimated_price DECIMAL(10,2),
    actual_price DECIMAL(10,2),
    store VARCHAR(100),
    notes TEXT,
    auto_generated BOOLEAN DEFAULT FALSE,
    source_inventory_id UUID REFERENCES household_inventory(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. ÉRTESÍTÉSEK ÉS BEÁLLÍTÁSOK
-- =====================================================

-- Értesítések
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    read_at TIMESTAMP,
    action_url VARCHAR(500),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Felhasználói beállítások
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_preferences JSONB DEFAULT '{}',
    ui_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'hu',
    timezone VARCHAR(50) DEFAULT 'Europe/Budapest',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Háztartási beállítások
CREATE TABLE household_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID UNIQUE NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    auto_shopping_enabled BOOLEAN DEFAULT TRUE,
    expiry_warning_days INTEGER DEFAULT 3,
    low_stock_threshold DECIMAL(5,2) DEFAULT 1.0,
    preferred_stores JSONB DEFAULT '[]',
    budget_settings JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    inventory_categories JSONB DEFAULT '[]',
    default_units JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. AUTOMATIKUS JAVASLATOK ÉS STATISZTIKÁK
-- =====================================================

-- Automatikus javaslatok
CREATE TABLE auto_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    product_master_id UUID REFERENCES products_master(id),
    custom_name VARCHAR(255),
    suggestion_type VARCHAR(50) NOT NULL, -- low_stock, expired_soon, frequent_buy, seasonal
    suggestion_reason TEXT,
    frequency_data JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    is_active BOOLEAN DEFAULT TRUE,
    last_suggested TIMESTAMP,
    times_suggested INTEGER DEFAULT 0,
    times_accepted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fogyasztási statisztikák
CREATE TABLE consumption_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    product_master_id UUID REFERENCES products_master(id),
    custom_name VARCHAR(255),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_consumed DECIMAL(10,2),
    average_daily_consumption DECIMAL(10,2),
    total_purchased DECIMAL(10,2),
    total_wasted DECIMAL(10,2),
    purchase_frequency INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(household_id, product_master_id, custom_name, period_start, period_end)
);

-- Kommentek a táblákhoz
COMMENT ON TABLE users IS 'Felhasználók alapadatai';
COMMENT ON TABLE households IS 'Háztartások/családok';
COMMENT ON TABLE household_members IS 'Háztartás tagság és szerepkörök';
COMMENT ON TABLE products_master IS 'Termék master adatok (Open Food Facts cache)';
COMMENT ON TABLE household_inventory IS 'Háztartási készlet';
COMMENT ON TABLE inventory_changes IS 'Készlet változások audit log';
COMMENT ON TABLE shopping_lists IS 'Bevásárlólisták';
COMMENT ON TABLE shopping_list_items IS 'Bevásárlólista tételek';
COMMENT ON TABLE notifications IS 'Felhasználói értesítések';
COMMENT ON TABLE user_settings IS 'Felhasználói beállítások';
COMMENT ON TABLE household_settings IS 'Háztartási beállítások';
COMMENT ON TABLE auto_suggestions IS 'Automatikus vásárlási javaslatok';
COMMENT ON TABLE consumption_stats IS 'Fogyasztási statisztikák';

-- =====================================================
-- 6. KÖZMŰFOGYASZTÁS KÖVETÉS
-- =====================================================

-- Közműfogyasztás típusok (víz, gáz, villany, stb.)
CREATE TABLE utility_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'water_cold', 'water_hot', 'gas', 'electricity', 'heating'
    display_name VARCHAR(100) NOT NULL, -- 'Hideg víz', 'Meleg víz', 'Gáz', 'Villany', 'Fűtés'
    unit VARCHAR(10) NOT NULL, -- 'm³', 'kWh'
    icon VARCHAR(20) DEFAULT '⚡',
    color VARCHAR(7) DEFAULT '#3498db', -- Hex szín kód grafikonokhoz
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Háztartási közműfogyasztás mérések
CREATE TABLE household_utilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    meter_reading DECIMAL(12,3) NOT NULL CHECK (meter_reading >= 0), -- Mérőóra állás
    previous_reading DECIMAL(12,3), -- Előző mérés
    consumption DECIMAL(10,3), -- Kiszámított fogyasztás (meter_reading - previous_reading)
    unit_price DECIMAL(8,2), -- Egységár (Ft/m³ vagy Ft/kWh)
    cost DECIMAL(10,2), -- Teljes költség (consumption * unit_price)
    estimated BOOLEAN DEFAULT FALSE, -- Becsült vagy valós mérés
    notes TEXT,
    invoice_number VARCHAR(100), -- Számla szám referencia
    added_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Egy háztartásban egy közműtípusra egy napon csak egy mérés lehet
    UNIQUE(household_id, utility_type_id, reading_date)
);

-- Háztartási közműbeállítások
CREATE TABLE household_utility_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    meter_number VARCHAR(50), -- Mérőóra száma
    current_unit_price DECIMAL(8,2), -- Jelenlegi egységár
    billing_cycle_day INTEGER DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 31), -- Havi leolvasás napja
    target_monthly_consumption DECIMAL(10,3), -- Célzott havi fogyasztás
    alert_threshold_percent INTEGER DEFAULT 120 CHECK (alert_threshold_percent > 0), -- Riasztási küszöb %
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Egy háztartásban egy közműtípusra csak egy beállítás
    UNIQUE(household_id, utility_type_id)
);

-- Kommentek az új táblákhoz
COMMENT ON TABLE utility_types IS 'Közműfogyasztás típusok (víz, gáz, villany, stb.)';
COMMENT ON TABLE household_utilities IS 'Háztartási közműfogyasztás mérések és számítások';
COMMENT ON TABLE household_utility_settings IS 'Háztartási közműbeállítások és preferenciák';
