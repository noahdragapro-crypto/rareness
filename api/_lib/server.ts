// Shared server helpers: environment, the service-role Supabase client, auth and JSON responses.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

/** The one-time access fee is required unless PAYWALL=off (useful while testing). */
export const paywallOn = () => process.env.PAYWALL !== "off";

let admin: SupabaseClient | null = null;
/** Service-role client: bypasses row-level security. Server only, never sent to the browser. */
export function db(): SupabaseClient {
  if (!admin) {
    admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** The signed-in user behind a request, from its `Authorization: Bearer <access token>` header. */
export async function requireUser(request: Request): Promise<User> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in first.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session has expired. Sign in again.");
  return data.user;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Wrap a handler so thrown HttpErrors become JSON responses and anything else a logged 500. */
export function handle(fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(request);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong on our side. Try again in a moment." }, 500);
    }
  };
}

export function appUrl(request: Request): string {
  return process.env.APP_URL || new URL(request.url).origin;
}
