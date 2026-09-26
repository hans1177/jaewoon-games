import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const testSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
const artbookTool=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');
const legacyHomepagePolicyMirror=['HOMEPAGE','OPERATIONS.md'].join('_');

const section=(from,to)=>{
  const start=workflow.indexOf(from);
  const end=to?workflow.indexOf(to,start+from.length):workflow.length;
  assert.notEqual(start,-1,`missing section: ${from}`);
  assert.ok(end>start,`invalid section boundary: ${from}`);
  return workflow.slice(start,end);
};

test('legacy homepage policy mirror stays removed and machine roadmap remains authoritative',()=>{
  assert.equal(fs.existsSync(legacyHomepagePolicyMirror),false);
  assert.equal(directive.policyDocument,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyMirror'),false);
  assert.equal(roadmap.centralDocumentation.legacyPolicyCleanup.status,'REMOVED_FROM_ACTIVE_REPOSITORY');
});

test('pull requests use shallow impact-scoped homepage QA instead of the full publication pipeline',()=>{
  const fast=section('  pr-fast-qa:','  manage-and-self-qa:');
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:');
  assert.match(fast,/name: Homepage PR Fast QA/);
  assert.match(fast,/fetch-depth: 1/);
  assert.match(fast,/filter: blob:none/);
  assert.match(fast,/sparse-checkout-cone-mode: false/);
  assert.match(fast,/Run impact-scoped homepage QA/);
  assert.match(fast,/HOMEPAGE_PR_FAST_QA=PASS/);
  assert.match(manage,/if: github\.event_name != 'pull_request'/);
  assert.match(director,/if: github\.event_name != 'pull_request'/);
  assert.doesNotMatch(workflow,/fetch-depth: 0/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(workflow,/git fetch --depth=1 --no-tags origin "\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(workflow,/git fetch --depth=1 --no-tags origin "\$CONTROL_BRANCH"/);
});

test('Director reviews and publishes the exact Homepage Manager candidate in one post-work stage',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:');
  assert.ok(manage.includes('Capture exact self-QA candidate'));
  assert.ok(manage.includes('actions/upload-artifact@v4'));
  assert.ok(manage.includes('homepage-candidate.patch'));
  assert.ok(director.includes('needs: manage-and-self-qa'));
  assert.ok(director.includes('actions/download-artifact@v4'));
  assert.ok(director.includes('Verify and apply exact self-QA candidate'));
  assert.ok(director.includes('sha256sum'));
  assert.ok(director.includes('Publish Director-approved homepage candidate'));
  assert.ok(director.includes('gh pr create'));
  assert.ok(director.includes('gh pr merge'));
  assert.match(director,/gh pr merge "\$pr_url" --repo "\$GITHUB_REPOSITORY" --squash/);
  assert.doesNotMatch(director,/gh pr merge[^\n]*--delete-branch/);
  assert.match(director,/git push origin --delete "\$branch"/);
  assert.doesNotMatch(workflow,/\\n  publish-after-director:/);
});

test('homepage workflow heredoc delimiters stay at the YAML block indentation',()=>{
  assert.doesNotMatch(workflow,/^ {12}NODE$/m);
  assert.match(workflow,/^ {10}NODE$/m);
});

test('verified runtime status and catalog join the same supervised publication candidate',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:');
  for(const file of ['company-status.json','game-catalog.json','test-game-candidates.json','game-artbooks.json']){
    assert.ok(manage.includes(file),`candidate capture missing ${file}`);
    assert.ok(director.includes(file),`publication missing ${file}`);
  }
  assert.ok(manage.includes('Prepare verified runtime status/catalog candidate'));
  assert.ok(manage.includes('HOMEPAGE_PUBLIC_STATUS_SYNC=YES'));
  assert.match(manage,/HOMEPAGE_STATUS_SYNC_TRIGGER=.*COMPANY_RUNTIME/);
  assert.equal(roadmap.serverHomepageIntegration?.runtimeCatalogPublication?.onEverySuccessfulNonPrHomepageSync,true);
  assert.equal(roadmap.serverHomepageIntegration?.runtimeCatalogPublication?.sourceIsAuthoritative,true);
  assert.equal(roadmap.serverHomepageIntegration?.runtimeCatalogPublication?.mode,'RECONCILE_RUNTIME_STATE_ON_CANONICAL_MAIN_REGISTRY');
  assert.equal(roadmap.serverHomepageIntegration?.runtimeCatalogPublication?.rawRuntimeCatalogDirectCopyForbidden,true);
  assert.equal(roadmap.serverHomepageIntegration?.runtimeCatalogPublication?.existingCatalogSourceMetadataMustBePreserved,true);
  assert.equal(roadmap.serverHomepageIntegration?.runtimeCatalogPublication?.canonicalNormalizationRequiredBeforePublication,true);
  assert.match(manage,/HOMEPAGE_RUNTIME_CATALOG_RECONCILE=PASS/);
  assert.match(manage,/mergeRuntimeCatalogMissingGames/);
  assert.match(manage,/syncProductionClasses/);
  assert.match(manage,/applyHomepageRuntimeInfo/);
  assert.match(manage,/validateNormalizedCatalog/);
  assert.doesNotMatch(manage,/cp \/tmp\/homepage-runtime\/runtime-game-catalog\.json game-catalog\.json/);
});

test('homepage live runtime state bypasses the PWA cache',()=>{
  const sw=fs.readFileSync('sw.js','utf8');
  assert.match(sw,/const CACHE_NAME='jaewoon-pwa-v25'/);
  for(const path of ['homepage-platform-exposure','homepage-portfolio-status','test-game-candidates'])assert.ok(sw.includes(path),`service worker network-only list missing ${path}`);
  assert.ok(sw.includes('/assets\\/homepage-enhancements\\.js'), 'homepage renderer must stay network-only');
});

test('homepage mirror exposes the three dedicated internal Roblox links',()=>{
  const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
  const expected={
    'cozy-island':'116850096561713',
    'daechung-rpg':'126302702438348',
    'horror-escape-room':'98222620265768',
  };
  for(const [gameId,placeId] of Object.entries(expected)){
    const game=(exposure.games||[]).find(row=>row.gameId===gameId);
    const roblox=(game?.platforms||[]).find(row=>row.platform==='ROBLOX');
    assert.equal(roblox?.placeId,placeId);
    assert.equal(roblox?.internalUrl,`https://www.roblox.com/games/${placeId}`);
    assert.equal(roblox?.internalReleaseReady,true);
    assert.equal(roblox?.internalLinkSuppressedReason,null);
  }
});

test('homepage keeps the three current internal releases visible before runtime sync',()=>{
  const index=fs.readFileSync('index.html','utf8');
  assert.match(index,/id="homeInternalReleaseFallback"/);
  for(const id of ['cozy-island','daechung-rpg','horror-escape-room'])assert.match(index,new RegExp(`data-game-id="${id}"`));
  for(const title of ['포근섬: 작은 왕국 키우기','5포탈 RPG: 던전 파티','심야 감염전 \\[4대4\\]'])assert.match(index,new RegExp(title));
  assert.match(index,/Roblox · 내부출시/);
  for(const placeId of ['116850096561713','126302702438348','98222620265768'])assert.match(index,new RegExp(`href="https:\\/\\/www\\.roblox\\.com\\/games\\/${placeId}"`));
  for(const [gameId,image] of Object.entries({
    'cozy-island':'/assets/roblox-thumbnails/cozy-island.svg',
    'daechung-rpg':'/assets/roblox-thumbnails/daechung-rpg.svg',
    'horror-escape-room':'/assets/roblox-thumbnails/horror-escape-room.svg'
  })){
    const card=index.match(new RegExp('<article class="foldGameCard" data-game-id="'+gameId+'">[\\s\\S]*?<\\/article>'))?.[0]||'';
    assert.ok(card.includes('src="'+image+'"'),gameId+' fallback image must match canonical marketing art');
  }
  assert.match(homepage,/homeInternalReleaseFallback/);
  assert.match(homepage,/document\.getElementById\(id\)\?\.remove\(\)/);
});

test('homepage shows native, Unity Web, and server-catalog playable web actions',()=>{
  assert.equal(fs.existsSync('assets/homepage-enhancements-core.js'),false);
  assert.match(homepage,/const SYNC_INTERVAL_MS=30000/);
  assert.match(homepage,/getJson\('\/game-catalog\.json'\)/);
  assert.match(homepage,/getJson\('\/company-status\.json'\)/);
  assert.match(homepage,/getJson\('\/homepage-platform-exposure\.json'\)/);
  assert.match(homepage,/function internalReleaseRows\(catalog,status\)/);
  assert.match(homepage,/function internalReleaseLinks\(game\)/);
  assert.match(homepage,/buildShelf\(hub,'homePlatformAvailableGameCenter','출시 게임'/);
  assert.match(homepage,/robloxAction/);
  assert.match(homepage,/unityAction/);
  assert.match(homepage,/unityWebAction/);
  assert.match(homepage,/Unity Web · 개발중/);
  assert.doesNotMatch(homepage,/아트북 보기|foldGameArtbookBtn|homepageArtbookPath/);
  assert.match(homepage,/웹 플레이/);
  assert.match(homepage,/function playableWebHref\(row\)/);
  assert.doesNotMatch(homepage,/Fortnite 개발중|fortniteAction/);
  assert.match(homepage,/dataset\.homePlatformAvailableCount/);
  assert.doesNotMatch(homepage,/homeTop30GameCenter|const TOP_LIMIT=/);
});

test('homepage shows recent modification reflection instead of the old development flow',()=>{
  const index=fs.readFileSync('index.html','utf8');
  assert.match(index,/id="recentUpdates"/);
  assert.match(index,/최근 수정 반영/);
  assert.match(index,/id="recentUpdateList"/);
  assert.doesNotMatch(index,/id="developmentPipeline"/);
  assert.match(homepage,/function recentModificationRows\(catalog\)/);
  assert.match(homepage,/function buildRecentUpdates\(catalog\)/);
  assert.match(homepage,/최신 지시 반영 상태를 확인 중/);
  assert.match(homepage,/buildRecentUpdates\(catalog\)/);
});

test('verified Roblox deployment history is independent of the primary selected platform',()=>{
  assert.match(homepage,/const displayPlatform=row=>/);
  assert.match(homepage,/function verifiedRobloxDeploymentRows\(catalog\)/);
  assert.match(homepage,/historicalPublicationTargetVerified===true/);
  assert.match(homepage,/homepageDisplayMode:'ROBLOX_HISTORICAL_DEPLOYMENT'/);
  assert.doesNotMatch(homepage,/normalizePlatform\(selectedPlatform\(game\)\)!=='ROBLOX'/);
  assert.match(homepage,/const canonical=publicationOf\(game\)\.roblox\|\|\{\}/);
});

test('homepage native launch paths stay bound to company-runtime exposure evidence',()=>{
  assert.match(homepage,/function platformLinks\(game\)/);
  assert.match(homepage,/function internalReleaseLinks\(game\)/);
  assert.match(homepage,/internalReleaseReady===true/);
  assert.match(homepage,/publicRelease===true\?rp\.publicUrl:rp\.internalUrl/);
  assert.match(homepage,/publicRelease===true\?up\.publicUrl:up\.internalUrl/);
  assert.doesNotMatch(homepage,/https:\/\/www\.roblox\.com\/games\/\$\{placeId\}/);
  assert.match(homepage,/const direct=links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|''/);
  assert.match(homepage,/exposureAuthority/);
  assert.match(homepage,/JSON\.stringify\(exposurePlatforms\)!==JSON\.stringify\(\['ROBLOX','UNITY'\]\)/);
  assert.match(homepage,/function bindDirectGameLaunch\(\)/);
  assert.match(homepage,/data-direct-play|dataset\.directPlay/);
});

test('central development orchestrator runs Unity Web floor before new Roblox and Unity work without API dispatch',()=>{
  const development=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const admission=fs.readFileSync('tools/company-upper-platform-admission.mjs','utf8');
  assert.match(admission,/MINIMUM_DESIGN_CONTRACT_REQUIRED/);
  assert.match(admission,/DUAL_PLATFORM_DESIGN_PROFILE_REQUIRED/);
  assert.match(development,/eligible_json:/);
  assert.match(development,/unity_web_json:/);
  assert.match(development,/UNITY_WEB_FLOOR_BOOTSTRAP_IDS/);
  assert.match(development,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.match(admission,/upper-platform-development-readiness\.json/);
  assert.match(admission,/READINESS_SOURCE_STALE/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(development,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.doesNotMatch(development,/gh workflow run (?:company-development|unity-web)/);
  assert.doesNotMatch(development,/WEB_PRESENTATION_HANDOFF_REJECTED/);
});

test('validation candidate evidence sync remains semantic-idempotent and is not a homepage shelf',()=>{
  assert.match(testSync,/const minimumValidationSchema=WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(testSync,/evaluateWebValidationEvidence/);
  assert.match(testSync,/requireFinalContentDepth:true/);
  assert.match(testSync,/const semanticJson=value=>/);
  assert.match(testSync,/delete copy\.updatedAt/);
  assert.match(testSync,/const writeJsonIfSemanticChanged=/);
  assert.match(testSync,/HOMEPAGE_TEST_SYNC_NOOP=/);
  assert.match(testSync,/HOMEPAGE_TEST_SYNC_CHANGED=/);
  assert.equal(roadmap.homepagePresentation?.top30Shelf?.testCandidateManifestIsHomepageShelf,false);
  assert.doesNotMatch(homepage,/homeTop30GameCenter/);
});

test('successful runtime events must bind company-runtime before homepage publication',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  assert.match(manage,/HOMEPAGE_PUBLIC_STATUS_SYNC=YES/);
  assert.match(manage,/Successful runtime workflow could not bind company-runtime/);
  assert.match(manage,/exit 1/);
  assert.equal(roadmap.serverHomepageIntegration?.staleMainFallbackAfterSuccessfulRuntimeEventForbidden,true);
});

test('PR creation failure remains a blocking publication failure inside Director stage',()=>{
  const director=section('  director-supervision:');
  assert.ok(director.includes('HOMEPAGE_PUBLICATION_BRANCH_READY=$branch'));
  assert.ok(director.includes('HOMEPAGE_PUBLICATION=BLOCKED_PR_PERMISSION_REQUIRED'));
  assert.ok(director.includes('exit 1'));
});

test('new native development admission requires Unity Web upper-platform readiness',()=>{
  const dual=roadmap.directNativeDualPlatformDevelopment||{};
  assert.equal(dual.status,'OWNER_DIRECT_LOCKED');
  assert.equal(dual.unityWebEnabled,true);
  assert.equal(dual.unityWebRequired,true);
  assert.equal(dual.unityWebGateRequired,true);
  assert.equal(dual.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(dual.upperPlatformAdmission,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(dual.upperPlatformDevelopmentReadinessGate?.gateId,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(dual.upperPlatformAdmissionMigration?.existingNativeDevelopmentGrandfathered,true);
  assert.deepEqual(dual.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(roadmap.developmentLifecycleMachine?.targetPlatformDevelopment?.admissionGate,'UPPER_PLATFORM_DEVELOPMENT_READY');
});

test('homepage manager keeps machine self-QA and one post-work Director supervisor',()=>{
  const policy=directive.homepageOperations||{};
  assert.equal(policy.mode,'SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR');
  assert.equal(policy.managerCount,1);
  assert.equal(policy.supervisorCount,1);
  assert.equal(policy.secondHomepageManagerForbidden,true);
  assert.equal(policy.secondHomepageSupervisorForbidden,true);
  assert.match(manager,/HOMEPAGE_MANAGER_COUNT=1/);
  assert.match(manager,/HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1/);
});

test('homepage front door matches approved sample on desktop and mobile',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const front=roadmap.homepagePresentation?.frontDoor||{};
  assert.equal(front.mode,'SAMPLE_FRONT_DOOR_V1');
  assert.equal(front.legacyMixingForbidden,true);
  assert.deepEqual(front.order,['HEADER','FEATURED_GAME','THREE_METRICS','PLATFORM_AVAILABLE','IN_DEVELOPMENT','RECENT_UPDATES','FOOTER']);
  assert.deepEqual(front.mobile?.navItems,['HOME','GAME','GAME_DEVELOPMENT','CHATGPT']);
  assert.equal(front.gameDevelopmentSurface?.enabled,true);
  assert.equal(front.gameDevelopmentSurface?.route,'/asset-library.html');
  assert.equal(front.gameDevelopmentSurface?.registry,'/company-asset-library.json');
  assert.match(index,/href="\/asset-library\.html"/);
  const assetLibrarySurface=fs.readFileSync('asset-library.html','utf8');
  assert.match(assetLibrarySurface,/회사 에셋 라이브러리/);
  assert.match(assetLibrarySurface,/data-asset-library-version="[1-9]\d*"/);
  assert.match(manager,/data-asset-library-version="\[1-9\]\\d\*"/);
  assert.doesNotMatch(manager,/data-asset-library-version="1"/);
  const library=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  assert.equal(library.publicInspectionSurface,true);
  assert.equal(library.productionPassAuthority,false);
  assert.equal(front.mobile?.fixedBottomNavigation,true);
  assert.equal(front.mobile?.horizontalGameCards,true);
  assert.match(index,/JAEWOON <span>GAMES<\/span>/);
  assert.match(index,/class="mainNav"/);
  assert.match(index,/class="mobileDock"/);
  assert.match(index,/id="metricPlayable"/);
  assert.match(index,/id="metricDevelopment"/);
  assert.match(index,/id="metricRecent"/);
  assert.match(index,/id="recentUpdates"/);
  assert.ok(index.indexOf('id="hero"')<index.indexOf('class="stats opsBar"'));
  assert.ok(index.indexOf('id="gameHub"')<index.indexOf('id="recentUpdates"'));
  assert.doesNotMatch(index,/class="reviews"|class="music"|id="developerProfile"|platformFilters|stateFilters|gameSearch|gameSort/);
});

test('homepage workflow follows central architecture changes',()=>{
  const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  assert.match(workflow,/company-learning\/company-architecture-map\.json/);
  assert.match(workflow,/company-learning\/platform-release-roadmap\.json/);
  assert.match(workflow,/JSON\.parse[\s\S]*company-learning\/company-architecture-map\.json/);
});

test('Director does not rerun the full Homepage Manager contract',()=>{
  const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  const director=workflow.split('  director-supervision:')[1]||'';
  assert.doesNotMatch(director,/node tools\/homepage-manager\.mjs/);
  assert.match(director,/Recheck owner-fixed PWA and chat contract/);
  assert.match(director,/DIRECTOR_EXACT_HOMEPAGE_CANDIDATE=BOUND/);
});

test('runtime homepage renderer preserves approved sample front door',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(runtime,/SAMPLE_FRONT_DOOR_V1/);
  assert.match(index,/gameShelfGrid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(index,/scroll-snap-type:x mandatory/);
  assert.match(index,/foldGameCard\{flex:0 0 78vw/);
  assert.doesNotMatch(index,/class="reviews"/);
  assert.doesNotMatch(index,/class="music"/);
  assert.doesNotMatch(index,/id="developerProfile"/);
});

test('portfolio control data stays off the public sample front door',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const block=(runtime.split('function buildPortfolioBoard(){')[1]||'').split('function buildGameCenter')[0]||'';
  assert.match(block,/homePortfolioBoard/);
  assert.doesNotMatch(block,/createElement\('section'\)/);
  assert.doesNotMatch(index,/homePortfolioBoard/);
});

test('homepage has one canonical runtime data renderer',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(index,/\nloadData\(\);/);
  assert.match(runtime,/function updateLiveSummary\(catalog,status\)/);
  assert.match(runtime,/const renderCatalog=currentCatalog=>/);
  assert.match(runtime,/renderCatalog\(catalog\);/);
  assert.match(runtime,/const boundCatalog=await bindAvailableUnityWebSurfaces\(catalog\)/);
  assert.match(runtime,/renderCatalog\(boundCatalog\);/);
  assert.match(runtime,/getJson\('\/game-catalog\.json'\)/);
  assert.match(runtime,/getJson\('\/company-status\.json'\)/);
});

test('homepage live polling is bounded and event-assisted',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(runtime,/const SYNC_INTERVAL_MS=30000;/);
  assert.match(runtime,/window\.addEventListener\('focus',refresh\)/);
  assert.match(runtime,/window\.addEventListener\('online',refresh\)/);
  assert.match(runtime,/visibilitychange/);
});

test('public homepage matches the approved sample structure without legacy mixing',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(index,/JAEWOON <span>GAMES<\/span>/);
  assert.match(index,/id="hero"/);
  assert.match(index,/id="metricPlayable"/);
  assert.match(index,/id="metricDevelopment"/);
  assert.match(index,/id="metricRecent"/);
  assert.match(index,/id="gameHub"/);
  assert.match(index,/id="recentUpdates"/);
  assert.doesNotMatch(index,/게임평 한마디|Developer 한재운|게임 & 지브리 음악|platformFilters|stateFilters|gameSearch|gameSort/);
  assert.match(runtime,/buildShelf\(hub,'homePlatformAvailableGameCenter','출시 게임'/);
  assert.match(runtime,/buildShelf\(hub,'homeDevelopmentGameCenter','개발 중'/);
  assert.match(runtime,/function buildRecentUpdates\(catalog\)/);
  assert.doesNotMatch(runtime,/buildShelf\(hub,'homeWebGameCenter'/);
  assert.doesNotMatch(runtime,/buildShelf\(hub,'homeReleaseGameCenter'/);
});

test('sample front door keeps operational metadata data-only',()=>{
  const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const index=fs.readFileSync('index.html','utf8');
  assert.match(homepage,/const scoreState=row=>/);
  assert.match(homepage,/getJson\('\/homepage-platform-exposure\.json'\)/);
  assert.doesNotMatch(index,/strictScore|server-score|id=["']homePortfolioBoard["']|data-exposure/i);
});

test('homepage exposes a stable deployment verification marker',()=>{
  const index=fs.readFileSync('index.html','utf8');
  assert.match(index,/data-homepage-version="SAMPLE_FRONT_DOOR_V1"/);
  assert.match(index,/data-homepage-build="2026-09-21-sample-exact"/);
});

test('sample hero and cards stay free of legacy operational badges',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const focus=(runtime.split('function buildFocus(catalog,status){')[1]||'').split('function buildCard(row){')[0]||'';
  const card=(runtime.split('function buildCard(row){')[1]||'').split('function buildShelf')[0]||'';
  assert.doesNotMatch(focus,/homeFocusMeta|statusLabel|genreState|playState/);
  assert.doesNotMatch(card,/foldBadges|foldBadge|statusLabel/);
  assert.match(card,/<h3>\$\{esc\(game\.name\)\}<\/h3>/);
});

test('homepage workflow validates the exact sample deployment contract',()=>{
  const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  assert.match(workflow,/data-homepage-version="SAMPLE_FRONT_DOOR_V1"/);
  assert.match(workflow,/data-homepage-build="2026-09-21-sample-exact"/);
  assert.match(workflow,/https:\/\/chatgpt\.com\//);
  assert.match(workflow,/SYNC_INTERVAL_MS=30000/);
});

test('featured hero is explicit and ChatGPT launcher is app-first with safe fallback',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(runtime,/const FEATURED_GAME_ID='daechung-rpg'/);
  assert.match(runtime,/rows\.find\(item=>gameIdOf\(item\)===FEATURED_GAME_ID\)\|\|rows\[0\]/);
  assert.match(index,/package=com\.openai\.chatgpt/);
  assert.match(index,/\/command\.html\?from=chatgpt-shortcut/);
  assert.match(index,/function openChatGpt\(\)/);
});

test('game cards expose Roblox, Unity app, and in-development Unity Web tracks',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const index=fs.readFileSync('index.html','utf8');
  assert.match(runtime,/function platformLinks\(game\)/);
  assert.match(runtime,/robloxAction/);
  assert.match(runtime,/unityAction/);
  assert.match(runtime,/unityWebAction/);
  assert.match(runtime,/links\.roblox/);
  assert.match(runtime,/links\.unity/);
  assert.match(runtime,/Unity Web · 개발중/);
  assert.match(runtime,/웹 플레이/);
  assert.match(runtime,/button\(links\.web,'웹 플레이'/);
  assert.doesNotMatch(runtime,/button\(links\.fortnite|Fortnite 개발중|fortniteAction/);
  assert.match(index,/\.foldGameActions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
});

test('Unity Web homepage links require a deployable manifest or verified Unity index bundle, not QA gate PASS',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const block=(runtime.split('async function bindAvailableUnityWebSurfaces(catalog){')[1]||'').split('function webPublishedRows')[0]||'';
  assert.match(block,/index\.html\?ts=/);
  assert.match(block,/unity-web-deploy-manifest\.json\?ts=/);
  assert.match(block,/bundleComplete===true/);
  assert.match(block,/bundleGroupsFromUnityIndex/);
  assert.match(block,/setTimeout\(\(\)=>controller\.abort\(\),2500\)/);
  assert.match(block,/method:'HEAD'/);
  assert.match(block,/\['loader','data','framework','wasm'\]/);
  assert.match(block,/unityWebAvailable:true/);
  assert.match(block,/unityWebAvailable:false/);
  assert.doesNotMatch(block,/unity-web-build\.json|unity-web-gameplay-validation\.json|bootSmoke|initialRealGameplayQa|noCriticalRuntimeError/);
  const display=roadmap.serverHomepageIntegration?.managerContract?.developmentProgressDisplay||{};
  const surface=roadmap.serverHomepageIntegration?.unityWebValidationSurface||{};
  assert.equal(display.unityWebHomepageExposureGate,'DEPLOYABLE_BUNDLE_MANIFEST_OR_UNITY_INDEX_BUNDLE_PROBE');
  assert.equal(display.unityWebQaPassRequiredForHomepageLink,false);
  assert.equal(display.unityWebEvidenceFilesRequiredForHomepageLink,false);
  assert.equal(surface.homepageLinkGate,'DEPLOYABLE_BUNDLE_MANIFEST_OR_UNITY_INDEX_BUNDLE_PROBE');
  assert.equal(surface.homepageLinkRequiresDeployManifest,false);
  assert.equal(surface.homepageLinkRequiresDeployableBundle,true);
  assert.equal(surface.homepageLinkAllowsUnityIndexBundleProbe,true);
  assert.equal(surface.homepageLinkLegacyUnityBuildCompatibility,true);
  assert.deepEqual(surface.homepageLinkLegacyProbeRequiredBundleComponents,['loader','data','framework','wasm']);
  assert.equal(surface.homepageLinkQaPassRequired,false);
  assert.equal(surface.homepageLinkEvidenceFilesRequired,false);
  assert.equal(surface.validationEvidenceStillRequiredForQaVerdict,true);
  assert.equal(display.webTestButtonEnabled,true);
  assert.equal(display.webTestButtonLabel,'Unity Web · 개발중');
  assert.equal(display.webAndPlatformTestButtonsMustBeSeparate,true);
  assert.equal(display.unityWebDevelopmentCardExposureRequiredWhenDeployable,true);
  assert.equal(display.unityWebMayBeCardDirectLaunchFallback,true);
  assert.equal(display.staleSharedRobloxTargetHomepageLinkForbidden,true);
  assert.equal(display.playableWebCompanionButtonEnabled,true);
  assert.equal(display.playableWebCompanionButtonLabel,'웹 플레이');
  assert.equal(display.playableWebCompanionSource,'COMPANY_RUNTIME_GAME_CATALOG');
  assert.equal(display.playableWebCompanionRequiresPlayableAndArchive,true);
  assert.equal(display.playableWebCompanionRequiresExistingCanonicalIndex,true);
  assert.equal(display.runtimeCatalogMirrorsToHomepageOnEverySuccessfulNonPrSync,true);
  assert.equal(display.mainCatalogMayNotOverrideFresherCompanyRuntime,true);
  assert.equal(display.runtimeCatalogMirrorMode,'RECONCILE_RUNTIME_STATE_ON_CANONICAL_MAIN_REGISTRY');
  assert.equal(display.rawRuntimeCatalogDirectCopyForbidden,true);
  assert.equal(display.actualGameFileSourceMetadataPreserved,true);
  assert.equal(display.canonicalNormalizationRequiredBeforeHomepagePublication,true);
  assert.equal(surface.developmentConfirmedHomepageExposureRequiredWhenDeployable,true);
  assert.equal(surface.cardDirectLaunchFallbackAllowed,true);
  const directiveDisplay=directive.homepageOperations?.developmentProgressDisplay||{};
  assert.equal(directiveDisplay.webTestButtonEnabled,true);
  assert.equal(directiveDisplay.webAndPlatformTestButtonsMustBeSeparate,true);
  assert.equal(directiveDisplay.unityWebHomepageExposureGate,'DEPLOYABLE_BUNDLE_MANIFEST_OR_UNITY_INDEX_BUNDLE_PROBE');
  assert.equal(directiveDisplay.unityWebLegacyBuildCompatibility,true);
  assert.equal(directiveDisplay.playableWebCompanionButtonEnabled,true);
  assert.equal(directiveDisplay.playableWebCompanionButtonLabel,'웹 플레이');
  assert.equal(directiveDisplay.runtimeCatalogMirrorsToHomepageOnEverySuccessfulNonPrSync,true);
  assert.equal(directiveDisplay.runtimeCatalogMirrorMode,'RECONCILE_RUNTIME_STATE_ON_CANONICAL_MAIN_REGISTRY');
  assert.equal(directiveDisplay.rawRuntimeCatalogDirectCopyForbidden,true);
  assert.equal(directiveDisplay.actualGameFileSourceMetadataPreserved,true);
  assert.equal(directiveDisplay.canonicalNormalizationRequiredBeforeHomepagePublication,true);
});
test('platform availability requires explicit internal release evidence from company-runtime',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(runtime,/internalReleaseReady===true\|\|roblox\.publicRelease===true/);
  assert.match(runtime,/internalReleaseReady===true\|\|unity\.publicRelease===true/);
  assert.match(runtime,/exposureAuthority/);
  assert.match(runtime,/supportedPlatforms/);
  assert.match(runtime,/웹 플레이/);
  assert.doesNotMatch(runtime,/fortniteAction/);
});


test('Homepage Manager binds the central homepage policy fingerprint from self-QA through Director publication',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:');
  assert.match(manage,/--require-homepage-policy=true/);
  assert.match(manage,/HOMEPAGE_POLICY_SHA256/);
  assert.match(manage,/policyFingerprint:process\.env\.HOMEPAGE_POLICY_SHA256/);
  assert.match(manage,/HOMEPAGE_CENTRAL_POLICY_SYNC=PASS/);
  assert.match(director,/--require-homepage-policy=true/);
  assert.match(director,/test "\$policy_sha" = "\$HOMEPAGE_POLICY_SHA256"/);
  assert.match(director,/Revalidate central homepage policy before publication/);
  assert.match(director,/HOMEPAGE_CENTRAL_POLICY_FINAL_SYNC=PASS/);
  assert.doesNotMatch(manage,/git checkout origin\/main -- tools\/company-homepage-platform-exposure-sync\.mjs/);
  assert.match(manager,/compileHomepageCentralPolicy/);
  assert.match(manager,/centralPolicyFingerprint===homepageCentral\.fingerprint/);
});

test('homepage platform exposure derives supported platforms from the central roadmap rather than a workflow constant',()=>{
  const sync=fs.readFileSync('tools/company-homepage-platform-exposure-sync.mjs','utf8');
  assert.match(sync,/compileHomepageCentralPolicy/);
  assert.match(sync,/centralPolicyFingerprint:central\.fingerprint/);
  assert.match(sync,/supportedPlatforms:central\.supportedPlatforms/);
  assert.match(sync,/HOMEPAGE_PLATFORM_ADAPTER_MISSING/);
  assert.doesNotMatch(sync,/supportedPlatforms:\['ROBLOX','UNITY'\]/);
});
