import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { distillExternalAiKnowledge, validateExternalAiCandidate, isTrustedDistilledExternalAiEntry } from '../tools/vibe2-external-ai-distillation.mjs';
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


test('seeded advanced coding graphics rig material and vfx knowledge stays verified advisory-only',()=>{
  const store=JSON.parse(fs.readFileSync('.vibe2/external-ai-distilled-knowledge.json','utf8'));
  const required=[
    'external-ai-distilled:openai-advanced-coding-v1',
    'external-ai-distilled:openai-visual-aesthetic-v1',
    'external-ai-distilled:openai-rig-joint-motion-v1',
    'external-ai-distilled:openai-material-lighting-v1',
    'external-ai-distilled:openai-vfx-camera-readability-v1',
    'external-ai-distilled:openai-roblox-cloud-coding-v1',
    'external-ai-distilled:openai-roblox-production-systems-v2'
  ];
  for(const id of required){
    const row=store.entries.find(item=>item.id===id);
    assert.ok(row,id);
    assert.equal(isTrustedDistilledExternalAiEntry(row),true,id);
    assert.equal(row.rawOutputStored,false,id);
    assert.equal(row.directSourceWrite,false,id);
    assert.equal(row.directProductionPass,false,id);
    assert.equal(row.directMasteryCredit,false,id);
    assert.equal(row.directTrainingSample,false,id);
    assert.equal(row.verification.method,'source-backed-review',id);
    assert.ok(row.verification.evidence.length>=2,id);
    assert.ok(row.patterns.length>=6,id);
  }
});
