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
function readJson(file){return JSON.parse(fs.readFileSync(resolveInput(file),'utf8'));}
function sha256(file){return createHash('sha256').update(fs.readFileSync(resolveInput(file))).digest('hex');}
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
  if(binding?.beforeWorkValidationRequired!==true||binding?.afterWorkValidationRequired!==true)errors.push('CONSTITUTION_PRE_POST_VALIDATION');
  if(binding?.staleConstitutionMayNotStartWork!==true||binding?.staleConstitutionMayNotCompleteWork!==true)errors.push('CONSTITUTION_STALE_GUARD');
  if(clean(binding?.missingOrInvalidBindingAction)!=='FAIL_CLOSED_BLOCK_WORK_AND_REQUEUE_EXACT_FAILURE_STAGE')errors.push('CONSTITUTION_FAIL_CLOSED');
  if(binding?.constitutionChangeInvalidatesActiveWorkerExecutionFingerprint!==true)errors.push('CONSTITUTION_STALE_FINGERPRINT');
  if(binding?.subordinatePolicyCannotWeakenCanonicalRule!==true)errors.push('CONSTITUTION_SUBORDINATE_WEAKENING');
  if(clean(binding?.executableEnforcer)!=='tools/company-constitution-enforcer.mjs')errors.push('CONSTITUTION_EXECUTABLE_ENFORCER');
  if(binding?.enforcerRequiredAtPolicyQa!==true)errors.push('CONSTITUTION_POLICY_QA_ENFORCER');
  if(binding?.enforcerRequiredAt24hPlanner!==true)errors.push('CONSTITUTION_24H_PLANNER_ENFORCER');
  if(binding?.enforcerRequiredBeforeWorkerSourceWrite!==true)errors.push('CONSTITUTION_WORKER_PREWRITE_ENFORCER');
  if(binding?.enforcerRequiredAfterWorkerExecution!==true)errors.push('CONSTITUTION_WORKER_POST_ENFORCER');
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
  const testingContract=source.testingContract||{};
  const documentationSyncContract=source.documentationSyncContract||{};
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
      staleContextMayNotCompleteWork:shared?.staleContextMayNotCompleteWork===true
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
  const policy=readJson(policyFile),logMap=readJson(logMapFile),architecture=readJson(architectureFile),securityPolicy=readJson(securityPolicyFile);
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
  if(clean(contract?.syncMode)!=='ROADMAP_FIRST_FAIL_CLOSED')fail('ROADMAP_SYNC_MODE');
  if(contract?.completionRequiresSharedContextSync!==true)fail('COMPLETION_SYNC_REQUIRED');
  if(contract?.mismatchAction!=='BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE')fail('MISMATCH_ACTION');

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
    policySha256:sha256(policyFile),
    logMapSha256:sha256(logMapFile),
    architectureSha256:sha256(architectureFile),
    securityPolicySha256:sha256(securityPolicyFile)
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

function writeOutput(file,value){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=parseArgs();
    const result=validateSharedWorkerContext({
      policyFile:clean(args.policy)||DEFAULT_POLICY,
      logMapFile:clean(args['log-map'])||DEFAULT_LOG_MAP,
      architectureFile:clean(args.architecture)||DEFAULT_ARCHITECTURE,
      securityPolicyFile:clean(args.security)||DEFAULT_SECURITY_POLICY,
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
    console.log('WORKER_CONTEXT_SYNC=PASS');
  }catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
