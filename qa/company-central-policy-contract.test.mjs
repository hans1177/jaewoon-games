// 파일명: qa/company-central-policy-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  COMPANY_DEPARTMENT_ROLES,
  COMPANY_BLOCKING_DEPARTMENT_ROLES,
  COMPANY_ADVISORY_DEPARTMENT_ROLES
} from '../assets/company-department-standards.js';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readText=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const readJson=relative=>JSON.parse(readText(relative));
const flow=readText('COMPANY_FLOW.md');
const agents=readText('AGENTS.md');
const directive=readJson('company-directive.json');
const multimodelWorkflow=readText('.github/workflows/artbook-free-department-bots.yml');
const revoteWorkflow=readText('.github/workflows/post-modification-revote.yml');
const developmentWorkflow=readText('.github/workflows/company-development-confirmed-runtime.yml');
const unityWorkflow=readText('.github/workflows/company-development-unity-runtime.yml');
const designCycle=readText('tools/company-design-cycle.mjs');
const baselineGate=readText('tools/company-baseline-gate.mjs');
const pipeline=readText('tools/artbook-production-pipeline.mjs');

const canonicalDepartments=['planning','graphics','development','qa','balance','music','intro'];
const blockingDepartments=['planning','graphics','development','qa','balance'];
const advisoryDepartments=['music','intro'];

test('COMPANY_FLOW remains the single machine-oriented production policy source',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/sourceOfTruth: COMPANY_FLOW\.md/);
  assert.match(flow,/format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow,/humanReadableNarrativeRequired: false/);
  assert.match(flow,/ownerInstructionOverridesPolicy: true/);
  assert.match(agents,/제작 정책 원본은 \*\*`COMPANY_FLOW\.md` 하나\*\*/);
});

test('GAME_SEED mirrors the historical-bootstrap dynamic-portfolio and selected-platform policy',()=>{
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
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.replenishment.mode,'DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.gameSeed.replenishment.oneForOneOnly,false);
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.match(flow,/historicalInitialSeedBatchOnly: true/);
  assert.match(flow,/sourceCodeRule: IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE/);
});

test('all active games require one canonical Web product and separate Web-test games are forbidden',()=>{
  const web=directive.production.canonicalWebGame;
  assert.equal(web.requiredForAllActiveGames,true);
  assert.equal(web.canonicalRoot,'web-games/');
  assert.equal(web.canonicalPathPattern,'web-games/<gameId>/');
  assert.equal(web.canonicalEntryFile,'index.html');
  assert.equal(web.productArtifactNotTestbed,true);
  assert.equal(web.separateWebTestGameForbidden,true);
  assert.equal(web.separateWebTestCandidatePipelineForbidden,true);
  assert.equal(web.autonomousWebCandidateRootForbidden,true);
  assert.equal(web.qaTargetsCanonicalWebGameDirectly,true);
  assert.equal(web.missingCanonicalWebGameBlocksReadyOrPromotion,true);
  assert.match(flow,/requiredForAllActiveGames: true/);
  assert.match(flow,/productArtifactNotTestbed: true/);
  assert.match(flow,/separateWebTestGameForbidden: true/);
  assert.match(flow,/qaTargetsCanonicalWebGameDirectly: true/);
  assert.doesNotMatch(developmentWorkflow,/company-development-web-bootstrap\.mjs|company-development-web-gameplay-validation\.mjs|web-gameplay-validation\.json|\.autonomous-candidates/);
  assert.doesNotMatch(unityWorkflow,/web-gameplay-validation\.json|--web-evidence=/);
  assert.match(unityWorkflow,/company-qa-runtime-evidence\.json/);
  assert.match(unityWorkflow,/--web-game=/);
  assert.match(unityWorkflow,/--qa-evidence=/);
});

test('DESIGN_ONLY requires seven-department review, canonical Web build, direct QA, then baseline and artbook',()=>{
  const design=directive.classes.DESIGN_ONLY;
  assert.deepEqual(design.requiredFlow,[
    'GAME_SEED','GAME_DESIGNER_DRAFT','SEVEN_DISTINCT_DEPARTMENT_LEADS',
    'DEPARTMENT_LEAD_PLUS_ASSISTANT_MULTIMODEL_REVIEW','DEPARTMENT_LEAD_INTERNAL_CONSENSUS',
    'CROSS_DEPARTMENT_LEAD_MEETING','ONE_LEAD_REBUTTAL_ROUND','GAME_DESIGNER_REVISION',
    'CANONICAL_WEB_GAME_BUILD_OR_UPDATE','QA_ACTUAL_RUNTIME_OR_PLAY','DESIGN_BASELINE_GATE','ARTBOOK_EDITOR_CORE_STRATEGY'
  ]);
  for(const token of ['TARGET_PLATFORM_UX_DIRECTION_DEFINED','PLATFORM_SELECTION_RECORDED','SEVEN_DEPARTMENT_SCORES_RECORDED','CANONICAL_WEB_GAME_EXISTS','CANONICAL_WEB_GAME_QA_PASS','FIVE_BLOCKING_DEPARTMENT_PASS'])assert.ok(design.baselineReadyRequires.includes(token),token);
  assert.equal(design.canonicalWebGameDevelopmentRequired,true);
  assert.equal(design.separateWebTestGameForbidden,true);
  assert.equal(design.readyState,'DESIGN_BASELINE_READY');
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.match(designCycle,/GAME_SEED_REQUIRED/);
  assert.match(designCycle,/sameModelAsDraft:true/);
  assert.match(designCycle,/repeatedSevenDepartmentReview/);
  assert.doesNotMatch(designCycle,/VIBE2_VALIDATION_LEARNING|vibe2-validator/);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
});

test('seven departments all score and learn while only five core departments block progression',()=>{
  assert.deepEqual(COMPANY_DEPARTMENT_ROLES,canonicalDepartments);
  assert.deepEqual(COMPANY_BLOCKING_DEPARTMENT_ROLES,blockingDepartments);
  assert.deepEqual(COMPANY_ADVISORY_DEPARTMENT_ROLES,advisoryDepartments);
  assert.deepEqual(directive.ai.departments,canonicalDepartments);
  assert.deepEqual(directive.portfolioGovernance.departments,canonicalDepartments);
  assert.deepEqual(directive.portfolioGovernance.blockingDepartments,blockingDepartments);
  assert.deepEqual(directive.portfolioGovernance.advisoryDepartments,advisoryDepartments);
  assert.equal(directive.portfolioGovernance.allSevenDepartmentsParticipateInReviewScoreAndLearning,true);
  assert.equal(directive.portfolioGovernance.advisoryDepartmentPassRequiredForProgression,false);
  assert.equal(directive.portfolioGovernance.advisoryDepartmentFailureAloneCannotBlockBaselinePromotionOrRelease,true);
  assert.deepEqual(directive.ai.departmentPassPolicy.blockingDepartments,blockingDepartments);
  assert.deepEqual(directive.ai.departmentPassPolicy.advisoryDepartments,advisoryDepartments);
  assert.equal(directive.ai.departmentPassPolicy.allSevenSubmitReview,true);
  assert.equal(directive.ai.departmentPassPolicy.advisoryPassRequiredForProgression,false);
  assert.match(flow,/advisoryDepartmentPassRequiredForProgression: false/);
  assert.match(flow,/advisoryDepartmentFailureAloneCannotBlockBaselinePromotionOrRelease: true/);
});

test('seven-department score contract requires complete normalized scores and never converts missing departments to zero',()=>{
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
});

test('seven-department workflows do not retain old five-department execution matrices',()=>{
  assert.match(revoteWorkflow,/fromJSON\(needs\.context\.outputs\.roles\)/);
  assert.doesNotMatch(revoteWorkflow,/role:\s*\[planning,\s*development,\s*qa,\s*graphics,\s*balance\]/);
  assert.doesNotMatch(revoteWorkflow,/DEPARTMENT_REVOTES=5\/5/);
  assert.match(multimodelWorkflow,/const roles=\(d\.ai\?\.departments\|\|\[\]\)/);
  assert.doesNotMatch(multimodelWorkflow,/departments\?\.count!==5/);
});

test('music and direction/cinematic departments are advisory and cinematic content itself is optional',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(development.musicDepartmentPassRequiredForProgression,false);
  assert.equal(development.introDepartmentReviewRequired,true);
  assert.equal(development.introDepartmentPassRequiredForProgression,false);
  assert.equal(development.advisoryDepartmentFailureBlocksBaseline,false);
  assert.equal(development.cinematicContentRequired,false);
  assert.equal(development.developmentMusic.musicFailureBlocksCanonicalWebGameReadyState,false);
  assert.equal(release.musicAndIntroReviewNonBlockingForRelease,true);
  assert.ok(development.baselineReadyRequires.includes('FIVE_BLOCKING_DEPARTMENT_PASS'));
  assert.ok(release.releaseReadyRequires.includes('FIVE_BLOCKING_DEPARTMENT_FINAL_REVIEW_NO_UNRESOLVED_BLOCKER'));
  assert.match(flow,/cinematicContentRequired: false/);
  assert.match(flow,/musicDepartmentPassRequiredForProgression: false/);
  assert.match(flow,/introDepartmentPassRequiredForProgression: false/);
});

test('DEVELOPMENT uses canonical Web general QA then selected target platform validation',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'TARGET_PLATFORM_VALIDATION_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_DEVELOPMENT_ENGINE');
  assert.equal(development.executionMode,'GATED_DIRECT');
  assert.equal(development.canonicalWebGameRequired,true);
  assert.equal(development.canonicalWebGameIsProductArtifact,true);
  assert.equal(development.separateWebTestStageForbidden,true);
  assert.equal(development.separateWebTestCandidateForbidden,true);
  assert.equal(development.targetPlatformPurpose,'TECHNICAL_AND_GAMEPLAY_VALIDATION');
  assert.equal(development.targetPlatformMayRunWhenDesignBaselineAndCanonicalWebGameReady,true);
  for(const token of ['LOAD_CANONICAL_WEB_GAME','AUTOMATIC_GROUNDED_DEPARTMENT_EVIDENCE','SEVEN_DEPARTMENT_CANONICAL_WEB_GAME_REVIEW','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_GAMEPLAY_VALIDATION','TARGET_PLATFORM_TECHNICAL_VALIDATION'])assert.ok(development.requiredFlow.includes(token),token);
  for(const token of ['CANONICAL_WEB_GAME_EXISTS','CANONICAL_WEB_GAME_GENERAL_QA_PASS','FIVE_BLOCKING_DEPARTMENT_PASS','REAL_TARGET_PLATFORM_GAMEPLAY_PASS','REAL_TARGET_PLATFORM_TECHNICAL_PASS'])assert.ok(development.baselineReadyRequires.includes(token),token);
  assert.equal(release.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.vibe2PrimaryDeveloper,true);
  assert.equal(release.coreDesignLock,true);
  assert.ok(release.requiredFlow.includes('LOAD_CANONICAL_WEB_GAME'));
  assert.ok(release.requiredFlow.includes('BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_RUNTIME_VALIDATION'));
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
});

test('semantic production classes are canonical and fixed numeric quotas are not policy',()=>{
  assert.equal(directive.production.canonicalField,'productionClass');
  assert.deepEqual(directive.production.canonicalClasses,['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED']);
  assert.equal(directive.production.membership,'DYNAMIC_EVIDENCE');
  assert.equal(directive.production.countsDerivedFromMembership,true);
  assert.equal(directive.production.fixedClassCounts,false);
  assert.equal(directive.production.gameIdsPinned,false);
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
});

test('paid execution remains forbidden',()=>{
  assert.equal(directive.ai.paidAiAllowed,false);
  assert.equal(directive.ai.paidRunnerAllowed,false);
  assert.ok(directive.rules.includes('paid-ai-paid-overage-and-paid-runners-remain-forbidden'));
});
