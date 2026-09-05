const COMMON = Object.freeze({
  systems: ['save','pause','settings','audio','touch','keyboard','errors'],
  assets: ['ui','icons','font','sfx'],
  qa: ['boot','restart','save-load','touch','audio','console-errors'],
});

export const GAME_PRESETS = Object.freeze({
  rpg: {
    systems: ['inventory','equipment','quests','dialogue','npc','combat','progression','shops'],
    assets: ['player','npc','enemies','items','equipment','portraits','tiles','bgm','vfx'],
    qa: ['inventory-persistence','quest-progression','dialogue-flow','combat-progression'],
  },
  defense: {
    systems: ['waves','spawning','targeting','towers','shop','upgrades','bosses'],
    assets: ['enemies','towers','projectiles','map','wave-ui','bgm','vfx'],
    qa: ['wave-progression','spawn-limits','targeting','boss-clear','shop-flow'],
  },
  survival: {
    systems: ['day-night','gathering','crafting','inventory','equipment','spawning','status-effects'],
    assets: ['player','resources','enemies','items','crafting-ui','environment','bgm','ambience'],
    qa: ['day-night-loop','crafting-costs','inventory-persistence','spawn-rules'],
  },
  strategy: {
    systems: ['territories','units','resources','ai-opponents','battle-resolution','camera','selection'],
    assets: ['map','units','buildings','resource-icons','battle-vfx','bgm'],
    qa: ['selection','territory-state','battle-resolution','resource-flow'],
  },
  action: {
    systems: ['movement','combat','skills','cooldowns','enemies','bosses','checkpoints'],
    assets: ['player','enemies','bosses','weapons','animations','vfx','bgm','sfx'],
    qa: ['controls','hit-detection','cooldowns','death-restart','boss-clear'],
  },
  adventure: {
    systems: ['movement','interaction','dialogue','quests','checkpoints','collectibles'],
    assets: ['player','npc','environment','props','portraits','bgm','ambience'],
    qa: ['interaction','dialogue-flow','checkpoint-restore','progression'],
  },
  puzzle: {
    systems: ['input','levels','undo','restart','win-condition','progress'],
    assets: ['tiles','ui','icons','bgm','sfx'],
    qa: ['win-condition','restart','level-progression','save-load'],
  },
});

function unique(items) { return [...new Set(items)]; }
function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function without(items, blocked) {
  const denied = new Set(list(blocked));
  return items.filter((item) => !denied.has(item));
}
function getPreset(genre) {
  const key = String(genre || '').toLowerCase();
  const preset = GAME_PRESETS[key];
  if (!preset) throw new Error(`Unknown game preset: ${genre}`);
  return { key, preset };
}

export function buildGamePreset({
  genre,
  mixGenres = [],
  multiplayer = false,
  aiCompanions = false,
  npcDialogue = false,
  d20Rules = false,
  turnBasedCombat = false,
  characterProgression = false,
  inventoryEquipment = false,
  questDialogue = false,
  skillEffects = false,
  economySystems = false,
  versionedSave = false,
  extras = {},
  remove = {},
} = {}) {
  const { key, preset: base } = getPreset(genre);
  const mixedKeys = unique(list(mixGenres).map((item) => String(item).toLowerCase()).filter((item) => item !== key));
  const mixed = mixedKeys.map((item) => getPreset(item).preset);

  let systems = [...COMMON.systems, ...base.systems, ...mixed.flatMap((item) => item.systems)];
  let assets = [...COMMON.assets, ...base.assets, ...mixed.flatMap((item) => item.assets)];
  let qa = [...COMMON.qa, ...base.qa, ...mixed.flatMap((item) => item.qa)];

  if (multiplayer) {
    systems.push('multiplayer-client','matchmaking','reconnect','session-cleanup');
    qa.push('multiplayer-connect','disconnect-reconnect');
  }
  if (aiCompanions) {
    systems.push('common-ai','companion-orders','target-selection');
    qa.push('ai-fallback','ai-targeting');
  }
  if (npcDialogue) {
    systems.push('npc-dialogue','gemini-helper','local-dialogue-fallback');
    qa.push('dialogue-fallback');
  }
  if (d20Rules) {
    systems.push('d20-rules','dice','ability-modifiers','skill-checks','saving-throws','initiative','attack-rolls','critical-hits','conditions');
    assets.push('dice-ui','status-icons');
    qa.push('d20-rolls','advantage-disadvantage','critical-rules','combatant-hp','conditions');
  }
  if (turnBasedCombat) {
    systems.push('turn-combat','turn-order','rounds','combat-actions','combat-log','timed-conditions');
    assets.push('turn-ui','target-indicators','status-icons');
    qa.push('turn-order','round-advance','defeated-skip','combat-end','timed-conditions');
  }
  if (characterProgression) {
    systems.push('character-progression','xp','levels','attributes','resources','stat-points','skill-points','character-snapshots');
    assets.push('level-ui','xp-bar','stat-icons');
    qa.push('xp-gain','level-up','point-spending','resource-clamp','progression-snapshot');
  }
  if (inventoryEquipment) {
    systems.push('inventory-equipment','item-stacks','equipment-slots','currencies');
    assets.push('inventory-ui','equipment-icons','item-icons');
    qa.push('inventory-capacity','stacking','equip-unequip','inventory-save-restore');
  }
  if (questDialogue) {
    systems.push('quest-dialogue','quest-objectives','quest-flags','npc-state','dialogue-choices');
    assets.push('quest-ui','dialogue-ui','npc-portraits');
    qa.push('quest-progression','quest-completion','dialogue-requirements','npc-state-save');
  }
  if (skillEffects) {
    systems.push('skill-effects','skill-costs','cooldowns','buffs','debuffs','timed-effects');
    assets.push('skill-icons','status-icons','cooldown-ui');
    qa.push('skill-costs','cooldown-tick','effect-stack','effect-expiry');
  }
  if (economySystems) {
    systems.push('economy-loot-shop','loot-tables','rewards','shop-buy','shop-sell','wallet');
    assets.push('currency-icons','loot-icons','shop-ui');
    qa.push('loot-rolls','shop-affordability','buy-sell','reward-application');
  }
  if (versionedSave) {
    systems.push('save-versioning','save-migrations','save-compatibility');
    qa.push('save-migration','future-save-reject','game-id-check');
  }

  systems = without(unique([...systems, ...list(extras.systems)]), remove.systems);
  assets = without(unique([...assets, ...list(extras.assets)]), remove.assets);
  qa = without(unique([...qa, ...list(extras.qa)]), remove.qa);

  return Object.freeze({
    genre: key,
    mixedGenres: Object.freeze(mixedKeys),
    systems: Object.freeze(systems),
    assets: Object.freeze(assets),
    qa: Object.freeze(qa),
    rules: Object.freeze({
      preserveExistingBalance: true,
      preserveSaveFormat: true,
      assetsOnDemandOnly: true,
      licenseCheckRequired: true,
      mobileFirst: true,
      presetIsSuggestion: true,
      d20RulesOptional: true,
      turnBasedCombatOptional: true,
      characterProgressionOptional: true,
      commonSystemsOptional: true,
      saveMigrationsRequiredForBreakingChanges: true,
    }),
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonGamePresets = { GAME_PRESETS, buildGamePreset };
}
