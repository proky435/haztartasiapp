-- Migration: Add created_by column to households table
-- Date: 2025-11-26
-- Description: Hozzáadja a created_by oszlopot a households táblához, hogy tudjuk ki hozta létre a háztartást

BEGIN;

-- 1. Oszlop hozzáadása (nullable először)
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Foreign key constraint hozzáadása
ALTER TABLE households
ADD CONSTRAINT fk_households_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Meglévő háztartások created_by értékének beállítása
-- Az első admin tag lesz a created_by
UPDATE households h
SET created_by = (
  SELECT hm.user_id
  FROM household_members hm
  WHERE hm.household_id = h.id 
    AND hm.role = 'admin'
    AND hm.left_at IS NULL
  ORDER BY hm.joined_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- 4. Index létrehozása a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);

-- 5. Komment hozzáadása
COMMENT ON COLUMN households.created_by IS 'A háztartást létrehozó felhasználó ID-ja';

COMMIT;
