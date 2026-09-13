import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const NORTH_GATE = { x: 2170, y: 175, cost: 200, radius: 145 };
const NORTH = { x1: 1435, x2: 2795, y1: -820, y2: 120 };
const SPAWNS = [
  { x: 1630, y: -230 },
  { x: 1960, y: -640 },
  { x: 2380, y: -300 },
  { x: 2690, y: -690 }
];
const RESPAWN_MS = 60000;
const SNAKE_HP = 500;
const SNAKE_ATTACK = 30;
const SNAKE_ATTACK_INTERVAL = 1;
const WOLF_HP = 200;
const WOLF_ATTACK = 10;

let currentGame = null;
let activeRuntime = null;
let initialized = false;
let selectedNorthId = null;
let lastTick = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastDoubleHandledAt = 0;
let nextMobId = 980000;
const mobs = [];

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureNorthState(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.northernRegion && typeof state.northernRegion === 'object' ? state.northernRegion : {};
  state.northernRegion = old;
  old.unlocked = Boolean(old.unlocked);
  if (!Array.isArray(old.spawnTypes)) old.spawnTypes = [];
  old.spawnTypes = SPAWNS.map((_, i) => old.spawnTypes[i] === 'snake' || old.spawnTypes[i] === 'wolf' ? old.spawnTypes[i] : null);
  return old;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithNorth(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureNorthState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithNorth(state, delay) {
  activeRuntime = this;
  ensureNorthState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function save() {
  if (!currentGame?.state) return;
  ensureNorthState(currentGame.state);
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

function randomType() {
  return Math.random() < .5 ? 'snake' : 'wolf';
}

function makeMob(slot, type) {
  const point = SPAWNS[slot];
  const snake = type === 'snake';
  return {
    id: nextMobId++, slot, type,
    x: point.x, y: point.y, homeX: point.x, homeY: point.y,
    hp: snake ? SNAKE_HP : WOLF_HP,
    maxHp: snake ? SNAKE_HP : WOLF_HP,
    attack: snake ? SNAKE_ATTACK : WOLF_ATTACK,
    speed: snake ? 64 : 68,
    range: 52,
    cool: 0,
    attackInterval: snake ? SNAKE_ATTACK_INTERVAL : .9,
    alive: true,
    respawnAt: 0,
    wander: 0,
    vx: 0,
    vy: 0
  };
}

function ensureMobs() {
  if (initialized || !currentGame) return;
  initialized = true;
  const north = ensureNorthState(currentGame.state);
  for (let i = 0; i < SPAWNS.length; i++) {
    const type = north.spawnTypes[i] || randomType();
    north.spawnTypes[i] = type;
    mobs.push(makeMob(i, type));
  }
  save();
}

function northUnlocked() {
  return Boolean(currentGame?.state?.northernRegion?.unlocked);
}

function nearGate() {
  return Boolean(currentGame?.state?.expanded && !northUnlocked() && distance(currentGame.player, NORTH_GATE) <= NORTH_GATE.radius);
}

function unlockNorth() {
  if (!currentGame?.state?.expanded) return toast('먼저 동쪽 지역을 열어야 해');
  const north = ensureNorthState(currentGame.state);
  if (north.unlocked) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < NORTH_GATE.cost) return toast('북쪽 지역 해금에는 200골드가 필요해');
  currentGame.state.coins = coins - NORTH_GATE.cost;
  north.unlocked = true;
  save();
  updateUnlockButton();
  toast('🧭 북쪽 지역이 열렸어! 늑대와 뱀이 출몰해');
}

function setupUnlockButton() {
  if (document.querySelector('#northUnlockButton')) return;
  const button = document.createElement('button');
  button.id = 'northUnlockButton';
  button.type = 'button';
  button.textContent = '🧭 북쪽 지역 해금 · 200골드';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:12;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockNorth();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateUnlockButton() {
  const button = document.querySelector('#northUnlockButton');
  if (!button || !currentGame) return;
  const next = nearGate() ? 'block' : 'none';
  if (button.style.display !== next) button.style.display = next;
}

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  if (!nearGate()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  unlockNorth();
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || !nearGate()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  unlockNorth();
}, true);

function livingTroops() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier', 'archer', 'knight', 'cavalry'].includes(unit.kind));
}

function activeOtherFieldCombat() {
  const wolf = currentGame?.wolves?.find(w => w.id === currentGame.selectedWolfId && w.alive && w.hp > 0);
  const boar = currentGame?.boars?.find(b => b.id === currentGame.selectedBoarId && b.alive && b.hp > 0);
  return Boolean(wolf || boar || currentGame?.jungleCombatActive);
}

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

function releaseNorthMission(returnHome = true) {
  for (const unit of livingTroops()) {
    if (!unit._northMission) continue;
    unit._northMission = false;
    unit._northReturning = returnHome;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
}

function returnTroops(dt) {
  if (!currentGame || currentGame.raidActive || selectedNorthId != null) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of livingTroops()) {
    if (!unit._northReturning) continue;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    const d = Math.hypot(barracks.x - unit.x, barracks.y - unit.y);
    if (d <= 90) {
      unit._northReturning = false;
      unit.wander = 0;
      continue;
    }
    moveToward(unit, barracks.x, barracks.y, dt);
  }
}

function pruneDeadTroops() {
  if (!currentGame) return;
  const before = currentGame.allies.length;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp <= 0) currentGame.allies.splice(i, 1);
  }
  if (currentGame.allies.length === before) return;
  currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
  save();
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function handleDoubleAt(sx, sy) {
  if (!currentGame || !northUnlocked() || currentGame.raidActive) return false;
  const now = performance.now();
  if (now - lastDoubleHandledAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;

  let best = null;
  let bestDistance = 58;
  for (const mob of mobs) {
    if (!mob.alive) continue;
    const d = Math.hypot(point.x - mob.x, point.y - mob.y);
    if (d < bestDistance) {
      best = mob;
      bestDistance = d;
    }
  }
  if (!best) return false;

  if (activeOtherFieldCombat()) {
    lastDoubleHandledAt = now;
    toast('다른 야외 전투가 끝난 뒤 북쪽 몬스터를 지정할 수 있어');
    return true;
  }
  const troops = livingTroops();
  if (!troops.length) {
    lastDoubleHandledAt = now;
    toast('출동할 병력이 없어');
    return true;
  }

  selectedNorthId = best.id;
  for (const unit of troops) {
    unit._northMission = true;
    unit._northReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  lastDoubleHandledAt = now;
  toast(best.type === 'snake' ? `🐍 뱀 지정! 병력 ${troops.length}명 출동` : `🐺 북쪽 늑대 지정! 병력 ${troops.length}명 출동`);
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!handleDoubleAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const doubleTap = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!doubleTap || !handleDoubleAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function respawnMob(mob, now) {
  const type = randomType();
  const replacement = makeMob(mob.slot, type);
  Object.assign(mob, replacement, { id: mob.id });
  const north = ensureNorthState(currentGame.state);
  north.spawnTypes[mob.slot] = type;
  save();
}

function killMob(mob, now) {
  mob.alive = false;
  mob.hp = 0;
  mob.respawnAt = now + RESPAWN_MS;
  if (selectedNorthId === mob.id) selectedNorthId = null;
  releaseNorthMission(true);
  if (mob.type === 'wolf') {
    currentGame.state.inventory ||= {};
    currentGame.state.inventory.wolfHide = (Number(currentGame.state.inventory.wolfHide) || 0) + 1;
    toast('🐺 북쪽 늑대 처치 · 늑대가죽 +1');
  } else {
    toast('🐍 뱀을 처치했어!');
  }
  save();
}

function updateMobs(dt) {
  if (!currentGame || !northUnlocked()) return;
  ensureMobs();
  const now = Date.now();

  if (currentGame.raidActive) {
    if (selectedNorthId != null) releaseNorthMission(false);
    selectedNorthId = null;
  }
  if (selectedNorthId != null && activeOtherFieldCombat()) {
    selectedNorthId = null;
    releaseNorthMission(true);
  }

  let selected = mobs.find(mob => mob.id === selectedNorthId && mob.alive && mob.hp > 0) || null;
  if (selectedNorthId != null && !selected) {
    selectedNorthId = null;
    releaseNorthMission(true);
  }

  for (const mob of mobs) {
    if (!mob.alive) {
      if (mob.respawnAt && now >= mob.respawnAt) respawnMob(mob, now);
      continue;
    }
    mob.cool = Math.max(0, mob.cool - dt);

    if (!selected || selected.id !== mob.id || currentGame.raidActive) {
      mob.wander -= dt;
      if (mob.wander <= 0) {
        const angle = Math.random() * Math.PI * 2;
        mob.vx = Math.cos(angle);
        mob.vy = Math.sin(angle);
        mob.wander = 1.5 + Math.random() * 2.8;
      }
      const nx = mob.x + mob.vx * mob.speed * .2 * dt;
      const ny = mob.y + mob.vy * mob.speed * .2 * dt;
      if (nx > NORTH.x1 + 35 && nx < NORTH.x2 - 35) mob.x = nx; else mob.vx *= -1;
      if (ny > NORTH.y1 + 35 && ny < NORTH.y2 - 35) mob.y = ny; else mob.vy *= -1;
      continue;
    }

    const troops = livingTroops();
    if (!troops.length) {
      selectedNorthId = null;
      releaseNorthMission(false);
      toast('북쪽 전투 병력이 전멸했어');
      break;
    }

    for (const unit of troops) {
      unit._northMission = true;
      unit._northReturning = false;
      unit.wander = 999;
      unit.vx = 0;
      unit.vy = 0;
      unit.cool = Math.max(0, Number(unit.cool) || 0) - dt;
      const d = Math.hypot(mob.x - unit.x, mob.y - unit.y) || 1;
      if (d > unit.range) moveToward(unit, mob.x, mob.y, dt);
      else if (unit.cool <= 0) {
        mob.hp -= Number(unit.attack) || 0;
        unit.cool = unit.kind === 'archer' ? 1.15 : .85;
      }
    }

    const victim = nearest(mob, troops);
    if (victim && mob.hp > 0) {
      const d = Math.hypot(victim.x - mob.x, victim.y - mob.y) || 1;
      if (d > mob.range) moveToward(mob, victim.x, victim.y, dt);
      else if (mob.cool <= 0) {
        victim.hp -= mob.attack;
        mob.cool = mob.attackInterval;
        pruneDeadTroops();
      }
    }

    if (mob.hp <= 0) killMob(mob, now);
  }

  returnTroops(dt);
}

function visible(game, x, y, w, h, margin = 180) {
  const left = game.player.x - innerWidth / 2 - margin;
  const right = game.player.x + innerWidth / 2 + margin;
  const top = game.player.y - innerHeight / 2 - margin;
  const bottom = game.player.y + innerHeight / 2 + margin;
  return x + w >= left && x <= right && y + h >= top && y <= bottom;
}

function drawNorthGround(ctx, game) {
  const unlocked = northUnlocked();
  ctx.save();
  if (!unlocked) {
    ctx.fillStyle = '#6e826e';
    ctx.fillRect(1480, 132, 1330, 18);
    ctx.textAlign = 'center';
    ctx.font = '34px system-ui';
    ctx.fillText('🔐', NORTH_GATE.x, 146);
    ctx.fillStyle = '#315748';
    ctx.font = '800 13px system-ui';
    ctx.fillText('북쪽 지역 · 200골드', NORTH_GATE.x, 120);
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#82cadd';
  ctx.fillRect(1370, -900, 1490, 1040);
  ctx.fillStyle = '#e4d4a7';
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(1390, -860, 1450, 980, 92); ctx.fill();
  } else ctx.fillRect(1390, -860, 1450, 980);
  ctx.fillStyle = '#86ad79';
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(1435, -820, 1360, 900, 72); ctx.fill();
  } else ctx.fillRect(1435, -820, 1360, 900);
  ctx.fillStyle = 'rgba(65,95,77,.16)';
  for (let x = 1540; x < 2760; x += 250) {
    ctx.beginPath(); ctx.arc(x, -420 + Math.sin(x) * 120, 55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#315748';
  ctx.textAlign = 'center';
  ctx.font = '900 18px system-ui';
  ctx.fillText('북쪽 야생지대', 2140, -780);
  ctx.font = '700 12px system-ui';
  ctx.fillText('늑대 / 뱀 출몰 · 스폰 시 50% 확률', 2140, -754);
  ctx.restore();
}

function drawMob(ctx, mob) {
  if (!mob.alive) return;
  const selected = mob.id === selectedNorthId;
  const snake = mob.type === 'snake';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = snake ? '38px system-ui' : '36px system-ui';
  ctx.fillText(snake ? '🐍' : '🐺', mob.x, mob.y + 12);
  ctx.fillStyle = 'rgba(0,0,0,.36)';
  ctx.fillRect(mob.x - 30, mob.y - 32, 60, 6);
  ctx.fillStyle = selected ? '#f0a43b' : snake ? '#587c3f' : '#b54d4d';
  ctx.fillRect(mob.x - 30, mob.y - 32, 60 * Math.max(0, mob.hp / mob.maxHp), 6);
  ctx.fillStyle = '#315748';
  ctx.font = '800 10px system-ui';
  ctx.fillText(snake ? '뱀' : '북쪽 늑대', mob.x, mob.y + 34);
  if (selected) {
    ctx.strokeStyle = '#f0a43b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mob.x, mob.y, 34, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function patchHint() {
  if (!currentGame) return;
  const hint = document.querySelector('#hint');
  if (!hint) return;
  if (nearGate()) hint.textContent = '행동: 북쪽 지역 해금 · 200골드';
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithNorthRegion(game) {
  currentGame = game;
  ensureNorthState(game.state);
  if (northUnlocked()) ensureMobs();
  const now = performance.now();
  const dt = Math.min(.05, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')) updateMobs(dt);
  game.northernMobs = mobs;
  game.selectedNorthMobId = selectedNorthId;
  originalDraw.call(this, game);
  updateUnlockButton();
  patchHint();
};

rendererProto.drawIsland = function drawIslandWithNorth(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  if (visible(game, 1370, -900, 1490, 1060)) drawNorthGround(ctx, game);
};

rendererProto.drawObjects = function drawObjectsWithNorth(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  if (!northUnlocked() || !visible(game, NORTH.x1, NORTH.y1, NORTH.x2 - NORTH.x1, NORTH.y2 - NORTH.y1)) return;
  for (const mob of mobs) drawMob(ctx, mob);
};

setupUnlockButton();
