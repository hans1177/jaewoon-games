// 파일명: assets/homepage-enhancements.js
// 역할: 서버 런타임의 canonical 게임정보를 그대로 받아 홈페이지 TOP30에 표시한다.
const SYNC_INTERVAL_MS=5000;
const TOP_LIMIT=30;
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
const gameIdOf=row=>String(row?.id||row?.gameId||'').trim();
const runtimeInfo=row=>row?.homepageInfo&&typeof row.homepageInfo==='object'?row.homepageInfo:{};
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
const selectedPlatform=row=>runtimeInfo(row).platform||'';
const activeLifecycle=row=>['ACTIVE','REBUILD'].includes(String(row?.lifecycleState||row?.runtimeStatus||'ACTIVE').toUpperCase());
const classState=row=>{const mode=String(row?.homepageDisplayMode||'').toUpperCase();if(mode==='ROBLOX_HISTORICAL_DEPLOYMENT')return'Roblox 배포 기록';if(mode==='WEB_PUBLISHED')return'웹게임';const cls=String(runtimeInfo(row).productionClass||'DESIGN_ONLY').toUpperCase();if(cls==='RELEASE_CONFIRMED')return'출시';if(cls==='DEVELOPMENT_CONFIRMED')return'개발확정';return'설계';};
const productionClassOf=row=>String(runtimeInfo(row).productionClass||row?.productionClass||'DESIGN_ONLY').toUpperCase();
const displayEligible=row=>['RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED'].includes(productionClassOf(row));
const catalogMap=catalog=>new Map((Array.isArray(catalog?.games)?catalog.games:[]).map(game=>[gameIdOf(game),game]));

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
    .sort((a,b)=>(Date.parse(updatedAt(b)||'')||0)-(Date.parse(updatedAt(a)||'')||0)||gameIdOf(a).localeCompare(gameIdOf(b)));
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
      return (Date.parse(updatedAt(b)||'')||0)-(Date.parse(updatedAt(a)||'')||0)||gameIdOf(a).localeCompare(gameIdOf(b));
    });
}
function webPublishedRows(catalog){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>activeLifecycle(game)&&game?.homepageWebPlayable===true&&game?.hasWebArchive===true&&String(game?.webPath||'').trim())
    .map(game=>({...game,homepageDisplayMode:'WEB_PUBLISHED'}))
    .sort((a,b)=>(Date.parse(updatedAt(b)||'')||0)-(Date.parse(updatedAt(a)||'')||0)||gameIdOf(a).localeCompare(gameIdOf(b)));
}
function verifiedRobloxDeploymentRows(catalog){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>{
      if(!activeLifecycle(game)||normalizePlatform(selectedPlatform(game))!=='ROBLOX')return false;
      const target=game?.robloxPublicationTarget||{};
      const evidence=game?.robloxReleaseEvidence||{};
      const placeId=String(target?.placeId||'').trim();
      return /^[1-9][0-9]*$/.test(placeId)&&target?.verified===true&&target?.historical===true&&evidence?.historicalPublicationTargetVerified===true;
    })
    .map(game=>({...game,homepageDisplayMode:'ROBLOX_HISTORICAL_DEPLOYMENT'}))
    .sort((a,b)=>(Date.parse(a?.robloxPublicationTarget?.observedAt||'')||0)-(Date.parse(b?.robloxPublicationTarget?.observedAt||'')||0));
}
function homepageRows(catalog,status,testManifest={}){
  const byId=catalogMap(catalog);
  const rows=Array.isArray(testManifest?.candidates)?testManifest.candidates:[];
  return rows.map(candidate=>{
    const id=gameIdOf(candidate),base=byId.get(id)||{};
    const strictScore=Number(candidate?.strictScore??candidate?.reviewScore??candidate?.totalScore??candidate?.score);
    const homepageInfo={
      ...(base.homepageInfo||{}),
      productionClass:'DEVELOPMENT_CONFIRMED',
      score:Number.isFinite(strictScore)?strictScore:(base.homepageInfo?.score??null),
      scoreLabel:Number.isFinite(strictScore)?`${strictScore}점`:(base.homepageInfo?.scoreLabel||'점수 미평가'),
      scoreCurrent:true,
      scoreSource:'TOP30_STRICT_IMPLEMENTATION_SCORE',
      updatedAt:candidate?.validatedAt||candidate?.updatedAt||base.homepageInfo?.updatedAt||null
    };
    return bindVerifiedUnityBuild({
      ...base,
      ...candidate,
      id,
      name:candidate?.name||base.name||id,
      webPath:candidate?.webPath||candidate?.testUrl||base.webPath||'',
      homepageWebPlayable:true,
      homepageInfo
    },status);
  }).filter(row=>activeLifecycle(row)&&String(row.webPath||'').trim()).slice(0,TOP_LIMIT);
}
function mergeGame(row){
  const displayMode=String(row?.homepageDisplayMode||'').trim();
  const allowWeb=row?.homepageWebPlayable===true&&(displayEligible(row)||displayMode==='WEB_PUBLISHED'||displayMode==='ROBLOX_HISTORICAL_DEPLOYMENT');
  const rawWeb=allowWeb?String(row?.webPath||'').trim().replace(/^\/+|\/+$/g,'').replace(/\/index\.html$/i,''):'';
  return {...row,id:gameIdOf(row),name:row?.name||gameIdOf(row),webPath:rawWeb?`/${rawWeb}/`:'',image:row?.image||'assets/pwa-icon-512.png',description:row?.description||'개발 중인 게임.'};
}
function platformHref(game){
  const p=normalizePlatform(selectedPlatform(game));
  const target=game?.robloxPublicationTarget||game?.robloxReleaseEvidence||{};
  const placeId=String(target?.placeId||'').trim();
  if(p==='ROBLOX'&&/^[1-9][0-9]*$/.test(placeId)&&(target?.verified===true||game?.robloxReleaseEvidence?.published===true))return `https://www.roblox.com/games/${placeId}`;
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
#gameHub{padding:14px 0 3px}#gameHub>.sectionHead,#gameGrid{display:none!important}#homeTop30GameCenter{margin:0 14px 14px}.top30Head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:4px 2px 12px}.top30Head h2{margin:0;font-size:25px;color:#155e9f}.top30Head p{margin:3px 0 0;color:#5f7a8d;font-size:10px;font-weight:800}.top30Count{padding:7px 10px;border-radius:999px;background:#102d42;color:#fff;font-size:10px;font-weight:1000}.top30Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.foldGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10);position:relative}.top30Rank{position:absolute;z-index:4;left:9px;top:9px;min-width:34px;height:34px;padding:0 7px;border-radius:999px;background:#102d42;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:1000}.releaseTag{position:absolute;z-index:5;right:10px;top:10px;min-width:74px;min-height:42px;padding:0 16px;border-radius:14px;background:#14845b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;font-weight:1000;box-shadow:0 5px 14px rgba(0,0,0,.22)}.foldGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}.foldGameArt img{width:100%;height:100%;object-fit:cover}.foldGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}.foldGameTitle{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;color:#fff}.foldGameTitle b{font-size:20px}.foldGameBody{padding:12px}.foldBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.foldBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;font-size:9px;font-weight:900}.foldBadge.score{background:#d9f4e4;color:#197340}.foldBadge.platform{background:#e7efff;color:#315f9b}.foldBadge.genre{background:#fff0c9;color:#865d00}.foldBadge.play{background:#f0e8ff;color:#6842a8}.foldGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}.foldGameMeta{font-size:10px;line-height:1.6;color:#415f73;font-weight:850;padding:8px 9px;border-radius:9px;background:#eef7fd}.foldGameActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}.foldGameBtn{display:flex;align-items:center;justify-content:center;min-height:38px;border-radius:10px;text-decoration:none;font-size:9px;font-weight:900;background:#2488df;color:#fff}.foldGameBtn.secondary{background:#eef8ff;color:#1767a9;border:1px solid #afd7ef}.foldGameBtn.platformAction{background:#d71920;color:#fff;border:1px solid #a90f15}.foldGameBtn.off{background:#e8eef2;color:#7c8c96;pointer-events:none}@media(max-width:700px){.top30Grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(style);
}
function buildFocus(catalog,status,testManifest={}){
  const hero=document.getElementById('hero');
  if(!hero)return;
  const rows=[...releaseRows(catalog,status),...homepageRows(catalog,status,testManifest),...developmentRows(catalog,status)];
  if(!rows.length)return;
  const row=rows[0],game=mergeGame(row),released=String(runtimeInfo(row).productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',statusLabel=classState(row),score=scoreState(row),genre=genreState(row),play=playState(row),progress=progressState(row),web=game.webPath,updated=formatDate(updatedAt(row));
  const scoreMeta=score.label&&score.label!==statusLabel?`<span>${esc(score.label)}</span>`:'';
  hero.className='panel hero homeFocus';
  hero.style.setProperty('--focus-bg',`url('${String(game.image).replaceAll("'",'%27')}')`);
  hero.dataset.platform=normalizePlatform(selectedPlatform(game));
  hero.dataset.serverScore=String(score.score??'');
  hero.dataset.serverScoreSource=String(score.source||'');
  hero.dataset.serverProgressState=progress;
  hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1><p>${esc(game.description)}</p><div class="homeFocusMeta"><span>${esc(statusLabel)}</span>${scoreMeta}<span>${esc(platformLabel(selectedPlatform(game)))}</span><span>${esc(genre)}</span><span>${esc(play)}</span></div><small style="margin-top:9px">진행: ${esc(latestWork(row))} · ${esc(progress)}${updated?` · ${esc(updated)}`:''}</small>${web?`<a class="homeFocusBtn" href="${esc(web)}">웹게임 시작</a>`:''}</div>`;
}
function buildCard(row,rank){
  const game=mergeGame(row),released=String(runtimeInfo(row).productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',statusLabel=classState(row),score=scoreState(row),genre=genreState(row),play=playState(row),progress=progressState(row),web=game.webPath,updated=formatDate(updatedAt(row)),artbook=game.homepageArtbookPath||'',platform=platformHref(game),p=normalizePlatform(selectedPlatform(game));
  const webBtn=web?`<a class="foldGameBtn" href="${esc(web)}">웹게임</a>`:'<span class="foldGameBtn off">웹게임</span>';
  const artbookBtn=artbook?`<a class="foldGameBtn secondary" href="${esc(artbook)}">아트북</a>`:'<span class="foldGameBtn off">아트북</span>';
  const platformBtn=platform?`<a class="foldGameBtn platformAction" href="${esc(platform)}">${p==='UNITY'?'Unity APK':p==='ROBLOX'?'Roblox':p==='FORTNITE_UEFN'?'Fortnite UEFN':'플랫폼게임'}</a>`:'<span class="foldGameBtn off">플랫폼게임</span>';
  const scoreBadge=score.label&&score.label!==statusLabel?`<span class="foldBadge score">${esc(score.label)}</span>`:'';
  const historicalRoblox=String(row?.homepageDisplayMode||'').toUpperCase()==='ROBLOX_HISTORICAL_DEPLOYMENT';
  const recordTag=historicalRoblox?'<span class="releaseTag">배포 기록</span>':released?'<span class="releaseTag">출시</span>':'';
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}" data-platform="${esc(p)}" data-server-score="${esc(score.score??'')}" data-server-score-current="${score.current?'true':'false'}" data-server-progress-state="${esc(progress)}" data-genre="${esc(genre)}" data-play-mode="${esc(play)}">${rank?`<span class="top30Rank">#${rank}</span>`:''}${recordTag}<div class="foldGameArt"><img src="${esc(game.image)}" alt="${esc(game.name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(game.name)}</b></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge score">${esc(statusLabel)}</span>${scoreBadge}<span class="foldBadge platform">${esc(platformLabel(selectedPlatform(game)))}</span><span class="foldBadge genre">${esc(genre)}</span><span class="foldBadge play">${esc(play)}</span></div><p>${esc(game.description)}</p><div class="foldGameMeta">진행: ${esc(latestWork(row))}<br><span>${esc(progress)}${updated?` · ${esc(updated)}`:''}</span></div><div class="foldGameActions">${webBtn}${artbookBtn}${platformBtn}</div></div></article>`;
}
function buildShelf(hub,id,title,description,rows,{ranked=false}={}){
  document.getElementById(id)?.remove();
  const wrapper=document.createElement('section');
  wrapper.id=id;
  wrapper.innerHTML=`<div class="top30Head"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="top30Count">${rows.length}${ranked?` / ${TOP_LIMIT}`:'개'}</span></div><div class="top30Grid">${rows.length?rows.map((row,i)=>buildCard(row,ranked?i+1:'')).join(''):'<div class="foldGameMeta">현재 표시 가능한 검증 게임이 없어.</div>'}</div>`;
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
  const focus=[...released,...development,...webReady].sort((a,b)=>(Date.parse(updatedAt(b)||'')||0)-(Date.parse(updatedAt(a)||'')||0))[0]||null;
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
function buildGameCenter(catalog,status,testManifest={}){
  const hub=document.getElementById('gameHub');
  if(!hub)return;
  const releases=releaseRows(catalog,status);
  const top30=homepageRows(catalog,status,testManifest);
  const development=developmentRows(catalog,status);
  const webGames=webPublishedRows(catalog);
  const robloxDeployments=verifiedRobloxDeploymentRows(catalog);
  buildShelf(hub,'homeReleaseGameCenter','출시 게임','서버 검증 완료 · 공식 플랫폼 실행',releases);
  buildShelf(hub,'homeRobloxDeploymentCenter','Roblox 배포 기록','인증된 Studio publication target이 있는 기존 배포작',robloxDeployments);
  buildShelf(hub,'homeWebGameCenter','웹게임','홈페이지에서 바로 실행 가능한 제작 웹게임',webGames);
  buildShelf(hub,'homeTop30GameCenter','게임 TOP30','검증 점수 80+ · 실제 플레이 가능한 웹게임',top30,{ranked:true});
  buildShelf(hub,'homeDevelopmentGameCenter','개발 진행','서버 DEVELOPMENT_CONFIRMED 최신 진행',development);
  document.documentElement.dataset.homeReleaseCount=String(releases.length);
  document.documentElement.dataset.homeRobloxDeploymentCount=String(robloxDeployments.length);
  document.documentElement.dataset.homeWebGameCount=String(webGames.length);
  document.documentElement.dataset.homeTop30Count=String(top30.length);
  document.documentElement.dataset.homeDevelopmentCount=String(development.length);
  document.documentElement.dataset.homeServerAuthority=String(catalog?.runtimeInfoAuthority||catalog?.runtimeAuthority||'none');
  document.documentElement.dataset.homeSupportedPlatforms=(catalog?.runtimeSupportedPlatforms||[]).join(',');
  markDirectPlayCards();
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
    const [catalog,status,testManifest]=await Promise.all([getJson('/game-catalog.json'),getJson('/company-status.json'),getJson('/test-game-candidates.json')]);
    if(catalog?.runtimeInfoAuthority!=='company-runtime'||status?.runtimeAuthority!=='company-runtime')return;
    const sig=JSON.stringify([catalog,status,testManifest]);
    if(sig!==lastSignature){buildFocus(catalog,status,testManifest||{});buildDevelopmentPipeline(catalog,status,testManifest||{});buildGameCenter(catalog,status,testManifest||{});lastSignature=sig;}
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