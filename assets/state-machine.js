function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeState(name, definition = {}) {
  return {
    name: String(name),
    enter: typeof definition.enter === 'function' ? definition.enter : null,
    exit: typeof definition.exit === 'function' ? definition.exit : null,
    update: typeof definition.update === 'function' ? definition.update : null,
    canEnter: typeof definition.canEnter === 'function' ? definition.canEnter : null,
    canExit: typeof definition.canExit === 'function' ? definition.canExit : null,
    transitions: definition.transitions == null
      ? null
      : new Set(Array.isArray(definition.transitions) ? definition.transitions.map(String) : [String(definition.transitions)]),
    meta: clone(definition.meta || {}) || {},
  };
}

export class JaewoonStateMachine {
  constructor({ id = 'state-machine', states = {}, initial = null, context = {}, historyLimit = 32 } = {}) {
    this.id = String(id || 'state-machine');
    this.states = new Map();
    this.current = null;
    this.previous = null;
    this.context = context && typeof context === 'object' ? context : {};
    this.history = [];
    this.historyLimit = Math.max(0, Math.floor(Number(historyLimit) || 0));
    this.transitioning = false;

    for (const [name, definition] of Object.entries(states || {})) this.register(name, definition);
    if (initial != null) this.setInitial(initial);
  }

  register(name, definition = {}) {
    const key = String(name || '').trim();
    if (!key) throw new Error('state name required');
    const state = normalizeState(key, definition);
    this.states.set(key, state);
    return state;
  }

  unregister(name) {
    const key = String(name || '');
    if (key === this.current) throw new Error('cannot remove current state');
    return this.states.delete(key);
  }

  has(name) { return this.states.has(String(name)); }
  state(name = this.current) { return this.states.get(String(name)) || null; }
  is(name) { return this.current === String(name); }

  setInitial(name, data = null) {
    if (this.current != null) throw new Error('initial state already set');
    const key = String(name || '');
    const target = this.state(key);
    if (!target) throw new Error(`unknown state: ${key}`);
    this.current = key;
    if (target.enter) target.enter({ machine: this, from: null, to: key, data, context: this.context, initial: true });
    return this.current;
  }

  can(name, data = null) {
    const to = String(name || '');
    const target = this.state(to);
    if (!target) return false;
    if (to === this.current) return true;

    const source = this.state(this.current);
    if (source?.transitions && !source.transitions.has(to)) return false;
    const payload = { machine: this, from: this.current, to, data, context: this.context };
    if (source?.canExit && source.canExit(payload) === false) return false;
    if (target.canEnter && target.canEnter(payload) === false) return false;
    return true;
  }

  transition(name, data = null, { force = false, reenter = false } = {}) {
    const to = String(name || '');
    const target = this.state(to);
    if (!target) throw new Error(`unknown state: ${to}`);
    if (this.transitioning) throw new Error('state transition already in progress');
    if (!reenter && to === this.current) return this.current;
    if (!force && !this.can(to, data)) throw new Error(`transition blocked: ${this.current ?? 'null'} -> ${to}`);

    const from = this.current;
    const source = this.state(from);
    const payload = { machine: this, from, to, data, context: this.context };
    this.transitioning = true;
    try {
      if (source?.exit) source.exit(payload);
      if (from != null && this.historyLimit > 0) {
        this.history.push(from);
        if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
      }
      this.previous = from;
      this.current = to;
      if (target.enter) target.enter(payload);
      return this.current;
    } finally {
      this.transitioning = false;
    }
  }

  back(data = null) {
    const target = this.history.pop();
    if (target == null) return this.current;
    return this.transition(target, data, { force: true });
  }

  update(delta, data = null) {
    const current = this.state();
    if (!current?.update) return null;
    return current.update({
      machine: this,
      state: this.current,
      delta: Math.max(0, Number(delta) || 0),
      data,
      context: this.context,
    });
  }

  setContext(key, value) {
    this.context[String(key)] = value;
    return value;
  }

  snapshot() {
    return {
      version: 1,
      id: this.id,
      current: this.current,
      previous: this.previous,
      history: [...this.history],
      context: clone(this.context) || {},
    };
  }

  restore(snapshot = {}, { callEnter = false } = {}) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    const current = snapshot.current == null ? null : String(snapshot.current);
    if (current != null && !this.has(current)) throw new Error(`unknown restore state: ${current}`);
    const history = Array.isArray(snapshot.history) ? snapshot.history.map(String).filter((name) => this.has(name)) : [];
    this.current = current;
    this.previous = snapshot.previous == null ? null : String(snapshot.previous);
    this.history = this.historyLimit > 0 ? history.slice(-this.historyLimit) : [];
    this.context = snapshot.context && typeof snapshot.context === 'object' ? clone(snapshot.context) : {};
    if (callEnter && current != null) {
      const state = this.state(current);
      if (state?.enter) state.enter({ machine: this, from: null, to: current, data: null, context: this.context, restore: true });
    }
    return true;
  }

  reset({ keepContext = false } = {}) {
    this.current = null;
    this.previous = null;
    this.history.length = 0;
    this.transitioning = false;
    if (!keepContext) this.context = {};
  }
}

export function createStateMachine(options = {}) {
  return new JaewoonStateMachine(options);
}

if (typeof window !== 'undefined') {
  window.JaewoonStateMachine = JaewoonStateMachine;
  window.createJaewoonStateMachine = createStateMachine;
}
