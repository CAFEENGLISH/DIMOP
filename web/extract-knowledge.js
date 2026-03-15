import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';

import mammoth from 'mammoth';
import XLSX from 'xlsx';
import pdfParse from 'pdf-parse';

const ROOT = resolve(import.meta.dirname, '..');
const CACHE_FILE = join(import.meta.dirname, 'knowledge-cache.json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'web']);
const MAX_TEXT_PER_FILE = 80_000; // Max chars per file to keep total under 200K tokens

// --- Collect all relevant files recursively ---
function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) collectFiles(full, files);
    } else {
      const ext = extname(entry).toLowerCase();
      if (['.pdf', '.docx', '.xlsx', '.md', '.txt'].includes(ext)) {
        files.push({ path: full, name: entry, ext, mtime: st.mtimeMs, size: st.size });
      }
    }
  }
  return files;
}

// --- Extract text from PDF ---
async function extractPdf(filePath) {
  try {
    const buffer = readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    console.error(`  PDF extract error (${filePath}):`, err.message);
    return '';
  }
}

// --- Extract text from DOCX ---
async function extractDocx(filePath) {
  try {
    const buffer = readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err) {
    console.error(`  DOCX extract error (${filePath}):`, err.message);
    return '';
  }
}

// --- Extract text from XLSX ---
function extractXlsx(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const texts = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (csv.trim()) {
        texts.push(`[${sheetName}]\n${csv}`);
      }
    }
    return texts.join('\n\n');
  } catch (err) {
    console.error(`  XLSX extract error (${filePath}):`, err.message);
    return '';
  }
}

// --- Extract text from MD/TXT ---
function extractText(filePath) {
  return readFileSync(filePath, 'utf-8');
}

// --- Main extraction ---
export async function extractAll() {
  const files = collectFiles(ROOT);
  console.log(`  Fájlok találva: ${files.length}`);

  // Load cache
  let cache = {};
  if (existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')); } catch {}
  }

  const documents = [];
  let changed = false;

  for (const file of files) {
    const cached = cache[file.path];
    let text;

    if (cached && cached.mtime === file.mtime) {
      text = cached.text;
    } else {
      console.log(`  Kinyerés: ${file.name} (${file.ext})`);
      switch (file.ext) {
        case '.pdf': text = await extractPdf(file.path); break;
        case '.docx': text = await extractDocx(file.path); break;
        case '.xlsx': text = extractXlsx(file.path); break;
        case '.md': case '.txt': text = extractText(file.path); break;
        default: text = '';
      }
      cache[file.path] = { mtime: file.mtime, text };
      changed = true;
    }

    if (text && text.trim()) {
      let trimmedText = text.trim();
      if (trimmedText.length > MAX_TEXT_PER_FILE) {
        console.log(`  Rövidítve: ${file.name} (${trimmedText.length} → ${MAX_TEXT_PER_FILE} char)`);
        trimmedText = trimmedText.slice(0, MAX_TEXT_PER_FILE) + '\n\n[... dokumentum rövidítve a méretkorlát miatt ...]';
      }
      documents.push({
        name: file.name,
        path: file.path.replace(ROOT + '/', ''),
        text: trimmedText,
      });
    }
  }

  if (changed) {
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
  }

  return documents;
}

// --- Build full knowledge string for system prompt ---
export async function buildFullKnowledge() {
  const docs = await extractAll();

  const sections = docs.map(doc => {
    return `\n${'='.repeat(60)}\nDOKUMENTUM: ${doc.name}\nÚtvonal: ${doc.path}\n${'='.repeat(60)}\n\n${doc.text}`;
  });

  const fullText = sections.join('\n\n');
  const totalChars = fullText.length;

  console.log(`  Összesen: ${docs.length} dokumentum, ${totalChars.toLocaleString()} karakter`);

  return { fullText, docCount: docs.length, totalChars };
}
