// 파일명: tools/vibe2-fan-in-review.mjs
// 역할: 전체 회귀가 통과한 뒤 package별 필수 역할 증거를 확인하고 review 결과를 queue에 기록한다.
// 원칙: 게임 소스는 수정하지 않고 queue 증거만 갱신한다. 탐색·구현·QA·성능 중 하나라도 실패/누락이면 review PASS 금지.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSupervisedWebExperienceReview } from './vibe2-experience-control.mjs';
import { verifyNeuralRootCause, neuralRootCauseEvidence } from './vibe2-neural-root-cause.mjs';
import { simulateNeuralEventRoute, neuralEventRouteEvidence } from './vibe2-neural-event-router.mjs';
import { buildNeuralShadowAudit } from './vibe2-neural-shadow-audit.mjs';

const clean=value=>String(value??'').trim();
const REQUIRED_ROLES=Object.freeze(['exploration','implementation','test','performance']);

function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function resultsFromPayload(payload={}){return(Array.isArray(payload)?payload:payload.results||[]).filter(row=>row&&typeof row==='object');}
function taskIdsFromPayload(payload={}){return[...new Set(resultsFromPayload(payload).map(row=>clean(row?.taskId)).filter(Boolean))];}
function posix(value){return clean(value).replaceAll('\\\\','/').replace(/^\.\//,'').replace(/\/+$/,'');}
function resultCandidateBranch(row={}){const explicit=clean(row?.candidateBranch);if(explicit)return explicit;return(row?.evidence||[]).map(clean).filter(value=>value.startsWith('vibe2/candidate/')).at(-1)||null;}
function candidateIdentityFailures(task={},row={},candidateBranch=null){
  const identity=row?.candidateIdentity&&typeof row.candidateIdentity==='object'?row.candidateIdentity:{};
  const failures=[];
  if(clean(row?.outcome).toUpperCase()!=='PASS')failures.push('candidate-result-pass');
  if(candidateBranch&&resultCandidateBranch(row)!==candidateBranch)failures.push('candidate-branch-identity');
  if(clean(identity.taskId)!==clean(task.id))failures.push('candidate-identity-task');
  if(clean(task.gameId)&&clean(identity.gameId)!==clean(task.gameId))failures.push('candidate-identity-game');
  if(clean(task.target)&&clean(identity.target).toLowerCase()!==clean(task.target).toLowerCase())failures.push('candidate-identity-target');
  if(posix(task.sourceRoot)&&posix(identity.sourceRoot)!==posix(task.sourceRoot))failures.push('candidate-identity-source-root');
  if(!clean(row?.baseMainSha)||clean(identity.baseMainSha)!==clean(row?.baseMainSha))failures.push('candidate-identity-base-main');
  return failures;
}
function rolePass(evidence,role){return evidence.has(`role-result:${role}:PASS`);}
function reviewReady(task={}){return clean(task.status)==='running'&&/candidate-awaiting-qa-and-deployment|awaiting.*fan-in|awaiting.*qa|awaiting.*supervised-review/i.test(clean(task.blocker));}
function releaseCandidateFromEvidence(evidence=new Set()){
  const branches=[...evidence].map(clean).filter(value=>value.startsWith('vibe2/candidate/'));
  return branches.at(-1)||null;
}

export function finalizeVibe2FanInReview({queue={},results=[],taskIds=[]}={}){
  const resultRows=Array.isArray(results)?results.filter(row=>row&&typeof row==='object'):[];
  const ids=new Set([...(taskIds||[]).map(clean),...resultRows.map(row=>clean(row?.taskId))].filter(Boolean));
  const reviewed=[];
  const skipped=[];
  const releaseCandidates=[];
  const experienceReviews=[];
  const tasks=(Array.isArray(queue.tasks)?queue.tasks:[]).map(task=>{
    if(!ids.has(clean(task.id)))return task;
    if(!reviewReady(task)){skipped.push({taskId:task.id,status:clean(task.status),blocker:clean(task.blocker)||null});return task;}
    const evidence=new Set((task.evidence||[]).map(clean).filter(Boolean));
    evidence.add('role-result:regression:PASS');
    const missing=REQUIRED_ROLES.filter(role=>!rolePass(evidence,role));
    const candidateBranch=releaseCandidateFromEvidence(evidence);
    let selectedResult=null;
    if(!candidateBranch)missing.push('candidate-branch');
    else{
      const rows=resultRows.filter(row=>clean(row?.taskId)===clean(task.id));
      selectedResult=rows.find(row=>resultCandidateBranch(row)===candidateBranch)||rows.find(row=>clean(row?.outcome).toUpperCase()==='PASS')||null;
      if(!selectedResult)missing.push('candidate-identity-result');
      else missing.push(...candidateIdentityFailures(task,selectedResult,candidateBranch));
    }
    const uniqueMissing=[...new Set(missing)];
    if(uniqueMissing.length){
      evidence.add('role-result:review:BLOCKED');
      evidence.add(`package-review-missing:${uniqueMissing.join('|')}`);
      reviewed.push({taskId:task.id,pass:false,missing:uniqueMissing});
    }else{
      evidence.add('role-result:review:PASS');
      evidence.add('package-review:all-required-roles-pass');
      evidence.add('candidate-identity:PASS');
      const rootCause=verifyNeuralRootCause({
        diagnosis:selectedResult?.neuralDiagnosis||task?.neuralDiagnosis||null,
        evidence:[...evidence,...((selectedResult?.evidence||[]).map(clean).filter(Boolean))]
      });
      for(const marker of neuralRootCauseEvidence(rootCause))evidence.add(marker);
      const neuralEventRoute=simulateNeuralEventRoute({
        event:{
          type:'CI_RESULT',
          taskId:clean(task.id),
          gameId:clean(task.gameId),
          outcome:'PASS',
          stage:'FAN_IN_REVIEW',
          evidence:[...evidence]
        },
        diagnosis:selectedResult?.neuralDiagnosis||task?.neuralDiagnosis||null,
        rootCause,
        policyFresh:!evidence.has('CENTRAL_POLICY_STALE_OR_INVALID'),
        lockConflict:false,
        securityBlocked:evidence.has('SECURITY_POLICY_BLOCK')
      });
      for(const marker of neuralEventRouteEvidence(neuralEventRoute))evidence.add(marker);
      const supervised=task?.supervisionContract?.required===true
        ||evidence.has('supervised-web-build:required')
        ||clean(task?.productionMode)==='SUPERVISED_VIBE_COAUTHORING';
      const supervisionReview=task?.supervisionReview&&typeof task.supervisionReview==='object'?task.supervisionReview:null;
      const supervisionDecision=clean(supervisionReview?.decision).toUpperCase();
      const supervisionVerified=supervisionReview?.verified===true;
      if(supervised&&supervisionVerified&&selectedResult){
        experienceReviews.push(buildSupervisedWebExperienceReview({task,candidateResult:selectedResult,supervisionReview}));
      }
      const supervisionApproved=!supervised||(task?.supervisionApproved===true&&supervisionVerified&&supervisionDecision==='PASS');
      if(supervised&&!supervisionApproved){
        evidence.add('supervised-promotion:BLOCKED');
        evidence.add(supervisionVerified?`supervised-review:${supervisionDecision||'REVISE'}`:'supervised-review:REQUIRED');
        const releaseBlocker=supervisionVerified&&supervisionDecision&&supervisionDecision!=='PASS'?`SUPERVISED_${supervisionDecision}`:'SUPERVISED_APPROVAL_REQUIRED';
        reviewed.push({taskId:task.id,pass:true,missing:[],releaseBlocked:true,releaseBlocker,rootCause,neuralEventRoute});
        return{...task,status:'running',blocker:'candidate-awaiting-supervised-review',evidence:[...evidence]};
      }
      evidence.add(supervised?'supervised-promotion:PASS':'supervised-promotion:NOT_REQUIRED');
      reviewed.push({taskId:task.id,pass:true,missing:[],releaseBlocked:false,releaseBlocker:null,rootCause,neuralEventRoute});
      releaseCandidates.push({taskId:clean(task.id),candidateBranch});
    }
    return{...task,evidence:[...evidence]};
  });
  const neuralShadowAudit=buildNeuralShadowAudit({reviewed});
  return{queue:{...queue,tasks},reviewed,skipped,releaseCandidates,experienceReviews,neuralShadowAudit,pass:reviewed.every(row=>row.pass)};
}

export function runVibe2FanInReview({queueFile='.vibe2/queue.json',inputFile='',outputFile=''}={}){
  if(!clean(inputFile))throw new Error('fan-in input required');
  const queue=readJson(queueFile,{tasks:[]});
  const payload=readJson(inputFile,{results:[]});
  const results=resultsFromPayload(payload);
  const result=finalizeVibe2FanInReview({queue,results,taskIds:taskIdsFromPayload(payload)});
  writeJson(queueFile,result.queue);
  if(clean(outputFile))writeJson(outputFile,{version:4,role:'review',sourceWrite:false,reviewed:result.reviewed,skipped:result.skipped,releaseCandidates:result.releaseCandidates,experienceReviews:result.experienceReviews,neuralShadowAudit:result.neuralShadowAudit,pass:result.pass});
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runVibe2FanInReview({queueFile:clean(args.queue)||'.vibe2/queue.json',inputFile:clean(args.input),outputFile:clean(args.output)});console.log(`VIBE2_FAN_IN_REVIEW=${result.pass?'PASS':'BLOCKED'}`);console.log(`VIBE2_FAN_IN_REVIEW_COUNT=${result.reviewed.length}`);console.log(`VIBE2_FAN_IN_REVIEW_SKIPPED=${result.skipped.length}`);console.log(`VIBE2_FAN_IN_RELEASE_CANDIDATES=${result.releaseCandidates.length}`);console.log('VIBE2_FAN_IN_REVIEW_SOURCE_WRITE=NO');if(!result.pass)process.exitCode=1;}
