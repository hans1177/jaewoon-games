// 파일명: tools/company-policy-steward.mjs
// 역할: 중앙 정책 4문서의 최신 승인 지시만 실행용으로 컴파일한다.
// 역사적 기록은 삭제하지 않고 실행용 투영에서 퇴역 처리한다.
// 중앙 roadmap만 정책 권한을 갖고 log/architecture/security는 각자의 불변 보호 역할을 유지한다.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CANONICAL='company-learning/platform-release-roadmap.json';
const DOCUMENT_PATHS=Object.freeze([
  CANONICAL,
  'company-learning/company-log-map.json',
  'company-learning/company-architecture-map.json',
  'company-learning/security-immune-system.json'
]);
const clean=value=>String(value??'').trim();
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const validTarget=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]*$/.test(value);

function read(root,file){
  if(!DOCUMENT_PATHS.includes(file))throw new Error('POLICY_STEWARD_UNEXPECTED_DOCUMENT:'+file);
  const value=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  if(!object(value))throw new Error('POLICY_STEWARD_INVALID_DOCUMENT:'+file);
  return value;
}
function assertCompanionDocuments(log,architecture,security){
  if(log.authority!=='MACHINE_EXECUTION_LOG_MAP'||
    log.retained?.unknownOrMissingPolicy!=='FAIL_CLOSED'||
    log.requiredForAllWorkers!==false)
    throw new Error('POLICY_STEWARD_LOG_CONTRACT_INVALID');
  if(architecture.authority!=='MACHINE_EXECUTION_ARCHITECTURE_MAP'||
    architecture.centralPolicy!==null||
    architecture.constitutionalEnforcement?.mode!=='FAIL_CLOSED'||
    architecture.branches?.main?.directGameWorkerWrite!==false||
    architecture.release!=='UNVERIFIED_OR_MISSING_POLICY_MUST_NOT_PASS')
    throw new Error('POLICY_STEWARD_ARCHITECTURE_CONTRACT_INVALID');
  if(security.policyFile!==DOCUMENT_PATHS[3]||
    security.defaultTrust!=='DENY_OR_QUARANTINE_UNTIL_VERIFIED'||
    security.enforcement?.unverified!=='BLOCK'||
    security.enforcement?.proofRequired!==true)
    throw new Error('POLICY_STEWARD_SECURITY_CONTRACT_INVALID');
}

// 순수 해석기. 작업 큐는 이미 읽은 roadmap 객체만 전달하므로 파일 I/O나 추가 게이트가 없다.
// 날짜가 더 이른 동일 영역 사용자 지시는 폐기하지만, 서로 다른 영역의 보안/QA 규칙은 폐기하지 않는다.
export function resolveActiveOwnerPolicy(policy={}, {allowMissing=false,repository=process.env.GITHUB_REPOSITORY||''}={}){
  if(!object(policy))throw new Error('POLICY_STEWARD_CANONICAL_POLICY_INVALID');
  const candidates=[];
  for(const [key,value] of Object.entries(policy)){
    if(!key.startsWith('owner')||!object(value)||value.status!=='ACTIVE')continue;
    const hasScope='activeTargets' in value||'ownerHeldTargets' in value;
    if(!hasScope)continue;
    const authority=clean(value.authority);
    if(!/^OWNER_DIRECTIVE_\d{4}-\d{2}-\d{2}(?:_[A-Z0-9_]+)?$/.test(authority)||
      !Array.isArray(value.activeTargets)||!Array.isArray(value.ownerHeldTargets)){
      // 기존 임시/레거시 작업 컨텍스트의 날짜 없는 메타데이터는 승인된 신규 지시로 취급하지 않는다.
      // 엄격한 중앙문서 audit에서는 여전히 실패하고, 작업 큐는 기존의 제한적 정책 판정으로 돌아간다.
      if(allowMissing)continue;
      throw new Error('POLICY_STEWARD_OWNER_DIRECTIVE_INVALID:'+key);
    }
    const date=authority.slice('OWNER_DIRECTIVE_'.length,'OWNER_DIRECTIVE_'.length+10);
    if(new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)
      throw new Error('POLICY_STEWARD_OWNER_DIRECTIVE_DATE_INVALID:'+key);
    candidates.push({key,value,date});
  }
  if(!candidates.length){
    if(allowMissing)return null;
    throw new Error('POLICY_STEWARD_APPROVED_OWNER_DIRECTIVE_MISSING');
  }
  candidates.sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key));
  const newest=candidates[0];
  const sameDate=candidates.filter(item=>item.date===newest.date);
  const signature=value=>JSON.stringify([
    [...value.activeTargets].sort(),[...value.ownerHeldTargets].sort()
  ]);
  if(new Set(sameDate.map(item=>signature(item.value))).size>1)
    throw new Error('POLICY_STEWARD_SAME_DATE_OWNER_CONFLICT');
  const active=newest.value.activeTargets,held=newest.value.ownerHeldTargets;
  if(!active.length||[...active,...held].some(p=>!validTarget(p))||
    new Set(active).size!==active.length||new Set(held).size!==held.length||
    active.some(p=>held.includes(p)))
    throw new Error('POLICY_STEWARD_OWNER_SCOPE_INVALID');

  // 조직별 독립 운영: 현재 저장소의 중앙정책만 해당 플랫폼 작업을 허용한다.
  const binding=newest.value.repository;
  if(binding){
    const roots={ROBLOX:'roblox-games/',WEB:'web-games/'};
    if(!object(binding)||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(binding.fullName||'')
      ||!roots[binding.platform]||binding.sourceRoot!==roots[binding.platform]
      ||active.length!==1||active[0]!==binding.platform
      ||binding.independentVibe!==true||binding.homepageOnly!==true
      ||['sharedQueue','sharedRuntime','sharedLearning','sharedCredentials'].some(key=>binding[key]!==false))
      throw new Error('POLICY_STEWARD_REPOSITORY_SCOPE_INVALID');
    if(clean(repository)&&clean(repository).toLowerCase()!==binding.fullName.toLowerCase())
      throw new Error('POLICY_STEWARD_REPOSITORY_MISMATCH');
  }

  const raw=object(policy.developmentAccess)?policy.developmentAccess:{};
  const effectiveDevelopmentAccess={...raw};
  for(const p of active)effectiveDevelopmentAccess[p]='ALWAYS_ALLOWED';
  for(const p of held)effectiveDevelopmentAccess[p]='OWNER_HOLD';
  const staleLegacyPolicyFields=Object.keys(effectiveDevelopmentAccess)
    .filter(p=>effectiveDevelopmentAccess[p]!==raw[p]);
  return{
    status:'ACTIVE',latestOwnerSection:newest.key,
    ownerDirective:newest.value.authority,
    activeTargets:[...active],ownerHeldTargets:[...held],repository:binding?{...binding}:null,
    effectiveDevelopmentAccess,staleLegacyPolicyFields,
    retiredOwnerSections:candidates.filter(item=>item.date<newest.date).map(item=>item.key),
    retiredOwnerAuthorities:candidates.filter(item=>item.date<newest.date).map(item=>item.value.authority)
  };
}

export function auditFourPolicyDocuments({root=ROOT}={}){
  const policy=read(root,CANONICAL);
  const set=policy.centralDocumentation?.canonicalSet||{};
  const managedDocuments=[set.policy,set.logMap,set.architectureMap,set.securityPolicy];
  if(JSON.stringify(managedDocuments)!==JSON.stringify(DOCUMENT_PATHS)||
    JSON.stringify(policy.centralDocumentation?.readOrder)!==JSON.stringify(DOCUMENT_PATHS))
    throw new Error('POLICY_STEWARD_CANONICAL_REFERENCE_INVALID');
  const [,log,architecture,security]=DOCUMENT_PATHS.map((file,index)=>index?read(root,file):policy);
  for(let i=1;i<DOCUMENT_PATHS.length;i++){
    const doc=[null,log,architecture,security][i];
    if(!Number.isInteger(doc.version)||doc.version<1)
      throw new Error('POLICY_STEWARD_DOCUMENT_VERSION_INVALID:'+DOCUMENT_PATHS[i]);
  }
  assertCompanionDocuments(log,architecture,security);
  const scope=resolveActiveOwnerPolicy(policy);
  return{
    role:'CENTRAL_FOUR_DOCUMENT_STEWARD',managedDocuments,
    latestOwnerSection:scope.latestOwnerSection,
    ownerDirective:scope.ownerDirective,
    effectiveDevelopmentAccess:scope.effectiveDevelopmentAccess,
    staleLegacyPolicyFields:scope.staleLegacyPolicyFields,
    retiredOwnerSections:scope.retiredOwnerSections,
    retiredOwnerAuthorities:scope.retiredOwnerAuthorities,
    effectiveDocumentRoles:{
      [DOCUMENT_PATHS[0]]:'LATEST_APPROVED_OWNER_SCOPE_ONLY',
      [DOCUMENT_PATHS[1]]:'CURRENT_LOG_EVIDENCE_CONTRACT',
      [DOCUMENT_PATHS[2]]:'CURRENT_ARCHITECTURE_TOPOLOGY_CONTRACT',
      [DOCUMENT_PATHS[3]]:'CURRENT_SECURITY_FAIL_CLOSED_CONTRACT'
    },
    documentVersions:Object.fromEntries(DOCUMENT_PATHS.map((file,i)=>[file,[policy,log,architecture,security][i].version])),
    sourcePolicyVersion:policy.version,
    automaticLegacyRetirement:'EXECUTION_PROJECTION_ONLY',
    nonBlockingAudit:true,writesAllowed:false,
    securityAndReleaseChecksUnchanged:true
  };
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.argv.some(arg=>arg.startsWith('--fix')))
    throw new Error('POLICY_STEWARD_FILE_WRITE_FORBIDDEN');
  const result=auditFourPolicyDocuments();
  if(process.argv.includes('--json')){
    console.log(JSON.stringify(result));
  }else{
    console.log('POLICY_STEWARD_OWNER_DIRECTIVE='+result.ownerDirective);
    console.log('POLICY_STEWARD_LATEST_OWNER_SECTION='+result.latestOwnerSection);
    console.log('POLICY_STEWARD_LEGACY_SCOPE_CONFLICTS='+(result.staleLegacyPolicyFields.join(',')||'NONE'));
    console.log('POLICY_STEWARD_RETIRED_OWNER_SECTIONS='+(result.retiredOwnerSections.join(',')||'NONE'));
    console.log('POLICY_STEWARD_EFFECTIVE_DOCUMENTS='+result.managedDocuments.length);
    console.log('POLICY_STEWARD_FILE_WRITES=NONE');
    console.log('POLICY_STEWARD_GAME_FLOW_MUTATION=NONE');
  }
}
