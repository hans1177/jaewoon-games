// 파일명: assets/game-blueprint.js
// 역할: 쉬운 자연어 게임 요구사항을 장르/플랫폼/공통 시스템/규칙 계획으로 변환
// 규칙: 명시 설정 우선, 기존 게임 규칙/저장구조 보존, 추출 규칙은 계획으로만 반환

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

const GENRE_RULES = Object.freeze([
  Object.freeze({ genre: 'defense', words: ['디펜스', '타워', '타워디펜스', '타워 디펜스', '막아', '막기', '지켜', '지키기', '방어', '웨이브', '포탑', '적이 몰려', '적들이 계속 와', '기지를 지켜', '성 지켜'] }),
  Object.freeze({ genre: 'survival', words: ['생존', '살아남', '살아남기', '낮과 밤', '낮밤', '허기', '배고픔', '갈증', '목마름', '채집', '주워', '캐기', '제작', '만들어', '먹고 자고', '밤마다 괴물', '버텨'] }),
  Object.freeze({ genre: 'strategy', words: ['전략', '영지', '영토', '부대', '병력', '군대', '정복', '성', '마을을 차지', '땅을 차지', '전쟁', '국가', '땅 뺏', '군대 키워'] }),
  Object.freeze({ genre: 'rpg', words: ['rpg', '알피지', '레벨업', '레벨 올', '경험치', '퀘스트', '장비', '아이템 파밍', '모험가', '캐릭터 키워'] }),
  Object.freeze({ genre: 'action', words: ['액션', '싸우', '때려', '공격', '자동공격', '총', '검', '활', '콤보', '보스', '횡스크롤', '달리면서', '적을 때려'] }),
  Object.freeze({ genre: 'adventure', words: ['어드벤처', '모험', '탐험', '돌아다니', '비밀 찾', '탐색', '맵 돌아다녀'] }),
  Object.freeze({ genre: 'puzzle', words: ['퍼즐', '블록', '매칭', '맞추', '퍼즐게임', '논리', '같은 거 맞춰'] }),
]);

const OPTION_RULES = Object.freeze([
  Object.freeze({ key: 'multiplayer', words: ['멀티', '같이', '친구와', '친구랑', '친구하고', '협동', '2명', '둘이', '2인', '3명', '3인', '4명', '4인', 'pvp', '대결', '같이 하', '둘이서'] }),
  Object.freeze({ key: 'aiCompanions', words: ['동료 ai', 'ai 동료', 'ai 아군', '동료가 알아서', '친구 대신 ai', '컴퓨터 동료', '혼자 해도 동료'] }),
  Object.freeze({ key: 'npcDialogue', words: ['npc 대화', 'npc랑 말', 'npc와 말', '사람이랑 대화', '대화하는 npc', '말 걸면', 'npc한테 말'] }),
  Object.freeze({ key: 'd20Rules', words: ['d20', '20면체', '20면 주사위', '주사위', '내성 굴림', '선제권'] }),
  Object.freeze({ key: 'turnBasedCombat', words: ['턴제', '턴 방식', '교대로 공격', '한 명씩 공격', '내 턴', '상대 턴', '번갈아 싸워'] }),
  Object.freeze({ key: 'characterProgression', words: ['레벨업', '레벨 올', '경험치', '스탯 포인트', '스킬 포인트', '강해지', '성장', '캐릭터 키워'] }),
  Object.freeze({ key: 'inventoryEquipment', words: ['인벤토리', '가방', '아이템', '장비', '장착', '줍고 보관', '무기 바꾸', '갑옷', '아이템 들고 다녀'] }),
  Object.freeze({ key: 'questDialogue', words: ['퀘스트', '임무', '미션', '할 일', 'npc 대화', '선택지', '부탁', '심부름'] }),
  Object.freeze({ key: 'skillEffects', words: ['스킬', '특수기', '필살기', '버프', '디버프', '쿨타임', '기술', '필살'] }),
  Object.freeze({ key: 'economySystems', words: ['상점', '가게', '골드', '돈', '재화', '드랍', '떨어져', '보상', '코인', '판매', '구매', '돈 벌어'] }),
  Object.freeze({ key: 'craftingRecipes', words: ['제작', '조합', '레시피', '재료', '합쳐서', '만들기', '공방', '조합해서'] }),
  Object.freeze({ key: 'achievementsUnlocks', words: ['업적', '칭호', '해금', '업적 보상', '기록', '깨면 칭호'] }),
  Object.freeze({ key: 'versionedSave', words: ['세이브', '저장', '이어하기', '불러오기', '저장해', '자동저장', '나중에 이어서'] }),
]);

const PLATFORM_WORDS = Object.freeze({
  godot: Object.freeze(['godot', '고도', '고도엔진', '고도에서']),
  web: Object.freeze(['웹게임', '웹 게임', '브라우저', '인터넷에서', 'html', '페이지에서', '사이트에서']),
});

const DIRECTION_WORDS = Object.freeze({
  mobile: Object.freeze(['모바일', '핸드폰', '휴대폰', '폰으로', '스마트폰', '휴대폰으로']),
  landscape: Object.freeze(['가로', '가로화면', '옆으로']),
  portrait: Object.freeze(['세로', '세로화면', '길게']),
});

const RULE_PATTERNS = Object.freeze([
  Object.freeze({ key: 'hp', labels: ['체력', '피'], pattern: /(?:체력|피)\s*(?:을|를|은|는|이|가)?\s*(\d+)/ }),
  Object.freeze({ key: 'damage', labels: ['공격력', '데미지', '피해'], pattern: /(?:공격력|데미지|피해)\s*(?:을|를|은|는|이|가)?\s*(\d+)/ }),
  Object.freeze({ key: 'cooldown', labels: ['쿨타임', '쿨다운'], pattern: /(?:쿨타임|쿨다운)\s*(?:은|는|이|가)?\s*(\d+(?:\.\d+)?)\s*(초|s|초간)?/ }),
  Object.freeze({ key: 'interval', labels: ['간격', '마다'], pattern: /(\d+(?:\.\d+)?)\s*(초|s)\s*(?:마다|간격|후)/ }),
  Object.freeze({ key: 'count', labels: ['마리', '명', '개'], pattern: /(\d+)\s*(마리|명|개)/ }),
  Object.freeze({ key: 'waves', labels: ['웨이브'], pattern: /(?:웨이브|wave)\s*(?:를|은|는|총)?\s*(\d+)/i }),
  Object.freeze({ key: 'gold', labels: ['골드', '돈', '코인'], pattern: /(?:골드|돈|코인)\s*(?:을|를|은|는|이|가)?\s*(\d+)/ }),
]);

const ENTITY_WORDS = Object.freeze([
  '고블린', '강화 고블린', '궁수', '궁수 고블린', '오크', '보스', '포탑', '탑', '병사', '병력', '영웅',
  '플레이어', '주인공', '캐릭터', '적', '몬스터', '동료', 'npc', '나', '사마귀', '전갈', '거미', '벌',
  '좀비', '개', '고양이', '기사', '궁수병', '마법사', '상인',
]);

function mergeObjects(base = {}, override = {}) {
  return { ...base, ...Object.fromEntries(Object.entries(override || {}).filter(([, value]) => value !== undefined)) };
}

function normalizePrompt(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[!?.,~…]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b겜\b/g, '게임')
    .replace(/\b겜으로\b/g, '게임으로')
    .trim();
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function inferGenres(text) {
  const scores = GENRE_RULES.map((rule) => ({
    genre: rule.genre,
    score: rule.words.reduce((score, word) => score + (text.includes(word) ? Math.max(1, word.length / 4) : 0), 0),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.genre.localeCompare(b.genre));

  if (!scores.length) return { genre: null, mixedGenres: [] };
  const primary = scores[0].genre;
  const mixedGenres = scores.slice(1).filter((item) => item.score >= 2.5).map((item) => item.genre);
  return { genre: primary, mixedGenres: [...new Set(mixedGenres)] };
}

function inferPlatform(text) {
  if (containsAny(text, PLATFORM_WORDS.godot)) return 'godot';
  if (containsAny(text, PLATFORM_WORDS.web)) return 'web';
  return 'auto';
}

function inferPresentation(text) {
  const presentation = {};
  if (containsAny(text, DIRECTION_WORDS.mobile)) presentation.mobileFirst = true;
  if (containsAny(text, DIRECTION_WORDS.landscape)) presentation.orientation = 'landscape';
  if (containsAny(text, DIRECTION_WORDS.portrait)) presentation.orientation = 'portrait';
  return presentation;
}

function inferPlayerCount(text) {
  const patterns = [
    [/혼자|나 혼자|솔플/, 1],
    [/둘이|둘이서|2명|2인/, 2],
    [/셋이|셋이서|3명|3인/, 3],
    [/넷이|넷이서|4명|4인/, 4],
  ];
  for (const [pattern, count] of patterns) {
    if (pattern.test(text)) return count;
  }
  return null;
}

function inferRules(text) {
  const rules = {};
  for (const rule of RULE_PATTERNS) {
    const match = text.match(rule.pattern);
    if (!match) continue;
    const raw = match[1];
    const value = Number(raw);
    rules[rule.key] = Number.isFinite(value) ? value : raw;
    if (match[2] && typeof rules[rule.key] === 'number') rules[`${rule.key}Unit`] = match[2];
  }

  const conditions = [];
  if (/(밤에만|밤만|밤에는)/.test(text)) conditions.push('night-only');
  if (/(낮에만|낮만|아침에만|아침만)/.test(text)) conditions.push('day-only');
  if (/(죽으면 다시|부활|살아나)/.test(text)) conditions.push('revive');
  if (/(자동공격|자동으로 공격)/.test(text)) conditions.push('auto-attack');
  if (/(유도탄|따라가는 탄|적을 따라가)/.test(text)) conditions.push('homing-projectile');
  if (/(주변|범위|광역)/.test(text)) conditions.push('area-effect');
  if (/(밀쳐|넉백)/.test(text)) conditions.push('knockback');
  if (/(기절|스턴)/.test(text)) conditions.push('stun');
  if (/(느려|슬로우)/.test(text)) conditions.push('slow');

  if (conditions.length) rules.conditions = Object.freeze(conditions);
  return Object.freeze(rules);
}

function inferEntityRules(text) {
  const entities = {};
  const uniqueEntities = [...new Set(ENTITY_WORDS.filter((word) => text.includes(word)))];
  for (const entity of uniqueEntities) {
    const positions = [];
    let cursor = 0;
    while (cursor < text.length) {
      const index = text.indexOf(entity, cursor);
      if (index < 0) break;
      positions.push(index);
      cursor = index + entity.length;
    }
    const chunks = positions.map((start, index) => text.slice(start, positions[index + 1] ?? Math.min(text.length, start + 80)));
    const properties = {};
    for (const chunk of chunks) {
      for (const rule of RULE_PATTERNS) {
        const match = chunk.match(rule.pattern);
        if (!match) continue;
        const value = Number(match[1]);
        if (Number.isFinite(value)) properties[rule.key] = value;
        if (match[2] && typeof properties[rule.key] === 'number') properties[`${rule.key}Unit`] = match[2];
      }
    }
    if (Object.keys(properties).length) entities[entity] = Object.freeze(properties);
  }
  return Object.freeze(entities);
}

export function inferVibeIntent(prompt = '') {
  const text = normalizePrompt(prompt);
  if (!text) {
    return Object.freeze({ genre: null, mixedGenres: Object.freeze([]), options: Object.freeze({}), platform: 'auto', presentation: Object.freeze({}), playerCount: null, rules: Object.freeze({}), entityRules: Object.freeze({}) });
  }

  const genres = inferGenres(text);
  const options = {};
  for (const rule of OPTION_RULES) {
    if (containsAny(text, rule.words)) options[rule.key] = true;
  }
  const playerCount = inferPlayerCount(text);
  if (playerCount !== null && playerCount > 1) options.multiplayer = true;

  return Object.freeze({
    genre: genres.genre,
    mixedGenres: Object.freeze(genres.mixedGenres),
    options: Object.freeze(options),
    platform: inferPlatform(text),
    presentation: Object.freeze(inferPresentation(text)),
    playerCount,
    rules: inferRules(text),
    entityRules: inferEntityRules(text),
  });
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
  return Object.freeze({
    checks: Object.freeze(checks),
    requiredBaseline: Object.freeze(['boot','restart','save-load','touch','console-errors']),
    mobileFirst: true,
    preserveExistingBehavior: true,
  });
}

export function buildGameBlueprint({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, assetPlanOptions = {}, useGenreDefaults = true } = {}) {
  const intent = inferVibeIntent(prompt);
  const normalizedGenre = String(genre || intent.genre || '').toLowerCase();
  if (!normalizedGenre) throw new Error('game genre or understandable game prompt required');

  const resolvedMixGenres = Array.isArray(mixGenres) && mixGenres.length ? mixGenres : intent.mixedGenres;
  const inferredPresetOptions = mergeObjects(intent.options, presetOptions);
  const genreDefaults = useGenreDefaults ? (GENRE_DEFAULT_OPTIONS[normalizedGenre] || {}) : {};
  const preset = buildGamePreset({ genre: normalizedGenre, mixGenres: resolvedMixGenres, ...inferredPresetOptions });
  const inferred = inferKitOptions(preset);
  const resolvedKitOptions = mergeObjects(mergeObjects(genreDefaults, inferred), kitOptions);
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
