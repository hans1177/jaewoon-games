// 파일명: assets/homepage-enhancements.js
// 역할: 서버 런타임의 canonical 게임정보를 받아 검증된 웹게임 전체와 제작 상태를 홈페이지에 표시한다.
const SYNC_INTERVAL_MS=5000;
let refreshInFlight=false;
let lastSignature='';

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
const activeLifecycle=row=>['ACTIVE','REBUILD'].includes(String(lifecycleOf(row).state||row?.lifecycleState||row?.runtimeStatus||'ACTIVE').toUpperCase());
const classState=row=>{const mode=String(homepageOf(row).displayMode||row?.homepageDisplayMode||'').toUpperCase();if(mode==='ROBLOX_HISTORICAL_DEPLOYMENT')return'Roblox 배포 기록';if(mode==='WEB_PUBLISHED')return'웹게임';const cls=String(runtimeInfo(row).productionClass||'DESIGN_ONLY').toUpperCase();if(cls==='RELEASE_CONFIRMED')return'출시';if(cls==='DEVELOPMENT_CONFIRMED')return'개발확정';return'설계';};
const productionClassOf=row=>String(runtimeInfo(row).productionClass||productionOf(row).class||row?.productionClass||'DESIGN_ONLY').toUpperCase();
const displayEligible=row=>['RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED'].includes(productionClassOf(row));
const catalogOrderOf=row=>{const raw=canonicalOf(row).catalogOrder??row?.catalogOrder;const n=Number(raw);return Number.isFinite(n)&&n>0?n:Number.MAX_SAFE_INTEGER;};
const catalogOrderCompare=(a,b)=>catalogOrderOf(a)-catalogOrderOf(b)||gameIdOf(a).localeCompare(gameIdOf(b));

function latestVerifiedUnityBuilds(status){
  const map=new Map();
  for(const build of Array.isArray(status?.testBuilds)?status.testBuilds:[]){
    const id=String(build?.gameId||'').trim();
    const download=String(build?.download||'').trim();
    const runtimePassed=build?.installAndLaunchVerified===true||build?.runtimeInstallLaunchVerified===true||String(build?.runtimeVerification||'').toLowerCase().endsWith('-passed');
    if(!id||!download||build?.status!=='ready'||build?.mobileReady!==true||build?.homepagePublished!==true||build?.signatureVerified!==true||!runtimePassed)continue;
    const old=map.get(id);
    const t=Date.parse(build?.builtAt||build?.homepagePublishedAt||'')||0;
    const oldT=Date.parse(old?.builtAt||old?.homepagePublishedAt||'')||0;
    if(!old||t>=oldT)map.set(id,build);
  }
  return map;
}
function bindVerifiedUnityBuild(row,status){
  if(normalizePlatform(selectedPlatform(row))!=='UNITY')return row;
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
      if(!activeLifecycle(game)||normalizePlatform(selectedPlatform(game))!=='ROBLOX')return false;
      const canonical=publicationOf(game).roblox||{};
      const target=Object.keys(canonical).length?canonical:(game?.robloxPublicationTarget||{});
      const evidence=Object.keys(canonical).length?canonical:(game?.robloxReleaseEvidence||{});
      const placeId=String(target?.placeId||'').trim();
      return /^[1-9][0-9]*$/.test(placeId)&&target?.verified===true&&target?.historical===true&&evidence?.historicalPublicationTargetVerified===true;
    })
    .map(game=>({...game,homepageDisplayMode:'ROBLOX_HISTORICAL_DEPLOYMENT'}))
    .sort(catalogOrderCompare);
}
function runtimeGameplayMediaFor(row,mediaIndex){
  const gameId=gameIdOf(row),platform=normalizePlatform(selectedPlatform(row));
  if(!gameId||!['UNITY','ROBLOX','FORTNITE_UEFN'].includes(platform))return null;
  const items=Array.isArray(mediaIndex?.items)?mediaIndex.items:[];
  return items.find(item=>String(item?.gameId||'').trim()===gameId&&normalizePlatform(item?.platform)===platform)||null;
}
function gameplayMediaMarkup(game){
  const media=game.homepageRuntimeGameplayMedia||{},still=String(media?.still?.mediaPath||game.image||''),motion=String(media?.motion?.mediaPath||'');
  const alt=esc(game.name);
  if(motion&&/\.(?:mp4|webm)$/i.test(motion)){
    const type=/\.webm$/i.test(motion)?'video/webm':'video/mp4';
    return `<video class="foldGameMotion" autoplay muted loop playsinline preload="metadata" ${still?`poster="${esc(still)}"`:''} aria-label="${alt} 실제 플레이 모션"><source src="${esc(motion)}" type="${type}"></video>`;
  }
  if(motion&&/\.(?:gif|webp)$/i.test(motion))return `<img src="${esc(motion)}" alt="${alt} 실제 플레이 모션" loading="lazy">`;
  return `<img src="${esc(still)}" alt="${alt}" loading="lazy">`;
}
function mergeGame(row,mediaIndex){
  const displayMode=String(row?.homepageDisplayMode||'').trim();
  const identity=identityOf(row),web=sourcesOf(row).web||{};
  const playable=web.playable===true||row?.homepageWebPlayable===true;
  const allowWeb=playable&&(displayEligible(row)||displayMode==='WEB_PUBLISHED'||displayMode==='ROBLOX_HISTORICAL_DEPLOYMENT');
  const webPath=allowWeb?canonicalWebHref(row):'';
  const runtimeMedia=runtimeGameplayMediaFor(row,mediaIndex);
  const image=String(runtimeMedia?.still?.mediaPath||identity.image||row?.image||'assets/pwa-icon-512.png').replace(/^\/+/, '/');
  return {...row,id:gameIdOf(row),name:identity.name||row?.name||gameIdOf(row),webPath,image,homepageRuntimeGameplayMedia:runtimeMedia,description:identity.description||row?.description||'개발 중인 게임.'};
}
function platformHref(game){
  const p=normalizePlatform(selectedPlatform(game));
  const canonical=publicationOf(game).roblox||{};
  const target=Object.keys(canonical).length?canonical:(game?.robloxPublicationTarget||game?.robloxReleaseEvidence||{});
  const placeId=String(target?.placeId||'').trim();
  if(p==='ROBLOX'&&/^[1-9][0-9]*$/.test(placeId)&&(target?.verified===true||target?.published===true||game?.robloxReleaseEvidence?.published===true))return `https://www.roblox.com/games/${placeId}`;
  return String(game?.homepagePlatformPath||game?.homepagePlatformUrl||game?.platformGamePath||game?.platformUrl||game?.platformGameUrl||game?.robloxGameUrl||game?.robloxUrl||game?.unityBuildUrl||game?.uefnUrl||'').trim();
}

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.reviews,.music,.opsBar,.catalogIntro,.tools,.filters,.sortRow,#heroDots{display:none!important}
.brandRow{justify-content:center!important}.brand{width:100%;justify-content:center}.brand img{object-position:center center!important}.companyLink{display:none!important}
#hero.homeFocus{width:96%;margin:0 auto 14px;min-height:220px;border-radius:20px;overflow:hidden;color:#fff;background:#102d42;box-shadow:0 10px 26px rgba(28,93,138,.16);position:relative;isolation:isolate}
#hero.homeFocus:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,20,31,.95),rgba(3,20,31,.68) 58%,rgba(3,20,31,.25)),var(--focus-bg) center/cover no-repeat;z-index:-1}.homeFocusInner{min-height:220px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start}.homeFocusInner h1{margin:4px 0 7px;font-size:32px;line-height:1.08}.homeFocusInner p{max-width:650px;margin:0 0 12px;font-size:13px;font-weight:800;line-height:1.5}.homeFocusMeta{display:flex;gap:6px;flex-wrap:wrap}.homeFocusMeta span{padding:5px 8px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff20;font-size:10px;font-weight:900}.homeFocusBtn{margin-top:12px;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:10px;background:#2b91e6;color:#fff;text-decoration:none;font-size:12px;font-weight:900}
#gameHub{padding:14px 0 3px}#gameHub>.sectionHead,#gameGrid{display:none!important}.homeGameShelf{margin:0 14px 14px}.gameShelfHead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:4px 2px 12px}.gameShelfHead h2{margin:0;font-size:25px;color:#155e9f}.gameShelfHead p{margin:3px 0 0;color:#5f7a8d;font-size:10px;font-weight:800}.gameShelfCount{padding:7px 10px;border-radius:999px;background:#102d42;color:#fff;font-size:10px;font-weight:1000}.gameShelfGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.foldGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10);position:relative}.releaseTag{position:absolute;z-index:5;right:10px;top:10px;min-width:74px;min-height:42px;padding:0 16px;border-radius:14px;background:#14845b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;font-weight:1000;box-shadow:0 5px 14px rgba(0,0,0,.22)}.foldGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}.foldGameArt img,.foldGameArt video{width:100%;height:100%;object-fit:cover}.foldGameArt video{display:block;background:#102d42}.foldGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}.foldGameTitle{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;color:#fff}.foldGameTitle b{font-size:20px}.foldGameBody{padding:12px}.foldBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.foldBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;font-size:9px;font-weight:900}.foldBadge.score{background:#d9f4e4;color:#197340}.foldBadge.platform{background:#e7efff;color:#315f9b}.foldBadge.genre{background:#fff0c9;color:#865d00}.foldBadge.play{background:#f0e8ff;color:#6842a8}.foldGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}.foldGameMeta{font-size:10px;line-height:1.6;color:#415f73;font-weight:850;padding:8px 9px;border-radius:9px;background:#eef7fd}.foldGameActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}.foldGameBtn{display:flex;align-items:center;justify-content:center;min-height:38px;border-radius:10px;text-decoration:none;font-size:9px;font-weight:900;background:#2488df;color:#fff}.foldGameBtn.secondary{background:#eef8ff;color:#1767a9;border:1px solid #afd7ef}.foldGameBtn.platformAction{background:#d71920;color:#fff;border:1px solid #a90f15}.foldGameBtn.off{background:#e8eef2;color:#7c8c96;pointer-events:none}@media(max-width:700px){
  #hero.homeFocus{width:calc(100% - 12px);margin-bottom:12px;min-height:260px;border-radius:16px}
  #hero.homeFocus:before{background:linear-gradient(0deg,rgba(3,20,31,.94) 0%,rgba(3,20,31,.70) 58%,rgba(3,20,31,.28) 100%),var(--focus-bg) center/cover no-repeat}
  .homeFocusInner{min-height:260px;padding:18px 16px 16px}
  .homeFocusInner h1{font-size:30px;line-height:1.08;margin-bottom:8px}
  .homeFocusInner p{font-size:14px;line-height:1.55;margin-bottom:11px}
  .homeFocusMeta{gap:7px}.homeFocusMeta span{min-height:27px;padding:5px 9px;font-size:10px;display:inline-flex;align-items:center}
  .homeFocusInner small{font-size:11px;line-height:1.45}
  .homeFocusBtn{width:100%;min-height:48px;margin-top:13px;font-size:14px;border-radius:12px;touch-action:manipulation}
  .homeGameShelf{margin:0 7px 12px}
  .gameShelfHead{align-items:center;padding:5px 2px 10px}.gameShelfHead h2{font-size:24px}.gameShelfHead p{font-size:11px;line-height:1.45}.gameShelfCount{font-size:11px;padding:7px 9px}
  .gameShelfGrid{grid-template-columns:1fr;gap:11px}
  .foldGameCard{border-radius:15px}
  .foldGameArt{height:185px}
  .foldGameTitle{left:13px;right:13px;bottom:11px}.foldGameTitle b{font-size:22px;line-height:1.1}
  
  .releaseTag{min-width:72px;min-height:38px;padding:0 13px;border-radius:12px;font-size:15px}
  .foldGameBody{padding:13px}
  .foldBadges{gap:6px;margin-bottom:9px}.foldBadge{min-height:27px;padding:0 9px;font-size:10px}
  .foldGameBody p{margin:8px 0 10px;font-size:13px;line-height:1.55}
  .foldGameMeta{padding:10px 11px;font-size:11px;line-height:1.6}
  .foldGameActions{gap:8px;margin-top:11px}
  .foldGameBtn{min-height:46px;padding:0 8px;font-size:11px;line-height:1.25;border-radius:11px;touch-action:manipulation}
}
@media(max-width:420px){
  .homeFocusInner h1{font-size:27px}
  .homeFocusInner p{font-size:13px}
  .gameShelfHead{align-items:flex-start}.gameShelfHead h2{font-size:22px}.gameShelfCount{flex:0 0 auto}
  .foldGameArt{height:170px}
  .foldGameActions{grid-template-columns:repeat(2,minmax(0,1fr))}
  .foldGameBtn.platformAction{grid-column:1/-1}
}
`;
  document.head.appendChild(style);
}
function buildFocus(catalog,status,mediaIndex){
  const hero=document.getElementById('hero');
  if(!hero)return;
  const seen=new Set();
  const rows=[...releaseRows(catalog,status),...webPublishedRows(catalog),...developmentRows(catalog,status)].filter(row=>{const id=gameIdOf(row);if(!id||seen.has(id))return false;seen.add(id);return true;});
  if(!rows.length)return;
  const row=rows[0],game=mergeGame(row,mediaIndex),released=String(runtimeInfo(row).productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',statusLabel=classState(row),score=scoreState(row),genre=genreState(row),play=playState(row),progress=progressState(row),web=game.webPath,updated=formatDate(updatedAt(row));
  const scoreMeta=score.label&&score.label!==statusLabel?`<span>${esc(score.label)}</span>`:'';
  hero.className='panel hero homeFocus';
  hero.style.setProperty('--focus-bg',`url('${String(game.image).replaceAll("'",'%27')}')`);
  hero.dataset.platform=normalizePlatform(selectedPlatform(game));
  hero.dataset.serverScore=String(score.score??'');
  hero.dataset.serverScoreSource=String(score.source||'');
  hero.dataset.serverProgressState=progress;
  hero.dataset.runtimeGameplayMedia=game.homepageRuntimeGameplayMedia?.motion?'verified-motion':game.homepageRuntimeGameplayMedia?.still?'verified-still':'static-cover';
  hero.dataset.runtimeMotionFocus=String(game.homepageRuntimeGameplayMedia?.motion?.motionFocus||'');
  hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1><p>${esc(game.description)}</p><div class="homeFocusMeta"><span>${esc(statusLabel)}</span>${scoreMeta}<span>${esc(platformLabel(selectedPlatform(game)))}</span><span>${esc(genre)}</span><span>${esc(play)}</span></div><small style="margin-top:9px">진행: ${esc(latestWork(row))} · ${esc(progress)}${updated?` · ${esc(updated)}`:''}</small>${web?`<a class="homeFocusBtn" href="${esc(web)}">웹게임 시작</a>`:''}</div>`;
}
function buildCard(row,mediaIndex){
  const game=mergeGame(row,mediaIndex),released=String(runtimeInfo(row).productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',statusLabel=classState(row),score=scoreState(row),genre=genreState(row),play=playState(row),progress=progressState(row),web=game.webPath,updated=formatDate(updatedAt(row)),artbook=game.homepageArtbookPath||'',platform=platformHref(game),p=normalizePlatform(selectedPlatform(game));
  const webBtn=web?`<a class="foldGameBtn" href="${esc(web)}">웹게임</a>`:'<span class="foldGameBtn off">웹게임</span>';
  const artbookBtn=artbook?`<a class="foldGameBtn secondary" href="${esc(artbook)}">아트북</a>`:'<span class="foldGameBtn off">아트북</span>';
  const platformBtn=platform?`<a class="foldGameBtn platformAction" href="${esc(platform)}">${p==='UNITY'?'Unity APK':p==='ROBLOX'?'Roblox':p==='FORTNITE_UEFN'?'Fortnite UEFN':'플랫폼게임'}</a>`:'<span class="foldGameBtn off">플랫폼게임</span>';
  const scoreBadge=score.label&&score.label!==statusLabel?`<span class="foldBadge score">${esc(score.label)}</span>`:'';
  const historicalRoblox=String(row?.homepageDisplayMode||'').toUpperCase()==='ROBLOX_HISTORICAL_DEPLOYMENT';
  const recordTag=historicalRoblox?'<span class="releaseTag">배포 기록</span>':released?'<span class="releaseTag">출시</span>':'';
  const mediaState=game.homepageRuntimeGameplayMedia?.motion?'verified-motion':game.homepageRuntimeGameplayMedia?.still?'verified-still':'static-cover';
  const mediaMarkup=gameplayMediaMarkup(game),motionFocus=String(game.homepageRuntimeGameplayMedia?.motion?.motionFocus||'');
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}" data-web-path="${esc(web)}" data-platform="${esc(p)}" data-runtime-gameplay-media="${mediaState}" data-runtime-motion-focus="${esc(motionFocus)}" data-server-score="${esc(score.score??'')}" data-server-score-current="${score.current?'true':'false'}" data-server-progress-state="${esc(progress)}" data-genre="${esc(genre)}" data-play-mode="${esc(play)}">${recordTag}<div class="foldGameArt">${mediaMarkup}<div class="foldGameTitle"><b>${esc(game.name)}</b></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge score">${esc(statusLabel)}</span>${scoreBadge}<span class="foldBadge platform">${esc(platformLabel(selectedPlatform(game)))}</span><span class="foldBadge genre">${esc(genre)}</span><span class="foldBadge play">${esc(play)}</span></div><p>${esc(game.description)}</p><div class="foldGameMeta">진행: ${esc(latestWork(row))}<br><span>${esc(progress)}${updated?` · ${esc(updated)}`:''}</span></div><div class="foldGameActions">${webBtn}${artbookBtn}${platformBtn}</div></div></article>`;
}
function buildShelf(hub,id,title,description,rows,mediaIndex){
  document.getElementById(id)?.remove();
  const wrapper=document.createElement('section');
  wrapper.id=id;
  wrapper.className='homeGameShelf';
  wrapper.innerHTML=`<div class="gameShelfHead"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="gameShelfCount">${rows.length}개</span></div><div class="gameShelfGrid">${rows.length?rows.map(row=>buildCard(row,mediaIndex)).join(''):'<div class="foldGameMeta">현재 표시 가능한 검증 게임이 없어.</div>'}</div>`;
  hub.insertBefore(wrapper,document.getElementById('gameGrid')||null);
}
function buildDevelopmentPipeline(catalog,status,testManifest={}){
  const section=document.getElementById('developmentPipeline');
  const lead=document.getElementById('pipelineLead');
  if(!section||!lead)return;
  const games=(Array.isArray(catalog?.games)?catalog.games:[]).filter(activeLifecycle);
  const webReady=games.filter(game=>game?.homepageWebPlayable===true&&String(game?.webPath||'').trim());
  const selected=games.filter(game=>normalizePlatform(selectedPlatform(game)));
  const development=games.filter(game=>productionClassOf(game)==='DEVELOPMENT_CONFIRMED');
  const released=games.filter(game=>productionClassOf(game)==='RELEASE_CONFIRMED');
  const validated=Array.isArray(testManifest?.candidates)?testManifest.candidates.filter(row=>Number(row?.strictScore??row?.reviewScore??row?.totalScore??row?.score)>=80):[];
  const focus=[...released,...development,...webReady].sort((a,b)=>classRank(a)-classRank(b)||catalogOrderCompare(a,b))[0]||null;
  const runnerCount=Number(status?.postReleaseFocusedDevelopment?.runningCount??status?.postReleaseFocusRunner?.runningCount??0);
  const runnerActive=Number.isFinite(runnerCount)&&runnerCount>0;
  if(focus){
    const platform=platformLabel(selectedPlatform(focus));
    lead.innerHTML=`<b>현재 진행 · ${esc(focus.name||gameIdOf(focus))}</b><br>${esc(classState(focus))} · ${esc(platform)} · ${esc(latestWork(focus))}`;
  }else{
    lead.innerHTML='<b>현재 진행 상태</b><br>중앙 runtime에서 표시 가능한 개발 프로젝트를 기다리는 중이야.';
  }
  const badges=section.querySelectorAll('.pipelineStep strong');
  const values=[
    `ACTIVE ${games.length}`,
    `WEB ${webReady.length}`,
    `PASS ${validated.length}`,
    `PLATFORM ${selected.length}`,
    runnerActive?`LIVE RUNNER ${runnerCount}`:`RELEASE ${released.length}`
  ];
  badges.forEach((node,index)=>{if(values[index])node.textContent=values[index]});
  section.dataset.runtimeAuthority=String(catalog?.runtimeInfoAuthority||catalog?.runtimeAuthority||'none');
  section.dataset.selectedPlatformCount=String(selected.length);
  section.dataset.releaseCount=String(released.length);
  section.dataset.focusRunnerActive=runnerActive?'true':'false';
}
function buildGameCenter(catalog,status,mediaIndex){
  const hub=document.getElementById('gameHub');
  if(!hub)return;
  const releases=releaseRows(catalog,status);
  const development=developmentRows(catalog,status);
  const webGames=webPublishedRows(catalog);
  const robloxDeployments=verifiedRobloxDeploymentRows(catalog);
  buildShelf(hub,'homeReleaseGameCenter','출시 게임','서버 검증 완료 · 공식 플랫폼 실행',releases,mediaIndex);
  buildShelf(hub,'homeRobloxDeploymentCenter','Roblox 배포 기록','인증된 Studio publication target이 있는 기존 배포작',robloxDeployments,mediaIndex);
  buildShelf(hub,'homeWebGameCenter','웹게임','홈페이지에서 바로 실행 가능한 제작 웹게임',webGames,mediaIndex);
  buildShelf(hub,'homeDevelopmentGameCenter','개발 진행','서버 DEVELOPMENT_CONFIRMED 최신 진행',development,mediaIndex);
  document.documentElement.dataset.homeReleaseCount=String(releases.length);
  document.documentElement.dataset.homeRobloxDeploymentCount=String(robloxDeployments.length);
  document.documentElement.dataset.homeWebGameCount=String(webGames.length);
  document.documentElement.dataset.homeDevelopmentCount=String(development.length);
  document.documentElement.dataset.homeServerAuthority=String(catalog?.runtimeInfoAuthority||catalog?.runtimeAuthority||'none');
  document.documentElement.dataset.homeSupportedPlatforms=(catalog?.runtimeSupportedPlatforms||[]).join(',');
  markDirectPlayCards();
  bindGameplayMotionVisibility();
}
function directPlayTarget(card){
  if(!card)return'';
  const explicit=String(card.dataset?.directPlay||card.dataset?.webPath||'').trim();
  if(explicit)return explicit;
  const webAnchor=[...card.querySelectorAll('a[href]')].find(a=>String(a.getAttribute('href')||'').includes('/web-games/'));
  return String(webAnchor?.getAttribute('href')||'').trim();
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
let gameplayMotionObserver=null;
function bindGameplayMotionVisibility(){
  const videos=[...document.querySelectorAll('video.foldGameMotion')];
  if(!('IntersectionObserver'in window)){videos.forEach(video=>video.play?.().catch(()=>{}));return;}
  if(gameplayMotionObserver)gameplayMotionObserver.disconnect();
  gameplayMotionObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      const video=entry.target;
      if(entry.isIntersecting&&entry.intersectionRatio>=.35)video.play?.().catch(()=>{});
      else video.pause?.();
    }
  },{threshold:[0,.35,1]});
  videos.forEach(video=>gameplayMotionObserver.observe(video));
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
function simplifyPage(){
  document.querySelector('.opsBar')?.remove();
  document.querySelector('.catalogIntro')?.remove();
  document.querySelector('.reviews')?.remove();
  document.getElementById('autonomousFocusStrip')?.remove();
  document.getElementById('homeDevelopmentGameCenter')?.remove();
}
async function refresh(){
  if(refreshInFlight)return;
  refreshInFlight=true;
  try{
    const [catalog,status,testManifest,mediaIndex]=await Promise.all([getJson('/game-catalog.json'),getJson('/company-status.json'),getJson('/test-game-candidates.json'),getJson('/homepage-runtime-media.json')]);
    if(catalog?.runtimeInfoAuthority!=='company-runtime'||status?.runtimeAuthority!=='company-runtime')return;
    const sig=JSON.stringify([catalog,status,testManifest,mediaIndex]);
    if(sig!==lastSignature){buildFocus(catalog,status,mediaIndex||{});buildDevelopmentPipeline(catalog,status,testManifest||{});buildGameCenter(catalog,status,mediaIndex||{});lastSignature=sig;}
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