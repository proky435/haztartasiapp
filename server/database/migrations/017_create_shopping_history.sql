-- Migration: 017_create_shopping_history.sql
-- Bevásárlási előzmények táblája (pattern analysis)

-- Shopping list item history tábla
CREATE TABLE IF NOT EXISTS shopping_list_item_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_master_id UUID REFERENCES products_master(id),
  custom_name VARCHAR(255),
  custom_brand VARCHAR(255),
  added_to_list_date TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_date TIMESTAMP,
  removed_date TIMESTAMP,
  quantity DECIMAL(10,2),
  unit VARCHAR(20),
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'auto_suggestion', 'low_stock', 'pattern')),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE SET NULL,
  shopping_list_item_id UUID REFERENCES shopping_list_items(id) ON DELETE SET NULL,
  added_by_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_history_household 
ON shopping_list_item_history(household_id, product_master_id);

CREATE INDEX IF NOT EXISTS idx_shopping_history_dates 
ON shopping_list_item_history(added_to_list_date, completed_date);

CREATE INDEX IF NOT EXISTS idx_shopping_history_source 
ON shopping_list_item_history(household_id, source);

COMMENT ON TABLE shopping_list_item_history IS 'Bevásárlási előzmények (pattern analysis és statisztikák)';

COMMENT ON COLUMN shopping_list_item_history.source IS 'Hogyan került a listára: manual, auto_suggestion, low_stock, pattern';
