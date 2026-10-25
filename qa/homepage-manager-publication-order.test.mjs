// 파일명: qa/homepage-manager-publication-order.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
const statusSyncWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const testSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
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

test('retired policy document is not required by homepage checks',()=>{
  assert.equal(fs.existsSync(legacyHomepagePolicyMirror),false);
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

test('homepage publication explicitly refreshes the company-runtime catalog used by the live worker',()=>{
  const director=section('  director-supervision:');
  assert.match(workflow,/actions: write/);
  assert.match(director,/gh workflow run magic-forest-pages\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(director,/HOMEPAGE_PAGES_POST_MERGE_DISPATCHED=YES/);
  assert.ok(director.indexOf('gh workflow run magic-forest-pages.yml')>director.indexOf('gh pr merge "$pr_url"'),'Pages must dispatch only after the supervised merge');
  assert.ok(director.indexOf('gh workflow run magic-forest-pages.yml')<director.indexOf('gh workflow run company-status-sync.yml'),'Pages publication must not await another runtime sync');
  assert.match(director,/gh workflow run company-status-sync\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(director,/HOMEPAGE_RUNTIME_STATUS_SYNC=DISPATCHED/);
  assert.match(statusSyncWorkflow,/workflow_dispatch:/);
  assert.match(statusSyncWorkflow,/\.github\/workflows\/homepage-manager\.yml/);
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
  assert.match(manage,/HOMEPAGE_RUNTIME_CATALOG_RECONCILE=PASS/);
  assert.match(manage,/mergeRuntimeCatalogMissingGames/);
  assert.match(manage,/syncProductionClasses/);
  assert.match(manage,/applyHomepageRuntimeInfo/);
  assert.match(manage,/validateNormalizedCatalog/);
  assert.doesNotMatch(manage,/cp \/tmp\/homepage-runtime\/runtime-game-catalog\.json game-catalog\.json/);
});

test('published GitHub Pages game routes reconcile through the existing Homepage Manager only',()=>{
  const source=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  assert.match(source,/Magic Forest Static Play/);
  assert.match(source,/published-web-manifest\.json/);
  assert.match(source,/syncPublishedWebRoutes/);
  assert.match(source,/HOMEPAGE_PUBLISHED_WEB_ROUTES/);
  const browser=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(browser,/published\.route!==/);
  assert.ok(!browser.includes("getJson('https://hans1177.github.io/"));
});

test('homepage live runtime state bypasses the PWA cache',()=>{
  const sw=fs.readFileSync('sw.js','utf8');
  assert.match(sw,/const CACHE_NAME='jaewoon-pwa-v\d+'/);
  for(const path of ['homepage-platform-exposure','homepage-portfolio-status','test-game-candidates'])assert.ok(sw.includes(path),`service worker network-only list missing ${path}`);
  assert.ok(sw.includes('/assets\\/homepage-enhancements\\.js'), 'homepage renderer must stay network-only');
});

test('homepage preserves target history but releases only the confirmed lobby',()=>{
  const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
  const expected={'cozy-island':'116850096561713','daechung-rpg':'126302702438348','horror-escape-room':'98222620265768'};
  for(const [gameId,placeId] of Object.entries(expected)){
    const game=exposure.games.find(row=>row.gameId===gameId);
    const roblox=game.platforms.find(row=>row.platform==='ROBLOX');
    assert.equal(roblox.placeId,placeId);
    assert.equal(roblox.internalUrl,`https://www.roblox.com/games/${placeId}`);
    assert.equal(roblox.internalReleaseReady,gameId==='horror-escape-room');
    assert.equal(roblox.releaseReadiness.homepageReady,gameId==='horror-escape-room');
  }
});

test('homepage fallback stays neutral until current runtime data renders',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const fallback=index.split('id="homeInternalReleaseFallback"')[1].split('</section>')[0];
  assert.match(fallback,/data-runtime-fallback="loading"/);
  assert.match(fallback,/실행 가능한 게임을 불러오는 중/);
  assert.doesNotMatch(fallback,/data-game-id=|roblox\.com\/games\//);
  assert.match(index,/id="metricPlayable"/);
  assert.match(index,/id="metricDevelopment"/);
  assert.match(homepage,/homeInternalReleaseFallback/);
  assert.match(homepage,/document\.getElementById\(id\)\?\.remove\(\)/);
});

test('homepage links ordinary web games, verified Roblox and optional Unity apps without Unity Web requests',()=>{
  assert.equal(fs.existsSync('assets/homepage-enhancements-core.js'),false);
  assert.match(homepage,/const SYNC_INTERVAL_MS=30000/);
  assert.match(homepage,/getJson\('\/game-catalog\.json'\)/);
  assert.match(homepage,/getJson\('\/company-status\.json'\)/);
  assert.match(homepage,/getJson\('\/homepage-platform-exposure\.json'\)/);
  assert.match(homepage,/function internalReleaseRows\(catalog,status\)/);
  assert.match(homepage,/function internalReleaseLinks\(game\)/);
  assert.match(homepage,/buildShelf\(hub,'homePlatformAvailableGameCenter','출시 게임'/);
  assert.match(homepage,/robloxAction/);
  assert.match(homepage,/webAction/);
  assert.match(homepage,/일반 웹게임 · 플레이/);
  assert.match(homepage,/unityAction/);
  assert.doesNotMatch(homepage,/unityWebAction|bindAvailableUnityWebSurfaces|unityWebTestUrl/);
  assert.doesNotMatch(homepage,/아트북 보기|foldGameArtbookBtn|homepageArtbookPath/);
  assert.match(homepage,/button\(links\.web\|\|links\.webSource,links\.web\?'일반 웹게임 · 플레이':'원본 게임 · 열기'/);
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
  assert.match(homepage,/const direct=links\.web\|\|links\.roblox\|\|links\.unity\|\|links\.webSource\|\|''/);
  assert.match(homepage,/exposureAuthority/);
  assert.match(homepage,/JSON\.stringify\(exposurePlatforms\)!==JSON\.stringify\(\['ROBLOX','UNITY'\]\)/);
  assert.match(homepage,/function bindDirectGameLaunch\(\)/);
  assert.match(homepage,/data-direct-play|dataset\.directPlay/);
});

test('central development orchestrator runs Unity Web floor before new Roblox and Unity work without API dispatch',()=>{
  const development=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const admission=fs.readFileSync('tools/company-upper-platform-admission.mjs','utf8');
  assert.match(admission,/MINIMUM_DESIGN_CONTRACT_REQUIRED/);
  assert.match(admission,/ACTIVE_PLATFORM_DESIGN_PROFILE_REQUIRED/);
  assert.match(development,/eligible_json:/);
  assert.doesNotMatch(development,/unity_web_json:/);
  assert.doesNotMatch(development,/UNITY_WEB_FLOOR_BOOTSTRAP_IDS/);
  assert.doesNotMatch(development,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(development,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.match(admission,/upper-platform-development-readiness\.json/);
  assert.match(admission,/READINESS_SOURCE_STALE/);
  // 현재 정식 구조: 게임별 로블록스 런타임은 독립 실행하고 부모는 완료를 기다리지 않는다.
  assert.match(development,/name: Dispatch independent Roblox game development/);
  assert.match(development,/ROBLOX_GAME_IDS: \$\{\{ needs\.native-plan\.outputs\.roblox_json \}\}/);
  assert.match(development,/gh workflow run company-development-roblox-runtime\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$game_id"/);
  assert.match(development,/ROBLOX_PARENT_WAITS_FOR_GAME_COMPLETION=NO/);
  assert.doesNotMatch(development,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(development,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.doesNotMatch(development,/gh workflow run (?:company-development-unity-runtime|unity-web-first-stage-build|unity-web-floor-source-bootstrap)\.yml/);
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
  assert.doesNotMatch(homepage,/homeTop30GameCenter/);
});

test('successful runtime events must bind company-runtime before homepage publication',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  assert.match(manage,/HOMEPAGE_PUBLIC_STATUS_SYNC=YES/);
  assert.match(manage,/Successful runtime workflow could not bind company-runtime/);
  assert.match(manage,/exit 1/);
});

test('PR creation failure remains a blocking publication failure inside Director stage',()=>{
  const director=section('  director-supervision:');
  assert.ok(director.includes('HOMEPAGE_PUBLICATION_BRANCH_READY=$branch'));
  assert.ok(director.includes('HOMEPAGE_PUBLICATION=BLOCKED_PR_PERMISSION_REQUIRED'));
  assert.ok(director.includes('exit 1'));
});

test('Unity Web floor remains independent of native development admission',()=>{
  const dual=directive.classes?.DEVELOPMENT_CONFIRMED||{};
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
  assert.match(index,/href="\/asset-library\.html"/);
  const assetLibrarySurface=fs.readFileSync('asset-library.html','utf8');
  assert.match(assetLibrarySurface,/회사 에셋 라이브러리/);
  assert.match(assetLibrarySurface,/data-asset-library-version="[1-9]\d*"/);
  assert.match(manager,/data-asset-library-version="\[1-9\]\\d\*"/);
  assert.doesNotMatch(manager,/data-asset-library-version="1"/);
  const library=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  assert.equal(library.publicInspectionSurface,true);
  assert.equal(library.productionPassAuthority,false);
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
  assert.doesNotMatch(runtime,/bindAvailableUnityWebSurfaces|renderCatalog\(boundCatalog\)/);
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

test('sample hero and cards stay free of duplicate operational badges and added card frames',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const index=fs.readFileSync('index.html','utf8');
  const focus=(runtime.split('function buildFocus(catalog,status){')[1]||'').split('function buildCard(row){')[0]||'';
  const card=(runtime.split('function buildCard(row){')[1]||'').split('function buildShelf')[0]||'';
  const shelf=(runtime.split('function buildShelf(hub,id,title,description,rows){')[1]||'').split('function buildRecentUpdates')[0]||'';
  assert.doesNotMatch(focus,/homeFocusMeta|statusLabel|genreState|playState/);
  assert.doesNotMatch(card,/foldBadges|foldBadge|statusLabel|gameStatus|releasedCard|developmentCard|data-release-state/);
  assert.match(shelf,/gameShelfHead/);
  assert.match(shelf,/gameShelfCount/);
  assert.match(shelf,/\$\{esc\(title\)\}/);
  assert.match(shelf,/\$\{esc\(description\)\}/);
  assert.doesNotMatch(runtime,/\.releasedShelf|\.developmentShelf|\.gameStatus|\.developmentCard|\.releasedCard/);
  assert.doesNotMatch(index,/releaseNav|releasedCount|developmentCount/);
  assert.doesNotMatch(runtime,/releasedCount|developmentCount/);
  assert.match(card,/<h3>\$\{esc\(game\.name\)\}<\/h3>/);
});

test('homepage workflow validates the exact sample deployment contract',()=>{
  const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  assert.match(workflow,/data-homepage-version="SAMPLE_FRONT_DOOR_V1"/);
  assert.match(workflow,/data-homepage-build="2026-09-21-sample-exact"/);
  assert.match(workflow,/command\.html\?from=chatgpt-shortcut/);
  assert.match(workflow,/grep -Fq '"start_url": "\/"' manifest\.webmanifest/);
  assert.match(workflow,/SYNC_INTERVAL_MS=30000/);
});

test('featured hero is explicit and ChatGPT launcher opens internal PWA chat',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(runtime,/const FEATURED_GAME_ID='daechung-rpg'/);
  assert.match(runtime,/rows\.find\(item=>gameIdOf\(item\)===FEATURED_GAME_ID\)\|\|rows\[0\]/);
  assert.match(runtime,/const direct=links\.web\|\|links\.roblox\|\|links\.unity\|\|links\.webSource\|\|''/);
  assert.match(runtime,/const actionLabel=links\.web\?'일반 웹게임 플레이':links\.roblox\?'Roblox 플레이':links\.unity\?'Unity 앱 플레이':links\.webSource\?'원본 게임 링크 열기':'게임 보기'/);
  assert.doesNotMatch(index,/package=com\.openai\.chatgpt|intent:\/\/chatgpt/);
  assert.match(index,/\/command\.html\?from=chatgpt-shortcut/);
  assert.match(index,/function openChatGpt\(\)/);
});

test('game cards expose ordinary web and published Roblox links while preserving optional Unity apps',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const index=fs.readFileSync('index.html','utf8');
  assert.match(runtime,/function platformLinks\(game\)/);
  assert.match(runtime,/robloxAction/);
  assert.match(runtime,/unityAction/);
  assert.match(runtime,/webAction/);
  assert.doesNotMatch(runtime,/unityWebAction/);
  assert.match(runtime,/links\.roblox/);
  assert.match(runtime,/links\.unity/);
  assert.doesNotMatch(runtime,/Unity Web · 개발중/);
  assert.match(runtime,/button\(links\.web\|\|links\.webSource,links\.web\?'일반 웹게임 · 플레이':'원본 게임 · 열기'/);
  assert.doesNotMatch(runtime,/button\(links\.unityWeb/);
  assert.doesNotMatch(runtime,/button\(links\.fortnite|Fortnite 개발중|fortniteAction/);
  assert.match(index,/\.foldGameActions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
});

test('homepage does not query Unity Web deployment assets',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(runtime,/bindAvailableUnityWebSurfaces|unityWebTestUrl|unityWebAction/);
  assert.doesNotMatch(runtime,/unity-web-deploy-manifest\.json|probeFetch\(|createUnityInstance/);
  assert.match(runtime,/renderCatalog\(catalog\);/);
  assert.match(runtime,/const SYNC_INTERVAL_MS=30000;/);
});

test('platform availability uses current release evidence or verified historical Roblox internal deployment from company-runtime',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(runtime,/roblox\.internalReleaseReady===true&&roblox\.releaseReadiness\?\.homepageReady===true/);
  assert.match(runtime,/roblox\.historicalInternalRelease===true/);
  assert.match(runtime,/historicalInternalRelease===true&&Boolean\(p\?\.internalUrl\)/);
  assert.match(runtime,/내부 배포 · 최신 검증중/);
  assert.match(runtime,/unity\.internalReleaseReady===true&&unity\.releaseReadiness\?\.homepageReady===true/);
  assert.doesNotMatch(runtime,/internalReleaseReady===true\|\|(?:roblox|unity)\.publicRelease===true/);
  assert.match(runtime,/exposureAuthority/);
  assert.match(runtime,/supportedPlatforms/);
  assert.match(runtime,/button\(links\.web\|\|links\.webSource,links\.web\?'일반 웹게임 · 플레이':'원본 게임 · 열기'/);
  assert.doesNotMatch(runtime,/fortniteAction/);
});


test('Homepage Manager binds the central homepage policy fingerprint from self-QA through Director publication',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:');
  assert.match(manage,/HOMEPAGE_POLICY_SHA256/);
  assert.match(manage,/policyFingerprint:process\.env\.HOMEPAGE_POLICY_SHA256/);
  assert.match(manage,/HOMEPAGE_CENTRAL_POLICY_SYNC=PASS/);
  assert.match(director,/test "\$policy_sha" = "\$HOMEPAGE_POLICY_SHA256"/);
  assert.match(director,/Synchronize central roadmap context \(homepage\)/);
  assert.doesNotMatch(director,/Revalidate central homepage policy before publication/);
  assert.doesNotMatch(director,/HOMEPAGE_CENTRAL_POLICY_FINAL_SYNC=PASS/);
  assert.doesNotMatch(manage,/git checkout origin\/main -- tools\/company-homepage-platform-exposure-sync\.mjs/);
  assert.match(manager,/buildHomepagePlatformExposure/);
  assert.doesNotMatch(manager,/LEGACY_CENTRAL_POLICY_REMOVED/);
  assert.match(manage,/loadCentralPolicySnapshot\(\{required:true\}\)/);
  assert.match(director,/loadCentralPolicySnapshot\(\{required:true\}\)/);
  assert.doesNotMatch(manage,/worker-shared-context\.json/);
  assert.doesNotMatch(director,/worker-shared-context\.json/);
  assert.match(manage,/HOMEPAGE_SUPPORTED_PLATFORMS_JSON/);
  assert.match(manage,/node tools\/company-homepage-platform-exposure-sync\.mjs[^\n]*company-learning\/platform-release-roadmap\.json/);
  assert.match(manage,/COMPANY_VERIFIED_POLICY_PATH=company-learning\/platform-release-roadmap\.json node --input-type=module/);
  assert.match(manage,/COMPANY_VERIFIED_POLICY_PATH=company-learning\/platform-release-roadmap\.json node qa\/game-catalog-normalization\.test\.mjs/);
  assert.match(manager,/centralPolicyFingerprint===homepageCentral\.fingerprint/);
  assert.doesNotMatch(manager,/'centralHomepagePolicyExists','centralHomepageExecutionFingerprint'/);
  const catalogChecks=[...manage.matchAll(/node qa\/game-catalog-normalization\.test\.mjs/g)].length;
  const verifiedCatalogChecks=[...manage.matchAll(/COMPANY_VERIFIED_POLICY_PATH=company-learning\/platform-release-roadmap\.json node qa\/game-catalog-normalization\.test\.mjs/g)].length;
  assert.ok(catalogChecks>=2);
  assert.equal(verifiedCatalogChecks,catalogChecks,'every runtime catalog QA requires verified canonical policy');
});

test('homepage platform exposure derives supported platforms from the central roadmap rather than a workflow constant',()=>{
  const sync=fs.readFileSync('tools/company-homepage-platform-exposure-sync.mjs','utf8');
  assert.match(sync,/policy\?\.serverHomepageIntegration/);
  assert.match(sync,/homepage\?\.sourceOfTruth/);
  assert.match(sync,/crypto\.createHash\('sha256'\)/);
  assert.doesNotMatch(sync,/POLICY_REMOVED/);
  assert.match(sync,/centralPolicyFingerprint:central\.fingerprint/);
  assert.match(sync,/supportedPlatforms:central\.supportedPlatforms/);
  assert.match(sync,/HOMEPAGE_PLATFORM_ADAPTER_MISSING/);
  assert.match(sync,/supportedPlatforms:central\.supportedPlatforms/);
});

test('homepage manager control and publication jobs stay off the game-primary runner pool',()=>{
  const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  for(const job of ['pr-fast-qa','manage-and-self-qa','director-supervision']){
    const start=workflow.indexOf('\n  '+job+':\n');
    assert.ok(start>=0,job);
    const tail=workflow.slice(start+1);
    const next=tail.slice(1).search(/\n  [A-Za-z0-9_-]+:\n/);
    const block=next>=0?workflow.slice(start,start+1+next+1):workflow.slice(start);
    assert.match(block,/runs-on:\s*ubuntu-slim/,job);
  }
  assert.doesNotMatch(workflow,/runs-on:\s*ubuntu-latest/);
});


test('homepage sparse fast QA includes real Roblox and Unity source files used by catalog normalization',()=>{
  const fast=section('  pr-fast-qa:','  manage-and-self-qa:');
  for(const source of [
    '/_routes.json',
    '/roblox-games/*/default.project.json',
    '/roblox-games/*/server/Game.server.luau',
    '/roblox-games/*/client/Game.client.luau',
    '/unity-games/*/ProjectSettings/ProjectVersion.txt',
    '/unity-games/*/Assets/Scripts/**'
  ])assert.ok(fast.includes(source),'missing real native source in PR QA: '+source);
  assert.match(fast,/sparse-checkout-cone-mode: false/);
  assert.match(fast,/node qa\/game-catalog-normalization\.test\.mjs/);
});


test('homepage deployment still invokes supervised publication',()=>{
  const director=section('  director-supervision:');
  assert.match(director,/gh pr merge/);
  assert.match(workflow,/workflow_run:/);
});

test('homepage reuses fetched URLs and unchanged shelf nodes instead of rebuilding them',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const requests=[];
  const fetchJson=runInNewContext(source.slice(source.indexOf('const getJson='),source.indexOf('const esc='))+'getJson;',{
    AbortSignal,fetch:async(url,options)=>{requests.push({url,options});return{ok:true,json:async()=>({value:1})};}
  });
  await fetchJson('/game-catalog.json');
  assert.equal(requests[0].url,'/game-catalog.json');
  assert.equal(requests[0].options.cache,'default');
  assert.ok(requests[0].options.signal);
  const nodes=new Map();let writes=0,appends=0;
  const shelf=runInNewContext(source.slice(source.indexOf('function buildShelf('),source.indexOf('function buildRecentUpdates('))+'buildShelf;',{
    esc:String,buildCard:row=>'<article>'+row.id+'</article>',
    document:{getElementById:id=>nodes.get(id),createElement:()=>({parentNode:null,grid:{scrollLeft:0},setAttribute(){},querySelector(){return this.grid;},set innerHTML(value){writes++;this.html=value;}})}
  });
  const hub={appendChild(node){appends++;node.parentNode=this;nodes.set(node.id,node);}};
  shelf(hub,'games','제목','설명',[{id:'a'}]);const node=nodes.get('games');node.grid.scrollLeft=120;
  shelf(hub,'games','제목','설명',[{id:'a'}]);
  assert.equal(writes,1);assert.equal(appends,1);assert.equal(nodes.get('games'),node);
  shelf(hub,'games','제목','설명',[{id:'b'}]);assert.equal(writes,2);assert.equal(node.grid.scrollLeft,120);
});

test('homepage manager binds official images to exact dedicated games and fills missing artwork idempotently',async()=>{
  const os=await import('node:os'),path=await import('node:path');
  const {execFileSync}=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'homepage-title-'));
  try{
    fs.mkdirSync(path.join(root,'assets/homepage-covers'),{recursive:true});
    const catalog={games:[{id:'real-game',name:'검증된 게임'},{id:'other-game',name:'다른 게임'}]};
    const queue={items:[{gameId:'real-game',robloxPublicationTarget:{gameId:'real-game',verified:true,dedicated:true,universeId:'11',placeId:'111'}},
      {gameId:'other-game',robloxDedicatedExperience:{gameId:'other-game',state:'PASS',published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),universeId:'22',placeId:'222'}}]};
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify(catalog));
    fs.writeFileSync(path.join(root,'queue.json'),JSON.stringify(queue));
    fs.writeFileSync(path.join(root,'homepage-platform-exposure.json'),'{}');
    const body={data:[{universeId:11,thumbnails:[{state:'Completed',targetId:7,imageUrl:'https://tr.rbxcdn.com/real.png'}]},
      {universeId:22,thumbnails:[{state:'Completed',imageUrl:'https://rbxcdn.com.evil.test/wrong.png'}]},
      {universeId:99,thumbnails:[{state:'Completed',imageUrl:'https://tr.rbxcdn.com/unrelated.png'}]}]};
    const preload='data:text/javascript,'+encodeURIComponent('globalThis.fetch=async()=>({ok:true,json:async()=>('+JSON.stringify(body)+')});');
    const run=()=>execFileSync(process.execPath,['--import',preload,path.resolve('tools/homepage-manager.mjs'),'--sync-roblox-titles'],{
      cwd:root,env:{...process.env,HOMEPAGE_CATALOG_PATH:'game-catalog.json',HOMEPAGE_QUEUE_PATH:'queue.json'},encoding:'utf8'});
    run();const first=fs.readFileSync(path.join(root,'game-catalog.json'),'utf8');
    const result=JSON.parse(first);
    assert.ok(fs.existsSync(path.join(root,result.games[1].robloxTitleArtwork.src)));
    run();assert.equal(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8'),first);
    queue.items[0].robloxPublicationTarget.shared=true;fs.writeFileSync(path.join(root,'queue.json'),JSON.stringify(queue));
    run();assert.equal(JSON.parse(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8')).games[0].robloxThumbnail,undefined);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('homepage front door reads three runtime snapshots plus the published web route manifest',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
 const requests=[];let renders=0;
 const data={'/game-catalog.json':{runtimeInfoAuthority:'company-runtime',games:[]},'/company-status.json':{runtimeAuthority:'company-runtime'},'/homepage-platform-exposure.json':{authority:'company-runtime',supportedPlatforms:['ROBLOX','UNITY'],games:[]}};
 const refresh=runInNewContext(source.slice(source.indexOf('async function refresh(){'),source.indexOf('function main(){'))+'refresh;',{
  refreshInFlight:false,lastSignature:'',portfolioStatus:{},platformExposure:{},getJson:async path=>{requests.push(path);return data[path];},
  normalizePlatform:String,document:{getElementById:()=>null,querySelector:()=>null,documentElement:{dataset:{}}},
  updateLiveSummary:()=>{},buildFocus:()=>{renders++;},buildGameCenter:()=>{},buildRecentUpdates:()=>{}
 });
 await refresh();assert.deepEqual(requests,['/game-catalog.json','/company-status.json','/homepage-platform-exposure.json','/web-games/publish-manifest.json']);
 await refresh();assert.equal(renders,1);
});

test('PWA runtime metadata uses bounded server HTTP caching while scripts remain network-only',async()=>{
 const {runInNewContext}=await import('node:vm');const events={};const calls=[];
 runInNewContext(fs.readFileSync('sw.js','utf8'),{URL,Request,Response,Headers,
  self:{location:{origin:'https://site.test'},addEventListener:(name,callback)=>{events[name]=callback;}},
  fetch:async(request,options)=>{calls.push(options);return new Response('ok');},
  caches:{match:()=>{throw Error('runtime must not use offline app cache');}}
 });
 for(const path of ['/game-catalog.json','/assets/homepage-enhancements.js']){
  let promise;events.fetch({request:new Request('https://site.test'+path),respondWith:value=>{promise=value;}});await promise;
 }
 assert.equal(calls[0].cache,'default');assert.equal(calls[1].cache,'no-store');
});

test('unchanged homepage snapshot finishes self-QA without a redundant Director publication job',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:');
  assert.match(manage,/candidate_changed=\$candidate_changed/);
  assert.match(manage,/HOMEPAGE_MANAGER_EXPOSURE_SEMANTIC_NOOP=YES/);
  assert.match(manage,/reuseUnchangedHomepageExposure/);
  assert.match(manage,/git show HEAD:homepage-platform-exposure\.json/);
  assert.match(director,/needs\.manage-and-self-qa\.outputs\.candidate_changed == 'true'/);
  assert.match(director,/needs\.manage-and-self-qa\.result == 'success'/);
  assert.match(director,/test "\$patch_sha" = "\$\(sha256sum "\$patch"/);
  assert.match(director,/gh pr merge "\$pr_url"/);
});


test('read-only secondary homepage keeps primary authority and independently playable link',()=>{
  const page=fs.readFileSync('backup.html','utf8');
  const primary=fs.readFileSync('index.html','utf8');
  const ci=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  assert.ok(page.includes('https://jaewoon-games.pages.dev/'));
  assert.ok(page.includes('https://hans1177.github.io/jaewoon-games/'));
  assert.ok(page.includes('https://github.com/hans1177/jaewoon-games/actions'));
  assert.ok(page.includes('Content-Security-Policy'));
  assert.ok(page.includes('credentials:'));
  assert.ok(page.includes('배포 완료 증거는 아니야'));
  assert.ok(primary.includes('Vercel 보조 홈페이지'));
  assert.ok(primary.includes('/backup.html'));
  assert.equal(ci.split("      - 'backup.html'").length-1,2);
  assert.ok(ci.includes('/backup.html'));
  assert.ok(ci.includes('index.html backup.html company.html'));
});

test('homepage manager validates canonical web-first internal play links without weakening native readiness',()=>{
  const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
  const script=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.ok(manager.includes("const direct=links.web||links.roblox||links.unity||links.webSource||''"),'manager mirrors the exact web/native/source link priority from the canonical renderer');
  assert.ok(script.includes("const direct=links.web||links.roblox||links.unity||links.webSource||''"),'web-first source fallback link exists in rendered homepage');
  assert.ok(script.includes('function sourceWebHref(row){'),'original source link must be derived from registered canonical game');
  assert.ok(script.includes('const web=playableWebHref(game);'),'verified playable link must remain distinct from original source link');
  assert.ok(script.includes('const webSource=sourceWebHref(game);'),'source fallback must remain independently available');
  assert.ok(script.includes('return {roblox,unity,web,webSource};'),'the existing platform link contract must carry source fallback');
  assert.ok(!manager.includes("const direct=links.roblox||links.unity||''"),'stale native-only expectation rejected');
  assert.match(manager,/cleanRunnableShelfPresentation/);
  assert.ok(manager.includes("class=\"gameShelfHead\""),'existing shelf stays active');
  assert.ok(manager.includes("class=\"gameShelfCount\""),'existing game count stays visible');
});

test('backup homepage uses GitHub Pages as primary while preserving Cloudflare as secondary',()=>{
  const backup=fs.readFileSync('backup.html','utf8');
  assert.match(backup,/<h2>주 홈페이지 · GitHub Pages<\/h2>/);
  assert.match(backup,/<a class="action" href="https:\/\/hans1177\.github\.io\/jaewoon-games\/"[^>]*>주 홈페이지 열기<\/a>/);
  assert.match(backup,/request\('https:\/\/hans1177\.github\.io\/jaewoon-games\/game-catalog\.json'\)/);
  assert.match(backup,/connect-src https:\/\/hans1177\.github\.io https:\/\/api\.github\.com/);
  assert.match(backup,/<a href="https:\/\/jaewoon-games\.pages\.dev\/"[^>]*>Cloudflare 보조 주소<\/a>/);
  assert.match(backup,/마력숲 생존기/);
  assert.match(backup,/checkSource/);
  assert.doesNotMatch(backup,/Cloudflare가 주 홈페이지|주 홈페이지 · Cloudflare/);
});

// A source-only HTML/JS game must get its own block-avatar title after runtime admission.
test('general web game title art runs after canonical runtime catalog reconciliation',()=>{
  const reconciliation=workflow.indexOf('Prepare verified runtime status/catalog candidate');
  const titles=workflow.indexOf('Auto-create game-specific block-avatar title images for web and Roblox');
  const review=workflow.indexOf('Run homepage manager contract');
  assert.ok(reconciliation>=0&&titles>reconciliation&&review>titles);
  assert.match(workflow,/node tools\/homepage-manager\.mjs --sync-roblox-titles/);
  const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
  assert.match(manager,/scene==='SCHOOL'/);
  assert.match(manager,/ROBLOX_BLOCK_AVATAR_V1/);
});
