import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { distillExternalAiKnowledge, validateExternalAiCandidate, isTrustedDistilledExternalAiEntry, mergeVerifiedExternalAiKnowledgeStores, validateExternalAiMainPromotion } from '../tools/vibe2-external-ai-distillation.mjs';
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
    'external-ai-distilled:openai-roblox-engine-systems-v2'
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


test('animal insect graphics distillation stays advisory-only and independently verified',()=>{
  const store=JSON.parse(fs.readFileSync('.vibe2/external-ai-distilled-knowledge.json','utf8'));
  const required=[
    'external-ai-distilled:openai-insect-morphology-surface-v1',
    'external-ai-distilled:openai-mammal-fur-anatomy-v1',
    'external-ai-distilled:openai-reptile-amphibian-surface-v1',
    'external-ai-distilled:openai-bird-feather-wing-v1',
    'external-ai-distilled:openai-aquatic-animal-surface-motion-v1'
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
    assert.ok(row.patterns.length>=8,id);
    assert.ok(row.verification.evidence.length>=2,id);
  }
});


test('verified distilled main promotion accepts trusted append across learning domains',()=>{
  const base=distillExternalAiKnowledge({records:[verifiedCandidate]},{entries:[]}).knowledge;
  const incoming=distillExternalAiKnowledge({records:[{
    ...verifiedCandidate,
    id:'cross-domain-learning',
    domains:['security','vfx','camera_language','roblox_replication'],
    distilledPatterns:['verified cross-domain lesson remains advisory and task relevant']
  }]},base).knowledge;
  const gate=validateExternalAiMainPromotion({
    baseKnowledge:base,
    candidateKnowledge:incoming,
    changedFiles:['.vibe2/external-ai-distilled-knowledge.json']
  });
  assert.equal(gate.pass,true,gate.reasons.join('|'));
  assert.equal(gate.newEntryIds.length,1);
  assert.ok(gate.domains.includes('SECURITY'));
  assert.ok(gate.domains.includes('VFX'));
  assert.ok(gate.domains.includes('CAMERA_LANGUAGE'));
  assert.ok(gate.domains.includes('ROBLOX_REPLICATION'));
  assert.equal(gate.allLearningDomainsEligible,true);
  assert.equal(gate.directMainWrite,false);
  assert.equal(gate.prMergeOnly,true);
});

test('verified distilled store merge preserves canonical main entries and adds trusted new entries only',()=>{
  const base=distillExternalAiKnowledge({records:[verifiedCandidate]},{entries:[]}).knowledge;
  const incoming=distillExternalAiKnowledge({records:[{
    ...verifiedCandidate,
    id:'new-verified-lesson',
    domains:['asset_production'],
    distilledPatterns:['new verified asset lesson']
  }]},base).knowledge;
  incoming.entries[0]={...incoming.entries[0],patterns:['attempted mutation that must not replace main']};
  const merged=mergeVerifiedExternalAiKnowledgeStores({baseKnowledge:base,incomingKnowledge:incoming});
  assert.deepEqual(merged.knowledge.entries[0],base.entries[0]);
  assert.deepEqual(merged.addedEntryIds,['external-ai-distilled:new-verified-lesson']);
});

test('verified distilled main promotion blocks canonical mutation deletion and unrelated file changes',()=>{
  const base=distillExternalAiKnowledge({records:[verifiedCandidate]},{entries:[]}).knowledge;
  const withNew=distillExternalAiKnowledge({records:[{
    ...verifiedCandidate,
    id:'safe-new-lesson',
    domains:['debugging'],
    distilledPatterns:['safe verified repair lesson']
  }]},base).knowledge;

  const mutated=structuredClone(withNew);
  mutated.entries[0].patterns=['mutated existing canonical knowledge'];
  const mutationGate=validateExternalAiMainPromotion({
    baseKnowledge:base,
    candidateKnowledge:mutated,
    changedFiles:['.vibe2/external-ai-distilled-knowledge.json']
  });
  assert.equal(mutationGate.pass,false);
  assert.ok(mutationGate.reasons.includes('EXISTING_VERIFIED_KNOWLEDGE_MUTATION_OR_DELETION_FORBIDDEN'));

  const deleted=structuredClone(withNew);
  deleted.entries=deleted.entries.filter(row=>row.id!=='external-ai-distilled:combat-ui-lesson');
  const deletionGate=validateExternalAiMainPromotion({
    baseKnowledge:base,
    candidateKnowledge:deleted,
    changedFiles:['.vibe2/external-ai-distilled-knowledge.json']
  });
  assert.equal(deletionGate.pass,false);
  assert.ok(deletionGate.reasons.includes('EXISTING_VERIFIED_KNOWLEDGE_MUTATION_OR_DELETION_FORBIDDEN'));

  const pathGate=validateExternalAiMainPromotion({
    baseKnowledge:base,
    candidateKnowledge:withNew,
    changedFiles:['.vibe2/external-ai-distilled-knowledge.json','tools/vibe2-learning-motor.mjs']
  });
  assert.equal(pathGate.pass,false);
  assert.ok(pathGate.reasons.includes('PROMOTION_FILE_NOT_ALLOWED:tools/vibe2-learning-motor.mjs'));
});
