// 파일명: tools/company-system-ai-worker.mjs
// 역할: 무료 로컬 AI(Ollama)가 총괄이 배정한 시스템 작업만 격리 후보 브랜치에서 수행한다.
// 안전: 게임 소스/중앙 정책 직접 수정 금지, 정확 일치 편집만 허용, 원문 모델 출력 저장 금지.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildNeuralDiagnosis } from './vibe2-neural-diagnosis.mjs';
import { reviewSystemAiQaContract } from './company-system-ai-qa-contract-review.mjs';

const clean=v=>String(v??'').trim();
const MODEL=process.env.SYSTEM_AI_MODEL||process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b';
const TIMEOUT=Math.max(30000,Math.min(600000,Number(process.env.SYSTEM_AI_TIMEOUT_MS||360000)));
const NUM_PREDICT=Math.max(4096,Math.min(16384,Number(process.env.SYSTEM_AI_NUM_PREDICT||8192)));
const MAX_TOTAL_CONTEXT=420000;
const MAX_FILE_CONTEXT=140000;
const MAX_EDITS=12;
const GAME_SOURCE_PREFIXES=['web-games/','roblox-games/','unity-games/','unreal-games/','godot-games/'];
const FORBIDDEN_PREFIXES=[];
const FORBIDDEN_FILES=new Set(['company-learning/platform-release-roadmap.json','company-learning/company-log-map.json','company-learning/company-architecture-map.json','company-learning/security-immune-system.json']);
const ALLOWED_PREFIXES=['tools/','qa/','assets/','.github/workflows/','company-learning/',...GAME_SOURCE_PREFIXES];
const READ_ONLY_CONTEXT_FILES=new Set(['game-catalog.json']);
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function posix(v){return clean(v).replaceAll('\\','/').replace(/^\.\//,'');}
function unique(xs=[]){return [...new Set((xs||[]).map(clean).filter(Boolean))];}
function validateBasePath(file){const p=posix(file);if(!p||p.startsWith('/')||p.includes('..'))throw new Error(`SYSTEM_AI_PATH_INVALID:${p}`);if(FORBIDDEN_PREFIXES.some(prefix=>p.startsWith(prefix)))throw new Error(`SYSTEM_AI_PATH_FORBIDDEN:${p}`);return p;}
function safeReadPath(file){const p=validateBasePath(file);if(!ALLOWED_PREFIXES.some(prefix=>p.startsWith(prefix))&&!READ_ONLY_CONTEXT_FILES.has(p))throw new Error(`SYSTEM_AI_READ_PATH_OUTSIDE_ALLOWED_SCOPE:${p}`);return p;}
function safeWritePath(file){const p=validateBasePath(file);if(!ALLOWED_PREFIXES.some(prefix=>p.startsWith(prefix))||READ_ONLY_CONTEXT_FILES.has(p))throw new Error(`SYSTEM_AI_WRITE_PATH_OUTSIDE_ALLOWED_SCOPE:${p}`);if(FORBIDDEN_FILES.has(p))throw new Error(`SYSTEM_AI_POLICY_WRITE_FORBIDDEN:${p}`);return p;}
export function validateSystemAiTaskPreflight(task={}){if(clean(task.status)!=='running')throw new Error('SYSTEM_AI_TASK_NOT_RESERVED');const responsibleFiles=unique(task.responsibleFiles).map(safeWritePath);if(!responsibleFiles.length)throw new Error('SYSTEM_AI_RESPONSIBLE_FILES_REQUIRED');const contextFiles=unique(task.contextFiles).map(safeReadPath);return{taskId:clean(task.id),responsibleFiles,contextFiles,infrastructureClass:'PREFLIGHT_PASS'};}
function excerpt(file,patterns=[]){const text=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';if(text.length<=MAX_FILE_CONTEXT&&!patterns.length)return text;const lines=text.split('\n'),hits=[];for(let i=0;i<lines.length;i++)if(patterns.some(p=>lines[i].includes(p)))hits.push(i);if(!hits.length)return text.slice(0,MAX_FILE_CONTEXT);const ranges=[];for(const hit of hits.slice(0,12)){const a=Math.max(0,hit-55),b=Math.min(lines.length-1,hit+55),last=ranges.at(-1);if(last&&a<=last[1]+1)last[1]=Math.max(last[1],b);else ranges.push([a,b]);}return ranges.map(([a,b])=>`[LINES ${a+1}-${b+1}]\n${lines.slice(a,b+1).join('\n')}`).join('\n\n').slice(0,MAX_FILE_CONTEXT);}
function parseModelJson(raw=''){const text=clean(raw).replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a<0||b<a)throw new Error('SYSTEM_AI_MODEL_JSON_MISSING');return JSON.parse(text.slice(a,b+1));}
async function requestModel(prompt,{maxPredict=NUM_PREDICT}={}){const body=JSON.stringify({model:MODEL,prompt,stream:false,think:false,format:'json',options:{num_predict:maxPredict,temperature:.05}});return await new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{let data='';res.setEncoding('utf8');res.on('data',x=>data+=x);res.on('end',()=>{try{const row=JSON.parse(data);if(row?.error)throw new Error(row.error);resolve(String(row?.response||''));}catch(e){reject(e);}});});req.setTimeout(TIMEOUT,()=>req.destroy(new Error('SYSTEM_AI_MODEL_TIMEOUT')));req.on('error',reject);req.end(body);});}
function applyExactEdit(file,find,replace){const original=fs.readFileSync(file,'utf8'),first=original.indexOf(find);if(first<0)throw new Error(`SYSTEM_AI_FIND_MISSING:${file}`);if(original.indexOf(find,first+find.length)>=0)throw new Error(`SYSTEM_AI_FIND_NOT_UNIQUE:${file}`);fs.writeFileSync(file,original.slice(0,first)+replace+original.slice(first+find.length),'utf8');}
function strategyHash(value){return crypto.createHash('sha256').update(String(value??''),'utf8').digest('hex');}
function failedStrategyFingerprints(task={}){
  const direct=unique(task.failedStrategyFingerprints);
  const evidence=unique(task.evidence).filter(x=>x.startsWith('failed-strategy-fingerprint:')).map(x=>clean(x.slice('failed-strategy-fingerprint:'.length)));
  return unique([...direct,...evidence]).filter(x=>/^[a-f0-9]{64}$/i.test(x));
}
function repairStrategyFingerprint(task={},edits=[],newFiles=[]){
  const causal=causalTaskContext(task);
  const shape={
    failureSignature:causal.failureSignature||null,
    edits:(edits||[]).map(row=>({path:posix(row.path),findSha256:strategyHash(String(row.find??'')),replaceSha256:strategyHash(String(row.replace??''))})).sort((a,b)=>a.path.localeCompare(b.path)||a.findSha256.localeCompare(b.findSha256)),
    newFiles:(newFiles||[]).map(row=>({path:posix(row.path),contentSha256:strategyHash(String(row.content??''))})).sort((a,b)=>a.path.localeCompare(b.path))
  };
  return strategyHash(JSON.stringify(shape));
}
function evidenceValue(task={},prefix=''){
  const row=[...unique(task.evidence)].reverse().find(x=>x.startsWith(prefix));
  return row?clean(row.slice(prefix.length)):null;
}
function knownGoodReference(task={}){
  return clean(task.knownGoodRevision||task.knownGoodSourceRevision)
    ||evidenceValue(task,'known-good-revision:')
    ||evidenceValue(task,'known-good-source:')
    ||null;
}
function systemAiHypothesisPlan(task={}){
  const diagnosis=buildNeuralDiagnosis({task,project:{}});
  const rejected=new Set(unique([
    ...(task.failedHypothesisIds||[]),
    ...unique(task.evidence).filter(x=>x.startsWith('hypothesis-rejected:')).map(x=>clean(x.slice('hypothesis-rejected:'.length)))
  ]));
  let hypotheses=(diagnosis.hypotheses||[]).map(row=>({
    id:clean(row.id),
    system:clean(row.system)||'UNKNOWN',
    confidence:Number(row.confidence||0),
    reason:clean(row.reason),
    rejected:rejected.has(clean(row.id))
  }));
  if(hypotheses.length<2){
    const fallback=[
      {id:'responsible-source-defect',system:'RESPONSIBLE_SOURCE',confidence:.48,reason:'Assigned responsible implementation may contain the causal defect'},
      {id:'execution-integration-path-defect',system:'EXECUTION_PATH',confidence:.34,reason:'Execution, runner, integration, or evidence transport may be the causal defect'},
      {id:'contract-or-evidence-mismatch',system:'CONTRACT_EVIDENCE',confidence:.18,reason:'Observed failure may be caused by a stale contract or evidence mismatch'}
    ];
    for(const row of fallback)if(!hypotheses.some(x=>x.id===row.id))hypotheses.push({...row,rejected:rejected.has(row.id)});
  }
  hypotheses=hypotheses.slice(0,6);
  const viable=hypotheses.filter(row=>!row.rejected);
  const selected=viable[0]||hypotheses[0]||null;
  const knownGood=knownGoodReference(task);
  return{
    hypotheses,
    selectedHypothesisId:selected?.id||null,
    rejectedHypothesisIds:[...rejected],
    knownGoodRevision:knownGood,
    diagnosisResponsibility:clean(diagnosis.responsibility?.system)||'UNKNOWN',
    diagnosisFailureStage:clean(diagnosis.actionRecommendation?.failureStage)||null,
    requiresFalsification:Boolean(task.taskType==='bottleneck-repair'||task.retries>0||task.sourceMutationRequired===true)
  };
}
function causalTaskContext(task={}){
  const evidence=unique(task.evidence);
  const fromEvidence=prefix=>clean([...evidence].reverse().find(x=>x.startsWith(prefix))?.slice(prefix.length));
  const failureStage=clean(task.failureStage||task.currentStep||task.phase)||fromEvidence('recovery-exact-stage:')||fromEvidence('failure-stage:')||null;
  const failureSignature=clean(task.failureSignature)||fromEvidence('system-steward:failure-signature:')||fromEvidence('failure-cause:')||clean(task.blocker||task.lastOutcome)||null;
  const retryCount=Math.max(0,Number(task.retries||task.recoveryGeneration||0)||0);
  const priorEvidence=evidence.slice(-24);
  const priorFailedStrategyFingerprints=failedStrategyFingerprints(task);
  return{failureStage,failureSignature,retryCount,priorEvidence,priorFailedStrategyFingerprints};
}
function buildPrompt(task,contexts,learningContext={}){
  const learning=clean(learningContext.guidance),causal=causalTaskContext(task),hypothesisPlan=systemAiHypothesisPlan(task);
  const hypothesisRows=hypothesisPlan.hypotheses.map((row,index)=>`${index+1}. ${row.id} system=${row.system} confidence=${row.confidence.toFixed(2)} rejected=${row.rejected?'YES':'NO'} reason=${row.reason}`);
  return[
    'You are an external system-engineering AI worker supervised by the primary AI.',
    'You may modify ONLY the explicitly listed responsible files. Game source edits are allowed only when those game files are explicitly assigned to this isolated candidate task.',
    'Never modify central policy/log/architecture/security policy files. Never weaken QA, runtime, release, security, or regression gates.',
    'If this is a verified stale-QA-contract repair, change tests only when current central policy and current responsible implementation prove the contract drift. Never turn a real implementation failure into a test-only fix, and never reduce assertion or test coverage.',
    'Solve the assigned root cause directly; do not add catch-and-ignore bypasses, fake PASS evidence, or wrapper-only patches.',
    'For recovery work, use the exact failure stage and failure signature as causal constraints. Do not repeat a previously failed repair strategy without new causal evidence.',
    'Before editing, compare multiple causal hypotheses against the supplied evidence. Explicitly reject contradicted hypotheses and repair only the strongest surviving hypothesis.',
    'If a known-good revision is supplied, compare the failing responsibility area against that known-good reference before choosing a repair. If none is supplied, do not invent one.',
    'Preserve already verified checkpoints and change the responsible source before revalidating the same failure signature when sourceMutationRequired is true.',
    'Return compact JSON only. Do not use markdown or repeat unchanged file content.',
    'Schema: {"summary":"...","selectedHypothesisId":"...","falsifiedHypothesisIds":["..."],"knownGoodComparison":"...","edits":[{"path":"...","find":"small exact unique text","replace":"replacement"}],"newFiles":[{"path":"...","content":"..."}],"recommendedTests":["..."],"risks":["..."]}.',
    'Keep find strings to the smallest unique blocks and keep prose concise so JSON cannot be truncated.',
    `TASK ID: ${clean(task.id)}`,
    `GOAL: ${clean(task.goal)}`,
    `FAILURE STAGE: ${causal.failureStage||'UNSPECIFIED'}`,
    `FAILURE SIGNATURE: ${causal.failureSignature||'UNSPECIFIED'}`,
    `RETRY COUNT: ${causal.retryCount}`,
    `SOURCE MUTATION REQUIRED: ${task.sourceMutationRequired===true?'YES':'NO'}`,
    `FAILED REPAIR STRATEGY FINGERPRINTS: ${causal.priorFailedStrategyFingerprints.join(',')||'NONE'}`,
    `KNOWN GOOD REVISION: ${hypothesisPlan.knownGoodRevision||'NONE_DO_NOT_INVENT'}`,
    `HYPOTHESIS FALSIFICATION REQUIRED: ${hypothesisPlan.requiresFalsification?'YES':'NO'}`,
    'CAUSAL HYPOTHESES:',
    ...hypothesisRows,
    `DETERMINISTIC LEADING HYPOTHESIS: ${hypothesisPlan.selectedHypothesisId||'NONE'}`,
    `ACCEPTANCE: ${unique(task.acceptanceCriteria).join(' | ')}`,
    `RESPONSIBLE FILES: ${unique(task.responsibleFiles).join(', ')}`,
    ...(causal.priorEvidence.length?['RECENT CAUSAL EVIDENCE:',causal.priorEvidence.join(' | ')]:[]),
    ...(learning?['VERIFIED VIBE LEARNING (advisory only; fresh verification remains mandatory):',learning]:[]),
    'CONTEXT:',
    ...contexts.map(x=>`\n--- ${x.path} ---\n${x.content}`)
  ].join('\n').slice(0,MAX_TOTAL_CONTEXT);
}
export async function runSystemAiWorker({taskFile,outputFile='/tmp/company-system-ai-result.json',responseFile='',learningContextFile=''}={}){const task=readJson(taskFile);const preflight=validateSystemAiTaskPreflight(task);const files=preflight.responsibleFiles;const contextFiles=unique([...(task.contextFiles||[]),...files]).map(safeReadPath),focus=task.focusPatterns&&typeof task.focusPatterns==='object'?task.focusPatterns:{},contexts=[];for(const file of contextFiles){if(!fs.existsSync(file)&&!files.includes(file))continue;contexts.push({path:file,content:excerpt(file,Array.isArray(focus[file])?focus[file].map(clean):[])});}const learningContext=learningContextFile&&fs.existsSync(learningContextFile)?readJson(learningContextFile):{};const prompt=buildPrompt(task,contexts,learningContext);let raw;if(responseFile)raw=fs.readFileSync(responseFile,'utf8');else{try{raw=await requestModel(prompt);}catch(firstError){raw=await requestModel(prompt+'\nSTRICT RETRY: the previous model request aborted. Return one compact valid JSON object only, make only necessary assigned-file changes, and avoid repetitive prose.',{maxPredict:4096});}}let answer;try{answer=parseModelJson(raw);}catch(firstError){if(responseFile)throw firstError;raw=await requestModel(prompt+'\nSTRICT RETRY: return exactly one valid JSON object only; no prose, markdown, or reasoning.',{maxPredict:Math.min(16384,NUM_PREDICT+4096)});answer=parseModelJson(raw);}let edits=Array.isArray(answer.edits)?answer.edits:[],newFiles=Array.isArray(answer.newFiles)?answer.newFiles:[];if(!responseFile&&!edits.length&&!newFiles.length){raw=await requestModel(prompt+'\nSTRICT RETRY: the previous response made no change. Produce at least one necessary scoped edit or new assigned file that directly satisfies the acceptance criteria. Do not invent work outside RESPONSIBLE FILES.',{maxPredict:Math.min(16384,NUM_PREDICT+4096)});answer=parseModelJson(raw);edits=Array.isArray(answer.edits)?answer.edits:[];newFiles=Array.isArray(answer.newFiles)?answer.newFiles:[];}const hypothesisPlan=systemAiHypothesisPlan(task);const validHypothesisIds=new Set(hypothesisPlan.hypotheses.filter(x=>!x.rejected).map(x=>x.id));let selectedHypothesisId=clean(answer.selectedHypothesisId)||hypothesisPlan.selectedHypothesisId;if(selectedHypothesisId&&!validHypothesisIds.has(selectedHypothesisId))throw new Error('SYSTEM_AI_INVALID_OR_REJECTED_HYPOTHESIS:'+selectedHypothesisId);const falsifiedHypothesisIds=unique(answer.falsifiedHypothesisIds).filter(id=>hypothesisPlan.hypotheses.some(x=>x.id===id));const knownGoodComparison=clean(answer.knownGoodComparison)||(hypothesisPlan.knownGoodRevision?'KNOWN_GOOD_REFERENCE_AVAILABLE_NOT_EXPLICITLY_COMPARED':'NO_KNOWN_GOOD_REFERENCE');const strategyFingerprint=repairStrategyFingerprint(task,edits,newFiles),priorFailedStrategies=failedStrategyFingerprints(task);if(priorFailedStrategies.includes(strategyFingerprint))throw new Error('SYSTEM_AI_REPEATED_FAILED_STRATEGY:'+strategyFingerprint);const rawSha256=crypto.createHash('sha256').update(raw).digest('hex'),allowed=new Set(files);
const qaEvolutionRequested=clean(task.failureClass).toUpperCase()==='STALE_QA_CONTRACT'||clean(task.taskType).toLowerCase()==='qa-contract-repair'||unique(task.evidence).includes('qa-contract-drift:VERIFIED');
const qaBeforeByPath={};
if(qaEvolutionRequested)for(const file of files)if(file.startsWith('qa/')&&fs.existsSync(file))qaBeforeByPath[file]=fs.readFileSync(file,'utf8');
if(edits.length+newFiles.length>MAX_EDITS)throw new Error('SYSTEM_AI_EDIT_LIMIT');const changed=[];for(const edit of edits){const p=safeWritePath(edit.path);if(!allowed.has(p))throw new Error(`SYSTEM_AI_UNASSIGNED_FILE:${p}`);if(!fs.existsSync(p))throw new Error(`SYSTEM_AI_EDIT_FILE_MISSING:${p}`);const find=String(edit.find??''),replace=String(edit.replace??'');if(!find)throw new Error(`SYSTEM_AI_EMPTY_FIND:${p}`);applyExactEdit(p,find,replace);changed.push(p);}for(const row of newFiles){const p=safeWritePath(row.path);if(!allowed.has(p))throw new Error(`SYSTEM_AI_UNASSIGNED_NEW_FILE:${p}`);if(fs.existsSync(p))throw new Error(`SYSTEM_AI_NEW_FILE_EXISTS:${p}`);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,String(row.content??''),'utf8');changed.push(p);}if(!changed.length)throw new Error('SYSTEM_AI_NO_CHANGE');const changedFiles=unique(changed);
let qaContractReview={version:1,required:false,allowed:true,verifiedContractDrift:false,reason:'NOT_REQUESTED',evidence:['system-ai-qa-contract-review:NOT_REQUIRED']};
if(qaEvolutionRequested&&changedFiles.some(file=>file.startsWith('qa/'))){
  const qaAfterByPath={};
  for(const file of changedFiles)if(file.startsWith('qa/')&&fs.existsSync(file))qaAfterByPath[file]=fs.readFileSync(file,'utf8');
  const policy=readJson('company-learning/platform-release-roadmap.json');
  const securityPolicy=readJson('company-learning/security-immune-system.json');
  qaContractReview=reviewSystemAiQaContract({task,beforeByPath:qaBeforeByPath,afterByPath:qaAfterByPath,policy,securityPolicy});
  if(!qaContractReview.allowed)throw new Error('SYSTEM_AI_QA_EVOLUTION_REJECTED:'+qaContractReview.reason);
}
const gameSourceWrite=changedFiles.some(file=>GAME_SOURCE_PREFIXES.some(prefix=>file.startsWith(prefix)));const causal=causalTaskContext(task);const result={version:3,kind:'company-system-ai-result',taskId:clean(task.id),model:MODEL,summary:clean(answer.summary).slice(0,1200),changedFiles,recommendedTests:unique(answer.recommendedTests).slice(0,12),risks:unique(answer.risks).slice(0,12),failureStage:causal.failureStage,failureSignature:causal.failureSignature,retryCount:causal.retryCount,causalEvidenceCount:causal.priorEvidence.length,causalContextBound:true,sourceMutationRequired:task.sourceMutationRequired===true,hypothesisPlanBound:true,hypothesisCandidates:hypothesisPlan.hypotheses.map(x=>({id:x.id,system:x.system,confidence:x.confidence,rejected:x.rejected})),selectedHypothesisId,falsifiedHypothesisIds,knownGoodRevision:hypothesisPlan.knownGoodRevision,knownGoodComparison,repairStrategyFingerprint:strategyFingerprint,previousFailedStrategyCount:priorFailedStrategies.length,repeatedFailedStrategyBlocked:true,rawModelOutputSha256:rawSha256,rawModelOutputStored:false,gameSourceWrite,gameSourceWriteMode:gameSourceWrite?'ISOLATED_ASSIGNED_CANDIDATE_ONLY':'NONE',centralPolicyWrite:false,qaGateWeakening:false,supervisorReviewRequired:true,workerSelfAcceptance:false,learningCandidate:true,learningRoute:'EXISTING_VIBE_LEARNING_MOTOR',learningKnowledgeIds:unique(learningContext.exactKnowledgeIds).slice(0,20),verifiedLearningApplied:unique(learningContext.exactKnowledgeIds).length>0,qaContractReview};writeJson(outputFile,result);return result;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();if(clean(args.preflight)==='true'){const result=validateSystemAiTaskPreflight(readJson(clean(args.task)));console.log('COMPANY_SYSTEM_AI_PREFLIGHT=PASS');console.log(`COMPANY_SYSTEM_AI_TASK=${result.taskId}`);console.log(`COMPANY_SYSTEM_AI_PREFLIGHT_RESPONSIBLE=${result.responsibleFiles.length}`);console.log(`COMPANY_SYSTEM_AI_PREFLIGHT_CONTEXT=${result.contextFiles.length}`);}else{const result=await runSystemAiWorker({taskFile:clean(args.task),outputFile:clean(args.output)||'/tmp/company-system-ai-result.json',responseFile:clean(args.response),learningContextFile:clean(args['learning-context'])});console.log('COMPANY_SYSTEM_AI_WORKER=PASS');console.log(`COMPANY_SYSTEM_AI_TASK=${result.taskId}`);console.log(`COMPANY_SYSTEM_AI_CHANGED=${result.changedFiles.join(',')}`);console.log(`COMPANY_SYSTEM_AI_GAME_SOURCE_WRITE=${result.gameSourceWrite?'YES':'NO'}`);console.log(`COMPANY_SYSTEM_AI_VERIFIED_LEARNING_APPLIED=${result.verifiedLearningApplied?'YES':'NO'}`);console.log(`COMPANY_SYSTEM_AI_VERIFIED_LEARNING_IDS=${(result.learningKnowledgeIds||[]).join(',')}`);console.log('COMPANY_SYSTEM_AI_SUPERVISOR_REVIEW=REQUIRED');}}
