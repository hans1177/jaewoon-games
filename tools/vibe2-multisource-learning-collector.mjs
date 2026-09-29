import fs from 'node:fs';
import path from 'node:path';
import { isTrustedDistilledExternalAiEntry } from './vibe2-external-ai-distillation.mjs';

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const MAX_MATERIALS = 8;

const SYSTEM_PATTERNS = Object.freeze({
  input: /input|key|click|pointer|touch|gamepad|virtualinput|키|클릭|입력/i,
  movement: /move|walk|run|jump|position|travel|이동|걷|달리|점프|위치/i,
  combat: /attack|enemy|damage|combat|hit|kill|weapon|hp|공격|적|피해|전투|타격|처치|무기|체력/i,
  economy: /gold|coin|reward|shop|buy|currency|price|골드|코인|보상|상점|구매|재화|가격/i,
  progression: /level|stage|quest|xp|progress|unlock|mission|checkpoint|레벨|스테이지|퀘스트|진행|해금|미션/i,
  ui: /ui|menu|button|inventory|hud|dialog|confirm|select|option|메뉴|버튼|인벤|대화창|선택|확인/i,
  restart: /restart|retry|death|gameover|revive|respawn|round|재시작|재도전|사망|부활|리스폰|라운드/i,
  persistence: /save|load|datastore|storage|저장|불러오기/i,
  networking: /remote|network|socket|server|client|네트워크|서버|클라이언트/i,
  ai: /ai|bot|npc|opponent|pathfinding|인공지능|봇|엔피씨|상대/i,
  monetization: /marketplace|purchase|product|pass|monetization|상품|패스|결제/i
});

function systemMatches(value = '') {
  const text = clean(value);
  return Object.entries(SYSTEM_PATTERNS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function normalizeReusablePattern(value = '') {
  const text = clean(value)
    .replace(/^GAME_STUDY:/, '')
    .replace(/^study-intelligence:/, '');
  return text.length <= 160 ? text : '';
}

function safeRuntimeRows(rows = []) {
  return (rows || []).filter((row) => row && typeof row === 'object' && row.runtimeVerified === true);
}

function flattenKeys(value, prefix = '', out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) flattenKeys(item, prefix, out);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    out.push(next);
    if (child && typeof child === 'object') flattenKeys(child, next, out);
    else if (typeof child === 'string' && child.length <= 120) out.push(`${next}:${child}`);
  }
  return out;
}

function addMaterial(map, material = {}) {
  const pattern = clean(material.pattern);
  if (!pattern) return;
  const sourceType = clean(material.sourceType) || 'unknown';
  const engine = clean(material.engine).toLowerCase() || 'unknown';
  const gameId = clean(material.gameId) || 'cross-game';
  const matchedSystems = unique(material.matchedSystems || []);
  if (!matchedSystems.length) return;
  const key = `${sourceType}|${engine}|${gameId}|${pattern}`;
  const current = map.get(key);
  if (current) {
    current.confirmations += Math.max(1, Number(material.confirmations) || 1);
    current.matchedSystems = unique([...current.matchedSystems, ...matchedSystems]);
    return;
  }
  map.set(key, {
    sourceType,
    engine,
    gameId,
    pattern,
    matchedSystems,
    confirmations: Math.max(1, Number(material.confirmations) || 1),
    confidence: Math.max(0, Math.min(1, Number(material.confidence) || 0.5)),
    verified: material.verified === true,
    reusable: material.reusable !== false,
    rawSourceIncluded: false,
    rawGameplayValuesIncluded: false,
    authorityExpanded: false
  });
}

function collectExperience(map, experienceInput = {}, goalSystems = []) {
  for (const record of experienceInput?.records || []) {
    if (record?.verified !== true || record?.reusable !== true) continue;
    const engine = clean(record.engine).toLowerCase() || 'unknown';
    const gameId = clean(record.gameId) || 'unknown-game';
    const confirmations = Math.max(1, Number(record.confirmations) || 1);
    const confidence = Math.max(0, Math.min(1, Number(record.confidence) || 0.5));
    const recordSystems = unique(systemMatches([
      record.problem,
      record.goal,
      record.change,
      ...(record.qa || []),
      ...(record.reusablePatterns || [])
    ].filter(Boolean).join(' ')));
    const relevantRecordSystems = recordSystems.filter((system) => goalSystems.includes(system));

    if (clean(record.outcome).toUpperCase() === 'PASS') {
      for (const raw of record.reusablePatterns || []) {
        const pattern = normalizeReusablePattern(raw);
        if (!pattern) continue;
        const matched = unique([...systemMatches(pattern), ...relevantRecordSystems]).filter((system) => goalSystems.includes(system));
        addMaterial(map, {
          sourceType: 'verified-experience-success', engine, gameId, pattern,
          matchedSystems: matched, confirmations, confidence, verified: true, reusable: true
        });
      }
    } else if (clean(record.outcome).toUpperCase() === 'FAIL') {
      for (const system of relevantRecordSystems) {
        addMaterial(map, {
          sourceType: 'verified-experience-failure', engine, gameId,
          pattern: `failure-lesson:${system}`,
          matchedSystems: [system], confirmations, confidence, verified: true, reusable: true
        });
      }
    }

    const qaText = unique(record.qa || []).join(' ');
    if (qaText) {
      for (const system of relevantRecordSystems) {
        addMaterial(map, {
          sourceType: 'verified-qa-regression', engine, gameId,
          pattern: `qa-verified:${system}`,
          matchedSystems: [system], confirmations, confidence, verified: true, reusable: true
        });
      }
    }
  }
}

function runtimeEngine(row = {}) {
  const authority = clean(row.authority).toLowerCase();
  if (authority.includes('roblox') || row?.capabilities?.studioTestService === true || row?.capabilities?.virtualInput === true) return 'roblox';
  return clean(row.engine).toLowerCase() || 'unknown';
}

function collectRuntime(map, runtimeEvidenceInput = [], goalSystems = []) {
  for (const row of safeRuntimeRows(runtimeEvidenceInput)) {
    const engine = runtimeEngine(row);
    const gameId = clean(row.gameId) || clean(row.sourceGameId) || 'internal-runtime';
    const tokens = flattenKeys(row);
    const runtimeSystems = unique(systemMatches(tokens.join(' '))).filter((system) => goalSystems.includes(system));
    for (const system of runtimeSystems) {
      addMaterial(map, {
        sourceType: 'internal-runtime-evidence', engine, gameId,
        pattern: `runtime-verified:${system}`,
        matchedSystems: [system], confirmations: 1, confidence: 0.85, verified: true, reusable: true
      });
    }

    const metrics = row?.metrics && typeof row.metrics === 'object' ? Object.keys(row.metrics) : [];
    const telemetrySystems = unique(systemMatches(metrics.join(' '))).filter((system) => goalSystems.includes(system));
    for (const system of telemetrySystems) {
      addMaterial(map, {
        sourceType: 'play-telemetry', engine, gameId,
        pattern: `telemetry-observed:${system}`,
        matchedSystems: [system], confirmations: 1, confidence: 0.8, verified: true, reusable: true
      });
    }
  }
}

function collectCrossGameHypotheses(map, knowledgeInput = {}, goalSystems = []) {
  for (const row of knowledgeInput?.derived?.mergedKnowledge || []) {
    if (row?.crossGameVerified !== true) continue;
    const matchedSystems = systemMatches(row.pattern).filter((system) => goalSystems.includes(system));
    if (!matchedSystems.length) continue;
    addMaterial(map, {
      sourceType: 'cross-game-hypothesis',
      engine: unique(row.engines || []).includes('roblox') ? 'roblox' : 'cross-engine',
      gameId: 'cross-game',
      pattern: `hypothesis-verified:${clean(row.pattern)}`,
      matchedSystems,
      confirmations: Math.max(1, Number(row.confirmations) || 1),
      confidence: 0.9,
      verified: true,
      reusable: true
    });
  }
}

function collectExternalAiDistilled(map, externalAiInput = {}, goalSystems = []) {
  for (const row of externalAiInput?.entries || []) {
    if (!isTrustedDistilledExternalAiEntry(row)) continue;
    const engine = clean(row.engine).toLowerCase() || 'cross-engine';
    const gameId = clean(row.gameId) || 'cross-game';
    for (const raw of row.patterns || []) {
      const pattern = normalizeReusablePattern(raw);
      if (!pattern) continue;
      const matchedSystems = unique([...systemMatches(pattern), ...(row.domains || []).map(clean)]).filter((system) => goalSystems.includes(system));
      if (!matchedSystems.length) continue;
      addMaterial(map, {
        sourceType: 'external-ai-distilled-verified',
        engine,
        gameId,
        pattern: `distilled-external-ai:${pattern}`,
        matchedSystems,
        confirmations: 1,
        confidence: 0.7,
        verified: true,
        reusable: true
      });
    }
  }
}

export function collectMultiSourceLearningMaterials({
  experienceInput = {},
  knowledgeInput = {},
  runtimeEvidenceInput = [],
  externalAiInput = {},
  task = {},
  maxMaterials = MAX_MATERIALS
} = {}) {
  const target = clean(task?.target).toLowerCase();
  const goalSystems = unique(systemMatches(task?.goal));
  if (target !== 'roblox' || !goalSystems.length) {
    return Object.freeze({
      enabled: target === 'roblox', targetEngine: target || null, goalSystems: Object.freeze(goalSystems),
      materials: Object.freeze([]), sourceCounts: Object.freeze({}), verifiedOnly: true,
      rawSourceIncluded: false, rawGameplayValuesIncluded: false, authorityExpanded: false
    });
  }

  const map = new Map();
  collectExperience(map, experienceInput, goalSystems);
  collectRuntime(map, runtimeEvidenceInput, goalSystems);
  collectCrossGameHypotheses(map, knowledgeInput, goalSystems);
  collectExternalAiDistilled(map, externalAiInput, goalSystems);

  const materials = [...map.values()]
    .filter((row) => row.verified === true && row.reusable === true && row.matchedSystems.length > 0)
    .map((row) => {
      const sameEngine = row.engine === target;
      const sourceWeight = {
        'internal-runtime-evidence': 5,
        'verified-experience-success': 4,
        'verified-experience-failure': 4,
        'verified-qa-regression': 3,
        'play-telemetry': 3,
        'cross-game-hypothesis': 2,
        'external-ai-distilled-verified': 1
      }[row.sourceType] || 1;
      const relevance = row.matchedSystems.length * 10 + (sameEngine ? 4 : 0) + sourceWeight + Math.min(5, row.confirmations / 2) + row.confidence;
      return Object.freeze({
        ...row,
        relevance: Number(relevance.toFixed(2)),
        transferClass: sameEngine ? 'roblox-observed' : 'cross-engine-generalized',
        externalAdvisoryLast: row.sourceType === 'external-ai-distilled-verified'
      });
    })
    .sort((a, b) => Number(a.externalAdvisoryLast) - Number(b.externalAdvisoryLast) || b.relevance - a.relevance || b.confirmations - a.confirmations || a.pattern.localeCompare(b.pattern))
    .slice(0, Math.max(1, Math.floor(Number(maxMaterials) || MAX_MATERIALS)));

  const sourceCounts = {};
  for (const material of materials) sourceCounts[material.sourceType] = (sourceCounts[material.sourceType] || 0) + 1;
  return Object.freeze({
    enabled: true,
    targetEngine: target,
    goalSystems: Object.freeze(goalSystems),
    materials: Object.freeze(materials),
    sourceCounts: Object.freeze(sourceCounts),
    verifiedOnly: true,
    rawSourceIncluded: false,
    rawGameplayValuesIncluded: false,
    authorityExpanded: false
  });
}

export function readRuntimeEvidenceDirectory(root = '.vibe2/runtime-evidence') {
  if (!root || !fs.existsSync(root)) return [];
  const rows = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        try {
          const value = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (value && typeof value === 'object') rows.push(value);
        } catch {}
      }
    }
  };
  walk(root);
  return rows;
}
