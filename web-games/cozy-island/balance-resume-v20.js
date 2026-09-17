import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const RAID_INTERVAL = 120;
const KNIGHT_CAVALRY_MULTIPLIER = 1.7;
const DAMAGE_BUFFER = 260;

let currentGame = null;
let activeRuntime = null;
let resumeSnapshot = null;
let resumeApplied = false;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function primitiveClone(unit) {
  const copy = {};
  for (const [key, value] of Object.entries(unit || {})) {
    if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) copy[key] = value;
  }
  return copy;
}

function raidState(state) {
  if (!state || typeof state !== 'object') return null;
  const saved = state.raidResumeV20 && typeof state.raidResumeV20 === 'object' ? state.raidResumeV20 : {};
  state.raidResumeV20 = saved;
  saved.active = Boolean(saved.active);
  saved.cycle = Math.max(0, Math.floor(Number(saved.cycle) || 0));
  saved.raidNumber = Math.max(0, Math.floor(Number(saved.raidNumber) || 0));
  saved.pirate = Boolean(saved.pirate);
  saved.enemies = Array.isArray(saved.enemies) ? saved.enemies.slice(0, 24) : [];
  return saved;
}

function previousBaseRaidNumber(current) {
  const n = Math.max(1, Math.min(3, Math.floor(Number(current) || 1)));
  return n === 1 ? 3 : n - 1;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithRaidResume(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  const saved = raidState(progress);
  if (saved?.active) {
    resumeSnapshot = {
      active: true,
      cycle: Math.max(1, saved.cycle || Number(progress.raidCycleCount) || 1),
      raidNumber: Math.max(1, saved.raidNumber || Number(progress.raidNumber) || 1),
      phase: saved.phase ?? null,
      pirate: Boolean(saved.pirate),
      enemies: saved.enemies.map(primitiveClone)
    };
    resumeApplied = false;
    // 첫 프레임에 같은 습격을 다시 시작하게 만든 뒤 저장된 적 상태를 복원한다.
    progress.raidTimer = RAID_INTERVAL;
    progress.raidCycleCount = Math.max(0, resumeSnapshot.cycle - 1);
    progress.raidNumber = previousBaseRaidNumber(resumeSnapshot.raidNumber);
  }
  return progress;
};

function syncRaidSnapshot(game) {
  if (!game?.state) return;
  const saved = raidState(game.state);
  saved.active = Boolean(game.raidActive);
  saved.cycle = Math.max(0, Math.floor(Number(game.state.raidCycleCount) || 0));
  saved.raidNumber = Math.max(0, Math.floor(Number(game.state.raidNumber) || 0));
  saved.phase = game.raidPhase ?? null;
  saved.pirate = Boolean(game.pirateRaidActive);
  saved.enemies = saved.active ? (game.enemies || []).filter(unit => unit?.hp > 0).map(primitiveClone).slice(0, 24) : [];
  saved.savedAt = Date.now();
}

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithRaidResume(progress, delay) {
  activeRuntime = this;
  if (currentGame?.state === progress) syncRaidSnapshot(currentGame);
  return originalQueueSaveProgress.call(this, progress, delay);
};

function forceResume() {
  if (document.hidden || !activeRuntime?.paused) return;
  activeRuntime.setPaused(false, 'visible-resume');
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) forceResume();
});
window.addEventListener('pageshow', () => {
  forceResume();
  requestAnimationFrame(forceResume);
});
window.addEventListener('focus', forceResume);

function patchEnemyBalance(game) {
  for (const enemy of game?.enemies || []) {
    if (!enemy || enemy.hp <= 0) continue;
    if (enemy.kind === 'blackArcher') enemy.attack = 17.5;
    else if (enemy.kind === 'blackHeavy') enemy.attack = 50;
    else if (enemy.kind === 'fireSoldier') enemy.fireDamage = 20;
    else if (enemy.kind === 'blackGeneral') enemy.generalDamage = 30;
  }
}

function boostKnightAndCavalry(game) {
  for (const unit of game?.allies || []) {
    if (!unit || unit.enemy || unit.hp <= 0 || !['knight', 'cavalry'].includes(unit.kind)) continue;
    const meta = unit.__classUpgradeV12;
    if (meta) {
      const unboosted = Math.max(0, Number(meta.lastAppliedAttack) || Number(unit.attack) || 0);
      const boosted = Math.round(unboosted * KNIGHT_CAVALRY_MULTIPLIER * 100) / 100;
      unit.attack = boosted;
      // 클래스 강화 모듈이 다음 프레임에 이것을 외부 추가 공격력으로 오인하지 않게 동기화한다.
      meta.lastAppliedAttack = boosted;
      unit.__balanceV20Boosted = boosted;
      continue;
    }
    const current = Math.max(0, Number(unit.attack) || 0);
    const previousBoosted = Number(unit.__balanceV20Boosted);
    if (!Number.isFinite(Number(unit.__balanceV20Base)) || (Number.isFinite(previousBoosted) && Math.abs(current - previousBoosted) > .01)) {
      unit.__balanceV20Base = current;
    }
    const boosted = Math.round((Number(unit.__balanceV20Base) || current) * KNIGHT_CAVALRY_MULTIPLIER * 100) / 100;
    unit.attack = boosted;
    unit.__balanceV20Boosted = boosted;
  }
}

function beginSensitiveDamageWindow(game) {
  const phase = Number(game?.raidPhase);
  const fieldMission = !game?.raidActive && (game?.allies || []).some(unit => unit?._darknessFlameMission && unit.hp > 0);
  const generalRaid = game?.raidActive && phase === 10 && !game.pirateRaidActive;
  if (!fieldMission && !generalRaid) return null;

  const records = new Map();
  for (const unit of game.allies || []) {
    if (!unit || unit.hp <= 0) continue;
    if (fieldMission && !unit._darknessFlameMission) continue;
    records.set(unit.id, { hp: Number(unit.hp) || 0 });
    unit.hp += DAMAGE_BUFFER;
  }
  return { records, fieldMission, generalRaid };
}

function near(value, target, tolerance = 1.25) {
  return Math.abs(value - target) <= tolerance;
}

function adjustedFieldDamage(raw) {
  if (near(raw, 25)) return 25;      // 검은 병사 유지
  if (near(raw, 35)) return 17.5;    // 검은 궁수 0.5배
  if (near(raw, 45)) return 50;      // 검은 중갑병 50
  if (near(raw, 40)) return 20;      // 화염병 0.5배
  if (near(raw, 60)) return 30;      // 검은 장군 기본타 0.5배
  if (near(raw, 120)) return 60;     // 검은 장군 강타도 0.5배
  return raw;
}

function adjustedRaidDamage(raw) {
  // v20에서 일반 공격값은 이미 절반으로 바뀌지만, 검은 장군 30% 강타는 기존 코드에 120이 고정돼 있다.
  if (near(raw, 120)) return 60;
  return raw;
}

function finishSensitiveDamageWindow(game, windowState) {
  if (!windowState) return;
  const deadIds = new Set();
  for (const unit of game.allies || []) {
    const before = windowState.records.get(unit?.id);
    if (!before) continue;
    const rawLoss = Math.max(0, before.hp + DAMAGE_BUFFER - (Number(unit.hp) || 0));
    const desiredLoss = windowState.fieldMission ? adjustedFieldDamage(rawLoss) : adjustedRaidDamage(rawLoss);
    unit.hp = Math.min(Number(unit.maxHp) || before.hp, before.hp - desiredLoss);
    if (unit.hp <= 0) deadIds.add(unit.id);
  }
  if (deadIds.size) {
    for (let i = game.allies.length - 1; i >= 0; i--) {
      if (deadIds.has(game.allies[i]?.id)) game.allies.splice(i, 1);
    }
    game.state.army = (game.allies || []).filter(unit => unit?.hp > 0).map(unit => ({ kind: unit.kind }));
    activeRuntime?.queueSaveProgress(game.state, 0);
  }
}

function applySavedRaid(game) {
  if (!resumeSnapshot || resumeApplied || !game?.raidActive) return;
  resumeApplied = true;

  // 해적 습격은 내부 공격 타이머 상태가 별도 모듈에 있으므로 새로 시작된 해적 구성을 유지한다.
  if (!resumeSnapshot.pirate && resumeSnapshot.enemies.length) {
    const restored = resumeSnapshot.enemies.filter(unit => Number(unit.hp) > 0).map(primitiveClone);
    game.enemies.splice(0, game.enemies.length, ...restored);
    game.raidPhase = resumeSnapshot.phase;
    game.pirateRaidActive = false;
    game.fourthRaid = Number(resumeSnapshot.phase) === 4;
    game.fifthRaid = Number(resumeSnapshot.phase) === 5;
    game.sixthRaid = Number(resumeSnapshot.phase) === 6;
    game.seventhRaid = Number(resumeSnapshot.phase) === 7;
    game.eighthRaid = Number(resumeSnapshot.phase) === 8;
    game.ninthRaid = Number(resumeSnapshot.phase) === 9;
    game.tenthRaid = Number(resumeSnapshot.phase) === 10;
  }

  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = '⚔️ 진행 중이던 습격을 이어서 시작했어';
    toast.classList.add('show');
    clearTimeout(applySavedRaid.timer);
    applySavedRaid.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  resumeSnapshot = null;
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;

proto.draw = function drawWithBalanceAndResume(game) {
  currentGame = game;
  forceResume();

  // 지난 프레임에 만들어진 습격 적은 기본 전투가 돌기 전에 이미 조정된 값을 유지한다.
  patchEnemyBalance(game);
  boostKnightAndCavalry(game);
  const damageWindow = beginSensitiveDamageWindow(game);

  const result = originalDraw.call(this, game);

  finishSensitiveDamageWindow(game, damageWindow);
  applySavedRaid(game);
  patchEnemyBalance(game);
  boostKnightAndCavalry(game);
  syncRaidSnapshot(game);
  return result;
};

// 렌더 사이에도 수치가 원복되지 않도록 짧은 주기로 유지한다.
setInterval(() => {
  if (!currentGame) return;
  forceResume();
  patchEnemyBalance(currentGame);
  boostKnightAndCavalry(currentGame);
  syncRaidSnapshot(currentGame);
}, 120);
