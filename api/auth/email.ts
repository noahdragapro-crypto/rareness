// POST /api/auth/email { email }: sign in with just an email address, no verification email.
// Creates the account if it's new, then hands back a one-time sign-in token for the browser.
// Fast for a friends-only test, but anyone who knows an address can sign in as that person:
// set TESTER_EMAILS to limit who can get in, and bring back email verification before a public launch.
import { db, handle, HttpError, json } from "../_lib/server.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const POST = handle(async (request) => {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) throw new HttpError(400, "Enter a valid email address.");

  const allowed = (process.env.TESTER_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(email)) throw new HttpError(403, "Rareness is invite-only for now. Ask for an invite.");

  // New address -> new account (already confirmed, so no email is sent). Existing address -> keep going.
  const created = await db().auth.admin.createUser({ email, email_confirm: true });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) throw created.error;

  const { data, error } = await db().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  // Vercel adds the visitor's country, which places them in the right Cloud without asking
  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  return json({ token_hash: data.properties.hashed_token, created: !created.error, country: /^[A-Z]{2}$/.test(country) ? country : null });
});
