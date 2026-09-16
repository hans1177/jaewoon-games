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
  return `local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal UserInputService = game:GetService("UserInputService")\nlocal Workspace = game:GetService("Workspace")\n\nlocal player = Players.LocalPlayer\nlocal resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)\nlocal virtualInput = UserInputService:CreateVirtualInput()\nlocal result = {\n  version = 1, authority = ${longBracket(AUTHORITY)}, runtimeVerified = true,\n  virtualInput = virtualInput ~= nil, stageCount = ${stageCount}, checkpoints = {}, errors = {},\n  final = {}, movement = { distance = 0, sawAir = false, jumpPulses = 0 },\n}\n\nlocal function checkpoint(name, pass, value)\n  table.insert(result.checkpoints, { name = name, pass = pass == true, value = value })\n  if not pass then table.insert(result.errors, name) end\n  return pass\nend\n\nlocal function characterReady(timeout)\n  local deadline = os.clock() + (timeout or 10)\n  while os.clock() < deadline do\n    local character = player.Character\n    local root = character and character:FindFirstChild("HumanoidRootPart")\n    local humanoid = character and character:FindFirstChildOfClass("Humanoid")\n    if root and humanoid and humanoid.Health > 0 then return character, root, humanoid end\n    task.wait(0.05)\n  end\n  return nil, nil, nil\nend\n\nlocal function waitAttribute(name, expected, timeout)\n  local deadline = os.clock() + (timeout or 6)\n  while os.clock() < deadline do\n    if player:GetAttribute(name) == expected then return true end\n    task.wait(0.05)\n  end\n  return false\nend\n\nlocal function moveToPart(part, expectedStage, timeout)\n  local _, root, humanoid = characterReady(8)\n  if not root then return false, "character-missing" end\n  local camera = Workspace.CurrentCamera\n  local start = root.Position\n  local deadline = os.clock() + (timeout or 7)\n  local nextJump = os.clock()\n  virtualInput:SendKey(true, Enum.KeyCode.W, false)\n  while os.clock() < deadline do\n    if player:GetAttribute("Position") == expectedStage then break end\n    if not root.Parent or humanoid.Health <= 0 then break end\n    local target = Vector3.new(part.Position.X, root.Position.Y, part.Position.Z)\n    if camera then\n      camera.CameraType = Enum.CameraType.Scriptable\n      camera.CFrame = CFrame.lookAt(root.Position + Vector3.new(0, 5, 0), target)\n    end\n    if humanoid.FloorMaterial == Enum.Material.Air then result.movement.sawAir = true end\n    if os.clock() >= nextJump then\n      virtualInput:SendKey(true, Enum.KeyCode.Space, false)\n      task.wait(0.06)\n      virtualInput:SendKey(false, Enum.KeyCode.Space, false)\n      result.movement.jumpPulses += 1\n      nextJump = os.clock() + 0.35\n    end\n    task.wait(0.04)\n  end\n  virtualInput:SendKey(false, Enum.KeyCode.W, false)\n  if root.Parent then result.movement.distance += (root.Position - start).Magnitude end\n  return player:GetAttribute("Position") == expectedStage, player:GetAttribute("Position")\nend\n\nlocal ok, err = pcall(function()\n  local course = Workspace:WaitForChild("Vibe2SkylineSprintCourse", 12)\n  assert(course, "course-missing")\n  checkpoint("course-present", course ~= nil, course and course.Name)\n  local _, root = characterReady(10)\n  assert(root, "character-missing")\n\n  local checkpoint02 = course:WaitForChild("Checkpoint02", 5)\n  root.CFrame = checkpoint02.CFrame + Vector3.new(0, 4, 0)\n  task.wait(0.8)\n  checkpoint("skip-rejected", (player:GetAttribute("Position") or 0) == 0, player:GetAttribute("Position"))\n\n  local start = course:WaitForChild("CourseStart", 5)\n  root.CFrame = start.CFrame + Vector3.new(0, 4, 0)\n  checkpoint("round-started", waitAttribute("LastApprovedScope", "physical-course-started", 4), player:GetAttribute("LastApprovedScope"))\n\n  for stage = 1, ${stageCount} do\n    local target = course:WaitForChild(string.format("Checkpoint%02d", stage), 5)\n    local reached, value = moveToPart(target, stage, 8)\n    checkpoint(string.format("stage-%02d", stage), reached, value)\n    if not reached then break end\n\n    if stage == 3 then\n      local oldCharacter = player.Character\n      local hazard = course:WaitForChild("Hazard03", 5)\n      local oldRoot = oldCharacter and oldCharacter:FindFirstChild("HumanoidRootPart")\n      if oldRoot then oldRoot.CFrame = hazard.CFrame + Vector3.new(0, 2, 0) end\n      local respawnDeadline = os.clock() + 8\n      while os.clock() < respawnDeadline and player.Character == oldCharacter do task.wait(0.05) end\n      local _, respawnRoot = characterReady(8)\n      local saved = player:GetAttribute("Position") == 3\n      local near = respawnRoot and (respawnRoot.Position - target.Position).Magnitude < 12\n      checkpoint("hazard-death-respawn", player.Character ~= oldCharacter and saved and near, { stage = player:GetAttribute("Position"), near = near })\n    elseif stage == 4 then\n      local before = player:GetAttribute("Position")\n      local gameAction = ReplicatedStorage:WaitForChild("GameAction", 5)\n      gameAction:FireServer("advance")\n      task.wait(0.4)\n      checkpoint("remote-cannot-progress", player:GetAttribute("Position") == before, player:GetAttribute("Position"))\n    end\n  end\n\n  result.final = {\n    position = player:GetAttribute("Position"), progress = player:GetAttribute("Progress"),\n    score = player:GetAttribute("Score"), roundTime = player:GetAttribute("RoundTime"),\n    finished = player:GetAttribute("Finished"),\n  }\n  checkpoint("physical-movement", result.movement.distance > 20, result.movement.distance)\n  checkpoint("jump-input", result.movement.jumpPulses > 0 and result.movement.sawAir, result.movement)\n  checkpoint("finish", result.final.position == ${stageCount} and result.final.progress == 100 and result.final.finished == true, result.final)\n  checkpoint("round-time", tonumber(result.final.roundTime or 0) > 0, result.final.roundTime)\nend)\nif not ok then\n  result.runtimeVerified = false\n  table.insert(result.errors, tostring(err))\nend\nresultRemote:FireServer(result)\n`;
}

function serverCaptureSource(resultRemoteName, nonce) {
  return `local StudioTestService = game:GetService("StudioTestService")\nlocal HttpService = game:GetService("HttpService")\nlocal EncodingService = game:GetService("EncodingService")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal resultRemote = ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)}, 15)\nlocal finished = false\nlocal function finish(result)\n  if finished then return end\n  finished = true\n  result.nonce = ${longBracket(nonce)}\n  local json = HttpService:JSONEncode(result)\n  local encoded = EncodingService:Base64Encode(buffer.fromstring(json))\n  StudioTestService:EndTest(${longBracket(MARKER)} .. buffer.tostring(encoded))\nend\nresultRemote.OnServerEvent:Connect(function(_, result)\n  if type(result) ~= "table" then return end\n  if tostring(result.authority or "") ~= ${longBracket(AUTHORITY)} then return end\n  finish(result)\nend)\ntask.delay(100, function()\n  finish({ version = 1, authority = ${longBracket(AUTHORITY)}, runtimeVerified = false, virtualInput = false, errors = {"project-runtime-timeout"}, checkpoints = {} })\nend)\n`;
}

function bootstrapSource(project, nonce, stageCount) {
  const resultRemoteName = `__Vibe2ProjectRuntime_${nonce.slice(0, 12)}`;
  const harness = clientHarnessSource(resultRemoteName, stageCount);
  const capture = serverCaptureSource(resultRemoteName, nonce);
  return `local StudioTestService = game:GetService("StudioTestService")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ServerScriptService = game:GetService("ServerScriptService")\nlocal StarterPlayer = game:GetService("StarterPlayer")\nlocal Workspace = game:GetService("Workspace")\n\nfor _, child in ipairs(Workspace:GetChildren()) do\n  if child:IsA("BasePart") or child:IsA("SpawnLocation") then child:Destroy() end\nend\n\nlocal function resetNamed(parent, name)\n  local old = parent:FindFirstChild(name)\n  if old then old:Destroy() end\nend\nlocal function folder(parent, name)\n  resetNamed(parent, name)\n  local value = Instance.new("Folder")\n  value.Name = name\n  value.Parent = parent\n  return value\nend\n\nlocal shared = folder(ReplicatedStorage, "Shared")\nlocal config = Instance.new("ModuleScript")\nconfig.Name = "GameConfig"\nconfig.Source = ${longBracket(project.config)}\nconfig.Parent = shared\n\nlocal serverFolder = folder(ServerScriptService, "GameServer")\nlocal gameServer = Instance.new("Script")\ngameServer.Name = "Game"\ngameServer.Source = ${longBracket(project.server)}\ngameServer.Parent = serverFolder\n\nlocal starterScripts = StarterPlayer:WaitForChild("StarterPlayerScripts")\nlocal clientFolder = folder(starterScripts, "GameClient")\nlocal gameClient = Instance.new("LocalScript")\ngameClient.Name = "Game"\ngameClient.Source = ${longBracket(project.client)}\ngameClient.Parent = clientFolder\n\nresetNamed(ReplicatedStorage, ${longBracket(resultRemoteName)})\nlocal resultRemote = Instance.new("RemoteEvent")\nresultRemote.Name = ${longBracket(resultRemoteName)}\nresultRemote.Parent = ReplicatedStorage\n\nlocal capture = Instance.new("Script")\ncapture.Name = "__Vibe2ProjectRuntimeServer"\ncapture.Source = ${longBracket(capture)}\ncapture.Parent = ServerScriptService\nlocal harness = Instance.new("LocalScript")\nharness.Name = "__Vibe2ProjectRuntimeClient"\nharness.Source = ${longBracket(harness)}\nharness.Parent = starterScripts\n\nlocal ok, value = pcall(function() return StudioTestService:ExecutePlayModeAsync("{}") end)\nif not ok then error("Vibe2 project runtime failed: " .. tostring(value)) end\nprint(tostring(value))\n`;
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
    throw new Error(`Roblox project runtime verification failed: ${JSON.stringify({ failed, errors: result.errors, final: result.final })}`);
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
