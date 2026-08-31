import { getDeployStore, getStore } from "@netlify/blobs";

const STORE_NAME = "luxe-reviews";
const KEY = "reviews.json";

function reviewsStore() {
  const isProduction = globalThis.Netlify?.context?.deploy?.context === "production";

  if (isProduction) {
    return getStore(STORE_NAME, { consistency: "strong" });
  }

  return getDeployStore(STORE_NAME);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export default async (request) => {
  try {
    const store = reviewsStore();

    if (request.method === "GET") {
      const reviews = (await store.get(KEY, { type: "json" })) || [];
      return json({ reviews });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const data = await request.json();
    const name = String(data.name || "").trim().slice(0, 80);
    const vehicle = String(data.vehicle || "").trim().slice(0, 100);
    const review = String(data.review || "").trim().slice(0, 1200);
    const ratingNumber = Number(data.rating);
    const rating = Number.isFinite(ratingNumber)
      ? Math.max(1, Math.min(5, Math.round(ratingNumber)))
      : 5;

    if (!name || !vehicle || !review) {
      return json({ error: "Please complete your name, vehicle, and review." }, 400);
    }

    const reviews = (await store.get(KEY, { type: "json" })) || [];

    const entry = {
      id: crypto.randomUUID(),
      name,
      vehicle,
      rating,
      review,
      createdAt: new Date().toISOString()
    };

    await store.setJSON(KEY, [entry, ...reviews].slice(0, 100));

    return json({ ok: true, review: entry }, 201);
  } catch (error) {
    console.error("review function failed", error);
    return json({ error: "Review service unavailable. Please try again." }, 500);
  }
};
