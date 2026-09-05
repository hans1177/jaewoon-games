export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    if (!['/', '/index.html'].includes(url.pathname)) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();
    html = html.replace(
      "image:'assets/insect-main-v3.webp',link:'/web-games/monster-adventure/'",
      "image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'"
    );
    html = html.replace(
      "image:'assets/monster-adventure-card.webp',link:'/web-games/monster-adventure/'",
      "image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'"
    );

    html = html.replace(/,\{title:'알 도둑 대작전'[\s\S]*?link:'\/web-games\/egg-heist\/'\}/, '');
    html = html.replace("게임 8종을 좌우로 밀어서 선택할 수 있어요!", "게임 7종을 좌우로 밀어서 선택할 수 있어요!");
    html = html.replace("if(text.includes('egg-heist')||text.includes('알 도둑'))return'알 도둑 대작전';", '');

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
