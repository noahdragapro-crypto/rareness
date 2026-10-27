// GET /api/admin: numbers and the member list for the dashboard (/admin).
// Only for the emails listed in ADMIN_EMAILS (comma-separated).
import { db, handle, HttpError, json, requireUser } from "./_lib/server.js";

const day = (d: Date) => d.toISOString().slice(0, 10);

export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) throw new HttpError(403, "No admins set yet. Add ADMIN_EMAILS in Vercel with your email, then redeploy.");
  if (!admins.includes((user.email || "").toLowerCase())) throw new HttpError(403, "This page is only for the Rareness team.");

  const { data: auth, error: e0 } = await db().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (e0) throw e0;
  const [profiles, priv, answers, chats, messages, bumps] = await Promise.all([
    db().from("profiles").select("id,name,gender,show_me,city,country,status,photo_path,interests,onboarded,aura_summary,created_at"),
    db().from("profile_private").select("id,birthdate,paid_at"),
    db().from("answers").select("user_id,day,kind").gte("day", day(new Date(Date.now() - 30 * 86400000))),
    db().from("chats").select("id", { count: "exact", head: true }),
    db().from("messages").select("id", { count: "exact", head: true }),
    db().from("bumps").select("from_id", { count: "exact", head: true }),
  ]);
  for (const r of [profiles, priv, answers, chats, messages, bumps]) if (r.error) throw r.error;

  const today = day(new Date());
  const byUser = new Map<string, { days: Set<string>; last: string; today: Set<string> }>();
  for (const a of answers.data ?? []) {
    if (a.kind === "signup") continue;
    const u = byUser.get(a.user_id) ?? { days: new Set(), last: "", today: new Set() };
    u.days.add(a.day);
    if (a.day > u.last) u.last = a.day;
    if (a.day === today) u.today.add(a.kind);
    byUser.set(a.user_id, u);
  }
  const age = (b: string | null) => (b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null);
  const users = (auth.users ?? []).map((u) => {
    const p = (profiles.data ?? []).find((x) => x.id === u.id);
    const v = (priv.data ?? []).find((x) => x.id === u.id);
    const act = byUser.get(u.id);
    return {
      id: u.id, email: u.email, joined: u.created_at, lastSignIn: u.last_sign_in_at,
      name: p?.name || "", age: age(v?.birthdate ?? null), gender: p?.gender || "", lookingFor: p?.show_me || "",
      city: p?.city || "", country: p?.country || "", status: p?.status || "", hasPhoto: Boolean(p?.photo_path),
      interests: p?.interests ?? [], finishedSignup: Boolean(p?.onboarded), paid: Boolean(v?.paid_at),
      aura: p?.aura_summary || "", activeDays30: act?.days.size ?? 0, lastActive: act?.last || null, tasksToday: act?.today.size ?? 0,
    };
  }).sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));

  const signups: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) signups[day(new Date(Date.now() - i * 86400000))] = 0;
  for (const u of users) { const d = (u.joined || "").slice(0, 10); if (d in signups) signups[d]++; }

  return json({
    totals: {
      members: users.length,
      finishedSignup: users.filter((u) => u.finishedSignup).length,
      paid: users.filter((u) => u.paid).length,
      activeToday: users.filter((u) => u.tasksToday > 0).length,
      allThreeToday: users.filter((u) => u.tasksToday >= 3).length,
      chats: chats.count ?? 0, messages: messages.count ?? 0, bumps: bumps.count ?? 0,
    },
    signups,
    users,
  });
});
