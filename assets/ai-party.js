// 파일명: assets/ai-party.js
// 역할: 자연어/설정에서 사람+AI 혼합 파티를 구성하고 공통 AI 편대 설정으로 정규화
// 규칙: 최대 4인, AI는 게임 규칙/피해/보상/세이브의 권한을 갖지 않음

const ROLES = Object.freeze(['tank', 'melee', 'ranged', 'healer', 'support', 'mage']);
const ROLE_WORDS = Object.freeze({
  tank: ['탱커', '탱크'],
  melee: ['전사', '근접'],
  ranged: ['궁수', '원거리'],
  healer: ['힐러', '치유'],
  support: ['지원', '서포터'],
  mage: ['마법사', '법사'],
});

function clean(value) { return String(value ?? '').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

function roleFromText(prompt) {
  const text = lower(prompt);
  return Object.entries(ROLE_WORDS)
    .filter(([, words]) => words.some(word => text.includes(lower(word))))
    .map(([role]) => role);
}

export function createAIPartyConfig({ request = '', humanPlayers = 1, aiCount = null, roles = [], fillEmptySlots = true } = {}) {
  const text = clean(request);
  const humans = Math.max(1, Math.min(4, Math.floor(Number(humanPlayers) || 1)));
  const explicit = text.match(/(?:AI|에이아이)\s*(?:동료|캐릭터|명|명까지)?\s*(\d+)/i);
  const parsedAi = explicit ? Number(explicit[1]) : null;
  const requestedAi = aiCount == null ? (parsedAi == null ? ((/(AI|에이아이).*(협동|동료|파티)/i.test(text) && humans < 4) ? 4 - humans : 0) : parsedAi) : Number(aiCount);
  const bots = Math.max(0, Math.min(4 - humans, Number.isFinite(requestedAi) ? Math.floor(requestedAi) : 0));
  const textRoles = roleFromText(text);
  const requestedRoles = Array.isArray(roles) ? roles.map(lower) : [];
  const resolvedRoles = unique([...requestedRoles, ...textRoles]).filter(role => ROLES.includes(role));
  const fallbackRoles = ['tank', 'ranged', 'healer', 'support'];
  const aiRoles = bots > 0 ? Array.from({ length: bots }, (_, index) => resolvedRoles[index] || fallbackRoles[index]) : [];

  return Object.freeze({
    version: 1,
    maxPlayers: 4,
    humanPlayers: humans,
    aiCount: bots,
    aiRoles: Object.freeze(aiRoles),
    fillEmptySlotsWithAi: Boolean(fillEmptySlots && bots > 0),
    mixedHumanAi: humans > 0 && bots > 0,
    localDecision: Object.freeze({ enabled: bots > 0, intervalMs: 350, fallbackOffline: true }),
    serverAuthority: Object.freeze({ movement: false, combat: false, rewards: false, save: false }),
  });
}

export function createDefaultAIEntries(config = {}) {
  const roles = Array.isArray(config.aiRoles) ? config.aiRoles : [];
  return Object.freeze(roles.map((role, index) => Object.freeze({
    id: `ai-${index + 1}`,
    role: ROLES.includes(role) ? role : 'melee',
    controlledBy: 'local-ai',
  })));
}

export function validateAIPartyConfig(config = {}) {
  const humans = clamp(config.humanPlayers ?? 1, 1, 4);
  const bots = clamp(config.aiCount ?? 0, 0, 4 - humans);
  const roles = Array.isArray(config.aiRoles) ? config.aiRoles.filter(role => ROLES.includes(role)).slice(0, bots) : [];
  return Object.freeze({
    valid: humans + bots <= 4,
    humanPlayers: humans,
    aiCount: bots,
    aiRoles: Object.freeze(roles),
  });
}

if (typeof window !== 'undefined') {
  window.createJaewoonAIPartyConfig = createAIPartyConfig;
  window.createJaewoonDefaultAIEntries = createDefaultAIEntries;
  window.validateJaewoonAIPartyConfig = validateAIPartyConfig;
}
