import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_PRICE = 50;
const EXPLORER_PRICE = 50;
const FISHING_COOLDOWN_MS = 30000;
const WOLF_HIDE_PRICE = 30;
const WEST = { x1: -2850, x2: 165, y1: 160, y2: 1025 };
const BEAR_RESPAWN_MS = 60000;
const BEAR_HP = 400;
const BEAR_ATTACK = 30;
const BEAR_CRIT_CHANCE = 0.40;
const BEAR_ATTACK_INTERVAL = 1;
const BEAR_SPAWNS = [
  { x: -620, y: 335 },
  { x: -1120, y: 790 },
  { x: -1880, y: 360 },
  { x: -2580, y: 840 }
];

let currentGame = null;
let activeRuntime = null;
let selectedBearId = null;
let nextBearId = 995000;
let lastTick = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastHandledAt = 0;
const bears = BEAR_SPAWNS.map((point, slot) => makeBear(slot, point));

const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;
JaewoonVibeRuntime.prototype.queueSaveProgress = function queueWithBalanceV5(state, delay) {
  activeRuntime = this;
  ensureV5State(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function ensureV5State(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.cozyBalanceV5 && typeof state.cozyBalanceV5 === 'object' ? state.cozyBalanceV5 : {};
  state.cozyBalanceV5 = old;
  old.fishingLastAt = Math.max(0, Number(old.fishingLastAt) || 0);
  return old;
}

function save() {
  if (!currentGame?.state) return;
  ensureV5State(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
  updateCoins();
}

function updateCoins() {
  const el = document.querySelector('#coinText');
  if (el && currentGame?.state) el.textContent = String(Math.floor(Number(currentGame.state.coins) || 0));
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

function workerCount(state) {
  return Math.max(0, Math.floor(Number(state?.workerTotal ?? state?.workers) || 0));
}

function buyWorker() {
  if (!currentGame) return;
  const state = currentGame.state;
  if (workerCount(state) >= 3) return toast('노비는 최대 3명이야');
  const coins = Number(state.coins) || 0;
  if (coins < WORKER_PRICE) return toast('노비 구매에는 50골드가 필요해');
  state.coins = coins - WORKER_PRICE;
  state.workers = Math.max(0, Math.floor(Number(state.workers) || 0)) + 1;
  state.workerTotal = Math.min(3, workerCount(state) + 1);
  save();
  toast('🧑‍🌾 노비가 일을 시작했어 · 50골드');
}

function buyExplorer() {
  if (!currentGame) return;
  const expansion = currentGame.state.townHallExpansion;
  if (!expansion?.upgraded) return toast('🏛️ 마을회관 Lv.2가 필요해');
  if (expansion.explorerAlive) return toast('🧭 탐험 노비는 이미 1명이야');
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < EXPLORER_PRICE) return toast('탐험 노비 구매에는 50골드가 필요해');
  currentGame.state.coins = coins - EXPLORER_PRICE;
  expansion.explorerAlive = true;
  expansion.explorerActive = true;
  expansion.explorerElapsed = 0;
  expansion.explorerDoomed = Math.random() < .20;
  save();
  toast('🧭 탐험 노비 출발 · 50골드 · 3분 뒤 귀환');
}

// economy-west-v2가 등록하는 100골드 보정 리스너보다 먼저 실행된다.
window.addEventListener('click', event => {
  if (!currentGame) return;
  const worker = event.target?.closest?.('[data-worker]');
  if (worker && !worker.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    buyWorker();
    return;
  }
  const explorer = event.target?.closest?.('[data-explorer-worker]');
  if (explorer && !explorer.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    buyExplorer();
  }
}, true);

function installFishingCooldown() {
  if (window.__cozyFishing30sV5) return;
  window.__cozyFishing30sV5 = true;
  const innerShowModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function showModalWithFishingCooldown(...args) {
    if (this.id === 'fishing' && currentGame) {
      const v5 = ensureV5State(currentGame.state);
      const now = Date.now();
      const remain = FISHING_COOLDOWN_MS - (now - v5.fishingLastAt);
      if (remain > 0) {
        toast(`🎣 낚시 쿨타임 · ${Math.ceil(remain / 1000)}초`);
        return;
      }
      // 이전 1분 5회 제한 기록은 제거하고 30초 고정 쿨타임만 사용한다.
      if (currentGame.state.cozyExpansionV4?.fishing) currentGame.state.cozyExpansionV4.fishing.attempts = [];
      v5.fishingLastAt = now;
      save();
    }
    return innerShowModal.apply(this, args);
  };
}

setTimeout(installFishingCooldown, 0);

function sellWolfHide() {
  if (!currentGame) return;
  const inv = currentGame.state.inventory || (currentGame.state.inventory = {});
  const hides = Math.max(0, Math.floor(Number(inv.wolfHide) || 0));
  if (!hides) return toast('팔 늑대가죽이 없어');
  inv.wolfHide = hides - 1;
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) + WOLF_HIDE_PRICE;
  save();
  patchPanels();
  toast(`🐺 늑대가죽 1개 판매 · +${WOLF_HIDE_PRICE}골드`);
}

function patchPanels() {
  if (!currentGame) return;
  const title = document.querySelector('#panelTitle')?.textContent || '';
  const body = document.querySelector('#panelBody');
  if (!body) return;

  if (title === '노비 판매소') {
    const worker = body.querySelector('[data-worker]');
    if (worker) {
      const price = worker.querySelector('b');
      if (price) price.textContent = '50골드';
    }
    const explorer = body.querySelector('[data-explorer-worker]');
    if (explorer && !currentGame.state.townHallExpansion?.explorerAlive) {
      const price = explorer.querySelector('b');
      if (price) price.textContent = '50골드';
    }
  }

  if (title === '가방') {
    let sell = body.querySelector('[data-sell-wolf-hide]');
    if (!sell) {
      sell = document.createElement('button');
      sell.className = 'choice';
      sell.dataset.sellWolfHide = '1';
      sell.addEventListener('click', sellWolfHide);
      body.appendChild(sell);
    }
    const hides = Math.max(0, Math.floor(Number(currentGame.state.inventory?.wolfHide) || 0));
    sell.innerHTML = `<span>🐺 늑대가죽 판매 (${hides}개)</span><b>1개당 ${WOLF_HIDE_PRICE}골드</b>`;
    sell.disabled = hides <= 0;
  }
}

function makeBear(slot, point) {
  return {
    id: nextBearId++, slot,
    x: point.x, y: point.y, homeX: point.x, homeY: point.y,
    hp: BEAR_HP, maxHp: BEAR_HP,
    attack: BEAR_ATTACK, speed: 62, range: 58,
    cool: 0, alive: true, respawnAt: 0,
    wander: 0, vx: 0, vy: 0
  };
}

function westUnlocked() {
  return Boolean(currentGame?.state?.cozyExpansionV4?.west?.unlocked);
}

function troops() {
  return (currentGame?.allies || []).filter(unit => unit && !unit.enemy && unit.hp > 0 && ['soldier', 'archer', 'knight', 'cavalry'].includes(unit.kind));
}

function otherCombatActive() {
  if (!currentGame) return true;
  if (currentGame.raidActive || currentGame.selectedWolfId != null || currentGame.selectedBoarId != null || currentGame.jungleCombatActive) return true;
  return troops().some(unit => unit._northMission || unit._westMission);
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function selectBearAt(sx, sy) {
  if (!currentGame || !westUnlocked() || currentGame.raidActive) return false;
  const now = performance.now();
  if (now - lastHandledAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;
  let best = null;
  let bestDistance = 66;
  for (const bear of bears) {
    if (!bear.alive) continue;
    const d = Math.hypot(point.x - bear.x, point.y - bear.y);
    if (d < bestDistance) { best = bear; bestDistance = d; }
  }
  if (!best) return false;
  lastHandledAt = now;
  if (otherCombatActive() && selectedBearId == null) {
    toast('다른 야외 전투가 끝난 뒤 곰을 지정할 수 있어');
    return true;
  }
  const units = troops();
  if (!units.length) {
    toast('출동할 병력이 없어');
    return true;
  }
  selectedBearId = best.id;
  for (const unit of units) {
    unit._fieldMission = true;
    unit._westBearMission = true;
    unit._westBearReturning = false;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  toast(`🐻 야생 곰 지정 · 병력 ${units.length}명 출동`);
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!selectBearAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const doubleTap = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!doubleTap || !selectBearAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x, dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  unit.x += dx / d * unit.speed * dt;
  unit.y += dy / d * unit.speed * dt;
}

function nearest(from, units) {
  let best = null, bestDistance = Infinity;
  for (const unit of units) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(from.x - unit.x, from.y - unit.y);
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return best;
}

function releaseBearTroops(returnHome = true) {
  for (const unit of troops()) {
    if (!unit._westBearMission) continue;
    unit._fieldMission = false;
    unit._westBearMission = false;
    unit._westBearReturning = returnHome;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
}

function returnBearTroops(dt) {
  if (!currentGame || selectedBearId != null || currentGame.raidActive) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of troops()) {
    if (!unit._westBearReturning) continue;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    const d = Math.hypot(barracks.x - unit.x, barracks.y - unit.y);
    if (d <= 90) {
      unit._westBearReturning = false;
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
    save();
  }
}

function respawnBear(bear) {
  const point = BEAR_SPAWNS[bear.slot];
  Object.assign(bear, makeBear(bear.slot, point), { id: bear.id });
}

function updateBears(dt) {
  if (!currentGame || !westUnlocked()) return;
  const now = Date.now();
  let selected = bears.find(bear => bear.id === selectedBearId && bear.alive && bear.hp > 0) || null;
  if (selectedBearId != null && !selected) {
    selectedBearId = null;
    releaseBearTroops(true);
  }

  for (const bear of bears) {
    if (!bear.alive) {
      if (bear.respawnAt && now >= bear.respawnAt) respawnBear(bear);
      continue;
    }
    bear.cool = Math.max(0, bear.cool - dt);

    if (!selected || bear.id !== selected.id || currentGame.raidActive) {
      bear.wander -= dt;
      if (bear.wander <= 0) {
        const a = Math.random() * Math.PI * 2;
        bear.vx = Math.cos(a);
        bear.vy = Math.sin(a);
        bear.wander = 1.6 + Math.random() * 2.6;
      }
      const nx = bear.x + bear.vx * bear.speed * .18 * dt;
      const ny = bear.y + bear.vy * bear.speed * .18 * dt;
      if (nx > WEST.x1 + 70 && nx < WEST.x2 - 70) bear.x = nx; else bear.vx *= -1;
      if (ny > WEST.y1 + 55 && ny < WEST.y2 - 55) bear.y = ny; else bear.vy *= -1;
      continue;
    }

    const units = troops();
    if (!units.length) {
      selectedBearId = null;
      releaseBearTroops(false);
      toast('🐻 곰 전투 병력이 전멸했어');
      break;
    }

    for (const unit of units) {
      unit._fieldMission = true;
      unit._westBearMission = true;
      unit._westBearReturning = false;
      unit.wander = 999;
      unit.vx = 0;
      unit.vy = 0;
      unit.cool = Math.max(0, Number(unit.cool) || 0) - dt;
      const d = Math.hypot(bear.x - unit.x, bear.y - unit.y) || 1;
      if (d > unit.range) moveToward(unit, bear.x, bear.y, dt);
      else if (unit.cool <= 0) {
        bear.hp -= Number(unit.attack) || 0;
        unit.cool = unit.kind === 'archer' ? 1.15 : .85;
      }
    }

    const victim = nearest(bear, units);
    if (victim && bear.hp > 0) {
      const d = Math.hypot(victim.x - bear.x, victim.y - bear.y) || 1;
      if (d > bear.range) moveToward(bear, victim.x, victim.y, dt);
      else if (bear.cool <= 0) {
        const critical = Math.random() < BEAR_CRIT_CHANCE;
        victim.hp -= critical ? BEAR_ATTACK * 2 : BEAR_ATTACK;
        bear.cool = BEAR_ATTACK_INTERVAL;
        if (critical) toast('🐻 곰 강타! 2배 데미지');
        pruneDeadTroops();
      }
    }

    if (bear.hp <= 0) {
      bear.hp = 0;
      bear.alive = false;
      bear.respawnAt = now + BEAR_RESPAWN_MS;
      selectedBearId = null;
      releaseBearTroops(true);
      toast('🐻 야생 곰을 처치했어 · 60초 뒤 다시 출몰');
    }
  }

  returnBearTroops(dt);
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithBalanceV5(game) {
  currentGame = game;
  ensureV5State(game.state);
  const now = performance.now();
  const dt = Math.min(.08, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')) updateBears(dt);
  const result = originalDraw.call(this, game);
  return result;
};

rendererProto.drawObjects = function drawObjectsWithWestBears(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  if (!westUnlocked()) return;
  ctx.save();
  ctx.textAlign = 'center';
  for (const bear of bears) {
    if (!bear.alive) continue;
    const selected = bear.id === selectedBearId;
    ctx.font = '42px system-ui';
    ctx.fillText('🐻', bear.x, bear.y + 14);
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.fillRect(bear.x - 34, bear.y - 37, 68, 7);
    ctx.fillStyle = selected ? '#f0a43b' : '#8b4c35';
    ctx.fillRect(bear.x - 34, bear.y - 37, 68 * Math.max(0, bear.hp / bear.maxHp), 7);
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText('야생 곰', bear.x, bear.y + 38);
    if (selected) {
      ctx.strokeStyle = '#f0a43b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bear.x, bear.y, 38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
};

setInterval(patchPanels, 200);
