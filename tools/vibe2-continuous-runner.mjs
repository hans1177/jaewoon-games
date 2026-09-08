// 파일명: tools/vibe2-continuous-runner.mjs
// 역할: Vibe2 연속 작업 큐에서 다음 안전 작업을 선택하고 엔진별 검증 작업주문을 생성한다.
// 원칙: 이 도구는 작업주문만 만들며 main이나 게임 소스를 직접 수정하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planVibeCoreTask } from '../assets/vibe-core-runtime.js';
import { createVibeContinuousQueue, selectNextVibeQueueTask } from '../assets/vibe-continuous-queue.js';
import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/');
const freeze = (value) => Object.freeze(value);
const freezeList = (values = []) => freeze([...new Set((values || []).map(clean).filter(Boolean))]);
const EDITOR_BINARY_EXTENSIONS = new Set(['.uasset', '.umap', '.controller', '.anim', '.avatar']);

function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
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
  const allowed = Array.isArray(runtime?.safety?.allowedWritableTargets) ? runtime.safety.allowedWritableTargets.map(clean) : ['unity', 'unreal', 'godot'];
  return allowed.includes(clean(target));
}
function taskRequiresWrite(task) {
  return !['inspect', 'research', 'qa'].includes(clean(task?.type).toLowerCase());
}
function normalizeResponsibleFile(task) {
  const files = Array.isArray(task?.responsibleFiles) ? task.responsibleFiles.map(posix).filter(Boolean) : [];
  return files[0] || null;
}
function requestMentionsEditorOnlyCapability(target, request) {
  const text = clean(request).toLowerCase();
  if (target === 'unreal') return [
    'blueprint', '블루프린트', 'animation blueprint', 'anim blueprint', '애님 블루프린트',
    'montage', '몽타주', 'blend space', '블렌드 스페이스', 'control rig', '컨트롤 릭',
    'ik retargeter', '리타게터', 'ik rig'
  ].some((word) => text.includes(word));
  if (target === 'unity') return [
    'animator controller', '애니메이터 컨트롤러', 'animationclip asset', 'animation clip asset',
    '애니메이션 클립 에셋', 'avatar asset'
  ].some((word) => text.includes(word));
  return false;
}
function responsibleFilesRequireEditor(task) {
  return (task?.responsibleFiles || []).some((file) => EDITOR_BINARY_EXTENSIONS.has(path.extname(posix(file)).toLowerCase()));
}
export function classifyVibeExecutionRoute({ target = '', task = {}, adapter = {} } = {}) {
  const normalizedTarget = clean(target).toLowerCase();
  if (!taskRequiresWrite(task)) return freeze({ route: 'analysis-only', requiresEditor: false, reason: 'non-write-task' });
  const binary = responsibleFilesRequireEditor(task);
  const requested = requestMentionsEditorOnlyCapability(normalizedTarget, task.goal);
  if (binary || requested) {
    return freeze({
      route: 'engine-editor',
      requiresEditor: true,
      reason: binary ? 'responsible-binary-asset' : 'editor-only-capability-requested',
      editorRuntime: adapter?.execution?.editorRuntime || null,
      directBinaryTextEditForbidden: true
    });
  }
  return freeze({ route: 'text-source-worker', requiresEditor: false, reason: 'text-source-capability' });
}

export function buildVibeContinuousWorkOrder({ runtime = {}, queue = {}, experience = {} } = {}) {
  const continuousEnabled = runtime?.continuous?.enabled !== false;
  const normalizedQueue = createVibeContinuousQueue(queue);
  const selection = selectNextVibeQueueTask(normalizedQueue);
  const base = {
    version: 2,
    generatedAt: new Date().toISOString(),
    run: false,
    reason: null,
    mode: 'vibe2-continuous-work-order',
    safety: freeze({
      directMainWrite: false,
      webGamesReadOnly: runtime?.safety?.webGamesReadOnly !== false,
      paidAIAllowed: runtime?.safety?.paidAIAllowed === true,
      paidRunnerAllowed: runtime?.safety?.paidRunnerAllowed === true,
      homepagePublicationAutomatic: runtime?.safety?.homepagePublicationAutomatic === true,
      binaryAssetsDirectTextEditForbidden: true
    })
  };

  if (!continuousEnabled) return freeze({ ...base, reason: 'CONTINUOUS_DISABLED', selection });
  if (!selection.selected) return freeze({ ...base, reason: selection.stopReason || 'NO_ELIGIBLE_WORK', selection });

  const task = selection.selected;
  const requiresWrite = taskRequiresWrite(task);
  if (requiresWrite && !writableTargetAllowed(runtime, task.target)) {
    return freeze({ ...base, reason: `WRITABLE_TARGET_FORBIDDEN:${task.target}`, selectedTask: task, selection });
  }

  const memory = createVibeExperienceMemory(experience);
  const plan = planVibeCoreTask({
    request: task.goal,
    target: task.target,
    gameId: task.gameId,
    file: normalizeResponsibleFile(task),
    experienceMemory: memory,
    departments: task.department ? [task.department] : [],
    ownerDirective: task.ownerDirective
  });

  const gateReasons = [...(plan.executionGate?.reasons || [])];
  const analysisOnlyRead = !requiresWrite && gateReasons.length === 1 && gateReasons[0] === 'source-read-only';
  const mayRun = plan.executionGate?.mayExecute === true || analysisOnlyRead;
  if (!mayRun) {
    return freeze({
      ...base,
      reason: `EXECUTION_GATE_BLOCKED:${gateReasons.join(',') || 'unknown'}`,
      selectedTask: task,
      selection,
      gate: plan.executionGate
    });
  }

  const adapter = plan.engineAdapter;
  const route = classifyVibeExecutionRoute({ target: plan.target, task, adapter });
  const maxWorkMinutes = Math.max(1, Math.min(60, Math.floor(Number(runtime?.continuous?.maxWorkMinutes) || 20)));
  const editorConfig = runtime?.engineEditors?.[plan.target] || {};
  const editorDispatchConfigured = route.route !== 'engine-editor' || Boolean(clean(editorConfig.workflow) || clean(editorConfig.runnerLabel));
  return freeze({
    ...base,
    run: true,
    reason: 'WORK_READY',
    selectedTask: task,
    selection,
    taskId: task.id,
    gameId: task.gameId,
    target: plan.target,
    workMode: route.route === 'analysis-only' ? 'analysis-only' : route.route === 'engine-editor' ? 'engine-editor-task' : 'source-change-candidate',
    executionRoute: route.route,
    route,
    goal: task.goal,
    department: task.department,
    priority: task.priority,
    maxWorkMinutes,
    source: freeze({
      root: adapter.source.root,
      writable: adapter.mayWriteSource,
      candidateFiles: freezeList(adapter.source.candidateFiles),
      textWritablePatterns: freezeList(adapter.source.textWritablePatterns || []),
      editorRequiredPatterns: freezeList(adapter.source.editorRequiredPatterns || []),
      ignoredPaths: freezeList(adapter.source.ignoredPaths),
      responsibleFiles: freezeList(task.responsibleFiles || [])
    }),
    qa: freezeList(plan.qa || []),
    learning: plan.learning,
    motion: plan.motion,
    executionGate: plan.executionGate,
    editor: freeze({
      required: route.requiresEditor,
      runtime: route.editorRuntime || adapter?.execution?.editorRuntime || null,
      dispatchConfigured: editorDispatchConfigured,
      workflow: clean(editorConfig.workflow) || null,
      runnerLabel: clean(editorConfig.runnerLabel) || null
    }),
    workerPolicy: freeze({
      isolatedCandidateBranch: true,
      directMainWrite: false,
      verifiedCommitRequired: true,
      retryLimit: task.maxRetries,
      paidAIAllowed: false,
      paidRunnerAllowed: false,
      engineMustResolveGameplayResults: true,
      protectedGameplayMutationAutomatic: false,
      binaryAssetsDirectTextEditForbidden: true,
      textWorkerAllowed: route.route === 'text-source-worker'
    })
  });
}

export function runVibeContinuousRunner({
  runtimeFile = 'vibe2-runtime.json',
  queueFile = '.vibe2/queue.json',
  experienceFile = '.vibe2/experience.json',
  outputFile = '.vibe2/work-order.json'
} = {}) {
  const runtime = readJson(runtimeFile, {});
  const resolvedQueueFile = clean(runtime?.sources?.queue) || queueFile;
  const resolvedExperienceFile = clean(runtime?.sources?.experience) || experienceFile;
  const resolvedOutputFile = clean(runtime?.sources?.workOrder) || outputFile;
  const queue = readJson(resolvedQueueFile, { tasks: [] });
  const experience = readJson(resolvedExperienceFile, { records: [] });
  const order = buildVibeContinuousWorkOrder({ runtime, queue, experience });
  writeJson(resolvedOutputFile, order);
  return order;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const order = runVibeContinuousRunner({
    runtimeFile: clean(args.runtime) || 'vibe2-runtime.json',
    queueFile: clean(args.queue) || '.vibe2/queue.json',
    experienceFile: clean(args.experience) || '.vibe2/experience.json',
    outputFile: clean(args.output) || '.vibe2/work-order.json'
  });
  console.log(`VIBE2_CONTINUOUS_RUN=${order.run ? 'YES' : 'NO'}`);
  console.log(`VIBE2_CONTINUOUS_REASON=${order.reason}`);
  if (order.run) {
    console.log(`VIBE2_TASK_ID=${order.taskId}`);
    console.log(`VIBE2_TARGET=${order.target}`);
    console.log(`VIBE2_EXECUTION_ROUTE=${order.executionRoute}`);
    console.log(`VIBE2_SOURCE_ROOT=${order.source.root}`);
  }
}
