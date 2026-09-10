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

const requiredFlowHeadings = [
  '## 4. 3분류 — Design Baseline',
  '## 5. 2분류 — Development Baseline',
  '## 6. 1분류 — Release Baseline / Vibe2 본개발',
];

const requiredTier3Flow = [
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

test('fixed tier counts and dynamic membership stay intact', () => {
  assert.deepEqual(directive.production.tierCounts, {
    releaseConfirmed: 2,
    developmentConfirmed: 3,
    designOnly: 'ALL_REMAINING',
  });
  assert.equal(directive.production.membership, 'DYNAMIC_EVIDENCE_RANKED');
  assert.equal(directive.production.gameIdsPinned, false);
  assert.equal(directive.production.preserveExistingWebArchives, true);
  assert.equal(directive.production.preserveSaveMeaning, true);
});

test('tier 3 is multimodel design review led by one Game Designer, not source-code development', () => {
  assert.equal(directive.ai.departmentMultimodelStartsAtTier, 3);
  assert.equal(directive.ai.minDistinctModelsPerDepartment, 3);
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign, true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle, true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterMeeting, true);
  assert.equal(directive.ai.departmentModeTier3, 'MULTIMODEL_DESIGN_REVIEW_AND_MEETING');
  assert.equal(directive.ai.vibe2.tier3Role, 'VALIDATION_AND_LEARNING');
  assert.equal(directive.ai.vibe2.designOrArtbookPrimaryAuthorInTier3Or2, false);
  assert.equal(directive.tiers['3'].baseline, 'DESIGN_BASELINE');
  assert.equal(directive.tiers['3'].sourceCodeAutoDevelopment, false);
  assert.deepEqual(directive.tiers['3'].requiredFlow, requiredTier3Flow);
});

test('tier 2 validates fun in Web and feasibility in Unity with multimodel departments', () => {
  assert.equal(directive.ai.departmentModeTier2, 'MULTIMODEL_DETAILED_PLAY_TECH_REVIEW_AND_MEETING');
  assert.equal(directive.ai.vibe2.tier2Role, 'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.tiers['2'].baseline, 'DEVELOPMENT_BASELINE');
  assert.equal(directive.tiers['2'].webPurpose, 'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(directive.tiers['2'].unityPurpose, 'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(directive.tiers['2'].webBeforeUnityByDefault, true);
  assert.equal(directive.tiers['2'].unityMayRunEarlyWhenEngineBehaviorDefinesCoreFun, true);
  assert.deepEqual(directive.tiers['2'].decisionStates, ['KEEP', 'CHANGE', 'DROP', 'HOLD']);
});

test('tier 1 keeps Vibe2 as primary Unity Android developer and departments on risk watch', () => {
  assert.equal(directive.ai.departmentModeTier1, 'MULTIMODEL_ERROR_RISK_WATCH');
  assert.equal(directive.ai.vibe2.tier1Role, 'PRIMARY_DEVELOPMENT_ENGINE');
  assert.equal(directive.tiers['1'].baseline, 'RELEASE_BASELINE');
  assert.equal(directive.tiers['1'].target, 'UNITY_ANDROID');
  assert.equal(directive.tiers['1'].vibe2PrimaryDeveloper, true);
  assert.equal(directive.tiers['1'].departmentDefaultRole, 'ERROR_AND_RELEASE_RISK_REVIEW');
  assert.equal(directive.tiers['1'].coreDesignLock, true);
  assert.equal(directive.tiers['1'].exceptionMeetingForReleaseBlockingIssues, true);
  assert.deepEqual(directive.tiers['1'].releaseStates, ['RELEASE_READY', 'FIX_AND_REVERIFY', 'RELEASE_BLOCKED']);
});

test('central contract cannot silently enable paid AI or paid runners', () => {
  assert.equal(directive.ai.paidAiAllowed, false);
  assert.equal(directive.ai.paidRunnerAllowed, false);
  assert.ok(directive.rules.includes('paid-ai-paid-overage-and-paid-runners-remain-forbidden'));
});
