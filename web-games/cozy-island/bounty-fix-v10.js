import { IslandRendererV3 } from './render-v3.js';

const STORAGE_KEY = 'jaewoon-games:cozy-island';
const FAR_FUTURE = 4102444800000;
const BOARD = { x: 520, y: 1035, radius: 92 };
const BOUNTIES = {
  wolf: { label: '🐺 늑대 3마리 처치', target: 3, reward: 120 },
  bear: { label: '🐻 곰 2마리 처치', target: 2, reward: 180 },
  snake: { label: '🐍 뱀 2마리 처치', target: 2, reward: 150 }
};

let currentGame = null;
let lastPersistSignature = '';
let lastBearToastAt = 0;
const wolfAlive = new Map();
const northAlive = new Map();

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function ensureState() {
  if (!currentGame?.state) return null;
  const state = currentGame.state;
  state.bountyTaxV6 ||= {};
  state.bountyTaxV6.bounty ||= {};
  state.rulesV7 ||= {};
  state.rulesV7.bounty ||= {};

  const rules = state.rulesV7.bounty;
  const bounty = state.bountyTaxV6.bounty;
  rules.initialized = true;
  rules.selected = ['wolf', 'bear', 'snake'].includes(rules.selected) ? rules.selected : '';
  bounty.type = ['wolf', 'bear', 'snake'].includes(bounty.type) ? bounty.type : '';
  bounty.progress = Math.max(0, Math.floor(Number(bounty.progress) || 0));
  bounty.completed = Boolean(bounty.completed);
  bounty.refreshAt = FAR_FUTURE;

  // 선택 상태가 있으면 실제 카운터와 항상 같은 종류를 바라보게 한다.
  if (rules.selected) bounty.type = rules.selected;
  return { rules, bounty };
}

function persistNow(force = false) {
  if (!currentGame?.state) return;
  const data = ensureState();
  if (!data) return;
  const signature = `${data.rules.selected}|${data.bounty.type}|${data.bounty.progress}|${data.bounty.completed}|${currentGame.state.coins}`;
  if (!force && signature === lastPersistSignature) return;
  lastPersistSignature = signature;
  try {
    const root = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    root.progress = currentGame.state;
    root.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {}
  const coins = document.querySelector('#coinText');
  if (coins) coins.textContent = String(Math.floor(Number(currentGame.state.coins) || 0));
}

function selectBounty(type) {
  if (!currentGame || !BOUNTIES[type]) return;
  const data = ensureState();
  if (!data) return;
  data.rules.selected = type;
  data.bounty.type = type;
  data.bounty.progress = 0;
  data.bounty.completed = false;
  data.bounty.refreshAt = FAR_FUTURE;
  persistNow(true);
  renderPanel(true);
  toast(`📜 현상금 선택 · ${BOUNTIES[type].label}`);
}

function completeOrIncrement(type) {
  const data = ensureState();
  if (!data || data.rules.selected !== type || data.bounty.completed) return false;
  const def = BOUNTIES[type];
  data.bounty.type = type;
  data.bounty.progress = Math.min(def.target, data.bounty.progress + 1);
  if (data.bounty.progress >= def.target) {
    data.bounty.completed = true;
    currentGame.state.coins = (Number(currentGame.state.coins) || 0) + def.reward;
    toast(`📜 현상금 완료! ${def.reward}골드 획득`);
  } else {
    toast(`📜 현상금 진행 ${data.bounty.progress}/${def.target}`);
  }
  persistNow(true);
  renderPanel(true);
  return true;
}

function scheduleFallbackKill(type) {
  const data = ensureState();
  if (!data || data.rules.selected !== type || data.bounty.completed) return;
  const baseline = data.bounty.progress;
  setTimeout(() => {
    if (!currentGame) return;
    const now = ensureState();
    if (!now || now.rules.selected !== type || now.bounty.completed) return;
    // 기존 bounty-tax-v6가 정상 카운트했다면 중복 증가하지 않는다.
    if (now.bounty.progress > baseline) {
      persistNow(true);
      renderPanel(true);
      return;
    }
    completeOrIncrement(type);
  }, 420);
}

function trackKills() {
  if (!currentGame) return;

  for (const wolf of currentGame.wolves || []) {
    if (!wolf || wolf.boss || wolf.id === 99) continue;
    const key = `base:${wolf.id}`;
    const alive = Boolean(wolf.alive && wolf.hp > 0);
    if (wolfAlive.has(key) && wolfAlive.get(key) && !alive) scheduleFallbackKill('wolf');
    wolfAlive.set(key, alive);
  }

  for (const mob of currentGame.northernMobs || []) {
    if (!mob || !['wolf', 'snake'].includes(mob.type)) continue;
    const key = `north:${mob.id}`;
    const signature = `${mob.type}:${Boolean(mob.alive && mob.hp > 0)}`;
    if (northAlive.has(key)) {
      const [oldType, oldAlive] = String(northAlive.get(key)).split(':');
      if (oldAlive === 'true' && !(mob.alive && mob.hp > 0)) {
        scheduleFallbackKill(oldType === 'snake' ? 'snake' : 'wolf');
      }
    }
    northAlive.set(key, signature);
  }
}

function watchBearToast() {
  const el = document.querySelector('#toast');
  if (!el || el.__bountyFixV10Observer) return;
  el.__bountyFixV10Observer = true;
  const observer = new MutationObserver(() => {
    const text = el.textContent || '';
    if (!text.includes('야생 곰을 처치했어')) return;
    const now = performance.now();
    if (now - lastBearToastAt < 900) return;
    lastBearToastAt = now;
    scheduleFallbackKill('bear');
  });
  observer.observe(el, { childList: true, characterData: true, subtree: true });
}

function regionNote(type) {
  if (type === 'snake' && !currentGame?.state?.northernRegion?.unlocked) return ' · 북쪽 미해금';
  if (type === 'bear' && !currentGame?.state?.cozyExpansionV4?.west?.unlocked) return ' · 서쪽 미해금';
  return '';
}

function renderPanel(force = false) {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!panel?.open || title?.textContent !== '현상금 게시판' || !body) return;

  const data = ensureState();
  const selected = data.rules.selected;
  const def = BOUNTIES[selected];
  const taxEarned = Math.max(0, Math.floor(Number(currentGame.state.bountyTaxV6.taxEarned) || 0));
  const signature = `${selected}|${data.bounty.progress}|${data.bounty.completed}|${taxEarned}|${Boolean(currentGame.state.northernRegion?.unlocked)}|${Boolean(currentGame.state.cozyExpansionV4?.west?.unlocked)}`;
  if (!force && body.dataset.bountyV10 === signature && body.querySelector('[data-bounty-v10-grid]')) return;

  body.innerHTML = `<div class="inventory-grid">
    <div class="item-card">📜 선택 의뢰<span>${def ? (data.bounty.completed ? '완료' : '진행중') : '없음'}</span></div>
    <div class="item-card">🎯 진행도<span>${def ? `${Math.min(data.bounty.progress, def.target)}/${def.target}` : '-'}</span></div>
    <div class="item-card">🪙 보상<span>${def ? `${def.reward}골드` : '-'}</span></div>
    <div class="item-card">🏘️ 세금<span>20초마다 +10</span></div>
    <div class="item-card">💰 누적 세금<span>${taxEarned}골드</span></div>
  </div>
  <p class="panel-note" style="margin-top:10px">현상금을 직접 선택해. 완료한 현상금도 다시 선택하면 0부터 새로 시작해.</p>
  <div class="choice-grid" data-bounty-v10-grid>
    ${Object.entries(BOUNTIES).map(([type, item]) => {
      const active = selected === type && !data.bounty.completed;
      return `<button class="choice" data-bounty-v10-choice="${type}"><span>${item.label}${regionNote(type)}</span><b>${active ? '진행 중' : `${item.reward}골드`}</b></button>`;
    }).join('')}
  </div>`;
  body.dataset.bountyV10 = signature;
}

// 기존 rules-v7의 버튼과 v10 버튼 둘 다 전역 캡처로 처리한다.
window.addEventListener('click', event => {
  const button = event.target?.closest?.('[data-bounty-v10-choice], [data-bounty-choice]');
  if (!button) return;
  const type = button.dataset.bountyV10Choice || button.dataset.bountyChoice;
  if (!BOUNTIES[type]) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  selectBounty(type);
}, true);

function nearBoard() {
  return Boolean(currentGame?.player && Math.hypot(currentGame.player.x - BOARD.x, currentGame.player.y - BOARD.y) <= BOARD.radius);
}

function patchHint() {
  if (!nearBoard()) return;
  const hint = document.querySelector('#hint');
  if (!hint) return;
  const data = ensureState();
  const def = BOUNTIES[data.rules.selected];
  hint.textContent = def
    ? `행동: 현상금 게시판 · ${def.label} ${Math.min(data.bounty.progress, def.target)}/${def.target}`
    : '행동: 현상금 게시판 · 원하는 현상금 선택';
}

function tick() {
  if (!currentGame) return;
  ensureState();
  trackKills();
  watchBearToast();
  renderPanel(false);
  patchHint();
  persistNow(false);
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithBountyFixV10(game) {
  currentGame = game;
  ensureState();
  const result = originalDraw.call(this, game);
  tick();
  return result;
};

const observer = new MutationObserver(() => {
  if (!currentGame) return;
  queueMicrotask(() => renderPanel(false));
});
observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });

setInterval(tick, 90);
