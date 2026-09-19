// 파일명: qa/vibe2-controller-contract.test.mjs
// 역할: Vibe2 24시간 컨트롤러의 엔진 분기, 계층형 병렬, source lock, fan-out/fan-in, incremental QA와 설계지능 안전 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVibeEngineAdapter } from '../assets/vibe-engine-adapter.js';
import { classifyVibeExecutionRoute, runVibeContinuousRunner } from '../tools/vibe2-continuous-runner.mjs';
import { buildVibeDesignIntelligence, DESIGN_INTELLIGENCE_STAGES } from '../tools/vibe2-design-intelligence.mjs';
import { finalizeVibe2FanInReview } from '../tools/vibe2-fan-in-review.mjs';

const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
const safetyNetWorkflow=fs.readFileSync(new URL('../.github/workflows/vibe2-24h-runner.yml',import.meta.url),'utf8');
const coreQaWorkflow=fs.readFileSync(new URL('../.github/workflows/vibe2-core-qa.yml',import.meta.url),'utf8');
const candidateReleaseWorkflow=fs.readFileSync(new URL('../.github/workflows/vibe2-candidate-release.yml',import.meta.url),'utf8');
const recoveryFastWorkflow=fs.readFileSync(new URL('../.github/workflows/vibe2-recovery-fast.yml',import.meta.url),'utf8');
const runtime=JSON.parse(fs.readFileSync(new URL('../vibe2-runtime.json',import.meta.url),'utf8'));
const continuousRunnerSource=fs.readFileSync(new URL('../tools/vibe2-continuous-runner.mjs',import.meta.url),'utf8');

test('Unreal C++ routes to text worker but Blueprint/uasset route to editor',()=>{
  const adapter=createVibeEngineAdapter({target:'unreal',gameSlug:'demo'});
  assert.equal(classifyVibeExecutionRoute({target:'unreal',task:{type:'implementation',goal:'Hero.cpp 수정',responsibleFiles:['unreal-games/demo/Source/Demo/Hero.cpp']},adapter}).route,'text-source-worker');
  assert.equal(classifyVibeExecutionRoute({target:'unreal',task:{type:'implementation',goal:'Animation Blueprint Montage 수정',responsibleFiles:[]},adapter}).route,'engine-editor');
  assert.equal(classifyVibeExecutionRoute({target:'unreal',task:{type:'implementation',goal:'캐릭터 수정',responsibleFiles:['unreal-games/demo/Content/Hero.uasset']},adapter}).reason,'responsible-binary-asset');
});

test('non-write QA routes to analysis only',()=>{
  const adapter=createVibeEngineAdapter({target:'unity',gameSlug:'demo'});
  assert.equal(classifyVibeExecutionRoute({target:'unity',task:{type:'qa',goal:'빌드 오류 조사',responsibleFiles:[]},adapter}).route,'analysis-only');
});

test('fan-in controller contract directly verifies design intelligence stages and evidence gating',()=>{
  assert.deepEqual([...DESIGN_INTELLIGENCE_STAGES],[
    'DESIGNER','CONSTRAINT_ENGINE','CRITIC','CAUSALITY_GRAPH','PLAYER_MODEL','COMBAT_ECONOMY_SIMULATOR',
    'IMPLEMENTATION','AUTO_PLAYER','TELEMETRY','DESIGN_REVIEW','EXPERIENCE_MEMORY'
  ]);
  const design=buildVibeDesignIntelligence({
    task:{goal:'기존 코드 내부 개선',type:'implementation',responsibleFiles:['unity-games/demo/Assets/Player.cs']},
    plan:{target:'unity'},
    experience:{records:[]}
  });
  assert.equal(design.required,true);
  assert.equal(design.implementationGate.allowed,true);
  assert.equal(design.stages.find(stage=>stage.name==='AUTO_PLAYER')?.status,'WAITING_EVIDENCE');
  assert.equal(design.stages.find(stage=>stage.name==='TELEMETRY')?.status,'WAITING_EVIDENCE');
  assert.equal(design.stages.find(stage=>stage.name==='DESIGN_REVIEW')?.status,'WAITING_EVIDENCE');
  assert.equal(design.stages.find(stage=>stage.name==='EXPERIENCE_MEMORY')?.status,'WAITING_VERIFIED_REVIEW');
  assert.equal(design.authorityExpanded,false);
});

test('runtime enables DAG sharding work stealing with policy-unbounded external-capacity waves',()=>{
  assert(runtime.version>=12);
  assert.equal(runtime.continuous.strategy,'hierarchical-dag-sharded-work-stealing');
  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.parallelismPolicy,'UNBOUNDED_BY_POLICY_EXTERNAL_CAPACITY_ONLY');
  assert.equal(runtime.continuous.externalMatrixBatchMax,256);
  assert.equal(runtime.continuous.unityReleaseFocusSlots,1);
  assert.equal(runtime.continuous.workStealing,true);
  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.equal(runtime.continuous.speculativeParallelism.enabled,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.fanOutFanIn,true);
  assert.equal(runtime.qaOptimization.incrementalFirst,true);
  assert.equal(runtime.qaOptimization.contentHashCache,true);
  assert.equal(runtime.qaOptimization.fullCoreRegressionOnceAtFanIn,true);
  assert.equal(runtime.safety.existingWebMaintenanceAllowed,true);
  assert.equal(runtime.safety.newWebGameAutomatic,true);
  assert.equal(runtime.contracts.core.engineTargets.web.automaticNewGame,true);
  assert.equal(runtime.contracts.core.engineTargets.web.implementationAuthority,'DEVELOPMENT_CONFIRMED_MACHINE_GATE');
  assert.equal(runtime.safety.directMainWriteByWorker,false);
  assert.equal(runtime.assetDecision.learningMayOverrideFixedRules,false);
  assert.equal(runtime.workManagement.machineContextRequired,true);
  assert.deepEqual(runtime.workManagement.handoffConsumers,['planner','reserve','worker','fan-in']);
  assert.equal(runtime.continuous.entryWorkflow,'.github/workflows/vibe2-24h-runner.yml');
});

test('work order exposes Web source bootstrap authority only from explicit task evidence',()=>{
  assert.match(continuousRunnerSource,/sourceRootBootstrapAllowed=plan\.target==='web'/);
  assert.match(continuousRunnerSource,/task\.evidence\|\|\[\]\)\.includes\('source-root-bootstrap-required'\)/);
  assert.match(continuousRunnerSource,/SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.match(continuousRunnerSource,/sourceRootBootstrapAllowed,/);
});

test('controller reserves a batch and fans workers out with a bounded matrix',()=>{
  assert(workflow.includes('reserve-batch'));
  assert(workflow.includes('strategy:'));
  assert.equal(workflow.includes('max-parallel: 30'),false);
  assert(workflow.includes("VIBE2_EXTERNAL_MATRIX_BATCH_MAX: '256'"));
  assert(workflow.includes("VIBE2_OWNER_MINIMUM_WAVE: '20'"));
  assert(workflow.includes("if [ \"$VIBE2_EXECUTION_LANE\" = 'game-primary' ]; then lane_min=\"$VIBE2_OWNER_MINIMUM_WAVE\"; fi"));
  assert.equal((workflow.match(/--min="\$lane_min"/g)||[]).length,2);
  assert(workflow.includes('matrix: ${{ fromJSON(needs.reserve.outputs.worker_matrix) }}'));
  assert(workflow.includes('group: vibe2-control-state-vibe2-unreal-core'));
  assert(workflow.includes('VIBE2_HIERARCHICAL_FAN_OUT'));
  assert(workflow.includes('VIBE2_HIERARCHICAL_FAN_IN=PASS'));
  assert(workflow.includes('for(let i=1;i<variantCount;i++)workers.push'));
  assert(workflow.includes("variant:\`speculative-\${i}\`"));
  assert(workflow.includes('--variant="$VARIANT"'));
  assert(continuousRunnerSource.includes("strategy:'PRIMARY_RESPONSIBILITY_MINIMAL'"));
  assert(continuousRunnerSource.includes("strategy:'DEPENDENCY_SAFE_COHERENT_PATCH'"));
  assert(continuousRunnerSource.includes("strategy:clean(preference?.strategy)||'CAUSAL_TRACE_CROSSCHECK'"));
});

test('24h planner uses latest main contract and tools while control branch stores state only',()=>{
  assert(safetyNetWorkflow.includes('VIBE2_CONTROL_STATE_JSON=VALID'));
  assert(safetyNetWorkflow.includes('node /tmp/vibe2-main/tools/vibe2-handoff.mjs --check'));
  assert(safetyNetWorkflow.includes('--runtime=/tmp/vibe2-main/vibe2-runtime.json'));
  assert(safetyNetWorkflow.includes('node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
  assert(safetyNetWorkflow.includes('--development-queue=/tmp/vibe2-company-runtime-queue.json'));
  assert(safetyNetWorkflow.includes("from 'file:///tmp/vibe2-main/assets/vibe-continuous-queue.js'"));
  assert.equal(safetyNetWorkflow.includes('node tools/vibe2-handoff.mjs --check'),false);
  assert.equal(safetyNetWorkflow.includes('node tools/vibe2-auto-planner.mjs \\'),false);
});

test('controller pins each isolated candidate to the reserve-time main contract and never writes main directly',()=>{
  assert(workflow.includes('git fetch --depth=1 --no-tags origin main --quiet'));
  assert(workflow.includes('contract_sha="$(git rev-parse FETCH_HEAD)"'));
  assert(workflow.includes('contract_sha: ${{ steps.contract.outputs.sha }}'));
  assert(workflow.includes('ref: ${{ needs.reserve.outputs.contract_sha }}'));
  assert(workflow.includes('CONTRACT_SHA: ${{ needs.reserve.outputs.contract_sha }}'));
  assert(workflow.includes('git -C "$contract_root" worktree add -b "$candidate_branch" "$candidate_dir" "$base_sha"'));
  assert(workflow.includes('export VIBE2_BASE_MAIN_SHA="$base_sha"'));
  assert(workflow.includes('vibe2/candidate/'));
  assert(workflow.includes('candidate-awaiting-qa-and-deployment'));
  assert(!workflow.includes('git worktree add -b "$candidate_branch" "$candidate_dir" origin/main'));
  assert(!workflow.includes('git push origin HEAD:main'));
  assert(!workflow.includes('vibe2-queue-control.mjs pass'));
});

test('one Vibe2 wave uses the same reserved main contract without a global exploration barrier',()=>{
  assert(workflow.includes('Checkout pinned main contract'));
  assert(workflow.includes('--project-lifecycle="$GITHUB_WORKSPACE/.vibe2/web-roblox-handoffs.json"'));
  assert(workflow.includes('Build task-local exploration handoff'));
  assert(workflow.includes('VIBE2_TASK_LOCAL_EXPLORATION=PASS'));
  assert(workflow.includes('needs: [reserve, model_cache]'));
  assert.equal(workflow.includes('needs: [reserve, model_cache, exploration]'),false);
  assert.equal(workflow.includes('\n  exploration:\n'),false);
  assert(workflow.includes('Generate isolated candidate from pinned main contract'));
  assert(workflow.includes('node "$contract_root/tools/vibe2-queue-control.mjs" fan-in'));
  assert(workflow.includes('VIBE2_RESERVE_PREFLIGHT_STEWARD=PASS'));
  assert(workflow.includes('VIBE2_RESERVE_STEWARD=PASS'));
  const reserveStart=workflow.indexOf('- name: Reserve conflict-free DAG batch');
  const reserveEnd=workflow.indexOf('  model_cache:');
  const reserveBlock=workflow.slice(reserveStart,reserveEnd);
  assert(reserveBlock.indexOf('tools/vibe2-system-steward.mjs') < reserveBlock.indexOf('tools/vibe2-handoff.mjs --check'));
  assert(reserveBlock.includes('git add .vibe2/queue.json .vibe2/parallelism-control.json'));
  assert(workflow.includes('(cd "$contract_root" && node --test --test-concurrency=4'));
  assert(workflow.includes('Game-primary candidates require full regression. Auxiliary analysis/practice lanes are source-write:NO and do not mutate production.'));
  assert.match(continuousRunnerSource,/projectLifecycleFile=''/);
  assert.match(continuousRunnerSource,/projectLifecycleFile:clean\(args\['project-lifecycle'\]\)/);
});

test('candidate release gate isolates candidates and requires the affected Web deployment check',()=>{
  assert(candidateReleaseWorkflow.includes('group: vibe2-release-${{ github.event.inputs.candidate_branch || github.ref_name }}'));
  assert(candidateReleaseWorkflow.includes('cancel-in-progress: false'));
  assert(!candidateReleaseWorkflow.includes('group: vibe2-release-serial'));
  assert(candidateReleaseWorkflow.includes('select(.name=="Cloudflare Pages")'));
  assert(candidateReleaseWorkflow.includes('VIBE2_RELEASE_PAGES_CHECK='));
  assert(candidateReleaseWorkflow.includes('VIBE2_CANDIDATE_ALREADY_PROMOTED='));
  assert(candidateReleaseWorkflow.includes('already_promoted: ${{ steps.gate.outputs.already_promoted }}'));
  const webReleaseStart=candidateReleaseWorkflow.indexOf('- name: Promote approved web source root through reviewed PR');
  const robloxReleaseStart=candidateReleaseWorkflow.indexOf('  roblox-release:');
  const webReleaseBlock=candidateReleaseWorkflow.slice(webReleaseStart,robloxReleaseStart);
  assert(!webReleaseBlock.includes('gh pr checks "$pr_url" --watch --fail-fast'));
  assert(webReleaseBlock.includes("if [ \"$ALREADY_PROMOTED\" = 'true' ]; then"));
  assert(webReleaseBlock.includes('VIBE2_WEB_ALREADY_PROMOTED=YES'));
  assert(webReleaseBlock.includes('git reset --hard origin/vibe2-unreal-core'));
  assert(!webReleaseBlock.includes('git pull --rebase origin vibe2-unreal-core'));
  assert.equal(candidateReleaseWorkflow.includes('git pull --rebase origin vibe2-unreal-core'),false);
  assert.ok((candidateReleaseWorkflow.match(/git reset --hard origin\/vibe2-unreal-core/g)||[]).length>=4);
});

test('controller runs content-hash incremental QA per worker and one parallel full regression at fan-in',()=>{
  assert(workflow.includes('actions/cache@v4'));
  assert(workflow.includes('tools/vibe2-incremental-qa.mjs'));
  assert(workflow.includes('VIBE2_CANDIDATE_MANIFEST='));
  assert(workflow.includes('candidate_manifest_rel='));
  assert(workflow.includes('CANDIDATE_MANIFEST: ${{ steps.candidate.outputs.candidate_manifest }}'));
  assert.equal(workflow.includes('find "$CANDIDATE_DIR/.vibe2/candidates" -mindepth 2 -maxdepth 2 -name manifest.json -print -quit'),false);
  assert(workflow.includes('incremental-qa-hash:'));
  assert(workflow.includes('Merge outcomes run regression and package review'));
  assert(workflow.includes('Game-primary candidates require full regression. Auxiliary analysis/practice lanes are source-write:NO and do not mutate production.'));
  assert(workflow.includes('node --test --test-concurrency=4'));
  assert.equal(workflow.includes('qa/vibe2-controller-contract.test.mjs'),false);
  assert(coreQaWorkflow.includes('qa/vibe2-controller-contract.test.mjs'));
  assert(workflow.includes('qa/vibe2-source-worker.test.mjs'));
  assert(workflow.includes('qa/vibe2-work-package.test.mjs'));
  assert(workflow.includes('qa/vibe2-adaptive-backpressure.test.mjs'));
  assert.equal(runtime.qaOptimization.perWorkerQa,'impact-first-incremental');
  assert.equal(runtime.qaOptimization.fanInQa,'single-node-test-process');
  assert.equal(runtime.qaOptimization.fanInTestConcurrency,4);
});

test('reserve preflight stays syntax-and-machine-state only and uses main contract with control state',()=>{
  const start=workflow.indexOf('- name: Prepare latest main machine contract');
  const end=workflow.indexOf('- name: Reserve conflict-free DAG batch');
  assert(start>=0 && end>start);
  const preflight=workflow.slice(start,end);
  assert(preflight.includes('git fetch --depth=1 --no-tags origin main --quiet'));
  assert(preflight.includes('contract_sha="$(git rev-parse FETCH_HEAD)"'));
  assert(preflight.includes('git archive "$contract_sha" | tar -x -C /tmp/vibe2-main'));
  assert(preflight.includes('VIBE2_MAIN_CONTRACT_SNAPSHOT=ARCHIVE'));
  assert.equal(preflight.includes('git worktree add --detach /tmp/vibe2-main'),false);
  assert(preflight.includes('echo "sha=$contract_sha" >> "$GITHUB_OUTPUT"'));
  assert(preflight.includes('node --check "/tmp/vibe2-main/$file"'));
  assert(preflight.includes('node /tmp/vibe2-main/tools/vibe2-handoff.mjs --check'));
  assert(preflight.includes('--runtime=/tmp/vibe2-main/vibe2-runtime.json'));
  assert(preflight.includes('--queue="$control_root/.vibe2/queue.json"'));
  assert(preflight.includes('--control="$control_root/.vibe2/parallelism-control.json"'));
  assert(!preflight.includes('node tools/vibe2-handoff.mjs --check'));
  assert(!preflight.includes('node --test '));
  assert.equal(runtime.qaOptimization.reservePreflight,'syntax-and-machine-state-only');
  assert.equal(runtime.qaOptimization.duplicateFullRegressionBeforeReserve,false);
});

test('controller serializes only shared queue state writes while worker branches stay parallel',()=>{
  assert(workflow.includes('concurrency:\n      group: vibe2-control-state-vibe2-unreal-core'));
  assert(workflow.includes('actions/upload-artifact@v4'));
  assert(workflow.includes('actions/download-artifact@v4'));
  assert(workflow.includes('node "$contract_root/tools/vibe2-queue-control.mjs" fan-in'));
  assert(!workflow.includes('vibe2-remote-work-lock.mjs'));
});

test('controller allows approved source root but enforces candidate boundary',()=>{
  assert(workflow.includes('git add "$SOURCE_ROOT" .vibe2/candidates'));
  assert(workflow.includes('candidate escaped approved boundary'));
});

test('workers complete the current wave before one fan-in refill dispatch',()=>{
  assert(workflow.includes('repository_dispatch:'));
  assert(workflow.includes('types: [vibe2-fanin-refill]'));
  assert(workflow.includes("- 'vibe2/refill/fanin/**'"));
  assert.equal(workflow.includes('Signal immediate slot refill after single-variant worker completion'),false);
  assert.equal(workflow.includes("event_type:'vibe2-slot-refill'"),false);
  assert.equal(workflow.includes('VIBE2_EARLY_SLOT_REFILL_SIGNAL=REPOSITORY_DISPATCH'),false);
  assert.equal(workflow.includes('earlyRefill'),false);
  assert.equal(runtime.continuous.refillRef,'vibe2-unreal-core');
  assert.equal(runtime.continuous.refillMode,'fan-in-repository-dispatch-with-hourly-safety-net');
  assert.equal(runtime.continuous.slotRefillTrigger,'disabled');
  assert.equal(runtime.continuous.legacySlotRefillBranchCompatibility,false);
  assert.equal(runtime.continuous.slotRefillSingleVariantOnly,false);
  assert.equal(runtime.continuous.perWorkerSlotRefillEnabled,false);
  assert.equal(runtime.continuous.fanInRefillTrigger,'repository-dispatch');
  assert.equal(runtime.continuous.slotRefillWorkerDirectControlWrite,false);
  assert.equal(runtime.continuous.slotRefillSourceLocksHeldUntilFanIn,true);
  const reserveStart=workflow.indexOf('- name: Reserve conflict-free DAG batch');
  const reserveEnd=workflow.indexOf('  model_cache:');
  const reserveBlock=workflow.slice(reserveStart,reserveEnd);
  assert(reserveBlock.includes("if [ \"$callback_kind\" = 'fanin' ]; then"));
  assert(reserveBlock.includes('git show origin/company-runtime:development-queue.json > /tmp/vibe2-company-runtime-queue.json'));
  assert(reserveBlock.includes('node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
  assert(reserveBlock.includes('VIBE2_FANIN_REFILL_PLANNER_SYNC=PASS'));
  assert(reserveBlock.indexOf('VIBE2_FANIN_REFILL_PLANNER_SYNC=PASS') < reserveBlock.indexOf('vibe2-queue-control.mjs reserve-batch'));
});

test('24H push and safety-net cannot overlap an active worker wave',()=>{
  assert(safetyNetWorkflow.includes('wave_ready: ${{ steps.queue_state.outputs.wave_ready }}'));
  assert(safetyNetWorkflow.includes('active_worker_reservations: ${{ steps.queue_state.outputs.active_worker_reservations }}'));
  assert(safetyNetWorkflow.includes('VIBE2_24H_ACTIVE_GAME_WORKER_RESERVATIONS='));
  assert(safetyNetWorkflow.includes('VIBE2_24H_WAVE_READY='));
  assert(safetyNetWorkflow.includes("needs.plan.outputs.wave_ready == 'YES' && needs.plan.outputs.game_primary_queued != '0'"));
  assert(safetyNetWorkflow.includes("needs.plan.outputs.game_primary_queued == '0' && needs.plan.outputs.learning_idle_queued != '0'"));
  assert(safetyNetWorkflow.includes("needs.continuous.result == 'success'"));
  assert(safetyNetWorkflow.includes("needs.learning_idle.result == 'success'"));
  assert(workflow.includes('VIBE2_ACTIVE_LANE_RESERVATIONS_BEFORE_RESERVE='));
  assert(workflow.includes('VIBE2_RESERVE_GUARD=ACTIVE_WAVE_PRESENT'));
  assert(workflow.includes("guard:'ACTIVE_LANE_RESERVATION_PRESENT'"));
});

test('24H cycle serialization does not reuse the control-state lock',()=>{
  assert(safetyNetWorkflow.includes('concurrency:\n  group: vibe2-24h-cycle-main\n  cancel-in-progress: false'));
  assert(!safetyNetWorkflow.includes('concurrency:\n  group: vibe2-control-state-vibe2-unreal-core\n  cancel-in-progress: false\n\njobs:'));
  const gameStudyStart=safetyNetWorkflow.indexOf('  game_study:');
  const refillStart=safetyNetWorkflow.indexOf('  refill:');
  assert(gameStudyStart>=0 && refillStart>gameStudyStart);
  assert(safetyNetWorkflow.slice(gameStudyStart,refillStart).includes('needs: [plan, continuous, learning_idle]'));
});

test('continuous core and 24H runner isolate game-primary and learning-idle execution lanes',()=>{
  assert(workflow.includes('execution_lane:'));
  assert(workflow.includes("VIBE2_EXECUTION_LANE: ${{ inputs.execution_lane || 'game-primary' }}"));
  assert(workflow.includes('--lane="$VIBE2_EXECUTION_LANE"'));
  assert(workflow.includes('VIBE2_REGRESSION_ROLE=SKIPPED_AUXILIARY_LANE:'));
  assert(workflow.includes('AUXILIARY_LANE_NO_RELEASE'));
  assert(workflow.includes("if: env.VIBE2_EXECUTION_LANE == 'game-primary'"));
  assert(safetyNetWorkflow.includes('game_primary_queued: ${{ steps.queue_state.outputs.game_primary_queued }}'));
  assert(safetyNetWorkflow.includes('learning_idle_queued: ${{ steps.queue_state.outputs.learning_idle_queued }}'));
  assert(safetyNetWorkflow.includes('  learning_idle:'));
  assert(safetyNetWorkflow.includes('execution_lane: learning-idle'));
  assert(safetyNetWorkflow.includes("lane_max: '4'"));
  assert(safetyNetWorkflow.includes("needs.plan.outputs.game_primary_queued == '0'"));
});

test('recovery-fast lane is event-driven and never directly consumes a game worker slot',()=>{
  assert(recoveryFastWorkflow.includes('name: Vibe2 Recovery Fast'));
  assert(recoveryFastWorkflow.includes('Vibe2 Continuous Core'));
  assert(recoveryFastWorkflow.includes('Company System AI Workers'));
  assert(recoveryFastWorkflow.includes("cron: '*/5 * * * *'"));
  assert(recoveryFastWorkflow.includes('tools/company-recovery-escalation.mjs'));
  assert(recoveryFastWorkflow.includes('tools/company-recovery-dispatch.mjs'));
  assert(recoveryFastWorkflow.includes('--route=all'));
  assert(recoveryFastWorkflow.includes('VIBE2_RECOVERY_FAST_GAME_WORKER_DISPATCH=DEFER_TO_GAME_PRIMARY_FANIN'));
  assert(recoveryFastWorkflow.includes('company-system-ai-cycle'));
  assert(recoveryFastWorkflow.includes('system_ai_recovery_dispatched'));
  assert(recoveryFastWorkflow.includes("if: steps.recovery.outputs.system_ai_recovery_dispatched != '0'"));
  assert.equal(recoveryFastWorkflow.includes("if: steps.recovery.outputs.system_ai_queued != '0'"),false);
  assert.equal(recoveryFastWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'),false);
  assert.equal(recoveryFastWorkflow.includes('vibe2-fanin-refill'),false);
  assert.equal(recoveryFastWorkflow.includes('git pull --rebase origin vibe2-unreal-core'),false);
});

test('fan-in keeps a repository-dispatch fallback and hourly safety net',()=>{
  assert(workflow.includes('Event-driven fan-in refill fallback'));
  assert(workflow.includes("event_type:'vibe2-fanin-refill'"));
  assert(workflow.includes('VIBE2_EVENT_DRIVEN_REFILL=FANIN_REPOSITORY_DISPATCH'));
  assert(!workflow.includes('gh workflow run vibe2-continuous-core.yml'));
  assert(!workflow.includes('gh workflow run vibe2-24h-runner.yml --repo "$GITHUB_REPOSITORY" --ref main'));
  assert(safetyNetWorkflow.includes('node /tmp/vibe2-main/tools/vibe2-handoff.mjs --check'));
  assert(safetyNetWorkflow.includes('node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
  assert(safetyNetWorkflow.includes('uses: ./.github/workflows/vibe2-continuous-core.yml'));
  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');
});

test('worker never mutates shared queue state or dispatches refill runs',()=>{
  const start=workflow.indexOf('  worker:');
  const end=workflow.indexOf('  fan_in:');
  assert(start>=0 && end>start);
  const workerPart=workflow.slice(start,end);
  assert(!workerPart.includes('vibe2-queue-control.mjs release-slot'));
  assert(!workerPart.includes('git push origin HEAD:vibe2-unreal-core'));
  assert(!workerPart.includes('HEAD:refs/heads/vibe2/refill/'));
  assert(!workerPart.includes('"https://api.github.com/repos/${GITHUB_REPOSITORY}/dispatches"'));
  assert(!workerPart.includes("event_type:'vibe2-slot-refill'"));
});

test('worker Ollama cache includes the runtime sidecar and rejects binary-only cache hits',()=>{
  assert(workflow.includes('~/.cache/vibe2-ollama/lib/ollama'));
  assert(workflow.includes('vibe2-ollama-v3-Linux-qwen3-1.7b'));
  assert(workflow.includes("find \"$cached_lib\" -type f -name 'llama-server'"));
  assert(workflow.includes('sudo cp -a "$cached_lib/." /usr/local/lib/ollama/'));
  assert(!workflow.includes('key: vibe2-ollama-v2-Linux-qwen3-1.7b'));
});

test('fan-in release requires exact candidate manifest identity',()=>{
  const branch='vibe2/candidate/demo/primary';
  const baseTask={
    id:'demo-task',
    gameId:'demo',
    target:'web',
    sourceRoot:'web-games/demo',
    status:'running',
    blocker:'candidate-awaiting-qa-and-deployment',
    evidence:[
      branch,
      'role-result:exploration:PASS',
      'role-result:implementation:PASS',
      'role-result:test:PASS',
      'role-result:performance:PASS'
    ]
  };
  const valid={
    version:7,
    taskId:'demo-task',
    outcome:'PASS',
    candidateBranch:branch,
    baseMainSha:'abc123',
    candidateIdentity:{
      taskId:'demo-task',
      gameId:'demo',
      target:'web',
      sourceRoot:'web-games/demo',
      baseMainSha:'abc123',
      manifestPath:'.vibe2/candidates/demo-task/manifest.json'
    },
    evidence:[branch]
  };
  const pass=finalizeVibe2FanInReview({queue:{tasks:[baseTask]},results:[valid]});
  assert.equal(pass.pass,true);
  assert.equal(pass.releaseCandidates.length,1);
  assert.ok(pass.queue.tasks[0].evidence.includes('candidate-identity:PASS'));

  const stale=structuredClone(valid);
  stale.candidateIdentity.sourceRoot='web-games/other-game';
  const blocked=finalizeVibe2FanInReview({queue:{tasks:[baseTask]},results:[stale]});
  assert.equal(blocked.pass,false);
  assert.equal(blocked.releaseCandidates.length,0);
  assert.ok(blocked.reviewed[0].missing.includes('candidate-identity-source-root'));
  assert.ok(blocked.queue.tasks[0].evidence.includes('role-result:review:BLOCKED'));
});

test('supervised Web candidates learn review decisions and stay unreleased until verified PASS approval',()=>{
  const branch='vibe2/candidate/supervised-demo/primary';
  const baseTask={
    id:'supervised-demo-task',gameId:'supervised-demo',target:'web',sourceRoot:'web-games/supervised-demo',
    status:'running',blocker:'candidate-awaiting-qa-and-deployment',supervisionApproved:false,
    supervisionContract:{required:true,mode:'ASSISTANT_SUPERVISED_VIBE_COAUTHORING'},
    evidence:[branch,'role-result:exploration:PASS','role-result:implementation:PASS','role-result:test:PASS','role-result:performance:PASS']
  };
  const valid={
    version:9,taskId:baseTask.id,outcome:'PASS',candidateBranch:branch,baseMainSha:'abc123',
    candidateIdentity:{taskId:baseTask.id,gameId:baseTask.gameId,target:'web',sourceRoot:baseTask.sourceRoot,baseMainSha:'abc123',manifestPath:'.vibe2/candidates/supervised-demo-task/manifest.json'},
    evidence:[branch]
  };
  const waiting=finalizeVibe2FanInReview({queue:{tasks:[baseTask]},results:[valid]});
  assert.equal(waiting.pass,true);
  assert.equal(waiting.releaseCandidates.length,0);
  assert.equal(waiting.experienceReviews.length,0);
  assert.equal(waiting.queue.tasks[0].blocker,'candidate-awaiting-supervised-review');

  const reviseTask=structuredClone(baseTask);
  reviseTask.supervisionReview={
    verified:true,decision:'REVISE',rationale:'핵심 루프는 동작하지만 모바일 입력 피드백이 약함',
    avoidPatterns:['검수용 버튼만 추가하고 실제 입력 연결을 끝내지 않는 패턴'],
    evidence:['supervisor-diff-review:1','mobile-playability-review:1']
  };
  const revise=finalizeVibe2FanInReview({queue:{tasks:[reviseTask]},results:[valid]});
  assert.equal(revise.releaseCandidates.length,0);
  assert.equal(revise.experienceReviews.length,1);
  assert.equal(revise.experienceReviews[0].outcome,'FAIL');
  assert.match(revise.experienceReviews[0].failureCause,/모바일 입력 피드백/);

  const approvedTask=structuredClone(baseTask);
  approvedTask.supervisionApproved=true;
  approvedTask.supervisionReview={
    verified:true,decision:'PASS',rationale:'핵심 루프·저장·모바일 입력이 보존되고 실제 플레이 후보가 완성됨',
    reusablePatterns:['기존 세이브와 핵심 루프를 고정한 뒤 책임 함수만 구현'],
    evidence:['supervisor-diff-review:2','mobile-playability-review:2']
  };
  const approved=finalizeVibe2FanInReview({queue:{tasks:[approvedTask]},results:[valid]});
  assert.equal(approved.releaseCandidates.length,1);
  assert.equal(approved.experienceReviews.length,1);
  assert.equal(approved.experienceReviews[0].outcome,'PASS');
  assert.ok(approved.experienceReviews[0].reusablePatterns.includes('기존 세이브와 핵심 루프를 고정한 뒤 책임 함수만 구현'));
});

test('fan-in workflow persists verified supervised review learning before release dispatch',()=>{
  assert.match(workflow,/vibe2-experience-control\.mjs/);
  assert.match(workflow,/--batch-review=\/tmp\/vibe2-package-review\.json/);
  assert.match(workflow,/\.vibe2\/experience\.json/);
});
test('worker result exposes exact candidate identity for fan-in review',()=>{
  const start=workflow.indexOf('- name: Build immutable worker result');
  const end=workflow.indexOf('- name: Upload worker result for fan-in');
  const resultStep=workflow.slice(start,end);
  assert(resultStep.includes('candidateIdentity=candidateOk?'));
  assert(resultStep.includes('taskId:clean(manifest.taskId)'));
  assert(resultStep.includes('sourceRoot:clean(manifest.sourceRoot)'));
  assert(resultStep.includes('baseMainSha:clean(manifest.baseMainSha)'));
  assert(resultStep.includes('version:9'));
});

test('worker immutable result preserves causal replay status without treating plan-only as executed',()=>{
  const start=workflow.indexOf('- name: Run impact-first incremental QA role');
  const resultStart=workflow.indexOf('- name: Build immutable worker result');
  const resultEnd=workflow.indexOf('- name: Upload worker result for fan-in');
  assert(start>=0&&resultStart>start&&resultEnd>resultStart);
  const qaStep=workflow.slice(start,resultStart);
  const resultStep=workflow.slice(resultStart,resultEnd);
  assert(qaStep.includes('VIBE2_CAUSAL_REPLAY_STATUS='));
  assert(qaStep.includes('VIBE2_CAUSAL_REPLAY_EXECUTED='));
  assert(qaStep.includes('causal_replay_status=$replay_status'));
  assert(qaStep.includes('causal_replay_executed=$replay_executed'));
  assert(resultStep.includes('causal-replay-status:${clean(process.env.IQA_CAUSAL_REPLAY_STATUS)}'));
  assert(resultStep.includes('causal-replay-executed:${clean(process.env.IQA_CAUSAL_REPLAY_EXECUTED)}'));
  assert(resultStep.includes("causalReplayExecuted:clean(process.env.IQA_CAUSAL_REPLAY_EXECUTED).toUpperCase()==='YES'"));
});
test('worker result keeps throughput and actual workload telemetry inputs in the immutable result step',()=>{
  const start=workflow.indexOf('- name: Build immutable worker result');
  const end=workflow.indexOf('- name: Upload worker result for fan-in');
  assert(start>=0 && end>start);
  const resultStep=workflow.slice(start,end);
  assert(resultStep.includes('CANDIDATE_MANIFEST:'));
  for(const key of ['RESERVED_AT:','REQUESTED_MAX:','EFFECTIVE_MAX:','WORKER_STARTED_AT_FILE:','CHECKOUT_MS:','MODEL_PREP_MS:','CANDIDATE_MS:','QA_MS:','CHANGED_FILE_COUNT:','ADDED_LINE_COUNT:','DELETED_LINE_COUNT:','CANDIDATE_FAILURE_CLASS:','CANDIDATE_FAILURE_MESSAGE:','EXPLORATION_FILE:']) {
    assert(resultStep.includes(key),`missing result telemetry env ${key}`);
  }
  assert(workflow.includes('git diff --cached --numstat -- "$SOURCE_ROOT"'));
  assert(workflow.includes('JSON.stringify({version:3,results,tasks:queue.tasks||[]}'));
});

test('candidate failure telemetry survives a failed source worker step',()=>{
  const start=workflow.indexOf('- name: Generate isolated candidate from pinned main contract');
  const end=workflow.indexOf('- name: Restore incremental QA content-hash cache');
  assert(start>=0 && end>start);
  const candidateStep=workflow.slice(start,end);
  assert(candidateStep.includes('worker_rc=${PIPESTATUS[0]}'));
  assert(candidateStep.includes('VIBE2_SOURCE_WORKER_FAILURE_CLASS'));
  assert(candidateStep.includes('failure_class=$failure_class'));
  assert(candidateStep.includes('duration_ms=$((candidate_finished-candidate_started))'));
  const resultStart=workflow.indexOf('- name: Build immutable worker result');
  const resultEnd=workflow.indexOf('- name: Upload worker result for fan-in');
  const resultStep=workflow.slice(resultStart,resultEnd);
  assert(resultStep.includes('source-generation-failure:${candidateFailureClass}'));
  assert(resultStep.includes('coding-failure-fingerprint:${clean(baseCodingMethod.failureFingerprint)}'));
  assert(resultStep.includes('coding-patch-recipe:${clean(baseCodingMethod.patchRecipeMode)}'));
  assert(resultStep.includes('coding-verified-failure-memory-count:${Number(baseCodingMethod.verifiedFailureLocalMemoryCount)}'));
  assert(resultStep.includes('coding-timeout-partial-recovery:YES'));
  assert(resultStep.includes("const sourceGenerationAttempted=process.env.ORDER_RUN==='true' && route==='text-source-worker'"));
  assert(resultStep.includes("candidateFailure=sourceGenerationAttempted&&!candidateOk?"));
  assert(resultStep.includes("candidateFailureClass=sourceGenerationAttempted&&!candidateOk?"));
  assert(resultStep.includes("manifest.exploration||(explorationFile&&fs.existsSync(explorationFile)"));
  assert(resultStep.includes("const baseCodingMethod=manifest?.codingMethod||fallbackCodingMethod"));
  assert(resultStep.includes("strategy:clean(workOrder.candidateStrategyRole.strategy)"));
  assert(resultStep.includes("failureFingerprint:clean(workOrder?.unifiedLearning?.failureFingerprint)||null"));
  assert(resultStep.includes("telemetrySource:manifest?.codingMethod?'CANDIDATE_MANIFEST':'WORK_ORDER_FALLBACK'"));
});
test('explicit work-order output path overrides runtime default path',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-output-path-'));
  const queueFile=path.join(root,'queue.json');
  const controlFile=path.join(root,'parallelism.json');
  const experienceFile=path.join(root,'experience.json');
  const runtimeDefault=path.join(root,'runtime-default.json');
  const explicitOutput=path.join(root,'explicit-output.json');
  const runtimeFile=path.join(root,'runtime.json');
  const fixtureRuntime=structuredClone(runtime);

  fixtureRuntime.continuous={...fixtureRuntime.continuous,enabled:false,entryWorkflow:'.github/workflows/vibe2-24h-runner.yml',workerWorkflow:'.github/workflows/vibe2-continuous-core.yml'};
  fixtureRuntime.documentation={
    ...fixtureRuntime.documentation,
    runtimeState:{queue:'queue.json',parallelism:'parallelism.json',experience:'experience.json'},
    generatedHandoffTool:'tools/vibe2-handoff.mjs'
  };
  fixtureRuntime.sources={queue:'queue.json',parallelism:'parallelism.json',experience:'experience.json',workOrder:runtimeDefault};
  fixtureRuntime.adaptiveBackpressure={...fixtureRuntime.adaptiveBackpressure,stateFile:'parallelism.json'};

  fs.mkdirSync(path.join(root,'tools'),{recursive:true});
  fs.mkdirSync(path.join(root,'.github','workflows'),{recursive:true});
  fs.writeFileSync(path.join(root,'tools','vibe2-handoff.mjs'),'// fixture\n','utf8');
  fs.writeFileSync(path.join(root,'.github','workflows','vibe2-24h-runner.yml'),'name: fixture\n','utf8');
  fs.writeFileSync(path.join(root,'.github','workflows','vibe2-continuous-core.yml'),'name: fixture\n','utf8');
  fs.writeFileSync(queueFile,JSON.stringify({version:5,maxConcurrentTasks:256,tasks:[]}), 'utf8');
  fs.writeFileSync(controlFile,JSON.stringify({version:3,currentMax:256}), 'utf8');
  fs.writeFileSync(experienceFile,JSON.stringify({version:3,records:[]}), 'utf8');
  fs.writeFileSync(runtimeFile,JSON.stringify(fixtureRuntime), 'utf8');

  const order=runVibeContinuousRunner({runtimeFile,outputFile:explicitOutput});
  assert.equal(order.reason,'CONTINUOUS_DISABLED');
  assert.equal(order.machineHandoff.consistency.ok,true);
  assert.equal(fs.existsSync(explicitOutput),true);
  assert.equal(fs.existsSync(runtimeDefault),false);
});

test('central runtime enables functional work packages and adaptive workload telemetry',()=>{
  assert.equal(runtime.workPackages.enabled,true);
  assert.equal(runtime.workPackages.smallTaskAction,'auto-expand-or-defer');
  assert.equal(runtime.workPackages.automaticExpansionMode,'real-disjoint-candidates-first-explicit-related-scopes-fallback');
  assert.equal(runtime.workPackages.minRelatedImprovementsPerPackage,3);
  assert.equal(runtime.workPackages.targetFeaturePackagesPerCycle,1);
  assert.equal(runtime.workPackages.sameFileParallelWrite,false);
  assert.equal(runtime.workPackages.sharedPreparation,false);
  assert.equal(runtime.workPackages.longWorkSlotProtection,true);
  assert.equal(runtime.workPackages.workloadTelemetry.enabled,true);
  for(const metric of ['completedFeaturePackageCount','actualChangedFileCount','actualChangedLineCount','historicalReworkRatePct','historicalQaDuplicateRatePct','averagePackageCycleTimeMs']) {
    assert(runtime.workPackages.workloadTelemetry.metrics.includes(metric),`missing work package metric ${metric}`);
  }
  assert.equal(runtime.workPackages.efficiencyAdaptation.lowEfficiencyStreakThreshold,2);
  assert.equal(runtime.workPackages.efficiencyAdaptation.neverReduceSafetyOrQa,true);
});
