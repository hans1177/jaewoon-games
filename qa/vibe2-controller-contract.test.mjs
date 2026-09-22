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
const roadmap=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
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

test('learning Web artifact practice routes to isolated artifact execution instead of production source work',()=>{
  const adapter=createVibeEngineAdapter({target:'web',gameSlug:'practice-demo'});
  const route=classifyVibeExecutionRoute({
    target:'web',
    task:{type:'research',department:'learning',goal:'[VIBE_LEARNING_PRACTICE] practiceMode=WEB_ARTIFACT',responsibleFiles:[],evidence:['learning-practice-only','learning-web-artifact-practice']},
    adapter
  });
  assert.equal(route.route,'learning-web-artifact');
  assert.equal(route.repositorySourceWrite,false);
  assert.equal(route.artifactWrite,true);
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
  assert(runtime.version>=14);
  assert.equal(runtime.continuous.strategy,'atomic-neuron-dag-sharded-work-stealing');
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
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,256);
  assert.equal(runtime.adaptiveBackpressure.baselineAdaptiveWave,20);
  assert.equal(runtime.adaptiveBackpressure.minimumAdaptiveWave,20);
  assert.equal(runtime.adaptiveBackpressure.externalBatchMax,256);
});

test('graphics presentation uses atomic neuron task micro-fan-in without expanding authority',()=>{
  const presentation=roadmap.presentationPipelineImplementation;
  const assets=roadmap.assetProductionParallelContract;
  assert.equal(presentation.version>=5,true);
  assert.equal(presentation.rules.graphicsAtomicNeuronExecutionRequired,true);
  assert.equal(presentation.rules.graphicsTaskMicroFanInRequired,true);
  assert.equal(presentation.rules.graphicsGlobalWaveBarrierForbidden,true);
  assert.equal(presentation.rules.actualRuntimeGraphicsRequiredForPresentationPass,true);
  assert.equal(presentation.rules.contextMatchedBackgroundAndEnvironmentRequired,true);
  assert.equal(presentation.rules.placeholderPrimitiveCharacterOrMonsterCompletionForbidden,true);
  assert.deepEqual(presentation.rules.actionStateMotionCoverageRequired,['IDLE','MOVE','ATTACK','HIT','DEATH']);
  assert.equal(presentation.rules.markerOnlyOrStaticDescriptionCompletionForbidden,true);
  assert.equal(presentation.runtimeObservation.validatorSchemaVersion,16);
  assert.equal(assets.version>=4,true);
  assert.equal(assets.parallelism.executionAuthority,'EXISTING_DAG_SCHEDULER_WITH_ATOMIC_COMPLETION_CALLBACK');
  assert.equal(assets.parallelism.graphicsAtomicNeuronMode,'PER_TASK_MICRO_FANIN');
  assert.equal(assets.parallelism.completionEvent,'vibe2-neuron-complete');
  assert.equal(assets.parallelism.speculativeVariantsJoinScope,'PER_GRAPHICS_TASK');
  assert.equal(assets.parallelism.isolatedCandidateBranchesRequired,true);
  assert.equal(assets.parallelism.globalWaveBarrierForbidden,true);
  assert.equal(assets.graphicsPassContract.contextMatchedBackgroundRuntimeEvidenceRequired,true);
  assert.equal(assets.graphicsPassContract.characterMonsterVisualDetailRuntimeEvidenceRequired,true);
  assert.equal(assets.graphicsPassContract.combatDeathMotionRequiredWhenRuntimeKillObserved,true);
  assert.equal(assets.graphicsPassContract.markerOnlyPresentationPassForbidden,true);
  assert.equal(assets.parallelism.realRuntimePresentationHardGatePreserved,true);
  assert.equal(assets.parallelism.phase2NeuralExecutionAuthorityCreated,false);
  assert.match(continuousRunnerSource,/mode:'PER_TASK_MICRO_FANIN'/);
  assert.match(continuousRunnerSource,/maxVariants:3/);
  assert.match(continuousRunnerSource,/task-micro-fanin=required/);
  assert.match(continuousRunnerSource,/placeholderPrimitiveCompletionForbidden:true/);
  assert.match(continuousRunnerSource,/actionStateCoverage:freezeList\(\['IDLE','MOVE','ATTACK','HIT','DEATH'\]\)/);
});

test('work order exposes source bootstrap only for explicit Web or Unity Web first-stage evidence',()=>{
  assert.match(continuousRunnerSource,/webSourceRootBootstrapAllowed=plan\.target==='web'/);
  assert.match(continuousRunnerSource,/unityWebSourceRootBootstrapAllowed=plan\.target==='unity'/);
  assert.match(continuousRunnerSource,/taskEvidence\.has\('source-root-bootstrap-required'\)/);
  assert.match(continuousRunnerSource,/taskEvidence\.has\('unity-web-source-root-bootstrap-required'\)/);
  assert.match(continuousRunnerSource,/SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.match(continuousRunnerSource,/UNITY_PROJECT_SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.match(continuousRunnerSource,/responsibleFiles\.length===2/);
  assert.match(continuousRunnerSource,/GameCore\\\.cs/);
  assert.match(continuousRunnerSource,/RuntimeBootstrap\\\.cs/);
  assert.match(continuousRunnerSource,/sourceRootBootstrapAllowed,/);
});

test('controller reserves a batch and fans workers out with a bounded matrix',()=>{
  assert(workflow.includes('reserve-batch'));
  assert(workflow.includes('strategy:'));
  assert.equal(workflow.includes('max-parallel: 30'),false);
  assert(workflow.includes("VIBE2_EXTERNAL_MATRIX_BATCH_MAX: '256'"));
  assert(workflow.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '20'"));
  assert(workflow.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '20'"));
  assert(workflow.includes("if [ \"$VIBE2_EXECUTION_LANE\" = 'game-primary' ]; then lane_min=\"$VIBE2_GAME_PRIMARY_ADAPTIVE_MIN\"; fi"));
  assert.equal((workflow.match(/--min="\$lane_min"/g)||[]).length,4);
  assert(workflow.includes('matrix: ${{ fromJSON(needs.reserve.outputs.worker_matrix) }}'));
  assert(workflow.includes("'vibe2-control-state-vibe2-unreal-core'"));
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

test('24h planner retries concurrent control-state writes from the latest branch instead of rebasing JSON state',()=>{
  const start=safetyNetWorkflow.indexOf('- name: Plan from latest main and persist control queue');
  const end=safetyNetWorkflow.indexOf('- name: Read queue continuation state',start);
  assert.ok(start>=0&&end>start);
  const block=safetyNetWorkflow.slice(start,end);
  assert.match(block,/for attempt in 1 2 3 4 5; do/);
  assert.match(block,/VIBE2_AUTOPLAN_ATTEMPT=\$attempt\/5/);
  assert.match(block,/git reset --hard origin\/vibe2-unreal-core/);
  assert.match(block,/git push origin HEAD:vibe2-unreal-core/);
  assert.match(block,/VIBE2_AUTOPLAN_OPTIMISTIC_RETRY=\$attempt/);
  assert.doesNotMatch(block,/git pull --rebase origin vibe2-unreal-core/);
  assert.doesNotMatch(block,/git rebase --abort/);
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

test('every atomic worker synchronizes with Vibe control state before any worker work',()=>{
  const start=workflow.indexOf('  worker:');
  const end=workflow.indexOf('  fan_in:',start);
  const workerPart=workflow.slice(start,end);
  const sync=workerPart.indexOf('- name: Synchronize worker with Vibe before work');
  const cache=workerPart.indexOf('- name: Restore shared Ollama runtime cache');
  const order=workerPart.indexOf('- name: Build reserved task work order');
  assert.ok(sync>=0);
  assert.ok(cache>sync);
  assert.ok(order>sync);
  assert.ok(workerPart.includes('node tools/company-shared-context.mjs --output=/tmp/vibe2-worker-shared-context.json'));
  assert.ok(workerPart.includes('verify-worker-sync'));
  assert.ok(workerPart.includes('--reservation-id="$RESERVATION_ID"'));
  assert.ok(workerPart.includes('--reservation-run="$RESERVATION_RUN_ID"'));
  assert.ok(workerPart.includes('--reservation-attempt="$RESERVATION_RUN_ATTEMPT"'));
  assert.ok(workerPart.includes('--reserved-at="$RESERVED_AT"'));
  assert.ok(workerPart.includes('VIBE2_WORKER_PREFLIGHT_SYNC=PASS'));
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
  assert(reserveBlock.includes('state_paths=('));
  assert(reserveBlock.includes('.vibe2/queue.json'));
  assert(reserveBlock.includes('.vibe2/parallelism-control.json'));
  assert(reserveBlock.includes('.vibe2/learning-motor-state.json'));
  assert(reserveBlock.includes('git add "${state_paths[@]}"'));
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

test('neuron callbacks keep every ingress event and reconcile shared queue state optimistically',()=>{
  assert(workflow.includes("format('vibe2-neuron-{0}-{1}', github.event.client_payload.source_run, github.event.client_payload.artifact_name)"));
  assert(workflow.includes("'vibe2-control-state-vibe2-unreal-core'"));
  const start=workflow.indexOf('      - name: Reserve conflict-free DAG batch');
  const end=workflow.indexOf('  model_cache:',start);
  const reserveBlock=workflow.slice(start,end);
  assert(reserveBlock.includes('for state_attempt in 1 2 3 4 5; do'));
  assert(reserveBlock.includes('VIBE2_CONTROL_OPTIMISTIC_ATTEMPT='));
  assert(reserveBlock.includes('git reset --hard origin/vibe2-unreal-core'));
  assert(reserveBlock.includes('git push origin HEAD:vibe2-unreal-core'));
  assert(reserveBlock.includes('VIBE2_CONTROL_OPTIMISTIC_RETRY='));
  assert.equal(reserveBlock.includes('git pull --rebase origin vibe2-unreal-core'),false);
  assert(workflow.includes('actions/upload-artifact@v4'));
  assert(workflow.includes('actions/download-artifact@v4'));
  assert(workflow.includes('node "$contract_root/tools/vibe2-queue-control.mjs" fan-in'));
  assert(workflow.includes('Acquire shared Work Lock before source write'));
  assert(workflow.includes('vibe2-remote-work-lock.mjs" acquire'));
  assert(workflow.includes('Release shared Work Locks after fan-in or abort'));
  assert(workflow.includes('vibe2-remote-work-lock.mjs" release'));
});

test('controller allows approved source root but enforces candidate boundary',()=>{
  assert(workflow.includes('git add "$SOURCE_ROOT" .vibe2/candidates'));
  assert(workflow.includes('candidate escaped approved boundary'));
});

test('workers signal atomic completion and task micro-fan-in refills capacity without a cohort barrier',()=>{
  const reserveStart=workflow.indexOf('      - name: Reserve conflict-free DAG batch');
  const reserveEnd=workflow.indexOf('  model_cache:',reserveStart);
  const reserveBlock=workflow.slice(reserveStart,reserveEnd);
  assert(workflow.includes('repository_dispatch:'));
  assert(workflow.includes('types: [vibe2-neuron-complete, vibe2-fanin-refill]'));
  assert(workflow.includes('Dispatch atomic neuron completion'));
  assert(workflow.includes("event_type:'vibe2-neuron-complete'"));
  assert(workflow.includes('VIBE2_ATOMIC_NEURON_COMPLETION_DISPATCH=PASS'));
  assert(workflow.includes('VIBE2_ATOMIC_NEURON_MICRO_FANIN=RESULT_RECORDED_PENDING'));
  assert(workflow.includes('VIBE2_ATOMIC_NEURON_MICRO_FANIN=TASK_MICRO_FANIN_COMPLETE'));
  assert.equal(workflow.includes('VIBE2_ATOMIC_NEURON_MICRO_FANIN=PASS'),false);
  assert(workflow.includes("format('vibe2-neuron-{0}-{1}', github.event.client_payload.source_run, github.event.client_payload.artifact_name)"));
  assert.equal(runtime.continuous.executionTopology,'ATOMIC_NEURON_STREAM');
  assert.equal(runtime.continuous.atomicNeuronStream.fixedWaveBarrier,false);
  assert.equal(runtime.continuous.atomicNeuronStream.taskMicroFanIn,true);
  assert.equal(runtime.continuous.atomicNeuronStream.speculativeVariantsJoinPerTask,true);
  assert.equal(runtime.continuous.atomicNeuronStream.cohortFanInRole,'REGRESSION_RELEASE_AUDIT_ONLY');
  assert.equal(runtime.continuous.atomicNeuronStream.workerDirectControlWrite,false);
  assert.equal(runtime.continuous.refillRef,'vibe2-unreal-core');
  assert.equal(runtime.continuous.refillMode,'task-micro-fanin-repository-dispatch-with-hourly-safety-net');
  assert.equal(runtime.continuous.slotRefillTrigger,'vibe2-neuron-complete');
  assert.equal(runtime.continuous.perWorkerCompletionSignalEnabled,true);
  assert.equal(runtime.continuous.perWorkerSlotRefillEnabled,false);
  assert.equal(runtime.continuous.fanInRefillTrigger,'repository-dispatch-fallback');
  assert.equal(runtime.continuous.slotRefillWorkerDirectControlWrite,false);
  assert.equal(runtime.continuous.slotRefillSourceLocksHeldUntilFanIn,true);
  assert(reserveBlock.includes("if [ \"$callback_kind\" = 'fanin' ]; then"));
  assert.equal(reserveBlock.includes("if [ \"$callback_kind\" = 'fanin' ] || [ \"$callback_kind\" = 'neuron' ]; then"),false);
  assert.equal(reserveBlock.includes('VIBE2_NEURON_REFILL_PLANNER_SYNC=PASS'),false);
  assert(reserveBlock.includes('VIBE2_NEURON_REFILL_DISPATCH=SKIPPED_PENDING_VARIANTS'));
  assert(reserveBlock.includes('VIBE2_NEURON_REFILL_DISPATCH=TASK_MICRO_FANIN_COMPLETE'));
  assert(reserveBlock.indexOf('VIBE2_ATOMIC_NEURON_MICRO_FANIN=TASK_MICRO_FANIN_COMPLETE') < reserveBlock.indexOf("event_type:'vibe2-fanin-refill'"));
});

test('24H safety-net refills free game slots while preserving queue-level conflict protection',()=>{
  assert(safetyNetWorkflow.includes('wave_ready: ${{ steps.queue_state.outputs.wave_ready }}'));
  assert(safetyNetWorkflow.includes('game_refill_ready: ${{ steps.queue_state.outputs.game_refill_ready }}'));
  assert(safetyNetWorkflow.includes('free_worker_slots: ${{ steps.queue_state.outputs.free_worker_slots }}'));
  assert(safetyNetWorkflow.includes('active_worker_reservations: ${{ steps.queue_state.outputs.active_worker_reservations }}'));
  assert(safetyNetWorkflow.includes('VIBE2_24H_ACTIVE_GAME_WORKER_RESERVATIONS='));
  assert(safetyNetWorkflow.includes('VIBE2_24H_FREE_GAME_WORKER_SLOTS='));
  assert(safetyNetWorkflow.includes('VIBE2_24H_GAME_REFILL_READY='));
  assert(safetyNetWorkflow.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '20'"));
  assert(safetyNetWorkflow.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '20'"));
  assert(safetyNetWorkflow.includes('const controlTarget=Math.max(adaptiveMin,Number(control.currentMax||baselineTarget));'));
  assert(safetyNetWorkflow.includes('const effectiveMax=Math.max(adaptiveMin,Math.min(configuredMax,controlTarget));'));
  assert(safetyNetWorkflow.includes("lane_max: '256'"));
  assert.equal(safetyNetWorkflow.includes("lane_max: '20'"),false);
  assert(safetyNetWorkflow.includes("needs.plan.outputs.game_refill_ready == 'YES' && needs.plan.outputs.game_primary_queued != '0'"));
  assert(safetyNetWorkflow.includes("needs.plan.outputs.game_primary_queued == '0' && needs.plan.outputs.learning_idle_queued != '0'"));
  assert(safetyNetWorkflow.includes('needs: [plan, recovery_fast, continuous, learning_idle, game_study]'));
  assert(safetyNetWorkflow.includes('if: ${{ always() }}'));
  assert(safetyNetWorkflow.includes('name: Dispatch next cycle unconditionally'));
  assert(safetyNetWorkflow.includes('VIBE2_24H_REFILL=DISPATCHED'));
  assert(workflow.includes('VIBE2_ACTIVE_LANE_RESERVATIONS_BEFORE_RESERVE='));
  assert(workflow.includes('VIBE2_RESERVE_MODE=FREE_SLOT_REFILL_DURING_ACTIVE_WORK'));
  assert(!workflow.includes('VIBE2_RESERVE_GUARD=ACTIVE_WAVE_PRESENT'));
  assert(!workflow.includes("guard:'ACTIVE_LANE_RESERVATION_PRESENT'"));
  assert(workflow.includes('vibe2-queue-control.mjs reserve-batch'));
});

test('free-slot refill keeps learning-idle and game-study gated by an actually idle game wave',()=>{
  assert(safetyNetWorkflow.includes("const waveReady=activeGame===0?'YES':'NO'"));
  assert(safetyNetWorkflow.includes("const gameRefillReady=freeWorkerSlots>0?'YES':'NO'"));
  assert(safetyNetWorkflow.includes("needs.plan.outputs.wave_ready == 'YES' && needs.plan.outputs.game_primary_queued == '0' && needs.plan.outputs.learning_idle_queued != '0'"));
  assert(safetyNetWorkflow.includes("needs.plan.outputs.wave_ready == 'YES' && needs.plan.outputs.game_primary_queued == '0' && needs.plan.outputs.learning_idle_queued == '0'"));
});

test('24H cycle and plan never starve behind shared control-state concurrency',()=>{
  assert(safetyNetWorkflow.includes('group: vibe2-24h-cycle-${{ github.run_id }}'));
  assert(!safetyNetWorkflow.includes('group: vibe2-24h-cycle-main'));
  const planStart=safetyNetWorkflow.indexOf('  plan:');
  const recoveryStart=safetyNetWorkflow.indexOf('  recovery_fast:');
  assert(planStart>=0 && recoveryStart>planStart);
  const planBlock=safetyNetWorkflow.slice(planStart,recoveryStart);
  assert(!planBlock.includes('group: vibe2-control-state-vibe2-unreal-core'));
  assert(planBlock.includes('VIBE2_AUTOPLAN_ATTEMPT=$attempt/5'));
  assert(planBlock.includes('git reset --hard origin/vibe2-unreal-core'));
  assert(planBlock.includes('if git push origin HEAD:vibe2-unreal-core; then'));
  const gameStudyStart=safetyNetWorkflow.indexOf('  game_study:');
  const refillStart=safetyNetWorkflow.indexOf('  refill:');
  assert(gameStudyStart>=0 && refillStart>gameStudyStart);
  assert(safetyNetWorkflow.slice(gameStudyStart,refillStart).includes('needs: [plan, continuous, learning_idle]'));
});

test('continuous core and 24H runner isolate game-primary and learning-idle execution lanes',()=>{
  assert(workflow.includes('execution_lane:'));
  assert(workflow.includes("VIBE2_EXECUTION_LANE: ${{ inputs.execution_lane || github.event.client_payload.execution_lane || 'game-primary' }}"));
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

test('worker never mutates shared queue state and only emits an atomic completion event',()=>{
  const start=workflow.indexOf('  worker:');
  const end=workflow.indexOf('  fan_in:');
  assert(start>=0 && end>start);
  const workerPart=workflow.slice(start,end);
  assert(!workerPart.includes('vibe2-queue-control.mjs release-slot'));
  assert(!workerPart.includes('git push origin HEAD:vibe2-unreal-core'));
  assert(!workerPart.includes('HEAD:refs/heads/vibe2/refill/'));
  assert(workerPart.includes('"https://api.github.com/repos/${GITHUB_REPOSITORY}/dispatches"'));
  assert(!workerPart.includes("event_type:'vibe2-slot-refill'"));
  assert(workerPart.includes("event_type:'vibe2-neuron-complete'"));
  assert(workerPart.includes('VIBE2_ATOMIC_NEURON_COMPLETION_DISPATCH=PASS'));
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
  assert.equal(pass.codingTraces.length,1);
  assert.equal(pass.codingTraces[0].verification.fullRegressionPass,true);
  assert.equal(pass.codingTraces[0].verification.reviewPass,true);

  const stale=structuredClone(valid);
  stale.candidateIdentity.sourceRoot='web-games/other-game';
  const blocked=finalizeVibe2FanInReview({queue:{tasks:[baseTask]},results:[stale]});
  assert.equal(blocked.pass,false);
  assert.equal(blocked.releaseCandidates.length,0);
  assert.ok(blocked.reviewed[0].missing.includes('candidate-identity-source-root'));
  assert.ok(blocked.queue.tasks[0].evidence.includes('role-result:review:BLOCKED'));
  assert.equal(blocked.codingTraces[0].verification.fullRegressionPass,false);
  assert.equal(blocked.codingTraces[0].verification.reviewPass,false);
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
  assert.equal(approved.experienceReviews.length,2);
  const supervisedReview=approved.experienceReviews.find(row=>row.taskType==='supervised-web-coauthoring');
  const capabilityReview=approved.experienceReviews.find(row=>row.taskType==='coding-capability-distillation');
  assert.equal(supervisedReview?.outcome,'PASS');
  assert.ok(supervisedReview?.reusablePatterns.includes('기존 세이브와 핵심 루프를 고정한 뒤 책임 함수만 구현'));
  assert.equal(capabilityReview?.outcome,'PASS');
  assert.equal(capabilityReview?.engineQaVerified,true);
});

test('fan-in blocks release when only durable supervised evidence survives queue normalization',()=>{
  const branch='vibe2/candidate/supervised-evidence-only/primary';
  const task={
    id:'supervised-evidence-only',gameId:'supervised-evidence-only',target:'web',sourceRoot:'web-games/supervised-evidence-only',
    status:'running',blocker:'candidate-awaiting-qa-and-deployment',supervisionApproved:false,
    evidence:[
      'supervised-web-build:required',branch,
      'role-result:exploration:PASS','role-result:implementation:PASS','role-result:test:PASS','role-result:performance:PASS'
    ]
  };
  const valid={
    version:9,taskId:task.id,outcome:'PASS',candidateBranch:branch,baseMainSha:'abc123',
    candidateIdentity:{taskId:task.id,gameId:task.gameId,target:'web',sourceRoot:task.sourceRoot,baseMainSha:'abc123',manifestPath:'.vibe2/candidates/supervised-evidence-only/manifest.json'},
    evidence:[branch]
  };
  const result=finalizeVibe2FanInReview({queue:{tasks:[task]},results:[valid]});
  assert.equal(result.pass,true);
  assert.equal(result.releaseCandidates.length,0);
  assert.equal(result.reviewed[0].releaseBlocked,true);
  assert.equal(result.reviewed[0].releaseBlocker,'SUPERVISED_APPROVAL_REQUIRED');
  assert.equal(result.queue.tasks[0].blocker,'candidate-awaiting-supervised-review');
});
test('fan-in review persists neural shadow versus wave audit without authority',()=>{
  const source=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(source,/buildNeuralShadowAudit/);
  assert.match(source,/neuralShadowAudit/);
  assert.match(source,/version:7,role:'review'/);
  assert.match(source,/phase2AuthorityReady:false|buildNeuralShadowAudit/);
});

test('fan-in review exposes Phase2 readiness only as an explicit review gate',()=>{
  const source=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(source,/evaluatePhase2Readiness/);
  assert.match(source,/neuralPhase2Readiness/);
  const readiness=fs.readFileSync('tools/vibe2-neural-phase2-readiness.mjs','utf8');
  assert.match(readiness,/phase2AuthorityReady:false/);
  assert.match(readiness,/executionAuthorityGranted:false/);
  assert.match(readiness,/automaticPromotionAllowed:false/);
  assert.match(readiness,/explicitCentralPolicyPromotionRequired:true/);
});

test('fan-in review transports phase 4 benchmark evidence into the existing experience batch',()=>{
  const source=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(source,/buildCapabilityBenchmarkReviews/);
  assert.match(source,/capabilityBenchmarkReviews/);
  const experience=fs.readFileSync('tools/vibe2-experience-control.mjs','utf8');
  assert.match(experience,/applyCapabilityBenchmarkReviews/);
  assert.match(experience,/capabilityBenchmarkReviews/);
  assert.match(experience,/VIBE2_CAPABILITY_BENCHMARK_APPLIED/);
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
  assert(resultStep.includes('version:14'));
  assert(resultStep.includes('workLock'));
  assert(resultStep.includes('phase4BenchmarkVerification'));
  assert(resultStep.includes('knowledgeApplication'));
  assert(resultStep.includes('neuralDiagnosis'));
});

test('phase 4 passive benchmark reuses existing tournament workers without queue authority expansion',()=>{
  const runner=fs.readFileSync('tools/vibe2-continuous-runner.mjs','utf8');
  assert.match(runner,/buildPassiveCapabilityBenchmarkContract/);
  assert.match(runner,/phase4BenchmarkVerification/);
  assert.match(runner,/fixedCandidateStrategy/);
  const capability=fs.readFileSync('tools/vibe2-capability-distillation.mjs','utf8');
  assert.match(capability,/PHASE4_FIXED_CONTEXT_CONTROLLED_AB/);
  assert.match(runner,/workerCreationRequired:false|phase4BenchmarkVerification/);
  const sourceWorker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(sourceWorker,/explorationOrder=order\?\.phase4BenchmarkVerification\?\.active===true/);
  assert.match(sourceWorker,/goal:clean\(order\.originalGoal\)\|\|clean\(order\.goal\)/);
  const fanIn=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(fanIn,/buildPairedCapabilityBenchmarkReviews/);
  assert.match(fanIn,/selectedResultByTaskId/);
});

test('continuous worker transports causal replay prepatch reproduction evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/VIBE2_CAUSAL_REPLAY_PREPATCH_REPRODUCED/);
  assert.match(workflow,/causal_replay_prepatch_reproduced=/);
  assert.match(workflow,/IQA_CAUSAL_REPLAY_PREPATCH_REPRODUCED:/);
  assert.match(workflow,/causal-replay-prepatch-reproduced:/);
});

test('continuous worker captures incremental QA failure signature before failed step exits',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const start=workflow.indexOf('- name: Run impact-first incremental QA role');
  const end=workflow.indexOf('- name: Run read-only performance sanity role',start);
  const block=workflow.slice(start,end);
  assert.match(block,/qa_rc=\$\{PIPESTATUS\[0\]\}/);
  assert.match(block,/VIBE2_INCREMENTAL_QA_FAILURE_SIGNATURE/);
  assert.match(block,/failure_signature=\$failure_signature/);
  assert.match(workflow,/IQA_FAILURE_SIGNATURE:/);
  assert.match(workflow,/incremental-qa-failure-signature:/);
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


test('continuous worker runs Web practice artifacts and returns improvement evidence without production promotion',()=>{
  assert.match(workflow,/Run isolated learning practice/);
  assert.match(workflow,/learning-web-artifact/);
  assert.match(workflow,/Upload ephemeral Web practice artifact/);
  assert.match(workflow,/practice-artifact-score:/);
  assert.match(workflow,/practice-artifact-improved:/);
  assert.match(workflow,/practice-next-signal:/);
  assert.match(workflow,/practiceArtifact/);
  assert.match(workflow,/VIBE2_PRACTICE_PRODUCTION_PASS=NO/);
  assert.match(workflow,/VIBE2_PRACTICE_CANONICAL_CANDIDATE_PERSISTED=NO/);
});


test('continuous core connects existing evidence reasoning into self-generated signal cycles without stopping the lane',()=>{
  assert.match(workflow,/github\.event\.client_payload\.execution_lane/);
  assert.match(workflow,/tools\/vibe2-learning-motor\.mjs/);
  assert.match(workflow,/VIBE2_SELF_SIGNAL_MESH=PASS/);
  assert.match(workflow,/VIBE2_SELF_SIGNAL_AFTER_FANIN=PASS:/);
  assert.match(workflow,/--state="\$control_root\/\.vibe2\/learning-motor-state\.json"/);
  assert.match(workflow,/--queue="\$control_root\/\.vibe2\/queue\.json"/);
  assert.match(workflow,/\.vibe2\/benchmark-ladder\.json/);
  assert.match(workflow,/\.vibe2\/idle-practice-queue\.json/);
  assert.match(workflow,/\.vibe2\/web-roblox-handoffs\.json/);
  assert.match(workflow,/execution_lane:process\.env\.VIBE2_EXECUTION_LANE/);
  assert.doesNotMatch(workflow,/if \[ "\$VIBE2_EXECUTION_LANE" = 'game-primary' \] && \[ "\$\{continue_required:-NO\}" = 'YES' \]/);
  assert.equal(roadmap.developmentLifecycleMachine?.selfRecoveryAndBottleneckRelief?.automaticGateRepairLoop?.brainLiveness,'NEVER_GLOBAL_STOP; SENSOR_CAUSAL_DIAGNOSIS_RECOVERY_AND_REPLAN_CONTINUE');
  assert.equal(roadmap.developmentLifecycleMachine?.selfRecoveryAndBottleneckRelief?.automaticGateRepairLoop?.passMeaning,'VERIFIED_CHECKPOINT_THEN_NEXT_CANONICAL_CAUSAL_EVENT');
});
