// 파일명: tools/company-nemotron-design-review.mjs
// [임포트] 기존 Studio MCP 촬영본에 결합된 무료 네모트론 디자인 후보만 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

// [정책] 외부 이미지·소스 분석은 무료 확인된 NVIDIA 시험 API에서만 실행한다.
const MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const POLICY = 'company-learning/external-ai-distillation-policy.json';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const trim = value => String(value ?? '').trim();
const options = Object.fromEntries(process.argv.slice(2)
  .filter(s => s.startsWith('--') && s.includes('='))
  .map(s => [s.slice(2, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]));
const root = path.resolve(options.root || 'main');
const framesRoot = path.resolve(options.frames || '.');
const reportPath = path.resolve(options.out || path.join(framesRoot, 'nemotron-design-review.json'));
const protectedCode = /\b(?:DataStore|RemoteEvent|RemoteFunction|FireServer|FireClient|OnServerEvent|OnClientEvent|SetAttribute|GetAttribute|GetService|HttpService|require|loadstring|setfenv|getfenv|Humanoid|WalkSpeed|JumpPower|Health|Damage|Hitbox|CanCollide|CanTouch|CanQuery|Anchored|Currency|Reward|Experience|Purchase|MarketplaceService|TeleportService)\b/i;
const visualCode = /Color3\.(?:new|fromRGB|fromHSV)\(|Enum\.(?:Material|Font|EasingStyle|TextXAlignment|TextYAlignment)\.|\.(?:Color|Color3|TextColor3|BackgroundColor3|ImageColor3|Transparency|TextTransparency|BackgroundTransparency|ImageTransparency|LightInfluence|Material|Font|TextSize|Size|Position|Rotation|Scale|Brightness|Contrast|Saturation|FieldOfView|Ambient|OutdoorAmbient|Reflectance|Emission|StrokeThickness)\s*=|(?:UDim2|UDim)\.new\(/;
const quoted = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;

export function authorizedCandidateBranch(name, runId) {
  return /^[0-9]{5,}$/.test(String(runId ?? '')) &&
    name === 'nemotron-mare-design-' + String(runId);
}

function record(status, fields = {}) {
  const report = {version: 2, provider: 'NVIDIA', model: MODEL, gameId: 'mare-essentia',
    sourceRevision: trim(process.env.GITHUB_SHA), status, ...fields};
  fs.mkdirSync(path.dirname(reportPath), {recursive: true});
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('NEMOTRON_DESIGN_STATUS=' + status);
  return report;
}

// [스튜디오 증거] 실제 캡처 이름, 원본 리비전, 이미지 바이트 형식을 모두 대조한다.
// [화면 근거 배치] 마을 배치 4장·주민 2장·선박 1장·모바일 UI 1장을 우선한다.
// 같은 무료 호출 안에서는 분야가 겹치지 않고, 다음 Studio 회차에서 각도를 순환한다.
export function selectStudioDesignPhotoNames(names, sequence = 0, limit = 8) {
  const available = new Map();
  for (const name of names) {
    if (!/^[A-Za-z0-9_.-]+-[0-9]+\.(?:jpe?g|png)$/i.test(name)) continue;
    const label = name.replace(/-[0-9]+\.(?:jpe?g|png)$/i, '');
    if (!available.has(label)) available.set(label, name);
  }
  const groups = [
    ['town_aerial_grid','town_plaza_full','town_outer_district_north','town_outer_district_south','town_plaza_center'],
    ['town_facility_row_wide','town_market_facade','town_guild_facade','town_scholar_library','town_library_street'],
    ['town_harbor_to_market','town_street_roofline','town_outer_district_north','town_plaza_center','town_plaza_full'],
    ['town_outer_district_south','town_facility_row_wide','town_library_street','town_harbor_to_market','town_aerial_grid'],
    ['harbor_npc_face_close','harbor_npc_hair_left','harbor_npc_hair_right','harbor_npc_hair_back','harbor_npc_face_front'],
    ['harbor_npc_outfit_front','harbor_npc_outfit_side','harbor_npc_outfit_back','harbor_npc_pair_diagonal','harbor_npc_port_street_reverse'],
    ['ui_mobile_battle_2x2','ui_main_menu_icons','tab_harbor','field_npc_ally_mob','tab_crew'],
    ['cb0_deck','cb1','cb2','v1_start','v2_event']
  ];
  const selected = [];
  const used = new Set();
  const phase = Number.isSafeInteger(Number(sequence)) ? Math.abs(Number(sequence)) % 5 : 0;
  for (const group of groups) {
    for (let offset = 0; offset < group.length; offset++) {
      const name = available.get(group[(phase + offset) % group.length]);
      if (!name || used.has(name)) continue;
      selected.push(name);
      used.add(name);
      break;
    }
    if (selected.length >= limit) return selected;
  }
  for (const name of [...available.values()].sort()) {
    if (!used.has(name)) selected.push(name);
    if (selected.length >= limit) break;
  }
  return selected;
}

function photosFromStudio() {
  if (!fs.existsSync(framesRoot)) return [];
  const names = fs.readdirSync(framesRoot).sort();
  const chosen = selectStudioDesignPhotoNames(names, process.env.GITHUB_RUN_ID, 8);
  const found = [];
  for (const name of chosen) {
    const file = path.join(framesRoot, name);
    if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.length < 4096 || bytes.length > 2000000) continue;
    const jpeg = bytes[0] === 255 && bytes[1] === 216;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!jpeg && !png) continue;
    found.push({name, sha256: digest(bytes), url: 'data:image/' +
      (jpeg ? 'jpeg' : 'png') + ';base64,' + bytes.toString('base64')});
  }
  return found;
}

export function verifiedStudioCapture(report, photos, expectedRevision) {
  if (!/^[a-f0-9]{40}$/i.test(String(expectedRevision ?? '')) ||
    report?.sourceRevision !== expectedRevision ||
    !Array.isArray(report?.log) ||
    !Number.isInteger(Number(report?.summary?.capturedFrames)) ||
    Number(report.summary.capturedFrames) < photos.length ||
    (Array.isArray(report.errors) && report.errors.length > 0)) return false;
  const captured = new Set(report.log.filter(row => typeof row?.capture === 'string')
    .map(row => row.capture));
  return photos.length >= 2 && photos.every(photo =>
    captured.has(photo.name.replace(/-[0-9]+\.(?:jpe?g|png)$/i, '')));
}

// [검사] 원본 소스 구조와 문맥을 유지하는 시각 상수·표현 변경만 허용한다.
// 게임플레이 수치·제어 흐름·문자열/에셋 ID·실행문 신규 삽입은 막는다.
export function visualEditLooksSafe(before, after, category = '', sourcePath = '') {
  if (typeof before !== 'string' || typeof after !== 'string' || before === after ||
    !before.trim() || /[\r\n]/.test(before + after) ||
    Buffer.byteLength(before) > 1800 || Buffer.byteLength(after) > 1800 ||
    before.trimStart().startsWith('--') || before.includes('--') ||
    after.includes('--') || /[;]/.test(before + after) ||
    protectedCode.test(before + '\n' + after) ||
    !visualCode.test(before) || !visualCode.test(after)) return false;
  if ((before.match(quoted) || []).join('\0') !== (after.match(quoted) || []).join('\0'))
    return false;
  if ((before.match(/^\s*/) || [''])[0] !== (after.match(/^\s*/) || [''])[0])
    return false;
  const skeleton = line => line
    .replace(/Enum\.(?:Material|Font|EasingStyle|TextXAlignment|TextYAlignment)\.[A-Za-z_][A-Za-z_0-9]*/g,
      token => token.slice(0, token.lastIndexOf('.') + 1) + '#')
    .replace(/(?<![A-Za-z_0-9])-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?![A-Za-z_0-9])/g, '#');
  if (skeleton(before) !== skeleton(after)) return false;
  // [건축물 배치] 기존 PortScene 시설 좌표만 제한적으로 수정한다.
  // UI·경제·저장·지형 충돌 판정과 분리하고 원본 시설의 이름/기능/크기는 그대로 둔다.
  const location = /\bpos\s*=\s*Vector3\.new\(\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*\)/;
  const oldPlacement = before.match(location), newPlacement = after.match(location);
  if (oldPlacement || newPlacement) {
    if (!oldPlacement || !newPlacement) return false;
    // [기존 시설 보호] 건축물 폭·층수·경제 데이터는 색채·위치 편집에 섞여 바뀔 수 없다.
    if (/^\s*\{\s*name\s*=\s*"/.test(before) && /\btab\s*=\s*"/.test(before)) {
      const rgb = /Color3\.fromRGB\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/;
      const unchanged = line => line.replace(location, '#POSITION#').replace(rgb, '#COLOR#');
      if (unchanged(before) !== unchanged(after)) return false;
    }
    if (oldPlacement[0] !== newPlacement[0]) {
      if (category !== 'architecture' ||
        sourcePath !== 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau' ||
        !/^\s*\{\s*name\s*=\s*"/.test(before) ||
        !/\btab\s*=\s*"/.test(before) || !/\beconomy\s*=\s*"/.test(before) ||
        before.replace(oldPlacement[0], '#POSITION#') !==
        after.replace(newPlacement[0], '#POSITION#')) return false;
      const oldXYZ = oldPlacement.slice(1).map(Number), nextXYZ = newPlacement.slice(1).map(Number);
      if (oldXYZ.some(n => !Number.isFinite(n)) || nextXYZ.some(n => !Number.isFinite(n)) ||
        Math.abs(nextXYZ[0] - oldXYZ[0]) > 5 || nextXYZ[1] !== oldXYZ[1] ||
        Math.abs(nextXYZ[2] - oldXYZ[2]) > 5 ||
        Math.sign(nextXYZ[2]) !== Math.sign(oldXYZ[2]) || Math.abs(nextXYZ[2]) < 32)
        return false;
    }
  }
  const numbers = line => [...line.matchAll(/(?<![A-Za-z_0-9])-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?![A-Za-z_0-9])/g)]
    .map(m => Number(m[0]));
  const oldNums = numbers(before), newNums = numbers(after);
  if (oldNums.length !== newNums.length ||
    newNums.some((n, i) => !Number.isFinite(n) || Math.abs(n) > Math.max(1024, Math.abs(oldNums[i]) * 2 + 1)))
    return false;
  return true;
}

export function validateReview(value, frameNames, contract, availableAnchors = null) {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (typeof raw === 'string' && Buffer.byteLength(raw) > 90000) throw Error('RESPONSE_INVALID_SIZE');
  const response = typeof raw === 'string'
    ? JSON.parse(raw.replace(/^```(?:json)?\s*\n/i, '').replace(/\n```\s*$/, ''))
    : raw;
  if (!response || !Array.isArray(response.issues) || !Array.isArray(response.edits) ||
    response.issues.length > 16 || response.edits.length > (contract?.maximumSourceEditsPerRun || 10))
    throw Error('REVIEW_SCHEMA_INVALID');
  const frames = new Set(frameNames);
  const categories = new Set(contract?.visualCategories || []);
  const allowedFiles = new Set(contract?.allowedSourceFiles || []);
  if (categories.size < 10 || allowedFiles.size < 2) throw Error('DESIGN_POLICY_INCOMPLETE');
  const issues = response.issues.map(row => {
    if (!row || !categories.has(row.category) || !['low', 'medium', 'high'].includes(row.severity) ||
      !frames.has(row.screenshot) || typeof row.evidence !== 'string' ||
      row.evidence.trim().length < 12 || row.evidence.length > 500)
      throw Error('ISSUE_EVIDENCE_INVALID');
    return {category: row.category, severity: row.severity, screenshot: row.screenshot,
      evidenceSha256: digest(row.evidence.trim())};
  });
  const files = new Set(), usedAnchors = new Set();
  const edits = response.edits.map(row => {
    // 실제 소스에서 뽑은 색인만 허용해 없는 파일/가짜 원본을 제안해도 적용되지 않는다.
    const pinned = Array.isArray(availableAnchors)
      ? (Number.isInteger(row?.anchor) ? availableAnchors[row.anchor] : undefined)
      : null;
    const sourcePath = Array.isArray(availableAnchors) ? pinned?.path : row?.path;
    const before = Array.isArray(availableAnchors) ? pinned?.before : row?.before;
    if (!row || (Array.isArray(availableAnchors) && (!pinned ||
      (row.path !== undefined && row.path !== sourcePath) ||
      (row.before !== undefined && row.before !== before))) ||
      !allowedFiles.has(sourcePath) || !categories.has(row.category) ||
      !frames.has(row.screenshot) || !issues.some(issue =>
        issue.category === row.category && issue.screenshot === row.screenshot &&
        issue.severity !== 'low') ||
      !visualEditLooksSafe(before, row.after, row.category, sourcePath))
      throw Error('EDIT_NOT_VISUAL_OR_NOT_IN_POLICY');
    const key = sourcePath + '\0' + before;
    if (usedAnchors.has(key)) throw Error('DUPLICATE_SOURCE_ANCHOR');
    usedAnchors.add(key);
    files.add(sourcePath);
    return {path: sourcePath, category: row.category, screenshot: row.screenshot,
      before, after: row.after};
  });
  if (files.size > (contract.maximumCandidateFilesPerRun || 4))
    throw Error('CANDIDATE_FILE_LIMIT');
  return {issues, edits};
}

function cleanAnchor(line) {
  return line.length <= 260 && visualCode.test(line) && !protectedCode.test(line) &&
    !/--|[;]|https?:\/\/|(?:api[_-]?key|secret|token|password)/i.test(line) &&
    !line.trimStart().startsWith('--');
}
function visualAnchors(files) {
  const result = [];
  for (const file of files) {
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) ||
      !fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()) continue;
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
    const counts = new Map();
    for (const line of lines) counts.set(line, (counts.get(line) || 0) + 1);
    const possible = lines.filter(line => cleanAnchor(line) && counts.get(line) === 1);
    // 얼굴과 머리/옷을 먼저, 나머지 건물·선박·UI는 파일 전체 구간을 고르게 표본화한다.
    const focused = file.endsWith('/Pose.luau')
      ? possible.filter(line => /LightInfluence|scalp|skirt|belt|hair|q\.Size|Fabric/i.test(line)).slice(0, 4)
      : file.endsWith('/PortScene.luau')
        ? possible.filter(line => /^\s*\{\s*name\s*=\s*"/.test(line) &&
          /\bpos\s*=\s*Vector3\.new\(/.test(line) && /\bcolor\s*=\s*Color3\.fromRGB\(/.test(line)).slice(0, 7)
        : [];
    const sampled = Array.from({length: 8}, (_, index) =>
      possible[Math.floor(index * Math.max(0, possible.length - 1) / 7)]).filter(Boolean);
    for (const line of [...new Set([...focused, ...sampled])].slice(0, file.endsWith('/PortScene.luau') ? 13 : 7))
      result.push({anchor: result.length, path: file, before: line});
  }
  return result.slice(0, 112);
}

// [메인] 후보는 검증된 브랜치에서만 쓰며 모델 원문/명령은 실행하지 않는다.
export function applyVisualReplacements(files, edits, contract) {
  const output = new Map(), changes = [];
  for (const edit of edits) {
    if (!contract.allowedSourceFiles.includes(edit.path) ||
      !visualEditLooksSafe(edit.before, edit.after, edit.category, edit.path)) throw Error('EDIT_NOT_AUTHORIZED');
    if (!Object.hasOwn(files, edit.path)) throw Error('SOURCE_FILE_NOT_FOUND:' + edit.path);
    const source = output.get(edit.path) || files[edit.path];
    const lines = source.split('\n');
    const occurrences = lines.filter(line => line === edit.before).length;
    if (occurrences !== 1) throw Error('SOURCE_ANCHOR_NOT_UNIQUE:' + edit.path);
    output.set(edit.path, lines.map(line => line === edit.before ? edit.after : line).join('\n'));
    changes.push({path: edit.path, category: edit.category, screenshot: edit.screenshot,
      beforeSha256: digest(edit.before), afterSha256: digest(edit.after)});
  }
  if (changes.length > contract.maximumSourceEditsPerRun ||
    output.size > contract.maximumCandidateFilesPerRun) throw Error('CANDIDATE_LIMIT');
  return {files: output, changes};
}

export async function reviewNemotron({fetchImpl = globalThis.fetch} = {}) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY), 'utf8'));
  const contract = policy.directVisualDesign;
  const coverage = contract?.studioEvidenceSelection;
  const townLayout = contract?.townLayoutEdit;
  if (!coverage || coverage.expectedCoverageFrames !== 83 ||
    coverage.maxImagesPerFreeCall !== 8 || coverage.rotationPhases !== 5 ||
    !coverage.sourcesMustBeExactStudioCaptureAndCodeRevision ||
    !townLayout?.enabled || townLayout.sourceFile !==
      'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau' ||
    townLayout.maximumHorizontalShiftStuds !== 5 || townLayout.verticalShiftStuds !== 0 ||
    !townLayout.sameStreetSideRequired ||
    townLayout.minimumPlazaDistanceFromCenterlineStuds !== 32 ||
    !townLayout.sizeFloorsEconomyRoutesAndSaveUnchanged ||
    !townLayout.exactSourceAnchorAndIndependentStudioBeforeAfterQaRequired)
    throw Error('CANONICAL_STUDIO_DESIGN_POLICY_DENIED');
  if (!contract?.enabled || contract.model !== MODEL ||
    !contract.gameIds?.includes('mare-essentia') ||
    !contract.isolatedCandidateBranchRequired || !contract.directCandidateSourceEditAllowed ||
    !contract.directMainWriteForbidden || !contract.modelMayProposeSourceCode ||
    !contract.exactOldSourceMustMatchOnce || !contract.nativeSecurityAndReleaseGatesMandatory ||
    contract.maximumCandidateFilesPerRun > 4 || contract.maximumSourceEditsPerRun > 10 ||
    contract.maximumReplacementBytes > 1800 || !Array.isArray(contract.allowedSourceFiles) ||
    contract.allowedSourceFiles.length < 2 ||
    contract.allowedSourceFiles.some(file => !/^roblox-games\/mare-essentia\/src\/[A-Za-z0-9_./-]+\.luau$/.test(file)))
    throw Error('CANONICAL_DESIGN_POLICY_DENIED');
  const photos = photosFromStudio();
  const proofs = photos.map(({name, sha256}) => ({name, sha256}));
  if (photos.length < 2) return record('SKIPPED_STUDIO_IMAGES_UNAVAILABLE', {frames: proofs});
  let studio;
  try {
    studio = JSON.parse(fs.readFileSync(path.join(framesRoot, 'report.json'), 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return record('SKIPPED_OFFICIAL_STUDIO_REPORT_MISSING', {frames: proofs});
  }
  if (!verifiedStudioCapture(studio, photos, process.env.GITHUB_SHA))
    return record('SKIPPED_STUDIO_SOURCE_EVIDENCE_MISMATCH', {frames: proofs});
  if (trim(process.env.COMPANY_EXTERNAL_AI_ENABLED) !== 'YES')
    return record('SKIPPED_EXTERNAL_AI_OPT_IN_REQUIRED', {frames: proofs});
  if (trim(process.env.NVIDIA_FREE_TIER_VERIFIED) !== 'YES')
    return record('SKIPPED_FREE_TIER_UNVERIFIED', {frames: proofs});
  if (!trim(process.env.NVIDIA_API_KEY))
    return record('SKIPPED_API_KEY_MISSING', {frames: proofs});
  if (trim(process.env.NEMOTRON_DESIGN_CANDIDATE) !== 'YES')
    return record('SKIPPED_CANDIDATE_EDIT_NOT_ENABLED', {frames: proofs});
  let branch = '';
  try {
    branch = execFileSync('git', ['-C', root, 'symbolic-ref', '--quiet', '--short', 'HEAD'],
      {encoding: 'utf8', timeout: 5000}).trim();
  } catch {
    return record('BLOCKED_NO_CANDIDATE_BRANCH', {frames: proofs});
  }
  if (!authorizedCandidateBranch(branch, process.env.GITHUB_RUN_ID))
    return record('BLOCKED_NOT_ISOLATED_CANDIDATE_BRANCH', {frames: proofs});
  const anchors = visualAnchors(contract.allowedSourceFiles);
  if (!anchors.length) return record('SKIPPED_NO_EXISTING_VISUAL_ANCHORS', {frames: proofs});
  const prompt = 'You are a visual art director for the existing Roblox sea-voyage game. ' +
    'Study the verified real Studio screenshots and improve face, hair, clothing, ships, buildings, ' +
    'materials, lighting, HUD, cards, portraits, motion and composition where visually justified. ' +
    'Never create primitives, placeholder models, new art assets, URLs or unlicensed assets. ' +
    'Only change visual constants on EXISTING exact source lines shown in anchors. ' +
    'Town layout may adjust ONLY EXISTING named facility pos Vector3 coordinates on the existing PortScene line, ' +
    'category architecture, max 5 studs per horizontal axis, unchanged height, no center plaza or route obstruction. ' +
    'Inspect plaza, streets, houses, market, library and rooftop composition from the actual captured town shots. ' +
    'Never modify gameplay, economy, save, combat, physics, networking, or script control flow. ' +
    'Return STRICT JSON: {"issues":[{"category":"one policy category","severity":"low|medium|high",' +
    '"screenshot":"existing image name","evidence":"specific visible evidence"}],' +
    '"edits":[{"category":"matching medium or high issue category","screenshot":"same photo",' +
    '"anchor":number,"after":"same referenced line with ONLY numerical visual values or existing visual enum changed"}]}. ' +
    'At most 10 edits across 4 files. Never add/remove functions, statements, assets, text, ' +
    'commands, identifiers, property targets or line breaks. Empty edits when uncertain. ' +
    'Policies: ' + JSON.stringify({categories: contract.visualCategories,
      maxReplacementBytes: contract.maximumReplacementBytes}) + '. ' +
    'Screenshots: ' + JSON.stringify(photos.map(x => x.name)) + '. ' +
    'Existing verified source anchors: ' + JSON.stringify(anchors);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST', signal: controller.signal,
      headers: {Authorization: 'Bearer ' + trim(process.env.NVIDIA_API_KEY),
        'Content-Type': 'application/json'},
      body: JSON.stringify({model: MODEL, stream: false, max_tokens: 3500,
        messages: [{role: 'user', content: [{type: 'text', text: prompt},
          ...photos.map(photo => ({type: 'image_url', image_url: {url: photo.url}}))]}]})
    });
    if (!response.ok) return record('UNVERIFIED_HTTP_' + response.status, {frames: proofs});
    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    const reviewed = validateReview(raw, photos.map(photo => photo.name), contract, anchors);
    const originals = Object.fromEntries([...new Set(reviewed.edits.map(edit => edit.path))]
      .map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
    const candidate = applyVisualReplacements(originals, reviewed.edits, contract);
    const evidence = {frames: proofs, rawResponseSha256: digest(trim(raw)),
      issues: reviewed.issues, edits: candidate.changes,
      sourceHashes: [...candidate.files].map(([file, content]) =>
        ({path: file, beforeSha256: digest(originals[file]), afterSha256: digest(content)})),
      candidateOnly: true, independentQaPassed: false, afterStudioPassed: false,
      releasePassed: false};
    if (!candidate.changes.length) return record('REVIEWED_NO_EDIT', evidence);
    for (const [file, content] of candidate.files) fs.writeFileSync(path.join(root, file), content);
    return record('CANDIDATE_EDITED', evidence);
  } catch (error) {
    return record('UNVERIFIED_REVIEW_ERROR', {frames: proofs,
      reason: trim(error?.message).slice(0, 120).replace(/[^\w:.-]/g, '_')});
  } finally {
    clearTimeout(timeout);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  reviewNemotron().catch(error => {
    console.log('NEMOTRON_DESIGN_STATUS=UNVERIFIED_INTERNAL_ERROR');
    console.log('NEMOTRON_DESIGN_FAILURE=' + trim(error?.message).replace(/[^\w:.-]/g, '_').slice(0, 100));
    process.exitCode = 1;
  });
}
