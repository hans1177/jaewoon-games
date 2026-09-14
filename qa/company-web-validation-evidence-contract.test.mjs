import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEB_COMMON_SCORE_WEIGHTS,
  WEB_CATEGORY_SCORE_WEIGHTS,
  evaluateWebValidationEvidence,
  scoreWebStrictImplementation,
  sha256Text,
} from '../tools/company-web-validation-evidence-contract.mjs';

const tycoonSource=`
  real factory production chain mine ore smelt ingot sell product income coins buy upgrade automation drone worker
  unlock zone area manual automatic choice progression reward growth effect sound score feedback
`;

const metrics=(overrides={})=>({
  uniqueMechanicCount:7,
  uniqueFunctionalUiCount:6,
  gameplayActionCount:20,
  meaningfulStateTransitionCount:12,
  uniqueGameplayStateCount:13,
  uniqueInteractedMechanicCount:5,
  systemDependencyCount:5,
  worldOrEnemyEntityCount:3,
  winPathCount:1,
  failPathCount:1,
  retryPathCount:1,
  duplicateActionRatio:0.25,
  testUiRatio:0,
  gameplaySurfaceRatio:0.45,
  contentVariationCount:3,
  ...overrides,
});

const baseEvidence=()=>{
  const implementationMetrics=metrics();
  return {
    version:12,
    validationSchemaVersion:12,
    pass:true,
    validated:true,
    target:'web',
    stateChanged:true,
    runtimeSmokePassed:true,
    consoleErrors:[],
    pageErrors:[],
    failedRequests:[],
    badResponses:[],
    mobileViewport:{width:390,height:844,touch:true},
    after:{scrollWidth:390,viewportWidth:390},
    musicRuntime:{pass:true},
    approvedScopeFullyImplemented:true,
    scopeCoverage:{pass:true,mechanicBindings:['mine','smelt','sell','upgrade','auto']},
    interactionCount:20,
    initialImplementationMinuteHardGate:false,
    initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',blockers:[]},
    initialPlayableCyclePassed:true,
    implementationMetrics,
    contentDepthValidation:{
      pass:true,
      targetMinutes:30,
      validatedMinutes:30,
      validationMode:'REAL_GAMEPLAY_CONTENT_DEPTH',
      varietyEvents:['automation-unlocked','new-zone-unlocked','production-strategy-changed'],
      metrics:implementationMetrics,
    },
    sessionDepthMinutes:30,
    sourceFootprint:{pass:true,totalBytes:16000,scriptBytes:8000,mechanicCount:7,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',stageButtons:false,proxyMarkers:0},
    substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,executableBytes:8000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
    webStrictScore:92,
    strictReview:{totalScore:92,hardFailures:[]},
    sourceIndexSha256:sha256Text('web'),
    designBaselineSha256:sha256Text('design'),
    formalImplementationPassed:true,
    promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true,secondContentDepthPass:true},
  };
};

test('Web strict score contract is exactly common 60 plus category 40',()=>{
  assert.equal(Object.values(WEB_COMMON_SCORE_WEIGHTS).reduce((a,b)=>a+b,0),60);
  for(const [category,weights] of Object.entries(WEB_CATEGORY_SCORE_WEIGHTS)){
    assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),40,category);
  }
});

test('real connected gameplay loop passes hard gates and receives common/category scoring',()=>{
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:tycoonSource,evidence:baseEvidence()});
  assert.deepEqual(result.hardFailures,[]);
  assert.equal(result.categoryProfile,'TYCOON_SIMULATOR');
  assert.equal(result.categoryMatchPassed,true);
  assert.equal(result.categoryScore,40);
  assert.ok(result.commonScore>=50,result.commonScore);
  assert.ok(result.totalScore>=90,result.totalScore);
});

test('test harness with 20 buttons cannot qualify as a real game',()=>{
  const evidence=baseEvidence();
  evidence.implementationMetrics=metrics({uniqueFunctionalUiCount:1,systemDependencyCount:1,worldOrEnemyEntityCount:0,duplicateActionRatio:0.96,testUiRatio:0.75});
  const buttons=Array.from({length:20},(_,index)=>`<button data-test-stage="${index}">score++</button>`).join('');
  const source=`<section>validation panel 0-5 5-15 15-25 25-30</section>${buttons}`;
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:source,evidence});
  assert.ok(result.hardFailures.includes('REAL_PLAYABLE_GAME_REQUIRED'));
  assert.equal(result.harnessIndicators.testPanel,true);
  assert.equal(result.harnessIndicators.excessiveTestUi,true);
});

test('many score++ controls backed by one function count as roughly one functional UI',()=>{
  const evidence=baseEvidence();
  evidence.implementationMetrics=metrics({uniqueFunctionalUiCount:1,duplicateActionRatio:0.25});
  const repeated=Array.from({length:12},()=>'<button>score++</button>').join('');
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:`${tycoonSource}${repeated}`,evidence});
  assert.ok(result.scores.FUNCTIONAL_UI_UX<=1,result.scores.FUNCTIONAL_UI_UX);
  assert.equal(result.metrics.uniqueFunctionalUiCount,1);
});

test('category mismatch fails the hard gate regardless of numeric score',()=>{
  const result=scoreWebStrictImplementation({category:'BATTLEGROUND_FIGHTING_SHOOTER',sourceText:tycoonSource,evidence:baseEvidence()});
  assert.equal(result.categoryMatchPassed,false);
  assert.ok(result.hardFailures.includes('CATEGORY_MATCH_REQUIRED'));
});

test('complete initial cycle can be strict-reviewed before 30-minute content depth exists',()=>{
  const evidence=baseEvidence();
  delete evidence.contentDepthValidation;
  evidence.sessionDepthMinutes=0;
  const strict=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:tycoonSource,evidence});
  assert.deepEqual(strict.hardFailures,[]);
  assert.equal(strict.finalContentDepthRequiredHere,false);
  assert.ok(strict.totalScore>=80,strict.totalScore);
  evidence.webStrictScore=84;
  evidence.strictReview={totalScore:84,hardFailures:[]};
  evidence.formalImplementationPassed=false;
  evidence.promotionRevalidation={pass:false,independentRun:false};
  const initial=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:false,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(initial.pass,true,initial.blockers.join(','));
  const top30=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(top30.pass,false);
  assert.ok(top30.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
});

test('Top30 keeps 80 minimum while 90+ promotion still needs independent depth revalidation',()=>{
  const evidence=baseEvidence();
  evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.promotionRevalidation={pass:false,independentRun:false};
  const homepage=evaluateWebValidationEvidence(evidence,{minimumScore:80,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(homepage.pass,true,homepage.blockers.join(','));
  assert.equal(homepage.finalContentDepthPass,true);

  const below90=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(below90.pass,false);
  assert.ok(below90.blockers.includes('WEB_STRICT_SCORE_BELOW_MINIMUM'));

  const promoted=baseEvidence();
  const pass=evaluateWebValidationEvidence(promoted,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  promoted.promotionRevalidation.secondContentDepthPass=false;
  const noSecondDepth=evaluateWebValidationEvidence(promoted,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(noSecondDepth.pass,false);
  assert.ok(noSecondDepth.blockers.includes('WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS'));
});

test('final 30-minute evidence needs real content variation, not old time-stage proof',()=>{
  const evidence=baseEvidence();
  evidence.contentDepthValidation={pass:true,targetMinutes:30,validatedMinutes:30,validationMode:'GAMEPLAY_MILESTONE_DEPTH',varietyEvents:[],metrics:metrics({contentVariationCount:0})};
  evidence.implementationMetrics=metrics({contentVariationCount:0});
  evidence.sessionContract={pass:true,stageCount:4,completedStages:4,windows:[[0,5],[5,15],[15,25],[25,30]]};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
});

test('legacy schema10 or fake harness evidence cannot bypass the new contract',()=>{
  const evidence=baseEvidence();
  evidence.version=10;evidence.validationSchemaVersion=10;
  evidence.initialPlayableCycle={pass:false,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'};
  evidence.implementationMetrics=metrics({uniqueFunctionalUiCount:1,meaningfulStateTransitionCount:1,winPathCount:0,failPathCount:0,testUiRatio:1,duplicateActionRatio:1,gameplaySurfaceRatio:0});
  evidence.substanceGate={pass:true,implementationClass:'DEDICATED',totalBytes:20000,executableBytes:12000,mechanicCount:20,directSessionControls:4,proxyMarkers:20};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
  assert.ok(result.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'));
});
