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

export function buildGamePreset({ genre, multiplayer = false, aiCompanions = false, npcDialogue = false, extras = {} } = {}) {
  const key = String(genre || '').toLowerCase();
  const base = GAME_PRESETS[key];
  if (!base) throw new Error(`Unknown game preset: ${genre}`);

  const systems = [...COMMON.systems, ...base.systems];
  const assets = [...COMMON.assets, ...base.assets];
  const qa = [...COMMON.qa, ...base.qa];

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

  return Object.freeze({
    genre: key,
    systems: unique([...systems, ...(extras.systems || [])]),
    assets: unique([...assets, ...(extras.assets || [])]),
    qa: unique([...qa, ...(extras.qa || [])]),
    rules: Object.freeze({
      preserveExistingBalance: true,
      preserveSaveFormat: true,
      assetsOnDemandOnly: true,
      licenseCheckRequired: true,
      mobileFirst: true,
    }),
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonGamePresets = { GAME_PRESETS, buildGamePreset };
}
