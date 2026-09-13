import { IslandRendererV3 } from './render-v3.js';

const STORAGE_KEY = 'jaewoon-games:cozy-island';
const SOLDIER_MAX = 5;
const SOLDIER_COST = 10;
let currentGame = null;
let lastBalancedRaid = 0;
let patchUnitId = 700000;

const params = new URLSearchParams(location.search);
if (params.get('reset') === '1') {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  params.delete('reset');
  const clean = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`;
  history.replaceState(null, '', clean);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function livingSoldiers(game) {
  return (game?.allies || []).filter(unit => unit.kind === 'soldier' && unit.hp > 0);
}

function makeSoldier(game) {
  return {
    id: patchUnitId++, kind: 'soldier', enemy: false, boss: false,
    hp: 100, maxHp: 100, attack: 10, range: 55, speed: 76,
    cool: 0, wander: 0, vx: 0, vy: 0,
    x: game.barracks.x + (Math.random() - .5) * 70,
    y: game.barracks.y + 60 + Math.random() * 60
  };
}

function persistGame(game) {
  if (!game?.state) return;
  game.state.army = (game.allies || []).filter(unit => unit.hp > 0).map(unit => ({ kind: unit.kind }));
  game.state.knightCount = (game.allies || []).filter(unit => unit.kind === 'knight' && unit.hp > 0).length;
  game.state.player = { x: Math.round(game.player.x), y: Math.round(game.player.y) };
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    current.progress = game.state;
    current.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

function fixSoldierRecruitButton(game) {
  const panel = document.querySelector('#panel');
  if (!panel?.open || document.querySelector('#panelTitle')?.textContent !== '병영') return;
  const button = document.querySelector('#panelBody [data-rec="soldier"]');
  if (!button) return;

  const count = livingSoldiers(game).length;
  const shouldDisable = count >= SOLDIER_MAX;
  if (button.disabled !== shouldDisable) button.disabled = shouldDisable;

  const label = button.querySelector('span');
  const nextLabel = `⚔️ 병사 모집 (${count}/${SOLDIER_MAX})`;
  if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
}

function makeEnemy(kind, index = 0, overrides = {}) {
  const archer = kind === 'archer';
  const base = {
    id: patchUnitId++, kind, enemy: true, boss: false,
    hp: archer ? 55 : 100, maxHp: archer ? 55 : 100,
    attack: archer ? 18 : 10, range: archer ? 220 : 55,
    speed: archer ? 64 : 76, cool: index * .1,
    wander: 0, vx: 0, vy: 0,
    x: 1490 + index * 45, y: 500 + (index % 4) * 100
  };
  return Object.assign(base, overrides);
}

function balanceRaid(game) {
  if (!game?.raidActive) return;
  const raidCount = Math.max(1, Math.floor(Number(game.state.raidCycleCount) || 1));
  if (raidCount === lastBalancedRaid) return;
  lastBalancedRaid = raidCount;

  const phase = ((raidCount - 1) % 4) + 1;
  const next = [];
  if (phase === 1) {
    for (let i = 0; i < 3; i++) next.push(makeEnemy('soldier', i));
  } else if (phase === 2) {
    for (let i = 0; i < 3; i++) next.push(makeEnemy('soldier', i));
    next.push(makeEnemy('archer', 3, { attack: 18 }));
    showToast('⚔️ 2번째 습격 · 병사 3 + 궁수 1');
  } else if (phase === 3) {
    next.push(makeEnemy('soldier', 0, {
      boss: true, hp: 600, maxHp: 600, attack: 22, speed: 70,
      x: 1510, y: 610
    }));
    showToast('👹 3번째 습격 · 보스 체력/공격력 완화');
  } else {
    next.push(makeEnemy('cavalry', 0, {
      hp: 600, maxHp: 600, attack: 30, range: 55, speed: 105,
      x: 1510, y: 610
    }));
    game.fourthRaid = true;
    showToast('🐎 4번째 습격 · 기마병 1마리');
  }

  game.enemies.splice(0, game.enemies.length, ...next);
}

function addResetButton() {
  const panel = document.querySelector('#panel');
  const body = document.querySelector('#panelBody');
  const title = document.querySelector('#panelTitle');
  if (!panel?.open || !body || title?.textContent !== '가방' || body.querySelector('[data-reset-game]')) return;
  const button = document.createElement('button');
  button.className = 'choice';
  button.dataset.resetGame = '1';
  button.style.marginTop = '12px';
  button.innerHTML = '<span>🔄 처음부터 다시하기</span><b>저장 초기화</b>';
  button.addEventListener('click', () => {
    if (!confirm('포근섬 저장을 전부 지우고 처음부터 다시 할까?')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    location.reload();
  });
  body.appendChild(button);
}

document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-rec="soldier"]');
  if (!button || !currentGame) return;
  const count = livingSoldiers(currentGame).length;
  if (count >= SOLDIER_MAX) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const food = Number(currentGame.state.inventory?.food) || 0;
  if (food < SOLDIER_COST) {
    showToast(`식량 ${SOLDIER_COST} 필요`);
    return;
  }

  currentGame.state.inventory.food = food - SOLDIER_COST;
  currentGame.allies.push(makeSoldier(currentGame));
  persistGame(currentGame);
  document.querySelector('#panel')?.close();
  showToast(`⚔️ 병사 보충 완료 · ${livingSoldiers(currentGame).length}/${SOLDIER_MAX}`);
}, true);

const observer = new MutationObserver(() => {
  addResetButton();
  if (currentGame) fixSoldierRecruitButton(currentGame);
});
// 병영 버튼을 직접 수정하는 observer가 attributes/characterData까지 다시 감시하면
// 자기 변경을 다시 감지하는 루프가 생길 수 있다. 패널 DOM 교체만 감시한다.
observer.observe(document.documentElement, { subtree: true, childList: true });

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithBalance(game) {
  currentGame = game;
  balanceRaid(game);
  fixSoldierRecruitButton(game);
  originalDraw.call(this, game);
  addResetButton();
};
