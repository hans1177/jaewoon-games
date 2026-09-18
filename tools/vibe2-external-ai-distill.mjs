// 파일명: tools/vibe2-external-ai-distill.mjs
// 역할: 외부 AI 원문을 개발에 직접 사용하지 않고, 독립 검증된 짧은 지식 패턴만 advisory retrieval 자료로 증류한다.
// 원칙: 외부 AI 원문 저장 금지, 소스 쓰기/PASS/Mastery/Training Sample 권한 0.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const sha256=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};

export const EXTERNAL_AI_POLICY=Object.freeze({
  mode:'EXTERNAL_AI_KNOWLEDGE_DISTILLATION_ONLY',
  maxPatternChars:700,
  minimumEvidenceItems:2,
  rawExternalAiStored:false,
  sourceWrite:false,
  productionPass:false,
  masteryCredit:false,
  trainingSample:false,
  authority:'ADVISORY_ONLY'
});

function args(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const i=raw.indexOf('=');
    if(i<0)out[raw.slice(2)]=true;
    else out[raw.slice(2,i)]=raw.slice(i+1);
  }
  return out;
}

function bounded(value,max=EXTERNAL_AI_POLICY.maxPatternChars){
  const text=clean(value).replace(/\s+/g,' ');
  return text.length>max?text.slice(0,max):text;
}

function packetFingerprint(packetRaw='',packetInput={}){
  return sha256(packetRaw||JSON.stringify(packetInput));
}

function verifyEnvelope(packetInput={},packetRaw='',verificationInput={}){
  if(clean(packetInput.kind)!=='external-ai-teacher-packet')throw new Error('external AI teacher packet kind invalid');
  if(!clean(packetInput.provider)||!clean(packetInput.model))throw new Error('external AI provider/model required');
  if(clean(verificationInput.kind)!=='external-ai-teacher-verification')throw new Error('external AI verification kind invalid');
  if(upper(verificationInput.independentReview)!=='PASS')throw new Error('independent external AI review PASS required');
  const fingerprint=packetFingerprint(packetRaw,packetInput);
  if(clean(verificationInput.packetSha256)!==fingerprint)throw new Error('external AI packet sha256 mismatch');
  return fingerprint;
}

function knowledgePattern(item={}){
  const claim=bounded(item.claim);
  const pattern=bounded(item.recommendedPattern);
  const risks=uniq(item.risks||[]).map(x=>bounded(x,220));
  if(!claim&&!pattern)return '';
  return bounded([claim,pattern,risks.length?'risks='+risks.join(' | '):''].filter(Boolean).join(' | '));
}

function forbiddenRawCode(item={},pattern=''){
  if(clean(item.rawCode)||clean(item.sourceCode))return true;
  if(/\`\`\`/.test(pattern))return true;
  return false;
}

export function distillExternalAiKnowledge({
  packetInput={},
  packetRaw='',
  verificationInput={},
  existingInput={}
}={}){
  const packetSha256=verifyEnvelope(packetInput,packetRaw,verificationInput);
  const verifiedRows=new Map((verificationInput.verifiedItems||[]).map(row=>[clean(row.id),row]));
  const existing=(existingInput?.entries||[]).filter(row=>row?.distilled===true&&row?.rawExternalAiStored===false);
  const byId=new Map(existing.map(row=>[clean(row.id),row]));
  const accepted=[];
  const skipped=[];

  for(const item of packetInput.items||[]){
    const sourceId=clean(item.id);
    if(!sourceId){skipped.push({id:null,reason:'MISSING_ITEM_ID'});continue;}
    const verification=verifiedRows.get(sourceId);
    if(!verification||upper(verification.status)!=='PASS'){
      skipped.push({id:sourceId,reason:'ITEM_NOT_INDEPENDENTLY_VERIFIED'});
      continue;
    }
    const evidence=uniq(verification.evidence||[]);
    if(evidence.length<EXTERNAL_AI_POLICY.minimumEvidenceItems){
      skipped.push({id:sourceId,reason:'INSUFFICIENT_INDEPENDENT_EVIDENCE'});
      continue;
    }
    const pattern=knowledgePattern(item);
    if(!pattern){
      skipped.push({id:sourceId,reason:'EMPTY_DISTILLED_PATTERN'});
      continue;
    }
    if(forbiddenRawCode(item,pattern)){
      skipped.push({id:sourceId,reason:'RAW_CODE_FORBIDDEN'});
      continue;
    }

    const provider=clean(packetInput.provider);
    const model=clean(packetInput.model);
    const id='extai_'+sha256([provider,model,sourceId,pattern].join('|')).slice(0,24);
    const row={
      id,
      sourceItemId:sourceId,
      topic:bounded(item.topic,120)||'general',
      pattern,
      applicability:uniq(item.applicability||[]).slice(0,12),
      risks:uniq(item.risks||[]).map(x=>bounded(x,220)).slice(0,8),
      evidence:evidence.slice(0,12),
      providerFingerprint:sha256(provider).slice(0,16),
      modelFingerprint:sha256(model).slice(0,16),
      packetFingerprint:packetSha256,
      claimFingerprint:sha256(clean(item.claim)||pattern),
      verified:true,
      distilled:true,
      advisoryOnly:true,
      authority:EXTERNAL_AI_POLICY.authority,
      rawExternalAiStored:false,
      sourceWrite:false,
      productionPass:false,
      masteryCredit:false,
      trainingSample:false,
      releaseEvidence:false
    };
    byId.set(id,row);
    accepted.push(row);
  }

  return {
    knowledge:{
      version:1,
      kind:'vibe2-external-ai-distilled-knowledge',
      authority:EXTERNAL_AI_POLICY.authority,
      rawExternalAiStored:false,
      masteryCredit:false,
      trainingSample:false,
      entries:[...byId.values()].sort((a,b)=>clean(a.id).localeCompare(clean(b.id)))
    },
    accepted,
    skipped,
    packetSha256,
    authorityExpanded:false,
    sourceWrite:false,
    productionPass:false,
    masteryCredit:false,
    trainingSample:false
  };
}

function assertEphemeralRawInput(file,cwd=process.cwd()){
  const resolved=path.resolve(file);
  const root=path.resolve(cwd)+path.sep;
  if(resolved.startsWith(root))throw new Error('raw external AI packet must stay outside repository');
  return resolved;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();
  const input=clean(a.input);
  const verificationFile=clean(a.verification);
  const output=clean(a.output)||'.vibe2/external-ai-distilled-knowledge.json';
  if(!input||!verificationFile)throw new Error('--input and --verification required');
  const rawPath=assertEphemeralRawInput(input);
  const packetRaw=fs.readFileSync(rawPath,'utf8');
  const result=distillExternalAiKnowledge({
    packetInput:JSON.parse(packetRaw),
    packetRaw,
    verificationInput:readJson(verificationFile,{}),
    existingInput:readJson(output,{entries:[]})
  });
  writeJson(output,result.knowledge);
  console.log('VIBE2_EXTERNAL_AI_DISTILL=PASS');
  console.log('VIBE2_EXTERNAL_AI_ACCEPTED='+result.accepted.length);
  console.log('VIBE2_EXTERNAL_AI_SKIPPED='+result.skipped.length);
  console.log('VIBE2_EXTERNAL_AI_RAW_STORED=NO');
  console.log('VIBE2_EXTERNAL_AI_SOURCE_WRITE=NO');
  console.log('VIBE2_EXTERNAL_AI_PRODUCTION_PASS=NO');
  console.log('VIBE2_EXTERNAL_AI_MASTERY_CREDIT=NO');
  console.log('VIBE2_EXTERNAL_AI_TRAINING_SAMPLE=NO');
}
