import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_PRICE = 100;
const EXPLORER_COST = 100;
const EXPLORER_MIN_GOLD = 100;
const EXPLORER_MAX_GOLD = 200;
const FISH_LIMIT = 5;
const FISH_WINDOW_MS = 60000;
const PRODUCTION_LIMIT = 25;
const BARRACKS_GROUP = 5;
const BARRACKS_COOLDOWN_MS = 30000;
const WEST_GATE = { x: 145, y: 600, cost: 300, radius: 135 };
const WEST = { x1: -2000, x2: 100, y1: -40, y2: 1160 };
const WEST_BOSS_HOME = { x: -1510, y: 590 };
const WEST_BOSS = { hp: 2200, attack: 45, speed: 52, range: 62, attackInterval: 1.4, respawnMs: 120000 };
const WEST_CHEST = { x: -1850, y: 1010, revealRadius: 145, openRadius: 82 };
const LUMBER = { x: 245, y: 850, wood: 3, stone: 1 };
const MINE = { x: 785, y: 965, wood: 2, stone: 3 };
const NORTH_NODES = [
  { id: 'north-tree-v2-1', kind: 'tree', x: 1560, y: -180 },
  { id: 'north-tree-v2-2', kind: 'tree', x: 2050, y: -530 },
  { id: 'north-tree-v2-3', kind: 'tree', x: 2580, y: -245 },
  { id: 'north-rock-v2-1', kind: 'rock', x: 1760, y: -610 },
  { id: 'north-rock-v2-2', kind: 'rock', x: 2260, y: -170 },
  { id: 'north-rock-v2-3', kind: 'rock', x: 2720, y: -570 }
];

let currentGame = null;
let activeRuntime = null;
let snapshotsReady = false;
let previousBufferWood = 0;
let previousBufferStone = 0;
let previousInventoryWood = 0;
let previousInventoryStone = 0;
let allyTrackerReady = false;
const knownAllyIds = new Set();
let westSelected = false;
let westBoss = makeWestBoss();
let lastTick = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastDoubleHandledAt = 0;
let saveCarry = 0;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  const west = state.westernRegion && typeof state.westernRegion === 'object' ? state.westernRegion : {};
  state.westernRegion = west;
  west.unlocked = Boolean(west.unlocked);
  west.chestClaimed = Boolean(west.chestClaimed);
  west.bossRespawnAt = Math.max(0, Number(west.bossRespawnAt) || 0);
  west.bossKills = Math.max(0, Math.floor(Number(west.bossKills) || 0));

  const old = state.economyBalanceV2 && typeof state.economyBalanceV2 === 'object' ? state.economyBalanceV2 : {};
  state.economyBalanceV2 = old;
  old.lumberProduced = Math.max(0, Math.min(PRODUCTION_LIMIT, Math.floor(Number(old.lumberProduced) || 0)));
  old.mineProduced = Math.max(0, Math.min(PRODUCTION_LIMIT, Math.floor(Number(old.mineProduced) || 0)));
  old.lumberRebuilds = Math.max(0, Math.floor(Number(old.lumberRebuilds) || 0));
  old.mineRebuilds = Math.max(0, Math.floor(Number(old.mineRebuilds) || 0));
  old.recruitsSinceCooldown = Math.max(0, Math.min(BARRACKS_GROUP - 1, Math.floor(Number(old.recruitsSinceCooldown) || 0)));
  old.recruitCooldownUntil = Math.max(0, Number(old.recruitCooldownUntil) || 0);
  old.fishingStarts = Array.isArray(old.fishingStarts) ? old.fishingStarts.map(Number).filter(Number.isFinite).slice(-FISH_LIMIT) : [];
  if (old.explorerAdjustedTrips == null) old.explorerAdjustedTrips = Math.max(0, Math.floor(Number(state.townHallExpansion?.explorerTrips) || 0));
  else old.explorerAdjustedTrips = Math.max(0, Math.floor(Number(old.explorerAdjustedTrips) || 0));
  if (old.explorerLastEarned == null) old.explorerLastEarned = Math.max(0, Math.floor(Number(state.townHallExpansion?.explorerEarned) || 0));
  else old.explorerLastEarned = Math.max(0, Math.floor(Number(old.explorerLastEarned) || 0));
  return { west, economy: old };
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithWestEconomy(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithWestEconomy(state, delay) {
  activeRuntime = this;
  ensureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function saveState() {
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

function workerNumber(value) {
  if (value && typeof value === 'object') return Math.max(0, Math.floor(Number(value.count) || 0));
  return Math.max(0, Math.floor(Number(value) || 0));
}

function totalWorkers(state) {
  const p = state.productionBuildings || {};
  return workerNumber(state.workers) + (p.lumberWorker ? 1 : 0) + (p.mineWorker ? 1 : 0);
}

function scaledCost(kind, rebuilds) {
  const base = kind === 'lumber' ? LUMBER : MINE;
  const multiplier = Math.pow(1.5, Math.max(0, rebuilds));
  return { wood: Math.ceil(base.wood * multiplier), stone: Math.ceil(base.stone * multiplier) };
}

function breakFacility(kind) {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = state.productionBuildings;
  const { economy } = ensureState(state);
  if (!p) return;
  const lumber = kind === 'lumber';
  const builtKey = lumber ? 'lumberBuilt' : 'mineBuilt';
  const workerKey = lumber ? 'lumberWorker' : 'mineWorker';
  if (!p[builtKey]) return;
  p[builtKey] = false;
  if (p[workerKey]) {
    p[workerKey] = 0;
    state.workers = Math.min(3, workerNumber(state.workers) + 1);
  }
  if (lumber) {
    p.lumberTimer = 0;
    p.playerLumberTimer = 0;
    economy.lumberProduced = PRODUCTION_LIMIT;
    economy.lumberRebuilds += 1;
  } else {
    p.mineTimer = 0;
    p.playerMineTimer = 0;
    economy.mineProduced = PRODUCTION_LIMIT;
    economy.mineRebuilds += 1;
  }
  state.workerTotal = Math.min(3, totalWorkers(state));
  saveState();
  const cost = scaledCost(kind, lumber ? economy.lumberRebuilds : economy.mineRebuilds);
  toast(`${lumber ? '🪓 벌목장' : '⛏️ 광산'}이 25개 생산 후 부서졌어 · 재설치 나무${cost.wood} 돌${cost.stone}`);
}

function countProduction(kind, amount, source) {
  if (!currentGame || amount <= 0) return;
  const state = currentGame.state;
  const p = state.productionBuildings;
  const { economy } = ensureState(state);
  if (!p) return;
  const key = kind === 'lumber' ? 'lumberProduced' : 'mineProduced';
  const remaining = Math.max(0, PRODUCTION_LIMIT - economy[key]);
  const allowed = Math.min(remaining, amount);
  const excess = Math.max(0, amount - allowed);
  economy[key] += allowed;
  if (excess > 0) {
    if (source === 'buffer') {
      const bufferKey = kind === 'lumber' ? 'bufferWood' : 'bufferStone';
      p[bufferKey] = Math.max(0, (Number(p[bufferKey]) || 0) - excess);
    } else {
      const item = kind === 'lumber' ? 'wood' : 'stone';
      state.inventory[item] = Math.max(0, (Number(state.inventory[item]) || 0) - excess);
    }
  }
  if (economy[key] >= PRODUCTION_LIMIT) breakFacility(kind);
}

function monitorProduction() {
  if (!currentGame?.state?.productionBuildings || !currentGame.state.inventory) return;
  const state = currentGame.state;
  const p = state.productionBuildings;
  const inv = state.inventory;
  const bw = Math.max(0, Number(p.bufferWood) || 0);
  const bs = Math.max(0, Number(p.bufferStone) || 0);
  const iw = Math.max(0, Number(inv.wood) || 0);
  const is = Math.max(0, Number(inv.stone) || 0);
  if (!snapshotsReady) {
    snapshotsReady = true;
    previousBufferWood = bw; previousBufferStone = bs; previousInventoryWood = iw; previousInventoryStone = is;
    return;
  }
  const bufferWoodGain = Math.max(0, bw - previousBufferWood);
  const bufferStoneGain = Math.max(0, bs - previousBufferStone);
  const deliveredWood = Math.max(0, previousBufferWood - bw);
  const deliveredStone = Math.max(0, previousBufferStone - bs);
  const directWoodGain = Math.max(0, iw - previousInventoryWood - deliveredWood);
  const directStoneGain = Math.max(0, is - previousInventoryStone - deliveredStone);

  if (p.lumberBuilt && bufferWoodGain) countProduction('lumber', bufferWoodGain, 'buffer');
  if (p.mineBuilt && bufferStoneGain) countProduction('mine', bufferStoneGain, 'buffer');
  if (p.lumberBuilt && !p.lumberWorker && distance(currentGame.player, LUMBER) <= 100 && directWoodGain) countProduction('lumber', directWoodGain, 'inventory');
  if (p.mineBuilt && !p.mineWorker && distance(currentGame.player, MINE) <= 100 && directStoneGain) countProduction('mine', directStoneGain, 'inventory');

  previousBufferWood = Math.max(0, Number(p.bufferWood) || 0);
  previousBufferStone = Math.max(0, Number(p.bufferStone) || 0);
  previousInventoryWood = Math.max(0, Number(inv.wood) || 0);
  previousInventoryStone = Math.max(0, Number(inv.stone) || 0);
}

function rebuildFacility(kind) {
  const state = currentGame?.state;
  if (!state?.productionBuildings || !state.inventory) return;
  const p = state.productionBuildings;
  const { economy } = ensureState(state);
  const lumber = kind === 'lumber';
  const rebuilds = lumber ? economy.lumberRebuilds : economy.mineRebuilds;
  if (rebuilds <= 0) return;
  const cost = scaledCost(kind, rebuilds);
  if ((Number(state.inventory.wood) || 0) < cost.wood || (Number(state.inventory.stone) || 0) < cost.stone) {
    toast(`${lumber ? '벌목장' : '광산'} 재설치 재료 부족 · 나무${cost.wood} 돌${cost.stone}`);
    return;
  }
  state.inventory.wood -= cost.wood;
  state.inventory.stone -= cost.stone;
  p[lumber ? 'lumberBuilt' : 'mineBuilt'] = true;
  if (lumber) {
    economy.lumberProduced = 0;
    p.lumberTimer = 0; p.playerLumberTimer = 0;
  } else {
    economy.mineProduced = 0;
    p.mineTimer = 0; p.playerMineTimer = 0;
  }
  saveState();
  snapshotsReady = false;
  toast(`${lumber ? '🪓 벌목장' : '⛏️ 광산'} 재설치 완료 · 다시 25개 생산 가능`);
}

function buyRegularWorker(event, button) {
  if (!currentGame) return;
  const state = currentGame.state;
  if (button.disabled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (totalWorkers(state) >= 3) return toast('작업 노비는 최대 3명이야');
  const coins = Number(state.coins) || 0;
  if (coins < WORKER_PRICE) return toast('노비 구매에는 100골드가 필요해');
  state.coins = coins - WORKER_PRICE;
  state.workers = workerNumber(state.workers) + 1;
  state.workerTotal = Math.min(3, totalWorkers(state));
  saveState();
  document.querySelector('#panel')?.close();
  toast(`🧑‍🌾 노비 구매 · 100골드 · ${state.workerTotal}/3`);
}

function buyExplorerWorker(event, button) {
  if (!currentGame) return;
  const state = currentGame.state;
  const expansion = state.townHallExpansion;
  if (!expansion?.upgraded || expansion.explorerAlive || button.disabled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const coins = Number(state.coins) || 0;
  if (coins < EXPLORER_COST) return toast('탐험 노비 구매에는 100골드가 필요해');
  state.coins = coins - EXPLORER_COST;
  expansion.explorerAlive = true;
  expansion.explorerActive = true;
  expansion.explorerElapsed = 0;
  expansion.explorerDoomed = Math.random() < .2;
  saveState();
  document.querySelector('#panel')?.close();
  toast('🧭 탐험 노비 구매 · 100골드 · 3분 탐색 출발');
}

function adjustExplorerReward() {
  if (!currentGame) return;
  const expansion = currentGame.state.townHallExpansion;
  if (!expansion) return;
  const { economy } = ensureState(currentGame.state);
  const trips = Math.max(0, Math.floor(Number(expansion.explorerTrips) || 0));
  if (trips <= economy.explorerAdjustedTrips) return;
  const earned = Math.max(0, Math.floor(Number(expansion.explorerEarned) || 0));
  const oldReward = Math.max(0, earned - economy.explorerLastEarned);
  if (oldReward > 0) {
    const newReward = EXPLORER_MIN_GOLD + Math.floor(Math.random() * (EXPLORER_MAX_GOLD - EXPLORER_MIN_GOLD + 1));
    currentGame.state.coins = Math.max(0, (Number(currentGame.state.coins) || 0) - oldReward + newReward);
    expansion.explorerEarned = Math.max(0, earned - oldReward + newReward);
    economy.explorerLastEarned = expansion.explorerEarned;
    toast(`🧭 탐험 귀환 · ${newReward}골드 획득!`);
  } else {
    economy.explorerLastEarned = earned;
  }
  economy.explorerAdjustedTrips = trips;
  saveState();
}

function monitorRecruitments() {
  if (!currentGame) return;
  const allies = currentGame.allies || [];
  const { economy } = ensureState(currentGame.state);
  if (!allyTrackerReady) {
    allyTrackerReady = true;
    allies.forEach(unit => unit?.id != null && knownAllyIds.add(unit.id));
    return;
  }
  let added = 0;
  for (const unit of allies) {
    if (!unit || unit.enemy || unit.hp <= 0 || unit.id == null || knownAllyIds.has(unit.id)) continue;
    knownAllyIds.add(unit.id);
    if (['soldier', 'archer', 'knight', 'cavalry'].includes(unit.kind)) added += 1;
  }
  if (!added) return;
  for (let i = 0; i < added; i++) {
    economy.recruitsSinceCooldown += 1;
    if (economy.recruitsSinceCooldown >= BARRACKS_GROUP) {
      economy.recruitsSinceCooldown = 0;
      economy.recruitCooldownUntil = Date.now() + BARRACKS_COOLDOWN_MS;
      toast('🏕️ 병영 5명 모집 완료 · 30초 쿨타임');
    }
  }
  saveState();
}

function barracksCooldownSeconds() {
  if (!currentGame) return 0;
  const { economy } = ensureState(currentGame.state);
  return Math.max(0, Math.ceil((economy.recruitCooldownUntil - Date.now()) / 1000));
}

function ensureNorthResources() {
  if (!currentGame?.state?.northernRegion?.unlocked || !Array.isArray(currentGame.nodes)) return;
  for (const spec of NORTH_NODES) {
    if (currentGame.nodes.some(node => node.id === spec.id)) continue;
    currentGame.nodes.push({ ...spec, readyAt: 0, lockedByExpansion: false });
  }
}

function westUnlocked() {
  return Boolean(currentGame?.state?.westernRegion?.unlocked);
}

function nearWestGate() {
  return Boolean(currentGame && !westUnlocked() && distance(currentGame.player, WEST_GATE) <= WEST_GATE.radius);
}

function unlockWest() {
  if (!currentGame || westUnlocked()) return;
  const { west } = ensureState(currentGame.state);
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < WEST_GATE.cost) return toast('서쪽 지역 해금에는 300골드가 필요해');
  currentGame.state.coins = coins - WEST_GATE.cost;
  west.unlocked = true;
  saveState();
  updateWestUnlockButton();
  toast('🌄 서쪽 대지 해금! 동쪽보다 약 2배 넓어');
}

function setupWestUnlockButton() {
  if (document.querySelector('#westUnlockButton')) return;
  const button = document.createElement('button');
  button.id = 'westUnlockButton';
  button.type = 'button';
  button.textContent = '🌄 서쪽 지역 해금 · 300골드';
  button.style.cssText = 'position:absolute;left:50%;bottom:410px;transform:translateX(-50%);z-index:13;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); event.stopImmediatePropagation(); unlockWest();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateWestUnlockButton() {
  const button = document.querySelector('#westUnlockButton');
  if (!button || !currentGame) return;
  button.style.display = nearWestGate() ? 'block' : 'none';
}

function chestNearby() {
  return westUnlocked() && !currentGame.state.westernRegion.chestClaimed && distance(currentGame.player, WEST_CHEST) <= WEST_CHEST.openRadius;
}

function openChest() {
  if (!currentGame || !chestNearby()) return false;
  const { west } = ensureState(currentGame.state);
  west.chestClaimed = true;
  currentGame.state.inventory.food = (Number(currentGame.state.inventory.food) || 0) + 100;
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) + 200;
  saveState();
  toast('🎁 숨은 보물상자! 식량 +100 · 골드 +200');
  return true;
}

function makeWestBoss() {
  return {
    x: WEST_BOSS_HOME.x, y: WEST_BOSS_HOME.y,
    hp: WEST_BOSS.hp, maxHp: WEST_BOSS.hp, attack: WEST_BOSS.attack,
    speed: WEST_BOSS.speed, range: WEST_BOSS.range, cool: 0,
    alive: true, wander: 0, vx: 0, vy: 0
  };
}

function livingTroops() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier', 'archer', 'knight', 'cavalry'].includes(unit.kind));
}

function otherFieldCombatActive() {
  if (!currentGame) return false;
  if (currentGame.wolves?.some(w => w.id === currentGame.selectedWolfId && w.alive && w.hp > 0)) return true;
  if (currentGame.boars?.some(b => b.id === currentGame.selectedBoarId && b.alive && b.hp > 0)) return true;
  return Boolean(currentGame.jungleCombatActive || livingTroops().some(unit => unit._northMission));
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
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(from.x - unit.x, from.y - unit.y);
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return best;
}

function startWestBossFight() {
  if (!currentGame || !westUnlocked() || !westBoss.alive || currentGame.raidActive) return false;
  if (otherFieldCombatActive()) { toast('다른 야외 전투가 끝난 뒤 서쪽 보스를 지정할 수 있어'); return true; }
  const troops = livingTroops();
  if (!troops.length) { toast('출동할 병력이 없어'); return true; }
  westSelected = true;
  for (const unit of troops) {
    unit._westMission = true; unit._westReturning = false; unit._returnHome = false; unit._northReturning = false;
    unit.wander = 999; unit.vx = 0; unit.vy = 0;
  }
  toast(`👹 서쪽 보스 지정! 병력 ${troops.length}명 출동`);
  return true;
}

function releaseWestTroops(returnHome = true) {
  for (const unit of livingTroops()) {
    if (!unit._westMission) continue;
    unit._westMission = false;
    unit._westReturning = returnHome;
    unit.wander = 999; unit.vx = 0; unit.vy = 0;
  }
}

function pruneDeadTroops() {
  if (!currentGame) return;
  const before = currentGame.allies.length;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) if (currentGame.allies[i]?.hp <= 0) currentGame.allies.splice(i, 1);
  if (currentGame.allies.length !== before) {
    currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
    saveState();
  }
}

function updateWestBoss(dt) {
  if (!currentGame || !westUnlocked()) return;
  const { west } = ensureState(currentGame.state);
  const now = Date.now();
  if (!westBoss.alive) {
    if (west.bossRespawnAt && now >= west.bossRespawnAt) {
      westBoss = makeWestBoss();
      west.bossRespawnAt = 0;
      saveState();
      toast('👹 서쪽 보스가 다시 나타났어');
    }
    return;
  }
  if (currentGame.raidActive) {
    if (westSelected) releaseWestTroops(false);
    westSelected = false;
    return;
  }
  if (!westSelected) return;
  if (otherFieldCombatActive()) {
    westSelected = false;
    releaseWestTroops(true);
    return;
  }
  const troops = livingTroops();
  if (!troops.length) {
    westSelected = false;
    releaseWestTroops(false);
    toast('서쪽 보스 전투 병력이 전멸했어');
    return;
  }
  for (const unit of troops) {
    unit._westMission = true; unit._westReturning = false; unit.wander = 999; unit.vx = 0; unit.vy = 0;
    unit.cool = Math.max(0, Number(unit.cool) || 0) - dt;
    const d = Math.hypot(westBoss.x - unit.x, westBoss.y - unit.y) || 1;
    if (d > unit.range) moveToward(unit, westBoss.x, westBoss.y, dt);
    else if (unit.cool <= 0) { westBoss.hp -= Number(unit.attack) || 0; unit.cool = unit.kind === 'archer' ? 1.15 : .85; }
  }
  westBoss.cool = Math.max(0, westBoss.cool - dt);
  const victim = nearest(westBoss, troops);
  if (victim && westBoss.hp > 0) {
    const d = Math.hypot(victim.x - westBoss.x, victim.y - westBoss.y) || 1;
    if (d > westBoss.range) moveToward(westBoss, victim.x, victim.y, dt);
    else if (westBoss.cool <= 0) { victim.hp -= westBoss.attack; westBoss.cool = WEST_BOSS.attackInterval; pruneDeadTroops(); }
  }
  if (westBoss.hp <= 0) {
    westBoss.hp = 0; westBoss.alive = false; westSelected = false;
    west.bossRespawnAt = now + WEST_BOSS.respawnMs; west.bossKills += 1;
    releaseWestTroops(true); saveState();
    toast('👹 서쪽 보스를 처치했어!');
  }
}

function returnWestTroops(dt) {
  if (!currentGame || currentGame.raidActive || westSelected) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of livingTroops()) {
    if (!unit._westReturning) continue;
    unit.wander = 999; unit.vx = 0; unit.vy = 0;
    const d = Math.hypot(barracks.x - unit.x, barracks.y - unit.y);
    if (d <= 90) { unit._westReturning = false; unit.wander = 0; continue; }
    moveToward(unit, barracks.x, barracks.y, dt);
  }
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return { x: sx + currentGame.player.x - window.innerWidth / 2, y: sy + currentGame.player.y - window.innerHeight / 2 };
}

function handleWestDouble(sx, sy) {
  if (!currentGame || !westUnlocked() || !westBoss.alive) return false;
  const now = performance.now();
  if (now - lastDoubleHandledAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point || Math.hypot(point.x - westBoss.x, point.y - westBoss.y) > 78) return false;
  lastDoubleHandledAt = now;
  return startWestBossFight();
}

function patchUI() {
  if (!currentGame) return;
  const state = currentGame.state;
  const { economy } = ensureState(state);
  const regularWorkerButton = document.querySelector('#panelBody [data-worker]');
  if (regularWorkerButton) {
    const price = regularWorkerButton.querySelector('b');
    if (price && price.textContent !== '100골드') price.textContent = '100골드';
  }
  const explorerButton = document.querySelector('#panelBody [data-explorer-worker]');
  if (explorerButton && !state.townHallExpansion?.explorerAlive) {
    const price = explorerButton.querySelector('b');
    if (price && price.textContent !== '100골드') price.textContent = '100골드';
  }
  const explorerNote = document.querySelector('#panelBody [data-explorer-note]');
  if (explorerNote) explorerNote.textContent = explorerNote.textContent.replace(/200~500골드|300~500골드/g, '100~200골드');

  const productionButton = document.querySelector('#productionBuildButton');
  if (productionButton?.style.display !== 'none') {
    const kind = productionButton.dataset.kind;
    const rebuilds = kind === 'lumber' ? economy.lumberRebuilds : kind === 'mine' ? economy.mineRebuilds : 0;
    if (kind && rebuilds > 0) {
      const cost = scaledCost(kind, rebuilds);
      productionButton.textContent = `${kind === 'lumber' ? '🪓 벌목장' : '⛏️ 광산'} 재설치 · 나무${cost.wood} 돌${cost.stone}`;
    }
  }

  const title = document.querySelector('#panelTitle')?.textContent;
  const body = document.querySelector('#panelBody');
  if (title === '병영' && body) {
    let note = body.querySelector('[data-barracks-cooldown-v2]');
    if (!note) { note = document.createElement('p'); note.className = 'panel-note'; note.dataset.barracksCooldownV2 = '1'; body.appendChild(note); }
    const remain = barracksCooldownSeconds();
    note.textContent = remain > 0 ? `⏳ 병영 모집 쿨타임 ${remain}초` : `병영은 5명 모집마다 30초 휴식 · 다음 쿨타임까지 ${BARRACKS_GROUP - economy.recruitsSinceCooldown}명`;
  }
}

const nativeShowModal = HTMLDialogElement.prototype.showModal;
if (!window.__cozyFishingRateLimitV2) {
  HTMLDialogElement.prototype.showModal = function limitedShowModal() {
    if (this.id === 'fishing' && currentGame) {
      const { economy } = ensureState(currentGame.state);
      const now = Date.now();
      economy.fishingStarts = economy.fishingStarts.filter(time => now - time < FISH_WINDOW_MS);
      if (economy.fishingStarts.length >= FISH_LIMIT) {
        const remain = Math.max(1, Math.ceil((FISH_WINDOW_MS - (now - economy.fishingStarts[0])) / 1000));
        toast(`🎣 낚시는 1분에 5번까지 · ${remain}초 뒤 다시 가능`);
        return;
      }
      economy.fishingStarts.push(now);
      saveState();
    }
    return nativeShowModal.call(this);
  };
  window.__cozyFishingRateLimitV2 = true;
}

document.addEventListener('click', event => {
  const worker = event.target.closest?.('[data-worker]');
  if (worker) return buyRegularWorker(event, worker);
  const explorer = event.target.closest?.('[data-explorer-worker]');
  if (explorer) return buyExplorerWorker(event, explorer);

  const recruit = event.target.closest?.('[data-rec], [data-knight-recruit], [data-allied-cavalry]');
  if (recruit && barracksCooldownSeconds() > 0) {
    event.preventDefault(); event.stopImmediatePropagation();
    toast(`⏳ 병영 쿨타임 ${barracksCooldownSeconds()}초`);
    return;
  }

  const production = event.target.closest?.('#productionBuildButton');
  if (production && currentGame) {
    const kind = production.dataset.kind;
    const { economy } = ensureState(currentGame.state);
    const rebuilds = kind === 'lumber' ? economy.lumberRebuilds : kind === 'mine' ? economy.mineRebuilds : 0;
    if (kind && rebuilds > 0) {
      event.preventDefault(); event.stopImmediatePropagation(); rebuildFacility(kind);
    }
  }
}, true);

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  if (nearWestGate()) { event.preventDefault(); event.stopImmediatePropagation(); unlockWest(); return; }
  if (chestNearby()) { event.preventDefault(); event.stopImmediatePropagation(); openChest(); }
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  if (nearWestGate()) { event.preventDefault(); event.stopImmediatePropagation(); unlockWest(); return; }
  if (chestNearby()) { event.preventDefault(); event.stopImmediatePropagation(); openChest(); }
}, true);

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!handleWestDouble(event.clientX, event.clientY)) return;
  event.preventDefault(); event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const doubleTap = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!doubleTap || !handleWestDouble(event.clientX, event.clientY)) return;
  event.preventDefault(); event.stopImmediatePropagation();
}, true);

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithWestEconomy(game) {
  currentGame = game;
  ensureState(game.state);
  ensureNorthResources();
  originalDraw.call(this, game);
  if (!allyTrackerReady) {
    (game.allies || []).forEach(unit => unit?.id != null && knownAllyIds.add(unit.id));
    allyTrackerReady = true;
  }
  updateWestUnlockButton();
  patchUI();
};

rendererProto.drawIsland = function drawIslandWithWest(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  const unlocked = Boolean(game.state.westernRegion?.unlocked);
  ctx.save();
  if (!unlocked) {
    ctx.fillStyle = '#6e826e'; ctx.fillRect(95, 470, 16, 250);
    ctx.textAlign = 'center'; ctx.font = '34px system-ui'; ctx.fillText('🔐', 100, 600);
    ctx.fillStyle = '#315748'; ctx.font = '700 13px system-ui'; ctx.fillText('서쪽 지역 · 300골드', 100, 450);
    ctx.restore(); return;
  }
  ctx.fillStyle = '#f0d89e'; this.rr(ctx, WEST.x1, WEST.y1, WEST.x2 - WEST.x1, WEST.y2 - WEST.y1, 110); ctx.fill();
  ctx.fillStyle = '#86b977'; this.rr(ctx, WEST.x1 + 55, WEST.y1 + 55, WEST.x2 - WEST.x1 - 110, WEST.y2 - WEST.y1 - 110, 90); ctx.fill();
  ctx.fillStyle = 'rgba(74,104,64,.16)';
  for (let x = WEST.x1 + 180; x < WEST.x2 - 100; x += 310) ctx.fillRect(x, WEST.y1 + 90 + Math.abs(x % 260), 150, 80);
  ctx.fillStyle = '#315748'; ctx.font = '900 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('서쪽 대지 · 동쪽의 약 2배', -950, 15);
  ctx.restore();
};

rendererProto.drawObjects = function drawObjectsWithWest(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  if (!game.state.westernRegion?.unlocked) return;
  ctx.save();
  if (westBoss.alive) {
    ctx.textAlign = 'center'; ctx.font = '58px system-ui'; ctx.fillText('👹', westBoss.x, westBoss.y + 18);
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(westBoss.x - 55, westBoss.y - 48, 110, 8);
    ctx.fillStyle = westSelected ? '#f0a43b' : '#9f3333'; ctx.fillRect(westBoss.x - 55, westBoss.y - 48, 110 * Math.max(0, westBoss.hp / westBoss.maxHp), 8);
    ctx.fillStyle = '#5b2828'; ctx.font = '800 12px system-ui'; ctx.fillText('서쪽 보스', westBoss.x, westBoss.y + 48);
    if (westSelected) { ctx.strokeStyle = '#f0a43b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(westBoss.x, westBoss.y, 48, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (!game.state.westernRegion.chestClaimed && distance(game.player, WEST_CHEST) <= WEST_CHEST.revealRadius) {
    ctx.textAlign = 'center'; ctx.font = '30px system-ui'; ctx.fillText('🎁', WEST_CHEST.x, WEST_CHEST.y + 10);
    ctx.fillStyle = '#5a4937'; ctx.font = '700 11px system-ui'; ctx.fillText('수상한 상자', WEST_CHEST.x, WEST_CHEST.y + 36);
  }
  ctx.restore();
};

setupWestUnlockButton();

function tick() {
  const now = performance.now();
  const dt = Math.min(.2, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  monitorProduction();
  monitorRecruitments();
  adjustExplorerReward();
  ensureNorthResources();
  updateWestBoss(dt);
  returnWestTroops(dt);
  updateWestUnlockButton();
  patchUI();
  saveCarry += dt;
  if (saveCarry >= 15) { saveCarry = 0; saveState(); }
}
setInterval(tick, 100);
