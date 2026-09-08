// 파일명: assets/jaewoon-motion-engine.js
// 역할: Web 게임 공통 부드러운 모션/보간/반동/카메라 임펄스 엔진
// 원칙: authoritative gameplay state와 분리된 렌더 전용 계층
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.JaewoonMotionEngine = api;
    root.JaewoonMotionRig = api.JaewoonMotionRig;
    root.JaewoonCameraMotion = api.JaewoonCameraMotion;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = t => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

  const DEFAULT_PROFILE = Object.freeze({
    idleBreathAmplitude: 1,
    idleBreathFrequency: 1,
    moveBobAmplitude: 1,
    moveTiltAmplitude: 1,
    moveFrequency: 1,
    attackAnticipation: 1,
    attackStrike: 1,
    attackRotation: 1,
    attackStretch: 1,
    hitRecoil: 1,
    hitRotation: 1,
    landingSquash: 1,
    landingYOffset: 1,
    flashIntensity: 1,
    afterimageIntensity: 1,
    secondaryMotion: 1,
  });

  function normalizeMotionProfile(profile = {}) {
    const out = {};
    for (const [key, fallback] of Object.entries(DEFAULT_PROFILE)) {
      out[key] = clamp(finite(profile[key], fallback), 0, 2);
    }
    return Object.freeze(out);
  }

  class MotionSpring {
    constructor(value = 0, { stiffness = 210, damping = 25, maxVelocity = 4000 } = {}) {
      this.value = finite(value);
      this.target = this.value;
      this.velocity = 0;
      this.stiffness = Math.max(1, finite(stiffness, 210));
      this.damping = Math.max(0, finite(damping, 25));
      this.maxVelocity = Math.max(1, finite(maxVelocity, 4000));
    }
    snap(value) {
      this.value = this.target = finite(value, this.value);
      this.velocity = 0;
      return this.value;
    }
    setTarget(value) {
      this.target = finite(value, this.target);
      return this.target;
    }
    impulse(amount) {
      this.velocity = clamp(this.velocity + finite(amount), -this.maxVelocity, this.maxVelocity);
      return this.velocity;
    }
    update(dt) {
      let remain = clamp(finite(dt), 0, 0.1);
      while (remain > 0) {
        const step = Math.min(remain, 1 / 120);
        const accel = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
        this.velocity = clamp(this.velocity + accel * step, -this.maxVelocity, this.maxVelocity);
        this.value += this.velocity * step;
        remain -= step;
      }
      return this.value;
    }
  }

  class JaewoonMotionRig {
    constructor(options = {}) {
      const spring = options.spring || {};
      this.channels = {
        x: new MotionSpring(finite(options.x), spring),
        y: new MotionSpring(finite(options.y), spring),
        rotation: new MotionSpring(finite(options.rotation), { stiffness: 190, damping: 24, ...spring }),
        scaleX: new MotionSpring(finite(options.scaleX, 1), { stiffness: 240, damping: 28, ...spring }),
        scaleY: new MotionSpring(finite(options.scaleY, 1), { stiffness: 240, damping: 28, ...spring }),
        alpha: new MotionSpring(finite(options.alpha, 1), { stiffness: 220, damping: 30, ...spring }),
      };
      this.time = 0;
      this.motionScale = clamp(finite(options.motionScale, 1), 0, 2);
      this.reducedMotion = Boolean(options.reducedMotion);
      this.lowPower = Boolean(options.lowPower);
      this.profile = normalizeMotionProfile(options.profile || options.motionProfile || {});
      this.moving = false;
      this.speed = 0;
      this.facing = 1;
      this.attack = { time: 0, duration: 0.24, strength: 1 };
      this.hit = { time: 0, duration: 0.16, direction: -1, strength: 1 };
      this.land = { time: 0, duration: 0.2, strength: 1 };
      this.flash = 0;
      this.history = [];
      this.maxHistory = Math.max(2, Math.floor(finite(options.afterimageSamples, 8)));
      this.lastSample = this.sample();
    }

    setReducedMotion(enabled) { this.reducedMotion = Boolean(enabled); return this; }
    setLowPower(enabled) { this.lowPower = Boolean(enabled); return this; }
    setMotionScale(value) { this.motionScale = clamp(finite(value, 1), 0, 2); return this; }
    setProfile(profile = {}) { this.profile = normalizeMotionProfile(profile); return this; }
    getProfile() { return { ...this.profile }; }

    setBasePose(pose = {}, { snap = false } = {}) {
      for (const key of ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'alpha']) {
        if (pose[key] == null) continue;
        if (snap) this.channels[key].snap(pose[key]);
        else this.channels[key].setTarget(pose[key]);
      }
      return this;
    }

    setMotionState({ moving = this.moving, speed = this.speed, facing = this.facing } = {}) {
      this.moving = Boolean(moving);
      this.speed = Math.max(0, finite(speed));
      this.facing = finite(facing, 1) < 0 ? -1 : 1;
      return this;
    }

    triggerAttack({ strength = 1, duration = 0.24 } = {}) {
      this.attack = { time: Math.max(0.08, finite(duration, 0.24)), duration: Math.max(0.08, finite(duration, 0.24)), strength: clamp(finite(strength, 1), 0, 3) };
      return this;
    }

    triggerHit({ direction = -1, strength = 1, duration = 0.16 } = {}) {
      this.hit = { time: Math.max(0.06, finite(duration, 0.16)), duration: Math.max(0.06, finite(duration, 0.16)), direction: finite(direction, -1) < 0 ? -1 : 1, strength: clamp(finite(strength, 1), 0, 3) };
      this.flash = this.profile.flashIntensity;
      return this;
    }

    triggerLand({ strength = 1, duration = 0.2 } = {}) {
      this.land = { time: Math.max(0.08, finite(duration, 0.2)), duration: Math.max(0.08, finite(duration, 0.2)), strength: clamp(finite(strength, 1), 0, 3) };
      return this;
    }

    impulse({ x = 0, y = 0, rotation = 0, scaleX = 0, scaleY = 0 } = {}) {
      const secondary = this.profile.secondaryMotion;
      this.channels.x.impulse(x * secondary);
      this.channels.y.impulse(y * secondary);
      this.channels.rotation.impulse(rotation * secondary);
      this.channels.scaleX.impulse(scaleX * secondary);
      this.channels.scaleY.impulse(scaleY * secondary);
      return this;
    }

    update(dt) {
      const delta = clamp(finite(dt), 0, 0.1);
      this.time += delta;
      for (const spring of Object.values(this.channels)) spring.update(delta);
      this.attack.time = Math.max(0, this.attack.time - delta);
      this.hit.time = Math.max(0, this.hit.time - delta);
      this.land.time = Math.max(0, this.land.time - delta);
      this.flash = Math.max(0, this.flash - delta * 8);
      this.lastSample = this.sample();
      this.history.unshift({ ...this.lastSample, age: 0 });
      this.history = this.history.slice(0, this.maxHistory).map((entry, index) => ({ ...entry, age: index / Math.max(1, this.maxHistory - 1) }));
      return this.lastSample;
    }

    effectScale() {
      const reduced = this.reducedMotion ? 0.28 : 1;
      const lowPower = this.lowPower ? 0.65 : 1;
      return this.motionScale * reduced * lowPower;
    }

    sample() {
      const k = this.effectScale();
      const pfx = this.profile;
      const moveIntensity = this.moving ? clamp(this.speed / 220, 0.25, 1.2) : 0;
      const idleBreath = Math.sin(this.time * TAU * 0.72 * pfx.idleBreathFrequency) * 0.018 * k * pfx.idleBreathAmplitude;
      const moveBob = Math.sin(this.time * TAU * (2.8 + moveIntensity) * pfx.moveFrequency) * 3.2 * moveIntensity * k * pfx.moveBobAmplitude;
      const moveTilt = Math.sin(this.time * TAU * (1.4 + moveIntensity * 0.6) * pfx.moveFrequency) * 0.035 * moveIntensity * k * pfx.moveTiltAmplitude;

      let attackX = 0, attackRot = 0, attackScaleX = 0, attackScaleY = 0;
      if (this.attack.time > 0) {
        const p = 1 - this.attack.time / this.attack.duration;
        const s = this.attack.strength * k;
        if (p < 0.34) {
          const q = smoothstep(p / 0.34);
          attackX = -this.facing * 8 * q * s * pfx.attackAnticipation;
          attackRot = -this.facing * 0.08 * q * s * pfx.attackRotation;
          attackScaleX = -0.045 * q * s * pfx.attackStretch;
          attackScaleY = 0.04 * q * s * pfx.attackStretch;
        } else if (p < 0.62) {
          const q = smoothstep((p - 0.34) / 0.28);
          attackX = this.facing * lerp(-8 * pfx.attackAnticipation, 16 * pfx.attackStrike, q) * s;
          attackRot = this.facing * lerp(-0.08, 0.12, q) * s * pfx.attackRotation;
          attackScaleX = lerp(-0.045, 0.08, q) * s * pfx.attackStretch;
          attackScaleY = lerp(0.04, -0.06, q) * s * pfx.attackStretch;
        } else {
          const q = 1 - smoothstep((p - 0.62) / 0.38);
          attackX = this.facing * 16 * q * s * pfx.attackStrike;
          attackRot = this.facing * 0.12 * q * s * pfx.attackRotation;
          attackScaleX = 0.08 * q * s * pfx.attackStretch;
          attackScaleY = -0.06 * q * s * pfx.attackStretch;
        }
      }

      let hitX = 0, hitRot = 0;
      if (this.hit.time > 0) {
        const p = this.hit.time / this.hit.duration;
        const wave = Math.sin((1 - p) * Math.PI * 3.4) * p;
        hitX = this.hit.direction * 10 * wave * this.hit.strength * k * pfx.hitRecoil;
        hitRot = this.hit.direction * 0.09 * wave * this.hit.strength * k * pfx.hitRotation;
      }

      let landScaleX = 0, landScaleY = 0, landY = 0;
      if (this.land.time > 0) {
        const p = 1 - this.land.time / this.land.duration;
        const pulse = Math.sin(p * Math.PI) * this.land.strength * k;
        landScaleX = 0.08 * pulse * pfx.landingSquash;
        landScaleY = -0.11 * pulse * pfx.landingSquash;
        landY = 4 * pulse * pfx.landingYOffset;
      }

      return {
        x: this.channels.x.value + attackX + hitX,
        y: this.channels.y.value + moveBob + landY,
        rotation: this.channels.rotation.value + moveTilt + attackRot + hitRot,
        scaleX: Math.max(0.05, this.channels.scaleX.value * (1 + idleBreath + attackScaleX + landScaleX)),
        scaleY: Math.max(0.05, this.channels.scaleY.value * (1 - idleBreath + attackScaleY + landScaleY)),
        alpha: clamp(this.channels.alpha.value, 0, 1),
        flash: clamp(this.flash, 0, 1),
        moving: this.moving,
        reducedMotion: this.reducedMotion,
        profileVersion: 1,
      };
    }

    afterimages({ count = 4, alpha = 0.22 } = {}) {
      const n = Math.min(this.history.length, Math.max(0, Math.floor(count)));
      const intensity = this.profile.afterimageIntensity;
      return this.history.slice(1, n + 1).map((sample, index) => ({
        ...sample,
        alpha: clamp(alpha * intensity * (1 - index / Math.max(1, n)), 0, 1),
      }));
    }
  }

  class JaewoonCameraMotion {
    constructor(options = {}) {
      this.x = new MotionSpring(0, { stiffness: 260, damping: 30, ...(options.spring || {}) });
      this.y = new MotionSpring(0, { stiffness: 260, damping: 30, ...(options.spring || {}) });
      this.rotation = new MotionSpring(0, { stiffness: 240, damping: 28, ...(options.spring || {}) });
      this.reducedMotion = Boolean(options.reducedMotion);
      this.lowPower = Boolean(options.lowPower);
      this.motionScale = clamp(finite(options.motionScale, 1), 0, 2);
    }
    setReducedMotion(v) { this.reducedMotion = Boolean(v); return this; }
    setLowPower(v) { this.lowPower = Boolean(v); return this; }
    setMotionScale(v) { this.motionScale = clamp(finite(v, 1), 0, 2); return this; }
    impulse({ x = 0, y = 0, rotation = 0 } = {}) {
      const k = (this.reducedMotion ? 0.22 : this.lowPower ? 0.65 : 1) * this.motionScale;
      this.x.impulse(finite(x) * k);
      this.y.impulse(finite(y) * k);
      this.rotation.impulse(finite(rotation) * k);
      return this;
    }
    update(dt) {
      this.x.setTarget(0); this.y.setTarget(0); this.rotation.setTarget(0);
      return { x: this.x.update(dt), y: this.y.update(dt), rotation: this.rotation.update(dt) };
    }
  }

  function createMotionRig(options = {}) { return new JaewoonMotionRig(options); }
  function createCameraMotion(options = {}) { return new JaewoonCameraMotion(options); }

  return {
    version: 2,
    profileVersion: 1,
    DEFAULT_PROFILE,
    normalizeMotionProfile,
    MotionSpring,
    JaewoonMotionRig,
    JaewoonCameraMotion,
    createMotionRig,
    createCameraMotion,
    utils: { clamp, lerp, smoothstep },
  };
});
