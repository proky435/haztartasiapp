# 🚀 Új Funkciók & Lapok Tervezése

## 📊 Jelenlegi Állapot Elemzése

### ✅ Már Megvan:
- Készletkezelés (Inventory)
- Bevásárlólista (Shopping List)
- Receptek (saját + importált)
- Recept megosztás
- Közművek (Utilities)
- Egyéb kiadások (Other Expenses)
- Statisztikák (alapok)
- Barcode scanner
- Push értesítések
- Automatikus fogyasztás tracking
- Automatikus bevásárlólista generálás
- Automatikus lejárt termék törlés

---

## 🆕 ÚJ FUNKCIÓK & LAPOK JAVASLATOK

### 1️⃣ **DASHBOARD / FŐOLDAL** 📊
**Prioritás: MAGAS** | **Jelenleg nincs!**

#### Miért kell?
- Első benyomás az app-ról
- Gyors áttekintés minden fontos adatról
- Központi navigációs pont

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  🏠 Háztartási Áttekintő                │
├─────────────────────────────────────────┤
│                                         │
│  📦 Készlet összesítő                   │
│  ├─ Összes termék: 45 db                │
│  ├─ Lejáró (3 napon belül): 3 db ⚠️     │
│  └─ Alacsony készlet: 5 db 🔴           │
│                                         │
│  🛒 Bevásárlólista                      │
│  └─ 12 termék vár megvásárlásra         │
│                                         │
│  💰 Havi költségek                      │
│  ├─ Eddigi kiadás: 85,000 Ft            │
│  ├─ Költségvetés: 120,000 Ft            │
│  └─ Maradt: 35,000 Ft (29%) 📈          │
│                                         │
│  🍳 Ajánlott receptek                   │
│  └─ 5 recept a meglévő készletből       │
│                                         │
│  ⚡ Gyors műveletek                     │
│  [+ Termék] [📷 Scan] [🛒 Lista]        │
└─────────────────────────────────────────┘
```

#### Widgetek (testreszabható):
- **Készlet widget** - gyors áttekintés
- **Költségvetés widget** - progress bar
- **Lejáró termékek** - piros figyelmeztetés
- **Heti menü** - következő napok étkezései
- **Gyors hozzáadás** - barcode scanner gomb
- **Aktivitás feed** - utolsó műveletek

---

### 2️⃣ **KÖLTSÉGVETÉS KEZELŐ** 💰
**Prioritás: MAGAS** | **Hiányzó modul!**

#### Miért kell?
- Pénzügyi kontroll
- Spórolási célok
- Kiadások elemzése

#### Lapok:

##### 📊 Költségvetés Áttekintő
```
┌─────────────────────────────────────────┐
│  💰 Havi Költségvetés                   │
├─────────────────────────────────────────┤
│                                         │
│  November 2025                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  85,000 / 120,000 Ft (71%)              │
│                                         │
│  📈 Kategóriák:                         │
│  ├─ 🥬 Élelmiszer: 45,000 Ft (53%)      │
│  ├─ ⚡ Közművek: 25,000 Ft (29%)        │
│  ├─ 🏠 Háztartás: 10,000 Ft (12%)       │
│  └─ 🎯 Egyéb: 5,000 Ft (6%)             │
│                                         │
│  🎯 Célok:                              │
│  ├─ Spórolás: 20,000 Ft / 30,000 Ft    │
│  └─ Kevesebb pazarlás: 85% ✅           │
└─────────────────────────────────────────┘
```

##### 📝 Kiadások Naplója
- Minden kiadás listája (dátum, kategória, összeg)
- Szűrés: dátum, kategória, összeg
- Nyugta fotó csatolása
- Ismétlődő kiadások (pl. Netflix, bérleti díj)

##### 📊 Riportok & Grafikonok
- Havi összehasonlítás (bar chart)
- Kategória breakdown (pie chart)
- Trend elemzés (line chart)
- Export PDF/CSV

---

### 3️⃣ **HETI MENÜ TERVEZŐ** 📅
**Prioritás: KÖZEPES** | **Receptek kiegészítés**

#### Miért kell?
- Előre tervezés
- Kevesebb stressz
- Optimális bevásárlás

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  📅 Heti Menü - 2025. Nov 25-Dec 1     │
├─────────────────────────────────────────┤
│                                         │
│  Hétfő 25.                              │
│  ├─ 🌅 Reggeli: Omlett + kávé          │
│  ├─ 🌞 Ebéd: Gulyásleves               │
│  └─ 🌙 Vacsora: Csirkemell + rizs      │
│                                         │
│  Kedd 26.                               │
│  ├─ 🌅 Reggeli: Müzli                  │
│  ├─ 🌞 Ebéd: Maradék gulyás            │
│  └─ 🌙 Vacsora: Pizza                  │
│                                         │
│  [+ Recept hozzáadás]                   │
│  [🛒 Bevásárlólista generálás]          │
│  [📊 Heti kalória összesítő]            │
└─────────────────────────────────────────┘
```

#### Extra funkciók:
- **Drag & drop** - receptek áthúzása napokra
- **Recept javaslatok** - készlet alapján
- **Automatikus bevásárlólista** - hiányzó hozzávalók
- **Kalória tracking** - napi/heti összesítő
- **Sablon menük** - pl. "Heti vegetáriánus menü"

---

### 4️⃣ **PAZARLÁS TRACKER** 🗑️
**Prioritás: KÖZEPES** | **Fenntarthatóság**

#### Miért kell?
- Környezettudatosság
- Pénzmegtakarítás
- Viselkedés változtatás

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  🗑️ Pazarlás Tracker                   │
├─────────────────────────────────────────┤
│                                         │
│  📊 November statisztika:               │
│  ├─ Kidobott termékek: 8 db             │
│  ├─ Érték: ~3,500 Ft 💸                 │
│  ├─ CO2 lábnyom: 2.3 kg 🌍              │
│  └─ Előző hónaphoz képest: -25% ✅      │
│                                         │
│  🏆 Célok:                              │
│  ├─ Havi pazarlás < 5 termék ❌         │
│  └─ Éves megtakarítás: 42,000 Ft 📈     │
│                                         │
│  📋 Leggyakrabban kidobott:             │
│  1. 🥬 Saláta (3x)                      │
│  2. 🍞 Kenyér (2x)                      │
│  3. 🥛 Tej (2x)                         │
│                                         │
│  💡 Javaslatok:                         │
│  - Kisebb kiszerelés vásárlása          │
│  - Gyakoribb bevásárlás                 │
└─────────────────────────────────────────┘
```

#### Gamification:
- **Achievementek**: "1 hónap 0 pazarlás" 🏆
- **Pontrendszer**: Kevesebb pazarlás = több pont
- **Leaderboard**: Háztartások versengése
- **Jutalmak**: Virtuális badge-ek

---

### 5️⃣ **SMART JAVASLATOK** 🤖
**Prioritás: ALACSONY** | **AI-powered**

#### Miért kell?
- Személyre szabott élmény
- Időmegtakarítás
- Jobb döntések

#### Funkciók:

##### 🍳 Recept javaslatok
```
"Van otthon csirkemelled, rizs és brokkoli.
Próbáld ki ezt a receptet: Ázsiai csirke wok!"
```

##### 🛒 Bevásárlási javaslatok
```
"Általában szerdánként vásárolsz tejet.
Szeretnéd hozzáadni a listához?"
```

##### 💰 Spórolási tippek
```
"A tej ára 15%-kal olcsóbb a Lidl-ben.
Érdemes ott vásárolni!"
```

##### ⚠️ Figyelmeztetések
```
"A banán általában 3 nap alatt megromlik.
Biztos, hogy 2 kg-ot veszel?"
```

---

### 6️⃣ **CSALÁDI PROFIL & PREFERENCIÁK** 👨‍👩‍👧‍👦
**Prioritás: KÖZEPES** | **Személyre szabás**

#### Miért kell?
- Családtagok kezelése
- Allergiák nyomon követése
- Preferenciák mentése

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  👨‍👩‍👧‍👦 Családi Profil                  │
├─────────────────────────────────────────┤
│                                         │
│  Családtagok:                           │
│  ├─ 👨 Péter (Felnőtt)                  │
│  │  ├─ Allergiák: Mogyoró 🥜            │
│  │  ├─ Kedvenc ételek: Pizza, Gulyás   │
│  │  └─ Diéta: Nincs                    │
│  │                                      │
│  ├─ 👩 Anna (Felnőtt)                   │
│  │  ├─ Allergiák: Laktóz 🥛             │
│  │  ├─ Kedvenc ételek: Saláta, Hal     │
│  │  └─ Diéta: Vegetáriánus 🌱          │
│  │                                      │
│  └─ 👧 Emma (Gyerek, 8 év)              │
│     ├─ Allergiák: Nincs                │
│     ├─ Nem szereti: Brokkoli 🥦         │
│     └─ Kedvenc: Spagetti 🍝             │
│                                         │
│  🎯 Háztartási beállítások:             │
│  ├─ Főzési gyakoriság: Naponta          │
│  ├─ Étkezések száma: 3/nap              │
│  └─ Költségvetés: 120,000 Ft/hó         │
└─────────────────────────────────────────┘
```

#### Integráció:
- **Recept szűrés** - allergiák alapján
- **Javaslatok** - preferenciák szerint
- **Menü tervezés** - mindenki kedvencei
- **Bevásárlólista** - családi igények

---

### 7️⃣ **AKTIVITÁS NAPLÓ** 📜
**Prioritás: ALACSONY** | **Átláthatóság**

#### Miért kell?
- Háztartási átláthatóság
- Ki mit csinált?
- Audit trail

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  📜 Aktivitás Napló                     │
├─────────────────────────────────────────┤
│                                         │
│  Ma, 19:30                              │
│  👨 Péter hozzáadott 2 db Tej-et        │
│                                         │
│  Ma, 18:45                              │
│  👩 Anna törölte: Lejárt kenyér         │
│                                         │
│  Ma, 12:15                              │
│  👨 Péter elkészítette: Gulyásleves     │
│                                         │
│  Tegnap, 20:00                          │
│  👩 Anna bevásárolt (15 termék)         │
│  Összeg: 8,500 Ft                       │
│                                         │
│  [Szűrés: Személy | Típus | Dátum]     │
└─────────────────────────────────────────┘
```

---

### 8️⃣ **KÖZÖSSÉGI FUNKCIÓK** 👥
**Prioritás: ALACSONY** | **Social features**

#### Funkciók:

##### 🏆 Leaderboard
```
"Top 10 Legkevesebb Pazarlás"
1. 🥇 Kovács család - 0.5 kg/hó
2. 🥈 Nagy család - 1.2 kg/hó
3. 🥉 Szabó család - 1.8 kg/hó
```

##### 💬 Tippek megosztása
```
"Anna megosztott egy tippet:
'A banánt a hűtőben tárolva tovább eláll!'"
```

##### 🍳 Recept verseny
```
"Heti Recept Kihívás: Vegetáriánus vasárnap
Küldd be a legjobb vegán receptedet!"
```

---

### 9️⃣ **BOLT ÖSSZEHASONLÍTÓ** 🛒
**Prioritás: ALACSONY** | **Pénzmegtakarítás**

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  🛒 Bolt Összehasonlító                 │
├─────────────────────────────────────────┤
│                                         │
│  Bevásárlólista (12 termék):            │
│  Becsült költség:                       │
│                                         │
│  🏪 Tesco      - 8,500 Ft ✅ Legolcsóbb │
│  🏪 Auchan     - 8,900 Ft               │
│  🏪 Lidl       - 9,200 Ft               │
│  🏪 Spar       - 9,500 Ft               │
│                                         │
│  💰 Megtakarítás: 1,000 Ft              │
│                                         │
│  📍 Legközelebbi Tesco: 1.2 km          │
│  [🗺️ Térkép] [🛒 Online rendelés]      │
└─────────────────────────────────────────┘
```

---

### 🔟 **ÉRTESÍTÉSI KÖZPONT** 🔔
**Prioritás: KÖZEPES** | **Notification center**

#### Funkciók:
```
┌─────────────────────────────────────────┐
│  🔔 Értesítések                         │
├─────────────────────────────────────────┤
│                                         │
│  🔴 Ma, 08:00                           │
│  ⚠️ 3 termék hamarosan lejár!           │
│  [Megnézem]                             │
│                                         │
│  🟡 Tegnap, 19:00                       │
│  💰 Költségvetés 80%-on!                │
│  [Részletek]                            │
│                                         │
│  🟢 3 napja                             │
│  🎉 Új recept érkezett: Pizza           │
│  [Megtekintés]                          │
│                                         │
│  ⚙️ Beállítások:                        │
│  ├─ ✅ Lejárati figyelmeztetések        │
│  ├─ ✅ Alacsony készlet                 │
│  ├─ ✅ Költségvetés figyelmeztetés      │
│  └─ ❌ Recept javaslatok                │
└─────────────────────────────────────────┘
```

---

## 🎯 AJÁNLOTT IMPLEMENTÁLÁSI SORREND

### 🔥 1. Fázis (1-2 hét) - GYORS NYERESÉG
1. **Dashboard / Főoldal** ⭐⭐⭐
   - Központi navigáció
   - Gyors áttekintés
   - Widget rendszer alapok

2. **Értesítési Központ** ⭐⭐
   - Összes értesítés egy helyen
   - Beállítások kezelése

### 🔥 2. Fázis (2-4 hét) - CORE FUNKCIÓK
3. **Költségvetés Kezelő** ⭐⭐⭐
   - Havi költségvetés
   - Kategóriák
   - Alapvető riportok

4. **Heti Menü Tervező** ⭐⭐
   - Napi étkezések tervezése
   - Recept hozzárendelés
   - Bevásárlólista generálás

### 🔥 3. Fázis (1-2 hónap) - EXTRA FUNKCIÓK
5. **Pazarlás Tracker** ⭐⭐
   - Statisztikák
   - Gamification alapok
   - Javaslatok

6. **Családi Profil** ⭐
   - Családtagok kezelése
   - Allergiák, preferenciák

### 🔥 4. Fázis (2-3 hónap) - ADVANCED
7. **Smart Javaslatok** ⭐
   - AI-alapú tippek
   - Személyre szabás

8. **Közösségi Funkciók** ⭐
   - Leaderboard
   - Tippek megosztása

9. **Bolt Összehasonlító** ⭐
   - Árak összehasonlítása
   - Térkép integráció

---

## 📱 UI/UX FEJLESZTÉSEK

### Navigáció Átgondolása
```
Jelenlegi:
[Készlet] [Bevásárlás] [Receptek] [Közművek] [Egyéb] [Stat] [Beáll]

Javasolt:
[🏠 Főoldal] [📦 Készlet] [🛒 Lista] [🍳 Receptek] 
[💰 Pénzügy] [📊 Stat] [⚙️ Több...]

"Több..." alatt:
- Közművek
- Heti menü
- Pazarlás tracker
- Családi profil
- Értesítések
- Beállítások
```

### Gyors Műveletek (FAB - Floating Action Button)
```
[+] gomb a jobb alsó sarokban:
├─ 📷 Barcode scan
├─ ➕ Termék hozzáadás
├─ 🛒 Bevásárlólista elem
└─ 🍳 Új recept
```

---

## 💡 EXTRA ÖTLETEK

### 1. **Szezonális Javaslatok** 🍂
- Ősz: Tök receptek
- Tél: Meleg levesek
- Tavasz: Friss saláták
- Nyár: Grillezés

### 2. **Ünnepek Támogatása** 🎄
- Karácsony: Menü tervezés
- Húsvét: Bevásárlólista sablon
- Születésnap: Torta receptek

### 3. **Integrációk** 🔗
- Google Calendar - menü szinkronizálás
- Fitbit/Apple Health - kalória tracking
- Spotify - főzés közben zene 🎵

### 4. **Offline Mód Fejlesztése** 📱

#### 4.1 Teljes Offline Működés
**Cél:** Az alkalmazás minden funkciója elérhető internet nélkül is.

**Implementáció:**
```javascript
// Service Worker stratégiák
- Cache First: Statikus fájlok (CSS, JS, képek)
- Network First, Cache Fallback: API hívások
- Background Sync: Adatok szinkronizálása

// IndexedDB használata
- Termékek lokális tárolása
- Bevásárlólista offline cache
- Receptek letöltése offline használatra
- Közműadatok mentése
```

**Funkciók offline módban:**
- ✅ Termékek megtekintése
- ✅ Új termék hozzáadása (szinkronizálásra vár)
- ✅ Bevásárlólista szerkesztése
- ✅ Receptek böngészése (letöltött receptek)
- ✅ Statisztikák megtekintése (cache-elt adatok)
- ⚠️ Háztartás váltás (csak cache-elt háztartások)
- ❌ Új recept keresés (internet szükséges)

#### 4.2 Szinkronizálás WiFi-n
**Automatikus szinkronizálás:**
```javascript
// Background Sync API
if ('serviceWorker' in navigator && 'sync' in registration) {
  // Regisztráljuk a sync eseményt
  await registration.sync.register('sync-inventory');
  await registration.sync.register('sync-shopping-list');
  await registration.sync.register('sync-utilities');
}

// Szinkronizálási stratégia
1. Offline műveletek queue-ba kerülnek
2. WiFi kapcsolat észlelése
3. Queue feldolgozása prioritás szerint:
   - Kritikus: Termék törlés, lejárat módosítás
   - Magas: Új termék, mennyiség változás
   - Közepes: Bevásárlólista módosítás
   - Alacsony: Statisztika frissítés
```

**Szinkronizálási UI:**
```
┌─────────────────────────────────┐
│ 🔄 Szinkronizálás folyamatban   │
│ ━━━━━━━━━━━━━━━━━━━━━━ 75%    │
│                                 │
│ ✅ 12 termék szinkronizálva     │
│ ⏳ 3 művelet várakozik          │
│ ❌ 1 hiba (újrapróbálás...)     │
└─────────────────────────────────┘
```

**Manuális szinkronizálás:**
- Beállítások → "Szinkronizálás most" gomb
- Pull-to-refresh minden listán
- Automatikus szinkronizálás 5 percenként (WiFi-n)

#### 4.3 Konfliktus Kezelés
**Konfliktus típusok:**

**1. Termék mennyiség konfliktus**
```
Offline: Tej 2L → 1L (felhasználás)
Online:  Tej 2L → 3L (vásárlás másik tag által)

Megoldás: Last-Write-Wins + Értesítés
→ "⚠️ Tej mennyisége módosult másik tag által (3L). 
   Felhasználásod (-1L) alkalmazva. Új mennyiség: 2L"
```

**2. Termék törlés konfliktus**
```
Offline: Tej törlése
Online:  Tej mennyiség módosítva másik tag által

Megoldás: Törlés prioritás + Megerősítés
→ "⚠️ Tej módosítva lett mielőtt törölted volna. 
   Biztosan törölni szeretnéd?"
   [Mégse] [Törlés]
```

**3. Bevásárlólista konfliktus**
```
Offline: "Kenyér" hozzáadva
Online:  "Kenyér" már a listán (másik tag adta hozzá)

Megoldás: Merge + Mennyiség összegzés
→ "ℹ️ Kenyér már a listán volt. Mennyiségek összegezve."
```

**Konfliktus feloldási algoritmus:**
```javascript
async function resolveConflict(localData, serverData) {
  const conflictType = detectConflictType(localData, serverData);
  
  switch(conflictType) {
    case 'QUANTITY_CONFLICT':
      // Mindkét változás alkalmazása
      return {
        quantity: serverData.quantity + (localData.quantity - localData.originalQuantity),
        resolvedBy: 'merge',
        notification: 'Mennyiségek összegezve'
      };
      
    case 'DELETE_CONFLICT':
      // Felhasználó dönt
      return await showConflictDialog({
        title: 'Törlési konfliktus',
        message: `${localData.name} módosítva lett. Törlöd?`,
        options: ['Mégse', 'Törlés']
      });
      
    case 'FIELD_CONFLICT':
      // Timestamp alapú döntés
      return localData.timestamp > serverData.timestamp 
        ? localData 
        : serverData;
        
    default:
      // Server wins alapértelmezetten
      return serverData;
  }
}
```

#### 4.4 Offline Indikátor
**UI elemek:**
```
┌─────────────────────────────────┐
│ 📡 Offline mód                  │ ← Header banner
│ 3 művelet szinkronizálásra vár  │
└─────────────────────────────────┘

Status ikon a navigációban:
🟢 Online - Minden szinkronizálva
🟡 Online - Szinkronizálás folyamatban
🔴 Offline - Műveletek queue-ban
⚠️ Offline - Szinkronizálási hiba
```

#### 4.5 Adatkezelés Offline Módban
**LocalStorage vs IndexedDB:**
```javascript
// LocalStorage (max 5-10MB)
- Felhasználói beállítások
- Téma preferencia
- Utolsó háztartás ID
- Szinkronizálási timestamp

// IndexedDB (korlátlan*)
- Teljes termék lista
- Bevásárlólista elemek
- Letöltött receptek
- Közműadatok (utolsó 12 hónap)
- Statisztikai adatok cache
```

**Cache stratégia:**
```javascript
// Cache időtartamok
- Termékek: 24 óra
- Receptek: 7 nap
- Statisztikák: 1 óra
- Közműadatok: 30 nap

// Cache méret limit
- Maximum 50MB per háztartás
- Automatikus tisztítás régi adatoknál
- Felhasználó által törölhető cache
```

#### 4.6 Implementációs Lépések

**1. Fázis - Service Worker Setup** (1 hét)
- [ ] Service Worker regisztráció
- [ ] Cache stratégiák implementálása
- [ ] Offline page létrehozása
- [ ] Network status detection

**2. Fázis - IndexedDB Integráció** (2 hét)
- [ ] IndexedDB schema definiálás
- [ ] CRUD műveletek offline támogatása
- [ ] Adatok szinkronizálása IndexedDB-vel
- [ ] Migration stratégia régi adatokhoz

**3. Fázis - Background Sync** (1 hét)
- [ ] Background Sync API integráció
- [ ] Sync queue kezelés
- [ ] Retry logika hibák esetén
- [ ] Prioritás alapú szinkronizálás

**4. Fázis - Konfliktus Kezelés** (2 hét)
- [ ] Konfliktus detektálás
- [ ] Feloldási algoritmusok
- [ ] UI dialógok konfliktusokhoz
- [ ] Tesztelés különböző scenariókkal

**5. Fázis - UI/UX Fejlesztések** (1 hét)
- [ ] Offline indikátor
- [ ] Szinkronizálási progress bar
- [ ] Toast értesítések szinkronizáláshoz
- [ ] Pull-to-refresh implementálás

**6. Fázis - Tesztelés** (1 hét)
- [ ] Offline funkciók tesztelése
- [ ] Szinkronizálási tesztek
- [ ] Konfliktus scenariók tesztelése
- [ ] Performance tesztek

**Összesen: ~8 hét fejlesztés**

#### 4.7 Technikai Stack
```javascript
// Service Worker
- Workbox (Google's PWA library)
- Cache API
- Background Sync API

// Adattárolás
- IndexedDB (Dexie.js wrapper)
- LocalStorage (kis adatok)

// Szinkronizálás
- Axios interceptors
- Retry mechanizmus (exponential backoff)
- Queue kezelés (prioritás alapú)

// Monitoring
- Online/Offline event listeners
- Network Information API
- Performance API
```

---

## 🎨 DESIGN RENDSZER

### Színek
```
Primér: #4CAF50 (zöld - fenntarthatóság)
Másodlagos: #2196F3 (kék - megbízhatóság)
Figyelmeztetés: #FF9800 (narancs)
Hiba: #F44336 (piros)
Siker: #4CAF50 (zöld)
```

### Ikonográfia
- Material Icons
- Lucide Icons
- Egyedi SVG ikonok

### Tipográfia
- Headings: Poppins (bold)
- Body: Inter (regular)
- Monospace: Fira Code

---

## 📊 MÉRŐSZÁMOK (KPI-k)

### User Engagement
- Daily Active Users (DAU)
- Session időtartam
- Feature használat

### Pazarlás Csökkentés
- Átlagos havi pazarlás
- Megtakarított pénz
- CO2 csökkentés

### Költségvetés
- Költségvetés betartás %
- Átlagos havi kiadás
- Kategóriánkénti breakdown

---

## 🚀 ÖSSZEGZÉS

### TOP 3 LEGFONTOSABB:
1. **Dashboard** - Központi hub, első benyomás
2. **Költségvetés** - Pénzügyi kontroll, új funkció terület
3. **Heti Menü** - Életminőség javítás, időmegtakarítás

### Gyors Nyerések (Quick Wins):
- Értesítési központ
- Aktivitás napló
- Pazarlás tracker alapok

### Hosszú Távú Vízió:
- AI-powered javaslatok
- Közösségi platform
- Bolt integrációk
- Monetizáció (premium funkciók)
