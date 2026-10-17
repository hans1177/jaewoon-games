// 파일명: tools/company-policy-steward.mjs
// 역할: 기존 중앙 4문서의 비권한 요약만 최신 승인된 owner 지시와 동기화한다.
// 원칙: 로드맵은 읽기 전용, 게임·큐·보안 관문 수정 금지. 자동 수정은 요약 메타데이터만.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=value=>String(value??'').trim();
const CANONICAL='company-learning/platform-release-roadmap.json';
const MIRRORS=[
  ['logMap','company-learning/company-log-map.json'],
  ['architectureMap','company-learning/company-architecture-map.json'],
  ['securityPolicy','company-learning/security-immune-system.json']
];
function read(root,relative){
  const content=fs.readFileSync(path.join(root,relative),'utf8');
  const data=JSON.parse(content);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('POLICY_STEWARD_INVALID_DOCUMENT:'+relative);
  return {data,content};
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
export function reconcileFourPolicyDocuments({root=ROOT,fixMirrors=false}={}){
  const {data:policy,content:policySource}=read(root,CANONICAL);
  const contract=policy.centralDocumentation?.policySteward;
  const canon=policy.centralDocumentation?.canonicalSet;
  if(contract?.role!=='CENTRAL_POLICY_STEWARD'||
    contract?.autoRepairScope!=='NON_AUTHORITATIVE_MIRROR_METADATA_ONLY'||
    contract?.neverWriteCanonicalPolicy!==true||
    !same(contract.managedDocuments,[CANONICAL,...MIRRORS.map(([,p])=>p)])||
    canon?.policy!==CANONICAL){
    throw new Error('POLICY_STEWARD_CANONICAL_CONTRACT_MISSING');
  }
  const ownerPath=clean(contract.latestOwnerDirectivePath);
  if(!/^owner[A-Za-z0-9_.]+$/.test(ownerPath))throw new Error('POLICY_STEWARD_OWNER_PATH_INVALID');
  const owner=ownerPath.split('.').reduce((value,key)=>value?.[key],policy);
  const directive=clean(owner?.authority);
  if(!/^OWNER_DIRECTIVE_\d{4}-\d{2}-\d{2}(?:_[A-Z0-9_]+)?$/.test(directive)||
    owner?.status!=='ACTIVE')throw new Error('POLICY_STEWARD_APPROVED_OWNER_DIRECTIVE_MISSING');
  const expected={role:'CENTRAL_POLICY_STEWARD',canonical:CANONICAL,latestOwnerDirective:directive};
  const drift=[],corrected=[];
  for(const [key,relative] of MIRRORS){
    if(canon?.[key]!==relative)throw new Error('POLICY_STEWARD_DOCUMENT_ROLE_MISMATCH:'+relative);
    const {data,content}=read(root,relative);
    if(!Number.isInteger(data.version)||data.version<1)throw new Error('POLICY_STEWARD_DOCUMENT_VERSION_INVALID:'+relative);
    if(!same(data.policySteward,expected)){
      drift.push(relative);
      if(fixMirrors){
        data.policySteward=expected;
        const result=JSON.stringify(data);
        if([...result].length>=1000)throw new Error('POLICY_STEWARD_RETAINED_SIZE_LIMIT:'+relative);
        fs.writeFileSync(path.join(root,relative),result+'\n');
        corrected.push(relative);
      }
    }
  }
  if(fs.readFileSync(path.join(root,CANONICAL),'utf8')!==policySource)throw new Error('POLICY_STEWARD_CANONICAL_POLICY_CHANGED');
  // 승인된 활성 개발 범위와 기존 사본이 불일치하면 알리기만 한다.
  // 보안 승인 없는 로드맵 정책의 자동 변경이나 근거 없는 통과는 금지한다.
  const access=policy.developmentAccess||{};
  const discrepancies=[
    ...(owner.activeTargets||[]).filter(target=>access[target]!=='ALWAYS_ALLOWED').map(target=>'ACTIVE:'+target),
    ...(owner.ownerHeldTargets||[]).filter(target=>access[target]!=='OWNER_HOLD').map(target=>'HOLD:'+target)
  ];
  return{
    role:contract.role,ownerDirective:directive,managedDocuments:contract.managedDocuments,
    drift,corrected,policyDiscrepancies:discrepancies,
    policyModified:false,gameSourcesModified:false,
    nonBlockingAudit:true
  };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const result=reconcileFourPolicyDocuments({fixMirrors:process.argv.includes('--fix-mirrors')});
  console.log('POLICY_STEWARD_ROLE='+result.role);
  console.log('POLICY_STEWARD_OWNER_DIRECTIVE='+result.ownerDirective);
  console.log('POLICY_STEWARD_MIRROR_REPAIRED='+ (result.corrected.join(',')||'NONE'));
  console.log('POLICY_STEWARD_MIRROR_DRIFT='+ (result.drift.join(',')||'NONE'));
  console.log('POLICY_STEWARD_POLICY_REVIEW_REQUIRED='+ (result.policyDiscrepancies.join(',')||'NONE'));
  console.log('POLICY_STEWARD_GAME_FLOW_MUTATION=NONE');
}
