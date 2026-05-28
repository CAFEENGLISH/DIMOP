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
