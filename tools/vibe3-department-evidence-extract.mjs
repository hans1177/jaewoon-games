// 파일명: tools/vibe3-department-evidence-extract.mjs
// 역할: 모델 판단 전에 실제 소스/런타임/아티팩트에 결합된 7개 부서 근거만 결정적으로 추출한다.

import { COMPANY_DEPARTMENT_ROLES, normalizeDepartmentEvidence } from '../assets/company-department-standards.js';

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const unique = (values) => [...new Set((values || []).map(clean).filter(Boolean))];

const ROLE_FIELDS = Object.freeze({
  planning: ['planningEvidence','designEvidence'],
  graphics: ['graphicsEvidence','visualEvidence','screenshotEvidence','frameEvidence'],
  development: ['developmentEvidence','sourceEvidence','buildEvidence'],
  qa: ['qaEvidence','playTestEvidence','runtimeEvidence','deviceTestEvidence'],
  balance: ['balanceEvidence','economyEvidence'],
  music: ['musicEvidence','audioRuntimeEvidence'],
  intro: ['introEvidence','introRuntimeEvidence']
});

const ROLE_HINTS = Object.freeze({
  planning: /core loop|core fun|quest|story|progression|identity|핵심 루프|핵심 재미|퀘스트|스토리|진행|정체성/i,
  graphics: /ui|layout|visual|asset|vfx|animation|sprite|texture|screen|screenshot|frame|silhouette|contrast|가독성|화면|에셋|애니|실루엣|대비/i,
  development: /\.cs\b|\.js\b|\.mjs\b|\.html\b|\.lua\b|\.luau\b|build|compile|dependency|serialization|save|load|exception|빌드|컴파일|의존성|세이브|로드|예외/i,
  qa: /test|smoke|runtime|launch|restart|repro|bug|crash|touch|input|테스트|실행|재시작|재현|버그|크래시|터치|입력/i,
  balance: /damage|health|hp|reward|xp|gold|difficulty|growth|economy|cooldown|drop rate|데미지|체력|보상|골드|난이도|성장|경제|쿨다운|드롭/i,
  music: /music|bgm|audio|sound|mute|volume|mix|gesture|autoplay|음악|배경음|사운드|음소거|볼륨|믹스|제스처|자동재생/i,
  intro: /intro|opening|first entry|first session|skip|continue|first input|handoff|onboarding|인트로|오프닝|첫 진입|첫 세션|스킵|첫 입력|온보딩/i
});

function bindingTag(binding = {}) {
  const source = clean(binding.source || binding.path || binding.file);
  const artifact = clean(binding.artifact || binding.artifactId || binding.runId);
  const runtime = clean(binding.runtime || binding.runtimeField);
  if (source) return `[source:${source}]`;
  if (artifact) return `[artifact:${artifact}]`;
  if (runtime) return `[runtime:${runtime}]`;
  return '';
}

function normalizeGroundedItem(item, fallbackBinding = {}) {
  if (item && typeof item === 'object') {
    const text = clean(item.text || item.evidence || item.detail || item.summary);
    const tag = bindingTag(item) || bindingTag(fallbackBinding);
    return text && tag ? `${tag} ${text}` : '';
  }
  const text = clean(item);
  const tag = bindingTag(fallbackBinding);
  return text && tag ? `${tag} ${text}` : '';
}

function addFieldEvidence(out, role, field, value, request) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const fallback = {};
  const runIdentity = clean(request.buildRunId || request.workflowRunId || request.artifactId);
  if (runIdentity) fallback.artifact = runIdentity;
  else if (clean(request.sourceRevision)) fallback.source = `revision:${clean(request.sourceRevision)}`;
  for (const item of values) {
    const normalized = normalizeGroundedItem(item, fallback);
    if (normalized) out[role].push(normalized);
  }
}

function addRuntimeBoolean(out, role, request, field, label = field) {
  if (request[field] === true) out[role].push(`[runtime:${field}] ${label}=true`);
}

function addRuntimeConclusion(out, role, request, field) {
  const value = clean(request[field]);
  if (value) out[role].push(`[runtime:${field}] ${field}=${value}`);
}

function rolesForSourceItem(item) {
  const explicit = Array.isArray(item?.roles) ? item.roles : item?.role ? [item.role] : [];
  const validExplicit = explicit.map((x) => clean(x).toLowerCase()).filter((x) => COMPANY_DEPARTMENT_ROLES.includes(x));
  if (validExplicit.length) return validExplicit;
  const haystack = `${clean(item?.path || item?.file)} ${clean(item?.detail || item?.text || item?.summary)}`;
  return COMPANY_DEPARTMENT_ROLES.filter((role) => ROLE_HINTS[role].test(haystack));
}

export function extractGroundedDepartmentEvidence({ request = {}, sourceEvidence = [] } = {}) {
  const roles = Object.fromEntries(COMPANY_DEPARTMENT_ROLES.map((role) => [role, []]));

  for (const role of COMPANY_DEPARTMENT_ROLES) {
    for (const field of ROLE_FIELDS[role] || []) addFieldEvidence(roles, role, field, request[field], request);
  }

  const changedFiles = unique(request.changedFiles || request.files || []);
  for (const file of changedFiles) {
    const item = { path: file, detail: `changed file ${file}` };
    for (const role of rolesForSourceItem(item)) roles[role].push(`[source:${file}] changed file ${file}`);
  }

  for (const item of Array.isArray(sourceEvidence) ? sourceEvidence : []) {
    const tag = bindingTag(item);
    const text = clean(item?.detail || item?.text || item?.summary);
    if (!tag || !text) continue;
    for (const role of rolesForSourceItem(item)) roles[role].push(`${tag} ${text}`);
  }

  const buildIdentity = clean(request.buildRunId || request.workflowRunId || request.artifactId);
  if (request.buildConclusion && buildIdentity) {
    roles.development.push(`[artifact:${buildIdentity}] buildConclusion=${clean(request.buildConclusion)}`);
    roles.qa.push(`[artifact:${buildIdentity}] buildConclusion=${clean(request.buildConclusion)}`);
  }

  addRuntimeBoolean(roles, 'qa', request, 'runtimeSmokePassed');
  addRuntimeConclusion(roles, 'qa', request, 'runtimeTestConclusion');
  addRuntimeConclusion(roles, 'qa', request, 'deviceTestConclusion');
  addRuntimeConclusion(roles, 'qa', request, 'apkLaunchConclusion');

  addRuntimeBoolean(roles, 'music', request, 'musicStartedAfterGesture');
  addRuntimeBoolean(roles, 'music', request, 'musicMuteControlPassed');
  addRuntimeBoolean(roles, 'music', request, 'musicVolumeControlPassed');
  addRuntimeConclusion(roles, 'music', request, 'musicRuntimeConclusion');
  if (request.audioLicenseVerified === true && clean(request.audioLicenseArtifact || request.audioLicenseSource)) {
    const binding = request.audioLicenseArtifact ? `[artifact:${clean(request.audioLicenseArtifact)}]` : `[source:${clean(request.audioLicenseSource)}]`;
    roles.music.push(`${binding} audioLicenseVerified=true`);
  }
  if (request.runtimeNetworkAudioDependency === false) roles.music.push('[runtime:runtimeNetworkAudioDependency] runtimeNetworkAudioDependency=false');

  addRuntimeBoolean(roles, 'intro', request, 'introVisible');
  addRuntimeBoolean(roles, 'intro', request, 'introSkipPassed');
  addRuntimeBoolean(roles, 'intro', request, 'introContinuePassed');
  addRuntimeBoolean(roles, 'intro', request, 'firstMeaningfulInputPassed');
  addRuntimeBoolean(roles, 'intro', request, 'introCoreLoopHandoffPassed');
  addRuntimeConclusion(roles, 'intro', request, 'introRuntimeConclusion');

  const normalized = Object.fromEntries(COMPANY_DEPARTMENT_ROLES.map((role) => [role, normalizeDepartmentEvidence(roles[role], 24)]));
  const counts = Object.fromEntries(COMPANY_DEPARTMENT_ROLES.map((role) => [role, normalized[role].length]));
  return Object.freeze({
    version: 2,
    departments: COMPANY_DEPARTMENT_ROLES,
    evidence: Object.freeze(normalized),
    counts: Object.freeze(counts),
    groundedOnly: true,
    unboundEvidenceDropped: true,
    modelInventedEvidenceAllowed: false,
    authority: 'vibe3-grounded-department-evidence-extractor'
  });
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) continue;
    const [key, inline] = value.slice(2).split('=', 2);
    args[key] = inline ?? argv[++i];
  }
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs');
  const args = parseArgs(process.argv.slice(2));
  const request = args.request ? JSON.parse(fs.readFileSync(args.request, 'utf8')) : {};
  const sourceEvidence = args.sources ? JSON.parse(fs.readFileSync(args.sources, 'utf8')) : [];
  console.log(JSON.stringify(extractGroundedDepartmentEvidence({ request, sourceEvidence })));
}
