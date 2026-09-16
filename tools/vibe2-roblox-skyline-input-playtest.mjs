import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findRobloxStudioBinary } from './vibe2-roblox-studio-cli-runner.mjs';

const MARKER='VIBE2_ROBLOX_SKYLINE_PLAYTEST_JSON=';
const AUTHORITY='vibe2-roblox-skyline-input-playtest';
const clean=value=>String(value??'').trim();

function argsOf(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function longBracket(value){const text=String(value);for(let n=0;n<12;n+=1){const eq='='.repeat(n);if(!text.includes(`]${eq}]`))return`[${eq}[${text}]${eq}]`;}throw new Error('unable to encode Luau long string safely');}
function runProcess(command,args,{cwd=process.cwd(),timeoutMs=300000}={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:false});let stdout='',stderr='',settled=false;const timer=setTimeout(()=>{try{child.kill('SIGKILL');}catch{}if(!settled){settled=true;reject(new Error(`Roblox Skyline input playtest timeout: ${timeoutMs}ms`));}},Math.max(30000,Number(timeoutMs)||300000));child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',chunk=>{if(stdout.length<900000)stdout+=chunk;});child.stderr.on('data',chunk=>{if(stderr.length<900000)stderr+=chunk;});child.on('error',error=>{if(!settled){settled=true;clearTimeout(timer);reject(error);}});child.on('close',code=>{if(!settled){settled=true;clearTimeout(timer);resolve({code,stdout,stderr});}});});}
function readProject(projectRoot){const root=path.resolve(projectRoot);const files={config:path.join(root,'shared','GameConfig.luau'),server:path.join(root,'server','Game.server.luau'),client:path.join(root,'client','Game.client.luau'),project:path.join(root,'default.project.json')};for(const file of Object.values(files))if(!fs.existsSync(file))throw new Error(`missing Roblox project file: ${file}`);return{root,config:fs.readFileSync(files.config,'utf8'),server:fs.readFileSync(files.server,'utf8'),client:fs.readFileSync(files.client,'utf8')};}

function clientHarnessSource(resultRemoteName){return `local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local Workspace=game:GetService("Workspace")
local UserInputService=game:GetService("UserInputService")
local player=Players.LocalPlayer
local resultRemote=ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)},15)
local result={version=1,authority=${longBracket(AUTHORITY)},runtimeVerified=true,inputBased=true,inputProfile="keyboard-default-movement",capabilities={studioTestService=true,virtualInput=false},stages={},checkpoints={},errors={},metrics={inputActions=0,jumpCount=0,deaths=0,retries=0,stalledMs=0,durationMs=0},final={}}
local startedAt=os.clock()
local function checkpoint(name,pass,value)table.insert(result.checkpoints,{name=name,pass=pass==true,value=value});if not pass then table.insert(result.errors,name) end end
local function waitFor(predicate,timeout)local deadline=os.clock()+(timeout or 6);while os.clock()<deadline do local ok,value=pcall(predicate);if ok and value then return true end;task.wait(0.05)end;return false end
local function characterReady(timeout)local deadline=os.clock()+(timeout or 10);while os.clock()<deadline do local c=player.Character;local r=c and c:FindFirstChild("HumanoidRootPart");local h=c and c:FindFirstChildOfClass("Humanoid");if r and h and h.Health>0 then return c,r,h end;task.wait(0.05)end;return nil,nil,nil end
local virtualInput=UserInputService:CreateVirtualInput();assert(virtualInput,"virtual-input-unavailable");result.capabilities.virtualInput=true
local function sendKey(code,down)virtualInput:SendKey(down,code,false);result.metrics.inputActions+=1 end
local function pulseJump()sendKey(Enum.KeyCode.Space,true);task.wait(0.045);sendKey(Enum.KeyCode.Space,false);result.metrics.jumpCount+=1 end
local function horizontalDistance(a,b)local dx=a.X-b.X;local dz=a.Z-b.Z;return math.sqrt(dx*dx+dz*dz) end
local function stageRoute(course,stage)
  local rows={}
  for _,item in ipairs(course:GetDescendants()) do
    if item:IsA("BasePart") and item:GetAttribute("Stage")==stage and item:GetAttribute("ObstacleRole")=="Platform" and string.match(item.Name,"^Step%d%d") then table.insert(rows,item) end
  end
  table.sort(rows,function(a,b)return a.Name<b.Name end)
  local checkpointPart=course:FindFirstChild(string.format("Checkpoint%02d",stage))
  if checkpointPart then table.insert(rows,checkpointPart) end
  return rows
end
local function faceTarget(root,target)
  local camera=Workspace.CurrentCamera;if not camera then return end
  camera.CameraType=Enum.CameraType.Scriptable
  local origin=root.Position+Vector3.new(0,3,0);local look=Vector3.new(target.Position.X,origin.Y,target.Position.Z)
  if (look-origin).Magnitude>0.1 then camera.CFrame=CFrame.lookAt(origin,look) end
end
local function moveToPart(target,stageMetric,timeout)
  local deadline=os.clock()+(timeout or 6);local lastJump=0;local lastPos=nil;local stalledSince=nil
  sendKey(Enum.KeyCode.W,true)
  while os.clock()<deadline do
    local _,root,humanoid=characterReady(1)
    if not root or not humanoid then sendKey(Enum.KeyCode.W,false);return false,"dead" end
    faceTarget(root,target)
    local hdist=horizontalDistance(root.Position,target.Position);local vdist=math.abs(root.Position.Y-target.Position.Y)
    if hdist<3.4 and vdist<6.5 then sendKey(Enum.KeyCode.W,false);return true,"reached" end
    local now=os.clock()
    if now-lastJump>0.42 and (hdist>4.0 or target.Position.Y-root.Position.Y>1.5) then pulseJump();lastJump=now end
    if lastPos then
      local moved=(root.Position-lastPos).Magnitude
      if moved<0.12 then
        stalledSince=stalledSince or now
      elseif stalledSince then
        local stalled=math.max(0,(now-stalledSince)*1000);stageMetric.stalledMs+=stalled;result.metrics.stalledMs+=stalled;stalledSince=nil
      end
    end
    lastPos=root.Position
    task.wait(0.12)
  end
  sendKey(Enum.KeyCode.W,false)
  return false,"timeout"
end
local function waitRespawn(previousCharacter,timeout)
  local ok=waitFor(function()local c=player.Character;local h=c and c:FindFirstChildOfClass("Humanoid");local r=c and c:FindFirstChild("HumanoidRootPart");return c and c~=previousCharacter and h and h.Health>0 and r end,timeout or 10)
  return ok
end
local ok,err=pcall(function()
  local course=Workspace:WaitForChild("Vibe2SkylineSprintCourse",12);assert(course,"course-missing")
  local start=course:WaitForChild("CourseStart",5);local _,root=characterReady(10);assert(root,"character-missing")
  checkpoint("no-teleport-traversal",true,"VirtualInput-only stage traversal")
  local roundStarted=waitFor(function()return player:GetAttribute("LastApprovedScope")=="physical-course-started" end,3)
  if not roundStarted then
    faceTarget(root,start);sendKey(Enum.KeyCode.W,true);task.wait(0.35);sendKey(Enum.KeyCode.W,false)
    roundStarted=waitFor(function()return player:GetAttribute("LastApprovedScope")=="physical-course-started" end,3)
  end
  checkpoint("round-1-start",roundStarted,player:GetAttribute("LastApprovedScope"))
  for stage=1,12 do
    local stageStarted=os.clock();local metric={stage=stage,elapsedMs=0,retries=0,deaths=0,jumpCountStart=result.metrics.jumpCount,inputActionsStart=result.metrics.inputActions,stalledMs=0,success=false,failedTarget=nil}
    local attempts=0
    while attempts<3 and player:GetAttribute("Position")<stage do
      attempts+=1
      local route=stageRoute(course,stage);assert(#route>=1,"stage-route-empty-"..stage)
      local failed=false
      for _,target in ipairs(route) do
        local character=player.Character
        local reached,reason=moveToPart(target,metric,target:GetAttribute("ObstacleType") and 7.5 or 6.0)
        if not reached then
          metric.failedTarget=target.Name..":"..reason
          local humanoid=character and character:FindFirstChildOfClass("Humanoid")
          if (not humanoid) or humanoid.Health<=0 or reason=="dead" then
            metric.deaths+=1;result.metrics.deaths+=1
            waitRespawn(character,10)
          end
          metric.retries+=1;result.metrics.retries+=1;failed=true;break
        end
      end
      if not failed then waitFor(function()return player:GetAttribute("Position")>=stage end,2) end
    end
    metric.elapsedMs=math.floor((os.clock()-stageStarted)*1000)
    metric.jumpCount=result.metrics.jumpCount-metric.jumpCountStart
    metric.inputActions=result.metrics.inputActions-metric.inputActionsStart
    metric.success=player:GetAttribute("Position")>=stage
    table.insert(result.stages,metric)
    checkpoint(string.format("physical-stage-%02d",stage),metric.success,metric)
    if not metric.success then break end
  end
  local finished=player:GetAttribute("Finished")==true and player:GetAttribute("Position")==12
  checkpoint("physical-round-1-finished",finished,{position=player:GetAttribute("Position"),roundTime=player:GetAttribute("RoundTime")})
  local restarted=waitFor(function()return player:GetAttribute("Round")==2 and player:GetAttribute("Position")==0 and player:GetAttribute("Finished")==false and player:GetAttribute("Restarting")==false end,8)
  checkpoint("round-2-reset",restarted,{round=player:GetAttribute("Round"),position=player:GetAttribute("Position"),finished=player:GetAttribute("Finished"),restarting=player:GetAttribute("Restarting")})
  result.final={round=player:GetAttribute("Round"),position=player:GetAttribute("Position"),progress=player:GetAttribute("Progress"),score=player:GetAttribute("Score"),finished=player:GetAttribute("Finished"),restarting=player:GetAttribute("Restarting"),roundTime=player:GetAttribute("RoundTime")}
end)
if not ok then table.insert(result.errors,tostring(err)) end
result.metrics.durationMs=math.floor((os.clock()-startedAt)*1000)
resultRemote:FireServer(result)
`;}

function serverCaptureSource(resultRemoteName,nonce){return `local StudioTestService=game:GetService("StudioTestService")
local HttpService=game:GetService("HttpService")
local EncodingService=game:GetService("EncodingService")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local resultRemote=ReplicatedStorage:WaitForChild(${longBracket(resultRemoteName)},15)
local finished=false
local function finish(result)if finished then return end;finished=true;result.nonce=${longBracket(nonce)};local json=HttpService:JSONEncode(result);local encoded=EncodingService:Base64Encode(buffer.fromstring(json));StudioTestService:EndTest(${longBracket(MARKER)}..buffer.tostring(encoded)) end
resultRemote.OnServerEvent:Connect(function(_,result)if type(result)~="table" or tostring(result.authority or "")~=${longBracket(AUTHORITY)} then return end;finish(result)end)
task.delay(210,function()finish({authority=${longBracket(AUTHORITY)},runtimeVerified=false,inputBased=true,errors={"skyline-input-playtest-timeout"},checkpoints={},stages={},metrics={}})end)
`;}
function bootstrapSource(project,nonce){const resultRemoteName=`__Vibe2SkylineInput_${nonce.slice(0,12)}`,harness=clientHarnessSource(resultRemoteName),capture=serverCaptureSource(resultRemoteName,nonce);return `local StudioTestService=game:GetService("StudioTestService")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local ServerScriptService=game:GetService("ServerScriptService")
local StarterPlayer=game:GetService("StarterPlayer")
local Workspace=game:GetService("Workspace")
for _,child in ipairs(Workspace:GetChildren()) do if child~=Workspace.Terrain and child:IsA("BasePart") then child:Destroy() end end
local function resetNamed(parent,name)local old=parent:FindFirstChild(name);if old then old:Destroy() end end
local function folder(parent,name)resetNamed(parent,name);local value=Instance.new("Folder");value.Name=name;value.Parent=parent;return value end
local shared=folder(ReplicatedStorage,"Shared");local config=Instance.new("ModuleScript");config.Name="GameConfig";config.Source=${longBracket(project.config)};config.Parent=shared
local serverFolder=folder(ServerScriptService,"GameServer");local gameServer=Instance.new("Script");gameServer.Name="Game";gameServer.Source=${longBracket(project.server)};gameServer.Parent=serverFolder
local starterScripts=StarterPlayer:WaitForChild("StarterPlayerScripts");local clientFolder=folder(starterScripts,"GameClient");local gameClient=Instance.new("LocalScript");gameClient.Name="Game";gameClient.Source=${longBracket(project.client)};gameClient.Parent=clientFolder
resetNamed(ReplicatedStorage,${longBracket(resultRemoteName)});local resultRemote=Instance.new("RemoteEvent");resultRemote.Name=${longBracket(resultRemoteName)};resultRemote.Parent=ReplicatedStorage
local capture=Instance.new("Script");capture.Name="__Vibe2SkylineInputServer";capture.Source=${longBracket(capture)};capture.Parent=ServerScriptService
local harness=Instance.new("LocalScript");harness.Name="__Vibe2SkylineInputClient";harness.Source=${longBracket(harness)};harness.Parent=starterScripts
local ok,value=pcall(function()return StudioTestService:ExecutePlayModeAsync("{}")end);if not ok then error("Vibe2 Skyline input playtest failed: "..tostring(value)) end;print(tostring(value))
`;}
function parseMarker(output){for(const row of String(output||'').split(/\r?\n/).reverse()){const at=row.indexOf(MARKER);if(at<0)continue;const encoded=row.slice(at+MARKER.length).trim().match(/^([A-Za-z0-9+/]{16,}={0,2})/)?.[1];if(!encoded)continue;try{return JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));}catch{}}return null;}

export async function runRobloxSkylineInputPlaytest({projectRoot,studioPath='',outputFile='',timeoutMs=300000,nonce='',requireComplete=true}={}){
  const project=readProject(projectRoot),resolvedStudio=findRobloxStudioBinary({override:studioPath});if(!resolvedStudio)throw new Error('RobloxStudioBeta.exe not found');
  const actualNonce=clean(nonce)||Math.random().toString(16).slice(2)+Date.now().toString(16),tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-roblox-skyline-input-')),bootstrapFile=path.join(tempRoot,'bootstrap.luau'),studioOutput=path.join(tempRoot,'studio-output.log');
  fs.writeFileSync(bootstrapFile,bootstrapSource(project,actualNonce),'utf8');
  try{
    const processResult=await runProcess(resolvedStudio,['--task','RunScript','--runScriptFile',bootstrapFile,'--outputFile',studioOutput,'--quitAfterExecution'],{cwd:project.root,timeoutMs});
    const output=`${processResult.stdout}\n${processResult.stderr}\n${fs.existsSync(studioOutput)?fs.readFileSync(studioOutput,'utf8'):''}`;
    if(processResult.code!==0)throw new Error(`Roblox Studio CLI exit ${processResult.code}: ${output.slice(-10000)}`);
    const result=parseMarker(output);if(!result)throw new Error(`Roblox Skyline input evidence missing: ${output.slice(-10000)}`);
    if(clean(result.nonce)!==actualNonce)throw new Error('Roblox Skyline input nonce mismatch');
    if(clean(result.authority)!==AUTHORITY||result.runtimeVerified!==true||result.inputBased!==true||result.capabilities?.virtualInput!==true)throw new Error('Roblox Skyline input evidence authority/capability invalid');
    if(Number(result.metrics?.inputActions||0)<2||Number(result.metrics?.jumpCount||0)<1)throw new Error('Roblox Skyline input dispatch evidence missing');
    if(outputFile){fs.mkdirSync(path.dirname(path.resolve(outputFile)),{recursive:true});fs.writeFileSync(path.resolve(outputFile),`${JSON.stringify(result,null,2)}\n`,'utf8');}
    const failed=(result.checkpoints||[]).filter(item=>item?.pass!==true);
    if(requireComplete&&(failed.length||(result.errors||[]).length||Number(result.stages?.length||0)!==12||!result.stages.every(stage=>stage?.success===true)))throw new Error(`Roblox Skyline physical playtest incomplete: ${JSON.stringify({failed,errors:result.errors,stages:result.stages,metrics:result.metrics})}`);
    console.log(requireComplete?'VIBE2_ROBLOX_SKYLINE_INPUT_PLAYTEST=PASS':'VIBE2_ROBLOX_SKYLINE_INPUT_PLAYTEST=EVIDENCE');
    console.log(`VIBE2_ROBLOX_SKYLINE_INPUT_ACTIONS=${Number(result.metrics?.inputActions||0)}`);
    console.log(`VIBE2_ROBLOX_SKYLINE_INPUT_JUMPS=${Number(result.metrics?.jumpCount||0)}`);
    console.log(`VIBE2_ROBLOX_SKYLINE_INPUT_DEATHS=${Number(result.metrics?.deaths||0)}`);
    console.log(`VIBE2_ROBLOX_SKYLINE_INPUT_RETRIES=${Number(result.metrics?.retries||0)}`);
    return result;
  }finally{try{fs.rmSync(tempRoot,{recursive:true,force:true});}catch{}}
}

async function main(){const args=argsOf();await runRobloxSkylineInputPlaytest({projectRoot:clean(args['project-root']),studioPath:clean(args.studio)||clean(process.env.VIBE2_ROBLOX_STUDIO_PATH),outputFile:clean(args.output),timeoutMs:Number(args.timeout||300000),nonce:clean(args.nonce),requireComplete:String(args['allow-incomplete']||'').toLowerCase()!=='true'});}
const invoked=process.argv[1]?pathToFileURL(path.resolve(process.argv[1])).href:'';if(import.meta.url===invoked)main().catch(error=>{console.error(error?.stack||error);process.exit(1);});

export {AUTHORITY,MARKER};
