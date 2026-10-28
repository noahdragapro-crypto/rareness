// Dashboard for the Ora team: members, who they are, what they use, the library, connections and the member list.
// Uses the same sign-in as the app; the server only answers for emails in ADMIN_EMAILS.
import * as API from './api.js';

const root = document.getElementById('root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = (d) => (d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '–');
const yes = (v) => (v ? '<span class="yes">Yes</span>' : '<span class="no">No</span>');
let data = null, q = '', city = '', only = '';

function message(html) { root.innerHTML = '<div class="msg"><span class="brand">Ora</span>' + html + '</div>'; }

async function load() {
  if (!API.configured) return message('<p>This copy isn’t connected to its database.</p>');
  const s = await API.session().catch(() => null);
  if (!s) return message('<h2>Log in first</h2><p class="muted">Open the app, log in with your email, then come back to this page.</p><a href="/">Open Ora</a>');
  try { data = await API.api('admin', 'GET'); } catch (e) { return message('<h2>No access</h2><p class="muted">' + esc(e.message) + '</p>'); }
  render();
}

function tiles(t) {
  const tile = (n, label, note) => '<div class="tile"><b>' + n + '</b><span>' + label + '</span>' + (note ? '<em>' + note + '</em>' : '') + '</div>';
  const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '');
  return '<section class="tiles" aria-label="Totals">' +
    tile(t.members, 'Members', 'accounts created') +
    tile(t.finishedSignup, 'Finished sign-up', pct(t.finishedSignup, t.members) + ' of members') +
    tile(t.activeToday, 'Active today', 'did at least one task') +
    tile(t.active7, 'Active this week', pct(t.active7, t.members) + ' of members') +
    tile(t.allThreeToday, 'All three today', 'Cloud unlocked') +
    tile(t.bumps, 'Bumps') + tile(t.chats, 'Chats', 'mutual bumps') + tile(t.messages, 'Messages') +
    '</section>';
}

// New members per day, last 14 days: one series, so no legend; hover shows the exact count.
// Drawn at the card's real width so text never stretches.
function chartCard(id, title, note, series, unit) {
  const days = Object.keys(series);
  return '<section class="card" aria-label="' + esc(title) + '"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><h2>' + esc(title) + '</h2><span class="muted">' + esc(note) + '</span></div>' +
    '<div class="chart" id="' + id + '"></div>' +
    '<table class="sr"><caption>' + esc(title) + ' per day</caption><tr><th>Day</th><th>' + esc(unit) + '</th></tr>' + days.map((d) => '<tr><td>' + d + '</td><td>' + series[d] + '</td></tr>').join('') + '</table></section>';
}
function drawCharts() {
  drawChart('chart', data.signups, (n) => n + ' new member' + (n === 1 ? '' : 's'));
  drawChart('chartActive', data.active, (n) => n + ' active member' + (n === 1 ? '' : 's'));
}
function drawChart(id, signups, say) {
  const box = document.getElementById(id); if (!box) return;
  const days = Object.keys(signups), vals = days.map((d) => signups[d]), max = Math.max(1, ...vals);
  const W = box.clientWidth, H = 150, gap = W < 500 ? 4 : 8, bw = (W - gap * (days.length - 1)) / days.length;
  const every = W < 500 ? 3 : 2, top = (v) => H - (v ? Math.max(4, v / max * H) : 0);
  const bars = days.map((d, i) => {
    const y = top(vals[i]), h = H - y, x = i * (bw + gap), r = Math.min(4, h / 2, bw / 2);
    const path = h ? 'M' + x + ',' + H + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + H + 'Z' : '';
    const label = (days.length - 1 - i) % every === 0 ? '<text class="axis" x="' + (x + bw / 2) + '" y="' + (H + 16) + '" text-anchor="middle">' + esc(fmtDay(d)) + '</text>' : '';
    return '<g data-i="' + i + '"><rect class="hit" x="' + (x - gap / 2) + '" y="0" width="' + (bw + gap) + '" height="' + (H + 20) + '"></rect>' + (path ? '<path class="bar" d="' + path + '"></path>' : '') + label + '</g>';
  }).join('');
  box.innerHTML = '<svg width="' + W + '" height="' + (H + 24) + '" role="img" aria-label="Per day for the last 14 days"><line class="base" x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '"></line>' + bars + '</svg><div class="tip"></div>';
  const tip = box.querySelector('.tip');
  box.querySelectorAll('g[data-i]').forEach((g) => {
    g.onmouseenter = () => {
      const i = +g.dataset.i, n = vals[i];
      tip.textContent = fmtDay(days[i]) + ': ' + say(n);
      tip.style.left = Math.min(W - 70, Math.max(70, i * (bw + gap) + bw / 2)) + 'px'; tip.style.top = (top(n) - 4) + 'px'; tip.style.opacity = 1;
    };
    g.onmouseleave = () => { tip.style.opacity = 0; };
  });
}

// A list of horizontal bars: one hue, the value (and share) written at the end of each bar
function bars(pairs, total, opts = {}) {
  if (!pairs.length) return '<p class="muted" style="margin:0">' + (opts.empty || 'Nothing yet.') + '</p>';
  const max = Math.max(1, ...pairs.map((p) => p[1]));
  return '<div class="bars">' + pairs.map(([label, n]) => {
    const share = total && !opts.noShare ? Math.round(n / total * 100) + '%' : '';
    return '<div class="brow" title="' + esc(label + ': ' + n + (share ? ' (' + share + ')' : '')) + '"><span class="bl">' + esc(label) + '</span>' +
      '<span class="bt"><span class="bf" style="width:' + (n ? Math.max(2, n / max * 100) : 0) + '%"></span></span><span class="bv">' + n + (share ? '<em>' + share + '</em>' : '') + '</span></div>';
  }).join('') + '</div>';
}
const card = (title, note, body) => '<section class="card" aria-label="' + esc(title) + '"><div class="ch"><h2>' + esc(title) + '</h2>' + (note ? '<span class="muted">' + esc(note) + '</span>' : '') + '</div>' + body + '</section>';
const section = (title, note, body) => '<section class="group" aria-label="' + esc(title) + '"><div class="gh"><h2 class="gt">' + esc(title) + '</h2>' + (note ? '<p class="muted">' + esc(note) + '</p>' : '') + '</div>' + body + '</section>';
const statTiles = (list) => '<div class="tiles">' + list.map(([n, label, note]) => '<div class="tile"><b>' + n + '</b><span>' + esc(label) + '</span>' + (note ? '<em>' + esc(note) + '</em>' : '') + '</div>').join('') + '</div>';
const simpleTable = (cols, body, numeric = []) => '<div class="tablewrap"><table><thead><tr>' + cols.map((h, i) => '<th' + (numeric.includes(i) ? ' class="num"' : '') + '>' + h + '</th>').join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';

function whoSection() {
  const s = data.segments, n = data.users.length;
  return section('Who’s here', 'Shares are of all ' + n + ' members. “Here for” and interests can have several answers each.', '<div class="grid">' +
    card('Gender', '', bars(s.gender, n)) + card('Age', '', bars(s.age, n)) + card('Country', '', bars(s.country, n)) +
    card('City', '', bars(s.city, n)) + card('Would like to meet', '', bars(s.lookingFor, n)) + card('Main language', '', bars(s.language, n)) +
    card('Here for', 'from Edit profile', bars(s.here, n, { empty: 'Nobody has chosen yet.' })) + card('Meditation experience', 'from Edit profile', bars(s.experience, n)) +
    card('Top interests', '', bars(s.interests, n)) + '</div>');
}
function genderSection() {
  return section('By gender', 'Averages per member. Tasks are counted the way the app does: the daily tasks plus each different library practice, over the last 30 days.',
    '<section class="card">' + simpleTable(['', 'Members', 'Finished sign-up', 'Active this week', 'Tasks (30 days)', 'Active days (30)', 'Bumps sent', 'Chats', 'Messages sent'],
      data.byGender.map((g) => '<tr><td>' + esc(g.label) + '</td><td class="num">' + g.members + '</td><td class="num">' + g.finishedSignup + '</td><td class="num">' + g.active7 + '</td>' +
        '<td class="num">' + g.tasks30 + '</td><td class="num">' + g.activeDays30 + '</td><td class="num">' + g.bumps + '</td><td class="num">' + g.chats + '</td><td class="num">' + g.messages + '</td></tr>').join(''),
      [1, 2, 3, 4, 5, 6, 7, 8]) + '</section>');
}
function useSection() {
  return section('What people use', 'Ora Master chats and focus bubbles stay on each phone, so they can’t be counted here.', '<div class="grid two">' +
    card('Features', 'times used, last 30 days', bars(data.features, 0, { noShare: true })) +
    card('Profiles', 'members who filled it in', bars(data.profileUse, data.users.length)) + '</div>');
}
function librarySection() {
  const L = data.library, top = L.top.slice(0, 12);
  return section('Meditation library', '', statTiles([
      [L.sessions, 'Sessions', 'all time'], [L.sessions30, 'Sessions', 'last 30 days'], [L.people, 'Members practising'],
      [Math.round(L.minutes / 6) / 10, 'Hours practised', 'timed practices'], [L.checkInRate + '%', 'Check-ins answered', 'after a session']]) +
    '<div class="grid two">' +
      card('Most popular practices', 'by sessions', top.length ? simpleTable(['#', 'Practice', 'Group', 'Sessions', 'Members', 'Last 30 days'],
        top.map((x, i) => '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.cat) + '</td><td class="num">' + x.sessions + '</td><td class="num">' + x.people + '</td><td class="num">' + x.recent + '</td></tr>').join(''), [0, 3, 4, 5]) : '<p class="muted" style="margin:0">No sessions yet.</p>') +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        card('By group', 'sessions', bars(L.byCategory, L.sessions)) +
        card('Levels reached', 'member and practice pairs', bars(L.levels, 0, { noShare: true })) + '</div>' +
    '</div>' +
    (L.neverTried.length ? '<p class="muted" style="margin:0 2px">Never tried yet: ' + esc(L.neverTried.join(', ')) + '.</p>' : ''));
}
function connectionSection() {
  const c = data.connections;
  return section('Connections', '', statTiles([
    [c.bumps, 'Bumps'], [c.chats, 'Chats', 'mutual bumps'], [c.mutualRate + '%', 'Bumps returned', 'became a chat'],
    [c.membersBumping, 'Members who bumped'], [c.membersWithChat, 'Members with a chat'], [c.chatsWithMessages, 'Chats with messages'],
    [c.messagesPerChat, 'Messages per chat'], [c.reports, 'Reports'], [c.blocks, 'Blocks']]));
}

function rows() {
  const s = q.trim().toLowerCase();
  return data.users.filter((u) =>
    (!city || u.city === city) &&
    (!only || (only === 'done' ? u.finishedSignup : !u.finishedSignup)) &&
    (!s || [u.name, u.email, u.city, u.status].some((x) => (x || '').toLowerCase().includes(s))));
}
function table() {
  const list = rows();
  const label = { woman: 'Woman', man: 'Man', nonbinary: 'Non-binary', women: 'Women', men: 'Men', everyone: 'Everyone' };
  return '<p class="muted" style="margin:0 0 8px">' + list.length + ' of ' + data.users.length + ' members</p><div class="tablewrap"><table><thead><tr>' +
    ['Name', 'Email', 'Age', 'I am', 'Looking for', 'City', 'Country', 'Joined', 'Sign-up done', 'Photo', 'Active days (30)', 'Tasks (30)', 'Last active', 'Tasks today', 'Bumps', 'Chats', 'Status', 'Interests'].map((h, i) => '<th' + ([2, 10, 11, 13, 14, 15].includes(i) ? ' class="num"' : '') + '>' + h + '</th>').join('') +
    '</tr></thead><tbody>' + list.map((u) => '<tr>' +
      '<td>' + esc(u.name || '–') + '</td><td>' + esc(u.email) + '</td><td class="num">' + (u.age ?? '–') + '</td>' +
      '<td>' + esc(label[u.gender] || '–') + '</td><td>' + esc(label[u.lookingFor] || '–') + '</td><td>' + esc(u.city || '–') + '</td><td>' + esc(u.country || '–') + '</td>' +
      '<td>' + fmtDay(u.joined) + '</td><td>' + yes(u.finishedSignup) + '</td><td>' + yes(u.hasPhoto) + '</td>' +
      '<td class="num">' + u.activeDays30 + '</td><td class="num">' + u.tasks30 + '</td><td>' + fmtDay(u.lastActive) + '</td><td class="num">' + u.tasksToday + '</td>' +
      '<td class="num">' + u.bumps + '</td><td class="num">' + u.chats + '</td>' +
      '<td>' + esc(u.status || '') + '</td><td class="wrap">' + esc((u.interests || []).join(', ')) + '</td></tr>').join('') +
    '</tbody></table></div>';
}

function csv() {
  const cols = ['name', 'email', 'age', 'gender', 'lookingFor', 'city', 'country', 'language', 'joined', 'finishedSignup', 'hasPhoto', 'activeDays30', 'tasks30', 'lastActive', 'tasksToday', 'bumps', 'chats', 'messages', 'status', 'interests', 'here'];
  const cell = (v) => '"' + String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""') + '"';
  const text = [cols.join(',')].concat(rows().map((u) => cols.map((c) => cell(u[c])).join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = 'rareness-members-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}

function render() {
  const cities = [...new Set(data.users.map((u) => u.city).filter(Boolean))].sort();
  root.innerHTML =
    '<header><div><span class="brand">Ora</span><h1>Dashboard</h1><p class="muted" style="margin:6px 0 0">Updated ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + '</p></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" id="csv">Download CSV</button><button class="btn" id="refresh">Refresh</button></div></header>' +
    tiles(data.totals) +
    '<div class="grid two">' + chartCard('chart', 'New members', 'Last 14 days · ' + Object.values(data.signups).reduce((a, b) => a + b, 0) + ' in total', data.signups, 'New members') +
      chartCard('chartActive', 'Active members', 'did at least one task, per day', data.active, 'Active members') + '</div>' +
    whoSection() + genderSection() + useSection() + librarySection() + connectionSection() +
    '<section class="card" aria-label="Members"><h2>Members</h2><div class="filters">' +
      '<label class="sr" for="q">Search</label><input id="q" type="search" placeholder="Search name, email, city or status" value="' + esc(q) + '">' +
      '<label class="sr" for="city">City</label><select id="city"><option value="">All cities</option>' + cities.map((c) => '<option' + (c === city ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
      '<label class="sr" for="only">Sign-up</label><select id="only"><option value="">Everyone</option><option value="done"' + (only === 'done' ? ' selected' : '') + '>Finished sign-up</option><option value="not"' + (only === 'not' ? ' selected' : '') + '>Still signing up</option></select>' +
    '</div><div id="tbl">' + table() + '</div></section>';
  const refreshTable = () => { document.getElementById('tbl').innerHTML = table(); };
  document.getElementById('q').oninput = (e) => { q = e.target.value; refreshTable(); };
  document.getElementById('city').onchange = (e) => { city = e.target.value; refreshTable(); };
  document.getElementById('only').onchange = (e) => { only = e.target.value; refreshTable(); };
  document.getElementById('csv').onclick = csv;
  document.getElementById('refresh').onclick = () => { root.querySelector('header .muted').textContent = 'Refreshing…'; load(); };
  drawCharts();
}

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => data && drawCharts(), 150); });
load();
