// 파일명: tools/main-write-guard.mjs
// 역할: 자동화/워크플로우 변경에서 main 직접 쓰기를 결정론적으로 차단한다.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const normalizePath=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'');
export const FINAL_CHAIN_LOCK_PATHS=Object.freeze([
  "company-learning/platform-release-roadmap.json",
  "company-learning/company-log-map.json",
  "company-learning/company-architecture-map.json",
  "company-learning/security-immune-system.json",
  "company-learning/vibe3-engine-contract.json",
  "company-learning/vibe3-task-playbooks.json",
  "tools/main-write-guard.mjs",
  ".github/workflows/main-write-guard.yml",
  ".github/workflows/company-central-policy-contract-qa.yml",
  "tools/company-build-up-directive.mjs",
  "tools/vibe2-source-worker.mjs",
  "tools/company-development-roblox-bootstrap.mjs",
  "tools/company-development-roblox-source-reconcile.mjs",
  "tools/company-development-roblox-runtime-foundation.mjs",
  "tools/vibe3-roblox-platform.mjs",
  ".github/workflows/company-development-roblox-post-runtime-qa.yml"
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

export function finalChainLockViolations({files=[],lock=null,actor='',owner='hans1177',unlockTitle=''}={}){
  if(clean(lock?.status).toUpperCase()!=='LOCKED')return[];
  const ownerUnlock=clean(actor)===clean(owner)&&/\[OWNER_UNLOCK\]/i.test(clean(unlockTitle));
  if(ownerUnlock)return[];
  const configured=Array.isArray(lock?.lockedPaths)&&lock.lockedPaths.length?lock.lockedPaths:FINAL_CHAIN_LOCK_PATHS;
  const locked=new Set(configured.map(normalizePath));
  return files.map(normalizePath).filter(file=>locked.has(file)).map(file=>({file,reason:'FINAL_CHAIN_LOCKED'}));
}

function readBaseFinalChainLock(baseRef){
  try{
    const raw=execFileSync('git',['show',`${baseRef}:company-learning/platform-release-roadmap.json`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    const policy=JSON.parse(raw);
    return policy?.finalDevelopmentLock?.chainLock||policy?.finalChainLock||null;
  }catch{return null;}
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
  const lock=readBaseFinalChainLock(base);
  const lockViolations=finalChainLockViolations({
    files,lock,actor:arg('actor',''),owner:arg('owner','hans1177'),unlockTitle:arg('unlock-title','')
  });
  const violations=[...directMainViolations,...lockViolations];
  const result={
    status:violations.length?'FAIL':'PASS',
    developmentProgress:violations.length?'BLOCKED':'INCOMPLETE_PROGRESS',
    changedWorkflowFiles:files.filter(isWorkflowPath),
    finalChainLockActive:clean(lock?.status).toUpperCase()==='LOCKED',
    finalChainLockViolationCount:lockViolations.length,
    violations,
    adminProtection:'ADMIN_PROTECTION_BLOCKER',
    rule:'feature branch -> PR -> CI -> merge; workflow direct-write to main forbidden',
  };
  console.log(JSON.stringify(result,null,2));
  if(violations.length)process.exitCode=1;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
