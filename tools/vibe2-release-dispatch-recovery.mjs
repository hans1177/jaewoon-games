// Reviewed winner release-dispatch recovery. Never creates PASS; it only re-enters the existing release gate.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v.map(clean).filter(Boolean):[];
const DEFAULT_COOLDOWN_MS=2*60*1000;

export function selectReviewedWinnerRecoveries(queueInput={}, {nowMs=Date.now(),cooldownMs=DEFAULT_COOLDOWN_MS}={}) {
  const selected=[];
  for(const task of queueInput?.tasks||[]) {
    if(clean(task?.status)!=='running') continue;
    if(!/candidate-awaiting-qa-and-deployment|awaiting.*qa/i.test(clean(task?.blocker))) continue;
    const evidence=list(task?.evidence);
    if(!evidence.includes('package-review:all-required-roles-pass')) continue;
    if(!evidence.includes('role-result:regression:PASS')) continue;
    if(!evidence.includes('role-result:review:PASS')) continue;
    const candidateBranch=[...evidence].reverse().find(x=>/^vibe2\/candidate\//.test(x));
    const candidateSha=[...evidence].reverse().find(x=>/^candidate-sha:[0-9a-f]{7,40}$/i.test(x));
    if(!candidateBranch||!candidateSha) continue;
    const stamps=evidence
      .filter(x=>/^release-dispatch-recovery-at:\d+$/.test(x))
      .map(x=>Number(x.split(':').pop()))
      .filter(Number.isFinite);
    const last=stamps.length?Math.max(...stamps):0;
    if(last>0 && Number(nowMs)-last<Math.max(60000,Number(cooldownMs)||DEFAULT_COOLDOWN_MS)) continue;
    selected.push({
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
    for(const row of result.selected) process.stdout.write([row.taskId,row.candidateBranch,row.candidateSha].join('\t')+'\n');
  }else{
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }
}
