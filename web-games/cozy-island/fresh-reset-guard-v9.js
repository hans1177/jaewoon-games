import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;

JaewoonVibeRuntime.prototype.loadProgress = function loadFreshCozyProgress(fallback = {}) {
  if (this.gameId === 'cozy-island' && window.__COZY_FRESH_RESET_V9) {
    this.pendingProgress = null;
    const fresh = typeof structuredClone === 'function'
      ? structuredClone(fallback)
      : JSON.parse(JSON.stringify(fallback));

    // Explicitly scrub worker-related fields so no legacy worker assignment can survive a reset.
    fresh.workers = 0;
    fresh.workerTotal = 0;
    fresh.workerWorkTimer = 0;
    fresh.workerDeliveryTimer = 0;
    fresh.workerFeedTimer = 0;
    fresh.workerStorage = { wood: 0, stone: 0, food: 0, crop: 0 };
    fresh.productionBuildings = {
      lumberBuilt: false,
      mineBuilt: false,
      lumberWorker: 0,
      mineWorker: 0,
      lumberTimer: 0,
      mineTimer: 0,
      playerLumberTimer: 0,
      playerMineTimer: 0,
      deliveryTimer: 0,
      assignedFeedTimer: 0,
      bufferWood: 0,
      bufferStone: 0,
      legacyMigrated: true
    };
    fresh.seedDepot = { built: false, seeds: 0 };
    return fresh;
  }
  return originalLoadProgress.call(this, fallback);
};
