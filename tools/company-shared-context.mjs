// Retained four-document compatibility. Integrity is not policy authority.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const RETAINED_DOCUMENTS = Object.freeze([
  ['directive','company-directive.json',null,'MINIMAL_SUMMARY_NOT_REPLACEMENT_POLICY'],
  ['log','company-learning/company-log-map.json','MACHINE_EXECUTION_LOG_MAP','MINIMAL_RETAINED_SUMMARY_NON_EXECUTABLE'],
  ['architecture','company-learning/company-architecture-map.json','MACHINE_EXECUTION_ARCHITECTURE_MAP','MINIMAL_SUMMARY_NOT_EXECUTION_POLICY'],
  ['security','company-learning/security-immune-system.json','OWNER_DIRECTIVE_2026-09-19','MINIMAL_SUMMARY_NOT_SECURITY_VERIFICATION']
]);
const hash = contents => crypto.createHash('sha256').update(contents).digest('hex');
const error = code => { throw new Error('WORKER_CONTEXT_SYNC_FAILED:' + code); };
function readRetained(root, key, relative, authority, status) {
  let contents, data;
  try {
    contents = fs.readFileSync(path.join(root,relative),'utf8');
    data = JSON.parse(contents);
  } catch { return error(key.toUpperCase()+'_DOCUMENT_MISSING_OR_INVALID'); }
  const fullDirective=key==='directive' && data?.authority==='MACHINE_EXECUTION_CONTRACT'
    && data?.policyDocument==='company-learning/platform-release-roadmap.json'
    && data?.documentationSynchronization?.centralPolicyPath===data.policyDocument;
  if (!fullDirective && [...contents].length >= 1000) error(key.toUpperCase()+'_DOCUMENT_TOO_LARGE');
  if (!Number.isInteger(data.version) || data.version < 1 ||
      (!fullDirective && data.status !== status) ||
      (authority && data.authority !== authority) ||
      (data.sourceOfTruth != null && data.sourceOfTruth !== relative)) {
    error(key.toUpperCase()+'_DOCUMENT_CONTRACT_INVALID');
  }
  return {data, sha256:hash(contents),format:fullDirective?'FULL_MACHINE_DIRECTIVE':'MINIMAL_SUMMARY'};
}
export function validateSharedWorkerContext({root=process.cwd(),expectedDirectiveSha256,expectedLogSha256,expectedArchitectureSha256,expectedSecuritySha256}={}) {
  // This is a four-document integrity check only. The separate canonical
  // roadmap is allowed to exist; neither its presence nor this check grants approval.
  const roadmapPath=path.join(root,'company-learning/platform-release-roadmap.json');
  const roadmapPresent=fs.existsSync(roadmapPath);
  const docs={}, hashes={}, formats={};
  for(const [key,relative,authority,status] of RETAINED_DOCUMENTS) {
    const item=readRetained(root,key,relative,authority,status);
    docs[key]=item.data;
    hashes[key+'Sha256']=item.sha256;
    formats[key]=item.format;
  }
  const directive=docs.directive, log=docs.log, architecture=docs.architecture, security=docs.security;
  if (formats.directive==='MINIMAL_SUMMARY' &&
      (directive.policyDocument !== null ||
      directive.documentationSynchronization?.centralPolicyPath !== null ||
      directive.execution?.centralPolicyMissing !== 'FAIL_CLOSED')) {
    error('OWNER_POLICY_REMOVAL_CONTRACT_INVALID');
  }
  if (formats.directive==='FULL_MACHINE_DIRECTIVE' && !roadmapPresent) {
    error('CANONICAL_ROADMAP_REFERENCED_BUT_MISSING');
  }
  if (log.requiredForAllWorkers !== false ||
      log.retained?.primaryLog !== 'GITHUB_ACTIONS_JOB_LOG' ||
      log.retained?.unknownOrMissingPolicy !== 'FAIL_CLOSED') error('LOG_DOCUMENT_CONTRACT_INVALID');
  if (architecture.centralPolicy !== null ||
      architecture.branches?.main?.directGameWorkerWrite !== false ||
      architecture.constitutionalEnforcement?.mode !== 'FAIL_CLOSED' ||
      architecture.release !== 'UNVERIFIED_OR_MISSING_POLICY_MUST_NOT_PASS') error('ARCHITECTURE_DOCUMENT_CONTRACT_INVALID');
  if (security.policyFile !== 'company-learning/security-immune-system.json' ||
      security.defaultTrust !== 'DENY_OR_QUARANTINE_UNTIL_VERIFIED' ||
      security.enforcement?.unverified !== 'BLOCK') error('SECURITY_DOCUMENT_CONTRACT_INVALID');
  const expected = {
    directive:expectedDirectiveSha256,log:expectedLogSha256,
    architecture:expectedArchitectureSha256,security:expectedSecuritySha256
  };
  for(const [key,sha] of Object.entries(expected)) {
    if(sha !== undefined && sha !== hashes[key+'Sha256']) error(key.toUpperCase()+'_SHA_MISMATCH');
  }
  return {
    pass:true, scope:'RETAINED_FOUR_DOCUMENT_INTEGRITY_ONLY',
    policyAuthorityVerified:false, sourceWriteAuthorized:false,
    releaseAuthorized:false, canonicalRoadmapPresent:roadmapPresent,
    hashes, documentFormats:formats,
    documentVersions:Object.fromEntries(RETAINED_DOCUMENTS.map(([key])=>[key,docs[key].version]))
  };
}

// Compile real canonical rules when an actual complete policy document exists.
// This function never synthesizes missing rules or treats four short reference
// documents as owner policy. A missing/invalid policy returns valid:false.
export function compileOwnerCanonicalConstitution(policy={}) {
  const owner=policy?.ownerCanonicalRules;
  const binding=owner?.constitutionalBinding;
  const errors=[];
  if(!owner||typeof owner!=='object'||!binding||typeof binding!=='object'){
    errors.push('CONSTITUTION_AUTHORITY_UNAVAILABLE');
  }
  const entries=owner&&typeof owner==='object'
    ?Object.entries(owner).filter(([key,rule])=>/^rule\d+$/i.test(key)&&rule?.enabled===true)
    :[];
  const entryIds=new Set(),prefixIds=new Set();
  for(const [key,rule] of entries){
    if(typeof rule.id!=='string'||!/^RULE_\d+_/i.test(rule.id)){
      errors.push('INVALID_CANONICAL_RULE_ID:'+key);continue;
    }
    if(entryIds.has(rule.id))errors.push('DUPLICATE_CANONICAL_RULE_ID:'+rule.id);
    entryIds.add(rule.id);
    const prefix=rule.id.match(/^RULE_\d+/i)?.[0];
    if(prefixIds.has(prefix))errors.push('DUPLICATE_CANONICAL_RULE_PREFIX:'+prefix);
    prefixIds.add(prefix);
    if(!rule.machineEnforcement||!Array.isArray(rule.machineEnforcement.assertions)
      ||rule.machineEnforcement.assertions.length===0)
      errors.push('MACHINE_ENFORCEMENT_MISSING:'+rule.id);
  }
  if(entries.length===0)errors.push('CANONICAL_RULE_SET_EMPTY');
  const declaredOrder=Array.isArray(owner?.implementationOrder)?owner.implementationOrder:[];
  const byPrefix=id=>String(id).match(/^RULE_\d+/i)?.[0]||'';
  const rank=new Map(declaredOrder.map((prefix,index)=>[String(prefix),index]));
  const sorted=entries.sort((a,b)=>{
    const ra=rank.get(byPrefix(a[1].id)),rb=rank.get(byPrefix(b[1].id));
    if(ra!==undefined||rb!==undefined)return (ra??Infinity)-(rb??Infinity);
    return Number(a[0].match(/\d+/)?.[0]||0)-Number(b[0].match(/\d+/)?.[0]||0);
  });
  const rules=sorted.map(([key,contract])=>({
    key,id:contract.id,
    number:Number(key.match(/\d+/)?.[0]||0),
    label:contract.label??null,
    authority:contract.authority??null,
    objective:contract.objective??null,
    contract,
    fingerprint:hash(JSON.stringify({key,id:contract.id,contract}))
  }));
  return {
    valid:errors.length===0,
    errors,version:Number(owner?.version)||0,
    authority:owner?.authority||null,
    constitutionalAuthority:owner?.constitutionalAuthority||null,
    binding:binding||{},
    fingerprint:errors.length===0?hash(JSON.stringify({
      version:owner.version,binding,orderedRules:rules.map(x=>({id:x.id,fingerprint:x.fingerprint}))
    })):null,
    orderedRuleIds:rules.map(x=>x.id),
    rules
  };
}

// Compile selected implementation topology from the actual central roadmap.
export function compileCentralArchitectureProjection(policy={}) {
  const canonical='company-learning/platform-release-roadmap.json';
  const documentation=policy?.centralDocumentation;
  const lifecycle=policy?.developmentLifecycleMachine;
  const errors=[];
  if(documentation?.canonicalSet?.policy!==canonical || !lifecycle ||
     typeof lifecycle!=='object') errors.push('CENTRAL_POLICY_SOURCE_UNAVAILABLE');
  const foundation=lifecycle?.nativeGameFoundationValidationStack;
  const requiredLayers=Array.isArray(foundation?.layers)
    ? foundation.layers.filter(layer=>layer?.alwaysRequired===true).map(layer=>layer.id) : [];
  const nativeFoundation=foundation&&typeof foundation==='object' ? {
    version:foundation.version??null,
    status:foundation.status??null,
    ownership:foundation.ownership??null,
    requiredFoundationLayers:requiredLayers,
    testerQaFlow:foundation.testerQaFlow??[],
    releaseGate:foundation.releaseGate??null
  }:null;
  const contract={
    sourceOfTruth:canonical,
    authorityOrder:['OWNER_CANONICAL_RULES','CANONICAL_ROADMAP','EXISTING_GAME_EXECUTION'],
    nativeFoundation,
    implementationOwnership:lifecycle?.primaryAiOrchestration?.internalVibeAiCollaboration?.capabilityGrowthRoleLock??null,
    machineProjectionSynchronization:documentation?.machineProjectionSynchronization??null,
    sharedWorkerContext:lifecycle?.sharedWorkerContext?.compiledArchitectureProjection??null
  };
  return{
    valid:errors.length===0,
    errors,
    fingerprint:errors.length?null:hash(JSON.stringify(contract)),
    contract
  };
}

// 중앙정책: 기존 홈페이지 계약 컴파일러 복구. 승인·배포 권한을 생성하지 않는다.
export function compileHomepageCentralPolicy(policy={}){
  const clean=value=>String(value??'').trim();
  const DEFAULT_POLICY='company-learning/platform-release-roadmap.json';
  const source=policy?.serverHomepageIntegration;
  const errors=[];
  if(!source||typeof source!=='object'){
    return{valid:false,errors:['HOMEPAGE_POLICY_MISSING'],fingerprint:null,supportedPlatforms:[],contract:null};
  }
  if(clean(source.authority)!=='MACHINE_EXECUTION_CONTRACT')errors.push('HOMEPAGE_POLICY_AUTHORITY');
  if(clean(source.sourceOfTruth)!==DEFAULT_POLICY)errors.push('HOMEPAGE_POLICY_SOURCE');
  if(clean(source.homepageManagerWorkflow)!=='.github/workflows/homepage-manager.yml')errors.push('HOMEPAGE_WORKFLOW_BINDING');
  if(clean(source.homepageManagerTool)!=='tools/homepage-manager.mjs')errors.push('HOMEPAGE_TOOL_BINDING');
  if(clean(source.serverRuntimeBranch)!=='company-runtime')errors.push('HOMEPAGE_RUNTIME_BRANCH');
  if(clean(source.publicSourceBranch)!=='main')errors.push('HOMEPAGE_PUBLIC_BRANCH');
  if(source.successfulRuntimeEventMustBindCompanyRuntime!==true)errors.push('HOMEPAGE_RUNTIME_BIND_REQUIRED');
  if(source.staleMainFallbackAfterSuccessfulRuntimeEventForbidden!==true)errors.push('HOMEPAGE_STALE_MAIN_FORBIDDEN');
  if(source.publicHomepageMustReflectVerifiedRuntimeState!==true)errors.push('HOMEPAGE_VERIFIED_RUNTIME_REQUIRED');
  if(source.directUnsupervisedPublicWriteForbidden!==true)errors.push('HOMEPAGE_UNSUPERVISED_WRITE_FORBIDDEN');
  const pipeline=source.executionPipeline||{};
  if(clean(pipeline.mode)!=='TWO_STAGE_MANAGER_THEN_DIRECTOR_REVIEW_AND_PUBLISH')errors.push('HOMEPAGE_PIPELINE_MODE');
  if(Number(pipeline.jobCount)!==2)errors.push('HOMEPAGE_PIPELINE_JOB_COUNT');
  if(pipeline.exactCandidateHashBound!==true||pipeline.deterministicQaPreserved!==true)errors.push('HOMEPAGE_EXACT_CANDIDATE_QA');
  if(pipeline.directUnsupervisedPublicWriteForbidden!==true)errors.push('HOMEPAGE_PIPELINE_UNSUPERVISED_WRITE');
  const supportedPlatforms=[...new Set((source.supportedPlatforms||[]).map(clean).filter(Boolean).map(x=>x.toUpperCase()))];
  const perGamePlatformStates=[...new Set((source.perGamePlatformStates||[]).map(clean).filter(Boolean).map(x=>x.toUpperCase()))];
  if(!supportedPlatforms.length)errors.push('HOMEPAGE_SUPPORTED_PLATFORMS');
  if(JSON.stringify(supportedPlatforms)!==JSON.stringify(perGamePlatformStates))errors.push('HOMEPAGE_PLATFORM_STATE_MISMATCH');
  const runtimeFiles=[...new Set((source.runtimeFiles||[]).map(clean).filter(Boolean))];
  for(const required of ['development-queue.json','game-catalog.json','company-status.json','homepage-platform-exposure.json']){
    if(!runtimeFiles.includes(required))errors.push('HOMEPAGE_RUNTIME_FILE:'+required);
  }
  const deploymentHomepagePublication=source.deploymentHomepagePublication||{};
  if(Number(source.version)>=13){
    for(const field of ['homepagePublicationRequired','existingDeploymentsMustBeReconciled','realPublishedExecutionTargetRequired','renderedHomepageExecutionLinkRequired','missingLinkMustRequeueExistingHomepageManager','qaVerdictIndependentOfLink','missingBuildMustNotCreateLaunchLink','heldPlatformActivationForbidden']){
      if(deploymentHomepagePublication[field]!==true)errors.push('HOMEPAGE_DEPLOYMENT_POLICY_REQUIRED:'+field);
    }
    if(!deploymentHomepagePublication.successfulDeploymentWorkflows?.length)errors.push('HOMEPAGE_DEPLOYMENT_EVENT_BINDINGS_REQUIRED');
  }
  const managerContract=source.managerContract||{};
  const listingContract=source.homepageListingContract||{};
  // 홈페이지에 배포된 게임은 개발 중이어도 노출한다. 실행 검증과 출시 승인은 링크만 제한한다.
  if(listingContract.allDeployedGamesVisible!==true
    ||listingContract.gameCardVisibilityIndependentOfReleaseClassification!==true
    ||listingContract.unverifiedOrMissingGameBuildDisablesPlayButtonOnly!==true)errors.push('HOMEPAGE_ALL_DEPLOYED_GAMES_VISIBILITY_REQUIRED');
  const testingContract=source.testingContract||{};
  const documentationSyncContract=source.documentationSyncContract||{};
  const lobbyGate=policy.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.internalRelease?.lobbyGate||{};
  if(lobbyGate.enabled!==true||lobbyGate.unverifiedReleaseForbidden!==true)errors.push('HOMEPAGE_LOBBY_RELEASE_GATE');
  if(clean(source.managerContractAuthority)!=='CENTRAL_ROADMAP_ONLY_DIRECTIVE_IS_COMPATIBILITY_MIRROR')errors.push('HOMEPAGE_MANAGER_CONTRACT_AUTHORITY');
  if(source.directiveMirrorMayNotOverrideCentral!==true)errors.push('HOMEPAGE_DIRECTIVE_OVERRIDE_FORBIDDEN');
  if(source.homepageWorkerMustConsumeCompiledCentralProjection!==true)errors.push('HOMEPAGE_WORKER_PROJECTION_REQUIRED');
  if(source.homepagePolicyFingerprintRequiredAtManagerStart!==true||source.homepagePolicyFingerprintRequiredAtDirectorStart!==true||source.homepagePolicyFingerprintMustMatchBeforePublication!==true)errors.push('HOMEPAGE_FINGERPRINT_GATES');
  if(clean(source.staleHomepagePolicyAction)!=='FAIL_CLOSED_BLOCK_PUBLICATION_AND_REQUEUE_HOMEPAGE_MANAGER')errors.push('HOMEPAGE_STALE_POLICY_ACTION');
  if(clean(managerContract.mode)!=='SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR'||clean(managerContract.manager)!=='HOMEPAGE'||clean(managerContract.supervisor)!=='DIRECTOR')errors.push('HOMEPAGE_MANAGER_ROLE_CONTRACT');
  if(Number(managerContract.managerCount)!==1||Number(managerContract.supervisorCount)!==1||managerContract.secondHomepageManagerForbidden!==true||managerContract.secondHomepageSupervisorForbidden!==true)errors.push('HOMEPAGE_SINGLE_MANAGER_CONTRACT');
  if(managerContract.fixedFunctionProtection?.ownerLocked!==true)errors.push('HOMEPAGE_FIXED_FUNCTION_OWNER_LOCK');
  if(Number(testingContract.minimumWebStrictScore)!==80||testingContract.hardGatesMustPass!==true||Number(testingContract.maxVisibleTestCandidates)!==30)errors.push('HOMEPAGE_TESTING_CONTRACT');
  if(documentationSyncContract.centralPolicyFirst!==true||clean(documentationSyncContract.centralPolicyPath)!==DEFAULT_POLICY||documentationSyncContract.workDocumentsCannotOverrideCentralPolicy!==true)errors.push('HOMEPAGE_DOCUMENTATION_SYNC_CONTRACT');
  const contract={
    version:Number(source.version)||null,
    authority:clean(source.authority)||null,
    sourceOfTruth:clean(source.sourceOfTruth)||null,
    serverRuntimeBranch:clean(source.serverRuntimeBranch)||null,
    publicSourceBranch:clean(source.publicSourceBranch)||null,
    supportedPlatforms,
    perGamePlatformStates,
    runtimeAuthority:clean(source.runtimeAuthority)||null,
    runtimeFiles,
    showWebPlay:source.showWebPlay===true,
    showUnityWeb:source.showUnityWeb===true,
    showInternalReleaseState:source.showInternalReleaseState===true,
    showPublicReleaseState:source.showPublicReleaseState===true,
    internalLinksOwnerFacing:source.internalLinksOwnerFacing===true,
    externalLinksPublicOnlyWhenExplicitPublicEvidencePasses:source.externalLinksPublicOnlyWhenExplicitPublicEvidencePasses===true,
    publicationFlow:Array.isArray(source.publicationFlow)?source.publicationFlow.map(clean).filter(Boolean):[],
    executionPipeline:{
      mode:clean(pipeline.mode)||null,
      jobCount:Number(pipeline.jobCount)||0,
      exactCandidateHashBound:pipeline.exactCandidateHashBound===true,
      deterministicQaPreserved:pipeline.deterministicQaPreserved===true,
      directUnsupervisedPublicWriteForbidden:pipeline.directUnsupervisedPublicWriteForbidden===true
    },
    managerContract,
    homepageListingContract:listingContract,
    deploymentHomepagePublication,
    lobbyGate,
    testingContract,
    documentationSyncContract,
    managerContractAuthority:clean(source.managerContractAuthority)||null,
    directiveMirrorRequired:source.directiveMirrorRequired===true,
    directiveMirrorMayNotOverrideCentral:source.directiveMirrorMayNotOverrideCentral===true,
    staleHomepagePolicyAction:clean(source.staleHomepagePolicyAction)||null
  };
  return{valid:errors.length===0,errors,fingerprint:hash(JSON.stringify(contract)),supportedPlatforms,contract};
}

export function verifyPinnedSharedWorkerContext(options={}) {
  return validateSharedWorkerContext(options);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const result=validateSharedWorkerContext();
    const output=process.argv.slice(2).find(v=>v.startsWith('--output='));
    if(output) fs.writeFileSync(output.slice('--output='.length),JSON.stringify(result,null,2)+'\n');
    console.log('WORKER_CONTEXT_SCOPE='+result.scope);
    console.log('WORKER_CONTEXT_POLICY_AUTHORITY=UNVERIFIED');
    for(const key of ['directive','log','architecture','security']) {
      console.log('WORKER_CONTEXT_'+key.toUpperCase()+'_SHA256='+result.hashes[key+'Sha256']);
    }
    console.log('WORKER_CONTEXT_SYNC=INTEGRITY_ONLY');
    console.log('WORKER_CONTEXT_MUTATION_AUTHORITY=DENIED');
  } catch(e) {
    console.error('WORKER_CONTEXT_SYNC=FAIL');
    console.error(String(e.message));
    process.exitCode=1;
  }
}
