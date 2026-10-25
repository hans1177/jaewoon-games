// 파일명: qa/company-central-pipeline-only.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

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
  assert.equal(exists('AGENTS.md'),true); // Central machine authority remains solely in roadmap; AGENTS.md is an agent instruction, not a second machine policy.
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
test('owner policy counts only Roblox development while retaining paused Unity adapters',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const direct=roadmap.directNativeDualPlatformDevelopment;
  const targets=direct.platformCountingPolicy;
  assert.equal(targets.authority,'OWNER_DIRECTIVE_2026-10-11_ROBLOX_ONLY');
  assert.equal(targets.targetCount,1);
  assert.deepEqual(targets.targets,['ROBLOX']);
  assert.deepEqual(targets.ownerHeldTargets,['UNITY_WEB','UNITY_ANDROID']);
  assert.equal(targets.unityAndroidDevelopmentPaused,true);
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
  // Historical change records remain immutable; the current owner directive supersedes their active target count.
  assert.equal(roadmap.changeRecord.ownerThreePlatformTargets20261009.targetCount,3);
  assert.deepEqual(roadmap.changeRecord.ownerRobloxUnityWebOnly20261009.activeTargets,['ROBLOX','UNITY_WEB']);
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

test('central production runtime keeps independent Roblox and Unity Web QA without a Roblox admission dependency',()=>{
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
  assert.equal(direct.unityWebEnabled,false);
  assert.equal(direct.unityWebRequired,false);
  assert.equal(direct.unityWebGateRequired,false);
  assert.equal(roadmap.changeRecord.ownerRobloxUnityWebOnly20261009.robloxRequiresUnityWebReadiness,false);
  assert.equal(roadmap.changeRecord.ownerRobloxUnityWebOnly20261009.unityWebRequiresActualBrowserIndependentQaAndRegression,true);
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
  assert.doesNotMatch(development,/unity_web_json:/);
  assert.match(development,/gh workflow run company-development-roblox-runtime\.yml/);
  assert.match(development,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.doesNotMatch(development,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(development,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.doesNotMatch(development,/gh workflow run (?:company-development-unity-runtime|unity-web-first-stage-build|unity-web-floor-source-bootstrap)\.yml/);
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


test('direct horror edits re-enter the canonical development flow',()=>{
  const reconcile=read('.github/workflows/company-development-queue-reconcile.yml');
  const central=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.match(reconcile,/roblox-games\/horror-escape-room\/\*\*/);
  assert.match(reconcile,/assets\/roblox\/midnight-manor\/\*\*/);
  assert.match(reconcile,/git add -- development-queue\.json game-catalog\.json game-seed-state\.json/);
  // Explicit, centrally authorized per-game exclusions are allowed; no hardcoded horror exclusion is.
  assert.match(central,/developmentSpeedExecution\?\.perGameFailureIsolation\?\.ownerExcludedGameIds/);
  assert.doesNotMatch(central,/\['horror-escape-room'\]/);
});

test('development coordinator dedupes unfinished Roblox games across revisions without locking game execution',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.match(development,/actions\/workflows\/company-development-roblox-runtime\.yml\/runs\?status=\$active_status&per_page=100&page=\$page/);
  assert.doesNotMatch(development,/company-development-roblox-runtime\.yml\/runs\?event=workflow_dispatch/);
  assert.match(development,/const activeStates=new Set\(\['queued','pending','in_progress','requested'\]\)/);
  assert.match(development,/const activeRoblox=activeIds\('\/tmp\/active-roblox-native-runs\.json','Roblox runtime · '\)/);
  assert.match(development,/ROBLOX_NATIVE_DISPATCH_DEDUPED_CURRENT_MAIN=/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN=FAIL/);
  assert.doesNotMatch(development,/^  coordinator-gate:\s*$/m);
});

test('native child workflow changes stay child-owned while source wakes preserve platform holds',()=>{
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
  assert.match(development,/group: company-development-confirmed-\$\{\{ github\.run_id \}\}/);
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
  ]) assert.ok(!developmentPush.includes(childPath),childPath);
  assert.ok(robloxPush.includes('.github/workflows/company-development-roblox-runtime.yml'));
  assert.ok(robloxPush.includes('tools/company-development-roblox-build-preflight.mjs'));
  assert.ok(unityPush.includes('unity-games/**'));
  for(const source of ['unity-games/**','roblox-games/**'])assert.ok(developmentPush.includes(source));
  assert.match(unity,/if\(androidDevelopmentHeld\)return false/);
  assert.match(unity,/developmentAccess\?\.UNITY==='OWNER_HOLD'/);
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
  assert.doesNotMatch(development,/UNITY_WEB_FLOOR_DISPATCH_DEDUPED_ACTIVE=/);
  assert.doesNotMatch(development,/UNITY_WEB_BOOTSTRAP_DISPATCH_DEDUPED_ACTIVE=/);
  assert.match(development,/UNITY_ANDROID_DEVELOPMENT_HOLD=OWNER_DIRECTIVE_2026_10_09/);
  assert.match(development,/roblox_count=/);
  assert.match(development,/unity_count=/);
  assert.match(development,/ROBLOX_GAME_IDS: \$\{\{ needs\.native-plan\.outputs\.roblox_json \}\}/);
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

// 메인: 이전 main 배치가 살아 있어도 최신 main 게임 개발을 취소하지 않는다.
test('director never cancels a newer-main Unity Web batch because an older-main coordinator is running',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const start=director.indexOf('          const activeCentralBatch=runs');
  const end=director.indexOf('          const centralBatchByHead=new Map();',start);
  assert.ok(start>=0&&end>start);
  const pipeline='.github/workflows/company-development-confirmed-runtime.yml';
  const make=(id,head_sha,status,event)=>({
    id,head_sha,status,event,path:pipeline,
    display_title:'DEVELOPMENT cycle | batch | '+event
  });
  const runs=[
    make(100,'previous-main','in_progress','push'),
    make(101,'previous-main','queued','workflow_dispatch'),
    make(102,'latest-main','queued','workflow_dispatch')
  ];
  const cancelled=[];
  runInNewContext(director.slice(start,end),{
    runs,queued:new Set(['queued','pending','requested']),
    add:(run,reason)=>cancelled.push({id:run.id,reason})
  });
  assert.deepEqual(cancelled,[{id:101,reason:'CENTRAL_MANUAL_BATCH_SUPERSEDED_BY_ACTIVE_BATCH'}]);
});

// 메인: 오래된 무결과 리필 호출만 실제 제목으로 탐지하고 진행 중·최신·게임 작업을 보존한다.
test('director drains only stale unstarted Vibe fan-in refills with actual GitHub Actions titles',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const start=director.indexOf("            for(const stale of runs.filter(r=>\n              r.path==='.github/workflows/vibe2-continuous-core.yml'\n              &&String(r.event||'')==='repository_dispatch'");
  const ending="            ))add(stale,'VIBE2_STALE_UNSTARTED_FANIN_REFILL');";
  const end=director.indexOf(ending,start);
  assert.ok(start>=0&&end>start);
  const code=director.slice(start,end+ending.length);
  const main='b'.repeat(40),old='a'.repeat(40);
  const title=lane=>'Vibe2 Continuous Core · vibe2-fanin-refill · '+lane;
  const row=(id,sha,status,runName=title('game-primary'),event='repository_dispatch',branch='main')=>({
    id,head_sha:sha,status,display_title:runName,event,head_branch:branch,
    path:'.github/workflows/vibe2-continuous-core.yml'
  });
  const runs=[
    row(10,old,'queued'),
    row(11,old,'pending',title('recovery-fast')),
    row(12,main,'queued'),
    row(13,old,'in_progress'),
    row(14,old,'queued','Vibe2 Continuous Core · vibe2-neuron-complete · game-primary'),
    row(15,old,'queued',title('game-primary'),'workflow_dispatch'),
    row(16,old,'queued',title('game-primary'),'repository_dispatch','other-branch'),
    row(17,'','queued'),
    row(18,old,'queued','Vibe2 Continuous Core · workflow_dispatch · game-primary')
  ];
  const cancelled=[];
  runInNewContext(code,{runs,currentMain:main,
    queued:new Set(['queued','pending','requested']),
    add:(entry,reason)=>cancelled.push({id:entry.id,reason})
  });
  assert.deepEqual(cancelled,[
    {id:10,reason:'VIBE2_STALE_UNSTARTED_FANIN_REFILL'},
    {id:11,reason:'VIBE2_STALE_UNSTARTED_FANIN_REFILL'}
  ]);
});

test('director drain QA changes wake the existing runner drain',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const pushBlock=director.slice(director.indexOf('  push:'),director.indexOf('\npermissions:',director.indexOf('  push:')));
  assert.match(pushBlock,/qa\/company-central-pipeline-only\.test\.mjs/);
});

test('legacy refill drain selects only stale main refill wakes and requires proven empty jobs before force cancel',t=>{
  const director=read('.github/workflows/director-supervisor.yml');
  const ending="            ))add(stale,'VIBE2_LEGACY_UNSTARTED_FANIN_REFILL');";
  const end=director.indexOf(ending),start=director.lastIndexOf('            for(const stale of runs.filter(r=>',end);
  assert.ok(start>=0&&end>start);
  const base={id:1,path:'.github/workflows/vibe2-continuous-core.yml',event:'repository_dispatch',display_title:'vibe2-fanin-refill',status:'queued',head_branch:'main',head_sha:'old'};
  const changes=[{}, {head_sha:'current'}, {status:'in_progress'}, {head_branch:'other'}, {display_title:'vibe2-neuron-complete'}, {event:'workflow_dispatch'}, {head_sha:''}];
  const selected=[];
  runInNewContext(director.slice(start,end+ending.length),{runs:changes.map((row,i)=>({...base,...row,id:i+1})),currentMain:'current',queued:new Set(['queued','pending','requested']),add:run=>selected.push(run.id)});
  assert.deepEqual(selected,[1]);

  const root=fs.mkdtempSync(path.join(os.tmpdir(),'legacy-refill-drain-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const loopStart=director.indexOf("          while IFS='|' read -r run_id reason; do");
  const loopEnd=director.indexOf('          done < /tmp/director-run-cancel.list',loopStart);
  assert.ok(loopStart>=0&&loopEnd>loopStart);
  const loop=director.slice(loopStart,loopEnd)+"          done <<< '123|VIBE2_LEGACY_UNSTARTED_FANIN_REFILL'\n";
  const fakeGh=`gh() {
    if [[ "$*" == *'--method POST'* ]]; then
      printf '%s\\n' "$*" >> "$DRAIN_CALLS"
      [[ "$*" == *'/force-cancel'* ]]
    elif [[ "\${!#}" == '.total_count' ]]; then
      case "$DRAIN_JOBS" in
        error) return 1 ;;
        changed) if [ -f "$DRAIN_COUNTED" ]; then echo 1; else touch "$DRAIN_COUNTED"; echo 0; fi ;;
        *) echo "$DRAIN_JOBS" ;;
      esac
    elif [[ "\${!#}" == '.status' ]]; then echo queued
    else echo 0
    fi
  }\n`;
  for(const jobCount of ['0','1','error','changed']){
    const calls=path.join(root,jobCount+'.calls'),counted=path.join(root,jobCount+'.counted');
    execFileSync('bash',['-c','set -euo pipefail\ncancelled=0\nfailed=0\n'+fakeGh+loop],{env:{...process.env,GITHUB_REPOSITORY:'owner/repo',DRAIN_JOBS:jobCount,DRAIN_CALLS:calls,DRAIN_COUNTED:counted},encoding:'utf8'});
    const requests=fs.existsSync(calls)?fs.readFileSync(calls,'utf8').trim().split('\n'):[];
    assert.equal(requests.length,jobCount==='0'?2:jobCount==='changed'?1:0,jobCount);
    if(jobCount==='0')assert.match(requests[1],/\/force-cancel/);
  }
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
  assert.match(development,/company-development-roblox-runtime\.yml\/runs\?status=\$active_status&per_page=100&page=\$page/);
  assert.match(development,/company-development-unity-runtime\.yml\/runs\?per_page=100&page=\$page/);
  assert.match(development,/for page in 1 2 3; do/);
  assert.match(development,/pids\+=\("\$!"\)/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_PAGE_FAIL=/);
  assert.match(development,/jq -s '\{workflow_runs:\(map\(\.workflow_runs \/\/ \[\]\)\|add\)\}'/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN_PAGES=3/);
  assert.match(development,/NATIVE_ACTIVE_RUN_SCAN=PASS/);
  assert.match(development,/NATIVE_ROBLOX_ACTIVE_RUN_SCAN_MODE=ALL_UNFINISHED_ANY_HEAD/);
});


test('Unity Web floor serializes only the same game while independent games remain parallel',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  const workflow=read('.github/workflows/unity-web-first-stage-build.yml');
  assert.doesNotMatch(development,/dispatch-unity-web-floor:[\s\S]*?group: unity-web-floor-call-\$\{\{ matrix\.game_id \}\}[\s\S]*?cancel-in-progress: false/);
  assert.match(workflow,/build:\n\s+needs: owner-policy\n\s+if: needs\.owner-policy\.outputs\.allowed == 'true'\n\s+concurrency:\n\s+group: unity-web-floor-exec-\$\{\{ inputs\.game_id \|\| inputs\.request_file \|\| github\.run_id \}\}[\s\S]*?cancel-in-progress: false[\s\S]*?runs-on: ubuntu-latest/);
  assert.doesNotMatch(workflow,/UNITY_WEB_FLOOR_EXACT_DEDUPED_ACTIVE=/);
  assert.doesNotMatch(development,/strategy:[\s\S]{0,160}?max-parallel:/);
});



test('Roblox runtime planners reuse current central QA and keep responsibility-local tests only',()=>{
  const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  const roblox=read('.github/workflows/company-development-roblox-runtime.yml');
  const continuation=read('.github/workflows/company-development-roblox-runtime-continuation.yml');
  const centralQa=read('.github/workflows/company-central-policy-contract-qa.yml');

  for(const testFile of [
    'qa/company-four-docs-fingerprint.test.mjs',
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


test('central planner skips retired Unity Web workflow scans',()=>{
  const development=read('.github/workflows/company-development-confirmed-runtime.yml');
  assert.doesNotMatch(development,/unity-web-first-stage-build\.yml\/runs\?per_page=100&page=\$page/);
  assert.doesNotMatch(development,/unity-web-floor-source-bootstrap\.yml\/runs\?per_page=100&page=\$page/);
  assert.doesNotMatch(development,/activeUnityWebFloor=activeIds\('\/tmp\/active-unity-web-floor-runs\.json','Unity Web Floor '\)/);
  assert.doesNotMatch(development,/activeUnityWebBootstrap=activeIds\('\/tmp\/active-unity-web-bootstrap-runs\.json','Unity Web Floor Bootstrap '\)/);
  assert.doesNotMatch(development,/UNITY_WEB_FLOOR_DISPATCH_DEDUPED_ACTIVE=/);
  assert.doesNotMatch(development,/UNITY_WEB_BOOTSTRAP_DISPATCH_DEDUPED_ACTIVE=/);
  assert.doesNotMatch(development,/UNITY_WEB_ACTIVE_RUN_SCAN_FLOOR_ROWS=/);
  assert.doesNotMatch(development,/UNITY_WEB_ACTIVE_RUN_SCAN_BOOTSTRAP_ROWS=/);
  assert.doesNotMatch(development,/UNITY_WEB_ACTIVE_RUN_SCAN_PAGES=3/);
  assert.doesNotMatch(development,/dispatch-unity-web-floor:[\s\S]{0,260}?max-parallel:/);
  assert.doesNotMatch(development,/dispatch-unity-web-bootstrap:[\s\S]{0,260}?max-parallel:/);
});


test('canonical production no longer installs local Ollama or caches downloaded models',()=>{
  assert.equal(exists('.github/actions/prepare-ollama/action.yml'),false);
  for(const file of [
    '.github/workflows/vibe2-continuous-core.yml',
    '.github/workflows/company-development-roblox-runtime.yml',
    '.github/workflows/company-development-roblox-runtime-continuation.yml',
    '.github/workflows/company-central-policy-contract-qa.yml'
  ]){
    const workflow=read(file);
    assert.doesNotMatch(workflow,/uses:.*prepare-ollama|ollama pull|ollama serve|ollama\.com\/download/,file);
  }
  assert.match(read('.github/workflows/vibe2-continuous-core.yml'),/VIBE2_WORKER_PROVIDER=GEMINI_API/);
});
test('Unity Web actual play supplies boot proof without a duplicate browser smoke launch',()=>{
  const web=read('.github/workflows/unity-web-first-stage-build.yml');
  assert.match(web,/Prepare Unity Web browser runtime/);
  assert.match(web,/UNITY_WEB_BROWSER_RUNTIME=READY/);
  assert.doesNotMatch(web,/name: Browser boot smoke/);
  assert.doesNotMatch(web,/boot-mobile\.png/);
  assert.match(web,/UNITY_WEB_ACTUAL_PLAY_BOOT_EVIDENCE_REQUIRED/);
  assert.match(web,/checks\.some\(e=>e\.playableBrowserTest!==true\|\|e\.boot\?\.pass!==true\)/);
  assert.match(web,/UNITY_WEB_BOOT_SMOKE=PASS:ACTUAL_PLAY_EVIDENCE/);
  assert.match(web,/const checks=scenarios\.map/);
  assert.match(web,/const \[play,independent,regression\]=checks;/);
  for(const scenario of ['actual-play','independent-qa','regression'])assert.ok(web.includes("['"+scenario+"',"));
  assert.match(web,/bootSmoke:'PASS'/);
  assert.match(web,/Run Unity Web actual browser play/);
});






test('director preserves admitted central development handoff even when parent is queued',()=>{
  const director=read('.github/workflows/director-supervisor.yml');
  assert.match(director,/CENTRAL_DEVELOPMENT_\*/);
  assert.match(director,/Admit one unscoped development coordinator/);
  assert.match(director,/DIRECTOR_CENTRAL_ADMITTED_HANDOFF_PRESERVED=/);
  assert.match(director,/if \[ "\$admitted" != '0' \]; then/);
});


test('current owner development contract replaces retired September mirror assertions',()=>{
  const policy=JSON.parse(read('company-learning/platform-release-roadmap.json'));
  assert.equal(policy.status,'OWNER_DIRECT_LOCKED');
  assert.deepEqual(policy.ownerActiveDevelopmentScope20261009.activeTargets,['ROBLOX','WEB']);
  for(const target of ['UNITY','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'])
    assert.equal(policy.developmentAccess[target],'OWNER_HOLD',target);
  for(const target of ['ROBLOX','WEB'])assert.equal(policy.developmentAccess[target],'ALWAYS_ALLOWED',target);
  const model=read('tools/vibe2-gemini-free-rotation.mjs');
  assert.match(model,/GEMINI_FREE_MODELS/);
  assert.doesNotMatch(model,/127\\.0\\.0\\.1:11434|ollama pull|ollama serve/);
  assert.match(read('.github/workflows/vibe2-continuous-core.yml'),/VIBE2_LOCAL_AI_ENABLED=NO/);
});
