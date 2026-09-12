// 파일명: qa/company-central-policy-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMPANY_DEPARTMENT_ROLES} from '../assets/company-department-standards.js';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readText=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const readJson=relative=>JSON.parse(readText(relative));
const flow=readText('COMPANY_FLOW.md');
const agents=readText('AGENTS.md');
const directive=readJson('company-directive.json');
const multimodelWorkflow=readText('.github/workflows/artbook-free-department-bots.yml');
const revoteWorkflow=readText('.github/workflows/post-modification-revote.yml');
const designCycle=readText('tools/company-design-cycle.mjs');
const baselineGate=readText('tools/company-baseline-gate.mjs');
const pipeline=readText('tools/artbook-production-pipeline.mjs');

const canonicalDepartments=['planning','graphics','development','qa','balance','music','intro'];

test('COMPANY_FLOW remains the single machine-oriented production policy source',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/sourceOfTruth: COMPANY_FLOW\.md/);
  assert.match(flow,/format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow,/humanReadableNarrativeRequired: false/);
  assert.match(flow,/ownerInstructionOverridesPolicy: true/);
  assert.match(agents,/제작 정책 원본은 \*\*`COMPANY_FLOW\.md` 하나\*\*/);
});

test('GAME_SEED mirrors the current historical-bootstrap dynamic-portfolio and selected-platform policy',()=>{
  assert.equal(directive.gameSeed.enabled,true);
  assert.equal(directive.gameSeed.requiredBeforeDesignerDraft,true);
  assert.equal(directive.gameSeed.selectionMode,'FAMOUS_SUCCESSFUL_GAME_COPY_BENCHMARK');
  assert.deepEqual(directive.gameSeed.transformationModes,['HOMAGE','REINTERPRETATION']);
  assert.equal(directive.gameSeed.sourceCodeRule,'IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.equal(new Set(directive.gameSeed.bootstrap.categories).size,6);
  assert.equal(directive.gameSeed.marketEvidence.role,'TARGET_DESIGN_REFERENCE');
  assert.equal(directive.gameSeed.marketEvidence.targetMarketScope,'GLOBAL');
  assert.equal(directive.gameSeed.marketEvidence.countrySpecificEvidenceRole,'SECONDARY_CONTEXT_ONLY');
  assert.equal(directive.gameSeed.marketEvidence.defaultTargetMustNotBeCountrySpecific,true);
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresSource,true);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresObservedAt,true);
  assert.equal(directive.gameSeed.replenishment.mode,'DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.gameSeed.replenishment.oneForOneOnly,false);
  assert.equal(directive.gameSeed.replenishment.automaticGrowthBeyondVacanciesForbidden,false);
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.match(flow,/historicalInitialSeedBatchCount: 6/);
  assert.match(flow,/historicalInitialSeedBatchOnly: true/);
  assert.match(flow,/initialSeedBatchIsProductionQuota: false/);
  assert.match(flow,/sourceCodeRule: IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE/);
  assert.match(flow,/replenishment:[\s\S]*mode: DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO/);
  assert.match(flow,/oneForOneOnly: false/);
  assert.match(flow,/initialTargetPlatform: ROBLOX/);
  assert.match(flow,/projectMaySelectAnyAllowedPlatform: true/);
});

test('DESIGN_ONLY is seed-backed seven-department design review revision baseline then artbook with no Vibe2',()=>{
  const design=directive.classes.DESIGN_ONLY;
  assert.deepEqual(design.requiredFlow,[
    'GAME_SEED','GAME_DESIGNER_DRAFT','SEVEN_DISTINCT_DEPARTMENT_LEADS',
    'DEPARTMENT_LEAD_PLUS_ASSISTANT_MULTIMODEL_REVIEW','DEPARTMENT_LEAD_INTERNAL_CONSENSUS',
    'CROSS_DEPARTMENT_LEAD_MEETING','ONE_LEAD_REBUTTAL_ROUND','GAME_DESIGNER_REVISION',
    'DESIGN_BASELINE_GATE','ARTBOOK_EDITOR_CORE_STRATEGY'
  ]);
  for(const token of ['TARGET_PLATFORM_UX_DIRECTION_DEFINED','PLATFORM_SELECTION_RECORDED','SEVEN_DEPARTMENT_SCORES_RECORDED'])assert.ok(design.baselineReadyRequires.includes(token));
  assert.equal(design.readyState,'DESIGN_BASELINE_READY');
  assert.equal(design.sourceCodeAutoDevelopment,false);
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass,'DESIGN_ONLY'),false);
  assert.match(designCycle,/GAME_SEED_REQUIRED/);
  assert.match(designCycle,/sameModelAsDraft:true/);
  assert.match(designCycle,/repeatedSevenDepartmentReview/);
  assert.doesNotMatch(designCycle,/VIBE2_VALIDATION_LEARNING|vibe2-validator/);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
});

test('seven-department score contract requires complete normalized scores and never converts missing departments to zero',()=>{
  assert.deepEqual(COMPANY_DEPARTMENT_ROLES,canonicalDepartments);
  assert.deepEqual(directive.ai.departments,canonicalDepartments);
  assert.deepEqual(directive.portfolioGovernance.departments,canonicalDepartments);
  assert.equal(directive.portfolioGovernance.departmentScoresRequiredForPortfolioDecision,true);
  assert.equal(directive.portfolioGovernance.scoreMin,0);
  assert.equal(directive.portfolioGovernance.scoreMax,100);
  assert.ok(Math.abs(directive.portfolioGovernance.defaultWeightPerDepartment-(1/canonicalDepartments.length))<1e-12);
  assert.match(designCycle,/departmentScore/);
  assert.match(designCycle,/department-score-aggregation\.json/);
  assert.match(designCycle,/NORMALIZED_EQUAL_WEIGHT/);
  assert.match(designCycle,/missingDepartmentDoesNotCountAsZero:true/);
  assert.match(designCycle,/historicalIncompleteDepartmentSetsRequireReevaluation:true/);
  assert.match(baselineGate,/seven-department-score-reevaluation-required/);
  assert.match(baselineGate,/allConfiguredDepartmentScoresRequiredForBaseline:true/);
  assert.match(baselineGate,/missingDepartmentDoesNotCountAsZeroScore:true/);
  assert.match(baselineGate,/historicalIncompleteDepartmentSetsRequireReevaluation:true/);
});

test('seven-department workflows do not retain the old five-department execution gate',()=>{
  assert.match(revoteWorkflow,/fromJSON\(needs\.context\.outputs\.roles\)/);
  assert.doesNotMatch(revoteWorkflow,/role:\s*\[planning,\s*development,\s*qa,\s*graphics,\s*balance\]/);
  assert.doesNotMatch(revoteWorkflow,/DEPARTMENT_REVOTES=5\/5/);
  assert.match(multimodelWorkflow,/const roles=\(d\.ai\?\.departments\|\|\[\]\)/);
  assert.doesNotMatch(multimodelWorkflow,/departments\?\.count!==5/);
});

test('discard policy requires redesign or real implementation evidence instead of one failure',()=>{
  assert.equal(directive.discardPolicy.general.singleFailureDoesNotImmediatelyDiscard,true);
  assert.equal(directive.discardPolicy.general.correctableProblemMustAttemptRevisionFirst,true);
  assert.equal(directive.discardPolicy.general.marketMetricAloneCannotDiscard,true);
  assert.equal(directive.discardPolicy.general.departmentScoreAloneCannotDiscard,true);
  assert.equal(directive.discardPolicy.DESIGN_ONLY.discardRequiresSameDesignerRevision,true);
  assert.equal(directive.discardPolicy.DESIGN_ONLY.discardRequiresRepeatedSevenDepartmentReview,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresRealEvidence,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresTargetedFixWhenPractical,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresTargetedRevalidation,true);
  assert.match(flow,/SAME_GAME_DESIGNER_REVISION_ATTEMPTED/);
  assert.match(flow,/TARGETED_REVALIDATION_PERFORMED/);
});

test('semantic production classes are canonical and fixed numeric quotas are not policy',()=>{
  assert.equal(directive.production.canonicalField,'productionClass');
  assert.deepEqual(directive.production.canonicalClasses,['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED']);
  assert.equal(directive.production.membership,'DYNAMIC_EVIDENCE');
  assert.equal(directive.production.countsDerivedFromMembership,true);
  assert.equal(directive.production.fixedClassCounts,false);
  assert.equal(directive.production.gameIdsPinned,false);
  assert.equal(Object.hasOwn(directive.production,'numericLabels'),false);
  assert.equal(directive.production.numericLabelsAreAliasesOnly,true);
  assert.equal(Object.hasOwn(directive,'tiersCompatibility'),false);
  assert.match(flow,/membership: DYNAMIC_EVIDENCE/);
  assert.match(flow,/fixedClassCounts: false/);
  assert.match(flow,/fixedPortfolioSize: false/);
});

test('seven departments keep distinct lead models and one Game Designer',()=>{
  assert.equal(directive.ai.minDistinctModelsPerDepartment,3);
  assert.equal(directive.ai.minDistinctLeadModelsAcrossDepartments,canonicalDepartments.length);
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.deepEqual(Object.keys(directive.ai.departmentLeadModels),canonicalDepartments);
  assert.equal(new Set(Object.values(directive.ai.departmentLeadModels)).size,canonicalDepartments.length);
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign,true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting,true);
  assert.match(multimodelWorkflow,/productionClassOf/);
  assert.doesNotMatch(multimodelWorkflow,/productionClassFromLegacyTier|NUMERIC_TIER_POLICY/);
});

test('development requires Web gameplay and music before selected target platform validation',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_DEVELOPMENT_ENGINE');
  assert.equal(development.executionMode,'GATED_DIRECT');
  assert.equal(development.webPurpose,'REQUIRED_FIRST_PLAYABLE_GAMEPLAY_AND_MUSIC_VALIDATION');
  assert.equal(development.targetPlatformPurpose,'TECHNICAL_AND_GAMEPLAY_VALIDATION');
  assert.equal(development.webBeforeTargetPlatformByDefault,true);
  assert.equal(development.targetPlatformMayRunImmediately,false);
  assert.equal(development.webGameplayValidationRequired,true);
  assert.equal(development.musicValidationRequired,true);
  assert.equal(development.webCandidateMustPassBeforeTargetPlatformDispatch,true);
  for(const token of ['WEB_PLAYABLE_QUEUE','WEB_PLAYABLE_BOOTSTRAP','MUSIC_RUNTIME_BIND','WEB_GAMEPLAY_AND_MUSIC_VALIDATION','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_GAMEPLAY_VALIDATION','TARGET_PLATFORM_TECHNICAL_VALIDATION'])assert.ok(development.requiredFlow.includes(token),token);
  for(const token of ['REAL_WEB_GAMEPLAY_PASS','MUSIC_RUNTIME_PASS','REAL_TARGET_PLATFORM_GAMEPLAY_PASS','REAL_TARGET_PLATFORM_TECHNICAL_PASS'])assert.ok(development.baselineReadyRequires.includes(token),token);
  assert.equal(development.developmentMusic.firstUserGestureUnlockRequired,true);
  assert.equal(development.developmentMusic.muteControlRequired,true);
  assert.equal(development.developmentMusic.volumeControlRequired,true);
  assert.equal(development.developmentMusic.musicFailureBlocksTargetPlatformDispatch,true);
  assert.equal(release.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.vibe2PrimaryDeveloper,true);
  assert.equal(release.coreDesignLock,true);
  assert.ok(release.requiredFlow.includes('BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_RUNTIME_VALIDATION'));
  assert.match(flow,/webPurpose: REQUIRED_FIRST_PLAYABLE_GAMEPLAY_AND_MUSIC_VALIDATION/);
  assert.match(flow,/webGameplayValidationRequired: true/);
  assert.match(flow,/musicValidationRequired: true/);
  assert.match(flow,/musicFailureBlocksTargetPlatformDispatch: true/);
  assert.match(flow,/target: PROJECT_SELECTED_PLATFORM/);
});

test('platform priority is default focus only and creates no development entry gate',()=>{
  const strategy=directive.platformStrategy;
  assert.equal(strategy.primaryPlatform,'ROBLOX');
  assert.deepEqual(strategy.priority,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(strategy.priorityMeaning,'DEFAULT_FOCUS_AND_EXPERIENCE_ACCUMULATION_ORDER_ONLY');
  assert.equal(strategy.allThreePlatformsMayBeDevelopedConcurrently,true);
  assert.equal(strategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(strategy.roadmapPhaseEntryGatesForbidden,true);
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(strategy.platformReleaseMayProceedWhenItsOwnEvidenceGatesPass,true);
  assert.deepEqual(strategy.developmentAccess,{ROBLOX:'ALWAYS_ALLOWED',UNITY:'ALWAYS_ALLOWED',FORTNITE_UEFN:'ALWAYS_ALLOWED'});
  assert.equal(strategy.UNITY.existingPathPreserved,true);
  assert.equal(strategy.UNITY.robloxDoesNotReplaceUnity,true);
  assert.match(flow,/allThreePlatformsMayBeDevelopedConcurrently: true/);
  assert.match(flow,/roadmapPhaseEntryGatesForbidden: true/);
});

test('paid execution remains forbidden',()=>{
  assert.equal(directive.ai.paidAiAllowed,false);
  assert.equal(directive.ai.paidRunnerAllowed,false);
  assert.ok(directive.rules.includes('paid-ai-paid-overage-and-paid-runners-remain-forbidden'));
});
