import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFormalWebLearningEvidence,
  buildFormalWebExperienceReview,
  ingestFormalWebExperiences
} from '../tools/vibe2-web-experience-ingest.mjs';

function validItem(){
  return {
    gameId:'g1',
    formalImplementationPassed:true,
    webValidationEvidencePath:'design/g1/web-gameplay-validation.json',
    webValidationSourceRevision:'a'.repeat(40),
    webStrictScore:94,
    strictImplementationVerdict:'PASS'
  };
}
function validReport(){
  return {
    gameId:'g1',
    pass:true,
    formalImplementationPassed:true,
    gameplayInteractionPerformed:true,
    interactionCount:12,
    stateChangeCount:18,
    approvedScopeFullyImplemented:true,
    scopeCoverage:{pass:true,mechanicBindings:['action-primary','action-secondary']},
    before:{functionalLabels:['배치','강화']},
    after:{functionalLabels:['배치','강화','웨이브 시작']},
    sourceRevision:'a'.repeat(40),
    webStrictScore:94,
    strictReview:{verdict:'PASS',totalScore:94,hardFailures:[]},
    contentDepthValidation:{validationMode:'REAL_ELAPSED_GAMEPLAY',pass:true,meaningfulGameplayMilliseconds:1800000,varietyEvents:['웨이브 시작','타워 강화'],metrics:{uniqueGameplayStateCount:7,meaningfulStateTransitionCount:18}},
    promotionRevalidation:{required:true,independentRun:true,pass:true,baselineHashMatch:true},
    runtimeValidationEvidence:{
      replayRegression:{required:true,independentRun:true,pass:true},
      preplatformReadiness:{pass:true},
      performance:{pass:true},
      mobile:{pass:true},
      saveRestore:{required:true,pass:true},
      strategyOutcomes:{required:false,pass:true}
    },
    implementationMetrics:{interactionCount:12},
    terminalOutcome:{reached:true}
  };
}


function validDesign(){
  return {
    gameId:'g1',
    content:{
      coreLoop:['Read the enemy wave and place defenders.','Earn resources and spend them on upgrades.','Clear the wave to unlock the next stage.'],
      progressionDirection:'wave-by-wave',
      mobileUx:'touch-first',
      signatureSystems:[{name:'lane-defense'}],
      technicalAssumptions:['Wave pressure and counter balance']
    }
  };
}

test('formal Web evidence builds design-aware verified experience',()=>{
  const gate=validateFormalWebLearningEvidence(validItem(),validReport());
  assert.equal(gate.valid,true);
  assert.equal(gate.autoPlayerVerified,true);
  assert.equal(gate.telemetryVerified,true);
  assert.equal(gate.designReviewVerified,true);
  const built=buildFormalWebExperienceReview({item:validItem(),report:validReport(),evidencePath:'design/g1/web-gameplay-validation.json',design:validDesign(),designPath:'design/g1/design-after-web.json'});
  assert.equal(built.valid,true);
  assert.equal(built.review.designIntelligenceRequired,true);
  assert.equal(built.review.designReviewDecision,'PASS');
  assert.equal(built.review.reviewVerified,true);
  assert.equal(built.review.engineQaVerified,true);
  assert.ok(built.review.reusablePatterns.includes('deterministic-replay-stable'));
  assert.ok(built.review.reusablePatterns.some(value=>value.startsWith('WEB_SEMANTIC:CORE_LOOP:')));
  assert.ok(built.review.reusablePatterns.some(value=>value.startsWith('WEB_SEMANTIC:SAVE_MEANING:')));
  assert.ok(built.review.evidence.includes('promotion-revalidation:PASS'));
  assert.ok(built.review.evidence.includes('verified-web-semantics:design/g1/design-after-web.json'));
});

test('verified Web semantic promotion requires approved scope and baseline hash match',()=>{
  const report=validReport();
  report.promotionRevalidation.baselineHashMatch=false;
  const built=buildFormalWebExperienceReview({item:validItem(),report,evidencePath:'design/g1/web-gameplay-validation.json',design:validDesign(),designPath:'design/g1/design-after-web.json'});
  assert.equal(built.valid,true);
  assert.equal(built.review.reusablePatterns.some(value=>value.startsWith('WEB_SEMANTIC:')),false);
  assert.equal(built.review.evidence.some(value=>value.startsWith('verified-web-semantics:')),false);
});

test('strict 90, real 30m and independent replay/revalidation are hard requirements',()=>{
  const cases=[
    r=>{r.webStrictScore=89;r.strictReview.totalScore=89;},
    r=>{r.contentDepthValidation.meaningfulGameplayMilliseconds=1799999;},
    r=>{r.runtimeValidationEvidence.replayRegression.pass=false;},
    r=>{r.promotionRevalidation.independentRun=false;},
    r=>{r.runtimeValidationEvidence.performance.pass=false;}
  ];
  for(const mutate of cases){
    const report=validReport();mutate(report);
    assert.equal(validateFormalWebLearningEvidence(validItem(),report).valid,false);
  }
});

test('ingest promotes once and duplicate evidence does not create a second record',()=>{
  const queue={items:[validItem()]};
  const first=ingestFormalWebExperiences({queueInput:queue,memoryInput:{version:1,records:[]},evidenceLoader:()=>validReport(),designLoader:()=>({path:'design/g1/design-after-web.json',data:validDesign()})});
  assert.equal(first.promotedCount,1);
  assert.equal(first.memory.records.length,1);
  assert.ok(first.memory.records[0].reusablePatterns.some(value=>value.startsWith('WEB_SEMANTIC:CORE_LOOP:')));
  const confirmations=first.memory.records[0].confirmations;
  const second=ingestFormalWebExperiences({queueInput:queue,memoryInput:first.memory,evidenceLoader:()=>validReport(),designLoader:()=>({path:'design/g1/design-after-web.json',data:validDesign()})});
  assert.equal(second.promotedCount,0);
  assert.equal(second.results[0].reason,'formal-web-experience-already-ingested');
  assert.equal(second.memory.records.length,1);
  assert.equal(second.memory.records[0].confirmations,confirmations);
});

test('non-formal Web item is ignored and cannot become positive learning',()=>{
  const item={...validItem(),formalImplementationPassed:false};
  const result=ingestFormalWebExperiences({queueInput:{items:[item]},memoryInput:{version:1,records:[]},evidenceLoader:()=>validReport()});
  assert.equal(result.promotedCount,0);
  assert.equal(result.memory.records.length,0);
});

test('verified Web outcome can distill a hash-only external AI advisory candidate',()=>{
  const item={...validItem(),webExternalAiLearningCandidate:{
    version:1,id:'g1-web-contract-abc123',sourceKind:'external-ai',provider:'GEMINI',model:'gemini-test',
    rawOutputSha256:'b'.repeat(64),engine:'web',gameId:'g1',domains:['WEB_RUNTIME','UI_STATE'],
    distilledPatterns:['Map existing real gameplay controls to approved scope before creating new validation controls.'],
    cautions:['External AI is advisory only.'],sourceWrite:false,productionPass:false,authorityExpanded:false
  }};
  const result=ingestFormalWebExperiences({
    queueInput:{items:[item]},
    memoryInput:{version:1,records:[]},
    externalAiKnowledgeInput:{version:1,entries:[]},
    evidenceLoader:()=>validReport(),
    designLoader:()=>({path:'design/g1/design-after-web.json',data:validDesign()})
  });
  assert.equal(result.promotedCount,1);
  assert.equal(result.externalAiAcceptedCount,1);
  assert.equal(result.externalAiKnowledge.entries.length,1);
  const row=result.externalAiKnowledge.entries[0];
  assert.equal(row.sourceKind,'external-ai-distilled');
  assert.equal(row.rawOutputStored,false);
  assert.equal(row.directSourceWrite,false);
  assert.equal(row.directProductionPass,false);
  assert.equal(row.verification.independent,true);
  assert.ok(row.verification.evidence.some(value=>value.startsWith('runtime:')));
  assert.ok(row.verification.evidence.some(value=>value.startsWith('source:')));
  assert.equal('rawOutput' in row,false);
});

test('external AI candidate is never distilled when formal Web verification fails',()=>{
  const item={...validItem(),formalImplementationPassed:false,webExternalAiLearningCandidate:{
    version:1,id:'bad',sourceKind:'external-ai',provider:'GEMINI',model:'m',
    rawOutputSha256:'c'.repeat(64),distilledPatterns:['candidate pattern']
  }};
  const result=ingestFormalWebExperiences({
    queueInput:{items:[item]},memoryInput:{version:1,records:[]},
    externalAiKnowledgeInput:{version:1,entries:[]},evidenceLoader:()=>validReport()
  });
  assert.equal(result.externalAiAcceptedCount,0);
  assert.equal(result.externalAiKnowledge.entries.length,0);
});

