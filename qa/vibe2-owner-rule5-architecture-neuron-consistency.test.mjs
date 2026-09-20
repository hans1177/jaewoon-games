import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RULE5_ID,validateArchitectureNeuronConsistency} from '../tools/vibe2-architecture-neuron-consistency.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roadmap=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/platform-release-roadmap.json'),'utf8'));
const architecture=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/company-architecture-map.json'),'utf8'));

test('owner rule 5 is canonical final consistency closure after rule 4',()=>{
  const rules=roadmap.ownerCanonicalRules;
  assert.deepEqual(rules.implementationOrder,['RULE_1','RULE_2','RULE_3','RULE_4','RULE_5']);
  assert.equal(rules.orderedImplementationRequired,true);
  const rule=rules.rule5;
  assert.equal(rule.id,RULE5_ID);
  assert.equal(rule.enabled,true);
  assert.equal(rule.orderedPosition.after,'RULE_4');
  assert.equal(rule.orderedPosition.role,'FINAL_NON_AUTHORITY_CONSISTENCY_CLOSURE');
  assert.equal(rule.orderedPosition.rule4RemainsLastMutatingNeuralExpansionStage,true);
  assert.equal(rule.orderedPosition.rule5AddsNoNewExecutionAuthority,true);
  assert.equal(rule.structuralChangeGate.mismatchBlocksAdoption,true);
  assert.equal(rule.consistencyContract.activationWhenMismatchForbidden,true);
  assert.equal(rule.consistencyContract.runtimeMayNotInventMissingPolicy,true);
  assert.equal(rule.invariants.authorityExpansion,false);
  assert.equal(rule.invariants.qaGateWeakening,false);
  assert.equal(rule.invariants.securityGateWeakening,false);
});

test('rule 5 atomic architecture and neuron schema are projected identically into architecture map',()=>{
  const rule=roadmap.ownerCanonicalRules.rule5;
  const projection=architecture.rule5ArchitectureNeuronConsistency;
  assert.deepEqual(projection.atomicNodeSchema.required,rule.atomicArchitectureContract.requiredFields);
  assert.deepEqual(projection.neuronSchema.canonicalTypes,rule.neuronizationContract.canonicalNeuronTypes);
  assert.deepEqual(Object.keys(roadmap.neuralDevelopmentBrain.neuronTypes),rule.neuronizationContract.canonicalNeuronTypes);
  assert.equal(projection.atomicNodeSchema.oneResponsibilityOneCausalPurpose,true);
  assert.equal(projection.atomicNodeSchema.duplicateShadowNodeForbidden,true);
  assert.equal(projection.neuronSchema.everyNodeTyped,true);
  assert.equal(projection.neuronSchema.edgeMeaningRequired,true);
  assert.equal(projection.neuronSchema.authorityExpansion,false);
  assert.equal(architecture.vibeSelfArchitectureEvolution.rule5ClosureRequired,true);
  assert.ok(architecture.executionTopology.architectureNeuronConsistency.includes('CONSISTENCY_VALIDATION'));
});

test('rule 5 validator verifies central architecture code and tests as one consistency triangle',()=>{
  const result=validateArchitectureNeuronConsistency({repoRoot});
  assert.equal(result.pass,true,result.blockers.join('|'));
  assert.equal(result.activationAllowed,true);
  assert.equal(result.authorityExpanded,false);
  assert.deepEqual(result.neuronTypes,roadmap.ownerCanonicalRules.rule5.neuronizationContract.canonicalNeuronTypes);
});

test('rule 5 validator blocks neuron schema drift',()=>{
  const drift=structuredClone(architecture);
  drift.rule5ArchitectureNeuronConsistency.neuronSchema.canonicalTypes=[
    ...drift.rule5ArchitectureNeuronConsistency.neuronSchema.canonicalTypes,
    'PHANTOM'
  ];
  const result=validateArchitectureNeuronConsistency({repoRoot,roadmap,architecture:drift,checkFiles:false});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('RULE5_CENTRAL_ARCHITECTURE_NEURON_TYPES_MISMATCH'));
  assert.equal(result.activationAllowed,false);
});
