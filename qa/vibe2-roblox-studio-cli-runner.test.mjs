import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runRobloxStudioCliRuntime, findRobloxStudioBinary } from '../tools/vibe2-roblox-studio-cli-runner.mjs';

function temp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-studio-cli-test-')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }

test('Studio binary override must exist', () => {
  const root = temp();
  assert.throws(() => findRobloxStudioBinary({ override: path.join(root, 'missing.exe') }), /not found/);
});

test('official Studio CLI runner persists nonce-bound runtime and sanitized authorized source evidence', async () => {
  const root = temp();
  const fakeStudio = path.join(root, 'fake-studio');
  const scenarioFile = path.join(root, 'scenario.json');
  const runtimeFile = path.join(root, 'runtime.json');
  const sourceRoot = path.join(root, 'source');
  writeJson(scenarioFile, {
    version: 1,
    engine: 'roblox',
    actions: [
      { id: 'input', type: 'key', key: 'Tab' },
      { id: 'loaded', type: 'expect', expression: 'game-loaded' }
    ]
  });
  fs.writeFileSync(fakeStudio, `#!/usr/bin/env node\nconst fs=require('fs');\nconst args=process.argv.slice(2);\nconst get=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:''};\nconst bootstrap=fs.readFileSync(get('--runScriptFile'),'utf8');\nconst nonce=(bootstrap.match(/\\"nonce\\":\\"([a-f0-9]+)\\"/)||[])[1];\nif(!nonce) throw new Error('nonce missing from generated bootstrap');\nconst placeId=get('--placeId')||'0';\nconst runtime={version:1,engine:'roblox',nonce,authority:'vibe2-roblox-studio-runtime',runtimeVerified:true,capabilities:{studioTestService:true,virtualInput:true},place:'fixture',actions:[{id:'input',type:'key',dispatched:true,ok:true}],checkpoints:[{id:'loaded',name:'loaded',required:true,pass:true,value:true}],errors:[],metrics:{timeToFirstActionMs:1,consoleErrorCount:0}};\nconst source={version:1,placeId,expectedPlaceId:placeId,scriptCount:7,patterns:['datastore-persistence','network-remotes','input-services'],rawSourcePersisted:false,authorityExpanded:false};\nconst enc=x=>Buffer.from(JSON.stringify(x)).toString('base64');\nfs.writeFileSync(get('--outputFile'),'VIBE2_ROBLOX_SOURCE_PATTERNS_JSON='+enc(source)+'\\nVIBE2_AUTO_PLAYER_RUNTIME_JSON='+enc(runtime)+'\\n','utf8');\n`, 'utf8');
  fs.chmodSync(fakeStudio, 0o755);
  const result = await runRobloxStudioCliRuntime({
    studioPath: fakeStudio,
    scenarioFile,
    runtimeResultFile: runtimeFile,
    nonce: 'abcdef123456',
    placeId: '14215142052',
    universeId: '123456',
    copyPermission: 'creator-enabled-place-copying',
    permissionEvidence: 'https://create.roblox.com/docs/cloud/guides/instance#potion-shop-demo',
    sourceRoot,
    cwd: path.resolve('.'),
    timeoutMs: 15000
  });
  assert.equal(result.verifiedRuntime, true);
  const runtime = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
  assert.equal(runtime.nonce, 'abcdef123456');
  assert.equal(runtime.authority, 'vibe2-roblox-studio-runtime');
  const files = fs.readdirSync(sourceRoot).sort();
  assert.deepEqual(files, ['authorized-pattern-evidence.luau', 'authorized-studio-manifest.json']);
  const evidence = fs.readFileSync(path.join(sourceRoot, 'authorized-pattern-evidence.luau'), 'utf8');
  assert.match(evidence, /DataStoreService/);
  assert.match(evidence, /Remote(?:Event|Function)/);
  assert.match(evidence, /(?:UserInputService|ContextActionService)/);
  assert.equal(evidence.includes('game:GetService'), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'authorized-studio-manifest.json'), 'utf8'));
  assert.equal(manifest.copyAllowed, true);
  assert.deepEqual(manifest.generalizedPatterns.sort(), ['datastore-persistence', 'input-services', 'network-remotes']);
  assert.equal(manifest.rawSourcePersisted, false);
  assert.equal(manifest.rawPlacePersisted, false);
  assert.equal(manifest.authorityExpanded, false);
});
