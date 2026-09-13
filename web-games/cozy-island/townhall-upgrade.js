import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const TOWN_HALL = { x: 1010, y: 1090, radius: 145 };
const CAVALRY_MAX = 2;
const CAVALRY_COST = 100;
const CAVALRY_HP = 320;
const CAVALRY_ATTACK = 25;
const CAVALRY_SPEED = 152; // 일반 병사 76의 2배
const EXPLORER_COST = 50;
const EXPLORER_SECONDS = 180;
const EXPLORER_DEATH_CHANCE = 0.20;
const EXPLORER_MIN_GOLD = 200;
const EXPLORER_MAX_GOLD = 500;
const BOAR_HIT_RADIUS = 62;

let currentGame = null;
let activeRuntime = null;
let cavalryInitialized = false;
let nextCavalryId = 970000;
let lastTick = performance.now();
let explorerSaveCarry = 0;
let externalBoarId = null;
let lastTap = { time: 0, x: 0, y: 0 };
let lastHandledAt = 0;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureTownHallExpansion(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.townHallExpansion && typeof state.townHallExpansion === 'object'
    ? state.townHallExpansion : {};
  const expansion = {
    upgraded: Boolean(old.upgraded),
    cavalryCount: Math.max(0, Math.min(CAVALRY_MAX, Math.floor(Number(old.cavalryCount) || 0))),
    explorerAlive: Boolean(old.explorerAlive),
    explorerActive: Boolean(old.explorerActive ?? old.explorerAlive),
    explorerElapsed: Math.max(0, Math.min(EXPLORER_SECONDS, Number(old.explorerElapsed) || 0)),
    explorerDoomed: Boolean(old.explorerDoomed),
    explorerTrips: Math.max(0, Math.floor(Number(old.explorerTrips) || 0)),
    explorerEarned: Math.max(0, Math.floor(Number(old.explorerEarned) || 0))
  };
  if (!expansion.explorerAlive) {
    expansion.explorerActive = false;
    expansion.explorerElapsed = 0;
    expansion.explorerDoomed = false;
  }
  state.townHallExpansion = expansion;
  return expansion;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithTownHallRewards(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureTownHallExpansion(progress);
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithTownHallRewards(progress, delay) {
  activeRuntime = this;
  const expansion = ensureTownHallExpansion(progress);
  if (currentGame?.state === progress && expansion && cavalryInitialized) {
    expansion.cavalryCount = livingCavalry().length;
  }
  return originalQueueSaveProgress.call(this, progress, delay);
};

function saveState() {
  if (!currentGame?.state) return;
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (cavalryInitialized) expansion.cavalryCount = livingCavalry().length;
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

function townHallBuilt() {
  return Boolean(currentGame?.state?.villageDevelopment?.townHallBuilt);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function livingCavalry() {
  return (currentGame?.allies || []).filter(unit => unit?.kind === 'cavalry' && !unit.enemy && unit.hp > 0);
}

function standardFieldTroops() {
  return (currentGame?.allies || []).filter(unit => unit?.hp > 0 && ['soldier', 'archer', 'knight'].includes(unit.kind));
}

function makeCavalry() {
  const barracks = currentGame?.barracks || { x: 1080, y: 650 };
  return {
    id: nextCavalryId++, kind: 'cavalry', enemy: false, boss: false,
    hp: CAVALRY_HP, maxHp: CAVALRY_HP, attack: CAVALRY_ATTACK,
    range: 55, speed: CAVALRY_SPEED, cool: Math.random() * .35,
    wander: 0, vx: 0, vy: 0,
    x: barracks.x + (Math.random() - .5) * 76,
    y: barracks.y + 64 + Math.random() * 60
  };
}

function restoreCavalry() {
  if (cavalryInitialized || !currentGame) return;
  cavalryInitialized = true;
  const expansion = ensureTownHallExpansion(currentGame.state);
  const existing = livingCavalry().length;
  for (let i = existing; i < expansion.cavalryCount; i++) currentGame.allies.push(makeCavalry());
  expansion.cavalryCount = livingCavalry().length;
}

function upgradeTownHall() {
  if (!currentGame || !townHallBuilt()) return toast('먼저 마을회관을 건설해야 해');
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (expansion.upgraded) return toast('🏛️ 마을회관은 이미 Lv.2야');
  expansion.upgraded = true;
  saveState();
  updateUpgradeButton();
  toast('🏛️ 마을회관 Lv.2 · 아군 기마병과 탐험 노비 해금!');
}

function setupUpgradeButton() {
  if (document.querySelector('#townHallUpgradeButton')) return;
  const button = document.createElement('button');
  button.id = 'townHallUpgradeButton';
  button.type = 'button';
  button.textContent = '🏛️ 마을회관 Lv.2 업그레이드';
  button.style.cssText = 'position:absolute;left:50%;bottom:365px;transform:translateX(-50%);z-index:12;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('click', upgradeTownHall);
  document.querySelector('#app')?.appendChild(button);
}

function updateUpgradeButton() {
  const button = document.querySelector('#townHallUpgradeButton');
  if (!button || !currentGame) return;
  const expansion = ensureTownHallExpansion(currentGame.state);
  const nearby = townHallBuilt() && !expansion.upgraded && distance(currentGame.player, TOWN_HALL) <= TOWN_HALL.radius;
  const next = nearby ? 'block' : 'none';
  if (button.style.display !== next) button.style.display = next;
}

function recruitCavalry() {
  if (!currentGame) return;
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (!expansion.upgraded) return toast('🏛️ 마을회관 Lv.2가 필요해');
  const count = livingCavalry().length;
  if (count >= CAVALRY_MAX) return toast('🏇 아군 기마병은 최대 2명이야');
  const food = Number(currentGame.state.inventory?.food) || 0;
  if (food < CAVALRY_COST) return toast(`🍖 식량 ${CAVALRY_COST} 필요`);
  currentGame.state.inventory.food = food - CAVALRY_COST;
  currentGame.allies.push(makeCavalry());
  expansion.cavalryCount = livingCavalry().length;
  currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
  saveState();
  patchPanels();
  toast(`🏇 기마병 합류 · 체력 ${CAVALRY_HP} · 공격 ${CAVALRY_ATTACK} · ${expansion.cavalryCount}/${CAVALRY_MAX}`);
}

function startExplorerTrip(expansion) {
  expansion.explorerAlive = true;
  expansion.explorerActive = true;
  expansion.explorerElapsed = 0;
  expansion.explorerDoomed = Math.random() < EXPLORER_DEATH_CHANCE;
}

function buyExplorer() {
  if (!currentGame) return;
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (!expansion.upgraded) return toast('🏛️ 마을회관 Lv.2가 필요해');
  if (expansion.explorerAlive) return toast('🧭 탐험 노비는 이미 1명이야');
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < EXPLORER_COST) return toast(`탐험 노비 구매에는 ${EXPLORER_COST}골드가 필요해`);
  currentGame.state.coins = coins - EXPLORER_COST;
  startExplorerTrip(expansion);
  saveState();
  patchPanels();
  toast('🧭 탐험 노비 출발 · 3분 뒤 귀환 · 출발할 때마다 사망 위험 20%');
}

function resolveExplorerTrip(expansion) {
  expansion.explorerTrips += 1;
  if (expansion.explorerDoomed) {
    expansion.explorerAlive = false;
    expansion.explorerActive = false;
    expansion.explorerElapsed = 0;
    expansion.explorerDoomed = false;
    saveState();
    toast('💀 탐험 노비가 탐색 중 죽었어 · 다시 고용할 수 있어');
    return;
  }
  const reward = EXPLORER_MIN_GOLD + Math.floor(Math.random() * (EXPLORER_MAX_GOLD - EXPLORER_MIN_GOLD + 1));
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) + reward;
  expansion.explorerEarned += reward;
  startExplorerTrip(expansion);
  saveState();
  toast(`🧭 탐험 귀환 · ${reward}골드 획득! 다시 3분 탐색 출발`);
}

function updateExplorer(dt) {
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (!expansion.upgraded || !expansion.explorerAlive || !expansion.explorerActive) return;
  expansion.explorerElapsed += dt;
  explorerSaveCarry += dt;
  if (expansion.explorerElapsed >= EXPLORER_SECONDS) {
    expansion.explorerElapsed = EXPLORER_SECONDS;
    resolveExplorerTrip(expansion);
    explorerSaveCarry = 0;
  } else if (explorerSaveCarry >= 10) {
    explorerSaveCarry = 0;
    saveState();
  }
}

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

function activeFieldTarget() {
  if (!currentGame || currentGame.raidActive) return null;
  if (externalBoarId != null) {
    const boar = currentGame.boars?.find(item => item.id === externalBoarId && item.alive && item.hp > 0);
    if (boar) return { type: 'boar', target: boar, external: true };
    externalBoarId = null;
  }
  const selectedBoar = currentGame.boars?.find(item => item.id === currentGame.selectedBoarId && item.alive && item.hp > 0);
  if (selectedBoar) return { type: 'boar', target: selectedBoar, external: false };
  const wolf = currentGame.wolves?.find(item => item.id === currentGame.selectedWolfId && item.alive && item.hp > 0);
  if (wolf) return { type: 'wolf', target: wolf, external: false };
  return null;
}

function updateCavalryFieldCombat(dt) {
  if (!currentGame || currentGame.raidActive) return;
  const cavalry = livingCavalry();
  if (!cavalry.length) return;
  const field = activeFieldTarget();
  if (!field) return;
  const target = field.target;
  for (const unit of cavalry) {
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
    unit.cool = Math.max(0, Number(unit.cool) || 0) - dt;
    const d = Math.hypot(target.x - unit.x, target.y - unit.y) || 1;
    if (d > unit.range) moveToward(unit, target.x, target.y, dt);
    else if (unit.cool <= 0) {
      target.hp -= unit.attack;
      unit.cool = .85;
    }
  }

  // 기존 늑대/멧돼지 전투 로직은 병사·궁수·기사 중 하나라도 있으면 그 병력을 공격한다.
  // 기마병만 출동한 경우에만 여기서 반격을 담당해 중복 공격을 막는다.
  if (!standardFieldTroops().length && target.hp > 0) {
    target.cool = Math.max(0, Number(target.cool) || 0) - dt;
    const victim = nearest(target, cavalry);
    if (victim) {
      const d = Math.hypot(victim.x - target.x, victim.y - target.y) || 1;
      if (d > 52) moveToward(target, victim.x, victim.y, dt);
      else if (target.cool <= 0) {
        victim.hp -= Number(target.attack) || (field.type === 'boar' ? 20 : 10);
        target.cool = .9;
      }
    }
  }

  if (target.hp <= 0 && field.external && field.type === 'boar') {
    target.hp = 0;
    target.alive = false;
    target.respawnAt = Date.now() + 60000;
    externalBoarId = null;
    toast('🐗 기마병이 멧돼지를 처치했어!');
  }

  const before = currentGame.allies.length;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp <= 0) currentGame.allies.splice(i, 1);
  }
  if (currentGame.allies.length !== before) {
    const expansion = ensureTownHallExpansion(currentGame.state);
    expansion.cavalryCount = livingCavalry().length;
    currentGame.state.army = currentGame.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
    saveState();
  }
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function cavalryOnlyBoarCommand(sx, sy) {
  if (!currentGame?.state?.southernJungle?.unlocked || !livingCavalry().length || standardFieldTroops().length) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;
  let best = null, bestDistance = BOAR_HIT_RADIUS;
  for (const boar of currentGame.boars || []) {
    if (!boar?.alive || boar.hp <= 0) continue;
    const d = Math.hypot(point.x - boar.x, point.y - boar.y);
    if (d < bestDistance) { best = boar; bestDistance = d; }
  }
  if (!best) return false;
  externalBoarId = best.id;
  currentGame.jungleCombatActive = true;
  toast(`🐗 멧돼지 지정 · 기마병 ${livingCavalry().length}명 출동`);
  return true;
}

document.addEventListener('dblclick', event => {
  if (performance.now() - lastHandledAt < 260) return;
  if (!cavalryOnlyBoarCommand(event.clientX, event.clientY)) return;
  lastHandledAt = performance.now();
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

document.addEventListener('pointerup', event => {
  const now = performance.now();
  const isDouble = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!isDouble || now - lastHandledAt < 260 || !cavalryOnlyBoarCommand(event.clientX, event.clientY)) return;
  lastHandledAt = now;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function patchBarracks(body) {
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (!expansion.upgraded || !currentGame.state.barracksBuilt) return;
  const count = livingCavalry().length;
  let button = body.querySelector('[data-allied-cavalry]');
  if (!button) {
    button = document.createElement('button');
    button.className = 'choice';
    button.dataset.alliedCavalry = '1';
    (body.querySelector('.choice-grid') || body).appendChild(button);
    button.addEventListener('click', recruitCavalry);
  }
  const next = `<span>🏇 기마병 모집 (${count}/${CAVALRY_MAX})</span><b>식량 ${CAVALRY_COST}</b>`;
  if (button.innerHTML !== next) button.innerHTML = next;
  const disabled = count >= CAVALRY_MAX;
  if (button.disabled !== disabled) button.disabled = disabled;

  let note = body.querySelector('[data-allied-cavalry-note]');
  if (!note) {
    note = document.createElement('p'); note.className = 'panel-note'; note.dataset.alliedCavalryNote = '1'; body.appendChild(note);
  }
  note.textContent = '마을회관 Lv.2 병종 · 체력320 · 공격25 · 병사 이동속도의 2배 · 늑대/멧돼지 전투 가능';
}

function patchWorkerShop(body) {
  const expansion = ensureTownHallExpansion(currentGame.state);
  if (!expansion.upgraded) return;
  let button = body.querySelector('[data-explorer-worker]');
  if (!button) {
    button = document.createElement('button');
    button.className = 'choice';
    button.dataset.explorerWorker = '1';
    body.appendChild(button);
    button.addEventListener('click', buyExplorer);
  }
  if (!expansion.explorerAlive) {
    button.innerHTML = `<span>🧭 탐험 노비 구매 (0/1)</span><b>${EXPLORER_COST}골드</b>`;
    button.disabled = false;
  } else {
    const remain = Math.max(0, Math.ceil(EXPLORER_SECONDS - expansion.explorerElapsed));
    button.innerHTML = `<span>🧭 탐험 노비 (1/1)</span><b>귀환 ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}</b>`;
    button.disabled = true;
  }
  let note = body.querySelector('[data-explorer-note]');
  if (!note) {
    note = document.createElement('p'); note.className = 'panel-note'; note.dataset.explorerNote = '1'; body.appendChild(note);
  }
  note.textContent = `탐험 전용 추가 노비 · 3분마다 200~500골드 · 출발마다 사망 확률 20% · 누적 ${expansion.explorerEarned}골드`;
}

function patchInventory(body) {
  const expansion = ensureTownHallExpansion(currentGame.state);
  let note = body.querySelector('[data-townhall-reward-status]');
  if (!note) {
    note = document.createElement('p'); note.className = 'panel-note'; note.dataset.townhallRewardStatus = '1'; body.appendChild(note);
  }
  note.textContent = expansion.upgraded
    ? `마을회관 Lv.2 · 기마병 ${livingCavalry().length}/${CAVALRY_MAX} · 탐험 노비 ${expansion.explorerAlive ? '1/1' : '0/1'}`
    : '마을회관 Lv.1 · Lv.2 업그레이드 시 기마병과 탐험 노비 해금';
}

function patchPanels() {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const body = document.querySelector('#panelBody');
  const title = document.querySelector('#panelTitle')?.textContent || '';
  if (!panel?.open || !body) return;
  if (title === '병영') patchBarracks(body);
  else if (title === '노비 판매소') patchWorkerShop(body);
  else if (title === '가방') patchInventory(body);
}

function townHallTick() {
  const now = performance.now();
  const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!document.hidden && !activeRuntime?.paused) {
    updateExplorer(dt);
    updateCavalryFieldCombat(dt);
  }
  updateUpgradeButton();
  patchPanels();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithTownHallRewards(game) {
  currentGame = game;
  ensureTownHallExpansion(game.state);
  restoreCavalry();
  originalDraw.call(this, game);
  updateUpgradeButton();
  patchPanels();
};

rendererProto.drawObjects = function drawTownHallRewardStatus(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const expansion = ensureTownHallExpansion(game.state);
  if (!game.state.villageDevelopment?.townHallBuilt) return;
  ctx.save();
  ctx.textAlign = 'center';
  if (expansion.upgraded) {
    ctx.fillStyle = '#d6b77f';
    ctx.fillRect(TOWN_HALL.x - 78, TOWN_HALL.y + 43, 156, 24);
    ctx.fillStyle = '#315748';
    ctx.font = '900 12px system-ui';
    ctx.fillText('마을회관 · Lv.2', TOWN_HALL.x, TOWN_HALL.y + 60);
    ctx.font = '18px system-ui';
    ctx.fillText('🏇 🧭', TOWN_HALL.x, TOWN_HALL.y - 98);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(TOWN_HALL.x - 86, TOWN_HALL.y + 43, 172, 24);
    ctx.fillStyle = '#315748';
    ctx.font = '800 11px system-ui';
    ctx.fillText('근처에서 Lv.2 업그레이드', TOWN_HALL.x, TOWN_HALL.y + 60);
  }
  ctx.restore();
};

setupUpgradeButton();
setInterval(townHallTick, 100);
