// 파일명: tools/homepage-manager.mjs
// 단일 홈페이지 관리 실행계약과 canonical Top30 실시간 미러/PWA/Web 링크를 self-QA 한다.
import fs from 'node:fs';
import { compileHomepageCentralPolicy } from './company-shared-context.mjs';
import { normalizeCatalog, validatedHomepageMedia, webTreeFingerprint } from './game-catalog-normalization.mjs';

// Media capture stays inside the existing manager / self-QA / Director chain.
if(process.argv.includes('--capture-release-media')||process.argv.includes('--plan-release-media')){
  await captureReleaseMedia(process.argv.includes('--plan-release-media'));
  process.exit(0);
}

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
const assetLibrary=readText('asset-library.html');
const assetLibraryRegistry=readJson('company-asset-library.json');

const games=catalog.games||[];
const canonicalOf=game=>game?.canonical&&typeof game.canonical==='object'?game.canonical:{};
const canonicalId=game=>String(canonicalOf(game)?.identity?.gameId||game?.id||'').trim();
const canonicalClass=game=>String(canonicalOf(game)?.production?.class||game?.productionClass||'').toUpperCase();
const canonicalImage=game=>String(canonicalOf(game)?.marketing?.homepageMedia?.small?.src||canonicalOf(game)?.marketing?.thumbnail||canonicalOf(game)?.identity?.image||game?.marketingThumbnail||game?.image||'').trim();
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
// 홈페이지 카드 노출과 새 표지 품질 판단은 독립한다. 미제작 표지는 감추지 않고 정확한 게임 ID로 수리한다.
const homepageCoverRepairIds=games.filter(game=>{
  if(!activeHomepageLifecycle(game))return false;
  const state=String(canonicalWeb(game).state||game.ownerWebSourceState||'').toUpperCase();
  if(state==='NON_GAME_SURFACE')return false;
  if(state==='WITHDRAWN_SIMPLE_PROTOTYPE'){
    const lifecycle=canonicalOf(game).lifecycle||{};
    const native=canonicalOf(game).sources||{};
    if(lifecycle.ownerExistingGame!==true&&game.ownerExistingGame!==true
      &&!native.unity?.projectPath&&!native.roblox?.projectPath
      &&game.unityWebAvailable!==true&&game.unityBuildVerified!==true)return false;
  }
  return true;
}).filter(game=>{
  const entry=canonicalOf(game).marketing?.homepageMedia||game.homepageMedia;
  return !validatedHomepageMedia(canonicalId(game),entry);
}).map(canonicalId);


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
  gameCardPresentationIndependentOfRuntime:developmentDisplay.cardVisibilityRequiresRunnableTarget===false&&developmentDisplay.titleOnlyCardExposureForbidden===false&&developmentDisplay.playableWebCompanionButtonEnabled===false&&developmentDisplay.playableWebCompanionSource==='LEGACY_REFERENCE_ONLY'&&developmentDisplay.playableWebCompanionRequiresExistingCanonicalIndex===false&&includesAll(enhancementEntry,['const isHomepageGame=row=>','WITHDRAWN_SIMPLE_PROTOTYPE','NON_GAME_SURFACE','.filter(isHomepageGame)','function hasRunnableHomepageTarget(game)'])&&!enhancementEntry.includes('.filter(hasRunnableHomepageTarget)'),
  cleanRunnableShelfPresentation:includesAll(index,['data-runtime-fallback="loading"','실행 가능한 게임을 불러오는 중'])&&includesAll(enhancementEntry,['class="gameShelfHead"','class="gameShelfCount"','const direct=links.unityWeb||links.roblox||links.unity||\'\'','rows.find(item=>gameIdOf(item)===FEATURED_GAME_ID)']),
  developmentTestButtonsAvailable:developmentDisplay.webTestButtonEnabled===true&&developmentDisplay.webTestButtonLabel==='Unity Web · 개발중'&&developmentDisplay.platformTestButtonEnabled===true&&developmentDisplay.platformTestButtonLabelMode==='PLATFORM_NAME'&&developmentDisplay.webAndPlatformTestButtonsMustBeSeparate===true&&includesAll(enhancementEntry,['function platformLinks(game)','bindAvailableUnityWebSurfaces(catalog)',"button(links.roblox,`Roblox · ${state('ROBLOX')}`","button(links.unity,`Unity 앱 · ${state('UNITY')}`","button(links.unityWeb,game.unityWebTestOnly?'Unity Web · 테스트':'Unity Web · 개발중'"])&&!enhancementEntry.includes("button(web,'Web 플레이'")&&!enhancementEntry.includes("button(links.fortnite"),
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
  platformReadyGameShelfWithFixedWebAction:includesAll(enhancementEntry,['function internalReleaseRows(catalog,status)','function buildGameCenter(',"buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임'","button(links.roblox,`Roblox · ${state('ROBLOX')}`","button(links.unity,`Unity 앱 · ${state('UNITY')}`","button(links.unityWeb,game.unityWebTestOnly?'Unity Web · 테스트':'Unity Web · 개발중'","function playableWebHref(row)",'dataset.homePlatformAvailableCount','dataset.homeServerAuthority'])&&!enhancementEntry.includes('homeTop30GameCenter')&&!enhancementEntry.includes('const TOP_LIMIT='),
  platformReadyAndDevelopmentShelvesDoNotDuplicate:includesAll(index,['id="gameHub"','id="gameGrid"','id="recentUpdates"'])&&includesAll(enhancementEntry,["buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임'","buildShelf(hub,'homeDevelopmentGameCenter','개발 중'",'const availableIds=new Set(available.map(gameIdOf))','filter(game=>!availableIds.has(gameIdOf(game)))','function buildRecentUpdates(catalog)']),
  dualNativeExposureAcrossConcurrentPlatforms:includesAll(enhancementEntry,['const exposureOf=id=>','function platformLinks(game)','function internalReleaseLinks(game)',"platform('ROBLOX')","platform('UNITY')","['ROBLOX','UNITY'].includes(normalizePlatform(p?.platform))",'function internalReleaseRows(catalog,status)','function playableWebHref(row)'])&&!enhancementEntry.includes("button(links.fortnite"),
  pwaInstallOwnerFixedContractPreserved:includesAll(index,['id="appInstallBar"','id="appInstallBtn"','requestHomepageInstall','beforeinstallprompt','appinstalled','registerHomepagePwa()'])&&homepagePolicy?.fixedFunctionProtection?.ownerLocked===true&&homepagePolicy?.fixedFunctionProtection?.protectedFunctions?.includes('PWA_APP_INSTALL_AND_OFFLINE_RUNTIME'),
  gameDevelopmentAssetLibrarySurface:homepagePresentation?.frontDoor?.gameDevelopmentSurface?.enabled===true&&homepagePresentation?.frontDoor?.gameDevelopmentSurface?.route==='/asset-library.html'&&homepagePresentation?.frontDoor?.gameDevelopmentSurface?.registry==='/company-asset-library.json'&&index.includes('href="/asset-library.html"')&&/data-asset-library-version="[1-9]\d*"/.test(assetLibrary)&&assetLibrary.includes('회사 에셋 라이브러리')&&assetLibraryRegistry?.kind==='company-asset-library'&&assetLibraryRegistry?.publicInspectionSurface===true&&assetLibraryRegistry?.productionPassAuthority===false,
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
console.log(`HOMEPAGE_CATALOG_SOURCE=${catalogPath}`);console.log(`HOMEPAGE_STATUS_SOURCE=${statusPath}`);console.log(`HOMEPAGE_CATALOG=${games.length}`);console.log(`HOMEPAGE_CANONICAL_RECORDS=${games.filter(game=>canonicalOf(game)?.schemaVersion===1).length}/${games.length}`);console.log(`HOMEPAGE_OFFICIAL_CARD_COUNT=${officialGames.length}`);console.log(`HOMEPAGE_VALIDATION_CANDIDATE_COUNT=${testCandidates.length}`);console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${visibleBooks.length}`);console.log(`HOMEPAGE_LEGACY_QUEUE_ENTRIES=${legacyQueueEntries.length}`);console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);console.log(`HOMEPAGE_COVER_REPAIR_REQUIRED=${homepageCoverRepairIds.length}`);console.log(`HOMEPAGE_COVER_REPAIR_GAME_IDS=${homepageCoverRepairIds.join(',')}`);console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);console.log(`HOMEPAGE_PLAYABLE_OFFICIAL_WEB_GAMES=${homepagePlayableGames.length}`);console.log(`HOMEPAGE_BROKEN_WEB_LINKS=${brokenWebGameLinks.length}`);console.log(`HOMEPAGE_BROKEN_VALIDATION_WEB_LINKS=${brokenTestWebRoutes.length}`);console.log(`HOMEPAGE_BROKEN_VALIDATION_ARTBOOKS=${brokenTestArtbooks.length}`);console.log(`HOMEPAGE_PREPROMOTION_OFFICIAL_CARD_VIOLATIONS=${prepromotionOfficialCards.length}`);console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC');console.log('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=DATA_ONLY_SAMPLE_UI_HIDDEN');console.log('HOMEPAGE_DEVELOPMENT_SCORE_SOURCE=CURRENT_INITIAL_CYCLE');console.log('HOMEPAGE_DEVELOPMENT_STALE_SCORE_POLICY=REVALIDATION_NOT_CURRENT');console.log('HOMEPAGE_DEVELOPMENT_ACTIONS=ROBLOX_UNITY_PLUS_OPTIONAL_UNITY_WEB');console.log('HOMEPAGE_LEGACY_WEB_SHELF=HIDDEN');console.log('HOMEPAGE_TOP30_SHELF=DISABLED_VALIDATION_MANIFEST_ONLY');console.log('HOMEPAGE_APK_INSTALL_PLACEMENT=COMPANY_TEAM_BOTTOM');console.log('HOMEPAGE_OFFICIAL_CARD_POLICY=STRICT_PASS_AND_PROMOTION_ONLY');console.log('HOMEPAGE_RUNTIME_SYNC=SERVER_CATALOG_PLUS_NATIVE_PLATFORM_EXPOSURE');console.log(`HOMEPAGE_PORTFOLIO_CONTROL=${checks.homepagePortfolioControlSurface?'PASS':'FAIL'}`);console.log(`HOMEPAGE_PLATFORM_EXPOSURE=${checks.homepageInternalPlatformExposureSurface?'PASS':'FAIL'}`);console.log(`HOMEPAGE_CENTRAL_POLICY_SHA256=${homepageCentral.fingerprint||'INVALID'}`);console.log(`HOMEPAGE_CENTRAL_PLATFORMS=${(centralHomepage.supportedPlatforms||[]).join(',')}`);console.log(`HOMEPAGE_CENTRAL_POLICY_SYNC=${checks.centralHomepageExecutionFingerprint?'PASS':'FAIL'}`);console.log(`HOMEPAGE_DIRECTIVE_MIRROR=${directiveMirrorMatchesCentral?'SYNCED':'STALE_NON_AUTHORITATIVE'}`);console.log('HOMEPAGE_RAW_DESIGN_ONLY_EXECUTION_SHELF=FORBIDDEN');console.log('HOMEPAGE_MANAGER_COUNT=1');console.log('HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1');console.log(`HOMEPAGE_FIXED_PWA_CHAT_CONTRACT=${checks.fixedPwaFilesExist&&checks.pwaManifestCommandEntry&&checks.installPwaContractPreserved&&checks.serviceWorkerPwaContractPreserved&&checks.commandChatContractPreserved?'PASS':'FAIL'}`);
if(failures.length){console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);process.exitCode=1;}

async function captureReleaseMedia(planOnly=false){
  const {createHash}=await import('node:crypto');
  const {createServer}=await import('node:http');
  const {resolve,extname,sep}=await import('node:path');
  const {tmpdir}=await import('node:os');
  const {execFileSync}=await import('node:child_process');
  const {createRequire}=await import('node:module');
  const root=process.cwd();
  const manifestPath='assets/homepage-covers/manifest.json';
  const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const media=fs.existsSync(manifestPath)?json(manifestPath):{version:1,games:{}};
  const catalogPath=process.env.HOMEPAGE_CATALOG_PATH||'game-catalog.json';
  const catalog=json(catalogPath);
  const exposure=json('homepage-platform-exposure.json');
  const gameFilter=process.argv.find(x=>x.startsWith('--media-game='))?.slice(13);
  const candidates=[];
  const captureVersion=2;
  for(const game of catalog.games||[]){
    const id=game.canonical?.identity?.gameId||game.id;
    if(!/^[a-z0-9][a-z0-9-]*$/.test(id)||gameFilter&&gameFilter!==id)continue;
    const release=(exposure.games||[]).find(x=>x.gameId===id);
    const ready=(release?.platforms||[]).some(p=>['ROBLOX','UNITY'].includes(p.platform)&&Boolean(p.internalUrl||p.publicUrl)&&((p.internalReleaseReady===true&&p.releaseReadiness?.homepageReady===true)||(p.platform==='ROBLOX'&&p.historicalInternalRelease===true)));
    if(!ready||game.canonical?.sources?.web?.playable!==true||!media.games[id])continue;
    const dir=resolve(root,'web-games',id),entry=dir+'/index.html';
    if(!fs.existsSync(entry))continue;
    const artifactIdentity=webTreeFingerprint(fs,dir);
    const current=validatedHomepageMedia(id,media.games[id]);
    if(current?.video?.artifactIdentity===artifactIdentity)continue;
    const attempt=media.games[id].captureAttempt;
    if(attempt?.captureVersion===captureVersion&&attempt?.artifactIdentity===artifactIdentity&&Date.now()-Date.parse(attempt.at)<86400000)continue;
    candidates.push({id,artifactIdentity,platform:/createUnityInstance|\.loader\.js/.test(fs.readFileSync(entry,'utf8'))?'UNITY_WEB':'WEB'});
  }
  console.log('HOMEPAGE_RELEASE_MEDIA_PENDING='+candidates.length);
  if(planOnly){
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`needed=${candidates.length>0}\n`);
    return;
  }
  if(!candidates.length)return;
  const sourceRevision=process.env.HOMEPAGE_MEDIA_SOURCE_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(!/^[a-f0-9]{40}$/.test(sourceRevision))throw Error('MEDIA_SOURCE_REVISION_REQUIRED');
  const require=createRequire(import.meta.url);
  const {chromium}=require(process.env.HOMEPAGE_PLAYWRIGHT_MODULE||'playwright');
  const temp=fs.mkdtempSync(tmpdir()+'/homepage-media-');
  const server=createServer((request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      // Serve only public runtime trees; never the repository root or credentials.
      if(!/^\/(web-games|assets)\//.test(pathname)){response.writeHead(404).end();return;}
      let file=resolve(root,'.'+pathname);
      if(!file.startsWith(root+sep)||!fs.existsSync(file)){response.writeHead(404).end();return;}
      if(fs.statSync(file).isDirectory())file+='/index.html';
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
      file=fs.realpathSync(file);
      if(!['web-games','assets'].some(dir=>file.startsWith(resolve(root,dir)+sep))){response.writeHead(404).end();return;}
      const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[extname(file)]||'application/octet-stream';
      response.setHeader('Content-Type',mime);
      fs.createReadStream(file).pipe(response);
    }catch{response.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    fs.mkdirSync('assets/homepage-media',{recursive:true});
    for(const candidate of candidates.slice(0,6)){
      let context;
      const {id,platform,artifactIdentity}=candidate;
      try{
        context=await browser.newContext({viewport:{width:960,height:540},recordVideo:{dir:temp,size:{width:960,height:540}},serviceWorkers:'block'});
        const page=await context.newPage();
        const errors=[];
        const loadedFiles=new Set();
        page.on('response',response=>{
          const url=new URL(response.url());
          const file=decodeURIComponent(url.pathname).replace(/^\/+/, '');
          if(url.origin===origin&&response.ok()&&/^(web-games|assets)\//.test(file)&&!file.split('/').includes('..')){
            const candidate=file.endsWith('/')?file+'index.html':file;
            if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())loadedFiles.add(candidate);
          }
        });
        page.on('pageerror',e=>errors.push(e.message));
        page.setDefaultTimeout(30000);
        await page.goto(`${origin}/web-games/${id}/`,{waitUntil:'networkidle',timeout:45000});
        const known={ 'horror-escape-room':'#startHuman', 'daechung-rpg':'#startBtn', 'ant-simulator':'#startOffline' };
        let start=known[id]?page.locator(known[id]):page.getByRole('button',{name:/^(게임 시작|혼자 시작|시작하기|모험 시작|새 게임|Start|Play)$/i}).first();
        if(id==='cozy-island'){
          // This game already runs on load; interacting at spawn opens a modal.
          await page.locator('#game').waitFor({state:'visible'});
        }else{
          if(!await start.isVisible())throw Error('VISIBLE_GAME_START_REQUIRED');
          await start.click();
          await start.waitFor({state:'hidden',timeout:10000});
        }
        await page.locator('canvas').first().waitFor({state:'visible'});
        await page.waitForTimeout(700);
        const clipStart=await page.evaluate(()=>performance.now()/1000);
        let inputEvents=id==='cozy-island'?0:1;
        for(const key of ['ArrowRight','ArrowUp','ArrowLeft','ArrowDown']){
          await page.keyboard.down(key);inputEvents++;
          await page.waitForTimeout(400);
          await page.keyboard.press('Space');inputEvents++;
          if(id==='cozy-island'){await page.keyboard.press('Escape');inputEvents++;}
          await page.waitForTimeout(2500);
          await page.keyboard.up(key);inputEvents++;
        }
        const digest=b=>createHash('sha256').update(b).digest('hex');
        if(errors.length)throw Error('RUNTIME_SCRIPT_ERROR');
        const dependencies=[...loadedFiles].sort().map(path=>({path,sha256:digest(fs.readFileSync(path))}));
        if(!dependencies.length)throw Error('CAPTURE_DEPENDENCIES_MISSING');
        const videoPath=await page.video().path();
        await context.close();context=null;
        const output=`assets/homepage-media/${id}.mp4`;
        const temporaryOutput=temp+'/'+id+'.mp4';
        execFileSync('ffmpeg',['-y','-loglevel','error','-ss',String(Math.max(0,clipStart)),'-i',videoPath,'-t','12','-vf','scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2','-r','24','-c:v','libx264','-preset','fast','-crf','29','-maxrate','1500k','-bufsize','3000k','-pix_fmt','yuv420p','-an','-movflags','+faststart',temporaryOutput],{timeout:60000,stdio:'pipe'});
        const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',temporaryOutput],{encoding:'utf8'}).trim());
        const bytes=fs.readFileSync(temporaryOutput);
        if(duration<10||duration>12.5||bytes.length<2048||bytes.length>3145728)throw Error('VIDEO_DURATION_OR_SIZE_INVALID');
        // Compare decoded recording frames after the browser has closed, so
        // screenshots cannot stall a CPU-limited runner while it records.
        const frameAt=second=>execFileSync('ffmpeg',['-v','error','-ss',String(second),'-i',temporaryOutput,'-frames:v','1','-vf','scale=64:36','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{timeout:15000});
        const firstFrame=frameAt(.5),lastFrame=frameAt(9);
        if(firstFrame.length!==64*36*3||lastFrame.length!==64*36*3||digest(firstFrame)===digest(lastFrame))throw Error('NO_VISIBLE_RUNTIME_CHANGE');
        // Publish only after a complete successful capture. Existing media survives failures.
        fs.copyFileSync(temporaryOutput,output);
        media.games[id].video={gameId:id,platform,sourceRevision,artifactIdentity,capturedAt:new Date().toISOString(),src:output,bytes:bytes.length,sha256:digest(bytes),dependencies,seconds:duration,width:640,height:360,runtimeVerification:{pass:true,inputEvents,visualChangeObserved:true,scriptErrors:0,purpose:'MARKETING_CAPTURE_ONLY_NOT_F0_F9_ACCEPTANCE'}};
        delete media.games[id].captureAttempt;
        console.log(`HOMEPAGE_RELEASE_MEDIA_CAPTURED=${id} PLATFORM=${platform} BYTES=${bytes.length}`);
      }catch(error){
        media.games[id].captureAttempt={artifactIdentity,captureVersion,at:new Date().toISOString(),state:'CAPTURE_PENDING_NOT_GAMEPLAY_PROVEN',reason:String(error.message||error).slice(0,500)};
        console.log(`HOMEPAGE_RELEASE_MEDIA_PENDING=${id} REASON=${String(error.message||error).split('\n')[0]}`);
      }finally{if(context)await context.close();}
    }
    fs.writeFileSync(manifestPath,JSON.stringify(media,null,2)+'\n');
    normalizeCatalog(catalog);
    fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
