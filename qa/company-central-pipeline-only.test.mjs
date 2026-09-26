// 파일명: qa/company-central-pipeline-only.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(repoRoot,relative));

const centralWorkflows=[
  '.github/workflows/company-seed-design-runtime.yml',
  '.github/workflows/company-design-promotion-sync.yml',
  '.github/workflows/company-development-confirmed-runtime.yml',
  '.github/workflows/company-development-roblox-runtime.yml',
  '.github/workflows/company-development-unity-runtime.yml',
];

test('platform-release-roadmap is the only production machine policy with authority',()=>{
  assert.equal(exists('AUTONOMOUS_DEVELOPMENT_POLICY.md'),false);
  assert.equal(exists('AGENTS.md'),false);
  const directive=JSON.parse(read('company-directive.json'));
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  assert.equal(directive.policyDocument,'company-learning/platform-release-roadmap.json');
  assert.equal(directive.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.policySource,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.humanDocumentRequired,false);
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyMirror'),false);
  assert.equal(roadmap.centralDocumentation.canonicalSet.policy,'company-learning/platform-release-roadmap.json');
});
test('legacy autonomous top-level workflow namespace is removed',()=>{
  const files=fs.readdirSync(path.join(repoRoot,'.github/workflows'));
  const legacy=files.filter(name=>/^autonomous-.*\.ya?ml$/i.test(name));
  assert.deepEqual(legacy,[]);
});

test('central production runtime gates new Roblox and Unity work on Unity Web readiness',()=>{
  for(const file of centralWorkflows)assert.equal(exists(file),true,file+' must exist');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const admission=read('tools/company-upper-platform-admission.mjs');
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.mode,'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR');
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(direct.webDevelopmentStageRemoved,false);
  assert.equal(direct.unityWebEnabled,true);
  assert.equal(direct.unityWebRequired,true);
  assert.equal(direct.unityWebGateRequired,true);
  assert.equal(direct.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.fortniteUefnState,'OWNER_HOLD');
  assert.match(development,/company-minimum-design-contract\.mjs/);
  assert.match(development,/company-selected-platform-router\.mjs/);
  assert.match(development,/UPPER_PLATFORM_MACHINE_CONTRACT=PASS/);
  assert.match(development,/eligible_json:/);
  assert.match(development,/unity_web_json:/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.doesNotMatch(development,/gh workflow run (?:company-development|unity-web)/);
  assert.match(admission,/upper-platform-development-readiness\.json/);
  assert.match(admission,/READINESS_SOURCE_STALE/);
  assert.doesNotMatch(development,/company-development-web-bootstrap\.mjs/);
  assert.doesNotMatch(development,/company-development-web-gameplay-validation\.mjs/);
  assert.match(roblox,/company-development-roblox-bootstrap\.mjs/);
  assert.match(roblox,/ROBLOX_RUNTIME_PASS=NO/);
  assert.match(roblox,/ROBLOX_RELEASE_CLAIM=NO/);
  assert.match(unity,/DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE/);
  assert.match(unity,/selectTargetPlatformDevelopmentWindow/);
  assert.match(unity,/selectRepresentativeCanary/);
  assert.match(unity,/company-development-unity-bootstrap\.mjs/);
  assert.match(unity,/company-development-unity-evidence\.mjs/);
  assert.match(unity,/unity-cloud-android-test\.yml/);
  assert.match(unity,/unity-android-runtime-smoke\.yml/);
  assert.match(unity,/unity-android-independent-qa\.yml/);
  assert.match(unity,/unity-android-regression\.yml/);
  assert.match(unity,/BUILD_ONCE_PER_SOURCE_FINGERPRINT=ENABLED/);
  assert.match(unity,/IMMUTABLE_ARTIFACT_REUSE=ENABLED/);
  assert.match(unity,/RESUME_EXACT_FAILURE_POINT=ENABLED/);
  assert.match(unity,/QUALITY_GATE_WEAKENING=NO/);
});
test('director recovery can only restart the central DEVELOPMENT_CONFIRMED runtime',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/Company DEVELOPMENT_CONFIRMED Runtime/);
  assert.match(director,/company-development-confirmed-runtime\.yml/);
  assert.doesNotMatch(director,/Autonomous Continuous Development/);
  assert.doesNotMatch(director,/autonomous-continuous-development\.yml/);
  assert.doesNotMatch(director,/tools\/autonomous-/);
});

test('technical release implementation remains subordinate to central evidence gates',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const releaseCycle=read('tools/company-release-production-cycle.mjs');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  const release=roadmap.developmentLifecycleMachine.internalPlatformReleaseAndPublicExposureGate;
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.externalRelease.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
  assert.equal(release.internalRelease.foundationValidationRequired,true);
  assert.equal(release.internalRelease.actualRuntimeFoundationF1ThroughF4Required,true);
  assert.ok(releaseCycle.includes('company-learning/platform-release-roadmap.json'));
});
test('native development trigger ownership avoids duplicate central plus child push execution',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const developmentPush=development.slice(development.indexOf('on:'),development.indexOf('workflow_dispatch:'));
  const robloxPush=roblox.slice(roblox.indexOf('on:'),roblox.indexOf('workflow_call:'));
  const unityPush=unity.slice(unity.indexOf('on:'),unity.indexOf('workflow_call:'));
  for(const commonPath of [
    'company-learning/platform-release-roadmap.json',
    'company-learning/company-architecture-map.json',
    'company-learning/company-log-map.json',
    'tools/company-shared-context.mjs',
    'tools/company-selected-platform-router.mjs',
    'tools/company-upper-platform-admission.mjs',
    'tools/company-minimum-design-contract.mjs',
    'company-asset-library.json',
  ]) assert.ok(developmentPush.includes(commonPath),commonPath);
  for(const childPath of [
    '.github/workflows/company-development-roblox-runtime.yml',
    '.github/workflows/company-development-roblox-runtime-continuation.yml',
    '.github/workflows/company-development-roblox-headless-fast-mvp.yml',
    '.github/workflows/company-development-unity-runtime.yml',
    'unity-games/**',
  ]) assert.ok(!developmentPush.includes(childPath),childPath);
  assert.ok(robloxPush.includes('.github/workflows/company-development-roblox-runtime.yml'));
  assert.ok(robloxPush.includes('tools/company-development-roblox-build-preflight.mjs'));
  assert.ok(unityPush.includes('unity-games/**'));
});

test('director drains superseded runner backlog before noncritical supervision',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const jobsAt=director.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(director.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(director,/supervise:[\s\S]*?concurrency:[\s\S]*?group: director-central-company-supervise-v3[\s\S]*?cancel-in-progress: false/);
  assert.match(director,/runner-drain:[\s\S]*runs-on: ubuntu-24\.04-arm/);
  assert.match(director,/game-primary-gate:[\s\S]*needs: runner-drain[\s\S]*runs-on: ubuntu-slim/);
  assert.match(director,/actions\/runs\/\$\{run_id\}\/cancel/);
  assert.match(director,/CONTROL_PLANE_SUPERSEDED/);
  assert.match(director,/CENTRAL_DEVELOPMENT_PUSH_SUPERSEDED/);
  assert.match(director,/company-development-roblox-runtime\.yml/);
  assert.match(director,/company-development-roblox-release-promotion\.yml/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
  assert.match(director,/JSON\.stringify\(j\)\+'\\\\n'/);
  assert.match(director,/director-run-drain\.ndjson/);
  assert.doesNotMatch(director,/DUPLICATE_TITLE:[^\n]*company-development-unity-runtime\.yml/);
});

test('runner drain uses a YAML-safe delimiter and preserves the game gate block',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/while IFS='\\|' read -r run_id reason; do/);
  assert.doesNotMatch(director,/while IFS=\$'\\t'/);
  assert.match(director,/game-primary-gate:\n\s+needs: runner-drain\n\s+if: always\(\) && \(github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion != 'cancelled'\)[\s\S]{0,180}?runs-on: ubuntu-slim[\s\S]{0,180}?outputs:/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
});

test('runner drain bypasses the stale supervisor group and evicts stale legacy Roblox runs',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const jobsAt=director.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(director.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(director,/supervise:[\s\S]*?group: director-central-company-supervise-v3/);
  assert.match(director,/runner-drain:[\s\S]*runs-on: ubuntu-24\.04-arm/);
  assert.doesNotMatch(director,/for page in \$\(seq 1 20\); do/);
  assert.match(director,/fetch_runs 'status=in_progress&per_page=100'/);
  assert.match(director,/fetch_runs 'status=queued&per_page=100'/);
  assert.match(director,/ROBLOX_STALE_LEGACY_OR_BATCH/);
  assert.match(director,/15\*60\*1000/);
  assert.match(director,/actions\/runs\/\$\{run_id\}\/force-cancel/);
  assert.match(director,/String\(r\.display_title\|\|''\)==='Company DEVELOPMENT_CONFIRMED Roblox Runtime'/);
  assert.match(director,/String\(r\.display_title\|\|''\)==='Roblox runtime · batch'/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
});


test('director cancellation cleanup does not recursively wake another drain while success and failure wakes remain eligible',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/runner-drain:\n[\s\S]{0,220}?if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion != 'cancelled'/);
  assert.match(director,/game-primary-gate:\n[\s\S]{0,220}?if: always\(\) && \(github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion != 'cancelled'\)/);
  assert.match(director,/supervise:\n[\s\S]{0,260}?github\.event\.workflow_run\.conclusion != 'cancelled'/);
});

test('central native planner suppresses already-active per-game child dispatches',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  assert.match(unity,/run-name: Unity runtime · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(development,/Fetch active native lane identities/);
  assert.match(development,/active-roblox-native-runs\.json/);
  assert.match(development,/active-unity-native-runs\.json/);
  assert.match(development,/ROBLOX_NATIVE_DISPATCH_DEDUPED_ACTIVE=/);
  assert.match(development,/UNITY_NATIVE_DISPATCH_DEDUPED_ACTIVE=/);
  assert.match(development,/roblox_count=/);
  assert.match(development,/unity_count=/);
  assert.match(development,/fromJSON\(needs\.native-plan\.outputs\.roblox_json\)/);
  assert.match(development,/fromJSON\(needs\.native-plan\.outputs\.unity_json\)/);
});

test('director runner drain advances latest scheduler without cancelling running game work',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/CURRENT_MAIN_SHA="\$current_main"[^\n]*node/);
  assert.match(director,/VIBE2_STALE_UNSTARTED_SCHEDULER/);
  assert.match(director,/VIBE2_STALE_UNSTARTED_FANIN_REFILL/);
  assert.match(director,/unity-android-independent-qa\.yml/);
  assert.match(director,/unity-android-regression\.yml/);
  assert.match(director,/const queued=new Set\(\['queued','pending','requested'\]\)/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
  assert.doesNotMatch(director,/VIBE2_STALE_UNSTARTED_SCHEDULER[\s\S]{0,400}in_progress/);
});

test('director coalesces disposable pre-supervision control jobs but preserves supervise completion',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/runner-drain:[\s\S]*?group: director-runner-drain-v1[\s\S]*?cancel-in-progress: true/);
  assert.match(director,/game-primary-gate:[\s\S]*?group: director-game-primary-gate-v1[\s\S]*?cancel-in-progress: true/);
  assert.match(director,/supervise:[\s\S]*?group: director-central-company-supervise-v3[\s\S]*?cancel-in-progress: false/);
});


test('central development planner removes duplicate runtime contract QA from the game dispatch path',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const nativeStart=development.indexOf('\n  native-plan:\n');
  const dispatchStart=development.indexOf('\n  dispatch-roblox:\n');
  assert.ok(nativeStart>0&&dispatchStart>nativeStart);
  const nativePlan=development.slice(nativeStart,dispatchStart);
  assert.match(nativePlan,/runs-on: ubuntu-24\.04-arm/);
  assert.match(nativePlan,/Validate direct-native admission contract/);
  assert.doesNotMatch(nativePlan,/node --test qa\/company-selected-platform-router\.test\.mjs/);
  assert.doesNotMatch(nativePlan,/node --test qa\/company-minimum-design-contract\.test\.mjs/);
  assert.doesNotMatch(nativePlan,/node --test qa\/company-upper-platform-admission\.test\.mjs/);
  assert.doesNotMatch(development,/\n  contract-audit:\n/);
  assert.doesNotMatch(development,/Audit central development contracts without blocking game dispatch/);
  assert.match(development,/Fetch queue authority and active native lane identities in parallel/);
  assert.match(development,/git fetch --no-tags --depth=1 origin "\$COMPANY_RUNTIME_BRANCH" &/);
  assert.match(development,/queue_fetch_pid=\$!/);
  assert.match(development,/wait "\$queue_fetch_pid" \|\| queue_fetch_status=\$\?/);
  assert.match(development,/NATIVE_QUEUE_AUTHORITY_FETCH=PASS/);
  assert.match(development,/company-development-roblox-runtime\.yml\/runs\?per_page=100&page=\$page/);
  assert.match(development,/company-development-unity-runtime\.yml\/runs\?per_page=100&page=\$page/);
  assert.match(development,/for page in 1 2 3; do/);
  assert.match(development,/pids\+=\("\$!"\)/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_PAGE_FAIL=/);
  assert.match(development,/jq -s '\{workflow_runs:\(map\(\.workflow_runs \/\/ \[\]\)\|add\)\}'/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_PAGES=3/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN=PASS/);
});

test('central policy architecture and log maps bind the development floor parallel repair',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const change=roadmap.changeRecord?.developmentFloorParallelBottleneckRepair20260927;
  assert.equal(change?.centralPlanner?.duplicateRuntimeContractAuditRemoved,true);
  assert.equal(change?.centralPlanner?.canonicalQaAuthorityPreserved,true);
  assert.equal(change?.centralPlanner?.activeRobloxAndUnityRunScansParallel,true);
  assert.equal(change?.unityWebPerGameConcurrency?.independentGamesRemainParallel,true);
  assert.equal(change?.unityWebPerGameConcurrency?.globalUnityWebSerializationForbidden,true);
  assert.equal(change?.qualitySecurityReleaseGatesUnchanged,true);
  assert.equal(architecture.developmentFloorParallelBottleneckRepair?.centralPlanner?.blockingScope,'ADMISSION_CRITICAL_ONLY');
  assert.equal(architecture.developmentFloorParallelBottleneckRepair?.unityWebFloor?.independentGameParallelism,true);
  assert.equal(logMap.developmentFloorParallelBottleneckRepairEvidence?.duplicateRuntimeAuditPresent,false);
  assert.equal(logMap.developmentFloorParallelBottleneckRepairEvidence?.independentGameParallelismRequired,true);
});

test('Unity Web floor serializes only the same game while independent games remain parallel',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const workflow=read('.github/workflows/unity-web-first-stage-build.yml');
  assert.match(development,/dispatch-unity-web-floor:[\s\S]*?group: unity-web-floor-call-\$\{\{ matrix\.game_id \}\}[\s\S]*?cancel-in-progress: false/);
  assert.match(workflow,/build:\n\s+concurrency:\n\s+group: unity-web-floor-exec-\$\{\{ inputs\.game_id \|\| inputs\.request_file \|\| github\.run_id \}\}[\s\S]*?cancel-in-progress: false[\s\S]*?runs-on: ubuntu-latest/);
  assert.doesNotMatch(workflow,/UNITY_WEB_FLOOR_EXACT_DEDUPED_ACTIVE=/);
  assert.doesNotMatch(development,/strategy:[\s\S]{0,160}?max-parallel:/);
});


test('central native active-run dedupe covers the full 256 game execution window',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  assert.equal(Number(roadmap.developmentSpeedExecution?.externalMatrixBatchMax),256);
  assert.match(development,/for page in 1 2 3; do/);
  assert.match(development,/per_page=100&page=\$page/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_ROBLOX_ROWS=/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_UNITY_ROWS=/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_PAGES=3/);
  assert.match(development,/NATIVE_QUEUE_AUTHORITY_FETCH=PASS/);
  assert.match(development,/git fetch --no-tags --depth=1 origin "\$COMPANY_RUNTIME_BRANCH" &/);
  const record=roadmap.changeRecord?.activeNativeRunDedupeCoverage20260927;
  assert.equal(record?.queueAuthorityFetchParallelWithRunScan,true);
  assert.equal(record?.queueAuthorityFetchFailureBlocksDispatch,true);
  assert.equal(architecture.activeNativeRunDedupeCoverage?.queueAuthorityFetchParallelWithRunScan,true);
  assert.equal(logMap.activeNativeRunDedupeCoverageEvidence?.queueAuthorityFetchParallelWithRunScan,true);
  assert.ok(logMap.activeNativeRunDedupeCoverageEvidence?.markers?.includes('NATIVE_QUEUE_AUTHORITY_FETCH=PASS'));
});


test('Roblox runtime planners reuse central contract QA and keep responsibility-local tests only',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const continuation=read('.github/workflows/company-development-roblox-runtime-continuation.yml');
  const centralQa=read('.github/workflows/company-central-policy-contract-qa.yml');
  const change=roadmap.changeRecord?.robloxPlannerDuplicateContractQaRemoval20260927;

  for(const testFile of [
    'qa/company-shared-context.test.mjs',
    'qa/company-development-roblox-runtime.test.mjs',
    'qa/company-selected-platform-router.test.mjs',
  ]){
    assert.ok(centralQa.includes(testFile),testFile+' central QA authority');
  }
  assert.ok(centralQa.includes('qa/company-development-roblox-runtime-continuation.test.mjs'));
  assert.doesNotMatch(roblox,/node --test qa\/company-shared-context\.test\.mjs/);
  assert.doesNotMatch(roblox,/node --test[^\n]*company-development-roblox-runtime\.test\.mjs/);
  assert.doesNotMatch(roblox,/node --test[^\n]*company-selected-platform-router\.test\.mjs/);
  assert.doesNotMatch(continuation,/node --test qa\/company-development-roblox-runtime-continuation\.test\.mjs/);

  for(const local of [
    'qa/company-development-roblox-source-reconcile.test.mjs',
    'qa/company-development-roblox-package.test.mjs',
    'qa/company-development-roblox-independent-promotion.test.mjs',
    'qa/company-upper-platform-admission.test.mjs',
  ]) assert.ok(roblox.includes(local),local+' responsibility-local test retained');

  assert.equal(change?.canonicalQaAuthority,'.github/workflows/company-central-policy-contract-qa.yml');
  assert.equal(change?.duplicateValidationForbidden,true);
  assert.equal(change?.gameDispatchWaitsForDuplicateQa,false);
  assert.equal(change?.qualitySecurityReleaseGatesUnchanged,true);
  assert.equal(architecture.robloxPlannerDuplicateContractQaRemoval?.runtimeCriticalPathWaitsForDuplicateQa,false);
  assert.equal(logMap.robloxPlannerDuplicateContractQaRemovalEvidence?.duplicateRuntimeTestsPresent,false);
});


test('Unity prepare delegates all contract tests to canonical QA and keeps only runtime compilation on the critical path',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const centralQa=read('.github/workflows/company-central-policy-contract-qa.yml');
  const change=roadmap.changeRecord?.unityPlannerDuplicateContractQaRemoval20260927;

  for(const testFile of [
    'qa/company-shared-context.test.mjs',
    'qa/company-selected-platform-router.test.mjs',
    'qa/company-development-unity-runtime.test.mjs',
    'qa/company-upper-platform-admission.test.mjs',
    'qa/unity-package-fatal-logcat.test.mjs',
  ]){
    assert.ok(centralQa.includes(testFile),testFile+' canonical QA authority');
  }
  assert.doesNotMatch(unity,/node --test/);
  assert.match(unity,/node --check tools\/company-upper-platform-admission\.mjs/);
  assert.match(unity,/node --check tools\/company-development-unity-platform\.mjs/);
  assert.match(unity,/UNITY_PREPARE_CONTRACT_VERIFY=PASS/);
  assert.match(unity,/UNITY_PREPARE_INPUT_OVERLAP=PASS/);

  assert.equal(change?.canonicalQaAuthority,'.github/workflows/company-central-policy-contract-qa.yml');
  assert.equal(change?.duplicateValidationForbidden,true);
  assert.equal(change?.gameDispatchWaitsForDuplicateQa,false);
  assert.equal(change?.runtimePrepareContractTestsRemaining,0);
  assert.equal(change?.canonicalQaPathTriggersIncludeMovedTests,true);
  assert.equal(change?.canonicalUnityStageOrderUnchanged,true);
  assert.equal(change?.qualitySecurityReleaseGatesUnchanged,true);
  assert.deepEqual(architecture.unityPlannerDuplicateContractQaRemoval?.runtimeCriticalPathContractTests,[]);
  assert.equal(architecture.unityPlannerDuplicateContractQaRemoval?.runtimeCriticalPathWaitsForDuplicateQa,false);
  assert.equal(logMap.unityPlannerDuplicateContractQaRemovalEvidence?.runtimeContractTestsRemaining,0);
  assert.equal(logMap.unityPlannerDuplicateContractQaRemovalEvidence?.duplicateRuntimeTestsPresent,false);
});
