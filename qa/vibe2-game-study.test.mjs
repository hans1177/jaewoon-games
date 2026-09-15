// 파일명: qa/vibe2-game-study.test.mjs
// 역할: GAME STUDY의 실제 Web 관찰, Roblox 런타임 계약, 서버 소스 정책, 증류, 기존 Experience Memory 승격, 공유 병렬 상한을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAutoPlayerResult } from '../tools/vibe2-auto-player-contract.mjs';
import { findChromeBinary } from '../tools/vibe2-web-auto-player.mjs';
import { runWebGameStudy } from '../tools/vibe2-web-game-study.mjs';
import { runRobloxGameStudy } from '../tools/vibe2-roblox-game-study.mjs';
import { runAuthorizedRobloxDownloadRuntime, COPY_PERMISSION } from '../tools/vibe2-roblox-authorized-download-runner.mjs';
import {
  AUTHORIZED_SOURCE_ACCESS,
  OBSERVATION_ONLY_ACCESS,
  analyzeAuthorizedGameSource,
  createVerifiedGameStudy,
  promoteGameStudyToExperience
} from '../tools/vibe2-game-study.mjs';
import { reserveGameStudyBatch, applyGameStudyFanIn } from '../tools/vibe2-game-study-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webFixture = path.join(here, 'fixtures', 'vibe2-auto-player-web');
const fakeEngine = path.join(here, 'fixtures', 'vibe2-fake-engine-runtime.mjs');
const fakeRobloxDownload = path.join(here, 'fixtures', 'vibe2-fake-roblox-copy-download.mjs');
const authorizedDownloadRunner = path.join(here, '..', 'tools', 'vibe2-roblox-authorized-download-runner.mjs');
function temp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-game-study-test-')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }

function verifiedWebResult() {
  return createAutoPlayerResult({
    engine: 'web',
    runId: 'web-study-1',
    actions: [
      { id: 'move-right', type: 'key', dispatched: true, ok: true },
      { id: 'attack-enemy', type: 'key', dispatched: true, ok: true },
      { id: 'restart', type: 'click', dispatched: true, ok: true }
    ],
    checkpoints: [
      { id: 'reward-gold', name: 'enemy reward gold', required: true, pass: true },
      { id: 'restart-ready', name: 'restart game ready', required: true, pass: true }
    ],
    errors: [],
    metrics: { durationMs: 100 }
  });
}

test('observation-only study distills verified play without scanning source', () => {
  const root = temp();
  fs.writeFileSync(path.join(root, 'game.js'), 'localStorage.setItem("gold", "10");', 'utf8');
  const study = createVerifiedGameStudy({
    gameId: 'reference-web',
    engine: 'web',
    autoPlayerResult: verifiedWebResult(),
    sourceRoot: root,
    sourceAccess: OBSERVATION_ONLY_ACCESS
  });
  assert.equal(study.verified, true);
  assert.equal(study.executionLocation, 'server');
  assert.equal(study.learningState, '.vibe2/experience.json');
  assert.equal(study.policy.serverSideLearning, true);
  assert.equal(study.policy.clientLocalLearning, false);
  assert.equal(study.sourceAnalysis.scanned, false);
  assert.equal(study.sourceAnalysis.fileCount, 0);
  assert.equal(study.policy.rawSourceCopiedIntoMemory, false);
  assert.equal(study.policy.mayAutoCopyGameplayValues, false);
  assert(study.distilledPatterns.some((row) => row.includes('combat')));
  assert(study.distilledPatterns.some((row) => row.includes('economy')));
  assert(study.distilledPatterns.some((row) => row.includes('restart')));
});

test('authorized server workspace Web source scan extracts only generalized code patterns', () => {
  const root = temp();
  fs.writeFileSync(path.join(root, 'game.js'), `
    addEventListener('keydown', () => {});
    localStorage.setItem('save', 'x');
    requestAnimationFrame(() => {});
    fetch('/score');
  `, 'utf8');
  const analysis = analyzeAuthorizedGameSource({ engine: 'web', root, sourceAccess: AUTHORIZED_SOURCE_ACCESS });
  assert.equal(AUTHORIZED_SOURCE_ACCESS, 'owned-or-authorized-server-workspace');
  assert.equal(analysis.authorized, true);
  assert.equal(analysis.scanned, true);
  const names = analysis.patterns.map((row) => row.name);
  assert(names.includes('input-events'));
  assert(names.includes('client-persistence'));
  assert(names.includes('frame-loop'));
  assert(names.includes('network-io'));
  assert.equal(JSON.stringify(analysis).includes("localStorage.setItem('save', 'x')"), false);
});

test('Roblox study requires Studio runtime authority and capabilities', () => {
  const base = verifiedWebResult();
  const invalid = createVerifiedGameStudy({ gameId: 'r', engine: 'roblox', autoPlayerResult: { ...base, engine: 'roblox' } });
  assert.equal(invalid.verified, false);
  assert(invalid.runtimeValidation.issues.includes('roblox-studio-runtime-authority-invalid'));

  const valid = createVerifiedGameStudy({
    gameId: 'r',
    engine: 'roblox',
    autoPlayerResult: {
      ...base,
      engine: 'roblox',
      playLog: { ...base.playLog, engine: 'roblox' },
      telemetry: { ...base.telemetry, engine: 'roblox' },
      designEvidence: { autoPlayer: { ...base.designEvidence.autoPlayer, engine: 'roblox' }, telemetry: { ...base.designEvidence.telemetry, engine: 'roblox' } },
      runtime: { authority: 'vibe2-roblox-studio-runtime', capabilities: { studioTestService: true, virtualInput: true } }
    }
  });
  assert.equal(valid.verified, true);
  assert.equal(valid.executionLocation, 'server');
});

test('authorized Roblox downloader rejects learning without creator-enabled copying permission', async () => {
  const cwd = temp();
  await assert.rejects(() => runAuthorizedRobloxDownloadRuntime({
    placeId: '123456789',
    copyPermission: 'public-play-only',
    permissionEvidence: 'https://example.invalid/permission',
    sourceRoot: path.join(cwd, 'source'),
    downloadCommand: process.execPath,
    downloadArgs: [fakeRobloxDownload],
    runtimeCommand: process.execPath,
    runtimeArgs: [fakeEngine],
    cwd
  }), /creator-enabled place copying permission required/);
});

test('copy-enabled external Roblox place is downloaded temporarily, distilled, and verified through Studio runtime contract', async () => {
  const cwd = temp();
  const scenarioFile = path.join(cwd, 'scenario.json');
  const sourceRoot = path.join(cwd, 'authorized-source');
  const permissionEvidence = 'https://create.roblox.com/docs/projects/configure-games#allow-copying';
  writeJson(scenarioFile, {
    version: 1,
    engine: 'roblox',
    actions: [
      { id: 'move', type: 'key', key: 'W' },
      { id: 'movement', type: 'expect', name: 'movement state', expression: 'true' }
    ]
  });
  const result = await runRobloxGameStudy({
    gameId: 'external-copy-enabled-roblox',
    scenarioFile,
    command: process.execPath,
    commandArgs: [
      authorizedDownloadRunner,
      '--place-id=123456789',
      `--copy-permission=${COPY_PERMISSION}`,
      `--permission-evidence=${permissionEvidence}`,
      `--source-root=${sourceRoot}`,
      `--download-command=${process.execPath}`,
      `--download-args-json=${JSON.stringify([fakeRobloxDownload])}`,
      `--runtime-command=${process.execPath}`,
      `--runtime-args-json=${JSON.stringify([fakeEngine])}`
    ],
    cwd,
    sourceRoot,
    sourceAccess: AUTHORIZED_SOURCE_ACCESS
  });
  assert.equal(result.autoPlayer.verified, true);
  assert.equal(result.study.verified, true);
  assert.equal(result.study.sourceAnalysis.authorized, true);
  assert.equal(result.study.sourceAnalysis.scanned, true);
  const patterns = result.study.sourceAnalysis.patterns.map((row) => row.name);
  assert(patterns.includes('datastore-persistence'));
  assert(patterns.includes('network-remotes'));
  assert(patterns.includes('input-services'));
  assert(patterns.includes('frame-loop'));
  assert(patterns.includes('pathfinding'));
  assert(patterns.includes('monetization-api'));
  assert(patterns.includes('character-humanoid'));
  const sourceFiles = fs.readdirSync(sourceRoot).sort();
  assert.deepEqual(sourceFiles, ['authorized-download-manifest.json', 'authorized-pattern-evidence.luau']);
  const evidence = fs.readFileSync(path.join(sourceRoot, 'authorized-pattern-evidence.luau'), 'utf8');
  assert.equal(evidence.includes('game:GetService'), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'authorized-download-manifest.json'), 'utf8'));
  assert.equal(manifest.copyAllowed, true);
  assert.equal(manifest.permission, COPY_PERMISSION);
  assert.equal(manifest.rawSourcePersisted, false);
  assert.equal(manifest.rawPlacePersisted, false);
  assert.equal(JSON.stringify(result.study).includes('game:GetService'), false);
});

test('verified GAME STUDY promotes into server Experience Memory and can reinforce', () => {
  const study = createVerifiedGameStudy({ gameId: 'reference-web', engine: 'web', autoPlayerResult: verifiedWebResult() });
  const first = promoteGameStudyToExperience({ records: [] }, study);
  assert.equal(first.promoted, true);
  assert.equal(first.memory.records.length, 1);
  assert.equal(first.memory.records[0].taskType, 'game-study');
  assert(first.memory.records[0].qa.includes('server-side-study-verified'));
  assert(first.memory.records[0].reusablePatterns.every((row) => row.startsWith('GAME_STUDY:')));
  const second = promoteGameStudyToExperience(first.memory, study);
  assert.equal(second.promoted, true);
  assert.equal(second.reinforced, true);
  assert.equal(second.memory.records.length, 1);
  assert.equal(second.memory.records[0].confirmations, 2);
});

test('GAME STUDY reservation shares queue capacity and current backpressure cap', () => {
  const targets = {
    version: 1,
    mode: 'server-hourly-24h-parallel-study',
    maxConcurrentTasks: 20,
    targets: Array.from({ length: 12 }, (_, i) => ({
      id: `web-${i}`,
      enabled: true,
      engine: 'web',
      gameId: `g-${i}`,
      url: `https://example.invalid/game-${i}`,
      scenarioFile: `study/scenario-${i}.json`,
      sourceAccess: 'observation-only'
    }))
  };
  const queue = {
    maxConcurrentTasks: 20,
    tasks: Array.from({ length: 3 }, (_, i) => ({ id: `normal-${i}`, gameId: `n-${i}`, target: 'unity', department: 'development', type: 'implementation', goal: 'normal work', status: 'running', sourceRoot: `unity-games/n-${i}` }))
  };
  const reserved = reserveGameStudyBatch(queue, targets, { currentMax: 12 }, { maxConcurrentTasks: 20 });
  assert.equal(reserved.executionLocation, 'server');
  assert(reserved.selectedCount > 0);
  assert(reserved.selectedCount <= 9);
  assert(reserved.requestedMax <= 12);
  assert(reserved.effectiveMax <= 12);
  assert.equal(reserved.queue.tasks.filter((row) => row.status === 'running').length <= 12, true);
  assert(reserved.matrix.every((row) => row.engine === 'web'));
});

test('GAME STUDY fan-in is the only step that updates server memory and settles study task', () => {
  const study = createVerifiedGameStudy({ gameId: 'reference-web', engine: 'web', autoPlayerResult: verifiedWebResult() });
  const queue = {
    maxConcurrentTasks: 20,
    tasks: [{
      id: 'game-study-reference-web', gameId: 'reference-web', target: 'web', department: 'qa', type: 'research', goal: 'study', status: 'running', sourceRoot: 'game-study:reference-web', evidence: ['game-study-target:reference-web']
    }]
  };
  const result = applyGameStudyFanIn({ queueInput: queue, experienceInput: { records: [] }, results: [{ taskId: 'game-study-reference-web', outcome: 'PASS', study, evidence: ['worker:pass'] }] });
  assert.equal(result.memory.records.length, 1);
  assert.equal(result.queue.tasks[0].status, 'done');
  assert.equal(result.applied[0].promoted, true);
  assert.equal(result.executionLocation, 'server');
  assert.equal(result.authorityExpanded, false);
});

test('Web GAME STUDY uses real Chrome AUTO PLAYER on server and distills observed systems', { timeout: 30000 }, async (t) => {
  const chrome = findChromeBinary();
  if (!chrome) { t.skip('Chrome/Chromium unavailable on this machine'); return; }
  const scenario = { version: 1, engine: 'web', page: 'index.html', requirePlayability: true, actions: [
    { id: 'start', type: 'click', selector: '#start' },
    { id: 'started', type: 'expect', expression: 'window.game.started===true' },
    { id: 'move-right', type: 'key', key: 'ArrowRight', holdMs: 60 },
    { id: 'moved', type: 'expect', name: 'movement position changed', expression: 'window.game.x===1' },
    { id: 'attack-enemy-1', type: 'key', key: 'Space', holdMs: 40 },
    { id: 'attack-enemy-2', type: 'key', key: 'Space', holdMs: 40 },
    { id: 'reward-gold', type: 'expect', name: 'combat reward gold', expression: 'window.game.enemyHp===0 && window.game.gold===10' },
    { id: 'restart', type: 'click', selector: '#restart' },
    { id: 'restart-ready', type: 'expect', name: 'restart ready', expression: 'window.game.restarts===1 && window.game.gold===0' }
  ] };
  const result = await runWebGameStudy({ gameId: 'fixture-web', root: webFixture, scenario, sourceAccess: OBSERVATION_ONLY_ACCESS, chromePath: chrome });
  assert.equal(result.autoPlayer.verified, true);
  assert.equal(result.study.verified, true);
  assert.equal(result.study.executionLocation, 'server');
  assert(result.study.distilledPatterns.some((row) => row.includes('movement')));
  assert(result.study.distilledPatterns.some((row) => row.includes('combat')));
  assert(result.study.distilledPatterns.some((row) => row.includes('economy')));
});

test('Roblox GAME STUDY adapter accepts only nonce-bound fake protocol evidence in unit QA', async () => {
  const cwd = temp();
  const scenarioFile = path.join(cwd, 'scenario.json');
  writeJson(scenarioFile, { version: 1, engine: 'roblox', actions: [{ id: 'move', type: 'key', key: 'W' }, { id: 'movement', type: 'expect', name: 'movement state', expression: 'true' }] });
  const result = await runRobloxGameStudy({ gameId: 'fixture-roblox', scenarioFile, command: process.execPath, commandArgs: [fakeEngine], cwd, sourceAccess: OBSERVATION_ONLY_ACCESS });
  assert.equal(result.autoPlayer.verified, true);
  assert.equal(result.study.verified, true);
  assert.equal(result.study.executionLocation, 'server');
  assert.equal(result.study.sourceAnalysis.scanned, false);
  assert.equal(result.autoPlayer.runtime.authority, 'vibe2-roblox-studio-runtime');
});
