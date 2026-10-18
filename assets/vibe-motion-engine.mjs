// Shared motion engine. No renderer dependency; games supply adapters and input.
export class VibeMotionEngine {
  constructor(design, adapter = {}) {
    if (!design?.motionSystem) throw new Error('motionSystem required');
    this.design = design.motionSystem;
    this.adapter = adapter;
    this.state = 'idle';
    this.previous = null;
    this.elapsed = 0;
    this.time = 0;
    this.sequence = 0;
    this.events = [];
    this.speed = 0;
    this.direction = 0;
    this.genre = 'realistic';
    this.paused = false;
    this.transition = null;
    this.actionQueue = [];
    this.cooldowns = new Map();
    this.clipEvents = new Map();
    this.maxQueuedActions = 8;
  }
  setGenre(genre) {
    if (!Object.hasOwn(this.design.genreOverrides, genre)) throw new Error('Unknown genre');
    this.genre = genre;
    this.adapter.setGenre?.(genre, this.design.genreOverrides[genre]);
  }
  allowed(state) {
    return [...this.design.locomotion.states, ...this.design.combat.states, ...this.design.interaction.states].includes(state);
  }
  enter(state, {force = false, durationMs} = {}) {
    if (!this.allowed(state)) throw new Error('Unknown motion state: ' + state);
    if (state === this.state && !force) return false;
    const previous = this.state;
    this.previous = previous;
    this.state = state;
    this.elapsed = 0;
    const defaultMs = this.design.locomotion.transitions.defaultBlendMs;
    const duration = Math.max(0, Math.min(1000, durationMs ?? defaultMs)) / 1000;
    this.transition = {from: previous, to: state, elapsed: 0, duration};
    this.emit('state-change', {from: previous, to: state});
    this.adapter.play?.(state, {previous, blendSeconds: duration, genre: this.genre});
    return true;
  }
  registerClipEvents(state, events) {
    if (!this.allowed(state) || !Array.isArray(events)) throw Error('Invalid clip events');
    this.clipEvents.set(state, events.filter(e => Number.isFinite(e.at) && e.at >= 0 && typeof e.type === 'string').sort((a,b)=>a.at-b.at));
  }
  queueAction(state, {priority = 0, cooldown = 0, durationMs} = {}) {
    if (!this.allowed(state)) throw Error('Unknown motion state');
    if (this.actionQueue.length >= this.maxQueuedActions) return false;
    this.actionQueue.push({state, priority, cooldown, durationMs, order: this.sequence++});
    this.actionQueue.sort((a,b)=>b.priority-a.priority||a.order-b.order);
    return true;
  }
  flushActions() {
    const remaining = [];
    for (const action of this.actionQueue) {
      if ((this.cooldowns.get(action.state) ?? 0) > this.time) {remaining.push(action);continue;}
      this.enter(action.state,{durationMs:action.durationMs,force:true});
      if (action.cooldown > 0) this.cooldowns.set(action.state,this.time+action.cooldown);
      this.actionQueue = remaining.concat(this.actionQueue.slice(this.actionQueue.indexOf(action)+1));
      return action.state;
    }
    this.actionQueue = remaining;
    return null;
  }
  emit(type, payload = {}) {
    const event = {id: ++this.sequence, type, state: this.state, time: this.time, ...payload};
    this.events.push(event);
    this.adapter.onEvent?.(event);
    return event;
  }
  consumeEvents() {return this.events.splice(0);}
  setMovement({speed = 0, direction = 0, grounded = true, crouching = false} = {}) {
    this.speed = Math.max(0, Number.isFinite(speed) ? speed : 0);
    this.direction = Number.isFinite(direction) ? direction : 0;
    if (!grounded) this.enter('fall');
    else if (crouching) this.enter(this.speed > 0.05 ? 'crouch-walk' : 'crouch');
    else this.enter(this.speed < 0.05 ? 'idle' : this.speed < 0.4 ? 'walk' : this.speed < 0.8 ? 'jog' : 'sprint');
    this.adapter.setBlend?.({speed: this.speed, direction: this.direction});
  }
  update(dt) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    const delta = Math.min(dt, 0.1);
    this.time += delta;
    const before = this.elapsed;
    this.elapsed += delta;
    for (const event of this.clipEvents.get(this.state) ?? []) {
      if (event.at > before && event.at <= this.elapsed) this.emit(event.type,{clipTime:event.at});
    }
    if (this.actionQueue.length && (!this.transition || this.transition.elapsed >= this.transition.duration)) this.flushActions();
    if (this.transition) {
      this.transition.elapsed += delta;
      const {elapsed, duration} = this.transition;
      const weight = duration ? Math.min(1, elapsed / duration) : 1;
      this.adapter.setTransition?.(this.transition.from, this.transition.to, weight);
      if (weight === 1) this.transition = null;
    }
    this.adapter.update?.(delta, this.state);
  }
  setPaused(value) {this.paused = !!value;}
  snapshot() {return {state: this.state, genre: this.genre, elapsed: this.elapsed, speed: this.speed, direction: this.direction};}
}
export function createFixedStepMotionLoop(engine, {hz = 60, maxSteps = 5} = {}) {
  const step = 1 / Math.max(1, Math.min(120, hz));
  let accumulator = 0;
  return (deltaSeconds) => {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
    accumulator = Math.min(step * maxSteps, accumulator + Math.min(deltaSeconds, .25));
    let steps = 0;
    while (accumulator >= step && steps < maxSteps) {engine.update(step);accumulator -= step;steps++;}
    return steps;
  };
}
