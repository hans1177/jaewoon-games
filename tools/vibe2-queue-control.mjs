// 파일명: tools/vibe2-queue-control.mjs
// 역할: Vibe2 병렬 DAG 큐의 추가·예약·원자 뉴런 결과·QA대기·완료·실패·gated 재계획 상태를 영속화한다.
// 원칙: 기존 scheduler와 책임 파일 충돌 보호를 유지하고 source-root/game-wide lock은 만들지 않으며, 검증된 neural gated 실행은 재큐·재우선순위·refill 힌트만 직접 반영한다.

import { resolveActiveOwnerPolicy } from './company-policy-steward.mjs';
import { planVibeCoreTask } from '../assets/vibe-core-runtime.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import {
  createVibeContinuousQueue,
  selectNextVibeQueueTask,
  selectVibeQueueBatch,
  beginVibeQueueTask,
  beginVibeQueueBatch,
  finishVibeQueueTask,
  summarizeVibeContinuousQueue,
  DEFAULT_MAX_CONCURRENT_TASKS,
  EXTERNAL_MATRIX_BATCH_MAX
} from '../assets/vibe-continuous-queue.js';
import { computeParallelismTelemetry } from './vibe2-parallelism-telemetry.mjs';
import { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure, ownerFirstRunnerAllocation, DEFAULT_ADAPTIVE_TARGET, DEFAULT_ADAPTIVE_MIN } from './vibe2-adaptive-backpressure.mjs';
import { repairStaleAutonomousQueue, rerouteRepeatingAutoFailures, requeueCooledDownAutoFailures, checkAutonomousCandidate } from './vibe2-autonomous-operations.mjs';
import { evaluateNeuralDiagnosisFeedback, neuralFeedbackEvidence, summarizeNeuralFeedbackEvidence } from './vibe2-neural-feedback.mjs';
import { critiqueNeuralShadow, neuralCriticEvidence } from './vibe2-neural-critic.mjs';
import { verifyNeuralRootCause, neuralRootCauseEvidence } from './vibe2-neural-root-cause.mjs';
import { simulateNeuralEventRoute, neuralEventRouteEvidence } from './vibe2-neural-event-router.mjs';
import { summarizeNeuralEventShadowEvidence } from './vibe2-neural-event-telemetry.mjs';

const clean = (value) => String(value ?? '').trim();
// The executable lives in the exact main contract checkout; cwd can be a stale control branch.
// 중앙 검증 정책의 상대 경로는 실행 중인 canonical 소스 위치 기준으로 고정한다.
// 제어 브랜치/임시 테스트 디렉터리의 cwd로 정책이 바뀌면 안 된다.
const configuredPolicyPath = String(process.env.COMPANY_VERIFIED_POLICY_PATH||'').trim();
const CANONICAL_RESERVATION_POLICY = configuredPolicyPath
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..',configuredPolicyPath)
  : '';
// [웹게임 원본] 최신 main 정책 작업 트리의 카탈로그를 우선한다. 별도 큐나 상태 파일은 만들지 않는다.
const CANONICAL_CATALOG_PATH = configuredPolicyPath
  ? path.resolve(path.dirname(CANONICAL_RESERVATION_POLICY),'..','game-catalog.json')
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','game-catalog.json');
const RETIRED_WEB_SOURCE_STATES = new Set([
  'PERMANENTLY_REMOVED_REJECTED_TEST','WITHDRAWN_SIMPLE_PROTOTYPE',
  'ENTRY_MISSING_OR_INVALID','NON_GAME_SURFACE'
]);
// 웹 소스가 폐기된 경우만 보류한다. 최초 생성이 필요한 정상 게임은 계속 접수한다.
export function webSourceRetiredInCatalog(game={}) {
  return RETIRED_WEB_SOURCE_STATES.has(clean(game?.canonical?.sources?.web?.state||game?.ownerWebSourceState).toUpperCase());
}
const FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE = 'repair-retry:vibe2-full-web-output-budget-v2';
const SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE = 'repair-retry:vibe2-source-generation-context-v3';
const FIXED_ASSET_WORK_ORDER_REPAIR_EVIDENCE = 'repair-retry:vibe2-asset-work-order-undefined-binding-v1';
const STALE_RUNNING_RECOVERY_EVIDENCE = 'recovery:stale-running-reservation-v1';
const COMPLETED_RESERVATION_RUN_RECOVERY_EVIDENCE = 'recovery:completed-reservation-run-v1';
const TRANSIENT_WORK_LOCK_RECOVERY_EVIDENCE = 'recovery:transient-work-lock-requeue-v1';
const WORKER_ARTIFACT_SLOT_RELEASE_EVIDENCE = 'worker-artifact-slot-release:v1';
const WORKER_SLOT_EXPLICIT_RETAINED_LOCK_EVIDENCE = 'worker-slot-explicit-retained-locks:v1';
const DEFAULT_STALE_RUNNING_MS = 45 * 60 * 1000;
function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  const raw=fs.readFileSync(file,'utf8');
  if (!clean(raw)) return fallback;
  return JSON.parse(raw);
}
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); const compactQueue=/(?:^|\/)\.vibe2\/queue\.json$/.test(String(file).replaceAll('\\','/')); fs.writeFileSync(file, `${JSON.stringify(value, null, compactQueue?0:2)}\n`, 'utf8'); }

// 저장: 실행 중에는 기존 전체 큐를 사용하고 Git 체크포인트에서만 활성/영구 이력을 분리한다.
// 인덱스와 모든 조각은 같은 정상 push로 저장한다. 충돌 시 최신 ref에서 의미 작업을 재실행한다.
export const VIBE_QUEUE_BLOB_MAX_BYTES = 100 * 1024 * 1024;
const QUEUE_PART_BYTES = 8 * 1024 * 1024;
const queueDigest = value => createHash('sha256').update(value).digest('hex');
function writeQueueAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temporary = `${file}.${process.pid}.tmp`;
  try { fs.writeFileSync(temporary, data); fs.renameSync(temporary, file); }
  finally { fs.rmSync(temporary, {force:true}); }
}
export function assertVibeQueueBlobSize(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > VIBE_QUEUE_BLOB_MAX_BYTES)
    throw new Error(`VIBE2_QUEUE_GIT_BLOB_LIMIT_BLOCKED=${bytes}`);
}
export function readVibeQueueStorage(file, index = JSON.parse(fs.readFileSync(file, 'utf8'))) {
  if (!index.queueStorage) return index;
  const storage = index.queueStorage;
  if (storage.version !== 1 || !Array.isArray(storage.entries) || !Array.isArray(index.tasks))
    throw new Error('VIBE2_QUEUE_STORAGE_INVALID');
  if (queueDigest(JSON.stringify(index.tasks)) !== storage.summarySha256)
    throw new Error('VIBE2_QUEUE_STORAGE_SUMMARY_MUTATED_WITHOUT_RESTORE');
  const seen = new Set();
  const tasks = storage.entries.map(entry => {
    if (!entry.id || seen.has(entry.id) || !['active','history'].includes(entry.lane) || !Array.isArray(entry.parts) || !entry.parts.length)
      throw new Error('VIBE2_QUEUE_STORAGE_ENTRY_INVALID');
    seen.add(entry.id);
    const buffers = entry.parts.map(part => {
      if (!/^[a-f0-9]{64}$/.test(part.sha256) || !Number.isSafeInteger(part.bytes) || part.bytes < 1 || part.bytes > QUEUE_PART_BYTES)
        throw new Error('VIBE2_QUEUE_STORAGE_PART_INVALID');
      const root = path.join(path.dirname(file), 'queue', entry.lane);
      const target = path.join(root, `${part.sha256}.part`);
      if (fs.lstatSync(path.dirname(root)).isSymbolicLink() || fs.lstatSync(root).isSymbolicLink() || fs.lstatSync(target).isSymbolicLink()) throw new Error('VIBE2_QUEUE_STORAGE_SYMLINK');
      const buffer = fs.readFileSync(target);
      if (buffer.length !== part.bytes || queueDigest(buffer) !== part.sha256) throw new Error('VIBE2_QUEUE_STORAGE_PART_CORRUPT');
      return buffer;
    });
    const buffer = Buffer.concat(buffers);
    if (buffer.length !== entry.bytes || queueDigest(buffer) !== entry.sha256) throw new Error('VIBE2_QUEUE_STORAGE_TASK_CORRUPT');
    const task = JSON.parse(buffer.toString('utf8'));
    if (task.id !== entry.id || (['verified','cancelled'].includes(task.status) ? 'history' : 'active') !== entry.lane)
      throw new Error('VIBE2_QUEUE_STORAGE_TASK_IDENTITY');
    return task;
  });
  const {queueStorage, ...queue} = index;
  queue.tasks = tasks;
  if (queueDigest(JSON.stringify(queue)) !== storage.queueSha256) throw new Error('VIBE2_QUEUE_STORAGE_QUEUE_CORRUPT');
  return queue;
}
export function unpackVibeQueueStorage(file) {
  const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  const queue = readVibeQueueStorage(file, stored);
  if (stored.queueStorage) writeQueueAtomic(file, JSON.stringify(queue) + '\n');
  return {tasks:queue.tasks.length, restored:Boolean(stored.queueStorage), queue};
}
export function packVibeQueueStorage(file) {
  const queue = readVibeQueueStorage(file);
  if (!queue || !Array.isArray(queue.tasks)) throw new Error('VIBE2_QUEUE_STORAGE_TASKS_REQUIRED');
  const seen = new Set(), entries = [], parts = new Map();
  const root = path.join(path.dirname(file), 'queue');
  for (const directory of [root,path.join(root,'active'),path.join(root,'history')]) {
    if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) throw new Error('VIBE2_QUEUE_STORAGE_SYMLINK');
  }
  // 검증 전에는 기존 큐/조각을 변경하지 않는다. 미지 필드와 원래 배열 순서도 그대로 보존한다.
  for (const task of queue.tasks) {
    if (!task || typeof task.id !== 'string' || !task.id || seen.has(task.id)) throw new Error('VIBE2_QUEUE_STORAGE_DUPLICATE_OR_MISSING_ID');
    seen.add(task.id);
    const lane = ['verified','cancelled'].includes(task.status) ? 'history' : 'active';
    const buffer = Buffer.from(JSON.stringify(task));
    const entry = {id:task.id, lane, bytes:buffer.length, sha256:queueDigest(buffer), parts:[]};
    for (let offset = 0; offset < buffer.length; offset += QUEUE_PART_BYTES) {
      const part = buffer.subarray(offset, offset + QUEUE_PART_BYTES), sha256 = queueDigest(part);
      entry.parts.push({sha256, bytes:part.length});
      parts.set(`${lane}/${sha256}.part`, part);
    }
    entries.push(entry);
  }
  // 기존 읽기 전용 경량 dispatch/API 소비자의 상태 관찰은 인덱스에 남긴다.
  // 실행/변경 소비자는 반드시 복원하며 createVibeContinuousQueue도 요약 실행을 거부한다.
  const summaryFields = ['id','gameId','target','department','type','status','blocker','executionLane','assetProductionLane','systemSteward','reservationId','reservationRunId','reservationRunAttempt','reservedAt','priority','ownerDirective','ownerDevelopmentHold','dependencies','retries','retryPolicy','maxRetries'];
  const tasks = queue.tasks.map(task => Object.fromEntries(summaryFields.filter(key => Object.hasOwn(task,key)).map(key => [key,task[key]])));
  const index = {...queue, tasks, queueStorage:{version:1, queueSha256:queueDigest(JSON.stringify(queue)), summarySha256:queueDigest(JSON.stringify(tasks)), entries}};
  const data = JSON.stringify(index) + '\n';
  assertVibeQueueBlobSize(Buffer.byteLength(data));
  for (const [relative, buffer] of parts) {
    const target = path.join(root,relative);
    if (fs.existsSync(target)) {
      if (fs.lstatSync(target).isSymbolicLink() || !fs.readFileSync(target).equals(buffer)) throw new Error('VIBE2_QUEUE_STORAGE_EXISTING_PART_CORRUPT');
    } else writeQueueAtomic(target, buffer);
  }
  // 먼저 모든 조각을 보존한 뒤 인덱스를 원자 교체한다. 영구 이력 조각은 삭제하지 않는다.
  writeQueueAtomic(file, data);
  readVibeQueueStorage(file);
  writeQueueAtomic(path.join(root,'format.json'), '{"version":1}\n');
  const activeRoot = path.join(root,'active');
  if (fs.existsSync(activeRoot)) for (const name of fs.readdirSync(activeRoot)) {
    if (/^[a-f0-9]{64}\.part$/.test(name) && !parts.has(`active/${name}`)) fs.unlinkSync(path.join(activeRoot,name));
  }
  return {tasks:tasks.length, active:entries.filter(row=>row.lane==='active').length, history:entries.filter(row=>row.lane==='history').length, indexBytes:Buffer.byteLength(data), maxPartBytes:Math.max(0,...[...parts.values()].map(row=>row.length))};
}


function fixedGamePrimaryRepeatSlots() {
  const policy=readJson(CANONICAL_RESERVATION_POLICY,{});
  const raw=Number(policy?.fixedAutonomousDevelopmentOperatingContract?.repeatDevelopmentConcurrency?.fixedSlots);
  return Number.isFinite(raw)&&raw>0?Math.floor(raw):null;
}
function configuredLaneReservationMax(executionLane='',requested=null,queueMax=null){
  const lane=clean(executionLane||'game-primary').toLowerCase();
  if(lane==='game-primary')return fixedGamePrimaryRepeatSlots()||128;
  if(lane==='learning-idle')return 1;
  return optionalMaxConcurrent(requested) ?? queueMax;
}
function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'summary', ...rest] = argv;
  const args = { command };
  for (const raw of rest) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function queueFileFrom(args) { return clean(args.queue) || '.vibe2/queue.json'; }
function controlFileFrom(args) { return clean(args.control) || '.vibe2/parallelism-control.json'; }
function readParallelismControl(args) {
  try {
    return createParallelismControl(readJson(controlFileFrom(args), {}));
  } catch {
    return createParallelismControl({ lastReason: `INVALID_STATE_ADAPTIVE_TARGET_${DEFAULT_ADAPTIVE_TARGET}` });
  }
}

export function speculativeExpansionPolicy(controlInput = {}) {
  const control=createParallelismControl(controlInput);
  const telemetry=control.lastTelemetry&&typeof control.lastTelemetry==='object'?control.lastTelemetry:{};
  const lastReason=clean(control.lastReason).toUpperCase();
  const bottleneck=clean(telemetry.bottleneck).toUpperCase();
  const workerCount=Math.max(0,Math.floor(Number(telemetry.workerCount)||0));
  const effectiveMax=Math.max(0,Math.floor(Number(telemetry.effectiveMax)||0));
  const peakUtilization=Math.max(0,Number(telemetry.effectivePeakUtilizationPct)||0);
  const explicitPressure=/(?:RUNNER_CAPACITY|RUNNER_QUEUE_WAIT|CHECKOUT_NETWORK)/.test(lastReason)
    || ['RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION','CHECKOUT_NETWORK'].includes(bottleneck);
  const loadedUnderutilization=workerCount>=4&&effectiveMax>=4&&peakUtilization>0&&peakUtilization<80;
  if(explicitPressure||loadedUnderutilization){
    const reasons=[];
    if(explicitPressure)reasons.push('ADAPTIVE_RUNNER_PRESSURE');
    if(loadedUnderutilization)reasons.push('LOW_EFFECTIVE_PEAK_UTILIZATION');
    return Object.freeze({
      allowed:false,
      reason:reasons.join('+'),
      primaryCoveragePreserved:true,
      lastReason:clean(control.lastReason)||null,
      bottleneck:bottleneck||null,
      workerCount,
      effectiveMax,
      peakUtilizationPct:peakUtilization
    });
  }
  return Object.freeze({
    allowed:true,
    reason:'AVAILABLE',
    primaryCoveragePreserved:true,
    lastReason:clean(control.lastReason)||null,
    bottleneck:bottleneck||null,
    workerCount,
    effectiveMax,
    peakUtilizationPct:peakUtilization
  });
}
function priority(value, ownerDirective) { if (ownerDirective) return 'owner-immediate'; return ['critical','high','normal','low'].includes(clean(value)) ? clean(value) : 'normal'; }
function bool(value) { return value === true || ['1','true','yes','y'].includes(clean(value).toLowerCase()); }
function list(value) { return clean(value).split(',').map(clean).filter(Boolean); }
function maxConcurrent(value) {
  const raw=Number(value);
  if(!Number.isFinite(raw)||raw<=0)return DEFAULT_MAX_CONCURRENT_TASKS;
  return Math.max(1,Math.floor(raw));
}
function optionalMaxConcurrent(value) { return clean(value) ? maxConcurrent(value) : null; }
function reservationFromArgs(args = {}) {
  const id=clean(args['reservation-id']);
  return id ? {
    id,
    runId:clean(args['reservation-run']),
    runAttempt:Math.max(0,Math.floor(Number(args['reservation-attempt'])||0)),
    reservedAt:clean(args['reserved-at'])
  } : {};
}
function resultReservationId(row = {}) {
  const direct=clean(row?.reservationId||row?.metrics?.reservationId);
  if(direct)return direct;
  const evidence=Array.isArray(row?.evidence)?row.evidence:[];
  const marker=evidence.map(clean).find(value=>value.startsWith('reservation-id:'));
  return marker?clean(marker.slice('reservation-id:'.length)):'';
}

function isRecoverableFullWebTransportFailure(task = {}) {
  const evidence = Array.isArray(task.evidence) ? task.evidence : [];
  const blocker = clean(task.blocker);
  return task.ownerDirective === true
    && clean(task.target).toLowerCase() === 'web'
    && /FULL_WEB_GAME_REBUILD/.test(clean(task.goal))
    && task.status === 'failed'
    && Number(task.retries || 0) > Number(task.maxRetries ?? 2)
    && ['source-candidate-generation-failed','parallel-candidate-generation-failed'].includes(blocker)
    && !evidence.includes(FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE);
}

export function recoverFixedFullWebTransportFailures(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    if (!isRecoverableFullWebTransportFailure(task)) return task;
    recovered += 1;
    return {
      ...task,
      status: 'queued',
      retries: 0,
      blocker: null,
      lastOutcome: 'RETRY_AFTER_INFRA_REPAIR',
      evidence: [...new Set([...(task.evidence || []), FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

export function recoverFixedSourceCandidateGenerationFailures(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    const evidence = Array.isArray(task.evidence) ? task.evidence : [];
    const blocker = clean(task.blocker);
    const retryExhausted = Number(task.retries || 0) > Number(task.maxRetries ?? 2);
    const exactWebRepair = /-(?:web-runtime-repair|web-base-implementation)-v1$/.test(clean(task.id))
      || /\[(?:VIBE_WEB_REPAIR|WEB_BASE_IMPLEMENTATION)\]/i.test(clean(task.goal));
    const eligible = task.status === 'failed'
      && clean(task.department).toLowerCase() === 'development'
      && clean(task.type).toLowerCase() === 'implementation'
      && clean(task.target).toLowerCase() === 'web'
      && exactWebRepair
      && retryExhausted
      && ['source-candidate-generation-failed','parallel-candidate-generation-failed'].includes(blocker)
      && !evidence.includes(SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE);
    if (!eligible) return task;
    recovered += 1;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      retries:0,
      blocker:null,
      lastOutcome:'RETRY_AFTER_SOURCE_GENERATION_INFRA_REPAIR',
      evidence:[...new Set([...evidence, SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

function isWorkerCapacityReleasedBlocker(value = '') {
  const blocker = clean(value);
  return /candidate-awaiting-runtime-evidence|awaiting.*qa|qa.*awaiting|slot-released.*fan-in|WAITING_FOR_GEMINI_QUOTA|gemini.*quota|external.*model.*quota/i.test(blocker);
}

function clearedReservation() {
  return { reservationId:null, reservationRunId:null, reservationRunAttempt:0, reservedAt:null };
}

export function recoverTransientWorkLockBlocks(queueInput) {
  const queue=createVibeContinuousQueue(queueInput);
  let recovered=0;
  const tasks=queue.tasks.map(task=>{
    const blocker=clean(task.blocker);
    if(task.status!=='blocked'||!/^work-lock-conflict:/i.test(blocker))return task;
    recovered+=1;
    return{
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'DEFERRED_BY_WORK_LOCK',
      neuronExpectedVariants:0,
      neuronResults:[],
      evidence:[...new Set([...(task.evidence||[]),TRANSIENT_WORK_LOCK_RECOVERY_EVIDENCE,`transient-work-lock-deferred:${blocker}`])]
    };
  });
  return{recovered,queue:recovered?createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks}):queue};
}

export function recoverCompletedRunningReservations(queueInput, {
  completedRunIds = [],
  noResultRunIds = [],
  recoveryOutcome = 'COMPLETED_RESERVATION_RUN_RECOVERED',
  recoveryEvidence = COMPLETED_RESERVATION_RUN_RECOVERY_EVIDENCE,
  evidencePrefix = 'completed-reservation-run'
} = {}) {
  const queue=createVibeContinuousQueue(queueInput);
  const completed=new Set((Array.isArray(completedRunIds)?completedRunIds:[]).map(clean).filter(Boolean));
  // Empty worker artifacts are independently verified by the existing reserve GitHub API probe.
  const noResults=new Set((Array.isArray(noResultRunIds)?noResultRunIds:[]).map(clean).filter(Boolean));
  if(!completed.size)return{recovered:0,recoveredRunIds:[],queue};
  const normalizedOutcome=clean(recoveryOutcome)||'COMPLETED_RESERVATION_RUN_RECOVERED';
  const normalizedEvidence=clean(recoveryEvidence)||COMPLETED_RESERVATION_RUN_RECOVERY_EVIDENCE;
  const normalizedPrefix=clean(evidencePrefix)||'completed-reservation-run';
  let recovered=0;
  const recoveredRunIds=new Set();
  const tasks=queue.tasks.map(task=>{
    const runId=clean(task.reservationRunId);
    if(task.status!=='running')return task;
    // [자산 예약 회수] 완료 후 RELEASE_WAIT로 이동한 그래픽 작업은 원래
    // ASSET_DEVELOPMENT 레인 이름을 잃는다. 저장된 실제 자산 작업 표시를
    // 사용하고, API가 증명한 종료·무결과 실행에만 기존 재대기 경로를 적용한다.
    if((clean(task.department).toLowerCase()!=='development'
        &&task.assetProductionLane!==true
        &&clean(task.executionLane).toUpperCase()!=='ASSET_DEVELOPMENT')
      ||clean(task.type).toLowerCase()!=='implementation')return task;
    // A completed run with no downloadable worker result cannot satisfy fan-in.
    // Requeue only when the separate API probe proved the run and artifact absence;
    // keep every review-verified or artifact-bearing fan-in reservation untouched.
    const evidence=Array.isArray(task.evidence)?task.evidence:[];
    // Old review PASS and candidate-sha markers are cumulative across retries.
    // Only the current run's completed status plus an independently confirmed
    // empty worker-artifact list permits replay; keep final web evidence and
    // recorded neuron results protected, never treat prior review as current.
    const noResultFanIn=noResults.has(runId)&&/^slot-released-awaiting-fan-in$/i.test(clean(task.blocker))
      &&!evidence.some(value=>/^web-f0-f9-verified$/i.test(clean(value)))
      &&!(Array.isArray(task.neuronResults)&&task.neuronResults.length);
    if(!runId||!completed.has(runId)||(clean(task.blocker)&&!noResultFanIn))return task;
    recovered+=1;
    recoveredRunIds.add(runId);
    return{
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:noResultFanIn?'FAN_IN_RESULT_ARTIFACT_MISSING_REQUEUED':normalizedOutcome,
      neuronExpectedVariants:0,
      neuronResults:[],
      retainedResponsibleFileLocks:noResultFanIn?[]:(task.retainedResponsibleFileLocks||[]),
      evidence:[...new Set([...(task.evidence||[]),normalizedEvidence,`${normalizedPrefix}:${runId}`,
        ...(noResultFanIn?['recovery:verified-completed-fan-in-no-worker-artifacts']:[])])]
    };
  });
  return{
    recovered,
    recoveredRunIds:[...recoveredRunIds],
    queue:recovered?createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks}):queue
  };
}

export function workerArtifactTaskKey(value='task'){
  return String(value||'task').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'task';
}

function expectedWorkerArtifactNames(task={}){
  const expected=Math.max(1,Math.min(5,Math.floor(Number(task.neuronExpectedVariants)||1)));
  const safeTask=workerArtifactTaskKey(task.id);
  return Array.from({length:expected},(_,index)=>`vibe2-result-${safeTask}-${index===0?'primary':`speculative-${index}`}`);
}

export function releaseCompletedWorkerArtifactSlots(queueInput,{runArtifacts=[]}={}){
  const queue=createVibeContinuousQueue(queueInput);
  const byRun=new Map();
  for(const row of Array.isArray(runArtifacts)?runArtifacts:[]){
    const runId=clean(row?.runId||row?.id);
    if(!runId)continue;
    const names=Array.isArray(row?.artifactNames)?row.artifactNames:Array.isArray(row?.artifacts)?row.artifacts:[];
    byRun.set(runId,new Set(names.map(clean).filter(Boolean)));
  }
  if(!byRun.size)return{released:0,releasedTaskIds:[],queue};
  let next=queue;
  const releasedTaskIds=[];
  for(const task of queue.tasks){
    const runId=clean(task.reservationRunId);
    if(task.status!=='running'||clean(task.blocker)||!runId)continue;
    const names=byRun.get(runId);
    if(!names)continue;
    const expected=expectedWorkerArtifactNames(task);
    if(!expected.every(name=>names.has(name)))continue;
    const released=releaseVibeTaskExecutionSlot(next,{
      taskId:task.id,
      evidence:[WORKER_ARTIFACT_SLOT_RELEASE_EVIDENCE,`worker-artifact-run:${runId}`]
    });
    next=released.queue;
    if(released.released)releasedTaskIds.push(task.id);
  }
  return{released:releasedTaskIds.length,releasedTaskIds,queue:next};
}

export function recoverStaleRunningReservations(queueInput, { nowMs = Date.now(), staleMs = DEFAULT_STALE_RUNNING_MS } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    // 과거 asset-development 실행 구간에 혼입된 읽기 전용 연구만 구별해 기존 큐로 복귀한다.
    // 실제 게임/에셋 구현과 외부 원칙 미분류 차단은 변경하지 않는다.
    if(task.status==='blocked'
      &&clean(task.blocker)==='VERIFIED_EXTERNAL_PRINCIPLE_SEMANTIC_MAPPING_REQUIRED'
      &&clean(task.department).toLowerCase()==='learning'
      &&clean(task.type).toLowerCase()==='research'
      &&clean(task.gameId)===''
      &&clean(task.id).startsWith('LEARNING-PRACTICE-')
      &&clean(task.sourceRoot).startsWith('learning-practice:')
      &&clean(task.goal).startsWith('[VIBE_LEARNING_PRACTICE]')
      &&task.ownerDevelopmentHold!==true
      &&task.requiresOwnerDecision!==true) {
      recovered+=1;
      return {...task,...clearedReservation(),status:'queued',blocker:null,
        lastOutcome:'RECOVERED_READ_ONLY_RESEARCH_SOURCE_GATE',
        evidence:[...new Set([...(task.evidence||[]),'recovery:read-only-learning-practice-source-gate-v1'])]};
    }
    // [개발 병목 복구] 과거 장문 설계가 신규 게임 요청으로 오인된 기존 작업만 정확히 재판정한다.
    // 실제 신규 제작·승인 보류·플랫폼 보류는 기존 실행 게이트를 통과하지 못하므로 큐를 변경하지 않는다.
    if(task.status==='blocked'
      &&clean(task.blocker)==='EXECUTION_GATE_BLOCKED:company-owner-gate-required'
      &&clean(task.department).toLowerCase()==='development'
      &&clean(task.type).toLowerCase()==='implementation'
      &&['web','roblox'].includes(clean(task.target).toLowerCase())
      &&task.ownerDevelopmentHold!==true
      &&task.requiresOwnerDecision!==true) {
      const sections=String(task.goal||'').split(/\r?\n\s*\[GAME_SPECIFIC_BUILD_UP_DIRECTIVE\](?:\r?\n|$)/i);
      const trustedBuildUp=task.buildUpDirective?.version>=1
        &&clean(task.buildUpDirective?.directiveId)===clean(task.buildUpDirectiveId)
        &&Boolean(clean(task.buildUpDirectiveId))
        &&clean(task.buildUpDirective?.gameId)===clean(task.gameId)
        &&clean(task.buildUpDirective?.sourceRoot)===clean(task.sourceRoot);
      if(trustedBuildUp&&sections.length>1&&clean(task.gameId)) {
        const source=Array.isArray(task.responsibleFiles)?task.responsibleFiles.find(Boolean):null;
        const review=planVibeCoreTask({request:sections[0],target:task.target,gameId:task.gameId,file:source});
        if(review.executionGate?.mayExecute===true) {
          recovered+=1;
          return {...task,...clearedReservation(),status:'queued',blocker:null,
            lastOutcome:'RECOVERED_FALSE_NEW_GAME_GATE',
            evidence:[...new Set([...(task.evidence||[]),'recovery:existing-game-long-context-gate-v1'])]};
        }
      }
    }
    // [무모델·할당량] 실제 게임 소스가 아닌 외부 모델 공급 장애만 유한 대기한다.
    // 대기 해제 후에도 동일한 기존 F0~F9·서버 판정·QA 검증을 반드시 통과해야 한다.
    if(task.status==='blocked'&&['EXTERNAL_AI_QUOTA_COOLDOWN','SOURCE_MODEL_UNAVAILABLE'].includes(clean(task.blocker))){
      const noModel=clean(task.blocker)==='SOURCE_MODEL_UNAVAILABLE';
      const evidence=Array.isArray(task.evidence)?task.evidence:[];
      const prefix=noModel?'source-no-model-retry-at:':'external-ai-quota-retry-at:';
      const marker=evidence.findLast(value=>clean(value).startsWith(prefix));
      const readyAt=Date.parse(clean(marker).slice(prefix.length));
      if(!Number.isFinite(readyAt)||Number(nowMs)<readyAt)return task;
      recovered+=1;
      return {...task,...clearedReservation(),status:'queued',blocker:null,
        lastOutcome:noModel?'MODEL_FREE_SOURCE_RECHECK':'EXTERNAL_AI_QUOTA_WAIT_FINISHED',
        evidence:[...new Set([...evidence,noModel?'source-no-model-retry-resumed:v1':'external-ai-quota-wait-resumed:v1'])]};
    }
    if (task.status !== 'running') return task;
    if (clean(task.department).toLowerCase() !== 'development' || clean(task.type).toLowerCase() !== 'implementation') return task;
    if (isWorkerCapacityReleasedBlocker(task.blocker)) return task;
    // Github 러너가 장시간 대기 중이어도 예약 실행이 종료된 것으로 보지 않는다.
    // 완료/대체 실행을 확인한 기존 회수 경로만 숫자형 실행 예약을 정리한다.
    if (/^\d+$/.test(clean(task.reservationRunId))) return task;
    const reservedAtMs = Date.parse(clean(task.reservedAt));
    const leaseMissing = !Number.isFinite(reservedAtMs);
    const expired = !leaseMissing && (Number(nowMs) - reservedAtMs) > Math.max(60_000, Number(staleMs) || DEFAULT_STALE_RUNNING_MS);
    if (!leaseMissing && !expired) return task;
    recovered += 1;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'STALE_RESERVATION_RECOVERED',
      evidence:[...new Set([...(task.evidence || []), STALE_RUNNING_RECOVERY_EVIDENCE])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

// [복구] 과거 F0 작업주문 생성 시 자산 자동 바인딩 변수 미정의로 작업 생성 전에 종료된 회차만
// 같은 큐에서 한 번 재예약한다. 보호/소유자 보류/외부 학습 승인 상태는 그대로 차단한다.
// 본 재예약은 작업 성공·검증·F0~F9 우회가 아니라 수정된 main에서 작업주문을 다시 만들기 위한 것이다.
export function recoverFixedAssetWorkOrderFailures(queueInput) {
  const queue=createVibeContinuousQueue(queueInput);
  let recovered=0;
  const tasks=queue.tasks.map(task=>{
    const evidence=Array.isArray(task.evidence)?task.evidence:[];
    const crashBeforeSourceWrite=evidence.includes('failure-cause:work-order-not-runnable')
      && evidence.includes('workload:changed-files:0')
      && evidence.some(row=>/^reservation-id:\d+:\d+$/.test(clean(row)));
    const eligible=task.status==='blocked'
      && clean(task.blocker)==='work-order-not-runnable'
      && ['web','roblox'].includes(clean(task.target).toLowerCase())
      && clean(task.department).toLowerCase()==='development'
      && clean(task.type).toLowerCase()==='implementation'
      && task.ownerDevelopmentHold!==true
      && task.requiresOwnerDecision!==true
      && task.protectedChange!==true
      && task.paidResourceRequired!==true
      && !evidence.includes(FIXED_ASSET_WORK_ORDER_REPAIR_EVIDENCE)
      && crashBeforeSourceWrite;
    if(!eligible)return task;
    recovered++;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'RETRY_AFTER_FIXED_ASSET_WORK_ORDER_FAILURE',
      evidence:[...new Set([...evidence,FIXED_ASSET_WORK_ORDER_REPAIR_EVIDENCE])]
    };
  });
  return {recovered,queue:recovered
    ?createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks}):queue};
}

function recoverRunnableInfrastructureState(queueInput) {
  const transport = recoverFixedFullWebTransportFailures(queueInput);
  const sourceGeneration = recoverFixedSourceCandidateGenerationFailures(transport.queue);
  const workOrder = recoverFixedAssetWorkOrderFailures(sourceGeneration.queue);
  const stale = recoverStaleRunningReservations(workOrder.queue);
  return {
    queue:stale.queue,
    recovered:transport.recovered + sourceGeneration.recovered + workOrder.recovered + stale.recovered,
    transportRecovered:transport.recovered,
    sourceGenerationRecovered:sourceGeneration.recovered,
    workOrderRecovered:workOrder.recovered,
    staleRecovered:stale.recovered
  };
}

export function recoverFanInRegressionFailure(queueInput, results = [], { blocker = 'fan-in-regression-failed' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const passing = new Map();
  for (const row of results || []) {
    if (clean(row?.outcome).toUpperCase() !== 'PASS') continue;
    const taskId=clean(row?.taskId);
    if (!taskId) continue;
    const rows=passing.get(taskId) || [];
    rows.push(row);
    passing.set(taskId,rows);
  }
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    const passRows=passing.get(task.id) || [];
    if (!passRows.length || task.status !== 'running') return task;
    if (!/awaiting.*qa|qa.*awaiting|candidate-awaiting-qa-and-deployment|slot-released.*fan-in/i.test(clean(task.blocker))) return task;
    const reservationIds=[...new Set(passRows.map(resultReservationId).filter(Boolean))];
    if (reservationIds.length > 1) return task;
    const expectedReservationId=reservationIds[0] || '';
    if (expectedReservationId && clean(task.reservationId) !== expectedReservationId) return task;
    recovered += 1;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'RETRY_AFTER_FAN_IN_REGRESSION_FAILURE',
      evidence:[...new Set([...(task.evidence || []), `failure-cause:${clean(blocker) || 'fan-in-regression-failed'}`, 'recovery:fan-in-regression-requeue-v1'])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

export function enqueueVibeTask(queueInput, taskInput = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskInput.id);
  const goal = clean(taskInput.goal);
  if (!id) throw new Error('task id required');
  if (!goal) throw new Error('task goal required');
  if (queue.tasks.some((task) => task.id === id)) throw new Error(`duplicate task id: ${id}`);
  const ownerDirective = Boolean(taskInput.ownerDirective);
  // Exact autonomous retries/dispatches for an already active file+goal do not
  // consume another worker. Owner directives are never coalesced or discarded.
  const files=Array.isArray(taskInput.responsibleFiles)
    ?[...new Set(taskInput.responsibleFiles.map(clean).filter(Boolean))].sort():[];
  if(!ownerDirective&&files.length&&queue.tasks.some(task=>{
    const active=['queued','running'].includes(clean(task.status).toLowerCase());
    const existing=[...new Set((task.responsibleFiles||[]).map(clean).filter(Boolean))].sort();
    return active&&task.ownerDirective!==true&&clean(task.gameId)===clean(taskInput.gameId)
      &&clean(task.sourceRoot)===clean(taskInput.sourceRoot)
      &&clean(task.target).toLowerCase()===clean(taskInput.target).toLowerCase()
      &&clean(task.department).toLowerCase()===clean(taskInput.department||'development').toLowerCase()
      &&clean(task.type).toLowerCase()===clean(taskInput.type||'implementation').toLowerCase()
      &&clean(task.goal)===goal&&JSON.stringify(files)===JSON.stringify(existing);
  }))return queue;
  return createVibeContinuousQueue({
    maxConcurrentTasks: queue.maxConcurrentTasks,
    tasks: [...queue.tasks, {
      id,
      gameId: clean(taskInput.gameId) || null,
      target: clean(taskInput.target) || 'auto',
      department: clean(taskInput.department) || 'development',
      type: clean(taskInput.type) || 'implementation',
      assetProductionLane: taskInput.assetProductionLane === true || (taskInput.evidence||[]).map(clean).includes('asset-production-parallel:v1'),
      motionRepairWorkUnit: taskInput.motionRepairWorkUnit,
      goal,
      responsibleFiles: Array.isArray(taskInput.responsibleFiles) ? taskInput.responsibleFiles : [],
      dependencies: Array.isArray(taskInput.dependencies) ? taskInput.dependencies : [],
      priority: priority(taskInput.priority, ownerDirective),
      releaseState: clean(taskInput.releaseState) || 'other',
      status: 'queued',
      retries: 0,
      retryPolicy: clean(taskInput.retryPolicy).toUpperCase() || undefined,
      maxRetries: Math.max(0, Math.min(5, Number(taskInput.maxRetries ?? 2) || 0)),
      ownerDirective,
      requiresOwnerDecision: Boolean(taskInput.requiresOwnerDecision),
      protectedChange: Boolean(taskInput.protectedChange),
      paidResourceRequired: Boolean(taskInput.paidResourceRequired),
      sourceRoot: clean(taskInput.sourceRoot) || null,
      speculativeEligible: Boolean(taskInput.speculativeEligible),
      estimatedRisk: clean(taskInput.estimatedRisk) || 'low',
      atomicNeuronMode: clean(taskInput.atomicNeuronMode) || null,
      atomicCompletionRequired: taskInput.atomicCompletionRequired === true,
      evidence: Array.isArray(taskInput.evidence) ? taskInput.evidence : []
    }]
  });
}

export function ownerDevelopmentHeld(policy = {}, gameId = '', target = '', task = {}) {
  const id=clean(gameId), exclusive=policy.ownerCanonicalRules?.ownerExclusiveDevelopment;
  const newestOwnerScope=resolveActiveOwnerPolicy(policy,{allowMissing:true});
  const scope=newestOwnerScope||policy.directNativeDualPlatformDevelopment?.ownerActiveDevelopmentScope20261009||policy.ownerActiveDevelopmentScope20261009;
  const selected=task?.selectedTask||{};
  const targetName=clean(target||selected.target).toLowerCase();
  const evidence=[...(Array.isArray(task?.evidence)?task.evidence:[]),...(Array.isArray(selected?.evidence)?selected.evidence:[])].map(clean);
  const unityWeb=[task,selected].some(row=>row?.unityWebDevelopment===true||row?.firstStageUnityWeb===true||clean(row?.executionSurface).toUpperCase()==='UNITY_WEB'||clean(row?.studioQualityEvolution?.platformLane).toLowerCase()==='unity-web')||evidence.includes('unity-web-first-stage')||evidence.includes('studio-quality-platform-lane:unity-web')||targetName==='unity_web';
  const platform=targetName==='roblox'?'ROBLOX':['unity','unity_android','unity_web'].includes(targetName)?(unityWeb?'UNITY_WEB':'UNITY_ANDROID'):targetName==='unreal'?'FORTNITE_UEFN':targetName.toUpperCase();
  const assetTargets=policy.assetProductionParallelContract?.activeProductionTargets;
  const assetWork=[task,selected].some(row=>row?.assetProductionLane===true||row?.motionRepairWorkUnit?.scope==='INTERNAL_ASSET_LIBRARY')||evidence.includes('asset-production-parallel:v1')||evidence.includes('company-graphics-library-24h');
  if(assetWork&&Array.isArray(assetTargets)){
    const libraryPlatform=evidence.find(value=>value.startsWith('company-graphics-platform:'))?.split(':')[1];
    const assetPlatform=clean(libraryPlatform||platform).toUpperCase();
    if(!assetTargets.includes(assetPlatform))return true;
    const paths=[task.sourceRoot,task.source?.root,selected.sourceRoot,...(task.responsibleFiles||[]),...(selected.responsibleFiles||[])].map(value=>clean(value).replaceAll('\\','/').replace(/^\.\//,''));
    if(paths.some(file=>/^(?:unity-games|web-games|assets\/(?:unity|web))(?:\/|$)/.test(file)))return true;
  }
  // 최신 승인지시의 플랫폼 판정을 예전 developmentAccess보다 먼저 적용한다.
  // 서명 없는 임의 권한 변경은 적용하지 않으며, 명시적인 게임별 보류는 아래에서 계속 강제한다.
  const access=newestOwnerScope
    ? (newestOwnerScope.effectiveDevelopmentAccess[platform]||
      (platform==='UNITY_ANDROID'?newestOwnerScope.effectiveDevelopmentAccess.UNITY:null))
    : (policy.developmentAccess?.[platform]||
      (platform==='UNITY_ANDROID'?policy.developmentAccess?.UNITY:null));
  if(access==='OWNER_HOLD')return true;
  if(scope?.status==='ACTIVE'){
    const active=Array.isArray(scope.activeTargets)?scope.activeTargets:['ROBLOX'];
    if(targetName==='web'&&!active.includes('WEB'))return true;
    if(['ROBLOX','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'].includes(platform)&&!active.includes(platform))return true;
  }
  return Boolean(id && ((clean(exclusive?.status).toUpperCase()==='ACTIVE'
    && (exclusive?.gameIds||[]).includes(id))
    || (clean(target).toLowerCase()==='roblox' && (policy.robloxDevelopmentInvestment?.ownerHoldGameIds||[]).includes(id))));
}

// OWNER_EXCLUSIVE_DIRECT_DEVELOPMENT: 이 범위의 게임 원본은 오너가 직접 지시한 assistant만 수정한다.
// 작업이 실제로 끝났거나 오너가 범위 해제를 명령하면 기존 Vibe2 큐/소스에서 계속 진행한다.
// 이 함수는 영속화/Actions dispatch 전에 증거를 검증해 release 후보를 반환한다.
// 중앙 정책의 gameIds를 자동 삭제했다고 주장하지 않으며 호출자는 결과를 영속화한 뒤
// 기존 vibe2-24h-runner를 깨워야 한다. 새 큐·파이프라인·PASS 대체 경로는 없다.
export function completeOwnerExclusiveGameScope({
  queueInput={},policy={},gameId='',ownerExplicitRelease=false,completion={}
}={}){
  const id=clean(gameId);
  const rules=policy?.ownerCanonicalRules||{};
  const exclusive=rules.ownerExclusiveDevelopment||{};
  const active=clean(exclusive.status).toUpperCase()==='ACTIVE'
    &&Array.isArray(exclusive.gameIds)&&exclusive.gameIds.includes(id);
  const hold=synchronizeOwnerDevelopmentHolds(queueInput,policy);
  const unchanged=(reason)=>Object.freeze({
    released:false,status:reason,gameId:id||null,policy,queue:hold,
    existingSchedulerWakeRequired:false,sourceOrSaveChanged:false,publicationClaimed:false
  });
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id))return unchanged('INVALID_GAME_ID');
  if(!active)return unchanged('GAME_NOT_IN_OWNER_EXCLUSIVE_SCOPE');
  if(exclusive.handoff?.automaticResumeAfterVerifiedOwnerWork!==true
    &&ownerExplicitRelease!==true)return unchanged('OWNER_AUTO_RESUME_POLICY_REQUIRED');
  const sha=clean(completion?.sourceSha),f9sha=clean(completion?.f9VerifiedSourceSha);
  const checks=completion?.checks||{},publication=completion?.publication||{};
  const scopeTarget=clean(completion?.target).toUpperCase();
  const releaseState=clean(completion?.releaseState).toLowerCase();
  const published=clean(publication.status)==='EXACT_REVISION_PUBLISHED'
    &&publication.sourceSha===sha
    &&/^[1-9]\d*$/.test(String(publication.runId||''))
    &&/^[1-9]\d*$/.test(String(publication.targetId||''));
  const sourceEvidence=/^[0-9a-f]{40}$/.test(sha)&&f9sha===sha
    &&['ROBLOX','WEB'].includes(scopeTarget)
    &&[checks.staticQaRunId,checks.buildRunId,checks.f9RuntimeRunId,checks.securityRunId]
      .every(value=>Number.isSafeInteger(Number(value))&&Number(value)>0)
    &&checks.sourceIntegrityPassed===true&&checks.f0ToF9Verified===true
    &&checks.policyPassed===true&&checks.securityPassed===true;
  // 중앙정책의 명시적 오너 직접 비공개 게시 예외는 F9 PASS를 요구하지 않는다.
  // 해당 경우에도 현재 main 소스 SHA·실제 소스 가드·빌드·기존 Place 게시 근거가
  // 모두 필요하며, 별도 Vibe F0→F9 반복을 완료한 것으로 취급하지 않는다.
  const ownerPublish=policy?.roblox?.deploymentControl?.ownerDirectCanonicalPublishException||{};
  const specificTarget=exclusive.implementationScope?.publicationTarget||{};
  const directPublishAllowed=ownerPublish.enabled===true
    &&(ownerPublish.gameIds||[]).includes(id)
    &&ownerPublish.trigger==='EXPLICIT_OWNER_DIRECT_PUBLISH_INSTRUCTION'
    &&ownerPublish.f9RequiredForOwnerDirectPublish===false
    &&ownerPublish.canonicalPrivateTargetOnly===true
    &&scopeTarget==='ROBLOX';
  const ownerPublishVerified=directPublishAllowed
    &&/^[0-9a-f]{40}$/.test(sha)
    &&completion.mainSourceSha===sha
    &&checks.sourceIntegrityPassed===true
    &&checks.exactMainSourceRevision===true
    &&checks.staticSourceGuardPassed===true
    &&checks.buildPassed===true
    &&checks.securityPassed===true
    &&[checks.staticQaRunId,checks.buildRunId,checks.securityRunId].every(value=>
      Number.isSafeInteger(Number(value))&&Number(value)>0)
    &&published
    &&String(publication.targetId)===String(specificTarget.placeId)
    &&(!completion.temporaryPublishArtifactCreated
      ||checks.temporaryPublishArtifactRemoved===true);
  // 최신 중앙정책은 모든 게임의 실제 배포 증거를 요구한다.
  // 이전 정책으로 생성된 기록은 과거 상태 판독용으로만 해석한다.
  const historicalDevelopmentSkip=policy?.developmentLifecycleMachine?.verifiedF0F9PublicationLoop?.developmentGamePublicationAllowed===false
    &&releaseState==='development-confirmed'&&publication.status==='DEVELOPMENT_PUBLICATION_SKIPPED';
  const standardVerified=sourceEvidence
    &&['development-confirmed','release-confirmed'].includes(releaseState)
    &&(published||historicalDevelopmentSkip);
  const verified=standardVerified||ownerPublishVerified;
  if(!verified&&ownerExplicitRelease!==true)return unchanged('OWNER_WORK_EVIDENCE_OR_PUBLICATION_NOT_VERIFIED');
  const nextPolicy={
    ...policy,ownerCanonicalRules:{...rules,ownerExclusiveDevelopment:{
      ...exclusive,gameIds:exclusive.gameIds.filter(game=>game!==id)
    }}
  };
  const nextQueue=synchronizeOwnerDevelopmentHolds(queueInput,nextPolicy);
  const previousTasks=hold.tasks.filter(task=>task.gameId===id);
  const newlyEligible=nextQueue.tasks.filter(task=>task.gameId===id&&!task.ownerDevelopmentHold
    &&task.status==='queued'&&previousTasks.some(prior=>prior.id===task.id&&prior.ownerDevelopmentHold));
  return Object.freeze({
    released:true,status:ownerPublishVerified&&!standardVerified
      ?'OWNER_DIRECT_PUBLISH_HANDOFF_READY_F0_F9_PENDING'
      :verified?'OWNER_VERIFIED_HANDOFF_READY':'OWNER_EXPLICIT_RELEASE_UNVERIFIED_WORK',
    gameId:id,policy:nextPolicy,queue:nextQueue,
    completionVerified:verified,
    verificationReviewAuthority:'EXISTING_F0_F9_AND_RELEASE_GATES',
    sourceOrSaveChanged:false,publicationClaimed:false,
    newlyUnheldTaskIds:Object.freeze(newlyEligible.map(task=>task.id)),
    existingSchedulerWakeRequired:true,
    schedulerWorkflow:exclusive.handoff?.resumeRoute||'.github/workflows/vibe2-24h-runner.yml',
    handoffRequiresPersistedPolicyAndQueue:true,
    nextEvolutionCycleRequired:true,otherGamesContinue:true,
    // release 후에도 확인된 마지막 소스/원래 QA 체크포인트에서 이어간다.
    checkpointAction:ownerPublishVerified&&!standardVerified
      ?'RESUME_EXISTING_F0_F9_AFTER_OWNER_DIRECT_PUBLISH'
      :verified?'RESUME_EXISTING_BUILD_UP_F0_F9':'RESUME_CAUSAL_REPAIR_WITH_UNVERIFIED_OWNER_WORK',
    finalPublicationAndFanInStillAuthoritative:true
  });
}

export function synchronizeOwnerDevelopmentHolds(queueInput, policy = readJson(CANONICAL_RESERVATION_POLICY),
  {catalog = readJson(CANONICAL_CATALOG_PATH,{games:[]})} = {}) {
  const queue=createVibeContinuousQueue(queueInput);
  // 예약 전 실제 오너 집중 게임·플랫폼을 다시 동기화한다. 오래된 일반 큐도 집중 혜택을 받는다.
  const focus=policy?.developmentLifecycleMachine?.focusedDevelopmentCaretakers||{};
  const focusedIds=new Set(focus.enabled===true&&focus.completionPursuit?.enabled===true
    ?(focus.ownerFocusedGameIds||[]).map(clean):[]);
  const platforms=focus.ownerFocusedGamePlatforms||{};
  const games=new Map((Array.isArray(catalog?.games)?catalog.games:[]).map(game=>[clean(game?.id),game]));
  const ownerStoppedIds=new Set((catalog?.ownerStoppedGameIds||[]).map(clean).filter(Boolean));
  return createVibeContinuousQueue({...queue,tasks:queue.tasks.map(task=>{
    const game=games.get(clean(task.gameId));
    const ownerStopped=ownerStoppedIds.has(clean(task.gameId))||game?.ownerDevelopmentStopped===true
      ||['OWNER_STOPPED','STOPPED'].includes(clean(game?.lifecycleState||game?.canonical?.lifecycle?.state).toUpperCase());
    const retiredWeb=clean(task.target).toLowerCase()==='web'
      &&webSourceRetiredInCatalog(games.get(clean(task.gameId)));
    // 오너 개발중지는 작업 타입·플랫폼·현재 큐 상태와 관계없이 예약을 격리한다.
    const ownerDevelopmentHold=ownerStopped||ownerDevelopmentHeld(policy,task.gameId,task.target,task)||retiredWeb;
    const exactFocus=!ownerDevelopmentHold&&task.status==='queued'
      &&clean(task.department).toLowerCase()==='development'
      &&clean(task.type).toLowerCase()==='implementation'
      &&focusedIds.has(clean(task.gameId))
      &&clean(platforms[task.gameId]).toLowerCase()===clean(task.target).toLowerCase();
    return {
      ...task,ownerDevelopmentHold,
      ...(exactFocus?{ownerFocusedCaretaker:true,focusedCaretaker:true,
        priority:task.priority==='owner-immediate'?'owner-immediate':'critical'}:{})
    };
  })});
}

export function reserveNextVibeTask(queueInput, { maxConcurrentTasks = null, reservation = {}, lane = 'game-primary', policy = readJson(CANONICAL_RESERVATION_POLICY) } = {}) {
  const recovered = recoverRunnableInfrastructureState(queueInput);
  const queue = synchronizeOwnerDevelopmentHolds(recovered.queue,policy);
  const webGameFlowTarget=policy?.developmentSpeedExecution?.webGameFlow?.enabled===true?policy.developmentSpeedExecution.webGameFlow.targetConcurrentGames:0;
  const focus=policy?.assetProductionParallelContract?.parallelism?.internalAssetFocus;
  const internalAssetOnly=focus?.enabled===true&&focus?.exclusive!==false;
  const assetDemandFirst=policy?.assetProductionParallelContract?.parallelism?.qualityFirstDevelopment?.qualityBeforeVolume===true;
  if(clean(lane).toLowerCase()==='asset-development')
    maxConcurrentTasks=Math.min(Number(policy?.assetProductionParallelContract?.parallelism?.assetDevelopmentLaneMax)||63,
      Math.max(1,Number(maxConcurrentTasks)||63));
  const selection = selectVibeQueueBatch(queue, { maxConcurrentTasks, lane, internalAssetOnly, assetDemandFirst, webGameFlowTarget });
  const selected = selection.selected[0];
  if (!selected) return { reserved: false, queue, selection, recovered: recovered.recovered };
  const started = beginVibeQueueTask(queue, selected.id, { maxConcurrentTasks, reservation, lane, internalAssetOnly, assetDemandFirst, webGameFlowTarget });
  return { reserved: started.started, task: started.task || null, queue: started.queue, selection, recovered: recovered.recovered };
}

export function reserveVibeTaskBatch(queueInput, { maxConcurrentTasks = null, reservation = {}, lane = 'game-primary', speculativeExpansionAllowed = true, speculativeExpansionReason = 'AVAILABLE', policy = readJson(CANONICAL_RESERVATION_POLICY) } = {}) {
  const recovered = recoverRunnableInfrastructureState(queueInput);
  const queue=synchronizeOwnerDevelopmentHolds(recovered.queue,policy);
  const laneMode=clean(lane||'game-primary').toLowerCase();
  const webGameFlowTarget=policy?.developmentSpeedExecution?.webGameFlow?.enabled===true?policy.developmentSpeedExecution.webGameFlow.targetConcurrentGames:0;
  const focus=policy?.assetProductionParallelContract?.parallelism?.internalAssetFocus;
  const internalAssetOnly=focus?.enabled===true&&focus?.exclusive!==false;
  const assetDemandFirst=policy?.assetProductionParallelContract?.parallelism?.qualityFirstDevelopment?.qualityBeforeVolume===true;
  if(clean(lane).toLowerCase()==='asset-development')
    maxConcurrentTasks=Math.min(Number(policy?.assetProductionParallelContract?.parallelism?.assetDevelopmentLaneMax)||63,
      Math.max(1,Number(maxConcurrentTasks)||63));
  const started = beginVibeQueueBatch(queue, { maxConcurrentTasks, reservation, lane:laneMode, internalAssetOnly, assetDemandFirst, webGameFlowTarget });
  let tasks = started.tasks || [];
  const reservedTaskOrder = tasks.map((task) => task.id);
  const workerBudget = Math.max(
    tasks.length,
    Math.floor(Number(started.selection?.effectiveMaxConcurrentTasks ?? maxConcurrentTasks ?? queue.maxConcurrentTasks) || tasks.length || 1)
  );
  const speculativeVariants = new Map(tasks.map((task) => [task.id, 1]));
  const speculativePriority = (task) => {
    const text=`${clean(task?.id)} ${clean(task?.goal)} ${clean(task?.packageRole)}`.toLowerCase();
    if (/runtime[-_ ]?repair|diagnostic|cleanup|targeted[-_ ]?repair|bug[-_ ]?fix/.test(text)) return 0;
    if (/web[-_ ]?base[-_ ]?implementation|full[_ -]?web|full[_ -]?rebuild|full_web_game_rebuild/.test(text)) return 2;
    return task?.packageLongWorkProtected===true?2:1;
  };
  const speculativeEligible = (laneMode==='game-primary'?tasks:[]).filter((task) =>
    !['unity','roblox'].includes(clean(task.target).toLowerCase()) &&
    task.estimatedRisk === 'high' &&
    (task.speculativeEligible || task.priority === 'critical')
  ).map((task,index)=>({task,index,priority:speculativePriority(task)}))
    .sort((a,b)=>a.priority-b.priority||a.index-b.index)
    .map(row=>row.task);
  let spareWorkerSlots = speculativeExpansionAllowed===true?Math.max(0, workerBudget - tasks.length):0;
  for (let round = 0; round < 2 && spareWorkerSlots > 0; round += 1) {
    for (const task of speculativeEligible) {
      if (spareWorkerSlots <= 0) break;
      speculativeVariants.set(task.id, (speculativeVariants.get(task.id) || 1) + 1);
      spareWorkerSlots -= 1;
    }
  }
  const selectedIds = new Set(tasks.map((task) => task.id));
  const annotatedQueue = createVibeContinuousQueue({
    maxConcurrentTasks: started.queue.maxConcurrentTasks,
    tasks: started.queue.tasks.map((task) => selectedIds.has(task.id) ? {
      ...task,
      neuronExpectedVariants: speculativeVariants.get(task.id) || 1,
      neuronResults: []
    } : task)
  });
  const annotatedById = new Map(annotatedQueue.tasks.filter((task) => selectedIds.has(task.id)).map((task) => [task.id, task]));
  tasks = reservedTaskOrder.map((id) => annotatedById.get(id)).filter(Boolean);
  return {
    reserved: started.started,
    tasks,
    queue: annotatedQueue,
    selection: started.selection,
    recovered: recovered.recovered,
    speculativeExpansionAllowed:speculativeExpansionAllowed===true,
    speculativeExpansionReason:clean(speculativeExpansionReason)||'AVAILABLE',
    primaryTaskCount:tasks.length,
    workerCount:[...speculativeVariants.values()].reduce((sum,count)=>sum+Number(count||0),0),
    matrix: tasks.map((task) => ({
      taskId: task.id,
      target: clean(task.target).toLowerCase() || 'unknown',
      shard: task.shard,
      packageId: task.packageId || null,
      packageRole: task.packageRole || null,
      longWorkProtected: task.packageLongWorkProtected === true,
      reservationId: task.reservationId || null,
      reservationRunId: task.reservationRunId || null,
      reservationRunAttempt: task.reservationRunAttempt || 0,
      reservedAt: task.reservedAt || null,
      speculativeVariants: speculativeVariants.get(task.id) || 1,
      speculativePriority: speculativePriority(task)
    }))
  };
}

export function markVibeTaskAwaiting(queueInput, { taskId = '', evidence = [], blocker = 'awaiting-qa', expectedReservationId = '', retainedResponsibleFileLocks = [] } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const expected = clean(expectedReservationId);
  let found = false;
  const tasks = queue.tasks.map((task) => {
    if (task.id !== id) return task;
    found = true;
    const currentReservation = clean(task.reservationId);
    const reservationMatches = Boolean(expected && currentReservation && expected === currentReservation);
    const reconcileQueued = task.status === 'queued' && reservationMatches;
    if (expected && !reservationMatches) throw new Error(`await reservation mismatch: ${id}`);
    // 배포 재호출 기록만 추가하고 이미 검증된 웹 작업의 상태·잠금은 보존한다.
    const priorEvidence=task.evidence||[];
    const recoveryEvidence=(evidence||[]).map(clean).filter(Boolean);
    const candidateBranch=[...priorEvidence].reverse().find(value=>/^vibe2\/candidate\//.test(value));
    const candidateSha=[...priorEvidence].reverse().find(value=>/^candidate-sha:[0-9a-f]{40}$/i.test(value));
    const verifiedWebRecovery=task.status==='verified'&&task.target==='web'
      &&['web-f0-f9-verified','web-f9-verified','web-publish-after-f9-required','package-review:all-required-roles-pass','role-result:regression:PASS','role-result:review:PASS'].every(value=>priorEvidence.includes(value))
      &&!priorEvidence.includes('web-publication-retry-resolved')
      &&candidateBranch&&candidateSha
      &&recoveryEvidence.includes('release-dispatch-recovery-requested:'+candidateBranch)
      &&recoveryEvidence.includes('release-dispatch-recovery-candidate-sha:'+candidateSha.slice('candidate-sha:'.length))
      &&recoveryEvidence.some(value=>/^release-dispatch-recovery-at:\d+$/.test(value));
    if(verifiedWebRecovery)return {...task,evidence:[...new Set([...priorEvidence,...recoveryEvidence])]};
    if (task.status !== 'running' && !reconcileQueued) throw new Error(`await requires running task: ${id}`);
    const mergedEvidence = [
      ...(task.evidence || []),
      ...(evidence || []).map(clean).filter(Boolean),
      ...(reconcileQueued ? [`fan-in-reconciled-reservation:${expected}`] : [])
    ];
    return {
      ...task,
      status: 'running',
      blocker: clean(blocker) || 'awaiting-qa',
      retainedResponsibleFileLocks:[...new Set((retainedResponsibleFileLocks||[]).map(clean).filter(Boolean))],
      evidence: [...new Set(mergedEvidence)]
    };
  });
  if (!found) throw new Error(`task not found: ${id}`);
  return createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
}

export function releaseVibeTaskExecutionSlot(queueInput, { taskId = '', evidence = [], blocker = 'slot-released-awaiting-fan-in' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const task = queue.tasks.find((item) => item.id === id);
  if (!task) throw new Error(`task not found: ${id}`);
  if (task.status !== 'running') return { released:false, updated:false, reason:`TASK_${clean(task.status).toUpperCase()}_NOOP`, queue };
  const currentBlocker = clean(task.blocker);
  if (/candidate-awaiting-runtime-evidence|awaiting.*qa|qa.*awaiting/i.test(currentBlocker) || /slot-released.*fan-in/i.test(currentBlocker)) {
    return { released:false, updated:false, reason:'ALREADY_RELEASED', queue };
  }
  const retainedResponsibleFileLocks=[...new Set((task.retainedResponsibleFileLocks||[])
    .map(value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,''))
    .filter(Boolean))];
  const nextQueue = markVibeTaskAwaiting(queue, {
    taskId:id,
    evidence:[
      ...(evidence||[]),
      ...(retainedResponsibleFileLocks.length?[WORKER_SLOT_EXPLICIT_RETAINED_LOCK_EVIDENCE]:[])
    ],
    blocker:clean(blocker) || 'slot-released-awaiting-fan-in',
    retainedResponsibleFileLocks
  });
  return { released:true, updated:true, reason:'RELEASED', queue:nextQueue };
}

export function settleVibeTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {
  return finishVibeQueueTask(queueInput, { taskId, outcome, evidence, blocker, retryable });
}

export function verifyVibeWorkerSynchronization(queueInput, {
  taskId = '', reservationId = '', reservationRunId = '', reservationRunAttempt = 0, reservedAt = ''
} = {}) {
  const queue=createVibeContinuousQueue(queueInput);
  const id=clean(taskId);
  if(!id)throw new Error('VIBE_WORKER_SYNC_TASK_ID_REQUIRED');
  const task=queue.tasks.find(row=>row.id===id);
  if(!task)throw new Error(`VIBE_WORKER_SYNC_TASK_NOT_FOUND:${id}`);
  const failures=[];
  if(task.status!=='running')failures.push(`STATUS_${task.status||'UNKNOWN'}`);
  const expectedReservationId=clean(reservationId);
  const expectedRunId=clean(reservationRunId);
  const expectedReservedAt=clean(reservedAt);
  const expectedAttempt=Math.max(0,Math.floor(Number(reservationRunAttempt)||0));
  if(!expectedReservationId||clean(task.reservationId)!==expectedReservationId)failures.push('RESERVATION_ID_MISMATCH');
  if(!expectedRunId||clean(task.reservationRunId)!==expectedRunId)failures.push('RESERVATION_RUN_ID_MISMATCH');
  if(Number(task.reservationRunAttempt||0)!==expectedAttempt)failures.push('RESERVATION_RUN_ATTEMPT_MISMATCH');
  if(!expectedReservedAt||clean(task.reservedAt)!==expectedReservedAt)failures.push('RESERVED_AT_MISMATCH');
  if(clean(task.blocker))failures.push('TASK_BLOCKED');
  return {
    pass:failures.length===0,
    status:failures.length===0?'PASS':'FAIL',
    taskId:id,
    reservationId:clean(task.reservationId)||null,
    reservationRunId:clean(task.reservationRunId)||null,
    reservationRunAttempt:Number(task.reservationRunAttempt||0),
    reservedAt:clean(task.reservedAt)||null,
    failures
  };
}

function workloadEvidence(row = {}) {
  const metrics=row?.metrics||{};
  const changedFiles=Number(metrics.changedFileCount);
  const addedLines=Number(metrics.addedLineCount);
  const deletedLines=Number(metrics.deletedLineCount);
  const prepMs=Math.max(0,Number(metrics.checkoutMs||0))+Math.max(0,Number(metrics.modelPrepMs||0));
  const cycleMs=Math.max(0,Number(metrics.workerTotalMs||row.durationMs||0));
  const evidence=[];
  if(Number.isFinite(changedFiles))evidence.push(`workload:changed-files:${Math.max(0,changedFiles)}`);
  if(Number.isFinite(addedLines)||Number.isFinite(deletedLines))evidence.push(`workload:changed-lines:${Math.max(0,Number.isFinite(addedLines)?addedLines:0)+Math.max(0,Number.isFinite(deletedLines)?deletedLines:0)}`);
  if(prepMs>0)evidence.push(`workload:prep-ms:${prepMs}`);
  if(cycleMs>0)evidence.push(`workload:cycle-ms:${cycleMs}`);
  return evidence;
}
const CODING_METHOD_FAILURE_CLASSES=new Set(['NO_OP','EDIT_MATCH','MALFORMED_OUTPUT','INVALID_PATH','FULL_REWRITE_SIZE','SEMANTIC_DIFF_BUDGET','TIMEOUT','STUDIO_QUALITY_DELTA','DIAGNOSTIC_POSTCONDITION','SYSTEM_CAUSAL_TEST_REQUIRED','SYSTEM_CANDIDATE_SYNTAX']);
function codingStrategyFailureEvidence(row = {}) {
  if(clean(row?.outcome).toUpperCase()!=='FAIL')return[];
  const coding=row?.codingMethod&&typeof row.codingMethod==='object'?row.codingMethod:{};
  const strategy=clean(coding.strategy);
  const failureFingerprint=clean(coding.failureFingerprint);
  if(!strategy||!failureFingerprint)return[];
  let failureClass=clean(row?.candidateFailure?.class).toUpperCase();
  if(!CODING_METHOD_FAILURE_CLASSES.has(failureClass)){
    if(coding.implementationPass===true&&coding.incrementalQaPass===false)failureClass='INCREMENTAL_QA';
    else if(coding.implementationPass===true&&coding.incrementalQaPass===true&&coding.performanceSanityPass===false)failureClass='PERFORMANCE_SANITY';
    else return[];
  }
  const evidence=(row?.evidence||[]).map(clean).filter(Boolean);
  const runEvidence=evidence.find(value=>value.startsWith('actions-run:'))||'';
  const payload={
    version:1,
    variant:clean(row.variant)||'primary',
    strategy,
    failureFingerprint,
    failureClass,
    runEvidence,
    verifiedBy:'IMMUTABLE_WORKER_RESULT',
    infrastructureFailure:false
  };
  return[`coding-strategy-negative:${encodeURIComponent(JSON.stringify(payload))}`];
}
function neuralWorkerSampleId(row={}) {
  return[
    clean(row?.taskId),
    resultReservationId(row),
    clean(row?.variant)||'primary',
    clean(row?.candidateBranch)
  ].filter(Boolean).join('|')||null;
}
function neuralWorkerFeedback(row = {}) {
  return evaluateNeuralDiagnosisFeedback({
    diagnosis:row?.neuralDiagnosis||null,
    outcome:row?.outcome,
    blocker:row?.blocker,
    candidateFailure:row?.candidateFailure||null,
    roleResults:row?.roleResults||{},
    evidence:Array.isArray(row?.evidence)?row.evidence:[],
    sampleId:neuralWorkerSampleId(row)
  });
}
function neuralWorkerEventType(row={}) {
  const evidence=(Array.isArray(row?.evidence)?row.evidence:[]).map(clean).filter(Boolean);
  const roles=row?.roleResults&&typeof row.roleResults==='object'?row.roleResults:{};
  if(row?.candidateFailure||clean(roles.implementation).toUpperCase()==='FAIL')return'WORKER_RESULT';
  if(clean(roles.test).toUpperCase()==='FAIL'||evidence.some(value=>value.startsWith('incremental-qa-failure-signature:')))return'QA_RESULT';
  return'WORKER_RESULT';
}
export function buildNeuralWorkerTransaction(row = {}) {
  const rowEvidence=Array.isArray(row?.evidence)?row.evidence:[];
  const sampleId=neuralWorkerSampleId(row);
  const feedback=neuralWorkerFeedback(row);
  const critic=critiqueNeuralShadow({diagnosis:row?.neuralDiagnosis||null,feedback,evidence:rowEvidence});
  const rootCause=verifyNeuralRootCause({diagnosis:row?.neuralDiagnosis||null,evidence:rowEvidence,sampleId,verificationStage:'WORKER_RESULT'});
  const eventType=neuralWorkerEventType(row);
  const eventRoute=simulateNeuralEventRoute({
    event:{
      id:[sampleId,eventType].filter(Boolean).join('|')||null,
      type:eventType,
      taskId:clean(row?.taskId)||null,
      outcome:clean(row?.outcome).toUpperCase()||null,
      stage:clean(feedback?.observed?.stage)||null,
      signature:clean(feedback?.observed?.failureSignature)||null,
      evidence:rowEvidence
    },
    diagnosis:row?.neuralDiagnosis||null,
    rootCause,
    policyFresh:true,
    lockConflict:false,
    securityBlocked:rowEvidence.map(clean).includes('SECURITY_POLICY_BLOCK'),
    gatedExecutionEnabled:true
  });
  const evidence=[
    ...neuralFeedbackEvidence(feedback),
    ...neuralCriticEvidence(critic),
    ...neuralRootCauseEvidence(rootCause),
    ...neuralEventRouteEvidence(eventRoute)
  ];
  const atomicSummary={
    version:1,
    sampleId,
    feedback:clean(feedback?.matchState)||'UNKNOWN',
    critic:clean(critic?.verdict)||'UNRESOLVED',
    rootCause:clean(rootCause?.state)||'UNRESOLVED',
    route:clean(eventRoute?.proposedAction?.kind)||'OBSERVE'
  };
  return Object.freeze({
    version:1,
    sampleId,
    feedback,
    critic,
    rootCause,
    eventRoute,
    evidence:Object.freeze([...new Set([
      `neural-atomic-transaction:${encodeURIComponent(JSON.stringify(atomicSummary))}`,
      ...evidence
    ])])
  });
}
function reusableWorkerEvidence(row = {}) {
  const evidence=[];
  const exploration=row?.exploration||{};
  if(clean(exploration.reuseKey))evidence.push(`exploration-reuse:${clean(exploration.reuseKey)}`);
  if(Array.isArray(exploration.impactFiles)&&exploration.impactFiles.length)evidence.push(`exploration-impact:${exploration.impactFiles.map(clean).filter(Boolean).join('|')}`);
  if(Array.isArray(exploration.testTargets)&&exploration.testTargets.length)evidence.push(`exploration-tests:${exploration.testTargets.map(clean).filter(Boolean).join('|')}`);
  const roles=row?.roleResults&&typeof row.roleResults==='object'?row.roleResults:{};
  for(const [role,status] of Object.entries(roles))if(clean(status))evidence.push(`role-result:${clean(role)}:${clean(status)}`);
  const outcome=clean(row?.outcome).toUpperCase();
  if(['FAIL','BLOCKED'].includes(outcome)&&clean(row?.blocker))evidence.push(`failure-cause:${clean(row.blocker)}`);
  return evidence;
}

export function applyVibeFanInResults(queueInput, results = []) {
  let queue = createVibeContinuousQueue(queueInput);
  const grouped = new Map();
  for (const raw of results || []) {
    const id = clean(raw?.taskId);
    if (!id) continue;
    const current=queue.tasks.find(item=>item.id===id);
    const verdict=checkAutonomousCandidate(current,raw);
    const checked=verdict.accepted?raw:{
      ...raw,outcome:'FAIL',blocker:verdict.reason,
      evidence:[...(raw?.evidence||[]),'autonomous-safeguard:'+verdict.category,
        'autonomous-safeguard-requires-causal-repair']
    };
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(checked);
  }
  // [메인] 정규화 전후에 보존되는 작업 순서로 한 번만 위치를 색인한다.
  // 그룹마다 전체 대기열을 재검색하지 않으면서 예약·중복 결과 검사는 기존 흐름을 유지한다.
  const taskIndexById=new Map(queue.tasks.map((task,index)=>[task.id,index]));
  const applied = [];
  for (const [taskId, variants] of grouped.entries()) {
    const currentTask = queue.tasks[taskIndexById.get(taskId)];
    if (!currentTask) { applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'TASK_NOT_FOUND' }); continue; }
    const reservationIds = [...new Set(variants.map(resultReservationId).filter(Boolean))];
    if (reservationIds.length > 1) { applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'RESERVATION_CONFLICT' }); continue; }
    const expectedReservationId = reservationIds[0] || '';
    if (expectedReservationId) {
      if (clean(currentTask.reservationId) !== expectedReservationId) {
        applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'RESERVATION_MISMATCH', expectedReservationId, currentReservationId:clean(currentTask.reservationId) || null });
        continue;
      }
      if (!['running','queued'].includes(clean(currentTask.status))) {
        applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:`TASK_${clean(currentTask.status).toUpperCase()}_NOT_ACTIVE` });
        continue;
      }
    } else if (clean(currentTask.status) !== 'running') {
      applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'LEGACY_NON_RUNNING_RESULT' });
      continue;
    }
    const passes = variants.filter((row) => clean(row.outcome).toUpperCase() === 'PASS');
    const winner = passes.sort((a,b) => Number(a.durationMs || 0) - Number(b.durationMs || 0))[0] || variants[0];
    const transientWorkLock=passes.length===0&&variants.length>0&&variants.every(row=>
      clean(row.outcome).toUpperCase()==='BLOCKED'&&/^work-lock-conflict:/i.test(clean(row.blocker))
    );
    if(transientWorkLock){
      const blockers=[...new Set(variants.map(row=>clean(row.blocker)).filter(Boolean))];
      queue=createVibeContinuousQueue({
        maxConcurrentTasks:queue.maxConcurrentTasks,
        tasks:queue.tasks.map(task=>task.id===taskId?{
          ...task,
          ...clearedReservation(),
          status:'queued',
          blocker:null,
          lastOutcome:'DEFERRED_BY_WORK_LOCK',
          neuronExpectedVariants:0,
          neuronResults:[],
          evidence:[...new Set([...(task.evidence||[]),TRANSIENT_WORK_LOCK_RECOVERY_EVIDENCE,...blockers.map(value=>`transient-work-lock-deferred:${value}`)])]
        }:task)
      });
      applied.push({taskId,outcome:'REQUEUED_TRANSIENT_LOCK',reason:blockers.join('|')||'work-lock-conflict'});
      continue;
    }
    // 외부 무료 API의 한도 또는 확인된 공급자 대기 상태는 게임 소스 실패로 누적하지 않는다.
    // 기존 재시도 횟수와 학습 평가를 변경하지 않고, 정해진 시각에 기존 큐로 복귀한다.
    const quotaFailures=passes.length===0&&variants.length>0&&variants.every(row=>
      clean(row.outcome).toUpperCase()==='FAIL'
      &&clean(row?.candidateFailure?.class).toUpperCase()==='EXTERNAL_AI_UNAVAILABLE'
      &&/(?:HTTP_429|GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE[^\n]*:COOLDOWN)/.test(clean(row?.candidateFailure?.message))
      &&/NEXT_RETRY_AT=/.test(clean(row?.candidateFailure?.message))
    );
    if(quotaFailures){
      const retryTimes=variants.map(row=>{
        const stamp=/NEXT_RETRY_AT=([0-9TZ:.-]+)/.exec(clean(row?.candidateFailure?.message))?.[1];
        return Date.parse(stamp||'');
      }).filter(Number.isFinite);
      if(retryTimes.length===variants.length){
        const retryAt=new Date(Math.max(Date.now()+60_000,Math.min(...retryTimes))).toISOString();
        queue=createVibeContinuousQueue({
          maxConcurrentTasks:queue.maxConcurrentTasks,
          tasks:queue.tasks.map(task=>task.id===taskId?{
            ...task,...clearedReservation(),status:'blocked',blocker:'EXTERNAL_AI_QUOTA_COOLDOWN',
            lastOutcome:'EXTERNAL_AI_QUOTA_WAIT',
            neuronExpectedVariants:0,neuronResults:[],
            evidence:[...new Set([...(task.evidence||[]),
              'external-ai-quota-infrastructure-unavailable:v1',
              'external-ai-quota-retry-at:'+retryAt])]
          }:task)
        });
        applied.push({taskId,outcome:'DEFERRED_EXTERNAL_QUOTA',retryAt});
        continue;
      }
    }
    // [무모델] 기존 결정론적 코드 수리로도 해결하지 못한 실제 생성 작업만 예약 해제.
    // 외부 키 누락·검증된 모델 미존재를 게임 구현 실패나 PASS로 기록하지 않는다.
    // 다른 게임의 결정론적 작업과 QA·자산·배포 작업은 기존 큐에서 계속 실행된다.
    const noModelFailures=passes.length===0&&variants.length>0&&variants.every(row=>{
      if(clean(row.outcome).toUpperCase()!=='FAIL')return false;
      const failureClass=clean(row?.candidateFailure?.class).toUpperCase();
      const message=clean(row?.candidateFailure?.message);
      return (failureClass==='NO_MODEL_SOURCE_REPAIR_UNAVAILABLE'
        &&message.startsWith('ROBLOX_NO_MODEL_SOURCE_REPAIR_UNAVAILABLE'))
        ||(failureClass==='EXTERNAL_AI_UNAVAILABLE'
          &&/GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK|GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK/.test(message)
          &&!/NEXT_RETRY_AT=/.test(message));
    });
    if(noModelFailures){
      const retryAt=new Date(Date.now()+60*60*1000).toISOString();
      queue=createVibeContinuousQueue({
        maxConcurrentTasks:queue.maxConcurrentTasks,
        tasks:queue.tasks.map(task=>{
          if(task.id!==taskId)return task;
          const retained=(task.evidence||[]).filter(value=>!clean(value).startsWith('source-no-model-retry-at:'));
          return {...task,...clearedReservation(),status:'blocked',blocker:'SOURCE_MODEL_UNAVAILABLE',
            lastOutcome:'MODEL_FREE_SOURCE_NOT_APPLICABLE',
            neuronExpectedVariants:0,neuronResults:[],
            evidence:[...new Set([...retained,'model-free-deterministic-unavailable:v1','source-no-model-retry-at:'+retryAt])]};
        })
      });
      applied.push({taskId,outcome:'DEFERRED_NO_MODEL',retryAt});
      continue;
    }
    const neuralTransactions=new Map(variants.map(row=>[row,buildNeuralWorkerTransaction(row)]));
    const neuralVariantFeedback=variants.map(row=>neuralTransactions.get(row).feedback);
    const neuralVariantEvidence=variants.flatMap(row=>neuralTransactions.get(row).evidence);
    const allEvidence = [...new Set(variants.flatMap((row) => [
      ...(Array.isArray(row.evidence) ? row.evidence : []),
      ...workloadEvidence(row),
      ...reusableWorkerEvidence(row),
      ...codingStrategyFailureEvidence(row),
      ...neuralTransactions.get(row).evidence
    ]).map(clean).filter(Boolean))];
    if (passes.length) {
      const practiceWinner=passes.find(row=>{
        const ev=(Array.isArray(row.evidence)?row.evidence:[]).map(clean);
        return ev.includes('learning-practice-only')&&ev.includes('production-pass:NO');
      });
      if(practiceWinner){
        const practiceEvidence=[...new Set([
          ...allEvidence,
          'learning-practice-complete',
          'production-pass:NO',
          'source-write:NO'
        ])];
        const settled=settleVibeTask(queue,{taskId,outcome:'PASS',evidence:practiceEvidence,blocker:'',retryable:false});
        queue=settled.queue;
        applied.push({taskId,outcome:'DONE_PRACTICE',winner:clean(practiceWinner.variant)||'primary'});
        continue;
      }
      const winnerEvidence = [
        ...(Array.isArray(winner.evidence) ? winner.evidence.map(clean).filter(Boolean) : []),
        ...workloadEvidence(winner),
        ...reusableWorkerEvidence(winner)
      ];
      const losingStrategyFailureEvidence=variants
        .filter(row=>row!==winner&&clean(row?.outcome).toUpperCase()==='FAIL')
        .flatMap(codingStrategyFailureEvidence);
      const variantSummary = variants.map((row) => `speculative-result:${clean(row.variant) || 'primary'}:${clean(row.outcome).toUpperCase() || 'UNKNOWN'}`);
      queue = markVibeTaskAwaiting(queue, {
        taskId,
        blocker: clean(winner.blocker) || 'candidate-awaiting-qa-and-deployment',
        expectedReservationId,
        evidence: [...winnerEvidence, ...losingStrategyFailureEvidence, ...neuralVariantEvidence, ...variantSummary, `speculative-variants:${variants.length}`, `speculative-winner:${clean(winner.variant) || 'primary'}`]
      });
      applied.push({ taskId, outcome:'AWAIT', winner: clean(winner.variant) || 'primary', neuralFeedback:neuralVariantFeedback });
      continue;
    }
    const blocked = variants.every((row) => clean(row.outcome).toUpperCase() === 'BLOCKED');
    const outcome = blocked ? 'BLOCKED' : 'FAIL';
    const blocker=clean(winner.blocker) || (blocked ? 'worker-route-blocked' : 'parallel-candidate-generation-failed');
    const failureClass=clean(winner?.candidateFailure?.class).toUpperCase()||'UNCLASSIFIED';
    const gatedTransaction=variants.map(row=>neuralTransactions.get(row)).find(transaction=>transaction?.eventRoute?.fireAllowed===true)||null;
    const gatedAction=clean(gatedTransaction?.eventRoute?.proposedAction?.kind);
    const retryStrategyEvidence=outcome==='FAIL'&&gatedTransaction
      ?[`neural-gated-retry-strategy:${failureClass}`,`retry-strategy-must-change-after:${failureClass}`]
      :[];
    const gatedExecutionEvidence=gatedTransaction
      ?[
        `neural-gated-execution:${gatedAction||'ACTION'}`,
        'neural-gated-queue-mutation:REQUEUE_REPRIORITIZE',
        'neural-gated-worker-refill-eligible'
      ]
      :[];
    const settled = settleVibeTask(queue, {
      taskId,
      outcome,
      blocker,
      evidence: [...allEvidence, ...retryStrategyEvidence, ...gatedExecutionEvidence, `failure-cause:${blocker}`],
      retryable: outcome === 'FAIL'
    });
    queue = settled.queue;
    if(outcome==='FAIL'&&gatedTransaction){
      queue=createVibeContinuousQueue({
        maxConcurrentTasks:queue.maxConcurrentTasks,
        tasks:queue.tasks.map(task=>task.id===taskId&&task.status==='queued'
          ?{
            ...task,
            priority:task.priority==='owner-immediate'?'owner-immediate':'high',
            evidence:[...new Set([...(task.evidence||[]),'neural-gated-queue-reprioritized:HIGH'])]
          }
          :task)
      });
    }
    applied.push({ taskId, outcome, neuralFeedback:neuralVariantFeedback, gatedAction:gatedAction||null, retryStrategy:outcome==='FAIL'&&gatedTransaction?failureClass:null });
  }
  const acceptedTaskIds=new Set(applied.filter(row=>clean(row?.outcome)!=='STALE_RESULT_SKIPPED').map(row=>clean(row?.taskId)).filter(Boolean));
  if(acceptedTaskIds.size){
    queue=createVibeContinuousQueue({
      maxConcurrentTasks:queue.maxConcurrentTasks,
      tasks:queue.tasks.map(task=>acceptedTaskIds.has(task.id)?{...task,neuronExpectedVariants:0,neuronResults:[]}:task)
    });
  }
  const durableEvidence=queue.tasks.flatMap(task=>Array.isArray(task.evidence)?task.evidence:[]);
  const neuralCalibration=summarizeNeuralFeedbackEvidence(durableEvidence);
  const neuralEventTelemetry=summarizeNeuralEventShadowEvidence(durableEvidence);
  return { queue, applied, summary: summarizeVibeContinuousQueue(queue), neuralCalibration, neuralEventTelemetry };
}

export function recordVibeNeuronResult(queueInput, rowInput = {}, { expectedVariants = 1, collapseExpectedVariants = false } = {}) {
  let queue = createVibeContinuousQueue(queueInput);
  const taskId = clean(rowInput?.taskId);
  const variant = clean(rowInput?.variant) || 'primary';
  const expected = Math.max(1, Math.min(5, Math.floor(Number(expectedVariants) || 1)));
  const task = queue.tasks.find((item) => item.id === taskId);
  if (!task) return { updated:false, ready:false, slotReleased:false, stale:true, reason:'TASK_NOT_FOUND', taskId, variant, expectedVariants:expected, resultCount:0, queue };
  const rowReservationId = resultReservationId(rowInput);
  if (rowReservationId && clean(task.reservationId) !== rowReservationId) {
    return { updated:false, ready:false, slotReleased:false, stale:true, reason:'RESERVATION_MISMATCH', taskId, variant, expectedVariants:expected, resultCount:(task.neuronResults || []).length, queue };
  }
  if (task.status !== 'running') {
    return { updated:false, ready:false, slotReleased:false, stale:true, reason:`TASK_${clean(task.status).toUpperCase()}_NOT_RUNNING`, taskId, variant, expectedVariants:expected, resultCount:(task.neuronResults || []).length, queue };
  }
  if (isWorkerCapacityReleasedBlocker(task.blocker) && Number(task.neuronExpectedVariants || 0) === 0) {
    return { updated:false, ready:false, slotReleased:true, stale:false, reason:'TASK_ALREADY_MICRO_FANIN_COMPLETE', taskId, variant, expectedVariants:expected, resultCount:0, queue };
  }
  const currentResults = Array.isArray(task.neuronResults) ? task.neuronResults : [];
  const storedExpected = Math.max(0, Number(task.neuronExpectedVariants || 0));
  const joinedExpected = collapseExpectedVariants===true ? expected : Math.max(expected, storedExpected);
  const duplicate = currentResults.some((row) => (clean(row?.variant) || 'primary') === variant && resultReservationId(row) === rowReservationId);
  if (duplicate) {
    return { updated:false, ready:currentResults.length >= joinedExpected, slotReleased:false, stale:false, reason:'DUPLICATE_VARIANT', taskId, variant, expectedVariants:joinedExpected, resultCount:currentResults.length, queue };
  }
  const nextResults = [...currentResults, rowInput];
  queue = createVibeContinuousQueue({
    maxConcurrentTasks: queue.maxConcurrentTasks,
    tasks: queue.tasks.map((item) => item.id === taskId ? { ...item, neuronExpectedVariants:joinedExpected, neuronResults:nextResults } : item)
  });
  if (nextResults.length < joinedExpected) {
    return { updated:true, ready:false, slotReleased:false, stale:false, reason:'AWAITING_VARIANTS', taskId, variant, expectedVariants:joinedExpected, resultCount:nextResults.length, queue };
  }
  const merged = applyVibeFanInResults(queue, nextResults);
  queue = createVibeContinuousQueue({
    maxConcurrentTasks: merged.queue.maxConcurrentTasks,
    tasks: merged.queue.tasks.map((item) => item.id === taskId ? { ...item, neuronExpectedVariants:0, neuronResults:[] } : item)
  });
  const finalTask = queue.tasks.find((item) => item.id === taskId);
  const slotReleased = !finalTask || finalTask.status !== 'running' || isWorkerCapacityReleasedBlocker(finalTask.blocker);
  return {
    updated:true, ready:true, slotReleased, stale:false, reason:'TASK_MICRO_FANIN_COMPLETE',
    taskId, variant, expectedVariants:joinedExpected, resultCount:nextResults.length,
    applied:merged.applied, neuralCalibration:merged.neuralCalibration, neuralEventTelemetry:merged.neuralEventTelemetry, queue
  };
}

export function runQueueCommand(args = {}) {
  const file = queueFileFrom(args);
  const queueFileMissing=!fs.existsSync(file);
  const queueFileBlank=!queueFileMissing&&!clean(fs.readFileSync(file,'utf8'));
  const rawQueue = queueFileMissing || queueFileBlank ? {tasks:[]} : readVibeQueueStorage(file);
  const rawTasks = Array.isArray(rawQueue) ? rawQueue : Array.isArray(rawQueue?.tasks) ? rawQueue.tasks : [];
  const atomicSchemaMigrationNeeded = rawQueue?.scheduling?.atomicNeuronCompletion !== true
    || rawTasks.some((task) => {
      const row=task&&typeof task==='object'?task:{};
      const evidence=Array.isArray(row.evidence)?row.evidence.map(clean):[];
      const presentation=/\[PRESENTATION_PASS:[A-Z_]+\]|\[WEATHER_PRESENTATION\]/i.test(clean(row.goal))
        || evidence.some(value=>/^presentation-pass:|^weather-presentation:v1$|^asset-production-parallel:v1$/i.test(value));
      return !Object.prototype.hasOwnProperty.call(row,'neuronExpectedVariants')
        || !Object.prototype.hasOwnProperty.call(row,'neuronResults')
        || (presentation && (
          clean(row.atomicNeuronMode)!=='PER_TASK_MICRO_FANIN'
          || row.atomicCompletionRequired!==true
          || !evidence.includes('atomic-neuron-stream:presentation')
          || !evidence.includes('atomic-neuron-micro-fanin:per-task')
          || !evidence.includes('graphics-atomic-candidate-isolation-required')
        ));
    });
  const queueStateRecovered=queueFileMissing||queueFileBlank;
  let queue = createVibeContinuousQueue(queueStateRecovered?{...rawQueue,maxConcurrentTasks:EXTERNAL_MATRIX_BATCH_MAX}:rawQueue);
  if(queueStateRecovered)writeJson(file,queue);
  const command = clean(args.command).toLowerCase();
  const reservationPolicy=readJson(CANONICAL_RESERVATION_POLICY);
  const webGameFlowTarget=reservationPolicy?.developmentSpeedExecution?.webGameFlow?.enabled===true?reservationPolicy.developmentSpeedExecution.webGameFlow.targetConcurrentGames:0;
  const transientLockRecovery=['reserve','reserve-batch','neuron-complete'].includes(command)?recoverTransientWorkLockBlocks(queue):{recovered:0,queue};
  queue=transientLockRecovery.queue;
  let automaticMaintenance={cancelled:[],rerouted:[],cooled:[],resumed:[]};
  if(['reserve','reserve-batch'].includes(command)&&process.env.VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY==='1'){
    const cleaned=repairStaleAutonomousQueue(queue,clean(process.env.VIBE2_PREFLIGHT_CONTRACT_SHA));
    const resumed=requeueCooledDownAutoFailures(cleaned.queue);
    const rerouted=rerouteRepeatingAutoFailures(resumed.queue);
    automaticMaintenance={cancelled:cleaned.cancelled,rerouted:rerouted.rerouted,
      cooled:rerouted.cooled,resumed:resumed.resumed};
    if(cleaned.cancelled.length||resumed.resumed.length||rerouted.rerouted.length||rerouted.cooled.length){
      queue=createVibeContinuousQueue(rerouted.queue);
      writeJson(file,queue);
    }
  }
  let result;
  if (command === 'verify-worker-sync') {
    const sync=verifyVibeWorkerSynchronization(queue,{
      taskId:clean(args.id),
      reservationId:clean(args['reservation-id']),
      reservationRunId:clean(args['reservation-run']),
      reservationRunAttempt:Number(args['reservation-attempt']||0),
      reservedAt:clean(args['reserved-at'])
    });
    if(!sync.pass)throw new Error(`VIBE_WORKER_SYNC_FAILED:${sync.failures.join(',')}`);
    result={command,...sync,queue,summary:summarizeVibeContinuousQueue(queue)};
  } else if (command === 'enqueue') {
    queue = enqueueVibeTask(queue, {
      id: args.id, gameId: args.game, target: args.target, department: args.department, type: args.type, goal: args.goal,
      responsibleFiles: list(args.files), dependencies: list(args.dependencies), priority: args.priority, releaseState: args['release-state'],
      maxRetries: args.retries, retryPolicy: args['retry-policy'], ownerDirective: bool(args.owner), requiresOwnerDecision: bool(args['owner-decision']),
      protectedChange: bool(args.protected), paidResourceRequired: bool(args.paid), sourceRoot: args['source-root'],
      speculativeEligible: bool(args.speculative), estimatedRisk: args.risk,
      atomicNeuronMode: args['atomic-neuron-mode'], atomicCompletionRequired: bool(args['atomic-completion-required']),
      evidence: list(args.evidence)
    });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'recover-completed-reservations' || command === 'recover-reservation-runs') {
    const completedRunIds=command==='recover-completed-reservations'
      ?list(args['completed-runs'])
      :list(args.runs);
    const superseded=command==='recover-reservation-runs';
    const recovered=recoverCompletedRunningReservations(queue,{
      completedRunIds,
      noResultRunIds:superseded?[]:list(args['no-result-runs']),
      recoveryOutcome:superseded?'SUPERSEDED_QUEUED_RESERVATION_RECOVERED':'COMPLETED_RESERVATION_RUN_RECOVERED',
      recoveryEvidence:superseded?'recovery:superseded-queued-reservation-v1':COMPLETED_RESERVATION_RUN_RECOVERY_EVIDENCE,
      evidencePrefix:superseded?'superseded-queued-reservation-run':'completed-reservation-run'
    });
    queue=recovered.queue;
    if(recovered.recovered)writeJson(file,queue);
    result={
      command,
      updated:recovered.recovered>0,
      ...recovered,
      summary:summarizeVibeContinuousQueue(queue)
    };
  } else if (command === 'release-completed-worker-artifacts') {
    const input=clean(args.input);
    if(!input)throw new Error('--input artifact index json required');
    const payload=readJson(input,{});
    const runArtifacts=Array.isArray(payload)?payload:(Array.isArray(payload.runs)?payload.runs:[]);
    const released=releaseCompletedWorkerArtifactSlots(queue,{runArtifacts});
    queue=released.queue;
    if(released.released)writeJson(file,queue);
    result={
      command,
      updated:released.released>0,
      ...released,
      summary:summarizeVibeContinuousQueue(queue)
    };
  } else if (command === 'reserve') {
    const executionLane=clean(args.lane)||'game-primary';
    const configuredMaxConcurrentTasks=configuredLaneReservationMax(executionLane,args.max,queue.maxConcurrentTasks);
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const ownerFirst=process.env.VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY==='1'
      ?ownerFirstRunnerAllocation(queue,{
        lane:executionLane,requestedMax:configuredMaxConcurrentTasks,
        totalSlots:Number(process.env.VIBE2_HOSTED_RUNNER_LIMIT||20),
        ownerReservedSlots:Number(process.env.VIBE2_OWNER_RESERVED_SLOTS||8),
        observedActiveHostedJobs:process.env.VIBE2_OBSERVED_ACTIVE_HOSTED_JOBS,
        observedCurrentReserveHostedJob:process.env.VIBE2_OBSERVED_CURRENT_RESERVE_HOSTED_JOB
      }):null;
    const reservationMaxConcurrentTasks=ownerFirst?.concurrentCeiling??configuredMaxConcurrentTasks;
    const reserved = ownerFirst?.admissionClosed
      ? {reserved:false,recovered:0,task:null,queue,selection:{stopReason:'OBSERVED_HOSTED_RUNNERS_FULL',selected:[],lane:executionLane}}
      : reserveNextVibeTask(queue, { maxConcurrentTasks: reservationMaxConcurrentTasks, reservation: reservationFromArgs(args), lane:executionLane });
    if (reserved.reserved || reserved.recovered || transientLockRecovery.recovered || atomicSchemaMigrationNeeded) writeJson(file, reserved.queue);
    result = { command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, reservationMaxConcurrentTasks, adaptiveControl, schemaMigrated:atomicSchemaMigrationNeeded, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane, webGameFlowTarget }) };
  } else if (command === 'reserve-batch') {
    const executionLane=clean(args.lane)||'game-primary';
    const configuredMaxConcurrentTasks=configuredLaneReservationMax(executionLane,args.max,queue.maxConcurrentTasks);
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const ownerFirst=process.env.VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY==='1'
      ?ownerFirstRunnerAllocation(queue,{
        lane:executionLane,requestedMax:configuredMaxConcurrentTasks,
        totalSlots:Number(process.env.VIBE2_HOSTED_RUNNER_LIMIT||20),
        ownerReservedSlots:Number(process.env.VIBE2_OWNER_RESERVED_SLOTS||8),
        observedActiveHostedJobs:process.env.VIBE2_OBSERVED_ACTIVE_HOSTED_JOBS,
        observedCurrentReserveHostedJob:process.env.VIBE2_OBSERVED_CURRENT_RESERVE_HOSTED_JOB
      }):null;
    const reservationMaxConcurrentTasks=ownerFirst?.concurrentCeiling??configuredMaxConcurrentTasks;
    const speculativeExpansion=executionLane==='game-primary'
      ?speculativeExpansionPolicy(adaptiveControl)
      :Object.freeze({allowed:true,reason:'AUXILIARY_LANE_UNCHANGED',primaryCoveragePreserved:true});
    const reserved = ownerFirst?.admissionClosed
      ? {reserved:false,recovered:0,queue,tasks:[],matrix:[],workerCount:0,primaryTaskCount:0,
         speculativeExpansionAllowed:false,speculativeExpansionReason:'OBSERVED_HOSTED_RUNNERS_FULL',
         selection:{stopReason:'OBSERVED_HOSTED_RUNNERS_FULL',selected:[],lane:executionLane,freeSlots:0,
           capacityRunning:[],effectiveMaxConcurrentTasks:reservationMaxConcurrentTasks}}
      : reserveVibeTaskBatch(queue, {
        maxConcurrentTasks: reservationMaxConcurrentTasks,
        reservation: reservationFromArgs(args),
        lane:executionLane,
        speculativeExpansionAllowed:speculativeExpansion.allowed,
        speculativeExpansionReason:speculativeExpansion.reason
      });
    if (reserved.reserved || reserved.recovered || transientLockRecovery.recovered || atomicSchemaMigrationNeeded) writeJson(file, reserved.queue);
    if (clean(args.output)) {
      const createdAt=new Date().toISOString();
      const requestedMaxConcurrentTasks=reserved.selection?.requestedMaxConcurrentTasks ?? reservationMaxConcurrentTasks;
      const persistentMaxConcurrentTasks=reserved.selection?.persistentMaxConcurrentTasks ?? queue.maxConcurrentTasks;
      writeJson(clean(args.output), {
        version:4, createdAt, matrix:reserved.matrix,
        scheduler:{
          lane:reserved.selection?.lane || executionLane,
          persistentMaxConcurrentTasks,
          configuredMaxConcurrentTasks,
          adaptiveMaxConcurrentTasks,
          reservationMaxConcurrentTasks,
          speculativeExpansionAllowed:reserved.speculativeExpansionAllowed===true,
          speculativeExpansionReason:reserved.speculativeExpansionReason||speculativeExpansion.reason,
          primaryTaskCount:reserved.primaryTaskCount||0,
          workerCount:reserved.workerCount||0,
          requestedMaxConcurrentTasks,
          effectiveMaxConcurrentTasks:reserved.selection?.effectiveMaxConcurrentTasks ?? Math.min(persistentMaxConcurrentTasks, requestedMaxConcurrentTasks),
          freeSlotsBeforeReservation:reserved.selection?.freeSlots ?? 0,
          runningBeforeReservation:reserved.selection?.running?.length ?? 0,
          activeWorkersBeforeReservation:reserved.selection?.capacityRunning?.length ?? 0,
          awaitingQaBeforeReservation:reserved.selection?.awaitingQa?.length ?? 0,
          backpressure:reserved.selection?.backpressure || { awaitingQaCount:0, retryPressureCount:0 },
          blockedCount:reserved.selection?.blocked?.length ?? 0,
          conflictCount:reserved.selection?.deferredConflicts?.length ?? 0,
          workStealingUsed:reserved.selection?.workStealingUsed === true,
          longWorkProtectedSlotUsed:reserved.selection?.longWorkProtectedSlotUsed === true,
          longWorkOwnerTaskId:reserved.selection?.longWorkOwnerTaskId || null,
          shardUse:reserved.selection?.shardUse || {},
          stopReason:reserved.selection?.stopReason || null
        }
      });
    }
    result = { command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, reservationMaxConcurrentTasks, adaptiveControl, speculativeExpansion, schemaMigrated:atomicSchemaMigrationNeeded, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane, webGameFlowTarget }) };
  } else if (command === 'release-slot') {
    const released = releaseVibeTaskExecutionSlot(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    queue = released.queue;
    if (released.updated) writeJson(file, queue);
    result = { command, taskId: clean(args.id), ...released, summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'await') {
    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'neuron-complete') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, {});
    const row = Array.isArray(payload) ? payload[0] : (payload?.result && typeof payload.result === 'object' ? payload.result : payload);
    const executionLane = clean(args.lane) || 'game-primary';
    const configuredMaxConcurrentTasks=configuredLaneReservationMax(executionLane,args.max,queue.maxConcurrentTasks);
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const reservationMaxConcurrentTasks=configuredMaxConcurrentTasks;
    const assetNeuronCollapse=executionLane==='asset-development';
    const neuronExpectedVariants=assetNeuronCollapse?1:(optionalMaxConcurrent(args['expected-variants']) ?? 1);
    const neuron = recordVibeNeuronResult(queue, row, {
      expectedVariants:neuronExpectedVariants,
      collapseExpectedVariants:assetNeuronCollapse
    });
    queue = neuron.queue;
    if (neuron.updated || transientLockRecovery.recovered) writeJson(file, queue);
    const refillSelection=neuron.reason==='TASK_MICRO_FANIN_COMPLETE'
      ?selectVibeQueueBatch(queue,{maxConcurrentTasks:reservationMaxConcurrentTasks,lane:executionLane,webGameFlowTarget})
      :null;
    result = {
      command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks,
      reservationMaxConcurrentTasks, adaptiveControl, ...neuron,
      refillReady:refillSelection?.hasEligibleWork===true,
      refillStopReason:refillSelection?.stopReason||null,
      summary:summarizeVibeContinuousQueue(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane, webGameFlowTarget })
    };
  } else if (command === 'fan-in-regression-fail') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const recovered = recoverFanInRegressionFailure(queue, rows, { blocker:clean(args.blocker) || 'fan-in-regression-failed' });
    queue = recovered.queue;
    if (recovered.recovered) writeJson(file, queue);
    result = { command, updated:recovered.recovered > 0, ...recovered, summary:summarizeVibeContinuousQueue(queue) };
  } else if (command === 'fan-in') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const executionLane=clean(args.lane)||'game-primary';
    const adaptiveEligible=executionLane==='game-primary';
    const currentControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const firstMetrics=rows.find((row)=>row?.metrics)?.metrics || {};
    const taskCount=new Set(rows.map((row)=>clean(row?.taskId)).filter(Boolean)).size;
    const telemetry=computeParallelismTelemetry({
      results:rows,
      tasks:queue.tasks,
      requestedMax:firstMetrics.requestedMax || currentControl.currentMax,
      effectiveMax:firstMetrics.effectiveMax || currentControl.currentMax,
      taskCount
    });
    const nextControl=adaptiveEligible
      ? decideAdaptiveBackpressure(currentControl, telemetry, { minimumMax:adaptiveMinimumConcurrentTasks })
      : currentControl;
    const merged = applyVibeFanInResults(queue, rows);
    queue = merged.queue;
    writeJson(file, queue);
    if(adaptiveEligible)writeJson(controlFileFrom(args), nextControl);
    const configuredMaxConcurrentTasks=configuredLaneReservationMax(executionLane,args.max,queue.maxConcurrentTasks);
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(nextControl,configuredMaxConcurrentTasks,{minimumMax:adaptiveMinimumConcurrentTasks});
    const reservationMaxConcurrentTasks=configuredMaxConcurrentTasks;
    result = {
      command, executionLane, adaptiveEligible, updated: merged.applied.length > 0, telemetry,
      adaptiveControl:nextControl, previousAdaptiveControl:currentControl, ...merged,
      summary:summarizeVibeContinuousQueue(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane, webGameFlowTarget })
    };
  } else if (['pass','fail','block','cancel'].includes(command)) {
    const outcome = command === 'pass' ? 'PASS' : command === 'fail' ? 'FAIL' : command === 'block' ? 'BLOCKED' : 'CANCELLED';
    const settled = settleVibeTask(queue, {
      taskId: clean(args.id), outcome, evidence: list(args.evidence), blocker: clean(args.blocker), retryable: !bool(args['no-retry'])
    });
    if (!settled.updated) throw new Error(`task not found: ${clean(args.id)}`);
    writeJson(file, settled.queue);
    result = { command, ...settled, summary: summarizeVibeContinuousQueue(settled.queue) };
  } else if (command === 'summary') {
    const executionLane=clean(args.lane);
    if(executionLane){
      const configuredMaxConcurrentTasks=configuredLaneReservationMax(executionLane,args.max,queue.maxConcurrentTasks);
      const adaptiveControl=readParallelismControl(args);
      const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
      const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl,configuredMaxConcurrentTasks,{minimumMax:adaptiveMinimumConcurrentTasks});
      const reservationMaxConcurrentTasks=configuredMaxConcurrentTasks;
      const summary=summarizeVibeContinuousQueue(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane, webGameFlowTarget });
      result = {
        command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, reservationMaxConcurrentTasks,
        adaptiveControl, queue, summary,
        selection:selectVibeQueueBatch(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane, webGameFlowTarget })
      };
    } else {
      result = { command, queue, summary: summarizeVibeContinuousQueue(queue), selection: selectVibeQueueBatch(queue) };
    }
  } else throw new Error(`unknown queue command: ${command}`);
  return {...result,queueStateRecovered,automaticMaintenance};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const storageArgs = parseArgs();
  if (['storage-pack','storage-unpack','storage-migrate'].includes(storageArgs.command)) {
    const file = queueFileFrom(storageArgs);
    let enabled=fs.existsSync(path.join(path.dirname(file),'queue','format.json'));
    if (!enabled && storageArgs.command==='storage-migrate') {
      // 기존 24H 계획이 즉시 전환한다. 취소 불가능한 오래된 실행을 기다리지 않는다.
      console.log('VIBE2_QUEUE_STORAGE_MIGRATION='+JSON.stringify({ready:true,reason:'CANONICAL_PLANNER_IMMEDIATE_MIGRATION'}));
      enabled=true;
    }
    let result;
    if (storageArgs.command==='storage-unpack') result=unpackVibeQueueStorage(file);
    else if (enabled) result=packVibeQueueStorage(file);
    else {
      // 첫 형식 전환은 기존 24H 계획의 storage-migrate가 담당한다.
      const legacy=JSON.stringify(readVibeQueueStorage(file))+'\n';
      assertVibeQueueBlobSize(Buffer.byteLength(legacy));
      writeQueueAtomic(file,legacy);
      result={migration:'DEFERRED',bytes:Buffer.byteLength(legacy)};
    }
    const {queue, ...evidence} = result;
    console.log(`VIBE2_QUEUE_STORAGE=${storageArgs.command}:${JSON.stringify(evidence)}`);
    process.exit(0);
  }
  const result = runQueueCommand(parseArgs());
  console.log(`VIBE2_QUEUE_COMMAND=${result.command}`);
  console.log(`VIBE2_QUEUE_STATE_RECOVERED=${result.queueStateRecovered===true?'YES':'NO'}`);
  if(result.executionLane)console.log(`VIBE2_EXECUTION_LANE=${result.executionLane}`);
  if(result.command==='recover-completed-reservations'){
    console.log(`VIBE2_COMPLETED_RESERVATION_RECOVERED=${result.recovered||0}`);
    console.log(`VIBE2_COMPLETED_RESERVATION_RUNS=${(result.recoveredRunIds||[]).join(',')||'NONE'}`);
  }
  if(result.command==='release-completed-worker-artifacts'){
    console.log(`VIBE2_COMPLETED_WORKER_ARTIFACT_SLOTS_RELEASED=${result.released||0}`);
    console.log(`VIBE2_COMPLETED_WORKER_ARTIFACT_TASKS=${(result.releasedTaskIds||[]).join(',')||'NONE'}`);
  }
  if(result.command==='verify-worker-sync'){
    console.log(`VIBE2_WORKER_SYNC=${result.pass===true?'PASS':'FAIL'}`);
    console.log(`VIBE2_WORKER_SYNC_TASK=${result.taskId||'NONE'}`);
    console.log(`VIBE2_WORKER_SYNC_RESERVATION=${result.reservationId||'NONE'}`);
  }
  if(result.reservationMaxConcurrentTasks)console.log(`VIBE2_LANE_RESERVATION_MAX=${result.reservationMaxConcurrentTasks}`);
  if(result.command==='fan-in')console.log(`VIBE2_FANIN_ADAPTIVE_ELIGIBLE=${result.adaptiveEligible===true?'YES':'NO'}`);
  if(Array.isArray(result.dependencyReadyTaskIds)){
    console.log(`VIBE2_DEPENDENCY_READY_BATCH=${result.dependencyReadyTaskIds.join(',')||'NONE'}`);
    console.log(`VIBE2_DEPENDENCY_EVENT_REQUIRED=${result.dependencyEventRequired===true?'YES':'NO'}`);
  }
  if(result.command==='neuron-complete'){
    console.log(`VIBE2_NEURON_RESULT=${result.reason || 'UNKNOWN'}`);
    console.log(`VIBE2_NEURON_TASK_READY=${result.ready===true?'YES':'NO'}`);
    console.log(`VIBE2_NEURON_SLOT_RELEASED=${result.slotReleased===true?'YES':'NO'}`);
    console.log(`VIBE2_NEURON_VARIANTS=${result.resultCount || 0}/${result.expectedVariants || 1}`);
    console.log(`VIBE2_NEURON_REFILL_READY=${result.refillReady===true?'YES':'NO'}`);
    console.log(`VIBE2_NEURON_REFILL_STOP_REASON=${result.refillStopReason||'NONE'}`);
    if(result.executionLane==='asset-development')console.log('VIBE2_ASSET_NEURON_EXPECTED_VARIANTS=1');
  }
  console.log(`VIBE2_QUEUE_RECOVERED=${result.recovered ?? 0}`);
  console.log(`VIBE2_QUEUE_NEXT=${result.summary?.nextTaskId || 'NONE'}`);
  console.log(`VIBE2_QUEUE_NEXT_BATCH=${(result.summary?.nextTaskIds || []).join(',') || 'NONE'}`);
  console.log(`VIBE2_QUEUE_RUNNING=${(result.summary?.runningTaskIds || []).join(',') || 'NONE'}`);
  console.log(`VIBE2_QUEUE_PERSISTENT_MAX=${result.summary?.persistentMaxConcurrentTasks ?? result.summary?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS}`);
  console.log(`VIBE2_QUEUE_REQUESTED_MAX=${result.summary?.requestedMaxConcurrentTasks ?? result.summary?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS}`);
  console.log(`VIBE2_QUEUE_EFFECTIVE_MAX=${result.summary?.effectiveMaxConcurrentTasks ?? result.summary?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS}`);
  console.log(`VIBE2_QUEUE_ACTIVE_WORKERS=${(result.summary?.capacityRunningTaskIds || []).length}`);
  console.log(`VIBE2_QUEUE_AWAITING_QA=${(result.summary?.awaitingQaTaskIds || []).length}`);
  console.log(`VIBE2_QUEUE_QUOTA_WAITING=${(result.summary?.quotaWaitingTaskIds || []).length}`);
  console.log(`VIBE2_QUEUE_FREE_SLOTS=${result.summary?.freeSlots ?? 0}`);
  console.log(`VIBE2_QUEUE_LONG_WORK_SLOT=${result.summary?.longWorkProtectedSlotUsed ? 'USED' : 'NOT_USED'}`);
  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);
  console.log(`VIBE2_BRAIN_LIVE=${result.summary?.brainLive===true?'YES':'NO'}`);
  console.log(`VIBE2_CAUSAL_REPLAN_REQUIRED=${result.summary?.causalReplanRequired===true?'YES':'NO'}`);
  console.log(`VIBE2_QUEUE_RELEASED_WORKER_SLOTS=${(result.summary?.releasedWorkerSlotTaskIds || []).length}`);
  if(result.selection?.webGameFlow?.target){
    console.log(`VIBE2_WEB_FLOW_TARGET=${result.selection.webGameFlow.target}`);
    console.log(`VIBE2_WEB_FLOW_ACTIVE_GAMES=${result.selection.webGameFlow.activeGameIds.join(',')||'NONE'}`);
    console.log(`VIBE2_WEB_FLOW_SHORTFALL=${result.selection.webGameFlow.shortfall}`);
  }
  if(Array.isArray(result.selection?.deferredConflicts)){
    const conflicts=result.selection.deferredConflicts.slice(0,20);
    console.log(`VIBE2_QUEUE_DEFERRED_CONFLICT_COUNT=${result.selection.deferredConflicts.length}`);
    console.log(`VIBE2_QUEUE_DEFERRED_CONFLICTS=${conflicts.map(row=>`${row?.task?.id||'UNKNOWN'}=>${row?.reason||'UNKNOWN'}@${row?.conflictTaskId||'UNKNOWN'}[${row?.conflictExecutionLane||'UNKNOWN'}:${row?.conflictBlocker||'ACTIVE'}]`).join('|')||'NONE'}`);
  }
  if (result.command === 'release-slot') console.log(`VIBE2_SLOT_RELEASED=${result.released ? 'YES' : 'NO'}`);
  if (result.adaptiveControl) {
    console.log(`VIBE2_ADAPTIVE_MAX=${result.adaptiveControl.currentMax}`);
    console.log(`VIBE2_ADAPTIVE_DECISION=${result.adaptiveControl.lastDecision}`);
    console.log(`VIBE2_ADAPTIVE_REASON=${result.adaptiveControl.lastReason}`);
  }
  if (result.telemetry?.workload) {
    console.log(`VIBE2_WORKLOAD_FEATURES_COMPLETED=${result.telemetry.workload.completedFeatureCount}`);
    console.log(`VIBE2_WORKLOAD_CHANGED_FILES=${result.telemetry.workload.changedFileCount}`);
    console.log(`VIBE2_WORKLOAD_CHANGED_LINES=${result.telemetry.workload.changedLineCount}`);
    console.log(`VIBE2_WORKLOAD_REWORK_RATE=${result.telemetry.workload.reworkRatePct}`);
    console.log(`VIBE2_WORKLOAD_QA_DUPLICATE_RATE=${result.telemetry.workload.qaDuplicateRatePct}`);
  }
  if (result.task?.id) console.log(`VIBE2_RESERVED_TASK=${result.task.id}`);
  console.log(`VIBE2_QUEUE_OWNER_HOLD_TASKS=${(result.queue?.tasks||[]).filter(t=>t.status==='queued'&&t.ownerDevelopmentHold).length}`);
  if (result.tasks?.length) console.log(`VIBE2_RESERVED_TASKS=${result.tasks.map((task) => task.id).join(',')}`);
  if (result.matrix) console.log(`VIBE2_RESERVED_MATRIX=${JSON.stringify(result.matrix)}`);
}
