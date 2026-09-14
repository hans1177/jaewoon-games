import test from 'node:test';
import assert from 'node:assert/strict';
import './company-web-real-game-regression.test.mjs';
import {
  WEB_VALIDATION_SCHEMA_VERSION,
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
  stateVariableCount:9,
  meaningfulStateTransitionCount:12,
  uniqueGameplayStateCount:13,
  uniqueInteractedMechanicCount:5,
  systemDependencyCount:5,
  enemyOrWorldEntityCount:3,
  enemyTypeCount:3,
  newEnemyTypeCount:2,
  areaCount:3,
  newAreaCount:1,
  objectiveCount:3,
  newObjectiveCount:1,
  towerTypeCount:3,
  towerEffectProfileCount:3,
  placementResultCount:2,
  strategyChoiceCount:3,
  strategyCombatOutcomeCount:3,
  newContentDimensionCount:3,
  repeatedActionExcludedCount:0,
  winPathCount:1,
  failPathCount:1,
  retryPathCount:1,
  duplicateActionRatio:0.25,
  testUiRatio:0,
  gameplayScreenRatio:0.45,
  contentVariationCount:3,
  ...overrides,
});

const baseEvidence=()=>{
  const implementationMetrics=metrics();
  const runtimeFeatureEvidence={
    enemyTypes:['grunt','armored','swift'],newEnemyTypes:['armored','swift'],enemyTypeCount:3,newEnemyTypeCount:2,
    areas:['field','ridge','core'],newAreas:['ridge'],areaCount:3,newAreaCount:1,
    objectives:['survive','protect','boss'],newObjectives:['boss'],objectiveCount:3,newObjectiveCount:1,
    towerTypes:['bolt','slow','burst'],newTowerTypes:['slow','burst'],towerTypeCount:3,
    towerEffectProfiles:['damage:8|range:3','damage:4|range:4|slow:.3','damage:14|range:2'],towerEffectProfileCount:3,
    strategyChoices:['bolt','slow','burst'],strategyCombatOutcomes:[{choiceMechanic:'bolt',outcomeSignature:'damage:20'},{choiceMechanic:'slow',outcomeSignature:'damage:11,slow:1'},{choiceMechanic:'burst',outcomeSignature:'damage:28'}],strategyCombatOutcomeCount:3,
    placementResultCount:2,newContentDimensionCount:3,
  };
  return {
    version:WEB_VALIDATION_SCHEMA_VERSION,
    validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,
    pass:true,
    validated:true,
    target:'web',
    categoryProfile:'TYCOON_SIMULATOR',
    gameplayInteractionPerformed:true,
    stateChanged:true,
    stateChangeCount:12,
    runtimeSmokePassed:true,
    consoleErrors:[],
    pageErrors:[],
    failedRequests:[],
    badResponses:[],
    mobileViewport:{width:390,height:844,touch:true},
    before:{scrollWidth:390,viewportWidth:390},
    after:{scrollWidth:390,viewportWidth:390},
    musicRuntime:{pass:true},
    approvedScopeFullyImplemented:true,
    scopeCoverage:{pass:true,mechanicBindings:['mine','smelt','sell','upgrade','auto']},
    interactionCount:20,
    initialImplementationMinuteHardGate:false,
    initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',
    initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',blockers:[]},
    initialPlayableCyclePassed:true,
    implementationMetrics,
    runtimeFeatureEvidence,
    contentDepthValidation:{
      mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',
      validationMode:'REAL_ELAPSED_GAMEPLAY',
      status:'COMPLETE',
      pass:true,
      targetMinutes:30,
      validatedMinutes:30,
      actualGameplayMinutes:30,
      elapsedRealMilliseconds:1900000,
      meaningfulGameplayMilliseconds:1800000,
      excludedRepeatedActionMilliseconds:70000,
      excludedRetryMilliseconds:30000,
      realContent:true,
      fakeProgress:false,
      testHarness:false,
      directStageClick:false,
      varietyEvents:['automation-unlocked','new-zone-unlocked','production-strategy-changed'],
      runtimeFeatureEvidence,
      metrics:implementationMetrics,
    },
    sessionDepthMinutes:30,
    sourceFootprint:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,scriptBytes:8000,mechanicCount:7,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',stageButtons:false,proxyMarkers:0,winPathCount:1,failPathCount:1,retryPathCount:1},
    substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,executableBytes:8000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
    webStrictScore:92,
    strictReview:{totalScore:92,hardFailures:[]},
    sourceIndexSha256:sha256Text('web'),
    designBaselineSha256:sha256Text('design'),
    formalImplementationPassed:true,
    promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true,secondContentDepthPass:true,secondTerminalReached:true},
  };
};

test('Web strict score contract is exactly common 60 plus category 40',()=>{
  assert.equal(Object.values(WEB_COMMON_SCORE_WEIGHTS).reduce((a,b)=>a+b,0),60);
  for(const [category,weights] of Object.entries(WEB_CATEGORY_SCORE_WEIGHTS))assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),40,category);
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

test('tower-defense keywords do not earn placement, tower variety, or strategy points without runtime outcomes',()=>{
  const source='tower place lane route path wave turret upgrade gold coin cost range slow damage choice strategy';
  const evidence=baseEvidence();
  evidence.implementationMetrics=metrics({placementResultCount:0,towerTypeCount:1,towerEffectProfileCount:1,strategyChoiceCount:1,strategyCombatOutcomeCount:1});
  evidence.runtimeFeatureEvidence={towerTypes:['bolt'],towerTypeCount:1,towerEffectProfiles:['damage:8|range:3'],towerEffectProfileCount:1,placementResultCount:0,strategyChoices:['bolt'],strategyCombatOutcomes:[{choiceMechanic:'bolt',outcomeSignature:'damage:20'}],strategyCombatOutcomeCount:1,newContentDimensionCount:0};
  const shallow=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:source,evidence});
  assert.equal(shallow.scores.CATEGORY_PLACEMENT_AND_ROUTE,0);
  assert.equal(shallow.scores.CATEGORY_TOWER_VARIETY,0);
  assert.equal(shallow.scores.CATEGORY_STRATEGIC_CHOICE,0);

  const rich=baseEvidence();
  rich.categoryProfile='TOWER_DEFENSE';
  rich.implementationMetrics=metrics({placementResultCount:2,towerTypeCount:3,towerEffectProfileCount:3,strategyChoiceCount:3,strategyCombatOutcomeCount:3});
  const implemented=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:source,evidence:rich});
  assert.equal(implemented.scores.CATEGORY_PLACEMENT_AND_ROUTE,WEB_CATEGORY_SCORE_WEIGHTS.TOWER_DEFENSE.PLACEMENT_AND_ROUTE);
  assert.equal(implemented.scores.CATEGORY_TOWER_VARIETY,WEB_CATEGORY_SCORE_WEIGHTS.TOWER_DEFENSE.TOWER_VARIETY);
  assert.equal(implemented.scores.CATEGORY_STRATEGIC_CHOICE,WEB_CATEGORY_SCORE_WEIGHTS.TOWER_DEFENSE.STRATEGIC_CHOICE);
});

test('test harness with 20 buttons cannot qualify as a real game',()=>{
  const evidence=baseEvidence();
  evidence.implementationMetrics=metrics({uniqueFunctionalUiCount:1,systemDependencyCount:1,enemyOrWorldEntityCount:0,duplicateActionRatio:0.96,testUiRatio:0.75});
  const buttons=Array.from({length:20},(_,index)=>`<button data-test-stage="${index}">score++</button>`).join('');
  const source=`<section>validation panel 0-5 5-15 15-25 25-30</section>${buttons}`;
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:source,evidence});
  assert.ok(result.hardFailures.includes('REAL_PLAYABLE_GAME'));
  assert.ok(result.hardFailures.includes('NO_TEST_PROXY'));
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
  const mismatch=baseEvidence();
  mismatch.categoryProfile='TYCOON_SIMULATOR';
  const result=scoreWebStrictImplementation({category:'BATTLEGROUND_FIGHTING_SHOOTER',sourceText:tycoonSource,evidence:mismatch});
  assert.equal(result.categoryMatchPassed,false);
  assert.ok(result.hardFailures.includes('CATEGORY_PROFILE_MATCH'));
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

test('final 30-minute evidence excludes restart and repeated-action time',()=>{
  const evidence=baseEvidence();
  evidence.contentDepthValidation={...evidence.contentDepthValidation,elapsedRealMilliseconds:2400000,validatedMinutes:40,actualGameplayMinutes:40,meaningfulGameplayMilliseconds:1500000,excludedRepeatedActionMilliseconds:700000,excludedRetryMilliseconds:200000};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
});

test('final 30-minute evidence requires multiple genuinely new content dimensions',()=>{
  const evidence=baseEvidence();
  const shallowMetrics=metrics({newContentDimensionCount:1,contentVariationCount:4});
  evidence.implementationMetrics=shallowMetrics;
  evidence.contentDepthValidation={...evidence.contentDepthValidation,metrics:shallowMetrics,meaningfulGameplayMilliseconds:1800000,varietyEvents:['same-wave-variant','same-wave-variant-2','same-wave-variant-3']};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
});

test('final 30-minute evidence needs real content variation, not old time-stage proof',()=>{
  const evidence=baseEvidence();
  evidence.contentDepthValidation={pass:true,targetMinutes:30,validatedMinutes:30,actualGameplayMinutes:30,elapsedRealMilliseconds:1800000,meaningfulGameplayMilliseconds:1800000,validationMode:'GAMEPLAY_MILESTONE_DEPTH',varietyEvents:[],metrics:metrics({contentVariationCount:0,newContentDimensionCount:0})};
  evidence.implementationMetrics=metrics({contentVariationCount:0,newContentDimensionCount:0});
  evidence.sessionContract={pass:true,stageCount:4,completedStages:4,windows:[[0,5],[5,15],[15,25],[25,30]]};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
});

test('legacy schema10 or fake harness evidence cannot bypass the new contract',()=>{
  const evidence=baseEvidence();
  evidence.version=10;evidence.validationSchemaVersion=10;
  evidence.initialPlayableCycle={pass:false,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'};
  evidence.implementationMetrics=metrics({uniqueFunctionalUiCount:1,meaningfulStateTransitionCount:1,winPathCount:0,failPathCount:0,testUiRatio:1,duplicateActionRatio:1,gameplayScreenRatio:0,newContentDimensionCount:0});
  evidence.substanceGate={pass:true,implementationClass:'DEDICATED',totalBytes:20000,executableBytes:12000,mechanicCount:20,directSessionControls:4,proxyMarkers:20};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
  assert.ok(result.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'));
});
