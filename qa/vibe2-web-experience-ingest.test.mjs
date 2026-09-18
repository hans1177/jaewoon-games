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
    sourceRevision:'a'.repeat(40),
    webStrictScore:94,
    strictReview:{verdict:'PASS',totalScore:94,hardFailures:[]},
    contentDepthValidation:{validationMode:'REAL_ELAPSED_GAMEPLAY',pass:true,meaningfulGameplayMilliseconds:1800000},
    promotionRevalidation:{required:true,independentRun:true,pass:true},
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

test('formal Web evidence builds design-aware verified experience',()=>{
  const gate=validateFormalWebLearningEvidence(validItem(),validReport());
  assert.equal(gate.valid,true);
  assert.equal(gate.autoPlayerVerified,true);
  assert.equal(gate.telemetryVerified,true);
  assert.equal(gate.designReviewVerified,true);
  const built=buildFormalWebExperienceReview({item:validItem(),report:validReport(),evidencePath:'design/g1/web-gameplay-validation.json'});
  assert.equal(built.valid,true);
  assert.equal(built.review.designIntelligenceRequired,true);
  assert.equal(built.review.designReviewDecision,'PASS');
  assert.equal(built.review.reviewVerified,true);
  assert.equal(built.review.engineQaVerified,true);
  assert.ok(built.review.reusablePatterns.includes('deterministic-replay-stable'));
  assert.ok(built.review.evidence.includes('promotion-revalidation:PASS'));
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
  const first=ingestFormalWebExperiences({queueInput:queue,memoryInput:{version:1,records:[]},evidenceLoader:()=>validReport()});
  assert.equal(first.promotedCount,1);
  assert.equal(first.memory.records.length,1);
  const second=ingestFormalWebExperiences({queueInput:queue,memoryInput:first.memory,evidenceLoader:()=>validReport()});
  assert.equal(second.promotedCount,0);
  assert.equal(second.memory.records.length,1);
});

test('non-formal Web item is ignored and cannot become positive learning',()=>{
  const item={...validItem(),formalImplementationPassed:false};
  const result=ingestFormalWebExperiences({queueInput:{items:[item]},memoryInput:{version:1,records:[]},evidenceLoader:()=>validReport()});
  assert.equal(result.promotedCount,0);
  assert.equal(result.memory.records.length,0);
});
