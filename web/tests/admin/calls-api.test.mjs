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

  // Now GET state returns it
  const r2 = await fetch(`${BASE}/api/admin/calls/state`);
  const { states } = await r2.json();
  assert.ok(states['12345678-9-12'], 'state written');
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
  assert.strictEqual(states['12345678-9-12'].sikerult, 'yes', 'previous field preserved');
  assert.strictEqual(states['12345678-9-12'].megjegyzes, 'Friss tartalom', 'new field merged');
});

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
