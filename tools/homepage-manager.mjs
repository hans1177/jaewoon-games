// 파일명: tools/homepage-manager.mjs
// 역할: 홈페이지 관리 실행계약과 실제 공개 데이터/PWA/Web 링크를 self-QA 한다.
// 레이아웃 실행부는 assets/homepage-enhancements.js가 최신 runtime/main 데이터를 읽어 DOM을 동적으로 관리한다.
// 이 도구는 정책/출시 사실을 만들지 않고, manager 실행계약과 owner 고정기능 회귀 및 깨진 Web 링크를 차단한다.
import fs from 'node:fs';

const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const readText=path=>fs.readFileSync(path,'utf8');
const exists=path=>fs.existsSync(path);
const includesAll=(text,parts)=>parts.every(part=>text.includes(part));
const roles=['planning','graphics','development','qa','balance'];
const catalogPath=process.env.HOMEPAGE_CATALOG_PATH||'game-catalog.json';
const statusPath=process.env.HOMEPAGE_STATUS_PATH||'company-status.json';

const catalog=readJson(catalogPath);
const queue=readJson('artbook-submission-queue.json');
const status=readJson(statusPath);
const books=readJson('game-artbooks.json');
const directive=readJson('company-directive.json');
const index=readText('index.html');
const enhancementEntry=readText('assets/homepage-enhancements.js');
const enhancementCore=exists('assets/homepage-enhancements-core.js')?readText('assets/homepage-enhancements-core.js'):'';
const enhancement=`${enhancementEntry}\n${enhancementCore}`;
const central=readText('COMPANY_FLOW.md');
const manifest=readJson('manifest.webmanifest');
const install=readText('install.html');
const serviceWorker=readText('sw.js');
const command=readText('command.html');
const offline=readText('offline.html');

const games=catalog.games||[];
const catalogIds=new Set(games.map(g=>g.id));
const historicalQueueGames=(queue.games||[]).filter(g=>g.source!=='INCUBATOR_METADATA_ONLY'&&g.currentStage!=='incubator-concept-redesign');
const historicalQueueIds=new Set(historicalQueueGames.map(g=>g.gameId));
const legacyQueueEntries=[...historicalQueueIds].filter(id=>!catalogIds.has(id));
const visibleBooks=(books.artbooks||[]).filter(b=>b.published===true||b.homepageVisible===true);
const brokenBookRefs=visibleBooks.filter(b=>!catalogIds.has(b.gameId)).map(b=>b.id);

const imageOwners=new Map();
for(const game of games){
  const image=String(game.image||'').trim();
  if(!imageOwners.has(image))imageOwners.set(image,[]);
  imageOwners.get(image).push(game.id);
}

const brokenGameImages=games.filter(game=>{
  const image=String(game.image||'').trim();
  if(!image||!exists(image))return true;
  try{return fs.statSync(image).size<256;}catch{return true;}
}).map(game=>game.id);

const duplicateGameImages=[...imageOwners.entries()]
  .filter(([image,owners])=>image&&owners.length>1)
  .map(([image,owners])=>({image,games:owners}));

const placeholderGameImages=games.filter(game=>{
  const image=String(game.image||'').trim();
  if(/(?:^|\/)(?:mock|portal|page-bg(?:-v\d+)?|monster-adventure-card)\.(?:webp|png|jpg|jpeg|svg)$/i.test(image))return true;
  if(game.id!=='daechung-rpg'&&/(?:^|\/)fantasy-rpg-v2\.webp$/i.test(image))return true;
  return false;
}).map(game=>game.id);

const webIndexPath=game=>{
  const webPath=String(game.webPath||'').trim().replace(/^\/+|\/+$/g,'');
  return webPath?`${webPath}/index.html`:'';
};
const homepagePlayableGames=games.filter(game=>game.homepageWebPlayable===true);
const brokenWebGameLinks=homepagePlayableGames.filter(game=>{
  const file=webIndexPath(game);
  if(!file||!exists(file))return true;
  try{return fs.statSync(file).size<512;}catch{return true;}
}).map(game=>game.id);
const mismatchedWebPaths=homepagePlayableGames.filter(game=>{
  const file=webIndexPath(game);
  return file&&file!==`web-games/${game.id}/index.html`;
}).map(game=>game.id);

const homepagePolicy=directive.homepageOperations||{};
const pwaFiles=['manifest.webmanifest','install.html','sw.js','offline.html','command.html'];

const checks={
  centralHomepagePolicyExists:central.includes('homepageOperations:')&&central.includes('SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'),
  documentationSyncPolicyExists:central.includes('documentationSynchronization:')&&central.includes('implementationWorkStartsAfterRelevantWorkDocumentsAreSynchronized: true'),
  directiveHomepagePolicyMirrorsCentral:homepagePolicy.mode==='SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'&&homepagePolicy.manager==='HOMEPAGE'&&homepagePolicy.supervisor==='DIRECTOR'&&homepagePolicy.managerCount===1&&homepagePolicy.supervisorCount===1,
  secondHomepageManagerForbidden:homepagePolicy.secondHomepageManagerForbidden===true&&homepagePolicy.secondHomepageSupervisorForbidden===true,
  indexExists:exists('index.html'),
  homepageEnhancementLoaded:index.includes('/assets/homepage-enhancements.js')||index.includes('assets/homepage-enhancements.js'),
  activeRuntimeLayoutManager:includesAll(enhancement,['const SYNC_INTERVAL_MS=5000;','const RAW_MAIN_BASE=','const RAW_RUNTIME_BASE=', 'function buildFocus(', 'function buildGameCenter(', 'function buildTeam(', 'async function refreshHomepageData(', 'installRealtimeSync()']),
  activeCatalogNonEmpty:games.length>0,
  publishedBooksReferenceCatalogGames:brokenBookRefs.length===0,
  requiredArtbookRolesIntact:JSON.stringify(queue.requiredRoles||[])===JSON.stringify(roles),
  activeCatalogUsesSemanticProductionClasses:games.every(game=>['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(String(game.productionClass||''))),
  allGameImagesPresent:brokenGameImages.length===0,
  allGameImagesUnique:duplicateGameImages.length===0,
  noPlaceholderGameImages:placeholderGameImages.length===0,
  allHomepageWebLinksResolve:brokenWebGameLinks.length===0,
  homepageWebPathsMatchCanonicalGameIds:mismatchedWebPaths.length===0,
  fixedPwaFilesExist:pwaFiles.every(exists),
  pwaManifestCommandEntry:manifest.id==='/command.html'&&manifest.start_url==='/command.html'&&manifest.scope==='/'&&manifest.display==='standalone',
  pwaManifestIconsPreserved:Array.isArray(manifest.icons)&&manifest.icons.some(x=>x.src==='/assets/pwa-icon-192.png')&&manifest.icons.some(x=>x.src==='/assets/pwa-icon-512.png'),
  installPwaContractPreserved:includesAll(install,['rel="manifest" href="/manifest.webmanifest"','id="installBtn"','beforeinstallprompt',"navigator.serviceWorker.register('/sw.js',{scope:'/'})",'appinstalled']),
  serviceWorkerPwaContractPreserved:includesAll(serviceWorker,["'/command.html'","'/install.html'","'/offline.html'","'/manifest.webmanifest'","self.addEventListener('install'","self.addEventListener('activate'","self.addEventListener('fetch'",'serveCommand(request)']),
  commandChatContractPreserved:includesAll(command,['id="chat"','id="attachBtn"','id="body"','id="sendBtn"','id="claimBtn"','async function send()','async function claim()','function registerPwa()',"navigator.serviceWorker.register('/sw.js')",'attachmentIds:ids']),
  offlineFallbackPresent:offline.length>0,
  ownerFixedFunctionPolicyBound:homepagePolicy?.fixedFunctionProtection?.ownerLocked===true&&homepagePolicy?.fixedFunctionProtection?.changeRequiresLatestOwnerDirectInstruction===true
};

const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);

console.log(`HOMEPAGE_MANAGEMENT=${failures.length?'ATTENTION':'PASS'}`);
console.log(`HOMEPAGE_SELF_QA=${Object.keys(checks).length-failures.length}/${Object.keys(checks).length}`);
console.log(`HOMEPAGE_CATALOG_SOURCE=${catalogPath}`);
console.log(`HOMEPAGE_STATUS_SOURCE=${statusPath}`);
console.log(`HOMEPAGE_CATALOG=${games.length}`);
console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${visibleBooks.length}`);
console.log(`HOMEPAGE_LEGACY_QUEUE_ENTRIES=${legacyQueueEntries.length}`);
console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);
console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);
console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);
console.log(`HOMEPAGE_PLAYABLE_WEB_GAMES=${homepagePlayableGames.length}`);
console.log(`HOMEPAGE_BROKEN_WEB_LINKS=${brokenWebGameLinks.length}`);
console.log(`HOMEPAGE_MISMATCHED_WEB_PATHS=${mismatchedWebPaths.length}`);
if(brokenWebGameLinks.length)console.log(`HOMEPAGE_BROKEN_WEB_GAME_IDS=${brokenWebGameLinks.join(',')}`);
if(mismatchedWebPaths.length)console.log(`HOMEPAGE_MISMATCHED_WEB_GAME_IDS=${mismatchedWebPaths.join(',')}`);
console.log('HOMEPAGE_CATALOG_COUNT_POLICY=DYNAMIC');
console.log('HOMEPAGE_LEGACY_QUEUE_POLICY=HISTORY_ONLY');
console.log('HOMEPAGE_LAYOUT_MANAGEMENT=ENABLED');
console.log('HOMEPAGE_RUNTIME_SYNC=COMPANY_RUNTIME_WITH_MAIN_FALLBACK');
console.log('HOMEPAGE_MANAGER_COUNT=1');
console.log('HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1');
console.log(`HOMEPAGE_FIXED_PWA_CHAT_CONTRACT=${checks.fixedPwaFilesExist&&checks.pwaManifestCommandEntry&&checks.installPwaContractPreserved&&checks.serviceWorkerPwaContractPreserved&&checks.commandChatContractPreserved?'PASS':'FAIL'}`);
if(failures.length){
  console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);
  process.exitCode=1;
}
