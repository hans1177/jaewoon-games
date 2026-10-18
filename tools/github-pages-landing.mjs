// Canonical GitHub Pages front door. Static links do not claim completed runtime QA.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validId=id=>/^[a-z0-9][a-z0-9-]*$/.test(String(id||''));
const css=[
':root{color-scheme:dark;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;background:#0b1120;color:#ecf4ff}',
'*{box-sizing:border-box}body{margin:0;min-width:280px;background:radial-gradient(ellipse 100% 500px at 60% -150px,#263b71 0,transparent 70%),#0b1120}',
'a{color:inherit;text-decoration:none}button,input{font:inherit}a:focus-visible,input:focus-visible{outline:3px solid #8ae5ff;outline-offset:4px}',
'.wrap{max-width:1200px;margin:auto;padding:0 20px}header{border-bottom:1px solid #283750;background:rgba(9,15,28,.83)}',
'.nav{display:flex;align-items:center;gap:20px;justify-content:space-between;min-height:70px;flex-wrap:wrap}',
'.logo{font-size:20px;font-weight:850;letter-spacing:-.04em}.logo b{color:#75d8fa}.navlinks{display:flex;gap:16px;color:#b6c8e4;font-size:13px}',
'.hero{padding:65px 0 44px}.eyebrow{color:#7fe1f9;font-weight:750;font-size:13px;letter-spacing:.09em}',
'h1{font-size:clamp(32px,6vw,58px);line-height:1.15;letter-spacing:-.065em;margin:16px 0 19px}h1 span{color:#83dcfb}',
'.lead{max-width:680px;line-height:1.85;color:#b9cbe0;font-size:15px}.heroactions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}',
'.action{display:inline-flex;min-height:47px;align-items:center;justify-content:center;padding:12px 18px;border-radius:13px;border:1px solid #37516d;font-weight:750;font-size:13px;background:#182841}',
'.action.primary{background:#86dbff;border-color:#86dbff;color:#071728}.stats{display:flex;flex-wrap:wrap;gap:12px;margin:25px 0 0}',
'.stat{border:1px solid #2c405c;background:#122037;border-radius:14px;padding:14px 18px;min-width:130px}',
'.stat strong{display:block;font-size:25px}.stat small{color:#9fb5d4;font-size:12px}',
'main{padding:18px 0 80px}.sectionHead{display:flex;justify-content:space-between;align-items:end;gap:15px;flex-wrap:wrap;margin-bottom:18px}',
'h2{font-size:clamp(22px,3.6vw,29px);letter-spacing:-.04em;margin:0}.muted{font-size:13px;color:#9eafc5;line-height:1.7}',
'.search{width:min(100%,350px);padding:13px 15px;border:1px solid #3b5375;border-radius:12px;background:#121e32;color:#eef7ff}',
'.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:14px}',
'.card{display:flex;flex-direction:column;min-height:206px;padding:20px;border:1px solid #273d56;background:linear-gradient(150deg,#172a43,#101c30);border-radius:17px;transition:border-color .2s,transform .2s}',
'.card:hover{transform:translateY(-2px);border-color:#6bcdf7}.card:nth-child(5n+2){background:linear-gradient(145deg,#223047,#13213a)}',
'.tag{font-size:11px;color:#84d7ed;font-weight:750}.title{margin:12px 0 6px;font-size:18px;font-weight:850;letter-spacing:-.03em}',
'.desc{font-size:12px;color:#b5c6dc;line-height:1.65;flex:1}.open{display:flex;align-items:center;justify-content:space-between;color:#90e1fd;font-weight:800;font-size:12px;margin-top:14px}',
'.secondary{margin-top:45px}.note{padding:18px;border:1px solid #344962;border-radius:14px;color:#a9bcd4;background:#132239;font-size:12px;line-height:1.8}',
'.hidden{display:none!important}footer{border-top:1px solid #273d56;color:#97abc7;padding:23px 0 35px;font-size:12px}',
'@media(max-width:600px){.hero{padding-top:45px}.wrap{padding:0 15px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.card{padding:14px;min-height:205px}.title{font-size:15px}.desc{font-size:11px}.stat{min-width:100px}.navlinks{gap:10px}}',
'@media(max-width:380px){.grid{grid-template-columns:1fr}.card{min-height:160px}}',
'@media(prefers-reduced-motion:reduce){.card{transition:none}}'
].join('\n');

export function buildPagesLanding({catalog,manifest,exposure}){
  if(!Array.isArray(catalog?.games)||!Array.isArray(manifest?.routes)||!Array.isArray(exposure?.games)){
    throw new Error('PAGES_HOME_CATALOG_MANIFEST_EXPOSURE_REQUIRED');
  }
  const byId=new Map(catalog.games.map(g=>[String(g?.canonical?.identity?.gameId||g?.id||''),g]));
  const routes=[...new Set(manifest.routes)].sort();
  if(!routes.length||routes.length!==manifest.routes.length||routes.length!==manifest.gameCount)throw Error('PAGES_HOME_MANIFEST_ROUTES_INVALID');
  const web=routes.map(route=>{
    const m=/^web-games\/([a-z0-9-]+)\/$/.exec(route);
    if(!m||!validId(m[1]))throw Error('PAGES_HOME_ROUTE_INVALID:'+route);
    const g=byId.get(m[1]);
    if(!g)throw Error('PAGES_HOME_CATALOG_GAME_MISSING:'+m[1]);
    const root=String(g?.canonical?.sources?.web?.path||g?.webPath||'').replace(/^\/+|\/+$/g,'');
    if(root!=='web-games/'+m[1])throw Error('PAGES_HOME_CANONICAL_ROUTE_MISMATCH:'+m[1]);
    return{route,id:m[1],name:g?.canonical?.identity?.name||g.name||m[1],
      description:g?.canonical?.identity?.description||g.description||'등록된 웹게임 페이지'};
  });
  const roblox=exposure.games.flatMap(g=>(g.platforms||[]).filter(p=>{
    if(p.platform!=='ROBLOX'||p.historicalInternalRelease!==true)return false;
    const url=String(p.internalUrl||'');
    return /^https:\/\/www\.roblox\.com\/games\/[1-9][0-9]*$/.test(url) &&
      url.endsWith('/'+String(p.placeId||''));
  }).map(p=>({id:String(g.gameId),url:p.internalUrl,name:byId.get(String(g.gameId))?.canonical?.identity?.name||byId.get(String(g.gameId))?.name||g.gameId})));
  const cards=web.map(g=>'<a class="card" data-web-card data-name="'+escapeHtml((g.name+' '+g.id).toLocaleLowerCase('ko-KR'))+
    '" href="./'+escapeHtml(g.route)+'"><span class="tag">WEB · 등록 페이지</span><span class="title">'+escapeHtml(g.name)+
    '</span><span class="desc">'+escapeHtml(String(g.description).slice(0,125))+
    '</span><span class="open">웹 페이지 열기 <span aria-hidden="true">↗</span></span></a>').join('\n');
  const nativeCards=roblox.map(g=>'<a class="card" href="'+escapeHtml(g.url)+'" rel="noopener noreferrer"><span class="tag">ROBLOX · 기존 배포 기록</span><span class="title">'+
    escapeHtml(g.name)+'</span><span class="desc">원래 등록된 Roblox 게임으로 이동합니다. 실제 접속 권한과 플레이 상태는 별도로 확인해야 합니다.</span><span class="open">Roblox에서 열기 <span aria-hidden="true">↗</span></span></a>').join('\n');
  const featured=routes.includes('web-games/fantasy-survival/')?'./web-games/fantasy-survival/':'./'+routes[0];
  const html=[
'<!doctype html>',
'<html lang="ko" data-jaewoon-pages-home="1">',
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
'<meta name="theme-color" content="#0b1120"><meta name="description" content="재운게임즈에 등록된 웹게임과 기존 Roblox 내부 게임 링크">',
'<title>재운게임즈 | 게임 바로가기</title><style>',css,'</style></head>',
'<body><header><div class="wrap nav"><a class="logo" href="./" aria-label="재운게임즈 첫 화면">재운<b>게임즈</b></a>',
'<nav class="navlinks" aria-label="게임 목록 이동"><a href="#web-games">웹게임</a><a href="#roblox-games">Roblox</a><a href="#information">안내</a></nav></div></header>',
'<section class="wrap hero"><div class="eyebrow">JAEWOON GAMES · GAME DIRECTORY</div>',
'<h1>만든 게임을<br><span>바로 찾아가세요.</span></h1>',
'<p class="lead">저장소에 등록된 웹게임 페이지와 기존 Roblox 배포 기록을 한곳에 모았습니다. 게임의 정식 출시 여부와 실제 플레이 검증은 각 게임마다 별도로 확인됩니다.</p>',
'<div class="heroactions"><a class="action primary" href="#web-games">웹게임 목록 보기 ↓</a><a class="action" href="'+escapeHtml(featured)+'">마력숲 웹 페이지 ↗</a></div>',
'<div class="stats"><div class="stat"><strong>'+web.length+'</strong><small>등록 웹게임 경로</small></div><div class="stat"><strong>'+roblox.length+'</strong><small>기존 Roblox 링크</small></div></div></section>',
'<main class="wrap"><section id="web-games" aria-labelledby="web-title">',
'<div class="sectionHead"><div><h2 id="web-title">웹게임 둘러보기</h2><p class="muted">각 게임의 원래 경로를 사용합니다. 페이지가 보여도 게임플레이 완료 검증을 뜻하지는 않습니다.</p></div>',
'<label><span class="muted">게임 검색</span><br><input id="game-search" class="search" type="search" placeholder="게임 이름 입력" autocomplete="off" aria-label="웹게임 이름 검색"></label></div>',
'<div class="grid" id="web-grid">'+cards+'</div><p class="muted hidden" id="no-results" role="status">해당 이름의 게임이 없습니다.</p></section>',
'<section class="secondary" id="roblox-games" aria-labelledby="roblox-title"><div class="sectionHead"><div><h2 id="roblox-title">Roblox 기존 링크</h2>',
'<p class="muted">이미 등록된 내부 배포 기록만 표시합니다. 접속 제한·검증 대기 상태일 수 있습니다.</p></div></div><div class="grid">'+nativeCards+'</div></section>',
'<section class="secondary note" id="information"><strong>게시 안내</strong><p>표시된 웹게임은 등록된 원본 파일의 연결 경로입니다. 제작 완료, 멀티플레이 연결, 저장 기능, 모바일 터치 및 정식 출시를 보장하지 않습니다. 검증된 개별 게임만 출시 완료로 안내합니다.</p>',
'<a href="./web-games/publish-manifest.json">공개 경로 매니페스트 보기 ↗</a></section></main>',
'<footer><div class="wrap">재운게임즈 · 기존 게임 경로와 파일은 그대로 보존합니다.</div></footer>',
'<script>const q=document.querySelector("#game-search"),cards=[...document.querySelectorAll("[data-web-card]")],empty=document.querySelector("#no-results");q.addEventListener("input",()=>{const term=q.value.trim().toLocaleLowerCase("ko-KR");let visible=0;for(const card of cards){const yes=card.dataset.name.includes(term);card.classList.toggle("hidden",!yes);if(yes)visible++;}empty.classList.toggle("hidden",visible!==0);});</script>',
'</body></html>'
].join('\n');
  return{html,webRoutes:routes,robloxLinks:roblox.map(g=>g.url)};
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
  if(fs.statSync(filename).size<2000)throw Error('PAGES_HOME_EMPTY_INDEX');
  console.log('PAGES_HOME_VISIBLE_WEB_LINKS='+result.webRoutes.length);
  console.log('PAGES_HOME_VISIBLE_ROBLOX_LINKS='+result.robloxLinks.length);
  console.log('PAGES_HOME_STATIC_INDEX_BYTES='+fs.statSync(filename).size);
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)writePagesLanding();
