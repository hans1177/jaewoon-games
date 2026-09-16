import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runRobloxProjectRuntimeSmoke } from '../tools/vibe2-roblox-project-runtime-smoke.mjs';

const helperSource = fs.readFileSync('tools/vibe2-roblox-project-runtime-smoke.mjs', 'utf8');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-project-runtime-test-'));

function writeProject(root) {
  fs.mkdirSync(path.join(root, 'shared'), { recursive: true });
  fs.mkdirSync(path.join(root, 'server'), { recursive: true });
  fs.mkdirSync(path.join(root, 'client'), { recursive: true });
  fs.writeFileSync(path.join(root, 'shared', 'GameConfig.luau'), 'return { RemoteName = "GameAction", InitialState = { Position = 0, Progress = 0, Score = 0 } }\n');
  fs.writeFileSync(path.join(root, 'server', 'Game.server.luau'), 'local STAGE_COUNT = 12\n-- deterministic fixture\n');
  fs.writeFileSync(path.join(root, 'client', 'Game.client.luau'), '-- client fixture\n');
  fs.writeFileSync(path.join(root, 'default.project.json'), JSON.stringify({
    name: 'fixture',
    tree: {
      $className: 'DataModel',
      ReplicatedStorage: { Shared: { $path: 'shared' } },
      ServerScriptService: { GameServer: { $path: 'server' } },
      StarterPlayer: { StarterPlayerScripts: { GameClient: { $path: 'client' } } },
    },
  }, null, 2));
}

test('project runtime helper keeps required physical obby checks', () => {
  for (const token of [
    'CreateVirtualInput', 'skip-rejected', 'hazard-death-respawn', 'remote-cannot-progress',
    'physical-movement', 'jump-input', 'Checkpoint%02d', 'Step%02dA', 'Step%02dB',
    'moveToWaypoint', 'waypoints', 'VIBE2_ROBLOX_PROJECT_RUNTIME=PASS', 'child ~= Workspace.Terrain'
  ]) assert.equal(helperSource.includes(token), true, `missing ${token}`);
});

test('project runtime helper injects the Rojo source tree and accepts nonce-bound Studio evidence', async () => {
  const root = temp();
  const projectRoot = path.join(root, 'project');
  const outputFile = path.join(root, 'runtime.json');
  const fakeStudio = path.join(root, 'fake-studio');
  writeProject(projectRoot);
  const marker = 'VIBE2_ROBLOX_PROJECT_RUNTIME_JSON=';
  const runtime = {
    version: 1,
    authority: 'vibe2-roblox-project-runtime',
    nonce: 'abcdef123456',
    runtimeVerified: true,
    virtualInput: true,
    checkpoints: [
      { name: 'course-present', pass: true }, { name: 'skip-rejected', pass: true },
      { name: 'hazard-death-respawn', pass: true }, { name: 'remote-cannot-progress', pass: true },
      { name: 'physical-movement', pass: true }, { name: 'jump-input', pass: true }, { name: 'finish', pass: true },
    ],
    errors: [],
    final: { position: 12, progress: 100, score: 1200, roundTime: 8.4, finished: true },
  };
  fs.writeFileSync(fakeStudio, `#!/usr/bin/env node\nconst fs=require('fs');const args=process.argv.slice(2);const get=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:''};const bootstrap=fs.readFileSync(get('--runScriptFile'),'utf8');if(!bootstrap.includes('local STAGE_COUNT = 12'))throw new Error('server source missing');if(!bootstrap.includes('GameConfig'))throw new Error('config source missing');if(!bootstrap.includes('Step%02dA')||!bootstrap.includes('Step%02dB'))throw new Error('waypoint traversal missing');if(!bootstrap.includes('child ~= Workspace.Terrain'))throw new Error('Terrain preservation missing');const payload=${JSON.stringify(JSON.stringify(runtime))};fs.writeFileSync(get('--outputFile'),'${marker}'+Buffer.from(payload).toString('base64')+'\\n');\n`);
  fs.chmodSync(fakeStudio, 0o755);
  const result = await runRobloxProjectRuntimeSmoke({ projectRoot, studioPath: fakeStudio, outputFile, nonce: 'abcdef123456', timeoutMs: 15000 });
  assert.equal(result.runtimeVerified, true);
  assert.equal(result.final.position, 12);
  assert.equal(JSON.parse(fs.readFileSync(outputFile, 'utf8')).final.finished, true);
});
