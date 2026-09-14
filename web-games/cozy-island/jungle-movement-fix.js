import { IslandRendererV3 } from './render-v3.js';

const KEY_TO_DIR = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right'
};

let currentGame = null;
let paused = false;
let lastFrame = performance.now();
const held = new Set();

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithUnifiedMovement(game) {
  currentGame = game;
  originalDraw.call(this, game);
};

function jungleUnlocked() {
  return Boolean(currentGame?.state?.southernJungle?.unlocked);
}

function northUnlocked() {
  return Boolean(currentGame?.state?.northernRegion?.unlocked);
}

function westUnlocked() {
  return Boolean(currentGame?.state?.westernRegion?.unlocked);
}

function eastUnlocked() {
  return Boolean(currentGame?.state?.expanded);
}

function blockedOnMainIsland(x, y) {
  if (y > 1025 || y < 160) return false;
  const pond = Math.pow((x - 390) / 150, 2) + Math.pow((y - 370) / 112, 2) < 1;
  if (pond) return true;
  return x > 635 && x < 900 && y > 170 && y < 415;
}

function inMainVillage(x, y) {
  if (x < 120 || x > 1360 || y < 160 || y > 1155) return false;
  return !blockedOnMainIsland(x, y);
}

function inEast(x, y) {
  return eastUnlocked() && x >= 1300 && x <= 2820 && y >= 160 && y <= 1025;
}

function inJungle(x, y) {
  return jungleUnlocked() && x >= 1435 && x <= 2820 && y >= 980 && y <= 2025;
}

function inNorth(x, y) {
  return northUnlocked() && x >= 1435 && x <= 2820 && y >= -820 && y <= 220;
}

function inWest(x, y) {
  return westUnlocked() && x >= -2650 && x <= 160 && y >= 160 && y <= 1100;
}

function canStandAt(x, y) {
  return inMainVillage(x, y) || inEast(x, y) || inJungle(x, y) || inNorth(x, y) || inWest(x, y);
}

function baseCandidate(x, y) {
  let px = Math.max(120, Math.min(1360, x));
  let py = Math.max(160, Math.min(1155, y));
  if (blockedOnMainIsland(px, py)) {
    if (px > 635 && px < 900 && py > 170 && py < 415) py = 430;
    else py = Math.max(500, py);
  }
  return { x: px, y: py };
}

function eastCandidate(x, y) {
  return { x: Math.max(1300, Math.min(2820, x)), y: Math.max(160, Math.min(1025, y)) };
}

function jungleCandidate(x, y) {
  return { x: Math.max(1435, Math.min(2820, x)), y: Math.max(980, Math.min(2025, y)) };
}

function northCandidate(x, y) {
  return { x: Math.max(1435, Math.min(2820, x)), y: Math.max(-820, Math.min(220, y)) };
}

function westCandidate(x, y) {
  return { x: Math.max(-2650, Math.min(160, x)), y: Math.max(160, Math.min(1100, y)) };
}

function recoverInvalidPosition(player) {
  if (canStandAt(player.x, player.y)) return;
  const candidates = [baseCandidate(player.x, player.y)];
  if (eastUnlocked()) candidates.push(eastCandidate(player.x, player.y));
  if (jungleUnlocked()) candidates.push(jungleCandidate(player.x, player.y));
  if (northUnlocked()) candidates.push(northCandidate(player.x, player.y));
  if (westUnlocked()) candidates.push(westCandidate(player.x, player.y));

  let best = candidates[0];
  let bestDistance = Infinity;
  for (const point of candidates) {
    if (!canStandAt(point.x, point.y)) continue;
    const d = Math.hypot(point.x - player.x, point.y - player.y);
    if (d < bestDistance) {
      best = point;
      bestDistance = d;
    }
  }
  player.x = best.x;
  player.y = best.y;
}

window.addEventListener('keydown', event => {
  const dir = KEY_TO_DIR[event.code];
  if (!dir) return;
  held.add(dir);
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('keyup', event => {
  const dir = KEY_TO_DIR[event.code];
  if (!dir) return;
  held.delete(dir);
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('blur', () => held.clear());
window.addEventListener('jaewoon:pause', event => {
  paused = Boolean(event.detail?.paused);
  if (paused) held.clear();
});

function movementFrame(now) {
  const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  if (currentGame && held.size && !paused && !document.hidden && !document.querySelector('dialog[open]')) {
    const player = currentGame.player;
    recoverInvalidPosition(player);

    let dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    let dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    if (dx || dy) {
      const mag = Math.hypot(dx, dy) || 1;
      dx /= mag;
      dy /= mag;
      const speed = Number(player.speed) || 185;

      const nextX = player.x + dx * speed * dt;
      if (canStandAt(nextX, player.y)) player.x = nextX;

      const nextY = player.y + dy * speed * dt;
      if (canStandAt(player.x, nextY)) player.y = nextY;
    }
  }

  requestAnimationFrame(movementFrame);
}
requestAnimationFrame(movementFrame);
