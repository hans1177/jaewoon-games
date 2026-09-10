import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readText = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const readJson = (relative) => JSON.parse(readText(relative));

const flow = readText('COMPANY_FLOW.md');
const agents = readText('AGENTS.md');
const directive = readJson('company-directive.json');
const multimodelWorkflow = readText('.github/workflows/artbook-free-department-bots.yml');
const designCycle = readText('tools/company-design-cycle.mjs');
const developmentCycle = readText('tools/company-development-validation-cycle.mjs');
const releaseCycle = readText('tools/company-release-production-cycle.mjs');
const productionPipeline = readText('tools/artbook-production-pipeline.mjs');

test('COMPANY_FLOW.md remains the single machine-oriented production policy source', () => {
  assert.equal(directive.policyDocument, 'COMPANY_FLOW.md');
  assert.match(flow, /sourceOfTruth: COMPANY_FLOW\.md/);
  assert.match(flow, /format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow, /humanReadableNarrativeRequired: false/);
  assert.match(flow, /ownerInstructionOverridesPolicy: true/);
  assert.match(agents, /제작 정책 원본은 \*\*`COMPANY_FLOW\.md` 하나\*\*/);
  assert.match(agents, /기계 중심 정책 명세/);
  assert.match(agents, /company-directive\.json/);
});

test('central policy owns the end-to-end production architecture without narrative-only requirements', () => {
  for (const token of [
    'production:', 'bootstrapGameSeeds:', 'GAME_SEED:', 'discardPolicy:', 'platformStrategy:', 'aiOrganization:',
    'meeting:', 'GameDesigner:', 'ArtbookEditor:', 'Vibe2:', 'flows:', 'promotion:', 'developmentSafety:', 'learning:',
  ]) assert.ok(flow.includes(token), `missing central policy token: ${token}`);
  assert.match(flow, /OWNER_LATEST_DIRECT_INSTRUCTION[\s\S]*COMPANY_FLOW[\s\S]*COMPANY_DIRECTIVE/);
  assert.match(flow, /DESIGN_ONLY:[\s\S]*GAME_SEED[\s\S]*GAME_DESIGNER_DRAFT[\s\S]*DESIGN_BASELINE_GATE[\s\S]*ARTBOOK_EDITOR_CORE_STRATEGY/);
  assert.match(flow, /Vibe2:[\s\S]*startsAt: DEVELOPMENT_CONFIRMED/);
  assert.doesNotMatch(flow, /VIBE2_VALIDATION_LEARNING/);
  assert.match(flow, /DEVELOPMENT_CONFIRMED:[\s\S]*WEB_GAMEPLAY_VALIDATION[\s\S]*UNITY_ANDROID_TECHNICAL_VALIDATION/);
  assert.match(flow, /RELEASE_CONFIRMED:[\s\S]*VIBE2_PRIMARY_DEVELOPMENT[\s\S]*ANDROID_RUNTIME_VALIDATION[\s\S]*INDEPENDENT_QA_AND_REGRESSION/);
});

test('GAME_SEED policy encodes six-seed bootstrap, famous-success benchmark, target-market evidence, and one-for-one replenishment', () => {
  assert.match(flow, /initialSeedBatchCount: 6/);
  assert.match(flow, /initialSeedGenerationMode: SINGLE_BOOTSTRAP_BATCH/);
  assert.match(flow, /initialSeedBatchCreatesAllCategoriesAtOnce: true/);
  for (const category of ['ACTION_SURVIVAL_ROGUELITE','SINGLE_DEFENSE_STRATEGY','PUZZLE','CASUAL','IDLE_GROWTH_RPG','STORY_COMPLETE_RPG']) {
    assert.match(flow, new RegExp(`- ${category}`));
  }
  assert.match(flow, /selectionMode: FAMOUS_SUCCESSFUL_GAME_COPY_BENCHMARK/);
  assert.match(flow, /- HOMAGE[\s\S]*- REINTERPRETATION/);
  assert.match(flow, /sourceCodeRule: IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE/);
  assert.match(flow, /marketEvidence:[\s\S]*role: TARGET_DESIGN_REFERENCE/);
  assert.match(flow, /hardPassFailGate: false/);
  assert.match(flow, /marketDataAloneCannotDiscardGame: true/);
  assert.match(flow, /REVENUE_RANK_OR_REVENUE_SIGNAL/);
  assert.match(flow, /TARGET_AGE_OR_AGE_DISTRIBUTION/);
  assert.match(flow, /AVERAGE_PLAYTIME/);
  assert.match(flow, /SESSION_LENGTH/);
  assert.match(flow, /numericClaimRequiresSource: true/);
  assert.match(flow, /numericClaimRequiresObservedAt: true/);
  assert.match(flow, /replenishment:[\s\S]*mode: ONE_FOR_ONE_ONLY/);
  assert.match(flow, /normalPromotionDoesNotTriggerReplenishment: true/);
  assert.match(flow, /replacementCountPerVacancy: 1/);
});

test('discard policy separates DESIGN_ONLY design survival from DEVELOPMENT_CONFIRMED real implementation survival', () => {
  assert.match(flow, /discardPolicy:[\s\S]*singleFailureDoesNotImmediatelyDiscard: true/);
  assert.match(flow, /marketMetricAloneCannotDiscard: true/);
  assert.match(flow, /DESIGN_ONLY:[\s\S]*question: CAN_THE_GAME_IDEA_AND_DESIGN_SURVIVE/);
  assert.match(flow, /SAME_GAME_DESIGNER_REVISION_ATTEMPTED/);
  assert.match(flow, /FIVE_DEPARTMENT_REVIEW_REPEATED/);
  assert.match(flow, /HOMAGE_OR_REINTERPRETATION_CANNOT_PRODUCE_DISTINCT_IDENTITY/);
  assert.match(flow, /DEVELOPMENT_CONFIRMED:[\s\S]*question: CAN_THE_VALIDATED_DESIGN_SURVIVE_REAL_IMPLEMENTATION_AND_PLAY/);
  assert.match(flow, /TARGETED_REVALIDATION_PERFORMED/);
  assert.match(flow, /REAL_PLAY_CORE_FUN_REMAINS_UNACCEPTABLE_AFTER_FIX/);
  assert.match(flow, /DEMOTE_TO_DESIGN_ONLY_IF_CORE_DESIGN_MUST_BE_REBUILT/);
});

test('semantic production classes are canonical and class counts are derived, not fixed quotas', () => {
  assert.equal(directive.production.canonicalField, 'productionClass');
  assert.deepEqual(directive.production.canonicalClasses, ['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED']);
  assert.equal(directive.production.membership, 'DYNAMIC_EVIDENCE');
  assert.equal(directive.production.countsDerivedFromMembership, true);
  assert.equal(directive.production.fixedClassCounts, false);
  assert.equal(directive.production.gameIdsPinned, false);
  assert.equal(directive.production.numericLabelsAreAliasesOnly, true);
  assert.equal(directive.production.numericLabelsOwnerRemappable, true);
  assert.deepEqual(directive.production.numericLabels, {RELEASE_CONFIRMED:1,DEVELOPMENT_CONFIRMED:2,DESIGN_ONLY:3});
  assert.equal('tierCounts' in directive.production, false);
  assert.equal(directive.production.preserveExistingWebArchives, true);
  assert.equal(directive.production.preserveSaveMeaning, true);
});

test('runtime routes semantic classes to separate responsible cycles', () => {
  assert.match(multimodelWorkflow, /productionClassOf/);
  assert.match(multimodelWorkflow, /EXPECTED_PRODUCTION_CLASS/);
  assert.match(multimodelWorkflow, /NUMERIC_TIER_POLICY=ALIAS_ONLY/);
  assert.doesNotMatch(multimodelWorkflow, /\[1,2,3\]\.includes\(Number\(g\.productionTier\)\)/);
  assert.doesNotMatch(multimodelWorkflow, /Number\(s\.tier\)===1/);
  assert.doesNotMatch(multimodelWorkflow, /Number\(s\.tier\)===2/);
  assert.match(designCycle, /PRODUCTION_CLASSES\.DESIGN_ONLY/);
  assert.match(designCycle, /DESIGN_ONLY_REQUIRED/);
  assert.doesNotMatch(designCycle, /PRODUCTION_CLASSES\.DEVELOPMENT_CONFIRMED/);
  assert.doesNotMatch(designCycle, /PRODUCTION_CLASSES\.RELEASE_CONFIRMED/);
  assert.match(developmentCycle, /PRODUCTION_CLASSES\.DEVELOPMENT_CONFIRMED/);
  assert.match(releaseCycle, /PRODUCTION_CLASSES\.RELEASE_CONFIRMED/);
  assert.match(productionPipeline, /company-design-cycle\.mjs[\s\S]*company-design-baseline-gate\.mjs[\s\S]*company-design-artbook\.mjs/);
});

test('current directive keeps distinct department leads and one Game Designer', () => {
  assert.equal(directive.ai.departmentMultimodelStartsAtClass, 'DESIGN_ONLY');
  assert.equal(directive.ai.minDistinctModelsPerDepartment, 3);
  assert.equal(directive.ai.minDistinctLeadModelsAcrossDepartments, 5);
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct, true);
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign, true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle, true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting, true);
  assert.equal(directive.ai.departmentModeByClass.DESIGN_ONLY, 'DISTINCT_LEAD_MULTIMODEL_DESIGN_REVIEW_AND_MEETING');
  assert.equal(directive.ai.departmentModeByClass.DEVELOPMENT_CONFIRMED, 'DISTINCT_LEAD_GATED_DIRECT_PLAY_TECH_VALIDATION');
  assert.equal(directive.ai.departmentModeByClass.RELEASE_CONFIRMED, 'DISTINCT_LEAD_GATED_DIRECT_RELEASE_RISK_WATCH');
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and is absent from DESIGN_ONLY', () => {
  const development = directive.classes.DEVELOPMENT_CONFIRMED;
  const release = directive.classes.RELEASE_CONFIRMED;
  assert.equal(directive.ai.vibe2.startsAtClass, 'DEVELOPMENT_CONFIRMED');
  assert.equal('DESIGN_ONLY' in directive.ai.vibe2.roleByClass, false);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED, 'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED, 'PRIMARY_DEVELOPMENT_ENGINE');
  assert.equal(directive.classes.DESIGN_ONLY.requiredFlow.includes('VIBE2_VALIDATION_LEARNING'), false);
  assert.equal(development.baseline, 'DEVELOPMENT_BASELINE');
  assert.equal(development.executionMode, 'GATED_DIRECT');
  assert.equal(development.webPurpose, 'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(development.unityPurpose, 'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(development.aiMayInventValidationPass, false);
  assert.deepEqual(development.decisionStates, ['KEEP','CHANGE','DROP','HOLD']);
  assert.equal(release.baseline, 'RELEASE_BASELINE');
  assert.equal(release.target, 'UNITY_ANDROID');
  assert.equal(release.vibe2PrimaryDeveloper, true);
  assert.equal(release.coreDesignLock, true);
  assert.deepEqual(release.releaseStates, ['FIX_AND_REVERIFY','RELEASE_BLOCKED','RELEASE_READY']);
});

test('legacy numeric tiers remain aliases only', () => {
  assert.equal(directive.tiersCompatibility.purpose, 'DISPLAY_AND_BACKWARD_COMPATIBILITY_ALIAS_ONLY');
  assert.equal(directive.tiersCompatibility['1'], 'RELEASE_CONFIRMED');
  assert.equal(directive.tiersCompatibility['2'], 'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.tiersCompatibility['3'], 'DESIGN_ONLY');
  assert.equal(directive.tiers['1'].productionClass, 'RELEASE_CONFIRMED');
  assert.equal(directive.tiers['2'].productionClass, 'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.tiers['3'].productionClass, 'DESIGN_ONLY');
});

test('central contract cannot silently enable paid AI or paid runners', () => {
  assert.equal(directive.ai.paidAiAllowed, false);
  assert.equal(directive.ai.paidRunnerAllowed, false);
  assert.ok(directive.rules.includes('paid-ai-paid-overage-and-paid-runners-remain-forbidden'));
});
