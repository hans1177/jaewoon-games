// 파일명: assets/homepage-enhancements.js
// 역할: company-runtime 서버 원장을 기준으로 Unity / Roblox / Fortnite UEFN 게임정보를 자동 동기화해 홈페이지 TOP30에 표시한다.
const SYNC_INTERVAL_MS=5000;
const RAW_RUNTIME_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime';
const RAW_MAIN_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/main';
const TOP_LIMIT=30;
const MIN_DEVELOPMENT_SCORE_SCHEMA=13;
const SUPPORTED_PLATFORMS=['UNITY','ROBLOX','FORTNITE_UEFN'];
let refreshInFlight=false;
let lastSignature='';

const fetchJson=async urls=>{
  const stamp=Date.now();
  for(const url of urls){
    try{
      const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});
      if(r.ok)return await r.json();
    }catch{}
  }
  return null;
};
const getServerJson=path=>fetchJson([path,`${RAW_MAIN_BASE}${path}`]);
const getRuntimeJson=path=>fetchJson([`${RAW_RUNTIME_BASE}${path}`,path,`${RAW_MAIN_BASE}${path}`]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=value=>{if(!value)return'';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\. /g,'.').replace(/\.$/,'');};
const gameIdOf=row=>String(row?.id||row?.gameId||'').trim();
const normalizePlatform=value=>{const p=String(value??'').trim().toUpperCase().replace(/[\s-]+/g,'_');if(p==='ROBLOX')return'ROBLOX';if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(p))return'UNITY';if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(p))return'FORTNITE_UEFN';return'';};
const platformLabel=value=>{const p=normalizePlatform(value);if(p==='UNITY')return'Unity Android';if(p==='ROBLOX')return'Roblox';if(p==='FORTNITE_UEFN')return'Fortnite UEFN';return'플랫폼 선택 필요';};
const playModeLabel=value=>{const v=String(value??'').trim().toUpperCase();if(v==='SINGLE')return'싱글';if(v==='COOP')return'협동';if(v==='COMPETITIVE')return'경쟁';if(v==='HYBRID')return'혼합';return'플레이 방식 미평가';};
const bindingMatches=(current,initial)=>{const c=String(current??'').trim(),i=String(initial??'').trim();return !c||(!!i&&c===i);};
const reworkOrRevalidation=row=>[row?.canonicalState,row?.currentStep,row?.homepageTestVerdict,row?.formalImplementationVerdict,row?.resumeStage].some(value=>{const v=String(value??'').trim().toUpperCase();return v.includes('REWORK')||v.includes('REVALIDATION');});
const scoreStateFromQueue=row=>{
  if(!row)return{score:null,label:'점수 미평가',current:false,source:'SERVER_DEVELOPMENT_QUEUE'};
  if(reworkOrRevalidation(row))return{score:null,label:'재검증 필요',current:false,source:'SERVER_DEVELOPMENT_QUEUE'};
  const initialPassed=row.webInitialCyclePassed===true;
  const schema=Number(row.webInitialCycleValidationSchemaVersion);
  const musicPassed=row.webInitialCycleMusicValidationPassed===true;
  const sourceBound=bindingMatches(row.webSourceIndexSha256,row.webInitialCycleSourceIndexSha256);
  const baselineBound=bindingMatches(row.webDesignBaselineSha256,row.webInitialCycleDesignBaselineSha256);
  const raw=row.webInitialCycleStrictScore;
  const score=raw===null||raw===undefined||raw===''?NaN:Number(raw);
  if(!initialPassed||!Number.isFinite(schema)||schema<MIN_DEVELOPMENT_SCORE_SCHEMA||!musicPassed||!sourceBound||!baselineBound||!Number.isFinite(score)||score<0||score>100){
    const stale=initialPassed&&Number.isFinite(schema)&&schema>=MIN_DEVELOPMENT_SCORE_SCHEMA&&musicPassed&&(!sourceBound||!baselineBound);
    return{score:null,label:stale?'재검증 필요':'점수 미평가',current:false,source:'SERVER_DEVELOPMENT_QUEUE'};
  }
  return{score,label:`${score}점`,current:true,source:'SERVER_DEVELOPMENT_QUEUE'};
};
const workLabels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'웹 게임플레이·음악 검증',FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP:'승인 범위 웹 콘텐츠 확장',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 실행 후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 깊이 검증',IMMUTABLE_ARTIFACT_BIND:'빌드 결과물 고정',WEB_CONTENT_DEVELOPMENT_REWORK:'웹 콘텐츠 재작업'};
const latestWorkFrom=(base,queue)=>{const direct=String(queue?.homepageRecentWork||base?.homepageRecentWork||'').trim();if(direct)return direct;const raw=String(queue?.currentStep||queue?.resumeStage||queue?.executionEvidence?.failureStage||queue?.canonicalState||'').trim().toUpperCase();return workLabels[raw]||raw.replaceAll('_',' ')||'개발 작업 정보 없음';};
const latestById=(rows,idField)=>{const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const id=String(row?.[idField]||'').trim();if(!id)continue;const old=map.get(id);const t=Date.parse(row?.ROBLOX_GENRE_REVIEWED_AT||row?.updatedAt||row?.webValidationLastAttemptAt||row?.createdAt||row?.enqueuedAt||'')||0;const oldT=Date.parse(old?.ROBLOX_GENRE_REVIEWED_AT||old?.updatedAt||old?.webValidationLastAttemptAt||old?.createdAt||old?.enqueuedAt||'')||0;if(!old||t>=oldT)map.set(id,row);}return map;};

function composeCatalog(serverCatalog,runtimeCatalog,queueState,seedState){
  const canonicalGames=Array.isArray(runtimeCatalog?.games)?runtimeCatalog.games:[];
  const serverById=new Map((serverCatalog?.games||[]).map(row=>[gameIdOf(row),row]).filter(([id])=>id));
  const queueById=latestById(queueState?.items,'gameId');
  const seedById=latestById((seedState?.seeds||[]).filter(seed=>String(seed?.status||'').toUpperCase()==='ACTIVE'),'gameId');
  const games=[];
  for(const base of canonicalGames){
    const id=gameIdOf(base);if(!id)continue;
    const lifecycle=String(base?.lifecycleState||'ACTIVE').toUpperCase();
    if(!['ACTIVE','REBUILD'].includes(lifecycle))continue;
    const server=serverById.get(id)||{};
    const queue=queueById.get(id)||null;
    const seed=seedById.get(id)||null;
    const platform=normalizePlatform(server?.selectedPlatform||queue?.selectedPlatform||queue?.targetPlatform||seed?.selectedPlatform||seed?.INITIAL_TARGET_PLATFORM||base?.selectedPlatform||base?.productionTarget);
    const score=scoreStateFromQueue(queue);
    const robloxGenre=String(seed?.ROBLOX_GENRE_LABEL_KO||seed?.ROBLOX_GENRE||queue?.ROBLOX_GENRE_LABEL_KO||queue?.ROBLOX_GENRE||'').trim();
    const robloxSubgenre=String(seed?.ROBLOX_SUBGENRE_LABEL_KO||seed?.ROBLOX_SUBGENRE||queue?.ROBLOX_SUBGENRE_LABEL_KO||queue?.ROBLOX_SUBGENRE||'').trim();
    const baseGenres=Array.isArray(base?.genre)&&base.genre.length?base.genre:(Array.isArray(server?.genre)?server.genre:[]);
    const genreLabel=platform==='ROBLOX'&&robloxGenre?[robloxGenre,robloxSubgenre].filter(Boolean).join(' · '):(baseGenres.join(' · ')||'장르 미평가');
    const playMode=String(seed?.MULTIPLAYER_DESIGN_MODE||seed?.INITIAL_PLAY_MODE||queue?.ROBLOX_PLAY_MODE||queue?.playMode||'').trim().toUpperCase();
    const updatedAt=queue?.updatedAt||queue?.webValidationLastAttemptAt||seed?.ROBLOX_GENRE_REVIEWED_AT||seed?.updatedAt||base?.updatedAt||runtimeCatalog?.updatedAt||null;
    games.push({
      ...base,
      ...server,
      id,
      name:base?.name||server?.name||seed?.gameName||queue?.gameName||id,
      productionClass:String(base?.productionClass||server?.productionClass||queue?.productionClass||'DESIGN_ONLY').toUpperCase(),
      lifecycleState:lifecycle,
      selectedPlatform:platform||null,
      robloxPublicationTarget:queue?.robloxPublicationTarget||server?.robloxPublicationTarget||base?.robloxPublicationTarget||null,
      robloxReleaseEvidence:queue?.robloxReleaseEvidence||server?.robloxReleaseEvidence||base?.robloxReleaseEvidence||null,
      homepageInfo:{
        authority:'company-runtime',platform,platformLabel:platformLabel(platform),score:score.score,scoreLabel:score.label,scoreCurrent:score.current,scoreSource:score.source,
        genre:baseGenres,genreLabel,subgenre:platform==='ROBLOX'?robloxSubgenre:'',playMode,playModeLabel:playModeLabel(playMode),
        latestWork:latestWorkFrom(base,queue),updatedAt,status:String(queue?.canonicalState||queue?.status||seed?.status||lifecycle),productionClass:String(base?.productionClass||server?.productionClass||queue?.productionClass||'DESIGN_ONLY').toUpperCase()
      }
    });
  }
  return {...runtimeCatalog,runtimeAuthority:'company-runtime',runtimeInfoAuthority:'company-runtime',runtimeSupportedPlatforms:SUPPORTED_PLATFORMS,runtimeCounts:{...(serverCatalog?.runtimeCounts||{}),canonicalGames:games.length},games};
}

const runtimeInfo=row=>row?.homepageInfo&&typeof row.homepageInfo==='object'?row.homepageInfo:{};
const scoreState=row=>{const info=runtimeInfo(row);const score=info.score;return{score:score===null||score===undefined||score===''?null:Number(score),label:String(info.scoreLabel||'점수 미평가'),current:info.scoreCurrent===true,source:String(info.scoreSource||'SERVER_RUNTIME')};};
const genreState=row=>String(runtimeInfo(row).genreLabel||'장르 미평가').trim();
const playState=row=>String(runtimeInfo(row).playModeLabel||'플레이 방식 미평가').trim();
const latestWork=row=>String(runtimeInfo(row).latestWork||'개발 작업 정보 없음').trim();
const updatedAt=row=>runtimeInfo(row).updatedAt||row?.updatedAt||row?.webUpdatedAt||null;
const selectedPlatform=row=>runtimeInfo(row).platform||row?.selectedPlatform||row?.targetPlatform||row?.productionTarget||'';

function latestVerifiedUnityBuilds(status){
  const map=new Map();
  for(const build of Array.isArray(status?.testBuilds)?status.testBuilds:[]){
    const id=String(build?.gameId||'').trim(),download=String(build?.download||'').trim();
    const runtimePassed=build?.installAndLaunchVerified===true||build?.runtimeInstallLaunchVerified===true||String(build?.runtimeVerification||'').toLowerCase().endsWith('-passed');
    if(!id||!download||build?.status!=='ready'||build?.mobileReady!==true||build?.homepagePublished!==true||build?.signatureVerified!==true||!runtimePassed)continue;
    const old=map.get(id),t=Date.parse(build?.builtAt||build?.homepagePublishedAt||'')||0,oldT=Date.parse(old?.builtAt||old?.homepagePublishedAt||'')||0;
    if(!old||t>=oldT)map.set(id,build);
  }
  return map;
}
function bindVerifiedUnityBuild(row,status){if(normalizePlatform(selectedPlatform(row))!=='UNITY')return row;const build=latestVerifiedUnityBuilds(status).get(gameIdOf(row));return build?{...row,unityBuildUrl:build.download,unityBuildSha256:build.sha256,unityBuildApplicationId:build.applicationId,unityBuildVerified:true}:row;}
function homepageRows(catalog,status){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>['RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED'].includes(String(game?.productionClass||'').toUpperCase()))
    .map(game=>bindVerifiedUnityBuild(game,status))
    .sort((a,b)=>{const ar=String(a.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',br=String(b.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED';if(ar!==br)return ar?-1:1;const sa=scoreState(a).score,sb=scoreState(b).score;if(sa!==null||sb!==null){if(sa===null)return 1;if(sb===null)return-1;if(sb!==sa)return sb-sa;}return(Date.parse(updatedAt(b)||'')||0)-(Date.parse(updatedAt(a)||'')||0)||gameIdOf(a).localeCompare(gameIdOf(b));})
    .slice(0,TOP_LIMIT);
}
function mergeGame(row){const rawWeb=String(row?.webPath||row?.webSourcePath||row?.sourcePath||'').trim().replace(/^\/+|\/+$/g,'').replace(/\/index\.html$/i,'');return{...row,id:gameIdOf(row),name:row?.name||row?.gameName||gameIdOf(row),webPath:rawWeb?`/${rawWeb}/`:'',image:row?.image||'assets/pwa-icon-512.png',description:row?.description||'개발 중인 게임.'};}
function platformHref(game){const p=normalizePlatform(selectedPlatform(game)),target=game?.robloxPublicationTarget||game?.robloxReleaseEvidence||{},placeId=String(target?.placeId||'').trim();if(p==='ROBLOX'&&/^[1-9][0-9]*$/.test(placeId)&&(target?.verified===true||game?.robloxReleaseEvidence?.published===true))return`https://www.roblox.com/games/${placeId}`;return String(game?.homepagePlatformPath||game?.homepagePlatformUrl||game?.platformGamePath||game?.platformUrl||game?.platformGameUrl||game?.robloxGameUrl||game?.robloxUrl||game?.unityBuildUrl||game?.uefnUrl||'').trim();}

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');style.id='jaewoonEnhancementStyles';style.textContent=`
.reviews,.music,.opsBar,.catalogIntro,.tools,.filters,.sortRow,#heroDots{display:none!important}
.brandRow{justify-content:center!important}.brand{width:100%;justify-content:center}.brand img{object-position:center center!important}.companyLink{display:none!important}
#hero.homeFocus{width:96%;margin:0 auto 14px;min-height:220px;border-radius:20px;overflow:hidden;color:#fff;background:#102d42;box-shadow:0 10px 26px rgba(28,93,138,.16);position:relative;isolation:isolate}
#hero.homeFocus:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,20,31,.95),rgba(3,20,31,.68) 58%,rgba(3,20,31,.25)),var(--focus-bg) center/cover no-repeat;z-index:-1}.homeFocusInner{min-height:220px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start}.homeFocusInner h1{margin:4px 0 7px;font-size:32px;line-height:1.08}.homeFocusInner p{max-width:650px;margin:0 0 12px;font-size:13px;font-weight:800;line-height:1.5}.homeFocusMeta{display:flex;gap:6px;flex-wrap:wrap}.homeFocusMeta span{padding:5px 8px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff20;font-size:10px;font-weight:900}.homeFocusBtn{margin-top:12px;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:10px;background:#2b91e6;color:#fff;text-decoration:none;font-size:12px;font-weight:900}
#gameHub{padding:14px 0 3px}#gameHub>.sectionHead,#gameGrid{display:none!important}#homeTop30GameCenter{margin:0 14px 14px}.top30Head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:4px 2px 12px}.top30Head h2{margin:0;font-size:25px;color:#155e9f}.top30Head p{margin:3px 0 0;color:#5f7a8d;font-size:10px;font-weight:800}.top30Count{padding:7px 10px;border-radius:999px;background:#102d42;color:#fff;font-size:10px;font-weight:1000}.top30Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.foldGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10);position:relative}.top30Rank{position:absolute;z-index:4;left:9px;top:9px;min-width:34px;height:34px;padding:0 7px;border-radius:999px;background:#102d42;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:1000}.releaseTag{position:absolute;z-index:5;right:10px;top:10px;min-width:74px;min-height:42px;padding:0 16px;border-radius:14px;background:#14845b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;font-weight:1000;box-shadow:0 5px 14px rgba(0,0,0,.22)}.foldGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}.foldGameArt img{width:100%;height:100%;object-fit:cover}.foldGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}.foldGameTitle{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;color:#fff}.foldGameTitle b{font-size:20px}.foldGameBody{padding:12px}.foldBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.foldBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;font-size:9px;font-weight:900}.foldBadge.score{background:#d9f4e4;color:#197340}.foldBadge.platform{background:#e7efff;color:#315f9b}.foldBadge.genre{background:#fff0c9;color:#865d00}.foldBadge.play{background:#f0e8ff;color:#6842a8}.foldGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}.foldGameMeta{font-size:10px;line-height:1.6;color:#415f73;font-weight:850;padding:8px 9px;border-radius:9px;background:#eef7fd}.foldGameActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}.foldGameBtn{display:flex;align-items:center;justify-content:center;min-height:38px;border-radius:10px;text-decoration:none;font-size:9px;font-weight:900;background:#2488df;color:#fff}.foldGameBtn.secondary{background:#eef8ff;color:#1767a9;border:1px solid #afd7ef}.foldGameBtn.platformAction{background:#d71920;color:#fff;border:1px solid #a90f15}.foldGameBtn.off{background:#e8eef2;color:#7c8c96;pointer-events:none}@media(max-width:700px){.top30Grid{grid-template-columns:1fr}}
`;document.head.appendChild(style);
}
function buildFocus(catalog,status){const hero=document.getElementById('hero');if(!hero)return;const rows=homepageRows(catalog,status);if(!rows.length)return;const row=rows[0],game=mergeGame(row),released=String(row.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',score=scoreState(row),genre=genreState(row),play=playState(row),web=game.webPath,updated=formatDate(updatedAt(row));hero.className='panel hero homeFocus';hero.style.setProperty('--focus-bg',`url('${String(game.image).replaceAll("'",'%27')}')`);hero.dataset.platform=normalizePlatform(selectedPlatform(game));hero.dataset.serverScore=String(score.score??'');hero.dataset.serverScoreSource=score.source;hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1><p>${esc(game.description)}</p><div class="homeFocusMeta"><span>${esc(released?'출시':score.label)}</span><span>${esc(platformLabel(selectedPlatform(game)))}</span><span>${esc(genre)}</span><span>${esc(play)}</span></div><small style="margin-top:9px">${released?'최신 작업':'최신 개발'}: ${esc(latestWork(row))}${updated?` · ${esc(updated)}`:''}</small>${web?`<a class="homeFocusBtn" href="${esc(web)}">웹게임 시작</a>`:''}</div>`;}
function buildCard(row,rank){const game=mergeGame(row),released=String(row.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED',score=scoreState(row),genre=genreState(row),play=playState(row),web=game.webPath,updated=formatDate(updatedAt(row)),artbook=game.homepageArtbookPath||'',platform=platformHref(game),p=normalizePlatform(selectedPlatform(game));const webBtn=web?`<a class="foldGameBtn" href="${esc(web)}">웹게임</a>`:'<span class="foldGameBtn off">웹게임</span>';const artbookBtn=artbook?`<a class="foldGameBtn secondary" href="${esc(artbook)}">아트북</a>`:'<span class="foldGameBtn off">아트북</span>';const platformBtn=platform?`<a class="foldGameBtn platformAction" href="${esc(platform)}">${p==='UNITY'?'Unity APK':p==='ROBLOX'?'Roblox':p==='FORTNITE_UEFN'?'Fortnite UEFN':'플랫폼게임'}</a>`:'<span class="foldGameBtn off">플랫폼게임</span>';return `<article class="foldGameCard" data-game-id="${esc(game.id)}" data-platform="${esc(p)}" data-server-score="${esc(score.score??'')}" data-server-score-current="${score.current?'true':'false'}" data-genre="${esc(genre)}" data-play-mode="${esc(play)}"><span class="top30Rank">#${rank}</span>${released?'<span class="releaseTag">출시</span>':''}<div class="foldGameArt"><img src="${esc(game.image)}" alt="${esc(game.name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(game.name)}</b></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge score">${esc(released?'출시':score.label)}</span><span class="foldBadge platform">${esc(platformLabel(selectedPlatform(game)))}</span><span class="foldBadge genre">${esc(genre)}</span><span class="foldBadge play">${esc(play)}</span></div><p>${esc(game.description)}</p><div class="foldGameMeta">${released?'최신 작업':'최신 개발'}: ${esc(latestWork(row))}${updated?`<br><span>${esc(updated)}</span>`:''}</div><div class="foldGameActions">${webBtn}${artbookBtn}${platformBtn}</div></div></article>`;}
function buildGameCenter(catalog,status){const hub=document.getElementById('gameHub');if(!hub)return;document.getElementById('homeTop30GameCenter')?.remove();const rows=homepageRows(catalog,status),wrapper=document.createElement('section');wrapper.id='homeTop30GameCenter';wrapper.innerHTML=`<div class="top30Head"><div><h2>게임 TOP30</h2><p>company-runtime 서버 기준 자동 동기화 · Unity / Roblox / Fortnite UEFN</p></div><span class="top30Count">${rows.length} / ${TOP_LIMIT}</span></div><div class="top30Grid">${rows.map((row,i)=>buildCard(row,i+1)).join('')}</div>`;hub.insertBefore(wrapper,document.getElementById('gameGrid')||null);document.documentElement.dataset.homeTop30Count=String(rows.length);document.documentElement.dataset.homeServerAuthority='company-runtime';document.documentElement.dataset.homeSupportedPlatforms=SUPPORTED_PLATFORMS.join(',');}
function simplifyPage(){document.querySelector('.opsBar')?.remove();document.querySelector('.catalogIntro')?.remove();document.querySelector('.reviews')?.remove();document.getElementById('autonomousFocusStrip')?.remove();document.getElementById('homeDevelopmentGameCenter')?.remove();}
async function refresh(){if(refreshInFlight)return;refreshInFlight=true;try{const [serverCatalog,runtimeCatalog,queueState,seedState,status]=await Promise.all([getServerJson('/game-catalog.json'),getRuntimeJson('/game-catalog.json'),getRuntimeJson('/development-queue.json'),getRuntimeJson('/game-seed-state.json'),getServerJson('/company-status.json')]);const c=composeCatalog(serverCatalog||{games:[]},runtimeCatalog||serverCatalog||{games:[]},queueState||{items:[]},seedState||{seeds:[]}),s=status||{testBuilds:[]},sig=JSON.stringify([c,s]);if(sig!==lastSignature){buildFocus(c,s);buildGameCenter(c,s);lastSignature=sig;}document.documentElement.dataset.homeSyncAt=new Date().toISOString();}finally{refreshInFlight=false;}}
function main(){installStyles();simplifyPage();refresh();setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
