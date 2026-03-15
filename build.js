import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const DOCS_SRC = join(__dirname, 'PÁLYÁZATI KIIRAS');
const DOCS_DIST = join(DIST, 'docs');
const PUBLIC = join(__dirname, 'web', 'public');
const KB = join(__dirname, 'TUDÁSBÁZIS', 'dimop-tudasbazis.md');

// Create dist directories
mkdirSync(DIST, { recursive: true });
mkdirSync(DOCS_DIST, { recursive: true });

// 1. Copy public files
for (const f of readdirSync(PUBLIC)) {
  copyFileSync(join(PUBLIC, f), join(DIST, f));
}

// 2. Copy documents
const docs = [];
for (const f of readdirSync(DOCS_SRC).filter(f => !f.startsWith('.'))) {
  copyFileSync(join(DOCS_SRC, f), join(DOCS_DIST, f));
  const ext = f.split('.').pop().toLowerCase();
  const size = statSync(join(DOCS_SRC, f)).size;
  docs.push({ name: f, ext, size, url: `/docs/${encodeURIComponent(f)}` });
}
docs.sort((a, b) => a.name.localeCompare(b.name, 'hu'));

// 3. Read knowledge base
const knowledge = readFileSync(KB, 'utf-8');

// 4. Inject knowledge + docs into index.html
let html = readFileSync(join(DIST, 'index.html'), 'utf-8');
const injection = `<script>
window.__KNOWLEDGE__ = ${JSON.stringify(knowledge)};
window.__DOCS__ = ${JSON.stringify(docs)};
</script>`;
html = html.replace('</head>', `${injection}\n</head>`);
writeFileSync(join(DIST, 'index.html'), html);

console.log(`Build complete!`);
console.log(`  - ${docs.length} documents copied to dist/docs/`);
console.log(`  - Knowledge base: ${knowledge.length} chars injected`);
console.log(`  - Output: dist/`);
