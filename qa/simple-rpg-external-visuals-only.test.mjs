import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const source = (name) => readFileSync(new URL('../roblox-games/simple-rpg/' + name, import.meta.url), 'utf8');
const server = source('server/Game.server.luau');
const client = source('client/Game.client.luau');
const companion = source('server/CompanionAI.luau');
const market = source('server/MultiverseEconomy.luau');
const weather = source('client/WeatherVFX.luau');
const project = JSON.parse(source('default.project.json'));

test('CC0 insect source-only downloader retains verified archives and refuses unknown targets', () => {
  const downloader = readFileSync(new URL('../tools/simple-rpg-priority-cc0-download.py', import.meta.url),'utf8');
  const workflow = readFileSync(new URL('../.github/workflows/owner-simple-rpg-direct-publish.yml',import.meta.url),'utf8');
  assert.match(downloader,/ant-rigged\.blend/);
  assert.match(downloader,/ant-3d-model-rigging-animated-low-poly-ish/);
  assert.match(downloader,/UNAPPROVED_CC0_TARGET_ONLY/);
  assert.match(downloader,/EXISTING_VERIFIED_SOURCE_MANIFEST_REQUIRED/);
  assert.match(downloader,/TARGETED_CC0_ACQUISITION_NOT_VERIFIED/);
  assert.match(downloader,/prior_manifest\["packs"\]/);
  assert.match(workflow,/VIBE_CC0_ONLY_PACK:/);
  assert.equal((workflow.match(/priority-cc0-ant-download/g)||[]).length,3);
  assert.match(workflow,/priority-cc0-ant-download[\s\S]*?publish:/);
  const tmp = mkdtempSync(path.join(tmpdir(),'cc0-ant-candidate-'));
  try {
    const root=path.join(tmp,'assets/external/simple-rpg/priority-v1');
    mkdirSync(root,{recursive:true});
    const bytes=Buffer.concat([Buffer.from('BLENDER'),Buffer.alloc(800,65)]);
    const hash=createHash('sha256').update(bytes).digest('hex');
    writeFileSync(path.join(root,'ant-rigged.blend'),bytes);
    const manifest={gameId:'simple-rpg',sourceOnly:true,packs:[{file:'ant-rigged.blend',bytes:bytes.length,sha256:hash}]};
    writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest));
    const command=new URL('../tools/simple-rpg-priority-cc0-download.py',import.meta.url).pathname;
    const env={...process.env,VIBE_CC0_ONLY_PACK:'ant-rigged.blend'};
    const result=spawnSync('python3',[command],{cwd:tmp,env,encoding:'utf8',timeout:9000});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/CC0_SOURCE_ALREADY_PRESENT_VERIFIED=ant-rigged.blend/);
    assert.deepEqual(JSON.parse(readFileSync(path.join(root,'manifest.json'),'utf8')),manifest);
    const denied=spawnSync('python3',[command],{cwd:tmp,env:{...env,VIBE_CC0_ONLY_PACK:'unsanctioned.zip'},encoding:'utf8',timeout:9000});
    assert.notEqual(denied.status,0);
    assert.match(denied.stderr,/UNAPPROVED_CC0_TARGET_ONLY/);
  } finally {
    rmSync(tmp,{recursive:true,force:true});
  }
});

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

test('Vibe auto-acquisition requests only existing pinned CC0 originals through the canonical downloader',()=>{
 const downloader=readFileSync(new URL('../tools/simple-rpg-priority-cc0-download.py',import.meta.url),'utf8');
 const owner=readFileSync(new URL('../.github/workflows/owner-simple-rpg-direct-publish.yml',import.meta.url),'utf8');
 const core=readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
 assert.match(downloader,/ONLY_PACK not in \{row\[1\] for row in PACKS\}/);
 assert.match(downloader,/UNAPPROVED_CC0_TARGET_ONLY/);
 assert.match(owner,/requested_priority_pack:/);
 assert.match(owner,/VIBE_CC0_ONLY_PACK:.*inputs\.requested_priority_pack/);
 assert.match(owner,/name: Propose verified priority CC0 downloads for permanent repository archive/);
 assert.match(core,/Request missing manifest-pinned CC0 original through existing download flow/);
 assert.match(core,/PINNED_ARCHIVE_ON_DEMAND_DOWNLOAD_REQUIRED/);
 assert.match(core,/externalAcquisition/);
 assert.match(core,/sourceHash/);
 assert.match(core,/gh workflow run owner-simple-rpg-direct-publish\.yml/);
 assert.match(core,/VIBE2_CC0_DOWNLOAD_REQUEST=DEDUPED_RECENT/);
 assert.match(core,/VIBE2_CC0_DOWNLOAD_REQUEST=PENDING_REVIEW/);
 assert.match(core,/VIBE2_CC0_DOWNLOAD_REQUEST=REQUESTED_SOURCE_ONLY/);
 assert.doesNotMatch(core,/curl.*-o .*vibe2.*asset/);
});
