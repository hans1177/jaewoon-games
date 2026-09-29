// 파일명: tools/company-system-ai-qa-contract-review.mjs
// 역할: System AI가 QA 계약을 수정할 때 실제 구현 결함을 테스트 완화로 숨기지 못하도록 중앙 정책/구현 정합성과 검증 강도를 확인한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'');

function evidenceHas(task={},marker=''){
  return (task.evidence||[]).map(clean).includes(marker);
}
function isExplicitQaEvolution(task={}){
  return clean(task.failureClass).toUpperCase()==='STALE_QA_CONTRACT'
    ||clean(task.taskType).toLowerCase()==='qa-contract-repair'
    ||evidenceHas(task,'qa-contract-drift:VERIFIED');
}
function strength(text=''){
  const source=String(text??'');
  return{
    tests:(source.match(/\btest\s*\(/g)||[]).length,
    asserts:(source.match(/\bassert(?:\.|\s*\()/g)||[]).length,
    throws:(source.match(/assert\.throws\s*\(/g)||[]).length,
    rejects:(source.match(/assert\.rejects\s*\(/g)||[]).length,
    negative:(source.match(/doesNotMatch|notEqual|strictEqual\([^,]+,\s*false\b/g)||[]).length
  };
}
function totalStrength(row={}){return Number(row.tests||0)+Number(row.asserts||0)+Number(row.throws||0)+Number(row.rejects||0)+Number(row.negative||0);}
function centralPolicyValid(policy={}){
  return clean(policy.policySource)==='company-learning/platform-release-roadmap.json'
    &&clean(policy.authority)==='MACHINE_EXECUTION_CONTRACT'
    &&Number(policy.version||0)>0;
}
function securityPolicyValid(policy={}){
  return clean(policy.sourceOfTruth)==='company-learning/platform-release-roadmap.json'
    &&clean(policy.kind)==='company-security-immune-system';
}

export function reviewSystemAiQaContract({
  task={},
  beforeByPath={},
  afterByPath={},
  policy={},
  securityPolicy={}
}={}){
  const changed=uniq([...Object.keys(beforeByPath||{}),...Object.keys(afterByPath||{})]).map(posix);
  const qaFiles=changed.filter(file=>file.startsWith('qa/'));
  const explicit=isExplicitQaEvolution(task);
  if(!qaFiles.length)return{
    version:1,required:false,allowed:true,verifiedContractDrift:false,reason:'NO_QA_FILE_CHANGE',
    evidence:['system-ai-qa-contract-review:NOT_REQUIRED']
  };

  if(!explicit)return{
    version:1,required:false,allowed:true,verifiedContractDrift:false,reason:'ORDINARY_QA_CHANGE_CANONICAL_QA_STILL_REQUIRED',
    evidence:['system-ai-qa-contract-review:ORDINARY_QA_CHANGE','qa-contract-drift:NO']
  };

  if(!centralPolicyValid(policy))return{
    version:1,required:true,allowed:false,verifiedContractDrift:false,reason:'CURRENT_CENTRAL_POLICY_REQUIRED',
    evidence:['system-ai-qa-contract-review:BLOCKED','qa-contract-drift:UNVERIFIED']
  };

  const implementationAgreement=evidenceHas(task,'current-policy-implementation-agreement:PASS')
    ||(task.contextFiles||[]).map(posix).some(file=>!file.startsWith('qa/')&&!file.startsWith('company-learning/'));
  if(!implementationAgreement)return{
    version:1,required:true,allowed:false,verifiedContractDrift:false,reason:'CURRENT_IMPLEMENTATION_AGREEMENT_PROOF_REQUIRED',
    evidence:['system-ai-qa-contract-review:BLOCKED','qa-contract-drift:UNVERIFIED']
  };

  const touchesSecurity=qaFiles.some(file=>/security/i.test(file));
  if(touchesSecurity&&!securityPolicyValid(securityPolicy))return{
    version:1,required:true,allowed:false,verifiedContractDrift:false,reason:'CURRENT_SECURITY_POLICY_REQUIRED',
    evidence:['system-ai-qa-contract-review:BLOCKED','qa-contract-drift:UNVERIFIED','security-rescan-required:YES']
  };

  const weakened=[];
  const strengthRows=[];
  for(const file of qaFiles){
    const before=strength(beforeByPath[file]||''),after=strength(afterByPath[file]||'');
    strengthRows.push({file,before,after});
    if(totalStrength(after)<totalStrength(before)
      ||after.tests<before.tests
      ||after.asserts<before.asserts
      ||after.throws<before.throws
      ||after.rejects<before.rejects){
      weakened.push(file);
    }
  }
  if(weakened.length)return{
    version:1,required:true,allowed:false,verifiedContractDrift:false,reason:'QA_ASSERTION_OR_TEST_COVERAGE_WEAKENING_FORBIDDEN',
    weakenedFiles:weakened,strength:strengthRows,
    evidence:['system-ai-qa-contract-review:BLOCKED','qa-contract-drift:UNVERIFIED','qa-gate-weakening:REJECTED']
  };

  const verified=evidenceHas(task,'qa-contract-drift:VERIFIED');
  if(!verified)return{
    version:1,required:true,allowed:false,verifiedContractDrift:false,reason:'QA_CONTRACT_DRIFT_MUST_BE_INDEPENDENTLY_VERIFIED_BEFORE_REPAIR',
    strength:strengthRows,
    evidence:['system-ai-qa-contract-review:BLOCKED','qa-contract-drift:UNVERIFIED']
  };

  return{
    version:1,required:true,allowed:true,verifiedContractDrift:true,reason:'VERIFIED_QA_CONTRACT_DRIFT_REPAIR_WITHOUT_COVERAGE_REDUCTION',
    strength:strengthRows,
    independentVerificationRequired:true,
    securityRescanRequired:touchesSecurity,
    evidence:[
      'system-ai-qa-contract-review:PASS',
      'qa-contract-drift:VERIFIED',
      'qa-gate-weakening:NO',
      'independent-verification-required:YES',
      ...(touchesSecurity?['security-rescan-required:YES']:[])
    ]
  };
}

function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=parseArgs(),task=readJson(clean(a.task),{}),policy=readJson(clean(a.policy)||'company-learning/platform-release-roadmap.json',{}),securityPolicy=readJson(clean(a.security)||'company-learning/security-immune-system.json',{});
  const before=readJson(clean(a.before),{}),after=readJson(clean(a.after),{});
  const result=reviewSystemAiQaContract({task,beforeByPath:before,afterByPath:after,policy,securityPolicy});
  if(clean(a.output)){fs.mkdirSync(path.dirname(a.output),{recursive:true});fs.writeFileSync(a.output,JSON.stringify(result,null,2)+'\n');}
  console.log('SYSTEM_AI_QA_CONTRACT_REVIEW='+(result.allowed?'PASS':'BLOCK'));
  console.log('SYSTEM_AI_QA_CONTRACT_DRIFT='+(result.verifiedContractDrift?'VERIFIED':'NO'));
  console.log('SYSTEM_AI_QA_CONTRACT_REASON='+result.reason);
  if(!result.allowed)process.exitCode=1;
}
