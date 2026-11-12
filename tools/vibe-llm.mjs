// 바이브 두뇌의 모델 연결부: 무료 모델을 순서대로 시도하고, 한도 초과·장애면 다음 모델로 넘어간다.
// 순서: Gemini(무료 Flash 계열, 모델 이름은 목록 API 로 찾음) → GitHub Models(GITHUB_TOKEN, 추가 키 없음) → 선택: OpenRouter 무료 모델.
// 키가 없는 공급자는 건너뛴다. 키 값은 로그에 남기지 않는다.

const TIMEOUT_MS = 90000;

async function post(fetchFn, url, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try { return await fetchFn(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

export class LlmError extends Error {
  constructor(msg, { status = 0, retryable = false } = {}) { super(msg); this.status = status; this.retryable = retryable; }
}

// 무료이면서 글/코드 생성용인 Flash 계열을 최신 버전 순으로 고른다(음성·이미지·라이브·임베딩 제외).
export function pickGeminiModels(list, max = 3) {
  const ok = (list || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => String(m.name || '').replace(/^models\//, ''))
    .filter(n => /flash/i.test(n) && !/(tts|live|image|embed|transcribe|audio|translate|thinking-exp|preview-\d{2}-\d{2})/i.test(n));
  const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  // 같은 버전이면 lite 가 아닌 것을 먼저 쓴다
  return [...new Set(ok)].sort((a, b) => ver(b) - ver(a) || (/lite/i.test(a) - /lite/i.test(b))).slice(0, max);
}

export async function listGeminiModels({ key, fetchFn = fetch }) {
  const r = await post(fetchFn, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  if (!r.ok) throw new LlmError('GEMINI_LIST_HTTP_' + r.status, { status: r.status, retryable: r.status >= 500 || r.status === 429 });
  return (await r.json()).models || [];
}

export async function geminiCall({ key, model, prompt, images = [], fetchFn = fetch }) {
  const r = await post(fetchFn, `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, ...images.map(inlineData => ({ inlineData }))] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } })
  });
  if (!r.ok) throw new LlmError(`GEMINI_${model}_HTTP_${r.status}`, { status: r.status, retryable: true });
  const j = await r.json();
  const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!text.trim()) throw new LlmError(`GEMINI_${model}_EMPTY`, { retryable: true });
  return text;
}

// OpenAI 호환 형식(GitHub Models, OpenRouter 등)
export async function openaiCompatCall({ url, key, model, prompt, fetchFn = fetch, name = 'COMPAT' }) {
  const r = await post(fetchFn, url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'user', content: prompt }] })
  });
  if (!r.ok) throw new LlmError(`${name}_${model}_HTTP_${r.status}`, { status: r.status, retryable: true });
  let body; try { body = await r.json(); } catch { throw new LlmError(`${name}_${model}_NOT_JSON`, { status: r.status, retryable: true }); }
  const text = body.choices?.[0]?.message?.content || '';
  if (!String(text).trim()) throw new LlmError(`${name}_${model}_EMPTY`, { retryable: true });
  return text;
}

// providers: [{name, call: async(prompt)=>text}] 를 순서대로 시도한다. trace 는 시도마다 {name, ok, status, message}.
export async function askChain({ prompt, images = [], providers, log = () => {} }) {
  const trace = [];
  for (const p of providers) {
    if (images.length && !p.acceptsImages) continue;
    try {
      const text = await p.call(prompt, images);
      trace.push({ name: p.name, ok: true });
      log(`LLM_OK ${p.name}`);
      return { text, provider: p.name, errors: trace.filter(t => !t.ok).map(t => `${t.name}:${t.message}`), trace };
    } catch (e) {
      trace.push({ name: p.name, ok: false, status: e.status || 0, message: e.message });
      log(`LLM_FAIL ${p.name} ${e.message}`);
    }
  }
  const err = new LlmError('ALL_PROVIDERS_FAILED ' + trace.map(t => `${t.name}:${t.message}`).join(' | '));
  err.trace = trace;
  throw err;
}


// 모델 이름은 자주 바뀐다. 공급자 목록에서 지금 쓸 수 있는 모델을 골라 이름 바뀜(404)에 스스로 대응한다.
export function pickGroqModels(ids) {
  const bad = /whisper|guard|tts|orpheus|embed|safeguard|allam|prompt-guard|compound/i;
  const pref = [/gpt-oss-120b/i, /llama-3\.3-70b/i, /qwen.*(32b|coder)/i, /kimi/i, /llama-4/i, /llama-3\.1-70b/i, /gpt-oss-20b/i, /llama-3\.1-8b/i];
  const ok = (ids || []).filter(id => !bad.test(id));
  const out = [];
  for (const re of pref) for (const id of ok) if (re.test(id) && !out.includes(id)) out.push(id);
  return out.slice(0, 3);
}
export function pickOpenRouterModels(list) {
  const bad = /lyria|-vl|omni|image|audio|video|embed|1\.7b|2\.6b|preview-image/i;
  const free = (list || []).filter(m => String(m?.pricing?.prompt) === '0' && String(m?.pricing?.completion) === '0' && !bad.test(m.id));
  const pref = [/code|coder/i, /ultra|super/i, /gemma-4-31b/i, /nemotron/i, /qwen/i, /llama/i];
  const out = [];
  for (const re of pref) for (const m of free) if (re.test(m.id) && !out.includes(m.id) && m.id !== 'openrouter/free') out.push(m.id);
  if (free.some(m => m.id === 'openrouter/free')) out.push('openrouter/free');
  return out.slice(0, 3);
}
async function listIds(fetchFn, url, key) {
  const r = await fetchFn(url, { headers: key ? { authorization: 'Bearer ' + key } : {} });
  if (!r.ok) throw new Error('LIST_HTTP_' + r.status);
  return (await r.json()).data || [];
}

// 환경에서 공급자 목록을 만든다. Gemini 는 allowGemini(무료 확인 변수)가 참일 때만 쓴다.
export async function buildProviders({ env = process.env, allowGemini = true, fetchFn = fetch, log = () => {} } = {}) {
  const providers = [];
  if (allowGemini && env.GEMINI_API_KEY) {
    let models = [];
    const forced = String(env.VIBE_BRAIN_GEMINI_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
    try { models = forced.length ? forced : pickGeminiModels(await listGeminiModels({ key: env.GEMINI_API_KEY, fetchFn })); } catch (e) { log('GEMINI_MODEL_LIST_FAILED ' + e.message); }
    for (const m of models) providers.push({ name: 'gemini:' + m, acceptsImages: true, call: (prompt, images) => geminiCall({ key: env.GEMINI_API_KEY, model: m, prompt, images, fetchFn }) });
  }
  // 2순위: Mistral Codestral(코드 전용, 무료 하루 약 2000회, 전화번호 인증 필요). 키(MISTRAL_CODESTRAL_API_KEY)가 있을 때만.
  if (env.MISTRAL_CODESTRAL_API_KEY) {
    const m = env.VIBE_BRAIN_CODESTRAL_MODEL || 'codestral-latest';
    providers.push({ name: 'codestral:' + m, call: prompt => openaiCompatCall({ url: 'https://codestral.mistral.ai/v1/chat/completions', key: env.MISTRAL_CODESTRAL_API_KEY, model: m, prompt, fetchFn, name: 'CODESTRAL' }) });
  }
  // 3순위: GitHub Models(추가 키 없음, GITHUB_TOKEN. 한도가 매우 빡빡해서 마지막 보루에 가깝다)
  if (env.GITHUB_MODELS_TOKEN) {
    const m = env.VIBE_BRAIN_GITHUB_MODEL || 'openai/gpt-4.1-mini';
    providers.push({ name: 'github-models:' + m, call: prompt => openaiCompatCall({ url: 'https://models.github.ai/inference/chat/completions', key: env.GITHUB_MODELS_TOKEN, model: m, prompt, fetchFn, name: 'GHMODELS' }) });
  }
  // 4순위: Groq 무료 한도(큰 오픈 모델을 빠르게). 키(GROQ_API_KEY)가 있을 때만. 모델 이름은 바뀔 수 있어 변수로 바꿀 수 있다.
  if (env.GROQ_API_KEY) {
    let ms = String(env.VIBE_BRAIN_GROQ_MODEL || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!ms.length) { try { ms = pickGroqModels((await listIds(fetchFn, 'https://api.groq.com/openai/v1/models', env.GROQ_API_KEY)).map(m => m.id)); } catch (e) { log('GROQ_MODEL_LIST_FAILED ' + e.message); } }
    if (!ms.length) ms = ['llama-3.3-70b-versatile'];
    for (const m of ms) providers.push({ name: 'groq:' + m, call: prompt => openaiCompatCall({ url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: m, prompt, fetchFn, name: 'GROQ' }) });
  }
  // 5순위: OpenRouter 무료 Qwen3 Coder(하루 50회, 키 필요)
  if (env.OPENROUTER_API_KEY) {
    let ms = String(env.VIBE_BRAIN_OPENROUTER_MODEL || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!ms.length) { try { ms = pickOpenRouterModels(await listIds(fetchFn, 'https://openrouter.ai/api/v1/models')); } catch (e) { log('OPENROUTER_MODEL_LIST_FAILED ' + e.message); } }
    if (!ms.length) ms = ['openrouter/free'];
    for (const m of ms) providers.push({ name: 'openrouter:' + m, call: prompt => openaiCompatCall({ url: 'https://openrouter.ai/api/v1/chat/completions', key: env.OPENROUTER_API_KEY, model: m, prompt, fetchFn, name: 'OPENROUTER' }) });
  }
  return providers;
}
