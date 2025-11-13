-- Közműárazási sávok tábla létrehozása
-- Ez a tábla tárolja a különböző közművek sávos árazási információit

CREATE TABLE IF NOT EXISTS utility_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utility_type_id UUID NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    
    -- Sáv információk
    tier_number INTEGER NOT NULL, -- 1, 2, 3, stb.
    tier_name VARCHAR(100), -- pl. "Rezsicsökkentett", "Piaci ár"
    
    -- Sáv határok
    limit_value DECIMAL(12,6), -- Sáv felső határa (NULL = végtelen)
    limit_unit VARCHAR(20), -- kWh, MJ, m3, GJ
    
    -- Árazás
    price_per_unit DECIMAL(10,4) NOT NULL, -- Ft/egység
    
    -- Konverziós paraméterek (gáznál MJ konverzió)
    conversion_factor DECIMAL(10,6), -- pl. 34.5 MJ/m³
    conversion_unit VARCHAR(20), -- pl. "MJ/m3"
    
    -- Egyéb díjak
    system_usage_fee DECIMAL(10,4) DEFAULT 0, -- Rendszerhasználati díj
    
    -- Metaadatok
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Egyedi kulcs: egy háztartásban egy közműtípushoz egy sáv csak egyszer lehet
    UNIQUE(utility_type_id, household_id, tier_number)
);

-- Indexek a gyors lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_utility_pricing_tiers_household_utility 
ON utility_pricing_tiers(household_id, utility_type_id);

CREATE INDEX IF NOT EXISTS idx_utility_pricing_tiers_active 
ON utility_pricing_tiers(is_active, valid_from, valid_until);

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_utility_pricing_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_utility_pricing_tiers_updated_at
    BEFORE UPDATE ON utility_pricing_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_utility_pricing_tiers_updated_at();

-- Alapértelmezett magyar rezsicsökkentett árak beszúrása (példa adatok)
-- Ezeket a felhasználók később módosíthatják

-- Villany sávok (kWh)
INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit, system_usage_fee)
SELECT 
    ut.id,
    h.id,
    1,
    'Rezsicsökkentett',
    210.25,
    'kWh',
    36.0,
    8.5
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'electricity'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit, system_usage_fee)
SELECT 
    ut.id,
    h.id,
    2,
    'Piaci ár',
    NULL,
    'kWh',
    70.0,
    8.5
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'electricity'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

-- Gáz sávok (m³ -> MJ konverzióval)
INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit, conversion_factor, conversion_unit, system_usage_fee)
SELECT 
    ut.id,
    h.id,
    1,
    'Rezsicsökkentett',
    5303,
    'MJ',
    2.8,
    34.5,
    'MJ/m3',
    5.2
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'gas'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit, conversion_factor, conversion_unit, system_usage_fee)
SELECT 
    ut.id,
    h.id,
    2,
    'Piaci ár',
    NULL,
    'MJ',
    22.0,
    34.5,
    'MJ/m3',
    5.2
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'gas'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

-- Víz (egyszerű árazás)
INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit)
SELECT 
    ut.id,
    h.id,
    1,
    'Vízfogyasztás',
    NULL,
    'm3',
    350.0
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'water'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

-- Csatorna díj (külön sáv)
INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit)
SELECT 
    ut.id,
    h.id,
    2,
    'Csatornahasználat',
    NULL,
    'm3',
    280.0
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'water'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

-- Távfűtés (egyszerű árazás)
INSERT INTO utility_pricing_tiers (utility_type_id, household_id, tier_number, tier_name, limit_value, limit_unit, price_per_unit)
SELECT 
    ut.id,
    h.id,
    1,
    'Hőenergia',
    NULL,
    'GJ',
    4500.0
FROM utility_types ut
CROSS JOIN households h
WHERE ut.name = 'heating'
ON CONFLICT (utility_type_id, household_id, tier_number) DO NOTHING;

COMMENT ON TABLE utility_pricing_tiers IS 'Közműárazási sávok táblája - tárolja a különböző közművek sávos árazási információit';
