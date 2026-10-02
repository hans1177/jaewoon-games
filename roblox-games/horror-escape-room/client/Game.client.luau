-- 파일명: roblox-games/horror-escape-room/client/Game.client.luau
-- roblox-games/horror-escape-room/client/Game.client.luau
-- 심야 대탈출 모바일 추격 HUD / 상황별 행동 UI

-- 서비스
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local RunService=game:GetService("RunService")
local ContentProvider=game:GetService("ContentProvider")
local TweenService=game:GetService("TweenService")
local Debris=game:GetService("Debris")
local Lighting=game:GetService("Lighting")

-- 참조
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local GhostSkinFactory=nil
local GhostSkinMotion=nil
local ghostSkinModulesLoading=false
local function loadGhostSkinModules()
 if GhostSkinFactory and GhostSkinMotion then return true end
 if ghostSkinModulesLoading then
  local deadline=os.clock()+8
  repeat task.wait(.05)until(GhostSkinFactory and GhostSkinMotion)or os.clock()>=deadline
  return GhostSkinFactory~=nil and GhostSkinMotion~=nil
 end
 ghostSkinModulesLoading=true
 local folder=RS:FindFirstChild("WorldGhostSkins")or RS:WaitForChild("WorldGhostSkins",10)
 if folder then
  local factoryModule=folder:FindFirstChild("GhostSkinFactory")or folder:WaitForChild("GhostSkinFactory",5)
  local motionModule=folder:FindFirstChild("GhostSkinMotion")or folder:WaitForChild("GhostSkinMotion",5)
  if factoryModule then
   local okFactory,factory=pcall(require,factoryModule)
   if okFactory then GhostSkinFactory=factory end
  end
  if motionModule then
   local okMotion,motion=pcall(require,motionModule)
   if okMotion then GhostSkinMotion=motion end
  end
 end
 ghostSkinModulesLoading=false
 local ready=GhostSkinFactory~=nil and GhostSkinMotion~=nil
 p:SetAttribute("InternalGhostAssetsReady",ready)
 return ready
end
task.defer(loadGhostSkinModules)
-- 번역: 화면/월드 안내/상호작용은 Roblox 기본 현지화 경로를 공통 사용한다.
do
 local translations=Instance.new("LocalizationTable")
 translations.Name="MidnightTranslations";translations.SourceLocaleId="ko"
 translations:SetEntries(require(RS.Shared:WaitForChild("Translations")))
 translations.Parent=game:GetService("LocalizationService")
end
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN
local verifiedExternalLearningContext = C.VerifiedExternalLearning or C.LearningContext or {}
local verifiedExternalLearningIds = verifiedExternalLearningContext.VerifiedExternalLearningIds or {}
local verifiedExternalLearningPrinciples = verifiedExternalLearningContext.ApplicationPrinciples or {}
local verifiedExternalGameDevelopmentPrinciples = verifiedExternalLearningContext.GameDevelopmentPrinciples or {}
local verifiedExternalLearningMappings = verifiedExternalLearningContext.GameSpecificSemanticMappings or {}
local verifiedExternalLearningDispositions = verifiedExternalLearningContext.LearningDispositions or {}
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END

-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 2
local studioAssetConfig = C.StudioAssets or {}
local studioAssetFamilies = studioAssetConfig.Families or {}
local studioUi = studioAssetFamilies.UI or {}
local function hasStudioAssetAtom(atom)
  return table.find(studioUi, atom) ~= nil
end
-- STUDIO_ASSET_BINDING_CLIENT_END

local QACamera=require(RS:WaitForChild("Shared"):WaitForChild("QACamera"))
local remote=RS:WaitForChild(C.RemoteName)
local foundationRemote=RS:WaitForChild("RuntimeFoundationReport")
local foundationRoundtrip=false
foundationRemote.OnClientEvent:Connect(function(kind)
 if kind=="REMOTE_PONG"then foundationRoundtrip=true;foundationRemote:FireServer("REMOTE_ROUNDTRIP")end
end)

-- 사운드
local function makeSound(name,id,volume,looped)
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Looped=looped;s.Parent=SoundService;return s
end
local lobbyBgm=makeSound("MidnightLobbyBackground",C.Audio.LobbyBackground or C.Audio.Background,.12,true)
local bgm=makeSound("MidnightBackground",C.Audio.Background,.11,true)
local chase=makeSound("MidnightChase",C.Audio.Chase,.14,true)
lobbyBgm.PlaybackSpeed=1
lobbyBgm.Volume=.10
bgm.PlaybackSpeed=1.035
chase.PlaybackSpeed=1.04
local actionSfx=makeSound("MidnightAction",C.Audio.Action,.32,false)
local warningSfx=makeSound("MidnightWarning",C.Audio.Warning,.26,false)
local resultSfx=makeSound("MidnightResult",C.Audio.Result,.34,false)
local footstepSfx=makeSound("MidnightFootstep",C.Audio.Footstep,.12,false)
local freezeSfx=makeSound("MidnightFreeze",C.Audio.Freeze,.34,false)
local rescueSfx=makeSound("MidnightRescue",C.Audio.Rescue,.34,false)
local wasFrozen=false
local lastRoundState="WAITING"
local stepClock=0
lobbyBgm:Play()

-- UI 공통
local gui=Instance.new("ScreenGui")
gui.Name="MidnightTagHUD"
gui.ResetOnSpawn=false
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets
gui.IgnoreGuiInset=false
gui.DisplayOrder=30
gui.ZIndexBehavior=Enum.ZIndexBehavior.Global
gui.Parent=p:WaitForChild("PlayerGui")

-- 로딩: 클라이언트 핵심 리소스와 서버 맵 준비가 끝날 때까지 로비 진입을 가린다.
-- 로딩 화면 생성 전용 지역 범위: 생성용 변수가 파일 전체에 누적되지 않는다.
local loadingLayer
local loadingFill
do
loadingLayer=Instance.new("Frame")
loadingLayer.Name="LoadingScreen"
loadingLayer.Size=UDim2.fromScale(1,1)
loadingLayer.BackgroundColor3=Color3.fromRGB(17,20,25)
loadingLayer.BorderSizePixel=0
loadingLayer.ZIndex=100
loadingLayer.Active=true
loadingLayer.Parent=gui

local loadingTitle=Instance.new("TextLabel")
loadingTitle.Name="LoadingTitle"
loadingTitle.AnchorPoint=Vector2.new(.5,.5)
loadingTitle.Position=UDim2.fromScale(.5,.40)
loadingTitle.Size=UDim2.new(.86,0,0,42)
loadingTitle.BackgroundTransparency=1
loadingTitle.Text="MIDNIGHT ESCAPE"
loadingTitle.AutoLocalize=false
loadingTitle.TextColor3=Color3.fromRGB(235,222,190)
loadingTitle.TextSize=26
loadingTitle.Font=Enum.Font.GothamBold
loadingTitle.ZIndex=103
loadingTitle.Parent=loadingLayer

local loadingStatus=Instance.new("TextLabel")
loadingStatus.Name="LoadingStatus"
loadingStatus.AnchorPoint=Vector2.new(.5,.5)
loadingStatus.Position=UDim2.fromScale(.5,.59)
loadingStatus.Size=UDim2.new(.82,0,0,28)
loadingStatus.BackgroundTransparency=1
loadingStatus.Text="개인 저택을 준비하는 중"
loadingStatus.TextColor3=Color3.fromRGB(172,164,151)
loadingStatus.TextSize=14
loadingStatus.Font=Enum.Font.GothamMedium
loadingStatus.ZIndex=103
loadingStatus.Parent=loadingLayer

local loadingTrack=Instance.new("Frame")
loadingTrack.Name="LoadingTrack"
loadingTrack.AnchorPoint=Vector2.new(.5,.5)
loadingTrack.Position=UDim2.fromScale(.5,.68)
loadingTrack.Size=UDim2.new(.52,0,0,3)
loadingTrack.BackgroundColor3=Color3.fromRGB(34,39,49)
loadingTrack.BorderSizePixel=0
loadingTrack.ZIndex=103
loadingTrack.Parent=loadingLayer
local loadingTrackCorner=Instance.new("UICorner");loadingTrackCorner.CornerRadius=UDim.new(0,6);loadingTrackCorner.Parent=loadingTrack

loadingFill=Instance.new("Frame")
loadingFill.Name="LoadingFill"
loadingFill.Size=UDim2.fromScale(.08,1)
loadingFill.BackgroundColor3=Color3.fromRGB(190,151,86)
loadingFill.BorderSizePixel=0
loadingFill.ZIndex=104
loadingFill.Parent=loadingTrack
local loadingFillCorner=Instance.new("UICorner");loadingFillCorner.CornerRadius=UDim.new(0,6);loadingFillCorner.Parent=loadingFill

local loadingInk=Instance.new("TextLabel")
loadingInk.AnchorPoint=Vector2.new(.5,.5)
loadingInk.Position=UDim2.fromScale(.5,.48)
loadingInk.Size=UDim2.new(.8,0,0,28)
loadingInk.BackgroundTransparency=1
loadingInk.Text="심야 대탈출 · 괴물 가족의 초대장"
loadingInk.TextColor3=Color3.fromRGB(177,158,128)
loadingInk.TextSize=13
loadingInk.Font=Enum.Font.GothamMedium
loadingInk.ZIndex=104
loadingInk.Parent=loadingLayer

-- 검은 초대장, 붉은 봉랍과 가느다란 황동 장식.
local seal=Instance.new("TextLabel");seal.Name="FamilyWaxSeal";seal.AnchorPoint=Vector2.new(.5,.5)
seal.Position=UDim2.fromScale(.5,.20);seal.Size=UDim2.fromOffset(46,46);seal.Rotation=-12
seal.BackgroundColor3=Color3.fromRGB(97,36,48);seal.Text="M";seal.Font=Enum.Font.Garamond;seal.TextSize=31
seal.TextColor3=Color3.fromRGB(221,188,133);seal.ZIndex=103;seal.Parent=loadingLayer
local sealCorner=Instance.new("UICorner");sealCorner.CornerRadius=UDim.new(1,0);sealCorner.Parent=seal
local border=Instance.new("UIStroke");border.Color=Color3.fromRGB(158,119,65);border.Thickness=1;border.Parent=seal
local retry=Instance.new("TextButton");retry.Name="ReconnectManor";retry.AnchorPoint=Vector2.new(.5,.5)
retry.Position=UDim2.fromScale(.5,.82);retry.Size=UDim2.fromOffset(150,44);retry.Text="다시 연결"
retry.BackgroundColor3=Color3.fromRGB(73,40,45);retry.TextColor3=Color3.fromRGB(235,218,182);retry.TextSize=14
retry.Font=Enum.Font.Gotham;retry.Visible=false;retry.ZIndex=105;retry.Parent=loadingLayer
retry.Activated:Connect(function()
 if not retry.Active then return end
 retry.Active=false;retry.Text="연결 중"
 local ok=pcall(function()game:GetService("TeleportService"):Teleport(game.PlaceId,p)end)
 if not ok then retry.Active=true;retry.Text="다시 연결"end
end)
game:GetService("TeleportService").TeleportInitFailed:Connect(function(player)
 if player==p and retry.Parent then retry.Active=true;retry.Text="다시 연결"end
end)
local loadingVisible=true
local function setLoadingProgress(progress,status)
 loadingFill:TweenSize(UDim2.fromScale(math.clamp(progress,0,1),1),Enum.EasingDirection.Out,Enum.EasingStyle.Quad,.18,true)
 if status then loadingStatus.Text=status end
end
local function finishLoading(status)
 if not loadingVisible then return end
 loadingVisible=false
 setLoadingProgress(1,status or"집사가 문을 열었어")
 p:SetAttribute("LobbyClientReady",true)
 local tween=TweenService:Create(loadingLayer,TweenInfo.new(.2),{BackgroundTransparency=1});tween:Play()
 task.delay(.2,function()loadingLayer:Destroy()end)
end

task.spawn(function()
 -- 음악은 입장을 막지 않는다. 전체 경기장/장식 사전 다운로드도 하지 않는다.
 task.spawn(function()pcall(function()ContentProvider:PreloadAsync({lobbyBgm})end)end)
 local started=os.clock()
 while p.Parent and loadingVisible do
  local character=p.Character;local root=character and character:FindFirstChild("HumanoidRootPart")
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local round=tostring(p:GetAttribute("RoundState")or"")
  local inMatch=round=="RUNNING"or round=="SPECTATING"or round:match("^RESULT_")~=nil
  local lobby=workspace:FindFirstChild("MidnightLobby")
  local room=lobby and lobby:FindFirstChild("PersonalManor_"..p.UserId)
  local ground=room and room:FindFirstChild("PersonalGround")
  local ready=workspace:GetAttribute("PhysicalLobbyReady")==true and p:GetAttribute("PersonalLobbyOwner")==p.UserId
  -- 느린 접속 중 경기가 먼저 시작되면 실제 경기장 준비 상태로 로딩을 마친다.
  if inMatch and root and humanoid and workspace:GetAttribute("MapReady")==true and workspace:FindFirstChild("MidnightArena")then
   finishLoading("경기장 준비 완료");break
  end
  if not inMatch and ready and ground and root and humanoid and humanoid.FloorMaterial~=Enum.Material.Air and p:GetAttribute("LobbySpawnGroundedAt")then
   local position=root.Position-ground.Position
   if math.abs(position.X)<ground.Size.X*.5 and math.abs(position.Z)<ground.Size.Z*.5 and position.Y>0 and position.Y<14 then
    finishLoading();break
   end
  end
  local errorMessage=workspace:GetAttribute("LobbyLoadError")
  if inMatch then setLoadingProgress(.8,"경기장을 불러오는 중")
  elseif errorMessage then setLoadingProgress(.3,"저택 연결이 끊겼어 · 다시 연결해줘")
  elseif not ready then setLoadingProgress(.3,"집사가 현관문을 여는 중")
  elseif not ground then setLoadingProgress(.6,"저택을 불러오는 중")
  else setLoadingProgress(.8,"가족 명부와 입장 위치 확인 중")end
  retry.Visible=errorMessage~=nil or os.clock()-started>25
  task.wait(.1)
 end
end)

task.spawn(function()
 for _=1,20 do
  foundationRemote:FireServer("INPUT_READY")
  foundationRemote:FireServer("REMOTE_PING")
  if foundationRoundtrip then break end
  task.wait(.5)
 end
end)
task.spawn(function()
 local camera=workspace.CurrentCamera
 local character=p.Character or p.CharacterAdded:Wait()
 local h=character:WaitForChild("Humanoid",10)
 if camera and h then
  camera.CameraSubject=h
  for _=1,30 do
   if camera.CameraSubject==h then foundationRemote:FireServer("CAMERA_READY");break end
   task.wait(.1)
  end
 end
end)

end -- 로딩 화면 생성 지역 범위

local function roundify(target,radius)
 local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,radius or 12);corner.Parent=target
end

local function outline(target,transparency)
 local stroke=Instance.new("UIStroke");stroke.Thickness=1.5;stroke.Transparency=transparency or .45;stroke.Parent=target
end

local function makeButton(parent,text,color)
 local b=Instance.new("TextButton")
 b.BackgroundColor3=color
 b.TextColor3=Color3.fromRGB(255,255,255)
 b.Text=text
 b.TextScaled=true
 b.Font=Enum.Font.GothamBold
 b.Parent=parent
 roundify(b,13);outline(b,.45)
 return b
end

-- 캐릭터 모션: 기본 Animator를 유지하고 Motor6D C0에 작은 보조 움직임만 합성한다.
-- 캐릭터 동작 전용 지역 범위: 생성용 변수가 파일 전체에 누적되지 않는다.
local setMotionImpulse
do
local motionHumanoid=nil
local motionRoot=nil
local motionJoints={}
local motionPhase=0
local motionImpulseKind=""
local motionImpulseUntil=0

setMotionImpulse=function(kind,duration)
 motionImpulseKind=kind or""
 motionImpulseUntil=os.clock()+(duration or .3)
end

local function findMotionJoint(character,names)
 for _,d in ipairs(character:GetDescendants())do
  if d:IsA("Motor6D")and table.find(names,d.Name)then return d end
 end
 return nil
end

local function bindCharacterMotion(character)
 local humanoid=character:WaitForChild("Humanoid",5)
 local root=character:WaitForChild("HumanoidRootPart",5)
 if not humanoid or not root then return end
 motionHumanoid=humanoid
 motionRoot=root
 motionPhase=0
 motionJoints={}
 local specs={
  Body={"Waist"},
  Neck={"Neck"},
  LeftShoulder={"LeftShoulder","Left Shoulder"},
  RightShoulder={"RightShoulder","Right Shoulder"},
 }
 for _,d in ipairs(character:GetDescendants())do
  if d:IsA("Motor6D")and(d.Name=="Root"or d.Name=="RootJoint")then
   d:SetAttribute("MidnightRootMotionDisabled",true)
  end
 end
 for key,names in pairs(specs)do
  local joint=findMotionJoint(character,names)
  if joint then motionJoints[key]={joint=joint,baseC0=joint.C0}end
 end
end

local function applyMotionJoint(key,offset,alpha)
 local row=motionJoints[key]
 if not row or not row.joint or not row.joint.Parent then return end
 row.joint.C0=row.joint.C0:Lerp(row.baseC0*offset,alpha)
end

RunService:BindToRenderStep("MidnightCharacterMotion",Enum.RenderPriority.Character.Value+1,function(dt)
 local humanoid=motionHumanoid
 local root=motionRoot
 if not humanoid or not root or not root.Parent or humanoid.Health<=0 then return end

 local running=p:GetAttribute("RoundState")=="RUNNING"
 local role=p:GetAttribute("Role")or"WAITING"
 local moveAmount=running and math.clamp(humanoid.MoveDirection.Magnitude,0,1)or 0
 local localMove=root.CFrame:VectorToObjectSpace(humanoid.MoveDirection)
 local pace=role=="MONSTER"and 8.4 or 10.5
 motionPhase+=dt*(moveAmount>.05 and pace or 2.1)

 local breath=math.sin(os.clock()*2.15)
 local stride=math.sin(motionPhase)
 local strideOpp=math.sin(motionPhase+math.pi)
 local monster=role=="MONSTER"
 local baseLean=monster and math.rad(-4.5)or 0
 local forwardLean=math.rad((monster and 10 or 6)*math.clamp(localMove.Z,-1,1))*moveAmount
 local sideLean=math.rad(-4.5*math.clamp(localMove.X,-1,1))*moveAmount
 local bob=0 -- Root/몸통 수직 이동은 금지: 공중부양처럼 보이는 시각 오프셋 제거

 local actionPitch=0
 local actionRoll=0
 local rightAction=0
 local leftAction=0
 if os.clock()<motionImpulseUntil then
  if motionImpulseKind=="DASH"then
   actionPitch=math.rad(-11)
  elseif motionImpulseKind=="PURIFY"then
   actionPitch=math.rad(-3);rightAction=math.rad(-34);leftAction=math.rad(8)
  elseif motionImpulseKind=="ABILITY"then
   actionPitch=math.rad(-8);rightAction=math.rad(-20);leftAction=math.rad(-20)
  elseif motionImpulseKind=="INFECT_ATTACK"then
   actionPitch=math.rad(-7);rightAction=math.rad(-46);leftAction=math.rad(-18)
  elseif motionImpulseKind=="INFECT"then
   actionPitch=math.rad(-7);actionRoll=math.rad(math.sin(os.clock()*34)*5)
  elseif motionImpulseKind=="CELEBRATE_HUMAN"then
   actionPitch=math.rad(-5+math.sin(os.clock()*8)*4);rightAction=math.rad(-105);leftAction=math.rad(-105);actionRoll=math.rad(math.sin(os.clock()*7)*5)
  elseif motionImpulseKind=="CELEBRATE_MONSTER"then
   actionPitch=math.rad(-12);rightAction=math.rad(-70+math.sin(os.clock()*9)*18);leftAction=math.rad(-70-math.sin(os.clock()*9)*18);actionRoll=math.rad(math.sin(os.clock()*5)*8)
  elseif motionImpulseKind=="CELEBRATE_DRAW"then
   actionPitch=math.rad(12);rightAction=math.rad(15);leftAction=math.rad(15)
  end
 elseif motionImpulseKind~=""then
  motionImpulseKind=""
 end

 local body=CFrame.Angles(baseLean+forwardLean+actionPitch,0,sideLean+actionRoll)
 local neck=CFrame.Angles(math.rad(breath*.7),0,math.rad(-sideLean*20/math.pi))
 local armSwing=math.rad(stride*10*moveAmount)
 if monster then armSwing=math.rad(stride*15*moveAmount-4)end
 local shoulderBreath=math.rad(breath*.7)
 local alpha=math.clamp(dt*13,0,1)
 applyMotionJoint("Body",body,alpha)
 applyMotionJoint("Neck",neck,alpha)
 applyMotionJoint("LeftShoulder",CFrame.Angles(armSwing+shoulderBreath+leftAction,0,0),alpha)
 applyMotionJoint("RightShoulder",CFrame.Angles(-armSwing+shoulderBreath+rightAction,0,0),alpha)

 if moveAmount<=.05 and motionImpulseKind==""then
  local idleBody=CFrame.Angles(baseLean+math.rad(breath*.8),0,0)
  applyMotionJoint("Body",idleBody,math.clamp(dt*5,0,1))
 end
end)

if p.Character then task.defer(bindCharacterMotion,p.Character)end
p.CharacterAdded:Connect(bindCharacterMotion)

end -- 캐릭터 동작 지역 범위

local chaseTint=Instance.new("Frame")
-- 학습 효과 초기화 변수는 이 범위와 연결된 콜백에서만 유지한다.
do
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
local verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = C.VerifiedExternalLearning or C.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 6
-- Optional presentation learning must never depend on the temporary loading frame.
-- The old out-of-scope loadingLayer reference stopped the client before combat HUD/skin setup.
local verifiedLearningRoot = gui
local verifiedLearningSemanticVariant = "OBJECTIVE_GOAL"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(255, 220, 124)
local verifiedLearningSemanticMood = "READABLE_EXPLORATION"
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningNativeBindingVersion", VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedLearningPrinciples)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningAxisCount", #verifiedLearningAxes)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningFingerprint", verifiedLearningContext.MemoryFingerprint or "")
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMappingVersion", verifiedLearningContext.SemanticMappingVersion or 0)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMappingFingerprint", verifiedLearningContext.SemanticMappingFingerprint or "")
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticVariant", verifiedLearningSemanticVariant)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticDomain", verifiedLearningSemanticDomain)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
verifiedLearningRoot:SetAttribute("VerifiedLearningGameSpecificMappingCount", #(verifiedLearningContext.GameSpecificSemanticMappings or {}))

-- Game-specific color and atmosphere response, authored locally in Roblox.
local verifiedLearningColorGrade = verifiedLearningLighting:FindFirstChild("VerifiedLearningColorGrade")
if not verifiedLearningColorGrade then
  verifiedLearningColorGrade = Instance.new("ColorCorrectionEffect")
  verifiedLearningColorGrade.Name = "VerifiedLearningColorGrade"
  verifiedLearningColorGrade.Parent = verifiedLearningLighting
end
verifiedLearningColorGrade.Saturation = 0.07
verifiedLearningColorGrade.Contrast = 0.05
verifiedLearningColorGrade.Brightness = 0.01
verifiedLearningColorGrade:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
if verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
-- Survival alone receives atmospheric depth and threat haze.
local verifiedLearningBloom = verifiedLearningLighting:FindFirstChild("VerifiedLearningBloom")
if not verifiedLearningBloom then
  verifiedLearningBloom = Instance.new("BloomEffect")
  verifiedLearningBloom.Name = "VerifiedLearningBloom"
  verifiedLearningBloom.Parent = verifiedLearningLighting
end
verifiedLearningBloom.Intensity = 0.22
verifiedLearningBloom.Size = 18
verifiedLearningBloom.Threshold = 1.1
local verifiedLearningAtmosphere = verifiedLearningLighting:FindFirstChild("VerifiedLearningAtmosphere")
if not verifiedLearningAtmosphere then
  verifiedLearningAtmosphere = Instance.new("Atmosphere")
  verifiedLearningAtmosphere.Name = "VerifiedLearningAtmosphere"
  verifiedLearningAtmosphere.Parent = verifiedLearningLighting
end
verifiedLearningAtmosphere.Density = 0.22
verifiedLearningAtmosphere.Haze = 1.1
verifiedLearningAtmosphere.Glare = 0.08
local verifiedLearningDepth = verifiedLearningLighting:FindFirstChild("VerifiedLearningDepthOfField")
if not verifiedLearningDepth then
  verifiedLearningDepth = Instance.new("DepthOfFieldEffect")
  verifiedLearningDepth.Name = "VerifiedLearningDepthOfField"
  verifiedLearningDepth.Parent = verifiedLearningLighting
end
verifiedLearningDepth.FarIntensity = 0.08
verifiedLearningDepth.NearIntensity = 0.02
verifiedLearningDepth.FocusDistance = 28
verifiedLearningDepth.InFocusRadius = 24

end

if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "COMBAT_IMPACT" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
-- Roblox character animation / motion adaptation.
local function syncVerifiedLearningCharacterMotion(character)
  local humanoid = character:FindFirstChildOfClass("Humanoid") or character:WaitForChild("Humanoid", 5)
  if not humanoid then return end
  local animator = humanoid:FindFirstChildOfClass("Animator") or humanoid:WaitForChild("Animator", 5)
  if not animator then return end
  humanoid.Running:Connect(function(speed)
    local ratio = speed > 0.1 and math.clamp(speed / math.max(humanoid.WalkSpeed, 1), 0.82, 1.25) or 1
    for _, track in ipairs(animator:GetPlayingAnimationTracks()) do
      if track.Priority == Enum.AnimationPriority.Movement or track.Priority == Enum.AnimationPriority.Core then
        track:AdjustSpeed(ratio)
      end
    end
  end)
end
if verifiedLearningPlayer.Character then task.defer(syncVerifiedLearningCharacterMotion, verifiedLearningPlayer.Character) end
verifiedLearningPlayer.CharacterAdded:Connect(syncVerifiedLearningCharacterMotion)

end

-- Roblox UI / touch / progression guidance.
local verifiedLearningGuidance = Instance.new("TextLabel")
verifiedLearningGuidance.Name = "VerifiedLearningGuidance"
verifiedLearningGuidance.Size = UDim2.new(1, -20, 0, 30)
verifiedLearningGuidance.Position = UDim2.fromOffset(10, 8)
verifiedLearningGuidance.BackgroundTransparency = 1
verifiedLearningGuidance.TextWrapped = true
verifiedLearningGuidance.TextScaled = true
verifiedLearningGuidance.TextColor3 = verifiedLearningSemanticColor
verifiedLearningGuidance:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
if verifiedLearningSemanticVariant == "PUZZLE_STATE" then
  verifiedLearningGuidance.Text = "퍼즐 보드와 현재 이동을 함께 확인"
elseif verifiedLearningSemanticVariant == "DEFENSE_WAVE" then
  verifiedLearningGuidance.Text = "웨이브와 기지 상태를 보며 배치"
elseif verifiedLearningSemanticVariant == "COMBAT_IMPACT" then
  verifiedLearningGuidance.Text = "공격 방향과 타격 응답을 확인"
elseif verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
  verifiedLearningGuidance.Text = "레벨과 다음 성장 조건을 확인"
elseif verifiedLearningSemanticVariant == "ECONOMY_RESOURCE" then
  verifiedLearningGuidance.Text = "자원과 업그레이드 상태를 확인"
elseif verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  verifiedLearningGuidance.Text = "체력과 위협 상태를 확인"
elseif verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" then
  verifiedLearningGuidance.Text = "이동 방향과 공간 응답을 확인"
elseif verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" then
  verifiedLearningGuidance.Text = "공유 세션과 내 역할을 확인"
else
  verifiedLearningGuidance.Text = "현재 목표와 다음 행동을 확인"
end
verifiedLearningGuidance.Parent = verifiedLearningRoot
local verifiedLearningRiskCue = Instance.new("TextLabel")
verifiedLearningRiskCue.Name = "VerifiedLearningProgressionRiskCue"
verifiedLearningRiskCue.Size = UDim2.new(1, -20, 0, 26)
verifiedLearningRiskCue.Position = UDim2.fromOffset(10, 40)
verifiedLearningRiskCue.BackgroundTransparency = 1
verifiedLearningRiskCue.TextWrapped = true
verifiedLearningRiskCue.TextScaled = true
verifiedLearningRiskCue.TextColor3 = verifiedLearningSemanticColor
if verifiedLearningSemanticVariant == "DEFENSE_WAVE" then
  verifiedLearningRiskCue.Text = "배치 전 웨이브·기지 위험 확인"
elseif verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  verifiedLearningRiskCue.Text = "행동 전 체력·위협 위험 확인"
elseif verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
  verifiedLearningRiskCue.Text = "행동 전 레벨·성장 조건 확인"
else
  verifiedLearningRiskCue.Text = "현재 상태와 다음 행동 확인"
end
verifiedLearningRiskCue.Visible = verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" or verifiedLearningSemanticVariant == "PROGRESSION_RISK"
verifiedLearningRiskCue.Parent = verifiedLearningRoot

-- Roblox skill VFX / camera / motion feedback.
local function playVerifiedLearningActionFeedback(control)
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningLastControl", control and control.Name or "GAMEPLAY_STATE")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputRespondedAt", os.clock())
  verifiedLearningGuidance.Visible = false

  if control then
    local scale = control:FindFirstChild("VerifiedLearningMotionScale")
    if not scale then
      scale = Instance.new("UIScale")
      scale.Name = "VerifiedLearningMotionScale"
      scale.Parent = control
    end
    scale.Scale = 0.94
    verifiedLearningTweenService:Create(scale, TweenInfo.new(0.16, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {Scale = 1}):Play()
  end

  if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "OBJECTIVE_GOAL" or verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" then
  local camera = workspace.CurrentCamera
  if camera then
    local baseFov = camera.FieldOfView
    verifiedLearningTweenService:Create(camera, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = math.clamp(baseFov + 3, 40, 100)}):Play()
    task.delay(0.09, function()
      if camera then verifiedLearningTweenService:Create(camera, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = baseFov}):Play() end
    end)
  end
  end

  if verifiedLearningSemanticVariant == "COMBAT_IMPACT" then
  local character = verifiedLearningPlayer.Character
  local rootPart = character and character:FindFirstChild("HumanoidRootPart")
  if character and rootPart then
    local highlight = Instance.new("Highlight")
    highlight.Name = "VerifiedLearningSkillImpact"
    highlight.FillTransparency = 0.35
    highlight.OutlineTransparency = 0.12
    highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    highlight.Parent = character
    verifiedLearningTweenService:Create(highlight, TweenInfo.new(0.20), {FillTransparency = 1, OutlineTransparency = 1}):Play()
    local sparkles = Instance.new("Sparkles")
    sparkles.Name = "VerifiedLearningSkillSparkles"
    sparkles.SparkleColor = Color3.fromRGB(170, 220, 255)
    sparkles.Parent = rootPart
    local impactAttachment = Instance.new("Attachment")
    impactAttachment.Name = "VerifiedLearningSkillAttachment"
    impactAttachment.Parent = rootPart
    local particles = Instance.new("ParticleEmitter")
    particles.Name = "VerifiedLearningSkillParticles"
    particles.Rate = 0
    particles.Lifetime = NumberRange.new(0.18, 0.32)
    particles.Speed = NumberRange.new(5, 9)
    particles.SpreadAngle = Vector2.new(45, 45)
    particles.LightEmission = 0.7
    particles.Parent = impactAttachment
    particles:Emit(18)
    local impactLight = Instance.new("PointLight")
    impactLight.Name = "VerifiedLearningSkillLight"
    impactLight.Color = Color3.fromRGB(160, 215, 255)
    impactLight.Brightness = 2.2
    impactLight.Range = 10
    impactLight.Parent = rootPart
    verifiedLearningTweenService:Create(impactLight, TweenInfo.new(0.18), {Brightness = 0, Range = 4}):Play()
    task.delay(0.24, function()
      if impactAttachment then impactAttachment:Destroy() end
      if impactLight then impactLight:Destroy() end
      if sparkles then sparkles:Destroy() end
      if highlight then highlight:Destroy() end
    end)
  end
  end

  if verifiedLearningSemanticVariant == "ECONOMY_RESOURCE" or verifiedLearningSemanticVariant == "PUZZLE_STATE" or verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
    verifiedLearningRiskCue.Visible = true
    verifiedLearningRiskCue.TextColor3 = verifiedLearningSemanticColor
  end
end

local verifiedLearningLastControl = nil
local function bindVerifiedLearningControl(control)
  if not control:IsA("GuiButton") then return end
  if not control:FindFirstChild("VerifiedLearningTouchTarget") then
    local size = Instance.new("UISizeConstraint")
    size.Name = "VerifiedLearningTouchTarget"
    size.MinSize = Vector2.new(0, 52)
    size:SetAttribute("SemanticTouchTarget", verifiedLearningSemanticVariant)
    size.Parent = control
  end
  control.Activated:Connect(function()
    verifiedLearningLastControl = control
    verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputSubmittedAt", os.clock())
    playVerifiedLearningActionFeedback(control)
  end)
end
for _, descendant in ipairs(verifiedLearningRoot:GetDescendants()) do bindVerifiedLearningControl(descendant) end
verifiedLearningRoot.DescendantAdded:Connect(bindVerifiedLearningControl)
verifiedLearningPlayer:GetAttributeChangedSignal("LastApprovedScope"):Connect(function()
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningGameplayState", verifiedLearningPlayer:GetAttribute("LastApprovedScope") or "")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningServerConfirmedAt", os.clock())
  playVerifiedLearningActionFeedback(verifiedLearningLastControl)
  verifiedLearningLastControl = nil
end)
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END
end

-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN
loadingLayer:SetAttribute("VerifiedExternalLearningCoveragePct", verifiedExternalLearningContext.CoveragePct or 0)
loadingLayer:SetAttribute("VerifiedExternalLearningContentComplete", verifiedExternalLearningContext.ContentComplete == true)
loadingLayer:SetAttribute("VerifiedExternalLearningCount", #verifiedExternalLearningIds)
loadingLayer:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedExternalLearningPrinciples)
loadingLayer:SetAttribute("VerifiedExternalLearningFingerprint", verifiedExternalLearningContext.MemoryFingerprint or "")
loadingLayer:SetAttribute("VerifiedExternalGameDevelopmentPrincipleCount", #verifiedExternalGameDevelopmentPrinciples)
loadingLayer:SetAttribute("VerifiedExternalLearningSemanticMappingVersion", verifiedExternalLearningContext.SemanticMappingVersion or 0)
loadingLayer:SetAttribute("VerifiedExternalLearningSemanticMappingFingerprint", verifiedExternalLearningContext.SemanticMappingFingerprint or "")
loadingLayer:SetAttribute("VerifiedExternalLearningDispositionCount", #verifiedExternalLearningDispositions)
loadingLayer:SetAttribute("VerifiedExternalLearningMappingCount", #verifiedExternalLearningMappings)
loadingLayer:SetAttribute("VerifiedLearningSemanticVariant", verifiedExternalLearningContext.SemanticVariant or "")
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END

if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = chaseTint
end
chaseTint:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
chaseTint:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))

chaseTint.Size=UDim2.fromScale(1,1)
chaseTint.BackgroundColor3=Color3.fromRGB(120,8,18)
chaseTint.BackgroundTransparency=1
chaseTint.BorderSizePixel=0
chaseTint.ZIndex=7
chaseTint.Parent=gui

local threatEffectLayer=Instance.new("Frame")
threatEffectLayer.Name="ThreatEffectLayer"
threatEffectLayer.Size=UDim2.fromScale(1,1)
threatEffectLayer.BackgroundColor3=Color3.new(0,0,0)
threatEffectLayer.BackgroundTransparency=1
threatEffectLayer.BorderSizePixel=0
threatEffectLayer.Visible=false
threatEffectLayer.ZIndex=8
threatEffectLayer.Parent=gui

local threatEffectText=Instance.new("TextLabel")
threatEffectText.AnchorPoint=Vector2.new(.5,0)
threatEffectText.Position=UDim2.new(.5,0,0,78)
threatEffectText.Size=UDim2.fromOffset(270,32)
threatEffectText.BackgroundColor3=Color3.fromRGB(14,12,13)
threatEffectText.BackgroundTransparency=.18
threatEffectText.TextColor3=Color3.fromRGB(238,220,190)
threatEffectText.TextSize=12
threatEffectText.TextWrapped=true
threatEffectText.Font=Enum.Font.GothamBold
threatEffectText.Visible=false
threatEffectText.ZIndex=9
threatEffectText.Parent=gui
roundify(threatEffectText,7)

-- 상단 HUD: 추격 중에도 최소 정보만 표시
local hud=Instance.new("Frame")
hud.Name="MidnightTopHUD"
hud.AnchorPoint=Vector2.new(.5,0)
hud.Position=UDim2.new(.5,0,0,8)
hud.Size=UDim2.fromOffset(342,102)
hud.BackgroundColor3=Color3.fromRGB(12,12,13)
hud.BackgroundTransparency=.18
hud.ZIndex=10
hud.Parent=gui
roundify(hud,9);outline(hud,.62)

local mapLine=Instance.new("TextLabel")
mapLine.Size=UDim2.new(.6,-8,0,18)
mapLine.Position=UDim2.fromOffset(8,3)
mapLine.BackgroundTransparency=1
mapLine.TextColor3=Color3.fromRGB(239,232,218)
mapLine.TextScaled=true
mapLine.Font=Enum.Font.GothamBold
mapLine.Parent=hud

local roleLine=Instance.new("TextLabel")
roleLine.Size=UDim2.new(1,-16,0,16)
roleLine.Position=UDim2.fromOffset(8,24)
roleLine.BackgroundTransparency=1
roleLine.TextColor3=Color3.fromRGB(174,169,160)
roleLine.TextScaled=false
roleLine.TextSize=11
roleLine.Font=Enum.Font.Gotham
roleLine.Parent=hud

local roundLine=Instance.new("TextLabel")
roundLine.Size=UDim2.new(.38,-8,0,38)
roundLine.Position=UDim2.new(.62,0,0,4)
roundLine.BackgroundColor3=Color3.fromRGB(24,22,21)
roundLine.BackgroundTransparency=.12
roundLine.TextColor3=Color3.fromRGB(218,184,119)
roundLine.TextScaled=false
roundLine.TextSize=13
roundLine.Font=Enum.Font.GothamBold
roundLine.Parent=hud
roundify(roundLine,6)

local objectiveLine=Instance.new("TextLabel")
objectiveLine.Name="ObjectiveProgress"
objectiveLine.Size=UDim2.new(1,-16,0,24)
objectiveLine.Position=UDim2.fromOffset(8,43)
objectiveLine.BackgroundTransparency=1
objectiveLine.TextColor3=Color3.fromRGB(230,218,190)
objectiveLine.TextSize=13
objectiveLine.TextWrapped=false
objectiveLine.Font=Enum.Font.GothamBold
objectiveLine.TextXAlignment=Enum.TextXAlignment.Left
objectiveLine.Parent=hud

local skillGuideLine=Instance.new("TextLabel")
skillGuideLine.Name="SkillGuide"
skillGuideLine.Size=UDim2.new(1,-16,0,22)
skillGuideLine.Position=UDim2.fromOffset(8,65)
skillGuideLine.BackgroundTransparency=1
skillGuideLine.TextColor3=Color3.fromRGB(169,205,218)
skillGuideLine.TextSize=9
skillGuideLine.TextWrapped=true
skillGuideLine.Font=Enum.Font.Gotham
skillGuideLine.TextXAlignment=Enum.TextXAlignment.Left
skillGuideLine.Parent=hud

local energyTrack=Instance.new("Frame")
energyTrack.Name="EnergyTrack"
energyTrack.Size=UDim2.new(1,-86,0,8)
energyTrack.Position=UDim2.fromOffset(8,89)
energyTrack.BackgroundColor3=Color3.fromRGB(48,43,40)
energyTrack.BorderSizePixel=0
energyTrack.ZIndex=11
energyTrack.Parent=hud
roundify(energyTrack,5)

local energyFill=Instance.new("Frame")
energyFill.Name="EnergyFill"
energyFill.Size=UDim2.fromScale(1,1)
energyFill.BackgroundColor3=Color3.fromRGB(188,146,77)
energyFill.BorderSizePixel=0
energyFill.ZIndex=12
energyFill.Parent=energyTrack
roundify(energyFill,5)

local energyLabel=Instance.new("TextLabel")
energyLabel.Name="EnergyLabel"
energyLabel.Size=UDim2.fromOffset(72,14)
energyLabel.Position=UDim2.new(1,-78,0,84)
energyLabel.BackgroundTransparency=1
energyLabel.TextColor3=Color3.fromRGB(204,190,163)
energyLabel.TextSize=10
energyLabel.Font=Enum.Font.GothamBold
energyLabel.TextXAlignment=Enum.TextXAlignment.Right
energyLabel.ZIndex=12
energyLabel.Text="에너지 100/100"
energyLabel.Parent=hud

local pressureLabel=Instance.new("TextLabel")
pressureLabel.Name="PressurePassive"
pressureLabel.AnchorPoint=Vector2.new(.5,0)
pressureLabel.Position=UDim2.new(.5,0,0,88)
pressureLabel.Size=UDim2.fromOffset(240,26)
pressureLabel.BackgroundColor3=Color3.fromRGB(17,16,16)
pressureLabel.BackgroundTransparency=.16
pressureLabel.TextColor3=Color3.fromRGB(221,190,128)
pressureLabel.TextSize=12
pressureLabel.Font=Enum.Font.GothamBold
pressureLabel.ZIndex=13
pressureLabel.Visible=false
pressureLabel.Parent=gui
roundify(pressureLabel,7)

local mapContentToast=Instance.new("TextLabel")
mapContentToast.Name="MapContentToast"
mapContentToast.AnchorPoint=Vector2.new(.5,0)
mapContentToast.Position=UDim2.new(.5,0,0,118)
mapContentToast.Size=UDim2.fromOffset(286,34)
mapContentToast.BackgroundColor3=Color3.fromRGB(16,15,15)
mapContentToast.BackgroundTransparency=.14
mapContentToast.TextColor3=Color3.fromRGB(216,209,197)
mapContentToast.TextSize=12
mapContentToast.TextWrapped=true
mapContentToast.Font=Enum.Font.GothamBold
mapContentToast.ZIndex=14
mapContentToast.Visible=false
mapContentToast.Parent=gui
roundify(mapContentToast,7)

local aiTeamChat=Instance.new("TextLabel")
aiTeamChat.Name="AITeamChat"
aiTeamChat.AnchorPoint=Vector2.new(.5,1)
aiTeamChat.Position=UDim2.new(.5,0,1,-154)
aiTeamChat.Size=UDim2.fromOffset(360,46)
aiTeamChat.BackgroundColor3=Color3.fromRGB(18,20,24)
aiTeamChat.BackgroundTransparency=.12
aiTeamChat.TextColor3=Color3.fromRGB(224,232,238)
aiTeamChat.TextSize=13
aiTeamChat.TextWrapped=true
aiTeamChat.Font=Enum.Font.GothamBold
aiTeamChat.ZIndex=15
aiTeamChat.Visible=false
aiTeamChat.Parent=gui
roundify(aiTeamChat,8)
local aiTeamChatLimit=Instance.new("UISizeConstraint");aiTeamChatLimit.MaxSize=Vector2.new(420,48);aiTeamChatLimit.MinSize=Vector2.new(250,44);aiTeamChatLimit.Parent=aiTeamChat
local aiTeamChatSerial=0
local function showAITeamChat(snapshot)
 if typeof(snapshot)~="table"then return end
 local team=tostring(snapshot.Team or"")
 if team~=tostring(p:GetAttribute("Role")or"")then return end
 aiTeamChatSerial+=1;local serial=aiTeamChatSerial
 local speaker=tostring(snapshot.Speaker or"AI 동료")
 local message=tostring(snapshot.Text or"")
 aiTeamChat.Text=speaker.." · "..message
 aiTeamChat.TextColor3=team=="MONSTER"and Color3.fromRGB(238,154,174)or Color3.fromRGB(164,224,235)
 aiTeamChat.Visible=message~=""
 task.delay(3.1,function()if aiTeamChatSerial==serial then aiTeamChat.Visible=false end end)
end

local toastSerial=0
local function showMapContentToast(text,color,duration)
 toastSerial+=1
 local serial=toastSerial
 mapContentToast.Text=text
 mapContentToast.TextColor3=color or Color3.fromRGB(216,228,239)
 mapContentToast.Visible=true
 task.delay(duration or 2,function()
  if toastSerial==serial then mapContentToast.Visible=false end
 end)
end

-- 구석 놀람/코믹 연출: 로컬에서만 생성되며 경쟁 판정에는 관여하지 않는다.
-- 로컬 놀람 연출 전용 지역 범위: 생성용 변수가 파일 전체에 누적되지 않는다.
local ghostCatalogItem
do
local surpriseArena=nil
local surpriseTriggers={}
local surpriseSeen={}
local ghostSightingTriggers={}
local ghostSightingSeen={}
local lobbyHauntRoot=nil
local lobbyHauntTriggers={}
local lobbyHauntSeen={} -- trigger -> next allowed os.clock()
local surpriseClock=0

local function localPart(name,size,cframe,color,material,shape)
 local x=Instance.new("Part")
 x.Name=name
 x.Size=size
 x.CFrame=cframe
 x.Color=color
 x.Material=material or Enum.Material.SmoothPlastic
 x.Anchored=true
 x.CanCollide=false
 x.CanTouch=false
 x.CanQuery=false
 x.CastShadow=false
 if shape then x.Shape=shape end
 x.Parent=workspace
 return x
end

local function localText(pos,text,color,duration)
 local anchorPart=localPart("LocalSurpriseTextAnchor",Vector3.new(.2,.2,.2),CFrame.new(pos),Color3.new(1,1,1),Enum.Material.SmoothPlastic)
 anchorPart.Transparency=1
 local bill=Instance.new("BillboardGui")
 bill.Size=UDim2.fromOffset(260,56)
 bill.StudsOffset=Vector3.new(0,2.2,0)
 bill.AlwaysOnTop=true
 bill.Parent=anchorPart
 local label=Instance.new("TextLabel")
 label.Size=UDim2.fromScale(1,1)
 label.BackgroundColor3=Color3.fromRGB(14,16,22)
 label.BackgroundTransparency=.18
 label.TextColor3=color or Color3.fromRGB(235,238,244)
 label.TextStrokeTransparency=.65
 label.TextSize=15
 label.TextWrapped=true
 label.Font=Enum.Font.GothamBold
 label.Text=text
 label.Parent=bill
 roundify(label,10)
 Debris:AddItem(anchorPart,duration or 2.2)
 return anchorPart
end

local function tweenParts(parts,offset,duration)
 for _,part in ipairs(parts)do
  if part and part.Parent then
   TweenService:Create(part,TweenInfo.new(duration or .65,Enum.EasingStyle.Quad,Enum.EasingDirection.InOut),{CFrame=part.CFrame*CFrame.new(offset)}):Play()
  end
 end
end

local function playSchoolShadow(trigger)
 local pos=trigger.Position+Vector3.new(-8,1.5,0)
 local body=localPart("LocalSchoolShadowBody",Vector3.new(2.8,5.4,1.7),CFrame.new(pos),Color3.fromRGB(12,12,16),Enum.Material.SmoothPlastic)
 local head=localPart("LocalSchoolShadowHead",Vector3.new(2.2,2.2,2.2),CFrame.new(pos+Vector3.new(0,3.6,0)),Color3.fromRGB(10,10,13),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 local eyeL=localPart("LocalSchoolShadowEye",Vector3.new(.22,.22,.18),CFrame.new(pos+Vector3.new(-.35,3.7,-1.08)),Color3.fromRGB(220,64,72),Enum.Material.Neon)
 local eyeR=localPart("LocalSchoolShadowEye",Vector3.new(.22,.22,.18),CFrame.new(pos+Vector3.new(.35,3.7,-1.08)),Color3.fromRGB(220,64,72),Enum.Material.Neon)
 local parts={body,head,eyeL,eyeR}
 tweenParts(parts,Vector3.new(18,0,0),.52)
 for _,part in ipairs(parts)do Debris:AddItem(part,.72)end
end

local function playLockerEyes(trigger)
 local base=trigger.Position+Vector3.new(0,1.1,-2)
 local face=localPart("LocalLockerFace",Vector3.new(2.2,2.5,.35),CFrame.new(base),Color3.fromRGB(15,15,18),Enum.Material.SmoothPlastic)
 local eyeL=localPart("LocalLockerEye",Vector3.new(.28,.2,.18),CFrame.new(base+Vector3.new(-.42,.25,-.24)),Color3.fromRGB(236,230,165),Enum.Material.Neon)
 local eyeR=localPart("LocalLockerEye",Vector3.new(.28,.2,.18),CFrame.new(base+Vector3.new(.42,.25,-.24)),Color3.fromRGB(236,230,165),Enum.Material.Neon)
 task.delay(.8,function()
  for _,part in ipairs({face,eyeL,eyeR})do if part.Parent then TweenService:Create(part,TweenInfo.new(.2),{Transparency=1}):Play()end end
 end)
 Debris:AddItem(face,1.1);Debris:AddItem(eyeL,1.1);Debris:AddItem(eyeR,1.1)
end

local function playJanitor(trigger)
 local pos=trigger.Position+Vector3.new(-7,0,0)
 local body=localPart("LocalJanitorBody",Vector3.new(2.5,4.8,1.6),CFrame.new(pos+Vector3.new(0,2.4,0)),Color3.fromRGB(72,91,104),Enum.Material.Fabric)
 local head=localPart("LocalJanitorHead",Vector3.new(2,2,2),CFrame.new(pos+Vector3.new(0,5.7,0)),Color3.fromRGB(204,174,147),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 local broom=localPart("LocalJanitorBroom",Vector3.new(.3,6,.3),CFrame.new(pos+Vector3.new(2,2.6,0))*CFrame.Angles(0,0,math.rad(18)),Color3.fromRGB(108,82,57),Enum.Material.Wood)
 local parts={body,head,broom}
 localText(pos+Vector3.new(0,7,0),"청소 중이니까 뛰지 마!",Color3.fromRGB(255,225,150),1.7)
 tweenParts(parts,Vector3.new(14,0,0),1.15)
 for _,part in ipairs(parts)do Debris:AddItem(part,1.35)end
end

local function playGymBall(trigger)
 local ball=localPart("LocalGymBall",Vector3.new(2.6,2.6,2.6),CFrame.new(trigger.Position+Vector3.new(-6,1,0)),Color3.fromRGB(201,116,67),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 TweenService:Create(ball,TweenInfo.new(.8,Enum.EasingStyle.Bounce,Enum.EasingDirection.Out),{CFrame=ball.CFrame*CFrame.new(13,0,0)*CFrame.Angles(math.rad(270),0,0)}):Play()
 Debris:AddItem(ball,1)
end

local function playFloatingProp(trigger,kind,text)
 local pos=trigger.Position+Vector3.new(0,3,0)
 local part
 if kind=="HOSPITAL_WHEELCHAIR"then
  part=localPart("LocalWheelchair",Vector3.new(3,3,3),CFrame.new(trigger.Position+Vector3.new(-5,1.5,0)),Color3.fromRGB(92,103,108),Enum.Material.Metal)
  TweenService:Create(part,TweenInfo.new(1.1,Enum.EasingStyle.Sine),{CFrame=part.CFrame+CFrame.new(10,0,0)}):Play()
 elseif kind=="PARK_CLOWN"then
  part=localPart("LocalClownHead",Vector3.new(3,3,3),CFrame.new(pos),Color3.fromRGB(218,214,195),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  local nose=localPart("LocalClownNose",Vector3.new(.8,.8,.8),CFrame.new(pos+Vector3.new(0,0,-1.7)),Color3.fromRGB(215,55,62),Enum.Material.Neon,Enum.PartType.Ball)
  Debris:AddItem(nose,1.4)
 elseif kind=="PARK_HORSE"then
  part=localPart("LocalCarouselHorseHead",Vector3.new(3.8,2.4,4.6),CFrame.new(pos),Color3.fromRGB(212,190,153),Enum.Material.SmoothPlastic)
  TweenService:Create(part,TweenInfo.new(.35,Enum.EasingStyle.Back),{CFrame=part.CFrame*CFrame.Angles(0,math.rad(55),0)}):Play()
 elseif kind=="HOSPITAL_XRAY"then
  part=localPart("LocalXrayDuck",Vector3.new(2.2,2.1,.3),CFrame.new(pos),Color3.fromRGB(172,220,231),Enum.Material.Neon)
  local head=localPart("LocalXrayDuckHead",Vector3.new(1.1,1.1,.3),CFrame.new(pos+Vector3.new(.8,.8,0)),Color3.fromRGB(172,220,231),Enum.Material.Neon,Enum.PartType.Ball)
  Debris:AddItem(head,1.8)
 elseif kind=="HOSPITAL_BED"then
  part=localPart("LocalRunawayBed",Vector3.new(6,1.5,10),CFrame.new(trigger.Position+Vector3.new(-5,1,0)),Color3.fromRGB(161,177,181),Enum.Material.Metal)
  TweenService:Create(part,TweenInfo.new(.85,Enum.EasingStyle.Sine),{CFrame=part.CFrame+CFrame.new(10,0,0)}):Play()
 elseif kind=="PARK_ARCADE"then
  part=localPart("LocalArcadeGhostScreen",Vector3.new(3,2,.25),CFrame.new(pos),Color3.fromRGB(84,221,171),Enum.Material.Neon)
 elseif kind=="PARK_POPCORN"then
  part=localPart("LocalPopcorn",Vector3.new(.9,.9,.9),CFrame.new(pos),Color3.fromRGB(245,227,160),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  TweenService:Create(part,TweenInfo.new(.65,Enum.EasingStyle.Bounce),{CFrame=part.CFrame+CFrame.new(0,4,0)}):Play()
 elseif kind=="SCHOOL_TRAY"then
  part=localPart("LocalCafeteriaTray",Vector3.new(4,.25,3),CFrame.new(pos),Color3.fromRGB(144,153,156),Enum.Material.Metal)
  TweenService:Create(part,TweenInfo.new(.45,Enum.EasingStyle.Quad,Enum.EasingDirection.In),{CFrame=part.CFrame+CFrame.new(0,-2.6,0)*CFrame.Angles(math.rad(40),0,math.rad(25))}):Play()
 else
  part=localPart("LocalComicProp",Vector3.new(2.8,2.8,2.8),CFrame.new(pos),Color3.fromRGB(132,145,154),Enum.Material.SmoothPlastic)
 end
 if part then Debris:AddItem(part,1.4)end
 if text and text~=""then localText(pos+Vector3.new(0,2.5,0),text,Color3.fromRGB(229,233,240),1.8)end
end

ghostCatalogItem=function(id)
 for _,item in ipairs(C.GhostCatalog or{})do if item.Id==id then return item end end
 return nil
end
local internalGhostSkinByCatalogId={
 YUREI="yurei",NOPPERABO="nopperabo",CHEONNYEO_GWISHIN="gwisin-bride",KRASUE="krasue",
 BANSHEE="banshee",JIANGSHI="jiangshi",CHUREL="churel",WHITE_LADY="la-sayona",
 DULLAHAN="dullahan",LA_LLORONA="la-llorona",PONTIANAK="pontianak",BLACK_SHUCK="barghest",
}

local combatSkinByMonster={
 DRACULA="strigoi",FRANKENSTEIN="draugr",WEREWOLF="barghest",MUMMY="pocong",GRIM_REAPER="hei-wuchang",
}
local combatSkinByInfected={
 BROADCAST="nopperabo",ELECTRICIAN="jiangshi",COURIER="aswang",PHOTOGRAPHER="la-sayona",SECURITY="vetala",
}
local combatSkins={}
local combatSkinClock=0
local authoredPalettes={
 DRACULA={skin=Color3.fromRGB(197,184,181),cloth=Color3.fromRGB(32,18,29),accent=Color3.fromRGB(139,25,50),metal=Color3.fromRGB(177,126,67)},
 FRANKENSTEIN={skin=Color3.fromRGB(122,151,116),cloth=Color3.fromRGB(39,47,45),accent=Color3.fromRGB(95,211,184),metal=Color3.fromRGB(117,130,129)},
 WEREWOLF={skin=Color3.fromRGB(113,83,62),cloth=Color3.fromRGB(52,36,28),accent=Color3.fromRGB(220,137,66),metal=Color3.fromRGB(114,91,70)},
 MUMMY={skin=Color3.fromRGB(176,166,138),cloth=Color3.fromRGB(204,194,159),accent=Color3.fromRGB(96,179,173),metal=Color3.fromRGB(164,133,76)},
 GRIM_REAPER={skin=Color3.fromRGB(69,67,77),cloth=Color3.fromRGB(20,17,28),accent=Color3.fromRGB(139,80,202),metal=Color3.fromRGB(130,128,142)},
 INFECTED={skin=Color3.fromRGB(151,169,143),cloth=Color3.fromRGB(34,47,42),accent=Color3.fromRGB(105,235,163),metal=Color3.fromRGB(104,124,113)},
}

local function combatRoleForPlayer(player)
 local role=tostring(player:GetAttribute("Role")or"")
 if role=="MONSTER"then return role end
 local team=tostring(player:GetAttribute("RoundTeam")or"")
 if team=="MONSTER"then return team end
 return role
end
local function combatFormIdForPlayer(player)
 if combatRoleForPlayer(player)~="MONSTER"then return nil end
 if player:GetAttribute("Infected")==true then return"INFECTED"end
 return tostring(player:GetAttribute("MonsterForm")or"DRACULA")
end
local function combatSkinIdForPlayer(player)
 if combatRoleForPlayer(player)~="MONSTER"then return nil end
 if player:GetAttribute("Infected")==true then
  return combatSkinByInfected[tostring(player:GetAttribute("HumanForm")or"BROADCAST")]or"pocong"
 end
 return combatSkinByMonster[tostring(player:GetAttribute("MonsterForm")or"DRACULA")]or"strigoi"
end
local function authoredCombatTemplate()
 local folder=RS:FindFirstChild("CombatVisualTemplates")
 if not folder then return nil end
 local root=folder:FindFirstChild("AuthoredHumanoidGhost")
 if root and root:IsA("Model")and root:FindFirstChildWhichIsA("MeshPart",true)then return root end
 if root then
  for _,d in ipairs(root:GetDescendants())do
   if d:IsA("Model")and d:FindFirstChildWhichIsA("MeshPart",true)then return d end
  end
 end
 for _,d in ipairs(folder:GetDescendants())do
  if d:IsA("Model")and d:FindFirstChildWhichIsA("MeshPart",true)then return d end
 end
 return nil
end
local function styleAuthoredCombatModel(model,formId)
 local palette=authoredPalettes[formId]or authoredPalettes.DRACULA
 model:SetAttribute("MonsterForm",formId)
 for _,d in ipairs(model:GetDescendants())do
  if d:IsA("BasePart")then
   d.Anchored=true
   d.CanCollide=false
   d.CanTouch=false
   d.CanQuery=false
   d.CastShadow=true
   if d.Transparency<1 then
    local name=string.lower(d.Name)
    if string.find(name,"hair",1,true)or string.find(name,"pupil",1,true)or string.find(name,"lash",1,true)then
     d.Color=palette.cloth
    elseif string.find(name,"cinnabar",1,true)or string.find(name,"lip",1,true)or string.find(name,"iris",1,true)or string.find(name,"red",1,true)then
     d.Color=palette.accent
    elseif string.find(name,"brass",1,true)or string.find(name,"gold",1,true)or string.find(name,"jade",1,true)or string.find(name,"pendant",1,true)then
     d.Color=palette.metal
    elseif string.find(name,"silk",1,true)or string.find(name,"ivory",1,true)or string.find(name,"skirt",1,true)or string.find(name,"jeogori",1,true)or string.find(name,"cloth",1,true)then
     d.Color=palette.cloth
    elseif string.find(name,"skin",1,true)or string.find(name,"porcelain",1,true)or string.find(name,"face",1,true)or string.find(name,"ear",1,true)or string.find(name,"nose",1,true)or string.find(name,"palm",1,true)then
     d.Color=palette.skin
    end
   end
  end
 end
end
local function bindAuthoredCombatMotion(model)
 local bones={}
 local base={}
 for _,d in ipairs(model:GetDescendants())do
  if d:IsA("Bone")then bones[d.Name]=d;base[d]=d.Transform end
 end
 local function resetBone(name)
  local bone=bones[name]
  if bone then bone.Transform=base[bone]or CFrame.new()end
 end
 local function pose(name,cf)
  local bone=bones[name]
  if bone then bone.Transform=(base[bone]or CFrame.new())*cf end
 end
 local important={"Hips","Spine","Chest","Head","UpperArmL","UpperArmR","ForearmL","ForearmR","HandL","HandR","ThighL","ThighR","ShinL","ShinR","FootL","FootR","Jaw","LidL","LidR"}
 local function reset()
  for _,name in ipairs(important)do resetBone(name)end
  for name in pairs(bones)do
   if string.sub(name,1,4)=="Hair"or string.sub(name,1,3)=="Hem"or string.sub(name,1,3)=="Tie"then resetBone(name)end
  end
 end
 local function step(time,state)
  reset()
  local t=tonumber(time)or 0
  local phase=t*(state=="chase"and 13 or state=="walk"and 8.5 or 2.1)
  local breath=math.sin(t*2.2)
  pose("Spine",CFrame.Angles(math.rad(breath*1.8),0,math.rad(math.sin(t*1.45)*1.2)))
  pose("Chest",CFrame.Angles(math.rad(-breath*1.2),0,math.rad(-math.sin(t*1.45)*.8)))
  pose("Head",CFrame.Angles(math.rad(-2+breath*.7),math.rad(math.sin(t*.8)*2),math.rad(math.sin(t*1.15)*2.2)))
  if state=="walk"or state=="chase"then
   local amp=state=="chase"and 33 or 18
   local knee=state=="chase"and 24 or 13
   pose("ThighL",CFrame.Angles(math.rad(math.sin(phase)*amp),0,0))
   pose("ThighR",CFrame.Angles(math.rad(-math.sin(phase)*amp),0,0))
   pose("ShinL",CFrame.Angles(math.rad(math.max(0,-math.sin(phase))*knee),0,0))
   pose("ShinR",CFrame.Angles(math.rad(math.max(0,math.sin(phase))*knee),0,0))
   pose("UpperArmL",CFrame.Angles(math.rad(-math.sin(phase)*amp*.62),0,math.rad(-5)))
   pose("UpperArmR",CFrame.Angles(math.rad(math.sin(phase)*amp*.62),0,math.rad(5)))
   pose("Chest",CFrame.Angles(math.rad(state=="chase"and 8 or 3),0,math.rad(math.sin(phase)*2.4)))
  elseif state=="attack"then
   local u=math.clamp(t/.7,0,1)
   local hit=math.sin(u*math.pi)
   pose("Spine",CFrame.Angles(math.rad(-15*hit),0,math.rad(8*hit)))
   pose("Chest",CFrame.Angles(math.rad(-10*hit),0,math.rad(-7*hit)))
   pose("Head",CFrame.Angles(math.rad(9*hit),0,math.rad(-9*hit)))
   pose("UpperArmL",CFrame.Angles(math.rad(-78*hit),math.rad(-8),math.rad(-14)))
   pose("UpperArmR",CFrame.Angles(math.rad(-92*hit),math.rad(9),math.rad(14)))
   pose("ForearmL",CFrame.Angles(math.rad(-28*hit),0,0))
   pose("ForearmR",CFrame.Angles(math.rad(-36*hit),0,0))
   pose("Jaw",CFrame.new(0,-.035*hit,0)*CFrame.Angles(math.rad(9*hit),0,0))
  end
  for name in pairs(bones)do
   local hairIndex=tonumber(string.match(name,"^Hair(%d+)_"))
   if hairIndex then
    pose(name,CFrame.Angles(math.rad(math.sin(t*3.1-hairIndex*.18)*3.8),math.rad(math.sin(t*2.2+hairIndex*.11)*2.1),0))
   end
  end
 end
 return{step=step,reset=reset,destroy=reset,kind="AUTHORED_BONE_MOTION"}
end
local function restoreCombatSkinSource(row)
 for part,value in pairs(row.hiddenParts or{})do
  if part and part.Parent then part.LocalTransparencyModifier=value end
 end
 for hi,value in pairs(row.hiddenHighlights or{})do
  if hi and hi.Parent then hi.Enabled=value end
 end
end
local function destroyCombatSkin(source)
 local row=combatSkins[source];if not row then return end
 restoreCombatSkinSource(row)
 if row.motion then pcall(function()row.motion.destroy()end)end
 if row.model and row.model.Parent then row.model:Destroy()end
 combatSkins[source]=nil
end
local function hideCombatSkinSource(row)
 row.hiddenParts=row.hiddenParts or{}
 row.hiddenHighlights=row.hiddenHighlights or{}
 for _,d in ipairs(row.source:GetDescendants())do
  if d:IsA("BasePart")and row.hiddenParts[d]==nil then
   row.hiddenParts[d]=d.LocalTransparencyModifier;d.LocalTransparencyModifier=1
  elseif d:IsA("Highlight")and row.hiddenHighlights[d]==nil then
   row.hiddenHighlights[d]=d.Enabled;d.Enabled=false
  end
 end
end
local function ensureCombatSkin(source,rootPart,skinId,formId)
 if not source or not rootPart or not skinId then return nil end
 local template=authoredCombatTemplate()
 local wantAuthored=template~=nil
 local row=combatSkins[source]
 if row and(row.skinId~=skinId or row.formId~=formId or row.authored~=wantAuthored or not row.model or not row.model.Parent)then
  destroyCombatSkin(source);row=nil
 end
 if not row then
  local model=nil
  local motion=nil
  local authored=false
  local quality=""
  local pivotToBottom=0
  if template then
   local ok,clone=pcall(function()return template:Clone()end)
   if ok and clone then
    model=clone;model.Name="CombatAuthoredGhost_"..tostring(formId)
    model.Parent=workspace
    local _,size=model:GetBoundingBox()
    if size.Y>.1 then pcall(function()model:ScaleTo(model:GetScale()*(6.15/size.Y))end)end
    local boxCf,scaledSize=model:GetBoundingBox()
    local pivot=model:GetPivot()
    pivotToBottom=math.max(0,pivot.Position.Y-(boxCf.Position.Y-scaledSize.Y*.5))
    styleAuthoredCombatModel(model,formId)
    motion=bindAuthoredCombatMotion(model)
    model:SetAttribute("SourceAssetLibrary","roblox-world-ghost-authored-glb")
    model:SetAttribute("CombatSkin",true)
    model:SetAttribute("RuntimeQuality","AUTHORED_SKINNED_MESH")
    model:SetAttribute("ProceduralFallback",false)
    authored=true;quality="AUTHORED_SKINNED_MESH"
   end
  end
  if not model then
   if not loadGhostSkinModules()then return nil end
   local sourcePlayer=Players:GetPlayerFromCharacter(source)
   quality=sourcePlayer and"near"or"mid"
   local ok,created=pcall(function()
    return GhostSkinFactory.Create(skinId,{quality=quality,parent=workspace,anchored=true,pivot=CFrame.new()})
   end)
   if not ok or not created then return nil end
   model=created
   local bindOk,bound=pcall(function()return GhostSkinMotion.Bind(model)end)
   if not bindOk or not bound then model:Destroy();return nil end
   motion=bound
   model.Name="CombatGhostFallback_"..skinId
   model:SetAttribute("SourceAssetLibrary","roblox-world-ghost-skins-v1")
   model:SetAttribute("CombatSkin",true)
   model:SetAttribute("RuntimeQuality",quality)
   model:SetAttribute("ProceduralFallback",true)
  end
  row={source=source,root=rootPart,skinId=skinId,formId=formId,quality=quality,authored=authored,model=model,motion=motion,pivotToBottom=pivotToBottom,createdAt=os.clock(),lastPos=rootPart.Position,hiddenParts={},hiddenHighlights={},attackStart=0,attackUntil=0}
  combatSkins[source]=row
 end
 row.root=rootPart
 hideCombatSkinSource(row)
 return row
end
local function refreshCombatSkins()
 local active={}
 local round=tostring(p:GetAttribute("RoundState")or"")
 local roomState=tostring(p:GetAttribute("RoomState")or workspace:GetAttribute("RoomState")or"")
 local show=round=="RUNNING"or round:match("^RESULT_")~=nil or roomState=="RUNNING"
 if show then task.defer(loadGhostSkinModules)end
 if show then
  for _,player in ipairs(Players:GetPlayers())do
   local source=player.Character
   local rr=source and source:FindFirstChild("HumanoidRootPart")
   local skinId=combatSkinIdForPlayer(player)
   local formId=combatFormIdForPlayer(player)
   if source and rr and skinId and formId then active[source]=true;ensureCombatSkin(source,rr,skinId,formId)end
  end
  local arena=workspace:FindFirstChild("MidnightArena")
  if arena then
   for _,source in ipairs(arena:GetChildren())do
    if source:IsA("Model")then
     local formId=source.Name:match("^AI_MONSTER_(.+)$")
     local rr=formId and(source:FindFirstChild("HumanoidRootPart")or source.PrimaryPart)or nil
     local skinId=formId and combatSkinByMonster[formId]or nil
     if rr and skinId then active[source]=true;ensureCombatSkin(source,rr,skinId,formId)end
    end
   end
  end
 end
 for source in pairs(combatSkins)do if not active[source]then destroyCombatSkin(source)end end
end
local function markCombatSkinAttack(userId,origin,duration)
 local row=nil
 if tonumber(userId)and tonumber(userId)>0 then
  local player=Players:GetPlayerByUserId(tonumber(userId))
  if player and player.Character then row=combatSkins[player.Character]end
 elseif typeof(origin)=="Vector3"then
  local best=math.huge
  for source,candidate in pairs(combatSkins)do
   if source:IsA("Model")and source.Name:match("^AI_MONSTER_")and candidate.root and candidate.root.Parent then
    local distance=(candidate.root.Position-origin).Magnitude
    if distance<best then best=distance;row=candidate end
   end
  end
 end
 if row then row.attackStart=os.clock();row.attackUntil=row.attackStart+(duration or .7)end
end

RunService.RenderStepped:Connect(function(dt)
 combatSkinClock+=dt
 if combatSkinClock>=.2 then combatSkinClock=0;refreshCombatSkins()end
 local now=os.clock()
 for _,row in pairs(combatSkins)do
  local rr=row.root
  if rr and rr.Parent and row.model and row.model.Parent then
   local h=row.source:FindFirstChildOfClass("Humanoid")
   local groundOffset=(h and tonumber(h.HipHeight)or 2)+(rr.Size.Y*.5)
   local last=row.lastPos or rr.Position
   local velocity=(rr.Position-last).Magnitude/math.max(dt,1/120)
   row.lastPos=rr.Position
   local state,time
   if now<(row.attackUntil or 0)then state="attack";time=now-(row.attackStart or now)
   elseif velocity>11 then state="chase";time=now-row.createdAt
   elseif velocity>1 then state="walk";time=now-row.createdAt
   else state="idle";time=now-row.createdAt end
   local pose=CFrame.new()
   if state=="attack"then
    local pulse=math.sin(math.clamp(time/.58,0,1)*math.pi)
    pose=CFrame.new(0,.08*pulse,-.72*pulse)*CFrame.Angles(math.rad(-10*pulse),0,0)
   elseif state=="chase"then
    pose=CFrame.new(0,math.sin(now*13)*.055,0)*CFrame.Angles(math.rad(-6),0,math.rad(math.sin(now*6)*2))
   elseif state=="walk"then
    pose=CFrame.new(0,math.sin(now*9)*.035,0)*CFrame.Angles(math.rad(-2),0,math.rad(math.sin(now*4.5)*1.2))
   end
   local visualOffset=-groundOffset+(row.authored and(row.pivotToBottom or 0)or 0)
   row.model:PivotTo(rr.CFrame*CFrame.new(0,visualOffset,0)*pose)
   pcall(function()row.motion.step(time,state)end)
   hideCombatSkinSource(row)
  end
 end
end)

local function tryInternalGhostSighting(trigger,id)
 if not loadGhostSkinModules()then return false end
 local skinId=internalGhostSkinByCatalogId[id]
 if not skinId then return false end
 local character=p.Character
 local root=character and character:FindFirstChild("HumanoidRootPart")
 local pos=trigger.Position+Vector3.new(0,.55,0)
 local look=Vector3.new(0,0,-1)
 if root then
  local delta=root.Position-pos
  local flat=Vector3.new(delta.X,0,delta.Z)
  if flat.Magnitude>.1 then look=flat.Unit end
 end
 local ok,model=pcall(function()
  return GhostSkinFactory.Create(skinId,{quality=touchEnabled and"mid"or"near",parent=workspace,pivot=CFrame.lookAt(pos,pos+look),anchored=true})
 end)
 if not ok or not model then return false end
 model.Name="LocalInternalGhostSighting_"..skinId
 model:SetAttribute("SourceAssetLibrary","roblox-world-ghost-skins-v1")
 local binding=nil
 if GhostSkinMotion then
  local boundOk,bound=pcall(function()return GhostSkinMotion.Bind(model)end)
  if boundOk then binding=bound end
 end
 task.spawn(function()
  local started=os.clock()
  while model.Parent and os.clock()-started<1.35 do
   if binding then pcall(function()binding.step(os.clock()-started,"idle")end)end
   task.wait(1/30)
  end
  if model.Parent then
   for _,part in ipairs(model:GetDescendants())do
    if part:IsA("BasePart")and part.Transparency<1 then
     TweenService:Create(part,TweenInfo.new(.28),{Transparency=1}):Play()
    end
   end
   task.wait(.3)
  end
  if binding then pcall(function()binding.destroy()end)end
  if model.Parent then model:Destroy()end
 end)
 return true
end

local function playGhostSighting(trigger)
 local id=tostring(trigger:GetAttribute("GhostId")or"")
 local item=ghostCatalogItem(id);if not item then return end
 if tryInternalGhostSighting(trigger,id)then
  localText(trigger.Position+Vector3.new(0,7,0),item.Name.." · "..item.Origin,Color3.fromRGB(224,215,255),1.5)
  return
 end
 local base=trigger.Position+Vector3.new(0,2.8,0)
 local color=item.Color or Color3.fromRGB(210,218,228)
 local parts={}
 local body=localPart("LocalGhostSightingBody",Vector3.new(2.8,5.4,1.4),CFrame.new(base),color,Enum.Material.SmoothPlastic);body.Transparency=.18;table.insert(parts,body)
 local head=localPart("LocalGhostSightingHead",Vector3.new(2.25,2.25,2.25),CFrame.new(base+Vector3.new(0,3.6,0)),color,Enum.Material.SmoothPlastic,Enum.PartType.Ball);head.Transparency=.12;table.insert(parts,head)
 if item.Visual=="BLACK_DOG"then
  body.Size=Vector3.new(5.2,2.4,2.2);body.CFrame=CFrame.new(trigger.Position+Vector3.new(0,1.5,0))
  head.Size=Vector3.new(2.3,2.3,2.5);head.CFrame=CFrame.new(trigger.Position+Vector3.new(0,2,-2.4))
 elseif item.Visual=="FLOATING_HEAD"then
  body.Transparency=1
  head.CFrame=CFrame.new(trigger.Position+Vector3.new(0,6.5,0))
 elseif item.Visual=="HEADLESS"then
  head.Transparency=1
 end
 for _,part in ipairs(parts)do
  TweenService:Create(part,TweenInfo.new(1.35,Enum.EasingStyle.Sine,Enum.EasingDirection.Out),{Transparency=1,CFrame=part.CFrame*CFrame.new(0,.8,0)}):Play()
  Debris:AddItem(part,1.5)
 end
 localText(trigger.Position+Vector3.new(0,7,0),item.Name.." · "..item.Origin,Color3.fromRGB(224,215,255),1.5)
end

local function playSurprise(trigger)
 local kind=tostring(trigger:GetAttribute("SurpriseKind")or"")
 local text=tostring(trigger:GetAttribute("SurpriseText")or"")
 if kind=="SCHOOL_SHADOW"then playSchoolShadow(trigger)
 elseif kind=="SCHOOL_LOCKER"then playLockerEyes(trigger);localText(trigger.Position+Vector3.new(0,6,0),text,nil,1.5)
 elseif kind=="SCHOOL_JANITOR"then playJanitor(trigger)
 elseif kind=="SCHOOL_BALL"then playGymBall(trigger)
 elseif kind=="SCHOOL_BOARD"then localText(trigger.Position+Vector3.new(0,5,0),text,Color3.fromRGB(202,235,188),2.4)
 elseif kind=="SCHOOL_TRAY"then playFloatingProp(trigger,kind,text)
 elseif kind=="HOSPITAL_WHEELCHAIR"or kind=="PARK_CLOWN"or kind=="PARK_HORSE"or kind=="HOSPITAL_XRAY"or kind=="HOSPITAL_BED"or kind=="PARK_ARCADE"or kind=="PARK_POPCORN"then playFloatingProp(trigger,kind,text)
 elseif kind=="HOSPITAL_CURTAIN"then localText(trigger.Position+Vector3.new(0,5,0),"커튼 뒤: 비어 있음\n…방금 움직인 건 뭐지?",Color3.fromRGB(214,224,230),2.1)
 elseif kind=="HOSPITAL_MONITOR"then localText(trigger.Position+Vector3.new(0,5,0),"삐—  배터리 1%\n공포보다 충전기가 급하다",Color3.fromRGB(170,235,207),2.2)
 elseif kind=="PARK_TICKET"then localText(trigger.Position+Vector3.new(0,5,0),"매표소\n오늘도 무단결근",Color3.fromRGB(255,207,155),2.2)
 elseif text~=""then localText(trigger.Position+Vector3.new(0,5,0),text,nil,1.8)end
end

local function refreshSurpriseTriggers()
 surpriseTriggers={}
 surpriseSeen={}
 ghostSightingTriggers={}
 ghostSightingSeen={}
 surpriseArena=workspace:FindFirstChild("MidnightArena")
 if not surpriseArena then return end
 for _,d in ipairs(surpriseArena:GetDescendants())do
  if d:IsA("BasePart")and d:GetAttribute("CompetitiveEffect")==false then
   if string.find(d.Name,"SurpriseTrigger_",1,true)==1 then table.insert(surpriseTriggers,d)
   elseif string.find(d.Name,"GhostSighting_",1,true)==1 then table.insert(ghostSightingTriggers,d)end
  end
 end
end

RunService.Heartbeat:Connect(function(dt)
 surpriseClock+=dt
 if surpriseClock<.22 then return end
 surpriseClock=0
 local arenaNow=workspace:FindFirstChild("MidnightArena")
 if arenaNow~=surpriseArena then refreshSurpriseTriggers()end
 local character=p.Character
 local root=character and character:FindFirstChild("HumanoidRootPart")
 if not root then return end

 if p:GetAttribute("RoundState")~="RUNNING"then return end
 for _,trigger in ipairs(surpriseTriggers)do
  if trigger.Parent and not surpriseSeen[trigger]then
   local radius=math.max(3,tonumber(trigger:GetAttribute("SurpriseRadius"))or 10)
   if (root.Position-trigger.Position).Magnitude<=radius then
    surpriseSeen[trigger]=true
    playSurprise(trigger)
   end
  end
 end
 for _,trigger in ipairs(ghostSightingTriggers)do
  if trigger.Parent and not ghostSightingSeen[trigger]then
   local radius=math.max(3,tonumber(trigger:GetAttribute("GhostRadius"))or 11)
   if (root.Position-trigger.Position).Magnitude<=radius then
    ghostSightingSeen[trigger]=true
    local ghostId=tostring(trigger:GetAttribute("GhostId")or"")
    if ghostId~=""then remote:FireServer(C.Actions.GHOST_SIGHTING_FOUND,ghostId);playGhostSighting(trigger)end
   end
  end
 end
end)

end -- 로컬 놀람 연출 지역 범위

-- 실제 플레이 좌표를 보여주는 소형 미니맵
local mapPanel=Instance.new("Frame")
mapPanel.Name="MiniMap"
mapPanel.AnchorPoint=Vector2.new(1,0)
mapPanel.Position=UDim2.new(1,-10,0,8)
mapPanel.Size=UDim2.fromOffset(132,108)
mapPanel.BackgroundColor3=Color3.fromRGB(29,32,39)
mapPanel.BackgroundTransparency=.05
mapPanel.ZIndex=10
mapPanel.Visible=false
mapPanel.Parent=gui
roundify(mapPanel,12);outline(mapPanel,.45)

local miniTitle=Instance.new("TextLabel")
miniTitle.Size=UDim2.new(1,-12,0,20)
miniTitle.Position=UDim2.fromOffset(6,3)
miniTitle.BackgroundTransparency=1
miniTitle.TextColor3=Color3.fromRGB(225,230,238)
miniTitle.TextSize=11
miniTitle.Font=Enum.Font.GothamBold
miniTitle.TextXAlignment=Enum.TextXAlignment.Left
miniTitle.ZIndex=11
miniTitle.Parent=mapPanel

local mapCanvas=Instance.new("Frame")
mapCanvas.Size=UDim2.fromOffset(116,78)
mapCanvas.Position=UDim2.fromOffset(8,25)
mapCanvas.BackgroundColor3=Color3.fromRGB(48,52,61)
mapCanvas.BackgroundTransparency=.08
mapCanvas.ClipsDescendants=true
mapCanvas.ZIndex=11
mapCanvas.Parent=mapPanel
roundify(mapCanvas,8)

local playerDot=Instance.new("Frame")
playerDot.Name="PlayerDot"
playerDot.AnchorPoint=Vector2.new(.5,.5)
playerDot.Size=UDim2.fromOffset(7,7)
playerDot.BackgroundColor3=Color3.fromRGB(102,220,255)
playerDot.BorderSizePixel=0
playerDot.ZIndex=14
playerDot.Parent=mapCanvas
roundify(playerDot,8)

local mapLayouts={
 SCHOOL={
  {p={.45,.28},s={.10,.44}},{p={.06,.06},s={.30,.24}},{p={.64,.06},s={.30,.24}},
  {p={.06,.36},s={.30,.24}},{p={.64,.36},s={.30,.24}},{p={.06,.68},s={.30,.24}},{p={.64,.68},s={.30,.24}},
  {p={.36,.72},s={.28,.10}},
 },
 HOSPITAL={
  {p={.46,.24},s={.08,.50}},{p={.05,.06},s={.31,.24}},{p={.64,.06},s={.31,.24}},
  {p={.05,.36},s={.31,.24}},{p={.64,.36},s={.31,.24}},{p={.05,.68},s={.31,.24}},{p={.64,.68},s={.31,.24}},
 },
 THEME_PARK={
  {p={.44,.08},s={.12,.84}},{p={.06,.08},s={.30,.24}},{p={.64,.08},s={.30,.24}},
  {p={.06,.38},s={.30,.24}},{p={.64,.38},s={.30,.24}},{p={.06,.68},s={.30,.24}},{p={.64,.68},s={.30,.24}},
 },
}
local drawnMapId=""
local function drawMiniMap(id)
 if id==drawnMapId then return end
 drawnMapId=id
 for _,x in ipairs(mapCanvas:GetChildren())do if x~=playerDot and not x:IsA("UICorner")then x:Destroy()end end
 local layout=mapLayouts[id]or mapLayouts.SCHOOL
 for n,seg in ipairs(layout)do
  local piece=Instance.new("Frame")
  piece.Name="MapSegment"..n
  piece.Position=UDim2.fromScale(seg.p[1],seg.p[2])
  piece.Size=UDim2.fromScale(seg.s[1],seg.s[2])
  piece.BackgroundColor3=id=="HOSPITAL"and Color3.fromRGB(91,119,113)or id=="THEME_PARK"and Color3.fromRGB(108,73,117)or Color3.fromRGB(110,119,128)
  piece.BackgroundTransparency=.18
  piece.BorderSizePixel=0
  piece.ZIndex=12
  piece.Parent=mapCanvas
  roundify(piece,3)
 end
 playerDot.Parent=mapCanvas
end

RunService.RenderStepped:Connect(function()
 if not mapPanel.Visible then return end
 local character=p.Character
 local root=character and character:FindFirstChild("HumanoidRootPart")
 if not root then return end
 local limit=C.ArenaLimit
 local x=math.clamp(.5+root.Position.X/(limit*2),.04,.96)
 local z=math.clamp(.5+root.Position.Z/(limit*2),.04,.96)
 playerDot.Position=UDim2.fromScale(x,z)
 playerDot.BackgroundColor3=p:GetAttribute("Frozen")==true and Color3.fromRGB(117,210,255)or p:GetAttribute("Role")=="MONSTER"and Color3.fromRGB(255,83,97)or Color3.fromRGB(105,225,255)
end)

-- 로비 규칙 안내: 5초 안에 핵심 루프를 읽을 수 있게 3단계만 표시
local ruleCard=Instance.new("Frame")
ruleCard.Name="RuleGuide"
ruleCard.AnchorPoint=Vector2.new(.5,.5)
ruleCard.Position=UDim2.fromScale(.5,.27)
ruleCard.Size=UDim2.fromOffset(310,118)
ruleCard.BackgroundColor3=Color3.fromRGB(20,23,30)
ruleCard.BackgroundTransparency=.05
ruleCard.ZIndex=10
ruleCard.Parent=gui
roundify(ruleCard,14);outline(ruleCard,.4)

local ruleTitle=Instance.new("TextLabel")
ruleTitle.Size=UDim2.new(1,-16,0,24)
ruleTitle.Position=UDim2.fromOffset(8,6)
ruleTitle.BackgroundTransparency=1
ruleTitle.Text="심야 대탈출 · 게임 방법"
ruleTitle.TextColor3=Color3.fromRGB(255,225,160)
ruleTitle.TextSize=15
ruleTitle.Font=Enum.Font.GothamBold
ruleTitle.ZIndex=11
ruleTitle.Parent=ruleCard

local survivorRule=Instance.new("TextLabel")
survivorRule.Size=UDim2.new(1,-16,0,50)
survivorRule.Position=UDim2.fromOffset(8,31)
survivorRule.BackgroundColor3=Color3.fromRGB(37,67,75)
survivorRule.BackgroundTransparency=.18
survivorRule.TextColor3=Color3.fromRGB(224,241,244)
survivorRule.TextSize=12
survivorRule.TextWrapped=true
survivorRule.TextXAlignment=Enum.TextXAlignment.Left
survivorRule.Font=Enum.Font.GothamBold
survivorRule.Text="인간  에너지로 정화·대시 · 단말과 중앙 코어로 충전"
survivorRule.ZIndex=11
survivorRule.Parent=ruleCard
roundify(survivorRule,8)

local monsterRule=Instance.new("TextLabel")
monsterRule.Size=UDim2.new(1,-16,0,26)
monsterRule.Position=UDim2.fromOffset(8,85)
monsterRule.BackgroundColor3=Color3.fromRGB(80,35,45)
monsterRule.BackgroundTransparency=.16
monsterRule.TextColor3=Color3.fromRGB(250,218,222)
monsterRule.TextSize=11
monsterRule.TextWrapped=true
monsterRule.TextXAlignment=Enum.TextXAlignment.Left
monsterRule.Font=Enum.Font.GothamBold
monsterRule.Text="몬스터  접촉이 아닌 감염 공격 사용 · 인간 0명이면 승리"
monsterRule.ZIndex=11
monsterRule.Parent=ruleCard
roundify(monsterRule,8)

-- 로비 선택 패널
local setupPanel=Instance.new("Frame")
setupPanel.Name="RoleSetup"
setupPanel.AnchorPoint=Vector2.new(.5,.5)
setupPanel.Position=UDim2.fromScale(.5,.64)
setupPanel.Size=UDim2.fromOffset(304,238)
setupPanel.BackgroundColor3=Color3.fromRGB(25,27,35)
setupPanel.BackgroundTransparency=.04
setupPanel.ZIndex=10
setupPanel.Parent=gui
roundify(setupPanel,16);outline(setupPanel,.35)

local setupTitle=Instance.new("TextLabel")
setupTitle.Size=UDim2.new(1,-16,0,26)
setupTitle.Position=UDim2.fromOffset(8,7)
setupTitle.BackgroundTransparency=1
setupTitle.Text="8인 감염전 · 인간 4 VS 몬스터 4"
setupTitle.TextColor3=Color3.fromRGB(255,255,255)
setupTitle.TextScaled=true
setupTitle.Font=Enum.Font.GothamBold
setupTitle.ZIndex=11
setupTitle.Parent=setupPanel

local lobbyStatus=Instance.new("TextLabel")
lobbyStatus.Name="LobbyStatus"
lobbyStatus.Size=UDim2.new(1,-18,0,20)
lobbyStatus.Position=UDim2.fromOffset(9,34)
lobbyStatus.BackgroundTransparency=1
lobbyStatus.TextColor3=Color3.fromRGB(184,193,208)
lobbyStatus.TextSize=11
lobbyStatus.Font=Enum.Font.GothamMedium
lobbyStatus.TextXAlignment=Enum.TextXAlignment.Left
lobbyStatus.ZIndex=11
lobbyStatus.Parent=setupPanel

local selectionStatus=Instance.new("TextLabel")
selectionStatus.Name="SelectionStatus"
selectionStatus.Size=UDim2.new(1,-18,0,22)
selectionStatus.Position=UDim2.fromOffset(9,114)
selectionStatus.BackgroundTransparency=1
selectionStatus.TextColor3=Color3.fromRGB(220,225,235)
selectionStatus.TextSize=11
selectionStatus.Font=Enum.Font.GothamBold
selectionStatus.TextXAlignment=Enum.TextXAlignment.Left
selectionStatus.ZIndex=11
selectionStatus.Parent=setupPanel

local loreStatus=Instance.new("TextLabel")
loreStatus.Name="LoreStatus"
loreStatus.Size=UDim2.new(1,-18,0,16)
loreStatus.Position=UDim2.fromOffset(9,182)
loreStatus.BackgroundTransparency=1
loreStatus.TextColor3=Color3.fromRGB(169,181,198)
loreStatus.TextSize=10
loreStatus.Font=Enum.Font.GothamMedium
loreStatus.TextXAlignment=Enum.TextXAlignment.Left
loreStatus.ZIndex=11
loreStatus.Parent=setupPanel

local setupButtons={
 {C.Actions.PREFER_SURVIVOR,"인간 선호",Color3.fromRGB(50,112,145)},
 {C.Actions.PREFER_MONSTER,"몬스터 선호",Color3.fromRGB(145,48,59)},
}
for i,a in ipairs(setupButtons)do
 local b=makeButton(setupPanel,a[2],a[3])
 b.ZIndex=11
 local col=(i-1)%2
 b.Size=UDim2.new(.465,0,0,48)
 b.Position=UDim2.new(.025+col*.485,0,0,58)
 b.Activated:Connect(function()
  actionSfx.TimePosition=0;actionSfx:Play()
  remote:FireServer(a[1])
 end)
end

local shopOpenButton=makeButton(setupPanel,"코스메틱",Color3.fromRGB(66,72,88))
shopOpenButton.ZIndex=11;shopOpenButton.Size=UDim2.fromOffset(132,34);shopOpenButton.Position=UDim2.fromOffset(10,146)
local ghostBookOpenButton=makeButton(setupPanel,"세계 괴담 도감",Color3.fromRGB(74,64,94))
ghostBookOpenButton.ZIndex=11;ghostBookOpenButton.Size=UDim2.fromOffset(142,34);ghostBookOpenButton.Position=UDim2.fromOffset(152,146)

local humanCycle=makeButton(setupPanel,"인간 변경",Color3.fromRGB(49,91,105))
humanCycle.ZIndex=11;humanCycle.Size=UDim2.new(.44,0,0,36);humanCycle.Position=UDim2.new(.04,0,1,-42)
humanCycle.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.NEXT_HUMAN)end)
local monsterCycle=makeButton(setupPanel,"몬스터 변경",Color3.fromRGB(76,58,96))
monsterCycle.ZIndex=11;monsterCycle.Size=UDim2.new(.44,0,0,36);monsterCycle.Position=UDim2.new(.52,0,1,-42)
monsterCycle.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.NEXT_MONSTER)end)

local roomBrowserPanel=Instance.new("Frame")
roomBrowserPanel.Name="RoomBrowser"
roomBrowserPanel.AnchorPoint=Vector2.new(.5,.5)
roomBrowserPanel.Position=UDim2.fromScale(.5,.52)
roomBrowserPanel.Size=UDim2.fromOffset(330,330)
roomBrowserPanel.BackgroundColor3=Color3.fromRGB(21,24,31)
roomBrowserPanel.BackgroundTransparency=.02
roomBrowserPanel.ZIndex=20
roomBrowserPanel.Visible=false
roomBrowserPanel.Parent=gui
roundify(roomBrowserPanel,16);outline(roomBrowserPanel,.3)

local roomBrowserTitle=Instance.new("TextLabel")
roomBrowserTitle.Size=UDim2.new(1,-20,0,34)
roomBrowserTitle.Position=UDim2.fromOffset(10,10)
roomBrowserTitle.BackgroundTransparency=1
roomBrowserTitle.Text="방 만들기 / 참가"
roomBrowserTitle.TextColor3=Color3.fromRGB(241,244,249)
roomBrowserTitle.TextSize=21
roomBrowserTitle.Font=Enum.Font.GothamBold
roomBrowserTitle.TextXAlignment=Enum.TextXAlignment.Left
roomBrowserTitle.ZIndex=21
roomBrowserTitle.Parent=roomBrowserPanel

local roomBrowserInfo=Instance.new("TextLabel")
roomBrowserInfo.Size=UDim2.new(1,-20,0,34)
roomBrowserInfo.Position=UDim2.fromOffset(10,44)
roomBrowserInfo.BackgroundTransparency=1
roomBrowserInfo.Text="매칭 구역에 들어가면 자동으로 시작"
roomBrowserInfo.TextColor3=Color3.fromRGB(180,193,209)
roomBrowserInfo.TextSize=11
roomBrowserInfo.TextWrapped=true
roomBrowserInfo.Font=Enum.Font.GothamMedium
roomBrowserInfo.TextXAlignment=Enum.TextXAlignment.Left
roomBrowserInfo.ZIndex=21
roomBrowserInfo.Parent=roomBrowserPanel

local visibilityLabel=Instance.new("TextLabel")
visibilityLabel.Size=UDim2.new(1,-20,0,20)
visibilityLabel.Position=UDim2.fromOffset(10,80)
visibilityLabel.BackgroundTransparency=1
visibilityLabel.Text="방 공개 범위"
visibilityLabel.TextColor3=Color3.fromRGB(220,226,235)
visibilityLabel.TextSize=12
visibilityLabel.Font=Enum.Font.GothamBold
visibilityLabel.TextXAlignment=Enum.TextXAlignment.Left
visibilityLabel.ZIndex=21
visibilityLabel.Parent=roomBrowserPanel

local selectedRoomVisibility="PUBLIC"
local visibilityButtons={}
local visibilitySpecs={
 {"PUBLIC","공개",Color3.fromRGB(51,104,129)},
 {"FRIENDS","친구만",Color3.fromRGB(77,91,132)},
 {"PRIVATE","비공개",Color3.fromRGB(91,72,105)},
}
local function refreshVisibilityButtons()
 for id,button in pairs(visibilityButtons)do
  button.BackgroundTransparency=id==selectedRoomVisibility and 0 or .32
  button.Text=(id==selectedRoomVisibility and"✓ "or"")..(id=="PUBLIC"and"공개"or id=="FRIENDS"and"친구만"or"비공개")
 end
end
for i,spec in ipairs(visibilitySpecs)do
 local b=makeButton(roomBrowserPanel,spec[2],spec[3])
 b.Size=UDim2.fromOffset(96,38)
 b.Position=UDim2.fromOffset(10+(i-1)*105,103)
 b.ZIndex=21
 visibilityButtons[spec[1]]=b
 b.Activated:Connect(function()selectedRoomVisibility=spec[1];refreshVisibilityButtons()end)
end
refreshVisibilityButtons()

local createRoomButton=makeButton(roomBrowserPanel,"방 만들기",Color3.fromRGB(48,126,104))
createRoomButton.Size=UDim2.new(1,-20,0,44)
createRoomButton.Position=UDim2.fromOffset(10,150)
createRoomButton.ZIndex=21
createRoomButton.Activated:Connect(function()
 actionSfx.TimePosition=0;actionSfx:Play()
 remote:FireServer(C.Actions.CREATE_ROOM,selectedRoomVisibility)
end)

local quickPublicButton=makeButton(roomBrowserPanel,"공개 방 빠른 참가",Color3.fromRGB(58,92,128))
quickPublicButton.Size=UDim2.fromOffset(146,38)
quickPublicButton.Position=UDim2.fromOffset(10,202)
quickPublicButton.ZIndex=21
quickPublicButton.Activated:Connect(function()remote:FireServer(C.Actions.QUICK_JOIN_PUBLIC)end)

local quickFriendButton=makeButton(roomBrowserPanel,"친구 방 찾기",Color3.fromRGB(78,75,122))
quickFriendButton.Size=UDim2.fromOffset(146,38)
quickFriendButton.Position=UDim2.fromOffset(174,202)
quickFriendButton.ZIndex=21
quickFriendButton.Activated:Connect(function()remote:FireServer(C.Actions.QUICK_JOIN_FRIEND)end)

local roomCodeBox=Instance.new("TextBox")
roomCodeBox.Name="RoomCodeInput"
roomCodeBox.Size=UDim2.fromOffset(190,40)
roomCodeBox.Position=UDim2.fromOffset(10,250)
roomCodeBox.BackgroundColor3=Color3.fromRGB(35,39,48)
roomCodeBox.TextColor3=Color3.fromRGB(239,242,247)
roomCodeBox.PlaceholderText="6자리 방 코드"
roomCodeBox.PlaceholderColor3=Color3.fromRGB(132,143,158)
roomCodeBox.Text=""
roomCodeBox.TextSize=16
roomCodeBox.Font=Enum.Font.GothamBold
roomCodeBox.ClearTextOnFocus=false
roomCodeBox.MultiLine=false
roomCodeBox.ZIndex=21
roomCodeBox.Parent=roomBrowserPanel
roundify(roomCodeBox,10);outline(roomCodeBox,.55)

local roomCodeJoin=makeButton(roomBrowserPanel,"코드 참가",Color3.fromRGB(87,79,105))
roomCodeJoin.Size=UDim2.fromOffset(110,40)
roomCodeJoin.Position=UDim2.fromOffset(210,250)
roomCodeJoin.ZIndex=21
local function submitRoomCode()remote:FireServer(C.Actions.JOIN_ROOM_CODE,roomCodeBox.Text)end
roomCodeJoin.Activated:Connect(submitRoomCode)
roomCodeBox.FocusLost:Connect(function(enterPressed)if enterPressed then submitRoomCode()end end)

local roomBrowserFeedback=Instance.new("TextLabel")
roomBrowserFeedback.Size=UDim2.new(1,-20,0,25)
roomBrowserFeedback.Position=UDim2.fromOffset(10,296)
roomBrowserFeedback.BackgroundTransparency=1
roomBrowserFeedback.Text=""
roomBrowserFeedback.TextColor3=Color3.fromRGB(187,199,214)
roomBrowserFeedback.TextSize=11
roomBrowserFeedback.Font=Enum.Font.GothamMedium
roomBrowserFeedback.TextXAlignment=Enum.TextXAlignment.Left
roomBrowserFeedback.ZIndex=21
roomBrowserFeedback.Parent=roomBrowserPanel

-- 실제 3D 로비의 코드 단말에서만 잠깐 열리는 작은 입력창.

local worldCodePanel=Instance.new("Frame")
worldCodePanel.Name="WorldLobbyCodePanel"
worldCodePanel.AnchorPoint=Vector2.new(.5,.5)
worldCodePanel.Position=UDim2.fromScale(.5,.68)
worldCodePanel.Size=UDim2.fromOffset(300,104)
worldCodePanel.BackgroundColor3=Color3.fromRGB(21,24,31)
worldCodePanel.BackgroundTransparency=.03
worldCodePanel.ZIndex=40
worldCodePanel.Visible=false
worldCodePanel.Parent=gui
roundify(worldCodePanel,13);outline(worldCodePanel,.35)

local worldCodeTitle=Instance.new("TextLabel")
worldCodeTitle.Size=UDim2.new(1,-20,0,28)
worldCodeTitle.Position=UDim2.fromOffset(10,7)
worldCodeTitle.BackgroundTransparency=1
worldCodeTitle.Text="방 코드 입력"
worldCodeTitle.TextColor3=Color3.fromRGB(239,243,248)
worldCodeTitle.TextSize=17
worldCodeTitle.Font=Enum.Font.GothamBold
worldCodeTitle.ZIndex=41
worldCodeTitle.Parent=worldCodePanel

local worldCodeBox=Instance.new("TextBox")
worldCodeBox.Size=UDim2.fromOffset(178,42)
worldCodeBox.Position=UDim2.fromOffset(10,47)
worldCodeBox.BackgroundColor3=Color3.fromRGB(35,39,48)
worldCodeBox.TextColor3=Color3.fromRGB(239,242,247)
worldCodeBox.PlaceholderText="6자리 코드"
worldCodeBox.Text=""
worldCodeBox.TextSize=18
worldCodeBox.Font=Enum.Font.GothamBold
worldCodeBox.ClearTextOnFocus=false
worldCodeBox.ZIndex=41
worldCodeBox.Parent=worldCodePanel
roundify(worldCodeBox,9)

local worldCodeJoin=makeButton(worldCodePanel,"참가",Color3.fromRGB(70,93,125))
worldCodeJoin.Size=UDim2.fromOffset(92,42)
worldCodeJoin.Position=UDim2.fromOffset(198,47)
worldCodeJoin.ZIndex=41

local function submitWorldCode()
 local code=tostring(worldCodeBox.Text or""):gsub("%s+","")
 if code==""then return end
 remote:FireServer(C.Actions.JOIN_ROOM_CODE,code)
 worldCodePanel.Visible=false
 worldCodeBox:ReleaseFocus()
end
worldCodeJoin.Activated:Connect(submitWorldCode)
worldCodeBox.FocusLost:Connect(function(enterPressed)if enterPressed then submitWorldCode()end end)

local roomInfoPanel=Instance.new("Frame")
roomInfoPanel.Name="RoomInfo"
roomInfoPanel.AnchorPoint=Vector2.new(.5,0)
roomInfoPanel.Position=UDim2.new(.5,0,0,92)
roomInfoPanel.Size=UDim2.fromOffset(320,78)
roomInfoPanel.BackgroundColor3=Color3.fromRGB(23,26,34)
roomInfoPanel.BackgroundTransparency=.04
roomInfoPanel.ZIndex=18
roomInfoPanel.Visible=false
roomInfoPanel.Parent=gui
roundify(roomInfoPanel,13);outline(roomInfoPanel,.4)

local roomInfoLabel=Instance.new("TextLabel")
roomInfoLabel.Size=UDim2.new(1,-142,1,-12)
roomInfoLabel.Position=UDim2.fromOffset(10,6)
roomInfoLabel.BackgroundTransparency=1
roomInfoLabel.TextColor3=Color3.fromRGB(226,232,240)
roomInfoLabel.TextSize=11
roomInfoLabel.TextWrapped=true
roomInfoLabel.Font=Enum.Font.GothamBold
roomInfoLabel.TextXAlignment=Enum.TextXAlignment.Left
roomInfoLabel.TextYAlignment=Enum.TextYAlignment.Center
roomInfoLabel.ZIndex=19
roomInfoLabel.Parent=roomInfoPanel

local roomStartButton=makeButton(roomInfoPanel,"게임 시작",Color3.fromRGB(45,126,96))
roomStartButton.Size=UDim2.fromOffset(116,32)
roomStartButton.Position=UDim2.new(1,-126,0,7)
roomStartButton.ZIndex=19
roomStartButton.Activated:Connect(function()remote:FireServer(C.Actions.START_ROOM)end)

local roomLeaveButton=makeButton(roomInfoPanel,"방 나가기",Color3.fromRGB(98,62,71))
roomLeaveButton.Size=UDim2.fromOffset(116,27)
roomLeaveButton.Position=UDim2.new(1,-126,0,44)
roomLeaveButton.ZIndex=19
roomLeaveButton.Activated:Connect(function()remote:FireServer(C.Actions.LEAVE_ROOM)end)

local roomSlotsPanel=Instance.new("Frame")
roomSlotsPanel.Name="RoomSlots"
roomSlotsPanel.AnchorPoint=Vector2.new(.5,0)
roomSlotsPanel.Position=UDim2.new(.5,0,0,176)
roomSlotsPanel.Size=UDim2.fromOffset(320,86)
roomSlotsPanel.BackgroundColor3=Color3.fromRGB(23,26,34)
roomSlotsPanel.BackgroundTransparency=.05
roomSlotsPanel.ZIndex=18
roomSlotsPanel.Visible=false
roomSlotsPanel.Parent=gui
roundify(roomSlotsPanel,12);outline(roomSlotsPanel,.45)

local roomSlotLabels={}
for i=1,8 do
 local slot=Instance.new("TextLabel")
 slot.Name="RoomSlot"..i
 slot.Size=UDim2.fromOffset(72,32)
 local col=(i-1)%4
 local row=math.floor((i-1)/4)
 slot.Position=UDim2.fromOffset(8+col*78,8+row*38)
 slot.BackgroundColor3=Color3.fromRGB(35,39,49)
 slot.BackgroundTransparency=.08
 slot.TextColor3=Color3.fromRGB(214,221,231)
 slot.TextSize=9
 slot.TextWrapped=true
 slot.Font=Enum.Font.GothamBold
 slot.ZIndex=19
 slot.Parent=roomSlotsPanel
 roundify(slot,8)
 roomSlotLabels[i]=slot
end

local function refreshRoomSlots()
 local list=Players:GetPlayers()
 local hostId=tonumber(p:GetAttribute("RoomHostUserId"))or 0
 table.sort(list,function(a,b)
  if a.UserId==hostId then return true end
  if b.UserId==hostId then return false end
  return a.UserId<b.UserId
 end)
 for i=1,8 do
  local slot=roomSlotLabels[i]
  local player=list[i]
  if player then
   local host=player.UserId==hostId
   local selfMark=player==p and" · 나"or""
   slot.Text=(host and"방장 · "or"")..player.DisplayName..selfMark
   slot.BackgroundColor3=host and Color3.fromRGB(70,78,101)or Color3.fromRGB(35,39,49)
  else
   slot.Text="AI"
   slot.BackgroundColor3=Color3.fromRGB(47,50,58)
  end
 end
end

local resultTitle
local shopPanel

-- 세계 괴담 도감: 수집 진행만 보여주며 전투 능력치에는 영향을 주지 않는다.
local ghostBookPanel=Instance.new("Frame")
ghostBookPanel.Name="GhostCompendium"
ghostBookPanel.AnchorPoint=Vector2.new(.5,.5)
ghostBookPanel.Position=UDim2.fromScale(.5,.5)
ghostBookPanel.Size=UDim2.fromOffset(342,430)
ghostBookPanel.BackgroundColor3=Color3.fromRGB(18,21,29)
ghostBookPanel.BackgroundTransparency=.02
ghostBookPanel.ZIndex=34
ghostBookPanel.Visible=false
ghostBookPanel.Parent=gui
roundify(ghostBookPanel,16);outline(ghostBookPanel,.28)

local ghostBookTitle=Instance.new("TextLabel")
ghostBookTitle.Size=UDim2.new(1,-90,0,30)
ghostBookTitle.Position=UDim2.fromOffset(12,10)
ghostBookTitle.BackgroundTransparency=1
ghostBookTitle.Text="세계 괴담 도감"
ghostBookTitle.TextColor3=Color3.fromRGB(230,220,255)
ghostBookTitle.TextSize=20
ghostBookTitle.Font=Enum.Font.GothamBold
ghostBookTitle.TextXAlignment=Enum.TextXAlignment.Left
ghostBookTitle.ZIndex=35
ghostBookTitle.Parent=ghostBookPanel

local ghostBookClose=makeButton(ghostBookPanel,"닫기",Color3.fromRGB(72,76,88))
ghostBookClose.Size=UDim2.fromOffset(64,30)
ghostBookClose.Position=UDim2.new(1,-76,0,10)
ghostBookClose.ZIndex=35

local ghostBookSummary=Instance.new("TextLabel")
ghostBookSummary.Size=UDim2.new(1,-24,0,38)
ghostBookSummary.Position=UDim2.fromOffset(12,43)
ghostBookSummary.BackgroundTransparency=1
ghostBookSummary.TextColor3=Color3.fromRGB(184,193,210)
ghostBookSummary.TextSize=11
ghostBookSummary.TextWrapped=true
ghostBookSummary.Font=Enum.Font.GothamMedium
ghostBookSummary.TextXAlignment=Enum.TextXAlignment.Left
ghostBookSummary.ZIndex=35
ghostBookSummary.Parent=ghostBookPanel

local ghostBookList=Instance.new("ScrollingFrame")
ghostBookList.Name="GhostList"
ghostBookList.Size=UDim2.new(1,-20,1,-92)
ghostBookList.Position=UDim2.fromOffset(10,84)
ghostBookList.BackgroundTransparency=1
ghostBookList.BorderSizePixel=0
ghostBookList.ScrollBarThickness=4
ghostBookList.AutomaticCanvasSize=Enum.AutomaticSize.Y
ghostBookList.CanvasSize=UDim2.new()
ghostBookList.ZIndex=35
ghostBookList.Parent=ghostBookPanel

local ghostBookLayout=Instance.new("UIListLayout")
ghostBookLayout.Padding=UDim.new(0,7)
ghostBookLayout.SortOrder=Enum.SortOrder.LayoutOrder
ghostBookLayout.Parent=ghostBookList

local ghostBookRows={}
for index,item in ipairs(C.GhostCatalog or{})do
 local row=Instance.new("Frame")
 row.Name="Ghost_"..item.Id
 row.Size=UDim2.new(1,-4,0,62)
 row.BackgroundColor3=Color3.fromRGB(30,34,44)
 row.BackgroundTransparency=.04
 row.LayoutOrder=index
 row.ZIndex=35
 row.Parent=ghostBookList
 roundify(row,10)

 local accent=Instance.new("Frame")
 accent.Size=UDim2.fromOffset(5,48)
 accent.Position=UDim2.fromOffset(7,7)
 accent.BackgroundColor3=item.Color or Color3.fromRGB(170,175,190)
 accent.BorderSizePixel=0
 accent.ZIndex=36
 accent.Parent=row
 roundify(accent,4)

 local label=Instance.new("TextLabel")
 label.Size=UDim2.new(1,-28,1,-8)
 label.Position=UDim2.fromOffset(20,4)
 label.BackgroundTransparency=1
 label.TextColor3=Color3.fromRGB(229,233,241)
 label.TextSize=10
 label.TextWrapped=true
 label.Font=Enum.Font.GothamBold
 label.TextXAlignment=Enum.TextXAlignment.Left
 label.TextYAlignment=Enum.TextYAlignment.Center
 label.ZIndex=36
 label.Parent=row

 ghostBookRows[item.Id]={row=row,label=label,item=item}
end

local function ghostProgressSet()
 local progress={}
 for id,stage in string.gmatch(tostring(p:GetAttribute("GhostProgress")or""),"([^:,]+):(%d+)")do progress[id]=tonumber(stage)or 0 end
 return progress
end
local function mapLabel(id)
 return id=="SCHOOL"and"학교"or id=="HOSPITAL"and"폐병원"or id=="THEME_PARK"and"폐놀이공원"or id
end
local function updateGhostBookUI()
 local progress=ghostProgressSet()
 local completed=tonumber(p:GetAttribute("GhostCompleted"))or 0
 local total=tonumber(p:GetAttribute("GhostTotal"))or #(C.GhostCatalog or{})
 local fragments=tonumber(p:GetAttribute("GhostFragments"))or 0
 local contracts=tonumber(p:GetAttribute("GhostContracts"))or 0
 ghostBookSummary.Text=string.format("완성 %d/%d · 괴담 조각 %d/24 · 계약서 %d\n%s",completed,total,fragments,contracts,tostring(p:GetAttribute("GhostTitle")or"괴담 견습생"))
 for id,data in pairs(ghostBookRows)do
  local item=data.item
  local stage=math.clamp(tonumber(progress[id])or 0,0,3)
  local stageText=stage>0 and(item.Stages and item.Stages[stage]or("목격 "..stage.."단계"))or"미목격"
  local status=stage>=3 and"완성"or string.format("%d/3",stage)
  data.label.Text=string.format("%s · %s\n%s · %s · %s",item.Name,item.Origin,mapLabel(item.Map),stageText,status)
  data.row.BackgroundTransparency=stage>=3 and 0 or .04
 end
end

ghostBookOpenButton.Activated:Connect(function()
 ghostBookPanel.Visible=true
 shopPanel.Visible=false
 updateGhostBookUI()
end)
ghostBookClose.Activated:Connect(function()ghostBookPanel.Visible=false end)

-- 코스메틱 상점: 전투 능력치는 바꾸지 않고 프로필 프레임/칭호/결과 화면 색만 바꾼다.
shopPanel=Instance.new("Frame")
shopPanel.Name="CosmeticShop"
shopPanel.AnchorPoint=Vector2.new(.5,.5)
shopPanel.Position=UDim2.fromScale(.5,.5)
shopPanel.Size=UDim2.fromOffset(324,356)
shopPanel.BackgroundColor3=Color3.fromRGB(20,23,30)
shopPanel.BackgroundTransparency=.02
shopPanel.ZIndex=30
shopPanel.Visible=false
shopPanel.Parent=gui
roundify(shopPanel,16);outline(shopPanel,.3)

local shopTitle=Instance.new("TextLabel")
shopTitle.Size=UDim2.new(1,-88,0,30)
shopTitle.Position=UDim2.fromOffset(12,10)
shopTitle.BackgroundTransparency=1
shopTitle.Text="코스메틱 상점"
shopTitle.TextColor3=Color3.fromRGB(240,243,248)
shopTitle.TextSize=20
shopTitle.Font=Enum.Font.GothamBold
shopTitle.TextXAlignment=Enum.TextXAlignment.Left
shopTitle.ZIndex=31
shopTitle.Parent=shopPanel

local shopCoins=Instance.new("TextLabel")
shopCoins.Size=UDim2.fromOffset(112,24)
shopCoins.Position=UDim2.fromOffset(12,42)
shopCoins.BackgroundTransparency=1
shopCoins.TextColor3=Color3.fromRGB(255,211,118)
shopCoins.TextSize=13
shopCoins.Font=Enum.Font.GothamBold
shopCoins.TextXAlignment=Enum.TextXAlignment.Left
shopCoins.ZIndex=31
shopCoins.Parent=shopPanel

local shopClose=makeButton(shopPanel,"닫기",Color3.fromRGB(72,76,88))
shopClose.Size=UDim2.fromOffset(64,30)
shopClose.Position=UDim2.new(1,-76,0,10)
shopClose.ZIndex=31

local shopFeedback=Instance.new("TextLabel")
shopFeedback.Size=UDim2.new(1,-24,0,24)
shopFeedback.Position=UDim2.fromOffset(12,66)
shopFeedback.BackgroundTransparency=1
shopFeedback.TextColor3=Color3.fromRGB(184,193,208)
shopFeedback.TextSize=11
shopFeedback.Font=Enum.Font.GothamMedium
shopFeedback.TextXAlignment=Enum.TextXAlignment.Left
shopFeedback.ZIndex=31
shopFeedback.Parent=shopPanel

local shopList=Instance.new("ScrollingFrame")
shopList.Name="CosmeticList"
shopList.Size=UDim2.new(1,-20,1,-100)
shopList.Position=UDim2.fromOffset(10,92)
shopList.BackgroundTransparency=1
shopList.BorderSizePixel=0
shopList.ScrollBarThickness=4
shopList.AutomaticCanvasSize=Enum.AutomaticSize.Y
shopList.CanvasSize=UDim2.new()
shopList.ZIndex=31
shopList.Parent=shopPanel

local shopLayout=Instance.new("UIListLayout")
shopLayout.Padding=UDim.new(0,7)
shopLayout.SortOrder=Enum.SortOrder.LayoutOrder
shopLayout.Parent=shopList

local cosmeticButtons={}
local function ownedCosmeticSet()
 local owned={DEFAULT=true}
 for id in string.gmatch(tostring(p:GetAttribute("OwnedCosmetics")or"DEFAULT"),"[^,]+")do owned[id]=true end
 return owned
end
local function cosmeticItem(id)
 for _,item in ipairs(C.Cosmetics or{})do if item.Id==id then return item end end
 return(C.Cosmetics and C.Cosmetics[1])or{Id="DEFAULT",Name="기본 프레임",Price=0,Accent=Color3.fromRGB(170,209,220),Title="신입 참가자"}
end
local function loreItem(id)
 for _,item in ipairs(C.Lore or{})do if item.Id==id then return item end end
 return nil
end
for index,item in ipairs(C.Cosmetics or{})do
 local row=Instance.new("Frame")
 row.Name="Cosmetic_"..item.Id
 row.Size=UDim2.new(1,-4,0,48)
 row.BackgroundColor3=Color3.fromRGB(31,35,44)
 row.BackgroundTransparency=.04
 row.LayoutOrder=index
 row.ZIndex=31
 row.Parent=shopList
 roundify(row,10)

 local accent=Instance.new("Frame")
 accent.Size=UDim2.fromOffset(5,36)
 accent.Position=UDim2.fromOffset(7,6)
 accent.BackgroundColor3=item.Accent
 accent.BorderSizePixel=0
 accent.ZIndex=32
 accent.Parent=row
 roundify(accent,4)

 local label=Instance.new("TextLabel")
 label.Size=UDim2.new(1,-128,1,-8)
 label.Position=UDim2.fromOffset(19,4)
 label.BackgroundTransparency=1
 label.Text=string.format("%s\n%s",item.Name,item.Title)
 label.TextColor3=Color3.fromRGB(230,234,241)
 label.TextSize=11
 label.TextWrapped=true
 label.Font=Enum.Font.GothamBold
 label.TextXAlignment=Enum.TextXAlignment.Left
 label.ZIndex=32
 label.Parent=row

 local action=makeButton(row,"-",Color3.fromRGB(65,74,91))
 action.Size=UDim2.fromOffset(98,36)
 action.Position=UDim2.new(1,-105,0,6)
 action.ZIndex=32
 cosmeticButtons[item.Id]=action
 action.Activated:Connect(function()
  local owned=ownedCosmeticSet()
  local equipped=tostring(p:GetAttribute("EquippedCosmetic")or"DEFAULT")
  if equipped==item.Id then return end
  actionSfx.TimePosition=0;actionSfx:Play()
  if owned[item.Id]then remote:FireServer(C.Actions.EQUIP_COSMETIC,item.Id)
  else remote:FireServer(C.Actions.BUY_COSMETIC,item.Id)end
 end)
end

local function updateCosmeticUI()
 local owned=ownedCosmeticSet()
 local equipped=tostring(p:GetAttribute("EquippedCosmetic")or"DEFAULT")
 local equippedItem=cosmeticItem(equipped)
 local accent=equippedItem.Accent or Color3.fromRGB(170,209,220)
 shopCoins.Text=string.format("보유 %d 코인",tonumber(p:GetAttribute("Coins"))or 0)
 shopTitle.TextColor3=accent
 ruleTitle.TextColor3=accent
 setupTitle.TextColor3=accent
 if resultTitle then resultTitle.TextColor3=accent end
 selectionStatus.TextColor3=accent
 loadingFill.BackgroundColor3=Color3.fromRGB(188,146,77)
 for _,item in ipairs(C.Cosmetics or{})do
  local button=cosmeticButtons[item.Id]
  if button then
   if equipped==item.Id then
    button.Text="장착 중";button.BackgroundColor3=accent
   elseif owned[item.Id]then
    button.Text="장착";button.BackgroundColor3=Color3.fromRGB(65,91,82)
   else
    button.Text=string.format("%d 코인",item.Price or 0);button.BackgroundColor3=Color3.fromRGB(72,67,85)
   end
  end
 end
end

shopOpenButton.Activated:Connect(function()
 shopPanel.Visible=true
 updateCosmeticUI()
end)
shopClose.Activated:Connect(function()shopPanel.Visible=false end)

local function currentHumanFormInfo()
 local id=tostring(p:GetAttribute("HumanForm")or"BROADCAST")
 for _,row in ipairs(C.HumanForms or{})do if row.Id==id then return row end end
 return(C.HumanForms and C.HumanForms[1])or{Id="BROADCAST",Name="방송부",Tool="신호 송신기",InfectedAbility="FALSE_ALARM"}
end
local function currentMonsterFormInfo()
 local id=tostring(p:GetAttribute("MonsterForm")or"DRACULA")
 for _,row in ipairs(C.MonsterForms or{})do if row.Id==id then return row end end
 return(C.MonsterForms and C.MonsterForms[1])or{Id="DRACULA",Name="드라큘라",Ability="BAT_DASH"}
end
local function currentHumanAbilityProfile()
 local hf=currentHumanFormInfo()
 local id=hf.ActiveAbility
 return id,(id and C.HumanAbilities and C.HumanAbilities[id])or nil
end
local function currentHumanAbilityName()
 local id,profile=currentHumanAbilityProfile()
 return profile and profile.Name or tostring(id or"인간 스킬")
end
local function currentHumanAbilityDescription()
 local _,profile=currentHumanAbilityProfile()
 return profile and tostring(profile.Description or"")or""
end
local function currentAbilityName()
 if p:GetAttribute("Infected")==true then
  local hf=currentHumanFormInfo()
  local profile=C.InfectedAbilities and C.InfectedAbilities[hf.InfectedAbility]
  return profile and profile.Name or tostring(hf.InfectedAbility or"감염 스킬")
 end
 local mf=currentMonsterFormInfo()
 local profile=C.MonsterAbilities and C.MonsterAbilities[mf.Ability]
 return profile and profile.Name or(C.MonsterAbilityLabels and C.MonsterAbilityLabels[mf.Ability])or mf.Name or"괴물 스킬"
end
local function currentAbilityProfile()
 if p:GetAttribute("Infected")==true then
  local hf=currentHumanFormInfo()
  return C.InfectedAbilities and C.InfectedAbilities[hf.InfectedAbility]or nil
 end
 local mf=currentMonsterFormInfo()
 return C.MonsterAbilities and C.MonsterAbilities[mf.Ability]or nil
end
local function currentAbilityDescription()
 local profile=currentAbilityProfile()
 return profile and tostring(profile.Description or"")or""
end
local function abilityRangeLabel(profile)
 if not profile then return "범위 정보 없음" end
 local radius=tonumber(profile.Radius)or tonumber(profile.Range)
 if radius then return string.format("범위 %dm",math.floor(radius+.5))end
 local effectRadius=tonumber(profile.DrainRadius)or tonumber(profile.ShockRadius)
 if effectRadius then return string.format("효과 %dm",math.floor(effectRadius+.5))end
 local distance=tonumber(profile.Distance)
 if distance then return string.format("이동 %dm",math.floor(distance+.5))end
 local bonus=tonumber(profile.InfectRangeBonus)
 if bonus then return string.format("감염 +%dm",math.floor(bonus+.5))end
 return "이동형"
end
local function abilityGuideText(name,profile,cost,cooldownSeconds,status)
 local purpose=profile and tostring(profile.Description or"특수 능력")or"특수 능력"
 return string.format("%s\n%s · %s\n쿨 %d초 · %dE%s",name,purpose,abilityRangeLabel(profile),math.floor(math.max(0,tonumber(cooldownSeconds)or 0)+.5),math.floor(math.max(0,tonumber(cost)or 0)+.5),status and(" · "..status)or"")
end

-- 라운드 행동 버튼: 역할에 따라 딱 필요한 버튼만 노출
local actionDock=Instance.new("Frame")
actionDock.Name="RoundActions"
actionDock.AnchorPoint=Vector2.new(.5,1)
actionDock.Position=UDim2.new(.5,0,1,-20)
actionDock.Size=UDim2.fromOffset(338,86)
actionDock.BackgroundTransparency=1
actionDock.ZIndex=30
actionDock.Parent=gui

local combatActionStatus=Instance.new("TextLabel")
combatActionStatus.Name="CombatActionStatus"
combatActionStatus.AnchorPoint=Vector2.new(.5,1)
combatActionStatus.Position=UDim2.new(.5,0,0,-6)
combatActionStatus.Size=UDim2.fromOffset(318,28)
combatActionStatus.BackgroundColor3=Color3.fromRGB(23,27,34)
combatActionStatus.BackgroundTransparency=.12
combatActionStatus.TextColor3=Color3.fromRGB(234,224,204)
combatActionStatus.TextSize=12
combatActionStatus.Font=Enum.Font.GothamBold
combatActionStatus.Text="전투 HUD 동기화 중"
combatActionStatus.TextWrapped=true
combatActionStatus.ZIndex=34
combatActionStatus.Visible=false
combatActionStatus.Parent=actionDock
roundify(combatActionStatus,9);outline(combatActionStatus,.5)

local rescueButton=makeButton(actionDock,"정화 공격",Color3.fromRGB(75,91,94))
rescueButton.Size=UDim2.fromOffset(92,72);rescueButton.Position=UDim2.fromOffset(0,6);rescueButton.ZIndex=31
rescueButton.Activated:Connect(function()setMotionImpulse("PURIFY",.34);actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.PURIFY)end)

local dashButton=makeButton(actionDock,"대시",Color3.fromRGB(87,78,66))
dashButton.Size=UDim2.fromOffset(92,72);dashButton.Position=UDim2.fromOffset(98,6);dashButton.ZIndex=31
dashButton.Activated:Connect(function()setMotionImpulse("DASH",.38);actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.DASH)end)

local humanAbilityButton=makeButton(actionDock,"인간 스킬",Color3.fromRGB(61,96,105))
humanAbilityButton.Size=UDim2.fromOffset(142,76);humanAbilityButton.Position=UDim2.fromOffset(196,4);humanAbilityButton.ZIndex=32
humanAbilityButton.TextScaled=false;humanAbilityButton.TextSize=11;humanAbilityButton.TextWrapped=true
humanAbilityButton.Activated:Connect(function()
 setMotionImpulse("ABILITY",.42);actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.HUMAN_ABILITY)
end)

local infectButton=makeButton(actionDock,"감염 공격",Color3.fromRGB(111,45,49))
infectButton.Size=UDim2.fromOffset(116,72);infectButton.Position=UDim2.fromOffset(42,6);infectButton.ZIndex=31
infectButton.Activated:Connect(function()setMotionImpulse("INFECT_ATTACK",.34);actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.INFECT_ATTACK)end)

local abilityButton=makeButton(actionDock,"괴물 스킬",Color3.fromRGB(72,55,77))
abilityButton.Size=UDim2.fromOffset(150,76);abilityButton.Position=UDim2.fromOffset(166,4);abilityButton.ZIndex=32
abilityButton.TextScaled=false;abilityButton.TextSize=11;abilityButton.TextWrapped=true
abilityButton.Activated:Connect(function()setMotionImpulse("ABILITY",.44);actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.ABILITY)end)

-- 액션 쿨다운과 에너지 비용은 서버 상태 기준으로 표시한다.
local cooldownClock=0
local function updateCooldownButton(button,readyAt,readyText,cooldownText,cost,guideProfile,guideCooldown)
 local left=math.max(0,(tonumber(readyAt)or 0)-workspace:GetServerTimeNow())
 local energy=tonumber(p:GetAttribute("Energy"))or 0
 local need=math.max(0,tonumber(cost)or 0)
 local cooldownReady=left<=0
 local energyReady=energy+1e-4>=need
 local ready=cooldownReady and energyReady
 button.Active=ready
 button.AutoButtonColor=ready
 button.BackgroundTransparency=ready and 0 or .28
 if guideProfile then
  local status=not cooldownReady and string.format("%.1f초 남음",left)or not energyReady and"에너지 부족"or"준비"
  button.Text=abilityGuideText(readyText,guideProfile,need,guideCooldown,status)
 elseif not cooldownReady then button.Text=string.format("%s %.1f",cooldownText,left)
 elseif not energyReady then button.Text=string.format("%s %dE",cooldownText,need)
 else button.Text=readyText end
end
RunService.RenderStepped:Connect(function(dt)
 cooldownClock+=dt
 if cooldownClock<.08 then return end
 cooldownClock=0
 local energy=math.max(0,tonumber(p:GetAttribute("Energy"))or 0)
 local maxEnergy=math.max(1,tonumber(p:GetAttribute("EnergyMax"))or tonumber(C.Energy and C.Energy.Max)or 100)
 energyFill.Size=UDim2.fromScale(math.clamp(energy/maxEnergy,0,1),1)
 energyLabel.Text=string.format("에너지 %d/%d",math.floor(energy+.5),math.floor(maxEnergy+.5))
 local pressure=tostring(p:GetAttribute("PressurePassive")or"")
 pressureLabel.Text=pressure~=""and("열세 패시브 · "..pressure)or""
 pressureLabel.Visible=pressure~=""and p:GetAttribute("RoundState")=="RUNNING"

 updateCooldownButton(rescueButton,p:GetAttribute("PurifyReadyAt"),"정화 공격","정화",C.Energy and C.Energy.PurifyCost or 35)
 updateCooldownButton(dashButton,p:GetAttribute("DashReadyAt"),"대시","대시",C.Energy and C.Energy.DashCost or 25)
 local _,humanAbilityProfile=currentHumanAbilityProfile()
 updateCooldownButton(humanAbilityButton,p:GetAttribute("HumanAbilityReadyAt"),"★ "..currentHumanAbilityName(),"스킬",humanAbilityProfile and humanAbilityProfile.Cost or 30,humanAbilityProfile,humanAbilityProfile and humanAbilityProfile.Cooldown or 8)
 updateCooldownButton(infectButton,p:GetAttribute("InfectReadyAt"),"감염 공격","감염",C.Energy and C.Energy.InfectAttackCost or 30)
 local monsterAbilityProfile=currentAbilityProfile()
 updateCooldownButton(abilityButton,p:GetAttribute("AbilityReadyAt"),"★ "..currentAbilityName(),"스킬",C.Energy and C.Energy.AbilityCost or 45,monsterAbilityProfile,C.MonsterAbilityCooldown or 7)

 local now=workspace:GetServerTimeNow()
 local blackout=(tonumber(p:GetAttribute("BlackoutUntil"))or 0)>now
 local flash=(tonumber(p:GetAttribute("HuntFlashUntil"))or 0)>now
 local alarm=(tonumber(p:GetAttribute("FalseAlarmUntil"))or 0)>now
 threatEffectLayer.Visible=blackout or flash or alarm
 threatEffectText.Visible=threatEffectLayer.Visible
 if blackout then
  threatEffectLayer.BackgroundColor3=Color3.fromRGB(2,2,4);threatEffectLayer.BackgroundTransparency=.28
  threatEffectText.Text="정전 · 시야가 차단됐어"
 elseif flash then
  threatEffectLayer.BackgroundColor3=Color3.fromRGB(236,228,211);threatEffectLayer.BackgroundTransparency=.56
  threatEffectText.Text="사냥 플래시 · 움직임 둔화"
 elseif alarm then
  threatEffectLayer.BackgroundColor3=Color3.fromRGB(92,12,18);threatEffectLayer.BackgroundTransparency=.84
  threatEffectText.Text="경보 · 가까운 곳에 몬스터가 감지됐어"
 else
  threatEffectLayer.BackgroundTransparency=1;threatEffectText.Text=""
 end
end)

-- 라운드 결과 화면
local resultPanel=Instance.new("Frame")
resultPanel.Name="RoundResult"
resultPanel.AnchorPoint=Vector2.new(.5,.5)
resultPanel.Position=UDim2.fromScale(.5,.31)
resultPanel.Size=UDim2.fromOffset(340,282)
resultPanel.BackgroundColor3=Color3.fromRGB(13,12,12)
resultPanel.BackgroundTransparency=.08
resultPanel.ZIndex=20
resultPanel.Visible=false
resultPanel.Parent=gui
roundify(resultPanel,9);outline(resultPanel,.52)

local resultCinemaTop=Instance.new("Frame")
resultCinemaTop.Name="ResultCinemaTop"
resultCinemaTop.Size=UDim2.new(1,0,0,0)
resultCinemaTop.Position=UDim2.fromScale(0,0)
resultCinemaTop.BackgroundColor3=Color3.fromRGB(4,4,5)
resultCinemaTop.BorderSizePixel=0
resultCinemaTop.ZIndex=60
resultCinemaTop.Visible=false
resultCinemaTop.Parent=gui

local resultCinemaBottom=resultCinemaTop:Clone()
resultCinemaBottom.Name="ResultCinemaBottom"
resultCinemaBottom.AnchorPoint=Vector2.new(0,1)
resultCinemaBottom.Position=UDim2.fromScale(0,1)
resultCinemaBottom.Parent=gui

local resultCinemaShade=Instance.new("Frame")
resultCinemaShade.Name="ResultCinemaShade"
resultCinemaShade.Size=UDim2.fromScale(1,1)
resultCinemaShade.BackgroundColor3=Color3.fromRGB(5,5,7)
resultCinemaShade.BackgroundTransparency=1
resultCinemaShade.BorderSizePixel=0
resultCinemaShade.ZIndex=18
resultCinemaShade.Visible=false
resultCinemaShade.Parent=gui

resultTitle=Instance.new("TextLabel")
resultTitle.Size=UDim2.new(1,-18,0,38)
resultTitle.Position=UDim2.fromOffset(9,10)
resultTitle.BackgroundTransparency=1
resultTitle.TextColor3=Color3.fromRGB(225,197,139)
resultTitle.TextSize=24
resultTitle.Font=Enum.Font.GothamBold
resultTitle.ZIndex=21
resultTitle.Parent=resultPanel

local resultDetail=Instance.new("TextLabel")
resultDetail.Size=UDim2.new(1,-20,0,46)
resultDetail.Position=UDim2.fromOffset(10,50)
resultDetail.BackgroundTransparency=1
resultDetail.TextColor3=Color3.fromRGB(205,199,188)
resultDetail.TextSize=13
resultDetail.TextWrapped=true
resultDetail.Font=Enum.Font.GothamMedium
resultDetail.ZIndex=21
resultDetail.Parent=resultPanel

local ceremonyJoke=Instance.new("TextLabel")
ceremonyJoke.Name="CeremonyJoke"
ceremonyJoke.Size=UDim2.new(1,-20,0,38)
ceremonyJoke.Position=UDim2.fromOffset(10,106)
ceremonyJoke.BackgroundColor3=Color3.fromRGB(25,22,21)
ceremonyJoke.BackgroundTransparency=.12
ceremonyJoke.TextColor3=Color3.fromRGB(240,230,199)
ceremonyJoke.TextSize=12
ceremonyJoke.TextWrapped=true
ceremonyJoke.Font=Enum.Font.GothamBold
ceremonyJoke.ZIndex=21
ceremonyJoke.Parent=resultPanel
roundify(ceremonyJoke,9)

local ceremonyStage=Instance.new("Frame")
ceremonyStage.Name="TeamCeremony"
ceremonyStage.Size=UDim2.new(1,-20,0,122)
ceremonyStage.Position=UDim2.fromOffset(10,150)
ceremonyStage.Visible=false
ceremonyStage.BackgroundColor3=Color3.fromRGB(20,18,18)
ceremonyStage.BackgroundTransparency=.04
ceremonyStage.ClipsDescendants=true
ceremonyStage.ZIndex=21
ceremonyStage.Parent=resultPanel
roundify(ceremonyStage,12)

local ceremonyFigures={}
local ceremonyNames={}
for i=1,4 do
 local slot=Instance.new("Frame")
 slot.Name="CeremonySlot"..i
 slot.AnchorPoint=Vector2.new(.5,1)
 slot.Position=UDim2.new((i-.5)/4,0,1,-8)
 slot.Size=UDim2.fromOffset(64,98)
 slot.BackgroundTransparency=1
 slot.ZIndex=22
 slot.Parent=ceremonyStage

 local body=Instance.new("Frame")
 body.Name="Body"
 body.AnchorPoint=Vector2.new(.5,1)
 body.Position=UDim2.new(.5,0,1,-18)
 body.Size=UDim2.fromOffset(30,48)
 body.BackgroundColor3=Color3.fromRGB(93,126,145)
 body.BorderSizePixel=0
 body.ZIndex=23
 body.Parent=slot
 roundify(body,8)

 local head=Instance.new("Frame")
 head.Name="Head"
 head.AnchorPoint=Vector2.new(.5,1)
 head.Position=UDim2.new(.5,0,1,-63)
 head.Size=UDim2.fromOffset(26,26)
 head.BackgroundColor3=Color3.fromRGB(210,184,158)
 head.BorderSizePixel=0
 head.ZIndex=24
 head.Parent=slot
 roundify(head,20)

 local nameLabel=Instance.new("TextLabel")
 nameLabel.Name="Name"
 nameLabel.AnchorPoint=Vector2.new(.5,1)
 nameLabel.Position=UDim2.new(.5,0,1,0)
 nameLabel.Size=UDim2.fromOffset(70,17)
 nameLabel.BackgroundTransparency=1
 nameLabel.TextColor3=Color3.fromRGB(220,225,233)
 nameLabel.TextSize=9
 nameLabel.Font=Enum.Font.GothamBold
 nameLabel.TextTruncate=Enum.TextTruncate.AtEnd
 nameLabel.ZIndex=24
 nameLabel.Parent=slot

 ceremonyFigures[i]={slot=slot,body=body,head=head}
 ceremonyNames[i]=nameLabel
end

local ceremonySerial=0
local confettiSerial=0
local function playCeremonyConfetti(color)
 confettiSerial+=1
 local serial=confettiSerial
 for i=1,18 do
  local bit=Instance.new("Frame")
  bit.Name="CeremonyConfetti"
  bit.Size=UDim2.fromOffset(6+(i%3)*2,10+(i%2)*4)
  bit.Position=UDim2.new((i%9)/9,math.random(-8,8),0,-18-math.random(0,40))
  bit.BackgroundColor3=i%3==0 and Color3.fromRGB(255,220,115)or color
  bit.BorderSizePixel=0
  bit.Rotation=math.random(-35,35)
  bit.ZIndex=25
  bit.Parent=ceremonyStage
  local target=UDim2.new(math.clamp(bit.Position.X.Scale+math.random(-12,12)/100,0,1),0,1,25+math.random(0,35))
  TweenService:Create(bit,TweenInfo.new(.9+math.random()*.7,Enum.EasingStyle.Quad,Enum.EasingDirection.In),{Position=target,Rotation=bit.Rotation+math.random(180,420),BackgroundTransparency=.18}):Play()
  task.delay(1.8,function()if bit.Parent then bit:Destroy()end end)
 end
 task.delay(2,function()if confettiSerial==serial then end end)
end

local function collectCeremonyNames(winner)
 local names={}
 for _,player in ipairs(Players:GetPlayers())do
  local lastRole=tostring(player:GetAttribute("LastRoundRole")or"")
  if winner=="DRAW"or lastRole==winner then table.insert(names,player.DisplayName)end
 end
 while #names<4 do table.insert(names,"팀원 "..tostring(#names+1))end
 while #names>4 do table.remove(names)end
 return names
end

local latestCeremonyStage=nil
local ceremonyCameraActive=false
local ceremonyCameraRestoreType=nil
local ceremonyCameraRestoreSubject=nil

local function stopResultCeremonyCamera()
 if not ceremonyCameraActive then
  resultCinemaTop.Visible=false;resultCinemaBottom.Visible=false;resultCinemaShade.Visible=false
  return
 end
 ceremonyCameraActive=false
 resultCinemaTop.Visible=false;resultCinemaBottom.Visible=false;resultCinemaShade.Visible=false
 resultCinemaTop.Size=UDim2.new(1,0,0,0);resultCinemaBottom.Size=UDim2.new(1,0,0,0)
 resultCinemaShade.BackgroundTransparency=1
 local camera=workspace.CurrentCamera
 if not camera then return end
 camera.CameraType=ceremonyCameraRestoreType or Enum.CameraType.Custom
 local character=p.Character
 local humanoid=character and character:FindFirstChildOfClass("Humanoid")
 camera.CameraSubject=humanoid or ceremonyCameraRestoreSubject
end

local function startResultCeremonyCamera(stage)
 local camera=workspace.CurrentCamera
 if not camera then return end
 if not ceremonyCameraActive then
  ceremonyCameraActive=true
  ceremonyCameraRestoreType=camera.CameraType
  ceremonyCameraRestoreSubject=camera.CameraSubject
 end
 local cameraPos=stage and stage.CameraPosition
 local focusPos=stage and stage.FocusPosition
 if typeof(cameraPos)~="Vector3"then cameraPos=workspace:GetAttribute("CelebrationCameraPosition")end
 if typeof(focusPos)~="Vector3"then focusPos=workspace:GetAttribute("CelebrationFocusPosition")end
 if typeof(cameraPos)~="Vector3"then cameraPos=Vector3.new(0,7.2,32)end
 if typeof(focusPos)~="Vector3"then focusPos=Vector3.new(0,3.8,12)end
 camera.CameraType=Enum.CameraType.Scriptable
 resultCinemaTop.Visible=true;resultCinemaBottom.Visible=true;resultCinemaShade.Visible=true
 resultCinemaTop.Size=UDim2.new(1,0,0,0);resultCinemaBottom.Size=UDim2.new(1,0,0,0)
 resultCinemaShade.BackgroundTransparency=1
 TweenService:Create(resultCinemaTop,TweenInfo.new(.36,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Size=UDim2.new(1,0,0,58)}):Play()
 TweenService:Create(resultCinemaBottom,TweenInfo.new(.36,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Size=UDim2.new(1,0,0,58)}):Play()
 TweenService:Create(resultCinemaShade,TweenInfo.new(.3),{BackgroundTransparency=.78}):Play()
 local target=CFrame.lookAt(cameraPos,focusPos)
 local intro=CFrame.lookAt(cameraPos+Vector3.new(0,2.2,7),focusPos)
 camera.CFrame=intro
 TweenService:Create(camera,TweenInfo.new(.85,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{CFrame=target}):Play()
 task.delay(1.05,function()
  if ceremonyCameraActive and camera==workspace.CurrentCamera then
   local drift=CFrame.lookAt(cameraPos+Vector3.new(2.2,.35,-1.6),focusPos+Vector3.new(0,.2,0))
   TweenService:Create(camera,TweenInfo.new(3.7,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{CFrame=drift}):Play()
  end
 end)
end

local function playResultCeremony(resultCode)
 ceremonySerial+=1
 local serial=ceremonySerial
 local winner=resultCode=="SURVIVOR"and"SURVIVOR"or resultCode=="MONSTER"and"MONSTER"or"DRAW"
 local ceremonyName=tostring(p:GetAttribute("CelebrationName")or"")
 local ceremonyCaption=tostring(p:GetAttribute("CelebrationCaption")or"")
 ceremonyStage.Visible=true
 resultDetail.Visible=false
 ceremonyJoke.Text="시레머니 · "..(ceremonyName~=""and ceremonyName or"결과").." · "..(ceremonyCaption~=""and ceremonyCaption or"라운드 종료")
 local ceremonyColor=Color3.fromRGB(198,202,212)
 if winner=="SURVIVOR"then
  ceremonyColor=Color3.fromRGB(98,205,231)
  ceremonyJoke.TextColor3=Color3.fromRGB(166,223,236)
  setMotionImpulse("CELEBRATE_HUMAN",1.2)
 elseif winner=="MONSTER"then
  ceremonyColor=Color3.fromRGB(221,71,99)
  ceremonyJoke.TextColor3=Color3.fromRGB(232,121,139)
  setMotionImpulse("CELEBRATE_MONSTER",1.2)
 else
  ceremonyJoke.TextColor3=ceremonyColor
  setMotionImpulse("CELEBRATE_DRAW",1.0)
 end
 local names=collectCeremonyNames(winner)
 for i,row in ipairs(ceremonyFigures)do
  ceremonyNames[i].Text=names[i]or("팀원 "..tostring(i))
  row.body.BackgroundColor3=ceremonyColor
  row.head.BackgroundColor3=winner=="MONSTER"and Color3.fromRGB(95,50,62)or Color3.fromRGB(210,184,158)
  row.slot.Position=UDim2.new((i-.5)/4,0,1,18)
  row.slot.Rotation=(i%2==0)and 5 or-5
  TweenService:Create(row.slot,TweenInfo.new(.48+i*.055,Enum.EasingStyle.Back,Enum.EasingDirection.Out),{Position=UDim2.new((i-.5)/4,0,1,-8),Rotation=0}):Play()
 end
 playCeremonyConfetti(ceremonyColor)
 startResultCeremonyCamera(latestCeremonyStage)
 task.delay(2.15,function()
  if ceremonySerial~=serial or not tostring(p:GetAttribute("RoundState")or""):find("^RESULT_")then return end
  resultDetail.Visible=true
  ceremonyJoke.Text="보상 정산 완료 · 잠시 뒤 내 저택으로 돌아가"
 end)
 task.delay(6.15,function()
  if ceremonySerial~=serial or not tostring(p:GetAttribute("RoundState")or""):find("^RESULT_")then return end
  ceremonyJoke.Text="내 저택으로 돌아가는 중…"
 end)
end

-- 진행 중 서버 입장자는 다음 라운드까지 관전임을 명확히 보여준다.
local spectatorPanel=Instance.new("Frame")
spectatorPanel.Name="SpectatorNotice"
spectatorPanel.AnchorPoint=Vector2.new(.5,0)
spectatorPanel.Position=UDim2.new(.5,0,0,82)
spectatorPanel.Size=UDim2.fromOffset(286,56)
spectatorPanel.BackgroundColor3=Color3.fromRGB(30,33,42)
spectatorPanel.BackgroundTransparency=.04
spectatorPanel.ZIndex=15
spectatorPanel.Visible=false
spectatorPanel.Parent=gui
roundify(spectatorPanel,12);outline(spectatorPanel,.45)

local spectatorText=Instance.new("TextLabel")
spectatorText.Size=UDim2.new(1,-16,1,-10)
spectatorText.Position=UDim2.fromOffset(8,5)
spectatorText.BackgroundTransparency=1
spectatorText.Text="라운드 진행 중 · 다음 라운드부터 참가"
spectatorText.TextColor3=Color3.fromRGB(226,231,240)
spectatorText.TextSize=13
spectatorText.TextWrapped=true
spectatorText.Font=Enum.Font.GothamBold
spectatorText.ZIndex=16
spectatorText.Parent=spectatorPanel

local function monsterName()
 local id=p:GetAttribute("MonsterForm")or"DRACULA"
 for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f.Name end end
 return"드라큘라"
end
local function humanName()
 local id=p:GetAttribute("HumanForm")or"BROADCAST"
 for _,f in ipairs(C.HumanForms or{})do if f.Id==id then return f.Name end end
 return"방송부"
end

local function render()
 local role=tostring(p:GetAttribute("Role")or"WAITING")
 local roundTeam=tostring(p:GetAttribute("RoundTeam")or"")
 if (role=="WAITING"or role=="")and(roundTeam=="SURVIVOR"or roundTeam=="MONSTER")then role=roundTeam end
 local round=p:GetAttribute("RoundState")or"WAITING"
 local roomState=tostring(p:GetAttribute("RoomState")or workspace:GetAttribute("RoomState")or"BROWSER")
 local lobbyPhase=tostring(p:GetAttribute("LobbyPhase")or workspace:GetAttribute("LobbyPhase")or round)
 local serverRoundRunning=roomState=="RUNNING"or lobbyPhase=="RUNNING"
 local running=round=="RUNNING"or(serverRoundRunning and(role=="SURVIVOR"or role=="MONSTER"))
 local spectating=round=="SPECTATING"or role=="SPECTATING"or(role=="ELIMINATED"and serverRoundRunning)
 local inMatch=running or spectating or serverRoundRunning
 local frozen=false
 local mapName=p:GetAttribute("CurrentMap")or"맵 준비"
 local eventName=p:GetAttribute("CurrentMapEvent")or""
 local seconds=math.max(0,math.floor((p:GetAttribute("TimeLeft")or 0)+.5))
 local mapId=tostring(workspace:GetAttribute("CurrentMapId")or"SCHOOL")
 drawMiniMap(mapId)
 miniTitle.Text="지도 · "..mapName
 mapPanel.Visible=inMatch

 mapLine.Text=mapName..(eventName~=""and(" · "..eventName)or"")
 local roleText=role=="MONSTER"and"몬스터"or role=="SURVIVOR"and"인간"or role=="ELIMINATED"and"탈락"or role=="SPECTATING"and"관전"or"대기"
 local hc=p:GetAttribute("HumanCount")or workspace:GetAttribute("HumanCount")or 0
 local mc=p:GetAttribute("MonsterCount")or workspace:GetAttribute("MonsterCount")or 0
 roleLine.Text=string.format("%s · 인간 %d : 몬스터 %d",roleText,hc,mc)
 local objectivesDone=tonumber(p:GetAttribute("ObjectivesDone"))or 0
 local objectivesTotal=math.max(1,tonumber(p:GetAttribute("ObjectivesTotal"))or tonumber(C.ObjectiveCount)or 4)
 if role=="MONSTER"then
  objectiveLine.Text="목표 · 인간 추적 → 감염 → 전멸"
  skillGuideLine.Text="스킬 · "..currentAbilityName().." · "..currentAbilityDescription()
 elseif role=="SURVIVOR"then
  objectiveLine.Text=string.format("목표 · 단말 %d/%d 작동 → 몬스터 정화 → 탈출",objectivesDone,objectivesTotal)
  skillGuideLine.Text="스킬 · "..currentHumanAbilityName().." · "..currentHumanAbilityDescription()
 elseif role=="ELIMINATED"then
  objectiveLine.Text="이번 판 탈락 · 팀 결과를 기다리는 중"
  skillGuideLine.Text="관전 중"
 else
  objectiveLine.Text="다음 라운드 준비"
  skillGuideLine.Text=""
 end
 local resultCode=round:match("^RESULT_(.+)$")
 if not resultCode then stopResultCeremonyCamera()end
 roundLine.Text=running and(string.format("%d초",seconds))or round=="SPECTATING"and"관전"or resultCode and"결과"or round

 local realPlayers=tonumber(p:GetAttribute("LobbyRealPlayers"))or #Players:GetPlayers()
 local phaseText=lobbyPhase=="INTERMISSION"and("곧 시작 · "..seconds.."초")or lobbyPhase=="RUNNING"and"게임 중"or lobbyPhase=="RESULT"and"결과"or lobbyPhase=="LOADING"and"준비 중"or"대기"
 if p:GetAttribute("RoomServer")==true then
  lobbyStatus.Text=string.format("곧 시작 · %d명",realPlayers)
 else
  lobbyStatus.Text=""
 end
 local pref=p:GetAttribute("MonsterPreference")or"ANY"
 local prefText=pref=="MONSTER"and"몬스터 선호"or pref=="SURVIVOR"and"인간 선호"or"자동 배정"
 local equippedItem=cosmeticItem(tostring(p:GetAttribute("EquippedCosmetic")or"DEFAULT"))
 local selectedHuman=currentHumanFormInfo()
 selectionStatus.Text=string.format("%s · 인간 %s/%s · 몬스터 %s",prefText,selectedHuman.Name or humanName(),selectedHuman.Tool or"도구",monsterName())
 loreStatus.Text=string.format("세계 괴담 %d/%d 완성 · 조각 %d · 계약서 %d · %s",tonumber(p:GetAttribute("GhostCompleted"))or 0,tonumber(p:GetAttribute("GhostTotal"))or #(C.GhostCatalog or{}),tonumber(p:GetAttribute("GhostFragments"))or 0,tonumber(p:GetAttribute("GhostContracts"))or 0,tostring(p:GetAttribute("GhostTitle")or"괴담 견습생"))

 local selectionConfirmed=p:GetAttribute("LobbySelectionConfirmed")==true
 local isRoomServer=p:GetAttribute("RoomServer")==true
 local browser=not isRoomServer
 local lobbyWaiting=not running and not resultCode and not spectating
 -- PersonalManorUI owns all lobby graphics and navigation.
 hud.Visible=inMatch
 roomBrowserPanel.Visible=false
 roomInfoPanel.Visible=false
 roomSlotsPanel.Visible=false
 setupPanel.Visible=false
 if browser then worldCodePanel.Visible=worldCodePanel.Visible and not inMatch and not resultCode end
 ruleCard.Visible=false
 actionDock.Visible=inMatch
 energyTrack.Visible=inMatch
 energyFill.Visible=inMatch
 energyLabel.Visible=inMatch
 mapPanel.Visible=inMatch
 spectatorPanel.Visible=spectating
 combatActionStatus.Visible=inMatch and not running
 if spectating then
  combatActionStatus.Text="관전 중 · 다음 라운드에 전투 스킬 활성화"
 elseif serverRoundRunning and not running then
  combatActionStatus.Text="전투 상태 동기화 중 · HUD 유지"
 else
  combatActionStatus.Text=""
 end
 resultPanel.Visible=resultCode~=nil
 roomStartButton.Visible=false
 roomLeaveButton.Visible=false
 local roomVis=tostring(p:GetAttribute("RoomVisibility")or"PRIVATE")
 local visText=roomVis=="PUBLIC"and"공개"or roomVis=="FRIENDS"and"친구만"or"비공개"
 local roomMembers=tonumber(p:GetAttribute("RoomMemberCount"))or 0
 local roomMax=tonumber(p:GetAttribute("RoomMaxPlayers"))or 8
 local roomSelectedMap=tostring(p:GetAttribute("RoomSelectedMapName")or workspace:GetAttribute("RoomSelectedMapName")or"학교")
 roomInfoLabel.Text=string.format("방 코드 %s · %s\n%s · 현재 %d/%d명%s",tostring(p:GetAttribute("RoomCode")or"------"),visText,roomSelectedMap,roomMembers,roomMax,p:GetAttribute("RoomIsHost")==true and" · 방장"or"")
 shopPanel.Visible=false;ghostBookPanel.Visible=false
 if resultCode then
  if round~=lastRoundState then playResultCeremony(resultCode)end
  resultTitle.Text=resultCode=="SURVIVOR"and"인간 승리"or resultCode=="MONSTER"and"몬스터 승리"or"무승부"
  local reward=tonumber(p:GetAttribute("LastRoundReward"))or 0
  local baseReward=tonumber(p:GetAttribute("LastRoundBaseReward"))or 0
  local winBonus=tonumber(p:GetAttribute("LastRoundWinBonus"))or 0
  local contribution=tonumber(p:GetAttribute("LastRoundContribution"))or 0
  local coins=tonumber(p:GetAttribute("Coins"))or 0
  local lastRole=tostring(p:GetAttribute("LastRoundRole")or"")
  local roleLabel=lastRole=="SURVIVOR"and"인간"or lastRole=="MONSTER"and"몬스터"or"관전"
  resultDetail.Text=string.format("최종 진영 %s · 총 +%d 코인\n참가 %d + 승리 %d + 기여 %d · 보유 %d",roleLabel,reward,baseReward,winBonus,contribution,coins)
 end
 combatActionStatus.Visible=inMatch and not running
 rescueButton.Visible=running and role=="SURVIVOR"
 dashButton.Visible=running and role=="SURVIVOR"
 humanAbilityButton.Visible=running and role=="SURVIVOR"
 infectButton.Visible=running and role=="MONSTER"
 abilityButton.Visible=running and role=="MONSTER"

 if running then
  -- 라운드에서는 전투용 배경음만 사용한다.
  if lobbyBgm.IsPlaying then lobbyBgm:Stop()end
  if not bgm.IsPlaying then bgm:Play()end
  chaseTint.BackgroundTransparency=1
 else
  chaseTint.BackgroundTransparency=1
  if chase.IsPlaying then chase:Stop()end
  if round:find("^RESULT_")then
   if lobbyBgm.IsPlaying then lobbyBgm:Stop()end
   if bgm.IsPlaying then bgm:Stop()end
   if round~=lastRoundState then resultSfx.TimePosition=0;resultSfx:Play()end
  else
   if bgm.IsPlaying then bgm:Stop()end
   if not lobbyBgm.IsPlaying then lobbyBgm:Play()end
  end
 end

 if p:GetAttribute("Infected")==true and role=="MONSTER"then chaseTint.BackgroundTransparency=.88 end
 wasFrozen=false
 lastRoundState=round
end

for _,k in ipairs({"RoundState","TimeLeft","Role","Infected","HumanForm","MonsterForm","MonsterXP","Coins","HumanCount","MonsterCount","CurrentMap","CurrentMapEvent","LobbyReady","LobbyPhase","LobbyRealPlayers","LobbyAIFill","MonsterPreference","LobbySelectionConfirmed","LastRoundReward","LastRoundWinner","LastRoundRole","LastRoundBaseReward","LastRoundWinBonus","LastRoundContribution","PurifyReadyAt","DashReadyAt","HumanAbilityReadyAt","InfectReadyAt","AbilityReadyAt","FalseAlarmUntil","BlackoutUntil","HuntFlashUntil","AbilityFeedback","HumanAbilityFeedback","Energy","EnergyMax","PressurePassive","Spectating","OwnedCosmetics","EquippedCosmetic","CelebrationName","CelebrationCaption","CelebrationWinner","CelebrationComic","LoreCount","LoreTotal","LoreTitle","GhostProgress","GhostSeenCount","GhostCompleted","GhostTotal","GhostTitle","GhostFragments","GhostContracts","RoomServer","RoomCode","RoomHostUserId","RoomHostName","RoomVisibility","RoomState","RoomMemberCount","RoomMaxPlayers","RoomIsHost","RoomSelectedMapId","RoomSelectedMapName"})do
 p:GetAttributeChangedSignal(k):Connect(function()render();updateCosmeticUI();updateGhostBookUI()end)
end
p:GetAttributeChangedSignal("GhostFeedback"):Connect(function()
 local raw=tostring(p:GetAttribute("GhostFeedback")or"")
 local kind,id,value=string.match(raw,"^([^:]+):?([^:]*):?([^:]*)$")
 local item=ghostCatalogItem(id or"")
 if kind=="STAGE"and item then
  local stage=tonumber(value)or 0
  local stageName=item.Stages and item.Stages[stage]or("목격 "..stage.."단계")
  showMapContentToast("세계 괴담 목격 · "..item.Name.."\n"..stageName.." ("..stage.."/3)",Color3.fromRGB(221,203,255),2.8)
 elseif kind=="DUPLICATE"and item then
  showMapContentToast(item.Name.." 재목격 · 괴담 조각 "..tostring(value),Color3.fromRGB(205,188,241),2)
 elseif kind=="CONTRACT"then
  showMapContentToast("괴담 계약서 +"..tostring(value),Color3.fromRGB(255,220,132),2.4)
 elseif kind=="CATALOG_COMPLETE"then
  showMapContentToast("초기 세계 괴담 도감 완성 · 계약서 보너스 +"..tostring(value),Color3.fromRGB(255,220,132),3)
 elseif kind=="ROUND_CAP"then
  showMapContentToast("이번 판 괴담 목격 기록은 여기까지",Color3.fromRGB(186,194,210),1.6)
 end
end)

p:GetAttributeChangedSignal("LoreFeedback"):Connect(function()
 local raw=tostring(p:GetAttribute("LoreFeedback")or"")
 local kind,id=string.match(raw,"^([^:]+):([^:]+)")
 local item=loreItem(id or"")
 if kind=="FOUND"and item then
  showMapContentToast("괴담 메모 발견 · "..item.Name.."\n"..item.Text,Color3.fromRGB(235,219,171),3.4)
 elseif kind=="ALREADY"then
  showMapContentToast("이미 조사한 괴담 메모야",Color3.fromRGB(184,193,208),1.3)
 end
end)

p:GetAttributeChangedSignal("WorldLobbyCodeInputRequest"):Connect(function()
 if p:GetAttribute("RoomServer")==true or p:GetAttribute("RoundState")=="RUNNING"then return end
 worldCodeBox.Text=""
 worldCodePanel.Visible=true
 task.defer(function()
  task.wait()
  worldCodeBox:CaptureFocus()
 end)
end)

p:GetAttributeChangedSignal("RoomFeedback"):Connect(function()
 local raw=tostring(p:GetAttribute("RoomFeedback")or"")
 local kind,message=string.match(raw,"^([^:]+):?(.*)$")
 if kind=="ERROR"then roomBrowserFeedback.Text="오류 · "..tostring(message);showMapContentToast("오류 · "..tostring(message),Color3.fromRGB(255,166,166),1.8)
 elseif kind=="EMPTY"then roomBrowserFeedback.Text=tostring(message);showMapContentToast(tostring(message),Color3.fromRGB(190,202,218),1.8)
 elseif kind=="TELEPORTING"then roomBrowserFeedback.Text="방으로 이동 중...";showMapContentToast("방으로 이동 중...",Color3.fromRGB(155,224,192),1.5)
 elseif kind=="HOST"then showMapContentToast("방장이 되었어",Color3.fromRGB(155,224,192),2)
 elseif kind=="START"then showMapContentToast("게임 시작 준비",Color3.fromRGB(155,224,192),1.5)
 else roomBrowserFeedback.Text=tostring(message or"")end
end)

p:GetAttributeChangedSignal("EnergyFeedback"):Connect(function()
 local raw=tostring(p:GetAttribute("EnergyFeedback")or"")
 local kind,a,b=string.match(raw,"^([^:]+):?([^:]*):?([^:]*)$")
 if kind=="NO_ENERGY"then showMapContentToast("에너지 부족 · "..tostring(a or"액션"),Color3.fromRGB(255,181,118),1.5)
 elseif kind=="NO_TARGET"then showMapContentToast("사거리 안에 대상이 없어",Color3.fromRGB(214,221,230),1.2)
 elseif kind=="STATION_RECHARGE"then showMapContentToast("에너지 +"..tostring(a or"0"),Color3.fromRGB(130,218,255),1.5)
 elseif kind=="STATION_COOLDOWN"then showMapContentToast("단말 재충전 "..tostring(a or"0").."초",Color3.fromRGB(180,196,214),1.4)
 elseif kind=="ENERGY_FULL"then showMapContentToast("에너지가 이미 가득 찼어",Color3.fromRGB(178,226,255),1.3)
 elseif kind=="LAST_STAND"then showMapContentToast("최후 저항 · 에너지 +"..tostring(a or"0"),Color3.fromRGB(255,208,118),2)end
end)

p:GetAttributeChangedSignal("MapContentFeedback"):Connect(function()
 local raw=tostring(p:GetAttribute("MapContentFeedback")or"")
 local kind,a,b=string.match(raw,"^([^:]+):?([^:]*):?(.+)$")
 if kind=="UTILITY"then showMapContentToast(tostring(b or"맵 장치").." 가동",Color3.fromRGB(155,220,255),2)
 elseif kind=="UTILITY_COOLDOWN"then showMapContentToast(tostring(a or"장치").." · "..tostring(b or"0").."초 후 재사용",Color3.fromRGB(188,202,218),1.7)
 elseif kind=="CORE"then showMapContentToast("중앙 에너지 코어 확보 · +"..tostring(b or"50"),Color3.fromRGB(113,214,255),2.2)
 elseif kind=="OBJECTIVE"then
  local done=tonumber(a)or 0;local total=tonumber(b)or tonumber(C.ObjectiveCount)or 4
  showMapContentToast(done>=total and"단말 완료 · 비상 출구가 열렸어!"or string.format("단말 가동 %d/%d",done,total),Color3.fromRGB(255,218,140),2.1)
 elseif kind=="ESCAPED"then showMapContentToast("탈출 성공 · 시레머니로 이동",Color3.fromRGB(155,230,184),2.1)end
end)

p:GetAttributeChangedSignal("CosmeticFeedback"):Connect(function()
 local raw=tostring(p:GetAttribute("CosmeticFeedback")or"")
 local kind,id,price=string.match(raw,"^([^:]+):([^:]+):?(%d*)$")
 local item=cosmeticItem(id or"DEFAULT")
 if kind=="PURCHASED"then shopFeedback.Text=item.Name.." 구매 완료"
 elseif kind=="EQUIPPED"then shopFeedback.Text=item.Name.." 장착 완료"
 elseif kind=="NEED_COINS"then shopFeedback.Text=string.format("코인 부족 · %s 필요",price~=""and price or tostring(item.Price or 0))
 elseif kind=="OWNED"then shopFeedback.Text="이미 보유 중"
 elseif kind=="NOT_OWNED"then shopFeedback.Text="먼저 구매해야 해"
 else shopFeedback.Text=""end
 updateCosmeticUI()
end)

-- 강한 추격곡은 괴물이 실제로 가까울 때만 재생한다.
local tensionClock=0
local function nearestMonsterDistance()
 local character=p.Character
 local root=character and character:FindFirstChild("HumanoidRootPart")
 if not root then return math.huge end
 local best=math.huge
 for _,other in ipairs(Players:GetPlayers())do
  if other~=p and other:GetAttribute("Role")=="MONSTER"then
   local oc=other.Character
   local oroot=oc and oc:FindFirstChild("HumanoidRootPart")
   if oroot then best=math.min(best,(oroot.Position-root.Position).Magnitude)end
  end
 end
 local arena=workspace:FindFirstChild("MidnightArena")
 if arena then for _,ai in ipairs(arena:GetDescendants())do if ai:IsA("BasePart")and ai.Name=="AI_MONSTER"then best=math.min(best,(ai.Position-root.Position).Magnitude)end end end
 return best
end

RunService.Heartbeat:Connect(function(dt)
 tensionClock+=dt
 if tensionClock<.2 then return end
 tensionClock=0
 local running=p:GetAttribute("RoundState")=="RUNNING"
 if not running then
  if chase.IsPlaying then chase:Stop()end
  bgm.Volume=.11
  return
 end
 local distance=nearestMonsterDistance()
 local near=distance<=32
 local danger=distance<=17
 bgm.Volume=near and .045 or .105
 chase.Volume=danger and .15 or .115
 if near then
  if not chase.IsPlaying then chase:Play()end
  chaseTint.BackgroundTransparency=danger and .94 or .975
 else
  if chase.IsPlaying then chase:Stop()end
  chaseTint.BackgroundTransparency=1
 end
end)

-- 발소리
local function bindFootsteps(character)
 local humanoid=character:WaitForChild("Humanoid",5)
 if not humanoid then return end
 humanoid.Running:Connect(function(speed)
  if speed>4 and p:GetAttribute("RoundState")=="RUNNING"and p:GetAttribute("Frozen")~=true then
   local now=os.clock()
   if now-stepClock>.34 then
    stepClock=now
    footstepSfx.TimePosition=0
    footstepSfx.PlaybackSpeed=p:GetAttribute("Role")=="MONSTER"and .82 or 1.08
    footstepSfx:Play()
   end
  end
 end)
end
if p.Character then task.defer(bindFootsteps,p.Character)end
p.CharacterAdded:Connect(bindFootsteps)

local function monsterEffectProfile(ability)
 local formInfo=nil
 for _,row in ipairs(C.MonsterForms or{})do
  if row.Ability==ability then formInfo=row;break end
 end
 local profile=C.MonsterAbilities and C.MonsterAbilities[ability]or{}
 return formInfo or{},profile
end

local function abilityVfxPart(name,size,cframe,color,shape)
 local part=Instance.new("Part")
 part.Name=name
 part.Size=size
 part.CFrame=cframe
 part.Color=color
 part.Material=Enum.Material.Neon
 part.Anchored=true
 part.CanCollide=false
 part.CanTouch=false
 part.CanQuery=false
 part.CastShadow=false
 part.Transparency=.12
 if shape then part.Shape=shape end
 part.Parent=workspace
 return part
end

local function abilityPulse(name,pos,color,startSize,endSize,duration)
 local part=abilityVfxPart(name,startSize,CFrame.new(pos),color,Enum.PartType.Ball)
 TweenService:Create(part,TweenInfo.new(duration,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Size=endSize,Transparency=1}):Play()
 Debris:AddItem(part,duration+.1)
 return part
end

local function abilityStreak(name,origin,look,color,offset,length,width,duration)
 local flat=Vector3.new(look.X,0,look.Z)
 if flat.Magnitude<.01 then flat=Vector3.new(0,0,-1)else flat=flat.Unit end
 local right=flat:Cross(Vector3.yAxis)
 local pos=origin+right*(offset or 0)+Vector3.new(0,1.7,0)+flat*((length or 9)*.5)
 local part=abilityVfxPart(name,Vector3.new(width or .22,width or .22,length or 9),CFrame.lookAt(pos,pos+flat),color)
 TweenService:Create(part,TweenInfo.new(duration or .34,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Transparency=1,Size=Vector3.new((width or .22)*.35,(width or .22)*.35,(length or 9)*1.25)}):Play()
 Debris:AddItem(part,(duration or .34)+.1)
 return part
end

local function abilityRing(name,pos,color,startDiameter,endDiameter,duration)
 local part=abilityVfxPart(name,Vector3.new(.16,startDiameter,startDiameter),CFrame.new(pos)*CFrame.Angles(0,0,math.rad(90)),color,Enum.PartType.Cylinder)
 part.Transparency=.05
 local light=Instance.new("PointLight");light.Color=color;light.Range=10;light.Brightness=2.5;light.Parent=part
 TweenService:Create(part,TweenInfo.new(duration,Enum.EasingStyle.Quart,Enum.EasingDirection.Out),{Size=Vector3.new(.05,endDiameter,endDiameter),Transparency=1}):Play()
 TweenService:Create(light,TweenInfo.new(duration),{Brightness=0,Range=endDiameter*.5}):Play()
 Debris:AddItem(part,duration+.08)
 return part
end

local function abilitySparkBurst(name,pos,color,count,speed,duration)
 local anchor=abilityVfxPart(name,Vector3.new(.18,.18,.18),CFrame.new(pos),color,Enum.PartType.Ball)
 anchor.Transparency=1
 local emitter=Instance.new("ParticleEmitter")
 emitter.Name=name.."Emitter"
 emitter.Texture="rbxasset://textures/particles/sparkles_main.dds"
 emitter.Rate=0
 emitter.Color=ColorSequence.new(color,Color3.new(1,1,1))
 emitter.LightEmission=1
 emitter.Lifetime=NumberRange.new(duration*.55,duration)
 emitter.Speed=NumberRange.new(speed*.55,speed)
 emitter.SpreadAngle=Vector2.new(180,180)
 emitter.Drag=2.5
 emitter.Acceleration=Vector3.new(0,-8,0)
 emitter.Size=NumberSequence.new({
  NumberSequenceKeypoint.new(0,.44),
  NumberSequenceKeypoint.new(.35,.22),
  NumberSequenceKeypoint.new(1,0),
 })
 emitter.Transparency=NumberSequence.new({
  NumberSequenceKeypoint.new(0,.02),
  NumberSequenceKeypoint.new(.7,.18),
  NumberSequenceKeypoint.new(1,1),
 })
 emitter.Parent=anchor
 emitter:Emit(count)
 local light=Instance.new("PointLight");light.Color=color;light.Range=14;light.Brightness=4.2;light.Parent=anchor
 TweenService:Create(light,TweenInfo.new(duration*.7),{Brightness=0,Range=4}):Play()
 Debris:AddItem(anchor,duration+.2)
end

local function playMonsterAbilityEffect(snapshot)
 if typeof(snapshot)~="table"then return end
 markCombatSkinAttack(snapshot.UserId,snapshot.Origin,.82)
 local ability=tostring(snapshot.Ability or"")
 local origin=typeof(snapshot.Origin)=="Vector3"and snapshot.Origin or Vector3.zero
 local look=typeof(snapshot.Look)=="Vector3"and snapshot.Look or Vector3.new(0,0,-1)
 local formInfo,profile=monsterEffectProfile(ability)
 local color=formInfo.EffectColor or Color3.fromRGB(190,100,220)
 local accent=formInfo.AccentColor or color
 if snapshot.Infected==true then
  color=Color3.fromRGB(220,70,112);accent=Color3.fromRGB(144,76,226)
  abilitySparkBurst("InfectedAbilitySparks",origin+Vector3.new(0,1.3,0),color,22,13,.6)
  abilityRing("InfectedAbilityHalo",origin+Vector3.new(0,.3,0),accent,1.5,16,.48)
  if ability=="FALSE_ALARM"then
   abilityPulse("FalseAlarmBurst",origin+Vector3.new(0,1.2,0),color,Vector3.new(2,2,2),Vector3.new(16,6,16),.42)
   abilityRing("FalseAlarmRing",origin+Vector3.new(0,.25,0),accent,3,28,.62)
  elseif ability=="BLACKOUT"then
   abilityPulse("BlackoutCore",origin+Vector3.new(0,1.5,0),Color3.fromRGB(48,24,78),Vector3.new(2,2,2),Vector3.new(18,12,18),.55)
   abilityRing("BlackoutRing",origin+Vector3.new(0,.25,0),accent,3,30,.68)
  elseif ability=="RUSH"then
   abilityRing("RushRing",origin+Vector3.new(0,.25,0),color,2,12,.35)
   for _,offset in ipairs({-1.8,-.9,0,.9,1.8})do abilityStreak("RushTrail",origin,look,accent,offset,13,.3,.48)end
  elseif ability=="HUNT_FLASH"then
   abilityPulse("HuntFlashCore",origin+Vector3.new(0,1.5,0),Color3.fromRGB(250,238,226),Vector3.new(2,2,2),Vector3.new(18,12,18),.24)
   abilityRing("HuntFlashRing",origin+Vector3.new(0,.25,0),color,2,22,.42)
  elseif ability=="BREACH"then
   abilityPulse("BreachBurst",origin+Vector3.new(0,1.2,0),color,Vector3.new(1,1,1),Vector3.new(8,6,8),.28)
   abilityRing("BreachRing",origin+Vector3.new(0,.25,0),accent,2,12,.35)
   for _,offset in ipairs({-1.2,-.6,0,.6,1.2})do abilityStreak("BreachTrail",origin,look,accent,offset,15,.26,.42)end
  end
  return
 end
 abilitySparkBurst("MonsterAbilitySparks",origin+Vector3.new(0,1.35,0),color,24,14,.62)
 abilityRing("MonsterAbilityHalo",origin+Vector3.new(0,.3,0),accent,1.5,15,.46)
 if ability=="BAT_DASH"then
  abilityPulse("BatDashBurst",origin+Vector3.new(0,1.8,0),color,Vector3.new(1.5,1.5,1.5),Vector3.new(9,5,9),.36)
  abilityRing("BatDashRing",origin+Vector3.new(0,.25,0),accent,2,13,.42)
  for i=-3,3 do
   local streak=abilityStreak("BatShadow",origin,look,i%2==0 and color or accent,i*1.05,8+math.abs(i)*1.2,.28,.42)
   streak.CFrame=streak.CFrame*CFrame.Angles(0,0,math.rad(i*9))
  end
 elseif ability=="POWER_CHARGE"then
  abilityPulse("ElectricChargeCore",origin+Vector3.new(0,1.6,0),color,Vector3.new(1,1,1),Vector3.new(10,10,10),.42)
  abilityRing("ElectricChargeRing",origin+Vector3.new(0,.25,0),accent,2,14,.4)
  for i=1,8 do
   local angle=(i/8)*math.pi*2
   local dir=Vector3.new(math.cos(angle),0,math.sin(angle))
   abilityStreak("ElectricArc",origin,dir,color,0,5,.16,.3)
  end
 elseif ability=="RAGE_RUN"then
  abilityPulse("RageDust",origin+Vector3.new(0,.8,0),accent,Vector3.new(1,1,1),Vector3.new(8,3.5,8),.4)
  abilityRing("RageRing",origin+Vector3.new(0,.25,0),color,2,11,.36)
  for _,offset in ipairs({-1.2,0,1.2})do abilityStreak("WolfClaw",origin,look,color,offset,10,.2,.45)end
 elseif ability=="CURSE_SLOW"then
  local radius=tonumber(profile.Radius)or 22
  abilityPulse("CurseSandCore",origin+Vector3.new(0,.5,0),color,Vector3.new(1,1,1),Vector3.new(radius*1.8,1.6,radius*1.8),.7)
  abilityRing("CurseRing",origin+Vector3.new(0,.22,0),accent,3,radius*2,.7)
  for i=1,12 do
   local a=(i/12)*math.pi*2
   local pos=origin+Vector3.new(math.cos(a)*4,.5,math.sin(a)*4)
   local grain=abilityVfxPart("CurseSand",Vector3.new(.45,.45,.45),CFrame.new(pos),i%2==0 and color or accent,Enum.PartType.Ball)
   TweenService:Create(grain,TweenInfo.new(.7,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{CFrame=CFrame.new(origin+Vector3.new(math.cos(a)*radius,2+((i%3)*.4),math.sin(a)*radius)),Transparency=1}):Play()
   Debris:AddItem(grain,.8)
  end
 elseif ability=="SHADOW_STEP"then
  local target=typeof(snapshot.Target)=="Vector3"and snapshot.Target or(origin+look*(tonumber(profile.Distance)or 18))
  abilityPulse("ShadowGateOrigin",origin+Vector3.new(0,1.8,0),color,Vector3.new(2,4,2),Vector3.new(7,8,7),.5)
  abilityPulse("ShadowGateTarget",target+Vector3.new(0,1.8,0),color,Vector3.new(2,4,2),Vector3.new(7,8,7),.5)
  for i=-2,2 do abilityStreak("ShadowThread",origin,look,accent,i*.65,tonumber(profile.Distance)or 18,.16,.5)end
 end
end

local function playMonsterAttackEffect(snapshot)
 if typeof(snapshot)~="table"then return end
 local origin=typeof(snapshot.Origin)=="Vector3"and snapshot.Origin or Vector3.zero
 local look=typeof(snapshot.Look)=="Vector3"and snapshot.Look or Vector3.new(0,0,-1)
 markCombatSkinAttack(snapshot.UserId,origin,.58)
 local blood=Color3.fromRGB(224,60,86)
 abilitySparkBurst("MonsterAttackSparks",origin+Vector3.new(0,1.4,0),blood,18,12,.42)
 abilityPulse("MonsterAttackBurst",origin+Vector3.new(0,1.45,0),blood,Vector3.new(.8,.8,.8),Vector3.new(5,5,5),.24)
 abilityRing("MonsterAttackRing",origin+Vector3.new(0,.24,0),blood,1.5,7,.28)
 for _,offset in ipairs({-1,-.5,0,.5,1})do abilityStreak("MonsterClaw",origin,look,blood,offset,7,.18,.28)end
end

local function playHumanAbilityEffect(snapshot)
 if typeof(snapshot)~="table"then return end
 local ability=tostring(snapshot.Ability or"")
 local action=tostring(snapshot.Action or"")
 local origin=typeof(snapshot.Origin)=="Vector3"and snapshot.Origin or Vector3.zero
 local target=typeof(snapshot.Target)=="Vector3"and snapshot.Target or origin
 local formId=tostring(snapshot.FormId or"BROADCAST")
 local palette={
  BROADCAST=Color3.fromRGB(82,210,235),
  ELECTRICIAN=Color3.fromRGB(235,196,68),
  COURIER=Color3.fromRGB(236,139,72),
  PHOTOGRAPHER=Color3.fromRGB(238,242,248),
  SECURITY=Color3.fromRGB(105,186,230),
 }
 local color=palette[formId]or Color3.fromRGB(116,201,220)
 abilitySparkBurst("HumanAbilitySparks",origin+Vector3.new(0,1.25,0),color,20,12,.52)
 abilityRing("HumanAbilityHalo",origin+Vector3.new(0,.22,0),color,1.5,13,.4)
 if ability=="SIGNAL_JAM"then
  abilityPulse("SignalJam",origin+Vector3.new(0,1.2,0),color,Vector3.new(1,1,1),Vector3.new(24,4,24),.55)
  abilityRing("SignalJamRing",origin+Vector3.new(0,.2,0),color,3,28,.58)
  task.delay(.12,function()abilityPulse("SignalJamEcho",origin+Vector3.new(0,1.2,0),color,Vector3.new(2,1,2),Vector3.new(27,2,27),.5)end)
 elseif ability=="OVERLOAD"then
  abilityPulse("HumanOverload",origin+Vector3.new(0,.8,0),color,Vector3.new(1,1,1),Vector3.new(16,3,16),.42)
  abilityRing("HumanOverloadRing",origin+Vector3.new(0,.2,0),color,2,18,.4)
  for i=1,8 do
   local a=i/8*math.pi*2
   abilityStreak("OverloadArc",origin,Vector3.new(math.cos(a),0,math.sin(a)),color,0,5,.16,.3)
  end
 elseif ability=="IMPACT_BAG"then
  local dir=target-origin
  abilityPulse("ImpactBagBurst",origin+Vector3.new(0,1.2,0),color,Vector3.new(1,1,1),Vector3.new(7,5,7),.32)
  abilityRing("ImpactBagRing",origin+Vector3.new(0,.2,0),color,2,10,.34)
  if dir.Magnitude>.1 then abilityStreak("ImpactBagTrail",origin,dir.Unit,color,0,math.min(14,dir.Magnitude),.35,.34)end
 elseif ability=="CAMERA_FLASH"then
  abilityPulse("CameraFlash",origin+Vector3.new(0,1.5,0),color,Vector3.new(2,2,2),Vector3.new(22,13,22),.24)
  abilityRing("CameraFlashRing",origin+Vector3.new(0,.2,0),Color3.fromRGB(255,255,246),2,22,.3)
  local character=p.Character
  local localRoot=character and character:FindFirstChild("HumanoidRootPart")
  local profile=C.HumanAbilities and C.HumanAbilities.CAMERA_FLASH
  local radius=tonumber(profile and profile.Radius)or 19
  if localRoot and(localRoot.Position-origin).Magnitude<=radius+3 then
   local flashFrame=Instance.new("Frame")
   flashFrame.Name="CameraFlashOverlay";flashFrame.Size=UDim2.fromScale(1,1);flashFrame.BackgroundColor3=Color3.fromRGB(246,247,243)
   flashFrame.BackgroundTransparency=.08;flashFrame.BorderSizePixel=0;flashFrame.ZIndex=70;flashFrame.Parent=gui
   TweenService:Create(flashFrame,TweenInfo.new(.34,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{BackgroundTransparency=1}):Play()
   Debris:AddItem(flashFrame,.4)
  end
 elseif ability=="SHOCK_BATON"then
  local dir=target-origin
  if dir.Magnitude>.1 then
   abilityRing("BatonShockRing",target+Vector3.new(0,.25,0),color,1,8,.28)
   for i=-2,2 do abilityStreak("BatonArc",origin,dir.Unit,color,i*.22,math.min(9,dir.Magnitude),.2,.3)end
  end
 elseif action=="PURIFY"then
  abilityPulse("AIPurify",target+Vector3.new(0,1,0),color,Vector3.new(.8,.8,.8),Vector3.new(4,4,4),.25)
 elseif action=="DASH"then
  local dir=target-origin
  if dir.Magnitude>.1 then abilityStreak("AIHumanDash",origin,dir.Unit,color,0,math.min(12,dir.Magnitude),.25,.32)end
 end
end

p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 local value=tostring(p:GetAttribute("FeedbackEvent")or"")
 if value:find("^INFECT:")then setMotionImpulse("INFECT",.72);warningSfx.TimePosition=0;warningSfx:Play();chaseTint.BackgroundTransparency=.72;showMapContentToast("감염 완료 · 몬스터로 전환",Color3.fromRGB(218,86,96),1.8)
 elseif value:find("^INFECT_ATTACK_HIT")then setMotionImpulse("INFECT_ATTACK",.55);actionSfx.TimePosition=0;actionSfx:Play()
 elseif value:find("^PURIFY")then setMotionImpulse("PURIFY",.3);rescueSfx.TimePosition=0;rescueSfx:Play();chaseTint.BackgroundTransparency=.9
 elseif value:find("^ABILITY:")then
  setMotionImpulse("ABILITY",.48);warningSfx.TimePosition=0;warningSfx:Play()
  local label=tostring(p:GetAttribute("AbilityFeedback")or"스킬 사용");label=string.match(label,"^([^:]+)")or label
  showMapContentToast(label.." 발동",Color3.fromRGB(217,190,235),1.7)
 elseif value:find("^HUMAN_ABILITY:")then
  setMotionImpulse("ABILITY",.42);actionSfx.TimePosition=0;actionSfx:Play()
  local label=tostring(p:GetAttribute("HumanAbilityFeedback")or"인간 스킬");label=string.match(label,"^([^:]+)")or label
  showMapContentToast(label.." 발동",Color3.fromRGB(164,224,235),1.6)
 elseif value:find("^RESULT:")then resultSfx.TimePosition=0;resultSfx:Play()end
end)

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind=="AI_TEAM_CHAT"then
  showAITeamChat(snapshot)
  return
 end
 if kind=="MONSTER_ABILITY_EFFECT"then
  playMonsterAbilityEffect(snapshot)
  return
 end
 if kind=="MONSTER_ATTACK_EFFECT"then
  playMonsterAttackEffect(snapshot)
  return
 end
 if kind=="HUMAN_ABILITY_EFFECT"or kind=="AI_HUMAN_ACTION_EFFECT"then
  playHumanAbilityEffect(snapshot)
  return
 end
 if kind=="RESULT_CEREMONY_STAGE"then
  latestCeremonyStage=typeof(snapshot)=="table"and snapshot or nil
  if tostring(p:GetAttribute("RoundState")or""):find("^RESULT_")then startResultCeremonyCamera(latestCeremonyStage)end
  return
 end
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedHumanParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ActivePopulation)or tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedAICount",tonumber(snapshot.AICount)or 0)
 p:SetAttribute("HumanCount",tonumber(snapshot.HumanCount)or 0)
 p:SetAttribute("MonsterCount",tonumber(snapshot.MonsterCount)or 0)
end)

QACamera.install(C,gui,function()
 local arena=workspace:FindFirstChild("MidnightArena")
 if not arena or workspace:GetAttribute("MapReady")~=true then return{}end
 local id=tostring(workspace:GetAttribute("CurrentMapId")or"SCHOOL")
 if id=="HOSPITAL"then
  return{
   {label="horror-hospital-overview",position=Vector3.new(0,150,205),lookAt=Vector3.new(0,2,0)},
   {label="horror-hospital-emergency",position=Vector3.new(-155,25,-45),lookAt=Vector3.new(-118,4,-82)},
   {label="horror-hospital-morgue",position=Vector3.new(-150,24,145),lookAt=Vector3.new(-118,4,108)},
  }
 elseif id=="THEME_PARK"then
  return{
   {label="horror-park-overview",position=Vector3.new(0,150,205),lookAt=Vector3.new(0,2,0)},
   {label="horror-park-arcade",position=Vector3.new(-154,24,-52),lookAt=Vector3.new(-118,4,-92)},
   {label="horror-park-maintenance",position=Vector3.new(154,24,145),lookAt=Vector3.new(118,4,108)},
  }
 end
 return{
  {label="horror-school-overview",position=Vector3.new(0,150,205),lookAt=Vector3.new(0,2,0)},
  {label="horror-school-library",position=Vector3.new(-154,24,-40),lookAt=Vector3.new(-118,4,-70)},
  {label="horror-school-auditorium",position=Vector3.new(154,24,145),lookAt=Vector3.new(108,4,104)},
 }
end)



updateCosmeticUI()
render()
