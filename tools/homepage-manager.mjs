// 파일명: tools/homepage-manager.mjs
// 단일 홈페이지 관리 실행계약과 canonical Top30 실시간 미러/PWA/Web 링크를 self-QA 한다.
import fs from 'node:fs';
import { compileHomepageCentralPolicy } from './company-shared-context.mjs';

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
const portfolioSnapshot=readJson('homepage-portfolio-status.json');
const platformExposureSnapshot=readJson('homepage-platform-exposure.json');
const books=readJson('game-artbooks.json');
const testManifest=readJson('test-game-candidates.json');
const directive=readJson('company-directive.json');
const roadmap=readJson('company-learning/platform-release-roadmap.json');
const homepageCentral=compileHomepageCentralPolicy(roadmap);
const centralHomepage=homepageCentral.contract||{};
const expectedHomepagePolicyFingerprint=String(process.env.HOMEPAGE_POLICY_SHA256||'').trim();
const index=readText('index.html');
const enhancementEntry=readText('assets/homepage-enhancements.js');
const enhancementCore=enhancementEntry;
const enhancement=enhancementEntry;
const statusSync=readText('tools/company-status-sync.mjs');
const manifest=readJson('manifest.webmanifest');
const install=readText('install.html');
const serviceWorker=readText('sw.js');
const command=readText('command.html');
const offline=readText('offline.html');

const games=catalog.games||[];
const canonicalOf=game=>game?.canonical&&typeof game.canonical==='object'?game.canonical:{};
const canonicalId=game=>String(canonicalOf(game)?.identity?.gameId||game?.id||'').trim();
const canonicalClass=game=>String(canonicalOf(game)?.production?.class||game?.productionClass||'').toUpperCase();
const canonicalImage=game=>String(canonicalOf(game)?.identity?.image||game?.image||'').trim();
const canonicalWeb=game=>canonicalOf(game)?.sources?.web&&typeof canonicalOf(game).sources.web==='object'?canonicalOf(game).sources.web:{};
const canonicalOrder=game=>{const n=Number(canonicalOf(game)?.catalogOrder??game?.catalogOrder);return Number.isFinite(n)&&n>0?n:null;};
const canonicalOrderValid=games.every((game,index)=>canonicalOrder(game)===index+1);
const officialGames=games.filter(g=>g.homepageOfficialCard===true||canonicalClass(g)==='RELEASE_CONFIRMED');
const catalogIds=new Set(games.map(canonicalId));
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
for(const game of officialGames){const image=canonicalImage(game);if(!imageOwners.has(image))imageOwners.set(image,[]);imageOwners.get(image).push(canonicalId(game));}
const brokenGameImages=officialGames.filter(game=>{const image=canonicalImage(game);if(!image||!exists(image))return true;try{return fs.statSync(image).size<256;}catch{return true;}}).map(canonicalId);
const duplicateGameImages=[...imageOwners.entries()].filter(([image,owners])=>image&&owners.length>1).map(([image,owners])=>({image,games:owners}));
const placeholderGameImages=officialGames.filter(game=>{const image=canonicalImage(game);if(/(?:^|\/)(?:mock|portal|page-bg(?:-v\d+)?|monster-adventure-card)\.(?:webp|png|jpg|jpeg|svg)$/i.test(image))return true;if(canonicalId(game)!=='daechung-rpg'&&/(?:^|\/)fantasy-rpg-v2\.webp$/i.test(image))return true;return false;}).map(canonicalId);
const webIndexPath=game=>{const webPath=String(canonicalWeb(game).path||game.webPath||'').trim().replace(/^\/+|\/+$/g,'');return webPath?`${webPath}/index.html`:'';};
const activeHomepageLifecycle=game=>['ACTIVE','REBUILD'].includes(String(canonicalOf(game)?.lifecycle?.state||game?.lifecycleState||'ACTIVE').toUpperCase());
const homepagePlayableGames=games.filter(game=>{
  const web=canonicalWeb(game);
  return activeHomepageLifecycle(game)&&(web.playable===true||game.homepageWebPlayable===true)&&(web.archive===true||game.hasWebArchive===true);
});
const brokenWebGameLinks=homepagePlayableGames.filter(game=>{const file=webIndexPath(game);if(!file||!exists(file))return true;try{return fs.statSync(file).size<512;}catch{return true;}}).map(game=>game.id);
const mismatchedWebPaths=homepagePlayableGames.filter(game=>{const file=webIndexPath(game);return file&&file!==`web-games/${canonicalId(game)}/index.html`;}).map(canonicalId);
const prepromotionOfficialCards=games.filter(game=>game.homepageOfficialCard===true&&canonicalClass(game)!=='RELEASE_CONFIRMED').map(canonicalId);

const homepagePolicy=centralHomepage.managerContract||{};
const homepageTesting=centralHomepage.testingContract||{};
const developmentDisplay=homepagePolicy.developmentProgressDisplay||{};
const documentationSync=centralHomepage.documentationSyncContract||{};
const directiveHomepageMirror=directive.homepageOperations||{};
const directiveHomepageTestingMirror=directive.homepageTesting||{};
const directiveDocumentationMirror=directive.documentationSynchronization||{};
const directiveMirrorMatchesCentral=
  JSON.stringify(directiveHomepageMirror)===JSON.stringify(homepagePolicy)&&
  JSON.stringify(directiveHomepageTestingMirror)===JSON.stringify(homepageTesting)&&
  JSON.stringify(directiveDocumentationMirror)===JSON.stringify(documentationSync);
const homepagePresentation=roadmap.homepagePresentation||{};
const webShelfPolicy=homepagePresentation.webGameShelf||{};
const top30ShelfPolicy=homepagePresentation.top30Shelf||{};
const pwaFiles=['manifest.webmanifest','install.html','sw.js','offline.html','command.html'];
const checks={
  normalizedCatalogContract:catalog.catalogSchemaVersion===2&&catalog.normalization?.canonicalRecordPath==='games[].canonical'&&catalog.normalization?.canonicalFirst===true&&catalog.normalization?.homepageReadsCanonicalFirst===true&&catalog.normalization?.ordering==='CANONICAL_STABLE'&&catalog.normalization?.orderField==='catalogOrder'&&canonicalOrderValid&&games.every(game=>canonicalOf(game)?.schemaVersion===1&&canonicalId(game)),
  homepageCanonicalRenderer:includesAll(enhancementEntry,['const canonicalOf=row=>','const identityOf=row=>','const publicationOf=row=>','const homepageOf=row=>','const runtimeInfo=row=>homepageOf(row).runtime','const catalogOrderCompare=','const canonical=publicationOf(game).roblox']),
  centralHomepagePolicyExists:homepageCentral.valid===true&&roadmap.authority==='MACHINE_EXECUTION_CONTRACT'&&roadmap.machineSourceOfTruth==='company-learning/platform-release-roadmap.json'&&centralHomepage.managerContractAuthority==='CENTRAL_ROADMAP_ONLY_DIRECTIVE_IS_COMPATIBILITY_MIRROR',
  centralHomepageExecutionFingerprint:!expectedHomepagePolicyFingerprint||expectedHomepagePolicyFingerprint===homepageCentral.fingerprint,
  centralHomepageRuntimeAuthority:centralHomepage.runtimeAuthority==='company-runtime'&&centralHomepage.serverRuntimeBranch==='company-runtime'&&centralHomepage.publicSourceBranch==='main',
  centralWebShelfPolicyExists:webShelfPolicy.enabled===false&&webShelfPolicy.legacyArchiveOnly===true&&webShelfPolicy.frontDoorVisible===false&&top30ShelfPolicy.enabled===false&&top30ShelfPolicy.mustNotRender===true,
  developmentAndWebShelfPlacementDocumented:developmentDisplay.autoRegisterProductionClass==='DEVELOPMENT_CONFIRMED'&&webShelfPolicy.source==='LEGACY_ARCHIVE_ONLY'&&Array.isArray(centralHomepage.supportedPlatforms)&&centralHomepage.supportedPlatforms.length>0,
  developmentTestButtonsAvailable:developmentDisplay.webTestButtonEnabled===true&&developmentDisplay.webTestButtonLabel==='Unity Web · 개발중'&&developmentDisplay.platformTestButtonEnabled===true&&developmentDisplay.platformTestButtonLabelMode==='PLATFORM_NAME'&&developmentDisplay.webAndPlatformTestButtonsMustBeSeparate===true&&includesAll(enhancementEntry,['function platformLinks(game)','bindAvailableUnityWebSurfaces(catalog)',"button(links.roblox,`Roblox · ${state('ROBLOX')}`","button(links.unity,`Unity 앱 · ${state('UNITY')}`","button(links.unityWeb,'Unity Web · 개발중'"])&&!enhancementEntry.includes("button(web,'Web 플레이'")&&!enhancementEntry.includes("button(links.fortnite"),
  developmentCurrentScoreRankingAvailable:developmentDisplay.scoreDisplayEnabled===false&&developmentDisplay.scoreSource==='DISABLED_FOR_DIRECT_NATIVE_DEVELOPMENT'&&developmentDisplay.ranking==='CATALOG_ORDER'&&includesAll(enhancementEntry,['catalog?.runtimeInfoAuthority!==\'company-runtime\'','status?.runtimeAuthority!==\'company-runtime\'']),
  documentationSyncPolicyExists:documentationSync.centralPolicyFirst===true&&documentationSync.centralPolicyPath==='company-learning/platform-release-roadmap.json'&&documentationSync.implementationWorkStartsAfterRelevantWorkDocumentsAreSynchronized===true&&documentationSync.humanPolicyMirrorRequired===false&&documentationSync.workDocumentsCannotOverrideCentralPolicy===true,
  centralHomepageManagerContract:homepagePolicy.mode==='SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'&&homepagePolicy.manager==='HOMEPAGE'&&homepagePolicy.supervisor==='DIRECTOR'&&homepagePolicy.managerCount===1&&homepagePolicy.supervisorCount===1&&centralHomepage.directiveMirrorMayNotOverrideCentral===true,
  secondHomepageManagerForbidden:homepagePolicy.secondHomepageManagerForbidden===true&&homepagePolicy.secondHomepageSupervisorForbidden===true,
  indexExists:exists('index.html'),
  homepageEnhancementLoaded:index.includes('/assets/homepage-enhancements.js')||index.includes('assets/homepage-enhancements.js'),
  activeRuntimeLayoutManager:includesAll(enhancementEntry,['const SYNC_INTERVAL_MS=30000;',"SAMPLE_FRONT_DOOR_V1",'function buildFocus(','function buildGameCenter(','async function refresh(','getJson(\'/game-catalog.json\')','getJson(\'/company-status.json\')','catalog?.runtimeInfoAuthority!==\'company-runtime\'','status?.runtimeAuthority!==\'company-runtime\'','setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS)']),
  homepagePortfolioControlSurface:portfolioSnapshot?.publicSafe===true&&Array.isArray(portfolioSnapshot?.games)&&roadmap?.homepagePortfolioVisibility?.departmentPortfolioControl?.enabled===true&&includesAll(enhancementEntry,["getJson('/homepage-portfolio-status.json')",'function buildPortfolioBoard()'])&&!index.includes('homePortfolioBoard'),
  homepageInternalPlatformExposureSurface:platformExposureSnapshot?.version===3&&platformExposureSnapshot?.authority==='company-runtime'&&platformExposureSnapshot?.internalCompanySurface===true&&platformExposureSnapshot?.centralPolicyFingerprint===homepageCentral.fingerprint&&JSON.stringify(platformExposureSnapshot?.supportedPlatforms)===JSON.stringify(centralHomepage.supportedPlatforms)&&Array.isArray(platformExposureSnapshot?.games)&&roadmap?.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.publicExposure?.homepageIsInternalCompanySurface===true&&includesAll(enhancementEntry,["getJson('/homepage-platform-exposure.json')",'const exposureOf=id=>','const exposureLabelOf=id=>']),

  verifiedServerShelfBoundary:includesAll(enhancementEntry,['const displayEligible=row=>','function releaseRows(','function developmentRows(','function webPublishedRows(catalog)','function canonicalWebHref(row)','RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED']),
  platformReadyGameShelfWithFixedWebAction:includesAll(enhancementEntry,['function internalReleaseRows(catalog,status)','function buildGameCenter(',"buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임'","button(links.roblox,`Roblox · ${state('ROBLOX')}`","button(links.unity,`Unity 앱 · ${state('UNITY')}`",'dataset.homePlatformAvailableCount','dataset.homeServerAuthority'])&&!enhancementEntry.includes("button(web,'Web 플레이'")&&!enhancementEntry.includes('homeTop30GameCenter')&&!enhancementEntry.includes('const TOP_LIMIT='),
  platformReadyAndDevelopmentShelvesDoNotDuplicate:includesAll(index,['id="gameHub"','id="gameGrid"','id="recentUpdates"'])&&includesAll(enhancementEntry,["buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임'","buildShelf(hub,'homeDevelopmentGameCenter','개발 중'",'const availableIds=new Set(available.map(gameIdOf))','filter(game=>!availableIds.has(gameIdOf(game)))','function buildRecentUpdates(catalog)']),
  dualNativeExposureAcrossConcurrentPlatforms:includesAll(enhancementEntry,['const exposureOf=id=>','function platformLinks(game)','function internalReleaseLinks(game)',"platform('ROBLOX')","platform('UNITY')","['ROBLOX','UNITY'].includes(normalizePlatform(p?.platform))",'function internalReleaseRows(catalog,status)'])&&!enhancementEntry.includes("button(links.fortnite")&&!enhancementEntry.includes("button(web,'Web 플레이'"),
  pwaInstallOwnerFixedContractPreserved:includesAll(index,['id="appInstallBar"','id="appInstallBtn"','requestHomepageInstall','beforeinstallprompt','appinstalled','registerHomepagePwa()'])&&homepagePolicy?.fixedFunctionProtection?.ownerLocked===true&&homepagePolicy?.fixedFunctionProtection?.protectedFunctions?.includes('PWA_APP_INSTALL_AND_OFFLINE_RUNTIME'),
  activeCatalogNonEmpty:games.length>0,
  publishedBooksReferenceCatalogGames:brokenBookRefs.length===0,
  requiredArtbookRolesIntact:JSON.stringify(queue.requiredRoles||[])===JSON.stringify(roles),
  activeCatalogUsesSemanticProductionClasses:games.every(game=>['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(canonicalClass(game))),
  officialGameImagesPresent:brokenGameImages.length===0,
  officialGameImagesUnique:duplicateGameImages.length===0,
  officialGameNoPlaceholderImages:placeholderGameImages.length===0,
  officialHomepageWebLinksResolve:brokenWebGameLinks.length===0,
  officialHomepageWebPathsCanonical:mismatchedWebPaths.length===0,
  prepromotionOfficialCardsForbidden:prepromotionOfficialCards.length===0,
  validationCandidateLimit:testCandidates.length<=30&&Number(testManifest?.homepageTestShelf?.limit)===30&&Number(testManifest?.homepageTestShelf?.minimumScore)===80,
  validationCandidateStrictScoreOrder:testScoreOrderValid&&String(testManifest?.homepageTestShelf?.order)==='STRICT_IMPLEMENTATION_SCORE_DESC',
  validationCandidateRequirements:invalidTestCandidates.length===0&&testManifest?.homepageTestShelf?.requiresScore===true&&testManifest?.homepageTestShelf?.requiresWebGame===true&&testManifest?.homepageTestShelf?.requiresArtbook===true&&testManifest?.homepageTestShelf?.hardGatesRequired===true,
  validationCandidateWebRoutesResolve:brokenTestWebRoutes.length===0,
  validationCandidateArtbooksResolve:brokenTestArtbooks.length===0,
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
console.log(`HOMEPAGE_CATALOG_ORDER=${canonicalOrderValid?'CANONICAL_STABLE':'INVALID'}`);
console.log(`HOMEPAGE_CATALOG_SOURCE=${catalogPath}`);console.log(`HOMEPAGE_STATUS_SOURCE=${statusPath}`);console.log(`HOMEPAGE_CATALOG=${games.length}`);console.log(`HOMEPAGE_CANONICAL_RECORDS=${games.filter(game=>canonicalOf(game)?.schemaVersion===1).length}/${games.length}`);console.log(`HOMEPAGE_OFFICIAL_CARD_COUNT=${officialGames.length}`);console.log(`HOMEPAGE_VALIDATION_CANDIDATE_COUNT=${testCandidates.length}`);console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${visibleBooks.length}`);console.log(`HOMEPAGE_LEGACY_QUEUE_ENTRIES=${legacyQueueEntries.length}`);console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);console.log(`HOMEPAGE_PLAYABLE_OFFICIAL_WEB_GAMES=${homepagePlayableGames.length}`);console.log(`HOMEPAGE_BROKEN_WEB_LINKS=${brokenWebGameLinks.length}`);console.log(`HOMEPAGE_BROKEN_VALIDATION_WEB_LINKS=${brokenTestWebRoutes.length}`);console.log(`HOMEPAGE_BROKEN_VALIDATION_ARTBOOKS=${brokenTestArtbooks.length}`);console.log(`HOMEPAGE_PREPROMOTION_OFFICIAL_CARD_VIOLATIONS=${prepromotionOfficialCards.length}`);console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC');console.log('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=DATA_ONLY_SAMPLE_UI_HIDDEN');console.log('HOMEPAGE_DEVELOPMENT_SCORE_SOURCE=CURRENT_INITIAL_CYCLE');console.log('HOMEPAGE_DEVELOPMENT_STALE_SCORE_POLICY=REVALIDATION_NOT_CURRENT');console.log('HOMEPAGE_DEVELOPMENT_ACTIONS=ROBLOX_UNITY_PLUS_OPTIONAL_UNITY_WEB');console.log('HOMEPAGE_LEGACY_WEB_SHELF=HIDDEN');console.log('HOMEPAGE_TOP30_SHELF=DISABLED_VALIDATION_MANIFEST_ONLY');console.log('HOMEPAGE_APK_INSTALL_PLACEMENT=COMPANY_TEAM_BOTTOM');console.log('HOMEPAGE_OFFICIAL_CARD_POLICY=STRICT_PASS_AND_PROMOTION_ONLY');console.log('HOMEPAGE_RUNTIME_SYNC=SERVER_CATALOG_PLUS_NATIVE_PLATFORM_EXPOSURE');console.log(`HOMEPAGE_PORTFOLIO_CONTROL=${checks.homepagePortfolioControlSurface?'PASS':'FAIL'}`);console.log(`HOMEPAGE_PLATFORM_EXPOSURE=${checks.homepageInternalPlatformExposureSurface?'PASS':'FAIL'}`);console.log(`HOMEPAGE_CENTRAL_POLICY_SHA256=${homepageCentral.fingerprint||'INVALID'}`);console.log(`HOMEPAGE_CENTRAL_PLATFORMS=${(centralHomepage.supportedPlatforms||[]).join(',')}`);console.log(`HOMEPAGE_CENTRAL_POLICY_SYNC=${checks.centralHomepageExecutionFingerprint?'PASS':'FAIL'}`);console.log(`HOMEPAGE_DIRECTIVE_MIRROR=${directiveMirrorMatchesCentral?'SYNCED':'STALE_NON_AUTHORITATIVE'}`);console.log('HOMEPAGE_RAW_DESIGN_ONLY_EXECUTION_SHELF=FORBIDDEN');console.log('HOMEPAGE_MANAGER_COUNT=1');console.log('HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1');console.log(`HOMEPAGE_FIXED_PWA_CHAT_CONTRACT=${checks.fixedPwaFilesExist&&checks.pwaManifestCommandEntry&&checks.installPwaContractPreserved&&checks.serviceWorkerPwaContractPreserved&&checks.commandChatContractPreserved?'PASS':'FAIL'}`);
if(failures.length){console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);process.exitCode=1;}
