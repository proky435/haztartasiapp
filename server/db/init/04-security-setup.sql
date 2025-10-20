-- Háztartási App - Biztonsági beállítások
-- Futtatási sorrend: 04-security-setup.sql

-- =====================================================
-- ROW LEVEL SECURITY (RLS) BEÁLLÍTÁSA
-- =====================================================

-- RLS engedélyezése a táblákhoz
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SEGÉD FÜGGVÉNYEK
-- =====================================================

-- Aktuális felhasználó ID lekérése (session-ből)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_user_id', true), ''),
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Felhasználó háztartásainak lekérése
CREATE OR REPLACE FUNCTION user_households()
RETURNS TABLE(household_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT hm.household_id
    FROM household_members hm
    WHERE hm.user_id = current_user_id()
    AND hm.left_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Felhasználó jogosultságainak ellenőrzése
CREATE OR REPLACE FUNCTION user_has_permission(
    target_household_id UUID,
    required_permission TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT hm.role INTO user_role
    FROM household_members hm
    WHERE hm.household_id = target_household_id
    AND hm.user_id = current_user_id()
    AND hm.left_at IS NULL;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Szerepkör hierarchia: admin > member > viewer
    CASE required_permission
        WHEN 'admin' THEN
            RETURN user_role = 'admin';
        WHEN 'member' THEN
            RETURN user_role IN ('admin', 'member');
        WHEN 'viewer' THEN
            RETURN user_role IN ('admin', 'member', 'viewer');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICY-K LÉTREHOZÁSA
-- =====================================================

-- Household Members Policies
CREATE POLICY household_members_select_policy ON household_members
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM user_households())
    );

CREATE POLICY household_members_insert_policy ON household_members
    FOR INSERT WITH CHECK (
        user_has_permission(household_id, 'admin')
    );

CREATE POLICY household_members_update_policy ON household_members
    FOR UPDATE USING (
        user_has_permission(household_id, 'admin')
    );

-- Household Inventory Policies
CREATE POLICY household_inventory_select_policy ON household_inventory
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM user_households())
    );

CREATE POLICY household_inventory_insert_policy ON household_inventory
    FOR INSERT WITH CHECK (
        user_has_permission(household_id, 'member')
        AND added_by_user_id = current_user_id()
    );

CREATE POLICY household_inventory_update_policy ON household_inventory
    FOR UPDATE USING (
        user_has_permission(household_id, 'member')
    );

CREATE POLICY household_inventory_delete_policy ON household_inventory
    FOR DELETE USING (
        user_has_permission(household_id, 'member')
    );

-- Inventory Changes Policies
CREATE POLICY inventory_changes_select_policy ON inventory_changes
    FOR SELECT USING (
        household_inventory_id IN (
            SELECT id FROM household_inventory 
            WHERE household_id IN (SELECT household_id FROM user_households())
        )
    );

CREATE POLICY inventory_changes_insert_policy ON inventory_changes
    FOR INSERT WITH CHECK (
        user_id = current_user_id()
    );

-- Shopping Lists Policies
CREATE POLICY shopping_lists_select_policy ON shopping_lists
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM user_households())
    );

CREATE POLICY shopping_lists_insert_policy ON shopping_lists
    FOR INSERT WITH CHECK (
        user_has_permission(household_id, 'member')
        AND created_by_user_id = current_user_id()
    );

CREATE POLICY shopping_lists_update_policy ON shopping_lists
    FOR UPDATE USING (
        user_has_permission(household_id, 'member')
    );

-- Shopping List Items Policies
CREATE POLICY shopping_list_items_select_policy ON shopping_list_items
    FOR SELECT USING (
        shopping_list_id IN (
            SELECT id FROM shopping_lists 
            WHERE household_id IN (SELECT household_id FROM user_households())
        )
    );

CREATE POLICY shopping_list_items_insert_policy ON shopping_list_items
    FOR INSERT WITH CHECK (
        shopping_list_id IN (
            SELECT id FROM shopping_lists 
            WHERE household_id IN (SELECT household_id FROM user_households())
            AND user_has_permission(household_id, 'member')
        )
    );

CREATE POLICY shopping_list_items_update_policy ON shopping_list_items
    FOR UPDATE USING (
        shopping_list_id IN (
            SELECT id FROM shopping_lists 
            WHERE household_id IN (SELECT household_id FROM user_households())
            AND user_has_permission(household_id, 'member')
        )
    );

-- Notifications Policies
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT USING (
        user_id = current_user_id()
    );

CREATE POLICY notifications_update_policy ON notifications
    FOR UPDATE USING (
        user_id = current_user_id()
    );

-- Household Settings Policies
CREATE POLICY household_settings_select_policy ON household_settings
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM user_households())
    );

CREATE POLICY household_settings_update_policy ON household_settings
    FOR UPDATE USING (
        user_has_permission(household_id, 'admin')
    );

-- =====================================================
-- TRIGGER FÜGGVÉNYEK
-- =====================================================

-- Updated_at mező automatikus frissítése
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger-ek létrehozása
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at 
    BEFORE UPDATE ON households 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_inventory_updated_at 
    BEFORE UPDATE ON household_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at 
    BEFORE UPDATE ON shopping_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at 
    BEFORE UPDATE ON shopping_list_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_settings_updated_at 
    BEFORE UPDATE ON household_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_suggestions_updated_at 
    BEFORE UPDATE ON auto_suggestions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUDIT LOG TRIGGER
-- =====================================================

-- Készlet változások automatikus naplózása
CREATE OR REPLACE FUNCTION log_inventory_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO inventory_changes (
            household_inventory_id, user_id, change_type,
            old_quantity, new_quantity, quantity_change, reason
        ) VALUES (
            NEW.id, NEW.added_by_user_id, 'add',
            0, NEW.quantity, NEW.quantity, 'Új termék hozzáadása'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.quantity != NEW.quantity THEN
            INSERT INTO inventory_changes (
                household_inventory_id, user_id, change_type,
                old_quantity, new_quantity, quantity_change, reason
            ) VALUES (
                NEW.id, current_user_id(), 'update',
                OLD.quantity, NEW.quantity, NEW.quantity - OLD.quantity, 'Mennyiség módosítása'
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO inventory_changes (
            household_inventory_id, user_id, change_type,
            old_quantity, new_quantity, quantity_change, reason
        ) VALUES (
            OLD.id, current_user_id(), 'remove',
            OLD.quantity, 0, -OLD.quantity, 'Termék eltávolítása'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger létrehozása
CREATE TRIGGER inventory_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON household_inventory
    FOR EACH ROW EXECUTE FUNCTION log_inventory_changes();

-- Kommentek
COMMENT ON FUNCTION current_user_id() IS 'Aktuális felhasználó ID lekérése session-ből';
COMMENT ON FUNCTION user_households() IS 'Felhasználó háztartásainak listája';
COMMENT ON FUNCTION user_has_permission(UUID, TEXT) IS 'Jogosultság ellenőrzés háztartáshoz';
