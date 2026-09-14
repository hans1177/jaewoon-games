// 파일명: qa/company-web-real-game-regression.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {staticApprovedScopeCoverage,runtimeApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';
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
const runtimeFeatureEvidence={
  enemyTypes:['normal','fast','armored'],newEnemyTypes:['fast','armored'],enemyTypeCount:3,newEnemyTypeCount:2,
  areas:['outer','inner'],newAreas:['inner'],areaCount:2,newAreaCount:1,
  objectives:['survive-wave','protect-core'],newObjectives:['protect-core'],objectiveCount:2,newObjectiveCount:1,
  towerTypes:['bolt','frost','burst'],newTowerTypes:['frost','burst'],towerTypeCount:3,
  towerEffectProfiles:['bolt:damage','frost:slow','burst:splash'],newTowerEffects:['frost:slow','burst:splash'],towerEffectProfileCount:3,
  strategyChoices:['place-bolt','place-frost'],strategyCombatOutcomes:[{choiceMechanic:'place-bolt',outcomeSignature:'hp:-8|wave:+1'},{choiceMechanic:'place-frost',outcomeSignature:'hp:-2|wave:+1'}],strategyCombatOutcomeCount:2,
  independentStrategyEvidence:{required:true,pass:true,status:'PASS',independentContexts:2,choiceCount:2,outcomeCount:2},
  placementResultCount:2,newContentDimensionCount:5,
};
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
  enemyTypeCount:3,newEnemyTypeCount:2,
  areaCount:2,newAreaCount:1,
  objectiveCount:2,newObjectiveCount:1,
  towerTypeCount:3,towerEffectProfileCount:3,
  strategyChoiceCount:2,strategyCombatOutcomeCount:2,
  placementResultCount:2,newContentDimensionCount:5,
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
function depth(pass=true,metrics=baseMetrics){
  return {mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',pass,status:pass?'COMPLETE':'PENDING_AFTER_CONTENT_EXPANSION',targetMinutes:30,validatedMinutes:pass?30:0,actualGameplayMinutes:pass?30:0,elapsedRealMilliseconds:pass?2100000:0,meaningfulGameplayMilliseconds:pass?1800000:0,excludedRepeatedActionMilliseconds:pass?240000:0,excludedRetryMilliseconds:pass?60000:0,realContent:pass,fakeProgress:false,testHarness:false,directStageClick:false,metrics,runtimeFeatureEvidence,varietyEvents:pass?['enemy:fast','area:inner','objective:protect-core']:[]};
}
function evidence({finalDepth=true,metrics=baseMetrics,categoryProfile='TOWER_DEFENSE',runtime=runtimeFeatureEvidence}={}){
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
    runtimeFeatureEvidence:runtime,
    contentDepthValidation:depth(finalDepth,metrics),
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

const keywordOnlyMetrics={...baseMetrics,towerTypeCount:1,towerEffectProfileCount:1,strategyChoiceCount:1,strategyCombatOutcomeCount:1,placementResultCount:0};
const keywordOnlyRuntime={...runtimeFeatureEvidence,towerTypes:['fake-one'],towerTypeCount:1,towerEffectProfiles:['fake-one:damage'],towerEffectProfileCount:1,strategyChoices:['fake-choice'],strategyCombatOutcomes:[{choiceMechanic:'fake-choice',outcomeSignature:'same'}],strategyCombatOutcomeCount:1,placementResultCount:0,independentStrategyEvidence:{required:true,pass:false,status:'INSUFFICIENT_DISTINCT_STRATEGY_CHOICES'}};
const keywordOnlyScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:`${towerSource} tower tower turret slow range strategy choice strategic damage`,evidence:evidence({metrics:keywordOnlyMetrics,runtime:keywordOnlyRuntime})});
assert.equal(keywordOnlyScore.scores.CATEGORY_PLACEMENT_AND_ROUTE,0,'placement words must not replace a real placement result');
assert.equal(keywordOnlyScore.scores.CATEGORY_TOWER_VARIETY,0,'tower words must not replace distinct runtime tower types/effects');
assert.equal(keywordOnlyScore.scores.CATEGORY_STRATEGIC_CHOICE,0,'strategy words must not replace choices with different combat outcomes');
const sameOutcomeRuntime={...runtimeFeatureEvidence,strategyChoices:['left','right'],strategyCombatOutcomes:[{choiceMechanic:'left',outcomeSignature:'same-result'},{choiceMechanic:'right',outcomeSignature:'same-result'}],independentStrategyEvidence:{required:true,pass:false,status:'STRATEGY_BRANCH_OUTCOMES_NOT_DIVERGENT',choiceCount:2,outcomeCount:1}};
const sameOutcomeScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:towerSource,evidence:evidence({runtime:sameOutcomeRuntime})});
assert.equal(sameOutcomeScore.scores.CATEGORY_STRATEGIC_CHOICE,0,'two named choices with the same combat result are not strategic diversity');

const placementInventory=[{id:'scope-place',path:'coreLoop[0]',label:'Read the next enemy wave and place towers on positions that cover the threatened route.'}];
const shallowPlacement='<main data-approved-scope-count="1"><button data-scope-id="scope-place" data-mechanic-id="tower-place">타워 설치</button></main>';
const shallowStatic=staticApprovedScopeCoverage(shallowPlacement,placementInventory);
assert.equal(shallowStatic.pass,false,'tower placement cannot be accepted from a button label alone');
assert.ok(shallowStatic.blockers.some(x=>x.startsWith('APPROVED_SCOPE_TOWER_POSITION_INPUT_REQUIRED:')));
const shallowRuntime=runtimeApprovedScopeCoverage({declaredCount:1,visibleScopeIds:['scope-place'],interactedScopeIds:['scope-place'],mechanicBindings:['tower-place'],inventory:placementInventory,interactionResults:[{scopeId:'scope-place',mechanicId:'tower-place',clicked:true,stateChanged:true,positionSelected:false,placementResult:false,towerEntityDelta:0}]});
assert.equal(shallowRuntime.pass,false,'click + state change is not a completed tower-placement requirement');
assert.ok(shallowRuntime.blockers.some(x=>x.startsWith('APPROVED_SCOPE_TOWER_PLACEMENT_RESULT_REQUIRED:')));
const realPlacement=runtimeApprovedScopeCoverage({declaredCount:1,visibleScopeIds:['scope-place'],interactedScopeIds:['scope-place'],mechanicBindings:['tower-place'],inventory:placementInventory,interactionResults:[{scopeId:'scope-place',mechanicId:'tower-place',clicked:true,stateChanged:true,positionSelected:true,placementResult:true,towerEntityDelta:1}]});
assert.equal(realPlacement.pass,true,'position choice plus materialized tower result completes the placement scope');

const noDepth=evidence({finalDepth:false});
const initialOnly=evaluateWebValidationEvidence(noDepth,{minimumScore:80,requireFinalContentDepth:false});
assert.equal(initialOnly.pass,true,'initial real-play cycle must not require 30-minute depth');
const top30WithoutDepth=evaluateWebValidationEvidence(noDepth,{minimumScore:80,requireFinalContentDepth:true});
assert.equal(top30WithoutDepth.pass,false,'Top30 must still require final real 30-minute content depth');
assert.ok(top30WithoutDepth.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
assert.equal(finalContentDepthPass(evidence()),true,'30 minutes of meaningful gameplay plus new content dimensions must pass final depth contract');
const repeatedTimeOnly=evidence();repeatedTimeOnly.contentDepthValidation={...repeatedTimeOnly.contentDepthValidation,elapsedRealMilliseconds:2100000,meaningfulGameplayMilliseconds:600000,validatedMinutes:30,actualGameplayMinutes:10};
assert.equal(finalContentDepthPass(repeatedTimeOnly),false,'restart/repeated-action wall time cannot count toward 30 minutes of meaningful content');
const shallowContent=evidence();shallowContent.implementationMetrics={...baseMetrics,newContentDimensionCount:1};shallowContent.contentDepthValidation={...shallowContent.contentDepthValidation,metrics:shallowContent.implementationMetrics,runtimeFeatureEvidence:{...runtimeFeatureEvidence,newContentDimensionCount:1}};
assert.equal(finalContentDepthPass(shallowContent),false,'30 minutes of the same content cannot pass without new enemies/areas/objectives/strategy dimensions');

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
assert.match(bootstrap,/VIBE2_PRESERVED_SOURCE_REPAIR/,'missing behavior in a preserved source must route into Vibe repair');
assert.match(bootstrap,/기존 저장 키·저장 구조·규칙·진행을 보존/,'Vibe repair must preserve existing source/save semantics');
assert.match(bootstrap,/VIBE_DEVELOPMENT_CONTEXT/,'Vibe must inspect gameplay sketch, source structure and patch plan before coding');
assert.doesNotMatch(bootstrap,/const\s+SESSION_MINUTES\s*=\s*30/,'initial bootstrap must not restore a 30-minute requirement');
assert.doesNotMatch(bootstrap,/data-session-minutes=\\?"30\\?"/,'initial generation prompt must not require session-minute metadata');

const validator=read('tools/company-development-web-gameplay-validation.mjs');
assert.match(validator,/validation-stage/,'same canonical validator must expose staged validation');
assert.match(validator,/initial-cycle/);
assert.match(validator,/final-content-depth/);
assert.match(validator,/REAL_ELAPSED_GAMEPLAY/);
assert.match(validator,/meaningfulGameplayMilliseconds/,'final depth must count meaningful gameplay time');
assert.match(validator,/excludedRepeatedActionMilliseconds/,'repeated action time must be excluded');
assert.match(validator,/excludedRetryMilliseconds/,'retry time must be excluded');
assert.match(validator,/selectPlacementPosition/,'validator must perform actual placement position input');
assert.doesNotMatch(validator,/FINAL_CONTENT_WINDOWS/,'final depth must not use old time-window proxy stages');
assert.match(validator,/data-content-depth-stage/,'validator must detect and reject hidden time-stage controls');
assert.doesNotMatch(validator,/setAttribute\(\s*["']data-content-depth-stage|dataset\.contentDepthStage\s*=/,'validator must not inject hidden time-stage controls');
assert.doesNotMatch(validator,/GAMEPLAY_MILESTONE_DEPTH/,'final 30-minute proof must be real gameplay, not milestone proxy metadata');

const cycle=read('tools/company-development-validation-cycle.mjs');
assert.match(cycle,/RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION/,'insufficient final content must return to canonical Web development');
assert.match(cycle,/insufficientContentReturnsToDevelopment:true/);
assert.match(cycle,/finalDepthConsumesPostDevelopmentSource:true/);

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
assert.match(celestial,/window\.GAME_CONFIG\.validationScopes=/,'canonical preserved source must bind current approved scope evidence');
assert.match(celestial,/const key='jg-final:'\+C\.id/,'inlined immutable source must preserve the historical save-key meaning');
assert.doesNotMatch(celestial,/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js/i,'runtime source must be immutable and inlined before Vibe repairs missing behavior');

console.log('COMPANY_WEB_REAL_GAME_REGRESSION=PASS');