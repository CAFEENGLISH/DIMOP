# DIMOP C pályázat oldal + OpenAI chatbot — Tervezési dokumentum

**Dátum:** 2026-05-22
**Állapot:** Jóváhagyva (brainstorming lezárva)

## Cél

A meglévő DIMOP Plusz-1.2.6/**B**-26 pályázati tudásbázis-weboldal mellé létrehozni a
**DIMOP Plusz-1.2.6/C-26** (budapesti) pályázat párhuzamosan élő változatát, a futó B
pályázat oldalának sértetlenül hagyása mellett, valamint a chatbot motorját átállítani
Anthropic Claude-ról **OpenAI `gpt-5.5`**-re.

## Kontextus (jelenlegi állapot)

- Statikus Netlify-oldal. A [build.js](../../../build.js) bemásolja a `web/public/*` fájlokat
  `dist/`-be, a `PÁLYÁZATI KIIRAS/*` dokumentumokat `dist/docs/`-ba, és legenerál egy
  `dist/full-knowledge.json`-t az AI chathez.
- Oldalak: `web/public/{index,calculator,checklist,supplier,szintfelmero}.html` + `app.js` + `calculator.js`.
  Minden link **abszolút** (`/calculator.html`).
- Chatbot: [netlify/functions/chat.mjs](../../../netlify/functions/chat.mjs), jelenleg
  `@anthropic-ai/sdk` + `claude-sonnet-4-6`, SSE streaminggel (`data: {text}` / `[DONE]`).
- Tudásbázis: `TUDÁSBÁZIS/dimop-tudasbazis.md` (B-re hangolt) + `dist/full-knowledge.json`.
- Netlify: `publish = "dist"`, function `/api/chat → /.netlify/functions/chat`.

## A C pályázat (kutatás alapján)

- **DIMOP Plusz-1.2.6/C-26** — „KKV-k … digitális infrastruktúra és transzformáció (III. kör, Budapest)".
- Gyakorlatilag a **B budapesti változata**: ugyanaz a 3–12M Ft, 90% intenzitás, 10% önerő,
  ugyanaz a fejlesztési kör (szoftver, IT-eszköz).
- Fő különbség: **kizárólag Budapesten** megvalósuló projektek (a B éppen Budapestet zárja ki).
- **Benyújtási időszak (legfrissebb hivatalos, 2026-05-22): 2026. június 2. – 2026. július 28.**
- Forrás: palyazat.gov.hu `dimop_plusz-1.2.6c-26`; MKIK `DP126BC` közös pályázói/szállítói segédlet.

## Architektúra (választott: A — `/c/` al-oldal, B érintetlen)

- A B fájlok a gyökéren maradnak változatlanul (egyetlen kivétel lent).
- C az additív réteg: `web/public/c/` mappa az 5 oldallal és a hozzá tartozó JS-sel.
- A két oldal majdnem azonos; a duplikáció elfogadott ár a futó B teljes védelméért.

### C-specifikus eltérések a B-hez képest
- Pályázati kód mindenhol: `1.2.6/B-26` → `1.2.6/C-26`; `<title>` és meta frissítés.
- **Területi jogosultság szövege: kizárólag Budapest.**
- Benyújtási időszak: **2026.06.02 – 2026.07.28**.
- Belső navigációs linkek: `/x.html` → `/c/x.html`.
- Külső palyazat.gov.hu linkek (alapadatok, „Nyertes pályázatok" CTA) a C-26 konstrukcióra.
- Összegek/intenzitás (3–12M Ft, 90%) és a kalkulátor-logika **változatlan**.

### Homogén C oldal — NULLA „B" jelölés (kötelező)
- A C oldal **semmilyen „B" hivatkozást nem tartalmazhat**: se `1.2.6/B-26` kód, se „B" címke,
  se vissza-link a B oldalra. Egységes, tisztán „C" pályázati felület.
- Ellenőrzés: a `web/public/c/` alatt egyetlen „B-26" / „/B-" előfordulás sem maradhat
  (build előtti grep-ellenőrzés a tervben).

### Váltó-link (az egyetlen B-oldali módosítás — jóváhagyva)
- A váltó-link **kizárólag a B oldalak fejlécében**: „Budapesti (C) pályázat →" (B → C irány).
- A **C oldalon NINCS** link a B-re (a homogenitás miatt).
- Ez a B fájlok egyetlen érintése; minden más B-tartalom változatlan.

## Build pipeline módosítások ([build.js](../../../build.js))

- A `web/public/c/` mappát **rekurzívan** is másolja `dist/c/`-be (a jelenlegi másolás lapos).
- A `window.__KNOWLEDGE__` / `__DOCS__` injektálást a `dist/c/index.html`-re is elvégzi.
- Tudásbázis a chatnek `tender` szerint választható (`b` / `c`). C kezdetben a B tudásbázist
  használja, amíg a C-felhívás (lásd Kutatás) jóváhagyás után be nem kerül.

## Chatbot: OpenAI `gpt-5.5` ([netlify/functions/chat.mjs](../../../netlify/functions/chat.mjs))

- `@anthropic-ai/sdk` → `openai` SDK. Modell: **`gpt-5.5`** (ellenőrizve: a megadott kulccsal elérhető).
- Streaming chat completions (`stream: true`), a kimenet **ugyanabban az SSE-formátumban**
  (`data: {text}` / `[DONE]`) → a frontendhez nem kell nyúlni.
- GPT-5.x sajátosságok: `max_completion_tokens` (nem `max_tokens`); a rendszerüzenet
  `system`/`developer` role-ú üzenetként.
- A meglévő magyar hibaüzenetek megmaradnak, OpenAI hibakódokra igazítva
  (`insufficient_quota`, `rate_limit`, `invalid_api_key`, 5xx/overloaded).
- A frontend `tender: 'b'|'c'` mezőt küld → B vagy C (Budapest-tudatos) rendszerüzenet + tudásbázis.
- Függőség: a gyökér `package.json` `@anthropic-ai/sdk` → `openai`. A `web/server.js`
  (csak lokális dev) szintén átállítandó vagy jelölendő.

### API kulcs kezelése
- `OPENAI_API_KEY` bekerül a `web/.env`-be (lokális dev).
- **Élesben (Netlify) a felhasználónak kell** felvennie az `OPENAI_API_KEY`-t a Netlify
  dashboard környezeti változói közé — ez innen nem tehető meg. Külön jelzendő.
- A motorváltás **mindkét** oldal (B és C) chatjét érinti, mert közös a függvény — ez
  szándékos. A B tartalma nem változik, csak a motor.

## Kutatás (jóváhagyás-köteles)

- Cél: eldönteni, kell-e új dokumentum a tudásbázisba a C-hez (várhatóan a C-26 felhívás PDF
  és esetleges Budapest-specifikus annex; a mellékletek nagy része közös a B-vel — `DP126BC`).
- **Jóváhagyás nélkül semmilyen dokumentum nem kerül letöltésre / a `TUDÁSBÁZIS/` vagy
  `PÁLYÁZATI KIIRAS/` mappába.** Előbb jelölt-lista (mit, honnan, miért) → jóváhagyás → beépítés.

## Megőrzés / kockázat

- Munka külön **git-branch**-en. A B gyökér-fájlokhoz a váltó-linken kívül nem nyúlunk.
- A B teljes tartalma megőrződik (futó pályázat).

## Tesztelés

- `node build.js` → `dist/` épül (benne `dist/c/`).
- `cd web && node server.js` (OPENAI_API_KEY a `.env`-ből) → `/c/` oldalak és a chat tesztelése
  `tender=b` és `tender=c` esetre.
- A modell + kulcs elérhetőség előzetesen ellenőrizve (`/v1/models`).

## Nem cél (YAGNI)

- Nincs konfigvezérelt sablonosítás (B átírása) — szándékosan kerülve a futó B védelméért.
- Nincs külön Netlify-deploy/aldomain a C-nek.
- Nincs frontend-átírás a chathez (a meglévő SSE-formátum megmarad).
