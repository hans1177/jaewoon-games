import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const TAX_INTERVAL = 20;
const TAX_GOLD = 10;
const BOUNTY_REFRESH_MS = 5 * 60 * 1000;
const BOARD = { x: 520, y: 1035, radius: 92 };
const BOUNTIES = {
  wolf: { label: '🐺 늑대 3마리 처치', target: 3, reward: 120 },
  bear: { label: '🐻 곰 2마리 처치', target: 2, reward: 180 },
  snake: { label: '🐍 뱀 2마리 처치', target: 2, reward: 150 }
};

let currentGame = null;
let activeRuntime = null;
let lastTick = performance.now();
let lastToastKillAt = 0;
let lastToastKillText = '';
const wolfAlive = new Map();
const northAlive = new Map();

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.bountyTaxV6 && typeof state.bountyTaxV6 === 'object' ? state.bountyTaxV6 : {};
  state.bountyTaxV6 = old;
  old.taxElapsed = Math.max(0, Math.min(TAX_INTERVAL, Number(old.taxElapsed) || 0));
  old.taxEarned = Math.max(0, Math.floor(Number(old.taxEarned) || 0));
  old.bounty ||= {};
  old.bounty.type = ['wolf', 'bear', 'snake'].includes(old.bounty.type) ? old.bounty.type : '';
  old.bounty.progress = Math.max(0, Math.floor(Number(old.bounty.progress) || 0));
  old.bounty.refreshAt = Math.max(0, Number(old.bounty.refreshAt) || 0);
  old.bounty.completed = Boolean(old.bounty.completed);
  return old;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithBountyTax(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithBountyTax(state, delay) {
  activeRuntime = this;
  ensureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function save() {
  if (!currentGame?.state) return;
  ensureState(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bountyEligibleTypes() {
  const types = ['wolf'];
  if (currentGame?.state?.northernRegion?.unlocked) types.push('snake');
  if (currentGame?.state?.cozyExpansionV4?.west?.unlocked) types.push('bear');
  return types;
}

function issueBounty(forceDifferent = false) {
  if (!currentGame) return;
  const s = ensureState(currentGame.state);
  const prior = s.bounty.type;
  let choices = bountyEligibleTypes();
  if (forceDifferent && choices.length > 1) choices = choices.filter(type => type !== prior);
  const type = choices[Math.floor(Math.random() * choices.length)] || 'wolf';
  s.bounty.type = type;
  s.bounty.progress = 0;
  s.bounty.completed = false;
  s.bounty.refreshAt = Date.now() + BOUNTY_REFRESH_MS;
  save();
}

function ensureBounty() {
  if (!currentGame) return;
  const s = ensureState(currentGame.state);
  if (!s.bounty.type || !s.bounty.refreshAt) {
    issueBounty(false);
    return;
  }
  if (Date.now() >= s.bounty.refreshAt) {
    issueBounty(true);
    toast('📜 현상금 게시판에 새로운 의뢰가 올라왔어');
  }
}

function addBountyKill(type) {
  if (!currentGame) return;
  ensureBounty();
  const s = ensureState(currentGame.state);
  if (s.bounty.completed || s.bounty.type !== type) return;
  const def = BOUNTIES[type];
  s.bounty.progress = Math.min(def.target, s.bounty.progress + 1);
  if (s.bounty.progress >= def.target) {
    s.bounty.completed = true;
    currentGame.state.coins = (Number(currentGame.state.coins) || 0) + def.reward;
    save();
    toast(`📜 현상금 완료! ${def.reward}골드 획득`);
  } else {
    save();
    toast(`📜 현상금 진행 ${s.bounty.progress}/${def.target}`);
  }
  renderBoardPanelIfOpen();
}

function trackWolfKills() {
  if (!currentGame) return;
  for (const wolf of currentGame.wolves || []) {
    if (!wolf || wolf.boss || wolf.id === 99) continue;
    const key = `base:${wolf.id}`;
    const alive = Boolean(wolf.alive && wolf.hp > 0);
    if (!wolfAlive.has(key)) wolfAlive.set(key, alive);
    else {
      const was = wolfAlive.get(key);
      if (was && !alive) addBountyKill('wolf');
      wolfAlive.set(key, alive);
    }
  }

  for (const mob of currentGame.northernMobs || []) {
    if (!mob || !['wolf', 'snake'].includes(mob.type)) continue;
    const key = `north:${mob.id}`;
    const alive = Boolean(mob.alive && mob.hp > 0);
    const signature = `${mob.type}:${alive}`;
    if (!northAlive.has(key)) northAlive.set(key, signature);
    else {
      const previous = northAlive.get(key);
      const [oldType, oldAlive] = String(previous).split(':');
      if (oldAlive === 'true' && !alive) addBountyKill(oldType === 'snake' ? 'snake' : 'wolf');
      northAlive.set(key, signature);
    }
  }
}

function watchBearToast() {
  const el = document.querySelector('#toast');
  if (!el || el.__bountyBearObserver) return;
  el.__bountyBearObserver = true;
  const observer = new MutationObserver(() => {
    const text = el.textContent || '';
    if (!text.includes('야생 곰을 처치했어')) return;
    const now = performance.now();
    if (text === lastToastKillText && now - lastToastKillAt < 900) return;
    lastToastKillText = text;
    lastToastKillAt = now;
    addBountyKill('bear');
  });
  observer.observe(el, { childList: true, characterData: true, subtree: true });
}

function updateTax(dt) {
  if (!currentGame || document.hidden || activeRuntime?.paused || document.querySelector('dialog[open]')) return;
  const s = ensureState(currentGame.state);
  s.taxElapsed += dt;
  let paid = 0;
  while (s.taxElapsed >= TAX_INTERVAL) {
    s.taxElapsed -= TAX_INTERVAL;
    currentGame.state.coins = (Number(currentGame.state.coins) || 0) + TAX_GOLD;
    s.taxEarned += TAX_GOLD;
    paid += TAX_GOLD;
  }
  if (paid > 0) {
    save();
    toast(`🏘️ 마을 세금 +${paid}골드`);
  }
}

function removeWolfHideSale() {
  document.querySelectorAll('[data-sell-wolf-hide]').forEach(button => button.remove());
}

window.addEventListener('click', event => {
  if (!event.target?.closest?.('[data-sell-wolf-hide]')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  toast('🐺 늑대가죽은 이제 판매할 수 없어');
}, true);

function nearBoard() {
  return Boolean(currentGame?.player && distance(currentGame.player, BOARD) <= BOARD.radius);
}

function bountyText() {
  if (!currentGame) return '';
  ensureBounty();
  const s = ensureState(currentGame.state);
  const def = BOUNTIES[s.bounty.type] || BOUNTIES.wolf;
  return `${def.label} · ${Math.min(s.bounty.progress, def.target)}/${def.target} · 보상 ${def.reward}골드`;
}

function formatTime(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function renderBoardPanel() {
  if (!currentGame) return;
  ensureBounty();
  const s = ensureState(currentGame.state);
  const def = BOUNTIES[s.bounty.type] || BOUNTIES.wolf;
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  const panel = document.querySelector('#panel');
  if (!title || !body || !panel) return;
  title.textContent = '현상금 게시판';
  body.innerHTML = `<div class="inventory-grid">
    <div class="item-card">📜 현재 의뢰<span>${s.bounty.completed ? '완료' : '진행중'}</span></div>
    <div class="item-card">🎯 진행도<span>${Math.min(s.bounty.progress, def.target)}/${def.target}</span></div>
    <div class="item-card">🪙 보상<span>${def.reward}골드</span></div>
    <div class="item-card">⏱️ 새 의뢰<span>${formatTime(s.bounty.refreshAt - Date.now())}</span></div>
    <div class="item-card">🏘️ 세금<span>20초마다 +10</span></div>
    <div class="item-card">💰 누적 세금<span>${s.taxEarned}골드</span></div>
  </div>
  <p class="panel-note" style="margin-top:10px">${def.label}</p>
  <p class="panel-note">의뢰는 5분마다 새로 바뀌어. 완료하면 보상은 즉시 지급돼.</p>`;
  if (!panel.open) panel.showModal();
}

function renderBoardPanelIfOpen() {
  const panel = document.querySelector('#panel');
  if (panel?.open && document.querySelector('#panelTitle')?.textContent === '현상금 게시판') renderBoardPanel();
}

const action = document.querySelector('#actionButton');
action?.addEventListener('pointerdown', event => {
  if (!nearBoard()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderBoardPanel();
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || !nearBoard()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderBoardPanel();
}, true);

function patchHint() {
  if (!nearBoard()) return;
  const hint = document.querySelector('#hint');
  if (hint) hint.textContent = `행동: 현상금 게시판 · ${bountyText()}`;
}

function patchInventory() {
  const title = document.querySelector('#panelTitle')?.textContent || '';
  const body = document.querySelector('#panelBody');
  if (!body || title !== '가방' || !currentGame) return;
  let note = body.querySelector('[data-tax-status]');
  if (!note) {
    note = document.createElement('p');
    note.className = 'panel-note';
    note.dataset.taxStatus = '1';
    body.appendChild(note);
  }
  const s = ensureState(currentGame.state);
  note.textContent = `🏘️ 마을 세금 · 20초마다 10골드 · 누적 ${s.taxEarned}골드`;
}

function tick() {
  const now = performance.now();
  const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!currentGame) return;
  ensureBounty();
  updateTax(dt);
  trackWolfKills();
  removeWolfHideSale();
  patchHint();
  patchInventory();
  renderBoardPanelIfOpen();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithBountyTax(game) {
  currentGame = game;
  ensureState(game.state);
  ensureBounty();
  const result = originalDraw.call(this, game);
  removeWolfHideSale();
  patchHint();
  patchInventory();
  return result;
};

rendererProto.drawObjects = function drawObjectsWithBountyBoard(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a633e';
  ctx.fillRect(BOARD.x - 50, BOARD.y - 44, 100, 70);
  ctx.fillStyle = '#6c4d31';
  ctx.fillRect(BOARD.x - 43, BOARD.y - 37, 86, 48);
  ctx.fillStyle = '#f5e8bf';
  ctx.fillRect(BOARD.x - 35, BOARD.y - 30, 70, 34);
  ctx.font = '25px system-ui';
  ctx.fillText('📜', BOARD.x, BOARD.y - 4);
  ctx.fillStyle = '#315748';
  ctx.font = '800 11px system-ui';
  ctx.fillText('현상금 게시판', BOARD.x, BOARD.y + 43);
  ctx.restore();
};

watchBearToast();
setInterval(tick, 250);
