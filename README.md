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

## 🛠️ Technológiai Stack

- **Frontend**: React 18.3.1
- **Vonalkód olvasás**: Quagga.js
- **OCR**: Tesseract.js
- **Dátum kezelés**: date-fns
- **API**: Open Food Facts
- **Stílusok**: Vanilla CSS

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
