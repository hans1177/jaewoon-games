// 파일명: tools/company-shared-context.mjs
// 역할: 모든 AI/작업자가 중앙 로드맵·로그맵·아키텍처맵·보안정책을 같은 실행 문맥으로 검증한다.
// 원칙: 문서=코드. 중앙 로드맵에 등록된 작업자 실행계열은 이 검증기를 선행 호출해야 한다.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const DEFAULT_POLICY='company-learning/platform-release-roadmap.json';
const DEFAULT_LOG_MAP='company-learning/company-log-map.json';
const DEFAULT_ARCHITECTURE='company-learning/company-architecture-map.json';
const DEFAULT_SECURITY_POLICY='company-learning/security-immune-system.json';
const REPO_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function resolveInput(file){const value=clean(file);if(fs.existsSync(value))return value;const rooted=path.join(REPO_ROOT,value);return fs.existsSync(rooted)?rooted:value;}
function readBuffer(file){return fs.readFileSync(resolveInput(file));}
function parseJsonBuffer(buffer,file){try{return JSON.parse(buffer.toString('utf8'));}catch(error){fail(`JSON_PARSE:${file}:${clean(error?.message||error)}`);}}
function readJson(file){return parseJsonBuffer(readBuffer(file),file);}
function sha256Buffer(buffer){return createHash('sha256').update(buffer).digest('hex');}
function sha256(file){return sha256Buffer(readBuffer(file));}
function fail(message){throw new Error(`SHARED_WORKER_CONTEXT_INVALID:${message}`);}
function sameList(a,b){return JSON.stringify(a||[])===JSON.stringify(b||[]);}
const textSha256=value=>createHash('sha256').update(String(value??''),'utf8').digest('hex');
const OWNER_RULE_KEY=/^rule(\d+)$/i;
const OWNER_RULE_ORDER=/^RULE_(\d+)$/i;

export function compileOwnerCanonicalConstitution(policy={}){
  const owner=policy?.ownerCanonicalRules;
  const errors=[];
  if(!owner||typeof owner!=='object'){
    return{valid:false,errors:['OWNER_CANONICAL_RULES_MISSING'],version:null,authority:null,binding:null,fingerprint:null,orderedRuleIds:[],rules:[]};
  }
  const binding=owner?.constitutionalBinding||{};
  if(clean(owner?.constitutionalAuthority)!=='HIGHEST_VIBE_INTERNAL_WORKER_CONTRACT_AUTHORITY')errors.push('CONSTITUTION_AUTHORITY');
  if(owner?.orderedImplementationRequired!==true)errors.push('CONSTITUTION_ORDER_REQUIRED');
  if(clean(binding?.mode)!=='DYNAMIC_CANONICAL_RULE_AUTO_BIND')errors.push('CONSTITUTION_BINDING_MODE');
  if(binding?.automaticContractBinding!==true)errors.push('CONSTITUTION_AUTO_BIND');
  if(binding?.appliesToAllCurrentAndFutureRegisteredVibeWorkers!==true)errors.push('CONSTITUTION_ALL_WORKERS');
  if(binding?.appliesToAllInternalAiDepartmentsAndAutonomousSubsystems!==true)errors.push('CONSTITUTION_ALL_INTERNAL_AI');
  if(binding?.workerMayNotOptOut!==true||binding?.childContractMayNotOverride!==true)errors.push('CONSTITUTION_NON_OVERRIDE');
  if(binding?.futureCanonicalRulesAutoBindWithoutWorkerCodeChange!==true)errors.push('CONSTITUTION_FUTURE_AUTO_BIND');
  if(binding?.executionFingerprintMustIncludeEveryEnabledCanonicalRule!==true)errors.push('CONSTITUTION_EXECUTION_FINGERPRINT');
  if(binding?.sharedContextMustCompileEveryEnabledCanonicalRule!==true)errors.push('CONSTITUTION_SHARED_CONTEXT_COMPILE');
  if(binding?.centralWorkContractMustEmbedEveryEnabledCanonicalRule!==true)errors.push('CONSTITUTION_WORK_CONTRACT_EMBED');
  if(binding?.workerInstructionMustExposeOrderedCanonicalRules!==true)errors.push('CONSTITUTION_WORKER_INSTRUCTION');
  if(binding?.beforeWorkValidationRequired!==true||binding?.afterWorkValidationRequired!==false)errors.push('CONSTITUTION_SINGLE_PREFLIGHT_VALIDATION');
  if(binding?.staleConstitutionMayNotStartWork!==true||binding?.staleConstitutionMayNotCompleteWork!==true)errors.push('CONSTITUTION_STALE_GUARD');
  if(clean(binding?.missingOrInvalidBindingAction)!=='FAIL_CLOSED_BLOCK_WORK_AND_REQUEUE_EXACT_FAILURE_STAGE')errors.push('CONSTITUTION_FAIL_CLOSED');
  if(binding?.constitutionChangeInvalidatesActiveWorkerExecutionFingerprint!==true)errors.push('CONSTITUTION_STALE_FINGERPRINT');
  if(binding?.subordinatePolicyCannotWeakenCanonicalRule!==true)errors.push('CONSTITUTION_SUBORDINATE_WEAKENING');
  if(clean(binding?.executableEnforcer)!=='tools/company-constitution-enforcer.mjs')errors.push('CONSTITUTION_EXECUTABLE_ENFORCER');
  if(binding?.enforcerRequiredAtPolicyQa!==true)errors.push('CONSTITUTION_POLICY_QA_ENFORCER');
  if(binding?.enforcerRequiredAt24hPlanner!==true)errors.push('CONSTITUTION_24H_PLANNER_ENFORCER');
  if(binding?.enforcerRequiredBeforeWorkerSourceWrite!==true)errors.push('CONSTITUTION_WORKER_PREWRITE_ENFORCER');
  if(binding?.enforcerRequiredAfterWorkerExecution!==false)errors.push('CONSTITUTION_WORKER_POST_DISABLED');
  if(binding?.global24hStopOnConstitutionFailureForbidden!==true)errors.push('CONSTITUTION_GLOBAL_24H_CONTINUES');
  if(binding?.declarativeRuleEnforcementRequired!==true)errors.push('CONSTITUTION_DECLARATIVE_ENFORCEMENT');
  if(Number(binding?.ruleEnforcementSchemaVersion)<=0)errors.push('CONSTITUTION_ENFORCEMENT_SCHEMA');
  if(binding?.hardcodedRuleNumberBranchesForbidden!==true)errors.push('CONSTITUTION_HARDCODED_RULE_BRANCHES');
  if(binding?.genericRuleIterationRequired!==true)errors.push('CONSTITUTION_GENERIC_RULE_ITERATION');

  const discovered=[];
  for(const [key,value] of Object.entries(owner)){
    const match=OWNER_RULE_KEY.exec(key);
    if(!match||!value||typeof value!=='object'||value.enabled!==true)continue;
    const number=Number(match[1]);
    const id=clean(value.id);
    const idNumber=Number((/^RULE_(\d+)_/i.exec(id)||[])[1]||0);
    if(!number||idNumber!==number)errors.push(`CONSTITUTION_RULE_ID_MISMATCH:${key}`);
    discovered.push({key,number,id,label:clean(value.label)||`제${number}규칙`,authority:clean(value.authority)||clean(owner.authority)||null,objective:clean(value.objective)||null,fingerprint:textSha256(JSON.stringify(value)),contract:value});
  }
  const byNumber=new Map(discovered.map(row=>[row.number,row]));
  if(!byNumber.size)errors.push('CONSTITUTION_NO_ENABLED_RULES');
  for(const row of discovered){
    const enforcement=row.contract?.machineEnforcement;
    if(binding?.declarativeRuleEnforcementRequired===true){
      if(!enforcement||typeof enforcement!=='object')errors.push(`CONSTITUTION_MACHINE_ENFORCEMENT_MISSING:${row.number}`);
      else{
        if(Number(enforcement.schemaVersion)!==Number(binding?.ruleEnforcementSchemaVersion))errors.push(`CONSTITUTION_MACHINE_ENFORCEMENT_SCHEMA:${row.number}`);
        if(!Array.isArray(enforcement.assertions)||!enforcement.assertions.length)errors.push(`CONSTITUTION_MACHINE_ASSERTIONS_MISSING:${row.number}`);
      }
    }
  }
  const explicit=[];
  for(const item of Array.isArray(owner.implementationOrder)?owner.implementationOrder:[]){
    const match=OWNER_RULE_ORDER.exec(clean(item));
    const number=Number(match?.[1]||0);
    if(number&&byNumber.has(number)&&!explicit.includes(number))explicit.push(number);
  }
  const orderedNumbers=[...explicit,...[...byNumber.keys()].filter(n=>!explicit.includes(n)).sort((a,b)=>a-b)];
  const rules=orderedNumbers.map(number=>byNumber.get(number)).filter(Boolean);
  const orderedRuleIds=rules.map(row=>row.id);
  const fingerprint=textSha256(JSON.stringify(rules.map(row=>({number:row.number,id:row.id,fingerprint:row.fingerprint}))));
  return{
    valid:errors.length===0,
    errors,
    version:Number(owner.version)||null,
    authority:clean(owner.authority)||null,
    constitutionalAuthority:clean(owner.constitutionalAuthority)||null,
    binding,
    fingerprint,
    orderedRuleIds,
    rules
  };
}

export function compileHomepageCentralPolicy(policy={}){
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
    lobbyGate,
    testingContract,
    documentationSyncContract,
    managerContractAuthority:clean(source.managerContractAuthority)||null,
    directiveMirrorRequired:source.directiveMirrorRequired===true,
    directiveMirrorMayNotOverrideCentral:source.directiveMirrorMayNotOverrideCentral===true,
    staleHomepagePolicyAction:clean(source.staleHomepagePolicyAction)||null
  };
  return{valid:errors.length===0,errors,fingerprint:textSha256(JSON.stringify(contract)),supportedPlatforms,contract};
}


export function compileCentralArchitectureProjection(policy={}){
  const errors=[];
  const constitution=compileOwnerCanonicalConstitution(policy);
  const sync=policy?.centralDocumentation?.machineProjectionSynchronization||{};
  const lifecycle=policy?.developmentLifecycleMachine||{};
  const shared=lifecycle?.sharedWorkerContext||{};
  const projectionCfg=shared?.compiledArchitectureProjection||{};
  const foundation=lifecycle?.nativeGameFoundationValidationStack||{};
  const homepage=policy?.serverHomepageIntegration||{};
  const systemAi=policy?.aiExecutionEfficiency?.systemAiBottleneckResilience||{};
  const security=lifecycle?.securityImmuneSystem||{};
  const primaryAi=lifecycle?.primaryAiOrchestration||{};
  const fixedOperating=policy?.fixedAutonomousDevelopmentOperatingContract||{};
  if(projectionCfg.required===true){
    if(clean(sync.mode)!=='COMPILE_AT_EXECUTION_NO_MANUAL_MIRROR_REQUIRED')errors.push('ARCHITECTURE_PROJECTION_MODE');
    if(sync.centralPolicyIsOnlyMutablePolicySource!==true)errors.push('ARCHITECTURE_POLICY_AUTHORITY');
    if(sync.architectureProjectionGeneratedAtRuntime!==true)errors.push('ARCHITECTURE_RUNTIME_PROJECTION');
    if(sync.architectureMapMayNotOverrideProjection!==true)errors.push('ARCHITECTURE_MAP_OVERRIDE');
    if(sync.workContractGeneratedFromSameProjection!==true||sync.sharedContextGeneratedFromSameProjection!==true)errors.push('ARCHITECTURE_SHARED_PROJECTION');
    if(sync.policyChangeAutomaticallyChangesArchitectureFingerprint!==true||sync.policyChangeAutomaticallyChangesWorkContractFingerprint!==true)errors.push('ARCHITECTURE_AUTO_FINGERPRINT');
    if(sync.staleArchitectureProjectionMayNotStartWork!==true||sync.staleWorkContractMayNotCompleteWork!==true)errors.push('ARCHITECTURE_STALE_GUARD');
    if(clean(projectionCfg.compiler)!=='tools/company-shared-context.mjs::compileCentralArchitectureProjection')errors.push('ARCHITECTURE_COMPILER_BINDING');
    if(projectionCfg.fingerprintBoundToExecutionEvidence!==true||projectionCfg.workContractMustUseSameFingerprint!==true)errors.push('ARCHITECTURE_FINGERPRINT_BINDING');
  }
  const contract={
    version:1,
    sourceOfTruth:DEFAULT_POLICY,
    authorityOrder:['OWNER_CANONICAL_CONSTITUTION','CENTRAL_POLICY','COMPILED_CENTRAL_ARCHITECTURE_PROJECTION','WORK_CONTRACT','VERIFIED_RUNTIME_EVIDENCE','RUNTIME_STATE'],
    constitution:{fingerprint:constitution.fingerprint,orderedRuleIds:constitution.orderedRuleIds},
    workerSynchronization:{
      requiredForAllWorkers:shared?.requiredForAllWorkers===true,
      syncMode:clean(shared?.syncMode)||null,
      staleContextMayNotStartWork:shared?.staleContextMayNotStartWork===true,
      staleContextMayNotCompleteWork:shared?.staleContextMayNotCompleteWork===true,
      newSessionPreflightRequired:shared?.newSessionPreflight?.required===true,
      newSessionSourceRef:clean(shared?.newSessionPreflight?.sourceRef)||null,
      latestMainMustBeResolvedBeforeDocumentRead:shared?.newSessionPreflight?.latestMainMustBeResolvedBeforeDocumentRead===true,
      canonicalReadOrder:Array.isArray(shared?.newSessionPreflight?.canonicalReadOrder)?shared.newSessionPreflight.canonicalReadOrder.map(clean).filter(Boolean):[],
      finalDevelopmentLockStatusMustBeRead:shared?.newSessionPreflight?.finalDevelopmentLockStatusMustBeRead===true,
      noMutationBeforeSyncPass:shared?.newSessionPreflight?.noSourceMutationBeforeSyncPass===true
        &&shared?.newSessionPreflight?.noDeploymentBeforeSyncPass===true
        &&shared?.newSessionPreflight?.noRuntimeStateMutationBeforeSyncPass===true,
      priorConversationOrMemoryCannotOverrideCentralPolicy:shared?.newSessionPreflight?.priorConversationOrMemoryCannotOverrideCentralPolicy===true
    },
    fixedAutonomousDevelopmentOperating:{
      version:Number(fixedOperating?.version)||0,
      status:clean(fixedOperating?.status)||null,
      normalOperatingLoop:Array.isArray(fixedOperating?.normalOperatingLoop)?fixedOperating.normalOperatingLoop.map(clean).filter(Boolean):[],
      perpetualPerGameCycle:fixedOperating?.perpetualPerGameCycle===true,
      vibeOwnsNormalCycleOperation:fixedOperating?.vibeOwnsNormalCycleOperation===true,
      ownerPresenceRequiredForNormalCycle:fixedOperating?.ownerPresenceRequiredForNormalCycle===true,
      chatgptPresenceRequiredForNormalCycle:fixedOperating?.chatgptPresenceRequiredForNormalCycle===true,
      futureSystemWorkScope:clean(fixedOperating?.futureSystemWorkScope)||null,
      bottleneckManagementOwner:clean(fixedOperating?.autonomousBottleneckManagement?.owner)||null,
      autonomousBottleneckManagement:fixedOperating?.autonomousBottleneckManagement?.required===true
        &&fixedOperating?.autonomousBottleneckManagement?.ownerPresenceRequired===false
        &&fixedOperating?.autonomousBottleneckManagement?.chatgptPresenceRequired===false,
      vibeOwnsAllNormalProcessManagement:fixedOperating?.responsibilitySplit?.vibe?.allNormalProcessManagementOwner===true,
      chatgptNormalOperationsOwner:fixedOperating?.responsibilitySplit?.chatgpt?.normalOperationsOwner===true,
      sourceGrowthIntegrityRequired:fixedOperating?.sourceGrowthIntegrity?.realSourceDiffRequiredWhenBuildUpDecisionRequiresImplementation===true
        &&fixedOperating?.sourceGrowthIntegrity?.evaluationOnlyCompletionForbiddenWhenSourceMutationRequired===true,
      autonomousLearningOwner:clean(fixedOperating?.autonomousLearning?.owner)||null,
      autonomousLearningContinuous:fixedOperating?.autonomousLearning?.required===true
        &&fixedOperating?.autonomousLearning?.continuous24h===true
        &&fixedOperating?.autonomousLearning?.ownerPresenceRequired===false
        &&fixedOperating?.autonomousLearning?.chatgptPresenceRequired===false,
      requestedRuntimeQaExactIsolation:fixedOperating?.requestedGameScopedRuntimeQa?.requestedGameIdMeansExactGameOnly===true
        &&fixedOperating?.requestedGameScopedRuntimeQa?.unrelatedInvalidCandidateMayNotFailRequestedGameRun===true,
      startupSyncRequired:fixedOperating?.startupSync?.requiredForChatGPTAndWorkers===true
    },
    implementationOwnership:{
      gameImplementationOwner:primaryAi?.gameImplementationOwner||null,
      primaryAiRole:clean(primaryAi?.role)||null,
      securityPolicy:clean(security?.policyFile)||null
    },
    nativeFoundation:foundation?.version?{
      version:Number(foundation.version)||0,
      status:clean(foundation.status)||null,
      scope:foundation.scope||null,
      executionOwner:clean(foundation?.ownership?.executionOwner)||null,
      testerTicketState:clean(foundation?.ownership?.testerTicketState)||null,
      runtimePlaytestOwner:clean(foundation?.ownership?.runtimePlaytestOwner)||null,
      platformQaOwner:clean(foundation?.ownership?.platformQaOwner)||null,
      deterministicVerdictAuthority:clean(foundation?.ownership?.deterministicVerdictAuthority)||null,
      newDepartmentCreated:foundation?.ownership?.newDepartmentCreated===true,
      duplicateFoundationDepartmentForbidden:foundation?.departmentReuse?.duplicateFoundationDepartmentForbidden===true,
      testerQaFlow:Array.isArray(foundation?.testerQaFlow)?foundation.testerQaFlow.map(clean).filter(Boolean):[],
      requiredFoundationLayers:Array.isArray(foundation?.layers)?foundation.layers.filter(row=>row?.alwaysRequired===true).map(row=>clean(row?.id)).filter(Boolean):[],
      releaseSequence:Array.isArray(foundation?.releaseGate?.canonicalSequence)?foundation.releaseGate.canonicalSequence.map(clean).filter(Boolean):[]
    }:null,
    systemAi:{
      implementationState:clean(systemAi?.implementationState)||null,
      impactAwareScheduling:systemAi?.impactAwareScheduling?.enabled===true,
      multiHypothesisCausalRepair:systemAi?.multiHypothesisCausalRepair?.enabled===true
    },
    homepage:{
      version:Number(homepage?.version)||0,
      managerContractAuthority:clean(homepage?.managerContractAuthority)||null,
      supportedPlatforms:Array.isArray(homepage?.supportedPlatforms)?homepage.supportedPlatforms.map(clean).filter(Boolean):[]
    }
  };
  return{valid:errors.length===0,errors,fingerprint:textSha256(JSON.stringify(contract)),contract};
}

export function validateSharedWorkerContext({
  policyFile=DEFAULT_POLICY,
  logMapFile=DEFAULT_LOG_MAP,
  architectureFile=DEFAULT_ARCHITECTURE,
  securityPolicyFile=DEFAULT_SECURITY_POLICY,
  expectedPolicySha256='',
  requireHomepagePolicy=false
}={}){
  for(const file of [policyFile,logMapFile,architectureFile,securityPolicyFile])if(!fs.existsSync(resolveInput(file)))fail(`MISSING:${file}`);
  const policyBuffer=readBuffer(policyFile),logMapBuffer=readBuffer(logMapFile),architectureBuffer=readBuffer(architectureFile),securityPolicyBuffer=readBuffer(securityPolicyFile);
  const policy=parseJsonBuffer(policyBuffer,policyFile),logMap=parseJsonBuffer(logMapBuffer,logMapFile),architecture=parseJsonBuffer(architectureBuffer,architectureFile),securityPolicy=parseJsonBuffer(securityPolicyBuffer,securityPolicyFile);
  const authority=policy?.developmentLifecycleMachine?.developmentToolAuthority;
  if(authority?.codex?.allUseForbidden===true){
    // Codex 비사용: 중앙정책과 실행 아키텍처가 모두 비활성이고, 기존 로컬 Vibe가 유일한 게임 코드 생성 책임자여야 한다.
    const codex=authority.codex;
    if(clean(codex.role)!=='DISABLED'||!Array.isArray(codex.allowedScopes)||codex.allowedScopes.length)
      fail('CODEX_NO_USE_POLICY_DRIFT');
    if(clean(architecture?.workerRoles?.CODEX)!=='DISABLED'||!architecture?.forbidden?.includes('CODEX_ANY_SCOPE'))
      fail('CODEX_NO_USE_ARCHITECTURE_DRIFT');
    if(clean(authority.gameSourceGenerationProvider)!=='LOCAL_OLLAMA'
      ||clean(authority.gameSourceWritePolicy?.allowedWorker)!=='tools/vibe2-source-worker.mjs')
      fail('CODEX_NO_USE_CANONICAL_ALTERNATIVE_DRIFT');
    if(clean(authority.enforcement?.requiredEnvironment?.VIBE2_CODEX_ROLE)!=='DISABLED'
      ||clean(authority.enforcement?.requiredEnvironment?.VIBE2_CODEX_GAME_SOURCE_WRITE)!=='FORBIDDEN')
      fail('CODEX_NO_USE_ENVIRONMENT_DRIFT');
    const runtimeRole=clean(process.env.VIBE2_CODEX_ROLE).toUpperCase();
    if(runtimeRole&&runtimeRole!=='DISABLED')fail('CODEX_RUNTIME_ROLE_FORBIDDEN');
  }

  const constitution=compileOwnerCanonicalConstitution(policy);
  if(!constitution.valid)fail(`OWNER_CANONICAL_CONSTITUTION:${constitution.errors.join('|')||'UNKNOWN'}`);
  const architectureProjection=compileCentralArchitectureProjection(policy);
  if(policy?.developmentLifecycleMachine?.sharedWorkerContext?.compiledArchitectureProjection?.required===true&&!architectureProjection.valid)fail(`CENTRAL_ARCHITECTURE_PROJECTION:${architectureProjection.errors.join('|')||'UNKNOWN'}`);
  const homepage=compileHomepageCentralPolicy(policy);
  if(requireHomepagePolicy===true&&!homepage.valid)fail(`HOMEPAGE_CENTRAL_POLICY:${homepage.errors.join('|')||'UNKNOWN'}`);
  const contract=policy?.developmentLifecycleMachine?.sharedWorkerContext;
  if(Number(contract?.version||0)<2)fail('CENTRAL_SHARED_CONTEXT_VERSION');
  if(contract?.requiredForAllWorkers!==true)fail('CENTRAL_REQUIRED_FOR_ALL_WORKERS');
  if(clean(contract?.centralPolicy)!==policyFile)fail('CENTRAL_POLICY_BINDING');
  if(clean(contract?.logMap)!==logMapFile)fail('CENTRAL_LOG_MAP_BINDING');
  if(clean(contract?.architectureMap)!==architectureFile)fail('CENTRAL_ARCHITECTURE_BINDING');
  if(clean(contract?.securityPolicy)!==securityPolicyFile)fail('CENTRAL_SECURITY_POLICY_BINDING');
  if(contract?.documentIsCode!==true||contract?.roadmapIsExecutableContract!==true)fail('DOCUMENT_CODE_INVARIANT');
  if(contract?.workerLauncherSyncRequired!==true)fail('WORKER_LAUNCHER_SYNC_REQUIRED');
  if(contract?.staleContextMayNotStartWork!==true||contract?.staleContextMayNotCompleteWork!==true)fail('STALE_CONTEXT_GUARD');
  if(contract?.beforeWorkRequired!==true||contract?.afterWorkRequired!==false)fail('SINGLE_PREFLIGHT_CONTEXT_VALIDATION');
  if(contract?.singlePreWorkValidationPerExactWorkUnit!==true||contract?.repeatedFullValidationWithinExactWorkUnitForbidden!==true)fail('SINGLE_PREFLIGHT_CONTEXT_REUSE');
  if(clean(contract?.syncMode)!=='ROADMAP_FIRST_FAIL_CLOSED')fail('ROADMAP_SYNC_MODE');
  if(contract?.completionRequiresSharedContextSync!==true||contract?.completionUsesInitialValidatedContextEvidence!==true)fail('COMPLETION_SYNC_REQUIRED');
  if(contract?.mismatchAction!=='BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE')fail('MISMATCH_ACTION');
  const newSession=contract?.newSessionPreflight||{};
  const canonicalReadOrder=[policyFile,logMapFile,architectureFile,securityPolicyFile];
  const fixedOperating=policy?.fixedAutonomousDevelopmentOperatingContract||{};
  if(Number(contract?.version||0)>=6){
    if(newSession?.required!==true)fail('NEW_SESSION_PREFLIGHT_REQUIRED');
    const applies=new Set((Array.isArray(newSession?.appliesTo)?newSession.appliesTo:[]).map(clean));
    for(const required of ['CHATGPT_NEW_CHAT','ALL_AI_WORKERS','ALL_AUTOMATION_WORKERS'])if(!applies.has(required))fail('NEW_SESSION_PREFLIGHT_SCOPE:'+required);
    if(clean(newSession?.sourceRef)!=='LATEST_MAIN_AT_WORK_START')fail('NEW_SESSION_LATEST_MAIN_SOURCE');
    if(newSession?.latestMainMustBeResolvedBeforeDocumentRead!==true||newSession?.suppliedOrRememberedMainShaIsHintOnly!==true)fail('NEW_SESSION_LATEST_MAIN_REQUIRED');
    if(!sameList(newSession?.canonicalReadOrder,canonicalReadOrder))fail('NEW_SESSION_CANONICAL_READ_ORDER');
    if(newSession?.documentHashesMustBeCaptured!==true||newSession?.finalDevelopmentLockStatusMustBeRead!==true)fail('NEW_SESSION_CONTEXT_EVIDENCE_REQUIRED');
    if(newSession?.noSourceMutationBeforeSyncPass!==true||newSession?.noDeploymentBeforeSyncPass!==true||newSession?.noRuntimeStateMutationBeforeSyncPass!==true)fail('NEW_SESSION_NO_MUTATION_BEFORE_SYNC');
    if(newSession?.priorConversationOrMemoryCannotOverrideCentralPolicy!==true)fail('NEW_SESSION_MEMORY_OVERRIDE_FORBIDDEN');
    if(clean(newSession?.staleOrMissingContextAction)!=='FAIL_CLOSED_NO_MUTATION')fail('NEW_SESSION_FAIL_CLOSED');
    if(clean(newSession?.validator)!=='tools/company-shared-context.mjs')fail('NEW_SESSION_VALIDATOR_BINDING');
    if(newSession?.resyncAfterCentralDocumentChange!==true)fail('NEW_SESSION_CENTRAL_DOC_RESYNC');
    if(newSession?.fixedAutonomousDevelopmentOperatingContractMustBeRead!==true)fail('NEW_SESSION_FIXED_OPERATING_CONTRACT_REQUIRED');
    if(!sameList(newSession?.requiredOperatingContractPaths,['fixedAutonomousDevelopmentOperatingContract','finalDevelopmentLock']))fail('NEW_SESSION_REQUIRED_OPERATING_CONTRACT_PATHS');
  }

  const expectedFixedLoop=['BUILD_UP','F0','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_TO_F8_RUNTIME_AND_QA','F9','RELEASE_CLASSIFICATION','IMMEDIATE_NEXT_BUILD_UP'];
  if(Number(fixedOperating?.version||0)!==1||clean(fixedOperating?.status)!=='FIXED_CURRENT_SYSTEM')fail('FIXED_OPERATING_CONTRACT_REQUIRED');
  if(clean(fixedOperating?.systemStructure)!=='EXISTING_CANONICAL_PIPELINE_ONLY')fail('FIXED_OPERATING_STRUCTURE');
  if(!sameList(fixedOperating?.normalOperatingLoop,expectedFixedLoop))fail('FIXED_OPERATING_LOOP');
  if(fixedOperating?.sequenceMeaningUsesFinalDevelopmentLockV2!==true||fixedOperating?.perpetualPerGameCycle!==true)fail('FIXED_OPERATING_LOCKED_LOOP');
  if(fixedOperating?.vibeOwnsNormalCycleOperation!==true||fixedOperating?.ownerPresenceRequiredForNormalCycle!==false||fixedOperating?.chatgptPresenceRequiredForNormalCycle!==false||fixedOperating?.normalCycleManualApprovalRequired!==false)fail('FIXED_OPERATING_AUTONOMY');
  if(clean(fixedOperating?.futureSystemWorkScope)!=='DETAIL_CHAIN_OPTIMIZATION_ONLY'||fixedOperating?.macroSystemStructureChangeInNormalDevelopment!==false)fail('FIXED_OPERATING_DETAIL_CHAIN_ONLY');
  if(fixedOperating?.distinctGamesRemainParallel!==true||fixedOperating?.sameGameIndependentWorkParallelWhenSafe!==true)fail('FIXED_OPERATING_PARALLELISM');
  if(clean(fixedOperating?.failureIsolation)!=='GAME_AND_STAGE_LOCAL_REPAIR_RETRY')fail('FIXED_OPERATING_FAILURE_ISOLATION');
  const bottleneck=fixedOperating?.autonomousBottleneckManagement||{};
  if(bottleneck?.required!==true||clean(bottleneck?.owner)!=='VIBE2_VIBE3_EXISTING_SYSTEM_AI')fail('FIXED_OPERATING_BOTTLENECK_OWNER');
  if(bottleneck?.ownerPresenceRequired!==false||bottleneck?.chatgptPresenceRequired!==false||bottleneck?.continuousDuringNormalOperation!==true)fail('FIXED_OPERATING_BOTTLENECK_AUTONOMY');
  if(clean(bottleneck?.mode)!=='DETECT_CLASSIFY_REPAIR_RETRY_REBALANCE_WITHIN_EXISTING_AUTHORITY')fail('FIXED_OPERATING_BOTTLENECK_MODE');
  if(clean(bottleneck?.existingComponents?.sensor)!=='tools/company-system-ai-bottleneck-sensor.mjs'||clean(bottleneck?.existingComponents?.worker)!=='tools/company-system-ai-worker.mjs'||clean(bottleneck?.existingComponents?.queueControl)!=='tools/vibe2-queue-control.mjs'||clean(bottleneck?.existingComponents?.recoveryQueue)!=='tools/company-recovery-queue.mjs')fail('FIXED_OPERATING_BOTTLENECK_COMPONENTS');
  if(bottleneck?.unrelatedGamesMustContinue!==true||bottleneck?.queueAndRunnerPressureMayNotCreateWholeGameSerialization!==true)fail('FIXED_OPERATING_BOTTLENECK_ISOLATION');
  if(bottleneck?.mayNotChangeLockedF0F9Sequence!==true||bottleneck?.mayNotExpandWritableAuthority!==true||bottleneck?.mayNotBypassSecurityQaRuntimeOrReleaseGates!==true||bottleneck?.newPipelineWorkflowWrapperOrShadowManagerForbidden!==true)fail('FIXED_OPERATING_BOTTLENECK_BOUNDARY');
  const split=fixedOperating?.responsibilitySplit||{};
  if(split?.vibe?.normalOperationsOwner!==true||split?.vibe?.allNormalProcessManagementOwner!==true||split?.vibe?.bottleneckManagementOwner!==true||split?.vibe?.buildUpThroughF9LifecycleOwner!==true||split?.vibe?.sourceGrowthExecutionOwner!==true)fail('FIXED_OPERATING_VIBE_FULL_PROCESS_OWNER');
  if(split?.vibe?.ownerOrChatgptPresenceRequired!==false)fail('FIXED_OPERATING_VIBE_INDEPENDENCE');
  if(split?.chatgpt?.normalOperationsOwner!==false||split?.chatgpt?.normalBottleneckManager!==false||split?.chatgpt?.normalCycleApprovalDependency!==false)fail('FIXED_OPERATING_CHATGPT_NON_OPERATIONAL');
  if(split?.owner?.normalOperationsOwner!==false||split?.owner?.normalBottleneckManager!==false||split?.owner?.normalCycleApprovalDependency!==false)fail('FIXED_OPERATING_OWNER_NON_OPERATIONAL');
  const growth=fixedOperating?.sourceGrowthIntegrity||{};
  if(growth?.buildUpGapMustBindExistingResponsibleGameSource!==true||growth?.realSourceDiffRequiredWhenBuildUpDecisionRequiresImplementation!==true||growth?.evaluationOnlyCompletionForbiddenWhenSourceMutationRequired!==true)fail('FIXED_OPERATING_SOURCE_GROWTH_REQUIRED');
  if(growth?.directResponsibleFunctionOrCompleteBlockEditPreferred!==true||growth?.wrapperOverrideShadowPatchForbidden!==true||growth?.unnecessaryNewFileOrParallelStructureForbidden!==true)fail('FIXED_OPERATING_SOURCE_GROWTH_STRUCTURE');
  if(growth?.sourceRevisionMustPropagateIntoF0CandidateEvidence!==true||growth?.exactBuildUpSourceRevisionMustBeVerifiedThroughRuntimeChain!==true||growth?.f9SuccessMustReturnToImmediateNextBuildUp!==true)fail('FIXED_OPERATING_SOURCE_GROWTH_FLOW');
  if(growth?.failureRoutesToExactGameStageRepairRetry!==true||growth?.sourceGrowthDoesNotChangeLockedF0F9Order!==true)fail('FIXED_OPERATING_SOURCE_GROWTH_REPAIR');
  const learning=fixedOperating?.autonomousLearning||{};
  if(learning?.required!==true||clean(learning?.owner)!=='VIBE2_VIBE3'||learning?.ownerPresenceRequired!==false||learning?.chatgptPresenceRequired!==false||learning?.continuous24h!==true)fail('FIXED_OPERATING_AUTONOMOUS_LEARNING_OWNER');
  if(learning?.existingLearningMotorOnly!==true||clean(learning?.learningMotor)!=='tools/vibe2-learning-motor.mjs'||clean(learning?.scheduler)!=='.github/workflows/vibe2-24h-runner.yml')fail('FIXED_OPERATING_AUTONOMOUS_LEARNING_BINDING');
  if(learning?.positiveLearningRequiresVerifiedEvidence!==true||learning?.verifiedFailureMayBecomeAvoidLesson!==true||learning?.infrastructureFailureMayNotBecomeGameNegativeLearning!==true)fail('FIXED_OPERATING_AUTONOMOUS_LEARNING_EVIDENCE');
  if(learning?.taskRelevantLearningMustBeRetrievedBeforeSourceGeneration!==true||learning?.verifiedLearningMustFeedNextBuildUp!==true||learning?.verifiedBottleneckLessonsMustFeedFutureCausalRepair!==true)fail('FIXED_OPERATING_AUTONOMOUS_LEARNING_REUSE');
  if(learning?.learningMayNotExpandAuthority!==true||learning?.learningMayNotReplaceQaRuntimeOrF9Verification!==true||learning?.rawUnverifiedModelOutputMayNotSelfPromote!==true||learning?.newLearningPipelineOrShadowTrainerForbidden!==true)fail('FIXED_OPERATING_AUTONOMOUS_LEARNING_BOUNDARY');
  if(clean(policy?.developmentLifecycleMachine?.learningMotor?.implementationOwner)!=='VIBE2_VIBE3'||policy?.developmentLifecycleMachine?.learningMotor?.positiveMasteryRequiresVerifiedEvidence!==true)fail('CANONICAL_LEARNING_MOTOR_VIBE_OWNER');
  if(clean(policy?.continuousLearning24hContract?.status)!=='ACTIVE_EXECUTABLE_CONTRACT'||policy?.continuousLearning24hContract?.existingCanonicalLearningChainOnly!==true||policy?.continuousLearning24hContract?.separateLearningPipelineForbidden!==true)fail('CANONICAL_CONTINUOUS_LEARNING_CONTRACT');
  const requestedRuntimeQa=fixedOperating?.requestedGameScopedRuntimeQa||{};
  if(requestedRuntimeQa?.requestedGameIdMeansExactGameOnly!==true||requestedRuntimeQa?.requestedRunMayNotProcessOrMutateUnrelatedGameRuntimeCandidate!==true||requestedRuntimeQa?.unrelatedInvalidCandidateMayNotFailRequestedGameRun!==true)fail('FIXED_OPERATING_REQUESTED_RUNTIME_QA_ISOLATION');
  if(requestedRuntimeQa?.emptyGameIdMeansParallelBatchScan!==true||requestedRuntimeQa?.batchCrossGameParallelismPreserved!==true||requestedRuntimeQa?.exactGameFailureRoutesToExactGameStageRepair!==true)fail('FIXED_OPERATING_REQUESTED_RUNTIME_QA_BATCH');
  const fixedSync=fixedOperating?.startupSync||{};
  if(fixedSync?.requiredForChatGPTAndWorkers!==true||fixedSync?.latestMainFirst!==true||fixedSync?.documentHashesRequired!==true||fixedSync?.finalDevelopmentLockV2Required!==true)fail('FIXED_OPERATING_STARTUP_SYNC');
  if(!sameList(fixedSync?.canonicalReadOrder,canonicalReadOrder))fail('FIXED_OPERATING_READ_ORDER');
  if(fixedSync?.beforeMutationDeploymentOrRuntimeStateChange!==true||fixedSync?.priorConversationOrMemoryMayOverride!==false||fixedSync?.resyncAfterCentralDocumentChange!==true)fail('FIXED_OPERATING_SYNC_BOUNDARY');

  const launchers=Array.isArray(contract?.workerLauncherWorkflows)?contract.workerLauncherWorkflows.map(clean).filter(Boolean):[];
  if(!launchers.length)fail('WORKER_LAUNCHERS_REQUIRED');
  for(const launcher of launchers){
    const file=resolveInput(launcher);
    if(!fs.existsSync(file))fail(`WORKER_LAUNCHER_MISSING:${launcher}`);
    if(!fs.readFileSync(file,'utf8').includes('company-shared-context.mjs'))fail(`WORKER_LAUNCHER_NOT_SYNCHRONIZED:${launcher}`);
  }

  if(clean(logMap?.centralPolicy)!==policyFile||clean(architecture?.centralPolicy)!==policyFile)fail('CENTRAL_POLICY_CROSS_REFERENCE');
  if(clean(logMap?.architectureMap)!==architectureFile||clean(architecture?.logMap)!==logMapFile)fail('MAP_CROSS_REFERENCE');
  if(clean(logMap?.securityPolicy)!==securityPolicyFile||clean(architecture?.securityPolicy)!==securityPolicyFile)fail('SECURITY_POLICY_CROSS_REFERENCE');
  if(logMap?.requiredForAllWorkers!==true||architecture?.requiredForAllWorkers!==true)fail('MAP_REQUIRED_FOR_ALL_WORKERS');
  if(!sameList(architecture?.sharedContextLoadOrder,[policyFile,logMapFile,architectureFile,securityPolicyFile]))fail('ARCHITECTURE_LOAD_ORDER');
  if(architecture?.workerSynchronization?.documentIsCode!==true)fail('ARCHITECTURE_DOCUMENT_CODE');
  if(policy?.developmentLifecycleMachine?.sharedWorkerContext?.compiledArchitectureProjection?.required===true){
    if(architecture?.centralArchitectureProjection?.required!==true)fail('ARCHITECTURE_PROJECTION_REGISTRY_REQUIRED');
    if(clean(architecture?.centralArchitectureProjection?.compiler)!=='tools/company-shared-context.mjs::compileCentralArchitectureProjection')fail('ARCHITECTURE_PROJECTION_REGISTRY_COMPILER');
    if(architecture?.centralArchitectureProjection?.generatedAtExecutionTime!==true||architecture?.centralArchitectureProjection?.manualSemanticMirrorRequired!==false)fail('ARCHITECTURE_PROJECTION_RUNTIME_MODE');
    if(architecture?.centralArchitectureProjection?.thisFileMayNotOverrideCompiledProjection!==true)fail('ARCHITECTURE_PROJECTION_OVERRIDE_BOUNDARY');
  }
  if(architecture?.workerSynchronization?.launcherValidationRequired!==true)fail('ARCHITECTURE_LAUNCHER_VALIDATION');
  if(clean(architecture?.workerSynchronization?.validator)!=='tools/company-shared-context.mjs')fail('ARCHITECTURE_VALIDATOR_BINDING');
  if(!sameList(architecture?.workerSynchronization?.launcherWorkflows,launchers))fail('ARCHITECTURE_LAUNCHER_REGISTRY');
  if(logMap?.workerContextLogContract?.roadmapPolicyHashRequired!==true)fail('LOG_ROADMAP_HASH_REQUIRED');
  if(logMap?.workerContextLogContract?.securityPolicyHashRequired!==true)fail('LOG_SECURITY_HASH_REQUIRED');
  if(logMap?.workerContextLogContract?.launcherValidationRequired!==true)fail('LOG_LAUNCHER_VALIDATION_REQUIRED');
  if(Number(contract?.version||0)>=6){
    if(logMap?.workerContextLogContract?.newChatAndWorkerPreflightRequired!==true||logMap?.workerContextLogContract?.latestMainShaRequired!==true)fail('LOG_NEW_SESSION_PREFLIGHT_REQUIRED');
    if(logMap?.workerContextLogContract?.canonicalReadOrderRequired!==true||logMap?.workerContextLogContract?.finalDevelopmentLockStatusRequired!==true)fail('LOG_NEW_SESSION_CONTEXT_EVIDENCE_REQUIRED');
    if(logMap?.workerContextLogContract?.preMutationSharedContextPassRequired!==true||logMap?.workerContextLogContract?.staleContextMutationForbidden!==true)fail('LOG_PREMUTATION_SYNC_REQUIRED');
    if(logMap?.workerContextLogContract?.priorConversationOrMemoryOverrideForbidden!==true)fail('LOG_MEMORY_OVERRIDE_FORBIDDEN');
    if(architecture?.workerSynchronization?.newChatAndWorkerPreflightRequired!==true||architecture?.workerSynchronization?.appliesToChatGPTNewSessions!==true)fail('ARCHITECTURE_NEW_SESSION_PREFLIGHT_REQUIRED');
    if(architecture?.workerSynchronization?.latestMainResolveBeforeCanonicalRead!==true||architecture?.workerSynchronization?.finalDevelopmentLockStatusMustBeLoaded!==true)fail('ARCHITECTURE_NEW_SESSION_LATEST_MAIN_REQUIRED');
    if(!sameList(architecture?.workerSynchronization?.canonicalReadOrder,canonicalReadOrder))fail('ARCHITECTURE_NEW_SESSION_READ_ORDER');
    if(architecture?.workerSynchronization?.mutationDeploymentStateChangeForbiddenUntilSyncPass!==true||architecture?.workerSynchronization?.staleContextFailsClosedBeforeMutation!==true)fail('ARCHITECTURE_PREMUTATION_SYNC_REQUIRED');
    if(architecture?.workerSynchronization?.priorConversationOrMemoryCannotOverrideCentralPolicy!==true)fail('ARCHITECTURE_MEMORY_OVERRIDE_FORBIDDEN');
    if(securityPolicy?.workerSynchronization?.newChatAndWorkerPreflightRequired!==true||securityPolicy?.workerSynchronization?.latestMainCanonicalSetRequired!==true)fail('SECURITY_NEW_SESSION_PREFLIGHT_REQUIRED');
    if(securityPolicy?.workerSynchronization?.finalDevelopmentLockStatusMustBeLoaded!==true||securityPolicy?.workerSynchronization?.mutationBeforeSharedContextPassForbidden!==true)fail('SECURITY_PREMUTATION_SYNC_REQUIRED');
    if(securityPolicy?.workerSynchronization?.priorConversationOrMemoryCannotOverrideCentralPolicy!==true)fail('SECURITY_MEMORY_OVERRIDE_FORBIDDEN');
    if(logMap?.workerContextLogContract?.fixedAutonomousDevelopmentOperatingContractRequired!==true)fail('LOG_FIXED_OPERATING_CONTRACT_REQUIRED');
    if(architecture?.workerSynchronization?.fixedAutonomousDevelopmentOperatingContractMustBeLoaded!==true)fail('ARCHITECTURE_FIXED_OPERATING_CONTRACT_REQUIRED');
    if(securityPolicy?.workerSynchronization?.fixedAutonomousDevelopmentOperatingContractMustBeLoaded!==true)fail('SECURITY_FIXED_OPERATING_CONTRACT_REQUIRED');
  }
  const fixedContractPath='company-learning/platform-release-roadmap.json#fixedAutonomousDevelopmentOperatingContract';
  if(clean(logMap?.fixedAutonomousDevelopmentOperatingEvidence?.centralContract)!==fixedContractPath)fail('LOG_FIXED_OPERATING_CONTRACT_BINDING');
  if(clean(architecture?.fixedAutonomousDevelopmentOperatingTopology?.centralContract)!==fixedContractPath)fail('ARCHITECTURE_FIXED_OPERATING_CONTRACT_BINDING');
  if(clean(securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.centralContract)!==fixedContractPath)fail('SECURITY_FIXED_OPERATING_CONTRACT_BINDING');
  if(architecture?.fixedAutonomousDevelopmentOperatingTopology?.ownerAndChatgptNotInNormalCycleCriticalPath!==true)fail('ARCHITECTURE_FIXED_OPERATING_NONBLOCKING');
  if(securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.normalCycleMayContinueWithoutOwnerOrChatgptPresence!==true)fail('SECURITY_FIXED_OPERATING_NONBLOCKING');
  if(clean(logMap?.fixedAutonomousDevelopmentOperatingEvidence?.autonomousBottleneckManagementOwner)!=='VIBE2_VIBE3_EXISTING_SYSTEM_AI'||logMap?.fixedAutonomousDevelopmentOperatingEvidence?.ownerOrChatgptBottleneckPresenceRequired!==false)fail('LOG_FIXED_OPERATING_BOTTLENECK_OWNER');
  if(clean(architecture?.fixedAutonomousDevelopmentOperatingTopology?.bottleneckManagementOwner)!=='VIBE2_VIBE3_EXISTING_SYSTEM_AI'||architecture?.fixedAutonomousDevelopmentOperatingTopology?.ownerAndChatgptNotBottleneckManagersInNormalOperation!==true)fail('ARCHITECTURE_FIXED_OPERATING_BOTTLENECK_OWNER');
  if(securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.vibeMayManageNormalOperationalBottlenecksAutonomously!==true||securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.ownerAndChatgptAbsenceDoesNotBlockNonSecurityBottleneckRepair!==true)fail('SECURITY_FIXED_OPERATING_BOTTLENECK_OWNER');
  if(logMap?.fixedAutonomousDevelopmentOperatingEvidence?.vibeOwnsAllNormalProcessManagement!==true||logMap?.fixedAutonomousDevelopmentOperatingEvidence?.chatgptNormalOperationsOwner!==false||logMap?.fixedAutonomousDevelopmentOperatingEvidence?.sourceGrowthIntegrityEvidenceRequired!==true)fail('LOG_FIXED_OPERATING_RESPONSIBILITY_SPLIT');
  if(architecture?.fixedAutonomousDevelopmentOperatingTopology?.vibeOwnsAllNormalProcessManagement!==true||architecture?.fixedAutonomousDevelopmentOperatingTopology?.chatgptNormalOperationsOwner!==false||clean(architecture?.fixedAutonomousDevelopmentOperatingTopology?.sourceGrowthExecutionOwner)!=='VIBE2_VIBE3')fail('ARCHITECTURE_FIXED_OPERATING_RESPONSIBILITY_SPLIT');
  if(securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.vibeNormalProcessManagementOwner!==true||securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.chatgptNormalOperationsOwner!==false||securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.evaluationOnlyCompletionMayNotFakeRequiredSourceMutation!==true)fail('SECURITY_FIXED_OPERATING_RESPONSIBILITY_SPLIT');
  if(clean(logMap?.fixedAutonomousDevelopmentOperatingEvidence?.autonomousLearning?.owner)!=='VIBE2_VIBE3'||logMap?.fixedAutonomousDevelopmentOperatingEvidence?.autonomousLearning?.ownerOrChatgptPresenceRequired!==false)fail('LOG_FIXED_AUTONOMOUS_LEARNING');
  if(clean(architecture?.fixedAutonomousDevelopmentOperatingTopology?.autonomousLearning?.owner)!=='VIBE2_VIBE3'||architecture?.fixedAutonomousDevelopmentOperatingTopology?.autonomousLearning?.ownerAndChatgptNotInLearningCriticalPath!==true)fail('ARCHITECTURE_FIXED_AUTONOMOUS_LEARNING');
  if(securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.autonomousLearning?.positiveLearningRequiresVerifiedEvidence!==true||securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.autonomousLearning?.newShadowTrainerForbidden!==true)fail('SECURITY_FIXED_AUTONOMOUS_LEARNING');
  if(logMap?.fixedAutonomousDevelopmentOperatingEvidence?.requestedRuntimeQaIsolation?.requestedGameOnly!==true||architecture?.fixedAutonomousDevelopmentOperatingTopology?.requestedRuntimeQaIsolation?.requestedGameOnly!==true||securityPolicy?.fixedAutonomousDevelopmentOperatingSecurity?.requestedRuntimeQaIsolation?.requestedGameOnly!==true)fail('FIXED_REQUESTED_RUNTIME_QA_MIRRORS');
  if(clean(securityPolicy?.sourceOfTruth)!==policyFile)fail('SECURITY_SOURCE_OF_TRUTH');
  if(securityPolicy?.centralRoadmapBinding?.documentIsCode!==true)fail('SECURITY_DOCUMENT_CODE');
  if(clean(securityPolicy?.centralRoadmapBinding?.sharedContextValidator)!=='tools/company-shared-context.mjs')fail('SECURITY_VALIDATOR_BINDING');
  if(!sameList(securityPolicy?.workerSynchronization?.launcherWorkflows,launchers))fail('SECURITY_LAUNCHER_REGISTRY');
  if(clean(policy?.developmentLifecycleMachine?.securityImmuneSystem?.policyFile)!==securityPolicyFile)fail('ROADMAP_SECURITY_POLICY_BINDING');

  const orchestration=policy?.developmentLifecycleMachine?.primaryAiOrchestration;
  if(orchestration?.orchestrator!=='CHATGPT_PRIMARY_AI')fail('PRIMARY_AI_ORCHESTRATOR');
  if(orchestration?.role!=='PRIMARY_AI_NON_BLOCKING_SUPERVISOR')fail('PRIMARY_AI_ROLE');
  if(orchestration?.gameSourceAuthoring!==false)fail('PRIMARY_AI_GAME_SOURCE_BOUNDARY');
  if(JSON.stringify(orchestration?.gameImplementationOwner)!==JSON.stringify(['VIBE2','VIBE3']))fail('GAME_IMPLEMENTATION_OWNER');
  if(orchestration?.externalAiWorkerPolicy?.maySelfPromoteToOrchestrator!==false)fail('EXTERNAL_AI_SELF_ORCHESTRATION');
  if(orchestration?.externalAiWorkerPolicy?.mayIssueFinalSystemCompletionVerdict!==false)fail('EXTERNAL_AI_FINAL_VERDICT');
  if(orchestration?.presenceRequiredForAutonomousWork!==false)fail('PRIMARY_AI_MUST_NOT_BLOCK_AUTONOMY');
  if(orchestration?.absenceBlocksWorkerProgress!==false)fail('PRIMARY_AI_ABSENCE_MUST_NOT_BLOCK');
  if(orchestration?.workersContinue24hFromCentralContract!==true)fail('AUTONOMOUS_24H_WORK_REQUIRED');
  if(orchestration?.reviewRequiredForWorkerCompletion!==false)fail('PRIMARY_AI_REVIEW_MUST_BE_NON_BLOCKING');
  const collaboration=orchestration?.internalVibeAiCollaboration||{};
  if(clean(collaboration?.scope)!=='ALL_VIBE_INTERNAL_AI_AUTONOMOUS_WORKERS_NEURAL_DIAGNOSIS_CRITIC_ROOT_CAUSE_RECOVERY_PLANNER_IMPLEMENTATION_QA_RELEASE_SECURITY_AND_LEARNING_SYSTEMS')fail('PRIMARY_AI_INTERNAL_VIBE_SCOPE');
  if(clean(collaboration?.collaborationMode)!=='PRIMARY_AI_NON_BLOCKING_COPILOT_OVERLAY')fail('PRIMARY_AI_INTERNAL_VIBE_MODE');
  if(collaboration?.autonomous24hExecutionContinuesWithoutPrimaryAi!==true||collaboration?.primaryAiPresenceIsRuntimeGate!==false)fail('PRIMARY_AI_INTERNAL_VIBE_NONBLOCKING');
  if(collaboration?.appliesToExistingAndFutureRegisteredInternalAi!==true)fail('PRIMARY_AI_INTERNAL_VIBE_COVERAGE');
  if(collaboration?.directMainWriteGrantedByCollaboration!==false||collaboration?.policyMutationAuthorityGrantedByCollaboration!==false||collaboration?.selfAcceptanceGrantedByCollaboration!==false)fail('PRIMARY_AI_INTERNAL_VIBE_AUTHORITY_BOUNDARY');
  const capabilityLock=collaboration?.capabilityGrowthRoleLock||{};
  if(clean(capabilityLock?.primaryAiRoleAfterCapabilityGrowth)!=='NON_BLOCKING_ASSISTANT_AND_COLLABORATOR')fail('PRIMARY_AI_CAPABILITY_GROWTH_ROLE_LOCK');
  if(capabilityLock?.capabilityMayIncrease!==true||capabilityLock?.authorityMayAutoIncrease!==false)fail('VIBE_CAPABILITY_AUTHORITY_SEPARATION');
  if(capabilityLock?.primaryAiMayBecomeRuntimeOwner!==false||capabilityLock?.primaryAiMayReplaceDeterministicQa!==false||capabilityLock?.primaryAiMayReplaceVibeImplementationOwnership!==false)fail('PRIMARY_AI_ASSISTANT_BOUNDARY_AFTER_CAPABILITY_GROWTH');
  if(orchestration?.deterministicEvidenceCreatesVerifiedCheckpoint!==true)fail('DETERMINISTIC_VERIFIED_CHECKPOINT_AUTHORITY');
  if(orchestration?.verifiedCheckpointDoesNotStopBrain!==true)fail('VERIFIED_CHECKPOINT_MUST_NOT_STOP_BRAIN');
  if(architecture?.workerRoles?.PRIMARY_AI_ORCHESTRATOR!=='NON_BLOCKING_ROADMAP_PRIORITY_BOTTLENECK_SUPERVISOR')fail('ARCHITECTURE_PRIMARY_AI_ROLE');
  if(architecture?.autonomous24hWorkersContinueWithoutPrimaryAi!==true)fail('ARCHITECTURE_AUTONOMOUS_24H');
  if(architecture?.primaryAiPresenceRequired!==false)fail('ARCHITECTURE_PRIMARY_AI_NONBLOCKING');
  const archCollaboration=architecture?.primaryAiInternalVibeCollaboration||{};
  if(clean(archCollaboration?.coverage)!=='ALL_REGISTERED_VIBE_INTERNAL_AI_AND_AUTONOMOUS_SUBSYSTEMS')fail('ARCHITECTURE_PRIMARY_AI_INTERNAL_VIBE_COVERAGE');
  if(clean(archCollaboration?.mode)!=='NON_BLOCKING_COPILOT_OVERLAY'||archCollaboration?.autonomyPreserved!==true)fail('ARCHITECTURE_PRIMARY_AI_INTERNAL_VIBE_MODE');
  const archCapabilityLock=archCollaboration?.capabilityGrowthRoleLock||{};
  if(clean(archCapabilityLock?.primaryAiRole)!=='NON_BLOCKING_ASSISTANT_AND_COLLABORATOR'||archCapabilityLock?.capabilityExpansionDoesNotChangeAuthority!==true)fail('ARCHITECTURE_PRIMARY_AI_CAPABILITY_ROLE_LOCK');
  if(architecture?.externalAiRules?.finalSystemAcceptanceForbidden!==true)fail('ARCHITECTURE_EXTERNAL_AI_ACCEPTANCE');
  if(logMap?.orchestrationLogContract?.finalAcceptanceRequiresPrimaryAiReview!==false)fail('LOG_PRIMARY_AI_REVIEW_MUST_NOT_BLOCK');
  if(logMap?.orchestrationLogContract?.deterministicMachineGateMayCompleteWithoutPrimaryAi!==true)fail('LOG_DETERMINISTIC_COMPLETION');
  if(logMap?.orchestrationLogContract?.supervisorAbsenceIsNotAWorkerBlocker!==true)fail('LOG_SUPERVISOR_ABSENCE_NONBLOCKING');
  if(logMap?.orchestrationLogContract?.workerMustNotInventPolicy!==true)fail('LOG_WORKER_POLICY_BOUNDARY');
  const collaborationLog=logMap?.orchestrationLogContract?.internalVibeAiCollaboration||{};
  if(collaborationLog?.requiredWhenEscalated!==true||collaborationLog?.rawPrivateReasoningLogged!==false||collaborationLog?.autonomousCompletionStillAllowed!==true)fail('LOG_PRIMARY_AI_INTERNAL_VIBE_COLLABORATION');

  const hashes={
    policySha256:sha256Buffer(policyBuffer),
    logMapSha256:sha256Buffer(logMapBuffer),
    architectureSha256:sha256Buffer(architectureBuffer),
    securityPolicySha256:sha256Buffer(securityPolicyBuffer)
  };
  const expected=clean(expectedPolicySha256);
  if(expected&&expected!==hashes.policySha256)fail('POLICY_SHA_MISMATCH');

  return{
    pass:true,version:2,
    files:{policy:policyFile,logMap:logMapFile,architecture:architectureFile,securityPolicy:securityPolicyFile},
    hashes,policyVersion:Number(policy.version||0),
    constitution:{version:constitution.version,authority:constitution.authority,constitutionalAuthority:constitution.constitutionalAuthority,fingerprint:constitution.fingerprint,orderedRuleIds:constitution.orderedRuleIds,ruleCount:constitution.rules.length,automaticContractBinding:constitution.binding?.automaticContractBinding===true},
    architectureProjection:{valid:architectureProjection.valid,errors:architectureProjection.errors,fingerprint:architectureProjection.fingerprint,contract:architectureProjection.contract},
    homepage:{valid:homepage.valid,errors:homepage.errors,fingerprint:homepage.fingerprint,supportedPlatforms:homepage.supportedPlatforms,contract:homepage.contract},
    documentIsCode:true,roadmapSynchronized:true,workerLaunchersValidated:launchers.length,
    primaryAiOrchestrator:orchestration.orchestrator,primaryAiReviewRequired:false,autonomous24hWorkersContinue:true,internalVibeAiCollaboration:'SYNCED',
    completionAuthority:'DETERMINISTIC_EVIDENCE_AND_CANONICAL_MACHINE_GATES',checkedAt:new Date().toISOString()
  };
}

export function verifyPinnedSharedWorkerContext({
  policyFile=DEFAULT_POLICY,
  logMapFile=DEFAULT_LOG_MAP,
  architectureFile=DEFAULT_ARCHITECTURE,
  securityPolicyFile=DEFAULT_SECURITY_POLICY,
  expectedPolicySha256='',
  expectedLogMapSha256='',
  expectedArchitectureSha256='',
  expectedSecurityPolicySha256=''
}={}){
  const expected={
    policySha256:clean(expectedPolicySha256),
    logMapSha256:clean(expectedLogMapSha256),
    architectureSha256:clean(expectedArchitectureSha256),
    securityPolicySha256:clean(expectedSecurityPolicySha256)
  };
  for(const [key,value] of Object.entries(expected))if(!/^[a-f0-9]{64}$/i.test(value))fail(`PINNED_HASH_EXPECTATION_MISSING:${key}`);
  for(const file of [policyFile,logMapFile,architectureFile,securityPolicyFile])if(!fs.existsSync(resolveInput(file)))fail(`MISSING:${file}`);
  const policyBuffer=readBuffer(policyFile),logMapBuffer=readBuffer(logMapFile),architectureBuffer=readBuffer(architectureFile),securityPolicyBuffer=readBuffer(securityPolicyFile);
  const hashes={
    policySha256:sha256Buffer(policyBuffer),
    logMapSha256:sha256Buffer(logMapBuffer),
    architectureSha256:sha256Buffer(architectureBuffer),
    securityPolicySha256:sha256Buffer(securityPolicyBuffer)
  };
  for(const [key,value] of Object.entries(expected))if(hashes[key]!==value)fail(`PINNED_HASH_MISMATCH:${key}:${value}->${hashes[key]}`);
  const policy=parseJsonBuffer(policyBuffer,policyFile);
  const constitution=compileOwnerCanonicalConstitution(policy);
  if(!constitution.valid)fail(`OWNER_CANONICAL_CONSTITUTION:${constitution.errors.join('|')||'UNKNOWN'}`);
  const architectureProjection=compileCentralArchitectureProjection(policy);
  if(policy?.developmentLifecycleMachine?.sharedWorkerContext?.compiledArchitectureProjection?.required===true&&!architectureProjection.valid)fail(`CENTRAL_ARCHITECTURE_PROJECTION:${architectureProjection.errors.join('|')||'UNKNOWN'}`);
  const homepage=compileHomepageCentralPolicy(policy);
  return{
    pass:true,version:2,
    verificationMode:'PINNED_HASH_REUSE',
    files:{policy:policyFile,logMap:logMapFile,architecture:architectureFile,securityPolicy:securityPolicyFile},
    hashes,policyVersion:Number(policy.version||0),
    constitution:{version:constitution.version,authority:constitution.authority,constitutionalAuthority:constitution.constitutionalAuthority,fingerprint:constitution.fingerprint,orderedRuleIds:constitution.orderedRuleIds,ruleCount:constitution.rules.length,automaticContractBinding:constitution.binding?.automaticContractBinding===true},
    architectureProjection:{valid:architectureProjection.valid,errors:architectureProjection.errors,fingerprint:architectureProjection.fingerprint,contract:architectureProjection.contract},
    homepage:{valid:homepage.valid,errors:homepage.errors,fingerprint:homepage.fingerprint,supportedPlatforms:homepage.supportedPlatforms,contract:homepage.contract},
    documentIsCode:true,roadmapSynchronized:true,workerLaunchersValidated:0,
    primaryAiOrchestrator:policy?.developmentLifecycleMachine?.primaryAiOrchestration?.orchestrator||null,primaryAiReviewRequired:false,autonomous24hWorkersContinue:true,internalVibeAiCollaboration:'PINNED_HASH_REUSE',
    completionAuthority:'DETERMINISTIC_EVIDENCE_AND_CANONICAL_MACHINE_GATES',checkedAt:new Date().toISOString()
  };
}

function writeOutput(file,value){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=parseArgs();
    const pinnedHashVerify=clean(args['pinned-hash-verify']).toLowerCase()==='true';
    const common={
      policyFile:clean(args.policy)||DEFAULT_POLICY,
      logMapFile:clean(args['log-map'])||DEFAULT_LOG_MAP,
      architectureFile:clean(args.architecture)||DEFAULT_ARCHITECTURE,
      securityPolicyFile:clean(args.security)||DEFAULT_SECURITY_POLICY
    };
    const result=pinnedHashVerify
      ?verifyPinnedSharedWorkerContext({
        ...common,
        expectedPolicySha256:clean(args['expected-policy-sha256'])||clean(process.env.WORKER_CONTEXT_EXPECTED_POLICY_SHA256),
        expectedLogMapSha256:clean(args['expected-log-map-sha256'])||clean(process.env.WORKER_CONTEXT_EXPECTED_LOG_MAP_SHA256),
        expectedArchitectureSha256:clean(args['expected-architecture-sha256'])||clean(process.env.WORKER_CONTEXT_EXPECTED_ARCHITECTURE_SHA256),
        expectedSecurityPolicySha256:clean(args['expected-security-policy-sha256'])||clean(process.env.WORKER_CONTEXT_EXPECTED_SECURITY_POLICY_SHA256)
      })
      :validateSharedWorkerContext({
        ...common,
        expectedPolicySha256:clean(args['expected-policy-sha256'])||clean(process.env.WORKER_CONTEXT_EXPECTED_POLICY_SHA256),
        requireHomepagePolicy:clean(args['require-homepage-policy']).toLowerCase()==='true'
      });
    writeOutput(clean(args.output),result);
    console.log(`WORKER_CONTEXT_POLICY_VERSION=${result.policyVersion}`);
    console.log(`WORKER_CONTEXT_POLICY_SHA256=${result.hashes.policySha256}`);
    console.log(`WORKER_CONTEXT_LOG_MAP_SHA256=${result.hashes.logMapSha256}`);
    console.log(`WORKER_CONTEXT_ARCHITECTURE_SHA256=${result.hashes.architectureSha256}`);
    console.log(`WORKER_CONTEXT_SECURITY_POLICY_SHA256=${result.hashes.securityPolicySha256}`);
    console.log(`WORKER_CONTEXT_CONSTITUTION_SHA256=${result.constitution.fingerprint}`);
    console.log(`WORKER_CONTEXT_CONSTITUTION_RULES=${result.constitution.orderedRuleIds.join(',')}`);
    console.log(`WORKER_CONTEXT_CONSTITUTION_AUTO_BIND=${result.constitution.automaticContractBinding===true?'YES':'NO'}`);
    console.log(`WORKER_CONTEXT_ARCHITECTURE_PROJECTION_SHA256=${result.architectureProjection.fingerprint}`);
    console.log(`WORKER_CONTEXT_ARCHITECTURE_PROJECTION_SYNC=${result.architectureProjection.valid===true?'PASS':'FAIL'}`);
    console.log(`WORKER_CONTEXT_HOMEPAGE_POLICY_SHA256=${result.homepage.fingerprint||'INVALID'}`);
    console.log(`WORKER_CONTEXT_HOMEPAGE_PLATFORMS=${(result.homepage.supportedPlatforms||[]).join(',')}`);
    console.log(`WORKER_CONTEXT_LAUNCHERS=${result.workerLaunchersValidated}`);
    console.log(`WORKER_CONTEXT_MODE=${result.verificationMode||'FULL_CANONICAL_VALIDATION'}`);
    console.log('WORKER_CONTEXT_SYNC=PASS');
  }catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
