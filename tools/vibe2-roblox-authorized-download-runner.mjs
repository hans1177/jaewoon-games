// 파일명: tools/vibe2-roblox-authorized-download-runner.mjs
// 역할: 제작자가 Place Copying을 허용한 외부 Roblox place만 서버에서 임시 다운로드하고,
//       raw place/source는 메모리에 남기지 않은 채 일반화된 코드 패턴 증거를 만든 뒤 실제 Studio runtime을 실행한다.
// 계약: 다운로드 명령은 nonce-bound VIBE2_ROBLOX_AUTHORIZED_DOWNLOAD_RESULT_BASE64 결과를 반환해야 한다.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const DOWNLOAD_AUTHORITY = 'vibe2-roblox-authorized-download';
const COPY_PERMISSION = 'creator-enabled-place-copying';
const DOWNLOAD_MARKER = 'VIBE2_ROBLOX_AUTHORIZED_DOWNLOAD_RESULT_BASE64=';
const MAX_PLACE_BYTES = 104857600;

function argsOf(argv = process.argv.slice(2)) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) out[body] = true;
    else out[body.slice(0, at)] = body.slice(at + 1);
  }
  return out;
}

function parseArgsJson(value = '[]') {
  const parsed = JSON.parse(clean(value) || '[]');
  if (!Array.isArray(parsed)) throw new Error('command args must be a JSON array');
  return parsed.map((row) => String(row));
}

function runProcess(command, args, { cwd = process.cwd(), env = {}, timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '', stderr = '', settled = false;
    const finish = (error, code = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve({ code, stdout, stderr });
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      finish(new Error(`authorized Roblox process timeout: ${timeoutMs}ms`));
    }, Math.max(5000, Number(timeoutMs) || 180000));
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { if (stdout.length < 600000) stdout += chunk; });
    child.stderr.on('data', (chunk) => { if (stderr.length < 600000) stderr += chunk; });
    child.on('error', finish);
    child.on('close', (code) => finish(null, code));
  });
}

function parseDownloadEvidence(stdout = '') {
  const line = String(stdout).split(/\r?\n/).reverse().find((row) => row.startsWith(DOWNLOAD_MARKER));
  if (!line) throw new Error('authorized Roblox download evidence missing');
  const encoded = line.slice(DOWNLOAD_MARKER.length).trim();
  try { return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')); }
  catch (error) { throw new Error(`authorized Roblox download evidence parse failed: ${error.message}`); }
}

function ensureWorkspace(cwd, sourceRoot) {
  const base = path.resolve(cwd);
  const root = path.resolve(cwd, sourceRoot);
  if (root === base || !root.startsWith(`${base}${path.sep}`)) throw new Error('authorized source root must be an isolated workspace child');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  return root;
}

const GENERALIZED_PATTERNS = Object.freeze([
  ['datastore-persistence', /\bDataStoreService\b/i, 'DataStoreService'],
  ['network-remotes', /\b(?:RemoteEvent|RemoteFunction)\b/i, 'RemoteEvent RemoteFunction'],
  ['input-services', /\b(?:UserInputService|ContextActionService)\b/i, 'UserInputService ContextActionService'],
  ['frame-loop', /\bRunService\b/i, 'RunService'],
  ['tagged-entities', /\bCollectionService\b/i, 'CollectionService'],
  ['pathfinding', /\bPathfindingService\b/i, 'PathfindingService'],
  ['monetization-api', /\bMarketplaceService\b/i, 'MarketplaceService'],
  ['character-humanoid', /\bHumanoid\b/i, 'Humanoid']
]);

function distillPlaceFile(placeFile, sourceRoot, metadata) {
  const stat = fs.statSync(placeFile);
  if (!stat.isFile() || stat.size <= 0) throw new Error('authorized Roblox downloaded place is empty');
  if (stat.size > MAX_PLACE_BYTES) throw new Error(`authorized Roblox place exceeds ${MAX_PLACE_BYTES} bytes`);
  if (path.extname(placeFile).toLowerCase() !== '.rbxlx') throw new Error('authorized Roblox learning requires .rbxlx text place format');
  const text = fs.readFileSync(placeFile, 'utf8');
  const matches = GENERALIZED_PATTERNS.filter(([, pattern]) => pattern.test(text));
  const evidenceFile = path.join(sourceRoot, 'authorized-pattern-evidence.luau');
  const evidenceText = [
    '-- Vibe2 generalized evidence generated from an authorized copy-enabled Roblox place.',
    '-- Raw source and raw place data are intentionally not persisted here.',
    ...matches.map(([, , token]) => `-- ${token}`)
  ].join('\n') + '\n';
  fs.writeFileSync(evidenceFile, evidenceText, 'utf8');
  const digest = crypto.createHash('sha256').update(fs.readFileSync(placeFile)).digest('hex');
  fs.writeFileSync(path.join(sourceRoot, 'authorized-download-manifest.json'), `${JSON.stringify({
    version: 1,
    authority: DOWNLOAD_AUTHORITY,
    placeId: metadata.placeId,
    permission: COPY_PERMISSION,
    permissionEvidence: metadata.permissionEvidence,
    copyAllowed: true,
    rawSourcePersisted: false,
    rawPlacePersisted: false,
    placeSha256: digest,
    generalizedPatterns: matches.map(([name]) => name)
  }, null, 2)}\n`, 'utf8');
  return { digest, generalizedPatterns: matches.map(([name]) => name), evidenceFile };
}

export async function runAuthorizedRobloxDownloadRuntime({
  placeId = '', copyPermission = '', permissionEvidence = '', sourceRoot = '',
  downloadCommand = '', downloadArgs = [], runtimeCommand = '', runtimeArgs = [],
  cwd = process.cwd(), timeoutMs = 180000
} = {}) {
  const normalizedPlaceId = clean(placeId);
  if (!/^\d+$/.test(normalizedPlaceId)) throw new Error('authorized Roblox placeId must be numeric');
  if (clean(copyPermission) !== COPY_PERMISSION) throw new Error('creator-enabled place copying permission required');
  if (!clean(permissionEvidence)) throw new Error('copy permission evidence required');
  if (!clean(downloadCommand)) throw new Error('authorized Roblox download command required');
  if (!clean(runtimeCommand)) throw new Error('Roblox Studio runtime command required');
  const root = ensureWorkspace(cwd, sourceRoot);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-authorized-copy-'));
  const placeFile = path.join(tempRoot, `place-${normalizedPlaceId}.rbxlx`);
  const nonce = crypto.randomBytes(24).toString('hex');
  let distilled = null;
  try {
    const download = await runProcess(downloadCommand, downloadArgs, {
      cwd,
      timeoutMs,
      env: {
        VIBE2_ROBLOX_DOWNLOAD_AUTHORITY: DOWNLOAD_AUTHORITY,
        VIBE2_ROBLOX_DOWNLOAD_NONCE: nonce,
        VIBE2_ROBLOX_PLACE_ID: normalizedPlaceId,
        VIBE2_ROBLOX_COPY_PERMISSION: COPY_PERMISSION,
        VIBE2_ROBLOX_PERMISSION_EVIDENCE: clean(permissionEvidence),
        VIBE2_ROBLOX_DOWNLOAD_OUTPUT: placeFile
      }
    });
    if (download.code !== 0) throw new Error(`authorized Roblox download exit ${download.code}: ${download.stderr.slice(-4000)}`);
    const evidence = parseDownloadEvidence(download.stdout);
    if (evidence?.version !== 1) throw new Error('authorized Roblox download version invalid');
    if (clean(evidence?.authority) !== DOWNLOAD_AUTHORITY) throw new Error('authorized Roblox download authority invalid');
    if (clean(evidence?.nonce) !== nonce) throw new Error('authorized Roblox download nonce mismatch');
    if (clean(evidence?.placeId) !== normalizedPlaceId) throw new Error('authorized Roblox download placeId mismatch');
    if (evidence?.copyAllowed !== true || clean(evidence?.permission) !== COPY_PERMISSION) throw new Error('authorized Roblox copy permission not verified');
    if (clean(evidence?.permissionEvidence) !== clean(permissionEvidence)) throw new Error('authorized Roblox permission evidence mismatch');
    if (path.resolve(clean(evidence?.outputPath)) !== path.resolve(placeFile)) throw new Error('authorized Roblox download output path mismatch');
    if (!fs.existsSync(placeFile)) throw new Error('authorized Roblox download file missing');

    distilled = distillPlaceFile(placeFile, root, { placeId: normalizedPlaceId, permissionEvidence: clean(permissionEvidence) });
    const runtime = await runProcess(runtimeCommand, runtimeArgs, {
      cwd,
      timeoutMs,
      env: {
        VIBE2_ROBLOX_AUTHORIZED_PLACE_FILE: placeFile,
        VIBE2_ROBLOX_AUTHORIZED_SOURCE_ROOT: root,
        VIBE2_ROBLOX_AUTHORIZED_PLACE_SHA256: distilled.digest,
        VIBE2_ROBLOX_COPY_PERMISSION: COPY_PERMISSION,
        VIBE2_ROBLOX_PERMISSION_EVIDENCE: clean(permissionEvidence)
      }
    });
    if (runtime.stdout) process.stdout.write(runtime.stdout);
    if (runtime.stderr) process.stderr.write(runtime.stderr);
    if (runtime.code !== 0) throw new Error(`Roblox Studio runtime exit ${runtime.code}`);
    process.stderr.write(`VIBE2_ROBLOX_AUTHORIZED_DOWNLOAD=PASS\n`);
    process.stderr.write(`VIBE2_ROBLOX_AUTHORIZED_PATTERNS=${distilled.generalizedPatterns.length}\n`);
    return Object.freeze({
      version: 1,
      placeId: normalizedPlaceId,
      copyAllowed: true,
      permission: COPY_PERMISSION,
      permissionEvidence: clean(permissionEvidence),
      sourceRoot: root,
      generalizedPatterns: Object.freeze([...distilled.generalizedPatterns]),
      rawSourcePersisted: false,
      rawPlacePersisted: false,
      authorityExpanded: false,
      authority: DOWNLOAD_AUTHORITY
    });
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf();
  await runAuthorizedRobloxDownloadRuntime({
    placeId: clean(args['place-id']) || clean(process.env.VIBE2_ROBLOX_PLACE_ID),
    copyPermission: clean(args['copy-permission']) || clean(process.env.VIBE2_ROBLOX_COPY_PERMISSION),
    permissionEvidence: clean(args['permission-evidence']) || clean(process.env.VIBE2_ROBLOX_PERMISSION_EVIDENCE),
    sourceRoot: clean(args['source-root']) || clean(process.env.VIBE2_ROBLOX_AUTHORIZED_SOURCE_ROOT),
    downloadCommand: clean(args['download-command']) || clean(process.env.VIBE2_ROBLOX_AUTHORIZED_DOWNLOAD_COMMAND),
    downloadArgs: parseArgsJson(clean(args['download-args-json']) || clean(process.env.VIBE2_ROBLOX_AUTHORIZED_DOWNLOAD_ARGS) || '[]'),
    runtimeCommand: clean(args['runtime-command']) || clean(process.env.VIBE2_ROBLOX_STUDIO_RUNTIME_COMMAND),
    runtimeArgs: parseArgsJson(clean(args['runtime-args-json']) || clean(process.env.VIBE2_ROBLOX_STUDIO_RUNTIME_ARGS) || '[]'),
    cwd: clean(args.cwd) || process.cwd(),
    timeoutMs: Number(args.timeout) || 180000
  });
}

export { DOWNLOAD_AUTHORITY, COPY_PERMISSION, DOWNLOAD_MARKER, MAX_PLACE_BYTES };
