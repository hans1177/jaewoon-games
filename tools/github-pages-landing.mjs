// 파일명: tools/github-pages-landing.mjs
// GitHub Pages는 게임 파일만 게시한다. 공식 홈페이지는 기존 Cloudflare 메인 하나만 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const OFFICIAL_HOME='https://jaewoon-games.pages.dev/';
const validId=id=>/^[a-z0-9][a-z0-9-]*$/.test(String(id||''));

// 배포된 원본 게임 경로와 실제로 등록된 Roblox 링크는 계속 검증한다.
// 이 경로들을 제2의 홈페이지 목록으로 렌더링하지 않는다.
export function buildPagesLanding({catalog,manifest,exposure}){
  if(!Array.isArray(catalog?.games)||!Array.isArray(manifest?.routes)||!Array.isArray(exposure?.games)){
    throw new Error('PAGES_HOME_CATALOG_MANIFEST_EXPOSURE_REQUIRED');
  }
  const byId=new Map(catalog.games.map(g=>[String(g?.canonical?.identity?.gameId||g?.id||''),g]));
  const routes=[...new Set(manifest.routes)].sort();
  if(!routes.length||routes.length!==manifest.routes.length||routes.length!==manifest.gameCount){
    throw new Error('PAGES_HOME_MANIFEST_ROUTES_INVALID');
  }
  for(const route of routes){
    const m=/^web-games\/([a-z0-9-]+)\/$/.exec(route);
    if(!m||!validId(m[1]))throw new Error('PAGES_HOME_ROUTE_INVALID:'+route);
    const game=byId.get(m[1]);
    if(!game)throw new Error('PAGES_HOME_CATALOG_GAME_MISSING:'+m[1]);
    const root=String(game?.canonical?.sources?.web?.path||game?.webPath||'').replace(/^\/+|\/+$/g,'');
    if(root!=='web-games/'+m[1])throw new Error('PAGES_HOME_CANONICAL_ROUTE_MISMATCH:'+m[1]);
  }
  const robloxLinks=exposure.games.flatMap(game=>(game.platforms||[]).filter(platform=>{
    if(platform.platform!=='ROBLOX'||platform.historicalInternalRelease!==true)return false;
    const url=String(platform.internalUrl||'');
    return /^https:\/\/www\.roblox\.com\/games\/[1-9][0-9]*$/.test(url)&&url.endsWith('/'+String(platform.placeId||''));
  }).map(platform=>platform.internalUrl));
  // 고정된 공식 주소로 바로 이동한다. 정적 HTML의 링크는 자동이동 미지원 브라우저용이다.
  const html=[
    '<!doctype html>',
    '<!-- 파일명: GitHub Pages 배포용 index.html. 게임 루트와 공식 홈페이지를 구분한다. -->',
    '<html lang="ko" data-jaewoon-pages-redirect="1">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta http-equiv="refresh" content="0;url='+OFFICIAL_HOME+'">',
    '<meta name="robots" content="noindex,follow">',
    '<link rel="canonical" href="'+OFFICIAL_HOME+'">',
    '<title>재운게임즈 공식 홈페이지 이동</title></head>',
    '<body><p>재운게임즈 공식 홈페이지로 이동해. <a href="'+OFFICIAL_HOME+'">공식 홈페이지 열기</a></p></body>',
    '</html>'
  ].join('\n');
  return {html,webRoutes:routes,robloxLinks};
}

export function writePagesLanding({site='_site',catalogPath='game-catalog.json',exposurePath='homepage-platform-exposure.json',manifestPath='_site/web-games/publish-manifest.json'}={}){
  const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const exposure=JSON.parse(fs.readFileSync(exposurePath,'utf8'));
  const result=buildPagesLanding({catalog,manifest,exposure});
  for(const route of result.webRoutes){
    if(!fs.existsSync(path.join(site,route,'index.html')))throw Error('PAGES_HOME_SOURCE_ENTRY_MISSING:'+route);
  }
  const filename=path.join(site,'index.html');
  fs.writeFileSync(filename,result.html,'utf8');
  if(fs.statSync(filename).size<200)throw Error('PAGES_HOME_EMPTY_INDEX');
  console.log('PAGES_OFFICIAL_HOME='+OFFICIAL_HOME);
  console.log('PAGES_GAME_ROUTES_RETAINED='+result.webRoutes.length);
  console.log('PAGES_EXISTING_ROBLOX_TARGETS_VERIFIED='+result.robloxLinks.length);
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)writePagesLanding();
