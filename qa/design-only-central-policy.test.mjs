import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GAME_SEED_POLICY,
  GAME_SEED_REQUIRED_FIELDS,
  validateGameSeed
} from '../tools/company-game-seed-contract.mjs';

const directive = JSON.parse(fs.readFileSync('company-directive.json', 'utf8'));
const policy = fs.readFileSync('COMPANY_FLOW.md', 'utf8');

const expectedDesignOnlyFlow = [
  'GAME_SEED',
  'GAME_DESIGNER_DRAFT',
  'FIVE_DISTINCT_DEPARTMENT_LEADS',
  'DEPARTMENT_LEAD_PLUS_ASSISTANT_MULTIMODEL_REVIEW',
  'DEPARTMENT_LEAD_INTERNAL_CONSENSUS',
  'CROSS_DEPARTMENT_LEAD_MEETING',
  'ONE_LEAD_REBUTTAL_ROUND',
  'GAME_DESIGNER_REVISION',
  'DESIGN_BASELINE_GATE',
  'ARTBOOK_EDITOR_CORE_STRATEGY'
];

const expectedBaselineRequirements = [
  'GAME_SEED_COMPLETE',
  'DISTINCT_GAME_IDENTITY',
  'CORE_FUN_CLEAR',
  'CORE_LOOP_ACTION_FEEDBACK_CHOICE_REWARD',
  'MARKET_TARGET_DIRECTION_RECORDED',
  'MOBILE_UX_DIRECTION_DEFINED',
  'STEAM_EXPANSION_DECISION_RECORDED',
  'MULTIPLAYER_EXPANSION_DECISION_RECORDED',
  'FIVE_DISTINCT_LEAD_MODELS',
  'PER_DEPARTMENT_MULTIMODEL_REVIEW_PASS',
  'NO_HIDDEN_FATAL_CONFLICT'
];

test('DESIGN_ONLY machine flow follows COMPANY_FLOW exactly at the stage level', () => {
  assert.equal(directive.policyDocument, 'COMPANY_FLOW.md');
  assert.deepEqual(directive.classes.DESIGN_ONLY.requiredFlow, expectedDesignOnlyFlow);
  assert.deepEqual(directive.classes.DESIGN_ONLY.baselineReadyRequires, expectedBaselineRequirements);
  assert.equal(directive.classes.DESIGN_ONLY.readyState, 'DESIGN_BASELINE_READY');
  assert.equal(directive.classes.DESIGN_ONLY.sourceCodeAutoDevelopment, false);
  assert.equal(directive.classes.DESIGN_ONLY.directResultMode, true);
  assert.match(policy, /GAME_SEED:\n  stage: BEFORE_GAME_DESIGNER_DRAFT/);
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and is inactive in DESIGN_ONLY', () => {
  assert.equal(directive.ai.vibe2.startsAtClass, 'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive, false);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass, 'DESIGN_ONLY'), false);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED, 'VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED, 'PRIMARY_DEVELOPMENT_ENGINE');
  assert.match(policy, /Vibe2:\n  startsAt: DEVELOPMENT_CONFIRMED/);
});

test('GAME_SEED machine contract mirrors central required fields and platform decisions', () => {
  assert.deepEqual(directive.gameSeed.requiredFields, GAME_SEED_REQUIRED_FIELDS);
  assert.equal(directive.gameSeed.requiredBeforeDesignerDraft, true);
  assert.equal(directive.gameSeed.initialTargetPlatform, GAME_SEED_POLICY.initialTargetPlatform);
  assert.equal(directive.gameSeed.initialPlayMode, GAME_SEED_POLICY.initialPlayMode);
  assert.deepEqual(directive.gameSeed.steamDecisionValues, GAME_SEED_POLICY.steamDecisionValues);
  assert.deepEqual(directive.gameSeed.multiplayerDecisionValues, GAME_SEED_POLICY.multiplayerDecisionValues);
  assert.deepEqual(directive.gameSeed.multiplayerExpansionValueValues, GAME_SEED_POLICY.multiplayerExpansionValueValues);
});

test('valid GAME_SEED passes without requiring unavailable numeric market data', () => {
  const result = validateGameSeed({
    GAME_CATEGORY: 'ACTION_SURVIVAL_ROGUELITE',
    REFERENCE_GAMES: ['Released Reference Game'],
    CORE_FUN_TO_LEARN: 'Short-session survival pressure with readable upgrade choices',
    CORE_LOOP: ['fight', 'choose', 'grow', 'repeat'],
    DISTINCT_IDENTITY: 'Original setting, characters, presentation and system combination',
    MARKET_EVIDENCE_SUMMARY: 'UNKNOWN numeric market fields; qualitative benchmark only',
    TARGET_AUDIENCE: 'mobile action players',
    TARGET_SESSION_DIRECTION: 'short repeatable sessions',
    INITIAL_TARGET_PLATFORM: 'ANDROID_MOBILE',
    INITIAL_PLAY_MODE: 'SINGLE_PLAYER',
    STEAM_EXPANSION_POSSIBLE: 'POSSIBLE',
    MULTIPLAYER_EXPANSION_POSSIBLE: 'NOT_RECOMMENDED',
    MULTIPLAYER_EXPANSION_VALUE: 'LOW'
  });
  assert.equal(result.pass, true, result.errors.join('\n'));
});

test('numeric market claims require both source and observedAt', () => {
  const result = validateGameSeed({
    GAME_CATEGORY: 'CASUAL',
    REFERENCE_GAMES: ['Released Reference Game'],
    CORE_FUN_TO_LEARN: 'simple repeatable interaction',
    CORE_LOOP: ['act', 'feedback', 'reward'],
    DISTINCT_IDENTITY: 'original expression and system combination',
    MARKET_EVIDENCE_SUMMARY: { numericClaims: [{ metric: 'rating', value: 4.8 }] },
    TARGET_AUDIENCE: 'casual mobile players',
    TARGET_SESSION_DIRECTION: 'short sessions',
    INITIAL_TARGET_PLATFORM: 'ANDROID_MOBILE',
    INITIAL_PLAY_MODE: 'SINGLE_PLAYER',
    STEAM_EXPANSION_POSSIBLE: 'NOT_RECOMMENDED',
    MULTIPLAYER_EXPANSION_POSSIBLE: 'NOT_RECOMMENDED',
    MULTIPLAYER_EXPANSION_VALUE: 'LOW'
  });
  assert.equal(result.pass, false);
  assert.ok(result.errors.some(error => error.includes('.source is required')));
  assert.ok(result.errors.some(error => error.includes('.observedAt is required')));
});
