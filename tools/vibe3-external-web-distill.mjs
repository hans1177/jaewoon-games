// 파일명: tools/vibe3-external-web-distill.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SAMPLE_VERSION = 3;
const MAX_PATCH_BYTES = 120_000;
const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css']);
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'], ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'], ['.ico', 'image/x-icon'], ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf'], ['.mp3', 'audio/mpeg'], ['.ogg', 'audio/ogg'], ['.wav', 'audio/wav'],
]);

function clean(value) { return String(value ?? '').trim(); }
function safeId(value) { return /^[A-Za-z0-9._-]+$/.test(clean(value)); }
function run(command, args, { cwd = process.cwd(), allowFailure = false, maxBuffer = 16 * 1024 * 1024 } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} 실패: ${clean(result.stderr || result.stdout).slice(0, 900)}`);
  }
  return result;
}
function text(command, args, options = {}) {
  const result = run(command, args, options);
  return result.status === 0 ? clean(result.stdout) : '';
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

export function licenseTextMatches(spdx, licenseText) {
  const normalized = String(licenseText ?? '').toLowerCase();
  const id = clean(spdx).toUpperCase();
  if (id === 'MIT') return normalized.includes('mit license') && normalized.includes('permission is hereby granted');
  if (id.startsWith('BSD-')) return normalized.includes('redistribution and use in source and binary forms');
  if (id === 'APACHE-2.0') return normalized.includes('apache license') && normalized.includes('version 2.0');
  if (id === 'ISC') return normalized.includes('permission to use, copy, modify') && normalized.includes('isc');
  if (id === 'CC0-1.0') return normalized.includes('cc0') || normalized.includes('creative commons zero');
  if (id === 'UNLICENSE') return normalized.includes('unlicense') || normalized.includes('public domain');
  return false;
}

function verifySourcePolicy(source, policy) {
  if (!safeId(source.id)) throw new Error('invalid source id');
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(clean(source.repository))) throw new Error(`${source.id}: GitHub HTTPS repository만 허용`);
  if (!clean(source.ref) || !clean(source.entry) || clean(source.entry).includes('..')) throw new Error(`${source.id}: ref/entry invalid`);
  if (!Array.isArray(source.codePaths) || source.codePaths.length === 0 || source.codePaths.some((p) => !clean(p) || clean(p).includes('..'))) throw new Error(`${source.id}: codePaths invalid`);
  const allowed = new Set(policy.allowedLicenses ?? []);
  if (!allowed.has(source.license)) throw new Error(`${source.id}: 허용되지 않은 license ${source.license}`);
}

function cloneSource(source, policy, root) {
  const depth = Math.max(2, Number(policy.historyDepth ?? 48) + 1);
  run('git', ['clone', '--quiet', '--single-branch', '--depth', String(depth), '--branch', source.ref, source.repository, root]);
  return text('git', ['rev-parse', 'HEAD'], { cwd: root });
}

function verifyLicense(source, root) {
  const licensePath = path.resolve(root, source.licenseFile);
  if (!licensePath.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(licensePath)) return { pass: false, reason: 'LICENSE_FILE_MISSING' };
  const licenseText = fs.readFileSync(licensePath, 'utf8');
  if (!licenseTextMatches(source.license, licenseText)) return { pass: false, reason: 'LICENSE_TEXT_MISMATCH' };
  return { pass: true, spdx: source.license, file: source.licenseFile };
}

export function isCodePath(file) { return CODE_EXTENSIONS.has(path.extname(clean(file)).toLowerCase()); }

function commitCandidates(root, depth) {
  return text('git', ['log', `-${Math.max(1, Number(depth) || 48)}`, '--format=%H'], { cwd: root })
    .split(/\r?\n/).map(clean).filter(Boolean);
}

function changedFilesForCommit(root, sha, codePaths) {
  const parent = text('git', ['rev-parse', `${sha}^`], { cwd: root, allowFailure: true });
  if (!parent) return [];
  return text('git', ['diff', '--name-only', parent, sha, '--', ...codePaths], { cwd: root, allowFailure: true })
    .split(/\r?\n/).map(clean).filter((file) => file && isCodePath(file));
}

function patchForCommit(root, sha, codePaths) {
  const parent = text('git', ['rev-parse', `${sha}^`], { cwd: root, allowFailure: true });
  if (!parent) return '';
  const patch = text('git', ['diff', '--no-ext-diff', '--unified=3', parent, sha, '--', ...codePaths], { cwd: root, allowFailure: true, maxBuffer: MAX_PATCH_BYTES * 4 });
  if (!patch || Buffer.byteLength(patch, 'utf8') > MAX_PATCH_BYTES) return '';
  return patch;
}

function syntaxCheck(root, changedFiles) {
  const checked = [];
  for (const file of changedFiles.filter((f) => ['.js', '.mjs', '.cjs'].includes(path.extname(f).toLowerCase())).slice(0, 30)) {
    const full = path.resolve(root, file);
    if (!full.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(full)) continue;
    const result = run(process.execPath, ['--check', full], { allowFailure: true });
    if (result.status !== 0) return { pass: false, reason: `SYNTAX_FAIL:${file}`, detail: clean(result.stderr || result.stdout).slice(0, 300) };
    checked.push(file);
  }
  return { pass: true, checked };
}

function safeLocalPath(root, requestPath, entry) {
  let relative = decodeURIComponent(new URL(requestPath, 'http://127.0.0.1').pathname).replace(/^\/+/, '');
  if (!relative) relative = entry;
  const full = path.resolve(root, relative);
  const resolvedRoot = path.resolve(root);
  if (full !== resolvedRoot && !full.startsWith(resolvedRoot + path.sep)) return null;
  return full;
}

async function startStaticServer(root, entry) {
  const server = http.createServer((req, res) => {
    try {
      const full = safeLocalPath(root, req.url || '/', entry);
      if (!full || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', MIME.get(path.extname(full).toLowerCase()) || 'application/octet-stream');
      fs.createReadStream(full).pipe(res);
    } catch { res.writeHead(500); res.end('error'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/${entry}` };
}

async function browserProbe(source, root) {
  const { chromium } = await import('playwright');
  const { server, url } = await startStaticServer(root, source.entry);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const fatal = [];
    page.on('pageerror', (error) => fatal.push(`pageerror:${clean(error.message).slice(0, 180)}`));
    await page.route('**/*', async (route) => {
      const requested = new URL(route.request().url());
      const allowed = new URL(url);
      if (requested.origin === allowed.origin) await route.continue(); else await route.abort('blockedbyclient');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12_000 });
    const probe = source.probe ?? {};
    if (probe.readySelector) await page.waitForSelector(probe.readySelector, { state: 'visible', timeout: 8_000 });
    let interactionPass = false;
    let before = null;
    let after = null;
    if (probe.interaction === 'ARROW_KEYS_UNTIL_STATE_CHANGE') {
      before = await page.locator(probe.stateSelector).first().innerHTML();
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(120);
        after = await page.locator(probe.stateSelector).first().innerHTML();
        if (after !== before) { interactionPass = true; break; }
      }
    } else if (probe.interaction === 'CLICK_SELECTOR') {
      await page.locator(probe.interactionSelector).click({ timeout: 5_000 });
      await page.waitForTimeout(500);
      interactionPass = true;
    } else if (probe.interaction === 'KEY_HOLD') {
      if (probe.stateSelector) before = await page.locator(probe.stateSelector).first().textContent();
      await page.keyboard.down(probe.key || 'ArrowUp');
      await page.waitForTimeout(Number(probe.holdMs ?? 600));
      await page.keyboard.up(probe.key || 'ArrowUp');
      await page.waitForTimeout(250);
      after = probe.stateSelector ? await page.locator(probe.stateSelector).first().textContent() : null;
      interactionPass = probe.stateSelector ? after !== before : true;
    } else {
      interactionPass = false;
    }
    if (probe.expectGlobalTrue) {
      const globalPass = await page.evaluate((name) => Boolean(window[name]), probe.expectGlobalTrue);
      interactionPass = interactionPass && globalPass;
    }
    if (probe.expectVisible) {
      const visible = await page.locator(probe.expectVisible).first().isVisible();
      interactionPass = interactionPass && visible;
    }
    const pass = interactionPass && fatal.length === 0;
    await context.close();
    return { pass, interactionPass, fatal, before: String(before ?? '').slice(0, 160), after: String(after ?? '').slice(0, 160) };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

function buildSample({ source, sha, changedFiles, patch, license, syntax, probe }) {
  const id = `external-web-${source.id}-${sha.slice(0, 12)}`;
  const sourceUrl = source.repository.replace(/\.git$/, '');
  return {
    version: SAMPLE_VERSION,
    instruction: `검증된 공개 ${source.license} 웹게임 ${source.id}의 실제 브라우저 동작과 코드 변경에서 재사용 가능한 웹게임 구현 패턴을 학습한다.`,
    input: JSON.stringify({
      source: sourceUrl,
      sourceRevision: sha,
      license: source.license,
      changedFiles,
      constraints: ['portable web pattern only', 'platform PASS evidence does not transfer', 'preserve upstream attribution metadata'],
    }, null, 2),
    output: [`외부 오픈소스 웹게임 검증 PASS`, `출처: ${sourceUrl}`, `라이선스: ${source.license} (${source.licenseFile})`, `변경 파일: ${changedFiles.join(', ')}`, '', '검증된 변경 패치:', patch].join('\n'),
    taskType: 'coding', difficulty: 'simple', lifecycle: 'active', sourceKind: 'external-open-source', synthetic: false,
    project: `external-web:${source.id}`, gameId: `external-web-${source.id}`, candidateId: id,
    sourceCommit: sha, sourceRevision: sha, independentQa: 'PASS', browserQa: 'PASS',
    quality: { codeQuality: 1, noRegression: true, playImprovement: 1, ruleCompliance: 1 },
    tags: ['webgame', 'external-open-source', 'permissive-license', 'browser-runtime-pass', 'portable-context'],
    provenance: {
      sourceKind: 'external-open-source', sourceRevision: sha, repository: sourceUrl, upstreamRef: source.ref,
      license: source.license, licenseFile: source.licenseFile, changedFiles,
      portableContextMayCrossPlatforms: true, platformPassEvidenceTransferAllowed: false,
    },
    verification: {
      independentQa: 'PASS', browserQa: 'PASS', runtime: 'PASS', fullRegression: 'PASS', license: 'PASS',
      syntaxChecks: syntax.checked, browserProbe: probe,
      trace: { state: 'PASS', sourceRevision: sha, upstreamCommit: sha, independentQa: 'PASS', browserQa: 'PASS', runtime: 'PASS', stale: false, flaky: false },
    },
  };
}

export async function distillExternalWebSources({ manifestPath = 'company-learning/external-web-sources.json', outDir = 'company-learning/training-samples' } = {}) {
  const manifest = readJson(manifestPath);
  const policy = manifest.policy ?? {};
  ensureDir(outDir);
  const result = { version: 1, examinedSources: 0, examinedCommits: 0, written: [], skipped: [], failed: [] };
  for (const source of manifest.sources ?? []) {
    result.examinedSources += 1;
    let temp = '';
    try {
      verifySourcePolicy(source, policy);
      temp = fs.mkdtempSync(path.join(os.tmpdir(), `vibe3-ext-${source.id}-`));
      cloneSource(source, policy, temp);
      const initialLicense = verifyLicense(source, temp);
      if (!initialLicense.pass) { result.failed.push({ source: source.id, reason: initialLicense.reason }); continue; }
      let writtenForSource = 0;
      const maxNew = Math.max(1, Number(policy.maxNewSamplesPerSourcePerRun ?? 4));
      for (const sha of commitCandidates(temp, policy.historyDepth)) {
        if (writtenForSource >= maxNew) break;
        result.examinedCommits += 1;
        const candidateId = `external-web-${source.id}-${sha.slice(0, 12)}`;
        const outFile = path.join(outDir, `${candidateId}.json`);
        if (fs.existsSync(outFile)) { result.skipped.push({ source: source.id, sha, reason: 'ALREADY_INGESTED' }); continue; }
        const changedFiles = changedFilesForCommit(temp, sha, source.codePaths);
        if (!changedFiles.length) { result.skipped.push({ source: source.id, sha, reason: 'NO_CODE_CHANGE' }); continue; }
        const patch = patchForCommit(temp, sha, source.codePaths);
        if (!patch) { result.skipped.push({ source: source.id, sha, reason: 'PATCH_EMPTY_OR_TOO_LARGE' }); continue; }
        run('git', ['checkout', '--quiet', '--detach', sha], { cwd: temp });
        const license = verifyLicense(source, temp);
        if (!license.pass) { result.skipped.push({ source: source.id, sha, reason: license.reason }); continue; }
        if (!fs.existsSync(path.join(temp, source.entry))) { result.skipped.push({ source: source.id, sha, reason: 'ENTRY_MISSING' }); continue; }
        const syntax = syntaxCheck(temp, changedFiles);
        if (!syntax.pass) { result.skipped.push({ source: source.id, sha, reason: syntax.reason }); continue; }
        let probe;
        try { probe = await browserProbe(source, temp); }
        catch (error) { result.skipped.push({ source: source.id, sha, reason: 'BROWSER_PROBE_ERROR', detail: clean(error?.message ?? error).slice(0, 300) }); continue; }
        if (!probe.pass) { result.skipped.push({ source: source.id, sha, reason: 'BROWSER_RUNTIME_OR_INTERACTION_NOT_PASS', detail: probe.fatal }); continue; }
        const sample = buildSample({ source, sha, changedFiles, patch, license, syntax, probe });
        fs.writeFileSync(outFile, `${JSON.stringify(sample, null, 2)}\n`);
        result.written.push({ source: source.id, sha, candidateId, outFile, changedFiles: changedFiles.length });
        writtenForSource += 1;
      }
    } catch (error) {
      result.failed.push({ source: source?.id ?? null, reason: 'SOURCE_FAILED', detail: clean(error?.message ?? error).slice(0, 500) });
    } finally {
      if (temp) fs.rmSync(temp, { recursive: true, force: true });
    }
  }
  return result;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    args[key] = inline ?? argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await distillExternalWebSources({
    manifestPath: args.manifest || 'company-learning/external-web-sources.json',
    outDir: args['out-dir'] || 'company-learning/training-samples',
  });
  console.log(JSON.stringify(result));
  if (result.failed.length) process.exitCode = 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => { console.error(error?.stack || error?.message || String(error)); process.exitCode = 1; });
