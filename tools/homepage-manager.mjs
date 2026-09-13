// 파일명: tools/homepage-manager.mjs
// 단일 홈페이지 관리 실행계약과 canonical Top30 실시간 미러/PWA/Web 링크를 self-QA 한다.
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
const testManifest=readJson('test-game-candidates.json');
const directive=readJson('company-directive.json');
const index=readText('index.html');
const enhancementEntry=readText('assets/homepage-enhancements.js');
const enhancementCore=exists('assets/homepage-enhancements-core.js')?readText('assets/homepage-enhancements-core.js'):'';
const enhancement=`${enhancementEntry}\n${enhancementCore}`;
const central=readText('COMPANY_FLOW.md');
const operations=readText('HOMEPAGE_OPERATIONS.md');
const manifest=readJson('manifest.webmanifest');
const install=readText('install.html');
const serviceWorker=readText('sw.js');
const command=readText('command.html');
const offline=readText('offline.html');

const games=catalog.games||[];
const officialGames=games.filter(g=>g.homepageOfficialCard===true||String(g.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED');
const catalogIds=new Set(games.map(g=>g.id));
const testCandidates=Array.isArray(testManifest.candidates)?testManifest.candidates:[];
const testCandidateIds=new Set(testCandidates.map(row=>String(row?.gameId||row?.id||'').trim()).filter(Boolean));
const historicalQueueGames=(queue.games||[]).filter(g=>g.source!=='INCUBATOR_METADATA_ONLY'&&g.currentStage!=='incubator-concept-redesign');
const historicalQueueIds=new Set(historicalQueueGames.map(g=>g.gameId));
const legacyQueueEntries=[...historicalQueueIds].filter(id=>!catalogIds.has(id));
const visibleBooks=(books.artbooks||[]).filter(b=>b.published===true||b.homepageVisible===true);
const brokenBookRefs=visibleBooks.filter(b=>!catalogIds.has(b.gameId)&&!(b.homepageTestCandidate===true&&testCandidateIds.has(String(b.gameId||'').trim()))).map(b=>b.id);
const scoreOf=row=>{for(const key of ['strictScore','reviewScore','webStrictScore','totalScore','score']){const n=Number(row?.[key]);if(Number.isFinite(n))return n;}return null;};
const hardFailuresOf=row=>Array.isArray(row?.strictReviewHardFailures)?row.strictReviewHardFailures:[];
const testScoreOrderValid=testCandidates.every((row,index)=>index===0||Number(scoreOf(testCandidates[index-1]))>=Number(scoreOf(row)));
const invalidTestCandidates=testCandidates.filter(row=>row.homepageTestCandidate!==true||row.homepageOfficialCard!==false||String(row.homepageTestVerdict||'').toUpperCase()!=='PASS'||scoreOf(row)===null||scoreOf(row)<80||hardFailuresOf(row).length!==0||!String(row.testUrl||row.webPath||'').trim()||!String(row.artbookUrl||row.artbookPath||'').trim());
const brokenTestWebRoutes=testCandidates.filter(row=>{const p=String(row.webPath||row.testUrl||'').trim().replace(/^\/+|\/+$/g,'');const file=p?`${p}/index.html`:'';if(!file||!exists(file))return true;try{return fs.statSync(file).size<512;}catch{return true;}}).map(row=>row.gameId||row.id);
const brokenTestArtbooks=testCandidates.filter(row=>{const source=String(row.artbookSource||'').trim().replace(/^\/+/, '');if(!source||!exists(source))return true;const registry=visibleBooks.some(book=>book.gameId===(row.gameId||row.id)&&book.sourceFile===source);return !registry;}).map(row=>row.gameId||row.id);

const imageOwners=new Map();
for(const game of officialGames){const image=String(game.image||'').trim();if(!imageOwners.has(image))imageOwners.set(image,[]);imageOwners.get(image).push(game.id);}
const brokenGameImages=officialGames.filter(game=>{const image=String(game.image||'').trim();if(!image||!exists(image))return true;try{return fs.statSync(image).size<256;}catch{return true;}}).map(game=>game.id);
const duplicateGameImages=[...imageOwners.entries()].filter(([image,owners])=>image&&owners.length>1).map(([image,owners])=>({image,games:owners}));
const placeholderGameImages=officialGames.filter(game=>{const image=String(game.image||'').trim();if(/(?:^|\/)(?:mock|portal|page-bg(?:-v\d+)?|monster-adventure-card)\.(?:webp|png|jpg|jpeg|svg)$/i.test(image))return true;if(game.id!=='daechung-rpg'&&/(?:^|\/)fantasy-rpg-v2\.webp$/i.test(image))return true;return false;}).map(game=>game.id);
const webIndexPath=game=>{const webPath=String(game.webPath||'').trim().replace(/^\/+|\/+$/g,'');return webPath?`${webPath}/index.html`:'';};
const homepagePlayableGames=officialGames.filter(game=>game.homepageWebPlayable===true);
const brokenWebGameLinks=homepagePlayableGames.filter(game=>{const file=webIndexPath(game);if(!file||!exists(file))return true;try{return fs.statSync(file).size<512;}catch{return true;}}).map(game=>game.id);
const mismatchedWebPaths=homepagePlayableGames.filter(game=>{const file=webIndexPath(game);return file&&file!==`web-games/${game.id}/index.html`;}).map(game=>game.id);
const prepromotionOfficialCards=games.filter(game=>game.homepageOfficialCard===true&&String(game.productionClass||'').toUpperCase()!=='RELEASE_CONFIRMED').map(game=>game.id);

const homepagePolicy=directive.homepageOperations||{};
const pwaFiles=['manifest.webmanifest','install.html','sw.js','offline.html','command.html'];
const checks={
  centralHomepagePolicyExists:central.includes('homepageOperations:')&&central.includes('SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'),
  centralTop30EligibilityPolicyExists:central.includes('homepageTesting:')&&central.includes('webStrictScoreMinimum: 80')&&central.includes('maxVisibleTestCandidates: 30')&&central.includes('ranking: STRICT_IMPLEMENTATION_SCORE_DESC'),
  top30PrimaryPlacementDocumented:operations.includes('홈페이지 게임 구현 = Top30')&&operations.includes('홈페이지의 **주 게임 구현 영역은 canonical Web Top30 그 자체**'),
  documentationSyncPolicyExists:central.includes('documentationSynchronization:')&&central.includes('implementationWorkStartsAfterRelevantWorkDocumentsAreSynchronized: true'),
  directiveHomepagePolicyMirrorsCentral:homepagePolicy.mode==='SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'&&homepagePolicy.manager==='HOMEPAGE'&&homepagePolicy.supervisor==='DIRECTOR'&&homepagePolicy.managerCount===1&&homepagePolicy.supervisorCount===1,
  secondHomepageManagerForbidden:homepagePolicy.secondHomepageManagerForbidden===true&&homepagePolicy.secondHomepageSupervisorForbidden===true,
  indexExists:exists('index.html'),
  homepageEnhancementLoaded:index.includes('/assets/homepage-enhancements.js')||index.includes('assets/homepage-enhancements.js'),
  activeRuntimeLayoutManager:includesAll(enhancement,['const SYNC_INTERVAL_MS=5000;','const RAW_MAIN_BASE=','const RAW_RUNTIME_BASE=','function buildFocus(','function buildGameCenter(','function buildTeam(','async function refreshHomepageData(','installRealtimeSync()']),
  top30PrimaryHomepageManager:includesAll(enhancementCore,['const TOP30_LIMIT=30;','const TOP30_MIN_SCORE=80;','function top30Candidates(','getJson(\'/test-game-candidates.json\')',"wrapper.id='homeTop30GameCenter'",'class=\"foldGameCard top30GameCard\"','data-homepage-game-source=\"CANONICAL_TOP30\"','homePrimaryGameSource=\'CANONICAL_TOP30\'']),
  legacyCatalogCardsSuppressed:includesAll(enhancementEntry,['const TEST_SHELF_LIMIT=30;','const TEST_SHELF_MIN_SCORE=80;','function enforceOfficialCardVisibility()','card.classList.contains(\'top30GameCard\')','card.dataset?.homepageGameSource===\'CANONICAL_TOP30\''])&&!enhancementEntry.includes('renderCompactTestShelf'),
  apkInstallRelocatedOffTop:includesAll(enhancementEntry,["document.getElementById('appInstallBar')","document.querySelector('.teamPanel .teamWrap')","teamWrap.appendChild(bar)","bar.dataset.placement='company-team-bottom'","'/downloads/jaewoon-company.apk'"]),
  activeCatalogNonEmpty:games.length>0,
  publishedBooksReferenceCatalogGames:brokenBookRefs.length===0,
  requiredArtbookRolesIntact:JSON.stringify(queue.requiredRoles||[])===JSON.stringify(roles),
  activeCatalogUsesSemanticProductionClasses:games.every(game=>['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(String(game.productionClass||''))),
  officialGameImagesPresent:brokenGameImages.length===0,
  officialGameImagesUnique:duplicateGameImages.length===0,
  officialGameNoPlaceholderImages:placeholderGameImages.length===0,
  officialHomepageWebLinksResolve:brokenWebGameLinks.length===0,
  officialHomepageWebPathsCanonical:mismatchedWebPaths.length===0,
  prepromotionOfficialCardsForbidden:prepromotionOfficialCards.length===0,
  top30Limit:testCandidates.length<=30&&Number(testManifest?.homepageTestShelf?.limit)===30&&Number(testManifest?.homepageTestShelf?.minimumScore)===80,
  top30StrictScoreOrder:testScoreOrderValid&&String(testManifest?.homepageTestShelf?.order)==='STRICT_IMPLEMENTATION_SCORE_DESC',
  top30Requirements:invalidTestCandidates.length===0&&testManifest?.homepageTestShelf?.requiresScore===true&&testManifest?.homepageTestShelf?.requiresWebGame===true&&testManifest?.homepageTestShelf?.requiresArtbook===true&&testManifest?.homepageTestShelf?.hardGatesRequired===true,
  top30WebRoutesResolve:brokenTestWebRoutes.length===0,
  top30ArtbooksResolve:brokenTestArtbooks.length===0,
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
console.log(`HOMEPAGE_CATALOG_SOURCE=${catalogPath}`);console.log(`HOMEPAGE_STATUS_SOURCE=${statusPath}`);console.log(`HOMEPAGE_CATALOG=${games.length}`);console.log(`HOMEPAGE_OFFICIAL_CARD_COUNT=${officialGames.length}`);console.log(`HOMEPAGE_TOP30_COUNT=${testCandidates.length}/30`);console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${visibleBooks.length}`);console.log(`HOMEPAGE_LEGACY_QUEUE_ENTRIES=${legacyQueueEntries.length}`);console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);console.log(`HOMEPAGE_PLAYABLE_OFFICIAL_WEB_GAMES=${homepagePlayableGames.length}`);console.log(`HOMEPAGE_BROKEN_WEB_LINKS=${brokenWebGameLinks.length}`);console.log(`HOMEPAGE_BROKEN_TOP30_WEB_LINKS=${brokenTestWebRoutes.length}`);console.log(`HOMEPAGE_BROKEN_TOP30_ARTBOOKS=${brokenTestArtbooks.length}`);console.log(`HOMEPAGE_PREPROMOTION_OFFICIAL_CARD_VIOLATIONS=${prepromotionOfficialCards.length}`);console.log('HOMEPAGE_PRIMARY_GAME_SOURCE=CANONICAL_TOP30');console.log('HOMEPAGE_TOP30_ORDER=STRICT_IMPLEMENTATION_SCORE_DESC');console.log('HOMEPAGE_TOP30_LIMIT=30');console.log('HOMEPAGE_TOP30_MINIMUM_SCORE=80');console.log('HOMEPAGE_APK_INSTALL_PLACEMENT=COMPANY_TEAM_BOTTOM');console.log('HOMEPAGE_OFFICIAL_CARD_POLICY=STRICT_PASS_AND_PROMOTION_ONLY');console.log('HOMEPAGE_RUNTIME_SYNC=TOP30_MAIN_WITH_COMPANY_RUNTIME_METADATA');console.log('HOMEPAGE_MANAGER_COUNT=1');console.log('HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1');console.log(`HOMEPAGE_FIXED_PWA_CHAT_CONTRACT=${checks.fixedPwaFilesExist&&checks.pwaManifestCommandEntry&&checks.installPwaContractPreserved&&checks.serviceWorkerPwaContractPreserved&&checks.commandChatContractPreserved?'PASS':'FAIL'}`);
if(failures.length){console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);process.exitCode=1;}
