const AI_JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function aiJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: AI_JSON_HEADERS });
}

function clipText(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function handleAiStatus(env) {
  return aiJson({
    ok: true,
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
    model: clipText(env.GEMINI_MODEL || 'gemini-2.5-flash-lite', 80),
    vibeCodeGeneration: true
  });
}

async function callGeminiJson({ env, instruction, prompt, maxOutputTokens = 220, temperature = 0.35, timeoutMs = 8000 }) {
  if (!env.GEMINI_API_KEY) return { response: aiJson({ error: 'gemini_not_configured' }, 503) };
  const model = clipText(env.GEMINI_MODEL || 'gemini-2.5-flash-lite', 80);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens, responseMimeType: 'application/json' }
        })
      }
    );
    const raw = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return { response: aiJson({ error: 'gemini_upstream_error', status: upstream.status }, upstream.status >= 500 ? 502 : 429) };
    const text = raw?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    let result = null;
    try { result = JSON.parse(text); } catch { return { response: aiJson({ error: 'invalid_model_json' }, 502) }; }
    return { result, model };
  } catch (error) {
    return { response: aiJson({ error: error?.name === 'AbortError' ? 'gemini_timeout' : 'gemini_request_failed' }, 502) };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleGemini(request, env) {
  if (request.method !== 'POST') return aiJson({ error: 'method_not_allowed' }, 405);
  let body = {};
  try { body = await request.json(); } catch { return aiJson({ error: 'invalid_json' }, 400); }
  const purpose = clipText(body.purpose || 'dialogue', 40);
  const system = clipText(body.system || '', 1600);
  const context = clipText(body.context || '', 5000);
  const userText = clipText(body.user_text || '', 2000);
  if (!context && !userText) return aiJson({ error: 'empty_prompt' }, 400);
  const instruction = [
    'You are a helper AI inside a video game.',
    'Never invent or change hidden game rules, stats, rewards, inventory, save data, or authoritative combat results.',
    'Return JSON only.',
    purpose === 'strategy'
      ? '{"action":"short_action_id","reason":"short reason","speech":"optional short line"} 형식의 JSON만 반환하세요.'
      : '{"speech":"short natural NPC line","mood":"neutral|happy|angry|afraid|sad|excited","intent":"talk|warn|help|refuse|trade|quest"} 형식의 JSON만 반환하세요.',
    system
  ].filter(Boolean).join('\n');
  const prompt = [context ? `GAME CONTEXT:\n${context}` : '', userText ? `PLAYER INPUT:\n${userText}` : ''].filter(Boolean).join('\n\n');
  const called = await callGeminiJson({ env, instruction, prompt, maxOutputTokens: 220, temperature: purpose === 'strategy' ? 0.35 : 0.8 });
  if (called.response) return called.response;
  return aiJson({ ok: true, purpose, model: called.model, result: called.result });
}

async function handleVibeCode(request, env) {
  if (request.method !== 'POST') return aiJson({ error: 'method_not_allowed' }, 405);
  let body = {};
  try { body = await request.json(); } catch { return aiJson({ error: 'invalid_json' }, 400); }
  const userRequest = clipText(body.request, 2400);
  const target = clipText(body.target || 'auto', 20);
  const brief = body.editBrief && typeof body.editBrief === 'object' ? body.editBrief : {};
  const incomingFiles = Array.isArray(body.files) ? body.files : [];
  const files = incomingFiles.slice(0, 8).map(file => ({ path: clipText(file?.path, 260), content: String(file?.content ?? '').slice(0, 24000) })).filter(file => file.path && file.content);
  if (!userRequest || !files.length) return aiJson({ error: 'request_and_files_required' }, 400);
  if (files.reduce((sum, file) => sum + file.content.length, 0) > 90000) return aiJson({ error: 'source_too_large' }, 413);

  const instruction = [
    'You are the code-editing engine of Vibe Maker, a game-development agent.',
    'Return JSON only in exactly this shape: {"files":[{"path":"exact input path","content":"complete replacement file"}],"summary":"short Korean summary"}.',
    'Only return files that actually need changes. Every returned content value must be the COMPLETE replacement file, never a patch, wrapper, override, monkey patch, pseudo-code, ellipsis, or partial snippet.',
    'Modify the original responsible function/file directly. Do not create new files.',
    'Preserve existing HP, attack/damage, waves, rewards, drop rates, save keys/structures, progress, rules and gameplay flow unless the user request explicitly asks to change that exact protected category.',
    'A generic request such as graphics improvement, quality improvement, gameplay improvement, fun improvement, or balance improvement does NOT authorize protected-value changes.',
    'If save structure/key changes are explicitly requested, preserve compatibility and include migration in the existing responsible file.',
    'Preserve syntax and existing public interfaces. Prefer mobile-first UI and existing architecture.',
    `TARGET: ${target}`,
    `EDIT BRIEF: ${JSON.stringify(brief).slice(0, 12000)}`
  ].join('\n');
  const prompt = `USER REQUEST:\n${userRequest}\n\nCURRENT RESPONSIBLE FILES:\n${files.map(file => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`;
  const called = await callGeminiJson({ env, instruction, prompt, maxOutputTokens: 8192, temperature: 0.15, timeoutMs: 30000 });
  if (called.response) return called.response;
  const result = called.result;
  if (!result || !Array.isArray(result.files)) return aiJson({ error: 'invalid_vibe_result' }, 502);
  const allowed = new Set(files.map(file => file.path));
  const output = [];
  for (const file of result.files.slice(0, files.length)) {
    const path = clipText(file?.path, 260);
    const content = String(file?.content ?? '');
    if (!allowed.has(path) || !content || content.includes('...')) return aiJson({ error: 'unsafe_vibe_result' }, 502);
    output.push({ path, content });
  }
  if (!output.length) return aiJson({ error: 'empty_vibe_change' }, 422);
  return aiJson({ ok: true, model: called.model, files: output, summary: clipText(result.summary, 1000) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ai/status') return handleAiStatus(env);
    if (url.pathname === '/api/ai/gemini') return handleGemini(request, env);
    if (url.pathname === '/api/ai/vibe-code') return handleVibeCode(request, env);

    if (url.pathname === '/web-games/egg-heist/' || url.pathname === '/web-games/egg-heist/index.html') {
      return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    }

    const response = await env.ASSETS.fetch(request);
    if (!['/', '/index.html'].includes(url.pathname)) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();
    html = html.replace("image:'assets/insect-main-v3.webp',link:'/web-games/monster-adventure/'", "image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'");
    html = html.replace("image:'assets/monster-adventure-card.webp',link:'/web-games/monster-adventure/'", "image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'");
    html = html.replace(
      "{title:'몬스터 어드벤처',logo:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22180%22%3E%3Ctext x=%228%22 y=%2278%22 font-size=%2264%22 font-family=%22sans-serif%22 font-weight=%22900%22 fill=%22%23fff4a8%22 stroke=%22%232b5ca8%22 stroke-width=%227%22 paint-order=%22stroke%22%3E몬스터%3C/text%3E%3Ctext x=%2212%22 y=%22146%22 font-size=%2258%22 font-family=%22sans-serif%22 font-weight=%22900%22 fill=%22white%22 stroke=%22%233a72c0%22 stroke-width=%226%22 paint-order=%22stroke%22%3E어드벤처%3C/text%3E%3C/svg%3E',stars:2,subtitle:'잡고, 키우고, 함께 모험!',tags:['몬스터','포획','턴제전투','성장'],image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'}]",
      "{title:'몬스터 어드벤처',logo:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22180%22%3E%3Ctext x=%228%22 y=%2278%22 font-size=%2264%22 font-family=%22sans-serif%22 font-weight=%22900%22 fill=%22%23fff4a8%22 stroke=%22%232b5ca8%22 stroke-width=%227%22 paint-order=%22stroke%22%3E몬스터%3C/text%3E%3Ctext x=%2212%22 y=%22146%22 font-size=%2258%22 font-family=%22sans-serif%22 font-weight=%22900%22 fill=%22white%22 stroke=%22%233a72c0%22 stroke-width=%226%22 paint-order=%22stroke%22%3E어드벤처%3C/text%3E%3C/svg%3E',stars:2,subtitle:'잡고, 키우고, 함께 모험!',tags:['몬스터','포획','턴제전투','성장'],image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'},{title:'바이브 실험실',logo:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22180%22%3E%3Ctext x=%228%22 y=%2278%22 font-size=%2264%22 font-family=%22sans-serif%22 font-weight=%22900%22 fill=%22%23fff4a8%22 stroke=%22%232b5ca8%22 stroke-width=%227%22 paint-order=%22stroke%22%3E바이브%3C/text%3E%3Ctext x=%2212%22 y=%22146%22 font-size=%2258%22 font-family=%22sans-serif%22 font-weight=%22900%22 fill=%22white%22 stroke=%22%233a72c0%22 stroke-width=%226%22 paint-order=%22stroke%22%3E실험실%3C/text%3E%3C/svg%3E',stars:2,subtitle:'말하고, 만들고, 바로 플레이!',tags:['자연어','생성','생존','전투'],image:'assets/page-bg-v4.webp',link:'/web-games/vibe-demo/'}]"
    );
    html = html.replace("게임 8종을 좌우로 밀어서 선택할 수 있어요!", "게임 10종을 좌우로 밀어서 선택할 수 있어요!");

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }
};
