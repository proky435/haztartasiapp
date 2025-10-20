-- Háztartási App - Adatbázis Inicializálás
-- PostgreSQL 15+ verzióhoz

-- Extensions engedélyezése
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Magyar nyelvi támogatás full-text search-höz
-- CREATE TEXT SEARCH CONFIGURATION hungarian (COPY = simple);

-- Időzóna beállítása
SET timezone = 'Europe/Budapest';

-- Alapértelmezett séma
SET search_path = public;

-- Komment a verzióról
COMMENT ON DATABASE haztartasi_app IS 'Háztartási Készletkezelő Alkalmazás - v1.0';

-- Kezdeti log
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;
