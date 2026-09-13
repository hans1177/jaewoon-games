import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const TOWER = { x: 400, y: 1090, wood: 6, stone: 5, radius: 115 };
const TOWN_HALL = { x: 1010, y: 1090, wood: 12, stone: 10, radius: 125 };
const VILLAGE = { minX: 120, maxX: 1360, baseY: 1018, maxY: 1155 };
const TOWER_RANGE = 700;
const TOWER_DAMAGE = 18;
const TOWER_COOLDOWN = 1.2;

let currentGame = null;
let activeRuntime = null;
let towerTimer = 0;
let lastTick = performance.now();
let lastMoveTick = performance.now();
let towerShot = null;
const pressed = new Set();

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureVillage(state) {
  if (!state || typeof state !== 'object') return null;
  const old = state.villageDevelopment && typeof state.villageDevelopment === 'object' ? state.villageDevelopment : {};
  state.villageDevelopment = {
    defenseTowerBuilt: Boolean(old.defenseTowerBuilt),
    townHallBuilt: Boolean(old.townHallBuilt)
  };
  return state.villageDevelopment;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithVillage(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureVillage(progress);
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithVillage(progress, delay) {
  activeRuntime = this;
  ensureVillage(progress);
  return originalQueueSaveProgress.call(this, progress, delay);
};

function saveState() {
  if (!currentGame?.state) return;
  ensureVillage(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function setupBuildButton() {
  if (document.querySelector('#villageBuildButton')) return;
  const button = document.createElement('button');
  button.id = 'villageBuildButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:260px;transform:translateX(-50%);z-index:10;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('click', () => {
    if (!currentGame) return;
    if (button.dataset.kind === 'tower') buildTower();
    if (button.dataset.kind === 'hall') buildTownHall();
  });
  document.querySelector('#app')?.appendChild(button);
}

function updateBuildButton() {
  const button = document.querySelector('#villageBuildButton');
  if (!button || !currentGame) return;
  const village = ensureVillage(currentGame.state);
  const player = currentGame.player;
  let kind = '';
  if (!village.defenseTowerBuilt && distance(player, TOWER) <= TOWER.radius) kind = 'tower';
  else if (!village.townHallBuilt && distance(player, TOWN_HALL) <= TOWN_HALL.radius) kind = 'hall';
  if (!kind) {
    button.style.display = 'none';
    button.dataset.kind = '';
    return;
  }
  button.style.display = 'block';
  button.dataset.kind = kind;
  button.textContent = kind === 'tower'
    ? '🗼 방어탑 건설 · 나무6 돌5'
    : '🏛️ 마을회관 건설 · 나무12 돌10';
}

function canPay(wood, stone) {
  const inv = currentGame?.state?.inventory;
  return inv && (Number(inv.wood) || 0) >= wood && (Number(inv.stone) || 0) >= stone;
}

function spend(wood, stone) {
  const inv = currentGame.state.inventory;
  inv.wood -= wood;
  inv.stone -= stone;
}

function buildTower() {
  if (!currentGame) return;
  const village = ensureVillage(currentGame.state);
  if (village.defenseTowerBuilt) return;
  if (!canPay(TOWER.wood, TOWER.stone)) {
    toast('방어탑 재료 부족 · 나무6 돌5');
    return;
  }
  spend(TOWER.wood, TOWER.stone);
  village.defenseTowerBuilt = true;
  saveState();
  updateBuildButton();
  toast('🗼 방어탑 완성 · 습격 적을 자동 공격해');
}

function buildTownHall() {
  if (!currentGame) return;
  const village = ensureVillage(currentGame.state);
  if (village.townHallBuilt) return;
  if (!canPay(TOWN_HALL.wood, TOWN_HALL.stone)) {
    toast('마을회관 재료 부족 · 나무12 돌10');
    return;
  }
  spend(TOWN_HALL.wood, TOWN_HALL.stone);
  village.townHallBuilt = true;
  saveState();
  updateBuildButton();
  toast('🏛️ 마을회관 완성 · 넓어진 마을의 중심이 생겼어');
}

function livingRaidEnemies() {
  return (currentGame?.enemies || []).filter(enemy => enemy && enemy.hp > 0);
}

function runTower(dt) {
  if (!currentGame?.state) return;
  const village = ensureVillage(currentGame.state);
  if (!village.defenseTowerBuilt || !currentGame.raidActive) {
    towerTimer = 0;
    return;
  }
  towerTimer += dt;
  if (towerTimer < TOWER_COOLDOWN) return;
  towerTimer %= TOWER_COOLDOWN;
  let target = null;
  let best = TOWER_RANGE;
  for (const enemy of livingRaidEnemies()) {
    const d = Math.hypot(enemy.x - TOWER.x, enemy.y - TOWER.y);
    if (d < best) {
      best = d;
      target = enemy;
    }
  }
  if (!target) return;
  target.hp -= TOWER_DAMAGE;
  towerShot = { x1: TOWER.x, y1: TOWER.y - 55, x2: target.x, y2: target.y, until: performance.now() + 180 };
}

function villageTick() {
  const now = performance.now();
  const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!document.hidden && !activeRuntime?.paused) runTower(dt);
  updateBuildButton();
  patchPanels();
}

function patchPanels() {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const body = document.querySelector('#panelBody');
  const title = document.querySelector('#panelTitle')?.textContent || '';
  if (!panel?.open || !body || title !== '가방') return;
  let note = body.querySelector('[data-village-status]');
  if (!note) {
    note = document.createElement('p');
    note.className = 'panel-note';
    note.dataset.villageStatus = '1';
    body.appendChild(note);
  }
  const village = ensureVillage(currentGame.state);
  note.textContent = `마을 시설 · 방어탑 ${village.defenseTowerBuilt ? '완성' : '미건설'} · 마을회관 ${village.townHallBuilt ? '완성' : '미건설'} · 남쪽 마을 구역 확장됨`;
}

function bindMovement() {
  const map = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
  };
  window.addEventListener('keydown', event => {
    const dir = map[event.code];
    if (dir) pressed.add(dir);
  });
  window.addEventListener('keyup', event => {
    const dir = map[event.code];
    if (dir) pressed.delete(dir);
  });
  window.addEventListener('blur', () => pressed.clear());
}

function runExtendedMovement() {
  const now = performance.now();
  const dt = Math.min(.05, Math.max(0, (now - lastMoveTick) / 1000));
  lastMoveTick = now;
  if (!currentGame || document.hidden || activeRuntime?.paused || document.querySelector('dialog[open]')) return;
  const p = currentGame.player;
  if (p.y < VILLAGE.baseY && !(pressed.has('down') && p.y >= VILLAGE.baseY - 8)) return;
  let dx = (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0);
  let dy = (pressed.has('down') ? 1 : 0) - (pressed.has('up') ? 1 : 0);
  if (!dx && !dy) return;
  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag;
  dy /= mag;
  const speed = 185;
  const nx = Math.max(VILLAGE.minX, Math.min(VILLAGE.maxX, p.x + dx * speed * dt));
  const ny = Math.max(VILLAGE.baseY - 5, Math.min(VILLAGE.maxY, p.y + dy * speed * dt));
  if (p.y > 1025 || dy > 0) {
    p.x = nx;
    p.y = ny;
  } else if (p.y > VILLAGE.baseY - 5 && dy < 0) {
    p.y = ny;
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithVillage(game) {
  currentGame = game;
  ensureVillage(game.state);
  originalDraw.call(this, game);
  updateBuildButton();
  patchPanels();
};

rendererProto.drawIsland = function drawIslandWithVillage(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  ctx.save();
  ctx.fillStyle = '#f2dfa8';
  this.rr(ctx, 75, 1000, 1330, 190, 68);
  ctx.fill();
  ctx.fillStyle = '#9fd18f';
  this.rr(ctx, 120, 1015, 1240, 145, 52);
  ctx.fill();
  ctx.fillStyle = '#d8c58f';
  ctx.fillRect(585, 1015, 160, 145);
  ctx.fillStyle = '#315748';
  ctx.font = '800 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('확장된 마을', 665, 1148);
  ctx.textAlign = 'start';
  ctx.restore();
};

rendererProto.drawObjects = function drawObjectsWithVillage(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const village = ensureVillage(game.state);
  drawDefenseTower(ctx, village.defenseTowerBuilt);
  drawTownHall(ctx, village.townHallBuilt);
  if (towerShot && towerShot.until > performance.now()) {
    ctx.save();
    ctx.strokeStyle = '#f3b33d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(towerShot.x1, towerShot.y1);
    ctx.lineTo(towerShot.x2, towerShot.y2);
    ctx.stroke();
    ctx.restore();
  }
};

function drawDefenseTower(ctx, built) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!built) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#687267';
    ctx.lineWidth = 3;
    ctx.strokeRect(TOWER.x - 52, TOWER.y - 48, 104, 86);
    ctx.setLineDash([]);
    ctx.font = '28px system-ui';
    ctx.fillText('🗼', TOWER.x, TOWER.y + 6);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('방어탑 건설터 · 나무6 돌5', TOWER.x, TOWER.y + 58);
  } else {
    ctx.fillStyle = '#84715c';
    ctx.fillRect(TOWER.x - 28, TOWER.y - 60, 56, 96);
    ctx.fillStyle = '#5d5144';
    ctx.fillRect(TOWER.x - 42, TOWER.y - 72, 84, 22);
    ctx.font = '30px system-ui';
    ctx.fillText('🏹', TOWER.x, TOWER.y - 52);
    ctx.fillStyle = '#315748';
    ctx.font = '800 11px system-ui';
    ctx.fillText('방어탑 · 자동 공격', TOWER.x, TOWER.y + 55);
  }
  ctx.restore();
}

function drawTownHall(ctx, built) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!built) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#687267';
    ctx.lineWidth = 3;
    ctx.strokeRect(TOWN_HALL.x - 78, TOWN_HALL.y - 50, 156, 92);
    ctx.setLineDash([]);
    ctx.font = '31px system-ui';
    ctx.fillText('🏛️', TOWN_HALL.x, TOWN_HALL.y + 7);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('마을회관 건설터 · 나무12 돌10', TOWN_HALL.x, TOWN_HALL.y + 61);
  } else {
    ctx.fillStyle = '#d6b77f';
    ctx.fillRect(TOWN_HALL.x - 76, TOWN_HALL.y - 35, 152, 76);
    ctx.fillStyle = '#8f6650';
    ctx.beginPath();
    ctx.moveTo(TOWN_HALL.x - 94, TOWN_HALL.y - 35);
    ctx.lineTo(TOWN_HALL.x, TOWN_HALL.y - 88);
    ctx.lineTo(TOWN_HALL.x + 94, TOWN_HALL.y - 35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#694a38';
    ctx.fillRect(TOWN_HALL.x - 16, TOWN_HALL.y + 3, 32, 38);
    ctx.font = '24px system-ui';
    ctx.fillText('🏛️', TOWN_HALL.x, TOWN_HALL.y - 13);
    ctx.fillStyle = '#315748';
    ctx.font = '800 12px system-ui';
    ctx.fillText('마을회관 · Lv.1', TOWN_HALL.x, TOWN_HALL.y + 61);
  }
  ctx.restore();
}

setupBuildButton();
bindMovement();
setInterval(villageTick, 100);
setInterval(runExtendedMovement, 16);
