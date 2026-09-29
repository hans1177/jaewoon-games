import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_PRICE = 100;
const EXPLORER_PRICE = 100;
const EXPLORER_REWARD_MIN = 100;
const EXPLORER_REWARD_MAX = 200;
const BUILDING_CAPACITY = 25;
const REBUILD_MULTIPLIER = 1.5;
const BARRACKS_BATCH = 5;
const BARRACKS_COOLDOWN_MS = 30000;
const FISHING_WINDOW_MS = 60000;
const FISHING_MAX = 5;

const LUMBER = { x: 245, y: 850, wood: 3, stone: 1 };
const MINE = { x: 785, y: 965, wood: 2, stone: 3 };
const WEST_GATE = { x: 145, y: 600, cost: 300, radius: 150 };
const WEST = { x1: -2850, x2: 165, y1: 160, y2: 1025 };
const WEST_BOSS_HOME = { x: -2410, y: 610 };
const WEST_CHEST = { x: -1710, y: 875 };
const NORTH_NODES = [
  { id: 'north-tree-a', kind: 'tree', x: 1580, y: -130 },
  { id: 'north-tree-b', kind: 'tree', x: 1880, y: -520 },
  { id: 'north-tree-c', kind: 'tree', x: 2320, y: -170 },
  { id: 'north-tree-d', kind: 'tree', x: 2680, y: -610 },
  { id: 'north-rock-a', kind: 'rock', x: 1700, y: -680 },
  { id: 'north-rock-b', kind: 'rock', x: 2070, y: -260 },
  { id: 'north-rock-c', kind: 'rock', x: 2480, y: -520 },
  { id: 'north-rock-d', kind: 'rock', x: 2740, y: -210 }
];

let currentGame = null;
let activeRuntime = null;
let knownAllies = null;
let lastExplorerTrips = null;
let lastExplorerEarned = 0;
let lastTick = performance.now();
let lastResourceSample = null;
let westSelected = false;
let westBoss = makeWestBoss();
let lastTap = { time: 0, x: 0, y: 0 };
let lastWestDoubleAt = 0;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.cozyExpansionV4 && typeof state.cozyExpansionV4 === 'object' ? state.cozyExpansionV4 : {};
  const resource = old.resource && typeof old.resource === 'object' ? old.resource : {};
  const barracks = old.barracks && typeof old.barracks === 'object' ? old.barracks : {};
  const fishing = old.fishing && typeof old.fishing === 'object' ? old.fishing : {};
  const west = old.west && typeof old.west === 'object' ? old.west : {};
  state.cozyExpansionV4 = old;
  old.resource = resource;
  old.barracks = barracks;
  old.fishing = fishing;
  old.west = west;

  resource.lumberRemaining = clampInt(resource.lumberRemaining, 0, BUILDING_CAPACITY, BUILDING_CAPACITY);
  resource.mineRemaining = clampInt(resource.mineRemaining, 0, BUILDING_CAPACITY, BUILDING_CAPACITY);
  resource.lumberRebuilds = Math.max(0, Math.floor(Number(resource.lumberRebuilds) || 0));
  resource.mineRebuilds = Math.max(0, Math.floor(Number(resource.mineRebuilds) || 0));

  barracks.recruits = Math.max(0, Math.min(BARRACKS_BATCH - 1, Math.floor(Number(barracks.recruits) || 0)));
  barracks.cooldownUntil = Math.max(0, Number(barracks.cooldownUntil) || 0);

  fishing.attempts = Array.isArray(fishing.attempts)
    ? fishing.attempts.map(Number).filter(Number.isFinite).slice(-FISHING_MAX)
    : [];

  west.unlocked = Boolean(west.unlocked);
  west.chestOpened = Boolean(west.chestOpened);
  west.bossDefeated = Boolean(west.bossDefeated);
  return old;
}

function clampInt(value, min, max, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithExpansionV4(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithExpansionV4(state, delay) {
  activeRuntime = this;
  ensureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function save() {
  if (!currentGame?.state) return;
  ensureState(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
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

function productionState() {
  return currentGame?.state?.productionBuildings || null;
}

function scaledCost(kind) {
  const state = ensureState(currentGame.state);
  const resource = state.resource;
  const rebuilds = kind === 'lumber' ? resource.lumberRebuilds : resource.mineRebuilds;
  const base = kind === 'lumber' ? LUMBER : MINE;
  const factor = Math.pow(REBUILD_MULTIPLIER, rebuilds);
  return { wood: Math.ceil(base.wood * factor), stone: Math.ceil(base.stone * factor) };
}

function buildProduction(kind) {
  if (!currentGame) return;
  const p = productionState();
  if (!p) return;
  const builtKey = kind === 'lumber' ? 'lumberBuilt' : 'mineBuilt';
  if (p[builtKey]) return;
  const cost = scaledCost(kind);
  const inv = currentGame.state.inventory || {};
  if ((Number(inv.wood) || 0) < cost.wood || (Number(inv.stone) || 0) < cost.stone) {
    toast(`${kind === 'lumber' ? '벌목장' : '광산'} 재료 부족 · 나무${cost.wood} 돌${cost.stone}`);
    return;
  }
  inv.wood -= cost.wood;
  inv.stone -= cost.stone;
  p[builtKey] = true;
  const state = ensureState(currentGame.state);
  if (kind === 'lumber') state.resource.lumberRemaining = BUILDING_CAPACITY;
  else state.resource.mineRemaining = BUILDING_CAPACITY;
  save();
  resetResourceSample();
  toast(`${kind === 'lumber' ? '🪓 벌목장' : '⛏️ 광산'} 설치 · 최대 ${BUILDING_CAPACITY}개 생산`);
}

function breakProduction(kind) {
  if (!currentGame) return;
  const p = productionState();
  if (!p) return;
  const state = ensureState(currentGame.state);
  const inv = currentGame.state.inventory || {};
  if (kind === 'lumber') {
    if (!p.lumberBuilt) return;
    p.lumberBuilt = false;
    if (p.lumberWorker) currentGame.state.workers = Math.min(3, (Number(currentGame.state.workers) || 0) + 1);
    p.lumberWorker = 0;
    p.lumberTimer = 0;
    p.playerLumberTimer = 0;
    const buffered = Math.max(0, Math.floor(Number(p.bufferWood) || 0));
    if (buffered) inv.wood = (Number(inv.wood) || 0) + buffered;
    p.bufferWood = 0;
    state.resource.lumberRemaining = 0;
    state.resource.lumberRebuilds += 1;
  } else {
    if (!p.mineBuilt) return;
    p.mineBuilt = false;
    if (p.mineWorker) currentGame.state.workers = Math.min(3, (Number(currentGame.state.workers) || 0) + 1);
    p.mineWorker = 0;
    p.mineTimer = 0;
    p.playerMineTimer = 0;
    const buffered = Math.max(0, Math.floor(Number(p.bufferStone) || 0));
    if (buffered) inv.stone = (Number(inv.stone) || 0) + buffered;
    p.bufferStone = 0;
    state.resource.mineRemaining = 0;
    state.resource.mineRebuilds += 1;
  }
  save();
  resetResourceSample();
  const next = scaledCost(kind);
  toast(`${kind === 'lumber' ? '🪓 벌목장' : '⛏️ 광산'}이 25개 생산 후 부서졌어 · 재설치 나무${next.wood} 돌${next.stone}`);
}

function resetResourceSample() {
  const p = productionState();
  const inv = currentGame?.state?.inventory || {};
  lastResourceSample = p ? {
    bufferWood: Number(p.bufferWood) || 0,
    bufferStone: Number(p.bufferStone) || 0,
    invWood: Number(inv.wood) || 0,
    invStone: Number(inv.stone) || 0
  } : null;
}

function consumeCapacity(kind, amount) {
  if (!amount || amount <= 0 || !currentGame) return;
  const state = ensureState(currentGame.state);
  const key = kind === 'lumber' ? 'lumberRemaining' : 'mineRemaining';
  state.resource[key] = Math.max(0, state.resource[key] - Math.floor(amount));
  if (state.resource[key] <= 0) breakProduction(kind);
}

function monitorProduction() {
  const p = productionState();
  if (!p || !currentGame?.state?.inventory) return;
  const inv = currentGame.state.inventory;
  if (!lastResourceSample) {
    resetResourceSample();
    return;
  }
  const nowSample = {
    bufferWood: Number(p.bufferWood) || 0,
    bufferStone: Number(p.bufferStone) || 0,
    invWood: Number(inv.wood) || 0,
    invStone: Number(inv.stone) || 0
  };

  if (p.lumberBuilt) {
    let made = Math.max(0, nowSample.bufferWood - lastResourceSample.bufferWood);
    if (nowSample.bufferWood < lastResourceSample.bufferWood && p.lumberWorker) {
      made += Math.max(0, nowSample.invWood - lastResourceSample.invWood - lastResourceSample.bufferWood);
    } else if (!p.lumberWorker && distance(currentGame.player, LUMBER) <= 96) {
      made += Math.max(0, nowSample.invWood - lastResourceSample.invWood);
    }
    consumeCapacity('lumber', made);
  }

  if (p.mineBuilt) {
    let made = Math.max(0, nowSample.bufferStone - lastResourceSample.bufferStone);
    if (nowSample.bufferStone < lastResourceSample.bufferStone && p.mineWorker) {
      made += Math.max(0, nowSample.invStone - lastResourceSample.invStone - lastResourceSample.bufferStone);
    } else if (!p.mineWorker && distance(currentGame.player, MINE) <= 96) {
      made += Math.max(0, nowSample.invStone - lastResourceSample.invStone);
    }
    consumeCapacity('mine', made);
  }

  if (currentGame && productionState() === p) lastResourceSample = nowSample;
}

function northUnlocked() {
  return Boolean(currentGame?.state?.northernRegion?.unlocked);
}

function ensureNorthNodes() {
  if (!currentGame || !northUnlocked()) return;
  const ids = new Set((currentGame.nodes || []).map(node => node.id));
  for (const source of NORTH_NODES) {
    if (ids.has(source.id)) continue;
    currentGame.nodes.push({ ...source, readyAt: 0, lockedByExpansion: false });
  }
}

function fishingAttempts() {
  const state = ensureState(currentGame.state);
  const now = Date.now();
  state.fishing.attempts = state.fishing.attempts.filter(ts => now - ts < FISHING_WINDOW_MS);
  return state.fishing.attempts;
}

const nativeShowModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function limitedFishingShowModal(...args) {
  if (this.id === 'fishing' && currentGame) {
    const attempts = fishingAttempts();
    if (attempts.length >= FISHING_MAX) {
      const wait = Math.max(1, Math.ceil((FISHING_WINDOW_MS - (Date.now() - attempts[0])) / 1000));
      toast(`🎣 낚시는 1분에 5번까지만 가능 · ${wait}초 후 다시 가능`);
      queueMicrotask(() => document.querySelector('#cancelFishing')?.click());
      return;
    }
    attempts.push(Date.now());
    save();
  }
  return nativeShowModal.apply(this, args);
};

function cooldownRemaining() {
  if (!currentGame) return 0;
  const barracks = ensureState(currentGame.state).barracks;
  return Math.max(0, barracks.cooldownUntil - Date.now());
}

function isRecruitButton(target) {
  return target?.closest?.('[data-rec], [data-knight-recruit], [data-allied-cavalry]') || null;
}

window.addEventListener('click', event => {
  const button = isRecruitButton(event.target);
  if (!button || !currentGame) return;
  const remain = cooldownRemaining();
  if (remain <= 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  toast(`🏕️ 병영 쿨타임 · ${Math.ceil(remain / 1000)}초`);
}, true);

function detectRecruits() {
  if (!currentGame) return;
  const living = (currentGame.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0);
  const ids = new Set(living.map(unit => unit.id));
  if (!knownAllies) {
    knownAllies = ids;
    return;
  }
  let added = 0;
  for (const id of ids) if (!knownAllies.has(id)) added += 1;
  knownAllies = ids;
  if (!added) return;
  const tracker = ensureState(currentGame.state).barracks;
  tracker.recruits += added;
  if (tracker.recruits >= BARRACKS_BATCH) {
    tracker.recruits %= BARRACKS_BATCH;
    tracker.cooldownUntil = Date.now() + BARRACKS_COOLDOWN_MS;
    toast('🏕️ 병력 5명 모집 완료 · 병영 30초 쿨타임');
  }
  save();
}

function adjustExplorerRewards() {
  const expansion = currentGame?.state?.townHallExpansion;
  if (!expansion) return;
  const trips = Math.max(0, Math.floor(Number(expansion.explorerTrips) || 0));
  const earned = Math.max(0, Math.floor(Number(expansion.explorerEarned) || 0));
  if (lastExplorerTrips == null) {
    lastExplorerTrips = trips;
    lastExplorerEarned = earned;
    return;
  }
  if (trips > lastExplorerTrips && earned > lastExplorerEarned) {
    const originalReward = earned - lastExplorerEarned;
    const correctedReward = EXPLORER_REWARD_MIN + Math.floor(Math.random() * (EXPLORER_REWARD_MAX - EXPLORER_REWARD_MIN + 1));
    const adjustment = correctedReward - originalReward;
    currentGame.state.coins = Math.max(0, (Number(currentGame.state.coins) || 0) + adjustment);
    expansion.explorerEarned = earned + adjustment;
    lastExplorerEarned = expansion.explorerEarned;
    lastExplorerTrips = trips;
    save();
    toast(`🧭 탐험 귀환 · ${correctedReward}골드 획득! 다시 3분 탐색 출발`);
    return;
  }
  lastExplorerTrips = trips;
  lastExplorerEarned = Math.max(lastExplorerEarned, Math.floor(Number(expansion.explorerEarned) || 0));
}

function westState() {
  return ensureState(currentGame.state).west;
}

function westUnlocked() {
  return Boolean(currentGame?.state && westState().unlocked);
}

function nearWestGate() {
  return Boolean(currentGame && !westUnlocked() && distance(currentGame.player, WEST_GATE) <= WEST_GATE.radius);
}

function unlockWest() {
  if (!currentGame || westUnlocked()) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < WEST_GATE.cost) return toast('서쪽 지역 해금에는 300골드가 필요해');
  currentGame.state.coins = coins - WEST_GATE.cost;
  westState().unlocked = true;
  save();
  updateWestButton();
  toast('🌄 서쪽 대지역이 열렸어 · 동쪽 지역의 약 2배 크기');
}

function setupWestButton() {
  if (document.querySelector('#westUnlockButton')) return;
  const button = document.createElement('button');
  button.id = 'westUnlockButton';
  button.type = 'button';
  button.textContent = '🌄 서쪽 지역 해금 · 300골드';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:12;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockWest();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateWestButton() {
  const button = document.querySelector('#westUnlockButton');
  if (!button || !currentGame) return;
  const display = nearWestGate() ? 'block' : 'none';
  if (button.style.display !== display) button.style.display = display;
}

function makeWestBoss() {
  return {
    id: 990001,
    x: WEST_BOSS_HOME.x, y: WEST_BOSS_HOME.y,
    hp: 2500, maxHp: 2500,
    attack: 45, speed: 55, range: 58,
    cool: 0, attackInterval: 1.4,
    alive: true
  };
}

function westTroops() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier', 'archer', 'knight', 'cavalry'].includes(unit.kind));
}

function otherMissionActive() {
  if (!currentGame) return false;
  if (currentGame.raidActive || currentGame.selectedWolfId != null || currentGame.selectedBoarId != null || currentGame.jungleCombatActive) return true;
  return westTroops().some(unit => unit._northMission || unit._fieldMission);
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return { x: sx + currentGame.player.x - window.innerWidth / 2, y: sy + currentGame.player.y - window.innerHeight / 2 };
}

function selectWestBossAt(sx, sy) {
  if (!westUnlocked() || westState().bossDefeated || !westBoss.alive || currentGame?.raidActive) return false;
  const now = performance.now();
  if (now - lastWestDoubleAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point || Math.hypot(point.x - westBoss.x, point.y - westBoss.y) > 70) return false;
  lastWestDoubleAt = now;
  if (otherMissionActive()) {
    toast('다른 야외 전투가 끝난 뒤 서쪽 보스를 지정할 수 있어');
    return true;
  }
  const troops = westTroops();
  if (!troops.length) {
    toast('출동할 병력이 없어');
    return true;
  }
  westSelected = true;
  for (const unit of troops) {
    unit._westMission = true;
    unit._westReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  toast(`👹 서쪽 수호자 지정 · 병력 ${troops.length}명 출동`);
  return true;
}

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x, dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  unit.x += dx / d * unit.speed * dt;
  unit.y += dy / d * unit.speed * dt;
}

function nearest(from, units) {
  let best = null, bestDistance = Infinity;
  for (const unit of units) {
    const d = Math.hypot(from.x - unit.x, from.y - unit.y);
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return best;
}

function releaseWestTroops(returnHome = true) {
  for (const unit of westTroops()) {
    if (!unit._westMission) continue;
    unit._westMission = false;
    unit._westReturning = returnHome;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
}

function returnWestTroops(dt) {
  if (!currentGame || westSelected || currentGame.raidActive) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of westTroops()) {
    if (!unit._westReturning) continue;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    const d = Math.hypot(barracks.x - unit.x, barracks.y - unit.y);
    if (d <= 90) {
      unit._westReturning = false;
      unit.wander = 0;
    } else moveToward(unit, barracks.x, barracks.y, dt);
  }
}

function pruneWestDead() {
  if (!currentGame) return;
  let changed = false;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp > 0) continue;
    currentGame.allies.splice(i, 1);
    changed = true;
  }
  if (changed) {
    currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
    save();
  }
}

function updateWestCombat(dt) {
  if (!currentGame || !westUnlocked()) return;
  if (westState().bossDefeated) {
    westBoss.alive = false;
    westSelected = false;
    returnWestTroops(dt);
    return;
  }
  if (!westSelected) {
    returnWestTroops(dt);
    return;
  }
  if (currentGame.raidActive) {
    westSelected = false;
    releaseWestTroops(false);
    return;
  }
  const troops = westTroops();
  if (!troops.length) {
    westSelected = false;
    toast('서쪽 보스 전투 병력이 전멸했어');
    return;
  }

  westBoss.cool = Math.max(0, westBoss.cool - dt);
  for (const unit of troops) {
    unit._westMission = true;
    unit._westReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    unit.cool = Math.max(0, Number(unit.cool) || 0) - dt;
    const d = Math.hypot(westBoss.x - unit.x, westBoss.y - unit.y) || 1;
    if (d > unit.range) moveToward(unit, westBoss.x, westBoss.y, dt);
    else if (unit.cool <= 0) {
      westBoss.hp -= Number(unit.attack) || 0;
      unit.cool = unit.kind === 'archer' ? 1.15 : .85;
    }
  }

  const victim = nearest(westBoss, troops);
  if (victim && westBoss.hp > 0) {
    const d = Math.hypot(victim.x - westBoss.x, victim.y - westBoss.y) || 1;
    if (d > westBoss.range) moveToward(westBoss, victim.x, victim.y, dt);
    else if (westBoss.cool <= 0) {
      victim.hp -= westBoss.attack;
      westBoss.cool = westBoss.attackInterval;
      pruneWestDead();
    }
  }

  if (westBoss.hp <= 0) {
    westBoss.hp = 0;
    westBoss.alive = false;
    westSelected = false;
    westState().bossDefeated = true;
    releaseWestTroops(true);
    save();
    toast('👹 서쪽 수호자를 처치했어!');
  }
}

function nearChest() {
  return Boolean(currentGame && westUnlocked() && !westState().chestOpened && distance(currentGame.player, WEST_CHEST) <= 95);
}

function openWestChest() {
  if (!nearChest()) return false;
  const inv = currentGame.state.inventory || (currentGame.state.inventory = {});
  inv.food = (Number(inv.food) || 0) + 100;
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) + 200;
  westState().chestOpened = true;
  save();
  toast('🎁 숨겨진 보물상자 · 식량 +100 · 골드 +200');
  return true;
}

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  if (nearWestGate()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockWest();
  } else if (nearChest()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openWestChest();
  }
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  if (nearWestGate()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockWest();
  } else if (nearChest()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openWestChest();
  }
}, true);

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!selectWestBossAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const isDouble = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!isDouble || !selectWestBossAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('click', event => {
  if (!currentGame) return;
  const buildButton = event.target?.closest?.('#productionBuildButton');
  if (buildButton && buildButton.dataset.kind) {
    event.preventDefault();
    event.stopImmediatePropagation();
    buildProduction(buildButton.dataset.kind);
    return;
  }

  const workerButton = event.target?.closest?.('[data-worker]');
  if (workerButton && !workerButton.disabled) {
    const total = Number(currentGame.state.workerTotal ?? currentGame.state.workers) || 0;
    if (total >= 3) return;
    if ((Number(currentGame.state.coins) || 0) < WORKER_PRICE) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('노비 구매에는 100골드가 필요해');
      return;
    }
    currentGame.state.coins -= 50;
    return;
  }

  const explorerButton = event.target?.closest?.('[data-explorer-worker]');
  if (explorerButton && !explorerButton.disabled) {
    if ((Number(currentGame.state.coins) || 0) < EXPLORER_PRICE) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('탐험 노비 구매에는 100골드가 필요해');
      return;
    }
    currentGame.state.coins -= 50;
  }
}, true);

function patchUI() {
  if (!currentGame) return;
  const p = productionState();
  const state = ensureState(currentGame.state);
  const buildButton = document.querySelector('#productionBuildButton');
  if (buildButton?.dataset.kind) {
    const kind = buildButton.dataset.kind;
    const cost = scaledCost(kind);
    const text = kind === 'lumber'
      ? `🪓 벌목장 설치 · 나무${cost.wood} 돌${cost.stone}`
      : `⛏️ 광산 설치 · 나무${cost.wood} 돌${cost.stone}`;
    if (buildButton.textContent !== text) buildButton.textContent = text;
  }

  const title = document.querySelector('#panelTitle')?.textContent || '';
  const body = document.querySelector('#panelBody');
  if (body && title === '노비 판매소') {
    const worker = body.querySelector('[data-worker]');
    const price = worker?.querySelector('b');
    if (price && price.textContent !== '100골드') price.textContent = '100골드';
    const explorer = body.querySelector('[data-explorer-worker]');
    if (explorer && !currentGame.state.townHallExpansion?.explorerAlive) {
      const b = explorer.querySelector('b');
      if (b) b.textContent = '100골드';
    }
    const note = body.querySelector('[data-explorer-note]');
    if (note) note.textContent = `탐험 전용 추가 노비 · 3분마다 100~200골드 · 출발마다 사망 확률 20% · 누적 ${Math.floor(Number(currentGame.state.townHallExpansion?.explorerEarned) || 0)}골드`;
  }

  if (body && title === '병영') {
    let note = body.querySelector('[data-barracks-cadence]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'panel-note';
      note.dataset.barracksCadence = '1';
      body.appendChild(note);
    }
    const remain = cooldownRemaining();
    note.textContent = remain > 0
      ? `병영 쿨타임 ${Math.ceil(remain / 1000)}초 · 5명 모집할 때마다 30초 대기`
      : `병영 모집 ${state.barracks.recruits}/${BARRACKS_BATCH} · 5명 모집하면 30초 쿨타임`;
    for (const button of body.querySelectorAll('[data-rec], [data-knight-recruit], [data-allied-cavalry]')) {
      if (remain > 0) {
        if (!button.disabled) button.dataset.cadenceDisabled = '1';
        button.disabled = true;
      } else if (button.dataset.cadenceDisabled === '1') {
        button.disabled = false;
        delete button.dataset.cadenceDisabled;
      }
    }
  }

  const hint = document.querySelector('#hint');
  if (hint) {
    if (nearWestGate()) hint.textContent = '행동: 서쪽 대지역 해금 · 300골드';
    else if (nearChest()) hint.textContent = '행동: 숨겨진 보물상자 열기';
  }

  if (p) {
    const r = state.resource;
    currentGame.productionCapacity = {
      lumber: p.lumberBuilt ? r.lumberRemaining : 0,
      mine: p.mineBuilt ? r.mineRemaining : 0
    };
  }
}

function updateTick() {
  const now = performance.now();
  const dt = Math.min(.2, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  monitorProduction();
  ensureNorthNodes();
  adjustExplorerRewards();
  updateWestCombat(dt);
  updateWestButton();
  patchUI();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithExpansionV4(game) {
  currentGame = game;
  ensureState(game.state);
  if (game.state.cozyExpansionV4.west.unlocked) game.world.w = Math.max(game.world.w, 6000);
  const result = originalDraw.call(this, game);
  ensureNorthNodes();
  detectRecruits();
  patchUI();
  return result;
};

rendererProto.drawIsland = function drawIslandWithWest(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  const west = ensureState(game.state).west;
  ctx.save();
  if (!west.unlocked) {
    ctx.fillStyle = '#6e826e';
    ctx.fillRect(112, 470, 14, 250);
    ctx.textAlign = 'center';
    ctx.font = '32px system-ui';
    ctx.fillText('🔐', 105, 605);
    ctx.fillStyle = '#315748';
    ctx.font = '800 13px system-ui';
    ctx.fillText('서쪽 지역 · 300골드', 145, 450);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#f2dfa8';
  this.rr(ctx, WEST.x1 - 55, 90, WEST.x2 - WEST.x1 + 110, 1010, 115);
  ctx.fill();
  ctx.fillStyle = '#86b978';
  this.rr(ctx, WEST.x1, 135, WEST.x2 - WEST.x1, 920, 90);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,92,70,.16)';
  for (let x = WEST.x1 + 150; x < WEST.x2; x += 340) ctx.fillRect(x, 205 + (Math.abs(x) % 430), 180, 95);
  ctx.fillStyle = '#315748';
  ctx.textAlign = 'center';
  ctx.font = '900 20px system-ui';
  ctx.fillText('서쪽 대지역 · 동쪽의 약 2배', -1330, 190);
  ctx.restore();
};

rendererProto.drawObjects = function drawObjectsWithWest(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const west = ensureState(game.state).west;
  if (!west.unlocked) return;
  ctx.save();
  ctx.textAlign = 'center';
  if (!west.bossDefeated && westBoss.alive) {
    ctx.font = '54px system-ui';
    ctx.fillText('👹', westBoss.x, westBoss.y + 17);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(westBoss.x - 52, westBoss.y - 48, 104, 8);
    ctx.fillStyle = '#a23b3b';
    ctx.fillRect(westBoss.x - 52, westBoss.y - 48, 104 * Math.max(0, westBoss.hp / westBoss.maxHp), 8);
    ctx.fillStyle = '#315748';
    ctx.font = '800 12px system-ui';
    ctx.fillText('서쪽 수호자', westBoss.x, westBoss.y + 52);
    if (westSelected) {
      ctx.strokeStyle = '#f0a43b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(westBoss.x, westBoss.y, 48, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (!west.chestOpened && Math.hypot(game.player.x - WEST_CHEST.x, game.player.y - WEST_CHEST.y) <= 220) {
    ctx.font = '31px system-ui';
    ctx.fillText('🎁', WEST_CHEST.x, WEST_CHEST.y + 10);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('수상한 상자', WEST_CHEST.x, WEST_CHEST.y + 38);
  }
  ctx.restore();
};

setupWestButton();
setInterval(updateTick, 100);
