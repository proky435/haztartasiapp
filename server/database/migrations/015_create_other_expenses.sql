-- Egyéb költségek tábla létrehozása
-- Migráció: 015_create_other_expenses.sql
-- Ez a tábla tárolja az egyéb havi költségeket (telefon, internet, előfizetések stb.)

CREATE TABLE IF NOT EXISTS household_other_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    category VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index a gyorsabb lekérdezésért
CREATE INDEX IF NOT EXISTS idx_household_other_expenses_household_id ON household_other_expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_household_other_expenses_active ON household_other_expenses(household_id, is_active);

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_household_other_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_household_other_expenses_updated_at ON household_other_expenses;
CREATE TRIGGER trigger_update_household_other_expenses_updated_at
    BEFORE UPDATE ON household_other_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_household_other_expenses_updated_at();

-- Kommentek
COMMENT ON TABLE household_other_expenses IS 'Háztartás egyéb havi költségei (telefon, internet, előfizetések stb.)';
COMMENT ON COLUMN household_other_expenses.name IS 'Költség neve (pl. Telefon, Internet)';
COMMENT ON COLUMN household_other_expenses.amount IS 'Havi összeg';
COMMENT ON COLUMN household_other_expenses.category IS 'Kategória (pl. Kommunikáció, Előfizetés)';
COMMENT ON COLUMN household_other_expenses.is_active IS 'Aktív-e a költség';
