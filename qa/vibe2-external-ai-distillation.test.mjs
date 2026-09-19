import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { distillExternalAiKnowledge, validateExternalAiCandidate } from '../tools/vibe2-external-ai-distillation.mjs';
import { collectMultiSourceLearningMaterials } from '../tools/vibe2-multisource-learning-collector.mjs';

const verifiedCandidate={
  id:'combat-ui-lesson',
  sourceKind:'external-ai',
  provider:'external-provider',
  model:'external-model',
  rawOutputSha256:'a'.repeat(64),
  engine:'cross-engine',
  domains:['combat','ui'],
  distilledPatterns:['combat hit feedback should be state-driven and visible in UI'],
  cautions:['do not copy game-specific damage values'],
  sourceWrite:false,
  productionPass:false,
  authorityExpanded:false,
  verification:{
    independent:true,
    status:'PASS',
    method:'independent-qa',
    evidence:['qa:external-ai-claim-reproduced','source:independent-pattern-review']
  }
};

test('external AI raw output cannot be promoted directly',()=>{
  const check=validateExternalAiCandidate({...verifiedCandidate,rawOutput:'verbatim model answer'});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('RAW_EXTERNAL_AI_OUTPUT_MUST_NOT_BE_PERSISTED'));
});

test('external AI candidate rejects non-traceable verification evidence',()=>{
  const check=validateExternalAiCandidate({
    ...verifiedCandidate,
    verification:{independent:true,status:'PASS',method:'independent-qa',evidence:['looks-good']}
  });
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('VERIFICATION_EVIDENCE_NOT_TRACEABLE'));
});

test('external AI candidate requires at least two traceable verification evidence items',()=>{
  const check=validateExternalAiCandidate({
    ...verifiedCandidate,
    verification:{independent:true,status:'PASS',method:'independent-qa',evidence:['qa:single-check']}
  });
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('VERIFICATION_EVIDENCE_MINIMUM_NOT_MET'));
  assert.ok(check.reasons.includes('VERIFICATION_EVIDENCE_NOT_TRACEABLE'));
});

test('external AI candidate requires independent verification evidence',()=>{
  const check=validateExternalAiCandidate({...verifiedCandidate,verification:{independent:false,status:'PASS',method:'independent-qa',evidence:[]}});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('INDEPENDENT_VERIFICATION_REQUIRED'));
  assert.ok(check.reasons.includes('VERIFICATION_EVIDENCE_REQUIRED'));
});

test('verified external AI knowledge is stored as distilled advisory metadata only',()=>{
  const result=distillExternalAiKnowledge({records:[verifiedCandidate]},{entries:[]});
  assert.equal(result.accepted.length,1);
  assert.equal(result.rejected.length,0);
  const row=result.knowledge.entries[0];
  assert.equal(row.sourceKind,'external-ai-distilled');
  assert.equal(row.verified,true);
  assert.equal(row.independentlyVerified,true);
  assert.equal(row.advisoryOnly,true);
  assert.equal(row.rawOutputStored,false);
  assert.equal(row.directDevelopmentUse,false);
  assert.equal(row.directSourceWrite,false);
  assert.equal(row.directProductionPass,false);
  assert.equal(row.directMasteryCredit,false);
  assert.equal(row.directTrainingSample,false);
  assert.equal(row.authorityExpanded,false);
  assert.equal('rawOutput' in row,false);
  assert.equal('rawText' in row,false);
});

test('planner material collector uses only independently verified distilled external AI knowledge',()=>{
  const accepted=distillExternalAiKnowledge({records:[verifiedCandidate]},{entries:[]}).knowledge;
  const rejectedLike={
    version:1,
    entries:[{
      ...accepted.entries[0],
      id:'external-ai-distilled:bad',
      independentlyVerified:false
    }]
  };
  const good=collectMultiSourceLearningMaterials({
    externalAiInput:accepted,
    task:{target:'roblox',goal:'combat hit UI feedback'}
  });
  assert.equal(good.materials.length,1);
  assert.equal(good.materials[0].sourceType,'external-ai-distilled-verified');
  assert.equal(good.rawSourceIncluded,false);
  assert.equal(good.rawGameplayValuesIncluded,false);
  assert.equal(good.authorityExpanded,false);

  const bad=collectMultiSourceLearningMaterials({
    externalAiInput:rejectedLike,
    task:{target:'roblox',goal:'combat hit UI feedback'}
  });
  assert.equal(bad.materials.length,0);
});

test('distilled external AI never outranks internal verified material when capacity is limited',()=>{
  const accepted=distillExternalAiKnowledge({records:[verifiedCandidate]},{entries:[]}).knowledge;
  const result=collectMultiSourceLearningMaterials({
    experienceInput:{records:[{
      id:'internal-combat',
      verified:true,
      reusable:true,
      outcome:'PASS',
      engine:'roblox',
      gameId:'demo',
      problem:'combat hit feedback',
      goal:'combat UI',
      reusablePatterns:['combat hit feedback should be state-driven']
    }]},
    externalAiInput:accepted,
    task:{target:'roblox',goal:'combat hit UI feedback'},
    maxMaterials:1
  });
  assert.equal(result.materials.length,1);
  assert.notEqual(result.materials[0].sourceType,'external-ai-distilled-verified');
  assert.equal(result.materials[0].externalAdvisoryLast,false);
});


test('development workers stay on local Vibe runtime and external advisory AI cannot become a worker',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/external-ai-distillation-policy.json',import.meta.url),'utf8'));
  assert.equal(policy.modelRoleBoundary?.vibeDevelopmentExecution,'LOCAL_VIBE_RUNTIME_ONLY');
  assert.equal(policy.modelRoleBoundary?.externalAdvisoryAi,'DISTILLATION_ONLY');
  assert.equal(policy.modelRoleBoundary?.externalAdvisoryAiMayBeDevelopmentWorker,false);
  assert.equal(policy.modelRoleBoundary?.externalNetworkModelCallAllowedInDevelopmentWorkers,false);
  assert.equal(policy.modelRoleBoundary?.externalProviderCredentialsAllowedInDevelopmentWorkers,false);
  assert.equal(policy.modelRoleBoundary?.externalAiKnowledgeMayEnterOnlyThroughDistiller,true);
  assert.equal(policy.modelRoleBoundary?.localVibeRuntimeEndpoint,'127.0.0.1:11434');
  for(const relative of ['../tools/vibe2-source-worker.mjs','../tools/vibe2-learning-practice-worker.mjs']){
    const source=fs.readFileSync(new URL(relative,import.meta.url),'utf8');
    assert.match(source,/hostname:'127\.0\.0\.1'/);
    assert.match(source,/port:11434/);
    assert.doesNotMatch(source,/api\\.openai\\.com|api\\.anthropic\\.com|generativelanguage\\.googleapis\\.com|OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/i);
  }
});
