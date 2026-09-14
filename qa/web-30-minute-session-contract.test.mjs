import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  WEB_VALIDATION_SCHEMA_VERSION,
  finalContentDepthPass,
  scoreWebStrictImplementation,
} from '../tools/company-web-validation-evidence-contract.mjs';

const read=file=>fs.readFileSync(file,'utf8');
const metrics=(overrides={})=>({
  uniqueMechanicCount:6,
  uniqueFunctionalUiCount:5,
  gameplayActionCount:20,
  stateVariableCount:8,
  meaningfulStateTransitionCount:14,
  uniqueGameplayStateCount:12,
  uniqueInteractedMechanicCount:5,
  systemDependencyCount:5,
  enemyOrWorldEntityCount:8,
  winPathCount:1,
  failPathCount:1,
  retryPathCount:1,
  duplicateActionRatio:0.1,
  testUiRatio:0,
  gameplayScreenRatio:0.4,
  contentVariationCount:3,
  ...overrides,
});

const initialEvidence=()=>({
  version:WEB_VALIDATION_SCHEMA_VERSION,
  validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,
  target:'web',
  pass:true,
  validated:true,
  gameplayInteractionPerformed:true,
  interactionCount:20,
  stateChanged:true,
  stateChangeCount:14,
  runtimeSmokePassed:true,
  consoleErrors:[],pageErrors:[],failedRequests:[],badResponses:[],
  mobileViewport:{width:390,height:844,touch:true},
  before:{scrollWidth:390,viewportWidth:390},
  after:{scrollWidth:390,viewportWidth:390},
  initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',
  initialPlayableCycle:{
    unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',pass:true,
    startWorldEntry:true,realPlayerInput:true,coreGameplayAction:true,actualStateChange:true,
    growthRewardOrMeaningfulChoice:true,riskFailureOrResourcePressure:true,goalOrCycleEnd:true,retryPath:true,
  },
  initialPlayableCyclePassed:true,
  implementationMetrics:metrics(),
  sourceFootprint:{
    pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:18000,scriptBytes:9000,
    mechanicCount:6,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',proxyMarkers:0,stageButtons:false,
    winPathCount:1,failPathCount:1,retryPathCount:1,
  },
  substanceGate:{
    pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:18000,executableBytes:9000,
    mechanicCount:6,directSessionControls:0,proxyMarkers:0,
    initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',
  },
});

const tycoonSource=`
  production produce factory mine smelt sell income coin gold cost resource
  upgrade level automation auto drone worker unlock zone area manual automatic choice
  progression reward growth effect sound score feedback victory defeat retry
`;

test('initial Web contract is one complete playable cycle, not a 30-minute generation quota',()=>{
  const flow=read('COMPANY_FLOW.md');
  const bootstrap=read('tools/company-development-web-bootstrap.mjs');
  const validator=read('tools/company-development-web-gameplay-validation.mjs');
  const strictReview=read('tools/company-strict-production-review.mjs');

  assert.match(flow,/initialImplementationMinimumUnit: ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
  assert.match(flow,/thirtyMinuteRequirementStage: FINAL_CONTENT_DEPTH_VALIDATION_ONLY/);
  assert.match(flow,/thirtyMinuteInitialGenerationHardGateForbidden: true/);

  assert.match(bootstrap,/INITIAL_PLAYABLE_MINIMUM='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'/);
  assert.match(bootstrap,/INITIAL_30_MINUTE_HARD_REQUIREMENT=NO/);
  assert.match(bootstrap,/FINAL_CONTENT_DEPTH_MINUTES=30/);
  assert.doesNotMatch(bootstrap,/const\s+SESSION_MINUTES\s*=\s*30/);
  assert.doesNotMatch(bootstrap,/SESSION_MILESTONE_CONTRACT_REQUIRED/);

  assert.match(validator,/validationStage='initial-cycle'/);
  assert.match(validator,/validationStage==='final-content-depth'/);
  assert.match(validator,/REAL_ELAPSED_GAMEPLAY/);
  assert.doesNotMatch(validator,/ensure30MinuteSessionContract/);
  assert.doesNotMatch(validator,/evaluateSessionContract/);

  assert.match(strictReview,/const webScore=scoreWebStrictImplementation/);
  assert.doesNotMatch(strictReview,/const\s+WEB_SESSION_WINDOWS\s*=/);
  assert.doesNotMatch(strictReview,/function\s+structuredWebSession\s*\(/);
});

test('initial strict review can pass without final 30-minute content depth',()=>{
  const evidence=initialEvidence();
  const strict=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:tycoonSource,evidence});
  assert.deepEqual(strict.hardFailures,[]);
  assert.equal(strict.finalContentDepthRequiredHere,false);
  assert.ok(strict.totalScore>=80,strict.totalScore);
});

test('final content depth requires real elapsed 30-minute gameplay and rejects stage-proxy proof',()=>{
  const evidence=initialEvidence();
  evidence.contentDepthValidation={
    mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',
    validationMode:'REAL_ELAPSED_GAMEPLAY',
    status:'COMPLETE',
    pass:true,
    targetMinutes:30,
    validatedMinutes:30,
    actualGameplayMinutes:30,
    elapsedRealMilliseconds:30*60*1000,
    realContent:true,
    fakeProgress:false,
    testHarness:false,
    directStageClick:false,
    metrics:metrics(),
    varietyEvents:['new-zone','new-enemy','upgrade-choice'],
  };
  assert.equal(finalContentDepthPass(evidence),true);

  assert.equal(finalContentDepthPass({...evidence,contentDepthValidation:{...evidence.contentDepthValidation,elapsedRealMilliseconds:2*60*1000}}),false);
  assert.equal(finalContentDepthPass({...evidence,contentDepthValidation:{...evidence.contentDepthValidation,fakeProgress:true}}),false);
  assert.equal(finalContentDepthPass({...evidence,contentDepthValidation:{...evidence.contentDepthValidation,testHarness:true}}),false);
  assert.equal(finalContentDepthPass({...evidence,contentDepthValidation:{...evidence.contentDepthValidation,directStageClick:true}}),false);
});

test('old four-window session metadata is not accepted as final depth evidence',()=>{
  const evidence=initialEvidence();
  evidence.sessionContract={
    pass:true,stageGameplayPassed:true,stageCount:4,completedStages:4,validatedMinutes:30,
    windows:[[0,5],[5,15],[15,25],[25,30]],
    stageResults:[1,2,3,4].map((stage,index)=>({stage,start:[0,5,15,25][index],end:[5,15,25,30][index],clicked:true,completed:true,gameStateChanged:true})),
  };
  assert.equal(finalContentDepthPass(evidence),false);
});

test('development and QA agent prompts mirror the staged real-game policy',()=>{
  const development=read('.github/agents/development.agent.md');
  const qa=read('.github/agents/qa.agent.md');

  for(const text of [development,qa]){
    assert.match(text,/COMPANY_FLOW\.md/);
    assert.match(text,/ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
    assert.match(text,/FINAL_CONTENT_DEPTH_VALIDATION_ONLY/);
    assert.match(text,/REAL_ELAPSED_GAMEPLAY/);
    assert.match(text,/Top30/);
    assert.doesNotMatch(text,/현재 제작 정책은[^\n]*ARTBOOK FIRST/);
  }

  assert.doesNotMatch(development,/테스트베드\/밑그림.*만 만든다/);
  assert.doesNotMatch(development,/최종 Web 게임을 만들지 않는다/);
  assert.doesNotMatch(qa,/`web-games\/`는 읽기 전용/);
});

test('planning graphics and balance prompts do not reintroduce pre-Web artbook or testbed-only policy',()=>{
  const planning=read('.github/agents/planning.agent.md');
  const graphics=read('.github/agents/graphics.agent.md');
  const balance=read('.github/agents/balance.agent.md');

  for(const text of [planning,graphics,balance]){
    assert.match(text,/COMPANY_FLOW\.md/);
    assert.match(text,/ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
    assert.match(text,/FINAL_CONTENT_DEPTH_VALIDATION_ONLY/);
    assert.doesNotMatch(text,/현재 제작 정책은[^\n]*ARTBOOK FIRST/);
  }

  assert.doesNotMatch(planning,/`web-games\/`는 읽기 전용/);
  assert.doesNotMatch(graphics,/최종 Web 게임을 만들지 않는다/);
  assert.doesNotMatch(graphics,/테스트베드\/밑그림.*만 만든다/);
  assert.doesNotMatch(balance,/기존 Web 게임은[^\n]*수정하지 않는다/);
});
