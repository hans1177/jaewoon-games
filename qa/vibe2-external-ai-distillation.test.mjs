import test from 'node:test';
import assert from 'node:assert/strict';
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
    evidence:['qa:external-ai-claim-reproduced']
  }
};

test('external AI raw output cannot be promoted directly',()=>{
  const check=validateExternalAiCandidate({...verifiedCandidate,rawOutput:'verbatim model answer'});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('RAW_EXTERNAL_AI_OUTPUT_MUST_NOT_BE_PERSISTED'));
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
