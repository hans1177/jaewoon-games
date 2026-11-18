// 파일명: tools/company-nemotron-design-review.mjs
// [임포트] 기존 Studio MCP 촬영본에 결합된 무료 네모트론 디자인 후보만 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

// [정책] 외부 이미지·소스 분석은 무료 확인된 NVIDIA 시험 API에서만 실행한다.
const MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const POLICY = 'company-learning/external-ai-distillation-policy.json';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const trim = value => String(value ?? '').trim();
const options = Object.fromEntries(process.argv.slice(2)
  .filter(s => s.startsWith('--') && s.includes('='))
  .map(s => [s.slice(2, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]));
const root = path.resolve(options.root || 'main');
const framesRoot = path.resolve(options.frames || '.');
const reportPath = path.resolve(options.out || path.join(framesRoot, 'nemotron-design-review.json'));
const protectedCode = /\b(?:DataStore|RemoteEvent|RemoteFunction|FireServer|FireClient|OnServerEvent|OnClientEvent|SetAttribute|GetAttribute|GetService|HttpService|require|loadstring|setfenv|getfenv|Humanoid|WalkSpeed|JumpPower|Health|Damage|Hitbox|CanCollide|CanTouch|CanQuery|Anchored|Currency|Reward|Experience|Purchase|MarketplaceService|TeleportService)\b/i;
const visualCode = /Color3\.(?:new|fromRGB|fromHSV)\(|Enum\.(?:Material|Font|EasingStyle|TextXAlignment|TextYAlignment)\.|\.(?:Color|Color3|TextColor3|BackgroundColor3|ImageColor3|Transparency|TextTransparency|BackgroundTransparency|ImageTransparency|LightInfluence|Material|Font|TextSize|Size|Position|Rotation|Scale|Brightness|Contrast|Saturation|FieldOfView|Ambient|OutdoorAmbient|Reflectance|Emission|StrokeThickness)\s*=|(?:UDim2|UDim)\.new\(/;
const quoted = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;

// [무료 디자인 전문 모델] 고정 무료 모델만 허용하고, 모델이 응답으로 경로/제공자를 선택하지 못한다.
// 기능별 순위는 검사 전 고정한다. 실제 검증된 성과가 없으면 학습 점수를 만들지 않는다.
export const DESIGN_FREE_MODELS = Object.freeze([
  {id: 'NVIDIA_VL', provider: 'NVIDIA', model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
    role: 'NPC', keyName: 'NVIDIA_API_KEY', verifiedName: 'NVIDIA_FREE_TIER_VERIFIED',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions'},
  {id: 'GEMINI_FLASH', provider: 'GEMINI', model: 'gemini-3.8-flash',
    role: 'WORLD', keyName: 'GEMINI_API_KEY', verifiedName: 'GEMINI_DESIGN_FREE_TIER_VERIFIED',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'},
  {id: 'OPENROUTER_GEMMA', provider: 'OPENROUTER', model: 'google/gemma-4-31b-it:free',
    role: 'UI', keyName: 'OPENROUTER_API_KEY', verifiedName: 'OPENROUTER_DESIGN_FREE_TIER_VERIFIED',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'},
  {id: 'OPENROUTER_NEMOTRON', provider: 'OPENROUTER', model: 'nvidia/nemotron-3.5-super-vl:free',
    role: 'NPC', keyName: 'OPENROUTER_API_KEY', verifiedName: 'OPENROUTER_DESIGN_FREE_TIER_VERIFIED',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'},
  {id: 'OPENROUTER_GEMMA26', provider: 'OPENROUTER', model: 'google/gemma-4-26b-a4b-it:free',
    role: 'WORLD', keyName: 'OPENROUTER_API_KEY', verifiedName: 'OPENROUTER_DESIGN_FREE_TIER_VERIFIED',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'},
  {id: 'OPENROUTER_OMNI', provider: 'OPENROUTER', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    role: 'MOTION', keyName: 'OPENROUTER_API_KEY', verifiedName: 'OPENROUTER_DESIGN_FREE_TIER_VERIFIED',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'},
  {id: 'GEMINI_LITE', provider: 'GEMINI', model: 'gemini-3.5-flash-lite',
    role: 'GENERAL', keyName: 'GEMINI_API_KEY', verifiedName: 'GEMINI_DESIGN_FREE_TIER_VERIFIED',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent'}
]);
const DAILY_LIMIT = Object.freeze({NVIDIA: 12, GEMINI: 12, OPENROUTER: 30});
const designRuntime = {usageWindow: null, cooldowns: {}, attempts: []};
const currentDay = () => new Date().toISOString().slice(0, 10);
function loadPreviousDesignUsage(previous = {}) {
  const nowDay = currentDay();
  designRuntime.usageWindow = {day: nowDay, calls: previous?.usageWindow?.day === nowDay
    ? Object.fromEntries(Object.entries(previous.usageWindow.calls || {})
      .filter(([name, count]) => Object.hasOwn(DAILY_LIMIT, name) &&
        Number.isInteger(count) && count >= 0 && count <= 1000))
    : {}};
  designRuntime.cooldowns = Object.fromEntries(Object.entries(previous?.cooldowns || {})
    .filter(([id, until]) => DESIGN_FREE_MODELS.some(model => model.id === id) &&
      Number.isFinite(Date.parse(until)) && Date.parse(until) > Date.now()));
  designRuntime.attempts = [];
}
export function designRoleForFrames(frameNames = []) {
  const names = frameNames.join(' ').toLowerCase();
  if (/(npc|face|hair|outfit|villager|resident|skin|citizen)/.test(names)) return 'NPC';
  if (/(hud|menu|gui|card|map_ui|inventory|font|interface)/.test(names)) return 'UI';
  if (/(animation|motion|idle|run|walk|attack|swing|movement)/.test(names)) return 'MOTION';
  if (/(harbor|sea|ship|port|island|landscape|world|voyage|town|lighting|field)/.test(names)) return 'WORLD';
  return 'GENERAL';
}
export function selectFreeDesignModels({
  frameNames = [], policy, env = process.env, previous = {}, now = Date.now()
} = {}) {
  const config = policy?.directVisualDesign?.freeSpecialistPool;
  if (config?.enabled !== true || config?.paidFallbackForbidden !== true ||
    config?.maxCallsPerCapture < 1 || config?.maxCallsPerCapture > 3 ||
    config?.accountTierProofRequired !== true)
    throw Error('FREE_SPECIALIST_POLICY_DENIED');
  const approved = new Set(config.modelIds || []);
  const role = designRoleForFrames(frameNames);
  const today = new Date(now).toISOString().slice(0, 10);
  const spent = previous?.usageWindow?.day === today ? previous.usageWindow.calls || {} : {};
  const eligible = DESIGN_FREE_MODELS.filter(model => {
    const cooling = Date.parse(previous?.cooldowns?.[model.id] || '');
    return approved.has(model.id) && trim(env[model.keyName]) &&
      trim(env[model.verifiedName]) === 'YES' &&
      (model.provider !== 'OPENROUTER' || model.model.endsWith(':free')) &&
      Number(spent[model.provider] || 0) < DAILY_LIMIT[model.provider] &&
      (!Number.isFinite(cooling) || cooling <= now);
  });
  const preference = config.roles?.[role] || [];
  return eligible.sort((left, right) =>
    (preference.indexOf(left.id) < 0 ? 999 : preference.indexOf(left.id)) -
    (preference.indexOf(right.id) < 0 ? 999 : preference.indexOf(right.id)) ||
    DESIGN_FREE_MODELS.indexOf(left) - DESIGN_FREE_MODELS.indexOf(right));
}

function cooldownAfter(response, status, error = null) {
  const raw = trim(response?.headers?.get?.('retry-after'));
  const seconds = Number(raw);
  let delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Date.parse(raw) - Date.now();
  if (!Number.isFinite(delay) || delay < 1000) {
    const detail = trim(error?.error?.message);
    delay = status === 429 && /daily|per day|requestsperday|free.?tier quota/i.test(detail)
      ? 86400000 : status === 429 ? 60000 : status === 404 ? 86400000 : 30000;
  }
  return Math.min(86400000, Math.max(1000, delay));
}
function modelAttempt(id, status, details = {}) {
  const row = {id, status, ...details};
  designRuntime.attempts.push(row);
  console.log('DESIGN_FREE_MODEL_ATTEMPT=' + id + ':' + status);
}
async function callFreeDesignModel(model, prompt, photos, fetchImpl) {
  const key = trim(process.env[model.keyName]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const body = model.provider === 'GEMINI'
      ? {contents: [{role: 'user', parts: [
          {text: prompt}, ...photos.map(photo => {
            const [header, data] = photo.url.split(',');
            return {inlineData: {mimeType: header.includes('image/png') ? 'image/png' : 'image/jpeg', data}};
          })
        ]}], generationConfig: {temperature: 0.1, maxOutputTokens: 3500, responseMimeType: 'application/json'}}
      : {model: model.model, stream: false, max_tokens: 3500, temperature: 0.1,
          messages: [{role: 'user', content: [{type: 'text', text: prompt},
            ...photos.map(photo => ({type: 'image_url', image_url: {url: photo.url}}))]}]};
    const headers = model.provider === 'GEMINI'
      ? {'content-type': 'application/json', 'x-goog-api-key': key}
      : {'content-type': 'application/json', Authorization: 'Bearer ' + key};
    const response = await fetchImpl(model.endpoint, {
      method: 'POST', signal: controller.signal, headers, body: JSON.stringify(body)
    });
    if (!response.ok) {
      let failure = null;
      if ([400, 429].includes(response.status)) {
        try {failure = await response.json();} catch {/* status is authoritative */}
      }
      const reason = trim(failure?.error?.message);
      if (response.status === 402) return {status: 'BILLING_BLOCKED'};
      if ([400, 403].includes(response.status) &&
        /safety|content policy|moderation|disallowed|blocked content/i.test(reason))
        return {status: 'CONTENT_POLICY_BLOCKED'};
      if ([401, 403].includes(response.status)) return {status: 'AUTH_BLOCKED'};
      return {status: 'HTTP_' + response.status,
        retryAfterMs: cooldownAfter(response, response.status, failure)};
    }
    const payload = await response.json();
    if (Number(payload?.usage?.cost || 0) > 0) return {status: 'NONZERO_COST_BLOCKED'};
    const content = model.provider === 'GEMINI'
      ? (payload?.candidates?.[0]?.content?.parts || []).filter(x => typeof x?.text === 'string')
          .map(x => x.text).join('')
      : payload?.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content
      : Array.isArray(content) ? content.map(x => trim(x?.text)).join('') : '';
    return text.trim() ? {status: 'OK', text} : {status: 'EMPTY_OUTPUT', retryAfterMs: 30000};
  } catch (error) {
    if (error?.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError)
      return {status: 'TRANSPORT_OR_TIMEOUT', retryAfterMs: 30000};
    return {status: 'INTERNAL_ERROR', retryAfterMs: 30000};
  } finally {
    clearTimeout(timeout);
  }
}


export function authorizedCandidateBranch(name, runId) {
  return /^[0-9]{5,}$/.test(String(runId ?? '')) &&
    name === 'nemotron-mare-design-' + String(runId);
}

function record(status, fields = {}) {
  const report = {version: 3, provider: 'MULTI_FREE_VISUAL', gameId: 'mare-essentia',
    sourceRevision: trim(process.env.GITHUB_SHA), status,
    usageWindow: designRuntime.usageWindow, cooldowns: designRuntime.cooldowns,
    attempts: designRuntime.attempts, ...fields};
  fs.mkdirSync(path.dirname(reportPath), {recursive: true});
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('NEMOTRON_DESIGN_STATUS=' + status);
  return report;
}

// [스튜디오 증거] 실제 캡처 이름, 원본 리비전, 이미지 바이트 형식을 모두 대조한다.
function photosFromStudio(directory = framesRoot) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const name of fs.readdirSync(directory).sort()) {
    if (!/^[A-Za-z0-9_.-]+-[0-9]+\.(?:jpe?g|png)$/i.test(name)) continue;
    const file = path.join(directory, name);
    if (!fs.statSync(file).isFile()) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.length < 4096 || bytes.length > 2000000) continue;
    const jpeg = bytes[0] === 255 && bytes[1] === 216;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!jpeg && !png) continue;
    found.push({name, sha256: digest(bytes), url: 'data:image/' +
      (jpeg ? 'jpeg' : 'png') + ';base64,' + bytes.toString('base64')});
    if (found.length === 8) break;
  }
  return found;
}
export function verifiedStudioCapture(report, photos, expectedRevision) {
  if (!/^[a-f0-9]{40}$/i.test(String(expectedRevision ?? '')) ||
    report?.sourceRevision !== expectedRevision ||
    !Array.isArray(report?.log) ||
    !Number.isInteger(Number(report?.summary?.capturedFrames)) ||
    Number(report.summary.capturedFrames) < photos.length ||
    (Array.isArray(report.errors) && report.errors.length > 0)) return false;
  const captured = new Set(report.log.filter(row => typeof row?.capture === 'string')
    .map(row => row.capture));
  return photos.length >= 2 && photos.every(photo =>
    captured.has(photo.name.replace(/-[0-9]+\.(?:jpe?g|png)$/i, '')));
}

// [검사] 원본 소스 구조와 문맥을 유지하는 시각 상수·표현 변경만 허용한다.
// 게임플레이 수치·제어 흐름·문자열/에셋 ID·실행문 신규 삽입은 막는다.
export function visualEditLooksSafe(before, after) {
  if (typeof before !== 'string' || typeof after !== 'string' || before === after ||
    !before.trim() || /[\r\n]/.test(before + after) ||
    Buffer.byteLength(before) > 1800 || Buffer.byteLength(after) > 1800 ||
    before.trimStart().startsWith('--') || before.includes('--') ||
    after.includes('--') || /[;]/.test(before + after) ||
    protectedCode.test(before + '\n' + after) ||
    !visualCode.test(before) || !visualCode.test(after)) return false;
  if ((before.match(quoted) || []).join('\0') !== (after.match(quoted) || []).join('\0'))
    return false;
  if ((before.match(/^\s*/) || [''])[0] !== (after.match(/^\s*/) || [''])[0])
    return false;
  const skeleton = line => line
    .replace(/Enum\.(?:Material|Font|EasingStyle|TextXAlignment|TextYAlignment)\.[A-Za-z_][A-Za-z_0-9]*/g,
      token => token.slice(0, token.lastIndexOf('.') + 1) + '#')
    .replace(/(?<![A-Za-z_0-9])-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?![A-Za-z_0-9])/g, '#');
  if (skeleton(before) !== skeleton(after)) return false;
  const numbers = line => [...line.matchAll(/(?<![A-Za-z_0-9])-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?![A-Za-z_0-9])/g)]
    .map(m => Number(m[0]));
  const oldNums = numbers(before), newNums = numbers(after);
  if (oldNums.length !== newNums.length ||
    newNums.some((n, i) => !Number.isFinite(n) || Math.abs(n) > Math.max(1024, Math.abs(oldNums[i]) * 2 + 1)))
    return false;
  return true;
}

export function validateReview(value, frameNames, contract, availableAnchors = null) {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (typeof raw === 'string' && Buffer.byteLength(raw) > 90000) throw Error('RESPONSE_INVALID_SIZE');
  const response = typeof raw === 'string'
    ? JSON.parse(raw.replace(/^```(?:json)?\s*\n/i, '').replace(/\n```\s*$/, ''))
    : raw;
  if (!response || !Array.isArray(response.issues) || !Array.isArray(response.edits) ||
    response.issues.length > 16 || response.edits.length > (contract?.maximumSourceEditsPerRun || 10))
    throw Error('REVIEW_SCHEMA_INVALID');
  const frames = new Set(frameNames);
  const categories = new Set(contract?.visualCategories || []);
  const allowedFiles = new Set(contract?.allowedSourceFiles || []);
  if (categories.size < 10 || allowedFiles.size < 2) throw Error('DESIGN_POLICY_INCOMPLETE');
  const issues = response.issues.map(row => {
    if (!row || !categories.has(row.category) || !['low', 'medium', 'high'].includes(row.severity) ||
      !frames.has(row.screenshot) || typeof row.evidence !== 'string' ||
      row.evidence.trim().length < 12 || row.evidence.length > 500)
      throw Error('ISSUE_EVIDENCE_INVALID');
    return {category: row.category, severity: row.severity, screenshot: row.screenshot,
      evidenceSha256: digest(row.evidence.trim())};
  });
  const files = new Set(), usedAnchors = new Set();
  const edits = response.edits.map(row => {
    // 실제 소스에서 뽑은 색인만 허용해 없는 파일/가짜 원본을 제안해도 적용되지 않는다.
    const pinned = Array.isArray(availableAnchors)
      ? (Number.isInteger(row?.anchor) ? availableAnchors[row.anchor] : undefined)
      : null;
    const sourcePath = Array.isArray(availableAnchors) ? pinned?.path : row?.path;
    const before = Array.isArray(availableAnchors) ? pinned?.before : row?.before;
    if (!row || (Array.isArray(availableAnchors) && (!pinned ||
      (row.path !== undefined && row.path !== sourcePath) ||
      (row.before !== undefined && row.before !== before))) ||
      !allowedFiles.has(sourcePath) || !categories.has(row.category) ||
      !frames.has(row.screenshot) || !issues.some(issue =>
        issue.category === row.category && issue.screenshot === row.screenshot &&
        issue.severity !== 'low') ||
      !visualEditLooksSafe(before, row.after))
      throw Error('EDIT_NOT_VISUAL_OR_NOT_IN_POLICY');
    const key = sourcePath + '\0' + before;
    if (usedAnchors.has(key)) throw Error('DUPLICATE_SOURCE_ANCHOR');
    usedAnchors.add(key);
    files.add(sourcePath);
    return {path: sourcePath, category: row.category, screenshot: row.screenshot,
      before, after: row.after};
  });
  if (files.size > (contract.maximumCandidateFilesPerRun || 4))
    throw Error('CANDIDATE_FILE_LIMIT');
  return {issues, edits};
}

function cleanAnchor(line) {
  return line.length <= 260 && visualCode.test(line) && !protectedCode.test(line) &&
    !/--|[;]|https?:\/\/|(?:api[_-]?key|secret|token|password)/i.test(line) &&
    !line.trimStart().startsWith('--');
}
function visualAnchors(files) {
  const result = [];
  for (const file of files) {
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) ||
      !fs.statSync(target).isFile()) continue;
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    const counts = new Map();
    for (const line of lines) counts.set(line, (counts.get(line) || 0) + 1);
    const possible = lines.filter(line => cleanAnchor(line) && counts.get(line) === 1);
    // 얼굴과 머리/옷을 먼저, 나머지 건물·선박·UI는 파일 전체 구간을 고르게 표본화한다.
    const focused = file.endsWith('/Pose.luau')
      ? possible.filter(line => /LightInfluence|scalp|skirt|belt|hair|q\.Size|Fabric/i.test(line)).slice(0, 4)
      : [];
    const sampled = Array.from({length: 8}, (_, index) =>
      possible[Math.floor(index * Math.max(0, possible.length - 1) / 7)]).filter(Boolean);
    for (const line of [...new Set([...focused, ...sampled])].slice(0, 7))
      result.push({anchor: result.length, path: file, before: line});
  }
  return result.slice(0, 112);
}

// [메인] 후보는 검증된 브랜치에서만 쓰며 모델 원문/명령은 실행하지 않는다.
export function applyVisualReplacements(files, edits, contract) {
  const output = new Map(), changes = [];
  for (const edit of edits) {
    if (!contract.allowedSourceFiles.includes(edit.path) ||
      !visualEditLooksSafe(edit.before, edit.after)) throw Error('EDIT_NOT_AUTHORIZED');
    if (!Object.hasOwn(files, edit.path)) throw Error('SOURCE_FILE_NOT_FOUND:' + edit.path);
    const source = output.get(edit.path) || files[edit.path];
    const lines = source.split('\n');
    const occurrences = lines.filter(line => line === edit.before).length;
    if (occurrences !== 1) throw Error('SOURCE_ANCHOR_NOT_UNIQUE:' + edit.path);
    output.set(edit.path, lines.map(line => line === edit.before ? edit.after : line).join('\n'));
    changes.push({path: edit.path, category: edit.category, screenshot: edit.screenshot,
      beforeSha256: digest(edit.before), afterSha256: digest(edit.after)});
  }
  if (changes.length > contract.maximumSourceEditsPerRun ||
    output.size > contract.maximumCandidateFilesPerRun) throw Error('CANDIDATE_LIMIT');
  return {files: output, changes};
}

export async function reviewNemotron({fetchImpl = globalThis.fetch} = {}) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY), 'utf8'));
  const contract = policy.directVisualDesign;
  if (!contract?.enabled || contract.model !== MODEL ||
    !contract.gameIds?.includes('mare-essentia') ||
    !contract.isolatedCandidateBranchRequired || !contract.directCandidateSourceEditAllowed ||
    !contract.directMainWriteForbidden || !contract.modelMayProposeSourceCode ||
    !contract.exactOldSourceMustMatchOnce || !contract.nativeSecurityAndReleaseGatesMandatory ||
    contract.maximumCandidateFilesPerRun > 4 || contract.maximumSourceEditsPerRun > 10 ||
    contract.maximumReplacementBytes > 1800 || !Array.isArray(contract.allowedSourceFiles) ||
    contract.allowedSourceFiles.length < 2 ||
    contract.allowedSourceFiles.some(file => !/^roblox-games\/mare-essentia\/src\/[A-Za-z0-9_./-]+\.luau$/.test(file)))
    throw Error('CANONICAL_DESIGN_POLICY_DENIED');
  const photos = photosFromStudio();
  const proofs = photos.map(({name, sha256}) => ({name, sha256}));
  if (photos.length < 2) return record('SKIPPED_STUDIO_IMAGES_UNAVAILABLE', {frames: proofs});
  let studio;
  try {
    studio = JSON.parse(fs.readFileSync(path.join(framesRoot, 'report.json'), 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return record('SKIPPED_OFFICIAL_STUDIO_REPORT_MISSING', {frames: proofs});
  }
  if (!verifiedStudioCapture(studio, photos, process.env.GITHUB_SHA))
    return record('SKIPPED_STUDIO_SOURCE_EVIDENCE_MISMATCH', {frames: proofs});
  if (trim(process.env.COMPANY_EXTERNAL_AI_ENABLED) !== 'YES')
    return record('SKIPPED_EXTERNAL_AI_OPT_IN_REQUIRED', {frames: proofs});
  // [재사용 이력] 기존 Studio 증거 브랜치에 저장된 호출 한도와 제공자 쿨다운.
  let previous = {};
  try {
    if (options.previous && fs.existsSync(path.resolve(options.previous)))
      previous = JSON.parse(fs.readFileSync(path.resolve(options.previous), 'utf8'));
  } catch {/* 손상된 이력은 권한을 주지 않고 신규 증거로만 처리한다. */}
  loadPreviousDesignUsage(previous);
  const freeModels = selectFreeDesignModels({
    frameNames: photos.map(photo => photo.name), policy, previous
  });
  if (!freeModels.length)
    return record('SKIPPED_FREE_DESIGN_POOL_UNAVAILABLE', {frames: proofs});
  if (trim(process.env.NEMOTRON_DESIGN_CANDIDATE) !== 'YES')
    return record('SKIPPED_CANDIDATE_EDIT_NOT_ENABLED', {frames: proofs});
  let branch = '';
  try {
    branch = execFileSync('git', ['-C', root, 'symbolic-ref', '--quiet', '--short', 'HEAD'],
      {encoding: 'utf8', timeout: 5000}).trim();
  } catch {
    return record('BLOCKED_NO_CANDIDATE_BRANCH', {frames: proofs});
  }
  if (!authorizedCandidateBranch(branch, process.env.GITHUB_RUN_ID))
    return record('BLOCKED_NOT_ISOLATED_CANDIDATE_BRANCH', {frames: proofs});
  const anchors = visualAnchors(contract.allowedSourceFiles);
  if (!anchors.length) return record('SKIPPED_NO_EXISTING_VISUAL_ANCHORS', {frames: proofs});
  const prompt = 'You are a visual art director for the existing Roblox sea-voyage game. ' +
    'Study the verified real Studio screenshots and improve face, hair, clothing, ships, buildings, ' +
    'materials, lighting, HUD, cards, portraits, motion and composition where visually justified. ' +
    'Never create primitives, placeholder models, new art assets, URLs or unlicensed assets. ' +
    'Only change visual constants on EXISTING exact source lines shown in anchors. ' +
    'Never modify gameplay, economy, save, combat, physics, networking, or script control flow. ' +
    'Return STRICT JSON: {"issues":[{"category":"one policy category","severity":"low|medium|high",' +
    '"screenshot":"existing image name","evidence":"specific visible evidence"}],' +
    '"edits":[{"category":"matching medium or high issue category","screenshot":"same photo",' +
    '"anchor":number,"after":"same referenced line with ONLY numerical visual values or existing visual enum changed"}]}. ' +
    'At most 10 edits across 4 files. Never add/remove functions, statements, assets, text, ' +
    'commands, identifiers, property targets or line breaks. Empty edits when uncertain. ' +
    'Policies: ' + JSON.stringify({categories: contract.visualCategories,
      maxReplacementBytes: contract.maximumReplacementBytes}) + '. ' +
    'Screenshots: ' + JSON.stringify(photos.map(x => x.name)) + '. ' +
    'Existing verified source anchors: ' + JSON.stringify(anchors);
  // [메인] 가장 적합한 무료 전문가부터 시도하고 한도/출력 오류면 다른 무료 전문가에게 넘긴다.
  // 유료/안전 거부가 발견되면 중단. 동일 모델에 재시도 폭증·유료 전환 없음.
  const routeLimit = policy.directVisualDesign.freeSpecialistPool.maxCallsPerCapture;
  for (const model of freeModels.slice(0, routeLimit)) {
    const previousCount = designRuntime.usageWindow.calls[model.provider] || 0;
    if (previousCount >= DAILY_LIMIT[model.provider]) continue;
    designRuntime.usageWindow.calls[model.provider] = previousCount + 1;
    const result = await callFreeDesignModel(model, prompt, photos, fetchImpl);
    modelAttempt(model.id, result.status, {provider: model.provider, model: model.model});
    if (['BILLING_BLOCKED', 'NONZERO_COST_BLOCKED', 'CONTENT_POLICY_BLOCKED'].includes(result.status))
      return record('BLOCKED_FREE_POLICY_OR_CONTENT', {frames: proofs, lastModel: model.id});
    if (result.status !== 'OK') {
      if (result.retryAfterMs)
        designRuntime.cooldowns[model.id] = new Date(Date.now() + result.retryAfterMs).toISOString();
      continue;
    }
    let reviewed;
    try {
      reviewed = validateReview(result.text, photos.map(photo => photo.name), contract, anchors);
    } catch (error) {
      modelAttempt(model.id, 'REVIEW_INVALID', {
        failureSignature: trim(error?.message).replace(/[^\w:.-]/g, '_').slice(0, 90)});
      continue;
    }
    const originals = Object.fromEntries([...new Set(reviewed.edits.map(edit => edit.path))]
      .map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
    let candidate;
    try {
      candidate = applyVisualReplacements(originals, reviewed.edits, contract);
    } catch (error) {
      modelAttempt(model.id, 'SOURCE_ANCHOR_INVALID', {
        failureSignature: trim(error?.message).replace(/[^\w:.-]/g, '_').slice(0, 90)});
      continue;
    }
    const evidence = {frames: proofs, provider: model.provider, model: model.model,
      selectedRole: designRoleForFrames(photos.map(photo => photo.name)),
      rawResponseSha256: digest(result.text),
      issues: reviewed.issues, edits: candidate.changes,
      sourceHashes: [...candidate.files].map(([file, content]) =>
        ({path: file, beforeSha256: digest(originals[file]), afterSha256: digest(content)})),
      candidateOnly: true, independentQaPassed: false, afterStudioPassed: false,
      releasePassed: false};
    if (!candidate.changes.length) {
      modelAttempt(model.id, 'NO_VALID_EDIT');
      continue;
    }
    for (const [file, content] of candidate.files) fs.writeFileSync(path.join(root, file), content);
    return record('CANDIDATE_EDITED', evidence);
  }
  return record('REVIEWED_NO_VERIFIED_EDIT', {frames: proofs,
    independentQaPassed: false, afterStudioPassed: false, releasePassed: false});
}

// [자동 검증] 다른 제공자의 무료 영상 분석으로 전후 사진을 독립 비교한다.
// Studio/보안/회귀 검사와 별개의 질적 보완 검토이며 단독 PASS 권한이 없다.
export function validateVisualComparison(value, frameNames) {
  let result = value;
  if (typeof result === 'string') {
    if (Buffer.byteLength(result) > 18000) throw Error('VISUAL_COMPARISON_TOO_LARGE');
    result = JSON.parse(result.trim().replace(/^```(?:json)?\s*\n/i, '').replace(/\n```\s*$/, ''));
  }
  const names = new Set(frameNames);
  if (!result || !['PASS', 'FAIL', 'UNKNOWN'].includes(result.verdict) ||
    !Array.isArray(result.improvements) || !Array.isArray(result.regressions) ||
    result.improvements.length > 8 || result.regressions.length > 8)
    throw Error('VISUAL_COMPARISON_SCHEMA_INVALID');
  for (const item of [...result.improvements, ...result.regressions]) {
    if (!names.has(item?.screenshot) || typeof item.evidence !== 'string' ||
      item.evidence.trim().length < 24 || item.evidence.length > 600)
      throw Error('VISUAL_COMPARISON_EVIDENCE_INVALID');
  }
  return {status: result.verdict === 'PASS' && result.regressions.length === 0 &&
    result.improvements.length >= 2 &&
    new Set(result.improvements.map(item => item.screenshot)).size >= 2
    ? 'PASS' : 'UNVERIFIED',
    improvements: result.improvements.map(item => ({
      screenshot: item.screenshot, evidenceSha256: digest(item.evidence.trim())
    })),
    regressions: result.regressions.map(item => ({
      screenshot: item.screenshot, evidenceSha256: digest(item.evidence.trim())
    }))};
}

export async function verifyVisualCandidate({fetchImpl = globalThis.fetch} = {}) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY), 'utf8'));
  const beforeDir = path.resolve(options.before || '');
  const beforeRevision = trim(process.env.STUDIO_BASE_SHA);
  const candidateRevision = trim(process.env.GITHUB_SHA);
  const unavailable = status => record(status, {
    beforeRevision, candidateRevision, independentQaPassed: false,
    afterStudioPassed: false, releasePassed: false
  });
  if (!options.before || beforeDir === framesRoot ||
    !/^[a-f0-9]{40}$/i.test(beforeRevision) ||
    !/^[a-f0-9]{40}$/i.test(candidateRevision) ||
    beforeRevision === candidateRevision ||
    !policy?.directVisualDesign?.freeSpecialistPool?.enabled)
    return unavailable('BLOCKED_VISUAL_BEFORE_AFTER_IDENTITY');
  let beforeReport, afterReport, previous;
  try {
    beforeReport = JSON.parse(fs.readFileSync(path.join(beforeDir, 'report.json'), 'utf8').replace(/^\uFEFF/, ''));
    afterReport = JSON.parse(fs.readFileSync(path.join(framesRoot, 'report.json'), 'utf8').replace(/^\uFEFF/, ''));
    previous = JSON.parse(fs.readFileSync(path.join(beforeDir, 'nemotron-design-review.json'), 'utf8'));
  } catch {
    return unavailable('BLOCKED_VISUAL_BASELINE_EVIDENCE_MISSING');
  }
  const beforePhotos = photosFromStudio(beforeDir);
  const afterPhotos = photosFromStudio(framesRoot);
  const beforeByName = new Map(beforePhotos.map(photo => [photo.name, photo]));
  const names = afterPhotos.map(photo => photo.name).filter(name => beforeByName.has(name)).slice(0, 4);
  const baseline = names.map(name => beforeByName.get(name));
  const after = names.map(name => afterPhotos.find(photo => photo.name === name));
  if (previous?.sourceRevision !== beforeRevision ||
    previous?.status !== 'CANDIDATE_EDITED' ||
    !previous?.model || !previous?.rawResponseSha256 ||
    !verifiedStudioCapture(beforeReport, baseline, beforeRevision) ||
    !verifiedStudioCapture(afterReport, after, candidateRevision) ||
    names.length < 2 || !baseline.some((photo, index) => photo.sha256 !== after[index].sha256))
    return unavailable('BLOCKED_VISUAL_STUDIO_CAPTURE_MISMATCH');
  loadPreviousDesignUsage(previous);
  const allModels = selectFreeDesignModels({frameNames: names, policy, previous});
  // 후보 모델 스스로 최종 수용을 결정할 수 없다.
  const reviewers = allModels.filter(model => model.provider !== previous.provider);
  if (!reviewers.length)
    return unavailable('BLOCKED_NO_INDEPENDENT_FREE_VISUAL_REVIEWER');
  const prompt = 'Independently compare the same official Roblox Studio screenshots BEFORE and AFTER a visual-only source edit. ' +
    'Pairs follow strictly in order: BEFORE then AFTER for each screenshot name. ' +
    'Reject regressions in character appearance, clothing, architecture, readability, art-style consistency or image sharpness. ' +
    'No gameplay, code, remote commands, credentials or new assets. ' +
    'Return STRICT JSON only: {"verdict":"PASS|FAIL|UNKNOWN",' +
    '"improvements":[{"screenshot":"exact name","evidence":"specific visible change comparing both images"}],' +
    '"regressions":[{"screenshot":"exact name","evidence":"specific visible regression"}]}. ' +
    'PASS only when at least two distinct screenshots show actual improvements without any regression; ' +
    'uncertain/no visual improvement -> UNKNOWN. File names: ' + JSON.stringify(names);
  const pairs = names.flatMap((name, index) => [baseline[index], after[index]]);
  for (const reviewer of reviewers.slice(0, policy.directVisualDesign.freeSpecialistPool.maxCallsPerCapture)) {
    const previousCalls = designRuntime.usageWindow.calls[reviewer.provider] || 0;
    if (previousCalls >= DAILY_LIMIT[reviewer.provider]) continue;
    designRuntime.usageWindow.calls[reviewer.provider] = previousCalls + 1;
    const result = await callFreeDesignModel(reviewer, prompt, pairs, fetchImpl);
    modelAttempt(reviewer.id, result.status);
    if (['CONTENT_POLICY_BLOCKED', 'BILLING_BLOCKED', 'NONZERO_COST_BLOCKED'].includes(result.status))
      return unavailable('BLOCKED_VISUAL_REVIEW_FREE_POLICY');
    if (result.status !== 'OK') {
      if (result.retryAfterMs) designRuntime.cooldowns[reviewer.id] =
        new Date(Date.now() + result.retryAfterMs).toISOString();
      continue;
    }
    let verdict;
    try {verdict = validateVisualComparison(result.text, names);}
    catch (error) {
      modelAttempt(reviewer.id, 'VISUAL_COMPARISON_INVALID', {
        reason: trim(error?.message).replace(/[^\w:.-]/g, '_').slice(0, 90)});
      continue;
    }
    return record(verdict.status === 'PASS' ? 'VISUAL_BEFORE_AFTER_PASS' : 'VISUAL_BEFORE_AFTER_UNVERIFIED', {
      beforeRevision, candidateRevision, beforeFrames: baseline.map(x => ({name: x.name, sha256: x.sha256})),
      afterFrames: after.map(x => ({name: x.name, sha256: x.sha256})),
      authorProvider: previous.provider, reviewerProvider: reviewer.provider,
      reviewerModel: reviewer.model, comparison: verdict, rawResponseSha256: digest(result.text),
      independentQaPassed: verdict.status === 'PASS',
      afterStudioPassed: verdict.status === 'PASS', releasePassed: false
    });
  }
  return unavailable('BLOCKED_VISUAL_REVIEW_FREE_POOL_EXHAUSTED');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  (options.mode === 'verify' ? verifyVisualCandidate() : reviewNemotron()).catch(error => {
    console.log('NEMOTRON_DESIGN_STATUS=UNVERIFIED_INTERNAL_ERROR');
    console.log('NEMOTRON_DESIGN_FAILURE=' + trim(error?.message).replace(/[^\w:.-]/g, '_').slice(0, 100));
    process.exitCode = 1;
  });
}
