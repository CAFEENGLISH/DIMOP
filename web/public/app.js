/* === DIMOP Tudásbázis Frontend === */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// --- State ---
let chatHistory = [];
let chatOpen = false;
let streaming = false;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadKnowledge();
  await loadDocs();
  initNav();
  initChat();
  initMobileMenu();
});

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || streaming) return;
    input.value = '';
    sendMessage(text);
  });

  // Quick questions
  $$('.quick-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      sendMessage(q);
      // Remove quick questions after first use
      const qqs = $('.quick-questions');
      if (qqs) qqs.remove();
    });
  });
}

async function sendMessage(text) {
  const messages = $('#chatMessages');
  const input = $('#chatInput');
  const sendBtn = $('#chatSend');

  // Add user message
  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.classList.add('chat-msg', 'assistant');
  typingEl.innerHTML = '<div class="chat-msg-content"><div class="chat-typing"><span></span><span></span><span></span></div></div>';
  messages.appendChild(typingEl);
  messages.scrollTop = messages.scrollHeight;

  streaming = true;
  sendBtn.disabled = true;
  input.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Szerverhiba');
    }

    // Remove typing indicator
    typingEl.remove();

    // Create assistant message element
    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-msg', 'assistant');
    const contentEl = document.createElement('div');
    contentEl.classList.add('chat-msg-content');
    msgEl.appendChild(contentEl);
    messages.appendChild(msgEl);

    // Stream response
    let fullText = '';
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
    typingEl.remove();
    appendMessage('assistant', `*Hiba: ${err.message}*`);
  } finally {
    streaming = false;
    sendBtn.disabled = false;
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
