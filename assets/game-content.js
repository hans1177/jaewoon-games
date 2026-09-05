// 파일명: assets/game-content.js
// 역할: 블루프린트의 자연어 결과를 실제 게임 콘텐츠 데이터로 정규화하며 AI 파티 구성도 포함
// 규칙: 명시된 값 우선, 미지정 값은 안전한 기본값, 기존 게임 자동 변경 금지

const DEFAULT_CONTENT = Object.freeze({
  map: Object.freeze({ width: 1200, height: 760, theme: 'default' }),
  waves: Object.freeze({ total: 1, spawnInterval: 4, countPerSpawn: 1, enemyTypes: Object.freeze([]) }),
  rewards: Object.freeze({ perEnemy: 0, boss: 0, currency: 'gold' }),
  crafting: Object.freeze([]),
  items: Object.freeze([]),
  bosses: Object.freeze([]),
  party: Object.freeze({ maxPlayers: 1, aiCount: 0, aiRoles: Object.freeze([]), mixedHumanAi: false }),
});

const KNOWN_RESOURCES = Object.freeze(['나무', '돌', '조약돌', '철', '광석', '가죽', '섬유', '밧줄', '벌침', '전갈 꼬리', '개미 턱', '개미 몸통']);
const ITEM_WORDS = Object.freeze(['검', '칼', '활', '총', '창', '도끼', '지팡이', '방패', '갑옷', '목걸이', '물약', '무기', '장비', '아이템']);
const AI_ROLES = Object.freeze(['탱커', '전사', '근접', '궁수', '원거리', '힐러', '지원', '마법사']);

function number(value, fallback, min = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function hasName(value, words) {
  return words.some((word) => String(value || '').includes(word));
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function buildEnemyTypes(entityRules = {}) {
  return Object.entries(entityRules)
    .filter(([name]) => hasName(name, ['적', '몬스터', '고블린', '오크', '좀비', '전갈', '거미', '벌', '보스']))
    .map(([name, props]) => Object.freeze({
      name,
      hp: number(props?.hp, 20, 1),
      damage: number(props?.damage, 5, 0),
      range: number(props?.range, 28, 0),
      speed: number(props?.speed, 32, 0),
      cooldown: number(props?.cooldown, 1, 0.05),
      actions: Object.freeze(unique([...(props?.actions || [])])),
    }));
}

function buildBosses(entityRules = {}) {
  return Object.entries(entityRules)
    .filter(([name]) => hasName(name, ['보스']))
    .map(([name, props]) => Object.freeze({
      name,
      hp: number(props?.hp, 500, 1),
      damage: number(props?.damage, 20, 0),
      range: number(props?.range, 40, 0),
      cooldown: number(props?.cooldown, 2, 0.05),
      actions: Object.freeze(unique([...(props?.actions || [])])),
    }));
}

function buildItems(objectSpecs = []) {
  return objectSpecs
    .filter((spec) => ['weapon', 'item'].includes(spec.type) || hasName(spec.name, ITEM_WORDS))
    .map((spec) => Object.freeze({
      name: spec.name,
      type: spec.type,
      damage: spec.properties?.damage == null ? null : number(spec.properties.damage, 0),
      hp: spec.properties?.hp == null ? null : number(spec.properties.hp, 0),
      speed: spec.properties?.speed == null ? null : number(spec.properties.speed, 0),
      range: spec.properties?.range == null ? null : number(spec.properties.range, 0),
      effects: Object.freeze(unique([...(spec.effects || []), ...(spec.properties?.actions || [])])),
    }));
}

function buildCrafting(prompt, objectSpecs = []) {
  const text = String(prompt || '');
  if (!/(제작|조합|만들어|레시피|재료|공방)/.test(text)) return Object.freeze([]);

  const itemNames = unique(objectSpecs.filter((spec) => spec.type === 'weapon' || spec.type === 'item').map((spec) => spec.name));
  const resources = KNOWN_RESOURCES.filter((resource) => text.includes(resource));
  const fallbackResult = itemNames[0] || 'starter-item';
  const ingredients = resources.map((resource) => Object.freeze({ item: resource, count: 1 }));
  const recipe = Object.freeze({
    id: 'starter-craft',
    name: `${fallbackResult} 제작`,
    ingredients: Object.freeze(ingredients),
    result: fallbackResult,
    resultCount: 1,
    repeatable: true,
  });
  return Object.freeze([recipe]);
}

function buildParty(prompt, blueprint) {
  const text = String(prompt || '');
  const requestedPlayers = Math.max(1, Math.min(4, Math.floor(number(blueprint?.intent?.playerCount, 1, 1))));
  const aiMatch = text.match(/(?:AI|에이아이)\s*(?:동료|캐릭터|명|명까지)?\s*(\d+)/i);
  const aiCount = aiMatch ? Math.max(0, Math.min(4 - 1, Number(aiMatch[1]) || 0)) : (/(AI|에이아이).*(동료|협동|파티)/i.test(text) ? Math.max(0, 4 - requestedPlayers) : 0);
  const aiRoles = AI_ROLES.filter((role) => text.includes(role)).slice(0, 4);
  const defaultRoles = ['탱커', '궁수', '힐러', '지원'];
  const roles = aiCount > 0 ? (aiRoles.length ? aiRoles : defaultRoles.slice(0, aiCount)) : [];
  const maxPlayers = Math.max(requestedPlayers, requestedPlayers + aiCount);
  return Object.freeze({
    maxPlayers: Math.min(4, maxPlayers),
    humanPlayers: requestedPlayers,
    aiCount,
    aiRoles: Object.freeze(roles),
    mixedHumanAi: requestedPlayers > 0 && aiCount > 0,
    fillEmptySlotsWithAi: aiCount > 0,
  });
}

function buildMap(prompt, blueprint) {
  const text = String(prompt || '');
  let theme = 'default';
  if (/(숲|나무|초원)/.test(text)) theme = 'forest';
  else if (/(사막|황무지)/.test(text)) theme = 'desert';
  else if (/(동굴|광산)/.test(text)) theme = 'cave';
  else if (/(성|기지|마을)/.test(text)) theme = 'fort';
  return Object.freeze({ ...DEFAULT_CONTENT.map, theme, mobileFirst: blueprint?.intent?.presentation?.mobileFirst === true });
}

function buildRewards(rules, bosses, prompt) {
  const text = String(prompt || '');
  const hasCurrency = /(골드|돈|코인|재화|보상)/.test(text);
  const perEnemy = hasCurrency ? number(rules.gold, 1) : DEFAULT_CONTENT.rewards.perEnemy;
  const bossReward = bosses.length && hasCurrency ? number(rules.gold, Math.max(perEnemy * 5, 5)) : DEFAULT_CONTENT.rewards.boss;
  return Object.freeze({ perEnemy, boss: bossReward, currency: 'gold' });
}

export function buildGameContent({ blueprint = null, prompt = '', intent = null } = {}) {
  const resolvedIntent = intent || blueprint?.intent || {};
  const rules = resolvedIntent.rules || {};
  const entityRules = resolvedIntent.entityRules || {};
  const objectSpecs = resolvedIntent.objectSpecs || [];
  const enemies = buildEnemyTypes(entityRules);
  const bosses = buildBosses(entityRules);
  const waves = Object.freeze({
    total: Math.max(1, Math.floor(number(rules.waves, DEFAULT_CONTENT.waves.total, 1))),
    spawnInterval: number(rules.interval, DEFAULT_CONTENT.waves.spawnInterval, 0.25),
    countPerSpawn: Math.max(1, Math.floor(number(rules.count, DEFAULT_CONTENT.waves.countPerSpawn, 1))),
    enemyTypes: Object.freeze(enemies.map((enemy) => enemy.name)),
  });
  return Object.freeze({
    map: buildMap(prompt, blueprint),
    waves,
    enemies: Object.freeze(enemies),
    bosses: Object.freeze(bosses),
    items: Object.freeze(buildItems(objectSpecs)),
    crafting: buildCrafting(prompt, objectSpecs),
    rewards: buildRewards(rules, bosses, prompt),
    party: buildParty(prompt, blueprint),
    source: Object.freeze({ prompt: String(prompt || ''), gameId: blueprint?.gameId || null }),
    safety: Object.freeze({ reviewBeforeApply: true, autoApplyToExistingGame: false }),
  });
}

if (typeof window !== 'undefined') window.buildJaewoonGameContent = buildGameContent;
