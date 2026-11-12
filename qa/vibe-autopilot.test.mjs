import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, KINDS, parseReport, findingsFrom, decide, scoreTasks, markDispatched, learn, openOrders, emptyLedger, dispatchPlan } from '../tools/vibe-autopilot.mjs';

const none = { 'fantasy-survival': parseReport(null), 'mare-essentia': parseReport(null) };
const heads = { 'fantasy-survival': 'a', 'mare-essentia': 'b' };
const mkReport = out => ({ log: [{ step: 5, out }], errors: [], summary: { abortedEarly: false, capturedFrames: 3 } });

test('모든 점검 종류에는 실제 Studio 스크립트 파일과 설명이 있다', () => {
  for (const [g, def] of Object.entries(GAMES)) for (const [k, f] of Object.entries(def.scripts)) {
    assert.ok(KINDS[k], g + ':' + k + ' KINDS 없음');
    assert.ok(fs.existsSync(f), f + ' 없음');
    assert.match(f, /^roblox-games\/[a-z0-9-]+\/[A-Za-z0-9_./-]+\.json$/);   // devloop-studio.yml 의 경로 규칙
    assert.ok(Array.isArray(JSON.parse(fs.readFileSync(f, 'utf8'))));
  }
});

test('결과가 계속 깨끗해도 같은 점검을 되풀이하지 않고 여러 영역을 훑는다(24번 중 대부분 서로 다름)', () => {
  let L = emptyLedger(), now = Date.parse('2026-11-11T03:00:00Z');
  const seq = [];
  for (let i = 0; i < 24; i++) {
    const p = decide({ signals: none, ledger: L, now, heads }).picks[0];
    if (!p) { now += 30 * 60000; continue; }
    seq.push(p.game + ':' + p.kind);
    L = markDispatched(L, p, now, heads[p.game]);
    const r = L.tasks[p.game + ':' + p.kind]; r.pending = false; r.runs = 1; r.ema = 0.35; r.lastResult = 'CLEAN';
    now += 30 * 60000;
  }
  assert.ok(new Set(seq).size >= 20, '서로 다른 점검 ' + new Set(seq).size);
  for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], '연속 같은 점검');
  assert.ok(new Set(seq.map(x => x.split(':')[0])).size === 2);              // 두 게임 모두
  assert.ok(new Set(seq.map(x => KINDS[x.split(':')[1]].group)).size >= 6);  // 영역도 다양
});

test('코드가 안 바뀌었고 결과가 깨끗하면 3일간 건너뛰고, 코드가 바뀌면 다시 점검한다', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const L = emptyLedger();
  L.tasks['fantasy-survival:health'] = { lastAt: now - 5 * 3600000, runs: 3, ema: 0.1, lastResult: 'CLEAN', lastSha: 'a' };
  const same = scoreTasks({ signals: none, ledger: L, now, heads }).find(r => r.game === 'fantasy-survival' && r.kind === 'health');
  assert.equal(same.unchanged, true);
  assert.equal(same.blocked, true);
  const changed = scoreTasks({ signals: none, ledger: L, now, heads: { ...heads, 'fantasy-survival': 'newsha' } }).find(r => r.game === 'fantasy-survival' && r.kind === 'health');
  assert.equal(changed.unchanged, false);
  assert.equal(changed.blocked, false);
});

test('신호 해석: HEALTH 줄에서 오류·자산 실패·몹·UI·조명을 읽고 발견(지시서)으로 만든다', () => {
  const s = parseReport(mkReport('HEALTH_ERR n=3 first=Game:12: attempt to index nil\nHEALTH_ASSET fail=2 total=9 ids=111111,222222\nHEALTH_WORLD mobs=0 mobhp=0 parts=120\nHEALTH_UI 퀘스트=0 체력=2\nHEALTH_LIGHT clock=14.0 bright=2.00 atmos=false sky=true'));
  assert.equal(s.err, 3);
  assert.deepEqual(s.failedIds, ['111111', '222222']);
  const ids = findingsFrom('fantasy-survival', s).map(f => f.id).sort();
  assert.deepEqual(ids, ['asset-fail', 'console-errors', 'no-mobs', 'sky-missing', 'sparse-world', 'ui-missing']);
});

test('발견이 있는 영역은 점수가 올라 쿨다운 중이어도 급하면 먼저 점검한다', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const L = emptyLedger();
  for (const k of Object.keys(GAMES['fantasy-survival'].scripts)) L.tasks['fantasy-survival:' + k] = { lastAt: now - 20 * 60000, runs: 1, ema: 0.3, lastResult: 'CLEAN', lastSha: 'old' };
  const sig = { ...none, 'fantasy-survival': parseReport(mkReport('HEALTH_ERR n=5 first=x\nHEALTH_ASSET fail=3 total=9 ids=1\nHEALTH_WORLD mobs=2 mobhp=10 parts=900')) };
  const d = decide({ signals: sig, ledger: L, now, heads });
  const top = d.rows.filter(r => r.game === 'fantasy-survival')[0];
  assert.equal(top.kind, 'health');
  assert.equal(top.blocked, false);
});

test('학습: 새 결과가 오면 직전에 보낸 점검의 성과(발견/깨끗/실패)를 기록하고 해결된 지시서는 닫는다', () => {
  const now = Date.now();
  let L = emptyLedger();
  L = markDispatched(L, { game: 'fantasy-survival', kind: 'health' }, now - 1000, 'a');
  const rep = { 'fantasy-survival': mkReport('HEALTH_ERR n=2 first=boom\nHEALTH_ASSET fail=0 total=4 ids=\nHEALTH_WORLD mobs=3 mobhp=9 parts=900'), 'mare-essentia': null };
  const sig = { 'fantasy-survival': parseReport(rep['fantasy-survival']), 'mare-essentia': parseReport(null) };
  L = learn({ ledger: L, reports: rep, signals: sig, now });
  assert.equal(L.tasks['fantasy-survival:health'].lastResult, 'FOUND');
  assert.equal(L.tasks['fantasy-survival:health'].pending, false);
  assert.equal(openOrders(L).length, 1);
  // 같은 report 는 다시 평가하지 않는다
  const again = learn({ ledger: L, reports: rep, signals: sig, now: now + 1 });
  assert.equal(again.tasks['fantasy-survival:health'].runs, 1);
  // 오류가 사라진 새 report → 지시서 해결
  const rep2 = { ...rep, 'fantasy-survival': mkReport('HEALTH_ERR n=0 first=\nHEALTH_ASSET fail=0 total=4 ids=\nHEALTH_WORLD mobs=3 mobhp=9 parts=900') };
  const sig2 = { ...sig, 'fantasy-survival': parseReport(rep2['fantasy-survival']) };
  const fixed = learn({ ledger: L, reports: rep2, signals: sig2, now: now + 5 });
  assert.equal(openOrders(fixed).length, 0);
});

test('대기열이 2개 이상이면 쉬고, 연속 실패한 점검은 감점되며, 실행 명령은 devloop-studio 만 부른다', () => {
  assert.match(decide({ signals: none, ledger: emptyLedger(), queued: 2, heads }).skipped, /대기열/);
  const now = Date.now();
  const L = emptyLedger(); L.tasks['mare-essentia:ui'] = { lastAt: now - 99 * 3600000, runs: 4, ema: 0.5, failStreak: 4, lastResult: 'FAILED' };
  const a = scoreTasks({ signals: none, ledger: emptyLedger(), now, heads }).find(r => r.kind === 'ui' && r.game === 'mare-essentia');
  const b = scoreTasks({ signals: none, ledger: L, now, heads }).find(r => r.kind === 'ui' && r.game === 'mare-essentia');
  assert.ok(b.score < a.score);
  const plan = dispatchPlan({ game: 'mare-essentia', kind: 'combat' });
  assert.ok(plan.join(' ').includes('devloop-studio.yml/dispatches'));
  assert.ok(plan.includes('inputs[script]=' + GAMES['mare-essentia'].scripts.combat));
});

test('워크플로: 10분 주기, 끄는 변수, 결과·원장 수집, main 이 아닌 데이터 브랜치에만 저장(API)', () => {
  const y = fs.readFileSync('.github/workflows/vibe-autopilot.yml', 'utf8');
  assert.match(y, /cron: '8-58\/10 \* \* \* \*'/);
  assert.match(y, /vars\.VIBE_AUTOPILOT != 'off'/);
  assert.match(y, /actions: write/);
  assert.match(y, /node tools\/vibe-autopilot\.mjs --run --game mare-essentia --queued "\$QUEUED"/);
  assert.match(y, /-studio-frames/);
  assert.match(y, /branch=vibe-gym-data/);
  assert.doesNotMatch(y, /git push/);
  assert.match(y, /cancel-in-progress: false/);
});

test('종합 점검 스크립트는 시작 버튼이 없어도 멈추지 않는다(click_text 대신 없으면 모서리 점을 쓰는 click_from_luau)', () => {
  const d = JSON.parse(fs.readFileSync(GAMES['fantasy-survival'].scripts.health, 'utf8'));
  assert.equal(d.some(s => s.type === 'click_text'), false);
  const clicks = d.filter(s => s.type === 'click_from_luau');
  assert.ok(clicks.length >= 1);
  for (const c of clicks) { assert.match(c.code, /이어하기/); assert.match(c.code, /모험 시작/); assert.match(c.code, /out="6,6"/); }
  assert.ok(d.some(s => s.type === 'luau' && /HEALTH_ERR/.test(s.code)));
});

test('Studio 완료와 System AI 완료로 10분 예약 누락을 복구하고 5분 재발송을 막는다', () => {
  const y = fs.readFileSync('.github/workflows/vibe-autopilot.yml', 'utf8');
  assert.match(y, /workflow_run:\s*\n\s*workflows: \['Devloop Studio Capture', 'Company System AI Workers'\]\s*\n\s*types: \[requested, completed\]/);
  assert.match(y, /cron: '8-58\/10 \* \* \* \*'/);                          // 안전망은 그대로
  assert.match(y, /AUTOPILOT_FALLBACK_SKIP=RECENT_DECISION/);
  assert.match(y, /github.event.action == 'requested'/);
  assert.match(y, /lastDecisionAt/);
  assert.match(y, /if: env\.AUTOPILOT_SKIP != 'true'/);
  assert.match(fs.readFileSync('tools/vibe-autopilot.mjs', 'utf8'), /ledger\.lastDecisionAt = decisionAt/);
  const b = fs.readFileSync('.github/workflows/vibe-brain.yml', 'utf8');
  assert.match(b, /workflows: \['Vibe Autopilot'\]/);
  const now = Date.now();
  let L = emptyLedger();
  L = markDispatched(L, { game: 'fantasy-survival', kind: 'health' }, now - 2 * 60000, 'a');
  assert.match(decide({ signals: none, ledger: L, now, heads }).skipped, /방금 점검을 보냈다/);
  assert.equal(decide({ signals: none, ledger: L, now: now + 8 * 60000, heads }).skipped.includes('방금'), false);
});

test('autopilot 점검 결과는 별도 브랜치에 보관되고 판단기가 그걸 먼저 읽는다', () => {
  const d = fs.readFileSync('.github/workflows/devloop-studio.yml', 'utf8');
  assert.match(d, /CAP_SCRIPT -match 'autopilot'/);
  assert.match(d, /-autopilot-report/);
  const y = fs.readFileSync('.github/workflows/vibe-autopilot.yml', 'utf8');
  assert.ok(y.indexOf('-autopilot-report') < y.indexOf('-studio-frames'));
});
