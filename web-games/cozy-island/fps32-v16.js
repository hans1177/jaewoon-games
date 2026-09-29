(() => {
  if (window.__cozy32FpsScheduler) return;

  const TARGET_FPS = 32;
  const FRAME_MS = 1000 / TARGET_FPS;
  const nativeRequest = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const pending = new Map();
  let nextId = 1;
  let timerId = 0;
  let nativeId = 0;
  let lastFrameAt = performance.now();

  function schedule() {
    if (!pending.size || timerId || nativeId) return;
    const elapsed = performance.now() - lastFrameAt;
    const delay = Math.max(0, FRAME_MS - elapsed - 1);
    timerId = window.setTimeout(() => {
      timerId = 0;
      nativeId = nativeRequest(flush);
    }, delay);
  }

  function flush(now) {
    nativeId = 0;
    if (!pending.size) return;

    const elapsed = now - lastFrameAt;
    if (elapsed < FRAME_MS - 1.25) {
      schedule();
      return;
    }

    lastFrameAt = now;
    const batch = Array.from(pending.entries());
    pending.clear();
    for (const [, callback] of batch) {
      try { callback(now); }
      catch (error) { setTimeout(() => { throw error; }, 0); }
    }
    schedule();
  }

  window.requestAnimationFrame = function requestAnimationFrame32(callback) {
    const id = nextId++;
    pending.set(id, callback);
    schedule();
    return id;
  };

  window.cancelAnimationFrame = function cancelAnimationFrame32(id) {
    pending.delete(id);
    if (!pending.size) {
      if (timerId) { clearTimeout(timerId); timerId = 0; }
      if (nativeId) { nativeCancel(nativeId); nativeId = 0; }
    }
  };

  window.__cozy32FpsScheduler = { fps: TARGET_FPS, frameMs: FRAME_MS };
})();
