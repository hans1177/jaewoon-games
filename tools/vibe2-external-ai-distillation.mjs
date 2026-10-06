// 파일명: tools/vibe2-external-ai-distillation.mjs
// 역할: 외부 AI 출력은 원문 그대로 개발에 주입하지 않고, 독립 검증된 일반화 지식만 advisory store로 증류한다.
// 안전: source write 0, production PASS 0, Mastery 직접 상승 0, canonical training sample 직접 생성 0.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=(value)=>String(value??'').trim();
const unique=(values=[])=>[...new Set((values||[]).map(clean).filter(Boolean))];
const METHODS=new Set(['runtime','independent-qa','source-backed-review','multi-source-consistency']);
const SHA256=/^[a-f0-9]{64}$/i;
export const VERIFIED_EXTERNAL_AI_MAIN_PROMOTION_ALLOWED_FILES=Object.freeze([
  '.vibe2/external-ai-distilled-knowledge.json',
  'qa/vibe2-external-ai-distillation.test.mjs',
  'qa/vibe2-learning-motor.test.mjs',
  'qa/company-system-ai-learning.test.mjs'
]);

function safeId(value=''){return clean(value).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96)||'external-ai';}
function parseArgs(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function generalized(values=[]){return unique(values).map(value=>value.length<=240?value:'').filter(Boolean).slice(0,12);}

export function validateExternalAiCandidate(row={}){
  const verification=row?.verification&&typeof row.verification==='object'?row.verification:{};
  const evidence=unique(verification.evidence||[]);
  const method=clean(verification.method).toLowerCase();
  const rawOutputSha256=clean(row.rawOutputSha256).toLowerCase();
  const patterns=generalized(row.distilledPatterns||[]);
  const cautions=generalized(row.cautions||[]);
  const reasons=[];
  if(clean(row.sourceKind).toLowerCase()!=='external-ai')reasons.push('SOURCE_KIND_NOT_EXTERNAL_AI');
  if(!clean(row.provider))reasons.push('PROVIDER_REQUIRED');
  if(!clean(row.model))reasons.push('MODEL_REQUIRED');
  if(!SHA256.test(rawOutputSha256))reasons.push('RAW_OUTPUT_SHA256_REQUIRED');
  if(row.rawOutput!=null||row.rawText!=null||row.response!=null)reasons.push('RAW_EXTERNAL_AI_OUTPUT_MUST_NOT_BE_PERSISTED');
  if(verification.independent!==true)reasons.push('INDEPENDENT_VERIFICATION_REQUIRED');
  if(clean(verification.status).toUpperCase()!=='PASS')reasons.push('VERIFICATION_PASS_REQUIRED');
  if(!METHODS.has(method))reasons.push('VERIFICATION_METHOD_NOT_ALLOWED');
  const traceableEvidence=evidence.filter(value=>/^(qa|runtime|source|multi-source|actions-run|artifact):/i.test(value));
  if(!evidence.length)reasons.push('VERIFICATION_EVIDENCE_REQUIRED');
  if(evidence.length<2)reasons.push('VERIFICATION_EVIDENCE_MINIMUM_NOT_MET');
  if(traceableEvidence.length<2)reasons.push('VERIFICATION_EVIDENCE_NOT_TRACEABLE');
  if(!patterns.length)reasons.push('DISTILLED_PATTERN_REQUIRED');
  if(row.sourceWrite===true)reasons.push('SOURCE_WRITE_FORBIDDEN');
  if(row.productionPass===true)reasons.push('PRODUCTION_PASS_FORBIDDEN');
  if(row.authorityExpanded===true)reasons.push('AUTHORITY_EXPANSION_FORBIDDEN');
  return {ok:reasons.length===0,reasons,verification:{independent:true,status:'PASS',method,evidence},rawOutputSha256,patterns,cautions};
}

export function isTrustedDistilledExternalAiEntry(row={}){
  const verification=row?.verification&&typeof row.verification==='object'?row.verification:{};
  const evidence=unique(verification.evidence||[]);
  return row?.sourceKind==='external-ai-distilled'
    && row?.verified===true
    && row?.independentlyVerified===true
    && row?.distilled===true
    && row?.advisoryOnly===true
    && row?.reusable===true
    && row?.rawOutputStored===false
    && SHA256.test(clean(row?.rawOutputSha256))
    && verification.independent===true
    && clean(verification.status).toUpperCase()==='PASS'
    && METHODS.has(clean(verification.method).toLowerCase())
    && evidence.length>=2
    && evidence.filter(value=>/^(qa|runtime|source|multi-source|actions-run|artifact):/i.test(value)).length>=2
    && Array.isArray(row?.patterns)
    && row.patterns.length>0
    && row?.directDevelopmentUse!==true
    && row?.directSourceWrite!==true
    && row?.directProductionPass!==true
    && row?.directMasteryCredit!==true
    && row?.directTrainingSample!==true
    && row?.authorityExpanded!==true;
}

function normalizedChangedFiles(values=[]){
  return unique((Array.isArray(values)?values:clean(values).split(',')).map(value=>clean(value).replaceAll('\\\\','/')).filter(Boolean));
}

function exactJson(value){return JSON.stringify(value);}

function assertTrustedStoreMetadata(store={},label='STORE'){
  if(Number(store?.version)!==1)throw new Error(`${label}_VERSION_INVALID`);
  if(clean(store?.kind)!=='vibe2-external-ai-distilled-knowledge')throw new Error(`${label}_KIND_INVALID`);
  if(store?.authorityExpanded!==false)throw new Error(`${label}_AUTHORITY_EXPANSION_FORBIDDEN`);
  if(!Array.isArray(store?.entries))throw new Error(`${label}_ENTRIES_REQUIRED`);
  const ids=store.entries.map(row=>clean(row?.id));
  if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new Error(`${label}_ENTRY_ID_DUPLICATE_OR_MISSING`);
}

export function mergeVerifiedExternalAiKnowledgeStores({baseKnowledge={},incomingKnowledge={}}={}){
  assertTrustedStoreMetadata(baseKnowledge,'BASE_STORE');
  assertTrustedStoreMetadata(incomingKnowledge,'INCOMING_STORE');
  const baseEntries=baseKnowledge.entries||[];
  for(const row of baseEntries)if(!isTrustedDistilledExternalAiEntry(row))throw new Error('BASE_STORE_UNTRUSTED_ENTRY:'+clean(row?.id));
  const byId=new Map(baseEntries.map(row=>[clean(row.id),row]));
  const addedEntryIds=[];
  for(const row of incomingKnowledge.entries||[]){
    const id=clean(row?.id);
    if(byId.has(id))continue;
    if(!isTrustedDistilledExternalAiEntry(row))throw new Error('INCOMING_STORE_UNTRUSTED_ENTRY:'+id);
    byId.set(id,row);
    addedEntryIds.push(id);
  }
  return{
    knowledge:{...baseKnowledge,entries:[...byId.values()]},
    addedEntryIds,
    authorityExpanded:false
  };
}

export function validateExternalAiMainPromotion({baseKnowledge={},candidateKnowledge={},changedFiles=[]}={}){
  const reasons=[];
  const files=normalizedChangedFiles(changedFiles);
  if(!files.includes('.vibe2/external-ai-distilled-knowledge.json'))reasons.push('DISTILLED_STORE_CHANGE_REQUIRED');
  for(const file of files)if(!VERIFIED_EXTERNAL_AI_MAIN_PROMOTION_ALLOWED_FILES.includes(file))reasons.push('PROMOTION_FILE_NOT_ALLOWED:'+file);
  let merged=null;
  try{
    assertTrustedStoreMetadata(baseKnowledge,'BASE_STORE');
    assertTrustedStoreMetadata(candidateKnowledge,'CANDIDATE_STORE');
    if(exactJson(candidateKnowledge?.policy)!==exactJson(baseKnowledge?.policy))reasons.push('STORE_POLICY_MUTATION_FORBIDDEN');
    merged=mergeVerifiedExternalAiKnowledgeStores({baseKnowledge,incomingKnowledge:candidateKnowledge});
    if(exactJson(merged.knowledge)!==exactJson(candidateKnowledge))reasons.push('EXISTING_VERIFIED_KNOWLEDGE_MUTATION_OR_DELETION_FORBIDDEN');
    if(!merged.addedEntryIds.length)reasons.push('NEW_TRUSTED_DISTILLED_ENTRY_REQUIRED');
  }catch(error){
    reasons.push(clean(error?.message||error)||'PROMOTION_VALIDATION_FAILED');
  }
  const newEntries=(candidateKnowledge?.entries||[]).filter(row=>merged?.addedEntryIds?.includes(clean(row?.id)));
  const domains=unique(newEntries.flatMap(row=>Array.isArray(row?.domains)?row.domains:[]).map(value=>clean(value).toUpperCase()));
  return{
    pass:reasons.length===0,
    reasons,
    changedFiles:files,
    newEntryIds:merged?.addedEntryIds||[],
    domains,
    allLearningDomainsEligible:true,
    directMainWrite:false,
    prMergeOnly:true,
    authorityExpanded:false
  };
}

export function runExternalAiKnowledgeStoreMerge({baseFile='',incomingFile='',outputFile=''}={}){
  if(!clean(baseFile)||!clean(incomingFile)||!clean(outputFile))throw new Error('external AI store merge paths required');
  const result=mergeVerifiedExternalAiKnowledgeStores({
    baseKnowledge:readJson(baseFile,{}),
    incomingKnowledge:readJson(incomingFile,{})
  });
  fs.mkdirSync(path.dirname(outputFile),{recursive:true});
  fs.writeFileSync(outputFile,JSON.stringify(result.knowledge,null,2)+'\n','utf8');
  return result;
}

export function distillExternalAiKnowledge(input={},existing={}){
  const prior=Array.isArray(existing?.entries)?existing.entries:[];
  const byId=new Map(prior.map(row=>[clean(row.id),row]).filter(([id])=>id));
  const accepted=[],rejected=[];
  for(const row of input?.records||[]){
    const check=validateExternalAiCandidate(row);
    const sourceId=safeId(row.id||crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex').slice(0,20));
    if(!check.ok){rejected.push({id:sourceId,reasons:check.reasons});continue;}
    const entry={
      id:`external-ai-distilled:${sourceId}`,
      sourceKind:'external-ai-distilled',
      provider:clean(row.provider),
      model:clean(row.model),
      engine:clean(row.engine).toLowerCase()||'cross-engine',
      gameId:clean(row.gameId)||'cross-game',
      domains:unique(row.domains||[]).slice(0,12),
      patterns:check.patterns,
      cautions:check.cautions,
      verified:true,
      independentlyVerified:true,
      distilled:true,
      advisoryOnly:true,
      reusable:true,
      rawOutputStored:false,
      rawOutputSha256:check.rawOutputSha256,
      verification:check.verification,
      directDevelopmentUse:false,
      directSourceWrite:false,
      directProductionPass:false,
      directMasteryCredit:false,
      directTrainingSample:false,
      authorityExpanded:false
    };
    byId.set(entry.id,entry);
    accepted.push(entry.id);
  }
  return {
    knowledge:{
      version:1,
      kind:'vibe2-external-ai-distilled-knowledge',
      entries:[...byId.values()],
      policy:{
        rawExternalAiOutputMayEnterDevelopment:false,
        independentVerificationRequired:true,
        minimumTraceableVerificationEvidenceItems:2,
        distilledKnowledgeAdvisoryOnly:true,
        directSourceWrite:false,
        directProductionPass:false,
        directMasteryCredit:false,
        directTrainingSample:false,
        verifiedProjectOutcomeRequiredForLaterMasteryOrTraining:true,
        authorityExpanded:false
      },
      authorityExpanded:false
    },
    accepted,rejected,
    authorityExpanded:false
  };
}

export function runExternalAiDistillation({inputFile='',outputFile='.vibe2/external-ai-distilled-knowledge.json'}={}){
  if(!clean(inputFile))throw new Error('external AI candidate input file required');
  const input=readJson(inputFile,{records:[]});
  const existing=readJson(outputFile,{version:1,entries:[]});
  const result=distillExternalAiKnowledge(input,existing);
  fs.mkdirSync(path.dirname(outputFile),{recursive:true});
  fs.writeFileSync(outputFile,JSON.stringify(result.knowledge,null,2)+'\n','utf8');
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  if(clean(args['merge-main-store']).toLowerCase()==='true'){
    const result=runExternalAiKnowledgeStoreMerge({
      baseFile:clean(args.base),
      incomingFile:clean(args.incoming),
      outputFile:clean(args.output)
    });
    console.log('VIBE2_EXTERNAL_AI_MAIN_STORE_MERGE=PASS');
    console.log(`VIBE2_EXTERNAL_AI_MAIN_STORE_ADDED=${result.addedEntryIds.length}`);
    console.log(`VIBE2_EXTERNAL_AI_MAIN_STORE_ADDED_IDS=${result.addedEntryIds.join(',')||'NONE'}`);
  }else if(clean(args['verify-main-promotion']).toLowerCase()==='true'){
    const result=validateExternalAiMainPromotion({
      baseKnowledge:readJson(clean(args.base),{}),
      candidateKnowledge:readJson(clean(args.candidate),{}),
      changedFiles:clean(args['changed-files'])
    });
    if(!result.pass)throw new Error('EXTERNAL_AI_MAIN_PROMOTION_BLOCKED:'+result.reasons.join('|'));
    console.log('VIBE2_EXTERNAL_AI_MAIN_PROMOTION=PASS');
    console.log(`VIBE2_EXTERNAL_AI_MAIN_PROMOTION_NEW_IDS=${result.newEntryIds.join(',')}`);
    console.log(`VIBE2_EXTERNAL_AI_MAIN_PROMOTION_DOMAINS=${result.domains.join(',')||'NONE'}`);
    console.log('VIBE2_EXTERNAL_AI_MAIN_PROMOTION_DIRECT_WRITE=NO');
    console.log('VIBE2_EXTERNAL_AI_MAIN_PROMOTION_PR_ONLY=YES');
  }else{
    const result=runExternalAiDistillation({inputFile:clean(args.input),outputFile:clean(args.output)||'.vibe2/external-ai-distilled-knowledge.json'});
    console.log('VIBE2_EXTERNAL_AI_DISTILLATION=PASS');
    console.log(`VIBE2_EXTERNAL_AI_ACCEPTED=${result.accepted.length}`);
    console.log(`VIBE2_EXTERNAL_AI_REJECTED=${result.rejected.length}`);
    console.log('VIBE2_EXTERNAL_AI_RAW_DIRECT_USE=NO');
    console.log('VIBE2_EXTERNAL_AI_SOURCE_WRITE=NO');
    console.log('VIBE2_EXTERNAL_AI_PRODUCTION_PASS=NO');
    console.log('VIBE2_EXTERNAL_AI_MASTERY_DIRECT=NO');
    console.log('VIBE2_EXTERNAL_AI_TRAINING_SAMPLE_DIRECT=NO');
  }
}
