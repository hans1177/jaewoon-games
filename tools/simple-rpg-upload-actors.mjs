#!/usr/bin/env node
// Upload the repository's existing CC0 GLB actor assets as Roblox Model assets.
// Requires ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_CREATOR_USER_ID.
// Does not modify a Roblox place or claim imported models are already playable.
import fs from 'node:fs/promises';
import path from 'node:path';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
if (!key) throw new Error('MISSING_ROBLOX_OPEN_CLOUD_API_KEY');
let creatorId = process.env.ROBLOX_CREATOR_USER_ID;
if (!creatorId) {
  // Resolve the existing experience owner's user ID from a server-side owner cookie.
  const raw = String(process.env.ROBLOX_ROBLOSECURITY || process.env.ROBLOX_SECURITY_COOKIE || '').trim();
  if (raw) {
    const cookie = raw.includes('.ROBLOSECURITY=') ? raw : '.ROBLOSECURITY='+raw+';';
    const ownerResponse = await fetch('https://develop.roblox.com/v1/universes/10770997776', {
      headers:{cookie}, signal:AbortSignal.timeout(15000)
    });
    const owner = await ownerResponse.json().catch(() => ({}));
    if (ownerResponse.ok && String(owner.id) === '10770997776'
      && owner.creatorType === 'User' && /^[1-9][0-9]*$/.test(String(owner.creatorTargetId))) {
      creatorId = String(owner.creatorTargetId);
    }
  }
}
if (!creatorId) {
  // Reuse the creator already authorized by the Roblox key; never guess an account ID.
  const permission = await introspectRobloxApiKey({apiKey:key});
  const creators = new Set();
  for (const scope of permission.scopes) {
    if (!/asset/i.test(scope.name || '')) continue;
    if (!scope.operations.some(op => /write|create/i.test(op))) continue;
    for (const id of scope.userIds) if (/^[1-9][0-9]*$/.test(id)) creators.add(id);
  }
  if (creators.size !== 1) throw new Error('ASSET_CREATOR_AMBIGUOUS: provide ROBLOX_CREATOR_USER_ID');
  creatorId = [...creators][0];
}
if (!/^[1-9][0-9]*$/.test(String(creatorId))) {
  throw new Error('INVALID_ROBLOX_CREATOR_USER_ID');
}
const sourceDir = 'assets/roblox/actors/sources';
// Only thematic adventurer/skeleton models; no generic humanoids posing as beasts.
const models = [
  ['kaykit-adventurers/Knight.glb', 'Knight'],
  ['kaykit-adventurers/Barbarian.glb', 'Barbarian'],
  ['kaykit-adventurers/Mage.glb', 'Mage'],
  ['kaykit-adventurers/Rogue.glb', 'Rogue'],
  ['kaykit-adventurers/Rogue_Hooded.glb', 'RogueHooded'],
  ['kaykit-skeletons/Skeleton_Warrior.glb', 'SkeletonWarrior'],
  ['kaykit-skeletons/Skeleton_Mage.glb', 'SkeletonMage'],
  ['kaykit-skeletons/Skeleton_Rogue.glb', 'SkeletonRogue'],
  ['kaykit-skeletons/Skeleton_Minion.glb', 'SkeletonMinion'],
  // Generic mini-characters are retained in the source archive but excluded from
  // automatic RPG creature registration: they are not distinct creature species.
];
const rawCookie = String(process.env.ROBLOX_ROBLOSECURITY || process.env.ROBLOX_SECURITY_COOKIE || '').trim();
const cookie = rawCookie.includes('.ROBLOSECURITY=') ? rawCookie : (rawCookie ? '.ROBLOSECURITY='+rawCookie+';' : '');
let csrf = '';
async function request(url, options = {}) {
  const authenticated = Boolean(cookie) && url.startsWith('https://apis.roblox.com/');
  if (authenticated && url.startsWith('https://apis.roblox.com/assets/v1/')) {
    url = url.replace('/assets/v1/', '/assets/user-auth/v1/');
  }
  const headers = { ...(options.headers ?? {}) };
  if (authenticated) {
    headers.cookie = cookie;
    if (csrf) headers['x-csrf-token'] = csrf;
  } else {
    headers['x-api-key'] = key;
  }
  let result = await fetch(url, { ...options, headers, signal:AbortSignal.timeout(60000) });
  if (authenticated && result.status === 403 && result.headers.get('x-csrf-token')) {
    csrf = result.headers.get('x-csrf-token');
    result = await fetch(url, { ...options, headers:{...headers,'x-csrf-token':csrf}, signal:AbortSignal.timeout(60000) });
  }
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error('ROBLOX_ASSET_API_'+result.status+': '+JSON.stringify(data).slice(0,400));
  return data;
}
const out = {schema:1, gameId:'simple-rpg', importedAt:new Date().toISOString(), creatorId, assets:{}};
// Exact v312 Cloud registration evidence is reusable for byte-identical CC0 actor sources.
const reusePublishedActors = process.argv.includes('--publish-curated-art');
const prior = reusePublishedActors ? JSON.parse(await fs.readFile(
  'assets/external/simple-rpg/registration-evidence-312.json','utf8')) : null;
if (prior && (prior.gameId!=='simple-rpg'||prior.universeId!=='10770997776'
  ||prior.placeId!=='120884036900477'||prior.publishedVersion!==312
  ||prior.publicationRunId!==38992034382
  ||prior.license!=='CC0-1.0'))throw new Error('ACTOR_REUSE_PUBLICATION_PROVENANCE_INVALID');
for (const [relativeFile, name] of models) {
  const file = path.join(sourceDir, relativeFile);
  const binary = await fs.readFile(file);
  if (binary.length > 20 * 1024 * 1024 || binary.subarray(0,4).toString() !== 'glTF')
    throw new Error('INVALID_GLB: '+file);
  const old = prior?.actors?.[name];
  if (old) {
    const {execFileSync} = await import('node:child_process');
    const revision = execFileSync('git',['hash-object','--',file],{encoding:'utf8'}).trim();
    if (old.source===relativeFile && old.gitBlobSha===revision
      && Number.isSafeInteger(old.assetId) && old.assetId>0) {
      out.assets[name] = {assetId:String(old.assetId),source:file,
        license:'CC0-1.0',universeId:'10770997776'};
      console.log('REUSED_PREVIOUSLY_GRANTED_CC0_ACTOR '+name+'='+old.assetId);
      continue;
    }
    console.log('ACTOR_SOURCE_CHANGED_REUPLOAD_REQUIRED',name);
  }
  const form = new FormData();
  form.set('request', JSON.stringify({
    assetType:'Model', displayName:'대충알피지 '+name,
    description:'CC0 KayKit character model used by 대충알피지; source: KayKit',
    creationContext:{creator:{userId:Number(creatorId)}}
  }));
  form.set('fileContent', new Blob([binary], {type:'model/gltf-binary'}), path.basename(file));
  const initial = await request('https://apis.roblox.com/assets/v1/assets', {method:'POST', body:form});
  const opPath = initial.path;
  if (!/^operations\/[A-Za-z0-9_\-/]+$/.test(String(opPath))) throw new Error('NO_UPLOAD_OPERATION: '+name);
  let done = false;
  for (let attempt=0; attempt<30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const op = await request('https://apis.roblox.com/assets/v1/'+opPath);
    if (op.error) throw new Error('UPLOAD_FAILED_'+name+': '+JSON.stringify(op.error).slice(0,400));
    if (op.done) {
      const id = op.response?.assetId || op.response?.asset?.assetId;
      if (!/^[1-9][0-9]*$/.test(String(id??''))) throw new Error('UPLOAD_NO_ASSET_ID: '+name);
      // Register use permission for this game's existing private universe.
      const grant = await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions', {
        method:'PATCH', headers:{'content-type':'application/json'},
        body:JSON.stringify({
          subjectType:'Universe', subjectId:'10770997776',
          action:'Use', requests:[{assetId:Number(id), grantToDependencies:true}]
        })
      });
      if (grant.errors?.length) throw new Error('ASSET_PERMISSION_DENIED_'+name);
      out.assets[name] = {assetId:String(id), source:file, license:'CC0-1.0', universeId:'10770997776'};
      console.log('UPLOADED_AND_GRANTED_MODEL '+name+'='+id);
      done=true; break;
    }
  }
  if (!done) throw new Error('UPLOAD_TIMED_OUT: '+name);
}
// Owner publish reuses the same authorized Cloud uploader; no second publication workflow.
if (process.argv.includes('--publish-curated-art')) {
  const sourceRoot = process.env.SIMPLE_RPG_CURATED_DIR || '/tmp/simple-rpg-curated';
  const manifestPath = path.join(sourceRoot, 'conversion-evidence.json');
  const provenance = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (provenance.gameId !== 'simple-rpg' || provenance.license !== 'CC0-1.0'
    || provenance.originalsUntouched !== true || provenance.robloxImported !== false) {
    throw new Error('CURATED_SOURCE_PROVENANCE_NOT_VERIFIED');
  }
  const verified = {schema:1, gameId:'simple-rpg', universeId:'10770997776',
    registration:'CLOUD_CREATE_AND_UNIVERSE_GRANT', license:'CC0-1.0',
    creatures:{}, world:{}, ui:{}, sources:provenance};
  const actorLabels = {
    Knight:'Knight', Barbarian:'Race1_Mob1', Rogue:'Race1_Mob2',
    Mage:'Race2_Mob1', RogueHooded:'Race3_Mob2',
    SkeletonWarrior:'Race4_Mob1', SkeletonMage:'Race4_Mob2',
    SkeletonRogue:'Race5_Mob2', SkeletonMinion:'Race5_Mob1'
  };
  for (const [name, alias] of Object.entries(actorLabels)) {
    const entry = out.assets[name];
    if (!entry || !/^[1-9][0-9]*$/.test(entry.assetId))
      throw new Error('CURATED_ACTOR_REGISTRATION_MISSING:'+name);
    verified.creatures[alias] = Number(entry.assetId);
  }
  async function registerNewArt(label, assetType, sourcePath, mime, evidence) {
    const bytes = await fs.readFile(sourcePath);
    const digest = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
    if (evidence.sha256 !== digest || bytes.length !== evidence.bytes || bytes.length > 20*1024*1024)
      throw new Error('CURATED_ART_HASH_MISMATCH:'+label);
    const form = new FormData();
    form.set('request', JSON.stringify({
      assetType, displayName:'대충알피지 CC0 '+label,
      description:'CC0 curated downloaded source for 대충알피지. '+evidence.archive+'/'+evidence.sourceEntry,
      creationContext:{creator:{userId:Number(creatorId)}}
    }));
    form.set('fileContent', new Blob([bytes],{type:mime}),path.basename(sourcePath));
    const initial = await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',body:form});
    if (!/^operations\/[A-Za-z0-9_/-]+$/.test(String(initial.path)))
      throw new Error('CURATED_ASSET_UPLOAD_NO_OPERATION:'+label);
    for(let n=0;n<40;n++){
      await new Promise(resolve=>setTimeout(resolve,1800));
      const op=await request('https://apis.roblox.com/assets/v1/'+initial.path);
      if (op.error) throw new Error('CURATED_ASSET_UPLOAD_FAILED:'+label+':'+JSON.stringify(op.error).slice(0,350));
      if(!op.done)continue;
      const id=Number(op.response?.assetId ?? op.response?.asset?.assetId);
      if(!Number.isSafeInteger(id)||id<1)throw new Error('CURATED_ART_ID_MISSING:'+label);
      const moderation=String(op.response?.moderationResult?.moderationState??'UNKNOWN');
      if(/REJECT|BLOCK|DENIED/.test(moderation))throw new Error('CURATED_ART_MODERATION_REJECTED:'+label);
      const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
        method:'PATCH',headers:{'content-type':'application/json'},
        body:JSON.stringify({subjectType:'Universe',subjectId:'10770997776',
          action:'Use',requests:[{assetId:id,grantToDependencies:true}]})
      });
      if(grant.errors?.length)throw new Error('CURATED_ART_USE_PERMISSION_DENIED:'+label);
      console.log('CURATED_CC0_CLOUD_REGISTERED',label,id,'MODERATION='+moderation);
      return id;
    }
    throw new Error('CURATED_ART_OPERATION_TIMEOUT:'+label);
  }
  for(const [name,evidence] of Object.entries(provenance.world)){
    verified.world[name] = await registerNewArt(name,'Model',
      path.join(sourceRoot,'world',name+'.glb'),'model/gltf-binary',evidence);
  }
  for(const [name,evidence] of Object.entries(provenance.ui)){
    verified.ui[name] = await registerNewArt(name,'Image',
      path.join(sourceRoot,'ui',name+'.png'),'image/png',evidence);
  }
  for(const group of [verified.creatures,verified.world,verified.ui]){
    if(Object.keys(group).length<2)throw new Error('CURATED_ASSET_SET_INCOMPLETE');
    for(const id of Object.values(group))if(!Number.isSafeInteger(id)||id<1)
      throw new Error('CURATED_ASSET_REGISTRATION_INVALID');
  }
  for(const required of ['Ground','Building'])if(!verified.world[required])
    throw new Error('CURATED_WORLD_REQUIRED_MODEL_MISSING:'+required);
  for(const required of ['Panel','Button'])if(!verified.ui[required])
    throw new Error('CURATED_UI_REQUIRED_IMAGE_MISSING:'+required);
  const luaTable=o=>'{'+Object.entries(o).map(([k,v])=>'['+JSON.stringify(k)+'] = '+v).join(', ')+'}';
  const moduleContent = [
    '--!strict','-- Downloaded CC0 files, verified checksums and real Roblox Cloud IDs; generated per owner build.',
    '-- This module is not checked into source without registered assets.',
    'return table.freeze({','  GameId = "simple-rpg",','  License = "CC0-1.0",',
    '  World = table.freeze('+luaTable(verified.world)+'),',
    '  Creatures = table.freeze('+luaTable(verified.creatures)+'),',
    '  UI = table.freeze('+luaTable(verified.ui)+'),','})',''
  ].join('\n');
  // This relative path is inside the checked-out main/game source, for the pinned Rojo build.
  await fs.writeFile('roblox-games/simple-rpg/shared/CuratedAssets.luau',moduleContent);
  const manifestOut=path.join(sourceRoot,'registered.json');
  await fs.writeFile(manifestOut,JSON.stringify(verified,null,2)+'\n');
  console.log('CURATED_REGISTERED_REAL_WORLD_MODELS='+Object.keys(verified.world).length);
  console.log('CURATED_REGISTERED_REAL_CREATURE_MODELS='+Object.keys(verified.creatures).length);
  console.log('CURATED_REGISTERED_REAL_UI_IMAGES='+Object.keys(verified.ui).length);
  console.log('CURATED_CLOUD_ASSET_MODULE_WRITTEN=YES');
  process.exit(0);
}

const outputFile = process.argv[2] || '/tmp/simple-rpg-imported-actors.json';
await fs.writeFile(outputFile, JSON.stringify(out,null,2)+'\n');
console.log('VERIFIED_ASSET_MANIFEST='+outputFile);
// Studio Command Bar loader uses only IDs returned by successful Roblox uploads.
// The loader is generated locally after upload; it does not claim the assets are in the place.
const aliases = {
  Knight:'Knight', Barbarian:'Humanoid', Mage:'Race2_Mob1',
  Rogue:'Race1_Mob2', RogueHooded:'Race3_Mob2',
  SkeletonWarrior:'Race4_Mob1', SkeletonMage:'Race4_Mob2',
  SkeletonRogue:'Race5_Mob2', SkeletonMinion:'Race5_Mob1',

};
const assetEntries = Object.entries(out.assets).map(([key, item]) => {
  const name = aliases[key] ?? key;
  return `{name=${JSON.stringify(name)},id=${item.assetId}}`;
});
const loader = `-- Run in Roblox Studio Command Bar while the 대충알피지 place is open.
-- After inserting, publish the actual Studio place. This is NOT a run-time script.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local InsertService = game:GetService("InsertService")
local shared = ReplicatedStorage:WaitForChild("Shared")
local folder = shared:FindFirstChild("CreatureModels") or Instance.new("Folder")
folder.Name = "CreatureModels"
folder.Parent = shared
local entries = {${assetEntries.join(',')}}
for _, entry in ipairs(entries) do
  local ok, container = pcall(function() return InsertService:LoadAsset(entry.id) end)
  if not ok or not container then
    warn("ASSET_IMPORT_FAILED", entry.name, entry.id, container)
  else
    local model = container:FindFirstChildWhichIsA("Model", true)
    if model then
      local previous = folder:FindFirstChild(entry.name)
      if previous then previous:Destroy() end
      model.Name = entry.name
      model.Parent = folder
      print("ASSET_INSERTED", entry.name, entry.id)
    else
      warn("ASSET_NO_MODEL", entry.name, entry.id)
    end
    container:Destroy()
  end
end
`;
const loaderFile = (outputFile.endsWith('.json') ? outputFile.slice(0, -5) : outputFile) + '-studio-import.luau';
await fs.writeFile(loaderFile, loader);
console.log('STUDIO_IMPORT_SCRIPT='+loaderFile);
