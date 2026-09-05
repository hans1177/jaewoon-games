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
  'stat-modifiers': 'statModifiers',
  'save-versioning': 'versionedSave',
});

const GENRE_DEFAULT_OPTIONS = Object.freeze({
  rpg: Object.freeze({
    characterProgression: true,
    inventoryEquipment: true,
    questDialogue: true,
    skillEffects: true,
    economySystems: true,
    statModifiers: true,
    versionedSave: true,
  }),
  survival: Object.freeze({
    inventoryEquipment: true,
    skillEffects: true,
    economySystems: true,
    statModifiers: true,
    versionedSave: true,
  }),
  defense: Object.freeze({
    skillEffects: true,
    economySystems: true,
    statModifiers: true,
    versionedSave: true,
  }),
  strategy: Object.freeze({
    economySystems: true,
    statModifiers: true,
    versionedSave: true,
  }),
  action: Object.freeze({
    characterProgression: true,
    skillEffects: true,
    statModifiers: true,
    versionedSave: true,
  }),
  adventure: Object.freeze({
    inventoryEquipment: true,
    questDialogue: true,
    statModifiers: true,
    versionedSave: true,
  }),
  puzzle: Object.freeze({
    versionedSave: true,
  }),
});

export const DEFAULT_ASSET_POLICY = Object.freeze({
  preferExistingAssets: true,
  downloadOnDemand: true,
  licenseCheckRequired: true,
  preferredLicenses: Object.freeze(['CC0', 'commercial-no-attribution', 'CC-BY']),
  blockedLicenses: Object.freeze(['NC', 'unknown', 'unclear-redistribution']),
  maxSingleAssetBytes: 104857600,
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

function buildMaterialPlan(assetCategories = [], overrides = {}) {
  const requested = [...new Set((assetCategories || []).map((item) => String(item)).filter(Boolean))];
  const policy = Object.freeze({ ...DEFAULT_ASSET_POLICY, ...(overrides.policy || {}) });
  return Object.freeze({
    categories: Object.freeze(requested),
    workflow: Object.freeze([
      'reuse-existing-assets',
      'search-approved-free-sources-if-missing',
      'verify-license-per-asset',
      'download-only-needed-assets',
      'record-license-and-source',
      'remove-unused-assets',
    ]),
    policy,
  });
}

function buildQaPlan(qaItems = []) {
  const checks = [...new Set((qaItems || []).map((item) => String(item)).filter(Boolean))];
  return Object.freeze({
    checks: Object.freeze(checks),
    requiredBaseline: Object.freeze(['boot', 'restart', 'save-load', 'touch', 'console-errors']),
    mobileFirst: true,
    preserveExistingBehavior: true,
  });
}

export function buildGameBlueprint({
  gameId = 'game',
  genre,
  mixGenres = [],
  presetOptions = {},
  kitOptions = {},
  assetPlanOptions = {},
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
  const materialPlan = buildMaterialPlan(preset.assets, assetPlanOptions);
  const qaPlan = buildQaPlan(preset.qa);

  return Object.freeze({
    gameId: String(gameId || 'game'),
    genre: preset.genre,
    mixedGenres: preset.mixedGenres,
    systems: preset.systems,
    assets: preset.assets,
    qa: preset.qa,
    rules: preset.rules,
    kitConfig,
    materialPlan,
    qaPlan,
    createKit() {
      return createGameKit(kitConfig);
    },
    plan() {
      return Object.freeze({
        gameId: String(gameId || 'game'),
        genre: preset.genre,
        mixedGenres: preset.mixedGenres,
        systems: preset.systems,
        materialPlan,
        qaPlan,
        preservation: Object.freeze({
          preserveExistingBalance: preset.rules.preserveExistingBalance,
          preserveSaveFormat: preset.rules.preserveSaveFormat,
          mobileFirst: preset.rules.mobileFirst,
          saveMigrationsRequiredForBreakingChanges: preset.rules.saveMigrationsRequiredForBreakingChanges,
        }),
      });
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
