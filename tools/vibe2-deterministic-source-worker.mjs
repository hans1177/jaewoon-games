// 파일명: tools/vibe2-deterministic-source-worker.mjs
// 역할: 플랫폼 결정 후 recipe가 확정된 소스 작업을 AI 호출 없이 격리 candidate 브랜치에 적용한다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'task';
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function currentBranch(cwd){try{return clean(execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],{cwd,encoding:'utf8'}));}catch{return'';}}
function assertCandidateBranch(cwd){const branch=currentBranch(cwd);if(!branch||branch==='main'||branch==='master'||!branch.startsWith('vibe2/candidate/'))throw new Error(`deterministic source 적용은 vibe2/candidate/* 브랜치에서만 허용: ${branch||'unknown'}`);return branch;}
function normalizeResponsibleFiles(order,sourceRoot){
  const rows=Array.isArray(order?.source?.responsibleFiles)?order.source.responsibleFiles:[];
  return rows.map(value=>{const file=posix(value);return file.startsWith(`${sourceRoot}/`)?file.slice(sourceRoot.length+1):file;}).filter(Boolean);
}
function assertInsideSource(relative){
  const file=posix(relative);
  if(!file||file.startsWith('/')||file.split('/').includes('..'))throw new Error(`잘못된 deterministic 책임 경로: ${relative}`);
  return file;
}

function robloxObbyWorldCoreSource(){return `local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then
  remote:Destroy()
  remote = nil
end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

local COURSE_NAME = "Vibe2SkylineSprintCourse"
local STAGE_COUNT = 12
local FALL_Y = -12
local START_POSITION = Vector3.new(0, 7, 0)

local oldCourse = Workspace:FindFirstChild(COURSE_NAME)
if oldCourse then oldCourse:Destroy() end

local course = Instance.new("Model")
course.Name = COURSE_NAME
course.Parent = Workspace

local function makePart(name, size, cframe, color, parent)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.CFrame = cframe
  part.Anchored = true
  part.CanCollide = true
  part.CanTouch = true
  part.Material = Enum.Material.SmoothPlastic
  part.Color = color
  part.Parent = parent or course
  return part
end

local startSpawn = Instance.new("SpawnLocation")
startSpawn.Name = "CourseStart"
startSpawn.Size = Vector3.new(18, 1, 18)
startSpawn.CFrame = CFrame.new(START_POSITION)
startSpawn.Anchored = true
startSpawn.Neutral = true
startSpawn.CanCollide = true
startSpawn.CanTouch = true
startSpawn.Material = Enum.Material.Neon
startSpawn.Color = Color3.fromRGB(80, 220, 120)
startSpawn.Parent = course

local checkpointCFrames = {[0] = startSpawn.CFrame + Vector3.new(0, 4, 0)}
local checkpoints = {}
local hazards = {}
local previousPosition = START_POSITION

for stage = 1, STAGE_COUNT do
  local x = stage * 30
  local z = (stage % 2 == 0) and 14 or -14
  local y = 8 + math.floor((stage - 1) / 4) * 5
  local checkpointPosition = Vector3.new(x, y, z)
  local segment = checkpointPosition - previousPosition
  local stepAPosition = previousPosition + segment * (1 / 3)
  local stepBPosition = previousPosition + segment * (2 / 3)

  makePart(
    string.format("Step%02dA", stage),
    Vector3.new(8, 1, 8),
    CFrame.new(stepAPosition),
    Color3.fromRGB(195, 205, 220)
  )
  makePart(
    string.format("Step%02dB", stage),
    Vector3.new(8, 1, 8),
    CFrame.new(stepBPosition),
    Color3.fromRGB(165, 180, 205)
  )

  local checkpoint = makePart(
    string.format("Checkpoint%02d", stage),
    Vector3.new(14, 1, 14),
    CFrame.new(checkpointPosition),
    stage == STAGE_COUNT and Color3.fromRGB(255, 220, 70) or Color3.fromRGB(70, 170, 255)
  )
  checkpoint:SetAttribute("Stage", stage)
  checkpoints[stage] = checkpoint
  checkpointCFrames[stage] = checkpoint.CFrame + Vector3.new(0, 4, 0)

  local hazardPosition = previousPosition + segment * 0.5 + Vector3.new(0, -4, 0)
  local hazard = makePart(
    string.format("Hazard%02d", stage),
    Vector3.new(8, 1, 8),
    CFrame.new(hazardPosition),
    Color3.fromRGB(235, 70, 70)
  )
  hazard.Material = Enum.Material.Neon
  table.insert(hazards, hazard)

  previousPosition = checkpointPosition
end

local killFloor = makePart(
  "KillFloor",
  Vector3.new(STAGE_COUNT * 34 + 80, 2, 120),
  CFrame.new(STAGE_COUNT * 15, -18, 0),
  Color3.fromRGB(220, 55, 55)
)
killFloor.Material = Enum.Material.Neon
table.insert(hazards, killFloor)

local stateByPlayer = {}

local function playerFromHit(hit)
  if not hit then return nil end
  local character = hit:FindFirstAncestorOfClass("Model")
  if not character then return nil end
  return Players:GetPlayerFromCharacter(character)
end

local function initializeAttributes(player)
  for key, value in pairs(Config.InitialState) do
    player:SetAttribute(key, value)
  end
  player:SetAttribute("RoundTime", 0)
  player:SetAttribute("Finished", false)
  player:SetAttribute("LastApprovedScope", "physical-course-ready")
end

local function freshState(player)
  stateByPlayer[player] = {
    stage = 0,
    started = false,
    roundStartedAt = nil,
    finished = false,
  }
  initializeAttributes(player)
end

local function teleportToSavedCheckpoint(player, character)
  local state = stateByPlayer[player]
  if not state then return end
  local root = character:WaitForChild("HumanoidRootPart", 8)
  if not root then return end
  task.defer(function()
    if root.Parent then
      root.CFrame = checkpointCFrames[state.stage] or checkpointCFrames[0]
    end
  end)
end

local function startRound(player)
  local state = stateByPlayer[player]
  if not state or state.finished or state.started then return end
  state.started = true
  state.roundStartedAt = os.clock()
  player:SetAttribute("LastApprovedScope", "physical-course-started")
end

local function acceptCheckpoint(player, stage)
  local state = stateByPlayer[player]
  if not state or not state.started or state.finished then return end
  if stage ~= state.stage + 1 then return end

  state.stage = stage
  player:SetAttribute("Position", stage)
  player:SetAttribute("Progress", math.floor(stage / STAGE_COUNT * 100))
  player:SetAttribute("Score", stage * 100)
  player:SetAttribute("LastApprovedScope", string.format("physical-checkpoint-%02d", stage))

  if stage == STAGE_COUNT then
    state.finished = true
    local elapsed = math.max(0, os.clock() - (state.roundStartedAt or os.clock()))
    player:SetAttribute("RoundTime", math.floor(elapsed * 100) / 100)
    player:SetAttribute("Finished", true)
    player:SetAttribute("LastApprovedScope", "physical-course-finished")
  end
end

startSpawn.Touched:Connect(function(hit)
  local player = playerFromHit(hit)
  if player then startRound(player) end
end)

for stage, checkpoint in ipairs(checkpoints) do
  checkpoint.Touched:Connect(function(hit)
    local player = playerFromHit(hit)
    if player then acceptCheckpoint(player, stage) end
  end)
end

local function eliminateFromHazard(hit)
  local character = hit and hit:FindFirstAncestorOfClass("Model")
  local player = character and Players:GetPlayerFromCharacter(character)
  if not player then return end
  local humanoid = character:FindFirstChildOfClass("Humanoid")
  if humanoid and humanoid.Health > 0 then humanoid.Health = 0 end
end

for _, hazard in ipairs(hazards) do
  hazard.Touched:Connect(eliminateFromHazard)
end

local function bindPlayer(player)
  freshState(player)
  player.CharacterAdded:Connect(function(character)
    teleportToSavedCheckpoint(player, character)
  end)
  if player.Character then teleportToSavedCheckpoint(player, player.Character) end
end

Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(bindPlayer, player)
end

Players.PlayerRemoving:Connect(function(player)
  stateByPlayer[player] = nil
end)

-- Preserve the existing Config.RemoteName/RemoteEvent interface, but never accept
-- client button messages as authoritative course progress.
remote.OnServerEvent:Connect(function(_player, _actionId)
  return
end)

task.spawn(function()
  while true do
    task.wait(0.25)
    local now = os.clock()
    for player, state in pairs(stateByPlayer) do
      if state.started and not state.finished and state.roundStartedAt then
        player:SetAttribute("RoundTime", math.floor((now - state.roundStartedAt) * 10) / 10)
      end
      local character = player.Character
      local root = character and character:FindFirstChild("HumanoidRootPart")
      local humanoid = character and character:FindFirstChildOfClass("Humanoid")
      if root and humanoid and humanoid.Health > 0 and root.Position.Y < FALL_Y then
        humanoid.Health = 0
      end
    end
  end
end)
`}

const RECIPES=Object.freeze({
  'roblox-obby-world-core-v1':{
    target:'roblox',
    file:'server/Game.server.luau',
    build:robloxObbyWorldCoreSource,
    tests:['12-sequential-physical-checkpoints','physically-connected-default-jump-course','hazard-death-checkpoint-respawn','server-authoritative-progress','per-player-isolation','finish-and-round-time','remote-name-preserved-no-button-progress']
  }
});

export function runVibe2DeterministicSourceWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order.json',outputRoot='.vibe2/candidates',applySource=false}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));
  if(!order?.run||order?.workMode!=='source-change-candidate')throw new Error('실행 가능한 source-change work order 필요');
  if(order?.workerPolicy?.directMainWrite!==false)throw new Error('directMainWrite 정책 위반');
  const recipeId=clean(order?.developmentExecution?.recipe);
  const recipe=RECIPES[recipeId];
  if(!recipe)throw new Error(`지원하지 않는 deterministic recipe: ${recipeId||'NONE'}`);
  const target=clean(order.target).toLowerCase();
  if(target!==recipe.target)throw new Error(`recipe target 불일치: ${target}`);
  const sourceRootRelative=posix(order?.source?.root);
  if(!sourceRootRelative||sourceRootRelative.includes('..'))throw new Error(`잘못된 source root: ${sourceRootRelative}`);
  const sourceRoot=path.resolve(cwd,sourceRootRelative);
  if(!fs.existsSync(sourceRoot)||!fs.statSync(sourceRoot).isDirectory())throw new Error(`source root 없음: ${sourceRootRelative}`);
  const responsibleFiles=normalizeResponsibleFiles(order,sourceRootRelative).map(assertInsideSource);
  if(responsibleFiles.length!==1||responsibleFiles[0]!==recipe.file)throw new Error(`recipe 책임 파일 불일치: ${responsibleFiles.join(',')||'NONE'}`);
  const relative=responsibleFiles[0],absolute=path.join(sourceRoot,relative);
  if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())throw new Error(`deterministic 대상 파일 없음: ${relative}`);
  const content=recipe.build(order);
  if(Buffer.byteLength(content,'utf8')<1200)throw new Error('deterministic replacement가 비정상적으로 짧음');

  const taskId=safeId(order.taskId),candidateRoot=path.resolve(cwd,outputRoot,taskId);
  fs.rmSync(candidateRoot,{recursive:true,force:true});
  fs.mkdirSync(candidateRoot,{recursive:true});
  let branch=null;
  if(applySource){
    branch=assertCandidateBranch(cwd);
    fs.writeFileSync(absolute,content.endsWith('\n')?content:`${content}\n`,'utf8');
  }else{
    const targetFile=path.join(candidateRoot,'files',relative);
    fs.mkdirSync(path.dirname(targetFile),{recursive:true});
    fs.writeFileSync(targetFile,content.endsWith('\n')?content:`${content}\n`,'utf8');
  }
  const exploration=order?.exploration||readJson(path.resolve(cwd,process.env.VIBE2_EXPLORATION_FILE||'.vibe2/exploration.json'));
  const changedFiles=[relative];
  const candidate={summary:'Deterministic Roblox physical obby world core rebuild',expectedEffect:'12-stage server-authoritative physically connected obby without button-driven progression',edits:[],newFiles:[],replaceFiles:[{path:relative,content}],tests:recipe.tests};
  const manifest={
    version:6,taskId:order.taskId,gameId:order.gameId||null,target,sourceRoot:sourceRootRelative,
    releaseState:clean(order.releaseState)||'other',priority:clean(order.priority)||'normal',baseMainSha:clean(process.env.VIBE2_BASE_MAIN_SHA)||null,
    goal:order.goal,generatedAt:new Date().toISOString(),mode:applySource?'isolated-candidate-branch-source-write':'candidate-snapshot-only',branch,
    model:null,aiUsed:false,implementationExecutor:'deterministic-source-worker',deterministicRecipe:recipeId,changedFiles,
    summary:candidate.summary,expectedEffect:candidate.expectedEffect,tests:candidate.tests,exploration,
    codeIntelligence:{version:1,deterministicRecipe:{id:recipeId,verified:true},repairLoop:{enabled:false,maxAttempts:0,attemptsUsed:0,repaired:false,history:[]}},
    roleResults:{exploration:'PASS',implementation:'PASS',test:'WAITING_INCREMENTAL_QA',performance:'WAITING_SANITY',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    designIntelligence:order.designIntelligence||null,designEvidence:{autoPlayer:{status:'WAITING_EVIDENCE',verified:false},telemetry:{status:'WAITING_EVIDENCE',verified:false},designReview:{status:'WAITING_EVIDENCE',verified:false,decision:null},qa:{status:'WAITING_EVIDENCE',verified:false}},
    fullFileRewriteAllowed:true,protectedGameplayMutationAutomatic:false,binaryAssetsDirectTextEditForbidden:true,directMainWrite:false,verifiedBeforePromotion:false
  };
  writeJson(path.join(candidateRoot,'manifest.json'),manifest);
  writeJson(path.join(candidateRoot,'candidate.json'),candidate);
  return manifest;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=runVibe2DeterministicSourceWorker({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputRoot:clean(args.output)||'.vibe2/candidates',applySource:String(args['apply-source']||'').toLowerCase()==='true'});
  console.log('VIBE2_DETERMINISTIC_SOURCE_WORKER=PASS');
  console.log(`VIBE2_TASK_ID=${result.taskId}`);
  console.log(`VIBE2_TARGET=${result.target}`);
  console.log(`VIBE2_AI_USED=${result.aiUsed?'YES':'NO'}`);
  console.log(`VIBE2_DETERMINISTIC_RECIPE=${result.deterministicRecipe}`);
  console.log(`VIBE2_CHANGED_FILES=${result.changedFiles.join(',')}`);
}
