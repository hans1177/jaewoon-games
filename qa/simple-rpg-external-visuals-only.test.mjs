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
  assert.match(server, /part\.Transparency = 1/);
  assert.match(server, /part\.CastShadow = false/);
  assert.match(server, /part\.CanCollide = collide ~= false/);
  assert.doesNotMatch(server, /Instance\.new\("BillboardGui"\)|DefeatedEnemyLootEffect/);
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
  assert.doesNotMatch(client, /Instance\.new\("(ScreenGui|Frame|TextButton|TextLabel|ScrollingFrame|ImageLabel|ImageButton)"\)/);
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
