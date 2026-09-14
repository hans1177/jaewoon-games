// 파일명: qa/company-web-real-game-regression.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  WEB_VALIDATION_SCHEMA_VERSION,
  WEB_COMMON_SCORE_WEIGHTS,
  WEB_CATEGORY_PROFILE_MAPPING,
  WEB_CATEGORY_SCORE_WEIGHTS,
  evaluateWebValidationEvidence,
  finalContentDepthPass,
  resolveWebCategoryProfile,
  scoreWebStrictImplementation,
  sha256Text,
} from '../tools/company-web-validation-evidence-contract.mjs';

const read=file=>fs.readFileSync(file,'utf8');
const hash='a'.repeat(64);
const baseMetrics={
  uniqueMechanicCount:7,
  uniqueFunctionalUiCount:5,
  gameplayActionCount:18,
  stateVariableCount:10,
  meaningfulStateTransitionCount:14,
  uniqueGameplayStateCount:12,
  uniqueInteractedMechanicCount:5,
  systemDependencyCount:6,
  enemyOrWorldEntityCount:8,
  winPathCount:1,
  failPathCount:1,
  retryPathCount:1,
  gameplayScreenRatio:.46,
  duplicateActionRatio:0,
  testUiRatio:0,
  contentVariationCount:5,
};
function initialCycle(pass=true){
  return {unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',pass,startWorldEntry:pass,realPlayerInput:pass,coreGameplayAction:pass,actualStateChange:pass,growthRewardOrMeaningfulChoice:pass,riskFailureOrResourcePressure:pass,goalOrCycleEnd:pass,retryPath:pass};
}
function depth(pass=true){
  return {mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',pass,status:pass?'COMPLETE':'PENDING_AFTER_CONTENT_EXPANSION',targetMinutes:30,validatedMinutes:pass?30:0,actualGameplayMinutes:pass?30:0,elapsedRealMilliseconds:pass?1800000:0,realContent:pass,fakeProgress:false,testHarness:false,directStageClick:false,metrics:baseMetrics,varietyEvents:pass?['combat','upgrade','wave']:[]};
}
function evidence({finalDepth=true,metrics=baseMetrics,categoryProfile='TOWER_DEFENSE'}={}){
  return {
    version:WEB_VALIDATION_SCHEMA_VERSION,
    validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,
    target:'web',validated:true,pass:true,
    gameplayInteractionPerformed:true,interactionCount:18,stateChanged:true,stateChangeCount:14,
    musicRuntime:{pass:true},runtimeSmokePassed:true,
    mobileViewport:{width:390,height:844,touch:true},
    before:{scrollWidth:390,viewportWidth:390},after:{scrollWidth:390,viewportWidth:390},
    initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',
    initialPlayableCycle:initialCycle(true),initialPlayableCyclePassed:true,
    sourceFootprint:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:18000,scriptBytes:9000,mechanicCount:7,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',proxyMarkers:0,stageButtons:false,winPathCount:1,failPathCount:1,retryPathCount:1},
    substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:18000,executableBytes:9000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
    implementationMetrics:metrics,
    contentDepthValidation:depth(finalDepth),
    terminalOutcome:{required:true,reached:true,result:'victory'},
    categoryProfile,
    sourceIndexSha256:hash,designBaselineSha256:hash,
    strictReview:{totalScore:92,hardFailures:[]},webStrictScore:92,
  };
}

assert.equal(WEB_VALIDATION_SCHEMA_VERSION,13,'Web evidence schema must carry staged-play semantics');
assert.deepEqual(WEB_COMMON_SCORE_WEIGHTS,{
  CORE_GAME_LOOP:15,
  SYSTEM_CONNECTIVITY:10,
  CONTROLS_AND_GAME_FEEL:8,
  FUNCTIONAL_UI_UX:7,
  PROGRESSION_GROWTH_REWARD:7,
  RISK_FAILURE_RETRY:5,
  GAMEPLAY_FEEDBACK:4,
  STABILITY_PERFORMANCE:4,
},'common Web score must remain the central-policy 60 points');
assert.equal(Object.values(WEB_COMMON_SCORE_WEIGHTS).reduce((a,b)=>a+b,0),60);
assert.deepEqual(WEB_CATEGORY_PROFILE_MAPPING,{
  ACTION_SURVIVAL_ROGUELITE:'SURVIVAL',
  SINGLE_DEFENSE_STRATEGY:'TOWER_DEFENSE',
  PUZZLE:'PUZZLE',
  CASUAL:'DESIGN_DERIVED_PROFILE_REQUIRED',
  IDLE_GROWTH_RPG:'RPG',
  STORY_COMPLETE_RPG:'STORY_ADVENTURE',
  ROLEPLAY_LIFE_AVATAR:'LIFE_ROLEPLAY',
  SIMULATOR_TYCOON_INCREMENTAL:'TYCOON_SIMULATOR',
  BATTLEGROUND_FIGHTING_SHOOTER:'BATTLE_SHOOTER',
  SURVIVAL_HORROR_ESCAPE:'SURVIVAL',
  OBBY_PARTY_MINIGAME:'OBBY_PLATFORMER',
  STORY_RPG_ADVENTURE_RPG:'STORY_ADVENTURE',
});
for(const [profile,weights] of Object.entries(WEB_CATEGORY_SCORE_WEIGHTS))assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),40,`${profile} profile must remain 40 points`);
assert.equal(resolveWebCategoryProfile('ROLEPLAY_LIFE_AVATAR'),'LIFE_ROLEPLAY');
assert.equal(resolveWebCategoryProfile('SINGLE_DEFENSE_STRATEGY'),'TOWER_DEFENSE');
assert.equal(resolveWebCategoryProfile('CASUAL'),'DESIGN_DERIVED_PROFILE_REQUIRED');
assert.equal(resolveWebCategoryProfile('CASUAL',{designDerivedCategoryProfile:'PUZZLE'}),'PUZZLE');

const towerSource=`
  data-playable-cycle-contract="ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE"
  tower placement lane route path grid wave enemy turret upgrade level coin gold cost income resource
  range slow damage choice strategy feedback effect sound score reward growth unlock retry victory defeat
`;
const towerScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:towerSource,evidence:evidence()});
assert.deepEqual(towerScore.hardFailures,[],'a connected real tower-defense loop should clear Web hard gates');
assert.ok(towerScore.commonScore<=60&&towerScore.commonScore>=50,'common score must use the 60-point scale');
assert.equal(towerScore.categoryScore,40,'matching tower-defense profile must use its full 40-point profile');
assert.ok(towerScore.totalScore>=80,'a strong real implementation remains Top30 score-capable');
assert.equal(towerScore.hardGates.COMPLETE_PLAYABLE_GAMEPLAY_CYCLE,true);
assert.equal(towerScore.hardGates.NO_TEST_PROXY,true);
assert.equal(towerScore.hardGates.NO_FAKE_PROGRESS,true);
assert.equal(towerScore.hardGates.CATEGORY_PROFILE_MATCH,true);

const noDepth=evidence({finalDepth:false});
const initialOnly=evaluateWebValidationEvidence(noDepth,{minimumScore:80,requireFinalContentDepth:false});
assert.equal(initialOnly.pass,true,'initial real-play cycle must not require 30-minute depth');
const top30WithoutDepth=evaluateWebValidationEvidence(noDepth,{minimumScore:80,requireFinalContentDepth:true});
assert.equal(top30WithoutDepth.pass,false,'Top30 must still require final real 30-minute content depth');
assert.ok(top30WithoutDepth.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
assert.equal(finalContentDepthPass(evidence()),true,'real elapsed 30-minute evidence must pass final depth contract');
const fakeElapsed=evidence();fakeElapsed.contentDepthValidation={...fakeElapsed.contentDepthValidation,elapsedRealMilliseconds:120000};
assert.equal(finalContentDepthPass(fakeElapsed),false,'declared 30 minutes cannot replace actual elapsed gameplay time');

const harnessScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:`${towerSource}<button data-session-stage="1">0-5 min</button><button data-session-stage="2">5-15 min</button>`,evidence:evidence()});
assert.equal(harnessScore.hardGates.NO_TEST_PROXY,false,'test/stage harness must never count as a real game');
assert.equal(harnessScore.hardGates.NO_FAKE_PROGRESS,false,'time-stage progress must be rejected');
assert.ok(harnessScore.hardFailures.includes('NO_TEST_PROXY'));
assert.ok(harnessScore.hardFailures.includes('NO_FAKE_PROGRESS'));

const duplicateMetrics={...baseMetrics,uniqueFunctionalUiCount:1,duplicateActionRatio:.96};
const duplicateScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:towerSource,evidence:evidence({metrics:duplicateMetrics})});
assert.equal(duplicateScore.hardGates.REAL_PLAYABLE_GAME,false,'repeated equivalent buttons must not inflate functional UI/mechanic quality');
assert.ok(duplicateScore.scores.FUNCTIONAL_UI_UX<WEB_COMMON_SCORE_WEIGHTS.FUNCTIONAL_UI_UX);

const mismatchEvidence=evidence({categoryProfile:'PUZZLE'});
const mismatchScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:towerSource,evidence:mismatchEvidence});
assert.equal(mismatchScore.hardGates.CATEGORY_PROFILE_MATCH,false,'wrong runtime/category profile must hard-fail before scoring advancement');
assert.ok(mismatchScore.hardFailures.includes('CATEGORY_PROFILE_MATCH'));

const stale=evidence();stale.validationSchemaVersion=12;stale.version=12;
assert.ok(evaluateWebValidationEvidence(stale,{minimumScore:80}).blockers.includes('WEB_VALIDATION_SCHEMA_STALE'),'stale evidence schema must not be accepted');
assert.equal(sha256Text('same'),sha256Text('same'));
assert.notEqual(sha256Text('same'),sha256Text('changed'));

const bootstrap=read('tools/company-development-web-bootstrap.mjs');
assert.match(bootstrap,/ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
assert.doesNotMatch(bootstrap,/const\s+SESSION_MINUTES\s*=\s*30/,'initial bootstrap must not restore a 30-minute requirement');
assert.doesNotMatch(bootstrap,/data-session-minutes=\\?"30\\?"/,'initial generation prompt must not require session-minute metadata');

const validator=read('tools/company-development-web-gameplay-validation.mjs');
assert.match(validator,/validation-stage/,'same canonical validator must expose staged validation');
assert.match(validator,/initial-cycle/);
assert.match(validator,/final-content-depth/);
assert.match(validator,/REAL_ELAPSED_GAMEPLAY/);
assert.match(validator,/elapsedRealMilliseconds/);
assert.doesNotMatch(validator,/FINAL_CONTENT_WINDOWS/,'final depth must not use old time-window proxy stages');
assert.doesNotMatch(validator,/data-content-depth-stage/,'validator must not inject hidden time-stage controls');
assert.doesNotMatch(validator,/GAMEPLAY_MILESTONE_DEPTH/,'final 30-minute proof must be real elapsed gameplay, not milestone proxy metadata');

const shared=read('web-games/_shared/vibe2-final.js');
assert.match(shared,/data-playable-cycle-contract="ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE"/);
assert.match(shared,/data-gameplay-surface="main"/);
assert.doesNotMatch(shared,/data-session-/,'shared real-game runtime must not expose validation session metadata');
assert.doesNotMatch(shared,/(?:0\s*[~\-–]\s*5|5\s*[~\-–]\s*15|15\s*[~\-–]\s*25|25\s*[~\-–]\s*30)\s*분/,'shared real-game UX must not expose validator time windows');
assert.doesNotMatch(shared,/sessionFlags|setPhase|syncContract/,'shared gameplay state must not be driven by validation-stage flags');
assert.match(shared,/const key='jg-final:'\+C\.id/,'existing save key must remain unchanged');
assert.match(shared,/C\.mode==='bug-defense'\?30:15/,'existing defense wave balance must remain unchanged');

const celestial=read('web-games/seed-single-defense-strat-celestial-bastion/index.html');
assert.match(celestial,/mode:'celestial-defense'/,'historical real game mode must be preserved');
assert.match(celestial,/15개 전투 웨이브/,'historical real-game content must remain preserved');
assert.match(celestial,/\/web-games\/_shared\/vibe2-final\.js/,'historical game must keep its existing shared real engine');

console.log('COMPANY_WEB_REAL_GAME_REGRESSION=PASS');
