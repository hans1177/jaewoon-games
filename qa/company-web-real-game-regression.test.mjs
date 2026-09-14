import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateWebValidationEvidence,
  resolveWebCategoryProfile,
  scoreWebStrictImplementation,
  sha256Text,
} from '../tools/company-web-validation-evidence-contract.mjs';

const REAL_GAMES=[
  {
    gameId:'seed-roblox-battleground-fight-welcome-to-bloxburg',
    category:'BATTLEGROUND_FIGHTING_SHOOTER',
    profile:'BATTLE_SHOOTER',
    path:'web-games/seed-roblox-battleground-fight-welcome-to-bloxburg/index.html',
    worldOrEnemyEntityCount:1,
    retryPathCount:1,
  },
  {
    gameId:'seed-roblox-simulator-tycoon-i-adopt-me',
    category:'SIMULATOR_TYCOON_INCREMENTAL',
    profile:'TYCOON_SIMULATOR',
    path:'web-games/seed-roblox-simulator-tycoon-i-adopt-me/index.html',
    worldOrEnemyEntityCount:1,
    retryPathCount:1,
  },
];

const HARNESS_GAMES=[
  ['seed-roblox-obby-party-minigam-tower-of-hell','OBBY_PARTY_MINIGAME','web-games/seed-roblox-obby-party-minigam-tower-of-hell/index.html'],
  ['seed-roblox-roleplay-life-avat-brookhaven-rp','ROLEPLAY_LIFE_AVATAR','web-games/seed-roblox-roleplay-life-avat-brookhaven-rp/index.html'],
  ['seed-roblox-story-rpg-adventur-blox-fruits','STORY_RPG_ADVENTURE_RPG','web-games/seed-roblox-story-rpg-adventur-blox-fruits/index.html'],
  ['seed-roblox-survival-horror-es-doors','SURVIVAL_HORROR_ESCAPE','web-games/seed-roblox-survival-horror-es-doors/index.html'],
];

function sourceFootprint(source){
  const mechanicIds=[...new Set([...source.matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(match=>match[1]).filter(Boolean))];
  const scripts=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match=>String(match[1]||''));
  const proxyMarkers=(source.match(/scope-control-|FULL APPROVED WEB COMPANION|승인 분량 전체 구현/gi)||[]).length;
  const stageButtons=/<button\b[^>]*data-session-stage=/i.test(source);
  return {
    mechanicIds,
    totalBytes:Buffer.byteLength(source,'utf8'),
    scriptBytes:scripts.reduce((sum,text)=>sum+Buffer.byteLength(text,'utf8'),0),
    proxyMarkers,
    stageButtons,
  };
}

function freshInitialEvidence(source,{worldOrEnemyEntityCount=1,retryPathCount=1}={}){
  const footprint=sourceFootprint(source);
  const functionalCount=Math.max(3,footprint.mechanicIds.length);
  const implementationMetrics={
    uniqueMechanicCount:functionalCount,
    uniqueFunctionalUiCount:functionalCount,
    gameplayActionCount:20,
    meaningfulStateTransitionCount:12,
    uniqueGameplayStateCount:13,
    uniqueInteractedMechanicCount:Math.min(5,functionalCount),
    systemDependencyCount:5,
    worldOrEnemyEntityCount,
    winPathCount:1,
    failPathCount:1,
    retryPathCount,
    duplicateActionRatio:0.25,
    testUiRatio:0,
    gameplaySurfaceRatio:0.45,
    contentVariationCount:0,
  };
  return {
    version:12,
    validationSchemaVersion:12,
    validated:true,
    target:'web',
    stateChanged:true,
    runtimeSmokePassed:true,
    consoleErrors:[],pageErrors:[],failedRequests:[],badResponses:[],
    mobileViewport:{width:390,height:844,touch:true},
    after:{scrollWidth:390,viewportWidth:390},
    musicRuntime:{pass:true},
    interactionCount:20,
    scopeCoverage:{pass:true,mechanicBindings:footprint.mechanicIds},
    initialImplementationMinuteHardGate:false,
    initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',blockers:[]},
    initialPlayableCyclePassed:true,
    implementationMetrics,
    sourceFootprint:{
      pass:true,
      totalBytes:footprint.totalBytes,
      scriptBytes:footprint.scriptBytes,
      mechanicCount:functionalCount,
      cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',
      stageButtons:footprint.stageButtons,
      proxyMarkers:footprint.proxyMarkers,
    },
    substanceGate:{
      pass:true,
      implementationClass:'DEDICATED_REAL_GAME',
      totalBytes:footprint.totalBytes,
      executableBytes:footprint.scriptBytes,
      mechanicCount:functionalCount,
      directSessionControls:footprint.stageButtons?1:0,
      proxyMarkers:footprint.proxyMarkers,
      initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',
    },
    sourceIndexSha256:sha256Text(source),
    designBaselineSha256:sha256Text('real-game-regression-design'),
  };
}

function inflatedHarnessEvidence(source){
  const evidence=freshInitialEvidence(source,{worldOrEnemyEntityCount:3,retryPathCount:1});
  evidence.sourceFootprint={...evidence.sourceFootprint,pass:true,stageButtons:false,proxyMarkers:0,totalBytes:20000,scriptBytes:10000,mechanicCount:8};
  evidence.substanceGate={...evidence.substanceGate,pass:true,directSessionControls:0,proxyMarkers:0,totalBytes:20000,executableBytes:10000,mechanicCount:8};
  evidence.implementationMetrics={...evidence.implementationMetrics,uniqueMechanicCount:8,uniqueFunctionalUiCount:8,systemDependencyCount:5,testUiRatio:0,duplicateActionRatio:0.1};
  return evidence;
}

test('central roleplay category maps to canonical LIFE_ROLEPLAY profile',()=>{
  assert.equal(resolveWebCategoryProfile('ROLEPLAY_LIFE_AVATAR'),'LIFE_ROLEPLAY');
  assert.equal(resolveWebCategoryProfile('ROLEPLAY_LIFE'),'LIFE_ROLEPLAY');
});

for(const game of REAL_GAMES){
  test(`${game.gameId} remains a real game despite passive 30-minute milestone labels`,()=>{
    const source=fs.readFileSync(game.path,'utf8');
    const evidence=freshInitialEvidence(source,game);
    const strict=scoreWebStrictImplementation({category:game.category,sourceText:source,evidence});
    assert.equal(strict.categoryProfile,game.profile);
    assert.equal(strict.categoryMatchPassed,true,JSON.stringify(strict.categoryCandidates));
    assert.equal(strict.harnessIndicators.directStageButton,false);
    assert.equal(strict.harnessIndicators.syntheticTimeProgress,false);
    assert.equal(strict.harnessIndicators.scopeProxy,false);
    assert.deepEqual(strict.hardFailures,[]);
    assert.equal(strict.commonScore,59);
    assert.equal(strict.categoryScore,40);
    assert.equal(strict.totalScore,99);

    evidence.webStrictScore=strict.totalScore;
    evidence.strictReview={totalScore:strict.totalScore,hardFailures:[]};
    const initial=evaluateWebValidationEvidence(evidence,{
      minimumScore:80,
      requireFinalContentDepth:false,
      currentSourceSha256:sha256Text(source),
      currentBaselineSha256:sha256Text('real-game-regression-design'),
    });
    assert.equal(initial.pass,true,initial.blockers.join(','));
    const top30=evaluateWebValidationEvidence(evidence,{minimumScore:80});
    assert.equal(top30.pass,false);
    assert.ok(top30.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
  });
}

for(const [gameId,category,file] of HARNESS_GAMES){
  test(`${gameId} legacy harness is blocked even with inflated runtime metrics`,()=>{
    const source=fs.readFileSync(file,'utf8');
    const strict=scoreWebStrictImplementation({category,sourceText:source,evidence:inflatedHarnessEvidence(source)});
    assert.ok(strict.hardFailures.includes('REAL_PLAYABLE_GAME_REQUIRED'),strict.hardFailures.join(','));
    assert.equal(Boolean(strict.harnessIndicators.directStageButton||strict.harnessIndicators.scopeProxy||strict.harnessIndicators.testPanel),true,JSON.stringify(strict.harnessIndicators));
  });
}

test('low-UI connected battle loop is not rejected just for having two functional controls',()=>{
  const game=REAL_GAMES[0],source=fs.readFileSync(game.path,'utf8');
  const evidence=freshInitialEvidence(source,game);
  evidence.implementationMetrics={...evidence.implementationMetrics,uniqueMechanicCount:3,uniqueFunctionalUiCount:2,gameplayActionCount:8,meaningfulStateTransitionCount:6,uniqueGameplayStateCount:7,systemDependencyCount:3,duplicateActionRatio:0.2};
  const strict=scoreWebStrictImplementation({category:game.category,sourceText:source,evidence});
  assert.equal(strict.hardGates.REAL_PLAYABLE_GAME_REQUIRED,true);
  assert.equal(strict.hardGates.REAL_INPUT_STATE_CHANGE_REQUIRED,true);
  assert.equal(strict.hardGates.GAMEPLAY_SURFACE_REQUIRED,true);
  assert.equal(strict.hardGates.WIN_OR_GOAL_CONDITION_REQUIRED,true);
  assert.equal(strict.hardGates.FAIL_OR_LOSS_CONDITION_REQUIRED,true);
});

test('actual real-game evidence cannot reuse stale source or old schema',()=>{
  const game=REAL_GAMES[0],source=fs.readFileSync(game.path,'utf8');
  const evidence=freshInitialEvidence(source,game);
  const strict=scoreWebStrictImplementation({category:game.category,sourceText:source,evidence});
  evidence.webStrictScore=strict.totalScore;
  evidence.strictReview={totalScore:strict.totalScore,hardFailures:[]};
  const stale=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:false,currentSourceSha256:sha256Text(`${source}\nstale`),currentBaselineSha256:evidence.designBaselineSha256});
  assert.equal(stale.pass,false);assert.ok(stale.blockers.includes('WEB_SOURCE_HASH_STALE'));
  evidence.version=10;evidence.validationSchemaVersion=10;
  const old=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:false});
  assert.equal(old.pass,false);assert.ok(old.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
});
