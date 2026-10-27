// Rareness app: one page, three tabs (Agenda, Cloud, Chats) and a profile page behind the corner button, plus the sign-in,
// onboarding and payment screens in the gate layer above them.
import * as API from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => Array.from(String(s || '')).slice(0, n).join('');
const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

// The six reasons two people match. Their colours appear only on the bubbles.
const DIMS = [
  { key: 'values', label: 'Values', c: '#F5A6D8', d: 'What matters most to you' },
  { key: 'lifestyle', label: 'Lifestyle', c: '#FFF3A6', d: 'Weekends, home, going out' },
  { key: 'interests', label: 'Interests', c: '#9FE5B5', d: 'Hobbies, music, films' },
  { key: 'personality', label: 'Personality', c: '#B89CFF', d: 'Humour, energy, temperament' },
  { key: 'goals', label: 'Goals', c: '#8FE8E3', d: 'What you are looking for' },
  { key: 'routine', label: 'Routine', c: '#6FB7FF', d: 'Daily habits and streaks' }
];
const dimIndex = (k) => DIMS.findIndex((d) => d.key === k);
const dimsToW = (o) => DIMS.map((d) => Math.max(0, Number(o?.[d.key]) || 0));

const sv = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>',
  back: sv('<path d="M15 5l-7 7 7 7"></path>'),
  q: sv('<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2V15"></path><circle cx="12" cy="18.5" r=".5"></circle><circle cx="12" cy="12" r="9.5"></circle>'),
  t: sv('<path d="M7 4L3 8l4 4M3 8h13M17 12l4 4-4 4M21 16H8"></path>'),
  m: sv('<circle cx="13.5" cy="4.5" r="1.8"></circle><path d="M8 21l3-6 3 2v5M6 11l3-3 4 1 2 3 3 1M11 15l-1-4"></path>'),
  bump: sv('<circle cx="8.5" cy="12" r="5"></circle><circle cx="16.5" cy="12" r="4"></circle>'),
  cam: sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"></path>'),
  more: sv('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>'),
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>',
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>'),
  pin: sv('<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"></path><circle cx="12" cy="9" r="2.5"></circle>'),
  work: sv('<rect x="3.5" y="7" width="17" height="12" rx="1"></rect><path d="M9 7V5h6v2"></path>'),
  ruler: sv('<path d="M12 3v18M8 6h4M9 10h3M8 14h4M9 18h3"></path>'),
  lang: sv('<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"></path>')
};
const SIL = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="36" r="17" fill="rgba(17,17,20,.16)"></circle><path d="M14 100C14 70 32 58 50 58s36 12 36 42z" fill="rgba(17,17,20,.16)"></path></svg>';

// ---------------- Daily exercises (the same for everyone on a given day) ----------------
const QUESTIONS = [
  ['What made you laugh this week?', 'personality'], ['What would you never compromise on?', 'values'], ['What’s your most unpopular opinion?', 'personality'],
  ['What does a good weekend look like to you?', 'lifestyle'], ['What’s a small thing that makes your day?', 'personality'], ['What are you most proud of this year?', 'values'],
  ['Describe your energy on a Sunday morning.', 'routine'], ['What does home mean to you?', 'values'], ['What do friends always tease you about?', 'personality'],
  ['What are you looking for right now?', 'goals'], ['Who do you admire most, and why?', 'values'], ['What’s your idea of a perfect first date?', 'goals'],
  ['What did you learn recently that surprised you?', 'interests'], ['Which place feels most like you?', 'lifestyle'], ['What would your perfect day include?', 'lifestyle']
];
const PAIRS = [
  ['Mountains', 'Sea', 'lifestyle'], ['Night out', 'Night in', 'lifestyle'], ['Books', 'Films', 'interests'], ['Cook', 'Order in', 'lifestyle'], ['Concert', 'Museum', 'interests'],
  ['Plan it all', 'Go with the flow', 'personality'], ['Dogs', 'Cats', 'interests'], ['Early bird', 'Night owl', 'routine'], ['Big city', 'Small town', 'lifestyle'],
  ['Podcast', 'Playlist', 'interests'], ['Talk it out', 'Sleep on it', 'personality'], ['Gym', 'Outdoors', 'routine'], ['Settle down', 'Explore', 'goals'], ['Text', 'Call', 'personality'],
  ['Brunch', 'Dinner', 'lifestyle'], ['Spontaneous trip', 'Planned holiday', 'personality'], ['Kids someday', 'Not for me', 'goals'], ['Sunrise', 'Sunset', 'routine']
];
const INTERESTS = ['Art', 'Books', 'Chess', 'Cinema', 'Coffee', 'Cooking', 'Dancing', 'Design', 'Fashion', 'Gaming', 'Hiking', 'Jazz', 'Live music', 'Photography', 'Plants', 'Running', 'Swimming', 'Travel', 'Wine', 'Yoga'];

// ---------------- App state ----------------
let uid = null, me = null, myAnswers = [], people = [], chatList = [], config = { paywall: false };
const today = () => API.dayKey();
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const ageOf = (b) => (b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null);
const nameAge = (p) => (p.name || 'Someone') + (p.age ? ', ' + p.age : '');
function rec(k = today()) {
  const r = { q: false, t: false, m: false };
  for (const a of myAnswers) if (a.day === k && r[a.kind] === false) r[a.kind] = a;
  return r;
}
const isDone = (k) => { const r = rec(k); return !!(r.q && r.t && r.m); };
const todayDone = () => isDone(today());
function streak() {
  const d = new Date(); let n = 0;
  if (!isDone(API.dayKey(d))) d.setDate(d.getDate() - 1);
  while (isDone(API.dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function bestStreak() {
  const days = [...new Set(myAnswers.filter((a) => a.kind !== 'signup').map((a) => a.day))].filter(isDone).sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const d = new Date(k + 'T12:00');
    run = prev && (d - prev) / 86400000 < 1.5 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return best;
}
const totalDone = () => myAnswers.filter((a) => a.kind !== 'signup').length;

// ---------------- Bubbles ----------------
function ringGrad(w) {
  // One soft arc per reason, sized by how much it counts; fixed in place
  const tot = w.reduce((a, b) => a + b, 0) || 1;
  let a = 0, first = null; const stops = [];
  w.forEach((x, i) => {
    if (!x) return;
    const span = x / tot * 360;
    if (!first) first = DIMS[i].c;
    stops.push(DIMS[i].c + ' ' + (a + span * .5).toFixed(1) + 'deg');
    a += span;
  });
  if (!first) return 'conic-gradient(#e6e6ea,#e6e6ea)';
  return 'conic-gradient(from -30deg, ' + first + ' 0deg, ' + stops.join(', ') + ', ' + first + ' 360deg)';
}
function bubbleHTML(o, size) {
  const inner = o.photo ? '<img src="' + esc(o.photo) + '" alt="">' : (o.you ? '<span class="b-you" style="font-size:' + Math.round(size * .24) + 'px">' + esc(o.initial || 'you') + '</span>' : (o.plain ? '' : SIL));
  return '<div class="bubble" style="width:' + size + 'px;height:' + size + 'px">' +
    (o.clear ? '<span class="b-body"></span>' : '<span class="b-photo" style="background:' + (o.bg || 'linear-gradient(160deg,#f4f4f5,#d9d9dd)') + '">' + inner + '</span>') +
    '<span class="b-glass"></span><span class="b-rim" style="background:' + ringGrad(o.w) + '"></span>' +
    '<span class="b-line"></span><span class="b-line2"></span><span class="b-top"></span>' +
    '<span class="b-hl"></span><span class="b-hr"></span><span class="b-hr2"></span><span class="b-cau"></span></div>';
}
const oneHot = (i) => DIMS.map((_, j) => (j === i ? 1 : 0));
const swatch = (i, size = 24) => bubbleHTML({ w: oneHot(i), plain: true }, size);
const youObj = () => ({ you: true, w: dimsToW(me?.aura), photo: API.photoUrl(me?.photo_path), initial: me?.name ? Array.from(me.name)[0].toUpperCase() : 'you' });
const noteHTML = (text) => '<div class="note"><div class="nb">' + esc(text) + '</div><i></i><i></i></div>';
const glassBar = (pct, i) => '<div class="gbar"><span style="width:' + Math.round(pct) + '%;--c:' + DIMS[i].c + '"></span></div>';

// ---------------- Toast ----------------
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800);
}
const fail = (e) => { console.error(e); toast(e?.message && e.message.length < 120 ? e.message : 'That didn’t work. Check your connection and try again.'); };


// ---------------- Tabs: screens slide, the glass lens slides between icons ----------------
// Tab order: Agenda, Tasks, Cloud, Chats, Profile
// Tab order: Agenda, Cloud, Chats. Your profile opens from the button in the top-right corner.
const views = ['#v0', '#v2', '#v3'].map((id) => $(id));
let cur = 0;
const pages = [];
let lensX = 0;
function setLens(i, animate) {
  const lens = $('#lens'), x = i * 60;
  if (animate && !reduced && lens.animate) {
    let from = lensX;
    try { from = new DOMMatrixReadOnly(getComputedStyle(lens).transform).m41; } catch (e) {}
    lens.getAnimations().forEach((a) => a.cancel());
    const dir = x > from ? 1 : -1;
    lens.animate([
      { transform: 'translate3d(' + from + 'px,0,0) scale(1,1)' },
      { transform: 'translate3d(' + (from + (x - from) * .55) + 'px,0,0) scale(1.3,.86)', offset: .4 },
      { transform: 'translate3d(' + (x + dir * 3) + 'px,0,0) scale(.95,1.05)', offset: .78 },
      { transform: 'translate3d(' + x + 'px,0,0) scale(1,1)' }
    ], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
  }
  lens.style.transform = 'translate3d(' + x + 'px,0,0)'; lensX = x;
  document.querySelectorAll('.tab').forEach((b) => { const on = +b.dataset.tab === i; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}
// Screens slide with the Web Animations API; a new tap finishes the running slide instead of being ignored
let slides = [];
function goTab(i, after) {
  if (i === cur) { if (after) after(); return; }
  slides.forEach((a) => a.finish()); slides = [];
  const prev = cur, from = views[prev], to = views[i], dir = i > prev ? 1 : -1;
  onEnter(i);
  cur = i;
  views.forEach((v, k) => { if (k !== i && k !== prev) v.hidden = true; });
  to.hidden = false; from.hidden = false;
  setLens(i, true); syncMeBtn();
  if (reduced || !to.animate) { from.hidden = true; if (after) after(); return; }
  const opt = { duration: 520, easing: 'cubic-bezier(.32,.72,0,1)' };
  const aIn = to.animate([{ transform: 'translate3d(' + dir * 100 + '%,0,0)' }, { transform: 'translate3d(0,0,0)' }], opt);
  const aOut = from.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + -dir * 100 + '%,0,0)' }], opt);
  slides = [aIn, aOut];
  aOut.onfinish = () => { if (cur !== prev) from.hidden = true; };
  aIn.onfinish = () => { slides = slides.filter((a) => a !== aIn && a !== aOut); if (after) after(); };
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => goTab(+b.dataset.tab)));

function updateLocks() {
  const locked = !todayDone();
  document.querySelectorAll('.tab[data-tab="1"],.tab[data-tab="2"]').forEach((b) => b.classList.toggle('locked', locked));
  [['#cloudLock', 'Cloud'], ['#chatsLock', 'chats']].forEach(([sel, what]) => {
    const el = $(sel); el.hidden = !locked;
    if (locked) {
      const r = rec(), n = (r.q ? 1 : 0) + (r.t ? 1 : 0) + (r.m ? 1 : 0);
      el.innerHTML = '<div class="lock-card"><span style="width:24px;height:24px;display:block">' + ICON.lock + '</span><h2 class="h2">Your ' + what + ' open after today’s exercises</h2>' +
        '<p class="muted" style="margin:0;font-size:14.5px;line-height:1.45">' + n + ' of 3 done. Each one takes a few minutes and tunes who floats close to you.</p>' +
        '<button class="primary" data-go="0">Go to Agenda</button></div>';
      el.querySelector('[data-go]').onclick = () => goTab(0);
    }
  });
}
document.querySelectorAll('.scroll[data-nav]').forEach((sc) => {
  const nb = document.getElementById(sc.dataset.nav);
  sc.addEventListener('scroll', () => { nb.classList.toggle('on', sc.scrollTop > 60); syncMeBtn(); }, { passive: true });
});
// The profile button tucks into the compact title bar once a page is scrolled
function syncMeBtn() {
  const nb = views[cur] && views[cur].querySelector('.navbar');
  $('#meBtn').classList.toggle('compact', Boolean(nb && nb.classList.contains('on')));
}


// ---------------- Swipe between tabs (phones): drag a screen sideways, or slide a finger along the tab bar ----------------
const appEl = $('#app'), lensEl = $('#lens');
function swipeable(view, edgeOnly) {
  let sx = 0, sy = 0, t0 = 0, mode = 'no', dx = 0, target = -1;
  const W = () => appEl.clientWidth;
  const place = () => {
    const w = W(), dir = dx < 0 ? 1 : -1, want = cur + dir;
    const ok = want >= 0 && want < views.length;
    if (target !== -1 && target !== want) { views[target].hidden = true; views[target].style.transform = ''; target = -1; }
    if (ok && target === -1) { target = want; onEnter(target); views[target].hidden = false; }
    const x = ok ? dx : dx / 3; // rubber band past the first and last tab
    view.style.transform = 'translate3d(' + x + 'px,0,0)';
    if (target !== -1) views[target].style.transform = 'translate3d(' + (dir * w + x) + 'px,0,0)';
    lensEl.style.transform = 'translate3d(' + Math.max(0, Math.min((views.length - 1) * 60, cur * 60 - x / w * 60)) + 'px,0,0)';
  };
  view.addEventListener('touchstart', (e) => {
    mode = 'no';
    if (pages.length || e.touches.length > 1 || view !== views[cur] || $('#sheet').classList.contains('on')) return;
    const tt = e.touches[0], r = appEl.getBoundingClientRect();
    if (edgeOnly && tt.clientX - r.left > 30 && r.right - tt.clientX > 30) return;
    if (edgeOnly) e.stopPropagation(); // keep the Cloud from panning during an edge swipe
    slides.forEach((a) => a.finish()); slides = [];
    sx = tt.clientX; sy = tt.clientY; t0 = performance.now(); dx = 0; target = -1; mode = 'wait';
  }, { passive: true, capture: true });
  view.addEventListener('touchmove', (e) => {
    if (mode === 'no') return;
    if (edgeOnly) e.stopPropagation();
    const tt = e.touches[0], ddx = tt.clientX - sx, ddy = tt.clientY - sy;
    if (mode === 'wait') {
      if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.2) mode = 'h';
      else if (Math.abs(ddy) > 10) { mode = 'no'; return; }
      else return;
    }
    e.preventDefault();
    dx = ddx; place();
  }, { passive: false, capture: true });
  const end = () => {
    if (mode !== 'h') { mode = 'no'; return; }
    mode = 'no';
    const w = W(), v = dx / Math.max(1, performance.now() - t0);
    const commit = target !== -1 && (Math.abs(dx) > w * .28 || Math.abs(v) > .45);
    const dir = dx < 0 ? 1 : -1, opt = { duration: 380, easing: 'cubic-bezier(.25,.8,.25,1)' };
    const fromX = target !== -1 ? dx : dx / 3, cv = view, tv = target !== -1 ? views[target] : null, ti = target;
    cv.style.transform = ''; if (tv) tv.style.transform = '';
    if (commit) {
      const prev = cur; cur = ti; setLens(cur, true); syncMeBtn();
      const a1 = cv.animate([{ transform: 'translate3d(' + fromX + 'px,0,0)' }, { transform: 'translate3d(' + (-dir * w) + 'px,0,0)' }], opt);
      const a2 = tv.animate([{ transform: 'translate3d(' + (dir * w + fromX) + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], opt);
      slides = [a1, a2];
      a1.onfinish = () => { if (cur !== prev) cv.hidden = true; slides = []; };
    } else {
      setLens(cur, true);
      cv.animate([{ transform: 'translate3d(' + fromX + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], opt);
      if (tv) tv.animate([{ transform: 'translate3d(' + (dir * w + fromX) + 'px,0,0)' }, { transform: 'translate3d(' + dir * w + 'px,0,0)' }], opt).onfinish = () => { if (cur !== ti) tv.hidden = true; };
    }
    target = -1;
  };
  view.addEventListener('touchend', end, { capture: true }); view.addEventListener('touchcancel', end, { capture: true });
}
views.forEach((v, i) => swipeable(v, i === 1)); // the Cloud pans with one finger, so there you swipe from the screen edge

// Slide a finger along the tab bar: the glass lens follows and the tab under it opens on release
(() => {
  const bar = $('#tabbar');
  let sx = 0, dragging = false, startX = 0, justDragged = false;
  bar.addEventListener('touchstart', (e) => {
    const r = bar.getBoundingClientRect(); sx = e.touches[0].clientX; dragging = false;
    startX = Math.max(0, Math.min((views.length - 1) * 60, sx - r.left - 5 - 30));
  }, { passive: true });
  bar.addEventListener('touchmove', (e) => {
    const r = bar.getBoundingClientRect(), x = e.touches[0].clientX;
    if (!dragging && Math.abs(x - sx) < 8) return;
    dragging = true; e.preventDefault();
    lensEl.getAnimations().forEach((a) => a.cancel());
    const pos = Math.max(-6, Math.min((views.length - 1) * 60 + 6, x - r.left - 5 - 30));
    lensEl.style.transform = 'translate3d(' + pos + 'px,0,0) scale(1.18,1.08)';
    const near = Math.round(Math.max(0, Math.min(views.length - 1, pos / 60)));
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('hover', +b.dataset.tab === near));
  }, { passive: false });
  bar.addEventListener('touchend', (e) => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('hover'));
    if (!dragging) return;
    const r = bar.getBoundingClientRect(), x = e.changedTouches[0].clientX;
    const idx = Math.round(Math.max(0, Math.min(views.length - 1, (x - r.left - 5 - 30) / 60)));
    justDragged = true; setTimeout(() => { justDragged = false; }, 400);
    if (idx === cur) setLens(cur, true); else goTab(idx);
  });
  bar.addEventListener('click', (e) => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
})();

// ---------------- Pushed pages ----------------
function pushPage(title, bodyHTML, opts = {}) {
  const pg = document.createElement('section');
  pg.className = 'page'; pg.setAttribute('aria-label', title);
  pg.innerHTML = '<div class="pbar"><button class="gbtn glass" data-back aria-label="Back">' + ICON.back + '</button><span class="ptitle">' + esc(title) + '</span><span style="width:44px"></span></div>' +
    '<div class="scroll">' + bodyHTML + '</div>' + (opts.footer || '');
  $('#app').appendChild(pg);
  const under = pages.length ? pages[pages.length - 1] : views[cur];
  pages.push(pg);
  $('#tabbar').classList.add('away'); $('#meBtn').classList.add('away');
  void pg.offsetWidth;
  pg.classList.add('in');
  under.style.transition = 'transform .5s var(--ease)'; under.style.transform = 'translateX(-28%)';
  $('#shade').classList.add('on');
  pg.querySelector('[data-back]').onclick = () => popPage();
  const sc = pg.querySelector('.scroll'), bar = pg.querySelector('.pbar');
  sc.addEventListener('scroll', () => bar.classList.toggle('on', sc.scrollTop > 60), { passive: true });
  edgeSwipe(pg, under);
  return pg;
}
function popPage(instant) {
  const pg = pages.pop(); if (!pg) return;
  const under = pages.length ? pages[pages.length - 1] : views[cur];
  pg.style.transition = instant ? 'none' : ''; pg.classList.remove('in'); pg.style.transform = '';
  under.style.transition = instant ? 'none' : 'transform .5s var(--ease)'; under.style.transform = 'translateX(0)';
  if (!pages.length) { $('#tabbar').classList.remove('away'); $('#meBtn').classList.remove('away'); $('#shade').classList.remove('on'); }
  setTimeout(() => { pg.remove(); if (!pages.length) under.style.transform = ''; }, instant ? 0 : 520);
  if (pg._onPop) pg._onPop();
}
function edgeSwipe(pg, under) {
  let sx = null, dx = 0, t0 = 0;
  pg.addEventListener('pointerdown', (e) => {
    if (e.clientX - pg.getBoundingClientRect().left > 26) return;
    sx = e.clientX; dx = 0; t0 = performance.now();
    pg.style.transition = 'none'; under.style.transition = 'none';
    pg.setPointerCapture(e.pointerId);
  });
  pg.addEventListener('pointermove', (e) => {
    if (sx == null) return;
    dx = Math.max(0, e.clientX - sx);
    pg.style.transform = 'translateX(' + dx + 'px)';
    under.style.transform = 'translateX(' + (-28 + dx / pg.offsetWidth * 28) + '%)';
  });
  const end = () => {
    if (sx == null) return;
    const v = dx / Math.max(1, performance.now() - t0); sx = null;
    pg.style.transition = ''; under.style.transition = 'transform .5s var(--ease)';
    if (dx > pg.offsetWidth / 3 || v > .6) popPage();
    else { pg.style.transform = ''; under.style.transform = 'translateX(-28%)'; }
  };
  pg.addEventListener('pointerup', end); pg.addEventListener('pointercancel', end);
}

// ---------------- Agenda ----------------
function todayTasks(off = 0) {
  const n = dayNum() + off, q = QUESTIONS[n % QUESTIONS.length];
  const pairs = []; for (let i = 0; i < 5; i++) pairs.push(PAIRS[(n * 5 + i) % PAIRS.length]);
  return [
    { k: 'q', time: '08:00', title: 'Morning question', sub: q[0], dim: q[1], icon: ICON.q, data: q },
    { k: 't', time: '13:00', title: 'This or that', sub: 'Five quick choices. Go with your gut.', dim: 'lifestyle', icon: ICON.t, data: pairs },
    { k: 'm', time: '19:30', title: 'Move', sub: 'Walk, run, dance or stretch.', dim: 'routine', icon: ICON.m }
  ];
}
const dimLabel = (k) => DIMS[dimIndex(k)]?.label || '';
function renderAgenda() {
  const r = rec(), tasks = todayTasks();
  const n = tasks.filter((t) => r[t.k]).length, st = streak();
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const week = days.map((d, i) => {
    const done = isDone(API.dayKey(d)), isToday = i === 6;
    return '<div class="wd">' + 'SMTWTFS'[d.getDay()] + '<b class="' + (done ? 'done' : '') + (isToday && !done ? ' today' : '') + '">' + (done ? ICON.check : '') + '</b></div>';
  }).join('');
  $('#agendaBody').innerHTML =
    '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Rareness</span><h1 class="largetitle">Agenda</h1><span class="label">' + new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) + '</span></header>' +
    '<section class="box" style="display:flex;flex-direction:column;gap:12px" aria-label="Streak">' +
      '<div class="head"><div><div class="big">' + st + '</div><div class="label" style="margin-top:4px">day streak</div></div><div class="label" style="text-align:right">best ' + Math.max(bestStreak(), st) + '<br>' + totalDone() + ' exercises</div></div>' +
      '<div class="week">' + week + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px"><div class="head" style="font-size:13.5px"><span>' + n + ' of 3 today</span><span class="muted">' + (n === 3 ? 'Streak saved' : (3 - n) + ' to go') + '</span></div>' +
      '<div class="prog">' + tasks.map((t) => '<span class="' + (r[t.k] ? 'on' : '') + '"></span>').join('') + '</div></div>' +
      (n === 3 ? '<button class="primary" id="openCloud">Open the Cloud</button>' : '<p class="muted" style="margin:0;font-size:13px;line-height:1.45">Finish all three to unlock the Cloud and your chats. Miss a day and they lock again.</p>') +
    '</section>' +
    '<section class="section" aria-label="Today"><h2 class="h2">Today</h2><div style="display:flex;flex-direction:column;gap:4px">' +
      tasks.map((t) => '<button class="task' + (r[t.k] ? ' done' : '') + '" data-task="' + t.k + '">' +
        '<span class="ic">' + t.icon + '</span>' +
        '<span class="tx"><em>' + t.time + ' · ' + dimLabel(t.dim) + '</em><b>' + t.title + '</b><span>' + esc(t.sub) + '</span></span>' +
        '<span class="st">' + (r[t.k] ? ICON.check : '') + '</span></button>').join('') +
    '</div></section>' +
    '<section class="section" aria-label="Your plan" id="planBody"></section>' +
    '<p class="muted" style="margin:0;font-size:13px;line-height:1.45">Every answer tunes your aura, and who floats close to you in the Cloud.</p>';
  document.querySelectorAll('[data-task]').forEach((b) => b.onclick = () => {
    const t = tasks.find((x) => x.k === b.dataset.task);
    if (rec()[t.k]) { toast('Already done today'); return; }
    openSheet(t);
  });
  const oc = $('#openCloud'); if (oc) oc.onclick = () => goTab(1);
  renderPlan();
}

// ---------------- Exercise sheet ----------------
let timerT = null;
function openSheet(t) {
  const sh = $('#sheet');
  sh.setAttribute('aria-label', t.title);
  sh.innerHTML = '<div class="grab"></div>';
  const body = document.createElement('div'); sh.appendChild(body);
  const head = (h) => '<p class="label">' + t.title + ' · ' + dimLabel(t.dim) + '</p><h2>' + esc(h) + '</h2>';
  if (t.k === 'q') {
    body.innerHTML = head(t.sub) + '<label for="qAns" class="label" style="display:block;margin-bottom:6px">Your answer</label><textarea id="qAns" maxlength="300" placeholder="A few words or a short story"></textarea><p class="fine" style="margin:6px 0 10px">Your answer appears on your profile for your matches to read.</p><button class="primary" id="qSave" disabled>Save answer</button>';
    const ta = $('#qAns', body), bt = $('#qSave', body);
    ta.oninput = () => { bt.disabled = ta.value.trim().length < 3; };
    bt.onclick = () => complete(t, { text: ta.value.trim() }, 'Saved. It now appears on your profile.', bt);
  } else if (t.k === 't') {
    let step = 0; const picks = [];
    const draw = () => {
      const p = t.data[step];
      body.innerHTML = head('Pick one') + '<div class="choice"><button data-c="0">' + esc(p[0]) + '</button><button data-c="1">' + esc(p[1]) + '</button></div>' +
        '<div class="dots">' + t.data.map((_, i) => '<span class="' + (i <= step ? 'on' : '') + '"></span>').join('') + '</div>';
      body.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
        picks.push({ a: p[0], b: p[1], pick: p[+b.dataset.c], dim: p[2] }); step++;
        if (step >= t.data.length) complete(t, { picks }, 'Done. Your aura is tuning.'); else draw();
      });
    };
    draw();
  } else {
    let mins = 15, left = 0, running = false;
    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const C = 2 * Math.PI * 88;
    const draw = () => {
      const total = mins * 60, frac = left ? 1 - left / total : 0;
      body.innerHTML = head('Move for ' + mins + ' minutes') +
        '<div class="chips" role="group" aria-label="Minutes">' + [10, 15, 20, 30].map((m) => '<button class="chip' + (m === mins ? ' on' : '') + '" data-m="' + m + '"' + (running ? ' disabled' : '') + '>' + m + ' min</button>').join('') + '</div>' +
        '<div class="timer"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="88" fill="none" stroke="rgba(17,17,20,.08)" stroke-width="1.5"></circle><circle cx="95" cy="95" r="88" fill="none" stroke="#111114" stroke-width="1.5" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - frac)).toFixed(1) + '"></circle></svg><b>' + fmt(left || total) + '</b></div>' +
        '<div style="display:flex;flex-direction:column;gap:6px"><button class="primary" id="mGo">' + (running ? 'Pause' : (left ? 'Resume' : 'Start timer')) + '</button><button class="secondary" id="mLog">I already moved today, log it</button></div>';
      body.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { mins = +b.dataset.m; left = 0; draw(); });
      $('#mGo', body).onclick = () => {
        if (running) { running = false; clearInterval(timerT); draw(); return; }
        if (!left) left = mins * 60;
        running = true; draw(); clearInterval(timerT);
        timerT = setInterval(() => {
          left--;
          if (left <= 0) { clearInterval(timerT); running = false; complete(t, { minutes: mins, timed: true }, 'Moved ' + mins + ' minutes. Routine tuned.'); return; }
          const bb = body.querySelector('.timer b'), cc = body.querySelectorAll('.timer circle')[1];
          if (bb) bb.textContent = fmt(left);
          if (cc) cc.setAttribute('stroke-dashoffset', (C * (left / (mins * 60))).toFixed(1));
        }, 1000);
      };
      $('#mLog', body).onclick = (e) => { clearInterval(timerT); complete(t, { minutes: mins, timed: false }, 'Logged. Routine tuned.', e.currentTarget); };
    };
    draw();
  }
  $('#sheetBack').classList.add('on'); sh.classList.add('on');
  const f = sh.querySelector('textarea'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 450);
}
function closeSheet() { clearInterval(timerT); $('#sheet').classList.remove('on'); $('#sheetBack').classList.remove('on'); }
$('#sheetBack').onclick = closeSheet;
let matching = false;
async function complete(t, data, msg, btn) {
  if (btn) btn.disabled = true;
  const was = todayDone();
  try {
    const row = await API.saveAnswer(uid, { day: today(), kind: t.k, dim: t.dim, prompt: t.k === 'q' ? t.sub : t.title, data });
    myAnswers = myAnswers.filter((a) => !(a.day === row.day && a.kind === row.kind)).concat(row);
  } catch (e) { if (btn) btn.disabled = false; fail(e); return; }
  closeSheet(); renderAgenda(); updateLocks();
  if (!was && todayDone()) {
    toast('All done. The Cloud is open.');
    // New answers: refresh the aura and matches in the background, then reload the Cloud
    if (!matching) {
      matching = true;
      API.api('match').then(loadCloud).then(() => refreshMe()).catch(console.error).finally(() => { matching = false; });
    }
  } else toast(msg);
}

// ---------------- Plan (inside Agenda): upcoming days and what you've done ----------------
let taskSeg = 'up';
function renderPlan() {
  const box = $('#planBody'); if (!box) return;
  const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  let html = '<h2 class="h2">Your plan</h2><div class="seg2" role="tablist" aria-label="Show"><span class="seglens" style="transform:translateX(' + (taskSeg === 'up' ? 0 : 100) + '%)"></span>' +
    '<button role="tab" aria-selected="' + (taskSeg === 'up') + '" data-seg="up">Upcoming</button><button role="tab" aria-selected="' + (taskSeg === 'done') + '" data-seg="done">Done</button></div>';
  if (taskSeg === 'up') {
    for (let off = 1; off <= 6; off++) {
      const d = new Date(); d.setDate(d.getDate() + off);
      html += '<div class="section"><h3 class="h2" style="font-size:22px;margin-top:6px">' + (off === 1 ? 'Tomorrow' : fmtDay(d)) + '</h3><div style="display:flex;flex-direction:column;gap:4px">' +
        todayTasks(off).map((t) => trow(t, 'later')).join('') + '</div></div>';
    }
  } else {
    const keys = [...new Set(myAnswers.filter((a) => a.kind !== 'signup').map((a) => a.day))].sort().reverse();
    if (!keys.length) html += '<div class="box label" style="font-size:14px;line-height:1.45">Finished exercises show up here, with your answers and choices.</div>';
    keys.forEach((k) => {
      const x = rec(k), d = new Date(k + 'T12:00'), full = isDone(k);
      const rows = [];
      if (x.q) rows.push({ title: 'Morning question', sub: x.q.prompt, detail: x.q.data.text, icon: ICON.q, at: x.q.created_at });
      if (x.t) rows.push({ title: 'This or that', sub: (x.t.data.picks || []).map((p) => p.pick).join(' · ') || 'Five choices made', icon: ICON.t, at: x.t.created_at });
      if (x.m) rows.push({ title: 'Move', sub: x.m.data.minutes ? x.m.data.minutes + ' minutes' : 'Logged', icon: ICON.m, at: x.m.created_at });
      html += '<div class="section"><div class="head" style="margin-top:6px"><h3 class="h2" style="font-size:22px">' + (k === today() ? 'Today' : fmtDay(d)) + '</h3><span class="label">' + (full ? 'Streak day' : rows.length + ' of 3') + '</span></div><div style="display:flex;flex-direction:column;gap:4px">' +
        rows.map((o) => '<div class="task done" style="cursor:default"><span class="ic">' + o.icon + '</span><span class="tx"><em>' + (o.at ? new Date(o.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '') + '</em><b>' + o.title + '</b><span>' + esc(o.sub) + '</span>' +
          (o.detail ? '<span style="color:var(--ink);margin-top:2px">“' + esc(o.detail) + '”</span>' : '') + '</span><span class="st">' + ICON.check + '</span></div>').join('') + '</div></div>';
    });
  }
  box.innerHTML = html;
  box.querySelectorAll('[data-seg]').forEach((b) => b.onclick = () => {
    if (taskSeg === b.dataset.seg) return;
    taskSeg = b.dataset.seg;
    const lens = box.querySelector('.seglens'); if (lens) lens.style.transform = 'translateX(' + (taskSeg === 'up' ? 0 : 100) + '%)';
    setTimeout(renderPlan, reduced ? 0 : 260);
  });
}
function trow(t, mode) {
  const open = mode === 'open';
  return '<' + (open ? 'button data-open="' + t.k + '"' : 'div') + ' class="task"' + (open ? '' : ' style="cursor:default;opacity:.62"') + '><span class="ic">' + t.icon + '</span>' +
    '<span class="tx"><em>' + t.time + ' · ' + dimLabel(t.dim) + '</em><b>' + t.title + '</b><span>' + esc(t.sub) + '</span></span>' +
    (open ? '<span class="st"></span></button>' : '<span class="ic" style="color:var(--ink3)">' + ICON.lock + '</span></div>');
}


// ---------------- Photo: pick, reframe, upload ----------------
let photoDone = null;
function pickPhoto(onDone) { photoDone = onDone; $('#photoInput').click(); }
$('#photoInput').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      openCropper(c.toDataURL('image/jpeg', .9), photoDone);
    };
    img.onerror = () => toast('That file isn’t an image we can read. Try a JPG or PNG.');
    img.src = fr.result;
  };
  fr.readAsDataURL(f); e.target.value = '';
});
function openCropper(src, onDone) {
  const sh = $('#sheet'), back = $('#sheetBack');
  sh.style.zIndex = 171; back.style.zIndex = 170; // above the sign-up screens too
  sh.setAttribute('aria-label', 'Reframe your photo');
  sh.innerHTML = '<div class="grab"></div><p class="label">Your photo</p><h2>Reframe</h2>' +
    '<div class="crop" id="crop"><img id="cropImg" alt="Photo to reframe"><span class="mask"></span></div>' +
    '<label class="lbl" for="cropZoom">Zoom<input type="range" id="cropZoom" min="1" max="4" step="0.01" value="1"></label>' +
    '<p class="label" style="margin:8px 0 14px">Drag to move. Pinch or use the slider to zoom.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:8px"><button class="secondary" id="cropCancel">Cancel</button><button class="primary" id="cropUse">Use photo</button></div>';
  const box = $('#crop', sh), im = $('#cropImg', sh), zr = $('#cropZoom', sh);
  let W = 0, H = 0, base = 1, z = 1, ox = 0, oy = 0;
  const size = () => box.clientWidth;
  const clampPos = () => {
    const B = size(), mx = Math.max(0, (W * base * z - B) / 2), my = Math.max(0, (H * base * z - B) / 2);
    ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy));
  };
  const draw = () => { clampPos(); im.style.width = W * base + 'px'; im.style.height = H * base + 'px'; im.style.transform = 'translate(-50%,-50%) translate(' + ox + 'px,' + oy + 'px) scale(' + z + ')'; };
  im.onload = () => { W = im.naturalWidth; H = im.naturalHeight; base = Math.max(size() / W, size() / H); draw(); };
  im.src = src;
  zr.oninput = () => { z = +zr.value; draw(); };
  const pts = new Map(); let st = null;
  const begin = () => {
    const v = [...pts.values()];
    st = v.length === 1 ? { x: v[0].x, y: v[0].y, ox, oy } : v.length >= 2 ? { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1, z } : null;
  };
  box.addEventListener('pointerdown', (e) => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); begin(); });
  box.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !st) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = [...pts.values()];
    if (v.length === 1 && st.x != null) { ox = st.ox + v[0].x - st.x; oy = st.oy + v[0].y - st.y; }
    else if (v.length >= 2 && st.d) { z = Math.max(1, Math.min(4, st.z * Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) / st.d)); zr.value = z; }
    draw();
  });
  const end = (e) => { pts.delete(e.pointerId); begin(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('wheel', (e) => { e.preventDefault(); z = Math.max(1, Math.min(4, z * Math.exp(-e.deltaY * .003))); zr.value = z; draw(); }, { passive: false });
  const close = () => { closeSheet(); setTimeout(() => { sh.style.zIndex = ''; back.style.zIndex = ''; }, 500); };
  $('#cropCancel', sh).onclick = close;
  $('#cropUse', sh).onclick = (ev) => {
    ev.currentTarget.disabled = true; ev.currentTarget.textContent = 'Saving…';
    const OUT = 640, B = size(), k = OUT / B, c = document.createElement('canvas'); c.width = c.height = OUT;
    const dw = W * base * z * k, dh = H * base * z * k;
    c.getContext('2d').drawImage(im, OUT / 2 + ox * k - dw / 2, OUT / 2 + oy * k - dh / 2, dw, dh);
    c.toBlob(async (blob) => {
      try { await onDone(blob); close(); } catch (e) { fail(e); ev.target.disabled = false; ev.target.textContent = 'Use photo'; }
    }, 'image/jpeg', .86);
  };
  back.classList.add('on'); sh.classList.add('on');
}
async function savePhoto(blob) {
  const old = me.photo_path;
  const path = await API.uploadPhoto(uid, blob);
  me = await API.saveProfile(uid, { photo_path: path });
  if (old) API.removePhoto(old).catch(() => {});
}

// ---------------- Profile ----------------
let saveT = null, pending = {};
function saveSoon(patch) {
  Object.assign(me, patch); Object.assign(pending, patch);
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const p = pending; pending = {};
    try { me = { ...me, ...(await API.saveProfile(uid, p)) }; } catch (e) { fail(e); }
  }, 600);
}
async function refreshMe() { me = await API.myProfile(uid); refreshYou(); refreshMeBtn(); if ($('#profileBody')) renderProfile(); }
function completeness() {
  const checks = [me.photo_path, me.name, me.birthdate, me.city, me.country, me.job, me.bio && me.bio.length > 20, (me.interests || []).length >= 3, me.status];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}
function field(id, label, val, ph, max, ac, im) {
  return '<label class="lbl" for="' + id + '">' + label + '<input class="field" id="' + id + '" maxlength="' + max + '" value="' + esc(val ?? '') + '" placeholder="' + esc(ph) + '"' + (ac ? ' autocomplete="' + ac + '"' : '') + (im ? ' inputmode="' + im + '"' : '') + '></label>';
}
async function renderProfile() {
  if (!$('#profileBody')) return;
  const aura = dimsToW(me.aura), tot = aura.reduce((a, b) => a + b, 0) || 1;
  const sub = [ageOf(me.birthdate), me.city].filter(Boolean).join(' · ');
  const facts = [[ICON.work, me.job], [ICON.pin, me.city], [ICON.ruler, me.height_cm && me.height_cm + ' cm'], [ICON.lang, me.languages]].filter((f) => f[1]);
  const answers = myAnswers.filter((a) => a.kind === 'q' && a.data?.text).slice(0, 5);
  $('#profileBody').innerHTML =
    '<header style="display:flex;flex-direction:column;gap:6px"><div class="head"><span class="brand">Rareness</span><span class="label">Profile ' + completeness() + '% complete</span></div><h1 class="largetitle">Profile</h1></header>' +
    '<div class="me"><div class="wrap" id="meBubble" style="position:relative;margin-top:24px">' + noteHTML(me.status || 'Write a status') + bubbleHTML(youObj(), 176) +
      '<button class="gbtn glass cam" id="camBtn" aria-label="' + (me.photo_path ? 'Change your photo' : 'Add your photo') + '">' + ICON.cam + '</button></div>' +
      '<h2 class="h2" id="meName" style="font-size:32px;margin-top:6px">' + esc(me.name || 'Your name') + '</h2><p class="label" id="meSub">' + esc(sub || 'Add your city') + '</p>' +
      (facts.length ? '<div class="facts" style="justify-content:center;margin-top:4px">' + facts.map((f) => '<span class="fact">' + f[0] + esc(f[1]) + '</span>').join('') + '</div>' : '') +
    '</div>' +

    '<section class="section" aria-label="Your aura"><div class="head"><h2 class="h2">Your aura</h2><span class="label">Updated by AI from your answers</span></div>' +
      (me.aura_summary ? '<p class="reason-line">' + esc(me.aura_summary) + '</p>' : '<p class="label" style="font-size:14px">Your aura appears after your first answers are read.</p>') +
      DIMS.map((d, i) => '<div class="reason">' + swatch(i, 24) + '<div class="rt"><div>' + d.label + '<span>' + Math.round(aura[i] / tot * 100) + '%</span></div>' + glassBar(aura[i], i) + '</div></div>').join('') +
    '</section>' +

    '<section class="section" aria-label="Status"><div class="head"><h2 class="h2">Status</h2><span class="counter" id="pCount"></span></div>' +
      '<label class="hide" for="pStatus">Status</label><input class="field" id="pStatus" maxlength="20" value="' + esc(me.status) + '" placeholder="What’s on your mind">' +
      '<p class="label">Shown above your bubble in other people’s Cloud. Text only, 20 characters.</p></section>' +

    '<section class="section" aria-label="About"><div class="head"><h2 class="h2">About</h2><span class="counter" id="bCount"></span></div>' +
      '<label class="hide" for="pBio">About you</label><textarea id="pBio" maxlength="160" placeholder="A few lines about you, in your own words">' + esc(me.bio) + '</textarea></section>' +

    '<section class="section" aria-label="Basics"><h2 class="h2">Basics</h2><div class="grid2">' +
      field('pName', 'Name', me.name, 'First name', 24, 'given-name') + field('pPron', 'Pronouns', me.pronouns, 'she/her', 16) +
      field('pJob', 'Work', me.job, 'What you do', 40) + field('pCity', 'City', me.city, 'Where you live', 40, 'address-level2') +
      field('pHeight', 'Height (cm)', me.height_cm, '172', 3, '', 'numeric') + field('pLang', 'Languages', me.languages, 'French, English', 60) +
    '</div><label class="lbl" for="pCountry">Country<select class="field" id="pCountry">' + countryOptions(me.country) + '</select></label>' +
    '<p class="label">Your Cloud shows people from the same country.</p></section>' +

    '<section class="section" aria-label="Show me"><h2 class="h2">Show me</h2><div class="chips">' +
      [['women', 'Women'], ['men', 'Men'], ['everyone', 'Everyone']].map(([v, l]) => '<button class="chip' + (me.show_me === v ? ' on' : '') + '" data-show="' + v + '" aria-pressed="' + (me.show_me === v) + '">' + l + '</button>').join('') + '</div></section>' +

    '<section class="section" aria-label="Interests"><div class="head"><h2 class="h2">Interests</h2><span class="counter" id="iCount">' + (me.interests || []).length + '/6</span></div><div class="chips">' +
      INTERESTS.map((l) => '<button class="chip' + ((me.interests || []).includes(l) ? ' on' : '') + '" data-int="' + esc(l) + '" aria-pressed="' + (me.interests || []).includes(l) + '">' + esc(l) + '</button>').join('') + '</div></section>' +

    '<section class="section" aria-label="Your answers"><h2 class="h2">Your answers</h2>' +
      (answers.length ? answers.map((o) => '<div class="answer"><small>' + new Date(o.day + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</small><q>' + esc(o.prompt) + '</q><p>' + esc(o.data.text) + '</p></div>').join('')
        : '<p class="label" style="font-size:14px">Your answers to the morning question appear here, for matches to read.</p>') + '</section>' +

    '<section class="stats" aria-label="Stats"><div><b>' + streak() + '</b><span>Streak</span></div><div><b>' + Math.max(bestStreak(), streak()) + '</b><span>Best</span></div><div><b>' + totalDone() + '</b><span>Exercises</span></div></section>' +

    (config.paywall && me.paid_at ? '<section class="section" aria-label="Access"><h2 class="h2">Access</h2><div class="box" style="font-size:14.5px">Unlocked on ' + new Date(me.paid_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + '. One-time payment, nothing more to pay.</div></section>' : '') +

    '<section class="section" aria-label="Account"><h2 class="h2">Account</h2><div style="display:flex;flex-direction:column;gap:6px">' +
      '<button class="secondary" id="signOutBtn">Sign out</button>' +
      '<button class="link danger" id="deleteBtn" style="align-self:center">Delete my account</button></div></section>';

  const cnt = () => { $('#pCount').textContent = Array.from($('#pStatus').value).length + '/20'; $('#bCount').textContent = Array.from($('#pBio').value).length + '/160'; };
  cnt();
  const head = () => { $('#meName').textContent = me.name || 'Your name'; $('#meSub').textContent = [ageOf(me.birthdate), me.city].filter(Boolean).join(' · ') || 'Add your city'; };
  const bind = (id, key, after, num) => { $('#' + id).oninput = (e) => { let v = e.target.value; if (num) { v = v.replace(/\D/g, ''); e.target.value = v; } saveSoon({ [key]: num ? (v ? Number(v) : null) : v.trim() }); if (after) after(); }; };
  bind('pName', 'name', () => { head(); refreshYou(); }); bind('pCity', 'city', head);
  bind('pPron', 'pronouns'); bind('pHeight', 'height_cm', null, true); bind('pJob', 'job'); bind('pLang', 'languages');
  $('#pBio').oninput = (e) => { saveSoon({ bio: e.target.value }); cnt(); };
  $('#pCountry').onchange = (e) => { if (!e.target.value) return; saveSoon({ country: e.target.value }); setTimeout(() => API.api('match').then(loadCloud).catch(console.error), 900); };
  $('#pStatus').oninput = (e) => {
    const v = clip(e.target.value, 20); if (v !== e.target.value) e.target.value = v;
    saveSoon({ status: v }); cnt(); refreshYou();
    const nb = $('#meBubble .nb'); if (nb) nb.textContent = v || 'Write a status';
  };
  document.querySelectorAll('[data-show]').forEach((b) => b.onclick = () => {
    saveSoon({ show_me: b.dataset.show });
    document.querySelectorAll('[data-show]').forEach((x) => { const on = x.dataset.show === me.show_me; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    setTimeout(loadCloud, 900);
  });
  document.querySelectorAll('[data-int]').forEach((b) => b.onclick = () => {
    const v = b.dataset.int, list = [...(me.interests || [])], i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    else if (list.length >= 6) { toast('Pick up to 6 interests'); return; }
    else list.push(v);
    saveSoon({ interests: list });
    b.classList.toggle('on', list.includes(v)); b.setAttribute('aria-pressed', list.includes(v)); $('#iCount').textContent = list.length + '/6';
  });
  $('#camBtn').onclick = () => pickPhoto(async (blob) => { await savePhoto(blob); renderProfile(); refreshYou(); toast('Photo updated'); });
  $('#signOutBtn').onclick = async () => { await API.signOut(); location.reload(); };
  $('#deleteBtn').onclick = async (e) => {
    const b = e.currentTarget;
    if (!b.dataset.arm) {
      b.dataset.arm = '1'; b.textContent = 'Tap again to delete everything for good';
      setTimeout(() => { if (b.isConnected) { delete b.dataset.arm; b.textContent = 'Delete my account'; } }, 4000);
      return;
    }
    b.disabled = true; b.textContent = 'Deleting…';
    try { await API.api('account', 'DELETE'); await API.signOut(); location.reload(); } catch (err) { fail(err); b.disabled = false; }
  };
}
async function openBilling(btn) {
  btn.disabled = true;
  try { const { url } = await API.api('stripe/checkout'); location.href = url; } catch (e) { fail(e); btn.disabled = false; }
}
// Your profile lives behind the bubble button in the top-right corner of every page
function openProfile() {
  pushPage('Profile', '<div class="stack" id="profileBody"></div>');
  renderProfile();
}
function refreshMeBtn() {
  const b = $('#meBtn'); if (!b || !me) return;
  b.innerHTML = bubbleHTML(youObj(), 44);
}
$('#meBtn').onclick = openProfile;


// ---------------- Cloud ----------------
const stage = $('#stage'), world = $('#world');
const view = { s: .78, px: 0, py: 30, anim: null };
const YOU_R = 48;
const distFor = (c) => 130 + (1 - c) * 860;
let B = [], youEl, moved = false, touched = store.get('rareness.hint') === 'seen', pendingMatch = null;
function buildCloud(list = []) {
  const keep = new Map(B.map((b) => [b.id, b]));
  world.innerHTML = '';
  [90, 75, 60, 45].forEach((p) => {
    const d = distFor(p / 100), el = document.createElement('div');
    el.className = 'ring'; el.style.cssText = 'width:' + d * 2 + 'px;height:' + d * 2 + 'px;left:' + -d + 'px;top:' + -d + 'px';
    el.innerHTML = '<span class="ringlab">' + p + '% in common</span>'; world.appendChild(el);
  });
  youEl = document.createElement('div'); youEl.className = 'bub'; youEl.style.cssText = 'width:96px;height:96px;transform:translate(-48px,-48px);z-index:2';
  world.appendChild(youEl); refreshYou();
  B = list.map((p, i) => {
    const r = 24 + p.compat * p.compat * 48, dist = distFor(p.compat), ang = i * 2.39996 + .7, D = Math.round(r * 2);
    const was = keep.get(p.id);
    const b = Object.assign(p, { r, dist, hx: Math.cos(ang) * dist, hy: Math.sin(ang) * dist, vx: 0, vy: 0, press: 0, bumpUntil: was?.bumpUntil || 0,
      p1: Math.random() * 6.28, p2: Math.random() * 6.28, w1: .22 + Math.random() * .22, w2: .2 + Math.random() * .22, amp: 14 + Math.random() * 16, wob: Math.random() * 6.28 });
    const el = document.createElement('div'); el.className = 'bub'; el.style.width = el.style.height = D + 'px';
    el.innerHTML = '<div class="drop"></div><button class="ball" aria-label="' + esc(nameAge(p) + ', ' + p.score + '% in common') + '">' +
      bubbleHTML({ w: p.w, photo: p.photo }, D) + '</button><span class="bumpbadge hide">' + ICON.bump + '</span>' +
      '<span class="bname">' + esc(nameAge(p)) + '</span>' + noteHTML(p.status);
    world.appendChild(el);
    b.el = el; b.ball = el.querySelector('.ball'); b.nameEl = el.querySelector('.bname'); b.noteEl = el.querySelector('.note'); b.badge = el.querySelector('.bumpbadge');
    b.ball.addEventListener('click', () => { if (!moved) openPerson(b); });
    return b;
  });
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j], dx = c.hx - a.hx, dy = c.hy - a.hy, d = Math.hypot(dx, dy) || .01, min = a.r + c.r + 30;
      if (d < min) { const o = (min - d) / 2, nx = dx / d, ny = dy / d; a.hx -= nx * o; a.hy -= ny * o; c.hx += nx * o; c.hy += ny * o; }
    }
    for (const b of B) { const d = Math.hypot(b.hx, b.hy) || .01, nd = d + (b.dist - d) * .12; b.hx *= nd / d; b.hy *= nd / d; }
  }
  B.forEach((b) => { const was = keep.get(b.id); b.x = was ? was.x : b.hx; b.y = was ? was.y : b.hy; });
  refreshBadges(); applyLOD(true);
}
function refreshYou() {
  if (!youEl) return;
  youEl.innerHTML = '<div class="drop"></div>' + bubbleHTML(youObj(), 96) + (me?.status ? noteHTML(me.status) : '');
  const n = youEl.querySelector('.note'); if (n) n.style.transform = 'translateX(-50%) scale(' + (1 / view.s).toFixed(3) + ')';
}
function refreshBadges() { B.forEach((b) => b.badge.classList.toggle('hide', !b.bumped)); }
let lastS = -1;
function applyLOD(force) {
  if (!force && Math.abs(view.s - lastS) < .002) return;
  lastS = view.s;
  const inv = 'scale(' + (1 / view.s).toFixed(4) + ')';
  B.forEach((b) => {
    const dpx = b.r * 2 * view.s, showN = dpx >= 52, showS = dpx >= 88;
    b.nameEl.classList.toggle('hide', !showN); b.noteEl.classList.toggle('hide', !showS || !b.status);
    b.nameEl.style.transform = 'translateX(-50%) ' + inv; b.noteEl.style.transform = 'translateX(-50%) ' + inv;
    b.el.style.zIndex = showS ? 4 : 3;
  });
  world.querySelectorAll('.ringlab').forEach((l) => l.style.transform = 'translate(-50%,-50%) ' + inv);
  const yn = youEl.querySelector('.note'); if (yn) yn.style.transform = 'translateX(-50%) ' + inv;
  $('#zLabel').textContent = Math.round(view.s * 100) + '%';
}
const clampS = (s) => Math.max(.3, Math.min(2.6, s));
function zoomAt(x, y, s2) { const wx = (x - view.px) / view.s, wy = (y - view.py) / view.s; view.s = s2; view.px = x - wx * s2; view.py = y - wy * s2; }
function animZoom(x, y, s) { touch(); view.anim = { ax: x, ay: y, s: clampS(s) }; }
function touch() { if (!touched) { touched = true; store.set('rareness.hint', 'seen'); $('#hint').style.opacity = 0; setTimeout(() => $('#hint').hidden = true, 400); } }
function local(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }; }
// Gestures: one finger (or mouse) drags, two fingers pinch. Touch screens use touch events, which iOS
// delivers reliably for multi-finger gestures; mice and trackpads use pointer events and the wheel.
let g = null;
function gBegin(pts) {
  if (pts.length === 1) g = { mode: 'pan', sx: pts[0].x, sy: pts[0].y, px: view.px, py: view.py };
  else if (pts.length >= 2) { const [a, b] = pts, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; g = { mode: 'pinch', d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, s0: view.s, wx: (mx - view.px) / view.s, wy: (my - view.py) / view.s }; }
  else g = null;
}
function gMove(pts) {
  if (!g) return;
  if (g.mode === 'pan' && pts.length === 1) {
    const dx = pts[0].x - g.sx, dy = pts[0].y - g.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    if (moved) { view.px = g.px + dx; view.py = g.py + dy; }
  } else if (g.mode === 'pinch' && pts.length >= 2) {
    const [a, b] = pts, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, s = clampS(g.s0 * Math.hypot(b.x - a.x, b.y - a.y) / g.d0);
    view.s = s; view.px = mx - g.wx * s; view.py = my - g.wy * s; moved = true;
  }
}
const startGesture = () => { touch(); view.anim = null; closeLegend(); };
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const tpts = (e) => Array.from(e.touches).map(local);
  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) moved = false;
    if (e.touches.length >= 2) e.preventDefault();
    startGesture(); gBegin(tpts(e));
  }, { passive: false });
  stage.addEventListener('touchmove', (e) => { e.preventDefault(); gMove(tpts(e)); }, { passive: false });
  const tend = (e) => gBegin(tpts(e));
  stage.addEventListener('touchend', tend); stage.addEventListener('touchcancel', tend);
}
const ptrs = new Map();
stage.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') return;
  ptrs.set(e.pointerId, local(e)); if (ptrs.size === 1) moved = false; startGesture(); gBegin([...ptrs.values()]);
});
window.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, local(e)); gMove([...ptrs.values()]); });
const up = (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); gBegin([...ptrs.values()]); };
window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
stage.addEventListener('wheel', (e) => {
  e.preventDefault(); touch(); view.anim = null;
  const p = local(e), dy = Math.max(-60, Math.min(60, e.deltaY));
  zoomAt(p.x, p.y, clampS(view.s * Math.exp(-dy * (e.ctrlKey ? .012 : .004))));
}, { passive: false });
stage.addEventListener('dblclick', (e) => { const p = local(e); animZoom(p.x, p.y, view.s * 1.6); });
['gesturestart', 'gesturechange'].forEach((n) => stage.addEventListener(n, (e) => e.preventDefault()));
$('#zIn').onclick = () => animZoom(0, 0, view.s * 1.5);
$('#zOut').onclick = () => animZoom(0, 0, view.s / 1.5);
$('#zHome').onclick = () => { touch(); view.anim = { home: true, px: 0, py: 30, s: .78 }; };
$('#legend').innerHTML = '<p class="label">The light on each bubble shows why you match</p>' + DIMS.map((d, i) => '<div class="lrow">' + swatch(i, 26) + '<div>' + d.label + '<small>' + d.d + '</small></div></div>').join('');
function closeLegend() { $('#legend').classList.add('closed'); $('#legendBtn').setAttribute('aria-expanded', 'false'); }
$('#legendBtn').onclick = () => { const closed = $('#legend').classList.toggle('closed'); $('#legendBtn').setAttribute('aria-expanded', String(!closed)); };
if (touched) $('#hint').hidden = true;

let t = 0, last = performance.now();
function step(dt) {
  t += dt;
  const m = reduced ? .35 : 1, GAP = 6, ZONE = 26;
  for (const b of B) {
    let tx = b.hx + Math.sin(t * b.w1 + b.p1) * b.amp * m, ty = b.hy + Math.cos(t * b.w2 + b.p2) * b.amp * m, k = 1.4;
    if (b.bumpUntil) {
      if (t < b.bumpUntil) { const d = Math.hypot(b.hx, b.hy) || 1, dd = b.r + YOU_R + GAP; tx = b.hx / d * dd; ty = b.hy / d * dd; k = 6; }
      else { b.bumpUntil = 0; pendingMatch = b; }
    }
    b.ax = (tx - b.x) * k - b.vx * (k > 2 ? 3 : 1.2); b.ay = (ty - b.y) * k - b.vy * (k > 2 ? 3 : 1.2);
    b.press *= Math.pow(.15, dt);
  }
  for (let i = 0; i < B.length; i++) {
    const a = B[i];
    for (let j = i + 1; j < B.length; j++) {
      const c = B[j], dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r + GAP;
      if (Math.abs(dx) > min + ZONE || Math.abs(dy) > min + ZONE) continue;
      const d = Math.hypot(dx, dy) || .01; if (d >= min + ZONE) continue;
      const k = (min + ZONE - d) / ZONE, f = k * k * 240, nx = dx / d, ny = dy / d;
      a.ax -= nx * f; a.ay -= ny * f; c.ax += nx * f; c.ay += ny * f;
      a.press = Math.max(a.press, Math.min(1, k)); c.press = Math.max(c.press, Math.min(1, k));
      if (d < min) { const o = (min - d) / 2; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; }
    }
    const d = Math.hypot(a.x, a.y) || .01, min = a.r + YOU_R + GAP;
    if (d < min + ZONE && !a.bumpUntil) { const k = (min + ZONE - d) / ZONE, f = k * k * 240; a.ax += a.x / d * f; a.ay += a.y / d * f; a.press = Math.max(a.press, Math.min(1, k)); }
    if (d < min) { a.x *= min / d; a.y *= min / d; a.press = 1; }
  }
  for (const b of B) { b.vx += b.ax * dt; b.vy += b.ay * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
  const an = view.anim;
  if (an) {
    const k = 1 - Math.pow(.0005, dt), s2 = view.s + (an.s - view.s) * k;
    if (an.home) { view.px += (an.px - view.px) * k; view.py += (an.py - view.py) * k; view.s = s2; if (Math.abs(an.s - view.s) < .001 && Math.hypot(an.px - view.px, an.py - view.py) < .5) view.anim = null; }
    else { zoomAt(an.ax, an.ay, s2); if (Math.abs(an.s - view.s) < .001) view.anim = null; }
  }
}
function paint() {
  world.style.transform = 'translate(' + view.px.toFixed(1) + 'px,' + view.py.toFixed(1) + 'px) scale(' + view.s.toFixed(4) + ')';
  for (const b of B) {
    b.el.style.transform = 'translate3d(' + (b.x - b.r).toFixed(1) + 'px,' + (b.y - b.r).toFixed(1) + 'px,0)';
    const sq = Math.sin(t * 1.7 + b.wob) * (.014 + b.press * .045) * (reduced ? .3 : 1);
    b.ball.style.transform = 'scale(' + (1 + sq).toFixed(4) + ',' + (1 - sq).toFixed(4) + ')';
  }
  applyLOD();
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (cur === 1 || B.some((b) => b.bumpUntil)) { step(dt); paint(); }
  if (pendingMatch) { const b = pendingMatch; pendingMatch = null; showMatch(b); }
  requestAnimationFrame(loop);
}

// ---------------- Cloud data ----------------
// A cloud row from the database becomes a bubble: its match score sets size and distance,
// and the dims set the coloured ring.
function toBubble(row) {
  return {
    id: row.id, name: row.name, age: row.age, city: row.city, job: row.job, status: clip(row.status, 20),
    interests: row.interests || [], photo: API.photoUrl(row.photo_path),
    score: row.score, compat: Math.max(.05, Math.min(1, (row.score - 25) / 70)), w: dimsToW(row.dims), dims: row.dims,
    reason: row.reason, bumped: row.bumped, chatId: row.chat_id
  };
}
let cloudLoaded = false;
async function loadCloud() {
  try {
    people = (await API.cloud()).map(toBubble);
    cloudLoaded = true;
    buildCloud(people);
    renderCloudEmpty();
  } catch (e) { console.error(e); }
}
function renderCloudEmpty() {
  let el = $('#cloudEmpty');
  if (people.length) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'cloudEmpty';
    el.style.cssText = 'position:absolute;left:24px;right:24px;top:calc(50% + 70px);text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none';
    $('#v2').appendChild(el);
  }
  el.innerHTML = '<p class="reason-line">Your Cloud is forming</p><p class="label" style="font-size:14px;line-height:1.45;max-width:300px">We compare your answers with everyone else’s. People appear here as soon as their matches are ready.</p>';
}

// ---------------- Person page + bumping ----------------
async function openPerson(b) {
  const tot = b.w.reduce((a, c) => a + c, 0) || 1;
  const reasons = b.w.map((x, i) => ({ x, i })).filter((r) => r.x > 0).sort((a, c) => c.x - a.x);
  const body =
    '<div class="dhero"><div style="position:relative">' + (b.status ? noteHTML(b.status) : '') + bubbleHTML({ w: b.w, photo: b.photo }, 210) + '</div>' +
    '<h1 class="largetitle" style="margin-top:12px">' + esc(nameAge(b)) + '</h1>' +
    '<p class="label" style="font-size:14px">' + esc([b.job, b.city].filter(Boolean).join(' · ')) + '</p></div>' +
    '<div class="stack" style="margin-top:22px">' +
      '<section class="box" style="display:flex;flex-direction:column;gap:12px" aria-label="Why you match">' +
        '<div class="head"><h2 class="h2">Why you match</h2><span style="font-family:var(--serif);font-size:36px;line-height:1">' + b.score + '%</span></div>' +
        (b.reason ? '<p class="reason-line">' + esc(b.reason) + '</p>' : '') +
        reasons.map((r) => '<div class="reason">' + swatch(r.i, 24) + '<div class="rt"><div>' + DIMS[r.i].label + '<span>' + Math.round(r.x / tot * 100) + '%</span></div>' + glassBar(r.x / tot * 100, r.i) + '</div></div>').join('') +
        '<p class="label" style="font-size:13px;line-height:1.4">These are the colours around ' + esc(b.name || 'their') + '’s bubble.</p>' +
      '</section>' +
      (b.interests.length ? '<section class="section" aria-label="Interests"><h2 class="h2">Interests</h2><div class="facts">' + b.interests.map((x) => '<span class="fact">' + esc(x) + '</span>').join('') + '</div></section>' : '') +
      '<section class="section" aria-label="Their answers" id="theirAnswers"></section>' +
      '<div id="bumpZone" style="display:flex;flex-direction:column;gap:8px">' + bumpZone(b) + '</div>' +
      '<div class="menu-row" style="justify-content:center"><button class="link" data-report style="color:var(--ink2)">Report</button><button class="link" data-block style="color:var(--ink2)">Block</button></div>' +
    '</div>';
  const pg = pushPage(b.name || 'Profile', body);
  wireBump(pg, b);
  pg.querySelector('[data-block]').onclick = (e) => blockPerson(b, e.currentTarget);
  pg.querySelector('[data-report]').onclick = () => openReport(b);
  try {
    const ans = await API.morningAnswers(b.id, 4);
    const box = pg.querySelector('#theirAnswers');
    if (box && ans.length) box.innerHTML = '<h2 class="h2">Their answers</h2>' + ans.map((o) => '<div class="answer"><small>' + new Date(o.day + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</small><q>' + esc(o.prompt) + '</q><p>' + esc(o.data?.text) + '</p></div>').join('');
  } catch (e) { console.error(e); }
}
function bumpZone(b) {
  if (b.chatId) return '<button class="primary" data-chat>Open chat</button>';
  if (b.bumped) return '<div class="box" style="text-align:center;font-size:14.5px">Bumped. If ' + esc(b.name || 'they') + ' bump' + (b.name ? 's' : '') + ' you back, a chat opens.</div>';
  return '<button class="primary" data-bump>' + ICON.bump + 'Bump</button><p class="label" style="text-align:center">' + esc(b.name || 'They') + ' won’t know unless they bump you too.</p>';
}
function wireBump(pg, b) {
  const bz = pg.querySelector('#bumpZone'), bt = bz.querySelector('[data-bump]'), ch = bz.querySelector('[data-chat]');
  if (ch) ch.onclick = () => { popPage(true); goTab(2, () => openThread(b.chatId)); };
  if (!bt) return;
  bt.onclick = async () => {
    bt.disabled = true;
    let res;
    try { res = await API.bump(b.id); } catch (e) { bt.disabled = false; fail(e); return; }
    b.bumped = true; refreshBadges();
    if (res.mutual) {
      b.chatId = res.chat_id;
      popPage();
      setTimeout(() => { b.bumpUntil = t + 1.4; view.anim = { home: true, px: 0, py: 30, s: Math.max(.78, Math.min(1, view.s)) }; }, 380);
    } else { bz.innerHTML = bumpZone(b); toast('Bump sent'); }
  };
}
function showMatch(b) {
  loadChats();
  const m = $('#match');
  m.innerHTML = '<div class="mpair"><div class="mL" style="position:absolute;left:0;top:0">' + bubbleHTML(youObj(), 136) + '</div><div class="mR" style="position:absolute;right:0;top:0">' + bubbleHTML({ w: b.w, photo: b.photo }, 136) + '</div></div>' +
    '<h2>You bumped into each other</h2><p class="muted" style="margin:0;font-size:16px;line-height:1.45;max-width:300px">' + esc(b.name || 'They') + ' bumped you too. Your chat is open.</p>' +
    '<div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:4px;margin-top:8px"><button class="primary" id="mChat">Say hi' + (b.name ? ' to ' + esc(b.name) : '') + '</button><button class="link" id="mKeep">Keep exploring</button></div>';
  void m.offsetWidth; m.classList.add('on');
  $('#mKeep').onclick = () => m.classList.remove('on');
  $('#mChat').onclick = () => { m.classList.remove('on'); goTab(2, () => openThread(b.chatId)); };
}
async function blockPerson(b, btn) {
  if (!btn.dataset.arm) { btn.dataset.arm = '1'; btn.textContent = 'Tap again to block'; return; }
  try {
    await API.block(uid, b.id);
    popPage();
    people = people.filter((p) => p.id !== b.id); buildCloud(people); loadChats();
    toast((b.name || 'They') + ' won’t see you, and you won’t see them.');
  } catch (e) { fail(e); }
}
function openReport(b) {
  const sh = $('#sheet');
  sh.setAttribute('aria-label', 'Report');
  sh.innerHTML = '<div class="grab"></div><p class="label">Report ' + esc(b.name || 'this person') + '</p><h2>What happened?</h2>' +
    '<div class="opts">' + ['Fake profile', 'Inappropriate photos', 'Harassment or hate', 'Underage', 'Something else'].map((r) => '<button class="opt" data-r="' + esc(r) + '">' + esc(r) + '</button>').join('') + '</div>' +
    '<label class="lbl" for="repText" style="margin-top:12px">Details (optional)<textarea id="repText" maxlength="400" style="min-height:80px"></textarea></label>' +
    '<div style="height:10px"></div><button class="primary" id="repSend" disabled>Send report</button><p class="fine" style="margin-top:8px">Reports are private. We review every one.</p>';
  let pick = '';
  sh.querySelectorAll('[data-r]').forEach((o) => o.onclick = () => { pick = o.dataset.r; sh.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === o)); $('#repSend', sh).disabled = false; });
  $('#repSend', sh).onclick = async (e) => {
    e.currentTarget.disabled = true;
    try { await API.report(uid, b.id, (pick + '. ' + $('#repText', sh).value).trim().slice(0, 500)); closeSheet(); toast('Thanks. We’ll look into it.'); } catch (err) { fail(err); e.currentTarget.disabled = false; }
  };
  $('#sheetBack').classList.add('on'); sh.classList.add('on');
}

// ---------------- Chats ----------------
const ago = (ts) => { const s = (Date.now() - new Date(ts).getTime()) / 1000; if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + ' min'; if (s < 86400) return Math.floor(s / 3600) + ' h'; return new Date(ts).toLocaleDateString(undefined, { weekday: 'short' }); };
async function loadChats() {
  try { chatList = await API.chats(uid); renderChats(); } catch (e) { console.error(e); }
}
function renderChats() {
  $('#chatsBody').innerHTML = '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Rareness</span><h1 class="largetitle">Chats</h1><p class="label" style="font-size:14px;line-height:1.45">A chat opens only when you both bump each other. Nobody sees who bumped them.</p></header>' +
    (chatList.length ? '<section aria-label="Conversations" class="hair">' + chatList.map((c) => {
      const p = c.other, last = c.last;
      return '<button class="crow' + (c.unread ? ' unread' : '') + '" data-thread="' + c.id + '">' + bubbleHTML({ w: dimsToW(c.match?.dims), photo: API.photoUrl(p.photo_path) }, 58) +
        '<span class="tx"><div><b>' + esc(p.name || 'Someone') + '</b><time>' + ago(c.at) + '</time></div><p>' + (last ? (last.sender_id === uid ? 'You: ' : '') + esc(last.body) : '') + '</p></span>' +
        (c.unread ? '<span class="udot" aria-label="Unread"></span>' : '') + '</button>';
    }).join('') + '</section>'
    : '<div class="empty">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], plain: true }, 110) + '<h2 class="h2">No chats yet</h2><p class="label" style="font-size:14.5px;line-height:1.45;max-width:280px">Bump people in the Cloud. If they bump you back, you’ll both land here.</p>' +
      '<button class="secondary" style="max-width:220px" id="toCloud">Go to the Cloud</button></div>');
  document.querySelectorAll('[data-thread]').forEach((b) => b.onclick = () => openThread(b.dataset.thread));
  const tc = $('#toCloud'); if (tc) tc.onclick = () => goTab(1);
}
let openChat = null; // { id, draw(message) }
async function openThread(chatId) {
  let c = chatList.find((x) => x.id === chatId);
  if (!c) { await loadChats(); c = chatList.find((x) => x.id === chatId); }
  if (!c) return;
  const p = c.other;
  const head = '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;margin-bottom:16px">' + bubbleHTML({ w: dimsToW(c.match?.dims), photo: API.photoUrl(p.photo_path) }, 84) + '<b style="font-family:var(--serif);font-size:24px;font-weight:400">' + esc(p.name || 'Someone') + '</b>' + (c.match ? '<span class="label">' + c.match.score + '% in common</span>' : '') + '</div>';
  const pg = pushPage(p.name || 'Chat', head + '<div class="thread" id="thread"><div class="spinner" style="align-self:center"></div></div><div style="height:80px"></div>',
    { footer: '<form class="composer glass" id="composer"><label for="msgIn" class="hide">Message</label><input id="msgIn" autocomplete="off" placeholder="Message ' + esc(p.name || '') + '" maxlength="1000"><button class="send" id="sendBtn" aria-label="Send" disabled>' + ICON.send + '</button></form>' });
  const th = pg.querySelector('#thread'), sc = pg.querySelector('.scroll'), inp = pg.querySelector('#msgIn'), sb = pg.querySelector('#sendBtn');
  let msgs = [];
  const draw = () => { th.innerHTML = msgs.map((m) => '<div class="msg ' + (m.sender_id === uid ? 'me' : m.sender_id ? 'them' : 'sys') + '">' + esc(m.body) + '</div>').join(''); sc.scrollTop = sc.scrollHeight; };
  try { msgs = await API.messages(chatId); draw(); } catch (e) { fail(e); }
  API.markRead(uid, chatId).then(loadChats);
  openChat = { id: chatId, add(m) { if (!msgs.some((x) => x.id === m.id)) { msgs.push(m); draw(); API.markRead(uid, chatId); } } };
  inp.oninput = () => { sb.disabled = !inp.value.trim(); };
  pg.querySelector('#composer').onsubmit = async (e) => {
    e.preventDefault();
    const x = inp.value.trim(); if (!x) return;
    inp.value = ''; sb.disabled = true;
    try { openChat?.add(await API.send(uid, chatId, x)); } catch (err) { fail(err); inp.value = x; sb.disabled = false; }
  };
  pg._onPop = () => { openChat = null; loadChats(); };
}


// ---------------- Opening splash (~5 s): the main bubble breathes in and pops, a handful of bubbles drift out
// with real momentum, float up and sway like soap bubbles, then pop one by one ----------------
function runSplash() {
  const sp = $('#splash'), core = $('#splashCore'), word = $('#splashWord'), flash = $('#splashFlash');
  if (!sp || !sp.animate) { if (sp) sp.remove(); return; }
  core.innerHTML = bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 150);
  let done = false, raf = 0;
  const finish = () => {
    if (done) return; done = true;
    sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { cancelAnimationFrame(raf); sp.remove(); };
  };
  sp.addEventListener('click', finish);
  if (reduced) { word.style.opacity = 1; core.style.transform = 'scale(1)'; setTimeout(finish, 900); return; }

  const W = sp.clientWidth, H = sp.clientHeight;
  const ring = (x, y, size, delay) => {
    const r = document.createElement('span'); r.className = 'pring';
    r.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (x - size / 2) + 'px;top:' + (y - size / 2) + 'px';
    sp.appendChild(r);
    r.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1)', opacity: .7, offset: .15 }, { transform: 'scale(1.5)', opacity: 0 }],
      { duration: 460, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  };

  // 1. The main bubble breathes in (0 – 1.6 s)
  word.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  const fill = core.animate([
    { transform: 'scale(.18)' },
    { transform: 'scale(.62,.58)', offset: .45 },
    { transform: 'scale(.9,.93)', offset: .75 },
    { transform: 'scale(1.03,.98)', offset: .9 },
    { transform: 'scale(1)' }
  ], { duration: 1600, easing: 'cubic-bezier(.33,.0,.2,1)', fill: 'forwards' });

  fill.onfinish = () => setTimeout(() => {
    if (done) return;
    // 2. It pops softly (≈1.75 s)
    word.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    core.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.07,1.03)', opacity: 1, offset: .5 }, { transform: 'scale(1.22)', opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    flash.animate([{ transform: 'scale(1)', opacity: .7 }, { transform: 'scale(2.2)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });

    // 3. A few bubbles drift out of it: 3 large, 6 medium, 9 small
    const sizes = [128, 112, 96, 84, 76, 68, 60, 54, 48, 42, 38, 34, 30, 28, 26, 24, 22, 20];
    const B = sizes.map((size, i) => {
      const el = document.createElement('div'); el.className = 'pb';
      el.style.width = el.style.height = size + 'px'; el.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
      el.innerHTML = '<div class="pbf">' + bubbleHTML({ w: oneHot(i % 6), clear: true }, size) + '</div>';
      el.style.transform = 'translate3d(0,0,0) scale(0)';
      sp.appendChild(el);
      const ang = (i / sizes.length) * Math.PI * 2 + (Math.random() - .5) * .5;
      const speed = (330 + Math.random() * 160) * Math.pow(60 / size, .35);
      return { el, f: el.firstChild, r: size / 2, x: Math.cos(ang) * 18, y: Math.sin(ang) * 18, vx: Math.cos(ang) * speed * (W / 390), vy: Math.sin(ang) * speed * .9,
        born: i * 22, grow: 0, ph: Math.random() * 6.28, sw: .9 + Math.random() * .8, alive: true };
    });
    let t0 = performance.now(), last = t0;
    const step = (now) => {
      const dt = Math.min(.033, (now - last) / 1000), el = now - t0; last = now;
      for (const b of B) {
        if (!b.alive) continue;
        if (el < b.born) continue;
        b.grow = Math.min(1, b.grow + dt / .38);
        // drag, gentle buoyancy, a lazy sway
        const drag = Math.exp(-2.4 * dt);
        b.vx *= drag; b.vy *= drag;
        b.vy -= 22 * dt;
        b.vx += Math.sin(el / 1000 * b.sw + b.ph) * 16 * dt;
        // stay on screen with a soft push back from the edges
        const hw = W / 2 - b.r - 14, hh = H / 2 - b.r - 40;
        if (b.x > hw) b.vx -= (b.x - hw) * 22 * dt; if (b.x < -hw) b.vx += (-hw - b.x) * 22 * dt;
        if (b.y > hh) b.vy -= (b.y - hh) * 22 * dt; if (b.y < -hh) b.vy += (-hh - b.y) * 22 * dt;
      }
      // soft nudges so bubbles never overlap much
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], c = B[j]; if (!a.alive || !c.alive || a.grow === 0 || c.grow === 0) continue;
        const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || .01, min = (a.r + c.r) * Math.min(a.grow, c.grow) + 4;
        if (d < min) { const k = (min - d) * 4.5, nx = dx / d, ny = dy / d, ma = c.r / (a.r + c.r), mc = a.r / (a.r + c.r); a.vx -= nx * k * ma; a.vy -= ny * k * ma; c.vx += nx * k * mc; c.vy += ny * k * mc; }
      }
      for (const b of B) {
        if (!b.alive || el < b.born) continue;
        b.x += b.vx * dt; b.y += b.vy * dt;
        // squash and stretch along the direction of travel, plus a soft breathing wobble
        const sp2 = Math.hypot(b.vx, b.vy), st = Math.min(.14, sp2 / 2600), ang = Math.atan2(b.vy, b.vx) * 57.3;
        const br = Math.sin(el / 1000 * 3.2 + b.ph) * .018;
        const g = b.grow < 1 ? 1 - Math.pow(1 - b.grow, 3) * 1 + Math.sin(b.grow * Math.PI) * .08 : 1;
        b.el.style.transform = 'translate3d(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px,0) rotate(' + ang.toFixed(1) + 'deg) scale(' + (g * (1 + st + br)).toFixed(4) + ',' + (g * (1 - st * .8 - br)).toFixed(4) + ') rotate(' + (-ang).toFixed(1) + 'deg)';
      }
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // 4. After floating for a while they pop one by one, smallest first (≈3.9 – 4.7 s)
    setTimeout(() => {
      if (done) return;
      const order = B.slice().sort((a, c) => a.r - c.r);
      order.forEach((b, k) => {
        const delay = k * 42 + Math.random() * 20;
        setTimeout(() => {
          if (done) return;
          b.alive = false;
          b.f.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.1,1.04)', opacity: 1, offset: .55 }, { transform: 'scale(1.28)', opacity: 0 }], { duration: 190, easing: 'ease-in', fill: 'forwards' });
          ring(W / 2 + b.x, H / 2 + b.y, b.r * 2, 90);
        }, delay);
      });
      setTimeout(finish, order.length * 42 + 260);
    }, 2150);
  }, 150);
  setTimeout(finish, 5800); // never longer than this
}

// ---------------- Gate: sign-in, onboarding, access fee ----------------
const SIGNUP = [
  { dim: 'values', prompt: 'What matters most to you in a partner?', opts: ['Honesty', 'Kindness', 'Ambition', 'Humour', 'Loyalty', 'Curiosity'] },
  { dim: 'lifestyle', prompt: 'Your ideal Friday night?', opts: ['Dinner out with friends', 'A cosy night in', 'Dancing until late', 'Trying something new'] },
  { dim: 'personality', prompt: 'Friends would describe you as…', opts: ['Calm', 'Curious', 'Playful', 'Driven', 'Warm', 'Bold'] },
  { dim: 'goals', prompt: 'What are you looking for?', opts: ['A long-term relationship', 'Something that grows slowly', 'Not sure yet', 'New people to meet'] },
  { dim: 'routine', prompt: 'When are you at your best?', opts: ['Early morning', 'During the day', 'Late at night'] }
];
const Q0 = 3; // first quick-test question
const STEPS = Q0 + SIGNUP.length + 2; // basics, photo+city, quick-test intro, questions, interests, about
const gate = $('#gate');
const COUNTRIES = 'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ');
function countryOptions(sel) {
  let names; try { names = new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }); } catch (e) { names = { of: (c) => c }; }
  const list = COUNTRIES.map((c) => [c, names.of(c) || c]).sort((a, b) => a[1].localeCompare(b[1]));
  return '<option value="">Choose…</option>' + list.map(([c, n]) => '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
}
function guessCountry() {
  const m = /-([A-Z]{2})\b/.exec(navigator.language || '');
  return m && COUNTRIES.includes(m[1]) ? m[1] : '';
}
let G = { email: '', step: 0, answers: {}, interests: [] };

function showGate(html, after) {
  gate.hidden = false;
  gate.innerHTML = '<div class="gate-in">' + html + '</div>';
  gate.scrollTop = 0;
  $('#tabbar').classList.add('away'); $('#meBtn').classList.add('away');
  if (after) after();
}
function hideGate() { gate.hidden = true; gate.innerHTML = ''; $('#tabbar').classList.remove('away'); $('#meBtn').classList.remove('away'); }
const stepsBar = (i) => '<div class="steps" aria-label="Step ' + (i + 1) + ' of ' + STEPS + '">' + Array.from({ length: STEPS }, (_, k) => '<span class="' + (k <= i ? 'on' : '') + '"></span>').join('') + '</div>';
const backBtn = '<button class="backlink" data-back>‹ Back</button>';
function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = label; }

function gateUnconfigured() {
  showGate('<span class="brand">Rareness</span><h1 class="largetitle">Almost ready</h1><p class="lead">This copy of Rareness isn’t connected to its database yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the environment, then rebuild. The README explains each step.</p>');
}

function gateSignIn(msg) {
  showGate(
    '<span class="brand">Rareness</span>' +
    '<div style="display:flex;justify-content:center;padding:18px 0 6px">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 150) + '</div>' +
    '<h1 class="largetitle">The people who share the most with you, closest.</h1>' +
    '<p class="lead">A few minutes of daily rituals. An aura read from your answers. And a Cloud where real matches float nearest.</p>' +
    '<div class="grow"></div>' +
    '<form id="emailForm" style="display:flex;flex-direction:column;gap:8px" novalidate>' +
      '<label class="lbl" for="email">Email<input class="field" id="email" type="email" autocomplete="email" inputmode="email" required value="' + esc(G.email) + '" placeholder="you@example.com"></label>' +
      (msg ? '<p class="err" role="alert">' + esc(msg) + '</p>' : '') +
      '<button class="primary" id="emailGo">Continue with email</button>' +
    '</form>' +
    '<p class="fine">We email you a 6-digit code, no password needed. By continuing you confirm you are 18 or older and agree to the Terms and Privacy Policy.</p>',
    () => {
      $('#emailForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = $('#email').value.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { gateSignIn('Enter a valid email address.'); return; }
        G.email = email;
        const b = $('#emailGo'); busy(b, true, 'Sending…');
        try { await API.sendCode(email); gateCode(); } catch (err) { console.error(err); gateSignIn(err.message?.includes('rate') ? 'Too many tries. Wait a minute, then try again.' : 'We couldn’t send the email. Check the address and try again.'); }
      };
    });
}

function gateCode(msg) {
  showGate(
    backBtn + '<span class="brand">Rareness</span><h1 class="largetitle">Check your inbox</h1>' +
    '<p class="lead">We sent a code to ' + esc(G.email) + '. Enter it below, or tap the link in the email.</p>' +
    '<form id="codeForm" style="display:flex;flex-direction:column;gap:8px">' +
      '<label class="lbl" for="code">6-digit code<input class="field code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"></label>' +
      (msg ? '<p class="err" role="alert">' + esc(msg) + '</p>' : '') +
      '<button class="primary" id="codeGo">Sign in</button>' +
    '</form>' +
    '<button class="link" id="resend" style="align-self:flex-start;padding-left:0">Send a new code</button>',
    () => {
      gate.querySelector('[data-back]').onclick = () => gateSignIn();
      $('#code').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); if (e.target.value.length === 6) $('#codeForm').requestSubmit(); };
      $('#code').focus();
      $('#codeForm').onsubmit = async (e) => {
        e.preventDefault();
        const b = $('#codeGo'); busy(b, true, 'Checking…');
        try { const { user } = await API.verifyCode(G.email, $('#code').value); await enter(user); } catch (err) { console.error(err); gateCode('That code didn’t work. Check it, or send a new one.'); }
      };
      $('#resend').onclick = async () => { try { await API.sendCode(G.email); toast('New code sent'); } catch (err) { fail(err); } };
    });
}

function gateOnboard() {
  const i = G.step;
  if (i === 0) {
    const max = new Date(); max.setFullYear(max.getFullYear() - 18);
    showGate(stepsBar(i) + '<h1 class="largetitle">Hello. Who are you?</h1>' +
      '<form id="f" style="display:flex;flex-direction:column;gap:14px" novalidate>' +
      field('obName', 'First name', me.name, 'Your first name', 24, 'given-name') +
      '<label class="lbl" for="obBirth">Date of birth<input class="field" id="obBirth" type="date" max="' + API.dayKey(max) + '" value="' + esc(me.birthdate || '') + '" autocomplete="bday"></label>' +
      '<div class="lbl">I am<div class="chips" style="margin-top:2px">' + [['woman', 'A woman'], ['man', 'A man'], ['nonbinary', 'Non-binary']].map(([v, l]) => '<button type="button" class="chip' + (me.gender === v ? ' on' : '') + '" data-g="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<label class="lbl" for="obCountry">Country<select class="field" id="obCountry">' + countryOptions(me.country || guessCountry()) + '</select></label>' +
      '<div class="lbl">Show me<div class="chips" style="margin-top:2px">' + [['women', 'Women'], ['men', 'Men'], ['everyone', 'Everyone']].map(([v, l]) => '<button type="button" class="chip' + ((me.show_me || 'everyone') === v ? ' on' : '') + '" data-s="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<p class="err" id="err" role="alert" hidden></p><div class="grow"></div><button class="primary">Continue</button></form>',
      () => {
        let gender = me.gender, show = me.show_me || 'everyone';
        gate.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { gender = b.dataset.g; gate.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b)); });
        gate.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { show = b.dataset.s; gate.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('on', x === b)); });
        $('#f').onsubmit = async (e) => {
          e.preventDefault();
          const name = $('#obName').value.trim(), birth = $('#obBirth').value, country = $('#obCountry').value, err = $('#err');
          const say = (m) => { err.textContent = m; err.hidden = false; };
          if (!name) return say('Add your first name.');
          if (!birth) return say('Add your date of birth.');
          if (ageOf(birth) < 18) return say('Rareness is for people 18 and over.');
          if (!gender) return say('Choose how you identify.');
          if (!country) return say('Choose your country. Your Cloud shows people from the same country.');
          try { me = await API.saveProfile(uid, { name, birthdate: birth, gender, show_me: show, country }); G.step++; gateOnboard(); } catch (x) { fail(x); }
        };
      });
  } else if (i === 1) {
    showGate(stepsBar(i) + backBtn + '<h1 class="largetitle">Your bubble</h1><p class="lead">Add a clear photo of you. It sits inside your bubble in everyone’s Cloud.</p>' +
      '<div style="display:flex;justify-content:center;padding:6px 0"><button id="obPhoto" style="border:0;background:none;padding:0;cursor:pointer;position:relative" aria-label="' + (me.photo_path ? 'Change photo' : 'Add a photo') + '">' + bubbleHTML(youObj(), 176) + '<span class="gbtn glass cam" style="position:absolute;right:2px;bottom:2px">' + ICON.cam + '</span></button></div>' +
      field('obCity', 'City', me.city, 'Where you live', 40, 'address-level2') +
      '<p class="err" id="err" role="alert" hidden></p><div class="grow"></div><button class="primary" id="go">Continue</button>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { G.step--; gateOnboard(); };
        $('#obPhoto').onclick = () => pickPhoto(async (blob) => { await savePhoto(blob); gateOnboard(); });
        $('#go').onclick = async () => {
          const city = $('#obCity').value.trim(), err = $('#err');
          if (!me.photo_path) { err.textContent = 'Add a photo to continue.'; err.hidden = false; return; }
          if (!city) { err.textContent = 'Add your city.'; err.hidden = false; return; }
          try { me = await API.saveProfile(uid, { city }); G.step++; gateOnboard(); } catch (x) { fail(x); }
        };
      });
  } else if (i === 2) {
    showGate(stepsBar(i) + backBtn + '<p class="label">Aura quick test</p><h1 class="largetitle">Let’s read your aura</h1>' +
      '<div style="display:flex;justify-content:center;padding:6px 0">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 150) + '</div>' +
      '<p class="lead">Seven quick steps, about a minute. Go with your first instinct. Your answers shape the six colours of your aura, and who floats closest to you.</p>' +
      '<div class="grow"></div><button class="primary" id="go">Start the quick test</button>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { G.step--; gateOnboard(); };
        $('#go').onclick = () => { G.step++; gateOnboard(); };
      });
  } else if (i < Q0 + SIGNUP.length) {
    const q = SIGNUP[i - Q0];
    showGate(stepsBar(i) + backBtn + '<p class="label">Aura quick test · ' + (i - Q0 + 1) + ' of ' + (SIGNUP.length + 2) + '</p><h1 class="largetitle">' + esc(q.prompt) + '</h1>' +
      '<div class="opts" role="radiogroup">' + q.opts.map((o) => '<button class="opt' + (G.answers[q.dim] === o ? ' on' : '') + '" role="radio" aria-checked="' + (G.answers[q.dim] === o) + '" data-o="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { G.step--; gateOnboard(); };
        gate.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => {
          G.answers[q.dim] = b.dataset.o;
          gate.querySelectorAll('[data-o]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
          setTimeout(() => { G.step++; gateOnboard(); }, 260);
        });
      });
  } else if (i === Q0 + SIGNUP.length) {
    showGate(stepsBar(i) + backBtn + '<p class="label">Aura quick test · ' + (SIGNUP.length + 1) + ' of ' + (SIGNUP.length + 2) + '</p><h1 class="largetitle">What do you love?</h1><p class="lead">Pick 3 to 6.</p>' +
      '<div class="chips">' + INTERESTS.map((l) => '<button class="chip' + (G.interests.includes(l) ? ' on' : '') + '" data-int="' + esc(l) + '">' + esc(l) + '</button>').join('') + '</div>' +
      '<div class="grow"></div><button class="primary" id="go"' + (G.interests.length < 3 ? ' disabled' : '') + '>Continue</button>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { G.step--; gateOnboard(); };
        gate.querySelectorAll('[data-int]').forEach((b) => b.onclick = () => {
          const v = b.dataset.int, k = G.interests.indexOf(v);
          if (k >= 0) G.interests.splice(k, 1); else if (G.interests.length < 6) G.interests.push(v); else { toast('Pick up to 6'); return; }
          b.classList.toggle('on', G.interests.includes(v)); $('#go').disabled = G.interests.length < 3;
        });
        $('#go').onclick = () => { G.step++; gateOnboard(); };
      });
  } else if (i === Q0 + SIGNUP.length + 1) {
    showGate(stepsBar(i) + backBtn + '<p class="label">Aura quick test · ' + (SIGNUP.length + 2) + ' of ' + (SIGNUP.length + 2) + '</p><h1 class="largetitle">Describe yourself in a sentence or two</h1>' +
      '<label class="hide" for="obBio">About you</label><textarea id="obBio" maxlength="160" placeholder="What would your best friend say about you?">' + esc(me.bio || '') + '</textarea>' +
      '<p class="fine">Shown on your profile. The AI reads it to shape your aura.</p><div class="grow"></div><button class="primary" id="go" disabled>Finish</button>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { G.step--; gateOnboard(); };
        const ta = $('#obBio'), go = $('#go');
        const ok = () => { go.disabled = ta.value.trim().length < 10; };
        ta.oninput = ok; ok();
        go.onclick = () => finishOnboarding(ta.value.trim());
      });
  }
}

async function finishOnboarding(bio) {
  showGate('<div class="grow"></div><div style="display:flex;justify-content:center">' + bubbleHTML(youObj(), 190) + '</div>' +
    '<h1 class="largetitle" style="text-align:center">Reading your aura…</h1><p class="lead" style="text-align:center;margin:0 auto">This takes a few seconds.</p><div style="display:flex;justify-content:center"><div class="spinner"></div></div><div class="grow"></div>');
  try {
    await API.signupAnswers(uid, [
      ...SIGNUP.map((q) => ({ dim: q.dim, prompt: q.prompt, data: { choice: G.answers[q.dim] } })),
      { dim: 'interests', prompt: 'What do you love?', data: { choices: G.interests } }
    ]);
    me = await API.saveProfile(uid, { bio, interests: G.interests, onboarded: true });
  } catch (e) { fail(e); G.step = Q0 + SIGNUP.length + 1; gateOnboard(); return; }
  try { await API.api('match'); } catch (e) { console.error(e); }
  me = await API.myProfile(uid);
  const aura = dimsToW(me.aura), tot = aura.reduce((a, b) => a + b, 0) || 1;
  showGate('<p class="label">Your aura</p>' +
    '<div style="display:flex;justify-content:center;padding:4px 0">' + bubbleHTML(youObj(), 190) + '</div>' +
    (me.aura_summary ? '<p class="reason-line" style="text-align:center">' + esc(me.aura_summary) + '</p>' : '<p class="lead" style="text-align:center">Your aura will sharpen as you answer the daily rituals.</p>') +
    '<div style="display:flex;flex-direction:column;gap:10px">' + DIMS.map((d, k) => '<div class="reason">' + swatch(k, 24) + '<div class="rt"><div>' + d.label + '<span>' + Math.round(aura[k] / tot * 100) + '%</span></div>' + glassBar(aura[k], k) + '</div></div>').join('') + '</div>' +
    '<p class="fine">The colours around your bubble come from this. On other people’s bubbles, they show why you match.</p>' +
    '<div class="grow"></div><button class="primary" id="go">' + (needsMembership() ? 'Continue' : 'Enter Rareness') + '</button>',
    () => { $('#go').onclick = () => afterOnboarding(); });
}
function afterOnboarding() {
  if (needsMembership()) gatePaywall(); else startApp();
}
const needsMembership = () => config.paywall && !me.paid_at;

function gatePaywall(msg) {
  const price = config.price || '$5';
  showGate('<span class="brand">Rareness</span>' +
    '<div style="display:flex;justify-content:center;padding:10px 0">' + bubbleHTML(youObj(), 150) + '</div>' +
    '<h1 class="largetitle">Your aura is ready. Unlock Rareness.</h1>' +
    '<p class="lead">One payment of ' + esc(price) + ' opens everything, for good.</p>' +
    '<div class="box" style="display:flex;flex-direction:column;gap:6px;font-size:15px"><span>Your Cloud of real matches in your country</span><span>AI matching that learns from every answer</span><span>Bumps and chats with the people you match</span></div>' +
    (msg ? '<p class="err" role="alert">' + esc(msg) + '</p>' : '') +
    '<div class="grow"></div>' +
    '<button class="primary" id="sub">Unlock for ' + esc(price) + '</button>' +
    '<p class="fine">One-time payment through Stripe. No subscription.</p>' +
    '<button class="link" id="out" style="align-self:center;color:var(--ink2)">Sign out</button>',
    () => {
      $('#sub').onclick = (e) => openBilling(e.currentTarget);
      $('#out').onclick = async () => { await API.signOut(); location.reload(); };
    });
}
async function confirmMembership() {
  showGate('<div class="grow"></div><div style="display:flex;justify-content:center"><div class="spinner"></div></div><h1 class="largetitle" style="text-align:center">Confirming your payment…</h1><div class="grow"></div>');
  for (let k = 0; k < 15; k++) {
    me = await API.myProfile(uid);
    if (!needsMembership()) { toast('Welcome to Rareness'); return startApp(); }
    await new Promise((r) => setTimeout(r, 1500));
  }
  gatePaywall('We haven’t received confirmation from Stripe yet. If you paid, reopen the app in a minute.');
}

// ---------------- Boot ----------------
let appStarted = false, unsubscribeMessages = null;
function onEnter(i) {
  if (i === 0) renderAgenda();
  if (i === 2) { renderChats(); loadChats(); }
  if (i === 1) { last = performance.now(); refreshBadges(); if (!cloudLoaded) loadCloud(); }
}
function renderAll() { renderAgenda(); renderChats(); refreshYou(); refreshMeBtn(); refreshBadges(); updateLocks(); }

async function enter(user) {
  uid = user.id;
  try { me = await API.myProfile(uid); } catch (e) {
    // The profile row is created by a database trigger; create it if that hasn't happened yet
    await API.sb.from('profiles').insert({ id: uid }).select().single().then(({ data }) => { me = data; });
    if (!me) { fail(e); return; }
  }
  const billing = new URLSearchParams(location.search).get('billing');
  if (billing) history.replaceState(null, '', location.pathname);
  if (!me.onboarded) { G = { email: G.email, step: 0, answers: {}, interests: [...(me.interests || [])] }; gateOnboard(); return; }
  if (needsMembership()) { if (billing === 'success') confirmMembership(); else gatePaywall(billing === 'cancelled' ? 'Checkout was cancelled. You can try again whenever you like.' : ''); return; }
  startApp();
}
async function startApp() {
  hideGate();
  try { myAnswers = await API.myAnswers(uid); } catch (e) { fail(e); }
  buildCloud(people); renderAll(); paint();
  loadCloud(); loadChats();
  if (!appStarted) {
    appStarted = true;
    requestAnimationFrame(loop);
    setInterval(updateLocks, 60000);
    unsubscribeMessages = API.onMessages((m) => { if (openChat && m.chat_id === openChat.id) openChat.add(m); else loadChats(); });
    // If matching never ran for this person (e.g. sign-up closed early), start it now
    if (!me.aura_updated_at) API.api('match').then(() => { loadCloud(); refreshMe(); }).catch(console.error);
  }
}

async function boot() {
  setLens(0, false);
  runSplash();
  if (!API.configured) { gateUnconfigured(); return; }
  config = await API.getConfig();
  let s = null;
  try { s = await API.session(); } catch (e) { console.error(e); }
  if (!s) {
    gateSignIn();
    // A magic link opened in this tab signs in through the URL
    API.onAuth((sess) => { if (sess && !uid) enter(sess.user); });
    return;
  }
  enter(s.user);
}
boot();

