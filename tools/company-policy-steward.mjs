// 파일명: tools/company-policy-steward.mjs
// 역할: 중앙 정책 4문서의 최신 승인 지시만 실행용으로 컴파일한다.
// 역사적 기록은 삭제하지 않고 실행용 투영에서 퇴역 처리한다.
// 중앙 roadmap만 정책 권한을 갖고 log/architecture/security는 각자의 불변 보호 역할을 유지한다.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CANONICAL='company-learning/platform-release-roadmap.json';
const BRIEF='company-learning/platform-release-roadmap.brief.json';
const BRIEF_FIELDS=Object.freeze([
  'version','status','policySource','updatedAt','priority','primaryPlatform','currentPhase',
  'developmentAccess','platformEntryGateAllowed','platformDevelopmentMayStartWithoutPriorPlatformCompletion',
  'platformReleaseMayProceedWhenOwnEvidencePasses','runtimeContractCannotCreatePolicy',
  'fixedAutonomousDevelopmentOperatingContract','finalDevelopmentLock',
  'robloxStudioProductionFlowContract','commonExecutionContract','forbidden','ownerActiveDevelopmentScope20261009'
]);
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
  const fullLog=log.authority==='MACHINE_EXECUTION_LOG_MAP' &&
    log.sourceOfTruth===DOCUMENT_PATHS[1] &&
    log.centralPolicy===CANONICAL && log.requiredForAllWorkers===true;
  const minimalLog=log.status==='MINIMAL_RETAINED_SUMMARY_NON_EXECUTABLE' &&
    log.retained?.unknownOrMissingPolicy==='FAIL_CLOSED' && log.requiredForAllWorkers===false;
  if(!fullLog&&!minimalLog)throw new Error('POLICY_STEWARD_LOG_CONTRACT_INVALID');

  const fullArchitecture=architecture.authority==='MACHINE_EXECUTION_ARCHITECTURE_MAP' &&
    architecture.sourceOfTruth===DOCUMENT_PATHS[2] && architecture.centralPolicy===CANONICAL &&
    architecture.branches?.main?.directGameWorkerWrite===false &&
    architecture.constitutionalEnforcement?.enforcer==='tools/company-constitution-enforcer.mjs' &&
    String(architecture.constitutionalEnforcement?.mode||'').startsWith('EXECUTABLE_FAIL_CLOSED') &&
    architecture.constitutionalEnforcement?.subordinateOverrideForbidden===true;
  const minimalArchitecture=architecture.status==='MINIMAL_SUMMARY_NOT_EXECUTION_POLICY' &&
    architecture.centralPolicy===null && architecture.constitutionalEnforcement?.mode==='FAIL_CLOSED' &&
    architecture.branches?.main?.directGameWorkerWrite===false &&
    architecture.release==='UNVERIFIED_OR_MISSING_POLICY_MUST_NOT_PASS';
  if(!fullArchitecture&&!minimalArchitecture)throw new Error('POLICY_STEWARD_ARCHITECTURE_CONTRACT_INVALID');

  const fullSecurity=security.policyFile===DOCUMENT_PATHS[3] &&
    security.defaultTrust==='DENY_OR_QUARANTINE_UNTIL_VERIFIED' &&
    security.centralRoadmapBinding?.centralPolicy===CANONICAL &&
    security.containment?.unverifiedExternalPayloadMayNotEnterCanonicalLearning===true;
  const minimalSecurity=security.policyFile===DOCUMENT_PATHS[3] &&
    security.defaultTrust==='DENY_OR_QUARANTINE_UNTIL_VERIFIED' &&
    security.enforcement?.unverified==='BLOCK' && security.enforcement?.proofRequired===true;
  if(!fullSecurity&&!minimalSecurity)throw new Error('POLICY_STEWARD_SECURITY_CONTRACT_INVALID');
}

// 순수 해석기. 작업 큐는 이미 읽은 roadmap 객체만 전달하므로 파일 I/O나 추가 게이트가 없다.
// 날짜가 더 이른 동일 영역 사용자 지시는 폐기하지만, 서로 다른 영역의 보안/QA 규칙은 폐기하지 않는다.
export function resolveActiveOwnerPolicy(policy={}, {allowMissing=false}={}){
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

  const raw=object(policy.developmentAccess)?policy.developmentAccess:{};
  const effectiveDevelopmentAccess={...raw};
  for(const p of active)effectiveDevelopmentAccess[p]='ALWAYS_ALLOWED';
  for(const p of held)effectiveDevelopmentAccess[p]='OWNER_HOLD';
  const staleLegacyPolicyFields=Object.keys(effectiveDevelopmentAccess)
    .filter(p=>effectiveDevelopmentAccess[p]!==raw[p]);
  return{
    status:'ACTIVE',latestOwnerSection:newest.key,
    ownerDirective:newest.value.authority,
    activeTargets:[...active],ownerHeldTargets:[...held],
    effectiveDevelopmentAccess,staleLegacyPolicyFields,
    retiredOwnerSections:candidates.filter(item=>item.date<newest.date).map(item=>item.key),
    retiredOwnerAuthorities:candidates.filter(item=>item.date<newest.date).map(item=>item.value.authority)
  };
}

// [정본에서 파생된 조회용 요약] 원본의 실제 값만 복사하고 SHA-256 불일치를 차단한다.
// CI는 읽기 전용 검사만 수행한다. 동기화 옵션도 네 개의 정본 파일은 절대로 변경하지 않는다.
export function synchronizeRoadmapBrief({root=ROOT,checkOnly=true}={}){
  const canonicalFile=path.join(root,CANONICAL);
  const raw=fs.readFileSync(canonicalFile,'utf8');
  const policy=JSON.parse(raw);
  if(!object(policy)||policy.status!=='OWNER_DIRECT_LOCKED'||policy.policySource!==CANONICAL)
    throw new Error('POLICY_STEWARD_BRIEF_SOURCE_INVALID');
  const brief={
    _readme:'조회 전용 파생 요약이다. 정책 권한은 company-learning/platform-release-roadmap.json에만 있다. sourceSha256과 원본이 다르면 이 요약본을 사용하지 말고 정본을 다시 읽어라.',
    sourceFile:CANONICAL,
    sourceBytes:Buffer.byteLength(raw),
    sourceSha256:createHash('sha256').update(raw,'utf8').digest('hex')
  };
  for(const key of BRIEF_FIELDS){
    if(!Object.prototype.hasOwnProperty.call(policy,key))
      throw new Error('POLICY_STEWARD_BRIEF_SOURCE_FIELD_MISSING:'+key);
    brief[key]=policy[key];
  }
  const expected=JSON.stringify(brief,null,1)+'\n';
  const file=path.join(root,BRIEF);
  let current='';
  try{current=fs.readFileSync(file,'utf8');}catch(error){
    if(error.code!=='ENOENT')throw error;
  }
  if(current!==expected){
    if(checkOnly)throw new Error('POLICY_STEWARD_BRIEF_STALE');
    fs.writeFileSync(file,expected,'utf8');
  }
  return{version:policy.version,sourceSha256:brief.sourceSha256,changed:current!==expected,briefPath:BRIEF};
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
  if(process.argv.includes('--sync-brief')||process.argv.includes('--check-brief')){
    const result=synchronizeRoadmapBrief({checkOnly:!process.argv.includes('--sync-brief')});
    console.log('POLICY_STEWARD_BRIEF_VERSION='+result.version);
    console.log('POLICY_STEWARD_BRIEF_SOURCE_SHA256='+result.sourceSha256);
    console.log('POLICY_STEWARD_BRIEF_SYNC='+(!result.changed?'CURRENT':'UPDATED'));
    process.exit(0);
  }
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
