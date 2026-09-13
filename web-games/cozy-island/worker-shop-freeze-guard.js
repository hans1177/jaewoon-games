(() => {
  const NativeMutationObserver = window.MutationObserver;
  if (!NativeMutationObserver || window.__cozyWorkerShopObserverGuardV2) return;

  class GuardedMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      const guardedCallback = callback?.name === 'patchPanels' ? () => {} : callback;
      super(guardedCallback);
    }

    observe(target, options = {}) {
      const lean = { ...options };
      if (lean.childList) {
        lean.attributes = false;
        lean.characterData = false;
      }
      return super.observe(target, lean);
    }
  }

  window.MutationObserver = GuardedMutationObserver;
  window.__cozyWorkerShopObserverGuardV2 = true;
})();
