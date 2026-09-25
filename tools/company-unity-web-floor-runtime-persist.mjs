import fs from 'node:fs';

const queuePath=process.argv[2]||'development-queue.json';
const evidencePath=process.argv[3]||'';
if(!evidencePath||!fs.existsSync(evidencePath))throw new Error('UNITY_WEB_FLOOR_FAILURE_EVIDENCE_REQUIRED');
const queue=JSON.parse(fs.readFileSync(queuePath,'utf8').replace(/^\uFEFF/,''));
const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8').replace(/^\uFEFF/,''));
const gameId=String(evidence.gameId||'').trim();
if(!gameId)throw new Error('UNITY_WEB_FLOOR_FAILURE_GAME_ID_REQUIRED');
const item=(queue.items||[]).find(row=>row.gameId===gameId);
if(!item)throw new Error('UNITY_WEB_FLOOR_QUEUE_ITEM_MISSING:'+gameId);
const state=String(evidence.state||'').trim().toUpperCase();
if(!['REPAIR_REQUIRED','INFRASTRUCTURE_PENDING'].includes(state))throw new Error('UNITY_WEB_FLOOR_FAILURE_STATE_INVALID:'+state);
const stamp=new Date().toISOString();
const signature=String(evidence.failureSignature||'UNITY_WEB_FLOOR_FAILURE').trim();
const blocker=state==='REPAIR_REQUIRED'
  ?'unity-web-floor-repair-required:'+signature
  :'unity-web-floor-infrastructure-pending:'+signature;
const existing=Array.isArray(item.routingBlockers)?item.routingBlockers.filter(value=>!/^unity-web-floor-(?:repair-required|infrastructure-pending):/.test(String(value))):[];
Object.assign(item,{
  unityWebDevelopmentFloorState:state,
  unityWebFailureStage:String(evidence.failureStage||'UNKNOWN').trim(),
  unityWebFailureSignature:signature,
  unityWebFailureRepairable:evidence.repairable===true,
  unityWebDevelopmentFloorEvidence:{
    version:1,
    gameId,
    state,
    repairable:evidence.repairable===true,
    failureStage:String(evidence.failureStage||'UNKNOWN').trim(),
    failureSignature:signature,
    sourceRevision:String(evidence.sourceRevision||'').trim()||null,
    workflowRunId:Number(evidence.workflowRunId||0)||null,
    workflowRunAttempt:Number(evidence.workflowRunAttempt||0)||null,
    observedAt:String(evidence.observedAt||stamp)
  },
  routingBlockers:[blocker,...existing].slice(0,12),
  updatedAt:stamp
});
queue.updatedAt=stamp;
fs.writeFileSync(queuePath,JSON.stringify(queue,null,2)+'\n');
console.log('UNITY_WEB_FLOOR_RUNTIME_STATE='+state);
console.log('UNITY_WEB_FLOOR_RUNTIME_REPAIRABLE='+(evidence.repairable===true?'YES':'NO'));
console.log('UNITY_WEB_FLOOR_RUNTIME_GAME='+gameId);
