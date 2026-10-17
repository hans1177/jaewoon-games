import { IslandRendererV3 } from './render-v3.js';

const SEVENTH_PHASE = 7;
const BERSERKER_DAMAGE = 67;
const BERSERKER_INTERVAL = 1.0;
let lastTick = performance.now();
let lastRaidCycle = -1;
let nextEnemyId = 1800000;

function makeEnemy(kind, index = 0, overrides = {}) {
  const archer = kind === 'archer';
  const cavalry = kind === 'cavalry';
  const base = {
    id: nextEnemyId++, kind, enemy: true, boss: false,
    hp: cavalry ? 600 : archer ? 55 : 100,
    maxHp: cavalry ? 600 : archer ? 55 : 100,
    attack: cavalry ? 30 : archer ? 18 : 10,
    range: archer ? 220 : 55,
    speed: cavalry ? 105 : archer ? 64 : 76,
    cool: index * .1,
    wander: 0, vx: 0, vy: 0,
    x: 1490 + index * 48,
    y: 485 + (index % 4) * 105
  };
  return Object.assign(base, overrides);
}

function makeSeventhRaid() {
  const units = [];
  units.push(makeEnemy('berserker', 0, {
    hp: 600, maxHp: 600, attack: 0,
    berserkerDamage: BERSERKER_DAMAGE,
    berserkerInterval: BERSERKER_INTERVAL,
    berserkerTimer: .7,
    range: 58, speed: 82,
    x: 1740, y: 655
  }));
  for (let i = 0; i < 3; i++) units.push(makeEnemy('archer', i + 1, {
    hp: 55, maxHp: 55, attack: 18, range: 220, speed: 64,
    x: 1500 + i * 72, y: 470 + i * 120
  }));
  for (let i = 0; i < 2; i++) units.push(makeEnemy('cavalry', i + 4, {
    hp: 600, maxHp: 600, attack: 30, range: 55, speed: 105,
    x: 1650 + i * 86, y: 500 + i * 190
  }));
  units.push(makeEnemy('soldier', 6, {
    hp: 100, maxHp: 100, attack: 10, range: 55, speed: 76,
    x: 1570, y: 790
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
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return { unit: best, distance: bestDistance };
}

function raidCycle(game) {
  return Math.max(0, Math.floor(Number(game?.state?.raidCycleCount) || 0));
}

function installSeventhRaid(game) {
  if (!game?.raidActive || game.pirateRaidActive) return;
  const cycle = raidCycle(game);
  if (!cycle || cycle % 7 !== 0 || cycle === lastRaidCycle) return;
  lastRaidCycle = cycle;
  game.enemies.splice(0, game.enemies.length, ...makeSeventhRaid());
  game.raidPhase = SEVENTH_PHASE;
  game.fourthRaid = false;
  game.fifthRaid = false;
  game.sixthRaid = false;
  game.seventhRaid = true;
  toast('🪓 7번째 습격! 광전사1 · 궁수3 · 기마병2 · 병사1');
}

function updateBerserker(game, dt) {
  if (!game?.raidActive || game.pirateRaidActive || Number(game.raidPhase) !== SEVENTH_PHASE) return;
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
  if (!game?.raidActive || game.pirateRaidActive || Number(game.raidPhase) !== SEVENTH_PHASE) return;
  const label = document.querySelector('#raidText');
  if (!label) return;
  const alive = (game.enemies || []).filter(unit => unit?.hp > 0).length;
  label.textContent = `🪓 7번째 습격 · 광전사1 궁수3 기마병2 병사1 · 적 ${alive}`;
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawUnit = proto.drawUnit;

proto.draw = function drawWithSeventhRaid(game) {
  const now = performance.now();
  const dt = Math.min(.1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  const result = originalDraw.call(this, game);
  installSeventhRaid(game);
  updateBerserker(game, dt);
  patchRaidLabel(game);
  if (!game?.raidActive) game.seventhRaid = false;
  return result;
};

proto.drawUnit = function drawSeventhBerserker(ctx, unit) {
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
