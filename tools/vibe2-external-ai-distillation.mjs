// 파일명: tools/vibe2-external-ai-distillation.mjs
// 역할: 외부 AI 출력은 원문 그대로 개발에 주입하지 않고, 독립 검증된 일반화 지식만 advisory store로 증류한다.
// 안전: source write 0, production PASS 0, Mastery 직접 상승 0, canonical training sample 직접 생성 0.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=(value)=>String(value??'').trim();
const unique=(values=[])=>[...new Set((values||[]).map(clean).filter(Boolean))];
const METHODS=new Set(['runtime','independent-qa','source-backed-review','multi-source-consistency']);
const SHA256=/^[a-f0-9]{64}$/i;

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
  if(!evidence.length)reasons.push('VERIFICATION_EVIDENCE_REQUIRED');
  if(!patterns.length)reasons.push('DISTILLED_PATTERN_REQUIRED');
  if(row.sourceWrite===true)reasons.push('SOURCE_WRITE_FORBIDDEN');
  if(row.productionPass===true)reasons.push('PRODUCTION_PASS_FORBIDDEN');
  if(row.authorityExpanded===true)reasons.push('AUTHORITY_EXPANSION_FORBIDDEN');
  return {ok:reasons.length===0,reasons,verification:{independent:true,status:'PASS',method,evidence},rawOutputSha256,patterns,cautions};
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
  fs.writeFileSync(outputFile,JSON.stringify(result.knowledge,null,2)+'\n','utf8');
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
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
