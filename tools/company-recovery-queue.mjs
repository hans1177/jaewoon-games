// 파일명: tools/company-recovery-queue.mjs
// 역할: 반복 실패·공통 병목·retry 소진을 일반 작업큐와 분리해 복구/병목 큐로 관리한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const now=()=>new Date().toISOString();
const SECURITY_REPAIR_ALLOWED_PREFIXES=['tools/','qa/','assets/','.github/workflows/','company-learning/'];
const SECURITY_REPAIR_FORBIDDEN_FILES=new Set([
  'company-learning/platform-release-roadmap.json',
  'company-learning/company-log-map.json',
  'company-learning/company-architecture-map.json'
]);
export function isSafeSecurityRepairFile(file=''){
  const p=clean(file).replaceAll('\\\\','/').replace(/^\.\//,'');
  return Boolean(p)&&!p.startsWith('/')&&!p.includes('..')&&SECURITY_REPAIR_ALLOWED_PREFIXES.some(prefix=>p.startsWith(prefix))&&!SECURITY_REPAIR_FORBIDDEN_FILES.has(p);
}
export function securityRepairEvidence(report={}){
  return uniq((report.findings||[])
    .filter(x=>clean(x.disposition).toUpperCase()!=='REVIEW'&&['HIGH','CRITICAL'].includes(clean(x.severity).toUpperCase()))
    .map(x=>clean(x.file).replaceAll('\\\\','/').replace(/^\.\//,''))
    .filter(isSafeSecurityRepairFile)
    .map(file=>'security-repair-file:'+file));
}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function idFor(row){return clean(row.id)||'recovery-'+crypto.createHash('sha256').update([row.sourceQueue,row.sourceTaskId,row.failureStage,row.failureSignature].map(clean).join('|')).digest('hex').slice(0,20);}
function normalize(row={}){
  return{
    id:idFor(row),status:clean(row.status)||'queued',priority:clean(row.priority)||'high',
    sourceQueue:clean(row.sourceQueue),sourceTaskId:clean(row.sourceTaskId)||null,
    relatedTaskIds:uniq(row.relatedTaskIds),failureStage:clean(row.failureStage),failureSignature:clean(row.failureSignature),
    blastRadius:clean(row.blastRadius)||'single-task',checkpoint:clean(row.checkpoint)||null,
    evidence:uniq(row.evidence),recoveryStrategy:clean(row.recoveryStrategy),verificationPlan:uniq(row.verificationPlan),
    deterministicEvidence:uniq(row.deterministicEvidence),recoveryOwner:clean(row.recoveryOwner)||'SYSTEM_STEWARD_OR_PRIMARY_AI',
    primaryAiReview:clean(row.primaryAiReview)||'PENDING',learningPromotion:clean(row.learningPromotion)||'PENDING',
    retries:Math.max(0,Number(row.retries||0)),maxRetries:Math.max(0,Number(row.maxRetries??5)),
    createdAt:clean(row.createdAt)||now(),updatedAt:clean(row.updatedAt)||now()
  };
}
export function normalizeRecoveryQueue(input={}){
  return{version:1,kind:'company-recovery-queue',policy:'REPEATED_FAILURE_AND_BOTTLENECK_RECOVERY_WITH_VERIFIED_LEARNING',tasks:(input.tasks||[]).map(normalize)};
}
export function enqueueRecovery(queueInput,row={},options={}){
  const queue=normalizeRecoveryQueue(queueInput),item=normalize(row);
  const reactivateDispatched=options?.reactivateDispatched===true;
  if(!item.sourceQueue||!item.failureStage||!item.failureSignature||!item.recoveryStrategy||!item.verificationPlan.length)throw new Error('RECOVERY_REQUIRED_FIELDS_MISSING');
  const existing=queue.tasks.find(x=>x.id===item.id||(x.sourceQueue===item.sourceQueue&&x.sourceTaskId===item.sourceTaskId&&x.failureStage===item.failureStage&&x.failureSignature===item.failureSignature));
  if(existing){
    const supersedeMarker=(existing.evidence||[]).map(clean).find(x=>x.startsWith('superseded-by:'));
    const canonicalId=supersedeMarker?clean(supersedeMarker.slice('superseded-by:'.length)):'';
    const canonical=canonicalId?queue.tasks.find(x=>x.id===canonicalId):null;
    const target=reactivateDispatched&&canonical?.status==='dispatched'?canonical:existing;
    const reactivated=reactivateDispatched&&target.status==='dispatched';
    const tasks=queue.tasks.map(x=>x.id!==target.id?x:{...x,
      status:reactivated?'queued':x.status,
      priority:item.priority||x.priority,relatedTaskIds:uniq([...(x.relatedTaskIds||[]),...(item.relatedTaskIds||[])]),
      evidence:uniq([...(x.evidence||[]),...(item.evidence||[]),...(reactivated?['recovery-reactivated-after-source-refailure']:[])]),blastRadius:item.blastRadius||x.blastRadius,
      checkpoint:item.checkpoint||x.checkpoint,recoveryStrategy:item.recoveryStrategy||x.recoveryStrategy,
      verificationPlan:uniq([...(x.verificationPlan||[]),...(item.verificationPlan||[])]),updatedAt:now()
    });
    return{queue:{...queue,tasks},added:false,reactivated,id:target.id};
  }
  return{queue:{...queue,tasks:[...queue.tasks,item]},added:true,reactivated:false,id:item.id};
}
export function reserveRecovery(queueInput,{max=8}={}){
  const queue=normalizeRecoveryQueue(queueInput),limit=Math.max(1,Math.floor(Number(max)||8));
  const rank=p=>({critical:4,high:3,normal:2,low:1})[clean(p).toLowerCase()]||2;
  const selected=queue.tasks.filter(x=>x.status==='queued').sort((a,b)=>rank(b.priority)-rank(a.priority)||a.createdAt.localeCompare(b.createdAt)).slice(0,limit);
  const ids=new Set(selected.map(x=>x.id)),stamp=now();
  const tasks=queue.tasks.map(x=>ids.has(x.id)?{...x,status:'running',updatedAt:stamp}:x);
  return{queue:{...queue,tasks},tasks:tasks.filter(x=>ids.has(x.id))};
}
export function settleRecovery(queueInput,{id,outcome,evidence=[]}={}){
  const queue=normalizeRecoveryQueue(queueInput),target=clean(id),result=clean(outcome).toUpperCase(),stamp=now();let found=false;
  const tasks=queue.tasks.map(x=>{
    if(x.id!==target)return x;found=true;
    if(result==='PASS')return{...x,status:'awaiting-primary-ai-review',deterministicEvidence:uniq([...(x.deterministicEvidence||[]),...evidence]),primaryAiReview:'PENDING',updatedAt:stamp};
    const retries=x.retries+1,retry=retries<=x.maxRetries;
    return{...x,status:retry?'queued':'failed',retries,evidence:uniq([...(x.evidence||[]),...evidence,'recovery-outcome:'+(result||'FAIL')]),updatedAt:stamp};
  });
  if(!found)throw new Error('RECOVERY_TASK_NOT_FOUND:'+target);return{...queue,tasks};
}
export function applySecurityRecoverySystemAiFanIn(queueInput,systemAiQueueInput,results=[]){
  const queue=normalizeRecoveryQueue(queueInput);
  const systemTasks=new Map((systemAiQueueInput.tasks||[]).map(x=>[clean(x.id),x]).filter(([id])=>id));
  const resultMap=new Map((results||[]).map(x=>[clean(x.taskId),x]).filter(([id])=>id));
  const stamp=now();
  let linked=0;
  const tasks=queue.tasks.map(rec=>{
    const taskId=clean(rec.sourceTaskId);
    if(clean(rec.status)!=='dispatched'||clean(rec.sourceQueue).toLowerCase()!=='security'||clean(rec.recoveryOwner).toUpperCase()!=='SYSTEM_AI'||!taskId)return rec;
    if(!(rec.evidence||[]).includes('primary-ai-security-recovery-assignment:APPROVE'))return rec;
    if(!(rec.evidence||[]).includes('system-ai-assignment:'+taskId))return rec;
    const result=resultMap.get(taskId);
    if(!result)return rec;
    const task=systemTasks.get(taskId);
    if(!task)throw new Error('SECURITY_RECOVERY_SYSTEM_AI_TASK_MISSING:'+taskId);
    if(!(task.evidence||[]).includes('primary-ai-security-recovery-assignment:APPROVE'))throw new Error('SECURITY_RECOVERY_SYSTEM_AI_ASSIGNMENT_EVIDENCE_MISSING:'+taskId);
    if(!(task.evidence||[]).includes('security-recovery:'+rec.id))throw new Error('SECURITY_RECOVERY_SYSTEM_AI_LINK_MISMATCH:'+taskId+':'+rec.id);
    const outcome=clean(result.outcome).toUpperCase();
    if(outcome==='PASS'){
      if(clean(task.status)!=='awaiting-supervisor')throw new Error('SECURITY_RECOVERY_SYSTEM_AI_SUPERVISOR_STATE_REQUIRED:'+taskId+':'+clean(task.status));
      const pr=clean(task.pullRequestUrl||result.pullRequestUrl);
      if(!pr)throw new Error('SECURITY_RECOVERY_SYSTEM_AI_CANDIDATE_PR_REQUIRED:'+taskId);
      linked++;
      return{
        ...rec,
        status:'awaiting-primary-ai-review',
        primaryAiReview:'PENDING',
        deterministicEvidence:uniq([
          ...(rec.deterministicEvidence||[]),
          'system-ai-fan-in:'+taskId,
          'system-ai-outcome:PASS',
          'system-ai-supervision-state:awaiting-supervisor',
          'system-ai-candidate-pr:'+pr
        ]),
        updatedAt:stamp
      };
    }
    if(outcome==='CURRENT_MAIN_SATISFIED'){
      if(clean(task.status)!=='done'||clean(task.lastOutcome)!=='DETERMINISTIC_CURRENT_MAIN_SATISFIED')throw new Error('SECURITY_RECOVERY_SYSTEM_AI_CURRENT_MAIN_STATE_REQUIRED:'+taskId);
      linked++;
      return{
        ...rec,
        status:'awaiting-primary-ai-review',
        primaryAiReview:'PENDING',
        deterministicEvidence:uniq([
          ...(rec.deterministicEvidence||[]),
          'system-ai-fan-in:'+taskId,
          'system-ai-outcome:CURRENT_MAIN_SATISFIED',
          'system-ai-supervision-state:deterministic-current-main-satisfied'
        ]),
        updatedAt:stamp
      };
    }
    if(outcome==='FAIL'){
      linked++;
      const retries=rec.retries+1,retry=retries<=rec.maxRetries;
      return{
        ...rec,
        status:retry?'queued':'failed',
        retries,
        evidence:uniq([
          ...(rec.evidence||[]),
          'system-ai-fan-in:'+taskId,
          'system-ai-recovery-outcome:FAIL',
          ...(clean(result.blocker)?['system-ai-recovery-blocker:'+clean(result.blocker)]:[])
        ]),
        updatedAt:stamp
      };
    }
    throw new Error('SECURITY_RECOVERY_SYSTEM_AI_OUTCOME_UNKNOWN:'+taskId+':'+outcome);
  });
  return{queue:{...queue,tasks},linked};
}

export function reviewRecovery(queueInput,{id,decision,evidence=[]}={}){
  const queue=normalizeRecoveryQueue(queueInput),target=clean(id),review=clean(decision).toUpperCase(),stamp=now();let found=false;
  const tasks=queue.tasks.map(x=>{
    if(x.id!==target)return x;found=true;
    if(x.status!=='awaiting-primary-ai-review')throw new Error('RECOVERY_NOT_REVIEWABLE:'+x.id+':'+x.status);
    if(review==='PASS')return{...x,status:'verified',primaryAiReview:'PASS',evidence:uniq([...(x.evidence||[]),...evidence,'primary-ai-recovery-review:PASS']),updatedAt:stamp};
    return{...x,status:'queued',primaryAiReview:'REWORK',evidence:uniq([...(x.evidence||[]),...evidence,'primary-ai-recovery-review:REWORK']),updatedAt:stamp};
  });
  if(!found)throw new Error('RECOVERY_TASK_NOT_FOUND:'+target);return{...queue,tasks};
}
export function runRecoveryQueue(args={}){
  const file=clean(args.queue)||'.vibe2/recovery-queue.json',cmd=clean(args.command).toLowerCase();
  let queue=normalizeRecoveryQueue(readJson(file,{tasks:[]}));
  if(cmd==='enqueue'){
    const result=enqueueRecovery(queue,{
      id:args.id,priority:args.priority,sourceQueue:args['source-queue'],sourceTaskId:args['source-task'],
      relatedTaskIds:clean(args.related).split(','),failureStage:args.stage,failureSignature:args.signature,
      blastRadius:args['blast-radius'],checkpoint:args.checkpoint,
      evidence:uniq([
        ...clean(args.evidence).split(','),
        ...securityRepairEvidence(clean(args['security-report'])?readJson(clean(args['security-report']),{}):{})
      ]),
      recoveryStrategy:args.strategy,verificationPlan:clean(args.verify).split(','),recoveryOwner:args.owner
    });queue=result.queue;writeJson(file,queue);return{cmd,...result};
  }
  if(cmd==='reserve'){const result=reserveRecovery(queue,{max:args.max});writeJson(file,result.queue);return{cmd,...result};}
  if(cmd==='fan-in-system-ai'){
    const systemFile=clean(args['system-ai']);
    const dir=clean(args.results);
    if(!systemFile||!dir)throw new Error('RECOVERY_SYSTEM_AI_FANIN_INPUT_REQUIRED');
    const rows=[];
    if(fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort())rows.push(readJson(path.join(dir,name),{}));
    const result=applySecurityRecoverySystemAiFanIn(queue,readJson(systemFile,{tasks:[]}),rows);
    queue=result.queue;writeJson(file,queue);return{cmd,queue,linked:result.linked};
  }
  if(cmd==='settle'){queue=settleRecovery(queue,{id:args.id,outcome:args.outcome,evidence:clean(args.evidence).split(',')});writeJson(file,queue);return{cmd,queue};}
  if(cmd==='review'){queue=reviewRecovery(queue,{id:args.id,decision:args.decision,evidence:clean(args.evidence).split(',')});writeJson(file,queue);return{cmd,queue};}
  if(cmd==='summary')return{cmd,queue,counts:queue.tasks.reduce((m,x)=>(m[x.status]=(m[x.status]||0)+1,m),{})};
  throw new Error('RECOVERY_COMMAND_UNKNOWN:'+cmd);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=runRecoveryQueue(parseArgs());
  console.log('COMPANY_RECOVERY_QUEUE='+result.cmd.toUpperCase());
}
