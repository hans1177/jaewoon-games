// 파일명: assets/projectiles.js
// 역할: 공통 투사체 이동/수명/유도/충돌 시스템
// 규칙: 피해 계산과 게임 밸런스는 각 게임/전투 시스템이 소유한다.

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function point(value = {}) {
  return {
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
  };
}

function normalizeProjectile(projectile = {}) {
  const id = String(projectile.id || '').trim();
  if (!id) throw new Error('projectile id required');

  const position = point(projectile.position);
  const velocity = point(projectile.velocity);
  const speed = finiteNonNegative(projectile.speed, Math.hypot(velocity.x, velocity.y));
  const velocityLength = Math.hypot(velocity.x, velocity.y);
  const direction = velocityLength > 0
    ? { x: velocity.x / velocityLength, y: velocity.y / velocityLength }
    : { x: 0, y: 0 };

  return {
    id,
    sourceId: projectile.sourceId == null ? null : String(projectile.sourceId),
    targetId: projectile.targetId == null ? null : String(projectile.targetId),
    team: projectile.team == null ? null : String(projectile.team),
    position,
    velocity: {
      x: direction.x * speed,
      y: direction.y * speed,
    },
    speed,
    lifetime: finiteNonNegative(projectile.lifetime, 5),
    remaining: finiteNonNegative(projectile.remaining ?? projectile.lifetime, projectile.lifetime ?? 5),
    radius: finiteNonNegative(projectile.radius, 0),
    hitRadius: finiteNonNegative(projectile.hitRadius, 0),
    homing: Boolean(projectile.homing),
    homingStrength: finiteNonNegative(projectile.homingStrength, 0),
    destroyOnHit: projectile.destroyOnHit !== false,
    maxHits: Math.max(1, Math.floor(finiteNonNegative(projectile.maxHits, 1))),
    hits: Array.isArray(projectile.hits) ? projectile.hits.map(String) : [],
    tags: Array.isArray(projectile.tags) ? projectile.tags.map(String) : [],
    meta: clone(projectile.meta || {}) || {},
  };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function moveTowards(current, target, maxDistance) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0 || maxDistance <= 0) return { ...current };
  if (distance <= maxDistance) return { x: target.x, y: target.y };
  const scale = maxDistance / distance;
  return { x: current.x + dx * scale, y: current.y + dy * scale };
}

export class JaewoonProjectiles {
  constructor({ projectiles = [], paused = false } = {}) {
    this.projectiles = new Map();
    this.paused = Boolean(paused);
    for (const projectile of projectiles || []) this.spawn(projectile);
  }

  spawn(projectile = {}) {
    const normalized = normalizeProjectile(projectile);
    if (normalized.remaining <= 0) throw new Error('projectile lifetime must be > 0');
    this.projectiles.set(normalized.id, normalized);
    return clone(normalized);
  }

  get(id) {
    const projectile = this.projectiles.get(String(id));
    return projectile ? clone(projectile) : null;
  }

  list() {
    return Object.freeze([...this.projectiles.values()].map(clone));
  }

  remove(id, reason = 'removed') {
    const key = String(id);
    const projectile = this.projectiles.get(key);
    if (!projectile) return null;
    this.projectiles.delete(key);
    return Object.freeze({
      type: 'projectile-removed',
      projectileId: key,
      reason: String(reason),
    });
  }

  setPaused(value) {
    this.paused = Boolean(value);
    return this.paused;
  }

  update(delta, {
    getTarget = null,
    getTargetIds = null,
    canHit = null,
    onHit = null,
  } = {}) {
    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('delta must be a finite number >= 0');
    if (this.paused || amount === 0) return [];

    const events = [];
    for (const projectile of [...this.projectiles.values()]) {
      if (!this.projectiles.has(projectile.id)) continue;

      projectile.remaining = Math.max(0, projectile.remaining - amount);
      if (projectile.remaining <= 0) {
        this.projectiles.delete(projectile.id);
        events.push(Object.freeze({ type: 'projectile-expired', projectileId: projectile.id }));
        continue;
      }

      if (projectile.homing && projectile.targetId != null && typeof getTarget === 'function') {
        const target = getTarget(projectile.targetId, projectile);
        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
          const desired = {
            x: target.x - projectile.position.x,
            y: target.y - projectile.position.y,
          };
          const length = Math.hypot(desired.x, desired.y);
          if (length > 0 && projectile.speed > 0) {
            const desiredVelocity = {
              x: desired.x / length * projectile.speed,
              y: desired.y / length * projectile.speed,
            };
            projectile.velocity.x = moveTowards(
              projectile.velocity,
              desiredVelocity,
              projectile.homingStrength * amount,
            ).x;
            projectile.velocity.y = moveTowards(
              projectile.velocity,
              desiredVelocity,
              projectile.homingStrength * amount,
            ).y;

            const velocityLength = Math.hypot(projectile.velocity.x, projectile.velocity.y);
            if (velocityLength > 0 && projectile.speed > 0) {
              projectile.velocity.x = projectile.velocity.x / velocityLength * projectile.speed;
              projectile.velocity.y = projectile.velocity.y / velocityLength * projectile.speed;
            }
          }
        }
      }

      projectile.position.x += projectile.velocity.x * amount;
      projectile.position.y += projectile.velocity.y * amount;

      if (typeof getTargetIds !== 'function') continue;
      const targetIds = getTargetIds(projectile) || [];
      for (const rawTargetId of targetIds) {
        if (!this.projectiles.has(projectile.id)) break;
        const targetId = String(rawTargetId);
        if (projectile.hits.includes(targetId)) continue;

        const target = typeof getTarget === 'function' ? getTarget(targetId, projectile) : null;
        if (!target || target.dead || target.targetable === false) continue;
        if (projectile.team != null && target.team != null && projectile.team === String(target.team)) continue;
        if (typeof canHit === 'function' && !canHit(projectile, target)) continue;
        if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) continue;

        const targetRadius = finiteNonNegative(target.radius, 0);
        const collisionRadius = projectile.radius + projectile.hitRadius + targetRadius;
        if (distanceSquared(projectile.position, target) > collisionRadius * collisionRadius) continue;

        projectile.hits.push(targetId);
        projectile.hits = projectile.hits.slice(-projectile.maxHits);

        const event = Object.freeze({
          type: 'projectile-hit',
          projectileId: projectile.id,
          sourceId: projectile.sourceId,
          targetId,
          position: clone(projectile.position),
          tags: Object.freeze([...projectile.tags]),
          meta: clone(projectile.meta),
        });
        events.push(event);
        if (typeof onHit === 'function') onHit(event, clone(projectile), clone(target));

        if (projectile.destroyOnHit || projectile.hits.length >= projectile.maxHits) {
          this.projectiles.delete(projectile.id);
          events.push(Object.freeze({
            type: 'projectile-removed',
            projectileId: projectile.id,
            reason: 'hit',
          }));
        }
      }
    }
    return events;
  }

  snapshot() {
    return clone({
      version: 1,
      paused: this.paused,
      projectiles: [...this.projectiles.values()],
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('projectile snapshot required');
    this.projectiles.clear();
    this.paused = Boolean(snapshot.paused);
    for (const projectile of Array.isArray(snapshot.projectiles) ? snapshot.projectiles : []) {
      const normalized = normalizeProjectile(projectile);
      if (normalized.remaining > 0) this.projectiles.set(normalized.id, normalized);
    }
    return this.snapshot();
  }

  reset() {
    this.projectiles.clear();
    this.paused = false;
    return this.snapshot();
  }
}

if (typeof window !== 'undefined') window.JaewoonProjectiles = JaewoonProjectiles;
