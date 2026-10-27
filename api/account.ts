// DELETE /api/account: erase the caller's account, photos and data (rows cascade from auth.users).
import { db, handle, json, requireUser } from "./_lib/server.js";

export const DELETE = handle(async (request) => {
  const user = await requireUser(request);
  const { data: files } = await db().storage.from("photos").list(user.id, { limit: 100 });
  if (files?.length) await db().storage.from("photos").remove(files.map((f) => `${user.id}/${f.name}`));
  const { error } = await db().auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
});
