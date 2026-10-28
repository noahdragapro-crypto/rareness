// GET /api/admin: numbers, segments, feature use and the member list for the dashboard (/admin).
// Only for the emails listed in ADMIN_EMAILS (comma-separated).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { catalog } from "./_lib/ai.js";
import { db, handle, HttpError, json, requireUser } from "./_lib/server.js";

const day = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 86400000;

// Supabase returns at most 1000 rows per request: read every page
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}
// Counts per label, biggest first, as [label, count] pairs
const tally = (values: string[]) => {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
};
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

const GENDER: Record<string, string> = { woman: "Women", man: "Men", nonbinary: "Non-binary" };
const MEET: Record<string, string> = { women: "Women", men: "Men", everyone: "Everyone" };
const LANG: Record<string, string> = { en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese", nl: "Dutch", ar: "Arabic",
  he: "Hebrew", ru: "Russian", tr: "Turkish", zh: "Chinese", ja: "Japanese", ko: "Korean", hi: "Hindi", sv: "Swedish", pl: "Polish", el: "Greek" };
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => { try { return REGION.of(code) || code; } catch { return code; } };
// Each city on the app's list knows its country (shared/cities.json); it beats the sign-up guess from the connection
let cityCache: Record<string, string> | null = null;
const cityCountry = (): Record<string, string> => {
  if (cityCache) return cityCache;
  let raw: string;
  try { raw = readFileSync(join(process.cwd(), "shared/cities.json"), "utf8"); }
  catch { raw = readFileSync(new URL("../shared/cities.json", import.meta.url), "utf8"); }
  const list = JSON.parse(raw) as Record<string, string[]>;
  return (cityCache = Object.fromEntries(Object.entries(list).flatMap(([cc, cities]) => cities.map((c) => [c, cc]))));
};
const ageBand = (a: number | null) => (a == null ? "Not given" : a < 25 ? "18–24" : a < 35 ? "25–34" : a < 45 ? "35–44" : a < 55 ? "45–54" : "55+");

type Profile = { id: string; name: string; gender: string | null; show_me: string; city: string; country: string | null; status: string; photo_path: string | null;
  interests: string[] | null; onboarded: boolean; aura_summary: string; bio: string | null; languages: string | null; created_at: string };

export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) throw new HttpError(403, "No admins set yet. Add ADMIN_EMAILS in Vercel with your email, then redeploy.");
  if (!admins.includes((user.email || "").toLowerCase())) throw new HttpError(403, "This page is only for the Ora team.");

  const since30 = day(new Date(Date.now() - 30 * DAY)), since30ts = new Date(Date.now() - 30 * DAY).toISOString();
  const { data: auth, error: e0 } = await db().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (e0) throw e0;
  const [profiles, priv, answers, practices, bumps, chats, messages, reports, blocks] = await Promise.all([
    all<Profile>((a, b) => db().from("profiles").select("id,name,gender,show_me,city,country,status,photo_path,interests,onboarded,aura_summary,bio,languages,created_at").range(a, b)),
    all<{ id: string; birthdate: string | null; paid_at: string | null }>((a, b) => db().from("profile_private").select("id,birthdate,paid_at").range(a, b)),
    all<{ user_id: string; day: string; kind: string }>((a, b) => db().from("answers").select("user_id,day,kind").gte("day", since30).range(a, b)),
    all<{ user_id: string; exercise: string; day: string; minutes: number | null; answer: Record<string, unknown> }>((a, b) => db().from("practices").select("user_id,exercise,day,minutes,answer").range(a, b)),
    all<{ from_id: string; to_id: string; created_at: string }>((a, b) => db().from("bumps").select("from_id,to_id,created_at").range(a, b)),
    all<{ id: string; user_a: string; user_b: string; created_at: string }>((a, b) => db().from("chats").select("id,user_a,user_b,created_at").range(a, b)),
    all<{ chat_id: string; sender_id: string | null; body: string; created_at: string }>((a, b) => db().from("messages").select("chat_id,sender_id,body,created_at").range(a, b)),
    db().from("reports").select("id", { count: "exact", head: true }),
    db().from("blocks").select("blocker_id", { count: "exact", head: true }),
  ]);
  for (const r of [reports, blocks]) if (r.error) throw r.error;
  // Profile options from Edit profile (migration 0008); empty if that update hasn't been run
  const details = await db().from("profiles").select("id,details");
  // Journal entries (migration 0009): only how many, never what they say
  const journal = await db().from("journal").select("id", { count: "exact", head: true }).gte("created_at", since30ts);
  const detailsOf = new Map<string, Record<string, unknown>>((details.error ? [] : details.data ?? []).map((d) => [d.id, (d.details ?? {}) as Record<string, unknown>]));

  const cat = catalog(), defs = new Map(cat.practices.map((x) => [x.id, x]));
  const profileOf = new Map(profiles.map((p) => [p.id, p])), privOf = new Map(priv.map((v) => [v.id, v]));
  const today = day(new Date());

  // Tasks per person per day, the way the app counts them: the three daily tasks
  // plus each different library practice (the temple counts as the meditation task)
  const tasks = new Map<string, Map<string, Set<string>>>();
  const addTask = (uid: string, d: string, what: string) => {
    if (d < since30) return;
    const u = tasks.get(uid) ?? new Map<string, Set<string>>();
    const s = u.get(d) ?? new Set<string>();
    s.add(what); u.set(d, s); tasks.set(uid, u);
  };
  for (const a of answers) if (a.kind !== "signup") addTask(a.user_id, a.day, a.kind);
  for (const p of practices) addTask(p.user_id, p.day, p.exercise === "temple" ? "m" : "p:" + p.exercise);
  const taskTotal = (uid: string) => [...(tasks.get(uid)?.values() ?? [])].reduce((n, s) => n + s.size, 0);
  const activeDays = (uid: string) => tasks.get(uid)?.size ?? 0;
  const lastActive = (uid: string) => [...(tasks.get(uid)?.keys() ?? [])].sort().pop() ?? null;
  const todayCount = (uid: string) => tasks.get(uid)?.get(today)?.size ?? 0;

  const bumpsSent = tally(bumps.map((b) => b.from_id)), bumpsOf = new Map(bumpsSent);
  const chatsOf = new Map<string, number>();
  for (const c of chats) for (const u of [c.user_a, c.user_b]) chatsOf.set(u, (chatsOf.get(u) ?? 0) + 1);
  const sentOf = new Map(tally(messages.filter((m) => m.sender_id).map((m) => m.sender_id as string)));

  const age = (b: string | null | undefined) => (b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null);
  const users = (auth.users ?? []).map((u) => {
    const p = profileOf.get(u.id), v = privOf.get(u.id), det = detailsOf.get(u.id) ?? {};
    return {
      id: u.id, email: u.email, joined: u.created_at, lastSignIn: u.last_sign_in_at,
      name: p?.name || "", age: age(v?.birthdate), gender: p?.gender || "", lookingFor: p?.show_me || "",
      city: p?.city || "", country: cityCountry()[p?.city || ""] || p?.country || "", status: p?.status || "", hasPhoto: Boolean(p?.photo_path), hasBio: Boolean(p?.bio),
      language: LANG[(p?.languages || "").split(",")[0]?.trim()] || "", here: Array.isArray(det.here) ? (det.here as string[]) : [],
      experience: typeof det.experience === "string" ? det.experience : "",
      interests: p?.interests ?? [], finishedSignup: Boolean(p?.onboarded), paid: Boolean(v?.paid_at),
      aura: p?.aura_summary || "", activeDays30: activeDays(u.id), lastActive: lastActive(u.id), tasksToday: todayCount(u.id),
      tasks30: taskTotal(u.id), bumps: bumpsOf.get(u.id) ?? 0, chats: chatsOf.get(u.id) ?? 0, messages: sentOf.get(u.id) ?? 0,
    };
  }).sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));

  // New members and daily active members, last 14 days
  const signups: Record<string, number> = {}, active: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) { const d = day(new Date(Date.now() - i * DAY)); signups[d] = 0; active[d] = 0; }
  for (const u of users) { const d = (u.joined || "").slice(0, 10); if (d in signups) signups[d]++; }
  for (const u of tasks.values()) for (const d of u.keys()) if (d in active) active[d]++;

  // Who's here
  const segments = {
    gender: tally(users.map((u) => GENDER[u.gender] || "Not given")),
    age: tally(users.map((u) => ageBand(u.age))),
    country: tally(users.map((u) => (u.country ? countryName(u.country) : "Not given"))),
    countryCodes: tally(users.map((u) => u.country).filter(Boolean)),
    city: tally(users.map((u) => u.city || "Not given")),
    lookingFor: tally(users.map((u) => MEET[u.lookingFor] || "Everyone")),
    language: tally(users.map((u) => u.language || "Not given")),
    here: tally(users.flatMap((u) => u.here)),
    experience: tally(users.map((u) => u.experience || "Not given")),
    interests: tally(users.flatMap((u) => u.interests)).slice(0, 15),
  };

  // The same measures for each gender
  const byGender = Object.entries({ ...GENDER, "": "Not given" }).map(([k, label]) => {
    const g = users.filter((u) => (u.gender || "") === k);
    return {
      label, members: g.length,
      finishedSignup: g.filter((u) => u.finishedSignup).length,
      active7: g.filter((u) => u.lastActive && u.lastActive >= day(new Date(Date.now() - 7 * DAY))).length,
      tasks30: avg(g.map((u) => u.tasks30)), activeDays30: avg(g.map((u) => u.activeDays30)),
      bumps: avg(g.map((u) => u.bumps)), chats: avg(g.map((u) => u.chats)), messages: avg(g.map((u) => u.messages)),
    };
  }).filter((r) => r.members);

  // What people use, last 30 days
  const recentPr = practices.filter((p) => p.day >= since30 && defs.has(p.exercise)), recentMsg = messages.filter((m) => m.sender_id && m.created_at >= since30ts);
  const kind = (k: string) => answers.filter((a) => a.kind === k).length;
  const features = [
    ["Library practices", recentPr.filter((p) => p.exercise !== "temple").length],
    ["Temple sessions", recentPr.filter((p) => p.exercise === "temple").length],
    ["Reflections written", kind("q")],
    ["Actions done", kind("t")],
    ["Check-ins answered", recentPr.filter((p) => p.answer && "q" in p.answer).length],
    ["Bumps", bumps.filter((b) => b.created_at >= since30ts).length],
    ["Text messages", recentMsg.filter((m) => !m.body.startsWith("[[")).length],
    ["Stickers", recentMsg.filter((m) => m.body.startsWith("[[sticker:")).length],
    ["GIFs", recentMsg.filter((m) => m.body.startsWith("[[gif:")).length],
    ["Shared practices", recentMsg.filter((m) => m.body.startsWith("[[practice:")).length],
    ["Journal entries", journal.error ? 0 : journal.count ?? 0],
  ].sort((a, b) => (b[1] as number) - (a[1] as number));
  const profileUse = [
    ["Photo", users.filter((u) => u.hasPhoto).length], ["Status", users.filter((u) => u.status).length],
    ["About", users.filter((u) => u.hasBio).length], ["Main language", users.filter((u) => u.language).length],
    ["Edit profile options", users.filter((u) => Object.keys(detailsOf.get(u.id) ?? {}).some((k) => { const v = (detailsOf.get(u.id) ?? {})[k]; return Array.isArray(v) ? v.length : Boolean(v); })).length],
  ].sort((a, b) => (b[1] as number) - (a[1] as number));

  // The Meditation library
  const lib = practices.filter((p) => defs.has(p.exercise));
  const perPractice = new Map<string, { sessions: number; people: Set<string>; recent: number; minutes: number }>();
  for (const p of lib) {
    const s = perPractice.get(p.exercise) ?? { sessions: 0, people: new Set(), recent: 0, minutes: 0 };
    s.sessions++; s.people.add(p.user_id); if (p.day >= since30) s.recent++; s.minutes += p.minutes ?? 0;
    perPractice.set(p.exercise, s);
  }
  const levelName = (n: number) => [...cat.levels].reverse().find((l) => n >= l.from)?.name ?? cat.levels[0].name;
  const pairCounts = tally(lib.map((p) => p.user_id + "|" + p.exercise));
  const library = {
    sessions: lib.length, sessions30: lib.filter((p) => p.day >= since30).length,
    people: new Set(lib.map((p) => p.user_id)).size,
    minutes: lib.reduce((n, p) => n + (p.minutes ?? 0), 0),
    checkInRate: lib.length ? Math.round(lib.filter((p) => p.answer && "q" in p.answer).length / lib.length * 100) : 0,
    top: [...perPractice].map(([id, s]) => ({ id, name: defs.get(id)!.name, cat: defs.get(id)!.cat, sessions: s.sessions, people: s.people.size, recent: s.recent }))
      .sort((a, b) => b.sessions - a.sessions),
    byCategory: tally(lib.map((p) => defs.get(p.exercise)!.cat)),
    levels: cat.levels.map((l) => [l.name, pairCounts.filter(([, n]) => levelName(n) === l.name).length]),
    neverTried: cat.practices.filter((x) => !perPractice.has(x.id)).map((x) => x.name),
  };

  // Connections
  const chatIds = new Set(chats.map((c) => c.id)), talking = new Set(messages.filter((m) => m.sender_id).map((m) => m.chat_id));
  const connections = {
    bumps: bumps.length, chats: chats.length,
    mutualRate: bumps.length ? Math.round(chats.length * 2 / bumps.length * 100) : 0,
    membersBumping: bumpsSent.length, membersWithChat: chatsOf.size,
    chatsWithMessages: [...chatIds].filter((id) => talking.has(id)).length,
    messagesPerChat: chats.length ? Math.round(messages.filter((m) => m.sender_id).length / chats.length * 10) / 10 : 0,
    reports: reports.count ?? 0, blocks: blocks.count ?? 0,
  };

  return json({
    totals: {
      members: users.length,
      finishedSignup: users.filter((u) => u.finishedSignup).length,
      paid: users.filter((u) => u.paid).length,
      activeToday: users.filter((u) => u.tasksToday > 0).length,
      allThreeToday: users.filter((u) => u.tasksToday >= 3).length,
      active7: users.filter((u) => u.lastActive && u.lastActive >= day(new Date(Date.now() - 7 * DAY))).length,
      chats: chats.length, messages: messages.filter((m) => m.sender_id).length, bumps: bumps.length,
    },
    signups, active, segments, byGender, features, profileUse, library, connections, users,
  });
});
