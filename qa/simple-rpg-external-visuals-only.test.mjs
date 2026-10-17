import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

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

test('all native Part factories are forbidden: only downloaded MeshParts own collision and visuals', () => {
  assert.match(server, /local function civPart\(parent, name, size, frame, _color, _material, collide\)/);
  for (const file of [server, client, companion, market, weather]) {
    assert.doesNotMatch(file, /Instance\.new\("(?:Part|WedgePart|MeshPart|TrussPart|SpawnLocation|UnionOperation|SpecialMesh)"\)/);
  }
  assert.doesNotMatch(server, /\.Shape\s*=\s*Enum\.PartType\./);
  assert.doesNotMatch(server, /Instance\.new\("BillboardGui"\)/);
  assert.match(server, /local root = source:Clone\(\)/);
  assert.match(server, /local root = sourceRoot:Clone\(\)/);
  assert.match(server, /root\.CollisionFidelity = Enum\.CollisionFidelity\.Box/);
  assert.match(server, /root:SetAttribute\("CuratedExternalAsset", true\)/);
  assert.match(server, /root:SetAttribute\("VerifiedRobloxAssetId", template:GetAttribute\("VerifiedRobloxAssetId"\)\)/);
  assert.match(server, /startGround = civPart\(workspace, "SimpleRpgGround"/);
  assert.match(server, /foundationSpawn = spawnSource:Clone\(\)/);
  assert.match(server, /visual\.Parent = root/);
  assert.match(server, /SIMPLE_RPG_EXTERNAL_MESH_REQUIRED/);
  assert.match(server, /if not curatedModelFor\(request.Key \.\. "_Housing"\) then/);
  assert.match(server, /and curatedModelFor\(entry.Key \.\. "_Restored"\) then/);
  assert.match(server, /setExternalHousingDoorOpen\(piece, record.Open\)/);
  assert.doesNotMatch(server, /DefeatedEnemyLootEffect/);
  assert.equal((server.match(/\.Style = Enum\.ProximityPromptStyle\.Custom/g) || []).length, 3);
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
  assert.match(prep, /def export_original_blend_house\(archive\):/);
  assert.match(prep, /source\.open\("rb"\)\.read\(7\) != b"BLENDER"/);
  assert.match(prep, /exportedFromOriginalUnmodifiedBlenderScene/);
  assert.doesNotMatch(prep, /assemble_existing_house_modules/);
  const blender = readFileSync(new URL('../tools/simple-rpg-blender-export-house.py', import.meta.url), 'utf8');
  assert.match(blender, /bpy\.ops\.wm\.open_mainfile/);
  assert.match(blender, /bpy\.ops\.export_scene\.gltf/);
  assert.doesNotMatch(blender, /bpy\.ops\.mesh\.primitive_/);
  assert.match(prep, /CURATED_COMPLETE_CC0_BUILDING_NOT_PREPARED/);
  assert.match(prep, /originalBlenderSha256/);
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
  const common = JSON.parse(readFileSync(new URL('../assets/roblox/common-registered-external-assets-v1.json', import.meta.url), 'utf8'));
  assert.equal(common.reuseScope, 'ALL_COMPANY_ROBLOX_GAMES_WITH_SAME_ASSET_AND_LICENSE');
  assert.equal(common.rules.noProceduralVisualParts, true);
  assert.equal(common.rules.requireUniverseGrantForEachGame, true);
  assert.equal(common.registeredAssets.length, 15);
  assert.equal(common.registeredAssets.filter(x => x.family === 'actor' && x.gitBlobSha).length, 9);
  assert.ok(common.registeredAssets.every(x => x.approvedUniverseIds.includes('10770997776')));
  assert.match(uploader, /common-registered-external-assets-v1\.json/);
  assert.match(uploader, /old\.approvedUniverseIds\?\.includes\('10770997776'\)/);
});

test('existing external CC0 archive proposal accepts all four manifest schemas and rejects tampered originals', () => {
  const base = '../assets/external/simple-rpg/';
  for (const rel of ['manifest.json', 'wildlife/manifest.json', 'icons-vfx-npc/manifest.json', 'priority-v1/manifest.json']) {
    const data = JSON.parse(readFileSync(new URL(base + rel, import.meta.url), 'utf8'));
    assert.equal(data.sourceOnly, true, rel);
    assert.ok(data.packs.length > 0, rel);
    for (const row of data.packs) {
      assert.ok(['CC0', 'CC0-1.0'].includes(row.licenseDeclared || row.license || data.license), rel);
      assert.match(row.sha256, /^[a-f0-9]{64}$/, rel);
      assert.ok(row.bytes || row.archiveBytes, rel);
    }
  }

  const root = mkdtempSync(join(tmpdir(), 'vibe-source-acquire-'));
  const sourceDir = join(root, 'assets/external/simple-rpg/priority-v1');
  const script = fileURLToPath(new URL('../tools/simple-rpg-propose-verified-downloads.mjs', import.meta.url));
  const run = () => execFileSync(process.execPath, [script, 'priority'], {
    cwd:root, encoding:'utf8', stdio:['ignore','pipe','pipe']
  });
  const git = (...args) => execFileSync('git', args, {cwd:root, stdio:'ignore'});
  try {
    mkdirSync(sourceDir, {recursive:true});
    const name = 'sample.blend';
    const original = Buffer.alloc(1024, 0x52);
    const licenseSourceUrl = 'https://opengameart.org/content/verified-cc0-test';
    const row = {
      file:name, sourceUrl:'https://opengameart.org/sites/default/files/sample.blend',
      licenseSourceUrl, licenseDeclared:'CC0-1.0',
      sha256:createHash('sha256').update(original).digest('hex'), bytes:original.length
    };
    const manifest = {gameId:'simple-rpg', sourceOnly:true, gameApplied:false, packs:[row]};
    const save = () => writeFileSync(join(sourceDir,'manifest.json'), JSON.stringify(manifest));
    writeFileSync(join(sourceDir,name), original);
    save();
    git('init','-q');
    git('config','user.name','Asset QA');
    git('config','user.email','asset-qa@example.invalid');
    git('add','.');
    git('commit','-qm','source fixture');

    assert.match(run(), /SIMPLE_RPG_DOWNLOAD_VALIDATED_ORIGINALS=1/);
    assert.match(run(), /SIMPLE_RPG_DOWNLOAD_EXISTING_SOURCE_ALREADY_ARCHIVED=YES/);

    writeFileSync(join(sourceDir,name), Buffer.alloc(1024, 0x41));
    assert.throws(run, /DOWNLOADED_SOURCE_BINARY_MISMATCH/);
    writeFileSync(join(sourceDir,name), original);
    row.licenseDeclared = 'UNKNOWN';
    save();
    assert.throws(run, /DOWNLOADED_SOURCE_UNVERIFIED_LICENSE/);
    row.licenseDeclared = 'CC0-1.0';
    row.licenseSourceUrl = '';
    save();
    assert.throws(run, /DOWNLOADED_SOURCE_PROVENANCE_MISSING/);
  } finally {
    rmSync(root, {recursive:true, force:true});
  }
});
