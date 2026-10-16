// 파일명: tools/company-constitution-enforcer.mjs
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateSharedWorkerContext} from './company-shared-context.mjs';

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
  // 기존 정식 공유문서 검증기를 재사용해 문서 관계와 무결성까지 확인한다.
  try {
    const shared=validateSharedWorkerContext({root});
    if(shared.pass!==true || shared.policyAuthorityVerified!==false)
      errors.push('SHARED_CONTEXT_UNEXPECTED_AUTHORITY_STATE');
  } catch(error) {
    errors.push('SHARED_CONTEXT_VALIDATION_FAILED:'+String(error.message));
  }
  // 규칙 목록 존재만으로 PASS를 허용하면 실제 규칙 검사가 생략된다.
  // 각 규칙의 실행 검증기를 정식 연결하기 전까지 반드시 차단한다.
  if(canonical?.machineEnforcement?.assertions?.length>0)
    errors.push('MACHINE_ASSERTION_EXECUTION_NOT_IMPLEMENTED');
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
