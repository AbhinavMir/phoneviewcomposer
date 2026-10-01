// phoneviewcomposer: a movable phone next to the Gmail compose window that shows what the recipient sees.
// It starts on the recipient's inbox; tap the message to open it and the back arrow to return.
// The red dot closes the phone; the phone button that replaces it opens it again.
(() => {
  if (window.__pvc) return;
  window.__pvc = true;

  const PHONE = { w: 393, h: 852 }; // iPhone 16 screen in CSS px
  const BEZEL = 12;
  const HANDLE = 22; // drag bar above the phone that holds the close dot
  const GAP = 16;

  // Gmail enforces Trusted Types, so every innerHTML write goes through this policy.
  const tt = window.trustedTypes ? trustedTypes.createPolicy('phoneviewcomposer', { createHTML: (s) => s }) : null;
  const html = (s) => (tt ? tt.createHTML(s) : s);

  const host = document.createElement('div');
  host.id = 'pvc-host';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = html(`
<style>
  :host { all: initial; }
  .wrap { position: fixed; z-index: 2147483000; display: none; font: 14px/1.4 -apple-system, "SF Pro Text", Helvetica, sans-serif; color: #1f1f1f; }
  .wrap.show { display: block; }
  .open { position: fixed; z-index: 2147483000; display: none; width: 40px; height: 40px; border-radius: 50%; border: 0; background: #111; color: #fff; font-size: 18px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.3); }
  .open.show { display: block; }
  .handle { height: ${HANDLE}px; display: flex; align-items: center; cursor: grab; }
  .handle:active { cursor: grabbing; }
  .close { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; border: .5px solid #e0443e; margin-left: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: transparent; font: 700 9px/1 sans-serif; }
  .close:hover { color: #4d0000; }
  .frame { width: max-content; background: #111; padding: ${BEZEL}px; border-radius: 66px; box-shadow: 0 12px 40px rgba(0,0,0,.35); transform-origin: top left; cursor: grab; }
  .screen { position: relative; overflow: hidden; background: #fff; display: flex; flex-direction: column; width: ${PHONE.w}px; height: ${PHONE.h}px; border-radius: 54px; cursor: default; }
  .island { position: absolute; top: 11px; left: 50%; transform: translateX(-50%); width: 124px; height: 36px; background: #000; border-radius: 20px; z-index: 3; }
  .status { height: 54px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 30px 0 44px; font-weight: 600; font-size: 16px; cursor: grab; }
  .status svg { width: 68px; height: 12px; }
  .scroll { flex: 1; overflow-y: auto; overflow-x: hidden; }
  .scroll::-webkit-scrollbar { display: none; }
  .home { height: 26px; flex: none; display: flex; align-items: center; justify-content: center; }
  .home div { width: 134px; height: 5px; border-radius: 3px; background: #111; }
  .tap { cursor: pointer; }
  .row.tap:hover { background: #f2f6fc; }
  .ic { width: 24px; height: 24px; fill: #444746; display: block; }
  .tb { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
  .tb .r { display: flex; gap: 18px; padding-right: 8px; }
  .subj { font-size: 22px; line-height: 28px; padding: 4px 16px 0; word-wrap: break-word; }
  .chip { display: inline-block; font-size: 12px; line-height: 16px; background: #e8eaed; border-radius: 4px; padding: 1px 6px; vertical-align: 3px; margin-left: 6px; }
  .sender { display: flex; align-items: flex-start; gap: 12px; padding: 16px; }
  .av { width: 40px; height: 40px; border-radius: 50%; background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; flex: none; }
  .who { flex: 1; min-width: 0; }
  .who .n { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who .n span { font-weight: 400; color: #5f6368; font-size: 13px; margin-left: 6px; }
  .who .to { color: #5f6368; font-size: 13px; }
  .body { padding: 0 16px 16px; font-size: 14px; line-height: 1.45; word-wrap: break-word; overflow-x: auto; }
  .body img { max-width: 100%; height: auto; }
  .body a { color: #0b57d0; }
  .body .gmail_quote { display: none; }
  .dots { display: inline-block; background: #e8eaed; border-radius: 8px; padding: 0 8px; color: #5f6368; margin-top: 8px; }
  .acts { display: flex; gap: 8px; padding: 8px 16px 24px; }
  .acts div { flex: 1; border: 1px solid #c4c7c5; border-radius: 20px; text-align: center; padding: 9px 0; font-size: 14px; color: #444746; }
  .search { margin: 4px 16px 8px; background: #e9eef6; border-radius: 28px; height: 48px; display: flex; align-items: center; padding: 0 16px; color: #444746; font-size: 16px; gap: 14px; }
  .label { font-size: 12px; color: #444746; padding: 12px 16px 4px; }
  .row { display: flex; gap: 12px; padding: 10px 16px; }
  .row .top { display: flex; justify-content: space-between; gap: 8px; }
  .row .top b { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .top span { font-size: 12px; font-weight: 700; flex: none; }
  .row .s { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .p { color: #444746; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row.dim .av { background: #c4c7c5; }
  .row.dim .ph { height: 10px; background: #eef0f2; border-radius: 5px; margin: 5px 0; }
  .empty { color: #9aa0a6; }
</style>
<div class="wrap">
  <div class="handle"><div class="close" title="Close">×</div></div>
  <div class="slot"><div class="frame"><div class="screen"></div></div></div>
</div>
<button class="open" title="Show phone preview">📱</button>`);

  const $ = (s) => root.querySelector(s);
  const wrap = $('.wrap');
  const slot = $('.slot');
  const frame = $('.frame');
  const screen = $('.screen');
  const openBtn = $('.open');

  const pref = (k, v) => {
    try {
      if (v === undefined) return localStorage.getItem('pvc.' + k);
      localStorage.setItem('pvc.' + k, v);
    } catch (e) {}
  };

  const state = {
    view: 'inbox',
    closed: pref('closed') === '1',
    pos: null, // set once the user drags the phone; otherwise it sits left of the compose
  };

  $('.close').onclick = (e) => { e.stopPropagation(); state.closed = true; pref('closed', '1'); render(); };
  openBtn.onclick = () => { state.closed = false; pref('closed', '0'); last = ''; render(); };
  // Tap the inbox row to open the message; tap the back arrow to return, as on a real phone.
  screen.onclick = (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    state.view = go.dataset.go;
    last = '';
    render();
  };

  // Drag by the bar above the phone, the bezel, or the status bar.
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.close')) return;
    if (!(e.target.closest('.handle') || e.target === frame || e.target.closest('.status'))) return;
    e.preventDefault();
    const start = wrap.getBoundingClientRect();
    const dx = e.clientX - start.left;
    const dy = e.clientY - start.top;
    const move = (ev) => {
      state.pos = { x: ev.clientX - dx, y: ev.clientY - dy };
      place();
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  });

  const ICONS = {
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    archive: 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    reply: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  };
  const icon = (n) => `<svg class="ic" viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;
  const STATUS_ICONS = `<svg viewBox="0 0 68 12"><g fill="#000"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><path d="M31.5 12 L24 4.2 A11 11 0 0 1 39 4.2 Z"/><rect x="45.5" y=".5" width="19" height="11" rx="3" fill="none" stroke="#000" stroke-opacity=".4"/><rect x="47.5" y="2.5" width="15" height="7" rx="1.5"/><rect x="65.5" y="4" width="1.5" height="4" rx=".7" fill-opacity=".4"/></g></svg>`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // The compose whose body has focus most recently wins; otherwise the last open one on the page.
  let active = null;
  document.addEventListener('focusin', (e) => {
    const b = e.target.closest && e.target.closest('div[contenteditable="true"][g_editable="true"]');
    if (b) active = b;
  }, true);

  function composeOf(body) {
    let el = body;
    while (el && !el.querySelector('input[name="subjectbox"]')) el = el.parentElement;
    return el;
  }

  // Label is "Google Account: Name  (email)" or, on some accounts, "Google Account: email, <status>".
  function account() {
    const btn = document.querySelector('a[aria-label^="Google Account"]');
    if (!btn) return { name: '', email: '' };
    const label = btn.getAttribute('aria-label').replace(/^Google Account:\s*/, '');
    const email = (label.match(/[^\s,()]+@[^\s,()]+/) || [''])[0];
    const name = (label.match(/^([^(,@]+?)\s*\(/) || ['', ''])[1];
    return { name, email };
  }

  function read() {
    const bodies = [...document.querySelectorAll('div[contenteditable="true"][g_editable="true"]')].filter((b) => b.getClientRects().length);
    if (!bodies.length) return null;
    const body = bodies.includes(active) ? active : bodies[bodies.length - 1];
    const c = composeOf(body);
    if (!c) return null;
    const subject = c.querySelector('input[name="subjectbox"]').value;
    // Each recipient chip nests several elements with the same address, so count unique addresses.
    const to = [...c.querySelectorAll('[data-hovercard-id]')].map((e) => e.getAttribute('data-hovercard-id'));
    const typed = [...c.querySelectorAll('input[aria-label="To recipients"]')].map((i) => i.value.trim()).filter(Boolean);
    return {
      dialog: body.closest('[role="dialog"]') || c,
      data: { subject, to: [...new Set([...to, ...typed])], html: body.innerHTML, text: body.innerText, me: account() },
    };
  }

  function time() {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
  }

  function messageView(m) {
    const who = m.me.name || m.me.email;
    const quoted = /gmail_quote/.test(m.html) ? '<div class="dots">•••</div>' : '';
    const others = m.to.length > 1 ? ` and ${m.to.length - 1} other${m.to.length > 2 ? 's' : ''}` : '';
    return `
      <div class="tb"><span class="tap" data-go="inbox">${icon('back')}</span><div class="r">${icon('archive')}${icon('trash')}${icon('mail')}${icon('more')}</div></div>
      <div class="subj">${m.subject ? esc(m.subject) : '<span class="empty">(no subject)</span>'}<span class="chip">Inbox</span></div>
      <div class="sender">
        <div class="av">${esc((who[0] || '?').toUpperCase())}</div>
        <div class="who"><div class="n">${esc(who)}<span>${time()}</span></div><div class="to">to me${others} ▾</div></div>
        ${icon('reply')}${icon('more')}
      </div>
      <div class="body">${m.html}${quoted}</div>
      <div class="acts"><div>↩ Reply</div><div>↩↩ Reply all</div><div>↪ Forward</div></div>`;
  }

  function inboxView(m) {
    const who = m.me.name || m.me.email;
    const preview = m.text.replace(/\s+/g, ' ').trim();
    const filler = '<div class="row dim"><div class="av"></div><div class="who"><div class="ph" style="width:40%"></div><div class="ph" style="width:80%"></div><div class="ph" style="width:95%"></div></div></div>';
    return `
      <div class="search">${icon('menu')}<span>Search in mail</span></div>
      <div class="label">Primary</div>
      <div class="row tap" data-go="message">
        <div class="av">${esc((who[0] || '?').toUpperCase())}</div>
        <div class="who">
          <div class="top"><b>${esc(who)}</b><span>${time()}</span></div>
          <div class="s">${m.subject ? esc(m.subject) : '(no subject)'}</div>
          <div class="p">${preview ? esc(preview) : '<span class="empty">(no message)</span>'}</div>
        </div>
      </div>
      ${filler.repeat(6)}`;
  }

  // Scale the phone to fit the window height, then place it: where the user dragged it,
  // or else just left of the compose window with the bottoms lined up.
  // The reopen button sits just left of the compose window, at its bottom.
  let dialog = null;
  function place() {
    const scale = Math.min(0.85, (innerHeight - HANDLE - 2 * GAP) / (PHONE.h + 2 * BEZEL));
    const w = (PHONE.w + 2 * BEZEL) * scale;
    const h = (PHONE.h + 2 * BEZEL) * scale + HANDLE;
    frame.style.transform = `scale(${scale})`;
    slot.style.width = w + 'px';
    slot.style.height = h - HANDLE + 'px';
    const r = dialog.getBoundingClientRect();
    let x, y;
    if (state.pos) {
      ({ x, y } = state.pos);
    } else {
      x = r.left - w - GAP;
      y = innerHeight - h - GAP;
    }
    x = Math.max(0, Math.min(innerWidth - w, x));
    y = Math.max(0, Math.min(innerHeight - h, y));
    wrap.style.left = x + 'px';
    wrap.style.top = y + 'px';
    openBtn.style.left = Math.max(0, r.left - 40 - GAP) + 'px';
    openBtn.style.top = innerHeight - 40 - GAP + 'px';
  }

  let last = '';
  function render() {
    const r = read();
    wrap.classList.toggle('show', !!r && !state.closed);
    openBtn.classList.toggle('show', !!r && state.closed);
    if (!r) { last = ''; return; }

    dialog = r.dialog;
    place();
    if (state.closed) { last = ''; return; }
    const key = JSON.stringify([r.data, state.view]);
    if (key === last) return;
    last = key;

    // Keep the scroll position while typing, reset it when the view changes.
    const sc = screen.querySelector('.scroll');
    const top = sc && sc.dataset.view === state.view ? sc.scrollTop : 0;
    screen.innerHTML = html(`
      <div class="island"></div>
      <div class="status"><span>${time()}</span>${STATUS_ICONS}</div>
      <div class="scroll" data-view="${state.view}">${state.view === 'inbox' ? inboxView(r.data) : messageView(r.data)}</div>
      <div class="home"><div></div></div>`);
    screen.querySelector('.scroll').scrollTop = top;
  }

  document.documentElement.appendChild(host);
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; setTimeout(() => { queued = false; render(); }, 30); } };
  // style: Gmail only changes inline styles when a compose is expanded, minimized or moved.
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-hovercard-id', 'style'] });
  document.addEventListener('input', schedule, true);
  addEventListener('resize', schedule);
  render();
})();
