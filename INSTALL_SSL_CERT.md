# SSL Tanúsítvány Telepítése Windows-ra

## Probléma
A böngésző nem bízik meg a self-signed SSL tanúsítványban, ezért `NET::ERR_CERT_AUTHORITY_INVALID` hibát dob.

## Megoldás 1: Gyors - Böngészőben elfogadás

### Chrome/Edge:
1. Nyisd meg: `https://192.168.0.19:3001/health`
2. Kattints: **"Speciális"** vagy **"Advanced"**
3. Kattints: **"Tovább a 192.168.0.19 (nem biztonságos) webhelyre"**
4. Ismételd meg: `https://192.168.0.19:3000`

**Hátrány:** Minden böngésző újraindításnál el kell fogadni.

---

## Megoldás 2: Tartós - Tanúsítvány telepítése (AJÁNLOTT)

### Windows - Tanúsítvány importálása:

1. **Nyisd meg a tanúsítványt:**
   - Navigálj: `c:\Users\DELL\Desktop\GITHUB\haztartasiapp\ssl\server.crt`
   - Dupla kattintás a `server.crt` fájlra

2. **Tanúsítvány telepítése:**
   - Kattints: **"Tanúsítvány telepítése..."** vagy **"Install Certificate..."**
   - Válaszd: **"Helyi számítógép"** vagy **"Local Machine"**
   - Kattints: **"Tovább"** vagy **"Next"**

3. **Tanúsítványtároló kiválasztása:**
   - Válaszd: **"Minden tanúsítvány tárolása a következő tárolóban"**
   - Kattints: **"Tallózás..."** vagy **"Browse..."**
   - Válaszd: **"Megbízható legfelső szintű hitelesítésszolgáltatók"** vagy **"Trusted Root Certification Authorities"**
   - Kattints: **"OK"**

4. **Befejezés:**
   - Kattints: **"Tovább"** → **"Befejezés"**
   - Biztonsági figyelmeztetésnél: **"Igen"**

5. **Böngésző újraindítása:**
   - Zárd be teljesen a böngészőt
   - Indítsd újra

### Ellenőrzés:
- Nyisd meg: `https://192.168.0.19:3001/health`
- **Nem** kéne hibaüzenetet kapnod
- A lakat ikon mellett: "Nem biztonságos" helyett csak egy figyelmeztetés lesz

---

## Megoldás 3: PowerShell parancs (Gyors telepítés)

Nyisd meg PowerShell-t **Rendszergazdaként** és futtasd:

```powershell
# Navigálj a projekt mappába
cd "c:\Users\DELL\Desktop\GITHUB\haztartasiapp"

# Importáld a tanúsítványt
Import-Certificate -FilePath ".\ssl\server.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

Ezután indítsd újra a böngészőt.

---

## Megoldás 4: mkcert használata (Legjobb development-hez)

Ha gyakran dolgozol HTTPS-sel, telepítsd a `mkcert` eszközt:

### Telepítés:
```powershell
# Chocolatey-vel
choco install mkcert

# VAGY Scoop-pal
scoop bucket add extras
scoop install mkcert
```

### Használat:
```powershell
# CA telepítése
mkcert -install

# Új tanúsítvány generálása
cd "c:\Users\DELL\Desktop\GITHUB\haztartasiapp\ssl"
mkcert 192.168.0.19 localhost 127.0.0.1

# Fájlok átnevezése
mv 192.168.0.19+2.pem server.crt
mv 192.168.0.19+2-key.pem server.key
```

Ezután indítsd újra a szervereket.

---

## Tesztelés

Miután telepítetted a tanúsítványt:

1. **Indítsd újra a böngészőt**
2. **Töröld a Service Worker cache-t:**
   - F12 → Application → Service Workers → Unregister
   - Application → Storage → Clear site data
3. **Frissítsd az oldalt:** Ctrl+Shift+R
4. **Ellenőrzés:** `https://192.168.0.19:3001/health` - nem kéne hibát dobnia

---

## Gyakori hibák

### "A tanúsítvány nem megbízható"
- Győződj meg róla, hogy a **"Megbízható legfelső szintű hitelesítésszolgáltatók"** tárolóba telepítetted
- NE a "Személyes" vagy "Köztes" tárolóba!

### "Továbbra is hibát kapok"
- Indítsd újra a böngészőt TELJESEN (zárd be az összes ablakot)
- Töröld a böngésző cache-t
- Ellenőrizd, hogy a backend és frontend is ugyanazt a tanúsítványt használja
