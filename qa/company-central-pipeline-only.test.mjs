// 파일명: qa/company-central-pipeline-only.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(repoRoot,relative));

test('owner design reset refreshes shallow tracking refs after a concurrent runtime update',t=>{
  const workflow=read('.github/workflows/owner-all-games-design-reset.yml');
  const fetchCommand=workflow.match(/git fetch --depth=1 origin \\\n\s+[^\n]+\\\n\s+[^\n]+/)?.[0];
  assert.ok(fetchCommand);
  assert.doesNotMatch(workflow,/git push (?:--force|-f)(?:\s|$)/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-reset-fetch-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:'pipe'}).trim();
  const origin=path.join(dir,'origin.git'),writer=path.join(dir,'writer'),reader=path.join(dir,'reader');
  git(dir,'init','--bare',origin);git(dir,'init','-b','main',writer);
  git(writer,'config','user.name','QA');git(writer,'config','user.email','qa@example.invalid');
  fs.writeFileSync(path.join(writer,'state.json'),'base\n');
  git(writer,'add','.');git(writer,'commit','-m','base');
  git(writer,'remote','add','origin',origin);git(writer,'push','origin','main','main:company-runtime');
  git(dir,'clone','--depth=1','--branch','main','file://'+origin,reader);
  const refresh=()=>execFileSync('bash',['-euc',fetchCommand],{cwd:reader,encoding:'utf8',stdio:'pipe',env:{...process.env,COMPANY_RUNTIME_BRANCH:'company-runtime'}});
  refresh();
  fs.writeFileSync(path.join(writer,'state.json'),'other-worker\n');
  git(writer,'add','.');git(writer,'commit','-m','concurrent runtime checkpoint');
  const latest=git(writer,'rev-parse','HEAD');git(writer,'push','origin','HEAD:company-runtime');
  assert.throws(()=>git(reader,'fetch','--depth=1','origin','company-runtime:refs/remotes/origin/company-runtime'),error=>/non-fast-forward/.test(String(error.stderr)));
  refresh();
  assert.equal(git(reader,'rev-parse','refs/remotes/origin/company-runtime'),latest);
  git(reader,'checkout','-B','owner-all-games-design-reset-runtime','origin/company-runtime');
  assert.equal(fs.readFileSync(path.join(reader,'state.json'),'utf8'),'other-worker\n');
  assert.equal(git(reader,'rev-parse','HEAD'),latest);
});

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
test('owner policy defines exactly three platform targets on existing adapters and Unity Web floor',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const direct=roadmap.directNativeDualPlatformDevelopment;
  const targets=direct.platformCountingPolicy;
  assert.equal(targets.authority,'OWNER_DIRECTIVE_2026-10-09');
  assert.equal(targets.targetCount,3);
  assert.deepEqual(targets.targets,['ROBLOX','UNITY_ANDROID','UNITY_WEB']);
  assert.deepEqual(targets.existingExecutionBindings,{
    ROBLOX:'ROBLOX',UNITY_ANDROID:'UNITY',UNITY_WEB:'UNITY_WEB_FLOOR'
  });
  assert.deepEqual(targets.nativeRouterKeysUnchanged,['ROBLOX','UNITY']);
  assert.deepEqual(roadmap.commonExecutionContract.allowedPlatforms,['ROBLOX','UNITY']);
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(targets.unityAndroidAndWebShareCanonicalUnityProject,true);
  assert.equal(direct.unityWebDevelopmentLane.sameCanonicalUnityProjectRequired,true);
  assert.equal(direct.unityWebDevelopmentLane.codeDevelopmentRequired,true);
  assert.equal(direct.unityWebDevelopmentLane.actualBrowserPlayRequired,true);
  assert.equal(direct.unityWebDevelopmentLane.independentQaRequired,true);
  assert.equal(direct.unityWebDevelopmentLane.regressionRequired,true);
  assert.equal(targets.unityWebIsNotASeparateLegacyWebGameplayCodebase,true);
  assert.equal(direct.unityWebDevelopmentLane.separateWebGameplayCodebaseForbidden,true);
  assert.equal(targets.fortniteUefnExcluded,true);
  assert.equal(direct.fortniteUefnDevelopmentStatus,'DEVELOPMENT_PAUSED');
  assert.equal(targets.existingF0F9OrderAndRuntimeSecurityQaReleaseGatesPreserved,true);
  assert.equal(roadmap.finalDevelopmentLock.sequenceLock.status,'LOCKED');
  assert.equal(direct.unityWebDevelopmentLane.nativeReleaseGateAuthority,false);
  assert.equal(targets.noNewAdapterWorkflowOrShadowPipeline,true);
  assert.equal(roadmap.changeRecord.ownerThreePlatformTargets20261009.targetCount,3);
});

test('obsolete Roblox runtime v8 migration helpers are removed',()=>{
  assert.equal(exists('.github/workflows/roblox-runtime-v8-finalize.yml'),false);
  assert.equal(exists('.github/workflows/roblox-runtime-v8-local-finalize.yml'),false);
  assert.equal(exists('tools/company-finalize-roblox-runtime-v8.py'),false);
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
  assert.doesNotMatch(development,/gh workflow run (?:company-development-roblox-runtime|company-development-unity-runtime|unity-web-first-stage-build|unity-web-floor-source-bootstrap)\.yml/);
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
test('direct horror edits re-enter the canonical development flow',()=>{
  const reconcile=read('.github/workflows/company-development-queue-reconcile.yml');
  const central=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.match(reconcile,/roblox-games\/horror-escape-room\/\*\*/);
  assert.match(reconcile,/assets\/roblox\/midnight-manor\/\*\*/);
  assert.match(reconcile,/git add -- development-queue\.json game-catalog\.json game-seed-state\.json/);
  assert.doesNotMatch(central,/ownerExcludedGameIds/);
  assert.doesNotMatch(central,/\['horror-escape-room'\]/);
});

test('unscoped development coordinator dedupes against active push and manual batches',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.match(development,/actions\/workflows\/company-development-confirmed-runtime\.yml\/runs\?per_page=100&page=\$page/);
  assert.doesNotMatch(development,/company-development-confirmed-runtime\.yml\/runs\?event=workflow_dispatch/);
  assert.match(development,/DEVELOPMENT_COORDINATOR_SCAN_INCLUDES_PUSH_AND_DISPATCH=YES/);
  assert.match(development,/DEVELOPMENT_COORDINATOR_ADMISSION=DEDUPED_ACTIVE_BATCH/);
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
    'tools/company-shared-context.mjs',
    'tools/company-selected-platform-router.mjs',
    'tools/company-upper-platform-admission.mjs',
    'tools/company-minimum-design-contract.mjs',
    'company-asset-library.json',
  ]) assert.ok(developmentPush.includes(commonPath),commonPath);
  for(const nonRuntimeWake of [
    'company-learning/company-architecture-map.json',
    'company-learning/company-log-map.json',
    'qa/company-selected-platform-router.test.mjs',
    'qa/company-minimum-design-contract.test.mjs',
    'qa/company-upper-platform-admission.test.mjs',
    'qa/company-unity-web-gameplay-validation.test.mjs',
  ]) assert.ok(!developmentPush.includes(nonRuntimeWake),nonRuntimeWake);
  assert.match(development,/group: company-development-confirmed-\$\{\{ \(github\.event_name == 'push' && 'main-push'\) \|\| github\.run_id \}\}/);
  assert.doesNotMatch(development,/group: company-development-confirmed-\$\{\{[^\n]*inputs\.game_id/);
  assert.match(development,/group: company-development-confirmed-[\s\S]{0,260}?cancel-in-progress: false/);
  assert.doesNotMatch(roblox.slice(0,roblox.indexOf('\njobs:\n')),/\nconcurrency:\n/);
  assert.doesNotMatch(unity.slice(0,unity.indexOf('\njobs:\n')),/\nconcurrency:\n/);
  assert.match(roblox,/ROBLOX_RUNTIME_ACTIVE_WINNER=/);
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

test('owner horror edits automatically re-enter the canonical development flow',()=>{
  const horror=read('.github/workflows/horror-owner-system-publish.yml');
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.match(horror,/roblox-games\/horror-escape-room\/\*\*/);
  assert.match(horror,/assets\/roblox\/midnight-manor\/\*\*/);
  assert.match(horror,/actions: write/);
  assert.match(horror,/gh workflow run company-design-promotion-sync\.yml/);
  assert.match(horror,/--ref main/);
  assert.match(horror,/HORROR_CANONICAL_FLOW=DESIGN_PROMOTION_TO_DEVELOPMENT/);
  assert.doesNotMatch(development,/ownerExcludedGameIds[^\n]*horror-escape-room/);
});

test('platform exposure sync has no workflow-wide lock and Director has no hard-coded stale run ids',()=>{
  const exposure=read('.github/workflows/company-platform-exposure-sync.yml');
  const director=read('.github/workflows/director-supervisor.yml');
  const jobsAt=exposure.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(exposure.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(exposure,/for attempt in 1 2 3 4/);
  assert.match(exposure,/git -C "\$worktree" push origin "HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.doesNotMatch(director,/for stale_run_id in [0-9 ]+; do/);
  assert.doesNotMatch(director,/OWNER_STALE_RUN_CLEANUP|DIRECTOR_OWNER_STALE_/);
});

test('director drains superseded runner backlog before noncritical supervision',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const jobsAt=director.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(director.slice(0,jobsAt),/\nconcurrency:/);
  assert.ok(director.includes("    - cron: '*/15 * * * *'"));
  assert.match(director,/supervise:[\s\S]*?concurrency:[\s\S]*?group: director-central-company-supervise-v3[\s\S]*?cancel-in-progress: false/);
  assert.match(director,/runner-drain:[\s\S]*runs-on: ubuntu-24\.04/);
  assert.doesNotMatch(director,/game-primary-gate:\n\s+needs: runner-drain/);
  assert.match(director,/game-primary-gate:[\s\S]*runs-on: ubuntu-slim/);
  assert.match(director,/supervise:\n\s+needs: \[runner-drain, game-primary-gate\]/);
  assert.match(director,/actions\/runs\/\$\{run_id\}\/cancel/);
  assert.match(director,/CONTROL_PLANE_SUPERSEDED/);
  assert.match(director,/ROBLOX_STALE_LEGACY_OR_BATCH' \\|\\| "\\$reason" == 'CONTROL_PLANE_SUPERSEDED'/);
  assert.match(director,/CENTRAL_DEVELOPMENT_PUSH_SUPERSEDED/);
  assert.match(director,/CENTRAL_DEVELOPMENT_BATCH_DUPLICATE_SAME_HEAD/);
  assert.match(director,/CENTRAL_MANUAL_BATCH_SUPERSEDED_BY_ACTIVE_BATCH/);
  assert.match(director,/centralBatchByHead/);
  assert.match(director,/company-development-roblox-runtime\.yml/);
  assert.match(director,/company-development-roblox-release-promotion\.yml/);
  assert.match(director,/company-platform-exposure-sync\.yml/);
  assert.match(director,/company-development-roblox-runtime-continuation\.yml/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
  assert.match(director,/DIRECTOR_GAME_PRIMARY_CURRENT_MAIN=/);
  assert.match(director,/JSON\.stringify\(j\)\+'\\\\n'/);
  assert.match(director,/director-run-drain\.ndjson/);
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/company-development-unity-runtime\.yml',true\)/);
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/vibe2-24h-runner\.yml',true\)/);
  assert.match(director,/CENTRAL_DEVELOPMENT_STALE_HEAD_REPLACED_BY_CURRENT_RUN/);
  assert.match(director,/NATIVE_STALE_BATCH_PUSH_REPLACED_BY_CURRENT_CENTRAL/);
});

test('descriptive central mirrors do not fan out runtime main-push wakes',()=>{
  const pushBlock=workflow=>{
    const start=workflow.indexOf('\n  push:\n');
    assert.ok(start>=0);
    const markers=['\n  pull_request:\n','\n  workflow_dispatch:\n','\n  schedule:\n','\npermissions:\n','\nconcurrency:\n','\nenv:\n','\njobs:\n'];
    const ends=markers.map(marker=>workflow.indexOf(marker,start+1)).filter(index=>index>start);
    const end=ends.length?Math.min(...ends):workflow.length;
    return workflow.slice(start,end);
  };
  const seed=read('.github/workflows/company-seed-design-runtime.yml');
  const homepage=read('.github/workflows/homepage-manager.yml');
  const status=read('.github/workflows/company-status-sync.yml');
  const dna=read('.github/workflows/company-dna-learning.yml');
  const security=read('.github/workflows/company-security-immune.yml');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  for(const workflow of [seed,homepage,status]){
    const push=pushBlock(workflow);
    assert.doesNotMatch(push,/company-learning\/company-architecture-map\.json/);
    assert.doesNotMatch(push,/company-learning\/company-log-map\.json/);
    assert.match(push,/company-learning\/platform-release-roadmap\.json/);
  }
  const dnaPush=pushBlock(dna);
  assert.doesNotMatch(dnaPush,/company-learning\/\*\*/);
  assert.doesNotMatch(dnaPush,/company-learning\/company-architecture-map\.json/);
  assert.doesNotMatch(dnaPush,/company-learning\/company-log-map\.json/);
  for(const required of [
    'company-learning/evidence/**',
    'company-learning/training-samples/**',
    'company-learning/company-dna.json',
    'company-learning/distillation-status.json',
    'company-learning/invalidated-learning-sources.json',
  ]) assert.ok(dnaPush.includes(required),required);
  const securityPush=pushBlock(security);
  assert.match(securityPush,/company-learning\/company-architecture-map\.json/);
  assert.match(securityPush,/company-learning\/company-log-map\.json/);
  const change=roadmap.changeRecord?.descriptiveMirrorPushWakeReduction20260928||{};
  assert.equal(change.securityMainPushValidationPreserved,true);
  assert.equal(change.dnaLearningEvidencePathsOnly,true);
  assert.equal(change.centralPolicyQaPreserved,true);
  assert.equal(architecture.descriptiveMirrorPushWakeReduction?.mirrorOnlyRuntimeWakeRemoved,true);
  assert.equal(logMap.descriptiveMirrorPushWakeReductionEvidence?.securityMainPushValidationPreserved,true);
});

test('homepage completion does not redundantly wake the full central Director',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const homepage=read('.github/workflows/homepage-manager.yml');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const workflowRunBlock=director.slice(director.indexOf('  workflow_run:'),director.indexOf('  push:',director.indexOf('  workflow_run:')));

  assert.doesNotMatch(workflowRunBlock,/^\s*-\s+Homepage Manager\s*$/m);
  assert.match(homepage,/\n  director-supervision:\n/);
  assert.equal(roadmap.changeRecord?.directorHomepageWakeDecoupling20260927?.homepagePipelineOwnsDirectorSupervision,true);
  assert.equal(roadmap.changeRecord?.directorHomepageWakeDecoupling20260927?.homepageManagerWorkflowRunWakeRemovedFromCentralDirector,true);
  assert.equal(roadmap.changeRecord?.directorHomepageWakeDecoupling20260927?.centralDirectorManualSchedulePushAndRelevantWorkflowRunWakesPreserved,true);
  assert.equal(architecture.directorHomepageWakeDecoupling?.homepageInternalDirectorSupervision,true);
  assert.equal(architecture.directorHomepageWakeDecoupling?.centralDirectorWorkflowRunWakeFromHomepageManager,false);
  assert.equal(architecture.runnerQueueDrainTopology?.homepageCompletionWakeRemoved,true);
  assert.equal(logMap.directorHomepageWakeDecouplingEvidence?.removedWorkflowRunSource,'Homepage Manager');
  assert.equal(logMap.directorHomepageWakeDecouplingEvidence?.homepageInternalDirectorSupervisionExpected,true);
});

test('runner drain uses separate fixed 24.04 capacity without moving gate or heavy game work',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  assert.match(director,/runner-drain:[\s\S]*?runs-on: ubuntu-24\.04/);
  assert.match(director,/game-primary-gate:[\s\S]*?runs-on: ubuntu-slim/);
  assert.match(director,/supervise:[\s\S]*?runs-on: ubuntu-slim/);
  assert.equal(roadmap.changeRecord?.directorDrainRunnerIsolation20260927?.runnerDrainRunner,'ubuntu-24.04');
  assert.equal(architecture.runnerQueueDrainTopology?.runner,'ubuntu-24.04');
  assert.equal(architecture.controlPlaneOperationalRunnerIsolation?.director?.runnerDrain,'ubuntu-24.04');
  assert.equal(logMap.controlPlaneGameRunnerEvictionEvidence?.expectedRunnerLabels?.directorDrain,'ubuntu-24.04');
  assert.equal(logMap.gameControlRunnerPoolEvidence?.expectedRunnerLabels?.directorDrain,'ubuntu-24.04');
  assert.equal(logMap.directorDrainRunnerIsolationEvidence?.expectedRunnerLabel,'ubuntu-24.04');
});

test('runner drain keeps active same-game work but prefers the newest queued native runtime',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const policy=roadmap.changeRecord?.runnerQueueDrain20260926||{};
  const topology=architecture.runnerQueueDrainTopology||{};
  const evidence=logMap.runnerQueueDrainEvidence||{};

  assert.match(director,/const dedupeByTitle=\(path,newestQueuedWins=false\)=>/);
  assert.match(director,/if\(inProgress\.length\)winner=inProgress\[0\]/);
  assert.match(director,/else if\(newestQueuedWins\)winner=\[\.\.\.group\]\.sort\(\(a,b\)=>Number\(b\.id\)-Number\(a\.id\)\)\[0\]/);
  assert.match(director,/DUPLICATE_TITLE_STALE_QUEUED/);
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/company-development-roblox-runtime\.yml',true\)/);
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/company-development-unity-runtime\.yml',true\)/);
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/company-development-roblox-release-promotion\.yml',false\)/);

  assert.equal(policy.sameTitleRuntimeQueuedWinner,'LATEST_WHEN_NO_IN_PROGRESS');
  assert.equal(policy.sameTitleRuntimeInProgressWinner,'ACTIVE_RUN_PRESERVED');
  assert.equal(policy.robloxExactGameNewestQueuedPreserved,true);
  assert.equal(policy.unityExactGameNewestQueuedPreserved,true);
  assert.equal(policy.activeSameGameCancellationForbidden,true);
  assert.equal(policy.releaseAndQaFifoSemanticsUnchanged,true);
  assert.equal(topology.sameTitleRuntimeQueuedWinner,'LATEST_WHEN_NO_IN_PROGRESS');
  assert.equal(topology.sameTitleRuntimeInProgressWinner,'ACTIVE_RUN_PRESERVED');
  assert.equal(topology.activeSameGameCancellationForbidden,true);
  assert.equal(evidence.staleQueuedSameTitleReason,'DUPLICATE_TITLE_STALE_QUEUED');
  assert.equal(evidence.newestQueuedSameTitlePreserved,true);
  assert.equal(evidence.inProgressSameTitleCancellationForbidden,true);
});

test('director coalesces queued Recovery Fast wakes while preserving active recovery and game work',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/r\.path==='\.github\/workflows\/vibe2-recovery-fast\.yml'/);
  assert.match(director,/const recoveryFastQueued=/);
  assert.match(director,/recoveryFastQueued\.slice\(1\)/);
  assert.match(director,/VIBE2_RECOVERY_FAST_SUPERSEDED_QUEUED/);
  assert.match(director,/VIBE2_RECOVERY_FAST_SUPERSEDED_QUEUED' \]\]; then|VIBE2_RECOVERY_FAST_SUPERSEDED_QUEUED/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
  assert.doesNotMatch(director,/recoveryFastQueued[\s\S]{0,400}?in_progress/);
});

test('runner drain workflow shell parses as Bash',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const step='      - name: Cancel superseded control-plane and duplicate Roblox queue runs\n';
  const stepAt=director.indexOf(step);
  const runAt=director.indexOf('        run: |\n',stepAt);
  const nextJob=director.indexOf('\n  game-primary-gate:',runAt);
  assert.ok(stepAt>=0&&runAt>stepAt&&nextJob>runAt);
  const raw=director.slice(runAt+'        run: |\n'.length,nextJob);
  const script=raw.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n')+'\n';
  assert.doesNotThrow(()=>execFileSync('bash',['-n'],{input:script,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
});

test('runner drain uses a YAML-safe delimiter and preserves the game gate block',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/while IFS='\\|' read -r run_id reason; do/);
  assert.doesNotMatch(director,/while IFS=\$'\\t'/);
  assert.match(director,/game-primary-gate:\n(?:\s+#.*\n)*\s+if: always\(\) && \(github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion != 'cancelled'\)[\s\S]*?runs-on: ubuntu-slim[\s\S]*?outputs:/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
});

test('runner drain bypasses the stale supervisor group and evicts stale legacy Roblox runs',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const jobsAt=director.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(director.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(director,/supervise:[\s\S]*?group: director-central-company-supervise-v3/);
  assert.match(director,/runner-drain:[\s\S]*runs-on: ubuntu-24\.04/);
  assert.doesNotMatch(director,/for page in \$\(seq 1 20\); do/);
  assert.match(director,/local paginate="\$\{2:-false\}"/);
  assert.match(director,/page_query="\$\{query\}&page=\$\{page\}"/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_FETCH_PAGE=/);
  assert.match(director,/fetch_runs 'per_page=100'\n/);
  assert.match(director,/fetch_runs 'status=in_progress&per_page=100' true/);
  assert.match(director,/fetch_runs 'status=queued&per_page=100' true/);
  assert.match(director,/fetch_runs 'status=pending&per_page=100' true/);
  assert.match(director,/fetch_runs 'status=requested&per_page=100' true \|\| true/);
  assert.match(director,/fetch_runs 'status=waiting&per_page=100' true \|\| true/);
  assert.match(director,/ROBLOX_STALE_LEGACY_OR_BATCH/);
  assert.match(director,/15\*60\*1000/);
  assert.match(director,/actions\/runs\/\$\{run_id\}\/force-cancel/);
  assert.match(director,/String\(r\.display_title\|\|''\)==='Company DEVELOPMENT_CONFIRMED Roblox Runtime'/);
  assert.match(director,/String\(r\.display_title\|\|''\)==='Roblox runtime · batch'/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
});


test('director paginates pending candidate-release backlog beyond the mixed recent page',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const start=director.indexOf("fetch_runs 'per_page=100'");
  const end=director.indexOf('current_main=',start);
  assert.ok(start>=0&&end>start);
  const fetchBlock=director.slice(start,end);
  assert.match(fetchBlock,/fetch_runs 'status=pending&per_page=100' true/);
  assert.match(director,/String\(run\.path\|\|''\)!=='\.github\/workflows\/vibe2-candidate-release\.yml'/);
  assert.match(director,/ROBLOX_LEGACY_STUDIO_MCP_DISABLED_BY_CLOUD_ONLY/);
});

test('director cancellation cleanup does not recursively wake another drain while success and failure wakes remain eligible',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/runner-drain:\n[\s\S]{0,220}?if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion != 'cancelled'/);
  assert.match(director,/game-primary-gate:\n[\s\S]*?if: always\(\) && \(github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion != 'cancelled'\)/);
  assert.match(director,/supervise:\n[\s\S]{0,260}?github\.event\.workflow_run\.conclusion != 'cancelled'/);
});

test('central native planner suppresses already-active per-game child dispatches',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  assert.match(unity,/run-name: Unity runtime · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(development,/Fetch queue authority and active native lane identities in parallel/);
  assert.match(development,/active-roblox-native-runs\.json/);
  assert.match(development,/active-unity-native-runs\.json/);
  assert.match(development,/ROBLOX_NATIVE_DISPATCH_DEDUPED_CURRENT_MAIN=/);
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
  assert.match(director,/CENTRAL_DEVELOPMENT_STALE_HEAD_REPLACED_BY_CURRENT_RUN/);
  assert.match(director,/NATIVE_STALE_BATCH_PUSH_REPLACED_BY_CURRENT_CENTRAL/);
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/vibe2-24h-runner\.yml',true\)/);
  assert.match(director,/unity-android-independent-qa\.yml/);
  assert.match(director,/unity-android-regression\.yml/);
  assert.match(director,/const queued=new Set\(\['queued','pending','requested'\]\)/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_INDEPENDENT_GAME_CANCEL=FORBIDDEN/);
  assert.doesNotMatch(director,/VIBE2_STALE_UNSTARTED_SCHEDULER[\s\S]{0,400}in_progress/);
});

test('director drains only queued stale exact-game coordinator ingress when current-main replacement exists',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/const exactGameId=run=>/);
  assert.match(director,/const currentCentralExactGames=new Set/);
  assert.match(director,/String\(r\.event\|\|''\)==='workflow_dispatch'/);
  assert.match(director,/queued\.has\(String\(r\.status\|\|''\)\.toLowerCase\(\)\)/);
  assert.match(director,/String\(r\.head_sha\|\|''\)===currentMain/);
  assert.match(director,/currentCentralExactGames\.has\(gameId\)/);
  assert.match(director,/CENTRAL_EXACT_GAME_STALE_HEAD_REPLACED_BY_CURRENT_GAME_RUN/);
  assert.match(director,/VIBE2_RECOVERY_FAST_SUPERSEDED_QUEUED'.*CENTRAL_EXACT_GAME_STALE_HEAD_REPLACED_BY_CURRENT_GAME_RUN.*ROBLOX_LEGACY_STUDIO_MCP_DISABLED_BY_CLOUD_ONLY/s);
  assert.doesNotMatch(director,/CENTRAL_EXACT_GAME_STALE_HEAD_REPLACED_BY_CURRENT_GAME_RUN[\s\S]{0,240}in_progress/);
});

test('director coalesces only exact same-head central game ingress and preserves running representative',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/const exactSameHeadGroups=new Map/);
  assert.match(director,/const key=\[gameId,head,title\]\.join\('\|'\)/);
  assert.match(director,/const running=group[\s\S]*?\.filter\(r=>String\(r\.status\|\|''\)\.toLowerCase\(\)==='in_progress'\)/);
  assert.match(director,/const winner=running\[0\]\|\|\[\.\.\.group\]\.sort\(\(a,b\)=>Number\(b\.id\)-Number\(a\.id\)\)\[0\]/);
  assert.match(director,/CENTRAL_EXACT_GAME_DUPLICATE_SAME_HEAD/);
  assert.match(director,/queued\.has\(String\(stale\.status\|\|''\)\.toLowerCase\(\)\)\)add\(stale,'CENTRAL_EXACT_GAME_DUPLICATE_SAME_HEAD'\)/);
  assert.doesNotMatch(director,/CENTRAL_EXACT_GAME_DUPLICATE_SAME_HEAD[\s\S]{0,220}cancel.*in_progress/i);
});

test('director drain QA changes wake the existing runner drain',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const pushBlock=director.slice(director.indexOf('  push:'),director.indexOf('\npermissions:',director.indexOf('  push:')));
  assert.match(pushBlock,/qa\/company-central-pipeline-only\.test\.mjs/);
});

test('director retires only pre-cloud-only Studio MCP tails with no active jobs',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/cloud_only_cutoff='2026-10-05T06:44:59Z'/);
  assert.match(director,/\.github\/workflows\/vibe2-candidate-release\.yml/);
  assert.match(director,/\.includes\('Official Studio MCP actual play '\)/);
  assert.match(director,/active\.length===0&&unfinished\.length>0&&legacyStudio\.length===unfinished\.length\?'RETIRE':'PRESERVE'/);
  assert.match(director,/ROBLOX_LEGACY_STUDIO_MCP_DISABLED_BY_CLOUD_ONLY/);
  assert.match(director,/DIRECTOR_LEGACY_STUDIO_BACKLOG_CANCEL_ENQUEUED_COUNT=/);
  assert.match(director,/VIBE2_RECOVERY_FAST_SUPERSEDED_QUEUED'.*ROBLOX_LEGACY_STUDIO_MCP_DISABLED_BY_CLOUD_ONLY/s);
});

test('runner drain force-settles only still-queued safe duplicates after accepted cancel',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/safe_force_cancel=false/);
  assert.match(director,/DUPLICATE_TITLE_STALE_QUEUED/);
  assert.match(director,/pre_cancel_state=.*actions\/runs\/\$\{run_id\}/);
  assert.match(director,/pre_cancel_active_jobs=.*jobs\?per_page=100/);
  assert.match(director,/if \[ "\$pre_cancel_state" = 'in_progress' \] \|\| \[ "\$\{pre_cancel_active_jobs:-0\}" != '0' \]; then[\s\S]*?DIRECTOR_RUNNER_DRAIN_ACTIVE_PRESERVED=[\s\S]*?continue/);
  assert.match(director,/current_state=.*actions\/runs\/\$\{run_id\}/);
  assert.match(director,/current_state.*'queued'.*'pending'.*'requested'.*'waiting'/s);
  assert.match(director,/force_state=.*actions\/runs\/\$\{run_id\}/);
  assert.match(director,/force_active_jobs=.*jobs\?per_page=100/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_FORCE_CANCELLED_AFTER_ACCEPTED_CANCEL=/);
  assert.match(director,/if \[ "\$force_state" = 'in_progress' \] \|\| \[ "\$\{force_active_jobs:-0\}" != '0' \]; then[\s\S]*?DIRECTOR_RUNNER_DRAIN_ACTIVE_PRESERVED=[\s\S]*?elif \[\[ "\$force_state" == 'queued' \|\| "\$force_state" == 'pending' \|\| "\$force_state" == 'requested' \|\| "\$force_state" == 'waiting' \]\] && gh api --method POST .*force-cancel/);
});

test('director treats accepted asynchronous cancel settlement as success before counting failure',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/for settle_attempt in 1 2 3 4 5; do/);
  assert.match(director,/settle_state=.*actions\/runs\/\$\{run_id\}/);
  assert.match(director,/DIRECTOR_RUNNER_DRAIN_CANCEL_SETTLED_AFTER_ACCEPTED_CANCEL=/);
  assert.match(director,/if \[ "\$settled" = true \]; then[\s\S]*?cancelled=\$\(\(cancelled\+1\)\)[\s\S]*?else[\s\S]*?failed=\$\(\(failed\+1\)\)/);
  assert.match(director,/if \[ "\$safe_force_cancel" = true \] && \[\[ "\$current_state" == 'queued' \|\| "\$current_state" == 'pending' \|\| "\$current_state" == 'requested' \|\| "\$current_state" == 'waiting' \]\]; then/);
  assert.match(director,/elif \[ "\$safe_force_cancel" = true \]; then[\s\S]*?force_state=.*actions\/runs\/\$\{run_id\}/);
  assert.match(director,/elif \[\[ "\$force_state" == 'queued' \|\| "\$force_state" == 'pending' \|\| "\$force_state" == 'requested' \|\| "\$force_state" == 'waiting' \]\] && gh api --method POST .*force-cancel/);
});

test('director coalesces pending pre-supervision wakes while preserving active completion',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const policy=roadmap.changeRecord?.directorPreSupervisionCoalescing20260927||{};
  const topology=architecture.directorPreSupervisionCoalescing||{};
  const evidence=logMap.directorPreSupervisionCoalescingEvidence||{};
  assert.match(director,/runner-drain:[\s\S]*?group: director-runner-drain-v3[\s\S]*?cancel-in-progress: false/);
  assert.match(director,/game-primary-gate:[\s\S]*?group: director-game-primary-gate-v1[\s\S]*?cancel-in-progress: false/);
  assert.match(director,/supervise:[\s\S]*?group: director-central-company-supervise-v3[\s\S]*?cancel-in-progress: false/);
  assert.equal(policy.runnerDrainCancelInProgress,false);
  assert.equal(policy.runnerDrainActiveCompletionPreserved,true);
  assert.equal(policy.runnerDrainPendingLatestWins,true);
  assert.equal(policy.runnerDrainConcurrencyGroup,'director-runner-drain-v3');
  assert.equal(policy.previousRunnerDrainConcurrencyGroup,'director-runner-drain-v2');
  assert.equal(policy.runnerDrainEpochAdvancedToBypassLegacyPendingGroup,true);
  assert.equal(policy.gamePrimaryGateCancelInProgress,false);
  assert.equal(topology.runnerDrain?.group,'director-runner-drain-v3');
  assert.equal(topology.runnerDrain?.previousGroup,'director-runner-drain-v2');
  assert.equal(topology.runnerDrain?.epochAdvancedToBypassLegacyPendingGroup,true);
  assert.equal(evidence.runnerDrainConcurrencyGroup,'director-runner-drain-v3');
  assert.equal(evidence.runnerDrainPreviousConcurrencyGroup,'director-runner-drain-v2');
  assert.equal(evidence.epochAdvancedToBypassLegacyPendingGroup,true);
  assert.equal(topology.runnerDrain?.cancelInProgress,false);
  assert.equal(topology.gamePrimaryGate?.cancelInProgress,false);
  assert.equal(evidence.runnerDrainCancelInProgress,false);
  assert.equal(evidence.gamePrimaryGateCancelInProgress,false);
});


test('central development planner removes duplicate runtime contract QA from the game dispatch path',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const nativeStart=development.indexOf('\n  native-plan:\n');
  const dispatchStart=development.indexOf('\n  dispatch-roblox:\n');
  assert.ok(nativeStart>0&&dispatchStart>nativeStart);
  const nativePlan=development.slice(nativeStart,dispatchStart);
  assert.match(nativePlan,/runs-on: ubuntu-slim/);
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


test('Roblox runtime planners reuse current central QA and keep responsibility-local tests only',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const continuation=read('.github/workflows/company-development-roblox-runtime-continuation.yml');
  const centralQa=read('.github/workflows/company-central-policy-contract-qa.yml');

  for(const testFile of [
    'qa/company-shared-context.test.mjs',
    'qa/company-development-roblox-runtime.test.mjs',
    'qa/company-selected-platform-router.test.mjs',
    'qa/company-development-roblox-runtime-continuation.test.mjs',
  ])assert.ok(centralQa.includes(testFile),testFile+' central QA authority');

  assert.doesNotMatch(roblox,/node --test qa\/company-shared-context\.test\.mjs/);
  assert.doesNotMatch(roblox,/node --test[^\n]*company-development-roblox-runtime\.test\.mjs/);
  assert.doesNotMatch(roblox,/node --test[^\n]*company-selected-platform-router\.test\.mjs/);
  assert.doesNotMatch(continuation,/node --test qa\/company-development-roblox-runtime-continuation\.test\.mjs/);

  for(const local of [
    'qa/company-development-roblox-source-reconcile.test.mjs',
    'qa/company-development-roblox-package.test.mjs',
    'qa/company-development-roblox-independent-promotion.test.mjs',
    'qa/company-upper-platform-admission.test.mjs',
  ])assert.ok(roblox.includes(local),local+' responsibility-local test retained');

  assert.equal(roadmap.minimumNecessaryProcedurePolicy?.qaAndReview?.reviewMayNotBecomeRoutineSerializationPoint,true);
  assert.equal(roadmap.minimumNecessaryProcedurePolicy?.principles?.unrelatedProcedureMayNotDelayDevelopment,true);
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


test('Unity Web reuses the existing per-game Unity Library cache pattern without weakening build QA',()=>{
  const web=read('.github/workflows/unity-web-first-stage-build.yml');
  const android=read('.github/workflows/unity-cloud-android-test.yml');
  assert.match(android,/Cache Unity Library/);
  assert.match(web,/Cache Unity Web Library/);
  assert.match(web,/id: library_cache/);
  assert.match(web,/path: \$\{\{ steps\.request\.outputs\.project_path \}\}\/Library/);
  assert.match(web,/key: unity-web-library-\$\{\{ runner\.os \}\}-\$\{\{ steps\.request\.outputs\.game_id \}\}-/);
  assert.match(web,/Packages\/manifest\.json/);
  assert.match(web,/ProjectSettings\/ProjectVersion\.txt/);
  assert.match(web,/UNITY_WEB_LIBRARY_CACHE_HIT=/);
  assert.match(web,/Build Unity Web/);
  assert.match(web,/Run Unity Web actual browser play/);
  assert.match(web,/Run Unity Web independent QA/);
  assert.match(web,/Run Unity Web regression/);
});


test('central planner dedupes active Unity Web floor and bootstrap runs without limiting other games',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.match(development,/unity-web-first-stage-build\.yml\/runs\?per_page=100&page=\$page/);
  assert.match(development,/unity-web-floor-source-bootstrap\.yml\/runs\?per_page=100&page=\$page/);
  assert.match(development,/activeUnityWebFloor=activeIds\('\/tmp\/active-unity-web-floor-runs\.json','Unity Web Floor '\)/);
  assert.match(development,/activeUnityWebBootstrap=activeIds\('\/tmp\/active-unity-web-bootstrap-runs\.json','Unity Web Floor Bootstrap '\)/);
  assert.match(development,/UNITY_WEB_FLOOR_DISPATCH_DEDUPED_ACTIVE=/);
  assert.match(development,/UNITY_WEB_BOOTSTRAP_DISPATCH_DEDUPED_ACTIVE=/);
  assert.match(development,/UNITY_WEB_ACTIVE_RUN_SCAN_FLOOR_ROWS=/);
  assert.match(development,/UNITY_WEB_ACTIVE_RUN_SCAN_BOOTSTRAP_ROWS=/);
  assert.match(development,/UNITY_WEB_ACTIVE_RUN_SCAN_PAGES=3/);
  assert.doesNotMatch(development,/dispatch-unity-web-floor:[\s\S]{0,260}?max-parallel:/);
  assert.doesNotMatch(development,/dispatch-unity-web-bootstrap:[\s\S]{0,260}?max-parallel:/);
});


test('shared Ollama cache serves model consumers while Unity settlement needs no model download',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const action=read('.github/actions/prepare-ollama/action.yml');
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const continuation=read('.github/workflows/company-development-roblox-runtime-continuation.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const vibe=read('.github/workflows/vibe2-continuous-core.yml');
  const centralQa=read('.github/workflows/company-central-policy-contract-qa.yml');
  const change=roadmap.changeRecord?.sharedOllamaModelCache20260927;

  assert.match(action,/cache-model:\n\s+description:[\s\S]{0,240}?default: 'false'/);
  assert.match(action,/Resolve requested Ollama model cache key/);
  assert.match(action,/safe_model=.*sed -E/);
  assert.match(action,/uses: actions\/cache\/restore@v4/);
  assert.match(action,/uses: actions\/cache\/save@v4/);
  assert.match(action,/key: \$\{\{ steps\.model-cache-key\.outputs\.key \}\}/);
  assert.match(action,/Save requested Ollama model cache immediately/);
  assert.match(action,/continue-on-error: true/);
  assert.ok(action.indexOf('Ensure requested local model')<action.indexOf('Save requested Ollama model cache immediately'));

  for(const workflow of [roblox,continuation]){
    assert.match(workflow,/cache-model: 'true'/);
  }
  assert.doesNotMatch(unity,/prepare-ollama|ollama pull/);
  assert.match(vibe,/key: vibe2-ollama-v5-/);
  assert.match(vibe,/runner\.os/);
  assert.match(vibe,/runner\.arch/);
  assert.match(vibe,/path: ~\/\.ollama\/models/);
  assert.match(vibe,/jaewoon-ollama-cpu-runtime-v2-/);
  assert.doesNotMatch(vibe,/\.cache\/vibe2-ollama\/bin/);
  assert.doesNotMatch(vibe,/\.cache\/vibe2-ollama\/lib/);
  assert.doesNotMatch(vibe,/cache-model: 'true'/);

  assert.ok(centralQa.includes(".github/actions/prepare-ollama/action.yml"));
  assert.ok(centralQa.includes(".github/workflows/company-development-roblox-runtime-continuation.yml"));
  assert.equal(change?.cacheOptInDefault,false);
  assert.equal(change?.saveTiming,'IMMEDIATELY_AFTER_REQUESTED_MODEL_IS_CONFIRMED_LOCAL');
  assert.equal(change?.saveFailureBlocksDevelopment,false);
  assert.equal(change?.existingVibe2DedicatedModelCacheUnchanged,true);
  assert.equal(change?.qualitySecurityReleaseGatesUnchanged,true);
  assert.equal(architecture.sharedOllamaModelCache?.optInDefault,false);
  assert.equal(architecture.sharedOllamaModelCache?.saveImmediatelyAfterRequestedModelReady,true);
  assert.equal(logMap.sharedOllamaModelCacheEvidence?.cacheHitSkipsModelPull,true);
  assert.equal(logMap.sharedOllamaModelCacheEvidence?.cacheSaveFailureMayBlockDevelopment,false);
});


test('Unity Web actual play supplies boot proof without a duplicate browser smoke launch',()=>{
  const web=read('.github/workflows/unity-web-first-stage-build.yml');
  assert.match(web,/Prepare Unity Web browser runtime/);
  assert.match(web,/UNITY_WEB_BROWSER_RUNTIME=READY/);
  assert.doesNotMatch(web,/name: Browser boot smoke/);
  assert.doesNotMatch(web,/boot-mobile\.png/);
  assert.match(web,/UNITY_WEB_ACTUAL_PLAY_BOOT_EVIDENCE_REQUIRED/);
  assert.match(web,/UNITY_WEB_BOOT_SMOKE=PASS:ACTUAL_PLAY_EVIDENCE/);
  assert.match(web,/play\.boot\?\.pass!==true/);
  assert.match(web,/bootSmoke:'PASS'/);
  assert.match(web,/Run Unity Web actual browser play/);
});


test('Unity Web bottleneck optimizations are bound consistently across central policy architecture and logs',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));

  const cache=roadmap.changeRecord?.unityWebLibraryCacheReuse20260927;
  assert.equal(cache?.buildStillRequired,true);
  assert.equal(cache?.browserPlayStillRequired,true);
  assert.equal(cache?.independentQaStillRequired,true);
  assert.equal(cache?.regressionStillRequired,true);
  assert.equal(architecture.unityWebLibraryCacheReuse?.buildArtifactReuse,false);
  assert.equal(architecture.unityWebLibraryCacheReuse?.qaEvidenceReuse,false);
  assert.equal(logMap.unityWebLibraryCacheReuseEvidence?.cacheHitDoesNotImplyBuildPass,true);
  assert.equal(logMap.unityWebLibraryCacheReuseEvidence?.cacheHitDoesNotImplyQaPass,true);

  const dedupe=roadmap.changeRecord?.unityWebActiveRunDedupe20260927;
  assert.equal(dedupe?.duplicateFloorDispatchSuppressed,true);
  assert.equal(dedupe?.duplicateBootstrapDispatchSuppressed,true);
  assert.equal(dedupe?.distinctGamesRemainParallel,true);
  assert.equal(architecture.unityWebActiveRunDedupe?.crossGameParallelism,true);
  assert.equal(logMap.unityWebActiveRunDedupeEvidence?.sameGameDuplicateDispatchForbidden,true);

  const boot=roadmap.changeRecord?.unityWebBootProofReuse20260927;
  assert.equal(boot?.separateBootBrowserLaunchRemoved,true);
  assert.equal(boot?.actualPlayValidatorOwnsBootAssertion,true);
  assert.equal(boot?.independentQaStillRequired,true);
  assert.equal(boot?.regressionStillRequired,true);
  assert.equal(architecture.unityWebBootProofReuse?.bootProofOwner,'ACTUAL_BROWSER_PLAY');
  assert.equal(logMap.unityWebBootProofReuseEvidence?.separateBootBrowserLaunchExpected,false);
  assert.equal(logMap.unityWebBootProofReuseEvidence?.bootPassMustComeFromActualPlayEvidence,true);
});


test('stage-scoped native dedupe closes duplicate races without whole-game serialization',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const unity=read('.github/workflows/company-development-unity-runtime.yml');
  const central=read('.github/workflows/company-development-confirmed-runtime.yml');
  const change=roadmap.changeRecord?.nativeExactGameWorkflowConcurrency20260927;

  assert.doesNotMatch(roblox.slice(0,roblox.indexOf('\njobs:\n')),/\nconcurrency:\n/);
  assert.doesNotMatch(unity.slice(0,unity.indexOf('\njobs:\n')),/\nconcurrency:\n/);
  assert.match(central,/ROBLOX_NATIVE_DISPATCH_DEDUPED_CURRENT_MAIN=/);
  assert.match(central,/UNITY_NATIVE_DISPATCH_DEDUPED_ACTIVE=/);

  assert.equal(change?.status,'SUPERSEDED_BY_STAGE_SCOPED_DEDUPE_2026_10_04');
  assert.equal(change?.workflowLevelGameIdConcurrencyRemoved,true);
  assert.equal(change?.exactGameOverlapForbidden,false);
  assert.equal(change?.stageScopedExactDuplicateCoalescing,true);
  assert.equal(change?.centralActiveRunDedupePreserved,true);
  assert.equal(change?.centralActiveRunDedupeRaceClosedByWorkflowConcurrency,false);
  assert.equal(change?.distinctGamesParallel,true);
  assert.equal(change?.sameGameIndependentStagesParallelWhenSafe,true);
  assert.equal(change?.batchRunsGloballySerialized,false);
  assert.equal(change?.globalNativeSerializationForbidden,true);

  assert.equal(architecture.nativeExactGameWorkflowConcurrency?.ROBLOX?.wholeGameSerialization,false);
  assert.equal(architecture.nativeExactGameWorkflowConcurrency?.UNITY?.wholeGameSerialization,false);
  assert.equal(architecture.nativeExactGameWorkflowConcurrency?.sameGameIndependentStagesParallel,true);
  assert.equal(architecture.nativeExactGameWorkflowConcurrency?.exactDuplicateStageCoalescing,true);
  assert.equal(logMap.nativeExactGameWorkflowConcurrencyEvidence?.wholeGameConcurrencyGroupForbidden,true);
  assert.equal(logMap.nativeExactGameWorkflowConcurrencyEvidence?.exactGameOverlapForbidden,false);
  assert.equal(logMap.nativeExactGameWorkflowConcurrencyEvidence?.exactDuplicateStageCoalescingRequired,true);
  assert.equal(logMap.nativeExactGameWorkflowConcurrencyEvidence?.distinctGameParallelismRequired,true);
});

test('Roblox source-plan uses current control runners without historical repair mirrors',()=>{
  const workflow=read('.github/workflows/company-development-roblox-runtime.yml');
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));

  assert.match(workflow,/\n  source-plan:\n[\s\S]*?runs-on: ubuntu-24\.04/);
  assert.equal(architecture.gameControlRunnerPools?.roblox?.sourcePlanRunner,'ubuntu-24.04');
  assert.equal(architecture.gameControlRunnerPools?.roblox?.sourcePlanExactGameRunner,'ubuntu-24.04');
  assert.equal(architecture.gameControlRunnerPools?.roblox?.sourcePlanBatchRunner,'ubuntu-24.04');
  assert.equal(logMap.gameControlRunnerPoolEvidence?.expectedRunnerLabels?.robloxIngress,'ubuntu-24.04');
  assert.equal(logMap.gameControlRunnerPoolEvidence?.expectedRunnerLabels?.robloxExactIngress,'ubuntu-24.04');
  assert.equal(logMap.gameControlRunnerPoolEvidence?.expectedRunnerLabels?.robloxBatchIngress,'ubuntu-24.04');
  assert.equal(Object.hasOwn(architecture,'robloxSourcePlanWakeAndRunnerIsolation'),false);
  assert.equal(Object.hasOwn(logMap,'robloxSourcePlanWakeAndRunnerIsolationEvidence'),false);
});

test('verified external black-box learning is applied first at full retrieved coverage across development and internal assets',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
  const logMap=JSON.parse(read('company-learning/company-log-map.json'));
  const robloxLearning=read('tools/vibe3-roblox-learning-context.mjs');
  const robloxBootstrap=read('tools/company-development-roblox-bootstrap.mjs');
  const robloxReconcile=read('tools/company-development-roblox-source-reconcile.mjs');
  const robloxNativeWorkflow=read('.github/workflows/company-development-roblox-runtime.yml');
  const unityBootstrap=read('tools/company-unity-web-floor-bootstrap.mjs');
  const unityWorkflow=read('.github/workflows/unity-web-floor-source-bootstrap.yml');
  const unityNativeBootstrap=read('tools/company-development-unity-bootstrap.mjs');
  const unityNativeWorkflow=read('.github/workflows/company-development-unity-runtime.yml');
  const assetPlan=read('tools/vibe2-asset-production-plan.mjs');

  const policy=roadmap.developmentLifecycleMachine?.machineOnlyProjectContinuation?.verifiedLearningMaxUse?.externalVerifiedBlackBoxFirstApplication||{};
  assert.equal(policy.required,true);
  assert.equal(policy.mandatoryApplicationCoveragePct,null);
  assert.equal(policy.allRetrievedTaskRelevantVerifiedExternalItemsMustBeApplied,false);
  assert.equal(policy.coveragePercentageIsCompletionEvidence,false);
  assert.equal(policy.allRetrievedPrinciplesMustHaveExplicitDisposition,true);
  assert.equal(policy.retrievedVerifiedExternalLearningTruncationForbidden,true);
  assert.equal(policy.applicationBeforeInternalAuthoringRequired,true);
  assert.equal(policy.applicationBeforeGameSourceGenerationRequired,true);
  assert.equal(policy.internalAssetProductionMustConsumeVerifiedCommercialDistillationFirst,true);
  assert.equal(policy.unityWebBootstrapWithoutVerifiedExternalLearningForbidden,true);
  assert.equal(policy.unityNativeSourceGenerationWithoutVerifiedExternalLearningForbidden,true);
  assert.equal(policy.robloxExistingSourceMaintenanceWithoutVerifiedExternalLearningForbidden,true);
  assert.equal(policy.nativeSourceReuseMustInvalidateWhenVerifiedExternalLearningChanges,true);
  assert.equal(policy.actualNativeDevelopmentMustExposeExactAppliedLearningIdsAndFingerprint,true);
  assert.equal(policy.rawCommercialCodeCopyForbidden,true);
  assert.equal(policy.rawCommercialAssetCopyForbidden,true);
  assert.equal(policy.transformativeReauthoringOrRecompositionRequired,true);
  assert.equal(policy.freshVerificationRequired,true);

  const topology=architecture.verifiedExternalLearningFirstApplicationTopology||{};
  assert.equal(topology.mandatoryApplicationCoveragePct,null);
  assert.equal(topology.semanticApplicationContract?.coveragePercentageIsCompletionEvidence,false);
  assert.equal(topology.semanticApplicationContract?.gameSpecificSemanticMappingRequired,true);
  assert.equal(topology.retrievedSetTruncationAllowed,false);
  assert.equal(topology.silentIgnoreAllowed,false);
  assert.equal(topology.consumers?.robloxSourceBootstrap,'tools/company-development-roblox-bootstrap.mjs');
  assert.equal(topology.consumers?.robloxExistingSourceReconcile,'tools/company-development-roblox-source-reconcile.mjs');
  assert.equal(topology.consumers?.robloxNativeRuntimeWorkflow,'.github/workflows/company-development-roblox-runtime.yml');
  assert.equal(topology.consumers?.unityNativeSourceBootstrap,'tools/company-development-unity-bootstrap.mjs');
  assert.equal(topology.consumers?.unityNativeRuntimeWorkflow,'.github/workflows/company-development-unity-runtime.yml');
  assert.equal(topology.consumers?.unityWebSourceBootstrap,'tools/company-unity-web-floor-bootstrap.mjs');
  assert.equal(topology.nativeSourceReuseInvalidatesOnVerifiedLearningChange,true);
  assert.equal(topology.existingSourceMaintenanceRebindRequiredWhenLearningChanges,true);
  assert.equal(topology.exactAppliedIdsAndFingerprintEvidenceRequired,true);
  assert.equal(topology.consumers?.assetProduction,'tools/vibe2-asset-production-plan.mjs');

  const evidence=logMap.verifiedExternalLearningFirstApplicationEvidenceContract||{};
  assert.equal(evidence.requiredValues?.applicationCoveragePct,null);
  assert.equal(evidence.requiredValues?.allRetrievedTaskRelevantVerifiedExternalItemsApplied,false);
  assert.equal(evidence.requiredValues?.allRetrievedPrinciplesHaveExplicitDisposition,true);
  assert.equal(evidence.requiredValues?.nativeSourceReuseInvalidatesWhenVerifiedLearningChanges,true);
  assert.equal(evidence.requiredValues?.existingSourceMaintenanceRebindsWhenLearningChanges,true);
  assert.equal(evidence.requiredValues?.exactAppliedIdsAndFingerprintEvidence,true);
  for(const marker of [
    'ROBLOX_VERIFIED_EXTERNAL_LEARNING_FINGERPRINT=',
    'ROBLOX_RECONCILE_VERIFIED_EXTERNAL_LEARNING=READY:',
    'UNITY_VERIFIED_EXTERNAL_LEARNING_COVERAGE=',
    'UNITY_VERIFIED_EXTERNAL_LEARNING_COUNT=',
    'UNITY_VERIFIED_EXTERNAL_LEARNING_IDS=',
    'UNITY_VERIFIED_EXTERNAL_LEARNING_FINGERPRINT='
  ])assert.ok(evidence.requiredMarkers.includes(marker),marker);
  assert.equal(evidence.nativeRuntimeOrReleasePassNotImplied,true);

  assert.doesNotMatch(robloxLearning,/sort\(\(a,b\)=>b\.score-a\.score\|\|a\.tie\.localeCompare\(b\.tie\)\)\.slice\(0,3\)/);
  assert.match(robloxLearning,/export function verifiedExternalBlackBoxPlaybookContract/);
  assert.match(robloxLearning,/verifiedExternalBlackBoxAllTaskTypesRequired/);
  assert.match(robloxLearning,/verifiedExternalBlackBoxTruncationForbidden/);
  assert.match(robloxLearning,/const verifiedExternalLearningCoveragePct=verifiedExternalContract\.coveragePct/);
  assert.match(robloxLearning,/verifiedExternalLearningFingerprint:verifiedExternalContract\.fingerprint/);
  assert.match(robloxLearning,/const applied=verifiedExternalLearningIds\.length>0[\s\S]*&&verifiedExternalContentIds\.length===verifiedExternalLearningIds\.length[\s\S]*&&semantic\.mappings\.length>0[\s\S]*&&semantic\.failClosed\.length===0/);
  assert.match(robloxBootstrap,/VerifiedExternalLearningFirst = \$\{learning\.verifiedExternalLearningFirst\?'true':'false'\}/);
  assert.match(robloxBootstrap,/MemoryFingerprint = \$\{luauString\(learning\.verifiedExternalLearningFingerprint\|\|' '\.trim\(\)\)\}|MemoryFingerprint = \$\{luauString\(learning\.verifiedExternalLearningFingerprint\|\|''\)\}/);
  assert.match(robloxBootstrap,/CoveragePct = \$\{Number\(learning\.verifiedExternalLearningCoveragePct\|\|0\)\}/);
  assert.match(robloxBootstrap,/requireRobloxVerifiedExternalLearning/);
  assert.match(robloxBootstrap,/GameSpecificSemanticMappings/);
  assert.match(robloxBootstrap,/LearningDispositions/);
  assert.match(robloxReconcile,/existing-source-verified-external-learning-required/);
  assert.match(robloxNativeWorkflow,/ROBLOX_RECONCILE_VERIFIED_EXTERNAL_LEARNING=READY/);
  assert.match(unityNativeBootstrap,/verifiedExternalLearningFromPlaybooks/);
  assert.match(unityNativeBootstrap,/ApplyVerifiedExternalLearningFeedback/);
  assert.match(unityNativeWorkflow,/UNITY_VERIFIED_EXTERNAL_LEARNING_MEMORY=READY/);
  assert.match(unityNativeWorkflow,/UNITY_CURRENT_MAIN_SOURCE_REUSE_INVALIDATED=VERIFIED_EXTERNAL_LEARNING_OR_GENERATOR_STALE/);
  assert.match(unityBootstrap,/UNITY_WEB_VERIFIED_EXTERNAL_LEARNING_REQUIRED/);
  assert.match(unityBootstrap,/mandatoryApplicationCoveragePct:100/);
  assert.match(unityWorkflow,/git fetch --no-tags --depth=1 origin vibe2-learning-runtime/);
  assert.match(unityWorkflow,/--playbooks=\/tmp\/vibe3-task-playbooks\.json/);
  assert.match(assetPlan,/mandatoryApplicationCoveragePct:100/);
  assert.match(assetPlan,/TRANSFORMATIVE_INTERNAL_ASSET_EVOLUTION/);
});
