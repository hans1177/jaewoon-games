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
const marketingOf=row=>canonicalOf(row).marketing&&typeof canonicalOf(row).marketing==='object'?canonicalOf(row).marketing:{};
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
// 홈에 표시할 정식 게임은 실행 빌드 유무와 별개로 유지하고, 단순 버튼형 시제품만 제외한다.
// 파일명: assets/homepage-enhancements.js / 게임 표시
// 배포된 게임 카드는 개발 중·출시 상태와 무관하게 유지한다. 3D QA는 실행 링크 활성화만 제어한다.
const activeLifecycle=row=>{
  const id=gameIdOf(row);
  if(!id||!['ACTIVE','REBUILD'].includes(String(lifecycleOf(row).state||row?.lifecycleState||row?.runtimeStatus||'ACTIVE').toUpperCase()))return false;
  const sources=sourcesOf(row),web=sources.web||{};
  const state=String(web.state||row?.ownerWebSourceState||'').toUpperCase();
  if(state==='NON_GAME_SURFACE')return false;
  const root=String(web.path||row?.webPath||'').trim().split('/').filter(Boolean).join('/');
  const registered=root===`web-games/${id}`;
  const nativeDeployed=hasRunnableHomepageTarget(row)||hasInternalRelease(row);
  if(state==='WITHDRAWN_SIMPLE_PROTOTYPE'){
    const preserved=lifecycleOf(row).ownerExistingGame===true||row?.ownerExistingGame===true;
    const unity=String(sources.unity?.projectPath||row?.unityProjectPath||'').split('/').filter(Boolean).join('/');
    const roblox=String(sources.roblox?.projectPath||row?.robloxProjectPath||'').split('/').filter(Boolean).join('/');
    return nativeDeployed||(registered&&(preserved||unity===`unity-games/${id}`||roblox===`roblox-games/${id}`));
  }
  return registered||nativeDeployed;
};
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
  if(p?.internalReleaseReady===true&&p?.releaseReadiness?.homepageReady===true){
    return p.releaseReadiness.experience==='GAMEPLAY'?'출시 · 본게임 가능':'출시 · 로비 체험';
  }
  if(p?.historicalInternalRelease===true&&Boolean(p?.internalUrl))return'내부 배포 · 최신 검증중';
  return '개발 중';
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
    .filter(game=>activeLifecycle(game)&&['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(productionClassOf(game)))
    .map(game=>bindVerifiedUnityBuild(game,status))
    // 실행 빌드 검증은 버튼 활성화에만 적용한다. 정식 개발 게임 카드는 유지한다.
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
// 기존 HTML·JavaScript 게임은 원본 보관만 허용하고 홈페이지 링크로 승격하지 않는다.
function playableWebHref(row){
  return '';
}
// 실제 Unity C# WebGL 빌드와 3회 브라우저 검증, 네이티브 3D 및 저장 검증을 모두 확인한다.
async function bindAvailableUnityWebSurfaces(catalog){
  if(!Array.isArray(catalog?.games))return catalog;
  const enabled=platformExposure?.unityWebEnabled===true;
  const probeFetch=async(url,options={})=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{return await fetch(url,{...options,signal:controller.signal,cache:'no-store'});}
    finally{clearTimeout(timer);}
  };
  const candidates=enabled?catalog.games.filter(game=>{
    const id=gameIdOf(game);
    const unity=sourcesOf(game).unity||{};
    const projectPath=String(unity.projectPath||game?.unityProjectPath||game?.targetSourcePaths?.UNITY||'').replace(/^\/+|\/+$/g,'');
    // 배포된 게임은 Unity Web 빌드가 나중에 추가되어도 등록된 게임 ID로 찾는다.
    // QA와 3D 검증은 아래의 실제 링크 활성화 조건에 그대로 적용한다.
    return /^[a-z0-9][a-z0-9-]*$/.test(id)
      &&(projectPath===`unity-games/${id}`||(activeLifecycle(game)&&canonicalWebHref(game)===`/web-games/${id}/`));
  }):[];
  const available=new Map();
  await Promise.all(candidates.map(async game=>{
    const id=gameIdOf(game),stamp=Date.now();
    for(const href of [`/web-games/${id}/unity/`,`/web-games/${id}/`]){
      try{
        const [indexResponse,manifestResponse]=await Promise.all([
          probeFetch(`${href}index.html?ts=${stamp}`),
          probeFetch(`${href}unity-web-deploy-manifest.json?ts=${stamp}`)
        ]);
        if(!indexResponse.ok||!manifestResponse.ok)continue;
        const [html,manifest]=await Promise.all([indexResponse.text(),manifestResponse.json()]);
        if(!/createUnityInstance\s*\(/.test(html)||!/\.loader\.js/.test(html))continue;
        const hex64=/^[a-f0-9]{64}$/,hex40=/^[a-f0-9]{40}$/;
        if(manifest?.engine!=='UNITY_WEB'||manifest.gameId!==id||manifest.bundleComplete!==true||
           manifest.homepageVerified!==true||manifest.requiredDimension!=='3D'||
           manifest.canonicalSourceRoot!==`unity-games/${id}`||
           !hex64.test(String(manifest.unitySourceTreeSha256||''))||
           !hex64.test(String(manifest.buildTreeSha256||''))||
           !hex40.test(String(manifest.sourceCommit||'')))continue;
        const groups=manifest.requiredGroups||{};
        if(!['loader','data','framework','wasm'].every(key=>Array.isArray(groups[key])&&groups[key].length>0))continue;
        const refs=['loader','data','framework','wasm'].flatMap(key=>groups[key]);
        if(!refs.every(ref=>typeof ref==='string'&&/^Build\/[a-zA-Z0-9_.-]+$/.test(ref)))continue;
        const files=['unity-web-build.json','upper-platform-development-readiness.json',
          'unity-web-gameplay-validation.json','unity-web-independent-qa.json','unity-web-regression.json'];
        const responses=await Promise.all(files.map(file=>probeFetch(`${href}${file}?ts=${stamp}`).catch(()=>null)));
        if(!responses.every(response=>response?.ok===true))continue;
        const [build,readiness,...qa]=await Promise.all(responses.map(response=>response.json()));
        const actual3d=e=>e?.spatialGameplay?.pass===true
          &&e.spatialGameplay.requiredDimension==='3D'
          &&e.spatialGameplay.source==='UNITY_RUNTIME_MESH_FILTER_TRIANGLE_AND_3AXIS_WORLD_DEPTH_PROOF'
          &&e.spatialGameplay.perspectiveCamera===true&&e.spatialGameplay.depthPass===true
          &&Number(e.spatialGameplay.observedMeshCount)>0&&Number(e.spatialGameplay.observedTriangles)>0
          &&Number(e.spatialGameplay.worldMeshes3d)>=2&&Number(e.spatialGameplay.worldDepthCm)>=50
          &&Number(e.spatialGameplay.gameplayActors3d)>=1&&e.spatialGameplay.spriteGameplayActors===0
          &&e.visualQa?.nativeUnityMesh?.pass===true
          &&e.visualQa.nativeUnityMesh.measurementState==='UNITY_RUNTIME_MESH_INSPECTION';
        const qaPassed=e=>e?.engine==='UNITY_WEB'&&e.gameId===id&&e.pass===true
          &&e.playableBrowserTest===true&&e.boot?.pass===true&&e.input?.pass===true
          &&e.gameplay?.pass===true&&e.coreFun?.pass===true&&e.saveRestore?.pass===true
          &&e.mobile?.pass===true&&e.mobile?.actualBrowserTouchDispatched===true
          &&e.mobile?.realGameTouchHandlerObserved===true
          &&e.performance?.pass===true&&e.noCriticalRuntimeError===true&&actual3d(e);
        if(build?.gameId!==id||build.canonicalSourceRoot!==`unity-games/${id}`
           ||build.unitySourceTreeSha256!==manifest.unitySourceTreeSha256
           ||build.buildTreeSha256!==manifest.buildTreeSha256||build.sourceCommit!==manifest.sourceCommit
           ||build.bootSmoke!=='PASS'||build.actualBrowserPlay!=='PASS'
           ||build.independentQa!=='PASS'||build.regression!=='PASS'||build.upperPlatformGateCandidate!==true)continue;
        if(readiness?.gameId!==id||readiness.pass!==true||readiness.state!=='UPPER_PLATFORM_DEVELOPMENT_READY'
           ||readiness.sourceCommit!==manifest.sourceCommit
           ||readiness.unitySourceTreeSha256!==manifest.unitySourceTreeSha256
           ||readiness.buildTreeSha256!==manifest.buildTreeSha256
           ||readiness.criteria?.graphics?.native3dVerified!==true
           ||readiness.criteria?.qa?.pass!==true||readiness.criteria?.qa?.multiplayerPass!==true)continue;
        if(!qa.every(qaPassed))continue;
        const probes=await Promise.all(refs.map(ref=>
          probeFetch(`${href}${ref}?ts=${stamp}`,{method:'HEAD'}).catch(()=>null)
        ));
        const complete=probes.every(response=>response?.ok===true);
        if(complete){available.set(id,href);break;}
      }catch{}
    }
  }));
  return {...catalog,games:catalog.games.map(game=>available.has(gameIdOf(game))
    ?{...game,unityWebTestUrl:available.get(gameIdOf(game)),unityWebAvailable:true}
    :{...game,unityWebTestUrl:null,unityWebAvailable:false})};
}
function webPublishedRows(catalog){
  return (Array.isArray(catalog?.games)?catalog.games:[])
    .filter(game=>activeLifecycle(game)&&game.unityWebAvailable===true&&Boolean(game.unityWebTestUrl))
    .map(game=>({...game,webPath:game.unityWebTestUrl,homepageDisplayMode:'WEB_PUBLISHED'}))
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
function mediaImageHref(asset){return asset?.src?`${asset.src}?v=${String(asset.sha256||'').slice(0,12)}`:'';}
function mergeGame(row){
  const displayMode=String(row?.homepageDisplayMode||'').trim();
  const identity=identityOf(row),web=sourcesOf(row).web||{};
  const media=marketingOf(row).homepageMedia;
  const webPath=row?.unityWebAvailable===true?String(row.unityWebTestUrl||''):'';
  return {...row,id:gameIdOf(row),homepageMedia:media,name:media?.titleEn||identity.name||row?.name||gameIdOf(row),subtitle:media?.titleKo||'',webPath,image:mediaImageHref(media?.cover)||marketingOf(row).thumbnail||identity.image||row?.marketingThumbnail||row?.image||'assets/pwa-icon-512.png',description:identity.description||row?.description||'개발 중인 게임.'};
}
function platformLinks(game){
  const exposure=exposureOf(gameIdOf(game));
  const platform=id=>(exposure?.platforms||[]).find(p=>normalizePlatform(p?.platform)===id)||{};
  const rp=platform('ROBLOX'),up=platform('UNITY');
  const roblox=String((rp.publicRelease===true?rp.publicUrl:rp.internalUrl)||'').trim();
  const unity=String((game?.unityBuildVerified===true?game?.unityBuildUrl:'')||(up.publicRelease===true?up.publicUrl:up.internalUrl)||'').trim();
  const unityWeb=platformExposure?.unityWebEnabled===true&&game?.unityWebAvailable===true?String(game?.unityWebTestUrl||'').trim():'';
  const web=playableWebHref(game);
  return {roblox,unity,unityWeb,web};
}
function internalReleaseLinks(game){
  const links=platformLinks(game);
  const exposure=exposureOf(gameIdOf(game));
  const state=id=>(exposure?.platforms||[]).find(p=>normalizePlatform(p?.platform)===id)||{};
  const roblox=state('ROBLOX'),unity=state('UNITY');
  return {
    roblox:roblox.executionAvailable===true||(roblox.internalReleaseReady===true&&roblox.releaseReadiness?.homepageReady===true)||roblox.historicalInternalRelease===true?links.roblox:'',
    unity:unity.executionAvailable===true||(unity.internalReleaseReady===true&&unity.releaseReadiness?.homepageReady===true)||game?.unityBuildVerified===true?links.unity:'',
    unityWeb:platformExposure?.unityWebEnabled===true?links.unityWeb:'',
    web:links.web
  };
}
function hasRunnableHomepageTarget(game){
  // 검증된 실제 실행 링크만 활성화한다. 카드 목록 필터로 사용하지 않는다.
  const links=internalReleaseLinks(game);
  return Boolean(links.unityWeb||links.roblox||links.unity);
}
function hasInternalRelease(game){
  const exposure=exposureOf(gameIdOf(game));
  return (exposure?.platforms||[]).some(p=>{
    if(!['ROBLOX','UNITY'].includes(normalizePlatform(p?.platform))||!Boolean(p.internalUrl||p.publicUrl))return false;
    if(p?.internalReleaseReady===true&&p?.releaseReadiness?.homepageReady===true)return true;
    return normalizePlatform(p?.platform)==='ROBLOX'&&p?.historicalInternalRelease===true;
  });
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
  return links.unityWeb||links.roblox||links.unity||'';
}
function installStyles(){
  document.documentElement.dataset.homeVisualMode='SAMPLE_FRONT_DOOR_V1';
  if(document.getElementById('homepageEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='homepageEnhancementStyles';
  style.textContent=`
.homeGameShelf{scroll-margin-top:18px}
.homeGameSubtitle{font-size:14px;line-height:1.5;font-weight:600;margin:4px 0 10px}.homeFocus .homeGameSubtitle{font-size:20px}.foldGameArt{aspect-ratio:16/9;height:auto}.foldGameArt img{width:100%;height:100%;object-fit:cover}.homeGameplayVideo{margin:10px 0}.homeGameplayVideo summary{cursor:pointer;min-height:40px;display:flex;align-items:center;font-size:13px}.homeGameplayVideo video{display:block;width:100%;max-height:320px;background:#111;object-fit:contain}
.shelfEmpty{padding:18px 4px;color:#65758a;font-size:13px;line-height:1.7}.foldGameCard{overflow:hidden}
.foldGameBtn{min-height:46px;display:flex;align-items:center;justify-content:center}
.foldGameCompletion{margin-top:8px;font-size:11px;line-height:1.6;color:#526477;overflow-wrap:anywhere}
.foldGameCompletion summary{cursor:pointer;min-height:36px;display:flex;align-items:center}
.foldGameCompletion a{display:inline-flex;min-height:36px;align-items:center;color:#1264c4}
.foldGameCompletion ol{margin:4px 0;padding-left:20px}
@media(max-width:700px){.gameShelfGrid{grid-template-columns:1fr}.homeFocusBtn{width:100%;min-height:48px}}
@media(max-width:420px){.foldGameActions{grid-template-columns:repeat(2,minmax(0,1fr))}.foldGameBtn.platformAction{grid-column:1/-1}}
`;
  document.head.appendChild(style);
}
function buildFocus(catalog,status){
  const hero=document.getElementById('hero');
  if(!hero)return;
  const allRows=[...internalReleaseRows(catalog,status),...developmentRows(catalog,status)];
  const seen=new Set();
  const rows=allRows.filter(row=>{const id=gameIdOf(row);if(!id||seen.has(id))return false;seen.add(id);return true;});
  const row=rows.find(item=>gameIdOf(item)===FEATURED_GAME_ID)||rows[0];
  if(!row)return;
  const game=mergeGame(row),links=internalReleaseLinks(game);
  const direct=links.unityWeb||links.roblox||links.unity||'';
  const actionLabel=links.unityWeb?'Unity Web 플레이':links.roblox?'Roblox 플레이':links.unity?'Unity 앱 플레이':'게임 보기';
  hero.className='hero homeFocus';
  hero.style.setProperty('--focus-bg',`url('${String(game.image).replaceAll("'","%27")}')`);
  hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1>${game.subtitle?`<div class="homeGameSubtitle">${esc(game.subtitle)}</div>`:''}<p>${esc(game.description)}</p>${direct?`<a class="homeFocusBtn" href="${esc(direct)}">${esc(actionLabel)}</a>`:'<a class="homeFocusBtn" href="#gameHub">게임 보기</a>'}</div>`;
}
function buildCard(row){
  const game=mergeGame(row),links=internalReleaseLinks(game),exposure=exposureOf(gameIdOf(game));
  const state=platform=>{const p=(exposure?.platforms||[]).find(x=>normalizePlatform(x.platform)===platform);const label=platformReleaseLabel(p);return label==='개발 중'&&links[platform==='ROBLOX'?'roblox':'unity']?'개발 중 · 실행 가능':label;};
  const button=(href,label,offLabel,extra='')=>href?`<a class="foldGameBtn ${extra}" href="${esc(href)}">${label}</a>`:`<span class="foldGameBtn off">${offLabel}</span>`;
  const actions=[
    button(links.roblox,`Roblox · ${state('ROBLOX')}`,`Roblox · ${state('ROBLOX')}`,'platformAction robloxAction'),
    button(links.unity,`Unity 앱 · ${state('UNITY')}`,`Unity 앱 · ${state('UNITY')}`,'platformAction unityAction'),
    platformExposure?.unityWebEnabled===true
      ?button(links.unityWeb,'Unity Web · 개발중','Unity Web · 빌드없음','webAction unityWebAction')
      :'',
    // 일반 HTML 게임 링크는 홈페이지에 표시하지 않는다.
    ''
  ].join('');
  const meta=links.unityWeb?'Unity WebGL · 3D·브라우저·모바일·저장 검증 통과':hasInternalRelease(game)?'출시 게임 · Unity Web 실행 검증 대기':'개발 중 · Unity Web 실행 검증 대기';
  const completions=(exposure?.platforms||[]).map(p=>{
    const label=p.platform==='ROBLOX'?'로블록스':p.platform==='UNITY'?'유니티':esc(p.platform);
    const history=p.completion;
    if(!history)return `<div>${label} · 완주 기록 확인 중</div>`;
    const count=Number.isSafeInteger(history.count)&&history.count>=0?history.count:0;
    const date=history.lastCompletedAt?new Date(history.lastCompletedAt):null;
    const last=date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date):'';
    const records=(history.records||[]).filter(r=>/^https:\/\/github\.com\/hans1177\/jaewoon-games\/actions\/runs\/[1-9][0-9]*$/.test(String(r.evidenceUrl||'')));
    const title=`${label} · 완주 ${count}회${last?' · '+last:''}`;
    if(!count)return `<div>${title} · 검증된 배포 기록 없음</div>`;
    return `<details><summary>${esc(title)}</summary><small>보존된 최종 검증·배포 기록 기준. 현재 수리 상태와 별개야. 최근 ${records.length}건 · 한국 시간</small><ol>${records.map(r=>`<li><a href="${esc(r.evidenceUrl)}" target="_blank" rel="noopener noreferrer">${esc(formatDate(r.completedAt))} · 증거 보기</a></li>`).join('')}</ol></details>`;
  }).join('');
  const direct=links.unityWeb||links.roblox||links.unity||'';
  const media=game.homepageMedia;
  const video=hasInternalRelease(game)&&media?.video?.runtimeVerification?.pass===true&&/^assets\/homepage-media\/[a-z0-9-]+\.mp4$/.test(media.video.src||'')?media.video:null;
  const videoMarkup=video?`<details class="homeGameplayVideo"><summary>실제 플레이 · ${esc(video.platform==='WEB'?'웹':video.platform==='UNITY_WEB'?'Unity Web':'Unity 앱')}</summary><video controls playsinline preload="none" data-src="/${esc(video.src)}?v=${esc(video.sha256.slice(0,12))}" poster="${esc(mediaImageHref(media.small))}" aria-label="${esc(game.subtitle||game.name)} 실제 플레이"></video></details>`:'';
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}" data-direct-play="${esc(direct)}"><div class="foldGameArt"><img src="${esc(mediaImageHref(media?.small)||game.image)}" alt="${esc(game.name+(game.subtitle?' · '+game.subtitle:''))}" width="480" height="270" loading="lazy" decoding="async"></div><div class="foldGameBody"><h3>${esc(game.name)}</h3>${game.subtitle?`<div class="homeGameSubtitle">${esc(game.subtitle)}</div>`:''}<p>${esc(game.description)}</p>${videoMarkup}<div class="foldGameMeta">${esc(meta)}</div><div class="foldGameCompletion">${completions}</div><div class="foldGameActions">${actions}</div></div></article>`;
}
function buildShelf(hub,id,title,description,rows){
  document.getElementById(id)?.remove();
  const wrapper=document.createElement('section');
  wrapper.id=id;
  wrapper.className='homeGameShelf';
  wrapper.setAttribute('aria-label',title);
  wrapper.innerHTML=`<div class="gameShelfHead"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="gameShelfCount">${rows.length}개</span></div><div class="gameShelfGrid">${rows.length?rows.map(row=>buildCard(row)).join(''):`<div class="shelfEmpty">${id==='homePlatformAvailableGameCenter'?'출시 기준을 확인한 게임이 아직 없어.':'개발 중인 게임 정보가 없어.'}</div>`}</div>`;
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
  for(const id of ['homeInternalReleaseFallback','homeReleaseGameCenter','homeRobloxDeploymentCenter','homeWebGameCenter','homePlatformAvailableGameCenter','homeDevelopmentGameCenter'])document.getElementById(id)?.remove();
  const available=internalReleaseRows(catalog,status);
  const availableIds=new Set(available.map(gameIdOf));
  const development=developmentRows(catalog,status).filter(game=>!availableIds.has(gameIdOf(game)));
  buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임','입장 가능한 게임 · 로비 체험 또는 본게임 가능',available);
  buildShelf(hub,'homeDevelopmentGameCenter','개발 중','설계·로비 구현과 검증이 진행 중인 게임',development);
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
  document.addEventListener('toggle',event=>{
    const details=event.target;
    if(!details.matches?.('.homeGameplayVideo'))return;
    const video=details.querySelector('video');
    if(!video)return;
    if(details.open&&!video.src){video.src=video.dataset.src;video.load();}
    if(!details.open){video.pause();refresh();}
  },true);
  document.addEventListener('click',event=>{
    const interactive=event.target.closest('a,button,input,select,textarea,label,details,summary,video');
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
    const renderCatalog=currentCatalog=>{
      const sig=JSON.stringify([currentCatalog,status,testManifest,portfolioStatus,platformExposure]);
      if(sig===lastSignature)return;
      // Keep the user's open player intact while background status snapshots change.
      if(document.querySelector('.homeGameplayVideo[open]'))return;
      updateLiveSummary(currentCatalog,status);
      buildFocus(currentCatalog,status);
      buildGameCenter(currentCatalog,status);
      buildRecentUpdates(currentCatalog);
      lastSignature=sig;
    };
    document.documentElement.dataset.homeSyncAt=new Date().toISOString();
    document.documentElement.dataset.homeProgressAuthority='company-runtime';
    // 첫 로딩에서만 카드를 즉시 표시한다. 이후 갱신은 검증된 빌드 상태와 함께 반영해 모바일 카드가 흔들리지 않게 한다.
    if(!lastSignature)renderCatalog(catalog);
    const boundCatalog=await bindAvailableUnityWebSurfaces(catalog);
    renderCatalog(boundCatalog);
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
