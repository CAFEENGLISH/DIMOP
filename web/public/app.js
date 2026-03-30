/* === DIMOP Tudásbázis Frontend === */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// --- State ---
let chatHistory = [];
let chatOpen = false;
let streaming = false;
let currentAbortController = null;
let chatAttachments = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  initSteps();
  await loadKnowledge();
  await loadDocs();
  initNav();
  initChat();
  initMobileMenu();
});

// --- Interactive Steps ---
const STEPS_DATA = {
  1: {
    title: 'Regisztráció',
    html: `<strong>Regisztrálj a kkvdigital.dkf.hu oldalon</strong> - ez az alap mindenhez!<br>
    <a href="https://kkvdigital.dkf.hu/regisztracio" target="_blank">→ kkvdigital.dkf.hu/regisztracio</a><br><br>
    Email + jelszó + céges adatok (adószám, cégnév, székhely).<br>
    Email megerősítés után <strong>~24 órát kell várni</strong> az ITDR rendszer hozzáféréshez.`
  },
  2: {
    title: 'DFK igénylés',
    html: `<strong>Digitális Fejlesztési Koncepció</strong> - 12M Ft-nál <strong>KÖTELEZŐ!</strong><br><br>
    Hívd az MKIK ügyfélszolgálatot (hétköznap 9-12), töltsd ki a Kérelmi nyilatkozatot.<br>
    Egy IT szakértő díjmentesen elkészíti a céged digitális fejlesztési tervét.<br>
    <a href="https://vallalkozzdigitalisan.mkik.hu/ugyfelszolgalataink" target="_blank">→ MKIK ügyfélszolgálat</a><br>
    <em>Indítsd el MOST - időbe telik!</em>`
  },
  3: {
    title: 'Digitalizációs szintfelmérő',
    html: `<strong>26 kérdéses online kérdőív</strong> a kkvdigital.dkf.hu-n.<br><br>
    Kitöltés után <strong>2 db igazolást</strong> kapsz (digitális szint + Közösségi mutató).<br>
    Mindkettőt <strong>cégszerűen hitelesíteni</strong> kell!<br><br>
    <strong>Max. 60 nappal a benyújtás előtt</strong> töltheted ki (ne korábban!).<br>
    <a href="https://kkvdigital.dkf.hu" target="_blank">→ kkvdigital.dkf.hu</a> |
    <a href="https://kkvdigital.dkf.hu/assets/pdf/Minta_kerdoiv.pdf" target="_blank">Minta kérdőív</a>`
  },
  4: {
    title: 'Árkalkuláció készítése',
    html: `<strong>Szállító és szoftver kiválasztás</strong> az MKIK akkreditált katalógusából.<br><br>
    Belépés → Pályázati árkalkulációk → Új árkalkuláció → DIMOP Plusz-1.2.6/B-26<br>
    Szoftver részterületek + szállító kiválasztása → <strong>PDF letöltés</strong> (aláírás nélkül hiteles!)<br>
    <strong>60 napig érvényes.</strong><br>
    <a href="https://vallalkozzdigitalisan.mkik.hu/palyazati_arajanlatok.html" target="_blank">→ Árkalkuláció készítés</a>`
  },
  5: {
    title: 'Nyilatkozatok kitöltése',
    html: `<strong>KKV minősítés nyilatkozat</strong> - 5a (komplex) vagy 5b (egyszerűsített) sablon<br>
    <strong>De minimis nyilatkozat</strong> - 6. melléklet sablon, cégszerűen aláírva<br><br>
    <em>A sablonok a PÁLYÁZATI KIIRAS mappában találhatók.</em>`
  },
  6: {
    title: 'Pályázat benyújtása',
    html: `<strong>Benyújtási időszak: 2026.03.31 - 06.30</strong><br><br>
    <a href="https://www.palyazat.gov.hu" target="_blank">→ palyazat.gov.hu</a> → EPTK belépés → Online kitöltő<br>
    Csatolandó: 2 db igazolás + árkalkuláció PDF + nyilatkozatok + DFK<br>
    Hitelesítés: e-aláírás vagy <a href="https://epapir.gov.hu" target="_blank">ePapír</a><br><br>
    <strong>Az első 24 órában lezárhatják ha a keret 130%-a betelik!</strong>`
  },
  7: {
    title: 'Projekt megvalósítás',
    html: `<strong>Ha nyertél - max. 24 hónap</strong><br><br>
    90 napon belül: kapcsolatfelvétel MKIK-kal a Jelentés ütemtervéért<br>
    Fejlesztési célok megvalósítása a vállalt célok szerint<br>
    Kimeneti szintfelmérés (újra kkvdigital.dkf.hu)<br>
    Záró beszámoló benyújtása (fizikai befejezés + 60 nap)<br>
    <strong>Fenntartási kötelezettség: 3 év</strong>`
  }
};

// --- Slideshow Data ---
const SLIDES = {
  1: [
    { icon: '🔐', title: '1. Regisztráció', subtitle: 'Ez az alap mindenhez!', body: `<ul>
      <li>Menj a <a href="https://kkvdigital.dkf.hu/regisztracio" target="_blank">kkvdigital.dkf.hu/regisztracio</a> oldalra</li>
      <li>Add meg: <strong>email cím + jelszó</strong></li>
      <li>Személyes adatok: név, telefonszám</li>
      <li>Vállalkozási adatok: <strong>adószám, cégnév, székhely</strong></li>
      </ul>` },
    { icon: '📧', title: 'Email megerősítés', subtitle: 'Ellenőrizd a spam mappát is!', body: `<ul>
      <li>A regisztráció után email megerősítés szükséges</li>
      <li><strong>Ellenőrizd a spam/levélszemét mappát!</strong></li>
      </ul>
      <div class="highlight">⏳ Az ITDR rendszerbe csak <strong>~24 óra múlva</strong> tudsz belépni!<br>Utána működik az MKIK oldal is.</div>` },
  ],
  2: [
    { icon: '📋', title: '2. DFK igénylés', subtitle: 'Digitális Fejlesztési Koncepció', body: `<ul>
      <li>12M Ft-os projektnél <strong>KÖTELEZŐ!</strong></li>
      <li>Egy IT szakértő díjmentesen elkészíti a céged digitális fejlesztési tervét</li>
      <li>Az MKIK (Modern Vállalkozások Programja) keretében</li>
      </ul>
      <div class="highlight">⚡ Indítsd el MOST - időbe telik a konzultáció!</div>` },
    { icon: '📞', title: 'Hogyan igényeld?', subtitle: 'MKIK ügyfélszolgálat', body: `<ul>
      <li>Hívd a területileg illetékes <a href="https://vallalkozzdigitalisan.mkik.hu/ugyfelszolgalataink" target="_blank">MKIK ügyfélszolgálatot</a></li>
      <li>Hétköznap <strong>9:00-12:00</strong> között</li>
      <li>Töltsd ki a <strong>Kérelmi és Hozzájárulási nyilatkozat</strong> sablont</li>
      <li>A tanácsadó felveszi veled a kapcsolatot</li>
      </ul>` },
  ],
  3: [
    { icon: '📊', title: '3. Szintfelmérő', subtitle: '26 kérdéses online kérdőív', body: `<ul>
      <li>A <a href="https://kkvdigital.dkf.hu" target="_blank">kkvdigital.dkf.hu</a> oldalon</li>
      <li>Vizsgált területek: internet, technológia, szoftverek, IKT biztonság, e-kereskedelem</li>
      <li>Bármikor kiléphetsz és folytathatod</li>
      </ul>
      <div class="highlight">⚠️ <strong>Max. 60 nappal</strong> a benyújtás előtt töltheted ki!</div>` },
    { icon: '📄', title: '2 db igazolás', subtitle: 'Mindkettőt cégszerűen hitelesíteni kell!', body: `<ul>
      <li><strong>Igazolás a digitális intenzitási szintről</strong></li>
      <li><strong>Igazolás a Közösségi mutató szerinti szintről</strong></li>
      <li>Mindkettő <strong>KÖTELEZŐ</strong> melléklet a pályázathoz</li>
      <li><a href="https://kkvdigital.dkf.hu/assets/pdf/Minta_kerdoiv.pdf" target="_blank">→ Minta kérdőív</a> (előre megnézheted)</li>
      </ul>` },
  ],
  4: [
    { icon: '🛒', title: '4. Árkalkuláció', subtitle: 'Szállító és szoftver kiválasztás', body: `<ul>
      <li>Belépés: <a href="https://vallalkozzdigitalisan.mkik.hu" target="_blank">vallalkozzdigitalisan.mkik.hu</a></li>
      <li>Menü → <strong>Pályázati árkalkulációk</strong> → Új árkalkuláció</li>
      <li>Pályázat: <strong>DIMOP Plusz-1.2.6/B-26</strong></li>
      <li>Projekt adatok: időtartam, létszám, felhasználószám</li>
      </ul>` },
    { icon: '💻', title: 'Szoftver kiválasztás', subtitle: 'Akkreditált katalógusból', body: `<ul>
      <li>Szoftver részterületek kiválasztása (ERP, CRM, weboldal stb.)</li>
      <li>Akkreditált <strong>szállító/szoftver</strong> kiválasztása az adatbázisból</li>
      <li>Egy szállítótól is megvehetsz mindent!</li>
      <li>Ha a szállítód terméke nincs fent → jelezd neki, töltse fel!</li>
      </ul>` },
    { icon: '📑', title: 'PDF letöltés', subtitle: '60 napig érvényes', body: `<ul>
      <li>Véglegesítés → <strong>PDF automatikusan letöltődik</strong></li>
      <li><strong>Aláírás és bélyegző nélkül is hiteles!</strong></li>
      <li>A szállító 7 napon belül visszautasíthatja</li>
      <li>Ne készíts újat ha nem találod - a fiókból töltsd le!</li>
      </ul>
      <div class="highlight"><a href="https://vallalkozzdigitalisan.mkik.hu/dl/pdf/D126_-_arkalkulacio_keszites_-_ugyfelguide.pdf" target="_blank">📖 Részletes útmutató PDF</a></div>` },
  ],
  5: [
    { icon: '✍️', title: '5. Nyilatkozatok', subtitle: 'Kitöltendő dokumentumok', body: `<ul>
      <li><strong>KKV minősítés nyilatkozat</strong><br>5a (komplex) VAGY 5b (egyszerűsített) sablon</li>
      <li><strong>De minimis nyilatkozat</strong><br>6. melléklet sablon, cégszerűen aláírva</li>
      </ul>` },
    { icon: '📝', title: 'Melyik KKV sablon kell?', subtitle: 'Komplex vs. Egyszerűsített', body: `<ul>
      <li><strong>Komplex (5a)</strong> - ha a tulajdonos nem természetes személy, vagy más vállalkozásban is van befolyása</li>
      <li><strong>Egyszerűsített (5b)</strong> - ha a fentiek nem állnak fenn<br>(pl. EV, vagy Bt. természetes személy tulajdonosokkal)</li>
      </ul>` },
  ],
  6: [
    { icon: '🚀', title: '6. Benyújtás', subtitle: '2026.03.31 - 06.30', body: `<ul>
      <li><a href="https://www.palyazat.gov.hu" target="_blank">palyazat.gov.hu</a> → EPTK belépés</li>
      <li>Online kitöltő program kitöltése</li>
      <li>Hitelesítés: <strong>e-aláírás</strong> vagy <a href="https://epapir.gov.hu" target="_blank">ePapír</a></li>
      </ul>
      <div class="highlight">⚠️ Az <strong>első 24 órában lezárhatják</strong> ha a keret 130%-a betelik!</div>` },
    { icon: '📎', title: 'Csatolandó dokumentumok', subtitle: 'Ellenőrizd mielőtt benyújtod!', body: `<ul>
      <li>✅ 2 db digitális szint igazolás (cégszerűen hitelesítve)</li>
      <li>✅ Árkalkuláció PDF</li>
      <li>✅ KKV minősítés nyilatkozat</li>
      <li>✅ De minimis nyilatkozat</li>
      <li>✅ DFK (ha van, pdf-ben)</li>
      </ul>` },
  ],
  7: [
    { icon: '🏗️', title: '7. Megvalósítás', subtitle: 'Ha nyertél - max. 24 hónap', body: `<ul>
      <li><strong>90 napon belül</strong>: kapcsolatfelvétel MKIK-kal a Jelentés ütemtervéért</li>
      <li>Fejlesztési célok megvalósítása</li>
      <li>Szoftverek bevezetése, eszközök beszerzése</li>
      </ul>` },
    { icon: '💰', title: 'Pénzügyek', subtitle: 'Utófinanszírozás!', body: `<ul>
      <li>Előleg: max. <strong>3M Ft</strong> (25%)</li>
      <li>TE fizetsz a szállítónak előre</li>
      <li>Max. <strong>2 kifizetési kérelem</strong> (1 időközi + 1 záró)</li>
      <li>Előleggel <strong>12 hónapon belül 60%-ban</strong> el kell számolni!</li>
      </ul>` },
    { icon: '📈', title: 'Projekt zárás', subtitle: '3 év fenntartás!', body: `<ul>
      <li>Kimeneti szintfelmérés (újra kkvdigital.dkf.hu)</li>
      <li>Szakmai Jelentés elkészíttetése</li>
      <li>Záró beszámoló (fizikai befejezés + 60 nap)</li>
      <li><strong>Fenntartási kötelezettség: 3 év</strong></li>
      </ul>` },
  ],
};

// --- Slideshow Logic ---
let currentSlides = [];
let currentSlideIdx = 0;

function openSlideshow() {
  // Concatenate all slides from all steps in order
  currentSlides = [];
  for (let i = 1; i <= 7; i++) {
    if (SLIDES[i]) currentSlides.push(...SLIDES[i]);
  }
  if (!currentSlides.length) return;
  currentSlideIdx = 0;
  renderSlide();
  $('#slideshow').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSlideshow() {
  $('#slideshow').classList.remove('open');
  document.body.style.overflow = '';
}

function renderSlide() {
  const slide = currentSlides[currentSlideIdx];
  $('#slideContent').innerHTML = `
    <div class="slide-icon">${slide.icon}</div>
    <h1>${slide.title}</h1>
    <h2>${slide.subtitle}</h2>
    <div class="slide-body">${slide.body}</div>
  `;
  $('#slideCounter').textContent = `${currentSlideIdx + 1} / ${currentSlides.length}`;
  $('#slidePrev').disabled = currentSlideIdx === 0;
  $('#slideNext').disabled = currentSlideIdx === currentSlides.length - 1;
}

function initSlideshow() {
  // Single PPT button
  $('#pptBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    openSlideshow();
  });

  // Navigation
  $('#slideClose').addEventListener('click', closeSlideshow);
  $('#slidePrev').addEventListener('click', () => { if (currentSlideIdx > 0) { currentSlideIdx--; renderSlide(); } });
  $('#slideNext').addEventListener('click', () => { if (currentSlideIdx < currentSlides.length - 1) { currentSlideIdx++; renderSlide(); } });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!$('#slideshow').classList.contains('open')) return;
    if (e.key === 'Escape') closeSlideshow();
    if (e.key === 'ArrowLeft' && currentSlideIdx > 0) { currentSlideIdx--; renderSlide(); }
    if (e.key === 'ArrowRight' && currentSlideIdx < currentSlides.length - 1) { currentSlideIdx++; renderSlide(); }
  });
}

function initSteps() {
  const steps = $$('.step');
  const detail = $('#stepDetail');
  const detailInner = $('#stepDetailInner');
  let activeStep = null;

  steps.forEach(step => {
    step.addEventListener('click', () => {
      const num = parseInt(step.dataset.step);
      const data = STEPS_DATA[num];

      if (activeStep === num) {
        // Toggle off
        detail.classList.remove('open');
        step.classList.remove('active');
        activeStep = null;
        return;
      }

      // Set active
      steps.forEach(s => s.classList.remove('active'));
      step.classList.add('active');
      activeStep = num;

      detailInner.innerHTML = `<strong>${num}. ${data.title}</strong><br><br>${data.html}`;
      detail.classList.add('open');
    });
  });

  initSlideshow();
}

// --- Knowledge base ---
async function loadKnowledge() {
  try {
    // Use injected data (Netlify build) or API fallback (local dev)
    if (window.__KNOWLEDGE__) {
      renderMarkdown(window.__KNOWLEDGE__);
    } else {
      const res = await fetch('/api/knowledge');
      const { content } = await res.json();
      renderMarkdown(content);
    }
  } catch (err) {
    $('#article').innerHTML = '<p style="color:red">Hiba a tudásbázis betöltésekor.</p>';
  } finally {
    $('#loading').style.display = 'none';
  }
}

function renderMarkdown(md) {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Custom renderer for checkboxes
  const renderer = new marked.Renderer();
  renderer.listitem = function(data) {
    const text = typeof data === 'object' ? data.text : data;
    if (typeof text === 'string' && text.startsWith('<input')) {
      return `<li style="list-style:none;margin-left:-20px">${text}</li>\n`;
    }
    return `<li>${text}</li>\n`;
  };

  const html = marked.parse(md, { renderer });
  $('#article').innerHTML = html;

  // Add IDs to headings for navigation
  $$('#article h2, #article h3').forEach((el, i) => {
    const id = 'section-' + i;
    el.id = id;
  });
}

// --- Navigation ---
function initNav() {
  const headings = $$('#article h2, #article h3');
  const navList = $('#navList');
  navList.innerHTML = '';

  headings.forEach((el) => {
    const li = document.createElement('li');
    if (el.tagName === 'H3') li.classList.add('nav-h3');
    const a = document.createElement('a');
    a.href = '#' + el.id;
    a.textContent = el.textContent;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
      // Close mobile sidebar
      $('#sidebar').classList.remove('open');
      $('#overlay').classList.remove('active');
    });
    li.appendChild(a);
    navList.appendChild(li);
  });

  // Scroll spy
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        $$('.sidebar a').forEach(a => a.classList.remove('active'));
        const link = $(`.sidebar a[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px' });

  headings.forEach(h => observer.observe(h));
}

// --- Documents ---
async function loadDocs() {
  try {
    // Use injected data (Netlify build) or API fallback (local dev)
    const docs = window.__DOCS__ || await (await fetch('/api/docs')).json();
    const container = $('#docsList');
    container.innerHTML = '';

    docs.forEach(doc => {
      const a = document.createElement('a');
      a.href = doc.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.classList.add('doc-item');

      const sizeStr = doc.size > 1024 * 1024
        ? (doc.size / 1024 / 1024).toFixed(1) + ' MB'
        : Math.round(doc.size / 1024) + ' KB';

      a.innerHTML = `
        <div class="doc-icon ${doc.ext}">${doc.ext.toUpperCase()}</div>
        <span class="doc-name">${doc.name}</span>
        <span class="doc-size">${sizeStr}</span>
      `;
      container.appendChild(a);
    });
  } catch (err) {
    $('#docsList').innerHTML = '<p style="color:var(--gray-500);font-size:13px">Nem sikerült betölteni a dokumentumokat.</p>';
  }
}

// --- Mobile menu ---
function initMobileMenu() {
  $('#mobileMenuBtn').addEventListener('click', () => {
    $('#sidebar').classList.add('open');
    $('#overlay').classList.add('active');
  });
  $('#sidebarToggle').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('active');
  });
  $('#overlay').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('active');
  });
}

// --- Chat ---
function initChat() {
  const bubble = $('#chatBubble');
  const panel = $('#chatPanel');
  const close = $('#chatClose');
  const form = $('#chatForm');
  const input = $('#chatInput');
  const attachBtn = $('#chatAttachBtn');
  const fileInput = $('#chatFileInput');

  bubble.addEventListener('click', () => {
    chatOpen = !chatOpen;
    panel.classList.toggle('open', chatOpen);
    bubble.style.display = chatOpen ? 'none' : 'flex';
    if (chatOpen) input.focus();
  });

  close.addEventListener('click', () => {
    chatOpen = false;
    panel.classList.remove('open');
    bubble.style.display = 'flex';
  });

  // Textarea auto-grow
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });

  // Enter to send, Shift+Enter for newline
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // Form submit - send or stop
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (streaming) {
      if (currentAbortController) currentAbortController.abort();
      return;
    }
    const text = input.value.trim();
    if (!text && chatAttachments.length === 0) return;
    input.value = '';
    input.style.height = 'auto';
    const atts = [...chatAttachments];
    chatAttachments = [];
    renderAttachments();
    sendMessage(text, atts);
  });

  // Paste handler for images
  input.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        handleImageFile(item.getAsFile());
      }
    }
  });

  // Attach button
  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    for (const file of e.target.files) {
      if (file.type === 'application/pdf') {
        handlePdfFile(file);
      } else if (file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    }
    fileInput.value = '';
  });

  // Quick questions
  $$('.quick-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      sendMessage(q, []);
      const qqs = $('.quick-questions');
      if (qqs) qqs.remove();
    });
  });

  // Init pdf.js worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
}

// --- Attachment Handling ---
function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert('A kép túl nagy (max 5MB)!');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const [header, base64] = dataUrl.split(',');
    const mediaType = header.match(/data:(.*?);/)?.[1] || 'image/png';
    chatAttachments.push({ type: 'image', mediaType, base64, name: file.name, dataUrl });
    renderAttachments();
  };
  reader.readAsDataURL(file);
}

async function handlePdfFile(file) {
  if (typeof pdfjsLib === 'undefined') {
    alert('PDF feldolgozás nem elérhető.');
    return;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    chatAttachments.push({ type: 'pdf_text', text: text.slice(0, 50000), name: file.name });
    renderAttachments();
  } catch (err) {
    alert('PDF feldolgozási hiba: ' + err.message);
  }
}

function renderAttachments() {
  const container = $('#chatAttachments');
  container.innerHTML = '';
  chatAttachments.forEach((att, i) => {
    const el = document.createElement('div');
    el.className = 'chat-att-preview';
    if (att.type === 'image') {
      el.innerHTML = `<img src="${att.dataUrl}" alt="${escapeHtml(att.name)}"><span class="att-pdf-icon" style="display:none"></span><button class="chat-att-remove" data-idx="${i}">&times;</button>`;
    } else {
      el.innerHTML = `<span class="att-pdf-icon">📄</span><span class="chat-att-name">${escapeHtml(att.name)}</span><button class="chat-att-remove" data-idx="${i}">&times;</button>`;
    }
    container.appendChild(el);
  });
  container.querySelectorAll('.chat-att-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      chatAttachments.splice(parseInt(btn.dataset.idx), 1);
      renderAttachments();
    });
  });
}

function buildMessageContent(text, attachments) {
  if (!attachments || !attachments.length) return text || '';
  const content = [];
  for (const att of attachments) {
    if (att.type === 'image') {
      content.push({ type: 'image', source: { type: 'base64', media_type: att.mediaType, data: att.base64 } });
    }
    if (att.type === 'pdf_text') {
      content.push({ type: 'text', text: `[PDF tartalom: ${att.name}]\n${att.text}` });
    }
  }
  if (text) content.push({ type: 'text', text });
  return content;
}

// --- Stop/Send Button Helpers ---
const SEND_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
const STOP_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';

function setButtonStop(btn) {
  btn.classList.add('stop-mode');
  btn.innerHTML = STOP_SVG;
  btn.disabled = false;
  btn.setAttribute('aria-label', 'Leállítás');
}
function setButtonSend(btn) {
  btn.classList.remove('stop-mode');
  btn.innerHTML = SEND_SVG;
  btn.setAttribute('aria-label', 'Küldés');
}

// --- Send Message ---
async function sendMessage(text, attachments) {
  const messages = $('#chatMessages');
  const input = $('#chatInput');
  const sendBtn = $('#chatSend');

  // Build display text for user bubble
  let displayText = text || '';
  if (attachments && attachments.length) {
    const labels = attachments.map(a => a.type === 'image' ? `[Kép: ${a.name}]` : `[PDF: ${a.name}]`).join(' ');
    displayText = (displayText ? displayText + ' ' : '') + labels;
  }
  appendMessage('user', displayText);

  // Build content for API
  const msgContent = buildMessageContent(text, attachments);
  chatHistory.push({ role: 'user', content: msgContent });

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.classList.add('chat-msg', 'assistant');
  typingEl.innerHTML = '<div class="chat-msg-content"><div class="chat-typing"><span></span><span></span><span></span></div></div>';
  messages.appendChild(typingEl);
  messages.scrollTop = messages.scrollHeight;

  streaming = true;
  currentAbortController = new AbortController();
  setButtonStop(sendBtn);
  input.disabled = true;

  let fullText = '';
  let contentEl = null;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
      signal: currentAbortController.signal,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Szerverhiba');
    }

    typingEl.remove();

    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-msg', 'assistant');
    contentEl = document.createElement('div');
    contentEl.classList.add('chat-msg-content');
    msgEl.appendChild(contentEl);
    messages.appendChild(msgEl);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              contentEl.innerHTML = marked.parse(fullText);
              messages.scrollTop = messages.scrollHeight;
            }
            if (parsed.error) {
              contentEl.innerHTML = `<em style="color:var(--red)">Hiba: ${parsed.error}</em>`;
            }
          } catch {}
        }
      }
    }

    chatHistory.push({ role: 'assistant', content: fullText });

  } catch (err) {
    if (typingEl.parentNode) typingEl.remove();
    if (err.name === 'AbortError') {
      // Keep partial response
      if (fullText) {
        chatHistory.push({ role: 'assistant', content: fullText });
        if (contentEl) {
          contentEl.innerHTML = marked.parse(fullText + '\n\n*— leállítva —*');
        }
      }
    } else {
      appendMessage('assistant', `*Hiba: ${err.message}*`);
    }
  } finally {
    streaming = false;
    currentAbortController = null;
    setButtonSend(sendBtn);
    input.disabled = false;
    input.focus();
  }
}

function appendMessage(role, text) {
  const messages = $('#chatMessages');
  const msgEl = document.createElement('div');
  msgEl.classList.add('chat-msg', role);
  const contentEl = document.createElement('div');
  contentEl.classList.add('chat-msg-content');
  contentEl.innerHTML = role === 'user' ? escapeHtml(text) : marked.parse(text);
  msgEl.appendChild(contentEl);
  messages.appendChild(msgEl);
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
