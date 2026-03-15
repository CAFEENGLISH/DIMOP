import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// --- Knowledge base ---
function loadKnowledge() {
  const mdPath = join(ROOT, 'TUDÁSBÁZIS', 'dimop-tudasbazis.md');
  return readFileSync(mdPath, 'utf-8');
}

app.get('/api/knowledge', (_req, res) => {
  try {
    res.json({ content: loadKnowledge() });
  } catch (err) {
    res.status(500).json({ error: 'Nem sikerült betölteni a tudásbázist.' });
  }
});

// --- Document listing ---
function listDocs() {
  const docsDir = join(ROOT, 'PÁLYÁZATI KIIRAS');
  try {
    return readdirSync(docsDir)
      .filter(f => !f.startsWith('.'))
      .map(name => {
        const full = join(docsDir, name);
        const st = statSync(full);
        const ext = name.split('.').pop().toLowerCase();
        return { name, ext, size: st.size, url: `/docs/${encodeURIComponent(name)}` };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  } catch {
    return [];
  }
}

app.get('/api/docs', (_req, res) => {
  res.json(listDocs());
});

// --- Static file serving for documents ---
app.get('/docs/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = join(ROOT, 'PÁLYÁZATI KIIRAS', filename);
  try {
    statSync(filePath);
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: 'Fájl nem található.' });
  }
});

// --- AI Chat ---
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Túl sok kérés. Kérlek várj egy percet.' },
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI chat nincs konfigurálva. Add meg az ANTHROPIC_API_KEY-t a .env fájlban.',
    });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Hibás kérés.' });
  }

  const knowledge = loadKnowledge();
  const systemPrompt = `Te a DIMOP Plusz-1.2.6/B-26 pályázati asszisztens vagy. A feladatod, hogy segítsd a felhasználókat a pályázattal kapcsolatos kérdésekben.

SZABÁLYOK:
- Válaszolj MINDIG magyarul
- Csak a tudásbázis alapján válaszolj - ne találj ki információt
- Ha nem tudod a választ, mondd el őszintén
- Legyél tömör és pontos
- Használj markdown formázást a válaszokban (táblázatok, listák, félkövér)
- Ha összegekről kérdenek, mindig add meg a pontos számokat

TUDÁSBÁZIS:
${knowledge}`;

  try {
    const client = new Anthropic({ apiKey });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI hiba: ' + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`\n  DIMOP Tudásbázis fut: http://localhost:${PORT}\n`);
  console.log(`  AI Chat: ${process.env.ANTHROPIC_API_KEY ? 'AKTÍV' : 'INAKTÍV (nincs ANTHROPIC_API_KEY a .env-ben)'}\n`);
});
