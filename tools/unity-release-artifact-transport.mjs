// 파일명: tools/unity-release-artifact-transport.mjs
// 역할: Unity Android 빌드 run이 이미 게시한 정확한 prerelease 자산을 Actions Artifact API 없이 회수한다.
// 원칙: run ID가 포함된 Git tag와 build-info/hash를 함께 검증해 다른 빌드 자산의 혼입을 막는다.

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const clean = (value) => String(value ?? '').trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assertRunId(runId) {
  const value = clean(runId);
  if (!/^[0-9]+$/.test(value)) throw new Error(`invalid upstream run id: ${value || '<empty>'}`);
  return value;
}

function assertRepository(repository) {
  const value = clean(repository);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error(`invalid repository: ${value || '<empty>'}`);
  }
  return value;
}

export function parseReleaseTagCandidates(lsRemoteOutput, upstreamRunId) {
  const runId = assertRunId(upstreamRunId);
  const pattern = new RegExp(`^test-([a-z0-9][a-z0-9-]{1,48})-${runId}-([1-9][0-9]*)$`);
  const candidates = [];

  for (const line of String(lsRemoteOutput || '').split(/\r?\n/)) {
    const [, ref = ''] = line.trim().split(/\s+/, 2);
    if (!ref.startsWith('refs/tags/') || ref.endsWith('^{}')) continue;
    const tag = ref.slice('refs/tags/'.length);
    const match = tag.match(pattern);
    if (!match) continue;
    candidates.push({ tag, gameId: match[1], runAttempt: Number(match[2]) });
  }

  const deduped = [...new Map(candidates.map((item) => [item.tag, item])).values()];
  const gameIds = new Set(deduped.map((item) => item.gameId));
  if (gameIds.size > 1) {
    throw new Error(`multiple games mapped to upstream run ${runId}: ${[...gameIds].sort().join(',')}`);
  }
  deduped.sort((a, b) => b.runAttempt - a.runAttempt);
  return deduped;
}

export function selectExactReleaseTag(lsRemoteOutput, upstreamRunId) {
  const candidates = parseReleaseTagCandidates(lsRemoteOutput, upstreamRunId);
  if (candidates.length === 0) {
    throw new Error(`no Unity Android prerelease tag found for upstream run ${upstreamRunId}`);
  }
  return candidates[0];
}

export function buildReleaseAssetUrls(repository, release) {
  const repo = assertRepository(repository);
  const gameId = clean(release?.gameId);
  const tag = clean(release?.tag);
  if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(gameId)) throw new Error(`invalid game id: ${gameId}`);
  if (!/^test-[a-z0-9-]+-[0-9]+-[1-9][0-9]*$/.test(tag)) throw new Error(`invalid release tag: ${tag}`);
  const base = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}`;
  const apkName = `${gameId}-test.apk`;
  return {
    apkName,
    apk: `${base}/${encodeURIComponent(apkName)}`,
    checksum: `${base}/${encodeURIComponent(apkName)}.sha256`,
    buildInfo: `${base}/build-info.json`
  };
}

export async function resolveReleaseTag({
  upstreamRunId,
  remote = 'origin',
  execGit = async (args) => execFileAsync('git', args, { maxBuffer: 4 * 1024 * 1024 })
}) {
  const runId = assertRunId(upstreamRunId);
  const { stdout = '' } = await execGit([
    'ls-remote',
    '--tags',
    clean(remote) || 'origin',
    `refs/tags/test-*-${runId}-*`
  ]);
  return selectExactReleaseTag(stdout, runId);
}

async function fetchAsset(url, destination, fetchImpl = globalThis.fetch) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'jaewoon-unity-release-artifact-transport' }
      });
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
      }
      await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 2000);
    }
  }
  throw new Error(`release asset download failed: ${url}: ${lastError?.message || lastError}`);
}

async function sha256(file) {
  const hash = createHash('sha256');
  const bytes = await readFile(file);
  hash.update(bytes);
  return hash.digest('hex');
}

export async function verifyReleaseBuild({ directory, upstreamRunId, release }) {
  const runId = assertRunId(upstreamRunId);
  const apkName = `${release.gameId}-test.apk`;
  const apkPath = path.join(directory, apkName);
  const checksumPath = `${apkPath}.sha256`;
  const buildInfoPath = path.join(directory, 'build-info.json');
  const [checksumText, buildInfoText, actualSha] = await Promise.all([
    readFile(checksumPath, 'utf8'),
    readFile(buildInfoPath, 'utf8'),
    sha256(apkPath)
  ]);

  const expectedFromFile = clean(checksumText).split(/\s+/)[0]?.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedFromFile)) throw new Error('release checksum is invalid');
  if (expectedFromFile !== actualSha) throw new Error(`release APK checksum mismatch expected=${expectedFromFile} actual=${actualSha}`);

  const info = JSON.parse(buildInfoText.replace(/^\uFEFF/, ''));
  const metadataSha = clean(info.sha256).toLowerCase();
  if (Number(info.version) < 2) throw new Error('build-info version is unsupported');
  if (clean(info.gameId) !== release.gameId) throw new Error('build-info gameId does not match release tag');
  if (String(info.runId) !== runId) throw new Error('build-info runId does not match requested upstream run');
  if (Number(info.runAttempt) !== Number(release.runAttempt)) throw new Error('build-info runAttempt does not match selected release tag');
  if (clean(info.releaseTag) !== release.tag) throw new Error('build-info releaseTag does not match selected release tag');
  if (clean(info.artifactName) !== apkName) throw new Error('build-info artifactName does not match exact APK name');
  if (metadataSha !== actualSha) throw new Error('build-info sha256 does not match exact APK');
  if (!/^[0-9a-f]{40}$/.test(clean(info.sourceCommit).toLowerCase())) throw new Error('build-info sourceCommit is invalid');

  return {
    gameId: release.gameId,
    runId,
    runAttempt: release.runAttempt,
    releaseTag: release.tag,
    apkPath,
    buildInfoPath,
    sha256: actualSha,
    sourceCommit: clean(info.sourceCommit).toLowerCase(),
    sourceTreeSha: clean(info.sourceTreeSha).toLowerCase() || null
  };
}

export async function downloadExactUnityReleaseBuild({
  upstreamRunId,
  repository,
  destination = 'upstream-artifacts',
  remote = 'origin',
  fetchImpl = globalThis.fetch,
  execGit
}) {
  const runId = assertRunId(upstreamRunId);
  const repo = assertRepository(repository);
  const release = await resolveReleaseTag({ upstreamRunId: runId, remote, ...(execGit ? { execGit } : {}) });
  const urls = buildReleaseAssetUrls(repo, release);
  const out = path.resolve(destination);

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await fetchAsset(urls.apk, path.join(out, urls.apkName), fetchImpl);
  await fetchAsset(urls.checksum, path.join(out, `${urls.apkName}.sha256`), fetchImpl);
  await fetchAsset(urls.buildInfo, path.join(out, 'build-info.json'), fetchImpl);

  const verified = await verifyReleaseBuild({ directory: out, upstreamRunId: runId, release });
  console.log('UNITY_UPSTREAM_ARTIFACT_TRANSPORT=PUBLIC_RELEASE_ASSET');
  console.log(`UNITY_UPSTREAM_RELEASE_TAG=${verified.releaseTag}`);
  console.log(`UNITY_UPSTREAM_GAME_ID=${verified.gameId}`);
  console.log(`UNITY_UPSTREAM_RUN_ATTEMPT=${verified.runAttempt}`);
  console.log(`UNITY_UPSTREAM_APK_SHA256=${verified.sha256}`);
  return verified;
}

function parseCli(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--run-id') args.upstreamRunId = argv[++index];
    else if (token === '--repository') args.repository = argv[++index];
    else if (token === '--out') args.destination = argv[++index];
    else if (token === '--remote') args.remote = argv[++index];
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseCli();
  await downloadExactUnityReleaseBuild({
    upstreamRunId: args.upstreamRunId,
    repository: args.repository || process.env.GITHUB_REPOSITORY,
    destination: args.destination || 'upstream-artifacts',
    remote: args.remote || 'origin'
  });
}
