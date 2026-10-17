import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const VOLCANO = { x1: 2760, x2: 4320, y1: -820, y2: 220 };
const TOWN_HALL = { x: 1010, y: 1090, radius: 150 };
const BLACK_MINE = { x: -880, y: 690, radius: 120, wood: 5, stone: 3, blackIron: 3 };
const FLAME_TURRET = { x: -330, y: 560, radius: 120, wood: 5, stone: 3, blackIron: 1, damage: 45, interval: 2.5, range: 900, splash: 105 };
const LV4_COST = { wood: 5, stone: 7, iron: 5, blackIron: 3 };
const HEAVY = { hp: 500, attack: 35, food: 70, max: 2, speed: 58, range: 60, reduction: .25 };
const HEAVY_UPGRADE_COSTS = [200, 400, 800];
const NODE_RESPAWN_MS = 30000;
const BLACK_MINE_INTERVAL_MS = 20000;
const BLACK_MINE_YIELD = 3;

const BLACK_IRON_NODES = [
  { x: 2940, y: -670 }, { x: 3150, y: -320 }, { x: 3370, y: -710 }, { x: 3550, y: -180 },
  { x: 3740, y: -570 }, { x: 3920, y: -260 }, { x: 4100, y: -690 }, { x: 4210, y: -390 }
];

const REGION_ENEMY_DEFS = [
  { id: 'df-black-soldier', kind: 'blackSoldier', label: '검은 병사', icon: '⚔️', x: 3100, y: -520, hp: 500, attack: 25, interval: 1.0, range: 58, speed: 70 },
  { id: 'df-black-archer', kind: 'blackArcher', label: '검은 궁수', icon: '🏹', x: 3430, y: -690, hp: 360, attack: 35, interval: 1.2, range: 245, speed: 61 },
  { id: 'df-black-heavy', kind: 'blackHeavy', label: '검은 중갑병', icon: '🛡️', x: 3630, y: -350, hp: 1400, attack: 45, interval: 1.4, range: 62, speed: 48 },
  { id: 'df-fire-soldier', kind: 'fireSoldier', label: '화염병', icon: '🔥', x: 3940, y: -640, hp: 700, attack: 0, interval: 2.0, range: 250, speed: 54, fireDamage: 40, splash: 95 },
  { id: 'df-black-general', kind: 'blackGeneral', label: '검은 장군', icon: '👹', x: 4200, y: -390, hp: 2000, attack: 0, interval: 1.35, range: 65, speed: 62, generalDamage: 60 }
];

let currentGame = null;
let activeRuntime = null;
let nextUnitId = 1900000;
let lastTick = performance.now();
let initializedHeavy = false;
let selectedRegionEnemyId = null;
let lastTap = { time: 0, x: 0, y: 0 };
let lastDoubleAt = 0;
let lastRaidCycle = -1;
let turretTimer = 0;
let turretShot = null;
const heavyHpSeen = new Map();
const regionEnemies = REGION_ENEMY_DEFS.map(makeRegionEnemy);

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  state.inventory ||= {};
  state.inventory.blackIron = Math.max(0, Math.floor(Number(state.inventory.blackIron) || 0));
  const root = state.darknessFlameV19 && typeof state.darknessFlameV19 === 'object' ? state.darknessFlameV19 : {};
  state.darknessFlameV19 = root;
  root.townHallLv4 = Boolean(root.townHallLv4);
  root.blackMineBuilt = Boolean(root.blackMineBuilt);
  root.blackMineLastAt = Math.max(0, Number(root.blackMineLastAt) || Date.now());
  root.flameTurretBuilt = Boolean(root.flameTurretBuilt);
  root.heavyCount = Math.max(0, Math.min(HEAVY.max, Math.floor(Number(root.heavyCount) || 0)));
  root.heavyUpgrade = Math.max(0, Math.min(3, Math.floor(Number(root.heavyUpgrade) || 0)));
  root.nodeReadyAt = Array.isArray(root.nodeReadyAt) ? BLACK_IRON_NODES.map((_, i) => Math.max(0, Number(root.nodeReadyAt[i]) || 0)) : BLACK_IRON_NODES.map(() => 0);
  root.regionDefeated = Array.isArray(root.regionDefeated) ? [...new Set(root.regionDefeated.map(String))] : [];
  return root;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithDarknessFlame(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithDarknessFlame(state, delay) {
  activeRuntime = this;
  const root = ensureState(state);
  if (currentGame?.state === state && initializedHeavy) root.heavyCount = livingHeavy().length;
  return originalQueueSaveProgress.call(this, state, delay);
};

function root() { return currentGame ? ensureState(currentGame.state) : null; }
function lv3() { return Boolean(currentGame?.state?.villageExpansionV14?.townHallLv3); }
function northUnlocked() { return Boolean(currentGame?.state?.northernRegion?.unlocked); }
function volcanoUnlocked() { return lv3() && northUnlocked(); }
function lv4() { return Boolean(root()?.townHallLv4); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function save() {
  if (!currentGame?.state) return;
  const state = ensureState(currentGame.state);
  if (initializedHeavy) state.heavyCount = livingHeavy().length;
  currentGame.state.army = (currentGame.allies || []).filter(u => u?.hp > 0).map(u => ({ kind: u.kind }));
  activeRuntime?.queueSaveProgress(currentGame.state, 0);
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function canPay(cost) {
  const inv = currentGame?.state?.inventory || {};
  return (Number(inv.wood) || 0) >= (cost.wood || 0)
    && (Number(inv.stone) || 0) >= (cost.stone || 0)
    && (Number(inv.iron) || 0) >= (cost.iron || 0)
    && (Number(inv.blackIron) || 0) >= (cost.blackIron || 0);
}

function spend(cost) {
  const inv = currentGame.state.inventory;
  inv.wood = (Number(inv.wood) || 0) - (cost.wood || 0);
  inv.stone = (Number(inv.stone) || 0) - (cost.stone || 0);
  inv.iron = (Number(inv.iron) || 0) - (cost.iron || 0);
  inv.blackIron = (Number(inv.blackIron) || 0) - (cost.blackIron || 0);
}

function nearestBlackIronNode() {
  if (!currentGame || !volcanoUnlocked()) return null;
  let best = null;
  let bestDistance = 92;
  BLACK_IRON_NODES.forEach((node, index) => {
    const d = distance(currentGame.player, node);
    if (d < bestDistance) { best = { node, index }; bestDistance = d; }
  });
  return best;
}

function mineBlackIronNode(found) {
  if (!found) return false;
  const state = root();
  const now = Date.now();
  const readyAt = Number(state.nodeReadyAt[found.index]) || 0;
  if (readyAt > now) {
    toast(`⬛ 흑철 광맥 재생 중 · ${Math.max(1, Math.ceil((readyAt - now) / 1000))}초`);
    return true;
  }
  currentGame.state.inventory.blackIron = (Number(currentGame.state.inventory.blackIron) || 0) + 1;
  state.nodeReadyAt[found.index] = now + NODE_RESPAWN_MS;
  save();
  toast('⬛ 흑철 +1');
  return true;
}

function buildBlackMine() {
  if (!lv3()) return toast('🏛️ 마을회관 Lv.3가 필요해');
  const state = root();
  if (state.blackMineBuilt) return;
  if (!canPay(BLACK_MINE)) return toast('⛏️ 흑철 광산 재료 부족 · 나무5 돌3 흑철3');
  spend(BLACK_MINE);
  state.blackMineBuilt = true;
  state.blackMineLastAt = Date.now();
  save();
  toast('⛏️ 흑철 광산 완성 · 20초마다 흑철 3개');
}

function updateBlackMine() {
  const state = root();
  if (!state?.blackMineBuilt) return;
  const now = Date.now();
  const cycles = Math.min(30, Math.floor((now - state.blackMineLastAt) / BLACK_MINE_INTERVAL_MS));
  if (cycles <= 0) return;
  const gain = cycles * BLACK_MINE_YIELD;
  currentGame.state.inventory.blackIron = (Number(currentGame.state.inventory.blackIron) || 0) + gain;
  state.blackMineLastAt += cycles * BLACK_MINE_INTERVAL_MS;
  save();
  toast(`⛏️ 흑철 광산 · 흑철 +${gain}`);
}

function upgradeLv4() {
  if (!lv3()) return toast('🏛️ 마을회관 Lv.3가 먼저 필요해');
  const state = root();
  if (state.townHallLv4) return;
  if (!canPay(LV4_COST)) return toast('🏛️ Lv.4 재료 · 흑철3 철5 돌7 나무5');
  spend(LV4_COST);
  state.townHallLv4 = true;
  save();
  toast('🌑🔥 마을회관 Lv.4! 중갑병과 화염포탑이 해금됐어');
}

function buildFlameTurret() {
  if (!lv4()) return toast('🏛️ 마을회관 Lv.4가 필요해');
  const state = root();
  if (state.flameTurretBuilt) return;
  if (!canPay(FLAME_TURRET)) return toast('🔥 화염포탑 재료 부족 · 흑철1 나무5 돌3');
  spend(FLAME_TURRET);
  state.flameTurretBuilt = true;
  save();
  toast('🔥 화염포탑 완성 · 범위 자동 공격');
}

function heavyMultiplier() { return Math.pow(1.5, root()?.heavyUpgrade || 0); }
function livingHeavy() { return (currentGame?.allies || []).filter(u => u && !u.enemy && u.kind === 'heavy' && u.hp > 0); }

function makeHeavy() {
  const barracks = currentGame?.barracks || { x: 1080, y: 650 };
  const mult = heavyMultiplier();
  return {
    id: nextUnitId++, kind: 'heavy', enemy: false, boss: false,
    hp: HEAVY.hp, maxHp: HEAVY.hp,
    attack: Math.round(HEAVY.attack * mult * 100) / 100,
    range: HEAVY.range, speed: HEAVY.speed,
    cool: Math.random() * .2, wander: 0, vx: 0, vy: 0,
    x: barracks.x + (Math.random() - .5) * 72,
    y: barracks.y + 60 + Math.random() * 55,
    damageReduction: HEAVY.reduction
  };
}

function restoreHeavy() {
  if (initializedHeavy || !currentGame) return;
  initializedHeavy = true;
  const wanted = root().heavyCount;
  const existing = livingHeavy().length;
  for (let i = existing; i < wanted; i++) currentGame.allies.push(makeHeavy());
  root().heavyCount = livingHeavy().length;
}

function syncHeavyAttack() {
  const desired = Math.round(HEAVY.attack * heavyMultiplier() * 100) / 100;
  for (const unit of livingHeavy()) unit.attack = desired;
}

function recruitHeavy() {
  if (!lv4()) return toast('🏛️ 마을회관 Lv.4가 필요해');
  const count = livingHeavy().length;
  if (count >= HEAVY.max) return toast('🛡️ 중갑병은 최대 2명이야');
  const food = Number(currentGame.state.inventory?.food) || 0;
  if (food < HEAVY.food) return toast('🍖 중갑병 모집에는 식량 70 필요');
  currentGame.state.inventory.food = food - HEAVY.food;
  currentGame.allies.push(makeHeavy());
  root().heavyCount = livingHeavy().length;
  save();
  document.querySelector('#panel')?.close();
  toast(`🛡️ 중갑병 합류 · 체력500 · 공격${Math.round(HEAVY.attack * heavyMultiplier() * 100) / 100}`);
}

function upgradeHeavy() {
  const state = root();
  if (!lv4()) return;
  if (state.heavyUpgrade >= 3) return toast('🛡️ 중갑병은 최대 3강이야');
  const cost = HEAVY_UPGRADE_COSTS[state.heavyUpgrade];
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < cost) return toast(`🛡️ 중갑병 강화에는 ${cost}골드 필요`);
  currentGame.state.coins = coins - cost;
  state.heavyUpgrade += 1;
  syncHeavyAttack();
  save();
  patchLevelPanel();
  toast(`🛡️ 중갑병 ${state.heavyUpgrade}강 완료 · 공격력 ×1.5`);
}

function applyHeavyReduction() {
  if (!currentGame) return;
  const livingIds = new Set();
  for (const unit of currentGame.allies || []) {
    if (!unit || unit.kind !== 'heavy') continue;
    livingIds.add(unit.id);
    const previous = heavyHpSeen.get(unit.id);
    if (previous != null && unit.hp < previous) {
      const loss = previous - unit.hp;
      unit.hp = Math.max(0, previous - loss * (1 - HEAVY.reduction));
    }
    heavyHpSeen.set(unit.id, unit.hp);
  }
  for (const id of [...heavyHpSeen.keys()]) if (!livingIds.has(id)) heavyHpSeen.delete(id);
}

function patchBarracks() {
  if (!currentGame || !lv4() || document.querySelector('#panelTitle')?.textContent !== '병영') return;
  const body = document.querySelector('#panelBody');
  if (!body || body.querySelector('[data-df-heavy]')) return;
  const grid = body.querySelector('.choice-grid') || body;
  const count = livingHeavy().length;
  const button = document.createElement('button');
  button.className = 'choice';
  button.dataset.dfHeavy = '1';
  button.disabled = count >= HEAVY.max;
  button.innerHTML = `<span>🛡️ 중갑병 모집 (${count}/${HEAVY.max})<small style="display:block">체력500 · 데미지${Math.round(HEAVY.attack * heavyMultiplier() * 100) / 100} · 피해25% 감소</small></span><b>식량70</b>`;
  grid.appendChild(button);
}

function patchLevelPanel() {
  if (!currentGame || !lv4() || document.querySelector('#panelTitle')?.textContent !== '병력 레벨업') return;
  const body = document.querySelector('#panelBody');
  const grid = body?.querySelector('.choice-grid');
  if (!grid) return;
  let button = grid.querySelector('[data-df-heavy-upgrade]');
  if (!button) {
    button = document.createElement('button');
    button.className = 'choice';
    button.dataset.dfHeavyUpgrade = '1';
    grid.appendChild(button);
  }
  const level = root().heavyUpgrade;
  const maxed = level >= 3;
  button.disabled = maxed;
  button.innerHTML = `<span>🛡️ 중갑병 ${level}/3<small style="display:block">공격력 ×${heavyMultiplier().toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}</small></span><b>${maxed ? '최대 강화' : `${HEAVY_UPGRADE_COSTS[level]}골드`}</b>`;
}

function patchInventory() {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '가방') return;
  const body = document.querySelector('#panelBody');
  const grid = body?.querySelector('.inventory-grid');
  if (!grid) return;
  let card = grid.querySelector('[data-df-black-iron]');
  if (!card) {
    card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.dfBlackIron = '1';
    grid.appendChild(card);
  }
  card.innerHTML = `⬛ 흑철<span>${Math.floor(Number(currentGame.state.inventory.blackIron) || 0)}개</span>`;
  let note = body.querySelector('[data-df-status]');
  if (!note) {
    note = document.createElement('p');
    note.className = 'panel-note';
    note.dataset.dfStatus = '1';
    body.appendChild(note);
  }
  note.textContent = `어둠과 화염 · 마을회관 ${lv4() ? 'Lv.4' : lv3() ? 'Lv.3' : 'Lv.2 이하'} · 흑철 광산 ${root().blackMineBuilt ? '가동중' : '미건설'} · 화염포탑 ${root().flameTurretBuilt ? '완성' : '미건설'}`;
}

function contextAction() {
  if (!currentGame) return null;
  const found = nearestBlackIronNode();
  if (found) {
    const remain = Math.max(0, (Number(root().nodeReadyAt[found.index]) || 0) - Date.now());
    return { key: 'node', found, label: remain > 0 ? `⬛ 흑철 광맥 · ${Math.ceil(remain / 1000)}초 후 재생` : '⬛ 흑철 채굴' };
  }
  if (lv3() && distance(currentGame.player, BLACK_MINE) <= BLACK_MINE.radius && !root().blackMineBuilt) return { key: 'blackMine', label: '⛏️ 흑철 광산 · 나무5 돌3 흑철3' };
  if (lv3() && !lv4() && distance(currentGame.player, TOWN_HALL) <= TOWN_HALL.radius) return { key: 'lv4', label: '🌑🔥 마을회관 Lv.4 · 흑철3 철5 돌7 나무5' };
  if (lv4() && distance(currentGame.player, FLAME_TURRET) <= FLAME_TURRET.radius && !root().flameTurretBuilt) return { key: 'flameTurret', label: '🔥 화염포탑 · 흑철1 나무5 돌3' };
  return null;
}

function executeAction(action) {
  if (!action) return false;
  if (action.key === 'node') return mineBlackIronNode(action.found);
  if (action.key === 'blackMine') { buildBlackMine(); return true; }
  if (action.key === 'lv4') { upgradeLv4(); return true; }
  if (action.key === 'flameTurret') { buildFlameTurret(); return true; }
  return false;
}

function setupContextButton() {
  if (document.querySelector('#darknessFlameContextButton')) return;
  const button = document.createElement('button');
  button.id = 'darknessFlameContextButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:30;border:0;border-radius:14px;padding:10px 14px;background:rgba(37,25,25,.96);box-shadow:0 4px 14px rgba(0,0,0,.35);font-weight:900;color:#ffd8a8;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    const action = contextAction();
    if (!action) return;
    event.preventDefault(); event.stopImmediatePropagation(); executeAction(action);
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateContextUi() {
  setupContextButton();
  const button = document.querySelector('#darknessFlameContextButton');
  if (!button) return;
  const action = contextAction();
  button.style.display = action ? 'block' : 'none';
  if (action) {
    button.textContent = action.label;
    const hint = document.querySelector('#hint');
    if (hint) hint.textContent = action.label;
  }
}

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  const action = contextAction();
  if (!action) return;
  event.preventDefault(); event.stopImmediatePropagation(); executeAction(action);
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  const action = contextAction();
  if (!action) return;
  event.preventDefault(); event.stopImmediatePropagation(); executeAction(action);
}, true);

document.addEventListener('click', event => {
  const heavy = event.target?.closest?.('[data-df-heavy]');
  if (heavy && !heavy.disabled) {
    event.preventDefault(); event.stopImmediatePropagation(); recruitHeavy(); return;
  }
  const upgrade = event.target?.closest?.('[data-df-heavy-upgrade]');
  if (upgrade && !upgrade.disabled) {
    event.preventDefault(); event.stopImmediatePropagation(); upgradeHeavy();
  }
}, true);

function makeRegionEnemy(def) {
  return { ...def, maxHp: def.hp, homeX: def.x, homeY: def.y, cool: 0, alive: true, vx: 0, vy: 0, wander: 0 };
}

function applyRegionDefeated() {
  const defeated = new Set(root()?.regionDefeated || []);
  for (const enemy of regionEnemies) {
    if (defeated.has(enemy.id)) { enemy.hp = 0; enemy.alive = false; }
  }
}

function livingFieldTroops() {
  return (currentGame?.allies || []).filter(u => u && !u.enemy && u.hp > 0 && ['soldier','archer','knight','cavalry','spearman','heavy'].includes(u.kind));
}

function missionTroops() { return livingFieldTroops().filter(u => u._darknessFlameMission); }

function otherFieldCombat() {
  if (!currentGame) return true;
  if (currentGame.raidActive || currentGame.selectedWolfId != null || currentGame.selectedNorthMobId != null || currentGame.jungleCombatActive || currentGame.jungleWestCampCombatActive) return true;
  return livingFieldTroops().some(u => u._westMission || u._northMission || u._jungleWestMission || u._westBearMission);
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return { x: sx + currentGame.player.x - innerWidth / 2, y: sy + currentGame.player.y - innerHeight / 2 };
}

function selectRegionEnemyAt(sx, sy) {
  if (!currentGame || !volcanoUnlocked() || currentGame.raidActive) return false;
  const now = performance.now();
  if (now - lastDoubleAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;
  let best = null, bestDistance = 72;
  for (const enemy of regionEnemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    const d = Math.hypot(point.x - enemy.x, point.y - enemy.y);
    if (d < bestDistance) { best = enemy; bestDistance = d; }
  }
  if (!best) return false;
  lastDoubleAt = now;
  if (otherFieldCombat()) { toast('다른 야외 전투가 끝난 뒤 화염 황무지 적을 공격할 수 있어'); return true; }
  const troops = livingFieldTroops();
  if (!troops.length) { toast('출동할 병력이 없어'); return true; }
  selectedRegionEnemyId = best.id;
  for (const unit of troops) {
    unit._fieldMission = true; unit._darknessFlameMission = true; unit._darknessFlameReturning = false;
    unit.wander = 999; unit.vx = 0; unit.vy = 0;
  }
  toast(`🌑 ${best.label} 지정 · 병력 ${troops.length}명 출동`);
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!selectRegionEnemyAt(event.clientX, event.clientY)) return;
  event.preventDefault(); event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const dbl = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!dbl || !selectRegionEnemyAt(event.clientX, event.clientY)) return;
  event.preventDefault(); event.stopImmediatePropagation();
}, true);

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x, dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = Number(unit.speed) || 0;
  unit.x += dx / d * speed * dt;
  unit.y += dy / d * speed * dt;
}

function nearest(from, units) {
  let best = null, bestDistance = Infinity;
  for (const unit of units || []) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(unit.x - from.x, unit.y - from.y);
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return { unit: best, distance: bestDistance };
}

function releaseRegionTroops(returnHome = true) {
  for (const unit of livingFieldTroops()) {
    if (!unit._darknessFlameMission) continue;
    unit._fieldMission = false; unit._darknessFlameMission = false; unit._darknessFlameReturning = returnHome;
    unit.wander = 999; unit.vx = 0; unit.vy = 0;
  }
}

function returnRegionTroops(dt) {
  if (!currentGame || selectedRegionEnemyId || currentGame.raidActive) return;
  const barracks = currentGame.barracks || { x: 1080, y: 650 };
  for (const unit of livingFieldTroops()) {
    if (!unit._darknessFlameReturning) continue;
    const d = Math.hypot(barracks.x - unit.x, barracks.y - unit.y);
    if (d <= 90) { unit._darknessFlameReturning = false; unit.wander = 0; }
    else moveToward(unit, barracks.x, barracks.y, dt);
  }
}

function pruneDeadTroops() {
  if (!currentGame) return;
  let changed = false;
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp > 0) continue;
    currentGame.allies.splice(i, 1); changed = true;
  }
  if (changed) save();
}

function defeatRegionEnemy(enemy) {
  enemy.hp = 0; enemy.alive = false;
  selectedRegionEnemyId = null;
  if (!root().regionDefeated.includes(enemy.id)) root().regionDefeated.push(enemy.id);
  releaseRegionTroops(true);
  save();
  toast(`🌑 ${enemy.label} 처치!`);
}

function attackWithSpecialEnemy(enemy, troops, dt) {
  enemy.cool = Math.max(0, (Number(enemy.cool) || 0) - dt);
  const found = nearest(enemy, troops);
  if (!found.unit) return;
  const target = found.unit;
  if (found.distance > enemy.range) { moveToward(enemy, target.x, target.y, dt); return; }
  if (enemy.cool > 0) return;
  if (enemy.kind === 'fireSoldier') {
    for (const unit of troops) if (unit.hp > 0 && Math.hypot(unit.x - target.x, unit.y - target.y) <= enemy.splash) unit.hp -= enemy.fireDamage;
    enemy.cool = enemy.interval;
  } else if (enemy.kind === 'blackGeneral') {
    const enraged = enemy.hp <= enemy.maxHp * .5;
    const damage = Math.random() < .30 ? 120 : enemy.generalDamage;
    target.hp -= damage;
    enemy.cool = enraged ? .8 : enemy.interval;
  } else {
    target.hp -= enemy.attack;
    enemy.cool = enemy.interval;
  }
  pruneDeadTroops();
}

function updateRegionCombat(dt) {
  if (!currentGame || !volcanoUnlocked()) return;
  applyRegionDefeated();
  if (currentGame.raidActive) {
    selectedRegionEnemyId = null;
    if (missionTroops().length) releaseRegionTroops(false);
    return;
  }
  const enemy = regionEnemies.find(e => e.id === selectedRegionEnemyId && e.alive && e.hp > 0) || null;
  if (selectedRegionEnemyId && !enemy) { selectedRegionEnemyId = null; releaseRegionTroops(true); }
  if (!enemy) { returnRegionTroops(dt); return; }
  const troops = missionTroops();
  if (!troops.length) { selectedRegionEnemyId = null; toast('화염 황무지 전투 병력이 전멸했어'); return; }

  for (const unit of troops) {
    unit.cool = Math.max(0, (Number(unit.cool) || 0) - dt);
    const d = Math.hypot(enemy.x - unit.x, enemy.y - unit.y) || 1;
    if (d > (Number(unit.range) || 55)) moveToward(unit, enemy.x, enemy.y, dt);
    else if (unit.cool <= 0) {
      enemy.hp -= Number(unit.attack) || 0;
      unit.cool = unit.kind === 'archer' ? 1.15 : .85;
    }
  }
  if (enemy.hp <= 0) { defeatRegionEnemy(enemy); return; }
  attackWithSpecialEnemy(enemy, troops, dt);
  if (enemy.hp <= 0) defeatRegionEnemy(enemy);
}

function makeRaidEnemy(kind, index, overrides = {}) {
  const base = { id: nextUnitId++, kind, enemy: true, boss: false, hp: 100, maxHp: 100, attack: 10, range: 55, speed: 76, cool: index * .08, wander: 0, vx: 0, vy: 0, x: 1490 + index * 55, y: 470 + (index % 4) * 110 };
  return Object.assign(base, overrides);
}

function makeRaid8() {
  const a = [];
  for (let i = 0; i < 2; i++) a.push(makeRaidEnemy('berserker', i, { hp: 600, maxHp: 600, attack: 0, range: 58, speed: 82, berserkerDamage: 67, berserkerInterval: 1, berserkerTimer: .6, x: 1510 + i * 90, y: 510 + i * 190 }));
  for (let i = 0; i < 3; i++) a.push(makeRaidEnemy('archer', i + 2, { hp: 55, maxHp: 55, attack: 18, range: 220, speed: 64, x: 1590 + i * 62, y: 470 + i * 115 }));
  for (let i = 0; i < 2; i++) a.push(makeRaidEnemy('cavalry', i + 5, { hp: 600, maxHp: 600, attack: 30, range: 55, speed: 105, x: 1720 + i * 70, y: 540 + i * 185 }));
  a.push(makeRaidEnemy('cannon', 7, { hp: 1800, maxHp: 1800, attack: 0, range: 280, speed: 48, cannonDamage: 75, cannonInterval: 2.5, stunMs: 3000, cannonTimer: 1.2, x: 1830, y: 640 }));
  return a;
}

function makeRaid9() {
  return [
    ...Array.from({ length: 3 }, (_, i) => makeRaidEnemy('blackSoldier', i, { hp: 500, maxHp: 500, attack: 25, range: 58, speed: 70, x: 1500 + i * 72, y: 470 + i * 125 })),
    ...Array.from({ length: 2 }, (_, i) => makeRaidEnemy('blackArcher', i + 3, { hp: 360, maxHp: 360, attack: 35, range: 245, speed: 61, x: 1720 + i * 70, y: 490 + i * 190 })),
    makeRaidEnemy('blackHeavy', 5, { hp: 1400, maxHp: 1400, attack: 45, range: 62, speed: 48, x: 1820, y: 690 }),
    makeRaidEnemy('fireSoldier', 6, { hp: 700, maxHp: 700, attack: 0, range: 250, speed: 54, fireDamage: 40, fireInterval: 2, fireTimer: .8, splash: 95, x: 1880, y: 540 })
  ];
}

function makeRaid10() {
  return [
    makeRaidEnemy('blackGeneral', 0, { boss: true, hp: 2000, maxHp: 2000, attack: 0, range: 65, speed: 62, generalDamage: 60, generalTimer: .7, x: 1740, y: 620 }),
    ...Array.from({ length: 2 }, (_, i) => makeRaidEnemy('blackHeavy', i + 1, { hp: 1400, maxHp: 1400, attack: 45, range: 62, speed: 48, x: 1570 + i * 300, y: 510 + i * 210 })),
    ...Array.from({ length: 2 }, (_, i) => makeRaidEnemy('fireSoldier', i + 3, { hp: 700, maxHp: 700, attack: 0, range: 250, speed: 54, fireDamage: 40, fireInterval: 2, fireTimer: .8 + i * .3, splash: 95, x: 1650 + i * 220, y: 440 + i * 280 })),
    ...Array.from({ length: 3 }, (_, i) => makeRaidEnemy('blackArcher', i + 5, { hp: 360, maxHp: 360, attack: 35, range: 245, speed: 61, x: 1500 + i * 150, y: 780 - i * 100 }))
  ];
}

function raidCycle(game) { return Math.max(0, Math.floor(Number(game?.state?.raidCycleCount) || 0)); }

function installLateRaid(game) {
  if (!game?.raidActive || game.pirateRaidActive) return;
  const cycle = raidCycle(game);
  if (![8, 9, 10].includes(cycle) || cycle === lastRaidCycle) return;
  lastRaidCycle = cycle;
  const units = cycle === 8 ? makeRaid8() : cycle === 9 ? makeRaid9() : makeRaid10();
  game.enemies.splice(0, game.enemies.length, ...units);
  game.raidPhase = cycle;
  game.eighthRaid = cycle === 8; game.ninthRaid = cycle === 9; game.tenthRaid = cycle === 10;
  if (cycle === 8) toast('⚔️ 8번째 습격 · 광전사2 궁수3 기마병2 대포병1');
  else if (cycle === 9) toast('🌑 9번째 습격 · 검은 갑옷단 등장!');
  else toast('👹🔥 10번째 보스 습격 · 검은 장군 등장!');
}

function updateRaidSpecials(game, dt) {
  if (!game?.raidActive || game.pirateRaidActive || ![8,9,10].includes(Number(game.raidPhase))) return;
  const allies = (game.allies || []).filter(u => u && !u.enemy && u.hp > 0);
  if (!allies.length) return;
  for (const enemy of game.enemies || []) {
    if (!enemy || enemy.hp <= 0) continue;
    const found = nearest(enemy, allies);
    if (!found.unit) continue;
    if (enemy.kind === 'berserker') {
      enemy.attack = 0;
      enemy.berserkerTimer = Math.max(0, (Number(enemy.berserkerTimer) || 0) - dt);
      if (found.distance <= (enemy.range || 58) && enemy.berserkerTimer <= 0) {
        found.unit.hp -= enemy.berserkerDamage || 67;
        enemy.berserkerTimer = enemy.berserkerInterval || 1;
        enemy._berserkerAttackUntil = performance.now() + 250;
      }
    } else if (enemy.kind === 'fireSoldier') {
      enemy.attack = 0;
      enemy.fireTimer = Math.max(0, (Number(enemy.fireTimer) || 0) - dt);
      if (found.distance <= (enemy.range || 250) && enemy.fireTimer <= 0) {
        for (const unit of allies) if (Math.hypot(unit.x - found.unit.x, unit.y - found.unit.y) <= (enemy.splash || 95)) unit.hp -= enemy.fireDamage || 40;
        enemy.fireTimer = enemy.fireInterval || 2;
        enemy._fireAttackUntil = performance.now() + 260;
      }
    } else if (enemy.kind === 'blackGeneral') {
      enemy.attack = 0;
      enemy.generalTimer = Math.max(0, (Number(enemy.generalTimer) || 0) - dt);
      if (found.distance <= (enemy.range || 65) && enemy.generalTimer <= 0) {
        found.unit.hp -= Math.random() < .30 ? 120 : (enemy.generalDamage || 60);
        enemy.generalTimer = enemy.hp <= enemy.maxHp * .5 ? .8 : 1.35;
        enemy._generalAttackUntil = performance.now() + 260;
      }
    }
  }
}

function patchRaidLabel(game) {
  const phase = Number(game?.raidPhase);
  if (!game?.raidActive || game.pirateRaidActive || ![8,9,10].includes(phase)) return;
  const label = document.querySelector('#raidText');
  if (!label) return;
  const alive = (game.enemies || []).filter(u => u?.hp > 0).length;
  if (phase === 8) label.textContent = `⚔️ 8번째 습격 · 광전사2 궁수3 기마병2 대포1 · 적 ${alive}`;
  else if (phase === 9) label.textContent = `🌑 9번째 습격 · 검은 갑옷단 · 적 ${alive}`;
  else label.textContent = `👹🔥 10번째 보스 습격 · 검은 장군 · 적 ${alive}`;
}

function updateFlameTurret(dt) {
  const state = root();
  if (!currentGame?.raidActive || !state?.flameTurretBuilt) { turretTimer = 0; return; }
  turretTimer += dt;
  if (turretTimer < FLAME_TURRET.interval) return;
  turretTimer %= FLAME_TURRET.interval;
  let target = null, best = FLAME_TURRET.range;
  for (const enemy of currentGame.enemies || []) {
    if (!enemy || enemy.hp <= 0) continue;
    const d = Math.hypot(enemy.x - FLAME_TURRET.x, enemy.y - FLAME_TURRET.y);
    if (d < best) { target = enemy; best = d; }
  }
  if (!target) return;
  for (const enemy of currentGame.enemies || []) {
    if (!enemy || enemy.hp <= 0) continue;
    if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= FLAME_TURRET.splash) enemy.hp -= FLAME_TURRET.damage;
  }
  turretShot = { x1: FLAME_TURRET.x, y1: FLAME_TURRET.y - 45, x2: target.x, y2: target.y, until: performance.now() + 260 };
}

function visible(game, x, y, w, h, margin = 220) {
  const left = game.player.x - innerWidth / 2 - margin, right = game.player.x + innerWidth / 2 + margin;
  const top = game.player.y - innerHeight / 2 - margin, bottom = game.player.y + innerHeight / 2 + margin;
  return x + w >= left && x <= right && y + h >= top && y <= bottom;
}

function drawVolcanoGround(ctx, game) {
  if (!volcanoUnlocked()) return;
  ctx.save();
  ctx.fillStyle = '#82cadd'; ctx.fillRect(2720, -900, 1660, 1080);
  ctx.fillStyle = '#433a37';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(2760, -860, 1600, 1020, 92); ctx.fill(); } else ctx.fillRect(2760, -860, 1600, 1020);
  ctx.fillStyle = '#5c4840';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(2800, -820, 1520, 940, 72); ctx.fill(); } else ctx.fillRect(2800, -820, 1520, 940);
  ctx.strokeStyle = '#ff7b32'; ctx.lineWidth = 18;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(2920 + i * 360, -760); ctx.bezierCurveTo(2860 + i * 370, -470, 3090 + i * 330, -260, 2980 + i * 360, 80); ctx.stroke();
  }
  ctx.fillStyle = '#f0c7a0'; ctx.textAlign = 'center'; ctx.font = '900 20px system-ui'; ctx.fillText('🌑🔥 화염 황무지 · 어둠과 화염', 3540, -785);
  ctx.font = '700 12px system-ui'; ctx.fillText('흑철 광맥 8개 · 검은 갑옷단 주둔지', 3540, -758);
  ctx.restore();
}

function drawBlackIronNodes(ctx) {
  if (!volcanoUnlocked()) return;
  const now = Date.now();
  BLACK_IRON_NODES.forEach((node, index) => {
    const ready = (Number(root().nodeReadyAt[index]) || 0) <= now;
    ctx.save(); ctx.globalAlpha = ready ? 1 : .32; ctx.textAlign = 'center';
    ctx.font = '32px system-ui'; ctx.fillText('⬛', node.x, node.y + 8);
    ctx.fillStyle = '#f3d1b0'; ctx.font = '800 10px system-ui'; ctx.fillText(ready ? '흑철 광맥' : '재생 중', node.x, node.y + 34); ctx.restore();
  });
}

function drawVillageSites(ctx, game) {
  if (!lv3()) return;
  ctx.save(); ctx.textAlign = 'center';
  if (!root().blackMineBuilt) {
    ctx.setLineDash([8,6]); ctx.strokeStyle = '#5c4d4b'; ctx.lineWidth = 3; ctx.strokeRect(BLACK_MINE.x - 62, BLACK_MINE.y - 45, 124, 90); ctx.setLineDash([]);
    ctx.font = '30px system-ui'; ctx.fillText('⬛', BLACK_MINE.x, BLACK_MINE.y + 7);
    ctx.fillStyle = '#315748'; ctx.font = '800 10px system-ui'; ctx.fillText('흑철 광산 · 나무5 돌3 흑철3', BLACK_MINE.x, BLACK_MINE.y + 58);
  } else {
    ctx.fillStyle = '#4b4544'; ctx.fillRect(BLACK_MINE.x - 58, BLACK_MINE.y - 37, 116, 75);
    ctx.font = '34px system-ui'; ctx.fillText('⛏️', BLACK_MINE.x, BLACK_MINE.y + 8);
    ctx.fillStyle = '#315748'; ctx.font = '800 10px system-ui'; ctx.fillText('흑철 광산 · 20초마다 +3', BLACK_MINE.x, BLACK_MINE.y + 55);
  }

  if (lv4()) {
    if (!root().flameTurretBuilt) {
      ctx.setLineDash([8,6]); ctx.strokeStyle = '#a14d2f'; ctx.lineWidth = 3; ctx.strokeRect(FLAME_TURRET.x - 58, FLAME_TURRET.y - 44, 116, 88); ctx.setLineDash([]);
      ctx.font = '30px system-ui'; ctx.fillText('🔥', FLAME_TURRET.x, FLAME_TURRET.y + 7);
      ctx.fillStyle = '#315748'; ctx.font = '800 10px system-ui'; ctx.fillText('화염포탑 · 흑철1 나무5 돌3', FLAME_TURRET.x, FLAME_TURRET.y + 56);
    } else {
      ctx.fillStyle = '#72402d'; ctx.fillRect(FLAME_TURRET.x - 45, FLAME_TURRET.y - 35, 90, 70);
      ctx.font = '36px system-ui'; ctx.fillText('🔥', FLAME_TURRET.x, FLAME_TURRET.y + 8);
      ctx.fillStyle = '#315748'; ctx.font = '800 10px system-ui'; ctx.fillText('화염포탑 · 범위45', FLAME_TURRET.x, FLAME_TURRET.y + 52);
    }
  }
  if (lv4()) {
    ctx.font = '22px system-ui'; ctx.fillText('🌑🔥', TOWN_HALL.x, TOWN_HALL.y - 78);
    ctx.fillStyle = '#315748'; ctx.font = '900 11px system-ui'; ctx.fillText('마을회관 Lv.4', TOWN_HALL.x, TOWN_HALL.y - 56);
  }
  if (turretShot && turretShot.until > performance.now()) {
    ctx.strokeStyle = '#ff6b2b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(turretShot.x1, turretShot.y1); ctx.lineTo(turretShot.x2, turretShot.y2); ctx.stroke();
  }
  ctx.restore();
}

function drawRegionEnemy(ctx, enemy) {
  if (!enemy.alive || enemy.hp <= 0) return;
  const selected = enemy.id === selectedRegionEnemyId;
  ctx.save(); ctx.textAlign = 'center';
  ctx.font = enemy.kind === 'blackGeneral' ? '43px system-ui' : '35px system-ui'; ctx.fillText(enemy.icon, enemy.x, enemy.y + 10);
  const w = enemy.kind === 'blackGeneral' ? 76 : 58;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(enemy.x - w/2, enemy.y - 35, w, 7);
  ctx.fillStyle = selected ? '#f0a43b' : '#6d2020'; ctx.fillRect(enemy.x - w/2, enemy.y - 35, w * Math.max(0, enemy.hp / enemy.maxHp), 7);
  ctx.fillStyle = '#f2d2bd'; ctx.font = '800 10px system-ui'; ctx.fillText(enemy.label, enemy.x, enemy.y + 38);
  if (selected) { ctx.strokeStyle = '#f0a43b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 37, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function drawCustomUnit(ctx, unit, originalDrawUnit, renderer) {
  const map = {
    heavy: ['🛡️', '중갑병', '#3f8c59'],
    blackSoldier: ['⚔️', '검은 병사', '#752d2d'],
    blackArcher: ['🏹', '검은 궁수', '#752d2d'],
    blackHeavy: ['🛡️', '검은 중갑병', '#752d2d'],
    fireSoldier: ['🔥', '화염병', '#c14d27'],
    blackGeneral: ['👹', '검은 장군', '#6c1d1d']
  };
  if (!map[unit?.kind]) return originalDrawUnit.call(renderer, ctx, unit);
  if (unit.hp <= 0) return;
  const [icon, label, color] = map[unit.kind];
  ctx.save(); ctx.textAlign = 'center'; ctx.font = unit.kind === 'blackGeneral' ? '43px system-ui' : '34px system-ui'; ctx.fillText(icon, unit.x, unit.y + 10);
  const w = unit.kind === 'blackGeneral' ? 76 : 54;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(unit.x-w/2, unit.y-32, w, 6);
  ctx.fillStyle = color; ctx.fillRect(unit.x-w/2, unit.y-32, w*Math.max(0, unit.hp/unit.maxHp), 6);
  ctx.fillStyle = unit.enemy ? '#5e2020' : '#315748'; ctx.font = '800 10px system-ui'; ctx.fillText(label, unit.x, unit.y + 36); ctx.restore();
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawIsland = proto.drawIsland;
const originalDrawObjects = proto.drawObjects;
const originalDrawUnit = proto.drawUnit;

proto.draw = function drawWithDarknessAndFlame(game) {
  currentGame = game;
  ensureState(game.state);
  restoreHeavy(); syncHeavyAttack(); applyHeavyReduction(); applyRegionDefeated();
  const now = performance.now();
  const dt = Math.min(.08, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')) {
    updateBlackMine();
    updateRegionCombat(dt);
  }
  const result = originalDraw.call(this, game);
  installLateRaid(game);
  updateRaidSpecials(game, dt);
  updateFlameTurret(dt);
  patchRaidLabel(game);
  patchBarracks(); patchLevelPanel(); patchInventory(); updateContextUi();
  if (!game.raidActive) { game.eighthRaid = false; game.ninthRaid = false; game.tenthRaid = false; }
  return result;
};

proto.drawIsland = function drawIslandWithDarknessFlame(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  if (visible(game, 2720, -900, 1660, 1080)) drawVolcanoGround(ctx, game);
};

proto.drawObjects = function drawObjectsWithDarknessFlame(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  drawVillageSites(ctx, game);
  if (!volcanoUnlocked() || !visible(game, VOLCANO.x1, VOLCANO.y1, VOLCANO.x2 - VOLCANO.x1, VOLCANO.y2 - VOLCANO.y1)) return;
  drawBlackIronNodes(ctx);
  for (const enemy of regionEnemies) drawRegionEnemy(ctx, enemy);
};

proto.drawUnit = function drawDarknessFlameUnit(ctx, unit) {
  return drawCustomUnit(ctx, unit, originalDrawUnit, this);
};

setupContextButton();
