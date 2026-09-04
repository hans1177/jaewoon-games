export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    if (!['/', '/index.html'].includes(url.pathname)) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();
    html = html.replace(
      "image:'assets/insect-main-v3.webp',link:'/monster-adventure.html'",
      "image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/monster-adventure.html'"
    );
    html = html.replace(
      "image:'assets/monster-adventure-card.webp',link:'/monster-adventure.html'",
      "image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/monster-adventure.html'"
    );

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
