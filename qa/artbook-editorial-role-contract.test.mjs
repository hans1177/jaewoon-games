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

test('GAME_SEED mirrors the current selected-platform policy while preserving legacy input compatibility',()=>{
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.equal(directive.gameSeed.primaryPlatformIsDefaultNotLock,true);
  assert.equal(directive.gameSeed.initialPlayMode,'PROJECT_DEFINED');
  const legacyRequired=directive.gameSeed.requiredFields||[];
  assert.ok(legacyRequired.includes('REFERENCE_GAMES'));
  for(const field of legacyRequired.filter(field=>field!=='REFERENCE_GAMES'))assert.ok(GAME_SEED_REQUIRED_FIELDS.includes(field),`current GAME_SEED contract missing compatible field: ${field}`);
  for(const field of ['REFERENCE_INPUTS','TARGET_SESSION_MINUTES','MULTIPLAYER_DESIGN_MODE'])assert.ok(GAME_SEED_REQUIRED_FIELDS.includes(field),`current GAME_SEED contract missing owner-current field: ${field}`);
  assert.equal(GAME_SEED_POLICY.seedMaterialPoolTarget,100);
  assert.equal(GAME_SEED_POLICY.seedMaterialCombineMin,2);
  assert.equal(GAME_SEED_POLICY.seedMaterialCombineMax,4);
  assert.equal(GAME_SEED_POLICY.targetSessionMinutes,30);
  assert.equal(GAME_SEED_POLICY.initialTargetPlatform,'ROBLOX');
  assert.deepEqual([...GAME_SEED_POLICY.allowedTargetPlatforms],['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.match(flow,/initialTargetPlatform: ROBLOX/);
  assert.match(flow,/projectMaySelectAnyAllowedPlatform: true/);
  assert.match(flow,/poolTarget: 100/);
  assert.match(flow,/combinePerGameSeed:[\s\S]*?min: 2[\s\S]*?max: 4/);
  assert.match(flow,/meaningfulMinutesRequiredAtInitialGeneration: null/);
  assert.match(flow,/finalContentDepthMinutesRequired: 30/);
  assert.match(flow,/thirtyMinuteInitialGenerationHardGateForbidden: true/);
  assert.match(flow,/decisionStage: GAME_DESIGN/);
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
});

test('five departments keep distinct lead models and multimodel reviews',()=>{
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.equal(directive.ai.minDistinctModelsPerDepartment>=3,true);
  assert.equal(directive.ai.departmentReviewModelCount>=3,true);
  const leads=roles.map(role=>directive.ai.departmentLeadModels?.[role]);
  assert.equal(new Set(leads).size,5);
  for(const role of roles){
    assert.ok(leads[roles.indexOf(role)]);
    assert.ok(directive.ai.modelPool.includes(leads[roles.indexOf(role)]));
  }
});

test('department lead remains representative and rebuttal owner',()=>{
  assert.equal(directive.ai.departmentRepresentativeAuthoredByLead,true);
  assert.equal(directive.ai.departmentRebuttalAuthoredByLead,true);
  assert.match(cycle,/representativeAuthoredByLead:true/);
  assert.match(cycle,/rebuttalAuthoredByDepartmentLeads:true/);
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and remains primary in RELEASE_CONFIRMED',()=>{
  assert.match(flow,/startsAt: DEVELOPMENT_CONFIRMED/);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.vibe2SupportAllowed,true);
  assert.equal(directive.classes.RELEASE_CONFIRMED.vibe2PrimaryDeveloper,true);
});

test('DEVELOPMENT_CONFIRMED requires full approved-scope Web companion gameplay and music before selected-platform validation',()=>{
  const dev=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(dev.webPurpose,'MANDATORY_FULL_APPROVED_SCOPE_WEB_COMPANION_AND_MUSIC_VALIDATION');
  assert.equal(dev.webGameplayValidationRequired,true);
  assert.equal(dev.musicValidationRequired,true);
  assert.equal(dev.webCandidateMustPassBeforeTargetPlatformDispatch,true);
  assert.equal(dev.approvedScopeCompletionRequired,true);
  assert.match(devCycle,/WEB_GAMEPLAY/);
  assert.match(pipeline,/DEVELOPMENT_EXECUTION_MODE=GATED_DIRECT/);
});

test('RELEASE_CONFIRMED targets the project selected platform',()=>{
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.coreDesignLock,true);
  assert.equal(release.sourceTreeBindingRequired,true);
  assert.match(releaseCycle,/currentUnitySourceTreeSha/);
});

test('platform priority is focus order only and cannot create entry gates',()=>{
  assert.equal(directive.platformStrategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(directive.platformStrategy.roadmapPhaseEntryGatesForbidden,true);
  assert.equal(directive.platformStrategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
});

test('artbook authorship and provenance rules remain unchanged',()=>{
  assert.equal(directive.artbook.singleEditor,true);
  assert.equal(directive.artbook.editorReadsRevisedDesign,true);
  assert.equal(directive.artbook.departmentsDoNotAuthorPages,true);
  assert.equal(directive.artbook.preserveRevisionHistoryByDefault,true);
});
