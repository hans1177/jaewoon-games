// 파일명: tools/vibe2-roblox-studio-cli-runner.mjs
// 역할: Windows self-hosted runner에서 Roblox Studio 공식 CLI(RunScript)를 사용해
//       StudioTestService + VirtualInput 기반 실제 AUTO PLAYER를 실행한다.
// 정책: copy-enabled 외부 place의 소스는 raw로 저장하지 않고 일반화 토큰만 임시 sourceRoot에 남긴다.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const RUNTIME_MARKER = 'VIBE2_AUTO_PLAYER_RUNTIME_JSON=';
const SOURCE_MARKER = 'VIBE2_ROBLOX_SOURCE_PATTERNS_JSON=';
const COPY_PERMISSION = 'creator-enabled-place-copying';
const AUTHORITY = 'vibe2-roblox-studio-runtime';

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
      finish(new Error(`Roblox Studio CLI timeout: ${timeoutMs}ms`));
    }, Math.max(15000, Number(timeoutMs) || 180000));
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { if (stdout.length < 800000) stdout += chunk; });
    child.stderr.on('data', (chunk) => { if (stderr.length < 800000) stderr += chunk; });
    child.on('error', finish);
    child.on('close', (code) => finish(null, code));
  });
}

function newestFile(files = []) {
  return files
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.file || '';
}

export function findRobloxStudioBinary({ override = '', localAppData = process.env.LOCALAPPDATA || '' } = {}) {
  if (clean(override)) {
    const file = path.resolve(clean(override));
    if (!fs.existsSync(file)) throw new Error(`Roblox Studio executable not found: ${file}`);
    return file;
  }
  if (!clean(localAppData)) return '';
  const versions = path.join(localAppData, 'Roblox', 'Versions');
  if (!fs.existsSync(versions)) return '';
  const candidates = [];
  for (const name of fs.readdirSync(versions)) {
    const file = path.join(versions, name, 'RobloxStudioBeta.exe');
    if (fs.existsSync(file)) candidates.push(file);
  }
  return newestFile(candidates);
}

async function resolveUniverseId(placeId, fetchImpl = globalThis.fetch) {
  if (!placeId) return '';
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable for Roblox universe lookup');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(`https://apis.roblox.com/universes/v1/places/${encodeURIComponent(placeId)}/universe`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Roblox universe lookup HTTP ${response.status}`);
    const body = await response.json();
    const universeId = clean(body?.universeId);
    if (!/^\d+$/.test(universeId)) throw new Error('Roblox universe lookup returned invalid universeId');
    return universeId;
  } finally {
    clearTimeout(timer);
  }
}

function parseMarker(text, marker) {
  const rows = String(text || '').split(/\r?\n/).reverse();
  for (const row of rows) {
    let offset = 0;
    while (offset < row.length) {
      const at = row.indexOf(marker, offset);
      if (at < 0) break;
      const tail = row.slice(at + marker.length).trim();
      const candidate = tail.match(/^([A-Za-z0-9+/]{16,}={0,2})(?:\s|$)/)?.[1] || '';
      if (candidate) {
        try {
          const decoded = Buffer.from(candidate, 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return candidate;
        } catch {}
      }
      offset = at + marker.length;
    }
  }
  return null;
}

function decodeBase64Json(encoded, label) {
  try { return JSON.parse(Buffer.from(clean(encoded), 'base64').toString('utf8')); }
  catch (error) { throw new Error(`${label} parse failed: ${error.message}`); }
}

const GENERALIZED_PATTERNS = Object.freeze([
  ['datastore-persistence', 'DataStoreService'],
  ['network-remotes', 'RemoteEvent'],
  ['network-remotes', 'RemoteFunction'],
  ['input-services', 'UserInputService'],
  ['input-services', 'ContextActionService'],
  ['frame-loop', 'RunService'],
  ['tagged-entities', 'CollectionService'],
  ['pathfinding', 'PathfindingService'],
  ['monetization-api', 'MarketplaceService'],
  ['character-humanoid', 'Humanoid']
]);

function clientSource(moduleSource, payloadJson, resultRemoteName) {
  return `local HttpService = game:GetService("HttpService")\nlocal Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal Vibe2AutoPlayer = (function()\n${moduleSource}\nend)()\n\nlocal payload = HttpService:JSONDecode(${longBracket(payloadJson)})\nlocal resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)\nif not resultRemote then return end\n\nlocal function verify(action)\n    local expression = string.lower(tostring(action.expression or ""))\n    if expression == "true" or expression == "studio-runtime-ready" then\n        return true, expression\n    elseif expression == "game-loaded" then\n        return game:IsLoaded(), game.Name\n    elseif expression == "workspace-nonempty" then\n        local count = #workspace:GetChildren()\n        return count > 0, count\n    elseif expression == "player-present" then\n        return Players.LocalPlayer ~= nil, Players.LocalPlayer and Players.LocalPlayer.Name or nil\n    elseif expression == "player-gui-nonempty" then\n        local player = Players.LocalPlayer\n        local gui = player and player:FindFirstChildOfClass("PlayerGui")\n        local count = gui and #gui:GetDescendants() or 0\n        return count > 0, count\n    end\n    local expectedPlace = string.match(expression, "^place%-id:(%d+)$")\n    if expectedPlace then\n        return tostring(game.PlaceId) == expectedPlace, tostring(game.PlaceId)\n    end\n    local instancePath = string.match(expression, "^instance%-path:(.+)$")\n    if instancePath then\n        local current = game\n        for segment in string.gmatch(instancePath, "[^/]+") do\n            current = current and current:FindFirstChild(segment) or nil\n            if not current then return false, instancePath end\n        end\n        return true, instancePath\n    end\n    return false, "unsupported-safe-expression:" .. expression\nend\n\nlocal ok, result = pcall(function()\n    return Vibe2AutoPlayer.Run(payload.scenario, { nonce = payload.nonce, verify = verify })\nend)\nif not ok then\n    result = {\n        version = 1, engine = "roblox", nonce = tostring(payload.nonce or ""),\n        authority = "${AUTHORITY}", runtimeVerified = false,\n        capabilities = { studioTestService = true, virtualInput = false },\n        place = game.Name, actions = {}, checkpoints = {},\n        errors = {{ type = "studio-runtime-error", message = tostring(result) }},\n        metrics = { consoleErrorCount = 1 }\n    }\nend\nresultRemote:FireServer(result)\n`;
}

function serverSource(payloadJson, resultRemoteName) {
  const expectedNonce = clean(JSON.parse(payloadJson)?.nonce);
  return `local StudioTestService = game:GetService("StudioTestService")\nlocal HttpService = game:GetService("HttpService")\nlocal EncodingService = game:GetService("EncodingService")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)\nlocal expectedNonce = ${longBracket(expectedNonce)}\nlocal finished = false\n\nlocal function finish(result)\n    if finished then return end\n    finished = true\n    local json = HttpService:JSONEncode(result)\n    local encoded = EncodingService:Base64Encode(buffer.fromstring(json))\n    StudioTestService:EndTest("${RUNTIME_MARKER}" .. buffer.tostring(encoded))\nend\n\nif resultRemote then\n    resultRemote.OnServerEvent:Connect(function(_, result)\n        if type(result) ~= "table" then return end\n        if tostring(result.nonce or "") ~= expectedNonce then return end\n        if tostring(result.authority or "") ~= "${AUTHORITY}" then return end\n        finish(result)\n    end)\nend\n\ntask.delay(45, function()\n    if finished then return end\n    finish({\n        version = 1, engine = "roblox", nonce = expectedNonce,\n        authority = "${AUTHORITY}", runtimeVerified = false,\n        capabilities = { studioTestService = true, virtualInput = false },\n        place = game.Name, actions = {}, checkpoints = {},\n        errors = {{ type = "studio-runtime-timeout", message = "client result timeout" }},\n        metrics = { consoleErrorCount = 1 }\n    })\nend)\n`;
}

function bootstrapSource({ moduleSource, payloadJson, allowSourceScan, expectedPlaceId, sourcePlaceId }) {
  const resultRemoteName = `__Vibe2AutoPlayerResult_${clean(JSON.parse(payloadJson)?.nonce).slice(0, 12)}`;
  const client = clientSource(moduleSource, payloadJson, resultRemoteName);
  const server = serverSource(payloadJson, resultRemoteName);
  const scan = allowSourceScan ? `\nlocal patternDefs = {\n${GENERALIZED_PATTERNS.map(([name, token]) => `    { name = ${longBracket(name)}, token = ${longBracket(token)} },`).join('\n')}\n}\nlocal found, scriptCount = {}, 0\nfor _, instance in ipairs(game:GetDescendants()) do\n    if instance:IsA("LuaSourceContainer") then\n        scriptCount += 1\n        local ok, source = pcall(function() return instance.Source end)\n        if ok and type(source) == "string" then\n            for _, row in ipairs(patternDefs) do\n                if string.find(source, row.token, 1, true) then found[row.name] = true end\n            end\n        end\n    end\nend\nlocal patterns = {}\nfor name in pairs(found) do table.insert(patterns, name) end\ntable.sort(patterns)\nlocal sourceEvidence = { version = 1, placeId = ${longBracket(sourcePlaceId || '')}, observedPlaceId = tostring(game.PlaceId), expectedPlaceId = ${longBracket(expectedPlaceId || '')}, scriptCount = scriptCount, patterns = patterns, rawSourcePersisted = false, authorityExpanded = false }\nlocal encodedSource = EncodingService:Base64Encode(buffer.fromstring(HttpService:JSONEncode(sourceEvidence)))\nprint("${SOURCE_MARKER}" .. buffer.tostring(encodedSource))\n` : '';
  return `local StudioTestService = game:GetService("StudioTestService")\nlocal HttpService = game:GetService("HttpService")\nlocal EncodingService = game:GetService("EncodingService")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ServerScriptService = game:GetService("ServerScriptService")\nlocal StarterPlayer = game:GetService("StarterPlayer")\n${expectedPlaceId ? `if tostring(game.PlaceId) ~= ${longBracket(expectedPlaceId)} then error("Roblox Studio loaded unexpected place: " .. tostring(game.PlaceId)) end\n` : ''}${scan}\nlocal oldRemote = ReplicatedStorage:FindFirstChild(${longBracket(resultRemoteName)})\nif oldRemote then oldRemote:Destroy() end\nlocal resultRemote = Instance.new("RemoteEvent")\nresultRemote.Name = ${longBracket(resultRemoteName)}\nresultRemote.Parent = ReplicatedStorage\nlocal serverRunner = Instance.new("Script")\nserverRunner.Name = "__Vibe2AutoPlayerServerRuntime"\nserverRunner.Source = ${longBracket(server)}\nserverRunner.Parent = ServerScriptService\nlocal clientRunner = Instance.new("LocalScript")\nclientRunner.Name = "__Vibe2AutoPlayerClientRuntime"\nclientRunner.Source = ${longBracket(client)}\nclientRunner.Parent = StarterPlayer:WaitForChild("StarterPlayerScripts")\nlocal ok, value = pcall(function() return StudioTestService:ExecutePlayModeAsync(${longBracket(payloadJson)}) end)\nclientRunner:Destroy()\nserverRunner:Destroy()\nresultRemote:Destroy()\nif not ok then error("Vibe2 Studio play mode failed: " .. tostring(value)) end\nprint(tostring(value))\n`;
}

function persistSanitizedSourceEvidence(sourceRoot, evidence, { placeId, permissionEvidence }) {
  const root = path.resolve(sourceRoot);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const patterns = [...new Set((evidence?.patterns || []).map(clean).filter(Boolean))].sort();
  const tokenByName = new Map(GENERALIZED_PATTERNS.map(([name, token]) => [name, token]));
  const evidenceText = [
    '-- Vibe2 generalized evidence from an explicitly copy-enabled Roblox Studio session.',
    '-- Raw source is intentionally never written to this workspace.',
    ...patterns.map((name) => `-- ${tokenByName.get(name) || name}`)
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, 'authorized-pattern-evidence.luau'), evidenceText, 'utf8');
  writeJson(path.join(root, 'authorized-studio-manifest.json'), {
    version: 1,
    authority: 'vibe2-roblox-authorized-studio-copy-session',
    placeId: clean(placeId),
    observedPlaceId: clean(evidence?.observedPlaceId),
    permission: COPY_PERMISSION,
    permissionEvidence: clean(permissionEvidence),
    copyAllowed: true,
    accessMode: 'official-studio-cli-copy-enabled-session',
    scriptCount: Number(evidence?.scriptCount || 0),
    generalizedPatterns: patterns,
    rawSourcePersisted: false,
    rawPlacePersisted: false,
    authorityExpanded: false
  });
}

export async function runRobloxStudioCliRuntime({
  studioPath = '', scenarioFile = '', runtimeResultFile = '', nonce = '', placeFile = '', placeId = '', universeId = '',
  copyPermission = '', permissionEvidence = '', sourceRoot = '', moduleFile = 'tools/runtime/roblox/Vibe2AutoPlayer.luau',
  cwd = process.cwd(), timeoutMs = 180000, fetchImpl = globalThis.fetch
} = {}) {
  if (!clean(scenarioFile) || !fs.existsSync(scenarioFile)) throw new Error('Roblox Studio scenario file missing');
  if (!clean(runtimeResultFile)) throw new Error('Roblox Studio runtime result path missing');
  if (!clean(nonce)) throw new Error('Roblox Studio nonce missing');
  const scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
  if (clean(scenario?.engine).toLowerCase() !== 'roblox') throw new Error('Roblox Studio scenario engine must be roblox');
  const modulePath = path.resolve(cwd, moduleFile);
  if (!fs.existsSync(modulePath)) throw new Error(`Roblox AUTO PLAYER module missing: ${modulePath}`);
  const resolvedStudio = findRobloxStudioBinary({ override: studioPath });
  if (!resolvedStudio) throw new Error('RobloxStudioBeta.exe not found; set VIBE2_ROBLOX_STUDIO_PATH on the self-hosted runner');
  const normalizedPlaceFile = clean(placeFile);
  const normalizedPlaceId = clean(placeId);
  const authorizedCopy = clean(copyPermission) === COPY_PERMISSION && Boolean(clean(permissionEvidence)) && /^\d+$/.test(normalizedPlaceId);
  const expectedRuntimePlaceId = authorizedCopy || normalizedPlaceFile ? '' : normalizedPlaceId;
  const authorizedScan = Boolean(clean(sourceRoot)) && authorizedCopy;
  if (clean(sourceRoot) && !authorizedScan) throw new Error('authorized Studio source scan requires creator-enabled place copying permission, numeric source placeId and evidence');
  let resolvedUniverse = clean(universeId);
  if (!normalizedPlaceFile && normalizedPlaceId && !resolvedUniverse) resolvedUniverse = await resolveUniverseId(normalizedPlaceId, fetchImpl);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-studio-cli-'));
  const bootstrapFile = path.join(tempRoot, 'vibe2-bootstrap.luau');
  const studioOutput = path.join(tempRoot, 'studio-output.log');
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  const payloadJson = JSON.stringify({ nonce: clean(nonce), scenario });
  fs.writeFileSync(bootstrapFile, bootstrapSource({ moduleSource, payloadJson, allowSourceScan: authorizedScan, expectedPlaceId: expectedRuntimePlaceId, sourcePlaceId: normalizedPlaceId }), 'utf8');
  try {
    const studioArgs = ['--task', 'RunScript'];
    if (normalizedPlaceFile) studioArgs.push('--localPlaceFile', path.resolve(normalizedPlaceFile));
    else if (normalizedPlaceId) {
      studioArgs.push('--placeId', normalizedPlaceId);
      if (resolvedUniverse) studioArgs.push('--universeId', resolvedUniverse);
    }
    studioArgs.push('--runScriptFile', bootstrapFile, '--outputFile', studioOutput, '--quitAfterExecution');
    const processResult = await runProcess(resolvedStudio, studioArgs, { cwd, timeoutMs });
    const output = `${processResult.stdout}\n${processResult.stderr}\n${fs.existsSync(studioOutput) ? fs.readFileSync(studioOutput, 'utf8') : ''}`;
    if (processResult.code !== 0) throw new Error(`Roblox Studio CLI exit ${processResult.code}: ${output.slice(-6000)}`);
    const runtimeEncoded = parseMarker(output, RUNTIME_MARKER);
    if (!runtimeEncoded) throw new Error(`Roblox Studio runtime evidence missing: ${output.slice(-6000)}`);
    const runtime = decodeBase64Json(runtimeEncoded, 'Roblox Studio runtime evidence');
    if (clean(runtime?.nonce) !== clean(nonce)) throw new Error('Roblox Studio runtime nonce mismatch');
    if (clean(runtime?.authority) !== AUTHORITY) throw new Error('Roblox Studio runtime authority mismatch');
    if (authorizedScan) {
      const sourceEncoded = parseMarker(output, SOURCE_MARKER);
      if (!sourceEncoded) throw new Error('authorized Roblox Studio source evidence missing');
      const sourceEvidence = decodeBase64Json(sourceEncoded, 'authorized Roblox Studio source evidence');
      if (clean(sourceEvidence?.placeId) !== normalizedPlaceId) throw new Error('authorized Roblox Studio source provenance placeId mismatch');
      persistSanitizedSourceEvidence(path.resolve(cwd, sourceRoot), sourceEvidence, { placeId: normalizedPlaceId, permissionEvidence });
    }
    writeJson(runtimeResultFile, runtime);
    process.stdout.write(`${RUNTIME_MARKER}${runtimeEncoded}\n`);
    process.stderr.write('VIBE2_ROBLOX_STUDIO_CLI=PASS\n');
    process.stderr.write(`VIBE2_ROBLOX_STUDIO_SOURCE_PLACE_ID=${normalizedPlaceId || 'NONE'}\n`);
    process.stderr.write(`VIBE2_ROBLOX_STUDIO_PLACE=${clean(runtime?.place) || normalizedPlaceId || 'baseplate'}\n`);
    return Object.freeze({ verifiedRuntime: runtime?.runtimeVerified === true, studioPath: resolvedStudio, placeId: normalizedPlaceId || null, universeId: resolvedUniverse || null, authorizedCopy, localPlaceFile: Boolean(normalizedPlaceFile), authorityExpanded: false });
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf();
  await runRobloxStudioCliRuntime({
    studioPath: clean(args.studio) || clean(process.env.VIBE2_ROBLOX_STUDIO_PATH),
    scenarioFile: clean(args.scenario) || clean(process.env.VIBE2_AUTO_PLAYER_SCENARIO),
    runtimeResultFile: clean(args.output) || clean(process.env.VIBE2_AUTO_PLAYER_RUNTIME_RESULT),
    nonce: clean(args.nonce) || clean(process.env.VIBE2_AUTO_PLAYER_NONCE),
    placeFile: clean(args['place-file']) || clean(process.env.VIBE2_ROBLOX_AUTHORIZED_PLACE_FILE) || clean(process.env.VIBE2_ROBLOX_STUDIO_PLACE_FILE),
    placeId: clean(args['place-id']) || clean(process.env.VIBE2_ROBLOX_STUDIO_PLACE_ID) || clean(process.env.VIBE2_ROBLOX_AUTHORIZED_SOURCE_PLACE_ID),
    universeId: clean(args['universe-id']) || clean(process.env.VIBE2_ROBLOX_STUDIO_UNIVERSE_ID),
    copyPermission: clean(args['copy-permission']) || clean(process.env.VIBE2_ROBLOX_COPY_PERMISSION),
    permissionEvidence: clean(args['permission-evidence']) || clean(process.env.VIBE2_ROBLOX_PERMISSION_EVIDENCE),
    sourceRoot: clean(args['source-root']) || clean(process.env.VIBE2_ROBLOX_AUTHORIZED_SOURCE_ROOT),
    moduleFile: clean(args['module-file']) || 'tools/runtime/roblox/Vibe2AutoPlayer.luau',
    cwd: clean(args.cwd) || process.cwd(),
    timeoutMs: Number(args.timeout) || 180000
  });
}

export { AUTHORITY, COPY_PERMISSION, RUNTIME_MARKER, SOURCE_MARKER, resolveUniverseId };