// 파일명: tools/vibe2-continuous-runner.mjs
// 역할: Vibe2 병렬 큐에서 예약된 작업별 안전 작업주문을 생성한다.
// 원칙: 사용자 지시 > 출시확정 > 개발확정, DAG/source lock 예약 후 격리 후보 브랜치만 수정, 검증 전 main 반영 금지.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planVibeCoreTask } from '../assets/vibe-core-runtime.js';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';
import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';
import { generateVibe2Handoff } from './vibe2-handoff.mjs';
import { buildVibeDesignIntelligence } from './vibe2-design-intelligence.mjs';
import { retrieveUnifiedLearning, learningGuidance as buildMotorGuidance, candidateTournamentPolicy } from './vibe2-learning-motor.mjs';
import { buildVibeAssetProductionPlan, assetProductionGuidance } from './vibe2-asset-production-plan.mjs';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/');
const freeze = (value) => Object.freeze(value);
const freezeList = (values = []) => freeze([...new Set((values || []).map(clean).filter(Boolean))]);
const EDITOR_BINARY_EXTENSIONS = new Set(['.rbxl', '.rbxlx', '.uasset', '.umap', '.controller', '.anim', '.avatar']);
const AUTO_DEPLOY_STATES = new Set(['release-confirmed', 'development-confirmed']);

function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function writableTargetAllowed(runtime, target) {
  const allowed = Array.isArray(runtime?.safety?.allowedWritableTargets) ? runtime.safety.allowedWritableTargets.map((value) => clean(value).toLowerCase()) : ['roblox', 'web', 'unity', 'unreal', 'godot'];
  const resolved = clean(target).toLowerCase();
  if (resolved === 'web' && runtime?.safety?.existingWebMaintenanceAllowed !== true) return false;
  return allowed.includes(resolved);
}
function taskRequiresWrite(task) { return !['inspect', 'research', 'qa'].includes(clean(task?.type).toLowerCase()); }
function normalizeResponsibleFile(task) {
  const files = Array.isArray(task?.responsibleFiles) ? task.responsibleFiles.map(posix).filter(Boolean) : [];
  return files[0] || null;
}
function requestMentionsEditorOnlyCapability(target, request) {
  const text = clean(request).toLowerCase();
  if (target === 'roblox') return ['studio place','place package','.rbxl','.rbxlx','terrain editor','ro블록스 스튜디오','로블록스 스튜디오'].some((word) => text.includes(word));
  if (target === 'unreal') return ['blueprint','블루프린트','animation blueprint','anim blueprint','애님 블루프린트','montage','몽타주','blend space','블렌드 스페이스','control rig','컨트롤 릭','ik retargeter','리타게터','ik rig'].some((word) => text.includes(word));
  if (target === 'unity') return ['animator controller','애니메이터 컨트롤러','animationclip asset','animation clip asset','애니메이션 클립 에셋','avatar asset'].some((word) => text.includes(word));
  return false;
}
function responsibleFilesRequireEditor(task) { return (task?.responsibleFiles || []).some((file) => EDITOR_BINARY_EXTENSIONS.has(path.extname(posix(file)).toLowerCase())); }
function buildLearningGuidance(learning = {}) {
  const records = Array.isArray(learning?.records) ? learning.records.slice(0, 5) : [];
  if (!records.length) return '';
  const lines = ['[VERIFIED EXPERIENCE MEMORY - advisory only]','다음 기록은 검증된 과거 경험이다. 관련될 때만 패치 전략/회피 패턴으로 참고하고 승인 권한, 보호 규칙, 게임 수치를 자동 변경하지 않는다.'];
  for (const record of records) {
    const parts = [
      `경험 ${clean(record.id)}`, `결과=${clean(record.outcome)}`,
      clean(record.problem) ? `문제=${clean(record.problem).slice(0, 240)}` : '',
      clean(record.change) ? `검증변경=${clean(record.change).slice(0, 240)}` : '',
      clean(record.failureCause) ? `검증실패원인=${clean(record.failureCause).slice(0, 240)}` : '',
      (record.reusablePatterns || []).length ? `재사용=${record.reusablePatterns.join(' | ').slice(0, 300)}` : '',
      (record.avoidPatterns || []).length ? `회피=${record.avoidPatterns.join(' | ').slice(0, 300)}` : ''
    ].filter(Boolean);
    lines.push(`- ${parts.join('; ')}`);
  }
  return lines.join('\n');
}
function reusableContextsForTask(handoff = {}, task = {}) {
  const contexts = Array.isArray(handoff?.workState?.reusableContexts) ? handoff.workState.reusableContexts : [];
  const packageId = clean(task.packageId);
  return contexts.filter((row) => clean(row.taskId) === clean(task.id) || (packageId && clean(row.packageId) === packageId)).slice(-8);
}
function buildReusableHandoffGuidance(contexts = []) {
  if (!contexts.length) return '';
  const lines = ['[REUSABLE MACHINE HANDOFF - do not rediscover already known facts]'];
  for (const row of contexts) {
    const parts = [
      `task=${clean(row.taskId)}`,
      clean(row.packageId) ? `package=${clean(row.packageId)}` : '',
      (row.responsibleFiles || []).length ? `files=${row.responsibleFiles.join(',')}` : '',
      (row.reusableEvidence || []).length ? `evidence=${row.reusableEvidence.join(' | ')}` : '',
      clean(row.blocker) ? `lastBlocker=${clean(row.blocker)}` : '',
      clean(row.lastOutcome) ? `lastOutcome=${clean(row.lastOutcome)}` : ''
    ].filter(Boolean);
    lines.push(`- ${parts.join('; ')}`);
  }
  return lines.join('\n');
}
export function classifyVibeExecutionRoute({ target = '', task = {}, adapter = {} } = {}) {
  const normalizedTarget = clean(target).toLowerCase();
  if (!taskRequiresWrite(task)) return freeze({ route: 'analysis-only', requiresEditor: false, reason: 'non-write-task' });
  const binary = responsibleFilesRequireEditor(task);
  const requested = requestMentionsEditorOnlyCapability(normalizedTarget, task.goal);
  if (binary || requested) return freeze({ route:'engine-editor', requiresEditor:true, reason:binary?'responsible-binary-asset':'editor-only-capability-requested', editorRuntime:adapter?.execution?.editorRuntime || null, directBinaryTextEditForbidden:true });
  return freeze({ route:'text-source-worker', requiresEditor:false, reason:'text-source-capability' });
}
function resolveTask(queue, taskId = '') {
  const id = clean(taskId);
  if (id) {
    const task = queue.tasks.find((row) => row.id === id);
    if (!task) return { task:null, reason:'TASK_NOT_FOUND' };
    if (!['queued','running'].includes(task.status)) return { task:null, reason:`TASK_NOT_RUNNABLE:${task.status}` };
    if (task.status === 'queued') {
      const selection = selectVibeQueueBatch(queue);
      if (!selection.selected.some((row) => row.id === id)) return { task:null, reason:`TASK_NOT_RESERVED_OR_ELIGIBLE:${selection.stopReason || 'conflict'}` };
    }
    return { task, reason:null };
  }
  const selection = selectVibeQueueBatch(queue);
  return { task:selection.selected[0] || null, reason:selection.stopReason || 'NO_ELIGIBLE_WORK' };
}
export function deriveVibeCompletionCriteria(task = {}, target = '') {
  const explicit = freezeList(task?.completionCriteria || []);
  if (explicit.length) return explicit;
  if (clean(task?.type).toLowerCase() !== 'implementation') return explicit;
  const goal = clean(task?.goal);
  if (!goal) return explicit;
  const criteria = [];
  const add = (value) => { if (value && !criteria.includes(value)) criteria.push(value); };
  if (clean(target || task.target).toLowerCase() === 'web') {
    add('PLAYER_FACING_RUNTIME_CHANGE_REQUIRED');
    add('METADATA_CONFIG_COMMENT_ONLY_CHANGE_NOT_COMPLETION');
  }
  if (/FULL_WEB_GAME_REBUILD|전면\s*재구현|실제\s*플레이\s*가능|playable/i.test(goal)) add('PLAYABLE_LOOP_END_TO_END');
  if (/모바일|터치|touch|mobile|직접\s*조작|player\s*input/i.test(goal)) add('DIRECT_PLAYER_INPUT_WORKS');
  if (/승패|승리|패배|성공|실패|win|lose|victory|defeat|restart|재시작/i.test(goal)) add('TERMINAL_OUTCOME_AND_RESTART_WORK');
  if (/\bAI\b|적\s*진영|적\s*시야|추격|상대\s*AI|enemy|opponent|chase/i.test(goal)) add('AI_OR_ENEMY_BEHAVIOR_IS_PLAYABLE');
  if (/저장|세이브|save|persist|migration|마이그레이션/i.test(goal)) add('SAVE_MEANING_PRESERVED_OR_EXPLICITLY_MIGRATED');
  if (/런타임|성능|performance|runtime|안정/i.test(goal)) add('RUNTIME_STABILITY_AND_PERFORMANCE_SANITY');
  if (/웨이브|배치|방어|투사체|업그레이드|wave|placement|defen[cs]e|projectile|upgrade/i.test(goal)) add('DEFENSE_WAVE_PLACEMENT_OR_UPGRADE_LOOP_WORKS');
  if (/영토|점령|확장|거점|전황|territory|capture|base\s*conflict/i.test(goal)) add('TERRITORY_CAPTURE_AND_CONFLICT_LOOP_WORKS');
  if (/잠입|알\s*획득|훔치|탈출|시야|stealth|heist|escape/i.test(goal)) add('STEALTH_ACQUIRE_RISK_ESCAPE_LOOP_WORKS');
  if (/체스|합법\s*수|턴\s*진행|말과\s*이동|chess|legal\s*move|turn/i.test(goal)) add('TURN_OR_LEGAL_MOVE_GAMEPLAY_WORKS');
  if (/진행|성장|자원|보상|경제|progress|progression|resource|reward|economy/i.test(goal)) add('PROGRESSION_OR_RESOURCE_LOOP_ADVANCES');
  return freezeList(criteria);
}

function completionCriteriaGuidance(criteria = []) {
  const rows = freezeList(criteria);
  if (!rows.length) return '';
  return [
    '[EXECUTION COMPLETION CRITERIA - implementation target, not a release-gate bypass]',
    '이번 후보는 아래 구현 목표 중 실제 소스와 명시 작업 범위에 해당하는 항목을 플레이어가 체감 가능한 런타임 동작으로 진전시켜야 한다.',
    '메타데이터, 설명 필드, 주석, 설정 문자열만 바꾸는 수정은 PLAYER_FACING_RUNTIME_CHANGE_REQUIRED를 충족하지 않는다.',
    ...rows.map((row) => `- ${row}`)
  ].join('\n');
}

function incrementalQaPlan(task, target, responsibleFiles, speculativeVariants = 1) {
  const files = freezeList(responsibleFiles || []);
  return freeze({
    mode:'impact-first-content-hash',
    changedScope:files,
    cacheNamespace:`${clean(target)}:${clean(task.gameId) || 'global'}`,
    deterministicChecks:freezeList(['git-diff-check','conflict-marker-scan','text-sanity','js-syntax-when-applicable','json-parse-when-applicable']),
    fullRegressionAtFanIn:true,
    contentHashCache:true,
    speculativeVariants:Math.max(1,Math.min(5,Number(speculativeVariants)||1))
  });
}

export function buildVibeContinuousWorkOrder({ runtime = {}, queue = {}, experience = {}, handoff = null, taskId = '', learningMotorState = {}, codePatterns = {}, playbooks = {} } = {}) {
  const normalizedQueue = createVibeContinuousQueue(queue);
  const resolved = resolveTask(normalizedQueue, taskId);
  const base = {
    version:6, generatedAt:new Date().toISOString(), run:false, reason:null, mode:'vibe2-parallel-work-order',
    machineHandoff:freeze({ used:Boolean(handoff?.kind), kind:handoff?.kind || null, sourceOfTruth:handoff?.sourceOfTruth || null, consistency:handoff?.consistency || {ok:true,errors:[]}, currentPersistentMax:Number(handoff?.parallelism?.currentPersistentMax || runtime?.continuous?.maxConcurrentGameTasks || 20), lastDecision:handoff?.parallelism?.lastDecision || null, ownerDirectiveOpenCount:Number(handoff?.workState?.ownerDirectiveOpenCount || 0), reusableContextCount:Number(handoff?.workState?.reusableContexts?.length || 0) }),
    scheduler:freeze({ hierarchicalParallelism:true, dag:true, shardAware:true, workStealing:true, sourceRootLock:true, eventDriven:true, dynamicBackpressure:true, longWorkProtectedSlot:true, roleSeparated:true }),
    safety:freeze({
      directMainWrite:false,
      existingWebMaintenanceAllowed:runtime?.safety?.existingWebMaintenanceAllowed === true,
      newWebGameAutomatic:runtime?.safety?.newWebGameAutomatic === true,
      paidAIAllowed:runtime?.safety?.paidAIAllowed === true,
      paidRunnerAllowed:runtime?.safety?.paidRunnerAllowed === true,
      binaryAssetsDirectTextEditForbidden:true,
      sameFileParallelWrite:false
    })
  };
  if (handoff?.kind && handoff.consistency?.ok !== true) return freeze({ ...base, reason:`MACHINE_STATE_INCONSISTENT:${(handoff.consistency?.errors || []).join('|') || 'UNKNOWN'}` });
  if (runtime?.continuous?.enabled === false) return freeze({ ...base, reason:'CONTINUOUS_DISABLED' });
  if (!resolved.task) return freeze({ ...base, reason:resolved.reason || 'NO_ELIGIBLE_WORK' });
  const task = resolved.task;
  const requiresWrite = taskRequiresWrite(task);
  if (requiresWrite && !writableTargetAllowed(runtime, task.target)) return freeze({ ...base, reason:`WRITABLE_TARGET_FORBIDDEN:${task.target}`, selectedTask:task });

  const plan = planVibeCoreTask({
    request:task.goal, target:task.target, gameId:task.gameId, file:normalizeResponsibleFile(task),
    experienceMemory:createVibeExperienceMemory(experience), departments:task.department?[task.department]:[], ownerDirective:task.ownerDirective
  });
  const gateReasons = [...(plan.executionGate?.reasons || [])];
  const analysisOnlyRead = !requiresWrite && gateReasons.length === 1 && gateReasons[0] === 'source-read-only';
  const mayRun = plan.executionGate?.mayExecute === true || analysisOnlyRead;
  if (!mayRun) return freeze({ ...base, reason:`EXECUTION_GATE_BLOCKED:${gateReasons.join(',') || 'unknown'}`, selectedTask:task, gate:plan.executionGate });

  const designIntelligence = buildVibeDesignIntelligence({ task, plan, experience });
  if (requiresWrite && designIntelligence.implementationGate.allowed !== true) {
    return freeze({
      ...base,
      reason:`DESIGN_INTELLIGENCE_BLOCKED:${designIntelligence.implementationGate.blockers.join(',') || 'unknown'}`,
      selectedTask:task,
      gate:plan.executionGate,
      designIntelligence
    });
  }

  const adapter = plan.engineAdapter;
  const route = classifyVibeExecutionRoute({ target:plan.target, task, adapter });
  const maxWorkMinutes = Math.max(1, Math.min(60, Math.floor(Number(runtime?.continuous?.maxWorkMinutes) || 20)));
  const editorConfig = runtime?.engineEditors?.[plan.target] || {};
  const releaseState = clean(task.releaseState) || 'other';
  const automaticDeploymentEligible = AUTO_DEPLOY_STATES.has(releaseState) && ['roblox','web','unity'].includes(plan.target) && task.requiresOwnerDecision !== true && task.protectedChange !== true;
  const learningGuidance = buildLearningGuidance(plan.learning);
  const unifiedLearning = retrieveUnifiedLearning({
    task:{ ...task, target:plan.target, taskType:task.type },
    experienceInput:experience,
    codePatternsInput:codePatterns,
    playbooksInput:playbooks,
    masteryInput:learningMotorState
  });
  const unifiedLearningGuidance = buildMotorGuidance(unifiedLearning);
  const assetProduction = buildVibeAssetProductionPlan({ task, target:plan.target, repoRoot:process.cwd() });
  const assetGuidance = assetProductionGuidance(assetProduction);
  const tournament = candidateTournamentPolicy({ task:{...task,target:plan.target}, masteryInput:learningMotorState });
  const reusedContexts = reusableContextsForTask(handoff || {}, task);
  const reusedGuidance = buildReusableHandoffGuidance(reusedContexts);
  const derivedCompletionCriteria = deriveVibeCompletionCriteria(task, plan.target);
  const workPackage=freeze({
    id:clean(task.packageId)||null,
    goal:clean(task.packageGoal)||null,
    role:clean(task.packageRole)||null,
    owner:clean(task.packageOwner)||null,
    taskWorkUnits:Number(task.taskWorkUnits||0),
    packageWorkUnits:Number(task.packageWorkUnits||0),
    packageSize:Number(task.packageSize||0),
    longWorkProtected:task.packageLongWorkProtected===true,
    sharedContext:task.packageContext||null,
    completionCriteria:derivedCompletionCriteria,
    rolePlan:freeze({
      exploration:'read-only-exploration-worker',
      implementation:'source-worker-exclusive-write',
      test:'incremental-qa-worker-read-only',
      performance:'performance-sanity-worker-read-only',
      regression:'single-fan-in-regression-worker-read-only',
      review:'fan-in-package-review-worker-read-only'
    })
  });
  const packageGuidance=workPackage.id?[
    `[WORK PACKAGE ${workPackage.id}]`,
    workPackage.goal||'',
    `역할=${workPackage.role||'implementation'}; taskWorkUnits=${workPackage.taskWorkUnits}; packageWorkUnits=${workPackage.packageWorkUnits}`,
    workPackage.sharedContext?.responsibleFiles?.length?`공유 준비 범위=${workPackage.sharedContext.responsibleFiles.join(', ')}`:'',
    `역할 분리=${Object.entries(workPackage.rolePlan).map(([k,v])=>`${k}:${v}`).join(' | ')}`,
    workPackage.completionCriteria.length?`완료 기준=${workPackage.completionCriteria.join(' | ')}`:''
  ].filter(Boolean).join('\n'):'';
  const completionGuidance = completionCriteriaGuidance(derivedCompletionCriteria);
  const executionGoal = [packageGuidance, reusedGuidance, task.goal, completionGuidance, designIntelligence.guidance, learningGuidance, unifiedLearningGuidance, assetGuidance].filter(Boolean).join('\n\n');
  const responsibleFiles = freezeList(task.responsibleFiles || []);
  const qa = freezeList([
    ...(plan.qa || []),
    'design-intelligence-contract',
    'verified-learning-motor-contract',
    'asset-production-plan-contract',
    'asset-runtime-visual-qa-required',
    'exploration-handoff-required-before-implementation',
    'auto-player-evidence-after-implementation',
    'telemetry-evidence-after-implementation',
    'performance-sanity-after-implementation',
    'fan-in-regression-before-package-review',
    'design-review-before-experience-promotion'
  ]);

  return freeze({
    ...base, run:true, reason:'WORK_READY', selectedTask:task, taskId:task.id, gameId:task.gameId,
    target:plan.target, shard:task.shard, sourceRootLock:task.sourceRoot || adapter.source.root,
    workMode:route.route==='analysis-only'?'analysis-only':route.route==='engine-editor'?'engine-editor-task':'source-change-candidate',
    executionRoute:route.route, route, goal:executionGoal, originalGoal:task.goal, department:task.department, priority:task.priority, releaseState, maxWorkMinutes,
    source:freeze({
      root:adapter.source.root, writable:adapter.mayWriteSource, maintenanceOnly:adapter.source.maintenanceOnly === true,
      candidateFiles:freezeList(adapter.source.candidateFiles), textWritablePatterns:freezeList(adapter.source.textWritablePatterns || []),
      editorRequiredPatterns:freezeList(adapter.source.editorRequiredPatterns || []), ignoredPaths:freezeList(adapter.source.ignoredPaths), responsibleFiles
    }),
    qa, incrementalQa:incrementalQaPlan(task, plan.target, responsibleFiles, tournament.candidateCount),
    workPackage,
    completionCriteria:derivedCompletionCriteria,
    reusedMachineContext:freeze({used:reusedContexts.length>0,count:reusedContexts.length,contexts:freeze(reusedContexts)}),
    designIntelligence,
    unifiedLearning,
    assetProduction,
    candidateTournament:tournament,
    learning:plan.learning, learningAppliedToWorkerGoal:Boolean(learningGuidance||unifiedLearningGuidance), motion:plan.motion, executionGate:plan.executionGate,
    deployment:freeze({ automaticEligible:automaticDeploymentEligible, requiresVerifiedQA:true, requiresBuild:['roblox','unity'].includes(plan.target), promoteSourceRootOnly:true, mainDirectWriteByWorker:false, publicStoreReleaseAutomatic:false }),
    editor:freeze({ required:route.requiresEditor, runtime:route.editorRuntime || adapter?.execution?.editorRuntime || null, dispatchConfigured:route.route!=='engine-editor' || Boolean(clean(editorConfig.workflow)||clean(editorConfig.runnerLabel)), workflow:clean(editorConfig.workflow)||null, runnerLabel:clean(editorConfig.runnerLabel)||null }),
    workerPolicy:freeze({
      isolatedCandidateBranch:true, directMainWrite:false, verifiedCommitRequired:true, retryLimit:task.maxRetries,
      paidAIAllowed:false, paidRunnerAllowed:false, engineMustResolveGameplayResults:true, protectedGameplayMutationAutomatic:false,
      binaryAssetsDirectTextEditForbidden:true, textWorkerAllowed:route.route==='text-source-worker',
      vibeOwnsAssetProductionDecision:true,
      webDirectAssetAuthoringAllowed:plan.target==='web',
      companyAssetReuseCandidateOnly:true,
      authoringGeneratorRequestAllowed:true,
      authoringGeneratorRequestIsNotCompletion:true,
      explorationRequired:true, explorationWorker:'tools/vibe2-exploration-worker.mjs', explorationSourceWrite:false,
      roleSeparation:true, sameFileParallelWrite:false,
      speculativeParallelism:tournament.candidateCount>1, speculativeVariants:tournament.candidateCount
    })
  });
}

export function runVibeContinuousRunner({ runtimeFile='vibe2-runtime.json', queueFile='', controlFile='', experienceFile='', outputFile='', taskId='', learningMotorStateFile='', codePatternsFile='', playbooksFile='' } = {}) {
  const runtime = readJson(runtimeFile, {});
  const resolvedQueueFile = clean(queueFile) || clean(runtime?.sources?.queue) || '.vibe2/queue.json';
  const resolvedControlFile = clean(controlFile) || clean(runtime?.sources?.parallelism) || clean(runtime?.adaptiveBackpressure?.stateFile) || '.vibe2/parallelism-control.json';
  const resolvedExperienceFile = clean(experienceFile) || clean(runtime?.sources?.experience) || '.vibe2/experience.json';
  const resolvedOutputFile = clean(outputFile) || clean(runtime?.sources?.workOrder) || '.vibe2/work-order.json';
  const handoff = generateVibe2Handoff({ runtimeFile, queueFile:resolvedQueueFile, controlFile:resolvedControlFile, experienceFile:resolvedExperienceFile });
  const learningMotorState = readJson(clean(learningMotorStateFile)||'.vibe2/learning-motor-state.json', {});
  const codePatterns = readJson(clean(codePatternsFile)||'.vibe2/code-pattern-library.json', readJson('company-learning/vibe2-code-pattern-library.json',{patterns:[]}));
  const playbooks = readJson(clean(playbooksFile)||'company-learning/vibe3-task-playbooks.json', {taskTypes:{}});
  const order = buildVibeContinuousWorkOrder({ runtime, queue:readJson(resolvedQueueFile, { tasks:[] }), experience:readJson(resolvedExperienceFile, { records:[] }), handoff, taskId, learningMotorState, codePatterns, playbooks });
  writeJson(resolvedOutputFile, order);
  return order;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const order = runVibeContinuousRunner({
    runtimeFile:clean(args.runtime)||'vibe2-runtime.json', queueFile:clean(args.queue), controlFile:clean(args.control), experienceFile:clean(args.experience), outputFile:clean(args.output), taskId:clean(args['task-id']),
    learningMotorStateFile:clean(args['learning-motor-state']), codePatternsFile:clean(args['code-patterns']), playbooksFile:clean(args.playbooks)
  });
  console.log(`VIBE2_CONTINUOUS_RUN=${order.run?'YES':'NO'}`);
  console.log(`VIBE2_CONTINUOUS_REASON=${order.reason}`);
  console.log(`VIBE2_MACHINE_HANDOFF=${order.machineHandoff?.used?'USED':'NOT_USED'}`);
  console.log(`VIBE2_MACHINE_STATE=${order.machineHandoff?.consistency?.ok?'CONSISTENT':'INCONSISTENT'}`);
  console.log(`VIBE2_MACHINE_PERSISTENT_MAX=${order.machineHandoff?.currentPersistentMax||0}`);
  if (order.designIntelligence) {
    console.log(`VIBE2_DESIGN_INTELLIGENCE=ENABLED`);
    console.log(`VIBE2_DESIGN_IMPLEMENTATION_GATE=${order.designIntelligence.implementationGate.allowed?'PASS':'BLOCKED'}`);
  }
  if (order.run) {
    console.log(`VIBE2_TASK_ID=${order.taskId}`);
    console.log(`VIBE2_TARGET=${order.target}`);
    console.log(`VIBE2_SHARD=${order.shard}`);
    console.log(`VIBE2_RELEASE_STATE=${order.releaseState}`);
    console.log(`VIBE2_AUTO_DEPLOY_ELIGIBLE=${order.deployment.automaticEligible?'YES':'NO'}`);
    console.log(`VIBE2_EXECUTION_ROUTE=${order.executionRoute}`);
    console.log(`VIBE2_SOURCE_ROOT=${order.source.root}`);
    console.log(`VIBE2_INCREMENTAL_QA=YES`);
    console.log(`VIBE2_SPECULATIVE_VARIANTS=${order.incrementalQa.speculativeVariants}`);
    console.log(`VIBE2_CANDIDATE_TOURNAMENT_VARIANTS=${order.candidateTournament?.candidateCount||1}`);
    console.log(`VIBE2_UNIFIED_EXPERIENCE_COUNT=${order.unifiedLearning?.experience?.length||0}`);
    console.log(`VIBE2_SAME_GAME_EXPERIENCE_COUNT=${(order.unifiedLearning?.experience||[]).filter(x=>(x.reasons||[]).includes('same-game')).length}`);
    console.log(`VIBE2_VERIFIED_CODE_PATTERN_COUNT=${order.unifiedLearning?.codePatterns?.length||0}`);
    console.log(`VIBE2_ASSET_DECISION_COUNT=${order.assetProduction?.decisions?.length||0}`);
    console.log(`VIBE2_COMPLETION_CRITERIA_COUNT=${order.completionCriteria?.length||0}`);
    console.log(`VIBE2_EXPERIENCE_CONTEXT_APPLIED=${order.learningAppliedToWorkerGoal?'YES':'NO'}`);
    console.log(`VIBE2_REUSABLE_HANDOFF_CONTEXT=${order.reusedMachineContext?.used?'YES':'NO'}`);
    console.log(`VIBE2_ROLE_SEPARATION=${order.workerPolicy?.roleSeparation?'YES':'NO'}`);
  }
}
