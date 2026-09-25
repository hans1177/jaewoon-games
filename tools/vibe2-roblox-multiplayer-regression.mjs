// 파일명: tools/vibe2-roblox-multiplayer-regression.mjs
// 역할: Roblox Studio 공식 StudioTestService 멀티클라이언트 테스트에서 사용자 입력 시뮬레이션 없이 각 클라이언트 로드/동기화 상태를 검증한다.
// 원칙: 테스트 세션 전용이며 게임/세이브/경제 권한을 확장하지 않는다.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findRobloxStudioBinary } from './vibe2-roblox-studio-cli-runner.mjs';

const clean = (value) => String(value ?? '').trim();
const MARKER = 'VIBE2_ROBLOX_MULTIPLAYER_JSON=';
const AUTHORITY = 'vibe2-roblox-studio-multiplayer-runtime';

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

function clampClients(value) {
  const n = Math.floor(Number(value) || 2);
  return Math.max(2, Math.min(8, n));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function longBracket(value) {
  const text = String(value);
  for (let n = 0; n < 12; n += 1) {
    const eq = '='.repeat(n);
    const close = `]${eq}]`;
    if (!text.includes(close)) return `[${eq}[${text}]${eq}]`;
  }
  throw new Error('unable to encode Luau long string safely');
}

function runProcess(command, args, { cwd = process.cwd(), timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: false });
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
      finish(new Error(`Roblox multiplayer regression timeout: ${timeoutMs}ms`));
    }, Math.max(15000, Number(timeoutMs) || 180000));
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { if (stdout.length < 500000) stdout += chunk; });
    child.stderr.on('data', (chunk) => { if (stderr.length < 500000) stderr += chunk; });
    child.on('error', finish);
    child.on('close', (code) => finish(null, code));
  });
}

function parseMarker(text) {
  for (const row of String(text || '').split(/\r?\n/).reverse()) {
    const at = row.indexOf(MARKER);
    if (at < 0) continue;
    const encoded = row.slice(at + MARKER.length).trim().match(/^([A-Za-z0-9+/]{16,}={0,2})(?:\s|$)/)?.[1];
    if (!encoded) continue;
    try {
      const value = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {}
  }
  return null;
}

function bootstrapSource({ clients, nonce }) {
  const remoteName = `__Vibe2Multiplayer_${nonce.slice(0, 12)}`;
  const clientSource = `local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal Players = game:GetService("Players")\nlocal remote = ReplicatedStorage:WaitForChild(${longBracket(remoteName)}, 15)\nif not remote then return end\nif not game:IsLoaded() then game.Loaded:Wait() end\nlocal player = Players.LocalPlayer\nremote:FireServer({ nonce = ${longBracket(nonce)}, authority = ${longBracket(AUTHORITY)}, clientReady = player ~= nil, placeId = tostring(game.PlaceId), placeVersion = tonumber(game.PlaceVersion) })\n`;
  const serverSource = `local StudioTestService = game:GetService("StudioTestService")\nlocal HttpService = game:GetService("HttpService")\nlocal EncodingService = game:GetService("EncodingService")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal remote = ReplicatedStorage:WaitForChild(${longBracket(remoteName)}, 15)\nlocal expectedClients = ${clients}\nlocal expectedNonce = ${longBracket(nonce)}\nlocal seen = {}\nlocal finished = false\nlocal function countSeen()\n    local count = 0\n    for _ in pairs(seen) do count += 1 end\n    return count\nend\nlocal function finish(timeout)\n    if finished then return end\n    finished = true\n    local count = countSeen()\n    local verified = 0\n    local errors = {}\n    for _, row in pairs(seen) do\n        if row.clientReady == true then verified += 1 else table.insert(errors, "client-not-ready") end\n    end\n    if timeout == true then table.insert(errors, "multiplayer-client-timeout") end\n    local result = {\n        version = 1, engine = "roblox", nonce = expectedNonce, authority = ${longBracket(AUTHORITY)},\n        runtimeVerified = count >= expectedClients and verified >= expectedClients and #errors == 0,\n        capabilities = { studioTestService = true, virtualInput = false, multiplayer = true, assertionOnly = true },\n        multiplayer = { expectedClients = expectedClients, resultCount = count, verifiedClients = verified },\n        errors = errors, authorityExpanded = false\n    }\n    local encoded = EncodingService:Base64Encode(buffer.fromstring(HttpService:JSONEncode(result)))\n    StudioTestService:EndTest(${longBracket(MARKER)} .. buffer.tostring(encoded))\nend\nif remote then\n    remote.OnServerEvent:Connect(function(player, row)\n        if type(row) ~= "table" then return end\n        if tostring(row.nonce or "") ~= expectedNonce then return end\n        if tostring(row.authority or "") ~= ${longBracket(AUTHORITY)} then return end\n        seen[tostring(player.UserId)] = row\n        if countSeen() >= expectedClients then finish(false) end\n    end)\nend\ntask.delay(45, function() finish(true) end)\n`;
  return `local StudioTestService = game:GetService("StudioTestService")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ServerScriptService = game:GetService("ServerScriptService")\nlocal StarterPlayer = game:GetService("StarterPlayer")\nlocal remote = Instance.new("RemoteEvent")\nremote.Name = ${longBracket(remoteName)}\nremote.Parent = ReplicatedStorage\nlocal serverRunner = Instance.new("Script")\nserverRunner.Name = "__Vibe2MultiplayerServer"\nserverRunner.Source = ${longBracket(serverSource)}\nserverRunner.Parent = ServerScriptService\nlocal clientRunner = Instance.new("LocalScript")\nclientRunner.Name = "__Vibe2MultiplayerClient"\nclientRunner.Source = ${longBracket(clientSource)}\nclientRunner.Parent = StarterPlayer:WaitForChild("StarterPlayerScripts")\nlocal ok, value = pcall(function() return StudioTestService:ExecuteMultiplayerTestAsync(${clients}, ${longBracket(nonce)}) end)\nclientRunner:Destroy()\nserverRunner:Destroy()\nremote:Destroy()\nif not ok then error("Vibe2 multiplayer Studio test failed: " .. tostring(value)) end\nprint(tostring(value))\n`;
}

export async function runRobloxMultiplayerRegression({
  studioPath = '', clients = 2, outputFile = '', placeFile = '', cwd = process.cwd(), timeoutMs = 180000
} = {}) {
  const expectedClients = clampClients(clients);
  const resolvedStudio = findRobloxStudioBinary({ override: studioPath });
  if (!resolvedStudio) throw new Error('RobloxStudioBeta.exe not found; set VIBE2_ROBLOX_STUDIO_PATH');
  const nonce = crypto.randomBytes(20).toString('hex');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-multiplayer-'));
  const scriptFile = path.join(tempRoot, 'multiplayer-regression.luau');
  const studioOutput = path.join(tempRoot, 'studio-output.log');
  fs.writeFileSync(scriptFile, bootstrapSource({ clients: expectedClients, nonce }), 'utf8');
  try {
    const args = ['--task', 'RunScript'];
    if (clean(placeFile)) args.push('--localPlaceFile', path.resolve(placeFile));
    args.push('--runScriptFile', scriptFile, '--outputFile', studioOutput, '--quitAfterExecution');
    const processResult = await runProcess(resolvedStudio, args, { cwd, timeoutMs });
    const output = `${processResult.stdout}\n${processResult.stderr}\n${fs.existsSync(studioOutput) ? fs.readFileSync(studioOutput, 'utf8') : ''}`;
    if (processResult.code !== 0) throw new Error(`Roblox Studio multiplayer CLI exit ${processResult.code}: ${output.slice(-5000)}`);
    const result = parseMarker(output);
    if (!result) throw new Error(`Roblox multiplayer runtime evidence missing: ${output.slice(-5000)}`);
    if (clean(result.nonce) !== nonce) throw new Error('Roblox multiplayer nonce mismatch');
    if (clean(result.authority) !== AUTHORITY) throw new Error('Roblox multiplayer authority mismatch');
    if (Number(result?.multiplayer?.expectedClients || 0) !== expectedClients) throw new Error('Roblox multiplayer expected client count mismatch');
    if (Number(result?.multiplayer?.verifiedClients || 0) < expectedClients) throw new Error('Roblox multiplayer verified client count too low');
    if (result.runtimeVerified !== true) throw new Error(`Roblox multiplayer runtime not verified: ${JSON.stringify(result.errors || [])}`);
    if (result.authorityExpanded === true) throw new Error('Roblox multiplayer authority expanded');
    if (clean(outputFile)) writeJson(outputFile, result);
    process.stdout.write(`${MARKER}${Buffer.from(JSON.stringify(result)).toString('base64')}\n`);
    process.stderr.write(`VIBE2_ROBLOX_MULTIPLAYER=PASS\nVIBE2_ROBLOX_MULTIPLAYER_CLIENTS=${expectedClients}\n`);
    return Object.freeze({ ...result, studioPath: resolvedStudio });
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf();
  await runRobloxMultiplayerRegression({
    studioPath: clean(args.studio) || clean(process.env.VIBE2_ROBLOX_STUDIO_PATH),
    clients: Number(args.clients) || 2,
    outputFile: clean(args.output),
    placeFile: clean(args['place-file']) || clean(process.env.VIBE2_ROBLOX_TEST_PLACE_FILE),
    cwd: clean(args.cwd) || process.cwd(),
    timeoutMs: Number(args.timeout) || 180000
  });
}

export { AUTHORITY, MARKER, clampClients };
