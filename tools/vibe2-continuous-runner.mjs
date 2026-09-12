// 파일명: tools/vibe2-continuous-runner.mjs
// 역할: Vibe2 병렬 큐에서 예약된 작업별 안전 작업주문을 생성한다.
// 원칙: 사용자 지시 > 출시확정 > 개발확정, DAG/source lock 예약 후 격리 후보 브랜치만 수정, 검증 전 main 반영 금지.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planVibeCoreTask } from '../assets/vibe-core-runtime.js';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';
import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';

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
function incrementalQaPlan(task, target, responsibleFiles) {
  const files = freezeList(responsibleFiles || []);
  return freeze({
    mode:'impact-first-content-hash',
    changedScope:files,
    cacheNamespace:`${clean(target)}:${clean(task.gameId) || 'global'}`,
    deterministicChecks:freezeList(['git-diff-check','conflict-marker-scan','text-sanity','js-syntax-when-applicable','json-parse-when-applicable']),
    fullRegressionAtFanIn:true,
    contentHashCache:true,
    speculativeVariants:task.speculativeEligible && task.estimatedRisk === 'high' ? 2 : 1
  });
}

export function buildVibeContinuousWorkOrder({ runtime = {}, queue = {}, experience = {}, taskId = '' } = {}) {
  const normalizedQueue = createVibeContinuousQueue(queue);
  const resolved = resolveTask(normalizedQueue, taskId);
  const base = {
    version:4, generatedAt:new Date().toISOString(), run:false, reason:null, mode:'vibe2-parallel-work-order',
    scheduler:freeze({ hierarchicalParallelism:true, dag:true, shardAware:true, workStealing:true, sourceRootLock:true, eventDriven:true, dynamicBackpressure:true }),
    safety:freeze({
      directMainWrite:false,
      existingWebMaintenanceAllowed:runtime?.safety?.existingWebMaintenanceAllowed === true,
      newWebGameAutomatic:runtime?.safety?.newWebGameAutomatic === true,
      paidAIAllowed:runtime?.safety?.paidAIAllowed === true,
      paidRunnerAllowed:runtime?.safety?.paidRunnerAllowed === true,
      binaryAssetsDirectTextEditForbidden:true
    })
  };
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

  const adapter = plan.engineAdapter;
  const route = classifyVibeExecutionRoute({ target:plan.target, task, adapter });
  const maxWorkMinutes = Math.max(1, Math.min(60, Math.floor(Number(runtime?.continuous?.maxWorkMinutes) || 20)));
  const editorConfig = runtime?.engineEditors?.[plan.target] || {};
  const releaseState = clean(task.releaseState) || 'other';
  const automaticDeploymentEligible = AUTO_DEPLOY_STATES.has(releaseState) && ['roblox','web','unity'].includes(plan.target) && task.requiresOwnerDecision !== true && task.protectedChange !== true;
  const learningGuidance = buildLearningGuidance(plan.learning);
  const executionGoal = learningGuidance ? `${task.goal}\n\n${learningGuidance}` : task.goal;
  const responsibleFiles = freezeList(task.responsibleFiles || []);

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
    qa:freezeList(plan.qa || []), incrementalQa:incrementalQaPlan(task, plan.target, responsibleFiles),
    learning:plan.learning, learningAppliedToWorkerGoal:Boolean(learningGuidance), motion:plan.motion, executionGate:plan.executionGate,
    deployment:freeze({ automaticEligible:automaticDeploymentEligible, requiresVerifiedQA:true, requiresBuild:['roblox','unity'].includes(plan.target), promoteSourceRootOnly:true, mainDirectWriteByWorker:false, publicStoreReleaseAutomatic:false }),
    editor:freeze({ required:route.requiresEditor, runtime:route.editorRuntime || adapter?.execution?.editorRuntime || null, dispatchConfigured:route.route!=='engine-editor' || Boolean(clean(editorConfig.workflow)||clean(editorConfig.runnerLabel)), workflow:clean(editorConfig.workflow)||null, runnerLabel:clean(editorConfig.runnerLabel)||null }),
    workerPolicy:freeze({
      isolatedCandidateBranch:true, directMainWrite:false, verifiedCommitRequired:true, retryLimit:task.maxRetries,
      paidAIAllowed:false, paidRunnerAllowed:false, engineMustResolveGameplayResults:true, protectedGameplayMutationAutomatic:false,
      binaryAssetsDirectTextEditForbidden:true, textWorkerAllowed:route.route==='text-source-worker',
      speculativeParallelism:task.speculativeEligible && task.estimatedRisk==='high', speculativeVariants:task.speculativeEligible && task.estimatedRisk==='high'?2:1
    })
  });
}

export function runVibeContinuousRunner({ runtimeFile='vibe2-runtime.json', queueFile='.vibe2/queue.json', experienceFile='.vibe2/experience.json', outputFile='', taskId='' } = {}) {
  const runtime = readJson(runtimeFile, {});
  const resolvedQueueFile = clean(runtime?.sources?.queue) || queueFile;
  const resolvedExperienceFile = clean(runtime?.sources?.experience) || experienceFile;
  const resolvedOutputFile = clean(outputFile) || clean(runtime?.sources?.workOrder) || '.vibe2/work-order.json';
  const order = buildVibeContinuousWorkOrder({ runtime, queue:readJson(resolvedQueueFile, { tasks:[] }), experience:readJson(resolvedExperienceFile, { records:[] }), taskId });
  writeJson(resolvedOutputFile, order);
  return order;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const order = runVibeContinuousRunner({
    runtimeFile:clean(args.runtime)||'vibe2-runtime.json', queueFile:clean(args.queue)||'.vibe2/queue.json', experienceFile:clean(args.experience)||'.vibe2/experience.json', outputFile:clean(args.output), taskId:clean(args['task-id'])
  });
  console.log(`VIBE2_CONTINUOUS_RUN=${order.run?'YES':'NO'}`);
  console.log(`VIBE2_CONTINUOUS_REASON=${order.reason}`);
  if (order.run) {
    console.log(`VIBE2_TASK_ID=${order.taskId}`);
    console.log(`VIBE2_TARGET=${order.target}`);
    console.log(`VIBE2_SHARD=${order.shard}`);
    console.log(`VIBE2_RELEASE_STATE=${order.releaseState}`);
    console.log(`VIBE2_AUTO_DEPLOY_ELIGIBLE=${order.deployment.automaticEligible?'YES':'NO'}`);
    console.log(`VIBE2_EXECUTION_ROUTE=${order.executionRoute}`);
    console.log(`VIBE2_SOURCE_ROOT=${order.source.root}`);
    console.log(`VIBE2_INCREMENTAL_QA=YES`);
    console.log(`VIBE2_SPECULATIVE_VARIANTS=${order.workerPolicy.speculativeVariants}`);
    console.log(`VIBE2_EXPERIENCE_CONTEXT_APPLIED=${order.learningAppliedToWorkerGoal?'YES':'NO'}`);
  }
}
