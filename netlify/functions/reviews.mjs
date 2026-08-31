import { getStore } from "@netlify/blobs";

const STORE_NAME = "luxe-reviews";
const KEY = "reviews.json";
const QA_NAME = "__LUXE_QA__";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text));
}

function cleanReview(data) {
  const ratingNumber = Number(data.rating);
  return {
    name: String(data.name || "").trim().slice(0, 80),
    vehicle: String(data.vehicle || "").trim().slice(0, 100),
    review: String(data.review || "").trim().slice(0, 1200),
    rating: Number.isFinite(ratingNumber)
      ? Math.max(1, Math.min(5, Math.round(ratingNumber)))
      : 5
  };
}

export default async (request) => {
  try {
    const store = getStore(STORE_NAME, { consistency: "strong" });
    const url = new URL(request.url);

    if (request.method === "GET") {
      const reviews = (await store.get(KEY, { type: "json" })) || [];
      return json({ ok: true, reviews });
    }

    if (request.method === "DELETE" && url.searchParams.get("qa") === "1") {
      const reviews = (await store.get(KEY, { type: "json" })) || [];
      const cleaned = reviews.filter((item) => item.name !== QA_NAME);
      await store.setJSON(KEY, cleaned);
      return json({ ok: true, removed: reviews.length - cleaned.length });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const data = await readBody(request);
    const cleaned = cleanReview(data);
    if (!cleaned.name || !cleaned.vehicle || !cleaned.review) {
      return json({ error: "Please complete your name, vehicle, and review." }, 400);
    }

    const current = (await store.get(KEY, { type: "json" })) || [];
    const entry = {
      id: crypto.randomUUID(),
      ...cleaned,
      createdAt: new Date().toISOString()
    };

    await store.setJSON(KEY, [entry, ...current].slice(0, 100));
    const verify = (await store.get(KEY, { type: "json" })) || [];
    const stored = verify.some((item) => item.id === entry.id);

    if (String(data._smoke || "") === "1") {
      await store.setJSON(KEY, verify.filter((item) => item.id !== entry.id));
      return json({ ok: stored, smoke: true, storage: stored }, stored ? 200 : 500);
    }

    if (!stored) return json({ error: "Review could not be verified after saving." }, 500);
    return json({ ok: true, review: entry, reviews: verify }, 201);
  } catch (error) {
    console.error("reviews function failed", error);
    return json({ error: "Review service unavailable. Please try again." }, 500);
  }
};
