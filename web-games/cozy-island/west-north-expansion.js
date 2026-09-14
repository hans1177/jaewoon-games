import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WEST_GATE = { x: 145, y: 650, cost: 300, radius: 145 };
const WEST = { x1: -2650, x2: 160, y1: 160, y2: 1100 };
const WEST_BOSS = {
  x: -2150, y: 650, hp: 2200, attack: 45, speed: 58,
  range: 58, attackInterval: 1.25, respawnMs: 120000
};
const CHEST_POSITIONS = [
  { x: -2450, y: 270 }, { x: -2320, y: 980 }, { x: -1740, y: 330 },
  { x: -1460, y: 930 }, { x: -930, y: 280 }, { x: -520, y: 970 }
];
const NORTH_RESOURCES = [
  { kind: 'tree', x: 1540, y: -510 },
  { kind: 'tree', x: 1790, y: -730 },
  { kind: 'tree', x: 2240, y: -560 },
  { kind: 'tree', x: 2610, y: -420 },
  { kind: 'rock', x: 1690, y: -310 },
  { kind: 'rock', x: 2070, y: -700 },
  { kind: 'rock', x: 2470, y: -250 },
  { kind: 'rock', x: 2740, y: -650 }
];
const RESOURCE_RESPAWN_MS = 30000;

let currentGame = null;
let activeRuntime = null;
let bossInitialized = false;
let selectedBoss = false;
let lastFrame = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastDoubleHandledAt = 0;
const boss = {
  id: 990001, type: 'westBoss', boss: true,
  x: WEST_BOSS.x, y: WEST_BOSS.y, homeX: WEST_BOSS.x, homeY: WEST_BOSS.y,
  hp: WEST_BOSS.hp, maxHp: WEST_BOSS.hp, attack: WEST_BOSS.attack,
  speed: WEST_BOSS.speed, range: WEST_BOSS.range, cool: 0,
  alive: true, respawnAt: 0
};

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  const west = state.westernRegion && typeof state.westernRegion === 'object' ? state.westernRegion : {};
  state.westernRegion = west;
  west.unlocked = Boolean(west.unlocked);
  west.chestOpened = Boolean(west.chestOpened);
  if (!Number.isFinite(Number(west.chestSlot))) west.chestSlot = Math.floor(Math.random() * CHEST_POSITIONS.length);
  west.chestSlot = Math.max(0, Math.min(CHEST_POSITIONS.length - 1, Math.floor(Number(west.chestSlot) || 0)));
  west.bossRespawnAt = Math.max(0, Number(west.bossRespawnAt) || 0);

  const north = state.northernRegion && typeof state.northernRegion === 'object' ? state.northernRegion : {};
  state.northernRegion = north;
  if (!Array.isArray(north.resourceReadyAt)) north.resourceReadyAt = [];
  north.resourceReadyAt = NORTH_RESOURCES.map((_, i) => Math.max(0, Number(north.resourceReadyAt[i]) || 0));
  return { west, north };
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithWestNorth(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithWestNorth(state, delay) {
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

function westUnlocked() {
  return Boolean(currentGame?.state?.westernRegion?.unlocked);
}

function northUnlocked() {
  return Boolean(currentGame?.state?.northernRegion?.unlocked);
}

function nearWestGate() {
  return Boolean(currentGame && !westUnlocked() && distance(currentGame.player, WEST_GATE) <= WEST_GATE.radius);
}

function unlockWest() {
  if (!currentGame) return;
  const { west } = ensureState(currentGame.state);
  if (west.unlocked) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < WEST_GATE.cost) return toast('서쪽 지역 해금에는 300골드가 필요해');
  currentGame.state.coins = coins - WEST_GATE.cost;
  west.unlocked = true;
  save();
  updateUnlockButton();
  toast('🌄 서쪽 대평원이 열렸어 · 동쪽보다 약 2배 넓어!');
}

function setupUnlockButton() {
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

function updateUnlockButton() {
  const button = document.querySelector('#westUnlockButton');
  if (!button || !currentGame) return;
  const next = nearWestGate() ? 'block' : 'none';
  if (button.style.display !== next) button.style.display = next;
}

function chestPosition() {
  const slot = ensureState(currentGame.state).west.chestSlot;
  return CHEST_POSITIONS[slot];
}

function nearChest() {
  if (!currentGame || !westUnlocked()) return false;
  const west = ensureState(currentGame.state).west;
  if (west.chestOpened) return false;
  return distance(currentGame.player, chestPosition()) <= 95;
}

function openChest() {
  if (!nearChest()) return false;
  const west = ensureState(currentGame.state).west;
  west.chestOpened = true;
  currentGame.state.inventory ||= {};
  currentGame.state.inventory.food = (Number(currentGame.state.inventory.food) || 0) + 100;
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) + 200;
  save();
  toast('🧰 숨겨진 보물상자 발견 · 식량 +100 · 골드 +200');
  return true;
}

function nearestNorthResource() {
  if (!currentGame || !northUnlocked()) return null;
  const north = ensureState(currentGame.state).north;
  const now = Date.now();
  let best = null;
  let bestDistance = 82;
  NORTH_RESOURCES.forEach((node, index) => {
    const d = distance(currentGame.player, node);
    if (d < bestDistance) {
      best = { node, index, ready: north.resourceReadyAt[index] <= now };
      bestDistance = d;
    }
  });
  return best;
}

function collectNorthResource() {
  const found = nearestNorthResource();
  if (!found) return false;
  if (!found.ready) {
    toast('북쪽 자원이 다시 생기는 중이야');
    return true;
  }
  const north = ensureState(currentGame.state).north;
  const kind = found.node.kind;
  currentGame.state.inventory ||= {};
  if (kind === 'tree') {
    currentGame.state.inventory.wood = (Number(currentGame.state.inventory.wood) || 0) + 1;
    toast('🌲 북쪽 나무 +1');
  } else {
    currentGame.state.inventory.stone = (Number(currentGame.state.inventory.stone) || 0) + 1;
    toast('🪨 북쪽 돌 +1');
  }
  north.resourceReadyAt[found.index] = Date.now() + RESOURCE_RESPAWN_MS;
  save();
  return true;
}

function handleAction(event) {
  if (!currentGame) return;
  if (nearChest()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openChest();
    return;
  }
  if (nearWestGate()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockWest();
    return;
  }
  if (nearestNorthResource()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    collectNorthResource();
  }
}

document.querySelector('#actionButton')?.addEventListener('pointerdown', handleAction, true);
window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  handleAction(event);
}, true);

function livingTroops() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier','archer','knight','cavalry'].includes(unit.kind));
}

function activeOtherFieldCombat() {
  if (!currentGame) return false;
  const wolf = currentGame.wolves?.find(w => w.id === currentGame.selectedWolfId && w.alive && w.hp > 0);
  const boar = currentGame.boars?.find(b => b.id === currentGame.selectedBoarId && b.alive && b.hp > 0);
  const north = currentGame.northernMobs?.find(m => m.id === currentGame.selectedNorthMobId && m.alive && m.hp > 0);
  return Boolean(wolf || boar || north || currentGame.jungleCombatActive);
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - innerWidth / 2,
    y: sy + currentGame.player.y - innerHeight / 2
  };
}

function handleBossDouble(sx, sy) {
  if (!currentGame || !westUnlocked() || currentGame.raidActive || !boss.alive) return false;
  const now = performance.now();
  if (now - lastDoubleHandledAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point || Math.hypot(point.x - boss.x, point.y - boss.y) > 72) return false;
  if (activeOtherFieldCombat()) {
    lastDoubleHandledAt = now;
    toast('다른 야외 전투가 끝난 뒤 서쪽 보스를 지정할 수 있어');
    return true;
  }
  const troops = livingTroops();
  if (!troops.length) {
    lastDoubleHandledAt = now;
    toast('출동할 병력이 없어');
    return true;
  }
  selectedBoss = true;
  for (const unit of troops) {
    unit._westMission = true;
    unit._westReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  lastDoubleHandledAt = now;
  toast(`🐻 서쪽 거대 곰 지정 · 병력 ${troops.length}명 출동`);
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!handleBossDouble(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const isDouble = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!isDouble || !handleBossDouble(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x;
  const dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  unit.x += dx / d * unit.speed * dt;
  unit.y += dy / d * unit.speed * dt;
}

function nearest(from, units) {
  let best = null;
  let bestDistance = Infinity;
  for (const unit of units) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(from.x - unit.x, from.y - unit.y);
    if (d < bestDistance) {
      best = unit;
      bestDistance = d;
    }
  }
  return best;
}

function releaseWestMission(returnHome = true) {
  for (const unit of livingTroops()) {
    if (!unit._westMission) continue;
    unit._westMission = false;
    unit._westReturning = returnHome;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
}

function returnTroops(dt) {
  if (!currentGame || currentGame.raidActive || selectedBoss) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of livingTroops()) {
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

function pruneDeadTroops() {
  if (!currentGame) return;
  const before = currentGame.allies.length;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp <= 0) currentGame.allies.splice(i, 1);
  }
  if (before !== currentGame.allies.length) {
    currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
    save();
  }
}

function initializeBoss() {
  if (bossInitialized || !currentGame) return;
  bossInitialized = true;
  const west = ensureState(currentGame.state).west;
  if (west.bossRespawnAt > Date.now()) {
    boss.alive = false;
    boss.hp = 0;
    boss.respawnAt = west.bossRespawnAt;
  } else {
    west.bossRespawnAt = 0;
  }
}

function respawnBoss(now) {
  boss.alive = true;
  boss.hp = boss.maxHp;
  boss.x = boss.homeX;
  boss.y = boss.homeY;
  boss.cool = 0;
  boss.respawnAt = 0;
  ensureState(currentGame.state).west.bossRespawnAt = 0;
  save();
  toast('🐻 서쪽 거대 곰이 다시 나타났어');
}

function defeatBoss(now) {
  boss.alive = false;
  boss.hp = 0;
  boss.respawnAt = now + WEST_BOSS.respawnMs;
  selectedBoss = false;
  ensureState(currentGame.state).west.bossRespawnAt = boss.respawnAt;
  releaseWestMission(true);
  save();
  toast('🐻 서쪽 거대 곰 보스를 처치했어!');
}

function updateBoss(dt) {
  if (!currentGame || !westUnlocked()) return;
  initializeBoss();
  const now = Date.now();
  if (!boss.alive) {
    if (boss.respawnAt && now >= boss.respawnAt) respawnBoss(now);
    returnTroops(dt);
    return;
  }
  if (currentGame.raidActive) {
    if (selectedBoss) releaseWestMission(false);
    selectedBoss = false;
    return;
  }
  if (!selectedBoss) {
    returnTroops(dt);
    return;
  }

  const troops = livingTroops();
  if (!troops.length) {
    selectedBoss = false;
    releaseWestMission(false);
    toast('서쪽 보스전 병력이 전멸했어');
    return;
  }

  boss.cool = Math.max(0, boss.cool - dt);
  for (const unit of troops) {
    unit._westMission = true;
    unit._westReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    unit.cool = Math.max(0, Number(unit.cool) || 0) - dt;
    const d = Math.hypot(boss.x - unit.x, boss.y - unit.y) || 1;
    if (d > unit.range) moveToward(unit, boss.x, boss.y, dt);
    else if (unit.cool <= 0) {
      boss.hp -= Number(unit.attack) || 0;
      unit.cool = unit.kind === 'archer' ? 1.15 : .85;
    }
  }

  const victim = nearest(boss, troops);
  if (victim && boss.hp > 0) {
    const d = Math.hypot(victim.x - boss.x, victim.y - boss.y) || 1;
    if (d > boss.range) moveToward(boss, victim.x, victim.y, dt);
    else if (boss.cool <= 0) {
      victim.hp -= boss.attack;
      boss.cool = WEST_BOSS.attackInterval;
      pruneDeadTroops();
    }
  }
  if (boss.hp <= 0) defeatBoss(now);
}

function visible(game, x, y, w, h, margin = 180) {
  const left = game.player.x - innerWidth / 2 - margin;
  const right = game.player.x + innerWidth / 2 + margin;
  const top = game.player.y - innerHeight / 2 - margin;
  const bottom = game.player.y + innerHeight / 2 + margin;
  return x + w >= left && x <= right && y + h >= top && y <= bottom;
}

function drawWestGround(ctx) {
  ctx.save();
  if (!westUnlocked()) {
    ctx.fillStyle = '#6e826e';
    ctx.fillRect(82, 420, 18, 460);
    ctx.textAlign = 'center';
    ctx.font = '34px system-ui';
    ctx.fillText('🔐', 112, WEST_GATE.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '800 13px system-ui';
    ctx.fillText('서쪽 지역 · 300골드', 150, WEST_GATE.y - 48);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#e4d4a7';
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(WEST.x1 - 45, 120, WEST.x2 - WEST.x1 + 80, 1020, 110); ctx.fill();
  } else ctx.fillRect(WEST.x1 - 45, 120, WEST.x2 - WEST.x1 + 80, 1020);
  ctx.fillStyle = '#94b979';
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(WEST.x1, WEST.y1, WEST.x2 - WEST.x1, WEST.y2 - WEST.y1, 90); ctx.fill();
  } else ctx.fillRect(WEST.x1, WEST.y1, WEST.x2 - WEST.x1, WEST.y2 - WEST.y1);
  ctx.fillStyle = 'rgba(64,92,62,.16)';
  for (let x = -2500; x < 60; x += 260) {
    ctx.beginPath();
    ctx.arc(x, 330 + ((Math.abs(x) / 7) % 520), 54, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#315748';
  ctx.textAlign = 'center';
  ctx.font = '900 19px system-ui';
  ctx.fillText('서쪽 대평원 · 동쪽의 약 2배', -1240, 205);
  ctx.restore();
}

function drawBoss(ctx) {
  if (!boss.alive) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '54px system-ui';
  ctx.fillText('🐻', boss.x, boss.y + 18);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(boss.x - 52, boss.y - 46, 104, 8);
  ctx.fillStyle = selectedBoss ? '#f0a43b' : '#874c38';
  ctx.fillRect(boss.x - 52, boss.y - 46, 104 * Math.max(0, boss.hp / boss.maxHp), 8);
  ctx.fillStyle = '#4d352b';
  ctx.font = '900 12px system-ui';
  ctx.fillText('서쪽 거대 곰 보스', boss.x, boss.y + 48);
  if (selectedBoss) {
    ctx.strokeStyle = '#f0a43b';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 48, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawChest(ctx, game) {
  const west = ensureState(game.state).west;
  if (west.chestOpened) return;
  const pos = CHEST_POSITIONS[west.chestSlot];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '34px system-ui';
  ctx.fillText('🌿', pos.x - 16, pos.y + 10);
  ctx.fillText('🌿', pos.x + 16, pos.y + 10);
  if (distance(game.player, pos) <= 240) {
    ctx.font = '24px system-ui';
    ctx.fillText('🧰', pos.x, pos.y + 8);
  }
  ctx.restore();
}

function drawNorthResources(ctx, game) {
  if (!northUnlocked()) return;
  const north = ensureState(game.state).north;
  const now = Date.now();
  ctx.save();
  for (let i = 0; i < NORTH_RESOURCES.length; i++) {
    const node = NORTH_RESOURCES[i];
    const ready = north.resourceReadyAt[i] <= now;
    ctx.globalAlpha = ready ? 1 : .32;
    if (node.kind === 'tree') {
      ctx.fillStyle = '#6f9f62';
      ctx.beginPath(); ctx.arc(node.x, node.y - 18, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#795c3e'; ctx.fillRect(node.x - 5, node.y + 4, 10, 30);
    } else {
      ctx.font = '28px system-ui'; ctx.fillText('🪨', node.x - 14, node.y + 12);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function patchHint() {
  if (!currentGame) return;
  const hint = document.querySelector('#hint');
  if (!hint) return;
  if (nearChest()) {
    hint.textContent = '행동: 숨겨진 보물상자 열기';
    return;
  }
  if (nearWestGate()) {
    hint.textContent = '행동: 서쪽 지역 해금 · 300골드';
    return;
  }
  const resource = nearestNorthResource();
  if (resource) hint.textContent = resource.ready
    ? `행동: 북쪽 ${resource.node.kind === 'tree' ? '나무' : '돌'} 수집`
    : '북쪽 자원이 다시 생기는 중';
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithWestNorth(game) {
  currentGame = game;
  ensureState(game.state);
  initializeBoss();
  const now = performance.now();
  const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')) updateBoss(dt);
  game.westBoss = boss;
  game.selectedWestBoss = selectedBoss;
  originalDraw.call(this, game);
  updateUnlockButton();
  patchHint();
};

rendererProto.drawIsland = function drawIslandWithWestNorth(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  if (visible(game, WEST.x1 - 80, 100, WEST.x2 - WEST.x1 + 180, 1060)) drawWestGround(ctx);
};

rendererProto.drawObjects = function drawObjectsWithWestNorth(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  if (visible(game, WEST.x1, WEST.y1, WEST.x2 - WEST.x1, WEST.y2 - WEST.y1)) {
    if (westUnlocked()) {
      drawBoss(ctx);
      drawChest(ctx, game);
    }
  }
  if (visible(game, 1435, -820, 1360, 900)) drawNorthResources(ctx, game);
};

setupUnlockButton();
