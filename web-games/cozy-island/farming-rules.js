import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';

const FARM_GROW_MS = 20000;
const snapshots = new WeakMap();
let manualWaterSignalAt = 0;

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

  snapshots.set(this, snapshot(progress));
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function patchedQueueSaveProgress(progress, delay) {
  applyFarmRules(this, progress);
  return originalQueueSaveProgress.call(this, progress, delay);
};

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
      if (manualWater) {
        plot.wateredAt = now;
        plot.plantedAt = totalGameMinutes - 40;
        plot.ready = false;
        consumedManualWater = true;
      } else {
        plot.watered = false;
        plot.wateredAt = 0;
        plot.ready = false;
      }
    }

    if (before.ready && plot.state === 'empty') {
      progress.inventory.food = Math.max(0, Number(progress.inventory.food) || 0) + 5;
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
      '농작물은 직접 물을 주고 20초 기다리면 식량을 얻을 수 있어.'
    );
    if (next !== current) panel.innerHTML = next;
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
