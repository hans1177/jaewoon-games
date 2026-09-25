import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runRobloxStudioCliRuntime, findRobloxStudioBinary } from '../tools/vibe2-roblox-studio-cli-runner.mjs';

const liveSmokeWorkflow = fs.readFileSync('.github/workflows/vibe2-roblox-studio-live-smoke.yml', 'utf8');
const continuousWorkflow = fs.readFileSync('.github/workflows/vibe2-game-study-continuous.yml', 'utf8');
const studioCliSource = fs.readFileSync('tools/vibe2-roblox-studio-cli-runner.mjs', 'utf8');
const engineAutoPlayerSource = fs.readFileSync('tools/vibe2-engine-auto-player.mjs', 'utf8');
const potionScenario = fs.readFileSync('.vibe2/game-study-scenarios/external-roblox-potion-shop-flow-a.json', 'utf8');
const targetConfig = JSON.parse(fs.readFileSync('.vibe2/game-study-targets.json', 'utf8'));

function temp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-studio-cli-test-')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }

test('Studio binary override must exist', () => {
  const root = temp();
  assert.throws(() => findRobloxStudioBinary({ override: path.join(root, 'missing.exe') }), /not found/);
});

test('Vibe2 live smoke uses the dedicated isolated Roblox Studio runner', () => {
  assert.match(liveSmokeWorkflow, /runs-on: \[self-hosted, Windows, vibe2-roblox\]/);
  assert.match(liveSmokeWorkflow, /VIBE2_ROBLOX_STUDY_ISOLATED_SESSION: 'true'/);
  assert.match(liveSmokeWorkflow, /VIBE2_ROBLOX_DEDICATED_RUNNER_IDENTITY=PASS/);
  assert.match(liveSmokeWorkflow, /VIBE2_PRODUCTION_RUNNER_TOUCHED=NO/);
  assert.match(liveSmokeWorkflow, /Production Roblox Studio runner must not execute dedicated GAME STUDY smoke/);
  assert.match(liveSmokeWorkflow, /shell: powershell/);
  assert.doesNotMatch(liveSmokeWorkflow, /runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
});

test('continuous Roblox GAME STUDY uses the dedicated isolated Studio runner', () => {
  assert.match(continuousWorkflow, /runs-on: \[self-hosted, Windows, vibe2-roblox\]/);
  assert.match(continuousWorkflow, /VIBE2_ROBLOX_STUDY_ISOLATED_SESSION: 'true'/);
  assert.doesNotMatch(continuousWorkflow, /runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.doesNotMatch(continuousWorkflow, /Reap stale Vibe2-owned Studio sessions/);
  assert.doesNotMatch(continuousWorkflow, /Stop-Process -Id/);
});

test('Roblox production Studio keeps assertion-only learning isolated and external target disabled', () => {
  assert.match(continuousWorkflow, /Protect active Roblox production Studio session/);
  assert.match(continuousWorkflow, /Get-Process -Name RobloxStudioBeta/);
  assert.match(continuousWorkflow, /VIBE2_ROBLOX_STUDIO_PRODUCTION_BUSY=true/);
  assert.match(continuousWorkflow, /VIBE2_ROBLOX_STUDY_ISOLATED_SESSION/);
  assert.match(continuousWorkflow, /VIBE2_ROBLOX_STUDY_CONCURRENCY=ISOLATED_CONCURRENT/);
  assert.equal(targetConfig.policy.robloxStudioConcurrency.productionPriority, true);
  assert.equal(targetConfig.policy.robloxStudioConcurrency.sameWindowsSessionConcurrent, false);
  assert.equal(targetConfig.policy.robloxStudioConcurrency.isolatedRunnerOrSessionConcurrent, true);
  assert.equal(targetConfig.policy.robloxStudioConcurrency.defaultMultiplayerClients, 2);
  assert.equal(targetConfig.policy.robloxStudioConcurrency.maxStudioTestClients, 8);
  assert.equal(targetConfig.policy.learningInputs.studioRuntime, true);
  assert.equal(targetConfig.policy.learningInputs.ciQaRegressionEvidence, true);
  assert.equal(targetConfig.policy.learningInputs.playTelemetry, true);
  assert.equal(targetConfig.policy.learningInputs.ownerDirectiveFeedback, true);
  const external=targetConfig.targets.find(x=>x.id==='external-roblox-potion-shop-flow-a');
  assert.equal(external?.enabled,false);
  assert.equal(external?.runnerReady,false);
  assert.deepEqual(external?.commandArgs,[]);
  assert.equal(external?.onlinePublishedPlaceStudioAutomationForbidden,true);
  assert.equal(external?.localPlaceFileRequiredForAnyFutureStudioReactivation,true);
  assert.equal(targetConfig.policy.externalCopyEnabledRobloxAutomation,false);
  assert.match(liveSmokeWorkflow,/External Potion Shop Studio automation must remain disabled/);
  assert.doesNotMatch(liveSmokeWorkflow,/--place-id=14215142052/);
});

test('Vibe2 live smoke transports Studio command args through environment on Windows PowerShell', () => {
  const envAssignments = liveSmokeWorkflow.match(/\$env:VIBE2_ROBLOX_AUTO_PLAYER_ARGS = ConvertTo-Json -InputObject @\(/g) || [];
  assert.equal(envAssignments.length, 1);
  assert.doesNotMatch(liveSmokeWorkflow, /--args-json=/);
});

test('Studio play-test completion is server-owned and nonce-bound', () => {
  assert.match(studioCliSource, /resultRemote:FireServer\(result\)/);
  assert.match(studioCliSource, /resultRemote\.OnServerEvent:Connect/);
  assert.match(studioCliSource, /tostring\(result\.nonce or ""\) ~= expectedNonce/);
  assert.match(studioCliSource, /StudioTestService:EndTest\(/);
  assert.doesNotMatch(studioCliSource, /StudioTestService:GetTestArgs\(/);
  assert.doesNotMatch(studioCliSource, /StudioTestService:EndTest\(Vibe2AutoPlayer\.EncodeStdout/);
});

test('engine AUTO PLAYER preserves multiplayer evidence for later GAME STUDY diagnostics', () => {
  assert.match(engineAutoPlayerSource, /expectedClients:Number\(raw\.multiplayer\.expectedClients\|\|0\)/);
  assert.match(engineAutoPlayerSource, /verifiedClients:Number\(raw\.multiplayer\.verifiedClients\|\|0\)/);
  assert.match(engineAutoPlayerSource, /runtime:\{authority:clean\(raw\.authority\),capabilities:raw\.capabilities\|\|\{\},multiplayer/);
});

test('Studio marker parser accepts only decodable JSON evidence', () => {
  assert.match(studioCliSource, /JSON\.parse\(decoded\)/);
  assert.equal(studioCliSource.includes('tail.match(/^([A-Za-z0-9+/]{16,}={0,2})'), true);
});

test('published-place Studio study remains disabled and absent from live workflow', () => {
  assert.match(studioCliSource, /const authorizedCopy =/);
  assert.match(studioCliSource, /const expectedRuntimePlaceId = authorizedCopy \|\| normalizedPlaceFile \? '' : normalizedPlaceId/);
  assert.match(studioCliSource, /observedPlaceId = tostring\(game\.PlaceId\)/);
  assert.doesNotMatch(potionScenario, /"type": "key"|"type": "click"/);
  assert.match(potionScenario, /"expression": "game-loaded"/);
  assert.match(potionScenario, /"expression": "player-present"/);
  assert.match(potionScenario, /"expression": "player-gui-nonempty"/);
  assert.doesNotMatch(potionScenario, /instance-path:/);
  assert.doesNotMatch(liveSmokeWorkflow, /Study official uncopylocked Potion Shop/);
  assert.doesNotMatch(liveSmokeWorkflow, /--place-id=14215142052/);
  assert.doesNotMatch(liveSmokeWorkflow, /VIBE2_ROBLOX_POTION_SHOP_COPY_SESSION_IDENTITY=PASS/);
  assert.match(liveSmokeWorkflow, /VIBE2_ROBLOX_POTION_SHOP_TARGET_ACTIVE=NO/);
});

test('assertion-only Studio mode does not create VirtualInput when scenario has no user actions', () => {
  const runtimeModule = fs.readFileSync('tools/runtime/roblox/Vibe2AutoPlayer.luau', 'utf8');
  assert.match(runtimeModule,/local inputRequired = false/);
  assert.match(runtimeModule,/if kind == "key" or kind == "click" then/);
  assert.match(runtimeModule,/virtualInput = inputRequired/);
  assert.match(liveSmokeWorkflow,/Verify official Studio CLI assertion-only play/);
  assert.match(liveSmokeWorkflow,/multiplayer assertion regression/);
  assert.match(liveSmokeWorkflow,/automated user input must remain disabled/);
});

test('Studio runtime captures console errors and exposes UI checkpoints', () => {
  const runtimeModule = fs.readFileSync('tools/runtime/roblox/Vibe2AutoPlayer.luau', 'utf8');
  assert.match(runtimeModule, /LogService\.MessageOut:Connect/);
  assert.match(runtimeModule, /MessageType\.MessageError/);
  assert.match(runtimeModule, /studio-console-error/);
  assert.match(studioCliSource, /ui-text-fits/);
  assert.match(studioCliSource, /TextFits/);
  assert.match(studioCliSource, /ui-visible-elements/);
});

test('production Studio runtime can bind play evidence to the exact published place version', () => {
  assert.match(studioCliSource, /normalizedPlaceVersion/);
  assert.match(studioCliSource, /game\.PlaceVersion/);
  assert.match(studioCliSource, /loaded unexpected place version/);
  assert.match(studioCliSource, /args\['place-version'\]/);
  assert.match(studioCliSource, /VIBE2_ROBLOX_STUDIO_PLACE_VERSION/);
});

test('production local-only Studio mode rejects online launch arguments', async () => {
  const root=temp();
  const scenarioFile=path.join(root,'scenario.json');
  const runtimeFile=path.join(root,'runtime.json');
  writeJson(scenarioFile,{version:1,engine:'roblox',actions:[]});
  await assert.rejects(
    runRobloxStudioCliRuntime({
      scenarioFile,runtimeResultFile:runtimeFile,nonce:'abcdef123456',
      localOnly:true,placeId:'123',universeId:'456',placeVersion:'7',
      cwd:path.resolve('.')
    }),
    /local-only mode requires --place-file|local-only mode forbids/
  );
  assert.match(studioCliSource,/local-only mode requires --place-file/);
  assert.match(studioCliSource,/local-only mode forbids placeId, universeId and placeVersion launch arguments/);
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
      { id: 'loaded', type: 'expect', expression: 'game-loaded' }
    ]
  });
  fs.writeFileSync(fakeStudio, `#!/usr/bin/env node\nconst fs=require('fs');\nconst args=process.argv.slice(2);\nconst get=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:''};\nconst bootstrap=fs.readFileSync(get('--runScriptFile'),'utf8');\nconst nonce=(bootstrap.match(/\\"nonce\\":\\"([a-f0-9]+)\\"/)||[])[1];\nif(!nonce) throw new Error('nonce missing from generated bootstrap');\nconst sourcePlaceId=(bootstrap.match(/placeId = \\[\\[([0-9]+)\\]\\]/)||[])[1]||get('--placeId')||'0';\nconst runtime={version:1,engine:'roblox',nonce,authority:'vibe2-roblox-studio-runtime',runtimeVerified:true,capabilities:{studioTestService:true,virtualInput:false},place:'fixture-copy',actions:[{id:'loaded',type:'expect',dispatched:false,ok:true}],checkpoints:[{id:'loaded',name:'loaded',required:true,pass:true,value:true}],errors:[],metrics:{timeToFirstActionMs:null,consoleErrorCount:0}};\nconst source={version:1,placeId:sourcePlaceId,observedPlaceId:'0',expectedPlaceId:'',scriptCount:7,patterns:['datastore-persistence','network-remotes','input-services'],rawSourcePersisted:false,authorityExpanded:false};\nconst enc=x=>Buffer.from(JSON.stringify(x)).toString('base64');\nfs.writeFileSync(get('--outputFile'),'VIBE2_ROBLOX_SOURCE_PATTERNS_JSON='+enc(source)+'\\nVIBE2_AUTO_PLAYER_RUNTIME_JSON='+enc(runtime)+'\\nVIBE2_AUTO_PLAYER_RUNTIME_JSON=bm90LWpzb24=\\nprint(\\"VIBE2_AUTO_PLAYER_RUNTIME_JSON=\\" .. encoded)\\n','utf8');\n`, 'utf8');
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
  assert.equal(result.authorizedCopy, true);
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
  assert.equal(manifest.placeId, '14215142052');
  assert.equal(manifest.observedPlaceId, '0');
  assert.equal(manifest.copyAllowed, true);
  assert.deepEqual(manifest.generalizedPatterns.sort(), ['datastore-persistence', 'input-services', 'network-remotes']);
  assert.equal(manifest.rawSourcePersisted, false);
  assert.equal(manifest.rawPlacePersisted, false);
  assert.equal(manifest.authorityExpanded, false);
});
