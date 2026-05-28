# Telefon-kampány admin oldal — Design spec

**Dátum:** 2026-05-28
**Szerző:** Tasnádi Zsolt + Claude (brainstorming)
**Státusz:** Approved (approach), awaiting user spec review

## 1. Cél és motiváció

A DIMOP Plusz-1.2.6/C-26 pályázathoz **25+ partner** küldött ajánlatkérést a Cromwell Global Media Kft-nek. A pályázat keretösszege (2 mrd Ft) szűk → várhatóan **kb. 400 cég nyer**, a többi nem. A Cromwell üzleti érdeke, hogy felmérje:

> **"Kik azok a partnerek, akik akkor is érdeklődnek a Cromwell szolgáltatásai iránt, ha NEM nyerik el a pályázatot?"**

Ezek a partnerek a **pályázattól független piaci leadek** — őket utánkövetni érdemes, akár hosszú távú ügyfélkapcsolat is építhető.

A telefon-kampány célja: minden partnert felhívni, beszélni velük, dokumentálni:
1. Sikerült-e elérni őket
2. Vesztés esetén is érdeklődnek-e
3. Bármilyen plusz megjegyzés (műszaki igények, prioritás, etc.)

## 2. Felhasználási kontextus

- **Egy felhasználó** (Tasnádi Zsolt) hívja a partnereket
- **Lokális tool** — csak `localhost:3456`-on érhető el (`/web/server.js` Express dev szerver)
- **NEM publikus** — soha nem deployolódik Netlify-ra
- **Mobil-használat lehetséges**, ha telefonálás közben kéznél van (responsive)

## 3. Technikai architektúra

### 3.1 Fájl-struktúra

```
/web/
├── admin/                          ← ÚJ MAPPA, build NEM másolja
│   ├── calls.html
│   ├── calls.js
│   └── calls.css
├── data/                           ← ÚJ MAPPA
│   └── calls.json                  ← állapot persistálás (verziókövethető)
├── public/                         ← változatlan
├── server.js                       ← bővítve: 3 új endpoint + static mount
└── ...
```

### 3.2 Adatfolyam

```
┌──────────────────────────────────┐
│ Beerkezett_ajanlatkeresek.xlsx   │  (canonical source, python script gen.)
└────────────┬─────────────────────┘
             │ olvasás (node-xlsx)
             ▼
┌──────────────────────────────────┐
│ GET /api/admin/calls/contacts    │  → 25 cég data
│   (server.js endpoint)           │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ /admin/calls.html (browser)      │  ← user interakció
└────────────┬─────────────────────┘
             │ inline edit → autosave (debounce 500ms)
             ▼
┌──────────────────────────────────┐
│ POST /api/admin/calls/update     │
│   body: { adoszam, field, value }│
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ /web/data/calls.json             │  (atomic write: temp file + rename)
└──────────────────────────────────┘
```

### 3.3 API endpointok

| Method | URL | Body | Response |
|---|---|---|---|
| GET | `/api/admin/calls/contacts` | — | `{ contacts: Contact[] }` |
| GET | `/api/admin/calls/state` | — | `{ states: { [adoszam]: CallState } }` |
| POST | `/api/admin/calls/update` | `{ adoszam, field, value }` | `{ ok: true }` |

#### Data types

```typescript
interface Contact {
  no: number;          // sorszám az xlsx-ből (1-25...)
  datum: string;       // "2026.05.20."
  azon: string;        // egyedi azonosító (pl. "6s251e")
  cegnev: string;
  adoszam: string;     // dedup kulcs
  tel: string;         // formatted: "+36 30 230 2704"
  email: string;
  kontakt: string;     // lehet üres
  igenyek: string;     // a célok semicolon-szeparálva
  tetelszam: number;
}

interface CallState {
  sikerult: 'yes' | 'no' | null;          // sikerült beszélni vele
  erdeklodik_vesztes: 'yes' | 'no' | null; // érdeklődik, ha nem nyer
  megjegyzes: string;                      // szabad szöveg
  last_updated: string;                    // ISO timestamp
}
```

### 3.4 Server.js bővítés

```js
// /web/server.js végéhez

import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import xlsx from 'node-xlsx';

const XLSX_PATH = join(ROOT, 'BEÉRKEZETT AJÁNLATKÉRÉSEK', 'Beerkezett_ajanlatkeresek_DIMOP_2026.xlsx');
const STATE_PATH = join(__dirname, 'data', 'calls.json');

// Static admin (NOT in /public, never built into dist)
app.use('/admin', express.static(join(__dirname, 'admin')));

// API: contacts (from xlsx, always fresh)
app.get('/api/admin/calls/contacts', async (req, res) => {
  const wb = xlsx.parse(XLSX_PATH);
  const sheet = wb.find(s => s.name === 'Beérkezett ajánlatkérések');
  const contacts = sheet.data
    .slice(4)  // skip title + header rows
    .filter(r => typeof r[0] === 'number')
    .map(r => ({ no: r[0], datum: r[1], azon: r[2], cegnev: r[3], adoszam: r[4], tel: r[5], email: r[6], kontakt: r[7] || '', igenyek: r[9], tetelszam: r[10] }));
  res.json({ contacts });
});

// API: state (read calls.json or empty)
app.get('/api/admin/calls/state', async (req, res) => {
  try { res.json({ states: JSON.parse(await readFile(STATE_PATH, 'utf-8')) }); }
  catch { res.json({ states: {} }); }
});

// API: update (atomic write)
app.post('/api/admin/calls/update', async (req, res) => {
  const { adoszam, field, value } = req.body;
  let states = {};
  try { states = JSON.parse(await readFile(STATE_PATH, 'utf-8')); } catch {}
  states[adoszam] = { ...(states[adoszam] || {}), [field]: value, last_updated: new Date().toISOString() };
  await mkdir(dirname(STATE_PATH), { recursive: true });
  const tmp = STATE_PATH + '.tmp';
  await writeFile(tmp, JSON.stringify(states, null, 2));
  await rename(tmp, STATE_PATH);
  res.json({ ok: true });
});
```

## 4. Frontend design

### 4.1 Stílus konzisztencia

Követi a meglévő `/web/public/style.css` változókat:
- `--blue: #003399`, `--blue-light: #e8eef8`, `--accent: #0066cc`, `--green: #198754`, `--orange: #e67e22`, `--red: #dc3545`
- `--gray-50` … `--gray-900` skála
- Font: 'Segoe UI', system-ui
- Radius: 8px
- Shadow: `0 2px 8px rgba(0,0,0,.08)`

### 4.2 Oldal layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER: "📞 Telefon-kampány" + last-updated timestamp + 🔄 refresh btn  │
├──────────────────────────────────────────────────────────────────────────┤
│  STAT KÁRTYÁK (4 db, grid):                                              │
│  ┌────────┬────────┬────────┬────────┐                                   │
│  │ 25     │  8/25  │  5/8   │  3/8   │                                   │
│  │ partner│  hívva │ vesztés│ vesztés│                                   │
│  │        │  (32%) │ esetén │ esetén │                                   │
│  │        │        │ Y      │ N      │                                   │
│  └────────┴────────┴────────┴────────┘                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  FILTER BAR (sticky):                                                    │
│  [● Mindenki (25)] [○ Még nem hívtam (17)] [○ Vesztés-eset Y (5)]       │
│  🔍 [search…]                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│  TÁBLÁZAT (zebra striping, hover state):                                 │
│                                                                          │
│  #  Cégnév + kontakt         Telefon       Hívás Vesztés? Megjegyzés    │
│  ─  ──────────────────────   ────────────  ───── ──────── ───────────   │
│  1  Sziget Kft.              +36 1…    📋  [Y][N]  [Y][N]  [click…]    │
│      —                                                                  │
│  ─  ──────────────────────   ────────────  ───── ──────── ───────────   │
│ 14  ESOTERA Kiadó            +36 30 230📋  ✅ Y   ✅ Y    TGY Magazin   │
│     Sasvári Orsolya                        2026.05.20.    webshop fő    │
│  …                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Sor-specifikus interakciók

#### Telefon + copy:
```html
<span class="tel">+36 30 230 2704</span>
<button class="copy-btn" title="Másolás vágólapra">📋</button>
```
- Kattintásra: `navigator.clipboard.writeText()` → zöld villanás 800ms → "Másolva!" pill
- A telefon maga is kattintható: `tel:+36302302704` linkként (mobil böngészőben tárcsázza)

#### Sikerült beszélni (Y/N):
- 2-opciós pill toggle (`[Y]` zöld / `[N]` piros háttér ha aktív)
- Kattintás → POST `/api/admin/calls/update` `{ field: 'sikerult', value: 'yes'/'no' }`
- Optimistic UI: azonnal frissül, ha hiba akkor revert

#### Vesztés-érdeklődés (Y/N):
- **Disabled, amíg `sikerult !== 'yes'`** (logikailag csak akkor lehet eldönteni, ha tényleg beszéltünk)
- Disabled állapot: szürke, tooltip "Először jelöld be, hogy sikerült beszélni"
- Enabled: ugyanaz a pill UI

#### Megjegyzés:
- `<div contenteditable>` autoresize-zal
- Blur → POST (debounce 500ms intra-keystroke)
- Placeholder: "Kattints a szerkesztéshez…"

### 4.4 Sor-háttér színek (kampány-státusz vizuálja)

| Állapot | Háttér | Bal-border |
|---|---|---|
| Még nem hívva | `#fff` | — |
| Hívva, sikerült + érdeklődik vesztés esetén = Y | `#f0fdf4` (világoszöld) | 4px `--green` |
| Hívva, sikerült + érdeklődik vesztés esetén = N | `#fef3f2` (világos piros) | 4px `--gray-300` |
| Hívva, NEM sikerült | `#fefce8` (világos sárga) | 4px `--orange` |

### 4.5 Szűrő bar viselkedés

- **Pill alapú segmented control** — egyszerre EGY szűrő aktív (sub-modalitások a search-csel)
- Lehetőségek:
  1. Mindenki (25)
  2. Még nem hívtam (sikerult === null)
  3. Hívva, érdeklődik vesztés esetén = Y
  4. Hívva, NEM érdeklődik vesztés esetén
  5. Nem sikerült elérni (sikerult === 'no')
- Search: cégnév + kontakt + megjegyzés fuzzy match

### 4.6 Mobile responsive

- < 768px: táblázat helyett **card view** (egy partner egy kártya, expanded)
- Stat-kártyák 2x2 grid-be
- Touch-friendly button méretek (min 44x44px)

### 4.7 Auto-poll

- 30 másodpercenként GET `/api/admin/calls/contacts` + `/api/admin/calls/state`
- Új cég megjelenésekor: rövid sárga villanás "+1 új partner: TriFem Kft."
- Manual refresh button: 🔄 ikon a header-ben, kattintásra azonnali poll

## 5. Hibakezelés

| Hiba | Kezelés |
|---|---|
| xlsx nem olvasható (törölt/lock-olt) | API 500 + UI banner: "Az adatforrás jelenleg nem elérhető — próbáld újra" |
| calls.json korrupt | API olvasásnál üres `states={}`-tal indul, log a serveren, eredeti fájl backup-olva `.bak`-ként |
| Hálózati hiba (POST update) | Optimistic UI revert + toast: "Nem sikerült menteni, próbáld újra" + retry gomb |
| Concurrent update (két tab) | Last-write-wins (egyfelhasználós tool, kicsi a kockázat) |

## 6. Tesztelhetőség

- **API endpointok**: kézi `curl`-tal tesztelhetőek (lefedett a `node-fetch`-elt smoke tesztben)
- **Frontend interakciók**: Playwright e2e tesztek a critical path-ra:
  1. Oldal betöltődik, 25 sor látszik
  2. Y kattintás → POST → state update → UI sárgára vált
  3. Filter "Még nem hívtam" → 24 sor látszik (Y-os szűrve)
  4. Search "ESOTERA" → 1 sor
  5. Copy gomb → clipboard checked
- **Persistence**: calls.json olvasható + valid JSON minden update után

## 7. Scope (mi NINCS benne)

- ❌ Auth / login (nem kell, localhost-only)
- ❌ Multi-user / role-based (egy felhasználó)
- ❌ Audit log / history (last_updated mező elég)
- ❌ Bulk import/export (manuálisan jó a JSON)
- ❌ Push notifications (poll elég)
- ❌ Hívásnapló (mikor hívtad pontosan) — last_updated kvázi-helyettesíti
- ❌ Címke/tag rendszer — megjegyzés mező elég
- ❌ Naptár-integráció / follow-up emlékeztető — későbbi iteráció lehet

## 8. Build/deploy

- **Dev:** `cd web && node server.js` → `http://localhost:3456/admin/calls.html`
- **Netlify build:** `build.js` változtatás nélkül működik (mivel `/web/admin/` és `/web/data/` nem `public/`-ban van, nem másolódik a `dist/`-be)
- **Verziókövetés:** `web/data/calls.json` `.gitignore`-ban (ügyfél-megjegyzések, hívási státuszok = belső, sosem publikus). Backup-ot a felhasználó manuálisan készít, ha akar.

## 9. Implementációs lépések (high-level)

1. `npm install xlsx` a `/web/package.json`-ba
2. `/web/admin/` mappa + 3 fájl (html, js, css)
3. `/web/data/` mappa + üres `calls.json`
4. `/web/server.js` bővítés: 3 endpoint + static mount
5. `/web/data/.gitignore` (ha kell)
6. Smoke teszt + visual review

A részletes lépésekért lásd: `2026-05-28-telefonkampany-plan.md` (a writing-plans skill fogja generálni).

## 10. Open questions

— Egyik sincs (Auto Mode + reasonable defaults).
