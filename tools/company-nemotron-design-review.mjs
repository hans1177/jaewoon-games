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
const visualCode = /Color3\.(?:new|fromRGB|fromHSV)\(|Enum\.(?:Material|Font|EasingStyle|TextXAlignment|TextYAlignment)\.|\.(?:Color|Color3|TextColor3|BackgroundColor3|ImageColor3|Transparency|TextTransparency|BackgroundTransparency|ImageTransparency|LightInfluence|Material|Font|TextSize|Size|Position|Rotation|Scale|Brightness|Contrast|Saturation|FieldOfView|Ambient|OutdoorAmbient|Reflectance|Emission|StrokeThickness)\s*=|(?:UDim2|UDim)\.new\(|\btint\s*=\s*\{\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\}/;
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
const designRuntime = {usageWindow: null, cooldowns: {}, attempts: [], selectedRole: '', accountQuota: null};
// [무료 자원 회계] 업체별 날짜를 분리한다. Gemini의 공식 일일 초기화는 미 태평양 시간 기준이다.
// 다른 업체의 UTC 일자는 기존 로컬 안전 상한의 갱신 시점일 뿐, 실제 계정 한도 초기화의 증거가 아니다.
const currentDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export function freeDesignWindowId(provider, now = Date.now()) {
  if (provider !== 'GEMINI') return currentDay(now);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(now));
  const date = Object.fromEntries(parts.filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
  return date.year + '-' + date.month + '-' + date.day;
}
function nextFreeDesignWindow(provider, now) {
  const current = freeDesignWindowId(provider, now);
  const hour = Math.floor(now / 3600000) * 3600000;
  for (let step = 1; step <= 49; step++) {
    const at = hour + step * 3600000;
    if (freeDesignWindowId(provider, at) !== current) return new Date(at).toISOString();
  }
  return null;
}
// 예측치는 이 Studio 디자인 실행에서 확인된 소비량에 한정한다.
// 다른 작업/프로젝트의 실제 계정 전체 잔량을 알 수 없는 상태를 0원 또는 전체 가용량으로 오인하지 않는다.
export function forecastFreeDesignQuota(usageWindow = {}, now = Date.now(), accountQuota = null) {
  const quotas = {};
  for (const [provider, limit] of Object.entries(DAILY_LIMIT)) {
    const windowId = freeDesignWindowId(provider, now);
    const sameWindow = usageWindow?.windowIds?.[provider] === windowId ||
      (usageWindow?.windowIds?.[provider] === undefined && usageWindow?.day === currentDay(now));
    const count = sameWindow ? Number(usageWindow?.calls?.[provider] || 0) : 0;
    const used = Number.isInteger(count) && count >= 0 ? Math.min(count, 1000) : 0;
    const remaining = Math.max(0, limit - used);
    const reserve = Math.ceil(limit * 0.2);
    const startedAt = sameWindow ? Date.parse(usageWindow?.firstCallAtByProvider?.[provider]) : NaN;
    const elapsedHours = (now - startedAt) / 3600000;
    const hourlyRate = used >= 2 && Number.isFinite(elapsedHours) && elapsedHours > 0
      ? Math.round((used - 1) / Math.max(0.25, elapsedHours) * 100) / 100 : null;
    // OpenRouter 키 조회는 무료 계정 여부만 제공한다. 일일 무료 요청 잔량 필드는 공식 계약에 없다.
    const available = remaining;
    quotas[provider] = {
      scope: 'STUDIO_VISUAL_ONLY', localDailyLimit: limit, localUsed: used,
      remainingLocal: remaining, effectiveRemaining: available,
      regularWorkRemaining: Math.max(0, available - reserve),
      emergencyReserveRemaining: Math.min(available, reserve),
      estimatedCallsPerHour: hourlyRate,
      estimatedHoursToLocalCap: hourlyRate > 0
        ? Math.round(remaining / hourlyRate * 10) / 10 : null,
      nextLocalWindowAt: nextFreeDesignWindow(provider, now),
      resetBasis: provider === 'GEMINI' ? 'PACIFIC_DAILY' : 'INTERNAL_UTC_DAY_NOT_PROVIDER_CONFIRMED',
      accountWideBalanceVerified: false,
      accountWideFreeRemaining: null,
      accountFreeTierVerified: provider === 'OPENROUTER' && accountQuota?.scope ===
        'OPENROUTER_ACCOUNT_TIER' ? accountQuota.isFreeTier : null,
      accountBalanceSource: 'NOT_EXPOSED_BY_PROVIDER'
    };
  }
  return quotas;
}
// [공식 무료 계정 검증] /api/v1/key는 계정 무료 여부(is_free_tier)를 제공한다.
// 공식적으로 제공하지 않는 일일 무료 요청 잔량을 만들어 내거나 크레딧 사용량을 요청 수로 환산하지 않는다.
export async function inspectOpenRouterFreeTier({env = process.env, fetchImpl = globalThis.fetch} = {}) {
  const key = trim(env.OPENROUTER_API_KEY);
  if (!key || trim(env.OPENROUTER_DESIGN_FREE_TIER_VERIFIED) !== 'YES') return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl('https://openrouter.ai/api/v1/key', {
      method: 'GET', signal: controller.signal, headers: {Authorization: 'Bearer ' + key}
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (typeof result?.data?.is_free_tier !== 'boolean') return null;
    return {scope: 'OPENROUTER_ACCOUNT_TIER', isFreeTier: result.data.is_free_tier,
      observedAt: new Date().toISOString(), source: 'OPENROUTER_KEY_API'};
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
function loadPreviousDesignUsage(previous = {}) {
  designRuntime.usageWindow = mergeFreeVisualUsage(previous).usageWindow;
  designRuntime.cooldowns = Object.fromEntries(Object.entries(previous?.cooldowns || {})
    .filter(([id, until]) => DESIGN_FREE_MODELS.some(model => model.id === id) &&
      Number.isFinite(Date.parse(until)) && Date.parse(until) > Date.now()));
  designRuntime.attempts = [];
  designRuntime.accountQuota = null;
}
export function designRoleForFrames(frameNames = []) {
  const names = frameNames.join(' ').toLowerCase();
  // [카드 전용 장면 제외] 외부 무료 디자인 검수는 카드 전투·덱·카드 그림을 다루지 않는다.
  if (/(?:^cb[0-9]+|card|deck|duel|battle_board)/i.test(names)) return 'EXCLUDED_CARD';
  if (/(npc|face|hair|outfit|villager|resident|skin|citizen)/.test(names)) return 'NPC';
  // [교역품과 시설 메뉴] 실제 교역·조선·서재·주점 촬영본을 기존 UI 검수에 포함한다.
  if (/(hud|menu|gui|card|tab_|ui_|map_ui|inventory|font|interface|trade|market|goods|cargo|warehouse|shop|yard|shipwright|codex|quest|journal|diary|research|tech|recruit|crew|dialog|status|merchant|treasury|bank|tavern|palace|guild|museum|academy|facility|exchange|diplomacy|equipment|chart|library|headquarters|captain_room|harbor_authority)/.test(names)) return 'UI';
  if (/(animation|motion|idle|run|walk|attack|swing|movement)/.test(names)) return 'MOTION';
  if (/(harbor|sea|ship|port|island|landscape|world|voyage|town|lighting|field)|^(?:v[0-9]+_|cb[0-9]+(?:_|-))/.test(names)) return 'WORLD';
  return 'GENERAL';
}
// [분야별 자동 순환] 실제 캡처에 2장 이상 있는 분야만 우선 배정한다.
export function selectDesignFrameRole(frameNames = [], previousRole = '') {
  const roles = ['NPC', 'WORLD', 'UI', 'MOTION', 'GENERAL'];
  const available = roles.filter(role =>
    frameNames.filter(name => designRoleForFrames([name]) === role).length >= 2);
  const previous = available.indexOf(previousRole);
  return available.length ? available[(previous + 1) % available.length] : 'GENERAL';
}
// [검증된 모델 성공 학습] 오직 공식 Studio 전후 사진·독립 모델·정확한 소스 SHA가 일치할 때만 긍정 배치 신호를 발급한다.
// 모델 본인의 자기 평가, 소스 정적 PASS 또는 사진 해시가 다른 사실만으로 성공을 학습하지 않는다.
export function verifiedDesignFeedback(previous = {}, feedback = {}, now = Date.now()) {
  const sha = value => /^[a-f0-9]{40}$/i.test(String(value ?? ''));
  const imageSha = value => /^[a-f0-9]{64}$/i.test(String(value ?? ''));
  const reviewedAt = Date.parse(feedback.verifiedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > now ||
    now - reviewedAt > 7 * 24 * 60 * 60 * 1000 ||
    previous?.status !== 'CANDIDATE_EDITED' ||
    !sha(previous.sourceRevision) || !sha(feedback.candidateRevision) ||
    previous.sourceRevision === feedback.candidateRevision ||
    feedback.beforeRevision !== previous.sourceRevision ||
    feedback.sourceRevision !== feedback.candidateRevision ||
    feedback.authorProvider !== previous.provider ||
    feedback.authorModel !== previous.model ||
    feedback.selectedRole !== previous.selectedRole ||
    feedback.reviewerProvider === previous.provider ||
    !feedback.reviewerProvider ||
    feedback.status !== 'VISUAL_BEFORE_AFTER_PASS' ||
    feedback.independentQaPassed !== true || feedback.afterStudioPassed !== true ||
    feedback.comparison?.status !== 'PASS' ||
    !Array.isArray(feedback.comparison?.improvements) ||
    feedback.comparison.improvements.length < 2 ||
    !Array.isArray(feedback.comparison?.regressions) ||
    feedback.comparison.regressions.length > 0 ||
    !Array.isArray(feedback.beforeFrames) || !Array.isArray(feedback.afterFrames) ||
    feedback.beforeFrames.length < 2 ||
    feedback.beforeFrames.length !== feedback.afterFrames.length)
    return null;
  const pairs = feedback.beforeFrames.every((entry, i) => {
    const after = feedback.afterFrames[i];
    return entry?.name === after?.name &&
      imageSha(entry.sha256) && imageSha(after?.sha256);
  });
  if (!pairs ||
    !feedback.beforeFrames.some((entry, i) => entry.sha256 !== feedback.afterFrames[i].sha256))
    return null;
  const photoNames = new Set(feedback.beforeFrames.map(entry => entry.name));
  const improvedNames = new Set(feedback.comparison.improvements
    .map(entry => entry?.screenshot).filter(name => photoNames.has(name)));
  if (improvedNames.size < 2 ||
    feedback.comparison.improvements.some(entry => !imageSha(entry.evidenceSha256)))
    return null;
  return {provider: previous.provider, model: previous.model, role: previous.selectedRole,
    sourceRevision: previous.sourceRevision, candidateRevision: feedback.candidateRevision};
}

// [호출 한도 회계] 동일 공식 Studio 촬영 세대의 '초안 생성 + 독립 검수' 사용량을 합산한다.
// 회차별 카운터는 누적이므로 합계가 아닌 각 제공자별 최대값을 사용한다. 요금 한도를 낮추는 방향으로만 병합.
export function mergeFreeVisualUsage(previous = {}, feedback = {}, now = Date.now()) {
  const day = currentDay(now);
  const originWindow = previous?.usageWindow || {};
  const validFollowup = /^[a-f0-9]{40}$/i.test(String(previous?.sourceRevision || '')) &&
    feedback?.beforeRevision === previous.sourceRevision &&
    /^[a-f0-9]{40}$/i.test(String(feedback?.candidateRevision || '')) &&
    feedback?.sourceRevision === feedback.candidateRevision &&
    feedback?.gameId === 'mare-essentia' &&
    feedback?.usageWindow?.day === day;
  const followingWindow = validFollowup ? feedback.usageWindow : {};
  const calls = {}, windowIds = {}, firstCallAtByProvider = {};
  for (const provider of Object.keys(DAILY_LIMIT)) {
    const windowId = freeDesignWindowId(provider, now);
    windowIds[provider] = windowId;
    const sameWindow = window => window?.windowIds?.[provider] === windowId ||
      (window?.windowIds?.[provider] === undefined && window?.day === day);
    const originValid = sameWindow(originWindow);
    const nextValid = validFollowup && sameWindow(followingWindow);
    const safeCount = value => Number.isInteger(Number(value)) && Number(value) >= 0
      ? Math.min(Number(value), 1000) : 0;
    calls[provider] = Math.max(
      originValid ? safeCount(originWindow?.calls?.[provider] || 0) : 0,
      nextValid ? safeCount(followingWindow?.calls?.[provider] || 0) : 0
    );
    const candidates = [
      originValid ? originWindow?.firstCallAtByProvider?.[provider] : null,
      nextValid ? followingWindow?.firstCallAtByProvider?.[provider] : null
    ].filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)) &&
      Date.parse(value) <= now && Date.parse(value) >= now - 48 * 3600000);
    if (candidates.length) firstCallAtByProvider[provider] =
      new Date(Math.min(...candidates.map(Date.parse))).toISOString();
  }
  const cooldowns = {...previous?.cooldowns};
  if (validFollowup) for (const model of DESIGN_FREE_MODELS) {
    const newer = Date.parse(feedback?.cooldowns?.[model.id] || '');
    const older = Date.parse(cooldowns?.[model.id] || '');
    if (Number.isFinite(newer) && newer > now &&
      (!Number.isFinite(older) || newer > older))
      cooldowns[model.id] = new Date(newer).toISOString();
  }
  return {...previous, usageWindow: {day, calls, windowIds, firstCallAtByProvider}, cooldowns};
}

export function selectFreeDesignModels({
  frameNames = [], policy, env = process.env, previous = {}, feedback = {},
  diagnostics = [], accountQuota = null, now = Date.now()
} = {}) {
  const config = policy?.directVisualDesign?.freeSpecialistPool;
  if (config?.enabled !== true || config?.paidFallbackForbidden !== true ||
    config?.maxCallsPerCapture < 1 || config?.maxCallsPerCapture > 3)
    throw Error('FREE_SPECIALIST_POLICY_DENIED');
  const approved = new Set(config.modelIds || []);
  const role = designRoleForFrames(frameNames);
  const today = new Date(now).toISOString().slice(0, 10);
  const carried = mergeFreeVisualUsage(previous, feedback, now);
  const spent = carried.usageWindow.calls;
  const quotaForecast = forecastFreeDesignQuota(carried.usageWindow, now, accountQuota);
  const eligible = DESIGN_FREE_MODELS.filter(model => {
    const cooling = Date.parse(carried?.cooldowns?.[model.id] || '');
    // [장애 원인] 키 값, 무료 요금제 설정값, 원문 응답은 기록하지 않는다.
    const status = !approved.has(model.id) ? 'MODEL_NOT_POLICY_APPROVED'
      : model.provider === 'OPENROUTER' && accountQuota?.scope ===
        'OPENROUTER_ACCOUNT_TIER' && accountQuota.isFreeTier !== true
        ? 'ACCOUNT_NOT_FREE_TIER'
      : !trim(env[model.keyName]) ? 'KEY_MISSING'
      : model.provider === 'OPENROUTER' && !model.model.endsWith(':free') ? 'NOT_FREE_MODEL_ID'
      : Number(spent[model.provider] || 0) >= DAILY_LIMIT[model.provider] ? 'DAILY_CALL_CAP'
      : Number.isFinite(cooling) && cooling > now ? 'COOLDOWN_ACTIVE' : 'READY';
    if (Array.isArray(diagnostics))
      diagnostics.push({modelId: model.id, provider: model.provider, status});
    return status === 'READY';
  });
  const preference = config.roles?.[role] || [];
  const verified = verifiedDesignFeedback(previous, feedback, now);
  const score = model => {
    // [성공] 검증된 같은 전문 역할 + 정확한 모델에 한해서만 다음 호출에 우선권을 준다.
    if (verified?.role === role && verified.provider === model.provider &&
      verified.model === model.model) return -1;
    const order = preference.indexOf(model.id);
    // [실패] 기존 같은 분야의 잘못된 JSON/존재하지 않는 앵커 제안만 한 단계 후순위.
    const invalid = previous?.selectedRole === role &&
      Array.isArray(previous?.attempts) &&
      previous.attempts.some(row => row?.id === model.id &&
        ['REVIEW_INVALID', 'SOURCE_ANCHOR_INVALID'].includes(row?.status));
    return (order < 0 ? 999 : order) + (invalid ? 2 : 0);
  };
  // [자동 배치] 일반 작업에는 예비 20%를 가진 업체를 우선 배정한다.
  // 모든 업체가 예비 구간이어도 사용 가능한 무료 슬롯 자체는 폐쇄하지 않는다.
  eligible.sort((left, right) =>
    Number(quotaForecast[left.provider].regularWorkRemaining === 0) -
      Number(quotaForecast[right.provider].regularWorkRemaining === 0) ||
    score(left) - score(right) ||
    DESIGN_FREE_MODELS.indexOf(left) - DESIGN_FREE_MODELS.indexOf(right));
  // [복구] 세 공급자가 모두 허용되면 각 공급자의 전문 모델 1개씩 먼저, 동일 공급자의 대체 모델은 뒤에 배정.
  const firstProviders = new Set();
  const primary = [], backups = [];
  for (const model of eligible) {
    if (firstProviders.has(model.provider)) backups.push(model);
    else {firstProviders.add(model.provider); primary.push(model);}
  }
  return [...primary, ...backups];
}

function cooldownAfter(response, status, error = null) {
  const raw = trim(response?.headers?.get?.('retry-after'));
  const seconds = Number(raw);
  let delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Date.parse(raw) - Date.now();
  if (!Number.isFinite(delay) || delay < 1000) {
    const detail = trim(error?.error?.message);
    delay = status === 429 && /daily|per day|requestsperday|free.?tier quota/i.test(detail)
      ? 86400000 : status === 429 ? 60000 : status === 404 ? 86400000 :
        status === 400 ? 1800000 : 30000;
  }
  return Math.min(86400000, Math.max(1000, delay));
}
function modelAttempt(id, status, details = {}) {
  const row = {id, status, ...details};
  designRuntime.attempts.push(row);
  console.log('DESIGN_FREE_MODEL_ATTEMPT=' + id + ':' + status);
}
export async function callFreeDesignModel(model, prompt, photos, fetchImpl, env = process.env,
  kind = 'design') {
  const key = trim(env[model.keyName]);
  // [무료 구조화 출력] NVIDIA의 json_object는 필수 필드를 보장하지 않는다.
  // 기존 후보 검수와 독립 전후 검수를 구분하여 출력 스키마까지 모델에 전달한다.
  const evidence = {type: 'object', additionalProperties: false, properties: {
    screenshot: {type: 'string'}, evidence: {type: 'string'}
  }, required: ['screenshot', 'evidence']};
  const structuredSchema = kind === 'comparison'
    ? {type: 'object', additionalProperties: false, properties: {
        verdict: {type: 'string', enum: ['PASS', 'FAIL', 'UNKNOWN']},
        improvements: {type: 'array', items: evidence},
        regressions: {type: 'array', items: evidence}
      }, required: ['verdict', 'improvements', 'regressions']}
    : {type: 'object', additionalProperties: false, properties: {
        issues: {type: 'array', items: {type: 'object', additionalProperties: false,
          properties: {category: {type: 'string'},
            severity: {type: 'string', enum: ['low', 'medium', 'high']},
            screenshot: {type: 'string'}, evidence: {type: 'string'}},
          required: ['category', 'severity', 'screenshot', 'evidence']}},
        edits: {type: 'array', items: {type: 'object', additionalProperties: false,
          properties: {category: {type: 'string'}, screenshot: {type: 'string'},
            anchor: {type: 'integer'}, after: {type: 'string'}},
          required: ['category', 'screenshot', 'anchor', 'after']}}
      }, required: ['issues', 'edits']};
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
          // [네모트론 공식 API] 기본 추론이 답변 토큰을 모두 소진해 빈 content가 되는 오류 예방.
          // 유료 크레딧이나 호출 수를 늘리지 않고 직접 답변 모드를 요청한다.
          ...(model.provider === 'NVIDIA'
            ? {chat_template_kwargs: {enable_thinking: false},
                // [공식 JSON 스키마] 필수 issues/edits 또는 전후 verdict 필드를 출력에서 강제한다.
                // 독립 소스/스크린샷 검증은 기존 validateReview 로직을 그대로 사용한다.
                response_format: {type: 'json_schema', json_schema: {
                  name: kind === 'comparison' ? 'mare_visual_comparison' : 'mare_visual_design',
                  strict: true, schema: structuredSchema
                }}} : model.id === 'OPENROUTER_NEMOTRON'
              // [무료 멀티모달] 기본 추론이 max_tokens를 모두 써버려 빈 content가 되는 현상 차단.
              ? {reasoning: {enabled: false}} : {}),
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
      if ([401, 403].includes(response.status))
        return {status: 'AUTH_BLOCKED', retryAfterMs: 21600000};
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
    return text.trim() ? {status: 'OK', text} : {
      status: payload?.choices?.[0]?.finish_reason === 'length' ?
        'EMPTY_OUTPUT_TOKEN_LIMIT' : 'EMPTY_OUTPUT', retryAfterMs: 30000};
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
    sourceRevision: trim(process.env.GITHUB_SHA), status, selectedRole: designRuntime.selectedRole,
    usageWindow: designRuntime.usageWindow, cooldowns: designRuntime.cooldowns,
    quotaForecast: forecastFreeDesignQuota(designRuntime.usageWindow,
      Date.now(), designRuntime.accountQuota),
    accountQuota: designRuntime.accountQuota,
    attempts: designRuntime.attempts, ...fields};
  fs.mkdirSync(path.dirname(reportPath), {recursive: true});
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('NEMOTRON_DESIGN_STATUS=' + status);
  return report;
}

// [스튜디오 증거] 실제 캡처 이름, 원본 리비전, 이미지 바이트 형식을 모두 대조한다.
function photosFromStudio(directory = framesRoot, selectedRole = '') {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  const names = fs.readdirSync(directory).sort().filter(name =>
    /^[A-Za-z0-9_.-]+-[0-9]+\.(?:jpe?g|png)$/i.test(name) && designRoleForFrames([name]) !== 'EXCLUDED_CARD');
  const relevant = selectedRole ? names.filter(name =>
    designRoleForFrames([name]) === selectedRole) : names;
  // [교역품 실증] UI 대표 4장에 실제 교역 캡처를 우선 넣되 다른 영역도 기존 한도 내에서 검사한다.
  const cargoFrame = /(?:trade|goods|cargo|market|warehouse|inventory)/i;
  const ordered = selectedRole === 'UI' ? [...relevant].sort((a, b) =>
    Number(cargoFrame.test(b)) - Number(cargoFrame.test(a))) : relevant;
  for (const name of (ordered.length >= 2 ? ordered : names)) {
    const file = path.join(directory, name);
    if (!fs.statSync(file).isFile()) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.length < 4096 || bytes.length > 2000000) continue;
    const jpeg = bytes[0] === 255 && bytes[1] === 216;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!jpeg && !png) continue;
    found.push({name, sha256: digest(bytes), url: 'data:image/' +
      (jpeg ? 'jpeg' : 'png') + ';base64,' + bytes.toString('base64')});
    // [무료 이미지 호출] 실제 촬영 62장 중 역할별 대표 4장만 전송해 토큰·시간 낭비를 막는다.
    if (found.length === 4) break;
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
  if (/\btint\s*=/.test(before + after)) {
    const palette = /\btint\s*=\s*\{\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\}/;
    const oldColor = before.match(palette), nextColor = after.match(palette);
    if (!oldColor || !nextColor || nextColor.slice(1).some(x => Number(x) > 255))
      return false;
  }
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
// [분야별 코드 선별] 허용된 실제 Luau 시각 책임 파일만 순서를 바꾼다. 없는 파일이나 새 에셋을 만들지 않는다.
export function rankVisualSourceFiles(files, role = 'GENERAL') {
  const preferred = {
    NPC: ['Pose.luau', 'PortScene.luau', 'TownMood.client.luau',
      'FieldScene.luau', 'CommonMotion.luau', 'FieldMotion.luau'],
    WORLD: ['PortScene.luau', 'PortBuildings.luau', 'VoyageScene.luau',
      'FieldScene.luau', 'WonderScenes.luau', 'TownMood.client.luau'],
    UI: ['Game.client.luau', 'VisualLadder.client.luau', 'CardArt.luau',
      'CardGallery.luau', 'Flags.luau', 'PortScene.luau'],
    MOTION: ['CommonMotion.luau', 'FieldMotion.luau', 'Pose.luau',
      'CommonVFX.luau', 'TownMood.client.luau', 'FieldScene.luau'],
    GENERAL: ['PortScene.luau', 'Pose.luau', 'Game.client.luau',
      'VoyageScene.luau', 'CardArt.luau', 'FieldScene.luau']
  }[role] || [];
  // [사용자 범위] 카드 아트·카드 전용 Luau는 외부 AI 수정 후보에서 제외한다.
  const scoped = preferred.filter(name => !/^(?:CardArt|CardGallery|BoardingCards|CardBook|KnowledgeBattle)\.luau$/.test(name))
    .map(name => files.find(file => file.endsWith('/' + name)))
    .filter(Boolean);
  return (scoped.length >= 2 ? scoped : files.filter(file =>
    !/(?:CardArt|CardGallery|BoardingCards|CardBook|KnowledgeBattle)\.luau$/.test(file))).slice(0, 6);
}

function visualAnchors(files, role = 'GENERAL') {
  const result = [];
  const patterns = {
    NPC: /hair|scalp|skirt|belt|face|eye|head|skin|fabric|shirt|robe|collar|outfit|neck|arm|leg|lightInfluence/i,
    WORLD: /roof|house|building|dock|market|tint|port|harbor|ship|sail|wood|stone|wall|window|boat|lamp|arch|town|pier|sea/i,
    UI: /text|color|font|image|ui|background|scale|shadow|stroke|button|menu|transparency/i,
    MOTION: /motion|animation|rotation|tween|easing|walk|idle|attack|shoot|velocity|swing|pose|tilt/i,
    GENERAL: /color|material|brightness|transparency|size|position|scale/i
  };
  const focusedPattern = patterns[role] || patterns.GENERAL;
  for (const file of rankVisualSourceFiles(files, role)) {
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) ||
      !fs.statSync(target).isFile()) continue;
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    const counts = new Map();
    for (const line of lines) counts.set(line, (counts.get(line) || 0) + 1);
    const possible = lines.filter(line => cleanAnchor(line) && counts.get(line) === 1 &&
      !/(?:card|deck|duel|knowledgebattle)/i.test(line));
    const focused = possible.filter(line => focusedPattern.test(line));
    const selected = Array.from({length: 6}, (_, index) =>
      focused[Math.floor(index * Math.max(0, focused.length - 1) / 5)]).filter(Boolean);
    const others = Array.from({length: 3}, (_, index) =>
      possible[Math.floor(index * Math.max(0, possible.length - 1) / 2)]).filter(Boolean);
    for (const line of [...new Set([...selected, ...others])].slice(0, 9))
      result.push({anchor: result.length, path: file, before: line});
  }
  return result.slice(0, 54);
}

// [메인] 후보는 검증된 브랜치에서만 쓰며 모델 원문/명령은 실행하지 않는다.
export function applyVisualReplacements(files, edits, contract) {
  const output = new Map(), changes = [], pending = new Map();
  // [시각 수정 검증] 수정 전 원본의 고유 행을 모두 검사한다. 순차 적용 중 생기는
  // 값 충돌을 새 원본으로 오인하지 않고, 기존 혼합 줄바꿈도 그대로 보존한다.
  for (const edit of edits) {
    if (!contract.allowedSourceFiles.includes(edit.path) ||
      !visualEditLooksSafe(edit.before, edit.after)) throw Error('EDIT_NOT_AUTHORIZED');
    if (!Object.hasOwn(files, edit.path)) throw Error('SOURCE_FILE_NOT_FOUND:' + edit.path);
    if (!pending.has(edit.path)) pending.set(edit.path, []);
    pending.get(edit.path).push(edit);
    changes.push({path: edit.path, category: edit.category, screenshot: edit.screenshot,
      beforeSha256: digest(edit.before), afterSha256: digest(edit.after)});
  }
  if (changes.length > contract.maximumSourceEditsPerRun ||
    pending.size > contract.maximumCandidateFilesPerRun) throw Error('CANDIDATE_LIMIT');
  for (const [file, editsForFile] of pending) {
    const lines = files[file].split(/(\r?\n)/);
    const replacements = new Map();
    for (const edit of editsForFile) {
      if (replacements.has(edit.before)) throw Error('DUPLICATE_SOURCE_ANCHOR');
      const count = lines.filter((line, index) => index % 2 === 0 && line === edit.before).length;
      if (count !== 1) throw Error('SOURCE_ANCHOR_NOT_UNIQUE:' + file);
      replacements.set(edit.before, edit.after);
    }
    output.set(file, lines.map((line, index) =>
      index % 2 === 0 && replacements.has(line) ? replacements.get(line) : line).join(''));
  }
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
  // [재사용 이력] 기존 Studio 증거 브랜치에 저장된 호출 한도와 제공자 쿨다운.
  let previous = {};
  try {
    if (options.previous && fs.existsSync(path.resolve(options.previous)))
      previous = JSON.parse(fs.readFileSync(path.resolve(options.previous), 'utf8'));
  } catch {/* 손상된 이력은 권한을 주지 않고 신규 증거로만 처리한다. */}
  // [학습] 동일 Studio 브랜치의 독립 전후 비교 증거만 불러온다.
  let feedback = {};
  try {
    if (options.feedback && fs.existsSync(path.resolve(options.feedback)))
      feedback = JSON.parse(fs.readFileSync(path.resolve(options.feedback), 'utf8'));
  } catch {/* 손상되거나 없는 전후 증거는 성공으로 간주하지 않는다. */}
  const carriedHistory = mergeFreeVisualUsage(previous, feedback);
  loadPreviousDesignUsage(carriedHistory);
  const pictures = fs.existsSync(framesRoot) ? fs.readdirSync(framesRoot)
    .filter(name => /-[0-9]+\.(?:jpe?g|png)$/i.test(name)) : [];
  designRuntime.selectedRole = selectDesignFrameRole(pictures.filter(name =>
    designRoleForFrames([name]) !== 'EXCLUDED_CARD'), previous.selectedRole);
  const photos = photosFromStudio(framesRoot, designRuntime.selectedRole);
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
  const diagnostics = [];
  // [무료 고정 모델] 승인된 모델 ID·API 키·요청 상한으로 판단한다.
  // 계정 조회 실패/플래그 누락만으로 무료 모델을 제외하지 않는다.
  designRuntime.accountQuota = null;
  const freeModels = selectFreeDesignModels({
    frameNames: photos.map(photo => photo.name), policy, previous: carriedHistory, feedback,
    diagnostics, accountQuota: designRuntime.accountQuota
  });
  if (!freeModels.length)
    return record('SKIPPED_FREE_DESIGN_POOL_UNAVAILABLE', {frames: proofs,
      // [운영 증거] 불능 원인만 공개한다. API 키와 계정 상태의 원문은 출력하지 않는다.
      modelAvailability: diagnostics});
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
  const anchors = visualAnchors(contract.allowedSourceFiles, designRuntime.selectedRole);
  if (!anchors.length) return record('SKIPPED_NO_EXISTING_VISUAL_ANCHORS', {frames: proofs});
  const prompt = 'You are a visual art director for the existing Roblox sea-voyage game. ' +
    'Study the verified real Studio screenshots and improve face, hair, clothing, ships, buildings, ' +
    'materials, lighting, HUD, menus, portraits, motion, trade goods previews, shipyard, ' +
    'cargo, inventory, quests, codex, research and facility-menu composition where visually justified. ' +
    'For visible trade cargo, check whether the item is recognizable, correctly scaled, grounded without clipping, and has believable materials. Flag weak models as issues tied to the actual frame for source review. Skip cargo that is not shown. ' +
    'Exclude standalone card battles, card decks, card art, and card-specific UI from all review and edits. ' +
    'Never create primitives, placeholder models, new art assets, URLs or unlicensed assets. ' +
    'Only change visual constants on EXISTING exact source lines shown in anchors. ' +
    'Never modify gameplay, economy, save, combat, physics, networking, or script control flow. ' +
    'Return STRICT JSON: {"issues":[{"category":"one policy category","severity":"low|medium|high",' +
    '"screenshot":"existing image name","evidence":"specific visible evidence"}],' +
    '"edits":[{"category":"matching medium or high issue category","screenshot":"same photo",' +
    '"anchor":number,"after":"same referenced line with ONLY numerical visual values or existing visual enum changed"}]}. ' +
    'Prefer only ONE or TWO high-confidence edits. Each edit must reference a real numbered anchor ' +
    'from the exact list; copy the full original source line precisely, changing ONLY existing ' +
    'visual numeric literals or an existing Enum.Material/Font member. Keep all whitespace, ' +
    'punctuation, indentation, identifiers, string literals and assignment targets unchanged. ' +
    'Every edit requires a medium/high issue with matching category AND screenshot. ' +
    'No fabricated screenshots, categories, anchors, keys or trailing commas. ' +
    'If any condition is uncertain return valid JSON with empty edits. ' +
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
    if (model.provider === 'OPENROUTER' && designRuntime.accountQuota?.isFreeTier === false) continue;
    designRuntime.usageWindow.calls[model.provider] = previousCount + 1;
    // 무료 계정 검증값은 유지한다. 정확한 계정 전체 잔량은 공급자가 노출하지 않는다.
    designRuntime.usageWindow.firstCallAtByProvider ||= {};
    designRuntime.usageWindow.firstCallAtByProvider[model.provider] ||= new Date().toISOString();
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
      // [순환] 무효한 JSON/시각 수정안은 현 모델만 쿨다운하고 다른 무료 모델로 넘어간다.
      designRuntime.cooldowns[model.id] = new Date(Date.now() + 1800000).toISOString();
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
      designRuntime.cooldowns[model.id] = new Date(Date.now() + 1800000).toISOString();
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
      designRuntime.cooldowns[model.id] = new Date(Date.now() + 600000).toISOString();
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
  const beforePhotos = photosFromStudio(beforeDir, previous.selectedRole);
  const afterPhotos = photosFromStudio(framesRoot, previous.selectedRole);
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
    const result = await callFreeDesignModel(reviewer, prompt, pairs, fetchImpl,
      process.env, 'comparison');
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
      designRuntime.cooldowns[reviewer.id] = new Date(Date.now() + 1800000).toISOString();
      continue;
    }
    return record(verdict.status === 'PASS' ? 'VISUAL_BEFORE_AFTER_PASS' : 'VISUAL_BEFORE_AFTER_UNVERIFIED', {
      beforeRevision, candidateRevision, beforeFrames: baseline.map(x => ({name: x.name, sha256: x.sha256})),
      afterFrames: after.map(x => ({name: x.name, sha256: x.sha256})),
      verifiedAt: new Date().toISOString(),
      authorProvider: previous.provider, authorModel: previous.model,
      selectedRole: previous.selectedRole, reviewerProvider: reviewer.provider,
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
