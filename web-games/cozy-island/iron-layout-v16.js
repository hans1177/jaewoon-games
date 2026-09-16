import { IslandRendererV3 } from './render-v3.js';

const OLD_MINE = { x: 520, y: 1035 };
const NEW_MINE = { x: 300, y: 1015, radius: 112 };
const BOARD = { x: 520, y: 1035 };
let currentGame = null;

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lv2() { return Boolean(currentGame?.state?.townHallExpansion?.upgraded); }
function root() { return currentGame?.state?.ironWorkerV15 || null; }

function withOldMinePosition(callback) {
  if (!currentGame?.player || typeof callback !== 'function') return false;
  const player = currentGame.player;
  const x = player.x, y = player.y;
  player.x = OLD_MINE.x;
  player.y = OLD_MINE.y;
  try { return Boolean(callback()); }
  finally { player.x = x; player.y = y; }
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - innerWidth / 2,
    y: sy + currentGame.player.y - innerHeight / 2
  };
}

function handleAction() {
  const api = window.__cozyIronV15;
  if (!api?.handleAction || !currentGame) return false;

  if (lv2() && dist(currentGame.player, NEW_MINE) <= NEW_MINE.radius) {
    return withOldMinePosition(() => api.handleAction());
  }

  // 예전 철 채굴장 자리는 현상금 게시판 전용으로 돌려준다.
  if (dist(currentGame.player, OLD_MINE) <= 140) return false;
  return Boolean(api.handleAction());
}

function handleDouble(sx, sy) {
  const api = window.__cozyIronV15;
  if (!api?.handleDouble || !currentGame) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;

  if (lv2() && Math.hypot(point.x - NEW_MINE.x, point.y - NEW_MINE.y) <= 76) {
    return withOldMinePosition(() => api.handleDouble(innerWidth / 2, innerHeight / 2));
  }
  if (Math.hypot(point.x - OLD_MINE.x, point.y - OLD_MINE.y) <= 86) return false;
  return Boolean(api.handleDouble(sx, sy));
}

function blockWorkerPurchase() {
  return Boolean(window.__cozyIronV15?.blockWorkerPurchase?.());
}

window.__cozyIronV16 = { handleAction, handleDouble, blockWorkerPurchase };

function mineLabel() {
  if (!lv2() || !currentGame || dist(currentGame.player, NEW_MINE) > NEW_MINE.radius) return '';
  const state = root();
  if (!state?.mineBuilt) return '⛏️ 철 채굴장 건설 · 나무4 돌3 철3';
  return state.mineWorker ? '🧑‍🌾 철 채굴장 노비 해제' : '🧑‍🌾 철 채굴장 노비 배치';
}

function setupButton() {
  if (document.querySelector('#ironV16ContextButton')) return;
  const button = document.createElement('button');
  button.id = 'ironV16ContextButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:24;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.97);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown', event => {
    if (!handleAction()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function updateUi() {
  setupButton();
  if (!currentGame) return;
  const label = mineLabel();
  const own = document.querySelector('#ironV16ContextButton');
  if (own) {
    own.style.display = label ? 'block' : 'none';
    if (label) own.textContent = label;
  }

  const old = document.querySelector('#ironV15ContextButton');
  if (old && dist(currentGame.player, OLD_MINE) <= 145) old.style.display = 'none';

  if (label) {
    const hint = document.querySelector('#hint');
    if (hint) hint.textContent = label;
  }
}

function redrawBountyBoard(ctx) {
  // 예전 채굴장 그림만 지운 뒤 원래 현상금 게시판을 다시 올린다.
  ctx.fillStyle = '#9fd18f';
  ctx.fillRect(448, 970, 144, 85);
  ctx.fillStyle = '#f2dfa8';
  ctx.fillRect(448, 1055, 144, 58);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a633e';
  ctx.fillRect(BOARD.x - 50, BOARD.y - 44, 100, 70);
  ctx.fillStyle = '#6c4d31';
  ctx.fillRect(BOARD.x - 43, BOARD.y - 37, 86, 48);
  ctx.fillStyle = '#f5e8bf';
  ctx.fillRect(BOARD.x - 35, BOARD.y - 30, 70, 34);
  ctx.font = '25px system-ui';
  ctx.fillText('📜', BOARD.x, BOARD.y - 4);
  ctx.fillStyle = '#315748';
  ctx.font = '800 11px system-ui';
  ctx.fillText('현상금 게시판', BOARD.x, BOARD.y + 43);
  ctx.restore();
}

function drawMovedMine(ctx, game) {
  if (!game.state.townHallExpansion?.upgraded) return;
  const state = game.state.ironWorkerV15 || {};
  ctx.save();
  ctx.textAlign = 'center';
  if (!state.mineBuilt) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#687267';
    ctx.lineWidth = 3;
    ctx.strokeRect(NEW_MINE.x - 62, NEW_MINE.y - 46, 124, 88);
    ctx.setLineDash([]);
    ctx.font = '29px system-ui';
    ctx.fillText('🏗️', NEW_MINE.x, NEW_MINE.y + 4);
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText('철 채굴장 · 나무4 돌3 철3', NEW_MINE.x, NEW_MINE.y + 56);
  } else {
    ctx.fillStyle = '#596367';
    ctx.fillRect(NEW_MINE.x - 58, NEW_MINE.y - 38, 116, 76);
    ctx.font = '34px system-ui';
    ctx.fillText('⛏️', NEW_MINE.x, NEW_MINE.y + 8);
    if (state.mineWorker) {
      ctx.font = '23px system-ui';
      ctx.fillText('🧑‍🌾', NEW_MINE.x + 48, NEW_MINE.y + 10);
    }
    ctx.fillStyle = '#315748';
    ctx.font = '800 10px system-ui';
    ctx.fillText(`철 채굴장 · ${Math.max(0, Number(state.mineRemaining) || 0)}/25 · ${state.mineWorker ? '노비 배치' : '노비 없음'}`, NEW_MINE.x, NEW_MINE.y + 55);
  }
  ctx.restore();
}

const proto = IslandRendererV3.prototype;
const originalDraw = proto.draw;
const originalDrawObjects = proto.drawObjects;

proto.draw = function drawWithIronLayoutV16(game) {
  currentGame = game;
  const result = originalDraw.call(this, game);
  updateUi();
  return result;
};

proto.drawObjects = function drawObjectsWithIronLayoutV16(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  if (game.state.townHallExpansion?.upgraded) redrawBountyBoard(ctx);
  drawMovedMine(ctx, game);
};

setupButton();
