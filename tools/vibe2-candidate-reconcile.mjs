// 파일명: tools/vibe2-candidate-reconcile.mjs
// 역할: candidate branch의 엔진 검증 결과를 Vibe2 병렬 큐에 반영한다.
// 원칙: 빌드 성공은 자동 main 승격이나 최종 PASS가 아니라 검증 통과·리뷰 대기 상태로 기록한다. 독립 슬롯이 열리면 즉시 다음 작업을 깨운다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, finishVibeQueueTask, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
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
function verificationEvidence({ target, runId, headSha, conclusion, failureStage = '', failureSignature = '' }) {
  const failed=['failure','timed_out','startup_failure'].includes(clean(conclusion).toLowerCase());
  const stage=clean(failureStage).replace(/[^a-zA-Z0-9_:-]/g,'_').slice(0,100);
  const signature=clean(failureSignature).replace(/[\r\n]+/g,' ').slice(0,180);
  return unique([
    `${clean(target)||'engine'}-verification-run:${clean(runId)}`,
    clean(headSha)?`candidate-head-sha:${clean(headSha)}`:'',
    `verification-conclusion:${clean(conclusion).toLowerCase()}`,
    failed&&stage?`engine-qa-failure-stage:${stage}`:'',
    failed&&signature?`engine-qa-failure-signature:${signature}`:''
  ]);
}
function findTask(queue, candidateBranch) {
  const branch = clean(candidateBranch);
  return queue.tasks.find((task) => (task.evidence || []).includes(branch)) || null;
}
function nextParallel(queue) { return selectVibeQueueBatch(queue, { maxConcurrentTasks: queue.maxConcurrentTasks }); }
function shouldRefill(next) { return Boolean(next?.continueRequired || Number(next?.freeSlots || 0) > 0); }

export function reconcileVibeCandidateVerification(queueInput, { candidateBranch = '', target = 'unity', conclusion = '', runId = '', headSha = '', failureStage = '', failureSignature = '' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const branch = clean(candidateBranch);
  if (!branch.startsWith('vibe2/candidate/')) return Object.freeze({ updated:false, reason:'not-vibe2-candidate', queue, next:nextParallel(queue), dispatchNext:false });
  const task = findTask(queue, branch);
  if (!task) return Object.freeze({ updated:false, reason:'candidate-task-not-found', queue, next:nextParallel(queue), dispatchNext:false });
  const result = clean(conclusion).toLowerCase();
  const existingEvidence=(task.evidence||[]).map(clean);
  const currentStatus=clean(task.status).toLowerCase();
  const currentBlocker=clean(task.blocker);
  const alreadyAdvanced=currentStatus==='verified'
    ||/^candidate-awaiting-(?:roblox|unity)-runtime-qa$/i.test(currentBlocker)
    ||existingEvidence.some(value=>/^(?:roblox|unity)-runtime-await-source-tree:/i.test(value));
  const unchanged=reason=>Object.freeze({
    updated:false,reason,taskId:task.id,verificationPassed:false,finalPass:currentStatus==='verified',
    promotionAllowed:false,learningEligible:false,queue,next:nextParallel(queue),dispatchNext:false
  });
  // [현재 후보 검증] 이전 소스 버전·중복 Actions 완료 알림이 재시도 횟수나 확정된
  // 런타임 체크포인트를 변경하지 못하게 한다. 미확인 SHA는 권한이나 PASS 증거가 아니다.
  if(clean(task.target).toLowerCase()!==clean(target).toLowerCase())return unchanged('candidate-target-mismatch');
  const sha=clean(headSha).toLowerCase();
  const boundCandidateShas=unique(existingEvidence
    .map(row=>row.match(/^candidate-(?:head-)?sha:([a-f0-9]{40})$/i)?.[1]?.toLowerCase())
    .filter(Boolean));
  if(boundCandidateShas.length&&(!/^[a-f0-9]{40}$/.test(sha)||boundCandidateShas.some(value=>value!==sha)))
    return unchanged('candidate-source-revision-mismatch');
  const runMarker=`${clean(target)||'engine'}-verification-run:${clean(runId)}`;
  if(clean(runId)&&existingEvidence.includes(runMarker))return unchanged('duplicate-candidate-verification-run');
  if(['failed','cancelled'].includes(currentStatus))return unchanged('candidate-verification-after-terminal-status');
  if(result!=='success'&&alreadyAdvanced)return unchanged('late-candidate-verification-after-checkpoint');
  const evidence = verificationEvidence({ target, runId, headSha, conclusion: result, failureStage, failureSignature });
  if (result === 'success') {
    const tasks = queue.tasks.map((item) => {
      if(item.id!==task.id)return{...item};
      const mergedEvidence=unique([...(item.evidence || []), ...evidence]);
      if(alreadyAdvanced)return{...item,evidence:mergedEvidence};
      return{
        ...item, status:'blocked', blocker:`candidate-${clean(target) || 'engine'}-verification-passed-awaiting-review`,
        evidence:mergedEvidence, lastOutcome:'ENGINE_QA_PASS'
      };
    });
    const nextQueue=createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks});
    const next=nextParallel(nextQueue);
    return Object.freeze({
      updated:true, taskId:task.id, verificationPassed:true,
      finalPass:currentStatus==='verified', promotionAllowed:false, learningEligible:false,
      queue:nextQueue, next, dispatchNext:shouldRefill(next),
      reason:alreadyAdvanced?'engine-verification-evidence-merged-without-stage-rewind':'engine-verification-passed-awaiting-review'
    });
  }
  if (['failure','timed_out','startup_failure'].includes(result)) {
    // [반복 실패 인과 추적] 같은 실제 실패 단계/식별자는 기존 큐의 cause streak에서
    // 동일 원인으로 묶고, 서로 다른 실패는 같은 원인으로 합치지 않는다.
    const observedStage=clean(failureStage).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,72);
    const observedSignature=clean(failureSignature).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,90);
    const blocker=[`candidate-${clean(target)||'engine'}-verification-failed`,observedStage,observedSignature]
      .filter(Boolean).join(':');
    const failed=finishVibeQueueTask(queue,{ taskId:task.id, outcome:'FAIL', evidence, blocker, retryable:true });
    const next=failed.next;
    return Object.freeze({ ...failed, dispatchNext:shouldRefill(next), taskId:task.id, verificationPassed:false, finalPass:false, promotionAllowed:false, learningEligible:false, reason:'engine-verification-failed' });
  }
  const tasks=queue.tasks.map((item)=>item.id===task.id?{
    ...item,status:'blocked',blocker:`candidate-${clean(target)||'engine'}-verification-incomplete`,evidence:unique([...(item.evidence||[]),...evidence]),lastOutcome:'ENGINE_QA_INCOMPLETE'
  }:{...item});
  const nextQueue=createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks});
  const next=nextParallel(nextQueue);
  return Object.freeze({ updated:true, taskId:task.id, verificationPassed:false, finalPass:false, promotionAllowed:false, learningEligible:false, queue:nextQueue, next, dispatchNext:shouldRefill(next), reason:'engine-verification-incomplete' });
}

export function runCandidateReconcile({ queueFile='.vibe2/queue.json', candidateBranch='', target='unity', conclusion='', runId='', headSha='', failureStage='', failureSignature='' }={}) {
  const queue=readJson(queueFile,{tasks:[]});
  const result=reconcileVibeCandidateVerification(queue,{candidateBranch,target,conclusion,runId,headSha,failureStage,failureSignature});
  if(result.updated)writeJson(queueFile,result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=parseArgs();
  const result=runCandidateReconcile({ queueFile:clean(args.queue)||'.vibe2/queue.json', candidateBranch:clean(args.branch), target:clean(args.target)||'unity', conclusion:clean(args.conclusion), runId:clean(args['run-id']), headSha:clean(args['head-sha']), failureStage:clean(args['failure-stage']), failureSignature:clean(args['failure-signature']) });
  console.log(`VIBE2_RECONCILE_UPDATED=${result.updated?'YES':'NO'}`);
  console.log(`VIBE2_RECONCILE_REASON=${result.reason}`);
  console.log(`VIBE2_FINAL_PASS=${result.finalPass?'YES':'NO'}`);
  console.log(`VIBE2_PROMOTION_ALLOWED=${result.promotionAllowed?'YES':'NO'}`);
  console.log(`VIBE2_RECONCILE_CONTINUE=${result.dispatchNext?'YES':'NO'}`);
}
