(() => {
  if (window.__cozyPerformanceGuardInstalled) return;
  const nativeSetInterval = window.setInterval.bind(window);
  const MOVE_FRAME_MS = 1000 / 32;

  window.setInterval = (handler, delay, ...args) => {
    const name = typeof handler === 'function' ? handler.name : '';
    let nextDelay = Math.max(0, Number(delay) || 0);

    // 비이동 생산/UI 루프는 기존 절전 주기를 유지한다.
    if (name === 'productionTick' || name === 'villageTick') nextDelay = Math.max(nextDelay, 200);
    // 이동/전투 위치 갱신 루프는 플레이어·병력·몬스터와 같은 32FPS로 통일한다.
    else if (name === 'runExtendedMovement' || name === 'worldTick' || name === 'updateTick') nextDelay = MOVE_FRAME_MS;

    return nativeSetInterval(handler, nextDelay, ...args);
  };

  window.__cozyPerformanceGuardInstalled = true;
})();
