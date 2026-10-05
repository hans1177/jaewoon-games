// 파일명: tools/vibe2-release-dispatch-recovery.mjs
// 역할: 검증된 후보의 기존 배포 진입만 복구하며 검증 상태를 새로 만들지 않는다.
import fs from 'node:fs';
import {createVibeContinuousQueue} from '../assets/vibe-continuous-queue.js';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v.map(clean).filter(Boolean):[];
const DEFAULT_COOLDOWN_MS=2*60*1000;

export function selectReviewedWinnerRecoveries(queueInput={}, {nowMs=Date.now(),cooldownMs=DEFAULT_COOLDOWN_MS}={}) {
  const selected=[];
  for(const task of createVibeContinuousQueue(queueInput).tasks) {
    const evidence=list(task?.evidence);
    const webPublicationPending=task.target==='web'&&task.status==='verified'
      &&evidence.includes('web-f0-f9-verified')&&evidence.includes('web-f9-verified')
      &&evidence.includes('web-publish-after-f9-required')
      &&!evidence.includes('web-publication-retry-resolved');
    if(clean(task?.status)!=='running'&&!webPublicationPending) continue;
    const probe=task.runtimeEvidenceCandidate;
    const evidenceOnly=clean(task.blocker)==='candidate-awaiting-runtime-evidence'&&probe?.evidenceOnly===true
      &&probe.taskId===task.id&&probe.gameId===task.gameId&&probe.target==='roblox'&&task.target==='roblox'
      &&/^vibe2\/candidate\//.test(clean(probe.candidateBranch))&&/^[0-9a-f]{40}$/.test(clean(probe.candidateSha));
    if(!evidenceOnly&&!webPublicationPending&&!/candidate-awaiting-qa-and-deployment|awaiting.*qa/i.test(clean(task?.blocker))) continue;
    if(!evidenceOnly&&!evidence.includes('package-review:all-required-roles-pass')) continue;
    if(!evidenceOnly&&!evidence.includes('role-result:regression:PASS')) continue;
    if(!evidenceOnly&&!evidence.includes('role-result:review:PASS')) continue;
    const candidateBranch=evidenceOnly?probe.candidateBranch:[...evidence].reverse().find(x=>/^vibe2\/candidate\//.test(x));
    const candidateSha=evidenceOnly?'candidate-sha:'+probe.candidateSha:[...evidence].reverse().find(x=>/^candidate-sha:[0-9a-f]{7,40}$/i.test(x));
    if(!candidateBranch||!candidateSha) continue;
    if(task.target==='web'&&(!/^candidate-sha:[0-9a-f]{40}$/i.test(candidateSha)
      ||!evidence.includes('web-f0-f9-verified')||!evidence.includes('web-f9-verified')
      ||evidence.includes('web-publication-retry-resolved'))) continue;
    const stamps=evidence
      .filter(x=>/^release-dispatch-recovery-at:\d+$/.test(x))
      .map(x=>Number(x.split(':').pop()))
      .filter(Number.isFinite);
    const last=stamps.length?Math.max(...stamps):0;
    if(last>0 && Number(nowMs)-last<Math.max(60000,Number(cooldownMs)||DEFAULT_COOLDOWN_MS)) continue;
    selected.push({
      ...(evidenceOnly?{evidenceOnly:true}:{}),
      taskId:clean(task.id),
      gameId:clean(task.gameId)||null,
      candidateBranch,
      candidateSha:candidateSha.slice('candidate-sha:'.length),
      blocker:clean(task.blocker)
    });
  }
  return {version:1,kind:'vibe2-reviewed-winner-release-recovery',selected,count:selected.length,gateBypass:false};
}

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const i=raw.indexOf('=');
    if(i<0)out[raw.slice(2)]=true;
    else out[raw.slice(2,i)]=raw.slice(i+1);
  }
  return out;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const queueFile=clean(args.queue)||'.vibe2/queue.json';
  const format=clean(args.format)||'json';
  const queue=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  const result=selectReviewedWinnerRecoveries(queue,{cooldownMs:Number(args['cooldown-ms'])||DEFAULT_COOLDOWN_MS});
  if(format==='tsv'){
    for(const row of result.selected) process.stdout.write([row.taskId,row.candidateBranch,row.candidateSha,row.evidenceOnly===true?'true':'false'].join('\t')+'\n');
  }else{
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }
}
