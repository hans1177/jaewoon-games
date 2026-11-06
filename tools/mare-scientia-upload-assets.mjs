#!/usr/bin/env node
// 파일명: tools/mare-scientia-upload-assets.mjs
// Mare Scientia: CC0 3D 모델과 CC BY 3.0 메뉴 이미지를 기존 Open Cloud 통로로 등록한다.
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
// 요청 제한은 실패로 확정하기 전에 기존 엔드포인트에서 지수 백오프로 재시도한다.
async function request(url, options = {}) {
  const authenticated = Boolean(cookie) && url.startsWith('https://apis.roblox.com/');
  if (authenticated && url.startsWith('https://apis.roblox.com/assets/v1/')) url = url.replace('/assets/v1/', '/assets/user-auth/v1/');
  for (let attempt = 0; attempt < 4; attempt++) {
    const headers = {...(options.headers ?? {})};
    if (authenticated) { headers.cookie = cookie; if (csrf) headers['x-csrf-token'] = csrf; }
    else headers['x-api-key'] = key;
    let result = await fetch(url, {...options, headers, signal: AbortSignal.timeout(90000)});
    if (authenticated && result.status === 403 && result.headers.get('x-csrf-token')) {
      csrf = result.headers.get('x-csrf-token');
      result = await fetch(url, {...options, headers: {...headers, 'x-csrf-token': csrf}, signal: AbortSignal.timeout(90000)});
    }
    if (result.status === 429 && attempt < 3) {
      const retryAfter = Number(result.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(60000, retryAfter * 1000) : 6000 * 2 ** attempt;
      console.log('ROBLOX_RATE_LIMIT_BACKOFF', attempt + 1, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    const data = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error('ROBLOX_ASSET_API_' + result.status + ': ' + JSON.stringify(data).slice(0, 300));
    return data;
  }
  throw new Error('ROBLOX_RATE_LIMIT_EXHAUSTED');
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
for (const [dir, kind] of [['naval', 'Naval'], ['town', 'Town'], ['people', 'People'], ['castle', 'Castle'], ['interior', 'Interior'], ['relics', 'Relics'], ['terrain', 'Terrain'], ['cargo', 'Cargo'], ['icons', 'Menu']]) {
  for (const f of await fs.readdir(path.join(ROOT, 'assets', dir))) {
    const ext = path.extname(f).toLowerCase();
    if (kind === 'Menu' ? ext !== '.png' : ext !== '.glb' && ext !== '.fbx') continue;
    plan.push({kind, name: path.basename(f, ext), file: path.join(ROOT, 'assets', dir, f), ext,
      assetType: kind === 'Menu' ? 'Decal' : 'Model', license: kind === 'Menu' ? 'CC-BY-3.0' : 'CC0-1.0'});
  }
}

let registry = {schema: 1, universeId: UNIVERSE_ID, license: 'CC0-1.0', assets: {}};
try { registry = JSON.parse(await fs.readFile(JSON_OUT, 'utf8')); } catch {}
const failures = [];
const pendingPermissions = [];
for (const item of plan) {
  const id = item.kind + '/' + item.name;
  if (registry.assets[id]?.assetId) {
    // 이미 발급된 ID는 다시 업로드하지 않고 실제 파일 형식/경로만 갱신한다.
    registry.assets[id].source = item.file;
    if (registry.assets[id].usePermissionGranted !== true) pendingPermissions.push({id, assetId: registry.assets[id].assetId});
    console.log('SKIP_ALREADY_REGISTERED', id);
    continue;
  }
  try {
    let binary = await fs.readFile(item.file);
    if (binary.length > 20 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
    // Nature Kit 일부 GLB의 KHR_materials_unlit은 Roblox 수입기에서 파싱 실패한다.
    // 원본 GLB를 유지하고 전송본의 머티리얼 선언만 PBR로 정규화한다. 메시·텍스처·좌표는 변경하지 않는다.
    if (item.ext === '.glb' && binary.subarray(0, 4).toString('ascii') === 'glTF') {
      const jsonSize = binary.readUInt32LE(12);
      if (binary.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonSize > binary.length) throw new Error('INVALID_GLB_JSON_CHUNK');
      const gltf = JSON.parse(binary.subarray(20, 20 + jsonSize).toString('utf8'));
      if (gltf.extensionsUsed?.includes('KHR_materials_unlit')) {
        gltf.extensionsUsed = gltf.extensionsUsed.filter(x => x !== 'KHR_materials_unlit');
        if (gltf.extensionsRequired) gltf.extensionsRequired = gltf.extensionsRequired.filter(x => x !== 'KHR_materials_unlit');
        for (const material of gltf.materials || []) {
          if (material.extensions?.KHR_materials_unlit) delete material.extensions.KHR_materials_unlit;
          if (material.extensions && !Object.keys(material.extensions).length) delete material.extensions;
          if (material.pbrMetallicRoughness) {
            material.pbrMetallicRoughness.metallicFactor = 0;
            material.pbrMetallicRoughness.roughnessFactor = 1;
          }
        }
        let json = Buffer.from(JSON.stringify(gltf));
        const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
        json.copy(padded);
        const prefix = Buffer.from(binary.subarray(0, 20));
        prefix.writeUInt32LE(20 + padded.length + (binary.length - (20 + jsonSize)), 8);
        prefix.writeUInt32LE(padded.length, 12);
        binary = Buffer.concat([prefix, padded, binary.subarray(20 + jsonSize)]);
        console.log('NORMALIZED_GLTF_UNLIT', id);
      }
    }
    const form = new FormData();
    form.set('request', JSON.stringify({
      assetType: item.assetType, displayName: 'MareScientia ' + id,
      description: item.kind === 'Menu'
        ? 'Icons by Lorc, Delapouite, Lord Berandas / game-icons.net / CC BY 3.0. Brass recolor and PNG export for Mare Scientia; see assets/SOURCES.md'
        : 'CC0 model for Mare Scientia (' + item.kind + '); see assets/SOURCES.md',
      creationContext: {creator: {userId: Number(creatorId)}},
    }));
    form.set('fileContent', new Blob([binary], {type: item.ext === '.png' ? 'image/png' : item.ext === '.glb' ? 'model/gltf-binary' : 'model/fbx'}), path.basename(item.file));
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
    // 신규 자산도 기존 목록과 함께 일괄 권한 부여한다. 자산별 개별 PATCH 300회 호출 금지.
    registry.assets[id] = {assetId, source: item.file, license: item.license, assetType: item.assetType, usePermissionGranted: false};
    pendingPermissions.push({id, assetId});

    console.log('UPLOADED', id, assetId);
  } catch (e) {
    failures.push(id + ': ' + String(e.message).slice(0, 200));
    console.log('FAILED', id, String(e.message).slice(0, 200));
  }
}
// 사용 권한: 공식 BatchGrantPermissionsRequest/Response로 25개씩 부여하고 실제 성공 목록만 기록한다.
// HTTP 200이라도 일부 assetId가 오류면 그 항목은 승인되지 않은 것으로 유지한다.
for (let offset = 0; offset < pendingPermissions.length; offset += 25) {
  const batch = pendingPermissions.slice(offset, offset + 25);
  try {
    const response = await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions', {
      method: 'PATCH', headers: {'content-type': 'application/json'},
      body: JSON.stringify({subjectType: 'Universe', subjectId: UNIVERSE_ID, action: 'Use',
        requests: batch.map(item => ({assetId: Number(item.assetId), grantToDependencies: true}))}),
    });
    const granted = new Set((response.successAssetIds || []).map(String));
    const rejected = new Map((response.errors || []).map(row => [String(row.assetId), String(row.code)]));
    for (const item of batch) {
      if (granted.has(String(item.assetId))) {
        registry.assets[item.id].usePermissionGranted = true;
        console.log('GRANTED_ASSET', item.id);
      } else {
        failures.push(item.id + ': USE_PERMISSION_UNVERIFIED_' + (rejected.get(String(item.assetId)) || 'NOT_CONFIRMED'));
        console.log('GRANT_WARNING', item.id, rejected.get(String(item.assetId)) || 'NOT_CONFIRMED');
      }
    }
  } catch (error) {
    for (const item of batch) failures.push(item.id + ': USE_PERMISSION_UNVERIFIED');
    console.log('GRANT_BATCH_FAILED', offset, batch.length, String(error.message).slice(0, 180));
  }
}
registry.updatedAt = new Date().toISOString();
registry.license = Object.values(registry.assets).every(a => a.license === 'CC0-1.0') ? 'CC0-1.0' : 'SEE_INDIVIDUAL_ASSET_LICENSES';
await fs.writeFile(JSON_OUT, JSON.stringify(registry, null, 2) + '\n');
const lines = Object.entries(registry.assets).sort().map(([k, v]) => `\t["${k}"] = ${v.assetId},`);
await fs.writeFile(LUAU_OUT, '-- 자동 생성: tools/mare-scientia-upload-assets.mjs (직접 고치지 말 것)\nreturn {\n' + lines.join('\n') + (lines.length ? '\n' : '') + '}\n');
console.log('REGISTERED_COUNT=' + Object.keys(registry.assets).length + ' FAILED_COUNT=' + failures.length);
if (!Object.keys(registry.assets).length || failures.length) {
  console.error('REGISTRATION_INCOMPLETE', failures.length, failures.slice(0, 12).join(' | '));
  process.exitCode = 1;
}
