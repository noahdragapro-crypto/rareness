// Keeps auras and pair matches up to date. A pair is rescored only when either person has
// answered something since it was last scored, so the daily cron and on-demand refreshes stay cheap.
import { db, paywallOn } from "./server.js";
import { aiEnabled, basicPair, computeAura, loadPeople, personCard, scorePair } from "./ai.js";

type Person = Awaited<ReturnType<typeof loadPeople>>[number];

const eligible = (p: Person) => !paywallOn() || ["active", "trialing"].includes(p.profile.subscription_status);
const lastActivity = (p: Person) => p.answers.reduce((m, a) => (a.created_at > m ? a.created_at : m), "");

async function pool<T>(items: T[], limit: number, deadline: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length && Date.now() < deadline) {
      const item = items[i++];
      try { await fn(item); } catch (e) { console.error(e); }
    }
  });
  await Promise.all(workers);
}

export async function refreshAura(person: Person) {
  let aura, summary;
  if (aiEnabled()) {
    try { ({ aura, summary } = await computeAura(personCard(person.profile, person.answers))); } catch (e) { console.error("aura", e); }
  }
  if (!aura) return; // keep the previous aura; the basic fallback has no portrait to offer
  const { error } = await db().from("profiles").update({ aura, aura_summary: summary, aura_updated_at: new Date().toISOString() }).eq("id", person.profile.id);
  if (error) throw error;
}

async function scoreAndSave(a: Person, b: Person) {
  let result: { score: number; dims: Record<string, number>; reason: string } | null = null;
  let method: "ai" | "basic" = "basic";
  if (aiEnabled()) {
    try {
      const [ab, ba] = await Promise.all([
        scorePair(personCard(a.profile, a.answers), personCard(b.profile, b.answers)),
        scorePair(personCard(b.profile, b.answers), personCard(a.profile, a.answers)),
      ]);
      // One shared score per pair; each side keeps its own reason
      const score = Math.round((ab.score + ba.score) / 2);
      const dims = Object.fromEntries(Object.keys(ab.dims).map((k) => [k, Math.round(((ab.dims as Record<string, number>)[k] + (ba.dims as Record<string, number>)[k]) / 2)]));
      const now = new Date().toISOString();
      const { error } = await db().from("matches").upsert([
        { user_id: a.profile.id, other_id: b.profile.id, score, dims, reason: ab.reason, method: "ai", updated_at: now },
        { user_id: b.profile.id, other_id: a.profile.id, score, dims, reason: ba.reason, method: "ai", updated_at: now },
      ]);
      if (error) throw error;
      return;
    } catch (e) { console.error("pair", e); }
  }
  result = basicPair(a, b);
  const now = new Date().toISOString();
  const { error } = await db().from("matches").upsert([
    { user_id: a.profile.id, other_id: b.profile.id, ...result, method, updated_at: now },
    { user_id: b.profile.id, other_id: a.profile.id, ...result, method, updated_at: now },
  ]);
  if (error) throw error;
}

async function scoredAt(): Promise<Map<string, { at: string; method: string }>> {
  const { data, error } = await db().from("matches").select("user_id,other_id,updated_at,method");
  if (error) throw error;
  return new Map((data ?? []).map((m) => [`${m.user_id}|${m.other_id}`, { at: m.updated_at, method: m.method }]));
}

const stale = (a: Person, b: Person, seen: Map<string, { at: string; method: string }>) => {
  const s = seen.get(`${a.profile.id}|${b.profile.id}`);
  if (!s) return true;
  if (s.method === "basic" && aiEnabled()) return true;
  return lastActivity(a) > s.at || lastActivity(b) > s.at;
};

/** Rescore one person against everyone else (after sign-up or finishing the day's exercises). */
export async function refreshFor(userId: string, deadline: number) {
  const people = await loadPeople();
  const me = people.find((p) => p.profile.id === userId);
  if (!me) return { scored: 0 };
  if (!me.profile.aura_updated_at || lastActivity(me) > me.profile.aura_updated_at) await refreshAura(me);
  if (!eligible(me)) return { scored: 0 };
  const seen = await scoredAt();
  const todo = people.filter((p) => p.profile.id !== userId && eligible(p) && stale(me, p, seen));
  let scored = 0;
  await pool(todo, 4, deadline, async (p) => { await scoreAndSave(me, p); scored++; });
  return { scored, remaining: todo.length - scored };
}

/** Everyone: stale auras first, then stale pairs, until the deadline. */
export async function refreshAll(deadline: number) {
  const people = await loadPeople();
  const auras = people.filter((p) => !p.profile.aura_updated_at || lastActivity(p) > p.profile.aura_updated_at);
  await pool(auras, 4, deadline, refreshAura);
  const seen = await scoredAt();
  const pairs: [Person, Person][] = [];
  const pool2 = people.filter(eligible);
  for (let i = 0; i < pool2.length; i++) for (let j = i + 1; j < pool2.length; j++) if (stale(pool2[i], pool2[j], seen)) pairs.push([pool2[i], pool2[j]]);
  let scored = 0;
  await pool(pairs, 4, deadline, async ([a, b]) => { await scoreAndSave(a, b); scored++; });
  return { auras: auras.length, scored, remaining: pairs.length - scored };
}
