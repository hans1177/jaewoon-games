import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readText=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const readJson=relative=>JSON.parse(readText(relative));
const flow=readText('COMPANY_FLOW.md');
const agents=readText('AGENTS.md');
const directive=readJson('company-directive.json');
const multimodelWorkflow=readText('.github/workflows/artbook-free-department-bots.yml');
const designCycle=readText('tools/company-design-cycle.mjs');
const pipeline=readText('tools/artbook-production-pipeline.mjs');

test('COMPANY_FLOW remains the single machine-oriented production policy source',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.match(flow,/sourceOfTruth: COMPANY_FLOW\.md/);
  assert.match(flow,/format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow,/humanReadableNarrativeRequired: false/);
  assert.match(flow,/ownerInstructionOverridesPolicy: true/);
  assert.match(agents,/제작 정책 원본은 \*\*`COMPANY_FLOW\.md` 하나\*\*/);
});

test('GAME_SEED central policy owns bootstrap benchmark market evidence and replenishment',()=>{
  assert.equal(directive.gameSeed.enabled,true);
  assert.equal(directive.gameSeed.requiredBeforeDesignerDraft,true);
  assert.equal(directive.gameSeed.selectionMode,'FAMOUS_SUCCESSFUL_GAME_COPY_BENCHMARK');
  assert.deepEqual(directive.gameSeed.transformationModes,['HOMAGE','REINTERPRETATION']);
  assert.equal(directive.gameSeed.sourceCodeRule,'OWN_IMPLEMENTATION_ONLY');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(new Set(directive.gameSeed.bootstrap.categories).size,6);
  assert.equal(directive.gameSeed.marketEvidence.role,'TARGET_DESIGN_REFERENCE');
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresSource,true);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresObservedAt,true);
  assert.equal(directive.gameSeed.replenishment.mode,'ONE_FOR_ONE_ONLY');
  assert.equal(directive.gameSeed.replenishment.normalPromotionDoesNotTrigger,true);
  assert.match(flow,/initialSeedBatchCount: 6/);
  assert.match(flow,/selectionMode: FAMOUS_SUCCESSFUL_GAME_COPY_BENCHMARK/);
  assert.match(flow,/sourceCodeRule: IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE/);
  assert.match(flow,/replenishment:[\s\S]*mode: ONE_FOR_ONE_ONLY/);
});

test('DESIGN_ONLY is seed-backed design review revision baseline then artbook with no Vibe2',()=>{
  const design=directive.classes.DESIGN_ONLY;
  assert.deepEqual(design.requiredFlow,[
    'GAME_SEED','GAME_DESIGNER_DRAFT','FIVE_DISTINCT_DEPARTMENT_LEADS',
    'DEPARTMENT_LEAD_PLUS_ASSISTANT_MULTIMODEL_REVIEW','DEPARTMENT_LEAD_INTERNAL_CONSENSUS',
    'CROSS_DEPARTMENT_LEAD_MEETING','ONE_LEAD_REBUTTAL_ROUND','GAME_DESIGNER_REVISION',
    'DESIGN_BASELINE_GATE','ARTBOOK_EDITOR_CORE_STRATEGY'
  ]);
  assert.equal(design.readyState,'DESIGN_BASELINE_READY');
  assert.equal(design.sourceCodeAutoDevelopment,false);
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass,'DESIGN_ONLY'),false);
  assert.match(designCycle,/GAME_SEED_REQUIRED/);
  assert.match(designCycle,/sameModelAsDraft:true/);
  assert.match(designCycle,/repeatedFiveDepartmentReview:true/);
  assert.doesNotMatch(designCycle,/VIBE2_VALIDATION_LEARNING|vibe2-validator/);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
});

test('discard policy requires redesign or real implementation evidence instead of one failure',()=>{
  assert.equal(directive.discardPolicy.general.singleFailureDoesNotImmediatelyDiscard,true);
  assert.equal(directive.discardPolicy.general.marketMetricAloneCannotDiscard,true);
  assert.equal(directive.discardPolicy.DESIGN_ONLY.discardRequiresSameDesignerRevision,true);
  assert.equal(directive.discardPolicy.DESIGN_ONLY.discardRequiresRepeatedFiveDepartmentReview,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresRealEvidence,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresTargetedRevalidation,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresFiveDepartmentAgreement,true);
  assert.match(flow,/SAME_GAME_DESIGNER_REVISION_ATTEMPTED/);
  assert.match(flow,/TARGETED_REVALIDATION_PERFORMED/);
});

test('semantic production classes are canonical and counts are evidence-derived',()=>{
  assert.equal(directive.production.canonicalField,'productionClass');
  assert.deepEqual(directive.production.canonicalClasses,['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED']);
  assert.equal(directive.production.membership,'DYNAMIC_EVIDENCE');
  assert.equal(directive.production.countsDerivedFromMembership,true);
  assert.equal(directive.production.fixedClassCounts,false);
  assert.equal(directive.production.gameIdsPinned,false);
  assert.equal(directive.production.numericLabelsAreAliasesOnly,true);
  assert.deepEqual(directive.production.numericLabels,{RELEASE_CONFIRMED:1,DEVELOPMENT_CONFIRMED:2,DESIGN_ONLY:3});
});

test('five departments keep distinct lead models and one Game Designer',()=>{
  assert.equal(directive.ai.minDistinctModelsPerDepartment,3);
  assert.equal(directive.ai.minDistinctLeadModelsAcrossDepartments,5);
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.equal(new Set(Object.values(directive.ai.departmentLeadModels)).size,5);
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign,true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting,true);
  assert.match(multimodelWorkflow,/productionClassOf/);
  assert.match(multimodelWorkflow,/NUMERIC_TIER_POLICY=ALIAS_ONLY/);
});

test('development and release retain gated execution while Vibe2 begins at development',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_DEVELOPMENT_ENGINE');
  assert.equal(development.executionMode,'GATED_DIRECT');
  assert.equal(development.webPurpose,'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(development.unityPurpose,'ANDROID_TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(development.aiMayInventValidationPass,false);
  assert.equal(release.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.equal(release.target,'UNITY_ANDROID');
  assert.equal(release.vibe2PrimaryDeveloper,true);
  assert.equal(release.coreDesignLock,true);
  assert.match(flow,/unityPurpose: ANDROID_TECHNICAL_VALIDATION_PROTOTYPE/);
});

test('legacy numeric tiers remain aliases and paid execution remains forbidden',()=>{
  assert.equal(directive.tiersCompatibility.purpose,'DISPLAY_AND_BACKWARD_COMPATIBILITY_ALIAS_ONLY');
  assert.equal(directive.tiersCompatibility['1'],'RELEASE_CONFIRMED');
  assert.equal(directive.tiersCompatibility['2'],'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.tiersCompatibility['3'],'DESIGN_ONLY');
  assert.equal(directive.ai.paidAiAllowed,false);
  assert.equal(directive.ai.paidRunnerAllowed,false);
  assert.ok(directive.rules.includes('paid-ai-paid-overage-and-paid-runners-remain-forbidden'));
});
