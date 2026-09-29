import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const KNIGHT_COST = 40;
const HOSPITAL = { x: 1215, y: 300 };
const BOSS_ID = 99;
const BOSS_HP = 1000;
const BOSS_ATTACK = 20;
const BITE_CHANCE = 0.20;
const BITE_DOT_TICKS = 3;
const BITE_DOT_DAMAGE = 10;
const CAVALRY_COUNT = 2;

let currentGame = null;
let knightsInitialized = false;
let lastRaidActive = false;
let lastBossCool = null;
let nextUnitId = 900000;
const bleeds = [];

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

JaewoonVibeRuntime.prototype.loadProgress = function loadProgressWithExpansion(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  const army = Array.isArray(progress?.army) ? progress.army : [];
  const savedKnights = Math.max(0, Math.floor(Number(progress?.knightCount) || 0));
  progress.knightCount = Math.max(savedKnights, army.filter(unit => unit?.kind === 'knight').length);
  progress.raidCycleCount = Math.max(0, Math.floor(Number(progress?.raidCycleCount) || 0));
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveProgressWithExpansion(progress, delay) {
  if (progress && typeof progress === 'object') {
    const army = Array.isArray(progress.army) ? progress.army : [];
    progress.knightCount = army.filter(unit => unit?.kind === 'knight').length;
    progress.raidCycleCount = Math.max(0, Math.floor(Number(progress.raidCycleCount) || 0));
  }
  return originalQueueSaveProgress.call(this, progress, delay);
};

function makeKnight(game) {
  return {
    id: nextUnitId++, kind: 'knight', enemy: false, boss: false,
    hp: 300, maxHp: 300, attack: 50, range: 55, speed: 70,
    cool: 0, wander: 0, vx: 0, vy: 0,
    x: game.barracks.x + (Math.random() - .5) * 70,
    y: game.barracks.y + 65 + Math.random() * 60
  };
}

function makeCavalry(index) {
  return {
    id: nextUnitId++, kind: 'cavalry', enemy: true, boss: false,
    hp: 600, maxHp: 600, attack: 30, range: 55, speed: 105,
    cool: index * .12, wander: 0, vx: 0, vy: 0,
    x: 1490 + index * 48, y: 520 + index * 135
  };
}

function makeWolfBoss() {
  return {
    id: BOSS_ID, boss: true, x: 2760, y: 300, homeX: 2760, homeY: 300,
    hp: BOSS_HP, maxHp: BOSS_HP, attack: BOSS_ATTACK, speed: 62,
    cool: 0, alive: true, respawnAt: 0, wander: 0, vx: 0, vy: 0
  };
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function ensureKnights(game) {
  if (knightsInitialized) return;
  knightsInitialized = true;
  const wanted = Math.max(0, Math.floor(Number(game.state.knightCount) || 0));
  const existing = game.allies.filter(unit => unit.kind === 'knight').length;
  for (let i = existing; i < wanted; i++) game.allies.push(makeKnight(game));
  game.state.army = game.allies.filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
}

function ensureWolfBoss(game) {
  if (!game.state.expanded || game.wolves.some(wolf => wolf.id === BOSS_ID)) return;
  game.wolves.push(makeWolfBoss());
  showToast('👑 동쪽 끝에 늑대 우두머리가 나타났어');
}

function processRaidCycle(game) {
  if (game.raidActive && !lastRaidActive) {
    game.state.raidCycleCount = Math.max(0, Math.floor(Number(game.state.raidCycleCount) || 0)) + 1;
    const fourth = game.state.raidCycleCount % 4 === 0;
    game.fourthRaid = fourth;
    if (fourth) {
      game.enemies.splice(0, game.enemies.length, ...Array.from({ length: CAVALRY_COUNT }, (_, i) => makeCavalry(i)));
      showToast('🐎 4번째 습격! 기마병이 돌격해 온다!');
    }
  }
  if (!game.raidActive && lastRaidActive) game.fourthRaid = false;
  lastRaidActive = game.raidActive;
}

function nearestSoldier(game, boss) {
  let best = null;
  let bestDistance = Infinity;
  for (const unit of game.allies) {
    if (unit.kind !== 'soldier' || unit.hp <= 0) continue;
    const distance = Math.hypot(unit.x - boss.x, unit.y - boss.y);
    if (distance < bestDistance) { best = unit; bestDistance = distance; }
  }
  return best;
}

function processBossBite(game) {
  const boss = game.wolves.find(wolf => wolf.id === BOSS_ID);
  if (!boss || !boss.alive || game.raidActive || game.selectedWolfId !== BOSS_ID) {
    lastBossCool = boss?.cool ?? null;
    return;
  }

  if (lastBossCool != null && boss.cool > lastBossCool + .45 && boss.cool > .7) {
    const target = nearestSoldier(game, boss);
    if (target && Math.random() < BITE_CHANCE) {
      target.hp -= BOSS_ATTACK;
      bleeds.push({ target, remaining: BITE_DOT_TICKS, nextAt: performance.now() + 1000 });
      showToast('🩸 늑대 우두머리 물어뜯기! 2배 피해 + 3초 출혈');
    }
  }
  lastBossCool = boss.cool;
}

function processBleeds() {
  const now = performance.now();
  for (let i = bleeds.length - 1; i >= 0; i--) {
    const bleed = bleeds[i];
    if (!bleed.target || bleed.target.hp <= 0) { bleeds.splice(i, 1); continue; }
    while (bleed.remaining > 0 && now >= bleed.nextAt) {
      bleed.target.hp -= BITE_DOT_DAMAGE;
      bleed.remaining--;
      bleed.nextAt += 1000;
    }
    if (bleed.remaining <= 0 || bleed.target.hp <= 0) bleeds.splice(i, 1);
  }
}

function updateRaidLabel(game) {
  if (!game.fourthRaid || !game.raidActive) return;
  const raid = document.querySelector('#raidText');
  if (raid) raid.textContent = `🐎 4번째 습격 · 기마병 ${game.enemies.filter(unit => unit.hp > 0).length}`;
}

function setupHealingButton() {
  if (document.querySelector('#healingCenterButton')) return;
  const button = document.createElement('button');
  button.id = 'healingCenterButton';
  button.type = 'button';
  button.textContent = '🏥 치유소 · 풀피 회복';
  button.style.cssText = 'position:absolute;left:50%;bottom:150px;transform:translateX(-50%);z-index:8;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.94);box-shadow:0 4px 14px rgba(31,69,57,.2);font-weight:900;color:#25423a;display:none;';
  button.addEventListener('click', () => {
    if (!currentGame) return;
    let healed = 0;
    for (const unit of currentGame.allies) {
      if (unit.hp > 0 && unit.hp < unit.maxHp) { unit.hp = unit.maxHp; healed++; }
    }
    showToast(healed ? `🏥 병력 ${healed}명 풀피 회복` : '🏥 이미 모두 풀피야');
  });
  document.querySelector('#app')?.appendChild(button);
}

function updateHealingButton(game) {
  const button = document.querySelector('#healingCenterButton');
  if (!button) return;
  const nearby = Math.hypot(game.player.x - HOSPITAL.x, game.player.y - HOSPITAL.y) <= 105;
  button.style.display = nearby ? 'block' : 'none';
}

function injectKnightRecruit() {
  if (!currentGame) return;
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!body || title?.textContent !== '병영' || !currentGame.state.barracksBuilt) return;
  if (body.querySelector('[data-knight-recruit]')) return;

  const grid = body.querySelector('.choice-grid') || body;
  const button = document.createElement('button');
  button.className = 'choice';
  button.dataset.knightRecruit = '1';
  button.innerHTML = `<span>🛡️ 기사 모집 (${currentGame.allies.filter(u => u.kind === 'knight' && u.hp > 0).length}명)</span><b>식량 ${KNIGHT_COST}</b>`;
  button.addEventListener('click', () => {
    const food = Number(currentGame.state.inventory.food) || 0;
    if (food < KNIGHT_COST) { showToast(`식량 ${KNIGHT_COST} 필요`); return; }
    currentGame.state.inventory.food = food - KNIGHT_COST;
    currentGame.allies.push(makeKnight(currentGame));
    currentGame.state.knightCount = currentGame.allies.filter(u => u.kind === 'knight' && u.hp > 0).length;
    currentGame.state.army = currentGame.allies.filter(u => u.hp > 0).map(u => ({ kind: u.kind }));
    showToast('🛡️ 기사 합류! 체력 300 · 공격력 50');
    button.querySelector('span').textContent = `🛡️ 기사 모집 (${currentGame.state.knightCount}명)`;
  });
  grid.appendChild(button);

  const note = document.createElement('p');
  note.className = 'panel-note';
  note.textContent = '기사는 병사 체력의 3배(300), 궁수 공격력의 2배(50)야.';
  body.appendChild(note);
}

const panelObserver = new MutationObserver(injectKnightRecruit);
panelObserver.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;
const originalDrawUnit = rendererProto.drawUnit;
const originalDrawWolf = rendererProto.drawWolf;

rendererProto.draw = function drawWithExpansion(game) {
  currentGame = game;
  ensureKnights(game);
  ensureWolfBoss(game);
  processRaidCycle(game);
  processBossBite(game);
  processBleeds();
  updateHealingButton(game);
  originalDraw.call(this, game);
  updateRaidLabel(game);
  injectKnightRecruit();
};

rendererProto.drawObjects = function drawObjectsWithHospital(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  ctx.save();
  ctx.fillStyle = '#d8eef0';
  ctx.fillRect(HOSPITAL.x - 52, HOSPITAL.y - 38, 104, 78);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(HOSPITAL.x - 12, HOSPITAL.y - 28, 24, 56);
  ctx.fillRect(HOSPITAL.x - 28, HOSPITAL.y - 12, 56, 24);
  ctx.fillStyle = '#315748';
  ctx.font = '700 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('치유소', HOSPITAL.x, HOSPITAL.y - 50);
  ctx.textAlign = 'start';
  ctx.restore();
};

rendererProto.drawUnit = function drawExpansionUnit(ctx, unit) {
  if (unit.kind !== 'knight' && unit.kind !== 'cavalry') return originalDrawUnit.call(this, ctx, unit);
  if (unit.hp <= 0) return;
  const icon = unit.kind === 'knight' ? '🛡️' : '🏇';
  const label = unit.kind === 'knight' ? '기사' : '기마병';
  const width = unit.kind === 'cavalry' ? 52 : 44;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = unit.kind === 'cavalry' ? '36px system-ui' : '31px system-ui';
  ctx.fillText(icon, unit.x, unit.y + 10);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(unit.x - width / 2, unit.y - 32, width, 6);
  ctx.fillStyle = unit.enemy ? '#c14f4f' : '#4f9a5d';
  ctx.fillRect(unit.x - width / 2, unit.y - 32, width * Math.max(0, unit.hp / unit.maxHp), 6);
  ctx.fillStyle = unit.enemy ? '#7d2222' : '#244d2d';
  ctx.font = '700 10px system-ui';
  ctx.fillText(label, unit.x, unit.y + 30);
  ctx.restore();
};

rendererProto.drawWolf = function drawBossWolf(ctx, wolf, selected) {
  if (!wolf.boss) return originalDrawWolf.call(this, ctx, wolf, selected);
  if (!wolf.alive) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '22px system-ui';
  ctx.fillText('👑', wolf.x, wolf.y - 24);
  ctx.font = '48px system-ui';
  ctx.fillText('🐺', wolf.x, wolf.y + 18);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(wolf.x - 42, wolf.y - 42, 84, 7);
  ctx.fillStyle = selected ? '#f0a43b' : '#9f3333';
  ctx.fillRect(wolf.x - 42, wolf.y - 42, 84 * Math.max(0, wolf.hp / wolf.maxHp), 7);
  ctx.fillStyle = '#6f2222';
  ctx.font = '800 12px system-ui';
  ctx.fillText('늑대 우두머리', wolf.x, wolf.y + 43);
  if (selected) {
    ctx.strokeStyle = '#f0a43b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(wolf.x, wolf.y, 42, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
};

setupHealingButton();
