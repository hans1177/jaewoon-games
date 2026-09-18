import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findRobloxStudioBinary } from './vibe2-roblox-studio-cli-runner.mjs';

const MARKER = 'VIBE2_ROBLOX_OBSTACLE_VARIETY_JSON=';
const AUTHORITY = 'vibe2-roblox-obstacle-variety';
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
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      if (!settled) { settled = true; reject(new Error(`Roblox obstacle-variety timeout: ${timeoutMs}ms`)); }
    }, Math.max(30000, Number(timeoutMs) || 240000));
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
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)
local virtualInput = UserInputService:CreateVirtualInput()
local result = {
  version = 1,
  authority = ${longBracket(AUTHORITY)},
  virtualInput = virtualInput ~= nil,
  checkpoints = {},
  errors = {},
  final = {},
  movement = { distance = 0, jumpPulses = 0, sawAir = false, diagnostics = {} },
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

local function horizontalDistance(a, b)
  local dx = a.X - b.X
  local dz = a.Z - b.Z
  return math.sqrt(dx * dx + dz * dz)
end

local function moveTo(part, timeout, expectedStage)
  local _, root, humanoid = characterReady(8)
  if not root then return false, { reason = "character-missing", target = part.Name } end
  local camera = Workspace.CurrentCamera
  local startPosition = root.Position
  local deadline = os.clock() + (timeout or 6)
  local nextJump = os.clock()
  local minDistance = horizontalDistance(root.Position, part.Position)
  virtualInput:SendKey(true, Enum.KeyCode.W, false)
  while os.clock() < deadline do
    if not root.Parent or humanoid.Health <= 0 then break end
    local targetPosition = part.Position
    local distance = horizontalDistance(root.Position, targetPosition)
    minDistance = math.min(minDistance, distance)
    if expectedStage and player:GetAttribute("Position") == expectedStage then break end
    if not expectedStage and distance <= 3.5 then break end
    local eye = root.Position + Vector3.new(0, 4, 0)
    local flatTarget = Vector3.new(targetPosition.X, eye.Y, targetPosition.Z)
    if camera then
      camera.CameraType = Enum.CameraType.Scriptable
      camera.CFrame = CFrame.lookAt(eye, flatTarget)
    end
    if humanoid.FloorMaterial == Enum.Material.Air then result.movement.sawAir = true end
    if os.clock() >= nextJump then
      virtualInput:SendKey(true, Enum.KeyCode.Space, false)
      task.wait(0.055)
      virtualInput:SendKey(false, Enum.KeyCode.Space, false)
      result.movement.jumpPulses += 1
      nextJump = os.clock() + 0.36
    end
    task.wait(0.035)
  end
  virtualInput:SendKey(false, Enum.KeyCode.W, false)
  task.wait(0.12)
  local endPosition = root.Parent and root.Position or startPosition
  result.movement.distance += (endPosition - startPosition).Magnitude
  local distance = root.Parent and horizontalDistance(root.Position, part.Position) or minDistance
  local reached = expectedStage and player:GetAttribute("Position") == expectedStage or (not expectedStage and distance <= 5.0)
  local diag = { target = part.Name, stage = player:GetAttribute("Position"), health = humanoid.Health, distance = distance, minDistance = minDistance }
  if not reached then table.insert(result.movement.diagnostics, diag) end
  return reached, diag
end

local ok, err = pcall(function()
  local course = Workspace:WaitForChild("Vibe2SkylineSprintCourse", 12)
  assert(course, "course-missing")
  local _, root = characterReady(10)
  assert(root, "character-missing")
  local start = course:WaitForChild("CourseStart", 5)
  root.CFrame = start.CFrame + Vector3.new(0, 4, 0)
  task.wait(0.5)
  checkpoint("round-started", player:GetAttribute("LastApprovedScope") == "physical-course-started", player:GetAttribute("LastApprovedScope"))

  checkpoint("wide-zone", course:FindFirstChild("Step01A") ~= nil and course:FindFirstChild("Step03B") ~= nil, true)
  checkpoint("precision-zone", course:FindFirstChild("Step04C") ~= nil and course:FindFirstChild("Step06C") ~= nil, true)
  local movingA = course:WaitForChild("Step07A", 5)
  local movingBefore = movingA.Position
  task.wait(0.7)
  local movingAfter = movingA.Position
  checkpoint("moving-platform-live", movingA:GetAttribute("MovingPlatform") == true and (movingAfter - movingBefore).Magnitude > 0.2, (movingAfter - movingBefore).Magnitude)
  local sweeper = course:WaitForChild("Sweeper10", 5)
  local sweepBefore = sweeper.CFrame.LookVector
  task.wait(0.5)
  local sweepAfter = sweeper.CFrame.LookVector
  checkpoint("sweeper-live", sweeper:GetAttribute("KillSweeper") == true and (sweepAfter - sweepBefore).Magnitude > 0.1, (sweepAfter - sweepBefore).Magnitude)

  for stage = 1, 12 do
    local pathParts = {}
    if stage <= 3 then
      pathParts = { course:WaitForChild(string.format("Step%02dA", stage), 5), course:WaitForChild(string.format("Step%02dB", stage), 5) }
    elseif stage <= 6 then
      pathParts = { course:WaitForChild(string.format("Step%02dA", stage), 5), course:WaitForChild(string.format("Step%02dB", stage), 5), course:WaitForChild(string.format("Step%02dC", stage), 5) }
    elseif stage <= 9 then
      pathParts = { course:WaitForChild(string.format("Step%02dA", stage), 5), course:WaitForChild(string.format("Step%02dB", stage), 5) }
    else
      pathParts = { course:WaitForChild(string.format("Step%02dA", stage), 5), course:WaitForChild(string.format("Step%02dC", stage), 5), course:WaitForChild(string.format("Step%02dB", stage), 5) }
    end

    for index, part in ipairs(pathParts) do
      local reached, value = moveTo(part, stage >= 7 and 7 or 5, nil)
      checkpoint(string.format("stage-%02d-path-%d", stage, index), reached, value)
      if not reached then break end
    end
    if #result.errors > 0 then break end

    local target = course:WaitForChild(string.format("Checkpoint%02d", stage), 5)
    local reached, value = moveTo(target, 7, stage)
    checkpoint(string.format("stage-%02d", stage), reached, value)
    if not reached then break end
  end

  result.final = {
    position = player:GetAttribute("Position"),
    progress = player:GetAttribute("Progress"),
    score = player:GetAttribute("Score"),
    roundTime = player:GetAttribute("RoundTime"),
    finished = player:GetAttribute("Finished"),
    challenge = player:GetAttribute("Challenge"),
    difficultyTier = player:GetAttribute("DifficultyTier"),
  }
  checkpoint("physical-movement", result.movement.distance > 40 and result.movement.jumpPulses > 0 and result.movement.sawAir, result.movement)
  checkpoint("finish", result.final.position == 12 and result.final.progress == 100 and result.final.finished == true, result.final)
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
task.delay(180, function() finish({ authority = ${longBracket(AUTHORITY)}, virtualInput = false, errors = {"obstacle-variety-timeout"}, checkpoints = {} }) end)
`;
}

function bootstrapSource(project, nonce) {
  const resultRemoteName = `__Vibe2ObstacleVariety_${nonce.slice(0, 10)}`;
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
local capture = Instance.new("Script"); capture.Name = "__Vibe2ObstacleVarietyServer"; capture.Source = ${longBracket(capture)}; capture.Parent = ServerScriptService
local harness = Instance.new("LocalScript"); harness.Name = "__Vibe2ObstacleVarietyClient"; harness.Source = ${longBracket(harness)}; harness.Parent = starterScripts

local ok, value = pcall(function() return StudioTestService:ExecutePlayModeAsync("{}") end)
if not ok then error("Vibe2 obstacle-variety Studio run failed: " .. tostring(value)) end
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

export async function runRobloxObstacleVarietySmoke({ projectRoot, studioPath = '', outputFile = '', timeoutMs = 240000, nonce = '' } = {}) {
  const project = readProject(projectRoot);
  const resolvedStudio = findRobloxStudioBinary({ override: studioPath });
  if (!resolvedStudio) throw new Error('RobloxStudioBeta.exe not found');
  const actualNonce = clean(nonce) || Math.random().toString(16).slice(2) + Date.now().toString(16);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-obstacle-variety-'));
  const bootstrapFile = path.join(tempRoot, 'bootstrap.luau');
  const studioOutput = path.join(tempRoot, 'studio-output.log');
  fs.writeFileSync(bootstrapFile, bootstrapSource(project, actualNonce), 'utf8');
  const processResult = await runProcess(resolvedStudio, ['--task', 'RunScript', '--runScriptFile', bootstrapFile, '--outputFile', studioOutput, '--quitAfterExecution'], { cwd: project.root, timeoutMs });
  const output = `${processResult.stdout}\n${processResult.stderr}\n${fs.existsSync(studioOutput) ? fs.readFileSync(studioOutput, 'utf8') : ''}`;
  if (processResult.code !== 0) throw new Error(`Roblox Studio CLI exit ${processResult.code}: ${output.slice(-7000)}`);
  const result = parseMarker(output);
  if (!result) throw new Error(`Roblox obstacle-variety evidence missing: ${output.slice(-7000)}`);
  if (clean(result.nonce) !== actualNonce) throw new Error('Roblox obstacle-variety nonce mismatch');
  const failed = (result.checkpoints || []).filter((item) => item?.pass !== true);
  if (result.virtualInput !== true || failed.length || (result.errors || []).length) throw new Error(`Roblox obstacle-variety verification failed: ${JSON.stringify({ failed, errors: result.errors, final: result.final, movement: result.movement })}`);
  if (Number(result.final?.position) !== 12 || Number(result.final?.progress) !== 100 || result.final?.finished !== true) throw new Error('R4 obstacle course did not finish all 12 stages');
  if (outputFile) { fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true }); fs.writeFileSync(path.resolve(outputFile), `${JSON.stringify(result, null, 2)}\n`, 'utf8'); }
  console.log('VIBE2_ROBLOX_OBSTACLE_VARIETY=PASS');
  console.log(`VIBE2_ROBLOX_R4_STAGE_COUNT=${result.final.position}`);
  console.log(`VIBE2_ROBLOX_R4_ROUND_TIME=${result.final.roundTime}`);
  return result;
}

async function main() {
  const args = argsOf();
  await runRobloxObstacleVarietySmoke({ projectRoot: clean(args['project-root']), studioPath: clean(args.studio) || clean(process.env.VIBE2_ROBLOX_STUDIO_PATH), outputFile: clean(args.output), timeoutMs: Number(args.timeout || 240000), nonce: clean(args.nonce) });
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invoked) main().catch((error) => { console.error(error?.stack || error); process.exit(1); });
