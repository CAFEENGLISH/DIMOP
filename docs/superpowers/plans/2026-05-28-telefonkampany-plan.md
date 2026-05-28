# Telefon-kampány Admin Oldal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Belső, lokális admin oldal (`http://localhost:3456/admin/calls.html`) az xlsx-ben tárolt 25+ DIMOP partner telefonos végighívásához, sikerült-e beszélni + vesztés-esetén-érdeklődik + megjegyzés rögzítéssel.

**Architecture:** Express dev server bővítés 3 új API endpointtal (`/api/admin/calls/*`), külön `/web/admin/` és `/web/data/` mappákkal (NEM `/public/`-ban → Netlify build sosem viszi át). Adatforrás a meglévő `Beerkezett_ajanlatkeresek_DIMOP_2026.xlsx`, állapot `web/data/calls.json`-ban (atomic write). Frontend: vanilla JS + CSS a meglévő paletta szerint.

**Tech Stack:** Express (meglévő), `xlsx` npm package, node built-in `node:test` (backend tesztek), vanilla JS/HTML/CSS (frontend, single-file each).

**Spec:** [docs/superpowers/specs/2026-05-28-telefonkampany-design.md](../specs/2026-05-28-telefonkampany-design.md)

---

## File Structure

```
/web/
├── admin/                          ← ÚJ MAPPA (build NEM másolja)
│   ├── calls.html
│   ├── calls.js
│   └── calls.css
├── data/                           ← ÚJ MAPPA
│   ├── .gitkeep                    ← üres, hogy a mappa committolt legyen
│   └── calls.json                  ← gitignored, a futás során generálódik
├── tests/                          ← ÚJ MAPPA
│   └── admin/
│       └── calls-api.test.mjs      ← node:test backend smoke
├── server.js                       ← MÓDOSÍTVA: +static mount, +3 endpoint, +xlsx import
└── package.json                    ← MÓDOSÍTVA: xlsx dependency

/.gitignore                         ← MÓDOSÍTVA: + web/data/calls.json
```

**Felelősségek:**
- `calls.html` — semantic markup, NO inline JS/CSS
- `calls.css` — minden styling, a meglévő `style.css` változóira hivatkozik (`--blue`, `--gray-50` stb.)
- `calls.js` — state management (in-memory) + render + autosave + poll
- `server.js` — endpoints: xlsx parsing, state read/write
- `calls-api.test.mjs` — 3 backend endpoint round-trip tesztje

---

## Task 1: Setup — Dependency + folder structure + gitignore

**Files:**
- Modify: `/web/package.json`
- Create: `/web/admin/.gitkeep`
- Create: `/web/data/.gitkeep`
- Create: `/web/tests/admin/.gitkeep`
- Modify: `/.gitignore`

- [ ] **Step 1: Install xlsx dependency**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && npm install xlsx
```

Expected: `package.json` `dependencies` kibővül `"xlsx": "^x.y.z"`-vel.

- [ ] **Step 2: Create folder skeleton**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && mkdir -p admin data tests/admin && touch admin/.gitkeep data/.gitkeep tests/admin/.gitkeep
```

- [ ] **Step 3: Add calls.json to root .gitignore**

Modify `/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/.gitignore` — add at end:

```
web/data/calls.json
```

- [ ] **Step 4: Verify .gitkeep files are tracked**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git status --short web/
```

Expected output includes:
```
?? web/admin/.gitkeep
?? web/data/.gitkeep
?? web/tests/admin/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/package.json web/package-lock.json web/admin/.gitkeep web/data/.gitkeep web/tests/admin/.gitkeep .gitignore && git commit -m "feat(admin): scaffold telefon-kampány folder structure + xlsx dep

- Új mappák: web/admin (UI), web/data (state), web/tests/admin
- xlsx npm package a Beerkezett_ajanlatkeresek_DIMOP_2026.xlsx olvasásához
- web/data/calls.json gitignored (ügyfél-megjegyzések)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Backend — GET /api/admin/calls/contacts (xlsx → JSON)

**Files:**
- Modify: `/web/server.js` (add static mount + endpoint)
- Create: `/web/tests/admin/calls-api.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `/web/tests/admin/calls-api.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:3456';

test('GET /api/admin/calls/contacts returns >= 20 contacts with required fields', async () => {
  const r = await fetch(`${BASE}/api/admin/calls/contacts`);
  assert.strictEqual(r.status, 200);
  const { contacts } = await r.json();
  assert.ok(Array.isArray(contacts), 'contacts is array');
  assert.ok(contacts.length >= 20, `expected >= 20 contacts, got ${contacts.length}`);
  const c = contacts[0];
  for (const f of ['no', 'datum', 'azon', 'cegnev', 'adoszam', 'tel', 'email', 'kontakt', 'igenyek', 'tetelszam']) {
    assert.ok(f in c, `contact missing field: ${f}`);
  }
  assert.strictEqual(typeof c.no, 'number');
  assert.strictEqual(typeof c.cegnev, 'string');
});
```

- [ ] **Step 2: Run test to confirm it fails (server not extended yet)**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: FAIL — endpoint returns 404 vagy hasonló.

- [ ] **Step 3: Add the endpoint + static mount to server.js**

Modify `/web/server.js`. Tedd a fájl tetejére az importot (a többi import közé):

```javascript
import xlsx from 'xlsx';
```

Tedd az `app.get('/docs/:filename'...)` endpoint után, az `// --- AI Chat ---` blokk elé:

```javascript
// --- Admin: Telefon-kampány ---
const XLSX_PATH = join(ROOT, 'BEÉRKEZETT AJÁNLATKÉRÉSEK', 'Beerkezett_ajanlatkeresek_DIMOP_2026.xlsx');

// Static mount (NOT in /public, never built into dist)
app.use('/admin', express.static(join(__dirname, 'admin')));

app.get('/api/admin/calls/contacts', async (_req, res) => {
  try {
    const wb = xlsx.readFile(XLSX_PATH);
    const ws = wb.Sheets['Beérkezett ajánlatkérések'];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // Az xlsx-ben: 1. sor = title, 2. sor = source, 4. sor = header, 5+. sor = adatok
    const contacts = rows
      .slice(4)
      .filter((r) => typeof r[0] === 'number')
      .map((r) => ({
        no: r[0],
        datum: String(r[1] || ''),
        azon: String(r[2] || ''),
        cegnev: String(r[3] || ''),
        adoszam: String(r[4] || ''),
        tel: String(r[5] || ''),
        email: String(r[6] || ''),
        kontakt: String(r[7] || ''),
        igenyek: String(r[9] || ''),
        tetelszam: Number(r[10] || 0),
      }));
    res.json({ contacts });
  } catch (err) {
    console.error('Contacts API hiba:', err.message);
    res.status(500).json({ error: 'Nem sikerült beolvasni az xlsx-et.' });
  }
});
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: `# pass 1` `# fail 0`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/server.js web/tests/admin/calls-api.test.mjs && git commit -m "feat(admin): GET /api/admin/calls/contacts (xlsx → JSON)

- xlsx parsing a Beerkezett_ajanlatkeresek_DIMOP_2026.xlsx-ből
- Static mount /admin → web/admin/ (NEM Netlify-publikus)
- Smoke test: 20+ contact, kötelező mezők

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Backend — GET /api/admin/calls/state (read calls.json)

**Files:**
- Modify: `/web/server.js`
- Modify: `/web/tests/admin/calls-api.test.mjs`

- [ ] **Step 1: Append failing test**

Append to `/web/tests/admin/calls-api.test.mjs`:

```javascript
test('GET /api/admin/calls/state returns { states: {} } when no file', async () => {
  // töröljük a calls.json-t ha létezik (csak ebben a tesztben)
  const { unlink } = await import('fs/promises');
  const { join } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = join(fileURLToPath(import.meta.url), '..', '..', '..');
  try { await unlink(join(__dirname, 'data', 'calls.json')); } catch {}

  const r = await fetch(`${BASE}/api/admin/calls/state`);
  assert.strictEqual(r.status, 200);
  const body = await r.json();
  assert.ok('states' in body);
  assert.deepStrictEqual(body.states, {});
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: 1 PASS (contacts), 1 FAIL (state — 404 vagy hasonló).

- [ ] **Step 3: Implement the state endpoint**

Modify `/web/server.js`. A `XLSX_PATH` definíció után add hozzá:

```javascript
const STATE_PATH = join(__dirname, 'data', 'calls.json');
```

A `/api/admin/calls/contacts` endpoint UTÁN add hozzá:

```javascript
app.get('/api/admin/calls/state', async (_req, res) => {
  try {
    const { readFile } = await import('fs/promises');
    const raw = await readFile(STATE_PATH, 'utf-8');
    res.json({ states: JSON.parse(raw) });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.json({ states: {} });
    }
    console.error('State olvasás hiba:', err.message);
    res.status(500).json({ error: 'Nem sikerült olvasni a calls.json-t.' });
  }
});
```

- [ ] **Step 4: Run tests, verify both pass**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: `# pass 2` `# fail 0`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/server.js web/tests/admin/calls-api.test.mjs && git commit -m "feat(admin): GET /api/admin/calls/state (read calls.json)

ENOENT esetén üres {} response (még nem volt mentés).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Backend — POST /api/admin/calls/update (atomic write)

**Files:**
- Modify: `/web/server.js`
- Modify: `/web/tests/admin/calls-api.test.mjs`

- [ ] **Step 1: Append round-trip test**

Append to `/web/tests/admin/calls-api.test.mjs`:

```javascript
test('POST /api/admin/calls/update writes state and GET returns it', async () => {
  const updatePayload = { adoszam: '12345678-9-12', field: 'sikerult', value: 'yes' };
  const r = await fetch(`${BASE}/api/admin/calls/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });
  assert.strictEqual(r.status, 200);
  const body = await r.json();
  assert.strictEqual(body.ok, true);

  // Most GET state visszaadja
  const r2 = await fetch(`${BASE}/api/admin/calls/state`);
  const { states } = await r2.json();
  assert.ok(states['12345678-9-12'], 'state írva');
  assert.strictEqual(states['12345678-9-12'].sikerult, 'yes');
  assert.ok(states['12345678-9-12'].last_updated, 'timestamp set');
});

test('POST /api/admin/calls/update — multiple fields on same adoszam merge', async () => {
  await fetch(`${BASE}/api/admin/calls/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adoszam: '12345678-9-12', field: 'megjegyzes', value: 'Friss tartalom' }),
  });
  const r = await fetch(`${BASE}/api/admin/calls/state`);
  const { states } = await r.json();
  assert.strictEqual(states['12345678-9-12'].sikerult, 'yes', 'régi mező megmarad');
  assert.strictEqual(states['12345678-9-12'].megjegyzes, 'Friss tartalom', 'új mező hozzáadva');
});
```

- [ ] **Step 2: Run tests, verify the 2 new ones fail**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: 2 PASS, 2 FAIL.

- [ ] **Step 3: Implement update endpoint (atomic write)**

Modify `/web/server.js`. A state endpoint UTÁN add hozzá:

```javascript
app.post('/api/admin/calls/update', async (req, res) => {
  const { adoszam, field, value } = req.body || {};
  if (!adoszam || !field) {
    return res.status(400).json({ error: 'Hiányzó adoszam vagy field.' });
  }
  const ALLOWED = ['sikerult', 'erdeklodik_vesztes', 'megjegyzes'];
  if (!ALLOWED.includes(field)) {
    return res.status(400).json({ error: `Tiltott field: ${field}` });
  }
  try {
    const { readFile, writeFile, rename, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    let states = {};
    try { states = JSON.parse(await readFile(STATE_PATH, 'utf-8')); } catch {}
    states[adoszam] = {
      ...(states[adoszam] || {}),
      [field]: value,
      last_updated: new Date().toISOString(),
    };
    await mkdir(dirname(STATE_PATH), { recursive: true });
    const tmp = STATE_PATH + '.tmp';
    await writeFile(tmp, JSON.stringify(states, null, 2), 'utf-8');
    await rename(tmp, STATE_PATH);
    res.json({ ok: true });
  } catch (err) {
    console.error('State update hiba:', err.message);
    res.status(500).json({ error: 'Nem sikerült menteni.' });
  }
});
```

- [ ] **Step 4: Run all tests, verify all pass**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: `# pass 4` `# fail 0`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/server.js web/tests/admin/calls-api.test.mjs && git commit -m "feat(admin): POST /api/admin/calls/update with atomic write

- Whitelist: sikerult, erdeklodik_vesztes, megjegyzes
- Merge logic: meglévő mezők megmaradnak, csak field frissül
- Atomic: temp file + rename → soha sincs korrupt calls.json

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — HTML skeleton

**Files:**
- Create: `/web/admin/calls.html`

- [ ] **Step 1: Write the HTML**

Create `/web/admin/calls.html`:

```html
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📞 Telefon-kampány — DIMOP Plusz 1.2.6/C-26</title>
  <link rel="stylesheet" href="/admin/calls.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📞</text></svg>">
</head>
<body>
  <header class="ck-header">
    <div class="ck-header-left">
      <h1>📞 Telefon-kampány</h1>
      <p class="ck-subtitle">DIMOP Plusz-1.2.6/C-26 partnerek</p>
    </div>
    <div class="ck-header-right">
      <span id="lastUpdated" class="ck-meta">—</span>
      <button id="refreshBtn" class="ck-refresh" title="Frissítés">🔄</button>
    </div>
  </header>

  <section class="ck-stats" id="stats">
    <!-- 4 db stat-card JS-ből generálva -->
  </section>

  <section class="ck-filterbar">
    <div class="ck-pills" id="filterPills">
      <button class="ck-pill ck-pill--active" data-filter="all">Mindenki <span class="ck-count" id="count-all">0</span></button>
      <button class="ck-pill" data-filter="uncalled">Még nem hívtam <span class="ck-count" id="count-uncalled">0</span></button>
      <button class="ck-pill" data-filter="interested-loss">Vesztés esetén Y <span class="ck-count" id="count-interested-loss">0</span></button>
      <button class="ck-pill" data-filter="not-interested-loss">Vesztés esetén N <span class="ck-count" id="count-not-interested-loss">0</span></button>
      <button class="ck-pill" data-filter="no-reach">Nem sikerült elérni <span class="ck-count" id="count-no-reach">0</span></button>
    </div>
    <div class="ck-search">
      <input type="text" id="searchInput" placeholder="🔍 keresés cégnévben, kontaktban, megjegyzésben…">
    </div>
  </section>

  <main class="ck-table-wrap">
    <table class="ck-table">
      <thead>
        <tr>
          <th class="ck-col-num">#</th>
          <th class="ck-col-cegnev">Cégnév + kontakt</th>
          <th class="ck-col-tel">Telefon</th>
          <th class="ck-col-sikerult">Sikerült?</th>
          <th class="ck-col-erdeklodik">Vesztés esetén?</th>
          <th class="ck-col-megj">Megjegyzés</th>
        </tr>
      </thead>
      <tbody id="callsTbody">
        <tr><td colspan="6" class="ck-loading">Betöltés…</td></tr>
      </tbody>
    </table>
  </main>

  <div id="toast" class="ck-toast"></div>

  <script type="module" src="/admin/calls.js"></script>
</body>
</html>
```

- [ ] **Step 2: Visually verify in browser (no styling yet — should be ugly but structured)**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open `http://localhost:3456/admin/calls.html` in browser. Expected: tartalom megjelenik (filter pillek + üres táblázat "Betöltés…" sorral, nyilván styling nélkül ronda).

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.html && git commit -m "feat(admin): HTML skeleton for telefon-kampány

Semantic markup, no inline JS/CSS. Filter pills, search input,
empty stats container, table skeleton with loading row.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — CSS styling (palette + table + pills)

**Files:**
- Create: `/web/admin/calls.css`

- [ ] **Step 1: Write the CSS**

Create `/web/admin/calls.css`:

```css
/* Telefon-kampány — admin tool
   A meglévő /style.css változóira hivatkozik közvetlenül. */

:root {
  --blue: #003399;
  --blue-light: #e8eef8;
  --blue-dark: #001a4d;
  --accent: #0066cc;
  --green: #198754;
  --orange: #e67e22;
  --red: #dc3545;
  --gray-50: #f8f9fa;
  --gray-100: #f1f3f5;
  --gray-200: #e9ecef;
  --gray-300: #dee2e6;
  --gray-500: #868e96;
  --gray-700: #495057;
  --gray-900: #212529;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.15);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--gray-900);
  background: var(--gray-50);
  line-height: 1.55;
  padding: 0;
}

/* === Header === */
.ck-header {
  background: linear-gradient(135deg, var(--blue-dark), var(--blue));
  color: #fff;
  padding: 18px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-lg);
  position: sticky;
  top: 0;
  z-index: 50;
}
.ck-header h1 { font-size: 22px; font-weight: 700; }
.ck-subtitle { font-size: 13px; opacity: .8; margin-top: 2px; }
.ck-header-right { display: flex; gap: 12px; align-items: center; }
.ck-meta { font-size: 12px; opacity: .7; }
.ck-refresh {
  background: rgba(255,255,255,.15);
  border: 0;
  color: #fff;
  font-size: 18px;
  padding: 8px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background .15s, transform .15s;
}
.ck-refresh:hover { background: rgba(255,255,255,.25); }
.ck-refresh:active { transform: scale(.95); }
.ck-refresh.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* === Stats === */
.ck-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px 32px;
}
.ck-stat-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 18px 20px;
  box-shadow: var(--shadow);
  border-left: 4px solid var(--blue);
}
.ck-stat-card.is-green { border-left-color: var(--green); }
.ck-stat-card.is-orange { border-left-color: var(--orange); }
.ck-stat-card.is-red { border-left-color: var(--red); }
.ck-stat-num { font-size: 32px; font-weight: 800; color: var(--gray-900); line-height: 1; }
.ck-stat-label { font-size: 13px; color: var(--gray-500); margin-top: 6px; }
.ck-stat-sub { font-size: 11px; color: var(--gray-500); margin-top: 4px; }

/* === Filterbar === */
.ck-filterbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 32px 16px;
  align-items: center;
  justify-content: space-between;
}
.ck-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.ck-pill {
  border: 1px solid var(--gray-300);
  background: #fff;
  color: var(--gray-700);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ck-pill:hover { background: var(--blue-light); border-color: var(--blue); }
.ck-pill--active {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
}
.ck-count {
  background: rgba(255,255,255,.25);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}
.ck-pill:not(.ck-pill--active) .ck-count {
  background: var(--gray-200);
  color: var(--gray-700);
}
.ck-search input {
  border: 1px solid var(--gray-300);
  background: #fff;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  min-width: 320px;
}
.ck-search input:focus {
  outline: 0;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0,51,153,.15);
}

/* === Table === */
.ck-table-wrap {
  padding: 0 32px 64px;
  overflow-x: auto;
}
.ck-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.ck-table th {
  background: var(--blue-dark);
  color: #fff;
  text-align: left;
  padding: 12px 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .5px;
  font-weight: 700;
  position: sticky;
  top: 0;
}
.ck-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--gray-200);
  vertical-align: top;
  font-size: 14px;
}
.ck-table tbody tr {
  border-left: 4px solid transparent;
  transition: background .15s;
}
.ck-table tbody tr:hover { background: var(--blue-light); }
.ck-row--called-y { background: #f0fdf4; border-left-color: var(--green); }
.ck-row--called-n { background: #fef3f2; border-left-color: var(--gray-300); }
.ck-row--no-reach { background: #fefce8; border-left-color: var(--orange); }
.ck-col-num { width: 48px; font-weight: 700; color: var(--gray-500); }
.ck-col-cegnev { min-width: 240px; }
.ck-col-tel { width: 180px; }
.ck-col-sikerult, .ck-col-erdeklodik { width: 110px; }
.ck-col-megj { min-width: 280px; }
.ck-cegnev { font-weight: 600; color: var(--gray-900); }
.ck-kontakt { font-size: 12px; color: var(--gray-500); margin-top: 2px; }
.ck-kontakt--empty::before { content: '—'; color: var(--gray-300); }

/* === Tel + copy === */
.ck-tel-wrap { display: inline-flex; align-items: center; gap: 6px; }
.ck-tel { color: var(--accent); text-decoration: none; font-weight: 500; }
.ck-tel:hover { text-decoration: underline; }
.ck-copy {
  background: var(--gray-100);
  border: 0;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background .15s;
}
.ck-copy:hover { background: var(--gray-200); }
.ck-copy.is-copied { background: var(--green); color: #fff; animation: pop .4s; }
@keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

/* === Y/N pills === */
.ck-yn { display: inline-flex; gap: 4px; }
.ck-yn-btn {
  border: 1px solid var(--gray-300);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: all .15s;
}
.ck-yn-btn:hover:not(:disabled) { background: var(--gray-100); }
.ck-yn-btn.is-y-active { background: var(--green); color: #fff; border-color: var(--green); }
.ck-yn-btn.is-n-active { background: var(--red); color: #fff; border-color: var(--red); }
.ck-yn-btn:disabled { opacity: .4; cursor: not-allowed; }

/* === Megjegyzés === */
.ck-megj {
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--gray-50);
  font-size: 13px;
  cursor: text;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.ck-megj:focus {
  outline: 0;
  background: #fff;
  box-shadow: 0 0 0 2px var(--blue-light);
}
.ck-megj:empty::before {
  content: 'Kattints a szerkesztéshez…';
  color: var(--gray-300);
  font-style: italic;
}

/* === Loading === */
.ck-loading {
  padding: 60px;
  text-align: center;
  color: var(--gray-500);
  font-style: italic;
}

/* === Toast === */
.ck-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--gray-900);
  color: #fff;
  padding: 12px 20px;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity .25s, transform .25s;
  pointer-events: none;
  z-index: 100;
  max-width: 360px;
}
.ck-toast.is-visible { opacity: 1; transform: translateY(0); }
.ck-toast.is-success { background: var(--green); }
.ck-toast.is-error { background: var(--red); }

/* === Mobile === */
@media (max-width: 768px) {
  .ck-header { padding: 14px 18px; }
  .ck-header h1 { font-size: 18px; }
  .ck-stats { grid-template-columns: repeat(2, 1fr); padding: 16px; gap: 10px; }
  .ck-filterbar { padding: 0 16px 12px; flex-direction: column; align-items: stretch; }
  .ck-search input { min-width: 0; width: 100%; }
  .ck-table-wrap { padding: 0; }
  .ck-table { border-radius: 0; }
  .ck-table th { display: none; }
  .ck-table, .ck-table tbody, .ck-table tr, .ck-table td {
    display: block;
    width: 100%;
  }
  .ck-table tr {
    padding: 14px;
    border-bottom: 8px solid var(--gray-100);
  }
  .ck-table td {
    border: 0;
    padding: 6px 0;
  }
  .ck-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    color: var(--gray-500);
    margin-bottom: 4px;
  }
}
```

- [ ] **Step 2: Visually verify**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open `http://localhost:3456/admin/calls.html` in browser. Expected: kék gradiens header, üres stat-grid, filter pillek látszanak (de még nincs adat), táblázat üres header-rel.

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.css && git commit -m "feat(admin): CSS styling with meglévő paletta

Sticky header, stat-card grid, filter pills, table with row-color
states (zöld/piros/sárga), Y/N pill UI, copy button micro-animations,
toast notifications, mobile card-view fallback (<768px).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Frontend — JS skeleton: fetch + render

**Files:**
- Create: `/web/admin/calls.js`

- [ ] **Step 1: Write the JS module**

Create `/web/admin/calls.js`:

```javascript
// Telefon-kampány admin oldal — vanilla JS module
const API = '/api/admin/calls';

const state = {
  contacts: [],
  states: {},
  filter: 'all',
  search: '',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// === Toast ===
function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `ck-toast is-visible ${type ? 'is-' + type : ''}`;
  setTimeout(() => { el.className = 'ck-toast'; }, 2400);
}

// === Tel format ===
function formatTel(raw) {
  return raw || '';
}
function telHref(raw) {
  return 'tel:' + (raw || '').replace(/\s/g, '');
}

// === Filter logic ===
function applyFilter(c, st) {
  const s = state.search.toLowerCase().trim();
  if (s) {
    const hay = `${c.cegnev} ${c.kontakt} ${st?.megjegyzes || ''}`.toLowerCase();
    if (!hay.includes(s)) return false;
  }
  switch (state.filter) {
    case 'all': return true;
    case 'uncalled': return !st || !st.sikerult;
    case 'interested-loss': return st?.sikerult === 'yes' && st?.erdeklodik_vesztes === 'yes';
    case 'not-interested-loss': return st?.sikerult === 'yes' && st?.erdeklodik_vesztes === 'no';
    case 'no-reach': return st?.sikerult === 'no';
  }
  return true;
}

// === Render row ===
function renderRow(c) {
  const st = state.states[c.adoszam] || {};
  const rowClass =
    st.sikerult === 'yes' && st.erdeklodik_vesztes === 'yes' ? 'ck-row--called-y' :
    st.sikerult === 'yes' && st.erdeklodik_vesztes === 'no' ? 'ck-row--called-n' :
    st.sikerult === 'no' ? 'ck-row--no-reach' :
    '';
  const erdeklodikDisabled = st.sikerult !== 'yes';
  return `
    <tr class="${rowClass}" data-adoszam="${c.adoszam}">
      <td class="ck-col-num" data-label="#">${c.no}</td>
      <td class="ck-col-cegnev" data-label="Cégnév">
        <div class="ck-cegnev">${escapeHtml(c.cegnev)}</div>
        <div class="ck-kontakt ${c.kontakt ? '' : 'ck-kontakt--empty'}">${escapeHtml(c.kontakt)}</div>
      </td>
      <td class="ck-col-tel" data-label="Telefon">
        <span class="ck-tel-wrap">
          <a class="ck-tel" href="${telHref(c.tel)}">${formatTel(c.tel)}</a>
          <button class="ck-copy" data-tel="${escapeHtml(c.tel)}" title="Másolás">📋</button>
        </span>
      </td>
      <td class="ck-col-sikerult" data-label="Sikerült?">
        <span class="ck-yn">
          <button class="ck-yn-btn ${st.sikerult === 'yes' ? 'is-y-active' : ''}" data-field="sikerult" data-value="yes">Y</button>
          <button class="ck-yn-btn ${st.sikerult === 'no' ? 'is-n-active' : ''}" data-field="sikerult" data-value="no">N</button>
        </span>
      </td>
      <td class="ck-col-erdeklodik" data-label="Vesztés esetén?">
        <span class="ck-yn">
          <button class="ck-yn-btn ${st.erdeklodik_vesztes === 'yes' ? 'is-y-active' : ''}" data-field="erdeklodik_vesztes" data-value="yes" ${erdeklodikDisabled ? 'disabled' : ''}>Y</button>
          <button class="ck-yn-btn ${st.erdeklodik_vesztes === 'no' ? 'is-n-active' : ''}" data-field="erdeklodik_vesztes" data-value="no" ${erdeklodikDisabled ? 'disabled' : ''}>N</button>
        </span>
      </td>
      <td class="ck-col-megj" data-label="Megjegyzés">
        <div class="ck-megj" contenteditable="true" data-field="megjegyzes">${escapeHtml(st.megjegyzes || '')}</div>
      </td>
    </tr>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// === Render full ===
function render() {
  const tbody = $('#callsTbody');
  const visible = state.contacts.filter((c) => applyFilter(c, state.states[c.adoszam]));
  tbody.innerHTML = visible.length
    ? visible.map(renderRow).join('')
    : `<tr><td colspan="6" class="ck-loading">Nincs találat a szűrőre.</td></tr>`;
  renderStats();
  renderFilterCounts();
}

function renderStats() {
  const total = state.contacts.length;
  const called = state.contacts.filter((c) => state.states[c.adoszam]?.sikerult).length;
  const yesLoss = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'yes').length;
  const noLoss = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'no').length;
  const pct = total ? Math.round((called / total) * 100) : 0;

  $('#stats').innerHTML = `
    <div class="ck-stat-card">
      <div class="ck-stat-num">${total}</div>
      <div class="ck-stat-label">Partner összesen</div>
    </div>
    <div class="ck-stat-card is-orange">
      <div class="ck-stat-num">${called}/${total}</div>
      <div class="ck-stat-label">Hívva</div>
      <div class="ck-stat-sub">${pct}%</div>
    </div>
    <div class="ck-stat-card is-green">
      <div class="ck-stat-num">${yesLoss}</div>
      <div class="ck-stat-label">Vesztés esetén is érdeklődik</div>
    </div>
    <div class="ck-stat-card is-red">
      <div class="ck-stat-num">${noLoss}</div>
      <div class="ck-stat-label">Vesztés esetén nem érdeklődik</div>
    </div>
  `;
}

function renderFilterCounts() {
  $('#count-all').textContent = state.contacts.length;
  $('#count-uncalled').textContent = state.contacts.filter((c) => !state.states[c.adoszam]?.sikerult).length;
  $('#count-interested-loss').textContent = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'yes').length;
  $('#count-not-interested-loss').textContent = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'no').length;
  $('#count-no-reach').textContent = state.contacts.filter((c) => state.states[c.adoszam]?.sikerult === 'no').length;
}

// === Data fetch ===
async function loadAll() {
  try {
    const [cRes, sRes] = await Promise.all([
      fetch(`${API}/contacts`),
      fetch(`${API}/state`),
    ]);
    const { contacts } = await cRes.json();
    const { states } = await sRes.json();
    const prevCount = state.contacts.length;
    state.contacts = contacts;
    state.states = states;
    render();
    updateLastUpdated();
    if (prevCount && contacts.length > prevCount) {
      toast(`+${contacts.length - prevCount} új partner érkezett`, 'success');
    }
  } catch (err) {
    toast('Adatbetöltés hiba: ' + err.message, 'error');
  }
}

function updateLastUpdated() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  $('#lastUpdated').textContent = `Frissítve: ${hh}:${mm}:${ss}`;
}

// === Init ===
loadAll();
```

- [ ] **Step 2: Visually verify data loads**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open `http://localhost:3456/admin/calls.html`. Expected:
- 4 stat-card megjelenik a tetején: "X Partner összesen", "0/X Hívva", "0 Vesztés esetén is", "0 Vesztés esetén nem"
- Filter counts kitöltve a pilleken
- 25+ sor a táblázatban, "Sziget Kft." első sor, "RPS Kft." / "TriFem Kft." / "HÁLÓTERV Kft." / "Mészáros…" utolsók
- Telefon link kék, copy gomb 📋
- Y/N gombok minden sorban, a "vesztés esetén" disabled (szürke)
- Megjegyzés mező placeholder "Kattints a szerkesztéshez…"

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.js && git commit -m "feat(admin): JS data fetch + table render

Parallel GET contacts + state, render table + stats + filter counts.
HTML-escape minden user-controlled string. Toast utility.
Még interakció (Y/N click, megjegyzés edit, copy) nincs benne.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Frontend — Y/N pill interactions + optimistic UI

**Files:**
- Modify: `/web/admin/calls.js`

- [ ] **Step 1: Add update function + click handler at the end of calls.js**

Append to `/web/admin/calls.js` (NOT replace, append before `loadAll()`):

```javascript
// === Update API call ===
async function updateField(adoszam, field, value) {
  const prev = state.states[adoszam] ? { ...state.states[adoszam] } : null;
  // Optimistic update
  state.states[adoszam] = { ...(state.states[adoszam] || {}), [field]: value };
  // Ha sikerult-et N-re vagy null-ra állítottuk, az erdeklodik_vesztes-t is reset
  if (field === 'sikerult' && value !== 'yes') {
    state.states[adoszam].erdeklodik_vesztes = null;
  }
  render();
  try {
    const r = await fetch(`${API}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adoszam, field, value }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    // ha sikerult mező volt + reset → küldjük az erdeklodik_vesztes null-t is
    if (field === 'sikerult' && value !== 'yes' && prev?.erdeklodik_vesztes) {
      await fetch(`${API}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adoszam, field: 'erdeklodik_vesztes', value: null }),
      });
    }
  } catch (err) {
    // Revert
    if (prev) state.states[adoszam] = prev;
    else delete state.states[adoszam];
    render();
    toast('Mentés hiba: ' + err.message, 'error');
  }
}

// === Click delegation: Y/N buttons ===
document.addEventListener('click', (e) => {
  const ynBtn = e.target.closest('.ck-yn-btn');
  if (ynBtn && !ynBtn.disabled) {
    const tr = ynBtn.closest('tr');
    const adoszam = tr.dataset.adoszam;
    const field = ynBtn.dataset.field;
    const value = ynBtn.dataset.value;
    const current = state.states[adoszam]?.[field];
    // Toggle: ha már aktív → reset null-ra; egyébként set
    updateField(adoszam, field, current === value ? null : value);
  }
});
```

- [ ] **Step 2: Visually verify**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open `http://localhost:3456/admin/calls.html`. Próbák:
1. Egy sor "Sikerült" Y gombját kattintsd → zöld háttér, sor világoszöldre vált, "Vesztés esetén" gombok aktívvá válnak
2. "Vesztés esetén" Y → 2. zöld pill aktív, stat-cardok frissülnek
3. "Sikerült" N gomb kattintás → sor sárga, "Vesztés esetén" auto-reset + disabled
4. Ugyanaz a Y gomb újrakattintás → null reset → sor visszafehéredik
5. Frissítsd az oldalt (F5) → minden megmaradt (persistálva calls.json-ban)

Ellenőrizd: `cat web/data/calls.json | jq .` — látszik a state.

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.js && git commit -m "feat(admin): Y/N pill interactions with optimistic UI + revert on error

- Click delegation a tbody-n
- Toggle semantics: ismételt kattintás → null reset
- sikerult !== yes esetén erdeklodik_vesztes auto-reset
- Optimistic update → revert + toast hiba esetén

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Frontend — Megjegyzés inline edit + autosave (debounce 500ms)

**Files:**
- Modify: `/web/admin/calls.js`

- [ ] **Step 1: Add debounce + contenteditable handler**

Append to `/web/admin/calls.js` (NOT replace, append before `loadAll()`):

```javascript
// === Debounce util ===
const debounceMap = new Map();
function debounce(key, fn, ms = 500) {
  clearTimeout(debounceMap.get(key));
  debounceMap.set(key, setTimeout(fn, ms));
}

// === Megjegyzés input ===
document.addEventListener('input', (e) => {
  const megj = e.target.closest('.ck-megj');
  if (!megj) return;
  const tr = megj.closest('tr');
  const adoszam = tr.dataset.adoszam;
  const value = megj.textContent || '';
  debounce(`megj-${adoszam}`, () => {
    fetch(`${API}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adoszam, field: 'megjegyzes', value }),
    }).then((r) => {
      if (!r.ok) toast('Megjegyzés mentés hiba', 'error');
      else {
        // Update in-memory state without re-render (megőrzi a kurzor pozíciót)
        state.states[adoszam] = { ...(state.states[adoszam] || {}), megjegyzes: value };
        updateLastUpdated();
      }
    }).catch((err) => toast('Hálózati hiba: ' + err.message, 'error'));
  }, 500);
});
```

- [ ] **Step 2: Visually verify**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open browser. Próbák:
1. Kattints egy "Kattints a szerkesztéshez…" mezőre → szerkeszthető, placeholder eltűnik
2. Írj "Teszt megjegyzés" → semmi nem történik vizuálisan azonnal
3. 500ms után állj meg → header "Frissítve: HH:MM:SS" frissül
4. F5 oldalfrissítés → szöveg megmarad
5. Ellenőrizd: `cat web/data/calls.json | jq .` — látszik a megjegyzés

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.js && git commit -m "feat(admin): megjegyzés inline edit with debounce 500ms autosave

Contenteditable div, input delegation, debounce-per-adoszam.
NEM full re-render mentés után (megőrzi a kurzort).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Frontend — Copy phone button

**Files:**
- Modify: `/web/admin/calls.js`

- [ ] **Step 1: Add copy handler**

Append to `/web/admin/calls.js` (NOT replace, append before `loadAll()`):

```javascript
// === Copy telefon ===
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.ck-copy');
  if (!btn) return;
  const tel = btn.dataset.tel;
  try {
    await navigator.clipboard.writeText(tel);
    btn.classList.add('is-copied');
    btn.textContent = '✓';
    setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.textContent = '📋';
    }, 1200);
  } catch (err) {
    toast('Vágólap hiba: ' + err.message, 'error');
  }
});
```

- [ ] **Step 2: Visually verify**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open browser. Próbák:
1. Bármilyen 📋 gomb kattintás → zöld háttér + ✓ ikon 1.2 másodpercig
2. Cmd+V/Ctrl+V egy szövegmezőbe → a telefonszám beillesztődik

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.js && git commit -m "feat(admin): copy phone number button → clipboard + visual feedback

navigator.clipboard.writeText + 1.2s 'pop' animation + checkmark.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Frontend — Filter pills + search + manual refresh + auto-poll

**Files:**
- Modify: `/web/admin/calls.js`

- [ ] **Step 1: Add filter/search/refresh/poll handlers**

Append to `/web/admin/calls.js` (NOT replace, append before `loadAll()`):

```javascript
// === Filter pills ===
document.addEventListener('click', (e) => {
  const pill = e.target.closest('.ck-pill');
  if (!pill) return;
  $$('.ck-pill').forEach((p) => p.classList.remove('ck-pill--active'));
  pill.classList.add('ck-pill--active');
  state.filter = pill.dataset.filter;
  render();
});

// === Search ===
$('#searchInput').addEventListener('input', (e) => {
  state.search = e.target.value;
  debounce('search', () => render(), 150);
});

// === Manual refresh ===
$('#refreshBtn').addEventListener('click', async () => {
  const btn = $('#refreshBtn');
  btn.classList.add('spinning');
  await loadAll();
  setTimeout(() => btn.classList.remove('spinning'), 400);
});

// === Auto-poll 30s ===
setInterval(loadAll, 30000);
```

- [ ] **Step 2: Visually verify**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
```

Open browser. Próbák:
1. Kattints "Még nem hívtam" filter → csak a nem-hívott sorok (a Y-on lévő sorok eltűnnek)
2. Search: "ESOTERA" → 1 sor (Sasvári Orsolya)
3. Search törlése → ismét minden sor (a filter szerint)
4. Header 🔄 gomb → animál forgás, frissül
5. Várj 30 másodpercet → automatán pollol (header timestamp frissül)

```bash
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/admin/calls.js && git commit -m "feat(admin): filter pills + search + refresh + 30s auto-poll

5 filter pill (all/uncalled/interested-loss/not-interested-loss/no-reach),
debounced search (150ms), manual refresh button with spinning animation,
setInterval 30s auto-refresh for new contacts.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Build verification — confirm /admin NOT in dist/

**Files:**
- Modify: `/web/tests/admin/calls-api.test.mjs` (új build-isolation teszt hozzáadása)

- [ ] **Step 1: Append build-isolation test**

Append to `/web/tests/admin/calls-api.test.mjs`:

```javascript
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

test('Netlify build does NOT include /admin or /data folders', () => {
  const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');
  // Build
  execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
  const dist = join(ROOT, 'dist');
  assert.ok(existsSync(dist), 'dist exists');
  assert.ok(!existsSync(join(dist, 'admin')), 'dist/admin MUST NOT exist (would leak phone+notes to Netlify)');
  assert.ok(!existsSync(join(dist, 'data')), 'dist/data MUST NOT exist');
  assert.ok(!existsSync(join(dist, 'tests')), 'dist/tests MUST NOT exist');
});
```

- [ ] **Step 2: Run all tests, verify the new one passes**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js &
sleep 2 && node --test tests/admin/calls-api.test.mjs ; kill %1 2>/dev/null
```

Expected: `# pass 5` `# fail 0`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git add web/tests/admin/calls-api.test.mjs && git commit -m "test(admin): assert dist/admin and dist/data do NOT exist after build

Critical safety check — ha valaki az /admin-t véletlenül /public/admin-ba
teszi, ez a teszt elbukik és nem szivárog ki a 25+ partner telefonszáma.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Final end-to-end manual verification

Nincs új kód, csak végigjárjuk a teljes flow-t.

- [ ] **Step 1: Friss state.json törlés (clean slate)**

```bash
rm -f "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web/data/calls.json"
```

- [ ] **Step 2: Start dev server**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web" && node server.js
```

- [ ] **Step 3: Manual checklist a böngészőben** (http://localhost:3456/admin/calls.html)

| # | Próba | Várt eredmény |
|---|---|---|
| 1 | Oldal betöltődik 2s alatt | header, 4 stat-card, 5 filter pill, 25+ sor |
| 2 | Stat-kártyák | "25 Partner összesen", "0/25 Hívva (0%)", "0 Vesztés esetén is", "0 Vesztés esetén nem" |
| 3 | Filter pill "Mindenki" aktív | kék háttér + sor-szám 25 |
| 4 | Filter "Még nem hívtam" | mind a 25 sor látszik (még nem hívtál egyet sem) |
| 5 | ESOTERA sora — Sikerült Y | sor világoszöld, "Vesztés esetén" engedélyezve |
| 6 | ESOTERA — Vesztés Y | 2. zöld pill, stat-card "1 Vesztés esetén is" |
| 7 | ESOTERA megjegyzés szerkesztése | "Webshop, TGY Magazin" — 500ms után header timestamp frissül |
| 8 | F5 oldalfrissítés | ESOTERA megőrzi mindhárom állapotát (zöld sor, Y/Y, megjegyzés) |
| 9 | TriFem sora — Sikerült N | sor sárga, "Vesztés esetén" gombok disabled (szürke) |
| 10 | Filter "Vesztés esetén Y" | csak ESOTERA sora |
| 11 | Search "ESOTERA" | csak ESOTERA sora (filter mellett is) |
| 12 | Copy 📋 gomb bárhol | zöld villanás, ✓ ikon 1.2s, vágólapon a telefonszám |
| 13 | Mobilon (DevTools < 768px) | card-view layout, oszlop-címek `data-label`-ből |

- [ ] **Step 4: Production-szintű build verification**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && node build.js && ls dist/ && [ ! -d dist/admin ] && [ ! -d dist/data ] && echo "✅ /admin és /data NEM került bele a build-be"
```

Expected: utolsó sor: `✅ /admin és /data NEM került bele a build-be`.

- [ ] **Step 5: Final state.json screenshot a commit-üzenethez**

```bash
cat "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP/web/data/calls.json" | jq .
```

(Csak inspect, nincs commit ebből — a calls.json gitignored.)

- [ ] **Step 6: Final integration commit message**

```bash
cd "/Users/zsolttasnadi/CLAUDE BRAIN/DIMOP" && git log --oneline -15
```

Expected output: 12+ commit a Task 1-12-ből, mind feature/test commit.

---

## Done!

A telefon-kampány admin oldal kész:
- Útvonal: `http://localhost:3456/admin/calls.html`
- Persistence: `web/data/calls.json` (gitignored)
- Adatfrissítés: 30s auto + manual gomb
- Új ajánlatkérők automatán megjelennek
- Netlify deploy soha nem érinti

A user által kért 6 oszlop megvan: #, cégnév+kontakt, telefon+copy, sikerült?, **vesztés esetén?** (kampány-cél), megjegyzés. Szűrő pill 5 állapotra + search.
