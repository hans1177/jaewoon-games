function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function integer(value, fallback = 0) {
  return Math.trunc(finite(value, fallback));
}

function normalizeGroup(group = {}, defaultInterval = 1) {
  const enemyId = String(group.enemyId || group.id || '').trim();
  if (!enemyId) throw new Error('wave spawn enemy id required');
  return {
    enemyId,
    count: Math.max(0, integer(group.count, 1)),
    interval: Math.max(0, finite(group.interval, defaultInterval)),
    delay: Math.max(0, finite(group.delay, 0)),
    data: clone(group.data || {}),
  };
}

function normalizeWave(wave = {}, index = 0, defaults = {}) {
  const groups = Array.isArray(wave.groups || wave.entries)
    ? (wave.groups || wave.entries).map((group) => normalizeGroup(group, defaults.defaultInterval))
    : [];
  return {
    id: String(wave.id || `wave-${index + 1}`),
    startDelay: Math.max(0, finite(wave.startDelay, defaults.defaultStartDelay)),
    maxAlive: wave.maxAlive == null ? Infinity : Math.max(1, integer(wave.maxAlive, 1)),
    groups,
    data: clone(wave.data || {}),
  };
}

export class JaewoonWaveSpawner {
  constructor({
    waves = [],
    defaultInterval = 1,
    defaultStartDelay = 0,
    autoAdvance = false,
    maxCatchUpSpawns = 1000,
  } = {}) {
    this.defaultInterval = Math.max(0, finite(defaultInterval, 1));
    this.defaultStartDelay = Math.max(0, finite(defaultStartDelay, 0));
    this.autoAdvance = Boolean(autoAdvance);
    this.maxCatchUpSpawns = Math.max(1, integer(maxCatchUpSpawns, 1000));
    this.waves = [];
    this.reset();
    for (const wave of waves) this.addWave(wave);
  }

  addWave(wave) {
    const normalized = normalizeWave(wave, this.waves.length, this);
    if (this.waves.some((item) => item.id === normalized.id)) throw new Error(`wave already exists: ${normalized.id}`);
    this.waves.push(normalized);
    return clone(normalized);
  }

  setWaves(waves = []) {
    this.waves = [];
    for (const wave of waves) this.addWave(wave);
    this.reset();
    return this.waves.length;
  }

  get currentWave() {
    return this.currentIndex >= 0 && this.currentIndex < this.waves.length ? this.waves[this.currentIndex] : null;
  }

  start(index = 0) {
    const target = integer(index, 0);
    if (target < 0 || target >= this.waves.length) throw new Error(`wave index out of range: ${target}`);
    const wave = this.waves[target];
    this.currentIndex = target;
    this.active = true;
    this.completed = false;
    this.groupIndex = 0;
    this.spawnedInGroup = 0;
    this.alive = 0;
    this.waveSpawned = 0;
    this.waveDefeated = 0;
    this.waitingForClear = wave.groups.length === 0;
    const first = wave.groups[0];
    this.timeToNext = wave.startDelay + (first?.delay || 0);
    return { type: 'wave-start', waveIndex: target, waveId: wave.id, data: clone(wave.data) };
  }

  startNext() {
    const next = this.currentIndex + 1;
    if (next >= this.waves.length) {
      this.active = false;
      this.completed = true;
      return null;
    }
    return this.start(next);
  }

  markDefeated(count = 1) {
    const requested = Math.max(0, integer(count, 1));
    const defeated = Math.min(this.alive, requested);
    if (defeated <= 0) return 0;
    this.alive -= defeated;
    this.waveDefeated += defeated;
    this.totalDefeated += defeated;
    return defeated;
  }

  update(delta) {
    if (!this.active || !this.currentWave) return [];
    const dt = Math.max(0, finite(delta, 0));
    const events = [];
    this.timeToNext -= dt;

    let catchUp = 0;
    while (!this.waitingForClear && this.timeToNext <= 0 && catchUp < this.maxCatchUpSpawns) {
      const wave = this.currentWave;
      if (this.alive >= wave.maxAlive) break;
      const group = wave.groups[this.groupIndex];
      if (!group) {
        this.waitingForClear = true;
        break;
      }

      if (group.count <= 0) {
        this.groupIndex += 1;
        this.spawnedInGroup = 0;
        const nextGroup = wave.groups[this.groupIndex];
        if (nextGroup) this.timeToNext += nextGroup.delay;
        else this.waitingForClear = true;
        continue;
      }

      this.spawnedInGroup += 1;
      this.alive += 1;
      this.waveSpawned += 1;
      this.totalSpawned += 1;
      catchUp += 1;
      events.push({
        type: 'spawn',
        waveIndex: this.currentIndex,
        waveId: wave.id,
        enemyId: group.enemyId,
        groupIndex: this.groupIndex,
        numberInGroup: this.spawnedInGroup,
        alive: this.alive,
        data: clone(group.data),
      });

      if (this.spawnedInGroup < group.count) {
        this.timeToNext += group.interval;
      } else {
        this.groupIndex += 1;
        this.spawnedInGroup = 0;
        const nextGroup = wave.groups[this.groupIndex];
        if (nextGroup) this.timeToNext += nextGroup.delay;
        else this.waitingForClear = true;
      }
    }

    if (catchUp >= this.maxCatchUpSpawns && this.timeToNext <= 0) this.timeToNext = 0;

    if (this.waitingForClear && this.alive <= 0) {
      const finishedIndex = this.currentIndex;
      const finishedWave = this.currentWave;
      events.push({
        type: 'wave-complete',
        waveIndex: finishedIndex,
        waveId: finishedWave.id,
        spawned: this.waveSpawned,
        defeated: this.waveDefeated,
      });
      this.active = false;
      if (this.autoAdvance) {
        const next = this.startNext();
        if (next) events.push(next);
        else events.push({ type: 'all-waves-complete', totalWaves: this.waves.length });
      } else if (finishedIndex >= this.waves.length - 1) {
        this.completed = true;
        events.push({ type: 'all-waves-complete', totalWaves: this.waves.length });
      }
    }

    return events;
  }

  progress() {
    const wave = this.currentWave;
    return {
      waveIndex: this.currentIndex,
      waveId: wave?.id || null,
      waveNumber: this.currentIndex >= 0 ? this.currentIndex + 1 : 0,
      totalWaves: this.waves.length,
      active: this.active,
      completed: this.completed,
      alive: this.alive,
      spawned: this.waveSpawned,
      defeated: this.waveDefeated,
      totalSpawned: this.totalSpawned,
      totalDefeated: this.totalDefeated,
      waitingForClear: this.waitingForClear,
      timeToNext: Math.max(0, this.timeToNext),
    };
  }

  snapshot() {
    return clone({
      currentIndex: this.currentIndex,
      active: this.active,
      completed: this.completed,
      groupIndex: this.groupIndex,
      spawnedInGroup: this.spawnedInGroup,
      alive: this.alive,
      waveSpawned: this.waveSpawned,
      waveDefeated: this.waveDefeated,
      totalSpawned: this.totalSpawned,
      totalDefeated: this.totalDefeated,
      waitingForClear: this.waitingForClear,
      timeToNext: this.timeToNext,
    });
  }

  restore(snapshot = {}) {
    const index = integer(snapshot.currentIndex, -1);
    if (index >= this.waves.length) throw new Error('wave snapshot index out of range');
    this.currentIndex = index;
    this.active = Boolean(snapshot.active) && index >= 0;
    this.completed = Boolean(snapshot.completed);
    this.groupIndex = Math.max(0, integer(snapshot.groupIndex, 0));
    this.spawnedInGroup = Math.max(0, integer(snapshot.spawnedInGroup, 0));
    this.alive = Math.max(0, integer(snapshot.alive, 0));
    this.waveSpawned = Math.max(0, integer(snapshot.waveSpawned, 0));
    this.waveDefeated = Math.max(0, integer(snapshot.waveDefeated, 0));
    this.totalSpawned = Math.max(0, integer(snapshot.totalSpawned, 0));
    this.totalDefeated = Math.max(0, integer(snapshot.totalDefeated, 0));
    this.waitingForClear = Boolean(snapshot.waitingForClear);
    this.timeToNext = finite(snapshot.timeToNext, 0);
    return this.progress();
  }

  reset() {
    this.currentIndex = -1;
    this.active = false;
    this.completed = false;
    this.groupIndex = 0;
    this.spawnedInGroup = 0;
    this.alive = 0;
    this.waveSpawned = 0;
    this.waveDefeated = 0;
    this.totalSpawned = 0;
    this.totalDefeated = 0;
    this.waitingForClear = false;
    this.timeToNext = 0;
    return this;
  }
}

if (typeof window !== 'undefined') window.JaewoonWaveSpawner = JaewoonWaveSpawner;
