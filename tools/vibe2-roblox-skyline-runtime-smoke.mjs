import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findRobloxStudioBinary } from './vibe2-roblox-studio-cli-runner.mjs';

const MARKER = 'VIBE2_ROBLOX_SKYLINE_RUNTIME_JSON=';
const AUTHORITY = 'vibe2-roblox-skyline-runtime';
const clean = (value) => String(value ?? '').trim();

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

function longBracket(value) {
  const text = String(value);
  for (let n = 0; n < 12; n += 1) {
    const eq = '='.repeat(n);
    if (!text.includes(`]${eq}]`)) return `[${eq}[${text}]${eq}]`;
  }
  throw new Error('unable to encode Luau long string safely');
}

function runProcess(command, args, { cwd = process.cwd(), timeoutMs = 210000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: false });
    let stdout = '', stderr = '', settled = false;
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      if (!settled) { settled = true; reject(new Error(`Roblox Skyline runtime timeout: ${timeoutMs}ms`)); }
    }, Math.max(30000, Number(timeoutMs) || 210000));
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { if (stdout.length < 700000) stdout += chunk; });
    child.stderr.on('data', (chunk) => { if (stderr.length < 700000) stderr += chunk; });
    child.on('error', (error) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } });
    child.on('close', (code) => { if (!settled) { settled = true; clearTimeout(timer); resolve({ code, stdout, stderr }); } });
  });
}

function readProject(projectRoot) {
  const root = path.resolve(projectRoot);
  const files = {
    config: path.join(root, 'shared', 'GameConfig.luau'),
    server: path.join(root, 'server', 'Game.server.luau'),
    client: path.join(root, 'client', 'Game.client.luau'),
    project: path.join(root, 'default.project.json'),
  };
  for (const file of Object.values(files)) if (!fs.existsSync(file)) throw new Error(`missing Roblox project file: ${file}`);
  return {
    root,
    config: fs.readFileSync(files.config, 'utf8'),
    server: fs.readFileSync(files.server, 'utf8'),
    client: fs.readFileSync(files.client, 'utf8'),
  };
}

function clientHarnessSource(resultRemoteName) {
  return `local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)
local result = { version = 1, authority = ${longBracket(AUTHORITY)}, checkpoints = {}, errors = {}, metrics = {}, final = {} }

local function checkpoint(name, pass, value)
  table.insert(result.checkpoints, { name = name, pass = pass == true, value = value })
  if not pass then table.insert(result.errors, name) end
end

local function characterReady(timeout)
  local deadline = os.clock() + (timeout or 10)
  while os.clock() < deadline do
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if root and humanoid and humanoid.Health > 0 then return character, root, humanoid end
    task.wait(0.05)
  end
  return nil, nil, nil
end

local function waitFor(predicate, timeout)
  local deadline = os.clock() + (timeout or 6)
  while os.clock() < deadline do
    local ok, value = pcall(predicate)
    if ok and value then return true end
    task.wait(0.05)
  end
  return false
end

local function sizeKey(size)
  return string.format("%.1f/%.1f/%.1f", size.X, size.Y, size.Z)
end

local function isCheckpointName(name)
  return string.match(name, "^Checkpoint%d%d$") ~= nil
end

local function isHazardName(name)
  return name == "KillFloor" or string.match(name, "^Hazard") ~= nil
end

local ok, err = pcall(function()
  local course = Workspace:WaitForChild("Vibe2SkylineSprintCourse", 12)
  assert(course, "course-missing")
  local _, root = characterReady(10)
  assert(root, "character-missing")
  local start = course:WaitForChild("CourseStart", 5)

  local checkpoints = {}
  for stage = 1, 12 do
    checkpoints[stage] = course:WaitForChild(string.format("Checkpoint%02d", stage), 5)
  end
  checkpoint("stage-count", #checkpoints == 12, #checkpoints)

  local verticalGain = checkpoints[12].Position.Y - start.Position.Y
  local minY, maxY = math.huge, -math.huge
  for _, cp in ipairs(checkpoints) do
    minY = math.min(minY, cp.Position.Y)
    maxY = math.max(maxY, cp.Position.Y)
  end
  result.metrics.verticalGain = verticalGain
  result.metrics.checkpointVerticalSpread = maxY - minY
  checkpoint("vertical-progression", verticalGain >= 24 and (maxY - minY) >= 20, { gain = verticalGain, spread = maxY - minY })

  local obstacleParts = {}
  local sizeKinds = {}
  local colorKinds = {}
  local rotated = 0
  local snapshots = {}
  local hazard = nil
  for _, item in ipairs(course:GetDescendants()) do
    if item:IsA("BasePart") then
      if isHazardName(item.Name) and item.Name ~= "KillFloor" and not hazard then hazard = item end
      if item ~= start and not isCheckpointName(item.Name) and not isHazardName(item.Name) then
        table.insert(obstacleParts, item)
        sizeKinds[sizeKey(item.Size)] = true
        colorKinds[string.format("%d/%d/%d", math.floor(item.Color.R * 255), math.floor(item.Color.G * 255), math.floor(item.Color.B * 255))] = true
        local _, y, z = item.CFrame:ToOrientation()
        if math.abs(y) > math.rad(3) or math.abs(z) > math.rad(3) then rotated += 1 end
        snapshots[item] = { cf = item.CFrame, transparency = item.Transparency, collide = item.CanCollide }
      end
    end
  end
  local sizeKindCount, colorKindCount = 0, 0
  for _ in pairs(sizeKinds) do sizeKindCount += 1 end
  for _ in pairs(colorKinds) do colorKindCount += 1 end
  checkpoint("obstacle-count", #obstacleParts >= 24, #obstacleParts)
  checkpoint("obstacle-size-diversity", sizeKindCount >= 4, sizeKindCount)
  checkpoint("obstacle-visual-diversity", colorKindCount >= 4 or rotated >= 4, { colors = colorKindCount, rotated = rotated })

  task.wait(1.5)
  local dynamic = 0
  for part, before in pairs(snapshots) do
    if part.Parent then
      local moved = (part.Position - before.cf.Position).Magnitude > 0.05
      local turned = part.CFrame.LookVector:Dot(before.cf.LookVector) < 0.9995
      local toggled = math.abs(part.Transparency - before.transparency) > 0.05 or part.CanCollide ~= before.collide
      if moved or turned or toggled then dynamic += 1 end
    end
  end
  result.metrics.obstacleCount = #obstacleParts
  result.metrics.sizeKinds = sizeKindCount
  result.metrics.colorKinds = colorKindCount
  result.metrics.rotatedObstacleCount = rotated
  result.metrics.dynamicObstacleCount = dynamic
  checkpoint("dynamic-obstacle-diversity", dynamic >= 2, dynamic)

  root.CFrame = start.CFrame + Vector3.new(0, 4, 0)
  checkpoint("round-1-start", waitFor(function() return player:GetAttribute("LastApprovedScope") == "physical-course-started" end, 4), player:GetAttribute("LastApprovedScope"))

  root.CFrame = checkpoints[1].CFrame + Vector3.new(0, 4, 0)
  checkpoint("round-1-stage-01", waitFor(function() return player:GetAttribute("Position") == 1 end, 3), player:GetAttribute("Position"))

  checkpoint("hazard-present", hazard ~= nil, hazard and hazard.Name or "NONE")
  if hazard then
    local beforeCharacter = player.Character
    root.CFrame = hazard.CFrame + Vector3.new(0, 2, 0)
    local died = waitFor(function()
      local humanoid = beforeCharacter and beforeCharacter:FindFirstChildOfClass("Humanoid")
      return humanoid and humanoid.Health <= 0
    end, 4)
    checkpoint("hazard-death", died, died)
    local respawned = waitFor(function()
      local character = player.Character
      local newRoot = character and character:FindFirstChild("HumanoidRootPart")
      local humanoid = character and character:FindFirstChildOfClass("Humanoid")
      return character ~= beforeCharacter and newRoot and humanoid and humanoid.Health > 0
    end, 10)
    local _, respawnRoot = characterReady(3)
    local nearCheckpoint = respawnRoot and (respawnRoot.Position - checkpoints[1].Position).Magnitude < 18
    checkpoint("checkpoint-respawn", respawned and nearCheckpoint == true and player:GetAttribute("Position") == 1, {
      respawned = respawned,
      distance = respawnRoot and (respawnRoot.Position - checkpoints[1].Position).Magnitude or -1,
      position = player:GetAttribute("Position"),
    })
    root = respawnRoot or root
  end

  for stage = 2, 12 do
    local target = checkpoints[stage]
    root.CFrame = target.CFrame + Vector3.new(0, 4, 0)
    local reached = waitFor(function() return player:GetAttribute("Position") == stage end, 3)
    checkpoint(string.format("round-1-stage-%02d", stage), reached, player:GetAttribute("Position"))
    if not reached then break end
  end

  local finishTime = tonumber(player:GetAttribute("RoundTime")) or 0
  checkpoint("round-1-finished", player:GetAttribute("Finished") == true and player:GetAttribute("Restarting") == true and player:GetAttribute("Position") == 12, {
    finished = player:GetAttribute("Finished"), restarting = player:GetAttribute("Restarting"), position = player:GetAttribute("Position"), round = player:GetAttribute("Round"), roundTime = finishTime,
  })

  local restarted = waitFor(function()
    return player:GetAttribute("Round") == 2
      and player:GetAttribute("Position") == 0
      and player:GetAttribute("Progress") == 0
      and player:GetAttribute("Score") == 0
      and player:GetAttribute("Finished") == false
      and player:GetAttribute("Restarting") == false
  end, 7)
  checkpoint("round-2-reset", restarted, {
    round = player:GetAttribute("Round"), position = player:GetAttribute("Position"), progress = player:GetAttribute("Progress"), score = player:GetAttribute("Score"),
    finished = player:GetAttribute("Finished"), restarting = player:GetAttribute("Restarting"), roundTime = player:GetAttribute("RoundTime"),
  })

  local _, round2Root = characterReady(5)
  local nearStart = round2Root and (round2Root.Position - start.Position).Magnitude < 14
  checkpoint("round-2-start-position", nearStart == true, round2Root and (round2Root.Position - start.Position).Magnitude or -1)
  if round2Root then round2Root.CFrame = start.CFrame + Vector3.new(0, 4, 0) end
  checkpoint("round-2-playable", waitFor(function() return player:GetAttribute("LastApprovedScope") == "physical-course-started" end, 4), player:GetAttribute("LastApprovedScope"))

  task.wait(0.3)
  result.final = {
    round = player:GetAttribute("Round"),
    position = player:GetAttribute("Position"),
    progress = player:GetAttribute("Progress"),
    score = player:GetAttribute("Score"),
    roundTime = player:GetAttribute("RoundTime"),
    finished = player:GetAttribute("Finished"),
    restarting = player:GetAttribute("Restarting"),
    finishTime = finishTime,
  }
end)
if not ok then table.insert(result.errors, tostring(err)) end
resultRemote:FireServer(result)
`;
}

function serverCaptureSource(resultRemoteName, nonce) {
  return `local StudioTestService = game:GetService("StudioTestService")
local HttpService = game:GetService("HttpService")
local EncodingService = game:GetService("EncodingService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)
local finished = false
local function finish(result)
  if finished then return end
  finished = true
  result.nonce = ${longBracket(nonce)}
  local json = HttpService:JSONEncode(result)
  local encoded = EncodingService:Base64Encode(buffer.fromstring(json))
  StudioTestService:EndTest(${longBracket(MARKER)} .. buffer.tostring(encoded))
end
resultRemote.OnServerEvent:Connect(function(_, result)
  if type(result) ~= "table" or tostring(result.authority or "") ~= ${longBracket(AUTHORITY)} then return end
  finish(result)
end)
task.delay(120, function() finish({ authority = ${longBracket(AUTHORITY)}, errors = {"skyline-runtime-timeout"}, checkpoints = {}, metrics = {} }) end)
`;
}

function bootstrapSource(project, nonce) {
  const resultRemoteName = `__Vibe2Skyline_${nonce.slice(0, 12)}`;
  const harness = clientHarnessSource(resultRemoteName);
  const capture = serverCaptureSource(resultRemoteName, nonce);
  return `local StudioTestService = game:GetService("StudioTestService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local Workspace = game:GetService("Workspace")

for _, child in ipairs(Workspace:GetChildren()) do
  if child ~= Workspace.Terrain and child:IsA("BasePart") then child:Destroy() end
end
local function resetNamed(parent, name) local old = parent:FindFirstChild(name); if old then old:Destroy() end end
local function folder(parent, name) resetNamed(parent, name); local value = Instance.new("Folder"); value.Name = name; value.Parent = parent; return value end

local shared = folder(ReplicatedStorage, "Shared")
local config = Instance.new("ModuleScript"); config.Name = "GameConfig"; config.Source = ${longBracket(project.config)}; config.Parent = shared
local serverFolder = folder(ServerScriptService, "GameServer")
local gameServer = Instance.new("Script"); gameServer.Name = "Game"; gameServer.Source = ${longBracket(project.server)}; gameServer.Parent = serverFolder
local starterScripts = StarterPlayer:WaitForChild("StarterPlayerScripts")
local clientFolder = folder(starterScripts, "GameClient")
local gameClient = Instance.new("LocalScript"); gameClient.Name = "Game"; gameClient.Source = ${longBracket(project.client)}; gameClient.Parent = clientFolder

resetNamed(ReplicatedStorage, ${longBracket(resultRemoteName)})
local resultRemote = Instance.new("RemoteEvent"); resultRemote.Name = ${longBracket(resultRemoteName)}; resultRemote.Parent = ReplicatedStorage
local capture = Instance.new("Script"); capture.Name = "__Vibe2SkylineServer"; capture.Source = ${longBracket(capture)}; capture.Parent = ServerScriptService
local harness = Instance.new("LocalScript"); harness.Name = "__Vibe2SkylineClient"; harness.Source = ${longBracket(harness)}; harness.Parent = starterScripts

local ok, value = pcall(function() return StudioTestService:ExecutePlayModeAsync("{}") end)
if not ok then error("Vibe2 Skyline Studio run failed: " .. tostring(value)) end
print(tostring(value))
`;
}

function parseMarker(output) {
  for (const row of String(output || '').split(/\r?\n/).reverse()) {
    const at = row.indexOf(MARKER);
    if (at < 0) continue;
    const encoded = row.slice(at + MARKER.length).trim().match(/^([A-Za-z0-9+/]{16,}={0,2})/)?.[1];
    if (!encoded) continue;
    try { return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')); } catch {}
  }
  return null;
}

export async function runRobloxSkylineRuntimeSmoke({ projectRoot, studioPath = '', outputFile = '', timeoutMs = 210000, nonce = '' } = {}) {
  const project = readProject(projectRoot);
  const resolvedStudio = findRobloxStudioBinary({ override: studioPath });
  if (!resolvedStudio) throw new Error('RobloxStudioBeta.exe not found');
  const actualNonce = clean(nonce) || Math.random().toString(16).slice(2) + Date.now().toString(16);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-skyline-'));
  const bootstrapFile = path.join(tempRoot, 'bootstrap.luau');
  const studioOutput = path.join(tempRoot, 'studio-output.log');
  fs.writeFileSync(bootstrapFile, bootstrapSource(project, actualNonce), 'utf8');
  const processResult = await runProcess(resolvedStudio, ['--task', 'RunScript', '--runScriptFile', bootstrapFile, '--outputFile', studioOutput, '--quitAfterExecution'], { cwd: project.root, timeoutMs });
  const output = `${processResult.stdout}\n${processResult.stderr}\n${fs.existsSync(studioOutput) ? fs.readFileSync(studioOutput, 'utf8') : ''}`;
  if (processResult.code !== 0) throw new Error(`Roblox Studio CLI exit ${processResult.code}: ${output.slice(-8000)}`);
  const result = parseMarker(output);
  if (!result) throw new Error(`Roblox Skyline runtime evidence missing: ${output.slice(-8000)}`);
  if (clean(result.nonce) !== actualNonce) throw new Error('Roblox Skyline runtime nonce mismatch');
  const failed = (result.checkpoints || []).filter((item) => item?.pass !== true);
  if (failed.length || (result.errors || []).length) throw new Error(`Roblox Skyline runtime verification failed: ${JSON.stringify({ failed, errors: result.errors, metrics: result.metrics, final: result.final })}`);
  if (Number(result.final?.round) !== 2 || result.final?.finished !== false || result.final?.restarting !== false) throw new Error('Roblox Skyline did not reach playable round 2');
  if (outputFile) {
    fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
    fs.writeFileSync(path.resolve(outputFile), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  console.log('VIBE2_ROBLOX_SKYLINE_RUNTIME=PASS');
  console.log(`VIBE2_ROBLOX_SKYLINE_DYNAMIC=${Number(result.metrics?.dynamicObstacleCount || 0)}`);
  console.log(`VIBE2_ROBLOX_SKYLINE_VERTICAL_GAIN=${Number(result.metrics?.verticalGain || 0)}`);
  console.log(`VIBE2_ROBLOX_SKYLINE_ROUND=${result.final.round}`);
  return result;
}

async function main() {
  const args = argsOf();
  await runRobloxSkylineRuntimeSmoke({
    projectRoot: clean(args['project-root']),
    studioPath: clean(args.studio) || clean(process.env.VIBE2_ROBLOX_STUDIO_PATH),
    outputFile: clean(args.output),
    timeoutMs: Number(args.timeout || 210000),
    nonce: clean(args.nonce),
  });
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invoked) main().catch((error) => { console.error(error?.stack || error); process.exit(1); });
