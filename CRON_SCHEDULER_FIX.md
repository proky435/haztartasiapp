# Cron Scheduler Letiltása - SSL Probléma Megoldás

## Probléma
A cron scheduler okozhatja az SSL tanúsítvány problémákat, mert háttérben próbál kapcsolódni a backend-hez.

## Megoldás ✅

### 1. Környezeti változó hozzáadva

**Fájl:** `server/.env`

```bash
# Cron Scheduler engedélyezése (értesítések, lejárati figyelmeztetések)
ENABLE_CRON_SCHEDULER=false
```

### 2. Kód módosítva

**Fájl:** `server/src/server.js`

A cron scheduler most csak akkor indul el, ha `ENABLE_CRON_SCHEDULER=true`:

```javascript
// Cron scheduler indítása (csak ha engedélyezve van)
if (process.env.ENABLE_CRON_SCHEDULER === 'true') {
  try {
    await cronScheduler.startCronJobs();
    logger.info('✅ Cron scheduler elindítva');
  } catch (error) {
    logger.error('Failed to start cron jobs:', error);
  }
} else {
  logger.info('⏸️  Cron scheduler letiltva (ENABLE_CRON_SCHEDULER=false)');
}
```

### 3. Graceful shutdown is módosítva

A cron scheduler leállítása is csak akkor történik meg, ha engedélyezve volt.

---

## Tesztelés

### 1. Indítsd újra a backend szervert:

```powershell
# Állj meg a jelenlegi szerver (ha fut)
# Ctrl+C a terminálban

# Indítsd újra
cd c:\Users\DELL\Desktop\GITHUB\haztartasiapp\server
npm start
```

### 2. Ellenőrizd a konzol üzeneteket:

Látnod kell:
```
⏸️  Cron scheduler letiltva (ENABLE_CRON_SCHEDULER=false)
```

### 3. Teszteld a backend-et:

Nyisd meg: `https://192.168.0.19:3001/health`

Ha továbbra is SSL hibát kapsz, kövesd az `INSTALL_SSL_CERT.md` útmutatót.

---

## Cron Scheduler újra engedélyezése

Ha később szeretnéd újra engedélyezni a cron schedulert (értesítések, lejárati figyelmeztetések):

1. **Módosítsd a `.env` fájlt:**
   ```bash
   ENABLE_CRON_SCHEDULER=true
   ```

2. **Indítsd újra a szervert**

---

## Mit csinál a Cron Scheduler?

- **Lejárati figyelmeztetések:** Értesítések a lejáró termékekről
- **Alacsony készlet figyelmeztetés:** Értesítések, ha egy termék készlete alacsony
- **Bevásárlólista emlékeztetők:** Rendszeres emlékeztetők a bevásárlólistáról

**Jelenleg le van tiltva**, hogy ne okozzon SSL problémákat development közben.
