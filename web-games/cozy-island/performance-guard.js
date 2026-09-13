(() => {
  if (window.__cozyPerformanceGuardInstalled) return;
  const nativeSetInterval = window.setInterval.bind(window);

  window.setInterval = (handler, delay, ...args) => {
    const name = typeof handler === 'function' ? handler.name : '';
    let nextDelay = Math.max(0, Number(delay) || 0);

    // 보조 시스템은 delta-time을 사용하므로 호출 횟수만 줄여도 게임 규칙은 유지된다.
    if (name === 'productionTick' || name === 'villageTick') nextDelay = Math.max(nextDelay, 200);
    else if (name === 'runExtendedMovement') nextDelay = Math.max(nextDelay, 33);
    else if (name === 'worldTick') nextDelay = Math.max(nextDelay, 66);

    return nativeSetInterval(handler, nextDelay, ...args);
  };

  window.__cozyPerformanceGuardInstalled = true;
})();
