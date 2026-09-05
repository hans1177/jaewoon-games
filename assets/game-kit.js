// 파일명: assets/game-kit.js
// 역할: 공통 게임 시스템 조합 및 자연어 기반 킷/콘텐츠/프로젝트 생성 진입점
// 규칙: 기존 웹 생성 흐름 보존, Godot 요청만 Godot 프로젝트 생성 경로 추가, 게임별 최소 연결

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
import { JaewoonAchievementsUnlocks } from './achievements-unlocks.js';
import { planVibeCodingTask } from './vibe-helper.js';
import { planVibeWorkbenchTask } from './vibe-workbench.js';
import { createVibeProject, recordVibeProjectChange, recordVibeRepair, exportVibeProject, importVibeProject, cloneVibeProject } from './vibe-project.js';

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
    gameId = 'game', d20Rules = false, turnBasedCombat = false, characterProgression = false,
    inventoryEquipment = false, questDialogue = false, skillEffects = false, economySystems = false,
    statModifiers = false, craftingRecipes = false, achievementsUnlocks = false, versionedSave = false,
  } = {}) {
    this.gameId = String(gameId || 'game'); this.systems = new Map(); this.state = {};
    if (d20Rules) this.systems.set('d20', new JaewoonD20Rules(options(d20Rules)));
    if (turnBasedCombat) { const config = options(turnBasedCombat); const rules = config.rules ?? this.systems.get('d20') ?? null; this.systems.set('turnCombat', new JaewoonTurnCombat({ ...config, rules })); }
    if (characterProgression) this.systems.set('progression', new JaewoonCharacterProgression(options(characterProgression)));
    if (inventoryEquipment) { const config = options(inventoryEquipment); const system = new JaewoonInventoryEquipment(config); this.systems.set('inventory', system); this.state.inventory = system.createState(config.initialState || {}); }
    if (questDialogue) { const config = options(questDialogue); const system = new JaewoonQuestDialogue(); this.systems.set('quests', system); this.state.quests = system.createState(config.initialState || {}); }
    if (skillEffects) { const config = options(skillEffects); const system = new JaewoonSkillEffects(); this.systems.set('skills', system); this.state.skills = system.createState(config.initialState || {}); }
    if (economySystems) this.systems.set('economy', new JaewoonEconomyLootShop(options(economySystems)));
    if (statModifiers) { const config = options(statModifiers); const system = new JaewoonStatModifiers(); this.systems.set('stats', system); this.state.stats = system.createState(config.initialState || {}); }
    if (craftingRecipes) { if (!this.systems.has('inventory')) throw new Error('crafting recipes require inventory equipment'); const config = options(craftingRecipes); const system = new JaewoonCraftingRecipes({ ...config, inventory: this.systems.get('inventory') }); this.systems.set('crafting', system); this.state.crafting = system.createState(config.initialState || {}); }
    if (achievementsUnlocks) { const config = options(achievementsUnlocks); const system = new JaewoonAchievementsUnlocks(config); this.systems.set('achievements', system); this.state.achievements = system.createState(config.initialState || {}); }
    if (versionedSave) this.systems.set('save', new JaewoonSaveVersioning(options(versionedSave)));
  }
  has(name) { return this.systems.has(String(name)); }
  get(name) { const key = String(name); if (!this.systems.has(key)) throw new Error(`game kit system not enabled: ${key}`); return this.systems.get(key); }
  enabledSystems() { return Object.freeze([...this.systems.keys()]); }
  snapshot(extra = {}) { return clone({ gameId: this.gameId, systems: this.enabledSystems(), state: this.state, extra }); }
  wrapSave(extra = {}) { const payload = this.snapshot(extra); if (!this.has('save')) return payload; return this.get('save').wrap(payload, { gameId: this.gameId }); }
  restoreState(snapshot = {}) { const payload = snapshot?.data && snapshot?.version ? snapshot.data : snapshot; if (payload?.gameId && String(payload.gameId) !== this.gameId) throw new Error('game id mismatch'); const state = payload?.state || {}; if (this.has('inventory')) this.state.inventory = this.get('inventory').createState(state.inventory || {}); if (this.has('quests')) this.state.quests = this.get('quests').createState(state.quests || {}); if (this.has('skills')) this.state.skills = this.get('skills').createState(state.skills || {}); if (this.has('stats')) this.state.stats = this.get('stats').createState(state.stats || {}); if (this.has('crafting')) this.state.crafting = this.get('crafting').createState(state.crafting || {}); if (this.has('achievements')) this.state.achievements = this.get('achievements').createState(state.achievements || {}); return this.state; }
  migrateAndRestore(savePayload) { const migrated = this.has('save') ? this.get('save').migrate(savePayload) : savePayload; this.restoreState(migrated); return migrated; }
}

export function createGameKit(options = {}) { return new JaewoonGameKit(options); }
export function createVibeCodingTaskPlan(options = {}) { return planVibeCodingTask(options); }
export function createVibeWorkbenchTaskPlan(options = {}) { return planVibeWorkbenchTask(options); }
export function createVibeGameProject(options = {}) { return createVibeProject(options); }
export function changeVibeGameProject(project, options = {}) { return recordVibeProjectChange(project, options); }
export function repairVibeGameProject(project, options = {}) { return recordVibeRepair(project, options); }
export function exportVibeGameProject(project) { return exportVibeProject(project); }
export function importVibeGameProject(value) { return importVibeProject(value); }
export function cloneVibeGameProject(project) { return cloneVibeProject(project); }

export async function createGameKitFromPrompt({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, useGenreDefaults = true } = {}) {
  const { buildGameBlueprint } = await import('./game-blueprint.js');
  const blueprint = buildGameBlueprint({ gameId, prompt, genre, mixGenres, platform, presetOptions, kitOptions, useGenreDefaults });
  return Object.freeze({ blueprint, kit: createGameKit(blueprint.kitConfig) });
}

export async function createGameContentFromPrompt({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, useGenreDefaults = true } = {}) {
  const { buildGameBlueprint } = await import('./game-blueprint.js');
  const { buildGameContent } = await import('./game-content.js');
  const blueprint = buildGameBlueprint({ gameId, prompt, genre, mixGenres, platform, presetOptions, kitOptions, useGenreDefaults });
  return Object.freeze({ blueprint, content: buildGameContent({ blueprint, prompt }), kit: createGameKit(blueprint.kitConfig) });
}

export async function createGamePackageFromPrompt({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, useGenreDefaults = true } = {}) {
  const { buildGameBlueprint } = await import('./game-blueprint.js');
  const { buildGameContent } = await import('./game-content.js');
  const blueprint = buildGameBlueprint({ gameId, prompt, genre, mixGenres, platform, presetOptions, kitOptions, useGenreDefaults });
  const kit = createGameKit(blueprint.kitConfig);
  const content = buildGameContent({ blueprint, prompt });
  const initialSave = kit.wrapSave({ content, blueprint: blueprint.plan() });
  const packageData = { version: 1, gameId: blueprint.gameId, platform: blueprint.platform, blueprint, content, kit, initialSave: clone(initialSave), safety: Object.freeze({ reviewBeforeApply: true, autoApplyToExistingGame: false }) };
  return Object.freeze({ ...packageData, packageData });
}

export async function createGamePackageFromPromptWithGame({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, useGenreDefaults = true, title = null } = {}) {
  const packageResult = await createGamePackageFromPrompt({ gameId, prompt, genre, mixGenres, platform, presetOptions, kitOptions, useGenreDefaults });
  const { buildGeneratedGame } = await import('./game-generator.js');
  const generated = buildGeneratedGame({ packageData: packageResult, title: title || packageResult.gameId });
  return Object.freeze({ package: packageResult, generated });
}

export async function createGameProjectFromPrompt({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, useGenreDefaults = true, title = null } = {}) {
  const result = await createGamePackageFromPromptWithGame({ gameId, prompt, genre, mixGenres, platform, presetOptions, kitOptions, useGenreDefaults, title });
  const project = createVibeProject({ gameId: result.package.gameId, title: title || result.package.gameId, target: result.package.platform === 'godot' ? 'godot' : 'web', packageData: result.package, source: result.generated.html });
  let godotProject = null;
  let godotQa = null;
  if (result.package.platform === 'godot') {
    const { buildGodotProject } = await import('./godot-game-generator.js');
    const { auditGodotProjectFiles } = await import('./godot-project-qa.js');
    godotProject = buildGodotProject({ packageData: result.package, title: title || result.package.gameId, slug: result.package.gameId });
    godotQa = auditGodotProjectFiles(godotProject.files);
  }
  return Object.freeze({
    version: 3,
    project: Object.freeze({ gameId: result.package.gameId, platform: result.package.platform, title: result.generated.slug, filename: result.generated.filename, godotSlug: godotProject?.slug || null }),
    package: result.package,
    generated: result.generated,
    godotProject,
    godotQa,
    editableProject: project,
  });
}

export async function createGodotGameProjectFromPrompt(options = {}) {
  return createGameProjectFromPrompt({ ...options, platform: 'godot' });
}

export async function createGameSessionFromPrompt({ gameId = 'game', prompt = '', genre = null, mixGenres = [], platform = 'auto', presetOptions = {}, kitOptions = {}, sessionOptions = {}, autoRestore = true } = {}) {
  const { createGameSession } = await import('./game-session.js');
  const { buildGameBlueprint } = await import('./game-blueprint.js');
  const blueprint = buildGameBlueprint({ gameId, prompt, genre, mixGenres, platform, presetOptions, kitOptions });
  const session = createGameSession({ gameId: blueprint.gameId, genre: blueprint.genre, mixGenres: blueprint.mixedGenres, kitOptions: blueprint.kitConfig, useGenreDefaults: false, autoRestore, ...sessionOptions });
  return Object.freeze({ blueprint, session });
}

if (typeof window !== 'undefined') {
  window.JaewoonGameKit = JaewoonGameKit;
  window.createJaewoonGameKit = createGameKit;
  window.createJaewoonVibeCodingTaskPlan = createVibeCodingTaskPlan;
  window.createJaewoonVibeWorkbenchTaskPlan = createVibeWorkbenchTaskPlan;
  window.createJaewoonVibeGameProject = createVibeGameProject;
  window.changeJaewoonVibeGameProject = changeVibeGameProject;
  window.repairJaewoonVibeGameProject = repairVibeGameProject;
  window.exportJaewoonVibeGameProject = exportVibeGameProject;
  window.importJaewoonVibeGameProject = importVibeGameProject;
  window.cloneJaewoonVibeGameProject = cloneVibeGameProject;
  window.createJaewoonGameKitFromPrompt = createGameKitFromPrompt;
  window.createJaewoonGameContentFromPrompt = createGameContentFromPrompt;
  window.createJaewoonGamePackageFromPrompt = createGamePackageFromPrompt;
  window.createJaewoonGamePackageFromPromptWithGame = createGamePackageFromPromptWithGame;
  window.createJaewoonGameProjectFromPrompt = createGameProjectFromPrompt;
  window.createJaewoonGodotGameProjectFromPrompt = createGodotGameProjectFromPrompt;
  window.createJaewoonGameSessionFromPrompt = createGameSessionFromPrompt;
}
