import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_REQUIRED_FIELDS,GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const devCycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const releaseCycle=fs.readFileSync('tools/company-release-production-cycle.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const roles=['planning','graphics','development','qa','balance'];

test('one central policy source owns class design meeting and release rules',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/sourceOfTruth: COMPANY_FLOW\.md/);
  assert.match(flow,/format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow,/machineContractsMayMirrorPolicyButCannotCreatePolicy: true/);
  assert.match(flow,/evidenceFilesCannotCreatePolicy: true/);
});

test('GAME_SEED mirrors the current selected-platform policy',()=>{
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.equal(directive.gameSeed.primaryPlatformIsDefaultNotLock,true);
  assert.equal(directive.gameSeed.initialPlayMode,'PROJECT_DEFINED');
  assert.deepEqual(directive.gameSeed.requiredFields,GAME_SEED_REQUIRED_FIELDS);
  assert.equal(GAME_SEED_POLICY.initialTargetPlatform,'ROBLOX');
  assert.deepEqual([...GAME_SEED_POLICY.allowedTargetPlatforms],['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.match(flow,/initialTargetPlatform: ROBLOX/);
  assert.match(flow,/projectMaySelectAnyAllowedPlatform: true/);
});

test('GAME_SEED validator accepts any allowed selected platform and rejects unsupported targets',()=>{
  const base={
    GAME_CATEGORY:'CASUAL',
    REFERENCE_GAMES:['Released successful reference'],
    CORE_FUN_TO_LEARN:'clear repeatable interaction pattern',
    CORE_LOOP:['action','feedback','choice','reward'],
    DISTINCT_IDENTITY:'original world visual identity characters and system combination',
    MARKET_EVIDENCE_SUMMARY:'UNKNOWN numeric fields; qualitative benchmark only',
    TARGET_AUDIENCE:'mobile players',
    TARGET_SESSION_DIRECTION:'short repeatable sessions',
    INITIAL_TARGET_PLATFORM:'UNITY',
    INITIAL_PLAY_MODE:'SINGLE_PLAYER',
    CROSS_PLATFORM_EXPANSION_VALUE:'MEDIUM'
  };
  assert.equal(validateGameSeed(base).pass,true);
  assert.equal(validateGameSeed({...base,INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'}).pass,false);
  const invalid=validateGameSeed({...base,MARKET_EVIDENCE_SUMMARY:{numericClaims:[{metric:'rating',value:4.8}]}});
  assert.equal(invalid.pass,false);
  assert.ok(invalid.errors.some(x=>x.includes('.source is required')));
  assert.ok(invalid.errors.some(x=>x.includes('.observedAt is required')));
});

test('DESIGN_ONLY flow and baseline mirror current central requirements',()=>{
  const design=directive.classes.DESIGN_ONLY;
  assert.equal(design.requiredFlow[0],'GAME_SEED');
  assert.equal(design.requiredFlow[1],'GAME_DESIGNER_DRAFT');
  for(const token of [
    'GAME_SEED_COMPLETE','DISTINCT_GAME_IDENTITY','CORE_FUN_CLEAR',
    'CORE_LOOP_ACTION_FEEDBACK_CHOICE_REWARD','MARKET_TARGET_DIRECTION_RECORDED',
    'TARGET_PLATFORM_UX_DIRECTION_DEFINED','PLATFORM_SELECTION_RECORDED',
    'FIVE_DISTINCT_LEAD_MODELS','FIVE_DEPARTMENT_SCORES_RECORDED',
    'PER_DEPARTMENT_MULTIMODEL_REVIEW_PASS','NO_HIDDEN_FATAL_CONFLICT'
  ])assert.ok(design.baselineReadyRequires.includes(token),`missing DESIGN_ONLY requirement: ${token}`);
  assert.equal(design.readyState,'DESIGN_BASELINE_READY');
  assert.match(flow,/TARGET_PLATFORM_UX_DIRECTION_DEFINED/);
  assert.match(flow,/FIVE_DEPARTMENT_SCORES_RECORDED/);
});

test('five departments keep distinct lead models and multimodel reviews',()=>{
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.equal(directive.ai.departmentLeadAssignmentRemappable,true);
  const leadModels=roles.map(role=>directive.ai.departmentLeadModels?.[role]);
  assert.equal(new Set(leadModels).size,5);
  assert.ok(leadModels.every(model=>directive.ai.modelPool.includes(model)));
  assert.ok(directive.ai.minDistinctModelsPerDepartment>=3);
  assert.match(flow,/fiveDistinctLeadModelIdsRequiredPerCycle: true/);
  assert.match(flow,/allModelsWithinDepartmentMustBeDistinct: true/);
  assert.match(cycle,/DEPARTMENT_LEAD_GATE/);
  assert.match(devCycle,/DEPARTMENT_LEAD_GATE/);
  assert.match(releaseCycle,/DEPARTMENT_LEAD_GATE/);
});

test('department lead remains representative and rebuttal owner',()=>{
  assert.equal(directive.ai.departmentRepresentativeAuthoredByLead,true);
  assert.equal(directive.ai.departmentRebuttalAuthoredByLead,true);
  assert.equal(directive.ai.meeting.internalRepresentativeOwner,'DEPARTMENT_LEAD_MODEL');
  assert.equal(directive.ai.meeting.rebuttalOwner,'DEPARTMENT_LEAD_MODEL');
  assert.match(flow,/representativeAuthor: DEPARTMENT_LEAD/);
  assert.match(flow,/rebuttalAuthor: SAME_DEPARTMENT_LEAD/);
  assert.match(cycle,/representativeAuthoredByLead:true/);
  assert.match(cycle,/rebuttalAuthoredByDepartmentLeads:true/);
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and remains primary in RELEASE_CONFIRMED',()=>{
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_DEVELOPMENT_ENGINE');
  assert.match(flow,/Vibe2:\n  startsAt: DEVELOPMENT_CONFIRMED/);
});

test('DEVELOPMENT_CONFIRMED requires Web gameplay and music before selected-platform validation',()=>{
  const dev=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(dev.executionMode,'GATED_DIRECT');
  assert.equal(dev.resumeFromLatestEvidence,true);
  assert.equal(dev.webPurpose,'REQUIRED_FIRST_PLAYABLE_GAMEPLAY_AND_MUSIC_VALIDATION');
  assert.equal(dev.targetPlatformPurpose,'TECHNICAL_AND_GAMEPLAY_VALIDATION');
  assert.equal(dev.webBeforeTargetPlatformByDefault,true);
  assert.equal(dev.targetPlatformMayRunImmediately,false);
  assert.equal(dev.webGameplayValidationRequired,true);
  assert.equal(dev.musicValidationRequired,true);
  assert.equal(dev.webCandidateMustPassBeforeTargetPlatformDispatch,true);
  assert.equal(dev.webCandidatePublicPromotionRequiresValidationPass,true);
  assert.equal(dev.platformSpecificValidationRequired,true);
  assert.equal(dev.materialChangeRequiresTargetedRevalidation,true);
  assert.equal(dev.artbookRevisionOnlyAfterBaselineReady,true);
  assert.deepEqual(dev.waitingStates,['WAITING_WEB_PLAYABLE','WAITING_WEB_GAMEPLAY_VALIDATION','WAITING_WEB_GAMEPLAY_REVALIDATION','WAITING_TARGET_PLATFORM_VALIDATION','WAITING_TARGET_PLATFORM_REVALIDATION','WAITING_REVALIDATION']);
  for(const token of ['WEB_PLAYABLE_QUEUE','WEB_PLAYABLE_BOOTSTRAP','MUSIC_RUNTIME_BIND','WEB_GAMEPLAY_AND_MUSIC_VALIDATION','WEB_EVIDENCE_DEPARTMENT_MEETING','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_GAMEPLAY_VALIDATION','TARGET_PLATFORM_TECHNICAL_VALIDATION','TARGET_PLATFORM_EVIDENCE_DEPARTMENT_MEETING'])assert.ok(dev.requiredFlow.includes(token));
  assert.match(flow,/webPurpose: REQUIRED_FIRST_PLAYABLE_GAMEPLAY_AND_MUSIC_VALIDATION/);
  assert.match(flow,/targetPlatformPurpose: TECHNICAL_AND_GAMEPLAY_VALIDATION/);
  assert.doesNotMatch(JSON.stringify(dev),/ANDROID_TECHNICAL_VALIDATION_PROTOTYPE/);
  assert.match(JSON.stringify(dev),/WEB_GAMEPLAY_AND_MUSIC_VALIDATION/);
  assert.match(devCycle,/DEVELOPMENT_DIRECT_STATE=/);
  assert.match(pipeline,/DEVELOPMENT_EXECUTION_MODE=GATED_DIRECT/);
});

test('RELEASE_CONFIRMED targets the project selected platform',()=>{
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.sourceTreeBindingRequired,true);
  assert.equal(release.sourceChangeInvalidatesOldBuildValidation,true);
  assert.equal(release.buildPreflightIsNotFinalApproval,true);
  assert.equal(release.finalReviewMustReadSameCurrentBuildRuntimeQaEvidence,true);
  assert.equal(release.independentQaSeparatedFromVibe2SelfCheck,true);
  assert.deepEqual(release.waitingStates,['BUILDING','WAITING_BUILD','WAITING_RUNTIME_VALIDATION']);
  for(const token of ['BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE','TARGET_PLATFORM_BUILD_OR_PACKAGE','TARGET_PLATFORM_RUNTIME_VALIDATION','INDEPENDENT_QA_AND_REGRESSION'])assert.ok(release.requiredFlow.includes(token));
  assert.doesNotMatch(JSON.stringify(release),/UNITY_ANDROID/);
  assert.doesNotMatch(JSON.stringify(release),/BIND_CURRENT_UNITY_SOURCE_TREE/);
  assert.match(releaseCycle,/currentSourceTreeSha/);
  assert.match(releaseCycle,/boundToCurrentSource/);
  assert.match(releaseCycle,/boundToImplementation/);
  assert.match(releaseCycle,/FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_RUNTIME_PASS/);
  assert.match(releaseCycle,/FINAL_RISK_WATCH_REQUIRES_CURRENT_BUILD_INDEPENDENT_QA_PASS/);
  assert.match(pipeline,/RELEASE_EXECUTION_MODE=GATED_DIRECT_RELEASE_PRODUCTION/);
});

test('platform priority is focus order only and cannot create entry gates',()=>{
  const strategy=directive.platformStrategy;
  assert.equal(strategy.primaryPlatform,'ROBLOX');
  assert.deepEqual(strategy.priority,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(strategy.priorityMeaning,'DEFAULT_FOCUS_AND_EXPERIENCE_ACCUMULATION_ORDER_ONLY');
  assert.deepEqual(strategy.developmentAccess,{ROBLOX:'ALWAYS_ALLOWED',UNITY:'ALWAYS_ALLOWED',FORTNITE_UEFN:'ALWAYS_ALLOWED'});
  assert.equal(strategy.allThreePlatformsMayBeDevelopedConcurrently,true);
  assert.equal(strategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(strategy.roadmapPhaseEntryGatesForbidden,true);
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(strategy.platformReleaseMayProceedWhenItsOwnEvidenceGatesPass,true);
  assert.equal(strategy.focusMilestones.ROBLOX_UNITY_CONCURRENT_RELEASE_EXPERIENCE.entryGate,false);
  assert.equal(strategy.focusMilestones.FORTNITE_UEFN_EXPANSION.entryGate,false);
  assert.equal(strategy.UNITY.existingPathPreserved,true);
  assert.equal(strategy.UNITY.robloxDoesNotReplaceUnity,true);
  assert.match(flow,/allThreePlatformsMayBeDevelopedConcurrently: true/);
  assert.match(flow,/roadmapPhaseEntryGatesForbidden: true/);
});

test('artbook authorship and provenance rules remain unchanged',()=>{
  assert.equal(directive.ai.artbookEditor.singleEditor,true);
  assert.equal(directive.ai.artbookEditor.departmentPageAuthorship,false);
  assert.equal(directive.ai.artbookEditor.mayInventNewClaims,false);
  assert.equal(directive.ai.vibe2.designOrArtbookPrimaryAuthorInDevelopmentClass,false);
  assert.match(flow,/ArtbookEditor:[\s\S]*?singleEditor: true/);
  assert.match(flow,/mayInventNewClaims: false/);
  assert.match(pipeline,/DEPARTMENT_ARTBOOK_AUTHORSHIP=NO/);
});
