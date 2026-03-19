/* === DIMOP Költségkalkulátor === */

// --- Unit Cost Data (from PDF pages 31-34) ---
const GOALS = {
  1: { name: 'Legalább 30 Mbps internetkapcsolat', flat: true, supported: true },
  2: { name: 'Alkalmazottak 50%+ internet-hozzáférés', flat: true, supported: true },
  3: { name: 'Távoli hozzáférés (e-mail, dokumentumok, üzleti alkalmazás)', supported: true, excludes: [6],
    components: [
      { name: 'SaaS irodai csomag', unit: 'felhasználó/hó', netto: 5900, brutto: 7493, required: true, perUser: true, perMonth: true },
      { name: 'Domain regisztráció', unit: 'hó', netto: 200, brutto: 254, required: true, perMonth: true },
      { name: 'Havidíjas IT-üzemeltetés (alapszint)', unit: 'hó', netto: 127300, brutto: 161671, required: true, perMonth: true },
    ]},
  4: { name: 'Online (távoli) megbeszélések tartása', supported: true,
    components: [
      { name: 'Videókonferencia platform', unit: 'felhasználó/hó', netto: 5300, brutto: 6731, required: true, perUser: true, perMonth: true },
      { name: 'Bevezetési, üzemeltetési szolgáltatás', unit: 'hó', netto: 53000, brutto: 67310, required: true, perMonth: true },
    ]},
  5: { name: 'IKT-képzés biztosítása az alkalmazottaknak', supported: true, maxPct: 20,
    components: [
      { name: 'IKT-alapképzés', unit: 'fő', netto: 76300, brutto: 96901, required: true, perPerson: true },
      { name: 'Haladó digitális készségfejlesztés', unit: 'fő', netto: 191100, brutto: 242697, required: false, perPerson: true },
    ]},
  6: { name: 'IKT-szakember igénybevétele', supported: true, excludes: [3],
    components: [
      { name: 'IKT-szakember igénybevétele', unit: 'óra', netto: 9200, brutto: 11684, required: true, perHour: true },
    ]},
  7: { name: 'IKT-biztonsági tájékoztatás', supported: true, maxPct: 10,
    components: [
      { name: 'IKT-biztonsági képzés', unit: 'fő', netto: 207100, brutto: 263017, required: true, perPerson: true },
    ]},
  8: { name: 'Legalább 3 IKT-biztonsági intézkedés', supported: true, bonusPoints: { type: 'kibervédelem', points: 2 },
    components: [
      { name: 'Végpontvédelmi licenc', unit: 'db/hó', netto: 1400, brutto: 1778, required: true, perDevice: true, perMonth: true },
      { name: 'Biztonsági mentés', unit: 'db/hó', netto: 3000, brutto: 3810, required: true, perDevice: true, perMonth: true },
    ]},
  9: { name: 'IKT-biztonsági dokumentumok', supported: true,
    components: [
      { name: 'IBSZ kidolgozása', unit: 'egyszeri', netto: 524300, brutto: 665861, required: true, once: true },
      { name: 'GDPR alapfelmérés és nyilvántartás', unit: 'egyszeri', netto: 257900, brutto: 327533, required: false, once: true },
      { name: 'Incidenskezelési terv és oktatás', unit: 'fő', netto: 294300, brutto: 373761, required: false, perPerson: true },
      { name: 'Digitális aláírás szolgáltatás', unit: 'felhasználó/hó', netto: 5200, brutto: 6604, required: false, perUser: true, perMonth: true },
    ]},
  10: { name: 'Saját weboldal/honlap', supported: true,
    components: [
      { name: 'Saját weboldal kialakítása', unit: 'egyszeri', netto: 345100, brutto: 438277, required: true, once: true },
      { name: 'Karbantartás/frissítés', unit: 'hó', netto: 10100, brutto: 12827, required: true, perMonth: true },
      { name: 'Webtárhely', unit: 'hó', netto: 1900, brutto: 2413, required: true, perMonth: true },
      { name: 'SSL tanúsítvány', unit: 'hó', netto: 600, brutto: 762, required: true, perMonth: true },
    ]},
  11: { name: 'Bármilyen közösségi média használata', supported: true, excludes: [12],
    components: [
      { name: 'Tartalomgyártás', unit: 'hó', netto: 74900, brutto: 95123, required: true, perMonth: true },
    ]},
  12: { name: 'Kettő vagy több közösségi média', supported: true, excludes: [11],
    components: [
      { name: 'Online jelenlét és hirdetések', unit: 'hó', netto: 96300, brutto: 122301, required: true, perMonth: true },
      { name: 'Képzés (max 1 fő)', unit: 'fő', netto: 374500, brutto: 475615, required: false, perPerson: true, maxQty: 1 },
    ]},
  13: { name: 'Bármilyen fizetős felhőszolgáltatás', supported: true,
    components: [
      { name: 'Virtuális szerver (IaaS)', unit: 'hó', netto: 21800, brutto: 27686, required: true, perMonth: true },
      { name: 'Adattárolás és mentés (felhő storage)', unit: 'hó', netto: 109100, brutto: 138557, required: true, perMonth: true },
      { name: 'Bevezetés, testre szabás', unit: 'egyszeri', netto: 1379800, brutto: 1752346, required: true, once: true },
      { name: 'MI szolgáltatás', unit: 'felhasználó/hó', netto: 14400, brutto: 18288, required: false, perUser: true, perMonth: true, bonusPoints: { type: 'MI', points: 2 } },
    ]},
  14: { name: 'Fejlett felhőszolgáltatás', supported: false },
  15: { name: 'Vállalati erőforrás-tervezés (ERP)', supported: true,
    components: [
      { name: 'ERP szoftverlicenc / előfizetés (SaaS)', unit: 'felhasználó/hó', netto: 24800, brutto: 31496, required: true, perUser: true, perMonth: true },
      { name: 'Bevezetés, testre szabás, oktatás', unit: 'egyszeri', netto: 1994300, brutto: 2532761, required: true, once: true },
    ]},
  16: { name: 'Ügyfélkapcsolat-kezelés (CRM)', supported: true,
    components: [
      { name: 'CRM szoftverlicenc / előfizetés', unit: 'felhasználó/hó', netto: 20700, brutto: 26289, required: true, perUser: true, perMonth: true },
      { name: 'Bevezetés és testre szabás', unit: 'egyszeri', netto: 1329500, brutto: 1688465, required: true, once: true },
    ]},
  17: { name: 'Adatanalitika', supported: false },
  18: { name: 'Mesterséges intelligencia (MI)', supported: false },
  19: { name: 'Ipari/szolgáltató robot', supported: false },
  20: { name: 'IoT-eszközök/rendszerek', supported: false },
  21: { name: 'Automatizált e-számlák küldése', supported: true,
    components: [
      { name: 'Online számlázó szoftver előfizetés', unit: 'hó', netto: 3200, brutto: 4064, required: true, perMonth: true },
    ]},
  22: { name: 'Webes értékesítés (webshop)', supported: true,
    components: [
      { name: 'Bérelhető webshop rendszer', unit: 'hó', netto: 19200, brutto: 24384, required: true, perMonth: true },
      { name: 'Domain és tárhely', unit: 'hó', netto: 3000, brutto: 3810, required: true, perMonth: true },
    ]},
  23: { name: 'Elektronikus értékesítés', supported: false },
};

const DEVICES = [
  { id: 'pc', name: 'Számítógép', spec: 'i7/Ryzen 7/M2 Pro/M3, 512GB SSD, 16GB RAM', netto: 388600, brutto: 493522 },
  { id: 'monitor', name: 'Monitor', spec: 'QHD 2560×1440, 27"', netto: 62300, brutto: 79121 },
  { id: 'laptop', name: 'Laptop', spec: '14", i7/Ryzen 7/M2 Pro/M3, 512GB SSD, 16GB', netto: 338300, brutto: 429641 },
  { id: 'nas', name: 'Hálózati adattároló (NAS)', spec: '2 fiókos, 2×4TB HDD', netto: 251400, brutto: 319278 },
  { id: 'router', name: 'Router', spec: '1×WAN 2.5Gbit, 5×LAN 1Gbit', netto: 68200, brutto: 86614 },
  { id: 'phone', name: 'Mobiltelefon', spec: '5G, 12GB RAM, 256GB tárhely', netto: 212200, brutto: 269494 },
  { id: 'tablet', name: 'Tablet', spec: '8GB RAM, 128GB, 11"+, BT, GPS, 4G/5G', netto: 256500, brutto: 325755 },
  { id: 'printer', name: 'Multifunkciós nyomtató', spec: 'Lézer, szkenner, duplex, színes, USB, WiFi/LAN', netto: 152300, brutto: 193421 },
];

// --- Calculator State ---
const calcState = {
  months: 18,
  headcount: 5,
  users: 5,
  vatMode: 'netto', // 'netto' or 'brutto'
  selectedGoals: {},   // { goalId: { enabled: true, components: { compIdx: { enabled, qty } } } }
  deviceQty: {},       // { deviceId: qty }
};

// --- Render Calculator ---
function initCalculator() {
  const section = document.getElementById('calculatorSection');
  if (!section) return;

  section.innerHTML = buildCalculatorHTML();
  bindCalculatorEvents();
  recalculate();
}

function buildCalculatorHTML() {
  return `
    <h2 id="kalkulator">Költségkalkulátor</h2>
    <p class="calc-subtitle">Interaktív kalkulátor a DIMOP Plusz-1.2.6/B-26 pályázathoz. Válaszd ki a fejlesztési célokat és eszközöket!</p>

    <!-- Project Settings -->
    <div class="calc-settings">
      <div class="calc-setting">
        <label>Projekt időtartam</label>
        <div class="calc-setting-input">
          <input type="range" id="calcMonths" min="1" max="24" value="18">
          <span id="calcMonthsVal" class="calc-val">18 hó</span>
        </div>
      </div>
      <div class="calc-setting">
        <label>Létszám (helyszínen)</label>
        <input type="number" id="calcHeadcount" min="1" max="50" value="5" class="calc-num">
      </div>
      <div class="calc-setting">
        <label>Felhasználószám</label>
        <input type="number" id="calcUsers" min="1" max="50" value="5" class="calc-num">
      </div>
      <div class="calc-setting">
        <label>ÁFA státusz</label>
        <div class="calc-toggle">
          <button class="calc-toggle-btn active" data-vat="netto">Nettó</button>
          <button class="calc-toggle-btn" data-vat="brutto">Bruttó</button>
        </div>
      </div>
    </div>

    <!-- Load bar (top) -->
    <div class="calc-save-bar">
      <span class="calc-save-label">Mentett kalkuláció betöltése:</span>
      <select id="calcLoadSelect" class="calc-select" style="flex:1;max-width:350px"><option value="">— Válassz —</option></select>
      <button id="calcLoadBtn" class="calc-btn">Betöltés</button>
      <button id="calcDeleteBtn" class="calc-btn calc-btn-danger">Törlés</button>
    </div>

    <!-- Warnings -->
    <div id="calcWarnings" class="calc-warnings"></div>

    <!-- Goals -->
    <h3>Fejlesztési célok</h3>
    <p class="calc-hint" style="margin-bottom:12px">ℹ️ Az 1-2. cél (internet, alkalmazotti hozzáférés) átalánya már beépítve az egységköltségekbe.</p>
    <div class="calc-goals" id="calcGoals">
      ${buildGoalsHTML()}
    </div>

    <!-- Devices -->
    <h3>Eszközök <span class="calc-hint">(min 15% - max 30% az összköltségből)</span></h3>
    <div class="calc-devices" id="calcDevices">
      ${buildDevicesHTML()}
    </div>

    <!-- Scoring -->
    <h3>Értékelési szempontok <span class="calc-hint">(max. 12 pont, min. 2 kell)</span></h3>
    <div class="calc-scoring">
      <div class="calc-score-row">
        <span class="calc-score-num">4.</span>
        <span class="calc-score-name">Kibervédelmi intézkedések</span>
        <span class="calc-score-how">Automatikus: 8. fejlesztési cél bejelölve</span>
        <span class="calc-score-val" id="scoreKiber">—</span>
      </div>
      <div class="calc-score-row">
        <span class="calc-score-num">5.</span>
        <span class="calc-score-name">Mesterséges intelligencia alkalmazás</span>
        <span class="calc-score-how">Automatikus: 13. cél MI összetevője bejelölve</span>
        <span class="calc-score-val" id="scoreMI">—</span>
      </div>
      <div class="calc-score-row">
        <span class="calc-score-num">6.</span>
        <span class="calc-score-name">Digitális szint vállalás</span>
        <span class="calc-score-how">
          <select id="calcDigLevel" class="calc-select-sm">
            <option value="low">Alacsony intenzitás (kötelező)</option>
            <option value="high">Magas intenzitás (+2 extra pont)</option>
          </select>
        </span>
        <span class="calc-score-val" id="scoreDigLevel">2p</span>
      </div>
      <div class="calc-score-hint" id="digLevelHint" style="display:none">
        <strong>Magas intenzitás (12-17 pont):</strong> A projekt végére legalább 12 digitális pontot kell elérned (nem csak 6-ot).
        Ez <strong>+2 extra értékelési pontot</strong> ad, de cserébe:<br>
        - <strong>Digitális Fejlesztési Stratégia (DFS)</strong> készítése kötelező (a DKF Kft.-vel, díjmentes)<br>
        - A záró Jelentést kizárólag a <strong>DKF Kft.</strong> készítheti (nem MKIK, nem könyvvizsgáló)<br>
        - Több fejlesztési célt kell megvalósítani a magasabb pontszámhoz
      </div>
      <div class="calc-score-row">
        <span class="calc-score-num">7.</span>
        <span class="calc-score-name">Területi dimenzió <button class="calc-map-btn" onclick="openRegionMap()">Térkép</button></span>
        <span class="calc-score-how">
          <select id="calcRegion" class="calc-select-sm">
            <option value="other">Közép-/Nyugat-Dunántúl (0 pont)</option>
            <option value="priority">Észak-Alföld / Észak-Mo. / Dél-Dunántúl / Dél-Alföld (+2 pont)</option>
          </select>
        </span>
        <span class="calc-score-val" id="scoreRegion">0p</span>
      </div>
      <div class="calc-score-row">
        <span class="calc-score-num">8.</span>
        <span class="calc-score-name">Digitális Fejlesztési Koncepció</span>
        <span class="calc-score-how">
          <label class="calc-checkbox-label"><input type="checkbox" id="calcDFK" checked> Van vagy vállalom</label>
        </span>
        <span class="calc-score-val" id="scoreDFK">2p</span>
      </div>
      <div class="calc-score-total" id="scoreTotalRow">
        <span><strong>Összesen</strong></span>
        <span id="scoreTotalVal" class="calc-score-total-val">0/12 pont</span>
      </div>
    </div>

    <!-- Save bar (bottom) -->
    <div class="calc-save-bar" style="margin-top:24px">
      <span class="calc-save-label">Kalkuláció mentése:</span>
      <input type="text" id="calcSaveName" placeholder="Új kalkuláció neve..." class="calc-save-input">
      <span class="text-muted" style="font-size:12px">vagy felülírás:</span>
      <select id="calcSaveOverwrite" class="calc-select" style="max-width:250px"><option value="">— Új mentés —</option></select>
      <button id="calcSaveBtn" class="calc-btn calc-btn-primary">Mentés</button>
    </div>

    <!-- Summary -->
    <div class="calc-summary" id="calcSummary"></div>
  `;
}

function buildGoalsHTML() {
  let html = '';
  for (const [id, goal] of Object.entries(GOALS)) {
    const num = parseInt(id);
    if (goal.flat) continue; // 1-2. cél átalány, nem jelenik meg
    const disabled = !goal.supported;
    const isFlat = goal.flat;

    html += `<div class="calc-goal ${disabled ? 'disabled' : ''}" data-goal="${num}">
      <div class="calc-goal-header">
        <label class="calc-goal-label">
          <input type="checkbox" class="calc-goal-check" data-goal="${num}" ${disabled ? 'disabled' : ''}>
          <span class="calc-goal-num">${num}.</span>
          <span class="calc-goal-name">${goal.name}</span>
        </label>
        <span class="calc-goal-tag">
          ${isFlat ? '<span class="tag tag-gray">Átalány</span>' : ''}
          ${disabled ? '<span class="tag tag-red">Nem támogatott</span>' : ''}
          ${goal.maxPct ? `<span class="tag tag-yellow">Max ${goal.maxPct}%</span>` : ''}
          ${goal.bonusPoints ? `<span class="tag tag-blue">+${goal.bonusPoints.points} pont</span>` : ''}
          ${goal.excludes ? `<span class="tag tag-orange">Kizárja: ${goal.excludes.join(', ')}.</span>` : ''}
        </span>
        <span class="calc-goal-total" data-goal-total="${num}">0 Ft</span>
      </div>
      ${!isFlat && !disabled && goal.components ? `
        <div class="calc-components" data-components="${num}">
          <table class="calc-comp-table">
            <thead><tr><th></th><th>Összetevő</th><th>Egységár</th><th>Fő/Db</th><th>Hónap</th><th>Összeg</th></tr></thead>
            <tbody>
              ${goal.components.map((c, ci) => `
                <tr class="calc-comp-row" data-goal="${num}" data-comp="${ci}">
                  <td><input type="checkbox" class="calc-comp-check" data-goal="${num}" data-comp="${ci}" ${c.required ? 'checked disabled' : ''}></td>
                  <td>
                    <strong>${c.name}</strong> ${c.required ? '<span class="tag tag-sm tag-blue">Kötelező</span>' : '<span class="tag tag-sm tag-gray">Választható</span>'}
                    ${c.bonusPoints ? `<span class="tag tag-sm tag-blue">+${c.bonusPoints.points} pont (${c.bonusPoints.type})</span>` : ''}
                  </td>
                  <td class="text-right calc-unit-price" data-goal="${num}" data-comp="${ci}">${fmt(c.netto)}</td>
                  <td>${buildQtyField(c, num, ci)}</td>
                  <td>${buildMonthField(c, num, ci)}</td>
                  <td class="text-right calc-comp-total" data-goal="${num}" data-comp="${ci}">0 Ft</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>`;
  }
  return html;
}

function buildDevicesHTML() {
  return `<table class="calc-device-table">
    <thead><tr><th>Eszköz</th><th>Min. paraméterek</th><th>Egységár</th><th>Darab</th><th>Összeg</th></tr></thead>
    <tbody>
      ${DEVICES.map(d => `
        <tr class="calc-device-row" data-device="${d.id}">
          <td><strong>${d.name}</strong></td>
          <td><small class="text-muted">${d.spec}</small></td>
          <td class="text-right calc-device-price" data-device="${d.id}">${fmt(d.netto)}</td>
          <td><input type="number" class="calc-qty" data-device="${d.id}" min="0" max="99" value="0"></td>
          <td class="text-right calc-device-total" data-device="${d.id}">0 Ft</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr style="font-weight:700;border-top:2px solid var(--gray-300)">
        <td colspan="3">Eszközök összesen</td>
        <td class="text-right" id="devicesTotalFooter">0 Ft</td>
        <td class="text-right" id="devicesRatioFooter"></td>
      </tr>
    </tfoot>
  </table>`;
}

function getDefaultQty(comp) {
  if (comp.perPerson) return 5;
  if (comp.perHour) return 10;
  if (comp.perDevice) return 5;
  if (comp.perUser) return 5;
  return 1;
}

function buildQtyField(c, goalId, compIdx) {
  if (c.once) return '<span class="text-muted">1×</span>';
  if (c.perUser || c.perPerson || c.perDevice || c.perHour) {
    const label = c.perHour ? 'óra' : (c.perDevice ? 'db' : 'fő');
    const defaultVal = getDefaultQty(c);
    return `<input type="number" class="calc-qty" data-goal="${goalId}" data-comp="${compIdx}" data-field="qty" min="0" max="${c.maxQty || 999}" value="${defaultVal}"><small class="text-muted">${label}</small>`;
  }
  // Only perMonth, no per-unit dimension
  return '<span class="text-muted">—</span>';
}

function buildMonthField(c, goalId, compIdx) {
  if (c.once) return '<span class="text-muted">—</span>';
  if (c.perMonth) {
    return `<input type="number" class="calc-month-input" data-goal="${goalId}" data-comp="${compIdx}" data-field="months" min="1" max="24" value="${calcState.months}"><small class="text-muted">hó</small>`;
  }
  return '<span class="text-muted">—</span>';
}

// --- Bind Events ---
function bindCalculatorEvents() {
  // Month slider - also updates all month input fields that haven't been manually edited
  const monthSlider = document.getElementById('calcMonths');
  monthSlider.addEventListener('input', () => {
    const oldMonths = calcState.months;
    calcState.months = parseInt(monthSlider.value);
    document.getElementById('calcMonthsVal').textContent = calcState.months + ' hó';
    // Update month inputs that still have the old default value
    document.querySelectorAll('.calc-month-input').forEach(inp => {
      if (parseInt(inp.value) === oldMonths || !inp.dataset.manuallyEdited) {
        inp.value = calcState.months;
        delete inp.dataset.manuallyEdited;
      }
    });
    recalculate();
  });

  // Headcount
  document.getElementById('calcHeadcount').addEventListener('input', (e) => {
    calcState.headcount = parseInt(e.target.value) || 1;
    recalculate();
  });

  // Users - also update qty fields for perUser components
  document.getElementById('calcUsers').addEventListener('input', (e) => {
    const oldUsers = calcState.users;
    calcState.users = parseInt(e.target.value) || 1;
    // Update qty inputs that still have the old default
    document.querySelectorAll('.calc-qty').forEach(inp => {
      if (parseInt(inp.value) === oldUsers && !inp.dataset.manuallyEdited) {
        inp.value = calcState.users;
      }
    });
    recalculate();
  });

  // Scoring inputs
  document.getElementById('calcDigLevel').addEventListener('change', () => recalculate());
  document.getElementById('calcRegion').addEventListener('change', () => recalculate());
  document.getElementById('calcDFK').addEventListener('change', () => recalculate());

  // VAT toggle
  document.querySelectorAll('.calc-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calcState.vatMode = btn.dataset.vat;
      updatePriceDisplay();
      recalculate();
    });
  });

  // Goal checkboxes
  document.querySelectorAll('.calc-goal-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const goalId = parseInt(cb.dataset.goal);
      const goal = GOALS[goalId];
      const comps = document.querySelector(`[data-components="${goalId}"]`);
      if (comps) comps.style.display = cb.checked ? 'block' : 'none';

      // Handle exclusions
      if (cb.checked && goal.excludes) {
        goal.excludes.forEach(exId => {
          const exCb = document.querySelector(`.calc-goal-check[data-goal="${exId}"]`);
          if (exCb && exCb.checked) {
            exCb.checked = false;
            exCb.dispatchEvent(new Event('change'));
          }
        });
      }
      recalculate();
    });
  });

  // Component checkboxes & quantities & month inputs
  document.querySelectorAll('.calc-comp-check').forEach(cb => {
    cb.addEventListener('change', () => recalculate());
  });
  document.querySelectorAll('.calc-qty').forEach(input => {
    input.addEventListener('input', () => {
      input.dataset.manuallyEdited = 'true';
      recalculate();
    });
  });
  document.querySelectorAll('.calc-month-input').forEach(input => {
    input.addEventListener('input', () => {
      input.dataset.manuallyEdited = 'true';
      recalculate();
    });
  });

  // Save/Load buttons
  document.getElementById('calcSaveBtn').addEventListener('click', saveCalcNamed);
  document.getElementById('calcLoadBtn').addEventListener('click', loadCalcNamed);
  document.getElementById('calcDeleteBtn').addEventListener('click', deleteCalcNamed);
  refreshSavesList();

  // Restore autosave
  restoreAutoSave();
}

// --- Price Display Update ---
function updatePriceDisplay() {
  const mode = calcState.vatMode;

  // Update goal component prices
  for (const [goalId, goal] of Object.entries(GOALS)) {
    if (!goal.components) continue;
    goal.components.forEach((c, ci) => {
      const priceEl = document.querySelector(`.calc-unit-price[data-goal="${goalId}"][data-comp="${ci}"]`);
      if (priceEl) priceEl.textContent = fmt(mode === 'netto' ? c.netto : c.brutto);
    });
  }

  // Update device prices
  DEVICES.forEach(d => {
    const priceEl = document.querySelector(`.calc-device-price[data-device="${d.id}"]`);
    if (priceEl) priceEl.textContent = fmt(mode === 'netto' ? d.netto : d.brutto);
  });
}

// --- Recalculate Everything ---
function recalculate() {
  const mode = calcState.vatMode;
  const months = calcState.months;
  const users = calcState.users;
  let goalsTotal = 0;
  let devicesTotal = 0;
  let selectedGoalCount = 0;
  let goal5Total = 0;
  let goal7Total = 0;
  const warnings = [];
  let bonusPoints = 0;

  // Calculate goal costs
  for (const [goalId, goal] of Object.entries(GOALS)) {
    const num = parseInt(goalId);
    const cb = document.querySelector(`.calc-goal-check[data-goal="${num}"]`);
    if (!cb || !cb.checked || !goal.components) {
      const totalEl = document.querySelector(`[data-goal-total="${num}"]`);
      if (totalEl) totalEl.textContent = '0 Ft';
      continue;
    }

    if (!goal.flat && goal.supported) selectedGoalCount++;

    let goalTotal = 0;
    goal.components.forEach((comp, ci) => {
      const compCheck = document.querySelector(`.calc-comp-check[data-goal="${num}"][data-comp="${ci}"]`);
      const qtyInput = document.querySelector(`.calc-qty[data-goal="${num}"][data-comp="${ci}"]`);
      const monthInput = document.querySelector(`.calc-month-input[data-goal="${num}"][data-comp="${ci}"]`);
      const totalEl = document.querySelector(`.calc-comp-total[data-goal="${num}"][data-comp="${ci}"]`);

      if (!compCheck || !compCheck.checked) {
        if (totalEl) totalEl.textContent = '0 Ft';
        return;
      }

      const unitPrice = mode === 'netto' ? comp.netto : comp.brutto;
      let compTotal;

      if (comp.once) {
        compTotal = unitPrice;
      } else {
        const qty = qtyInput ? (parseInt(qtyInput.value) || 0) : 1;
        const mths = monthInput ? (parseInt(monthInput.value) || 0) : 1;

        if (comp.perMonth && (comp.perUser || comp.perPerson || comp.perDevice)) {
          // egységár × fő/db × hónap
          compTotal = unitPrice * qty * mths;
        } else if (comp.perMonth) {
          // egységár × hónap (nincs fő/db dimenzió)
          compTotal = unitPrice * mths;
        } else {
          // egységár × fő/db/óra (nincs hónap)
          compTotal = unitPrice * qty;
        }
      }

      if (totalEl) totalEl.textContent = fmt(compTotal);
      goalTotal += compTotal;

      // Bonus points
      if (comp.bonusPoints && compCheck.checked) bonusPoints += comp.bonusPoints.points;
    });

    const goalTotalEl = document.querySelector(`[data-goal-total="${num}"]`);
    if (goalTotalEl) goalTotalEl.textContent = fmt(goalTotal);
    goalsTotal += goalTotal;

    if (num === 5) goal5Total = goalTotal;
    if (num === 7) goal7Total = goalTotal;

    // Goal-level bonus points
    if (goal.bonusPoints) bonusPoints += goal.bonusPoints.points;
  }

  // Calculate device costs
  DEVICES.forEach(d => {
    const qtyInput = document.querySelector(`.calc-qty[data-device="${d.id}"]`);
    const totalEl = document.querySelector(`.calc-device-total[data-device="${d.id}"]`);
    const qty = parseInt(qtyInput?.value) || 0;
    const unitPrice = mode === 'netto' ? d.netto : d.brutto;
    const total = unitPrice * qty;
    if (totalEl) totalEl.textContent = fmt(total);
    devicesTotal += total;
  });

  // Update device footer
  const totalCost = goalsTotal + devicesTotal;
  const devicePctVal = totalCost > 0 ? (devicesTotal / totalCost * 100) : 0;
  const dtf = document.getElementById('devicesTotalFooter');
  const drf = document.getElementById('devicesRatioFooter');
  if (dtf) dtf.textContent = fmt(devicesTotal);
  if (drf) {
    if (devicesTotal === 0) {
      drf.innerHTML = '';
    } else if (devicePctVal >= 15 && devicePctVal <= 30) {
      drf.innerHTML = `<span style="color:var(--green)">✅ ${devicePctVal.toFixed(1)}%</span>`;
    } else {
      drf.innerHTML = `<span style="color:var(--red)">❌ ${devicePctVal.toFixed(1)}% (kell: 15-30%)</span>`;
    }
  }

  // Totals
  const maxEuCost = 13333333;
  const euCost = Math.min(totalCost, maxEuCost);
  const support = Math.min(Math.floor(euCost * 0.9), 12000000);
  const ownFund = euCost - support;
  const advance = Math.floor(support * 0.25);

  // Validation warnings
  if (totalCost > 0) {
    const devicePct = totalCost > 0 ? (devicesTotal / totalCost * 100) : 0;
    if (devicesTotal > 0 && devicePct < 15) {
      warnings.push({ type: 'error', text: `Eszközarány: ${devicePct.toFixed(1)}% — minimum 15% kell!` });
    }
    if (devicePct > 30) {
      warnings.push({ type: 'error', text: `Eszközarány: ${devicePct.toFixed(1)}% — maximum 30% lehet!` });
    }
    if (devicesTotal > 0 && devicePct >= 15 && devicePct <= 30) {
      warnings.push({ type: 'ok', text: `Eszközarány: ${devicePct.toFixed(1)}% (15-30% OK)` });
    }
  }

  if (selectedGoalCount < 3 && totalCost > 0) {
    warnings.push({ type: 'error', text: `${selectedGoalCount} fejlesztési cél kiválasztva — minimum 3 kell (az 1. és 2. nem számít bele)!` });
  } else if (selectedGoalCount >= 3) {
    warnings.push({ type: 'ok', text: `${selectedGoalCount} fejlesztési cél kiválasztva (min. 3 OK)` });
  }

  if (goal5Total > 0 && totalCost > 0) {
    const pct5 = goal5Total / totalCost * 100;
    if (pct5 > 20) warnings.push({ type: 'error', text: `IKT-képzés (5.): ${pct5.toFixed(1)}% — max 20% lehet!` });
  }

  if (goal7Total > 0 && totalCost > 0) {
    const pct7 = goal7Total / totalCost * 100;
    if (pct7 > 10) warnings.push({ type: 'error', text: `IKT-biztonsági képzés (7.): ${pct7.toFixed(1)}% — max 10% lehet!` });
  }

  if (support > 0 && support < 3000000) {
    warnings.push({ type: 'error', text: `Támogatás: ${fmt(support)} — minimum 3 000 000 Ft kell!` });
  }
  if (support > 12000000) {
    warnings.push({ type: 'error', text: `Támogatás: ${fmt(support)} — maximum 12 000 000 Ft!` });
  }
  if (totalCost > maxEuCost) {
    warnings.push({ type: 'warn', text: `Összköltség ${fmt(totalCost)} meghaladja a max. EU elszámolható ${fmt(maxEuCost)}-t.` });
  }

  // Calculate total evaluation score (8.2. pont)
  const digLevel = document.getElementById('calcDigLevel')?.value;
  const region = document.getElementById('calcRegion')?.value;
  const hasDFK = document.getElementById('calcDFK')?.checked;

  const digPoints = digLevel === 'high' ? 4 : 2;
  const regionPoints = region === 'priority' ? 2 : 0;
  const dfkPoints = hasDFK ? 2 : 0;
  // bonusPoints already has kibervédelem + MI from component checks
  // Split bonusPoints into kiber and MI for display
  const goal8checked = document.querySelector('.calc-goal-check[data-goal="8"]')?.checked;
  const mi13checked = document.querySelector('.calc-comp-check[data-goal="13"][data-comp="3"]')?.checked;
  const kiberPoints = goal8checked ? 2 : 0;
  const miPoints = mi13checked ? 2 : 0;

  const totalPoints = kiberPoints + miPoints + digPoints + regionPoints + dfkPoints;

  // Update scoring section visuals
  const scoreEl = (id, pts, max) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = pts > 0 ? `+${pts}p` : '0p';
    el.style.color = pts > 0 ? 'var(--green)' : 'var(--gray-500)';
    el.style.fontWeight = pts > 0 ? '700' : '400';
  };
  scoreEl('scoreKiber', kiberPoints);
  scoreEl('scoreMI', miPoints);
  scoreEl('scoreDigLevel', digPoints);
  const hintEl = document.getElementById('digLevelHint');
  if (hintEl) hintEl.style.display = digLevel === 'high' ? 'block' : 'none';
  scoreEl('scoreRegion', regionPoints);
  scoreEl('scoreDFK', dfkPoints);

  const totalValEl = document.getElementById('scoreTotalVal');
  if (totalValEl) {
    totalValEl.textContent = `${totalPoints}/12 pont`;
    totalValEl.style.color = totalPoints >= 2 ? 'var(--green)' : 'var(--red)';
  }
  const totalRowEl = document.getElementById('scoreTotalRow');
  if (totalRowEl) totalRowEl.style.background = totalPoints >= 2 ? '#d4edda' : '#fde8e8';

  if (totalPoints < 2 && totalCost > 0) {
    warnings.push({ type: 'error', text: `Értékelési pontszám: ${totalPoints} — minimum 2 pont kell!` });
  }

  // Render warnings
  const warningsEl = document.getElementById('calcWarnings');
  warningsEl.innerHTML = warnings.map(w =>
    `<div class="calc-warn calc-warn-${w.type}">${w.type === 'ok' ? '✅' : w.type === 'warn' ? '⚠️' : '❌'} ${w.text}</div>`
  ).join('');

  // Render summary
  const summaryEl = document.getElementById('calcSummary');
  const hasErrors = warnings.some(w => w.type === 'error');
  const maxSupport = 12000000;
  const remaining = maxSupport - support;
  const usedPct = maxSupport > 0 ? Math.min(support / maxSupport * 100, 100) : 0;

  summaryEl.innerHTML = `
    <div class="calc-summary-inner ${hasErrors ? 'has-errors' : ''}">
      <div class="calc-summary-row">
        <span>Szoftver/szolgáltatás</span>
        <span class="calc-summary-val">${fmt(goalsTotal)}</span>
      </div>
      <div class="calc-summary-row">
        <span>Eszközök</span>
        <span class="calc-summary-val">${fmt(devicesTotal)}</span>
      </div>
      <div class="calc-summary-row calc-summary-total">
        <span>EU elszámolható összköltség</span>
        <span class="calc-summary-val">${fmt(euCost)}</span>
      </div>
      <div class="calc-summary-row calc-summary-highlight">
        <span>Támogatás (90%)</span>
        <span class="calc-summary-val">${fmt(support)}</span>
      </div>
      <div class="calc-summary-row">
        <span>Önerő (min. 10%)</span>
        <span class="calc-summary-val">${fmt(ownFund)}</span>
      </div>
      <div class="calc-summary-row">
        <span>Előleg (max. 25%)</span>
        <span class="calc-summary-val">${fmt(advance)}</span>
      </div>
      <div class="calc-summary-row" style="grid-column:1/-1;border-top:1px solid var(--gray-200);padding-top:8px;margin-top:4px">
        <span>Szabad keret a max. 12M Ft-ból</span>
        <span class="calc-summary-val" style="color:${remaining > 0 ? 'var(--green)' : 'var(--red)'}">${remaining >= 0 ? fmt(remaining) : 'Túllépve!'}</span>
      </div>
      <div style="grid-column:1/-1;height:8px;background:var(--gray-200);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${usedPct}%;background:${usedPct >= 100 ? 'var(--red)' : 'var(--blue)'};border-radius:4px;transition:width .3s"></div>
      </div>
    </div>
  `;

  // Auto-save after every recalculation
  autoSave();
}

// --- State Serialize/Restore ---
const AUTOSAVE_KEY = 'dimop-calc-autosave';
const SAVES_KEY = 'dimop-calc-saves';

function getCalcState() {
  const state = {
    months: parseInt(document.getElementById('calcMonths')?.value) || 18,
    headcount: parseInt(document.getElementById('calcHeadcount')?.value) || 5,
    users: parseInt(document.getElementById('calcUsers')?.value) || 5,
    vatMode: calcState.vatMode,
    digLevel: document.getElementById('calcDigLevel')?.value || 'low',
    region: document.getElementById('calcRegion')?.value || 'other',
    dfk: document.getElementById('calcDFK')?.checked ?? true,
    goals: {},
    devices: {},
  };

  // Goals + components
  document.querySelectorAll('.calc-goal-check').forEach(cb => {
    const gid = cb.dataset.goal;
    if (!cb.checked) return;
    const comps = {};
    document.querySelectorAll(`.calc-comp-check[data-goal="${gid}"]`).forEach(cc => {
      const ci = cc.dataset.comp;
      const qtyEl = document.querySelector(`.calc-qty[data-goal="${gid}"][data-comp="${ci}"]`);
      const monthEl = document.querySelector(`.calc-month-input[data-goal="${gid}"][data-comp="${ci}"]`);
      comps[ci] = {
        checked: cc.checked,
        qty: qtyEl ? parseInt(qtyEl.value) || 0 : null,
        months: monthEl ? parseInt(monthEl.value) || 0 : null,
      };
    });
    state.goals[gid] = { enabled: true, comps };
  });

  // Devices
  DEVICES.forEach(d => {
    const qtyEl = document.querySelector(`.calc-qty[data-device="${d.id}"]`);
    const qty = parseInt(qtyEl?.value) || 0;
    if (qty > 0) state.devices[d.id] = qty;
  });

  return state;
}

function applyCalcState(state) {
  if (!state) return;

  // Header settings
  const monthSlider = document.getElementById('calcMonths');
  if (monthSlider) { monthSlider.value = state.months || 18; calcState.months = state.months || 18; }
  const monthsVal = document.getElementById('calcMonthsVal');
  if (monthsVal) monthsVal.textContent = (state.months || 18) + ' hó';

  const hc = document.getElementById('calcHeadcount');
  if (hc) { hc.value = state.headcount || 5; calcState.headcount = state.headcount || 5; }

  const us = document.getElementById('calcUsers');
  if (us) { us.value = state.users || 5; calcState.users = state.users || 5; }

  // VAT
  if (state.vatMode) {
    calcState.vatMode = state.vatMode;
    document.querySelectorAll('.calc-toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.vat === state.vatMode);
    });
    updatePriceDisplay();
  }

  // Scoring
  const dl = document.getElementById('calcDigLevel');
  if (dl && state.digLevel) dl.value = state.digLevel;
  const rg = document.getElementById('calcRegion');
  if (rg && state.region) rg.value = state.region;
  const dfk = document.getElementById('calcDFK');
  if (dfk && state.dfk !== undefined) dfk.checked = state.dfk;

  // Goals
  document.querySelectorAll('.calc-goal-check').forEach(cb => {
    const gid = cb.dataset.goal;
    const goalState = state.goals?.[gid];
    cb.checked = !!goalState?.enabled;
    const compsDiv = document.querySelector(`[data-components="${gid}"]`);
    if (compsDiv) compsDiv.style.display = cb.checked ? 'block' : 'none';

    if (goalState?.comps) {
      Object.entries(goalState.comps).forEach(([ci, cs]) => {
        const cc = document.querySelector(`.calc-comp-check[data-goal="${gid}"][data-comp="${ci}"]`);
        if (cc && !cc.disabled) cc.checked = cs.checked;
        const qtyEl = document.querySelector(`.calc-qty[data-goal="${gid}"][data-comp="${ci}"]`);
        if (qtyEl && cs.qty !== null) qtyEl.value = cs.qty;
        const monthEl = document.querySelector(`.calc-month-input[data-goal="${gid}"][data-comp="${ci}"]`);
        if (monthEl && cs.months !== null) monthEl.value = cs.months;
      });
    }
  });

  // Devices
  DEVICES.forEach(d => {
    const qtyEl = document.querySelector(`.calc-qty[data-device="${d.id}"]`);
    if (qtyEl) qtyEl.value = state.devices?.[d.id] || 0;
  });

  recalculate();
}

// --- Auto-save ---
function autoSave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(getCalcState()));
  } catch {}
}

function restoreAutoSave() {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) applyCalcState(JSON.parse(saved));
  } catch {}
}

// --- Named saves ---
function getSaves() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]'); } catch { return []; }
}

function refreshSavesList() {
  const saves = getSaves();

  // Load dropdown (top)
  const loadSelect = document.getElementById('calcLoadSelect');
  if (loadSelect) {
    loadSelect.innerHTML = `<option value="">— Válassz (${saves.length} mentés) —</option>`;
    saves.forEach((s, i) => { loadSelect.innerHTML += `<option value="${i}">${s.name} (${s.date})</option>`; });
  }

  // Overwrite dropdown (bottom)
  const overwriteSelect = document.getElementById('calcSaveOverwrite');
  if (overwriteSelect) {
    overwriteSelect.innerHTML = '<option value="">— Új mentés —</option>';
    saves.forEach((s, i) => { overwriteSelect.innerHTML += `<option value="${i}">${s.name}</option>`; });
  }
}

function saveCalcNamed() {
  const nameInput = document.getElementById('calcSaveName');
  const overwriteSelect = document.getElementById('calcSaveOverwrite');
  const overwriteIdx = parseInt(overwriteSelect?.value);
  const saves = getSaves();

  let name;
  if (!isNaN(overwriteIdx) && saves[overwriteIdx]) {
    // Overwrite existing
    name = saves[overwriteIdx].name;
    saves[overwriteIdx] = { name, date: new Date().toLocaleDateString('hu-HU'), state: getCalcState() };
  } else {
    // New save
    name = nameInput?.value.trim();
    if (!name) { nameInput?.focus(); return; }
    const existingIdx = saves.findIndex(s => s.name === name);
    const entry = { name, date: new Date().toLocaleDateString('hu-HU'), state: getCalcState() };
    if (existingIdx >= 0) {
      saves[existingIdx] = entry;
    } else {
      saves.push(entry);
    }
  }

  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
    refreshSavesList();
    if (nameInput) nameInput.value = '';
    if (overwriteSelect) overwriteSelect.value = '';
  } catch {}
}

function loadCalcNamed() {
  const select = document.getElementById('calcLoadSelect');
  const idx = parseInt(select?.value);
  if (isNaN(idx)) return;
  const saves = getSaves();
  if (saves[idx]) {
    applyCalcState(saves[idx].state);
    document.getElementById('calcSaveName').value = saves[idx].name;
  }
}

function deleteCalcNamed() {
  const select = document.getElementById('calcLoadSelect');
  const idx = parseInt(select?.value);
  if (isNaN(idx)) return;
  const saves = getSaves();
  if (saves[idx] && confirm(`Törlöd: "${saves[idx].name}"?`)) {
    saves.splice(idx, 1);
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
    refreshSavesList();
  }
}

// --- Region Map ---
function openRegionMap() {
  // Remove existing modal if any
  document.getElementById('regionMapModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'regionMapModal';
  modal.className = 'region-modal-overlay';
  modal.innerHTML = `
    <div class="region-modal">
      <div class="region-modal-header">
        <h3>Magyarország régiói - DIMOP Plusz területi besorolás</h3>
        <button class="region-modal-close" onclick="document.getElementById('regionMapModal').remove()">&times;</button>
      </div>
      <div class="region-modal-body">
        <svg viewBox="0 0 800 500" class="region-map-svg">
          <!-- Nyugat-Dunántúl -->
          <path d="M80,140 L140,100 L180,120 L200,180 L220,220 L200,300 L160,340 L120,350 L60,300 L50,220 L60,180 Z" class="region-neutral" data-region="nyugat">
            <title>Nyugat-Dunántúl: Győr, Szombathely, Zalaegerszeg (0 pont, de pályázhat)</title>
          </path>
          <text x="130" y="230" class="region-label">Nyugat-</text><text x="120" y="248" class="region-label">Dunántúl</text>

          <!-- Közép-Dunántúl -->
          <path d="M180,120 L260,100 L310,130 L330,170 L310,220 L280,260 L240,290 L200,300 L220,220 L200,180 Z" class="region-neutral" data-region="kozep-dt">
            <title>Közép-Dunántúl: Székesfehérvár, Veszprém, Tatabánya (0 pont, de pályázhat)</title>
          </path>
          <text x="230" y="190" class="region-label">Közép-</text><text x="220" y="208" class="region-label">Dunántúl</text>

          <!-- Dél-Dunántúl -->
          <path d="M120,350 L160,340 L200,300 L240,290 L280,260 L310,300 L320,360 L300,420 L240,450 L180,440 L130,410 L100,370 Z" class="region-priority" data-region="del-dt">
            <title>Dél-Dunántúl: Pécs, Kaposvár, Szekszárd (+2 pont)</title>
          </path>
          <text x="200" y="370" class="region-label">Dél-</text><text x="190" y="388" class="region-label">Dunántúl</text>

          <!-- Budapest / Közép-Mo -->
          <path d="M310,130 L370,110 L400,140 L390,180 L360,200 L330,170 Z" class="region-blocked" data-region="budapest">
            <title>Budapest / Közép-Magyarország: NEM pályázhat!</title>
          </path>
          <text x="340" y="160" class="region-label-sm">BP</text>

          <!-- Észak-Magyarország -->
          <path d="M310,130 L370,110 L420,60 L500,50 L560,80 L540,140 L480,170 L420,180 L390,180 L400,140 Z" class="region-priority" data-region="eszak-mo">
            <title>Észak-Magyarország: Miskolc, Eger, Salgótarján (+2 pont)</title>
          </path>
          <text x="430" y="110" class="region-label">Észak-</text><text x="410" y="128" class="region-label">Magyarország</text>

          <!-- Észak-Alföld -->
          <path d="M540,140 L560,80 L640,60 L720,90 L740,160 L720,230 L660,260 L580,250 L520,220 L480,170 Z" class="region-priority" data-region="eszak-alfold">
            <title>Észak-Alföld: Debrecen, Nyíregyháza, Szolnok (+2 pont)</title>
          </path>
          <text x="590" y="160" class="region-label">Észak-</text><text x="590" y="178" class="region-label">Alföld</text>

          <!-- Dél-Alföld -->
          <path d="M310,300 L360,200 L390,180 L420,180 L480,170 L520,220 L580,250 L660,260 L680,320 L660,400 L580,440 L480,450 L400,430 L340,400 L320,360 Z" class="region-priority" data-region="del-alfold">
            <title>Dél-Alföld: Szeged, Kecskemét, Békéscsaba (+2 pont)</title>
          </path>
          <text x="470" y="330" class="region-label">Dél-Alföld</text>

          <!-- City dots -->
          <circle cx="115" cy="170" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="125" y="175" class="city-label">Győr</text>
          <circle cx="100" cy="290" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="70" y="286" class="city-label">Szombathely</text>
          <circle cx="150" cy="330" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="108" y="346" class="city-label">Zalaegerszeg</text>
          <circle cx="250" cy="160" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="195" y="157" class="city-label">Veszprém</text>
          <circle cx="290" cy="180" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="218" y="178" class="city-label">Székesfehérvár</text>
          <circle cx="230" cy="380" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="240" y="384" class="city-label">Pécs</text>
          <circle cx="195" cy="360" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="150" y="370" class="city-label">Kaposvár</text>
          <circle cx="300" cy="340" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="310" y="344" class="city-label">Szekszárd</text>
          <circle cx="360" cy="155" r="3" fill="#fff" stroke="#c00" stroke-width="2"/><text x="350" y="148" class="city-label" style="fill:#c00;font-weight:700">Budapest</text>
          <circle cx="440" cy="100" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="450" y="96" class="city-label">Eger</text>
          <circle cx="520" cy="100" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="530" y="96" class="city-label">Miskolc</text>
          <circle cx="660" cy="140" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="665" y="155" class="city-label">Debrecen</text>
          <circle cx="710" cy="110" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="680" y="100" class="city-label">Nyíregyháza</text>
          <circle cx="490" cy="220" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="500" y="224" class="city-label">Szolnok</text>
          <circle cx="440" cy="350" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="450" y="354" class="city-label">Kecskemét</text>
          <circle cx="530" cy="400" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="540" y="404" class="city-label">Szeged</text>
          <circle cx="640" cy="350" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/><text x="650" y="354" class="city-label">Békéscsaba</text>
        </svg>

        <div class="region-legend">
          <div class="region-legend-item"><span class="region-dot region-dot-priority"></span> <strong>Kiemelt régió (+2 pont)</strong></div>
          <div class="region-legend-item"><span class="region-dot region-dot-neutral"></span> Pályázhat (0 pont)</div>
          <div class="region-legend-item"><span class="region-dot region-dot-blocked"></span> NEM pályázhat</div>
        </div>

        <div class="region-details">
          <div class="region-col">
            <h4 style="color:var(--green)">Kiemelt régiók (+2 pont)</h4>
            <p><strong>Észak-Alföld:</strong> Debrecen, Nyíregyháza, Szolnok, Jászberény, Hajdúszoboszló</p>
            <p><strong>Észak-Magyarország:</strong> Miskolc, Eger, Salgótarján, Gyöngyös, Kazincbarcika</p>
            <p><strong>Dél-Dunántúl:</strong> Pécs, Kaposvár, Szekszárd, Mohács, Komló</p>
            <p><strong>Dél-Alföld:</strong> Szeged, Kecskemét, Békéscsaba, Hódmezővásárhely, Baja</p>
          </div>
          <div class="region-col">
            <h4 style="color:var(--gray-700)">Egyéb régiók (0 pont, de pályázhat)</h4>
            <p><strong>Közép-Dunántúl:</strong> Székesfehérvár, Veszprém, Tatabánya, Dunaújváros</p>
            <p><strong>Nyugat-Dunántúl:</strong> Győr, Szombathely, Zalaegerszeg, Sopron, Nagykanizsa</p>
            <h4 style="color:var(--red);margin-top:12px">NEM pályázhat</h4>
            <p><strong>Budapest / Közép-Magyarország</strong></p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// --- Helpers ---
function fmt(n) {
  return Math.round(n).toLocaleString('hu-HU') + ' Ft';
}
