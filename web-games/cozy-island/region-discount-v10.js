import { IslandRendererV3 } from './render-v3.js';

const STORAGE_KEY = 'jaewoon-games:cozy-island';
const NORTH_GATE = { x: 2170, y: 175, radius: 145, cost: 100 };
const WEST_GATE = { x: 145, y: 600, radius: 150, cost: 150 };
let currentGame = null;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function northState() {
  if (!currentGame?.state) return null;
  currentGame.state.northernRegion ||= {};
  currentGame.state.northernRegion.unlocked = Boolean(currentGame.state.northernRegion.unlocked);
  return currentGame.state.northernRegion;
}

function westState() {
  if (!currentGame?.state) return null;
  currentGame.state.cozyExpansionV4 ||= {};
  currentGame.state.cozyExpansionV4.west ||= {};
  currentGame.state.cozyExpansionV4.west.unlocked = Boolean(currentGame.state.cozyExpansionV4.west.unlocked);
  return currentGame.state.cozyExpansionV4.west;
}

function nearNorth() {
  const north = northState();
  return Boolean(currentGame?.state?.expanded && north && !north.unlocked && distance(currentGame.player, NORTH_GATE) <= NORTH_GATE.radius);
}

function nearWest() {
  const west = westState();
  return Boolean(currentGame && west && !west.unlocked && distance(currentGame.player, WEST_GATE) <= WEST_GATE.radius);
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function persistNow() {
  if (!currentGame?.state) return;
  try {
    const root = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    root.progress = currentGame.state;
    root.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {}
  const coins = document.querySelector('#coinText');
  if (coins) coins.textContent = String(Math.floor(Number(currentGame.state.coins) || 0));
}

function unlockNorthDiscounted() {
  if (!currentGame?.state?.expanded) return toast('먼저 동쪽 지역을 열어야 해');
  const north = northState();
  if (!north || north.unlocked) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < NORTH_GATE.cost) return toast('북쪽 지역 해금에는 100골드가 필요해');
  currentGame.state.coins = coins - NORTH_GATE.cost;
  north.unlocked = true;
  persistNow();
  patchUI();
  toast('🧭 북쪽 지역 해금 · 100골드');
}

function unlockWestDiscounted() {
  const west = westState();
  if (!west || west.unlocked) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < WEST_GATE.cost) return toast('서쪽 지역 해금에는 150골드가 필요해');
  currentGame.state.coins = coins - WEST_GATE.cost;
  west.unlocked = true;
  persistNow();
  patchUI();
  toast('🌄 서쪽 지역 해금 · 150골드');
}

function handleActionTarget(target) {
  if (!currentGame || !target) return false;
  const northButton = target.closest?.('#northUnlockButton');
  if (northButton) {
    unlockNorthDiscounted();
    return true;
  }
  const westButton = target.closest?.('#westUnlockButton');
  if (westButton) {
    unlockWestDiscounted();
    return true;
  }
  if (target.closest?.('#actionButton')) {
    if (nearNorth()) {
      unlockNorthDiscounted();
      return true;
    }
    if (nearWest()) {
      unlockWestDiscounted();
      return true;
    }
  }
  return false;
}

// 이 모듈을 북쪽/서쪽 기존 모듈보다 먼저 로드해서 기존 200/300골드 핸들러보다 먼저 차단한다.
window.addEventListener('pointerdown', event => {
  if (!handleActionTarget(event.target)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('click', event => {
  if (!handleActionTarget(event.target)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || !currentGame) return;
  if (nearNorth()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockNorthDiscounted();
  } else if (nearWest()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockWestDiscounted();
  }
}, true);

function patchUI() {
  if (!currentGame) return;
  const northButton = document.querySelector('#northUnlockButton');
  if (northButton && northButton.textContent !== '🧭 북쪽 지역 해금 · 100골드') {
    northButton.textContent = '🧭 북쪽 지역 해금 · 100골드';
  }
  const westButton = document.querySelector('#westUnlockButton');
  if (westButton && westButton.textContent !== '🌄 서쪽 지역 해금 · 150골드') {
    westButton.textContent = '🌄 서쪽 지역 해금 · 150골드';
  }
  const hint = document.querySelector('#hint');
  if (hint) {
    if (nearNorth()) hint.textContent = '행동: 북쪽 지역 해금 · 100골드';
    else if (nearWest()) hint.textContent = '행동: 서쪽 지역 해금 · 150골드';
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithRegionDiscountV10(game) {
  currentGame = game;
  const result = originalDraw.call(this, game);
  patchUI();
  return result;
};

setInterval(patchUI, 80);
