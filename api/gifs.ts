// GET /api/gifs?q=...: GIF search for chats, through GIPHY so the key stays on the server.
// Empty q returns what's trending. Needs GIPHY_API_KEY (free at developers.giphy.com).
import { handle, HttpError, json, requireUser } from "./_lib/server.js";

type Gif = { id: string; images: Record<string, { url: string; width: string; height: string }> };

export const GET = handle(async (request) => {
  await requireUser(request);
  const key = process.env.GIPHY_API_KEY;
  if (!key) throw new HttpError(501, "GIFs aren’t set up yet.");
  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 60);
  const params = new URLSearchParams({ api_key: key, limit: "24", rating: "pg-13", ...(q ? { q } : {}) });
  const res = await fetch(`https://api.giphy.com/v1/gifs/${q ? "search" : "trending"}?${params}`);
  if (!res.ok) {
    console.error("GIPHY", res.status, (await res.text()).slice(0, 200));
    throw new HttpError(502, res.status === 401 || res.status === 403 ? "GIPHY didn’t accept the key. Check GIPHY_API_KEY in Vercel."
      : res.status === 429 ? "Too many GIF searches this hour. Try again a bit later." : "Couldn’t load GIFs right now.");
  }
  const body = (await res.json()) as { data: Gif[] };
  return json({
    gifs: body.data.map((g) => ({
      id: g.id,
      url: g.images.fixed_width?.url,
      preview: g.images.fixed_width_small?.url || g.images.fixed_width?.url,
      w: Number(g.images.fixed_width?.width) || 200,
      h: Number(g.images.fixed_width?.height) || 200,
    })).filter((g) => g.url),
  });
});
