(() => {
  const NativeMutationObserver = window.MutationObserver;
  if (!NativeMutationObserver || window.__cozyWorkerShopObserverGuard) return;

  class GuardedMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      const guardedCallback = callback?.name === 'patchPanels' ? () => {} : callback;
      super(guardedCallback);
    }
  }

  window.MutationObserver = GuardedMutationObserver;
  window.__cozyWorkerShopObserverGuard = true;
})();
