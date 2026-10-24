// 파일명: tools/homepage-manager.mjs
// 단일 홈페이지 관리 실행계약과 canonical Top30 실시간 미러/PWA/Web 링크를 self-QA 한다.
import fs from 'node:fs';
import { buildHomepagePlatformExposure } from './company-homepage-platform-exposure-sync.mjs';
import { normalizeCatalog, validatedHomepageMedia, webTreeFingerprint } from './game-catalog-normalization.mjs';

// Media capture stays inside the existing manager / self-QA / Director chain.
if(process.argv.includes('--capture-release-media')||process.argv.includes('--plan-release-media')||process.argv.includes('--sync-roblox-titles')){
  await captureReleaseMedia(process.argv.includes('--plan-release-media'),{titlesOnly:process.argv.includes('--sync-roblox-titles')});
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
const roadmap=exists('company-learning/platform-release-roadmap.json')?readJson('company-learning/platform-release-roadmap.json'):{};
// [중앙정책] 운영 플랫폼 계산과 홈페이지 관리가 동일한 검증된 정책 투영을 사용한다.
const homepagePolicyExposure=buildHomepagePlatformExposure({policy:roadmap});
const homepageCentral={
  valid:true,errors:[],fingerprint:homepagePolicyExposure.centralPolicyFingerprint,
  supportedPlatforms:homepagePolicyExposure.supportedPlatforms,
  contract:roadmap.serverHomepageIntegration
};
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
const mismatchedWebPaths=homepagePlayableGames.filter(game=>{const file=webIndexPath(game);return file&&!['web-games/'+canonicalId(game)+'/index.html','web-games/'+canonicalId(game)+'/unity/index.html'].includes(file);}).map(canonicalId);
const prepromotionOfficialCards=games.filter(game=>game.homepageOfficialCard===true&&canonicalClass(game)!=='RELEASE_CONFIRMED').map(canonicalId);

const homepagePolicy=centralHomepage.managerContract||{};
const homepageTesting=centralHomepage.testingContract||{};
const developmentDisplay=homepagePolicy.developmentProgressDisplay||{};
const documentationSync=centralHomepage.documentationSyncContract||{};
const directiveHomepageMirror=directive.homepageOperations||{};
const directiveHomepageTestingMirror=directive.homepageTesting||{};
const directiveDocumentationMirror=directive.documentationSynchronization||{};
const directiveMirrorMatchesCentral=
  JSON.stringify(Object.fromEntries(Object.entries(directiveHomepageMirror).filter(([key])=>key!=='homepageListingContract')))===JSON.stringify(homepagePolicy)&&
  JSON.stringify(directiveHomepageMirror.homepageListingContract||{})===JSON.stringify(centralHomepage.homepageListingContract||{})&&
  JSON.stringify(directiveHomepageTestingMirror)===JSON.stringify(homepageTesting)&&
  JSON.stringify(directiveDocumentationMirror)===JSON.stringify(documentationSync);
const homepagePresentation=roadmap.homepagePresentation||{};
const webShelfPolicy=homepagePresentation.webGameShelf||{};
const top30ShelfPolicy=homepagePresentation.top30Shelf||{};
const pwaFiles=['manifest.webmanifest','install.html','sw.js','offline.html','command.html'];
const checks={
  activeDevelopmentVisibility:centralHomepage.homepageListingContract?.mode==='ALL_NON_EXCLUDED_GAMES'&&includesAll(enhancementEntry,['if(runtimeInfo(row).developmentActive!==true)return false;'])&&games.every(game=>typeof game.canonical?.homepage?.runtime?.developmentActive==='boolean'),
  normalizedCatalogContract:catalog.catalogSchemaVersion===2&&catalog.normalization?.canonicalRecordPath==='games[].canonical'&&catalog.normalization?.canonicalFirst===true&&catalog.normalization?.homepageReadsCanonicalFirst===true&&catalog.normalization?.ordering==='CANONICAL_STABLE'&&catalog.normalization?.orderField==='catalogOrder'&&canonicalOrderValid&&games.every(game=>canonicalOf(game)?.schemaVersion===1&&canonicalId(game)),
  homepageCanonicalRenderer:includesAll(enhancementEntry,['const canonicalOf=row=>','const identityOf=row=>','const publicationOf=row=>','const homepageOf=row=>','const runtimeInfo=row=>homepageOf(row).runtime','const catalogOrderCompare=','const canonical=publicationOf(game).roblox']),
  centralHomepagePolicyExists:homepageCentral.valid===true&&roadmap.authority==='MACHINE_EXECUTION_CONTRACT'&&roadmap.machineSourceOfTruth==='company-learning/platform-release-roadmap.json'&&centralHomepage.managerContractAuthority==='CENTRAL_ROADMAP_ONLY_DIRECTIVE_IS_COMPATIBILITY_MIRROR',
  centralHomepageExecutionFingerprint:!expectedHomepagePolicyFingerprint||expectedHomepagePolicyFingerprint===homepageCentral.fingerprint,
  centralHomepageRuntimeAuthority:centralHomepage.runtimeAuthority==='company-runtime'&&centralHomepage.serverRuntimeBranch==='company-runtime'&&centralHomepage.publicSourceBranch==='main',
  centralWebShelfPolicyExists:webShelfPolicy.enabled===false&&webShelfPolicy.legacyArchiveOnly===true&&webShelfPolicy.frontDoorVisible===false&&top30ShelfPolicy.enabled===false&&top30ShelfPolicy.mustNotRender===true,
  developmentAndWebShelfPlacementDocumented:developmentDisplay.autoRegisterProductionClass==='DEVELOPMENT_CONFIRMED'&&webShelfPolicy.source==='LEGACY_ARCHIVE_ONLY'&&Array.isArray(centralHomepage.supportedPlatforms)&&centralHomepage.supportedPlatforms.length>0,
  allDeployedGameCardVisibility:developmentDisplay.cardVisibilityRequiresRunnableTarget===false&&developmentDisplay.titleOnlyCardExposureForbidden===false&&centralHomepage.homepageListingContract?.allDeployedGamesVisible===true&&centralHomepage.homepageListingContract?.gameCardVisibilityIndependentOfReleaseClassification===true&&includesAll(enhancementEntry,['const activeLifecycle=row=>','const registered=root===`web-games/${id}`','WITHDRAWN_SIMPLE_PROTOTYPE','function developmentRows(catalog,status)','function hasRunnableHomepageTarget(game)'])&&!enhancementEntry.includes('.filter(hasRunnableHomepageTarget)'),
  homepageUnityWebRetired:roadmap.developmentAccess?.UNITY_WEB!=='ALWAYS_ALLOWED'&&!/unityWebAction|bindAvailableUnityWebSurfaces|unityWebTestUrl/.test(enhancementEntry),
  cleanRunnableShelfPresentation:includesAll(index,['data-runtime-fallback="loading"','실행 가능한 게임을 불러오는 중'])&&includesAll(enhancementEntry,['class="gameShelfHead"','class="gameShelfCount"',"const direct=links.web||links.roblox||links.unity||links.webSource||''",'rows.find(item=>gameIdOf(item)===FEATURED_GAME_ID)']),
  developmentNativeTestButtonsOnly:developmentDisplay.platformTestButtonEnabled===true&&developmentDisplay.platformTestButtonLabelMode==='PLATFORM_NAME'&&includesAll(enhancementEntry,['function platformLinks(game)','robloxAction','unityAction'])&&!/unityWebAction|bindAvailableUnityWebSurfaces/.test(enhancementEntry),
  developmentCurrentScoreRankingAvailable:developmentDisplay.scoreDisplayEnabled===false&&developmentDisplay.scoreSource==='DISABLED_FOR_DIRECT_NATIVE_DEVELOPMENT'&&developmentDisplay.ranking==='CATALOG_ORDER'&&includesAll(enhancementEntry,['catalog?.runtimeInfoAuthority!==\'company-runtime\'','status?.runtimeAuthority!==\'company-runtime\'']),
  documentationSyncPolicyExists:documentationSync.centralPolicyFirst===true&&documentationSync.centralPolicyPath==='company-learning/platform-release-roadmap.json'&&documentationSync.implementationWorkStartsAfterRelevantWorkDocumentsAreSynchronized===true&&documentationSync.humanPolicyMirrorRequired===false&&documentationSync.workDocumentsCannotOverrideCentralPolicy===true,
  centralHomepageManagerContract:homepagePolicy.mode==='SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'&&homepagePolicy.manager==='HOMEPAGE'&&homepagePolicy.supervisor==='DIRECTOR'&&homepagePolicy.managerCount===1&&homepagePolicy.supervisorCount===1&&centralHomepage.directiveMirrorMayNotOverrideCentral===true,
  secondHomepageManagerForbidden:homepagePolicy.secondHomepageManagerForbidden===true&&homepagePolicy.secondHomepageSupervisorForbidden===true,
  indexExists:exists('index.html'),
  homepageEnhancementLoaded:index.includes('/assets/homepage-enhancements.js')||index.includes('assets/homepage-enhancements.js'),
  activeRuntimeLayoutManager:includesAll(enhancementEntry,['const SYNC_INTERVAL_MS=30000;',"SAMPLE_FRONT_DOOR_V1",'function buildFocus(','function buildGameCenter(','async function refresh(','getJson(\'/game-catalog.json\')','getJson(\'/company-status.json\')','catalog?.runtimeInfoAuthority!==\'company-runtime\'','status?.runtimeAuthority!==\'company-runtime\'','setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS)']),
  homepagePortfolioControlSurface:portfolioSnapshot?.publicSafe===true&&Array.isArray(portfolioSnapshot?.games)&&roadmap?.homepagePortfolioVisibility?.departmentPortfolioControl?.enabled===true&&includesAll(enhancementEntry,["getJson('/homepage-portfolio-status.json')",'function buildPortfolioBoard()'])&&!index.includes('homePortfolioBoard'),
  homepageInternalPlatformExposureSurface:platformExposureSnapshot?.version===3&&platformExposureSnapshot?.authority==='company-runtime'&&platformExposureSnapshot?.internalCompanySurface===true&&platformExposureSnapshot?.centralPolicyFingerprint===homepageCentral.fingerprint&&JSON.stringify(platformExposureSnapshot?.supportedPlatforms)===JSON.stringify(centralHomepage.supportedPlatforms)&&Array.isArray(platformExposureSnapshot?.games)&&roadmap?.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.publicExposure?.homepageIsInternalCompanySurface===true&&includesAll(enhancementEntry,["getJson('/homepage-platform-exposure.json')",'const exposureOf=id=>','const exposureLabelOf=id=>']),

  verifiedServerShelfBoundary:includesAll(enhancementEntry,['const displayEligible=row=>','function releaseRows(','function developmentRows(','RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED']),
  platformReadyGameShelfWithFixedWebAction:includesAll(enhancementEntry,['function internalReleaseRows(catalog,status)','function buildGameCenter(',"buildShelf(hub,'homePlatformAvailableGameCenter','출시 게임'","button(links.roblox,`Roblox · ${state('ROBLOX')}`","button(links.unity,`Unity 앱 · ${state('UNITY')}`","function playableWebHref(row)",'dataset.homePlatformAvailableCount','dataset.homeServerAuthority'])&&!enhancementEntry.includes('homeTop30GameCenter')&&!enhancementEntry.includes('const TOP_LIMIT='),
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
  pwaManifestCommandEntry:manifest.id==='/command.html'&&manifest.start_url==='/'&&manifest.scope==='/'&&manifest.display==='standalone',
  pwaManifestIconsPreserved:Array.isArray(manifest.icons)&&manifest.icons.some(x=>x.src==='/assets/pwa-icon-192.png')&&manifest.icons.some(x=>x.src==='/assets/pwa-icon-512.png'),
  installPwaContractPreserved:includesAll(install,['rel="manifest" href="/manifest.webmanifest"','id="installBtn"','beforeinstallprompt',"navigator.serviceWorker.register('/sw.js',{scope:'/'})",'appinstalled']),
  serviceWorkerPwaContractPreserved:includesAll(serviceWorker,["'/command.html'","'/install.html'","'/offline.html'","'/manifest.webmanifest'","self.addEventListener('install'","self.addEventListener('activate'","self.addEventListener('fetch'",'serveCommand(request)']),
  commandChatContractPreserved:includesAll(command,['id="chat"','id="attachBtn"','id="body"','id="sendBtn"','id="claimBtn"','async function send()','async function claim()','function registerPwa()',"navigator.serviceWorker.register('/sw.js')",'attachmentIds:ids']),
  offlineFallbackPresent:offline.length>0,
  ownerFixedFunctionPolicyBound:homepagePolicy?.fixedFunctionProtection?.ownerLocked===true&&homepagePolicy?.fixedFunctionProtection?.changeRequiresLatestOwnerDirectInstruction===true
};
// The owner removed the central roadmap; obsolete policy assertions are not homepage QA.
// Retain checks for catalog correctness, links, game cards, media, PWA and runtime UI.
const removedPolicyChecks=new Set([
  'centralHomepagePolicyExists','centralHomepageRuntimeAuthority',
  'centralWebShelfPolicyExists','developmentAndWebShelfPlacementDocumented',
  'allDeployedGameCardVisibility','homepageUnityWebRetired','developmentNativeTestButtonsOnly',
  'developmentCurrentScoreRankingAvailable','documentationSyncPolicyExists',
  'centralHomepageManagerContract','secondHomepageManagerForbidden',
  'homepagePortfolioControlSurface','homepageInternalPlatformExposureSurface',
  'pwaInstallOwnerFixedContractPreserved','gameDevelopmentAssetLibrarySurface',
  'ownerFixedFunctionPolicyBound'
]);
for(const key of removedPolicyChecks)delete checks[key];
const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
console.log(`HOMEPAGE_MANAGEMENT=${failures.length?'ATTENTION':'PASS'}`);
console.log(`HOMEPAGE_SELF_QA=${Object.keys(checks).length-failures.length}/${Object.keys(checks).length}`);
console.log(`HOMEPAGE_CATALOG_ORDER=${canonicalOrderValid?'CANONICAL_STABLE':'INVALID'}`);
console.log(`HOMEPAGE_CATALOG_SOURCE=${catalogPath}`);console.log(`HOMEPAGE_STATUS_SOURCE=${statusPath}`);console.log(`HOMEPAGE_CATALOG=${games.length}`);console.log(`HOMEPAGE_CANONICAL_RECORDS=${games.filter(game=>canonicalOf(game)?.schemaVersion===1).length}/${games.length}`);console.log(`HOMEPAGE_OFFICIAL_CARD_COUNT=${officialGames.length}`);console.log(`HOMEPAGE_VALIDATION_CANDIDATE_COUNT=${testCandidates.length}`);console.log(`HOMEPAGE_VISIBLE_ARTBOOKS=${visibleBooks.length}`);console.log(`HOMEPAGE_LEGACY_QUEUE_ENTRIES=${legacyQueueEntries.length}`);console.log(`HOMEPAGE_BROKEN_GAME_IMAGES=${brokenGameImages.length}`);console.log(`HOMEPAGE_DUPLICATE_GAME_IMAGES=${duplicateGameImages.length}`);console.log(`HOMEPAGE_PLACEHOLDER_GAME_IMAGES=${placeholderGameImages.length}`);console.log(`HOMEPAGE_PLAYABLE_OFFICIAL_WEB_GAMES=${homepagePlayableGames.length}`);console.log(`HOMEPAGE_BROKEN_WEB_LINKS=${brokenWebGameLinks.length}`);console.log(`HOMEPAGE_BROKEN_VALIDATION_WEB_LINKS=${brokenTestWebRoutes.length}`);console.log(`HOMEPAGE_BROKEN_VALIDATION_ARTBOOKS=${brokenTestArtbooks.length}`);console.log(`HOMEPAGE_PREPROMOTION_OFFICIAL_CARD_VIOLATIONS=${prepromotionOfficialCards.length}`);console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=ALL_NON_EXCLUDED_GAMES');console.log(`HOMEPAGE_DEPLOYED_GAME_CARDS=${games.filter(game=>{const id=canonicalId(game);const state=String(game.canonical?.sources?.web?.state||game.ownerWebSourceState||'').toUpperCase();const registered=String(game.canonical?.sources?.web?.path||game.webPath||'').split('/').filter(Boolean).join('/')===`web-games/${id}`;if(state==='NON_GAME_SURFACE'||!registered)return false;return state!=='WITHDRAWN_SIMPLE_PROTOTYPE'||game.ownerExistingGame===true||game.canonical?.lifecycle?.ownerExistingGame===true||Boolean(game.canonical?.sources?.unity?.projectPath||game.canonical?.sources?.roblox?.projectPath)}).length}`);console.log('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC');console.log('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=DATA_ONLY_SAMPLE_UI_HIDDEN');console.log('HOMEPAGE_DEVELOPMENT_SCORE_SOURCE=CURRENT_INITIAL_CYCLE');console.log('HOMEPAGE_DEVELOPMENT_STALE_SCORE_POLICY=REVALIDATION_NOT_CURRENT');console.log('HOMEPAGE_DEVELOPMENT_ACTIONS=ROBLOX_UNITY_PLUS_OPTIONAL_UNITY_WEB');console.log('HOMEPAGE_LEGACY_WEB_SHELF=HIDDEN');console.log('HOMEPAGE_TOP30_SHELF=DISABLED_VALIDATION_MANIFEST_ONLY');console.log('HOMEPAGE_APK_INSTALL_PLACEMENT=COMPANY_TEAM_BOTTOM');console.log('HOMEPAGE_OFFICIAL_CARD_POLICY=STRICT_PASS_AND_PROMOTION_ONLY');console.log('HOMEPAGE_RUNTIME_SYNC=SERVER_CATALOG_PLUS_NATIVE_PLATFORM_EXPOSURE');console.log(`HOMEPAGE_PORTFOLIO_CONTROL=${checks.homepagePortfolioControlSurface?'PASS':'FAIL'}`);console.log(`HOMEPAGE_PLATFORM_EXPOSURE=${checks.homepageInternalPlatformExposureSurface?'PASS':'FAIL'}`);console.log(`HOMEPAGE_CENTRAL_POLICY_SHA256=${homepageCentral.fingerprint||'INVALID'}`);console.log(`HOMEPAGE_CENTRAL_PLATFORMS=${(centralHomepage.supportedPlatforms||[]).join(',')}`);console.log(`HOMEPAGE_CENTRAL_POLICY_SYNC=${checks.centralHomepageExecutionFingerprint?'PASS':'FAIL'}`);console.log(`HOMEPAGE_DIRECTIVE_MIRROR=${directiveMirrorMatchesCentral?'SYNCED':'STALE_NON_AUTHORITATIVE'}`);console.log('HOMEPAGE_RAW_DESIGN_ONLY_EXECUTION_SHELF=FORBIDDEN');console.log('HOMEPAGE_MANAGER_COUNT=1');console.log('HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1');console.log(`HOMEPAGE_FIXED_PWA_CHAT_CONTRACT=${checks.fixedPwaFilesExist&&checks.pwaManifestCommandEntry&&checks.installPwaContractPreserved&&checks.serviceWorkerPwaContractPreserved&&checks.commandChatContractPreserved?'PASS':'FAIL'}`);
if(failures.length){console.error(`HOMEPAGE_FAILURES=${failures.join(',')}`);process.exitCode=1;}

async function captureReleaseMedia(planOnly=false,{titlesOnly=false}={}){
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
  // 메인: 같은 홈페이지 관리자가 공식 서버 타이틀과 제작 아트를 관리한다.
  if(titlesOnly){
    const queuePath=process.env.HOMEPAGE_QUEUE_PATH||'/tmp/homepage-runtime/development-queue.json';
    const queue=fs.existsSync(queuePath)?json(queuePath):{items:[]};
    const targets=new Map();
    for(const item of queue.items||[]){
      const published=item.robloxDedicatedExperience;
      const dedicated=published?.gameId===item.gameId&&published?.state==='PASS'&&published?.published===true
        &&/^[a-f0-9]{40}$/i.test(published.sourceRevision||'')&&/^sha256:[a-f0-9]{64}$/i.test(published.artifactIdentity||'');
      const target=item.robloxPublicationTarget||(dedicated?{...published,verified:true,dedicated:true,shared:false}:{});
      if(target.verified!==true||target.dedicated!==true||target.shared===true||target.gameId&&target.gameId!==item.gameId)continue;
      if(!/^[1-9][0-9]*$/.test(String(target.universeId))||!/^[1-9][0-9]*$/.test(String(target.placeId)))continue;
      const universe=String(target.universeId);
      if(targets.has(universe)){targets.set(universe,null);continue;}
      targets.set(universe,{...target,gameId:item.gameId});
    }
    const observed=new Map();
    const ids=[...targets].filter(([,target])=>target).map(([id])=>id);
    for(let start=0;start<ids.length;start+=20){
      try{
        const endpoint='https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds='+ids.slice(start,start+20).join(',')+'&countPerUniverse=1&defaults=false&size=768x432&format=Png&isCircular=false';
        const response=await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error('HTTP_'+response.status);
        const body=await response.json();
        for(const row of body.data||[]){
          const universe=String(row.universeId),target=targets.get(universe);
          if(!target||!ids.slice(start,start+20).includes(universe))continue;
          const thumb=(row.thumbnails||[]).find(t=>t.state==='Completed'&&t.imageUrl);
          if(!thumb)continue;
          const url=new URL(thumb.imageUrl);
          if(url.protocol!=='https:'||url.username||url.password||url.port||!/(^|\.)rbxcdn\.com$/i.test(url.hostname))continue;
          observed.set(target.gameId,{gameId:target.gameId,universeId:universe,placeId:String(target.placeId),src:url.href,
            source:'ROBLOX_OFFICIAL_THUMBNAIL_API',verified:true,thumbnailId:String(thumb.targetId||''),runtimeScreenshot:false});
        }
      }catch(error){console.log('HOMEPAGE_ROBLOX_TITLE_PENDING='+String(error.message).slice(0,180));}
    }
    let changed=false,generated=0,synced=0;
    const ownerStopped=new Set(catalog.ownerStoppedGameIds||[]);
    for(const game of catalog.games||[]){
      const id=game.canonical?.identity?.gameId||game.id;
      if(!/^[a-z0-9][a-z0-9-]*$/.test(id)||ownerStopped.has(id)||game.ownerDevelopmentStopped===true
        ||['WITHDRAWN','ARCHIVED','DELETED','OWNER_STOPPED','STOPPED'].includes(game.canonical?.lifecycle?.state||game.lifecycleState))continue;
      const server=observed.get(id);
      const target=[...targets.values()].find(t=>t?.gameId===id);
      const previous=game.robloxThumbnail;
      if(server){
        if(JSON.stringify(previous)!==JSON.stringify(server)){game.robloxThumbnail=server;changed=true;}
        synced++;
      }else if(previous&&(!target||previous.universeId!==String(target.universeId)||previous.placeId!==String(target.placeId))){
        delete game.robloxThumbnail;changed=true;
      }
      // 제작 아트는 실제 플레이 화면으로 표시하지 않고 원본 이미지를 보존한다.
      const name=String(game.canonical?.identity?.name||game.name||id);
      const existingArt=media.games?.[id];
      const libraryCover=[existingArt?.cover,existingArt?.small].find(asset=>asset?.src
        &&asset.src.startsWith('assets/homepage-covers/'+id+'.')
        &&/\.(webp|png|jpe?g)$/i.test(asset.src)&&fs.existsSync(asset.src));
      if(libraryCover){
        const sourceHash=createHash('sha256').update(fs.readFileSync(libraryCover.src)).digest('hex');
        const reused={gameId:id,src:libraryCover.src,sha256:sourceHash,style:'ROBLOX_LIBRARY_TITLE_ARTWORK',source:'EXISTING_GAME_TITLE_ARTWORK',runtimeScreenshot:false,
          small:existingArt?.small?.src==='assets/homepage-covers/'+id+'-480.webp'?existingArt.small:null};
        if(JSON.stringify(game.robloxTitleArtwork)!==JSON.stringify(reused)){game.robloxTitleArtwork=reused;changed=true;}
        if(game.canonical?.marketing){game.canonical.marketing.robloxThumbnail=game.robloxThumbnail||null;game.canonical.marketing.robloxTitleArtwork=reused;}
        continue;
      }
      const identity=createHash('sha256').update(id+':'+name+':ROBLOX_BLOCK_AVATAR_V1').digest('hex');
      const file='assets/homepage-covers/'+id+'-roblox.svg';
      const artwork={gameId:id,src:file,sha256:identity,style:'ROBLOX_BLOCK_AVATAR_V1',source:'HOMEPAGE_MANAGER_TITLE_ARTWORK',runtimeScreenshot:false};
      if(game.robloxTitleArtwork?.sha256!==identity||!fs.existsSync(file)){
        const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
        const hue=parseInt(identity.slice(0,6),16)%360;
        const title=xml(name),dark=/(horror|escape|퇴마|귀신|심야)/i.test(id+' '+name);
        const scene=/(school|학교|교실|수업|학생)/i.test(id+' '+name)?'SCHOOL':/(island|village|cozy|포근|마을)/i.test(id+' '+name)?'VILLAGE':/(survival|생존)/i.test(id+' '+name)?'FOREST':dark?'MANOR':'PORTAL';
        const props=scene==='SCHOOL'?'<path d="M180 655V325h480v330m570-35V215h505v405" fill="#d4aa80" stroke="#f2d9b9" stroke-width="15"/><path d="M145 325l275-160 275 160zm1055-110l295-160 295 160z" fill="#405b89"/><rect x="340" y="415" width="160" height="155" fill="#516c96"/><rect x="1380" y="290" width="185" height="170" fill="#566c91"/><path d="M1420 355h100m-50-45v105" stroke="#deedf8" stroke-width="17"/><rect x="320" y="245" width="205" height="62" rx="12" fill="#234e42"/><text x="422" y="289" font-family="sans-serif" font-size="36" font-weight="800" text-anchor="middle" fill="#e9f5ea">SCHOOL</text>':scene==='FOREST'?'<path d="M230 570l140-250 140 250zm1030-30l150-300 150 300z" fill="#27785a"/><path d="M370 570v150m1040-180v210" stroke="#684d36" stroke-width="48"/>':scene==='VILLAGE'||scene==='MANOR'?'<path d="M190 620V400h400v220M1240 600V320h430v280" fill="#d0b69b"/><path d="M150 400l240-175 240 175zm1050-80l255-190 255 190z" fill="#465987"/><path d="M290 620V470h110v150m1080-20V400h120v200" fill="#334557"/>':'<ellipse cx="1350" cy="470" rx="180" ry="280" fill="#081d49" stroke="#65e6ff" stroke-width="36"/><ellipse cx="350" cy="440" rx="100" ry="190" fill="#1e2256" stroke="#ba91ff" stroke-width="22"/>';
        const avatar=(x,y,color)=>`<g transform="translate(${x} ${y})"><path d="M-88 50l176 0 28 180H-110z" fill="${color}"/><path d="M-110 80l-70 20v160h65M110 80l70 20v160h-65" fill="#eec59c"/><path d="M-80 230v160h70V250M80 230v160H10V250" fill="#23364b"/><rect x="-75" y="-105" width="150" height="145" rx="17" fill="#f2d0a4"/><path d="M-75-70v-45h150v45" fill="#384353"/><path d="M-29-42v18m58-18v18" stroke="#263447" stroke-width="13"/><path d="M-25 2h50" stroke="#263447" stroke-width="8"/><path d="M-110 50l22-25h176l22 25" fill="#ffffff" opacity=".22"/></g>`;
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" role="img"><title>${title}</title><desc>게임별 블록형 캐릭터 타이틀 제작 아트. 실제 플레이 캡처 아님.</desc><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="hsl(${hue} 55% ${dark?15:40}%)"/><stop offset="1" stop-color="#172b46"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="20" stdDeviation="16" flood-opacity=".4"/></filter></defs><rect width="1920" height="1080" fill="url(#sky)"/><circle cx="1580" cy="190" r="100" fill="#fff0ba" opacity=".8"/><path d="M0 720l580-150 740 0 600 150v360H0z" fill="#24495a"/><path d="M530 1080l310-470h260l330 470" fill="#647c83"/>${props}<g filter="url(#shadow)">${avatar(860,510,'#d98738')}${avatar(1100,565,'#586ccb')}</g><rect x="70" y="55" width="1780" height="220" rx="38" fill="#0c1727" opacity=".82"/><text x="960" y="200" text-anchor="middle" font-family="sans-serif" font-size="${name.length>20?64:88}" font-weight="900" fill="#fff5d5">${title}</text><text x="960" y="1010" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#c6d6e9">타이틀 아트 · ${title}</text></svg>`;
        fs.mkdirSync('assets/homepage-covers',{recursive:true});fs.writeFileSync(file,svg);generated++;
        game.robloxTitleArtwork=artwork;changed=true;
      }
      if(game.canonical?.marketing){game.canonical.marketing.robloxThumbnail=game.robloxThumbnail||null;game.canonical.marketing.robloxTitleArtwork=game.robloxTitleArtwork;}
    }
    if(changed)fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
    console.log('HOMEPAGE_ROBLOX_SERVER_TITLES='+synced);
    console.log('HOMEPAGE_BLOCK_AVATAR_TITLE_ARTWORK_CREATED='+generated);
    return;
  }

  const gameFilter=process.argv.find(x=>x.startsWith('--media-game='))?.slice(13);
  const candidates=[];
  const captureVersion=3;
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
    if(current?.video?.artifactIdentity===artifactIdentity&&current.screenshots?.length)continue;
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
        context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:temp,size:{width:1920,height:1080}},serviceWorkers:'block'});
        const page=await context.newPage();
        const captureStartedAt=Date.now();
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
        const known={ 'horror-escape-room':'#startHuman', 'daechung-rpg':'#startBtn' };
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
        const clipStart=Math.max(0,(Date.now()-captureStartedAt)/1000);
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
        // 추출·크기·해시 검증을 끝낸 뒤에만 실제 플레이 사진과 편집 영상을 게시한다.
        const capturedAt=new Date().toISOString();
        const frames=[];
        for(const second of [2,6,10].filter(value=>value<duration-.25)){
          const n=frames.length+1;
          const temporaryFrame=temp+'/'+id+'-'+n+'.jpg';
          execFileSync('ffmpeg',['-y','-loglevel','error','-ss',String(clipStart+second),
            '-i',videoPath,'-frames:v','1','-vf','scale=1920:1080:flags=lanczos,setsar=1',
            '-q:v','6','-update','1',temporaryFrame],{timeout:45000,stdio:'pipe'});
          const dimensions=execFileSync('ffprobe',['-v','error','-select_streams','v:0',
            '-show_entries','stream=width,height','-of','csv=s=x:p=0',temporaryFrame],{encoding:'utf8'}).trim();
          const imageBytes=fs.readFileSync(temporaryFrame),sha256=digest(imageBytes);
          if(dimensions!=='1920x1080'||imageBytes.length<1024||imageBytes.length>1048576
            ||imageBytes[0]!==0xff||imageBytes[1]!==0xd8
            ||imageBytes[imageBytes.length-2]!==0xff||imageBytes[imageBytes.length-1]!==0xd9)throw Error('GAMEPLAY_FRAME_INVALID');
          if(frames.some(frame=>frame.sha256===sha256)){fs.rmSync(temporaryFrame,{force:true});continue;}
          frames.push({gameId:id,platform,sourceRevision,artifactIdentity,capturedAt,
            source:'ACTUAL_GAMEPLAY_VIDEO_FRAME',src:'assets/homepage-media/'+id+'-'+n+'.jpg',
            bytes:imageBytes.length,sha256,width:1920,height:1080,second,
            temporaryFrame});
        }
        if(!frames.length)throw Error('GAMEPLAY_FRAME_MISSING');
        // 기존 검증 영상을 덮지 않고 게임별 성공 결과만 반영한다.
        for(const frame of frames)fs.copyFileSync(frame.temporaryFrame,frame.src);
        fs.copyFileSync(temporaryOutput,output);
        media.games[id].video={gameId:id,platform,sourceRevision,artifactIdentity,capturedAt,
          src:output,bytes:bytes.length,sha256:digest(bytes),dependencies,seconds:duration,
          width:640,height:360,runtimeVerification:{pass:true,inputEvents,visualChangeObserved:true,
          scriptErrors:0,purpose:'MARKETING_CAPTURE_ONLY_NOT_F0_F9_ACCEPTANCE'}};
        media.games[id].screenshots=frames.map(({temporaryFrame,...frame})=>frame);
        delete media.games[id].captureAttempt;
        console.log('HOMEPAGE_RELEASE_MEDIA_CAPTURED='+id+' PLATFORM='+platform+' BYTES='+bytes.length+' FRAMES='+frames.length+' RESOLUTION=1920x1080');
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

