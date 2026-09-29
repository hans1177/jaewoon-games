function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function seconds(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

export class JaewoonGameTimers {
  constructor({ timers = {} } = {}) {
    this.timers = new Map();
    for (const [id, config] of Object.entries(timers || {})) this.create(id, config);
  }

  create(id, {
    duration = 0,
    remaining = duration,
    repeat = false,
    interval = duration,
    paused = false,
    data = null,
    onFire = null,
  } = {}) {
    const key = String(id || '').trim();
    if (!key) throw new Error('timer id required');
    const safeDuration = seconds(duration);
    const safeInterval = seconds(interval, safeDuration);
    const timer = {
      id: key,
      duration: safeDuration,
      remaining: seconds(remaining, safeDuration),
      repeat: Boolean(repeat),
      interval: safeInterval,
      paused: Boolean(paused),
      completed: false,
      fires: 0,
      data: clone(data),
      onFire: typeof onFire === 'function' ? onFire : null,
    };
    this.timers.set(key, timer);
    return timer;
  }

  has(id) { return this.timers.has(String(id)); }
  get(id) { return this.timers.get(String(id)) || null; }

  start(id, duration = null) {
    const timer = this.get(id);
    if (!timer) throw new Error(`unknown timer: ${id}`);
    if (duration != null) {
      timer.duration = seconds(duration);
      if (!timer.repeat || timer.interval <= 0) timer.interval = timer.duration;
    }
    timer.remaining = timer.duration;
    timer.paused = false;
    timer.completed = false;
    return timer;
  }

  pause(id) {
    const timer = this.get(id);
    if (!timer) return false;
    timer.paused = true;
    return true;
  }

  resume(id) {
    const timer = this.get(id);
    if (!timer || timer.completed) return false;
    timer.paused = false;
    return true;
  }

  cancel(id) { return this.timers.delete(String(id)); }
  clear() { this.timers.clear(); }

  remaining(id) {
    const timer = this.get(id);
    return timer ? timer.remaining : null;
  }

  ready(id) {
    const timer = this.get(id);
    return Boolean(timer && timer.completed);
  }

  update(delta) {
    const dt = seconds(delta);
    if (dt <= 0) return [];
    const fired = [];

    for (const timer of this.timers.values()) {
      if (timer.paused || timer.completed) continue;
      timer.remaining -= dt;

      let guard = 0;
      while (timer.remaining <= 0 && !timer.completed && guard < 100) {
        guard += 1;
        timer.fires += 1;
        const event = {
          id: timer.id,
          fires: timer.fires,
          data: clone(timer.data),
        };
        fired.push(event);
        if (timer.onFire) timer.onFire(event, timer, this);

        if (timer.repeat) {
          const interval = timer.interval > 0 ? timer.interval : timer.duration;
          if (interval <= 0) {
            timer.completed = true;
            timer.remaining = 0;
          } else {
            timer.remaining += interval;
          }
        } else {
          timer.completed = true;
          timer.remaining = 0;
        }
      }
    }
    return fired;
  }

  snapshot() {
    return {
      version: 1,
      timers: Object.fromEntries([...this.timers].map(([id, timer]) => [id, {
        duration: timer.duration,
        remaining: timer.remaining,
        repeat: timer.repeat,
        interval: timer.interval,
        paused: timer.paused,
        completed: timer.completed,
        fires: timer.fires,
        data: clone(timer.data),
      }])),
    };
  }

  restore(snapshot = {}) {
    const source = snapshot?.timers;
    if (!source || typeof source !== 'object') return false;
    for (const [id, saved] of Object.entries(source)) {
      const existing = this.get(id);
      const timer = existing || this.create(id, saved);
      timer.duration = seconds(saved.duration, timer.duration);
      timer.remaining = seconds(saved.remaining, timer.remaining);
      timer.repeat = Boolean(saved.repeat);
      timer.interval = seconds(saved.interval, timer.interval);
      timer.paused = Boolean(saved.paused);
      timer.completed = Boolean(saved.completed);
      timer.fires = Math.max(0, Math.floor(Number(saved.fires) || 0));
      timer.data = clone(saved.data);
    }
    return true;
  }
}

if (typeof window !== 'undefined') window.JaewoonGameTimers = JaewoonGameTimers;
