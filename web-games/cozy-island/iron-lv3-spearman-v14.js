import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const IRON_MINE = { x: 2610, y: 1680, radius: 120, wood: 5, stone: 5, capacity: 25 };
const TOWN_HALL = { x: 1010, y: 1090, radius: 155 };
const FORGE = { x: -980, y: 1080, radius: 120, wood: 3, stone: 5, iron: 3 };
const BALLISTA = { x: -700, y: 1080, radius: 120, wood: 5, stone: 5, iron: 5, damage: 70, interval: 3, range: 900 };
const SPEAR_CAMP = { x: -410, y: 1080, radius: 120, wood: 5, stone: 3, iron: 3 };
const ARMORY = { x: -120, y: 1080, radius: 120, wood: 4, stone: 4, iron: 2 };
const LV3_COST = { wood: 5, stone: 10, iron: 5, coins: 350 };
const SPEARMAN = { max: 3, food: 40, hp: 200, attack: 30, speed: 72, range: 68 };
const SPEAR_UPGRADE_COSTS = [100, 200, 400];
const CAVALRY_COST = 50;
const CAVALRY_MAX = 2;

let currentGame = null;
let activeRuntime = null;
let initializedSpearmen = false;
let nextUnitId = 1400000;
let lastTick = performance.now();
let ballistaTimer = 0;
let ballistaShot = null;
const spearCoolSeen = new Map();
const bleeds = [];

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  state.inventory ||= {};
  state.inventory.iron = Math.max(0, Math.floor(Number(state.inventory.iron) || 0));
  const old = state.villageExpansionV14 && typeof state.villageExpansionV14 === 'object' ? state.villageExpansionV14 : {};
  state.villageExpansionV14 = old;
  old.townHallLv3 = Boolean(old.townHallLv3);
  old.ironMineBuilt = Boolean(old.ironMineBuilt);
  old.ironMineRemaining = Math.max(0, Math.min(IRON_MINE.capacity, Math.floor(Number(old.ironMineRemaining) || (old.ironMineBuilt ? IRON_MINE.capacity : 0))));
  old.ironMineLastAt = Math.max(0, Number(old.ironMineLastAt) || Date.now());
  old.ironMineRebuilds = Math.max(0, Math.floor(Number(old.ironMineRebuilds) || 0));
  old.forgeBuilt = Boolean(old.forgeBuilt);
  old.ballistaBuilt = Boolean(old.ballistaBuilt);
  old.spearCampBuilt = Boolean(old.spearCampBuilt);
  old.armoryBuilt = Boolean(old.armoryBuilt);
  old.spearmanCount = Math.max(0, Math.min(SPEARMAN.max, Math.floor(Number(old.spearmanCount) || 0)));
  old.spearmanUpgrade = Math.max(0, Math.min(3, Math.floor(Number(old.spearmanUpgrade) || 0)));
  return old;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithIronLv3(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithIronLv3(state, delay) {
  activeRuntime = this;
  const v14 = ensureState(state);
  if (currentGame?.state === state && initializedSpearmen) v14.spearmanCount = livingSpearmen().length;
  return originalQueueSaveProgress.call(this, state, delay);
};

function saveImmediate() {
  if (!currentGame?.state || !activeRuntime) return;
  const v14 = ensureState(currentGame.state);
  if (initializedSpearmen) v14.spearmanCount = livingSpearmen().length;
  currentGame.state.army = (currentGame.allies || []).filter(u => u?.hp > 0).map(u => ({ kind: u.kind }));
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

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function jungleUnlocked() { return Boolean(currentGame?.state?.southernJungle?.unlocked); }
function lv2() { return Boolean(currentGame?.state?.townHallExpansion?.upgraded); }
function hallBuilt() { return Boolean(currentGame?.state?.villageDevelopment?.townHallBuilt); }
function v14() { return currentGame ? ensureState(currentGame.state) : null; }
function lv3() { return Boolean(v14()?.townHallLv3); }

function canPay(cost) {
  const inv = currentGame?.state?.inventory || {};
  return (Number(inv.wood) || 0) >= (cost.wood || 0)
    && (Number(inv.stone) || 0) >= (cost.stone || 0)
    && (Number(inv.iron) || 0) >= (cost.iron || 0)
    && (Number(currentGame?.state?.coins) || 0) >= (cost.coins || 0);
}

function spend(cost) {
  const inv = currentGame.state.inventory;
  inv.wood = (Number(inv.wood) || 0) - (cost.wood || 0);
  inv.stone = (Number(inv.stone) || 0) - (cost.stone || 0);
  inv.iron = (Number(inv.iron) || 0) - (cost.iron || 0);
  currentGame.state.coins = (Number(currentGame.state.coins) || 0) - (cost.coins || 0);
}

function scaledMineCost() {
  const n = v14()?.ironMineRebuilds || 0;
  const scale = Math.pow(1.5, n);
  return { wood: Math.ceil(IRON_MINE.wood * scale), stone: Math.ceil(IRON_MINE.stone * scale) };
}

function buildIronMine() {
  if (!jungleUnlocked()) return toast('🌴 남쪽 정글을 먼저 해금해야 해');
  const state = v14();
  if (state.ironMineBuilt) return;
  const cost = scaledMineCost();
  if (!canPay(cost)) return toast(`⛏️ 철 채굴장 재료 부족 · 나무${cost.wood} 돌${cost.stone}`);
  spend(cost);
  state.ironMineBuilt = true;
  state.ironMineRemaining = IRON_MINE.capacity;
  state.ironMineLastAt = Date.now();
  saveImmediate();
  toast(`⛏️ 철 채굴장 완성 · 철 ${IRON_MINE.capacity}개 생산 가능`);
}

function upgradeHallLv3() {
  if (!hallBuilt() || !lv2()) return toast('🏛️ 마을회관 Lv.2가 먼저 필요해');
  const state = v14();
  if (state.townHallLv3) return;
  if (!canPay(LV3_COST)) return toast('🏛️ Lv.3 비용 · 나무5 돌10 철5 350골드');
  spend(LV3_COST);
  state.townHallLv3 = true;
  saveImmediate();
  toast('🏛️ 마을회관 Lv.3! 마을이 2배로 확장되고 새 건축물이 해금됐어');
}

function buildLv3Structure(kind) {
  if (!lv3()) return toast('🏛️ 마을회관 Lv.3가 필요해');
  const state = v14();
  const map = {
    forge: [FORGE, 'forgeBuilt', '⚒️ 철 대장간'],
    ballista: [BALLISTA, 'ballistaBuilt', '🏹 대형 쇠뇌탑'],
    spearCamp: [SPEAR_CAMP, 'spearCampBuilt', '🔱 창병 훈련소'],
    armory: [ARMORY, 'armoryBuilt', '🛡️ 무기고']
  };
  const row = map[kind];
  if (!row) return;
  const [cost, key, label] = row;
  if (state[key]) return;
  if (!canPay(cost)) return toast(`${label} 재료 부족 · 나무${cost.wood} 돌${cost.stone} 철${cost.iron}`);
  spend(cost);
  state[key] = true;
  saveImmediate();
  if (kind === 'forge') toast('⚒️ 철 대장간 완성 · 철 생산속도 30초 → 20초');
  else if (kind === 'ballista') toast('🏹 대형 쇠뇌탑 완성 · 습격 적을 자동 공격해');
  else if (kind === 'spearCamp') toast('🔱 창병 훈련소 완성 · 창병 모집 가능');
  else toast('🛡️ 무기고 완성 · 병력 강화 확인 가능');
}

function ironProduction() {
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  const state = v14();
  if (!state.ironMineBuilt || state.ironMineRemaining <= 0) return;
  const interval = state.forgeBuilt ? 20000 : 30000;
  const now = Date.now();
  const elapsed = Math.max(0, now - state.ironMineLastAt);
  const cycles = Math.min(state.ironMineRemaining, Math.floor(elapsed / interval));
  if (cycles <= 0) return;
  currentGame.state.inventory.iron = (Number(currentGame.state.inventory.iron) || 0) + cycles;
  state.ironMineRemaining -= cycles;
  state.ironMineLastAt += cycles * interval;
  if (state.ironMineRemaining <= 0) {
    state.ironMineRemaining = 0;
    state.ironMineBuilt = false;
    state.ironMineRebuilds += 1;
    toast(`⛏️ 철 채굴장이 수명을 다했어 · 철 +${cycles}`);
  } else {
    toast(`⛏️ 철 채굴 · 철 +${cycles}`);
  }
  saveImmediate();
}

function spearMultiplier() { return Math.pow(1.5, v14()?.spearmanUpgrade || 0); }
function livingSpearmen() { return (currentGame?.allies || []).filter(u => u && !u.enemy && u.kind === 'spearman' && u.hp > 0); }

function makeSpearman() {
  const barracks = currentGame?.barracks || { x: 1080, y: 650 };
  return {
    id: nextUnitId++, kind: 'spearman', enemy: false, boss: false,
    hp: SPEARMAN.hp, maxHp: SPEARMAN.hp,
    attack: Math.round(SPEARMAN.attack * spearMultiplier() * 100) / 100,
    range: SPEARMAN.range, speed: SPEARMAN.speed,
    cool: Math.random() * .25, wander: 0, vx: 0, vy: 0,
    x: barracks.x + (Math.random() - .5) * 72,
    y: barracks.y + 64 + Math.random() * 58,
    __v14SpearLevel: v14()?.spearmanUpgrade || 0
  };
}

function restoreSpearmen() {
  if (initializedSpearmen || !currentGame) return;
  initializedSpearmen = true;
  const wanted = v14().spearmanCount;
  const existing = livingSpearmen().length;
  for (let i = existing; i < wanted; i++) currentGame.allies.push(makeSpearman());
  v14().spearmanCount = livingSpearmen().length;
}

function syncSpearmanAttack() {
  if (!currentGame) return;
  const level = v14().spearmanUpgrade;
  const desired = Math.round(SPEARMAN.attack * Math.pow(1.5, level) * 100) / 100;
  for (const unit of livingSpearmen()) {
    unit.attack = desired;
    unit.__v14SpearLevel = level;
  }
}

function recruitSpearman() {
  if (!lv3() || !v14().spearCampBuilt) return toast('🔱 창병 훈련소가 필요해');
  const count = livingSpearmen().length;
  if (count >= SPEARMAN.max) return toast('🔱 창병은 최대 3명이야');
  const food = Number(currentGame.state.inventory?.food) || 0;
  if (food < SPEARMAN.food) return toast(`🍖 창병 모집에는 식량 ${SPEARMAN.food} 필요`);
  currentGame.state.inventory.food = food - SPEARMAN.food;
  currentGame.allies.push(makeSpearman());
  v14().spearmanCount = livingSpearmen().length;
  saveImmediate();
  openSpearmanPanel();
  toast(`🔱 창병 합류 · 체력200 · 공격${Math.round(SPEARMAN.attack * spearMultiplier() * 100) / 100}`);
}

function upgradeSpearman() {
  const state = v14();
  const level = state.spearmanUpgrade;
  if (level >= 3) return toast('🔱 창병은 최대 3강이야');
  const cost = SPEAR_UPGRADE_COSTS[level];
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < cost) return toast(`🔱 창병 ${level + 1}강에는 ${cost}골드 필요`);
  currentGame.state.coins = coins - cost;
  state.spearmanUpgrade += 1;
  syncSpearmanAttack();
  saveImmediate();
  patchLevelPanel(true);
  toast(`🔱 창병 ${state.spearmanUpgrade}강 완료 · 공격력 ×1.5`);
}

function openSpearmanPanel() {
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!panel || !title || !body) return;
  if (panel.open) panel.close();
  title.textContent = '창병 훈련소';
  const count = livingSpearmen().length;
  body.innerHTML = `<div class="inventory-grid">
    <div class="item-card">🔱 창병<span>${count}/${SPEARMAN.max}</span></div>
    <div class="item-card">🍖 식량<span>${Math.floor(Number(currentGame.state.inventory?.food)||0)}</span></div>
  </div>
  <p class="panel-note">체력 200 · 공격력 ${Math.round(SPEARMAN.attack * spearMultiplier() * 100) / 100} · 공격 시 40% 확률 출혈(10 데미지 × 4초)</p>
  <button class="choice" data-v14-recruit-spear ${count >= SPEARMAN.max ? 'disabled' : ''}><span>🔱 창병 모집</span><b>식량 40</b></button>`;
  if (!panel.open) panel.showModal();
}

function openArmory() {
  const levelButton = document.querySelector('#levelUpButtonV13');
  if (levelButton) levelButton.click();
  else toast('🛡️ 무기고 · 병력 강화 화면을 불러오는 중');
}

function makeCavalry() {
  const barracks = currentGame?.barracks || { x: 1080, y: 650 };
  return {
    id: nextUnitId++, kind: 'cavalry', enemy: false, boss: false,
    hp: 320, maxHp: 320, attack: 25, range: 55, speed: 152,
    cool: Math.random() * .3, wander: 0, vx: 0, vy: 0,
    x: barracks.x + (Math.random() - .5) * 76,
    y: barracks.y + 64 + Math.random() * 60
  };
}

function recruitCavalry50() {
  if (!currentGame?.state?.townHallExpansion?.upgraded) return;
  const cavalry = (currentGame.allies || []).filter(u => u?.kind === 'cavalry' && !u.enemy && u.hp > 0);
  if (cavalry.length >= CAVALRY_MAX) return toast('🏇 기마병은 최대 2명이야');
  const food = Number(currentGame.state.inventory?.food) || 0;
  if (food < CAVALRY_COST) return toast('🍖 기마병 모집에는 식량 50 필요');
  currentGame.state.inventory.food = food - CAVALRY_COST;
  currentGame.allies.push(makeCavalry());
  currentGame.state.townHallExpansion.cavalryCount = cavalry.length + 1;
  saveImmediate();
  document.querySelector('#panel')?.close();
  toast(`🏇 기마병 합류 · 식량 ${CAVALRY_COST}`);
}

function nearestLiving(from, arr) {
  let best = null, bestD = Infinity;
  for (const unit of arr || []) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(unit.x - from.x, unit.y - from.y);
    if (d < bestD) { best = unit; bestD = d; }
  }
  return { unit: best, distance: bestD };
}

function applyBleed(target) {
  if (!target || target.hp <= 0) return;
  const existing = bleeds.find(b => b.target === target);
  if (existing) {
    existing.ticks = 4;
    existing.nextAt = performance.now() + 1000;
  } else {
    bleeds.push({ target, ticks: 4, nextAt: performance.now() + 1000 });
  }
  target.__v14BleedingUntil = performance.now() + 4200;
}

function detectSpearHits() {
  if (!currentGame?.raidActive) {
    for (const spear of livingSpearmen()) spearCoolSeen.set(spear.id, Number(spear.cool) || 0);
    return;
  }
  for (const spear of livingSpearmen()) {
    const nowCool = Number(spear.cool) || 0;
    const before = spearCoolSeen.get(spear.id);
    spearCoolSeen.set(spear.id, nowCool);
    if (before == null || nowCool <= before + .3) continue;
    const found = nearestLiving(spear, currentGame.enemies);
    if (!found.unit || found.distance > SPEARMAN.range + 12) continue;
    if (Math.random() < .40) applyBleed(found.unit);
  }
}

function updateBleeds() {
  const now = performance.now();
  for (let i = bleeds.length - 1; i >= 0; i--) {
    const bleed = bleeds[i];
    if (!bleed.target || bleed.target.hp <= 0) { bleeds.splice(i, 1); continue; }
    while (bleed.ticks > 0 && now >= bleed.nextAt) {
      bleed.target.hp -= 10;
      bleed.ticks -= 1;
      bleed.nextAt += 1000;
    }
    if (bleed.ticks <= 0 || bleed.target.hp <= 0) {
      bleed.target.__v14BleedingUntil = 0;
      bleeds.splice(i, 1);
    }
  }
}

function updateBallista(dt) {
  if (!currentGame?.raidActive || !v14()?.ballistaBuilt) { ballistaTimer = 0; return; }
  ballistaTimer += dt;
  if (ballistaTimer < BALLISTA.interval) return;
  ballistaTimer %= BALLISTA.interval;
  let target = null, best = BALLISTA.range;
  for (const enemy of currentGame.enemies || []) {
    if (!enemy || enemy.hp <= 0) continue;
    const d = Math.hypot(enemy.x - BALLISTA.x, enemy.y - BALLISTA.y);
    if (d < best) { target = enemy; best = d; }
  }
  if (!target) return;
  target.hp -= BALLISTA.damage;
  ballistaShot = { x1: BALLISTA.x, y1: BALLISTA.y - 55, x2: target.x, y2: target.y, until: performance.now() + 190 };
}

function patchInventory() {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '가방') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  const grid = body.querySelector('.inventory-grid');
  if (grid && !grid.querySelector('[data-v14-iron-card]')) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.v14IronCard = '1';
    grid.appendChild(card);
  }
  const card = grid?.querySelector('[data-v14-iron-card]');
  if (card) card.innerHTML = `⛓️ 철<span>${Math.floor(Number(currentGame.state.inventory.iron)||0)}개</span>`;
  let note = body.querySelector('[data-v14-status]');
  if (!note) {
    note = document.createElement('p'); note.className = 'panel-note'; note.dataset.v14Status = '1'; body.appendChild(note);
  }
  const state = v14();
  note.textContent = `마을회관 ${state.townHallLv3 ? 'Lv.3' : (lv2() ? 'Lv.2' : 'Lv.1')} · 철 채굴장 ${state.ironMineBuilt ? `생산중(${state.ironMineRemaining}/25)` : '미가동'} · 창병 ${livingSpearmen().length}/3`;
}

function patchLevelPanel(force = false) {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '병력 레벨업') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  let button = body.querySelector('[data-v14-spear-upgrade]');
  const level = v14().spearmanUpgrade;
  if (!button) {
    const grid = body.querySelector('.choice-grid');
    if (!grid) return;
    button = document.createElement('button');
    button.className = 'choice';
    button.dataset.v14SpearUpgrade = '1';
    grid.appendChild(button);
  }
  const factor = Math.pow(1.5, level).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  const maxed = level >= 3;
  button.disabled = maxed;
  button.innerHTML = `<span>🔱 창병 ${level}/3<small style="display:block">현재 공격력 ×${factor}</small></span><b>${maxed ? '최대 강화' : `${SPEAR_UPGRADE_COSTS[level]}골드`}</b>`;
}

function patchCavalryButton() {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '병영') return;
  const button = document.querySelector('#panelBody [data-allied-cavalry]');
  if (!button) return;
  const count = (currentGame.allies || []).filter(u => u?.kind === 'cavalry' && !u.enemy && u.hp > 0).length;
  button.innerHTML = `<span>🏇 기마병 모집 (${count}/${CAVALRY_MAX})</span><b>식량 ${CAVALRY_COST}</b>`;
}

function contextAction() {
  if (!currentGame) return null;
  const p = currentGame.player;
  const state = v14();
  if (jungleUnlocked() && distance(p, IRON_MINE) <= IRON_MINE.radius && !state.ironMineBuilt) return { key: 'mine', label: `⛏️ 철 채굴장 건설 · 나무${scaledMineCost().wood} 돌${scaledMineCost().stone}` };
  if (hallBuilt() && lv2() && !state.townHallLv3 && distance(p, TOWN_HALL) <= TOWN_HALL.radius) return { key: 'lv3', label: '🏛️ 마을회관 Lv.3 · 나무5 돌10 철5 350골드' };
  if (state.townHallLv3) {
    if (!state.forgeBuilt && distance(p, FORGE) <= FORGE.radius) return { key: 'forge', label: '⚒️ 철 대장간 · 나무3 돌5 철3' };
    if (!state.ballistaBuilt && distance(p, BALLISTA) <= BALLISTA.radius) return { key: 'ballista', label: '🏹 대형 쇠뇌탑 · 나무5 돌5 철5' };
    if (!state.spearCampBuilt && distance(p, SPEAR_CAMP) <= SPEAR_CAMP.radius) return { key: 'spearCamp', label: '🔱 창병 훈련소 · 나무5 돌3 철3' };
    if (state.spearCampBuilt && distance(p, SPEAR_CAMP) <= SPEAR_CAMP.radius) return { key: 'spearPanel', label: '🔱 창병 훈련소 열기' };
    if (!state.armoryBuilt && distance(p, ARMORY) <= ARMORY.radius) return { key: 'armory', label: '🛡️ 무기고 · 나무4 돌4 철2' };
    if (state.armoryBuilt && distance(p, ARMORY) <= ARMORY.radius) return { key: 'armoryPanel', label: '🛡️ 무기고 · 병력 강화' };
  }
  return null;
}

function executeAction(key) {
  if (key === 'mine') buildIronMine();
  else if (key === 'lv3') upgradeHallLv3();
  else if (['forge', 'ballista', 'spearCamp', 'armory'].includes(key)) buildLv3Structure(key);
  else if (key === 'spearPanel') openSpearmanPanel();
  else if (key === 'armoryPanel') openArmory();
}

function setupContextButton() {
  if (document.querySelector('#v14ContextButton')) return;
  const button = document.createElement('button');
  button.id = 'v14ContextButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:18;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.97);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    const action = contextAction();
    if (!action) return;
    event.preventDefault(); event.stopImmediatePropagation(); executeAction(action.key);
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateContextButton() {
  const button = document.querySelector('#v14ContextButton');
  if (!button) return;
  const action = contextAction();
  button.style.display = action ? 'block' : 'none';
  if (action) button.textContent = action.label;
}

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  const action = contextAction();
  if (!action) return;
  event.preventDefault(); event.stopImmediatePropagation(); executeAction(action.key);
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  const action = contextAction();
  if (!action) return;
  event.preventDefault(); event.stopImmediatePropagation(); executeAction(action.key);
}, true);

document.addEventListener('click', event => {
  const cavalry = event.target?.closest?.('[data-allied-cavalry]');
  if (cavalry && !cavalry.disabled && currentGame) {
    event.preventDefault(); event.stopImmediatePropagation(); recruitCavalry50(); return;
  }
  const spear = event.target?.closest?.('[data-v14-recruit-spear]');
  if (spear && !spear.disabled) {
    event.preventDefault(); event.stopImmediatePropagation(); recruitSpearman(); return;
  }
  const upgrade = event.target?.closest?.('[data-v14-spear-upgrade]');
  if (upgrade && !upgrade.disabled) {
    event.preventDefault(); event.stopImmediatePropagation(); upgradeSpearman();
  }
}, true);

function drawExpandedVillage(ctx, game) {
  if (!ensureState(game.state).townHallLv3) return;
  ctx.save();
  ctx.fillStyle = '#82cadd';
  ctx.fillRect(-1210, 920, 1330, 330);
  ctx.fillStyle = '#f2dfa8';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-1170, 985, 1290, 205, 70); ctx.fill(); }
  else ctx.fillRect(-1170, 985, 1290, 205);
  ctx.fillStyle = '#9fd18f';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-1120, 1015, 1240, 145, 52); ctx.fill(); }
  else ctx.fillRect(-1120, 1015, 1240, 145);
  ctx.fillStyle = '#315748';
  ctx.textAlign = 'center';
  ctx.font = '900 15px system-ui';
  ctx.fillText('마을회관 Lv.3 확장 구역', -500, 1008);
  ctx.restore();
}

function drawSite(ctx, point, built, icon, label) {
  ctx.save(); ctx.textAlign = 'center';
  if (!built) {
    ctx.setLineDash([7, 6]); ctx.strokeStyle = '#687267'; ctx.lineWidth = 3;
    ctx.strokeRect(point.x - 52, point.y - 42, 104, 78); ctx.setLineDash([]);
    ctx.font = '27px system-ui'; ctx.fillText('🏗️', point.x, point.y + 5);
    ctx.fillStyle = '#315748'; ctx.font = '700 10px system-ui'; ctx.fillText(label, point.x, point.y + 54);
  } else {
    ctx.font = '36px system-ui'; ctx.fillText(icon, point.x, point.y + 10);
    ctx.fillStyle = '#315748'; ctx.font = '800 10px system-ui'; ctx.fillText(label, point.x, point.y + 40);
  }
  ctx.restore();
}

function drawIronMine(ctx, game) {
  if (!game.state.southernJungle?.unlocked) return;
  const state = ensureState(game.state);
  ctx.save(); ctx.textAlign = 'center';
  if (!state.ironMineBuilt) {
    ctx.setLineDash([8, 6]); ctx.strokeStyle = '#bdc5c8'; ctx.lineWidth = 3;
    ctx.strokeRect(IRON_MINE.x - 64, IRON_MINE.y - 46, 128, 92); ctx.setLineDash([]);
    ctx.font = '34px system-ui'; ctx.fillText('⛓️', IRON_MINE.x, IRON_MINE.y + 7);
    ctx.fillStyle = '#ecf0ef'; ctx.font = '800 11px system-ui'; ctx.fillText('철 광맥 · 채굴장 건설', IRON_MINE.x, IRON_MINE.y + 60);
  } else {
    ctx.fillStyle = '#555f63'; ctx.fillRect(IRON_MINE.x - 55, IRON_MINE.y - 34, 110, 70);
    ctx.font = '34px system-ui'; ctx.fillText('⛏️', IRON_MINE.x, IRON_MINE.y + 8);
    ctx.fillStyle = '#ecf0ef'; ctx.font = '800 10px system-ui'; ctx.fillText(`철 채굴장 · ${state.ironMineRemaining}/25`, IRON_MINE.x, IRON_MINE.y + 54);
  }
  ctx.restore();
}

function drawLv3Buildings(ctx, game) {
  const state = ensureState(game.state);
  if (!state.townHallLv3) return;
  drawSite(ctx, FORGE, state.forgeBuilt, '⚒️', '철 대장간');
  drawSite(ctx, BALLISTA, state.ballistaBuilt, '🏹', '대형 쇠뇌탑');
  drawSite(ctx, SPEAR_CAMP, state.spearCampBuilt, '🔱', '창병 훈련소');
  drawSite(ctx, ARMORY, state.armoryBuilt, '🛡️', '무기고');
  if (ballistaShot && ballistaShot.until > performance.now()) {
    ctx.save(); ctx.strokeStyle = '#8d5f35'; ctx.lineWidth = 5; ctx.beginPath();
    ctx.moveTo(ballistaShot.x1, ballistaShot.y1); ctx.lineTo(ballistaShot.x2, ballistaShot.y2); ctx.stroke(); ctx.restore();
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;
const originalDrawUnit = rendererProto.drawUnit;

rendererProto.draw = function drawWithIronLv3(game) {
  currentGame = game;
  ensureState(game.state);
  restoreSpearmen();
  syncSpearmanAttack();
  const now = performance.now();
  const dt = Math.min(.15, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  const result = originalDraw.call(this, game);
  if (!document.hidden && !activeRuntime?.paused) {
    ironProduction();
    detectSpearHits();
    updateBleeds();
    updateBallista(dt);
  }
  patchInventory();
  patchLevelPanel();
  patchCavalryButton();
  updateContextButton();
  return result;
};

rendererProto.drawIsland = function drawIslandWithLv3Village(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  drawExpandedVillage(ctx, game);
};

rendererProto.drawObjects = function drawObjectsWithLv3(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  drawIronMine(ctx, game);
  drawLv3Buildings(ctx, game);
};

rendererProto.drawUnit = function drawSpearmanAndBleed(ctx, unit) {
  if (unit?.kind !== 'spearman') {
    originalDrawUnit.call(this, ctx, unit);
    if (unit?.__v14BleedingUntil > performance.now() && unit.hp > 0) {
      ctx.save(); ctx.textAlign = 'center'; ctx.font = '16px system-ui'; ctx.fillText('🩸', unit.x + 18, unit.y - 20); ctx.restore();
    }
    return;
  }
  if (unit.hp <= 0) return;
  ctx.save(); ctx.textAlign = 'center'; ctx.font = '32px system-ui'; ctx.fillText('🔱', unit.x, unit.y + 10);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(unit.x - 24, unit.y - 31, 48, 6);
  ctx.fillStyle = '#4f9a5d'; ctx.fillRect(unit.x - 24, unit.y - 31, 48 * Math.max(0, unit.hp / unit.maxHp), 6);
  ctx.fillStyle = '#244d2d'; ctx.font = '800 10px system-ui'; ctx.fillText('창병', unit.x, unit.y + 33); ctx.restore();
};

setupContextButton();
setInterval(() => {
  if (!currentGame) return;
  patchInventory(); patchLevelPanel(); patchCavalryButton(); updateContextButton();
}, 120);
