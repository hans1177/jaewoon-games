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

const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
const safetyNetWorkflow=fs.readFileSync(new URL('../.github/workflows/vibe2-24h-runner.yml',import.meta.url),'utf8');
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
  assert(workflow.includes('matrix: ${{ fromJSON(needs.reserve.outputs.worker_matrix) }}'));
  assert(workflow.includes('group: vibe2-control-state-vibe2-unreal-core'));
  assert(workflow.includes('VIBE2_HIERARCHICAL_FAN_OUT'));
  assert(workflow.includes('VIBE2_HIERARCHICAL_FAN_IN=PASS'));
  assert(workflow.includes('for(let i=1;i<variantCount;i++)workers.push'));
  assert(workflow.includes("variant:\`speculative-\${i}\`"));
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
  assert(workflow.includes('git fetch --depth=1 origin main:refs/remotes/origin/main --quiet'));
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

test('one Vibe2 wave uses the same reserved main contract for exploration worker and fan-in',()=>{
  assert(workflow.includes('Checkout pinned main contract'));
  assert(workflow.includes('--project-lifecycle="$GITHUB_WORKSPACE/.vibe2/web-roblox-handoffs.json"'));
  assert(workflow.includes('Explore pinned main contract read-only'));
  assert(workflow.includes('Generate isolated candidate from pinned main contract'));
  assert(workflow.includes('node "$contract_root/tools/vibe2-queue-control.mjs" fan-in'));
  assert(workflow.includes('(cd "$contract_root" && node --test --test-concurrency=4'));
  assert(workflow.includes('Regression runs once at fan-in against the exact reserved main contract.'));
  assert.match(continuousRunnerSource,/projectLifecycleFile=''/);
  assert.match(continuousRunnerSource,/projectLifecycleFile:clean\(args\['project-lifecycle'\]\)/);
});

test('controller runs content-hash incremental QA per worker and one parallel full regression at fan-in',()=>{
  assert(workflow.includes('actions/cache@v4'));
  assert(workflow.includes('tools/vibe2-incremental-qa.mjs'));
  assert(workflow.includes('incremental-qa-hash:'));
  assert(workflow.includes('Merge outcomes run regression and package review'));
  assert(workflow.includes('Per-candidate test/performance roles already ran. Regression runs once at fan-in against the exact reserved main contract.'));
  assert(workflow.includes('node --test --test-concurrency=4'));
  assert(workflow.includes('qa/vibe2-controller-contract.test.mjs'));
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
  assert(preflight.includes('contract_sha="$(git rev-parse origin/main)"'));
  assert(preflight.includes('git worktree add --detach /tmp/vibe2-main "$contract_sha"'));
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

test('worker completion uses repository dispatch to refill slots before batch fan-in',()=>{
  assert(workflow.includes('repository_dispatch:'));
  assert(workflow.includes('types: [vibe2-slot-refill, vibe2-fanin-refill]'));
  assert(workflow.includes("- 'vibe2/refill/**'"));
  assert(workflow.includes('release-slot'));
  assert(workflow.includes('slot-released-awaiting-fan-in'));
  assert(workflow.includes('Signal immediate slot refill after single-variant worker completion'));
  assert(workflow.includes("event_type:'vibe2-slot-refill'"));
  assert(workflow.includes('VIBE2_EARLY_SLOT_REFILL_SIGNAL=REPOSITORY_DISPATCH'));
  assert(workflow.includes('earlyRefill'));
  assert.equal(runtime.continuous.refillRef,'vibe2-unreal-core');
  assert.equal(runtime.continuous.refillMode,'per-worker-repository-dispatch-with-fan-in-fallback');
  assert.equal(runtime.continuous.slotRefillTrigger,'repository-dispatch');
  assert.equal(runtime.continuous.legacySlotRefillBranchCompatibility,true);
  assert.equal(runtime.continuous.slotRefillSingleVariantOnly,true);
  assert.equal(runtime.continuous.slotRefillWorkerDirectControlWrite,false);
  assert.equal(runtime.continuous.slotRefillSourceLocksHeldUntilFanIn,true);
});

test('24H cycle serialization does not reuse the control-state lock',()=>{
  assert(safetyNetWorkflow.includes('concurrency:\n  group: vibe2-24h-cycle-main\n  cancel-in-progress: false'));
  assert(!safetyNetWorkflow.includes('concurrency:\n  group: vibe2-control-state-vibe2-unreal-core\n  cancel-in-progress: false\n\njobs:'));
  const gameStudyStart=safetyNetWorkflow.indexOf('  game_study:');
  const refillStart=safetyNetWorkflow.indexOf('  refill:');
  assert(gameStudyStart>=0 && refillStart>gameStudyStart);
  assert(safetyNetWorkflow.slice(gameStudyStart,refillStart).includes('needs: [plan, continuous]'));
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

test('worker never writes queue or parallelism state directly during early refill signaling',()=>{
  const start=workflow.indexOf('  worker:');
  const end=workflow.indexOf('  fan_in:');
  assert(start>=0 && end>start);
  const workerPart=workflow.slice(start,end);
  assert(!workerPart.includes('vibe2-queue-control.mjs release-slot'));
  assert(!workerPart.includes('git push origin HEAD:vibe2-unreal-core'));
  assert(!workerPart.includes('HEAD:refs/heads/vibe2/refill/'));
  assert(workerPart.includes('"https://api.github.com/repos/${GITHUB_REPOSITORY}/dispatches"'));
  assert(workerPart.includes("event_type:'vibe2-slot-refill'"));
});

test('worker Ollama cache includes the runtime sidecar and rejects binary-only cache hits',()=>{
  assert(workflow.includes('~/.cache/vibe2-ollama/lib/ollama'));
  assert(workflow.includes('vibe2-ollama-v3-Linux-qwen3-1.7b'));
  assert(workflow.includes("find \"$cached_lib\" -type f -name 'llama-server'"));
  assert(workflow.includes('sudo cp -a "$cached_lib/." /usr/local/lib/ollama/'));
  assert(!workflow.includes('key: vibe2-ollama-v2-Linux-qwen3-1.7b'));
});

test('worker result keeps throughput and actual workload telemetry inputs in the immutable result step',()=>{
  const start=workflow.indexOf('- name: Build immutable worker result');
  const end=workflow.indexOf('- name: Upload worker result for fan-in');
  assert(start>=0 && end>start);
  const resultStep=workflow.slice(start,end);
  for(const key of ['RESERVED_AT:','REQUESTED_MAX:','EFFECTIVE_MAX:','WORKER_STARTED_AT_FILE:','CHECKOUT_MS:','MODEL_PREP_MS:','CANDIDATE_MS:','QA_MS:','CHANGED_FILE_COUNT:','ADDED_LINE_COUNT:','DELETED_LINE_COUNT:']) {
    assert(resultStep.includes(key),`missing result telemetry env ${key}`);
  }
  assert(workflow.includes('git diff --cached --numstat -- "$SOURCE_ROOT"'));
  assert(workflow.includes('JSON.stringify({version:3,results,tasks:queue.tasks||[]}'));
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
  assert.equal(runtime.workPackages.sharedPreparation,true);
  assert.equal(runtime.workPackages.longWorkSlotProtection,true);
  assert.equal(runtime.workPackages.workloadTelemetry.enabled,true);
  for(const metric of ['completedFeaturePackageCount','actualChangedFileCount','actualChangedLineCount','historicalReworkRatePct','historicalQaDuplicateRatePct','averagePackageCycleTimeMs']) {
    assert(runtime.workPackages.workloadTelemetry.metrics.includes(metric),`missing work package metric ${metric}`);
  }
  assert.equal(runtime.workPackages.efficiencyAdaptation.lowEfficiencyStreakThreshold,2);
  assert.equal(runtime.workPackages.efficiencyAdaptation.neverReduceSafetyOrQa,true);
});
