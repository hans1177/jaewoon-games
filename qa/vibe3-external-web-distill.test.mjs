// 파일명: qa/vibe3-external-web-distill.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { licenseTextMatches, isCodePath } from '../tools/vibe3-external-web-distill.mjs';

const manifest = JSON.parse(fs.readFileSync('company-learning/external-web-sources.json', 'utf8'));
assert.equal(manifest.version, 1);
assert.equal(manifest.policy.mode, 'ALLOWLISTED_PERMISSIVE_OPEN_SOURCE_ONLY');
assert.equal(manifest.policy.requireLicenseFileMatch, true);
assert.equal(manifest.policy.requireBrowserRuntimePass, true);
assert.equal(manifest.policy.requireInteractionProbe, true);
assert.equal(manifest.policy.upstreamNodeOrShellExecutionForbidden, true);
assert.equal(manifest.policy.externalNetworkFromBrowserBlocked, true);
assert.equal(manifest.policy.rawBinaryOrAssetTrainingForbidden, true);
assert.ok(Number(manifest.policy.maxNewSamplesPerSourcePerRun) > 0);
assert.ok(Number(manifest.policy.historyDepth) >= Number(manifest.policy.maxNewSamplesPerSourcePerRun));

const ids = new Set();
for (const source of manifest.sources) {
  assert.match(source.id, /^[A-Za-z0-9._-]+$/);
  assert.equal(ids.has(source.id), false, `duplicate source id: ${source.id}`);
  ids.add(source.id);
  assert.match(source.repository, /^https:\/\/github\.com\/.+\.git$/);
  assert.ok(manifest.policy.allowedLicenses.includes(source.license));
  assert.ok(source.licenseFile);
  assert.ok(source.entry.endsWith('.html'));
  assert.ok(Array.isArray(source.codePaths) && source.codePaths.length > 0);
  assert.ok(source.probe?.readySelector);
  assert.ok(source.probe?.interaction);
}

assert.equal(licenseTextMatches('MIT', 'MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy'), true);
assert.equal(licenseTextMatches('MIT', 'GNU GENERAL PUBLIC LICENSE'), false);
assert.equal(isCodePath('js/game.js'), true);
assert.equal(isCodePath('index.html'), true);
assert.equal(isCodePath('assets/sprite.png'), false);

console.log(JSON.stringify({ pass: true, sources: manifest.sources.length, mode: manifest.policy.mode }));
