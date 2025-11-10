-- Háztartási App - Indexek és optimalizálás
-- Futtatási sorrend: 03-create-indexes.sql

-- =====================================================
-- FELHASZNÁLÓK ÉS HÁZTARTÁSOK INDEXEK
-- =====================================================

-- Users indexek
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified) WHERE email_verified = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Households indexek
CREATE INDEX idx_households_invite_code ON households(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX idx_households_created_at ON households(created_at);

-- Household members indexek
CREATE INDEX idx_household_members_user ON household_members(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_household_members_household ON household_members(household_id) WHERE left_at IS NULL;
CREATE INDEX idx_household_members_role ON household_members(household_id, role) WHERE left_at IS NULL;

-- =====================================================
-- TERMÉKEK ÉS KÉSZLET INDEXEK
-- =====================================================

-- Products master indexek
CREATE UNIQUE INDEX idx_products_barcode ON products_master(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_name ON products_master(name);
CREATE INDEX idx_products_brand ON products_master(brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_products_category ON products_master(category) WHERE category IS NOT NULL;
CREATE INDEX idx_products_data_quality ON products_master(data_quality_score DESC);

-- Full-text search index termékekhez
CREATE INDEX idx_products_search ON products_master 
USING GIN(to_tsvector('simple', 
    COALESCE(name, '') || ' ' || 
    COALESCE(brand, '') || ' ' || 
    COALESCE(category, '')
));

-- Household inventory indexek
CREATE INDEX idx_inventory_household ON household_inventory(household_id);
CREATE INDEX idx_inventory_product ON household_inventory(product_master_id) WHERE product_master_id IS NOT NULL;
CREATE INDEX idx_inventory_expiry ON household_inventory(household_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_inventory_low_stock ON household_inventory(household_id) WHERE quantity <= minimum_stock;
CREATE INDEX idx_inventory_location ON household_inventory(household_id, location) WHERE location IS NOT NULL;
CREATE INDEX idx_inventory_added_by ON household_inventory(added_by_user_id);
CREATE INDEX idx_inventory_updated_at ON household_inventory(updated_at DESC);

-- Inventory changes indexek
CREATE INDEX idx_inventory_changes_inventory ON inventory_changes(household_inventory_id);
CREATE INDEX idx_inventory_changes_user ON inventory_changes(user_id);
CREATE INDEX idx_inventory_changes_type ON inventory_changes(change_type);
CREATE INDEX idx_inventory_changes_created ON inventory_changes(created_at DESC);

-- =====================================================
-- BEVÁSÁRLÓLISTÁK INDEXEK
-- =====================================================

-- Shopping lists indexek
CREATE INDEX idx_shopping_lists_household ON shopping_lists(household_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(household_id, status);
CREATE INDEX idx_shopping_lists_created_by ON shopping_lists(created_by_user_id);
CREATE INDEX idx_shopping_lists_assigned_to ON shopping_lists(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX idx_shopping_lists_updated ON shopping_lists(updated_at DESC);

-- Shopping list items indexek
CREATE INDEX idx_shopping_items_list ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_items_product ON shopping_list_items(product_master_id) WHERE product_master_id IS NOT NULL;
CREATE INDEX idx_shopping_items_purchased ON shopping_list_items(shopping_list_id, purchased);
CREATE INDEX idx_shopping_items_priority ON shopping_list_items(shopping_list_id, priority DESC);
CREATE INDEX idx_shopping_items_category ON shopping_list_items(shopping_list_id, category) WHERE category IS NOT NULL;

-- =====================================================
-- ÉRTESÍTÉSEK ÉS BEÁLLÍTÁSOK INDEXEK
-- =====================================================

-- Notifications indexek
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_household ON notifications(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- User settings indexek
CREATE UNIQUE INDEX idx_user_settings_user ON user_settings(user_id);

-- Household settings indexek
CREATE UNIQUE INDEX idx_household_settings_household ON household_settings(household_id);

-- =====================================================
-- JAVASLATOK ÉS STATISZTIKÁK INDEXEK
-- =====================================================

-- Auto suggestions indexek
CREATE INDEX idx_suggestions_household ON auto_suggestions(household_id);
CREATE INDEX idx_suggestions_product ON auto_suggestions(product_master_id) WHERE product_master_id IS NOT NULL;
CREATE INDEX idx_suggestions_type ON auto_suggestions(household_id, suggestion_type) WHERE is_active = TRUE;
CREATE INDEX idx_suggestions_confidence ON auto_suggestions(household_id, confidence_score DESC) WHERE is_active = TRUE;

-- Consumption stats indexek
CREATE INDEX idx_consumption_household ON consumption_stats(household_id);
CREATE INDEX idx_consumption_product ON consumption_stats(product_master_id) WHERE product_master_id IS NOT NULL;
CREATE INDEX idx_consumption_period ON consumption_stats(household_id, period_start, period_end);

-- =====================================================
-- JSON INDEXEK (JSONB mezőkhöz)
-- =====================================================

-- Products nutrition data
CREATE INDEX idx_products_nutrition ON products_master USING GIN(nutrition_data);

-- Household settings
CREATE INDEX idx_household_settings_json ON households USING GIN(settings);

-- User preferences
CREATE INDEX idx_user_settings_notifications ON user_settings USING GIN(notification_preferences);
CREATE INDEX idx_user_settings_ui ON user_settings USING GIN(ui_preferences);

-- Household settings JSON
CREATE INDEX idx_household_settings_budget ON household_settings USING GIN(budget_settings);
CREATE INDEX idx_household_settings_stores ON household_settings USING GIN(preferred_stores);

-- =====================================================
-- PARTIAL INDEXEK (feltételes indexek)
-- =====================================================

-- Csak aktív elemekre
CREATE INDEX idx_active_shopping_lists ON shopping_lists(household_id, updated_at DESC) 
WHERE status = 'active';

-- Csak lejáró termékekre
CREATE INDEX idx_expiring_soon ON household_inventory(household_id, expiry_date) 
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

-- Csak alacsony készletű termékekre
CREATE INDEX idx_low_stock_items ON household_inventory(household_id, quantity) 
WHERE quantity <= minimum_stock AND minimum_stock > 0;

-- Csak olvasatlan értesítésekre
CREATE INDEX idx_unread_notifications ON notifications(user_id, priority DESC, created_at DESC) 
WHERE read_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

-- =====================================================
-- STATISZTIKÁK FRISSÍTÉSE
-- =====================================================

-- Automatikus statisztika frissítés
ANALYZE users;
ANALYZE households;
ANALYZE household_members;
ANALYZE products_master;
ANALYZE household_inventory;
ANALYZE shopping_lists;
ANALYZE shopping_list_items;
ANALYZE notifications;

-- =====================================================
-- KÖZMŰFOGYASZTÁS INDEXEK
-- =====================================================

-- Utility types indexek
CREATE INDEX idx_utility_types_active ON utility_types(sort_order) WHERE is_active = TRUE;

-- Household utilities indexek
CREATE INDEX idx_household_utilities_household_date ON household_utilities(household_id, reading_date DESC);
CREATE INDEX idx_household_utilities_type_date ON household_utilities(utility_type_id, reading_date DESC);
CREATE INDEX idx_household_utilities_household_type ON household_utilities(household_id, utility_type_id);
CREATE INDEX idx_household_utilities_added_by ON household_utilities(added_by_user_id);

-- Household utility settings indexek
CREATE INDEX idx_utility_settings_household ON household_utility_settings(household_id);
CREATE UNIQUE INDEX idx_utility_settings_household_type ON household_utility_settings(household_id, utility_type_id);

-- Partial indexek közművekhez
CREATE INDEX idx_utilities_current_month ON household_utilities(household_id, utility_type_id, meter_reading DESC)
WHERE reading_date >= DATE_TRUNC('month', CURRENT_DATE);

CREATE INDEX idx_utilities_with_cost ON household_utilities(household_id, reading_date DESC)
WHERE cost IS NOT NULL;

-- =====================================================
-- STATISZTIKÁK FRISSÍTÉSE (KIEGÉSZÍTÉS)
-- =====================================================

ANALYZE utility_types;
ANALYZE household_utilities;
ANALYZE household_utility_settings;

-- Komment az indexekről
COMMENT ON INDEX idx_products_search IS 'Full-text search index termék nevekhez és márkákhoz';
COMMENT ON INDEX idx_inventory_expiry IS 'Lejárati dátum alapú gyors keresés';
COMMENT ON INDEX idx_notifications_unread IS 'Olvasatlan értesítések gyors lekérdezése';
COMMENT ON INDEX idx_household_utilities_household_date IS 'Háztartási közműfogyasztás dátum szerinti gyors keresés';
COMMENT ON INDEX idx_utilities_current_month IS 'Aktuális havi közműfogyasztás gyors lekérdezése';
