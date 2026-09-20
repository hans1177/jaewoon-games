// 파일명: tools/company-recovery-dispatch.mjs
// 역할: 복구큐의 queued 작업을 해당 실행 풀(Vibe2/Vibe3 또는 supervised system-AI)로 실제 지시한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isSafeSecurityRepairFile } from './company-recovery-queue.mjs';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const now=()=>new Date().toISOString();
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function clearReservation(t){return{...t,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null};}
function securityRepairFiles(rec={}){
  return uniq((rec.evidence||[])
    .map(clean)
    .filter(x=>x.startsWith('security-repair-file:'))
    .map(x=>clean(x.slice('security-repair-file:'.length)))
    .filter(isSafeSecurityRepairFile));
}

export function dispatchRecovery({recoveryInput={},gameQueueInput={},systemAiQueueInput={},route='all',sourceTaskId=''}={}){
  const stamp=now(), mode=clean(route).toLowerCase(), targetSourceTaskId=clean(sourceTaskId);
  const recovery={...recoveryInput,tasks:(recoveryInput.tasks||[]).map(x=>({...x}))};
  const gameQueue={...gameQueueInput,tasks:(gameQueueInput.tasks||[]).map(x=>({...x}))};
  const systemAi={...systemAiQueueInput,tasks:(systemAiQueueInput.tasks||[]).map(x=>({...x}))};
  const dispatched=[];

  recovery.tasks=recovery.tasks.map(rec=>{
    if(clean(rec.status)!=='queued')return rec;
    if(targetSourceTaskId&&clean(rec.sourceTaskId)!==targetSourceTaskId)return rec;
    const owner=clean(rec.recoveryOwner).toUpperCase();
    if(mode!=='all'&&mode==='vibe'&&owner!=='VIBE2_VIBE3')return rec;
    if(mode!=='all'&&mode==='system-ai'&&owner!=='SYSTEM_AI')return rec;
    const ids=uniq([rec.sourceTaskId,...(rec.relatedTaskIds||[])]);
    let touched=0;
    if(owner==='VIBE2_VIBE3'){
      const set=new Set(ids);
      gameQueue.tasks=gameQueue.tasks.map(task=>{
        if(!set.has(clean(task.id)))return task;
        if(clean(task.status)==='done'||clean(task.status)==='cancelled')return task;
        touched++;
        const running=clean(task.status)==='running';
        return{
          ...(running?task:clearReservation(task)),
          status:running?'running':'queued',
          priority:'critical',
          blocker:running?task.blocker:null,
          retries:running?task.retries:0,
          evidence:uniq([...(task.evidence||[]),'recovery-queue:'+clean(rec.id),'recovery-strategy:'+clean(rec.recoveryStrategy),'recovery-exact-stage:'+clean(rec.failureStage)]),
          updatedAt:stamp
        };
      });
    }else if(owner==='SYSTEM_AI'){
      const set=new Set(ids);
      systemAi.tasks=systemAi.tasks.map(task=>{
        if(!set.has(clean(task.id)))return task;
        if(clean(task.status)==='done')return task;
        touched++;
        const running=clean(task.status)==='running';
        return{
          ...task,
          status:running?'running':'queued',
          priority:'critical',
          retries:running?task.retries:0,
          blocker:running?task.blocker:null,
          reservationId:running?task.reservationId:null,
          reservedAt:running?task.reservedAt:null,
          evidence:uniq([...(task.evidence||[]),'recovery-queue:'+clean(rec.id),'recovery-strategy:'+clean(rec.recoveryStrategy),'recovery-exact-stage:'+clean(rec.failureStage)]),
          updatedAt:stamp
        };
      });
    }else return rec;
    if(touched===0){
      if(owner==='SYSTEM_AI'&&clean(rec.sourceQueue).toLowerCase()==='security'){
        const repairFiles=securityRepairFiles(rec);
        return{
          ...rec,
          status:repairFiles.length?'blocked-primary-ai-assignment-required':'blocked-executor-missing',
          dispatchEvidence:uniq([
            ...(rec.dispatchEvidence||[]),
            'security-recovery-executor-missing',
            ...(repairFiles.length?['primary-ai-assignment-required',...repairFiles.map(file=>'primary-ai-repair-file:'+file)]:[]),
            'recovery-dispatch-blocked-at:'+stamp
          ]),
          updatedAt:stamp
        };
      }
      return rec;
    }
    dispatched.push({id:rec.id,owner,touched});
    return{...rec,status:'dispatched',dispatchEvidence:uniq([...(rec.dispatchEvidence||[]),'recovery-dispatched:'+owner.toLowerCase(),'recovery-dispatched-at:'+stamp]),updatedAt:stamp};
  });
  return{recovery,gameQueue,systemAi,dispatched};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const recoveryFile=clean(args.recovery)||'.vibe2/recovery-queue.json';
  const gameFile=clean(args.queue)||'.vibe2/queue.json';
  const systemFile=clean(args['system-ai'])||'.vibe2/system-ai-queue.json';
  const result=dispatchRecovery({
    recoveryInput:readJson(recoveryFile,{tasks:[]}),
    gameQueueInput:readJson(gameFile,{tasks:[]}),
    systemAiQueueInput:readJson(systemFile,{tasks:[]}),
    route:clean(args.route)||'all',
    sourceTaskId:args['source-task']
  });
  writeJson(recoveryFile,result.recovery);
  if(['all','vibe'].includes(clean(args.route||'all').toLowerCase()))writeJson(gameFile,result.gameQueue);
  if(['all','system-ai'].includes(clean(args.route||'all').toLowerCase()))writeJson(systemFile,result.systemAi);
  console.log('RECOVERY_DISPATCH_COUNT='+result.dispatched.length);
  for(const row of result.dispatched)console.log('RECOVERY_DISPATCH='+row.id+':'+row.owner+':'+row.touched);
}
