-- 파일명: roblox-games/daechung-rpg/client/Game.client.luau
-- 대충 RPG 모바일 HUD: 마을 허브 + 포탈 사냥터 + 전투 UI
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local TweenService=game:GetService("TweenService")
local ProximityPromptService=game:GetService("ProximityPromptService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local CommonUI=require(RS:WaitForChild("Shared"):WaitForChild("RobloxCommonUI"))
local Style=require(RS:WaitForChild("Shared"):WaitForChild("VisualStyle"))
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
  CHARACTER = "APPLIED",
  CREATURE = "APPLIED",
  BUILDING = "APPLIED",
  ENVIRONMENT = "APPLIED",
  WEAPON = "APPLIED",
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
local RPGMenu=require(RS:WaitForChild("Shared"):WaitForChild("RPGMenu"))
local RPGMenuModel=require(RS:WaitForChild("Shared"):WaitForChild("RPGMenuModel"))
local remote=RS:WaitForChild(C.RemoteName)
local foundationRemote=RS:WaitForChild("RuntimeFoundationReport")
local foundationRoundtrip=false
foundationRemote.OnClientEvent:Connect(function(kind)
 if kind=="REMOTE_PONG"then foundationRoundtrip=true;foundationRemote:FireServer("REMOTE_ROUNDTRIP")end
end)

local function sound(name,id,volume)
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Parent=SoundService;return s
end
local actionSfx=sound("RPGAction",C.Audio.Action,.22)
local hitSfx=sound("RPGHit",C.Audio.Hit,.2)
local skillSfx=sound("RPGSkill",C.Audio.Skill,.24)
local levelSfx=sound("RPGLevel",C.Audio.LevelUp,.26)
actionSfx.Volume = table.find(studioAssetFamily("AUDIO"), "ATTACK_SWING_LIGHT") and .24 or actionSfx.Volume

local studioSkillEmitter = nil

-- 기존 Five Portal RPG 시스템에 선택된 내부 자산 family를 실제 Roblox 네이티브 소비자로 연결한다.
local function bindStudioCharacterAssets(character)
  if not character then return end
  local torso = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
  if torso and torso:IsA("BasePart") then
    torso.Material = table.find(studioAssetFamily("CHARACTER"), "TORSO_PLATE") and Enum.Material.Metal or torso.Material
  end
  local function bindWeapon(part)
    -- 검 계열에만 검날 재질을 연결하고 지팡이의 목재 및 강화 네온 재질을 보존한다.
    local classId = tostring(character:GetAttribute("ClassId") or p:GetAttribute("ClassId") or "")
    if part:IsA("BasePart") and part.Name:find("ClassWeapon", 1, true)
      and (classId == "BREAKER" or classId == "SHADOW")
      and part.Material ~= Enum.Material.Neon
      and table.find(studioAssetFamily("WEAPON"), "BLADE_LONG") then
      part.Material = Enum.Material.Metal
    end
  end
  for _, descendant in ipairs(character:GetDescendants()) do bindWeapon(descendant) end
  character.DescendantAdded:Connect(bindWeapon)

  local rootPart = character:FindFirstChild("HumanoidRootPart") or character:WaitForChild("HumanoidRootPart", 5)
  if rootPart and not rootPart:FindFirstChild("StudioRpgSkillAttachment") then
    local attachment = Instance.new("Attachment")
    attachment.Name = "StudioRpgSkillAttachment"
    attachment.Parent = rootPart
    local emitter = Instance.new("ParticleEmitter")
    emitter.Name = "StudioRpgSkillEmitter"
    emitter.Rate = 0
    emitter.Lifetime = NumberRange.new(0.16, 0.34)
    emitter.Speed = NumberRange.new(5, 9)
    emitter.SpreadAngle = Vector2.new(45, 45)
    emitter.LightEmission = table.find(studioAssetFamily("VFX"), "IMPACT_FLASH") and 1 or (table.find(studioAssetFamily("SKILL"), "IMPACT_SMALL") and 0.8 or 0)
    emitter.LightInfluence = table.find(studioAssetFamily("VFX"), "IMPACT_FLASH") and 0 or 1
    emitter.Parent = attachment
    studioSkillEmitter = emitter
  end
end
if p.Character then task.defer(bindStudioCharacterAssets, p.Character) end
p.CharacterAdded:Connect(bindStudioCharacterAssets)

task.defer(function()
  local rpgWorld = workspace:WaitForChild("DaechungRPGWorld")
  local village = rpgWorld:WaitForChild("Village")
  local plaza = village:WaitForChild("VillagePlaza")
  if plaza and plaza:IsA("BasePart") then
    plaza.Material = table.find(studioAssetFamily("MATERIAL"), "STONE") and Enum.Material.Cobblestone or plaza.Material
    if not village:FindFirstChild("StudioRpgBuildingTrim") then
      local trim = Instance.new("Part")
      trim.Name = "StudioRpgBuildingTrim"
      trim.Size = Vector3.new(18, 0.45, 1)
      trim.Position = plaza.Position + Vector3.new(0, plaza.Size.Y * 0.5 + 0.3, -34)
      trim.Anchored = true
      trim.CanCollide = false
      trim.Material = table.find(studioAssetFamily("BUILDING"), "WALL_SOLID") and Enum.Material.Slate or Enum.Material.SmoothPlastic
      trim.Color = Color3.fromRGB(117, 104, 88)
      trim.Parent = village
    end
  end

  local lighting = game:GetService("Lighting")
  local atmosphere = lighting:FindFirstChild("StudioRpgAtmosphere")
  if not atmosphere then
    atmosphere = Instance.new("Atmosphere")
    atmosphere.Name = "StudioRpgAtmosphere"
    atmosphere.Parent = lighting
  end
  atmosphere.Color = table.find(studioAssetFamily("ENVIRONMENT"), "FOG_LAYER") and Color3.fromRGB(205, 213, 225) or atmosphere.Color
  atmosphere.Density = 0.12
  atmosphere.Haze = 0.65

  -- 적의 EnemyId는 투명 충돌 루트에 있으므로 실제 보이는 털 부품에만 적용한다.
  local furPartNames = {
    WolfBody=true, WolfChest=true, WolfHead=true, BoarBody=true, BoarHead=true,
    DeerBody=true, DeerHead=true, SnowBeastBody=true, SnowBeastShoulder=true,
    SnowBeastMane=true, SnowBeastHead=true,
  }
  local function bindCreature(instance)
    if instance:IsA("BasePart") and furPartNames[instance.Name]
      and table.find(studioAssetFamily("CREATURE"), "FUR_PATCH") then
      instance.Material = Enum.Material.Fabric
    end
  end
  local function bindProp(instance)
    if not instance:IsA("MeshPart") or not instance.Name:find("AssetProp_", 1, true) then return end
    -- 전체 장식 MeshPart를 금속으로 덮어쓰지 않고 조명 소품만 처리한다.
    local name = instance.Name:lower()
    if (name:find("lamp", 1, true) or name:find("lantern", 1, true))
      and table.find(studioAssetFamily("PROP"), "LAMP") then
      instance.Material = Enum.Material.Metal
    end
  end
  for _, descendant in ipairs(rpgWorld:GetDescendants()) do
    bindCreature(descendant)
    bindProp(descendant)
  end
  rpgWorld.DescendantAdded:Connect(function(descendant)
    bindCreature(descendant)
    bindProp(descendant)
  end)
end)

local gui=Instance.new("ScreenGui");gui.Name="RPGHUD";gui.ResetOnSpawn=false;gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets;gui:SetAttribute("TouchEnabled",touchEnabled);gui.Parent=p:WaitForChild("PlayerGui")
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
local function corner(x,r)local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r or 10);c.Parent=x end
local function stroke(x,t)local s=Instance.new("UIStroke");s.Thickness=1.3;s.Transparency=t or .5;s.Parent=x end
local function button(parent,text,color)
 local b=CommonUI.CreatePrimaryButton({text=text,minWidth=44,minHeight=52,textSize=14,theme={Primary=color,PrimaryTop=color,PrimaryBottom=color,TouchHeight=52}})
 b.ZIndex=parent:IsA("GuiObject")and parent.ZIndex+1 or 1
 for _,child in ipairs(b:GetChildren())do if child:IsA("GuiObject")then child.ZIndex=b.ZIndex+1 end end
 b.Parent=parent
 return b
end

-- 로딩/시작 메뉴: 마을 진입 전 목표와 기본 조작 안내
local startupOverlay=Instance.new("Frame")
startupOverlay.Name="RPGStartupEntry"
startupOverlay.Size=UDim2.fromScale(1,1)
startupOverlay.BackgroundColor3=Color3.fromRGB(19,21,29)
startupOverlay.BackgroundTransparency=.03
startupOverlay.BorderSizePixel=0
startupOverlay.Active=true
startupOverlay.ZIndex=100
startupOverlay.Parent=gui

local startupCard=Instance.new("Frame")
startupCard.AnchorPoint=Vector2.new(.5,.5)
startupCard.Position=UDim2.fromScale(.5,.5)
startupCard.Size=touchEnabled and UDim2.new(.88,0,0,385)or UDim2.fromOffset(480,405)
startupCard.BackgroundColor3=Color3.fromRGB(34,37,48)
startupCard.BackgroundTransparency=.04
startupCard.BorderSizePixel=0
startupCard.ZIndex=101
startupCard.Parent=startupOverlay
corner(startupCard,18);stroke(startupCard,.34)

local startupTitle=Instance.new("TextLabel")
startupTitle.AnchorPoint=Vector2.new(.5,0)
startupTitle.Position=UDim2.new(.5,0,0,24)
startupTitle.Size=UDim2.new(.88,0,0,54)
startupTitle.BackgroundTransparency=1
startupTitle.Text="5포탈 RPG: 던전 파티"
startupTitle.TextColor3=Color3.fromRGB(255,220,146)
startupTitle.TextScaled=true
startupTitle.Font=Enum.Font.GothamBold
startupTitle.ZIndex=102
startupTitle.Parent=startupCard

local startupSubtitle=Instance.new("TextLabel")
startupSubtitle.AnchorPoint=Vector2.new(.5,0)
startupSubtitle.Position=UDim2.new(.5,0,0,86)
startupSubtitle.Size=UDim2.new(.86,0,0,34)
startupSubtitle.BackgroundTransparency=1
startupSubtitle.Text="마을 준비 · 직업 선택 · 5개 포탈 정복"
startupSubtitle.TextColor3=Color3.fromRGB(214,221,239)
startupSubtitle.TextScaled=true
startupSubtitle.Font=Enum.Font.GothamBold
startupSubtitle.ZIndex=102
startupSubtitle.Parent=startupCard

local startupGuide=Instance.new("TextLabel")
startupGuide.AnchorPoint=Vector2.new(.5,0)
startupGuide.Position=UDim2.new(.5,0,0,130)
startupGuide.Size=UDim2.new(.84,0,0,78)
startupGuide.BackgroundTransparency=1
startupGuide.Text="게임 시작 후 직업을 먼저 고르고\n마을에서 퀘스트와 장비를 준비한 뒤 포탈로 이동해."
startupGuide.TextColor3=Color3.fromRGB(232,235,244)
startupGuide.TextWrapped=true
startupGuide.TextScaled=true
startupGuide.Font=Enum.Font.Gotham
startupGuide.ZIndex=102
startupGuide.Parent=startupCard

local startupStatus=Instance.new("TextLabel")
startupStatus.AnchorPoint=Vector2.new(.5,0)
startupStatus.Position=UDim2.new(.5,0,0,302)
startupStatus.Size=UDim2.new(.84,0,0,28)
startupStatus.BackgroundTransparency=1
startupStatus.Text="마을과 캐릭터를 준비하는 중..."
startupStatus.TextColor3=Color3.fromRGB(170,178,201)
startupStatus.TextScaled=true
startupStatus.Font=Enum.Font.Gotham
startupStatus.ZIndex=102
startupStatus.Parent=startupCard

-- 로비: 첫 화면에서 서버 저장형 외형을 선택한 뒤 입장한다.
startupTitle.Text="대충 RPG  ·  나만의 모험"
startupSubtitle.Text="캐릭터 꾸미기  /  마을  /  주택  /  5개 바이옴"
startupGuide.Text="라이브러리 기반 캐릭터 유형 · 방어구 · 장식 · 색상 선택"
startupGuide.Position=UDim2.new(.5,0,0,122)
startupGuide.Size=UDim2.new(.84,0,0,50)
local lobbyCustomize=button(startupCard,"캐릭터 외형 변경",Color3.fromRGB(74,136,129))
lobbyCustomize.Name="LobbyCustomize";lobbyCustomize.AnchorPoint=Vector2.new(.5,0)
lobbyCustomize.Position=UDim2.new(.73,0,0,216);lobbyCustomize.Size=UDim2.new(.42,0,0,36)
lobbyCustomize.ZIndex=104
lobbyCustomize.Text="피부색 바꾸기"
lobbyCustomize.Activated:Connect(function()remote:FireServer(C.Actions.CUSTOMIZE_NEXT)end)
local archetypeNames={"사무라이","무협 무인","서양 기사"}
local outfitButtons={
 {"캐릭터 유형","CUSTOMIZE_ARCHETYPE"},
 {"방어구","CUSTOMIZE_ARMOR"},
 {"모자·장식","CUSTOMIZE_DECORATION"}
}
for i,item in ipairs(outfitButtons)do
 local b=button(startupCard,item[1],Color3.fromRGB(64+17*i,88+10*i,111+9*i))
 b.Name="AvatarOutfit"..i;b.AnchorPoint=Vector2.new(.5,0)
 b.Position=UDim2.new(i%2==1 and .27 or .73,0,0,180+math.floor((i-1)/2)*36);b.Size=UDim2.new(.42,0,0,32);b.ZIndex=104
 b.Activated:Connect(function()remote:FireServer(item[2])end)
end
local lobbyStyle=Instance.new("TextLabel")
lobbyStyle.BackgroundTransparency=1;lobbyStyle.Size=UDim2.new(.84,0,0,24);lobbyStyle.TextWrapped=true
lobbyStyle.Position=UDim2.new(.08,0,0,273);lobbyStyle.ZIndex=104
lobbyStyle.TextColor3=Color3.fromRGB(212,230,218)
lobbyStyle.TextSize=13;lobbyStyle.Font=Enum.Font.Gotham;lobbyStyle.Parent=startupCard
local function showLobbyStyle()
 lobbyStyle.Text=archetypeNames[tonumber(p:GetAttribute("AvatarArchetype"))or 1].." · 갑옷 "..tostring(p:GetAttribute("AvatarArmor")or 0).."/2 · 장식 "..tostring(p:GetAttribute("AvatarDecoration")or 0).."/2 · 색 "..tostring(p:GetAttribute("AvatarStyle")or 1)
end
for _,k in ipairs({"AvatarStyle","AvatarArchetype","AvatarArmor","AvatarDecoration"})do p:GetAttributeChangedSignal(k):Connect(showLobbyStyle)end
showLobbyStyle()
local startupPlay=button(startupCard,"게임 시작",Color3.fromRGB(86,103,163))
startupPlay.Name="PlayButton"
startupPlay.AnchorPoint=Vector2.new(.5,1)
startupPlay.Position=UDim2.new(.5,0,1,-12)
startupPlay.Size=UDim2.new(.72,0,0,50)
startupPlay.Visible=false
startupPlay.ZIndex=102

task.spawn(function()
 local deadline=os.clock()+5
 repeat
  local camera=workspace.CurrentCamera
  local character=p.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local stateReady=p:GetAttribute("LastAction")~=nil
  local cameraReady=camera and humanoid and camera.CameraSubject==humanoid
  if stateReady and cameraReady then break end
  task.wait(.1)
 until os.clock()>=deadline

 if startupOverlay.Parent then
  startupStatus.Text="준비 완료 · 진행 데이터는 자동 저장"
  startupPlay.Visible=true
 end
end)

startupPlay.Activated:Connect(function()
 if not startupPlay.Visible then return end
 startupPlay.Active=false
 startupOverlay:Destroy()
end)

local refreshHud
local rpgMenu
local npcSpeechActive=false
local bossSceneActive=false
local objectContextActive=false
local tipsVisible=false
local notice=Instance.new("ScrollingFrame")
notice.Name="RPGNotice";notice.BackgroundTransparency=1;notice.BorderSizePixel=0
notice.ScrollBarThickness=3;notice.CanvasSize=UDim2.new();notice.AutomaticCanvasSize=Enum.AutomaticSize.Y
notice.ScrollingDirection=Enum.ScrollingDirection.Y;notice.ClipsDescendants=true;notice.Parent=gui

local stats=Instance.new("Frame");
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
  studioAssetStroke.Parent = stats
end
stats:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
stats:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))
stats.Name="RPGTopHUD";stats.Size=touchEnabled and UDim2.fromOffset(214,82)or UDim2.fromOffset(270,88);stats.Position=UDim2.fromOffset(8,8);stats.BackgroundColor3=Color3.fromRGB(25,28,35);stats.BackgroundTransparency=.1;stats.Parent=gui;corner(stats,13);stroke(stats,.5)
local studioStatsTarget = stats.Position
stats.Position = studioStatsTarget + UDim2.fromOffset(0, -5)
TweenService:Create(stats, TweenInfo.new(0.2, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), {Position = table.find(studioAssetFamily("MOTION"), "START") and studioStatsTarget or stats.Position}):Play()
-- This marker confirms which client script is actually running after publishing.
local versionMark=Instance.new("TextLabel")
versionMark.Name="LiveBuildMarker";versionMark.BackgroundTransparency=.3
versionMark.BackgroundColor3=Color3.fromRGB(20,35,35)
local function refreshBuildMark()
 local server=tostring(workspace:GetAttribute("DaechungRuntimeRevision")or"SERVER_OLD")
 versionMark.Text="RPG FIX6 · "..server.." · v"..tostring(game.PlaceVersion)
 versionMark.TextColor3=server=="20261014-FIX6" and Color3.fromRGB(205,245,215) or Color3.fromRGB(255,177,107)
end
workspace:GetAttributeChangedSignal("DaechungRuntimeRevision"):Connect(refreshBuildMark)
refreshBuildMark()
versionMark.TextSize=10;versionMark.TextColor3=Color3.fromRGB(205,245,215)
versionMark.Font=Enum.Font.GothamBold
versionMark.AnchorPoint=Vector2.new(.5,0)
versionMark.Position=UDim2.new(.5,0,0,57)
versionMark.Size=UDim2.fromOffset(310,17);versionMark.ZIndex=15;versionMark.Parent=gui
local title=Instance.new("TextLabel");title.Size=UDim2.new(1,-14,0,23);title.Position=UDim2.fromOffset(7,4);title.BackgroundTransparency=1;title.Text="대충 RPG";title.TextColor3=Color3.fromRGB(255,223,157);title.TextXAlignment=Enum.TextXAlignment.Left;title.Font=Enum.Font.GothamBold;title.TextSize=16;title.Parent=stats
local statLine=Instance.new("TextLabel");statLine.Size=UDim2.new(1,-14,0,38);statLine.Position=UDim2.fromOffset(7,27);statLine.BackgroundTransparency=1;statLine.TextColor3=Color3.fromRGB(230,234,241);statLine.TextXAlignment=Enum.TextXAlignment.Left;statLine.TextYAlignment=Enum.TextYAlignment.Top;statLine.TextWrapped=true;statLine.TextSize=12;statLine.Font=Enum.Font.Gotham;statLine.Parent=stats

local classBadge=Instance.new("TextLabel");classBadge.Name="ClassBadge";classBadge.Size=UDim2.new(1,-14,0,16);classBadge.Position=UDim2.fromOffset(7,64);classBadge.BackgroundTransparency=1;classBadge.TextColor3=Color3.fromRGB(190,207,255);classBadge.TextXAlignment=Enum.TextXAlignment.Left;classBadge.TextSize=11;classBadge.Font=Enum.Font.GothamBold;classBadge.Parent=stats

local objective=Instance.new("TextLabel");objective.Name="QuestObjective";objective.AnchorPoint=Vector2.new(.5,0);objective.Position=touchEnabled and UDim2.new(.5,0,0,96)or UDim2.new(.5,0,0,8);objective.Size=touchEnabled and UDim2.fromOffset(276,34)or UDim2.fromOffset(330,38);objective.BackgroundColor3=Color3.fromRGB(31,34,43);objective.BackgroundTransparency=.12;objective.TextColor3=Color3.fromRGB(255,220,146);objective.TextWrapped=true;objective.TextSize=13;objective.Font=Enum.Font.GothamBold;objective.Parent=gui;corner(objective,11);stroke(objective,.52)

-- 신규 레이아웃: 명확한 하단 탐험 내비게이션과 주택 관리 드로어.
local avatarPanel -- forward reference: house button closes character panel safely
local housingToggle=button(gui,"내 집",Color3.fromRGB(72,116,125))
housingToggle.Name="HousingNav";housingToggle.Size=UDim2.fromOffset(80,42)
housingToggle.AnchorPoint=Vector2.new(0,1);housingToggle.Position=UDim2.new(0,12,1,-14)
local housingPanel=Instance.new("Frame")
housingPanel.Name="HousingPanel";housingPanel.AnchorPoint=Vector2.new(.5,1)
housingPanel.Size=UDim2.fromOffset(320,322);housingPanel.Position=UDim2.new(.5,0,1,-65)
housingPanel.BackgroundColor3=Color3.fromRGB(21,35,41);housingPanel.BorderSizePixel=0
housingPanel.Visible=false;housingPanel.ZIndex=40;housingPanel.Parent=gui;corner(housingPanel,18);stroke(housingPanel,.25)
local housingTitle=Instance.new("TextLabel");housingTitle.Name="HousingTitle"
housingTitle.Size=UDim2.new(1,-26,0,42);housingTitle.Position=UDim2.fromOffset(13,9)
housingTitle.Text="나의 아지트";housingTitle.TextColor3=Color3.fromRGB(255,233,176)
housingTitle.TextSize=21;housingTitle.Font=Enum.Font.GothamBold;housingTitle.BackgroundTransparency=1
housingTitle.TextXAlignment=Enum.TextXAlignment.Left;housingTitle.ZIndex=41;housingTitle.Parent=housingPanel
local housingInfo=Instance.new("TextLabel");housingInfo.Size=UDim2.new(1,-26,0,39)
housingInfo.Position=UDim2.fromOffset(13,49);housingInfo.BackgroundTransparency=1
housingInfo.TextColor3=Color3.fromRGB(218,235,235);housingInfo.TextSize=14
housingInfo.Font=Enum.Font.Gotham;housingInfo.TextWrapped=true;housingInfo.ZIndex=41;housingInfo.Parent=housingPanel
local housingActions={{"집 건설",C.Actions.HOUSING_BUILD},{"집 확장",C.Actions.HOUSING_UPGRADE},{"가구 배치",C.Actions.HOUSING_FURNISH},{"건축 모듈",C.Actions.HOUSING_MODULE},{"집 방문",C.Actions.HOUSING_VISIT}}
for i,item in ipairs(housingActions)do
 local b=button(housingPanel,item[1],Color3.fromRGB(47,97,106))
 b.Name="HousingAction"..i;b.Size=UDim2.fromOffset(139,56)
 b.Position=UDim2.fromOffset(13+((i-1)%2)*153,100+math.floor((i-1)/2)*66)
 b.ZIndex=42
 b.Activated:Connect(function()
  remote:FireServer(item[2])
  if i==5 then housingPanel.Visible=false end
 end)
end
local function refreshHousing()
 local level=tonumber(p:GetAttribute("HouseLevel"))or 0
 local items=tonumber(p:GetAttribute("HouseFurniture"))or 0
 local modules=tonumber(p:GetAttribute("HouseModules"))or 0
 local cfg=C.Housing or {}
 housingInfo.Text=level==0 and ("미보유 · 건설 "..tostring(cfg.BuildCost or 80).."G") or ("집 Lv."..level.." / "..tostring(cfg.MaxLevel or 3).." · 가구 "..items.."/"..tostring(cfg.MaxFurniture or 8).." · 건축 "..modules.."/"..tostring(cfg.MaxModules or 12))
end
for _,attribute in ipairs({"HouseLevel","HouseFurniture","HouseModules"})do p:GetAttributeChangedSignal(attribute):Connect(refreshHousing)end
refreshHousing()
housingToggle.Activated:Connect(function()
 if startupOverlay.Parent~=nil or gui:GetAttribute("RPGMenuOpen")==true then return end
 housingPanel.Visible=not housingPanel.Visible;if avatarPanel then avatarPanel.Visible=false end
 refreshHousing()
end)
gui:GetAttributeChangedSignal("RPGMenuOpen"):Connect(function()
 if gui:GetAttribute("RPGMenuOpen")==true then housingPanel.Visible=false end
end)

-- 현재 플레이 중에도 사용할 수 있는 장비식 외형 편집기 (마을에서 수정 가능).
local avatarToggle=button(gui,"외형",Color3.fromRGB(73,103,147))
avatarToggle.Name="CustomizeNav";avatarToggle.AnchorPoint=Vector2.zero;avatarToggle.Position=UDim2.fromOffset(8,212)
avatarToggle.Size=UDim2.fromOffset(84,36)
avatarPanel=Instance.new("Frame");avatarPanel.Name="CharacterCustomizer"
avatarPanel.AnchorPoint=Vector2.new(.5,.5);avatarPanel.Position=UDim2.fromScale(.5,.5)
avatarPanel.Size=UDim2.fromOffset(math.min(438,gui.AbsoluteSize.X-20),312);avatarPanel.BackgroundColor3=Color3.fromRGB(23,33,44)
avatarPanel.ZIndex=45;avatarPanel.Visible=false;avatarPanel.Parent=gui;corner(avatarPanel,14);stroke(avatarPanel,.2)
local avatarHeader=Instance.new("TextLabel");avatarHeader.BackgroundTransparency=1
avatarHeader.Position=UDim2.fromOffset(12,8);avatarHeader.Size=UDim2.new(1,-68,0,29)
avatarHeader.Text="캐릭터 커스터마이징";avatarHeader.TextColor3=Color3.fromRGB(245,223,177)
avatarHeader.TextSize=18;avatarHeader.Font=Enum.Font.GothamBold;avatarHeader.TextXAlignment=Enum.TextXAlignment.Left
avatarHeader.ZIndex=46;avatarHeader.Parent=avatarPanel
local avatarClose=button(avatarPanel,"닫기",Color3.fromRGB(134,69,74))
avatarClose.Size=UDim2.fromOffset(56,34);avatarClose.Position=UDim2.new(1,-65,0,6);avatarClose.ZIndex=47
avatarClose.Activated:Connect(function()avatarPanel.Visible=false end)
local avatarInfo=Instance.new("TextLabel");avatarInfo.BackgroundTransparency=1
avatarInfo.Position=UDim2.fromOffset(155,43);avatarInfo.Size=UDim2.new(1,-168,0,73)
avatarInfo.TextWrapped=true;avatarInfo.TextXAlignment=Enum.TextXAlignment.Left
avatarInfo.TextColor3=Color3.fromRGB(217,231,240);avatarInfo.TextSize=12
avatarInfo.Font=Enum.Font.Gotham;avatarInfo.ZIndex=46;avatarInfo.Parent=avatarPanel
local avatarItems={
 {"유형 변경","CUSTOMIZE_ARCHETYPE"},{"갑옷 변경","CUSTOMIZE_ARMOR"},
 {"장식 변경","CUSTOMIZE_DECORATION"},{"피부색 변경",C.Actions.CUSTOMIZE_NEXT}
}
for i,row in ipairs(avatarItems)do
 local b=button(avatarPanel,row[1],Color3.fromRGB(65,96,125))
 b.Name="AvatarAction"..i;b.Size=UDim2.new(1,-168,0,42)
 b.Position=UDim2.fromOffset(155,118+(i-1)*47)
 b.ZIndex=47;b.Activated:Connect(function()remote:FireServer(row[2])end)
end
-- Live 3D preview clones the server-owned outfit without executing cloned scripts.
local avatarPreview=Instance.new("ViewportFrame")
avatarPreview.Name="AvatarLivePreview";avatarPreview.Position=UDim2.fromOffset(12,49)
avatarPreview.Size=UDim2.fromOffset(131,242);avatarPreview.BorderSizePixel=0
avatarPreview.BackgroundColor3=Color3.fromRGB(39,49,62);avatarPreview.BackgroundTransparency=.12
avatarPreview.Ambient=Color3.fromRGB(195,205,217)
avatarPreview.LightColor=Color3.fromRGB(255,242,213)
avatarPreview.LightDirection=Vector3.new(-1,-1,-1);avatarPreview.ZIndex=46
avatarPreview.Parent=avatarPanel;corner(avatarPreview,12)
local previewWorld=Instance.new("WorldModel");previewWorld.Parent=avatarPreview
local previewCamera=Instance.new("Camera");previewCamera.Parent=avatarPreview;avatarPreview.CurrentCamera=previewCamera
local previewGeneration=0
local function refreshAvatarPreview()
 previewGeneration+=1
 local ticket=previewGeneration
 task.delay(.22,function()
  if ticket~=previewGeneration or not avatarPanel.Parent or not avatarPanel.Visible then return end
  local character=p.Character
  if not character or not character.Parent then return end
  local archived=character.Archivable;character.Archivable=true
  local ok,model=pcall(function()return character:Clone()end)
  character.Archivable=archived
  if not ok or not model then return end
  model.Name="PreviewCharacter"
  for _,d in ipairs(model:GetDescendants())do
   if d:IsA("BaseScript")then d:Destroy()
   elseif d:IsA("BasePart")then d.Anchored=true;d.CanCollide=false;d.CanTouch=false;d.CanQuery=false end
  end
  if ticket~=previewGeneration then model:Destroy();return end
  previewWorld:ClearAllChildren()
  model.Parent=previewWorld
  model:PivotTo(CFrame.new(0,0,0))
  local boundsCf,boundsSize=model:GetBoundingBox()
  local center=boundsCf.Position
  previewCamera.FieldOfView=35
  previewCamera.CFrame=CFrame.lookAt(center+Vector3.new(0,.2,math.max(9,boundsSize.Y*1.65)),center)
 end)
end
local function refreshAvatarInfo()
 local names={"사무라이","무협 무인","서양 기사"}
 local index=math.clamp(math.floor(tonumber(p:GetAttribute("AvatarArchetype"))or 1),1,3)
 local a=tonumber(p:GetAttribute("AvatarArmor"))or 0
 local d=tonumber(p:GetAttribute("AvatarDecoration"))or 0
 local skin=tonumber(p:GetAttribute("AvatarStyle"))or 1
 local character=p.Character
 local state=character and tostring(character:GetAttribute("SharedPlayerVisualState") or "대기") or "대기"
 refreshAvatarPreview()
 avatarInfo.Text=names[index].." · 갑옷 "..a.."/2 · 장식 "..d.."/2\n피부 "..skin.."/6 · 로딩 "..state.."\n저장: "..tostring(p:GetAttribute("SaveState")or"확인 중")
end
for _,key in ipairs({"AvatarArchetype","AvatarArmor","AvatarDecoration","AvatarStyle","SaveState"})do
 p:GetAttributeChangedSignal(key):Connect(refreshAvatarInfo)
end
refreshAvatarInfo()
local function watchCharacterState(character)
 character:GetAttributeChangedSignal("SharedPlayerVisualState"):Connect(refreshAvatarInfo)
 task.defer(refreshAvatarInfo)
end
if p.Character then watchCharacterState(p.Character)end
p.CharacterAdded:Connect(watchCharacterState)
avatarToggle.Activated:Connect(function()
 if startupOverlay.Parent or gui:GetAttribute("RPGMenuOpen")==true then return end
 housingPanel.Visible=false;avatarPanel.Visible=not avatarPanel.Visible
 refreshAvatarInfo()
end)
gui:GetAttributeChangedSignal("RPGMenuOpen"):Connect(function()
 if gui:GetAttribute("RPGMenuOpen")==true then avatarPanel.Visible=false end
end)

local party=Instance.new("Frame");party.Name="PartyStatus";party.AnchorPoint=Vector2.new(1,0);party.Position=UDim2.new(1,-8,0,8);party.Size=touchEnabled and UDim2.fromOffset(116,58)or UDim2.fromOffset(142,64);party.BackgroundColor3=Color3.fromRGB(29,32,40);party.BackgroundTransparency=.1;party.Parent=gui;corner(party,12);stroke(party,.5)
local partyText=Instance.new("TextLabel");partyText.Size=UDim2.new(1,-12,1,-10);partyText.Position=UDim2.fromOffset(6,5);partyText.BackgroundTransparency=1;partyText.TextColor3=Color3.fromRGB(220,232,241);partyText.TextSize=11;partyText.TextWrapped=true;partyText.Font=Enum.Font.GothamBold;partyText.Parent=party

-- Small non-interactive combat indicator replaces the old four opaque mobile buttons.
local autoIndicator=Instance.new("TextLabel")
autoIndicator.Name="AutoCombatStatus";autoIndicator.BackgroundTransparency=.32
autoIndicator.BackgroundColor3=Color3.fromRGB(20,47,45);autoIndicator.BorderSizePixel=0
autoIndicator.AnchorPoint=Vector2.new(1,0);autoIndicator.Position=UDim2.new(1,-10,0,83)
autoIndicator.Size=UDim2.fromOffset(190,24);autoIndicator.Text="자동공격 · 자동회피 · 자동패링"
autoIndicator.TextSize=12;autoIndicator.TextColor3=Color3.fromRGB(206,247,224)
autoIndicator.Font=Enum.Font.GothamBold;autoIndicator.Parent=gui
local combat=Instance.new("Frame");combat.Name="CombatDock";combat.AnchorPoint=Vector2.new(1,.5);combat.Position=UDim2.new(1,-12,.5,30);combat.Size=UDim2.fromOffset(62,232);combat.BackgroundTransparency=1;combat.Parent=gui
local attack=button(combat,"공격",Color3.fromRGB(166,65,55));attack.Size=UDim2.fromOffset(58,50);attack.Position=UDim2.fromOffset(2,0)
local skill=button(combat,"스킬",Color3.fromRGB(100,69,166));skill.Size=UDim2.fromOffset(58,50);skill.Position=UDim2.fromOffset(2,58)
local block=button(combat,"막기",Color3.fromRGB(74,102,151));block.Name="BlockParry";block.Size=UDim2.fromOffset(58,50);block.Position=UDim2.fromOffset(2,116)
local dodge=button(combat,"회피",Color3.fromRGB(54,115,139));dodge.Size=UDim2.fromOffset(58,50);dodge.Position=UDim2.fromOffset(2,174)
-- 공용 R15 61종 소스는 로드 가능하게 등록한다. 현재 키프레임은 미게시 프리뷰이므로
-- 실제 재생 가능한 경우에만 적용하며 기존 게시 애니메이션은 폴백으로 유지한다.
local commonMotionModule=RS:WaitForChild("Shared"):FindFirstChild("RobloxCommonMotion")
local commonMotion=nil
if commonMotionModule then
 local ok,result=pcall(require,commonMotionModule)
 if ok and result and result.Audit then
  local good,audit=pcall(result.Audit)
  if good and audit.atomCount==61 then commonMotion=result end
 end
end
-- 게시되지 않은 KeyframeSequence 미리보기 대신 실게임에서 동작하는 관절 기반 폴백.
local jointEpoch=setmetatable({}, {__mode="k"})
local function poseRig(rig,kind)
 if not rig then return false end
 local torso=rig:FindFirstChild("UpperTorso")or rig:FindFirstChild("Torso")
 if not torso then return false end
 local right=rig:FindFirstChild("RightShoulder",true)or torso:FindFirstChild("Right Shoulder")
 local left=rig:FindFirstChild("LeftShoulder",true)or torso:FindFirstChild("Left Shoulder")
 local waist=rig:FindFirstChild("Waist",true)
 if not right or not left or not right:IsA("Motor6D")or not left:IsA("Motor6D")then return false end
 local row=jointEpoch[rig]
 if not row then
  row={token=0,base={},tweens={}}
  jointEpoch[rig]=row
  rig.Destroying:Connect(function()
   row.token+=1
   for _,tween in ipairs(row.tweens)do tween:Cancel()end
   table.clear(row.tweens);table.clear(row.base);jointEpoch[rig]=nil
  end)
 end
 row.token+=1
 row.weaponCombo=nil
 local token=row.token
 for _,tween in ipairs(row.tweens)do tween:Cancel()end
 table.clear(row.tweens)
 local pitch=kind=="PARRY_PERFECT"and -1.25 or kind=="DODGE_LEFT"and .5 or kind=="CAST_RELEASE"and -1.65
  or kind=="LIGHT_ATTACK_2"and -.75 or kind=="LIGHT_ATTACK_3"and -1.6 or -1.1
 local twist=kind=="DODGE_LEFT"and -.5 or kind=="LIGHT_ATTACK_2"and -.55 or kind=="LIGHT_ATTACK_3"and 1
  or kind=="HEAVY_ATTACK_1"and .55 or .28
 local duration=kind=="DODGE_LEFT"and .42 or kind=="LIGHT_ATTACK_3"and .48 or kind=="HEAVY_ATTACK_1"and .52 or .32
 local motors={{right,pitch,twist},{left,-pitch*.55,-twist}}
 if waist and waist:IsA("Motor6D")then motors[#motors+1]={waist,0,twist*.6}end
 -- Include joints previously owned by a weapon/kick so an interrupted combo
 -- restores elbows, wrists and knees through the same staged pose owner.
 for motor in pairs(row.base)do
  if motor~=right and motor~=left and motor~=waist then motors[#motors+1]={motor,0,0}end
 end
 for _,entry in ipairs(motors)do
  local motor=entry[1]
  if not row.base[motor]then row.base[motor]=motor.C0 end
 end
 -- 이전 동작 중간값을 새 기준 자세로 누적하지 않고, 준비·타격·반동·복귀를 이어 준다.
 local function stage(amount,seconds)
  if row.token~=token or not rig.Parent then return end
  for _,tween in ipairs(row.tweens)do tween:Cancel()end
  table.clear(row.tweens)
  for _,entry in ipairs(motors)do
   local motor=entry[1]
   if motor.Parent then
    local target=row.base[motor]*CFrame.Angles(entry[2]*amount,0,entry[3]*amount)
    local tween=TweenService:Create(motor,TweenInfo.new(seconds,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{C0=target})
    row.tweens[#row.tweens+1]=tween;tween:Play()
   end
  end
 end
 local ready=kind=="PARRY_PERFECT"and .015 or .06
 stage(kind=="PARRY_PERFECT"and .8 or -.18,ready)
 task.delay(ready,function()stage(1,.075)end)
 task.delay(ready+.075,function()stage(.72,.10)end)
 task.delay(duration,function()stage(0,.17)end)
 return true
end
local previewTracks={}
-- In live Roblox sessions no ephemeral KeyframeSequence registration is trusted.
local activePoseToken=0
local function playCommonMotion(atomId)
 local character=p.Character
 local movingRoot=character and character:FindFirstChild("HumanoidRootPart")
 if movingRoot then
  activePoseToken+=1
  local token=activePoseToken
  local state=atomId=="DODGE_LEFT" and "CHASE" or atomId=="PARRY_PERFECT" and "ATTACK" or "ATTACK"
  movingRoot:SetAttribute("MotionState",state)
  task.delay(atomId=="HEAVY_ATTACK_1" and .62 or .4,function()
   if token==activePoseToken and movingRoot.Parent then movingRoot:SetAttribute("MotionState","IDLE")end
  end)
 end
 return poseRig(character,atomId)
end
-- 리그를 가진 NPC·몬스터의 실제 Animator에서 공용 모션을 재생한다.
-- GLB 정적 메시(Animator 없음)는 관절 애니메이션 대상에서 제외한다.
-- Imported GLB assets lacking R15 joints still have a visual pose motor.
-- This moves only appearance; authoritative collision and combat hitboxes stay unchanged.
local RunService=game:GetService("RunService")
-- A single caller-owned update drives the currently equipped weapon's actual
-- R15 joints. Original C0 is captured once, never from the middle of a new hit.
local equippedComboCache={}
local function equippedMotionId(character)
 local tool=character:FindFirstChildOfClass("Tool")
 if tool then return tool:GetAttribute("WeaponMotionProfile")or tool.Name,tool end
 return character:GetAttribute("EquippedWeaponVisual"),nil
end
local function startEquippedCombatMotion(character)
 if not(commonMotion and commonMotion.CreateCombatCombo and commonMotion.MapCombatPoseToR15)then return false end
 local humanoid=character and character:FindFirstChildOfClass("Humanoid")
 if not humanoid or humanoid.RigType~=Enum.HumanoidRigType.R15 then return false end
 local equipment,equippedTool=equippedMotionId(character)
 local profileId=commonMotion.ResolveWeaponProfile(equipment)
 if not profileId then return false end
 local row=jointEpoch[character]
 if not row then
  row={token=0,base={},tweens={}}
  jointEpoch[character]=row
  character.Destroying:Connect(function()
   row.token+=1;row.weaponCombo=nil
   for _,tween in ipairs(row.tweens)do tween:Cancel()end
   table.clear(row.tweens);table.clear(row.base);jointEpoch[character]=nil
  end)
 end
 if row.weaponCombo and row.weaponEquipment==equipment and row.weaponTool==equippedTool and not row.weaponReleasing
  and os.clock()-row.weaponStarted<row.weaponCombo.duration then
  -- Bound one queued continuation; rapid input must not restart the first cut.
  row.weaponQueued=true;return true
 end
 local motors={}
 for _,node in ipairs(character:GetDescendants())do
  if node:IsA("Motor6D")and node.Part0 and node.Part1 then
   local name=node.Name
   if name=="Waist"or name=="Neck"or name:match("Shoulder$")or name:match("Elbow$")or name:match("Wrist$")
    or name:match("Hip$")or name:match("Knee$")or name:match("Ankle$")then motors[name]=node end
  end
 end
 if not(motors.RightShoulder and motors.LeftShoulder and motors.RightElbow and motors.LeftElbow and motors.Waist)then
  for motor,base in pairs(row.base)do if motor.Parent then motor.C0=base end end
  row.weaponCombo=nil
  character:SetAttribute("WeaponMotionState","COMPATIBLE_JOINTS_REQUIRED");return false
 end
 row.token+=1
 for _,tween in ipairs(row.tweens)do tween:Cancel()end
 table.clear(row.tweens)
 local combo=equippedComboCache[profileId]
 if not combo then combo=commonMotion.CreateCombatCombo(profileId);equippedComboCache[profileId]=combo end
 row.poses=row.poses or {};table.clear(row.poses)
 for _,motor in pairs(motors)do
  if not row.base[motor]then row.base[motor]=motor.C0 end
  -- Keep the actual current pose when a new input interrupts recovery.
  row.poses[motor]=row.base[motor]:ToObjectSpace(motor.C0)
 end
 row.weaponCombo=combo;row.weaponStarted=os.clock();row.weaponMotors=motors
 row.weaponTargets=row.weaponTargets or {};row.r15Targets=row.r15Targets or {}
 row.weaponEquipment=equipment;row.weaponTool=equippedTool;row.weaponReleasing=false;row.weaponQueued=false
 character:SetAttribute("WeaponMotionProfile",profileId)
 character:SetAttribute("WeaponMotionState","PLAYING_COMBO")
 return true
end
local function stepEquippedCombatMotion(dt)
 local character=p.Character
 local row=character and jointEpoch[character]
 if not(row and row.weaponCombo)then return end
 local humanoid=character:FindFirstChildOfClass("Humanoid")
 local equipment,equippedTool=equippedMotionId(character)
 local invalid=not humanoid or humanoid.Health<=0 or equipment~=row.weaponEquipment or equippedTool~=row.weaponTool
 if invalid and not row.weaponReleasing then row.weaponReleasing=true;row.weaponReleaseAt=os.clock()end
 table.clear(row.weaponTargets);table.clear(row.r15Targets)
 local elapsed=os.clock()-row.weaponStarted
 if elapsed>=row.weaponCombo.duration and row.weaponQueued and not invalid then
  row.weaponQueued=false;row.weaponStarted=os.clock();elapsed=0
 end
 local _,_,finished=commonMotion.SampleCombatCombo(row.weaponCombo,elapsed,row.weaponTargets)
 commonMotion.MapCombatPoseToR15(row.weaponTargets,row.r15Targets)
 local alpha=1-math.exp(-32*math.clamp(dt or 1/60,0,.15))
 local settled=true
 for name,motor in pairs(row.weaponMotors)do
  if motor.Parent then
   local target=not row.weaponReleasing and row.r15Targets[name]or CFrame.identity
   target=target or CFrame.identity
   local pose=(row.poses[motor]or CFrame.identity):Lerp(target,alpha)
   row.poses[motor]=pose;motor.C0=row.base[motor]*pose
   if not finished or os.clock()-row.weaponStarted<row.weaponCombo.duration+.4 then settled=false end
  end
 end
 local released=row.weaponReleasing and os.clock()-row.weaponReleaseAt>.18
 if settled or released then
  for motor,base in pairs(row.base)do if motor.Parent then motor.C0=base end end
  row.weaponCombo=nil;table.clear(row.poses)
  character:SetAttribute("WeaponMotionState",invalid and "CANCELLED"or "IDLE")
 end
end
local nativePoseMotors=setmetatable({}, {__mode="k"})
local function trackNativePose(inst)
 if inst:IsA("Motor6D") and (inst.Name=="NativePoseMotor" or inst.Name=="ActorLimbMotor") then nativePoseMotors[inst]={base=inst.C0,role=inst:GetAttribute("LimbRole")} end
end
for _,desc in ipairs(workspace:GetDescendants())do trackNativePose(desc)end
workspace.DescendantAdded:Connect(trackNativePose)
workspace.DescendantRemoving:Connect(function(inst)nativePoseMotors[inst]=nil end)
local lastNativePose=0
RunService.Heartbeat:Connect(function(dt)
 stepEquippedCombatMotion(dt)
 local now=os.clock()
 if now-lastNativePose<.07 then return end
 lastNativePose=now
 local c=p.Character
 local me=c and c:FindFirstChild("HumanoidRootPart")
 if not me then return end
 local processed=0
 for motor,item in pairs(nativePoseMotors)do
  if processed>=55 then break end
  local host=motor.Part0
  if motor.Parent and host and host.Parent and (host.Position-me.Position).Magnitude<120 then
   processed+=1
   local state=tostring(host:GetAttribute("MotionState")or"IDLE")
   local lastPos=item.lastPos or host.Position
   local moving=(host.Position-lastPos).Magnitude>.015
   item.lastPos=host.Position
   if state=="IDLE" and moving then state="ROAM" end
   local stride=state=="ATTACK" and .55 or state=="HIT" and .52 or state=="CHASE" and .35 or state=="WALK" and .34 or state=="ROAM" and .25 or .075
   local speed=state=="ATTACK" and 13 or state=="HIT" and 10 or state=="CHASE" and 9 or state=="WALK" and 7 or state=="ROAM" and 5 or 2
   local phase=now*speed+(host.Position.X+host.Position.Z)*.1
   if motor.Name=="ActorLimbMotor" then
    local role=item.role or ""
    local side=(role:find("Left",1,true)or role:find("ArmL",1,true)or role:find("LegR",1,true)or role:find("WingL",1,true)) and -1 or 1
    local swing=math.sin(phase)*stride*side
    if role:find("Wing",1,true) then swing*=2.4 end
    if role:find("Tail",1,true) then motor.C0=item.base*CFrame.Angles(0,swing*.7,0)
    else motor.C0=item.base*CFrame.Angles(swing,0,math.cos(phase)*stride*.35*side)end
   else
    motor.C0=item.base*CFrame.new(0,math.sin(phase)*stride*.45,0)*CFrame.Angles(math.sin(phase)*stride*.45,0,math.cos(phase*.7)*stride*.65)
   end
  end
 end
end)
local actorMotionTracks=setmetatable({}, {__mode="k"})
task.spawn(function()
 while gui.Parent do
  if p.Character then
   local center=p.Character:FindFirstChild("HumanoidRootPart")
   if center then
    local checked=0
    for _,actor in ipairs(workspace:GetDescendants())do
     if checked>=80 then break end
     if actor:IsA("Humanoid") and actor.Parent~=p.Character and actor.RigType==Enum.HumanoidRigType.R15 then
      local rig=actor.Parent;local ar=rig and rig:FindFirstChild("HumanoidRootPart")
      if ar and (ar.Position-center.Position).Magnitude<110 then
       checked+=1
       local animator=actor:FindFirstChildOfClass("Animator")
       if animator then
        local moving=actor.MoveDirection.Magnitude>.08
        local desired=actor.Health<=0 and "DEATH_FRONT" or moving and "WALK" or "IDLE_RELAXED"
        local item=actorMotionTracks[actor]
        if not item or item.name~=desired then
         if item and item.track then pcall(function()item.track:Stop(.16);item.track:Destroy()end)end
         local ok,track=false,nil -- Production animation upload not verified
         actorMotionTracks[actor]={name=desired,track=ok and track or nil}
        end
       end
      end
     end
    end
   end
  end
  task.wait(1.2)
 end
end)
-- 모션: 기존 게시 R15 액션 트랙과 관절 폴백을 한 함수에서 제어한다.
local combatTracks={}
local activeCombatTrack=nil
local lastComboInput=0
local localComboIndex=0
local function stopCombatTrack(fade)
 if activeCombatTrack and activeCombatTrack.IsPlaying then activeCombatTrack:Stop(fade or .05)end
 activeCombatTrack=nil
end
local function playCombatAnimation(skillCast)
 local character=p.Character
 local humanoid=character and character:FindFirstChildOfClass("Humanoid")
 if not humanoid then return end
 local now=os.clock()
 if skillCast then localComboIndex=0
 else
  localComboIndex=(now-lastComboInput<=1)and(localComboIndex%3+1)or 1
  lastComboInput=now
 end
 local atom=skillCast and "CAST_RELEASE" or localComboIndex==2 and "LIGHT_ATTACK_2" or localComboIndex==3 and "LIGHT_ATTACK_3"
   or ((tonumber(p:GetAttribute("WeaponTier"))or 1)>=4 and "HEAVY_ATTACK_1" or "LIGHT_ATTACK_1")
 -- Equipped melee types use their own articulated route instead of all sharing
 -- the same Roblox sword-slash track. Skills retain their existing cast path.
 if not skillCast and startEquippedCombatMotion(character)then stopCombatTrack(.05);return end
 if skillCast and jointEpoch[character]and jointEpoch[character].weaponCombo then poseRig(character,"CAST_RELEASE");stopCombatTrack(.05);return end
 local animator=humanoid:FindFirstChildOfClass("Animator")
 if not animator then animator=Instance.new("Animator");animator.Parent=humanoid end
 local key=skillCast and "LUNGE" or localComboIndex==3 and "FINISH" or "SLASH"
 local track=combatTracks[key]
 if not track then
  local animation=Instance.new("Animation")
  animation.AnimationId=skillCast and "rbxassetid://522638767" or "rbxassetid://522635514"
  local ok,loaded=pcall(function()return animator:LoadAnimation(animation)end)
  animation:Destroy()
  if ok and loaded then
   track=loaded;track.Priority=Enum.AnimationPriority.Action;combatTracks[key]=track
   track.Stopped:Connect(function()if activeCombatTrack==track then activeCombatTrack=nil end end)
  end
 end
 stopCombatTrack(.05)
 if track then
  activeCombatTrack=track
  local classId=tostring(p:GetAttribute("ClassId")or"NONE")
  local speed=classId=="SHADOW"and 1.45 or classId=="BREAKER"and .82 or 1
  track:Play(.07,1,speed)
  track:AdjustWeight(1,.05)
 else
  playCommonMotion(atom)
 end
end
-- 카메라 및 히트스탑은 연출 전용. 월드 시간과 서버 전투 판정은 멈추지 않는다.
local shakeUntil=0
local shakeIntensity=0
RunService:BindToRenderStep("DaechungCombatShake",Enum.RenderPriority.Camera.Value+1,function()
 local camera=workspace.CurrentCamera
 if not camera or shakeUntil<=os.clock() then return end
 local amplitude=shakeIntensity*math.clamp((shakeUntil-os.clock())/.15,0,1)*.08
 camera.CFrame=camera.CFrame*CFrame.new((math.random()-.5)*amplitude,(math.random()-.5)*amplitude,0)
end)
local function combatShake(intensity,duration)
 shakeIntensity=intensity;shakeUntil=os.clock()+duration
end
local function parryHitstop()
 local track=activeCombatTrack
 if track and track.IsPlaying then
  track:AdjustSpeed(0)
  task.delay(.05,function()if track.IsPlaying then track:AdjustSpeed(1)end end)
 end
end
local blockHeld=false
local blockInput=nil
local function setBlock(on)
 if blockHeld==on then return end;blockHeld=on
 if on then stopCombatTrack(.05);playCommonMotion("PARRY_PERFECT")end
 remote:FireServer(on and C.Actions.BLOCK_START or C.Actions.BLOCK_END)
end
attack.Activated:Connect(function()setBlock(false);playCombatAnimation(false);actionSfx:Play();remote:FireServer(C.Actions.ATTACK)end)
skill.Activated:Connect(function()
 setBlock(false)
 playCombatAnimation(true);remote:FireServer(C.Actions.SKILL)
end)
dodge.Activated:Connect(function()setBlock(false);playCommonMotion("DODGE_LEFT");remote:FireServer(C.Actions.DODGE)end)
block.InputBegan:Connect(function(input)
 if input.UserInputType==Enum.UserInputType.Touch or input.UserInputType==Enum.UserInputType.MouseButton1 then blockInput=input;setBlock(true)end
end)
block.InputEnded:Connect(function(input)
 if input==blockInput then blockInput=nil;setBlock(false)end
end)
UserInputService.InputBegan:Connect(function(input,processed)
 if processed or gui:GetAttribute("RPGMenuOpen")==true or startupOverlay.Parent~=nil then return end
 if input.KeyCode==Enum.KeyCode.F then
   setBlock(true)
  elseif input.KeyCode==Enum.KeyCode.LeftShift then
   setBlock(false);playCommonMotion("DODGE_LEFT");remote:FireServer(C.Actions.DODGE)
 elseif input.UserInputType==Enum.UserInputType.MouseButton1 then
  setBlock(false);playCombatAnimation(false);actionSfx:Play();remote:FireServer(C.Actions.ATTACK)
 end
end)
UserInputService.WindowFocusReleased:Connect(function()blockInput=nil;setBlock(false)end)
UserInputService.InputEnded:Connect(function(input)
 if input.KeyCode==Enum.KeyCode.F or input==blockInput then blockInput=nil;setBlock(false)end
end)

local classPanel=Instance.new("Frame");classPanel.Name="ClassChoice";classPanel.AnchorPoint=Vector2.new(.5,.5);classPanel.Position=UDim2.fromScale(.5,.55);classPanel.Size=touchEnabled and UDim2.fromOffset(300,230)or UDim2.fromOffset(380,250);classPanel.BackgroundColor3=Color3.fromRGB(23,25,33);classPanel.BackgroundTransparency=.04;classPanel.Parent=gui;corner(classPanel,16);stroke(classPanel,.35)
local classTitle=Instance.new("TextLabel");classTitle.Size=UDim2.new(1,-20,0,42);classTitle.Position=UDim2.fromOffset(10,8);classTitle.BackgroundTransparency=1;classTitle.TextColor3=Color3.fromRGB(255,226,164);classTitle.Font=Enum.Font.GothamBold;classTitle.TextSize=17;classTitle.TextWrapped=true;classTitle.Parent=classPanel
local classButtons={}
local classOrder={{Id="BREAKER",Action=C.Actions.SELECT_BREAKER},{Id="SHADOW",Action=C.Actions.SELECT_SHADOW},{Id="RUNE",Action=C.Actions.SELECT_RUNE},{Id="SOUL",Action=C.Actions.SELECT_SOUL}}
for i,row in ipairs(classOrder)do
 local b=button(classPanel,"",C.Classes[row.Id].Color);b.Size=UDim2.new(.5,-15,0,70);b.Position=UDim2.new((i-1)%2*.5,10+((i-1)%2)*5,0,54+math.floor((i-1)/2)*78);b:SetAttribute("ClassId",row.Id);b:SetAttribute("SelectAction",row.Action);classButtons[i]=b
 b.Activated:Connect(function()remote:FireServer(row.Action)end)
end
local advA=button(classPanel,"",Color3.fromRGB(91,125,160));advA.Size=UDim2.new(1,-24,0,68);advA.Position=UDim2.fromOffset(12,65);advA.Activated:Connect(function()remote:FireServer(C.Actions.ADVANCE_A)end)
local advB=button(classPanel,"",Color3.fromRGB(139,83,125));advB.Size=UDim2.new(1,-24,0,68);advB.Position=UDim2.fromOffset(12,145);advB.Activated:Connect(function()remote:FireServer(C.Actions.ADVANCE_B)end)

local returnButton=button(gui,"마을 귀환",Color3.fromRGB(61,111,86));returnButton.Name="ReturnVillage";returnButton.AnchorPoint=Vector2.new(.5,1);returnButton.Position=UDim2.new(.5,0,1,-10);returnButton.Size=UDim2.fromOffset(116,36)
returnButton.Activated:Connect(function()remote:FireServer(C.Actions.RETURN_VILLAGE)end)

local multi=button(gui,"멀티 코드 1",Color3.fromRGB(55,76,119));multi.Name="MultiplayerCode";multi.AnchorPoint=touchEnabled and Vector2.new(1,1)or Vector2.new(1,0);multi.Position=touchEnabled and UDim2.new(1,-8,1,-10)or UDim2.new(1,-8,0,80);multi.Size=UDim2.fromOffset(112,32)
multi.Activated:Connect(function()remote:FireServer(C.Actions.NEXT_ROOM_CODE)end)
multi.Visible=false -- The party menu owns the same server-authoritative code action.

local hint=Instance.new("TextLabel");hint.Name="WorldHint";hint.AnchorPoint=Vector2.new(0,1);hint.Position=UDim2.new(0,8,1,-10);hint.Size=touchEnabled and UDim2.fromOffset(170,32)or UDim2.fromOffset(220,34);hint.BackgroundColor3=Color3.fromRGB(25,28,35);hint.BackgroundTransparency=.3;hint.TextColor3=Color3.fromRGB(226,230,235);hint.TextSize=11;hint.Font=Enum.Font.Gotham;hint.TextWrapped=true;hint.Text="마을 포탈로 이동 · AI는 두 번 터치해 파티 초대";hint.Parent=gui;corner(hint,9)
hint.Visible=false

-- 메인: 서버가 검증한 NPC 발화를 화면에 짧게 표시하며 원래 조작은 중단하지 않는다.
local npcSpeechToken=0
local npcSpeech=Instance.new("TextLabel")
npcSpeech.Name="NPCSpeech";npcSpeech.AnchorPoint=Vector2.new(.5,0)
npcSpeech.Position=touchEnabled and UDim2.new(.5,0,0,144)or UDim2.new(.5,0,0,56)
npcSpeech.Size=touchEnabled and UDim2.fromOffset(286,72)or UDim2.fromOffset(360,74)
npcSpeech.BackgroundColor3=Color3.fromRGB(26,35,32);npcSpeech.BackgroundTransparency=.10
npcSpeech.TextColor3=Color3.fromRGB(228,244,224);npcSpeech.TextSize=14;npcSpeech.TextWrapped=true
npcSpeech.Font=Enum.Font.GothamBold;npcSpeech.Visible=false;npcSpeech.ZIndex=18
npcSpeech.Parent=gui;corner(npcSpeech,12);stroke(npcSpeech,.45)
local function showNpcSpeech()
 local line=tostring(p:GetAttribute("NPCSpeech")or"")
 if line==""then return end
 npcSpeechToken+=1;local token=npcSpeechToken
 npcSpeech.Text=line;npcSpeechActive=true;if refreshHud then refreshHud()end
 task.delay(3.6,function()if npcSpeech.Parent and token==npcSpeechToken then npcSpeechActive=false;if refreshHud then refreshHud()end end end)
end

-- 연출: 기존 보스 실제 조우 이벤트만 카메라 시야와 자막으로 보여준다.
-- 입력·전투 상태·보상·페이즈·네트워크 상태는 이 컷신이 변경하지 않는다.
local bossSceneToken=0
local bossCamera=nil
local bossCameraFov=nil
local bossScene=Instance.new("Frame")
bossScene.Name="BossCinematic";bossScene.AnchorPoint=Vector2.new(.5,.5)
bossScene.Position=UDim2.fromScale(.5,.32)
bossScene.Size=touchEnabled and UDim2.new(.92,0,0,142)or UDim2.fromOffset(480,155)
bossScene.BackgroundColor3=Color3.fromRGB(35,21,32)
bossScene.BackgroundTransparency=.06;bossScene.Visible=false;bossScene.ZIndex=30
bossScene.Parent=gui;corner(bossScene,15);stroke(bossScene,.22)
local bossText=Instance.new("TextLabel")
bossText.Name="BossDialogue";bossText.Size=UDim2.new(1,-18,1,-57)
bossText.Position=UDim2.fromOffset(9,9);bossText.BackgroundTransparency=1
bossText.Font=Enum.Font.GothamBold;bossText.TextSize=touchEnabled and 16 or 19
bossText.TextWrapped=true;bossText.TextColor3=Color3.fromRGB(255,215,171)
bossText.ZIndex=31;bossText.Parent=bossScene
local bossSkip=button(bossScene,"건너뛰기",Color3.fromRGB(87,66,79))
bossSkip.Name="SkipBossCinematic";bossSkip.Size=UDim2.fromOffset(120,48)
bossSkip.AnchorPoint=Vector2.new(.5,1);bossSkip.Position=UDim2.new(.5,0,1,-8)
bossSkip.ZIndex=32
local function endBossCinematic()
 bossSceneToken+=1
 bossSceneActive=false;bossScene.Visible=false;if refreshHud then refreshHud()end
 if bossCamera and bossCamera.Parent and bossCameraFov then
  TweenService:Create(bossCamera,TweenInfo.new(.3),{FieldOfView=bossCameraFov}):Play()
 end
 bossCamera=nil;bossCameraFov=nil
end
bossSkip.Activated:Connect(endBossCinematic)
local function showBossCinematic()
 local id=tostring(p:GetAttribute("BossIntroId")or"")
 local line=tostring(p:GetAttribute("BossIntroLine")or"")
 if id==""or line==""then return end
 -- 원본 메시지를 서버에서 수신한 뒤 3초간 강조. 기존 2인 동기화 증거와 무관하다.
 if bossSceneActive then endBossCinematic()end
 bossSceneToken+=1;local token=bossSceneToken
 bossText.Text=line;bossSceneActive=true;if refreshHud then refreshHud()end
 bossCamera=workspace.CurrentCamera
 if bossCamera then
  bossCameraFov=bossCamera.FieldOfView
  TweenService:Create(bossCamera,TweenInfo.new(.6,Enum.EasingStyle.Quad),{FieldOfView=math.max(42,bossCameraFov-12)}):Play()
 end
 task.delay(3.2,function()if token==bossSceneToken then endBossCinematic()end end)
end
p:GetAttributeChangedSignal("BossIntroId"):Connect(showBossCinematic)


-- 오브젝트별 UI: 서버가 등록한 실제 ProximityPrompt와 Player 복제 상태만 관찰한다.
-- NPC/포탈/상자/제단/전직 종류별 조건은 다르게 표시하되, 원본 Triggered 실행은 건드리지 않는다.
local objectContext=Instance.new("Frame")
objectContext.Name="ObjectInteractionContext";objectContext.AnchorPoint=Vector2.new(.5,0)
objectContext.Position=touchEnabled and UDim2.new(.5,0,0,136)or UDim2.new(.5,0,0,54)
objectContext.Size=UDim2.new(1,-30,0,67);objectContext.Visible=false;objectContext.Active=false
objectContext.BackgroundColor3=Color3.fromRGB(28,33,43);objectContext.BackgroundTransparency=.04
objectContext.BorderSizePixel=0;objectContext.ZIndex=12;objectContext.Parent=gui
corner(objectContext,12);stroke(objectContext,.22)
local objectSize=Instance.new("UISizeConstraint");objectSize.MaxSize=Vector2.new(360,70);objectSize.Parent=objectContext
local objectTitle=Instance.new("TextLabel")
objectTitle.Name="ObjectName";objectTitle.Size=UDim2.new(1,-18,0,25);objectTitle.Position=UDim2.fromOffset(9,6)
objectTitle.BackgroundTransparency=1;objectTitle.TextColor3=Color3.fromRGB(251,225,158)
objectTitle.Font=Enum.Font.GothamBold;objectTitle.TextSize=15;objectTitle.TextXAlignment=Enum.TextXAlignment.Left
objectTitle.ZIndex=13;objectTitle.Parent=objectContext
local objectStatus=Instance.new("TextLabel")
objectStatus.Name="ObjectState";objectStatus.Size=UDim2.new(1,-18,0,30);objectStatus.Position=UDim2.fromOffset(9,31)
objectStatus.BackgroundTransparency=1;objectStatus.TextColor3=Color3.fromRGB(215,227,237)
objectStatus.Font=Enum.Font.Gotham;objectStatus.TextWrapped=true;objectStatus.TextSize=12
objectStatus.TextXAlignment=Enum.TextXAlignment.Left;objectStatus.ZIndex=13;objectStatus.Parent=objectContext
local activeObjectPrompt=nil
local objectStateConnection=nil
local function refreshObjectInteraction()
 local pr=activeObjectPrompt
 if not pr or not pr.Parent or not pr.Enabled or gui:GetAttribute("RPGMenuOpen")==true or classPanel.Visible then
  objectContextActive=false;if refreshHud then refreshHud()end
  return
 end
 local kind=tostring(pr:GetAttribute("InteractionKind")or"")
 local id=tostring(pr:GetAttribute("InteractionId")or"")
 if kind==""or id==""then objectContextActive=false;if refreshHud then refreshHud()end;return end
 local note=pr.ActionText
 local state="AVAILABLE"
 if kind=="WEAPON_MERCHANT"or kind=="ARMOR_MERCHANT"then
  local weapon=kind=="WEAPON_MERCHANT"
  local key=weapon and"WeaponTier"or"ArmorTier"
  local prices=weapon and C.WeaponPrices or C.ArmorPrices
  local tier=tonumber(p:GetAttribute(key))or 1
  local price=prices[tier+1]
  if not price then note="최고 티어 보유";state="MAX_TIER"
  elseif (tonumber(p:GetAttribute("Gold"))or 0)<price then note="다음 단계 "..price.."G · 골드 부족";state="INSUFFICIENT_GOLD"
  else note="다음 단계 "..price.."G · 구매 가능"end
 elseif kind=="QUEST_NPC"then
  local questId=tonumber(p:GetAttribute("QuestPortal"))or 0
  if questId>0 then note="의뢰 "..tostring(p:GetAttribute("QuestKills")or 0).."/"..tostring(p:GetAttribute("QuestNeed")or 0)
  else note="퀘스트 받기"end
 elseif kind=="ADVANCEMENT_NPC"then
  local min=C.AdvancementLevel or 15
  note="전직 교관 · 레벨 "..min.."부터 시험"
  if (tonumber(p:GetAttribute("Level"))or 1)<min then state="LEVEL_LOCKED"end
 elseif kind=="HEALER"then
  local h=p.Character and p.Character:FindFirstChildOfClass("Humanoid")
  note=h and("HP "..math.floor(h.Health).."/"..math.floor(h.MaxHealth).." · 회복")or"체력 회복"
 elseif kind=="ENTRY_PORTAL"then
  local zoneId=tonumber(pr:GetAttribute("DestinationZone"))
  local zone=zoneId and C.Portals[zoneId]
  note=zone and (zone.Name.." · 입장") or pr.ActionText
 elseif kind=="RETURN_PORTAL"then
  if p:GetAttribute("InCombat")==true then note="전투 중 귀환 불가";state="COMBAT_LOCKED"
  else note="마을로 돌아가기"end
 elseif kind=="TREASURE_CHEST"or kind=="EVENT_ALTAR"then
  local claimKey=pr:GetAttribute("ClaimAttribute")
  if typeof(claimKey)=="string"and p:GetAttribute(claimKey)==true then
   note=kind=="TREASURE_CHEST"and"이미 연 보물상자"or"이미 조사한 제단"
   state="ALREADY_CLAIMED"
  else note=kind=="TREASURE_CHEST"and"상자 열기"or"제단 조사"end
 elseif kind=="SECRET_RUNE"then
  if pr.Parent:GetAttribute("Revealed")==true then note="이미 조사한 룬석";state="ALREADY_REVEALED"
  else note="숨겨진 정보 조사"end
 end
 objectTitle.Text=tostring(pr.ObjectText or"상호작용")
 objectStatus.Text=note
 objectContext:SetAttribute("BoundInteractionId",id)
 objectContext:SetAttribute("BoundInteractionKind",kind)
 objectContext:SetAttribute("BoundInteractionState",state)
 objectContext:SetAttribute("OwnsGameplayAuthority",false)
 objectContextActive=true;if refreshHud then refreshHud()end
end
local objectShown=ProximityPromptService.PromptShown:Connect(function(pr)
 if not pr:GetAttribute("InteractionKind")then return end
 if objectStateConnection then objectStateConnection:Disconnect();objectStateConnection=nil end
 activeObjectPrompt=pr
 objectStateConnection=pr.Parent:GetAttributeChangedSignal("Revealed"):Connect(refreshObjectInteraction)
 refreshObjectInteraction()
end)
local objectHidden=ProximityPromptService.PromptHidden:Connect(function(pr)
 if activeObjectPrompt~=pr then return end
 activeObjectPrompt=nil
 if objectStateConnection then objectStateConnection:Disconnect();objectStateConnection=nil end
 refreshObjectInteraction()
end)
local objectClaimChanged=p.AttributeChanged:Connect(function(key)
 if activeObjectPrompt and key==activeObjectPrompt:GetAttribute("ClaimAttribute")then refreshObjectInteraction()end
end)
local objectMenuChanged=gui:GetAttributeChangedSignal("RPGMenuOpen"):Connect(refreshObjectInteraction)
gui.Destroying:Connect(function()
 objectShown:Disconnect();objectHidden:Disconnect()
 objectClaimChanged:Disconnect();objectMenuChanged:Disconnect()
 if objectStateConnection then objectStateConnection:Disconnect()end
end)

-- 메인: 공용 메뉴 모델로 HUD를 배치하고 메뉴·대사·안내를 함께 조정한다.
for _,item in ipairs({objective,hint,npcSpeech,objectContext,bossScene})do
 item.Parent=notice;item.AnchorPoint=Vector2.zero;item.Position=UDim2.fromOffset(0,0)
 item.Size=UDim2.new(1,-6,0,item==bossScene and 148 or item==objectContext and 64 or item==objective and 40 or 52)
end
objective.AutomaticSize=Enum.AutomaticSize.None;hint.AutomaticSize=Enum.AutomaticSize.None
npcSpeech.AutomaticSize=Enum.AutomaticSize.None;npcSpeech.TextYAlignment=Enum.TextYAlignment.Top
bossText.AutomaticSize=Enum.AutomaticSize.Y;bossText.Size=UDim2.new(1,-18,0,76)
bossText:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
 bossScene.Size=UDim2.new(1,-6,0,math.max(148,bossText.AbsoluteSize.Y+72))
end)
objectSize.MaxSize=Vector2.new(10000,10000)
objectTitle.TextTruncate=Enum.TextTruncate.AtEnd
objectStatus.Size=UDim2.new(1,-18,0,48)
refreshHud=function()
 local size=gui.AbsoluteSize
 local layout=RPGMenuModel.hudLayout(size.X,size.Y)
 local function place(item,rect)
  item.AnchorPoint=Vector2.zero;item.Position=UDim2.fromOffset(rect.x,rect.y)
  item.Size=UDim2.fromOffset(rect.width,rect.height)
 end
 place(stats,layout.stats);place(party,layout.party);place(notice,layout.notice)
 place(combat,layout.combat);place(returnButton,layout.village);place(classPanel,layout.class)
 -- 화면 크기에 따라 가로형 카드/하단 내비게이션으로 다시 배치한다.
 local compact=size.X<630
 housingToggle.AnchorPoint=Vector2.new(0,0)
  housingToggle.Position=UDim2.fromOffset(8,compact and 164 or 171)
 housingToggle.Size=UDim2.fromOffset(compact and 76 or 84,compact and 36 or 38)
 avatarToggle.Position=UDim2.fromOffset(8,compact and 206 or 214)
 avatarToggle.Size=UDim2.fromOffset(compact and 76 or 84,compact and 36 or 38)
 avatarPanel.Size=UDim2.fromOffset(math.min(338,size.X-20),math.min(262,size.Y-20))
 housingPanel.Size=UDim2.fromOffset(math.min(320,size.X-22),322)
 housingPanel.Position=UDim2.new(.5,0,1,compact and -60 or -76)
 stats.BackgroundColor3=Color3.fromRGB(22,43,49)
 party.BackgroundColor3=Color3.fromRGB(24,47,55)
 title.TextColor3=Color3.fromRGB(255,222,152)
 combat.BackgroundTransparency=1
 combat.BackgroundColor3=Color3.fromRGB(19,38,46)
 corner(combat,17)
 for _,control in ipairs({attack,skill,block,dodge})do
  control.TextSize=13
 end
 title.Position=UDim2.fromOffset(7,2);title.Size=UDim2.new(1,-14,0,18)
 statLine.Position=UDim2.fromOffset(7,23);statLine.Size=UDim2.new(1,-14,0,32)
 classBadge.Position=UDim2.fromOffset(7,56);classBadge.TextTruncate=Enum.TextTruncate.AtEnd
 for index,control in ipairs({attack,skill,block,dodge})do
  control.Size=UDim2.fromOffset(55,48)
  control.Position=UDim2.fromOffset((index-1)%2*62,math.floor((index-1)/2)*55)
 end
 local startupOpen=startupOverlay.Parent~=nil
 local menuOpen=gui:GetAttribute("RPGMenuOpen")==true
 local blocked=startupOpen or menuOpen or classPanel.Visible
 local message=RPGMenuModel.hudMessage(menuOpen,classPanel.Visible,startupOpen,bossSceneActive,npcSpeechActive,objectContextActive,tipsVisible)
 objective.Visible=message=="OBJECTIVE";npcSpeech.Visible=message=="SPEECH"
 objectContext.Visible=message=="OBJECT";bossScene.Visible=message=="BOSS";hint.Visible=message=="TIPS"
 notice.Visible=message~="NONE";combat.Visible=false -- 자동 전투: 모바일 수동 버튼을 표시하지 않는다
 autoIndicator.Visible=not blocked and (tonumber(p:GetAttribute("CurrentZone"))or 0)>0
 returnButton.Visible=not blocked and (tonumber(p:GetAttribute("CurrentZone"))or 0)>0
 stats.Visible=not blocked;party.Visible=not blocked
 housingToggle.Visible=not blocked;avatarToggle.Visible=not blocked
 if blocked then housingPanel.Visible=false;avatarPanel.Visible=false end
 if rpgMenu then rpgMenu.button.Visible=not blocked end
 if notice:GetAttribute("ActiveMessage")~=message then notice.CanvasPosition=Vector2.zero;notice:SetAttribute("ActiveMessage",message)end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(refreshHud)
startupOverlay.Destroying:Connect(function()task.defer(refreshHud)end)

rpgMenu=RPGMenu.install(C,gui,p,{
 sounds={actionSfx,hitSfx,skillSfx,levelSfx},
 canOpen=function()return startupOverlay.Parent==nil and not classPanel.Visible end,
 onOpen=function(open)
  if open then blockInput=nil;setBlock(false)end
  if refreshHud then refreshHud()end
 end,
 trackQuest=function()tipsVisible=false;refreshHud()end,
 changeRoom=function()remote:FireServer(C.Actions.NEXT_ROOM_CODE)end,
 -- 표시 권한만 현장 거리·생존·전투 상태와 동기화한다. 구매는 기존 서버가 다시 검증한다.
 merchantAccess=function()
  local character=p.Character
  local playerRoot=character and character:FindFirstChild("HumanoidRootPart")
  local health=character and character:FindFirstChildOfClass("Humanoid")
  local usable=playerRoot~=nil and health~=nil and health.Health>0
   and p:GetAttribute("InCombat")~=true and (tonumber(p:GetAttribute("CurrentZone"))or 0)==0
  local world=workspace:FindFirstChild("DaechungRPGWorld")
  local village=world and world:FindFirstChild("Village")
  local weapon=village and village:FindFirstChild("WeaponMerchant")
  local armor=village and village:FindFirstChild("ArmorMerchant")
  return {
   weapon=(usable and weapon~=nil and (playerRoot.Position-weapon.Position).Magnitude<=16)==true,
   armor=(usable and armor~=nil and (playerRoot.Position-armor.Position).Magnitude<=16)==true
  }
 end,
 buyWeapon=function()remote:FireServer(C.Actions.BUY_WEAPON)end,
 buyArmor=function()remote:FireServer(C.Actions.BUY_ARMOR)end,
 toggleTips=function()tipsVisible=not tipsVisible;refreshHud()end,
})

local function zoneName(id)
 if id==0 then return"마을"end
 local z=C.Portals[id];return z and z.Name or"지역"
end
local function renderClassPanel()
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local adv=tostring(p:GetAttribute("AdvancementId")or"")
 local chooseStart=classId=="NONE";local chooseAdvance=classId~="NONE"and((p:GetAttribute("AdvancementTrialPassed")==true)or(p:GetAttribute("RespecReady")==true))
 classPanel.Visible=chooseStart or chooseAdvance
 if classPanel.Visible then rpgMenu.close()end
 for _,b in ipairs(classButtons)do b.Visible=chooseStart end;advA.Visible=chooseAdvance;advB.Visible=chooseAdvance
 if chooseStart then
  classTitle.Text="시작 직업 선택"
  for i,row in ipairs(classOrder)do local cd=C.Classes[row.Id];classButtons[i].Text=cd.Name.."\n"..(row.Id=="BREAKER"and"대검 · 방어파괴"or row.Id=="SHADOW"and"쌍단검 · 회피/배후"or row.Id=="RUNE"and"원소 룬 조합"or"영혼 소환 · 지원")end
 elseif chooseAdvance then
  local cd=C.Classes[classId];local a=cd and cd.Advancements.A;local b=cd and cd.Advancements.B
  classTitle.Text=(p:GetAttribute("RespecReady")==true and"재전직 선택"or"1차 전직 선택").." · "..(cd and cd.Name or"")
  if a then advA.Text=a.Name.."\n"..a.Role;advA.BackgroundColor3=a.Color end
  if b then advB.Text=b.Name.."\n"..b.Role;advB.BackgroundColor3=b.Color end
 end
end
local function render()
 local level=p:GetAttribute("Level")or 1
 local xp=p:GetAttribute("XP")or 0
 local hp=0;local maxHP=p:GetAttribute("MaxHP")or 100
 local h=p.Character and p.Character:FindFirstChildOfClass("Humanoid");if h then hp=math.floor(h.Health)end
 local mastery=p:GetAttribute("MasteryLevel")or 0;local levelLabel=level>=(C.LevelCap or 60)and("Lv."..level.." MAX")or("Lv."..level)
 statLine.Text=string.format("%s · 체력 %d/%d\n골드 %d",levelLabel,hp,maxHP,p:GetAttribute("Gold")or 0)
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local cd=C.Classes[classId];local adv=tostring(p:GetAttribute("AdvancementId")or"");local second=tostring(p:GetAttribute("SecondAdvancementId")or"")
 local advName="";if cd and adv~=""then for _,a in pairs(cd.Advancements)do if a.Id==adv then advName=" → "..a.Name;if second~=""and a.SecondId==second then advName=advName.." → "..(a.SecondName or second)end;break end end end
 classBadge.Text=(cd and cd.Name or"직업 미선택")..advName
 local zone=p:GetAttribute("CurrentZone")or 0
 local qp=p:GetAttribute("QuestPortal")or 0
 local qk=p:GetAttribute("QuestKills")or 0
 local qn=p:GetAttribute("QuestNeed")or 0
 if qp>0 then objective.Text=string.format("퀘스트 · %s 몬스터 %d/%d",zoneName(qp),qk,qn)else objective.Text=(p:GetAttribute("LastAction")or"마을 이장에게 퀘스트를 받아.")end
 local pc=p:GetAttribute("PartyCount")or 0
 local pk=p:GetAttribute("PartyKills")or 0
 local contrib=p:GetAttribute("Contribution")or 0
 partyText.Text=(p:GetAttribute("PartyHuntActive")==true)and string.format("파티 %d/4\n사냥 %d/%d · 기여 %d",pc+1,pk,C.PartyHuntTarget,contrib)or string.format("파티 %d/4\n동료 두번 터치",pc+1)
 local combatLocked=p:GetAttribute("InCombat")==true
 returnButton.Visible=zone>0
 returnButton.Text=combatLocked and"전투 중 귀환 불가"or"마을 귀환"
 returnButton.BackgroundColor3=combatLocked and Color3.fromRGB(104,65,65)or Color3.fromRGB(61,111,86)
 multi.Text="멀티 코드 "..tostring(p:GetAttribute("RoomCode")or 1)
 local trial=p:GetAttribute("AdvancementTrialActive")==true
 if trial then objective.Text=string.format("전직 시험 · %d/%d · %s",p:GetAttribute("AdvancementTrialProgress")or 0,C.AdvancementTrialTarget,p:GetAttribute("LastAction")or"")end
 local guard=math.floor(p:GetAttribute("Guard")or C.GuardMax);local blocking=p:GetAttribute("Blocking")==true
 block.Text=(blocking and"막는중"or"막기").."\n"..guard
 block.BackgroundColor3=blocking and Color3.fromRGB(83,139,177)or Color3.fromRGB(74,102,151)
 if zone==1 then hint.Text="노랑: 막기 · 빨강: 회피"else hint.Text=zone==0 and"포탈로 이동 · 동료 두 번 터치"or(zoneName(zone).." · 멀어지면 추격 해제")end
 if classId=="BREAKER"then skill.Text="파쇄"elseif classId=="SHADOW"then skill.Text="그림자"elseif classId=="RUNE"then skill.Text="룬"elseif classId=="SOUL"then skill.Text="영혼"else skill.Text="스킬"end
 renderClassPanel()
 refreshObjectInteraction()
end
local function applyBiomePresentation()
 local id=tonumber(p:GetAttribute("CurrentZone"))or 0
 local zone=nil;for _,entry in ipairs(C.Portals)do if entry.Id==id then zone=entry;break end end
 local biome=zone and Style.Biomes and Style.Biomes[zone.Theme]
 local lighting=game:GetService("Lighting")
 lighting.Ambient=biome and biome.Ambient or Style.Lighting.Ambient
 lighting.OutdoorAmbient=biome and biome.Ambient or Style.Lighting.OutdoorAmbient
 for _,name in ipairs({"StudioRpgAtmosphere","VerifiedLearningAtmosphere"})do
  local atmosphere=lighting:FindFirstChild(name)
  if atmosphere and atmosphere:IsA("Atmosphere")then
   atmosphere.Color=biome and biome.Color or Color3.fromRGB(205,213,225)
   atmosphere.Density=biome and biome.Density or .12
   atmosphere.Haze=biome and biome.Haze or .65
  end
 end
end
p:GetAttributeChangedSignal("CurrentZone"):Connect(applyBiomePresentation)
game:GetService("Lighting").ChildAdded:Connect(function(child)
 if child.Name=="StudioRpgAtmosphere"or child.Name=="VerifiedLearningAtmosphere"then task.defer(applyBiomePresentation)end
end)
task.defer(applyBiomePresentation)
for _,k in ipairs({"Level","XP","MaxHP","AttackPower","Gold","WeaponTier","ArmorTier","RelicId","MasteryLevel","SecondAdvancementId","CompanionUnlockCount","CurrentZone","QuestPortal","QuestKills","QuestNeed","LastAction","PartyCount","PartyKills","Contribution","PartyHuntActive","InCombat","RoomCode","ClassId","AdvancementId","AdvancementTrialActive","AdvancementTrialProgress","AdvancementTrialPassed","RespecReady","RuneElement","SoulCharge","Guard","Blocking","GuardBrokenUntil","ParryCount","CurrentRunSeed"})do p:GetAttributeChangedSignal(k):Connect(render)end
local lastAutoMotion=0
local lastActionMotion=""
local function syncAutoMotion()
 local now=os.clock()
 local action=tostring(p:GetAttribute("FeedbackEvent")or"")
 if action~=lastActionMotion then
  lastActionMotion=action
  if action:find("PARRY",1,true)then
    stopCombatTrack(.05);playCommonMotion("PARRY_PERFECT")
    combatShake(1.2,.15);parryHitstop()
    if studioSkillEmitter and studioSkillEmitter.Parent then studioSkillEmitter:Emit(touchEnabled and 8 or 18)end
  elseif action:find("DODGE",1,true)then playCommonMotion("DODGE_LEFT")
  elseif action:find("ATTACK",1,true)or action:find("SKILL",1,true)then playCombatAnimation(action:find("SKILL",1,true)~=nil) end
 end
end
local function bindChar(c)combatTracks={};previewTracks={};local h=c:WaitForChild("Humanoid");h.HealthChanged:Connect(render);render()end
if p.Character then task.defer(bindChar,p.Character)end;p.CharacterAdded:Connect(bindChar)
p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 syncAutoMotion()
 local v=tostring(p:GetAttribute("FeedbackEvent")or"")
 if v:match("^SKILL:")then
  playCombatAnimation(true);skillSfx:Play()
  if studioSkillEmitter and studioSkillEmitter.Parent then
   local classId=tostring(p:GetAttribute("ClassId")or"")
   local cd=C.Classes[classId]
   local color=cd and cd.Color or Color3.fromRGB(180,210,255)
   studioSkillEmitter.Texture="rbxasset://textures/particles/sparkles_main.dds"
   studioSkillEmitter.Color=ColorSequence.new(color,Color3.new(1,1,1))
   studioSkillEmitter.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.15),NumberSequenceKeypoint.new(1,1)})
   studioSkillEmitter.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,classId=="BREAKER"and .8 or .45),NumberSequenceKeypoint.new(1,0)})
   studioSkillEmitter.EmissionDirection=Enum.NormalId.Front
   studioSkillEmitter.SpreadAngle=classId=="RUNE"and Vector2.new(160,30)or classId=="SOUL"and Vector2.new(180,180)or Vector2.new(30,15)
   studioSkillEmitter.Acceleration=classId=="SOUL"and Vector3.new(0,8,0)or Vector3.new(0,-5,0)
   studioSkillEmitter.Speed=classId=="SHADOW"and NumberRange.new(12,18)or NumberRange.new(5,10)
   studioSkillEmitter:Emit(touchEnabled and 12 or 20)
  end
 end
 if v:find("LEVEL_UP")then levelSfx:Play()elseif v:find("PARRY")then skillSfx:Play()elseif v:find("GUARD_BREAK")then hitSfx:Play()elseif v:find("ATTACK")or v:find("KILL")then hitSfx:Play()end
 if v:find("NPC_INITIATED_TALK",1,true)or v:find("NPC_DIALOGUE",1,true)then showNpcSpeech()end
end)

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 if tonumber(snapshot.RoomCode)~=(p:GetAttribute("RoomCode")or 1)then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedSharedObjective",tonumber(snapshot.SharedObjective)or 0)
 render()
end)

QACamera.install(C,gui,function()
 local shots={{label="rpg-village",position=Vector3.new(0,120,170),lookAt=Vector3.new(0,2,0)}}
 for _,z in ipairs(C.Portals)do table.insert(shots,{label="rpg-portal-"..z.Id,position=z.Center+Vector3.new(0,95,150),lookAt=z.Center})end
 return shots
end)
render()
