import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export const RULE5_ID='RULE_5_ARCHITECTURE_ATOMIZATION_NEURONIZATION_AND_CENTRAL_CODE_CONSISTENCY';

export function validateArchitectureNeuronConsistency({
  repoRoot=process.cwd(),
  roadmap=null,
  architecture=null,
  checkFiles=true
}={}){
  const roadmapPath=path.join(repoRoot,'company-learning','platform-release-roadmap.json');
  const architecturePath=path.join(repoRoot,'company-learning','company-architecture-map.json');
  const r=roadmap||readJson(roadmapPath);
  const a=architecture||readJson(architecturePath);
  const blockers=[];
  const rules=r?.ownerCanonicalRules||{};
  const rule=rules?.rule5||{};
  const projection=a?.rule5ArchitectureNeuronConsistency||{};

  if(rule.id!==RULE5_ID)blockers.push('RULE5_CENTRAL_ID_MISSING_OR_MISMATCH');
  if(rule.enabled!==true)blockers.push('RULE5_NOT_ENABLED');
  if(!same(rules.implementationOrder,['RULE_1','RULE_2','RULE_3','RULE_4','RULE_5']))blockers.push('RULE5_OWNER_ORDER_MISMATCH');
  if(rules.orderedImplementationRequired!==true)blockers.push('RULE5_ORDERED_GATE_NOT_REQUIRED');

  if(projection.centralRulePath!=='company-learning/platform-release-roadmap.json#ownerCanonicalRules.rule5')blockers.push('RULE5_ARCHITECTURE_CENTRAL_PATH_MISMATCH');
  if(projection.appliesToStructuralChanges!==true)blockers.push('RULE5_ARCHITECTURE_SCOPE_MISSING');
  if(projection.mismatchAction!=='BLOCK_COMPLETION_AND_REQUEUE_EXACT_STRUCTURAL_STAGE')blockers.push('RULE5_MISMATCH_ACTION_MISMATCH');

  const centralTypes=uniq(rule?.neuronizationContract?.canonicalNeuronTypes);
  const architectureTypes=uniq(projection?.neuronSchema?.canonicalTypes);
  const brainTypes=Object.keys(r?.neuralDevelopmentBrain?.neuronTypes||{});
  if(!centralTypes.length)blockers.push('RULE5_CENTRAL_NEURON_TYPES_EMPTY');
  if(!same(centralTypes,architectureTypes))blockers.push('RULE5_CENTRAL_ARCHITECTURE_NEURON_TYPES_MISMATCH');
  if(!same(centralTypes,brainTypes))blockers.push('RULE5_CENTRAL_BRAIN_NEURON_TYPES_MISMATCH');

  const requiredAtomicFields=uniq(rule?.atomicArchitectureContract?.requiredFields);
  const architectureAtomicFields=uniq(projection?.atomicNodeSchema?.required);
  if(!same(requiredAtomicFields,architectureAtomicFields))blockers.push('RULE5_ATOMIC_NODE_SCHEMA_MISMATCH');

  const bindings=rule?.codeBindings||{};
  const expected={
    consistencyValidator:'tools/vibe2-architecture-neuron-consistency.mjs',
    systemArchitectureContract:'tools/vibe2-system-architecture-contract.mjs',
    selfArchitectureEvolution:'tools/vibe2-self-architecture-evolution.mjs',
    centralPolicyQa:'.github/workflows/company-central-policy-contract-qa.yml',
    rule5Test:'qa/vibe2-owner-rule5-architecture-neuron-consistency.test.mjs'
  };
  for(const [key,value] of Object.entries(expected)){
    if(clean(bindings[key])!==value)blockers.push('RULE5_CODE_BINDING_MISMATCH:'+key);
  }

  const triangle=projection?.consistencyTriangle||{};
  const codeSet=new Set(uniq(triangle.code));
  const testSet=new Set(uniq(triangle.tests));
  for(const value of [expected.consistencyValidator,expected.systemArchitectureContract,expected.selfArchitectureEvolution]){
    if(!codeSet.has(value))blockers.push('RULE5_ARCHITECTURE_CODE_PROJECTION_MISSING:'+value);
  }
  if(!testSet.has(expected.rule5Test))blockers.push('RULE5_ARCHITECTURE_TEST_PROJECTION_MISSING:'+expected.rule5Test);
  if(clean(triangle.workflow)!==expected.centralPolicyQa)blockers.push('RULE5_ARCHITECTURE_WORKFLOW_PROJECTION_MISMATCH');

  if(rule?.atomicArchitectureContract?.duplicateShadowNodeForbidden!==true)blockers.push('RULE5_SHADOW_NODE_GUARD_MISSING');
  if(rule?.neuronizationContract?.everyAtomicNodeMustDeclareNeuronType!==true)blockers.push('RULE5_NEURON_TYPE_REQUIRED_GUARD_MISSING');
  if(rule?.consistencyContract?.activationWhenMismatchForbidden!==true)blockers.push('RULE5_ACTIVATION_MISMATCH_GUARD_MISSING');
  if(rule?.structuralChangeGate?.mismatchBlocksAdoption!==true)blockers.push('RULE5_ADOPTION_MISMATCH_GUARD_MISSING');
  if(rule?.orderedPosition?.rule5AddsNoNewExecutionAuthority!==true)blockers.push('RULE5_AUTHORITY_INVARIANT_MISSING');

  if(checkFiles){
    const listed=[
      expected.consistencyValidator,
      expected.systemArchitectureContract,
      expected.selfArchitectureEvolution,
      expected.centralPolicyQa,
      expected.rule5Test,
      ...(triangle.tests||[])
    ];
    for(const rel of uniq(listed)){
      if(!fs.existsSync(path.join(repoRoot,rel)))blockers.push('RULE5_BOUND_PATH_MISSING:'+rel);
    }
    const evolution=fs.existsSync(path.join(repoRoot,expected.selfArchitectureEvolution))
      ?fs.readFileSync(path.join(repoRoot,expected.selfArchitectureEvolution),'utf8'):'';
    const contract=fs.existsSync(path.join(repoRoot,expected.systemArchitectureContract))
      ?fs.readFileSync(path.join(repoRoot,expected.systemArchitectureContract),'utf8'):'';
    for(const marker of [
      'architecture-rule5-atomization-required:YES',
      'architecture-rule5-neuronization-required:YES',
      'architecture-rule5-central-code-sync-required:YES'
    ]) if(!evolution.includes(marker))blockers.push('RULE5_EVOLUTION_MARKER_MISSING:'+marker);
    for(const token of [
      'SYSTEM_ARCHITECTURE_RULE5_ATOMIZATION_REQUIRED',
      'SYSTEM_ARCHITECTURE_RULE5_NEURONIZATION_REQUIRED',
      'SYSTEM_ARCHITECTURE_RULE5_CENTRAL_CODE_SYNC_REQUIRED'
    ]) if(!contract.includes(token))blockers.push('RULE5_SYSTEM_CONTRACT_GUARD_MISSING:'+token);
  }

  return Object.freeze({
    version:1,
    ruleId:RULE5_ID,
    pass:blockers.length===0,
    blockers:Object.freeze(blockers),
    centralPolicyVersion:Number(r?.version||0),
    architectureVersion:Number(a?.version||0),
    neuronTypes:Object.freeze(centralTypes),
    atomicFields:Object.freeze(requiredAtomicFields),
    activationAllowed:blockers.length===0,
    authorityExpanded:false
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=validateArchitectureNeuronConsistency({repoRoot:process.cwd(),checkFiles:true});
  console.log('RULE5_ARCHITECTURE_NEURON_CONSISTENCY='+(result.pass?'PASS':'FAIL'));
  console.log('RULE5_CENTRAL_POLICY_VERSION='+result.centralPolicyVersion);
  console.log('RULE5_ARCHITECTURE_VERSION='+result.architectureVersion);
  console.log('RULE5_NEURON_TYPES='+result.neuronTypes.join(','));
  if(!result.pass){
    console.error('RULE5_BLOCKERS='+result.blockers.join('|'));
    process.exitCode=1;
  }
}
