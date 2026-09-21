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
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
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
  assert.doesNotMatch(workflow,/\\n  publish-after-director:/);
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
});

test('homepage renders one unbounded canonical Web shelf and no duplicate Top30 shelf',()=>{
  assert.equal(fs.existsSync('assets/homepage-enhancements-core.js'),false);
  assert.match(homepage,/const SYNC_INTERVAL_MS=5000/);
  assert.match(homepage,/getJson\('\/game-catalog\.json'\)/);
  assert.match(homepage,/getJson\('\/company-status\.json'\)/);
  assert.match(homepage,/getJson\('\/test-game-candidates\.json'\)/);
  assert.match(homepage,/runtimeInfoAuthority!=='company-runtime'/);
  assert.match(homepage,/runtimeAuthority!=='company-runtime'/);
  assert.match(homepage,/function releaseRows\(catalog,status\)/);
  assert.match(homepage,/function developmentRows\(catalog,status\)/);
  assert.match(homepage,/function webPublishedRows\(catalog\)/);
  assert.match(homepage,/function canonicalWebHref\(row\)/);
  assert.match(homepage,/function buildFocus\(catalog,status\)/);
  assert.match(homepage,/function buildGameCenter\(catalog,status\)/);
  assert.match(homepage,/buildShelf\(hub,'homeReleaseGameCenter'/);
  assert.match(homepage,/buildShelf\(hub,'homeWebGameCenter'/);
  assert.match(homepage,/buildShelf\(hub,'homeDevelopmentGameCenter'/);
  assert.doesNotMatch(homepage,/document\.getElementById\('homeDevelopmentGameCenter'\)\?\.remove\(\)/);
  assert.doesNotMatch(homepage,/homeTop30GameCenter/);
  assert.doesNotMatch(homepage,/const TOP_LIMIT=/);
  assert.match(homepage,/dataset\.homeWebGameCount/);
  assert.match(homepage,/homeServerAuthority/);
  assert.match(homepage,/homeSupportedPlatforms/);
  assert.match(homepage,/homeProgressAuthority='company-runtime'/);
  assert.equal(roadmap.homepagePresentation?.webGameShelf?.unbounded,true);
  assert.equal(roadmap.homepagePresentation?.top30Shelf?.enabled,false);
});

test('homepage exposes current Web to selected-platform to live-focus development flow',()=>{
  const index=fs.readFileSync('index.html','utf8');
  assert.match(index,/id="developmentPipeline"/);
  assert.match(index,/Web 베이스/);
  assert.match(index,/Roblox · Unity · Fortnite UEFN/);
  assert.match(index,/출시 후 집중개발/);
  assert.match(index,/data-platform="roblox"/);
  assert.match(index,/data-platform="unity"/);
  assert.match(index,/data-platform="fortnite_uefn"/);
  assert.doesNotMatch(index,/신규 개발 Unity Android 중심/);
  assert.match(homepage,/function buildDevelopmentPipeline\(catalog,status,testManifest=\{\}\)/);
  assert.match(homepage,/dataset\.runtimeAuthority/);
  assert.match(homepage,/dataset\.selectedPlatformCount/);
  assert.match(homepage,/dataset\.focusRunnerActive/);
  assert.match(homepage,/buildDevelopmentPipeline\(catalog,status,testManifest\|\|\{\}\)/);
});

test('verified Roblox deployment history is independent of the primary selected platform',()=>{
  assert.match(homepage,/const displayPlatform=row=>/);
  assert.match(homepage,/function verifiedRobloxDeploymentRows\(catalog\)/);
  assert.match(homepage,/historicalPublicationTargetVerified===true/);
  assert.match(homepage,/homepageDisplayMode:'ROBLOX_HISTORICAL_DEPLOYMENT'/);
  assert.doesNotMatch(homepage,/normalizePlatform\(selectedPlatform\(game\)\)!=='ROBLOX'/);
  assert.match(homepage,/const p=normalizePlatform\(displayPlatform\(game\)\)/);
});

test('homepage platform and touch launch paths stay bound to verified runtime data',()=>{
  assert.match(homepage,/function canonicalWebHref\(row\)/);
  assert.match(homepage,/const expected=`web-games\/\$\{id\}`/);
  assert.match(homepage,/data-web-path=/);
  assert.match(homepage,/card\.dataset\.directPlay=target/);
  assert.match(homepage,/function latestVerifiedUnityBuilds\(status\)/);
  assert.match(homepage,/signatureVerified!==true/);
  assert.match(homepage,/runtimePassed/);
  assert.match(homepage,/function platformHref\(game\)/);
  assert.match(homepage,/p==='ROBLOX'/);
  assert.match(homepage,/p==='FORTNITE_UEFN'/);
  assert.match(homepage,/unityBuildUrl/);
  assert.match(homepage,/function bindDirectGameLaunch\(\)/);
  assert.match(homepage,/data-direct-play|dataset\.directPlay/);
  assert.match(homepage,/dataset\.touchLaunch='true'/);
});

test('post-Web artbook binding follows current Web validation schema without blocking platform development',()=>{
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=15/);
  assert.match(artbookTool,/WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(artbookTool,/validationSchemaVersion\|\|webEvidence\?\.version\)===WEB_VALIDATION_SCHEMA_VERSION/);
  assert.doesNotMatch(artbookTool,/validationSchemaVersion\|\|webEvidence\?\.version\)===13/);
  const development=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(development,/\n  route:\n[\s\S]{0,600}needs: \[web-gate\]/);
  assert.doesNotMatch(development,/\n  route:\n[\s\S]{0,600}needs: \[web-gate, post-web-artbook\]/);
  assert.match(development,/ARTBOOK_FAILURE_ONLY_BLOCKS_HOMEPAGE=YES/);
  assert.match(development,/POST_WEB_ARTBOOK_FAILURE_NATIVE_BLOCK=NO/);
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

test('current development score policy requires Web schema15 and rejects schema13',()=>{
  const display=directive.homepageOperations?.developmentProgressDisplay||{};
  assert.equal(display.scoreRequiresSchema15,true);
  assert.equal(Object.hasOwn(display,'scoreRequiresSchema13'),false);
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
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

test('homepage front door stays simple, game-first and mobile touch-first',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const front=roadmap.homepagePresentation?.frontDoor||{};
  assert.equal(front.mode,'SIMPLE_GAME_FIRST_RESPONSIVE');
  assert.deepEqual(front.order.slice(0,4),['FEATURED_GAME','LIVE_SUMMARY','GAME_CENTER','DEVELOPMENT_PIPELINE']);
  assert.equal(front.mobile?.fixedBottomNavigation,true);
  assert.equal(front.mobile?.horizontalGameCardBrowse,true);
  assert.match(index,/class="mainNav"/);
  assert.match(index,/class="mobileDock"/);
  assert.match(index,/href="#gameHub"/);
  assert.match(index,/href="#developmentPipeline"/);
  assert.match(index,/id="developerProfile"/);
  assert.match(index,/HOME_FRONT_DOOR_SIMPLE_V2/);
  assert.ok(index.indexOf('id="hero"')<index.indexOf('aria-label="게임 운영 요약"'));
  assert.ok(index.indexOf('id="gameHub"')<index.indexOf('id="developmentPipeline"'));
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

test('runtime homepage renderer preserves approved simple front door',()=>{
  const runtime=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(runtime,/document\.querySelector\('\.opsBar'\)\?\.remove\(\)/);
  assert.doesNotMatch(runtime,/\.opsBar[^\n]*display:none!important/);
  assert.match(runtime,/gameShelfGrid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(runtime,/scroll-snap-type:x mandatory/);
  assert.match(runtime,/foldGameCard\{flex:0 0 78vw/);
});
