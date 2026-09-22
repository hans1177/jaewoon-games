// 파일명: qa/company-constitution-enforcer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policy=JSON.parse(fs.readFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),'utf8'));
const clone=value=>structuredClone(value);
const run=p=>enforceConstitution({policy:p,root,phase:'test'});

test('all canonical constitutional rules are executable and current repository passes',()=>{
  const result=run(policy);
  assert.equal(result.pass,true,result.errors.join('\n'));
  assert.deepEqual(result.orderedRuleIds.slice(0,4),[
    'RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT',
    'RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION',
    'RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE',
    'RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION'
  ]);
});

test('rule1 cannot regain a global terminal stop state',()=>{
  const p=clone(policy);
  p.ownerCanonicalRules.rule1.global24hStopForbidden=false;
  p.ownerCanonicalRules.rule1.ownerMayStopGlobal24h=true;
  const result=run(p);
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('RULE1_GLOBAL_24H_STOP_FORBIDDEN'));
  assert.ok(result.errors.includes('RULE1_GLOBAL_OWNER_STOP_FORBIDDEN'));
});

test('rule2 rejects weakened external AI security capture',()=>{
  const p=clone(policy);
  p.ownerCanonicalRules.rule2.rawExternalAiOutputStored=true;
  p.ownerCanonicalRules.rule2.securityStewardMonitorsBeforeAcceptance=false;
  const result=run(p);
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('RULE2_RAW_OUTPUT_FORBIDDEN'));
  assert.ok(result.errors.includes('RULE2_SECURITY_STEWARD_REQUIRED'));
});

test('rule3 keeps learning signal generation unbounded by policy',()=>{
  const p=clone(policy);
  p.ownerCanonicalRules.rule3.totalLearningSignalLimit=100;
  p.ownerCanonicalRules.rule3.signalGenerationAlwaysOn=false;
  const result=run(p);
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('RULE3_LIMIT_MUST_BE_NULL:totalLearningSignalLimit'));
  assert.ok(result.errors.includes('RULE3_SIGNAL_GENERATION_ALWAYS_ON'));
});

test('rule4 cannot weaken QA security release or authority invariants',()=>{
  const p=clone(policy);
  p.ownerCanonicalRules.rule4.invariants.qaGateWeakening=true;
  p.ownerCanonicalRules.rule4.invariants.directMainWrite=true;
  p.ownerCanonicalRules.rule4.neuralExpansion.autonomousAuthorityExpansion=true;
  const result=run(p);
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('RULE4_FORBIDDEN:qaGateWeakening'));
  assert.ok(result.errors.includes('RULE4_FORBIDDEN:directMainWrite'));
  assert.ok(result.errors.includes('RULE4_NEURAL_AUTHORITY_EXPANSION_FORBIDDEN'));
});

test('future enabled canonical rules auto-bind without replacing rules 1 through 4',()=>{
  const p=clone(policy);
  p.ownerCanonicalRules.rule5={
    id:'RULE_5_TEST_FUTURE_BINDING',
    label:'제5규칙',
    enabled:true,
    authority:'OWNER_DIRECTIVE_TEST',
    objective:'TEST_ONLY'
  };
  const result=run(p);
  assert.equal(result.pass,true,result.errors.join('\n'));
  assert.equal(result.orderedRuleIds.at(-1),'RULE_5_TEST_FUTURE_BINDING');
});
