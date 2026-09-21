// 파일명: tools/company-system-ai-external-learning-feed.mjs
// 역할: 검증·승인 완료된 무료 System AI 결과를 raw 출력 없이 외부 AI 증류 후보 메타데이터로 변환한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const SHA256=/^[a-f0-9]{64}$/i;
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;}
function marker(evidence=[],prefix=''){const rows=(evidence||[]).map(clean).filter(x=>x.startsWith(prefix));return rows.length?clean(rows.at(-1).slice(prefix.length)):'';}
function engineFor(task={}){
  const explicit=clean(task.target).toLowerCase(); if(explicit&&explicit!=='system')return explicit;
  const files=uniq(task.responsibleFiles);
  if(files.some(x=>x.startsWith('web-games/')))return'web';
  if(files.some(x=>x.startsWith('roblox-games/')))return'roblox';
  if(files.some(x=>x.startsWith('unity-games/')))return'unity';
  if(files.some(x=>x.startsWith('unreal-games/')))return'unreal';
  return'cross-engine';
}
function domainsFor(task={}){
  const text=[task.department,task.taskType,task.goal,task.blocker,...(task.acceptanceCriteria||[]),...(task.responsibleFiles||[])].join(' ').toLowerCase();
  const rows=[];
  const defs=[
    ['COMBAT',/combat|attack|damage|weapon|enemy|boss/],['SAVE',/save|load|restore|persist|datastore|storage/],
    ['MOBILE_INPUT',/mobile|touch|pointer|input|swipe/],['UI_STATE',/\bui\b|hud|menu|panel|button/],
    ['PROGRESSION',/progress|quest|level|unlock|stage|wave/],['ECONOMY',/econom|gold|coin|shop|price|currency/],
    ['DEBUGGING',/debug|repair|failure|regression|recovery/],['PERFORMANCE',/performance|fps|latency|memory|cache/],
    ['SECURITY',/security|secret|credential|quarantine|malware/],['ORCHESTRATION',/workflow|queue|dispatch|scheduler|orchestrat/],
    ['MARKETING',/marketing|growth|creator|retention|acquisition|store/],['NETWORKING',/network|server|client|replication|multiplayer/]
  ];
  for(const [name,re] of defs)if(re.test(text))rows.push(name);
  return uniq(rows).slice(0,12);
}
function generalizedPatterns(task={}){
  const files=uniq(task.responsibleFiles).slice(0,6);
  const domains=domainsFor(task);
  const patterns=[];
  if(domains.length)patterns.push('For '+domains.join(', ')+' work, change only the verified responsible scope and rerun the exact deterministic checks before reuse.');
  if(files.length)patterns.push('Prefer direct responsible-file repair over wrapper or validation-only bypasses; preserve existing authority and regression gates.');
  if(upper(task.retryPolicy)==='UNLIMITED_CAUSAL_REPAIR')patterns.push('On repeated failure, change causal implementation evidence before revalidating the same failure signature.');
  return uniq(patterns).filter(x=>x.length<=240).slice(0,6);
}
function eligible(task={}){
  if(clean(task.status).toLowerCase()!=='done')return false;
  const outcome=upper(task.lastOutcome);
  if(!['PRIMARY_AI_ACCEPTED','PRIMARY_AI_VIBE_JOINT_ACCEPTED'].includes(outcome))return false;
  const ev=uniq(task.evidence);
  if(!ev.includes('verification:success'))return false;
  if(outcome==='PRIMARY_AI_ACCEPTED'&&!ev.includes('primary-ai-review:PASS'))return false;
  if(outcome==='PRIMARY_AI_VIBE_JOINT_ACCEPTED'&&!ev.includes('primary-ai-vibe-joint-accept:YES'))return false;
  if(!ev.some(x=>x.startsWith('changed-file:')))return false;
  const sha=marker(ev,'external-ai-raw-output-sha256:');
  const model=marker(ev,'external-ai-model:');
  return SHA256.test(sha)&&Boolean(model);
}
export function buildExternalAiLearningFeed(queueInput={}){
  const records=[];
  for(const task of queueInput.tasks||[]){
    if(!eligible(task))continue;
    const ev=uniq(task.evidence);
    const rawOutputSha256=marker(ev,'external-ai-raw-output-sha256:').toLowerCase();
    const model=marker(ev,'external-ai-model:');
    const changed=ev.filter(x=>x.startsWith('changed-file:')).map(x=>x.slice('changed-file:'.length));
    const run=ev.find(x=>x.startsWith('actions-run:'))||'actions-run:unknown';
    const patterns=generalizedPatterns(task);
    if(!patterns.length)continue;
    records.push({
      id:'system-ai-'+clean(task.id)+'-'+crypto.createHash('sha256').update(rawOutputSha256).digest('hex').slice(0,12),
      sourceKind:'external-ai',
      provider:'LOCAL_OLLAMA_SUPERVISED_SYSTEM_AI',
      model,
      rawOutputSha256,
      engine:engineFor(task),
      gameId:clean(task.gameId)||'cross-game',
      domains:domainsFor(task),
      distilledPatterns:patterns,
      cautions:[
        'Do not reuse raw model output or game-specific values without fresh task verification.',
        'Do not expand writable scope, policy authority, release authority, or QA bypass rights.'
      ],
      sourceWrite:false,
      productionPass:false,
      authorityExpanded:false,
      verification:{
        independent:true,status:'PASS',method:'independent-qa',
        evidence:uniq([
          run,
          'qa:system-ai-deterministic-verification',
          ...changed.slice(0,4).map(file=>'source:verified-changed-file:'+file)
        ]).slice(0,8)
      }
    });
  }
  return{version:1,kind:'company-system-ai-external-learning-feed',records,rawOutputStored:false,verifiedOnly:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();
  const result=buildExternalAiLearningFeed(readJson(clean(a.queue),{tasks:[]}));
  writeJson(clean(a.output)||'/tmp/system-ai-external-learning-feed.json',result);
  console.log('SYSTEM_AI_EXTERNAL_LEARNING_FEED=PASS');
  console.log('SYSTEM_AI_EXTERNAL_LEARNING_CANDIDATES='+result.records.length);
  console.log('SYSTEM_AI_EXTERNAL_LEARNING_RAW_OUTPUT_STORED=NO');
}
