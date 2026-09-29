import { IslandRendererV3 } from './render-v3.js';

const SIXTH_PHASE = 6;
const BERSERKER_DAMAGE = 67;
const BERSERKER_INTERVAL = 1.0;
let currentGame = null;
let lastTick = performance.now();
let lastRaidCycle = -1;
let nextEnemyId = 1700000;

function makeEnemy(kind, index, overrides = {}) {
  const archer = kind === 'archer';
  const unit = {
    id: nextEnemyId++, kind, enemy: true, boss: false,
    hp: archer ? 55 : 100,
    maxHp: archer ? 55 : 100,
    attack: archer ? 18 : 10,
    range: archer ? 220 : 55,
    speed: archer ? 64 : 76,
    cool: index * .1,
    wander: 0, vx: 0, vy: 0,
    x: 1490 + index * 47,
    y: 485 + (index % 4) * 105
  };
  return Object.assign(unit, overrides);
}

function makeSixthRaid() {
  const units = [];

  for (let i = 0; i < 2; i++) {
    units.push(makeEnemy('archer', i, {
      hp: 55, maxHp: 55, attack: 18, range: 220, speed: 64,
      x: 1490 + i * 70, y: 470 + i * 135
    }));
  }

  for (let i = 0; i < 2; i++) {
    units.push(makeEnemy('cannon', i + 2, {
      hp: 1800, maxHp: 1800,
      attack: 0, range: 280, speed: 48,
      cannonDamage: 75, cannonInterval: 2.5, stunMs: 3000,
      cannonTimer: 1.2 + i * .4,
      x: 1640 + i * 78, y: 510 + i * 165
    }));
  }

  for (let i = 0; i < 3; i++) {
    units.push(makeEnemy('soldier', i + 4, {
      hp: 100, maxHp: 100, attack: 10, range: 55, speed: 76,
      x: 1510 + i * 58, y: 730 + i * 62
    }));
  }

  units.push(makeEnemy('berserker', 7, {
    hp: 600, maxHp: 600,
    // 기본 근접 전투는 이동만 맡고 실제 공격은 아래 1초 타이머에서 처리한다.
    attack: 0,
    berserkerDamage: BERSERKER_DAMAGE,
    berserkerInterval: BERSERKER_INTERVAL,
    berserkerTimer: .7,
    range: 58, speed: 82,
    x: 1760, y: 690
  }));

  return units;
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function nearestLiving(from, units) {
  let best = null;
  let bestDistance = Infinity;
  for (const unit of units || []) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(unit.x - from.x, unit.y - from.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = unit;
    }
  }
  return { unit: best, distance: bestDistance };
}

function raidCycle(game) {
  return Math.max(0, Math.floor(Number(game?.state?.raidCycleCount) || 0));
}

function installSixthRaid(game) {
  if (!game?.raidActive || game.pirateRaidActive) return;
  const cycle = raidCycle(game);
  if (!cycle || cycle % 6 !== 0 || cycle === lastRaidCycle) return;

  lastRaidCycle = cycle;
  game.enemies.splice(0, game.enemies.length, ...makeSixthRaid());
  game.raidPhase = SIXTH_PHASE;
  game.fourthRaid = false;
  game.fifthRaid = false;
  game.sixthRaid = true;
  toast('🪓 6번째 습격! 궁수2 · 대포병2 · 병사3 · 광전사1');
}

function updateBerserkers(game, dt) {
  if (!game?.raidActive || game.pirateRaidActive || Number(game.raidPhase) !== SIXTH_PHASE) return;
  const allies = (game.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0);
  if (!allies.length) return;

  for (const berserker of game.enemies || []) {
    if (!berserker || berserker.kind !== 'berserker' || berserker.hp <= 0) continue;
    berserker.attack = 0;
    berserker.berserkerTimer = Math.max(0, (Number(berserker.berserkerTimer) || 0) - dt);
    const { unit: target, distance } = nearestLiving(berserker, allies);
    if (!target || distance > (Number(berserker.range) || 58) || berserker.berserkerTimer > 0) continue;

    target.hp -= Number(berserker.berserkerDamage) || BERSERKER_DAMAGE;
    berserker.berserkerTimer = Number(berserker.berserkerInterval) || BERSERKER_INTERVAL;
    berserker._berserkerAttackUntil = performance.now() + 250;
  }
}

function patchRaidLabel(game) {
  if (!game?.raidActive || game.pirateRaidActive || Number(game.raidPhase) !== SIXTH_PHASE) return;
  const label = document.querySelector('#raidText');
  if (!label) return;
  const alive = (game.enemies || []).filter(unit => unit?.hp > 0).length;
  label.textContent = `🪓 6번째 습격 · 궁수2 대포2 병사3 광전사1 · 적 ${alive}`;
}

function handleRaidEnd(game) {
  if (game?.raidActive) return;
  game.sixthRaid = false;
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawUnit = proto.drawUnit;

proto.draw = function drawWithSixthRaid(game) {
  currentGame = game;
  const now = performance.now();
  const dt = Math.min(.1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;

  const result = originalDraw.call(this, game);
  installSixthRaid(game);
  updateBerserkers(game, dt);
  patchRaidLabel(game);
  handleRaidEnd(game);
  return result;
};

proto.drawUnit = function drawBerserker(ctx, unit) {
  if (unit?.kind !== 'berserker') return originalDrawUnit.call(this, ctx, unit);
  if (unit.hp <= 0) return;

  const attacking = (Number(unit._berserkerAttackUntil) || 0) > performance.now();
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.textAlign = 'center';
  if (attacking) ctx.rotate(-.2);
  ctx.font = attacking ? '44px system-ui' : '40px system-ui';
  ctx.fillText('🪓', attacking ? 7 : 0, 12);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(unit.x - 40, unit.y - 38, 80, 7);
  ctx.fillStyle = '#9f3434';
  ctx.fillRect(unit.x - 40, unit.y - 38, 80 * Math.max(0, unit.hp / unit.maxHp), 7);
  ctx.fillStyle = '#6f2222';
  ctx.font = '900 11px system-ui';
  ctx.fillText('광전사', unit.x, unit.y + 39);
  ctx.restore();
};
