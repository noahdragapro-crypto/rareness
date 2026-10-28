// Dashboard for the Ora team, in tabs: Overview, People (with the world map), Activity, Library,
// Connections and Members. Uses the same sign-in as the app; the server only answers for emails in ADMIN_EMAILS.
import * as API from './api.js';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import WORLD from 'world-atlas/countries-110m.json';
import NUMERIC from '../shared/iso-numeric.json';

const root = document.getElementById('root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = (d) => (d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '–');
const yes = (v) => (v ? '<span class="yes">Yes</span>' : '<span class="no">No</span>');
const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '');
let REGION; try { REGION = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { REGION = { of: (c) => c }; }
const countryName = (cc) => (cc ? REGION.of(cc) || cc : '');

const TABS = [['overview', 'Overview'], ['people', 'People'], ['activity', 'Activity'], ['library', 'Library'], ['connections', 'Connections'], ['members', 'Members']];
let data = null, tab = (location.hash.slice(1) in Object.fromEntries(TABS)) ? location.hash.slice(1) : 'overview';
let q = '', city = '', country = '', only = '';

function message(html) { root.innerHTML = '<div class="msg"><span class="brand">Ora</span>' + html + '</div>'; }

async function load() {
  if (!API.configured) return message('<p>This copy isn’t connected to its database.</p>');
  const s = await API.session().catch(() => null);
  if (!s) return message('<h2>Log in first</h2><p class="muted">Open the app, log in with your email, then come back to this page.</p><a href="/">Open Ora</a>');
  try { data = await API.api('admin', 'GET'); } catch (e) { return message('<h2>No access</h2><p class="muted">' + esc(e.message) + '</p>'); }
  render();
}

// ---------------- Building blocks ----------------
const tiles = (list) => '<div class="tiles">' + list.map(([n, label, note]) => '<div class="tile"><b>' + n + '</b><span>' + esc(label) + '</span>' + (note ? '<em>' + esc(note) + '</em>' : '') + '</div>').join('') + '</div>';
const card = (title, note, body, cls = '') => '<section class="card ' + cls + '" aria-label="' + esc(title) + '"><div class="ch"><h2>' + esc(title) + '</h2>' + (note ? '<span class="muted">' + esc(note) + '</span>' : '') + '</div>' + body + '</section>';
const heading = (title, note) => '<div class="gh"><h2 class="gt">' + esc(title) + '</h2>' + (note ? '<p class="muted">' + esc(note) + '</p>' : '') + '</div>';
const table = (cols, body, numeric = []) => '<div class="tablewrap"><table><thead><tr>' + cols.map((h, i) => '<th' + (numeric.includes(i) ? ' class="num"' : '') + '>' + h + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';
// Horizontal bars: one hue, the value (and share of members) written at the end of each bar
function bars(pairs, total, opts = {}) {
  const list = opts.limit ? pairs.slice(0, opts.limit) : pairs;
  if (!list.length) return '<p class="muted" style="margin:0">' + (opts.empty || 'Nothing yet.') + '</p>';
  const max = Math.max(1, ...list.map((p) => p[1]));
  return '<div class="bars">' + list.map(([label, n]) => {
    const share = total ? pct(n, total) : '';
    return '<div class="brow" title="' + esc(label + ': ' + n + (share ? ' (' + share + ')' : '')) + '"><span class="bl">' + esc(label) + '</span>' +
      '<span class="bt"><span class="bf" style="width:' + (n ? Math.max(2, n / max * 100) : 0) + '%"></span></span><span class="bv">' + n + (share ? '<em>' + share + '</em>' : '') + '</span></div>';
  }).join('') + (pairs.length > list.length ? '<p class="muted more">+ ' + (pairs.length - list.length) + ' more</p>' : '') + '</div>';
}

// ---------------- Per-day bar chart (one series: no legend, hover shows the count) ----------------
const chartCard = (id, title, note, series, unit) => card(title, note, '<div class="chart" id="' + id + '"></div>' +
  '<table class="sr"><caption>' + esc(title) + ' per day</caption><tr><th>Day</th><th>' + esc(unit) + '</th></tr>' + Object.keys(series).map((d) => '<tr><td>' + d + '</td><td>' + series[d] + '</td></tr>').join('') + '</table>');
function drawChart(id, series, say) {
  const box = document.getElementById(id); if (!box || !box.clientWidth) return;
  const days = Object.keys(series), vals = days.map((d) => series[d]), max = Math.max(1, ...vals);
  const W = box.clientWidth, H = 140, gap = W < 500 ? 4 : 6, bw = (W - gap * (days.length - 1)) / days.length;
  const every = W < 500 ? 3 : 2, top = (v) => H - (v ? Math.max(4, v / max * H) : 0);
  const marks = days.map((d, i) => {
    const y = top(vals[i]), h = H - y, x = i * (bw + gap), r = Math.min(4, h / 2, bw / 2);
    const path = h ? 'M' + x + ',' + H + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + H + 'Z' : '';
    const label = (days.length - 1 - i) % every === 0 ? '<text class="axis" x="' + (x + bw / 2) + '" y="' + (H + 16) + '" text-anchor="middle">' + esc(fmtDay(d)) + '</text>' : '';
    return '<g data-i="' + i + '"><rect class="hit" x="' + (x - gap / 2) + '" y="0" width="' + (bw + gap) + '" height="' + (H + 20) + '"></rect>' + (path ? '<path class="bar" d="' + path + '"></path>' : '') + label + '</g>';
  }).join('');
  box.innerHTML = '<svg width="' + W + '" height="' + (H + 24) + '" role="img" aria-label="' + esc(id) + ' per day, last 14 days"><line class="base" x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '"></line>' + marks + '</svg><div class="tip"></div>';
  const tip = box.querySelector('.tip');
  box.querySelectorAll('g[data-i]').forEach((g) => {
    g.onmouseenter = () => {
      const i = +g.dataset.i;
      tip.textContent = fmtDay(days[i]) + ': ' + say(vals[i]);
      tip.style.left = Math.min(W - 70, Math.max(70, i * (bw + gap) + bw / 2)) + 'px'; tip.style.top = (top(vals[i]) - 4) + 'px'; tip.style.opacity = 1;
    };
    g.onmouseleave = () => { tip.style.opacity = 0; };
  });
}

// ---------------- World map: members per country, one hue from light to dark ----------------
const COUNTRIES = feature(WORLD, WORLD.objects.countries).features;
const ccOf = (f) => NUMERIC[f.id] || (f.properties.name === 'Kosovo' ? 'XK' : '');
const STEPS = 5;
function drawMap() {
  const box = document.getElementById('map'); if (!box || !box.clientWidth) return;
  const counts = Object.fromEntries(data.segments.countryCodes), total = data.users.length;
  const max = Math.max(1, ...Object.values(counts)), steps = Math.min(STEPS, max);
  const step = (n) => (n ? Math.max(1, Math.ceil(n / max * steps)) : 0);
  const W = box.clientWidth, H = Math.round(W * .5);
  const proj = geoEqualEarth().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' }), path = geoPath(proj);
  box.innerHTML = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="Members per country"><path class="sphere" d="' + path({ type: 'Sphere' }) + '"></path>' +
    COUNTRIES.map((f) => { const cc = ccOf(f), n = counts[cc] || 0; return '<path class="land s' + step(n) + (n ? ' has' : '') + '" data-cc="' + cc + '" d="' + path(f) + '"></path>'; }).join('') +
    '</svg><div class="tip"></div>';
  const tip = box.querySelector('.tip');
  box.querySelectorAll('.land').forEach((p) => {
    p.onmousemove = (e) => {
      const cc = p.dataset.cc, n = counts[cc] || 0, r = box.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(countryName(cc) || 'Unknown') + '</b> ' + n + ' member' + (n === 1 ? '' : 's') + (n ? ' · ' + pct(n, total) : '');
      tip.style.left = Math.min(W - 90, Math.max(90, e.clientX - r.left)) + 'px'; tip.style.top = (e.clientY - r.top - 8) + 'px'; tip.style.opacity = 1;
    };
    p.onmouseleave = () => { tip.style.opacity = 0; };
    // Tap a country with members to see them in the member list
    p.onclick = () => { if (counts[p.dataset.cc]) { country = p.dataset.cc; city = ''; go('members'); } };
  });
  // Legend: the steps of the ramp with the member counts they stand for
  const lg = document.getElementById('mapLegend');
  if (lg) lg.innerHTML = '<span class="muted">Members</span>' + Array.from({ length: steps }, (_, i) => {
    const lo = Math.floor(i * max / steps) + 1, hi = Math.floor((i + 1) * max / steps);
    return '<span class="key"><i class="s' + (i + 1) + '"></i>' + (lo >= hi ? hi : lo + '–' + hi) + '</span>';
  }).join('') + '<span class="key"><i class="s0"></i>None</span>';
}

// ---------------- Tabs ----------------
function overview() {
  const t = data.totals, L = data.library, c = data.connections;
  return tiles([
      [t.members, 'Members', 'accounts created'], [t.finishedSignup, 'Finished sign-up', pct(t.finishedSignup, t.members) + ' of members'],
      [t.activeToday, 'Active today', t.allThreeToday + ' did all three'], [t.active7, 'Active this week', pct(t.active7, t.members) + ' of members'],
      [L.sessions30, 'Practices', 'last 30 days'], [c.chats, 'Chats', c.mutualRate + '% of bumps returned']]) +
    '<div class="grid two">' +
      chartCard('chartNew', 'New members', 'last 14 days · ' + Object.values(data.signups).reduce((a, b) => a + b, 0) + ' in total', data.signups, 'New members') +
      chartCard('chartActive', 'Active members', 'did at least one task, per day', data.active, 'Active members') +
    '</div>';
}
function people() {
  const s = data.segments, n = data.users.length;
  return heading('Where they are', 'From the city each member picks, or their connection at sign-up. Tap a country to see its members.') +
    '<div class="grid map2">' +
      card('Members per country', '', '<div class="map" id="map"></div><div class="legend" id="mapLegend"></div>') +
      '<div class="stack">' + card('Countries', '', bars(s.country, n, { limit: 8 })) + card('Cities', '', bars(s.city, n, { limit: 8 })) + '</div>' +
    '</div>' +
    heading('Who they are', 'Shares are of all ' + n + ' members. “Here for” and interests can have several answers each.') +
    '<div class="grid">' +
      card('Gender', '', bars(s.gender, n)) + card('Age', '', bars(s.age, n)) + card('Would like to meet', '', bars(s.lookingFor, n)) +
      card('Main language', '', bars(s.language, n, { limit: 8 })) + card('Here for', 'from Edit profile', bars(s.here, n, { empty: 'Nobody has chosen yet.' })) +
      card('Meditation experience', 'from Edit profile', bars(s.experience, n)) +
    '</div>' + card('Top interests', '', bars(s.interests, n), 'wide');
}
function activity() {
  return heading('What people use', 'Last 30 days. Ora Master chats and focus bubbles stay on each phone, so they can’t be counted here.') +
    '<div class="grid two">' + card('Features', 'times used', bars(data.features, 0)) + card('Profiles', 'members who filled it in', bars(data.profileUse, data.users.length)) + '</div>' +
    heading('By gender', 'Averages per member. Tasks are counted the way the app does: the daily tasks plus each different library practice, over the last 30 days.') +
    card('Activity per member', '', table(['', 'Members', 'Finished sign-up', 'Active this week', 'Tasks (30 days)', 'Active days (30)', 'Bumps sent', 'Chats', 'Messages sent'],
      data.byGender.map((g) => '<tr><td>' + esc(g.label) + '</td><td class="num">' + g.members + '</td><td class="num">' + g.finishedSignup + '</td><td class="num">' + g.active7 + '</td>' +
        '<td class="num">' + g.tasks30 + '</td><td class="num">' + g.activeDays30 + '</td><td class="num">' + g.bumps + '</td><td class="num">' + g.chats + '</td><td class="num">' + g.messages + '</td></tr>').join(''),
      [1, 2, 3, 4, 5, 6, 7, 8]));
}
function library() {
  const L = data.library, top = L.top.slice(0, 12);
  return tiles([[L.sessions, 'Sessions', 'all time'], [L.sessions30, 'Sessions', 'last 30 days'], [L.people, 'Members practising'],
      [Math.round(L.minutes / 6) / 10, 'Hours practised', 'timed practices'], [L.checkInRate + '%', 'Check-ins answered', 'after a session']]) +
    '<div class="grid two">' +
      card('Most popular practices', 'by sessions', top.length ? table(['#', 'Practice', 'Group', 'Sessions', 'Members', 'Last 30 days'],
        top.map((x, i) => '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.cat) + '</td><td class="num">' + x.sessions + '</td><td class="num">' + x.people + '</td><td class="num">' + x.recent + '</td></tr>').join(''), [0, 3, 4, 5]) : '<p class="muted" style="margin:0">No sessions yet.</p>') +
      '<div class="stack">' + card('By group', 'sessions', bars(L.byCategory, L.sessions)) + card('Levels reached', 'member and practice pairs', bars(L.levels, 0)) + '</div>' +
    '</div>' +
    (L.neverTried.length ? card('Never tried yet', L.neverTried.length + ' practices', '<p class="muted" style="margin:0;line-height:1.6">' + esc(L.neverTried.join(' · ')) + '</p>', 'wide') : '');
}
function connections() {
  const c = data.connections, n = data.users.length;
  return '<div class="grid two">' +
      card('From member to conversation', 'members at each step', bars([['Members', n], ['Bumped someone', c.membersBumping], ['In a chat', c.membersWithChat]], n)) +
      card('Chats', '', bars([['Chats opened', c.chats], ['With messages', c.chatsWithMessages]], 0)) +
    '</div>' +
    tiles([[c.bumps, 'Bumps'], [c.mutualRate + '%', 'Bumps returned', 'became a chat'], [c.messagesPerChat, 'Messages per chat'], [c.reports, 'Reports'], [c.blocks, 'Blocks']]);
}

// ---------------- Members ----------------
function rows() {
  const s = q.trim().toLowerCase();
  return data.users.filter((u) =>
    (!city || u.city === city) && (!country || u.country === country) &&
    (!only || (only === 'done' ? u.finishedSignup : !u.finishedSignup)) &&
    (!s || [u.name, u.email, u.city, u.status].some((x) => (x || '').toLowerCase().includes(s))));
}
function memberTable() {
  const list = rows();
  const label = { woman: 'Woman', man: 'Man', nonbinary: 'Non-binary', women: 'Women', men: 'Men', everyone: 'Everyone' };
  return '<p class="muted" style="margin:0 0 8px">' + list.length + ' of ' + data.users.length + ' members</p>' +
    table(['Name', 'Email', 'Age', 'I am', 'Looking for', 'City', 'Country', 'Joined', 'Sign-up done', 'Photo', 'Active days (30)', 'Tasks (30)', 'Last active', 'Tasks today', 'Bumps', 'Chats', 'Status', 'Interests'],
      list.map((u) => '<tr>' +
        '<td>' + esc(u.name || '–') + '</td><td>' + esc(u.email) + '</td><td class="num">' + (u.age ?? '–') + '</td>' +
        '<td>' + esc(label[u.gender] || '–') + '</td><td>' + esc(label[u.lookingFor] || '–') + '</td><td>' + esc(u.city || '–') + '</td><td>' + esc(countryName(u.country) || '–') + '</td>' +
        '<td>' + fmtDay(u.joined) + '</td><td>' + yes(u.finishedSignup) + '</td><td>' + yes(u.hasPhoto) + '</td>' +
        '<td class="num">' + u.activeDays30 + '</td><td class="num">' + u.tasks30 + '</td><td>' + fmtDay(u.lastActive) + '</td><td class="num">' + u.tasksToday + '</td>' +
        '<td class="num">' + u.bumps + '</td><td class="num">' + u.chats + '</td>' +
        '<td>' + esc(u.status || '') + '</td><td class="wrap">' + esc((u.interests || []).join(', ')) + '</td></tr>').join(''),
      [2, 10, 11, 13, 14, 15]);
}
function members() {
  const cities = [...new Set(data.users.map((u) => u.city).filter(Boolean))].sort();
  const countries = [...new Set(data.users.map((u) => u.country).filter(Boolean))].map((c) => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
  return '<section class="card" aria-label="Members"><div class="filters">' +
      '<label class="sr" for="q">Search</label><input id="q" type="search" placeholder="Search name, email, city or status" value="' + esc(q) + '">' +
      '<label class="sr" for="country">Country</label><select id="country"><option value="">All countries</option>' + countries.map(([c, nm]) => '<option value="' + c + '"' + (c === country ? ' selected' : '') + '>' + esc(nm) + '</option>').join('') + '</select>' +
      '<label class="sr" for="city">City</label><select id="city"><option value="">All cities</option>' + cities.map((c) => '<option' + (c === city ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
      '<label class="sr" for="only">Sign-up</label><select id="only"><option value="">Everyone</option><option value="done"' + (only === 'done' ? ' selected' : '') + '>Finished sign-up</option><option value="not"' + (only === 'not' ? ' selected' : '') + '>Still signing up</option></select>' +
      '<button class="btn" id="csv">Download CSV</button>' +
    '</div><div id="tbl">' + memberTable() + '</div></section>';
}
function csv() {
  const cols = ['name', 'email', 'age', 'gender', 'lookingFor', 'city', 'country', 'language', 'joined', 'finishedSignup', 'hasPhoto', 'activeDays30', 'tasks30', 'lastActive', 'tasksToday', 'bumps', 'chats', 'messages', 'status', 'interests', 'here'];
  const cell = (v) => '"' + String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""') + '"';
  const text = [cols.join(',')].concat(rows().map((u) => cols.map((c) => cell(u[c])).join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = 'ora-members-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}

// ---------------- Page ----------------
const VIEWS = { overview, people, activity, library, connections, members };
function go(t) { tab = t; history.replaceState(null, '', '#' + t); render(); window.scrollTo(0, 0); }
function drawVisible() {
  if (tab === 'overview') {
    drawChart('chartNew', data.signups, (n) => n + ' new member' + (n === 1 ? '' : 's'));
    drawChart('chartActive', data.active, (n) => n + ' active member' + (n === 1 ? '' : 's'));
  }
  if (tab === 'people') drawMap();
}
function render() {
  root.innerHTML =
    '<header><div><span class="brand">Ora</span><h1>Dashboard</h1><p class="muted" style="margin:6px 0 0">' + data.users.length + ' members · updated ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + '</p></div>' +
      '<button class="btn" id="refresh">Refresh</button></header>' +
    '<nav class="tabs" role="tablist" aria-label="Dashboard sections">' + TABS.map(([id, label]) => '<button role="tab" data-tab="' + id + '" aria-selected="' + (id === tab) + '">' + label + '</button>').join('') + '</nav>' +
    '<div class="view" role="tabpanel">' + VIEWS[tab]() + '</div>';
  root.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => go(b.dataset.tab));
  document.getElementById('refresh').onclick = () => { root.querySelector('header .muted').textContent = 'Refreshing…'; load(); };
  if (tab === 'members') {
    const refreshTable = () => { document.getElementById('tbl').innerHTML = memberTable(); };
    document.getElementById('q').oninput = (e) => { q = e.target.value; refreshTable(); };
    document.getElementById('country').onchange = (e) => { country = e.target.value; refreshTable(); };
    document.getElementById('city').onchange = (e) => { city = e.target.value; refreshTable(); };
    document.getElementById('only').onchange = (e) => { only = e.target.value; refreshTable(); };
    document.getElementById('csv').onclick = csv;
  }
  drawVisible();
}

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => data && drawVisible(), 150); });
load();
