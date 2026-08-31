export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const marker = '<script src="/review-fix.js?v=20260831-final1" defer></script>';
  const updated = html.includes(marker)
    ? html
    : (html.includes('</body>') ? html.replace('</body>', marker + '</body>') : html + marker);

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, max-age=0');

  return new Response(updated, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

export const config = {
  path: ['/', '/index.html']
};
