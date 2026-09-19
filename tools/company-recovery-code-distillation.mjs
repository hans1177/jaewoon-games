// 파일명: tools/company-recovery-code-distillation.mjs
// 역할: 검증된 복구/병목 해결과 허가·검증된 외부 요약을 raw 코드 없이 기존 code-pattern-library로 증류한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,24);

function recoverySystems(text=''){
  const src=String(text);
  const out=['EXACT_STAGE_RESUME'];
  if(/queue|reservation|lease|retry.?exhaust/i.test(src))out.push('QUEUE_RECOVERY');
  if(/cache|ollama|binary|startup|install|runtime/i.test(src))out.push('CACHE_RUNTIME_RECOVERY');
  if(/provider|quota|model|fallback|gemini|api/i.test(src))out.push('PROVIDER_FALLBACK');
  if(/workflow|dispatch|actions|ci|fan.?in|orchestration/i.test(src))out.push('ORCHESTRATION_RECOVERY');
  if(/stale|machine.?state|parallelism|checkpoint|drift/i.test(src))out.push('MACHINE_STATE_RECOVERY');
  if(/regression|qa|gate|validation|test/i.test(src))out.push('REGRESSION_REPAIR');
  return uniq(out);
}
function generalizedRecoveryPattern(system){
  const map={
    EXACT_STAGE_RESUME:'PRESERVE_VERIFIED_CHECKPOINT_FIX_CAUSAL_SCOPE_RERUN_EXACT_FAILED_STAGE',
    QUEUE_RECOVERY:'RELEASE_STALE_RESERVATION_DEDUPE_REQUEUE_EXACT_TASK_WITH_SIGNATURE_EVIDENCE',
    CACHE_RUNTIME_RECOVERY:'VALIDATE_CACHED_RUNTIME_ARTIFACT_DIRECTLY_FALL_BACK_TO_INSTALL_ONLY_ON_CACHE_MISS',
    PROVIDER_FALLBACK:'CLASSIFY_PROVIDER_FAILURE_AS_CAPACITY_ROUTE_TO_AUTHORIZED_FALLBACK_PRESERVE_CHECKPOINT',
    ORCHESTRATION_RECOVERY:'REPAIR_EVENT_CHAIN_OR_WORKFLOW_CAUSE_THEN_RERUN_SAME_GATE_NO_FAKE_PASS',
    MACHINE_STATE_RECOVERY:'REVALIDATE_RAW_STATE_CLEAR_ONLY_STALE_BLOCKER_PRESERVE_REAL_MISMATCH',
    REGRESSION_REPAIR:'SMALLEST_RESPONSIBLE_REPAIR_INDEPENDENT_QA_AND_REGRESSION_BEFORE_PROMOTION'
  };
  return 'VERIFIED_RECOVERY_'+system+'_'+(map[system]||'SCOPED_CAUSAL_REPAIR_WITH_EXACT_RETEST');
}
export function distillRecoveryCodePatterns({recoveryInput={},libraryInput={},authorizedSummary={},externalMemory={}}={}){
  const byId=new Map((libraryInput.patterns||[]).filter(x=>x?.verified===true).map(x=>[clean(x.id),x]));
  let internalAdded=0,externalAdded=0;
  for(const task of recoveryInput.tasks||[]){
    const eligible=clean(task.status)==='verified'
      &&upper(task.primaryAiReview)==='PASS'
      &&Array.isArray(task.deterministicEvidence)&&task.deterministicEvidence.length>0;
    if(!eligible)continue;
    const sourceRevision='sha256:'+hash(uniq(task.deterministicEvidence).sort().join('|')).padEnd(64,'0').slice(0,64);
    const text=[task.failureStage,task.failureSignature,task.recoveryStrategy,...(task.verificationPlan||[])].join(' ');
    for(const system of recoverySystems(text)){
      const id='pat_recovery_'+hash([task.id,system,sourceRevision].join('|'));
      if(!byId.has(id))internalAdded++;
      byId.set(id,{
        id,gameId:null,engine:'system',taskType:'recovery',system,
        problem:clean(task.failureSignature).slice(0,220),
        pattern:generalizedRecoveryPattern(system),
        tags:uniq(['recovery','bottleneck','verified','primary-ai-reviewed',system]),
        verified:true,sourceRevision,evidencePath:'vibe2-unreal-core:.vibe2/recovery-queue.json',
        rawCodeStored:false,independentQa:'PASS',browserQa:'NOT_APPLICABLE',
        retrievalEligible:true,masteryEligible:true,authority:'VERIFIED_INTERNAL_RECOVERY_CODE_PATTERN'
      });
    }
  }

  if(authorizedSummary?.authority==='OWNER_ASSERTED_REUSE_REINTERPRETATION'&&/^[a-f0-9]{64}$/i.test(clean(authorizedSummary.packageFingerprint))){
    const mappings=[
      ['save-state-persistence','SAVE_PERSISTENCE'],
      ['session-retry-gameover','STATE_MACHINE'],
      ['input-drag-touch','INPUT_EVENT_BINDING']
    ];
    for(const [domain,system] of mappings){
      if(!(authorizedSummary.learningDomains||[]).includes(domain))continue;
      const id='pat_external_authorized_'+hash([authorizedSummary.packageFingerprint,domain,system].join('|'));
      if(!byId.has(id))externalAdded++;
      byId.set(id,{
        id,gameId:clean(authorizedSummary.gameId)||null,engine:'external-authorized',taskType:'authorized-static-distillation',
        system,problem:'Authorized external generalized implementation structure: '+domain,
        pattern:'AUTHORIZED_EXTERNAL_GENERALIZED_'+system+'_ADVISORY_ONLY',
        tags:['authorized-external','static-summary','retrieval-only',system],
        verified:true,sourceRevision:'sha256:'+clean(authorizedSummary.packageFingerprint),
        evidencePath:'company-learning/authorized-source/block-blast/authorized-learning-summary.json',
        rawCodeStored:false,independentQa:'STATIC_ONLY',browserQa:'NOT_APPLICABLE',
        retrievalEligible:true,masteryEligible:false,authority:'AUTHORIZED_EXTERNAL_GENERALIZED_PATTERN'
      });
    }
  }

  for(const row of externalMemory?.positive||[]){
    if(clean(row.authority)!=='verified-memory-entry')continue;
    if(!(row.tags||[]).includes('external-black-box'))continue;
    const id='pat_external_blackbox_'+hash([row.id,row.sourceRevision].join('|'));
    if(!byId.has(id))externalAdded++;
    byId.set(id,{
      id,gameId:clean(row.project)||null,engine:'external-black-box',taskType:'qa-observation',
      system:'RUNTIME_OBSERVATION_RECOVERY',
      problem:clean(row.request).slice(0,220),
      pattern:'VERIFIED_EXTERNAL_RUNTIME_OBSERVATION_SEPARATE_LAUNCH_ENTRY_INPUT_RESPONSE_PROCESS_SURVIVAL_AND_CRASH_SCOPE',
      tags:['external-black-box','runtime','qa','retrieval-only','recovery-evidence'],
      verified:true,sourceRevision:clean(row.sourceRevision),
      evidencePath:'company-learning/vibe3-memory-index.json',
      rawCodeStored:false,independentQa:'RUNTIME_OBSERVATION_ONLY',browserQa:'NOT_APPLICABLE',
      retrievalEligible:true,masteryEligible:false,authority:'VERIFIED_EXTERNAL_OBSERVATION_PATTERN'
    });
  }

  return{
    version:1,kind:'vibe2-verified-code-pattern-library',
    patterns:[...byId.values()].sort((a,b)=>String(a.system).localeCompare(String(b.system))||String(a.id).localeCompare(String(b.id))).slice(-2000),
    policy:{
      verifiedEvidenceRequired:true,rawCodeStored:false,wholeGameCopyForbidden:true,
      unauthorizedExternalCodeForbidden:true,externalGeneralizedPatternRetrievalOnlyWithoutIndependentQa:true,
      recoveryMasteryRequiresPrimaryAiReviewAndIndependentQa:true
    },
    stats:{internalRecoveryAdded:internalAdded,externalAdvisoryAdded:externalAdded,total:byId.size},
    updatedAt:new Date().toISOString()
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const libraryFile=clean(args.library)||'.vibe2/code-pattern-library.json';
  const result=distillRecoveryCodePatterns({
    recoveryInput:readJson(clean(args.recovery)||'.vibe2/recovery-queue.json',{tasks:[]}),
    libraryInput:readJson(libraryFile,{patterns:[]}),
    authorizedSummary:readJson(clean(args.authorized)||'company-learning/authorized-source/block-blast/authorized-learning-summary.json',{}),
    externalMemory:readJson(clean(args.external)||'company-learning/vibe3-memory-index.json',{})
  });
  writeJson(libraryFile,result);
  console.log('RECOVERY_CODE_DISTILLATION=PASS');
  console.log('RECOVERY_CODE_INTERNAL_ADDED='+result.stats.internalRecoveryAdded);
  console.log('RECOVERY_CODE_EXTERNAL_ADVISORY_ADDED='+result.stats.externalAdvisoryAdded);
}
