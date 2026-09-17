// 파일명: assets/homepage-enhancements.js
// 역할: 출시 게임을 최상단에 고정하고 개발 중 게임을 최신 점수순으로 이어서 총 30개 표시한다.
const SYNC_INTERVAL_MS=5000;
const RAW_MAIN_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/main';
const RAW_RUNTIME_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime';
const TOP_LIMIT=30;
const NON_RELEASED_GAME_IDS=new Set(['daechung-rpg']);
const OWNER_RELEASED_GAMES=[{
  id:'seed-roblox-obby-party-minigam-tower-of-hell',
  gameId:'seed-roblox-obby-party-minigam-tower-of-hell',
  name:'Skyline Rush',
  gameName:'Skyline Rush',
  productionClass:'RELEASE_CONFIRMED',
  selectedPlatform:'ROBLOX',
  targetPlatform:'ROBLOX',
  genre:['오비','파티 미니게임','레이싱'],
  description:'짧은 라운드에서 장애물을 피하고 체크포인트를 통과하며 기록을 겨루는 Roblox 오비 파티 게임.',
  webPath:'/web-games/seed-roblox-obby-party-minigam-tower-of-hell/',
  homepageArtbookPath:'/artbook-viewer.html?game=seed-roblox-obby-party-minigam-tower-of-hell',
  homepageRecentWork:'Skyline Rush 이름 반영 및 Roblox 출시 배포',
  updatedAt:'2026-09-17',
  __released:true
}];
let refreshInFlight=false;
let lastSignature='';

const getJson=async(path,{runtime=false}={})=>{
  const stamp=Date.now();
  const bases=runtime?[RAW_RUNTIME_BASE,RAW_MAIN_BASE]:[RAW_MAIN_BASE];
  for(const url of [...bases.map(base=>`${base}${path}`),path]){
    try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});if(r.ok)return await r.json();}catch{}
  }
  return null;
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=value=>{if(!value)return'';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\. /g,'.').replace(/\.$/,'');};
const scoreOf=row=>{for(const key of ['webInitialCycleStrictScore','homepageTestScore','strictImplementationScore','webStrictScore','strictScore','reviewScore','totalScore','score']){const raw=row?.[key];if(raw===null||raw===undefined||raw==='')continue;const n=Number(raw);if(Number.isFinite(n))return n;}return null;};
const gameIdOf=row=>String(row?.gameId||row?.id||'').trim();
const updatedTime=row=>{const t=Date.parse(row?.updatedAt||row?.webValidationLastAttemptAt||row?.validatedAt||row?.webUpdatedAt||row?.enqueuedAt||'');return Number.isFinite(t)?t:0;};
const normalizePlatform=value=>String(value??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const platformLabel=value=>{const p=normalizePlatform(value);if(p==='ROBLOX')return'Roblox';if(['UNITY','UNITY_ANDROID'].includes(p))return'Unity Android';if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(p))return'Fortnite UEFN';if(p==='WEB'||p==='EXISTING_WEB_GAME_CONTINUATION')return'Web';return'Web';};
const workLabels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'웹 게임플레이·음악 검증',FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP:'승인 범위 웹 콘텐츠 확장',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 실행 후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 깊이 검증',IMMUTABLE_ARTIFACT_BIND:'빌드 결과물 고정',WEB_CONTENT_DEVELOPMENT_REWORK:'웹 콘텐츠 재작업'};
const latestWork=row=>{if(row?.homepageRecentWork)return String(row.homepageRecentWork);const raw=String(row?.currentStep||row?.resumeStage||row?.executionEvidence?.failureStage||row?.canonicalState||'').trim().toUpperCase();return workLabels[raw]||raw.replaceAll('_',' ')||'개발 작업 정보 없음';};
const catalogMap=catalog=>new Map((catalog?.games||[]).map(game=>[String(game.id||'').trim(),game]));

function latestDevelopment(queue){
  const map=new Map();
  for(const row of Array.isArray(queue?.items)?queue.items:[]){
    const id=gameIdOf(row),score=scoreOf(row);if(!id||score===null)continue;
    const old=map.get(id);if(!old||updatedTime(row)>=updatedTime(old))map.set(id,row);
  }
  return [...map.values()].sort((a,b)=>scoreOf(b)-scoreOf(a)||updatedTime(b)-updatedTime(a)||gameIdOf(a).localeCompare(gameIdOf(b)));
}
function homepageRows(catalog,queue){
  const games=Array.isArray(catalog?.games)?catalog.games:[];
  const releasedMap=new Map();
  for(const game of games.filter(game=>String(game?.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED'&&!NON_RELEASED_GAME_IDS.has(String(game.id||'').trim())))releasedMap.set(String(game.id||'').trim(),{...game,gameId:game.id,__released:true});
  for(const game of OWNER_RELEASED_GAMES)releasedMap.set(gameIdOf(game),{...releasedMap.get(gameIdOf(game)),...game,__released:true});
  const released=[...releasedMap.values()];
  const releasedIds=new Set(released.map(gameIdOf));
  const development=latestDevelopment(queue).filter(row=>!releasedIds.has(gameIdOf(row)));
  return [...released,...development].slice(0,TOP_LIMIT);
}
function mergeGame(row,catalog){
  const source=catalogMap(catalog).get(gameIdOf(row))||{};
  const rawWeb=String(row?.webPath||row?.webSourcePath||row?.sourcePath||source.webPath||'').trim().replace(/^\/+|\/+$/g,'').replace(/\/index\.html$/i,'');
  return {...source,...row,id:gameIdOf(row)||source.id,name:row?.gameName||row?.name||source.name||gameIdOf(row),webPath:rawWeb?`/${rawWeb}/`:'',genre:Array.isArray(row?.genre)?row.genre:(Array.isArray(source.genre)?source.genre:[]),image:row?.image||source.image||'assets/pwa-icon-512.png',description:row?.description||source.description||'개발 중인 게임.'};
}
function selectedPlatform(game){return game.selectedPlatform||game.targetPlatform||game.productionTarget||'WEB';}
function platformHref(game){return String(game.homepagePlatformPath||game.platformGamePath||game.platformUrl||game.platformGameUrl||game.robloxGameUrl||game.robloxUrl||game.unityBuildUrl||game.uefnUrl||'').trim();}

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');style.id='jaewoonEnhancementStyles';style.textContent=`
.reviews,.music,.opsBar,.catalogIntro,.tools,.filters,.sortRow,#heroDots{display:none!important}
.brandRow{justify-content:center!important}.brand{width:100%;justify-content:center}.brand img{object-position:center center!important}.companyLink{display:none!important}
#hero.homeFocus{width:96%;margin:0 auto 14px;min-height:220px;border-radius:20px;overflow:hidden;color:#fff;background:#102d42;box-shadow:0 10px 26px rgba(28,93,138,.16);position:relative;isolation:isolate}
#hero.homeFocus:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,20,31,.95),rgba(3,20,31,.68) 58%,rgba(3,20,31,.25)),var(--focus-bg) center/cover no-repeat;z-index:-1}#hero.homeFocus:after{display:none}.homeFocusInner{min-height:220px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start}.homeFocusInner h1{margin:4px 0 7px;font-size:32px;line-height:1.08}.homeFocusInner p{max-width:650px;margin:0 0 12px;font-size:13px;font-weight:800;line-height:1.5}.homeFocusMeta{display:flex;gap:6px;flex-wrap:wrap}.homeFocusMeta span{padding:5px 8px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff20;font-size:10px;font-weight:900}.homeFocusBtn{margin-top:12px;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:10px;background:#2b91e6;color:#fff;text-decoration:none;font-size:12px;font-weight:900}
#gameHub{padding:14px 0 3px}#gameHub>.sectionHead,#gameGrid{display:none!important}#homeTop30GameCenter{margin:0 14px 14px}.top30Head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:4px 2px 12px}.top30Head h2{margin:0;font-size:25px;color:#155e9f}.top30Head p{margin:3px 0 0;color:#5f7a8d;font-size:10px;font-weight:800}.top30Count{padding:7px 10px;border-radius:999px;background:#102d42;color:#fff;font-size:10px;font-weight:1000}.top30Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.foldGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10);position:relative}.top30Rank{position:absolute;z-index:4;left:9px;top:9px;min-width:34px;height:34px;padding:0 7px;border-radius:999px;background:#102d42;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:1000}.releaseTag{position:absolute;z-index:5;right:10px;top:10px;min-width:74px;min-height:42px;padding:0 16px;border-radius:14px;background:#14845b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;font-weight:1000;letter-spacing:-.02em;box-shadow:0 5px 14px rgba(0,0,0,.22)}.foldGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}.foldGameArt img{width:100%;height:100%;object-fit:cover}.foldGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}.foldGameTitle{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;color:#fff}.foldGameTitle b{font-size:20px}.foldGameBody{padding:12px}.foldBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.foldBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;font-size:9px;font-weight:900}.foldBadge.score{background:#d9f4e4;color:#197340}.foldBadge.platform{background:#e7efff;color:#315f9b}.foldBadge.genre{background:#fff0c9;color:#865d00}.foldGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}.foldGameMeta{font-size:10px;line-height:1.6;color:#415f73;font-weight:850;padding:8px 9px;border-radius:9px;background:#eef7fd}.foldGameActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}.foldGameBtn{display:flex;align-items:center;justify-content:center;min-height:38px;border-radius:10px;text-decoration:none;font-size:9px;font-weight:900;background:#2488df;color:#fff}.foldGameBtn.secondary{background:#eef8ff;color:#1767a9;border:1px solid #afd7ef}.foldGameBtn.off{background:#e8eef2;color:#7c8c96;pointer-events:none}@media(max-width:700px){.top30Grid{grid-template-columns:1fr}}
`;document.head.appendChild(style);
}
function buildFocus(catalog,queue){
  const hero=document.getElementById('hero');if(!hero)return;const rows=homepageRows(catalog,queue);if(!rows.length)return;
  const row=rows[0],game=mergeGame(row,catalog),score=scoreOf(row),genre=(game.genre||[]).join(' · ')||'게임',web=game.webPath,updated=formatDate(row.updatedAt||row.webValidationLastAttemptAt||game.webUpdatedAt),released=row.__released===true;
  hero.className='panel hero homeFocus';hero.style.setProperty('--focus-bg',`url('${String(game.image).replaceAll("'",'%27')}')`);
  hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1><p>${esc(game.description)}</p><div class="homeFocusMeta"><span>${released?'출시':`${esc(score)}점`}</span><span>${esc(platformLabel(selectedPlatform(game)))}</span><span>${esc(genre)}</span></div><small style="margin-top:9px">${released?'최신 작업':'최신 개발'}: ${esc(latestWork(released?game:row))}${updated?` · ${esc(updated)}`:''}</small>${web?`<a class="homeFocusBtn" href="${esc(web)}">웹게임 시작</a>`:''}</div>`;
}
function buildCard(row,rank,catalog){
  const game=mergeGame(row,catalog),score=scoreOf(row),released=row.__released===true,genre=(game.genre||[]).join(' · ')||'게임',web=game.webPath,updated=formatDate(row.updatedAt||row.webValidationLastAttemptAt||game.webUpdatedAt),artbook=game.homepageArtbookPath||'',platform=platformHref(game);
  const webBtn=web?`<a class="foldGameBtn" href="${esc(web)}">웹게임</a>`:'<span class="foldGameBtn off">웹게임</span>';
  const artbookBtn=artbook?`<a class="foldGameBtn secondary" href="${esc(artbook)}">아트북</a>`:'<span class="foldGameBtn off">아트북</span>';
  const platformBtn=platform?`<a class="foldGameBtn secondary" href="${esc(platform)}">플랫폼게임</a>`:'<span class="foldGameBtn off">플랫폼게임</span>';
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}"><span class="top30Rank">#${rank}</span>${released?'<span class="releaseTag">출시</span>':''}<div class="foldGameArt"><img src="${esc(game.image)}" alt="${esc(game.name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(game.name)}</b></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge score">${released?'출시':`${esc(score)}점`}</span><span class="foldBadge platform">${esc(platformLabel(selectedPlatform(game)))}</span><span class="foldBadge genre">${esc(genre)}</span></div><p>${esc(game.description)}</p><div class="foldGameMeta">${released?'최신 작업':'최신 개발'}: ${esc(latestWork(released?game:row))}${updated?`<br><span>${esc(updated)}</span>`:''}</div><div class="foldGameActions">${webBtn}${artbookBtn}${platformBtn}</div></div></article>`;
}
function buildGameCenter(catalog,queue){
  const hub=document.getElementById('gameHub');if(!hub)return;document.getElementById('homeTop30GameCenter')?.remove();const rows=homepageRows(catalog,queue);const wrapper=document.createElement('section');wrapper.id='homeTop30GameCenter';wrapper.innerHTML=`<div class="top30Head"><div><h2>게임 TOP30</h2><p>출시 게임 우선 · 개발 게임 최신 점수순</p></div><span class="top30Count">${rows.length} / ${TOP_LIMIT}</span></div><div class="top30Grid">${rows.map((row,i)=>buildCard(row,i+1,catalog)).join('')}</div>`;hub.insertBefore(wrapper,document.getElementById('gameGrid')||null);document.documentElement.dataset.homeTop30Count=String(rows.length);
}
function simplifyPage(){document.querySelector('.opsBar')?.remove();document.querySelector('.catalogIntro')?.remove();document.querySelector('.reviews')?.remove();document.getElementById('autonomousFocusStrip')?.remove();document.getElementById('homeDevelopmentGameCenter')?.remove();}
async function refresh(){if(refreshInFlight)return;refreshInFlight=true;try{const [catalog,queue]=await Promise.all([getJson('/game-catalog.json',{runtime:true}),getJson('/development-queue.json',{runtime:true})]);const c=catalog||{games:[]},q=queue||{items:[]},sig=JSON.stringify([c,q]);if(sig!==lastSignature){buildFocus(c,q);buildGameCenter(c,q);lastSignature=sig;}document.documentElement.dataset.homeSyncAt=new Date().toISOString();}finally{refreshInFlight=false;}}
function main(){installStyles();simplifyPage();refresh();setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();