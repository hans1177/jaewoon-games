import { buildGamePreset } from './game-presets.js';
import { createGameKit } from './game-kit.js';

const KIT_SYSTEM_MAP = Object.freeze({
  'd20-rules': 'd20Rules',
  'turn-combat': 'turnBasedCombat',
  'character-progression': 'characterProgression',
  'inventory-equipment': 'inventoryEquipment',
  'quest-dialogue': 'questDialogue',
  'skill-effects': 'skillEffects',
  'economy-loot-shop': 'economySystems',
  'save-versioning': 'versionedSave',
});

const GENRE_DEFAULT_OPTIONS = Object.freeze({
  rpg: Object.freeze({
    characterProgression: true,
    inventoryEquipment: true,
    questDialogue: true,
    skillEffects: true,
    economySystems: true,
    versionedSave: true,
  }),
  survival: Object.freeze({
    inventoryEquipment: true,
    skillEffects: true,
    economySystems: true,
    versionedSave: true,
  }),
  defense: Object.freeze({
    skillEffects: true,
    economySystems: true,
    versionedSave: true,
  }),
  strategy: Object.freeze({
    economySystems: true,
    versionedSave: true,
  }),
  action: Object.freeze({
    characterProgression: true,
    skillEffects: true,
    versionedSave: true,
  }),
  adventure: Object.freeze({
    inventoryEquipment: true,
    questDialogue: true,
    versionedSave: true,
  }),
  puzzle: Object.freeze({
    versionedSave: true,
  }),
});

function mergeKitOptions(base = {}, override = {}) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value === undefined) continue;
    result[key] = value;
  }
  return result;
}

function inferKitOptions(preset) {
  const inferred = {};
  for (const system of preset.systems || []) {
    const key = KIT_SYSTEM_MAP[system];
    if (key) inferred[key] = true;
  }
  return inferred;
}

export function buildGameBlueprint({
  gameId = 'game',
  genre,
  mixGenres = [],
  presetOptions = {},
  kitOptions = {},
  useGenreDefaults = true,
} = {}) {
  const normalizedGenre = String(genre || '').toLowerCase();
  const genreDefaults = useGenreDefaults ? (GENRE_DEFAULT_OPTIONS[normalizedGenre] || {}) : {};

  const presetInput = {
    genre: normalizedGenre,
    mixGenres,
    ...presetOptions,
  };
  const preset = buildGamePreset(presetInput);
  const inferred = inferKitOptions(preset);
  const resolvedKitOptions = mergeKitOptions(
    mergeKitOptions(genreDefaults, inferred),
    kitOptions,
  );

  const kitConfig = Object.freeze({
    gameId: String(gameId || 'game'),
    ...resolvedKitOptions,
  });

  return Object.freeze({
    gameId: String(gameId || 'game'),
    genre: preset.genre,
    mixedGenres: preset.mixedGenres,
    systems: preset.systems,
    assets: preset.assets,
    qa: preset.qa,
    rules: preset.rules,
    kitConfig,
    createKit() {
      return createGameKit(kitConfig);
    },
  });
}

export function createGameFromBlueprint(options = {}) {
  const blueprint = buildGameBlueprint(options);
  return Object.freeze({ blueprint, kit: blueprint.createKit() });
}

export { GENRE_DEFAULT_OPTIONS };

if (typeof window !== 'undefined') {
  window.buildJaewoonGameBlueprint = buildGameBlueprint;
  window.createJaewoonGameFromBlueprint = createGameFromBlueprint;
}
