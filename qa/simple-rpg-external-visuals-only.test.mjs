import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (name) => readFileSync(new URL('../roblox-games/simple-rpg/' + name, import.meta.url), 'utf8');
const server = source('server/Game.server.luau');
const client = source('client/Game.client.luau');
const companion = source('server/CompanionAI.luau');
const market = source('server/MultiverseEconomy.luau');
const weather = source('client/WeatherVFX.luau');
const project = JSON.parse(source('default.project.json'));

test('no hand-built monster, companion, or character preview geometry', () => {
  for (const moduleSource of [companion, market, weather]) {
    assert.doesNotMatch(moduleSource, /Instance\.new\("(Part|MeshPart|WedgePart|SpecialMesh)"\)/);
  }
  assert.doesNotMatch(companion, /bodyPart\(/);
  assert.doesNotMatch(market, /wagon = Instance\.new\("Part"\)/);
  assert.doesNotMatch(client, /civPreviewStyles|local function block\(name, size, position/);
  assert.doesNotMatch(client, /civBuildCharacterPreview|Instance\.new\("WorldModel"\)/);
  assert.match(client, /template:GetAttribute\("CuratedExternalAsset"\) ~= true/);
  assert.match(client, /template:GetAttribute\("VisualQualityApproved"\) ~= true/);
});

test('self-authored weather, impact VFX, camera pulses and limb rigs remain deleted', () => {
  for (const moduleSource of [client, weather]) {
    assert.doesNotMatch(moduleSource, /Instance\.new\("(ParticleEmitter|Highlight|Sparkles|Trail|Fire|Smoke|BloomEffect|DepthOfFieldEffect|ColorCorrectionEffect)"\)/);
  }
  assert.doesNotMatch(client, /creatureMotionLimbNames|creatureImportedRig|creatureTelegraphHighlights|civPreviewStyles/);
  assert.doesNotMatch(server, /DefeatedEnemyLootEffect|LootRewardNotice|Instance\.new\("PointLight"\)/);
});

test('remaining server geometry is invisible physics and verified external art only', () => {
  assert.match(server, /local function civPart\(parent, name, size, frame, _color, _material, collide\)/);
  assert.match(server, /startGround\.Transparency = 1/);
  assert.doesNotMatch(server, /part\.Transparency = 0/);
  assert.match(server, /part\.Transparency = 1/);
  assert.match(server, /part\.CanCollide = collide ~= false/);
  assert.doesNotMatch(server, /Instance\.new\("BillboardGui"\)/);
  assert.doesNotMatch(server, /DefeatedEnemyLootEffect/);
  assert.equal((server.match(/\.Style = Enum\.ProximityPromptStyle\.Custom/g) || []).length, 3);
  assert.doesNotMatch(server, /\.Style = Enum\.ProximityPromptStyle\.Default/);
  assert.match(server, /visualTemplate:GetAttribute\("CuratedExternalAsset"\) == true\s+and \(tonumber\(visualTemplate:GetAttribute\("VerifiedRobloxAssetId"\)\) or 0\) > 0/);
  assert.match(client, /enemy:GetAttribute\("CreatureAssetSource"\) == "StudioImported"/);
});

test('external slots are present and generated shared motion is disconnected', () => {
  const shared = project.tree.ReplicatedStorage.Shared;
  assert.equal(shared.CommonMotion, undefined);
  assert.equal(shared.CuratedWorldModels.$className, 'Folder');
  assert.equal(shared.CuratedWeatherEffects.$className, 'Folder');
  assert.equal(shared.CuratedUiTemplates.$className, 'Folder');
  assert.match(client, /local function attachDownloadedArtwork\(\): \(\)/);
  assert.match(client, /button\.Image = "rbxassetid:\/\/" \.\. buttonId/);
  assert.match(client, /assetModule = Shared:FindFirstChild\("CuratedAssets"\)/);
  for (const moduleSource of [companion, market, weather]) {
    assert.match(moduleSource, /VerifiedRobloxAssetId/);
  }
});

test('saves, server-side combat and existing game id remain intact', () => {
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
  assert.match(server, /store:UpdateAsync\("player:" \..*player\.UserId/);
  assert.match(server, /CompanionAI\.Command\(player, command, allowed\)/);
  assert.match(server, /MultiverseEconomy\.StartCaravans\(civHub, civWorlds\)/);
  assert.match(client, /autoCombat:FireServer\("AutoAttack", model\)/);
});

test('downloaded CC0 converter selects full building assemblies and real button images, not sample previews', () => {
  const prep = readFileSync(new URL('../tools/simple-rpg-prepare-curated-assets.py', import.meta.url), 'utf8');
  const uploader = readFileSync(new URL('../tools/simple-rpg-upload-actors.mjs', import.meta.url), 'utf8');
  const evidence = JSON.parse(readFileSync(new URL('../assets/external/simple-rpg/registration-evidence-312.json', import.meta.url), 'utf8'));
  assert.match(prep, /def assemble_existing_house_modules\(archive\):/);
  assert.match(prep, /CURATED_COMPLETE_CC0_BUILDING_NOT_PREPARED/);
  assert.match(prep, /assembledOnlyFromDownloadedSourceMeshes/);
  assert.match(prep, /"sample", "preview", "screenshot"/);
  assert.match(prep, /"UIpack_RPG\.zip"/);
  assert.match(prep, /CURATED_REAL_PANEL_OR_BUTTON_MISSING/);
  assert.doesNotMatch(prep, /choose_model\(town_archive, "Building", \("house", "tower", "building", "home"\), False\)/);
  assert.match(uploader, /REUSED_PREVIOUSLY_GRANTED_CC0_ACTOR/);
  assert.match(uploader, /old\.gitBlobSha===revision/);
  assert.equal(evidence.publishedVersion, 312);
  assert.equal(evidence.universeId, '10770997776');
  assert.equal(evidence.placeId, '120884036900477');
  assert.equal(Object.keys(evidence.actors).length, 9);
  assert.equal(evidence.publishedWorldAndUiEvidence.World.Building.note,
    'NOT_A_COMPLETE_BUILDING_DO_NOT_REUSE');
  assert.equal(evidence.publishedWorldAndUiEvidence.UI.Button.note,
    'SAMPLE_IMAGE_DO_NOT_REUSE');
});
