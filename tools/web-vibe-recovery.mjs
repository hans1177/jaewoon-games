// 파일명: tools/web-vibe-recovery.mjs
// 메인: 기존 PWA 복구에서 제공자 대기와 소스 실패를 분리한다.
// Queue operations are bounded and never assert QA or publication success.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {assertWebVibeQueue} from './web-vibe-organization.mjs';

const validTime=value=>{
  const t=Date.parse(String(value||''));
  if(!Number.isFinite(t))throw Error('WEB_VIBE_RECOVERY_TIME_INVALID');
  return t;
};
const eligible=task=>task?.ownerDirective===true&&task?.status==='queued'
  &&task?.evidence?.includes('owner-source-authenticated');
export function selectWebVibeRecoveryTask(queue,{now=new Date().toISOString(),maxAttempts=3}={}){
  const state=assertWebVibeQueue(queue),at=validTime(now);
  const task=state.tasks.find(row=>eligible(row)
    &&Math.max(0,Math.floor(Number(row.recoveryAttempts)||0))<maxAttempts
    &&(!row.recoveryNextAt||validTime(row.recoveryNextAt)<=at));
  if(!task)return null;
  return Object.freeze({id:task.id,taskId:task.id.slice(4),gameId:task.gameId,
    files:task.sourceFiles||'*',sourceRoot:task.sourceRoot});
}
export function recordWebVibeRecoveryFailure(queue,id,{now=new Date().toISOString(),maxAttempts=3,failureLog=''}={}){
  const state=assertWebVibeQueue(queue),at=validTime(now);
  const task=state.tasks.find(row=>row.id===id);
  if(!task||!eligible(task))return {queue:state,changed:false};
  // 유틸: 실제 worker의 무료 제공자 제한만 대기 처리한다. 인증·정책·소스 오류는 기존 제한 유지.
  const providerLine=String(failureLog).split(/\r?\n/).find(line=>line.startsWith(
    'WEB_VIBE_WORKER_BLOCKED=GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK:'));
  const transient=providerLine&&/:(?:HTTP_(?:429|500|502|503|504)|COOLDOWN|TRANSPORT_OR_TIMEOUT)(?:,|:|$)/.test(providerLine)
    &&! /:(?:HTTP_(?:400|401|402|403|404)|EMPTY_OUTPUT)(?:,|:|$)/.test(providerLine);
  if(transient){
    const advertised=Date.parse(providerLine.match(/:NEXT_RETRY_AT=([^\s]+)/)?.[1]||'');
    const nextAt=Number.isFinite(advertised)&&advertised>at?advertised:at+30*60_000;
    const tasks=state.tasks.map(row=>row.id!==id?row:{...row,
      recoveryLastFailureAt:new Date(at).toISOString(),recoveryNextAt:new Date(nextAt).toISOString(),
      recoveryFailureClass:'PROVIDER_COOLDOWN',blocker:null,
      evidence:[...new Set([...(row.evidence||[]),'web-vibe-provider-cooldown:source-retry-budget-preserved'])]
    });
    return {queue:assertWebVibeQueue({...state,tasks}),changed:true,
      attempts:Math.max(0,Math.floor(Number(task.recoveryAttempts)||0)),exhausted:false,
      failureClass:'PROVIDER_COOLDOWN',nextRetryAt:new Date(nextAt).toISOString()};
  }
  const attempts=Math.min(maxAttempts,Math.max(0,Math.floor(Number(task.recoveryAttempts)||0))+1);
  const exhausted=attempts>=maxAttempts,delayMs=attempts*30*60_000;
  const tasks=state.tasks.map(row=>row.id!==id?row:{
    ...row,recoveryFailureClass:'SOURCE_OR_UNCLASSIFIED',recoveryAttempts:attempts,recoveryLastFailureAt:new Date(at).toISOString(),
    recoveryNextAt:exhausted?null:new Date(at+delayMs).toISOString(),
    status:exhausted?'blocked':'queued',
    blocker:exhausted?'WEB_VIBE_RECOVERY_REQUIRES_OWNER_REVIEW':null,
    evidence:[...new Set([...(row.evidence||[]),'web-vibe-recovery-failure:needs-source-or-provider-recheck'])]
  });
  return {queue:assertWebVibeQueue({...state,tasks}),changed:true,attempts,exhausted};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,queueFile,id,outputFile,failureFile]=process.argv.slice(2);
  const queue=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  if(command==='select')console.log(JSON.stringify(selectWebVibeRecoveryTask(queue)));
  else if(command==='failure'){
    const failureLog=failureFile&&fs.existsSync(failureFile)?fs.readFileSync(failureFile,'utf8'):'';
    const result=recordWebVibeRecoveryFailure(queue,id,{failureLog});
    if(result.changed)fs.writeFileSync(outputFile,JSON.stringify(result.queue,null,2)+'\n');
    console.log(JSON.stringify({changed:result.changed,attempts:result.attempts||0,exhausted:result.exhausted||false,
      failureClass:result.failureClass||'SOURCE_OR_UNCLASSIFIED',nextRetryAt:result.nextRetryAt||null}));
  }else throw Error('WEB_VIBE_RECOVERY_COMMAND_INVALID');
}
