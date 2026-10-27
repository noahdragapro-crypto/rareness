// Daily job (see vercel.json): recompute stale auras and pair matches for everyone.
import { env, handle, HttpError, json } from "../_lib/server.js";
import { refreshAll } from "../_lib/matching.js";

export const maxDuration = 300;

export const GET = handle(async (request) => {
  if (request.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) throw new HttpError(401, "Not allowed");
  return json(await refreshAll(Date.now() + 270_000));
});
