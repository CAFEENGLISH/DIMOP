// Szép, az oldal stílusához illő "hamarosan" értesítés (toast) a C oldal fejléc gombjához.
(function () {
  const CSS = `
  .cs-toast-wrap { position: fixed; top: 88px; left: 50%; transform: translateX(-50%) translateY(-16px);
    z-index: 2000; opacity: 0; transition: opacity .25s ease, transform .25s ease; pointer-events: none;
    width: min(460px, calc(100vw - 32px)); }
  .cs-toast-wrap.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
  .cs-toast { display: flex; gap: 12px; align-items: flex-start; background: #fff; color: #212529;
    border-left: 4px solid #003399; border-radius: 10px; padding: 14px 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,.18); font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
  .cs-toast-icon { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%;
    background: #e8eef8; color: #003399; display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; }
  .cs-toast-body { flex: 1; }
  .cs-toast-title { font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #001a4d; }
  .cs-toast-msg { font-size: 13px; line-height: 1.5; color: #495057; }
  .cs-toast-close { flex: 0 0 auto; background: none; border: none; color: #868e96; font-size: 20px;
    line-height: 1; cursor: pointer; padding: 0 2px; }
  .cs-toast-close:hover { color: #212529; }
  `;
  function ensureStyle() {
    if (document.getElementById('cs-toast-style')) return;
    const s = document.createElement('style');
    s.id = 'cs-toast-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  let hideTimer = null;
  function hide() {
    const wrap = document.getElementById('cs-toast-wrap');
    if (wrap) wrap.classList.remove('show');
  }
  window.showComingSoon = function (msg, title) {
    ensureStyle();
    let wrap = document.getElementById('cs-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'cs-toast-wrap';
      wrap.className = 'cs-toast-wrap';
      wrap.innerHTML =
        '<div class="cs-toast" role="status" aria-live="polite">' +
          '<div class="cs-toast-icon">i</div>' +
          '<div class="cs-toast-body">' +
            '<div class="cs-toast-title"></div>' +
            '<div class="cs-toast-msg"></div>' +
          '</div>' +
          '<button class="cs-toast-close" aria-label="Bezárás">&times;</button>' +
        '</div>';
      document.body.appendChild(wrap);
      wrap.querySelector('.cs-toast-close').addEventListener('click', hide);
    }
    wrap.querySelector('.cs-toast-title').textContent = title || 'Nyertes pályázatok';
    wrap.querySelector('.cs-toast-msg').textContent = msg;
    requestAnimationFrame(() => wrap.classList.add('show'));
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 6000);
  };
})();
