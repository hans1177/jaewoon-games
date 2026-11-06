// 파일명: qa/design-only-central-policy.test.mjs
// 임포트·메인: 현재 중앙 설계 흐름과 유효한 접수 입력을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GAME_SEED_POLICY,
  GAME_SEED_REQUIRED_FIELDS,
  validateGameSeed
} from '../tools/company-game-seed-contract.mjs';

const directive = JSON.parse(fs.readFileSync('company-directive.json', 'utf8'));
const roadmap = JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json', 'utf8'));

const expectedDesignOnlyFlow = [
  'GAME_SEED',
  'COMMON_CORE_MINIMUM_DESIGN',
  'ROBLOX_PLATFORM_PROFILE',
  'UNITY_PLATFORM_PROFILE',
  'MINIMUM_DUAL_PLATFORM_DESIGN_CONTRACT'
];

const expectedBaselineRequirements = [
  'GAME_SEED_COMPLETE',
  'MINIMUM_COMMON_CORE_READY',
  'ROBLOX_PLATFORM_PROFILE_READY',
  'UNITY_PLATFORM_PROFILE_READY',
  'PLATFORM_PROFILES_DISTINCT'
];

test('DESIGN_ONLY machine flow follows the canonical machine policy at the stage level', () => {
  assert.equal(directive.policyDocument, 'company-learning/platform-release-roadmap.json');
  assert.deepEqual(directive.classes.DESIGN_ONLY.requiredFlow, expectedDesignOnlyFlow);
  assert.deepEqual(directive.classes.DESIGN_ONLY.baselineReadyRequires, expectedBaselineRequirements);
  assert.equal(directive.classes.DESIGN_ONLY.readyState, 'MINIMUM_DESIGN_READY');
  assert.equal(directive.classes.DESIGN_ONLY.sourceCodeAutoDevelopment, false);
  assert.equal(directive.classes.DESIGN_ONLY.directResultMode, true);
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
});

test('Vibe2 starts at DEVELOPMENT_CONFIRMED and is inactive in DESIGN_ONLY', () => {
  assert.equal(directive.ai.vibe2.startsAtClass, 'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive, false);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass, 'DESIGN_ONLY'), false);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED, 'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED, 'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(roadmap.developmentLifecycleMachine.gameDevelopmentAuthority.appliesFromStage,'MINIMUM_DESIGN_CONTRACT_READY');
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
    INITIAL_TARGET_PLATFORM: 'ROBLOX',
    INITIAL_PLAY_MODE: 'SINGLE_PLAYER',
    STEAM_EXPANSION_POSSIBLE: 'POSSIBLE',
    MULTIPLAYER_EXPANSION_POSSIBLE: 'NOT_RECOMMENDED',
    MULTIPLAYER_EXPANSION_VALUE: 'LOW',
    CROSS_PLATFORM_EXPANSION_VALUE: '동일 핵심 플레이와 저장 의미를 보존해 다른 승인 플랫폼에 적용한다.'
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
