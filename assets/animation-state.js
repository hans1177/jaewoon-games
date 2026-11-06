// 파일명: assets/animation-state.js
// 역할: 웹게임/Godot에서 공통으로 사용할 애니메이션 상태·프레임·재생 타이밍 관리
// 규칙: 그래픽 에셋과 게임 로직을 분리하고, 실제 프레임 수를 상태별로 관리

function clean(value) { return String(value ?? '').trim(); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

const DEFAULT_STATES = Object.freeze(['idle', 'move', 'attack', 'hit', 'death']);
const DEFAULT_FPS = Object.freeze({ idle: 5, move: 10, attack: 12, hit: 12, skill: 12, death: 8 });
const DEFAULT_FRAME_COUNTS = Object.freeze({ idle: 4, move: 8, attack: 6, hit: 4, skill: 6, death: 8 });

function positiveInt(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

export class JaewoonAnimationState {
  constructor({ states = DEFAULT_STATES, defaultState = 'idle', fps = {}, frameCounts = {} } = {}) {
    this.states = [...new Set((Array.isArray(states) ? states : DEFAULT_STATES).map(clean).filter(Boolean))];
    this.defaultState = this.states.includes(defaultState) ? defaultState : this.states[0] || 'idle';
    this.fps = Object.fromEntries(this.states.map((state) => [state, Math.max(1, Number(fps[state]) || DEFAULT_FPS[state] || 8)]));
    this.frameCounts = Object.fromEntries(this.states.map((state) => [state, positiveInt(frameCounts[state], DEFAULT_FRAME_COUNTS[state] || 1)]));
    this.state = this.defaultState;
    this.frame = 0;
    this.elapsed = 0;
    this.playing = true;
    this.once = false;
  }

  play(state, { restart = false, once = false } = {}) {
    const next = clean(state) || this.defaultState;
    if (!this.states.includes(next)) throw new Error(`unknown animation state: ${next}`);
    if (restart || this.state !== next) { this.state = next; this.frame = 0; this.elapsed = 0; }
    this.playing = true;
    this.once = Boolean(once);
    return this.snapshot();
  }

  stop() { this.playing = false; return this.snapshot(); }

  setFrameCount(state, count) {
    const key = clean(state);
    if (!this.states.includes(key)) throw new Error(`unknown animation state: ${key}`);
    this.frameCounts[key] = positiveInt(count);
    this.frame = Math.min(this.frame, this.frameCounts[key] - 1);
    return this.snapshot();
  }

  frameCount(state = this.state) {
    const key = clean(state);
    if (!this.states.includes(key)) return 1;
    return positiveInt(this.frameCounts[key], 1);
  }

  update(delta) {
    const dt = Math.max(0, Number(delta) || 0);
    if (!this.playing) return false;
    const count = this.frameCount(this.state);
    this.elapsed += dt;
    const frameDuration = 1 / Math.max(1, this.fps[this.state] || 8);
    let changed = false;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.frame += 1;
      changed = true;
      if (this.frame >= count) {
        if (this.once) {
          this.frame = count - 1;
          this.playing = false;
          break;
        }
        this.frame = 0;
      }
    }
    return changed;
  }

  snapshot() {
    return clone({
      state: this.state,
      frame: this.frame,
      elapsed: this.elapsed,
      playing: this.playing,
      once: this.once,
      states: this.states,
      fps: this.fps,
      frameCounts: this.frameCounts,
    });
  }

  restore(snapshot = {}) {
    const state = clean(snapshot.state);
    this.state = this.states.includes(state) ? state : this.defaultState;
    this.frame = Math.max(0, Number(snapshot.frame) || 0);
    this.elapsed = Math.max(0, Number(snapshot.elapsed) || 0);
    this.playing = snapshot.playing !== false;
    this.once = Boolean(snapshot.once);
    if (snapshot.frameCounts && typeof snapshot.frameCounts === 'object') {
      for (const key of this.states) if (snapshot.frameCounts[key] != null) this.frameCounts[key] = positiveInt(snapshot.frameCounts[key], this.frameCounts[key]);
    }
    this.frame = Math.min(this.frame, this.frameCount(this.state) - 1);
    return this.snapshot();
  }
}

export function createAnimationState(options = {}) { return new JaewoonAnimationState(options); }

if (typeof window !== 'undefined') {
  window.JaewoonAnimationState = JaewoonAnimationState;
  window.createJaewoonAnimationState = createAnimationState;
}
