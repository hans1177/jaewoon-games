// 파일명: assets/homepage-enhancements.js
// 역할: 서버 런타임의 canonical 게임정보를 받아 검증된 웹게임 전체와 제작 상태를 홈페이지에 표시한다.
const SYNC_INTERVAL_MS=30000;
const FEATURED_GAME_ID='daechung-rpg';
let refreshInFlight=false;
let lastSignature='';
let portfolioStatus={games:[],counts:{}};
let platformExposure={games:[]};
let publishedWebRoutes=new Set();


const getJson=async path=>{
  try{
    const r=await fetch(path,{cache:'default',signal:AbortSignal.timeout(10000)});
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
  if(['WEB','GENERAL_WEB','HTML_JS_WEBGL'].includes(p))return'WEB';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(p))return'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(p))return'FORTNITE_UEFN';
  return'';
};
const platformLabel=value=>{
  const p=normalizePlatform(value);
  if(p==='UNITY')return'Unity Android';
  if(p==='WEB')return'웹';
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
// 집중 개발 3개와 노출 범위는 별개다. 명시적으로 개발 제외된 게임만 숨긴다.
const activeLifecycle=row=>{
  const id=gameIdOf(row);
  if(row?.ownerDevelopmentStopped===true||['OWNER_STOPPED','STOPPED'].includes(String(lifecycleOf(row).state||row?.lifecycleState||'').toUpperCase()))return false;
  if(runtimeInfo(row).developmentActive!==true)return false;
  if(!id||!['ACTIVE','REBUILD'].includes(String(lifecycleOf(row).state||row?.lifecycleState||row?.runtimeStatus||'ACTIVE').toUpperCase()))return false;
  const sources=sourcesOf(row),web=sources.web||{};
  const state=String(web.state||row?.ownerWebSourceState||'').toUpperCase();
  if(state==='NON_GAME_SURFACE')return false;
  // 웹 개발이 영구 철회된 게임은 네이티브 배포 실행 증거가 없으면 노출하지 않는다.
  if(state==='PERMANENTLY_REMOVED_REJECTED_TEST')return hasRunnableHomepageTarget(row)||hasInternalRelease(row);
  const cls=String(productionOf(row).class||row?.productionClass||'').toUpperCase();
  if(['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(cls))return true;
  const root=String(web.path||row?.webPath||'').trim().split('/').filter(Boolean).join('/');
  const registered=root===`web-games/${id}`||root===`web-games/${id}/unity`;
  const nativeDeployed=hasRunnableHomepageTarget(row)||hasInternalRelease(row);
  // 파일이나 원본 프로젝트가 있다는 이유로 버튼형 시제품을 게임으로 홍보하지 않는다.
  // 실제 실행 가능한 네이티브 배포만 웹 시제품 철회 상태와 별개로 유지한다.
  if(state==='WITHDRAWN_SIMPLE_PROTOTYPE'||state==='ENTRY_MISSING_OR_INVALID')return nativeDeployed;
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
    // 카드는 원본 카탈로그 순서를 유지한다. 게임 점수·플랫폼 빌드 여부는 노출 순서를 바꾸지 않는다.
    .sort((a,b)=>catalogOrderOf(a)-catalogOrderOf(b));
}
// 개발 중 게임은 유지하되 철회·삭제·누락된 웹 실행 링크는 제공하지 않는다.
function sourceWebHref(row){
  const id=gameIdOf(row);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(id))return '';
  const source=sourcesOf(row).web||{};
  const state=String(source.state||row?.ownerWebSourceState||'').toUpperCase();
  if(['NON_GAME_SURFACE','ENTRY_MISSING_OR_INVALID','WITHDRAWN_SIMPLE_PROTOTYPE','PERMANENTLY_REMOVED_REJECTED_TEST'].includes(state)||source.archive===false)return '';
  const root=String(source.path||row?.webPath||'').trim().split('/').filter(Boolean).join('/');
  if(root!==`web-games/${id}`&&root!==`web-games/${id}/unity`)return '';
  if(!publishedWebRoutes.has(root+'/'))return '';
  return `https://hans1177.github.io/jaewoon-games/${root}/`;
}
// 웹 플레이 표시는 기존 게시 증거를 유지하지만 원본 링크 활성화의 조건은 아니다.
function playableWebHref(row){
  const id=gameIdOf(row);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(id))return '';
  const source=sourcesOf(row).web||{};
  const state=String(source.state||row?.ownerWebSourceState||'').toUpperCase();
  if(['NON_GAME_SURFACE','ENTRY_MISSING_OR_INVALID','WITHDRAWN_SIMPLE_PROTOTYPE','PERMANENTLY_REMOVED_REJECTED_TEST'].includes(state)||source.archive===false)return '';
  const root=String(source.path||row?.webPath||'').trim().split('/').filter(Boolean).join('/');
  if(root!==`web-games/${id}`&&root!==`web-games/${id}/unity`)return '';
  if(!publishedWebRoutes.has(root+'/'))return '';
  const published=publicationOf(row).web||{};
  if(published.route!==`web-games/${id}/`
    ||!/^[a-f0-9]{40}$/.test(String(published.sourceTreeSha||'')))return '';
  return `https://hans1177.github.io/jaewoon-games/${root}/`;
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
// 메인: 게임 이름과 저용량 원본 이미지를 맞게 표시한다.
function mergeGame(row){
  const identity=identityOf(row),id=gameIdOf(row);
  const media=marketingOf(row).homepageMedia;
  const webPath=String(sourcesOf(row).web?.path||row?.webPath||'').trim();
  const canonicalThumbnail=String(marketingOf(row).thumbnail||identity.image||'').trim();
  // 로블록스 본서버 원본 썸네일은 어떤 해상도 대체도 하지 않는다.
  const sharedRobloxThumbnail=/^assets\/roblox-thumbnails\/[a-z0-9-]+\.(svg|png|jpe?g)$/i.test(canonicalThumbnail);
  const small=mediaImageHref(media?.small),cover=mediaImageHref(media?.cover);
  // 실제 존재하는 예전 타이틀 로고만 재활용한다. 없는 원본을 앱 로고로 속이지 않는다.
  const originalTitleArt={
    'bug-defense':'assets/title-insect-defense.svg',
    'egg-heist':'assets/title-egg-heist.svg',
    'human-go':'assets/title-human-go.svg',
    'island-village':'assets/title-island-village.svg',
    'survival2':'assets/title-survival2.svg'
  }[id]||'';
  const generic=/^assets\/(?:pwa-icon-(?:192|512)\.png|mock\.webp|page-bg(?:-v\d+)?\.webp|card-rpg(?:-v\d+)?\.webp|portal\.webp)$/i;
  const raw=canonicalThumbnail||String(row?.marketingThumbnail||row?.image||'').trim();
  const actual=generic.test(raw)?'':raw;
  const originalLogo=!sharedRobloxThumbnail&&!small&&generic.test(raw)&&Boolean(originalTitleArt);
  const serverTitle=marketingOf(row).robloxThumbnail||row.robloxThumbnail;
  const titleArt=marketingOf(row).robloxTitleArtwork||row.robloxTitleArtwork;
  const publication=publicationOf(row).roblox||row.robloxPublicationTarget||{};
  const serverUrl=String(serverTitle?.src||'');
  const serverImage=serverTitle?.verified===true&&serverTitle?.source==='ROBLOX_OFFICIAL_THUMBNAIL_API'&&serverTitle?.gameId===id
    &&(!(publication.universeId||row.robloxPublicationTarget?.universeId)||String(serverTitle.universeId)===String(publication.universeId||row.robloxPublicationTarget?.universeId))
    &&(!(publication.placeId||row.robloxPublicationTarget?.placeId)||String(serverTitle.placeId)===String(publication.placeId||row.robloxPublicationTarget?.placeId))
    &&/^https:\/\/(?:[a-z0-9-]+\.)*rbxcdn\.com\//i.test(serverUrl)?serverUrl:'';
  const generatedArt=titleArt?.gameId===id&&['ROBLOX_BLOCK_AVATAR_V1','ROBLOX_LIBRARY_TITLE_ARTWORK'].includes(titleArt?.style)
    &&(titleArt?.src===`assets/homepage-covers/${id}-roblox.svg`||new RegExp('^assets/homepage-covers/'+id+'\\.(webp|png|jpe?g)$','i').test(titleArt?.src||''))?mediaImageHref(titleArt):'';
  const compactArt=titleArt?.small?.src===`assets/homepage-covers/${id}-480.webp`?mediaImageHref(titleArt.small):'';
  const image=serverImage||(generatedArt&&(compactArt||generatedArt))||(sharedRobloxThumbnail?canonicalThumbnail:(small||(originalLogo?originalTitleArt:actual)));
  const heroImage=serverImage||generatedArt||(sharedRobloxThumbnail?canonicalThumbnail:(cover||image));
  const name=identity.name||row?.name||media?.titleKo||media?.titleEn||id;
  const enTitle=String(media?.titleEn||'').trim();
  const subtitle=enTitle&&enTitle.toLocaleLowerCase()!==String(name).toLocaleLowerCase()?enTitle:'';
  return {...row,id,homepageMedia:media,name,subtitle,webPath,image,heroImage,
    originalLogo:!serverImage&&!generatedArt&&originalLogo,missingImage:!image,sharedRobloxThumbnail,serverTitleImage:Boolean(serverImage),generatedTitleArtwork:Boolean(generatedArt),
    description:identity.description||row?.description||'개발 중인 게임.'};
}
function platformLinks(game){
  const exposure=exposureOf(gameIdOf(game));
  const platform=id=>(exposure?.platforms||[]).find(p=>normalizePlatform(p?.platform)===id)||{};
  const rp=platform('ROBLOX'),up=platform('UNITY');
  const candidate=String((rp.publicRelease===true?rp.publicUrl:rp.internalUrl)||'').trim();
  const placeId=String(rp.placeId||'').trim();
  // 검증된 Roblox Place ID와 링크가 일치할 때만 표시한다.
  const roblox=/^[1-9][0-9]*$/.test(placeId)&&new RegExp('^https://www\\.roblox\\.com/games/'+placeId+'(?:/|\\?|$)').test(candidate)?candidate:'';
  const unity=String((game?.unityBuildVerified===true?game?.unityBuildUrl:'')||(up.publicRelease===true?up.publicUrl:up.internalUrl)||'').trim();
  const web=playableWebHref(game);
  const webSource=sourceWebHref(game);
  return {roblox,unity,web,webSource};
}
function internalReleaseLinks(game){
  const links=platformLinks(game);
  const exposure=exposureOf(gameIdOf(game));
  const state=id=>(exposure?.platforms||[]).find(p=>normalizePlatform(p?.platform)===id)||{};
  const roblox=state('ROBLOX'),unity=state('UNITY');
  return {
    roblox:roblox.executionAvailable===true||(roblox.internalReleaseReady===true&&roblox.releaseReadiness?.homepageReady===true)||roblox.historicalInternalRelease===true?links.roblox:'',
    unity:unity.executionAvailable===true||(unity.internalReleaseReady===true&&unity.releaseReadiness?.homepageReady===true)||game?.unityBuildVerified===true?links.unity:'',
    web:links.web,
    webSource:links.webSource
  };
}
function hasRunnableHomepageTarget(game){
  // 검증된 실제 실행 링크만 활성화한다. 카드 목록 필터로 사용하지 않는다.
  const links=internalReleaseLinks(game);
  return Boolean(links.web||links.roblox||links.unity);
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
  return links.roblox||links.web||links.unity||links.webSource||'';
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
.foldGameBtn.robloxAction:not(.off){grid-column:1/-1;min-height:50px;font-size:13px;font-weight:900;background:#192c40;color:#fff}.foldGameUrl{padding:9px 0 3px;font-size:11px;line-height:1.5;overflow-wrap:anywhere}.foldGameUrl span{display:block;color:#53677a}.foldGameUrl a{display:inline-flex;align-items:center;min-height:32px;color:#125fbd;font-size:11px;font-weight:800;text-decoration:underline;text-underline-offset:3px;word-break:break-all}.foldGameCard{content-visibility:auto;contain-intrinsic-size:auto 420px}.homeGameGallery{height:100%;width:100%;position:relative}.homeGalleryTrack{display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;touch-action:pan-x;overscroll-behavior-x:contain;height:100%}.homeGalleryTrack::-webkit-scrollbar{display:none}.homeGallerySlide{flex:0 0 100%;scroll-snap-align:start;aspect-ratio:16/9;margin:0;position:relative}.homeGallerySlide img{display:block;width:100%;height:100%;object-fit:cover}.homeGallerySlide img.homeOriginalTitleLogo{object-fit:contain;padding:9% 7%;background:#20384f}
.homeTitlePending{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:28px 18px 44px;background:#1c2c3d;color:#eef3fb;text-align:center}
.homeTitlePending strong{font-size:clamp(17px,2vw,23px);line-height:1.3;overflow-wrap:anywhere}
.homeTitlePending small{color:#b7c4d0;font-size:11px}
.homeGallerySlide figcaption{position:absolute;bottom:0;left:0;right:0;padding:18px 12px 9px;background:linear-gradient(transparent,rgba(0,0,0,.68));color:#fff;font-size:11px;pointer-events:none}.homeGalleryControls{position:absolute;right:9px;bottom:10px;z-index:2;display:flex;align-items:center;gap:5px;padding:2px 6px;background:rgba(0,0,0,.72);border-radius:24px;color:#fff;font-size:11px}.homeGalleryControls button{border:0;background:transparent;color:#fff;min-width:32px;min-height:32px;font-size:18px;cursor:pointer}.homeGalleryControls button:focus-visible{outline:2px solid #fff;outline-offset:2px}.homeGalleryControls span{min-width:30px;text-align:center;font-variant-numeric:tabular-nums}
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
  const direct=links.web||links.roblox||links.unity||links.webSource||'';
  const actionLabel=links.web?'일반 웹게임 플레이':links.roblox?'Roblox 플레이':links.unity?'Unity 앱 플레이':links.webSource?'원본 게임 링크 열기':'게임 보기';
  hero.className='hero homeFocus';
  hero.style.setProperty('--focus-bg',`url('${String(game.heroImage||'assets/page-bg-v4.webp').replaceAll("'","%27")}')`);
  hero.innerHTML=`<div class="homeFocusInner"><h1>${esc(game.name)}</h1>${game.subtitle?`<div class="homeGameSubtitle">${esc(game.subtitle)}</div>`:''}<p>${esc(game.description)}</p>${direct?`<a class="homeFocusBtn" href="${esc(direct)}">${esc(actionLabel)}</a>`:'<a class="homeFocusBtn" href="#gameHub">게임 보기</a>'}</div>`;
}
function buildCard(row){
  const game=mergeGame(row),links=internalReleaseLinks(game),exposure=exposureOf(gameIdOf(game));
  const state=platform=>{const p=(exposure?.platforms||[]).find(x=>normalizePlatform(x.platform)===platform);const label=platformReleaseLabel(p);return label==='개발 중'&&links[platform==='ROBLOX'?'roblox':'unity']?'개발 중 · 실행 가능':label;};
  const button=(href,label,offLabel,extra='')=>href?`<a class="foldGameBtn ${extra}" href="${esc(href)}">${label}</a>`:`<span class="foldGameBtn off">${offLabel}</span>`;
  const robloxState=(exposure?.platforms||[]).find(p=>normalizePlatform(p.platform)==='ROBLOX')||{};
  const robloxLabel=robloxState.publicRelease===true?'외부 공개':robloxState.internalReleaseReady===true&&robloxState.releaseReadiness?.homepageReady===true?'로비 실행 검증':'과거 배포 기록 · 현재 접근 확인 중';
  const actions=[
    // 실제 배포 링크를 카드의 첫 번째 큰 버튼으로 표시한다.
    button(links.roblox,links.roblox?'Roblox에서 게임 열기':`Roblox · ${state('ROBLOX')}`,`Roblox · ${state('ROBLOX')}`,'platformAction robloxAction'),
    (links.web||links.webSource)?button(links.web||links.webSource,links.web?'일반 웹게임 · 플레이':'원본 게임 · 열기','','platformAction webAction'):'',
    // 검증된 Unity 설치 기능 보존.
    links.unity?button(links.unity,`Unity 앱 · ${state('UNITY')}`,`Unity 앱 · ${state('UNITY')}`,'platformAction unityAction'):''
  ].join('');
  const robloxUrl=links.roblox?`<div class="foldGameUrl"><span>Roblox 배포 링크 · ${esc(robloxLabel)}</span><a href="${esc(links.roblox)}" target="_blank" rel="noopener noreferrer">${esc(links.roblox.replace('https://www.',''))}</a></div>`:'';
  const meta=links.roblox?`Roblox · ${robloxLabel}`:links.web?'웹게임 · 실행 링크 확인됨':links.webSource?'원본 링크 연결됨 · 배포 미확인':'개발 중 · 실행 링크 준비 중';
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
  const direct=links.web||links.roblox||links.unity||links.webSource||'';
  const media=game.homepageMedia;
  const video=hasInternalRelease(game)&&media?.video?.runtimeVerification?.pass===true&&/^assets\/homepage-media\/[a-z0-9-]+\.mp4$/.test(media.video.src||'')?media.video:null;
  const videoMarkup=video?`<details class="homeGameplayVideo"><summary>실제 플레이 · ${esc(video.platform==='WEB'?'웹':video.platform==='UNITY_WEB'?'Unity Web':'Unity 앱')}</summary><video controls playsinline preload="none" data-src="/${esc(video.src)}?v=${esc(video.sha256.slice(0,12))}" poster="${esc(mediaImageHref(media.small))}" aria-label="${esc(game.subtitle||game.name)} 실제 플레이"></video></details>`:'';
  // 대표 썸네일과 실제 플레이 동영상에서 검증된 장면을 슬라이드로 묶는다.
  const shots=Array.isArray(media?.screenshots)?media.screenshots:[];
  const firstCaption=game.serverTitleImage?'로블록스 서버 타이틀 이미지':game.generatedTitleArtwork?'게임 타이틀 아트':game.sharedRobloxThumbnail?'로블록스 동일 썸네일':game.originalLogo?'기존 게임 타이틀 로고':game.missingImage?'대표 이미지 준비 중':'게임 대표 이미지';
  const firstArt=game.missingImage
    ? `<div class="homeTitlePending" role="img" aria-label="${esc(game.name)} · 대표 이미지 준비 중"><strong>${esc(game.name)}</strong><small>게임별 원본 이미지 확인 중</small></div>`
    : `<img class="${game.originalLogo?'homeOriginalTitleLogo':''}" src="${esc(game.image)}" alt="${esc(game.name)} · ${esc(firstCaption)}" width="1920" height="1080" loading="lazy" decoding="async">`;
  const slides=[
    `<figure class="homeGallerySlide">${firstArt}<figcaption>${esc(firstCaption)}</figcaption></figure>`,
    ...shots.map((shot,index)=>`<figure class="homeGallerySlide"><img src="/${esc(shot.src)}?v=${esc(shot.sha256.slice(0,12))}" alt="${esc(game.name)} · 실제 플레이 화면 ${index+1}" width="1920" height="1080" loading="lazy" decoding="async"><figcaption>${shot.platform==='UNITY_WEB'?'Unity Web 실제 플레이':'웹게임 실제 플레이'} · ${index+1}</figcaption></figure>`)
  ];
  const controls=shots.length?`<div class="homeGalleryControls"><button type="button" data-gallery-step="-1" aria-label="이전 게임 사진">‹</button><span data-gallery-count>1/${slides.length}</span><button type="button" data-gallery-step="1" aria-label="다음 게임 사진">›</button></div>`:'';
  const gallery=`<div class="homeGameGallery" data-gallery-game="${esc(game.id)}"><div class="homeGalleryTrack" role="region" tabindex="0" aria-label="${esc(game.name)} 게임 사진 슬라이드">${slides.join('')}</div>${controls}</div>`;
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}" data-direct-play="${esc(direct)}"><div class="foldGameArt">${gallery}</div><div class="foldGameBody"><h3>${esc(game.name)}</h3>${game.subtitle?`<div class="homeGameSubtitle">${esc(game.subtitle)}</div>`:''}<p>${esc(game.description)}</p>${videoMarkup}<div class="foldGameMeta">${esc(meta)}</div>${robloxUrl}<div class="foldGameCompletion">${completions}</div><div class="foldGameActions">${actions}</div></div></article>`;
}
function buildShelf(hub,id,title,description,rows){
  const wrapper=document.getElementById(id)||document.createElement('section');
  wrapper.id=id;
  wrapper.className='homeGameShelf';
  wrapper.setAttribute('aria-label',title);
  const markup=`<div class="gameShelfHead"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="gameShelfCount">${rows.length}개</span></div><div class="gameShelfGrid">${rows.length?rows.map(row=>buildCard(row)).join(''):`<div class="shelfEmpty">${id==='homePlatformAvailableGameCenter'?'출시 기준을 확인한 게임이 아직 없어.':'개발 중인 게임 정보가 없어.'}</div>`}</div>`;
  if(wrapper._homeMarkup!==markup){
    const scrollLeft=wrapper.querySelector('.gameShelfGrid')?.scrollLeft||0;
    wrapper.innerHTML=markup;
    wrapper._homeMarkup=markup;
    const grid=wrapper.querySelector('.gameShelfGrid');
    if(grid)grid.scrollLeft=scrollLeft;
  }
  if(!wrapper.parentNode)hub.appendChild(wrapper);
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
  for(const id of ['homeInternalReleaseFallback','homeReleaseGameCenter','homeRobloxDeploymentCenter','homeWebGameCenter'])document.getElementById(id)?.remove();
  // 오너 격리 게임은 개발·배포·과거 타이틀 카드에 자동 재노출하지 않는다.
  const stopped=new Set(catalog?.ownerStoppedGameIds||[]);
  const available=internalReleaseRows(catalog,status).filter(game=>!stopped.has(gameIdOf(game)));
  const availableIds=new Set(available.map(gameIdOf));
  const development=developmentRows(catalog,status).filter(game=>!stopped.has(gameIdOf(game))&&!availableIds.has(gameIdOf(game)));
  buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임','Roblox 배포 링크 우선 · 과거 배포는 현재 접근 확인 중',available);
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
  document.addEventListener('scroll',event=>{
    const track=event.target?.closest?.('.homeGalleryTrack');
    if(!track)return;
    const total=track.querySelectorAll('.homeGallerySlide').length;
    const index=Math.max(0,Math.min(total-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
    const counter=track.parentElement?.querySelector('[data-gallery-count]');
    if(counter)counter.textContent=(index+1)+'/'+total;
  },true);
  document.addEventListener('click',event=>{
    const control=event.target.closest('button[data-gallery-step]');
    if(control){
      const gallery=control.closest('.homeGameGallery'),track=gallery?.querySelector('.homeGalleryTrack');
      if(track){
        const width=Math.max(1,track.clientWidth),total=track.querySelectorAll('.homeGallerySlide').length;
        const index=Math.round(track.scrollLeft/width);
        const target=Math.max(0,Math.min(total-1,index+Number(control.dataset.galleryStep||0)));
        track.scrollTo({left:target*width,behavior:'smooth'});
        const count=gallery.querySelector('[data-gallery-count]');
        if(count)count.textContent=(target+1)+'/'+total;
      }
      return;
    }
    const interactive=event.target.closest('a,button,input,select,textarea,label,details,summary,video,.homeGalleryTrack');
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
    const [catalog,status,exposure,portfolio,webManifest]=await Promise.all([getJson('/game-catalog.json'),getJson('/company-status.json'),getJson('/homepage-platform-exposure.json'),document.getElementById('homePortfolioBoard')?getJson('/homepage-portfolio-status.json'):Promise.resolve(null),getJson('/web-games/publish-manifest.json')]);
    if(catalog?.runtimeInfoAuthority!=='company-runtime'||status?.runtimeAuthority!=='company-runtime')return;
    const exposureAuthority=String(exposure?.runtimeAuthority||exposure?.authority||'').trim();
    const exposurePlatforms=Array.isArray(exposure?.supportedPlatforms)?exposure.supportedPlatforms.map(normalizePlatform).filter(Boolean):[];
    if(exposureAuthority!=='company-runtime'||JSON.stringify(exposurePlatforms)!==JSON.stringify(['ROBLOX','UNITY'])||!Array.isArray(exposure?.games))return;
    portfolioStatus=portfolio&&Array.isArray(portfolio.games)?portfolio:{games:[],counts:{}};
    platformExposure=exposure;
    // 배포 목록에 없는 원본 경로는 실행 링크로 노출하지 않는다.
    publishedWebRoutes=new Set((Array.isArray(webManifest?.routes)?webManifest.routes:[])
      .filter(route=>/^web-games\/[a-z0-9][a-z0-9-]*\/$/.test(route)));
    const renderCatalog=currentCatalog=>{
      const sig=JSON.stringify([currentCatalog,status,portfolioStatus,platformExposure,[...publishedWebRoutes]]);
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
    renderCatalog(catalog);
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

