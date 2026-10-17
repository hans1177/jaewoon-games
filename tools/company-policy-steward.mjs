// 파일명: tools/company-policy-steward.mjs
// 역할: 기존 중앙 4문서만 읽어 가장 최근에 승인된 사용자 지시의 해석을 우선한다.
// 원칙: 문서 원본·게임·큐·보안·검증·배포 상태 불변. 별도 개발 파이프라인 없음.

// 임포트
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// 메인
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CANONICAL='company-learning/platform-release-roadmap.json';
const clean=value=>String(value??'').trim();
function read(root,file){
  const value=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('POLICY_STEWARD_INVALID_DOCUMENT:'+file);
  return value;
}
export function auditFourPolicyDocuments({root=ROOT}={}){
  const policy=read(root,CANONICAL);
  const set=policy.centralDocumentation?.canonicalSet||{};
  if(set.policy!==CANONICAL)throw new Error('POLICY_STEWARD_CANONICAL_REFERENCE_INVALID');
  const managedDocuments=[set.policy,set.logMap,set.architectureMap,set.securityPolicy];
  if(managedDocuments.some(f=>!clean(f)||!f.startsWith('company-learning/')))throw new Error('POLICY_STEWARD_DOCUMENT_SET_INVALID');
  for(const file of managedDocuments.slice(1)){
    const data=read(root,file);
    if(!Number.isInteger(data.version)||data.version<1)throw new Error('POLICY_STEWARD_DOCUMENT_VERSION_INVALID:'+file);
  }
  // 가장 최근에 main 정책에 반영된 명시적 사용자 개발 범위만 선택한다.
  // 날짜 없는 상태 정보나 이전 대화는 승인된 기계 정책을 대신할 수 없다.
  const candidates=Object.entries(policy)
    .filter(([key,value])=>key.startsWith('owner')&&value?.status==='ACTIVE'&&
      Array.isArray(value.activeTargets)&&Array.isArray(value.ownerHeldTargets)&&
      /^OWNER_DIRECTIVE_\d{4}-\d{2}-\d{2}(?:_[A-Z0-9_]+)?$/.test(clean(value.authority)))
    .map(([key,value])=>({key,value,date:value.authority.slice('OWNER_DIRECTIVE_'.length,'OWNER_DIRECTIVE_'.length+10)}))
    .sort((a,b)=>b.date.localeCompare(a.date));
  if(!candidates.length)throw new Error('POLICY_STEWARD_APPROVED_OWNER_DIRECTIVE_MISSING');
  const newest=candidates[0];
  const equallyRecent=candidates.filter(entry=>entry.date===newest.date);
  const signatures=new Set(equallyRecent.map(entry=>JSON.stringify([entry.value.activeTargets,entry.value.ownerHeldTargets])));
  if(signatures.size>1)throw new Error('POLICY_STEWARD_SAME_DATE_OWNER_CONFLICT');
  const active=newest.value.activeTargets;
  const held=newest.value.ownerHeldTargets;
  if(!active.length||active.some(p=>held.includes(p)))throw new Error('POLICY_STEWARD_OWNER_SCOPE_INVALID');
  const effectiveDevelopmentAccess={...policy.developmentAccess};
  for(const p of active)effectiveDevelopmentAccess[p]='ALWAYS_ALLOWED';
  for(const p of held)effectiveDevelopmentAccess[p]='OWNER_HOLD';
  const staleLegacyPolicyFields=Object.keys(effectiveDevelopmentAccess)
    .filter(p=>effectiveDevelopmentAccess[p]!==policy.developmentAccess?.[p]);
  return{
    role:'CENTRAL_FOUR_DOCUMENT_STEWARD',managedDocuments,
    latestOwnerSection:newest.key,ownerDirective:newest.value.authority,
    effectiveDevelopmentAccess,staleLegacyPolicyFields,
    sourcePolicyVersion:policy.version,nonBlockingAudit:true,writesAllowed:false,
    securityAndReleaseChecksUnchanged:true
  };
}

// 로그
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.argv.some(arg=>arg.startsWith('--fix')))throw new Error('POLICY_STEWARD_FILE_WRITE_FORBIDDEN');
  const result=auditFourPolicyDocuments();
  console.log('POLICY_STEWARD_OWNER_DIRECTIVE='+result.ownerDirective);
  console.log('POLICY_STEWARD_LATEST_OWNER_SECTION='+result.latestOwnerSection);
  console.log('POLICY_STEWARD_LEGACY_SCOPE_CONFLICTS='+(result.staleLegacyPolicyFields.join(',')||'NONE'));
  console.log('POLICY_STEWARD_FILE_WRITES=NONE');
  console.log('POLICY_STEWARD_GAME_FLOW_MUTATION=NONE');
}
