import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const EAST_GATE = { x: 1325, y: 600, cost: 60 };
const JUNGLE_GATE = { x: 2170, y: 1005, cost: 100 };
const HOSPITAL = { x: 1215, y: 300, cost: 50, cooldownMs: 60000 };
const TOWN_HALL_HALF = { wood: 6, stone: 5 };
const KNIGHT_MAX = 3;
const JUNGLE = { x1: 1435, x2: 2795, y1: 1120, y2: 2000 };
const BIG_TREE_RESPAWN_MS = 45000;
const BIG_TREES = [
  { x: 1580, y: 1320 },
  { x: 1880, y: 1810 },
  { x: 2220, y: 1420 },
  { x: 2510, y: 1880 },
  { x: 2740, y: 1540 }
];

let currentGame = null;
let activeRuntime = null;
let pendingEastBoost = false;
let lastTick = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastDoubleHandledAt = 0;
let selectedBoarId = null;
let lastWolfTargetId = null;
const ownedMove = new Set();
const directionMap = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};

const boars = [
  makeBoar(1, 1650, 1530),
  makeBoar(2, 2050, 1870),
  makeBoar(3, 2420, 1490),
  makeBoar(4, 2690, 1810)
];

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureUpgradeState(state) {
  if (!state || typeof state !== 'object') return null;
  const source = state.southernJungle && typeof state.southernJungle === 'object' ? state.southernJungle : {};
  const treeReadyAt = Array.isArray(source.treeReadyAt)
    ? BIG_TREES.map((_, i) => Math.max(0, Number(source.treeReadyAt[i]) || 0))
    : BIG_TREES.map(() => 0);
  state.southernJungle = {
    unlocked: Boolean(source.unlocked),
    treeReadyAt
  };
  state.hospitalCooldownUntil = Math.max(0, Number(state.hospitalCooldownUntil) || 0);
  return state.southernJungle;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithWorldUpgrade(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureUpgradeState(progress);
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithWorldUpgrade(progress, delay) {
  activeRuntime = this;
  ensureUpgradeState(progress);
  return originalQueueSaveProgress.call(this, progress, delay);
};

function saveState() {
  if (!currentGame?.state) return;
  ensureUpgradeState(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function livingTroops() {
  return (currentGame?.allies || []).filter(unit =>
    unit && unit.hp > 0 && (unit.kind === 'soldier' || unit.kind === 'archer' || unit.kind === 'knight')
  );
}

function livingSoldiers() {
  return livingTroops().filter(unit => unit.kind === 'soldier');
}

function makeBoar(id, x, y) {
  return {
    id, x, y, homeX: x, homeY: y,
    hp: 300, maxHp: 300, attack: 20,
    speed: 66, cool: 0, alive: true, respawnAt: 0,
    wander: 0, vx: 0, vy: 0
  };
}

function setupJungleUnlockButton() {
  if (document.querySelector('#jungleUnlockButton')) return;
  const button = document.createElement('button');
  button.id = 'jungleUnlockButton';
  button.type = 'button';
  button.textContent = '🌴 남쪽 정글 해금 · 100골드';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:11;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    unlockJungle();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateJungleUnlockButton() {
  const button = document.querySelector('#jungleUnlockButton');
  if (!button || !currentGame) return;
  const jungle = ensureUpgradeState(currentGame.state);
  const nearby = currentGame.state.expanded && !jungle.unlocked && distance(currentGame.player, JUNGLE_GATE) <= 145;
  button.style.display = nearby ? 'block' : 'none';
}

function unlockJungle() {
  if (!currentGame?.state?.expanded) return showToast('먼저 동쪽 지역을 열어야 해');
  const jungle = ensureUpgradeState(currentGame.state);
  if (jungle.unlocked) return;
  if ((Number(currentGame.state.coins) || 0) < JUNGLE_GATE.cost) return showToast('남쪽 정글 해금에는 100골드가 필요해');
  currentGame.state.coins -= JUNGLE_GATE.cost;
  jungle.unlocked = true;
  currentGame.world.h = Math.max(currentGame.world.h, 2200);
  saveState();
  updateJungleUnlockButton();
  showToast('🌴 남쪽 정글이 열렸어! 큰 나무와 멧돼지가 있어');
}

function nearEastGate() {
  return currentGame && !currentGame.state.expanded && distance(currentGame.player, EAST_GATE) <= 92;
}

function prepareEastDiscount() {
  if (!nearEastGate() || pendingEastBoost) return { relevant: false, allowCore: true };
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < EAST_GATE.cost) {
    showToast('동쪽 지역 해금에는 60골드가 필요해');
    return { relevant: true, allowCore: false };
  }
  pendingEastBoost = true;
  currentGame.state.coins = coins + 60;
  setTimeout(() => {
    if (currentGame && !currentGame.state.expanded) currentGame.state.coins = Math.max(0, (Number(currentGame.state.coins) || 0) - 60);
    pendingEastBoost = false;
  }, 0);
  return { relevant: true, allowCore: true };
}

function nearestReadyBigTree() {
  if (!currentGame) return null;
  const jungle = ensureUpgradeState(currentGame.state);
  if (!jungle.unlocked) return null;
  let best = null;
  let bestDistance = 96;
  BIG_TREES.forEach((tree, index) => {
    const d = distance(currentGame.player, tree);
    if (d < bestDistance) { best = { tree, index, d }; bestDistance = d; }
  });
  return best;
}

function collectBigTree() {
  const found = nearestReadyBigTree();
  if (!found) return false;
  const jungle = ensureUpgradeState(currentGame.state);
  const now = Date.now();
  if (jungle.treeReadyAt[found.index] > now) {
    showToast('🌳 이 큰 나무는 다시 자라는 중이야');
    return true;
  }
  currentGame.state.inventory.wood = (Number(currentGame.state.inventory.wood) || 0) + 3;
  jungle.treeReadyAt[found.index] = now + BIG_TREE_RESPAWN_MS;
  saveState();
  showToast('🌳 큰 정글 나무 · 나무 +3');
  return true;
}

function handleContextAction() {
  if (!currentGame) return false;
  const jungle = ensureUpgradeState(currentGame.state);
  if (currentGame.state.expanded && !jungle.unlocked && distance(currentGame.player, JUNGLE_GATE) <= 145) {
    unlockJungle();
    return true;
  }
  if (collectBigTree()) return true;
  return false;
}

const actionButton = document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown', event => {
  if (handleContextAction()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const east = prepareEastDiscount();
  if (east.relevant && !east.allowCore) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, { capture: true, passive: false });

window.addEventListener('keydown', event => {
  const direction = directionMap[event.code];
  if (direction && currentGame?.state?.expanded && currentGame.player.x > 1360) {
    ownedMove.add(direction);
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (event.code !== 'Space' || event.repeat) return;
  if (handleContextAction()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const east = prepareEastDiscount();
  if (east.relevant && !east.allowCore) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('keyup', event => {
  const direction = directionMap[event.code];
  if (direction) ownedMove.delete(direction);
}, true);
window.addEventListener('blur', () => ownedMove.clear());

function runEasternMovement(dt) {
  if (!currentGame || !currentGame.state.expanded || ownedMove.size === 0) return;
  const player = currentGame.player;
  if (player.x < 1290) return;
  const jungle = ensureUpgradeState(currentGame.state);
  let dx = (ownedMove.has('right') ? 1 : 0) - (ownedMove.has('left') ? 1 : 0);
  let dy = (ownedMove.has('down') ? 1 : 0) - (ownedMove.has('up') ? 1 : 0);
  if (!dx && !dy) return;
  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag; dy /= mag;
  const speed = 185;
  const maxY = jungle.unlocked ? 2025 : 1025;
  const minX = player.y > 1060 ? 1435 : 1300;
  const nx = Math.max(minX, Math.min(2820, player.x + dx * speed * dt));
  const ny = Math.max(160, Math.min(maxY, player.y + dy * speed * dt));
  player.x = nx;
  player.y = ny;
}

function screenToWorld(sx, sy) {
  if (!currentGame) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function hospitalCooldownSeconds() {
  if (!currentGame) return 0;
  return Math.max(0, Math.ceil((Number(currentGame.state.hospitalCooldownUntil) - Date.now()) / 1000));
}

function useHospital() {
  if (!currentGame) return;
  const raidEnemies = (currentGame.enemies || []).some(enemy => enemy && enemy.hp > 0);
  const selectedWolf = currentGame.wolves?.find(wolf => wolf.id === currentGame.selectedWolfId && wolf.alive && wolf.hp > 0);
  const selectedBoar = boars.find(boar => boar.id === selectedBoarId && boar.alive && boar.hp > 0);
  if (currentGame.raidActive || raidEnemies) return showToast('🏥 습격 몬스터가 남아 있어서 치료할 수 없어');
  if (selectedWolf || selectedBoar || currentGame.jungleCombatActive) return showToast('🏥 전투 중에는 치료할 수 없어');
  if (livingSoldiers().length === 0) return showToast('🏥 살아있는 병사가 없어서 치료할 수 없어');
  const cool = hospitalCooldownSeconds();
  if (cool > 0) return showToast(`🏥 치료 쿨타임 ${cool}초 남음`);
  if ((Number(currentGame.state.coins) || 0) < HOSPITAL.cost) return showToast('🏥 치료 비용 50골드가 필요해');

  currentGame.state.coins -= HOSPITAL.cost;
  let healed = 0;
  for (const unit of livingTroops()) {
    if (unit.hp < unit.maxHp) { unit.hp = unit.maxHp; healed++; }
  }
  currentGame.state.hospitalCooldownUntil = Date.now() + HOSPITAL.cooldownMs;
  saveState();
  showToast(healed ? `🏥 병력 ${healed}명 풀피 회복 · 50골드` : '🏥 치료 완료 · 50골드');
}

function handleDoubleAt(sx, sy) {
  if (!currentGame) return false;
  const now = performance.now();
  if (now - lastDoubleHandledAt < 260) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;

  if (Math.hypot(point.x - HOSPITAL.x, point.y - HOSPITAL.y) <= 72) {
    lastDoubleHandledAt = now;
    useHospital();
    return true;
  }

  const jungle = ensureUpgradeState(currentGame.state);
  if (!jungle.unlocked || currentGame.raidActive) return false;
  let best = null;
  let bestDistance = 55;
  for (const boar of boars) {
    if (!boar.alive) continue;
    const d = Math.hypot(point.x - boar.x, point.y - boar.y);
    if (d < bestDistance) { best = boar; bestDistance = d; }
  }
  if (!best) return false;
  selectedBoarId = best.id;
  currentGame.jungleCombatActive = true;
  lastDoubleHandledAt = now;
  showToast(`🐗 멧돼지 지정! 병사·기사·궁수 ${livingTroops().length}명 출동`);
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (handleDoubleAt(event.clientX, event.clientY)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  if (now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38) {
    if (handleDoubleAt(event.clientX, event.clientY)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  lastTap = { time: now, x: event.clientX, y: event.clientY };
}, true);

function moveToward(unit, x, y, dt) {
  const dx = x - unit.x, dy = y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  unit.x += dx / d * unit.speed * dt;
  unit.y += dy / d * unit.speed * dt;
}

function nearestUnit(from, units) {
  let best = null, bestDistance = Infinity;
  for (const unit of units) {
    if (!unit || unit.hp <= 0) continue;
    const d = Math.hypot(from.x - unit.x, from.y - unit.y);
    if (d < bestDistance) { best = unit; bestDistance = d; }
  }
  return best;
}

function releaseAssist(unit) {
  if (!unit?._worldUpgradeAssist) return;
  unit._worldUpgradeAssist = false;
  unit.wander = 0;
  unit.vx = 0;
  unit.vy = 0;
}

function assistWolf(dt) {
  if (!currentGame) return;
  const wolf = currentGame.wolves?.find(item => item.id === currentGame.selectedWolfId && item.alive && item.hp > 0);
  if (!wolf || currentGame.raidActive || selectedBoarId != null) {
    for (const unit of currentGame.allies || []) if (unit.kind === 'archer' || unit.kind === 'knight') releaseAssist(unit);
    lastWolfTargetId = null;
    return;
  }

  if (lastWolfTargetId !== wolf.id) {
    lastWolfTargetId = wolf.id;
    showToast(`🐺 늑대 지정 · 병사·기사·궁수 ${livingTroops().length}명 출동`);
  }

  const support = (currentGame.allies || []).filter(unit => unit.hp > 0 && (unit.kind === 'archer' || unit.kind === 'knight'));
  for (const unit of support) {
    unit._worldUpgradeAssist = true;
    unit.wander = 999;
    unit.vx = 0; unit.vy = 0;
    unit._wolfAssistCool = Math.max(0, Number(unit._wolfAssistCool) || 0) - dt;
    const d = Math.hypot(wolf.x - unit.x, wolf.y - unit.y) || 1;
    if (d > unit.range) moveToward(unit, wolf.x, wolf.y, dt);
    else if (unit._wolfAssistCool <= 0) {
      wolf.hp -= unit.attack;
      unit._wolfAssistCool = unit.kind === 'archer' ? 1.15 : .85;
    }
  }

  if (livingSoldiers().length === 0 && support.length > 0) {
    wolf._supportAttackCool = Math.max(0, Number(wolf._supportAttackCool) || 0) - dt;
    const target = nearestUnit(wolf, support);
    if (target) {
      const d = Math.hypot(target.x - wolf.x, target.y - wolf.y) || 1;
      if (d > 52) moveToward(wolf, target.x, target.y, dt);
      else if (wolf._supportAttackCool <= 0) {
        target.hp -= wolf.attack;
        wolf._supportAttackCool = .9;
      }
    }
  }
}

function updateBoars(dt) {
  if (!currentGame) return;
  const jungle = ensureUpgradeState(currentGame.state);
  if (!jungle.unlocked) return;
  const now = Date.now();
  if (currentGame.raidActive) {
    selectedBoarId = null;
    currentGame.jungleCombatActive = false;
  }

  for (const boar of boars) {
    if (!boar.alive) {
      if (boar.respawnAt && now >= boar.respawnAt) {
        boar.alive = true; boar.hp = boar.maxHp; boar.x = boar.homeX; boar.y = boar.homeY; boar.respawnAt = 0;
      }
      continue;
    }
    boar.cool = Math.max(0, boar.cool - dt);
    if (selectedBoarId !== boar.id || currentGame.raidActive) {
      boar.wander -= dt;
      if (boar.wander <= 0) {
        const angle = Math.random() * Math.PI * 2;
        boar.vx = Math.cos(angle); boar.vy = Math.sin(angle);
        boar.wander = 1.4 + Math.random() * 2.8;
      }
      const nx = boar.x + boar.vx * boar.speed * .22 * dt;
      const ny = boar.y + boar.vy * boar.speed * .22 * dt;
      if (nx > JUNGLE.x1 + 35 && nx < JUNGLE.x2 - 35) boar.x = nx; else boar.vx *= -1;
      if (ny > JUNGLE.y1 + 35 && ny < JUNGLE.y2 - 35) boar.y = ny; else boar.vy *= -1;
      continue;
    }

    const troops = livingTroops();
    currentGame.jungleCombatActive = true;
    for (const unit of troops) {
      unit._worldUpgradeAssist = true;
      unit.wander = 999; unit.vx = 0; unit.vy = 0;
      unit._boarAssistCool = Math.max(0, Number(unit._boarAssistCool) || 0) - dt;
      const d = Math.hypot(boar.x - unit.x, boar.y - unit.y) || 1;
      if (d > unit.range) moveToward(unit, boar.x, boar.y, dt);
      else if (unit._boarAssistCool <= 0) {
        boar.hp -= unit.attack;
        unit._boarAssistCool = unit.kind === 'archer' ? 1.15 : .85;
      }
    }

    const target = nearestUnit(boar, troops);
    if (target) {
      const d = Math.hypot(target.x - boar.x, target.y - boar.y) || 1;
      if (d > 50) moveToward(boar, target.x, target.y, dt);
      else if (boar.cool <= 0) {
        target.hp -= boar.attack;
        boar.cool = .9;
      }
    }

    if (boar.hp <= 0) {
      boar.alive = false;
      boar.respawnAt = now + 60000;
      selectedBoarId = null;
      currentGame.jungleCombatActive = false;
      for (const unit of troops) releaseAssist(unit);
      showToast('🐗 멧돼지를 처치했어!');
    }
  }

  if (selectedBoarId == null && !currentGame.selectedWolfId) {
    currentGame.jungleCombatActive = false;
    for (const unit of currentGame.allies || []) releaseAssist(unit);
  }
}

function patchKnightLimit() {
  if (!currentGame) return;
  const button = document.querySelector('[data-knight-recruit]');
  if (!button) return;
  const count = (currentGame.allies || []).filter(unit => unit.kind === 'knight' && unit.hp > 0).length;
  if (button.disabled !== (count >= KNIGHT_MAX)) button.disabled = count >= KNIGHT_MAX;
  const span = button.querySelector('span');
  const text = `🛡️ 기사 모집 (${count}/${KNIGHT_MAX})`;
  if (span && span.textContent !== text) span.textContent = text;
}

document.addEventListener('click', event => {
  const knight = event.target.closest?.('[data-knight-recruit]');
  if (knight && currentGame) {
    const count = (currentGame.allies || []).filter(unit => unit.kind === 'knight' && unit.hp > 0).length;
    if (count >= KNIGHT_MAX) {
      event.preventDefault(); event.stopImmediatePropagation();
      showToast('🛡️ 기사는 최대 3명이야');
      return;
    }
  }

  const villageButton = event.target.closest?.('#villageBuildButton');
  if (!villageButton || villageButton.dataset.kind !== 'hall' || !currentGame) return;
  const village = currentGame.state.villageDevelopment || {};
  if (village.townHallBuilt) return;
  const inv = currentGame.state.inventory || {};
  const wood = Number(inv.wood) || 0, stone = Number(inv.stone) || 0;
  if (wood < TOWN_HALL_HALF.wood || stone < TOWN_HALL_HALF.stone) {
    event.preventDefault(); event.stopImmediatePropagation();
    showToast('🏛️ 마을회관 재료 부족 · 나무6 돌5');
    return;
  }
  inv.wood = wood + 6;
  inv.stone = stone + 5;
}, true);

function patchUI() {
  if (!currentGame) return;
  document.querySelector('#healingCenterButton')?.remove();
  patchKnightLimit();
  updateJungleUnlockButton();

  const villageButton = document.querySelector('#villageBuildButton');
  if (villageButton?.dataset.kind === 'hall') villageButton.textContent = '🏛️ 마을회관 건설 · 나무6 돌5';

  const hint = document.querySelector('#hint');
  if (!hint) return;
  if (nearEastGate()) {
    hint.textContent = '행동: 동쪽 지역 해금 · 60골드';
    return;
  }
  const jungle = ensureUpgradeState(currentGame.state);
  if (currentGame.state.expanded && !jungle.unlocked && distance(currentGame.player, JUNGLE_GATE) <= 150) {
    hint.textContent = '행동: 남쪽 정글 해금 · 100골드';
    return;
  }
  const tree = nearestReadyBigTree();
  if (tree) {
    hint.textContent = jungle.treeReadyAt[tree.index] <= Date.now() ? '행동: 큰 정글 나무 수집 · 나무 +3' : '큰 정글 나무가 다시 자라는 중';
    return;
  }
  if (distance(currentGame.player, HOSPITAL) <= 110) {
    const cool = hospitalCooldownSeconds();
    hint.textContent = cool > 0 ? `치유소 더블탭 · 쿨타임 ${cool}초` : '치유소 더블탭 · 치료 50골드';
  }
}

function worldTick() {
  const now = performance.now();
  const dt = Math.min(.08, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!currentGame || document.hidden || activeRuntime?.paused) return;
  currentGame.world.h = Math.max(currentGame.world.h, 2200);
  runEasternMovement(dt);
  assistWolf(dt);
  updateBoars(dt);
  patchUI();
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWorldUpgrade(game) {
  currentGame = game;
  ensureUpgradeState(game.state);
  game.world.h = Math.max(game.world.h, 2200);
  game.boars = boars;
  game.selectedBoarId = selectedBoarId;
  originalDraw.call(this, game);
  patchUI();
};

rendererProto.drawIsland = function drawExpandedVillageAndJungle(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  drawLargerVillage(ctx);
  drawJungleGround(ctx, game);
};

rendererProto.drawObjects = function drawWorldUpgradeObjects(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  drawTownHallCostPatch(ctx, game);
  drawHospitalStatus(ctx, game);
  drawJungleObjects(ctx, game);
};

function drawLargerVillage(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(73,115,78,.48)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(115, 720, 1230, 405);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(230,211,166,.34)';
  ctx.fillRect(180, 890, 1080, 62);
  ctx.fillRect(620, 745, 70, 355);
  ctx.fillStyle = '#315748';
  ctx.font = '800 13px system-ui';
  ctx.fillText('넓어진 마을 구역', 150, 750);
  drawSmallHouse(ctx, 250, 805);
  drawSmallHouse(ctx, 470, 1010);
  drawSmallHouse(ctx, 1280, 820);
  ctx.restore();
}

function drawSmallHouse(ctx, x, y) {
  ctx.fillStyle = '#e4c38e';
  ctx.fillRect(x - 34, y - 22, 68, 46);
  ctx.fillStyle = '#9b6650';
  ctx.beginPath();
  ctx.moveTo(x - 42, y - 22); ctx.lineTo(x, y - 51); ctx.lineTo(x + 42, y - 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f4b38';
  ctx.fillRect(x - 7, y + 3, 14, 21);
}

function drawJungleGround(ctx, game) {
  if (!game.state.expanded) return;
  const jungle = ensureUpgradeState(game.state);
  ctx.save();
  ctx.textAlign = 'center';
  if (!jungle.unlocked) {
    ctx.fillStyle = '#6e826e';
    ctx.fillRect(1480, 1050, 1330, 18);
    ctx.font = '36px system-ui';
    ctx.fillText('🔐', JUNGLE_GATE.x, 1088);
    ctx.fillStyle = '#315748';
    ctx.font = '800 14px system-ui';
    ctx.fillText('남쪽 정글 · 100골드', JUNGLE_GATE.x, 1115);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#e5cf92';
  this.rr(ctx, 1390, 1060, 1450, 1020, 100); ctx.fill();
  ctx.fillStyle = '#4f8451';
  this.rr(ctx, 1435, 1120, 1360, 880, 78); ctx.fill();
  ctx.fillStyle = 'rgba(35,92,45,.28)';
  for (let y = 1180; y < 1960; y += 120) {
    for (let x = 1500 + ((y / 120) % 2) * 55; x < 2760; x += 180) {
      ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = '#244d2d';
  ctx.font = '900 18px system-ui';
  ctx.fillText('남쪽 정글', 2140, 1160);
  ctx.font = '700 12px system-ui';
  ctx.fillText('동쪽과 같은 크기의 새로운 지역', 2140, 1182);
  ctx.restore();
}

function drawTownHallCostPatch(ctx, game) {
  const village = game.state.villageDevelopment || {};
  if (village.townHallBuilt) return;
  ctx.save();
  ctx.fillStyle = '#9fd18f';
  ctx.fillRect(900, 1138, 220, 25);
  ctx.fillStyle = '#315748';
  ctx.font = '700 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('마을회관 건설터 · 나무6 돌5', 1010, 1153);
  ctx.restore();
}

function drawHospitalStatus(ctx, game) {
  ctx.save();
  ctx.fillStyle = '#315748';
  ctx.font = '700 10px system-ui';
  ctx.textAlign = 'center';
  const cool = Math.max(0, Math.ceil((Number(game.state.hospitalCooldownUntil) - Date.now()) / 1000));
  ctx.fillText(cool > 0 ? `더블탭 치료 · ${cool}초` : '더블탭 치료 · 50골드', HOSPITAL.x, HOSPITAL.y + 58);
  ctx.restore();
}

function drawJungleObjects(ctx, game) {
  const jungle = ensureUpgradeState(game.state);
  if (!jungle.unlocked) return;
  const now = Date.now();
  ctx.save();
  ctx.textAlign = 'center';
  BIG_TREES.forEach((tree, index) => {
    const ready = jungle.treeReadyAt[index] <= now;
    if (!ready) {
      ctx.fillStyle = '#70543a';
      ctx.fillRect(tree.x - 14, tree.y + 18, 28, 22);
      ctx.font = '11px system-ui'; ctx.fillStyle = '#244d2d'; ctx.fillText('다시 자라는 중', tree.x, tree.y + 58);
      return;
    }
    ctx.fillStyle = '#65472f';
    ctx.fillRect(tree.x - 11, tree.y - 5, 22, 70);
    ctx.fillStyle = '#2f6f3b';
    ctx.beginPath(); ctx.arc(tree.x, tree.y - 34, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f8050';
    ctx.beginPath(); ctx.arc(tree.x - 30, tree.y - 18, 34, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tree.x + 30, tree.y - 18, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#173e26';
    ctx.font = '800 11px system-ui';
    ctx.fillText('큰 나무 · +3', tree.x, tree.y + 83);
  });

  for (const boar of boars) {
    if (!boar.alive) continue;
    ctx.font = '38px system-ui';
    ctx.fillText('🐗', boar.x, boar.y + 12);
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(boar.x - 28, boar.y - 32, 56, 6);
    ctx.fillStyle = selectedBoarId === boar.id ? '#f0a43b' : '#b64a42';
    ctx.fillRect(boar.x - 28, boar.y - 32, 56 * Math.max(0, boar.hp / boar.maxHp), 6);
    ctx.fillStyle = '#54291f'; ctx.font = '800 11px system-ui'; ctx.fillText('멧돼지', boar.x, boar.y + 34);
    if (selectedBoarId === boar.id) {
      ctx.strokeStyle = '#f0a43b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(boar.x, boar.y, 34, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

setupJungleUnlockButton();
document.querySelector('#healingCenterButton')?.remove();
setInterval(worldTick, 50);
