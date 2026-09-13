import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_MAX = 3;
const PRODUCE_SECONDS = 5;
const DELIVERY_SECONDS = 60;
const FEED_SECONDS = 180;
const FEED_COST = 10;
const LUMBER = { x: 245, y: 850, wood: 3, stone: 1, radius: 108 };
const MINE = { x: 785, y: 965, wood: 2, stone: 3, radius: 108 };
const FARM = { x1: 900, y1: 340, x2: 1180, y2: 555 };

let currentGame = null;
let activeRuntime = null;
let lastTick = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastHandledAt = 0;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function workerNumber(value) {
  if (value && typeof value === 'object') return Math.max(0, Math.floor(Number(value.count) || 0));
  return Math.max(0, Math.floor(Number(value) || 0));
}

function ensureProduction(progress) {
  if (!progress || typeof progress !== 'object') return null;
  const source = progress.productionBuildings && typeof progress.productionBuildings === 'object'
    ? progress.productionBuildings : {};
  const production = {
    lumberBuilt: Boolean(source.lumberBuilt),
    mineBuilt: Boolean(source.mineBuilt),
    lumberWorker: source.lumberWorker ? 1 : 0,
    mineWorker: source.mineWorker ? 1 : 0,
    lumberTimer: Math.max(0, Number(source.lumberTimer) || 0),
    mineTimer: Math.max(0, Number(source.mineTimer) || 0),
    playerLumberTimer: Math.max(0, Number(source.playerLumberTimer) || 0),
    playerMineTimer: Math.max(0, Number(source.playerMineTimer) || 0),
    deliveryTimer: Math.max(0, Number(source.deliveryTimer) || 0),
    assignedFeedTimer: Math.max(0, Number(source.assignedFeedTimer) || 0),
    bufferWood: Math.max(0, Math.floor(Number(source.bufferWood) || 0)),
    bufferStone: Math.max(0, Math.floor(Number(source.bufferStone) || 0)),
    legacyMigrated: Boolean(source.legacyMigrated)
  };
  progress.productionBuildings = production;

  const assigned = production.lumberWorker + production.mineWorker;
  let total = progress.workerTotal == null
    ? workerNumber(progress.workers) + assigned
    : Math.floor(Number(progress.workerTotal) || 0);
  total = Math.max(assigned, Math.min(WORKER_MAX, total));
  progress.workerTotal = total;

  if (!production.legacyMigrated) {
    const oldStorage = progress.workerStorage;
    if (oldStorage && progress.inventory) {
      progress.inventory.wood = (Number(progress.inventory.wood) || 0) + Math.max(0, Math.floor(Number(oldStorage.wood) || 0));
      progress.inventory.stone = (Number(progress.inventory.stone) || 0) + Math.max(0, Math.floor(Number(oldStorage.stone) || 0));
      oldStorage.wood = 0;
      oldStorage.stone = 0;
    }
    production.legacyMigrated = true;
  }
  return production;
}

function reconcileWorkers(progress) {
  const production = ensureProduction(progress);
  if (!production) return;
  let farm = workerNumber(progress.workers);
  let assigned = production.lumberWorker + production.mineWorker;
  if (assigned > WORKER_MAX) {
    production.mineWorker = 0;
    assigned = production.lumberWorker;
  }
  if (farm + assigned > WORKER_MAX) {
    farm = Math.max(0, WORKER_MAX - assigned);
    progress.workers = farm;
  }
  progress.workerTotal = Math.min(WORKER_MAX, farm + assigned);
}

JaewoonVibeRuntime.prototype.loadProgress = function loadProgressWithProduction(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureProduction(progress);
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveProgressWithProduction(progress, delay) {
  activeRuntime = this;
  reconcileWorkers(progress);
  return originalQueueSaveProgress.call(this, progress, delay);
};

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

function saveState(state) {
  reconcileWorkers(state);
  activeRuntime?.queueSaveProgress(state);
}

function totalWorkers(state) {
  const p = ensureProduction(state);
  return Math.min(WORKER_MAX, workerNumber(state.workers) + (p?.lumberWorker || 0) + (p?.mineWorker || 0));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function setupBuildButton() {
  if (document.querySelector('#productionBuildButton')) return;
  const button = document.createElement('button');
  button.id = 'productionBuildButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:205px;transform:translateX(-50%);z-index:9;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.95);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('click', () => {
    if (!currentGame) return;
    const kind = button.dataset.kind;
    if (kind === 'lumber') buildLumberyard();
    else if (kind === 'mine') buildMine();
  });
  document.querySelector('#app')?.appendChild(button);
}

function updateBuildButton() {
  const button = document.querySelector('#productionBuildButton');
  if (!button || !currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  const player = currentGame.player;
  let kind = '';
  if (!p.lumberBuilt && distance(player, LUMBER) <= LUMBER.radius) kind = 'lumber';
  else if (!p.mineBuilt && distance(player, MINE) <= MINE.radius) kind = 'mine';

  if (!kind) {
    button.style.display = 'none';
    button.dataset.kind = '';
    return;
  }
  button.dataset.kind = kind;
  button.style.display = 'block';
  button.textContent = kind === 'lumber'
    ? '🪓 벌목장 건설 · 나무3 돌1'
    : '⛏️ 광산 건설 · 나무2 돌3';
}

function buildLumberyard() {
  const state = currentGame?.state;
  if (!state) return;
  const p = ensureProduction(state);
  if (p.lumberBuilt) return;
  if ((Number(state.inventory.wood) || 0) < LUMBER.wood || (Number(state.inventory.stone) || 0) < LUMBER.stone) {
    toast('벌목장 재료 부족 · 나무3 돌1');
    return;
  }
  state.inventory.wood -= LUMBER.wood;
  state.inventory.stone -= LUMBER.stone;
  p.lumberBuilt = true;
  saveState(state);
  updateBuildButton();
  toast('🪓 벌목장 완성 · 더블탭하면 노비 배치');
}

function buildMine() {
  const state = currentGame?.state;
  if (!state) return;
  const p = ensureProduction(state);
  if (p.mineBuilt) return;
  if ((Number(state.inventory.wood) || 0) < MINE.wood || (Number(state.inventory.stone) || 0) < MINE.stone) {
    toast('광산 재료 부족 · 나무2 돌3');
    return;
  }
  state.inventory.wood -= MINE.wood;
  state.inventory.stone -= MINE.stone;
  p.mineBuilt = true;
  saveState(state);
  updateBuildButton();
  toast('⛏️ 광산 완성 · 더블탭하면 노비 배치');
}

function assignWorker(kind) {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  const workerKey = kind === 'lumber' ? 'lumberWorker' : 'mineWorker';
  const builtKey = kind === 'lumber' ? 'lumberBuilt' : 'mineBuilt';
  if (!p[builtKey]) return;
  if (p[workerKey]) {
    toast(kind === 'lumber' ? '🧑‍🌾 벌목장에서 이미 작업 중이야' : '🧑‍🌾 광산에서 이미 작업 중이야');
    return;
  }
  if (workerNumber(state.workers) <= 0) {
    toast('농사 중인 노비가 없어 · 대신 근처에 서 있으면 5초마다 직접 생산해');
    return;
  }
  state.workers = workerNumber(state.workers) - 1;
  p[workerKey] = 1;
  p[kind === 'lumber' ? 'lumberTimer' : 'mineTimer'] = 0;
  saveState(state);
  toast(kind === 'lumber' ? '🪓 노비 1명을 벌목장에 배치했어' : '⛏️ 노비 1명을 광산에 배치했어');
}

function returnWorkerToFarm() {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  let from = '';
  if (p.lumberWorker) {
    p.lumberWorker = 0;
    from = '벌목장';
  } else if (p.mineWorker) {
    p.mineWorker = 0;
    from = '광산';
  }
  if (!from) {
    toast('모든 노비가 이미 농사일 중이야');
    return;
  }
  state.workers = Math.min(WORKER_MAX, workerNumber(state.workers) + 1);
  saveState(state);
  toast(`🧑‍🌾 ${from} 노비가 농사일로 돌아왔어`);
}

function screenToWorld(sx, sy) {
  if (!currentGame) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function handleWorldDouble(sx, sy) {
  if (!currentGame) return;
  const now = performance.now();
  if (now - lastHandledAt < 260) return;
  const point = screenToWorld(sx, sy);
  if (!point) return;
  const p = ensureProduction(currentGame.state);

  if (p.lumberBuilt && Math.hypot(point.x - LUMBER.x, point.y - LUMBER.y) <= 65) {
    lastHandledAt = now;
    assignWorker('lumber');
    return;
  }
  if (p.mineBuilt && Math.hypot(point.x - MINE.x, point.y - MINE.y) <= 65) {
    lastHandledAt = now;
    assignWorker('mine');
    return;
  }
  if (point.x >= FARM.x1 && point.x <= FARM.x2 && point.y >= FARM.y1 && point.y <= FARM.y2) {
    lastHandledAt = now;
    returnWorkerToFarm();
  }
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => handleWorldDouble(event.clientX, event.clientY));
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  if (now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38) {
    handleWorldDouble(event.clientX, event.clientY);
  }
  lastTap = { time: now, x: event.clientX, y: event.clientY };
});

function feedAssignedWorkers(state, p) {
  let dead = 0;
  for (const key of ['lumberWorker', 'mineWorker']) {
    if (!p[key]) continue;
    if ((Number(state.inventory.food) || 0) >= FEED_COST) {
      state.inventory.food -= FEED_COST;
    } else {
      p[key] = 0;
      dead++;
    }
  }
  saveState(state);
  if (dead > 0) toast(`⚠️ 식량 부족으로 작업장 노비 ${dead}명이 굶어 죽었어`);
}

function runProduction(dt) {
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  if (!p || !state.inventory) return;

  // 예전 '농사 노비가 10초마다 나무+돌도 자동 채집' 규칙을 끈다.
  state.workerWorkTimer = 0;
  if (state.workerStorage) {
    state.workerStorage.wood = 0;
    state.workerStorage.stone = 0;
  }

  const farmWorkers = workerNumber(state.workers);
  const assigned = p.lumberWorker + p.mineWorker;
  state.workerTotal = Math.min(WORKER_MAX, farmWorkers + assigned);

  let produced = false;
  if (p.lumberBuilt) {
    if (p.lumberWorker) {
      p.lumberTimer += dt;
      while (p.lumberTimer >= PRODUCE_SECONDS) {
        p.lumberTimer -= PRODUCE_SECONDS;
        p.bufferWood += 1;
        produced = true;
      }
      p.playerLumberTimer = 0;
    } else if (distance(currentGame.player, LUMBER) <= 92) {
      p.playerLumberTimer += dt;
      while (p.playerLumberTimer >= PRODUCE_SECONDS) {
        p.playerLumberTimer -= PRODUCE_SECONDS;
        state.inventory.wood = (Number(state.inventory.wood) || 0) + 1;
        produced = true;
        toast('🪵 벌목장에서 직접 작업 · 나무 +1');
      }
    } else {
      p.playerLumberTimer = 0;
    }
  }

  if (p.mineBuilt) {
    if (p.mineWorker) {
      p.mineTimer += dt;
      while (p.mineTimer >= PRODUCE_SECONDS) {
        p.mineTimer -= PRODUCE_SECONDS;
        p.bufferStone += 1;
        produced = true;
      }
      p.playerMineTimer = 0;
    } else if (distance(currentGame.player, MINE) <= 92) {
      p.playerMineTimer += dt;
      while (p.playerMineTimer >= PRODUCE_SECONDS) {
        p.playerMineTimer -= PRODUCE_SECONDS;
        state.inventory.stone = (Number(state.inventory.stone) || 0) + 1;
        produced = true;
        toast('🪨 광산에서 직접 작업 · 돌 +1');
      }
    } else {
      p.playerMineTimer = 0;
    }
  }

  if (assigned > 0) {
    p.deliveryTimer += dt;
    p.assignedFeedTimer += dt;
    if (p.deliveryTimer >= DELIVERY_SECONDS) {
      p.deliveryTimer %= DELIVERY_SECONDS;
      const wood = p.bufferWood;
      const stone = p.bufferStone;
      state.inventory.wood = (Number(state.inventory.wood) || 0) + wood;
      state.inventory.stone = (Number(state.inventory.stone) || 0) + stone;
      p.bufferWood = 0;
      p.bufferStone = 0;
      if (wood + stone > 0) toast(`🧺 작업장 1분 지급 · 나무 ${wood} · 돌 ${stone}`);
      produced = true;
    }
    if (p.assignedFeedTimer >= FEED_SECONDS) {
      p.assignedFeedTimer %= FEED_SECONDS;
      feedAssignedWorkers(state, p);
      return;
    }
  } else {
    p.deliveryTimer = 0;
    p.assignedFeedTimer = 0;
  }

  if (produced) saveState(state);
}

function productionTick() {
  const now = performance.now();
  const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  runProduction(dt);
  patchPanels();
  updateBuildButton();
}

function patchPanels() {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  const total = totalWorkers(state);
  const title = document.querySelector('#panelTitle')?.textContent || '';
  const body = document.querySelector('#panelBody');
  if (!body) return;

  if (title === '가방') {
    for (const note of body.querySelectorAll('.panel-note')) {
      if (note.textContent.includes('노비')) {
        const next = note.textContent.replace(/노비\s+\d+\/3/, `노비 ${total}/3 (농사 ${workerNumber(state.workers)} · 벌목 ${p.lumberWorker} · 광산 ${p.mineWorker})`);
        if (next !== note.textContent) note.textContent = next;
      }
    }
  }

  if (title === '노비 판매소') {
    const buy = body.querySelector('[data-worker]');
    if (buy) {
      buy.disabled = total >= WORKER_MAX;
      const span = buy.querySelector('span');
      if (span) span.textContent = `🧑‍🌾 노비 구매 (${total}/${WORKER_MAX})`;
    }
    for (const card of body.querySelectorAll('.item-card')) {
      if (card.textContent.includes('노비')) {
        const span = card.querySelector('span');
        if (span) span.textContent = `${total}명`;
      }
    }
    const firstNote = body.querySelector('.panel-note');
    if (firstNote) firstNote.textContent = '농사 노비는 물주기·수확을 해. 벌목장/광산에 배치한 노비는 5초마다 자원을 모으고 1분마다 지급해.';
    let status = body.querySelector('[data-job-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'panel-note';
      status.dataset.jobStatus = '1';
      body.appendChild(status);
    }
    status.textContent = `작업 배치 · 농사 ${workerNumber(state.workers)}명 · 벌목 ${p.lumberWorker}명 · 광산 ${p.mineWorker}명 · 작업장 보관 나무 ${p.bufferWood} / 돌 ${p.bufferStone}`;
  }
}

document.addEventListener('click', event => {
  const buy = event.target.closest?.('[data-worker]');
  if (!buy || !currentGame) return;
  if (totalWorkers(currentGame.state) < WORKER_MAX) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  toast('노비는 최대 3명이야');
}, true);

const observer = new MutationObserver(patchPanels);
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithProduction(game) {
  currentGame = game;
  activeRuntime = activeRuntime || null;
  reconcileWorkers(game.state);
  originalDraw.call(this, game);
  updateBuildButton();
  patchPanels();
};

rendererProto.drawObjects = function drawObjectsWithProduction(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const p = ensureProduction(game.state);
  drawLumberyard(ctx, p);
  drawMine(ctx, p);
  ctx.save();
  ctx.fillStyle = '#315748';
  ctx.font = '700 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`농사 노비 ${workerNumber(game.state.workers)}명 · 농장 더블탭 = 작업장 노비 복귀`, 1040, 565);
  ctx.restore();
};

function drawLumberyard(ctx, p) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!p.lumberBuilt) {
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#6d725d';
    ctx.lineWidth = 3;
    ctx.strokeRect(LUMBER.x - 55, LUMBER.y - 38, 110, 76);
    ctx.setLineDash([]);
    ctx.font = '28px system-ui';
    ctx.fillText('🪓', LUMBER.x, LUMBER.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('벌목장 건설터 · 나무3 돌1', LUMBER.x, LUMBER.y + 58);
  } else {
    ctx.fillStyle = '#a97849';
    ctx.fillRect(LUMBER.x - 55, LUMBER.y - 32, 110, 70);
    ctx.fillStyle = '#6f5034';
    ctx.beginPath();
    ctx.moveTo(LUMBER.x - 66, LUMBER.y - 32);
    ctx.lineTo(LUMBER.x, LUMBER.y - 70);
    ctx.lineTo(LUMBER.x + 66, LUMBER.y - 32);
    ctx.closePath();
    ctx.fill();
    ctx.font = '28px system-ui';
    ctx.fillText('🪵', LUMBER.x, LUMBER.y + 12);
    if (p.lumberWorker) ctx.fillText('🧑‍🌾', LUMBER.x + 48, LUMBER.y + 20);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText(p.lumberWorker ? '벌목장 · 노비 작업중 · 5초 +1' : '벌목장 · 더블탭 노비 배치', LUMBER.x, LUMBER.y + 58);
  }
  ctx.restore();
}

function drawMine(ctx, p) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!p.mineBuilt) {
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#6d725d';
    ctx.lineWidth = 3;
    ctx.strokeRect(MINE.x - 55, MINE.y - 38, 110, 76);
    ctx.setLineDash([]);
    ctx.font = '28px system-ui';
    ctx.fillText('⛏️', MINE.x, MINE.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('광산 건설터 · 나무2 돌3', MINE.x, MINE.y + 58);
  } else {
    ctx.fillStyle = '#77756f';
    ctx.beginPath();
    ctx.ellipse(MINE.x, MINE.y + 3, 65, 43, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(MINE.x + 65, MINE.y + 35);
    ctx.lineTo(MINE.x - 65, MINE.y + 35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3e403e';
    ctx.beginPath();
    ctx.arc(MINE.x, MINE.y + 12, 28, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.font = '27px system-ui';
    ctx.fillText('⛏️', MINE.x, MINE.y + 9);
    if (p.mineWorker) ctx.fillText('🧑‍🌾', MINE.x + 53, MINE.y + 20);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText(p.mineWorker ? '광산 · 노비 작업중 · 5초 +1' : '광산 · 더블탭 노비 배치', MINE.x, MINE.y + 58);
  }
  ctx.restore();
}

setupBuildButton();
setInterval(productionTick, 100);
