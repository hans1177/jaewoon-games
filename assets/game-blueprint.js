// 파일명: assets/game-blueprint.js
// 역할: 장르/자연어 요구사항 기반 게임 구성 계획 및 공통 시스템 추천
// 규칙: 기존 게임 규칙/저장구조 보존, 명시 설정 우선, 게임별 최소 연결

import { buildGamePreset } from './game-presets.js';
import { createGameKit } from './game-kit.js';

const KIT_SYSTEM_MAP = Object.freeze({
  'd20-rules': 'd20Rules',
  'turn-combat': 'turnBasedCombat',
  'character-progression': 'characterProgression',
  'inventory-equipment': 'inventoryEquipment',
  'quest-dialogue': 'questDialogue',
  'skill-effects': 'skillEffects',
  'economy-loot-shop': 'economySystems',
  'stat-modifiers': 'statModifiers',
  'crafting-recipes': 'craftingRecipes',
  'achievements-unlocks': 'achievementsUnlocks',
  'save-versioning': 'versionedSave',
});

const GENRE_DEFAULT_OPTIONS = Object.freeze({
  rpg: Object.freeze({ characterProgression: true, inventoryEquipment: true, questDialogue: true, skillEffects: true, economySystems: true, statModifiers: true, achievementsUnlocks: true, versionedSave: true }),
  survival: Object.freeze({ inventoryEquipment: true, skillEffects: true, economySystems: true, statModifiers: true, craftingRecipes: true, versionedSave: true }),
  defense: Object.freeze({ skillEffects: true, economySystems: true, statModifiers: true, versionedSave: true }),
  strategy: Object.freeze({ economySystems: true, statModifiers: true, versionedSave: true }),
  action: Object.freeze({ characterProgression: true, skillEffects: true, statModifiers: true, achievementsUnlocks: true, versionedSave: true }),
  adventure: Object.freeze({ inventoryEquipment: true, questDialogue: true, statModifiers: true, achievementsUnlocks: true, versionedSave: true }),
  puzzle: Object.freeze({ versionedSave: true }),
});

const PROMPT_GENRE_RULES = Object.freeze([
  Object.freeze({ genre: 'defense', words: ['디펜스', '타워 디펜스', '방어', '웨이브', '포탑'] }),
  Object.freeze({ genre: 'survival', words: ['생존', '낮과 밤', '허기', '갈증', '채집', '제작'] }),
  Object.freeze({ genre: 'strategy', words: ['전략', '영지', '부대', '병력', '정복', '영토'] }),
  Object.freeze({ genre: 'rpg', words: ['rpg', '알피지', '레벨업', '퀘스트', '장비', '경험치'] }),
  Object.freeze({ genre: 'action', words: ['액션', '자동공격', '보스', '콤보', '횡스크롤'] }),
  Object.freeze({ genre: 'adventure', words: ['어드벤처', '모험', '탐험', '퍼즐 탐험'] }),
  Object.freeze({ genre: 'puzzle', words: ['퍼즐', '블록', '매칭', '논리'] }),
]);

const PROMPT_OPTION_RULES = Object.freeze([
  Object.freeze({ key: 'multiplayer', words: ['멀티', '협동', '친구와', '2인', '3인', '4인', 'pvp'] }),
  Object.freeze({ key: 'aiCompanions', words: ['동료 ai', 'ai 동료', 'ai 아군', '동료가 자동'] }),
  Object.freeze({ key: 'npcDialogue', words: ['npc 대화', 'npc와 대화', '대화형 npc', 'ai npc'] }),
  Object.freeze({ key: 'd20Rules', words: ['d20', '주사위', '내성 굴림', '선제권'] }),
  Object.freeze({ key: 'turnBasedCombat', words: ['턴제', '턴 방식', '교대로 공격'] }),
  Object.freeze({ key: 'characterProgression', words: ['레벨업', '경험치', '스탯 포인트', '스킬 포인트'] }),
  Object.freeze({ key: 'inventoryEquipment', words: ['인벤토리', '장비', '아이템 장착', '가방'] }),
  Object.freeze({ key: 'questDialogue', words: ['퀘스트', '임무', 'npc 대화', '선택지'] }),
  Object.freeze({ key: 'skillEffects', words: ['스킬', '버프', '디버프', '쿨타임'] }),
  Object.freeze({ key: 'economySystems', words: ['상점', '골드', '재화', '드랍', '보상'] }),
  Object.freeze({ key: 'craftingRecipes', words: ['제작', '조합', '레시피', '재료'] }),
  Object.freeze({ key: 'achievementsUnlocks', words: ['업적', '칭호', '해금'] }),
  Object.freeze({ key: 'versionedSave', words: ['세이브', '저장', '이어하기', '불러오기'] }),
]);

const PLATFORM_WORDS = Object.freeze({
  godot: Object.freeze(['godot', '고도', '고도엔진']),
  web: Object.freeze(['웹게임', '웹 게임', '브라우저', 'html', '페이지']),
});

export const DEFAULT_ASSET_POLICY = Object.freeze({
  preferExistingAssets: true,
  downloadOnDemand: true,
  licenseCheckRequired: true,
  preferredLicenses: Object.freeze(['CC0', 'commercial-no-attribution', 'CC-BY']),
  blockedLicenses: Object.freeze(['NC', 'unknown', 'unclear-redistribution']),
  maxSingleAssetBytes: 104857600,
});

function mergeKitOptions(base = {}, override = {}) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value === undefined) continue;
    result[key] = value;
  }
  return result;
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

export function inferVibeIntent(prompt = '') {
  const text = String(prompt || '').trim().toLowerCase();
  if (!text) return Object.freeze({ genre: null, mixedGenres: Object.freeze([]), options: Object.freeze({}), platform: 'auto' });

  const matchedGenres = PROMPT_GENRE_RULES.filter((rule) => containsAny(text, rule.words)).map((rule) => rule.genre);
  const genre = matchedGenres[0] || null;
  const mixedGenres = [...new Set(matchedGenres.slice(1))];
  const options = {};
  for (const rule of PROMPT_OPTION_RULES) {
    if (containsAny(text, rule.words)) options[rule.key] = true;
  }

  let platform = 'auto';
  if (containsAny(text, PLATFORM_WORDS.godot)) platform = 'godot';
  else if (containsAny(text, PLATFORM_WORDS.web)) platform = 'web';

  return Object.freeze({ genre, mixedGenres: Object.freeze(mixedGenres), options: Object.freeze(options), platform });
}

function resolvePlatform(value, inferred) {
  const requested = String(value || 'auto').toLowerCase();
  if (requested === 'godot' || requested === 'web') return requested;
  return inferred === 'godot' || inferred === 'web' ? inferred : 'web';
}

function inferKitOptions(preset) {
  const inferred = {};
  for (const system of preset.systems || []) {
    const key = KIT_SYSTEM_MAP[system];
    if (key) inferred[key] = true;
  }
  return inferred;
}

function buildMaterialPlan(assetCategories = [], overrides = {}) {
  const requested = [...new Set((assetCategories || []).map((item) => String(item)).filter(Boolean))];
  const policy = Object.freeze({ ...DEFAULT_ASSET_POLICY, ...(overrides.policy || {}) });
  return Object.freeze({
    categories: Object.freeze(requested),
    workflow: Object.freeze(['reuse-existing-assets','search-approved-free-sources-if-missing','verify-license-per-asset','download-only-needed-assets','record-license-and-source','remove-unused-assets']),
    policy,
  });
}

function buildQaPlan(qaItems = []) {
  const checks = [...new Set((qaItems || []).map((item) => String(item)).filter(Boolean))];
  return Object.freeze({ checks: Object.freeze(checks), requiredBaseline: Object.freeze(['boot','restart','save-load','touch','console-errors']), mobileFirst: true, preserveExistingBehavior: true });
}

export function buildGameBlueprint({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, assetPlanOptions = {}, useGenreDefaults = true } = {}) {
  const intent = inferVibeIntent(prompt);
  const normalizedGenre = String(genre || intent.genre || '').toLowerCase();
  if (!normalizedGenre) throw new Error('game genre or understandable game prompt required');

  const resolvedMixGenres = mixGenres.length ? mixGenres : intent.mixedGenres;
  const inferredPresetOptions = mergeKitOptions(intent.options, presetOptions);
  const genreDefaults = useGenreDefaults ? (GENRE_DEFAULT_OPTIONS[normalizedGenre] || {}) : {};
  const preset = buildGamePreset({ genre: normalizedGenre, mixGenres: resolvedMixGenres, ...inferredPresetOptions });
  const inferred = inferKitOptions(preset);
  const resolvedKitOptions = mergeKitOptions(mergeKitOptions(genreDefaults, inferred), kitOptions);
  const kitConfig = Object.freeze({ gameId: String(gameId || 'game'), ...resolvedKitOptions });
  const materialPlan = buildMaterialPlan(preset.assets, assetPlanOptions);
  const qaPlan = buildQaPlan(preset.qa);
  const resolvedPlatform = resolvePlatform(platform, intent.platform);

  return Object.freeze({
    gameId: String(gameId || 'game'), genre: preset.genre, mixedGenres: preset.mixedGenres,
    platform: resolvedPlatform, intent,
    systems: preset.systems, assets: preset.assets, qa: preset.qa, rules: preset.rules,
    kitConfig, materialPlan, qaPlan,
    createKit() { return createGameKit(kitConfig); },
    plan() {
      return Object.freeze({
        gameId: String(gameId || 'game'), genre: preset.genre, mixedGenres: preset.mixedGenres,
        platform: resolvedPlatform, intent, systems: preset.systems, materialPlan, qaPlan,
        preservation: Object.freeze({
          preserveExistingBalance: preset.rules.preserveExistingBalance,
          preserveSaveFormat: preset.rules.preserveSaveFormat,
          mobileFirst: preset.rules.mobileFirst,
          saveMigrationsRequiredForBreakingChanges: preset.rules.saveMigrationsRequiredForBreakingChanges,
        }),
      });
    },
  });
}

export function createGameFromBlueprint(options = {}) {
  const blueprint = buildGameBlueprint(options);
  return Object.freeze({ blueprint, kit: blueprint.createKit() });
}

export { GENRE_DEFAULT_OPTIONS };

if (typeof window !== 'undefined') {
  window.buildJaewoonGameBlueprint = buildGameBlueprint;
  window.createJaewoonGameFromBlueprint = createGameFromBlueprint;
  window.inferJaewoonVibeIntent = inferVibeIntent;
}
