import assert from 'node:assert/strict';
import fs from 'node:fs';
import {staticApprovedScopeCoverage,runtimeApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';
import {finalContentDepthPass,scoreWebStrictImplementation} from '../tools/company-web-validation-evidence-contract.mjs';

const hash='a'.repeat(64);
const runtimeFeatureEvidence={
  enemyTypes:['normal','fast','armored'],newEnemyTypes:['fast','armored'],enemyTypeCount:3,newEnemyTypeCount:2,
  areas:['outer','inner'],newAreas:['inner'],areaCount:2,newAreaCount:1,
  objectives:['survive-wave','protect-core'],newObjectives:['protect-core'],objectiveCount:2,newObjectiveCount:1,
  towerTypes:['bolt','frost','burst'],newTowerTypes:['frost','burst'],towerTypeCount:3,
  towerEffectProfiles:['bolt:damage','frost:slow','burst:splash'],newTowerEffects:['frost:slow','burst:splash'],towerEffectProfileCount:3,
  strategyChoices:['place-bolt','place-frost'],
  strategyCombatOutcomes:[{choiceMechanic:'place-bolt',outcomeSignature:'hp:-8|wave:+1'},{choiceMechanic:'place-frost',outcomeSignature:'hp:-2|wave:+1'}],
  strategyCombatOutcomeCount:2,placementResultCount:2,newContentDimensionCount:5,
};
const baseMetrics={
  uniqueMechanicCount:7,uniqueFunctionalUiCount:5,gameplayActionCount:18,stateVariableCount:10,
  meaningfulStateTransitionCount:14,uniqueGameplayStateCount:12,uniqueInteractedMechanicCount:5,
  systemDependencyCount:6,enemyOrWorldEntityCount:8,enemyTypeCount:3,newEnemyTypeCount:2,
  areaCount:2,newAreaCount:1,objectiveCount:2,newObjectiveCount:1,towerTypeCount:3,towerEffectProfileCount:3,
  strategyChoiceCount:2,strategyCombatOutcomeCount:2,placementResultCount:2,newContentDimensionCount:5,
  winPathCount:1,failPathCount:1,retryPathCount:1,gameplayScreenRatio:.46,duplicateActionRatio:0,testUiRatio:0,contentVariationCount:5,
};
const cycle={unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',pass:true,startWorldEntry:true,realPlayerInput:true,coreGameplayAction:true,actualStateChange:true,growthRewardOrMeaningfulChoice:true,riskFailureOrResourcePressure:true,goalOrCycleEnd:true,retryPath:true};
function evidence(metrics=baseMetrics,runtime=runtimeFeatureEvidence){
  return {
    version:13,validationSchemaVersion:13,validated:true,pass:true,gameplayInteractionPerformed:true,interactionCount:18,stateChanged:true,stateChangeCount:14,
    musicRuntime:{pass:true},runtimeSmokePassed:true,mobileViewport:{width:390,height:844,touch:true},before:{scrollWidth:390,viewportWidth:390},after:{scrollWidth:390,viewportWidth:390},
    initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',initialPlayableCycle:cycle,initialPlayableCyclePassed:true,
    sourceFootprint:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:18000,scriptBytes:9000,mechanicCount:7,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',proxyMarkers:0,stageButtons:false,winPathCount:1,failPathCount:1,retryPathCount:1},
    substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:18000,executableBytes:9000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
    implementationMetrics:metrics,runtimeFeatureEvidence:runtime,
    contentDepthValidation:{mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',pass:true,status:'COMPLETE',targetMinutes:30,validatedMinutes:30,actualGameplayMinutes:30,elapsedRealMilliseconds:2100000,meaningfulGameplayMilliseconds:1800000,excludedRepeatedActionMilliseconds:240000,excludedRetryMilliseconds:60000,realContent:true,fakeProgress:false,testHarness:false,directStageClick:false,metrics,runtimeFeatureEvidence:runtime,varietyEvents:['enemy:fast','area:inner','objective:protect-core']},
    terminalOutcome:{required:true,reached:true,result:'victory'},categoryProfile:'TOWER_DEFENSE',sourceIndexSha256:hash,designBaselineSha256:hash,strictReview:{totalScore:92,hardFailures:[]},webStrictScore:92,
  };
}

const placementInventory=[{id:'scope-place',path:'coreLoop[0]',label:'Read the next enemy wave and place towers on positions that cover the threatened route.'}];
const shallowStatic=staticApprovedScopeCoverage('<main data-approved-scope-count="1"><button data-scope-id="scope-place" data-mechanic-id="tower-place">타워 설치</button></main>',placementInventory);
assert.equal(shallowStatic.pass,false,'button-only tower placement must fail static scope completion');
assert.ok(shallowStatic.blockers.some(x=>x.startsWith('APPROVED_SCOPE_TOWER_POSITION_INPUT_REQUIRED:')));
const shallowRuntime=runtimeApprovedScopeCoverage({declaredCount:1,visibleScopeIds:['scope-place'],interactedScopeIds:['scope-place'],mechanicBindings:['tower-place'],inventory:placementInventory,interactionResults:[{scopeId:'scope-place',mechanicId:'tower-place',clicked:true,stateChanged:true,positionSelected:false,placementResult:false,towerEntityDelta:0}]});
assert.equal(shallowRuntime.pass,false,'click + state change must not count as real tower placement');
assert.ok(shallowRuntime.blockers.some(x=>x.startsWith('APPROVED_SCOPE_TOWER_PLACEMENT_RESULT_REQUIRED:')));
const realPlacement=runtimeApprovedScopeCoverage({declaredCount:1,visibleScopeIds:['scope-place'],interactedScopeIds:['scope-place'],mechanicBindings:['tower-place'],inventory:placementInventory,interactionResults:[{scopeId:'scope-place',mechanicId:'tower-place',clicked:true,stateChanged:true,positionSelected:true,placementResult:true,towerEntityDelta:1}]});
assert.equal(realPlacement.pass,true,'position choice plus materialized tower must pass');

const keywordMetrics={...baseMetrics,towerTypeCount:1,towerEffectProfileCount:1,strategyChoiceCount:1,strategyCombatOutcomeCount:1,placementResultCount:0};
const keywordRuntime={...runtimeFeatureEvidence,towerTypes:['fake-one'],towerTypeCount:1,towerEffectProfiles:['fake-one:damage'],towerEffectProfileCount:1,strategyChoices:['fake-choice'],strategyCombatOutcomes:[{choiceMechanic:'fake-choice',outcomeSignature:'same'}],strategyCombatOutcomeCount:1,placementResultCount:0};
const keywordScore=scoreWebStrictImplementation({category:'SINGLE_DEFENSE_STRATEGY',sourceText:'tower tower turret placement strategy choice slow range damage upgrade economy wave',evidence:evidence(keywordMetrics,keywordRuntime)});
assert.equal(keywordScore.scores.CATEGORY_PLACEMENT_AND_ROUTE,0,'placement words cannot replace runtime placement');
assert.equal(keywordScore.scores.CATEGORY_TOWER_VARIETY,0,'tower words cannot replace distinct runtime tower types/effects');
assert.equal(keywordScore.scores.CATEGORY_STRATEGIC_CHOICE,0,'strategy words cannot replace divergent combat outcomes');

assert.equal(finalContentDepthPass(evidence()),true,'real meaningful content depth should pass');
const repeatedOnly=evidence();
repeatedOnly.contentDepthValidation={...repeatedOnly.contentDepthValidation,elapsedRealMilliseconds:2100000,meaningfulGameplayMilliseconds:600000,validatedMinutes:30,actualGameplayMinutes:10};
assert.equal(finalContentDepthPass(repeatedOnly),false,'restart/repeated-action wall time cannot inflate final content depth');
const shallowContent=evidence();
shallowContent.implementationMetrics={...baseMetrics,newContentDimensionCount:1};
shallowContent.contentDepthValidation={...shallowContent.contentDepthValidation,metrics:shallowContent.implementationMetrics,runtimeFeatureEvidence:{...runtimeFeatureEvidence,newContentDimensionCount:1}};
assert.equal(finalContentDepthPass(shallowContent),false,'same-content repetition cannot pass final depth');

const bootstrap=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
assert.match(bootstrap,/VIBE2_PRESERVED_SOURCE_REPAIR/,'preserved source must be repairable by Vibe');
assert.match(bootstrap,/forceRepair/,'runtime must be able to force Vibe repair after failed validation');
assert.match(bootstrap,/VIBE2_PRESERVED_SOURCE_REPAIR_FAILED/,'failed preserved-source repair must not silently replace the game');
const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
assert.match(validator,/selectPlacementPosition/,'validator must perform actual position input');
assert.match(validator,/meaningfulGameplayMilliseconds/);
assert.match(validator,/excludedRepeatedActionMilliseconds/);
assert.match(validator,/excludedRetryMilliseconds/);
const cycleSource=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
assert.match(cycleSource,/RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION/,'insufficient content must return to canonical Web development');
assert.match(cycleSource,/insufficientContentReturnsToDevelopment:true/);
assert.match(cycleSource,/finalDepthConsumesPostDevelopmentSource:true/);

console.log('COMPANY_WEB_BEHAVIORAL_REGRESSION=PASS');
