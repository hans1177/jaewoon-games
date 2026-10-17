// 파일명: tools/company-policy-steward.mjs
// 역할: 중앙 네 문서의 무결성과 최신 승인된 owner 지시의 우선순위를 읽기 전용으로 판정한다.
// 원칙: 잠긴 요약 원본, 정책, 게임, 큐, 보안 및 배포 결과는 변경하지 않는다.

// 임포트
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// 메인
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CANONICAL='company-learning/platform-release-roadmap.json';
const clean=value=>String(value??'').trim();
const read=(root,relative)=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('POLICY_STEWARD_INVALID_DOCUMENT:'+relative);
  return data;
};
export function auditFourPolicyDocuments({root=ROOT}={}){
  const policy=read(root,CANONICAL);
  const steward=policy.centralDocumentation?.policySteward;
  const canonicalSet=policy.centralDocumentation?.canonicalSet;
  const docs=[CANONICAL,canonicalSet?.logMap,canonicalSet?.architectureMap,canonicalSet?.securityPolicy];
  if(steward?.role!=='CENTRAL_POLICY_STEWARD'||
    steward?.autoRepairScope!=='RUNTIME_INTERPRETATION_ONLY_NO_FILE_REWRITE'||
    steward?.neverWriteCanonicalPolicy!==true||
    JSON.stringify(steward.managedDocuments)!==JSON.stringify(docs)||
    canonicalSet?.policy!==CANONICAL||docs.some(p=>!clean(p))){
    throw new Error('POLICY_STEWARD_CANONICAL_CONTRACT_MISSING');
  }
  for(const file of docs.slice(1)){
    const summary=read(root,file);
    if(!Number.isInteger(summary.version)||summary.version<1)throw new Error('POLICY_STEWARD_SUMMARY_INVALID:'+file);
  }
  const pathText=clean(steward.latestOwnerDirectivePath);
  if(!/^owner[A-Za-z0-9_.]+$/.test(pathText))throw new Error('POLICY_STEWARD_OWNER_PATH_INVALID');
  const owner=pathText.split('.').reduce((value,key)=>value?.[key],policy);
  const directive=clean(owner?.authority);
  if(!/^OWNER_DIRECTIVE_\d{4}-\d{2}-\d{2}(?:_[A-Z0-9_]+)?$/.test(directive)||
    owner?.status!=='ACTIVE')throw new Error('POLICY_STEWARD_APPROVED_OWNER_DIRECTIVE_MISSING');
  const active=Array.isArray(owner.activeTargets)?owner.activeTargets:[];
  const held=Array.isArray(owner.ownerHeldTargets)?owner.ownerHeldTargets:[];
  if(!active.length||active.some(target=>held.includes(target)))throw new Error('POLICY_STEWARD_OWNER_SCOPE_INVALID');
  const effectiveDevelopmentAccess={...policy.developmentAccess};
  for(const platform of active)effectiveDevelopmentAccess[platform]='ALWAYS_ALLOWED';
  for(const platform of held)effectiveDevelopmentAccess[platform]='OWNER_HOLD';
  const staleLegacyPolicyFields=Object.keys(effectiveDevelopmentAccess)
    .filter(platform=>effectiveDevelopmentAccess[platform]!==policy.developmentAccess?.[platform]);
  // 이전 로드맵 표현과 충돌하면 최신 승인 범위로 해석하되 원본은 절대 수정하지 않는다.
  // 실제 작업·보안·출시 권한에는 이 보고서만으로 어떠한 승인도 부여하지 않는다.
  return{
    role:steward.role,ownerDirective:directive,managedDocuments:docs,
    effectiveDevelopmentAccess,staleLegacyPolicyFields,
    writesAllowed:false,nonBlockingAudit:true,securityAndReleaseChecksUnchanged:true
  };
}

// 로그
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.argv.some(arg=>arg.startsWith('--fix')))throw new Error('POLICY_STEWARD_DOCUMENT_WRITE_FORBIDDEN');
  const audit=auditFourPolicyDocuments();
  console.log('POLICY_STEWARD_ROLE='+audit.role);
  console.log('POLICY_STEWARD_OWNER_DIRECTIVE='+audit.ownerDirective);
  console.log('POLICY_STEWARD_OLD_SCOPE_CONFLICTS='+(audit.staleLegacyPolicyFields.join(',')||'NONE'));
  console.log('POLICY_STEWARD_DOCUMENT_WRITES=NONE');
  console.log('POLICY_STEWARD_GAME_FLOW_MUTATION=NONE');
}
