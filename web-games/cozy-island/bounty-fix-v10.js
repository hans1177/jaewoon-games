import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const BOARD = { x: 520, y: 1035, radius: 92 };
const FAR_FUTURE = 4102444800000;
const BOUNTIES = {
  wolf: { label: '🐺 늑대 3마리 처치', target: 3, reward: 120 },
  bear: { label: '🐻 곰 2마리 처치', target: 2, reward: 180 },
  snake: { label: '🐍 뱀 2마리 처치', target: 2, reward: 150 }
};

let currentGame = null;
let activeRuntime = null;
let lastPersistSignature = '';
let lastBearToastAt = 0;
const wolfAlive = new Map();
const northAlive = new Map();

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;
JaewoonVibeRuntime.prototype.loadProgress = function loadWithBountyFix(fallback = {}) {
  activeRuntime = this;
  const state = originalLoadProgress.call(this, fallback);
  ensureState(state);
  return state;
};
JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithBountyFix(state, delay) {
  activeRuntime = this;
  ensureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  state.bountyTaxV6 ||= {};
  state.bountyTaxV6.bounty ||= {};
  const bounty = state.bountyTaxV6.bounty;
  bounty.type = BOUNTIES[bounty.type] ? bounty.type : 'wolf';
  bounty.progress = Math.max(0, Math.floor(Number(bounty.progress) || 0));
  bounty.completed = Boolean(bounty.completed);
  bounty.refreshAt = FAR_FUTURE;

  state.rulesV7 ||= {};
  state.rulesV7.bounty ||= {};
  const rules = state.rulesV7.bounty;
  rules.initialized = true;
  rules.selected = BOUNTIES[rules.selected] ? rules.selected : (!bounty.completed && BOUNTIES[bounty.type] ? bounty.type : '');
  if (rules.selected) bounty.type = rules.selected;
  return { bounty, rules };
}

function saveNow() {
  if (!currentGame?.state) return;
  ensureState(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state, 0);
  const coins = document.querySelector('#coinText');
  if (coins) coins.textContent = String(Math.floor(Number(currentGame.state.coins) || 0));
}
function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function eligible(type) {
  if (type === 'wolf') return true;
  if (type === 'snake') return Boolean(currentGame?.state?.northernRegion?.unlocked);
  if (type === 'bear') return Boolean(currentGame?.state?.cozyExpansionV4?.west?.unlocked);
  return false;
}
function selectBounty(type) {
  if (!currentGame || !BOUNTIES[type]) return;
  if (!eligible(type)) {
    toast(type === 'snake' ? '🐍 북쪽 지역을 먼저 해금해야 해' : '🐻 서쪽 지역을 먼저 해금해야 해');
    return;
  }
  const { bounty, rules } = ensureState(currentGame.state);
  rules.selected = type;
  bounty.type = type;
  bounty.progress = 0;
  bounty.completed = false;
  bounty.refreshAt = FAR_FUTURE;
  saveNow();
  renderBoard(true);
  toast(`📜 현상금 선택 · ${BOUNTIES[type].label}`);
}

function renderBoard(force = false) {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '현상금 게시판') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  const { bounty, rules } = ensureState(currentGame.state);
  const selected = rules.selected;
  const def = BOUNTIES[selected];
  const tax = Math.max(0, Math.floor(Number(currentGame.state.bountyTaxV6.taxEarned) || 0));
  const signature = `${selected}:${bounty.progress}:${bounty.completed}:${eligible('snake')}:${eligible('bear')}:${tax}`;
  if (!force && body.dataset.bountyV10Signature === signature && body.querySelector('[data-bounty-v10-grid]')) return;
  body.innerHTML = `<div class="inventory-grid">
    <div class="item-card">📜 현재 현상금<span>${def ? (bounty.completed ? '완료' : '진행중') : '선택 안 함'}</span></div>
    <div class="item-card">🎯 진행도<span>${def ? `${Math.min(bounty.progress, def.target)}/${def.target}` : '-'}</span></div>
    <div class="item-card">🪙 보상<span>${def ? `${def.reward}골드` : '-'}</span></div>
    <div class="item-card">🏘️ 세금<span>20초마다 +10</span></div>
    <div class="item-card">💰 누적 세금<span>${tax}골드</span></div>
  </div>
  <p class="panel-note" style="margin-top:10px">원하는 현상금을 직접 선택해.</p>
  <div class="choice-grid" data-bounty-v10-grid>
    ${Object.entries(BOUNTIES).map(([type, item]) => {
      const can = eligible(type);
      const active = selected === type && !bounty.completed;
      const text = !can ? (type === 'snake' ? '북쪽 해금 필요' : '서쪽 해금 필요') : active ? '진행 중' : `${item.reward}골드`;
      return `<button class="choice" data-bounty-choice="${type}" ${!can ? 'disabled' : ''}><span>${item.label}</span><b>${text}</b></button>`;
    }).join('')}
  </div>
  <p class="panel-note">완료 후 같은 현상금도 다시 선택할 수 있어. 다른 현상금으로 바꾸면 진행도는 0부터 시작해.</p>`;
  body.dataset.bountyV10Signature = signature;
}

window.addEventListener('click', event => {
  const button = event.target?.closest?.('[data-bounty-choice]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  selectBounty(button.dataset.bountyChoice);
}, true);

function activeType() {
  if (!currentGame) return '';
  const { bounty, rules } = ensureState(currentGame.state);
  return !bounty.completed ? rules.selected : '';
}
function fallbackKill(type, beforeProgress) {
  if (!currentGame || activeType() !== type) return;
  const { bounty } = ensureState(currentGame.state);
  if (bounty.progress !== beforeProgress || bounty.completed) return;
  const def = BOUNTIES[type];
  bounty.progress = Math.min(def.target, bounty.progress + 1);
  if (bounty.progress >= def.target) {
    bounty.completed = true;
    currentGame.state.coins = (Number(currentGame.state.coins) || 0) + def.reward;
    toast(`📜 현상금 완료! ${def.reward}골드 획득`);
  } else toast(`📜 현상금 진행 ${bounty.progress}/${def.target}`);
  saveNow();
  renderBoard(true);
}
function scheduleFallback(type) {
  if (!currentGame || activeType() !== type) return;
  const before = ensureState(currentGame.state).bounty.progress;
  setTimeout(() => fallbackKill(type, before), 650);
}

function trackKills() {
  if (!currentGame) return;
  for (const wolf of currentGame.wolves || []) {
    if (!wolf || wolf.boss || wolf.id === 99) continue;
    const key = `wolf:${wolf.id}`;
    const alive = Boolean(wolf.alive && wolf.hp > 0);
    if (!wolfAlive.has(key)) wolfAlive.set(key, alive);
    else {
      const was = wolfAlive.get(key);
      if (was && !alive) scheduleFallback('wolf');
      wolfAlive.set(key, alive);
    }
  }
  for (const mob of currentGame.northernMobs || []) {
    if (!mob || !['wolf', 'snake'].includes(mob.type)) continue;
    const key = `north:${mob.id}`;
    const signature = `${mob.type}:${Boolean(mob.alive && mob.hp > 0)}`;
    if (!northAlive.has(key)) northAlive.set(key, signature);
    else {
      const previous = northAlive.get(key);
      const [oldType, oldAlive] = String(previous).split(':');
      if (oldAlive === 'true' && signature.endsWith(':false')) scheduleFallback(oldType === 'snake' ? 'snake' : 'wolf');
      northAlive.set(key, signature);
    }
  }
}

const toastEl = document.querySelector('#toast');
if (toastEl) {
  const observer = new MutationObserver(() => {
    const text = toastEl.textContent || '';
    if (!text.includes('야생 곰을 처치했어')) return;
    const now = performance.now();
    if (now - lastBearToastAt < 900) return;
    lastBearToastAt = now;
    scheduleFallback('bear');
  });
  observer.observe(toastEl, { childList: true, characterData: true, subtree: true });
}

const body = document.querySelector('#panelBody');
if (body) {
  const observer = new MutationObserver(() => {
    if (document.querySelector('#panelTitle')?.textContent === '현상금 게시판') queueMicrotask(() => renderBoard(false));
  });
  observer.observe(body, { childList: true, subtree: true, characterData: true });
}

function persistBountyChanges() {
  if (!currentGame) return;
  const { bounty, rules } = ensureState(currentGame.state);
  const signature = `${rules.selected}:${bounty.type}:${bounty.progress}:${bounty.completed}`;
  if (signature === lastPersistSignature) return;
  lastPersistSignature = signature;
  saveNow();
}
function patchHint() {
  if (!currentGame?.player || distance(currentGame.player, BOARD) > BOARD.radius) return;
  const hint = document.querySelector('#hint');
  if (!hint) return;
  const { bounty, rules } = ensureState(currentGame.state);
  const def = BOUNTIES[rules.selected];
  hint.textContent = def ? `행동: 현상금 게시판 · ${def.label} ${Math.min(bounty.progress, def.target)}/${def.target}` : '행동: 현상금 게시판 · 현상금 선택';
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithBountyFixV10(game) {
  currentGame = game;
  ensureState(game.state);
  const result = originalDraw.call(this, game);
  renderBoard(false);
  patchHint();
  return result;
};

setInterval(() => {
  if (!currentGame) return;
  trackKills();
  renderBoard(false);
  patchHint();
  persistBountyChanges();
}, 80);
