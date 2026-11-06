#!/usr/bin/env node
// Mare Scientia: 저장소에 있는 CC0 3D 모델(선박·부두·소품·마을·주민)을 Roblox Model 자산으로 등록한다.
// 필요: ROBLOX_OPEN_CLOUD_API_KEY (+ ROBLOX_ROBLOSECURITY 선택). 결과는 JSON과 Luau(AssetIds)로 저장한다.
import fs from 'node:fs/promises';
import path from 'node:path';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const UNIVERSE_ID = process.env.MARE_UNIVERSE_ID || '10774821253';
const ROOT = 'roblox-games/mare-scientia';
const JSON_OUT = ROOT + '/assets-registered.json';
const LUAU_OUT = ROOT + '/src/ReplicatedStorage/Shared/AssetIds.luau';
const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
if (!key) throw new Error('MISSING_ROBLOX_OPEN_CLOUD_API_KEY');

const rawCookie = String(process.env.ROBLOX_ROBLOSECURITY || process.env.ROBLOX_SECURITY_COOKIE || '').trim();
const cookie = rawCookie.includes('.ROBLOSECURITY=') ? rawCookie : (rawCookie ? '.ROBLOSECURITY=' + rawCookie + ';' : '');
let csrf = '';
async function request(url, options = {}) {
  const authenticated = Boolean(cookie) && url.startsWith('https://apis.roblox.com/');
  if (authenticated && url.startsWith('https://apis.roblox.com/assets/v1/')) url = url.replace('/assets/v1/', '/assets/user-auth/v1/');
  const headers = {...(options.headers ?? {})};
  if (authenticated) { headers.cookie = cookie; if (csrf) headers['x-csrf-token'] = csrf; } else headers['x-api-key'] = key;
  let result = await fetch(url, {...options, headers, signal: AbortSignal.timeout(90000)});
  if (authenticated && result.status === 403 && result.headers.get('x-csrf-token')) {
    csrf = result.headers.get('x-csrf-token');
    result = await fetch(url, {...options, headers: {...headers, 'x-csrf-token': csrf}, signal: AbortSignal.timeout(90000)});
  }
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error('ROBLOX_ASSET_API_' + result.status + ': ' + JSON.stringify(data).slice(0, 300));
  return data;
}

let creatorId = process.env.ROBLOX_CREATOR_USER_ID;
if (!creatorId && cookie) {
  try {
    const r = await fetch('https://develop.roblox.com/v1/universes/' + UNIVERSE_ID, {headers: {cookie}, signal: AbortSignal.timeout(15000)});
    const o = await r.json().catch(() => ({}));
    if (r.ok && o.creatorType === 'User' && /^[1-9][0-9]*$/.test(String(o.creatorTargetId))) creatorId = String(o.creatorTargetId);
  } catch {}
}
if (!creatorId) {
  const permission = await introspectRobloxApiKey({apiKey: key});
  const creators = new Set();
  for (const scope of permission.scopes) {
    if (!/asset/i.test(scope.name || '')) continue;
    if (!scope.operations.some(op => /write|create/i.test(op))) continue;
    for (const id of scope.userIds) if (/^[1-9][0-9]*$/.test(id)) creators.add(id);
  }
  if (creators.size !== 1) throw new Error('ASSET_CREATOR_AMBIGUOUS: provide ROBLOX_CREATOR_USER_ID');
  creatorId = [...creators][0];
}

// kind(MareAssets 하위 폴더) / 모델 이름 / 원본 파일. OBJ는 Open Cloud가 받지 않아 제외한다.
const plan = [];
for (const [dir, kind] of [['naval', 'Naval'], ['town', 'Town'], ['people', 'People'], ['castle', 'Castle'], ['interior', 'Interior'], ['relics', 'Relics'], ['terrain', 'Terrain'], ['cargo', 'Cargo']]) {
  for (const f of await fs.readdir(path.join(ROOT, 'assets', dir))) {
    const ext = path.extname(f).toLowerCase();
    if (ext !== '.glb' && ext !== '.fbx') continue;
    plan.push({kind, name: path.basename(f, ext), file: path.join(ROOT, 'assets', dir, f), ext});
  }
}

let registry = {schema: 1, universeId: UNIVERSE_ID, license: 'CC0-1.0', assets: {}};
try { registry = JSON.parse(await fs.readFile(JSON_OUT, 'utf8')); } catch {}
const failures = [];
for (const item of plan) {
  const id = item.kind + '/' + item.name;
  if (registry.assets[id]?.assetId) { console.log('SKIP_ALREADY_REGISTERED', id); continue; }
  try {
    const binary = await fs.readFile(item.file);
    if (binary.length > 20 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
    const form = new FormData();
    form.set('request', JSON.stringify({
      assetType: 'Model', displayName: 'MareScientia ' + id,
      description: 'CC0 model for Mare Scientia (' + item.kind + '); see assets/SOURCES.md',
      creationContext: {creator: {userId: Number(creatorId)}},
    }));
    form.set('fileContent', new Blob([binary], {type: item.ext === '.glb' ? 'model/gltf-binary' : 'model/fbx'}), path.basename(item.file));
    const initial = await request('https://apis.roblox.com/assets/v1/assets', {method: 'POST', body: form});
    if (!/^operations\/[A-Za-z0-9_\-/]+$/.test(String(initial.path))) throw new Error('NO_UPLOAD_OPERATION');
    let assetId = null;
    for (let n = 0; n < 40 && !assetId; n++) {
      await new Promise(r => setTimeout(r, 2000));
      const op = await request('https://apis.roblox.com/assets/v1/' + initial.path);
      if (op.error) throw new Error('UPLOAD_FAILED: ' + JSON.stringify(op.error).slice(0, 200));
      if (op.done) assetId = String(op.response?.assetId || op.response?.asset?.assetId || '');
    }
    if (!/^[1-9][0-9]*$/.test(assetId || '')) throw new Error('NO_ASSET_ID');
    try {
      await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions', {
        method: 'PATCH', headers: {'content-type': 'application/json'},
        body: JSON.stringify({subjectType: 'Universe', subjectId: UNIVERSE_ID, action: 'Use', requests: [{assetId: Number(assetId), grantToDependencies: true}]}),
      });
    } catch (e) { console.log('GRANT_WARNING', id, String(e.message).slice(0, 160)); }
    registry.assets[id] = {assetId, source: item.file, license: 'CC0-1.0'};
    console.log('UPLOADED', id, assetId);
  } catch (e) {
    failures.push(id + ': ' + String(e.message).slice(0, 200));
    console.log('FAILED', id, String(e.message).slice(0, 200));
  }
}
registry.updatedAt = new Date().toISOString();
await fs.writeFile(JSON_OUT, JSON.stringify(registry, null, 2) + '\n');
const lines = Object.entries(registry.assets).sort().map(([k, v]) => `\t["${k}"] = ${v.assetId},`);
await fs.writeFile(LUAU_OUT, '-- 자동 생성: tools/mare-scientia-upload-assets.mjs (직접 고치지 말 것)\nreturn {\n' + lines.join('\n') + (lines.length ? '\n' : '') + '}\n');
console.log('REGISTERED_COUNT=' + Object.keys(registry.assets).length + ' FAILED_COUNT=' + failures.length);
if (!Object.keys(registry.assets).length || failures.length) {
  console.error('REGISTRATION_INCOMPLETE', failures.length, failures.slice(0, 12).join(' | '));
  process.exitCode = 1;
}
