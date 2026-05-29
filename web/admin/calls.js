// Telefon-kampány admin oldal — vanilla JS module
const API = '/api/admin/calls';

const state = {
  contacts: [],
  states: {},
  filter: 'all',
  search: '',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// === Tétel-kategória map (a 23 DIMOP C-26 fejlesztési cél) ===
// A backend (xlsx) csak a tétel NEVÉT tárolja, prefix nélkül. Itt visszacímkézzük.
const ITEM_CATEGORIES = {
  // HW
  'Laptop': 'HW',
  'Monitor': 'HW',
  'Mobiltelefon': 'HW',
  'Tablet': 'HW',
  'Router': 'HW',
  'Hálózati adattároló - NAS': 'HW',
  'Multifunkciós nyomtató': 'HW',
  // SW
  'SaaS irodai csomag': 'SW',
  'Online számlázó szoftver előfizetés': 'SW',
  'weboldalhoz tartozó SSL tanúsítvány': 'SW',
  'weboldalhoz tartozó webtárhely': 'SW',
  'Saját weboldal kialakítása': 'SW',
  'Domain regisztráció (irodai csomaghoz)': 'SW',
  'Bérelhető webshop rendszer': 'SW',
  'ERP szoftverlicenc / előfizetés (SaaS modell)': 'SW',
  'Virtuális szerver (IaaS)': 'SW',
  'Adattárolás és mentés (felhő storage)': 'SW',
  'Végpontvédelmi licenc': 'SW',
  'Videókonferencia platform': 'SW',
  'MI szolgáltatás': 'SW',
  // Szolg
  'Adattárolás, mentés bevezetés': 'Szolg',
  'Havidíjas IT- üzemeltetés (alapszint, irodai sw)': 'Szolg',
  'Weboldal karbantartása, frissítése': 'Szolg',
  'IKT-alapképzés': 'Szolg',
  'IBSZ kidolgozása': 'Szolg',
  'Incidenskezelési terv és oktatás': 'Szolg',
  'ERP bevezetés, testre szabás': 'Szolg',
  'Digitális aláírás szolgáltatás': 'Szolg',
  'Videokonferencia bevezetés, üzemeltetés': 'Szolg',
  'Biztonsági mentés (IKT biztonság)': 'Szolg',
  'Közösségi média tartalomgyártás': 'Szolg',
  'Online jelenlét és hirdetéskezelés képzés': 'Szolg',
  'Online jelenlét és hirdetések': 'Szolg',
};

function categorizeItems(igenyekStr) {
  const items = (igenyekStr || '').split('; ').map((s) => s.trim()).filter(Boolean);
  const groups = { Szolg: [], SW: [], HW: 0, hwItems: [], unknown: [] };
  for (const item of items) {
    const cat = ITEM_CATEGORIES[item];
    if (cat === 'HW') {
      groups.HW++;
      groups.hwItems.push(item);
    } else if (cat === 'Szolg' || cat === 'SW') {
      groups[cat].push(item);
    } else {
      groups.unknown.push(item);
    }
  }
  return groups;
}

// === Toast ===
function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `ck-toast is-visible ${type ? 'is-' + type : ''}`;
  setTimeout(() => { el.className = 'ck-toast'; }, 2400);
}

// === Tel format ===
function formatTel(raw) {
  return raw || '';
}
function telHref(raw) {
  return 'tel:' + (raw || '').replace(/\s/g, '');
}

// === Filter logic ===
function applyFilter(c, st) {
  const s = state.search.toLowerCase().trim();
  if (s) {
    const hay = `${c.cegnev} ${c.kontakt} ${st?.megjegyzes || ''}`.toLowerCase();
    if (!hay.includes(s)) return false;
  }
  switch (state.filter) {
    case 'all': return true;
    case 'uncalled': return !st || !st.sikerult;
    case 'interested-loss': return st?.sikerult === 'yes' && st?.erdeklodik_vesztes === 'yes';
    case 'not-interested-loss': return st?.sikerult === 'yes' && st?.erdeklodik_vesztes === 'no';
    case 'no-reach': return st?.sikerult === 'no';
  }
  return true;
}

// === Render row ===
function renderRow(c) {
  const st = state.states[c.adoszam] || {};
  const rowClass =
    st.sikerult === 'yes' && st.erdeklodik_vesztes === 'yes' ? 'ck-row--called-y' :
    st.sikerult === 'yes' && st.erdeklodik_vesztes === 'no' ? 'ck-row--called-n' :
    st.sikerult === 'no' ? 'ck-row--no-reach' :
    '';
  const erdeklodikDisabled = st.sikerult !== 'yes';
  return `
    <tr class="${rowClass}" data-adoszam="${c.adoszam}">
      <td class="ck-col-num" data-label="#">${c.no}</td>
      <td class="ck-col-cegnev" data-label="Cégnév">
        <div class="ck-cegnev">${escapeHtml(c.cegnev)}</div>
        <div class="ck-kontakt ${c.kontakt ? '' : 'ck-kontakt--empty'}">${escapeHtml(c.kontakt)}</div>
      </td>
      <td class="ck-col-tel" data-label="Telefon">
        <span class="ck-tel-wrap">
          <a class="ck-tel" href="${telHref(c.tel)}">${formatTel(c.tel)}</a>
          <button class="ck-copy" data-tel="${escapeHtml(c.tel)}" title="Másolás">📋</button>
          <button class="ck-items" data-adoszam="${escapeHtml(c.adoszam)}" title="Igények (${c.tetelszam} db)">📦</button>
        </span>
      </td>
      <td class="ck-col-sikerult" data-label="Sikerült?">
        <span class="ck-yn">
          <button class="ck-yn-btn ${st.sikerult === 'yes' ? 'is-y-active' : ''}" data-field="sikerult" data-value="yes">Y</button>
          <button class="ck-yn-btn ${st.sikerult === 'no' ? 'is-n-active' : ''}" data-field="sikerult" data-value="no">N</button>
        </span>
      </td>
      <td class="ck-col-erdeklodik" data-label="Vesztés esetén?">
        <span class="ck-yn">
          <button class="ck-yn-btn ${st.erdeklodik_vesztes === 'yes' ? 'is-y-active' : ''}" data-field="erdeklodik_vesztes" data-value="yes" ${erdeklodikDisabled ? 'disabled' : ''}>Y</button>
          <button class="ck-yn-btn ${st.erdeklodik_vesztes === 'no' ? 'is-n-active' : ''}" data-field="erdeklodik_vesztes" data-value="no" ${erdeklodikDisabled ? 'disabled' : ''}>N</button>
        </span>
      </td>
      <td class="ck-col-megj" data-label="Megjegyzés">
        <div class="ck-megj" contenteditable="true" data-field="megjegyzes">${escapeHtml(st.megjegyzes || '')}</div>
      </td>
    </tr>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// === Render full ===
function render() {
  const tbody = $('#callsTbody');
  const visible = state.contacts.filter((c) => applyFilter(c, state.states[c.adoszam]));
  tbody.innerHTML = visible.length
    ? visible.map(renderRow).join('')
    : `<tr><td colspan="6" class="ck-loading">Nincs találat a szűrőre.</td></tr>`;
  renderStats();
  renderFilterCounts();
}

function renderStats() {
  const total = state.contacts.length;
  const called = state.contacts.filter((c) => state.states[c.adoszam]?.sikerult).length;
  const yesLoss = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'yes').length;
  const noLoss = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'no').length;
  const pct = total ? Math.round((called / total) * 100) : 0;

  $('#stats').innerHTML = `
    <div class="ck-stat-card">
      <div class="ck-stat-num">${total}</div>
      <div class="ck-stat-label">Partner összesen</div>
    </div>
    <div class="ck-stat-card is-orange">
      <div class="ck-stat-num">${called}/${total}</div>
      <div class="ck-stat-label">Hívva</div>
      <div class="ck-stat-sub">${pct}%</div>
    </div>
    <div class="ck-stat-card is-green">
      <div class="ck-stat-num">${yesLoss}</div>
      <div class="ck-stat-label">Vesztés esetén is érdeklődik</div>
    </div>
    <div class="ck-stat-card is-red">
      <div class="ck-stat-num">${noLoss}</div>
      <div class="ck-stat-label">Vesztés esetén nem érdeklődik</div>
    </div>
  `;
}

function renderFilterCounts() {
  $('#count-all').textContent = state.contacts.length;
  $('#count-uncalled').textContent = state.contacts.filter((c) => !state.states[c.adoszam]?.sikerult).length;
  $('#count-interested-loss').textContent = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'yes').length;
  $('#count-not-interested-loss').textContent = state.contacts.filter((c) => state.states[c.adoszam]?.erdeklodik_vesztes === 'no').length;
  $('#count-no-reach').textContent = state.contacts.filter((c) => state.states[c.adoszam]?.sikerult === 'no').length;
}

// === Data fetch ===
async function loadAll() {
  try {
    const [cRes, sRes] = await Promise.all([
      fetch(`${API}/contacts`),
      fetch(`${API}/state`),
    ]);
    const { contacts } = await cRes.json();
    const { states } = await sRes.json();
    const prevCount = state.contacts.length;
    state.contacts = contacts;
    state.states = states;
    // Ha a user éppen szerkesztést végez (megjegyzés vagy keresés), NE rendereljünk újra
    // a teljes tbody-t — különben elveszne a kurzor pozíciója. Csak a stat-okat frissítjük.
    const focused = document.activeElement;
    const isEditing =
      focused &&
      (focused.classList?.contains('ck-megj') || focused.id === 'searchInput');
    if (isEditing) {
      renderStats();
      renderFilterCounts();
    } else {
      render();
    }
    updateLastUpdated();
    if (prevCount && contacts.length > prevCount) {
      toast(`+${contacts.length - prevCount} új partner érkezett`, 'success');
    }
  } catch (err) {
    toast('Adatbetöltés hiba: ' + err.message, 'error');
  }
}

function updateLastUpdated() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  $('#lastUpdated').textContent = `Frissítve: ${hh}:${mm}:${ss}`;
}

// === Update API call ===
async function updateField(adoszam, field, value) {
  const prev = state.states[adoszam] ? { ...state.states[adoszam] } : null;
  // Optimistic update
  state.states[adoszam] = { ...(state.states[adoszam] || {}), [field]: value };
  // Ha sikerult-et N-re vagy null-ra állítottuk, az erdeklodik_vesztes-t is reset
  if (field === 'sikerult' && value !== 'yes') {
    state.states[adoszam].erdeklodik_vesztes = null;
  }
  render();
  try {
    const r = await fetch(`${API}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adoszam, field, value }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    // ha sikerult mező volt + reset → küldjük az erdeklodik_vesztes null-t is
    if (field === 'sikerult' && value !== 'yes' && prev?.erdeklodik_vesztes) {
      await fetch(`${API}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adoszam, field: 'erdeklodik_vesztes', value: null }),
      });
    }
  } catch (err) {
    // Revert
    if (prev) state.states[adoszam] = prev;
    else delete state.states[adoszam];
    render();
    toast('Mentés hiba: ' + err.message, 'error');
  }
}

// === Click delegation: Y/N buttons ===
document.addEventListener('click', (e) => {
  const ynBtn = e.target.closest('.ck-yn-btn');
  if (ynBtn && !ynBtn.disabled) {
    const tr = ynBtn.closest('tr');
    const adoszam = tr.dataset.adoszam;
    const field = ynBtn.dataset.field;
    const value = ynBtn.dataset.value;
    const current = state.states[adoszam]?.[field];
    // Toggle: ha már aktív → reset null-ra; egyébként set
    updateField(adoszam, field, current === value ? null : value);
  }
});

// === Debounce util ===
const debounceMap = new Map();
function debounce(key, fn, ms = 500) {
  clearTimeout(debounceMap.get(key));
  debounceMap.set(key, setTimeout(fn, ms));
}

// === Megjegyzés input ===
document.addEventListener('input', (e) => {
  const megj = e.target.closest('.ck-megj');
  if (!megj) return;
  const tr = megj.closest('tr');
  const adoszam = tr.dataset.adoszam;
  const value = megj.textContent || '';
  debounce(`megj-${adoszam}`, () => {
    fetch(`${API}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adoszam, field: 'megjegyzes', value }),
    }).then((r) => {
      if (!r.ok) toast('Megjegyzés mentés hiba', 'error');
      else {
        // Update in-memory state without re-render (megőrzi a kurzor pozíciót)
        state.states[adoszam] = { ...(state.states[adoszam] || {}), megjegyzes: value };
        updateLastUpdated();
      }
    }).catch((err) => toast('Hálózati hiba: ' + err.message, 'error'));
  }, 500);
});

// === Copy telefon ===
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.ck-copy');
  if (!btn) return;
  const tel = btn.dataset.tel;
  try {
    await navigator.clipboard.writeText(tel);
    btn.classList.add('is-copied');
    btn.textContent = '✓';
    setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.textContent = '📋';
    }, 1200);
  } catch (err) {
    toast('Vágólap hiba: ' + err.message, 'error');
  }
});

// === Filter pills ===
document.addEventListener('click', (e) => {
  const pill = e.target.closest('.ck-pill');
  if (!pill) return;
  $$('.ck-pill').forEach((p) => p.classList.remove('ck-pill--active'));
  pill.classList.add('ck-pill--active');
  state.filter = pill.dataset.filter;
  render();
});

// === Search ===
$('#searchInput').addEventListener('input', (e) => {
  state.search = e.target.value;
  debounce('search', () => render(), 150);
});

// === Manual refresh ===
$('#refreshBtn').addEventListener('click', async () => {
  const btn = $('#refreshBtn');
  btn.classList.add('spinning');
  await loadAll();
  setTimeout(() => btn.classList.remove('spinning'), 400);
});

// === Items modal ===
function openItemsModal(adoszam) {
  const c = state.contacts.find((c) => c.adoszam === adoszam);
  if (!c) return;
  const g = categorizeItems(c.igenyek);
  const sectionList = (items) =>
    items.length
      ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
      : `<div class="ck-modal-empty">—</div>`;
  const unknownSection = g.unknown.length
    ? `
      <div class="ck-modal-section">
        <h4>⚠️ Egyéb / kategorizálatlan <span class="ck-modal-count">${g.unknown.length}</span></h4>
        <ul>${g.unknown.map((i) => `<li class="ck-modal-unknown">${escapeHtml(i)}</li>`).join('')}</ul>
      </div>`
    : '';
  $('#modalTitle').textContent = `${c.cegnev} — ${c.tetelszam} tétel`;
  $('#modalBody').innerHTML = `
    <div class="ck-modal-section">
      <h4>🔧 Szolgáltatás <span class="ck-modal-count">${g.Szolg.length}</span></h4>
      ${sectionList(g.Szolg)}
    </div>
    <div class="ck-modal-section">
      <h4>💾 Szoftver <span class="ck-modal-count">${g.SW.length}</span></h4>
      ${sectionList(g.SW)}
    </div>
    <div class="ck-modal-section">
      <h4>📱 Hardver</h4>
      <div class="ck-modal-hw-summary"><span class="ck-modal-hw-num">${g.HW}</span>db</div>
      ${g.HW ? `<div class="ck-modal-hw-detail">(${g.hwItems.join(', ')})</div>` : ''}
    </div>
    ${unknownSection}
  `;
  const modal = $('#itemsModal');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeItemsModal() {
  const modal = $('#itemsModal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('click', (e) => {
  const itemsBtn = e.target.closest('.ck-items');
  if (itemsBtn) {
    openItemsModal(itemsBtn.dataset.adoszam);
    return;
  }
  if (e.target.dataset?.close === '1') {
    closeItemsModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#itemsModal').classList.contains('is-open')) {
    closeItemsModal();
  }
});

// === Auto-poll 30s ===
setInterval(loadAll, 30000);

// === Init ===
loadAll();
