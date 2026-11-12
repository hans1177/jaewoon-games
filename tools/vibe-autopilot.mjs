#!/usr/bin/env node
// 바이브 자동 판단기: Studio 점검 결과(신호)를 읽고 "지금 무엇을 점검·조치할지" 스스로 고른다.
// 외부 AI 없이 규칙 + 점수 + 지난 결과 학습(원장)으로 정한다. 고른 일은 기존 워크플로(Studio 캡처, 에셋 재등록)로 실행한다.
// 코드 수정이 필요한 발견은 "작업 지시서(orders)"로 남겨 사람이나 Claude 세션이 이어받는다(여기서 코드를 마구 고치지 않는다).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const DAY = 24 * 60;
export const MIN_GAP_MIN = 5;

// 게임별 점검 목록. studio 는 devloop-studio.yml 로, workflow 는 해당 워크플로 dispatch 로 실행한다.
const F = 'roblox-games/fantasy-survival/tools/devloop/studio-scripts/';
const M = 'roblox-games/mare-essentia/tools/devloop/studio-scripts/';
export const GAMES = {
  'fantasy-survival': {
    framesBranch: 'fantasy-survival-studio-frames',
    scripts: {
      health: F + 'fantasy-autopilot-health.json',
      ui: F + 'fantasy-qa-click.json',
      combat: F + 'fantasy-mob-motion-check.json',
      mobrig: F + 'fantasy-mob-rigs.json',
      mobgallery: F + 'fantasy-mob-gallery.json',
      wolf: F + 'fantasy-wolf-motion.json',
      region: F + 'fantasy-region-survey.json',
      sky: F + 'fantasy-verify-sky.json',
      light: F + 'fantasy-light-diag.json',
      visual: F + 'fantasy-visual-check.json',
      ladder: F + 'fantasy-verify-ladder.json'
    }
  },
  'mare-essentia': {
    framesBranch: 'mare-essentia-studio-frames',
    scripts: {
      health: M + 'mare-autopilot-health.json',
      ui: M + 'mare-qa-click.json',
      ui2: M + 'mare-ui.json',
      combat: M + 'mare-battle.json',
      trade: M + 'mare-trade.json',
      voyage: M + 'mare-voyage.json',
      field: M + 'mare-field.json',
      europe: M + 'mare-europe.json',
      ports: M + 'mare-startports.json',
      portcompare: M + 'mare-portcompare.json',
      town: M + 'mare-town.json',
      cards: M + 'mare-cards.json',
      assetsizes: M + 'asset-sizes.json'
    }
  }
};

// 점검 종류: base=기본 가치, cooldown=다시 하기 전 최소 분, area=사람이 읽는 이름, area 가 같은 종류끼리 같은 영역으로 센다
export const KINDS = {
  health: { base: 5, cooldown: 90, area: '종합 점검(오류·자산·UI·몹·조명)', group: 'health' },
  ui: { base: 3, cooldown: 6 * 60, area: '퀘스트·메뉴 UI 점검', group: 'ui' },
  ui2: { base: 2.5, cooldown: 8 * 60, area: '화면 UI 구성 점검', group: 'ui' },
  combat: { base: 3, cooldown: 8 * 60, area: '전투·몹 동작 점검', group: 'combat' },
  mobrig: { base: 2.5, cooldown: 10 * 60, area: '몹 뼈대·관절 점검', group: 'combat' },
  mobgallery: { base: 2, cooldown: 12 * 60, area: '몹 모습 갤러리 점검', group: 'combat' },
  wolf: { base: 2, cooldown: 12 * 60, area: '늑대 동작 점검', group: 'combat' },
  trade: { base: 3, cooldown: 8 * 60, area: '교역 화면 점검', group: 'economy' },
  voyage: { base: 3, cooldown: 8 * 60, area: '항해 점검', group: 'voyage' },
  field: { base: 2.5, cooldown: 10 * 60, area: '필드 점검', group: 'world' },
  europe: { base: 2, cooldown: 12 * 60, area: '유럽 항구 점검', group: 'world' },
  ports: { base: 2, cooldown: 12 * 60, area: '시작 항구 점검', group: 'world' },
  portcompare: { base: 2, cooldown: 12 * 60, area: '항구 비교 점검', group: 'world' },
  cards: { base: 4, cooldown: 3 * 60, area: '카드 화면(덱·연습전·지상전 손패) 점검', group: 'cards' },
  town: { base: 2.5, cooldown: 10 * 60, area: '마을 배경 점검', group: 'background' },
  region: { base: 2.5, cooldown: 10 * 60, area: '지역별 배경 점검', group: 'background' },
  sky: { base: 2, cooldown: 12 * 60, area: '하늘·대기 점검', group: 'background' },
  light: { base: 2, cooldown: 12 * 60, area: '조명 진단', group: 'background' },
  visual: { base: 2, cooldown: 12 * 60, area: '화면 연출 점검', group: 'background' },
  ladder: { base: 2, cooldown: 12 * 60, area: '비주얼 단계 점검', group: 'background' },
  assetsizes: { base: 2, cooldown: 12 * 60, area: '에셋 크기 점검', group: 'assets' }
};

// ---- 신호 읽기: Studio report.json 의 HEALTH_* 줄을 구조로 바꾼다 -----------------------------
export function parseReport(report) {
  const s = { ok: false, err: 0, errFirst: '', assetFail: 0, assetTotal: 0, failedIds: [], mobs: null, mobHp: null, parts: null, cardIssues: [], cardErr: 0, ui: {}, light: null, aborted: false, captured: 0, studioErrors: [] };
  if (!report || typeof report !== 'object') return s;
  s.aborted = !!report.summary?.abortedEarly;
  s.captured = Number(report.summary?.capturedFrames || 0);
  s.studioErrors = (report.errors || []).map(e => String(e).slice(0, 200)).slice(0, 5);
  const text = (report.log || []).map(r => (typeof r.out === 'string' ? r.out : '')).join('\n');
  // 마지막 값(두 번 측정했으면 나중 값)을 쓴다
  const last = re => { let m, v = null; const g = new RegExp(re, 'g'); while ((m = g.exec(text))) v = m; return v; };
  let m = last('HEALTH_ERR n=(\\d+) first=([^\\n]*)');
  if (m) { s.ok = true; s.err = +m[1]; s.errFirst = m[2].trim(); }
  for (const mm of text.matchAll(/CHK (\w+) view=(\S+) texts=\d+ issues=(\d+)([^\n]*)/g)) {
    s.ok = true;
    if (+mm[3] > 0) s.cardIssues.push(`${mm[1]}(${mm[2]}): ${mm[4].replace(/^\s*;\s*/, '').slice(0, 160)}`);
  }
  for (const mm of text.matchAll(/ERR (Client|Server) count=(\d+)/g)) s.cardErr += +mm[2];
  m = last('HEALTH_ASSET fail=(\\d+) total=(\\d+) ids=([^\\n]*)');
  if (m) { s.ok = true; s.assetFail = +m[1]; s.assetTotal = +m[2]; s.failedIds = m[3].split(',').map(x => x.replace(/\D/g, '')).filter(Boolean); }
  m = last('HEALTH_WORLD mobs=(\\d+) mobhp=(\\d+) parts=(\\d+)');
  if (m) { s.mobs = +m[1]; s.mobHp = +m[2]; s.parts = +m[3]; }
  m = last('HEALTH_UI ([^\\n]*)');
  if (m) for (const kv of m[1].trim().split(/\s+/)) { const [k, v] = kv.split('='); if (k) s.ui[k] = +v || 0; }
  m = last('HEALTH_LIGHT clock=([\\d.]+) bright=([\\d.]+) atmos=(true|false) sky=(true|false)');
  if (m) s.light = { clock: +m[1], bright: +m[2], atmos: m[3] === 'true', sky: m[4] === 'true' };
  return s;
}

// ---- 발견(작업 지시서): 신호에서 "무엇이 잘못됐거나 약한지"를 뽑는다 ------------------------------
const FALLBACK_GROUP = { background: ['background'], combat: ['combat'], ui: ['ui'] };
export function findingsFrom(game, s) {
  const f = [];
  if (s.aborted || (!s.ok && s.captured === 0 && s.studioErrors.length))
    f.push({ id: 'studio-unreachable', kind: 'infra', task: 'health', text: 'Studio 점검이 중간에 멈춤: ' + (s.studioErrors[0] || '원인 불명') });
  if (s.err > 0) f.push({ id: 'console-errors', kind: 'error', task: 'health', text: `콘솔 오류 ${s.err}건. 첫 오류: ${s.errFirst}` });
  if (s.cardErr > 0) f.push({ id: 'card-console-errors', kind: 'error', task: 'cards', text: `카드 화면 점검 중 콘솔 오류 ${s.cardErr}건` });
  if (s.cardIssues.length) f.push({ id: 'card-ui-issues', kind: 'ui', task: 'cards', text: '카드 화면 글자 잘림/겹침: ' + s.cardIssues.slice(0, 3).join(' | ') });
  if (s.assetFail > 0) f.push({ id: 'asset-fail', kind: 'asset_link', task: 'health', text: `화면 이미지 ${s.assetFail}/${s.assetTotal} 불러오기 실패. ID: ${s.failedIds.slice(0, 8).join(',')}`, ids: s.failedIds });
  if (s.ok && s.mobs === 0) f.push({ id: 'no-mobs', kind: 'combat', task: 'combat', text: '월드에 몹이 하나도 없음(전투 점검 필요)' });
  const ui = Object.entries(s.ui).filter(([, v]) => v === 0).map(([k]) => k);
  if (s.ok && ui.length && Object.keys(s.ui).length) f.push({ id: 'ui-missing', kind: 'ui', task: 'ui', text: '화면에 없는 UI 글자: ' + ui.join(', ') });
  if (s.light && (!s.light.atmos || !s.light.sky)) f.push({ id: 'sky-missing', kind: 'background', task: 'background', text: `배경 연출 약함: 대기 ${s.light.atmos ? '있음' : '없음'}, 하늘 ${s.light.sky ? '있음' : '없음'}` });
  if (s.parts !== null && s.parts < 300) f.push({ id: 'sparse-world', kind: 'background', task: 'background', text: `월드 부품이 적음(${s.parts})` });
  return f.map(x => ({ ...x, game, fingerprint: game + ':' + x.id }));
}

// ---- 점수와 선택 -------------------------------------------------------------------------------
export function emptyLedger() { return { v: 1, tasks: {}, lastReport: {}, orders: {} }; }

const taskKey = (game, kind) => game + ':' + kind;

export function payoff(rec) {
  // 발견이 있었던 비율(최근 값에 더 가중). 처음엔 0.5 로 시작해 탐색한다.
  if (!rec || !rec.runs) return 0.5;
  return rec.ema ?? 0.5;
}

export function scoreTasks({ signals, ledger, now = Date.now(), queued = 0, heads = {}, gameId = '' }) {
  const rows = [];
  const hist = ledger.history || [];
  for (const game of Object.keys(GAMES)) {
    if (gameId && game !== gameId) continue;
    const s = signals[game] || parseReport(null);
    const found = findingsFrom(game, s);
    for (const kind of Object.keys(GAMES[game].scripts)) {
      const k = KINDS[kind], rec = ledger.tasks[taskKey(game, kind)] || {};
      const sinceMin = rec.lastAt ? (now - rec.lastAt) / 60000 : Infinity;
      const due = Math.min(2, sinceMin / k.cooldown);          // 오래 안 했을수록 가산(최대 2)
      const urgency = found.filter(x => x.task === kind || (x.task === k.group && kind === groupLead(game, k.group))).reduce((a, x) => a + (x.kind === 'error' || x.kind === 'infra' ? 4 : 3), 0);
      const learned = payoff(rec) * 2;
      // 같은 점검을 연달아 하지 않는다: 직전 선택 -4, 최근 4번 안 -2, 같은 영역(group)이 최근 3번 안에 있으면 -1.5
      const recent = hist.slice(-4);
      let repeat = 0;
      if (hist.length && hist[hist.length - 1] === taskKey(game, kind)) repeat += 4;
      else if (recent.includes(taskKey(game, kind))) repeat += 2;
      const lastGroups = hist.slice(-3).map(h => KINDS[h.split(':')[1]]?.group);
      if (lastGroups.includes(k.group)) repeat += 1.5;
      // 아직 한 번도 안 해 본 점검은 가산: 다양하게 훑는다
      const fresh = rec.runs || rec.lastAt ? 0 : 2.5;
      // 코드가 마지막 점검 이후 안 바뀌었고 결과가 깨끗했으면 3일간 건너뛴다(같은 것만 되풀이하지 않음)
      const head = heads[game];
      const unchanged = !!(head && rec.lastSha === head && rec.lastResult === 'CLEAN' && sinceMin < 3 * DAY && urgency === 0);
      const blocked = (sinceMin < k.cooldown && urgency < 6) || unchanged;
      const penalty = Math.min(4, rec.failStreak || 0) * 1.5;    // 점검 자체가 계속 실패하면 쉬어 간다
      const score = k.base + due * 2 + urgency + learned + fresh - repeat - penalty;
      rows.push({ game, kind, area: k.area, group: k.group, score: +score.toFixed(2), blocked, unchanged, sinceMin: Number.isFinite(sinceMin) ? Math.round(sinceMin) : null, urgency, why: why({ sinceMin, found: found.filter(x => x.task === kind), penalty, repeat, fresh, unchanged }) });
    }
  }
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

// 신호가 "background" 같은 영역만 가리킬 때, 그 게임에서 그 영역의 첫 종류가 맡는다.
function groupLead(game, group) {
  return Object.keys(GAMES[game].scripts).find(k => KINDS[k].group === group);
}

function why({ sinceMin, found, penalty, repeat, fresh, unchanged }) {
  const p = [];
  if (found.length) p.push('발견: ' + found.map(x => x.id).join(','));
  p.push(Number.isFinite(sinceMin) ? `마지막 점검 ${Math.round(sinceMin)}분 전` : '아직 점검한 적 없음');
  if (fresh) p.push('새 영역 가산');
  if (repeat) p.push('최근에 해서 감점');
  if (unchanged) p.push('코드 변화 없음(건너뜀)');
  if (penalty) p.push('점검이 연속 실패해 감점');
  return p.join(' · ');
}

// Studio 는 한 대뿐이라 한 번에 하나만 보낸다. 대기열이 2개 이상이면 쉰다.
export function decide({ signals, ledger, now = Date.now(), queued = 0, budget = 1, heads = {}, gameId = '' }) {
  const rows = scoreTasks({ signals, ledger, now, queued, heads, gameId });
  if (queued >= 2) return { picks: [], rows, skipped: `Studio 대기열이 ${queued}개라 이번엔 쉰다` };
  // 점검이 연달아 실패해도 계속 돌지 않게, 방금 보냈으면 10분은 쉰다(점검이 끝날 때마다 이어 실행되는 구조의 안전판)
  if (ledger.lastDispatchAt && (now - ledger.lastDispatchAt) / 60000 < MIN_GAP_MIN) return { picks: [], rows, skipped: `방금 점검을 보냈다(${MIN_GAP_MIN}분 간격)` };
  const picks = rows.filter(r => !r.blocked).slice(0, budget);
  return { picks, rows, skipped: picks.length ? '' : '모든 점검이 쿨다운 중' };
}

// ---- 원장 갱신: 지난번에 보낸 점검의 결과를 새 report 로 평가해 학습한다 ------------------------
export function reportHash(r) { return r ? JSON.stringify([r.summary, (r.errors || []).length, (r.log || []).length, (r.log || []).slice(-1)]) : ''; }

export function learn({ ledger, reports, signals, now = Date.now() }) {
  const out = JSON.parse(JSON.stringify(ledger));
  for (const game of Object.keys(GAMES)) {
    const h = reportHash(reports[game]);
    if (!h || out.lastReport[game] === h) continue;                 // 새 결과가 아니면 건너뜀
    out.lastReport[game] = h;
    const pending = Object.entries(out.tasks).filter(([k, r]) => k.startsWith(game + ':') && r.pending).sort((a, b) => b[1].lastAt - a[1].lastAt)[0];
    const s = signals[game];
    const found = findingsFrom(game, s);
    // 새 지시서 등록(같은 지문은 한 번만, 해결되면 사라짐)
    const now_ids = new Set(found.map(x => x.fingerprint));
    for (const x of found) if (!out.orders[x.fingerprint]) out.orders[x.fingerprint] = { ...x, firstAt: now, lastAt: now, seen: 1 }; else { out.orders[x.fingerprint].lastAt = now; out.orders[x.fingerprint].seen++; out.orders[x.fingerprint].text = x.text; }
    for (const [fp, o] of Object.entries(out.orders)) if (o.game === game && !now_ids.has(fp) && !o.resolvedAt) o.resolvedAt = now;
    if (pending) {
      const [k, rec] = pending;
      const hit = found.length > 0 ? 1 : 0;
      const failed = s.aborted || !s.ok;
      rec.runs = (rec.runs || 0) + 1;
      rec.ema = +(0.7 * (rec.ema ?? 0.5) + 0.3 * hit).toFixed(3);
      rec.failStreak = failed ? (rec.failStreak || 0) + 1 : 0;
      rec.lastResult = failed ? 'FAILED' : (hit ? 'FOUND' : 'CLEAN');
      rec.pending = false;
    }
  }
  return out;
}

export function markDispatched(ledger, pick, now = Date.now(), head = '') {
  const out = JSON.parse(JSON.stringify(ledger));
  const k = taskKey(pick.game, pick.kind);
  out.tasks[k] = { ...(out.tasks[k] || {}), lastAt: now, pending: true, lastSha: head || (out.tasks[k] || {}).lastSha || '' };
  out.history = [...(out.history || []), k].slice(-12);
  out.lastDispatchAt = now;
  return out;
}

export function openOrders(ledger) {
  return Object.values(ledger.orders || {}).filter(o => !o.resolvedAt).sort((a, b) => (b.seen - a.seen) || (a.firstAt - b.firstAt));
}

// ---- 실행 ---------------------------------------------------------------------------------------
export function dispatchPlan(pick) {
  const g = GAMES[pick.game];
  return ['api', '-X', 'POST', 'repos/hans1177/jaewoon-games/actions/workflows/devloop-studio.yml/dispatches', '-f', 'ref=main', '-f', 'inputs[game]=' + pick.game, '-f', 'inputs[script]=' + g.scripts[pick.kind]];
}

function readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; } }

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const arg = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : ''; };
  const ledgerFile = arg('ledger') || 'build/autopilot-ledger.json';
  const reportsDir = arg('reports') || 'build/reports';
  const queued = Number(arg('queued') || 0);
  const heads = readJson(arg('heads') || 'build/heads.json', {});
  const run = a.includes('--run');
  let ledger = readJson(ledgerFile, emptyLedger());
  const reports = {}, signals = {};
  for (const g of Object.keys(GAMES)) { reports[g] = readJson(path.join(reportsDir, g + '.json'), null); signals[g] = parseReport(reports[g]); }
  ledger = learn({ ledger, reports, signals });
  const d = decide({ signals, ledger, queued, heads, gameId: arg('game'), budget: Number(arg('budget') || 1) });
  console.log('상위 점검 후보:');
  for (const r of d.rows.slice(0, 6)) console.log(` ${r.blocked ? '·' : '▶'} ${r.game} ${r.kind} 점수 ${r.score} — ${r.why}`);
  if (d.skipped) console.log('건너뜀:', d.skipped);
  for (const p of d.picks) {
    console.log(`선택: ${p.game} / ${p.area}`);
    if (run) {
      const r = spawnSync('gh', dispatchPlan(p), { encoding: 'utf8' });
      if (r.status === 0) ledger = markDispatched(ledger, p, Date.now(), heads[p.game] || ''); else console.log('dispatch 실패:', (r.stderr || '').slice(0, 200));
    }
  }
  fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n');
  const orders = openOrders(ledger);
  fs.writeFileSync(path.join(path.dirname(ledgerFile), 'autopilot-orders.json'), JSON.stringify(orders, null, 2) + '\n');
  console.log(`열린 작업 지시서 ${orders.length}건`);
  for (const o of orders.slice(0, 8)) console.log(` - [${o.game}/${o.kind}] ${o.text}`);
}
