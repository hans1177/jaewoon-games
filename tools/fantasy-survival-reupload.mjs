#!/usr/bin/env node
// 마력숲: 3D 모델(CC0)을 현재 계정으로 다시 올리고 체험(Universe)에 사용 권한을 준 뒤 VisualAssetIds.luau의 번호를 바꾼다.
// 필요: ROBLOX_OPEN_CLOUD_API_KEY, ROBLOX_CREATOR_USER_ID, FANTASY_UNIVERSE_ID. 모델만 올린다(사진 없음).
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT = 'roblox-games/fantasy-survival';
const UNIVERSE_ID = process.env.FANTASY_UNIVERSE_ID;
const restoreOnly = process.argv.includes('--regrant-only');
const campOnly = process.argv.includes('--camp-only');
const creatorId = process.env.ROBLOX_CREATOR_USER_ID;
const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
if (!key || !UNIVERSE_ID || !creatorId) throw new Error('MISSING_ENV');
const target = JSON.parse(await fs.readFile(ROOT + '/experience-target.json', 'utf8'));
if (String(target.universeId) !== String(UNIVERSE_ID)) throw new Error('MEADOW_EXPERIENCE_ID_MISMATCH');
const map = JSON.parse(await fs.readFile(ROOT + '/reupload-map.json', 'utf8'));
const regPath = ROOT + '/assets-registered.json';
const registry = await fs.readFile(regPath, 'utf8').then(JSON.parse, () => ({universeId: UNIVERSE_ID, assets: {}}));
registry.universeId = UNIVERSE_ID;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(url, options = {}) {
  for (let a = 0; a < 4; a++) {
    const r = await fetch(url, {...options, headers: {...(options.headers ?? {}), 'x-api-key': key}, signal: AbortSignal.timeout(90000)});
    if (r.status === 429 && a < 3) { await sleep(6000 * 2 ** a); continue; }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('API_' + r.status + ': ' + JSON.stringify(data).slice(0, 250));
    return data;
  }
  throw new Error('RATE_LIMIT_EXHAUSTED');
}
const mime = ext => ext === '.glb' ? 'model/gltf-binary' : ext === '.gltf' ? 'model/gltf+json' : ext === '.obj' ? 'model/obj' : 'model/fbx';
const jobs = [
  ...Object.entries(map.files).map(([name, file]) => ({name, file})),
  ...Object.entries(map.archives).map(([name, a]) => ({name, zip: a.zip, entry: a.entry, file: a.zip + '#' + a.entry})),
];
const failures = [], pending = [];
const restored = [];
for (const job of (restoreOnly ? [] : jobs)) {
  if (registry.assets[job.name]?.assetId) { console.log('SKIP', job.name); continue; }
  try {
    const bytes = job.zip ? execFileSync('unzip', ['-p', job.zip, job.entry], {maxBuffer: 200 * 1024 * 1024}) : await fs.readFile(job.file);
    let ext = path.extname(job.zip ? job.entry : job.file).toLowerCase();
    let body = bytes;
    if (ext === '.obj') {
      // Roblox는 obj 모델 생성을 지원하지 않아 glb로 바꿔 올린다(색은 mtl이 없으면 회색).
      body = execFileSync('python3', ['tools/obj-to-glb.py'], {input: bytes, maxBuffer: 200 * 1024 * 1024});
      ext = '.glb';
    }
    const form = new FormData();
    form.set('request', JSON.stringify({assetType: 'Model', displayName: 'MagicForest ' + job.name,
      description: 'CC0 3D model for Magic Forest; see CC0-ASSET-REGISTRY.json',
      creationContext: {creator: {userId: Number(creatorId)}}}));
    form.set('fileContent', new Blob([body], {type: mime(ext)}), job.name + ext);
    const initial = await api('https://apis.roblox.com/assets/v1/assets', {method: 'POST', body: form});
    let assetId = '';
    for (let n = 0; n < 40 && !assetId; n++) {
      await sleep(2000);
      const op = await api('https://apis.roblox.com/assets/v1/' + initial.path);
      if (op.error) throw new Error('UPLOAD_FAILED ' + JSON.stringify(op.error).slice(0, 200));
      if (op.done) assetId = String(op.response?.assetId || '');
    }
    if (!/^[1-9][0-9]*$/.test(assetId)) throw new Error('NO_ASSET_ID');
    registry.assets[job.name] = {assetId, source: job.file, usePermissionGranted: false};
    console.log('UPLOADED', job.name, assetId);
  } catch (e) {
    failures.push(job.name);
    console.log('FAILED', job.name, String(e.message).slice(0, 200));
    if (/moderated/i.test(String(e.message))) break;
  }
}
// [권한 복구] 현재 라이브 체험에서 실패한 등록 모델과 승인된 야영지 소품만 재승인한다.
const errors = restoreOnly
  ? JSON.parse(await fs.readFile(ROOT + '/broken-assets.json', 'utf8'))
  : {items: []};
const failedNames = new Set((errors.items || [])
  .filter(item => item.action === 'SERVER_ASSET_ACCESS_FAILED' || item.action === 'REUPLOAD_MODEL')
  .map(item => String(item.key || '')).filter(Boolean));
const todo = restoreOnly
  ? Object.entries(registry.assets).filter(([name, value]) => !campOnly && failedNames.has(name) && /^[1-9]\d*$/.test(String(value?.assetId || '')))
  : Object.entries(registry.assets).filter(([, value]) => !value.usePermissionGranted);
const resolvedNames = new Set(todo.map(([name]) => name));
if (restoreOnly) {
  const approved = JSON.parse(await fs.readFile(ROOT + '/CC0-ASSET-REGISTRY.json', 'utf8')).kenneyMiniForestCamp;
  if (!approved || approved.license !== 'CC0-1.0' || !approved.zipSha256 || !approved.assetIds)
    throw new Error('MEADOW_CAMP_SOURCE_NOT_APPROVED');
  for (const [name, id] of Object.entries(approved.assetIds)) {
    if (!failedNames.has(name)) continue;
    if (!/^[1-9]\d*$/.test(String(id))) throw new Error('MEADOW_CAMP_INVALID_ASSET_ID:' + name);
    todo.push([name, {assetId: String(id), usePermissionGranted: false}]);
    resolvedNames.add(name);
  }
  const unresolved = [...failedNames].filter(name => !resolvedNames.has(name));
  console.log('MEADOW_PERMISSION_REPAIR_TARGET=' + UNIVERSE_ID
    + ' TARGETS=' + todo.length + ' UNMAPPED=' + unresolved.join(','));
  if (!todo.length) throw new Error('MEADOW_PERMISSION_REPAIR_NO_REGISTERED_IDS');
}
for (let i = 0; i < todo.length; i += 25) {
  const batch = todo.slice(i, i + 25);
  try {
    const res = await api('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions', {
      method: 'PATCH', headers: {'content-type': 'application/json'},
      body: JSON.stringify({subjectType: 'Universe', subjectId: UNIVERSE_ID, action: 'Use',
        requests: batch.map(([, v]) => ({assetId: Number(v.assetId), grantToDependencies: true}))})});
    const ok = new Set((res.successAssetIds || []).map(String));
    for (const [name, v] of batch) {
      if (ok.has(String(v.assetId))) { v.usePermissionGranted = true; if (restoreOnly) restored.push(name); console.log('GRANTED_ASSET', name); }
      else { const reason=(res.errors || []).find(error => String(error.assetId)===String(v.assetId))?.code || 'UNSPECIFIED'; failures.push(name + ':GRANT:' + reason); console.log('GRANT_WARNING', name, reason); }
    }
  } catch (e) { console.log('GRANT_BATCH_FAILED', i, String(e.message).slice(0, 180)); batch.forEach(([n]) => failures.push(n + ':GRANT')); }
}
registry.updatedAt = new Date().toISOString();
await fs.writeFile(regPath, JSON.stringify(registry, null, 2) + '\n');
// VisualAssetIds.luau: 올린 항목만 새 번호로 바꾼다. 못 올린 항목은 그대로 두고 아래에 목록으로 남긴다.
const luauPath = ROOT + '/shared/VisualAssetIds.luau';
let luau = await fs.readFile(luauPath, 'utf8');
let replaced = 0;
for (const [name, v] of Object.entries(registry.assets)) {
  if (!v.usePermissionGranted) continue;
  const re = new RegExp('(^\\s*' + name + '\\s*=\\s*)\\d+', 'm');
  if (re.test(luau)) { luau = luau.replace(re, '$1' + v.assetId); replaced++; }
}
await fs.writeFile(luauPath, luau);
console.log('REGISTERED=' + Object.keys(registry.assets).length + ' REPLACED=' + replaced + ' FAILED=' + failures.length);
if (restoreOnly) console.log('MEADOW_PERMISSION_REPAIR_CONFIRMED=' + restored.length + ' OF=' + todo.length);
if (failures.length) { console.error('INCOMPLETE', failures.join(',')); process.exitCode = 1; }
