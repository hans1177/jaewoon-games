import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const CAVE = { x1: 4550, x2: 7650, y1: -820, y2: 220, roomWidth: 620 };
const ENTRANCE = { x: 4260, y: -300, radius: 105 };
const EXIT = { x: 4620, y: -300, radius: 105 };
const RESEARCH_LAB = { x: -690, y: 420, radius: 120, wood: 6, stone: 6, blackIron: 3, darkCrystal: 5 };
const CRYSTAL_RESPAWN_MS = 60000;
const ROOM_REWARDS = [0, 1, 2, 3, 4, 10];

const CRYSTAL_NODES = [
  { x: 4750, y: -610 }, { x: 5100, y: -120 },
  { x: 5390, y: -590 }, { x: 5710, y: -170 },
  { x: 6080, y: -620 }, { x: 6650, y: -150 },
  { x: 7210, y: -620 }
];

const ENEMY_DEFS = [
  { id: 'c1-spider-a', room: 1, kind: 'caveSpider', label: '동굴 거미', icon: '🕷️', x: 4870, y: -500, hp: 450, attack: 30, interval: 1.05, range: 54, speed: 76 },
  { id: 'c1-spider-b', room: 1, kind: 'caveSpider', label: '동굴 거미', icon: '🕷️', x: 5050, y: -210, hp: 450, attack: 30, interval: 1.05, range: 54, speed: 76 },
  { id: 'c2-bat-a', room: 2, kind: 'abyssBat', label: '암흑 박쥐', icon: '🦇', x: 5380, y: -560, hp: 250, attack: 25, interval: .8, range: 48, speed: 108 },
  { id: 'c2-bat-b', room: 2, kind: 'abyssBat', label: '암흑 박쥐', icon: '🦇', x: 5540, y: -330, hp: 250, attack: 25, interval: .8, range: 48, speed: 108 },
  { id: 'c2-bat-c', room: 2, kind: 'abyssBat', label: '암흑 박쥐', icon: '🦇', x: 5680, y: -610, hp: 250, attack: 25, interval: .8, range: 48, speed: 108 },
  { id: 'c3-golem', room: 3, kind: 'crystalGolem', label: '수정 골렘', icon: '🗿', x: 6130, y: -390, hp: 1800, attack: 55, interval: 1.55, range: 62, speed: 48 },
  { id: 'c4-wizard-a', room: 4, kind: 'abyssWizard', label: '심연 마법사', icon: '🧙', x: 6580, y: -560, hp: 700, attack: 40, interval: 1.45, range: 245, speed: 55 },
  { id: 'c4-wizard-b', room: 4, kind: 'abyssWizard', label: '심연 마법사', icon: '🧙', x: 6840, y: -210, hp: 700, attack: 40, interval: 1.45, range: 245, speed: 55 },
  { id: 'c4-spider', room: 4, kind: 'caveSpider', label: '동굴 거미', icon: '🕷️', x: 6740, y: -410, hp: 450, attack: 30, interval: 1.05, range: 54, speed: 76 },
  { id: 'c5-boss', room: 5, kind: 'abyssGolem', label: '심연 골렘', icon: '💠', x: 7390, y: -390, hp: 2500, attack: 30, interval: 1.2, range: 72, speed: 46, boss: true }
];

const GEAR = {
  blackIronSword: { label: '⚔️ 흑철 검', blackIron: 5, darkCrystal: 3, desc: '기사 공격력 +30' },
  blackIronSpear: { label: '🔱 흑철 창', blackIron: 4, darkCrystal: 4, desc: '창병·중갑병 공격력 +25' },
  flameBow: { label: '🔥 화염 활', blackIron: 3, darkCrystal: 5, desc: '궁수 공격력 +20 · 25% 화상' }
};

const RESEARCH = {
  soldierCrit: { label: '⚔️ 병사 치명타', cost: 6, desc: '20% 확률로 추가 1회분 피해' },
  archerPierce: { label: '🏹 궁수 관통', cost: 8, desc: '공격 시 두 번째 적에게 60% 피해' },
  knightGuard: { label: '🛡️ 기사 방어', cost: 8, desc: '받는 피해 20% 감소' },
  cavalryCharge: { label: '🏇 기마병 돌진', cost: 10, desc: '5초마다 공격력 1.5배 돌진 추가타' },
  heavyTaunt: { label: '🛡️ 중갑병 도발', cost: 10, desc: '심연 적 우선 도발 · 습격 적 유도' }
};

let currentGame = null;
let activeRuntime = null;
let lastTick = performance.now();
let selectedEnemyId = null;
let lastTap = { time: 0, x: 0, y: 0 };
let lastDoubleAt = 0;
let raidWasActive = false;
const enemies = ENEMY_DEFS.map(makeEnemy);
const enemyBurns = new Map();
const knightHpSeen = new Map();

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state) {
  if (!state || typeof state !== 'object') return null;
  state.inventory ||= {};
  state.inventory.darkCrystal = Math.max(0, Math.floor(Number(state.inventory.darkCrystal) || 0));
  const root = state.abyssCaveV23 && typeof state.abyssCaveV23 === 'object' ? state.abyssCaveV23 : {};
  state.abyssCaveV23 = root;
  root.inside = Boolean(root.inside);
  root.clearedRooms = Math.max(0, Math.min(5, Math.floor(Number(root.clearedRooms) || 0)));
  root.completed = Boolean(root.completed);
  root.nodeReadyAt = Array.isArray(root.nodeReadyAt)
    ? CRYSTAL_NODES.map((_, i) => Math.max(0, Number(root.nodeReadyAt[i]) || 0))
    : CRYSTAL_NODES.map(() => 0);
  root.researchLabBuilt = Boolean(root.researchLabBuilt);
  root.gear ||= {};
  for (const key of Object.keys(GEAR)) root.gear[key] = Boolean(root.gear[key]);
  root.research ||= {};
  for (const key of Object.keys(RESEARCH)) root.research[key] = Boolean(root.research[key]);
  return root;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithAbyssCave(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithAbyssCave(state, delay) {
  activeRuntime = this;
  ensureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function root() { return currentGame ? ensureState(currentGame.state) : null; }
function lv4() { return Boolean(currentGame?.state?.darknessFlameV19?.townHallLv4); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function save(immediate = false) {
  if (!currentGame?.state) return;
  ensureState(currentGame.state);
  currentGame.state.player = { x: Math.round(currentGame.player.x), y: Math.round(currentGame.player.y) };
  currentGame.state.army = (currentGame.allies || []).filter(u => u?.hp > 0).map(u => ({ kind: u.kind }));
  activeRuntime?.queueSaveProgress(currentGame.state, immediate ? 0 : undefined);
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function makeEnemy(def) {
  return { ...def, maxHp: def.hp, homeX: def.x, homeY: def.y, cool: 0, alive: true, shardTimer: 2, vx: 0, vy: 0 };
}

function resetEnemy(enemy) {
  const def = ENEMY_DEFS.find(item => item.id === enemy.id);
  if (!def) return;
  Object.assign(enemy, makeEnemy(def));
}

function applyProgress() {
  const cleared = root()?.clearedRooms || 0;
  for (const enemy of enemies) {
    if (enemy.room <= cleared) {
      enemy.hp = 0;
      enemy.alive = false;
    }
  }
}

function resetUnclearedRoom(room) {
  const cleared = root()?.clearedRooms || 0;
  if (!room || room <= cleared) return;
  for (const enemy of enemies) if (enemy.room === room) resetEnemy(enemy);
  enemyBurns.clear();
}

function roomOfX(x) {
  return Math.max(1, Math.min(5, Math.floor((x - CAVE.x1) / CAVE.roomWidth) + 1));
}

function livingTroops() {
  return (currentGame?.allies || []).filter(u => u && !u.enemy && u.hp > 0 && ['soldier','archer','knight','cavalry','spearman','heavy'].includes(u.kind));
}

function missionTroops() {
  return livingTroops().filter(u => u._abyssMission);
}

function moveTroopsNear(x, y) {
  const troops = livingTroops();
  troops.forEach((unit, i) => {
    unit.x = x - 45 + (i % 4) * 30;
    unit.y = y + 55 + Math.floor(i / 4) * 32;
    unit.wander = 0;
    unit.vx = 0;
    unit.vy = 0;
    unit._fieldMission = false;
    unit._abyssMission = false;
  });
}

function enterCave() {
  if (!currentGame || !lv4()) return toast('🏛️ 마을회관 Lv.4가 필요해');
  if (currentGame.raidActive) return toast('⚠️ 습격 중에는 심연의 동굴에 들어갈 수 없어');
  const state = root();
  state.inside = true;
  const entryRoom = Math.max(1, Math.min(5, state.clearedRooms || 1));
  const x = CAVE.x1 + (entryRoom - 1) * CAVE.roomWidth + 90;
  currentGame.player.x = x;
  currentGame.player.y = -300;
  moveTroopsNear(x, -300);
  applyProgress();
  save(true);
  toast('🕳️ 심연의 동굴 진입 · ' + entryRoom + '구역 체크포인트');
}

function exitCave(reason = 'manual') {
  if (!currentGame) return;
  const state = root();
  const room = roomOfX(currentGame.player.x);
  resetUnclearedRoom(room);
  selectedEnemyId = null;
  state.inside = false;
  currentGame.player.x = 4210;
  currentGame.player.y = -300;
  moveTroopsNear(currentGame.barracks?.x || 1080, currentGame.barracks?.y || 650);
  save(true);
  toast(reason === 'wipe' ? '💀 탐험대 전멸 · 미완료 구역이 초기화됐어' : reason === 'raid' ? '⚠️ 습격 발생 · 동굴 탐험이 중단됐어' : '↩️ 동굴을 나왔어 · 미완료 구역이 초기화됐어');
}

function nearestCrystalNode() {
  if (!root()?.inside) return null;
  let best = null, bestDistance = 88;
  CRYSTAL_NODES.forEach((node, index) => {
    const d = dist(currentGame.player, node);
    if (d < bestDistance) { best = { node, index }; bestDistance = d; }
  });
  return best;
}

function mineCrystal(found) {
  const now = Date.now();
  const state = root();
  const readyAt = Number(state.nodeReadyAt[found.index]) || 0;
  if (readyAt > now) return toast('💎 암흑 수정 재생까지 ' + Math.ceil((readyAt - now) / 1000) + '초');
  currentGame.state.inventory.darkCrystal = (Number(currentGame.state.inventory.darkCrystal) || 0) + 1;
  state.nodeReadyAt[found.index] = now + CRYSTAL_RESPAWN_MS;
  save();
  toast('💎 암흑 수정 +1');
}

function canPay(cost) {
  const inv = currentGame?.state?.inventory || {};
  return (Number(inv.wood) || 0) >= (cost.wood || 0)
    && (Number(inv.stone) || 0) >= (cost.stone || 0)
    && (Number(inv.blackIron) || 0) >= (cost.blackIron || 0)
    && (Number(inv.darkCrystal) || 0) >= (cost.darkCrystal || 0);
}

function spend(cost) {
  const inv = currentGame.state.inventory;
  inv.wood = (Number(inv.wood) || 0) - (cost.wood || 0);
  inv.stone = (Number(inv.stone) || 0) - (cost.stone || 0);
  inv.blackIron = (Number(inv.blackIron) || 0) - (cost.blackIron || 0);
  inv.darkCrystal = (Number(inv.darkCrystal) || 0) - (cost.darkCrystal || 0);
}

function buildResearchLab() {
  if (!lv4()) return toast('🏛️ 마을회관 Lv.4가 필요해');
  if (root().researchLabBuilt) return openResearchPanel();
  if (!canPay(RESEARCH_LAB)) return toast('🔬 연구소 재료 부족 · 나무6 돌6 흑철3 암흑수정5');
  spend(RESEARCH_LAB);
  root().researchLabBuilt = true;
  save(true);
  toast('🔬 수정 연구소 완성');
}

function researchSkill(key) {
  const def = RESEARCH[key];
  if (!def || !root().researchLabBuilt || root().research[key]) return;
  const inv = currentGame.state.inventory;
  if ((Number(inv.darkCrystal) || 0) < def.cost) return toast('💎 암흑 수정 ' + def.cost + '개 필요');
  inv.darkCrystal -= def.cost;
  root().research[key] = true;
  save(true);
  openResearchPanel(true);
  toast(def.label + ' 연구 완료');
}

function openResearchPanel(refresh = false) {
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!panel || !title || !body) return;
  title.textContent = '수정 연구소';
  const state = root();
  const crystal = Math.floor(Number(currentGame.state.inventory.darkCrystal) || 0);
  body.innerHTML = '<div class="inventory-grid"><div class="item-card">💎 암흑 수정<span>' + crystal + '개</span></div></div>'
    + '<div class="choice-grid" style="margin-top:10px">'
    + Object.entries(RESEARCH).map(([key, def]) => {
      const done = state.research[key];
      return '<button class="choice" data-abyss-research="' + key + '" ' + (done ? 'disabled' : '') + '><span>' + def.label + '<small style="display:block">' + def.desc + '</small></span><b>' + (done ? '연구 완료' : '수정 ' + def.cost) + '</b></button>';
    }).join('')
    + '</div>';
  body.querySelectorAll('[data-abyss-research]').forEach(button => button.addEventListener('click', () => researchSkill(button.dataset.abyssResearch)));
  if (!panel.open && !refresh) panel.showModal();
}

function gearCostText(def) {
  return '흑철 ' + def.blackIron + ' · 암흑수정 ' + def.darkCrystal;
}

function craftGear(key) {
  const def = GEAR[key];
  if (!def || root().gear[key]) return;
  if (!canPay(def)) return toast('⚒️ 재료 부족 · ' + gearCostText(def));
  spend(def);
  root().gear[key] = true;
  save(true);
  patchSmithyPanel(true);
  toast(def.label + ' 제작 완료 · ' + def.desc);
}

function patchSmithyPanel(force = false) {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '강화 대장간') return;
  const body = document.querySelector('#panelBody');
  if (!body) return;
  let section = body.querySelector('[data-abyss-gear-section]');
  const signature = Object.keys(GEAR).map(key => key + ':' + root().gear[key]).join('|') + ':' + (currentGame.state.inventory.darkCrystal || 0) + ':' + (currentGame.state.inventory.blackIron || 0);
  if (section && !force && section.dataset.signature === signature) return;
  if (section) section.remove();
  section = document.createElement('div');
  section.dataset.abyssGearSection = '1';
  section.dataset.signature = signature;
  section.style.marginTop = '12px';
  section.innerHTML = '<p class="panel-note"><b>심연 장비</b> · 암흑 수정과 흑철로 제작</p><div class="choice-grid">'
    + Object.entries(GEAR).map(([key, def]) => {
      const done = root().gear[key];
      return '<button class="choice" data-abyss-gear="' + key + '" ' + (done ? 'disabled' : '') + '><span>' + def.label + '<small style="display:block">' + def.desc + '</small></span><b>' + (done ? '제작 완료' : gearCostText(def)) + '</b></button>';
    }).join('')
    + '</div>';
  body.appendChild(section);
  section.querySelectorAll('[data-abyss-gear]').forEach(button => button.addEventListener('click', () => craftGear(button.dataset.abyssGear)));
}

function applyClassGear(unit) {
  if (!unit || unit.enemy || unit.hp <= 0) return;
  const state = root();
  if ((unit.kind === 'knight' && state.gear.blackIronSword) || (unit.kind === 'archer' && state.gear.flameBow)) {
    const bonus = unit.kind === 'knight' ? 30 : 20;
    const key = unit.kind === 'knight' ? 'blackIronSword' : 'flameBow';
    const meta = unit.__classUpgradeV12;
    if (meta && !unit['__abyss_' + key]) {
      meta.baseAttack = (Number(meta.baseAttack) || 0) + bonus;
      const level = Math.max(0, Math.min(3, Number(currentGame.state.classPirateV12?.upgrades?.[unit.kind]) || 0));
      unit.attack = Math.round(meta.baseAttack * Math.pow(1.5, level) * 100) / 100;
      meta.lastAppliedAttack = unit.attack;
      unit['__abyss_' + key] = true;
    }
  }
  if (unit.kind === 'spearman' && state.gear.blackIronSpear) {
    const level = Math.max(0, Math.min(3, Number(currentGame.state.villageExpansionV14?.spearmanUpgrade) || 0));
    unit.attack = Math.round((30 * Math.pow(1.5, level) + 25) * 100) / 100;
  }
  if (unit.kind === 'heavy' && state.gear.blackIronSpear) {
    const level = Math.max(0, Math.min(3, Number(currentGame.state.darknessFlameV19?.heavyUpgrade) || 0));
    unit.attack = Math.round((50 * Math.pow(1.5, level) + 25) * 100) / 100;
  }
}

function applyAllGear() {
  for (const unit of livingTroops()) applyClassGear(unit);
}

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x, dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = Number(unit.speed) || 0;
  unit.x += dx / d * speed * dt;
  unit.y += dy / d * speed * dt;
}

function nearest(from, units, preferHeavy = false) {
  let pool = (units || []).filter(u => u && u.hp > 0);
  if (preferHeavy && root()?.research.heavyTaunt) {
    const heavies = pool.filter(u => u.kind === 'heavy');
    if (heavies.length) pool = heavies;
  }
  let best = null, bestDistance = Infinity;
  for (const unit of pool) {
    const d = Math.hypot(unit.x - from.x, unit.y - from.y);
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return { unit: best, distance: bestDistance };
}

function livingRoomEnemies(room) {
  return enemies.filter(e => e.room === room && e.alive && e.hp > 0);
}

function enemyAtScreen(sx, sy) {
  if (!currentGame || !root()?.inside) return null;
  const wx = sx + currentGame.player.x - innerWidth / 2;
  const wy = sy + currentGame.player.y - innerHeight / 2;
  let best = null, bestDistance = 72;
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    const d = Math.hypot(wx - enemy.x, wy - enemy.y);
    if (d < bestDistance) { best = enemy; bestDistance = d; }
  }
  return best;
}

function selectEnemyAt(sx, sy) {
  const now = performance.now();
  if (now - lastDoubleAt < 260 || currentGame?.raidActive) return false;
  const enemy = enemyAtScreen(sx, sy);
  if (!enemy) return false;
  lastDoubleAt = now;
  const troops = livingTroops();
  if (!troops.length) { toast('출동할 병력이 없어'); return true; }
  selectedEnemyId = enemy.id;
  for (const unit of troops) {
    unit._fieldMission = true;
    unit._abyssMission = true;
    unit.wander = 999;
    unit.vx = 0;
    unit.vy = 0;
  }
  toast('🕳️ ' + enemy.label + ' 공격 · 병력 ' + troops.length + '명');
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!selectEnemyAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const dbl = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!dbl || !selectEnemyAt(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function applyEnemyBurn(enemy) {
  enemyBurns.set(enemy.id, { ticks: 3, nextAt: performance.now() + 1000 });
  enemy._burnUntil = performance.now() + 3000;
}

function updateEnemyBurns() {
  const now = performance.now();
  for (const [id, burn] of [...enemyBurns.entries()]) {
    const enemy = enemies.find(e => e.id === id) || currentGame?.enemies?.find(e => e.id === id);
    if (!enemy || enemy.hp <= 0) { enemyBurns.delete(id); continue; }
    while (burn.ticks > 0 && now >= burn.nextAt) {
      enemy.hp -= 5;
      burn.ticks--;
      burn.nextAt += 1000;
    }
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy._burnUntil = 0;
      enemyBurns.delete(id);
      const caveEnemy = enemies.find(e => e.id === id);
      if (caveEnemy) {
        caveEnemy.alive = false;
        if (selectedEnemyId === id) selectedEnemyId = null;
        roomCleared(caveEnemy.room);
      }
      continue;
    }
    if (burn.ticks <= 0) {
      enemyBurns.delete(id);
      enemy._burnUntil = 0;
    }
  }
}

function damageTroop(unit, damage) {
  if (!unit || unit.hp <= 0) return;
  let final = damage;
  if (unit.kind === 'knight' && root()?.research.knightGuard) final *= .8;
  unit.hp -= final;
}

function roomCleared(room) {
  if (livingRoomEnemies(room).length) return;
  const state = root();
  if (room <= state.clearedRooms) return;
  state.clearedRooms = room;
  const reward = ROOM_REWARDS[room] || 0;
  currentGame.state.inventory.darkCrystal = (Number(currentGame.state.inventory.darkCrystal) || 0) + reward;
  if (room === 5) state.completed = true;
  save(true);
  toast(room === 5 ? '💠 심연 골렘 처치! 암흑 수정 +' + reward + ' · 동굴 정복' : '✅ 동굴 ' + room + '구역 돌파 · 암흑 수정 +' + reward);
}

function updateCaveCombat(dt) {
  if (!currentGame || !root()?.inside || currentGame.raidActive) return;
  applyProgress();
  updateEnemyBurns();
  const enemy = enemies.find(e => e.id === selectedEnemyId && e.alive && e.hp > 0) || null;
  if (selectedEnemyId && !enemy) selectedEnemyId = null;
  if (!enemy) return;
  const troops = missionTroops();
  if (!troops.length) {
    exitCave('wipe');
    return;
  }

  for (const unit of troops) {
    unit.cool = Math.max(0, (Number(unit.cool) || 0) - dt);
    unit.__abyssCharge = Math.max(0, (Number(unit.__abyssCharge) || 0) - dt);
    const d = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
    const range = Number(unit.range) || 55;
    if (unit.kind === 'cavalry' && root().research.cavalryCharge && unit.__abyssCharge <= 0 && d <= 150) {
      enemy.hp -= (Number(unit.attack) || 0) * 1.5;
      unit.__abyssCharge = 5;
    }
    if (d > range) {
      moveToward(unit, enemy.x, enemy.y, dt);
      continue;
    }
    if (unit.cool > 0) continue;
    let damage = Number(unit.attack) || 0;
    if (unit.kind === 'soldier' && root().research.soldierCrit && Math.random() < .20) damage *= 2;
    enemy.hp -= damage;

    if (unit.kind === 'archer' && root().research.archerPierce) {
      const second = livingRoomEnemies(enemy.room).filter(e => e.id !== enemy.id).sort((a,b) => dist(unit,a) - dist(unit,b))[0];
      if (second && dist(unit, second) <= range + 30) second.hp -= damage * .6;
    }
    if (unit.kind === 'archer' && root().gear.flameBow && Math.random() < .25) applyEnemyBurn(enemy);
    unit.cool = unit.kind === 'archer' ? 1.15 : .85;
  }

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    selectedEnemyId = null;
    for (const unit of missionTroops()) {
      unit._fieldMission = false;
      unit._abyssMission = false;
      unit.wander = 0;
    }
    roomCleared(enemy.room);
    return;
  }

  enemy.cool = Math.max(0, (Number(enemy.cool) || 0) - dt);
  enemy.shardTimer = Math.max(0, (Number(enemy.shardTimer) || 0) - dt);
  const found = nearest(enemy, troops, true);
  if (!found.unit) return;
  if (found.distance > enemy.range) moveToward(enemy, found.unit.x, found.unit.y, dt);
  else if (enemy.cool <= 0) {
    const hit = enemy.kind === 'abyssGolem' && Math.random() < .30 ? 55 : enemy.attack;
    damageTroop(found.unit, hit);
    enemy.cool = enemy.interval;
  }
  if (enemy.kind === 'abyssGolem' && enemy.hp <= enemy.maxHp * .5 && enemy.shardTimer <= 0) {
    const shardTarget = nearest(enemy, troops, true).unit;
    if (shardTarget) damageTroop(shardTarget, 17.5);
    enemy.shardTimer = 2;
  }
  for (let i = currentGame.allies.length - 1; i >= 0; i--) {
    if (currentGame.allies[i]?.hp <= 0) currentGame.allies.splice(i, 1);
  }
}

function updateRaidResearch(dt) {
  if (!currentGame?.raidActive || !root()) return;
  updateEnemyBurns();
  const raidEnemies = (currentGame.enemies || []).filter(e => e?.hp > 0);
  if (!raidEnemies.length) return;
  const troops = livingTroops();

  for (const unit of troops) {
    unit.__abyssRaidTimer = Math.max(0, (Number(unit.__abyssRaidTimer) || 0) - dt);
    unit.__abyssCharge = Math.max(0, (Number(unit.__abyssCharge) || 0) - dt);
    const found = nearest(unit, raidEnemies);
    if (!found.unit) continue;

    if (unit.kind === 'soldier' && root().research.soldierCrit && unit.__abyssRaidTimer <= 0 && found.distance <= (unit.range || 55) + 8) {
      if (Math.random() < .20) found.unit.hp -= Number(unit.attack) || 0;
      unit.__abyssRaidTimer = .85;
    }
    if (unit.kind === 'archer' && unit.__abyssRaidTimer <= 0 && found.distance <= (unit.range || 220) + 10) {
      if (root().research.archerPierce) {
        const second = raidEnemies.filter(e => e.id !== found.unit.id).sort((a,b) => dist(unit,a) - dist(unit,b))[0];
        if (second && dist(unit, second) <= (unit.range || 220) + 25) second.hp -= (Number(unit.attack) || 0) * .6;
      }
      if (root().gear.flameBow && Math.random() < .25) applyEnemyBurn(found.unit);
      unit.__abyssRaidTimer = 1.15;
    }
    if (unit.kind === 'cavalry' && root().research.cavalryCharge && unit.__abyssCharge <= 0 && found.distance <= 150) {
      found.unit.hp -= (Number(unit.attack) || 0) * 1.5;
      unit.__abyssCharge = 5;
    }
  }

  if (root().research.heavyTaunt) {
    const heavy = troops.find(u => u.kind === 'heavy');
    if (heavy) {
      for (const enemy of raidEnemies) {
        const d = dist(enemy, heavy);
        if (d > 70 && d < 420) moveToward(enemy, heavy.x, heavy.y, dt * .22);
      }
    }
  }
}

function applyKnightRaidGuard() {
  const living = new Set();
  for (const unit of livingTroops()) {
    if (unit.kind !== 'knight' || unit._abyssMission) continue;
    living.add(unit.id);
    const prev = knightHpSeen.get(unit.id);
    if (root()?.research.knightGuard && prev != null && unit.hp < prev) {
      const loss = prev - unit.hp;
      unit.hp = Math.max(0, prev - loss * .8);
    }
    knightHpSeen.set(unit.id, unit.hp);
  }
  for (const id of [...knightHpSeen.keys()]) if (!living.has(id)) knightHpSeen.delete(id);
}

function handleRaidInterruption() {
  if (!currentGame) return;
  if (currentGame.raidActive && root()?.inside && !raidWasActive) exitCave('raid');
  raidWasActive = Boolean(currentGame.raidActive);
}

function contextAction() {
  if (!currentGame) return null;
  const state = root();
  if (state?.inside) {
    if (dist(currentGame.player, EXIT) <= EXIT.radius) return { key: 'exit', label: '↩️ 화염 황무지로 나가기' };
    const crystal = nearestCrystalNode();
    if (crystal) {
      const remain = Math.max(0, (Number(state.nodeReadyAt[crystal.index]) || 0) - Date.now());
      return { key: 'crystal', crystal, label: remain > 0 ? '💎 수정 재생 ' + Math.ceil(remain / 1000) + '초' : '💎 암흑 수정 채굴' };
    }
  } else if (lv4() && dist(currentGame.player, ENTRANCE) <= ENTRANCE.radius) {
    return { key: 'enter', label: '🕳️ 심연의 동굴 입장' };
  }

  if (lv4() && dist(currentGame.player, RESEARCH_LAB) <= RESEARCH_LAB.radius) {
    return root().researchLabBuilt
      ? { key: 'research', label: '🔬 수정 연구소' }
      : { key: 'buildLab', label: '🔬 연구소 건설 · 나무6 돌6 흑철3 수정5' };
  }
  return null;
}

function executeAction(action) {
  if (!action) return false;
  if (action.key === 'enter') enterCave();
  else if (action.key === 'exit') exitCave('manual');
  else if (action.key === 'crystal') mineCrystal(action.crystal);
  else if (action.key === 'buildLab') buildResearchLab();
  else if (action.key === 'research') openResearchPanel();
  return true;
}

document.querySelector('#actionButton')?.addEventListener('pointerdown', event => {
  const action = contextAction();
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  executeAction(action);
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  const action = contextAction();
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  executeAction(action);
}, true);

function patchInventory() {
  if (!currentGame || document.querySelector('#panelTitle')?.textContent !== '가방') return;
  const body = document.querySelector('#panelBody');
  const grid = body?.querySelector('.inventory-grid');
  if (!grid) return;
  let card = grid.querySelector('[data-abyss-crystal]');
  if (!card) {
    card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.abyssCrystal = '1';
    grid.appendChild(card);
  }
  card.innerHTML = '💎 암흑 수정<span>' + Math.floor(Number(currentGame.state.inventory.darkCrystal) || 0) + '개</span>';
  let note = body.querySelector('[data-abyss-status]');
  if (!note) {
    note = document.createElement('p');
    note.className = 'panel-note';
    note.dataset.abyssStatus = '1';
    body.appendChild(note);
  }
  note.textContent = '심연의 동굴 · ' + root().clearedRooms + '/5 구역 돌파 · 수정 연구소 ' + (root().researchLabBuilt ? '완성' : '미건설');
}

function patchHint() {
  const action = contextAction();
  if (!action) return;
  const hint = document.querySelector('#hint');
  if (hint) hint.textContent = action.label;
}

function drawCaveGround(ctx) {
  if (!root()?.inside) return;
  ctx.save();
  ctx.fillStyle = '#141522';
  ctx.fillRect(CAVE.x1 - 80, CAVE.y1 - 80, CAVE.x2 - CAVE.x1 + 160, CAVE.y2 - CAVE.y1 + 160);
  for (let room = 1; room <= 5; room++) {
    const x = CAVE.x1 + (room - 1) * CAVE.roomWidth;
    ctx.fillStyle = room % 2 ? '#24253a' : '#2c2940';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x + 18, CAVE.y1 + 18, CAVE.roomWidth - 36, CAVE.y2 - CAVE.y1 - 36, 42);
      ctx.fill();
    } else ctx.fillRect(x + 18, CAVE.y1 + 18, CAVE.roomWidth - 36, CAVE.y2 - CAVE.y1 - 36);
    ctx.fillStyle = '#bba9ff';
    ctx.textAlign = 'center';
    ctx.font = '900 17px system-ui';
    ctx.fillText('심연 ' + room + '구역', x + CAVE.roomWidth / 2, CAVE.y1 + 55);
    if (room < 5) {
      const gateX = x + CAVE.roomWidth - 8;
      ctx.fillStyle = room <= root().clearedRooms ? '#695f85' : '#11131e';
      ctx.fillRect(gateX, -570, 16, 520);
      ctx.font = '25px system-ui';
      ctx.fillText(room <= root().clearedRooms ? '🔓' : '🔒', gateX, -590);
    }
  }
  ctx.fillStyle = '#a693da';
  ctx.font = '900 20px system-ui';
  ctx.fillText('🕳️ 심연의 동굴', CAVE.x1 + 180, -760);
  ctx.restore();
}

function drawEntrance(ctx) {
  if (!lv4() || root()?.inside) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#24202b';
  ctx.beginPath();
  ctx.arc(ENTRANCE.x, ENTRANCE.y, 58, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(ENTRANCE.x - 58, ENTRANCE.y, 116, 62);
  ctx.font = '35px system-ui';
  ctx.fillText('🕳️', ENTRANCE.x, ENTRANCE.y + 20);
  ctx.fillStyle = '#f0c7a0';
  ctx.font = '800 11px system-ui';
  ctx.fillText('심연의 동굴 · Lv.4', ENTRANCE.x, ENTRANCE.y + 82);
  ctx.restore();
}

function drawResearchLab(ctx) {
  if (!lv4()) return;
  ctx.save();
  ctx.textAlign = 'center';
  if (!root().researchLabBuilt) {
    ctx.setLineDash([8,6]);
    ctx.strokeStyle = '#73668f';
    ctx.lineWidth = 3;
    ctx.strokeRect(RESEARCH_LAB.x - 65, RESEARCH_LAB.y - 48, 130, 96);
    ctx.setLineDash([]);
    ctx.font = '31px system-ui';
    ctx.fillText('💎', RESEARCH_LAB.x, RESEARCH_LAB.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText('수정 연구소 건설터', RESEARCH_LAB.x, RESEARCH_LAB.y + 67);
  } else {
    ctx.fillStyle = '#554c70';
    ctx.fillRect(RESEARCH_LAB.x - 60, RESEARCH_LAB.y - 42, 120, 84);
    ctx.fillStyle = '#342f48';
    ctx.beginPath();
    ctx.moveTo(RESEARCH_LAB.x - 72, RESEARCH_LAB.y - 42);
    ctx.lineTo(RESEARCH_LAB.x, RESEARCH_LAB.y - 88);
    ctx.lineTo(RESEARCH_LAB.x + 72, RESEARCH_LAB.y - 42);
    ctx.closePath();
    ctx.fill();
    ctx.font = '30px system-ui';
    ctx.fillText('🔬', RESEARCH_LAB.x, RESEARCH_LAB.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '800 11px system-ui';
    ctx.fillText('수정 연구소', RESEARCH_LAB.x, RESEARCH_LAB.y + 62);
  }
  ctx.restore();
}

function drawCrystals(ctx) {
  if (!root()?.inside) return;
  const now = Date.now();
  CRYSTAL_NODES.forEach((node, index) => {
    const ready = (Number(root().nodeReadyAt[index]) || 0) <= now;
    ctx.save();
    ctx.globalAlpha = ready ? 1 : .25;
    ctx.textAlign = 'center';
    ctx.font = '30px system-ui';
    ctx.fillText('💎', node.x, node.y + 8);
    ctx.fillStyle = '#c6b7ff';
    ctx.font = '800 9px system-ui';
    ctx.fillText(ready ? '암흑 수정' : '재생 중', node.x, node.y + 34);
    ctx.restore();
  });
}

function drawEnemy(ctx, enemy) {
  if (!root()?.inside || !enemy.alive || enemy.hp <= 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = enemy.boss ? '48px system-ui' : '34px system-ui';
  ctx.fillText(enemy.icon, enemy.x, enemy.y + 12);
  const w = enemy.boss ? 76 : 56;
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(enemy.x - w/2, enemy.y - 35, w, 6);
  ctx.fillStyle = enemy.id === selectedEnemyId ? '#ffb347' : '#9b5de5';
  ctx.fillRect(enemy.x - w/2, enemy.y - 35, w * Math.max(0, enemy.hp / enemy.maxHp), 6);
  ctx.fillStyle = '#ddd4ff';
  ctx.font = '800 10px system-ui';
  ctx.fillText(enemy.label, enemy.x, enemy.y + 36);
  if (enemy._burnUntil > performance.now()) {
    ctx.font = '17px system-ui';
    ctx.fillText('🔥', enemy.x + 28, enemy.y - 8);
  }
  ctx.restore();
}

function drawExit(ctx) {
  if (!root()?.inside) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '34px system-ui';
  ctx.fillText('🚪', EXIT.x, EXIT.y + 8);
  ctx.fillStyle = '#c6b7ff';
  ctx.font = '800 10px system-ui';
  ctx.fillText('화염 황무지로 나가기', EXIT.x, EXIT.y + 39);
  ctx.restore();
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawIsland = proto.drawIsland;
const originalDrawObjects = proto.drawObjects;

proto.draw = function drawWithAbyssCave(game) {
  currentGame = game;
  ensureState(game.state);
  applyProgress();
  handleRaidInterruption();
  const now = performance.now();
  const dt = Math.min(.08, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;

  applyAllGear();
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')) updateCaveCombat(dt);

  const result = originalDraw.call(this, game);

  applyAllGear();
  applyKnightRaidGuard();
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')) updateRaidResearch(dt);
  patchSmithyPanel();
  patchInventory();
  patchHint();
  return result;
};

proto.drawIsland = function drawIslandWithAbyssCave(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  drawCaveGround(ctx);
};

proto.drawObjects = function drawObjectsWithAbyssCave(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  drawEntrance(ctx);
  drawResearchLab(ctx);
  if (!root()?.inside) return;
  drawExit(ctx);
  drawCrystals(ctx);
  for (const enemy of enemies) drawEnemy(ctx, enemy);
};

setInterval(() => {
  if (!currentGame) return;
  applyAllGear();
  patchSmithyPanel();
  patchInventory();
  patchHint();
}, 220);
