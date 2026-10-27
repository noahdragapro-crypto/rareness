// POST /api/match: refresh the caller's aura and their matches with everyone else.
// Called after sign-up and when the caller finishes the day's exercises.
import { handle, json, requireUser } from "./_lib/server.js";
import { refreshFor } from "./_lib/matching.js";

export const maxDuration = 300;

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const result = await refreshFor(user.id, Date.now() + 270_000);
  return json(result);
});
