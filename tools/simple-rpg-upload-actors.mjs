#!/usr/bin/env node
// Upload the repository's existing CC0 KayKit GLB assets as Roblox Model assets.
// Requires ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_CREATOR_USER_ID.
// Does not modify a Roblox place or claim imported models are already playable.
import fs from 'node:fs/promises';
import path from 'node:path';

const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
const creatorId = process.env.ROBLOX_CREATOR_USER_ID;
if (!key || !/^[1-9][0-9]*$/.test(String(creatorId ?? ''))) {
  throw new Error('MISSING_ROBLOX_ASSET_UPLOAD_CREDENTIALS: set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_CREATOR_USER_ID');
}
const sourceDir = 'assets/roblox/actors/sources';
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
];
async function request(url, options) {
  const result = await fetch(url, { ...options, headers: { 'x-api-key': key, ...(options?.headers ?? {}) } });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error('ROBLOX_ASSET_API_'+result.status+': '+JSON.stringify(data).slice(0,400));
  return data;
}
const out = {schema:1, gameId:'simple-rpg', importedAt:new Date().toISOString(), creatorId, assets:{}};
for (const [relativeFile, name] of models) {
  const file = path.join(sourceDir, relativeFile);
  const binary = await fs.readFile(file);
  if (binary.length > 20 * 1024 * 1024 || binary.subarray(0,4).toString() !== 'glTF')
    throw new Error('INVALID_GLB: '+file);
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
      out.assets[name] = {assetId:String(id), source:file, license:'CC0-1.0'};
      console.log('UPLOADED_MODEL '+name+'='+id);
      done=true; break;
    }
  }
  if (!done) throw new Error('UPLOAD_TIMED_OUT: '+name);
}
const outputFile = process.argv[2] || '/tmp/simple-rpg-imported-actors.json';
await fs.writeFile(outputFile, JSON.stringify(out,null,2)+'\n');
console.log('VERIFIED_ASSET_MANIFEST='+outputFile);
