import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findRobloxStudioBinary } from './vibe2-roblox-studio-cli-runner.mjs';

const MARKER = 'VIBE2_ROBLOX_PROJECT_RUNTIME_JSON=';
const AUTHORITY = 'vibe2-roblox-project-runtime';
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

function runProcess(command, args, { cwd = process.cwd(), timeoutMs = 240000 } = {}) {
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
      finish(new Error(`Roblox project runtime timeout: ${timeoutMs}ms`));
    }, Math.max(30000, Number(timeoutMs) || 240000));
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { if (stdout.length < 800000) stdout += chunk; });
    child.stderr.on('data', (chunk) => { if (stderr.length < 800000) stderr += chunk; });
    child.on('error', finish);
    child.on('close', (code) => finish(null, code));
  });
}

function readProjectSource(projectRoot) {
  const root = path.resolve(projectRoot);
  const required = {
    config: path.join(root, 'shared', 'GameConfig.luau'),
    server: path.join(root, 'server', 'Game.server.luau'),
    client: path.join(root, 'client', 'Game.client.luau'),
    project: path.join(root, 'default.project.json'),
  };
  for (const [label, file] of Object.entries(required)) {
    if (!fs.existsSync(file)) throw new Error(`Roblox project ${label} missing: ${file}`);
  }
  const project = JSON.parse(fs.readFileSync(required.project, 'utf8'));
  if (project?.tree?.ReplicatedStorage?.Shared?.$path !== 'shared') throw new Error('Roblox project Shared mapping changed');
  if (project?.tree?.ServerScriptService?.GameServer?.$path !== 'server') throw new Error('Roblox project server mapping changed');
  if (project?.tree?.StarterPlayer?.StarterPlayerScripts?.GameClient?.$path !== 'client') throw new Error('Roblox project client mapping changed');
  return {
    root,
    config: fs.readFileSync(required.config, 'utf8'),
    server: fs.readFileSync(required.server, 'utf8'),
    client: fs.readFileSync(required.client, 'utf8'),
  };
}

function clientHarnessSource(resultRemoteName, stageCount) {
  return `local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)
local virtualInput = UserInputService:CreateVirtualInput()
local result = {
  version = 1, authority = ${longBracket(AUTHORITY)}, runtimeVerified = true,
  virtualInput = virtualInput ~= nil, stageCount = ${stageCount}, checkpoints = {}, errors = {},
  final = {}, movement = { distance = 0, sawAir = false, jumpPulses = 0, waypoints = 0, diagnostics = {} },
}

local function checkpoint(name, pass, value)
  table.insert(result.checkpoints, { name = name, pass = pass == true, value = value })
  if not pass then table.insert(result.errors, name) end
  return pass
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

local function waitAttribute(name, expected, timeout)
  local deadline = os.clock() + (timeout or 6)
  while os.clock() < deadline do
    if player:GetAttribute(name) == expected then return true end
    task.wait(0.05)
  end
  return false
end

local function horizontalDistance(a, b)
  local dx = a.X - b.X
  local dz = a.Z - b.Z
  return math.sqrt(dx * dx + dz * dz)
end

local function moveToWaypoint(part, expectedStage, timeout, requireStage)
  local _, root, humanoid = characterReady(8)
  if not root then return false, { reason = "character-missing" } end
  local camera = Workspace.CurrentCamera
  local start = root.Position
  local deadline = os.clock() + (timeout or 5)
  local nextJump = os.clock()
  local minDistance = horizontalDistance(root.Position, part.Position)
  virtualInput:SendKey(true, Enum.KeyCode.W, false)
  while os.clock() < deadline do
    if not root.Parent or humanoid.Health <= 0 then break end
    local distance = horizontalDistance(root.Position, part.Position)
    minDistance = math.min(minDistance, distance)
    if requireStage then
      if player:GetAttribute("Position") == expectedStage then break end
    elseif distance <= 3.8 then
      break
    end
    local target = Vector3.new(part.Position.X, root.Position.Y, part.Position.Z)
    if camera then
      camera.CameraType = Enum.CameraType.Scriptable
      camera.CFrame = CFrame.lookAt(root.Position + Vector3.new(0, 5, 0), target)
    end
    if humanoid.FloorMaterial == Enum.Material.Air then result.movement.sawAir = true end
    if os.clock() >= nextJump then
      virtualInput:SendKey(true, Enum.KeyCode.Space, false)
      task.wait(0.06)
      virtualInput:SendKey(false, Enum.KeyCode.Space, false)
      result.movement.jumpPulses += 1
      nextJump = os.clock() + 0.42
    end
    task.wait(0.04)
  end
  virtualInput:SendKey(false, Enum.KeyCode.W, false)
  task.wait(0.12)
  local finishPosition = root.Parent and root.Position or start
  result.movement.distance += (finishPosition - start).Magnitude
  result.movement.waypoints += 1
  local distance = root.Parent and horizontalDistance(root.Position, part.Position) or minDistance
  local reached = requireStage and player:GetAttribute("Position") == expectedStage or (not requireStage and distance <= 5.5)
  local diag = {
    target = part.Name,
    expectedStage = expectedStage,
    requireStage = requireStage,
    position = player:GetAttribute("Position"),
    health = humanoid.Health,
    distance = distance,
    minDistance = minDistance,
    root = root.Parent and { x = root.Position.X, y = root.Position.Y, z = root.Position.Z } or nil,
  }
  if not reached then table.insert(result.movement.diagnostics, diag) end
  return reached, diag
end

local ok, err = pcall(function()
  local course = Workspace:WaitForChild("Vibe2SkylineSprintCourse", 12)
  assert(course, "course-missing")
  checkpoint("course-present", course ~= nil, course and course.Name)
  local _, root = characterReady(10)
  assert(root, "character-missing")

  local checkpoint02 = course:WaitForChild("Checkpoint02", 5)
  root.CFrame = checkpoint02.CFrame + Vector3.new(0, 4, 0)
  task.wait(0.8)
  checkpoint("skip-rejected", (player:GetAttribute("Position") or 0) == 0, player:GetAttribute("Position"))

  local start = course:WaitForChild("CourseStart", 5)
  root.CFrame = start.CFrame + Vector3.new(0, 4, 0)
  checkpoint("round-started", waitAttribute("LastApprovedScope", "physical-course-started", 4), player:GetAttribute("LastApprovedScope"))

  for stage = 1, ${stageCount} do
    local stepA = course:WaitForChild(string.format("Step%02dA", stage), 5)
    local stepB = course:WaitForChild(string.format("Step%02dB", stage), 5)
    local target = course:WaitForChild(string.format("Checkpoint%02d", stage), 5)
    local aReached, aValue = moveToWaypoint(stepA, stage, 5, false)
    checkpoint(string.format("stage-%02d-step-a", stage), aReached, aValue)
    if not aReached then break end
    local bReached, bValue = moveToWaypoint(stepB, stage, 5, false)
    checkpoint(string.format("stage-%02d-step-b", stage), bReached, bValue)
    if not bReached then break end
    local reached, value = moveToWaypoint(target, stage, 6, true)
    checkpoint(string.format("stage-%02d", stage), reached, value)
    if not reached then break end

    if stage == 3 then
      local oldCharacter = player.Character
      local hazard = course:WaitForChild("Hazard03", 5)
      local oldRoot = oldCharacter and oldCharacter:FindFirstChild("HumanoidRootPart")
      if oldRoot then oldRoot.CFrame = hazard.CFrame + Vector3.new(0, 2, 0) end
      local respawnDeadline = os.clock() + 8
      while os.clock() < respawnDeadline and player.Character == oldCharacter do task.wait(0.05) end
      local _, respawnRoot = characterReady(8)
      local saved = player:GetAttribute("Position") == 3
      local near = respawnRoot and (respawnRoot.Position - target.Position).Magnitude < 12
      checkpoint("hazard-death-respawn", player.Character ~= oldCharacter and saved and near, { stage = player:GetAttribute("Position"), near = near })
    elseif stage == 4 then
      local before = player:GetAttribute("Position")
      local gameAction = ReplicatedStorage:WaitForChild("GameAction", 5)
      gameAction:FireServer("advance")
      task.wait(0.4)
      checkpoint("remote-cannot-progress", player:GetAttribute("Position") == before, player:GetAttribute("Position"))
    end
  end

  result.final = {
    position = player:GetAttribute("Position"), progress = player:GetAttribute("Progress"),
    score = player:GetAttribute("Score"), roundTime = player:GetAttribute("RoundTime"),
    finished = player:GetAttribute("Finished"),
  }
  checkpoint("physical-movement", result.movement.distance > 20, result.movement.distance)
  checkpoint("jump-input", result.movement.jumpPulses > 0 and result.movement.sawAir, result.movement)
  checkpoint("finish", result.final.position == ${stageCount} and result.final.progress == 100 and result.final.finished == true, result.final)
  checkpoint("round-time", tonumber(result.final.roundTime or 0) > 0, result.final.roundTime)
end)
if not ok then
  result.runtimeVerified = false
  table.insert(result.errors, tostring(err))
end
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
  if type(result) ~= "table" then return end
  if tostring(result.authority or "") ~= ${longBracket(AUTHORITY)} then return end
  finish(result)
end)
task.delay(150, function()
  finish({ version = 1, authority = ${longBracket(AUTHORITY)}, runtimeVerified = false, virtualInput = false, errors = {"project-runtime-timeout"}, checkpoints = {} })
end)
`;
}

function bootstrapSource(project, nonce, stageCount) {
  const resultRemoteName = `__Vibe2ProjectRuntime_${nonce.slice(0, 12)}`;
  const harness = clientHarnessSource(resultRemoteName, stageCount);
  const capture = serverCaptureSource(resultRemoteName, nonce);
  return `local StudioTestService = game:GetService("StudioTestService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local Workspace = game:GetService("Workspace")

for _, child in ipairs(Workspace:GetChildren()) do
  if child ~= Workspace.Terrain and child:IsA("BasePart") then child:Destroy() end
end

local function resetNamed(parent, name)
  local old = parent:FindFirstChild(name)
  if old then old:Destroy() end
end
local function folder(parent, name)
  resetNamed(parent, name)
  local value = Instance.new("Folder")
  value.Name = name
  value.Parent = parent
  return value
end

local shared = folder(ReplicatedStorage, "Shared")
local config = Instance.new("ModuleScript")
config.Name = "GameConfig"
config.Source = ${longBracket(project.config)}
config.Parent = shared

local serverFolder = folder(ServerScriptService, "GameServer")
local gameServer = Instance.new("Script")
gameServer.Name = "Game"
gameServer.Source = ${longBracket(project.server)}
gameServer.Parent = serverFolder

local starterScripts = StarterPlayer:WaitForChild("StarterPlayerScripts")
local clientFolder = folder(starterScripts, "GameClient")
local gameClient = Instance.new("LocalScript")
gameClient.Name = "Game"
gameClient.Source = ${longBracket(project.client)}
gameClient.Parent = clientFolder

resetNamed(ReplicatedStorage, ${longBracket(resultRemoteName)})
local resultRemote = Instance.new("RemoteEvent")
resultRemote.Name = ${longBracket(resultRemoteName)}
resultRemote.Parent = ReplicatedStorage

local capture = Instance.new("Script")
capture.Name = "__Vibe2ProjectRuntimeServer"
capture.Source = ${longBracket(capture)}
capture.Parent = ServerScriptService
local harness = Instance.new("LocalScript")
harness.Name = "__Vibe2ProjectRuntimeClient"
harness.Source = ${longBracket(harness)}
harness.Parent = starterScripts

local ok, value = pcall(function() return StudioTestService:ExecutePlayModeAsync("{}") end)
if not ok then error("Vibe2 project runtime failed: " .. tostring(value)) end
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

export async function runRobloxProjectRuntimeSmoke({ projectRoot, studioPath = '', outputFile = '', timeoutMs = 240000, nonce = '' } = {}) {
  const project = readProjectSource(projectRoot);
  const resolvedStudio = findRobloxStudioBinary({ override: studioPath });
  if (!resolvedStudio) throw new Error('RobloxStudioBeta.exe not found');
  const actualNonce = clean(nonce) || Math.random().toString(16).slice(2) + Date.now().toString(16);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-project-runtime-'));
  const bootstrapFile = path.join(tempRoot, 'bootstrap.luau');
  const studioOutput = path.join(tempRoot, 'studio-output.log');
  fs.writeFileSync(bootstrapFile, bootstrapSource(project, actualNonce, 12), 'utf8');
  const args = ['--task', 'RunScript', '--runScriptFile', bootstrapFile, '--outputFile', studioOutput, '--quitAfterExecution'];
  const processResult = await runProcess(resolvedStudio, args, { cwd: project.root, timeoutMs });
  const output = `${processResult.stdout}\n${processResult.stderr}\n${fs.existsSync(studioOutput) ? fs.readFileSync(studioOutput, 'utf8') : ''}`;
  if (processResult.code !== 0) throw new Error(`Roblox Studio CLI exit ${processResult.code}: ${output.slice(-6000)}`);
  const result = parseMarker(output);
  if (!result) throw new Error(`Roblox project runtime evidence missing: ${output.slice(-6000)}`);
  if (clean(result.nonce) !== actualNonce) throw new Error('Roblox project runtime nonce mismatch');
  const failed = (result.checkpoints || []).filter((item) => item?.pass !== true);
  if (result.runtimeVerified !== true || result.virtualInput !== true || failed.length > 0 || (result.errors || []).length > 0) {
    throw new Error(`Roblox project runtime verification failed: ${JSON.stringify({ failed, errors: result.errors, final: result.final, movement: result.movement })}`);
  }
  if (Number(result.final?.position) !== 12 || Number(result.final?.progress) !== 100 || result.final?.finished !== true) throw new Error('Roblox obby did not finish all 12 stages');
  if (outputFile) {
    fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
    fs.writeFileSync(path.resolve(outputFile), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  console.log('VIBE2_ROBLOX_PROJECT_RUNTIME=PASS');
  console.log(`VIBE2_ROBLOX_PROJECT_STAGE_COUNT=${result.final.position}`);
  console.log(`VIBE2_ROBLOX_PROJECT_ROUND_TIME=${result.final.roundTime}`);
  return result;
}

async function main() {
  const args = argsOf();
  await runRobloxProjectRuntimeSmoke({
    projectRoot: clean(args['project-root']),
    studioPath: clean(args.studio) || clean(process.env.VIBE2_ROBLOX_STUDIO_PATH),
    outputFile: clean(args.output),
    timeoutMs: Number(args.timeout || 240000),
    nonce: clean(args.nonce),
  });
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invoked) main().catch((error) => { console.error(error?.stack || error); process.exit(1); });
