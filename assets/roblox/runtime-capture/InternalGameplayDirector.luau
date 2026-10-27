-- Internal media spectator: camera follows real server-NPC movement, NEVER moves a Player.
-- Enabled only in a private Roblox server with an explicit per-game LaunchData opt-in.
-- Captures authentic runtime frames via CaptureService; OS worker independently records display.
local Director={}
local Players=game:GetService("Players")
local RunService=game:GetService("RunService")
local Workspace=game:GetService("Workspace")
local CaptureService=game:GetService("CaptureService")

local function findNpc(exclude)
 local best,bestDistance=nil,math.huge
 local camera=Workspace.CurrentCamera
 local eye=camera and camera.CFrame.Position or Vector3.zero
 for _,item in ipairs(Workspace:GetDescendants()) do
  if item:IsA("Model") and item~=exclude and not Players:GetPlayerFromCharacter(item) then
   local humanoid=item:FindFirstChildOfClass("Humanoid")
   local root=item:FindFirstChild("HumanoidRootPart") or item.PrimaryPart
   if humanoid and humanoid.Health>0 and root and root:IsA("BasePart")
      and not root.Anchored then
    local d=(root.Position-eye).Magnitude
    if d<bestDistance then best,bestDistance=item,d end
   end
  end
 end
 return best
end

function Director.install(gameId)
 local p=Players.LocalPlayer
 if not p or game.PrivateServerId=="" then return false end
 local joined=p:GetJoinData()
 local launch=joined and joined.LaunchData
 if type(launch)~="string" or launch~="JAEWOON_NATIVE_CAPTURE_"..gameId then return false end
 if p:GetAttribute("InternalNativeCaptureRunning") then return false end
 p:SetAttribute("InternalNativeCaptureRunning",true)
 p:SetAttribute("InternalNativeCaptureState","WAITING_FOR_EXISTING_NPC")
 task.spawn(function()
  local camera=Workspace.CurrentCamera
  local startedAt=os.clock()
  while not camera and os.clock()-startedAt<8 do
   task.wait(.2);camera=Workspace.CurrentCamera
  end
  if not camera then
   p:SetAttribute("InternalNativeCaptureState","NO_CAMERA")
   p:SetAttribute("InternalNativeCaptureRunning",false)
   return
  end
  local target=nil
  while not target and os.clock()-startedAt<17 do
   target=findNpc(p.Character)
   if not target then task.wait(.75) end
  end
  if not target then
   p:SetAttribute("InternalNativeCaptureState","NO_NATIVE_NPC")
   p:SetAttribute("InternalNativeCaptureRunning",false)
   return
  end
  local root=target:FindFirstChild("HumanoidRootPart") or target.PrimaryPart
  local initial=root.Position
  local ready=false
  local prior=root.Position
  local movement=0
  local measure=os.clock()
  while os.clock()-measure<7 and target.Parent and root.Parent do
   task.wait(.25)
   movement+=(root.Position-prior).Magnitude
   prior=root.Position
   if movement>2.5 then ready=true;break end
  end
  if not ready then
   p:SetAttribute("InternalNativeCaptureState","NPC_NOT_MOVING")
   p:SetAttribute("InternalNativeCaptureRunning",false)
   return
  end
  local before={type=camera.CameraType,subject=camera.CameraSubject,
   fov=camera.FieldOfView,cframe=camera.CFrame}
  local renderName="InternalNativeNpcMediaCamera"
  local moment=os.clock()
  camera.CameraType=Enum.CameraType.Scriptable
  camera.FieldOfView=69
  local lastPosition=camera.CFrame
  RunService:BindToRenderStep(renderName,Enum.RenderPriority.Camera.Value+2,function(dt)
   if not target.Parent or not root.Parent then return end
   local t=os.clock()-moment
   local forward=root.CFrame.LookVector
   local eye=root.Position-forward*15+Vector3.new(4+math.sin(t*.35)*1.4,8.5+math.sin(t*.7)*.8,0)
   local focus=root.Position+Vector3.new(0,3.5,0)+forward*3
   local targetFrame=CFrame.lookAt(eye,focus)
   local alpha=1-math.exp(-math.clamp(dt,0,.1)*3.2)
   lastPosition=lastPosition:Lerp(targetFrame,alpha)
   camera.CFrame=lastPosition
   camera.Focus=CFrame.new(focus)
  end)
  p:SetAttribute("InternalNativeCaptureState","RECORDING_NATIVE_NPC")
  local finishState="NATIVE_SCENE_RECORDED_FILE_NOT_EXPORTED"
  local complete=false
  local success,startResult=pcall(function()
   return CaptureService:StartVideoCaptureAsync(function(result,capture)
    if result~=Enum.VideoCaptureResult.Success and result~=Enum.VideoCaptureResult.TimeLimitReached then
     finishState="CAPTURE_SERVICE_FAILED:"..tostring(result)
    elseif not capture then finishState="CAPTURE_OBJECT_MISSING" end
    complete=true
   end,{})
  end)
  if not success or startResult~=Enum.VideoCaptureStartedResult.Success then
   finishState="CAPTURE_SERVICE_START_UNAVAILABLE"
  end
  task.wait(23)
  if success and startResult==Enum.VideoCaptureStartedResult.Success then
   pcall(function()CaptureService:StopVideoCapture()end)
   local cutoff=os.clock()+4
   while not complete and os.clock()<cutoff do task.wait(.15)end
   if not complete then finishState="CAPTURE_SERVICE_FINISH_TIMEOUT" end
  end
  RunService:UnbindFromRenderStep(renderName)
  camera.CameraType=before.type
  camera.FieldOfView=before.fov
  if before.subject and before.subject.Parent then camera.CameraSubject=before.subject end
  camera.CFrame=before.cframe
  p:SetAttribute("InternalNativeCaptureState",finishState)
  p:SetAttribute("InternalNativeCaptureRunning",false)
  -- Recording FilePath is RobloxScriptSecurity: no claim that a server received bytes.
 end)
 return true
end
return Director
