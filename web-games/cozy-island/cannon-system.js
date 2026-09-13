import { IslandRendererV3 } from './render-v3.js';

const CANNON_DAMAGE = 75;
const CANNON_RANGE = 280;
const CANNON_INTERVAL = 2.5;
const STUN_MS = 3000;

let currentGame = null;
let lastFrame = performance.now();
let lastHitToastAt = 0;

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function livingAllies(game) {
  return (game?.allies || []).filter(unit => unit && unit.hp > 0);
}

function nearestLiving(from, units) {
  let best = null;
  let bestDistance = Infinity;
  for (const unit of units) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(unit.x - from.x, unit.y - from.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = unit;
    }
  }
  return { unit: best, distance: bestDistance };
}

function applyStun(unit, durationMs = STUN_MS) {
  if (!unit || unit.hp <= 0) return;
  const now = performance.now();
  if (!unit._cannonStunned) {
    unit._cannonStunned = true;
    unit._cannonOriginalAttack = Number(unit.attack) || 0;
    unit._cannonOriginalSpeed = Number(unit.speed) || 0;
  }
  unit._cannonStunnedUntil = Math.max(Number(unit._cannonStunnedUntil) || 0, now + durationMs);
  unit.attack = 0;
  unit.speed = 0;
}

function updateStuns(game) {
  const now = performance.now();
  for (const unit of game?.allies || []) {
    if (!unit?._cannonStunned) continue;
    if (unit.hp <= 0) {
      unit._cannonStunned = false;
      continue;
    }
    if (now < (Number(unit._cannonStunnedUntil) || 0)) {
      unit.attack = 0;
      unit.speed = 0;
      continue;
    }
    unit.attack = Math.max(0, Number(unit._cannonOriginalAttack) || 0);
    unit.speed = Math.max(0, Number(unit._cannonOriginalSpeed) || 0);
    unit._cannonStunned = false;
    unit._cannonStunnedUntil = 0;
    delete unit._cannonOriginalAttack;
    delete unit._cannonOriginalSpeed;
  }
}

function processCannons(game, dt) {
  if (!game?.raidActive) return;
  const allies = livingAllies(game);
  if (!allies.length) return;

  for (const cannon of game.enemies || []) {
    if (!cannon || cannon.kind !== 'cannon' || cannon.hp <= 0) continue;

    cannon.range = Number(cannon.range) || CANNON_RANGE;
    cannon.attack = 0; // 기본 전투 엔진의 0.85초 공격은 항상 무력화한다.
    cannon.cannonDamage = Number(cannon.cannonDamage) || CANNON_DAMAGE;
    cannon.cannonInterval = Number(cannon.cannonInterval) || CANNON_INTERVAL;
    cannon.stunMs = Number(cannon.stunMs) || STUN_MS;
    cannon.cannonTimer = Math.max(0, Number(cannon.cannonTimer) || 0) - dt;

    const { unit: target, distance } = nearestLiving(cannon, allies);
    if (!target || distance > cannon.range || cannon.cannonTimer > 0) continue;

    target.hp -= cannon.cannonDamage;
    if (target.hp > 0) applyStun(target, cannon.stunMs);
    cannon.cannonTimer = cannon.cannonInterval;
    cannon._shotUntil = performance.now() + 180;
    cannon._shotTarget = target;

    const now = performance.now();
    if (now - lastHitToastAt > 900) {
      lastHitToastAt = now;
      toast(`💥 대포 명중 · ${target.kind === 'archer' ? '궁수' : target.kind === 'knight' ? '기사' : '병사'} 3초 기절`);
    }
  }
}

function updateRaidLabel(game) {
  if (!game?.raidActive) return;
  const label = document.querySelector('#raidText');
  if (!label) return;
  const phase = Math.max(1, Number(game.raidPhase) || 0);
  const alive = (game.enemies || []).filter(unit => unit?.hp > 0).length;
  if (phase === 4) label.textContent = `🐎 4번째 습격 · 기마병2 궁수2 병사1 · 적 ${alive}`;
  else if (phase === 5) label.textContent = `💣 5번째 습격 · 궁수3 병사2 대포병1 · 적 ${alive}`;
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawUnit = proto.drawUnit;

proto.draw = function drawWithCannonSystem(game) {
  currentGame = game;
  const now = performance.now();
  const dt = Math.min(.08, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  updateStuns(game);
  processCannons(game, dt);
  originalDraw.call(this, game);
  // 내부 렌더/장비 패치가 공격력·속도를 다시 만지는 경우에도 기절은 유지한다.
  updateStuns(game);
  updateRaidLabel(game);
};

proto.drawUnit = function drawCannonAndStun(ctx, unit) {
  if (unit?.kind !== 'cannon') {
    originalDrawUnit.call(this, ctx, unit);
    if (unit?._cannonStunned && unit.hp > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '18px system-ui';
      ctx.fillText('💫', unit.x, unit.y - 38);
      ctx.restore();
    }
    return;
  }
  if (unit.hp <= 0) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '38px system-ui';
  ctx.fillText('💣', unit.x, unit.y + 10);
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.fillRect(unit.x - 34, unit.y - 34, 68, 7);
  ctx.fillStyle = '#a33f3f';
  ctx.fillRect(unit.x - 34, unit.y - 34, 68 * Math.max(0, unit.hp / unit.maxHp), 7);
  ctx.fillStyle = '#6f2424';
  ctx.font = '800 11px system-ui';
  ctx.fillText('대포병', unit.x, unit.y + 34);

  if (unit._shotUntil > performance.now() && unit._shotTarget?.hp > 0) {
    ctx.strokeStyle = '#5d4a3c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(unit.x, unit.y - 3);
    ctx.lineTo(unit._shotTarget.x, unit._shotTarget.y);
    ctx.stroke();
    ctx.font = '22px system-ui';
    ctx.fillText('💥', unit._shotTarget.x, unit._shotTarget.y - 18);
  }
  ctx.restore();
};
