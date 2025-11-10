-- Háztartási App - Kezdeti mintaadatok
-- Futtatási sorrend: 05-sample-data.sql

-- =====================================================
-- DEMO FELHASZNÁLÓK
-- =====================================================

-- Demo felhasználók (jelszó: "password123" mindegyiknél)
INSERT INTO users (id, email, password_hash, name, email_verified) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'demo@haztartasi.app',
    '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', -- password123
    'Demo Felhasználó',
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    'anna@haztartasi.app',
    '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqQqQqQqQqQqQq',
    'Nagy Anna',
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    'peter@haztartasi.app',
    '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqQqQqQqQqQqQq',
    'Kovács Péter',
    true
);

-- =====================================================
-- DEMO HÁZTARTÁSOK
-- =====================================================

INSERT INTO households (id, name, description, invite_code, settings) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Nagy Család',
    'Nagy család háztartása - 3 fő',
    'NAGY2024',
    '{"currency": "HUF", "default_location": "Kamra", "expiry_warnings": true}'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Kovács Háztartás',
    'Kovács család otthona',
    'KOVACS24',
    '{"currency": "HUF", "default_location": "Konyha", "budget_limit": 50000}'
);

-- =====================================================
-- HÁZTARTÁS TAGSÁGOK
-- =====================================================

INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES
-- Nagy Család
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin', NOW() - INTERVAL '30 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member', NOW() - INTERVAL '25 days'),

-- Kovács Háztartás
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'admin', NOW() - INTERVAL '20 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'member', NOW() - INTERVAL '15 days');

-- =====================================================
-- TERMÉK MASTER ADATOK (Open Food Facts példák)
-- =====================================================

INSERT INTO products_master (id, barcode, name, brand, category, image_url, nutrition_data, allergens) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '3017620422003',
    'Nutella',
    'Ferrero',
    'Édesség',
    'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_hu.jpg',
    '{"energy": 2252, "fat": 30.9, "carbohydrates": 57.5, "sugars": 56.3, "protein": 6.3, "salt": 0.107}',
    ARRAY['Mogyoró', 'Tej', 'Szója']
),
(
    '22222222-2222-2222-2222-222222222222',
    '5900020005847',
    'Kenyér',
    'Pékség',
    'Pékáru',
    NULL,
    '{"energy": 1100, "fat": 2.5, "carbohydrates": 45, "protein": 8, "salt": 1.2}',
    ARRAY['Glutén']
),
(
    '33333333-3333-3333-3333-333333333333',
    '5999048017123',
    'Tej 2.8%',
    'Milli',
    'Tejtermék',
    NULL,
    '{"energy": 272, "fat": 2.8, "carbohydrates": 4.8, "protein": 3.4, "calcium": 120}',
    ARRAY['Tej']
),
(
    '44444444-4444-4444-4444-444444444444',
    '8712566441501',
    'Tojás L-es',
    'Farm',
    'Tojás',
    NULL,
    '{"energy": 647, "fat": 9.7, "carbohydrates": 0.3, "protein": 12.8}',
    NULL
);

-- =====================================================
-- HÁZTARTÁSI KÉSZLET
-- =====================================================

INSERT INTO household_inventory (
    household_id, product_master_id, quantity, unit, location, 
    expiry_date, purchase_date, price, added_by_user_id
) VALUES
-- Nagy Család készlete
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    2, 'db', 'Kamra',
    CURRENT_DATE + INTERVAL '6 months',
    CURRENT_DATE - INTERVAL '2 days',
    1200,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    1, 'db', 'Konyha',
    CURRENT_DATE + INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '1 day',
    450,
    '22222222-2222-2222-2222-222222222222'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    1, 'liter', 'Hűtő',
    CURRENT_DATE + INTERVAL '5 days',
    CURRENT_DATE,
    320,
    '11111111-1111-1111-1111-111111111111'
),

-- Kovács Háztartás készlete
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '44444444-4444-4444-4444-444444444444',
    12, 'db', 'Hűtő',
    CURRENT_DATE + INTERVAL '2 weeks',
    CURRENT_DATE - INTERVAL '3 days',
    800,
    '33333333-3333-3333-3333-333333333333'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    2, 'liter', 'Hűtő',
    CURRENT_DATE + INTERVAL '1 week',
    CURRENT_DATE - INTERVAL '1 day',
    640,
    '33333333-3333-3333-3333-333333333333'
);

-- =====================================================
-- BEVÁSÁRLÓLISTÁK
-- =====================================================

INSERT INTO shopping_lists (
    id, household_id, name, status, created_by_user_id, assigned_to_user_id
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Heti bevásárlás',
    'active',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
),
(
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Sürgős bevásárlás',
    'active',
    '33333333-3333-3333-3333-333333333333',
    NULL
);

-- =====================================================
-- BEVÁSÁRLÓLISTA TÉTELEK
-- =====================================================

INSERT INTO shopping_list_items (
    shopping_list_id, product_master_id, custom_name, quantity, unit, priority, estimated_price
) VALUES
-- Nagy Család bevásárlólistája
(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    2, 'db', 3, 900
),
(
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'Alma',
    2, 'kg', 2, 800
),
(
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    NULL,
    3, 'liter', 2, 960
),

-- Kovács Háztartás bevásárlólistája
(
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'Rizs',
    1, 'kg', 1, 500
),
(
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    1, 'db', 1, 1200
);

-- =====================================================
-- FELHASZNÁLÓI BEÁLLÍTÁSOK
-- =====================================================

INSERT INTO user_settings (user_id, notification_preferences, ui_preferences, language) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '{"email": true, "push": true, "expiry_warnings": true, "low_stock": true}',
    '{"theme": "light", "language": "hu", "compact_view": false}',
    'hu'
),
(
    '22222222-2222-2222-2222-222222222222',
    '{"email": true, "push": false, "expiry_warnings": true, "low_stock": false}',
    '{"theme": "auto", "language": "hu", "compact_view": true}',
    'hu'
),
(
    '33333333-3333-3333-3333-333333333333',
    '{"email": false, "push": true, "expiry_warnings": true, "low_stock": true}',
    '{"theme": "dark", "language": "hu", "compact_view": false}',
    'hu'
);

-- =====================================================
-- HÁZTARTÁSI BEÁLLÍTÁSOK
-- =====================================================

INSERT INTO household_settings (
    household_id, auto_shopping_enabled, expiry_warning_days, 
    low_stock_threshold, preferred_stores, budget_settings
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    true, 3, 1.0,
    '["Tesco", "Auchan", "Spar"]',
    '{"monthly_limit": 80000, "categories": {"food": 60000, "household": 20000}}'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    true, 5, 2.0,
    '["Lidl", "Penny", "CBA"]',
    '{"monthly_limit": 50000, "categories": {"food": 40000, "household": 10000}}'
);

-- =====================================================
-- ÉRTESÍTÉSEK
-- =====================================================

INSERT INTO notifications (user_id, household_id, type, title, message, priority) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'expiry_warning',
    'Lejáró termék figyelmeztetés',
    'A kenyér 3 napon belül lejár!',
    3
),
(
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'shopping_list_assigned',
    'Új bevásárlólista',
    'Hozzárendeltek egy bevásárlólistát: Heti bevásárlás',
    2
),
(
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'low_stock',
    'Alacsony készlet',
    'A tej készlete alacsony (2 liter)',
    2
);

-- =====================================================
-- KÖZMŰFOGYASZTÁS ALAPADATOK
-- =====================================================

-- Közműtípusok beszúrása
INSERT INTO utility_types (name, display_name, unit, icon, color, sort_order) VALUES
('water_cold', 'Hideg víz', 'm³', '💧', '#3498db', 1),
('water_hot', 'Meleg víz', 'm³', '🔥', '#e74c3c', 2),
('gas', 'Gáz', 'm³', '🔥', '#f39c12', 3),
('electricity', 'Villany', 'kWh', '⚡', '#f1c40f', 4),
('heating', 'Távfűtés', 'GJ', '🏠', '#9b59b6', 5)
ON CONFLICT (name) DO NOTHING;

-- Demo háztartások közműbeállításai
INSERT INTO household_utility_settings (household_id, utility_type_id, is_enabled, meter_number, current_unit_price, target_monthly_consumption) VALUES
-- Nagy Család beállításai
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'water_cold'),
    true,
    'VIZ001234',
    580.50,
    8.5
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'gas'),
    true,
    'GAZ567890',
    285.75,
    45.0
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'electricity'),
    true,
    'VIL123456',
    70.50,
    180.0
),
-- Kovács Háztartás beállításai
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    (SELECT id FROM utility_types WHERE name = 'water_cold'),
    true,
    'VIZ998877',
    580.50,
    6.0
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    (SELECT id FROM utility_types WHERE name = 'electricity'),
    true,
    'VIL654321',
    70.50,
    120.0
);

-- Demo mérőóra állások (utolsó 3 hónap)
INSERT INTO household_utilities (household_id, utility_type_id, reading_date, meter_reading, unit_price, added_by_user_id) VALUES
-- Nagy Család - Hideg víz
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'water_cold'),
    '2024-08-01',
    1245.350,
    580.50,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'water_cold'),
    '2024-09-01',
    1253.120,
    580.50,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'water_cold'),
    '2024-10-01',
    1261.890,
    580.50,
    '11111111-1111-1111-1111-111111111111'
),
-- Nagy Család - Gáz
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'gas'),
    '2024-08-01',
    2856.450,
    285.75,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'gas'),
    '2024-09-01',
    2898.120,
    285.75,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'gas'),
    '2024-10-01',
    2943.780,
    285.75,
    '11111111-1111-1111-1111-111111111111'
),
-- Nagy Család - Villany
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'electricity'),
    '2024-08-01',
    15678.500,
    70.50,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'electricity'),
    '2024-09-01',
    15845.200,
    70.50,
    '11111111-1111-1111-1111-111111111111'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM utility_types WHERE name = 'electricity'),
    '2024-10-01',
    16023.800,
    70.50,
    '11111111-1111-1111-1111-111111111111'
);

-- Statisztikák frissítése
ANALYZE;

-- Kezdeti adatok betöltése kész
SELECT 'Kezdeti mintaadatok sikeresen betöltve!' as status;
