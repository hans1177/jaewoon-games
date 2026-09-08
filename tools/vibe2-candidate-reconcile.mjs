// 파일명: tools/vibe2-candidate-reconcile.mjs
// 역할: candidate branch의 엔진 검증 결과를 Vibe2 큐에 반영한다.
// 원칙: 빌드 성공은 자동 main 승격이나 최종 PASS가 아니라 검증 통과·리뷰 대기 상태로 기록한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, finishVibeQueueTask, selectNextVibeQueueTask } from '../assets/vibe-continuous-queue.js';

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
function verificationEvidence({ target, runId, headSha, conclusion }) {
  return unique([
    `${clean(target) || 'engine'}-verification-run:${clean(runId)}`,
    clean(headSha) ? `candidate-head-sha:${clean(headSha)}` : '',
    `verification-conclusion:${clean(conclusion).toLowerCase()}`
  ]);
}
function findTask(queue, candidateBranch) {
  const branch = clean(candidateBranch);
  return queue.tasks.find((task) => (task.evidence || []).includes(branch)) || null;
}

export function reconcileVibeCandidateVerification(queueInput, {
  candidateBranch = '',
  target = 'unity',
  conclusion = '',
  runId = '',
  headSha = ''
} = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const branch = clean(candidateBranch);
  if (!branch.startsWith('vibe2/candidate/')) {
    return Object.freeze({ updated: false, reason: 'not-vibe2-candidate', queue, next: selectNextVibeQueueTask(queue) });
  }
  const task = findTask(queue, branch);
  if (!task) {
    return Object.freeze({ updated: false, reason: 'candidate-task-not-found', queue, next: selectNextVibeQueueTask(queue) });
  }
  const result = clean(conclusion).toLowerCase();
  const evidence = verificationEvidence({ target, runId, headSha, conclusion: result });
  if (result === 'success') {
    const tasks = queue.tasks.map((item) => item.id === task.id
      ? {
          ...item,
          status: 'blocked',
          blocker: `candidate-${clean(target) || 'engine'}-verification-passed-awaiting-review`,
          evidence: unique([...(item.evidence || []), ...evidence]),
          lastOutcome: 'ENGINE_QA_PASS'
        }
      : { ...item });
    const nextQueue = createVibeContinuousQueue(tasks);
    const next = selectNextVibeQueueTask(nextQueue);
    return Object.freeze({
      updated: true,
      taskId: task.id,
      verificationPassed: true,
      finalPass: false,
      promotionAllowed: false,
      learningEligible: false,
      queue: nextQueue,
      next,
      dispatchNext: next.continueRequired,
      reason: 'engine-verification-passed-awaiting-review'
    });
  }
  if (['failure', 'timed_out', 'startup_failure'].includes(result)) {
    const failed = finishVibeQueueTask(queue, {
      taskId: task.id,
      outcome: 'FAIL',
      evidence,
      blocker: `candidate-${clean(target) || 'engine'}-verification-failed`,
      retryable: true
    });
    return Object.freeze({
      ...failed,
      taskId: task.id,
      verificationPassed: false,
      finalPass: false,
      promotionAllowed: false,
      learningEligible: false,
      reason: 'engine-verification-failed'
    });
  }
  const tasks = queue.tasks.map((item) => item.id === task.id
    ? {
        ...item,
        status: 'blocked',
        blocker: `candidate-${clean(target) || 'engine'}-verification-incomplete`,
        evidence: unique([...(item.evidence || []), ...evidence]),
        lastOutcome: 'ENGINE_QA_INCOMPLETE'
      }
    : { ...item });
  const nextQueue = createVibeContinuousQueue(tasks);
  const next = selectNextVibeQueueTask(nextQueue);
  return Object.freeze({
    updated: true,
    taskId: task.id,
    verificationPassed: false,
    finalPass: false,
    promotionAllowed: false,
    learningEligible: false,
    queue: nextQueue,
    next,
    dispatchNext: next.continueRequired,
    reason: 'engine-verification-incomplete'
  });
}

export function runCandidateReconcile({
  queueFile = '.vibe2/queue.json',
  candidateBranch = '',
  target = 'unity',
  conclusion = '',
  runId = '',
  headSha = ''
} = {}) {
  const queue = readJson(queueFile, { tasks: [] });
  const result = reconcileVibeCandidateVerification(queue, { candidateBranch, target, conclusion, runId, headSha });
  if (result.updated) writeJson(queueFile, result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = runCandidateReconcile({
    queueFile: clean(args.queue) || '.vibe2/queue.json',
    candidateBranch: clean(args.branch),
    target: clean(args.target) || 'unity',
    conclusion: clean(args.conclusion),
    runId: clean(args['run-id']),
    headSha: clean(args['head-sha'])
  });
  console.log(`VIBE2_RECONCILE_UPDATED=${result.updated ? 'YES' : 'NO'}`);
  console.log(`VIBE2_RECONCILE_REASON=${result.reason}`);
  console.log(`VIBE2_FINAL_PASS=${result.finalPass ? 'YES' : 'NO'}`);
  console.log(`VIBE2_PROMOTION_ALLOWED=${result.promotionAllowed ? 'YES' : 'NO'}`);
  console.log(`VIBE2_RECONCILE_CONTINUE=${result.dispatchNext ? 'YES' : 'NO'}`);
}
