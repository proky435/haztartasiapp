# Automatikus Törlés - Lejárt Termékek

## Funkció Leírása

Az automatikus törlés funkció **naponta egyszer** (alapértelmezetten hajnali 2:00-kor) ellenőrzi a készletben lévő lejárt termékeket, és automatikusan törli azokat, amelyek már **7 napja lejártak**.

## Implementáció ✅

### 1. **Új Funkciók**

#### `deleteExpiredProducts(daysAfterExpiry)`
- **Fájl:** `server/src/services/notificationSchedulerService.js`
- **Működés:**
  - Lekéri az összes olyan terméket, ami `X` napja lejárt
  - Törli őket (quantity = 0)
  - Értesítést küld a háztartás tagjainak

#### **Cron Job**
- **Fájl:** `server/src/services/cronScheduler.js`
- **Ütemezés:** Naponta 2:00 (alapértelmezett: `0 2 * * *`)
- **Beállítható:** `auto_delete_expired_cron` és `auto_delete_days_after_expiry`

### 2. **Adatbázis Változások**

**Migráció:** `021_add_auto_delete_settings.sql`

Új oszlopok a `system_settings` táblában:
- `auto_delete_expired_cron` - Cron kifejezés (alapértelmezett: `0 2 * * *`)
- `auto_delete_days_after_expiry` - Hány nap után törlés (alapértelmezett: `7`)

### 3. **Környezeti Változók**

**Fájl:** `server/.env`

```bash
# Cron Scheduler engedélyezése
ENABLE_CRON_SCHEDULER=false  # Jelenleg letiltva (SSL probléma miatt)

# Automatikus törlés - hány nap után töröljük a lejárt termékeket
AUTO_DELETE_DAYS_AFTER_EXPIRY=7
```

---

## Használat

### Automatikus Működés (Cron Scheduler)

Ha a cron scheduler engedélyezve van (`ENABLE_CRON_SCHEDULER=true`):

1. **Naponta 2:00-kor** automatikusan lefut
2. Törli a **7 napja lejárt** termékeket
3. Értesítést küld a háztartás tagjainak

### Manuális Futtatás

Ha szeretnéd manuálisan futtatni (pl. teszteléshez):

```javascript
const notificationScheduler = require('./services/notificationSchedulerService');

// Töröl minden 7 napja lejárt terméket
await notificationScheduler.deleteExpiredProducts(7);

// Vagy más időtartammal (pl. 3 nap)
await notificationScheduler.deleteExpiredProducts(3);
```

---

## Beállítások Módosítása

### Adatbázisban (system_settings tábla)

```sql
-- Módosítsd az automatikus törlés ütemezését
UPDATE system_settings 
SET auto_delete_expired_cron = '0 3 * * *'  -- Naponta 3:00-kor
WHERE id = 1;

-- Módosítsd a törlési határidőt
UPDATE system_settings 
SET auto_delete_days_after_expiry = 14  -- 14 nap után törlés
WHERE id = 1;
```

### API-n keresztül (később implementálható)

```javascript
// PUT /api/v1/system-settings/cron
{
  "auto_delete_expired_cron": "0 3 * * *",
  "auto_delete_days_after_expiry": 14
}
```

---

## Értesítések

Amikor a rendszer automatikusan töröl lejárt termékeket, értesítést küld:

**Értesítés típus:** `expired_deleted`

**Tartalom:**
- **Cím:** 🗑️ Lejárt Termékek Törölve
- **Szöveg:** "X régen lejárt termék automatikusan törölve lett a [Háztartás neve] háztartásból"
- **Részletek:**
  - Termék neve
  - Mennyiség
  - Hány napja járt le

**Ki kapja meg:**
- Azok a háztartás tagok, akik engedélyezték a `waste_alerts` értesítéseket

---

## Tesztelés

### 1. Adatbázis Migráció Futtatása

```bash
cd server
npm run migrate
```

### 2. Teszt Adatok Létrehozása

```sql
-- Hozz létre egy 10 napja lejárt terméket
INSERT INTO household_inventory (
  household_id, 
  custom_name, 
  quantity, 
  unit, 
  expiry_date
) VALUES (
  1,  -- Háztartás ID
  'Teszt Lejárt Termék',
  2,
  'db',
  NOW() - INTERVAL '10 days'
);
```

### 3. Manuális Futtatás (Node.js konzolból)

```javascript
const notificationScheduler = require('./src/services/notificationSchedulerService');

// Futtasd le a törlést
notificationScheduler.deleteExpiredProducts(7)
  .then(result => {
    console.log('Törölt termékek:', result.deletedCount);
    console.log('Küldött értesítések:', result.notificationsSent);
  })
  .catch(error => {
    console.error('Hiba:', error);
  });
```

### 4. Ellenőrzés

```sql
-- Ellenőrizd, hogy a termék törölve lett-e (quantity = 0)
SELECT * FROM household_inventory 
WHERE custom_name = 'Teszt Lejárt Termék';
```

---

## Gyakori Kérdések

### Miért van letiltva a cron scheduler?

Jelenleg a cron scheduler le van tiltva (`ENABLE_CRON_SCHEDULER=false`), mert SSL tanúsítvány problémákat okozott. Ha szeretnéd engedélyezni:

1. Oldd meg az SSL problémát (lásd `INSTALL_SSL_CERT.md`)
2. Módosítsd a `.env` fájlt: `ENABLE_CRON_SCHEDULER=true`
3. Indítsd újra a szervert

### Hogyan változtatom meg a törlési határidőt?

Módosítsd az `AUTO_DELETE_DAYS_AFTER_EXPIRY` értéket a `.env` fájlban, vagy az adatbázisban a `system_settings` táblában.

### Vissza lehet állítani a törölt termékeket?

Nem, a törlés végleges (quantity = 0). Azonban az értesítés tartalmazza a törölt termékek listáját, így tudod, mit kell újra beszerezni.

### Lehet-e kikapcsolni az automatikus törlést?

Igen, két módon:
1. **Cron scheduler letiltása:** `ENABLE_CRON_SCHEDULER=false`
2. **Csak az automatikus törlés letiltása:** Állítsd be az `auto_delete_days_after_expiry` értéket nagyon magasra (pl. 9999)

---

## Következő Lépések

- [ ] Adatbázis migráció futtatása
- [ ] Tesztelés teszt adatokkal
- [ ] SSL probléma megoldása
- [ ] Cron scheduler engedélyezése
- [ ] Felhasználói beállítások UI készítése (opcionális)
