import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const AREA = { x1: 300, x2: 1485, y1: 1200, y2: 2025 };
const GATE = { x: 1445, y: 1530 };
const CHEST = { x: 520, y: 1930 };
const REQUIRED_BOAR_KILLS = 3;

const ENEMY_DEFS = [
  { id: 'jw-g1-s1', kind: 'soldier', group: 'g1', x: 1160, y: 1370, hp: 100, attack: 10, interval: 2, range: 55, speed: 68 },
  { id: 'jw-g1-s2', kind: 'soldier', group: 'g1', x: 1070, y: 1440, hp: 100, attack: 10, interval: 2, range: 55, speed: 68 },
  { id: 'jw-g1-s3', kind: 'soldier', group: 'g1', x: 1240, y: 1480, hp: 100, attack: 10, interval: 2, range: 55, speed: 68 },
  { id: 'jw-g2-s1', kind: 'soldier', group: 'g2', x: 650, y: 1660, hp: 100, attack: 10, interval: 2, range: 55, speed: 68 },
  { id: 'jw-g2-s2', kind: 'soldier', group: 'g2', x: 555, y: 1740, hp: 100, attack: 10, interval: 2, range: 55, speed: 68 },
  { id: 'jw-g2-s3', kind: 'soldier', group: 'g2', x: 745, y: 1790, hp: 100, attack: 10, interval: 2, range: 55, speed: 68 },
  { id: 'jw-a1', kind: 'archer', x: 1030, y: 1880, hp: 100, attack: 20, interval: 1, range: 230, speed: 58 },
  { id: 'jw-a2', kind: 'archer', x: 900, y: 1940, hp: 100, attack: 20, interval: 1, range: 230, speed: 58 },
  { id: 'jw-a3', kind: 'archer', x: 1180, y: 1970, hp: 100, attack: 20, interval: 1, range: 230, speed: 58 },
  { id: 'jw-k1', kind: 'knight', x: 480, y: 1430, hp: 555, attack: 40, interval: 1, range: 62, speed: 62 },
  { id: 'jw-t1', kind: 'tower', x: 375, y: 1810, hp: 300, attack: 40, interval: 3, range: 310, speed: 0 }
];

let currentGame = null;
let activeRuntime = null;
let selectedEnemyIds = new Set();
let lastTap = { time: 0, x: 0, y: 0 };
let lastHandledAt = 0;
let lastTick = performance.now();
const boarAlive = new Map();
const enemies = ENEMY_DEFS.map(makeEnemy);

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  const camp = state.jungleWestCamp && typeof state.jungleWestCamp === 'object' ? state.jungleWestCamp : {};
  state.jungleWestCamp = camp;
  camp.boarKills = Math.max(0, Math.floor(Number(camp.boarKills) || 0));
  camp.unlocked = Boolean(camp.unlocked || camp.boarKills >= REQUIRED_BOAR_KILLS);
  camp.chestOpened = Boolean(camp.chestOpened);
  camp.defeated = Array.isArray(camp.defeated) ? [...new Set(camp.defeated.map(String))] : [];
  return camp;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithJungleWest(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithJungleWest(state, delay) {
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

function makeEnemy(def) {
  return {
    ...def,
    homeX: def.x,
    homeY: def.y,
    maxHp: def.hp,
    cool: 0,
    skillClock: 0,
    alive: true
  };
}

function campUnlocked() {
  return Boolean(currentGame?.state && ensureState(currentGame.state).unlocked);
}

function jungleUnlocked() {
  return Boolean(currentGame?.state?.southernJungle?.unlocked);
}

function applyDefeatedState() {
  if (!currentGame) return;
  const defeated = new Set(ensureState(currentGame.state).defeated);
  for (const enemy of enemies) {
    if (defeated.has(enemy.id)) {
      enemy.alive = false;
      enemy.hp = 0;
      selectedEnemyIds.delete(enemy.id);
    }
  }
}

function trackBoarKills() {
  if (!currentGame || !jungleUnlocked()) return;
  const camp = ensureState(currentGame.state);
  for (const boar of currentGame.boars || []) {
    if (!boar) continue;
    const alive = Boolean(boar.alive && boar.hp > 0);
    if (!boarAlive.has(boar.id)) {
      boarAlive.set(boar.id, alive);
      continue;
    }
    const before = boarAlive.get(boar.id);
    if (before && !alive && !camp.unlocked) {
      camp.boarKills = Math.min(REQUIRED_BOAR_KILLS, camp.boarKills + 1);
      if (camp.boarKills >= REQUIRED_BOAR_KILLS) {
        camp.unlocked = true;
        save();
        toast('🗺️ 멧돼지 3마리 처치 완료 · 정글 서쪽 지역이 열렸어!');
      } else {
        save();
        toast(`🗺️ 정글 서쪽 해금 진행 · 멧돼지 ${camp.boarKills}/${REQUIRED_BOAR_KILLS}`);
      }
    }
    boarAlive.set(boar.id, alive);
  }
}

function livingTroops() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier', 'archer', 'knight', 'cavalry'].includes(unit.kind));
}

function missionTroops() {
  return livingTroops().filter(unit => unit._jungleWestMission);
}

function otherCombatActive() {
  if (!currentGame) return true;
  if (currentGame.raidActive || currentGame.selectedWolfId != null || currentGame.selectedBoarId != null || currentGame.jungleCombatActive) return true;
  return livingTroops().some(unit => unit._northMission || unit._westMission || unit._westBearMission);
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function selectEnemyAt(sx, sy) {
  if (!currentGame || !campUnlocked() || currentGame.raidActive) return false;
  const now = performance.now();
  if (now - lastHandledAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;

  let clicked = null;
  let bestDistance = 70;
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    const d = Math.hypot(point.x - enemy.x, point.y - enemy.y);
    if (d < bestDistance) {
      clicked = enemy;
      bestDistance = d;
    }
  }
  if (!clicked) return false;
  lastHandledAt = now;

  if (otherCombatActive() && selectedEnemyIds.size === 0) {
    toast('다른 야외 전투가 끝난 뒤 정글 서쪽 적을 공격할 수 있어');
    return true;
  }
  const troops = livingTroops();
  if (!troops.length) {
    toast('출동할 병력이 없어');
    return true;
  }

  selectedEnemyIds.clear();
  if (clicked.kind === 'soldier' && clicked.group) {
    for (const enemy of enemies) {
      if (enemy.alive && enemy.hp > 0 && enemy.group === clicked.group) selectedEnemyIds.add(enemy.id);
    }
    toast(`⚔️ 병사 무리 선택 · ${selectedEnemyIds.size}명이 동시에 달려든다`);
  } else {
    selectedEnemyIds.add(clicked.id);
    const labels = { archer: '궁수', knight: '기사', tower: '경비탑' };
    toast(`⚔️ ${labels[clicked.kind] || '적'} 선택 · 병력 ${troops.length}명 출동`);
  }

  currentGame.jungleWestCampCombatActive = true;
  for (const unit of troops) {
    unit._fieldMission = true;
    unit._jungleWestMission = true;
    unit._jungleWestReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!selectEnemyAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const doubleTap = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!doubleTap || !selectEnemyAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x;
  const dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = Number(unit.speed) || 0;
  unit.x += dx / d * speed * dt;
  unit.y += dy / d * speed * dt;
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

function stunTroop(unit) {
  const now = Date.now();
  if (!(Number(unit._jwcStunnedUntil) > now)) {
    unit._jwcOriginalAttack = Number(unit.attack) || 0;
    unit._jwcOriginalSpeed = Number(unit.speed) || 0;
  }
  unit._jwcStunnedUntil = now + 3000;
  unit.attack = 0;
  unit.speed = 0;
}

function updateStuns() {
  const now = Date.now();
  for (const unit of currentGame?.allies || []) {
    if (!unit || !unit._jwcStunnedUntil) continue;
    if (unit._jwcStunnedUntil > now) {
      unit.attack = 0;
      unit.speed = 0;
      continue;
    }
    if (unit._jwcOriginalAttack != null) unit.attack = unit._jwcOriginalAttack;
    if (unit._jwcOriginalSpeed != null) unit.speed = unit._jwcOriginalSpeed;
    delete unit._jwcStunnedUntil;
    delete unit._jwcOriginalAttack;
    delete unit._jwcOriginalSpeed;
  }
}

function releaseTroops(returnHome = true) {
  for (const unit of livingTroops()) {
    if (!unit._jungleWestMission) continue;
    unit._fieldMission = false;
    unit._jungleWestMission = false;
    unit._jungleWestReturning = returnHome;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  if (currentGame) currentGame.jungleWestCampCombatActive = false;
}

function returnTroops(dt) {
  if (!currentGame || selectedEnemyIds.size || currentGame.raidActive) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of livingTroops()) {
    if (!unit._jungleWestReturning || unit._jwcStunnedUntil > Date.now()) continue;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    const d = Math.hypot(barracks.x - unit.x, barracks.y - unit.y);
    if (d <= 90) {
      unit._jungleWestReturning = false;
      unit.wander = 0;
    } else moveToward(unit, barracks.x, barracks.y, dt);
  }
}

function pruneDeadTroops() {
  if (!currentGame) return;
  let changed = false;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp > 0) continue;
    currentGame.allies.splice(i, 1);
    changed = true;
  }
  if (changed) {
    currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
    currentGame.state.knightCount = currentGame.allies.filter(unit => unit.hp > 0 && unit.kind === 'knight').length;
    save();
  }
}

function defeatEnemy(enemy) {
  if (!enemy.alive) return;
  enemy.hp = 0;
  enemy.alive = false;
  selectedEnemyIds.delete(enemy.id);
  const camp = ensureState(currentGame.state);
  if (!camp.defeated.includes(enemy.id)) camp.defeated.push(enemy.id);
  save();
}

function updateCombat(dt) {
  if (!currentGame || !campUnlocked()) return;
  updateStuns();

  if (currentGame.raidActive) {
    selectedEnemyIds.clear();
    releaseTroops(false);
    return;
  }

  for (const id of [...selectedEnemyIds]) {
    const enemy = enemies.find(item => item.id === id);
    if (!enemy?.alive || enemy.hp <= 0) selectedEnemyIds.delete(id);
  }

  if (!selectedEnemyIds.size) {
    if (missionTroops().length) releaseTroops(true);
    returnTroops(dt);
    return;
  }

  const troops = missionTroops();
  if (!troops.length) {
    selectedEnemyIds.clear();
    currentGame.jungleWestCampCombatActive = false;
    toast('⚔️ 정글 서쪽 전투 병력이 전멸했어');
    return;
  }

  const selectedEnemies = enemies.filter(enemy => selectedEnemyIds.has(enemy.id) && enemy.alive && enemy.hp > 0);
  if (!selectedEnemies.length) {
    selectedEnemyIds.clear();
    releaseTroops(true);
    return;
  }

  for (const unit of troops) {
    unit._fieldMission = true;
    unit._jungleWestMission = true;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    if (unit._jwcStunnedUntil > Date.now()) continue;
    unit._jwcCool = Math.max(0, Number(unit._jwcCool) || 0) - dt;
    const target = nearest(unit, selectedEnemies);
    if (!target) continue;
    const d = Math.hypot(target.x - unit.x, target.y - unit.y) || 1;
    if (d > (Number(unit.range) || 55)) moveToward(unit, target.x, target.y, dt);
    else if (unit._jwcCool <= 0) {
      target.hp -= Number(unit.attack) || 0;
      unit._jwcCool = unit.kind === 'archer' ? 1.15 : .85;
      if (target.hp <= 0) defeatEnemy(target);
    }
  }

  const aliveTroops = missionTroops();
  for (const enemy of selectedEnemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    enemy.cool = Math.max(0, enemy.cool - dt);

    if (enemy.kind === 'knight') {
      enemy.skillClock += dt;
      if (enemy.skillClock >= 3) {
        enemy.skillClock -= 3;
        const nearby = aliveTroops
          .filter(unit => unit.hp > 0 && Math.hypot(unit.x - enemy.x, unit.y - enemy.y) <= 90)
          .sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y));
        if (nearby.length && Math.random() < .33) {
          const hit = nearby.slice(0, 3);
          for (const unit of hit) {
            unit.hp -= enemy.attack * 1.5;
            if (unit.hp > 0) stunTroop(unit);
          }
          enemy.cool = Math.max(enemy.cool, 1);
          toast(`🛡️ 적 기사 강타! ${hit.length}명에게 1.5배 피해 + 3초 기절`);
          pruneDeadTroops();
        }
      }
    }

    const targets = missionTroops();
    const victim = nearest(enemy, targets);
    if (!victim) continue;
    const d = Math.hypot(victim.x - enemy.x, victim.y - enemy.y) || 1;
    if (d > enemy.range) {
      if (enemy.kind !== 'tower') moveToward(enemy, victim.x, victim.y, dt);
    } else if (enemy.cool <= 0) {
      victim.hp -= enemy.attack;
      enemy.cool = enemy.interval;
      pruneDeadTroops();
    }
  }

  if (!selectedEnemyIds.size) {
    releaseTroops(true);
    toast('⚔️ 선택한 적을 모두 처치했어');
  }
}

function nearChest() {
  return Boolean(currentGame && campUnlocked() && !ensureState(currentGame.state).chestOpened && Math.hypot(currentGame.player.x - CHEST.x, currentGame.player.y - CHEST.y) <= 95);
}

function openChest() {
  if (!nearChest()) return false;
  const camp = ensureState(currentGame.state);
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) + 222;
  camp.chestOpened = true;
  save();
  toast('🎁 정글 서쪽 보물상자 · +222골드');
  return true;
}

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  if (!openChest()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || !openChest()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function patchHint() {
  if (!currentGame || !jungleUnlocked()) return;
  const hint = document.querySelector('#hint');
  if (!hint) return;
  const camp = ensureState(currentGame.state);
  if (!camp.unlocked && Math.hypot(currentGame.player.x - GATE.x, currentGame.player.y - GATE.y) <= 180) {
    hint.textContent = `정글 서쪽 지역 잠김 · 멧돼지 ${camp.boarKills}/${REQUIRED_BOAR_KILLS}`;
  } else if (nearChest()) {
    hint.textContent = '행동: 숨겨진 보물상자 열기 · 222골드';
  }
}

function tick() {
  const now = performance.now();
  const dt = Math.min(.1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  applyDefeatedState();
  trackBoarKills();
  updateCombat(dt);
  patchHint();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithJungleWestCamp(game) {
  currentGame = game;
  ensureState(game.state);
  const result = originalDraw.call(this, game);
  applyDefeatedState();
  updateStuns();
  patchHint();
  return result;
};

rendererProto.drawIsland = function drawJungleWestIsland(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  if (!game.state.southernJungle?.unlocked) return;
  const camp = ensureState(game.state);
  ctx.save();
  ctx.textAlign = 'center';
  if (!camp.unlocked) {
    ctx.fillStyle = '#495b45';
    ctx.fillRect(1425, 1210, 28, 790);
    ctx.font = '34px system-ui';
    ctx.fillText('🔐', GATE.x, GATE.y);
    ctx.fillStyle = '#253d2d';
    ctx.font = '800 13px system-ui';
    ctx.fillText(`정글 서쪽 · 멧돼지 ${camp.boarKills}/${REQUIRED_BOAR_KILLS}`, GATE.x - 80, GATE.y + 38);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#d7c181';
  this.rr(ctx, AREA.x1 - 35, AREA.y1 - 35, AREA.x2 - AREA.x1 + 70, AREA.y2 - AREA.y1 + 70, 80);
  ctx.fill();
  ctx.fillStyle = '#476f45';
  this.rr(ctx, AREA.x1, AREA.y1, AREA.x2 - AREA.x1, AREA.y2 - AREA.y1, 65);
  ctx.fill();
  ctx.fillStyle = 'rgba(42,68,42,.22)';
  for (let x = 390; x < 1400; x += 250) ctx.fillRect(x, 1280 + ((x * 7) % 520), 120, 70);
  ctx.fillStyle = '#203b28';
  ctx.font = '900 18px system-ui';
  ctx.fillText('정글 서쪽 경비 지역', 850, 1240);
  ctx.restore();
};

rendererProto.drawObjects = function drawJungleWestObjects(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const camp = ensureState(game.state);
  if (!camp.unlocked) return;
  ctx.save();
  ctx.textAlign = 'center';
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    const icon = enemy.kind === 'soldier' ? '⚔️' : enemy.kind === 'archer' ? '🏹' : enemy.kind === 'knight' ? '🛡️' : '🏰';
    ctx.font = enemy.kind === 'tower' ? '46px system-ui' : '34px system-ui';
    ctx.fillText(icon, enemy.x, enemy.y + 10);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(enemy.x - 27, enemy.y - 31, 54, 6);
    ctx.fillStyle = selectedEnemyIds.has(enemy.id) ? '#f0a43b' : '#b64a42';
    ctx.fillRect(enemy.x - 27, enemy.y - 31, 54 * Math.max(0, enemy.hp / enemy.maxHp), 6);
    ctx.fillStyle = '#3e241f';
    ctx.font = '800 10px system-ui';
    const label = enemy.kind === 'soldier' ? `병사 ${enemy.group === 'g1' ? '1무리' : '2무리'}` : enemy.kind === 'archer' ? '궁수' : enemy.kind === 'knight' ? '기사' : '경비탑';
    ctx.fillText(label, enemy.x, enemy.y + 34);
    if (selectedEnemyIds.has(enemy.id)) {
      ctx.strokeStyle = '#f0a43b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.kind === 'tower' ? 38 : 30, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (!camp.chestOpened && Math.hypot(game.player.x - CHEST.x, game.player.y - CHEST.y) <= 240) {
    ctx.font = '32px system-ui';
    ctx.fillText('🎁', CHEST.x, CHEST.y + 8);
    ctx.fillStyle = '#253d2d';
    ctx.font = '700 11px system-ui';
    ctx.fillText('숨겨진 보물상자', CHEST.x, CHEST.y + 38);
  }
  ctx.restore();
};

setInterval(tick, 50);
