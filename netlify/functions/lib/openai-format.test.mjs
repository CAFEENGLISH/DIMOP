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

test('friendlyError: 500 → túlterhelt szerver', () => {
  assert.match(friendlyError({ status: 500 }), /túlterhelt/);
});

test('friendlyError: ismeretlen → általános', () => {
  assert.match(friendlyError({}), /Szerverhiba/);
});
