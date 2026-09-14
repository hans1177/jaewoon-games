import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_PRICE = 100;
const EXPLORER_PRICE = 100;
const EXPLORER_REWARD_MIN = 100;
const EXPLORER_REWARD_MAX = 200;
const FISH_WINDOW_MS = 60000;
const FISH_LIMIT = 5;
const BARRACKS_BATCH = 5;
const BARRACKS_COOLDOWN_MS = 30000;
const FISH_SPOT = { x: 520, y: 430, radius: 90 };

let currentGame = null;
let activeRuntime = null;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureEconomy(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.economyBalanceV4 && typeof state.economyBalanceV4 === 'object' ? state.economyBalanceV4 : {};
  state.economyBalanceV4 = old;
  old.fishingAttempts = Array.isArray(old.fishingAttempts)
    ? old.fishingAttempts.map(Number).filter(Number.isFinite).slice(-FISH_LIMIT)
    : [];
  old.barracksBatchCount = Math.max(0, Math.min(BARRACKS_BATCH - 1, Math.floor(Number(old.barracksBatchCount) || 0)));
  old.barracksCooldownUntil = Math.max(0, Number(old.barracksCooldownUntil) || 0);
  const trips = Math.max(0, Math.floor(Number(state.townHallExpansion?.explorerTrips) || 0));
  const earned = Math.max(0, Math.floor(Number(state.townHallExpansion?.explorerEarned) || 0));
  if (!Number.isFinite(Number(old.explorerAdjustedTrips))) old.explorerAdjustedTrips = trips;
  if (!Number.isFinite(Number(old.explorerLastEarned))) old.explorerLastEarned = earned;
  return old;
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function adjustExplorerReward(state) {
  const econ = ensureEconomy(state);
  const expansion = state?.townHallExpansion;
  if (!econ || !expansion) return;
  const trips = Math.max(0, Math.floor(Number(expansion.explorerTrips) || 0));
  const earned = Math.max(0, Math.floor(Number(expansion.explorerEarned) || 0));
  const lastTrips = Math.max(0, Math.floor(Number(econ.explorerAdjustedTrips) || 0));
  const lastEarned = Math.max(0, Math.floor(Number(econ.explorerLastEarned) || 0));

  if (trips > lastTrips) {
    const originalReward = earned - lastEarned;
    if (expansion.explorerAlive && originalReward >= 200 && originalReward <= 500) {
      const reward = EXPLORER_REWARD_MIN + Math.floor(Math.random() * (EXPLORER_REWARD_MAX - EXPLORER_REWARD_MIN + 1));
      const correction = reward - originalReward;
      state.coins = Math.max(0, (Number(state.coins) || 0) + correction);
      expansion.explorerEarned = Math.max(0, earned + correction);
      setTimeout(() => toast(`🧭 탐험 귀환 · ${reward}골드 획득! 다시 3분 탐색 출발`), 0);
    }
    econ.explorerAdjustedTrips = trips;
    econ.explorerLastEarned = Math.max(0, Math.floor(Number(expansion.explorerEarned) || 0));
  } else if (trips === lastTrips && earned < lastEarned) {
    econ.explorerLastEarned = earned;
  }
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithEconomyBalance(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureEconomy(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithEconomyBalance(state, delay) {
  activeRuntime = this;
  adjustExplorerReward(state);
  ensureEconomy(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function save() {
  if (!currentGame?.state) return;
  ensureEconomy(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
}

function workerNumber(value) {
  if (value && typeof value === 'object') return Math.max(0, Math.floor(Number(value.count) || 0));
  return Math.max(0, Math.floor(Number(value) || 0));
}

function totalWorkers(state) {
  const production = state?.productionBuildings || {};
  return Math.min(3, workerNumber(state?.workers) + (production.lumberWorker ? 1 : 0) + (production.mineWorker ? 1 : 0));
}

function buyWorker100(event) {
  const button = event.target.closest?.('[data-worker]');
  if (!button || !currentGame) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  const state = currentGame.state;
  const total = totalWorkers(state);
  if (total >= 3) {
    toast('노비는 최대 3명이야');
    return true;
  }
  const coins = Number(state.coins) || 0;
  if (coins < WORKER_PRICE) {
    toast(`노비 구매에는 ${WORKER_PRICE}골드가 필요해`);
    return true;
  }
  state.coins = coins - WORKER_PRICE;
  state.workers = workerNumber(state.workers) + 1;
  state.workerTotal = total + 1;
  save();
  toast('🧑‍🌾 노비 구매 · 100골드');
  return true;
}

function buyExplorer100(event) {
  const button = event.target.closest?.('[data-explorer-worker]');
  if (!button || !currentGame) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  const state = currentGame.state;
  const expansion = state.townHallExpansion;
  if (!expansion?.upgraded) {
    toast('🏛️ 마을회관 Lv.2가 필요해');
    return true;
  }
  if (expansion.explorerAlive) {
    toast('🧭 탐험 노비는 이미 1명이야');
    return true;
  }
  const coins = Number(state.coins) || 0;
  if (coins < EXPLORER_PRICE) {
    toast(`탐험 노비 구매에는 ${EXPLORER_PRICE}골드가 필요해`);
    return true;
  }
  state.coins = coins - EXPLORER_PRICE;
  expansion.explorerAlive = true;
  expansion.explorerActive = true;
  expansion.explorerElapsed = 0;
  expansion.explorerDoomed = Math.random() < .20;
  save();
  toast('🧭 탐험 노비 구매 · 100골드 · 3분 탐색 출발');
  return true;
}

function cooldownSeconds(state = currentGame?.state) {
  const econ = ensureEconomy(state);
  if (!econ) return 0;
  const left = Math.max(0, econ.barracksCooldownUntil - Date.now());
  if (!left && econ.barracksCooldownUntil) {
    econ.barracksCooldownUntil = 0;
    econ.barracksBatchCount = 0;
  }
  return Math.ceil(left / 1000);
}

function livingArmyCount() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier','archer','knight','cavalry'].includes(unit.kind)).length;
}

function recordRecruit(delta) {
  if (!currentGame || delta <= 0) return;
  const econ = ensureEconomy(currentGame.state);
  for (let i = 0; i < delta; i++) {
    econ.barracksBatchCount += 1;
    if (econ.barracksBatchCount >= BARRACKS_BATCH) {
      econ.barracksBatchCount = 0;
      econ.barracksCooldownUntil = Date.now() + BARRACKS_COOLDOWN_MS;
      toast('🏕️ 병영 5명 모집 완료 · 30초 쿨타임');
      break;
    }
  }
  save();
}

function handleRecruitCapture(event) {
  const button = event.target.closest?.('[data-rec], [data-knight-recruit], [data-allied-cavalry]');
  if (!button || !currentGame) return;
  const left = cooldownSeconds();
  if (left > 0) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toast(`🏕️ 병영 쿨타임 ${left}초`);
    return;
  }
  const before = livingArmyCount();
  setTimeout(() => {
    const after = livingArmyCount();
    if (after > before) recordRecruit(after - before);
  }, 0);
}

document.addEventListener('click', event => {
  if (buyWorker100(event)) return;
  if (buyExplorer100(event)) return;
  handleRecruitCapture(event);
}, true);

function fishingGate(event) {
  if (!currentGame || event.defaultPrevented) return;
  if (event.type === 'keydown' && (event.code !== 'Space' || event.repeat)) return;
  const toolText = document.querySelector('#toolButton')?.textContent || '';
  if (!toolText.includes('낚싯대')) return;
  const player = currentGame.player;
  if (!player || Math.hypot(player.x - FISH_SPOT.x, player.y - FISH_SPOT.y) > FISH_SPOT.radius) return;
  if (document.querySelector('dialog[open]')) return;

  const econ = ensureEconomy(currentGame.state);
  const now = Date.now();
  econ.fishingAttempts = econ.fishingAttempts.filter(time => now - time < FISH_WINDOW_MS);
  if (econ.fishingAttempts.length >= FISH_LIMIT) {
    const remain = Math.max(1, Math.ceil((FISH_WINDOW_MS - (now - econ.fishingAttempts[0])) / 1000));
    event.preventDefault();
    event.stopImmediatePropagation();
    toast(`🎣 낚시는 1분에 ${FISH_LIMIT}번만 가능 · ${remain}초 뒤 가능`);
    return;
  }
  econ.fishingAttempts.push(now);
  save();
}

document.querySelector('#actionButton')?.addEventListener('pointerdown', fishingGate, true);
window.addEventListener('keydown', fishingGate, true);

function patchPanels() {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const body = document.querySelector('#panelBody');
  const title = document.querySelector('#panelTitle')?.textContent || '';
  if (!panel?.open || !body) return;

  if (title === '노비 판매소') {
    const worker = body.querySelector('[data-worker]');
    const workerCost = worker?.querySelector('b');
    if (workerCost && workerCost.textContent !== `${WORKER_PRICE}골드`) workerCost.textContent = `${WORKER_PRICE}골드`;
    const explorer = body.querySelector('[data-explorer-worker]');
    if (explorer && !currentGame.state.townHallExpansion?.explorerAlive) {
      const cost = explorer.querySelector('b');
      if (cost) cost.textContent = `${EXPLORER_PRICE}골드`;
    }
    const explorerNote = body.querySelector('[data-explorer-note]');
    if (explorerNote) {
      const earned = Math.max(0, Math.floor(Number(currentGame.state.townHallExpansion?.explorerEarned) || 0));
      explorerNote.textContent = `탐험 전용 추가 노비 · 3분마다 100~200골드 · 출발마다 사망 확률 20% · 누적 ${earned}골드`;
    }
  }

  if (title === '병영') {
    const left = cooldownSeconds();
    const econ = ensureEconomy(currentGame.state);
    let note = body.querySelector('[data-barracks-cooldown]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'panel-note';
      note.dataset.barracksCooldown = '1';
      body.appendChild(note);
    }
    note.textContent = left > 0
      ? `병영 쿨타임 · ${left}초 남음`
      : `병영 모집 묶음 · ${econ.barracksBatchCount}/${BARRACKS_BATCH}명 · 5명 모집마다 30초 쿨타임`;

    for (const button of body.querySelectorAll('[data-rec], [data-knight-recruit], [data-allied-cavalry]')) {
      if (left > 0) {
        if (!button.disabled) button.dataset.economyCooldownDisabled = '1';
        button.disabled = true;
      } else if (button.dataset.economyCooldownDisabled === '1') {
        button.disabled = false;
        delete button.dataset.economyCooldownDisabled;
      }
    }
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithEconomyBalance(game) {
  currentGame = game;
  ensureEconomy(game.state);
  originalDraw.call(this, game);
};

setInterval(patchPanels, 200);
