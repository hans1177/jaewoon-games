function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function defaultSchedule(callback) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return setTimeout(() => callback(defaultNow()), 16);
}

function defaultCancel(handle) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
  else clearTimeout(handle);
}

export class JaewoonGameLoop {
  constructor({
    stepSeconds = 1 / 60,
    maxDeltaSeconds = 0.25,
    maxUpdatesPerFrame = 5,
    update = () => {},
    render = () => {},
    now = defaultNow,
    schedule = defaultSchedule,
    cancel = defaultCancel,
  } = {}) {
    this.stepSeconds = Math.max(1 / 1000, finite(stepSeconds, 1 / 60));
    this.maxDeltaSeconds = Math.max(this.stepSeconds, finite(maxDeltaSeconds, 0.25));
    this.maxUpdatesPerFrame = Math.max(1, Math.trunc(finite(maxUpdatesPerFrame, 5)));
    this.update = typeof update === 'function' ? update : () => {};
    this.render = typeof render === 'function' ? render : () => {};
    this.now = typeof now === 'function' ? now : defaultNow;
    this.schedule = typeof schedule === 'function' ? schedule : defaultSchedule;
    this.cancel = typeof cancel === 'function' ? cancel : defaultCancel;
    this.running = false;
    this.paused = false;
    this.handle = null;
    this.lastTime = null;
    this.accumulator = 0;
    this.frameCount = 0;
    this.updateCount = 0;
    this.boundFrame = (time) => this.frame(time);
  }

  setCallbacks({ update, render } = {}) {
    if (typeof update === 'function') this.update = update;
    if (typeof render === 'function') this.render = render;
    return this;
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.lastTime = null;
    this.accumulator = 0;
    this.queueNext();
    return this;
  }

  stop() {
    if (this.handle != null) this.cancel(this.handle);
    this.handle = null;
    this.running = false;
    this.lastTime = null;
    this.accumulator = 0;
    return this;
  }

  setPaused(value) {
    const next = Boolean(value);
    if (this.paused === next) return this.paused;
    this.paused = next;
    this.lastTime = null;
    this.accumulator = 0;
    return this.paused;
  }

  pause() { return this.setPaused(true); }
  resume() { return this.setPaused(false); }
  togglePause() { return this.setPaused(!this.paused); }

  queueNext() {
    if (!this.running) return null;
    this.handle = this.schedule(this.boundFrame);
    return this.handle;
  }

  frame(timestamp = this.now()) {
    if (!this.running) return false;
    this.handle = null;
    const time = finite(timestamp, this.now());

    if (this.lastTime == null) {
      this.lastTime = time;
      this.render(0, { deltaSeconds: 0, updates: 0, paused: this.paused });
      this.frameCount += 1;
      this.queueNext();
      return true;
    }

    let deltaSeconds = Math.max(0, (time - this.lastTime) / 1000);
    this.lastTime = time;
    deltaSeconds = Math.min(deltaSeconds, this.maxDeltaSeconds);

    let updates = 0;
    if (!this.paused) {
      this.accumulator += deltaSeconds;
      while (this.accumulator >= this.stepSeconds && updates < this.maxUpdatesPerFrame) {
        this.update(this.stepSeconds, { frame: this.frameCount, update: this.updateCount });
        this.accumulator -= this.stepSeconds;
        updates += 1;
        this.updateCount += 1;
      }
      if (updates >= this.maxUpdatesPerFrame && this.accumulator >= this.stepSeconds) {
        this.accumulator %= this.stepSeconds;
      }
    } else {
      this.accumulator = 0;
    }

    const alpha = this.paused ? 0 : Math.max(0, Math.min(1, this.accumulator / this.stepSeconds));
    this.render(alpha, { deltaSeconds, updates, paused: this.paused });
    this.frameCount += 1;
    this.queueNext();
    return true;
  }

  stepOnce(count = 1) {
    const frames = Math.max(1, Math.trunc(finite(count, 1)));
    for (let i = 0; i < frames; i += 1) {
      this.update(this.stepSeconds, { frame: this.frameCount, update: this.updateCount, manual: true });
      this.updateCount += 1;
    }
    this.render(0, { deltaSeconds: this.stepSeconds * frames, updates: frames, paused: this.paused, manual: true });
    this.frameCount += 1;
    return frames;
  }

  stats() {
    return Object.freeze({
      running: this.running,
      paused: this.paused,
      frameCount: this.frameCount,
      updateCount: this.updateCount,
      stepSeconds: this.stepSeconds,
    });
  }
}

if (typeof window !== 'undefined') window.JaewoonGameLoop = JaewoonGameLoop;
