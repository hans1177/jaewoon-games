#!/usr/bin/env node
// 파일명: tools/mare-essentia-upload-assets.mjs
// Mare Essentia: CC0 3D 모델과 CC BY 3.0 메뉴 이미지를 기존 Open Cloud 통로로 등록한다.
// 필요: ROBLOX_OPEN_CLOUD_API_KEY (+ ROBLOX_ROBLOSECURITY 선택). 결과는 JSON과 Luau(AssetIds)로 저장한다.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const UNIVERSE_ID = process.env.MARE_UNIVERSE_ID || '10775310508';
const ROOT = 'roblox-games/mare-essentia';
const JSON_OUT = ROOT + '/assets-registered.json';
const LUAU_OUT = ROOT + '/src/ReplicatedStorage/Shared/AssetIds.luau';
// [이미지 정책] 경고 원본·파생본은 경로/해시/등록번호가 바뀌어도 다시 사용하지 않는다.
const contentSafety = JSON.parse(await fs.readFile('company-learning/platform-release-roadmap.json', 'utf8'))
  .livingMotionVisualQualityContract.assetAdaptation.contentSafety;
if (contentSafety?.enabled !== true) throw new Error('IMAGE_CONTENT_SAFETY_POLICY_REQUIRED');
const blockedPaths = new Set(contentSafety.blockedAssets.flatMap(row => row.sourcePaths || []));
const blockedHashes = new Set(contentSafety.blockedAssets.flatMap(row => row.sha256 || []));
const blockedIds = new Set(contentSafety.blockedAssets.flatMap(row => row.assetIds || []).map(String));
const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
// [스튜디오 실측 복구] 검증된 실패 ID만 기존 승인 API로 재확인한다. 재업로드는 금지한다.
const studioRegrantArg = process.argv.find(arg => arg.startsWith('--studio-regrant='));
const studioRegrantPath = studioRegrantArg ? studioRegrantArg.slice('--studio-regrant='.length) : '';
if (studioRegrantArg && !studioRegrantPath) throw new Error('STUDIO_REGRANT_REPORT_PATH_REQUIRED');
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
// 2026-11-11 오너 승인으로 바이브가 직접 그린 평면 벡터 교역품(소스: assets/goods/src/)
const VIBE_DRAWN_GOODS = ['feathers','cloves','nutmeg','cinnamon','lacquer','camphor','ginseng','vanilla','cochineal','sealskin','guano','nitrate','ambergris','gum_arabic','beer_grain','sake_rice','brazilwood','cocoa','copper','ebony','gems','gold','jade','kauri','logwood','mahogany','maize','palm_oil','pearl_shell','sandalwood','sandalwood_hi','silver'].map(n => n + '.png');
if (!studioRegrantPath) for (const [dir, kind] of [['naval', 'Naval'], ['town', 'Town'], ['people', 'People'], ['animals', 'Animals'], ['castle', 'Castle'], ['interior', 'Interior'], ['relics', 'Relics'], ['terrain', 'Terrain'], ['cargo', 'Cargo'], ['icons', 'Menu'], ['goods', 'Goods'], ['portraits', 'Portraits'], ['cardart', 'CardArt']]) {
  for (const f of await fs.readdir(path.join(ROOT, 'assets', dir))) {
    if (blockedPaths.has(path.join(ROOT, 'assets', dir, f))) continue;
    // 새 발견물 원화만 기존 이미지 승인 해시 검사를 거쳐 등록한다.
    if (kind === 'CardArt' && !/^(?:world_(?:0[1-9]|[1-9][0-9]{1,2})|event_[a-z_]+)\.jpg$/.test(f)
        && !['event_title_ship.png', 'event_title_parchment.png'].includes(f)) continue;
    const ext = path.extname(f).toLowerCase();
    const image = kind === 'Menu' || kind === 'Goods' || kind === 'Portraits' || kind === 'CardArt';
    if (image ? !['.png', '.jpg', '.jpeg'].includes(ext) : ext !== '.glb' && ext !== '.fbx') continue;
    // [원본 증빙] 기존 Cargo 업로더가 프로젝트 자체 제작 메시의 파일별 라이선스를 그대로 읽는다.
    let sourceLicense = null;
    if (kind === 'Cargo') {
      try { sourceLicense = JSON.parse(await fs.readFile(path.join(ROOT, 'assets', dir, f + '.license.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (sourceLicense && (sourceLicense.license !== 'PROJECT_ORIGINAL_ART'
        || !sourceLicense.author || !sourceLicense.sourceSha256 || !sourceLicense.source))
        throw new Error('CARGO_ORIGINAL_SOURCE_METADATA_INVALID:' + f);
    }
    plan.push({kind, name: path.basename(f, ext), file: path.join(ROOT, 'assets', dir, f), ext, sourceLicense,
      // [실제 Studio 검증] Goods/Menu/Portraits 모두 ImageLabel에서 사용한다. Decal 번호는 Client에서 로딩되지 않았다.
      // 실패 원본을 재업로드하지 않고 승인된 기존 PNG/JPG로 Image 자산을 발급한다.
      assetType: image ? 'Image' : 'Model',
      license: kind === 'Cargo' && sourceLicense ? sourceLicense.license : kind === 'CardArt' ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Menu' && ['parchment_grain.png', 'leather_grain.png'].includes(f) ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Portraits' && f.startsWith('scholar_') ? 'PUBLIC-DOMAIN'
        : kind === 'Portraits' && f === 'heroes.jpg' ? 'PUBLIC_DOMAIN_AND_ORIGINAL'
        : kind === 'Portraits' || kind === 'Goods' && ['dates.png', 'raisins.png', ...VIBE_DRAWN_GOODS].includes(f) ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Goods' && ['saffron.png', 'rice.png', 'indigo.png'].includes(f) ? 'CC0-1.0' : image ? 'CC-BY-3.0' : 'CC0-1.0'});
  }
}

let registry = {schema: 1, universeId: UNIVERSE_ID, license: 'CC0-1.0', assets: {}};
try { registry = JSON.parse(await fs.readFile(JSON_OUT, 'utf8')); } catch {}
for (const [name, row] of Object.entries(registry.assets)) {
  if (blockedPaths.has(row.source) || blockedIds.has(String(row.assetId))) delete registry.assets[name];
}
let approvedImages = {};
try { approvedImages = JSON.parse(await fs.readFile(ROOT + '/assets/APPROVED_IMAGES.json', 'utf8')).approved || {}; } catch {}
// [원본 보호] 종류 변경 중 신규 업로드나 Universe 사용 권한 확인이 실패하면 기존 등록 ID를 보존한다.
const previousTypeAssets = new Map();
for (const item of plan) {
  const row = registry.assets[item.kind + '/' + item.name];
  if (row && row.assetType && row.assetType !== item.assetType) {
    console.log('REUPLOAD_TYPE_CHANGED', item.kind + '/' + item.name, row.assetType, '->', item.assetType);
    previousTypeAssets.set(item.kind + '/' + item.name, {...row});
    delete registry.assets[item.kind + '/' + item.name];
  }
}
const failures = [];
const pendingPermissions = [];
let accountBlocked = false;
if (studioRegrantPath) {
  // [실측 계약] 다른 게임/기록이거나 등록 번호가 바뀌면 권한 쓰기를 시작하지 않는다.
  const report = JSON.parse(await fs.readFile(studioRegrantPath, 'utf8'));
  const media = report.assetAudit?.registered;
  const failuresInStudio = media?.failedMedia;
  if (report.summary?.plannedSteps !== 185 || report.summary?.completedSteps !== 185
    || report.summary?.abortedEarly !== false || report.summary?.capturedFrames !== 31
    || !Array.isArray(report.errors) || !report.errors.includes('STUDIO_ASSET_AUDIT_FAILED')
    || report.assetRegistryAudit?.status !== 'PASS'
    || report.assetRegistryAudit?.registered !== Object.keys(registry.assets).length
    || !Array.isArray(report.assetRegistryAudit?.mismatched)
    || report.assetRegistryAudit.mismatched.length !== 0
    || !Array.isArray(report.assetRegistryAudit?.missing)
    || report.assetRegistryAudit.missing.length !== 0
    || !Array.isArray(report.assetRegistryAudit?.unverifiedPermissions)
    || report.assetRegistryAudit.unverifiedPermissions.length !== 0
    || media?.status !== 'FAIL' || !Array.isArray(failuresInStudio)
    || failuresInStudio.length === 0 || failuresInStudio.length > 128
    || media.failed !== failuresInStudio.length)
    throw new Error('MARE_STUDIO_REGRANT_EVIDENCE_NOT_VERIFIED');
  const seen = new Set();
  for (const row of failuresInStudio) {
    const id = String(row.key || '').replace(/^AssetIds\./, '');
    const registered = registry.assets[id];
    if (!/^AssetIds\.(?:Goods|Menu|Portraits)\/[A-Za-z0-9._-]+$/.test(String(row.key || ''))
      || row.status !== 'TIMEOUT_16S' || seen.has(id) || !registered
      || !['Image', 'Decal'].includes(registered.assetType)
      || !/^[1-9][0-9]*$/.test(String(registered.assetId))
      || row.id !== 'rbxassetid://' + registered.assetId)
      throw new Error('MARE_STUDIO_REGRANT_ID_OR_TYPE_MISMATCH:' + id);
    seen.add(id);
    pendingPermissions.push({id, assetId: registered.assetId});
  }
  console.log('MARE_STUDIO_REGRANT_VALIDATED_TARGET_COUNT=' + pendingPermissions.length);
}
for (const item of plan) {
  const id = item.kind + '/' + item.name;
  const originalBytes = await fs.readFile(item.file);
  const sourceSha256 = crypto.createHash('sha256').update(originalBytes).digest('hex');
  if (item.sourceLicense && item.sourceLicense.sourceSha256 !== sourceSha256) {
    failures.push(id + ': CARGO_ORIGINAL_SHA256_MISMATCH');
    console.error('CARGO_ORIGINAL_SHA256_MISMATCH', id);
    continue;
  }
  if (blockedHashes.has(sourceSha256)) {
    delete registry.assets[id];
    previousTypeAssets.delete(id); // 차단 원본은 이전 등록 ID로 되돌리지 않는다.
    console.log('REMOVED_IMAGE_SOURCE_EXCLUDED', id);
    continue;
  }
  // [교역품 자동 연습→수정] 승인 SHA가 달라졌을 때만 기존 Image 업로드를 갱신한다.
  // 미승인 변경은 현재 ID를 유지하되 업로드·게임 갱신을 차단한다.
  if (item.kind === 'Goods' && item.assetType === 'Image') {
    if (approvedImages[id] !== sourceSha256) {
      console.log('GOODS_IMAGE_CHANGE_NOT_APPROVED', id);
      if (registry.assets[id]?.assetId) failures.push(id + ': GOODS_APPROVAL_HASH_MISMATCH');
      continue;
    }
    const old = registry.assets[id];
    if (old?.assetId && old.sourceSha256 && old.sourceSha256 !== sourceSha256) {
      previousTypeAssets.set(id, {...old});
      delete registry.assets[id];
      console.log('GOODS_APPROVED_SOURCE_CHANGED_REUPLOAD', id);
    }
  }
  // [바이브 자체 검수 관문] 새 이미지는 바이브가 직접 보고 확인해 APPROVED_IMAGES.json에 (이름+해시)로 올린 것만 업로드한다. 오너 승인 대기 없음(contentSafety.autonomousVibeReview).
  if (item.assetType !== 'Model' && !registry.assets[id]?.assetId) {
    const hash = crypto.createHash('sha256').update(originalBytes).digest('hex');
    if (approvedImages[id] !== hash) {
      if (previousTypeAssets.has(id)) failures.push(id + ': IMAGE_REPLACEMENT_APPROVAL_MISSING');
      console.log('SKIP_IMAGE_NOT_HUMAN_APPROVED', id);
      continue;
    }
  }
  if (registry.assets[id]?.assetId) {
    // 이미 발급된 ID는 다시 업로드하지 않고 실제 파일 형식/경로만 갱신한다.
    registry.assets[id].source = item.file;
    // 구형 등록표는 로컬 승인 원본 해시를 기준으로 다음 이미지 변경을 탐지한다.
    // 이 값만으로 Roblox 원격 바이너리 동일성/Studio 표시를 주장하지 않는다.
    if (item.kind === 'Goods' && item.assetType === 'Image')
      registry.assets[id].sourceSha256 = sourceSha256;
    if (registry.assets[id].usePermissionGranted !== true) pendingPermissions.push({id, assetId: registry.assets[id].assetId});
    console.log('SKIP_ALREADY_REGISTERED', id);
    continue;
  }
  try {
    let binary = originalBytes;
    if (binary.length > 20 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
    let uploadExt = item.ext;
    // UniGLTF 1.27 모델은 Roblox GLB 해석기에서 실패한다. 원본 메시/재질/좌표는 보존한 채
    // 표준 glTF 2.0 인라인 데이터로 전송하고 호환되지 않는 인덱스 표현만 정규화한다.
    if (item.ext === '.glb' && binary.subarray(0, 4).toString('ascii') === 'glTF') {
      const jsonSize = binary.readUInt32LE(12);
      const binHeaderOffset = 20 + jsonSize;
      if (binary.readUInt32LE(16) !== 0x4e4f534a || binHeaderOffset + 8 > binary.length) throw new Error('INVALID_GLB_JSON_CHUNK');
      const gltf = JSON.parse(binary.subarray(20, binHeaderOffset).toString('utf8'));
      if (String(gltf.asset?.generator || '').startsWith('UniGLTF-')) {
        const binLength = binary.readUInt32LE(binHeaderOffset);
        if (binary.readUInt32LE(binHeaderOffset + 4) !== 0x004e4942 || binHeaderOffset + 8 + binLength > binary.length)
          throw new Error('INVALID_GLB_BINARY_CHUNK');
        let data = Buffer.from(binary.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength));
        if (!Array.isArray(gltf.buffers) || gltf.buffers.length !== 1) throw new Error('INVALID_GLB_BUFFER_COUNT');
        gltf.extensionsUsed = (gltf.extensionsUsed || []).filter(name => name !== 'KHR_materials_unlit');
        if (gltf.extensionsRequired) gltf.extensionsRequired = gltf.extensionsRequired.filter(name => name !== 'KHR_materials_unlit');
        if (!gltf.extensionsUsed.length) delete gltf.extensionsUsed;
        if (gltf.extensionsRequired && !gltf.extensionsRequired.length) delete gltf.extensionsRequired;
        // scene.nodes는 부모가 없는 루트여야 한다. 원본의 화면 밖 tmpParent 연결만 분리한다.
        // 장면에서 보이는 노드·좌표·메시·재질·스킨 인덱스는 바꾸지 않는다.
        const sceneRoots = new Set((gltf.scenes || []).flatMap(scene => scene.nodes || []));
        const visible = new Set();
        const visit = [...sceneRoots];
        while (visit.length) {
          const index = visit.pop();
          if (visible.has(index)) continue;
          if (!Number.isInteger(index) || !gltf.nodes?.[index]) throw new Error('INVALID_SCENE_NODE');
          visible.add(index);
          for (const child of gltf.nodes[index].children || []) visit.push(child);
        }
        for (let index = 0; index < (gltf.nodes || []).length; index++) {
          const parent = gltf.nodes[index];
          if (!(parent.children || []).some(child => sceneRoots.has(child))) continue;
          if (visible.has(index)) throw new Error('SCENE_ROOT_HAS_VISIBLE_PARENT');
          parent.children = parent.children.filter(child => !sceneRoots.has(child));
          if (!parent.children.length) delete parent.children;
        }
        for (const material of gltf.materials || []) {
          if (material.extensions?.KHR_materials_unlit) delete material.extensions.KHR_materials_unlit;
          if (material.extensions && !Object.keys(material.extensions).length) delete material.extensions;
          if (material.pbrMetallicRoughness) {
            material.pbrMetallicRoughness.metallicFactor = 0;
            material.pbrMetallicRoughness.roughnessFactor = 1;
          }
        }
        const indices = new Set();
        for (const mesh of gltf.meshes || []) for (const primitive of mesh.primitives || []) {
          if (Number.isInteger(primitive.indices)) indices.add(primitive.indices);
        }
        for (const index of indices) {
          const accessor = gltf.accessors[index];
          if (!accessor || accessor.componentType !== 5125 || accessor.type !== 'SCALAR') continue;
          const view = gltf.bufferViews[accessor.bufferView];
          if (!view || view.buffer !== 0 || view.byteStride) throw new Error('UNSUPPORTED_INDEX_LAYOUT');
          const from = (view.byteOffset || 0) + (accessor.byteOffset || 0);
          if (from + accessor.count * 4 > data.length) throw new Error('INVALID_INDEX_RANGE');
          let max = 0;
          for (let i = 0; i < accessor.count; i++) max = Math.max(max, data.readUInt32LE(from + i * 4));
          if (max > 65535) continue;
          const shortIndices = Buffer.alloc(accessor.count * 2);
          for (let i = 0; i < accessor.count; i++) shortIndices.writeUInt16LE(data.readUInt32LE(from + i * 4), i * 2);
          const alignedSize = Math.ceil(data.length / 4) * 4;
          if (alignedSize !== data.length) data = Buffer.concat([data, Buffer.alloc(alignedSize - data.length)]);
          const targetView = gltf.bufferViews.length;
          gltf.bufferViews.push({buffer: 0, byteOffset: data.length, byteLength: shortIndices.length, target: 34963});
          data = Buffer.concat([data, shortIndices]);
          accessor.bufferView = targetView;
          accessor.byteOffset = 0;
          accessor.componentType = 5123;
        }
        gltf.buffers[0].byteLength = data.length;
        gltf.buffers[0].uri = 'data:application/octet-stream;base64,' + data.toString('base64');
        binary = Buffer.from(JSON.stringify(gltf), 'utf8');
        uploadExt = '.gltf';
        console.log('NORMALIZED_STANDARD_GLTF', id, binary.length);
      }
    }
    const form = new FormData();
    form.set('request', JSON.stringify({
      assetType: item.assetType, displayName: ('MareEssentia ' + id).slice(0, 48),
      description: item.assetType !== 'Model'
        ? item.kind === 'Portraits' && item.name === 'heroes' ? 'Nine historical/fictional protagonist portraits: original game art plus public-domain archival images; sources in assets/SOURCES.md'
          : item.kind === 'CardArt' ? 'Original illustrated discovery art for Mare Essentia; subject sources and atlas coordinates in assets/SOURCES.md and assets/cardart/world-catalog.json'
          : item.kind === 'Portraits' && item.name.startsWith('scholar_') ? 'Public-domain historical portrait from Wikimedia Commons (license verified by fetch_commons.py); see assets/portraits/portraits-report.json'
          : item.kind === 'Portraits' ? 'Original NPC dialogue portrait for Mare Essentia at owner request; see assets/SOURCES.md'
          : item.kind === 'Menu' && item.license === 'PROJECT_ORIGINAL_ART' ? 'Original aged parchment and embossed leather texture rendered for Mare Essentia book UI; approved hash in assets/APPROVED_IMAGES.json'
          : item.license === 'PROJECT_ORIGINAL_ART' ? 'Original vector commodity art made for Mare Essentia at owner request; see assets/SOURCES.md'
          : item.kind === 'Goods' && ['rice', 'indigo'].includes(item.name) ? 'OpenFarm Open Crop Icons CC0 source illustrations; see assets/SOURCES.md'
          : item.license === 'CC0-1.0' ? 'Tiny Speck Glitch / CC0, vector conversion by Bart; see assets/SOURCES.md'
          : 'Icons by Lorc, Delapouite, Lord Berandas, Skoll / game-icons.net / CC BY 3.0. Color edit and PNG export for Mare Essentia; see assets/SOURCES.md'
        : item.assetType === 'Model' && item.license === 'PROJECT_ORIGINAL_ART'
        ? 'Original 3D commodity model for Mare Essentia; individual source and hash in assets/cargo/*.license.json'
        : 'CC0 model for Mare Essentia (' + item.kind + '); see assets/SOURCES.md',
      creationContext: {creator: {userId: Number(creatorId)}},
    }));
    form.set('fileContent', new Blob([binary], {type: uploadExt === '.png' ? 'image/png' : ['.jpg', '.jpeg'].includes(uploadExt) ? 'image/jpeg' : uploadExt === '.gltf' ? 'model/gltf+json' : uploadExt === '.glb' ? 'model/gltf-binary' : 'model/fbx'}), path.basename(item.file, item.ext) + uploadExt);
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
    registry.assets[id] = {assetId, source: item.file, license: item.license, assetType: item.assetType, usePermissionGranted: false,
      ...(item.kind === 'Goods' && item.assetType === 'Image' || item.sourceLicense ? {sourceSha256} : {})};
    pendingPermissions.push({id, assetId});

    console.log('UPLOADED', id, assetId);
  } catch (e) {
    failures.push(id + ': ' + String(e.message).slice(0, 200));
    console.log('FAILED', id, String(e.message).slice(0, 200));
    if (/User is moderated/i.test(String(e.message))) {
      accountBlocked = true;
      console.error('REGISTRATION_BLOCKED_ACCOUNT_MODERATED: remaining uploads and permission writes stopped');
      break;
    }
  }
}
// 사용 권한: 공식 BatchGrantPermissionsRequest/Response로 25개씩 부여하고 실제 성공 목록만 기록한다.
// HTTP 200이라도 일부 assetId가 오류면 그 항목은 승인되지 않은 것으로 유지한다.
for (let offset = 0; !accountBlocked && offset < pendingPermissions.length; offset += 25) {
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
// [등록 원자성] 45개 기존 Decal을 새 Image로 바꾸는 도중 하나라도 실패하면 기존 게임 자산 연결을 유지한다.
// 새 ID는 실제 성공한 권한 확인 결과가 전부 준비됐을 때만 기존 Lua/등록표에 반영한다.
const replacementUnverified = [...previousTypeAssets].filter(([id]) =>
  registry.assets[id]?.assetType !== 'Image' || registry.assets[id]?.usePermissionGranted !== true);
if (replacementUnverified.length) failures.push('MARE_IMAGE_REPLACEMENTS_NOT_VERIFIED:' + replacementUnverified.length);
if (failures.length && previousTypeAssets.size) {
  for (const [id, previous] of previousTypeAssets) registry.assets[id] = previous;
  console.log('MARE_IMAGE_REPLACEMENT_ROLLBACK=OLD_IDS_PRESERVED:' + previousTypeAssets.size);
}
if (failures.length === 0) registry.updatedAt = new Date().toISOString();
registry.license = Object.values(registry.assets).every(a => a.license === 'CC0-1.0') ? 'CC0-1.0' : 'SEE_INDIVIDUAL_ASSET_LICENSES';
await fs.writeFile(JSON_OUT, JSON.stringify(registry, null, 2) + '\n');
const lines = Object.entries(registry.assets).sort().map(([k, v]) => `\t["${k}"] = ${v.assetId},`);
await fs.writeFile(LUAU_OUT, '-- 자동 생성: tools/mare-essentia-upload-assets.mjs (직접 고치지 말 것)\nreturn {\n' + lines.join('\n') + (lines.length ? '\n' : '') + '}\n');
console.log('REGISTERED_COUNT=' + Object.keys(registry.assets).length + ' FAILED_COUNT=' + failures.length);
if (!Object.keys(registry.assets).length || failures.length) {
  console.error('REGISTRATION_INCOMPLETE', failures.length, failures.slice(0, 12).join(' | '));
  process.exitCode = 1;
}


