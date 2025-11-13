-- =====================================================
-- FOGYASZTÁS SZÁMÍTÁS TRIGGER
-- =====================================================
-- Ez a migráció hozzáad egy trigger-t, ami automatikusan
-- kiszámítja a fogyasztást és költséget új mérés rögzítésekor

-- Trigger függvény létrehozása
CREATE OR REPLACE FUNCTION calculate_consumption_and_cost()
RETURNS TRIGGER AS $$
DECLARE
    prev_reading DECIMAL(10,3);
    consumption_calc DECIMAL(10,3);
    cost_calc DECIMAL(10,2);
BEGIN
    -- Előző mérés keresése ugyanazon közműtípushoz
    SELECT meter_reading INTO prev_reading
    FROM household_utilities
    WHERE household_id = NEW.household_id 
      AND utility_type_id = NEW.utility_type_id
      AND reading_date < NEW.reading_date
    ORDER BY reading_date DESC
    LIMIT 1;

    -- Ha van előző mérés, számítjuk a fogyasztást
    IF prev_reading IS NOT NULL THEN
        consumption_calc := NEW.meter_reading - prev_reading;
        
        -- Ha negatív a fogyasztás, akkor 0
        IF consumption_calc < 0 THEN
            consumption_calc := 0;
        END IF;
        
        -- Költség számítása (ha van egységár)
        IF NEW.unit_price IS NOT NULL AND NEW.unit_price > 0 THEN
            cost_calc := consumption_calc * NEW.unit_price;
        ELSE
            cost_calc := NULL;
        END IF;
        
        -- Értékek beállítása
        NEW.previous_reading := prev_reading;
        NEW.consumption := consumption_calc;
        NEW.cost := cost_calc;
    ELSE
        -- Első mérés esetén nincs fogyasztás
        NEW.previous_reading := NULL;
        NEW.consumption := NULL;
        NEW.cost := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger létrehozása
DROP TRIGGER IF EXISTS trigger_calculate_consumption ON household_utilities;
CREATE TRIGGER trigger_calculate_consumption
    BEFORE INSERT OR UPDATE ON household_utilities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_consumption_and_cost();

-- Meglévő mérések újraszámítása (opcionális)
-- Ez újraszámítja az összes meglévő mérés fogyasztását és költségét
DO $$
DECLARE
    household_rec RECORD;
    reading_rec RECORD;
    prev_reading DECIMAL(10,3);
    consumption_calc DECIMAL(10,3);
    cost_calc DECIMAL(10,2);
BEGIN
    -- Minden háztartás és közműtípus kombinációra
    FOR household_rec IN 
        SELECT DISTINCT household_id, utility_type_id 
        FROM household_utilities 
        ORDER BY household_id, utility_type_id
    LOOP
        -- Az adott háztartás és közműtípus méréseit dátum szerint rendezve
        FOR reading_rec IN 
            SELECT id, meter_reading, unit_price, reading_date, household_id, utility_type_id
            FROM household_utilities
            WHERE household_id = household_rec.household_id 
              AND utility_type_id = household_rec.utility_type_id
            ORDER BY reading_date ASC
        LOOP
            -- Előző mérés keresése
            SELECT meter_reading INTO prev_reading
            FROM household_utilities
            WHERE household_id = reading_rec.household_id 
              AND utility_type_id = reading_rec.utility_type_id
              AND reading_date < reading_rec.reading_date
            ORDER BY reading_date DESC
            LIMIT 1;

            -- Fogyasztás és költség számítása
            IF prev_reading IS NOT NULL THEN
                consumption_calc := reading_rec.meter_reading - prev_reading;
                
                IF consumption_calc < 0 THEN
                    consumption_calc := 0;
                END IF;
                
                IF reading_rec.unit_price IS NOT NULL AND reading_rec.unit_price > 0 THEN
                    cost_calc := consumption_calc * reading_rec.unit_price;
                ELSE
                    cost_calc := NULL;
                END IF;
                
                -- Frissítés
                UPDATE household_utilities 
                SET 
                    previous_reading = prev_reading,
                    consumption = consumption_calc,
                    cost = cost_calc
                WHERE id = reading_rec.id;
            ELSE
                -- Első mérés
                UPDATE household_utilities 
                SET 
                    previous_reading = NULL,
                    consumption = NULL,
                    cost = NULL
                WHERE id = reading_rec.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;
