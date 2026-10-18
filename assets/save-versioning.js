function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function int(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : fallback; }

export class JaewoonSaveVersioning {
  constructor({ currentVersion = 1, migrations = {} } = {}) {
    this.currentVersion = Math.max(1, int(currentVersion, 1));
    this.migrations = new Map();
    for (const [from, migrate] of Object.entries(migrations || {})) this.registerMigration(Number(from), migrate);
  }

  registerMigration(fromVersion, migrate) {
    const from = Math.max(1, int(fromVersion, 1));
    if (typeof migrate !== 'function') throw new Error('migration must be a function');
    this.migrations.set(from, migrate);
    return this;
  }

  wrap(data, { gameId = 'game', meta = {} } = {}) {
    return {
      version: this.currentVersion,
      gameId: String(gameId || 'game'),
      savedAt: new Date().toISOString(),
      data: clone(data) || {},
      meta: clone(meta) || {},
    };
  }

  migrate(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('save payload is required');
    let working = clone(payload);
    let version = Math.max(1, int(working.version, 1));
    if (version > this.currentVersion) throw new Error(`save version ${version} is newer than supported ${this.currentVersion}`);
    while (version < this.currentVersion) {
      const migrate = this.migrations.get(version);
      if (!migrate) throw new Error(`missing save migration: ${version} -> ${version + 1}`);
      working = migrate(clone(working));
      if (!working || typeof working !== 'object') throw new Error(`invalid save migration result at version ${version}`);
      version += 1;
      working.version = version;
    }
    return working;
  }

  load(payload, { expectedGameId = null } = {}) {
    const migrated = this.migrate(payload);
    if (expectedGameId && migrated.gameId !== expectedGameId) throw new Error('save gameId mismatch');
    return clone(migrated.data) || {};
  }

  serialize(data, options = {}) { return JSON.stringify(this.wrap(data, options)); }
  deserialize(text, options = {}) { return this.load(JSON.parse(String(text || '{}')), options); }
}

if (typeof window !== 'undefined') window.JaewoonSaveVersioning = JaewoonSaveVersioning;
