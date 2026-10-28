// Data layer: everything the app reads and writes goes through here.
import { createClient } from '@supabase/supabase-js';

export const DIM_KEYS = ['values', 'lifestyle', 'interests', 'personality', 'goals', 'routine'];

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && anon);
export const sb = configured ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

export const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- Auth ----------
export async function session() { return check(await sb.auth.getSession()).session; }
export const onAuth = (fn) => sb.auth.onAuthStateChange((_e, s) => fn(s));
export async function sendCode(email) {
  check(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin, shouldCreateUser: true } }));
}
export async function verifyCode(email, token) { return check(await sb.auth.verifyOtp({ email, token, type: 'email' })); }
// For now: sign in with just an email address, no email sent (see api/auth/email.ts)
export async function signInWithEmail(email) {
  const res = await fetch('/api/auth/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || 'We couldn’t sign you in. Try again.');
  const { user } = check(await sb.auth.verifyOtp({ token_hash: out.token_hash, type: 'email' }));
  return { user, country: out.country };
}
export async function signOut() { await sb.auth.signOut(); }

// ---------- Server API (/api/*) ----------
export async function api(path, method = 'POST', body) {
  const s = await session();
  const res = await fetch('/api/' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(s ? { authorization: 'Bearer ' + s.access_token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || 'Something went wrong. Try again.');
  return out;
}
export const getConfig = () => fetch('/api/config').then((r) => r.json()).catch(() => ({ paywall: false }));

// ---------- Profile ----------
// Your profile is two rows: what others may see (profiles) and what only you may see (profile_private)
const PRIVATE = ['birthdate'];
export async function myProfile(uid) {
  const [pub, priv] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).single().then(check),
    sb.from('profile_private').select('birthdate,paid_at').eq('id', uid).maybeSingle().then(check),
  ]);
  return { ...pub, ...(priv || { paid_at: null }) };
}
export async function saveProfile(uid, patch) {
  const pub = {}, priv = {};
  for (const [k, v] of Object.entries(patch)) (PRIVATE.includes(k) ? priv : pub)[k] = v;
  if (Object.keys(priv).length) check(await sb.from('profile_private').upsert({ id: uid, ...priv }));
  if (Object.keys(pub).length) check(await sb.from('profiles').update(pub).eq('id', uid));
  return myProfile(uid);
}
export const photoUrl = (path) => (path ? sb.storage.from('photos').getPublicUrl(path).data.publicUrl : null);
export async function uploadPhoto(uid, blob) {
  const path = `${uid}/bubble-${Date.now()}.jpg`;
  check(await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
  return path;
}
export async function removePhoto(path) { if (path) await sb.storage.from('photos').remove([path]); }

// ---------- Answers ----------
export async function myAnswers(uid, days = 90) {
  const since = dayKey(new Date(Date.now() - days * 86400000));
  return check(await sb.from('answers').select('day,kind,dim,prompt,data,created_at').eq('user_id', uid).gte('day', since).order('day', { ascending: false }));
}
export async function saveAnswer(uid, a) {
  return check(await sb.from('answers').upsert({ user_id: uid, ...a }, { onConflict: 'user_id,day,kind,dim' }).select().single());
}
export async function signupAnswers(uid, rows) {
  const day = dayKey();
  const payload = rows.map((r) => ({ user_id: uid, day, kind: 'signup', dim: r.dim, prompt: r.prompt, data: r.data }));
  check(await sb.from('answers').upsert(payload, { onConflict: 'user_id,day,kind,dim' }));
}

// ---------- Practices (the Meditation library) ----------
export async function myPractices(uid, days = 400) {
  const since = dayKey(new Date(Date.now() - days * 86400000));
  return check(await sb.from('practices').select('id,exercise,level,minutes,day,created_at').eq('user_id', uid).gte('day', since).order('created_at', { ascending: false }));
}
export async function savePractice(uid, p) {
  return check(await sb.from('practices').insert({ user_id: uid, day: dayKey(), ...p }).select('id,exercise,level,minutes,day,created_at').single());
}
export async function practiceAnswer(id, answer) { check(await sb.from('practices').update({ answer }).eq('id', id)); }
// What someone practises most (only for you, or someone you share a chat with)
export async function practiceSummary(id) { return check(await sb.rpc('practice_summary', { target: id })) || []; }
// The Ora guide: today's suggestion and the guide chat
export const guideSuggest = () => api('guide', 'POST', { mode: 'suggest', day: dayKey() });
export const guideChat = (messages) => api('guide', 'POST', { mode: 'chat', messages });

// ---------- Cloud, bumps, safety ----------
// What a member wrote about themselves, for their profile page (members can read finished profiles)
export async function profileDetails(id) {
  return check(await sb.from('profiles').select('bio,job,city,interests,status').eq('id', id).maybeSingle());
}
export async function cloud() { return check(await sb.rpc('cloud')) || []; }
export async function bump(id) { return check(await sb.rpc('bump', { target: id })); }
export async function block(uid, id) { check(await sb.from('blocks').insert({ blocker_id: uid, blocked_id: id })); }
export async function report(uid, id, reason) { check(await sb.from('reports').insert({ reporter_id: uid, reported_id: id, reason })); }

// ---------- Chats ----------
export async function chats(uid) {
  const list = check(await sb.from('chats').select('id,user_a,user_b,created_at,last_message_at').order('last_message_at', { ascending: false }));
  if (!list.length) return [];
  const others = list.map((c) => (c.user_a === uid ? c.user_b : c.user_a));
  const [people, reads, matches] = await Promise.all([
    sb.from('profiles').select('id,name,photo_path,status').in('id', others).then(check),
    sb.from('chat_reads').select('chat_id,read_at').eq('user_id', uid).then(check),
    sb.from('matches').select('other_id,score,dims,reason').eq('user_id', uid).in('other_id', others).then(check),
  ]);
  const lasts = await Promise.all(list.map((c) => sb.from('messages').select('sender_id,body,created_at').eq('chat_id', c.id).order('created_at', { ascending: false }).limit(1).then(check)));
  return list.map((c, i) => {
    const other = others[i];
    const read = reads.find((r) => r.chat_id === c.id);
    const last = lasts[i][0];
    return {
      id: c.id, other: people.find((p) => p.id === other) || { id: other, name: 'Someone' },
      match: matches.find((m) => m.other_id === other) || null,
      last, unread: Boolean(last && last.sender_id && last.sender_id !== uid && (!read || read.read_at < last.created_at)),
      at: c.last_message_at,
    };
  });
}
export async function messages(chatId) {
  return check(await sb.from('messages').select('id,sender_id,body,created_at').eq('chat_id', chatId).order('created_at').limit(500));
}
export async function send(uid, chatId, body) { return check(await sb.from('messages').insert({ chat_id: chatId, sender_id: uid, body }).select().single()); }
// When the other person last read this chat (for "Read" under your messages)
export async function theirRead(chatId, otherId) {
  const row = check(await sb.from('chat_reads').select('read_at').eq('chat_id', chatId).eq('user_id', otherId).maybeSingle());
  return row?.read_at || null;
}
export async function gifs(q) { return (await api('gifs?q=' + encodeURIComponent(q || ''), 'GET')).gifs; }
export async function markRead(uid, chatId) { await sb.from('chat_reads').upsert({ chat_id: chatId, user_id: uid, read_at: new Date().toISOString() }); }
export function onMessages(fn) {
  const ch = sb.channel('messages-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => fn(p.new))
    .subscribe();
  return () => sb.removeChannel(ch);
}
