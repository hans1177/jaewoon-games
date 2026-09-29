(() => {
  const STORAGE_KEY = 'jaewoon-games:cozy-island';
  const FISHING_KEY = 'jaewoon-games:cozy-island:fishing-v9';

  // Capture the browser-native dialog opener before older balance modules wrap it.
  if (!window.__cozyNativeShowModalV9 && window.HTMLDialogElement?.prototype?.showModal) {
    window.__cozyNativeShowModalV9 = window.HTMLDialogElement.prototype.showModal;
  }

  // The in-game reset button should also clear the separate fishing limiter state.
  document.addEventListener('click', event => {
    if (!event.target?.closest?.('[data-reset-game]')) return;
    try { localStorage.removeItem(FISHING_KEY); } catch {}
  }, true);

  const params = new URLSearchParams(location.search);
  if (params.get('reset') !== '1') return;

  window.__COZY_FRESH_RESET_V9 = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FISHING_KEY);
    sessionStorage.setItem('cozy-island:fresh-reset-v9', '1');
  } catch {}

  params.delete('reset');
  const clean = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`;
  history.replaceState(null, '', clean);
})();
