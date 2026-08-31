export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const marker = '<script src="/review-fix.js"></script>';

  if (html.includes(marker)) {
    return new Response(html, response);
  }

  const updated = html.includes('</body>')
    ? html.replace('</body>', marker + '</body>')
    : html + marker;

  return new Response(updated, response);
};

export const config = {
  path: ['/', '/index.html']
};