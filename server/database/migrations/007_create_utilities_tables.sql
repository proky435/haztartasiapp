-- Közműfogyasztás követés táblák
-- Migráció: 007_create_utilities_tables.sql

-- =====================================================
-- 1. KÖZMŰTÍPUSOK TÁBLA
-- =====================================================

-- Közműfogyasztás típusok (víz, gáz, villany, stb.)
CREATE TABLE IF NOT EXISTS utility_types (
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

-- =====================================================
-- 2. HÁZTARTÁSI KÖZMŰFOGYASZTÁS TÁBLA
-- =====================================================

-- Háztartási közműfogyasztás mérések
CREATE TABLE IF NOT EXISTS household_utilities (
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

-- =====================================================
-- 3. KÖZMŰFOGYASZTÁS BEÁLLÍTÁSOK TÁBLA
-- =====================================================

-- Háztartási közműbeállítások
CREATE TABLE IF NOT EXISTS household_utility_settings (
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

-- =====================================================
-- 4. INDEXEK LÉTREHOZÁSA
-- =====================================================

-- Teljesítmény indexek
CREATE INDEX IF NOT EXISTS idx_household_utilities_household_date 
    ON household_utilities(household_id, reading_date DESC);

CREATE INDEX IF NOT EXISTS idx_household_utilities_type_date 
    ON household_utilities(utility_type_id, reading_date DESC);

CREATE INDEX IF NOT EXISTS idx_household_utilities_household_type 
    ON household_utilities(household_id, utility_type_id);

CREATE INDEX IF NOT EXISTS idx_utility_settings_household 
    ON household_utility_settings(household_id);

-- =====================================================
-- 5. ALAPÉRTELMEZETT KÖZMŰTÍPUSOK BESZÚRÁSA
-- =====================================================

INSERT INTO utility_types (name, display_name, unit, icon, color, sort_order) VALUES
('water_cold', 'Hideg víz', 'm³', '💧', '#3498db', 1),
('water_hot', 'Meleg víz', 'm³', '🔥', '#e74c3c', 2),
('gas', 'Gáz', 'm³', '🔥', '#f39c12', 3),
('electricity', 'Villany', 'kWh', '⚡', '#f1c40f', 4),
('heating', 'Távfűtés', 'GJ', '🏠', '#9b59b6', 5)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. TRIGGER FÜGGVÉNYEK
-- =====================================================

-- Automatikus fogyasztás számítás trigger függvény
CREATE OR REPLACE FUNCTION calculate_utility_consumption()
RETURNS TRIGGER AS $$
DECLARE
    prev_reading DECIMAL(12,3);
BEGIN
    -- Előző mérés keresése ugyanahhoz a háztartáshoz és közműtípushoz
    SELECT meter_reading INTO prev_reading
    FROM household_utilities
    WHERE household_id = NEW.household_id 
      AND utility_type_id = NEW.utility_type_id 
      AND reading_date < NEW.reading_date
    ORDER BY reading_date DESC
    LIMIT 1;
    
    -- Ha van előző mérés, kiszámítjuk a fogyasztást
    IF prev_reading IS NOT NULL THEN
        NEW.previous_reading := prev_reading;
        NEW.consumption := NEW.meter_reading - prev_reading;
        
        -- Ha van egységár, kiszámítjuk a költséget
        IF NEW.unit_price IS NOT NULL AND NEW.consumption IS NOT NULL THEN
            NEW.cost := NEW.consumption * NEW.unit_price;
        END IF;
    ELSE
        -- Ha nincs előző mérés, nullázzuk a fogyasztást
        NEW.previous_reading := NULL;
        NEW.consumption := NULL;
        NEW.cost := NULL;
    END IF;
    
    -- Updated_at frissítése
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger létrehozása
DROP TRIGGER IF EXISTS trigger_calculate_utility_consumption ON household_utilities;
CREATE TRIGGER trigger_calculate_utility_consumption
    BEFORE INSERT OR UPDATE ON household_utilities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_utility_consumption();

-- =====================================================
-- 7. KOMMENTEK
-- =====================================================

COMMENT ON TABLE utility_types IS 'Közműfogyasztás típusok (víz, gáz, villany, stb.)';
COMMENT ON TABLE household_utilities IS 'Háztartási közműfogyasztás mérések és számítások';
COMMENT ON TABLE household_utility_settings IS 'Háztartási közműbeállítások és preferenciák';

COMMENT ON COLUMN household_utilities.meter_reading IS 'Mérőóra aktuális állása';
COMMENT ON COLUMN household_utilities.consumption IS 'Kiszámított fogyasztás az előző mérés óta';
COMMENT ON COLUMN household_utilities.estimated IS 'TRUE ha becsült érték, FALSE ha valós leolvasás';
COMMENT ON COLUMN household_utility_settings.billing_cycle_day IS 'Havi számlázási ciklus napja (1-31)';
COMMENT ON COLUMN household_utility_settings.alert_threshold_percent IS 'Riasztási küszöb százalékban a célfogyasztáshoz képest';
