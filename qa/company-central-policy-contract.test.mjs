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

const requiredFlowHeadings = [
  '## 0. 회사 최종목표와 시스템 아키텍처',
  '## 5. DESIGN_ONLY — Design Baseline',
  '## 6. DEVELOPMENT_CONFIRMED — Development Baseline',
  '## 7. RELEASE_CONFIRMED — Release Baseline / Vibe2 본개발',
];

const requiredDesignFlow = [
  'GAME_DESIGNER_DRAFT',
  'FIVE_DEPARTMENT_MULTIMODEL_REVIEW',
  'DEPARTMENT_INTERNAL_CONSENSUS',
  'CROSS_DEPARTMENT_MEETING',
  'ONE_REBUTTAL_ROUND',
  'GAME_DESIGNER_REVISION',
  'DESIGN_BASELINE_GATE',
  'ARTBOOK_EDITOR_CORE_STRATEGY',
  'VIBE2_VALIDATION_LEARNING',
];

test('COMPANY_FLOW.md remains the single human-readable production policy source', () => {
  assert.equal(directive.policyDocument, 'COMPANY_FLOW.md');
  assert.match(agents, /COMPANY_FLOW\.md.*하나만 원본|유일한 사람용 제작 정책 원본/s);
  assert.match(agents, /company-directive\.json/);
  for (const heading of requiredFlowHeadings) assert.ok(flow.includes(heading), `missing central policy heading: ${heading}`);
});

test('central policy explicitly owns the company final goal and end-to-end architecture', () => {
  assert.match(flow, /게임을 만들수록 회사 전체의 설계·개발·검증·출시 능력이 향상되는 자율 게임 제작 시스템/);
  assert.match(flow, /사용자 최신 지시[\s\S]*COMPANY_FLOW\.md 중앙 정책[\s\S]*company-directive\.json 실행 설정/);
  assert.match(flow, /DESIGN_ONLY[\s\S]*Game Designer AI[\s\S]*5개 부서 × 다중 실제 모델 검토/);
  assert.match(flow, /DEVELOPMENT_CONFIRMED[\s\S]*Web Gameplay Validation[\s\S]*Unity Technical Validation/);
  assert.match(flow, /RELEASE_CONFIRMED[\s\S]*Vibe2 본개발\/통합[\s\S]*독립 QA\/회귀 검증/);
  assert.match(flow, /성공\/실패 원인 라벨링[\s\S]*검증된 패턴만 Vibe2 학습 근거/);
});

test('semantic production classes are canonical and class counts are derived, not fixed quotas', () => {
  assert.equal(directive.production.canonicalField, 'productionClass');
  assert.deepEqual(directive.production.canonicalClasses, [
    'DESIGN_ONLY',
    'DEVELOPMENT_CONFIRMED',
    'RELEASE_CONFIRMED',
  ]);
  assert.equal(directive.production.membership, 'DYNAMIC_EVIDENCE');
  assert.equal(directive.production.countsDerivedFromMembership, true);
  assert.equal(directive.production.fixedClassCounts, false);
  assert.equal(directive.production.gameIdsPinned, false);
  assert.equal(directive.production.numericLabelsAreAliasesOnly, true);
  assert.equal(directive.production.numericLabelsOwnerRemappable, true);
  assert.deepEqual(directive.production.numericLabels, {
    RELEASE_CONFIRMED: 1,
    DEVELOPMENT_CONFIRMED: 2,
    DESIGN_ONLY: 3,
  });
  assert.equal('tierCounts' in directive.production, false);
  assert.equal(directive.production.preserveExistingWebArchives, true);
  assert.equal(directive.production.preserveSaveMeaning, true);
});

test('multimodel workflow and cycle route by productionClass, never by fixed numeric meaning', () => {
  assert.match(multimodelWorkflow, /productionClassOf/);
  assert.match(multimodelWorkflow, /EXPECTED_PRODUCTION_CLASS/);
  assert.match(multimodelWorkflow, /NUMERIC_TIER_POLICY=ALIAS_ONLY/);
  assert.doesNotMatch(multimodelWorkflow, /\[1,2,3\]\.includes\(Number\(g\.productionTier\)\)/);
  assert.doesNotMatch(multimodelWorkflow, /Number\(s\.tier\)===1/);
  assert.doesNotMatch(multimodelWorkflow, /Number\(s\.tier\)===2/);
  assert.match(designCycle, /productionClassOf/);
  assert.match(designCycle, /PRODUCTION_CLASSES\.RELEASE_CONFIRMED/);
  assert.match(designCycle, /PRODUCTION_CLASSES\.DEVELOPMENT_CONFIRMED/);
  assert.match(designCycle, /PRODUCTION_CLASSES\.DESIGN_ONLY/);
  assert.doesNotMatch(designCycle, /const tier=Number\(game\.productionTier/);
  assert.doesNotMatch(designCycle, /if\(tier===/);
});

test('DESIGN_ONLY is multimodel design review led by one Game Designer, not source-code development', () => {
  assert.equal(directive.ai.departmentMultimodelStartsAtClass, 'DESIGN_ONLY');
  assert.equal(directive.ai.minDistinctModelsPerDepartment, 3);
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign, true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle, true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting, true);
  assert.equal(directive.ai.departmentModeByClass.DESIGN_ONLY, 'MULTIMODEL_DESIGN_REVIEW_AND_MEETING');
  assert.equal(directive.ai.vibe2.roleByClass.DESIGN_ONLY, 'VALIDATION_AND_LEARNING');
  assert.equal(directive.ai.vibe2.designOrArtbookPrimaryAuthorInTier3Or2, false);
  assert.equal(directive.classes.DESIGN_ONLY.baseline, 'DESIGN_BASELINE');
  assert.equal(directive.classes.DESIGN_ONLY.sourceCodeAutoDevelopment, false);
  assert.deepEqual(directive.classes.DESIGN_ONLY.requiredFlow, requiredDesignFlow);
});

test('DEVELOPMENT_CONFIRMED validates fun in Web and feasibility in Unity with multimodel departments', () => {
  const policy = directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(directive.ai.departmentModeByClass.DEVELOPMENT_CONFIRMED, 'MULTIMODEL_DETAILED_PLAY_TECH_REVIEW_AND_MEETING');
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED, 'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(policy.baseline, 'DEVELOPMENT_BASELINE');
  assert.equal(policy.webPurpose, 'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(policy.unityPurpose, 'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(policy.webBeforeUnityByDefault, true);
  assert.equal(policy.unityMayRunEarlyWhenEngineBehaviorDefinesCoreFun, true);
  assert.deepEqual(policy.decisionStates, ['KEEP', 'CHANGE', 'DROP', 'HOLD']);
});

test('RELEASE_CONFIRMED keeps Vibe2 as primary Unity Android developer and departments on risk watch', () => {
  const policy = directive.classes.RELEASE_CONFIRMED;
  assert.equal(directive.ai.departmentModeByClass.RELEASE_CONFIRMED, 'MULTIMODEL_ERROR_RISK_WATCH');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED, 'PRIMARY_DEVELOPMENT_ENGINE');
  assert.equal(policy.baseline, 'RELEASE_BASELINE');
  assert.equal(policy.target, 'UNITY_ANDROID');
  assert.equal(policy.vibe2PrimaryDeveloper, true);
  assert.equal(policy.departmentDefaultRole, 'ERROR_AND_RELEASE_RISK_REVIEW');
  assert.equal(policy.coreDesignLock, true);
  assert.equal(policy.exceptionMeetingForReleaseBlockingIssues, true);
  assert.deepEqual(policy.releaseStates, ['RELEASE_READY', 'FIX_AND_REVERIFY', 'RELEASE_BLOCKED']);
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
