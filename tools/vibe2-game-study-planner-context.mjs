// 파일명: tools/vibe2-game-study-planner-context.mjs
// 역할: 검증된 교차게임 GAME STUDY 지식을 새 Vibe2 작업 목표에 production planning context로 주입한다.
// 원칙: 두 개 이상 서로 다른 게임에서 반복된 일반화 패턴만 재사용하며, 원본 코드/수치/권한은 전달하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGameStudyKnowledge, findNearestGameStudies } from './vibe2-game-study-intelligence.mjs';

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const MARKER = 'game-study-planner-context:v1';
const MAX_PATTERNS = 8;

const GOAL_SYSTEMS = Object.freeze({
  input: /input|key|click|pointer|touch|gamepad|키|클릭|입력/i,
  movement: /move|walk|run|jump|position|travel|이동|걷|달리|점프|위치/i,
  combat: /attack|enemy|damage|combat|hit|kill|weapon|hp|공격|적|피해|전투|타격|처치|무기|체력/i,
  economy: /gold|coin|reward|shop|buy|currency|price|골드|코인|보상|상점|구매|재화|가격/i,
  progression: /level|stage|quest|xp|progress|unlock|mission|레벨|스테이지|퀘스트|진행|해금|미션/i,
  ui: /ui|menu|button|inventory|hud|dialog|confirm|select|option|메뉴|버튼|인벤|대화창|선택|확인/i,
  restart: /restart|retry|death|gameover|revive|respawn|round|재시작|재도전|사망|부활|리스폰|라운드/i,
  persistence: /save|load|datastore|storage|저장|불러오기/i,
  networking: /remote|network|socket|server|client|네트워크|서버|클라이언트/i,
  ai: /ai|bot|npc|opponent|pathfinding|인공지능|봇|엔피씨|상대/i,
  monetization: /marketplace|purchase|product|pass|monetization|상품|패스|결제/i
});

function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function goalSystems(goal = '') {
  const text = clean(goal);
  return Object.entries(GOAL_SYSTEMS).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}
function patternSystems(pattern = '') {
  const text = clean(pattern);
  return Object.keys(GOAL_SYSTEMS).filter((system) => new RegExp(`(^|[^a-z])${system}([^a-z]|$)`, 'i').test(text));
}
function crossGamePatterns(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    for (const pattern of unique(entry?.reusablePatterns || [])) {
      const current = map.get(pattern) || { pattern, confirmations: 0, games: new Set(), engines: new Set() };
      current.confirmations += Math.max(1, Number(entry?.confirmations) || 1);
      if (clean(entry?.gameId)) current.games.add(clean(entry.gameId));
      if (clean(entry?.engine)) current.engines.add(clean(entry.engine));
      map.set(pattern, current);
    }
  }
  return [...map.values()]
    .filter((row) => row.games.size >= 2)
    .map((row) => ({
      pattern: row.pattern,
      confirmations: row.confirmations,
      gameCount: row.games.size,
      games: [...row.games].sort(),
      engines: [...row.engines].sort(),
      crossGameVerified: true
    }));
}
function latestOwnDna(entries = [], gameId = '') {
  const rows = entries.filter((entry) => clean(entry?.gameId) === clean(gameId) && entry?.gameDna && Object.keys(entry.gameDna).length);
  return rows.sort((a, b) => clean(b?.lastSeenAt).localeCompare(clean(a?.lastSeenAt)) || Number(b?.confirmations || 0) - Number(a?.confirmations || 0))[0]?.gameDna || null;
}

export function buildGameStudyPlannerContext({ knowledgeInput = {}, task = {} } = {}) {
  const knowledge = createGameStudyKnowledge(knowledgeInput);
  const systems = goalSystems(task?.goal);
  const patterns = crossGamePatterns(knowledge.entries)
    .map((row) => {
      const matchedSystems = patternSystems(row.pattern).filter((system) => systems.includes(system));
      const targetEngineObserved = row.engines.includes(clean(task?.target).toLowerCase());
      const relevance = matchedSystems.length * 10 + (targetEngineObserved ? 2 : 0) + Math.min(5, row.gameCount) + Math.min(5, row.confirmations / 2);
      return { ...row, matchedSystems, relevance: Number(relevance.toFixed(2)) };
    })
    .filter((row) => row.matchedSystems.length > 0)
    .sort((a, b) => b.relevance - a.relevance || b.gameCount - a.gameCount || b.confirmations - a.confirmations || a.pattern.localeCompare(b.pattern))
    .slice(0, MAX_PATTERNS);

  const ownDna = latestOwnDna(knowledge.entries, task?.gameId);
  const nearest = ownDna ? findNearestGameStudies(knowledge, ownDna, { limit: 3, excludeGameId: task?.gameId }) : [];
  const nearestStatus = ownDna ? (nearest.length ? 'VERIFIED_TARGET_DNA_MATCHES' : 'NO_OTHER_GAME_DNA') : 'INSUFFICIENT_TARGET_DNA';
  const applied = patterns.length > 0 || nearest.length > 0;

  return Object.freeze({
    version: 1,
    kind: 'vibe2-game-study-planner-context',
    applied,
    gameId: clean(task?.gameId) || null,
    target: clean(task?.target).toLowerCase() || null,
    goalSystems: Object.freeze(systems),
    crossGamePatterns: Object.freeze(patterns.map((row) => Object.freeze(row))),
    nearest: Object.freeze(nearest),
    nearestStatus,
    policy: Object.freeze({
      advisoryOnly: true,
      verifiedCrossGamePatternsOnly: true,
      targetDnaRequiredForNearestGame: true,
      rawSourceAvailableToPlanner: false,
      rawGameplayValuesAvailableToPlanner: false,
      mayAutoExecute: false,
      mayCopyGameplayValues: false,
      mayChangeProtectedGameplay: false,
      mayExpandAuthority: false,
      authorityExpanded: false
    }),
    authorityExpanded: false,
    authority: 'vibe2-game-study-planner-advisory'
  });
}

export function gameStudyPlannerGuidance(context = {}) {
  if (context?.applied !== true) return '';
  const lines = [
    '[GAME STUDY KNOWLEDGE - verified advisory context only]',
    '외부 게임에서 반복 검증된 일반화 패턴이다. 현재 제작 작업의 기능 선택·구현 방향을 정할 때 실제 planning input으로 사용하되 현재 소스/요구와 맞을 때만 적용한다.',
    '원본 코드·게임 고유 수치·보상값을 복사하지 말고, 보호된 gameplay/save/economy/progression 규칙과 작업 권한을 바꾸지 않는다.'
  ];
  if ((context.goalSystems || []).length) lines.push(`관련 시스템=${context.goalSystems.join(', ')}`);
  for (const row of context.crossGamePatterns || []) {
    lines.push(`- pattern=${row.pattern}; games=${row.gameCount}; confirmations=${row.confirmations}; relevance=${row.relevance}`);
  }
  if ((context.nearest || []).length) {
    lines.push(`nearest=${context.nearest.map((row) => `${row.gameId}:${row.similarity}`).join(' | ')}`);
  } else {
    lines.push(`nearest=${context.nearestStatus || 'INSUFFICIENT_TARGET_DNA'}`);
  }
  return lines.join('\n');
}

export function enrichQueueWithGameStudyKnowledge({ queueInput = {}, knowledgeInput = {} } = {}) {
  const tasks = Array.isArray(queueInput?.tasks) ? queueInput.tasks : [];
  let enrichedCount = 0;
  const nextTasks = tasks.map((task) => {
    if (clean(task?.status).toLowerCase() !== 'queued' || clean(task?.type).toLowerCase() !== 'implementation') return task;
    if ((task?.evidence || []).some((value) => clean(value) === MARKER)) return task;
    const context = buildGameStudyPlannerContext({ knowledgeInput, task });
    if (!context.applied) return task;
    const guidance = gameStudyPlannerGuidance(context);
    enrichedCount += 1;
    return {
      ...task,
      goal: `${clean(task.goal)}\n\n${guidance}`,
      evidence: unique([
        ...(task.evidence || []),
        MARKER,
        `game-study-owner-directive:${task?.ownerDirective === true ? 'yes' : 'no'}`,
        `game-study-goal-systems:${context.goalSystems.join(',') || 'none'}`,
        `game-study-cross-game-patterns:${context.crossGamePatterns.length}`,
        `game-study-nearest-status:${context.nearestStatus}`
      ])
    };
  });
  return {
    queue: { ...queueInput, tasks: nextTasks },
    enrichedCount,
    changed: enrichedCount > 0,
    authorityExpanded: false
  };
}

export function runGameStudyPlannerContext({ queueFile = '.vibe2/queue.json', knowledgeFile = '.vibe2/game-study-knowledge.json' } = {}) {
  const queue = readJson(queueFile, { version: 5, tasks: [] });
  const knowledge = readJson(knowledgeFile, { version: 1, entries: [] });
  const result = enrichQueueWithGameStudyKnowledge({ queueInput: queue, knowledgeInput: knowledge });
  if (result.changed) writeJson(queueFile, result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = runGameStudyPlannerContext({
    queueFile: clean(args.queue) || '.vibe2/queue.json',
    knowledgeFile: clean(args.knowledge) || '.vibe2/game-study-knowledge.json'
  });
  console.log(`VIBE2_GAME_STUDY_PLANNER_CONTEXT=${result.changed ? 'APPLIED' : 'NO_CHANGE'}`);
  console.log(`VIBE2_GAME_STUDY_PLANNER_ENRICHED=${result.enrichedCount}`);
  console.log('VIBE2_GAME_STUDY_PLANNER_AUTHORITY_EXPANDED=NO');
}
