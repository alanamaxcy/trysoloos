import { getStore } from "@netlify/blobs";

// Single shared document for the whole workspace.
// GET  /api/data  -> returns the stored state (or null if never saved)
// POST /api/data  -> overwrites the stored state with the posted JSON
export default async (req) => {
  const store = getStore({ name: "gwops", consistency: "strong" });

  if (req.method === "GET") {
    let data = null;
    try {
      data = await store.get("state", { type: "json" });
    } catch (e) {
      data = null;
    }
    return new Response(JSON.stringify(data ?? null), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      await store.setJSON("state", body);
      return new Response(JSON.stringify({ ok: true, savedAt: Date.now() }), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/data" };
