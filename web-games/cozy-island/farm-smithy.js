import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const SEED_DEPOT = { x: 835, y: 505 };
const SMITHY = { x: 790, y: 1080, radius: 115 };
const RECIPES = {
  soldierStoneSword: {
    label: '⚔️ 병사 돌검', kind: 'soldier', wolfHide: 2, wood: 1, stone: 2,
    attack: 15, hp: 0, desc: '모든 병사 데미지 +15'
  },
  archerWoodBow: {
    label: '🏹 궁수 나무 활', kind: 'archer', wolfHide: 2, wood: 4, stone: 0,
    attack: 20, hp: 30, desc: '모든 궁수 데미지 +20 · 체력 +30'
  },
  knightStoneSpear: {
    label: '🛡️ 기사 돌 창', kind: 'knight', boarHorn: 2, wood: 3, stone: 2,
    attack: 20, hp: 30, desc: '모든 기사 데미지 +20 · 체력 +30'
  }
};

let currentGame = null;
let activeRuntime = null;
let lastFarmTick = performance.now();
let lastUiPatch = 0;
const wolfAlive = new Map();
const boarAlive = new Map();

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function workerNumber(value) {
  if (value && typeof value === 'object') return Math.max(0, Math.floor(Number(value.count) || 0));
  return Math.max(0, Math.floor(Number(value) || 0));
}

function totalWorkers(state) {
  const production = state?.productionBuildings || {};
  const assigned = (production.lumberWorker ? 1 : 0) + (production.mineWorker ? 1 : 0);
  const savedTotal = Math.max(0, Math.floor(Number(state?.workerTotal) || 0));
  return Math.max(savedTotal, workerNumber(state?.workers) + assigned);
}

function ensureFeatureState(state) {
  if (!state || typeof state !== 'object') return null;
  state.inventory ||= {};
  state.inventory.wolfHide = Math.max(0, Math.floor(Number(state.inventory.wolfHide) || 0));
  state.inventory.boarHorn = Math.max(0, Math.floor(Number(state.inventory.boarHorn) || 0));

  const oldDepot = state.seedDepot && typeof state.seedDepot === 'object' ? state.seedDepot : {};
  state.seedDepot = oldDepot;
  state.seedDepot.built = Boolean(oldDepot.built);
  state.seedDepot.seeds = Math.max(0, Math.floor(Number(oldDepot.seeds) || 0));

  const oldSmithy = state.smithy && typeof state.smithy === 'object' ? state.smithy : {};
  state.smithy = oldSmithy;
  state.smithy.crafted ||= {};
  for (const key of Object.keys(RECIPES)) state.smithy.crafted[key] = Boolean(state.smithy.crafted[key]);

  if (totalWorkers(state) > 0 && !state.seedDepot.built) state.seedDepot.built = true;
  if (state.seedDepot.built) {
    const looseSeeds = Math.max(0, Math.floor(Number(state.inventory.seeds) || 0));
    if (looseSeeds > 0) {
      state.seedDepot.seeds += looseSeeds;
      state.inventory.seeds = 0;
    }
  }
  return state;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithFarmSmithy(fallback = {}) {
  const state = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureFeatureState(state);
  return state;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithFarmSmithy(state, delay) {
  activeRuntime = this;
  ensureFeatureState(state);
  return originalQueueSaveProgress.call(this, state, delay);
};

function save() {
  if (!currentGame?.state) return;
  ensureFeatureState(currentGame.state);
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

function applyGear(unit, key, recipe) {
  if (!unit || unit.enemy || unit.kind !== recipe.kind) return;
  unit.__cozyGear ||= {};
  if (unit.__cozyGear[key]) return;
  unit.attack = (Number(unit.attack) || 0) + recipe.attack;
  if (recipe.hp) {
    unit.maxHp = (Number(unit.maxHp) || 0) + recipe.hp;
    unit.hp = Math.min(unit.maxHp, (Number(unit.hp) || 0) + recipe.hp);
  }
  unit.__cozyGear[key] = true;
}

function applyAllGear() {
  if (!currentGame) return;
  const state = ensureFeatureState(currentGame.state);
  for (const [key, recipe] of Object.entries(RECIPES)) {
    if (!state.smithy.crafted[key]) continue;
    for (const unit of currentGame.allies || []) applyGear(unit, key, recipe);
  }
}

function autoFarm() {
  if (!currentGame || activeRuntime?.paused || document.hidden || document.querySelector('dialog[open]')) return;
  const state = ensureFeatureState(currentGame.state);
  if (!state.seedDepot.built || workerNumber(state.workers) <= 0 || state.seedDepot.seeds <= 0) return;
  let planted = 0;
  for (const plot of state.plots || []) {
    if (state.seedDepot.seeds <= 0) break;
    if (!plot || plot.state !== 'empty') continue;
    state.seedDepot.seeds--;
    plot.state = 'growing';
    plot.watered = false;
    plot.wateredAt = 0;
    plot.ready = false;
    planted++;
  }
  if (planted) save();
}

function trackDrops() {
  if (!currentGame) return;
  const state = ensureFeatureState(currentGame.state);
  let changed = false;

  for (const wolf of currentGame.wolves || []) {
    const key = String(wolf.id);
    const alive = Boolean(wolf.alive && wolf.hp > 0);
    if (!wolfAlive.has(key)) wolfAlive.set(key, alive);
    else {
      const wasAlive = wolfAlive.get(key);
      if (wasAlive && !alive) {
        state.inventory.wolfHide++;
        changed = true;
        toast(`🐺 늑대가죽 +1 · 현재 ${state.inventory.wolfHide}개`);
      }
      wolfAlive.set(key, alive);
    }
  }

  for (const boar of currentGame.boars || []) {
    const key = String(boar.id);
    const alive = Boolean(boar.alive && boar.hp > 0);
    if (!boarAlive.has(key)) boarAlive.set(key, alive);
    else {
      const wasAlive = boarAlive.get(key);
      if (wasAlive && !alive) {
        state.inventory.boarHorn++;
        changed = true;
        toast(`🐗 멧돼지 뿔 +1 · 현재 ${state.inventory.boarHorn}개`);
      }
      boarAlive.set(key, alive);
    }
  }
  if (changed) save();
}

function recipeCostText(recipe) {
  const parts = [];
  if (recipe.wolfHide) parts.push(`늑대가죽 ${recipe.wolfHide}`);
  if (recipe.boarHorn) parts.push(`멧돼지 뿔 ${recipe.boarHorn}`);
  if (recipe.wood) parts.push(`나무 ${recipe.wood}`);
  if (recipe.stone) parts.push(`돌 ${recipe.stone}`);
  return parts.join(' · ');
}

function canCraft(state, recipe) {
  const inv = state.inventory;
  return (inv.wolfHide || 0) >= (recipe.wolfHide || 0)
    && (inv.boarHorn || 0) >= (recipe.boarHorn || 0)
    && (inv.wood || 0) >= (recipe.wood || 0)
    && (inv.stone || 0) >= (recipe.stone || 0);
}

function spendRecipe(state, recipe) {
  const inv = state.inventory;
  inv.wolfHide -= recipe.wolfHide || 0;
  inv.boarHorn -= recipe.boarHorn || 0;
  inv.wood -= recipe.wood || 0;
  inv.stone -= recipe.stone || 0;
}

function craft(key) {
  if (!currentGame) return;
  const state = ensureFeatureState(currentGame.state);
  const recipe = RECIPES[key];
  if (!recipe || state.smithy.crafted[key]) return;
  if (!canCraft(state, recipe)) {
    toast(`⚒️ 재료 부족 · ${recipeCostText(recipe)}`);
    return;
  }
  spendRecipe(state, recipe);
  state.smithy.crafted[key] = true;
  applyAllGear();
  save();
  renderSmithyPanel();
  toast(`${recipe.label} 제작 완료 · ${recipe.desc}`);
}

function renderSmithyPanel() {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!panel || !title || !body) return;
  const state = ensureFeatureState(currentGame.state);
  const inv = state.inventory;
  title.textContent = '강화 대장간';
  body.innerHTML = `
    <div class="inventory-grid">
      <div class="item-card">🐺 늑대가죽<span>${inv.wolfHide}개</span></div>
      <div class="item-card">🐗 멧돼지 뿔<span>${inv.boarHorn}개</span></div>
      <div class="item-card">🪵 나무<span>${Math.floor(Number(inv.wood)||0)}개</span></div>
      <div class="item-card">🪨 돌<span>${Math.floor(Number(inv.stone)||0)}개</span></div>
    </div>
    <div class="choice-grid" style="margin-top:10px">
      ${Object.entries(RECIPES).map(([key, recipe]) => {
        const done = state.smithy.crafted[key];
        return `<button class="choice" data-smithy-craft="${key}" ${done ? 'disabled' : ''}>
          <span>${recipe.label}<small style="display:block">${recipe.desc}</small></span>
          <b>${done ? '제작 완료' : recipeCostText(recipe)}</b>
        </button>`;
      }).join('')}
    </div>`;
  body.querySelectorAll('[data-smithy-craft]').forEach(button => {
    button.addEventListener('click', () => craft(button.dataset.smithyCraft));
  });
}

function setupSmithyButton() {
  if (document.querySelector('#smithyButton')) return;
  const button = document.createElement('button');
  button.id = 'smithyButton';
  button.type = 'button';
  button.textContent = '⚒️ 강화 대장간';
  button.style.cssText = 'position:absolute;left:50%;bottom:95px;transform:translateX(-50%);z-index:12;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('click', () => {
    const panel = document.querySelector('#panel');
    if (!panel || panel.open) return;
    renderSmithyPanel();
    panel.showModal();
  });
  document.querySelector('#app')?.appendChild(button);
}

function updateSmithyButton() {
  const button = document.querySelector('#smithyButton');
  if (!button || !currentGame) return;
  const near = Math.hypot(currentGame.player.x - SMITHY.x, currentGame.player.y - SMITHY.y) <= SMITHY.radius;
  const show = near && !document.querySelector('dialog[open]');
  const next = show ? 'block' : 'none';
  if (button.style.display !== next) button.style.display = next;
}

function patchPanels() {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const body = document.querySelector('#panelBody');
  const title = document.querySelector('#panelTitle')?.textContent || '';
  if (!panel?.open || !body) return;
  const state = ensureFeatureState(currentGame.state);

  if (title === '노비 판매소') {
    let note = body.querySelector('[data-seed-depot-status]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'panel-note';
      note.dataset.seedDepotStatus = '1';
      body.appendChild(note);
    }
    const text = state.seedDepot.built
      ? `🌱 씨앗 보관소 ${state.seedDepot.seeds}개 · 농사 노비가 자동으로 꺼내 심고 물을 줘. 수확물은 1분마다 지급.`
      : '노비를 1명 사면 씨앗 보관소가 자동으로 생겨.';
    if (note.textContent !== text) note.textContent = text;
  }

  if (title === '가방') {
    const grid = body.querySelector('.inventory-grid');
    if (grid) {
      let hide = grid.querySelector('[data-wolf-hide]');
      if (!hide) {
        hide = document.createElement('div');
        hide.className = 'item-card';
        hide.dataset.wolfHide = '1';
        grid.appendChild(hide);
      }
      const hideText = `🐺 늑대가죽<span>${state.inventory.wolfHide}개</span>`;
      if (hide.innerHTML !== hideText) hide.innerHTML = hideText;

      let horn = grid.querySelector('[data-boar-horn]');
      if (!horn) {
        horn = document.createElement('div');
        horn.className = 'item-card';
        horn.dataset.boarHorn = '1';
        grid.appendChild(horn);
      }
      const hornText = `🐗 멧돼지 뿔<span>${state.inventory.boarHorn}개</span>`;
      if (horn.innerHTML !== hornText) horn.innerHTML = hornText;

      if (state.seedDepot.built) {
        let seeds = grid.querySelector('[data-seed-depot-card]');
        if (!seeds) {
          seeds = document.createElement('div');
          seeds.className = 'item-card';
          seeds.dataset.seedDepotCard = '1';
          grid.appendChild(seeds);
        }
        const seedText = `🌱 보관소 씨앗<span>${state.seedDepot.seeds}개</span>`;
        if (seeds.innerHTML !== seedText) seeds.innerHTML = seedText;
      }
    }
  }
}

function systemTick() {
  const now = performance.now();
  lastFarmTick = now;
  if (!currentGame) return;
  ensureFeatureState(currentGame.state);
  applyAllGear();
  autoFarm();
  trackDrops();
  updateSmithyButton();
  if (now - lastUiPatch >= 400) {
    lastUiPatch = now;
    patchPanels();
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithFarmSmithy(game) {
  currentGame = game;
  ensureFeatureState(game.state);
  applyAllGear();
  originalDraw.call(this, game);
};

rendererProto.drawObjects = function drawFarmSmithyObjects(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const state = ensureFeatureState(game.state);
  if (state.seedDepot.built) drawSeedDepot(ctx, state.seedDepot.seeds);
  drawSmithy(ctx);
};

function drawSeedDepot(ctx, seeds) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cda86f';
  ctx.fillRect(SEED_DEPOT.x - 36, SEED_DEPOT.y - 30, 72, 58);
  ctx.fillStyle = '#8c6045';
  ctx.beginPath();
  ctx.moveTo(SEED_DEPOT.x - 44, SEED_DEPOT.y - 30);
  ctx.lineTo(SEED_DEPOT.x, SEED_DEPOT.y - 57);
  ctx.lineTo(SEED_DEPOT.x + 44, SEED_DEPOT.y - 30);
  ctx.closePath();
  ctx.fill();
  ctx.font = '25px system-ui';
  ctx.fillText('🌱', SEED_DEPOT.x, SEED_DEPOT.y + 8);
  ctx.fillStyle = '#315748';
  ctx.font = '800 10px system-ui';
  ctx.fillText(`씨앗 보관소 · ${seeds}`, SEED_DEPOT.x, SEED_DEPOT.y + 45);
  ctx.restore();
}

function drawSmithy(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#75675d';
  ctx.fillRect(SMITHY.x - 54, SMITHY.y - 44, 108, 76);
  ctx.fillStyle = '#4d4540';
  ctx.beginPath();
  ctx.moveTo(SMITHY.x - 66, SMITHY.y - 44);
  ctx.lineTo(SMITHY.x, SMITHY.y - 82);
  ctx.lineTo(SMITHY.x + 66, SMITHY.y - 44);
  ctx.closePath();
  ctx.fill();
  ctx.font = '31px system-ui';
  ctx.fillText('⚒️', SMITHY.x, SMITHY.y + 8);
  ctx.fillStyle = '#315748';
  ctx.font = '800 11px system-ui';
  ctx.fillText('강화 대장간', SMITHY.x, SMITHY.y + 51);
  ctx.restore();
}

setupSmithyButton();
setInterval(systemTick, 200);
