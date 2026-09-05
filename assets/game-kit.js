import { JaewoonD20Rules } from './d20-rules.js';
import { JaewoonTurnCombat } from './turn-combat.js';
import { JaewoonCharacterProgression } from './character-progression.js';
import { JaewoonInventoryEquipment } from './inventory-equipment.js';
import { JaewoonQuestDialogue } from './quest-dialogue.js';
import { JaewoonSkillEffects } from './skill-effects.js';
import { JaewoonEconomyLootShop } from './economy-loot-shop.js';
import { JaewoonSaveVersioning } from './save-versioning.js';
import { JaewoonStatModifiers } from './stat-modifiers.js';
import { JaewoonCraftingRecipes } from './crafting-recipes.js';

function options(value) {
  if (value === true || value == null) return {};
  if (value === false) return null;
  if (typeof value !== 'object') throw new Error('system options must be an object, true, or false');
  return value;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class JaewoonGameKit {
  constructor({
    gameId = 'game',
    d20Rules = false,
    turnBasedCombat = false,
    characterProgression = false,
    inventoryEquipment = false,
    questDialogue = false,
    skillEffects = false,
    economySystems = false,
    statModifiers = false,
    craftingRecipes = false,
    versionedSave = false,
  } = {}) {
    this.gameId = String(gameId || 'game');
    this.systems = new Map();
    this.state = {};

    if (d20Rules) {
      this.systems.set('d20', new JaewoonD20Rules(options(d20Rules)));
    }

    if (turnBasedCombat) {
      const config = options(turnBasedCombat);
      const rules = config.rules ?? this.systems.get('d20') ?? null;
      this.systems.set('turnCombat', new JaewoonTurnCombat({ ...config, rules }));
    }

    if (characterProgression) {
      this.systems.set('progression', new JaewoonCharacterProgression(options(characterProgression)));
    }

    if (inventoryEquipment) {
      const config = options(inventoryEquipment);
      const system = new JaewoonInventoryEquipment(config);
      this.systems.set('inventory', system);
      this.state.inventory = system.createState(config.initialState || {});
    }

    if (questDialogue) {
      const config = options(questDialogue);
      const system = new JaewoonQuestDialogue();
      this.systems.set('quests', system);
      this.state.quests = system.createState(config.initialState || {});
    }

    if (skillEffects) {
      const config = options(skillEffects);
      const system = new JaewoonSkillEffects();
      this.systems.set('skills', system);
      this.state.skills = system.createState(config.initialState || {});
    }

    if (economySystems) {
      this.systems.set('economy', new JaewoonEconomyLootShop(options(economySystems)));
    }

    if (statModifiers) {
      const config = options(statModifiers);
      const system = new JaewoonStatModifiers();
      this.systems.set('stats', system);
      this.state.stats = system.createState(config.initialState || {});
    }

    if (craftingRecipes) {
      if (!this.systems.has('inventory')) throw new Error('crafting recipes require inventory equipment');
      const config = options(craftingRecipes);
      const system = new JaewoonCraftingRecipes({ ...config, inventory: this.systems.get('inventory') });
      this.systems.set('crafting', system);
      this.state.crafting = system.createState(config.initialState || {});
    }

    if (versionedSave) {
      this.systems.set('save', new JaewoonSaveVersioning(options(versionedSave)));
    }
  }

  has(name) {
    return this.systems.has(String(name));
  }

  get(name) {
    const key = String(name);
    if (!this.systems.has(key)) throw new Error(`game kit system not enabled: ${key}`);
    return this.systems.get(key);
  }

  enabledSystems() {
    return Object.freeze([...this.systems.keys()]);
  }

  snapshot(extra = {}) {
    return clone({
      gameId: this.gameId,
      systems: this.enabledSystems(),
      state: this.state,
      extra,
    });
  }

  wrapSave(extra = {}) {
    const payload = this.snapshot(extra);
    if (!this.has('save')) return payload;
    return this.get('save').wrap(payload, { gameId: this.gameId });
  }

  restoreState(snapshot = {}) {
    const payload = snapshot?.data && snapshot?.version ? snapshot.data : snapshot;
    if (payload?.gameId && String(payload.gameId) !== this.gameId) throw new Error('game id mismatch');
    const state = payload?.state || {};

    if (this.has('inventory')) this.state.inventory = this.get('inventory').createState(state.inventory || {});
    if (this.has('quests')) this.state.quests = this.get('quests').createState(state.quests || {});
    if (this.has('skills')) this.state.skills = this.get('skills').createState(state.skills || {});
    if (this.has('stats')) this.state.stats = this.get('stats').createState(state.stats || {});
    if (this.has('crafting')) this.state.crafting = this.get('crafting').createState(state.crafting || {});

    return this.state;
  }

  migrateAndRestore(savePayload) {
    const migrated = this.has('save') ? this.get('save').migrate(savePayload) : savePayload;
    this.restoreState(migrated);
    return migrated;
  }
}

export function createGameKit(options = {}) {
  return new JaewoonGameKit(options);
}

if (typeof window !== 'undefined') {
  window.JaewoonGameKit = JaewoonGameKit;
  window.createJaewoonGameKit = createGameKit;
}
