import { IslandRendererV3 } from './render-v3.js';

const tracked = new Map();
const deaths = [];
const ATTACK_MS = 260;
const DEATH_MS = 720;

function keyFor(unit) {
  return `${unit?.enemy ? 'e' : 'a'}:${unit?.id}`;
}

function isAnimatedSoldier(unit) {
  return Boolean(unit && unit.kind === 'soldier' && !unit.boss);
}

function snapshot(unit, now) {
  return {
    key: keyFor(unit), x: Number(unit.x) || 0, y: Number(unit.y) || 0,
    enemy: Boolean(unit.enemy), hp: Number(unit.hp) || 0,
    maxHp: Math.max(1, Number(unit.maxHp) || 1), cool: Math.max(0, Number(unit.cool) || 0),
    seenAt: now
  };
}

function addDeath(snap, now) {
  if (!snap || deaths.some(item => item.key === snap.key && now - item.startedAt < DEATH_MS)) return;
  deaths.push({ ...snap, startedAt: now });
}

function trackSoldierState(game, now) {
  const current = new Map();
  const all = [...(game.allies || []), ...(game.enemies || [])];

  for (const unit of all) {
    if (!isAnimatedSoldier(unit)) continue;
    const key = keyFor(unit);
    const previous = tracked.get(key);
    const next = snapshot(unit, now);
    current.set(key, next);

    if (previous && unit.hp > 0 && next.cool > previous.cool + .28) {
      unit.__soldierAttackAt = now;
    }
    if (previous && previous.hp > 0 && unit.hp <= 0) addDeath(previous, now);
  }

  for (const [key, previous] of tracked) {
    if (!current.has(key) && previous.hp > 0) addDeath(previous, now);
  }

  tracked.clear();
  for (const [key, value] of current) tracked.set(key, value);

  for (let i = deaths.length - 1; i >= 0; i--) {
    if (now - deaths[i].startedAt >= DEATH_MS) deaths.splice(i, 1);
  }
}

function drawSoldier(ctx, unit) {
  if (unit.hp <= 0) return;
  const now = performance.now();
  const elapsed = now - (Number(unit.__soldierAttackAt) || -10000);
  const attacking = elapsed >= 0 && elapsed < ATTACK_MS;
  const p = attacking ? elapsed / ATTACK_MS : 0;
  const swing = attacking ? Math.sin(p * Math.PI) : 0;
  const lean = attacking ? (unit.enemy ? -1 : 1) * (.08 + swing * .22) : 0;
  const lunge = attacking ? swing * 8 : 0;

  ctx.save();
  ctx.translate(unit.x + (unit.enemy ? -lunge : lunge), unit.y);
  ctx.rotate(lean);
  ctx.textAlign = 'center';
  ctx.font = '29px system-ui';
  ctx.fillText('⚔️', 0, 10);

  if (attacking) {
    ctx.save();
    ctx.rotate((unit.enemy ? -1 : 1) * (-.8 + p * 1.6));
    ctx.strokeStyle = unit.enemy ? 'rgba(255,185,160,.88)' : 'rgba(255,255,230,.92)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 31, -.75, .45);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  const w = 42;
  const hp = Math.max(0, unit.hp / unit.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(unit.x - w / 2, unit.y - 30, w, 5);
  ctx.fillStyle = unit.enemy ? '#c14f4f' : '#4f9a5d';
  ctx.fillRect(unit.x - w / 2, unit.y - 30, w * hp, 5);
  ctx.textAlign = 'start';
}

function drawDeaths(renderer, game, now) {
  if (!deaths.length) return;
  const ctx = renderer.ctx;
  const cam = renderer.camera(game);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  for (const death of deaths) {
    const p = Math.min(1, Math.max(0, (now - death.startedAt) / DEATH_MS));
    const fall = Math.min(1, p * 1.35);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - .52) / .48);
    ctx.translate(death.x, death.y + p * 9);
    ctx.rotate((death.enemy ? -1 : 1) * fall * 1.32);
    ctx.scale(1 - p * .12, 1 - p * .20);
    ctx.textAlign = 'center';
    ctx.font = '29px system-ui';
    ctx.fillText('⚔️', 0, 10);
    ctx.restore();

    if (p < .42) {
      ctx.save();
      ctx.globalAlpha = 1 - p / .42;
      ctx.textAlign = 'center';
      ctx.font = '18px system-ui';
      ctx.fillText('💥', death.x + (death.enemy ? -16 : 16), death.y - 10 - p * 18);
      ctx.restore();
    }
  }
  ctx.restore();
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawUnit = proto.drawUnit;

proto.draw = function drawWithSoldierAnimations(game) {
  const now = performance.now();
  trackSoldierState(game, now);
  const result = originalDraw.call(this, game);
  drawDeaths(this, game, now);
  return result;
};

proto.drawUnit = function drawUnitWithSoldierAnimations(ctx, unit) {
  if (!isAnimatedSoldier(unit)) return originalDrawUnit.call(this, ctx, unit);
  drawSoldier(ctx, unit);
};
