// 파일명: tools/main-write-guard.mjs
// 역할: 자동화/워크플로우 변경에서 main 직접 쓰기를 결정론적으로 차단한다.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const normalizePath=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'');
export const FINAL_CHAIN_LOCK_PATHS=Object.freeze([
  "tools/main-write-guard.mjs",
  ".github/workflows/main-write-guard.yml"
]);

export const LOCKED_FLOW_SEQUENCE_KEYS=Object.freeze([
  "developmentLifecycleMachine.verifiedF0F9PublicationLoop.sequence",
  "developmentLifecycleMachine.nativeGameFoundationValidationStack.releaseGate.canonicalSequence"
]);

const DIRECT_MAIN_PATTERNS=[
  /git\s+push\b[^\n]*\borigin\b[^\n]*(?:HEAD:main|\bmain\b)/i,
  /gh\s+api\b[^\n]*\/git\/refs\/heads\/main\b/i,
  /refs\/heads\/main\b[^\n]*(?:\bPATCH\b|\bPOST\b|\bPUT\b)/i,
];
const WORKFLOW_EXT=/\.ya?ml$/i;

export function isWorkflowPath(file=''){
  return String(file).startsWith('.github/workflows/')&&WORKFLOW_EXT.test(file);
}

export function scanTextForDirectMainWrite(text=''){
  const lines=String(text).split(/\r?\n/);
  const violations=[];
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(DIRECT_MAIN_PATTERNS.some(pattern=>pattern.test(line))){
      violations.push({line:index+1,text:line.trim()});
    }
  }
  return violations;
}

export function scanChangedWorkflowFiles(files=[]){
  const violations=[];
  for(const file of files.filter(isWorkflowPath)){
    if(!fs.existsSync(file))continue;
    for(const hit of scanTextForDirectMainWrite(fs.readFileSync(file,'utf8'))){
      violations.push({file,...hit});
    }
  }
  return violations;
}

function finalLockStatus(lock={}){
  return clean(lock?.chainLock?.status||lock?.status).toUpperCase();
}
function readPolicyAtRef(ref){
  try{
    const raw=execFileSync('git',['show',`${ref}:company-learning/platform-release-roadmap.json`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    return JSON.parse(raw);
  }catch{return null;}
}
function valueAtPath(input,path){
  let value=input;
  for(const key of String(path).split('.'))value=value?.[key];
  return value;
}
export function flowSequenceLockViolations({basePolicy=null,headPolicy=null,lock=null}={}){
  if(finalLockStatus(lock)!=='LOCKED'||Number(lock?.version||0)<2)return[];
  const violations=[];
  for(const key of LOCKED_FLOW_SEQUENCE_KEYS){
    const before=valueAtPath(basePolicy,key);
    const after=valueAtPath(headPolicy,key);
    if(JSON.stringify(before)!==JSON.stringify(after)){
      violations.push({file:"company-learning/platform-release-roadmap.json",reason:"FLOW_SEQUENCE_LOCKED_AUTOMATION_IMMUTABLE",sequence:key});
    }
  }
  return violations;
}

export function finalDevelopmentLockMetadataViolations({basePolicy=null,headPolicy=null,lock=null}={}){
  if(finalLockStatus(lock)!=='LOCKED'||Number(lock?.version||0)<2)return[];
  const next=headPolicy?.finalDevelopmentLock||{};
  const required={
    version:2,
    status:'LOCKED',
    scope:'CANONICAL_FLOW_SEQUENCE_AND_GUARD_ONLY',
    sequenceStatus:'LOCKED',
    sequenceMode:'SEQUENCE_SEMANTICS_ONLY'
  };
  const actual={
    version:Number(next?.version||0),
    status:clean(next?.status).toUpperCase(),
    scope:clean(next?.scope).toUpperCase(),
    sequenceStatus:clean(next?.sequenceLock?.status).toUpperCase(),
    sequenceMode:clean(next?.sequenceLock?.mode).toUpperCase()
  };
  const violations=[];
  for(const [key,value] of Object.entries(required)){
    const expected=typeof value==='string'?value.toUpperCase():value;
    if(actual[key]!==expected)violations.push({
      file:'company-learning/platform-release-roadmap.json',
      reason:'FINAL_SEQUENCE_LOCK_METADATA_IMMUTABLE',
      field:key
    });
  }
  return violations;
}
function oneTimeV1HardeningMigrationAllowed(lock={},actor='',owner='hans1177',unlockTitle=''){
  return Number(lock?.version||0)===1
    && clean(actor)===clean(owner)
    && /^\[OWNER_LOCK_HARDEN_V2\](?:\s|$)/i.test(clean(unlockTitle));
}

export function finalChainLockViolations({files=[],lock=null,actor='',owner='hans1177',unlockTitle=''}={}){
  if(finalLockStatus(lock)!=='LOCKED')return[];
  // One-time migration only: the base policy must still be lock v1.
  // After v2 lands, PR title/body/chat metadata can never unlock the chain.
  if(oneTimeV1HardeningMigrationAllowed(lock,actor,owner,unlockTitle))return[];
  const configured=FINAL_CHAIN_LOCK_PATHS;
  const locked=new Set(configured.map(normalizePath));
  return files.map(normalizePath).filter(file=>locked.has(file)).map(file=>({
    file,
    reason:Number(lock?.version||0)>=2?'FINAL_CHAIN_LOCKED_AUTOMATION_IMMUTABLE':'FINAL_CHAIN_LOCKED'
  }));
}

function readBaseFinalChainLock(baseRef){
  const policy=readPolicyAtRef(baseRef);
  return policy?.finalDevelopmentLock||policy?.finalChainLock||null;
}

function changedFiles(baseRef,headRef){
  let out='';
  try{
    out=execFileSync('git',['diff','--name-only',`${baseRef}...${headRef}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  }catch{
    out=execFileSync('git',['diff','--name-only',baseRef,headRef],{encoding:'utf8'});
  }
  return out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}

function arg(name,fallback=''){
  const value=process.argv.find(item=>item.startsWith(`--${name}=`));
  return value?value.slice(name.length+3):fallback;
}

function main(){
  const base=arg('base','origin/main');
  const head=arg('head','HEAD');
  const files=changedFiles(base,head);
  const directMainViolations=scanChangedWorkflowFiles(files);
  const basePolicy=readPolicyAtRef(base);
  const headPolicy=readPolicyAtRef(head);
  const lock=basePolicy?.finalDevelopmentLock||basePolicy?.finalChainLock||null;
  const lockViolations=finalChainLockViolations({
    files,lock,actor:arg('actor',''),owner:arg('owner','hans1177'),unlockTitle:arg('unlock-title','')
  });
  const sequenceViolations=flowSequenceLockViolations({basePolicy,headPolicy,lock});
  const lockMetadataViolations=finalDevelopmentLockMetadataViolations({basePolicy,headPolicy,lock});
  const violations=[...directMainViolations,...lockViolations,...sequenceViolations,...lockMetadataViolations];
  const result={
    status:violations.length?'FAIL':'PASS',
    developmentProgress:violations.length?'BLOCKED':'INCOMPLETE_PROGRESS',
    changedWorkflowFiles:files.filter(isWorkflowPath),
    finalChainLockActive:finalLockStatus(lock)==='LOCKED',
    finalChainLockVersion:Number(lock?.version||0)||null,
    finalChainUnlockMode:Number(lock?.version||0)>=2?'MANUAL_REPOSITORY_ADMIN_OUT_OF_BAND_ONLY':'V1_HARDENING_MIGRATION_ONLY',
    finalChainLockViolationCount:lockViolations.length,
    flowSequenceLockViolationCount:sequenceViolations.length,
    finalSequenceLockMetadataViolationCount:lockMetadataViolations.length,
    flowSequenceLockScope:'FLOW_SEQUENCE_ONLY',
    chainImplementationOptimizationAllowed:sequenceViolations.length===0,
    violations,
    adminProtection:'ADMIN_PROTECTION_BLOCKER',
    rule:'feature branch -> PR -> CI -> merge; workflow direct-write to main forbidden; F0/F9 flow sequence is immutable to assistant/automation while chain implementation and bottleneck repair remain editable when sequence is preserved',
  };
  console.log(JSON.stringify(result,null,2));
  if(violations.length)process.exitCode=1;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
