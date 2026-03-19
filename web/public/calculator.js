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

    <!-- Warnings -->
    <div id="calcWarnings" class="calc-warnings"></div>

    <!-- Goals -->
    <h3>Fejlesztési célok</h3>
    <div class="calc-goals" id="calcGoals">
      ${buildGoalsHTML()}
    </div>

    <!-- Devices -->
    <h3>Eszközök <span class="calc-hint">(min 15% - max 30% az összköltségből)</span></h3>
    <div class="calc-devices" id="calcDevices">
      ${buildDevicesHTML()}
    </div>

    <!-- Summary -->
    <div class="calc-summary" id="calcSummary"></div>
  `;
}

function buildGoalsHTML() {
  let html = '';
  for (const [id, goal] of Object.entries(GOALS)) {
    const num = parseInt(id);
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
            <thead><tr><th></th><th>Összetevő</th><th>Egységár</th><th>Mennyiség</th><th>Összeg</th></tr></thead>
            <tbody>
              ${goal.components.map((c, ci) => `
                <tr class="calc-comp-row" data-goal="${num}" data-comp="${ci}">
                  <td><input type="checkbox" class="calc-comp-check" data-goal="${num}" data-comp="${ci}" ${c.required ? 'checked disabled' : ''}></td>
                  <td>
                    <strong>${c.name}</strong> ${c.required ? '<span class="tag tag-sm tag-blue">Kötelező</span>' : '<span class="tag tag-sm tag-gray">Választható</span>'}
                    <br><small class="text-muted">${c.unit}</small>
                    ${c.bonusPoints ? `<span class="tag tag-sm tag-blue">+${c.bonusPoints.points} pont (${c.bonusPoints.type})</span>` : ''}
                  </td>
                  <td class="text-right calc-unit-price" data-goal="${num}" data-comp="${ci}">${fmt(c.netto)}</td>
                  <td>
                    ${c.once ? '<span class="text-muted">1×</span>' : `<input type="number" class="calc-qty" data-goal="${num}" data-comp="${ci}" min="0" max="${c.maxQty || 999}" value="${getDefaultQty(c)}">`}
                  </td>
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
  </table>`;
}

function getDefaultQty(comp) {
  if (comp.perPerson) return 5;
  if (comp.perHour) return 10;
  if (comp.perDevice) return 5;
  return 1;
}

// --- Bind Events ---
function bindCalculatorEvents() {
  // Month slider
  const monthSlider = document.getElementById('calcMonths');
  monthSlider.addEventListener('input', () => {
    calcState.months = parseInt(monthSlider.value);
    document.getElementById('calcMonthsVal').textContent = calcState.months + ' hó';
    recalculate();
  });

  // Headcount
  document.getElementById('calcHeadcount').addEventListener('input', (e) => {
    calcState.headcount = parseInt(e.target.value) || 1;
    recalculate();
  });

  // Users
  document.getElementById('calcUsers').addEventListener('input', (e) => {
    calcState.users = parseInt(e.target.value) || 1;
    recalculate();
  });

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

  // Component checkboxes & quantities
  document.querySelectorAll('.calc-comp-check').forEach(cb => {
    cb.addEventListener('change', () => recalculate());
  });
  document.querySelectorAll('.calc-qty').forEach(input => {
    input.addEventListener('input', () => recalculate());
  });
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
      const totalEl = document.querySelector(`.calc-comp-total[data-goal="${num}"][data-comp="${ci}"]`);

      if (!compCheck || !compCheck.checked) {
        if (totalEl) totalEl.textContent = '0 Ft';
        return;
      }

      const unitPrice = mode === 'netto' ? comp.netto : comp.brutto;
      let qty = 1;

      if (comp.once) {
        qty = 1;
      } else if (qtyInput) {
        qty = parseInt(qtyInput.value) || 0;
      }

      let multiplier = 1;
      if (comp.perMonth && comp.perUser) multiplier = months * users;
      else if (comp.perMonth && comp.perDevice) multiplier = months;
      else if (comp.perMonth) multiplier = months;
      else if (comp.perUser) multiplier = users;

      const compTotal = comp.once ? unitPrice : unitPrice * qty * multiplier;

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

  // Totals
  const totalCost = goalsTotal + devicesTotal;
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

  // Render warnings
  const warningsEl = document.getElementById('calcWarnings');
  warningsEl.innerHTML = warnings.map(w =>
    `<div class="calc-warn calc-warn-${w.type}">${w.type === 'ok' ? '✅' : w.type === 'warn' ? '⚠️' : '❌'} ${w.text}</div>`
  ).join('');

  // Render summary
  const summaryEl = document.getElementById('calcSummary');
  const hasErrors = warnings.some(w => w.type === 'error');
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
      ${bonusPoints > 0 ? `<div class="calc-summary-row calc-summary-bonus">
        <span>Értékelési többletpontok</span>
        <span class="calc-summary-val">+${bonusPoints} pont</span>
      </div>` : ''}
    </div>
  `;
}

// --- Helpers ---
function fmt(n) {
  return Math.round(n).toLocaleString('hu-HU') + ' Ft';
}
