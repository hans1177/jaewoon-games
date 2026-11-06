function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class JaewoonDayNightCycle {
  constructor({
    dayDuration = 60,
    nightDuration = 60,
    startPhase = 'day',
    startDay = 1,
    elapsed = 0,
    timeScale = 1,
    paused = false,
  } = {}) {
    this.dayDuration = positiveNumber(dayDuration, 60);
    this.nightDuration = positiveNumber(nightDuration, 60);
    this.timeScale = Math.max(0, Number(timeScale) || 0);
    this.reset({ startPhase, startDay, elapsed, paused });
  }

  reset({ startPhase = 'day', startDay = 1, elapsed = 0, paused = false } = {}) {
    this.phase = String(startPhase).toLowerCase() === 'night' ? 'night' : 'day';
    this.day = Math.max(1, Math.floor(Number(startDay) || 1));
    this.elapsed = Math.max(0, Number(elapsed) || 0);
    this.paused = Boolean(paused);
    this.totalElapsed = 0;
    this._normalizeElapsed();
    return this.status();
  }

  durationFor(phase = this.phase) {
    return String(phase) === 'night' ? this.nightDuration : this.dayDuration;
  }

  isDay() { return this.phase === 'day'; }
  isNight() { return this.phase === 'night'; }

  setPaused(value) {
    this.paused = Boolean(value);
    return this.paused;
  }

  setTimeScale(value) {
    const scale = Number(value);
    if (!Number.isFinite(scale) || scale < 0) throw new Error('timeScale must be a finite number >= 0');
    this.timeScale = scale;
    return this.timeScale;
  }

  setPhase(phase, { day = this.day, elapsed = 0 } = {}) {
    const next = String(phase).toLowerCase();
    if (!['day', 'night'].includes(next)) throw new Error(`invalid phase: ${phase}`);
    this.phase = next;
    this.day = Math.max(1, Math.floor(Number(day) || 1));
    this.elapsed = Math.max(0, Number(elapsed) || 0);
    this._normalizeElapsed();
    return this.status();
  }

  update(delta) {
    const raw = Number(delta);
    if (!Number.isFinite(raw) || raw < 0) throw new Error('delta must be a finite number >= 0');
    if (this.paused || this.timeScale === 0 || raw === 0) return [];

    let remaining = raw * this.timeScale;
    this.totalElapsed += remaining;
    const events = [];

    while (remaining > 0) {
      const duration = this.durationFor();
      const untilBoundary = Math.max(0, duration - this.elapsed);
      if (remaining < untilBoundary) {
        this.elapsed += remaining;
        remaining = 0;
        break;
      }

      remaining -= untilBoundary;
      this.elapsed = 0;
      const previous = this.phase;
      if (previous === 'day') {
        this.phase = 'night';
      } else {
        this.phase = 'day';
        this.day += 1;
      }
      events.push(Object.freeze({
        type: 'phase-change',
        from: previous,
        phase: this.phase,
        day: this.day,
      }));
    }

    return events;
  }

  status() {
    const duration = this.durationFor();
    const progress = duration > 0 ? Math.min(1, Math.max(0, this.elapsed / duration)) : 1;
    return Object.freeze({
      day: this.day,
      phase: this.phase,
      elapsed: this.elapsed,
      duration,
      remaining: Math.max(0, duration - this.elapsed),
      progress,
      paused: this.paused,
      timeScale: this.timeScale,
      totalElapsed: this.totalElapsed,
    });
  }

  snapshot() {
    return clone({
      version: 1,
      dayDuration: this.dayDuration,
      nightDuration: this.nightDuration,
      day: this.day,
      phase: this.phase,
      elapsed: this.elapsed,
      totalElapsed: this.totalElapsed,
      timeScale: this.timeScale,
      paused: this.paused,
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('day/night snapshot required');
    this.dayDuration = positiveNumber(snapshot.dayDuration, this.dayDuration);
    this.nightDuration = positiveNumber(snapshot.nightDuration, this.nightDuration);
    this.phase = String(snapshot.phase).toLowerCase() === 'night' ? 'night' : 'day';
    this.day = Math.max(1, Math.floor(Number(snapshot.day) || 1));
    this.elapsed = Math.max(0, Number(snapshot.elapsed) || 0);
    this.totalElapsed = Math.max(0, Number(snapshot.totalElapsed) || 0);
    this.timeScale = Math.max(0, Number(snapshot.timeScale) || 0);
    this.paused = Boolean(snapshot.paused);
    this._normalizeElapsed();
    return this.status();
  }

  _normalizeElapsed() {
    let guard = 0;
    while (this.elapsed >= this.durationFor() && guard < 100000) {
      this.elapsed -= this.durationFor();
      if (this.phase === 'day') {
        this.phase = 'night';
      } else {
        this.phase = 'day';
        this.day += 1;
      }
      guard += 1;
    }
  }
}

if (typeof window !== 'undefined') window.JaewoonDayNightCycle = JaewoonDayNightCycle;
