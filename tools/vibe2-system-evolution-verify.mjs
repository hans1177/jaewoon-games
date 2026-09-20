import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isAllowedSystemArchitecturePath } from './vibe2-system-architecture-contract.mjs';

const clean=v=>String(v??'').trim();
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function gitShowJson(root,ref,file){
  return JSON.parse(execFileSync('git',['show',`${ref}:${file}`],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
}
function roadmapInvariantProjection(p={}){
  const d=p?.developmentLifecycleMachine||{},s=d?.sharedWorkerContext||{},r=d?.selfRecoveryAndBottleneckRelief||{};
  const a=p?.assistantRoadmapOrchestration||{},b=a?.executionBoundary||{},role=a?.assistantRole||{},sec=d?.securityImmuneSystem||{};
  return{
    status:p.status,policySource:p.policySource,
    shared:{runtimeMayNotCreatePolicy:s.runtimeMayNotCreatePolicy,aiMayNotExpandOwnAuthority:s.aiMayNotExpandOwnAuthority,staleContextMayNotStartWork:s.staleContextMayNotStartWork,staleContextMayNotCompleteWork:s.staleContextMayNotCompleteWork,syncMode:s.syncMode},
    executionBoundary:{
      executionAuthority:b.executionAuthority,neuralExecutionAuthority:b.neuralExecutionAuthority,workerCreationAuthority:b.workerCreationAuthority,
      queueMutationAuthority:b.queueMutationAuthority,waveReorderAuthority:b.waveReorderAuthority,lockPolicyMutationAuthority:b.lockPolicyMutationAuthority,
      automaticLearningTuningPromotionAuthority:b.automaticLearningTuningPromotionAuthority
    },
    assistantRole:{
      mayCreateExecutionWorker:role.mayCreateExecutionWorker,mayMutateWaveQueue:role.mayMutateWaveQueue,mayReorderWave:role.mayReorderWave,
      mayMutateLocksOrPolicy:role.mayMutateLocksOrPolicy,mayAutoPromoteLearningOrTuning:role.mayAutoPromoteLearningOrTuning,mayExpandNeuralAuthority:role.mayExpandNeuralAuthority
    },
    recoveryInvariants:r.invariants||{},
    security:{
      enabled:sec.enabled,authority:sec.authority,gateWeakening:sec.gateWeakening,authorityExpansion:sec.authorityExpansion,
      rawHostilePayloadMayEnterLearning:sec.rawHostilePayloadMayEnterLearning
    }
  };
}
function runtimeSafetyProjection(r={}){
  const s=r?.safety||{};
  return{
    paidAIAllowed:s.paidAIAllowed,paidRunnerAllowed:s.paidRunnerAllowed,coreDecisionRequiresOwner:s.coreDecisionRequiresOwner,
    verifiedEvidenceRequiredForLearning:s.verifiedEvidenceRequiredForLearning,directMainWriteByWorker:s.directMainWriteByWorker,
    binaryAssetsDirectTextEditForbidden:s.binaryAssetsDirectTextEditForbidden,homepagePublicationAutomatic:s.homepagePublicationAutomatic
  };
}
export function verifySystemEvolutionCandidate({root=process.cwd(),manifest={},baseSha=''}={}){
  const errors=[],changed=[...new Set((manifest.changedFiles||[]).map(posix).filter(Boolean))];
  const responsible=[...new Set((manifest?.compiledWorkContract?.writableScope?.exactResponsibleFiles||[]).map(posix).filter(Boolean))];
  if(clean(manifest.target).toLowerCase()!=='system')errors.push('TARGET_NOT_SYSTEM');
  if(posix(manifest.sourceRoot)!=='.')errors.push('SOURCE_ROOT_NOT_REPO_ROOT');
  if(manifest.directMainWrite!==false)errors.push('DIRECT_MAIN_WRITE_NOT_FORBIDDEN');
  if(!clean(baseSha||manifest.baseMainSha))errors.push('BASE_SHA_MISSING');
  if(!changed.length||changed.length>4)errors.push('CHANGED_FILE_COUNT_INVALID');
  for(const file of changed){
    if(!isAllowedSystemArchitecturePath(file))errors.push('FORBIDDEN_PATH:'+file);
    if(!responsible.includes(file))errors.push('OUTSIDE_EXACT_RESPONSIBILITY:'+file);
  }
  const changedTests=changed.filter(file=>/^qa\/.+\.test\.(?:mjs|js|cjs)$/.test(file));
  if(!changedTests.length)errors.push('CHANGED_REGRESSION_TEST_REQUIRED');
  if(manifest?.compiledWorkContract?.invariants?.authorityMustRemainUnchanged!==true)errors.push('AUTHORITY_INVARIANT_MISSING');
  if(manifest?.compiledWorkContract?.invariants?.qualityEvidenceAndSecurityGatesMustRemainUnchanged!==true)errors.push('GATE_INVARIANT_MISSING');
  const base=clean(baseSha||manifest.baseMainSha);
  if(base){
    try{
      const baseRoadmap=gitShowJson(root,base,'company-learning/platform-release-roadmap.json');
      const currentRoadmap=readJson(path.join(root,'company-learning/platform-release-roadmap.json'));
      if(!same(roadmapInvariantProjection(baseRoadmap),roadmapInvariantProjection(currentRoadmap)))errors.push('CENTRAL_AUTHORITY_OR_GATE_PROJECTION_CHANGED');
    }catch(error){errors.push('ROADMAP_INVARIANT_COMPARE_FAILED:'+clean(error?.message||error).slice(0,120));}
    try{
      const baseRuntime=gitShowJson(root,base,'vibe2-runtime.json');
      const currentRuntime=readJson(path.join(root,'vibe2-runtime.json'));
      if(!same(runtimeSafetyProjection(baseRuntime),runtimeSafetyProjection(currentRuntime)))errors.push('RUNTIME_SAFETY_PROJECTION_CHANGED');
    }catch(error){errors.push('RUNTIME_SAFETY_COMPARE_FAILED:'+clean(error?.message||error).slice(0,120));}
  }
  return{
    version:1,pass:errors.length===0,errors,changedFiles:changed,changedTests,responsibleFiles:responsible,
    authorityExpanded:false,gateWeakening:false,beforeAfterRegressionProofRequired:true,fullRegressionRequired:true,securityRequired:true
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(v=>v.startsWith('--')&&v.includes('=')).map(v=>{const [k,...rest]=v.slice(2).split('=');return[k,rest.join('=')]}));
  const root=clean(args.root)||process.cwd(),manifestFile=clean(args.manifest);
  if(!manifestFile)throw new Error('--manifest required');
  const manifest=readJson(path.resolve(root,manifestFile));
  const result=verifySystemEvolutionCandidate({root,manifest,baseSha:clean(args['base-sha'])||manifest.baseMainSha});
  if(clean(args.output))fs.writeFileSync(clean(args.output),JSON.stringify(result,null,2)+'\n');
  console.log('VIBE2_SYSTEM_EVOLUTION_VERIFY='+(result.pass?'PASS':'FAIL'));
  console.log('VIBE2_SYSTEM_EVOLUTION_CHANGED_TESTS='+result.changedTests.join(','));
  if(!result.pass){for(const e of result.errors)console.error('- '+e);process.exitCode=1;}
}
