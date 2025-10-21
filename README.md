# 🏠 Háztartási Készletkezelő Alkalmazás

Egy modern, okos háztartási készletkezelő alkalmazás, amely segít nyomon követni az otthoni termékeket, lejárati dátumokat és automatikusan kezeli a bevásárlólistát.

## ✨ Főbb Funkciók

### 🚀 Villámgyors Adatbevitel (3-5 másodperc)
- **Vonalkód beolvasás**: Automatikus termék felismerés Open Food Facts adatbázis alapján
- **OCR dátum felismerés**: Lejárati dátum automatikus kiolvasása kamerával
- **Manuális bevitel**: Gyors kézi adatbevitel ismeretlen termékekhez

### 📊 Átlátható Készletkezelés
- **Prioritási rendszer**: Lejárat szerint automatikus rendezés
- **Színkódolt jelzések**: 
  - 🔴 Lejárt termékek
  - 🟠 Ma lejáró termékek  
  - 🟡 3 napon belül lejáró termékek
  - 🟢 Biztonságos termékek
- **Helyek szerinti szűrés**: Hűtő, Fagyasztó, Kamra, Egyéb
- **Gyorskereső**: Azonnali szűrés gépelés közben

### 🛒 Automatikus Bevásárlólista
- **Zárt rendszer**: Elfogyott termékek automatikusan a bevásárlólistára kerülnek
- **Vásárlás követés**: Megvásárolt tételek jelölése
- **Újra beolvasás**: Megvásárolt termékek egyszerű visszahelyezése a készletbe

### 🔔 Proaktív Értesítések
- **Valós idejű figyelmeztetések**: Lejáró termékekről azonnali értesítés
- **Prioritásos megjelenítés**: A legfontosabb értesítések előtérben

### 🍳 Intelligens Receptjavaslatok
- **Készlet alapú keresés**: Receptek keresése a meglévő hozzávalók alapján
- **Hiányzó hozzávalók**: Automatikus számítás és bevásárlólistához adás
- **Szűrési lehetőségek**: Diéta, konyha típusa, elkészítési idő szerint
- **Részletes receptek**: Hozzávalók, elkészítés, tápanyag információk
- **Elérhetőségi pontszám**: Receptek rangsorolása a készlet alapján

### 🌙 Modern UI/UX
- **Sötét/világos téma**: Automatikus rendszer preferencia követés
- **Reszponzív design**: Tökéletes megjelenés minden eszközön
- **Smooth animációk**: Professzionális felhasználói élmény
- **Intuitív navigáció**: Egyszerű és gyors használat

## 🛠️ Technológiai Stack

### Frontend
- **React 18.3.1**: Modern komponens alapú UI
- **CSS Variables**: Dinamikus téma rendszer
- **Context API**: Globális állapot kezelés
- **Responsive Design**: Mobile-first megközelítés

### Integráció & API-k
- **Spoonacular API**: Receptek és táplálkozási adatok
- **Open Food Facts**: Termék információk
- **Vonalkód olvasás**: Quagga.js
- **OCR**: Tesseract.js dátum felismerés

### Backend & Adatbázis
- **Node.js + Express**: RESTful API
- **PostgreSQL**: Relációs adatbázis
- **JWT**: Biztonságos autentikáció
- **Bcrypt**: Jelszó titkosítás

### Fejlesztői Eszközök
- **date-fns**: Dátum manipuláció
- **Vanilla CSS**: Tiszta, optimalizált stílusok

## 📱 Telepítés és Futtatás

### Előfeltételek
- Node.js (14+ verzió)
- npm vagy yarn

### Telepítés
```bash
# Projekt klónozása
git clone <repository-url>
cd haztartasiapp

# Függőségek telepítése
cd client
npm install

# Environment változók beállítása (opcionális)
cp .env.example .env
# Szerkeszd a .env fájlt és add meg a Spoonacular API kulcsod

# Alkalmazás indítása
npm start
```

Az alkalmazás elérhető lesz:
- **Helyi gépen**: `http://localhost:3000`
- **Hálózaton**: `http://[IP_CÍMED]:3000` (pl. `http://192.168.1.100:3000`)

### 📱 Hálózati Hozzáférés
Az alkalmazás automatikusan elérhető lesz a helyi hálózaton lévő más eszközökről is:
1. **IP cím megkeresése**: 
   - Windows: `ipconfig` parancs a Command Prompt-ban
   - A "IPv4 Address" értéket használd
2. **Hozzáférés más eszközről**: 
   - Mobil/tablet: `http://[IP_CÍMED]:3000`
   - Másik számítógép: `http://[IP_CÍMED]:3000`

**Példa**: Ha az IP címed `192.168.1.100`, akkor az alkalmazás elérhető lesz a `http://192.168.1.100:3000` címen.

### 🍳 Spoonacular API Beállítása (Receptekhez)

A receptjavaslatok funkció használatához szükséges egy ingyenes Spoonacular API kulcs:

1. **Regisztráció**: Látogass el a [Spoonacular API](https://spoonacular.com/food-api) oldalra
2. **Ingyenes fiók**: Hozz létre egy ingyenes fiókot (150 kérés/nap limit)
3. **API kulcs**: Másold ki az API kulcsot a dashboard-ról
4. **Beállítás**: Add hozzá a `.env` fájlhoz:
   ```
   REACT_APP_SPOONACULAR_API_KEY=your_actual_api_key_here
   ```

**Megjegyzés**: API kulcs nélkül is működik az alkalmazás, de a receptjavaslatok funkció nem lesz elérhető.

## 🎯 Használat

### 1. Új Termék Hozzáadása
1. Kattints az "Új Termék" gombra
2. **Vonalkód módszer**: 
   - Kattints "Vonalkód Beolvasása"
   - Irányítsd a kamerát a vonalkódra
   - Az app automatikusan felismeri a terméket
3. **OCR módszer**:
   - Kattints "Dátum Felismerése (OCR)"
   - Irányítsd a kamerát a lejárati dátumra
   - Az app automatikusan kiolvasza a dátumot
4. Állítsd be a mennyiséget és helyet
5. Mentés

### 2. Készlet Kezelése
- **Szűrés**: Válaszd ki a helyet (Hűtő, Kamra, stb.)
- **Rendezés**: Lejárat vagy név szerint
- **Mennyiség módosítás**: +/- gombokkal
- **Törlés**: Automatikusan bevásárlólistára kerül

### 3. Bevásárlólista
- Váltás a 🛒 Bevásárlás fülre
- Tételek kipipálása vásárlás után
- "Beolvas" gombbal visszahelyezés a készletbe

## 🔮 Jövőbeli Fejlesztések

- [ ] Push értesítések
- [ ] Megosztott háztartás (több felhasználó)
- [ ] Receptajánló a meglévő alapanyagok alapján
- [ ] Statisztikák és jelentések
- [ ] Offline működés
- [ ] Mobilalkalmazás (React Native)

## 🤝 Közreműködés

A projekt nyitott a közreműködésre! Kérjük:
1. Fork-old a repository-t
2. Hozz létre egy feature branch-et
3. Commit-old a változtatásokat
4. Nyiss egy Pull Request-et

## 📄 Licenc

Ez a projekt MIT licenc alatt áll.

## 🐛 Hibabejelentés

Ha hibát találsz vagy új funkciót javasolnál, kérjük nyiss egy Issue-t a GitHub-on.

---

**Készítette**: Háztartási App Fejlesztő Csapat  
**Verzió**: 1.0.0  
**Utolsó frissítés**: 2024. október 19.
