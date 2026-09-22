// 파일명: tools/company-constitution-enforcer.mjs
// 역할: 중앙 헌법(ownerCanonicalRules) 제1~제4규칙과 미래 자동 바인딩 규칙을 실행 전후에 강제 검증한다.
// 원칙: 헌법 위반은 해당 작업을 fail-closed/requeue 처리하되 24H 전체 순환은 종료하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileOwnerCanonicalConstitution} from './company-shared-context.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=v=>String(v??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(path.resolve(ROOT,file),'utf8'));
const readText=file=>fs.readFileSync(path.resolve(ROOT,file),'utf8');
const exists=file=>fs.existsSync(path.resolve(ROOT,file));
const fail=(errors,phase)=>{throw new Error('CONSTITUTION_ENFORCEMENT_FAILED:'+phase+':'+errors.join('|'));};
const must=(errors,ok,code)=>{if(!ok)errors.push(code);};

export function enforceConstitution({policy,root=ROOT,phase='runtime'}={}){
  const errors=[];
  const p=policy||JSON.parse(fs.readFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),'utf8'));
  const constitution=compileOwnerCanonicalConstitution(p);
  must(errors,constitution.valid===true,'CANONICAL_CONSTITUTION_INVALID:'+(constitution.errors||[]).join(','));
  must(errors,constitution.rules.length>=4,'CANONICAL_RULE_SET_INCOMPLETE');
  must(errors,new Set(constitution.orderedRuleIds).size===constitution.orderedRuleIds.length,'CANONICAL_RULE_ORDER_DUPLICATE');
  must(errors,constitution.rules.every(r=>r.id&&r.fingerprint&&r.contract?.enabled===true),'CANONICAL_RULE_FINGERPRINT_OR_ENABLEMENT');

  const owner=p.ownerCanonicalRules||{};
  const binding=owner.constitutionalBinding||{};
  must(errors,binding.executableEnforcer==='tools/company-constitution-enforcer.mjs','CONSTITUTION_ENFORCER_BINDING');
  must(errors,binding.enforcerRequiredAtPolicyQa===true,'CONSTITUTION_POLICY_QA_BINDING');
  must(errors,binding.enforcerRequiredAt24hPlanner===true,'CONSTITUTION_24H_PLANNER_BINDING');
  must(errors,binding.enforcerRequiredBeforeWorkerSourceWrite===true,'CONSTITUTION_WORKER_PREWRITE_BINDING');
  must(errors,binding.enforcerRequiredAfterWorkerExecution===true,'CONSTITUTION_WORKER_POST_BINDING');
  must(errors,binding.global24hStopOnConstitutionFailureForbidden===true,'CONSTITUTION_NO_GLOBAL_STOP_ON_VIOLATION');

  const r1=owner.rule1||{};
  must(errors,r1.enabled===true&&r1.id==='RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT','RULE1_ID_ENABLEMENT');
  must(errors,r1.terminalDoneStateForbidden===true,'RULE1_TERMINAL_DONE_FORBIDDEN');
  must(errors,r1.verifiedCheckpointMustGenerateNextCausalInput===true,'RULE1_CHECKPOINT_REFILL');
  must(errors,r1.completionIsCheckpointNotStop===true,'RULE1_COMPLETION_NOT_STOP');
  must(errors,r1.global24hStopForbidden===true,'RULE1_GLOBAL_24H_STOP_FORBIDDEN');
  must(errors,r1.ownerMayStopGlobal24h===false,'RULE1_GLOBAL_OWNER_STOP_FORBIDDEN');
  must(errors,clean(r1.emptyQueueMeaning).includes('TRIGGER'),'RULE1_EMPTY_QUEUE_MUST_TRIGGER');
  must(errors,Array.isArray(r1.continuousCycle)&&r1.continuousCycle.includes('DISPATCH_NEXT_CYCLE'),'RULE1_DISPATCH_NEXT_CYCLE');

  const r2=owner.rule2||{};
  must(errors,r2.enabled===true&&r2.id==='RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION','RULE2_ID_ENABLEMENT');
  must(errors,r2.allExternalAiWorkersBound===true&&r2.allCodingActionsIncluded===true,'RULE2_ALL_EXTERNAL_AI_BOUND');
  must(errors,r2.securityStewardMonitorsBeforeAcceptance===true,'RULE2_SECURITY_STEWARD_REQUIRED');
  must(errors,r2.reusableLearningRequiresIndependentVerification===true,'RULE2_INDEPENDENT_VERIFICATION');
  must(errors,r2.rawExternalAiOutputStored===false&&r2.rawHostilePayloadMayEnterLearning===false,'RULE2_RAW_OUTPUT_FORBIDDEN');
  must(errors,r2.authorityExpansion===false&&r2.gateWeakening===false,'RULE2_AUTHORITY_GATE_INVARIANT');
  for(const file of [r2.externalAiDistillation,r2.securitySteward,r2.securityLearning,r2.mergedPrProvenanceCapture])must(errors,exists(file),'RULE2_BINDING_MISSING:'+file);

  const r3=owner.rule3||{};
  must(errors,r3.enabled===true&&r3.id==='RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE','RULE3_ID_ENABLEMENT');
  for(const key of ['totalLearningSignalLimit','practiceQueueItemLimit','practiceGenerationLimit','relearningGenerationLimit','benchmarkGenerationLimit','hypothesisGenerationLimit','crossProjectTransferGenerationLimit','multiverseProjectVariantLimit'])must(errors,r3[key]===null,'RULE3_LIMIT_MUST_BE_NULL:'+key);
  must(errors,r3.signalGenerationAlwaysOn===true,'RULE3_SIGNAL_GENERATION_ALWAYS_ON');
  must(errors,r3.everyNewVerifiedOrFailedResultGeneratesNextLearningCandidate===true,'RULE3_RESULT_GENERATES_SIGNAL');
  must(errors,r3.executionResourceBoundedSignalExistenceUnbounded===true,'RULE3_RESOURCE_BOUND_SIGNAL_UNBOUNDED');
  must(errors,r3.authorityExpansion===false&&r3.gateWeakening===false,'RULE3_AUTHORITY_GATE_INVARIANT');
  must(errors,exists('tools/vibe2-learning-motor.mjs'),'RULE3_LEARNING_MOTOR_MISSING');

  const r4=owner.rule4||{};
  must(errors,r4.enabled===true&&r4.id==='RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION','RULE4_ID_ENABLEMENT');
  must(errors,r4.completionIsCheckpointNotStop===true,'RULE4_COMPLETION_NOT_STOP');
  must(errors,r4.failureBehavior==='ROLLBACK_OR_REQUEUE_EXACT_FAILURE_STAGE_AND_CONTINUE_LEARNING','RULE4_FAILURE_CONTINUES');
  const inv=r4.invariants||{};
  for(const key of ['authorityExpansion','qaGateWeakening','securityGateWeakening','releaseGateBypass','directMainWrite'])must(errors,inv[key]===false,'RULE4_FORBIDDEN:'+key);
  must(errors,inv.fabricatedPassForbidden===true&&inv.verifiedLearningDeletionForbidden===true,'RULE4_EVIDENCE_PROTECTION');
  must(errors,r4.neuralExpansion?.autonomousAuthorityExpansion===false,'RULE4_NEURAL_AUTHORITY_EXPANSION_FORBIDDEN');
  must(errors,r4.neuralExpansion?.ungatedAutomaticActivationForbidden===true,'RULE4_UNGATED_ACTIVATION_FORBIDDEN');

  const workflow=readText('.github/workflows/vibe2-24h-runner.yml');
  must(errors,/name:\s*Vibe2 24H Runner/.test(workflow),'RULE1_24H_WORKFLOW_MISSING');
  must(errors,/\n\s*refill:\n[\s\S]*?if:\s*\$\{\{\s*always\(\)\s*\}\}/.test(workflow),'RULE1_REFILL_NOT_UNCONDITIONAL');
  must(errors,workflow.includes('company-constitution-enforcer.mjs'),'CONSTITUTION_24H_ENFORCER_NOT_WIRED');

  const core=readText('.github/workflows/vibe2-continuous-core.yml');
  must(errors,core.includes('company-constitution-enforcer.mjs'),'CONSTITUTION_CONTINUOUS_ENFORCER_NOT_WIRED');
  must(errors,core.includes('VIBE2_BASE_MAIN_SHA: ${{ needs.reserve.outputs.contract_sha }}'),'CONSTITUTION_PINNED_WORK_CONTRACT_SHA');

  return{pass:errors.length===0,phase,errors,constitutionFingerprint:constitution.fingerprint,orderedRuleIds:constitution.orderedRuleIds};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=Object.fromEntries(process.argv.slice(2).filter(v=>v.startsWith('--')).map(raw=>{const [k,...rest]=raw.slice(2).split('=');return[k,rest.join('=')||true];}));
  const policy=args.policy?readJson(args.policy):null;
  const result=enforceConstitution({policy,phase:clean(args.phase)||'runtime'});
  if(!result.pass)fail(result.errors,result.phase);
  console.log('CONSTITUTION_ENFORCEMENT=PASS');
  console.log('CONSTITUTION_PHASE='+result.phase);
  console.log('CONSTITUTION_FINGERPRINT='+result.constitutionFingerprint);
  console.log('CONSTITUTION_RULES='+result.orderedRuleIds.join('>'));
}
