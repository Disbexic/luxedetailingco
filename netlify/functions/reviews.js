const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'luxe-reviews';
const KEY = 'reviews.json';

exports.handler = async (event) => {
  try {
    const store = getStore(STORE_NAME);

    if (event.httpMethod === 'GET') {
      const reviews = (await store.get(KEY, { type: 'json' })) || [];

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({ reviews })
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');

      const name = String(data.name || '').trim().slice(0, 80);
      const vehicle = String(data.vehicle || '').trim().slice(0, 100);
      const review = String(data.review || '').trim().slice(0, 1200);
      const rating = Math.max(
        1,
        Math.min(5, Number(data.rating || 5))
      );

      if (!name || !vehicle || !review) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Missing review fields.'
          })
        };
      }

      const reviews =
        (await store.get(KEY, { type: 'json' })) || [];

      const entry = {
        id: Date.now().toString(36),
        name,
        vehicle,
        rating,
        review,
        createdAt: new Date().toISOString()
      };

      reviews.unshift(entry);

      await store.setJSON(
        KEY,
        reviews.slice(0, 100)
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ok: true,
          review: entry
        })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Review service unavailable.'
      })
    };
  }
};
