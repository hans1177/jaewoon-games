// WEB_VIBE_1 owner backlog recovery using the existing PWA watchdog.
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
export function recordWebVibeRecoveryFailure(queue,id,{now=new Date().toISOString(),maxAttempts=3}={}){
  const state=assertWebVibeQueue(queue),at=validTime(now);
  const task=state.tasks.find(row=>row.id===id);
  if(!task||!eligible(task))return {queue:state,changed:false};
  const attempts=Math.min(maxAttempts,Math.max(0,Math.floor(Number(task.recoveryAttempts)||0))+1);
  const exhausted=attempts>=maxAttempts,delayMs=attempts*30*60_000;
  const tasks=state.tasks.map(row=>row.id!==id?row:{
    ...row,recoveryAttempts:attempts,recoveryLastFailureAt:new Date(at).toISOString(),
    recoveryNextAt:exhausted?null:new Date(at+delayMs).toISOString(),
    status:exhausted?'blocked':'queued',
    blocker:exhausted?'WEB_VIBE_RECOVERY_REQUIRES_OWNER_REVIEW':null,
    evidence:[...new Set([...(row.evidence||[]),'web-vibe-recovery-failure:needs-source-or-provider-recheck'])]
  });
  return {queue:assertWebVibeQueue({...state,tasks}),changed:true,attempts,exhausted};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,queueFile,id,outputFile]=process.argv.slice(2);
  const queue=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  if(command==='select')console.log(JSON.stringify(selectWebVibeRecoveryTask(queue)));
  else if(command==='failure'){
    const result=recordWebVibeRecoveryFailure(queue,id);
    if(result.changed)fs.writeFileSync(outputFile,JSON.stringify(result.queue,null,2)+'\n');
    console.log(JSON.stringify({changed:result.changed,attempts:result.attempts||0,exhausted:result.exhausted||false}));
  }else throw Error('WEB_VIBE_RECOVERY_COMMAND_INVALID');
}
