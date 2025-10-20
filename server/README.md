# 🏠 Háztartási App - Backend

Modern háztartási készletkezelő alkalmazás backend része PostgreSQL adatbázissal.

## 🚀 Gyors Indítás

### 1. Előfeltételek
- **Docker Desktop** telepítve és futó állapotban
- **Node.js 18+** (később a backend fejlesztéshez)

### 2. Adatbázis Indítása

```bash
# Navigálj a server mappába
cd server

# Docker konténerek indítása
docker-compose up -d

# Logok megtekintése
docker-compose logs -f postgres
```

### 3. Ellenőrzés

**PostgreSQL kapcsolat tesztelése:**
```bash
# Kapcsolódás az adatbázishoz
docker exec -it haztartasi_postgres psql -U app_user -d haztartasi_app

# Táblák listázása
\dt

# Mintaadatok ellenőrzése
SELECT name, email FROM users;

# Kilépés
\q
```

**pgAdmin használata:**
- Nyisd meg: http://localhost:8080
- Email: `admin@haztartasi.app`
- Jelszó: `admin123`

**Redis ellenőrzése:**
```bash
# Redis CLI
docker exec -it haztartasi_redis redis-cli

# Ping teszt
ping
# Válasz: PONG

# Kilépés
exit
```

## 📊 Adatbázis Struktúra

### Fő Táblák
- **users** - Felhasználók
- **households** - Háztartások/családok
- **household_members** - Tagságok és szerepkörök
- **products_master** - Termék adatok (Open Food Facts cache)
- **household_inventory** - Háztartási készlet
- **shopping_lists** - Bevásárlólisták
- **notifications** - Értesítések

### Mintaadatok
- 3 demo felhasználó
- 2 háztartás
- Termékek készlettel
- Aktív bevásárlólisták
- Értesítések

## 🔧 Hasznos Parancsok

### Docker Kezelés
```bash
# Konténerek indítása
docker-compose up -d

# Konténerek leállítása
docker-compose down

# Adatok törlése (FIGYELEM!)
docker-compose down -v

# Újraindítás
docker-compose restart

# Logok
docker-compose logs -f [service_name]
```

### Adatbázis Műveletek
```bash
# Backup készítése
docker exec haztartasi_postgres pg_dump -U app_user haztartasi_app > backup.sql

# Backup visszaállítása
docker exec -i haztartasi_postgres psql -U app_user haztartasi_app < backup.sql

# SQL fájl futtatása
docker exec -i haztartasi_postgres psql -U app_user haztartasi_app < your_script.sql
```

## 🔒 Biztonsági Funkciók

### Row Level Security (RLS)
- Automatikus adatszeparálás háztartásonként
- Szerepkör alapú hozzáférés-vezérlés
- Audit log minden változásról

### Jogosultságok
- **Admin**: Minden jog a háztartásban
- **Member**: Készlet és lista kezelés
- **Viewer**: Csak olvasási jog

### Automatikus Funkciók
- `updated_at` mezők automatikus frissítése
- Készletváltozások naplózása
- Biztonsági policy-k

## 📱 API Endpoints (tervezett)

```
# Autentikáció
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

# Háztartások
GET    /api/households
POST   /api/households
GET    /api/households/:id/inventory
POST   /api/households/:id/inventory

# Termékek
GET    /api/products/search?q=:query
GET    /api/products/barcode/:barcode

# Bevásárlólisták
GET    /api/households/:id/shopping-lists
POST   /api/households/:id/shopping-lists
```

## 🛠️ Következő Lépések

1. **Node.js Backend** fejlesztése
2. **REST API** implementálása
3. **Open Food Facts** integráció
4. **Autentikáció** (JWT)
5. **Real-time** funkciók (WebSocket)

## 📞 Kapcsolat

Ha problémába ütközöl:
1. Ellenőrizd a Docker logokat: `docker-compose logs`
2. Győződj meg róla, hogy a portok szabadok (5432, 6379, 8080)
3. Indítsd újra a konténereket: `docker-compose restart`

---

**Státusz:** ✅ Adatbázis kész  
**Következő:** Backend API fejlesztés
