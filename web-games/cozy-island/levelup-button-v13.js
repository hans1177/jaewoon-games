const STORAGE_KEY = 'jaewoon-games:cozy-island';
const MAX_LEVEL = 3;
const CLASS_DEFS = {
  soldier: { label: '⚔️ 병사', baseCost: 50 },
  archer: { label: '🏹 궁수', baseCost: 100 },
  knight: { label: '🛡️ 기사', baseCost: 200 },
  cavalry: { label: '🏇 기마병', baseCost: 150 }
};

let lastPanelSignature = '';

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return saved?.progress && typeof saved.progress === 'object' ? saved.progress : {};
  } catch {
    return {};
  }
}

function levels(progress) {
  const saved = progress?.classPirateV12?.upgrades || {};
  const result = {};
  for (const kind of Object.keys(CLASS_DEFS)) {
    result[kind] = Math.max(0, Math.min(MAX_LEVEL, Math.floor(Number(saved[kind]) || 0)));
  }
  return result;
}

function upgradeCost(kind, level) {
  return CLASS_DEFS[kind].baseCost * Math.pow(2, level);
}

function attackMultiplier(level) {
  return Math.pow(1.5, level);
}

function setupButton() {
  if (document.querySelector('#levelUpButtonV13')) return;
  const inventory = document.querySelector('#inventoryButton');
  const app = document.querySelector('#app');
  if (!inventory || !app) return;

  const button = document.createElement('button');
  button.id = 'levelUpButtonV13';
  button.type = 'button';
  button.textContent = '⬆️ 레벨업';
  button.style.cssText = 'position:fixed;z-index:30;border:0;border-radius:10px;padding:7px 9px;background:rgba(255,255,255,.96);box-shadow:0 3px 10px rgba(31,69,57,.20);font-weight:900;color:#25423a;white-space:nowrap;touch-action:manipulation;';
  button.addEventListener('click', openLevelUpPanel);
  app.appendChild(button);
  positionButton();
}

function positionButton() {
  const inventory = document.querySelector('#inventoryButton');
  const button = document.querySelector('#levelUpButtonV13');
  if (!inventory || !button) return;
  const rect = inventory.getBoundingClientRect();
  button.style.top = `${Math.round(rect.bottom + 6)}px`;
  button.style.right = `${Math.max(8, Math.round(window.innerWidth - rect.right))}px`;
}

function openLevelUpPanel() {
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  if (!panel || !title) return;
  title.textContent = '병력 레벨업';
  lastPanelSignature = '';
  renderLevelUpPanel(true);
  if (!panel.open) panel.showModal();
}

function renderLevelUpPanel(force = false) {
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!panel?.open && !force) return;
  if (!body || title?.textContent !== '병력 레벨업') return;

  const progress = readProgress();
  const upgradeLevels = levels(progress);
  const coins = Math.max(0, Math.floor(Number(progress.coins) || Number(document.querySelector('#coinText')?.textContent) || 0));
  const signature = `${coins}|${Object.keys(CLASS_DEFS).map(kind => `${kind}:${upgradeLevels[kind]}`).join('|')}`;
  if (!force && signature === lastPanelSignature) return;
  lastPanelSignature = signature;

  body.innerHTML = `
    <div class="inventory-grid">
      <div class="item-card">🪙 보유 골드<span>${coins}골드</span></div>
      <div class="item-card">⬆️ 강화 한도<span>클래스별 3강</span></div>
    </div>
    <p class="panel-note" style="margin-top:10px">강화하면 해당 클래스 전체 공격력이 ×1.5. 새로 모집한 병력에도 자동 적용돼.</p>
    <div class="choice-grid">
      ${Object.entries(CLASS_DEFS).map(([kind, def]) => {
        const level = upgradeLevels[kind];
        const maxed = level >= MAX_LEVEL;
        const cost = maxed ? 0 : upgradeCost(kind, level);
        const factor = attackMultiplier(level).toFixed(level === 0 ? 1 : 3).replace(/0+$/, '').replace(/\.$/, '');
        return `<button class="choice" data-class-upgrade-v12="${kind}" ${maxed ? 'disabled' : ''}>
          <span>${def.label} ${level}/${MAX_LEVEL}<small style="display:block">현재 공격력 ×${factor}</small></span>
          <b>${maxed ? '최대 강화' : `${cost}골드`}</b>
        </button>`;
      }).join('')}
    </div>
    <p class="panel-note">비용: 병사 50→100→200 · 궁수 100→200→400 · 기사 200→400→800 · 기마병 150→300→600</p>`;
}

window.addEventListener('resize', positionButton);
window.addEventListener('orientationchange', () => setTimeout(positionButton, 120));

setInterval(() => {
  setupButton();
  positionButton();
  renderLevelUpPanel();
}, 150);

setupButton();
