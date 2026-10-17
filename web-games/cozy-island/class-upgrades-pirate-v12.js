import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const PIRATE_CHANCE = 0.30;
const MAX_UPGRADE_LEVEL = 3;
const CLASS_DEFS = {
  soldier: { label: '⚔️ 병사', baseCost: 50 },
  archer: { label: '🏹 궁수', baseCost: 100 },
  knight: { label: '🛡️ 기사', baseCost: 200 },
  cavalry: { label: '🏇 기마병', baseCost: 150 }
};

let currentGame = null;
let activeRuntime = null;
let lastRaidActive = false;
let pirateActive = false;
let lastTick = performance.now();
let nextPirateId = 1200000;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  const root = state.classPirateV12 && typeof state.classPirateV12 === 'object' ? state.classPirateV12 : {};
  state.classPirateV12 = root;
  root.upgrades ||= {};
  for (const kind of Object.keys(CLASS_DEFS)) {
    root.upgrades[kind] = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(Number(root.upgrades[kind]) || 0)));
  }
  root.lastRaidCycle = Math.max(0, Math.floor(Number(root.lastRaidCycle) || 0));
  root.lastRaidWasPirate = Boolean(root.lastRaidWasPirate);
  return root;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithClassPirate(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithClassPirate(state, delay) {
  activeRuntime = this;
  ensureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function saveImmediate() {
  if (!currentGame?.state || !activeRuntime) return;
  ensureState(currentGame.state);
  activeRuntime.queueSaveProgress(currentGame.state, 0);
  const coins = document.querySelector('#coinText');
  if (coins) coins.textContent = String(Math.floor(Number(currentGame.state.coins) || 0));
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function multiplier(level) {
  return Math.pow(1.5, Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Number(level) || 0)));
}

function upgradeCost(kind, level) {
  const def = CLASS_DEFS[kind];
  if (!def || level >= MAX_UPGRADE_LEVEL) return 0;
  return def.baseCost * Math.pow(2, level);
}

function applyUpgradeToUnit(unit) {
  if (!currentGame || !unit || unit.enemy || !CLASS_DEFS[unit.kind]) return;
  const state = ensureState(currentGame.state);
  const level = state.upgrades[unit.kind] || 0;
  const currentAttack = Math.max(0, Number(unit.attack) || 0);

  if (!unit.__classUpgradeV12) {
    unit.__classUpgradeV12 = {
      baseAttack: currentAttack,
      appliedLevel: 0,
      lastAppliedAttack: currentAttack
    };
  }

  const meta = unit.__classUpgradeV12;
  const externalDelta = currentAttack - (Number(meta.lastAppliedAttack) || 0);
  if (Math.abs(externalDelta) > 0.001) {
    meta.baseAttack = Math.max(0, (Number(meta.baseAttack) || 0) + externalDelta);
  }

  const desired = Math.round((Number(meta.baseAttack) || 0) * multiplier(level) * 100) / 100;
  unit.attack = desired;
  meta.appliedLevel = level;
  meta.lastAppliedAttack = desired;
}

function syncAlliedUpgrades() {
  if (!currentGame) return;
  for (const unit of currentGame.allies || []) applyUpgradeToUnit(unit);
}

function upgradeClass(kind) {
  if (!currentGame || !CLASS_DEFS[kind]) return;
  const state = ensureState(currentGame.state);
  const level = state.upgrades[kind] || 0;
  if (level >= MAX_UPGRADE_LEVEL) return toast(`${CLASS_DEFS[kind].label} 강화는 최대 3단계야`);
  const cost = upgradeCost(kind, level);
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < cost) return toast(`${CLASS_DEFS[kind].label} ${level + 1}강에는 ${cost}골드가 필요해`);

  currentGame.state.coins = coins - cost;
  state.upgrades[kind] = level + 1;
  syncAlliedUpgrades();
  saveImmediate();
  patchUpgradePanel(true);
  toast(`${CLASS_DEFS[kind].label} ${level + 1}강 완료 · 전체 공격력 ×1.5`);
}

function patchUpgradePanel(force = false) {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '병영') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  const state = ensureState(currentGame.state);
  const signature = Object.keys(CLASS_DEFS).map(kind => `${kind}:${state.upgrades[kind]}`).join('|');
  let section = body.querySelector('[data-class-upgrade-v12-section]');
  if (section && !force && section.dataset.signature === signature) return;
  if (section) section.remove();

  section = document.createElement('div');
  section.dataset.classUpgradeV12Section = '1';
  section.dataset.signature = signature;
  section.style.marginTop = '12px';
  section.innerHTML = `
    <p class="panel-note"><b>병력 클래스 강화</b> · 클래스 전체 적용 · 새로 모집한 병력에도 유지</p>
    <div class="choice-grid">
      ${Object.entries(CLASS_DEFS).map(([kind, def]) => {
        const level = state.upgrades[kind] || 0;
        const maxed = level >= MAX_UPGRADE_LEVEL;
        const cost = maxed ? 0 : upgradeCost(kind, level);
        const factor = multiplier(level).toFixed(level === 0 ? 1 : 3).replace(/0+$/, '').replace(/\.$/, '');
        return `<button class="choice" data-class-upgrade-v12="${kind}" ${maxed ? 'disabled' : ''}>
          <span>${def.label} 강화 ${level}/${MAX_UPGRADE_LEVEL}<small style="display:block">현재 공격력 배율 ×${factor}</small></span>
          <b>${maxed ? '최대 강화' : `${cost}골드`}</b>
        </button>`;
      }).join('')}
    </div>
    <p class="panel-note">강화할 때마다 공격력이 다시 ×1.5. 비용은 단계마다 2배.</p>`;
  body.appendChild(section);
}

document.addEventListener('click', event => {
  const button = event.target?.closest?.('[data-class-upgrade-v12]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  upgradeClass(button.dataset.classUpgradeV12);
}, true);

function pirateUnit(kind, index, options) {
  return {
    id: nextPirateId++, kind, enemy: true, boss: kind === 'pirateCaptain',
    hp: options.hp, maxHp: options.hp,
    attack: 0,
    pirateDamage: options.damage,
    pirateInterval: options.interval,
    pirateTimer: options.interval,
    range: options.range,
    speed: options.speed,
    cool: 0, wander: 0, vx: 0, vy: 0,
    x: 1490 + index * 54,
    y: 485 + (index % 3) * 125
  };
}

function makePirateRaid() {
  const units = [];
  units.push(pirateUnit('pirateCaptain', 0, { hp: 500, damage: 44, interval: 1.5, range: 58, speed: 72 }));
  for (let i = 0; i < 3; i++) {
    units.push(pirateUnit('pirateCrew', i + 1, { hp: 100, damage: 10, interval: 1.0, range: 55, speed: 78 }));
  }
  for (let i = 0; i < 2; i++) {
    units.push(pirateUnit('pirateCannon', i + 4, { hp: 300, damage: 30, interval: 2.5, range: 280, speed: 48 }));
  }
  return units;
}

function chooseRaidReplacement(game) {
  if (!game?.raidActive || lastRaidActive) return;
  const state = ensureState(game.state);
  const cycle = Math.max(1, Math.floor(Number(game.state.raidCycleCount) || Number(game.state.raidNumber) || 1));
  const chosen = Math.random() < PIRATE_CHANCE;
  state.lastRaidCycle = cycle;
  state.lastRaidWasPirate = chosen;
  pirateActive = chosen;
  game.pirateRaidActive = chosen;

  if (chosen) {
    game.enemies.splice(0, game.enemies.length, ...makePirateRaid());
    game.fourthRaid = false;
    game.fifthRaid = false;
    game.raidPhase = 'pirate';
    toast('🏴‍☠️ 해적 습격! 일반 습격 대신 해적들이 쳐들어왔어!');
  }
  saveImmediate();
}

function nearestLiving(from, units) {
  let best = null;
  let bestDistance = Infinity;
  for (const unit of units || []) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(from.x - unit.x, from.y - unit.y);
    if (d < bestDistance) {
      best = unit;
      bestDistance = d;
    }
  }
  return best;
}

function updatePirateAttacks(dt) {
  if (!currentGame || !currentGame.raidActive || !pirateActive) return;
  const allies = (currentGame.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0);
  if (!allies.length) return;

  for (const pirate of currentGame.enemies || []) {
    if (!pirate || pirate.hp <= 0 || !['pirateCaptain', 'pirateCrew', 'pirateCannon'].includes(pirate.kind)) continue;
    pirate.pirateTimer = Math.max(0, (Number(pirate.pirateTimer) || 0) - dt);
    const target = nearestLiving(pirate, allies);
    if (!target) continue;
    const d = Math.hypot(target.x - pirate.x, target.y - pirate.y);
    if (d <= (Number(pirate.range) || 55) && pirate.pirateTimer <= 0) {
      target.hp -= Number(pirate.pirateDamage) || 0;
      pirate.pirateTimer = Number(pirate.pirateInterval) || 1;
    }
  }
}

function patchRaidLabel() {
  if (!currentGame?.raidActive || !pirateActive) return;
  const raid = document.querySelector('#raidText');
  if (!raid) return;
  const alive = (currentGame.enemies || []).filter(enemy => enemy?.hp > 0).length;
  raid.textContent = `🏴‍☠️ 해적 습격 · 남은 적 ${alive}명`;
}

function handleRaidEnd(game) {
  if (!game) return;
  if (!game.raidActive && lastRaidActive) {
    pirateActive = false;
    game.pirateRaidActive = false;
  }
  lastRaidActive = Boolean(game.raidActive);
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawUnit = rendererProto.drawUnit;

rendererProto.draw = function drawWithClassUpgradePirates(game) {
  currentGame = game;
  ensureState(game.state);
  const now = performance.now();
  const dt = Math.min(.1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;

  // 기존 습격 확장/밸런스 모듈이 먼저 일반 습격 구성을 만든 뒤 30% 교체를 판정한다.
  const wasRaidActive = lastRaidActive;
  const result = originalDraw.call(this, game);
  if (game.raidActive && !wasRaidActive) chooseRaidReplacement(game);
  syncAlliedUpgrades();
  updatePirateAttacks(dt);
  patchUpgradePanel();
  patchRaidLabel();
  handleRaidEnd(game);
  return result;
};

rendererProto.drawUnit = function drawPirateUnits(ctx, unit) {
  if (!unit || !['pirateCaptain', 'pirateCrew', 'pirateCannon'].includes(unit.kind)) {
    return originalDrawUnit.call(this, ctx, unit);
  }
  if (unit.hp <= 0) return;
  const isCaptain = unit.kind === 'pirateCaptain';
  const isCannon = unit.kind === 'pirateCannon';
  const icon = isCaptain ? '🏴‍☠️' : isCannon ? '💣' : '☠️';
  const label = isCaptain ? '해적 선장' : isCannon ? '해적 대포병' : '해적 선원';
  const width = isCaptain ? 62 : isCannon ? 54 : 44;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = isCaptain ? '42px system-ui' : isCannon ? '35px system-ui' : '31px system-ui';
  ctx.fillText(icon, unit.x, unit.y + 12);
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.fillRect(unit.x - width / 2, unit.y - 34, width, 6);
  ctx.fillStyle = '#a43d3d';
  ctx.fillRect(unit.x - width / 2, unit.y - 34, width * Math.max(0, unit.hp / unit.maxHp), 6);
  ctx.fillStyle = '#6e2525';
  ctx.font = '800 10px system-ui';
  ctx.fillText(label, unit.x, unit.y + 34);
  ctx.restore();
};

setInterval(() => {
  if (!currentGame) return;
  syncAlliedUpgrades();
  patchUpgradePanel();
  patchRaidLabel();
}, 120);
