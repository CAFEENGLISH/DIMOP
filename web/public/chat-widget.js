/* === DIMOP AI Asszisztens — hordozható chat widget ===
   Önállóan beilleszti a saját HTML-jét és beköti az eseményeket.
   Bárhová betehető egyetlen <script src="/chat-widget.js"> sorral.
   Függőségek: marked (kötelező a válaszok rendereléséhez), pdfjsLib (opcionális, PDF csatolmányhoz).
   A /api/chat végpontra küld. */
(function () {
  'use strict';

  // Ne fusson kétszer ugyanazon az oldalon
  if (window.__dimopChatWidget) return;
  window.__dimopChatWidget = true;

  // Pályázat-választó: a <script src="/chat-widget.js" data-tender="c"> alapján
  // dönti el, melyik pályázat (B = vidéki alapértelmezett, C = budapesti) tudásbázisából
  // válaszoljon az AI. Üres érték esetén a backend a 'b' alapértelmezettet használja.
  const TENDER = (document.currentScript && document.currentScript.dataset.tender) || '';

  const CHAT_HTML = `
  <!-- Chat bubble -->
  <button class="chat-bubble" id="chatBubble" aria-label="AI Asszisztens megnyitása">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <span class="chat-badge">AI</span>
  </button>

  <!-- Chat panel -->
  <div class="chat-panel" id="chatPanel">
    <div class="chat-header">
      <div>
        <strong>DIMOP AI Asszisztens</strong>
        <small>Kérdezz bármit a pályázatról!</small>
      </div>
      <button class="chat-close" id="chatClose" aria-label="Chat bezárása">&times;</button>
    </div>
    <div class="chat-messages" id="chatMessages">
      <div class="chat-msg assistant">
        <div class="chat-msg-content">
          Szia! A DIMOP Plusz pályázati asszisztens vagyok. Kérdezz bármit a pályázattal kapcsolatban!
        </div>
      </div>
      <div class="quick-questions">
        <button class="quick-q" data-q="Ki pályázhat erre a pályázatra?">Ki pályázhat?</button>
        <button class="quick-q" data-q="Milyen dokumentumokat kell csatolni a pályázathoz?">Milyen dokumentumok kellenek?</button>
        <button class="quick-q" data-q="Hogyan történik a finanszírozás 12M Ft esetén?">Finanszírozás</button>
        <button class="quick-q" data-q="Mik a pályázat lépései időrendi sorrendben?">Lépések sorrendje</button>
      </div>
    </div>
    <form class="chat-input" id="chatForm">
      <div class="chat-attachments" id="chatAttachments"></div>
      <div class="chat-input-row">
        <button type="button" class="chat-attach-btn" id="chatAttachBtn" aria-label="Fájl csatolása" title="Kép vagy PDF csatolása">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <textarea id="chatInput" placeholder="Írd be a kérdésed..." rows="1" autocomplete="off"></textarea>
        <button type="submit" id="chatSend" aria-label="Küldés">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <input type="file" id="chatFileInput" accept="image/*,.pdf" multiple hidden>
    </form>
  </div>`;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // --- State ---
  let chatHistory = [];
  let chatOpen = false;
  let streaming = false;
  let currentAbortController = null;
  let chatAttachments = [];

  // --- Init ---
  function initChat() {
    // HTML beillesztése, ha még nincs az oldalon
    if (!$('#chatBubble')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = CHAT_HTML;
      while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    }

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
      const payload = { messages: chatHistory };
      if (TENDER) payload.tender = TENDER;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
                let errMsg = parsed.error;
                if (errMsg.includes('credit') || errMsg.includes('too low')) errMsg = 'Az AI szolgáltatás kreditje elfogyott. Kérlek értesítsd az adminisztrátort.';
                else if (errMsg.includes('overloaded') || errMsg.includes('Overloaded')) errMsg = 'Az AI szerver jelenleg túlterhelt. Kérlek próbáld újra pár másodperc múlva.';
                else if (errMsg.includes('{')) errMsg = 'Szerverhiba, próbáld újra.';
                contentEl.innerHTML = `<em style="color:var(--red)">⚠️ ${errMsg}</em>`;
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
        const m = (err.message || '').toLowerCase();
        let friendly = err.message;
        if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
          friendly = 'Nincs internetkapcsolat, vagy a szerver nem érhető el. Kérlek ellenőrizd a hálózatot és próbáld újra.';
        } else if (m.includes('credit') || m.includes('too low')) {
          friendly = 'Az AI szolgáltatás kreditje elfogyott. Kérlek értesítsd az adminisztrátort.';
        } else if (m.includes('overloaded')) {
          friendly = 'Az AI szerver jelenleg túlterhelt. Kérlek próbáld újra pár másodperc múlva.';
        }
        appendMessage('assistant', `⚠️ ${friendly}`);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }
})();
