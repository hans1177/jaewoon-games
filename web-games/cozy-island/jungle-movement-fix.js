import { IslandRendererV3 } from './render-v3.js';

const KEY_TO_DIR = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right'
};
const DIR_TO_CODE = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const BOAR_POINTS = [
  { x: 1650, y: 1530 }, { x: 2050, y: 1870 },
  { x: 2420, y: 1490 }, { x: 2690, y: 1810 }
];

let currentGame = null;
let paused = false;
let ownsEasternMovement = false;
let lastFrame = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
const held = new Set();

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithJungleMovementFix(game) {
  currentGame = game;
  originalDraw.call(this, game);
};

function isBridgeEvent(event) {
  return Boolean(event.__cozyMovementBridge);
}

function bridgeEvent(type, code) {
  const event = new KeyboardEvent(type, { code, key: code, bubbles: true });
  try { Object.defineProperty(event, '__cozyMovementBridge', { value: true }); } catch {}
  window.dispatchEvent(event);
}

function clearDownstreamDirectionState() {
  for (const code of Object.values(DIR_TO_CODE)) bridgeEvent('keyup', code);
}

function handBackToCore() {
  ownsEasternMovement = false;
  for (const dir of held) bridgeEvent('keydown', DIR_TO_CODE[dir]);
}

function shouldOwnMovement() {
  return Boolean(currentGame?.state?.expanded && currentGame?.player && currentGame.player.x >= 1360);
}

window.addEventListener('keydown', event => {
  if (isBridgeEvent(event)) return;
  const dir = KEY_TO_DIR[event.code];
  if (!dir) return;
  held.add(dir);
  if (!shouldOwnMovement() && !ownsEasternMovement) return;
  if (!ownsEasternMovement) {
    ownsEasternMovement = true;
    clearDownstreamDirectionState();
  }
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('keyup', event => {
  if (isBridgeEvent(event)) return;
  const dir = KEY_TO_DIR[event.code];
  if (!dir) return;
  held.delete(dir);
  if (!ownsEasternMovement) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (held.size === 0 && currentGame?.player?.x < 1360) ownsEasternMovement = false;
}, true);

window.addEventListener('blur', () => {
  held.clear();
  ownsEasternMovement = false;
});
window.addEventListener('jaewoon:pause', event => { paused = Boolean(event.detail?.paused); });

function jungleUnlocked() {
  return Boolean(currentGame?.state?.southernJungle?.unlocked);
}

function canMoveEast(x, y) {
  if (x < 1300 || x > 2820 || y < 160) return false;
  if (y <= 1025) return true;
  if (!jungleUnlocked()) return false;
  return x >= 1435 && x <= 2820 && y <= 2025;
}

function movementFrame(now) {
  const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  if (currentGame && !paused && !document.hidden && !document.querySelector('dialog[open]')) {
    if (shouldOwnMovement() && !ownsEasternMovement && held.size > 0) {
      ownsEasternMovement = true;
      clearDownstreamDirectionState();
    }

    if (ownsEasternMovement && held.size > 0) {
      const player = currentGame.player;
      let dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      let dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      if (dx || dy) {
        const mag = Math.hypot(dx, dy) || 1;
        dx /= mag; dy /= mag;
        const speed = Number(player.speed) || 185;
        const nx = player.x + dx * speed * dt;
        const ny = player.y + dy * speed * dt;
        if (canMoveEast(nx, player.y)) player.x = nx;
        if (canMoveEast(player.x, ny)) player.y = ny;
      }

      // 동쪽에서 마을로 돌아올 때 기본 이동 시스템에 키 상태를 정상 인계한다.
      if (player.x < 1350 && player.y <= 1025) handBackToCore();
    }
  }

  requestAnimationFrame(movementFrame);
}
requestAnimationFrame(movementFrame);

function livingTroopCount() {
  return (currentGame?.allies || []).filter(unit => unit?.hp > 0 && ['soldier', 'archer', 'knight'].includes(unit.kind)).length;
}

function screenToWorld(sx, sy) {
  if (!currentGame?.player) return null;
  return {
    x: sx + currentGame.player.x - window.innerWidth / 2,
    y: sy + currentGame.player.y - window.innerHeight / 2
  };
}

function blockEmptyArmyBoarCommand(sx, sy) {
  if (!currentGame?.state?.southernJungle?.unlocked || livingTroopCount() > 0) return false;
  const point = screenToWorld(sx, sy);
  if (!point) return false;
  const hit = BOAR_POINTS.some(boar => Math.hypot(point.x - boar.x, point.y - boar.y) <= 58);
  if (!hit) return false;
  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = '🐗 출동할 병력이 없어';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }
  return true;
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => {
  if (!blockEmptyArmyBoarCommand(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  const isDouble = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
  lastTap = { time: now, x: event.clientX, y: event.clientY };
  if (!isDouble || !blockEmptyArmyBoarCommand(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
