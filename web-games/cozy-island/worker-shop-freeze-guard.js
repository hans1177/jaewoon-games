(() => {
  const NativeMutationObserver = window.MutationObserver;
  if (!NativeMutationObserver || window.__cozyObserverGuardV2) return;

  class LeanMutationObserver extends NativeMutationObserver {
    observe(target, options = {}) {
      const lean = { ...options };
      // 포근섬 패널은 childList 변화만 보면 충분하다. attributes/characterData 감시는
      // 버튼 글자·disabled·toast 변경마다 콜백을 재실행해 모바일 렉과 멈춤을 만들었다.
      if (lean.childList) {
        lean.attributes = false;
        lean.characterData = false;
      }
      return super.observe(target, lean);
    }
  }

  window.MutationObserver = LeanMutationObserver;
  window.__cozyObserverGuardV2 = true;
})();
