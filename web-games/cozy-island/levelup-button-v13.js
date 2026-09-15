import { IslandRendererV3 } from './render-v3.js';

const MAX_LEVEL = 3;
const CLASS_DEFS = {
  soldier: { label: '⚔️ 병사', baseCost: 50 },
  archer: { label: '🏹 궁수', baseCost: 100 },
  knight: { label: '🛡️ 기사', baseCost: 200 },
  cavalry: { label: '🏇 기마병', baseCost: 150 }
};

let currentGame = null;
let lastSignature = '';

function upgradeState() {
  const state = currentGame?.state?.classPirateV12;
  if (!state) return null;
  state.upgrades ||= {};
  for (const kind of Object.keys(CLASS_DEFS)) {
    state.upgrades[kind] = Math.max(0, Math.min(MAX_LEVEL, Math.floor(Number(state.upgrades[kind]) || 0)));
  }
  return state.upgrades;
}

function upgradeCost(kind, level) {
  const def = CLASS_DEFS[kind];
  if (!def || level >= MAX_LEVEL) return 0;
  return def.baseCost * Math.pow(2, level);
}

function multiplier(level) {
  return Math.pow(1.5, Math.max(0, Math.min(MAX_LEVEL, Number(level) || 0)));
}

function setupLevelButton() {
  if (document.querySelector('#levelUpButton')) return;
  const button = document.createElement('button');
  button.id = 'levelUpButton';
  button.type = 'button';
  button.className = 'small-button';
  button.textContent = '⬆️ 레벨업';
  button.setAttribute('aria-label', '병력 레벨업');
  button.style.cssText = 'position:absolute;right:10px;top:max(58px,calc(env(safe-area-inset-top) + 48px));z-index:20;box-shadow:0 4px 14px rgba(31,69,57,.14);pointer-events:auto;';
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    openLevelPanel();
  }, { passive: false });
  document.querySelector('#app')?.appendChild(button);
}

function openLevelPanel() {
  if (!currentGame || document.querySelector('#fishing')?.open) return;
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  if (!panel || !title) return;
  if (panel.open) panel.close();
  title.textContent = '병력 레벨업';
  lastSignature = '';
  renderLevelPanel(true);
  panel.showModal();
}

function renderLevelPanel(force = false) {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!panel?.open || title?.textContent !== '병력 레벨업' || !body) return;
  const upgrades = upgradeState();
  if (!upgrades) return;
  const coins = Math.floor(Number(currentGame.state.coins) || 0);
  const signature = `${coins}|${Object.keys(CLASS_DEFS).map(kind => `${kind}:${upgrades[kind]}`).join('|')}`;
  if (!force && signature === lastSignature) return;
  lastSignature = signature;

  body.innerHTML = `
    <p class="panel-note"><b>병력 클래스 레벨업</b> · 한 번 올릴 때마다 해당 클래스 전체 공격력 ×1.5 · 새로 모집한 병력에도 자동 적용</p>
    <div class="inventory-grid" style="margin-bottom:10px">
      <div class="item-card">🪙 보유 골드<span>${coins}</span></div>
      <div class="item-card">⬆️ 최대 단계<span>${MAX_LEVEL}강</span></div>
    </div>
    <div class="choice-grid">
      ${Object.entries(CLASS_DEFS).map(([kind, def]) => {
        const level = upgrades[kind] || 0;
        const maxed = level >= MAX_LEVEL;
        const cost = maxed ? 0 : upgradeCost(kind, level);
        const factor = multiplier(level).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
        return `<button class="choice" data-class-upgrade-v12="${kind}" ${maxed ? 'disabled' : ''}>
          <span>${def.label} ${level}/${MAX_LEVEL}<small style="display:block">공격력 배율 ×${factor}</small></span>
          <b>${maxed ? '최대 강화' : `${cost}골드`}</b>
        </button>`;
      }).join('')}
    </div>
    <p class="panel-note">비용은 강화할 때마다 2배가 돼.</p>`;
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
rendererProto.draw = function drawWithLevelButton(game) {
  currentGame = game;
  const result = originalDraw.call(this, game);
  setupLevelButton();
  renderLevelPanel();
  return result;
};

setupLevelButton();
setInterval(() => {
  setupLevelButton();
  renderLevelPanel();
}, 150);
