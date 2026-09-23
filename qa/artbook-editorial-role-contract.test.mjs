import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_REQUIRED_FIELDS,GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const machineSource='company-learning/platform-release-roadmap.json';
const machinePolicy=JSON.parse(fs.readFileSync(machineSource,'utf8'));
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const devCycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const releaseCycle=fs.readFileSync('tools/company-release-production-cycle.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const roles=['planning','graphics','development','qa','audio'];

test('one canonical machine policy source owns class design meeting and release rules',()=>{
  assert.equal(directive.policyDocument,machineSource);
  assert.equal(directive.machineSourceOfTruth,machineSource);
  assert.equal(directive.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(machinePolicy.machineSourceOfTruth,machineSource);
  assert.equal(machinePolicy.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(machinePolicy.humanDocumentRequired,false);
  assert.match(flow,/sourceOfTruth: company-learning\/platform-release-roadmap\.json/);
  assert.match(flow,/authority: LEGACY_POLICY_MIRROR/);
  assert.match(flow,/authoritative: false/);
  assert.match(flow,/canonicalMachineAuthority: MACHINE_EXECUTION_CONTRACT/);
  assert.match(flow,/machineContractsMayMirrorPolicyButCannotCreatePolicy: true/);
  assert.match(flow,/evidenceFilesCannotCreatePolicy: true/);
});

test('GAME_SEED mirrors the current selected-platform policy while preserving legacy input compatibility',()=>{
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.equal(directive.gameSeed.primaryPlatformIsDefaultNotLock,true);
  assert.equal(directive.gameSeed.initialPlayMode,'PROJECT_DEFINED');
  const currentRequired=directive.gameSeed.requiredFields||[];
  assert.deepEqual(currentRequired,[...GAME_SEED_REQUIRED_FIELDS]);
  assert.ok(currentRequired.includes('REFERENCE_INPUTS'));
  assert.ok(!currentRequired.includes('REFERENCE_GAMES'));
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
    'MANDATORY_WEB_COMPANION_REQUIREMENT_RECORDED','APPROVED_SCOPE_INVENTORY_RECORDED',
    'DETERMINISTIC_DESIGN_PRE_GATE_PASS','DETERMINISTIC_DEPARTMENT_EVIDENCE_RECORDED',
    'STRICT_DESIGN_SCORE_AT_LEAST_80','STRICT_DESIGN_HARD_FAILURES_EMPTY'
  ])assert.ok(design.baselineReadyRequires.includes(token),`missing DESIGN_ONLY requirement: ${token}`);
  assert.equal(design.readyState,'DESIGN_BASELINE_READY');
  assert.match(flow,/TARGET_PLATFORM_UX_DIRECTION_DEFINED/);
  assert.match(flow,/DETERMINISTIC_DEPARTMENT_EVIDENCE_RECORDED/);
  assert.match(flow,/STRICT_DESIGN_SCORE_AT_LEAST_80/);
});

test('development and release preserve direct lead review without forcing distinct lead models',()=>{
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,false);
  assert.equal(directive.ai.departmentLeadAssignmentRemappable,true);
  const leadModels=roles.map(role=>directive.ai.departmentLeadModels?.[role]);
  assert.ok(leadModels.every(model=>directive.ai.modelPool.includes(model)));
  assert.equal(directive.ai.minDistinctModelsPerDepartment,1);
  assert.equal(directive.ai.minDistinctLeadModelsAcrossDepartments,1);
  assert.equal(directive.ai.departmentReviewModelCount,1);
  assert.equal(directive.ai.leadDistinctnessPolicy,'NOT_REQUIRED_FOR_EXECUTION');
  assert.match(flow,/designOnlyReviewMode: DETERMINISTIC_EVIDENCE_NO_AI_VERDICT/);
  assert.match(flow,/allModelsWithinDepartmentMustBeDistinct: false/);
  assert.match(cycle,/deterministic_department_evidence/);
  assert.doesNotMatch(cycle,/GEMINI_RESOLVED_DISTINCT_LEAD_GATE/);
  assert.match(devCycle,/DEPARTMENT_LEAD_GATE/);
  assert.match(releaseCycle,/DEPARTMENT_LEAD_GATE/);
});

test('DESIGN_ONLY uses deterministic evidence without AI meeting or rebuttal layer',()=>{
  assert.equal(directive.ai.departmentRepresentativeAuthoredByLead,false);
  assert.equal(directive.ai.departmentRebuttalAuthoredByLead,false);
  assert.equal(directive.ai.meeting.designOnlyMeetingRequired,false);
  assert.equal(directive.ai.meeting.crossDepartmentRebuttalRounds,0);
  assert.equal(directive.ai.meeting.rebuttalOwner,null);
  assert.equal(directive.ai.meeting.designOnlyRevisionInput,'DETERMINISTIC_FAILED_AXIS_EVIDENCE');
  assert.match(flow,/designOnlyReviewMode: DETERMINISTIC_EVIDENCE_NO_AI_VERDICT/);
  assert.match(cycle,/deterministic_department_evidence/);
  assert.doesNotMatch(cycle,/rebuttalAuthoredByDepartmentLeads:true/);
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and remains primary while assigned external AI collaborates under Vibe supervision',()=>{
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(directive.ai.vibe2.implementationOwner,true);
  assert.equal(directive.ai.vibe2.ownsWebFirstImplementation,false);
  assert.equal(directive.ai.vibe2.ownsInternalPlaytestRepair,true);
  const authority=machinePolicy.developmentLifecycleMachine?.gameDevelopmentAuthority||{};
  assert.equal(authority.implementationOwner,'VIBE2_VIBE3_PRIMARY_WITH_ASSIGNED_EXTERNAL_AI_COLLABORATORS');
  assert.equal(authority.nonVibeAiIsGameDevelopmentOwner,false);
  assert.equal(authority.nonVibeAiGameSourceWriteMode,'EXPLICIT_RESPONSIBLE_FILES_ISOLATED_CANDIDATE_BRANCH_ONLY');
  assert.equal(authority.externalAiSelfAcceptance,false);
  assert.equal(authority.externalAiDirectMainWrite,false);
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.match(flow,/Vibe2:\n  startsAt: DEVELOPMENT_CONFIRMED/);
});

test('DEVELOPMENT_CONFIRMED starts Roblox and Unity directly from minimum shared design without a Web gate',()=>{
  const dev=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(dev.executionMode,'DIRECT_NATIVE_DUAL_PLATFORM');
  assert.equal(dev.resumeFromLatestEvidence,true);
  assert.equal(dev.webPurpose,'UNITY_WEB_VALIDATION_SURFACE_ONLY');
  assert.equal(dev.targetPlatformPurpose,'PRIMARY_NATIVE_IMPLEMENTATION_AND_VALIDATION');
  assert.equal(dev.webBeforeTargetPlatformByDefault,false);
  assert.equal(dev.targetPlatformMayRunImmediately,true);
  assert.equal(dev.webGameplayValidationRequired,false);
  assert.equal(dev.webCompanionValidationRequired,false);
  assert.equal(dev.approvedScopeCompletionRequired,true);
  assert.equal(dev.musicValidationRequired,false);
  assert.equal(dev.webCandidateMustPassBeforeTargetPlatformDispatch,false);
  assert.equal(dev.platformSpecificValidationRequired,true);
  assert.equal(dev.materialChangeRequiresTargetedRevalidation,true);
  assert.deepEqual(dev.waitingStates,[]);
  for(const token of ['LOAD_MINIMUM_SHARED_DESIGN','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_RELEASE','INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'])assert.ok(dev.requiredFlow.includes(token));
  assert.equal(machinePolicy.directNativeDualPlatformDevelopment.webDevelopmentStageRemoved,true);
  assert.deepEqual(machinePolicy.directNativeDualPlatformDevelopment.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.doesNotMatch(JSON.stringify(dev),/ANDROID_TECHNICAL_VALIDATION_PROTOTYPE/);
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

test('Roblox and Unity are the active equal tier while UEFN remains owner-held',()=>{
  const strategy=directive.platformStrategy;
  assert.equal(strategy.primaryPlatform,'ROBLOX');
  assert.deepEqual(strategy.priority,['ROBLOX','UNITY']);
  assert.equal(strategy.priorityMeaning,'ROBLOX_UNITY_ACTIVE_EQUAL_TIER_UEFN_OWNER_HOLD');
  assert.deepEqual(strategy.developmentAccess,{ROBLOX:'ALWAYS_ALLOWED',UNITY:'ALWAYS_ALLOWED',FORTNITE_UEFN:'OWNER_HOLD'});
  assert.equal(strategy.allThreePlatformsMayBeDevelopedConcurrently,false);
  assert.equal(strategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(strategy.platformReleaseMayProceedWhenItsOwnEvidenceGatesPass,true);
  assert.deepEqual(strategy.primaryPlatforms,['UNITY','ROBLOX']);
  assert.equal(strategy.primaryPlatformLegacyCompatibilityOnly,true);
  assert.deepEqual(strategy.priorityTiers,[['UNITY','ROBLOX']]);
  assert.equal(strategy.UNITY.existingPathPreserved,true);
  assert.equal(strategy.UNITY.robloxDoesNotReplaceUnity,true);
  assert.equal(strategy.FORTNITE_UEFN.developmentAlwaysAllowed,false);
  assert.equal(strategy.FORTNITE_UEFN.role,'OWNER_HOLD_SUPPORTED_PLATFORM');
  assert.equal(machinePolicy.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
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