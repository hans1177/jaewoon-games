import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const OLD_IRON_SITE = { x: 2610, y: 1680 };
const IRON_MINE = { x: 520, y: 1035, radius: 112, wood: 4, stone: 3, iron: 3, capacity: 25 };
const IRON_NODES = [
  { x: 2610, y: 1680 },
  { x: 1580, y: 1500 },
  { x: 1880, y: 1910 },
  { x: 2250, y: 1325 },
  { x: 2740, y: 1510 }
];
const IRON_NODE_RESPAWN_MS = 30000;
const DELIVERY_SECONDS = 60;
const FEED_SECONDS = 180;
const FEED_COST = 10;

let currentGame = null;
let activeRuntime = null;
let lastTick = performance.now();
let lastUiSignature = '';

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function workerNumber(value) {
  if (value && typeof value === 'object') return Math.max(0, Math.floor(Number(value.count) || 0));
  return Math.max(0, Math.floor(Number(value) || 0));
}

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  state.inventory ||= {};
  state.inventory.iron = Math.max(0, Math.floor(Number(state.inventory.iron) || 0));

  const root = state.ironWorkerV15 && typeof state.ironWorkerV15 === 'object' ? state.ironWorkerV15 : {};
  state.ironWorkerV15 = root;

  if (!root.migratedFromV14) {
    const old = state.villageExpansionV14 && typeof state.villageExpansionV14 === 'object' ? state.villageExpansionV14 : null;
    root.mineBuilt = Boolean(old?.ironMineBuilt);
    root.mineRemaining = Math.max(0, Math.min(IRON_MINE.capacity, Math.floor(Number(old?.ironMineRemaining) || (root.mineBuilt ? IRON_MINE.capacity : 0))));
    root.migratedFromV14 = true;
  }

  root.mineBuilt = Boolean(root.mineBuilt);
  root.mineRemaining = Math.max(0, Math.min(IRON_MINE.capacity, Math.floor(Number(root.mineRemaining) || (root.mineBuilt ? IRON_MINE.capacity : 0))));
  root.mineWorker = root.mineWorker ? 1 : 0;
  root.mineTimer = Math.max(0, Number(root.mineTimer) || 0);
  root.deliveryTimer = Math.max(0, Number(root.deliveryTimer) || 0);
  root.feedTimer = Math.max(0, Number(root.feedTimer) || 0);
  root.bufferIron = Math.max(0, Math.floor(Number(root.bufferIron) || 0));
  root.nodeReadyAt = Array.from({ length: IRON_NODES.length }, (_, i) => Math.max(0, Number(root.nodeReadyAt?.[i]) || 0));

  disableOldMine(state);
  reconcileWorkerTotal(state, root);
  return root;
}

function disableOldMine(state) {
  const old = state?.villageExpansionV14;
  if (!old || typeof old !== 'object') return;
  old.ironMineBuilt = false;
  old.ironMineRemaining = 0;
  old.ironMineLastAt = Date.now();
}

function productionState(state) {
  return state?.productionBuildings && typeof state.productionBuildings === 'object' ? state.productionBuildings : {};
}

function actualWorkers(state = currentGame?.state) {
  if (!state) return 0;
  const p = productionState(state);
  const iron = state.ironWorkerV15?.mineWorker ? 1 : 0;
  return Math.min(3, workerNumber(state.workers) + (p.lumberWorker ? 1 : 0) + (p.mineWorker ? 1 : 0) + iron);
}

function reconcileWorkerTotal(state, root = state?.ironWorkerV15) {
  if (!state) return;
  const p = productionState(state);
  const iron = root?.mineWorker ? 1 : 0;
  state.workerTotal = Math.min(3, workerNumber(state.workers) + (p.lumberWorker ? 1 : 0) + (p.mineWorker ? 1 : 0) + iron);
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithIronWorker(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithIronWorker(state, delay) {
  activeRuntime = this;
  const root = ensureState(state);
  reconcileWorkerTotal(state, root);
  const result = originalQueueSaveProgress.call(this, state, delay);
  reconcileWorkerTotal(state, root);
  return result;
};

function saveImmediate() {
  if (!currentGame?.state || !activeRuntime) return;
  const root = ensureState(currentGame.state);
  reconcileWorkerTotal(currentGame.state, root);
  activeRuntime.queueSaveProgress(currentGame.state, 0);
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
function jungleUnlocked() { return Boolean(currentGame?.state?.southernJungle?.unlocked); }
function lv2() { return Boolean(currentGame?.state?.townHallExpansion?.upgraded); }
function forgeBuilt() { return Boolean(currentGame?.state?.villageExpansionV14?.forgeBuilt); }

function nearIronNode() {
  if (!currentGame || !jungleUnlocked()) return null;
  const root = ensureState(currentGame.state);
  const now = Date.now();
  let best = null;
  let bestDistance = 90;
  IRON_NODES.forEach((node, index) => {
    const d = distance(currentGame.player, node);
    if (d < bestDistance) {
      best = { node, index, ready: root.nodeReadyAt[index] <= now };
      bestDistance = d;
    }
  });
  return best;
}

function collectIronNode(found = nearIronNode()) {
  if (!found) return false;
  const root = ensureState(currentGame.state);
  const now = Date.now();
  if (root.nodeReadyAt[found.index] > now) {
    toast(`⛓️ 철 광맥 재생까지 ${Math.ceil((root.nodeReadyAt[found.index] - now) / 1000)}초`);
    return true;
  }
  currentGame.state.inventory.iron = (Number(currentGame.state.inventory.iron) || 0) + 1;
  root.nodeReadyAt[found.index] = now + IRON_NODE_RESPAWN_MS;
  saveImmediate();
  toast('⛓️ 철 +1');
  return true;
}

function buildIronMine() {
  if (!currentGame || !lv2()) return toast('🏛️ 철 채굴장은 마을회관 Lv.2부터 지을 수 있어');
  const root = ensureState(currentGame.state);
  if (root.mineBuilt) return;
  const inv = currentGame.state.inventory || {};
  if ((Number(inv.wood) || 0) < IRON_MINE.wood || (Number(inv.stone) || 0) < IRON_MINE.stone || (Number(inv.iron) || 0) < IRON_MINE.iron) {
    return toast('⛏️ 철 채굴장 재료 부족 · 나무4 돌3 철3');
  }
  inv.wood -= IRON_MINE.wood;
  inv.stone -= IRON_MINE.stone;
  inv.iron -= IRON_MINE.iron;
  root.mineBuilt = true;
  root.mineRemaining = IRON_MINE.capacity;
  root.mineTimer = 0;
  root.deliveryTimer = 0;
  saveImmediate();
  toast('⛏️ 철 채굴장 완성 · 노비를 배치하면 철을 생산해');
}

function assignIronWorker() {
  if (!currentGame) return;
  const state = currentGame.state;
  const root = ensureState(state);
  if (!root.mineBuilt) return;

  if (root.mineWorker) {
    root.mineWorker = 0;
    state.workers = Math.min(3, workerNumber(state.workers) + 1);
    root.mineTimer = 0;
    root.feedTimer = 0;
    reconcileWorkerTotal(state, root);
    saveImmediate();
    toast('🧑‍🌾 철 채굴장 노비가 농사일로 돌아왔어');
    return;
  }

  if (workerNumber(state.workers) <= 0) return toast('배치할 노비가 없어 · 노비 판매소에서 고용하거나 농사 노비를 비워줘');
  if (actualWorkers(state) > 3) return toast('노비는 최대 3명이야');
  state.workers = Math.max(0, workerNumber(state.workers) - 1);
  root.mineWorker = 1;
  root.mineTimer = 0;
  root.feedTimer = 0;
  reconcileWorkerTotal(state, root);
  saveImmediate();
  toast('⛏️ 노비 1명을 철 채굴장에 배치했어');
}

function deliverIron(root) {
  if (!root.bufferIron) return false;
  const amount = root.bufferIron;
  root.bufferIron = 0;
  currentGame.state.inventory.iron = (Number(currentGame.state.inventory.iron) || 0) + amount;
  toast(`⛓️ 철 채굴장 지급 · 철 +${amount}`);
  return true;
}

function breakMine(root) {
  root.mineBuilt = false;
  if (root.mineWorker) {
    root.mineWorker = 0;
    currentGame.state.workers = Math.min(3, workerNumber(currentGame.state.workers) + 1);
  }
  deliverIron(root);
  root.mineTimer = 0;
  root.deliveryTimer = 0;
  root.feedTimer = 0;
  reconcileWorkerTotal(currentGame.state, root);
  toast('⛏️ 철 채굴장이 수명을 다했어 · 노비는 농사일로 돌아왔어');
}

function updateIronMine(dt) {
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  const root = ensureState(currentGame.state);
  if (!root.mineBuilt || !root.mineWorker || root.mineRemaining <= 0) return;

  let changed = false;
  const interval = forgeBuilt() ? 20 : 30;
  root.mineTimer += dt;
  root.deliveryTimer += dt;
  root.feedTimer += dt;

  while (root.mineTimer >= interval && root.mineRemaining > 0) {
    root.mineTimer -= interval;
    root.mineRemaining -= 1;
    root.bufferIron += 1;
    changed = true;
  }

  while (root.feedTimer >= FEED_SECONDS && root.mineWorker) {
    root.feedTimer -= FEED_SECONDS;
    const food = Number(currentGame.state.inventory?.food) || 0;
    if (food >= FEED_COST) {
      currentGame.state.inventory.food = food - FEED_COST;
      changed = true;
    } else {
      root.mineWorker = 0;
      root.mineTimer = 0;
      root.feedTimer = 0;
      reconcileWorkerTotal(currentGame.state, root);
      toast('⚠️ 식량 부족으로 철 채굴장 노비가 굶어 죽었어');
      changed = true;
    }
  }

  if (root.deliveryTimer >= DELIVERY_SECONDS) {
    root.deliveryTimer %= DELIVERY_SECONDS;
    if (deliverIron(root)) changed = true;
  }

  if (root.mineRemaining <= 0) {
    root.mineRemaining = 0;
    breakMine(root);
    changed = true;
  }

  if (changed) saveImmediate();
}

function mineAction() {
  if (!currentGame || !lv2() || distance(currentGame.player, IRON_MINE) > IRON_MINE.radius) return null;
  const root = ensureState(currentGame.state);
  if (!root.mineBuilt) return { type: 'build', label: '⛏️ 철 채굴장 건설 · 나무4 돌3 철3' };
  return { type: 'worker', label: root.mineWorker ? '🧑‍🌾 철 채굴장 노비 해제' : '🧑‍🌾 철 채굴장 노비 배치' };
}

function currentAction() {
  const node = nearIronNode();
  if (node) return { type: 'node', node, label: node.ready ? '행동: 철 채집 · 철 +1' : '철 광맥이 다시 생기는 중' };
  return mineAction();
}

function handleAction() {
  const action = currentAction();
  if (!action) return false;
  if (action.type === 'node') collectIronNode(action.node);
  else if (action.type === 'build') buildIronMine();
  else if (action.type === 'worker') assignIronWorker();
  return true;
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return { x: sx + currentGame.player.x - innerWidth / 2, y: sy + currentGame.player.y - innerHeight / 2 };
}

function handleDouble(sx, sy) {
  if (!currentGame || !lv2()) return false;
  const point = screenToWorld(sx, sy);
  if (!point || Math.hypot(point.x - IRON_MINE.x, point.y - IRON_MINE.y) > 72) return false;
  if (!ensureState(currentGame.state).mineBuilt) return false;
  assignIronWorker();
  return true;
}

function blockWorkerPurchase() {
  if (!currentGame || actualWorkers() < 3) return false;
  toast('노비는 최대 3명이야');
  return true;
}

window.__cozyIronV15 = { handleAction, handleDouble, blockWorkerPurchase };

function setupContextButton() {
  if (document.querySelector('#ironV15ContextButton')) return;
  const button = document.createElement('button');
  button.id = 'ironV15ContextButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:21;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.97);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    if (!handleAction()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateContextButton() {
  setupContextButton();
  const own = document.querySelector('#ironV15ContextButton');
  const old = document.querySelector('#v14ContextButton');
  const action = currentAction();
  if (own) {
    own.style.display = action ? 'block' : 'none';
    if (action) own.textContent = action.label;
  }
  if (old) {
    const oldIron = String(old.textContent || '').includes('철 채굴장');
    if (action || oldIron && currentGame && distance(currentGame.player, OLD_IRON_SITE) <= 140) old.style.display = 'none';
  }
  const hint = document.querySelector('#hint');
  if (hint && action) hint.textContent = action.label;
}

function patchPanels() {
  if (!currentGame) return;
  const title = document.querySelector('#panelTitle')?.textContent || '';
  const body = document.querySelector('#panelBody');
  if (!body) return;
  const root = ensureState(currentGame.state);

  if (title === '가방') {
    const note = body.querySelector('[data-v14-status]');
    if (note) note.textContent = `마을회관 ${currentGame.state.villageExpansionV14?.townHallLv3 ? 'Lv.3' : (lv2() ? 'Lv.2' : 'Lv.1')} · 철 채굴장 ${root.mineBuilt ? `${root.mineWorker ? '노비 작업중' : '노비 없음'}(${root.mineRemaining}/25)` : '미건설'} · 창병 ${(currentGame.allies || []).filter(u => u?.kind === 'spearman' && u.hp > 0).length}/3`;
  }

  if (title === '노비 판매소') {
    const worker = body.querySelector('[data-worker]');
    const total = actualWorkers();
    if (worker) {
      const span = worker.querySelector('span');
      if (span) span.textContent = `🧑‍🌾 노비 구매 (${total}/3)`;
      worker.disabled = total >= 3;
    }
    let note = body.querySelector('[data-iron-worker-v15-note]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'panel-note';
      note.dataset.ironWorkerV15Note = '1';
      body.appendChild(note);
    }
    note.textContent = `철 채굴장 배치 ${root.mineWorker ? '1명' : '0명'} · 농사 대기 ${workerNumber(currentGame.state.workers)}명 · 전체 ${total}/3`;
  }
}

function drawExpandedVillage(ctx, game) {
  if (!game.state.villageExpansionV14?.townHallLv3) return;
  ctx.save();
  ctx.fillStyle = '#f2dfa8';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-1210, 90, 1330, 1065, 110); ctx.fill(); }
  else ctx.fillRect(-1210, 90, 1330, 1065);
  ctx.fillStyle = '#9fd18f';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-1165, 135, 1285, 920, 88); ctx.fill(); }
  else ctx.fillRect(-1165, 135, 1285, 920);
  ctx.fillStyle = '#e6d3a6';
  ctx.fillRect(-1050, 570, 1070, 78);
  ctx.fillRect(-560, 230, 78, 780);
  ctx.fillStyle = '#315748';
  ctx.font = '900 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('마을회관 Lv.3 · 2배 확장 마을', -525, 175);
  ctx.restore();
}

function drawIronNodes(ctx, game) {
  if (!game.state.southernJungle?.unlocked) return;
  const root = ensureState(game.state);
  const now = Date.now();

  ctx.save();
  ctx.fillStyle = '#4f8451';
  ctx.fillRect(OLD_IRON_SITE.x - 90, OLD_IRON_SITE.y - 78, 180, 150);
  ctx.textAlign = 'center';
  IRON_NODES.forEach((node, index) => {
    const ready = root.nodeReadyAt[index] <= now;
    ctx.globalAlpha = ready ? 1 : .28;
    ctx.font = '31px system-ui';
    ctx.fillText('⛓️', node.x, node.y + 8);
    ctx.fillStyle = '#e8eeee';
    ctx.font = '800 10px system-ui';
    ctx.fillText(ready ? '철 광맥' : '재생 중', node.x, node.y + 35);
    ctx.fillStyle = '#4f8451';
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawIronMine(ctx, game) {
  if (!game.state.townHallExpansion?.upgraded) return;
  const root = ensureState(game.state);
  ctx.save();
  ctx.textAlign = 'center';
  if (!root.mineBuilt) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#687267';
    ctx.lineWidth = 3;
    ctx.strokeRect(IRON_MINE.x - 62, IRON_MINE.y - 46, 124, 88);
    ctx.setLineDash([]);
    ctx.font = '29px system-ui';
    ctx.fillText('🏗️', IRON_MINE.x, IRON_MINE.y + 4);
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText('철 채굴장 · 나무4 돌3 철3', IRON_MINE.x, IRON_MINE.y + 56);
  } else {
    ctx.fillStyle = '#596367';
    ctx.fillRect(IRON_MINE.x - 58, IRON_MINE.y - 38, 116, 76);
    ctx.font = '34px system-ui';
    ctx.fillText('⛏️', IRON_MINE.x, IRON_MINE.y + 8);
    if (root.mineWorker) {
      ctx.font = '23px system-ui';
      ctx.fillText('🧑‍🌾', IRON_MINE.x + 48, IRON_MINE.y + 10);
    }
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText(`철 채굴장 · ${root.mineRemaining}/25 · ${root.mineWorker ? '노비 배치' : '노비 없음'}`, IRON_MINE.x, IRON_MINE.y + 55);
  }
  ctx.restore();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithIronWorkerV15(game) {
  currentGame = game;
  const root = ensureState(game.state);
  disableOldMine(game.state);
  reconcileWorkerTotal(game.state, root);
  const now = performance.now();
  const dt = Math.min(.15, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  const result = originalDraw.call(this, game);
  disableOldMine(game.state);
  updateIronMine(dt);
  patchPanels();
  updateContextButton();
  const signature = `${root.mineBuilt}|${root.mineWorker}|${root.mineRemaining}|${root.bufferIron}|${actualWorkers()}`;
  if (signature !== lastUiSignature) lastUiSignature = signature;
  return result;
};

rendererProto.drawIsland = function drawIslandWithRealDoubleVillage(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  drawExpandedVillage(ctx, game);
};

rendererProto.drawObjects = function drawObjectsWithIronWorker(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  drawIronNodes(ctx, game);
  drawIronMine(ctx, game);
};

setupContextButton();
setInterval(() => {
  if (!currentGame) return;
  ensureState(currentGame.state);
  patchPanels();
  updateContextButton();
}, 150);
