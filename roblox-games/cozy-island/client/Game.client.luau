-- 파일명: roblox-games/cozy-island/client/Game.client.luau
-- roblox-games/cozy-island/client/Game.client.luau
-- 포근섬 모바일 우선 HUD / 채집·건설·전투 조작

-- 서비스
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local TweenService=game:GetService("TweenService")
local RunService=game:GetService("RunService")
local CollectionService=game:GetService("CollectionService")

-- 참조
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local CommonUI=require(RS:WaitForChild("Shared"):WaitForChild("RobloxCommonUI"))
local WildlifeAnimator=require(Shared:WaitForChild("WildlifeAnimator"))
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
local studioAssetSelectionFingerprint = studioAssetConfig.SelectionFingerprint or ""
local function studioAssetFamily(family)
  local atoms = studioAssetFamilies[family]
  return type(atoms) == "table" and atoms or {}
end
local function hasStudioAssetAtom(familyOrAtom, atom)
  local family = atom == nil and "UI" or familyOrAtom
  local assetAtom = atom == nil and familyOrAtom or atom
  return table.find(studioAssetFamily(family), assetAtom) ~= nil
end
local STUDIO_ASSET_SELECTION = {
  CHARACTER = studioAssetFamily("CHARACTER"),
  CREATURE = studioAssetFamily("CREATURE"),
  BUILDING = studioAssetFamily("BUILDING"),
  ENVIRONMENT = studioAssetFamily("ENVIRONMENT"),
  WEAPON = studioAssetFamily("WEAPON"),
  SKILL = studioAssetFamily("SKILL"),
  MATERIAL = studioAssetFamily("MATERIAL"),
  AUDIO = studioAssetFamily("AUDIO"),
  VFX = studioAssetFamily("VFX"),
  UI = studioAssetFamily("UI"),
  MOTION = studioAssetFamily("MOTION"),
  PROP = studioAssetFamily("PROP"),
}
local STUDIO_ASSET_FAMILY_STATUS = {
  CHARACTER = "NOT_APPLICABLE",
  CREATURE = "APPLIED",
  BUILDING = "NOT_APPLICABLE",
  ENVIRONMENT = "APPLIED",
  WEAPON = "NOT_APPLICABLE",
  SKILL = "APPLIED",
  MATERIAL = "APPLIED",
  AUDIO = "APPLIED",
  VFX = "APPLIED",
  UI = "APPLIED",
  MOTION = "APPLIED",
  PROP = "APPLIED",
}
-- STUDIO_ASSET_BINDING_CLIENT_END
local QACamera=require(RS:WaitForChild("Shared"):WaitForChild("QACamera"))
local remote=RS:WaitForChild(C.RemoteName)
local foundationRemote=RS:WaitForChild("RuntimeFoundationReport")

-- Roblox-native survival wildlife: server owns root/state, client owns smooth Motor6D presentation.
local wildlifeControllers=setmetatable({}, {__mode="k"})
local wildlifeConnections=setmetatable({}, {__mode="k"})
local function unbindWildlife(model)
 local list=wildlifeConnections[model]
 if list then for _,connection in ipairs(list)do connection:Disconnect()end end
 wildlifeConnections[model]=nil
 local controller=wildlifeControllers[model]
 if controller then controller:Destroy()end
 wildlifeControllers[model]=nil
end
local function syncWildlife(model,controller)
 local speed=model:GetAttribute("WildlifeDesiredSpeed")
 controller:SetSpeed(speed)
 controller:SetState(tostring(model:GetAttribute("WildlifeMotionState")or"LOCOMOTION"),{
  side=model:GetAttribute("WildlifeHitSide"),
  duration=model:GetAttribute("WildlifeAttackDuration"),
 })
end
local function bindWildlife(model)
 if wildlifeControllers[model]or not model:IsA("Model")then return end
 local deadline=os.clock()+5
 while model.Parent and not model.PrimaryPart and os.clock()<deadline do task.wait(.05)end
 if not model.Parent or not model.PrimaryPart then return end
 local controller=WildlifeAnimator.bind(model,{nominalRunSpeed=15})
 wildlifeControllers[model]=controller
 syncWildlife(model,controller)
 local list={}
 for _,attribute in ipairs({"WildlifeDesiredSpeed","WildlifeMotionState","WildlifeHitSide","WildlifeAttackDuration"})do
  table.insert(list,model:GetAttributeChangedSignal(attribute):Connect(function()syncWildlife(model,controller)end))
 end
 table.insert(list,model.AncestryChanged:Connect(function(_,parent)if parent==nil then unbindWildlife(model)end end))
 wildlifeConnections[model]=list
end
for _,model in ipairs(CollectionService:GetTagged("VibeSurvivalWildlife"))do task.defer(bindWildlife,model)end
CollectionService:GetInstanceAddedSignal("VibeSurvivalWildlife"):Connect(function(model)task.defer(bindWildlife,model)end)
CollectionService:GetInstanceRemovedSignal("VibeSurvivalWildlife"):Connect(unbindWildlife)


-- 메인: 리깅/렌더링 최적화. 기존 원본 CC0의 Motor6D 또는 기본 관절을 재사용한다.
-- 화면 밖 동작은 건너뛰고 가시 거리별 갱신 빈도를 제한한다.
local combatActors=setmetatable({}, {__mode="k"})
local function bindCombatActor(actor)
 if not actor:IsA("BasePart")or combatActors[actor]then return end
 local joints={}
 for _,item in ipairs(actor:GetDescendants())do
  if item:IsA("Motor6D")and item.Part1 then table.insert(joints,item)end
 end
 combatActors[actor]={joints=joints,elapsed=0,nextVisibility=0,visible=true,interval=1/30,phase=math.random()*6.28}
end
for _,actor in ipairs(CollectionService:GetTagged("CozyCombatActor"))do bindCombatActor(actor)end
CollectionService:GetInstanceAddedSignal("CozyCombatActor"):Connect(bindCombatActor)
CollectionService:GetInstanceRemovedSignal("CozyCombatActor"):Connect(function(actor)combatActors[actor]=nil end)
RunService.PreSimulation:Connect(function(dt)
 local camera=workspace.CurrentCamera
 if not camera then return end
 local now=os.clock()
 for actor,record in pairs(combatActors)do
  if not actor.Parent then combatActors[actor]=nil else
   -- 비동기 원본 모델 연결 뒤 실제 관절을 다시 수집한다.
   if not record.originalChecked and (actor:GetAttribute("CC0VisualReady") or actor:GetAttribute("SharedMonsterVisualReady")) then
    record.joints={}
    for _,joint in ipairs(actor:GetDescendants())do
     if joint:IsA("Motor6D")and joint.Part1 then table.insert(record.joints,joint)end
    end
    record.originalChecked=true
   end
   record.elapsed+=dt
   if now>=record.nextVisibility then
    record.nextVisibility=now+.25
    local distance=(actor.Position-camera.CFrame.Position).Magnitude
    local screen,visible=camera:WorldToViewportPoint(actor.Position)
    record.visible=distance<220 and visible and screen.Z>0
    record.interval=distance<80 and 1/30 or distance<140 and 1/18 or 1/10
   end
   if record.visible and record.elapsed>=record.interval then
    local step=math.min(record.elapsed,.1);record.elapsed=0
    local state=actor:GetAttribute("CozyMotionState")or"IDLE"
    local speed=actor:GetAttribute("CozyMotionSpeed")or 0
    local moving=state=="WALK" and speed>0
    local phase=now*(moving and math.clamp(speed*1.35,5,13) or 2)+record.phase
    local stride=moving and math.sin(phase)*.68 or math.sin(phase)*.025
    local attack=state=="ATTACK" and math.sin(now*14)*.52+.48 or 0
    local hit=state=="HIT" and .35 or 0
    local death=state=="DEATH" and .85 or 0
    for _,joint in ipairs(record.joints)do
     if joint.Parent and joint.Part1 then
      local name=joint.Name
      local arm=name:find("Arm",1,true)~=nil
      local leg=name:find("Leg",1,true)~=nil
      local visual=name:find("CozyVisualJoint",1,true)~=nil
      local side=name:find("LJoint",1,true)and 1 or name:find("RJoint",1,true)and -1 or joint.Part1.Position.X<actor.Position.X and 1 or -1
      if arm or leg or visual then
       local angle
       local roll
       if visual then
        angle=stride*.08+attack*.18+hit*.12+death*.3
        roll=stride*.025
       else
        angle=(arm and -side or side)*stride+(arm and attack or 0)+hit+death
        roll=arm and side*attack*.22 or 0
       end
       joint.Transform=joint.Transform:Lerp(CFrame.Angles(angle,0,roll),math.clamp(step*16,0,1))
      end
     end
    end
   elseif not record.visible then
    record.elapsed=math.min(record.elapsed,.1)
   end
  end
 end
end)

-- 사운드
local function sound(name,id,volume,looped)
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Looped=looped;s.Parent=SoundService;return s
end
local bgm=sound("CozyBackground",C.Audio.Background,.16,true)
local battleBgm=sound("CozyBattle",C.Audio.Battle,.2,true)
local actionSfx=sound("CozyAction",C.Audio.Action,.28,false)
local victorySfx=sound("CozyVictory",C.Audio.Victory,.3,false)
local resourceSfx=sound("CozyResource",C.Audio.Resource,.22,false)
local buildSfx=sound("CozyBuild",C.Audio.Build,.25,false)
local hitSfx=sound("CozyHit",C.Audio.Hit,.24,false)
bgm.Volume = table.find(studioAssetFamily("AUDIO"), "ENV_FOREST") and .18 or bgm.Volume

-- 기존 포근섬 월드/야생동물/오디오에 선택된 내부 자산 family를 실제 Roblox 표현으로 연결한다.
task.defer(function()
  local cozyWorld = workspace:WaitForChild("CozyConquestWorld")

  -- 곰은 포근섬 출현 대상에서 제외한다. 기존 멧돼지 재질은 유지한다.
  -- 투명한 동물 루트와 약탈병 충돌 부품은 건드리지 않는다.
  local furParts = {BoarBody=true, BoarShoulder=true, BoarMane=true}
  local function bindCreatureModel(instance)
    if not table.find(studioAssetFamily("CREATURE"), "FUR_PATCH") then return end
    if instance:IsA("BasePart") and furParts[instance.Name] then
      instance.Material = Enum.Material.Fabric
    end
  end
  for _, descendant in ipairs(cozyWorld:GetDescendants()) do bindCreatureModel(descendant) end
  cozyWorld.DescendantAdded:Connect(bindCreatureModel)

  local lighting = game:GetService("Lighting")
  local atmosphere = lighting:FindFirstChild("StudioCozyAtmosphere")
  if not atmosphere then
    atmosphere = Instance.new("Atmosphere")
    atmosphere.Name = "StudioCozyAtmosphere"
    atmosphere.Parent = lighting
  end
  atmosphere.Color = table.find(studioAssetFamily("ENVIRONMENT"), "FOG_LAYER") and Color3.fromRGB(210, 229, 220) or atmosphere.Color
  atmosphere.Density = 0.16
  atmosphere.Haze = 0.8

  local plaza = cozyWorld:WaitForChild("VillagePlaza")
  if plaza and plaza:IsA("BasePart") then
    plaza.Material = table.find(studioAssetFamily("MATERIAL"), "STONE") and Enum.Material.Cobblestone or plaza.Material

    local vfxAttachment = Instance.new("Attachment")
    vfxAttachment.Name = "StudioCozyVfxAttachment"
    vfxAttachment.Position = Vector3.new(0, plaza.Size.Y * 0.5 + 0.2, 0)
    vfxAttachment.Parent = plaza
    local emitter = Instance.new("ParticleEmitter")
    emitter.Name = "StudioCozyVfx"
    emitter.Rate = 0
    emitter.Lifetime = NumberRange.new(0.4, 0.75)
    emitter.Speed = NumberRange.new(0.4, 1.2)
    emitter.SpreadAngle = Vector2.new(30, 30)
    emitter.LightEmission = table.find(studioAssetFamily("VFX"), "STATUS_GLOW") and 0.45 or 0
    emitter.Parent = vfxAttachment
    emitter:Emit(14)
  end

  local boat = cozyWorld:WaitForChild("VillageBoat")
  if boat and boat:IsA("BasePart") then
    boat.Material = table.find(studioAssetFamily("PROP"), "LAMP") and Enum.Material.WoodPlanks or boat.Material
    local baseOrientation = boat.Orientation
    TweenService:Create(boat, TweenInfo.new(1.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {Orientation = table.find(studioAssetFamily("MOTION"), "IDLE_RELAXED") and baseOrientation + Vector3.new(0, 2, 1) or baseOrientation}):Play()
  end
end)
local captureSfx=sound("CozyCapture",C.Audio.Capture,.34,false)
local lastCaptured=p:GetAttribute("CapturedBases")or 0
bgm:Play()

-- UI 공통
local gui=Instance.new("ScreenGui")
gui.Name="CozyConquest"
gui.ResetOnSpawn=false
gui.IgnoreGuiInset=false
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets
gui.Parent=p:WaitForChild("PlayerGui")
foundationRemote:FireServer("INPUT_READY")
task.spawn(function()
 local camera=workspace.CurrentCamera
 local character=p.Character or p.CharacterAdded:Wait()
 local h=character:WaitForChild("Humanoid",10)
 if camera and h then
  for _=1,30 do
   if camera.CameraSubject==h then foundationRemote:FireServer("CAMERA_READY");break end
   task.wait(.1)
  end
 end
end)

local function roundify(target,radius)
 local corner=target:FindFirstChildOfClass("UICorner") or Instance.new("UICorner");corner.CornerRadius=UDim.new(0,0);corner.Parent=target
end

local function outline(target,transparency)
 local stroke=Instance.new("UIStroke");stroke.Thickness=1.5;stroke.Transparency=transparency or .35;stroke.Parent=target
end

local function makeButton(parent,text,color)
 local b=CommonUI.CreatePrimaryButton({text=text,minWidth=44,minHeight=52,textSize=14,cornerRadius=0,theme={Primary=color,PrimaryTop=color,PrimaryBottom=color,TouchHeight=52}})
 b.ZIndex=parent:IsA("GuiObject")and parent.ZIndex+1 or 1
 for _,child in ipairs(b:GetChildren())do if child:IsA("GuiObject")then child.ZIndex=b.ZIndex+1 end end
 b.Parent=parent
 return b
end

-- 로딩/시작 메뉴: 월드 준비 뒤 플레이어가 직접 게임 진입
local startupOverlay=Instance.new("Frame")
startupOverlay.Name="StartupEntry"
startupOverlay.Size=UDim2.fromScale(1,1)
startupOverlay.BackgroundColor3=Color3.fromRGB(20,36,33)
startupOverlay.BackgroundTransparency=.04
startupOverlay.BorderSizePixel=0
startupOverlay.Active=true
startupOverlay.ZIndex=100
startupOverlay.Parent=gui

local startupCard=CommonUI.CreatePanel({name="StartupCard",cornerRadius=0})
startupCard.AnchorPoint=Vector2.new(.5,.5)
startupCard.Position=UDim2.fromScale(.5,.5)
startupCard.Size=touchEnabled and UDim2.new(.88,0,0,300)or UDim2.fromOffset(460,320)
startupCard.BackgroundColor3=Color3.fromRGB(31,54,48)
startupCard.BackgroundTransparency=.06
startupCard.BorderSizePixel=0
startupCard.ZIndex=101
startupCard.Parent=startupOverlay
roundify(startupCard,18);outline(startupCard,.35)

local startupTitle=Instance.new("TextLabel")
startupTitle.AnchorPoint=Vector2.new(.5,0)
startupTitle.Position=UDim2.new(.5,0,0,24)
startupTitle.Size=UDim2.new(.86,0,0,54)
startupTitle.BackgroundTransparency=1
startupTitle.Text="포근섬"
startupTitle.TextColor3=Color3.fromRGB(255,244,208)
startupTitle.TextScaled=true
startupTitle.Font=Enum.Font.GothamBold
startupTitle.ZIndex=102
startupTitle.Parent=startupCard

local startupSubtitle=Instance.new("TextLabel")
startupSubtitle.AnchorPoint=Vector2.new(.5,0)
startupSubtitle.Position=UDim2.new(.5,0,0,82)
startupSubtitle.Size=UDim2.new(.86,0,0,34)
startupSubtitle.BackgroundTransparency=1
startupSubtitle.Text="채집 · 마을 성장 · 5개 거점 정복"
startupSubtitle.TextColor3=Color3.fromRGB(211,239,213)
startupSubtitle.TextScaled=true
startupSubtitle.Font=Enum.Font.GothamBold
startupSubtitle.ZIndex=102
startupSubtitle.Parent=startupCard

local startupGuide=Instance.new("TextLabel")
startupGuide.AnchorPoint=Vector2.new(.5,0)
startupGuide.Position=UDim2.new(.5,0,0,126)
startupGuide.Size=UDim2.new(.84,0,0,64)
startupGuide.BackgroundTransparency=1
startupGuide.Text="나무와 작물에 가까이 가서 채집하고\n주민을 배치해 병사를 키운 뒤 거점을 공격해."
startupGuide.TextColor3=Color3.fromRGB(227,236,228)
startupGuide.TextWrapped=true
startupGuide.TextScaled=true
startupGuide.Font=Enum.Font.Gotham
startupGuide.ZIndex=102
startupGuide.Parent=startupCard

local startupStatus=Instance.new("TextLabel")
startupStatus.AnchorPoint=Vector2.new(.5,0)
startupStatus.Position=UDim2.new(.5,0,0,198)
startupStatus.Size=UDim2.new(.84,0,0,28)
startupStatus.BackgroundTransparency=1
startupStatus.Text="월드와 조작을 준비하는 중..."
startupStatus.TextColor3=Color3.fromRGB(170,201,186)
startupStatus.TextScaled=true
startupStatus.Font=Enum.Font.Gotham
startupStatus.ZIndex=102
startupStatus.Parent=startupCard

local startupPlay=makeButton(startupCard,"게임 시작",Color3.fromRGB(86,132,89))
startupPlay.Name="PlayButton"
startupPlay.AnchorPoint=Vector2.new(.5,1)
startupPlay.Position=UDim2.new(.5,0,1,-22)
startupPlay.Size=UDim2.new(.72,0,0,48)
startupPlay.Visible=false
startupPlay.ZIndex=102

task.spawn(function()
 local deadline=os.clock()+5
 repeat
  local camera=workspace.CurrentCamera
  local character=p.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local stateReady=p:GetAttribute("LastActivity")~=nil
  local cameraReady=camera and humanoid and camera.CameraSubject==humanoid
  if stateReady and cameraReady then break end
  task.wait(.1)
 until os.clock()>=deadline

 if startupOverlay.Parent then
  startupStatus.Text="준비 완료 · 진행 데이터는 자동 저장"
  startupPlay.Visible=true
 end
end)

-- 모바일 채집 안내는 로딩 화면이 아닌 게임 시작 시점부터 표시한다.
local touchGatherHintUntil=0
startupPlay.Activated:Connect(function()
 if not startupPlay.Visible then return end
 startupPlay.Active=false
 if touchEnabled then
  touchGatherHintUntil=os.clock()+9
  task.delay(9,function()
   local hint=gui:FindFirstChild("ManualGatherHint")
   if hint then hint.Visible=false end
  end)
 end
 startupOverlay:Destroy()
end)

local feedbackFlash=Instance.new("Frame")
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
local verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = C.VerifiedExternalLearning or C.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 6
local verifiedLearningRoot = gui
local verifiedLearningSemanticVariant = "PROGRESSION_RISK"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(156, 132, 255)
local verifiedLearningSemanticMood = "PRESERVE_AUTHORED_PRESENTATION"
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
verifiedLearningColorGrade.Saturation = 0
verifiedLearningColorGrade.Contrast = 0
verifiedLearningColorGrade.Brightness = 0
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

-- 안내 UI는 게임의 기존 HUD/메뉴가 소유한다. 학습 바인딩은 화면 위에 문구를 추가하지 않는다.
verifiedLearningRoot:SetAttribute("VerifiedLearningProgressionRiskCue", verifiedLearningSemanticVariant)

-- Roblox skill VFX / camera / motion feedback.
local function playVerifiedLearningActionFeedback(control, serverConfirmed)
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningLastControl", control and control.Name or "GAMEPLAY_STATE")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputRespondedAt", os.clock())

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

  -- 메뉴 클릭은 버튼 응답만. 전투/카메라 연출은 서버가 확인한 해당 행동만 사용한다.
  if serverConfirmed~=true then return end
  local approvedScope=tostring(verifiedLearningPlayer:GetAttribute("LastApprovedScope")or""):upper()
  if not(approvedScope:find("ATTACK",1,true)or approvedScope:find("SKILL",1,true)or approvedScope:find("HIT",1,true))then return end

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
  playVerifiedLearningActionFeedback(verifiedLearningLastControl, true)
  verifiedLearningLastControl = nil
end)
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END

-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN
gui:SetAttribute("VerifiedExternalLearningCoveragePct", verifiedExternalLearningContext.CoveragePct or 0)
gui:SetAttribute("VerifiedExternalLearningContentComplete", verifiedExternalLearningContext.ContentComplete == true)
gui:SetAttribute("VerifiedExternalLearningCount", #verifiedExternalLearningIds)
gui:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedExternalLearningPrinciples)
gui:SetAttribute("VerifiedExternalLearningFingerprint", verifiedExternalLearningContext.MemoryFingerprint or "")
gui:SetAttribute("VerifiedExternalGameDevelopmentPrincipleCount", #verifiedExternalGameDevelopmentPrinciples)
gui:SetAttribute("VerifiedExternalLearningSemanticMappingVersion", verifiedExternalLearningContext.SemanticMappingVersion or 0)
gui:SetAttribute("VerifiedExternalLearningSemanticMappingFingerprint", verifiedExternalLearningContext.SemanticMappingFingerprint or "")
gui:SetAttribute("VerifiedExternalLearningDispositionCount", #verifiedExternalLearningDispositions)
gui:SetAttribute("VerifiedExternalLearningMappingCount", #verifiedExternalLearningMappings)
gui:SetAttribute("VerifiedLearningSemanticVariant", verifiedExternalLearningContext.SemanticVariant or "")
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END

if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = feedbackFlash
end
feedbackFlash:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
feedbackFlash:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))

feedbackFlash.Size=UDim2.fromScale(1,1)
feedbackFlash.BackgroundTransparency=1
feedbackFlash.BorderSizePixel=0
feedbackFlash.ZIndex=20
feedbackFlash.Parent=gui

local function flash(color)
 feedbackFlash.BackgroundColor3=color;feedbackFlash.BackgroundTransparency=.78
 task.delay(.16,function()if feedbackFlash.Parent then feedbackFlash.BackgroundTransparency=1 end end)
end

-- 상단 HUD: 자원과 정복 진행
local hud=CommonUI.CreatePanel({name="TopHUD",cornerRadius=0})
hud.Name="TopHUD"
hud.AnchorPoint=Vector2.new(0,0)
hud.Position=UDim2.fromOffset(8,8)
hud.Size=touchEnabled and UDim2.fromOffset(220,52)or UDim2.fromOffset(286,58)
hud.BackgroundColor3=Color3.fromRGB(38,67,61)
hud.BackgroundTransparency=.08
hud.Parent=gui
roundify(hud,14);outline(hud,.4)

local title=Instance.new("TextLabel")
title.Size=UDim2.new(1,-16,0,18)
title.Position=UDim2.fromOffset(8,3)
title.BackgroundTransparency=1
title.Text="포근섬 · 5거점 정복"
title.TextColor3=Color3.fromRGB(255,244,208)
title.TextXAlignment=Enum.TextXAlignment.Left
title.TextScaled=true
title.Font=Enum.Font.GothamBold
title.Parent=hud

local resources=Instance.new("TextLabel")
resources.Size=UDim2.new(1,-16,0,28)
resources.Position=UDim2.fromOffset(8,24)
resources.BackgroundTransparency=1
resources.TextColor3=Color3.fromRGB(235,245,238)
resources.TextWrapped=true
resources.TextScaled=false
resources.TextSize=touchEnabled and 11 or 13
resources.Font=Enum.Font.Gotham
resources.Parent=hud

local objective=Instance.new("TextLabel")
objective.Size=touchEnabled and UDim2.fromOffset(220,24)or UDim2.fromOffset(310,28)
objective.AnchorPoint=touchEnabled and Vector2.new(0,0)or Vector2.new(.5,0)
objective.Position=touchEnabled and UDim2.fromOffset(8,64)or UDim2.new(.5,0,0,8)
objective.BackgroundColor3=Color3.fromRGB(29,50,46)
objective.BackgroundTransparency=.18
objective.TextColor3=Color3.fromRGB(255,232,158)
objective.TextWrapped=true
objective.TextScaled=false
objective.TextSize=13
objective.TextTruncate=Enum.TextTruncate.AtEnd
objective.Font=Enum.Font.GothamBold
objective.Parent=gui
roundify(objective,9)

local gatherHint=Instance.new("TextLabel")
gatherHint.Name="ManualGatherHint"
gatherHint.Size=touchEnabled and UDim2.fromOffset(174,22)or UDim2.fromOffset(188,24)
gatherHint.Position=touchEnabled and UDim2.fromOffset(8,92)or UDim2.fromOffset(8,72)
gatherHint.BackgroundColor3=Color3.fromRGB(33,58,47)
gatherHint.BackgroundTransparency=.24
gatherHint.TextColor3=Color3.fromRGB(211,239,213)
gatherHint.TextSize=11
gatherHint.Font=Enum.Font.GothamBold
gatherHint.Text="나무·작물을 터치해 채집"
gatherHint.Parent=gui
roundify(gatherHint,8)
-- 채집 안내 카운트다운은 게임 시작 버튼에서 시작한다.

-- 하단 조작: 채집은 월드 상호작용, 여기에는 마을 운영/정복만 표시
local controls=CommonUI.CreatePanel({name="ActionDock",cornerRadius=0})
controls.Name="ActionDock"
controls.AnchorPoint=Vector2.new(.5,1)
controls.Position=UDim2.new(.5,0,1,-10)
controls.Size=UDim2.fromOffset(196,56)
controls.BackgroundColor3=Color3.fromRGB(26,43,39)
controls.BackgroundTransparency=.12
controls.Parent=gui
roundify(controls,14);outline(controls,.5)

local actionPopup=CommonUI.CreatePanel({name="ActionPopup",cornerRadius=0})
actionPopup.Name="ActionPopup"
actionPopup.AnchorPoint=Vector2.new(.5,1)
actionPopup.Position=UDim2.new(.5,0,1,-74)
actionPopup.Size=UDim2.fromOffset(260,128)
actionPopup.BackgroundColor3=Color3.fromRGB(26,43,39)
actionPopup.BackgroundTransparency=.08
actionPopup.Visible=false
actionPopup.Active=true
actionPopup.Parent=gui
roundify(actionPopup,14);outline(actionPopup,.5)

local groups={
 {
  title="마을",color=Color3.fromRGB(126,96,48),
  actions={{C.Actions.HIRE,"주민 고용"},{C.Actions.WOOD_JOB,"벌목 배치"},{C.Actions.FOOD_JOB,"농장 배치"},{C.Actions.BARRACKS,"병영 강화"}},
 },
 {
  title="정복",color=Color3.fromRGB(150,67,52),
  actions={{C.Actions.RECRUIT,"병사 모집"},{C.Actions.ATTACK,"기지 공격"},{C.Actions.SUPPORT,"원정 지원"}},
 },
}

local actionButtons={}
local openGroup=nil
local function showGroup(index)
 if openGroup==index and actionPopup.Visible then
  actionPopup.Visible=false
  openGroup=nil
  return
 end
 openGroup=index
 for _,b in ipairs(actionButtons)do b.Visible=false end
 local group=groups[index]
 local offset=0
 for i=1,index-1 do offset+=#groups[i].actions end
 for row,_ in ipairs(group.actions)do
  local b=actionButtons[offset+row]
  b.Visible=true
 end
 actionPopup.Visible=true

end

for groupIndex,group in ipairs(groups)do
 local tab=makeButton(controls,group.title,group.color)
 tab.Size=UDim2.new(.46,0,0,52)
 tab.Position=UDim2.new(.035+(groupIndex-1)*.49,0,0,6)
 tab.Activated:Connect(function()showGroup(groupIndex)end)

 for row,a in ipairs(group.actions)do
  local b=makeButton(actionPopup,a[2],group.color)
  b.Size=UDim2.fromOffset(116,52)
  local col=(row-1)%2
  local line=math.floor((row-1)/2)
  b.Position=UDim2.fromOffset(7+col*122,8+line*60)
  b.Visible=false
  b.Activated:Connect(function()
   if a[1]==C.Actions.ATTACK or a[1]==C.Actions.RECRUIT or a[1]==C.Actions.BARRACKS then actionSfx.TimePosition=0;actionSfx:Play()end
   remote:FireServer(a[1])
   actionPopup.Visible=false
   openGroup=nil
  end)
  table.insert(actionButtons,b)
 end
end

-- 메인: 안전 영역 크기 변경/회전에 맞춰 조작 영역과 메뉴를 재배치한다.
local function layoutControls()
 local size=gui.AbsoluteSize;local landscape=size.X>size.Y and size.Y<500
 hud.Size=UDim2.fromOffset(math.min(340,size.X-16),58)
 resources.TextSize=12
 objective.AnchorPoint=Vector2.zero;objective.Position=UDim2.fromOffset(8,72)
 objective.Size=UDim2.new(1,-16,0,38)
 gatherHint.Position=UDim2.fromOffset(8,116)
 -- 낮은 가로 화면에서는 메뉴와 탭을 좌우로 나눠 터치 영역을 보존한다.
 controls.Size=UDim2.fromOffset(landscape and math.min(244,size.X-284)or 244,64)
 controls.AnchorPoint=landscape and Vector2.new(1,1)or Vector2.new(.5,1)
 controls.Position=landscape and UDim2.new(1,-8,1,-110)or UDim2.new(.5,0,1,-110)
 actionPopup.AnchorPoint=landscape and Vector2.zero or Vector2.new(.5,.5)
 actionPopup.Position=landscape and UDim2.fromOffset(8,8)or UDim2.fromScale(.5,.5)
 actionPopup.ZIndex=20
 for _,b in ipairs(actionButtons)do b.ZIndex=21 end
 local ready=startupOverlay.Parent==nil
 hud.Visible=ready and not actionPopup.Visible;objective.Visible=ready and not actionPopup.Visible;controls.Visible=ready
 gatherHint.Visible=ready and not actionPopup.Visible and (not touchEnabled or os.clock()<touchGatherHintUntil)
 if not ready then actionPopup.Visible=false end
end
actionPopup:GetPropertyChangedSignal("Visible"):Connect(layoutControls)
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutControls)
startupOverlay.Destroying:Connect(function()task.defer(layoutControls)end)
layoutControls()

-- 상태 갱신
local function render()
 local idx=p:GetAttribute("NextBaseIndex")or 1
 local b=C.Bases[idx]
 local target=b and (b.Name.." · "..(b.Enemy or"수비대").." · 전력 "..b.Strength)or"5개 거점 정복 완료"
 resources.Text=string.format("나무 %d · 식량 %d · 코인 %d\n병사 %d · 병영 Lv.%d · 점령 %d/5",
  p:GetAttribute("Wood")or 0,p:GetAttribute("Food")or 0,p:GetAttribute("Coins")or 0,
  p:GetAttribute("Troops")or 0,p:GetAttribute("BarracksLevel")or 1,p:GetAttribute("CapturedBases")or 0)

 local inBattle=p:GetAttribute("InBattle")==true
 local activity=p:GetAttribute("LastActivity")or"나무/작물에 가까이 가서 직접 채집"
 objective.Text=inBattle and ("전투 "..(p:GetAttribute("BattleProgress")or 0).."% · "..target)or activity

 if inBattle then
  if bgm.IsPlaying then bgm:Stop()end
  if not battleBgm.IsPlaying then battleBgm:Play()end
 else
  if battleBgm.IsPlaying then battleBgm:Stop()end
  if not bgm.IsPlaying then bgm:Play()end
 end

 local captured=p:GetAttribute("CapturedBases")or 0
 if captured>lastCaptured then victorySfx.TimePosition=0;victorySfx:Play()end
 lastCaptured=captured
end

for _,k in ipairs({"Wood","Food","Coins","Iron","Horses","Stone","Gold","Sulfur","Residents","WoodWorkers","Farmers","BarracksLevel","Troops","CapturedBases","CapturedIslands","NextBaseIndex","BattleProgress","LastActivity","InBattle"})do
 p:GetAttributeChangedSignal(k):Connect(render)
end

p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 local value=tostring(p:GetAttribute("FeedbackEvent")or"")
 if value:find("^RESOURCE:")then resourceSfx.TimePosition=0;resourceSfx:Play();flash(Color3.fromRGB(120,220,120))
 elseif value:find("^BUILD:")then buildSfx.TimePosition=0;buildSfx:Play();flash(Color3.fromRGB(240,200,110))
 elseif value:find("^HIT:")then hitSfx.TimePosition=0;hitSfx:Play();flash(Color3.fromRGB(235,110,90))
 elseif value:find("^CAPTURE:")then captureSfx.TimePosition=0;captureSfx:Play();flash(Color3.fromRGB(110,210,255))end
end)

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedSharedObjective",tonumber(snapshot.SharedObjective)or 0)
end)

QACamera.install(C,gui,function()
 return{
  {label="cozy-home-overview",position=Vector3.new(0,145,170),lookAt=Vector3.new(0,4,0)},
  {label="cozy-home-ground",position=Vector3.new(0,24,98),lookAt=Vector3.new(0,5,0)},
  -- 거대 시작섬 QA: 기존 촬영지점은 유지하고 추가 경관만 확인한다.
  {label="cozy-grand-start-island",position=Vector3.new(0,930,1060),lookAt=Vector3.new(0,6,715)},
  {label="cozy-ancient-forest",position=Vector3.new(-375,140,640),lookAt=Vector3.new(-265,14,550)},
  {label="cozy-moon-lake",position=Vector3.new(365,165,920),lookAt=Vector3.new(225,4,780)},
  {label="cozy-sunset-lighthouse",position=Vector3.new(110,178,1340),lookAt=Vector3.new(0,52,1200)},
  {label="cozy-east-regions",position=Vector3.new(270,135,5),lookAt=Vector3.new(170,5,0)},
  {label="cozy-west-regions",position=Vector3.new(-270,135,5),lookAt=Vector3.new(-170,5,0)},
  {label="cozy-volcano",position=Vector3.new(0,145,-350),lookAt=Vector3.new(0,12,-232)},
 }
end)


render()
