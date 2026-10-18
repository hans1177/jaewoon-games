function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, override) {
  if (!isPlainObject(base)) return deepClone(override ?? base);
  const out = deepClone(base);
  if (!isPlainObject(override)) return out;
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(out[key])) out[key] = mergeDeep(out[key], value);
    else out[key] = deepClone(value);
  }
  return out;
}

function getByPath(object, path, fallback) {
  const keys = Array.isArray(path) ? path : String(path).split('.').filter(Boolean);
  let current = object;
  for (const key of keys) {
    if (current == null || !(key in current)) return fallback;
    current = current[key];
  }
  return current;
}

function setByPath(object, path, value) {
  const keys = Array.isArray(path) ? path : String(path).split('.').filter(Boolean);
  if (!keys.length) throw new Error('config path is required');
  let current = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!isPlainObject(current[key])) current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = deepClone(value);
}

export class JaewoonGameConfig {
  constructor({ defaults = {}, values = {}, validators = {} } = {}) {
    this.defaults = deepClone(defaults);
    this.values = mergeDeep(this.defaults, values);
    this.validators = { ...validators };
    this.validateAll();
  }

  get(path, fallback) {
    return getByPath(this.values, path, fallback);
  }

  has(path) {
    return this.get(path, Symbol.for('jaewoon:missing')) !== Symbol.for('jaewoon:missing');
  }

  set(path, value) {
    this.validate(path, value);
    setByPath(this.values, path, value);
    return this.get(path);
  }

  patch(patch = {}) {
    const next = mergeDeep(this.values, patch);
    this.validateObject(next);
    this.values = next;
    return this.snapshot();
  }

  reset(path) {
    if (!path) {
      this.values = deepClone(this.defaults);
      this.validateAll();
      return this.snapshot();
    }
    const defaultValue = getByPath(this.defaults, path, Symbol.for('jaewoon:missing'));
    if (defaultValue === Symbol.for('jaewoon:missing')) throw new Error(`No default config for ${path}`);
    return this.set(path, defaultValue);
  }

  validate(path, value) {
    const validator = this.validators[path];
    if (!validator) return true;
    const result = validator(value, this.values);
    if (result === true || result == null) return true;
    throw new Error(typeof result === 'string' ? result : `Invalid config: ${path}`);
  }

  validateObject(object) {
    for (const [path, validator] of Object.entries(this.validators)) {
      const value = getByPath(object, path, Symbol.for('jaewoon:missing'));
      if (value === Symbol.for('jaewoon:missing')) continue;
      const result = validator(value, object);
      if (result !== true && result != null) {
        throw new Error(typeof result === 'string' ? result : `Invalid config: ${path}`);
      }
    }
    return true;
  }

  validateAll() {
    return this.validateObject(this.values);
  }

  snapshot() {
    return deepClone(this.values);
  }

  exportJSON(space = 2) {
    return JSON.stringify(this.values, null, space);
  }
}

export const configValidators = {
  number: ({ min = -Infinity, max = Infinity, integer = false } = {}) => (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'number required';
    if (integer && !Number.isInteger(value)) return 'integer required';
    if (value < min || value > max) return `number must be between ${min} and ${max}`;
    return true;
  },
  boolean: () => (value) => typeof value === 'boolean' || 'boolean required',
  string: ({ allowEmpty = true } = {}) => (value) => {
    if (typeof value !== 'string') return 'string required';
    if (!allowEmpty && !value.trim()) return 'non-empty string required';
    return true;
  },
  oneOf: (values = []) => (value) => values.includes(value) || `must be one of: ${values.join(', ')}`,
};

if (typeof window !== 'undefined') {
  window.JaewoonGameConfig = JaewoonGameConfig;
  window.JaewoonConfigValidators = configValidators;
}
