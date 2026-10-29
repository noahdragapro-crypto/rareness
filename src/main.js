// Ora app: one page, three tabs (Agenda, Cloud, Chats) and a profile page behind the corner button, plus the sign-in,
// onboarding and payment screens in the gate layer above them.
import * as API from './api.js';
import LIB from '../shared/practices.json';
import CITY_DATA from '../shared/cities.json';

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
// What each line of an aura means, and what shapes it (shown behind the (i) buttons)
const DIM_INFO = {
  values: 'What matters most to you: honesty, kindness, growth, family. Shaped by your own words, your reflections, and practices like the values compass, gratitude and loving-kindness.',
  lifestyle: 'How you live your days: calm or social, nature or city, slow mornings or full weekends. Shaped by how you describe your life, walking and nature practices, and offline hours.',
  interests: 'What you love doing and talking about: books, music, art, movement. Shaped by your interests and what you write about.',
  personality: 'Your temperament: energy, humour, how you meet hard moments. Shaped by your meditation, emotion check-ins, self-compassion and the patterns you notice in yourself.',
  goals: 'What you are looking for in friends, community and life. Shaped by who you’d love to meet, your intentions, manifestation and the first steps you take.',
  routine: 'Your rhythm and consistency: how regularly you practise, breathe, move and rest. Shaped by your meditation days, breath work and your streak.'
};
const dimIndex = (k) => DIMS.findIndex((d) => d.key === k);
const dimsToW = (o) => DIMS.map((d) => Math.max(0, Number(o?.[d.key]) || 0));

const sv = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>',
  back: sv('<path d="M15 5l-7 7 7 7"></path>'),
  q: sv('<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2V15"></path><circle cx="12" cy="18.5" r=".5"></circle><circle cx="12" cy="12" r="9.5"></circle>'),
  t: sv('<path d="M4 12h14M13 6l6 6-6 6"></path>'),
  m: sv('<circle cx="12" cy="5.5" r="2"></circle><path d="M12 8.5v4.5M7.5 11.5l4.5 1.5 4.5-1.5M4 19.5c2.5-1.5 5-2.5 8-2.5s5.5 1 8 2.5"></path>'),
  bump: sv('<circle cx="8.5" cy="12" r="5"></circle><circle cx="16.5" cy="12" r="4"></circle>'),
  cam: sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"></path>'),
  more: sv('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>'),
  smile: sv('<circle cx="12" cy="12" r="9.5"></circle><path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"></path><circle cx="9.2" cy="10" r=".6"></circle><circle cx="14.8" cy="10" r=".6"></circle>'),
  guide: sv('<circle cx="9.5" cy="10" r="5.5"></circle><circle cx="17.3" cy="14.8" r="3.4"></circle><circle cx="11.6" cy="19.2" r="1.9"></circle><path d="M6.9 7.6c.6-.9 1.4-1.5 2.4-1.8" stroke-linecap="round"></path>'),
  pen: sv('<path d="M4 20l1.2-4.4L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z"></path><path d="M13.5 7.3l3.2 3.2"></path>'),
  book: sv('<path d="M12 6.5C10.2 5 7.6 4.5 4 4.8v13.4c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7V4.8c-3.6-.3-6.2.2-8 1.7zM12 6.5v13.4"></path>'),
  mic: sv('<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"></path>'),
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>',
  share: sv('<path d="M12 15V4M8 8l4-4 4 4"></path><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"></path>'),
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>'),
  pin: sv('<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"></path><circle cx="12" cy="9" r="2.5"></circle>'),
  work: sv('<rect x="3.5" y="7" width="17" height="12" rx="1"></rect><path d="M9 7V5h6v2"></path>'),
  ruler: sv('<path d="M12 3v18M8 6h4M9 10h3M8 14h4M9 18h3"></path>'),
  lang: sv('<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"></path>')
};
const SIL = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="36" r="17" fill="rgba(17,17,20,.16)"></circle><path d="M14 100C14 70 32 58 50 58s36 12 36 42z" fill="rgba(17,17,20,.16)"></path></svg>';

// ---------------- Daily exercises (the same for everyone on a given day) ----------------
// Self-development, longevity, nature, business and art, plus a few elements and small joys for fun
const INTERESTS = [
  'Longevity', 'Biohacking', 'Breathwork', 'Cold plunge', 'Fasting', 'Nutrition', 'Sleep', 'Meditation', 'Journaling',
  'Stoicism', 'Psychology', 'Philosophy', 'Reading', 'Science', 'Strength', 'Running', 'Yoga', 'Dancing',
  'Nature', 'Animals', 'Hiking', 'Surfing', 'Mountains', 'Ocean', 'Forests', 'Gardening', 'Campfires',
  'Fire', 'Cold', 'Rain', 'Stars', 'Moon', 'Sunrises', 'Silence', 'Saunas', 'Tea',
  'Dogs', 'Cats', 'Vinyl', 'Poetry', 'Chess', 'Fermenting', 'Business', 'Investing', 'AI',
  'Art', 'Photography', 'Design', 'Writing', 'Music', 'Ceramics'
];

// ---------------- App state ----------------
let uid = null, me = null, myAnswers = [], myPractices = [], people = [], chatList = [], config = { paywall: false };
const today = () => API.dayKey();
const ageOf = (b) => (b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null);
// Names are shown in lowercase everywhere, as typed otherwise
const low = (n) => String(n || '').toLocaleLowerCase();
const nameAge = (p) => (p.name ? low(p.name) : 'someone') + (p.age ? ', ' + p.age : '');
function rec(k = today()) {
  const r = { q: false, t: false, m: false };
  for (const a of myAnswers) if (a.day === k && r[a.kind] === false) r[a.kind] = a;
  return r;
}
// A day counts when three things are done: the daily tasks and practices from the library, in any mix
// (the temple counts once, as the Meditate task)
const practicedOn = (k) => [...new Set(myPractices.filter((p) => p.day === k && p.exercise !== 'temple').map((p) => p.exercise))];
// The temple from the library (or as Ora Master's pick) counts as the Meditate task too
const meditated = (k) => Boolean(rec(k).m) || myPractices.some((p) => p.day === k && p.exercise === 'temple');
const dayCount = (k = today()) => { const r = rec(k); return (r.q ? 1 : 0) + (r.t ? 1 : 0) + (meditated(k) ? 1 : 0) + practicedOn(k).length; };
const isDone = (k) => dayCount(k) >= 3;
// The day has three parts: morning, afternoon (from noon) and evening (from 6 pm). The Cloud and chats
// are locked at the start of each part and open with one activity done in that part. Three activities
// in a day open them for the rest of the day (and keep the streak).
const PERIODS = [{ name: 'Morning', from: 0 }, { name: 'Afternoon', from: 12 }, { name: 'Evening', from: 18 }];
const periodOf = (date) => { const h = date.getHours(); return h >= 18 ? 2 : h >= 12 ? 1 : 0; };
const periodNow = () => periodOf(new Date());
// When each of today's activities was done (the daily tasks and library practices; not the journal)
const doneTimes = (k = today()) => myAnswers.filter((a) => a.day === k && ['q', 't', 'm'].includes(a.kind)).map((a) => a.created_at)
  .concat(myPractices.filter((p) => p.day === k).map((p) => p.created_at)).filter(Boolean);
const doneThisPeriod = () => doneTimes().some((ts) => periodOf(new Date(ts)) === periodNow());
const cloudOpen = () => dayCount() >= 3 || doneThisPeriod();
const todayDone = () => isDone(today());
function streak() {
  const d = new Date(); let n = 0;
  if (!isDone(API.dayKey(d))) d.setDate(d.getDate() - 1);
  while (isDone(API.dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function bestStreak() {
  const days = [...new Set(myAnswers.filter((a) => a.kind !== 'signup').map((a) => a.day).concat(myPractices.map((p) => p.day)))].filter(isDone).sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const d = new Date(k + 'T12:00');
    run = prev && (d - prev) / 86400000 < 1.5 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return best;
}
const totalDone = () => myAnswers.filter((a) => a.kind !== 'signup').length + myPractices.filter((p) => p.exercise !== 'temple').length;

// ---------------- Practice library ----------------
const PR = LIB.practices, PRACTICE = Object.fromEntries(PR.map((x) => [x.id, x]));
const sessionsOf = (id) => myPractices.filter((p) => p.exercise === id).length;
// Levels rise with sessions: Seed, Sprout (3), Bloom (10), Radiance (25)
const levelFor = (n) => LIB.levels.reduce((l, x, i) => (n >= x.from ? i + 1 : l), 1);
const levelOf = (id) => levelFor(sessionsOf(id));
const levelName = (l) => LIB.levels[l - 1].name;
const levelDots = (l) => '<span class="ldots" aria-hidden="true">' + [1, 2, 3, 4].map((i) => '<i class="' + (i <= l ? 'on' : '') + '"></i>').join('') + '</span>';
const practiceLen = (x, l) => (x.type === 'write' ? x.chars[l - 1] + '+ characters' : x.mins[l - 1] + ' min');
const typeLabel = (x) => ({ sit: 'Guided', write: 'Writing', do: 'Do it' }[x.type]);

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
const youObj = () => ({ you: true, w: dimsToW(me?.aura), photo: API.photoUrl(me?.photo_path), initial: me?.name ? Array.from(low(me.name))[0] : 'you' });
const noteHTML = (text) => '<div class="note"><div class="nb">' + esc(text) + '</div><i></i><i></i></div>';
// The six lines of an aura, each with an (i) that explains it
function auraLines(w, info = true) {
  const tot = w.reduce((a, b) => a + b, 0) || 1;
  return DIMS.map((d, i) => '<div class="reason-wrap"><div class="reason">' + swatch(i, 24) + '<div class="rt"><div><span class="rlab">' + d.label +
    (info ? '<button type="button" class="info" data-dinfo aria-label="What ' + d.label.toLowerCase() + ' means" aria-expanded="false">i</button>' : '') + '</span><span>' + Math.round(w[i] / tot * 100) + '%</span></div>' + glassBar(w[i], i) + '</div></div>' +
    '<p class="rinfo" hidden>' + DIM_INFO[d.key] + '</p></div>').join('');
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-dinfo]'); if (!b) return;
  const p = b.closest('.reason-wrap').querySelector('.rinfo'), opening = p.hidden;
  // Only one explanation open at a time
  document.querySelectorAll('.rinfo').forEach((x) => { x.hidden = true; });
  document.querySelectorAll('[data-dinfo]').forEach((x) => x.setAttribute('aria-expanded', 'false'));
  p.hidden = !opening; b.setAttribute('aria-expanded', opening);
});
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
// Tabs, in tab-bar order
const TAB = { agenda: 0, meditation: 1, cloud: 2, chats: 3 };
const views = ['#v0', '#v1', '#v2', '#v3'].map((id) => $(id));
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

let wasLocked = null;
function updateLocks() {
  const locked = !cloudOpen() || !setupDone();
  // Just locked (a new part of the day began): close any chat or profile left open over the Cloud or Chats
  if (locked && wasLocked === false && (cur === TAB.cloud || cur === TAB.chats)) {
    while (pages.length) popPage(true);
    toast('A new part of the day: one practice opens the Cloud and your chats again');
  }
  wasLocked = locked;
  document.querySelectorAll('.tab[data-tab="' + TAB.cloud + '"],.tab[data-tab="' + TAB.chats + '"]').forEach((b) => b.classList.toggle('locked', locked));
  [['#cloudLock', 'Cloud'], ['#chatsLock', 'chats']].forEach(([sel, what]) => {
    const el = $(sel); el.hidden = !locked;
    if (locked && !setupDone()) {
      el.innerHTML = '<div class="lock-card"><span style="width:24px;height:24px;display:block">' + ICON.lock + '</span><h2 class="h2">Finish your profile to open your ' + what + '</h2>' +
        '<p class="muted" style="margin:0;font-size:14.5px;line-height:1.45">' + (me?.photo_path ? 'Two short questions left' : 'A photo and two short questions') + ', so we can read your aura and find the people who share the most with you.</p>' +
        '<button class="primary" data-finish>Finish my profile</button></div>';
      el.querySelector('[data-finish]').onclick = () => finishSetup();
    } else if (locked) {
      el.innerHTML = '<div class="lock-card"><span style="width:24px;height:24px;display:block">' + ICON.lock + '</span><h2 class="h2">One practice this ' + PERIODS[periodNow()].name.toLowerCase() + ' opens your ' + what + '</h2>' +
        '<p class="muted" style="margin:0;font-size:14.5px;line-height:1.45">The temple, today’s task, Ora Master’s pick or anything from the library. ' + Math.min(3, dayCount()) + ' of 3 done today; three open everything for the rest of the day.</p>' +
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
  // On the Cloud your own bubble in the middle opens your profile, so the corner button steps aside
  $('#meBtn').classList.toggle('oncloud', cur === TAB.cloud);
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
    // Rows that scroll sideways (like the library's categories) keep their own swipe
    if (e.target.closest && e.target.closest('[data-hscroll]')) return;
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
views.forEach((v, i) => swipeable(v, i === TAB.cloud)); // the Cloud pans with one finger, so there you swipe from the screen edge

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
// Every day: a meditation (done in the Meditation tab, 7 to 15 minutes depending on the day),
// a reflection and an action, both of which change daily.
const REFLECT = [
  ['What comes to your mind when it’s clear?', 'values'], ['What are you grateful for today?', 'values'],
  ['What did your body tell you this morning?', 'routine'], ['Where did you feel most at peace this week?', 'lifestyle'],
  ['What would you like to let go of today?', 'personality'], ['What made you smile in the last day?', 'personality'],
  ['Who would you like to thank, and why?', 'values'], ['What does your peace temple look like today?', 'lifestyle'],
  ['What are you learning about yourself lately?', 'goals'], ['What does a good day feel like to you?', 'lifestyle'],
  ['Which thought keeps coming back to you?', 'personality'], ['When did you last feel fully present?', 'routine'],
  ['What do you want more of in your life?', 'goals'], ['Which fear would you like to make smaller?', 'goals']
];
const ACTIONS = [
  'Go do the first step of something you’ve been putting off.', 'Send a kind message to someone you miss.',
  'Walk for ten minutes without your phone.', 'Drink a glass of water slowly, eyes closed.',
  'Tidy one small corner of your space.', 'Read ten pages of your book.', 'Stretch for five minutes, slowly.',
  'Cook or eat one meal with your full attention.', 'Say thank you to someone today, out loud.',
  'Step outside and look at the sky for one minute.', 'Turn off notifications for one hour.',
  'Write three lines about today.', 'Listen to one song with your eyes closed.', 'Do one kind thing nobody will notice.'
];
const dayNum = (off = 0) => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) + off;
// Today's meditation length, 7 to 15 minutes, the same all day for everyone
const medMinutes = (off = 0) => 7 + ((dayNum(off) * 7 + 3) % 9);
function todayTasks(off = 0) {
  const aura = me?.aura || {}, keys = Object.keys(aura).filter((k) => typeof aura[k] === 'number');
  const weak = keys.length >= 3 ? keys.sort((a, b) => aura[a] - aura[b]).slice(0, 2) : [];
  const pool = REFLECT.filter((r) => weak.includes(r[1])), qs = pool.length ? pool : REFLECT;
  const n = dayNum(off), q = qs[n % qs.length], act = ACTIONS[(n * 5 + 2) % ACTIONS.length], mins = medMinutes(off);
  return [
    { k: 'm', title: 'Meditate', sub: mins + ' minutes in the temple, in the Meditation tab.', dim: 'routine', icon: ICON.m, mins },
    { k: 'q', title: 'Reflect', sub: q[0], dim: q[1], icon: ICON.q },
    { k: 't', title: 'Take an action', sub: act, dim: 'goals', icon: ICON.t }
  ];
}
const dimLabel = (k) => DIMS[dimIndex(k)]?.label || '';
function renderAgenda() {
  const r = rec(), all = todayTasks(), n = Math.min(3, dayCount()), st = streak(), open = cloudOpen();
  // Today's three: the temple, today's task (a reflection one day, an action the next), and Ora Master's pick
  const temple = all[0], task = dayNum() % 2 ? all[2] : all[1], other = task === all[1] ? all[2] : all[1], pick = suggestion && PRACTICE[suggestion.exercise];
  const pickDone = pick && doneToday(pick.id);
  const extra = practicedOn(today()).filter((id) => !pick || id !== pick.id);
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const week = days.map((d, i) => {
    const done = isDone(API.dayKey(d)), isToday = i === 6;
    return '<div class="wd">' + 'SMTWTFS'[d.getDay()] + '<b class="' + (done ? 'done' : '') + (isToday && !done ? ' today' : '') + '">' + (done ? ICON.check : '') + '</b></div>';
  }).join('');
  const row = (attrs, ic, label, title, sub, done) => '<button class="task hi' + (done ? ' done' : '') + '" ' + attrs + '><span class="ic">' + ic + '</span>' +
    '<span class="tx"><em>' + label + '</em><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span><span class="st">' + (done ? ICON.check : '') + '</span></button>';
  $('#agendaBody').innerHTML =
    '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Ora</span><h1 class="largetitle">Agenda</h1><div class="subrow"><span class="label">' + new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) + '</span>' + howButton() + '</div></header>' +
    '<section class="box" style="display:flex;flex-direction:column;gap:12px" aria-label="Streak">' +
      '<div class="head"><div><div class="big">' + st + '</div><div class="label" style="margin-top:4px">day streak</div></div>' +
        '<div class="streakside"><button class="sharebtn" id="shareStreak" aria-label="Share your streak">' + ICON.share + 'Share</button><div class="label" style="text-align:right">best ' + Math.max(bestStreak(), st) + '<br>' + totalDone() + ' exercises</div></div></div>' +
      '<div class="week">' + week + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px"><div class="head" style="font-size:13.5px"><span>' + n + ' of 3 today</span><span class="muted">' + (n === 3 ? 'Streak saved' : (3 - n) + ' to go') + '</span></div>' +
      '<div class="prog">' + [0, 1, 2].map((i) => '<span class="' + (i < n ? 'on' : '') + '"></span>').join('') + '</div></div>' +
      (open ? '<button class="primary" id="openCloud">Open the Cloud</button>' : '<p class="muted" style="margin:0;font-size:13px;line-height:1.45">One task this ' + PERIODS[periodNow()].name.toLowerCase() + ' opens the Cloud and your chats. Three today keep your streak.</p>') +
    '</section>' +
    '<section class="section" aria-label="Today’s three"><h2 class="h2">Today’s three</h2><div style="display:flex;flex-direction:column;gap:6px">' +
      row('data-task="m"', ICON.m, 'The temple', 'Meditate', temple.mins + ' minutes in the temple', r.m) +
      row('data-task="' + task.k + '"', task.icon, 'Today’s task', task.title, task.sub, r[task.k]) +
      (pick ? row(pickDone ? 'data-pickdone' : 'data-practice="' + pick.id + '"', ICON.guide, 'Ora Master’s pick', pick.name, suggestion.reason, pickDone) : '') +
    '</div><p class="label" style="margin:2px 0 0;font-size:13px">Anything from the Meditation library counts too.</p></section>' +
    // The other daily task (a reflection or an action), and anything else practised today
    '<section class="section" aria-label="Also today"><h2 class="h2">Also today</h2><div style="display:flex;flex-direction:column;gap:4px">' +
      '<button class="task' + (r[other.k] ? ' done' : '') + '" data-task="' + other.k + '"><span class="ic">' + other.icon + '</span><span class="tx"><em>Another task</em><b>' + other.title + '</b><span>' + esc(other.sub) + '</span></span>' +
        '<span class="st">' + (r[other.k] ? ICON.check : '') + '</span></button>' +
      extra.map((id) => practiceRow(PRACTICE[id])).join('') + '</div></section>' +
    '<section class="section" aria-label="Journal"><h2 class="h2">Journal</h2><button class="jcard" id="openJournal"><span class="jc-spine"></span>' +
      '<span class="tx"><b>Your journal</b><span>Write as much as you like, and read back your days. Only you can see it.</span></span><span class="chev" aria-hidden="true">›</span></button></section>';
  document.querySelectorAll('#agendaBody [data-task]').forEach((b) => b.onclick = () => {
    const t = all.find((x) => x.k === b.dataset.task);
    if (t.k === 'm') { openTemple(); return; } // the temple is open any time, even after today's session
    if (rec()[t.k]) { toast('Already done today'); return; }
    openSheet(t);
  });
  const oc = $('#openCloud'); if (oc) oc.onclick = () => goTab(TAB.cloud);
  $('#openJournal').onclick = () => openJournal();
  $('#shareStreak').onclick = () => openShareStreak();
  // Ora Master's pick, once done, stays done for the day
  const pd = $('#agendaBody [data-pickdone]'); if (pd) pd.onclick = () => toast('Already done today');
  wirePracticeLinks($('#agendaBody'));
}

// ---------------- The journal ----------------
// Everything you've written, a page per day like a book: your reflections, actions, practice writing,
// check-ins and free journal entries. Past pages can be read, never changed. Today's page takes as
// many entries as you like, through the day; they don't count toward the three a day.
const paras = (t) => String(t || '').split(/\n+/).map((x) => x.trim()).filter(Boolean).map((x) => '<p>' + esc(x) + '</p>').join('');
const clock = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function journalDays(answers, entries) {
  // Only writing: answers with words in them, practice writing, written check-ins and journal entries
  const days = new Map(), add = (day, item) => { if (!days.has(day)) days.set(day, []); days.get(day).push(item); };
  const LABEL = { signup: 'Where it began', q: 'Reflection', t: 'Action' };
  for (const a of answers) {
    const text = String(a.data?.text || '').trim();
    if (text && LABEL[a.kind]) add(a.day, { at: a.created_at, label: LABEL[a.kind], prompt: a.prompt, body: text });
  }
  for (const p of myPractices) {
    const x = PRACTICE[p.exercise], a = p.answer || {}; if (!x) continue;
    if (String(a.entry || '').trim()) add(p.day, { at: p.created_at, label: x.name, body: a.entry });
    if (a.q && String(a.text || '').trim()) add(p.day, { at: p.created_at, label: x.name, prompt: a.q, body: a.text });
  }
  for (const e of entries) add(e.day, { at: e.created_at, label: 'Journal', body: e.body });
  if (!days.has(today())) days.set(today(), []);
  return [...days].sort((a, b) => b[0].localeCompare(a[0])).map(([day, items]) => [day, items.sort((a, b) => a.at.localeCompare(b.at))]);
}
function journalItem(it) {
  return '<article class="jitem"><p class="jmeta">' + clock(it.at) + ' · ' + esc(it.label) + '</p>' +
    (it.prompt ? '<p class="jprompt">' + esc(it.prompt) + '</p>' : '') + '<div class="jtext">' + paras(it.body) + '</div></article>';
}
// One page of the journal. Today's page also has the writing box.
function journalPage(day, items, no, compose = '') {
  const d = new Date(day + 'T12:00'), isToday = day === today();
  return '<section class="jpage' + (isToday ? ' today' : '') + '" aria-label="' + esc(d.toDateString()) + '">' + (isToday ? '<span class="jribbon" aria-hidden="true"></span>' : '') +
    '<div class="jdate"><span>' + (isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'long' })) + '</span><h2>' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) +
    (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '') + '</h2></div>' +
    items.map(journalItem).join('') + compose + '<span class="jno">' + no + '</span></section>';
}
const JOURNAL_OPEN = 3; // pages shown before the archive
async function openJournal() {
  const pg = pushPage('Journal', '<div class="journal" id="jBody"><div class="spinner" style="margin:60px auto"></div></div>');
  const body = pg.querySelector('#jBody');
  let answers = [], entries = [], ready = true;
  try {
    [answers, entries] = await Promise.all([API.allAnswers(uid),
      API.journal(uid).catch((e) => { if (/journal/.test(String(e?.message))) { ready = false; return []; } throw e; })]);
  } catch (e) { fail(e); }
  const draw = () => {
    // Pages are numbered in the order they were written, the first one is page 1
    const days = journalDays(answers, entries), order = new Map(days.map(([day], i) => [day, days.length - i]));
    const pageNo = (day) => order.get(day);
    const written = days.reduce((n, [, items]) => n + items.length, 0), older = days.slice(JOURNAL_OPEN);
    body.innerHTML = '<header class="jcover"><span class="label">Your journal</span><h1 class="largetitle">' + esc(me?.name ? low(me.name) + '’s pages' : 'Your pages') + '</h1>' +
      '<p class="label">' + written + ' entr' + (written === 1 ? 'y' : 'ies') + ' · only you can read it</p></header>' +
      days.slice(0, JOURNAL_OPEN).map(([day, items]) => journalPage(day, items, pageNo(day), day !== today() ? '' : '<div class="jcompose">' + (ready
        ? '<div class="writebox"><label class="hide" for="jWrite">Write in today’s page</label><textarea id="jWrite" maxlength="4000" placeholder="' + (items.length ? 'Keep writing…' : 'Dear journal…') + '"></textarea>' + micButton('jMic') + '</div>' +
          '<button class="primary" id="jAdd" disabled>Add to today’s page</button><p class="fine">Journal entries are just for you. They don’t count toward your three a day.</p>'
        : '<p class="fine">Writing in the journal needs database update 0009.</p>') + '</div>')).join('') +
      (older.length ? '<button class="jarchive" id="jArchive"><span class="tx"><b>Reflecting</b><span>' + older.length + ' older page' + (older.length === 1 ? '' : 's') + ', each in one sentence. Find any day.</span></span><span class="chev" aria-hidden="true">›</span></button>' : '');
    const ab = body.querySelector('#jArchive'); if (ab) ab.onclick = () => openReflecting(older, pageNo);
    const ta = body.querySelector('#jWrite'); if (!ta) return;
    const add = body.querySelector('#jAdd'), ok = () => { add.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.max(110, ta.scrollHeight) + 'px'; };
    ta.oninput = ok;
    body.querySelector('#jMic').onclick = () => toggleDictation(ta, body.querySelector('#jMic'), ok);
    add.onclick = async () => {
      stopDictation(); add.disabled = true;
      try { entries.unshift(await API.addJournal(uid, ta.value.trim().slice(0, 4000))); draw(); toast('Added to today’s page'); }
      catch (e) { fail(/journal/.test(String(e?.message)) ? { message: 'Writing in the journal needs database update 0009.' } : e); add.disabled = false; }
    };
  };
  draw();
  pg._onPop = () => stopDictation();
}
// Reflecting: older pages by month, each summed up in one sentence, with a month filter and a date search
const summaries = {}; // day -> sentence, kept for the session
async function loadSummaries(days) {
  const want = days.filter((d) => !(d in summaries));
  for (let i = 0; i < want.length; i += 40) {
    try { Object.assign(summaries, await API.journalSummaries(want.slice(i, i + 40))); } catch (e) { console.warn('summaries', e.message); return; }
  }
}
function openReflecting(days, pageNo) {
  const monthOf = (day) => new Date(day + 'T12:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const months = [...new Set(days.map(([day]) => monthOf(day)))];
  let month = '', date = '';
  const pg = pushPage('Reflecting', '<div class="journal"><header class="jcover"><span class="label">Your journal</span><h1 class="largetitle">Reflecting</h1>' +
      '<p class="label">' + days.length + ' page' + (days.length === 1 ? '' : 's') + ', each in one sentence</p></header>' +
    '<div class="jfilter"><label class="lbl" for="jDate">Find a day<input class="field" id="jDate" type="date" min="' + days[days.length - 1][0] + '" max="' + days[0][0] + '"></label>' +
      '<div class="chips" data-hscroll><button type="button" class="chip on" data-m="">All</button>' + months.map((m) => '<button type="button" class="chip" data-m="' + esc(m) + '">' + esc(m) + '</button>').join('') + '</div></div>' +
    '<div id="jList"></div></div>');
  const list = pg.querySelector('#jList'), dateIn = pg.querySelector('#jDate');
  const row = ([day, items], i) => {
    const d = new Date(day + 'T12:00'), line = summaries[day] || String(items[0]?.body || '').split('\n')[0];
    return '<button class="jrow" data-i="' + i + '"><span class="jd"><b>' + d.getDate() + '</b><span>' + d.toLocaleDateString(undefined, { weekday: 'short' }) + '</span></span>' +
      '<span class="tx"><span class="jsum' + (summaries[day] ? '' : ' wait') + '">' + esc(line) + '</span><span class="jcount">' + items.length + ' entr' + (items.length === 1 ? 'y' : 'ies') + ' · page ' + pageNo(day) + '</span></span></button>';
  };
  const draw = () => {
    const shown = days.map((x, i) => [x, i]).filter(([[day]]) => (date ? day === date : !month || monthOf(day) === month));
    if (!shown.length) {
      // Nothing written that day: offer the closest days that have a page
      const near = days.map((x, i) => [x, i]).sort((a, b) => Math.abs(new Date(a[0][0]) - new Date(date)) - Math.abs(new Date(b[0][0]) - new Date(date))).slice(0, 2);
      list.innerHTML = '<p class="label" style="text-align:center;margin:8px 0 14px">Nothing written on that day. The closest pages:</p><div class="jmonth">' + near.map(([x, i]) => row(x, i)).join('') + '</div>';
    } else {
      const groups = new Map();
      shown.forEach(([x, i]) => { const m = monthOf(x[0]); if (!groups.has(m)) groups.set(m, []); groups.get(m).push(row(x, i)); });
      list.innerHTML = [...groups].map(([m, rows]) => '<section class="jmonth" aria-label="' + esc(m) + '"><h2>' + esc(m) + '</h2>' + rows.join('') + '</section>').join('');
    }
    list.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => openJournalDay(days, +b.dataset.i, pageNo));
  };
  pg.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
    month = b.dataset.m; date = ''; dateIn.value = '';
    pg.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b)); draw();
  });
  dateIn.onchange = () => { date = dateIn.value; if (date) pg.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', !x.dataset.m)); month = ''; draw(); };
  draw();
  loadSummaries(days.map(([day]) => day)).then(draw);
}
// One archived page, with the pages before and after it a tap away
function openJournalDay(days, i, pageNo) {
  const pg = pushPage('Journal', '<div class="journal" id="jDay"></div>');
  const box = pg.querySelector('#jDay');
  const show = (j) => {
    i = j; const [day, items] = days[i];
    box.innerHTML = (summaries[day] ? '<p class="jsumtop">' + esc(summaries[day]) + '</p>' : '') + journalPage(day, items, pageNo(day)) +
      '<div class="jnav"><button class="secondary" data-to="' + (i + 1) + '"' + (i + 1 < days.length ? '' : ' disabled') + '>‹ Older</button>' +
      '<button class="secondary" data-to="' + (i - 1) + '"' + (i > 0 ? '' : ' disabled') + '>Newer ›</button></div>';
    box.querySelectorAll('[data-to]').forEach((b) => b.onclick = () => { show(+b.dataset.to); pg.querySelector('.scroll').scrollTo(0, 0); });
  };
  show(i);
}

// ---------------- Share your streak (Instagram Story) ----------------
// A 1080×1920 picture: your bubble with your photo and aura ring, your name, your streak and the week,
// and the app's name. Nothing else about you. Shared through the phone's share sheet (Instagram → Story).
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
async function storyImage() {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  await Promise.all(['italic 84px "Instrument Serif"', '110px "Instrument Serif"', '40px "Instrument Sans"'].map((f) => document.fonts.load(f).catch(() => {})));
  const photo = me?.photo_path ? await loadImg(API.photoUrl(me.photo_path)).catch(() => null) : null;
  // Soft iridescent sky
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fdfcff'); bg.addColorStop(1, '#f5f2ff'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  [['#F5A6D8', 120, 260, 520], ['#8FE8E3', 980, 620, 480], ['#B89CFF', 180, 1300, 560], ['#FFF3A6', 940, 1600, 460], ['#6FB7FF', 560, 1880, 420], ['#9FE5B5', 900, 120, 380]].forEach(([col, cx, cy, r]) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
  x.textAlign = 'center'; x.fillStyle = '#111114';
  x.font = 'italic 84px "Instrument Serif"'; x.fillText('Ora', W / 2, 220);
  // The bubble
  const cx = W / 2, cy = 800, r = 320, w = dimsToW(me?.aura), tot = w.reduce((a, b) => a + b, 0);
  x.save(); x.filter = 'blur(28px)'; x.fillStyle = 'rgba(17,17,20,.16)'; x.beginPath(); x.ellipse(cx, cy + r + 30, r * .7, 38, 0, 0, Math.PI * 2); x.fill(); x.restore();
  x.save(); x.beginPath(); x.arc(cx, cy, r * .968, 0, Math.PI * 2); x.clip();
  if (photo) { const s = Math.max((r * 2) / photo.width, (r * 2) / photo.height); x.drawImage(photo, cx - photo.width * s / 2, cy - photo.height * s / 2, photo.width * s, photo.height * s); }
  else {
    const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#f4f4f5'); g.addColorStop(1, '#d9d9dd'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = '#111114'; x.font = 'italic 190px "Instrument Serif"'; x.textBaseline = 'middle'; x.fillText(me?.name ? Array.from(low(me.name))[0] : 'o', cx, cy); x.textBaseline = 'alphabetic';
  }
  const glass = x.createRadialGradient(cx, cy, r * .8, cx, cy, r); glass.addColorStop(0, 'rgba(255,255,255,0)'); glass.addColorStop(.6, 'rgba(255,255,255,.28)'); glass.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = glass; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore();
  // Aura ring: one soft arc per colour, the same as in the app
  const ring = x.createConicGradient ? x.createConicGradient(-Math.PI / 6 - Math.PI / 2, cx, cy) : null;
  if (ring && tot) {
    let a = 0, first = null; const stops = [];
    w.forEach((v, i) => { if (!v) return; const span = v / tot; if (!first) first = DIMS[i].c; stops.push([a + span / 2, DIMS[i].c]); a += span; });
    ring.addColorStop(0, first); stops.forEach(([o, col]) => ring.addColorStop(o, col)); ring.addColorStop(1, first);
  }
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.arc(cx, cy, r * .962, 0, Math.PI * 2, true); x.fillStyle = ring || '#d9d9e0'; x.fill();
  x.lineWidth = 3; x.strokeStyle = 'rgba(17,17,20,.2)'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  // Glass highlights
  [[-1, 24], [1, -24]].forEach(([side, deg]) => {
    x.save(); x.translate(cx + side * r * .7, cy - r * .22); x.rotate(deg * Math.PI / 180); x.filter = 'blur(3px)';
    const g = x.createLinearGradient(0, -r * .32, 0, r * .32); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,.05)');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, r * .15, r * .32, 0, 0, Math.PI * 2); x.fill(); x.restore();
  });
  x.save(); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 4; x.beginPath(); x.ellipse(cx, cy + r * .78, r * .38, r * .08, 0, 0, Math.PI * 2); x.stroke(); x.restore();
  // Name, streak and the week
  x.fillStyle = '#111114'; x.font = '110px "Instrument Serif"'; x.fillText(me?.name ? low(me.name) : 'me', W / 2, 1290);
  x.font = '300px "Instrument Serif"'; x.fillText(String(streak()), W / 2, 1600);
  x.fillStyle = '#5b5b63'; x.font = '40px "Instrument Sans"'; x.fillText('day streak', W / 2, 1670);
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dx = W / 2 + (i - 3) * 96, dy = 1770, done = isDone(API.dayKey(d));
    if (done) { const g = x.createLinearGradient(dx - 26, dy - 26, dx + 26, dy + 26); g.addColorStop(0, '#F5A6D8'); g.addColorStop(.5, '#B89CFF'); g.addColorStop(1, '#8FE8E3'); x.fillStyle = g; }
    else x.fillStyle = 'rgba(255,255,255,.75)';
    x.beginPath(); x.arc(dx, dy, 26, 0, Math.PI * 2); x.fill();
    x.lineWidth = 2; x.strokeStyle = done ? 'rgba(255,255,255,.9)' : 'rgba(17,17,20,.14)'; x.stroke();
    x.fillStyle = done ? '#fff' : '#8d8d95'; x.font = '24px "Instrument Sans"'; x.textBaseline = 'middle'; x.fillText('SMTWTFS'[d.getDay()], dx, dy + 1); x.textBaseline = 'alphabetic';
  }
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
async function openShareStreak() {
  const sh = $('#sheet');
  sh.setAttribute('aria-label', 'Share your streak');
  sh.innerHTML = '<div class="grab"></div><p class="label">Share your streak</p><div class="storyprev"><div class="spinner"></div></div>' +
    '<div class="sharerow"><button class="secondary" id="storySave" disabled>Save image</button><button class="primary" id="storyShare" disabled>' + ICON.share + 'Share to your story</button></div>' +
    '<p class="fine" style="margin-top:8px">Only your bubble, your name and your streak. In the share menu, choose Instagram, then Story.</p>';
  $('#sheetBack').classList.add('on'); sh.classList.add('on');
  const blob = await storyImage().catch((e) => { console.error(e); return null; });
  if (!blob) { sh.querySelector('.storyprev').innerHTML = '<p class="label">Couldn’t draw the picture. Try again.</p>'; return; }
  const url = URL.createObjectURL(blob), file = new File([blob], 'ora-streak.png', { type: 'image/png' });
  sh.querySelector('.storyprev').innerHTML = '<img src="' + url + '" alt="Your Ora streak picture">';
  const save = () => { const a = document.createElement('a'); a.href = url; a.download = 'ora-streak.png'; a.click(); toast('Saved. Add it to your story from Instagram'); };
  const sb = sh.querySelector('#storySave'), sp = sh.querySelector('#storyShare');
  sb.disabled = sp.disabled = false;
  sb.onclick = save;
  sp.onclick = async () => {
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); closeSheet(); } catch (e) { if (e.name !== 'AbortError') save(); } }
    else save();
  };
}

// ---------------- Exercise sheet ----------------

function openSheet(t) {
  const sh = $('#sheet');
  sh.setAttribute('aria-label', t.title);
  sh.innerHTML = '<div class="grab"></div>';
  const body = document.createElement('div'); sh.appendChild(body);
  const head = (h) => '<p class="label">' + t.title + ' · ' + dimLabel(t.dim) + '</p><h2>' + esc(h) + '</h2>';
  if (t.k === 'q') {
    body.innerHTML = head(t.sub) + '<label for="qAns" class="label" style="display:block;margin-bottom:6px">Your answer</label><textarea id="qAns" maxlength="300" placeholder="Whatever comes, in a few words"></textarea><p class="fine" style="margin:6px 0 10px">Only you see this. It quietly shapes your aura.</p><button class="primary" id="qSave" disabled>Save answer</button>';
    const ta = $('#qAns', body), bt = $('#qSave', body);
    ta.oninput = () => { bt.disabled = ta.value.trim().length < 3; };
    bt.onclick = () => complete(t, { text: ta.value.trim() }, 'Saved. Only you can see it.', bt);
  } else if (t.k === 't') {
    body.innerHTML = head(t.sub) + '<label for="tAns" class="label" style="display:block;margin-bottom:6px">How did it go? (optional)</label><textarea id="tAns" maxlength="200" placeholder="A few words, if you like"></textarea><p class="fine" style="margin:6px 0 10px">Only you see this.</p><button class="primary" id="tSave">Done</button>';
    const bt = $('#tSave', body);
    bt.onclick = () => complete(t, { text: $('#tAns', body).value.trim() }, 'Done. Keep going.', bt);
  }
  $('#sheetBack').classList.add('on'); sh.classList.add('on');
  const f = sh.querySelector('textarea'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 450);
}
function closeSheet() { $('#sheet').classList.remove('on'); $('#sheetBack').classList.remove('on'); }
$('#sheetBack').onclick = closeSheet;
let matching = false;
// After any task or practice: say what it opened, and refresh the aura and matches when the Cloud opens
function afterDone(wasOpen, wasDone, msg) {
  if (!wasDone && todayDone()) toast('Three today. Your streak is safe.');
  else if (!wasOpen && cloudOpen()) toast('The Cloud and chats are open.');
  else if (msg) toast(msg);
  if (((!wasOpen && cloudOpen()) || (!wasDone && todayDone())) && !matching) {
    matching = true;
    API.api('match').then(loadCloud).then(() => refreshMe()).catch(console.error).finally(() => { matching = false; });
  }
}
async function complete(t, data, msg, btn) {
  if (btn) btn.disabled = true;
  const was = todayDone(), wasOpen = cloudOpen();
  try {
    const row = await API.saveAnswer(uid, { day: today(), kind: t.k, dim: t.dim, prompt: t.k === 'm' ? t.title : t.sub, data });
    myAnswers = myAnswers.filter((a) => !(a.day === row.day && a.kind === row.kind)).concat(row);
  } catch (e) { if (btn) btn.disabled = false; fail(e); return; }
  closeSheet(); renderAgenda(); renderMeditation(); updateLocks();
  afterDone(wasOpen, was, msg);
}

// ---------------- Meditation: the page, the temple, and present bubbles ----------------
// Focus bubbles: the first within 45 seconds of opening the app, then one every 10 to 12 minutes
const FOCUS_FIRST = [20, 45], FOCUS_EVERY = [600, 720];
let libCat = '';
function renderMeditation() {
  const box = $('#medBody'); if (!box) return;
  const t = todayTasks().find((x) => x.k === 'm'), done = Boolean(rec().m), mins = t.mins, n = Math.min(3, dayCount());
  const list = PR.filter((x) => !libCat || x.cat === libCat);
  box.innerHTML =
    '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Ora</span><h1 class="largetitle">Meditation</h1><div class="subrow"><span class="label">' + n + ' of 3 today · ' + PR.length + ' practices</span>' + howButton() + '</div></header>' +
    suggestionCard() +
    '<section class="temple-card" aria-label="The temple">' +
      '<div class="temple-mini" aria-hidden="true">' + crackSVG() + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px"><h2 class="h2" style="color:#fff">The temple · today’s meditation</h2>' +
      '<p style="margin:0;color:rgba(255,255,255,.7);font-size:14.5px;line-height:1.45">' + (done ? 'Done for today. The temple stays open whenever you need it.' : 'A dark, quiet room with soft music. Today’s session is <b style="color:#fff;font-weight:500">' + mins + ' minutes</b>.') + '</p></div>' +
      '<button class="primary light" id="enterTemple">Enter the temple</button>' +
    '</section>' +
    '<section class="section" aria-label="Library"><h2 class="h2">Library</h2>' +
      '<div class="catrow" role="tablist" data-hscroll>' + [''].concat(LIB.categories).map((c) => '<button role="tab" aria-selected="' + (c === libCat) + '" data-cat="' + esc(c) + '">' + esc(c || 'All') + '</button>').join('') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px">' + list.map(practiceRow).join('') + '</div></section>' +
    '<section class="section" aria-label="How practice works"><h2 class="h2">How practice works</h2>' +
      '<p class="explain">Every practice has four levels: ' + LIB.levels.map((l) => l.name).join(', ') + '. You move up after ' + LIB.levels.slice(1).map((l) => l.from).join(', ') + ' sessions, and sessions grow a little deeper at each level.</p>' +
      '<p class="explain">Three a day, from your daily tasks or from this library, opens the Cloud and your chats. The more you practise, the more your aura reflects who you really are, and the better your matches. After each practice, one short question helps us understand you; only our AI reads your answers.</p>' +
      '<p class="explain">People you’ve bumped into can see which practices you do most, and join you.</p></section>' +
    '<section class="section" aria-label="Focus bubbles"><h2 class="h2">Focus bubbles</h2>' +
      '<div style="display:flex;gap:14px;align-items:center"><div style="flex:none">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 64) + '</div>' +
      '<p class="explain" style="margin:0">Soon after you open Ora, and then every ten minutes or so, a bubble floats up over whatever you’re doing. Pop it: you’re here, now.</p></div></section>';
  box.querySelector('#enterTemple').onclick = () => openTemple();
  box.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { libCat = b.dataset.cat; renderMeditation(); });
  wirePracticeLinks(box);
}
function practiceRow(x) {
  const l = levelOf(x.id), doneToday = myPractices.some((p) => p.exercise === x.id && p.day === today());
  return '<button class="task prow' + (doneToday ? ' done' : '') + '" data-practice="' + x.id + '"><span class="tx"><em>' + esc(x.cat) + ' · ' + typeLabel(x) + ' · ' + practiceLen(x, l) + '</em><b>' + esc(x.name) + '</b>' +
    '<span class="plevel">' + levelDots(l) + levelName(l) + '</span></span><span class="st">' + (doneToday ? ICON.check : '') + '</span></button>';
}
function wirePracticeLinks(root) {
  root.querySelectorAll('[data-practice]').forEach((b) => b.onclick = () => openPractice(b.dataset.practice));
  root.querySelectorAll('[data-guide]').forEach((b) => b.onclick = () => openGuide());
  root.querySelectorAll('[data-how]').forEach((b) => b.onclick = () => openHowItWorks());
}
const howButton = () => '<button class="howbtn" data-how aria-label="How we build your aura">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 14) + '<span>How we build your aura</span></button>';

// ---------------- How we build your aura (from the Agenda and Meditation) ----------------
function openHowItWorks() {
  const clear = (sz, w = [1, 1, 1, 1, 1, 1]) => bubbleHTML({ w, clear: true }, sz);
  const sec = (title, inner) => '<section class="howsec"><h2 class="h2">' + title + '</h2>' + inner + '</section>';
  const p = (t) => '<p class="explain">' + t + '</p>';
  const aura = me?.aura ? dimsToW(me.aura) : DIMS.map(() => 1);
  // A little Cloud of glass bubbles, larger near the middle
  const cloud = '<div class="howcloud" aria-hidden="true">' +
    [[50, 50, 60], [20, 32, 46, [1, 0, 1, 0, 1, 0]], [80, 28, 38, [0, 1, 0, 1, 0, 1]], [83, 74, 30, [1, 1, 0, 0, 1, 1]], [22, 76, 26, [0, 0, 1, 1, 1, 0]], [52, 12, 18], [60, 88, 14]]
      .map(([x, y, sz, w]) => '<span style="left:' + x + '%;top:' + y + '%;width:' + sz + 'px;height:' + sz + 'px">' + clear(sz, w) + '</span>').join('') + '</div>';
  const html = '<div class="how">' +
    '<header class="howtop"><span class="label">How Ora works</span><h1 class="largetitle">How we build your aura</h1></header>' +
    '<section class="howhero">' + bubbleHTML(youObj(), 128) + '<p class="reason-line">The ring of colours around your bubble is your aura.</p></section>' +

    sec('Your aura', p('Six colours describe who you are and what you bring to others. It begins with your two answers at sign-up, then grows with everything you practise. Our AI reads it all and updates the colours.') +
      '<div class="box howlines">' + auraLines(aura) + '<p class="fine" style="margin:0">Tap <span class="info static">i</span> to see what a line means. The percentage is that colour’s share of your aura.</p></div>') +

    sec('Three a day', p('Three tasks a day keep your streak. Any task counts, and your Agenda highlights three: the temple, today’s task, and Ora Master’s pick.') +
      '<div class="box howday">' + [['Morning', 'One task opens the Cloud and your chats until noon.'], ['Afternoon', 'From noon they lock again, until one task this afternoon.'], ['Evening', 'From 6 pm, the same: one task this evening.']].map(([t, d]) => '<div><b>' + t + '</b><span>' + d + '</span></div>').join('') + '</div>' +
      p('Ideally one in the morning, one in the afternoon and one in the evening. Three in a day, at any time, open everything for the rest of the day. Fewer than three and the streak starts again.') +
      '<div class="temple-card howtemple"><div class="temple-mini" style="height:84px" aria-hidden="true">' + crackSVG() + '</div><p>Meditation happens in the temple: a dark room, a crack of light that breathes, soft music, for 7 to 15 minutes depending on the day.</p></div>') +

    sec('The practices', p(PR.length + ' practices in ' + LIB.categories.length + ' groups, from breath work to journaling and manifestation. Each is one of three kinds:') +
      '<div class="howkinds">' + [['Guided', 'In the temple room, with gentle cues.'], ['Writing', 'A prompt and a private page.'], ['Do it', 'A small act in real life.']].map(([t, d]) => '<div class="box"><b>' + t + '</b><span>' + d + '</span></div>').join('') + '</div>' +
      p('Each has four levels. Return to it and you go deeper: longer sessions, more writing. What you do often weighs more in your aura.') +
      '<div class="box howlevels">' + LIB.levels.map((l, i) => '<div><span class="plevel">' + levelDots(i + 1) + '<b>' + l.name + '</b></span><span class="label">' + (l.from ? 'after ' + l.from + ' sessions' : 'to begin') + '</span></div>').join('') + '</div>') +

    sec('A question after each one', p('When you finish, one short question slides up. A few words, a card, or a few options. You can always skip it.') +
      '<div class="howcheck" aria-hidden="true"><span class="label">One question · The temple</span><b>How did your mind feel?</b><div class="cicards">' + ['Still', 'Busy', 'Heavy', 'Light'].map((o, i) => '<span class="cicard' + (i === 0 ? ' on' : '') + '">' + o + '</span>').join('') + '</div></div>' +
      p('It helps us understand what you feel and need, so your suggestions and the people around you fit you better.')) +

    sec('Focus bubbles', '<div class="howrow"><div style="flex:none">' + clear(64) + '</div><p class="explain" style="margin:0">Soon after you open Ora, and every ten minutes or so after, a bubble floats over the screen. Pop it, and come back to the present.</p></div>') +

    sec('Ora Master', p('Your guide. Each day it suggests one practice for what you seem to need, and it answers your questions about meditation and your aura. You’ll find it at the top of your Chats.')) +

    sec('The Cloud', cloud + p('The community floats around you. The more you share with someone, the bigger and closer they appear, and the colours around their bubble show what you have in common. Empty bubbles are spots waiting for new people.')) +

    sec('Bumping into people', p('Bump someone you’d like to know. They won’t find out unless they bump you back. When you both do, a chat opens, where you can talk, send stickers and GIFs, and share practices to do together.')) +

    sec('What stays private', p('Your answers, your writing and your check-ins are read only by our AI. Others see your photo, name, age if you gave it, status, about and interests and, after a mutual bump, the practices you do most.')) +
    '</div>';
  pushPage('How we build your aura', html);
}

// ---------------- Questions and answers (from the profile only) ----------------
function openFAQ() {
  const price = config.price || '$5';
  const QA = [
    ['Getting started', 'Your account and the basics', [
      ['Is Ora a dating app?', 'No. Ora is a community for making friends who share your way of living: presence, practice and kindness.'],
      ['What do I need to create an account?', 'Just your first name and your email. Everything else, like your birthday, city and photo, can be added later from your profile.'],
      ['How do I log back in?', 'Enter the same email on the “Log in” screen. There’s no password for now.'],
      ['Does Ora cost anything?', config.paywall ? 'One payment of ' + price + ' opens everything, for good. No subscription.' : 'Ora is free while the community is growing.']
    ]],
    ['Your day', 'Three practices, morning to evening', [
      ['What counts toward my three a day?', 'Anything: the temple, today’s task, Ora Master’s pick, or any practice from the Meditation library. Each different practice counts once a day.'],
      ['Why can’t I open the Cloud or Chats?', 'They need a finished profile (a photo and your two answers), and one practice in the current part of the day: the morning, the afternoon (from noon) or the evening (from 6 pm). Three practices in a day open them for the rest of the day.'],
      ['Why did the Cloud lock again this afternoon?', 'Each part of the day starts locked. One practice this afternoon opens it until 6 pm, or do three in the day to keep it open all day.'],
      ['Can I share my streak?', 'Yes: tap Share in the streak box on your Agenda. It makes a picture with your bubble, your name, your streak and the week, nothing else. Choose Instagram, then Story, or save the image.'],
      ['What happens if I miss a day?', 'Your streak starts again when a day ends with fewer than three. Your levels and aura stay.']
    ]],
    ['Practice', 'The library, the temple and focus bubbles', [
      ['How do levels work?', 'Every practice has four levels: ' + LIB.levels.map((l) => l.name + (l.from ? ' (after ' + l.from + ' sessions)' : '')).join(', ') + '. Each level goes a little deeper.'],
      ['How long is today’s meditation?', 'Between 7 and 15 minutes, depending on the day. The Meditation tab shows today’s length.'],
      ['Can I leave a practice before it ends?', 'Yes, anytime. It only counts once its time is up, or once you’ve written enough for its level.'],
      ['There’s no sound in the temple.', 'Check your volume, and tap “Sound on” at the top right. If it says “Tap for sound”, one tap starts it.'],
      ['Why doesn’t my phone vibrate in the temple?', 'iPhones don’t let websites vibrate, so the temple plays soft music instead. Android phones vibrate gently.'],
      ['What are focus bubbles?', 'A bubble that floats over the app soon after you open it, then every ten minutes or so. Pop it: it’s a reminder to come back to the present.'],
      ['What is the journal?', 'At the bottom of the Agenda. It keeps everything you’ve written, a page per day: your reflections, practice writing and check-ins, plus anything you add. Write as many entries a day as you like. Pages can’t be changed once written, and journal entries don’t count toward your three a day. Older pages are in Reflecting, each summed up in one sentence by our AI; it reads your journal only for that.'],
      ['What is Ora Master?', 'Your guide in the app. It suggests one practice a day and answers questions about meditation, your practice and your aura. It’s at the top of your Chats.']
    ]],
    ['Your aura', 'How it’s made and why it moves', [
      ['How is my aura made?', 'Our AI reads your two answers from sign-up, your daily answers, the practices you do and your check-ins, and shows how strongly each of the six colours runs through you.'],
      ['Why did my aura change?', 'It updates as you practise and answer. The more you practise, the more it reflects who you are today.'],
      ['Why is someone big and close in my Cloud?', 'You have a lot in common: your words, your practice and what you’re each hoping to find.']
    ]],
    ['Friends', 'Bumps and chats', [
      ['How does bumping work?', 'Tap Bump on someone’s profile. They won’t know, unless they bump you too. Then a chat opens for both of you.'],
      ['How do I share a practice with a friend?', 'In a chat, tap the smiley button, then Practices, and pick one. They get a card to start it.']
    ]],
    ['Privacy and safety', 'What others see, and what they never do', [
      ['What can people see about me?', 'Your photo, name, age, status, about, interests and the information on your profile. After you bump into each other, also your latest practices. Never your answers or writing.'],
      ['Who reads my answers?', 'Nobody. Only our AI reads them, to shape your aura and suggestions.'],
      ['Are my conversations with Ora Master private?', 'They’re saved on your phone, and your messages are sent to our AI to answer you. Nobody else reads them.'],
      ['Someone is bothering me.', 'Open their profile and tap Block or Report. Blocking hides you from each other and stops messages.']
    ]],
    ['Your profile', 'Changing or leaving', [
      ['How do I change my photo or details?', 'Open your profile and tap Edit profile. Tap the note above your bubble to change your status.'],
      ['How do I delete my account?', 'At the bottom of your profile, tap “Delete my account”. Your profile, photos and answers are removed.']
    ]]
  ];
  const html = '<div class="stack faqpage"><header style="display:flex;flex-direction:column;gap:6px"><span class="label">Help</span><h1 class="largetitle">Questions and answers</h1></header>' +
    QA.map(([group, sub, items]) => '<section class="faqgroup" aria-label="' + esc(group) + '"><div class="faqhead"><h2 class="h2">' + esc(group) + '</h2><span class="label">' + esc(sub) + '</span></div><div class="faq">' +
      items.map(([q, a]) => '<details name="faq"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('') + '</div></section>').join('') +
    '<p class="label" style="text-align:center;margin-top:8px">Something else? Ask Ora Master in your Chats.</p></div>';
  const pg = pushPage('Questions and answers', html);
  // One answer open at a time (also for browsers without <details name>)
  pg.querySelectorAll('.faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) pg.querySelectorAll('.faq details[open]').forEach((o) => { if (o !== d) o.open = false; }); }));
}

// ---------------- One practice: its page, then the guided room, the writing page or the action ----------------
function openPractice(id) {
  const x = PRACTICE[id]; if (!x) return;
  const n = sessionsOf(id), l = levelFor(n), next = LIB.levels[l];
  const body = '<div class="stack">' +
    '<header style="display:flex;flex-direction:column;gap:6px"><span class="label">' + esc(x.cat) + ' · ' + typeLabel(x) + '</span><h1 class="largetitle">' + esc(x.name) + '</h1></header>' +
    '<section class="box" style="display:flex;flex-direction:column;gap:8px" aria-label="Your level"><div class="head"><span class="plevel" style="font-size:15px">' + levelDots(l) + levelName(l) + '</span><span class="label">' + n + ' session' + (n === 1 ? '' : 's') + '</span></div>' +
      '<p class="label" style="margin:0;font-size:13.5px">' + (next ? (next.from - n) + ' more to reach ' + next.name + '.' : 'The highest level. Beautiful.') + ' This level: ' + practiceLen(x, l) + '.</p></section>' +
    '<p class="explain">' + esc(x.about) + '</p>' +
    '<section class="section" aria-label="How"><h2 class="h2">How</h2><ol class="steps-list">' + x.steps.map((st) => '<li>' + esc(st) + '</li>').join('') + '</ol></section>' +
    '<button class="primary" id="startPr">' + (x.type === 'write' ? 'Start writing' : x.type === 'do' ? 'I’m doing it' : 'Begin · ' + x.mins[l - 1] + ' min') + '</button>' +
    '</div>';
  const pg = pushPage(x.name, body);
  pg.querySelector('#startPr').onclick = () => {
    if (x.type === 'sit') openTemple({ practice: x, mins: x.mins[l - 1], cues: x.cues });
    else if (x.type === 'write') openWriting(x, l);
    else openDoing(x, l);
  };
}
function openWriting(x, l) {
  const min = x.chars[l - 1];
  const pg = pushPage(x.name, '<div class="stack"><p class="label">' + esc(x.name) + ' · ' + levelName(l) + '</p><h1 class="largetitle" style="font-size:34px">' + esc(x.prompt) + '</h1>' +
    '<ul class="hintlist">' + x.steps.map((st) => '<li>' + esc(st) + '</li>').join('') + '</ul>' +
    '<label class="hide" for="prWrite">' + esc(x.prompt) + '</label><textarea id="prWrite" class="bigwrite" maxlength="4000" placeholder="' + esc(x.prompt) + '"></textarea>' +
    '<p class="fine" id="prCount"></p><button class="primary" id="prDone" disabled>Done</button><p class="fine" style="text-align:center">Private. Only our AI reads it, to understand you better.</p></div>');
  const ta = pg.querySelector('#prWrite'), bt = pg.querySelector('#prDone'), cnt = pg.querySelector('#prCount');
  const ok = () => { const n = ta.value.trim().length; bt.disabled = n < min; cnt.textContent = n < min ? (min - n) + ' more characters for this level' : 'Ready when you are'; };
  ta.oninput = ok; ok(); setTimeout(() => ta.focus({ preventScroll: true }), 450);
  bt.onclick = async () => { bt.disabled = true; const r = await recordPractice(x, { level: l, answer: { entry: ta.value.trim() } }); if (r) { popPage(); popPage(); } else bt.disabled = false; };
}
function openDoing(x, l) {
  const pg = pushPage(x.name, '<div class="stack"><p class="label">' + esc(x.name) + ' · ' + levelName(l) + ' · about ' + x.mins[l - 1] + ' min</p><h1 class="largetitle" style="font-size:34px">' + esc(x.about) + '</h1>' +
    '<ol class="steps-list">' + x.steps.map((st) => '<li>' + esc(st) + '</li>').join('') + '</ol>' +
    '<label class="lbl" for="prNote">A note (optional)<textarea id="prNote" maxlength="600" placeholder="What did you do?"></textarea></label>' +
    '<button class="primary" id="prDone">I did it</button></div>');
  const bt = pg.querySelector('#prDone');
  bt.onclick = async () => { bt.disabled = true; const note = pg.querySelector('#prNote').value.trim(); const r = await recordPractice(x, { level: l, minutes: x.mins[l - 1], answer: note ? { entry: note } : {} }); if (r) { popPage(); popPage(); } else bt.disabled = false; };
}
// Save a finished session, celebrate a level-up, then ask the short check-in question
async function recordPractice(x, { level, minutes = null, answer = {} }) {
  const wasDone = todayDone(), wasOpen = cloudOpen(), before = levelOf(x.id);
  let row;
  try { row = await API.savePractice(uid, { exercise: x.id, level, minutes, answer }); }
  catch (e) {
    fail(/practices/.test(String(e?.message)) ? { message: 'Practices aren’t switched on yet (database update 0007).' } : e);
    return null;
  }
  myPractices.unshift(row);
  renderAgenda(); renderMeditation(); updateLocks();
  const after = levelOf(x.id);
  setTimeout(() => checkIn(x, row, answer), 450);
  afterDone(wasOpen, wasDone, after > before ? 'Level up: ' + levelName(after) + ' in ' + x.name : x.name + ' done');
  return row;
}
// The check-in: a small card from the bottom, never full screen. Writing, cards or a selection.
function checkIn(x, row, answer) {
  const q = x.after; if (!q) return;
  const el = document.createElement('section');
  el.className = 'checkin glass'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'A short question');
  const multi = q.type === 'select' && q.multi;
  el.innerHTML = '<p class="label">One question · ' + esc(x.name) + '</p><h2>' + esc(q.q) + '</h2>' +
    (q.type === 'write' ? '<label class="hide" for="ciText">' + esc(q.q) + '</label><textarea id="ciText" maxlength="600" placeholder="A few words"></textarea>'
      : '<div class="' + (q.type === 'cards' ? 'cicards' : 'chips') + '">' + q.opts.map((o) => '<button type="button" class="' + (q.type === 'cards' ? 'cicard' : 'chip') + '" data-ci="' + esc(o) + '" aria-pressed="false">' + esc(o) + '</button>').join('') + '</div>') +
    '<div class="ci-actions"><button class="link" id="ciSkip" style="color:var(--ink2)">Skip</button><button class="primary" id="ciSave" disabled>Save</button></div>';
  $('#app').appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  const save = el.querySelector('#ciSave'), picked = new Set();
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
  el.querySelector('#ciSkip').onclick = close;
  const ta = el.querySelector('#ciText');
  if (ta) { ta.oninput = () => { save.disabled = ta.value.trim().length < 2; }; }
  el.querySelectorAll('[data-ci]').forEach((b) => b.onclick = () => {
    const v = b.dataset.ci;
    if (!multi) picked.clear();
    if (picked.has(v)) picked.delete(v); else picked.add(v);
    el.querySelectorAll('[data-ci]').forEach((o) => { const on = picked.has(o.dataset.ci); o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); });
    save.disabled = !picked.size;
  });
  save.onclick = async () => {
    save.disabled = true;
    const resp = ta ? { text: ta.value.trim() } : multi ? { choices: [...picked] } : { choice: [...picked][0] };
    try { await API.practiceAnswer(row.id, { ...answer, ...resp, q: q.q }); row.answer = { ...answer, ...resp, q: q.q }; toast('Thank you. Your aura is listening.'); } catch (e) { fail(e); }
    close();
  };
}

// ---------------- Today's suggestion and the Ora Master chat ----------------
let suggestion = null;
const MASTER = 'Ora Master';
const guideButton = () => '<button class="guidebtn glass" data-guide aria-label="Ask ' + MASTER + '">' + ICON.guide + '<span>' + MASTER + '</span></button>';
// Ora Master's picture: three glass bubbles
const masterAva = (size) => '<span class="masterava" style="width:' + size + 'px;height:' + size + 'px" aria-hidden="true">' +
  '<span style="left:0;top:4%;width:62%;height:62%">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, Math.round(size * .62)) + '</span>' +
  '<span style="right:0;top:34%;width:44%;height:44%">' + bubbleHTML({ w: [0, 1, 0, 1, 0, 1], clear: true }, Math.round(size * .44)) + '</span>' +
  '<span style="left:30%;bottom:0;width:30%;height:30%">' + bubbleHTML({ w: [1, 0, 1, 0, 1, 0], clear: true }, Math.round(size * .3)) + '</span></span>';
const doneToday = (id) => myPractices.some((p) => p.exercise === id && p.day === today());
function suggestionCard() {
  const s = suggestion && PRACTICE[suggestion.exercise];
  if (!s) return '';
  return '<section class="suggest" aria-label="For you today"><div class="head"><span class="label">For you today</span>' + guideButton() + '</div>' +
    '<b>' + esc(s.name) + '</b><p>' + esc(suggestion.reason) + '</p>' +
    (doneToday(s.id) ? '<button class="secondary" disabled>' + ICON.check + ' Done today</button>' : '<button class="primary" data-practice="' + s.id + '">Start · ' + practiceLen(s, levelOf(s.id)) + '</button>') + '</section>';
}
async function loadSuggestion() {
  const key = 'ora.suggest.' + uid;
  try { const c = JSON.parse(store.get(key) || 'null'); if (c && c.day === today() && PRACTICE[c.exercise]) { suggestion = c; return; } } catch (e) {}
  try {
    const r = await API.guideSuggest();
    suggestion = { day: today(), exercise: r.exercise, reason: r.reason };
  } catch (e) {
    // Offline or not set up: something not done lately, different each day
    const pool = PR.filter((x) => !myPractices.some((p) => p.exercise === x.id && p.day >= API.dayKey(new Date(Date.now() - 3 * 864e5))));
    const x = (pool.length ? pool : PR)[dayNum() % (pool.length || PR.length)];
    suggestion = { day: today(), exercise: x.id, reason: x.about };
  }
  store.set(key, JSON.stringify(suggestion));
  // Ora Master also sends it in the chat, once a day
  const msgs = guideMsgs();
  if (!msgs.some((m) => m.day === today() && m.suggest)) {
    msgs.push({ role: 'assistant', day: today(), at: Date.now(), suggest: suggestion.exercise, content: 'For today, I’d suggest ' + PRACTICE[suggestion.exercise].name + '. ' + suggestion.reason });
    saveGuide(msgs);
  }
  renderAgenda(); renderMeditation(); renderChats();
}
const guideKey = () => 'ora.guide.' + uid;
function guideMsgs() { try { return JSON.parse(store.get(guideKey()) || '[]'); } catch (e) { return []; } }
function saveGuide(m) { store.set(guideKey(), JSON.stringify(m.slice(-60))); }
// A new message from Ora Master shows on the Chats tab until the conversation is opened
const guideSeenKey = () => 'ora.guideSeen.' + uid;
function guideUnread() {
  if (!uid) return false;
  const last = guideMsgs().slice(-1)[0];
  return !!last && last.role === 'assistant' && (last.at || 0) > Number(store.get(guideSeenKey()) || 0);
}
function markGuideSeen() { store.set(guideSeenKey(), String(Date.now())); renderChats(); }
function openGuide() {
  const pg = pushPage(MASTER, '<div class="threadhead" style="cursor:default">' + masterAva(84) + '<b style="font-family:var(--serif);font-size:24px;font-weight:400">' + MASTER + '</b><span class="label">Ask about meditation, your practice, your aura</span></div><div class="thread" id="gThread"></div><div style="height:80px"></div>',
    { footer: '<form class="composer glass" id="gComposer"><label for="gIn" class="hide">Message Ora Master</label><input id="gIn" autocomplete="off" placeholder="Ask Ora Master" maxlength="1000"><button class="send" id="gSend" aria-label="Send" disabled>' + ICON.send + '</button></form>' });
  const th = pg.querySelector('#gThread'), sc = pg.querySelector('.scroll'), inp = pg.querySelector('#gIn'), sb = pg.querySelector('#gSend');
  let msgs = guideMsgs();
  if (!msgs.length) msgs.push({ role: 'assistant', day: today(), content: 'Hello' + (me?.name ? ' ' + low(me.name) : '') + '. I’m Ora Master. Ask me anything about meditation, the practices, or how your aura and the people around you are found.' });
  const draw = (typing) => {
    th.innerHTML = msgs.map((m) => '<div class="msg ' + (m.role === 'user' ? 'me' : 'them') + '">' + esc(m.content) +
      (m.suggest && PRACTICE[m.suggest] ? (m.day === today() && doneToday(m.suggest) ? '<button class="secondary small" disabled>' + ICON.check + ' Done today</button>'
        : '<button class="primary small" data-practice="' + m.suggest + '">Start ' + esc(PRACTICE[m.suggest].name) + '</button>') : '') + '</div>').join('') +
      (typing ? '<div class="msg them typing"><i></i><i></i><i></i></div>' : '');
    sc.scrollTop = sc.scrollHeight; wirePracticeLinks(th);
  };
  draw(); markGuideSeen();
  inp.oninput = () => { sb.disabled = !inp.value.trim(); };
  pg.querySelector('#gComposer').onsubmit = async (e) => {
    e.preventDefault();
    const x = inp.value.trim(); if (!x) return;
    inp.value = ''; sb.disabled = true;
    msgs.push({ role: 'user', day: today(), content: x }); saveGuide(msgs); draw(true);
    try {
      const r = await API.guideChat(msgs.map((m) => ({ role: m.role, content: m.content })));
      msgs.push({ role: 'assistant', day: today(), at: Date.now(), content: r.reply });
    } catch (err) { msgs.push({ role: 'assistant', day: today(), at: Date.now(), content: err.message || 'I couldn’t answer just now. Try again in a moment.' }); }
    saveGuide(msgs); draw(); markGuideSeen();
  };
}

// A crack of light down the middle of a dark wall. Drawn from a seeded random walk so it looks
// natural (uneven edges, chips, hairline fractures branching off) and stays the same every time.
let crackCache = '';
function crackSVG() {
  if (crackCache) return crackCache;
  let seed = 20261028;
  const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const W = 120, H = 240, N = 90, f = (n) => n.toFixed(2);
  // The main fissure: wanders left and right, now and then kinks, pulled gently back to the centre
  const pts = []; let x = W / 2, dx = 0;
  for (let i = 0; i <= N; i++) {
    const y = i / N * H;
    dx = dx * .55 + (rnd() - .5) * 2.6 + (W / 2 - x) * .04 + (rnd() < .08 ? (rnd() - .5) * 7 : 0);
    x += dx; pts.push([x, y]);
  }
  // Widest in the middle, never even: each edge is chipped on its own
  const width = (i) => { const t = i / N; return (.15 + 3.1 * Math.pow(Math.sin(Math.PI * t), 1.3)) * (.7 + rnd() * .6); };
  const L = [], R = [];
  pts.forEach(([px, py], i) => { const w = width(i); L.push([px - w * (.4 + rnd() * .8), py]); R.push([px + w * (.4 + rnd() * .8), py]); });
  const shape = 'M' + L.concat(R.reverse()).map(([a, c]) => f(a) + ' ' + f(c)).join(' L') + ' Z';
  // Hairline fractures: short random walks that branch off and fade, sometimes splitting again
  const cracks = [];
  const grow = (sx, sy, ang, len, w) => {
    let cx = sx, cy = sy, a = ang; const seg = [[cx, cy]];
    for (let k = 0; k < len; k++) {
      a += (rnd() - .5) * .7; cx += Math.cos(a) * 2.6; cy += Math.sin(a) * 2.6; seg.push([cx, cy]);
      if (k > 3 && rnd() < .07 && w > .35) grow(cx, cy, a + (rnd() < .5 ? -1 : 1) * (.5 + rnd() * .6), Math.floor(len * .5), w * .6);
    }
    cracks.push({ d: 'M' + seg.map(([a2, c2]) => f(a2) + ' ' + f(c2)).join(' L'), w });
  };
  for (let i = 6; i < N - 6; i += 3 + Math.floor(rnd() * 5)) {
    if (rnd() < .45) continue;
    const [px, py] = pts[i], side = rnd() < .5 ? -1 : 1;
    // Out to one side, mostly running downward, sometimes up
    const out = side * (.45 + rnd() * .85), ang = rnd() < .3 ? -Math.PI / 2 + out : Math.PI / 2 - out;
    grow(px, py, ang, 5 + Math.floor(rnd() * 12), .5 + rnd() * .6);
  }
  crackCache = '<svg class="crack" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs>' +
    '<linearGradient id="clight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3df" stop-opacity=".5"></stop><stop offset=".5" stop-color="#fffaf2"></stop><stop offset="1" stop-color="#fff3df" stop-opacity=".5"></stop></linearGradient>' +
    '<filter id="cglow" x="-60%" y="-10%" width="220%" height="120%"><feGaussianBlur stdDeviation="3.2"></feGaussianBlur></filter>' +
    '<filter id="crough"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7"></feTurbulence><feDisplacementMap in="SourceGraphic" scale="1.2"></feDisplacementMap></filter></defs>' +
    '<path class="cglow" d="' + shape + '" filter="url(#cglow)"></path>' +
    cracks.map((c) => '<path class="cbranch" d="' + c.d + '" style="stroke-width:' + f(c.w) + '"></path>').join('') +
    '<path class="cfill" d="' + shape + '" filter="url(#crough)"></path></svg>';
  return crackCache;
}

// The temple: black screen, a breathing crack of light, and a soft, slow vibration for as long as it's open
// The temple room: black, the breathing crack, soft music and vibration. With no options it's today's
// meditation (the Meditate task); with a practice it runs that practice's cues for its length.
function openTemple(opts = {}) {
  const daily = !opts.practice, med = todayTasks().find((x) => x.k === 'm');
  const mins = daily ? med.mins : opts.mins, cues = opts.cues || [['Breathe in', 4], ['Breathe out', 4]];
  const el = document.createElement('section');
  el.className = 'temple'; el.setAttribute('aria-label', daily ? 'The temple' : opts.practice.name);
  const soundOn = store.get('ora.templeSound') !== 'off';
  el.innerHTML = '<button class="temple-leave" aria-label="Leave">Leave</button>' +
    '<button class="temple-sound" aria-pressed="' + soundOn + '">' + (soundOn ? 'Sound on' : 'Sound off') + '</button>' + crackSVG() +
    '<p class="temple-time">00:00 · ' + mins + ' min</p><p class="temple-note" aria-live="polite">' + (daily ? 'Settle in. Let your eyes close.' : esc(opts.practice.name) + '. Settle in.') + '</p>';
  $('#app').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const t0 = Date.now();
  let counted = daily ? Boolean(rec().m) : false, finished = false, lock = null, cueT = null;
  try { navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {}); } catch (e) {}
  const hum = startHum();
  const music = startMusic(soundOn);
  const sb = el.querySelector('.temple-sound');
  let blocked = false;
  sb.onclick = () => {
    wakeAudio();
    if (blocked) { blocked = false; sb.textContent = 'Sound on'; sb.setAttribute('aria-pressed', 'true'); store.set('ora.templeSound', 'on'); music.mute(false); return; }
    const on = sb.getAttribute('aria-pressed') !== 'true'; sb.setAttribute('aria-pressed', on); sb.textContent = on ? 'Sound on' : 'Sound off'; store.set('ora.templeSound', on ? 'on' : 'off'); music.mute(!on);
  };
  el.addEventListener('pointerdown', wakeAudio);
  // Still paused a moment later (the phone blocked it): ask for one tap
  if (soundOn) setTimeout(() => { if (!music.running()) { blocked = true; sb.textContent = 'Tap for sound'; } }, 1200);
  // The guidance: each cue for its own number of seconds, round and round
  const note = el.querySelector('.temple-note');
  const say = (txt) => { note.style.opacity = 0; setTimeout(() => { note.textContent = txt; note.style.opacity = 1; }, 400); };
  let ci = 0, asking = false;
  const nextCue = () => { if (asking) return; const [txt, sec] = cues[ci++ % cues.length]; say(txt); cueT = setTimeout(nextCue, sec * 1000); };
  cueT = setTimeout(nextCue, 3500);
  const tick = setInterval(() => {
    const sec = Math.floor((Date.now() - t0) / 1000);
    el.querySelector('.temple-time').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0') + ' · ' + (finished ? 'keep going' : mins + ' min');
    // Time's up: ask whether to keep going or conclude, quietly, without stopping the music
    if (!finished && sec >= mins * 60) { finished = true; ask(); }
  }, 1000);
  const ask = () => {
    asking = true; clearTimeout(cueT); say('Your ' + mins + ' minutes are done.');
    const box = document.createElement('div');
    box.className = 'temple-ask'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Your session is done');
    box.innerHTML = '<p class="h">' + mins + ' minutes</p><p>Keep going, or conclude this session?</p>' +
      '<div><button data-keep>Keep going</button><button data-end class="on">Conclude</button></div>';
    el.appendChild(box); requestAnimationFrame(() => box.classList.add('in'));
    box.querySelector('[data-end]').onclick = leave;
    box.querySelector('[data-keep]').onclick = () => {
      box.classList.remove('in'); setTimeout(() => box.remove(), 400);
      asking = false; say('Stay as long as you like.'); cueT = setTimeout(nextCue, 4000);
    };
  };
  const leave = () => {
    clearInterval(tick); clearTimeout(cueT); hum.stop(); music.stop();
    try { lock?.release(); } catch (e) {}
    document.removeEventListener('visibilitychange', onVis);
    el.classList.remove('in'); setTimeout(() => el.remove(), 600);
    if (!finished) { if (!daily) toast('Come back to it anytime'); return; }
    // Saved when you leave, with the time you actually sat (at least the planned minutes),
    // so the check-in appears on the app, not in the dark
    const sat = Math.max(mins, Math.floor((Date.now() - t0) / 60000));
    if (daily) {
      if (!counted) complete(med, { minutes: sat, timed: true, temple: true }, sat + ' calm minutes. Well done.');
      API.savePractice(uid, { exercise: 'temple', level: levelOf('temple'), minutes: sat }).then((row) => { myPractices.unshift(row); renderMeditation(); }).catch(() => {});
    } else { popPage(true); recordPractice(opts.practice, { level: levelOf(opts.practice.id), minutes: sat }); }
  };
  const onVis = () => { if (document.hidden) { hum.stop(); music.pause(); } else { hum.start(); music.resume(); } };
  document.addEventListener('visibilitychange', onVis);
  el.querySelector('.temple-leave').onclick = leave;
}

// Soft meditation music, made live in the browser: a warm drone that swells with the breath, a little
// reverb, and now and then a singing bowl. It plays even with an iPhone's silent switch on (Safari 17+).
function startMusic(on) {
  const ctx = audio();
  const none = { stop() {}, mute() {}, pause() {}, resume() {}, running: () => false };
  if (!ctx) return none;
  const now = ctx.currentTime, master = ctx.createGain(), vol = .2;
  master.gain.setValueAtTime(0, now); if (on) master.gain.linearRampToValueAtTime(vol, now + 3);
  master.connect(audioOut);
  // Reverb: a few seconds of fading noise as the room
  const rev = ctx.createConvolver(), len = ctx.sampleRate * 4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
  rev.buffer = ir; const wet = ctx.createGain(); wet.gain.value = .55; rev.connect(wet).connect(master);
  // The drone: D, A, D, F#, A, two slightly detuned voices each, through a soft low-pass
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = .3;
  const pad = ctx.createGain(); pad.gain.value = .5; lp.connect(pad); pad.connect(master); pad.connect(rev);
  const nodes = [];
  [73.42, 110, 146.83, 185, 220].forEach((fq, i) => {
    [-1.2, 1.2].forEach((det) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = fq; o.detune.value = det * 4;
      g.gain.value = i < 2 ? .16 : .045; o.connect(g).connect(lp); o.start(); nodes.push(o);
    });
  });
  // Breathing swell, in step with the light (8 seconds)
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 1 / 8; lg.gain.value = .22; lfo.connect(lg).connect(pad.gain); lfo.start(); nodes.push(lfo);
  // Singing bowls: an inharmonic ring that fades over several seconds
  const bowl = () => {
    if (ctx.state !== 'running') return;
    const t = ctx.currentTime + .05, base = [293.66, 369.99, 440, 587.33][Math.floor(Math.random() * 4)], g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 9);
    g.connect(master); g.connect(rev);
    [[1, 1], [2.76, .35], [5.4, .12]].forEach(([m, a]) => [0, .9].forEach((beat) => {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = base * m + beat; og.gain.value = a / 2;
      o.connect(og).connect(g); o.start(t); o.stop(t + 9.2);
    }));
  };
  let bowlT = setTimeout(function next() { bowl(); bowlT = setTimeout(next, 7000 + Math.random() * 7000); }, 2500);
  // If a call, another app or the lock screen pauses the sound, wake it again as soon as we can
  let stopped = false;
  const onState = () => { if (!stopped && !document.hidden && ctx.state !== 'running') ctx.resume().catch(() => {}); };
  ctx.addEventListener('statechange', onState);
  return {
    running: () => ctx.state === 'running',
    mute(off) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(off ? 0 : vol, t + 1.5); },
    pause() {}, // the shared context keeps running; the page being hidden is handled by the phone
    resume() { wakeAudio(); },
    stop() {
      stopped = true; clearTimeout(bowlT); ctx.removeEventListener('statechange', onState);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.5);
      setTimeout(() => { nodes.forEach((o) => { try { o.stop(); } catch (e) {} }); try { master.disconnect(); } catch (e) {} }, 1700);
    }
  };
}

// Soft vibration like a slow heartbeat: a light double touch every four seconds.
// Android phones use the Vibration API. iPhones have no web vibration; on iOS 18+ a hidden
// switch gives a light haptic tick instead, which is the closest a web page can get.
function startHum() {
  let timer = null;
  const canVibrate = typeof navigator.vibrate === 'function';
  let sw = null;
  if (!canVibrate) {
    sw = document.createElement('label'); sw.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    sw.innerHTML = '<input type="checkbox" switch>'; document.body.appendChild(sw);
  }
  const beat = () => {
    if (canVibrate) navigator.vibrate([14, 220, 8]);
    else { sw.click(); setTimeout(() => sw.click(), 240); }
  };
  const start = () => { if (timer) return; beat(); timer = setInterval(beat, 4000); };
  const stop = () => { clearInterval(timer); timer = null; if (canVibrate) navigator.vibrate(0); };
  start();
  return { start, stop: () => { stop(); }, remove: () => { stop(); sw?.remove(); } };
}

// Focus bubbles: a bubble drifts over whatever's on screen until it's popped
let presentT = null, presentEl = null;
let focusShown = 0;
function schedulePresent() {
  clearTimeout(presentT);
  const test = Number(store.get('ora.presentEvery')); // testing only: seconds between bubbles
  const [lo, hi] = test ? [test, test] : focusShown ? FOCUS_EVERY : FOCUS_FIRST;
  presentT = setTimeout(showPresent, (lo + Math.random() * (hi - lo)) * 1000);
}
function showPresent() {
  const busy = presentEl || document.hidden || !gate.hidden || $('.temple') || $('#splash');
  if (busy) { schedulePresent(); return; }
  const app = $('#app'), W = app.clientWidth, H = app.clientHeight, size = 116, r = size / 2;
  const el = document.createElement('button');
  el.className = 'present'; el.setAttribute('aria-label', 'A focus bubble. Pop it.');
  el.innerHTML = bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, size) + '<span class="present-cap">Here, now</span>';
  app.appendChild(el); presentEl = el; focusShown++;
  let x = r + Math.random() * (W - size), y = H + r, vx = 0, vy = -30, t = 0, last = performance.now(), raf = 0, alive = true;
  const ph = Math.random() * 6.28;
  const step = (now) => {
    if (!alive) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    // Rise slowly into view toward the top, then wander lazily, kept on screen; never faster than a drift
    const tx = W / 2 + Math.sin(t * .11 + ph) * (W / 2 - r - 16), ty = H * .42 + Math.sin(t * .08 + ph * 2) * (H * .28);
    vx += ((tx - x) * .1 - vx * .55) * dt; vy += ((ty - y) * .1 - vy * .55) * dt;
    const sp = Math.hypot(vx, vy), max = 55; if (sp > max) { vx *= max / sp; vy *= max / sp; }
    x += vx * dt; y += vy * dt;
    const sq = Math.sin(t * 1.3 + ph) * .02;
    el.style.transform = 'translate3d(' + (x - r).toFixed(1) + 'px,' + (y - r).toFixed(1) + 'px,0) scale(' + (1 + sq).toFixed(3) + ',' + (1 - sq).toFixed(3) + ')';
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  el.onclick = () => {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf);
    el.querySelector('.present-cap')?.remove();
    // The pop: a quick squeeze, then the film bursts outward and vanishes
    const b = el.querySelector('.bubble');
    b.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.06,.92)', opacity: 1, offset: .35 },
      { transform: 'scale(1.3)', opacity: 0 }
    ], { duration: 190, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' });
    setTimeout(() => popFx(x, y, r), 70);
    setTimeout(() => { el.remove(); presentEl = null; }, 260);
    toast('Here. Now.');
    schedulePresent();
  };
}
// A popping bubble: a flash of light, an iridescent ring racing outward, and the film breaking
// into shimmering droplets that fly out and fall
function popFx(x, y, rad) {
  const app = $('#app');
  const add = (cls, css) => { const e = document.createElement('span'); e.className = cls; e.style.cssText = css; app.appendChild(e); return e; };
  const box = 'left:' + (x - rad) + 'px;top:' + (y - rad) + 'px;width:' + rad * 2 + 'px;height:' + rad * 2 + 'px';
  const flash = add('fxflash', box);
  flash.animate([{ transform: 'scale(.6)', opacity: .9 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => flash.remove();
  const ring = add('fxring', box);
  ring.animate([{ transform: 'scale(.95)', opacity: .95 }, { transform: 'scale(1.75)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.15,.75,.3,1)', fill: 'forwards' }).onfinish = () => ring.remove();
  const tints = DIMS.map((d) => d.c);
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2 + (Math.random() - .5) * .4, sz = 3.5 + Math.random() * 3.5;
    const d = add('fxdrop', 'width:' + sz + 'px;height:' + sz + 'px;left:' + (x + Math.cos(a) * rad * .92 - sz / 2) + 'px;top:' + (y + Math.sin(a) * rad * .92 - sz / 2) + 'px;--t:' + tints[k % 6]);
    const out = rad * (.35 + Math.random() * .6) + 12, fall = 34 + Math.random() * 30;
    d.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + (Math.cos(a) * out * .75).toFixed(1) + 'px,' + (Math.sin(a) * out * .75).toFixed(1) + 'px) scale(1)', opacity: 1, offset: .45 },
      { transform: 'translate(' + (Math.cos(a) * out).toFixed(1) + 'px,' + (Math.sin(a) * out + fall).toFixed(1) + 'px) scale(.5)', opacity: 0 }
    ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.12,.7,.4,1)', fill: 'forwards' }).onfinish = () => d.remove();
  }
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
function field(id, label, val, ph, max, ac, im) {
  return '<label class="lbl" for="' + id + '">' + label + '<input class="field" id="' + id + '" maxlength="' + max + '" value="' + esc(val ?? '') + '" placeholder="' + esc(ph) + '"' + (ac ? ' autocomplete="' + ac + '"' : '') + (im ? ' inputmode="' + im + '"' : '') + '></label>';
}
// ---------------- Profile ----------------
// Languages are stored as short codes ("fr,en"); the first one is the main language
const LANGS = [['en', 'English'], ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['nl', 'Dutch'], ['ar', 'Arabic'],
  ['he', 'Hebrew'], ['ru', 'Russian'], ['tr', 'Turkish'], ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['hi', 'Hindi'], ['sv', 'Swedish'], ['pl', 'Polish'], ['el', 'Greek']];
const LANG = Object.fromEntries(LANGS);
const langCodes = (str) => String(str || '').split(',').map((t) => t.trim()).filter(Boolean)
  .map((t) => (LANG[t.toLowerCase()] ? t.toLowerCase() : (LANGS.find(([, n]) => n.toLowerCase() === t.toLowerCase()) || [])[0])).filter(Boolean);
const PRONOUNS = ['she/her', 'he/him', 'they/them'];
// More about you, chosen in Edit profile (stored in profiles.details)
const DETAILS = [
  { key: 'here', label: 'Here for', multi: true, opts: ['New friends', 'A community', 'Practice partners', 'Growth', 'Calm'] },
  { key: 'experience', label: 'Meditation', opts: ['New to it', 'Now and then', 'Most days', 'Every day'] },
  { key: 'time', label: 'I like to practise', opts: ['Early morning', 'Midday', 'Evening', 'Late at night'] },
  { key: 'temple', label: 'My peace temple', opts: ['The sea', 'Mountains', 'A forest', 'A garden', 'A quiet room', 'The city at night'] },
  { key: 'rhythm', label: 'I’m', opts: ['An early bird', 'A night owl', 'Somewhere between'] },
  { key: 'food', label: 'I eat', opts: ['Everything', 'Vegetarian', 'Vegan', 'Pescatarian'] },
  { key: 'reading', label: 'Currently reading', text: 60 },
  { key: 'sign', label: 'Star sign', opts: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] }
];
const detailText = (d, v) => (Array.isArray(v) ? v.join(', ') : v || '');
const GENDER_LABEL = { woman: 'Woman', man: 'Man', nonbinary: 'Non-binary' };
// Shared by your profile and other people's: cards, information rows, the small line under the name
const pcard = (title, body, right = '') => '<section class="pcard"><div class="head"><h2 class="h2">' + title + '</h2>' + right + '</div>' + body + '</section>';
const infoRow = (k, v) => (v ? '<div class="irow"><span>' + k + '</span><b>' + esc(v) + '</b></div>' : '');
const infoLine = (city, langs, age) => [city, langs[0] && LANG[langs[0]], age].filter(Boolean).join(' · ').toLowerCase();
const infoRows = (d, more = '') => infoRow('I am', GENDER_LABEL[d.gender]) + infoRow('City', d.city) + infoRow('Languages', langCodes(d.languages).map((c) => LANG[c]).join(', ')) + infoRow('Pronouns', d.pronouns) + more +
  DETAILS.map((x) => infoRow(x.label, detailText(x, (d.details || {})[x.key]))).join('');
const topRow = (id, n, extra = '') => { const x = PRACTICE[id], l = levelFor(n); return '<button data-practice="' + id + '"><span><b>' + esc(x.name) + '</b><span class="plevel">' + levelDots(l) + levelName(l) + '</span></span><span class="label">' + (extra || n + ' session' + (n === 1 ? '' : 's')) + '</span></button>'; };
let detailsSaveT = null;
function saveDetails(details) {
  me.details = details;
  clearTimeout(detailsSaveT);
  detailsSaveT = setTimeout(() => API.saveProfile(uid, { details }).catch((e) => fail(/details/.test(String(e?.message)) ? { message: 'These options need database update 0008.' } : e)), 600);
}

// The profile: everything shown first, one Edit button for the whole page.
// The status is edited right where it shows, above your bubble.
let profileEdit = false;
async function renderProfile() {
  if (!$('#profileBody')) return;
  const aura = dimsToW(me.aura), age = ageOf(me.birthdate), mine = me.interests || [], E = profileEdit, det = me.details || {};
  const langs = langCodes(me.languages);
  const meetLabel = { women: 'Women', men: 'Men', everyone: 'Everyone' }[me.show_me || 'everyone'];
  // The small line under your name: city · main language · age
  const line = infoLine(me.city, langs, age), card = pcard;
  // Your latest two practices, with levels, and this week's sessions
  const counts = {}, latest = [];
  myPractices.forEach((p) => { counts[p.exercise] = (counts[p.exercise] || 0) + 1; if (PRACTICE[p.exercise] && !latest.includes(p.exercise) && latest.length < 2) latest.push(p.exercise); });
  const weekAgo = API.dayKey(new Date(Date.now() - 6 * 864e5)), thisWeek = myPractices.filter((p) => p.day >= weekAgo).length;
  const chipsOf = (attr, opts, on, labels) => '<div class="chips">' + opts.map((o, i) => '<button type="button" class="chip' + (on(o) ? ' on' : '') + '" ' + attr + '="' + esc(o) + '" aria-pressed="' + on(o) + '">' + esc(labels ? labels[i] : o) + '</button>').join('') + '</div>';

  $('#profileBody').innerHTML =
    '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Ora</span><div class="head"><h1 class="largetitle">Profile</h1>' +
      '<button class="editbtn' + (E ? ' on' : '') + '" id="editBtn">' + (E ? 'Done' : 'Edit profile') + '</button></div></header>' +
    '<div class="me phero"><div class="wrap" id="meBubble" style="position:relative">' + noteHTML(me.status || 'Add a status') + bubbleHTML(youObj(), 168) +
      '<button class="gbtn glass cam" id="camBtn" aria-label="' + (me.photo_path ? 'Change your photo' : 'Add your photo') + '">' + ICON.cam + '</button></div>' +
      (E ? '' : '<p class="pname" id="meName">' + esc(me.name ? low(me.name) : 'your name') + '</p>' + (line ? '<p class="label" style="margin:0">' + esc(line) + '</p>' : '')) +
    '</div>' +

    (E
      ? '<section class="section psec"><h2 class="h2">You</h2><div class="grid2">' +
          field('pName', 'Name', me.name, 'First name', 24, 'given-name') +
          '<label class="lbl" for="pBirth">Date of birth<input class="field" id="pBirth" type="date" max="' + adultMax() + '" value="' + esc(me.birthdate || '') + '"></label>' +
        '</div><label class="lbl" for="pCity">City<select class="field" id="pCity">' + cityOptions(me.city) + '</select></label>' +
        '<div class="lbl">I am' + chipsOf('data-gen', GENDERS.map((g) => g[0]), (v) => me.gender === v, GENDERS.map((g) => g[1])) + '</div></section>' +
        '<section class="section psec"><div class="head"><h2 class="h2">About you</h2><span class="counter" id="bCount"></span></div><label class="hide" for="pBio">About you</label><textarea id="pBio" maxlength="160" placeholder="Who you are, what you love">' + esc(me.bio) + '</textarea></section>' +
        '<section class="section psec"><h2 class="h2">Languages</h2><p class="label" style="margin:0">The first one you pick is your main language.</p>' + chipsOf('data-lang', LANGS.map((l) => l[0]), (c) => langs.includes(c), LANGS.map((l) => l[1])) + '</section>' +
        '<section class="section psec"><h2 class="h2">Pronouns</h2>' + chipsOf('data-pron', PRONOUNS, (o) => me.pronouns === o) + '</section>' +
        '<section class="section psec"><h2 class="h2">I’d like to meet</h2>' + chipsOf('data-show', ['women', 'men', 'everyone'], (v) => (me.show_me || 'everyone') === v, ['Women', 'Men', 'Everyone']) + '</section>' +
        DETAILS.map((d) => '<section class="section psec"><h2 class="h2">' + d.label + '</h2>' +
          (d.text ? '<label class="hide" for="pd_' + d.key + '">' + d.label + '</label><input class="field" id="pd_' + d.key + '" maxlength="' + d.text + '" value="' + esc(det[d.key] || '') + '" placeholder="A title, an author">'
            : chipsOf('data-det="' + d.key + '" data-opt', d.opts, (o) => (d.multi ? (det[d.key] || []).includes(o) : det[d.key] === o))) + '</section>').join('') +
        '<section class="section psec"><h2 class="h2">Interests</h2>' + chipsOf('data-int', [...INTERESTS, ...mine.filter((l) => !INTERESTS.includes(l))], (l) => mine.includes(l)) + '</section>'

      : card('About you', (me.bio ? '<p class="bio">' + esc(me.bio) + '</p>' : '<p class="label" style="margin:0">Add a few words about you with Edit profile.</p>') +
          (mine.length ? '<div class="facts">' + mine.map((l) => '<span class="fact">' + esc(l) + '</span>').join('') + '</div>' : '')) +
        card('Your aura', (me.aura_summary ? '<p class="reason-line">' + esc(me.aura_summary) + '</p>' : '<p class="label" style="margin:0">Your aura sharpens with every practice.</p>') +
          '<div style="display:flex;flex-direction:column;gap:10px">' + auraLines(aura, false) + '</div>', howButton()) +
        card('Your information', '<div class="info-list">' +
          infoRow('Birthday', me.birthdate ? new Date(me.birthdate + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) + (age ? ' · ' + age : '') : '') +
          infoRows(me, infoRow('I’d like to meet', meetLabel)) + '</div>') +
        card('Your streaks', '<div class="stats" style="margin:0"><div><b>' + streak() + '</b><span>Day streak</span></div><div><b>' + Math.max(bestStreak(), streak()) + '</b><span>Best</span></div><div><b>' + totalDone() + '</b><span>Practices</span></div></div>') +
        card('Your practices', latest.length
          ? '<div class="ptop">' + latest.map((id) => topRow(id, counts[id])).join('') + '</div>'
          : '<p class="label" style="margin:0">Nothing yet. Your favourite practices will show here.</p>',
          '<span class="label">' + thisWeek + ' this week</span>') +
        (config.paywall && me.paid_at ? '<p class="label" style="margin:0;text-align:center">Unlocked on ' + new Date(me.paid_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + '. One-time payment.</p>' : '') +
        '<section class="plinks"><button class="task" data-guide><span class="tx"><b>Ora Master</b><span>Ask about meditation, your practice, your aura</span></span><span class="chev" aria-hidden="true">›</span></button>' +
          '<button class="task" id="faqBtn"><span class="tx"><b>Questions and answers</b><span>Everything people usually ask</span></span><span class="chev" aria-hidden="true">›</span></button></section>' +
        '<section class="section" aria-label="Account" style="gap:6px"><button class="secondary" id="signOutBtn">Sign out</button>' +
          '<button class="link danger" id="deleteBtn" style="align-self:center">Delete my account</button></section>');

  $('#editBtn').onclick = () => { profileEdit = !profileEdit; renderProfile(); $('#profileBody').closest('.sheet, .scroll, section')?.scrollTo?.({top:0}); window.scrollTo(0,0); if (!profileEdit) { refreshYou(); refreshMeBtn(); setTimeout(loadCloud, 900); } };
  $('#camBtn').onclick = () => pickPhoto(async (blob) => { await savePhoto(blob); renderProfile(); refreshYou(); toast('Photo updated'); });
  // Tap the status above your bubble to change it
  const note = $('#meBubble .note');
  note.classList.add('editable'); note.setAttribute('role', 'button'); note.setAttribute('aria-label', 'Edit your status'); note.tabIndex = 0;
  const editStatus = () => {
    const nb = note.querySelector('.nb'); if (nb.querySelector('input')) return;
    nb.innerHTML = '<input id="pStatus" maxlength="20" value="' + esc(me.status || '') + '" placeholder="What’s on your mind" aria-label="Your status">';
    const inp = nb.querySelector('input'); inp.focus(); inp.select();
    const done = () => { const v = clip(inp.value.trim(), 20); if (v !== (me.status || '')) { saveSoon({ status: v }); me.status = v; refreshYou(); } nb.textContent = v || 'Add a status'; };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } if (e.key === 'Escape') { inp.value = me.status || ''; inp.blur(); } };
    inp.onblur = done;
  };
  note.onclick = editStatus; note.onkeydown = (e) => { if (e.key === 'Enter') editStatus(); };
  wirePracticeLinks($('#profileBody'));
  if (!E) {
    $('#faqBtn').onclick = () => openFAQ();
    $('#signOutBtn').onclick = async () => { await API.signOut(); location.reload(); };
  } else {
    const root = $('#profileBody');
    const cnt = () => { $('#bCount').textContent = Array.from($('#pBio').value).length + '/160'; };
    cnt();
    $('#pName').oninput = (e) => saveSoon({ name: e.target.value.trim() });
    $('#pBirth').onchange = (e) => { const v = e.target.value; if (!v) return; const a = ageOf(v); if (a < 18) { toast('Ora is for people 18 and over'); return; } saveSoon({ birthdate: v }); };
    $('#pCity').onchange = (e) => { if (e.target.value) saveSoon({ city: e.target.value, ...cityCountry(e.target.value) }); };
    $('#pBio').oninput = (e) => { saveSoon({ bio: e.target.value }); cnt(); };
    const toggleOn = (sel, b, on) => { root.querySelectorAll(sel).forEach((x) => { const o = on(x); x.classList.toggle('on', o); x.setAttribute('aria-pressed', o); }); };
    // Languages: tap order is kept, so the first picked is the main one
    root.querySelectorAll('[data-lang]').forEach((b) => b.onclick = () => {
      const c = b.dataset.lang, list = langCodes(me.languages), i = list.indexOf(c);
      if (i >= 0) list.splice(i, 1); else list.push(c);
      saveSoon({ languages: list.join(',') }); toggleOn('[data-lang]', b, (x) => list.includes(x.dataset.lang));
    });
    root.querySelectorAll('[data-pron]').forEach((b) => b.onclick = () => {
      const v = me.pronouns === b.dataset.pron ? '' : b.dataset.pron;
      saveSoon({ pronouns: v }); toggleOn('[data-pron]', b, (x) => x.dataset.pron === v);
    });
    root.querySelectorAll('[data-gen]').forEach((b) => b.onclick = () => { me.gender = b.dataset.gen; saveSoon({ gender: b.dataset.gen }); toggleOn('[data-gen]', b, (x) => x === b); });
    root.querySelectorAll('[data-show]').forEach((b) => b.onclick = () => { saveSoon({ show_me: b.dataset.show }); toggleOn('[data-show]', b, (x) => x === b); });
    root.querySelectorAll('[data-det]').forEach((b) => b.onclick = () => {
      const d = DETAILS.find((x) => x.key === b.dataset.det), v = b.dataset.opt, det2 = { ...(me.details || {}) };
      if (d.multi) { const l = [...(det2[d.key] || [])], i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); det2[d.key] = l; }
      else det2[d.key] = det2[d.key] === v ? '' : v;
      saveDetails(det2);
      toggleOn('[data-det="' + d.key + '"]', b, (x) => (d.multi ? det2[d.key].includes(x.dataset.opt) : det2[d.key] === x.dataset.opt));
    });
    DETAILS.filter((d) => d.text).forEach((d) => { $('#pd_' + d.key).oninput = (e) => saveDetails({ ...(me.details || {}), [d.key]: e.target.value.trim() }); });
    root.querySelectorAll('[data-int]').forEach((b) => b.onclick = () => {
      const v = b.dataset.int, list = [...(me.interests || [])], i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1); else list.push(v);
      me.interests = list; saveSoon({ interests: list });
      b.classList.toggle('on', list.includes(v)); b.setAttribute('aria-pressed', list.includes(v));
    });
    return;
  }
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
// The home view, shown as 100%, is zoomed in close: the Cloud is meant to feel near
const HOME_S = 1.3;
const view = { s: HOME_S, px: 0, py: 30, anim: null };
const YOU_R = 48;
// How far a bubble floats from you. With only a few members the whole Cloud (rings included) draws in close.
let spread = 560;
const distFor = (c) => 108 + (1 - c) * spread;
let B = [], youEl, moved = false, touched = store.get('rareness.hint') === 'seen', pendingMatch = null;
function buildCloud(list = []) {
  const keep = new Map(B.map((b) => [b.id, b]));
  // While the community is small the Cloud is a fixed set of spots: people take the spots nearest
  // you (best match closest) and empty bubbles fill the rest. Larger communities place people by score.
  const few = list.length < SLOTS.length;
  spread = few ? 260 : 560;
  world.innerHTML = '';
  [90, 75, 60, 45].forEach((p) => {
    const d = distFor(p / 100), el = document.createElement('div');
    el.className = 'ring'; el.style.cssText = 'width:' + d * 2 + 'px;height:' + d * 2 + 'px;left:' + -d + 'px;top:' + -d + 'px';
    // Rings sit close together when the Cloud is drawn in, so only every other one is labelled
    el.innerHTML = few ? '' : '<span class="ringlab">' + p + '% in common</span>'; world.appendChild(el);
  });
  youEl = document.createElement('div'); youEl.className = 'bub you'; youEl.style.cssText = 'width:96px;height:96px;transform:translate(-48px,-48px);z-index:2';
  youEl.setAttribute('role', 'button'); youEl.setAttribute('aria-label', 'Your profile'); youEl.tabIndex = 0;
  youEl.addEventListener('click', () => { if (!moved) openProfile(); });
  youEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(); } });
  world.appendChild(youEl); refreshYou();
  const ranked = few ? [...list].sort((a, c) => c.score - a.score) : list;
  B = (few ? withGhosts(ranked) : ranked).map((p, i) => {
    // People: the more you share, the bigger (radius 38 to 82 with few members). Empty bubbles keep their spot's size.
    const slot = few ? SLOTS[i] : null;
    const r = p.ghost ? slot.r : few ? 38 + p.compat * 44 : 24 + p.compat * p.compat * 48;
    const dist = slot ? slot.d : distFor(p.compat), ang = slot ? slot.a : i * 2.39996 + .7, D = Math.round(r * 2);
    // Someone new takes over the empty bubble that was in their spot, right where it was floating
    const was = keep.get(p.id) || (slot && !p.ghost ? keep.get('slot-' + i) : null);
    const b = Object.assign(p, { slot: i, r, dist, hx: Math.cos(ang) * dist, hy: Math.sin(ang) * dist, vx: 0, vy: 0, press: 0, bumpUntil: was?.bumpUntil || 0,
      p1: Math.random() * 6.28, p2: Math.random() * 6.28, w1: .11 + Math.random() * .1, w2: .1 + Math.random() * .1, p3: Math.random() * 6.28, p4: Math.random() * 6.28, amp: 10 + Math.random() * 10, wob: Math.random() * 6.28 });
    const el = document.createElement('div'); el.className = 'bub'; el.style.width = el.style.height = D + 'px';
    el.innerHTML = '<div class="drop"></div><button class="ball" aria-label="' + esc(p.ghost ? 'An empty bubble' : nameAge(p) + ', ' + p.score + '% in common') + '">' +
      bubbleHTML(p.ghost ? { w: p.w, clear: true } : { w: p.w, photo: p.photo }, D) + '</button><span class="bumpbadge hide">' + ICON.bump + '</span>' +
      '<span class="bname">' + (p.ghost ? '' : esc(nameAge(p))) + '</span>' + noteHTML(p.status);
    world.appendChild(el);
    b.el = el; b.ball = el.querySelector('.ball'); b.nameEl = el.querySelector('.bname'); b.noteEl = el.querySelector('.note'); b.badge = el.querySelector('.bumpbadge');
    b.ball.addEventListener('click', () => { if (!moved) { if (b.ghost) toast('Waiting for someone new'); else openPerson(b); } });
    return b;
  });
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j], dx = c.hx - a.hx, dy = c.hy - a.hy, d = Math.hypot(dx, dy) || .01, min = a.r + c.r + 10;
      if (d < min) { const o = (min - d) / 2, nx = dx / d, ny = dy / d; a.hx -= nx * o; a.hy -= ny * o; c.hx += nx * o; c.hy += ny * o; }
    }
    for (const b of B) { const d = Math.hypot(b.hx, b.hy) || .01, nd = d + (b.dist - d) * .12; b.hx *= nd / d; b.hy *= nd / d; }
  }
  B.forEach((b) => { const was = keep.get(b.id) || (!b.ghost && few ? keep.get('slot-' + b.slot) : null); b.x = was ? was.x : b.hx; b.y = was ? was.y : b.hy; });
  refreshBadges(); applyLOD(true);
}
// The Cloud's spots while it's small: fixed places, nearest first, each with its own bubble size
// (small, medium and large mixed) so the empty ones look varied and never jump between reloads.
const SLOT_R = [62, 30, 46, 24, 70, 38, 54, 28, 66, 42, 34, 58, 26, 50, 72, 32, 44, 60, 36, 52, 40, 64];
const SLOTS = SLOT_R.map((r, i) => ({ r, d: 150 + i * 15 + ((i * 37) % 23), a: i * 2.39996 + .7 }));
// Empty glass bubbles fill the spots nobody has taken yet: part of the look, not people
function withGhosts(list) {
  const out = [...list];
  for (let i = list.length; i < SLOTS.length; i++) {
    const h = (k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    out.push({ id: 'slot-' + i, ghost: true, status: '', bumped: false, compat: .5, w: DIMS.map((_, k) => .2 + h(k + 2)) });
  }
  return out;
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
  $('#zLabel').textContent = Math.round(view.s / HOME_S * 100) + '%';
}
const clampS = (s) => Math.max(.3, Math.min(3.4, s));
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
$('#zHome').onclick = () => { touch(); view.anim = { home: true, px: 0, py: 30, s: HOME_S }; };
$('#legend').innerHTML = '<p class="label">The light on each bubble shows why you match</p>' + DIMS.map((d, i) => '<div class="lrow">' + swatch(i, 26) + '<div>' + d.label + '<small>' + d.d + '</small></div></div>').join('');
function closeLegend() { $('#legend').classList.add('closed'); $('#legendBtn').setAttribute('aria-expanded', 'false'); }
$('#legendBtn').onclick = () => { const closed = $('#legend').classList.toggle('closed'); $('#legendBtn').setAttribute('aria-expanded', String(!closed)); };
if (touched) $('#hint').hidden = true;

let t = 0, last = performance.now();
function step(dt) {
  t += dt;
  const m = reduced ? .35 : 1, GAP = 4, ZONE = 16;
  for (const b of B) {
    // Drift like something in water: two slow waves per axis that never quite repeat, and a gentle bob
    let tx = b.hx + (Math.sin(t * b.w1 + b.p1) + .55 * Math.sin(t * b.w1 * 2.37 + b.p3)) * b.amp * m,
      ty = b.hy + (Math.cos(t * b.w2 + b.p2) + .55 * Math.sin(t * b.w2 * 1.91 + b.p4) + .35 * Math.sin(t * .9 + b.p1)) * b.amp * m, k = .8;
    if (b.bumpUntil) {
      if (t < b.bumpUntil) { const d = Math.hypot(b.hx, b.hy) || 1, dd = b.r + YOU_R + GAP; tx = b.hx / d * dd; ty = b.hy / d * dd; k = 6; }
      else { b.bumpUntil = 0; pendingMatch = b; }
    }
    b.ax = (tx - b.x) * k - b.vx * (k > 2 ? 3 : 1.25); b.ay = (ty - b.y) * k - b.vy * (k > 2 ? 3 : 1.25);
    b.press *= Math.pow(.15, dt);
  }
  for (let i = 0; i < B.length; i++) {
    const a = B[i];
    for (let j = i + 1; j < B.length; j++) {
      const c = B[j], dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r + GAP;
      if (Math.abs(dx) > min + ZONE || Math.abs(dy) > min + ZONE) continue;
      const d = Math.hypot(dx, dy) || .01; if (d >= min + ZONE) continue;
      const k = (min + ZONE - d) / ZONE, f = k * k * 160, nx = dx / d, ny = dy / d;
      a.ax -= nx * f; a.ay -= ny * f; c.ax += nx * f; c.ay += ny * f;
      a.press = Math.max(a.press, Math.min(1, k)); c.press = Math.max(c.press, Math.min(1, k));
      if (d < min) { const o = (min - d) / 2; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; }
    }
    const d = Math.hypot(a.x, a.y) || .01, min = a.r + YOU_R + GAP;
    if (d < min + ZONE && !a.bumpUntil) { const k = (min + ZONE - d) / ZONE, f = k * k * 160; a.ax += a.x / d * f; a.ay += a.y / d * f; a.press = Math.max(a.press, Math.min(1, k)); }
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
  if (cur === TAB.cloud || B.some((b) => b.bumpUntil)) { step(dt); paint(); }
  if (pendingMatch) { const b = pendingMatch; pendingMatch = null; showMatch(b); }
  requestAnimationFrame(loop);
}

// ---------------- Cloud data ----------------
// A cloud row from the database becomes a bubble: its match score sets size and distance,
// and the dims set the coloured ring.
function toBubble(row) {
  return {
    id: row.id, name: low(row.name), age: row.age, city: row.city, job: row.job, status: clip(row.status, 20),
    interests: row.interests || [], photo: API.photoUrl(row.photo_path),
    // Someone not scored yet still shows up, mid-distance with an even ring, until matching catches up
    score: row.score ?? 50, compat: Math.max(.05, Math.min(1, ((row.score ?? 50) - 25) / 70)), w: row.dims ? dimsToW(row.dims) : DIMS.map(() => 1), dims: row.dims || {},
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
  el.innerHTML = '<p class="reason-line">Your Cloud is forming</p><p class="label" style="font-size:14px;line-height:1.45;max-width:300px">These bubbles fill with people as they join.</p>';
}

// ---------------- Person page + bumping ----------------
// opts.fromChat: opened from a chat, so "Open chat" just goes back to it
async function openPerson(b, opts = {}) {
  const tot = b.w.reduce((a, c) => a + c, 0) || 1;
  const reasons = b.w.map((x, i) => ({ x, i })).filter((r) => r.x > 0).sort((a, c) => c.x - a.x);
  const name = b.name || 'they', line = infoLine(b.city, [], b.age);
  // The same layout as your own profile, with why you match first
  const body = '<div class="stack">' +
    '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Ora</span><h1 class="largetitle">Profile</h1></header>' +
    '<div class="me phero"><div class="wrap" style="position:relative">' + (b.status ? noteHTML(b.status) : '') + bubbleHTML({ w: b.w, photo: b.photo }, 168) + '</div>' +
      '<p class="pname">' + esc(b.name ? low(b.name) : 'someone') + '</p><p class="label" style="margin:0" id="theirLine"' + (line ? '' : ' hidden') + '>' + esc(line) + '</p></div>' +
    (b.score == null ? '' : pcard('Why you match',
      (b.reason ? '<p class="reason-line">' + esc(b.reason) + '</p>' : '') +
      '<div style="display:flex;flex-direction:column;gap:10px">' + reasons.map((r) => '<div class="reason">' + swatch(r.i, 24) + '<div class="rt"><div>' + DIMS[r.i].label + '<span>' + Math.round(r.x / tot * 100) + '%</span></div>' + glassBar(r.x / tot * 100, r.i) + '</div></div>').join('') + '</div>' +
      '<p class="label" style="margin:0;font-size:13px;line-height:1.4">These are the colours around ' + esc(name) + '’s bubble.</p>',
      '<span class="pscore">' + b.score + '%</span>')) +
    '<div id="theirAbout"' + (b.bio || (b.interests || []).length ? '' : ' hidden') + '>' + aboutCard(b, b.bio, b.interests) + '</div>' +
    '<div id="theirInfo" hidden></div>' +
    '<div id="theirPractice" hidden></div>' +
    '<div id="bumpZone" style="display:flex;flex-direction:column;gap:8px">' + bumpZone(b) + '</div>' +
    '<div class="menu-row" style="justify-content:center"><button class="link" data-report style="color:var(--ink2)">Report</button><button class="link" data-block style="color:var(--ink2)">Block</button></div>' +
  '</div>';
  const pg = pushPage(b.name ? low(b.name) : 'Profile', body);
  wireBump(pg, b, opts);
  pg.querySelector('[data-block]').onclick = (e) => blockPerson(b, e.currentTarget);
  pg.querySelector('[data-report]').onclick = () => openReport(b);
  // Once you've bumped into each other, you can see their latest practices and join them
  if (b.chatId) API.practiceSummary(b.id).then((rows) => {
    const box = pg.querySelector('#theirPractice'), list = rows.filter((r) => PRACTICE[r.exercise]).slice(0, 2);
    if (!box || !list.length) return;
    box.innerHTML = pcard('Their practices', '<div class="ptop">' + list.map((r) => topRow(r.exercise, r.sessions, 'Join')).join('') + '</div>');
    box.hidden = false; wirePracticeLinks(box);
  }).catch(console.error);
  API.profileDetails(b.id).then((d) => {
    if (!d) return;
    const about = pg.querySelector('#theirAbout'), info = pg.querySelector('#theirInfo'), ln = pg.querySelector('#theirLine');
    const l2 = infoLine(d.city || b.city, langCodes(d.languages), b.age);
    if (l2) { ln.textContent = l2; ln.hidden = false; }
    const ints = (b.interests || []).length ? b.interests : d.interests || [];
    if (d.bio || ints.length) { about.innerHTML = aboutCard(b, d.bio, ints); about.hidden = false; }
    const rows = infoRows({ ...d, city: d.city || b.city });
    if (rows) { info.innerHTML = pcard('Their information', '<div class="info-list">' + rows + '</div>'); info.hidden = false; }
  }).catch(console.error);
}
function aboutCard(b, bio, ints = []) {
  return pcard('About ' + esc(b.name ? low(b.name) : 'them'), (bio ? '<p class="bio">' + esc(bio) + '</p>' : '') +
    ((ints || []).length ? '<div class="facts">' + ints.map((x) => '<span class="fact">' + esc(x) + '</span>').join('') + '</div>' : ''));
}
function bumpZone(b) {
  if (b.chatId) return '<button class="primary" data-chat>Open chat</button>';
  if (b.bumped) return '<div class="box" style="text-align:center;font-size:14.5px">Bumped. If ' + esc(b.name || 'they') + ' bump' + (b.name ? 's' : '') + ' you back, a chat opens.</div>';
  return '<button class="primary" data-bump>' + ICON.bump + 'Bump</button><p class="label" style="text-align:center">' + esc(b.name || 'They') + ' won’t know unless they bump you too.</p>';
}
function wireBump(pg, b, opts = {}) {
  const bz = pg.querySelector('#bumpZone'), bt = bz.querySelector('[data-bump]'), ch = bz.querySelector('[data-chat]');
  if (ch) ch.onclick = () => { if (opts.fromChat) { popPage(); return; } popPage(true); goTab(TAB.chats, () => openThread(b.chatId)); };
  if (!bt) return;
  bt.onclick = async () => {
    bt.disabled = true;
    let res;
    try { res = await API.bump(b.id); } catch (e) { bt.disabled = false; fail(e); return; }
    b.bumped = true; refreshBadges();
    if (res.mutual) {
      b.chatId = res.chat_id;
      popPage();
      setTimeout(() => { b.bumpUntil = t + 1.4; view.anim = { home: true, px: 0, py: 30, s: Math.max(HOME_S * .8, Math.min(HOME_S, view.s)) }; }, 380);
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
  $('#mChat').onclick = () => { m.classList.remove('on'); goTab(TAB.chats, () => openThread(b.chatId)); };
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
  try { chatList = await API.chats(uid); chatList.forEach((c) => { if (c.other) c.other.name = low(c.other.name); }); renderChats(); } catch (e) { console.error(e); }
}
function renderChats() {
  const unread = chatList.filter((c) => c.unread).length + (guideUnread() ? 1 : 0), badge = $('#chatBadge');
  badge.hidden = !unread; badge.textContent = unread > 9 ? '9+' : unread;
  $('.tab[data-tab="' + TAB.chats + '"]').setAttribute('aria-label', unread ? 'Chats, ' + unread + ' unread' : 'Chats');
  $('#chatsBody').innerHTML = '<header style="display:flex;flex-direction:column;gap:6px"><span class="brand">Ora</span><h1 class="largetitle">Chats</h1><p class="label" style="font-size:14px;line-height:1.45">A chat opens only when you both bump each other. Nobody sees who bumped them.</p></header>' +
    guideRow() +
    (chatList.length ? '<section aria-label="Conversations" class="hair">' + chatList.map((c) => {
      const p = c.other, last = c.last;
      return '<button class="crow' + (c.unread ? ' unread' : '') + '" data-thread="' + c.id + '">' + bubbleHTML({ w: dimsToW(c.match?.dims), photo: API.photoUrl(p.photo_path) }, 58) +
        '<span class="tx"><div><b>' + esc(p.name || 'Someone') + '</b><time>' + ago(c.at) + '</time></div><p>' + (last ? (last.sender_id === uid ? 'You: ' : '') + esc(msgPreview(last.body)) : '') + '</p></span>' +
        (c.unread ? '<span class="udot" aria-label="Unread"></span>' : '') + '</button>';
    }).join('') + '</section>'
    : '<div class="empty">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], plain: true }, 110) + '<h2 class="h2">No chats yet</h2><p class="label" style="font-size:14.5px;line-height:1.45;max-width:280px">Bump people in the Cloud. If they bump you back, you’ll both land here.</p>' +
      '<button class="secondary" style="max-width:220px" id="toCloud">Go to the Cloud</button></div>');
  document.querySelectorAll('[data-thread]').forEach((b) => b.onclick = () => openThread(b.dataset.thread));
  wirePracticeLinks($('#chatsBody'));
  const tc = $('#toCloud'); if (tc) tc.onclick = () => goTab(TAB.cloud);
}
// Ora Master sits at the top of Chats, always there
function guideRow() {
  const last = uid ? guideMsgs().slice(-1)[0] : null, unread = guideUnread();
  return '<section aria-label="' + MASTER + '" class="hair"><button class="crow' + (unread ? ' unread' : '') + '" data-guide>' + masterAva(58) +
    '<span class="tx"><div><b>' + MASTER + '</b><time>' + (last?.day === today() ? 'today' : '') + '</time></div><p>' + esc(last ? last.content : 'Ask about meditation, your practice and your aura') + '</p></span>' +
    (unread ? '<span class="udot" aria-label="Unread"></span>' : '') + '</button></section>';
}
let openChat = null; // { id, draw(message) }
// ---------------- Emoji, stickers and GIFs ----------------
// Stickers and GIFs travel as ordinary messages with a marker, e.g. [[sticker:🫧]] or [[gif:https://…]]
const EMOJI = ('😀 😂 🥹 😊 😍 🥰 😘 😉 😎 🤔 🙃 😴 🥲 😅 😭 🤯 🫶 🙌 👏 👋 🤝 🙏 💪 👀 🫂 🤗 😌 😏 🙈 🤲 ' +
  '❤️ 🧡 💛 💚 💙 💜 🤍 ✨ 💫 🔥 🫧 🌊 🌙 🌕 ☀️ 🌅 🌄 🏔️ 🌲 🌿 🍃 🌱 🌸 🌻 🦋 🕊️ 🌈 🪐 💧 ❄️ ' +
  '🧘 🧘‍♀️ 🧘‍♂️ 🪷 🕯️ 📿 🍵 ☕️ 🍷 🎶 🎧 📚 ✍️ 🚶 🤸 ☮️ ♾️ 🎉 🥳').split(' ');
// Stickers: the first ones stay so older messages still show; the rest follow Ora's calm, natural theme
const STICKERS = ['🫧', '💛', '✨', '🌙', '🔥', '🌊', '🌿', '☕️', '🥂', '😘', '🙈', '🤍', '🫶', '🌸', '😴', '🎉',
  '🧘', '🪷', '🕯️', '📿', '🍵', '🕊️', '🦋', '🌱', '🍃', '🌕', '🌅', '🏔️', '🪐', '🌈', '💫', '🙏', '☮️', '🫂', '💜', '♾️'];
const RICH = /^\[\[(sticker|gif|practice):(.+)\]\]$/;
const GIF_URL = /^https:\/\/(media\d*|i)\.giphy\.com\/[\w./?=&%-]+$/;
function rich(body) {
  const m = RICH.exec(body || '');
  if (!m) return null;
  if (m[1] === 'sticker' && STICKERS.includes(m[2])) return { kind: 'sticker', value: m[2] };
  if (m[1] === 'gif' && GIF_URL.test(m[2])) return { kind: 'gif', value: m[2] };
  if (m[1] === 'practice' && PRACTICE[m[2]]) return { kind: 'practice', value: m[2] };
  return null;
}
const GIF_TOPICS = ['Meditate', 'Breathe', 'Calm', 'Namaste', 'Good vibes', 'Hug', 'Thank you', 'Sunrise', 'Nature', 'Yoga', 'Bubbles', 'Proud of you'];
const msgPreview = (body) => { const r = rich(body); return r ? (r.kind === 'gif' ? 'GIF' : r.kind === 'practice' ? 'Practice: ' + PRACTICE[r.value].name : 'Sticker ' + r.value) : body; };

async function openThread(chatId) {
  let c = chatList.find((x) => x.id === chatId);
  if (!c) { await loadChats(); c = chatList.find((x) => x.id === chatId); }
  if (!c) return;
  const p = c.other;
  const head = '<button class="threadhead" id="threadHead" aria-label="See ' + esc(p.name || 'their') + '’s profile">' + bubbleHTML({ w: dimsToW(c.match?.dims), photo: API.photoUrl(p.photo_path) }, 84) + '<b style="font-family:var(--serif);font-size:24px;font-weight:400">' + esc(p.name || 'Someone') + '</b>' + '<span class="label">' + (c.match ? c.match.score + '% in common · ' : '') + 'See profile</span></button>';
  const pg = pushPage(p.name || 'Chat', head + '<div class="thread" id="thread"><div class="spinner" style="align-self:center"></div></div><div style="height:80px"></div>',
    { footer: '<div class="tray glass" id="tray" hidden><div class="traytabs" role="tablist">' + ['Emoji', 'Stickers', 'GIFs', 'Practices'].map((x, i) => '<button type="button" role="tab" data-tt="' + i + '" aria-selected="' + (i === 0) + '">' + x + '</button>').join('') + '</div><div class="traybody" id="trayBody"></div></div>' +
      '<form class="composer glass" id="composer"><button type="button" class="traybtn" id="trayBtn" aria-label="Emoji, stickers and GIFs" aria-expanded="false">' + ICON.smile + '</button><label for="msgIn" class="hide">Message</label><input id="msgIn" autocomplete="off" placeholder="Message ' + esc(p.name || '') + '" maxlength="1000"><button class="send" id="sendBtn" aria-label="Send" disabled>' + ICON.send + '</button></form>' });
  const th = pg.querySelector('#thread'), sc = pg.querySelector('.scroll'), inp = pg.querySelector('#msgIn'), sb = pg.querySelector('#sendBtn');
  pg.querySelector('#threadHead').onclick = () => {
    // Their Cloud bubble if they're in it, otherwise what the chat knows about them
    const inCloud = people.find((x) => x.id === p.id);
    openPerson(inCloud ? { ...inCloud, chatId: c.id } : {
      id: p.id, name: p.name, photo: API.photoUrl(p.photo_path), status: p.status, interests: [],
      w: c.match ? dimsToW(c.match.dims) : DIMS.map(() => 1), score: c.match?.score ?? null, reason: c.match?.reason || null, bumped: true, chatId: c.id
    }, { fromChat: true });
  };
  let msgs = [], readAt = null;
  const one = (m) => {
    const who = m.sender_id === uid ? 'me' : m.sender_id ? 'them' : 'sys', r = m.sender_id ? rich(m.body) : null;
    if (r?.kind === 'sticker') return '<div class="msg sticker ' + who + '" role="img" aria-label="Sticker ' + r.value + '">' + r.value + '</div>';
    if (r?.kind === 'practice') {
      const x = PRACTICE[r.value];
      return '<div class="msg practicecard ' + who + '"><span class="label">' + (who === 'me' ? 'You shared a practice' : 'A practice for you') + ' · ' + esc(x.cat) + '</span><b>' + esc(x.name) + '</b><p>' + esc(x.about) + '</p>' +
        '<button class="primary small" data-practice="' + x.id + '">' + (who === 'me' ? 'Open' : 'Try it together') + '</button></div>';
    }
    if (r?.kind === 'gif') return '<div class="msg gif ' + who + '"><img src="' + esc(r.value) + '" alt="GIF" loading="lazy"></div>';
    return '<div class="msg ' + who + '">' + esc(m.body) + '</div>';
  };
  // "Read" (or "Sent") under your latest message, from when they last opened the chat
  const receipt = () => {
    const mine = [...msgs].reverse().find((m) => m.sender_id === uid);
    if (!mine || msgs[msgs.length - 1] !== mine) return '';
    return '<div class="receipt">' + (readAt && readAt >= mine.created_at ? 'Read' : 'Sent') + '</div>';
  };
  const draw = () => { th.innerHTML = msgs.map(one).join('') + receipt(); sc.scrollTop = sc.scrollHeight; wirePracticeLinks(th); };
  const checkRead = () => API.theirRead(chatId, p.id).then((r) => { if (r !== readAt) { readAt = r; draw(); } }).catch(() => {});
  try { msgs = await API.messages(chatId); draw(); } catch (e) { fail(e); }
  checkRead();
  const readTimer = setInterval(checkRead, 5000);
  API.markRead(uid, chatId).then(loadChats);
  openChat = { id: chatId, add(m) { if (!msgs.some((x) => x.id === m.id)) { msgs.push(m); draw(); if (m.sender_id !== uid) { API.markRead(uid, chatId); readAt = m.created_at > (readAt || '') ? m.created_at : readAt; } } } };
  inp.oninput = () => { sb.disabled = !inp.value.trim(); };
  const sendBody = async (x) => { try { openChat?.add(await API.send(uid, chatId, x)); return true; } catch (err) { fail(err); return false; } };
  pg.querySelector('#composer').onsubmit = async (e) => {
    e.preventDefault();
    const x = inp.value.trim(); if (!x) return;
    inp.value = ''; sb.disabled = true;
    if (!(await sendBody(x))) { inp.value = x; sb.disabled = false; }
  };
  // The tray: emoji go into the message, stickers and GIFs send straight away
  const tray = pg.querySelector('#tray'), tb = pg.querySelector('#trayBody'), tbtn = pg.querySelector('#trayBtn');
  let tab = 0, gifQ = '', gifT;
  const openTray = (on) => { tray.hidden = !on; tbtn.setAttribute('aria-expanded', on); sc.style.paddingBottom = on ? '330px' : ''; if (on) { drawTray(); sc.scrollTop = sc.scrollHeight; } };
  tbtn.onclick = () => openTray(tray.hidden);
  tray.querySelectorAll('[data-tt]').forEach((b) => b.onclick = () => { tab = +b.dataset.tt; tray.querySelectorAll('[data-tt]').forEach((x) => x.setAttribute('aria-selected', x === b)); drawTray(); });
  const loadGifs = async () => {
    const grid = tb.querySelector('#gifGrid'); if (!grid) return;
    grid.innerHTML = '<div class="spinner" style="grid-column:1/-1;justify-self:center"></div>';
    try {
      const list = await API.gifs(gifQ || 'meditation calm');
      grid.innerHTML = list.length ? list.map((g) => '<button type="button" class="gifpick" data-gif="' + esc(g.url) + '"><img src="' + esc(g.preview) + '" alt="GIF" loading="lazy"></button>').join('') : '<p class="label" style="grid-column:1/-1">No GIFs found.</p>';
      grid.querySelectorAll('[data-gif]').forEach((b) => b.onclick = async () => { if (await sendBody('[[gif:' + b.dataset.gif + ']]')) openTray(false); });
    } catch (e) { grid.innerHTML = '<p class="label" style="grid-column:1/-1">' + esc(e.message) + '</p>'; }
  };
  function drawTray() {
    if (tab === 0) {
      tb.innerHTML = '<div class="emojigrid">' + EMOJI.map((x) => '<button type="button" data-em="' + x + '">' + x + '</button>').join('') + '</div>';
      tb.querySelectorAll('[data-em]').forEach((b) => b.onclick = () => { inp.value += b.dataset.em; sb.disabled = false; });
    } else if (tab === 1) {
      tb.innerHTML = '<div class="stickergrid">' + STICKERS.map((x) => '<button type="button" data-st="' + x + '" aria-label="Send sticker ' + x + '">' + x + '</button>').join('') + '</div>';
      tb.querySelectorAll('[data-st]').forEach((b) => b.onclick = async () => { if (await sendBody('[[sticker:' + b.dataset.st + ']]')) openTray(false); });
    } else if (tab === 2) {
      // GIFs: quick searches in Ora's spirit, or anything you type
      tb.innerHTML = '<input class="field gifsearch" id="gifQ" placeholder="Search GIFs" value="' + esc(gifQ) + '" autocomplete="off">' +
        '<div class="gifchips" data-hscroll>' + GIF_TOPICS.map((g) => '<button type="button" data-gq="' + esc(g) + '" aria-pressed="' + (g === gifQ) + '">' + esc(g) + '</button>').join('') + '</div><div class="gifgrid" id="gifGrid"></div>';
      tb.querySelector('#gifQ').oninput = (e) => { gifQ = e.target.value; clearTimeout(gifT); gifT = setTimeout(loadGifs, 350); };
      tb.querySelectorAll('[data-gq]').forEach((b) => b.onclick = () => { gifQ = b.dataset.gq; tb.querySelector('#gifQ').value = gifQ; tb.querySelectorAll('[data-gq]').forEach((x) => x.setAttribute('aria-pressed', x === b)); loadGifs(); });
      loadGifs();
    } else {
      // Share a practice: your friend gets a card they can start right away
      tb.innerHTML = '<p class="label" style="margin:2px 2px 0">Send a practice to do together</p><div class="sharelist">' +
        PR.map((x) => '<button type="button" data-share="' + x.id + '"><b>' + esc(x.name) + '</b><span>' + esc(x.cat) + ' · ' + typeLabel(x) + '</span></button>').join('') + '</div>';
      tb.querySelectorAll('[data-share]').forEach((b) => b.onclick = async () => { if (await sendBody('[[practice:' + b.dataset.share + ']]')) openTray(false); });
    }
  }
  pg._onPop = () => { openChat = null; clearInterval(readTimer); loadChats(); };
}


// ---------------- Opening splash (~5 s): the main bubble breathes in and pops, a handful of bubbles drift out
// with real momentum, float up and sway like soap bubbles, then pop one by one ----------------
// ---------------- Bubble sounds (made in the browser, no files) ----------------
// Browsers only allow sound after the first touch, so the very first fill may be silent.
// One audio context for the whole app. Phones limit how many can exist, and each new one may start
// paused, so it's created once, woken inside a tap, and woken again after calls or other apps' audio.
let actx = null, audioOut = null;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function audio() {
  if (!actx) {
    // Play as media, so the iPhone silent switch doesn't mute it (Safari 17+); set before the context exists
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    audioOut = actx.destination;
    // Older iPhones: route through an <audio> element, which plays even with the silent switch on
    if (isIOS && !navigator.audioSession && actx.createMediaStreamDestination) {
      try {
        const dest = actx.createMediaStreamDestination(), el = new Audio();
        el.srcObject = dest.stream; el.setAttribute('playsinline', '');
        el.play().then(() => { audioOut = dest; }).catch(() => {});
      } catch (e) {}
    }
  }
  wakeAudio();
  return actx;
}
// Must run inside a tap to work on iPhones: resume, and play a moment of silence to unlock output
function wakeAudio() {
  if (!actx) return;
  if (actx.state !== 'running') actx.resume().catch(() => {});
  try { const b = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource(); src.buffer = b; src.connect(actx.destination); src.start(0); } catch (e) {}
}
// The main bubble filling up: a soft rising tone with a watery wobble
function fillSound(dur = 1.6) {
  const c = audio(); if (!c || c.state !== 'running') return;
  const t = c.currentTime + .01;
  const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(520, t + dur);
  lfo.frequency.value = 11; lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .25); g.gain.setValueAtTime(.05, t + dur - .2); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(audioOut); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
  // a few little bubbles rising inside it
  for (let k = 0; k < 6; k++) {
    const tt = t + .15 + k * dur / 7 + Math.random() * .08, b = c.createOscillator(), bg = c.createGain(), f = 500 + Math.random() * 500;
    b.type = 'sine'; b.frequency.setValueAtTime(f, tt); b.frequency.exponentialRampToValueAtTime(f * 1.9, tt + .06);
    bg.gain.setValueAtTime(.0001, tt); bg.gain.exponentialRampToValueAtTime(.035, tt + .01); bg.gain.exponentialRampToValueAtTime(.0001, tt + .08);
    b.connect(bg).connect(audioOut); b.start(tt); b.stop(tt + .1);
  }
}

function runSplash() {
  const sp = $('#splash'), core = $('#splashCore'), word = $('#splashWord'), flash = $('#splashFlash');
  if (!sp || !sp.animate) { if (sp) sp.remove(); return; }
  core.innerHTML = bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 150);
  let done = false, raf = 0, burst = false, B = [], autoT = 0, hardT = 0, autoPopping = false;
  const finish = () => {
    if (done) return; done = true;
    clearTimeout(autoT); clearTimeout(hardT);
    sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { cancelAnimationFrame(raf); sp.remove(); };
  };
  const hard = (ms) => { clearTimeout(hardT); hardT = setTimeout(finish, ms); };
  if (reduced) { word.style.opacity = 1; core.style.transform = 'scale(1)'; sp.addEventListener('click', () => { finish(); }); return; }

  const W = sp.clientWidth, H = sp.clientHeight;
  const ring = (x, y, size, delay) => {
    const r = document.createElement('span'); r.className = 'pring';
    r.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (x - size / 2) + 'px;top:' + (y - size / 2) + 'px';
    sp.appendChild(r);
    r.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1)', opacity: .7, offset: .15 }, { transform: 'scale(1.5)', opacity: 0 }],
      { duration: 460, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = () => r.remove();
  };
  // Like a real soap bubble: the film vanishes in a blink and its rim breaks into droplets that fly out and fall
  const droplets = (x, y, rad) => {
    const n = Math.round(6 + rad / 6);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5, d = document.createElement('span');
      d.className = 'pdrop'; d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (x + Math.cos(a) * rad - s / 2) + 'px;top:' + (y + Math.sin(a) * rad - s / 2) + 'px';
      sp.appendChild(d);
      const out = rad * (.25 + Math.random() * .55) + 10, dx = Math.cos(a) * out, dy = Math.sin(a) * out;
      d.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: 'translate(' + (dx * .7).toFixed(1) + 'px,' + (dy * .7).toFixed(1) + 'px)', opacity: .9, offset: .4 },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + (dy + 26 + Math.random() * 20).toFixed(1) + 'px)', opacity: 0 }
      ], { duration: 420 + Math.random() * 260, easing: 'cubic-bezier(.15,.7,.4,1)', fill: 'forwards' }).onfinish = () => d.remove();
    }
  };
  const pop = (b) => {
    if (!b.alive) return;
    b.alive = false;
    const x = W / 2 + b.x, y = H / 2 + b.y;
    b.f.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.05)', opacity: .85, offset: .35 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 95, easing: 'ease-in', fill: 'forwards' });
    ring(x, y, b.r * 2, 0); droplets(x, y, b.r);
    if (B.every((o) => !o.alive)) setTimeout(finish, 450);
  };
  // After floating for a while the rest pop by themselves, smallest first
  const autoPop = () => {
    if (done) return;
    autoPopping = true;
    const order = B.filter((b) => b.alive).sort((a, c) => a.r - c.r);
    order.forEach((b, k) => setTimeout(() => { if (!done) pop(b); }, k * 42 + Math.random() * 20));
    setTimeout(finish, order.length * 42 + 300);
  };

  // 1. The main bubble fills up (0 – 1.6 s)
  word.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  fillSound();
  const fill = core.animate([
    { transform: 'scale(.18)' },
    { transform: 'scale(.62,.58)', offset: .45 },
    { transform: 'scale(.9,.93)', offset: .75 },
    { transform: 'scale(1.03,.98)', offset: .9 },
    { transform: 'scale(1)' }
  ], { duration: 1600, easing: 'cubic-bezier(.33,.0,.2,1)', fill: 'forwards' });

  // The first bubble waits for a touch, breathing gently
  let idle = null;
  const explode = () => {
    if (done || burst) return;
    burst = true; fill.pause(); if (idle) idle.cancel();
    // 2. It pops
    word.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    core.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: 'ease-in', fill: 'forwards' });
    flash.animate([{ transform: 'scale(1)', opacity: .7 }, { transform: 'scale(2.2)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    droplets(W / 2, H / 2, 70);

    // 3. Bubbles drift out of it: 3 large, 6 medium, 9 small
    const sizes = [128, 112, 96, 84, 76, 68, 60, 54, 48, 42, 38, 34, 30, 28, 26, 24, 22, 20];
    B = sizes.map((size, i) => {
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
    autoT = setTimeout(autoPop, 2150);
    hard(4300);
  };
  fill.onfinish = () => {
    if (burst) return;
    idle = core.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035,.975)' }, { transform: 'scale(.985,1.02)' }, { transform: 'scale(1)' }],
      { duration: 2200, iterations: Infinity, easing: 'ease-in-out' });
  };

  // The first touch pops the big bubble. After that, touch a bubble to pop it; while someone is
  // playing, the rest wait a little longer. A tap on empty space skips ahead.
  sp.addEventListener('pointerdown', (e) => {
    if (done) return;
    const r = sp.getBoundingClientRect(), x = e.clientX - r.left - W / 2, y = e.clientY - r.top - H / 2;
    if (!burst) { explode(); return; }
    let hit = null, best = Infinity;
    for (const b of B) {
      if (!b.alive || b.grow === 0) continue;
      const d = Math.hypot(b.x - x, b.y - y) - b.r * b.grow;
      if (d < 16 && d < best) { best = d; hit = b; }
    }
    if (!hit) { if (!autoPopping) finish(); return; }
    pop(hit);
    if (!autoPopping) { clearTimeout(autoT); autoT = setTimeout(autoPop, 1800); hard(4000); }
  });
}

// ---------------- Gate: sign-in, onboarding, access fee ----------------
// Aura writing: two open questions, written or dictated. Claude reads them to shape the aura and to match.
// Saved as sign-up answers; the dim is only where they're filed (the AI reads the words, not the label).
const SIGNUP = [
  { dim: 'personality', prompt: 'Tell us about yourself', title: 'Tell us about yourself',
    hints: ['Who are you, in a few honest lines?', 'What does your meditation practice look like?', 'What book are you reading right now?', 'What’s your peace temple, the place or moment where you feel calm?', 'What lights you up lately?'],
    ph: 'Write freely, or tap the microphone and just talk.' },
  // The stored prompt stays the same so earlier answers keep matching; only what people see changed
  { dim: 'goals', prompt: 'Who are you looking for?', title: 'Who would you love to meet?',
    hints: ['What kind of friends or community are you hoping to find?', 'What do they care about, and how do they live?', 'Do they meditate? What’s their peace temple?', 'What would you love to do or share together?', 'What makes a friendship feel right to you?'],
    ph: 'Describe them in your own words.' }
];
const TEST = SIGNUP;
const Q0 = 2; // the writing comes after basics and photo
const STEPS = Q0 + TEST.length;
const WRITE_MIN = 40;
const gate = $('#gate');
const COUNTRIES = 'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ');
// Fixed city list, so everyone's city is spelled the same in our data. Each city knows its country,
// which sets the member's country (more reliable than guessing it from their connection).
const CITY_LIST = CITY_DATA;
const CITY_CC = Object.fromEntries(Object.entries(CITY_LIST).flatMap(([cc, list]) => list.map((c) => [c, cc])));
// Your city's country, for saving with the city ('Other' keeps the country we already have)
const cityCountry = (city) => (CITY_CC[city] ? { country: CITY_CC[city] } : {});
function cityOptions(sel, first = 'Choose your city') {
  let names; try { names = new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }); } catch (e) { names = { of: (c) => c }; }
  const opt = (c) => '<option' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>';
  // Grouped by country, so the long list is easy to scan
  const groups = Object.entries(CITY_LIST).map(([cc, list]) => [names.of(cc) || cc, list]).sort((a, b) => a[0].localeCompare(b[0]));
  return '<option value="">' + first + '</option>' + (sel && !CITY_CC[sel] && sel !== 'Other' ? opt(sel) : '') + // keep a city typed before the list existed
    groups.map(([country, list]) => '<optgroup label="' + esc(country) + '">' + list.map(opt).join('') + '</optgroup>').join('') + opt('Other');
}
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
  showGate('<span class="brand">Ora</span><h1 class="largetitle">Almost ready</h1><p class="lead">This copy of Ora isn’t connected to its database yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the environment, then rebuild. The README explains each step.</p>');
}

// Page 1: who you are. Signed out, it also asks for your email and signs you in (no verification for now).
const GENDERS = [['woman', 'A woman'], ['man', 'A man'], ['nonbinary', 'Non-binary']];
const SHOW = [['women', 'Women'], ['men', 'Men'], ['everyone', 'Everyone']];
function gateBasics(msg) {
  const signedIn = Boolean(uid), p = signedIn ? me : (G.basics || {});
  showGate(
    '<span class="brand">Ora</span>' +
    (signedIn ? stepsBar(0) : '<div style="display:flex;justify-content:center;padding:10px 0 2px">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 120) + '</div>') +
    '<h1 class="largetitle">' + (signedIn ? 'Hello. Who are you?' : 'Bump into your perfect bubble.') + '</h1>' +
    '<form id="f" style="display:flex;flex-direction:column;gap:14px" novalidate>' +
      // Only the name and email are needed to create an account; the rest can come later
      '<label class="lbl" for="obName"><span>First name <span class="req" aria-hidden="true">*</span></span><input class="field" id="obName" maxlength="24" required aria-required="true" autocomplete="given-name" value="' + esc(p.name ?? '') + '" placeholder="Your first name"></label>' +
      (signedIn ? '' : '<label class="lbl" for="email"><span>Email <span class="req" aria-hidden="true">*</span></span><input class="field" id="email" type="email" required aria-required="true" autocomplete="email" inputmode="email" value="' + esc(G.email) + '" placeholder="you@example.com"></label>') +
      '<p class="fine" style="margin:2px 0 -4px"><span class="req">*</span> Required. Everything below is optional and can be added later.</p>' +
      '<label class="lbl" for="obBirth">Date of birth<input class="field" id="obBirth" type="date" max="' + adultMax() + '" value="' + esc(p.birthdate || '') + '" autocomplete="bday"></label>' +
      '<div class="lbl">I am<div class="chips" style="margin-top:2px">' + GENDERS.map(([v, l]) => '<button type="button" class="chip' + (p.gender === v ? ' on' : '') + '" data-g="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="lbl">I’d like to meet<div class="chips" style="margin-top:2px">' + SHOW.map(([v, l]) => '<button type="button" class="chip' + ((p.show_me || 'everyone') === v ? ' on' : '') + '" data-s="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<label class="lbl" for="obCity">City<select class="field" id="obCity">' + cityOptions(p.city) + '</select></label>' +
      '<p class="err" id="err" role="alert"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</p>' +
      '<div class="grow"></div><button class="primary" id="go">Continue</button>' +
    '</form>' +
    (signedIn ? '' : '<p class="fine">By continuing you agree to the Terms and Privacy Policy.</p>' +
      '<button class="link" id="toLogin" type="button" style="align-self:center">Already a member? Log in</button>'),
    () => {
      let gender = p.gender, show = p.show_me || 'everyone';
      if (!signedIn) $('#toLogin').onclick = () => gateLogin();

      gate.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { gender = b.dataset.g; gate.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b)); });
      gate.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { show = b.dataset.s; gate.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('on', x === b)); });
      $('#f').onsubmit = async (e) => {
        e.preventDefault();
        const name = $('#obName').value.trim(), city = $('#obCity').value, birth = $('#obBirth').value, age = birth ? ageOf(birth) : null, err = $('#err');
        const say = (m) => { err.textContent = m; err.hidden = false; };
        const email = signedIn ? '' : $('#email').value.trim().toLowerCase();
        G.basics = { name, birthdate: birth, gender, show_me: show, city };
        const missing = () => (!name ? 'Add your first name.' : birth && age < 18 ? 'Ora is for people 18 and over.' : birth && age > 110 ? 'Check your date of birth.' : '');
        if (!signedIn) {
          G.email = email;
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say('Enter a valid email address.');
        } else if (missing()) return say(missing());
        const go = $('#go'); busy(go, true, signedIn ? 'Saving…' : 'One moment…');
        try {
          let country = me?.country;
          if (!signedIn) {
            // Sign in first: a returning member only needs their email
            const out = await API.signInWithEmail(email);
            const fresh = await API.myProfile(out.user.id).catch(() => null);
            if (fresh?.onboarded) { await enter(out.user); return; }
            if (missing()) { await API.signOut(); busy(go, false, 'Continue'); return say(missing()); }
            uid = out.user.id;
            me = fresh;
            if (!me) { await enter(out.user); if (!me) return; }
            country = me.country || out.country;
          }
          // Your Cloud shows people from your country; it can be changed later in your profile
          me = await API.saveProfile(uid, { name, ...(birth ? { birthdate: birth } : {}), ...(gender ? { gender } : {}), show_me: show, ...(city ? { city } : {}), country: CITY_CC[city] || country || guessCountry() || null });
          G.step = 1; gateOnboard();
        } catch (x) { console.error(x); busy(go, false, 'Continue'); say(x?.message || 'That didn’t work. Try again.'); }
      };
    });
}

// The latest date of birth for someone who is 18 today
function adultMax() { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return API.dayKey(d); }

// Log back in with just the email (no password or code for now)
function gateLogin(msg) {
  showGate(
    backBtn + '<span class="brand">Ora</span>' +
    '<div style="display:flex;justify-content:center;padding:10px 0 2px">' + bubbleHTML({ w: [1, 1, 1, 1, 1, 1], clear: true }, 120) + '</div>' +
    '<h1 class="largetitle">Welcome back.</h1>' +
    '<form id="f" style="display:flex;flex-direction:column;gap:14px" novalidate>' +
      '<label class="lbl" for="email">Email<input class="field" id="email" type="email" autocomplete="email" inputmode="email" value="' + esc(G.email) + '" placeholder="The email you joined with"></label>' +
      '<p class="err" id="err" role="alert"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</p>' +
      '<div class="grow"></div><button class="primary" id="go">Log in</button>' +
    '</form>' +
    '<button class="link" id="toJoin" type="button" style="align-self:center">New here? Create your profile</button>',
    () => {
      gate.querySelector('[data-back]').onclick = () => gateBasics();
      $('#toJoin').onclick = () => gateBasics();
      $('#email').focus();
      $('#f').onsubmit = async (e) => {
        e.preventDefault();
        const email = $('#email').value.trim().toLowerCase(), err = $('#err');
        G.email = email;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; err.hidden = false; return; }
        const go = $('#go'); busy(go, true, 'Logging in…');
        try { const out = await API.signInWithEmail(email); await enter(out.user); }
        catch (x) { console.error(x); gateLogin(x?.message || 'That didn’t work. Try again.'); }
      };
    });
}

function gateOnboard() {
  const i = G.step;
  if (i === 0) {
    gateBasics();
  } else if (i === 1) {
    showGate(stepsBar(i) + backBtn + '<h1 class="largetitle">Your bubble</h1><p class="lead">Add a clear photo of you. It sits inside your bubble in everyone’s Cloud.</p>' +
      '<div style="display:flex;justify-content:center;padding:6px 0"><button id="obPhoto" style="border:0;background:none;padding:0;cursor:pointer;position:relative" aria-label="' + (me.photo_path ? 'Change photo' : 'Add a photo') + '">' + bubbleHTML(youObj(), 176) + '<span class="gbtn glass cam" style="position:absolute;right:2px;bottom:2px">' + ICON.cam + '</span></button></div>' +
      '<label class="lbl" for="obStatus">Your status<input class="field" id="obStatus" maxlength="20" value="' + esc(G.status ?? me.status ?? '') + '" placeholder="What’s on your mind"></label>' +
      '<p class="fine" style="margin-top:-6px">Shown above your bubble in other people’s Cloud. 20 characters.</p>' +
      '<p class="err" id="err" role="alert" hidden></p><div class="grow"></div><button class="primary" id="go">' + (me.photo_path ? 'Continue' : 'Add a photo') + '</button>' +
      '<button class="link" id="later" style="align-self:center;color:var(--ink2)">Finish later, start today’s practice</button>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { G.step--; gateOnboard(); };
        $('#later').onclick = async () => { const st = $('#obStatus').value.trim(); if (st && st !== (me.status || '')) me = await API.saveProfile(uid, { status: st }).catch(() => me); skipSetup(); };
        $('#obStatus').oninput = (e) => { G.status = e.target.value; };
        const pick = () => pickPhoto(async (blob) => { await savePhoto(blob); gateOnboard(); });
        $('#obPhoto').onclick = pick;
        $('#go').onclick = async () => {
          if (!me.photo_path) return pick();
          const status = $('#obStatus').value.trim();
          if (status !== (me.status || '')) { try { me = await API.saveProfile(uid, { status }); } catch (x) { fail(x); return; } }
          G.step++; gateOnboard();
        };
      });
  } else {
    const k = i - Q0, q = TEST[k], last = k === TEST.length - 1;
    const val = G.answers[q.dim] ?? '';
    showGate(stepsBar(i) + backBtn + '<p class="label">Your aura · ' + (k + 1) + ' of ' + TEST.length + '</p><h1 class="largetitle">' + esc(q.title) + '</h1>' +
      '<div class="hints"><span class="label">Some ideas</span><ul>' + q.hints.map((h) => '<li>' + esc(h) + '</li>').join('') + '</ul></div>' +
      '<div class="writebox"><label class="hide" for="obWrite">' + esc(q.title) + '</label><textarea id="obWrite" maxlength="1500" placeholder="' + esc(q.ph) + '">' + esc(val) + '</textarea>' +
        micButton() + '</div>' +
      '<p class="fine" id="wcount" style="margin-top:-4px"></p>' +
      '<div class="grow"></div><button class="primary" id="go" disabled>' + (last ? 'Read my aura' : 'Continue') + '</button>' +
      '<button class="link" id="later" style="align-self:center;color:var(--ink2)">Finish later, start today’s practice</button>',
      () => {
        gate.querySelector('[data-back]').onclick = () => { stopDictation(); G.step--; gateOnboard(); };
        const ta = $('#obWrite'), go = $('#go'), wc = $('#wcount');
        const ok = () => {
          G.answers[q.dim] = ta.value;
          const n = ta.value.trim().length;
          go.disabled = n < WRITE_MIN;
          wc.textContent = n < WRITE_MIN ? 'A few more words, please (' + (WRITE_MIN - n) + ' more characters).' : 'Only our AI reads this, to shape your aura and find your matches.';
        };
        ta.oninput = ok; ok();
        $('#mic').onclick = () => toggleDictation(ta, $('#mic'), ok);
        go.onclick = () => { stopDictation(); if (last) finishOnboarding(); else { G.step++; gateOnboard(); } };
        $('#later').onclick = () => { stopDictation(); skipSetup(); };
      });
  }
}

// Dictation where the browser supports it (Chrome, Safari). Words are added to what's already written.
// Dictation. The browser's speech recognition where it works; otherwise (iPhone home-screen app,
// Firefox, dictation turned off) the button points to the keyboard's own microphone, which always works.
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const micButton = (id = 'mic') => '<button type="button" class="mic" id="' + id + '" aria-label="Dictate" aria-pressed="false">' + ICON.mic + '</button>';
let rec_ = null;
function stopDictation() { const r = rec_; rec_ = null; try { r?.stop(); } catch (e) {} }
function toggleDictation(ta, btn, onChange) {
  if (rec_) { stopDictation(); btn.setAttribute('aria-pressed', 'false'); return; }
  const useKeyboard = (why) => { ta.focus(); toast(why || 'Tap the microphone on your keyboard to dictate'); };
  // Safari blocks speech recognition inside a home-screen app; the keyboard's microphone works there
  if (!SpeechRec || (IOS && STANDALONE)) return useKeyboard();
  const r = new SpeechRec();
  r.lang = navigator.language || 'en-US'; r.continuous = true; r.interimResults = true;
  let base = ta.value.trim(), said = '', fatal = false;
  r.onresult = (e) => {
    let interim = '';
    for (let j = e.resultIndex; j < e.results.length; j++) {
      const t = e.results[j][0].transcript.trim();
      if (!e.results[j].isFinal) { interim += ' ' + t; continue; }
      // iPhones repeat everything said so far in each final result: keep the longer one instead of adding
      said = t.toLowerCase().startsWith(said.toLowerCase()) ? t : (said + ' ' + t).trim();
    }
    ta.value = [base, said, interim.trim()].filter(Boolean).join(' '); onChange();
  };
  r.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    fatal = true;
    if (e.error === 'not-allowed') toast('Allow the microphone for this site to dictate');
    else if (e.error === 'service-not-allowed') useKeyboard('Dictation is off here. Tap the microphone on your keyboard instead');
    else if (e.error === 'audio-capture') toast('No microphone found');
    else if (e.error === 'network') toast('Dictation needs an internet connection');
    else useKeyboard();
  };
  // Phones stop listening after a pause: keep going until the button is tapped again
  r.onend = () => {
    if (rec_ === r && !fatal) { base = ta.value.trim(); said = ''; try { r.start(); return; } catch (e) {} }
    if (rec_ === r) rec_ = null;
    btn.setAttribute('aria-pressed', 'false');
  };
  try { r.start(); rec_ = r; btn.setAttribute('aria-pressed', 'true'); } catch (e) { useKeyboard(); }
}

// Skip the rest of setup for now: the Agenda and meditation open right away; the Cloud and chats
// wait until the photo and the two aura answers are done.
function skipSetup() { startApp(); }
function finishSetup() { G = { email: G.email, step: me.photo_path ? Q0 : 1, answers: G.answers || {}, interests: [] }; gateOnboard(); }
const setupDone = () => Boolean(me?.onboarded);

async function finishOnboarding() {
  showGate('<div class="grow"></div><div style="display:flex;justify-content:center">' + bubbleHTML(youObj(), 190) + '</div>' +
    '<h1 class="largetitle" style="text-align:center">Reading your aura…</h1><p class="lead" style="text-align:center;margin:0 auto">This takes a few seconds.</p><div style="display:flex;justify-content:center"><div class="spinner"></div></div><div class="grow"></div>');
  try {
    await API.signupAnswers(uid, SIGNUP.map((q) => ({ dim: q.dim, prompt: q.prompt, data: { text: String(G.answers[q.dim] || '').trim() } })));
    me = await API.saveProfile(uid, { onboarded: true });
  } catch (e) { fail(e); gateOnboard(); return; }
  try { await API.api('match'); } catch (e) { console.error(e); }
  me = await API.myProfile(uid);
  const aura = dimsToW(me.aura), tot = aura.reduce((a, b) => a + b, 0) || 1;
  showGate('<p class="label">Your aura</p>' +
    '<div style="display:flex;justify-content:center;padding:4px 0">' + bubbleHTML(youObj(), 190) + '</div>' +
    (me.aura_summary ? '<p class="reason-line" style="text-align:center">' + esc(me.aura_summary) + '</p>' : '<p class="lead" style="text-align:center">Your aura will sharpen as you answer the daily rituals.</p>') +
    '<div style="display:flex;flex-direction:column;gap:10px">' + auraLines(aura) + '</div>' +
    '<p class="fine">The colours around your bubble come from this. On other people’s bubbles, they show why you match.</p>' +
    '<div class="grow"></div><button class="primary" id="go">' + (needsMembership() ? 'Continue' : 'Enter Ora') + '</button>',
    () => { $('#go').onclick = () => afterOnboarding(); });
}
function afterOnboarding() {
  if (needsMembership()) gatePaywall(); else { startApp(); updateLocks(); loadCloud(); }
}
const needsMembership = () => config.paywall && !me.paid_at;

function gatePaywall(msg) {
  const price = config.price || '$5';
  showGate('<span class="brand">Ora</span>' +
    '<div style="display:flex;justify-content:center;padding:10px 0">' + bubbleHTML(youObj(), 150) + '</div>' +
    '<h1 class="largetitle">Your aura is ready. Unlock Ora.</h1>' +
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
    if (!needsMembership()) { toast('Welcome to Ora'); return startApp(); }
    await new Promise((r) => setTimeout(r, 1500));
  }
  gatePaywall('We haven’t received confirmation from Stripe yet. If you paid, reopen the app in a minute.');
}

// ---------------- Boot ----------------
let appStarted = false, unsubscribeMessages = null;
function onEnter(i) {
  if (i === TAB.agenda) renderAgenda();
  if (i === TAB.meditation) renderMeditation();
  if (i === TAB.chats) { renderChats(); loadChats(); }
  if (i === TAB.cloud) { last = performance.now(); refreshBadges(); if (!cloudLoaded) loadCloud(); }
}
function renderAll() { renderAgenda(); renderMeditation(); renderChats(); refreshYou(); refreshMeBtn(); refreshBadges(); updateLocks(); }

async function enter(user) {
  uid = user.id;
  store.set('rareness.member', '1'); // next time this device is signed out, show Log in first
  try { me = await API.myProfile(uid); } catch (e) {
    // The profile row is created by a database trigger; create it if that hasn't happened yet
    await API.sb.from('profiles').insert({ id: uid }).select().single().then(({ data }) => { me = data; });
    if (!me) { fail(e); return; }
  }
  const billing = new URLSearchParams(location.search).get('billing');
  if (billing) history.replaceState(null, '', location.pathname);
  if (!me.onboarded) {
    // Past the first page: straight into the Agenda; the rest of setup waits for the Cloud and chats
    if (me.name) { startApp(); return; }
    G = { email: G.email, step: 0, answers: {}, interests: [] }; gateOnboard(); return;
  }
  if (needsMembership()) { if (billing === 'success') confirmMembership(); else gatePaywall(billing === 'cancelled' ? 'Checkout was cancelled. You can try again whenever you like.' : ''); return; }
  startApp();
}
// The day and its parts move on while the app stays open (phones keep a home-screen app in memory for
// days). Checked every 30 seconds and whenever the app comes back to the screen: a new day reloads
// your activity and today's suggestion and redraws everything; noon and 6 pm redraw and lock again.
let clockDay = null, clockPeriod = null;
async function checkClock() {
  if (!uid || !appStarted) return;
  const d = today(), p = periodNow();
  if (d !== clockDay) {
    clockDay = d; clockPeriod = p;
    try { myAnswers = await API.myAnswers(uid); } catch (e) { console.warn('answers', e.message); }
    try { myPractices = await API.myPractices(uid); } catch (e) { console.warn('practices', e.message); }
    loadSuggestion(); renderAll();
  } else if (p !== clockPeriod) { clockPeriod = p; renderAgenda(); renderMeditation(); }
  updateLocks();
}
async function startApp() {
  hideGate();
  try { myAnswers = await API.myAnswers(uid); } catch (e) { fail(e); }
  try { myPractices = await API.myPractices(uid); } catch (e) { console.warn('practices', e.message); myPractices = []; }
  loadSuggestion();
  buildCloud(people); renderAll(); paint();
  loadCloud(); loadChats();
  if (!appStarted) {
    appStarted = true;
    requestAnimationFrame(loop);
    clockDay = today(); clockPeriod = periodNow();
    setInterval(checkClock, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkClock(); });
    window.addEventListener('pageshow', checkClock); window.addEventListener('focus', checkClock);
    schedulePresent();
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
    if (store.get('rareness.member')) gateLogin(); else gateBasics();
    return;
  }
  enter(s.user);
}
boot();

