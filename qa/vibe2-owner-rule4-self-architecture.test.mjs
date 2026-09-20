// 파일명: qa/vibe2-owner-rule4-self-architecture.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {injectSelfArchitectureEvolutionTasks} from '../tools/vibe2-self-architecture-evolution.mjs';
import {assertSystemArchitectureTask} from '../tools/vibe2-system-architecture-contract.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roadmap=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/platform-release-roadmap.json'),'utf8'));
const releaseWorkflow=fs.readFileSync(path.join(repoRoot,'.github/workflows/vibe2-system-evolution-release.yml'),'utf8');

const failure=id=>({
  id,gameId:id,target:'web',department:'development',type:'implementation',
  goal:'source candidate structural failure',status:'failed',
  blocker:'source-candidate-generation-failed',recoveryGeneration:0,
  retryPolicy:'UNLIMITED_CAUSAL_REPAIR'
});

test('owner rules are canonically ordered one through four and neural expansion remains final-stage only',()=>{
  const rules=roadmap.ownerCanonicalRules;
  assert.deepEqual(rules.implementationOrder,['RULE_1','RULE_2','RULE_3','RULE_4']);
  assert.equal(rules.orderedImplementationRequired,true);
  const rule=rules.rule4;
  assert.equal(rule.id,'RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION');
  assert.equal(rule.architectureEvolutionGenerationLimit,null);
  assert.equal(rule.capabilityGrowthGenerationLimit,null);
  assert.equal(rule.currentNeuralExpansionAuthorization,'EVIDENCE_GATED_SELF_ACTIVATION');
  assert.equal(rule.neuralExpansion.phase,'LAST_STAGE_ONLY');
  assert.equal(rule.neuralExpansion.currentAuthorization,'EVIDENCE_GATED');
  assert.equal(rule.neuralExpansion.evidenceGatedSelfActivationAllowed,true);
  assert.equal(rule.neuralExpansion.ownerApprovalRequiredAfterPrerequisites,false);
  assert.equal(rule.neuralExpansion.ungatedAutomaticActivationForbidden,true);
  assert.equal(rule.neuralExpansion.internalNeuralStructureExpansionAllowed,true);
  assert.equal(rule.neuralExpansion.neuralExecutionAuthorityExpansionAllowed,false);
  assert.equal(rule.invariants.authorityExpansion,false);
  assert.equal(rule.invariants.qaGateWeakening,false);
  assert.equal(rule.invariants.securityGateWeakening,false);
});

test('self architecture evolution keeps neural expansion pending until readiness evidence passes',()=>{
  const result=injectSelfArchitectureEvolutionTasks({tasks:[failure('a'),failure('b'),failure('c')]},{});
  assert.equal(result.added.length,1);
  const task=result.added[0];
  const contract=assertSystemArchitectureTask(task);
  assert.equal(contract.valid,true);
  assert.equal(contract.systemConstructionAllowed,true);
  assert.equal(contract.neuralExpansionPhase,'LAST_STAGE_ONLY');
  assert.equal(contract.neuralExpansionMode,'EVIDENCE_GATED_SELF_EXPANSION');
  assert.equal(contract.neuralExpansionReadiness,'PENDING');
  assert.equal(contract.neuralExpansionAllowed,false);
  assert.ok(task.evidence.includes('architecture-neural-expansion-allowed:NO'));
  assert.ok(task.completionCriteria.includes('NEURAL_EXECUTION_AUTHORITY_UNCHANGED'));
});

test('Vibe self-authorizes internal neural expansion when final-stage readiness evidence is verified',()=>{
  const result=injectSelfArchitectureEvolutionTasks({tasks:[failure('a'),failure('b'),failure('c')]},{
    neuralExpansionReadiness:{
      source:'DIRECT_TARGETED_QA',pass:true,
      rule1QaPass:true,rule2QaPass:true,rule3QaPass:true,
      atomicNeuronFanInQaPass:true,sharedContextQaPass:true,securityQaPass:true,
      internalNeuralStructureExpansionAllowedWhenPass:true,
      neuralExecutionAuthorityExpansionAllowed:false,
      queueMutationAuthorityExpanded:false,
      workerCreationAuthorityExpanded:false,
      gateWeakeningAllowed:false
    }
  });
  assert.equal(result.neuralExpansionReadiness.pass,true);
  const task=result.added[0];
  const contract=assertSystemArchitectureTask(task);
  assert.equal(contract.neuralExpansionReadiness,'PASS');
  assert.equal(contract.neuralExpansionAllowed,true);
  assert.equal(contract.neuralExecutionAuthorityExpansionAllowed,false);
  assert.ok(task.evidence.includes('architecture-neural-expansion-allowed:YES'));
  assert.ok(task.completionCriteria.includes('NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_CAUSAL_PROOF'));
});

test('system evolution release retains full regression and security verification before adoption',()=>{
  assert.match(releaseWorkflow,/full regression|full Vibe regression|vibe2.*regression/i);
  assert.match(releaseWorkflow,/security/i);
  assert.match(releaseWorkflow,/candidate/i);
  assert.doesNotMatch(releaseWorkflow,/git push origin HEAD:main/);
});
