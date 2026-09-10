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
    id: 'T1-A', slug: 'tier1-a', name: 'Tier1 A', productionTier: 1,
    sourcePath: 'web-games/tier1-a', productionSourcePath: 'unity-games/tier1-a',
    unityProjectReady: true, dedicatedDevelopmentLane: 'UNITY_PRIMARY',
    developmentFocus: { total: 10 }, protectedValues: ['core-loop'],
  },
  {
    id: 'T1-B', slug: 'tier1-b', name: 'Tier1 B', productionTier: 1,
    sourcePath: 'web-games/tier1-b', productionSourcePath: 'unity-games/tier1-b',
    unityProjectReady: true, dedicatedDevelopmentLane: 'UNITY_PRIMARY',
    developmentFocus: { total: 8 }, protectedValues: ['core-loop'],
  },
  {
    id: 'T2', slug: 'tier2', name: 'Tier2', productionTier: 2,
    sourcePath: 'web-games/tier2', profileStatus: 'DEVELOPMENT_CONFIRMED', mode: 'IMPROVE',
    developmentFocus: { total: 7 }, protectedValues: ['core-loop'],
  },
  {
    id: 'T3', slug: 'tier3', name: 'Tier3', productionTier: 3,
    sourcePath: 'web-games/tier3', profileStatus: 'DEVELOPMENT_CONFIRMED', mode: 'IMPROVE',
    developmentFocus: { total: 99 }, protectedValues: ['core-loop'],
  },
];

const portfolio = {
  status: 'ACTIVE', paidApi: false, maxModelCallsPerRun: 2, maxRunnerMinutesPerRun: 20,
  developmentFocusPolicy,
  projects,
};
const catalog = { games: [
  { id: 'tier1-a', homepageCategory: 'release-confirmed' },
  { id: 'tier1-b', homepageCategory: 'release-confirmed' },
  { id: 'tier2', homepageCategory: 'development-confirmed' },
  { id: 'tier3', homepageCategory: 'design-only' },
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

test('machine policy exposes the same 3 -> 2 -> 1 ownership split as the central document', () => {
  assert.equal(directive.policyDocument, 'COMPANY_FLOW.md');
  assert.equal(directive.tiers['3'].sourceCodeAutoDevelopment, false);
  assert.equal(directive.tiers['2'].webPurpose, 'GAMEPLAY_VALIDATION_TESTBED');
  assert.equal(directive.tiers['2'].unityPurpose, 'TECHNICAL_VALIDATION_PROTOTYPE');
  assert.equal(directive.tiers['1'].vibe2PrimaryDeveloper, true);
  assert.equal(directive.ai.departmentModeTier1, 'MULTIMODEL_ERROR_RISK_WATCH');
});

test('runtime scheduler keeps one Tier1 Unity focus while Tier2 Web validation can run beside it', () => {
  const selected = select();
  assert.equal(selected.project.id, 'T2');
  assert.equal(selected.projectLane, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.deepEqual(selected.focusedGameIds, ['T1-A']);
  assert.deepEqual(selected.nextFocusGameIds, ['T1-B']);
  assert.ok(!selected.nextDevelopmentGameIds.includes('T3'));
});

test('Tier2 runtime order is a validation slice with all departments reviewing, not Tier1 release development', () => {
  const order = build();
  assert.equal(order.run, true);
  assert.equal(order.gameId, 'T2');
  assert.equal(order.selectedReason, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.equal(order.continuous24h.mode, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.deepEqual(order.departmentReviewRoles, ['planning', 'development', 'graphics', 'qa', 'balance']);
  assert.match(order.goal, /^\[WEB_FIRST_IMPLEMENTATION\]/);
});

test('Tier1 owner priority hands off to the dedicated Vibe2 Unity lane instead of the generic Web worker', () => {
  const selected = select('tier1-a');
  assert.equal(selected.project, null);
  assert.equal(selected.dedicatedFocus, true);
  assert.equal(selected.requestedGameId, 'T1-A');

  const order = build('tier1-a');
  assert.equal(order.run, false);
  assert.equal(order.reason, 'TIER1_UNITY_FOCUS_HANDOFF');
  assert.equal(order.continuous24h.mode, 'TIER1_UNITY_FOCUS_EXTERNAL_LANE');
});

test('Tier3 cannot steal a code slot even when it has the highest score or is requested as priority', () => {
  const selected = select('tier3');
  assert.equal(selected.project.id, 'T2');
  assert.equal(selected.projectLane, 'TIER2_WEB_FIRST_IMPLEMENTATION');
  assert.equal(selected.explicitPriority, false);
});
