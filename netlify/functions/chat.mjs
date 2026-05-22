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
