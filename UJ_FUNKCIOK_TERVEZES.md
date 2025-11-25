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
- Teljes offline működés
- Szinkronizálás WiFi-n
- Konfliktus kezelés

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
