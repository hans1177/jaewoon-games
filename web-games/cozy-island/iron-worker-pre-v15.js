(() => {
  let lastTap = { time: 0, x: 0, y: 0 };

  const api = () => window.__cozyIronV16 || window.__cozyIronV15;

  document.addEventListener('pointerdown', event => {
    if (!event.target?.closest?.('#actionButton')) return;
    const handler = api()?.handleAction;
    if (!handler || !handler()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true, passive: false });

  window.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat) return;
    const handler = api()?.handleAction;
    if (!handler || !handler()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('click', event => {
    const worker = event.target?.closest?.('[data-worker]');
    if (!worker) return;
    const guard = api()?.blockWorkerPurchase;
    if (!guard || !guard()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('dblclick', event => {
    const handler = api()?.handleDouble;
    if (!handler || !handler(event.clientX, event.clientY)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('pointerup', event => {
    const now = performance.now();
    const isDouble = now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38;
    lastTap = { time: now, x: event.clientX, y: event.clientY };
    if (!isDouble) return;
    const handler = api()?.handleDouble;
    if (!handler || !handler(event.clientX, event.clientY)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
