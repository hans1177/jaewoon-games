import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickGeminiModels, askChain, buildProviders, LlmError } from '../tools/vibe-llm.mjs';
import { pickOrder, gate, findContext, buildPrompt, parseEdits, validateEdits, applyEdits, runBrain, recordAttempt, recordMerged, emptyBrainLedger, LIMITS } from '../tools/vibe-brain.mjs';

const mkRoot = files => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-'));
  for (const [f, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), c); }
  return root;
};
const GAME = 'roblox-games/fantasy-survival/client/Game.client.luau';
const SRC = 'local x = 1\nlocal function arrow()\n\tlocal p = ui.target.AbsolutePosition\n\treturn p\nend\nreturn arrow\n';
const order = { game: 'fantasy-survival', kind: 'error', fingerprint: 'fantasy-survival:console-errors', text: "콘솔 오류 3건. 첫 오류: Game:3: attempt to index nil with 'AbsolutePosition'", seen: 4 };

test('Gemini 모델 고르기: 무료 Flash 계열만, 최신 버전 먼저, 음성·이미지·라이브 제외', () => {
  const list = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash-tts', 'gemini-3.8-live', 'gemini-3.1-flash-image', 'gemini-2.5-pro', 'text-embedding-004']
    .map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] }));
  assert.deepEqual(pickGeminiModels(list), ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']);
  assert.deepEqual(pickGeminiModels([{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['embedContent'] }]), []);
});

test('공급자 순서: Gemini(무료 확인 시) → Codestral → GitHub Models → Groq → OpenRouter, 키 없으면 건너뜀, 무료 확인이 없으면 Gemini 제외', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => ({ models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }] }) });
  const env = { GEMINI_API_KEY: 'k', MISTRAL_CODESTRAL_API_KEY: 'k', GITHUB_MODELS_TOKEN: 't', GROQ_API_KEY: 'k', OPENROUTER_API_KEY: 'k' };
  const all = (await buildProviders({ env, fetchFn })).map(p => p.name.split(':')[0]);
  assert.deepEqual(all, ['gemini', 'codestral', 'github-models', 'groq', 'openrouter']);
  const noG = (await buildProviders({ env, allowGemini: false, fetchFn })).map(p => p.name.split(':')[0]);
  assert.deepEqual(noG, ['codestral', 'github-models', 'groq', 'openrouter']);
  assert.deepEqual((await buildProviders({ env: { GITHUB_MODELS_TOKEN: 't' }, fetchFn })).map(p => p.name.split(':')[0]), ['github-models']);
  assert.deepEqual(await buildProviders({ env: {}, fetchFn }), []);
});

test('무료 한도가 끝나(429) 앞 모델이 실패하면 다음 모델로 넘어가고, 전부 실패하면 이유를 모아 알린다', async () => {
  const seen = [];
  const providers = [
    { name: 'a', call: async () => { seen.push('a'); throw new LlmError('HTTP_429', { status: 429, retryable: true }); } },
    { name: 'b', call: async () => { seen.push('b'); throw new LlmError('HTTP_503'); } },
    { name: 'c', call: async () => { seen.push('c'); return '{"ok":1}'; } },
    { name: 'd', call: async () => { seen.push('d'); return 'never'; } }
  ];
  const r = await askChain({ prompt: 'x', providers });
  assert.equal(r.provider, 'c');
  assert.deepEqual(seen, ['a', 'b', 'c']);
  assert.equal(r.errors.length, 2);
  await assert.rejects(() => askChain({ prompt: 'x', providers: providers.slice(0, 2) }), /ALL_PROVIDERS_FAILED.*a:HTTP_429.*b:HTTP_503/);
});

test('지시서 고르기: 코드로 고칠 수 있는 것만, 오류 먼저, 시도 2번이면 포기, 12시간 간격', () => {
  const now = Date.now();
  const orders = [
    { game: 'fantasy-survival', kind: 'asset_link', fingerprint: 'a', text: 'x', seen: 9 },
    { game: 'fantasy-survival', kind: 'background', fingerprint: 'b', text: 'sky', seen: 5 },
    { game: 'fantasy-survival', kind: 'error', fingerprint: 'c', text: 'boom', seen: 1 },
    { game: 'fantasy-survival', kind: 'error', fingerprint: 'd', text: 'old', seen: 1, resolvedAt: 1 }
  ];
  assert.equal(pickOrder(orders, emptyBrainLedger(), now).fingerprint, 'c');
  const L = emptyBrainLedger(); L.attempts.c = { n: 1, lastAt: now - 3600000 };
  assert.equal(pickOrder(orders, L, now).fingerprint, 'b');            // 방금 시도한 c 는 12시간 쉼
  L.attempts.c = { n: 2, lastAt: now - 99 * 3600000 };
  assert.equal(pickOrder(orders, L, now).fingerprint, 'b');            // 두 번 실패한 c 는 포기
});

test('하루 3번·병합 간격 3시간 제한', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  assert.equal(gate(emptyBrainLedger(), now), '');
  let L = recordMerged(emptyBrainLedger(), { order: { fingerprint: 'x' }, files: [] }, 1, now - 4 * 3600000);
  assert.equal(gate(L, now), '');
  L = recordMerged(L, { order: { fingerprint: 'y' }, files: [] }, 2, now - 3600000);
  assert.match(gate(L, now), /분이 안 지났다/);
  L = { ...L, merged: [], day: { date: '2026-11-11', count: 3 } };
  assert.match(gate(L, now), /다 썼다/);
});

test('수정안 검증: 정확히 한 번 나오는 글만, 허용 폴더·확장자만, 위험 API·새 에셋 ID·큰 변경은 거부', () => {
  const root = mkRoot({ [GAME]: SRC, 'roblox-games/fantasy-survival/shared/Common/Kit.luau': 'x', 'roblox-games/fantasy-survival/tools/a.luau': 'x', 'roblox-games/fantasy-survival/client/b.client.luau': 'local a="rbxassetid://111"\nlocal b=2\nlocal b=2\n' });
  const ok = { edits: [{ file: GAME, search: 'local p = ui.target.AbsolutePosition', replace: 'if not ui.target then return nil end\n\tlocal p = ui.target.AbsolutePosition' }] };
  assert.deepEqual(validateEdits(root, order, ok), []);
  const bad = (edits, re) => assert.match(validateEdits(root, order, { edits }).join(','), re);
  bad([{ file: GAME, search: 'nothing here', replace: 'x' }], /SEARCH_MATCHES_0/);
  bad([{ file: 'roblox-games/fantasy-survival/client/b.client.luau', search: 'local b=2', replace: 'x' }], /SEARCH_MATCHES_2/);
  bad([{ file: 'roblox-games/fantasy-survival/shared/Common/Kit.luau', search: 'x', replace: 'y' }], /FILE_NOT_ALLOWED/);
  bad([{ file: 'roblox-games/fantasy-survival/tools/a.luau', search: 'x', replace: 'y' }], /FILE_NOT_ALLOWED/);
  bad([{ file: '.github/workflows/x.yml', search: 'x', replace: 'y' }], /FILE_NOT_ALLOWED/);
  bad([{ file: 'roblox-games/mare-essentia/src/A.luau', search: 'x', replace: 'y' }], /FILE_NOT_ALLOWED/);   // 다른 게임
  bad([{ file: GAME, search: 'local x = 1', replace: 'local h = game:GetService("HttpService")' }], /FORBIDDEN_API/);
  bad([{ file: GAME, search: 'local x = 1', replace: 'local i = "rbxassetid://999999"' }], /NEW_ASSET_ID/);
  bad([{ file: GAME, search: SRC.trim(), replace: 'x'.repeat(300).split('').join('\n') }], /TOO_MANY_LINES/);
  assert.deepEqual(validateEdits(root, order, { edits: [] }), ['BRAIN_NO_EDITS']);
});

test('LLM 응답 해석: 코드 울타리와 앞뒤 글이 붙어도 JSON 을 읽고, 모양이 틀리면 거부', () => {
  const r = parseEdits('설명입니다\n```json\n{"summary":"nil 방어","edits":[{"file":"a","search":"s","replace":"r"}]}\n```');
  assert.equal(r.edits[0].replace, 'r');
  assert.throws(() => parseEdits('no json'), /BRAIN_NO_JSON/);
  assert.throws(() => parseEdits('{"summary":"x"}'), /BRAIN_BAD_SHAPE/);
});

test('한 바퀴: 관련 코드를 찾아 가짜 LLM 수정안을 검증·적용하고, 거부되면 파일을 건드리지 않는다', async () => {
  const root = mkRoot({ [GAME]: SRC });
  const ctx = findContext(root, order);
  assert.equal(ctx[0].file, GAME);
  assert.match(buildPrompt(order, ctx), /AbsolutePosition/);
  const good = async () => ({ provider: 'fake', text: JSON.stringify({ summary: 'nil 방어', edits: [{ file: GAME, search: 'local p = ui.target.AbsolutePosition', replace: 'if not ui.target then return nil end\n\tlocal p = ui.target.AbsolutePosition' }] }) });
  const r = await runBrain({ orders: [order], ledger: emptyBrainLedger(), root, llm: good });
  assert.equal(r.ok, true);
  assert.match(fs.readFileSync(path.join(root, GAME), 'utf8'), /if not ui\.target then return nil end/);
  const root2 = mkRoot({ [GAME]: SRC });
  const evil = async () => ({ provider: 'fake', text: JSON.stringify({ summary: 'x', edits: [{ file: GAME, search: 'local x = 1', replace: 'loadstring("x")()' }] }) });
  const r2 = await runBrain({ orders: [order], ledger: emptyBrainLedger(), root: root2, llm: evil });
  assert.equal(r2.ok, false);
  assert.equal(fs.readFileSync(path.join(root2, GAME), 'utf8'), SRC);
  const L = recordAttempt(emptyBrainLedger(), r2);
  assert.equal(L.attempts[order.fingerprint].n, 1);
  assert.equal(L.attempts[order.fingerprint].last, 'REJECTED');
  const r3 = await runBrain({ orders: [order], ledger: emptyBrainLedger(), root: mkRoot({ [GAME]: SRC }), llm: async () => { throw new Error('quota'); } });
  assert.match(r3.skipped, /LLM 실패/);
});

test('워크플로: 1시간 주기, 끄는 변수, Gemini 는 무료 확인 변수가 있을 때만, 검증 통과 뒤에만 PR, 병합은 VIBE_BRAIN_MERGE=on 일 때만', () => {
  const y = fs.readFileSync('.github/workflows/vibe-brain.yml', 'utf8');
  assert.match(y, /cron: '23 \* \* \* \*'/);
  assert.match(y, /vars\.VIBE_BRAIN != 'off'/);
  assert.match(y, /GEMINI_API_KEY: \$\{\{ vars\.VIBE2_GEMINI_FREE_TIER_VERIFIED == 'YES' && secrets\.GEMINI_API_KEY \|\| '' \}\}/);
  assert.match(y, /GITHUB_MODELS_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(y, /models: read/);
  assert.match(y, /if: \$\{\{ steps\.verify\.outputs\.verified == 'yes' \}\}/);
  assert.match(y, /MERGE_ON:-off\}" = "on"/);
  assert.match(y, /SyntaxError before=/);
  assert.match(y, /branch=vibe-gym-data/);
  assert.doesNotMatch(y, /roblox-games\/\*\)\s*;;\s*\n\s*\*\.github/);
});
