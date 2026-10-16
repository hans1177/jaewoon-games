// 파일명: tools/company-constitution-enforcer.mjs
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// 메인: 소유자 지시와 단일 정책이 명시적으로 연결된 경우에만 검증한다.
const POLICY_PATH='company-learning/owner-single-policy.json';
const LEGACY_PATH='company-learning/platform-release-roadmap.json';
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
export function enforceConstitution({phase='runtime',root=process.cwd(),policy}={}) {
  const errors=[];
  let directive=null;
  let canonical=null;
  let fingerprint=null;
  try {directive=JSON.parse(fs.readFileSync(path.join(root,'company-directive.json'),'utf8'));}
  catch {errors.push('OWNER_DIRECTIVE_UNAVAILABLE');}
  try {
    const bytes=fs.readFileSync(path.join(root,POLICY_PATH),'utf8');
    canonical=JSON.parse(bytes);
    fingerprint=sha256(bytes);
  } catch {errors.push('SINGLE_POLICY_MISSING_OR_INVALID');}
  if(fs.existsSync(path.join(root,LEGACY_PATH))) errors.push('DELETED_POLICY_REAPPEARED_REQUIRES_OWNER_REVIEW');
  if(policy!==undefined) errors.push('DELETED_CONSTITUTION_CANNOT_BE_REINSTATED_BY_CALLER');
  if(directive) {
    if(directive.policyDocument!==POLICY_PATH ||
       directive.documentationSynchronization?.centralPolicyPath!==POLICY_PATH)
      errors.push('OWNER_POLICY_AUTHORITY_NOT_MIGRATED');
    if(directive.legacyCentralPolicyReferenceCleanup?.removedPolicyPath!==LEGACY_PATH ||
       directive.legacyCentralPolicyReferenceCleanup?.replacementPolicyNotAsserted!==true ||
       directive.legacyCentralPolicyReferenceCleanup?.executionContractChangeNotAuthorized!==true ||
       !/^[0-9a-f]{40}$/.test(String(directive.legacyCentralPolicyReferenceCleanup?.removedByCommit||'')))
      errors.push('OWNER_POLICY_REMOVAL_RECORD_INVALID');
  }
  if(canonical) {
    if(canonical.kind!=='OWNER_SINGLE_CANONICAL_POLICY' || canonical.status!=='ACTIVE' ||
       canonical.principles?.singleCanonicalPolicy!==true ||
       canonical.principles?.retainSecurityAndReleaseVerification!==true ||
       canonical.principles?.preserveExistingGameLogicAndSaves!==true ||
       canonical.principles?.neverFabricatePass!==true ||
       canonical.migration?.automaticPassOnCreation!==false)
      errors.push('SINGLE_POLICY_NOT_ACTIVE_OR_INVALID');
    if(!Array.isArray(canonical.machineEnforcement?.assertions) || canonical.machineEnforcement.assertions.length===0)
      errors.push('MACHINE_ENFORCEMENT_ASSERTIONS_MISSING');
  }
  // 기존 세 중앙문서의 무결성 확인 없는 헌법 검증 통과 금지.
  const required=[
    ['company-learning/company-log-map.json','MACHINE_EXECUTION_LOG_MAP'],
    ['company-learning/company-architecture-map.json','MACHINE_EXECUTION_ARCHITECTURE_MAP'],
    ['company-learning/security-immune-system.json','OWNER_DIRECTIVE_2026-09-19']
  ];
  for(const [file,authority] of required) {
    try {
      const doc=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
      if(doc.authority!==authority || !Number.isInteger(doc.version) || doc.version<=0)
        errors.push('RETAINED_DOCUMENT_INVALID:'+file);
    } catch {errors.push('RETAINED_DOCUMENT_UNAVAILABLE:'+file);}
  }
  if(errors.length)errors.push('CONSTITUTION_AUTHORITY_UNAVAILABLE');
  if(errors.length)return {pass:false,phase,errors,constitutionFingerprint:null,orderedRuleIds:[],enforcedRuleCount:0,enforcementSchemaVersion:0};
  return {pass:true,phase,errors:[],constitutionFingerprint:fingerprint,orderedRuleIds:['SINGLE_OWNER_POLICY'],enforcedRuleCount:1,enforcementSchemaVersion:1};
}

// 로그
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const phaseArg=process.argv.slice(2).find(v=>v.startsWith('--phase='));
  const result=enforceConstitution({phase:phaseArg?phaseArg.slice(8):'runtime'});
  console.log('CONSTITUTION_ENFORCEMENT='+(result.pass?'PASS':'BLOCKED'));
  console.log('CONSTITUTION_PHASE='+result.phase);
  console.log('CONSTITUTION_FAILURE_SIGNATURE='+result.errors.join(','));
  process.exitCode=result.pass?0:1;
}
