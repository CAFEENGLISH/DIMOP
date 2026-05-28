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
