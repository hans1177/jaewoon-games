#!/usr/bin/env node
// 바이브 두뇌: 자동 판단기가 남긴 작업 지시서(orders) 중 코드로 고칠 수 있는 것을 하나 골라, 무료 LLM 에게 "찾아 바꾸기" 수정안을 받아 검증하고 적용한다.
// 이 도구는 파일만 고친다. 브랜치·검사·병합은 워크플로가 하며, 검사에 실패하면 버린다.
// 안전장치: 두 게임의 소스 폴더 안 .luau 만, 파일 3개·변경 80줄 이하, 정확히 한 번 나오는 문장만 교체, 위험한 API·새 에셋 ID 금지, 하루 횟수·간격 제한.
import fs from 'fs';
import path from 'path';
import { askChain, buildProviders } from './vibe-llm.mjs';

export const LIMITS = { maxFiles: 3, maxChangedLines: 80, maxPerDay: 3, minGapMin: 180, maxAttemptsPerOrder: 2, retryGapMin: 12 * 60, contextChars: 24000 };
export const CODE_KINDS = new Set(['error', 'ui', 'combat', 'background']);   // 에셋 권한·Studio 연결 문제는 코드로 못 고친다

const ALLOWED = /^roblox-games\/(fantasy-survival\/(client|server|shared)|mare-essentia\/src)\/(?!(?:.*\/)?(?:Common\/|[^\/]*(?:VisualAssetIds|LookAssignment|SkillTreeIconIds|OpeningAssetIds)[^\/]*$)).+\.luau$/;
const FORBIDDEN = /loadstring|getfenv|setfenv|HttpService|MarketplaceService|DataStoreService|MessagingService|:Kick\(|os\.execute|io\.open|require\(\s*\d{5,}/;

export function emptyBrainLedger() { return { v: 1, attempts: {}, merged: [], day: { date: '', count: 0 } }; }

const today = now => new Date(now).toISOString().slice(0, 10);

// 하루 횟수·간격 확인. 막히면 이유를 돌려준다.
export function gate(ledger, now = Date.now()) {
  const d = ledger.day?.date === today(now) ? ledger.day.count : 0;
  if (d >= LIMITS.maxPerDay) return `오늘 ${LIMITS.maxPerDay}번을 다 썼다`;
  const last = (ledger.merged || []).slice(-1)[0];
  if (last && (now - last.at) / 60000 < LIMITS.minGapMin) return `마지막 병합 후 ${LIMITS.minGapMin}분이 안 지났다(Studio 점검으로 결과를 확인할 시간)`;
  return '';
}

export function pickOrder(orders, ledger, now = Date.now()) {
  const open = (orders || []).filter(o => !o.resolvedAt && CODE_KINDS.has(o.kind));
  const ok = open.filter(o => {
    const a = ledger.attempts?.[o.fingerprint];
    if (!a) return true;
    if (a.n >= LIMITS.maxAttemptsPerOrder) return false;
    return (now - a.lastAt) / 60000 >= LIMITS.retryGapMin;
  });
  // 오류가 먼저, 그다음 자주 보인 것
  ok.sort((a, b) => (b.kind === 'error') - (a.kind === 'error') || (b.seen || 0) - (a.seen || 0));
  return ok[0] || null;
}

function listLuau(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listLuau(p, out); else if (e.name.endsWith('.luau')) out.push(p);
  }
  return out;
}

const gameDirs = game => game === 'mare-essentia' ? ['src'] : ['client', 'server', 'shared'];

// 지시서 글에서 단서를 뽑아 관련 파일과 줄 주변을 찾는다.
export function findContext(root, order) {
  const base = path.join(root, 'roblox-games', order.game);
  const files = gameDirs(order.game).flatMap(d => listLuau(path.join(base, d)))
    .filter(f => ALLOWED.test(path.relative(root, f).replace(/\\/g, '/')));
  const text = String(order.text || '');
  const hits = [];
  const m = text.match(/\b([A-Za-z_][\w]*):(\d+)\b/);                 // "Game:12462: ..." 같은 스크립트:줄
  if (m) for (const f of files) if (path.basename(f).replace(/\.(client|server)?\.?luau$/, '').toLowerCase() === m[1].toLowerCase()) hits.push({ f, line: +m[2], score: 100 });
  const words = [...new Set((text.match(/[A-Za-z_]{4,}|[가-힣]{2,}/g) || []).filter(w => !/^(attempt|index|with|first|nil|오류|콘솔|없음|있음|건|월드|화면)$/i.test(w)))].slice(0, 8);
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    let score = 0, line = 0;
    const lines = src.split('\n');
    lines.forEach((l, i) => { for (const w of words) if (l.includes(w)) { score++; if (!line) line = i + 1; } });
    if (score) hits.push({ f, line: line || 1, score });
  }
  hits.sort((a, b) => b.score - a.score);
  const seen = new Set(), picks = [];
  for (const h of hits) { if (!seen.has(h.f)) { seen.add(h.f); picks.push(h); } if (picks.length >= 3) break; }
  let budget = LIMITS.contextChars;
  return picks.map(h => {
    const lines = fs.readFileSync(h.f, 'utf8').split('\n');
    const from = Math.max(0, h.line - 70), to = Math.min(lines.length, h.line + 70);
    let body = lines.slice(from, to).map((l, i) => `${from + i + 1}| ${l}`).join('\n');
    if (body.length > budget) body = body.slice(0, budget);
    budget -= body.length;
    return { file: path.relative(root, h.f).replace(/\\/g, '/'), from: from + 1, to, body };
  }).filter(c => c.body);
}

export function buildPrompt(order, ctx) {
  return [
    'You are the repair brain of a Roblox game engine called Vibe. Fix exactly ONE issue with a minimal, safe code change.',
    'The game code is Luau (Roblox). Comments and UI text are Korean; keep that style.',
    '',
    `ISSUE (${order.kind}, game=${order.game}): ${order.text}`,
    '',
    'RULES:',
    `- Output ONLY JSON: {"summary":"one Korean sentence","edits":[{"file":"<path as given>","search":"<exact existing text>","replace":"<new text>"}]}`,
    `- At most ${LIMITS.maxFiles} files and ${LIMITS.maxChangedLines} changed lines in total. Edit only files shown below.`,
    '- "search" must appear EXACTLY ONCE in that file, copied character for character (without the "NNN| " line-number prefix).',
    '- Do not add new rbxassetid:// numbers, do not use loadstring, HttpService, DataStoreService, MarketplaceService or Kick.',
    '- Prefer guarding against nil (early return, FindFirstChild, pcall) over restructuring. Do not rename or delete public functions.',
    '- If you cannot fix it safely with the code shown, output {"summary":"cannot fix","edits":[]}.',
    '',
    'CODE (line-numbered excerpts):',
    ...ctx.map(c => `--- FILE: ${c.file} (lines ${c.from}-${c.to})\n${c.body}`)
  ].join('\n');
}

export function parseEdits(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('BRAIN_NO_JSON');
  const j = JSON.parse(t.slice(a, b + 1));
  if (!j || !Array.isArray(j.edits)) throw new Error('BRAIN_BAD_SHAPE');
  return { summary: String(j.summary || '').slice(0, 200), edits: j.edits.map(e => ({ file: String(e.file || ''), search: String(e.search ?? ''), replace: String(e.replace ?? '') })) };
}

export function validateEdits(root, order, parsed) {
  const errs = [];
  const { edits } = parsed;
  if (!edits.length) return ['BRAIN_NO_EDITS'];
  const files = new Set(edits.map(e => e.file));
  if (files.size > LIMITS.maxFiles) errs.push('TOO_MANY_FILES');
  let changed = 0;
  const cache = {};
  for (const e of edits) {
    const rel = e.file.replace(/\\/g, '/');
    if (!ALLOWED.test(rel) || !rel.startsWith(`roblox-games/${order.game}/`)) { errs.push('FILE_NOT_ALLOWED:' + rel); continue; }
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { errs.push('FILE_MISSING:' + rel); continue; }
    cache[rel] ??= fs.readFileSync(abs, 'utf8');
    const src = cache[rel];
    if (!e.search) { errs.push('EMPTY_SEARCH'); continue; }
    const count = src.split(e.search).length - 1;
    if (count !== 1) { errs.push(`SEARCH_MATCHES_${count}:${rel}`); continue; }
    if (FORBIDDEN.test(e.replace)) errs.push('FORBIDDEN_API:' + rel);
    const oldIds = new Set(src.match(/rbxassetid:\/\/\d+/g) || []);
    for (const id of e.replace.match(/rbxassetid:\/\/\d+/g) || []) if (!oldIds.has(id)) errs.push('NEW_ASSET_ID:' + id);
    if (e.search.length > 400 && e.replace.length < e.search.length * 0.2) errs.push('LOOKS_LIKE_DELETION:' + rel);
    changed += Math.max(e.search.split('\n').length, e.replace.split('\n').length);
    cache[rel] = src.replace(e.search, () => e.replace);          // 같은 파일의 다음 수정이 앞 수정 뒤의 글을 보도록
  }
  if (changed > LIMITS.maxChangedLines) errs.push('TOO_MANY_LINES:' + changed);
  return errs;
}

export function applyEdits(root, parsed) {
  const touched = [];
  for (const e of parsed.edits) {
    const abs = path.join(root, e.file);
    const src = fs.readFileSync(abs, 'utf8');
    fs.writeFileSync(abs, src.replace(e.search, () => e.replace));
    if (!touched.includes(e.file)) touched.push(e.file);
  }
  return touched;
}

// 한 바퀴: 고르고 → 묻고 → 검증하고 → 적용한다. llm 은 {text, provider} 를 주는 함수(테스트에서 가짜로 바꾼다).
export async function runBrain({ orders, ledger, root, llm, now = Date.now(), log = () => {} }) {
  const why = gate(ledger, now);
  if (why) return { ok: false, skipped: why };
  const order = pickOrder(orders, ledger, now);
  if (!order) return { ok: false, skipped: '고칠 수 있는 열린 지시서가 없다' };
  const ctx = findContext(root, order);
  if (!ctx.length) return { ok: false, order, skipped: '관련 코드를 찾지 못했다', attempted: true };
  const prompt = buildPrompt(order, ctx);
  let res, parsed;
  try { res = await llm(prompt); parsed = parseEdits(res.text); } catch (e) { return { ok: false, order, skipped: 'LLM 실패: ' + e.message, attempted: true }; }
  const errs = validateEdits(root, order, parsed);
  if (errs.length) { log('REJECTED ' + errs.join(',')); return { ok: false, order, provider: res.provider, rejected: errs, attempted: true }; }
  const files = applyEdits(root, parsed);
  return { ok: true, order, provider: res.provider, summary: parsed.summary, files };
}

export function recordAttempt(ledger, result, now = Date.now()) {
  const out = JSON.parse(JSON.stringify(ledger));
  if (!result.order || !result.attempted && !result.ok) return out;
  const fp = result.order.fingerprint;
  const a = out.attempts[fp] || { n: 0 };
  out.attempts[fp] = { n: a.n + 1, lastAt: now, last: result.ok ? 'APPLIED' : (result.rejected ? 'REJECTED' : 'FAILED') };
  return out;
}

export function recordMerged(ledger, result, pr, now = Date.now()) {
  const out = JSON.parse(JSON.stringify(ledger));
  out.merged = [...(out.merged || []), { at: now, fp: result.order.fingerprint, pr, files: result.files, provider: result.provider }].slice(-30);
  out.day = out.day?.date === today(now) ? { date: today(now), count: out.day.count + 1 } : { date: today(now), count: 1 };
  return out;
}

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } }

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const arg = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : ''; };
  const ledgerFile = arg('ledger') || 'build/brain-ledger.json', outFile = arg('out') || 'build/brain-result.json';
  if (arg('record-merged')) {          // 병합이 끝난 뒤 워크플로가 호출: 하루 횟수·간격 장부에 기록
    const r = readJson(outFile, {});
    const L = recordMerged(readJson(ledgerFile, emptyBrainLedger()), { order: { fingerprint: r.fingerprint }, files: r.files || [], provider: r.provider }, Number(arg('record-merged')));
    fs.writeFileSync(ledgerFile, JSON.stringify(L, null, 2) + '\n');
    console.log('병합 기록 완료');
    process.exit(0);
  }
  const orders = readJson(arg('orders') || 'build/autopilot-orders.json', []);
  let ledger = readJson(ledgerFile, emptyBrainLedger());
  const providers = await buildProviders({ allowGemini: process.env.BRAIN_ALLOW_GEMINI !== 'no', log: m => console.log(m) });
  console.log('모델 순서:', providers.map(p => p.name).join(' → ') || '(없음)');
  const llm = prompt => askChain({ prompt, providers, log: m => console.log(m) });
  const result = await runBrain({ orders, ledger, root: process.cwd(), llm, log: m => console.log(m) });
  ledger = recordAttempt(ledger, result);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n');
  fs.writeFileSync(outFile, JSON.stringify({ ok: result.ok, skipped: result.skipped || '', rejected: result.rejected || [], provider: result.provider || '', summary: result.summary || '', files: result.files || [], fingerprint: result.order?.fingerprint || '', kind: result.order?.kind || '', text: result.order?.text || '' }, null, 2) + '\n');
  console.log(result.ok ? `적용: ${result.summary} (${result.files.join(', ')}) by ${result.provider}` : `건너뜀/거부: ${result.skipped || result.rejected?.join(',')}`);
}
