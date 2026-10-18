// 파일명: tools/github-pages-landing.mjs
// GitHub Pages에서는 기존 메인 홈페이지를 동일하게 게시하고 게임 원본 경로를 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const OFFICIAL_HOME='https://hans1177.github.io/jaewoon-games/';
const PAGES_ROOT='/jaewoon-games/';
const validId=id=>/^[a-z0-9][a-z0-9-]*$/.test(String(id||''));

// canonical 게임 경로 검증은 유지하고, 하나의 기존 메인 HTML을 그대로 게시한다.
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
  // 기존 메인 UI만 사용한다. 소스의 루트 절대경로는 Pages 프로젝트 경로로 변환한다.
  const original=fs.readFileSync('index.html','utf8');
  if(!original.includes('data-homepage-version="SAMPLE_FRONT_DOOR_V1"')
     ||!original.includes('assets/homepage-enhancements.js')){
    throw new Error('PAGES_HOME_CANONICAL_SOURCE_INVALID');
  }
  const html=original.replace(/(["'\x60])\/(?!\/)/g,'$1'+PAGES_ROOT);
  if(html.includes('data-jaewoon-pages-redirect')||html.includes('http-equiv="refresh"')){
    throw new Error('PAGES_HOME_REDIRECT_FORBIDDEN');
  }
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
  console.log('PAGES_CANONICAL_HOME=MAIN_INDEX');
  console.log('PAGES_GAME_ROUTES_RETAINED='+result.webRoutes.length);
  console.log('PAGES_EXISTING_ROBLOX_TARGETS_VERIFIED='+result.robloxLinks.length);
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)writePagesLanding();
