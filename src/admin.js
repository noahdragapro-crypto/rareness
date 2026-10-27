// Dashboard for the Rareness team: member numbers, sign-ups per day and the member list.
// Uses the same sign-in as the app; the server only answers for emails in ADMIN_EMAILS.
import * as API from './api.js';

const root = document.getElementById('root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = (d) => (d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '–');
const yes = (v) => (v ? '<span class="yes">Yes</span>' : '<span class="no">No</span>');
let data = null, q = '', city = '', only = '';

function message(html) { root.innerHTML = '<div class="msg"><span class="brand">Rareness</span>' + html + '</div>'; }

async function load() {
  if (!API.configured) return message('<p>This copy isn’t connected to its database.</p>');
  const s = await API.session().catch(() => null);
  if (!s) return message('<h2>Log in first</h2><p class="muted">Open the app, log in with your email, then come back to this page.</p><a href="/">Open Rareness</a>');
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
    tile(t.allThreeToday, 'All three today', 'Cloud unlocked') +
    tile(t.bumps, 'Bumps') + tile(t.chats, 'Chats', 'mutual bumps') + tile(t.messages, 'Messages') +
    '</section>';
}

// New members per day, last 14 days: one series, so no legend; hover shows the exact count.
// Drawn at the card's real width so text never stretches.
function chartCard(signups) {
  const days = Object.keys(signups), total = days.reduce((a, d) => a + signups[d], 0);
  return '<section class="card" aria-label="New members"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><h2>New members</h2><span class="muted">Last 14 days · ' + total + ' in total</span></div>' +
    '<div class="chart" id="chart"></div>' +
    '<table class="sr"><caption>New members per day</caption><tr><th>Day</th><th>New members</th></tr>' + days.map((d) => '<tr><td>' + d + '</td><td>' + signups[d] + '</td></tr>').join('') + '</table></section>';
}
function drawChart(signups) {
  const box = document.getElementById('chart'); if (!box) return;
  const days = Object.keys(signups), vals = days.map((d) => signups[d]), max = Math.max(1, ...vals);
  const W = box.clientWidth, H = 150, gap = W < 500 ? 4 : 8, bw = (W - gap * (days.length - 1)) / days.length;
  const every = W < 500 ? 3 : 2, top = (v) => H - (v ? Math.max(4, v / max * H) : 0);
  const bars = days.map((d, i) => {
    const y = top(vals[i]), h = H - y, x = i * (bw + gap), r = Math.min(4, h / 2, bw / 2);
    const path = h ? 'M' + x + ',' + H + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + H + 'Z' : '';
    const label = (days.length - 1 - i) % every === 0 ? '<text class="axis" x="' + (x + bw / 2) + '" y="' + (H + 16) + '" text-anchor="middle">' + esc(fmtDay(d)) + '</text>' : '';
    return '<g data-i="' + i + '"><rect class="hit" x="' + (x - gap / 2) + '" y="0" width="' + (bw + gap) + '" height="' + (H + 20) + '"></rect>' + (path ? '<path class="bar" d="' + path + '"></path>' : '') + label + '</g>';
  }).join('');
  box.innerHTML = '<svg width="' + W + '" height="' + (H + 24) + '" role="img" aria-label="New members per day for the last 14 days"><line class="base" x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '"></line>' + bars + '</svg><div class="tip" id="tip"></div>';
  const tip = document.getElementById('tip');
  box.querySelectorAll('g[data-i]').forEach((g) => {
    g.onmouseenter = () => {
      const i = +g.dataset.i, n = vals[i];
      tip.textContent = fmtDay(days[i]) + ': ' + n + ' new member' + (n === 1 ? '' : 's');
      tip.style.left = Math.min(W - 70, Math.max(70, i * (bw + gap) + bw / 2)) + 'px'; tip.style.top = (top(n) - 4) + 'px'; tip.style.opacity = 1;
    };
    g.onmouseleave = () => { tip.style.opacity = 0; };
  });
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
    ['Name', 'Email', 'Age', 'I am', 'Looking for', 'City', 'Joined', 'Sign-up done', 'Photo', 'Active days (30)', 'Last active', 'Tasks today', 'Status', 'Interests'].map((h, i) => '<th' + ([2, 9, 11].includes(i) ? ' class="num"' : '') + '>' + h + '</th>').join('') +
    '</tr></thead><tbody>' + list.map((u) => '<tr>' +
      '<td>' + esc(u.name || '–') + '</td><td>' + esc(u.email) + '</td><td class="num">' + (u.age ?? '–') + '</td>' +
      '<td>' + esc(label[u.gender] || '–') + '</td><td>' + esc(label[u.lookingFor] || '–') + '</td><td>' + esc(u.city || '–') + '</td>' +
      '<td>' + fmtDay(u.joined) + '</td><td>' + yes(u.finishedSignup) + '</td><td>' + yes(u.hasPhoto) + '</td>' +
      '<td class="num">' + u.activeDays30 + '</td><td>' + fmtDay(u.lastActive) + '</td><td class="num">' + u.tasksToday + ' of 3</td>' +
      '<td>' + esc(u.status || '') + '</td><td class="wrap">' + esc((u.interests || []).join(', ')) + '</td></tr>').join('') +
    '</tbody></table></div>';
}

function csv() {
  const cols = ['name', 'email', 'age', 'gender', 'lookingFor', 'city', 'joined', 'finishedSignup', 'hasPhoto', 'activeDays30', 'lastActive', 'tasksToday', 'status', 'interests'];
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
    '<header><div><span class="brand">Rareness</span><h1>Dashboard</h1><p class="muted" style="margin:6px 0 0">Updated ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + '</p></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" id="csv">Download CSV</button><button class="btn" id="refresh">Refresh</button></div></header>' +
    tiles(data.totals) + chartCard(data.signups) +
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
  drawChart(data.signups);
}

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => data && drawChart(data.signups), 150); });
load();
