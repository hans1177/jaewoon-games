import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickGeminiModels, askChain, buildProviders, LlmError } from '../tools/vibe-llm.mjs';
import { rankProviders, updateProviderStats, signature, similarity, playbookReplay, examplesFor, addCandidate, labelOutcomes, sanitize, datasetLine, emptyPlaybook, pickOrder, gate, findContext, buildPrompt, parseEdits, validateEdits, applyEdits, runBrain, recordAttempt, recordMerged, emptyBrainLedger, LIMITS } from '../tools/vibe-brain.mjs';

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

test('지시서 고르기: 코드로 고칠 수 있는 것만, 오류 먼저, 시도 4번이면 포기, 45분 간격', () => {
  const now = Date.now();
  const orders = [
    { game: 'fantasy-survival', kind: 'asset_link', fingerprint: 'a', text: 'x', seen: 9 },
    { game: 'fantasy-survival', kind: 'background', fingerprint: 'b', text: 'sky', seen: 5 },
    { game: 'fantasy-survival', kind: 'error', fingerprint: 'c', text: 'boom', seen: 1 },
    { game: 'fantasy-survival', kind: 'error', fingerprint: 'd', text: 'old', seen: 1, resolvedAt: 1 }
  ];
  assert.equal(pickOrder(orders, emptyBrainLedger(), now).fingerprint, 'c');
  const L = emptyBrainLedger(); L.attempts.c = { n: 1, lastAt: now - 10 * 60000 };
  assert.equal(pickOrder(orders, L, now).fingerprint, 'b');            // 방금 시도한 c 는 45분 쉼
  L.attempts.c = { n: 4, lastAt: now - 99 * 3600000 };
  assert.equal(pickOrder(orders, L, now).fingerprint, 'b');            // 네 번 실패한 c 는 포기
});

test('하루 12번·병합 간격 20분 제한', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  assert.equal(gate(emptyBrainLedger(), now), '');
  let L = recordMerged(emptyBrainLedger(), { order: { fingerprint: 'x' }, files: [] }, 1, now - 40 * 60000);
  assert.equal(gate(L, now), '');
  L = recordMerged(L, { order: { fingerprint: 'y' }, files: [] }, 2, now - 5 * 60000);
  assert.match(gate(L, now), /분이 안 지났다/);
  L = { ...L, merged: [], day: { date: '2026-11-11', count: 12 } };
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
  assert.match(y, /cron: '23,53 \* \* \* \*'/);
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

const edit = { file: GAME, search: 'local p = ui.target.AbsolutePosition', replace: 'if not ui.target then return nil end\n\tlocal p = ui.target.AbsolutePosition' };

test('무료 한도: 429 면 6시간 그 모델을 쉬게 하고, 계속 실패하는 모델은 맨 뒤로 보내며, 나머지는 원래 우선순위를 지킨다', () => {
  const now = Date.now();
  const P = ['gemini:a', 'gemini:b', 'codestral:c', 'groq:d'].map(name => ({ name }));
  let st = updateProviderStats({}, [{ name: 'gemini:a', ok: false, status: 429, message: 'GEMINI_a_HTTP_429' }, { name: 'gemini:b', ok: true }], 'gemini:b', now);
  assert.ok(st['gemini:a'].quotaUntil > now + 5 * 3600000);
  assert.deepEqual(rankProviders(P, st, now).map(p => p.name), ['gemini:b', 'codestral:c', 'groq:d']);          // a 는 쉼
  assert.deepEqual(rankProviders(P, st, now + 7 * 3600000).map(p => p.name), ['gemini:a', 'gemini:b', 'codestral:c', 'groq:d']);   // 6시간 뒤 복귀
  const bad = { 'gemini:b': { ok: 0, fail: 5 } };
  assert.deepEqual(rankProviders(P, bad, now).map(p => p.name), ['gemini:a', 'codestral:c', 'groq:d', 'gemini:b']);
  const out = updateProviderStats({}, [{ name: 'groq:d', ok: false, status: 503, message: 'GROQ_d_HTTP_503' }], null, now);
  assert.ok(out['groq:d'].quotaUntil > now && out['groq:d'].quotaUntil < now + 3600000);                         // 장애는 짧게
  const q = updateProviderStats({}, [{ name: 'x', ok: true }], '', now);                                          // 응답은 왔지만 수정안이 검증에서 거부됨 → 실패로 센다
  assert.equal(q.x.fail, 1);
});

test('문제의 모양(signature): 숫자·ID 가 달라도 같은 종류면 같고, 비슷한 문제는 유사도가 높다', () => {
  const a = { kind: 'error', fingerprint: 'fantasy-survival:console-errors', text: "콘솔 오류 3건. 첫 오류: Game:12462: attempt to index nil with 'AbsolutePosition'" };
  const b = { kind: 'error', fingerprint: 'mare-essentia:console-errors', text: "콘솔 오류 90건. 첫 오류: Game:77: attempt to index nil with 'AbsolutePosition'" };
  const c = { kind: 'background', fingerprint: 'fantasy-survival:sky-missing', text: '배경 연출 약함: 대기 있음, 하늘 없음' };
  assert.equal(signature(a), signature(b));
  assert.notEqual(signature(a), signature(c));
  assert.ok(similarity(signature(a), signature(b)) > 0.9);
  assert.ok(similarity(signature(a), signature(c)) < 0.2);
});

test('학습 전체 흐름: 처음엔 모델이 고치고 → 병합 뒤 해결이 확인되면 proven → 같은 문제가 다시 나오면 모델 없이 플레이북이 고친다', async () => {
  const now = Date.now();
  // 1) 처음: 모델이 고친다
  const root1 = mkRoot({ [GAME]: SRC });
  const llm = async () => ({ provider: 'fake', trace: [{ name: 'fake', ok: true }], text: JSON.stringify({ summary: 'nil 방어', edits: [edit] }) });
  const r1 = await runBrain({ orders: [order], ledger: emptyBrainLedger(), root: root1, llm, playbook: emptyPlaybook(), now });
  assert.equal(r1.ok, true);
  assert.ok(!r1.replayed);
  let { playbook, key } = addCandidate(emptyPlaybook(), { order, parsed: { summary: r1.summary, edits: r1.edits }, provider: r1.provider, now });
  assert.equal(playbook.entries[key].state, 'candidate');
  assert.equal(playbookReplay({ order, playbook, root: mkRoot({ [GAME]: SRC }) }), null);          // 아직 확인 전이라 재적용하지 않는다
  // 2) 병합 기록 → 지시서가 닫히면 RESOLVED, 항목은 proven
  let ledger = recordMerged(emptyBrainLedger(), { order, files: r1.files, provider: 'fake', sig: signature(order), pbKey: key }, 5, now);
  const closed = { ...order, resolvedAt: now + 1000 };
  const lab = labelOutcomes({ ledger, playbook, orders: [closed], now: now + 3600000 });
  assert.equal(lab.ledger.merged[0].label, 'RESOLVED');
  assert.equal(lab.playbook.entries[key].state, 'proven');
  assert.equal(lab.playbook.entries[key].successes, 1);
  // 3) 같은 모양의 문제가 다시 나오면 모델을 부르지 않는다
  const again = { ...order, text: "콘솔 오류 8건. 첫 오류: Game:99: attempt to index nil with 'AbsolutePosition'" };
  const root3 = mkRoot({ [GAME]: SRC });
  const noLlm = async () => { throw new Error('모델을 부르면 안 된다'); };
  const r3 = await runBrain({ orders: [again], ledger: emptyBrainLedger(), root: root3, llm: noLlm, playbook: lab.playbook, now });
  assert.equal(r3.ok, true);
  assert.equal(r3.replayed, true);
  assert.equal(r3.provider, 'playbook');
  assert.match(fs.readFileSync(path.join(root3, GAME), 'utf8'), /if not ui\.target then return nil end/);
  // 코드가 달라져 그 문장이 없으면 재적용하지 않고 모델로 넘어간다
  assert.equal(playbookReplay({ order: again, playbook: lab.playbook, root: mkRoot({ [GAME]: 'local y = 2\n' }) }), null);
});

test('해결이 안 된 병합은 NOT_RESOLVED 로 라벨하고, 실패가 쌓이면 그 방법은 bad 가 되어 다시 쓰지 않는다', () => {
  const now = Date.now();
  let { playbook, key } = addCandidate(emptyPlaybook(), { order, parsed: { summary: 's', edits: [edit] }, provider: 'fake', now });
  playbook.entries[key].state = 'proven'; playbook.entries[key].successes = 0;
  const ledger = { ...emptyBrainLedger(), merged: [{ at: now - 7 * 3600000, fp: order.fingerprint, pbKey: key }, { at: now - 8 * 3600000, fp: order.fingerprint, pbKey: key }] };
  const lab = labelOutcomes({ ledger, playbook, orders: [order], now });
  assert.deepEqual(lab.ledger.merged.map(m => m.label), ['NOT_RESOLVED', 'NOT_RESOLVED']);
  assert.equal(lab.playbook.entries[key].failures, 2);
  assert.equal(lab.playbook.entries[key].state, 'bad');
  assert.equal(playbookReplay({ order, playbook: lab.playbook, root: mkRoot({ [GAME]: SRC }) }), null);
  // 6시간 안에는 아직 판단하지 않는다
  const early = labelOutcomes({ ledger: { ...emptyBrainLedger(), merged: [{ at: now - 3600000, fp: order.fingerprint, pbKey: key }] }, playbook, orders: [order], now });
  assert.equal(early.changed, 0);
});

test('성공 사례는 비슷한 문제를 모델에게 물을 때 예시로 붙고, 학습용 기록에서는 키가 지워진다', () => {
  const now = Date.now();
  let { playbook, key } = addCandidate(emptyPlaybook(), { order, parsed: { summary: 's', edits: [edit] }, provider: 'fake', now });
  playbook.entries[key].state = 'proven';
  const similar = { ...order, game: 'mare-essentia', fingerprint: 'mare-essentia:console-errors', text: "콘솔 오류 2건. 첫 오류: Menu:5: attempt to index nil with 'AbsolutePosition'" };
  assert.equal(examplesFor(similar, playbook).length, 1);
  assert.match(buildPrompt(similar, [{ file: 'f', from: 1, to: 2, body: '1| x' }], examplesFor(similar, playbook)), /PAST FIXES THAT WERE CONFIRMED/);
  assert.equal(examplesFor({ ...order, kind: 'background', fingerprint: 'g:sky-missing', text: '하늘 없음' }, playbook).length, 0);
  const key1 = 'AIza' + 'A'.repeat(35), tok = 'ghp_' + 'b'.repeat(30);
  const line = JSON.parse(datasetLine({ order, prompt: `key ${key1} and ${tok} and Bearer abcdefghijklmnopqrstuvwx`, responseText: 'ok', provider: 'p', outcome: 'APPLIED', now }));
  assert.doesNotMatch(JSON.stringify(line), /AIza|ghp_|abcdefghijklmnopqrstuvwx/);
  assert.equal(line.outcome, 'APPLIED');
  assert.equal(line.sig, signature(order));
  assert.ok(sanitize('x'.repeat(50000)).length === 20000);
});

test('워크플로: 플레이북·학습용 기록을 데이터 브랜치에서 가져오고 저장한다(main 아님, 2MB 상한)', () => {
  const y = fs.readFileSync('.github/workflows/vibe-brain.yml', 'utf8');
  assert.match(y, /brain-playbook\.json\?ref=vibe-gym-data/);
  assert.match(y, /brain-dataset\.jsonl\?ref=vibe-gym-data/);
  assert.match(y, /--playbook build\/brain-playbook\.json --dataset build\/brain-dataset\.jsonl/);
  assert.match(y, /-gt 2000000/);
  assert.equal((y.match(/git push/g) || []).length, 1);            // 푸시는 브랜치 한 곳뿐
  assert.ok(y.includes('origin "$branch"'));
  assert.ok(!y.includes('--force'));
});

test('모델 이름이 바뀌어도 목록에서 쓸 모델을 스스로 고른다(Groq·OpenRouter)', async () => {
  const { pickGroqModels, pickOpenRouterModels } = await import('../tools/vibe-llm.mjs');
  const g = pickGroqModels(['whisper-large-v3', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'meta-llama/llama-guard-4-12b']);
  assert.deepEqual(g.slice(0, 2), ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile']);
  assert.ok(!g.some(x => /whisper|guard/.test(x)));
  const free = { prompt: '0', completion: '0' };
  const o = pickOpenRouterModels([
    { id: 'google/lyria-3-pro-preview', pricing: free }, { id: 'cohere/north-mini-code:free', pricing: free },
    { id: 'paid/model', pricing: { prompt: '0.1', completion: '0.1' } }, { id: 'openrouter/free', pricing: free },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', pricing: free }]);
  assert.equal(o[0], 'cohere/north-mini-code:free');
  assert.equal(o.at(-1), 'openrouter/free');
  assert.ok(!o.includes('paid/model') && !o.some(x => /lyria/.test(x)));
});

test('수정안의 검색 문구가 어긋나면 오류를 알려 주고 한 번 다시 받아 적용한다', async () => {
  const root = mkRoot({ [GAME]: SRC });
  const calls = [];
  const llm = async prompt => {
    calls.push(prompt);
    const search = calls.length === 1 ? '12| local p = ui.target.AbsolutePosition' : 'local p = ui.target.AbsolutePosition';
    return { provider: 'fake', trace: [], text: JSON.stringify({ summary: 'nil 방어', edits: [{ file: GAME, search, replace: 'if not ui.target then return nil end\n\tlocal p = ui.target.AbsolutePosition' }] }) };
  };
  const r = await runBrain({ orders: [order], ledger: emptyBrainLedger(), root, llm });
  assert.equal(r.ok, true);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /PREVIOUS ANSWER WAS REJECTED: SEARCH_MATCHES_0/);
  assert.ok(LIMITS.contextChars <= 12000);
});

test('검증·커밋은 두뇌가 실제로 고친 파일만 대상으로 한다(LFS 때문에 섞인 파일 무시)', () => {
  const y = fs.readFileSync('.github/workflows/vibe-brain.yml', 'utf8');
  assert.doesNotMatch(y, /git diff --name-only/);
  assert.doesNotMatch(y, /git add -A/);
  assert.match(y, /brain-result\.json'\)\.files/);
});

test('수동 실행의 retry_now 는 쉬는 시간을 건너뛰지만 평소엔 지킨다', () => {
  const o = { fingerprint: 'g:x', kind: 'background' };
  const L = { attempts: { 'g:x': { n: 1, lastAt: Date.now() - 60000 } } };
  delete process.env.BRAIN_RETRY_NOW;
  assert.equal(pickOrder([o], L), null);
  process.env.BRAIN_RETRY_NOW = '1';
  try { assert.equal(pickOrder([o], L).fingerprint, 'g:x'); } finally { delete process.env.BRAIN_RETRY_NOW; }
  assert.match(fs.readFileSync('.github/workflows/vibe-brain.yml', 'utf8'), /BRAIN_RETRY_NOW: \$\{\{ github\.event\.inputs\.retry_now/);
});

test('Studio frames go only to an image-capable provider', async () => {
  const images = [{ mimeType: 'image/png', data: 'AA==' }];
  const requests = [];
  const providers = await buildProviders({
    env: { GEMINI_API_KEY: 'fake', VIBE_BRAIN_GEMINI_MODELS: 'gemini-test-flash', GITHUB_MODELS_TOKEN: 'fake' },
    fetchFn: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) };
    }
  });
  await askChain({ prompt: 'inspect', images, providers: providers.reverse() });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /generativelanguage\.googleapis\.com/);
  assert.deepEqual(requests[0].body.contents[0].parts, [{ text: 'inspect' }, { inlineData: images[0] }]);
});
