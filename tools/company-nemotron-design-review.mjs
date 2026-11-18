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
// [무료 한도] 자체 안전 상한이다. 실제 계정 한도는 별도 API/응답 정보로 더 낮게 제한한다.
const DAILY_LIMIT = Object.freeze({NVIDIA: 12, GEMINI: 12, OPENROUTER: 30});
const designRuntime = {
  usageWindow: null, cooldowns: {}, providerCooldowns: {}, quotaSnapshot: null,
  attempts: [], selectedRole: ''
};
const currentDay = (now = Date.now()) => new Date(now).toISOString().slice(0,10);
// [초기화] Gemini 일일 한도: 태평양 자정 / OpenRouter: UTC 자정.
// NVIDIA 실계정 초기화는 증빙이 없어서 보수적인 UTC 내부 상한 + 응답 쿨다운을 병행한다.
export function freeQuotaDay(provider, now = Date.now()) {
  if (provider !== 'GEMINI') return currentDay(now);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Los_Angeles', year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date(now));
  const part = key => parts.find(row => row.type === key)?.value;
  return part('year')+'-'+part('month')+'-'+part('day');
}
// [계정 재충원 시각] 다음 공식 일일 창을 계산한다. 계정별로 알 수 없는 NVIDIA 한도는 추정하지 않는다.
export function freeQuotaNextReset(provider, now=Date.now()) {
  if (!['GEMINI','OPENROUTER'].includes(provider)) return null;
  const day=freeQuotaDay(provider,now);
  let lo=now,hi=now+3600000;
  for(let i=0;i<27&&freeQuotaDay(provider,hi)===day;i++){
    lo=hi;hi+=3600000;
  }
  if(freeQuotaDay(provider,hi)===day)return null;
  while(hi-lo>1000){
    const mid=lo+Math.floor((hi-lo)/2);
    if(freeQuotaDay(provider,mid)===day)lo=mid;else hi=mid;
  }
  return new Date(hi).toISOString();
}
export function freeQuotaStatus(provider, usageWindow = {}, quotaSnapshot = null, now = Date.now()) {
  const day = freeQuotaDay(provider, now), cap = DAILY_LIMIT[provider];
  if (!cap) return {provider, day, localRemaining:0, actualRemaining:null, remaining:0};
  const previousDay = usageWindow?.days?.[provider];
  const oldDay = usageWindow?.day;
  // [기존 장부] 일괄 UTC 날짜만 있던 기록은 UTC 당일에는 소진 여부를 보수적으로 유지.
  const tracked = previousDay ? previousDay === day : oldDay === currentDay(now);
  const count = tracked && Number.isInteger(usageWindow?.calls?.[provider])
    ? Math.max(0,usageWindow.calls[provider]) : 0;
  const localRemaining = Math.max(0,cap-count);
  const actualRemaining = provider === 'OPENROUTER' &&
    quotaSnapshot?.provider === provider && quotaSnapshot?.day === currentDay(now) &&
    Number.isInteger(quotaSnapshot.remaining) && quotaSnapshot.remaining >= 0
    ? quotaSnapshot.remaining : null;
  return {provider,day,localRemaining,actualRemaining,
    remaining:actualRemaining === null ? localRemaining : Math.min(localRemaining,actualRemaining),
    source:actualRemaining === null ? 'CONSERVATIVE_LOCAL_CAP' : 'VERIFIED_OPENROUTER_KEY_API'};
}
// [공식 계정 잔여량] 키 원문·결제·개인 정보 저장 금지. 조회 실패 시 자체 안전 상한만 사용한다.
export async function readOpenRouterFreeQuota(key, fetchImpl = globalThis.fetch, now = Date.now()) {
  if (!key) return null;
  try {
    const response = await fetchImpl('https://openrouter.ai/api/v1/key', {
      method:'GET',headers:{authorization:'Bearer '+key}
    });
    if (!response.ok) return null;
    const body = await response.json();
    const quota = body?.data?.free_model_daily_requests;
    const remaining = Number(quota?.remaining), limit = Number(quota?.limit);
    if (!Number.isInteger(remaining) || !Number.isInteger(limit) ||
      limit <= 0 || remaining < 0 || remaining > limit) return null;
    return {provider:'OPENROUTER',day:currentDay(now),remaining,limit,
      checkedAt:new Date(now).toISOString()};
  } catch { return null; }
}
// [추가 무료 모델 탐색] 정식 공급자 목록 중 가격 0, :free, 이미지 입력·텍스트 출력 모두 검증된 모델만.
// API 데이터는 URL·계정·설정·코드를 제안하거나 실행할 권한이 없다.
export async function discoverFreeVisionModels({fetchImpl=globalThis.fetch,env=process.env,
  policy={},limit=12}={}) {
  const config=policy?.directVisualDesign?.freeSpecialistPool;
  if (config?.liveDiscoveryEnabled!==true ||
    !trim(env.OPENROUTER_API_KEY) ||
    trim(env.OPENROUTER_DESIGN_FREE_TIER_VERIFIED)!=='YES') return [];
  try {
    const response=await fetchImpl('https://openrouter.ai/api/v1/models',{method:'GET'});
    if (!response.ok) return [];
    const body=await response.json();
    const found=[];
    for (const row of Array.isArray(body?.data)?body.data:[]) {
      const id=String(row?.id||''), input=row?.architecture?.input_modalities,
        output=row?.architecture?.output_modalities;
      if (!/^[a-z0-9][a-z0-9._/-]{2,110}:free$/.test(id) ||
        String(row?.pricing?.prompt)!=='0' || String(row?.pricing?.completion)!=='0' ||
        !Array.isArray(input) || !input.includes('image') || !input.includes('text') ||
        !Array.isArray(output) || !output.includes('text') ||
        DESIGN_FREE_MODELS.some(model=>model.model===id)) continue;
      found.push({id:'OPENROUTER_DISCOVERED_'+digest(id).slice(0,12),
        provider:'OPENROUTER',model:id,role:'VISION',
        keyName:'OPENROUTER_API_KEY',verifiedName:'OPENROUTER_DESIGN_FREE_TIER_VERIFIED',
        endpoint:'https://openrouter.ai/api/v1/chat/completions',
        discoveredFree:true});
    }
    return found.sort((a,b)=>a.model.localeCompare(b.model)).slice(0,
      Math.min(12,Math.max(0,limit)));
  } catch { return []; }
}
function loadPreviousDesignUsage(previous = {}) {
  const now=Date.now(), nowDay=currentDay(now), source=previous?.usageWindow||{};
  const calls={}, days={};
  for (const provider of Object.keys(DAILY_LIMIT)) {
    const day=freeQuotaDay(provider,now);
    const oldDay=source.days?.[provider];
    const carry=oldDay ? oldDay===day : source.day===nowDay;
    const count=Number(source.calls?.[provider]);
    calls[provider]=carry && Number.isInteger(count) && count>=0
      ? Math.min(1000,count) : 0;
    days[provider]=day;
  }
  designRuntime.usageWindow={day:nowDay,calls,days};
  designRuntime.cooldowns=Object.fromEntries(Object.entries(previous?.cooldowns||{})
    .filter(([id,until])=>(
      DESIGN_FREE_MODELS.some(model=>model.id===id) ||
      /^OPENROUTER_DISCOVERED_[a-f0-9]{12}$/.test(id)) &&
      Number.isFinite(Date.parse(until)) && Date.parse(until)>now));
  designRuntime.providerCooldowns=Object.fromEntries(Object.entries(previous?.providerCooldowns||{})
    .filter(([provider,until])=>Object.hasOwn(DAILY_LIMIT,provider) &&
      Number.isFinite(Date.parse(until)) && Date.parse(until)>now));
  designRuntime.quotaSnapshot=null;
  designRuntime.attempts=[];
}
export function designRoleForFrames(frameNames = []) {
  const names = frameNames.join(' ').toLowerCase();
  if (/(npc|face|hair|outfit|villager|resident|skin|citizen)/.test(names)) return 'NPC';
  if (/(hud|menu|gui|card|tab_|ui_|map_ui|inventory|font|interface)/.test(names)) return 'UI';
  if (/(animation|motion|idle|run|walk|attack|swing|movement)/.test(names)) return 'MOTION';
  if (/(harbor|sea|ship|port|island|landscape|world|voyage|town|lighting|field)|^(?:v[0-9]+_|cb[0-9]+(?:_|-))/.test(names)) return 'WORLD';
  return 'GENERAL';
}
// [분야별 자동 순환] 실제 캡처에 2장 이상 있는 분야만 우선 배정한다.
export function selectDesignFrameRole(frameNames = [], previousRole = '', audioEvidence = false) {
  const roles = ['NPC', 'WORLD', 'UI', 'MOTION', 'GENERAL'];
  const available = roles.filter(role =>
    frameNames.filter(name => designRoleForFrames([name]) === role).length >= 2);
  if (audioEvidence) available.push('AUDIO');
  const previous = available.indexOf(previousRole);
  return available.length ? available[(previous + 1) % available.length] : 'GENERAL';
}
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
export function mergeFreeVisualUsage(previous={},feedback={},now=Date.now()) {
  const day=currentDay(now),origin=previous?.usageWindow||{};
  const valid=/^[a-f0-9]{40}$/i.test(String(previous?.sourceRevision||'')) &&
    feedback?.beforeRevision===previous.sourceRevision &&
    /^[a-f0-9]{40}$/i.test(String(feedback?.candidateRevision||'')) &&
    feedback?.sourceRevision===feedback.candidateRevision &&
    feedback?.gameId==='mare-essentia' && feedback?.usageWindow?.day===day;
  const follow=valid?feedback.usageWindow:{};
  const calls={},days={};
  for(const provider of Object.keys(DAILY_LIMIT)){
    const pd=freeQuotaDay(provider,now);
    const isActive=(usage)=>usage?.days?.[provider]?
      usage.days[provider]===pd:usage?.day===day;
    const count=usage=>isActive(usage)&&Number.isInteger(usage?.calls?.[provider])?
      Math.max(0,Math.min(1000,usage.calls[provider])):0;
    days[provider]=pd;
    calls[provider]=Math.max(count(origin),count(follow));
  }
  const cooldowns={...previous?.cooldowns},providerCooldowns={...previous?.providerCooldowns};
  if(valid){
    for(const [id,until] of Object.entries(feedback?.cooldowns||{})){
      if(!(DESIGN_FREE_MODELS.some(model=>model.id===id)||
        /^OPENROUTER_DISCOVERED_[a-f0-9]{12}$/.test(id))) continue;
      if(Date.parse(until)>now &&
        (!Number.isFinite(Date.parse(cooldowns[id]))||Date.parse(until)>Date.parse(cooldowns[id])))
        cooldowns[id]=until;
    }
    for(const provider of Object.keys(DAILY_LIMIT)){
      const until=feedback?.providerCooldowns?.[provider];
      if(Date.parse(until)>now &&
        (!Number.isFinite(Date.parse(providerCooldowns[provider]))||
        Date.parse(until)>Date.parse(providerCooldowns[provider])))
        providerCooldowns[provider]=until;
    }
  }
  return {...previous,usageWindow:{day,calls,days},cooldowns,providerCooldowns};
}

export function selectFreeDesignModels({
  frameNames=[],role='',policy,env=process.env,previous={},feedback={},
  extraModels=[],quotaSnapshot=null,diagnostics=[],now=Date.now()
}={}) {
  const config=policy?.directVisualDesign?.freeSpecialistPool;
  if(config?.enabled!==true || config?.paidFallbackForbidden!==true ||
    config?.maxCallsPerCapture<1 || config?.maxCallsPerCapture>3 ||
    config?.accountTierProofRequired!==true)
    throw Error('FREE_SPECIALIST_POLICY_DENIED');
  const approved=new Set(config.modelIds||[]);
  const dynamic=config.liveDiscoveryEnabled===true && Number.isInteger(config.maxVerifiedFreeVisionModels)
    ? extraModels.filter(model=>model?.discoveredFree===true &&
      /^OPENROUTER_DISCOVERED_[a-f0-9]{12}$/.test(model.id) &&
      /^[a-z0-9][a-z0-9._/-]{2,110}:free$/.test(model.model) &&
      model.provider==='OPENROUTER' &&
      model.keyName==='OPENROUTER_API_KEY' &&
      model.verifiedName==='OPENROUTER_DESIGN_FREE_TIER_VERIFIED' &&
      model.endpoint==='https://openrouter.ai/api/v1/chat/completions')
      .slice(0,Math.min(12,Math.max(0,config.maxVerifiedFreeVisionModels))) : [];
  const models=[...DESIGN_FREE_MODELS.filter(model=>approved.has(model.id)),...dynamic];
  const assignedRole=role||designRoleForFrames(frameNames);
  const carried=mergeFreeVisualUsage(previous,feedback,now);
  const preference=config.roles?.[assignedRole]||[];
  const verified=verifiedDesignFeedback(previous,feedback,now),eligible=[];
  for(const model of models){
    const modelCooldown=Date.parse(carried?.cooldowns?.[model.id]||'');
    const providerCooldown=Date.parse(carried?.providerCooldowns?.[model.provider]||'');
    const remaining=freeQuotaStatus(model.provider,carried.usageWindow,quotaSnapshot,now).remaining;
    const status=!trim(env[model.keyName])?'KEY_MISSING'
      :trim(env[model.verifiedName])!=='YES'?'FREE_TIER_NOT_VERIFIED'
      :model.provider==='OPENROUTER'&&!model.model.endsWith(':free')?'NONFREE_MODEL'
      :Number.isFinite(modelCooldown)&&modelCooldown>now?'MODEL_COOLDOWN'
      :Number.isFinite(providerCooldown)&&providerCooldown>now?'PROVIDER_COOLDOWN'
      :remaining<=0?'QUOTA_EXHAUSTED':'AVAILABLE';
    if(Array.isArray(diagnostics))diagnostics.push({modelId:model.id,provider:model.provider,status});
    if(status==='AVAILABLE')eligible.push(model);
  }
  const score=model=>{
    if(verified?.role===assignedRole && verified.provider===model.provider &&
      verified.model===model.model)return -1;
    const order=preference.indexOf(model.id);
    const invalid=previous?.selectedRole===assignedRole &&
      (previous?.attempts||[]).some(row=>row?.id===model.id &&
        ['REVIEW_INVALID','SOURCE_ANCHOR_INVALID'].includes(row.status));
    return (order<0?999:order)+(invalid?2:0);
  };
  eligible.sort((a,b)=>score(a)-score(b)||
    DESIGN_FREE_MODELS.indexOf(a)-DESIGN_FREE_MODELS.indexOf(b)||
    a.model.localeCompare(b.model));
  const selected=[],fallback=[],seen=new Set();
  for(const model of eligible){
    if(seen.has(model.provider))fallback.push(model);
    else{seen.add(model.provider);selected.push(model);}
  }
  return [...selected,...fallback];
}

function cooldownAfter(response, status, error = null, provider = '') {
  const raw=trim(response?.headers?.get?.('retry-after'));
  const seconds=Number(raw);
  let delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Date.parse(raw)-Date.now();
  if(!Number.isFinite(delay)||delay<1000){
    const message=trim(error?.error?.message);
    if(status===429 && /daily|per day|requestsperday|rpd|free.?tier quota/i.test(message)){
      const reset=freeQuotaNextReset(provider);
      delay=reset ? Date.parse(reset)-Date.now()+60000 : 86400000;
    }else delay=status===429?60000:status===404?86400000:30000;
  }
  return Math.min(86400000,Math.max(1000,delay));
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
        retryAfterMs: cooldownAfter(response, response.status, failure, model.provider)};
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
    sourceRevision: trim(process.env.GITHUB_SHA), status, selectedRole: designRuntime.selectedRole,
    usageWindow: designRuntime.usageWindow, cooldowns: designRuntime.cooldowns,
    providerCooldowns: designRuntime.providerCooldowns,
    quotaSnapshot: designRuntime.quotaSnapshot,
    attempts: designRuntime.attempts, ...fields};
  fs.mkdirSync(path.dirname(reportPath), {recursive: true});
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('NEMOTRON_DESIGN_STATUS=' + status);
  return report;
}

// [스튜디오 증거] 실제 캡처 이름, 원본 리비전, 이미지 바이트 형식을 모두 대조한다.
// [실물 사진 우선순위] 93장 중 무료 AI 분야에 맞는 8장을 선택, 5회차에 촬영 각도를 순환한다.
export function selectStudioDesignPhotoNames(names, sequence = 0, limit = 8, role = '') {
  const available = new Map();
  for (const name of names) {
    if (!/^[A-Za-z0-9_.-]+-[0-9]+\.(?:jpe?g|png)$/i.test(name)) continue;
    const label = name.replace(/-[0-9]+\.(?:jpe?g|png)$/i, '');
    if (!available.has(label)) available.set(label, name);
  }
  const broad = [
    ['town_aerial_grid','town_plaza_full','town_market_facade','town_street_roofline','town_outer_district_north'],
    ['harbor_npc_face_close','harbor_npc_hair_left','harbor_npc_hair_right','harbor_npc_hair_back','harbor_npc_face_front'],
    ['harbor_npc_outfit_front','harbor_npc_outfit_side','harbor_npc_outfit_back','harbor_npc_pair_diagonal','harbor_npc_port_street_reverse'],
    ['ship_hull_detail','ship_sails_rigging','cb0_deck','v1_start','v2_event'],
    ['cargo_warehouse_close','cargo_trade_crates','cargo_warehouse_close','cargo_trade_crates','cargo_warehouse_close'],
    ['weapon_blade_close','weapon_ranged_close','harbor_motion_attack','harbor_motion_shoot','weapon_blade_close'],
    ['material_stone_roof','material_wood_dock','material_stone_roof','material_wood_dock','material_stone_roof']
  ];
  const alternates = [
    ['vfx_battle_mid_action','vfx_battle_late_action','b1_start','b2_mid','vfx_battle_mid_action'],
    ['ui_mobile_battle_2x2','ui_main_menu_icons','tab_harbor','tab_crew','field_motion_smooth_icons']
  ];
  const phase = Number.isSafeInteger(Number(sequence)) ? Math.abs(Number(sequence)) % 5 : 0;
  const roles = {
    NPC: [
      ['harbor_npc_face_close','harbor_npc_face_front','harbor_npc_face_close','harbor_npc_face_front','harbor_npc_face_close'],
      ['harbor_npc_hair_left','harbor_npc_hair_right','harbor_npc_hair_back','harbor_npc_hair_left','harbor_npc_hair_right'],
      ['harbor_npc_hair_right','harbor_npc_hair_back','harbor_npc_hair_left','harbor_npc_hair_right','harbor_npc_hair_back'],
      ['harbor_npc_face_front','harbor_npc_face_close','harbor_npc_hair_left','harbor_npc_hair_back','harbor_npc_face_front'],
      ['harbor_npc_outfit_front','harbor_npc_outfit_side','harbor_npc_outfit_back','harbor_npc_outfit_front','harbor_npc_outfit_side'],
      ['harbor_npc_outfit_side','harbor_npc_outfit_back','harbor_npc_outfit_front','harbor_npc_outfit_side','harbor_npc_outfit_back'],
      ['harbor_npc_outfit_back','harbor_npc_outfit_front','harbor_npc_outfit_side','harbor_npc_outfit_back','harbor_npc_outfit_front'],
      ['harbor_npc_pair_diagonal','harbor_npc_port_street_reverse','harbor_npc_sparring_01','harbor_npc_sparring_02','harbor_npc_sparring_03']
    ],
    WORLD: [
      ['town_aerial_grid','town_plaza_full','town_plaza_center','town_outer_district_north','town_outer_district_south'],
      ['town_market_facade','town_guild_facade','town_street_roofline','town_library_street','town_harbor_to_market'],
      ['ship_hull_detail','ship_sails_rigging','cb0_deck','v1_start','v2_event'],
      ['ship_sails_rigging','ship_hull_detail','cb1','v3_event2','v4_late'],
      ['cargo_trade_crates','cargo_warehouse_close','cargo_trade_crates','cargo_warehouse_close','cargo_trade_crates'],
      ['cargo_warehouse_close','cargo_trade_crates','cargo_warehouse_close','cargo_trade_crates','cargo_warehouse_close'],
      ['material_stone_roof','material_wood_dock','material_stone_roof','material_wood_dock','material_stone_roof'],
      ['material_wood_dock','material_stone_roof','material_wood_dock','material_stone_roof','material_wood_dock']
    ],
    UI: [
      ['ui_mobile_battle_2x2','ui_main_menu_icons','tab_harbor','tab_trade','tab_route'],
      ['ui_main_menu_icons','ui_mobile_battle_2x2','ui_battle_unified','tab_map','tab_crew'],
      ['ui_battle_unified','ui_mobile_battle_2x2','ui_main_menu_icons','tab_codex','tab_tech'],
      ['ui_trade_hall_no_hud','ui_yard_hall_no_hud','ui_hall_return_clean','tab_status','tab_quest'],
      ['tab_harbor','tab_trade','tab_route','tab_map','tab_yard'],
      ['tab_crew','tab_status','tab_quest','tab_explore','tab_battle'],
      ['tab_codex','tab_tech','tab_harbor','tab_map','tab_route'],
      ['ui_mobile_battle_2x2','ui_main_menu_icons','ui_battle_unified','ui_trade_hall_no_hud','ui_yard_hall_no_hud']
    ],
    AUDIO: [
      ['tab_harbor','tab_trade','tab_yard','tab_quest','tab_battle'],
      ['tab_trade','tab_harbor','tab_battle','tab_crew','tab_map'],
      ['tab_yard','tab_crew','tab_trade','tab_quest','tab_battle'],
      ['tab_quest','tab_battle','tab_harbor','tab_trade','tab_yard'],
      ['tab_battle','tab_harbor','tab_trade','tab_quest','tab_yard'],
      ['tab_map','tab_route','tab_crew','tab_codex','tab_tech'],
      ['ui_trade_hall_no_hud','ui_yard_hall_no_hud','ui_main_menu_icons','tab_harbor','tab_trade'],
      ['ui_mobile_battle_2x2','tab_battle','tab_trade','tab_harbor','tab_crew']
    ],
    MOTION: [
      ['weapon_blade_close','weapon_ranged_close','weapon_blade_close','weapon_ranged_close','weapon_blade_close'],
      ['weapon_ranged_close','weapon_blade_close','weapon_ranged_close','weapon_blade_close','weapon_ranged_close'],
      ['vfx_battle_mid_action','vfx_battle_late_action','vfx_battle_mid_action','vfx_battle_late_action','vfx_battle_mid_action'],
      ['vfx_battle_late_action','vfx_battle_mid_action','vfx_battle_late_action','vfx_battle_mid_action','vfx_battle_late_action'],
      ['harbor_motion_attack','harbor_motion_shoot','harbor_motion_reload','harbor_motion_guard','harbor_motion_run'],
      ['harbor_motion_shoot','harbor_motion_attack','harbor_motion_hurt','harbor_motion_cheer','harbor_motion_talk'],
      ['harbor_motion_walk','harbor_motion_run','harbor_motion_idle','harbor_motion_guard','harbor_motion_hurt'],
      ['field_motion_smooth_icons','field_actor_after_motion','harbor_motion_idle','harbor_motion_run','harbor_motion_walk']
    ]
  };
  const groups = roles[role] || [...broad, alternates[phase % 2]];
  const selected = [], used = new Set();
  for (const group of groups) {
    for (let offset = 0; offset < group.length; offset++) {
      const chosen = available.get(group[(phase + offset) % group.length]);
      if (!chosen || used.has(chosen)) continue;
      used.add(chosen);
      selected.push(chosen);
      break;
    }
    if (selected.length >= limit) return selected;
  }
  for (const name of [...available.values()].sort()) {
    if (used.has(name) || (role && role !== 'AUDIO' && designRoleForFrames([name]) !== role)) continue;
    used.add(name);
    selected.push(name);
    if (selected.length >= limit) break;
  }
  return selected;
}

function photosFromStudio(directory = framesRoot, selectedRole = '', pinnedNames = null) {
  if (!fs.existsSync(directory)) return [];
  const names = fs.readdirSync(directory).sort().filter(name =>
    /^[A-Za-z0-9_.-]+-[0-9]+\.(?:jpe?g|png)$/i.test(name));
  const relevant = selectedRole ? names.filter(name =>
    designRoleForFrames([name]) === selectedRole) : names;
  // [실물 전후] 후보를 만든 정확한 8장만 다시 비교한다. 다른 회차 사진을 성공 근거로 쓰지 않는다.
  const chosen = Array.isArray(pinnedNames) && pinnedNames.length
    ? pinnedNames.filter(name => names.includes(name)).slice(0, 8)
    : selectStudioDesignPhotoNames(relevant.length >= 2 ? relevant : names,
      process.env.GITHUB_RUN_ID, 8, selectedRole);
  const found = [];
  for (const name of chosen) {
    const file = path.join(directory, name);
    if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.length < 4096 || bytes.length > 2000000) continue;
    const jpeg = bytes[0] === 255 && bytes[1] === 216;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!jpeg && !png) continue;
    found.push({name, sha256: digest(bytes), url: 'data:image/' +
      (jpeg ? 'jpeg' : 'png') + ';base64,' + bytes.toString('base64')});
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

// [기존 자산 목록] 이미 등록된 음원·아이콘·교역품·재질만 AI에 제공한다.
export function mareDesignAssetInventory(repositoryRoot = root) {
  const fromGame = name => path.join(repositoryRoot, 'roblox-games/mare-essentia/', name);
  const registry = JSON.parse(fs.readFileSync(fromGame('assets-registered.json'), 'utf8')).assets;
  const tracks = JSON.parse(fs.readFileSync(fromGame('audio/manifest.json'), 'utf8')).tracks;
  const uploads = JSON.parse(fs.readFileSync(fromGame('audio/uploaded.json'), 'utf8'));
  const luau = fs.readFileSync(fromGame('src/ReplicatedStorage/Shared/AudioIds.luau'), 'utf8');
  const ids = new Map([...luau.matchAll(/^\s*([a-z0-9_]+)\s*=\s*"rbxassetid:\/\/(\d+)"/gm)]
    .map(match => [match[1],match[2]]));
  const registered = tracks.filter(track => {
    const asset = uploads[track.name];
    return asset?.granted === true && ids.get(track.name) === String(asset.assetId) &&
      /^[0-9]+$/.test(String(asset.assetId));
  });
  const assets = Object.entries(registry);
  return {
    authority: 'EXISTING_ROBLOX_REGISTRY_AND_LICENSE',
    models: assets.filter(([,v]) => v.assetType === 'Model').length,
    images: assets.filter(([,v]) => v.assetType === 'Image').length,
    icons: assets.filter(([k,v]) => k.startsWith('Menu/') && v.assetType === 'Image').length,
    tradeGoods: assets.filter(([k]) => k.startsWith('Goods/')).length,
    materialTextures: assets.filter(([k,v]) => k.startsWith('Materials/') && v.assetType === 'Image').length,
    registeredAudio: registered.length,
    listedAudio: tracks.length,
    approvedCues: registered.map(x => x.name).filter(name => /^sfx_[a-z0-9_]+$/.test(name)).sort(),
    missingAudio: tracks.filter(t => !registered.some(x => x.name === t.name))
      .map(t => t.name).slice(0,20),
    inventedIdsForbidden: true, registrationAndStudioQaRequired: true
  };
}

// [기존 Sfx] 한 줄에 등록된 효과음 이름만 교체 가능. 파일·시설·음량·딜레이 불변.
export function audioCueEditLooksSafe(before, after, sourcePath, registeredCues) {
  if (sourcePath !== 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Sfx.luau' ||
    typeof before !== 'string' || typeof after !== 'string' || before === after ||
    Buffer.byteLength(after) > 320 || /[\r\n;]/.test(before+after)) return false;
  const heading = /^\s*(?:trade|yard|harbor|scholar|board|quest|route|cards|gwent|status|crew|recruit|tech|codex|map|explore|battle|war)\s*=\s*\{\s*\{/;
  if (!heading.test(before) || !heading.test(after)) return false;
  const names = row => [...row.matchAll(/"(sfx_[a-z0-9_]+)"/g)].map(x=>x[1]);
  const old = names(before), next = names(after);
  if (!old.length || old.length !== next.length ||
    !next.some((name,i) => name !== old[i]) || !next.every(name => registeredCues.includes(name)))
    return false;
  return before.replace(/"sfx_[a-z0-9_]+"/g, '"#SFX#"') ===
    after.replace(/"sfx_[a-z0-9_]+"/g, '"#SFX#"');
}

// [사운드 실제 증거] 로딩 결과와 등록 ID만 확인. 녹음 없는 음질·화풍 PASS는 금지.
export function studioAudioEvidence(report) {
  const audit = (report?.log || []).filter(row =>
    typeof row?.out === 'string' && row.out.includes('STUDIO_AUDIO_AUDIT ')).at(-1)?.out || '';
  const match = /STUDIO_AUDIO_AUDIT registered=(\d+) active=(\d+) last_loaded=([a-z0-9_]+|none) last_failed=([a-z0-9_]+|none)/.exec(audit);
  return match && Number(match[1]) > 0 && match[3] !== 'none' && match[4] === 'none'
    ? {registered: +match[1], active: +match[2], lastLoaded: match[3], validated: true}
    : {validated: false};
}

// [검사] 원본 소스 구조와 문맥을 유지하는 시각 상수·표현 변경만 허용한다.
// 게임플레이 수치·제어 흐름·문자열/에셋 ID·실행문 신규 삽입은 막는다.
export function visualEditLooksSafe(before, after, category = '', sourcePath = '') {
  if (category === 'sound-presentation') {
    try { return audioCueEditLooksSafe(before, after, sourcePath,
      mareDesignAssetInventory().approvedCues); } catch { return false; }
  }
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
  // [건축물 배치] 기존 PortScene 시설 좌표만 제한적으로 수정한다.
  // UI·경제·저장·지형 충돌 판정과 분리하고 원본 시설의 이름/기능/크기는 그대로 둔다.
  const location = /\bpos\s*=\s*Vector3\.new\(\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*\)/;
  const oldPlacement = before.match(location), newPlacement = after.match(location);
  if (oldPlacement || newPlacement) {
    if (!oldPlacement || !newPlacement) return false;
    // [기존 시설 보호] 건축물 폭·층수·경제 데이터는 색채·위치 편집에 섞여 바뀔 수 없다.
    if (/^\s*\{\s*name\s*=\s*"/.test(before) && /\btab\s*=\s*"/.test(before)) {
      const rgb = /Color3\.fromRGB\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/;
      const unchanged = line => line.replace(location, '#POSITION#').replace(rgb, '#COLOR#');
      if (unchanged(before) !== unchanged(after)) return false;
    }
    if (oldPlacement[0] !== newPlacement[0]) {
      if (category !== 'architecture' ||
        sourcePath !== 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau' ||
        !/^\s*\{\s*name\s*=\s*"/.test(before) ||
        !/\btab\s*=\s*"/.test(before) || !/\beconomy\s*=\s*"/.test(before) ||
        before.replace(oldPlacement[0], '#POSITION#') !==
        after.replace(newPlacement[0], '#POSITION#')) return false;
      const oldXYZ = oldPlacement.slice(1).map(Number), nextXYZ = newPlacement.slice(1).map(Number);
      if (oldXYZ.some(n => !Number.isFinite(n)) || nextXYZ.some(n => !Number.isFinite(n)) ||
        Math.abs(nextXYZ[0] - oldXYZ[0]) > 5 || nextXYZ[1] !== oldXYZ[1] ||
        Math.abs(nextXYZ[2] - oldXYZ[2]) > 5 ||
        Math.sign(nextXYZ[2]) !== Math.sign(oldXYZ[2]) || Math.abs(nextXYZ[2]) < 32)
        return false;
    }
  }
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
      !visualEditLooksSafe(before, row.after, row.category, sourcePath))
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

function cleanAnchor(line, file = '') {
  if (file.endsWith('/Sfx.luau'))
    return line.length <= 320 &&
      /^\s*(?:trade|yard|harbor|scholar|board|quest|route|cards|gwent|status|crew|recruit|tech|codex|map|explore|battle|war)\s*=\s*\{\s*\{/.test(line) &&
      !/--|[;]/.test(line);
  return line.length <= 260 && visualCode.test(line) && !protectedCode.test(line) &&
    !/--|[;]|https?:\/\/|(?:api[_-]?key|secret|token|password)/i.test(line) &&
    !line.trimStart().startsWith('--');
}
function visualAnchors(files, role = '') {
  const result = [];
  const owners = {
    NPC: ['Pose.luau','PortScene.luau','CommonMotion.luau','FieldMotion.luau'],
    WORLD: ['PortScene.luau','PortBuildings.luau','VoyageScene.luau','FieldScene.luau','TownMood.client.luau'],
    UI: ['Game.client.luau','CardGallery.luau','Flags.luau','CardArt.luau','VisualLadder.client.luau'],
    MOTION: ['CommonMotion.luau','FieldMotion.luau','CommonVFX.luau','FieldScene.luau','Pose.luau'],
    AUDIO: ['Sfx.luau']
  };
  for (const file of files) {
    if (owners[role] && !owners[role].some(name => file.endsWith('/'+name))) continue;
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) ||
      !fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()) continue;
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    const counts = new Map();
    for (const line of lines) counts.set(line, (counts.get(line) || 0) + 1);
    const possible = lines.filter(line => cleanAnchor(line, file) && counts.get(line) === 1);
    // 얼굴과 머리/옷을 먼저, 나머지 건물·선박·UI는 파일 전체 구간을 고르게 표본화한다.
    const focused = file.endsWith('/Pose.luau')
      ? possible.filter(line => /LightInfluence|scalp|skirt|belt|hair|q\.Size|Fabric/i.test(line)).slice(0, 4)
      : file.endsWith('/PortScene.luau')
        ? possible.filter(line => /^\s*\{\s*name\s*=\s*"/.test(line) &&
          /\bpos\s*=\s*Vector3\.new\(/.test(line) && /\bcolor\s*=\s*Color3\.fromRGB\(/.test(line)).slice(0, 7)
        : [];
    const sampled = Array.from({length: 8}, (_, index) =>
      possible[Math.floor(index * Math.max(0, possible.length - 1) / 7)]).filter(Boolean);
    for (const line of [...new Set([...focused, ...sampled])].slice(0, file.endsWith('/PortScene.luau') ? 13 : 7))
      result.push({anchor: result.length, path: file, before: line});
  }
  return result.slice(0, 112);
}

// [메인] 후보는 검증된 브랜치에서만 쓰며 모델 원문/명령은 실행하지 않는다.
export function applyVisualReplacements(files, edits, contract) {
  const output = new Map(), changes = [];
  for (const edit of edits) {
    if (!contract.allowedSourceFiles.includes(edit.path) ||
      !visualEditLooksSafe(edit.before, edit.after, edit.category, edit.path)) throw Error('EDIT_NOT_AUTHORIZED');
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
  const coverage = contract?.studioEvidenceSelection;
  const townLayout = contract?.townLayoutEdit;
  if (!coverage || coverage.expectedCoverageFrames !== 93 ||
    coverage.shipCargoWeaponVfxMaterialFrames !== 10 ||
    coverage.materialAuditMarker !== 'STUDIO_MATERIAL_AUDIT' ||
    coverage.domainRotation?.length !== 8 ||
    coverage.maxImagesPerFreeCall !== 8 || coverage.rotationPhases !== 5 ||
    !coverage.sourcesMustBeExactStudioCaptureAndCodeRevision ||
    !townLayout?.enabled || townLayout.sourceFile !==
      'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau' ||
    townLayout.maximumHorizontalShiftStuds !== 5 || townLayout.verticalShiftStuds !== 0 ||
    !townLayout.sameStreetSideRequired ||
    townLayout.minimumPlazaDistanceFromCenterlineStuds !== 32 ||
    !townLayout.sizeFloorsEconomyRoutesAndSaveUnchanged ||
    !townLayout.exactSourceAnchorAndIndependentStudioBeforeAfterQaRequired ||
    policy.directVisualDesign.designQualityStandards?.style !==
      'HISTORICALLY_GROUNDED_SEMI_REALISTIC_AGE_OF_SAIL' ||
    !policy.directVisualDesign.designQualityStandards.preserveImportedPbrTextureUvAndSource ||
    !policy.directVisualDesign.designQualityStandards.noRuntimeSurfaceAppearancePropertyChanges ||
    !policy.directVisualDesign.designQualityStandards.externalGameExamplesAreStyleReferencesOnly ||
    !policy.directVisualDesign.designQualityStandards.noAutomaticMainMergeWithoutCanonicalCodeAndFreshStudioGate)
    throw Error('CANONICAL_STUDIO_DESIGN_POLICY_DENIED');
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
  // [증거] 기존 Studio 원본 보고서에서 실제 소리 로딩을 확인한 경우에만 오디오 역할을 허용.
  let liveReport = null;
  try { liveReport = JSON.parse(fs.readFileSync(path.join(framesRoot,'report.json'),'utf8').replace(/^\uFEFF/,'')); }
  catch {/* 없는 화면/사운드를 만들지 않는다 */}
  const audioEvidence = studioAudioEvidence(liveReport);
  designRuntime.selectedRole = selectDesignFrameRole(pictures, previous.selectedRole, audioEvidence.validated);
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
  // [자동 섭외] 공식 API의 무료 가격·이미지 능력을 확인한 모델만 합류한다.
  const hasFreeRouter = trim(process.env.OPENROUTER_DESIGN_FREE_TIER_VERIFIED)==='YES' &&
    trim(process.env.OPENROUTER_API_KEY);
  const [accountQuota,discovered] = hasFreeRouter ? await Promise.all([
    readOpenRouterFreeQuota(process.env.OPENROUTER_API_KEY,fetchImpl),
    discoverFreeVisionModels({fetchImpl,policy})
  ]) : [null,[]];
  designRuntime.quotaSnapshot = accountQuota;
  const diagnostics = [];
  const freeModels = selectFreeDesignModels({
    frameNames:photos.map(photo=>photo.name),role:designRuntime.selectedRole,
    policy,previous:carriedHistory,feedback,extraModels:discovered,
    quotaSnapshot:accountQuota,diagnostics
  });
  console.log('DESIGN_FREE_QUOTA='+JSON.stringify(Object.keys(DAILY_LIMIT).map(provider=>
    freeQuotaStatus(provider,designRuntime.usageWindow,accountQuota))));
  console.log('DESIGN_FREE_RECRUITED='+discovered.length);
  if (!freeModels.length)
    return record('SKIPPED_FREE_DESIGN_POOL_UNAVAILABLE', {frames: proofs,modelAvailability:diagnostics});
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
  // [Studio PBR] 스튜디오가 측정한 실제 물체/맵 개수는 참고 증거일 뿐 PASS 증명이 아니다.
  const materialAudit = (studio.log || []).filter(row => typeof row?.out === 'string' &&
    row.out.includes('STUDIO_MATERIAL_AUDIT ')).slice(-1)[0]?.out?.slice(0, 700) || '';
  const inventory = mareDesignAssetInventory();
  const prompt = 'You are a visual art director for the existing Roblox sea-voyage game. ' +
    'Study the verified real Studio screenshots and improve face, hair, clothing, cargo goods, ship rigging, ' +
    'sails, hull, period buildings, materials, lighting, weapons, hit VFX, HUD, portraits and composition. ' +
    'Art direction: historically grounded semi-realistic Age of Sail; distinct cloth/leather/stone/wood/metal, ' +
    'no toy gloss, avoid flat muddy colors or bright white imported models. Review real game aesthetic only, ' +
    'do not copy copyrighted art, designs or asset IDs from other games. ' +
    'PBR: prefer preserved original ColorMap/NormalMap/RoughnessMap/MetalnessMap/UV and mesh texture; ' +
    'never fabricate maps, alter their IDs or mutate SurfaceAppearance during runtime. ' +
    'Use original region/climate/year/role materials; preserve registered CC0 provenance and mobile readability. ' +
    'Never create primitives, placeholder models, new art assets, URLs or unlicensed assets. ' +
    'Only change visual constants on EXISTING exact source lines shown in anchors. ' +
    'For AUDIO role ONLY: select another ALREADY registered sound key from the verified cue list, ' +
    'changing one existing FACILITY_CUES line in Sfx.luau without modifying volume, delay or identifiers. ' +
    'Studio audio audit verifies loading, NOT listening quality; never assert acoustic improvement from images. ' +
    'Never create or directly upload audio, fonts, icons, meshes or rig joints without canonical approved source. ' +
    'Town layout may adjust ONLY EXISTING named facility pos Vector3 coordinates on the existing PortScene line, ' +
    'category architecture, max 5 studs per horizontal axis, unchanged height, no center plaza or route obstruction. ' +
    'Inspect plaza, streets, houses, market, library and rooftop composition from the actual captured town shots. ' +
    'Never modify gameplay, economy, save, combat, physics, networking, or script control flow. ' +
    'Return STRICT JSON: {"issues":[{"category":"one policy category","severity":"low|medium|high",' +
    '"screenshot":"existing image name","evidence":"specific visible evidence"}],' +
    '"edits":[{"category":"matching medium or high issue category","screenshot":"same photo",' +
    '"anchor":number,"after":"same referenced line; AUDIO only approved registered cue name, otherwise only numerical visual values or existing visual enum"}]}. ' +
    'At most 10 edits across 4 files. Never add/remove functions, statements, assets, text, ' +
    'commands, identifiers, property targets or line breaks. Empty edits when uncertain. ' +
    'Policies: ' + JSON.stringify({categories: contract.visualCategories,
      maxReplacementBytes: contract.maximumReplacementBytes}) + '. ' +
    'Real Studio material audit (not a quality PASS): ' + materialAudit + '. ' +
    'Real registered asset inventory (not a creation license): ' +
      JSON.stringify({...inventory, approvedCues: inventory.approvedCues.slice(0,45)}) + '. ' +
    'Real Studio audio load audit (not a listening PASS): ' +
      JSON.stringify(audioEvidence) + '. ' +
    'Screenshots: ' + JSON.stringify(photos.map(x => x.name)) + '. ' +
    'Existing verified source anchors: ' + JSON.stringify(anchors);
  // [메인] 가장 적합한 무료 전문가부터 시도하고 한도/출력 오류면 다른 무료 전문가에게 넘긴다.
  // 유료/안전 거부가 발견되면 중단. 동일 모델에 재시도 폭증·유료 전환 없음.
  const routeLimit = policy.directVisualDesign.freeSpecialistPool.maxCallsPerCapture;
  let attempted = 0;
  for (const model of freeModels) {
    if (attempted >= routeLimit) break;
    if (freeQuotaStatus(model.provider,designRuntime.usageWindow,
      designRuntime.quotaSnapshot).remaining <= 0 ||
      Date.parse(designRuntime.providerCooldowns[model.provider]||'')>Date.now()) continue;
    attempted++;
    designRuntime.usageWindow.calls[model.provider] =
      (designRuntime.usageWindow.calls[model.provider] || 0) + 1;
    if (model.provider==='OPENROUTER' && designRuntime.quotaSnapshot)
      designRuntime.quotaSnapshot.remaining=Math.max(0,designRuntime.quotaSnapshot.remaining-1);
    const result = await callFreeDesignModel(model, prompt, photos, fetchImpl);
    modelAttempt(model.id, result.status, {provider: model.provider, model: model.model});
    if (['BILLING_BLOCKED', 'NONZERO_COST_BLOCKED', 'CONTENT_POLICY_BLOCKED'].includes(result.status))
      return record('BLOCKED_FREE_POLICY_OR_CONTENT', {frames: proofs, lastModel: model.id});
    if (result.status !== 'OK') {
      if (result.retryAfterMs)
        designRuntime.cooldowns[model.id] = new Date(Date.now() + result.retryAfterMs).toISOString();
      if (result.status==='HTTP_429')
        designRuntime.providerCooldowns[model.provider] =
          new Date(Date.now() + (result.retryAfterMs||60000)).toISOString();
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
      selectedRole: designRuntime.selectedRole,
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
  const pinnedNames = (previous?.frames || []).map(row=>row?.name)
    .filter(name=>typeof name==='string').slice(0,8);
  if (pinnedNames.length < 2 || new Set(pinnedNames).size !== pinnedNames.length)
    return unavailable('BLOCKED_VISUAL_BASELINE_FRAME_SELECTION');
  const beforePhotos = photosFromStudio(beforeDir, previous.selectedRole, pinnedNames);
  const afterPhotos = photosFromStudio(framesRoot, previous.selectedRole, pinnedNames);
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
  if (previous?.edits?.some(edit=>edit.category==='sound-presentation'))
    return unavailable('BLOCKED_AUDIO_ARTISTIC_QUALITY_NOT_PROVABLE_FROM_SCREENSHOTS');
  loadPreviousDesignUsage(previous);
  // [독립 검증] 후보 작성과 동일한 무료 모델 공동 사용량·계정 잔여량을 재확인한다.
  const hasFreeRouter=trim(process.env.OPENROUTER_DESIGN_FREE_TIER_VERIFIED)==='YES' &&
    trim(process.env.OPENROUTER_API_KEY);
  const [accountQuota,discovered]=hasFreeRouter?await Promise.all([
    readOpenRouterFreeQuota(process.env.OPENROUTER_API_KEY,fetchImpl),
    discoverFreeVisionModels({fetchImpl,policy})
  ]):[null,[]];
  designRuntime.quotaSnapshot=accountQuota;
  const allModels=selectFreeDesignModels({frameNames:names,role:previous.selectedRole,
    policy,previous,extraModels:discovered,quotaSnapshot:accountQuota});
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
  let reviewCalls=0;
  for (const reviewer of reviewers) {
    if (reviewCalls>=policy.directVisualDesign.freeSpecialistPool.maxCallsPerCapture) break;
    if (freeQuotaStatus(reviewer.provider,designRuntime.usageWindow,
      designRuntime.quotaSnapshot).remaining<=0 ||
      Date.parse(designRuntime.providerCooldowns[reviewer.provider]||'')>Date.now()) continue;
    reviewCalls++;
    designRuntime.usageWindow.calls[reviewer.provider] =
      (designRuntime.usageWindow.calls[reviewer.provider]||0)+1;
    if (reviewer.provider==='OPENROUTER'&&designRuntime.quotaSnapshot)
      designRuntime.quotaSnapshot.remaining=Math.max(0,designRuntime.quotaSnapshot.remaining-1);
    const result = await callFreeDesignModel(reviewer, prompt, pairs, fetchImpl);
    modelAttempt(reviewer.id, result.status);
    if (['CONTENT_POLICY_BLOCKED', 'BILLING_BLOCKED', 'NONZERO_COST_BLOCKED'].includes(result.status))
      return unavailable('BLOCKED_VISUAL_REVIEW_FREE_POLICY');
    if (result.status !== 'OK') {
      if (result.retryAfterMs) designRuntime.cooldowns[reviewer.id] =
        new Date(Date.now() + result.retryAfterMs).toISOString();
      if (result.status==='HTTP_429')
        designRuntime.providerCooldowns[reviewer.provider] =
          new Date(Date.now()+(result.retryAfterMs||60000)).toISOString();
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
