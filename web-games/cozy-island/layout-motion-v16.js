import { IslandRendererV3 } from './render-v3.js';

const OLD_IRON_MINE = { x: 520, y: 1035, radius: 112 };
const IRON_MINE = { x: 1260, y: 1010, radius: 112 };
const BOUNTY_BOARD = { x: 520, y: 1035 };
const ATTACK_MS = 300;
const DEATH_MS = 760;

let currentGame = null;
const attackStates = new WeakMap();
let previousSoldiers = new Map();
const deathGhosts = [];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lv2() {
  return Boolean(currentGame?.state?.townHallExpansion?.upgraded);
}

function mineState(game = currentGame) {
  return game?.state?.ironWorkerV15 && typeof game.state.ironWorkerV15 === 'object'
    ? game.state.ironWorkerV15 : null;
}

function near(point, radius) {
  return Boolean(currentGame?.player && distance(currentGame.player, point) <= radius);
}

function withOldMinePosition(callback) {
  if (!currentGame?.player || typeof callback !== 'function') return false;
  const player = currentGame.player;
  const x = player.x;
  const y = player.y;
  player.x = OLD_IRON_MINE.x;
  player.y = OLD_IRON_MINE.y;
  try {
    return Boolean(callback());
  } finally {
    player.x = x;
    player.y = y;
  }
}

function installRelocatedMineApi() {
  const api = window.__cozyIronV15;
  if (!api || api.__v16Relocated) return;

  const originalHandleAction = typeof api.handleAction === 'function' ? api.handleAction.bind(api) : null;
  const originalHandleDouble = typeof api.handleDouble === 'function' ? api.handleDouble.bind(api) : null;
  const originalBlockWorkerPurchase = typeof api.blockWorkerPurchase === 'function'
    ? api.blockWorkerPurchase.bind(api) : null;

  api.handleAction = function relocatedHandleAction() {
    if (!currentGame) return false;

    // 예전 좌표는 현상금 게시판 전용으로 돌려준다.
    if (near(OLD_IRON_MINE, OLD_IRON_MINE.radius)) return false;

    // 새 좌표에서 기존 철 채굴장 로직을 그대로 실행해 저장 호환성을 유지한다.
    if (lv2() && near(IRON_MINE, IRON_MINE.radius)) {
      return withOldMinePosition(originalHandleAction);
    }

    // 정글 철 광맥 직접 채집은 기존 v15 로직을 그대로 사용한다.
    return originalHandleAction ? Boolean(originalHandleAction()) : false;
  };

  api.handleDouble = function relocatedHandleDouble(sx, sy) {
    if (!currentGame?.player || !lv2()) return false;
    const point = {
      x: sx + currentGame.player.x - innerWidth / 2,
      y: sy + currentGame.player.y - innerHeight / 2
    };

    if (Math.hypot(point.x - OLD_IRON_MINE.x, point.y - OLD_IRON_MINE.y) <= 82) return false;
    if (Math.hypot(point.x - IRON_MINE.x, point.y - IRON_MINE.y) <= 82) {
      const root = mineState();
      if (!root?.mineBuilt) return false;
      return withOldMinePosition(originalHandleAction);
    }
    return originalHandleDouble ? Boolean(originalHandleDouble(sx, sy)) : false;
  };

  api.blockWorkerPurchase = function relocatedWorkerGuard() {
    return originalBlockWorkerPurchase ? Boolean(originalBlockWorkerPurchase()) : false;
  };

  api.__v16Relocated = true;
  api.__v16OriginalHandleAction = originalHandleAction;
}

function mineLabel() {
  const root = mineState();
  if (!root) return '';
  if (!root.mineBuilt) return '⛏️ 철 채굴장 건설 · 나무4 돌3 철3';
  return root.mineWorker ? '🧑‍🌾 철 채굴장 노비 해제' : '🧑‍🌾 철 채굴장 노비 배치';
}

function patchMineUi() {
  installRelocatedMineApi();
  const button = document.querySelector('#ironV15ContextButton');
  if (!button || !currentGame) return;

  if (near(OLD_IRON_MINE, OLD_IRON_MINE.radius)) {
    button.style.display = 'none';
    return;
  }

  if (lv2() && near(IRON_MINE, IRON_MINE.radius)) {
    button.style.display = 'block';
    button.textContent = mineLabel();
    const hint = document.querySelector('#hint');
    if (hint) hint.textContent = mineLabel();
  }
}

function bindMineButton() {
  const button = document.querySelector('#ironV15ContextButton');
  if (!button || button.__v16Bound) return;
  button.__v16Bound = true;
  button.addEventListener('pointerdown', event => {
    if (!currentGame || !lv2() || !near(IRON_MINE, IRON_MINE.radius)) return;
    const api = window.__cozyIronV15;
    const original = api?.__v16OriginalHandleAction;
    if (!original) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    withOldMinePosition(original);
  }, { capture: true, passive: false });
}

function redrawBountyBoard(ctx) {
  // 예전 철 채굴장 그림을 지우고 현상금 게시판만 남긴다.
  ctx.save();
  ctx.fillStyle = '#9fd18f';
  ctx.fillRect(445, 955, 150, 100);
  ctx.fillStyle = '#f2dfa8';
  ctx.fillRect(445, 1055, 150, 52);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a633e';
  ctx.fillRect(BOUNTY_BOARD.x - 50, BOUNTY_BOARD.y - 44, 100, 70);
  ctx.fillStyle = '#6c4d31';
  ctx.fillRect(BOUNTY_BOARD.x - 43, BOUNTY_BOARD.y - 37, 86, 48);
  ctx.fillStyle = '#f5e8bf';
  ctx.fillRect(BOUNTY_BOARD.x - 35, BOUNTY_BOARD.y - 30, 70, 34);
  ctx.font = '25px system-ui';
  ctx.fillText('📜', BOUNTY_BOARD.x, BOUNTY_BOARD.y - 4);
  ctx.fillStyle = '#315748';
  ctx.font = '800 11px system-ui';
  ctx.fillText('현상금 게시판', BOUNTY_BOARD.x, BOUNTY_BOARD.y + 43);
  ctx.restore();
}

function drawRelocatedIronMine(ctx, game) {
  if (!game.state.townHallExpansion?.upgraded) return;
  const root = mineState(game);
  if (!root) return;

  ctx.save();
  ctx.textAlign = 'center';
  if (!root.mineBuilt) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#697377';
    ctx.lineWidth = 3;
    ctx.strokeRect(IRON_MINE.x - 58, IRON_MINE.y - 42, 116, 84);
    ctx.setLineDash([]);
    ctx.font = '29px system-ui';
    ctx.fillText('🏗️', IRON_MINE.x, IRON_MINE.y + 4);
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText('철 채굴장 · 나무4 돌3 철3', IRON_MINE.x, IRON_MINE.y + 56);
  } else {
    ctx.fillStyle = '#596367';
    ctx.fillRect(IRON_MINE.x - 58, IRON_MINE.y - 38, 116, 76);
    ctx.font = '34px system-ui';
    ctx.fillText('⛏️', IRON_MINE.x, IRON_MINE.y + 8);
    if (root.mineWorker) {
      const bob = Math.sin(performance.now() / 180) * 3;
      ctx.font = '23px system-ui';
      ctx.fillText('🧑‍🌾', IRON_MINE.x + 48, IRON_MINE.y + 10 + bob);
    }
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText(`철 채굴장 · ${Math.max(0, Number(root.mineRemaining) || 0)}/25 · ${root.mineWorker ? '노비 배치' : '노비 없음'}`, IRON_MINE.x, IRON_MINE.y + 55);
  }
  ctx.restore();
}

function unitSnapshot(unit) {
  return {
    x: Number(unit.x) || 0,
    y: Number(unit.y) || 0,
    enemy: Boolean(unit.enemy),
    boss: Boolean(unit.boss)
  };
}

function updateDeathGhosts(game) {
  const next = new Map();
  for (const unit of [...(game.allies || []), ...(game.enemies || [])]) {
    if (!unit || unit.kind !== 'soldier' || unit.hp <= 0) continue;
    next.set(unit, unitSnapshot(unit));
  }

  const now = performance.now();
  for (const [unit, snap] of previousSoldiers) {
    if (next.has(unit)) continue;
    deathGhosts.push({ ...snap, startedAt: now, side: snap.enemy ? -1 : 1 });
  }
  previousSoldiers = next;

  for (let i = deathGhosts.length - 1; i >= 0; i--) {
    if (now - deathGhosts[i].startedAt > DEATH_MS) deathGhosts.splice(i, 1);
  }
}

function drawDeathGhosts(ctx) {
  const now = performance.now();
  for (const ghost of deathGhosts) {
    const phase = Math.min(1, Math.max(0, (now - ghost.startedAt) / DEATH_MS));
    const ease = 1 - Math.pow(1 - phase, 2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - phase * .92);
    ctx.translate(ghost.x, ghost.y + ease * 14);
    ctx.rotate(ghost.side * ease * 1.35);
    ctx.textAlign = 'center';
    ctx.font = ghost.boss ? '42px system-ui' : '29px system-ui';
    ctx.fillText(ghost.boss ? '👹' : '⚔️', 0, 10);
    if (phase > .42) {
      ctx.globalAlpha *= .7;
      ctx.font = '17px system-ui';
      ctx.fillText('💨', -ghost.side * 20, 13);
    }
    ctx.restore();
  }
}

function attackState(unit) {
  let state = attackStates.get(unit);
  if (!state) {
    state = { lastCool: Number(unit.cool) || 0, startedAt: -Infinity };
    attackStates.set(unit, state);
  }
  const now = performance.now();
  const cool = Number(unit.cool) || 0;
  if (cool > state.lastCool + .22) state.startedAt = now;
  state.lastCool = cool;
  return state;
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawObjects = proto.drawObjects;
const originalDrawUnits = proto.drawUnits;
const originalDrawUnit = proto.drawUnit;

proto.draw = function drawWithRelocatedMineAndMotion(game) {
  currentGame = game;
  installRelocatedMineApi();
  const result = originalDraw.call(this, game);
  patchMineUi();
  bindMineButton();
  return result;
};

proto.drawObjects = function drawObjectsWithRelocatedMine(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  if (game.state.townHallExpansion?.upgraded) redrawBountyBoard(ctx);
  drawRelocatedIronMine(ctx, game);
};

proto.drawUnits = function drawUnitsWithDeathMotion(ctx, game) {
  updateDeathGhosts(game);
  const result = originalDrawUnits.call(this, ctx, game);
  drawDeathGhosts(ctx);
  return result;
};

proto.drawUnit = function drawUnitWithSoldierAttack(ctx, unit) {
  if (!unit || unit.kind !== 'soldier' || unit.hp <= 0) return originalDrawUnit.call(this, ctx, unit);

  const state = attackState(unit);
  const now = performance.now();
  const phase = Math.min(1, Math.max(0, (now - state.startedAt) / ATTACK_MS));
  if (phase >= 1) return originalDrawUnit.call(this, ctx, unit);

  const swing = Math.sin(phase * Math.PI);
  const side = unit.enemy ? -1 : 1;
  const lunge = swing * 9;

  ctx.save();
  ctx.translate(side * lunge, 0);
  ctx.translate(unit.x, unit.y);
  ctx.rotate(side * swing * .18);
  ctx.translate(-unit.x, -unit.y);
  originalDrawUnit.call(this, ctx, unit);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = unit.enemy ? 'rgba(193,79,79,.88)' : 'rgba(245,232,191,.95)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const cx = unit.x + side * (19 + lunge);
  const cy = unit.y - 1;
  if (side > 0) ctx.arc(cx, cy, 18, -.9, .85);
  else ctx.arc(cx, cy, 18, Math.PI - .85, Math.PI + .9);
  ctx.stroke();
  ctx.restore();
};

window.__cozyVisualFps = 32;
setInterval(() => {
  if (!currentGame) return;
  patchMineUi();
  bindMineButton();
}, 80);
