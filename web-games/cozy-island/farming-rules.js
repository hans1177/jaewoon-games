import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';

const FARM_GROW_MS = 20000;
const RAID_TIMER_OFFSET = 80;
const WORKER_PRICE = 50;
const WORK_TICK_SECONDS = 10;
const DELIVERY_SECONDS = 60;
const snapshots = new WeakMap();
let manualWaterSignalAt = 0;
let activeRuntime = null;
let activeProgress = null;
let lastWorkerTick = performance.now();

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

JaewoonVibeRuntime.prototype.loadProgress = function patchedLoadProgress(fallback = {}) {
  const stored = this.load().progress;
  const progress = originalLoadProgress.call(this, fallback);

  if (!stored && progress?.inventory) progress.inventory.food = 0;
  if (Array.isArray(progress?.plots)) {
    for (const plot of progress.plots) {
      plot.wateredAt = Number(plot.wateredAt) || 0;
      if (plot.watered && !plot.ready && !plot.wateredAt) plot.wateredAt = Date.now();
    }
  }

  ensureWorkerState(progress);
  migrateRaidTimer(progress);
  activeRuntime = this;
  snapshots.set(this, snapshot(progress));
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function patchedQueueSaveProgress(progress, delay) {
  ensureWorkerState(progress);
  enforceTwoMinuteRaid(progress);
  applyFarmRules(this, progress);
  activeRuntime = this;
  activeProgress = progress;
  updateWorkerShopButton();
  return originalQueueSaveProgress.call(this, progress, delay);
};

function ensureWorkerState(progress) {
  if (!progress || typeof progress !== 'object') return;
  const source = progress.workers && typeof progress.workers === 'object' ? progress.workers : {};
  progress.workers = {
    count: Math.max(0, Math.floor(Number(source.count) || 0)),
    workElapsed: Math.max(0, Number(source.workElapsed) || 0),
    deliveryElapsed: Math.max(0, Number(source.deliveryElapsed) || 0),
    buffer: {
      wood: Math.max(0, Math.floor(Number(source.buffer?.wood) || 0)),
      stone: Math.max(0, Math.floor(Number(source.buffer?.stone) || 0)),
      food: Math.max(0, Math.floor(Number(source.buffer?.food) || 0)),
      crop: Math.max(0, Math.floor(Number(source.buffer?.crop) || 0))
    }
  };
}

function migrateRaidTimer(progress) {
  if (!progress || progress.raidCadenceVersion === 2) {
    enforceTwoMinuteRaid(progress);
    return;
  }
  const oldElapsed = Math.max(0, Math.min(200, Number(progress.raidTimer) || 0));
  progress.raidTimer = RAID_TIMER_OFFSET + oldElapsed * 0.6;
  progress.raidCadenceVersion = 2;
}

function enforceTwoMinuteRaid(progress) {
  if (!progress) return;
  if (Number(progress.raidTimer) < RAID_TIMER_OFFSET) progress.raidTimer = RAID_TIMER_OFFSET;
  progress.raidCadenceVersion = 2;
}

function applyFarmRules(runtime, progress) {
  if (!progress || !Array.isArray(progress.plots) || !progress.inventory) return;

  const previous = snapshots.get(runtime) || snapshot(progress);
  const now = Date.now();
  const manualWater = now - manualWaterSignalAt < 500;
  const totalGameMinutes = (Number(progress.day || 1) - 1) * 1440 + Number(progress.minutes || 0);
  let consumedManualWater = false;

  progress.plots.forEach((plot, index) => {
    const before = previous.plots?.[index] || {};
    plot.wateredAt = Number(plot.wateredAt) || 0;

    if (before.state === 'empty' && plot.state === 'growing') {
      plot.watered = false;
      plot.ready = false;
      plot.wateredAt = 0;
    }

    if (!before.watered && plot.watered) {
      const workerWater = Boolean(plot.workerWater);
      if (manualWater || workerWater) {
        plot.wateredAt = now;
        plot.plantedAt = totalGameMinutes - 40;
        plot.ready = false;
        plot.workerWater = false;
        if (manualWater) consumedManualWater = true;
      } else {
        plot.watered = false;
        plot.wateredAt = 0;
        plot.ready = false;
      }
    }

    if (before.ready && plot.state === 'empty') {
      if (plot.workerHarvest) {
        plot.workerHarvest = false;
      } else {
        progress.inventory.food = Math.max(0, Number(progress.inventory.food) || 0) + 5;
      }
      plot.wateredAt = 0;
    }

    if (plot.state === 'growing' && plot.watered && !plot.ready && plot.wateredAt) {
      if (now - plot.wateredAt >= FARM_GROW_MS) plot.ready = true;
    }
  });

  if (consumedManualWater) manualWaterSignalAt = 0;
  snapshots.set(runtime, snapshot(progress));
}

function snapshot(progress) {
  return {
    plots: Array.isArray(progress?.plots)
      ? progress.plots.map(plot => ({
          state: plot.state,
          watered: Boolean(plot.watered),
          ready: Boolean(plot.ready),
          wateredAt: Number(plot.wateredAt) || 0
        }))
      : [],
    food: Number(progress?.inventory?.food) || 0
  };
}

function markManualWater() {
  const toolText = document.querySelector('#toolButton')?.textContent || '';
  if (toolText.includes('물뿌리개')) manualWaterSignalAt = Date.now();
}

window.addEventListener('pointerdown', event => {
  if (event.target?.closest?.('#actionButton')) markManualWater();
}, { capture: true });
window.addEventListener('keydown', event => {
  if (event.code === 'Space') markManualWater();
}, { capture: true });

function tickWorkers() {
  const now = performance.now();
  const dt = Math.min(2, Math.max(0, (now - lastWorkerTick) / 1000));
  lastWorkerTick = now;
  const progress = activeProgress;
  if (!progress || !activeRuntime) return;
  ensureWorkerState(progress);
  const workers = progress.workers;
  if (workers.count <= 0) return;

  workers.workElapsed += dt;
  workers.deliveryElapsed += dt;
  let changed = false;

  for (const plot of progress.plots || []) {
    if (plot.state === 'growing' && !plot.watered) {
      plot.workerWater = true;
      plot.watered = true;
      changed = true;
    }
    if (plot.ready) {
      plot.workerHarvest = true;
      plot.state = 'empty';
      plot.plantedAt = 0;
      plot.watered = false;
      plot.wateredAt = 0;
      plot.ready = false;
      workers.buffer.food += 10;
      workers.buffer.crop += 1;
      changed = true;
    }
  }

  while (workers.workElapsed >= WORK_TICK_SECONDS) {
    workers.workElapsed -= WORK_TICK_SECONDS;
    workers.buffer.wood += workers.count;
    workers.buffer.stone += workers.count;
    changed = true;
  }

  if (workers.deliveryElapsed >= DELIVERY_SECONDS) {
    workers.deliveryElapsed %= DELIVERY_SECONDS;
    const delivered = { ...workers.buffer };
    progress.inventory.wood = (Number(progress.inventory.wood) || 0) + delivered.wood;
    progress.inventory.stone = (Number(progress.inventory.stone) || 0) + delivered.stone;
    progress.inventory.food = (Number(progress.inventory.food) || 0) + delivered.food;
    progress.inventory.crop = (Number(progress.inventory.crop) || 0) + delivered.crop;
    workers.buffer = { wood: 0, stone: 0, food: 0, crop: 0 };
    changed = true;
    if (delivered.wood + delivered.stone + delivered.food + delivered.crop > 0) {
      showToast(`🧺 노비 작업물 지급 · 나무 ${delivered.wood} · 돌 ${delivered.stone} · 식량 ${delivered.food} · 농작물 ${delivered.crop}`);
    }
  }

  if (changed) activeRuntime.queueSaveProgress(progress);
  updateWorkerShopButton();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function setupWorkerShop() {
  if (document.querySelector('#workerShopButton')) return;
  const app = document.querySelector('#app');
  if (!app) return;
  const style = document.createElement('style');
  style.textContent = `
    .worker-shop-button{position:absolute;left:16px;bottom:max(162px,calc(env(safe-area-inset-bottom) + 162px));z-index:6;border:0;border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.92);box-shadow:0 4px 14px rgba(31,69,57,.18);font-weight:900;font-size:12px;color:#25423a;touch-action:manipulation}
    .worker-shop-button:active{transform:scale(.96)}
    @media(max-height:620px){.worker-shop-button{bottom:125px}}
  `;
  document.head.appendChild(style);
  const button = document.createElement('button');
  button.id = 'workerShopButton';
  button.className = 'worker-shop-button';
  button.type = 'button';
  button.addEventListener('click', openWorkerShop);
  app.appendChild(button);
  updateWorkerShopButton();
}

function updateWorkerShopButton() {
  const button = document.querySelector('#workerShopButton');
  if (!button) return;
  const count = Math.max(0, Number(activeProgress?.workers?.count) || 0);
  button.textContent = `🧑‍🌾 노비 판매소 · ${count}명`;
}

function openWorkerShop() {
  const progress = activeProgress;
  const panel = document.querySelector('#panel');
  const title = document.querySelector('#panelTitle');
  const body = document.querySelector('#panelBody');
  if (!progress || !panel || !title || !body || panel.open) return;
  ensureWorkerState(progress);
  title.textContent = '노비 판매소';
  renderWorkerShopBody(progress, body);
  panel.showModal();
}

function renderWorkerShopBody(progress, body) {
  const workers = progress.workers;
  const remain = Math.max(0, Math.ceil(DELIVERY_SECONDS - workers.deliveryElapsed));
  body.innerHTML = `
    <p class="panel-note">노비는 자동으로 밭에 물을 주고 나무·돌을 채집해. 다 자란 농작물도 자동 수확하고, 1분마다 작업물을 인벤토리에 넣어줘.</p>
    <div class="inventory-grid">
      <div class="item-card">🧑‍🌾 노비<span>${workers.count}명</span></div>
      <div class="item-card">⏱️ 다음 지급<span>${remain}초</span></div>
      <div class="item-card">🪵 보관 나무<span>${workers.buffer.wood}개</span></div>
      <div class="item-card">🪨 보관 돌<span>${workers.buffer.stone}개</span></div>
      <div class="item-card">🍖 보관 식량<span>${workers.buffer.food}개</span></div>
      <div class="item-card">🥕 보관 농작물<span>${workers.buffer.crop}개</span></div>
    </div>
    <div class="choice-grid" style="margin-top:10px">
      <button class="choice" data-buy-worker><span>🧑‍🌾 노비 1명 구매</span><b>${WORKER_PRICE}골드</b></button>
    </div>
    <p class="panel-note">노비 1명은 10초마다 나무 1개와 돌 1개를 채집해.</p>`;
  body.querySelector('[data-buy-worker]')?.addEventListener('click', () => buyWorker(progress, body));
}

function buyWorker(progress, body) {
  if ((Number(progress.coins) || 0) < WORKER_PRICE) {
    showToast(`골드가 부족해 · ${WORKER_PRICE} 필요`);
    return;
  }
  progress.coins -= WORKER_PRICE;
  progress.workers.count += 1;
  activeRuntime?.queueSaveProgress(progress);
  renderWorkerShopBody(progress, body);
  updateWorkerShopButton();
  showToast('🧑‍🌾 노비 1명이 작업을 시작했어');
}

function replaceText(element, replacements) {
  if (!element) return;
  let next = element.textContent;
  for (const [from, to] of replacements) next = next.replace(from, to);
  if (next !== element.textContent) element.textContent = next;
}

const observer = new MutationObserver(() => {
  replaceText(document.querySelector('#hint'), [
    ['수확하기 · 식량 +5', '수확하기 · 식량 +10'],
    ['비가 텃밭에 물을 주고 있어', '물뿌리개로 직접 물을 줘'],
    ['작물이 자라는 중이야', '물을 준 뒤 20초 동안 자라는 중이야']
  ]);
  replaceText(document.querySelector('#toast'), [['식량 +5', '식량 +10']]);

  const panel = document.querySelector('#panelBody');
  if (panel) {
    const current = panel.innerHTML;
    const next = current.replace(
      '비 오는 날엔 텃밭에 물을 따로 안 줘도 돼.',
      '농작물은 직접 물을 주거나 노비가 물을 준 뒤 20초 기다리면 식량을 얻을 수 있어.'
    );
    if (next !== current) panel.innerHTML = next;
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

setupWorkerShop();
setInterval(tickWorkers, 500);
setInterval(() => {
  if (document.querySelector('#panel')?.open && document.querySelector('#panelTitle')?.textContent === '노비 판매소' && activeProgress) {
    renderWorkerShopBody(activeProgress, document.querySelector('#panelBody'));
  }
}, 1000);
