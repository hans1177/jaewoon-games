// 파일명: qa/unity-release-artifact-transport.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildReleaseAssetUrls,
  parseReleaseTagCandidates,
  selectExactReleaseTag,
  verifyReleaseBuild
} from '../tools/unity-release-artifact-transport.mjs';

test('release tag resolver selects the latest exact attempt for one upstream run', () => {
  const raw = [
    '1111111111111111111111111111111111111111\trefs/tags/test-line-defense-36777792645-1',
    '2222222222222222222222222222222222222222\trefs/tags/test-line-defense-36777792645-2',
    '3333333333333333333333333333333333333333\trefs/tags/test-other-game-99999999999-1'
  ].join('\n');
  assert.deepEqual(parseReleaseTagCandidates(raw, '36777792645'), [
    { tag: 'test-line-defense-36777792645-2', gameId: 'line-defense', runAttempt: 2 },
    { tag: 'test-line-defense-36777792645-1', gameId: 'line-defense', runAttempt: 1 }
  ]);
  assert.deepEqual(selectExactReleaseTag(raw, '36777792645'), {
    tag: 'test-line-defense-36777792645-2',
    gameId: 'line-defense',
    runAttempt: 2
  });
});

test('release tag resolver rejects ambiguous games for the same run id', () => {
  const raw = [
    '1111111111111111111111111111111111111111\trefs/tags/test-line-defense-36777792645-1',
    '2222222222222222222222222222222222222222\trefs/tags/test-bug-defense-36777792645-1'
  ].join('\n');
  assert.throws(() => selectExactReleaseTag(raw, '36777792645'), /multiple games mapped/);
});

test('release asset urls point at public release CDN paths instead of Actions API', () => {
  const urls = buildReleaseAssetUrls('hans1177/jaewoon-games', {
    tag: 'test-line-defense-36777792645-2',
    gameId: 'line-defense',
    runAttempt: 2
  });
  assert.equal(urls.apk, 'https://github.com/hans1177/jaewoon-games/releases/download/test-line-defense-36777792645-2/line-defense-test.apk');
  assert.equal(urls.checksum, 'https://github.com/hans1177/jaewoon-games/releases/download/test-line-defense-36777792645-2/line-defense-test.apk.sha256');
  assert.equal(urls.buildInfo, 'https://github.com/hans1177/jaewoon-games/releases/download/test-line-defense-36777792645-2/build-info.json');
  assert.doesNotMatch(JSON.stringify(urls), /api\.github\.com|actions\/artifacts/);
});

test('release build verification binds run, attempt, game, source and APK hash', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unity-release-artifact-'));
  try {
    const apkName = 'line-defense-test.apk';
    const apk = Buffer.from('exact-apk-fixture');
    const sha = createHash('sha256').update(apk).digest('hex');
    fs.writeFileSync(path.join(root, apkName), apk);
    fs.writeFileSync(path.join(root, `${apkName}.sha256`), `${sha}  ${apkName}\n`);
    fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify({
      version: 2,
      gameId: 'line-defense',
      runId: 36777792645,
      runAttempt: 2,
      releaseTag: 'test-line-defense-36777792645-2',
      artifactName: apkName,
      sha256: sha,
      sourceCommit: 'a'.repeat(40),
      sourceTreeSha: 'b'.repeat(40)
    }));

    const verified = await verifyReleaseBuild({
      directory: root,
      upstreamRunId: '36777792645',
      release: {
        tag: 'test-line-defense-36777792645-2',
        gameId: 'line-defense',
        runAttempt: 2
      }
    });
    assert.equal(verified.sha256, sha);
    assert.equal(verified.sourceCommit, 'a'.repeat(40));
    assert.equal(verified.sourceTreeSha, 'b'.repeat(40));

    const bad = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
    bad.runId = 1;
    fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify(bad));
    await assert.rejects(
      verifyReleaseBuild({
        directory: root,
        upstreamRunId: '36777792645',
        release: {
          tag: 'test-line-defense-36777792645-2',
          gameId: 'line-defense',
          runAttempt: 2
        }
      }),
      /runId does not match/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('all cross-run Unity Android QA workflows use the release transport', () => {
  const workflows = [
    '.github/workflows/unity-android-runtime-smoke.yml',
    '.github/workflows/unity-android-independent-qa.yml',
    '.github/workflows/unity-android-regression.yml'
  ];
  for (const file of workflows) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /node tools\/unity-release-artifact-transport\.mjs/);
    assert.doesNotMatch(source, /run-id:\s*\$\{\{\s*steps\.upstream\.outputs\.run_id\s*\}\}/);
  }
});
