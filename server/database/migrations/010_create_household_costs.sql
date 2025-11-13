-- =====================================================
-- HÁZTARTÁSI KÖZÖS KÖLTSÉGEK TÁBLA
-- =====================================================
-- Ez a migráció létrehozza a háztartási közös költségek táblát

-- Háztartási közös költségek tábla létrehozása
CREATE TABLE IF NOT EXISTS household_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    common_utility_cost DECIMAL(10,2) DEFAULT 0.00,
    maintenance_cost DECIMAL(10,2) DEFAULT 0.00,
    other_monthly_costs DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Egy háztartáshoz csak egy költség rekord
    UNIQUE(household_id)
);

-- Index a gyorsabb lekérdezésért
CREATE INDEX IF NOT EXISTS idx_household_costs_household_id ON household_costs(household_id);

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_household_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_household_costs_updated_at ON household_costs;
CREATE TRIGGER trigger_update_household_costs_updated_at
    BEFORE UPDATE ON household_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_household_costs_updated_at();

-- Alapértelmezett rekordok beszúrása meglévő háztartásokhoz
INSERT INTO household_costs (household_id, common_utility_cost, maintenance_cost, other_monthly_costs)
SELECT 
    id as household_id,
    0.00 as common_utility_cost,
    0.00 as maintenance_cost,
    0.00 as other_monthly_costs
FROM households
WHERE id NOT IN (SELECT household_id FROM household_costs)
ON CONFLICT (household_id) DO NOTHING;
