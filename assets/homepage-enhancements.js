// 파일명: assets/homepage-enhancements.js
// 역할: 서버 런타임의 canonical 게임정보를 받아 검증된 웹게임 전체와 제작 상태를 홈페이지에 표시한다.
const SYNC_INTERVAL_MS=30000;
const FEATURED_GAME_ID='daechung-rpg';
let refreshInFlight=false;
let lastSignature='';
let portfolioStatus={games:[],counts:{}};
let platformExposure={games:[]};


const getJson=async path=>{
  const stamp=Date.now();
  try{
    const r=await fetch(`${path}${path.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});
    if(r.ok)return await r.json();
  }catch{}
  return null;
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=value=>{
  if(!value)return'';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\. /g,'.').replace(/\.$/,'');
};
const normalizePlatform=value=>{
  const p=String(value??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
  if(p==='ROBLOX')return'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(p))return'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(p))return'FORTNITE_UEFN';
  return'';
};
const platformLabel=value=>{
  const p=normalizePlatform(value);
  if(p==='UNITY')return'Unity Android';
  if(p==='ROBLOX')return'Roblox';
  if(p==='FORTNITE_UEFN')return'Fortnite UEFN';
  return'플랫폼 선택 필요';
};
const canonicalOf=row=>row?.canonical&&typeof row.canonical==='object'?row.canonical:{};
const identityOf=row=>canonicalOf(row).identity&&typeof canonicalOf(row).identity==='object'?canonicalOf(row).identity:{};
const lifecycleOf=row=>canonicalOf(row).lifecycle&&typeof canonicalOf(row).lifecycle==='object'?canonicalOf(row).lifecycle:{};
const productionOf=row=>canonicalOf(row).production&&typeof canonicalOf(row).production==='object'?canonicalOf(row).production:{};
const sourcesOf=row=>canonicalOf(row).sources&&typeof canonicalOf(row).sources==='object'?canonicalOf(row).sources:{};
const publicationOf=row=>canonicalOf(row).publication&&typeof canonicalOf(row).publication==='object'?canonicalOf(row).publication:{};
const homepageOf=row=>canonicalOf(row).homepage&&typeof canonicalOf(row).homepage==='object'?canonicalOf(row).homepage:{};
const gameIdOf=row=>String(identityOf(row).gameId||row?.id||row?.gameId||'').trim();
const runtimeInfo=row=>homepageOf(row).runtime&&typeof homepageOf(row).runtime==='object'?homepageOf(row).runtime:(row?.homepageInfo&&typeof row.homepageInfo==='object'?row.homepageInfo:{});
const scoreState=row=>{
  const info=runtimeInfo(row),raw=info.score;
  const score=raw===null||raw===undefined||raw===''?null:Number(raw);
  const label=String(info.scoreLabel||'').trim();
  return{score:Number.isFinite(score)?score:null,label:label||'점수 미평가',current:Boolean(info.scoreCurrent),source:info.scoreSource||'SERVER_RUNTIME'};
};
const genreState=row=>{
  const info=runtimeInfo(row);
  const list=Array.isArray(info.genre)?info.genre:[];
  return String(info.genreLabel||list.join(' · ')||'장르 미평가').trim();
};
const playState=row=>String(runtimeInfo(row).playModeLabel||'플레이 방식 미평가').trim();
const latestWork=row=>String(runtimeInfo(row).latestWork||'개발 작업 정보 없음').trim();
const progressState=row=>String(runtimeInfo(row).status||'진행상태 미평가').trim();
const updatedAt=row=>runtimeInfo(row).updatedAt||null;
const selectedPlatform=row=>runtimeInfo(row).platform||productionOf(row).selectedPlatform||row?.selectedPlatform||'';
const displayPlatform=row=>String(row?.homepageDisplayMode||homepageOf(row).displayMode||'').toUpperCase()==='ROBLOX_HISTORICAL_DEPLOYMENT'?'ROBLOX':selectedPlatform(row);
const activeLifecycle=row=>['ACTIVE','REBUILD'].includes(String(lifecycleOf(row).state||row?.lifecycleState||row?.runtimeStatus||'ACTIVE').toUpperCase());
const classState=row=>{const mode=String(homepageOf(row).displayMode||row?.homepageDisplayMode||'').toUpperCase();if(mode==='ROBLOX_HISTORICAL_DEPLOYMENT')return'Roblox 배포 기록';if(mode==='WEB_PUBLISHED')return'웹게임';const cls=String(runtimeInfo(row).productionClass||'DESIGN_ONLY').toUpperCase();if(cls==='RELEASE_CONFIRMED')return'출시';if(cls==='DEVELOPMENT_CONFIRMED')return'개발확정';return'설계';};
const productionClassOf=row=>String(runtimeInfo(row).productionClass||productionOf(row).class||row?.productionClass||'DESIGN_ONLY').toUpperCase();
const displayEligible=row=>['RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED'].includes(productionClassOf(row));
const catalogOrderOf=row=>{const raw=canonicalOf(row).catalogOrder??row?.catalogOrder;const n=Number(raw);return Number.isFinite(n)&&n>0?n:Number.MAX_SAFE_INTEGER;};
const catalogOrderCompare=(a,b)=>catalogOrderOf(a)-catalogOrderOf(b)||gameIdOf(a).localeCompare(gameIdOf(b));
const portfolioDecisionOf=id=>(portfolioStatus?.games||[]).find(x=>String(x.gameId||'')===String(id||''))||null;
const portfolioLabelOf=id=>portfolioDecisionOf(id)?.label||'판정 대기';
const portfolioDecisionKeyOf=id=>portfolioDecisionOf(id)?.decision||'PENDING';
const portfolioClassOf=id=>'portfolio-'+String(portfolioDecisionKeyOf(id)).toLowerCase().replaceAll('_','-');
const exposureOf=id=>(platformExposure?.games||[]).find(x=>String(x.gameId||'')===String(id||''))||null;
const exposureStateOf=id=>String(exposureOf(id)?.externalPublicReleaseState||'INTERNAL_ONLY');
const exposureLabelOf=id=>({INTERNAL_ONLY:'내부전용',PUBLIC_RELEASE_READY:'외부공개 준비',PUBLIC_RELEASE:'외부공개'})[exposureStateOf(id)]||exposureStateOf(id);
const platformReleaseLabel=p=>{
  if(p?.publicRelease===true||p?.publicReleaseState==='PUBLIC_RELEASE')return'공개출시';
  if(p?.publicReleaseReady===true||p?.publicReleaseState==='PUBLIC_RELEASE_READY')return'공개출시 준비';
  if(p?.internalReleaseReady===true)return'내부출시';
  return p?.developmentState==='NATIVE_DEVELOPMENT'?'개발중':'준비중';
};
const platformExposureMeta=id=>{const row=exposureOf(id);if(!row)return'';return (row.platforms||[]).filter(p=>['ROBLOX','UNITY'].includes(normalizePlatform(p.platform))).map(p=>`${normalizePlatform(p.platform)} ${platformReleaseLabel(p)}`).join(' / ');};

function latestVerifiedUnityBuilds(status){
  const map=new Map();
  for(const build of Array.isArray(status?.testBuilds)?status.testBuilds:[]){
    const id=String(build?.gameId||'').trim();
    const download=String(build?.download||'').trim();
    const runtimePassed=build?.installAndLaunchVerified===true||build?.runtimeInstallLaunchVerified===true||String(build?.runtimeVerification||'').toLowerCase().endsWith('-passed');
    if(!id||!download||build?.status!=='ready'||build?.mobileReady!==true||build?.signatureVerified!==true||!runtimePassed)continue;
    const old=map.get(id);
    const t=Date.parse(build?.builtAt||build?.homepagePublishedAt||'')||0;
    const oldT=Date.parse(old?.builtAt||old?.homepagePublishedAt||'')||0;
    if(!old||t>=oldT)map.set(id,build);
  }
  return map;
}
function bindVerifiedUnityBuild(row,status){
  const build=latestVerifiedUnityBuilds(status).get(gameIdOf(row));
  return build?{...row,unityBuildUrl:build.download,unityBuildSha256:build.sha256,unityBuildApplicationId:build.applicationId,unityBuildVerified:true}:row;
}
function classRank(row){
  const cls=String(runtimeInfo(row).productionClass||'').toUpperCase();
  if(cls==='RELEASE_CONFIRMED')return 0;
  if(cls==='DEVELOPMENT_CONFIRMED')return 1;
  return 2;
}
function releaseRows(catalog,status){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>activeLifecycle(game)&&productionClassOf(game)==='RELEASE_CONFIRMED')
    .map(game=>bindVerifiedUnityBuild(game,status))
    .sort(catalogOrderCompare);
}
function developmentRows(catalog,status){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>activeLifecycle(game)&&productionClassOf(game)==='DEVELOPMENT_CONFIRMED')
    .map(game=>bindVerifiedUnityBuild(game,status))
    .sort((a,b)=>{
      const sa=scoreState(a),sb=scoreState(b);
      if(sa.score!==null||sb.score!==null){
        if(sa.score===null)return 1;
        if(sb.score===null)return-1;
        if(sb.score!==sa.score)return sb.score-sa.score;
      }
      return catalogOrderCompare(a,b);
    });
}
function canonicalWebHref(row){
  const id=gameIdOf(row);
  if(!id)return'';
  const web=sourcesOf(row).web||{};
  const raw=String(web.path||row?.webPath||'').trim().replace(/^\/+|\/+$/g,'').replace(/\/index\.html$/i,'');
  const expected=`web-games/${id}`;
  return raw===expected?`/${expected}/`:'';
}
function webPublishedRows(catalog){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>{
      const web=sourcesOf(game).web||{};
      return activeLifecycle(game)&&(web.playable===true||game?.homepageWebPlayable===true)&&(web.archive===true||game?.hasWebArchive===true)&&Boolean(canonicalWebHref(game));
    })
    .map(game=>({...game,webPath:canonicalWebHref(game),homepageDisplayMode:'WEB_PUBLISHED'}))
    .sort(catalogOrderCompare);
}
function verifiedRobloxDeploymentRows(catalog){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>{
      if(!activeLifecycle(game))return false;
      const canonical=publicationOf(game).roblox||{};
      const target=Object.keys(canonical).length?canonical:(game?.robloxPublicationTarget||{});
      const evidence=Object.keys(canonical).length?canonical:(game?.robloxReleaseEvidence||{});
      const placeId=String(target?.placeId||'').trim();
      return /^[1-9][0-9]*$/.test(placeId)&&target?.verified===true&&target?.historical===true&&evidence?.historicalPublicationTargetVerified===true;
    })
    .map(game=>({...game,homepageDisplayMode:'ROBLOX_HISTORICAL_DEPLOYMENT'}))
    .sort(catalogOrderCompare);
}
function mergeGame(row){
  const displayMode=String(row?.homepageDisplayMode||'').trim();
  const identity=identityOf(row),web=sourcesOf(row).web||{};
  const playable=web.playable===true||row?.homepageWebPlayable===true;
  const allowWeb=playable&&(displayEligible(row)||displayMode==='WEB_PUBLISHED'||displayMode==='ROBLOX_HISTORICAL_DEPLOYMENT');
  const webPath=allowWeb?canonicalWebHref(row):'';
  return {...row,id:gameIdOf(row),name:identity.name||row?.name||gameIdOf(row),webPath,image:identity.image||row?.image||'assets/pwa-icon-512.png',description:identity.description||row?.description||'개발 중인 게임.'};
}
function platformLinks(game){
  const exposure=exposureOf(gameIdOf(game));
  const platform=id=>(exposure?.platforms||[]).find(p=>normalizePlatform(p?.platform)===id)||{};
  const rp=platform('ROBLOX'),up=platform('UNITY');
  const canonical=publicationOf(game).roblox||{};
  const target=Object.keys(canonical).length?canonical:(game?.robloxPublicationTarget||game?.robloxReleaseEvidence||{});
  const placeId=String(rp.placeId||target?.placeId||'').trim();
  const roblox=String((rp.publicRelease===true?rp.publicUrl:rp.internalUrl)||(/^[1-9][0-9]*$/.test(placeId)?`https://www.roblox.com/games/${placeId}`:'')).trim();
  const unity=String((up.publicRelease===true?up.publicUrl:up.internalUrl)||(game?.unityBuildVerified===true?game?.unityBuildUrl:'')||'').trim();
  return {roblox,unity};
}
function internalReleaseLinks(game){
  const links=platformLinks(game);
  const exposure=exposureOf(gameIdOf(game));
  const state=id=>(exposure?.platforms||[]).find(p=>normalizePlatform(p?.platform)===id)||{};
  const roblox=state('ROBLOX'),unity=state('UNITY');
  return {
    roblox:roblox.internalReleaseReady===true||roblox.publicRelease===true?links.roblox:'',
    unity:unity.internalReleaseReady===true||unity.publicRelease===true?links.unity:''
  };
}
function hasInternalRelease(game){
  const exposure=exposureOf(gameIdOf(game));
  return (exposure?.platforms||[]).some(p=>['ROBLOX','UNITY'].includes(normalizePlatform(p?.platform))&&(p?.internalReleaseReady===true||p?.publicRelease===true));
}
function internalReleaseRows(catalog,status){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(activeLifecycle)
    .map(game=>bindVerifiedUnityBuild(game,status))
    .filter(hasInternalRelease)
    .sort(catalogOrderCompare);
}
function recentModificationRows(catalog){
  const generic=/^Owner 최신 지시에 따라 기존 구현은 보존하고 설계 단계부터 다시 평가합니다\.$|^TARGET_PLATFORM_TECHNICAL_VALIDATION$/;
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(activeLifecycle)
    .map(game=>{
      const work=String(latestWork(game)||'').trim();
      const updated=String(runtimeInfo(game).updatedAt||homepageOf(game).updatedAt||'').trim();
      return {game,work,updated,confirmed:Boolean(work&&!generic.test(work))};
    })
    .filter(row=>row.work||row.updated)
    .sort((a,b)=>(Date.parse(b.updated)||0)-(Date.parse(a.updated)||0)||catalogOrderCompare(a.game,b.game))
    .slice(0,5);
}
function platformHref(game){
  const links=platformLinks(game);
  return links.roblox||links.unity||'';
}
function installStyles(){
  document.documentElement.dataset.homeVisualMode='SAMPLE_FRONT_DOOR_V1';
  if(document.getElementById('homepageEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='homepageEnhancementStyles';
  style.textContent=`
.foldGameBtn{min-height:46px;display:flex;align-items:center;justify-content:center}
@media(max-width:700px){.gameShelfGrid{grid-template-columns:1fr}.homeFocusBtn{width:100%;min-height:48px}}
@media(max-width:420px){.foldGameActions{grid-template-columns:repeat(2,minmax(0,1fr))}.foldGameBtn.platformAction{grid-column:1/-1}}
`;
  document.head.appendChild(style);
}
function buildFocus(catalog,status){
  const hero=document.getElementById('hero');
  if(!hero)return;
  const allRows=[...releaseRows(catalog,status),...developmentRows(catalog,status)];
  const seen=new Set();
  const rows=allRows.filter(row=>{const id=gameIdOf(row);if(!id||seen.has(id))return false;seen.add(id);return true;});
  const row=rows.find(item=>gameIdOf(item)===FEATURED_GAME_ID)||rows[0];
  if(!row)return;
  const game=mergeGame(row),native=platformHref(game);
  hero.className='hero homeFocus';
  hero.style.setProperty('--focus-bg',`url('${String(game.image).replaceAll("'","%27")}')`);
  hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1><p>${esc(game.description)}</p>${native?`<a class="homeFocusBtn" href="${esc(native)}">내부 플레이</a>`:'<a class="homeFocusBtn" href="#gameHub">개발 상태 보기</a>'}</div>`;
}
function buildCard(row){
  const game=mergeGame(row),links=internalReleaseLinks(game),exposure=exposureOf(gameIdOf(game));
  const state=platform=>{const p=(exposure?.platforms||[]).find(x=>normalizePlatform(x.platform)===platform);return platformReleaseLabel(p);};
  const button=(href,label,offLabel,extra='')=>href?`<a class="foldGameBtn ${extra}" href="${esc(href)}">${label}</a>`:`<span class="foldGameBtn off">${offLabel}</span>`;
  const actions=[
    button(links.roblox,`Roblox · ${state('ROBLOX')}`,`Roblox · ${state('ROBLOX')}`,'platformAction robloxAction'),
    button(links.unity,`Unity 앱 · ${state('UNITY')}`,`Unity 앱 · ${state('UNITY')}`,'platformAction unityAction')
  ].join('');
  const meta=platformExposureMeta(game.id)||'Roblox / Unity 앱 개발 준비';
  const direct=links.roblox||links.unity||'';
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}" data-direct-play="${esc(direct)}"><div class="foldGameArt"><img src="${esc(game.image)}" alt="${esc(game.name)}" loading="lazy"></div><div class="foldGameBody"><h3>${esc(game.name)}</h3><p>${esc(game.description)}</p><div class="foldGameMeta">${esc(meta)}</div><div class="foldGameActions">${actions}</div></div></article>`;
}
function buildShelf(hub,id,title,description,rows){
  document.getElementById(id)?.remove();
  const wrapper=document.createElement('section');
  wrapper.id=id;
  wrapper.className='homeGameShelf';
  wrapper.innerHTML=`<div class="gameShelfHead"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="gameShelfCount">${rows.length}개</span></div><div class="gameShelfGrid">${rows.length?rows.map(row=>buildCard(row)).join(''):'<div class="foldGameMeta">표시할 게임이 없어.</div>'}</div>`;
  hub.appendChild(wrapper);
}
function buildRecentUpdates(catalog){
  const section=document.getElementById('recentUpdates');
  const list=document.getElementById('recentUpdateList');
  if(!section||!list)return;
  const rows=recentModificationRows(catalog);
  list.innerHTML=rows.length?rows.map(({game,work,updated,confirmed})=>{
    const name=identityOf(game).name||game?.name||gameIdOf(game);
    const summary=confirmed?work:'최신 지시 반영 상태를 확인 중';
    const date=updated?new Date(updated).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}):'';
    return `<article class="recentUpdateItem"><div><b>${esc(name)}</b><span>${esc(summary)}</span></div><small>${confirmed?'반영 기록':'확인 중'}${date?` · ${esc(date)}`:''}</small></article>`;
  }).join(''):'<div class="recentUpdateEmpty">최근 수정 기록을 불러오는 중</div>';
  section.dataset.recentUpdateCount=String(rows.length);
}
function updateLiveSummary(catalog,status){
  const available=internalReleaseRows(catalog,status);
  const availableIds=new Set(available.map(gameIdOf));
  const development=developmentRows(catalog,status).filter(game=>!availableIds.has(gameIdOf(game)));
  const recent=recentModificationRows(catalog);
  const values={metricPlayable:available.length,metricDevelopment:development.length,metricRecent:recent.length};
  for(const [id,value] of Object.entries(values)){const node=document.getElementById(id);if(node)node.textContent=String(value);}
  document.documentElement.dataset.homeSummary=`platformAvailable:${available.length};development:${development.length};recent:${recent.length}`;
}
function buildPortfolioBoard(){
  document.getElementById('homePortfolioBoard')?.remove();
  document.documentElement.dataset.homePortfolioAuthority=String(portfolioStatus?.authority||'pending');
}
function buildGameCenter(catalog,status){
  const hub=document.getElementById('gameHub');
  if(!hub)return;
  for(const id of ['homeReleaseGameCenter','homeRobloxDeploymentCenter','homeWebGameCenter','homePlatformAvailableGameCenter','homeDevelopmentGameCenter'])document.getElementById(id)?.remove();
  const available=internalReleaseRows(catalog,status);
  const availableIds=new Set(available.map(gameIdOf));
  const development=developmentRows(catalog,status).filter(game=>!availableIds.has(gameIdOf(game)));
  buildShelf(hub,'homePlatformAvailableGameCenter','게임 가능','플랫폼 내부 출시가 확인된 게임',available);
  buildShelf(hub,'homeDevelopmentGameCenter','개발 중','플랫폼 개발이 진행 중인 게임',development);
  document.documentElement.dataset.homePlatformAvailableCount=String(available.length);
  document.documentElement.dataset.homeDevelopmentCount=String(development.length);
  document.documentElement.dataset.homeServerAuthority=String(catalog?.runtimeInfoAuthority||catalog?.runtimeAuthority||'none');
  document.documentElement.dataset.homeSupportedPlatforms=(catalog?.runtimeSupportedPlatforms||[]).join(',');
  markDirectPlayCards();
}
function directPlayTarget(card){
  if(!card)return'';
  return String(card.dataset?.directPlay||'').trim();
}
function bindDirectGameLaunch(){
  if(document.documentElement.dataset.directGameLaunchBound==='1')return;
  document.documentElement.dataset.directGameLaunchBound='1';
  document.addEventListener('click',event=>{
    const interactive=event.target.closest('a,button,input,select,textarea,label');
    if(interactive)return;
    const card=event.target.closest('.foldGameCard,.gameCard');
    if(!card)return;
    const target=directPlayTarget(card);
    if(!target)return;
    window.location.href=target;
  });
}
function markDirectPlayCards(){
  document.querySelectorAll('.foldGameCard,.gameCard').forEach(card=>{
    const target=directPlayTarget(card);
    if(!target)return;
    card.dataset.directPlay=target;
    card.dataset.touchLaunch='true';
    card.style.cursor='pointer';
  });
}
function simplifyPage(){}
async function refresh(){
  if(refreshInFlight)return;
  refreshInFlight=true;
  try{
    const [catalog,status,testManifest,portfolio,exposure]=await Promise.all([getJson('/game-catalog.json'),getJson('/company-status.json'),getJson('/test-game-candidates.json'),getJson('/homepage-portfolio-status.json'),getJson('/homepage-platform-exposure.json')]);
    if(catalog?.runtimeInfoAuthority!=='company-runtime'||status?.runtimeAuthority!=='company-runtime')return;
    const exposureAuthority=String(exposure?.runtimeAuthority||exposure?.authority||'').trim();
    const exposurePlatforms=Array.isArray(exposure?.supportedPlatforms)?exposure.supportedPlatforms.map(normalizePlatform).filter(Boolean):[];
    if(exposureAuthority!=='company-runtime'||JSON.stringify(exposurePlatforms)!==JSON.stringify(['ROBLOX','UNITY'])||!Array.isArray(exposure?.games))return;
    portfolioStatus=portfolio&&Array.isArray(portfolio.games)?portfolio:{games:[],counts:{}};
    platformExposure=exposure;
    const sig=JSON.stringify([catalog,status,testManifest,portfolioStatus,platformExposure]);
    if(sig!==lastSignature){updateLiveSummary(catalog,status);buildFocus(catalog,status);buildGameCenter(catalog,status);buildRecentUpdates(catalog);lastSignature=sig;}
    document.documentElement.dataset.homeSyncAt=new Date().toISOString();
    document.documentElement.dataset.homeProgressAuthority='company-runtime';
  }finally{refreshInFlight=false;}
}
function main(){
  installStyles();
  simplifyPage();
  bindDirectGameLaunch();
  refresh();
  setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS);
  window.addEventListener('focus',refresh);
  window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();