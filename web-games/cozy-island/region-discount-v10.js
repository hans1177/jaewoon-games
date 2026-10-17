import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const NORTH_GATE = { x: 2170, y: 175, radius: 145, cost: 100 };
const WEST_GATE = { x: 145, y: 600, radius: 150, cost: 150 };
let currentGame = null;
let activeRuntime = null;
let lastHandledAt = 0;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;
JaewoonVibeRuntime.prototype.loadProgress = function loadWithHalfGatePrices(fallback = {}) {
  activeRuntime = this;
  return originalLoadProgress.call(this, fallback);
};
JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithHalfGatePrices(state, delay) {
  activeRuntime = this;
  return originalQueueSaveProgress.call(this, state, delay);
};

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}
function updateCoins() {
  const el = document.querySelector('#coinText');
  if (el && currentGame?.state) el.textContent = String(Math.floor(Number(currentGame.state.coins) || 0));
}
function saveNow() {
  if (!currentGame?.state) return;
  activeRuntime?.queueSaveProgress(currentGame.state, 0);
  updateCoins();
}
function northUnlocked() { return Boolean(currentGame?.state?.northernRegion?.unlocked); }
function westUnlocked() { return Boolean(currentGame?.state?.cozyExpansionV4?.west?.unlocked); }
function nearNorth() {
  return Boolean(currentGame?.state?.expanded && !northUnlocked() && currentGame?.player && distance(currentGame.player, NORTH_GATE) <= NORTH_GATE.radius);
}
function nearWest() {
  return Boolean(currentGame?.player && !westUnlocked() && distance(currentGame.player, WEST_GATE) <= WEST_GATE.radius);
}
function unlockNorth() {
  if (!currentGame?.state?.expanded) return toast('먼저 동쪽 지역을 열어야 해');
  if (northUnlocked()) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < NORTH_GATE.cost) return toast('북쪽 지역 해금에는 100골드가 필요해');
  currentGame.state.coins = coins - NORTH_GATE.cost;
  currentGame.state.northernRegion ||= {};
  currentGame.state.northernRegion.unlocked = true;
  saveNow();
  const button = document.querySelector('#northUnlockButton');
  if (button) button.style.display = 'none';
  toast('🧭 북쪽 지역 해금 · 100골드');
}
function unlockWest() {
  if (!currentGame || westUnlocked()) return;
  const coins = Number(currentGame.state.coins) || 0;
  if (coins < WEST_GATE.cost) return toast('서쪽 지역 해금에는 150골드가 필요해');
  currentGame.state.coins = coins - WEST_GATE.cost;
  currentGame.state.cozyExpansionV4 ||= {};
  currentGame.state.cozyExpansionV4.west ||= {};
  currentGame.state.cozyExpansionV4.west.unlocked = true;
  if (currentGame.world) currentGame.world.w = Math.max(Number(currentGame.world.w) || 0, 6000);
  saveNow();
  const button = document.querySelector('#westUnlockButton');
  if (button) button.style.display = 'none';
  toast('🌄 서쪽 지역 해금 · 150골드');
}
function runUnlock(kind, event) {
  const now = performance.now();
  if (now - lastHandledAt < 180) return true;
  lastHandledAt = now;
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  if (kind === 'north') unlockNorth();
  else unlockWest();
  return true;
}

window.addEventListener('pointerdown', event => {
  const target = event.target;
  if (target?.closest?.('#northUnlockButton') || (target?.closest?.('#actionButton') && nearNorth())) return runUnlock('north', event);
  if (target?.closest?.('#westUnlockButton') || (target?.closest?.('#actionButton') && nearWest())) return runUnlock('west', event);
}, true);
window.addEventListener('click', event => {
  const target = event.target;
  if (target?.closest?.('#northUnlockButton')) return runUnlock('north', event);
  if (target?.closest?.('#westUnlockButton')) return runUnlock('west', event);
}, true);
window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  if (nearNorth()) return runUnlock('north', event);
  if (nearWest()) return runUnlock('west', event);
}, true);

function patchGateUI() {
  if (!currentGame) return;
  const northButton = document.querySelector('#northUnlockButton');
  if (northButton && !northUnlocked() && northButton.textContent !== '🧭 북쪽 지역 해금 · 100골드') northButton.textContent = '🧭 북쪽 지역 해금 · 100골드';
  const westButton = document.querySelector('#westUnlockButton');
  if (westButton && !westUnlocked() && westButton.textContent !== '🌄 서쪽 지역 해금 · 150골드') westButton.textContent = '🌄 서쪽 지역 해금 · 150골드';
  const hint = document.querySelector('#hint');
  if (!hint) return;
  if (nearNorth()) hint.textContent = '행동: 북쪽 지역 해금 · 100골드';
  else if (nearWest()) hint.textContent = '행동: 서쪽 대지역 해금 · 150골드';
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithHalfGatePrices(game) {
  currentGame = game;
  const result = originalDraw.call(this, game);
  patchGateUI();
  return result;
};
setInterval(patchGateUI, 80);
