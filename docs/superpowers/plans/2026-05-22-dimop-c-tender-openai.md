# DIMOP C pályázat oldal + OpenAI chatbot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A meglévő DIMOP B-26 tudásbázis-oldal mellé homogén, párhuzamosan élő C-26 (budapesti) oldalt építeni a B érintetlenül hagyásával, és a chatbot motorját Anthropic Claude-ról OpenAI `gpt-5.5`-re átállítani.

**Architecture:** „A" megközelítés — B a gyökéren marad változatlanul; C additív `web/public/c/` réteg `/c/` útvonalon. A chatbot egyetlen közös függvény, amely `tender: 'b'|'c'` mező alapján vált rendszerüzenetet. A formátum-konverziós és prompt-építő logika egy közös, unit-tesztelt modulba kerül (`netlify/functions/lib/openai-format.mjs`), amit a Netlify-függvény és a lokális Express dev-szerver is használ (DRY).

**Tech Stack:** Statikus HTML/CSS/JS, Netlify Functions (ESM), Node 20 (`node:test` beépített tesztelő), `openai` npm SDK, build.js (Node script).

**Spec:** [docs/superpowers/specs/2026-05-22-dimop-c-tender-and-openai-chatbot-design.md](../specs/2026-05-22-dimop-c-tender-and-openai-chatbot-design.md)

---

## Fontos megkötések

- **A C oldalon NULLA „B" jelölés** lehet (sem `B-26`, sem `/B-`, sem vissza-link B-re). Ezt grep-pel ellenőrizzük (Task 13).
- **A B gyökér-fájlokhoz csak egy ponton nyúlunk:** a fejléc váltó-link (Task 11). Minden más B-tartalom változatlan.
- **Kutatás (Task 14) jóváhagyás-köteles:** dokumentumot a tudásbázisba csak a felhasználó jóváhagyása után teszünk.
- A munka a `dimop-c-tender-openai` git-branchen folyik (már létrehozva).
- A `web/.env` gitignore-olt — az API kulcsot SOHA nem commitoljuk.

## File Structure

**Új fájlok:**
- `netlify/functions/lib/openai-format.mjs` — tiszta segédfüggvények: tartalom-konverzió, rendszerüzenet-építő, hibaüzenet-térkép. (Közös a Netlify-fn és a dev-szerver közt.)
- `netlify/functions/lib/openai-format.test.mjs` — `node:test` unit tesztek.
- `web/public/c/index.html`, `c/calculator.html`, `c/checklist.html`, `c/supplier.html`, `c/szintfelmero.html` — C oldalak.
- `web/public/c/app.js`, `web/public/c/calculator.js` — C-specifikus JS (homepage + kalkulátor).

**Módosított fájlok:**
- `netlify/functions/chat.mjs` — OpenAI motor, `tender` támogatás.
- `web/server.js` — lokális dev OpenAI motor (azonos viselkedés).
- `build.js` — rekurzív `web/public/c/` → `dist/c/` másolás + tudásbázis-injektálás a `dist/c/index.html`-be.
- `package.json` (gyökér) és `web/package.json` — `@anthropic-ai/sdk` → `openai`.
- `web/.env` — `OPENAI_API_KEY` hozzáadása (nem commitolt).
- A 5 B HTML fejléce — egyetlen váltó-link (Task 11).

A `/style.css` megosztott (abszolút link), C-hez NEM duplikáljuk.

---

## Phase 1 — Chatbot átállítása OpenAI `gpt-5.5`-re

### Task 1: Közös OpenAI-formátum modul (TDD)

**Files:**
- Create: `netlify/functions/lib/openai-format.mjs`
- Test: `netlify/functions/lib/openai-format.test.mjs`

- [ ] **Step 1: Írd meg a bukó tesztet**

`netlify/functions/lib/openai-format.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toOpenAIContent, toOpenAIMessages, buildSystemPrompt, friendlyError } from './openai-format.mjs';

test('toOpenAIContent: string passthrough', () => {
  assert.equal(toOpenAIContent('szia'), 'szia');
});

test('toOpenAIContent: image block → image_url data URL', () => {
  const out = toOpenAIContent([
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } },
  ]);
  assert.deepEqual(out, [
    { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
  ]);
});

test('toOpenAIContent: text block preserved', () => {
  const out = toOpenAIContent([{ type: 'text', text: 'hello' }]);
  assert.deepEqual(out, [{ type: 'text', text: 'hello' }]);
});

test('toOpenAIMessages maps role + content', () => {
  const out = toOpenAIMessages([{ role: 'user', content: 'hi' }]);
  assert.deepEqual(out, [{ role: 'user', content: 'hi' }]);
});

test('buildSystemPrompt: tender c mentions C-26 and Budapest', () => {
  const p = buildSystemPrompt('TUDAS', 'c');
  assert.match(p, /1\.2\.6\/C-26/);
  assert.match(p, /Budapest/);
  assert.match(p, /TUDAS/);
  assert.doesNotMatch(p, /1\.2\.6\/B-26/);
});

test('buildSystemPrompt: tender b (default) mentions B-26', () => {
  assert.match(buildSystemPrompt('K', 'b'), /1\.2\.6\/B-26/);
  assert.match(buildSystemPrompt('K'), /1\.2\.6\/B-26/);
});

test('friendlyError: quota → kredit üzenet', () => {
  assert.match(friendlyError({ code: 'insufficient_quota' }), /kreditje elfogyott/);
});

test('friendlyError: 401 → API kulcs', () => {
  assert.match(friendlyError({ status: 401 }), /API kulcs hiba/);
});

test('friendlyError: 429 → túl sok kérés', () => {
  assert.match(friendlyError({ status: 429 }), /Túl sok kérés/);
});

test('friendlyError: ismeretlen → általános', () => {
  assert.match(friendlyError({}), /Szerverhiba/);
});
```

- [ ] **Step 2: Futtasd, és győződj meg róla, hogy bukik**

Run: `node --test netlify/functions/lib/openai-format.test.mjs`
Expected: FAIL — `Cannot find module './openai-format.mjs'`.

- [ ] **Step 3: Írd meg a minimális implementációt**

`netlify/functions/lib/openai-format.mjs`:
```js
// Anthropic-stílusú üzenettartalom → OpenAI chat completions tartalom.
export function toOpenAIContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((block) => {
    if (block.type === 'image' && block.source?.type === 'base64') {
      return {
        type: 'image_url',
        image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
      };
    }
    if (block.type === 'text') return { type: 'text', text: block.text };
    return { type: 'text', text: '' };
  });
}

export function toOpenAIMessages(messages) {
  return messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) }));
}

const TENDER_INTRO = {
  b: `Te a DIMOP Plusz-1.2.6/B-26 pályázati asszisztens vagy. A feladatod, hogy segítsd a felhasználókat a pályázattal kapcsolatos kérdésekben.`,
  c: `Te a DIMOP Plusz-1.2.6/C-26 (budapesti) pályázati asszisztens vagy. Ez a pályázat KIZÁRÓLAG Budapesten megvalósuló projektekre vonatkozik. A benyújtási időszak: 2026. június 2. – 2026. július 28. A feladatod, hogy segítsd a felhasználókat a pályázattal kapcsolatos kérdésekben.`,
};

export function buildSystemPrompt(knowledge, tender = 'b') {
  const intro = TENDER_INTRO[tender] || TENDER_INTRO.b;
  return `${intro}

SZABÁLYOK:
- Válaszolj MINDIG magyarul
- Csak az alábbi dokumentumok alapján válaszolj - ne találj ki információt
- Ha nem tudod a választ, mondd el őszintén
- Legyél tömör és pontos
- Használj markdown formázást a válaszokban (táblázatok, listák, félkövér)
- Ha összegekről kérdenek, mindig add meg a pontos számokat
- Hivatkozz a forrás dokumentumra ha releváns (pl. "A felhívás 2.3.1. pontja szerint...")

AZ ÖSSZES PÁLYÁZATI DOKUMENTUM TELJES SZÖVEGE:
${knowledge}`;
}

export function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = (err?.code || err?.error?.code || '').toLowerCase();
  const status = err?.status ?? err?.error?.status;
  if (code.includes('insufficient_quota') || msg.includes('quota') || msg.includes('billing') || msg.includes('credit')) {
    return 'Az AI szolgáltatás kreditje elfogyott. Kérlek értesítsd az adminisztrátort.';
  }
  if (status === 401 || code.includes('invalid_api_key') || msg.includes('api key') || msg.includes('authentication')) {
    return 'API kulcs hiba.';
  }
  if (status === 429 || code.includes('rate_limit') || msg.includes('rate limit')) {
    return 'Túl sok kérés, kérlek várj egy kicsit.';
  }
  if ((typeof status === 'number' && status >= 500) || msg.includes('overloaded')) {
    return 'Az AI szerver jelenleg túlterhelt. Kérlek próbáld újra pár másodperc múlva.';
  }
  return 'Szerverhiba, próbáld újra.';
}
```

- [ ] **Step 4: Futtasd a teszteket — minden zöld**

Run: `node --test netlify/functions/lib/openai-format.test.mjs`
Expected: PASS (10 teszt, 0 bukás).

- [ ] **Step 5: Commit**
```bash
git add netlify/functions/lib/openai-format.mjs netlify/functions/lib/openai-format.test.mjs
git commit -m "feat: add OpenAI format/prompt/error helper module with tests"
```

### Task 2: `openai` függőség telepítése, Anthropic eltávolítása

**Files:**
- Modify: `package.json` (gyökér), `web/package.json`

- [ ] **Step 1: Gyökér package.json — dependency csere**

`package.json`-ban a `dependencies` blokk:
```json
  "dependencies": {
    "openai": "^4.77.0"
  }
```
(A `@anthropic-ai/sdk` sor törlése.)

- [ ] **Step 2: web/package.json — dependency csere**

`web/package.json` `dependencies`-ben cseréld a `"@anthropic-ai/sdk": "^0.39.0",` sort erre:
```json
    "openai": "^4.77.0",
```

- [ ] **Step 3: Telepítés mindkét helyen**

Run: `npm install && cd web && npm install && cd ..`
Expected: hibamentes; `openai` megjelenik mindkét `node_modules`-ban.

- [ ] **Step 4: Ellenőrzés**

Run: `node -e "import('openai').then(m=>console.log(typeof m.default))"`
Expected: `function`

- [ ] **Step 5: Commit**
```bash
git add package.json web/package.json package-lock.json web/package-lock.json
git commit -m "chore: swap @anthropic-ai/sdk for openai dependency"
```

### Task 3: Netlify chat függvény átírása OpenAI-ra

**Files:**
- Modify: `netlify/functions/chat.mjs`

- [ ] **Step 1: Cseréld le a teljes fájl tartalmát**

`netlify/functions/chat.mjs`:
```js
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { toOpenAIMessages, buildSystemPrompt, friendlyError } from './lib/openai-format.mjs';

let knowledgeCache = null;

function getFullKnowledge() {
  if (knowledgeCache) return knowledgeCache;
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fkPath = join(__dirname, '..', '..', 'dist', 'full-knowledge.json');
    const data = JSON.parse(readFileSync(fkPath, 'utf-8'));
    knowledgeCache = data.fullText;
  } catch {
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const kbPath = join(__dirname, '..', '..', 'TUDÁSBÁZIS', 'dimop-tudasbazis.md');
      knowledgeCache = readFileSync(kbPath, 'utf-8');
    } catch {
      knowledgeCache = '';
    }
  }
  return knowledgeCache;
}

export default async (req) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI chat nincs konfigurálva.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Csak POST kérés engedélyezett.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Hibás kérés.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, tender } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Hibás kérés.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const knowledge = getFullKnowledge();
  const systemPrompt = buildSystemPrompt(knowledge, tender);

  try {
    const client = new OpenAI({ apiKey });

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const stream = await client.chat.completions.create({
          model: 'gpt-5.5',
          max_completion_tokens: 2048,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...toOpenAIMessages(messages),
          ],
        });

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const errorMsg = friendlyError(err);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'AI hiba: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Szintaktikai ellenőrzés**

Run: `node --check netlify/functions/chat.mjs`
Expected: nincs kimenet (OK).

- [ ] **Step 3: Commit**
```bash
git add netlify/functions/chat.mjs
git commit -m "feat: switch Netlify chat function to OpenAI gpt-5.5 with tender support"
```

### Task 4: Lokális dev szerver (server.js) átírása OpenAI-ra

**Files:**
- Modify: `web/server.js`

- [ ] **Step 1: Olvasd be a fájlt és cseréld a chat-részt**

Olvasd be a `web/server.js`-t. Cseréld az importot: az `import Anthropic from '@anthropic-ai/sdk';` sort erre:
```js
import OpenAI from 'openai';
import { toOpenAIMessages, buildSystemPrompt, friendlyError } from '../netlify/functions/lib/openai-format.mjs';
```

- [ ] **Step 2: A `/api/chat` handler frissítése**

A `web/server.js` `/api/chat` handlerében:
- `const apiKey = process.env.ANTHROPIC_API_KEY;` → `const apiKey = process.env.OPENAI_API_KEY;`
- A hibaszöveg `'AI chat nincs konfigurálva. Add meg az ANTHROPIC_API_KEY-t a .env fájlban.'` → `'AI chat nincs konfigurálva. Add meg az OPENAI_API_KEY-t a .env fájlban.'`
- `const { messages } = req.body;` → `const { messages, tender } = req.body;`
- Ahol a rendszerüzenetet építi és a klienst hívja, cseréld a teljes Anthropic-streamet erre a mintára (igazítsd a meglévő `res.write(...)` SSE-formátumhoz, ami `data: {text}` / `[DONE]`):
```js
const knowledge = getKnowledge(); // a meglévő tudásbázis-betöltő a server.js-ben
const systemPrompt = buildSystemPrompt(knowledge, tender);
const client = new OpenAI({ apiKey });
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
try {
  const stream = await client.chat.completions.create({
    model: 'gpt-5.5',
    max_completion_tokens: 2048,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...toOpenAIMessages(messages),
    ],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
} catch (err) {
  res.write(`data: ${JSON.stringify({ error: friendlyError(err) })}\n\n`);
  res.end();
}
```
Megjegyzés: a `getKnowledge()` helyére írd be a server.js-ben már létező tudásbázis-betöltő hívását (ugyanaz, amit eddig az Anthropic systemPromptnál használt). A `console.log` „INAKTÍV (nincs ANTHROPIC_API_KEY...)" sorban is `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`.

- [ ] **Step 3: Szintaktikai ellenőrzés**

Run: `node --check web/server.js`
Expected: nincs kimenet (OK).

- [ ] **Step 4: Commit**
```bash
git add web/server.js
git commit -m "feat: switch local dev server chat to OpenAI gpt-5.5"
```

### Task 5: API kulcs a `web/.env`-be (NEM commitolt)

**Files:**
- Modify: `web/.env`

- [ ] **Step 1: Add hozzá az OPENAI_API_KEY-t**

A `web/.env` fájlhoz fűzd hozzá (a meglévő ANTHROPIC sor maradhat, nem zavar):
```
# OpenAI API kulcs az AI chathez (gpt-5.5)
OPENAI_API_KEY=sk-proj-REDACTED
```

- [ ] **Step 2: Erősítsd meg, hogy NINCS verziókövetve**

Run: `git status --porcelain web/.env`
Expected: üres kimenet (ignorálva). **Soha ne `git add`-eld.**

- [ ] **Step 3: NINCS commit ehhez a taskhoz** (a kulcs nem kerülhet gitbe).

---

## Phase 2 — Build pipeline bővítése

### Task 6: Rekurzív másolás és C-index injektálás a build.js-ben

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Adj hozzá rekurzív másoló helpert és kezeld a `c/` mappát**

A `build.js`-ben a `// 1. Copy public files` blokk jelenleg lapos. Cseréld le erre:
```js
  // 1. Copy public files (rekurzívan, hogy a c/ al-oldal is bemásolódjon)
  const copyRecursive = (src, dest) => {
    for (const entry of readdirSync(src)) {
      if (entry.startsWith('.')) continue;
      const s = join(src, entry);
      const d = join(dest, entry);
      if (statSync(s).isDirectory()) {
        mkdirSync(d, { recursive: true });
        copyRecursive(s, d);
      } else {
        copyFileSync(s, d);
      }
    }
  };
  copyRecursive(PUBLIC, DIST);
```

- [ ] **Step 2: Injektáld a tudásbázist a `dist/c/index.html`-be is**

A `// 6. Inject into index.html` blokk után (közvetlenül a `writeFileSync(join(DIST, 'index.html'), html);` után) told be:
```js
  // 6b. Inject into C subpage index too
  try {
    const cIndexPath = join(DIST, 'c', 'index.html');
    let cHtml = readFileSync(cIndexPath, 'utf-8');
    cHtml = cHtml.replace('</head>', `${injection}\n</head>`);
    writeFileSync(cIndexPath, cHtml);
  } catch {}
```
(A `injection` változó már létezik fentebb; használd újra.)

- [ ] **Step 3: Build futtatása**

Run: `node build.js`
Expected: „Build complete!"; `dist/c/index.html`, `dist/c/calculator.html` stb. létrejönnek. (A C oldalak a Phase 3 után lesznek értelmesek; itt csak a másolás működését nézzük — ha még nincs `web/public/c/`, a build NEM hibázik, csak nincs `dist/c/`.)

- [ ] **Step 4: Commit**
```bash
git add build.js
git commit -m "feat: recursive public copy + knowledge injection for /c subpage in build"
```

---

## Phase 3 — C oldal létrehozása (homogén, B nélkül)

> Minden C taskban: a fájl másolása után **kötelező** a `/B-26` és `B-26` eltávolítása (Task 13 ellenőrzi). Belső linkek `/c/` prefixet kapnak, `/style.css` marad.

### Task 7: C mappa + index.html

**Files:**
- Create: `web/public/c/index.html` (forrás: `web/public/index.html`)

- [ ] **Step 1: Másold a fájlt**
```bash
mkdir -p web/public/c
cp web/public/index.html web/public/c/index.html
```

- [ ] **Step 2: Alkalmazd az edit-eket `web/public/c/index.html`-ben**

Exact find→replace (mindegyik egyszer fordul elő, kivéve a linkek):
- `<title>DIMOP Plusz-1.2.6/B-26 - Pályázati Tudásbázis</title>` → `<title>DIMOP Plusz-1.2.6/C-26 - Pályázati Tudásbázis (Budapest)</title>`
- `<p>DIMOP Plusz-1.2.6/B-26 &mdash; KKV-k digitális transzformációja</p>` → `<p>DIMOP Plusz-1.2.6/C-26 &mdash; Budapesti KKV-k digitális transzformációja</p>`
- A „Nyertes pályázatok" CTA href-ben: `konstrukcio=DIMOP_PLUSZ-1.2.6%2FB-26` → `konstrukcio=DIMOP_PLUSZ-1.2.6%2FC-26`
- Script: `<script src="/app.js"></script>` → `<script src="/c/app.js"></script>`
- Belső nav linkek (replace_all): `href="/calculator.html"` → `href="/c/calculator.html"`, `href="/checklist.html"` → `href="/c/checklist.html"`, `href="/szintfelmero.html"` → `href="/c/szintfelmero.html"`, `href="/supplier.html"` → `href="/c/supplier.html"`, `href="/index.html"` → `href="/c/index.html"`, `href="/"` (ha önálló) → `href="/c/"`.

- [ ] **Step 3: Ellenőrizd, hogy nincs több B-jelölés**

Run: `grep -n "B-26\|/B-\|%2FB-" web/public/c/index.html`
Expected: üres kimenet.

- [ ] **Step 4: Commit**
```bash
git add web/public/c/index.html
git commit -m "feat: add C index page (Budapest, no B markings)"
```

### Task 8: C app.js (homepage logika + chat tender)

**Files:**
- Create: `web/public/c/app.js` (forrás: `web/public/app.js`)

- [ ] **Step 1: Másold a fájlt**
```bash
cp web/public/app.js web/public/c/app.js
```

- [ ] **Step 2: Edit-ek `web/public/c/app.js`-ben**

- `Belépés → Pályázati árkalkulációk → Új árkalkuláció → DIMOP Plusz-1.2.6/B-26` → ...`DIMOP Plusz-1.2.6/C-26`
- `<li>Pályázat: <strong>DIMOP Plusz-1.2.6/B-26</strong></li>` → ...`DIMOP Plusz-1.2.6/C-26`...
- A benyújtási dátum a lépés-kártyában: `subtitle: '2026.03.31 - 06.30'` → `subtitle: '2026.06.02 - 07.28'`
- A chat fetch body: `body: JSON.stringify({ messages: chatHistory }),` → `body: JSON.stringify({ messages: chatHistory, tender: 'c' }),`

- [ ] **Step 3: Keress további B/dátum maradékot**

Run: `grep -nE "B-26|/B-|2026\.03\.31|03\.31|jún.* 30|06\.30" web/public/c/app.js`
Expected: üres (ha mégis van benyújtási-dátum előfordulás, igazítsd 2026.06.02–07.28-ra). A `B-26`/`/B-` előfordulás üres kell legyen.

- [ ] **Step 4: Szintaxis-ellenőrzés**

Run: `node --check web/public/c/app.js`
Expected: nincs kimenet.

- [ ] **Step 5: Commit**
```bash
git add web/public/c/app.js
git commit -m "feat: add C app.js (C-26 text, dates, tender=c chat)"
```

### Task 9: C checklist / supplier / szintfelmero oldalak

**Files:**
- Create: `web/public/c/checklist.html`, `web/public/c/supplier.html`, `web/public/c/szintfelmero.html`

- [ ] **Step 1: Másold a három fájlt**
```bash
cp web/public/checklist.html web/public/c/checklist.html
cp web/public/supplier.html web/public/c/supplier.html
cp web/public/szintfelmero.html web/public/c/szintfelmero.html
```

- [ ] **Step 2: checklist.html edit-ek**
- `<p>DIMOP Plusz-1.2.6/B-26 &mdash; Benyújtandó dokumentumok</p>` → `<p>DIMOP Plusz-1.2.6/C-26 &mdash; Benyújtandó dokumentumok</p>`
- `<span class="badge badge-green">B-26</span>` → `<span class="badge badge-green">C-26</span>`
- CTA href: `...%2FB-26` → `...%2FC-26`
- Belső nav linkek `/c/` prefix (mint Task 7 Step 2 lista).

- [ ] **Step 3: supplier.html edit-ek**
- `<title>Beszállítói útmutató - DIMOP Plusz-1.2.6/B-26</title>` → `...C-26</title>`
- CTA href: `...%2FB-26` → `...%2FC-26`
- `<li><strong>Pályázat</strong> - melyik pályázatra vonatkozik (DIMOP Plusz-1.2.6/B-26)</li>` → `...(DIMOP Plusz-1.2.6/C-26)</li>`
- Belső nav linkek `/c/` prefix.

- [ ] **Step 4: szintfelmero.html edit-ek**
- CTA href: `...%2FB-26` → `...%2FC-26`
- `<strong>DIMOP 1.2.6/B-26:</strong>` → `<strong>DIMOP 1.2.6/C-26:</strong>`
- Belső nav linkek `/c/` prefix.

- [ ] **Step 5: Ellenőrzés mindhárom fájlra**

Run: `grep -n "B-26\|/B-\|%2FB-" web/public/c/checklist.html web/public/c/supplier.html web/public/c/szintfelmero.html`
Expected: üres kimenet.

- [ ] **Step 6: Commit**
```bash
git add web/public/c/checklist.html web/public/c/supplier.html web/public/c/szintfelmero.html
git commit -m "feat: add C checklist/supplier/szintfelmero pages (no B markings)"
```

---

## Phase 4 — C kalkulátor (Budapest jogosult)

### Task 10: C calculator.js — kód, Budapest-térkép, területi pont

**Files:**
- Create: `web/public/c/calculator.js` (forrás: `web/public/calculator.js`)
- Create: `web/public/c/calculator.html` (forrás: `web/public/calculator.html`)

> **Megjegyzés a területi pontozásról:** A C-26 hivatalos felhívás pontozási szabálya még nem nyilvános (Task 14 kutatás tárgya). **Interim döntés:** Budapest jogosultként jelenik meg (nem „NEM pályázhat"), és a területi bónusz alapértelmezetten **0 pont** (konzervatív), amíg a C felhívás meg nem erősíti. Ez tudatos, dokumentált választás, nem placeholder.

- [ ] **Step 1: Másold a calculator.js-t és a calculator.html-t**
```bash
cp web/public/calculator.js web/public/c/calculator.js
cp web/public/calculator.html web/public/c/calculator.html
```

- [ ] **Step 2: calculator.html edit-ek (`web/public/c/calculator.html`)**
- `<title>Költségkalkulátor - DIMOP Plusz-1.2.6/B-26</title>` → `...C-26</title>`
- `<p>DIMOP Plusz-1.2.6/B-26 &mdash; Interaktív projekt költségbecslés</p>` → `...C-26 &mdash; Budapesti interaktív projekt költségbecslés</p>`
- CTA href: `...%2FB-26` → `...%2FC-26`
- `<script src="/calculator.js"></script>` → `<script src="/c/calculator.js"></script>`
- Belső nav linkek `/c/` prefix.

- [ ] **Step 3: calculator.js — kód és felirat**
- `<p class="calc-subtitle">Interaktív kalkulátor a DIMOP Plusz-1.2.6/B-26 pályázathoz...` → `...DIMOP Plusz-1.2.6/C-26 (budapesti) pályázathoz...`

- [ ] **Step 4: calculator.js — Budapest térkép jogosultra állítása**

A `~997–999` régió-térkép Budapest path-ját:
- `<path d="M310,130 ... class="region-blocked" data-region="budapest">` → a `region-blocked` osztály helyett `region-neutral` (pályázhat).
- `<title>Budapest / Közép-Magyarország: NEM pályázhat!</title>` → `<title>Budapest: a C-26 kizárólag budapesti projektekre vonatkozik (jogosult)</title>`
- A `~1060` `<p><strong>Budapest / Közép-Magyarország</strong></p>` szövegblokkját a „nem pályázhat" jelentésű környezetében írd át arra, hogy Budapest a **célterület**.
- A `~974` `<h3>Magyarország régiói - DIMOP Plusz területi besorolás</h3>` → `<h3>DIMOP Plusz-1.2.6/C-26 — kizárólag budapesti megvalósítás</h3>`

- [ ] **Step 5: calculator.js — területi pont interim (0)**

A `const regionPoints = region === 'priority' ? 2 : 0;` sort hagyd meg, de mivel C Budapest-only, a `calcRegion` vezérlő alapértékét állítsd nem-`priority`-re, így a területi bónusz 0. Ha a kalkulátor HTML-ben van `calcRegion` `<select>` (a calculator.html-ben), állítsd az alapértelmezett kiválasztott opciót a budapesti/0-pontos értékre. (Pontos opció-érték a calculator.html `#calcRegion` selectjéből; ha nincs külön budapesti opció, az alapértelmezett nem-`priority` opció marad — eredmény: 0 területi pont.)

- [ ] **Step 6: Ellenőrzés**

Run: `grep -n "B-26\|/B-\|%2FB-\|NEM pályázhat\|region-blocked" web/public/c/calculator.js web/public/c/calculator.html`
Expected: üres kimenet (nincs B-jelölés, Budapest nem blokkolt).
Run: `node --check web/public/c/calculator.js`
Expected: nincs kimenet.

- [ ] **Step 7: Commit**
```bash
git add web/public/c/calculator.js web/public/c/calculator.html
git commit -m "feat: add C calculator (Budapest eligible, territorial bonus 0 interim)"
```

---

## Phase 5 — Váltó-link a B fejlécben

### Task 11: B → C váltó-link minden B oldalon

**Files:**
- Modify: `web/public/index.html`, `calculator.html`, `checklist.html`, `supplier.html`, `szintfelmero.html` (fejléc)

- [ ] **Step 1: Egységes link-snippet**

Minden B oldal fejlécében a meglévő „Nyertes pályázatok" CTA `<a ...>` ELÉ (ugyanabba a `header-right` blokkba) szúrd be:
```html
        <a href="/c/" class="header-cta" title="Váltás a budapesti DIMOP 1.2.6/C-26 pályázatra">
          <span>Budapesti (C) pályázat →</span>
        </a>
```
(A C oldalak fejlécében NINCS visszafelé mutató link — homogén C.)

- [ ] **Step 2: Ellenőrzés — minden B oldalon ott a link, C-n nincs B-link**

Run: `grep -l 'href="/c/"' web/public/index.html web/public/calculator.html web/public/checklist.html web/public/supplier.html web/public/szintfelmero.html`
Expected: mind az 5 fájl.
Run: `grep -rn 'href="/"\|/index.html\|Budapesti (C)' web/public/c/*.html | grep -v "/c/"`
Expected: nincs B-re mutató link a C oldalakon.

- [ ] **Step 3: Commit**
```bash
git add web/public/index.html web/public/calculator.html web/public/checklist.html web/public/supplier.html web/public/szintfelmero.html
git commit -m "feat: add B->C switch link in B page headers (only B-side change)"
```

---

## Phase 6 — Teljes verifikáció

### Task 12: Build + statikus ellenőrzések

- [ ] **Step 1: Tiszta build**

Run: `rm -rf dist && node build.js`
Expected: „Build complete!"; léteznek: `dist/index.html`, `dist/c/index.html`, `dist/c/calculator.html`, `dist/c/checklist.html`, `dist/c/supplier.html`, `dist/c/szintfelmero.html`, `dist/c/app.js`, `dist/c/calculator.js`, `dist/full-knowledge.json`.

- [ ] **Step 2: A dist/c/ NEM tartalmaz B-jelölést**

Run: `grep -rn "B-26\|/B-\|%2FB-\|NEM pályázhat" dist/c/`
Expected: üres kimenet.

- [ ] **Step 3: A C index megkapta a tudásbázis-injektálást**

Run: `grep -c "__KNOWLEDGE__" dist/c/index.html`
Expected: `1`.

### Task 13: Chat végpont kézi teszt (B és C)

- [ ] **Step 1: Indítsd a dev szervert (kulcs a .env-ből)**

Run (háttérben): `cd web && node server.js`
Expected: indulási log „AI Chat: AKTÍV".

- [ ] **Step 2: B chat teszt**

Run:
```bash
curl -sN -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Mennyi a maximális támogatás?"}],"tender":"b"}' | head -5
```
Expected: `data: {"text":"..."}` sorok érkeznek (streaming), nem hibaüzenet. (A port a server.js-ben definiált; ha nem 3000, igazítsd.)

- [ ] **Step 3: C chat teszt**

Run:
```bash
curl -sN -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hol kell megvalósulnia a projektnek?"}],"tender":"c"}' | head -10
```
Expected: streaming válasz, amely Budapestre utal (C rendszerüzenet alapján).

- [ ] **Step 4: Állítsd le a dev szervert.**

- [ ] **Step 5: A teljes unit-teszt suite zöld**

Run: `node --test netlify/functions/lib/`
Expected: minden teszt PASS.

---

## Phase 7 — C dokumentum-kutatás (JÓVÁHAGYÁS-KÖTELES)

### Task 14: C-hez tartozó dokumentumok feltérképezése és jóváhagyási lista

> Ez a task **NEM** ad hozzá semmit a tudásbázishoz önállóan. Listát készít, és **megáll** a felhasználó jóváhagyásáig.

- [ ] **Step 1: Forrásgyűjtés**

Nézd át:
- `palyazat.gov.hu` `dimop_plusz-1.2.6c-26` „dokumentumok" és „közlemények" (a C-26 felhívás PDF letölthető-e már).
- MKIK `DP126BC` közös pályázói/szállítói segédlet (már a törzsadattárban: `BENYÚJTÁS/DP126BC_szallito_segedlet.pdf`).
- A jelenlegi `PÁLYÁZATI KIIRAS/` tartalom: mely mellékletek közösek B-vel, mi hiányzik C-hez.

- [ ] **Step 2: Készíts jelölt-listát**

Táblázat: dokumentum neve | forrás URL/útvonal | miért kell C-hez | hova kerülne (`TUDÁSBÁZIS/` vagy `PÁLYÁZATI KIIRAS/`).

- [ ] **Step 3: ÁLLJ MEG — kérj jóváhagyást**

Mutasd be a listát a felhasználónak. **Csak kifejezett jóváhagyás után** töltsd le/add hozzá a dokumentumokat, majd futtass újra `node build.js`-t, hogy bekerüljenek a `full-knowledge.json`-be. A C területi pontozást (Task 10 interim 0) a felhívás birtokában pontosítsd.

---

## Self-review jegyzet

- **Spec lefedettség:** Chatbot→OpenAI (Task 1–5), build (Task 6), C oldalak homogén/no-B (Task 7–10, ellenőrzés Task 9/13-step), váltó-link csak B-n (Task 11), kutatás jóváhagyással (Task 14), megőrzés=branch+B érintetlen ✔.
- **Nyitott, tudatos pont:** C területi pontozás interim 0, a felhívás (Task 14) erősíti meg — dokumentálva, nem placeholder.
- **Típus/névkonzisztencia:** `toOpenAIContent` / `toOpenAIMessages` / `buildSystemPrompt(knowledge, tender)` / `friendlyError(err)` végig azonos szignatúrával szerepel a lib-ben, a chat.mjs-ben és a server.js-ben.
