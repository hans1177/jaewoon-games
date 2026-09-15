// 파일명: tools/vibe2-game-study.mjs
// 역할: Web/Roblox의 검증된 AUTO PLAYER 결과와 허가된 서버 워크스페이스 소스에서 일반화 가능한 게임 패턴만 추출해 기존 Experience Memory에 연결한다.
// 원칙: 공개 관찰은 플레이 증거만 사용하고, 소스 분석은 소유/복사 허가가 명시된 서버 워크스페이스 사본에서만 read-only로 수행한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { addVibeExperience, createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));
const SUPPORTED_ENGINES = freeze(['web', 'roblox']);
export const AUTHORIZED_SOURCE_ACCESS = 'owned-or-authorized-server-workspace';
export const OBSERVATION_ONLY_ACCESS = 'observation-only';

function hash(value = '') {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEngine(value) {
  const engine = clean(value).toLowerCase();
  if (!SUPPORTED_ENGINES.includes(engine)) throw new Error(`GAME STUDY unsupported engine: ${engine || 'empty'}`);
  return engine;
}

function verifyAutoPlayerAuthority(engine, result = {}) {
  const issues = [];
  if (result?.verified !== true) issues.push('auto-player-not-verified');
  if (clean(result?.engine).toLowerCase() !== engine) issues.push('auto-player-engine-mismatch');
  if (result?.playLog?.realInputVerified !== true) issues.push('real-input-required');
  if (clean(result?.playLog?.authority) !== 'vibe2-play-log') issues.push('play-log-authority-invalid');
  if (clean(result?.telemetry?.authority) !== 'vibe2-observed-telemetry') issues.push('telemetry-authority-invalid');
  if (clean(result?.designEvidence?.autoPlayer?.authority) !== 'vibe2-auto-player-evidence') issues.push('auto-player-evidence-authority-invalid');
  const checkpointCount = Math.max(0, Math.floor(finite(result?.telemetry?.metrics?.checkpointCount)));
  const checkpointPassCount = Math.max(0, Math.floor(finite(result?.telemetry?.metrics?.checkpointPassCount)));
  const inputActionCount = Math.max(0, Math.floor(finite(result?.telemetry?.metrics?.inputActionCount)));
  if (inputActionCount < 1) issues.push('real-input-count-required');
  if (checkpointCount < 1 || checkpointPassCount !== checkpointCount) issues.push('required-checkpoints-must-pass');
  if (finite(result?.telemetry?.metrics?.runtimeErrorCount) !== 0) issues.push('runtime-errors-present');
  if (engine === 'roblox') {
    if (clean(result?.runtime?.authority) !== 'vibe2-roblox-studio-runtime') issues.push('roblox-studio-runtime-authority-invalid');
    if (result?.runtime?.capabilities?.studioTestService !== true) issues.push('roblox-studio-test-service-required');
    if (result?.runtime?.capabilities?.virtualInput !== true) issues.push('roblox-virtual-input-required');
  }
  return freeze({ valid: issues.length === 0, issues: freezeList(issues), checkpointCount, checkpointPassCount, inputActionCount });
}

const SYSTEM_PATTERNS = freeze({
  input: /input|key|click|pointer|touch|gamepad|키|클릭|입력/i,
  movement: /move|walk|run|jump|position|travel|이동|걷|달리|점프|위치/i,
  combat: /attack|enemy|damage|combat|hit|kill|weapon|hp|공격|적|피해|전투|타격|처치|무기|체력/i,
  economy: /gold|coin|reward|shop|buy|currency|price|골드|코인|보상|상점|구매|재화|가격/i,
  progression: /level|stage|quest|xp|progress|unlock|mission|레벨|스테이지|퀘스트|진행|해금|미션/i,
  ui: /ui|menu|button|inventory|hud|dialog|메뉴|버튼|인벤|대화창/i,
  restart: /restart|death|gameover|revive|respawn|재시작|사망|부활|리스폰/i
});

function observedSystems(result = {}) {
  const actionText = (result?.playLog?.actions || []).map((row) => [row?.id, row?.type, row?.name].filter(Boolean).join(' ')).join(' ');
  const checkpointText = (result?.playLog?.checkpoints || []).map((row) => [row?.id, row?.name].filter(Boolean).join(' ')).join(' ');
  const text = `${actionText} ${checkpointText}`;
  const systems = [];
  for (const [name, pattern] of Object.entries(SYSTEM_PATTERNS)) if (pattern.test(text)) systems.push(name);
  if (finite(result?.telemetry?.metrics?.inputActionCount) > 0 && !systems.includes('input')) systems.unshift('input');
  return freezeList(systems.length ? systems : ['runtime-flow']);
}

const SOURCE_PATTERNS = freeze({
  web: freeze([
    ['input-events', /addEventListener\s*\(\s*['"](?:key|pointer|mouse|touch|click)/i],
    ['client-persistence', /\b(?:localStorage|sessionStorage|indexedDB)\b/i],
    ['network-io', /\b(?:XMLHttpRequest|WebSocket)\b|\bfetch\s*\(/i],
    ['frame-loop', /\brequestAnimationFrame\s*\(/i],
    ['timer-loop', /\b(?:setInterval|setTimeout)\s*\(/i],
    ['canvas-rendering', /\b(?:getContext\s*\(|HTMLCanvasElement|WebGL)/i],
    ['audio-system', /\b(?:AudioContext|HTMLAudioElement)\b|\bnew\s+Audio\s*\(/i]
  ]),
  roblox: freeze([
    ['datastore-persistence', /\bDataStoreService\b/i],
    ['network-remotes', /\b(?:RemoteEvent|RemoteFunction)\b/i],
    ['input-services', /\b(?:UserInputService|ContextActionService)\b/i],
    ['frame-loop', /\bRunService\b/i],
    ['tagged-entities', /\bCollectionService\b/i],
    ['pathfinding', /\bPathfindingService\b/i],
    ['monetization-api', /\bMarketplaceService\b/i],
    ['character-humanoid', /\bHumanoid\b/i]
  ])
});

function sourceExtensions(engine) {
  return engine === 'web'
    ? new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'])
    : new Set(['.lua', '.luau']);
}

function collectSourceFiles(root, engine, { maxFiles = 240 } = {}) {
  const base = path.resolve(root);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) throw new Error(`GAME STUDY source root missing: ${root}`);
  const extensions = sourceExtensions(engine);
  const ignored = new Set(['.git', 'node_modules', '.vibe2', 'dist', 'build', 'coverage']);
  const files = [];
  const queue = [base];
  while (queue.length && files.length < maxFiles) {
    const dir = queue.shift();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (files.length >= maxFiles) break;
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) queue.push(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const file = path.join(dir, entry.name);
      if (extensions.has(path.extname(file).toLowerCase())) files.push(file);
    }
  }
  return { base, files };
}

export function analyzeAuthorizedGameSource({ engine = '', root = '', sourceAccess = OBSERVATION_ONLY_ACCESS, maxFiles = 240, maxBytesPerFile = 180000, maxTotalBytes = 3000000 } = {}) {
  const normalizedEngine = normalizeEngine(engine);
  const access = clean(sourceAccess) || OBSERVATION_ONLY_ACCESS;
  if (access !== AUTHORIZED_SOURCE_ACCESS) {
    return freeze({
      version: 1,
      engine: normalizedEngine,
      authorized: false,
      scanned: false,
      reason: 'source-analysis-requires-owned-or-authorized-server-workspace',
      fileCount: 0,
      bytesRead: 0,
      patterns: freeze([]),
      authority: 'read-only-no-source-copy'
    });
  }
  if (!clean(root)) throw new Error('authorized GAME STUDY server workspace root required');
  const { base, files } = collectSourceFiles(root, normalizedEngine, { maxFiles: Math.max(1, Math.min(1000, Math.floor(finite(maxFiles, 240)))) });
  const matches = new Map();
  let bytesRead = 0;
  for (const file of files) {
    if (bytesRead >= maxTotalBytes) break;
    const stat = fs.statSync(file);
    const readBytes = Math.min(stat.size, maxBytesPerFile, Math.max(0, maxTotalBytes - bytesRead));
    if (readBytes <= 0) break;
    const fd = fs.openSync(file, 'r');
    const buffer = Buffer.alloc(readBytes);
    try { fs.readSync(fd, buffer, 0, readBytes, 0); } finally { fs.closeSync(fd); }
    bytesRead += readBytes;
    const text = buffer.toString('utf8');
    const relative = path.relative(base, file).split(path.sep).join('/');
    for (const [name, pattern] of SOURCE_PATTERNS[normalizedEngine]) {
      if (!pattern.test(text)) continue;
      const current = matches.get(name) || { name, files: [], occurrences: 0 };
      current.occurrences += 1;
      if (current.files.length < 12) current.files.push(relative);
      matches.set(name, current);
    }
  }
  const patterns = [...matches.values()].sort((a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name)).map((row) => freeze({ name: row.name, occurrences: row.occurrences, files: freezeList(row.files) }));
  return freeze({
    version: 1,
    engine: normalizedEngine,
    authorized: true,
    scanned: true,
    reason: null,
    fileCount: files.length,
    bytesRead,
    patterns: freeze(patterns),
    sourceFingerprint: `src_${hash(patterns.map((row) => `${row.name}:${row.occurrences}:${row.files.join(',')}`).join('|'))}`,
    authority: 'read-only-no-source-copy'
  });
}

export function createVerifiedGameStudy({ gameId = '', engine = '', autoPlayerResult = {}, sourceRoot = '', sourceAccess = OBSERVATION_ONLY_ACCESS, tags = [], createdAt = '' } = {}) {
  const normalizedEngine = normalizeEngine(engine || autoPlayerResult?.engine);
  const runtimeValidation = verifyAutoPlayerAuthority(normalizedEngine, autoPlayerResult);
  const systems = observedSystems(autoPlayerResult);
  const normalizedTags = freezeList(tags);
  const source = analyzeAuthorizedGameSource({ engine: normalizedEngine, root: sourceRoot, sourceAccess });
  const runId = clean(autoPlayerResult?.runId);
  const evidence = freezeList([
    runId ? `auto-player-run:${runId}` : '',
    `real-inputs:${runtimeValidation.inputActionCount}`,
    `required-checkpoints:${runtimeValidation.checkpointPassCount}/${runtimeValidation.checkpointCount}`,
    source.scanned ? `authorized-server-source:${source.sourceFingerprint}` : ''
  ]);
  const distilledPatterns = freezeList([
    ...systems.map((system) => `verified-play-observation:${system}`),
    ...source.patterns.map((row) => `authorized-source-pattern:${row.name}`),
    ...normalizedTags.map((tag) => `study-tag:${tag.toLowerCase()}`)
  ]);
  const verified = runtimeValidation.valid && distilledPatterns.length > 0;
  const idSeed = [clean(gameId), normalizedEngine, systems.join(','), source.sourceFingerprint || '', normalizedTags.join(','), distilledPatterns.join('|')].join('::');
  return freeze({
    version: 1,
    kind: 'vibe2-game-study',
    id: `study_${hash(idSeed)}`,
    gameId: clean(gameId) || `reference-${normalizedEngine}`,
    engine: normalizedEngine,
    verified,
    reusable: verified,
    createdAt: clean(createdAt) || new Date().toISOString(),
    executionLocation: 'server',
    learningState: '.vibe2/experience.json',
    sourceAccess: clean(sourceAccess) || OBSERVATION_ONLY_ACCESS,
    sourceAnalysis: source,
    observedSystems: systems,
    tags: normalizedTags,
    distilledPatterns,
    evidence,
    runtimeValidation,
    run: freeze({
      runId: runId || null,
      inputActionCount: runtimeValidation.inputActionCount,
      checkpointPassCount: runtimeValidation.checkpointPassCount,
      checkpointCount: runtimeValidation.checkpointCount,
      durationMs: Math.max(0, finite(autoPlayerResult?.telemetry?.metrics?.durationMs))
    }),
    policy: freeze({
      serverSideLearning: true,
      clientLocalLearning: false,
      observationDoesNotGrantSourceAccess: true,
      sourceScanRequiresOwnedOrAuthorizedServerWorkspace: true,
      rawSourceCopiedIntoMemory: false,
      causalClaimsFromObservation: false,
      mayAutoCopyGameplayValues: false,
      mayExpandAuthority: false
    }),
    authorityExpanded: false,
    authority: 'vibe2-game-study-observed-and-distilled'
  });
}

export function promoteGameStudyToExperience(memoryInput = {}, study = {}) {
  const memory = createVibeExperienceMemory(memoryInput);
  if (study?.kind !== 'vibe2-game-study' || study?.verified !== true || study?.reusable !== true) {
    return freeze({ promoted: false, reason: 'verified-game-study-required', memory, study, authority: 'unchanged' });
  }
  if (study?.executionLocation !== 'server' || study?.policy?.serverSideLearning !== true || study?.policy?.clientLocalLearning === true) {
    return freeze({ promoted: false, reason: 'server-side-game-study-required', memory, study, authority: 'unchanged' });
  }
  if (study?.authorityExpanded === true || study?.policy?.mayExpandAuthority === true || study?.policy?.mayAutoCopyGameplayValues === true) {
    return freeze({ promoted: false, reason: 'game-study-authority-policy-invalid', memory, study, authority: 'unchanged' });
  }
  const patterns = freezeList(study.distilledPatterns || []);
  if (!patterns.length) return freeze({ promoted: false, reason: 'distilled-pattern-required', memory, study, authority: 'unchanged' });
  const result = addVibeExperience(memory, {
    gameId: clean(study.gameId),
    engine: clean(study.engine),
    departments: ['planning', 'development', 'qa'],
    taskType: 'game-study',
    problem: 'reference-game-structure-and-play-observation',
    goal: 'reuse only verified generalized game patterns without copying protected values or raw source',
    change: patterns.join(' | '),
    outcome: 'PASS',
    qa: freezeList([
      'server-side-study-verified',
      'real-input-auto-player-verified',
      'required-checkpoints-passed',
      study?.sourceAnalysis?.scanned ? 'authorized-server-source-read-only-scan' : 'observation-only-source-policy'
    ]),
    build: study?.run?.runId ? `study-run:${study.run.runId}` : '',
    evidence: freezeList([`game-study:${clean(study.id)}`, ...(study.evidence || [])]),
    reusablePatterns: patterns.map((pattern) => `GAME_STUDY:${pattern}`),
    avoidPatterns: [],
    verified: true,
    createdAt: clean(study.createdAt)
  });
  return freeze({
    promoted: result.added === true,
    reinforced: result.reinforced === true,
    reason: result.reason,
    record: result.record,
    memory: result.memory,
    study,
    authority: 'unchanged',
    mayChangeProtectedGameplayValues: false
  });
}

export function persistGameStudy(file, study) {
  if (!clean(file)) throw new Error('GAME STUDY output path required');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(study, null, 2)}\n`, 'utf8');
  return file;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('VIBE2_GAME_STUDY_CORE=READY');
  console.log(`VIBE2_GAME_STUDY_ENGINES=${SUPPORTED_ENGINES.join(',')}`);
  console.log('VIBE2_GAME_STUDY_EXECUTION=SERVER_ONLY');
  console.log('VIBE2_GAME_STUDY_SOURCE_POLICY=OWNED_OR_AUTHORIZED_SERVER_WORKSPACE_ONLY');
}
