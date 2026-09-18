// 파일명: tools/vibe2-fan-in-review.mjs
// 역할: 전체 회귀가 통과한 뒤 package별 필수 역할 증거를 확인하고 review 결과를 queue에 기록한다.
// 원칙: 게임 소스는 수정하지 않고 queue 증거만 갱신한다. 탐색·구현·QA·성능 중 하나라도 실패/누락이면 review PASS 금지.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const REQUIRED_ROLES=Object.freeze(['exploration','implementation','test','performance']);

function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function taskIdsFromPayload(payload={}){return[...new Set((Array.isArray(payload)?payload:payload.results||[]).map(row=>clean(row?.taskId)).filter(Boolean))];}
function rolePass(evidence,role){return evidence.has(`role-result:${role}:PASS`);}
function reviewReady(task={}){return clean(task.status)==='running'&&/candidate-awaiting-qa-and-deployment|awaiting.*fan-in|awaiting.*qa/i.test(clean(task.blocker));}
function releaseCandidateFromEvidence(evidence=new Set()){
  const branches=[...evidence].map(clean).filter(value=>value.startsWith('vibe2/candidate/'));
  return branches.at(-1)||null;
}

export function finalizeVibe2FanInReview({queue={},taskIds=[]}={}){
  const ids=new Set((taskIds||[]).map(clean).filter(Boolean));
  const reviewed=[];
  const skipped=[];
  const releaseCandidates=[];
  const tasks=(Array.isArray(queue.tasks)?queue.tasks:[]).map(task=>{
    if(!ids.has(clean(task.id)))return task;
    if(!reviewReady(task)){skipped.push({taskId:task.id,status:clean(task.status),blocker:clean(task.blocker)||null});return task;}
    const evidence=new Set((task.evidence||[]).map(clean).filter(Boolean));
    evidence.add('role-result:regression:PASS');
    const missing=REQUIRED_ROLES.filter(role=>!rolePass(evidence,role));
    const candidateBranch=releaseCandidateFromEvidence(evidence);
    if(!candidateBranch)missing.push('candidate-branch');
    if(missing.length){
      evidence.add('role-result:review:BLOCKED');
      evidence.add(`package-review-missing:${missing.join('|')}`);
      reviewed.push({taskId:task.id,pass:false,missing});
    }else{
      evidence.add('role-result:review:PASS');
      evidence.add('package-review:all-required-roles-pass');
      reviewed.push({taskId:task.id,pass:true,missing:[]});
      releaseCandidates.push({taskId:clean(task.id),candidateBranch});
    }
    return{...task,evidence:[...evidence]};
  });
  return{queue:{...queue,tasks},reviewed,skipped,releaseCandidates,pass:reviewed.every(row=>row.pass)};
}

export function runVibe2FanInReview({queueFile='.vibe2/queue.json',inputFile='',outputFile=''}={}){
  if(!clean(inputFile))throw new Error('fan-in input required');
  const queue=readJson(queueFile,{tasks:[]});
  const payload=readJson(inputFile,{results:[]});
  const result=finalizeVibe2FanInReview({queue,taskIds:taskIdsFromPayload(payload)});
  writeJson(queueFile,result.queue);
  if(clean(outputFile))writeJson(outputFile,{version:2,role:'review',sourceWrite:false,reviewed:result.reviewed,skipped:result.skipped,releaseCandidates:result.releaseCandidates,pass:result.pass});
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runVibe2FanInReview({queueFile:clean(args.queue)||'.vibe2/queue.json',inputFile:clean(args.input),outputFile:clean(args.output)});console.log(`VIBE2_FAN_IN_REVIEW=${result.pass?'PASS':'BLOCKED'}`);console.log(`VIBE2_FAN_IN_REVIEW_COUNT=${result.reviewed.length}`);console.log(`VIBE2_FAN_IN_REVIEW_SKIPPED=${result.skipped.length}`);console.log(`VIBE2_FAN_IN_RELEASE_CANDIDATES=${result.releaseCandidates.length}`);console.log('VIBE2_FAN_IN_REVIEW_SOURCE_WRITE=NO');if(!result.pass)process.exitCode=1;}
