-- Közműfogyasztás követés táblák - Egyszerűsített verzió
-- Migráció: 007_create_utilities_tables_simple.sql

-- Közműfogyasztás típusok (víz, gáz, villany, stb.)
CREATE TABLE IF NOT EXISTS utility_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    icon VARCHAR(20) DEFAULT '⚡',
    color VARCHAR(7) DEFAULT '#3498db',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Háztartási közműfogyasztás mérések
CREATE TABLE IF NOT EXISTS household_utilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    meter_reading DECIMAL(12,3) NOT NULL CHECK (meter_reading >= 0),
    previous_reading DECIMAL(12,3),
    consumption DECIMAL(10,3),
    unit_price DECIMAL(8,2),
    cost DECIMAL(10,2),
    estimated BOOLEAN DEFAULT FALSE,
    notes TEXT,
    invoice_number VARCHAR(100),
    added_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(household_id, utility_type_id, reading_date)
);

-- Háztartási közműbeállítások
CREATE TABLE IF NOT EXISTS household_utility_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    meter_number VARCHAR(50),
    current_unit_price DECIMAL(8,2),
    billing_cycle_day INTEGER DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 31),
    target_monthly_consumption DECIMAL(10,3),
    alert_threshold_percent INTEGER DEFAULT 120 CHECK (alert_threshold_percent > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(household_id, utility_type_id)
);

-- Indexek létrehozása
CREATE INDEX IF NOT EXISTS idx_household_utilities_household_date ON household_utilities(household_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_household_utilities_type_date ON household_utilities(utility_type_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_household_utilities_household_type ON household_utilities(household_id, utility_type_id);
CREATE INDEX IF NOT EXISTS idx_utility_settings_household ON household_utility_settings(household_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_settings_household_type ON household_utility_settings(household_id, utility_type_id);

-- Alapértelmezett közműtípusok beszúrása
INSERT INTO utility_types (name, display_name, unit, icon, color, sort_order) VALUES
('water_cold', 'Hideg víz', 'm³', '💧', '#3498db', 1),
('water_hot', 'Meleg víz', 'm³', '🔥', '#e74c3c', 2),
('gas', 'Gáz', 'm³', '🔥', '#f39c12', 3),
('electricity', 'Villany', 'kWh', '⚡', '#f1c40f', 4),
('heating', 'Távfűtés', 'GJ', '🏠', '#9b59b6', 5)
ON CONFLICT (name) DO NOTHING;
