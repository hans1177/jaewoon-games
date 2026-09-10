import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectContinuousTarget, build24hAutonomousWorkOrder } from '../tools/autonomous-24h-work-planner.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directive = JSON.parse(fs.readFileSync(path.join(repoRoot, 'company-directive.json'), 'utf8'));

const filesystem = { existsSync: () => true };
const date = '2026-09-11';
const developmentFocusPolicy = {
  maxFocusedGames: 1,
  targetFocusedGames: 1,
  focusStage: 'RELEASE_CONFIRMED',
  fillVacantFocusedSlots: true,
  focusThreshold: 0,
  nextDevelopmentThreshold: 0,
  tier2WebPrototypeAllowedAlongsideUnityFocus: true,
};

const projects = [
  {
    id: 'T1-A', slug: 'tier1-a', name: 'Release A', productionClass: 'RELEASE_CONFIRMED', productionTier: 3,
    sourcePath: 'web-games/tier1-a', productionSourcePath: 'unity-games/tier1-a',
    unityProjectReady: true, dedicatedDevelopmentLane: 'UNITY_PRIMARY',
    developmentFocus: { total: 10 }, protectedValues: ['core-loop'],
  },
  {
    id: 'T1-B', slug: 'tier1-b', name: 'Release B', productionClass: 'RELEASE_CONFIRMED', productionTier: 3,
    sourcePath: 'web-games/tier1-b', productionSourcePath: 'unity-games/tier1-b',
    unityProjectReady: true, dedicatedDevelopmentLane: 'UNITY_PRIMARY',
    developmentFocus: { total: 8 }, protectedValues: ['core-loop'],
  },
  {
    id: 'T2', slug: 'tier2', name: 'Development', productionClass: 'DEVELOPMENT_CONFIRMED', productionTier: 1,
    sourcePath: 'web-games/tier2', profileStatus: 'DEVELOPMENT_CONFIRMED', mode: 'IMPROVE',
    developmentFocus: { total: 7 }, protectedValues: ['core-loop'],
  },
  {
    id: 'T3', slug: 'tier3', name: 'Design', productionClass: 'DESIGN_ONLY', productionTier: 1,
    sourcePath: 'web-games/tier3', profileStatus: 'DEVELOPMENT_CONFIRMED', mode: 'IMPROVE',
    developmentFocus: { total: 99 }, protectedValues: ['core-loop'],
  },
];

const portfolio = {
  status: 'ACTIVE', paidApi: false, maxModelCallsPerRun: 2, maxRunnerMinutesPerRun: 20,
  productionClassPolicy: { fixedCounts: false },
  developmentFocusPolicy,
  projects,
};
const catalog = { games: [
  { id: 'tier1-a', productionClass: 'RELEASE_CONFIRMED', homepageCategory: 'design-only' },
  { id: 'tier1-b', productionClass: 'RELEASE_CONFIRMED', homepageCategory: 'design-only' },
  { id: 'tier2', productionClass: 'DEVELOPMENT_CONFIRMED', homepageCategory: 'release-confirmed' },
  { id: 'tier3', productionClass: 'DESIGN_ONLY', homepageCategory: 'development-confirmed' },
] };
const artbooks = { artbooks: [
  { gameId: 'tier1-a', status: 'completed-artbook', lifecycle: { state: 'RELEASE_BASELINE' } },
  { gameId: 'tier1-b', status: 'completed-artbook', lifecycle: { state: 'RELEASE_BASELINE' } },
  { gameId: 'tier2', status: 'completed-artbook', lifecycle: { state: 'DESIGN_BASELINE' } },
  { gameId: 'tier3', status: 'completed-artbook', lifecycle: { state: 'DESIGN_BASELINE' } },
] };
const queueState = { version: 2, attempts: [] };

function select(priorityGameId = '') {
  return selectContinuousTarget({
    portfolio, artbooks, catalog, queueState, date, priorityGameId, filesystem,
    now: new Date('2026-09-11T00:00:00Z'),
  });
}

function build(priorityGameId = '') {
  return build24hAutonomousWorkOrder({
    portfolio, artbooks, health: { games: [] }, catalog, diagnostics: {}, queueState,
    date, priorityGameId, filesystem, now: new Date('2026-09-11T00:00:00Z'),
  });
}

test('machine policy exposes semantic ownership classes and numeric aliases separately', () => {
  assert.equal(directive.policyDocument, 'COMPANY_FLOW.md');
  assert.equal(directive.classes.DESIGN_ONLY.sourceCodeAutoDevelopment, false);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.webPurpose, 'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityPurpose, 'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(directive.classes.RELEASE_CONFIRMED.vibe2PrimaryDeveloper, true);
  assert.equal(directive.ai.departmentModeByClass.RELEASE_CONFIRMED, 'DISTINCT_LEAD_GATED_DIRECT_RELEASE_RISK_WATCH');
  assert.equal(directive.production.numericLabelsAreAliasesOnly, true);
});

test('runtime scheduler keeps one RELEASE_CONFIRMED Unity focus while DEVELOPMENT_CONFIRMED Web validation can run beside it', () => {
  const selected = select();
  assert.equal(selected.project.id, 'T2');
  assert.equal(selected.projectLane, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.deepEqual(selected.focusedGameIds, ['T1-A']);
  assert.deepEqual(selected.nextFocusGameIds, ['T1-B']);
  assert.ok(!selected.nextDevelopmentGameIds.includes('T3'));
});

test('DEVELOPMENT_CONFIRMED runtime order is a validation slice with all departments reviewing', () => {
  const order = build();
  assert.equal(order.run, true);
  assert.equal(order.gameId, 'T2');
  assert.equal(order.selectedReason, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.equal(order.continuous24h.mode, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.deepEqual(order.departmentReviewRoles, ['planning', 'development', 'graphics', 'qa', 'balance']);
  assert.match(order.goal, /^\[WEB_FIRST_IMPLEMENTATION\]/);
});

test('RELEASE_CONFIRMED owner priority hands off to the dedicated Vibe2 Unity lane', () => {
  const selected = select('tier1-a');
  assert.equal(selected.project, null);
  assert.equal(selected.dedicatedFocus, true);
  assert.equal(selected.requestedGameId, 'T1-A');

  const order = build('tier1-a');
  assert.equal(order.run, false);
  assert.equal(order.reason, 'TIER1_UNITY_FOCUS_HANDOFF');
  assert.equal(order.continuous24h.mode, 'TIER1_UNITY_FOCUS_EXTERNAL_LANE');
});

test('DESIGN_ONLY cannot steal a code slot even with stale numeric tier and the highest score', () => {
  const selected = select('tier3');
  assert.equal(selected.project.id, 'T2');
  assert.equal(selected.projectLane, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.equal(selected.explicitPriority, false);
});
