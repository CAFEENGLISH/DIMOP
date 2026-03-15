import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let knowledgeCache = null;

function getKnowledge() {
  if (knowledgeCache) return knowledgeCache;
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const kbPath = join(__dirname, '..', '..', 'TUDÁSBÁZIS', 'dimop-tudasbazis.md');
    knowledgeCache = readFileSync(kbPath, 'utf-8');
  } catch {
    knowledgeCache = '';
  }
  return knowledgeCache;
}

export default async (req, context) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
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

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Hibás kérés.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const knowledge = getKnowledge();
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

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const stream = await client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
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
