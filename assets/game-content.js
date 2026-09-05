// 파일명: assets/game-content.js
// 역할: 블루프린트의 자연어 결과를 게임 콘텐츠 데이터로 정규화
// 규칙: 명시된 값 우선, 미지정 값은 안전한 기본값, 기존 게임 자동 변경 금지

const DEFAULT_CONTENT = Object.freeze({
  map: Object.freeze({ width: 1200, height: 760, theme: 'default' }),
  waves: Object.freeze({ total: 1, spawnInterval: 4, countPerSpawn: 1, enemyTypes: Object.freeze([]) }),
  rewards: Object.freeze({ perEnemy: 0, boss: 0, currency: 'gold' }),
  crafting: Object.freeze([]),
  items: Object.freeze([]),
  bosses: Object.freeze([]),
});

function number(value, fallback, min = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function hasName(value, words) {
  return words.some((word) => String(value || '').includes(word));
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
      actions: Object.freeze([...(props?.actions || [])]),
    }));
}

function buildBosses(entityRules = {}) {
  return Object.entries(entityRules)
    .filter(([name]) => hasName(name, ['보스']))
    .map(([name, props]) => Object.freeze({
      name,
      hp: number(props?.hp, 500, 1),
      damage: number(props?.damage, 20, 0),
      actions: Object.freeze([...(props?.actions || [])]),
    }));
}

function buildItems(objectSpecs = []) {
  return objectSpecs
    .filter((spec) => ['weapon', 'item'].includes(spec.type))
    .map((spec) => Object.freeze({
      name: spec.name,
      type: spec.type,
      damage: spec.properties?.damage == null ? null : number(spec.properties.damage, 0),
      hp: spec.properties?.hp == null ? null : number(spec.properties.hp, 0),
      effects: Object.freeze([...(spec.effects || [])]),
    }));
}

function buildCrafting(intent = {}) {
  const text = String(intent.prompt || '');
  if (!/(제작|조합|만들어|레시피|재료)/.test(text)) return Object.freeze([]);
  return Object.freeze([{ id: 'starter-craft', name: '기본 제작', ingredients: Object.freeze([]), result: 'starter-item' }]);
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
  const rewards = Object.freeze({
    perEnemy: number(rules.gold, DEFAULT_CONTENT.rewards.perEnemy),
    boss: bosses.length ? number(rules.gold, DEFAULT_CONTENT.rewards.boss) : DEFAULT_CONTENT.rewards.boss,
    currency: 'gold',
  });
  return Object.freeze({
    map: DEFAULT_CONTENT.map,
    waves,
    enemies: Object.freeze(enemies),
    bosses: Object.freeze(bosses),
    items: Object.freeze(buildItems(objectSpecs)),
    crafting: buildCrafting({ ...resolvedIntent, prompt }),
    rewards,
    source: Object.freeze({ prompt: String(prompt || ''), gameId: blueprint?.gameId || null }),
    safety: Object.freeze({ reviewBeforeApply: true, autoApplyToExistingGame: false }),
  });
}

if (typeof window !== 'undefined') window.buildJaewoonGameContent = buildGameContent;
