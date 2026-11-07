-- 파일명: roblox-games/fantasy-survival/client/Game.client.luau
-- 게시: 기존 오너 전용 비공개 게시 경로에서 이 게임의 수정본만 배포한다.
-- [Vibe 공용 프레젠테이션] 기존 버튼에만 TweenService/글로우 적용 (세이브·판정 불변).
task.defer(function()
  local player = game:GetService("Players").LocalPlayer
  if not player then return end
  local shared = game:GetService("ReplicatedStorage"):FindFirstChild("Shared") or game:GetService("ReplicatedStorage"):WaitForChild("Shared", 8)
  if not shared then return end
  local module = shared:FindFirstChild("RobloxCommonPresentation")
  if not module or not module:IsA("ModuleScript") then return end
  local ok, presentation = pcall(require, module)
  if ok and type(presentation.BindGameUiEffects) == "function" then presentation.BindGameUiEffects(player) end
end)
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
-- [카메라 / 메인] 자유 3D를 기본값으로 사용하고 옵션에서 근접 3D·기존 2.5D로 전환한다.
-- 기존 이동·터치 조이스틱·전투·서버 저장값에는 영향을 주지 않는 접속 중 화면 설정이다.
local meadowCameraModes={"자유 3D","근접 3D","2.5D 경사"}
local meadowCameraMode=1
local meadowOriginalCameraMin=player.CameraMinZoomDistance
local meadowOriginalCameraMax=player.CameraMaxZoomDistance
local paintedCameraFrame=nil
local function applyMeadowCameraMode()
  paintedCameraFrame=nil
  if meadowCameraMode==3 then return end
  player.CameraMode=Enum.CameraMode.Classic
  player.CameraMaxZoomDistance=meadowCameraMode==2 and 14 or math.max(36,meadowOriginalCameraMax)
  player.CameraMinZoomDistance=meadowCameraMode==2 and 4 or math.min(2,meadowOriginalCameraMin)
  local camera=workspace.CurrentCamera
  if not camera or player:GetAttribute("MeadowEnteredWorld")~=true then return end
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if humanoid then camera.CameraSubject=humanoid end
  camera.CameraType=Enum.CameraType.Custom
  camera.FieldOfView=70
end
local function cycleMeadowCameraMode()
  meadowCameraMode=meadowCameraMode%#meadowCameraModes+1
  applyMeadowCameraMode()
end
player:GetAttributeChangedSignal("MeadowEnteredWorld"):Connect(function()
  if player:GetAttribute("MeadowEnteredWorld")==true then applyMeadowCameraMode() end
end)
player.CharacterAdded:Connect(function(character)
  task.spawn(function()
    character:WaitForChild("Humanoid",8)
    if player.Character==character and player:GetAttribute("MeadowEnteredWorld")==true then
      applyMeadowCameraMode()
    end
  end)
end)
-- [기존 2.5D] 선택했을 때에만 현재 캐릭터를 원근 경사로 따라간다.
game:GetService("RunService"):BindToRenderStep("MeadowPainted25DCamera",
  Enum.RenderPriority.Camera.Value+1,function(dt)
    if player:GetAttribute("MeadowEnteredWorld")~=true or meadowCameraMode~=3 then
      paintedCameraFrame=nil
      return
    end
    local character=player.Character
    local root=character and character:FindFirstChild("HumanoidRootPart")
    local human=character and character:FindFirstChildOfClass("Humanoid")
    local camera=workspace.CurrentCamera
    if not camera or camera:GetAttribute("MeadowBossScene")==true
      or not root or not human or human.Health<=0 then
      paintedCameraFrame=nil
      return
    end
    local portrait=camera.ViewportSize.Y>camera.ViewportSize.X
    -- [화면 시안] 실제 캐릭터 등 뒤에서 마을 쪽을 보는 3인칭 구도. 전투와 서버 상태는 유지.
    local heading=Vector3.new(root.CFrame.LookVector.X,0,root.CFrame.LookVector.Z)
    if heading.Magnitude<.1 then heading=Vector3.new(0,0,-1) end
    heading=heading.Unit
    local offset=-heading*(portrait and 19 or 23)+Vector3.new(0,portrait and 9 or 10,0)
    local focus=root.Position+Vector3.new(0,2.5,0)+heading*(portrait and 7 or 10)
    local wanted=CFrame.lookAt(focus+offset,focus)
    if not paintedCameraFrame or (paintedCameraFrame.Position-wanted.Position).Magnitude>75 then
      paintedCameraFrame=wanted
    else
      paintedCameraFrame=paintedCameraFrame:Lerp(wanted,1-math.exp(-math.clamp(dt,0,.08)*7))
    end
    if camera.CameraType~=Enum.CameraType.Scriptable then
      camera.CameraType=Enum.CameraType.Scriptable
    end
    camera.CFrame=paintedCameraFrame
    camera.FieldOfView=portrait and 48 or 51
  end)
local CommonUI = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("RobloxCommonUI"))
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN
local verifiedExternalLearningContext = Config.VerifiedExternalLearning or Config.LearningContext or {}
local verifiedExternalLearningIds = verifiedExternalLearningContext.VerifiedExternalLearningIds or {}
local verifiedExternalLearningPrinciples = verifiedExternalLearningContext.ApplicationPrinciples or {}
local verifiedExternalGameDevelopmentPrinciples = verifiedExternalLearningContext.GameDevelopmentPrinciples or {}
local verifiedExternalLearningMappings = verifiedExternalLearningContext.GameSpecificSemanticMappings or {}
local verifiedExternalLearningDispositions = verifiedExternalLearningContext.LearningDispositions or {}
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END

-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 2
local studioAssetConfig = Config.StudioAssets or {}
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
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)
-- 입력: 모션은 즉시 재생하고 피해·보상은 기존 서버에만 요청한다.
local playNativeCombatMotion
local predictedCombatSequence=0
local predictedCombatUntil=0
local pendingCombatMotion={}
local meadowSkillLock=function(id) return nil end -- 아래 meadowArt.skillLock이 채운다.
local function activateMeadowAction(actionId)
  if meadowSkillLock(actionId) then return false end
  -- [회피 입력] 기존 회피 버튼 한 개로 모바일 스틱/키보드의 좌우 방향을 선택한다.
  -- 카메라 기준 수평 이동만 읽으며, 중립 입력은 기존 왼쪽 회피를 유지한다.
  if actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right" then
    local character=player.Character
    local human=character and character:FindFirstChildOfClass("Humanoid")
    local camera=workspace.CurrentCamera
    if human and camera then
      local right=camera.CFrame.RightVector
      local horizontal=Vector3.new(right.X,0,right.Z)
      if horizontal.Magnitude>.01 then
        local stick=human.MoveDirection:Dot(horizontal.Unit)
        if stick>.2 then actionId="skill-meadow-dodge-right"
        elseif stick<-.2 then actionId="skill-meadow-dodge-left" end
      end
    end
  end
  local combat=false
  for _,action in ipairs(Config.Actions) do
    if action.Id==actionId then combat=action.Kind=="COMBAT";break end
  end
  if combat then
    local cost=actionId=="meadow-unarmed-uppercut" and 20 or actionId=="meadow-unarmed-kick" and 14 or 0
    if (player:GetAttribute("MeadowStamina") or 0)<cost then return false end
    local character=player.Character
    local human=character and character:FindFirstChildOfClass("Humanoid")
    if not human or human.Health<=0 or player:GetAttribute("ProfileReady")~=true then return false end
    local now=os.clock()
    if now<predictedCombatUntil then return false end
    predictedCombatUntil=now+.42
    predictedCombatSequence+=1
    if playNativeCombatMotion then
      local ok,started=pcall(playNativeCombatMotion,actionId,predictedCombatSequence)
      if ok and started then pendingCombatMotion[actionId]=now
      elseif not ok then warn("마력숲 맨손 포즈 실행 실패: "..tostring(started)) end
    end
  end
  remote:FireServer(actionId)
  return true -- [튜토리얼 판정] 서버로 정상 전송된 요청에만 진행 표시
end

local gui = Instance.new("ScreenGui")
gui.Name = "ApprovedScopeHud"
gui:SetAttribute("ClientActionRuntimeVersion",3)
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
-- [단일 체력바] Roblox 기본 체력 UI와 전용 체력바의 이중 표시를 제거한다.
pcall(function() game:GetService("StarterGui"):SetCoreGuiEnabled(Enum.CoreGuiType.Health,false) end)
-- [마력숲 옵션] 접속 중 카메라·표시·음량만 조절하며 서버 저장 구조를 변경하지 않는다.
local meadowIconAtlas="rbxassetid://102668066491590" -- CC0_INTERFACE_ATLAS
-- [스킬·장비 신규 원화] 스킬 아이콘 5x5(200px) / 장비 아이콘 8x8(128px). 자산 ID가 비어 있으면 기존 아틀라스를 그대로 쓴다.
local meadowArt={skillSheet="rbxassetid://129030506278489",gearSheet="rbxassetid://129911424873839",
  rarityColor={Common=Color3.fromRGB(176,176,170),Uncommon=Color3.fromRGB(96,196,112),Rare=Color3.fromRGB(84,150,230),Epic=Color3.fromRGB(170,100,226),Legendary=Color3.fromRGB(244,182,58)},
  rarityName={Common="일반",Uncommon="고급",Rare="희귀",Epic="영웅",Legendary="전설"},
  skillCell={["skill-meadow-heavy"]=0,["skill-meadow-sweep"]=1,["skill-meadow-bolt"]=2,["skill-meadow-guard"]=3,["skill-meadow-parry"]=4,
    ["skill-meadow-dodge-left"]=5,["skill-meadow-dodge-right"]=6,["skill-meadow-sprint"]=7,["skill-meadow-heal"]=8,["skill-meadow-focus"]=9,
    ["skill-meadow-emote"]=10,["skill-meadow-oath"]=15,["skill-meadow-ultimate"]=15,["meadow-unarmed-rush"]=11,["meadow-unarmed-uppercut"]=12,["meadow-unarmed-kick"]=13,["meadow-unarmed-elbow"]=14,
    Martial=15,Signs=16,Defense=17,Agility=18},
  slotEmpty={Weapon=36,Chest=37,Hands=38,Legs=39,Feet=40,Accessory=41}}
-- [90개 CC0 스킬 아이콘] 기존 업로드 시트 4장을 한 함수에서 연결한다.
-- 등록된 원화가 없는 경우 기존 스킬 아이콘 시트를 유지하며 전투·저장은 변경하지 않는다.
meadowArt.skillNodeIndex={}
for _,node in ipairs(Config.MeadowSkillNodes or {}) do
  meadowArt.skillNodeIndex[node.Id]=node.Index
  meadowArt.skillCell[node.Id]=node.IconCell
end
-- [화면 기준점] ScreenGui 는 AbsolutePosition 이 없을 수 있어 안전하게 읽는다(튜토리얼 화살표 반복 오류 방지).
function meadowArt.origin(root)
  local ok,value=pcall(function() return root.AbsolutePosition end)
  if ok and typeof(value)=="Vector2" then return value end
  return Vector2.zero
end
function meadowArt.skill(icon,key)
  local index=meadowArt.skillNodeIndex[key]
  local sheets=meadowArt.talentSheets
  if index and index>=1 and index<=90 and sheets then
    local sheet=sheets[(index-1)%4+1]
    if type(sheet)=="string" and sheet:match("^rbxassetid://%d+$") then
      local cell=math.floor((index-1)/4)%25
      icon.Image=sheet
      icon.ImageRectOffset=Vector2.new((cell%5)*200,math.floor(cell/5)*200)
      icon.ImageRectSize=Vector2.new(200,200)
      return true
    end
  end
  local cell=meadowArt.skillCell[key]
  if meadowArt.skillSheet=="" or cell==nil then return false end
  icon.Image=meadowArt.skillSheet
  icon.ImageRectOffset=Vector2.new((cell%5)*200,math.floor(cell/5)*200);icon.ImageRectSize=Vector2.new(200,200)
  return true
end
function meadowArt.gear(icon,cell)
  if meadowArt.gearSheet=="" or cell==nil then return false end
  -- [장비 110종 아이콘] 기존 64칸 원본 시트 범위를 넘기지 않는다. 개별 실물은 3D 프리뷰가 덮는다.
  local safeCell=math.clamp(math.floor(tonumber(cell) or 0),0,63)
  icon.Image=meadowArt.gearSheet
  icon.ImageRectOffset=Vector2.new((safeCell%8)*128,math.floor(safeCell/8)*128)
  icon.ImageRectSize=Vector2.new(128,128)
  return true
end
-- [3D 아이템 보기] 서버가 ReplicatedStorage.MeadowItemModels에 올려 둔 CC0 아이템 메시를 뷰포트에서 천천히 돌린다.
-- 모델이 아직 없거나 키가 없으면 기존 평면 아이콘을 그대로 쓴다.
do
  local RS=game:GetService("ReplicatedStorage")
  local RunSvc=game:GetService("RunService")
  local views={}
  local gearKeys={wanderer_blade="item_sword",hunter_blade="item_sword",runic_blade="item_sword_golden",forest_blade="item_sword_golden",
    dew_dagger="item_dagger",thorn_axe="item_axe_small",hunter_bow="item_bow_wooden",wind_bow="item_bow_wooden",worldtree_bow="item_bow_wooden",magma_greatsword="item_sword_big"}
  local armorKeys={travel_armor="item_armor_leather",hunter_armor="item_armor_metal2",moss_robe="item_armor_leather",frost_leather="item_armor_leather",
    guardian_armor="item_armor_metal",magma_plate="item_armor_metal",worldtree_mail="item_armor_golden",
    moon_amulet="item_necklace1",fang_necklace="item_necklace1",herb_bracelet="item_ring2"}
  -- 같은 갑옷 모델도 색조를 입혀 종류를 구분한다(재질 색 곱하기).
  local tints={moss_robe=Color3.fromRGB(125,185,115),frost_leather=Color3.fromRGB(150,195,240),magma_plate=Color3.fromRGB(255,120,75),
    worldtree_mail=Color3.fromRGB(150,240,170),hunter_armor=Color3.fromRGB(190,200,170),guardian_armor=Color3.fromRGB(190,210,255)}
  function meadowArt.itemTintFor(item)
    if not item or not item.gear then return nil end
    local gear=item.gear
    if gear.Tint then
      return Color3.fromRGB(gear.Tint[1],gear.Tint[2],gear.Tint[3])
    end
    local look=Config.GearLook and Config.GearLook[gear.Id]
    if look and look.tint then return Color3.fromRGB(look.tint[1],look.tint[2],look.tint[3]) end
    return tints[gear.Id]
  end
  local matKeys={Wood="item_woodlog",Stone="item_rock_1",Ore="item_mineral",Magma="item_mineral",Fang="item_bone",Claw="item_bone",Ectoplasm="item_skull",Crystal="item_crystal1",Ingot="item_mineral",Steel="item_gold_ingots",Meat="item_chickenleg",Leather="item_bone"}
  function meadowArt.itemKeyFor(item)
    if not item then return nil end
    if item.gear then
      local gear=item.gear
      if gear.ModelKey then return gear.ModelKey end
      -- [장비 실물 아이콘] 착용 화면·도감·가방 모두 같은 등록 3D 모델 키를 쓴다.
      local look=Config.GearLook and Config.GearLook[gear.Id]
      if look then
        if look.model then return look.model end
        if look.acc and look.acc.model then return look.acc.model end
      end
      if gear.Slot=="Cape" then return Config.OpeningCapeModelKey end
      if gearKeys[gear.Id] then return gearKeys[gear.Id] end
      if armorKeys[gear.Id] then return armorKeys[gear.Id] end
      if gear.Slot=="Hands" then return "item_glove" end
      if gear.Slot=="Legs" then return "item_pants" end
      if gear.Slot=="Feet" then return "item_boots" end
      if gear.Category=="장신구" then return "item_ring1" end
      return nil
    end
    if type(item.key)=="string" and matKeys[item.key] then return matKeys[item.key] end
    if item.tonic then return item.tonic.Id=="energy_tonic" and "item_potion3_filled" or "item_potion1_filled" end
    if item.key=="Crystal" then return "item_crystal1" end
    if item.key=="Coins" then return "item_coin" end
    if item.key=="ResearchRecords" then return "item_book1_closed" end
    return nil
  end
  function meadowArt.new3D(icon)
    local view=Instance.new("ViewportFrame")
    view.Name="Item3D";view.BackgroundTransparency=1;view.BorderSizePixel=0
    view.AnchorPoint=icon.AnchorPoint;view.Size=icon.Size;view.Position=icon.Position;view.ZIndex=icon.ZIndex+1;view.Interactable=false
    view.Ambient=Color3.fromRGB(190,190,200);view.LightColor=Color3.fromRGB(255,244,220);view.Visible=false
    view.Parent=icon.Parent
    views[view]={icon=icon,key=nil,model=nil,angle=math.random()*6}
    return view
  end
  function meadowArt.set3D(view,key,tint)
    local entry=views[view]
    if not entry then return end
    if entry.key~=key or entry.tint~=tint then
      entry.key=key;entry.tint=tint
      if entry.model then entry.model:Destroy();entry.model=nil end
      view.Visible=false;entry.icon.Visible=true
    end
  end
  function meadowArt.has3D(view)
    local entry=views[view]
    return entry~=nil and entry.model~=nil
  end
  local function fill(view,entry)
    local folder=RS:FindFirstChild("MeadowItemModels")
    local template=folder and entry.key and folder:FindFirstChild(entry.key)
    if not template then return end
    local model=template:Clone();model.Parent=view
    local cf,size=model:GetBoundingBox()
    model:PivotTo(CFrame.new(-cf.Position)*model:GetPivot())
    local radius=math.max(size.X,size.Y,size.Z)
    local camera=view.CurrentCamera
    if not camera then camera=Instance.new("Camera");camera.Parent=view;view.CurrentCamera=camera end
    camera.FieldOfView=35;camera.CFrame=CFrame.new(Vector3.new(0,radius*.35,radius*2.1),Vector3.new(0,0,0))
    if entry.tint then
      for _,part in ipairs(model:GetDescendants()) do if part:IsA("MeshPart") then part.Color=entry.tint end end
    end
    entry.model=model;view.Visible=true;entry.icon.Visible=false
  end
  function meadowArt.refresh3D(view)
    local entry=views[view]
    if entry and not entry.model and entry.key then fill(view,entry) end
  end
  local tick=0
  RunSvc.Heartbeat:Connect(function(dt)
    tick+=dt
    local poll=tick>.5
    if poll then tick=0 end
    for view,entry in pairs(views) do
      if not view.Parent then views[view]=nil
      elseif entry.model then
        if view.Visible then
          entry.angle+=dt*1.1
          entry.model:PivotTo(CFrame.Angles(math.rad(-18),entry.angle,math.rad(12)))
        end
      elseif poll and entry.key and view.Parent.Visible~=false then fill(view,entry) end
    end
  end)
end
local meadowPaintedHudAtlas="rbxassetid://84007761993593" -- [고퀄 원화] 1000x1000 5x5 / 200px 칸 21종 (Roblox 1024 제한 이하), 게임 내 로딩은 게시 후 검증
do -- [노드별 아이콘 시트] 4장이 모두 있을 때만 쓴다.
  local okIds,idTable=pcall(function() return require(Shared:WaitForChild("SkillTreeIconIds",3)) end)
  if okIds and type(idTable)=="table" then
    local list={}
    for n=1,4 do
      local v=idTable["skill_"..n]
      if type(v)=="string" and v~="" then list[n]=v end
    end
    if #list==4 then meadowArt.talentSheets=list end
  end
end
-- [전용 스킬 아이콘] CC0(pauliuw) 스킬 아이콘 시트 1번의 '스킬북'(25번째 칸). 업로드 ID가 아직 없으면 기존 아이콘을 쓴다.
local function applySkillTreeIcon(icon)
  local ok,ids=pcall(function() return require(Shared:WaitForChild("SkillTreeIconIds",3)) end)
  local sheet=ok and type(ids)=="table" and ids.skill_1
  if type(sheet)=="string" and sheet~="" then
    icon.Image=sheet;icon.ImageRectSize=Vector2.new(200,200);icon.ImageRectOffset=Vector2.new(800,800)
    return true
  end
  return false
end
-- [오른쪽 아이콘] 외부 다운로드 후 등록 승인된 5종 + 물약·가방 원본 보존
local meadowRealActionIcons={
  fist="rbxassetid://127661757924412",
  dodge="rbxassetid://121029196724745",
  guard="rbxassetid://85078081802173",
  potion="rbxassetid://120656085154237",
  interact="rbxassetid://116646806670052",
  sprint="rbxassetid://115039637258925",
  bag="rbxassetid://127437456512278"
} -- CC0_REAL_ACTION_ICONS
local reducedEffects=game:GetService("UserInputService").TouchEnabled
local meadowEffectsGroup=Instance.new("SoundGroup")
meadowEffectsGroup.Name="MeadowEffects";meadowEffectsGroup.Volume=.75
meadowEffectsGroup.Parent=game:GetService("SoundService")
local meadowAmbienceGroup=Instance.new("SoundGroup")
meadowAmbienceGroup.Name="MeadowAmbience";meadowAmbienceGroup.Volume=.75
meadowAmbienceGroup.Parent=game:GetService("SoundService")
-- [효과음] 로블록스 내장 사운드만 사용(추가 업로드 불필요). 같은 소리는 .06초 안에 겹치지 않는다.
meadowArt.sfxFiles={
  swing="rbxasset://sounds/swordslash.wav",lunge="rbxasset://sounds/swordlunge.wav",
  unsheath="rbxasset://sounds/unsheath.wav",hit="rbxasset://sounds/snap.mp3",
  thud="rbxasset://sounds/action_jump_land.mp3",click="rbxasset://sounds/button.wav",
  ping="rbxasset://sounds/electronicpingshort.wav",win="rbxasset://sounds/victory.wav",
  hurt="rbxasset://sounds/collide.wav",whoosh="rbxasset://sounds/action_jump.mp3",
}
meadowArt.sfxAt={}
meadowArt.quickIds={"@weapon","@hp","skill-meadow-heavy","skill-meadow-sweep","skill-meadow-bolt"} -- 하단 퀵슬롯 5칸: 칸마다 무기·채집·약·기술 중 고른다(기본값).
meadowArt.quickSpecial={"@weapon","@interact","@hp","@sp","@oil"}
meadowArt.quickSpecialLabel={["@weapon"]="무기 꺼내기",["@interact"]="채집·조작",["@hp"]="체력약",["@sp"]="기력약",["@oil"]="오일 바르기"}
meadowArt.skillNeed={
  ["skill-meadow-sweep"]={"Martial",2,"검술"},["skill-meadow-bolt"]={"Signs",1,"표식"},
  ["skill-meadow-focus"]={"Signs",1,"표식"},["skill-meadow-heal"]={"Signs",2,"표식"},
  ["skill-meadow-parry"]={"Defense",1,"방호"},
  ["skill-meadow-dodge-left"]={"Agility",1,"회피"},["skill-meadow-dodge-right"]={"Agility",1,"회피"},
}
-- 배우지 않은 기술이면 "표식 1 필요" 같은 글자를, 쓸 수 있으면 nil을 돌려준다.
function meadowArt.skillLock(id)
  local node=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[id]
  if node then
    local bits=math.floor(tonumber(game:GetService("Players").LocalPlayer:GetAttribute("MeadowSkillBits"..math.ceil(node.Index/10))) or 0)
    local rank=bit32.band(bit32.extract(bits,((node.Index-1)%10)*3,3),3)
    if rank>=1 then return nil end
    return "스킬 트리에서 "..node.Name.." 습득 필요"
  end
  local need=meadowArt.skillNeed[id]
  if not need then return nil end
  local lv=tonumber(game:GetService("Players").LocalPlayer:GetAttribute("MeadowTalent"..need[1])) or 0
  if lv>=need[2] then return nil end
  return need[3].." "..need[2].."단계 필요"
end
meadowSkillLock=meadowArt.skillLock
meadowArt.sfx=function(name,volume,pitch)
  local id=meadowArt.sfxFiles[name]
  if not id then return end
  local now=os.clock()
  if now-(meadowArt.sfxAt[name] or 0)<.06 then return end
  meadowArt.sfxAt[name]=now
  local sound=Instance.new("Sound")
  sound.Name="MeadowSfx_"..name;sound.SoundId=id;sound.Volume=volume or .5
  sound.PlaybackSpeed=pitch or 1;sound.SoundGroup=meadowEffectsGroup
  sound.Parent=game:GetService("SoundService")
  sound:Play()
  game:GetService("Debris"):AddItem(sound,2)
end
local root = Instance.new("Frame")
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
-- [표현 초기화] 날씨에서 재사용하는 객체만 외부 범위에 유지한다.
local verifiedLearningLighting, verifiedLearningColorGrade
do
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = Config.VerifiedExternalLearning or Config.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 6
local verifiedLearningRoot = gui
local verifiedLearningSemanticVariant = "SURVIVAL_RISK"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(255, 112, 112)
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
verifiedLearningColorGrade = verifiedLearningLighting:FindFirstChild("VerifiedLearningColorGrade")
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
end
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
  studioAssetStroke.Parent = root
end
root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
root:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))

root.Name = "Root"
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0.54, 0)
root.BackgroundTransparency = 0.15
root.BackgroundColor3 = Color3.fromRGB(14, 28, 25)
local meadowPanelCorner=Instance.new("UICorner")
meadowPanelCorner.CornerRadius=UDim.new(0,18)
meadowPanelCorner.Parent=root
local meadowPanelGradient=Instance.new("UIGradient")
meadowPanelGradient.Rotation=90
meadowPanelGradient.Color=ColorSequence.new(Color3.fromRGB(26,53,46),Color3.fromRGB(9,18,25))
meadowPanelGradient.Parent=root
root.Parent = gui
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, -20, 0, 44)
title.Position = UDim2.fromOffset(10, 8)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(245, 248, 255)
title.TextScaled = true
title.Text = "" -- [시안] 왼쪽 게임 제목은 표시하지 않는다.
title.TextXAlignment=Enum.TextXAlignment.Left
title.TextSize=19
title.TextScaled=false
title.Size=UDim2.new(1,-96,0,44)
title.Parent = root
local status = Instance.new("TextLabel")
status.Name = "Status"
status.Size = UDim2.new(1, -20, 0, 48)
status.Position = UDim2.fromOffset(10, 54)
status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)
status.TextColor3 = Color3.fromRGB(220, 243, 222)
status.TextWrapped=true
status.TextSize=15
status.TextScaled=false
status.TextScaled = true
status.Parent = root

local multiplayerStatus = Instance.new("TextLabel")
multiplayerStatus.Name = "MultiplayerStatus"
multiplayerStatus.Size = UDim2.new(1, -20, 0, 36)
multiplayerStatus.Position = UDim2.fromOffset(10, 104)
multiplayerStatus.BackgroundTransparency = 1
multiplayerStatus.TextColor3 = Color3.fromRGB(180, 230, 255)
multiplayerStatus.TextScaled = true
multiplayerStatus.Text = "초원 생존 · 동료 연결 대기"
multiplayerStatus.TextXAlignment=Enum.TextXAlignment.Left
local meadowAvatar=Instance.new("ImageLabel")
meadowAvatar.Name="NativeR15Avatar"
meadowAvatar.Size=UDim2.fromOffset(58,58)
meadowAvatar.Position=UDim2.new(1,-70,0,7)
meadowAvatar.BackgroundColor3=Color3.fromRGB(43,68,53)
meadowAvatar.BorderSizePixel=0
meadowAvatar.ImageTransparency=0
meadowAvatar.Parent=root
local meadowAvatarCorner=Instance.new("UICorner")
meadowAvatarCorner.CornerRadius=UDim.new(1,0)
meadowAvatarCorner.Parent=meadowAvatar
task.spawn(function()
  local ok,thumbnail=pcall(function()
    return Players:GetUserThumbnailAsync(player.UserId,Enum.ThumbnailType.HeadShot,Enum.ThumbnailSize.Size150x150)
  end)
  if ok and type(thumbnail)=="string" and player.Parent then meadowAvatar.Image=thumbnail end
end)
multiplayerStatus.Parent = root
remote.OnClientEvent:Connect(function(kind, payload)
  if kind ~= "MULTIPLAYER_SYNC" or typeof(payload) ~= "table" then return end
  multiplayerStatus.Text = string.format("참여 %d명 · 공동 목표 %d · 개인 점수 %d", payload.ParticipantCount or 0, payload.SharedObjective or 0, payload.RoundScore or 0)
end)

local list = Instance.new("ScrollingFrame")
list.Name = "ApprovedActions"
list.Size = UDim2.new(1, -20, 1, -150)
list.Position = UDim2.fromOffset(10, 142)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.new()
list.ScrollBarThickness = 4
list.ClipsDescendants = true
list.Parent = root
local meadowActionGrid=Instance.new("UIGridLayout")
meadowActionGrid.Name="NativeActionGrid"
meadowActionGrid.SortOrder=Enum.SortOrder.LayoutOrder
meadowActionGrid.CellSize=UDim2.new(.5,-5,0,54)
meadowActionGrid.CellPadding=UDim2.fromOffset(6,6)
meadowActionGrid.Parent=list
local meadowActionButtons={}
for index, action in ipairs(Config.Actions) do
  local button = CommonUI.CreatePrimaryButton({minWidth=44,minHeight=52})
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  button.Size=UDim2.new(.5,-5,0,54) -- UIGridLayout sets positions safely
  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = false;button.TextSize=15
  button.Text = CommonUI.ActionLabel(action,index)
  -- 메인 전투 기술은 오른쪽 원형 도크에서만 표시하고, 기존 메뉴의 중복 버튼을 숨긴다.
  local hidden=action.Kind=="COMBAT" or action.Id=="skill-meadow-bolt"
    or action.Id=="skill-meadow-guard" or action.Id=="skill-meadow-parry"
    or action.Id=="skill-meadow-heal" or action.Id=="skill-meadow-dodge-left"
    or action.Id=="skill-meadow-dodge-right" or action.Id=="scope-coreloop-1-6ebe58f496"
  if hidden then
    button:Destroy()
  else
    button.Parent = list
    meadowActionButtons[action.Id]=button
    button.Activated:Connect(function() activateMeadowAction(action.Id) end)
  end
end
local readyCountdown=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  readyCountdown+=dt
  if readyCountdown<.24 then return end
  readyCountdown=0
  local now=workspace:GetServerTimeNow()
  for _,action in ipairs(Config.Actions) do
    local button=meadowActionButtons[action.Id]
    if button then
      local deadline=player:GetAttribute("MeadowReady_"..action.Id)
      local remains=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
      button.Text=action.Label..(remains>.05 and "  ·  "..math.ceil(remains).."초" or "")
      button.Active=remains<=.05
      button.BackgroundColor3=remains>.05 and Color3.fromRGB(80,89,92) or
        (action.Kind=="SKILL" and Color3.fromRGB(173,232,198) or Color3.fromRGB(235,242,255))
    end
  end
  if meadowActionButtons.refreshSkills and gui:GetAttribute("GameMenuOpen")==true then meadowActionButtons.refreshSkills() end
end)
-- [생존 탐색 피드백] 4개 숲 관찰 지점·기존 동물 프롬프트에서 받은 서버 단서만 표시한다.
-- 6초 뒤 자동 사라지는 작은 알림. 기존 위험 예고·스킬·조이스틱을 가리지 않는다.
local meadowSurvivalHint=Instance.new("TextLabel")
meadowSurvivalHint.Name="MeadowSurvivalHint"
meadowSurvivalHint.AnchorPoint=Vector2.new(.5,0)
meadowSurvivalHint.Position=UDim2.new(.5,0,.255,0)
meadowSurvivalHint.Size=UDim2.new(.75,0,0,50)
meadowSurvivalHint.BackgroundColor3=Color3.fromRGB(21,47,37)
meadowSurvivalHint.BackgroundTransparency=.13
meadowSurvivalHint.TextColor3=Color3.fromRGB(241,248,225)
meadowSurvivalHint.TextSize=14
meadowSurvivalHint.TextWrapped=true
meadowSurvivalHint.Font=Enum.Font.GothamMedium
meadowSurvivalHint.BorderSizePixel=0
meadowSurvivalHint.Active=false
meadowSurvivalHint.ZIndex=8
meadowSurvivalHint.Visible=false
meadowSurvivalHint.Parent=gui
local meadowSurvivalHintCorner=Instance.new("UICorner")
meadowSurvivalHintCorner.CornerRadius=UDim.new(0,12)
meadowSurvivalHintCorner.Parent=meadowSurvivalHint
local meadowSurvivalHintToken=0
player:GetAttributeChangedSignal("MeadowSurvivalHintSerial"):Connect(function()
  local value=player:GetAttribute("MeadowSurvivalHint")
  if type(value)~="string" or #value==0 then return end
  meadowSurvivalHint.Text=value
  meadowSurvivalHint.Visible=true
  meadowSurvivalHintToken+=1
  local token=meadowSurvivalHintToken
  task.delay(6,function()
    if token==meadowSurvivalHintToken then meadowSurvivalHint.Visible=false end
  end)
end)

-- [전투 HUD] 실제 휴머노이드 최대 체력을 기준으로 표시한다.
local meadowHealthTrack,meadowHealthControl=CommonUI.CreateHealthBar({name="MeadowHealth",text="체력",textSize=11})
meadowHealthTrack.Parent=root
local watched = {"Score","Coins","CombatProficiency","CookingProficiency","CraftingProficiency","SmithXp","Steel","Meat","ArmorTier","GatheringProficiency","BuildingProficiency","HuntingProficiency","AlchemyProficiency","Progress","Health","Wave","CurrentWave","AliveEnemies","RunPhase","MeadowStamina","Wood","Stone","Ingot","Leather","WeaponTier","Bosses","SharedObjective","RoundScore","LastApprovedScope","ProfileReady","SaveStatus"}
local function render()
  status.Text="" -- [필요 없는 작은 글씨 제거] 월드/몬스터 수는 기본 화면에 표시하지 않는다.
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local hp=humanoid and humanoid.Health or (player:GetAttribute("Health") or 0)
  local maxHp=humanoid and humanoid.MaxHealth or 100
  meadowHealthControl.SetRatio(maxHp>0 and hp/maxHp or 0,string.format("%d / %d",hp,maxHp))
  -- [시안 체력바] SetRatio가 호출될 때마다 초록으로 되돌리므로 호출 직후 시안의 붉은 체력바를 다시 적용한다.
  local healthFillBar=meadowHealthTrack:FindFirstChild("Fill")
  if healthFillBar then
    local healthBase=Color3.fromRGB(196,52,58)
    healthFillBar.BackgroundColor3=healthBase
    local healthGradient=healthFillBar:FindFirstChildOfClass("UIGradient")
    if healthGradient then
      healthGradient.Color=ColorSequence.new(healthBase:Lerp(Color3.new(1,1,1),.18),healthBase:Lerp(Color3.new(0,0,0),.22))
    end
  end
  local saveStatus = player:GetAttribute("SaveStatus")
  if player:GetAttribute("ProfileReady") ~= true then
    status.Text = "프로필 불러오는 중 · 전투 잠시 대기"
  elseif saveStatus == "SESSION_ONLY" then
    status.Text = "임시 플레이 · 이번 접속의 진행은 저장되지 않음"
  elseif saveStatus == "SAVE_FAILED" then
    status.Text = "저장 실패 · 기존 저장 데이터 보호 중"
  end
  status.Visible=status.Text~="" -- 로딩/저장 오류에 한해서만 기존 안내를 유지한다.
end
for _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end
render()

-- 키보드 스페이스/게임패드 A는 안내용 생존 시작이 아니라 실제 전투 버튼에 연결한다.
local primaryCombatAction = nil
for _, action in ipairs(Config.Actions) do
  if action.Kind == "COMBAT" then primaryCombatAction = action; break end
end
primaryCombatAction = primaryCombatAction or Config.Actions[1]
if primaryCombatAction then
  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)
    if inputState == Enum.UserInputState.Begin and gui:GetAttribute("GameMenuOpen")~=true then
      activateMeadowAction(primaryCombatAction.Id)
    end
    return Enum.ContextActionResult.Sink
  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
end


-- native-foundation-sentinel-v1 client readiness
local nativeFoundationInput = game:GetService("UserInputService")
local nativeTouchEnabled = nativeFoundationInput.TouchEnabled
local nativeFoundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
local nativeFoundationCamera = workspace.CurrentCamera
local function reportNativeFoundationReady()
  -- Readiness reporting must never suspend skill buttons or combat animation.
  local endpoint=nativeFoundationRemote or ReplicatedStorage:WaitForChild("RuntimeFoundationReport",12)
  if not endpoint or not endpoint:IsA("RemoteEvent") then return end
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid")
  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then
    endpoint:FireServer("CAMERA_READY")
  end
  endpoint:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")
end
task.defer(reportNativeFoundationReady)

-- [공유 HUD 참조] 메뉴 구성 구역 밖의 모바일 버튼·자원바에서 같은 실제 GUI를 사용한다.
local meadowTutorialAdvance,meadowTutorialRestart -- [첫 플레이 안내] 기존 게임 입력을 관찰하기만 한다.
local meadowTutorialStep=0
local meadowQuestNavLabel -- [실제 목적지 길잡이] 기존 의뢰 카드에 안내를 추가한다.
local meadowInteractionAttemptAt=0
local meadowAttackAttemptAt=0
local meadowDodgeAttemptAt=0
local meadowQuestGuideButton -- [튜토리얼 강조] 실사용 중인 퀘스트 버튼을 그대로 가리킨다.
local meadowVitalsGui, meadowPages, meadowMenu, energyFill, energyLabel

do
-- [게임 메뉴] 현재 서버 상태만 읽는 캐릭터·소지품·저널과 실제 동작하는 옵션.
meadowPages={}
local meadowLabels={}
local meadowPageNames={"캐릭터","인벤토리","퀘스트","옵션","도우미","세계","스킬"}
for index,name in ipairs(meadowPageNames) do
  local page=Instance.new("ScrollingFrame")
  page.Name="MeadowPage"..index;page.BackgroundTransparency=1;page.BorderSizePixel=0
  page.AutomaticCanvasSize=Enum.AutomaticSize.Y;page.CanvasSize=UDim2.new()
  page.ScrollBarThickness=3;page.ScrollingDirection=Enum.ScrollingDirection.Y;page.ClipsDescendants=true
  page.Visible=false;page.Parent=root
  local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,10)
  layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=page
  meadowPages[index]=page
  if index<4 or index>=5 then
    local label=Instance.new("TextLabel")
    label.Name="LiveDetails";label.BackgroundTransparency=1
    label.Size=UDim2.new(1,-8,0,0);label.AutomaticSize=Enum.AutomaticSize.Y
    -- [전체 메뉴] 단순 텍스트 덩어리 대신 읽기 편한 정보 카드로 표시한다.
    label.BackgroundTransparency=0;label.BackgroundColor3=Color3.fromRGB(21,48,45)
    label.TextColor3=Color3.fromRGB(229,239,228);label.Font=Enum.Font.GothamMedium
    label.TextSize=15;label.TextWrapped=true;label.TextXAlignment=Enum.TextXAlignment.Left
    label.TextYAlignment=Enum.TextYAlignment.Top;label.Parent=page
    local textCorner=Instance.new("UICorner")
    textCorner.CornerRadius=UDim.new(0,11);textCorner.Parent=label
    local textBorder=Instance.new("UIStroke")
    textBorder.Color=Color3.fromRGB(79,121,100);textBorder.Transparency=.45;textBorder.Parent=label
    local textPadding=Instance.new("UIPadding")
    textPadding.PaddingTop=UDim.new(0,13);textPadding.PaddingBottom=UDim.new(0,13)
    textPadding.PaddingLeft=UDim.new(0,14);textPadding.PaddingRight=UDim.new(0,14)
    textPadding.Parent=label
    meadowLabels[index]=label
  end
end
-- [섹션 칩] 퀘스트·세계 탭의 긴 글을 칩으로 나눠 한 번에 한 주제만 보여 준다.
meadowArt.sections={}
meadowArt.applySection=function(pageIndex)
  local info=meadowArt.sections[pageIndex]
  if not info or not info.texts then return end
  meadowLabels[pageIndex].Text=info.texts[info.selected] or ""
  for i,chip in ipairs(info.chips)do
    local on=i==info.selected
    chip.BackgroundColor3=on and Color3.fromRGB(54,112,84) or Color3.fromRGB(24,49,45)
    chip.TextColor3=on and Color3.fromRGB(255,240,197) or Color3.fromRGB(191,215,198)
  end
end
for pageIndex,names in pairs({[3]={"전체","메인","서브","현상금","도움말"},[6]={"지역","도감","파티·야영","수수께끼","이야기"}})do
  local bar=Instance.new("Frame")
  bar.Name="SectionChips";bar.LayoutOrder=0;bar.BackgroundTransparency=1;bar.Size=UDim2.new(1,-8,0,38);bar.Parent=meadowPages[pageIndex]
  local chipLayout=Instance.new("UIListLayout")
  chipLayout.FillDirection=Enum.FillDirection.Horizontal;chipLayout.Padding=UDim.new(0,6);chipLayout.Parent=bar
  local info={selected=1,chips={}}
  meadowArt.sections[pageIndex]=info
  for i,name in ipairs(names)do
    local chip=Instance.new("TextButton")
    chip.Size=UDim2.new(1/#names,-6,1,0);chip.Text=name;chip.Font=Enum.Font.GothamBold;chip.TextSize=13
    chip.BorderSizePixel=0;chip.AutoButtonColor=true;chip.Parent=bar
    local cc=Instance.new("UICorner");cc.CornerRadius=UDim.new(0,10);cc.Parent=chip
    local cs=Instance.new("UIStroke");cs.Color=Color3.fromRGB(218,189,126);cs.Transparency=.4;cs.Parent=chip
    chip.Activated:Connect(function()
      info.selected=i;meadowArt.applySection(pageIndex)
      meadowPages[pageIndex].CanvasPosition=Vector2.new(0,0)
    end)
    info.chips[i]=chip
  end
  meadowLabels[pageIndex].LayoutOrder=1
end
local meadowJournal={}
local meadowHelperButtons={}
-- [캐릭터창] 메뉴 생성과 전투 렌더에 필요한 외부 변수만 유지한다.
-- [마력숲 UI] 탐험 수첩 공통 색채
local meadowGold=Color3.fromRGB(218,189,126)
local meadowParchment=Color3.fromRGB(239,245,225)
local renderWitcherCharacter=(function()
local meadowDim=Color3.fromRGB(169,195,178)
local characterHero=Instance.new("Frame")
characterHero.Name="WitcherCharacterPortrait";characterHero.LayoutOrder=1
characterHero.Size=UDim2.new(1,-8,0,248)
characterHero.BackgroundColor3=Color3.fromRGB(20,47,45)
characterHero.BorderSizePixel=0;characterHero.Parent=meadowPages[1]
local heroCorner=Instance.new("UICorner")
heroCorner.CornerRadius=UDim.new(0,14);heroCorner.Parent=characterHero
local heroGradient=Instance.new("UIGradient")
heroGradient.Rotation=24
heroGradient.Color=ColorSequence.new(Color3.fromRGB(39,81,65),Color3.fromRGB(12,28,37))
heroGradient.Parent=characterHero
local characterHeroOutline=Instance.new("UIStroke")
characterHeroOutline.Color=meadowGold;characterHeroOutline.Thickness=1.4
characterHeroOutline.Transparency=.25;characterHeroOutline.Parent=characterHero
local characterPortrait=Instance.new("ImageLabel")
characterPortrait.Name="PlayerPortrait"
characterPortrait.Size=UDim2.fromOffset(126,142);characterPortrait.Position=UDim2.fromOffset(8,8)
characterPortrait.BackgroundColor3=Color3.fromRGB(15,37,37);characterPortrait.BorderSizePixel=0
local portraitCorner=Instance.new("UICorner")
portraitCorner.CornerRadius=UDim.new(0,9);portraitCorner.Parent=characterPortrait
local portraitBorder=Instance.new("UIStroke")
portraitBorder.Color=Color3.fromRGB(105,160,130)
portraitBorder.Transparency=.4;portraitBorder.Parent=characterPortrait
characterPortrait.ScaleType=Enum.ScaleType.Fit
characterPortrait.Image=meadowAvatar.Image;characterPortrait.Parent=characterHero
task.spawn(function()
  local ok,image=pcall(function()
    return Players:GetUserThumbnailAsync(player.UserId,Enum.ThumbnailType.AvatarThumbnail,Enum.ThumbnailSize.Size420x420)
  end)
  if ok and typeof(image)=="string" and characterPortrait.Parent then characterPortrait.Image=image end
end)
-- [캐릭터창 3D] 사용자 실제 Roblox 아바타/기존 Tool을 월드 모델로 미리보기.
-- 외부 등록이 없는 게임 방어구를 가짜 메시로 표시하지 않는다. 오른쪽 HUD와 무관하다.
local characterViewport=Instance.new("ViewportFrame")
characterViewport.Name="NativeAvatarPreview";characterViewport.BackgroundTransparency=1
characterViewport.Ambient=Color3.fromRGB(190,176,158)
characterViewport.LightColor=Color3.fromRGB(255,229,194)
characterViewport.LightDirection=Vector3.new(-.8,-1,-.5)
characterViewport.Size=characterPortrait.Size;characterViewport.Position=characterPortrait.Position
characterViewport.Visible=false;characterViewport.Parent=characterHero
local previewWorld=Instance.new("WorldModel")
previewWorld.Name="AvatarWorld";previewWorld.Parent=characterViewport
local previewCamera=Instance.new("Camera")
previewCamera.Name="AvatarCamera";previewCamera.FieldOfView=38
previewCamera.Parent=characterViewport;characterViewport.CurrentCamera=previewCamera
local lastPreviewCharacter,lastPreviewTool,lastPreviewGearRevision=nil,nil,nil
do
  local hint=Instance.new("TextLabel")
  hint.Name="RotateHint";hint.BackgroundTransparency=1;hint.AnchorPoint=Vector2.new(1,1)
  hint.Position=UDim2.new(1,-6,1,-4);hint.Size=UDim2.fromOffset(150,16)
  hint.Font=Enum.Font.GothamMedium;hint.TextSize=11;hint.TextColor3=Color3.fromRGB(190,184,170)
  hint.TextXAlignment=Enum.TextXAlignment.Right;hint.Text="끌어서 회전";hint.ZIndex=5;hint.Parent=characterViewport
end
-- [자유 회전] 아바타를 손가락/마우스로 끌어 앞·옆·뒤(망토)를 자유롭게 본다. 기본은 앞모습.
local previewYaw,previewPitch,previewFocus,previewDistance=math.rad(25),0.08,Vector3.zero,10
local function placePreviewCamera()
  local cp=math.cos(previewPitch)
  local offset=Vector3.new(math.sin(previewYaw)*cp,math.sin(previewPitch),-math.cos(previewYaw)*cp)*previewDistance
  previewCamera.CFrame=CFrame.lookAt(previewFocus+offset,previewFocus)
end
do
  local dragInput,lastPos=nil,nil
  characterViewport.Active=true
  characterViewport.InputBegan:Connect(function(input)
    if input.UserInputType==Enum.UserInputType.MouseButton1 or input.UserInputType==Enum.UserInputType.Touch then
      dragInput=input;lastPos=input.Position
    end
  end)
  UserInputService.InputChanged:Connect(function(input)
    if not dragInput then return end
    if input==dragInput or (dragInput.UserInputType==Enum.UserInputType.MouseButton1 and input.UserInputType==Enum.UserInputType.MouseMovement) then
      local delta=input.Position-lastPos;lastPos=input.Position
      previewYaw=previewYaw-delta.X*.012
      previewPitch=math.clamp(previewPitch+delta.Y*.006,-.35,.6)
      placePreviewCamera()
    end
  end)
  UserInputService.InputEnded:Connect(function(input)
    if input==dragInput then dragInput=nil end
  end)
end
local function redrawNativeAvatar(character,tool,force)
  local gearRevision=player:GetAttribute("MeadowGearRevision") or 0
  if not force and character==lastPreviewCharacter and tool==lastPreviewTool
    and gearRevision==lastPreviewGearRevision then return end
  lastPreviewCharacter,lastPreviewTool,lastPreviewGearRevision=character,tool,gearRevision
  previewWorld:ClearAllChildren()
  characterViewport.Visible=false
  characterPortrait.Visible=true
  if not character or not character.Parent then return end
  local originalArchivable=character.Archivable
  character.Archivable=true
  local ok,clone=pcall(function()return character:Clone()end)
  character.Archivable=originalArchivable
  if not ok or not clone or not clone:IsA("Model") then return end
  for _,part in ipairs(clone:GetDescendants())do
    if part:IsA("Script") or part:IsA("LocalScript") or part:IsA("ModuleScript") then
      part:Destroy()
    elseif part:IsA("BasePart") then
      part.Anchored=true;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false
    elseif part:IsA("ParticleEmitter") or part:IsA("Trail") then
      part.Enabled=false
    end
  end
  clone.Parent=previewWorld
  clone:PivotTo(CFrame.new(0,0,0))
  local bounds,size=clone:GetBoundingBox()
  if size.Magnitude<.1 then clone:Destroy();return end
  local focus=bounds.Position+Vector3.new(0,size.Y*.04,0)
  -- [실제 아바타] 뷰포트 종횡비와 시야각으로 카메라를 맞춰 머리·발 잘림을 막는다.
  local aspect=math.max(.55,characterViewport.AbsoluteSize.X/math.max(1,characterViewport.AbsoluteSize.Y))
  local halfFov=math.tan(math.rad(previewCamera.FieldOfView*.5))
  local distance=math.max(size.Y/(2*halfFov),size.X/(2*halfFov*aspect),size.Z*1.8,5)*1.35
  previewFocus,previewDistance=focus,distance
  placePreviewCamera()
  characterPortrait.Visible=false
  characterViewport.Visible=true
end
local characterHeroName=Instance.new("TextLabel")
characterHeroName.Name="HeroName";characterHeroName.Position=UDim2.fromOffset(144,14)
characterHeroName.Size=UDim2.new(1,-156,0,35)
characterHeroName.BackgroundTransparency=1;characterHeroName.Font=Enum.Font.GothamBlack;characterHeroName.TextSize=22
characterHeroName.TextColor3=meadowParchment;characterHeroName.TextXAlignment=Enum.TextXAlignment.Left
characterHeroName.TextTruncate=Enum.TextTruncate.AtEnd;characterHeroName.Parent=characterHero
local characterHeroSummary=Instance.new("TextLabel")
characterHeroSummary.Name="HeroStatus";characterHeroSummary.Position=UDim2.fromOffset(144,50)
characterHeroSummary.Size=UDim2.new(1,-154,0,92)
characterHeroSummary.BackgroundTransparency=1;characterHeroSummary.Font=Enum.Font.GothamMedium;characterHeroSummary.TextSize=13
characterHeroSummary.TextColor3=meadowDim;characterHeroSummary.TextWrapped=true
characterHeroSummary.TextXAlignment=Enum.TextXAlignment.Left
characterHeroSummary.TextYAlignment=Enum.TextYAlignment.Top;characterHeroSummary.Visible=false;characterHeroSummary.Parent=characterHero
-- [능력치 카드] 흩어진 글자 대신 색 있는 4개 카드로 공격·방어·강화·보스를 보여 준다.
local heroChips=Instance.new("Frame")
heroChips.Name="HeroStatChips";heroChips.BackgroundTransparency=1;heroChips.Parent=characterHero
local heroChipGrid=Instance.new("UIGridLayout")
heroChipGrid.SortOrder=Enum.SortOrder.LayoutOrder;heroChipGrid.CellPadding=UDim2.fromOffset(6,6);heroChipGrid.Parent=heroChips
local heroChipValues={}
for order,spec in ipairs({{"공격",Color3.fromRGB(176,74,64)},{"방어",Color3.fromRGB(62,122,170)},
  {"무기 강화",Color3.fromRGB(190,146,52)},{"보스",Color3.fromRGB(120,84,160)}}) do
  local chip=Instance.new("Frame")
  chip.Name="StatChip"..order;chip.LayoutOrder=order;chip.BackgroundColor3=spec[2];chip.BorderSizePixel=0;chip.Parent=heroChips
  local chipCorner=Instance.new("UICorner");chipCorner.CornerRadius=UDim.new(0,9);chipCorner.Parent=chip
  local chipEdge=Instance.new("UIStroke");chipEdge.Color=Color3.fromRGB(255,236,190);chipEdge.Transparency=.55;chipEdge.Thickness=1.5;chipEdge.Parent=chip
  local chipShade=Instance.new("UIGradient");chipShade.Rotation=90
  chipShade.Color=ColorSequence.new(Color3.fromRGB(255,255,255),Color3.fromRGB(120,120,120));chipShade.Parent=chip
  local chipName=Instance.new("TextLabel")
  chipName.BackgroundTransparency=1;chipName.Position=UDim2.fromOffset(8,3);chipName.Size=UDim2.new(1,-16,0,16)
  chipName.Font=Enum.Font.GothamBold;chipName.TextSize=12;chipName.Text=spec[1]
  chipName.TextColor3=Color3.fromRGB(255,244,222);chipName.TextXAlignment=Enum.TextXAlignment.Left;chipName.Parent=chip
  local chipValue=Instance.new("TextLabel")
  chipValue.BackgroundTransparency=1;chipValue.Position=UDim2.fromOffset(8,19);chipValue.Size=UDim2.new(1,-16,0,22)
  chipValue.Font=Enum.Font.GothamBlack;chipValue.TextSize=18;chipValue.Text="0"
  chipValue.TextColor3=Color3.new(1,1,1);chipValue.TextXAlignment=Enum.TextXAlignment.Left;chipValue.Parent=chip
  local chipInk=Instance.new("UIStroke");chipInk.Color=Color3.new(0,0,0);chipInk.Thickness=1;chipInk.Transparency=.4
  chipInk.ApplyStrokeMode=Enum.ApplyStrokeMode.Contextual;chipInk.Parent=chipValue
  heroChipValues[order]=chipValue
end
-- [실제 능력치] 생명력과 기력은 서버/휴머노이드 값만 읽는다.
local heroHealth=Instance.new("Frame")
heroHealth.Name="CharacterHealthTrack";heroHealth.BackgroundColor3=Color3.fromRGB(44,62,57)
heroHealth.BorderSizePixel=0;heroHealth.ClipsDescendants=true;heroHealth.Parent=characterHero
local healthCorner=Instance.new("UICorner")
healthCorner.CornerRadius=UDim.new(0,8);healthCorner.Parent=heroHealth
local heroHealthFill=Instance.new("Frame")
heroHealthFill.Name="Fill";heroHealthFill.BackgroundColor3=Color3.fromRGB(171,75,68)
heroHealthFill.BorderSizePixel=0;heroHealthFill.Size=UDim2.fromScale(1,1);heroHealthFill.Parent=heroHealth
local heroHealthText=Instance.new("TextLabel")
heroHealthText.Name="HealthReadout";heroHealthText.BackgroundTransparency=1;heroHealthText.Size=UDim2.fromScale(1,1)
heroHealthText.Font=Enum.Font.GothamBold;heroHealthText.TextSize=13
heroHealthText.TextColor3=Color3.fromRGB(255,246,231);heroHealthText.ZIndex=45;heroHealthText.Parent=heroHealth
local heroStamina=Instance.new("Frame")
heroStamina.Name="CharacterStaminaTrack";heroStamina.BackgroundColor3=Color3.fromRGB(34,63,67)
heroStamina.BorderSizePixel=0;heroStamina.ClipsDescendants=true;heroStamina.Parent=characterHero
local staminaCorner=Instance.new("UICorner")
staminaCorner.CornerRadius=UDim.new(0,8);staminaCorner.Parent=heroStamina
local heroStaminaFill=Instance.new("Frame")
heroStaminaFill.Name="Fill";heroStaminaFill.BackgroundColor3=Color3.fromRGB(53,154,188)
heroStaminaFill.BorderSizePixel=0;heroStaminaFill.Size=UDim2.fromScale(1,1);heroStaminaFill.Parent=heroStamina
local heroStaminaText=Instance.new("TextLabel")
heroStaminaText.Name="StaminaReadout";heroStaminaText.BackgroundTransparency=1;heroStaminaText.Size=UDim2.fromScale(1,1)
heroStaminaText.Font=Enum.Font.GothamBold;heroStaminaText.TextSize=13
heroStaminaText.TextColor3=Color3.fromRGB(255,246,231);heroStaminaText.ZIndex=45;heroStaminaText.Parent=heroStamina
-- [아바타 둘레 장비칸] 아바타 좌우에 장비 6칸(왼쪽 무기·장갑·흉갑 / 오른쪽 바지·장화·장신구)을 둔다.
local heroSlots={}
for order,spec in ipairs({{"무기",2},{"장갑",3},{"흉갑",3},{"바지",3},{"장화",3},{"장신구",6}}) do
  local frame=Instance.new("Frame")
  frame.Name="HeroEquipSlot"..order;frame.BackgroundColor3=Color3.fromRGB(30,62,56);frame.BorderSizePixel=0;frame.Parent=characterHero
  local frameCorner=Instance.new("UICorner");frameCorner.CornerRadius=UDim.new(0,10);frameCorner.Parent=frame
  local frameEdge=Instance.new("UIStroke");frameEdge.Thickness=2;frameEdge.Color=Color3.fromRGB(88,120,104);frameEdge.Parent=frame
  local frameIcon=Instance.new("ImageLabel")
  frameIcon.Name="SlotIcon";frameIcon.BackgroundTransparency=1;frameIcon.AnchorPoint=Vector2.new(.5,0)
  frameIcon.Position=UDim2.new(.5,0,0,4);frameIcon.Size=UDim2.fromOffset(34,34)
  frameIcon.Image=meadowIconAtlas;frameIcon.ImageRectOffset=Vector2.new(spec[2]*64,0);frameIcon.ImageRectSize=Vector2.new(64,64)
  frameIcon.ImageTransparency=.5;frameIcon.Parent=frame
  local frameName=Instance.new("TextLabel")
  frameName.Name="SlotCaption";frameName.BackgroundTransparency=1;frameName.AnchorPoint=Vector2.new(.5,1)
  frameName.Position=UDim2.new(.5,0,1,-3);frameName.Size=UDim2.new(1,-4,0,16);frameName.Text=spec[1]
  frameName.Font=Enum.Font.GothamBold;frameName.TextSize=11;frameName.TextColor3=Color3.fromRGB(190,205,196);frameName.Parent=frame
  frameName.TextTruncate=Enum.TextTruncate.AtEnd
  heroSlots[order]={frame=frame,icon=frameIcon,edge=frameEdge,name=frameName,default=spec[1]}
end
-- [모바일 전신·계기판] 장비 좌우 + 가운데 아바타, 아래에 이름·체력·기력·능력치 카드.
local function layoutNativeAvatar()
  local width=characterHero.AbsoluteSize.X
  if width<=0 then return end
  local slot=width<360 and 52 or 60
  local gap=math.floor((192-slot*3)/2)
  local avatarWidth=math.clamp(width-slot*2-36,110,260)
  characterHero.Size=UDim2.new(1,-8,0,250)
  characterPortrait.Size=UDim2.fromOffset(avatarWidth,192)
  characterPortrait.Position=UDim2.fromOffset(math.floor((width-avatarWidth)/2),10)
  characterViewport.Size=characterPortrait.Size
  characterViewport.Position=characterPortrait.Position
  for order,entry in ipairs(heroSlots) do
    local column=order<=3 and 0 or 1
    local row=(order-1)%3
    entry.frame.Size=UDim2.fromOffset(slot,slot)
    entry.frame.Position=UDim2.fromOffset(column==0 and 8 or width-8-slot,10+row*(slot+gap))
  end
  characterHeroName.Position=UDim2.fromOffset(12,208)
  characterHeroName.Size=UDim2.new(1,-24,0,28)
  characterHeroName.TextXAlignment=Enum.TextXAlignment.Center
  -- [오딧세이식 간결 캐릭터창] 체력·기력 바와 공격/방어/무기강화/보스 카드는 제거(HUD에서 항상 보인다).
  heroHealth.Visible=false;heroStamina.Visible=false;heroChips.Visible=false
  local chipWidth=math.floor((heroChips.AbsoluteSize.X-18)/4)
  heroChipGrid.CellSize=UDim2.fromOffset(math.max(40,chipWidth),46)
end
characterHero:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutNativeAvatar)
characterViewport:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
  if lastPreviewCharacter and lastPreviewCharacter.Parent then
    redrawNativeAvatar(lastPreviewCharacter,lastPreviewTool,true)
  end
end)
task.defer(layoutNativeAvatar)
local equipmentHeading=Instance.new("TextLabel")
equipmentHeading.Name="EquipmentHeading";equipmentHeading.LayoutOrder=2
equipmentHeading.Size=UDim2.new(1,-8,0,30);equipmentHeading.BackgroundTransparency=1
equipmentHeading.Font=Enum.Font.GothamBold;equipmentHeading.TextSize=17
equipmentHeading.Text="장착 장비  ·  6개 슬롯";equipmentHeading.TextColor3=meadowGold
equipmentHeading.TextXAlignment=Enum.TextXAlignment.Left;equipmentHeading.Parent=meadowPages[1]
equipmentHeading.Visible=false -- 아바타 좌우 슬롯과 중복
-- [캐릭터 장비] 기존 여섯 슬롯을 게임 화면 폭에 따라 배치한다. 실제 장착/능력치는 서버 값을 유지한다.
local equipmentGrid=Instance.new("Frame")
equipmentGrid.Name="WitcherEquipmentGrid";equipmentGrid.LayoutOrder=3
equipmentGrid.Size=UDim2.new(1,-8,0,448);equipmentGrid.BackgroundTransparency=1
equipmentGrid.Parent=meadowPages[1]
equipmentGrid.Visible=false -- 아바타 좌우 슬롯과 중복
local equipmentLayout=Instance.new("UIGridLayout")
equipmentLayout.SortOrder=Enum.SortOrder.LayoutOrder
equipmentLayout.CellPadding=UDim2.fromOffset(8,8);equipmentLayout.Parent=equipmentGrid
local function layoutEquipment()
  local width=equipmentGrid.AbsoluteSize.X
  if width<=0 then return end
  local columns=width>=630 and 3 or width>=340 and 2 or 1
  local rows=math.ceil(6/columns)
  equipmentLayout.CellSize=UDim2.fromOffset(math.floor((width-(columns-1)*8)/columns),68)
  equipmentGrid.Size=UDim2.new(1,-8,0,rows*68+(rows-1)*8)
end
equipmentGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutEquipment)
task.defer(layoutEquipment)
local function characterEquipmentSlot(label,order,iconCell)
  local slot=Instance.new("Frame")
  slot.Name="EquipmentSlot"..order;slot.LayoutOrder=order
  slot.Size=UDim2.new(1,-8,0,60);slot.BackgroundColor3=Color3.fromRGB(30,62,56)
  slot.BorderSizePixel=0;slot.Parent=equipmentGrid
   local rounded=Instance.new("UICorner");rounded.CornerRadius=UDim.new(0,9);rounded.Parent=slot
  local border=Instance.new("UIStroke");border.Color=Color3.fromRGB(112,158,121)
  border.Transparency=.1;border.Thickness=2;border.Parent=slot
  local icon=Instance.new("ImageLabel")
  icon.Name="EquipmentIcon";icon.Position=UDim2.fromOffset(8,7);icon.Size=UDim2.fromOffset(44,44)
  icon.BackgroundTransparency=1;icon.Image=meadowIconAtlas
  icon.ImageRectOffset=Vector2.new(iconCell*64,0);icon.ImageRectSize=Vector2.new(64,64);icon.Parent=slot
  local caption=Instance.new("TextLabel")
  caption.Name="SlotName";caption.Position=UDim2.fromOffset(62,5);caption.Size=UDim2.new(1,-70,0,21)
  caption.BackgroundTransparency=1;caption.TextColor3=meadowGold;caption.Font=Enum.Font.GothamMedium
  caption.TextSize=12;caption.Text=label;caption.TextXAlignment=Enum.TextXAlignment.Left;caption.Parent=slot
  local value=Instance.new("TextLabel")
  value.Name="SlotValue";value.Position=UDim2.fromOffset(62,26);value.Size=UDim2.new(1,-70,0,28)
  value.BackgroundTransparency=1;value.TextColor3=meadowParchment;value.Font=Enum.Font.GothamBold
  value.TextSize=15;value.TextXAlignment=Enum.TextXAlignment.Left
  value.TextTruncate=Enum.TextTruncate.AtEnd;value.Parent=slot
  return value
end
local equippedWeapon=characterEquipmentSlot("주 무기",3,2)
local equippedSecondary=characterEquipmentSlot("장갑",4,3)
local equippedArmor=characterEquipmentSlot("흉갑",5,3)
local equippedLegs=characterEquipmentSlot("바지",6,3)
local equippedFeet=characterEquipmentSlot("장화",7,3)
local equippedAccessory=characterEquipmentSlot("장신구",8,6)
local masteryHeading=Instance.new("TextLabel")
masteryHeading.Name="MasteryHeading";masteryHeading.LayoutOrder=4
masteryHeading.Size=UDim2.new(1,-8,0,30);masteryHeading.BackgroundTransparency=1
masteryHeading.Font=Enum.Font.GothamBold;masteryHeading.TextSize=17
masteryHeading.Text="성장 기록  ·  숙련도";masteryHeading.TextColor3=meadowGold
masteryHeading.TextXAlignment=Enum.TextXAlignment.Left;masteryHeading.Parent=meadowPages[1]
-- [숙련 진행도] 기존 50 숙련도당 기술 점수 1점 규칙을 표시만 한다.
local masteryTrack=Instance.new("Frame")
masteryTrack.Name="CombatMasteryTrack";masteryTrack.LayoutOrder=5
masteryTrack.Size=UDim2.new(1,-8,0,48);masteryTrack.BackgroundColor3=Color3.fromRGB(35,34,38)
masteryTrack.BorderSizePixel=0;masteryTrack.Parent=meadowPages[1]
local trackCorner=Instance.new("UICorner");trackCorner.CornerRadius=UDim.new(0,9);trackCorner.Parent=masteryTrack
local masteryProgressLabel=Instance.new("TextLabel")
masteryProgressLabel.Name="CombatMasteryNextPoint";masteryProgressLabel.Position=UDim2.fromOffset(10,5)
masteryProgressLabel.Size=UDim2.new(1,-20,0,22);masteryProgressLabel.BackgroundTransparency=1
masteryProgressLabel.Font=Enum.Font.GothamBold;masteryProgressLabel.TextSize=13
masteryProgressLabel.TextXAlignment=Enum.TextXAlignment.Left;masteryProgressLabel.TextColor3=meadowParchment
masteryProgressLabel.Parent=masteryTrack
local masteryProgressBackground=Instance.new("Frame")
masteryProgressBackground.Name="MasteryProgressBackground";masteryProgressBackground.Position=UDim2.fromOffset(10,31)
masteryProgressBackground.Size=UDim2.new(1,-20,0,7);masteryProgressBackground.BorderSizePixel=0
masteryProgressBackground.BackgroundColor3=Color3.fromRGB(70,63,56);masteryProgressBackground.Parent=masteryTrack
local masteryProgressFill=Instance.new("Frame")
masteryProgressFill.Name="MasteryProgressFill";masteryProgressFill.Size=UDim2.fromScale(0,1)
masteryProgressFill.BackgroundColor3=meadowGold;masteryProgressFill.BorderSizePixel=0;masteryProgressFill.Parent=masteryProgressBackground
-- [7가지 숙련] 긴 숫자 목록을 실제 서버 수치가 보이는 개별 성장 카드로 전환한다.
local proficiencyGrid=Instance.new("Frame")
proficiencyGrid.Name="MeadowProficiencyCards";proficiencyGrid.LayoutOrder=6
proficiencyGrid.Size=UDim2.new(1,-8,0,190);proficiencyGrid.BackgroundTransparency=1
proficiencyGrid.Parent=meadowPages[1]
local proficiencyLayout=Instance.new("UIGridLayout")
proficiencyLayout.SortOrder=Enum.SortOrder.LayoutOrder;proficiencyLayout.CellPadding=UDim2.fromOffset(8,8)
proficiencyLayout.Parent=proficiencyGrid
local proficiencyValues={}
for index,entry in ipairs(Config.Proficiencies or {}) do
  local card=Instance.new("Frame")
  card.Name="Proficiency_"..entry.Key;card.LayoutOrder=index
  card.BackgroundColor3=Color3.fromRGB(23,49,45);card.BorderSizePixel=0;card.Parent=proficiencyGrid
  local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,9);corner.Parent=card
  local edge=Instance.new("UIStroke");edge.Color=Color3.fromRGB(88,132,103)
  edge.Transparency=.45;edge.Parent=card
  local caption=Instance.new("TextLabel")
  caption.Name="ProficiencyName";caption.Position=UDim2.fromOffset(11,0)
  caption.Size=UDim2.new(1,-82,1,0);caption.BackgroundTransparency=1
  caption.Text=entry.Name;caption.Font=Enum.Font.GothamMedium;caption.TextSize=13
  caption.TextColor3=Color3.fromRGB(200,222,204)
  caption.TextXAlignment=Enum.TextXAlignment.Left;caption.Parent=card
  local amount=Instance.new("TextLabel")
  amount.Name="ProficiencyValue";amount.AnchorPoint=Vector2.new(1,0)
  amount.Position=UDim2.new(1,-11,0,0);amount.Size=UDim2.fromOffset(67,44)
  amount.BackgroundTransparency=1;amount.Font=Enum.Font.GothamBold;amount.TextSize=17
  amount.TextColor3=meadowGold;amount.TextXAlignment=Enum.TextXAlignment.Right
  amount.Parent=card;proficiencyValues[entry.Key]=amount
end
local function layoutProficiencies()
  local width=proficiencyGrid.AbsoluteSize.X
  if width<=0 then return end
  local columns=width>=650 and 3 or width>=280 and 2 or 1
  local rows=math.ceil(#(Config.Proficiencies or {})/columns)
  proficiencyLayout.CellSize=UDim2.fromOffset(math.floor((width-(columns-1)*8)/columns),44)
  proficiencyGrid.Size=UDim2.new(1,-8,0,rows*44+math.max(0,rows-1)*8)
end
proficiencyGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutProficiencies)
task.defer(layoutProficiencies)
meadowLabels[1].LayoutOrder=7
meadowLabels[1].TextColor3=meadowDim
meadowLabels[1].TextSize=12
return function(character,humanoid,tool,force)
  -- [실제 착용 외형] 장비 수정, 아바타 외형 로딩 및 장착 도구 교체 시에만 복제한다.
  redrawNativeAvatar(character,tool,force)
  local combatMastery=math.floor(math.max(0,tonumber(player:GetAttribute("CombatProficiency")) or 0))
  local earnedPoints,pointProgress,pointCost=Config.TalentPointProgress(combatMastery)
  masteryProgressLabel.Text=pointCost>0 and string.format("전투 숙련 %d  ·  기술 점수 %d개  ·  다음까지 %d",combatMastery,earnedPoints,pointCost-pointProgress)
    or string.format("전투 숙련 %d  ·  기술 점수 최대(%d개)",combatMastery,earnedPoints)
  masteryProgressFill.Size=UDim2.fromScale(pointCost>0 and pointProgress/pointCost or 1,1)
  -- [숙련 카드] 이 렌더 함수가 소유하는 카드 값만 업데이트한다.
  for _,entry in ipairs(Config.Proficiencies or {}) do
    local value=proficiencyValues[entry.Key]
    if value then value.Text=tostring(math.floor(player:GetAttribute(entry.Key) or 0)) end
  end
  characterHeroName.Text=player.DisplayName
  local health=humanoid and humanoid.Health or 0
  local maximum=humanoid and humanoid.MaxHealth or 100
  local stamina=tonumber(player:GetAttribute("MeadowStamina")) or 0
  heroHealthFill.Size=UDim2.fromScale(math.clamp(health/math.max(1,maximum),0,1),1)
  heroStaminaFill.Size=UDim2.fromScale(math.clamp(stamina/100,0,1),1)
  heroHealthText.Text=string.format("체력  %d / %d",health,maximum)
  heroStaminaText.Text=string.format("기력  %d / 100",stamina)
  heroChipValues[1].Text="+"..tostring(player:GetAttribute("MeadowGearAttack") or 0)
  heroChipValues[2].Text="+"..tostring(player:GetAttribute("MeadowGearDefense") or 0)
  heroChipValues[3].Text="+"..tostring(player:GetAttribute("WeaponTier") or 0)
  heroChipValues[4].Text=tostring(player:GetAttribute("Bosses") or 0)
  local catalog=Config.MeadowEquipment or {}
  local function equippedName(slot)
    local index=player:GetAttribute("MeadowEquip"..slot)
    local item=typeof(index)=="number" and catalog[index] or nil
    return item and item.Name or "비어 있음"
  end
  equippedWeapon.Text=equippedName("Weapon")..(tool and (" · "..tool.Name) or "")
  equippedSecondary.Text=equippedName("Hands")
  equippedArmor.Text=equippedName("Chest")
  equippedLegs.Text=equippedName("Legs")
  equippedFeet.Text=equippedName("Feet")
  equippedAccessory.Text=equippedName("Accessory")
  for order,label in ipairs({equippedWeapon,equippedSecondary,equippedArmor,equippedLegs,equippedFeet,equippedAccessory}) do
    local heroSlot=heroSlots[order]
    if heroSlot then
      local have=not string.find(label.Text,"비어 있음",1,true)
      heroSlot.icon.ImageTransparency=have and 0 or .6
      local slotKey=({"Weapon","Hands","Chest","Legs","Feet","Accessory"})[order]
      local equippedIndex=player:GetAttribute("MeadowEquip"..slotKey)
      local gear=have and typeof(equippedIndex)=="number" and catalog[equippedIndex] or nil
      meadowArt.gear(heroSlot.icon,have and typeof(equippedIndex)=="number" and equippedIndex-1 or meadowArt.slotEmpty[slotKey])
      if not heroSlot.icon3D then heroSlot.icon3D=meadowArt.new3D(heroSlot.icon) end
      local previewItem=gear and {gear=gear} or nil
      meadowArt.set3D(heroSlot.icon3D,meadowArt.itemKeyFor(previewItem),meadowArt.itemTintFor(previewItem))
      heroSlot.edge.Color=have and meadowGold or Color3.fromRGB(88,120,104)
      heroSlot.name.Text=have and (string.gsub(label.Text," · .*$","")) or heroSlot.default
    end
    local filled=not string.find(label.Text,"비어 있음",1,true)
    local edge=label.Parent:FindFirstChildOfClass("UIStroke")
    if edge then edge.Color=filled and meadowGold or Color3.fromRGB(88,120,104) end
    label.TextColor3=filled and meadowParchment or Color3.fromRGB(140,160,150)
  end
end
end)()
local previewNeedsRefresh=false
local function renderMeadowPages()
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local tool=character and character:FindFirstChildOfClass("Tool")
  -- [캐릭터 숙련도] 이전 전투 숙련도 값을 유지하고 일곱 분야를 독립 표시한다.
  -- 사냥은 실제 늑대·박쥐 처치, 채집은 실제 수확, 제작은 장비 강화 성공에서만 증가한다.
  renderWitcherCharacter(character,humanoid,tool,previewNeedsRefresh)
  previewNeedsRefresh=false
  -- [망토 상태] 서버가 실제 장착에 성공했는지 캐릭터창에서 바로 확인한다.
  local capeState=character and character:GetAttribute("OpeningCapeState") or nil
  local capeWorn=character and character:FindFirstChild("MeadowWornCrimsonCape")
  local capeText=capeState=="ATTACHED" and capeWorn and "빨간 망토 착용 중"
    or capeState=="LOADING" and "빨간 망토 불러오는 중"
    or capeState=="RETRYING" and "빨간 망토 연결 재시도 중"
    or capeState=="TORSO_MISSING" and "망토 장착 불가 · 몸통 없음"
    or capeState=="REGISTERED_OWNER_MESH_MISSING" and "망토 원본 등록 확인 필요"
    or capeState=="LOAD_FAILED" and "망토 로딩 실패 · 다시 입장해 줘"
    or "빨간 망토 장착 확인 중"
  meadowLabels[1].Text="※ 요리·건축·연금술은 실제 제작 기능이 연결된 경우에만 성장해.\n"..capeText
  -- [망토 표시] 아바타 위에 망토 상태를 바로 보여 준다(실패하면 이유도).
  do
    local hero=meadowPages[1]:FindFirstChild("WitcherCharacterPortrait")
    if hero then
      local badge=hero:FindFirstChild("CapeBadge")
      if not badge then
        badge=Instance.new("TextLabel");badge.Name="CapeBadge";badge.AnchorPoint=Vector2.new(.5,0);badge.Position=UDim2.new(.5,0,0,2)
        badge.Size=UDim2.fromOffset(220,18);badge.BackgroundTransparency=1;badge.Font=Enum.Font.GothamBold;badge.TextSize=12
        badge.ZIndex=30;badge.Parent=hero
      end
      local worn=capeState=="ATTACHED" and capeWorn
      local reason=character and character:GetAttribute("OpeningCapeReason")
      badge.Text=worn and "망토 착용 중" or ("망토 "..(capeText:gsub("^빨간 망토 ",""))..(reason and (" · "..reason) or ""))
      badge.TextColor3=worn and Color3.fromRGB(150,255,170) or Color3.fromRGB(255,190,150)
    end
  end
  meadowLabels[2].Text="소지품  /  저장 "..tostring(player:GetAttribute("SaveStatus") or "불러오는 중")
  meadowLabels[2].Visible=false -- [가방 공간] 저장 상태 줄은 화면을 차지하지 않게 숨긴다(오류는 HUD 상태로 표시).
  meadowLabels[3].Text=string.format("초원 탐험 저널\n\n현재 지역 몬스터  %d\n\n%s\n\n관찰 기록은 이번 접속 중 발견한 단서야.",
    player:GetAttribute("AliveEnemies") or 0,
    #meadowJournal>0 and table.concat(meadowJournal,"\n\n") or "주변 동물과 숲의 조사 지점을 살펴봐. 발견한 단서가 여기에 기록돼.")
  local groveMask=math.clamp(player:GetAttribute("ExplorationGroves") or 0,0,15)
  local explored=0
  for sector=0,3 do if bit32.band(groveMask,bit32.lshift(1,sector))~=0 then explored+=1 end end
  meadowLabels[3].Text..=string.format("\n\n숲 가장자리 발견  %d / 4\n새벽 흔적  %s\n밤의 숲 기록  %s",explored,
    (player:GetAttribute("DawnTraceFound") or 0)>0 and "발견" or "미발견",
    (player:GetAttribute("NightTraceFound") or 0)>0 and "발견" or "미발견")
  local ruinsMask=math.clamp(player:GetAttribute("RuinsDiscovered") or 0,0,7)
  local ruinsCount=0
  for index=0,2 do if bit32.band(ruinsMask,bit32.lshift(1,index))~=0 then ruinsCount+=1 end end
  meadowLabels[3].Text..=string.format("\n유적 조사  %d / 3",ruinsCount)
  local tier=player:GetAttribute("WeaponTier") or 0
  local cost=2+tier
  local ready=player:GetAttribute("ProfileReady")==true
  local save=player:GetAttribute("SaveStatus")
  local quest=Config.MainQuests and Config.MainQuests[player:GetAttribute("QuestStage") or 1]
  local suggestion=not ready and "프로필을 불러오고 있어. 잠시 기다려 줘."
    or save=="SESSION_ONLY" and "이번 접속은 임시 플레이야. 진행이 저장되지 않으니 재접속 후 상태를 확인해."
    or save=="SAVE_FAILED" and "저장에 실패했어. 기존 저장은 보호 중이야."
    or player:GetAttribute("RunActive")~=true and "생존 시작을 눌러 초원 전투를 시작해."
    or tier<10 and (player:GetAttribute("Ingot") or 0)>=(Config.TemperCost(tier,player:GetAttribute("SmithXp") or 0))
      and "단련 재료가 준비됐어. 아래 장비 강화를 누르면 서버가 비용을 확인해."
    or "광석을 캐서 마을 화로에서 주괴로 제련해. 전투 중에는 공격 예고에 맞춰 막으면 연타를 끊을 수 있어."
  -- [의뢰 도우미] 메인 > 마을 서브 > 동료 서브 순서. 모든 수치는 서버의 기존 저장 속성만 읽는다.
  local companionStage=player:GetAttribute("CompanionQuestStage") or 1
  local companion=Config.CompanionRequests and Config.CompanionRequests[companionStage]
  local companionUnlocked=companion and (player:GetAttribute("QuestStage") or 1)>=companion.UnlockMainStage
  local villageStage=player:GetAttribute("VillageContractIndex") or 1
  local village=Config.VillageContracts and Config.VillageContracts[villageStage]
  local villagePhase=player:GetAttribute("VillageContractPhase") or 0
  local villageMask=player:GetAttribute("VillageContractEvidence") or 0
  local villageProgress=0
  if village then
    local witness=bit32.lshift(1,village.Witness-1)
    villageProgress=(bit32.band(villageMask,witness)~=0 and 1 or 0)
      +(bit32.band(villageMask,8)~=0 and 1 or 0)
      +(bit32.band(villageMask,64)~=0 and 1 or 0)
  end
  local bountyIndex=player:GetAttribute("BountyIndex") or 1
  local bountyPhase=player:GetAttribute("BountyPhase") or 0
  local bounty=Config.Bounties and Config.Bounties[bountyIndex]
  local bountyText=not bounty and "모든 현상금 완료"
    or bountyPhase==0 and string.format("%s · 새 계약 가능 (%s 의뢰판)",bounty.Name,bounty.Region=="worldtree" and "세계수 숲" or bounty.Region=="volcano" and "화산 협곡" or "오아시스 지하")
    or bountyPhase==1 and string.format("%s\n단서 2곳 조사 후 %s 처치",bounty.Name,bounty.EnemyName)
    or string.format("%s\n처치 완료 · 의뢰판에서 보상 선택",bounty.Name)
  local mainText=quest and string.format("%s\n%s  (%d/%d)",quest.Name,quest.Instruction,
    player:GetAttribute("QuestProgress") or 0,quest.Goal) or "완료 · 기사단 연대기 수집을 마쳤어."
  local villageText=village and string.format("%s · %s\n%s",village.Name,village.Issuer,
    villagePhase==0 and "촌장에게 의뢰 수락" or villagePhase==2 and "촌장에게 조사 결과 보고"
    or string.format("진행 중 · 단서 %d/3 · %s",villageProgress,village.EnemyName)) or "마을 의뢰 모두 완료"
  local companionText=companion and string.format("%s\n%s",companion.Name,
    companionUnlocked and string.format("%s (%d/%d)",companion.Instruction,
      player:GetAttribute("CompanionQuestProgress") or 0,companion.Goal)
      or string.format("메인 의뢰 %d단계에 해금",companion.UnlockMainStage)) or "동료 의뢰 모두 완료"
  local journalBase=meadowLabels[3].Text
  meadowLabels[5].Text="진행 중인 의뢰\n\n【메인 퀘스트】\n"..mainText..
    "\n\n【서브 · 마을】\n"..villageText..
    "\n\n【현상금】\n"..bountyText..
    "\n\n【서브 · 동료】\n"..companionText..
    "\n\n【다음 행동 안내】\n"..suggestion..
    string.format("\n\n다음 단련 재료: 철 주괴 %d · 무두질 가죽 %d",Config.TemperCost(player:GetAttribute("WeaponTier") or 0,player:GetAttribute("SmithXp") or 0))..
    "\n\n【처음 조작】\n왼쪽 조이스틱/WASD: 이동\n왼쪽 퀘스트 도우미: 의뢰 확인\n빈 화면 터치/클릭: 기본 공격\n오른쪽 회피·막기: 적의 공격 대응\n상호작용: 주민 대화·단서·채집"

  local companionLines={"동료 통신 · 선택 의뢰","메인 퀘스트와 독립적으로 진행돼."}
  for index,request in ipairs(Config.CompanionRequests or {})do
    local unlocked=(player:GetAttribute("QuestStage") or 1)>=request.UnlockMainStage
    local status=index<companionStage and "완료" or index==companionStage and unlocked and "진행 중" or "대기"
    local progress=index<companionStage and request.Goal or index==companionStage and (player:GetAttribute("CompanionQuestProgress") or 0) or 0
    companionLines[#companionLines+1]=string.format("【%s】 %s\n%s\n%s  %d/%d",status,request.Name,request.Message,request.Instruction,progress,request.Goal)
  end
  -- [세계 탭] 지역 4개(1부)와 파티 4인 구성을 한곳에 표시한다. 구현 전 지역·영입은 잠금으로 보여 준다.
  local worldLines={"세계 · 1부 지역 4곳 (엔딩 없이 진행)"}
  local dexLines={"몬스터 도감 (처치할수록 기록이 열려)"}
  local partyLines={"파티: 멀티 최대 4인 · 각자 동료 최대 2명 동행 (솔로 가능)\n동료는 각자의 사연 퀘스트(세계 탭)에서 선택으로 합류하고, 마을 동쪽 안식처에서 동행을 정한다.\n1. 나 (플레이어)"}
  local mystLines={"마력숲의 수수께끼 (진행하면 하나씩 풀려)"}
  local storyLines={"1부 메인 이야기 (07~12장)"}
  local statusText={Open="탐험 가능",Planned="준비 중",Reserved="2부 이후"}
  local discovered=player:GetAttribute("WorldDiscovered") or 1
  local regionBits={}
  for _,zone in ipairs(Config.WorldMap.Zones) do regionBits[zone.Id]=zone.Bit end
  for index,region in ipairs(Config.Regions or {})do
    local bit=regionBits[region.Id]
    local seen=bit==nil or bit32.band(discovered,bit)~=0
    worldLines[#worldLines+1]=string.format("%d. %s  [%s%s]%s",index,region.Name,statusText[region.Status] or "잠김",
      bit and (seen and " · 발견" or " · 미발견") or "",seen and region.Story and ("\n   "..region.Story) or "")
  end
  do
    local count=0
    for i=0,31 do if bit32.band(player:GetAttribute("WaypointMask") or 0,bit32.lshift(1,i))~=0 then count+=1 end end
    worldLines[#worldLines+1]=string.format("발견한 이정표 %d/32 — 이정표를 조사하면 빠른 이동 거점이 된다.",count)
  end
  do
    local prof=tonumber(player:GetAttribute("MiningProficiency")) or 0
    local level,thr=1,Config.MiningThresholds or {0}
    for i,need in ipairs(thr) do if prof>=need then level=i end end
    local nextNeed=thr[level+1]
    local tier=tonumber(player:GetAttribute("PickaxeTier")) or 0
    local pick=Config.Pickaxes and Config.Pickaxes[tier]
    worldLines[#worldLines+1]=string.format("채굴 Lv%d (%d%s) · 곡괭이: %s",level,prof,nextNeed and ("/"..nextNeed) or " 최고",pick and pick.Name or "없음 — 광부에게서 구한다")
  end
  do
    local n=tonumber(player:GetAttribute("Notoriety")) or 0
    local mask=tonumber(player:GetAttribute("ConquestMask")) or 0
    local owned=0
    for i=0,31 do if bit32.band(mask,bit32.lshift(1,i))~=0 then owned+=1 end end
    worldLines[#worldLines+1]=string.format("악명 %s · 정복한 요새 %d곳 · 격파한 사냥꾼 %d",string.rep("★",n)..string.rep("☆",5-n),owned,tonumber(player:GetAttribute("HunterKills")) or 0)
    local raidZone=player:GetAttribute("RaidZone")
    local raidUntil=tonumber(player:GetAttribute("RaidUntil"))
    if raidZone and raidUntil then
      local left=math.max(0,math.floor(raidUntil-workspace:GetServerTimeNow()))
      worldLines[#worldLines+1]=string.format("⚔ %s 요새에 반격군! 남은 시간 %d초 — 달려가 지켜라.",raidZone,left)
    end
  end
  do
    local seat=workspace:GetAttribute("MeteorSeat")
    if typeof(seat)=="Vector3" then
      local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      local zoneId=Config.WorldMap.ZoneAt(seat.X,seat.Z)
      local zoneName=zoneId
      for _,z in ipairs(Config.WorldMap.Zones) do if z.Id==zoneId then zoneName=z.Name end end
      local text=string.format("★ 별똥별 낙하 중 — %s (%d, %d)",zoneName or "?",seat.X,seat.Z)
      if root then
        local dx,dz=seat.X-root.Position.X,seat.Z-root.Position.Z
        local dir=(math.abs(dx)>math.abs(dz) and (dx>0 and "동쪽" or "서쪽")) or (dz>0 and "남쪽" or "북쪽")
        text=text..string.format(" · 여기서 %s으로 약 %d스터드",dir,math.floor(math.sqrt(dx*dx+dz*dz)))
      end
      worldLines[#worldLines+1]=text
    end
  end
  do
    worldLines[#worldLines+1]="— 연계 퀘스트 —"
    for _,line in ipairs(Config.QuestLines or {})do
      local stage=player:GetAttribute(line.Field) or 0
      local step=line.Steps[stage]
      if stage>#line.Steps then
        worldLines[#worldLines+1]="✔ "..line.Name.." (완료)"
      elseif stage>=1 and step then
        local progress=player:GetAttribute(line.Field.."P") or 0
        worldLines[#worldLines+1]=string.format("▶ %s  [%d/%d]\n   목표: %s%s\n   %s",line.Name,stage,#line.Steps,step.Title,
          step.Count and step.Count>1 and string.format(" (%d/%d)",progress,step.Count) or "",step.Text)
      elseif line.Kind~="Hidden" then
        worldLines[#worldLines+1]="· ??? ("..line.Name:match("%](.*)$").." — 조건을 만족하면 시작)"
      end
    end
  end
  do
    local chapterMask=player:GetAttribute("ChapterMask") or 0
    worldLines[#worldLines+1]="— 기사단 기록 (장소를 발견하면 조각이 모인다) —"
    for ci,chapter in ipairs(Config.WorldMap.Chapters)do
      local open=bit32.band(chapterMask,bit32.lshift(1,ci-1))~=0
      worldLines[#worldLines+1]=open and string.format("· %s\n   %s",chapter.Title,chapter.Text) or string.format("· ??? (장소 %d곳 발견 시 열림)",chapter.Need)
    end
    local relicMask,relicCount=player:GetAttribute("RelicMask") or 0,0
    local names={}
    for ri,name in ipairs(Config.WorldMap.Relics)do
      if bit32.band(relicMask,bit32.lshift(1,ri-1))~=0 then relicCount+=1;names[#names+1]=name end
    end
    worldLines[#worldLines+1]=string.format("— 유물 %d/%d  (공격 피해 +%d%%) —\n%s",relicCount,#Config.WorldMap.Relics,relicCount*5,#names>0 and table.concat(names,", ") or "던전 보스 상자에서 얻는다.")
  end
  for _,entry in ipairs(Config.Bestiary or {})do
    local kills=player:GetAttribute(entry.Field) or 0
    if kills<=0 then
      dexLines[#dexLines+1]="· ???  (아직 만나지 못함)"
    else
      dexLines[#dexLines+1]=string.format("· %s  처치 %d  /  서식지: %s",entry.Name,kills,entry.Habitat)
      for tier,need in ipairs({1,5,15})do
        dexLines[#dexLines+1]="   "..(kills>=need and entry.Lore[tier] or string.format("   (처치 %d회에 열림)",need))
      end
    end
  end
  partyLines[#partyLines+1]=string.format("기사단 야영지  숲 %d/3 · 화산 %d/3 · 오아시스 %d/3  (입구 근처 모닥불에서 복구)",
    player:GetAttribute("CampWorldtree") or 0,player:GetAttribute("CampVolcano") or 0,player:GetAttribute("CampOasis") or 0)
  do
    local owned,active,bond=player:GetAttribute("CompanionOwned") or 0,player:GetAttribute("CompanionActive") or 0,player:GetAttribute("CompanionBond") or 0
    local byId={}
    for _,c in ipairs(Config.Companions or {})do byId[c.Id]=c end
    local ownedCount=0
    for i=1,#(Config.Companions or {})do if bit32.band(owned,bit32.lshift(1,i-1))~=0 then ownedCount+=1 end end
    partyLines[#partyLines+1]=string.format("동료 %d/%d명 모집 · 동행 최대 2명 (둘의 상성이 협동기 또는 불화를 만든다)",ownedCount,#(Config.Companions or {}))
    for i,c in ipairs(Config.Companions or {})do
      local flag=bit32.lshift(1,i-1)
      if bit32.band(owned,flag)~=0 then
        local likes,dislikes={},{}
        for _,id in ipairs(c.Likes)do likes[#likes+1]=byId[id] and byId[id].Name or id end
        for _,id in ipairs(c.Dislikes)do dislikes[#dislikes+1]=byId[id] and byId[id].Name or id end
        partyLines[#partyLines+1]=string.format("%s %s · %s%s  [%s]\n   \"%s\"\n   대담%d 신중%d 탐욕%d 온정%d 충성%d · 호감: %s / 반감: %s",
          bit32.band(active,flag)~=0 and "▶" or "·",c.Name,c.Role,bit32.band(bond,flag)~=0 and " ♥" or "",c.Arch,c.Worldview,c.B,c.C,c.G,c.K,c.L,
          #likes>0 and table.concat(likes,",") or "-",#dislikes>0 and table.concat(dislikes,",") or "-")
      else
        partyLines[#partyLines+1]=string.format("· ??? (%s)",c.Where)
      end
    end
  end
  local questStageNow=player:GetAttribute("QuestStage") or 1
  for _,mystery in ipairs(Config.Mysteries or {})do
    mystLines[#mystLines+1]=questStageNow>=mystery.Stage and ("· "..mystery.Text) or "· ???"
  end
  for _,beat in ipairs(Config.MainStoryPart1 or {})do storyLines[#storyLines+1]=beat.Name.."\n   "..beat.Text end
  local sec=meadowArt.sections
  sec[6].texts={table.concat(worldLines,"\n"),table.concat(dexLines,"\n"),table.concat(partyLines,"\n"),
    table.concat(mystLines,"\n"),table.concat(storyLines,"\n")}
  local howTo=string.match(meadowLabels[5].Text,"【처음 조작】.*") or ""
  -- [퀘스트 로그 통합] 메인·마을·현상금·동료·연계 퀘스트를 한 화면에 한 줄 요약으로 모아 보여 준다.
  local allLines={"진행 중인 모든 의뢰  (자세한 내용은 위 탭)",""}
  local function firstLine(text) return (tostring(text):match("^[^\n]*")) or "" end
  allLines[#allLines+1]="▶ 메인  "..mainText:gsub("\n","  ·  ")
  allLines[#allLines+1]="▶ 마을  "..villageText:gsub("\n","  ·  ")
  allLines[#allLines+1]="▶ 현상금  "..bountyText:gsub("\n","  ·  ")
  allLines[#allLines+1]="▶ 동료  "..companionText:gsub("\n","  ·  ")
  for _,line in ipairs(Config.QuestLines or {}) do
    local stage=player:GetAttribute(line.Field) or 0
    local step=line.Steps[stage]
    if stage>=1 and step then
      local progress=player:GetAttribute(line.Field.."P") or 0
      allLines[#allLines+1]=string.format("▶ 연계  %s [%d/%d]  ·  %s%s",line.Name,stage,#line.Steps,step.Title,
        step.Count and step.Count>1 and string.format(" (%d/%d)",progress,step.Count) or "")
    end
  end
  allLines[#allLines+1]=""
  allLines[#allLines+1]="목표 위치는 지도 옆 '길 안내'가 가리켜. 왼쪽 퀘스트를 누르면 길 안내가 켜져."
  sec[3].texts={
    table.concat(allLines,"\n"),
    "【메인 퀘스트】\n"..mainText.."\n\n【다음 행동 안내】\n"..suggestion..string.format("\n\n다음 단련 재료: 철 주괴 %d · 무두질 가죽 %d",Config.TemperCost(player:GetAttribute("WeaponTier") or 0,player:GetAttribute("SmithXp") or 0)),
    "【서브 · 마을】\n"..villageText.."\n\n"..table.concat(companionLines,"\n\n"),
    "【현상금 게시판】\n"..bountyText,
    howTo.."\n\n"..journalBase,
  }
  meadowArt.applySection(3);meadowArt.applySection(6)
  for _,button in ipairs(meadowHelperButtons) do
    button.Active=ready
    button.TextTransparency=ready and 0 or .5
  end
end
for _,name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(renderMeadowPages) end
for _,key in ipairs({"MeadowEquipWeapon","MeadowEquipChest","MeadowEquipHands","MeadowEquipLegs",
  "MeadowEquipFeet","MeadowEquipAccessory","MeadowEquipCape","MeadowEquipShield","MeadowGearAttack","MeadowGearDefense"})do
  player:GetAttributeChangedSignal(key):Connect(renderMeadowPages)
end
player:GetAttributeChangedSignal("MeadowGearRevision"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("RunActive"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("QuestStage"):Connect(renderMeadowPages)
workspace:GetAttributeChangedSignal("MeteorSeat"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("CompanionQuestStage"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("CompanionQuestProgress"):Connect(renderMeadowPages)
for _,name in ipairs({"Notoriety","ConquestMask","HunterKills","RaidZone","RaidUntil","MiningProficiency","PickaxeTier","ExplorationGroves","DawnTraceFound","NightTraceFound","RuinsDiscovered","CampWorldtree","CampVolcano","CampOasis","BountyIndex","BountyPhase","BountyClues","WorldDiscovered","WaypointMask","DexKillWolf","DexKillBat","DexKillAlpha"})do
  player:GetAttributeChangedSignal(name):Connect(renderMeadowPages)
end
for index,row in ipairs({{"생존 시작","genre-core"},{"가까운 자원 채집","scope-coreloop-1-6ebe58f496"},{"장비 강화","scope-coreloop-2-6c927cfa40"}})do
  local button=CommonUI.CreatePrimaryButton({name="MeadowHelper"..index,text=row[1],minHeight=52})
  button.LayoutOrder=100+index;button.Size=UDim2.new(1,-8,0,54)
  button.BackgroundColor3=Color3.fromRGB(40,92,69)
  local helperGradient=button:FindFirstChildOfClass("UIGradient")
  if helperGradient then helperGradient.Color=ColorSequence.new(Color3.fromRGB(62,121,88),Color3.fromRGB(29,66,56)) end
  button.Parent=meadowPages[4]
  meadowHelperButtons[index]=button
  button.Activated:Connect(function()
    if player:GetAttribute("ProfileReady")==true then activateMeadowAction(row[2]) end
  end)
end
-- [초반 튜토리얼 재실행] 기존 도우미 페이지에서 누구나 조작 안내를 다시 볼 수 있다.
local tutorialReplay=CommonUI.CreatePrimaryButton({name="MeadowTutorialReplay",text="조작 튜토리얼 다시 시작",minHeight=52})
tutorialReplay.LayoutOrder=104
tutorialReplay.Size=UDim2.new(1,-8,0,54)
tutorialReplay.Parent=meadowPages[4]
tutorialReplay.Activated:Connect(function()
  if meadowTutorialRestart then
    meadowTutorialRestart()
    meadowMenu.close()
  end
end)
player:GetAttributeChangedSignal("MeadowSurvivalHintSerial"):Connect(function()
  local clue=player:GetAttribute("MeadowSurvivalHint")
  if typeof(clue)=="string" and clue~="" and not table.find(meadowJournal,clue) then
    table.insert(meadowJournal,1,clue)
    if #meadowJournal>24 then table.remove(meadowJournal) end
    renderMeadowPages()
  end
end)
-- [캐릭터창 실제 3D] 이전 캐릭터 감시를 정리하고 승인된 아바타 외형 변화만 다시 렌더링한다.
local meadowCharacterConnections={}
local function bindMeadowMenuCharacter(character)
  for _,connection in ipairs(meadowCharacterConnections)do connection:Disconnect() end
  table.clear(meadowCharacterConnections)
  if character~=player.Character then return end
  previewNeedsRefresh=true
  local human=character:WaitForChild("Humanoid",8)
  if character~=player.Character then return end
  if human then
    meadowCharacterConnections[#meadowCharacterConnections+1]=human.HealthChanged:Connect(function()
      render();renderMeadowPages()
    end)
    meadowCharacterConnections[#meadowCharacterConnections+1]=human:GetPropertyChangedSignal("MaxHealth"):Connect(function()
      render();renderMeadowPages()
    end)
  end
  -- [낡은 붉은 망토 펄럭임] 캐릭터 전용 실제 AccessoryWeld와 기존 Bone만 움직인다.
  -- 걷기/질주/회전/도약별 후행·복원 속도를 달리하며 전투·아바타 리그를 교체하지 않는다.
  local capeWeld,capeRestC0,capeAccessory=nil,nil,nil
  local capeBones={}
  local capePitch,capeRoll,capeTurn=0,0,0
  local capeClock=0
  local capeArrivalWindUntil=0
  local capeRoot=character:FindFirstChild("HumanoidRootPart")
  local function bindWornCape(child)
    if not child or not child:IsA("Model")
      or child.Name~="MeadowWornCrimsonCape" then return end
    if capeAccessory==child and capeWeld and capeWeld.Parent then return end
    -- 기본 장착 후 Weld 생성이 한 프레임 늦을 수 있으므로 기존 로딩을 비동기로 기다린다.
    task.spawn(function()
      local handle=child:WaitForChild("Handle",8)
      local joint=handle and handle:WaitForChild("AccessoryWeld",8)
      if character~=player.Character or child.Parent~=character or not joint or not joint:IsA("Weld") then return end
      if capeAccessory==child and capeWeld and capeWeld.Parent then return end
      capeAccessory=child
      capeWeld=joint
      capeRestC0=joint.C0
      capePitch,capeRoll,capeTurn=0,0,0
      capeClock=0
      table.clear(capeBones)
      -- 원래 제작된 뼈가 있으면 끝단으로 갈수록 더 크게 흔들린다. 새 본/파츠 생성 금지.
      for _,descendant in ipairs(child:GetDescendants()) do
        if descendant:IsA("Bone") then
          capeBones[#capeBones+1]={bone=descendant,rest=descendant.Transform}
        end
      end
    end)
  end
  local function onCharacterChildChanged(child)
    if child:IsA("Model") and child.Name=="MeadowWornCrimsonCape" then
      if child.Parent==character then
        bindWornCape(child)
      elseif child==capeAccessory then
        capeWeld,capeRestC0,capeAccessory=nil,nil,nil
        table.clear(capeBones)
      end
    end
    if child:IsA("Tool") or child:IsA("Accessory") or (child:IsA("Model") and child.Name=="MeadowWornCrimsonCape") or child:IsA("Shirt")
      or child:IsA("Pants") or child:IsA("ShirtGraphic") or child:IsA("BodyColors") then
      previewNeedsRefresh=true
    end
    renderMeadowPages()
  end
  meadowCharacterConnections[#meadowCharacterConnections+1]=character.ChildAdded:Connect(onCharacterChildChanged)
  meadowCharacterConnections[#meadowCharacterConnections+1]=character.ChildRemoved:Connect(onCharacterChildChanged)
  meadowCharacterConnections[#meadowCharacterConnections+1]=game:GetService("RunService").RenderStepped:Connect(function(dt)
    if character~=player.Character or not capeWeld or not capeWeld.Parent
      or not capeRestC0 or not capeAccessory or capeAccessory.Parent~=character then return end
    local root=capeRoot or character:FindFirstChild("HumanoidRootPart")
    capeRoot=root
    if not root or not root.Parent or not human or human.Health<=0 then return end
    local velocity=root.AssemblyLinearVelocity
    local planar=Vector3.new(velocity.X,0,velocity.Z)
    local walk=math.max(human.WalkSpeed,6)
    local speed=planar.Magnitude
    local stride=math.clamp(speed/math.max(walk*1.55,17),0,1)
    local lateral=math.clamp(root.CFrame.RightVector:Dot(planar)/walk,-1,1)
    -- [천의 관성] 급선회·뒷걸음에는 몸의 방향 회전보다 망토 가장자리가 늦게 쏠린다.
    local turnRate=math.clamp(root.AssemblyAngularVelocity.Y/5,-1,1)
    local backward=math.clamp(-root.CFrame.LookVector:Dot(planar)/walk,0,1)
    local state=human:GetState()
    local airborne=state==Enum.HumanoidStateType.Jumping
      or state==Enum.HumanoidStateType.Freefall
    local recovering=state==Enum.HumanoidStateType.Landed
    -- [첫 마을 진입] 실제 오프닝에서 게임 화면으로 돌아올 때 한 번만 바람이 휙 지난다.
    local openingGust=math.clamp((capeArrivalWindUntil-os.clock())/2.8,0,1)
    local flutterStrength=(.012+stride*.080+openingGust*.12)*(reducedEffects and .62 or 1)
    capeClock+=dt*(stride>.05 and (5.2+stride*6) or 2.1)
    -- 바람에 뜬 천이 몸보다 한 박자 늦게 따라오도록 저주파 관성을 둔다.
    local targetPitch=.025+stride*.29+openingGust*.27+backward*.07
      +(airborne and .19 or 0)+(recovering and -.09 or 0)
    local targetRoll=lateral*.14-turnRate*.085
      +math.sin(capeClock*.48)*(.018+stride*.035)
    local targetTurn=math.clamp(-lateral*.12-turnRate*.11,-.21,.21)
    local response=math.clamp(dt*(airborne and 3.3 or 4.6),0,1)
    capePitch+=(targetPitch-capePitch)*response
    capeRoll+=(targetRoll-capeRoll)*response
    capeTurn+=(targetTurn-capeTurn)*math.clamp(dt*3.2,0,1)
    local edgeRipple=math.sin(capeClock)*flutterStrength
      +math.sin(capeClock*.61+1.1)*flutterStrength*.46
      +math.sin(capeClock*1.41+capeTurn*3)*flutterStrength*.18
    capeWeld.C0=capeRestC0*CFrame.Angles(capePitch+edgeRipple*.36,
      capeTurn*.55,capeRoll+edgeRipple*.30)
    for index,entry in ipairs(capeBones) do
      if entry.bone.Parent then
        local weight=index/math.max(#capeBones,1)
        entry.bone.Transform=entry.rest*CFrame.Angles(
          capePitch*weight*.44+edgeRipple*weight,
          capeTurn*weight*.7,
          capeRoll*weight*.53+math.sin(capeClock-index*.72)*flutterStrength*weight)
      end
    end
  end)
  meadowCharacterConnections[#meadowCharacterConnections+1]=player:GetAttributeChangedSignal("MeadowEnteredWorld"):Connect(function()
    if player:GetAttribute("MeadowEnteredWorld")==true then
      capeArrivalWindUntil=os.clock()+2.8
    end
  end)
  meadowCharacterConnections[#meadowCharacterConnections+1]=character:GetAttributeChangedSignal("OpeningCapeState"):Connect(renderMeadowPages)
  meadowCharacterConnections[#meadowCharacterConnections+1]=character:GetAttributeChangedSignal("OpeningCapeAttached"):Connect(function()
    -- [직접 장착된 실제 망토] 서버가 진홍색 원본과 용접을 확인한 뒤 펄럭임과 장비창을 갱신한다.
    if character:GetAttribute("OpeningCapeAttached")==true then
      if not capeWeld then
        bindWornCape(character:FindFirstChild("MeadowWornCrimsonCape"))
      end
      previewNeedsRefresh=true
      renderMeadowPages()
    end
  end)
  for _,accessory in ipairs(character:GetChildren()) do bindWornCape(accessory) end
  renderMeadowPages()
end
player.CharacterAppearanceLoaded:Connect(function(character)
  if character~=player.Character then return end
  previewNeedsRefresh=true
  renderMeadowPages()
end)
player.CharacterAdded:Connect(function(character)task.defer(bindMeadowMenuCharacter,character)end)
if player.Character then task.defer(bindMeadowMenuCharacter,player.Character) end
for index,name in ipairs({"효과음","환경음","타격 효과"}) do
  local button=CommonUI.CreatePrimaryButton({name="MeadowOption"..index,text=name,minHeight=52})
  button.Size=UDim2.new(1,-8,0,54);button.LayoutOrder=index
  button.BackgroundColor3=Color3.fromRGB(40,92,69)
  local optionGradient=button:FindFirstChildOfClass("UIGradient")
  if optionGradient then optionGradient.Color=ColorSequence.new(Color3.fromRGB(62,121,88),Color3.fromRGB(29,66,56)) end
  button.Parent=meadowPages[4]
  local function refreshOption()
    local value=index==1 and meadowEffectsGroup.Volume or meadowAmbienceGroup.Volume
    button.Text=index==3 and ("타격 효과  ·  "..(reducedEffects and "간소화" or "기본"))
      or name.."  ·  "..math.floor(value*100+.5).."%   눌러 조절"
  end
  button.Activated:Connect(function()
    if index==3 then reducedEffects=not reducedEffects
    else
      local group=index==1 and meadowEffectsGroup or meadowAmbienceGroup
      group.Volume=group.Volume>.9 and 0 or math.min(1,group.Volume+.25)
    end
    refreshOption()
  end)
  refreshOption()
end
do -- [전투 표시 옵션] 데미지 숫자를 끄고 켤 수 있다.
  local dmgOption=CommonUI.CreatePrimaryButton({name="MeadowDamageNumbers",text="데미지 숫자",minHeight=52})
  dmgOption.LayoutOrder=5
  dmgOption.Size=UDim2.new(1,-8,0,54)
  dmgOption.Parent=meadowPages[4]
  local function refreshDmg() dmgOption.Text="데미지 숫자  ·  "..(_G.MeadowDamageNumbersOff and "끔" or "켬").."   눌러 변경" end
  dmgOption.Activated:Connect(function() _G.MeadowDamageNumbersOff=not _G.MeadowDamageNumbersOff refreshDmg() end)
  refreshDmg()
end
-- [카메라 옵션] Roblox 기본 카메라는 손가락 드래그/마우스 회전과 확대를 지원한다.
local meadowCameraOption=CommonUI.CreatePrimaryButton({
  name="MeadowCameraMode",text="카메라 시점",minHeight=52
})
meadowCameraOption.LayoutOrder=4
meadowCameraOption.Size=UDim2.new(1,-8,0,54)
meadowCameraOption.Parent=meadowPages[4]
local function refreshMeadowCameraOption()
  meadowCameraOption.Text="카메라  ·  "..meadowCameraModes[meadowCameraMode].."   눌러 변경"
end
meadowCameraOption.Activated:Connect(function()
  cycleMeadowCameraMode()
  refreshMeadowCameraOption()
end)
refreshMeadowCameraOption()
-- [라이선스] 외부 전투 아이콘 저작자 표기를 옵션 화면에 제공한다.
local iconCredits=Instance.new("TextLabel")
iconCredits.Name="ActionIconCredits"
iconCredits.LayoutOrder=8
iconCredits.Size=UDim2.new(1,-8,0,56)
iconCredits.BackgroundTransparency=1
iconCredits.TextWrapped=true
iconCredits.TextSize=11
iconCredits.Font=Enum.Font.Gotham
iconCredits.TextColor3=Color3.fromRGB(202,211,205)
iconCredits.Text="액션 아이콘: Lorc · DarkZaitzev · Delapouite (CC BY 3.0)\ngame-icons.net"
iconCredits.Parent=meadowPages[4]
renderMeadowPages()
-- [메뉴 전용 위쳐풍] 기존 왼쪽 메뉴와 중앙 팝업만 변경. 오른쪽 액션/조이스틱 HUD는 그대로 둔다.
root.BackgroundColor3=Color3.fromRGB(12,28,30)
meadowPanelGradient.Color=ColorSequence.new(Color3.fromRGB(32,66,56),Color3.fromRGB(9,23,30))
local menuBorder=root:FindFirstChild("WitcherMenuBorder") or Instance.new("UIStroke")
menuBorder.Name="WitcherMenuBorder";menuBorder.Color=meadowGold
menuBorder.Thickness=3;menuBorder.Transparency=0;menuBorder.Parent=root
meadowMenu=CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,{
  compact=true,hideButton=true,hideMenuButton=true,menuLeft=true,witcherStyle=true,sideTabs=true,tabOrder={1,2,7,3,6,4},
  pages=meadowPages,pageNames=meadowPageNames,
  onPageChanged=function(index)
    renderMeadowPages()
    -- [투명 유리창] 메뉴 뒤로 게임 화면이 비쳐 보이게 창·카드 배경을 반투명으로 만든다.
    task.defer(function()
      root.BackgroundTransparency=.3
      local shade=gui:FindFirstChild("ActionMenuShade")
      if shade then shade.BackgroundTransparency=.82 end
      for _,d in ipairs(root:GetDescendants())do
        if d:IsA("GuiObject") and d.BackgroundTransparency<.3 and d.Name~="SkillPointDot"
          and not (d:IsA("TextButton") and d.Text=="X") and not d:IsA("ScrollingFrame") then
          d.BackgroundTransparency=.3
        end
      end
    end)
    if index==4 then refreshMeadowCameraOption() end
    local heading=root:FindFirstChild("MeadowMenuHeading")
    if heading then heading.Text="탐험  /  "..(meadowPageNames[index] or "모험") end
    local subtitle=root:FindFirstChild("MeadowMenuSubtitle")
    if subtitle then
      local captions={
        [0]="현재 할 수 있는 행동", [1]="전신 · 장비 · 숙련도", [2]="보유 · 제작법 · 아이템 상세",
        [3]="메인 · 의뢰 · 지금 목표", [4]="소리 · 화면 · 조작 · 도움말", [5]="지금 필요한 목표",
        [6]="지역 · 동료 · 이야기 기록", [7]="전투 기술과 성장",
      }
      subtitle.Text=captions[index] or "마력숲 탐험"
    end
    if index==7 and meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
  end,
})
local menuHeading=root:FindFirstChild("MeadowMenuHeading")
if menuHeading then
  menuHeading.Text="탐험 수첩"
  menuHeading.TextColor3=Color3.fromRGB(255,244,214)
  menuHeading.Font=Enum.Font.GothamBlack;menuHeading.TextSize=22
  menuHeading.TextStrokeColor3=Color3.fromRGB(8,14,16);menuHeading.TextStrokeTransparency=.1
end
local witcherTabs=root:FindFirstChild("MeadowMenuTabs")
if witcherTabs then
  for _,button in ipairs(witcherTabs:GetChildren())do
    if button:IsA("TextButton") then
      button.TextColor3=meadowParchment
      button.Font=Enum.Font.GothamBold
      button.TextSize=13;button.TextWrapped=false;button.TextTruncate=Enum.TextTruncate.AtEnd
      button.TextYAlignment=Enum.TextYAlignment.Bottom
      local index=button:GetAttribute("FilterIndex")
      if typeof(index)=="number" then
        local atlasCell=({3,4,2,5,7,6})[index]
        -- [아이콘 동기화] 상단 메뉴와 같은 개념(가방·스킬·기록·설정)은 같은 원화를 쓴다.
        local painted=({[2]={0,0},[5]={800,0},[6]={0,200}})[index]
        if painted then
          local icon=Instance.new("ImageLabel")
          icon.Name="CC0MenuIcon";icon.BackgroundTransparency=1
          icon.Image=meadowPaintedHudAtlas;icon.ImageRectOffset=Vector2.new(painted[1],painted[2])
          icon.ImageRectSize=Vector2.new(200,200);icon.ScaleType=Enum.ScaleType.Fit
          icon.Size=UDim2.fromOffset(38,38);icon.Position=UDim2.new(.5,-19,0,4)
          icon.ZIndex=46;icon.Parent=button
        elseif index==3 then
          local icon=Instance.new("ImageLabel")
          icon.Name="CC0MenuIcon";icon.BackgroundTransparency=1
          icon.Size=UDim2.fromOffset(38,38);icon.Position=UDim2.new(.5,-19,0,4)
          icon.ZIndex=46;icon.Parent=button
          if not applySkillTreeIcon(icon) then meadowArt.skill(icon,"skill-meadow-focus") end
        elseif atlasCell then
          local icon=Instance.new("ImageLabel")
          icon.Name="CC0MenuIcon";icon.BackgroundTransparency=1
          icon.Image=meadowIconAtlas;icon.ImageRectOffset=Vector2.new(atlasCell*64,0)
          icon.ImageRectSize=Vector2.new(64,64)
          -- [세로 탭] 큰 아이콘을 위에, 짧은 이름을 아래에 둔다.
          icon.Size=UDim2.fromOffset(38,38);icon.Position=UDim2.new(.5,-19,0,4)
          icon.ImageColor3=Color3.fromRGB(224,238,209)
          icon.ZIndex=46;icon.Parent=button
        end
      end
      local underline=button:FindFirstChild("SelectedUnderline")
      if underline and underline:IsA("Frame") then underline.BackgroundColor3=meadowGold end
    end
  end
end
UserInputService.InputBegan:Connect(function(input,processed)
  if processed or UserInputService:GetFocusedTextBox() then return end
  if input.KeyCode==Enum.KeyCode.C then meadowMenu.open(1)
  elseif input.KeyCode==Enum.KeyCode.I then meadowMenu.open(2)
  elseif input.KeyCode==Enum.KeyCode.K then meadowMenu.open(7)
  elseif input.KeyCode==Enum.KeyCode.J then meadowMenu.open(3)
  elseif input.KeyCode==Enum.KeyCode.O then meadowMenu.open(4)
  end
end)
-- [아이콘 HUD / 지역 스코프] 기존 21종 이미지와 서버 동작을 그대로 두고 Luau 200 레지스터 제한만 해결한다.
do
-- [시안 상단 여섯 메뉴] 기존 메뉴 페이지를 그대로 호출하고 아이콘·위치만 교체한다.
-- [안전영역 밖 터치층] 기본 상단 메뉴 여백·오른쪽 안전영역 때문에 버튼이 잘리지 않게 별도 ScreenGui를 쓴다.
local meadowTouchLayer=Instance.new("ScreenGui")
meadowTouchLayer.Name="MeadowTouchLayer"
meadowTouchLayer.ResetOnSpawn=false
meadowTouchLayer.ScreenInsets=Enum.ScreenInsets.DeviceSafeInsets
meadowTouchLayer.DisplayOrder=gui.DisplayOrder+2
meadowTouchLayer.Parent=gui.Parent
local meadowReferenceMenu=Instance.new("Frame")
meadowReferenceMenu.Name="MeadowReferenceTopMenu"
meadowReferenceMenu.BackgroundTransparency=1
meadowReferenceMenu.ZIndex=26
meadowReferenceMenu.Parent=meadowTouchLayer
-- {이름,페이지,예비 칸,섹션,원화 칸 x,y}. 건설 기능이 없어 '건설' 버튼은 제거했고, 도감·연대기는 세계 탭의 해당 섹션으로 바로 간다.
local referenceMenuItems={
  {"가방",2,6,nil,0,0},{"제작",2,11,nil,200,0},
  {"도감",6,13,2,600,0},{"기사단 연대기",6,14,5,800,0},{"설정",4,15,nil,0,200},
  {"스킬트리",7,0,nil,0,0}, -- [오딧세이식 스킬 트리] 등록된 스킬 원화 시트의 아이콘을 쓴다.
}
for index,info in ipairs(referenceMenuItems) do
  local button=Instance.new("TextButton")
  button.Name="ReferenceMenu"..index
  button.BackgroundTransparency=1
  button.BorderSizePixel=0
  button.Text=""
  button.ZIndex=27
  button.Parent=meadowReferenceMenu
  local icon=Instance.new("ImageLabel")
  icon.Name="ReferenceIcon"
  icon.BackgroundTransparency=1
  icon.Image=meadowPaintedHudAtlas
  icon.ImageRectSize=Vector2.new(200,200)
  icon.ImageRectOffset=Vector2.new(info[5] or 0,info[6] or 0)
  icon.ScaleType=Enum.ScaleType.Fit
  icon.AnchorPoint=Vector2.new(.5,0)
  icon.Position=UDim2.fromScale(.5,0)
  icon.Size=UDim2.fromScale(1,1)
  icon.ZIndex=28
  icon.Parent=button
  if info[2]==7 and not applySkillTreeIcon(icon) then meadowArt.skill(icon,"skill-meadow-focus") end
  -- [메뉴 아이콘] 원화가 로드되지 않을 때만 이미 등록한 16칸 원본으로 복구.
  task.delay(25,function()
    if info[2]==7 then return end
    if not icon.Parent or icon.IsLoaded then return end
    icon.ImageRectSize=Vector2.new(40,40)
    icon.ImageRectOffset=Vector2.new(info[3]*40,0)
    icon.Image="rbxassetid://71333073665947"
  end)
  local caption=Instance.new("TextLabel")
  caption.Name="ReferenceCaption"
  caption.Text=info[1]
  caption.Font=Enum.Font.GothamBold
  caption.TextColor3=Color3.fromRGB(248,246,235)
  caption.TextStrokeTransparency=.3
  caption.TextScaled=false
  caption.TextSize=10
  caption.TextWrapped=false
  caption.BackgroundTransparency=1
  caption.AnchorPoint=Vector2.new(.5,0)
  caption.Position=UDim2.new(.5,0,1,1)
  caption.ZIndex=28
  caption.Parent=button
  button.Activated:Connect(function()
    meadowMenu.open(info[2])
    -- [직관 이동] 도감·연대기는 세계 탭의 해당 섹션을 바로 연다.
    if info[4] and meadowArt.sections[info[2]] then
      meadowArt.sections[info[2]].selected=info[4];meadowArt.applySection(info[2])
    end
  end)
end
local meadowReferenceHotbar=Instance.new("Frame")
meadowReferenceHotbar.Name="MeadowReferenceHotbar"
meadowReferenceHotbar.AnchorPoint=Vector2.new(.5,1)
meadowReferenceHotbar.BackgroundTransparency=1
meadowReferenceHotbar.ZIndex=24
meadowReferenceHotbar.Parent=gui
local referenceHotbarSlots={}
-- [참고 화면 단축바] 기존 서버 기술·소모품 동작만 사용한다.
local hotbarActions={
  function() if primaryCombatAction then activateMeadowAction(primaryCombatAction.Id) end end,
  function() activateMeadowAction("scope-coreloop-1-6ebe58f496") end,
  function() activateMeadowAction("scope-coreloop-1-6ebe58f496") end,
  function() if primaryCombatAction then activateMeadowAction(primaryCombatAction.Id) end end,
  function() remote:FireServer("meadow:rpg:tonic:use:herbal_tonic") end,
  function() remote:FireServer("meadow:rpg:tonic:use:energy_tonic") end,
  function() meadowMenu.open(2) end,
  function() activateMeadowAction("skill-meadow-guard") end,
  function() meadowMenu.open(3) end,
  function() meadowMenu.open(2) end,
}
for index=1,10 do
  local slot=Instance.new("TextButton")
  slot.Name="ReferenceHotbar"..index
  slot.Text=""
  -- [시안 단축바] 금속 테두리와 검정 슬롯은 등록된 원화 안에 있으므로 중복 배경을 없앤다.
  slot.BackgroundColor3=Color3.fromRGB(33,27,25)
  slot.BackgroundTransparency=1
  slot.BorderSizePixel=0
  slot.ZIndex=25
  slot.Parent=meadowReferenceHotbar
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,4)
  corner.Parent=slot
  local stroke=Instance.new("UIStroke")
  stroke.Color=index==1 and Color3.fromRGB(238,201,124) or Color3.fromRGB(116,100,82)
  stroke.Thickness=index==1 and 2 or 1.1
  stroke.Transparency=1
  stroke.Parent=slot
  local icon=Instance.new("ImageLabel")
  icon.Name="ReferenceItemIcon"
  icon.BackgroundTransparency=1
  icon.Image=meadowPaintedHudAtlas
  local hudCell=index+5 -- 5x5 시트: 칸 0~5 상단 메뉴, 6~15 단축바
  icon.ImageRectSize=Vector2.new(200,200)
  icon.ImageRectOffset=Vector2.new((hudCell%5)*200,math.floor(hudCell/5)*200)
  icon.ScaleType=Enum.ScaleType.Fit
  icon.Size=UDim2.fromScale(1,1)
  icon.Position=UDim2.fromScale(0,0)
  icon.ZIndex=26
  icon.Parent=slot
  task.delay(25,function()
    if not icon.Parent or icon.IsLoaded then return end
    icon.ImageRectSize=Vector2.new(40,40)
    icon.ImageRectOffset=Vector2.new((index-1)*40,0)
    icon.Image="rbxassetid://71333073665947"
    -- [시안 슬롯 틀] 원화 속 틀이 없을 때는 시안처럼 어두운 칸과 얇은 금속 테두리를 코드로 그린다.
    slot.BackgroundTransparency=.28
    stroke.Transparency=.08
    stroke.Thickness=index==1 and 2 or 1.4
    icon.Size=UDim2.new(1,-8,1,-8)
    icon.Position=UDim2.fromOffset(4,4)
  end)
  local quantity=Instance.new("TextLabel")
  quantity.Name="ItemCount"
  quantity.Text=""
  quantity.AnchorPoint=Vector2.new(1,1)
  quantity.Position=UDim2.new(1,-2,1,-2)
  quantity.Size=UDim2.fromOffset(24,13)
  quantity.BackgroundTransparency=1
  quantity.Font=Enum.Font.GothamBold
  quantity.TextSize=11
  quantity.TextXAlignment=Enum.TextXAlignment.Right
  quantity.TextColor3=Color3.fromRGB(252,239,201)
  quantity.TextStrokeTransparency=.2
  quantity.ZIndex=27
  quantity.Parent=slot
  local number=Instance.new("TextLabel")
  number.Name="SlotNumber"
  number.Text=index==10 and "0" or tostring(index)
  number.BackgroundTransparency=1
  number.Position=UDim2.fromOffset(3,1)
  number.Size=UDim2.fromOffset(12,11)
  number.TextColor3=Color3.fromRGB(249,234,208)
  number.Font=Enum.Font.GothamBold
  number.TextSize=10
  number.TextStrokeTransparency=.25
  number.ZIndex=27
  number.Parent=slot
  slot.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")~=true then hotbarActions[index]() end
  end)
  referenceHotbarSlots[index]=slot
end
-- [실제 인벤토리] 서버가 보유량을 확정한 회복약·기력약만 수량 표시.
local function refreshReferenceHotbar()
  for index,attribute in pairs({[5]="MeadowPotionHealth",[6]="MeadowPotionStamina"}) do
    local slot=referenceHotbarSlots[index]
    local caption=slot and slot:FindFirstChild("ItemCount")
    if caption then
      local amount=math.max(0,math.floor(tonumber(player:GetAttribute(attribute)) or 0))
      caption.Text=amount>0 and tostring(amount) or ""
    end
  end
end
for _,attribute in ipairs({"MeadowPotionHealth","MeadowPotionStamina"}) do
  player:GetAttributeChangedSignal(attribute):Connect(refreshReferenceHotbar)
end
refreshReferenceHotbar()
local function layoutMeadowReferenceHud()
  local v=meadowTouchLayer.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  -- [시안 기준 709x446] 상단 6개는 오른쪽 끝에서 34px 간격, 10칸 단축바는 화면 폭 49%로 정렬.
  local landscape=v.X>v.Y
  -- [모바일 터치] 엔진 품질검사(짧은 변 44 이상)를 모든 화면에서 만족하도록 메뉴 칸을 키운다.
  local step=landscape and math.floor(math.clamp(v.X/17,44,55))
    or math.floor(math.clamp((v.X-18)/6,44,52))
  local menuWidth=step*6
  meadowReferenceMenu.Size=UDim2.fromOffset(menuWidth,step+17)
  -- [최상단] 기본 메뉴 여백 위, 화면 맨 위 오른쪽에 붙인다.
  meadowReferenceMenu.Position=UDim2.new(1,-menuWidth-6,0,2)
  for index,button in ipairs(meadowReferenceMenu:GetChildren())do
    if button:IsA("TextButton") then
      button.Size=UDim2.fromOffset(step-3,step-3)
      button.Position=UDim2.fromOffset((index-1)*step+1,0)
      local caption=button:FindFirstChild("ReferenceCaption")
      if caption then caption.Size=UDim2.fromOffset(step+12,13) end
    end
  end
  -- [오른쪽 큰 버튼 영역 보호] 가로 화면에서 10칸이 들어가지 않으면 5칸 두 줄로 접는다.
  local dockScale=math.clamp((v.Y-20)/370,.76,1.12)*1.3
  local dockReserve=landscape and math.floor(226*dockScale)+8 or 0
  local tenWide=(landscape and math.floor(math.clamp(v.X/17,44,52)) or 44)*10+18
  local columns=5 -- [요청] 단축바는 1~5번 5칸만 표시
  local slotSize=landscape and math.floor(math.clamp(v.X/17,44,52))
    or math.floor(math.clamp((v.X-24)/columns-2,44,48))
  local gap=2
  local barWidth=(slotSize+gap)*columns-gap
  meadowReferenceHotbar.Size=UDim2.fromOffset(barWidth,slotSize)
  if landscape then
    -- 왼쪽 이동 조이스틱(약 150)과 오른쪽 전투 버튼 영역(약 150) 사이에 단축바를 둔다.
    local minCenter=150+barWidth/2
    local maxCenter=math.max(minCenter,v.X-dockReserve-barWidth/2)
    meadowReferenceHotbar.Position=UDim2.new(0,math.floor(math.clamp(v.X*.46,minCenter,maxCenter)),1,-13)
  else
    meadowReferenceHotbar.Position=UDim2.new(.5,0,1,-99)
  end
  for index,slot in ipairs(referenceHotbarSlots)do
    slot.Visible=index<=5
    slot.Size=UDim2.fromOffset(slotSize,slotSize)
    slot.Position=UDim2.fromOffset(((index-1)%columns)*(slotSize+gap),math.floor((index-1)/columns)*(slotSize+gap))
  end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowReferenceHud)
meadowTouchLayer:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowReferenceHud)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  local visible=gui:GetAttribute("GameMenuOpen")~=true
  meadowReferenceMenu.Visible=visible
  meadowReferenceHotbar.Visible=visible
end)
layoutMeadowReferenceHud()
end -- [아이콘 HUD] 연결 이벤트는 유지하고 최상위 레지스터는 반환한다.

local meadowHud=gui:FindFirstChild("MobileGameStatus")
if meadowHud then
  meadowAvatar.Parent=meadowHud;meadowAvatar.Visible=false
  title.Visible=false;multiplayerStatus.Visible=false
  meadowHud.Visible=false -- 레벨·웨이브 상태 패널 비표시
  meadowHud.BackgroundTransparency=1
  local border=meadowHud:FindFirstChildOfClass("UIStroke")
  if border then border.Enabled=false end
end
-- [화면 상단 HUD] 중앙 체력/스테미너는 CoreGui 안전영역에서 분리하고 기본 메뉴는 기존 터치 안전영역을 유지.
meadowVitalsGui=Instance.new("ScreenGui")
meadowVitalsGui.Name="MeadowTopVitals"
meadowVitalsGui.ResetOnSpawn=false
meadowVitalsGui.ScreenInsets=gui.ScreenInsets -- [모바일] Roblox 메뉴 안전영역과 일치
meadowVitalsGui.DisplayOrder=gui.DisplayOrder+1
meadowVitalsGui.Parent=gui.Parent
meadowHealthTrack.Parent=meadowVitalsGui
meadowHealthTrack.AnchorPoint=Vector2.new(.5,0)
meadowHealthTrack.ZIndex=9
-- [상단 상태 HUD / 지역 스코프] 기존 캐릭터·체력·기력·숙련도 표시를 유지하며 Luau 레지스터를 반환한다.
do
local meadowHealthFill=meadowHealthTrack:FindFirstChild("Fill")
if meadowHealthFill then
  meadowHealthFill.ZIndex=10
  meadowHealthFill.BackgroundColor3=Color3.fromRGB(190,57,63)
  local gradient=meadowHealthFill:FindFirstChildOfClass("UIGradient")
  if gradient then gradient.Color=ColorSequence.new(Color3.fromRGB(211,82,84),Color3.fromRGB(155,41,55)) end
end
local meadowHealthText=meadowHealthTrack:FindFirstChild("Value")
if meadowHealthText then meadowHealthText.ZIndex=11 end
-- [중앙 최상단 HUD] 기존 체력바와 서버 스테미너를 같은 폭으로 연속 표시한다.
local meadowEnergy=Instance.new("Frame")
meadowEnergy.Name="MeadowStamina"
meadowEnergy.AnchorPoint=Vector2.new(.5,0)
meadowEnergy.BackgroundColor3=Color3.fromRGB(17,24,31)
meadowEnergy.BorderSizePixel=0;meadowEnergy.ZIndex=9;meadowEnergy.Parent=meadowVitalsGui
local energyCorner=Instance.new("UICorner")
energyCorner.CornerRadius=UDim.new(1,0);energyCorner.Parent=meadowEnergy
energyFill=Instance.new("Frame")
energyFill.Name="StaminaFill";energyFill.Size=UDim2.fromScale(1,1)
energyFill.BackgroundColor3=Color3.fromRGB(55,142,223)
energyFill.BorderSizePixel=0;energyFill.ZIndex=10;energyFill.Parent=meadowEnergy
local energyFillCorner=Instance.new("UICorner")
energyFillCorner.CornerRadius=UDim.new(1,0);energyFillCorner.Parent=energyFill
energyLabel=Instance.new("TextLabel")
energyLabel.Name="StaminaLabel";energyLabel.Size=UDim2.fromScale(1,1)
energyLabel.BackgroundTransparency=1;energyLabel.Text="스테미너 100 / 100"
energyLabel.TextColor3=Color3.fromRGB(248,253,255)
energyLabel.TextSize=12;energyLabel.Font=Enum.Font.GothamBold
energyLabel.ZIndex=11;energyLabel.Parent=meadowEnergy
-- [아드레날린 바] 궁극기 게이지. 서버 MeadowAdrenaline 값을 표시만 한다.
meadowArt.adrBar=Instance.new("Frame")
meadowArt.adrBar.Name="MeadowAdrenaline";meadowArt.adrBar.BackgroundColor3=Color3.fromRGB(30,22,16)
meadowArt.adrBar.BorderSizePixel=0;meadowArt.adrBar.ZIndex=9;meadowArt.adrBar.Parent=meadowVitalsGui
Instance.new("UICorner",meadowArt.adrBar).CornerRadius=UDim.new(1,0)
meadowArt.adrFill=Instance.new("Frame")
meadowArt.adrFill.Name="AdrenalineFill";meadowArt.adrFill.Size=UDim2.fromScale(0,1)
meadowArt.adrFill.BackgroundColor3=Color3.fromRGB(224,128,52);meadowArt.adrFill.BorderSizePixel=0
meadowArt.adrFill.ZIndex=10;meadowArt.adrFill.Parent=meadowArt.adrBar
Instance.new("UICorner",meadowArt.adrFill).CornerRadius=UDim.new(1,0)
-- [상단 EXP] 기존 전투 숙련도 50단위 진행 상태를 표현만 하며 신규 저장값은 만들지 않는다.
local meadowExperience=Instance.new("Frame")
meadowExperience.Name="MeadowExperience"
meadowExperience.BackgroundColor3=Color3.fromRGB(17,20,22)
meadowExperience.BorderSizePixel=0
meadowExperience.ZIndex=9
meadowExperience.Parent=meadowVitalsGui
local meadowExpFill=Instance.new("Frame")
meadowExpFill.Name="ExperienceFill"
meadowExpFill.BackgroundColor3=Color3.fromRGB(171,148,105)
meadowExpFill.BorderSizePixel=0
meadowExpFill.ZIndex=10
meadowExpFill.Parent=meadowExperience
local meadowExpText=Instance.new("TextLabel")
meadowExpText.Name="ExperienceText"
meadowExpText.BackgroundTransparency=1
meadowExpText.Size=UDim2.fromScale(1,1)
meadowExpText.Font=Enum.Font.GothamBold
meadowExpText.TextSize=9
meadowExpText.TextColor3=Color3.fromRGB(240,231,212)
meadowExpText.ZIndex=11
meadowExpText.Parent=meadowExperience
-- [시안 좌상단] 아바타 얼굴, 실제 체력·스테미너, 닉네임을 하나의 작은 HUD로 표시한다.
local meadowPortrait=Instance.new("ImageButton")
meadowPortrait.Name="ReferenceCharacterPortrait"
meadowPortrait.BackgroundColor3=Color3.fromRGB(42,31,29)
meadowPortrait.BorderSizePixel=0
meadowPortrait.Image=meadowAvatar.Image
meadowPortrait.ZIndex=13
meadowPortrait.Parent=meadowVitalsGui
local portraitStroke=Instance.new("UIStroke")
portraitStroke.Color=Color3.fromRGB(190,147,95)
portraitStroke.Thickness=1.6
portraitStroke.Parent=meadowPortrait
local portraitCorner=Instance.new("UICorner")
portraitCorner.CornerRadius=UDim.new(0,5)
portraitCorner.Parent=meadowPortrait
meadowAvatar:GetPropertyChangedSignal("Image"):Connect(function()meadowPortrait.Image=meadowAvatar.Image end)
meadowPortrait.Activated:Connect(function()meadowMenu.open(1)end)
local meadowPortraitName=Instance.new("TextLabel")
meadowPortraitName.Name="ReferenceCharacterName"
meadowPortraitName.BackgroundTransparency=1
meadowPortraitName.TextColor3=Color3.fromRGB(250,244,230)
meadowPortraitName.TextStrokeTransparency=.4
meadowPortraitName.Font=Enum.Font.GothamBold
meadowPortraitName.TextSize=11
meadowPortraitName.TextXAlignment=Enum.TextXAlignment.Left
meadowPortraitName.ZIndex=12
meadowPortraitName.Parent=meadowVitalsGui
-- [상단 프로필] 아바타 얼굴과 HP·기력·숙련 EXP가 참고 화면처럼 세 줄로 붙는다.
local function layoutMeadowEnergy()
  local v=meadowVitalsGui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local landscape=v.X>v.Y
  local top=landscape and 8 or 9
  local portraitSize=landscape and 49 or 47
  local width=math.floor(math.clamp(v.X*(landscape and .17 or .24),111,158))
  local x=portraitSize+14
  meadowPortrait.Size=UDim2.fromOffset(portraitSize,portraitSize)
  meadowPortrait.Position=UDim2.fromOffset(9,top)
  meadowPortraitName.Position=UDim2.fromOffset(x,top-2)
  meadowPortraitName.Size=UDim2.fromOffset(width,16)
  meadowPortraitName.Text="Lv."..tostring(player:GetAttribute("Level") or 1).." "..player.DisplayName
  meadowHealthTrack.AnchorPoint=Vector2.new(0,0)
  meadowHealthTrack.Size=UDim2.fromOffset(width,11)
  meadowHealthTrack.Position=UDim2.fromOffset(x,top+16)
  meadowEnergy.AnchorPoint=Vector2.new(0,0)
  meadowEnergy.Size=UDim2.fromOffset(width,11)
  meadowEnergy.Position=UDim2.fromOffset(x,top+30)
  if meadowArt.adrBar then
    meadowArt.adrBar.Size=UDim2.fromOffset(width,6)
    meadowArt.adrBar.Position=UDim2.fromOffset(x,top+54)
    local adr=math.clamp(tonumber(player:GetAttribute("MeadowAdrenaline")) or 0,0,100)
    meadowArt.adrFill.Size=UDim2.fromScale(adr/100,1)
    meadowArt.adrFill.BackgroundColor3=adr>=100 and Color3.fromRGB(255,214,92) or Color3.fromRGB(224,128,52)
    meadowArt.adrBar.Visible=gui:GetAttribute("GameMenuOpen")~=true
  end
  local stamina=math.clamp(tonumber(player:GetAttribute("MeadowStamina")) or 0,0,100)
  energyFill.Size=UDim2.fromScale(stamina/100,1)
  energyLabel.Text=string.format("%d / 100",stamina)
  energyLabel.TextSize=10
  meadowExperience.Size=UDim2.fromOffset(width,8)
  meadowExperience.Position=UDim2.fromOffset(x,top+44)
  local mastery=math.max(0,tonumber(player:GetAttribute("CombatProficiency")) or 0)
  local _,pointProgress,pointCost=Config.TalentPointProgress(mastery)
  local progress=pointCost>0 and pointProgress/pointCost or 1
  meadowExpFill.Size=UDim2.fromScale(progress,1)
  meadowExpText.Text=string.format("EXP %.0f%%",progress*100)
  local visible=gui:GetAttribute("GameMenuOpen")~=true
  meadowPortrait.Visible=visible
  meadowPortraitName.Visible=visible
  meadowHealthTrack.Visible=visible
  meadowEnergy.Visible=visible
  meadowExperience.Visible=visible
end
meadowVitalsGui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowEnergy)
for _,attribute in ipairs({"Level","MeadowStamina","CombatProficiency","MeadowAdrenaline"}) do
  player:GetAttributeChangedSignal(attribute):Connect(layoutMeadowEnergy)
end
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(layoutMeadowEnergy)
layoutMeadowEnergy()
end -- [상단 상태 HUD] 연결된 표시·갱신 이벤트는 유지한다.

-- [왼쪽 HUD] 기본 메뉴 버튼을 감추고 퀘스트 도우미·캐릭터 단축창으로 교체한다.
-- [스토리·아이템 HUD] 실제 서버 퀘스트와 DataStore 소장 기록만 보여준다.
-- 중앙 게임 화면과 점프/전투 영역은 비워 두고 좌상단에 펼침 단추만 둔다.
local questTracker=Instance.new("TextButton")
_G.MeadowQuestTracker=questTracker
questTracker.Name="MeadowMainQuest"
questTracker.Size=UDim2.fromOffset(290,64)
questTracker.Position=UDim2.fromOffset(10,130)
-- [시안 퀘스트판] 오른쪽 작은 반투명 흑색 패널. 기존 퀘스트 데이터·버튼 기능은 유지한다.
questTracker.BackgroundColor3=Color3.fromRGB(19,19,18)
questTracker.BackgroundTransparency=.19
questTracker.BorderSizePixel=0
questTracker.AutoButtonColor=true
questTracker.Text=""
questTracker.ZIndex=8
questTracker.Parent=gui
meadowQuestGuideButton=questTracker
local trackerCorner=Instance.new("UICorner")
trackerCorner.CornerRadius=UDim.new(0,4)
trackerCorner.Parent=questTracker
local trackerStroke=Instance.new("UIStroke")
trackerStroke.Color=Color3.fromRGB(124,107,83)
trackerStroke.Transparency=.75
trackerStroke.Thickness=.8
trackerStroke.Parent=questTracker
local trackerTitle=Instance.new("TextLabel")
trackerTitle.Name="QuestTitle"
trackerTitle.Position=UDim2.fromOffset(12,5)
trackerTitle.Size=UDim2.new(1,-22,0,25)
trackerTitle.BackgroundTransparency=1
trackerTitle.TextColor3=Color3.fromRGB(255,238,174)
trackerTitle.TextXAlignment=Enum.TextXAlignment.Left
trackerTitle.Font=Enum.Font.GothamBold
trackerTitle.TextSize=15
trackerTitle.ZIndex=9
trackerTitle.Parent=questTracker
if meadowIconAtlas~="" then
  local icon=Instance.new("ImageLabel");icon.Name="CC0QuestIcon";icon.BackgroundTransparency=1
  icon.Image=meadowIconAtlas;icon.ImageRectOffset=Vector2.new(320,0);icon.ImageRectSize=Vector2.new(64,64)
  icon.Size=UDim2.fromOffset(22,22);icon.Position=UDim2.fromOffset(8,7);icon.ZIndex=10;icon.Parent=questTracker
  trackerTitle.Position=UDim2.fromOffset(36,5);trackerTitle.Size=UDim2.new(1,-44,0,25)
end
local trackerDetail=Instance.new("TextLabel")
trackerDetail.Name="QuestObjective"
trackerDetail.Position=UDim2.fromOffset(12,30)
trackerDetail.Size=UDim2.new(1,-22,0,29)
trackerDetail.BackgroundTransparency=1
trackerDetail.TextColor3=Color3.fromRGB(233,250,238)
trackerDetail.TextXAlignment=Enum.TextXAlignment.Left
trackerDetail.Font=Enum.Font.GothamMedium
trackerDetail.TextSize=12
trackerDetail.TextWrapped=true
trackerDetail.ZIndex=9
trackerDetail.Parent=questTracker
-- [퀘스트 추적] 메인 아래에 실제 진행 중인 마을·동료 서브 의뢰만 간추려 표시한다.
local trackerVillage=Instance.new("TextLabel")
trackerVillage.Name="QuestSideVillage"
trackerVillage.BackgroundTransparency=1
trackerVillage.TextColor3=Color3.fromRGB(206,228,209)
trackerVillage.Font=Enum.Font.GothamMedium
trackerVillage.TextSize=11
trackerVillage.TextWrapped=true
trackerVillage.TextXAlignment=Enum.TextXAlignment.Left
trackerVillage.TextYAlignment=Enum.TextYAlignment.Top
trackerVillage.ZIndex=9
trackerVillage.Parent=questTracker
local trackerCompanion=Instance.new("TextLabel")
trackerCompanion.Name="QuestSideCompanion"
trackerCompanion.BackgroundTransparency=1
trackerCompanion.TextColor3=Color3.fromRGB(206,228,209)
trackerCompanion.Font=Enum.Font.GothamMedium
trackerCompanion.TextSize=11
trackerCompanion.TextWrapped=true
trackerCompanion.TextXAlignment=Enum.TextXAlignment.Left
trackerCompanion.TextYAlignment=Enum.TextYAlignment.Top
trackerCompanion.ZIndex=9
trackerCompanion.Parent=questTracker
local trackerNavigation=Instance.new("TextLabel")
trackerNavigation.Name="QuestNavigation"
trackerNavigation.BackgroundTransparency=1
trackerNavigation.TextColor3=Color3.fromRGB(253,219,142)
trackerNavigation.Font=Enum.Font.GothamBold
trackerNavigation.TextSize=11
trackerNavigation.TextWrapped=false
trackerNavigation.TextTruncate=Enum.TextTruncate.AtEnd
trackerNavigation.TextXAlignment=Enum.TextXAlignment.Left
trackerNavigation.Text="길잡이 · 현재 의뢰 목표를 찾는 중"
trackerNavigation.ZIndex=9
trackerNavigation.Parent=questTracker
meadowQuestNavLabel=trackerNavigation

local journalScroll=meadowPages[3]
local function journalRow(name,height)
  local row=Instance.new("TextLabel")
  row.Name=name
  row.Size=UDim2.new(1,0,0,height)
  row.BackgroundColor3=Color3.fromRGB(36,35,39)
  row.BackgroundTransparency=.08
  row.BorderSizePixel=0
  row.TextXAlignment=Enum.TextXAlignment.Left
  row.TextYAlignment=Enum.TextYAlignment.Center
  row.TextColor3=Color3.fromRGB(240,251,238)
  row.Font=Enum.Font.GothamMedium
  row.TextSize=14
  row.TextWrapped=true
  row.ZIndex=73
  row.Parent=journalScroll
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,9)
  corner.Parent=row
  local outline=Instance.new("UIStroke")
  outline.Color=Color3.fromRGB(125,105,73);outline.Transparency=.64;outline.Parent=row
  local padding=Instance.new("UIPadding")
  padding.PaddingLeft=UDim.new(0,11)
  padding.PaddingRight=UDim.new(0,9)
  padding.Parent=row
  return row
end
local inventoryRow=journalRow("ResourceItems",52)
inventoryRow.Parent=meadowPages[2]
inventoryRow.LayoutOrder=1
inventoryRow.Visible=false -- 위 중복 배너 대신 실제 저장 상태 한 줄만 사용한다.
-- [인벤토리·스킬창] 위쳐식 분류·선택·상세 패널. 실제 서버 수치와 Roblox Tool만 사용한다.
-- [저장·밸런스 보존] 새로운 아이템, 효과, 드랍률, 스킬 포인트/잠금 상태를 만들지 않는다.
local renderWitcherInventory=(function()
local parchment=meadowParchment
local gold=meadowGold
local stone=Color3.fromRGB(20,43,43)
local muted=Color3.fromRGB(163,192,175)
local categories={"전체","보유","무기","방패","갑옷","장신구","소모품","재료","기록","재화"}
local data={
  {key="Wood",name="나무",category="재료",icon=4,art=34,color=Color3.fromRGB(194,146,83),description="초원에서 채집한 나무. 장비 제작, 무기 강화, 건설에 사용돼."},
  {key="Stone",name="돌",category="재료",icon=4,art=35,color=Color3.fromRGB(169,191,200),description="바위에서 채집한 돌. 장비 제작, 무기 강화, 건설에 사용돼."},
  {key="ResearchRecords",name="기사단 연대기",category="기록",icon=5,color=Color3.fromRGB(221,183,111),description="메인 의뢰에서 발견한 기사단 기록. 획득한 내용은 저널에 보관돼."},
  {key="Coins",name="소지금",category="재화",icon=4,color=Color3.fromRGB(226,191,92),description="서버에 기록된 현재 소지금."},
}
for _,mat in ipairs(Config.Materials)do
  data[#data+1]={key=mat.Field,name=mat.Name,category="재료",icon=4,mat=mat,
    color=Color3.fromRGB(mat.Color[1],mat.Color[2],mat.Color[3]),
    description="["..mat.Kind.."] "..mat.Desc.."\n판매가 "..mat.Value.." 재화"}
end
-- [장비 도감] 모든 제작법을 현재 가방에 표시하고 소유/장착은 서버 속성만 신뢰한다.
for index,gear in ipairs(Config.MeadowEquipment or {})do
  data[#data+1]={key="rpg-gear:"..gear.Id,name=gear.Name,category=gear.Category,icon=gear.Icon or 3,
    color=meadowArt.rarityColor[gear.Rarity or "Common"] or Color3.fromRGB(176,176,170),art=(gear.Art or index)-1,
    description=gear.Desc,gear=gear,index=index}
end
for _,tonic in ipairs(Config.MeadowConsumables or {})do
  data[#data+1]={key="rpg-tonic:"..tonic.Id,name=tonic.Name,category="소모품",icon=tonic.Icon or 7,
    color=Color3.fromRGB(136,207,150),art=(tonic.Art or 33)-1,description=tonic.Desc,tonic=tonic}
end
local backpack=player:FindFirstChildOfClass("Backpack") or player:FindFirstChild("Backpack")
local filterBar,filterButtons=CommonUI.CreateFilterBar({name="WitcherItemCategories",filters=categories,selectedIndex=1})
filterBar.LayoutOrder=2;filterBar.Size=UDim2.new(1,-8,0,40);filterBar.Parent=meadowPages[2]
for _,filterButton in ipairs(filterButtons)do filterButton.Size=UDim2.fromOffset(filterButton.Size.X.Offset,36) end
-- [인벤토리 검색] 이미 서버에 등록된 항목만 필터링하며 장비/소모품 기능은 그대로 사용한다.
local inventorySearch=CommonUI.CreateSearchField({
  name="MeadowInventorySearch",size=UDim2.new(1,-8,0,40)
})
inventorySearch.PlaceholderText="아이템 이름 검색"
inventorySearch.LayoutOrder=3;inventorySearch.BackgroundColor3=Color3.fromRGB(25,53,49)
inventorySearch.Parent=meadowPages[2]
-- [인벤토리 화면] 세로: 검색→격자→상세 / 가로: 격자와 상세를 나란히 둔다.
local inventoryWorkspace=Instance.new("Frame")
inventoryWorkspace.Name="MeadowInventoryWorkspace";inventoryWorkspace.LayoutOrder=4
inventoryWorkspace.Size=UDim2.new(1,-8,0,330);inventoryWorkspace.BackgroundTransparency=1
inventoryWorkspace.Parent=meadowPages[2]
local inventoryCount=Instance.new("TextLabel")
inventoryCount.Name="InventoryResultCount";inventoryCount.Position=UDim2.fromOffset(2,0)
inventoryCount.Size=UDim2.new(1,-4,0,25);inventoryCount.BackgroundTransparency=1
inventoryCount.TextColor3=muted;inventoryCount.Font=Enum.Font.GothamMedium;inventoryCount.TextSize=13
inventoryCount.TextXAlignment=Enum.TextXAlignment.Left;inventoryCount.Parent=inventoryWorkspace
local inventoryScroll=Instance.new("ScrollingFrame")
inventoryScroll.Name="MeadowInventoryItemScroll";inventoryScroll.Position=UDim2.fromOffset(0,30)
inventoryScroll.Size=UDim2.new(1,0,0,130);inventoryScroll.BackgroundTransparency=1;inventoryScroll.BorderSizePixel=0
inventoryScroll.ScrollBarThickness=3;inventoryScroll.ScrollingDirection=Enum.ScrollingDirection.Y;inventoryScroll.ClipsDescendants=true
inventoryScroll.AutomaticCanvasSize=Enum.AutomaticSize.Y;inventoryScroll.CanvasSize=UDim2.new()
inventoryScroll.ScrollingEnabled=false;inventoryScroll.Parent=inventoryWorkspace
local inventoryGrid=Instance.new("Frame")
inventoryGrid.Name="MeadowInventoryGrid";inventoryGrid.LayoutOrder=4
inventoryGrid.Size=UDim2.new(1,-6,0,100);inventoryGrid.BackgroundTransparency=1
inventoryGrid.Parent=inventoryScroll
local gridLayout=Instance.new("UIGridLayout")
gridLayout.SortOrder=Enum.SortOrder.LayoutOrder;gridLayout.CellPadding=UDim2.fromOffset(8,8)
gridLayout.Parent=inventoryGrid
local detail=Instance.new("Frame")
detail.Name="WitcherItemDetails";detail.LayoutOrder=6
detail.Size=UDim2.new(1,-8,0,268);detail.BorderSizePixel=0;detail.BackgroundColor3=stone
detail.Parent=inventoryWorkspace
local detailGradient=Instance.new("UIGradient")
detailGradient.Color=ColorSequence.new(Color3.fromRGB(38,77,63),Color3.fromRGB(14,31,40))
detailGradient.Rotation=42;detailGradient.Parent=detail
local detailCorner=Instance.new("UICorner");detailCorner.CornerRadius=UDim.new(0,12);detailCorner.Parent=detail
local border=Instance.new("UIStroke")
border.Color=gold;border.Transparency=.2;border.Thickness=1.4;border.Parent=detail
-- [선택 아이템] 기존 등록 아이콘을 확대 표시한다.
local detailPreview=Instance.new("ImageLabel")
detailPreview.Name="SelectedItemIcon";detailPreview.AnchorPoint=Vector2.new(1,0)
detailPreview.Position=UDim2.new(1,-12,0,10);detailPreview.Size=UDim2.fromOffset(54,54)
detailPreview.BackgroundColor3=Color3.fromRGB(15,37,39);detailPreview.BorderSizePixel=0
detailPreview.Image=meadowIconAtlas;detailPreview.ImageRectSize=Vector2.new(64,64);detailPreview.Parent=detail
local detailIconCorner=Instance.new("UICorner")
detailIconCorner.CornerRadius=UDim.new(0,8);detailIconCorner.Parent=detailPreview
local title=Instance.new("TextLabel")
title.Name="SelectedItem";title.Position=UDim2.fromOffset(12,8)
title.Size=UDim2.new(1,-90,0,32);title.BackgroundTransparency=1
title.TextColor3=gold;title.Font=Enum.Font.GothamBold;title.TextSize=18
title.TextXAlignment=Enum.TextXAlignment.Left;title.Parent=detail
-- [긴 아이템 설명] 안내와 부족 재료·서버 피드백이 잘리지 않게 본문만 스크롤한다.
local descriptionScroll=Instance.new("ScrollingFrame")
descriptionScroll.Name="SelectedItemDescriptionScroll";descriptionScroll.Position=UDim2.fromOffset(12,68)
descriptionScroll.Size=UDim2.new(1,-24,0,136);descriptionScroll.BackgroundTransparency=1
descriptionScroll.BorderSizePixel=0;descriptionScroll.ScrollBarThickness=3
descriptionScroll.ScrollingDirection=Enum.ScrollingDirection.Y
descriptionScroll.CanvasSize=UDim2.new();descriptionScroll.AutomaticCanvasSize=Enum.AutomaticSize.Y
descriptionScroll.Parent=detail
local description=Instance.new("TextLabel")
description.Name="SelectedItemDescription";description.Position=UDim2.fromOffset(0,0)
description.Size=UDim2.new(1,-7,0,0);description.AutomaticSize=Enum.AutomaticSize.Y
description.BackgroundTransparency=1
description.Font=Enum.Font.GothamMedium;description.TextColor3=parchment;description.TextSize=13
description.TextWrapped=true;description.TextXAlignment=Enum.TextXAlignment.Left
description.TextYAlignment=Enum.TextYAlignment.Top;description.Parent=descriptionScroll
local equip=CommonUI.CreatePrimaryButton({name="WitcherEquipTool",text="선택 장비 착용",minHeight=48})
equip.Position=UDim2.fromOffset(12,210);equip.Size=UDim2.new(1,-24,0,48)
equip.BackgroundColor3=Color3.fromRGB(54,112,84);equip.Visible=false;equip.Parent=detail
local secondary=CommonUI.CreatePrimaryButton({name="WitcherSecondaryItemAction",text="소모품 조합",minHeight=48})
secondary.Position=UDim2.new(.5,4,0,210);secondary.Size=UDim2.new(.5,-16,0,48)
secondary.BackgroundColor3=Color3.fromRGB(55,95,87);secondary.Visible=false;secondary.Parent=detail
local inventoryEmpty=Instance.new("TextLabel")
inventoryEmpty.Name="MeadowInventoryEmpty";inventoryEmpty.LayoutOrder=5
inventoryEmpty.Position=UDim2.fromOffset(0,12)
inventoryEmpty.Size=UDim2.new(1,-8,0,60);inventoryEmpty.BackgroundTransparency=1
inventoryEmpty.Text="검색 조건에 맞는 항목이 없어.";inventoryEmpty.Font=Enum.Font.GothamMedium
inventoryEmpty.TextSize=14;inventoryEmpty.TextColor3=muted;inventoryEmpty.Visible=false
inventoryEmpty.Parent=inventoryScroll
local itemCards={}
local itemRows={}
local selectedKey="Wood"
local category="전체"
local function owned(item)
  if item.gear then
    local mask=math.max(0,tonumber(player:GetAttribute(item.index>96 and "MeadowGearOwned4" or item.index>64 and "MeadowGearOwned3" or item.index>32 and "MeadowGearOwned2" or "MeadowGearOwned")) or 0)
    return bit32.band(mask,bit32.lshift(1,(item.index-1)%32))~=0 and 1 or 0
  end
  if item.tonic then
    local key=item.tonic.Id=="herbal_tonic" and "MeadowPotionHealth" or "MeadowPotionStamina"
    return math.max(0,tonumber(player:GetAttribute(key)) or 0)
  end
  if typeof(item.key)=="Instance" then return item.key.Parent~=nil and 1 or 0 end
  return math.max(0,tonumber(player:GetAttribute(item.key)) or 0)
end
local function nearAnvil()
  local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  if not root then return false end
  local st=Config.SmithStations.Anvil
  local dx,dz=root.Position.X-st.X,root.Position.Z-st.Z
  if dx*dx+dz*dz<=st.Radius*st.Radius then return true end
  for _,site in ipairs(Config.CraftSites or {}) do
    local sx,sz=root.Position.X-site.X,root.Position.Z-site.Z
    if sx*sx+sz*sz<=(st.Radius+4)*(st.Radius+4) then return true end
  end
  return false
end
local function itemValue(item)
  if item.gear then
    return owned(item)>0 and (player:GetAttribute("MeadowEquip"..item.gear.Slot)==item.index and "장착 중" or "보유") or "미보유 · 제작법"
  end
  if item.tonic then return tostring(math.floor(owned(item))).."개" end
  if typeof(item.key)=="Instance" then return item.key.Parent==player.Character and "장착 중" or "보유" end
  if item.key=="ResearchRecords" then return tostring(math.min(owned(item),#(Config.StoryRecords or {}))).."/"..tostring(#(Config.StoryRecords or {})) end
  return tostring(math.floor(owned(item)))
end
local detailPreview3D=nil
local function redrawSelection()
  local item=itemRows[selectedKey]
  if not item then
    title.Text="선택된 아이템 없음";description.Text="해당 분류에 맞는 아이템이 없어."
    detailPreview.Visible=false
    if detailPreview3D then meadowArt.set3D(detailPreview3D,nil);detailPreview3D.Visible=false end
    equip.Visible=false;secondary.Visible=false
    return
  end
  title.Text=item.name.."  /  "..item.category
  detailPreview.Visible=true
  detailPreview.Image=meadowIconAtlas;detailPreview.ImageRectSize=Vector2.new(64,64)
  detailPreview.ImageRectOffset=Vector2.new(item.icon*64,0)
  meadowArt.gear(detailPreview,item.art)
  if not detailPreview3D then detailPreview3D=meadowArt.new3D(detailPreview) end
  meadowArt.set3D(detailPreview3D,meadowArt.itemKeyFor(item),meadowArt.itemTintFor(item))
  detailPreview.Visible=not meadowArt.has3D(detailPreview3D)
  detailPreview3D.Visible=not detailPreview.Visible
  local recipe=item.gear or item.tonic
  local cost=""
  if recipe then
    local parts={}
    local names={Wood="나무",Stone="돌",Coins="재화"}
    for _,mat in ipairs(Config.Materials)do names[mat.Field]=mat.Name end
    for _,field in ipairs(Config.CostFields)do
      local need=recipe[field] or 0
      if need>0 and (field=="Ingot" or field=="Leather") then
        need=math.max(1,need-Config.SmithingRank(player:GetAttribute("SmithXp") or 0))
      end
      if need>0 then
        local have=math.floor(tonumber(player:GetAttribute(field)) or 0)
        parts[#parts+1]=string.format("%s %d/%d%s",names[field],have,need,have>=need and "" or " ✗")
      end
    end
    cost="제작 재료: "..table.concat(parts," · ")
    if item.gear and item.gear.ForgeOnly then
      cost="대장간 모루에서 제작 · 대장 Lv"..tostring(Config.SmithLevel(player:GetAttribute("SmithXp") or 0)).." (요구량 -"..tostring(Config.SmithingRank(player:GetAttribute("SmithXp") or 0))..")\n"..cost
    end
  end
  local classKey=item.gear and Config.GearWeaponClass and Config.GearWeaponClass[item.gear.Id]
  local classInfo=classKey and Config.WeaponClasses[classKey]
  local stats=item.gear and string.format("%s 등급  ·  공격 +%d  ·  방어 +%d\n%s%s",meadowArt.rarityName[item.gear.Rarity or "Common"] or "일반",item.gear.Attack or 0,item.gear.Defense or 0,
    classInfo and ("무기 계열 "..classInfo.Name.."  ·  어울리는 스킬 강화\n") or "",
    (item.gear.Need or 0)>0 and string.format("필요 전투 숙련 %d\n",item.gear.Need) or "") or ""
  -- [단순 비교] 같은 칸에 지금 끼고 있는 장비와 공격·방어 차이만 한 줄로 보여 준다.
  local compare=""
  if item.gear and player:GetAttribute("MeadowEquip"..item.gear.Slot)~=item.index then
    for _,other in pairs(itemRows) do
      if type(other)=="table" and other.gear and other.gear.Slot==item.gear.Slot
        and player:GetAttribute("MeadowEquip"..other.gear.Slot)==other.index then
        local function diff(label,a,b)
          local d=(a or 0)-(b or 0)
          return d==0 and label.." 같음" or string.format("%s %s%d",label,d>0 and "▲+" or "▼",d)
        end
        compare=string.format("비교 (지금 %s)  %s · %s\n",other.name,diff("공격",item.gear.Attack,other.gear.Attack),diff("방어",item.gear.Defense,other.gear.Defense))
        break
      end
    end
  end
  local feedback=player:GetAttribute("MeadowGearMessage")
  description.Text="소지 / 상태   "..itemValue(item).."\n"..stats..compare..(cost~="" and cost.."\n" or "")..
    item.description..(recipe and typeof(feedback)=="string" and ("\n"..feedback) or "")
  -- 광석·가죽 같은 날것은 '제련/무두질' 버튼이 같이 보이고, 가공품은 판매만 한다.
  local refineSource=nil
  for _,mat in ipairs(Config.Materials)do
    if mat.Refine and mat.Refine.From==(item.mat and item.mat.Field) then refineSource=mat end
  end
  local isArmor=item.gear~=nil and (item.gear.Slot=="Chest" or item.gear.Slot=="Hands" or item.gear.Slot=="Legs" or item.gear.Slot=="Feet")
    and owned(item)>0
  local armorTier=tonumber(player:GetAttribute("ArmorTier")) or 0
  if isArmor then
    local ingot,leather=Config.ArmorTemperCost(armorTier,player:GetAttribute("SmithXp") or 0)
    secondary.Text=armorTier>=10 and "갑옷 단련 최대" or string.format("갑옷 단련 +%d → +%d  (주괴 %d · 가죽 %d)",armorTier,armorTier+1,ingot,leather)
  else
    secondary.Text=item.tonic and "연금 작업대에서 조합" or (refineSource and refineSource.Refine.Verb.."  ("..refineSource.Refine.Note..")" or "소모품 조합")
  end
  secondary.Visible=item.tonic~=nil or refineSource~=nil or isArmor
  equip.Size=secondary.Visible and UDim2.new(.5,-16,0,48) or UDim2.new(1,-24,0,48)
  for key,card in pairs(itemCards)do
    local selected=key==selectedKey
    card.border.Color=selected and gold or Color3.fromRGB(78,123,102)
    card.border.Thickness=selected and 2.2 or 1
    card.button.BackgroundColor3=selected and Color3.fromRGB(54,94,75)
      or (owned(itemRows[key])>0 and Color3.fromRGB(27,54,48) or Color3.fromRGB(20,39,40))
  end
  equip.Visible=item.gear~=nil or item.tonic~=nil or item.mat~=nil or typeof(item.key)=="Instance"
  if equip.Visible then
    if item.gear then
      local has=owned(item)>0
      local worn=player:GetAttribute("MeadowEquip"..item.gear.Slot)==item.index
      -- [스카이림식 제작] 제작은 대장간 모루에서만. 가방은 제작법·재료 확인과 장착만 한다.
      local atAnvil=nearAnvil()
      equip.Text=not has and (atAnvil and "제작" or "대장간 모루에서 제작") or worn and "장착 해제" or "장착"
      equip.Active=(has or atAnvil) and player:GetAttribute("ProfileReady")==true
    elseif item.tonic then
      equip.Text="물약 사용"
      equip.Active=owned(item)>0 and player:GetAttribute("ProfileReady")==true
    elseif item.mat then
      equip.Text=string.format("1개 판매  +%d 재화",item.mat.Value)
      equip.Active=owned(item)>0 and player:GetAttribute("ProfileReady")==true
    else
      local equipped=item.key.Parent==player.Character
      equip.Text=equipped and "현재 장착 중" or "장착"
      equip.Active=not equipped and player:GetAttribute("ProfileReady")==true
    end
    equip.AutoButtonColor=equip.Active
  end
end
local function makeCard(item)
  local card=Instance.new("TextButton")
  card.Name="OwnedItemSlot";card.Text="";card.AutoButtonColor=true;card.ZIndex=44
  -- [등급색 카드] 인기 로블록스 게임처럼 아이템 색을 바탕과 굵은 테두리에 쓴다.
  card.BackgroundColor3=item.color:Lerp(Color3.new(0,0,0),.7);card.BorderSizePixel=0;card.Parent=inventoryGrid
  local rounded=Instance.new("UICorner");rounded.CornerRadius=UDim.new(0,12);rounded.Parent=card
  local cardShine=Instance.new("UIGradient")
  cardShine.Color=ColorSequence.new(item.color:Lerp(Color3.new(1,1,1),.08),Color3.fromRGB(12,22,26))
  cardShine.Rotation=90;cardShine.Transparency=NumberSequence.new(.35,.05);cardShine.Parent=card
  local outline=Instance.new("UIStroke");outline.Color=item.color;outline.Thickness=2;outline.Transparency=.1;outline.Parent=card
  local icon=Instance.new("ImageLabel")
  icon.Name="ExistingAssetIcon";icon.BackgroundTransparency=1;icon.Image=meadowIconAtlas;icon.ZIndex=45
  icon.ImageRectOffset=Vector2.new(item.icon*64,0);icon.ImageRectSize=Vector2.new(64,64)
  meadowArt.gear(icon,item.art)
  icon.Size=UDim2.fromOffset(50,50);icon.AnchorPoint=Vector2.new(.5,0)
  icon.Position=UDim2.new(.5,0,0,3);icon.Parent=card
  do
    local key3d=meadowArt.itemKeyFor(item)
    if key3d then meadowArt.set3D(meadowArt.new3D(icon),key3d,meadowArt.itemTintFor(item)) end
  end
  local name=Instance.new("TextLabel")
  name.Name="ItemName";name.Position=UDim2.new(0,3,0,53);name.Size=UDim2.new(1,-6,0,20)
  name.BackgroundTransparency=1;name.Font=Enum.Font.GothamBold;name.TextSize=12;name.TextColor3=Color3.fromRGB(255,255,255);name.ZIndex=45
  name.TextStrokeColor3=Color3.fromRGB(0,0,0);name.TextStrokeTransparency=.35
  name.TextXAlignment=Enum.TextXAlignment.Center;name.TextTruncate=Enum.TextTruncate.AtEnd;name.Parent=card
  local value=Instance.new("TextLabel")
  value.Name="OwnedCount";value.Position=UDim2.new(0,3,0,74);value.Size=UDim2.new(1,-6,0,24)
  value.BackgroundTransparency=1;value.Font=Enum.Font.GothamBold;value.TextSize=13;value.ZIndex=45
  value.TextXAlignment=Enum.TextXAlignment.Center;value.TextColor3=item.color;value.Parent=card
  card.Activated:Connect(function()
    selectedKey=item.key
    redrawSelection()
    -- [선택 이동] 가로 화면은 옆의 상세를 유지하고 세로 화면은 상세 카드로 이동한다.
    local page=meadowPages[2]
    if inventoryWorkspace:GetAttribute("SplitLayout")==true then
      local workspaceTop=page.CanvasPosition.Y+inventoryWorkspace.AbsolutePosition.Y-page.AbsolutePosition.Y
      page.CanvasPosition=Vector2.new(0,math.max(0,workspaceTop-6))
    else
      local detailTop=page.CanvasPosition.Y+detail.AbsolutePosition.Y-page.AbsolutePosition.Y
      page.CanvasPosition=Vector2.new(0,math.max(0,detailTop-8))
    end
  end)
  return {button=card,name=name,count=value,border=outline}
end
-- [반응형 가방] 작은 화면은 3열+아래 상세, 넓은 화면은 독립 스크롤 격자+고정 상세.
local inventoryShownCount=0
local inventoryTotalCount=0
local function layoutInventoryWorkspace()
  local width=inventoryWorkspace.AbsoluteSize.X
  if width<=0 then return end
  local split=width>=420
  local leftWidth=split and math.floor(width*.55) or width
  local gridHeight=inventoryShownCount==0 and 74 or math.max(110,gridLayout.AbsoluteContentSize.Y+6)
  inventoryWorkspace:SetAttribute("SplitLayout",split)
  inventoryCount.Text=string.format("표시 %d개 / 전체 %d개  ·  선택해서 자세히 보기",inventoryShownCount,inventoryTotalCount)
  inventoryCount.Size=UDim2.new(split and 0 or 1,split and (leftWidth-4) or -4,0,25)
  inventoryScroll.Position=UDim2.fromOffset(0,30)
  inventoryScroll.Size=UDim2.fromOffset(leftWidth,split and 232 or gridHeight)
  inventoryScroll.ScrollingEnabled=split
  detail.Position=split and UDim2.fromOffset(leftWidth+12,0)
    or UDim2.fromOffset(0,30+gridHeight+12)
  detail.Size=split and UDim2.fromOffset(width-leftWidth-12,268) or UDim2.fromOffset(width,268)
  inventoryWorkspace.Size=UDim2.new(1,-8,0,split and 282 or 30+gridHeight+12+268)
end
local function layoutGrid()
  local width=inventoryGrid.AbsoluteSize.X
  if width<=0 then return end
  local columns=math.clamp(math.floor((width+8)/103),2,6)
  local cell=math.floor((width-(columns-1)*8-4)/columns)
  gridLayout.CellSize=UDim2.fromOffset(math.max(82,cell),104)
  inventoryGrid.Size=UDim2.new(1,-6,0,math.max(110,gridLayout.AbsoluteContentSize.Y+5))
  layoutInventoryWorkspace()
end
inventoryWorkspace:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutInventoryWorkspace)
inventoryGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutGrid)
gridLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
  inventoryGrid.Size=UDim2.new(1,-6,0,math.max(110,gridLayout.AbsoluteContentSize.Y+5))
  layoutInventoryWorkspace()
end)
task.defer(layoutGrid)
local function renderInventory()
  local actual={}
  for _,item in ipairs(data)do actual[#actual+1]=item end
  local function collectTools(holder)
    if not holder then return end
    for _,tool in ipairs(holder:GetChildren())do
      if tool:IsA("Tool") then
        actual[#actual+1]={key=tool,name=tool.Name,category="무기",icon=2,
          color=Color3.fromRGB(194,208,230),description="실제 가방 또는 캐릭터에 존재하는 장비. 착용은 Roblox 기존 장착 기능을 사용해."}
      end
    end
  end
  backpack=player:FindFirstChildOfClass("Backpack") or player:FindFirstChild("Backpack") or backpack
  collectTools(player.Character)
  collectTools(backpack)
  local present={}
  local order=0
  local visibleCount=0
  local firstVisible=nil
  local search=string.lower(inventorySearch.Text):gsub("^%s+",""):gsub("%s+$","")
  for _,item in ipairs(actual)do
    if not present[item.key] then
      present[item.key]=true;order+=1
      itemRows[item.key]=item
      local card=itemCards[item.key]
      if not card then
        card=makeCard(item);itemCards[item.key]=card
      end
      card.button.LayoutOrder=order
      card.name.Text=item.name
      card.count.Text=itemValue(item)
      card.count.TextColor3=item.color
      local matches=search=="" or string.find(string.lower(item.name),search,1,true)~=nil
      local show=matches and (category=="전체" or (category=="보유" and owned(item)>0) or category==item.category)
        and (item.gear~=nil or item.tonic~=nil or typeof(item.key)=="Instance" or owned(item)>0 or category=="전체")
      card.button.Visible=show
      if show then visibleCount+=1 end
      card.button.BackgroundColor3=owned(item)>0 and Color3.fromRGB(27,54,48) or Color3.fromRGB(20,39,40)
      if show and not firstVisible then firstVisible=item.key end
    end
  end
  for key,card in pairs(itemCards)do
    if not present[key] then card.button:Destroy();itemCards[key]=nil;itemRows[key]=nil end
  end
  if not selectedKey or not present[selectedKey] or not itemCards[selectedKey].button.Visible then
    selectedKey=firstVisible
  end
  inventoryShownCount=visibleCount
  inventoryTotalCount=#actual
  inventoryEmpty.Visible=visibleCount==0
  inventoryGrid.Visible=visibleCount>0
  redrawSelection()
  layoutGrid()
end
inventorySearch:GetPropertyChangedSignal("Text"):Connect(renderInventory)
for index,button in ipairs(filterButtons)do
  button.Activated:Connect(function()
    category=categories[index]
    for i,tab in ipairs(filterButtons)do
      local current=i==index
      tab.BackgroundColor3=current and Color3.fromRGB(54,112,84) or Color3.fromRGB(24,49,45)
      tab.TextColor3=current and Color3.fromRGB(255,240,197) or Color3.fromRGB(191,215,198)
      local underline=tab:FindFirstChild("SelectedUnderline")
      if underline then underline.Visible=current end
      local stroke=tab:FindFirstChildOfClass("UIStroke")
      if stroke then stroke.Color=current and gold or Color3.fromRGB(78,120,101) end
    end
    renderInventory()
  end)
  button.BackgroundColor3=index==1 and Color3.fromRGB(54,112,84) or Color3.fromRGB(24,49,45)
end
equip.Activated:Connect(function()
  if player:GetAttribute("ProfileReady")~=true then return end
  local item=itemRows[selectedKey]
  if not item then return end
  if item.gear then
    -- 제작은 대장간 모루 근처에서만(서버도 같은 거리를 다시 검사한다).
    if owned(item)<1 and not nearAnvil() then return end
    local op=owned(item)<1 and "craft" or
      (player:GetAttribute("MeadowEquip"..item.gear.Slot)==item.index and "unequip" or "equip")
    remote:FireServer("meadow:rpg:gear:"..op..":"..item.gear.Id)
  elseif item.tonic then
    remote:FireServer("meadow:rpg:tonic:use:"..item.tonic.Id)
  elseif item.mat then
    remote:FireServer("meadow:rpg:loot:sell:"..item.mat.Field)
  else
    local tool=selectedKey
    if typeof(tool)~="Instance" or not tool:IsA("Tool") or not backpack or tool.Parent~=backpack then return end
    local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
    if human and human.Health>0 then human:EquipTool(tool) end
  end
  renderInventory()
end)
secondary.Activated:Connect(function()
  local item=itemRows[selectedKey]
  if item and item.gear and player:GetAttribute("ProfileReady")==true then
    remote:FireServer("meadow:rpg:gear:temper:"..item.gear.Id)
  elseif item and item.tonic and player:GetAttribute("ProfileReady")==true then
    remote:FireServer("meadow:rpg:tonic:craft:"..item.tonic.Id)
  elseif item and item.mat and player:GetAttribute("ProfileReady")==true then
    for _,mat in ipairs(Config.Materials)do
      if mat.Refine and mat.Refine.From==item.mat.Field then
        remote:FireServer("meadow:rpg:loot:refine:"..mat.Field)
      end
    end
  end
end)
local function watchBackpack(bag)
  if not bag or not bag:IsA("Backpack") then return end
  bag.ChildAdded:Connect(renderInventory)
  bag.ChildRemoved:Connect(renderInventory)
end
watchBackpack(backpack)
player.ChildAdded:Connect(function(child)
  if child:IsA("Backpack") then backpack=child;watchBackpack(child);renderInventory() end
end)
player.CharacterAdded:Connect(function(character)
  character.ChildAdded:Connect(renderInventory)
  character.ChildRemoved:Connect(renderInventory)
  renderInventory()
end)
if player.Character then
  player.Character.ChildAdded:Connect(renderInventory)
  player.Character.ChildRemoved:Connect(renderInventory)
end
for _,name in ipairs({"Wood","Stone","RedLeaf","Moonbloom","Mushroom","Ore","Crystal","Magma","Hide","Fang","BatWing","Claw","Ectoplasm","Ingot","Steel","Meat","Feather","SmithXp","Leather","Coins","ResearchRecords","ProfileReady","MeadowGearOwned","MeadowGearOwned2",
  "MeadowEquipWeapon","MeadowEquipChest","MeadowEquipHands","MeadowEquipLegs","MeadowEquipFeet",
  "MeadowGearOwned3","MeadowGearOwned4","MeadowEquipAccessory","MeadowEquipCape","MeadowEquipShield","MeadowPotionHealth","MeadowPotionStamina","MeadowGearRevision"})do
  player:GetAttributeChangedSignal(name):Connect(renderInventory)
end
renderInventory()

-- [스킬창] 위쳐식 계열 카드. 기존 실제 Config.Actions만 사용하며 서버 기술을 재구현하지 않는다.
meadowLabels[7].LayoutOrder=1
meadowLabels[7].Text="마력숲 전투 기술  ·  실제 사용 가능 기술\n기술 카드 선택 → 설명 확인 → 사용"
meadowLabels[7].TextColor3=parchment
meadowLabels[7].Font=Enum.Font.GothamBold
local skillCategories={"전체","전사","수호","사냥","그림자","마력"}
local skillColors={
  ["전사"]=Color3.fromRGB(194,83,76),["수호"]=Color3.fromRGB(213,175,92),
  ["사냥"]=Color3.fromRGB(125,178,115),["그림자"]=Color3.fromRGB(168,128,190),
  ["무예"]=Color3.fromRGB(194,83,76),["마력"]=Color3.fromRGB(91,161,216),
  ["방어"]=Color3.fromRGB(213,175,92),["기동"]=Color3.fromRGB(110,182,144),
  ["기타"]=Color3.fromRGB(182,171,159),
}
local skillInfo={
  ["skill-meadow-heavy"]={"전사","앞의 적 한 마리를 세게 베어. 가까이서 써.",2},
  ["skill-meadow-sweep"]={"전사","빙글 돌며 주변 적 최대 5마리를 한 번에 베어.",2},
  ["skill-meadow-bolt"]={"마력","멀리 있는 적에게 마력 탄환을 쏴. 안전하게 원거리 공격.",7},
  ["skill-meadow-guard"]={"수호","방패를 들어 막아. 막기 시작 직후엔 피해를 거의 안 받아.",3},
  ["skill-meadow-parry"]={"수호","타이밍 맞춰 적 공격을 튕겨내. 어렵지만 강해.",3},
  ["skill-meadow-dodge-left"]={"그림자","왼쪽으로 재빨리 피해. 트리에서 찍을수록 연속으로 피할 수 있어.",6},
  ["skill-meadow-dodge-right"]={"그림자","오른쪽으로 재빨리 피해. 트리에서 찍을수록 연속으로 피할 수 있어.",6},
  ["skill-meadow-sprint"]={"그림자","빠르게 달려. 적에게 붙거나 도망칠 때 써.",6},
  ["skill-meadow-heal"]={"마력","체력을 회복해. 위험할 때 써.",7},
  ["skill-meadow-focus"]={"마력","잠깐 마력을 모아 강해져.",7},
  ["skill-meadow-oath"]={"수호","각성기. 체력 회복 + 주변 적 전체에 3배 피해. 재사용 90초.",2},
  ["skill-meadow-ultimate"]={"전사","궁극기. 아드레날린 100%일 때 발동, 무기마다 A/B 변형 선택. 대검 지면 강타/회전 휩쓸기 · 망치 대지 충격/철퇴 내려찍기 · 도끼 이중 회전/도약 내려찍기 · 단검 연속 암습/그림자 폭발 · 활 폭우/관통 사격 · 지팡이 폭발/치유의 빛 · 검 5연속/반격 일섬.",15},
  ["skill-meadow-emote"]={"기타","인사 동작. 전투 효과 없음.",5},
  ["meadow-unarmed-rush"]={"전사","맨손 잽·훅 연타.",2},
  ["meadow-unarmed-uppercut"]={"전사","크게 올려치는 승룡 어퍼컷.",2},
  ["meadow-unarmed-kick"]={"전사","회전 발차기.",2},
  ["meadow-unarmed-elbow"]={"전사","팔꿈치·무릎 연계 공격.",2},
}
-- [90노드 스킬 카드] 기존 Config.Actions와 같은 실제 서버 발동 ID를 사용한다.
for _,node in ipairs(Config.MeadowSkillNodes or {}) do
  if node.Kind=="ACTIVE" then
    skillInfo[node.Id]={node.SchoolName,node.Description,node.IconCell}
  end
end

-- [90노드 스킬창] 5계열 탭 / 3갈래 분기 / 3단계 강화·최종 A/B 선택.
-- 사용형 60개는 기존 Config.Actions/서버 액션 ID로, 지속형 30개는 슬롯 없이 습득한다.
local talentPanel=Instance.new("Frame")
talentPanel.Name="WitcherTalents";talentPanel.LayoutOrder=2
talentPanel.Size=UDim2.new(1,-8,0,1214);talentPanel.BackgroundTransparency=1;talentPanel.Parent=meadowPages[7]
local selectedSchool=1
local selectedNode=Config.MeadowSkillNodes[1]
local talentRows={}
local talentColumns={}
local schoolButtons={}
local legacyButtons={}
local loadoutRows={}
local renderTree
local function rankOf(node)
  if not node then return 0,"A" end
  local bits=math.floor(tonumber(player:GetAttribute("MeadowSkillBits"..math.ceil(node.Index/10))) or 0)
  local packed=bit32.extract(bits,((node.Index-1)%10)*3,3)
  return bit32.band(packed,3),bit32.band(packed,4)~=0 and "B" or "A"
end
local schoolTab=Instance.new("Frame")
schoolTab.Name="MeadowSkillSchools";schoolTab.Size=UDim2.new(1,0,0,44)
schoolTab.BackgroundTransparency=1;schoolTab.Parent=talentPanel
for index,school in ipairs(Config.MeadowSkillSchools or {}) do
  local button=Instance.new("TextButton")
  button.Name="School_"..school.Id;button.Position=UDim2.new((index-1)/5,2,0,0)
  button.Size=UDim2.new(1/5,-4,1,0);button.Text=school.Name..(school.Weapon and ('\n'..school.Weapon) or '')
  button.BackgroundColor3=Color3.fromRGB(23,44,40);button.BorderSizePixel=0
  button.TextColor3=parchment;button.Font=Enum.Font.GothamBold;button.TextSize=12;button.TextWrapped=true;button.Parent=schoolTab
  local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,7);corner.Parent=button
  button.Activated:Connect(function()
    selectedSchool=index
    selectedNode=Config.MeadowSkillNodes[(index-1)*18+1]
    if renderTree then renderTree() end
  end)
  schoolButtons[index]=button
end
local talentHeader=Instance.new("TextLabel")
talentHeader.Name="TalentPoints";talentHeader.Position=UDim2.fromOffset(5,50)
talentHeader.Size=UDim2.new(1,-10,0,34);talentHeader.BackgroundTransparency=1
talentHeader.TextXAlignment=Enum.TextXAlignment.Left;talentHeader.TextWrapped=true
talentHeader.Font=Enum.Font.GothamBold;talentHeader.TextSize=13
talentHeader.TextColor3=gold;talentHeader.Parent=talentPanel
for school=1,5 do
  talentColumns[school]={}
  for lane=1,3 do
    local column=Instance.new("Frame")
    column.Name="TalentBranch_"..school.."_"..lane
    column.Position=UDim2.new((lane-1)/3,2,0,90)
    column.Size=UDim2.new(1/3,-4,0,500)
    column.BorderSizePixel=0;column.BackgroundColor3=Color3.fromRGB(23,39,37)
    column.Visible=school==1;column.Parent=talentPanel
    local rounded=Instance.new("UICorner");rounded.CornerRadius=UDim.new(0,9);rounded.Parent=column
    talentColumns[school][lane]=column
    local example=Config.MeadowSkillNodes[(school-1)*18+(lane-1)*6+1]
    local title=Instance.new("TextLabel")
    title.Name="BranchTitle";title.Size=UDim2.new(1,0,0,36);title.BackgroundTransparency=1
    title.Font=Enum.Font.GothamBold;title.TextSize=13;title.TextWrapped=true
    title.TextColor3=skillColors[example.SchoolName] or gold;title.Text=example.Branch;title.Parent=column
    for step=1,6 do
      local node=Config.MeadowSkillNodes[(school-1)*18+(lane-1)*6+step]
      local button=Instance.new("TextButton")
      button.Name="TalentNode_"..node.Index;button.Position=UDim2.new(0,4,0,40+(step-1)*75)
      button.Size=UDim2.new(1,-8,0,68);button.BorderSizePixel=0
      button.BackgroundColor3=Color3.fromRGB(42,51,49);button.Text=""
      button.Parent=column
      local bc=Instance.new("UICorner");bc.CornerRadius=UDim.new(0,8);bc.Parent=button
      local edge=Instance.new("UIStroke");edge.Thickness=1.5;edge.Color=Color3.fromRGB(81,99,91);edge.Parent=button
      local icon=Instance.new("ImageLabel")
      icon.Name="NodeIcon";icon.BackgroundTransparency=1;icon.Position=UDim2.new(.5,-17,0,2)
      icon.Size=UDim2.fromOffset(34,34)
      -- [90개 독립 스킬 원화] 기존 공용 스킬 함수에서 고유 CC0 아이콘과 복구를 처리한다.
      meadowArt.skill(icon,node.Id);icon.Parent=button
      local label=Instance.new("TextLabel")
      label.BackgroundTransparency=1;label.Position=UDim2.fromOffset(3,36);label.Size=UDim2.new(1,-6,0,30)
      label.Font=Enum.Font.GothamBold;label.TextSize=10;label.TextWrapped=true
      label.TextColor3=parchment;label.Text=node.Name;label.Parent=button
      button.Activated:Connect(function()
        selectedNode=node
        if renderTree then renderTree() end
      end)
      -- [연결선] 같은 분기의 앞 노드를 익히면 다음 노드로 금빛이 이어진다.
      local connector
      if step<6 then
        connector=Instance.new("Frame")
        connector.Name="TalentLink_"..node.Index;connector.AnchorPoint=Vector2.new(.5,0)
        connector.Position=UDim2.new(.5,0,0,40+step*75-8);connector.Size=UDim2.fromOffset(4,8)
        connector.BorderSizePixel=0;connector.BackgroundColor3=Color3.fromRGB(60,72,68);connector.ZIndex=2
        connector.Parent=column
      end
      talentRows[node.Index]={node=node,button=button,edge=edge,icon=icon,label=label,connector=connector}
    end
  end
end
local detail=Instance.new("Frame")
detail.Name="SkillNodeDetail";detail.Position=UDim2.fromOffset(0,604)
detail.Size=UDim2.new(1,0,0,214);detail.BackgroundColor3=Color3.fromRGB(19,35,33)
detail.BorderSizePixel=0;detail.Parent=talentPanel
local dc=Instance.new("UICorner");dc.CornerRadius=UDim.new(0,10);dc.Parent=detail
local detailTitle=Instance.new("TextLabel")
detailTitle.BackgroundTransparency=1;detailTitle.Position=UDim2.fromOffset(10,5)
detailTitle.Size=UDim2.new(1,-20,0,24);detailTitle.TextXAlignment=Enum.TextXAlignment.Left
detailTitle.Font=Enum.Font.GothamBold;detailTitle.TextSize=16;detailTitle.TextColor3=gold;detailTitle.Parent=detail
local detailText=Instance.new("TextLabel")
detailText.BackgroundTransparency=1;detailText.Position=UDim2.fromOffset(10,31)
detailText.Size=UDim2.new(1,-20,0,77);detailText.TextWrapped=true
detailText.Font=Enum.Font.GothamMedium;detailText.TextSize=12
detailText.TextColor3=parchment;detailText.TextXAlignment=Enum.TextXAlignment.Left
detailText.TextYAlignment=Enum.TextYAlignment.Top;detailText.Parent=detail
local learnA=CommonUI.CreatePrimaryButton({name="SkillNodeLearnA",text="습득",minHeight=42})
learnA.Position=UDim2.new(0,8,0,111);learnA.Size=UDim2.new(.5,-12,0,42)
learnA.Parent=detail
local learnB=CommonUI.CreatePrimaryButton({name="SkillNodeLearnB",text="B 분기",minHeight=42})
learnB.Position=UDim2.new(.5,4,0,111);learnB.Size=UDim2.new(.5,-12,0,42)
learnB.Parent=detail
local nodeQuick=CommonUI.CreatePrimaryButton({name="SkillNodeQuick",text="퀵슬롯 등록",minHeight=42})
nodeQuick.Position=UDim2.new(0,8,0,160);nodeQuick.Size=UDim2.new(1/3,-10,0,42)
nodeQuick.BackgroundColor3=Color3.fromRGB(46,86,98);nodeQuick.Parent=detail
local nodeUse=CommonUI.CreatePrimaryButton({name="SkillNodeUse",text="바로 사용",minHeight=42})
nodeUse.Position=UDim2.new(1/3,2,0,160);nodeUse.Size=UDim2.new(1/3,-6,0,42)
nodeUse.BackgroundColor3=Color3.fromRGB(107,70,45);nodeUse.Parent=detail
local nodePreview=CommonUI.CreatePrimaryButton({name="SkillNodePreview",text="미리보기",minHeight=42})
nodePreview.Position=UDim2.new(2/3,0,0,160);nodePreview.Size=UDim2.new(1/3,-8,0,42)
nodePreview.BackgroundColor3=Color3.fromRGB(70,60,104);nodePreview.Parent=detail
nodePreview.Activated:Connect(function()
  if selectedNode and meadowActionButtons.previewById then meadowActionButtons.previewById(selectedNode.Id) end
end)
nodeQuick.Activated:Connect(function()
  if selectedNode and meadowActionButtons.quickById then meadowActionButtons.quickById(selectedNode.Id) end
end)
nodeUse.Activated:Connect(function()
  if selectedNode and meadowActionButtons.useById then meadowActionButtons.useById(selectedNode.Id) end
end)
local function buyNode(choice)
  if player:GetAttribute("ProfileReady")~=true or not selectedNode then return end
  local rank=rankOf(selectedNode)
  if rank>=3 then return end
  remote:FireServer("meadow:rpg:tree:learn:"..selectedNode.Index..(rank==2 and choice or ""))
end
learnA.Activated:Connect(function() buyNode("A") end)
learnB.Activated:Connect(function() buyNode("B") end)

local presetTitle=Instance.new("TextLabel")
presetTitle.BackgroundTransparency=1;presetTitle.Position=UDim2.fromOffset(5,829)
presetTitle.Size=UDim2.new(1,-10,0,22);presetTitle.Font=Enum.Font.GothamBold
presetTitle.TextSize=13;presetTitle.TextXAlignment=Enum.TextXAlignment.Left
presetTitle.TextColor3=gold;presetTitle.Text="장착 조합 3개 · 전투 밖에서 저장/전환";presetTitle.Parent=talentPanel
for preset,name in ipairs({"탐험용","보스용","협동용"}) do
  local label=Instance.new("TextLabel")
  label.Name="MeadowPreset"..preset;label.BackgroundTransparency=1
  label.Position=UDim2.new(0,5,0,854+(preset-1)*45)
  label.Size=UDim2.new(.4,-8,0,38);label.Font=Enum.Font.GothamBold;label.TextSize=12
  label.TextColor3=parchment;label.TextXAlignment=Enum.TextXAlignment.Left;label.Parent=talentPanel
  local save=CommonUI.CreatePrimaryButton({name="SavePreset"..preset,text="저장",minHeight=38})
  save.Position=UDim2.new(.4,0,0,854+(preset-1)*45);save.Size=UDim2.new(.27,-4,0,38);save.Parent=talentPanel
  local load=CommonUI.CreatePrimaryButton({name="LoadPreset"..preset,text="전환",minHeight=38})
  load.Position=UDim2.new(.68,0,0,854+(preset-1)*45);load.Size=UDim2.new(.31,-4,0,38);load.Parent=talentPanel
  save.Activated:Connect(function() remote:FireServer("meadow:rpg:loadout:save:"..preset) end)
  load.Activated:Connect(function() remote:FireServer("meadow:rpg:loadout:activate:"..preset) end)
  loadoutRows[preset]={name=name,label=label,load=load}
end

local legacyTitle=Instance.new("TextLabel")
legacyTitle.BackgroundTransparency=1;legacyTitle.Position=UDim2.fromOffset(5,997)
legacyTitle.Size=UDim2.new(1,-10,0,25);legacyTitle.Font=Enum.Font.GothamBold
legacyTitle.TextSize=13;legacyTitle.TextXAlignment=Enum.TextXAlignment.Left
legacyTitle.TextColor3=gold;legacyTitle.Parent=talentPanel
for i,school in ipairs(Config.MeadowTalentSchools or {}) do
  local button=CommonUI.CreatePrimaryButton({name="LegacySkill_"..school.Id,text=school.Name,minHeight=44})
  button.Position=UDim2.new((i-1)/4,2,0,1024);button.Size=UDim2.new(.25,-4,0,44)
  button.Parent=talentPanel;legacyButtons[i]={button=button,school=school}
  button.Activated:Connect(function() remote:FireServer("meadow:rpg:talent:learn:"..school.Id) end)
end
local resetButton=CommonUI.CreatePrimaryButton({name="TalentReset",text="스킬 점수 초기화 · 30코인",minHeight=42})
resetButton.Position=UDim2.fromOffset(3,1075);resetButton.Size=UDim2.new(1,-6,0,42)
resetButton.BackgroundColor3=Color3.fromRGB(98,52,48);resetButton.Parent=talentPanel
local resetConfirm=Instance.new("Frame")
resetConfirm.Name="MeadowResetConfirm";resetConfirm.Position=UDim2.fromOffset(0,1123)
resetConfirm.Size=UDim2.new(1,0,0,85);resetConfirm.BackgroundColor3=Color3.fromRGB(50,35,33)
resetConfirm.Visible=false;resetConfirm.Parent=talentPanel
local confirmLabel=Instance.new("TextLabel")
confirmLabel.BackgroundTransparency=1;confirmLabel.Size=UDim2.new(1,0,0,38)
confirmLabel.Font=Enum.Font.GothamBold;confirmLabel.TextSize=12;confirmLabel.TextWrapped=true
confirmLabel.TextColor3=parchment;confirmLabel.Text="정말 90노드 점수를 초기화할까? 기존 4재능과 저장은 유지돼."
confirmLabel.Parent=resetConfirm
local yes=CommonUI.CreatePrimaryButton({name="ConfirmTalentReset",text="초기화 실행",minHeight=40})
yes.Position=UDim2.new(0,4,0,42);yes.Size=UDim2.new(.5,-8,0,39);yes.Parent=resetConfirm
local no=CommonUI.CreatePrimaryButton({name="CancelTalentReset",text="취소",minHeight=40})
no.Position=UDim2.new(.5,4,0,42);no.Size=UDim2.new(.5,-8,0,39);no.Parent=resetConfirm
resetButton.Activated:Connect(function() resetConfirm.Visible=true end)
no.Activated:Connect(function() resetConfirm.Visible=false end)
yes.Activated:Connect(function()
  resetConfirm.Visible=false
  if player:GetAttribute("ProfileReady")==true then remote:FireServer("meadow:rpg:tree:reset:all") end
end)
local lastTalentRank={}
local talentTween=game:GetService("TweenService")
renderTree=function()
  local mastery=tonumber(player:GetAttribute("CombatProficiency")) or 0
  local points=Config.MeadowSkillPointProgress(mastery)
  local invested=0
  for _,node in ipairs(Config.MeadowSkillNodes or {}) do invested+=rankOf(node) end
  local available=math.max(0,points-invested)
  talentHeader.Text="90개 중 습득 "..invested.."단계 · 남은 점수 "..available..
    " · 지속 효과는 장착칸을 차지하지 않아"
  for i,button in ipairs(schoolButtons) do
    button.BackgroundColor3=i==selectedSchool and Color3.fromRGB(54,112,84) or Color3.fromRGB(23,44,40)
  end
  for school,columns in ipairs(talentColumns) do
    for _,column in ipairs(columns) do column.Visible=school==selectedSchool end
  end
  for _,entry in ipairs(talentRows) do
    local node=entry.node
    local rank=rankOf(node)
    local prior=node.Step==1 or rankOf(Config.MeadowSkillNodes[node.Index-1])>=1
    local ready=rank<3 and prior and available>0
    local selected=selectedNode and selectedNode.Index==node.Index
    entry.button.BackgroundColor3=rank>0 and Color3.fromRGB(54,94,74) or Color3.fromRGB(42,51,49)
    entry.edge.Color=selected and Color3.new(1,1,1) or ready and gold or Color3.fromRGB(81,99,91)
    entry.edge.Thickness=selected and 3 or ready and 2 or 1
    if entry.connector then
      entry.connector.BackgroundColor3=rank>=1 and gold or Color3.fromRGB(60,72,68)
    end
    -- [습득 가능 노드 숨쉬기] 점수가 있고 선행 조건을 만족한 노드의 테두리가 천천히 깜빡인다.
    if ready and not selected then
      if not entry.pulse then
        entry.pulse=talentTween:Create(entry.edge,TweenInfo.new(.9,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut,-1,true),{Transparency=.65})
        entry.pulse:Play()
      end
    elseif entry.pulse then
      entry.pulse:Cancel();entry.pulse=nil;entry.edge.Transparency=0
    end
    -- [습득 연출] 단계가 오른 노드는 황금 섬광이 번지고 아이콘이 튕긴다.
    local before=lastTalentRank[node.Index]
    lastTalentRank[node.Index]=rank
    if before and rank>before then
      local flash=Instance.new("Frame")
      flash.Name="LearnFlash";flash.AnchorPoint=Vector2.new(.5,.5);flash.Position=UDim2.fromScale(.5,.5)
      flash.Size=UDim2.fromScale(1,1);flash.BackgroundColor3=Color3.fromRGB(255,226,140)
      flash.BackgroundTransparency=.25;flash.BorderSizePixel=0;flash.ZIndex=entry.button.ZIndex+3;flash.Parent=entry.button
      local flashCorner=Instance.new("UICorner");flashCorner.CornerRadius=UDim.new(0,8);flashCorner.Parent=flash
      local fade=talentTween:Create(flash,TweenInfo.new(.55,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),
        {BackgroundTransparency=1,Size=UDim2.fromScale(1.18,1.18)})
      fade.Completed:Connect(function() flash:Destroy() end);fade:Play()
      entry.icon.Size=UDim2.fromOffset(46,46);entry.icon.Position=UDim2.new(.5,-23,0,-4)
      talentTween:Create(entry.icon,TweenInfo.new(.45,Enum.EasingStyle.Back,Enum.EasingDirection.Out),
        {Size=UDim2.fromOffset(34,34),Position=UDim2.new(.5,-17,0,2)}):Play()
      if meadowArt.sfx then pcall(meadowArt.sfx,"click",.6,rank>=3 and 1.35 or 1.1) end
    end
    entry.icon.ImageTransparency=rank>0 and 0 or ready and .12 or .65
    entry.label.Text=node.Name.."  "..rank.."/3"
    entry.label.TextColor3=rank>0 and Color3.fromRGB(235,248,221) or parchment
  end
  if selectedNode then
    local node=selectedNode
    local rank,choice=rankOf(node)
    local prior=node.Step==1 or rankOf(Config.MeadowSkillNodes[node.Index-1])>=1
    local ready=rank<3 and prior and available>0
    local tier=node.Advanced and "고급 · 기력 "..node.Gauge or node.Kind=="PASSIVE" and "지속 효과 · 자동 적용" or "일반 · 기력 "..node.Gauge
    detailTitle.Text=node.Name.."  "..rank.."/3  ·  "..tier
    local branchText=node.Mode=="BOLT" and "A 관통 / B 분열" or
      node.Mode=="HEAL" and "A 즉시 회복 / B 지속 회복" or
      node.Kind=="PASSIVE" and "A 효과 강화 / B 조건 확장" or
      "A 집중 강화 / B 범위·지원 강화"
    detailText.Text=node.Description.."\n현재 단계 "..rank.." / 다음 단계 "..math.min(3,rank+1)..
      " · "..(prior and "선행 조건 만족" or "같은 분기의 앞 노드 필요")..
      "\n최종 강화: "..branchText..(rank==3 and " · 선택 "..choice or "")
    local isActive=node.Kind=="ACTIVE"
    local learned=rank>0
    nodeQuick.Visible=false;nodeUse.Visible=isActive;nodePreview.Visible=isActive
    nodeQuick.Text=learned and "퀵슬롯 등록" or "잠김";nodeUse.Text=learned and "바로 사용" or "잠김"
    nodeQuick.Active=learned;nodeUse.Active=learned
    learnA.Visible=true;learnB.Visible=rank==2
    learnA.Size=rank==2 and UDim2.new(.5,-12,0,42) or UDim2.new(1,-16,0,42)
    learnA.Text=rank==3 and "최고 단계" or ready and (rank==2 and "A 분기 습득" or "다음 단계 습득") or "잠김 / 점수 부족"
    learnB.Text="B 분기 습득"
    learnA.Active=ready;learnB.Active=ready
    learnA.AutoButtonColor=ready;learnB.AutoButtonColor=ready
  end
  local legacyEarned=Config.TalentPointProgress(mastery)
  local legacySpent=0
  for _,entry in ipairs(legacyButtons) do
    local lv=tonumber(player:GetAttribute("MeadowTalent"..entry.school.Id)) or 0
    local maxLv=entry.school.Max or 3
    legacySpent+=lv
    entry.button.Text=entry.school.Name.." "..lv.."/"..maxLv
  end
  legacyTitle.Text="기존 4재능 보존 · 남은 점수 "..math.max(0,legacyEarned-legacySpent)
  for preset,entry in ipairs(loadoutRows) do
    local saved=tonumber(player:GetAttribute("MeadowLoadoutSaved"..preset)) or 0
    local active=tonumber(player:GetAttribute("MeadowLoadoutActive")) or 1
    entry.label.Text=entry.name..(saved==1 and " · 저장됨" or " · 비어 있음")
    entry.load.Text=active==preset and "사용 중" or "전환"
  end
end
meadowActionButtons.refreshTalentDetail=function()
  renderTree()
  if meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
end
for _,name in ipairs({"CombatProficiency","MeadowGearRevision",
  "MeadowTalentMartial","MeadowTalentSigns","MeadowTalentDefense","MeadowTalentAgility",
  "MeadowLoadoutActive","MeadowLoadoutSaved1","MeadowLoadoutSaved2","MeadowLoadoutSaved3"}) do
  player:GetAttributeChangedSignal(name):Connect(meadowActionButtons.refreshTalentDetail)
end
for index=1,9 do
  player:GetAttributeChangedSignal("MeadowSkillBits"..index):Connect(meadowActionButtons.refreshTalentDetail)
end
renderTree()
local skillBar,skillButtons=CommonUI.CreateFilterBar({name="WitcherSkillCategories",filters=skillCategories,selectedIndex=1})
skillBar.LayoutOrder=3;skillBar.Size=UDim2.new(1,-8,0,48);skillBar.Parent=meadowPages[7]
local skillGrid=Instance.new("Frame")
skillGrid.Name="WitcherSkillTree";skillGrid.LayoutOrder=4
skillGrid.Size=UDim2.new(1,-8,0,100);skillGrid.BackgroundTransparency=1;skillGrid.Parent=meadowPages[7]
local skillLayout=Instance.new("UIGridLayout")
skillLayout.SortOrder=Enum.SortOrder.LayoutOrder
skillLayout.CellPadding=UDim2.fromOffset(8,8);skillLayout.Parent=skillGrid
skillLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
  skillGrid.Size=UDim2.new(1,-8,0,math.max(108,skillLayout.AbsoluteContentSize.Y+4))
end)
local function layoutSkills()
  local width=skillGrid.AbsoluteSize.X
  if width<=0 then return end
  local columns=math.clamp(math.floor((width+8)/146),2,5)
  skillLayout.CellSize=UDim2.fromOffset(math.max(90,math.floor((width-(columns-1)*8-8)/columns)),110)
end
skillGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutSkills)
local skillDetail=Instance.new("Frame")
skillDetail.Name="WitcherSkillDetails";skillDetail.LayoutOrder=5
skillDetail.Size=UDim2.new(1,-8,0,194);skillDetail.BorderSizePixel=0
skillDetail.BackgroundColor3=stone;skillDetail.Parent=meadowPages[7]
local skillCorner=Instance.new("UICorner");skillCorner.CornerRadius=UDim.new(0,12);skillCorner.Parent=skillDetail
local skillBorder=Instance.new("UIStroke");skillBorder.Color=gold
skillBorder.Transparency=.18;skillBorder.Parent=skillDetail
local skillTitle=Instance.new("TextLabel")
skillTitle.Name="SelectedSkillTitle";skillTitle.Position=UDim2.fromOffset(12,7)
skillTitle.Size=UDim2.new(1,-24,0,30);skillTitle.BackgroundTransparency=1
skillTitle.TextColor3=gold;skillTitle.Font=Enum.Font.GothamBold
skillTitle.TextSize=18;skillTitle.TextXAlignment=Enum.TextXAlignment.Left;skillTitle.Parent=skillDetail
local skillText=Instance.new("TextLabel")
skillText.Name="SkillDescription";skillText.Position=UDim2.fromOffset(12,38)
skillText.Size=UDim2.new(1,-24,0,92);skillText.BackgroundTransparency=1
skillText.TextColor3=parchment;skillText.Font=Enum.Font.GothamMedium;skillText.TextSize=13
skillText.TextXAlignment=Enum.TextXAlignment.Left;skillText.TextYAlignment=Enum.TextYAlignment.Top
skillText.TextWrapped=true;skillText.Parent=skillDetail
local skillUse=CommonUI.CreatePrimaryButton({name="UseWitcherSkill",text="기술 사용",minHeight=52})
skillUse.Position=UDim2.fromOffset(12,134);skillUse.Size=UDim2.new(1/3,-12,0,52)
skillUse.BackgroundColor3=Color3.fromRGB(98,65,45);skillUse.Parent=skillDetail
-- [스킬 장착] 선택한 기술을 화면 하단 다섯 칸에 등록·교체한다.
local skillQuick=CommonUI.CreatePrimaryButton({name="RegisterQuickSkill",text="퀵슬롯 등록",minHeight=52})
skillQuick.Position=UDim2.new(1/3,2,0,134);skillQuick.Size=UDim2.new(1/3,-8,0,52)
skillQuick.BackgroundColor3=Color3.fromRGB(46,86,98);skillQuick.Parent=skillDetail;skillQuick.Visible=false
local ultToggle=CommonUI.CreatePrimaryButton({name="UltimateVariant",text="변형 A",minHeight=30})
ultToggle.Position=UDim2.new(1,-112,0,7);ultToggle.Size=UDim2.fromOffset(100,30)
ultToggle.BackgroundColor3=Color3.fromRGB(110,78,40);ultToggle.Visible=false;ultToggle.Parent=skillDetail
ultToggle.Activated:Connect(function()
  local nextChoice=(tonumber(player:GetAttribute("MeadowUltChoice")) or 1)==1 and 2 or 1
  player:SetAttribute("MeadowUltChoice",nextChoice) -- 표시용 즉시 반영, 서버가 같은 값으로 확정
  remote:FireServer("ult:set:"..nextChoice)
  if meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
end)
local skillRows={}
local selectedSkill=nil
local skillCategory="전체"
for _,action in ipairs(Config.Actions)do
  local info=skillInfo[action.Id]
  if info and (action.Kind=="SKILL" or action.Kind=="COMBAT") then
    local card=Instance.new("TextButton")
    card.Name="WitcherSkill_"..action.Id;card.LayoutOrder=action.Order or 100
    card.Size=UDim2.fromOffset(110,110)
    card.BackgroundColor3=Color3.fromRGB(33,30,32);card.BorderSizePixel=0;card.Text=""
    card.Parent=skillGrid
    local rounded=Instance.new("UICorner");rounded.CornerRadius=UDim.new(0,10);rounded.Parent=card
    local outline=Instance.new("UIStroke")
    outline.Color=skillColors[info[1]];outline.Thickness=1.2;outline.Transparency=.15;outline.Parent=card
    local symbol=Instance.new("ImageLabel")
    symbol.Name="SkillIcon";symbol.Position=UDim2.new(.5,-21,0,5)
    symbol.Size=UDim2.fromOffset(42,42);symbol.BackgroundTransparency=1
    symbol.Image=meadowIconAtlas;symbol.ImageRectOffset=Vector2.new(info[3]*64,0)
    symbol.ImageRectSize=Vector2.new(64,64);symbol.Parent=card
    meadowArt.skill(symbol,action.Id)
    local name=Instance.new("TextLabel")
    name.Name="SkillName";name.Position=UDim2.new(0,3,0,49)
    name.Size=UDim2.new(1,-6,0,40);name.BackgroundTransparency=1
    name.TextWrapped=true;name.Text=action.Label;name.TextColor3=parchment
    name.Font=Enum.Font.GothamBold;name.TextSize=12;name.Parent=card
    local state=Instance.new("TextLabel")
    state.Name="SkillReady";state.Position=UDim2.new(0,3,1,-21)
    state.Size=UDim2.new(1,-6,0,17);state.BackgroundTransparency=1
    state.Font=Enum.Font.GothamBold;state.TextSize=11;state.TextColor3=skillColors[info[1]]
    state.Parent=card
    skillRows[#skillRows+1]={action=action,button=card,outline=outline,state=state,category=info[1],description=info[2]}
    if not selectedSkill then selectedSkill=action end
    card.Activated:Connect(function()
      selectedSkill=action
      if meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
      local page=meadowPages[7]
      page.CanvasPosition=Vector2.new(0,math.max(0,page.AbsoluteCanvasSize.Y-page.AbsoluteSize.Y))
    end)
  end
end
meadowActionButtons.refreshSkills=function()
  if not selectedSkill then return end
  local now=workspace:GetServerTimeNow()
  local current=nil
  for _,row in ipairs(skillRows)do
    local deadline=player:GetAttribute("MeadowReady_"..row.action.Id)
    local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
    row.button.Visible=(skillCategory=="전체" or row.category==skillCategory) and not (Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[row.action.Id]) and not string.find(row.action.Id,"meadow-unarmed-",1,true)
    local lockText=meadowArt.skillLock(row.action.Id)
    local equippedSlot=nil
    for slot=1,5 do if meadowArt.quickIds[slot]==row.action.Id then equippedSlot=slot;break end end
    row.state.Text=lockText and ("잠김 · "..lockText) or (remaining>.05 and ("대기 "..math.ceil(remaining).."초") or "사용 가능")
    if not lockText and remaining<=.05 and equippedSlot then row.state.Text=equippedSlot.."번 장착 중" end
    row.state.TextColor3=lockText and Color3.fromRGB(200,120,110) or (remaining>.05 and Color3.fromRGB(172,165,160) or skillColors[row.category])
    row.state.TextSize=lockText and 10 or 11
    local iconImg=row.button:FindFirstChild("SkillIcon")
    if iconImg then iconImg.ImageTransparency=lockText and .6 or 0 end
    row.outline.Thickness=row.action==selectedSkill and 3 or 1.2
    row.button.BackgroundColor3=row.action==selectedSkill and Color3.fromRGB(68,50,42) or Color3.fromRGB(33,30,32)
    if row.action==selectedSkill then current=row end
  end
  if not current then return end
  local deadline=player:GetAttribute("MeadowReady_"..selectedSkill.Id)
  local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
  local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  local available=player:GetAttribute("ProfileReady")==true and human~=nil and human.Health>0 and remaining<=.05
  local node=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[selectedSkill.Id]
  local gauge=node and node.Gauge or selectedSkill.Id=="skill-meadow-oath" and 70 or 0
  local stamina=tonumber(player:GetAttribute("MeadowStamina")) or 100
  available=available and stamina>=gauge
  skillTitle.Text=selectedSkill.Label.."  /  "..current.category
  skillTitle.TextColor3=skillColors[current.category]
  local cooldown=selectedSkill.Cooldown
  local cooldownText=typeof(cooldown)=="number" and (tostring(cooldown).."초") or "기본 공격 판정"
  local selLock=meadowArt.skillLock(selectedSkill.Id)
  local equipped={}
  for slot=1,5 do
    if meadowArt.quickIds[slot]==selectedSkill.Id then equipped[#equipped+1]=tostring(slot) end
  end
  local equippedText=#equipped>0 and ("장착 중 · "..table.concat(equipped,", ").."번") or "미장착"
  skillText.Text=current.description.."\n\n재사용 "..cooldownText.." · 기력 "..gauge.."/"..math.floor(stamina)..
    "  ·  "..(selLock and ("아직 못 배웠어: 스킬 트리 > "..selLock) or (remaining>.05 and (math.ceil(remaining).."초 남음") or (available and "사용 가능" or "캐릭터 대기")))
    .."\n"..equippedText.." · 하단 1~5번 칸을 선택해 장착·교체"
  local isUlt=selectedSkill.Id=="skill-meadow-ultimate"
  ultToggle.Visible=isUlt
  if isUlt then ultToggle.Text="변형 "..(((tonumber(player:GetAttribute("MeadowUltChoice")) or 1)==2) and "B" or "A").." (누르면 전환)" end
  skillQuick.Text=selLock and "잠김" or "퀵슬롯 등록"
  skillQuick.BackgroundColor3=selLock and Color3.fromRGB(70,60,60) or Color3.fromRGB(46,86,98)
  available=available and not selLock
  skillUse.Text=selLock and "잠김" or (stamina<gauge and "기력 부족" or (available and ("사용  ·  "..selectedSkill.Label) or "사용 대기"))
  skillUse.Active=available;skillUse.AutoButtonColor=available
  skillUse.BackgroundColor3=available and Color3.fromRGB(107,70,45) or Color3.fromRGB(60,55,55)
end
for index,button in ipairs(skillButtons)do
  button.Activated:Connect(function()
    skillCategory=skillCategories[index]
    for _,row in ipairs(skillRows)do
      if skillCategory=="전체" or row.category==skillCategory then
        selectedSkill=row.action
        break
      end
    end
    for i,tab in ipairs(skillButtons)do
      local current=i==index
      tab.BackgroundColor3=current and Color3.fromRGB(54,112,84) or Color3.fromRGB(24,49,45)
      tab.TextColor3=current and Color3.fromRGB(255,240,197) or Color3.fromRGB(191,215,198)
      local underline=tab:FindFirstChild("SelectedUnderline")
      if underline then underline.Visible=current end
      local stroke=tab:FindFirstChildOfClass("UIStroke")
      if stroke then stroke.Color=current and gold or Color3.fromRGB(78,120,101) end
    end
    meadowActionButtons.refreshSkills()
  end)
  button.BackgroundColor3=index==1 and Color3.fromRGB(54,112,84) or Color3.fromRGB(24,49,45)
end
-- [스킬창 통합] 오디세이식 한 화면: 맨 위 장착칸 → 스킬 트리(노드에서 바로 습득·등록·사용) → 아래 기본 기술.
do
  talentPanel.Visible=true
  skillBar.Visible=false
  meadowLabels[7].Visible=false
  local basicTitle=Instance.new("TextLabel")
  basicTitle.Name="BasicSkillsTitle";basicTitle.LayoutOrder=3;basicTitle.BackgroundTransparency=1
  basicTitle.Size=UDim2.new(1,-8,0,26);basicTitle.Font=Enum.Font.GothamBold;basicTitle.TextSize=13
  basicTitle.TextXAlignment=Enum.TextXAlignment.Left;basicTitle.TextColor3=gold
  basicTitle.Text="기본 기술 · 트리 없이 쓰는 기술";basicTitle.Parent=meadowPages[7]
  talentPanel.LayoutOrder=2
  skillGrid.LayoutOrder=4
  skillDetail.LayoutOrder=5
  local dz=meadowPages[7]:FindFirstChild("QuickSlotDrop")
  if dz then dz.LayoutOrder=1;dz.Visible=false end
  meadowPages[7].CanvasPosition=Vector2.new(0,0)
end
-- [각인] 무기 룬 선택 줄. 서버가 재료·코인을 검증하고 적용한다.
do
  local runeBox=Instance.new("Frame")
  runeBox.Name="RuneRow";runeBox.LayoutOrder=7;runeBox.Size=UDim2.new(1,-8,0,104)
  runeBox.BackgroundColor3=Color3.fromRGB(24,49,45);runeBox.BorderSizePixel=0;runeBox.Parent=meadowPages[7]
  Instance.new("UICorner",runeBox).CornerRadius=UDim.new(0,12)
  local runeTitle=Instance.new("TextLabel")
  runeTitle.BackgroundTransparency=1;runeTitle.Position=UDim2.fromOffset(10,4);runeTitle.Size=UDim2.new(1,-20,0,22)
  runeTitle.Font=Enum.Font.GothamBold;runeTitle.TextSize=12;runeTitle.TextXAlignment=Enum.TextXAlignment.Left
  runeTitle.TextColor3=gold;runeTitle.Parent=runeBox
  local runeButtons={}
  local names={"해제"}
  for i,rune in ipairs(Config.Runes or {}) do names[i+1]=rune.Name end
  for i,label in ipairs(names) do
    local pick=i-1
    local b=CommonUI.CreatePrimaryButton({name="Rune"..pick,text=label,minHeight=44})
    b.Position=UDim2.new((i-1)/#names,2,0,30);b.Size=UDim2.new(1/#names,-4,0,44);b.Parent=runeBox
    b.Activated:Connect(function() remote:FireServer("rune:set:"..pick) end)
    runeButtons[i]=b
  end
  local runeDesc=Instance.new("TextLabel")
  runeDesc.BackgroundTransparency=1;runeDesc.Position=UDim2.fromOffset(10,78);runeDesc.Size=UDim2.new(1,-20,0,22)
  runeDesc.Font=Enum.Font.GothamMedium;runeDesc.TextSize=11;runeDesc.TextXAlignment=Enum.TextXAlignment.Left
  runeDesc.TextColor3=parchment;runeDesc.Parent=runeBox
  local function refreshRune()
    local current=tonumber(player:GetAttribute("MeadowRune")) or 0
    local rune=Config.Runes and Config.Runes[current]
    runeTitle.Text="무기 각인 · 현재 "..(rune and rune.Name or "없음")
    runeDesc.Text=rune and rune.Desc or "재료+코인으로 새기면 명중마다 상태이상이 걸려. 상태이상이 겹치면 추가 피해."
    for i,btn in ipairs(runeButtons) do
      btn.BackgroundColor3=(i-1)==current and Color3.fromRGB(54,112,84) or Color3.fromRGB(46,60,66)
    end
  end
  player:GetAttributeChangedSignal("MeadowRune"):Connect(refreshRune)
  refreshRune()
end
-- [모션 미리보기] 메뉴를 닫고 내 캐릭터가 선택한 기술 모션을 서버 소비 없이 재생한 뒤 스킬창으로 돌아온다.
do
  local preview=CommonUI.CreatePrimaryButton({name="PreviewSkillMotion",text="모션 미리보기",minHeight=52})
  preview.Position=UDim2.new(2/3,-2,0,134);preview.Size=UDim2.new(1/3,-10,0,52)
  preview.BackgroundColor3=Color3.fromRGB(70,60,104);preview.Parent=skillDetail
  local serial=9000000
  local running=false
  local function runPreview(action)
    if running or not action then return end
    running=true
    meadowArt.sfx("click",.4,1)
    meadowMenu.close()
    task.delay(.5,function()
      pcall(function()
        if action.Kind=="COMBAT" then
          if playNativeCombatMotion then playNativeCombatMotion(action.Id,1) end
        else
          serial+=1
          player:SetAttribute("ApprovedActionMotion",action.Id..":"..serial)
        end
        meadowArt.sfx("swing",.4,1)
      end)
      task.delay(2.2,function()
        running=false
        pcall(function() meadowMenu.open(7) end)
      end)
    end)
  end
  preview.Activated:Connect(function() runPreview(selectedSkill) end)
  meadowActionButtons.previewById=function(id)
    for _,row in ipairs(skillRows) do
      if row.action.Id==id then selectedSkill=row.action;runPreview(row.action);return end
    end
  end
end
-- [스킬창 장착칸] 하단 다섯 칸과 같은 저장 값을 사용한다.
do
  local tray=Instance.new("Frame")
  tray.Name="QuickSlotDrop";tray.LayoutOrder=1;tray.Size=UDim2.new(1,-8,0,96)
  tray.BackgroundColor3=Color3.fromRGB(24,49,45);tray.BorderSizePixel=0;tray.Parent=meadowPages[7]
  local tc=Instance.new("UICorner");tc.CornerRadius=UDim.new(0,12);tc.Parent=tray
  local ts=Instance.new("UIStroke");ts.Color=gold;ts.Thickness=2;ts.Transparency=.3;ts.Parent=tray
  local head=Instance.new("TextLabel")
  head.BackgroundTransparency=1;head.Position=UDim2.fromOffset(10,4);head.Size=UDim2.new(1,-20,0,24)
  head.Font=Enum.Font.GothamBold;head.TextSize=12;head.TextXAlignment=Enum.TextXAlignment.Left
  head.TextColor3=Color3.fromRGB(230,240,222);head.TextSize=11;head.TextWrapped=true;head.Text="하단 퀵슬롯 5칸 · 기술 선택 → 장착할 칸 선택";head.Parent=tray
  local boxes={}
  local function actionLabel(id)
    for _,action in ipairs(Config.Actions)do if action.Id==id then return action.Label end end
    return "비어 있음"
  end
  local function refreshDrop()
    for i,box in ipairs(boxes)do
      local id=meadowArt.quickIds[i]
      local name=id and (meadowArt.quickSpecialLabel[id] or actionLabel(id)) or "비어 있음"
      box.label.Text=i..". "..name
      box.icon.Visible=id~=nil and id~=false
      box.icon.ImageColor3=Color3.new(1,1,1)
      if id and meadowArt.setQuickIcon then meadowArt.setQuickIcon(box.icon,id) end
    end
  end
  local function quickCode(id)
    if not id then return 0 end
    for k,v in ipairs(meadowArt.quickSpecial) do if v==id then return k end end
    local tree=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[id]
    if tree and tree.Kind=="ACTIVE" then return 1000+tree.Index end
    for k,action in ipairs(Config.Actions) do if action.Id==id then return 9+k end end
    return 0
  end
  local function assign(slot,id)
    if slot<1 or slot>5 then return end
    if id and meadowArt.skillLock(id) then return end
    meadowArt.quickIds[slot]=id
    remote:FireServer("quick:set:"..slot..":"..quickCode(id))
    refreshDrop()
    if meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
    if meadowArt.refreshQuickHud then meadowArt.refreshQuickHud() end
    meadowArt.sfx("ping",.5,1.1)
  end
  for i=1,5 do
    local box=Instance.new("TextButton")
    box.Name="QuickBox"..i;box.Text="";box.AutoButtonColor=true
    box.Position=UDim2.new((i-1)/5,3,0,28);box.Size=UDim2.new(1/5,-6,0,62)
    box.BackgroundColor3=Color3.fromRGB(33,50,48);box.BorderSizePixel=0;box.Parent=tray
    local bc=Instance.new("UICorner");bc.CornerRadius=UDim.new(0,10);bc.Parent=box
    local be=Instance.new("UIStroke");be.Color=Color3.fromRGB(90,120,106);be.Parent=box
    local icon=Instance.new("ImageLabel")
    icon.BackgroundTransparency=1;icon.Size=UDim2.fromOffset(36,36);icon.AnchorPoint=Vector2.new(.5,0)
    icon.Position=UDim2.new(.5,0,0,3);icon.Parent=box
    local label=Instance.new("TextLabel")
    label.BackgroundTransparency=1;label.Position=UDim2.new(0,2,1,-20);label.Size=UDim2.new(1,-4,0,18)
    label.Font=Enum.Font.GothamBold;label.TextSize=10;label.TextColor3=Color3.new(1,1,1);label.TextTruncate=Enum.TextTruncate.AtEnd
    label.Parent=box
    boxes[i]={box=box,icon=icon,label=label,edge=be}
    box.Activated:Connect(function()
      if selectedSkill then assign(i,selectedSkill.Id)
      else
        -- 선택한 기술이 없으면 무기 → 채집 → 체력약 → 기력약 → 오일 → 비움 순으로 돌린다.
        local list=meadowArt.quickSpecial
        local cur=meadowArt.quickIds[i]
        local nextId=list[1]
        for k,v in ipairs(list) do if v==cur then nextId=list[k+1] or false end end
        assign(i,nextId)
      end
    end)
  end
  refreshDrop()
  local ghost=Instance.new("TextLabel")
  ghost.Name="SkillDragGhost";ghost.Size=UDim2.fromOffset(110,40);ghost.AnchorPoint=Vector2.new(.5,.5)
  ghost.BackgroundColor3=Color3.fromRGB(54,112,84);ghost.TextColor3=Color3.new(1,1,1)
  ghost.Font=Enum.Font.GothamBlack;ghost.TextSize=14;ghost.Visible=false;ghost.ZIndex=200;ghost.Parent=gui
  local gc=Instance.new("UICorner");gc.CornerRadius=UDim.new(0,10);gc.Parent=ghost
  local drag=nil
  local function boxAt(pos)
    for i,entry in ipairs(boxes)do
      local a,sz=entry.box.AbsolutePosition,entry.box.AbsoluteSize
      if pos.X>=a.X and pos.X<=a.X+sz.X and pos.Y>=a.Y-8 and pos.Y<=a.Y+sz.Y+8 then return i end
    end
    return nil
  end
  for _,row in ipairs(skillRows)do
    row.button.InputBegan:Connect(function(input)
      local kind=input.UserInputType
      if kind~=Enum.UserInputType.Touch and kind~=Enum.UserInputType.MouseButton1 then return end
      if not tray.Visible then return end
      drag={input=input,row=row,start=Vector2.new(input.Position.X,input.Position.Y),moved=false}
    end)
  end
  UserInputService.InputChanged:Connect(function(input)
    if not drag then return end
    if input~=drag.input and input.UserInputType~=Enum.UserInputType.MouseMovement then return end
    local pos=Vector2.new(input.Position.X,input.Position.Y)
    if not drag.moved and (pos-drag.start).Magnitude>24 then
      drag.moved=true;ghost.Text=drag.row.action.Label;ghost.Visible=true
    end
    if drag.moved then
      ghost.Position=UDim2.fromOffset(pos.X,pos.Y)
      local over=boxAt(pos)
      for i,entry in ipairs(boxes)do entry.edge.Thickness=i==over and 4 or 1 end
    end
  end)
  UserInputService.InputEnded:Connect(function(input)
    if not drag then return end
    local kind=input.UserInputType
    if kind~=Enum.UserInputType.Touch and kind~=Enum.UserInputType.MouseButton1 then return end
    local current=drag;drag=nil
    ghost.Visible=false
    for _,entry in ipairs(boxes)do entry.edge.Thickness=1 end
    if current.moved then
      local slot=boxAt(Vector2.new(input.Position.X,input.Position.Y))
      if slot then assign(slot,current.row.action.Id) end
    end
  end)
  meadowActionButtons.refreshDrop=refreshDrop
  meadowArt.refreshQuickTray=refreshDrop
  meadowArt.assignQuick=assign
  tray.Visible=false -- 장착은 하단 퀵슬롯의 '편집'에서만 한다.
end
skillQuick.Activated:Connect(function()
  if not selectedSkill then return end
  -- 고른 기술을 화면 아래 퀵슬롯(1~5번)에 넣는다. 눌러서 바로 쓰는 단축 칸이야.
  if meadowArt.openSlotChooser then meadowArt.openSlotChooser(selectedSkill.Id,selectedSkill.Label) end
end)
skillUse.Activated:Connect(function()
  if not selectedSkill or player:GetAttribute("ProfileReady")~=true then return end
  local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  if not human or human.Health<=0 then return end
  local deadline=player:GetAttribute("MeadowReady_"..selectedSkill.Id)
  if typeof(deadline)=="number" and deadline>workspace:GetServerTimeNow() then return end
  if meadowArt.skillLock(selectedSkill.Id) then return end
  if meadowMenu then meadowMenu.close() end
  activateMeadowAction(selectedSkill.Id)
end)
meadowActionButtons.quickById=function(id)
  for _,row in ipairs(skillRows) do
    if row.action.Id==id then
      selectedSkill=row.action
      if meadowArt.skillLock(id) then return end
      if meadowArt.openSlotChooser then meadowArt.openSlotChooser(id,row.action.Label) end
      return
    end
  end
end
meadowActionButtons.useById=function(id)
  for _,row in ipairs(skillRows) do
    if row.action.Id==id then selectedSkill=row.action;break end
  end
  if not selectedSkill or selectedSkill.Id~=id or player:GetAttribute("ProfileReady")~=true then return end
  local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  if not human or human.Health<=0 then return end
  local deadline=player:GetAttribute("MeadowReady_"..id)
  if typeof(deadline)=="number" and deadline>workspace:GetServerTimeNow() then return end
  if meadowArt.skillLock(id) then return end
  if meadowMenu then meadowMenu.close() end
  activateMeadowAction(id)
end
meadowActionButtons.refreshSkills()
return renderInventory
end)()

-- [가방] 왼쪽 주머니 단축 아이콘 제거. 인벤토리는 기존 메뉴의 2번 탭에서 계속 이용한다.
local villageContractRow=journalRow("VillageContracts",166)
villageContractRow.LayoutOrder=9
local questRows={}
for index=1,#(Config.MainQuests or {}) do
  questRows[index]=journalRow("Quest"..index,146)
  questRows[index].LayoutOrder=10+index
end
local storyRows={}
for index=1,#(Config.StoryRecords or {}) do
  storyRows[index]=journalRow("ResearchRecord"..index,120)
  storyRows[index].LayoutOrder=30+index
end
local function renderMeadowJournal()
  local stage=math.clamp(player:GetAttribute("QuestStage") or 1,1,#Config.MainQuests+1)
  local progress=player:GetAttribute("QuestProgress") or 0
  local quest=Config.MainQuests[stage]
  -- [마을 의뢰 저널] 기존 메인 연구 기록과 별도로 저장되는 결과·단서를 표시한다.
  local villageIndex=math.clamp(player:GetAttribute("VillageContractIndex") or 1,1,#Config.VillageContracts+1)
  local villagePhase=player:GetAttribute("VillageContractPhase") or 0
  local villageMask=player:GetAttribute("VillageContractEvidence") or 0
  local villageLines={"초원 마을 · 의뢰 기록"}
  local outcomes=player:GetAttribute("VillageContractOutcomes") or 0
  for index,contract in ipairs(Config.VillageContracts) do
    local decision=bit32.band(bit32.rshift(outcomes,(index-1)*2),3)
    if decision==1 or decision==2 then
      villageLines[#villageLines+1]="【완료】 "..contract.Name.."\n"..contract.Choices[decision].Outcome
    elseif index==villageIndex then
      local witness=bit32.lshift(1,contract.Witness-1)
      local found=(bit32.band(villageMask,witness)~=0 and 1 or 0)
        +(bit32.band(villageMask,8)~=0 and 1 or 0)
        +(bit32.band(villageMask,64)~=0 and 1 or 0)
      villageLines[#villageLines+1]="【"..(villagePhase==0 and "수락 대기" or villagePhase==2 and "결정 대기" or "조사 중").."】 "..contract.Name..
        "\n"..contract.Summary.."\n진행 "..found.."/3 · "..contract.WitnessName.." 진술 · 현장 1곳 · "..contract.EnemyName.." 처치."
    end
  end
  if villageIndex>#Config.VillageContracts then villageLines[#villageLines+1]="마을 의뢰 모두 완료" end
  villageContractRow.Text=table.concat(villageLines,"\n\n")
  trackerTitle.Text=quest and ("❖ [메인] "..quest.Name) or "❖ [메인] 완료"
  trackerDetail.Text=quest and string.format("☐ %s  (%d/%d)",quest.Instruction,progress,quest.Goal)
    or "☑ 메인 의뢰 완료"
  local village=Config.VillageContracts[villageIndex]
  if village then
    local witness=bit32.lshift(1,village.Witness-1)
    local count=(bit32.band(villageMask,witness)~=0 and 1 or 0)
      +(bit32.band(villageMask,8)~=0 and 1 or 0)
      +(bit32.band(villageMask,64)~=0 and 1 or 0)
    trackerVillage.Text="◆ [서브] "..village.Name.."\n  ☐ "..
      (villagePhase==0 and "촌장에게 수락" or villagePhase==2 and "촌장에게 보고"
      or string.format("현장 단서 %d/3",count))
  else
    trackerVillage.Text="◆ [서브] 마을 의뢰 완료"
  end
  local companionStage=player:GetAttribute("CompanionQuestStage") or 1
  local companion=Config.CompanionRequests[companionStage]
  if companion then
    local unlocked=stage>=companion.UnlockMainStage
    trackerCompanion.Text="☐ "..companion.Name.."  "..
      (unlocked and string.format("(%d/%d)",player:GetAttribute("CompanionQuestProgress") or 0,companion.Goal)
      or string.format("(메인 %d단계 해금)",companion.UnlockMainStage))
  else
    trackerCompanion.Text="☑ 동료 의뢰 완료"
  end
  inventoryRow.Text="소지품  ·  실제 보유·제작·장비 기록"
  renderWitcherInventory()
  for index,info in ipairs(Config.MainQuests) do
    local state=index<stage and "완료" or index==stage and "진행 중" or "잠김"
    local count=index<stage and info.Goal or index==stage and progress or 0
    questRows[index].Text=string.format("【%s】 %s\n%s  %d/%d\n\n%s",state,info.Name,info.Instruction,count,info.Goal,info.Story or "")
    questRows[index].TextColor3=index>stage and Color3.fromRGB(153,176,156) or Color3.fromRGB(246,251,236)
  end
  local owned=player:GetAttribute("ResearchRecords") or 0
  for index,record in ipairs(Config.StoryRecords) do
    local has=owned>=index
    storyRows[index].Text=has and ("【소장 아이템】 "..record.Title.."\n"..record.Text)
      or ("【미획득 기사단 연대기】 "..record.Title.."\n메인 퀘스트를 진행해 원본을 해금")
    storyRows[index].TextColor3=has and Color3.fromRGB(245,244,208) or Color3.fromRGB(161,180,164)
  end
end
-- [왼쪽 의뢰 추적] 항상 메인·마을 서브·동료 서브를 순서대로 표시하고 눌러 상세를 연다.
questTracker.Name="MeadowQuestHelperButton"
questTracker.Text=""
-- [참고 이미지 검은 의뢰판] 실시간 메인/서브 기록을 작은 체크리스트로 표현한다.
questTracker.BackgroundColor3=Color3.fromRGB(12,15,19)
questTracker.BackgroundTransparency=.74
local questRim=questTracker:FindFirstChildOfClass("UIStroke")
if questRim then
  questRim.Color=Color3.fromRGB(130,112,76)
  questRim.Transparency=.5
end
trackerTitle.Visible=true
trackerTitle.Font=Enum.Font.GothamBold
trackerTitle.TextColor3=Color3.fromRGB(244,188,72)
trackerTitle.TextSize=11
trackerTitle.TextStrokeTransparency=.35
trackerTitle.TextTruncate=Enum.TextTruncate.AtEnd
trackerDetail.Visible=true
trackerDetail.TextStrokeTransparency=.4
trackerDetail.TextColor3=Color3.fromRGB(242,235,222)
trackerDetail.TextSize=10
trackerDetail.TextYAlignment=Enum.TextYAlignment.Top
trackerVillage.Visible=true
trackerVillage.TextStrokeTransparency=.4
trackerVillage.TextColor3=Color3.fromRGB(118,199,255)
trackerVillage.TextSize=10
trackerCompanion.Visible=true
trackerCompanion.TextStrokeTransparency=.4
trackerCompanion.TextColor3=Color3.fromRGB(226,234,241)
trackerCompanion.TextSize=10
trackerNavigation.TextSize=9
trackerNavigation.TextColor3=Color3.fromRGB(183,183,172)
questTracker.Activated:Connect(function()
  if meadowTutorialAdvance then meadowTutorialAdvance(2) end
  -- [길 안내 연동] 퀘스트를 누르면 길 안내가 켜지고 목표 표시가 바로 뜬다.
  gui:SetAttribute("MeadowGuideForceOn",(gui:GetAttribute("MeadowGuideForceOn") or 0)+1)
  meadowMenu.open(3)
end)

-- [왼쪽 캐릭터창] 기존 3D 아바타·장비·숙련도 페이지와 실제 썸네일을 재사용한다.
local characterShortcut=Instance.new("TextButton")
characterShortcut.Name="MeadowCharacterButton"
characterShortcut.Text="캐릭터창"
characterShortcut.TextColor3=Color3.fromRGB(246,244,222)
characterShortcut.Font=Enum.Font.GothamBold
characterShortcut.TextSize=15
characterShortcut.TextXAlignment=Enum.TextXAlignment.Right
characterShortcut.BackgroundColor3=Color3.fromRGB(20,48,40)
characterShortcut.BackgroundTransparency=.06
characterShortcut.BorderSizePixel=0
characterShortcut.AutoButtonColor=true
characterShortcut.ZIndex=8
characterShortcut.Parent=gui
local characterShortcutCorner=Instance.new("UICorner")
characterShortcutCorner.CornerRadius=UDim.new(0,11)
characterShortcutCorner.Parent=characterShortcut
local characterShortcutStroke=Instance.new("UIStroke")
characterShortcutStroke.Color=Color3.fromRGB(131,194,150)
characterShortcutStroke.Transparency=.25
characterShortcutStroke.Thickness=1.2
characterShortcutStroke.Parent=characterShortcut
local characterShortcutPadding=Instance.new("UIPadding")
characterShortcutPadding.PaddingRight=UDim.new(0,11)
characterShortcutPadding.Parent=characterShortcut
local characterShortcutIcon=Instance.new("ImageLabel")
characterShortcutIcon.Name="RealAvatarThumbnail"
characterShortcutIcon.Size=UDim2.fromOffset(36,36)
characterShortcutIcon.Position=UDim2.fromOffset(10,10)
characterShortcutIcon.BackgroundColor3=Color3.fromRGB(42,74,57)
characterShortcutIcon.BackgroundTransparency=.2
characterShortcutIcon.BorderSizePixel=0
characterShortcutIcon.Image=meadowAvatar.Image
characterShortcutIcon.ZIndex=9
characterShortcutIcon.Parent=characterShortcut
local characterIconCorner=Instance.new("UICorner")
characterIconCorner.CornerRadius=UDim.new(1,0)
characterIconCorner.Parent=characterShortcutIcon
meadowAvatar:GetPropertyChangedSignal("Image"):Connect(function()
  characterShortcutIcon.Image=meadowAvatar.Image
end)
characterShortcut.Activated:Connect(function()meadowMenu.open(1)end)

-- [모바일] 세로 화면은 중앙 체력바 아래에 배치하고 조이스틱과 겹치지 않도록 한다.
-- [우측 상단] 여섯 메뉴 아이콘 바로 아래에 메인/서브 의뢰를 배치한다.
local function layoutMeadowJournal()
  local v=gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local landscape=v.X>v.Y
  local compact=landscape and v.Y<530
  local menuStep=landscape and math.floor(math.clamp(v.X/15,47,55))
    or math.floor(math.clamp((v.X-18)/6,47,52))
  local top=(landscape and 4 or 70)+menuStep+(landscape and 24 or 14)
  local width=math.floor(math.clamp(v.X*(landscape and .32 or .46),landscape and 210 or 150,landscape and 300 or 270))
  local height=compact and 156 or 186 -- [가독성] 글씨 확대 · 반투명
  local folded=meadowArt.questFolded==true
  if folded then height=32 end
  -- [가로 화면] 오른쪽 전투 버튼과 겹치지 않도록 퀘스트창은 왼쪽 체력바 아래에 둔다.
  local questLeft=landscape and 10 or v.X-width-8
  local questTop=landscape and math.max(0,72-math.floor(meadowArt.origin(gui).Y)) or top -- 화면 기준 체력바 바로 아래(상단 안전영역 보정)
  questTracker.Position=UDim2.fromOffset(questLeft,questTop)
  questTracker.Size=UDim2.fromOffset(width,height)
  trackerTitle.Position=UDim2.fromOffset(compact and 24 or 8,compact and 4 or 6)
  trackerTitle.Size=UDim2.new(1,(compact and -28 or -14)-76,0,compact and 22 or 20)
  trackerTitle.TextSize=compact and 17 or 17
  trackerDetail.Position=UDim2.fromOffset(compact and 8 or 10,compact and 30 or 28)
  trackerDetail.Size=UDim2.new(1,compact and -14 or -18,0,compact and 40 or 46)
  trackerDetail.TextSize=compact and 14 or 14
  trackerVillage.Position=UDim2.fromOffset(compact and 8 or 9,compact and 74 or 78)
  trackerVillage.Size=UDim2.new(1,compact and -14 or -18,0,compact and 40 or 46)
  trackerVillage.TextSize=compact and 13 or 13
  trackerCompanion.Position=UDim2.fromOffset(compact and 8 or 10,compact and 118 or 128)
  trackerCompanion.Size=UDim2.new(1,compact and -14 or -18,0,compact and 34 or 40)
  trackerCompanion.TextSize=compact and 13 or 13
  trackerNavigation.Position=UDim2.fromOffset(9,compact and 150 or 168)
  trackerNavigation.Size=UDim2.new(1,-17,0,14)
  trackerNavigation.Visible=not compact and not folded
  trackerDetail.Visible=not folded;trackerVillage.Visible=not folded;trackerCompanion.Visible=not folded
  local foldBtn=gui:FindFirstChild("QuestFoldButton")
  if foldBtn then
    foldBtn.Text=folded and "펼치기" or "접기"
    foldBtn.Size=UDim2.fromOffset(compact and 62 or 70,compact and 22 or 26)
    foldBtn.Position=UDim2.fromOffset(questLeft+width-4,questTop+(folded and 3 or 4))
    foldBtn.Visible=questTracker.Visible
  end
  local questIcon=questTracker:FindFirstChild("CC0QuestIcon")
  if questIcon then
    questIcon.Size=UDim2.fromOffset(compact and 18 or 22,compact and 18 or 22)
    questIcon.Position=UDim2.fromOffset(compact and 5 or 8,compact and 4 or 7)
  end
  characterShortcut.Position=landscape and UDim2.fromOffset(questLeft+width+8,questTop)
    or UDim2.fromOffset(9,top+height+8)
  characterShortcut.Size=UDim2.fromOffset(width,compact and 42 or 56)
  characterShortcut.Visible=false
end
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  local visible=gui:GetAttribute("GameMenuOpen")~=true
  questTracker.Visible=visible
  characterShortcut.Visible=false
end)
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowJournal)
do
  -- [퀘스트창 접기/펼치기] 외부 게임(젤다·원신·로블록스 RPG)처럼 제목줄 오른쪽의 작은 ▾/▸ 버튼.
  -- 퀘스트창(버튼) 자식이 아니라 gui 바로 아래에 둬서 크기가 다른 코드에 휘둘리지 않고, 접으면 제목 한 줄만 남는다.
  local fold=Instance.new("TextButton")
  fold.Name="QuestFoldButton";fold.AnchorPoint=Vector2.new(1,0);fold.Position=UDim2.fromOffset(0,0)
  fold.Size=UDim2.fromOffset(70,26);fold.AutomaticSize=Enum.AutomaticSize.None;fold.BackgroundColor3=Color3.fromRGB(34,52,44);fold.BackgroundTransparency=.08
  fold.BorderSizePixel=0;fold.AutoButtonColor=true;fold.Font=Enum.Font.GothamMedium;fold.TextSize=13;fold.TextWrapped=false;fold.TextColor3=Color3.fromRGB(245,236,200)
  fold.Text="접기";fold.ZIndex=questTracker.ZIndex+8
  Instance.new("UICorner",fold).CornerRadius=UDim.new(0,8)
  local foldStroke=Instance.new("UIStroke");foldStroke.Color=Color3.fromRGB(220,176,91);foldStroke.Thickness=1.2;foldStroke.ApplyStrokeMode=Enum.ApplyStrokeMode.Border;foldStroke.Parent=fold
  -- 공용 터치 최소 크기(52) 자동 부여를 피하려고 같은 이름의 제한을 먼저 달아 둔다.
  local foldLimit=Instance.new("UISizeConstraint");foldLimit.Name="VerifiedLearningTouchTarget";foldLimit.MinSize=Vector2.new(56,22);foldLimit.MaxSize=Vector2.new(80,30);foldLimit.Parent=fold
  fold.Parent=gui
  fold.Activated:Connect(function()
    meadowArt.questFolded=not (meadowArt.questFolded==true)
    layoutMeadowJournal()
  end)
  questTracker:GetPropertyChangedSignal("Visible"):Connect(function() fold.Visible=questTracker.Visible end)
end
layoutMeadowJournal()
for _,name in ipairs({"QuestStage","QuestProgress","QuestWood","QuestStone","ResearchRecords","Wood","Stone","Coins","WeaponTier",
  "VillageContractIndex","VillageContractPhase","VillageContractEvidence","VillageContractOutcomes",
  "CompanionQuestStage","CompanionQuestProgress"}) do
  player:GetAttributeChangedSignal(name):Connect(renderMeadowJournal)
end
renderMeadowJournal()
remote.OnClientEvent:Connect(function(kind,payload)
  if kind=="MEADOW_COMPANION_UPDATE" and typeof(payload)=="table" then
    meadowSurvivalHint.Text="동료 의뢰 완료 · "..tostring(payload.completed or "")
    meadowSurvivalHint.Visible=true
    meadowSurvivalHintToken+=1
    local token=meadowSurvivalHintToken
    task.delay(5,function()if token==meadowSurvivalHintToken then meadowSurvivalHint.Visible=false end end)
    renderMeadowPages()
    return
  end
  if kind~="MEADOW_QUEST_UPDATE" or typeof(payload)~="table" then return end
  -- [스카이림·오딧세이식 퀘스트 완료 연출] 화면 중앙 위에 큰 문구가 서서히 떠올랐다 사라진다.
  do
    local TweenService=game:GetService("TweenService")
    local banner=gui:FindFirstChild("MeadowQuestCompleteBanner")
    if banner then banner:Destroy() end
    banner=Instance.new("Frame")
    banner.Name="MeadowQuestCompleteBanner"
    banner.AnchorPoint=Vector2.new(.5,0);banner.Position=UDim2.new(.5,0,.16,0)
    banner.Size=UDim2.fromOffset(460,120);banner.BackgroundTransparency=1;banner.Active=false;banner.ZIndex=60
    banner.Parent=gui
    local function line(text,y,height,size,font,color)
      local label=Instance.new("TextLabel")
      label.BackgroundTransparency=1;label.Position=UDim2.fromOffset(0,y);label.Size=UDim2.new(1,0,0,height)
      label.Font=font;label.TextSize=size;label.TextColor3=color;label.Text=text;label.TextTransparency=1
      label.TextStrokeTransparency=1;label.ZIndex=61;label.TextWrapped=true;label.Parent=banner
      return label
    end
    local gold=Color3.fromRGB(236,212,150)
    local labels={
      line("퀘스트 완료",0,40,30,Enum.Font.GothamMedium,gold),
      line(tostring(payload.completed or ""),44,26,19,Enum.Font.Gotham,Color3.fromRGB(240,240,232)),
      line(payload.record and ("기사단 연대기 "..payload.record.." 획득") or "",72,22,15,Enum.Font.Gotham,Color3.fromRGB(190,214,204)),
      line(payload.nextQuest and ("다음  ·  "..tostring(payload.nextQuest)) or "",96,22,15,Enum.Font.Gotham,Color3.fromRGB(176,196,184)),
    }
    for _,label in ipairs(labels) do
      TweenService:Create(label,TweenInfo.new(.9,Enum.EasingStyle.Quad),{TextTransparency=0}):Play()
    end
    task.delay(4.2,function()
      for _,label in ipairs(labels) do
        if label.Parent then TweenService:Create(label,TweenInfo.new(1.2),{TextTransparency=1}):Play() end
      end
      task.delay(1.3,function() if banner.Parent then banner:Destroy() end end)
    end)
  end
  meadowSurvivalHint.Text="메인 완료: "..tostring(payload.completed or "")
    ..(payload.record and ("  ·  기사단 연대기 "..payload.record.." 획득!") or "")
  meadowSurvivalHint.Visible=true
  meadowSurvivalHintToken+=1
  local token=meadowSurvivalHintToken
  task.delay(5,function()
    if token==meadowSurvivalHintToken then meadowSurvivalHint.Visible=false end
  end)
end)

end

-- [초반 실전 튜토리얼] 첫 플레이에서만 실제 이동·의뢰 버튼·공격·회피 입력으로 단계 진행.
-- 저장 키·보상·스테미너·서버 전투 판정은 건드리지 않으며 도우미에서 언제든 다시 시작할 수 있다.
do
  local tutorialStep=1
  local tutorialForced=false
  local tutorialDone=false
  local tutorialOrigin=nil
  local tutorialToken=0
  local tutorialElapsed=0
  local tutorialCard=Instance.new("Frame")
  tutorialCard.Name="MeadowBeginnerTutorial"
  tutorialCard.AnchorPoint=Vector2.new(.5,1)
  tutorialCard.Size=UDim2.fromOffset(386,96)
  tutorialCard.BackgroundColor3=Color3.fromRGB(15,41,36)
  tutorialCard.BackgroundTransparency=.06
  tutorialCard.BorderSizePixel=0
  tutorialCard.Active=false
  tutorialCard.Visible=false
  tutorialCard.ZIndex=26
  tutorialCard.Parent=gui
  local tutorialCorner=Instance.new("UICorner")
  tutorialCorner.CornerRadius=UDim.new(0,13)
  tutorialCorner.Parent=tutorialCard
  local tutorialBorder=Instance.new("UIStroke")
  tutorialBorder.Color=Color3.fromRGB(233,199,127)
  tutorialBorder.Thickness=1.6
  tutorialBorder.Parent=tutorialCard
  local tutorialTitle=Instance.new("TextLabel")
  tutorialTitle.Name="StepTitle"
  tutorialTitle.Position=UDim2.fromOffset(14,7)
  tutorialTitle.Size=UDim2.new(1,-108,0,26)
  tutorialTitle.BackgroundTransparency=1
  tutorialTitle.TextXAlignment=Enum.TextXAlignment.Left
  tutorialTitle.TextColor3=Color3.fromRGB(253,226,157)
  tutorialTitle.Font=Enum.Font.GothamBold
  tutorialTitle.TextSize=15
  tutorialTitle.ZIndex=27
  tutorialTitle.Parent=tutorialCard
  local tutorialMessage=Instance.new("TextLabel")
  tutorialMessage.Name="StepInstruction"
  tutorialMessage.Position=UDim2.fromOffset(14,34)
  tutorialMessage.Size=UDim2.new(1,-28,0,54)
  tutorialMessage.BackgroundTransparency=1
  tutorialMessage.TextXAlignment=Enum.TextXAlignment.Left
  tutorialMessage.TextYAlignment=Enum.TextYAlignment.Top
  tutorialMessage.TextWrapped=true
  tutorialMessage.TextColor3=Color3.fromRGB(238,248,236)
  tutorialMessage.Font=Enum.Font.GothamMedium
  tutorialMessage.TextSize=14
  tutorialMessage.ZIndex=27
  tutorialMessage.Parent=tutorialCard
  local tutorialSkip=Instance.new("TextButton")
  tutorialSkip.Name="SkipTutorial"
  tutorialSkip.Position=UDim2.new(1,-90,0,7)
  tutorialSkip.Size=UDim2.fromOffset(78,30)
  tutorialSkip.BackgroundColor3=Color3.fromRGB(49,79,69)
  tutorialSkip.BorderSizePixel=0
  tutorialSkip.Text="건너뛰기"
  tutorialSkip.TextColor3=Color3.fromRGB(245,245,225)
  tutorialSkip.Font=Enum.Font.GothamBold
  tutorialSkip.TextSize=11
  tutorialSkip.ZIndex=28
  tutorialSkip.Parent=tutorialCard
  local skipCorner=Instance.new("UICorner")
  skipCorner.CornerRadius=UDim.new(0,8)
  skipCorner.Parent=tutorialSkip
  local steps={
    {"이동","왼쪽 조이스틱을 밀어 이동해 봐.\nPC: W·A·S·D  |  8칸 정도 이동하면 다음 안내로 넘어가."},
    {"퀘스트 확인","왼쪽 '퀘스트 도우미'를 눌러 봐.\n메인 퀘스트를 먼저 보고 마을·동료 서브 의뢰를 확인해."},
    {"기본 공격","빈 게임 화면을 한 번 터치해 공격해 봐.\nPC: 빈 화면 클릭  |  메뉴·버튼을 누르면 공격하지 않아."},
    {"회피 연습","오른쪽 '회피' 버튼을 눌러 봐.\n막기는 적의 공격을 방어하는 실제 기술이야."},
    {"상호작용","주민이나 조사 지점 가까이에서 오른쪽 '상호작용'을 눌러 봐.\n주민 대화·조사·채집은 원래 게임의 서버 기능을 이용해."},
    {"완료","조작 안내 완료! 메인 의뢰를 따라 초원 동물과 숲 가장자리를 조사해.\n다시 보고 싶으면 퀘스트 도우미에서 재시작할 수 있어."}
  }
  local function layoutTutorial()
    local v=gui.AbsoluteSize
    if v.X<=0 or v.Y<=0 then return end
    local portrait=v.X<v.Y
    tutorialCard.Size=UDim2.fromOffset(math.min(386,math.max(260,v.X-24)),portrait and 106 or 96)
    tutorialCard.Position=UDim2.new(.5,0,1,portrait and -168 or -80) -- 퀵슬롯 위로 올려 가리지 않게
    tutorialMessage.Size=UDim2.new(1,-28,0,portrait and 65 or 55)
  end
  local function refreshTutorial()
    if not tutorialForced and (player:GetAttribute("TutorialStep") or 0)>=99 then tutorialDone=true end
    local active=false and player:GetAttribute("ProfileReady")==true
      and gui:GetAttribute("TutorialOverviewDone")==true
      and not tutorialDone and gui.Enabled==true and gui:GetAttribute("GameMenuOpen")~=true
    tutorialCard.Visible=active
    meadowTutorialStep=active and tutorialStep or 0
    local current=steps[tutorialStep]
    tutorialTitle.Text="초보 모험 안내  "..math.min(tutorialStep,5).."/5 · "..current[1]
    tutorialMessage.Text=current[2]
    tutorialSkip.Visible=false -- 튜토리얼은 반드시 끝까지 진행한다.
    local questStroke=meadowQuestGuideButton and meadowQuestGuideButton:FindFirstChildOfClass("UIStroke")
    if questStroke then
      questStroke.Thickness=active and tutorialStep==2 and 3 or 1.2
      questStroke.Color=active and tutorialStep==2 and Color3.fromRGB(253,223,117)
        or Color3.fromRGB(131,194,150)
    end
    local dock=gui:FindFirstChild("MeadowR15SkillDock")
    local dodge=dock and dock:FindFirstChild("R15Skill2")
    local dodgeStroke=dodge and dodge:FindFirstChildOfClass("UIStroke")
    if dodgeStroke then dodgeStroke.Thickness=active and tutorialStep==4 and 3 or 2 end
    local interact=dock and dock:FindFirstChild("MeadowUtility1")
    local interactStroke=interact and interact:FindFirstChildOfClass("UIStroke")
    if interactStroke then interactStroke.Thickness=active and tutorialStep==5 and 3 or 2 end
  end
  meadowTutorialAdvance=function(expected)
    if tutorialDone or tutorialStep~=expected or gui.Enabled~=true
      or player:GetAttribute("ProfileReady")~=true then return end
    tutorialStep+=1
    tutorialOrigin=nil
    tutorialToken+=1
    refreshTutorial()
    if tutorialStep==6 then
      local completedToken=tutorialToken
      task.delay(3,function()
        if tutorialToken~=completedToken then return end
        tutorialDone=true
        pcall(function() remote:FireServer("ui:pref:tut:99") end)
        refreshTutorial()
      end)
    end
  end
  meadowTutorialRestart=function()
    tutorialForced=true
    tutorialDone=false
    tutorialStep=1
    tutorialOrigin=nil
    tutorialToken+=1
    refreshTutorial()
  end
  -- [서버 승인 입력] 퀘스트 안내는 실제 서버 승인·자원 증감·조사 응답 후에만 진행한다.
  -- [기존 애니메이션 승인 콜백 보존] 별도 모션 승인 리스너를 가로채지 않고 속성 변화만 관찰한다.
  player.AttributeChanged:Connect(function(name)
    if name~="ApprovedActionMotion" then return end
    local motion=tostring(player:GetAttribute(name) or "")
    if primaryCombatAction and meadowAttackAttemptAt>0
      and os.clock()-meadowAttackAttemptAt<2
      and string.find(motion,primaryCombatAction.Id..":",1,true)==1 then
      meadowTutorialAdvance(3)
    end
    if meadowDodgeAttemptAt>0 and os.clock()-meadowDodgeAttemptAt<2
      and (string.find(motion,"skill-meadow-dodge-left:",1,true)==1
        or string.find(motion,"skill-meadow-dodge-right:",1,true)==1) then
      meadowTutorialAdvance(4)
    end
  end)
  player:GetAttributeChangedSignal("MeadowSurvivalHintSerial"):Connect(function()
    if meadowInteractionAttemptAt>0 and os.clock()-meadowInteractionAttemptAt<2 then
      meadowTutorialAdvance(5)
    end
  end)
  remote.OnClientEvent:Connect(function(kind)
    if kind=="MEADOW_VILLAGE_DIALOG" and meadowInteractionAttemptAt>0
      and os.clock()-meadowInteractionAttemptAt<2 then
      meadowTutorialAdvance(5)
    end
  end)
  for _,attribute in ipairs({"Wood","Stone"}) do
    player:GetAttributeChangedSignal(attribute):Connect(function()
      if meadowInteractionAttemptAt>0 and os.clock()-meadowInteractionAttemptAt<2 then
        meadowTutorialAdvance(5)
      end
    end)
  end
  tutorialSkip.Activated:Connect(function()
    tutorialDone=true
    tutorialToken+=1
    refreshTutorial()
  end)
  gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutTutorial)
  gui:GetPropertyChangedSignal("Enabled"):Connect(refreshTutorial)
  gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(refreshTutorial)
  gui:GetAttributeChangedSignal("TutorialOverviewDone"):Connect(refreshTutorial)
  player:GetAttributeChangedSignal("TutorialStep"):Connect(refreshTutorial)
  player:GetAttributeChangedSignal("ProfileReady"):Connect(refreshTutorial)
  player:GetAttributeChangedSignal("MeadowProfileHadSave"):Connect(refreshTutorial)
  game:GetService("RunService").Heartbeat:Connect(function(dt)
    tutorialElapsed+=dt
    if tutorialElapsed<.3 then return end
    tutorialElapsed=0
    if tutorialStep~=1 or not tutorialCard.Visible then return end
    local character=player.Character
    local rootPart=character and character:FindFirstChild("HumanoidRootPart")
    local human=character and character:FindFirstChildOfClass("Humanoid")
    if not rootPart or not human or human.Health<=0 then return end
    if not tutorialOrigin then
      tutorialOrigin=rootPart.Position
      return
    end
    local delta=rootPart.Position-tutorialOrigin
    if Vector3.new(delta.X,0,delta.Z).Magnitude>=8 and human.MoveDirection.Magnitude>.12 then
      meadowTutorialAdvance(1)
    end
  end)
  layoutTutorial()
  refreshTutorial()
end

-- [첫 화면] 기존 초원 월드·R15 캐릭터·음향을 그대로 배경에 사용한다.
-- 새로운 3D 파츠나 배경용 가짜 월드를 만들지 않고, 시작 선택 뒤 기존 HUD를 복원한다.
do
  local ContentProvider=game:GetService("ContentProvider")
  local TweenService=game:GetService("TweenService")
  local arrivalGui=Instance.new("ScreenGui")
  arrivalGui.Name="MeadowArrivalScreen"
  arrivalGui.ResetOnSpawn=false
  arrivalGui.IgnoreGuiInset=true
  arrivalGui.DisplayOrder=100
  arrivalGui.Parent=player.PlayerGui
  local backdrop=Instance.new("Frame")
  backdrop.Name="ArrivalBackdrop"
  backdrop.Size=UDim2.fromScale(1,1)
  backdrop.BackgroundColor3=Color3.fromRGB(8,20,17)
  backdrop.BackgroundTransparency=.32
  backdrop.BorderSizePixel=0
  backdrop.Active=true
  backdrop.Parent=arrivalGui
  -- [시작 화면 생성] 장식 변수는 생성 구간에서만 유지해 Luau 지역변수 한도를 지킨다.
  do
    local shade=Instance.new("UIGradient")
    shade.Color=ColorSequence.new({
      ColorSequenceKeypoint.new(0,Color3.fromRGB(17,32,28)),
      ColorSequenceKeypoint.new(.5,Color3.fromRGB(65,77,64)),
      ColorSequenceKeypoint.new(1,Color3.fromRGB(12,24,22)),
    })
    shade.Rotation=90
    shade.Parent=backdrop
  end
  -- [상용 게임식 타이틀 연출] 위·아래 어두운 비네팅 + 하단 안내 문구. 중앙 월드가 또렷이 보이게 한다.
  for _,edge in ipairs({{"VignetteTop",0,.34,0},{"VignetteBottom",.66,.34,1}}) do
    local v=Instance.new("Frame")
    v.Name=edge[1];v.Position=UDim2.fromScale(0,edge[2]);v.Size=UDim2.fromScale(1,edge[3])
    v.BackgroundColor3=Color3.fromRGB(4,9,8);v.BorderSizePixel=0;v.Active=false;v.ZIndex=0;v.Parent=backdrop
    local g=Instance.new("UIGradient")
    g.Rotation=90
    g.Transparency=NumberSequence.new(edge[4]==0 and {NumberSequenceKeypoint.new(0,.05),NumberSequenceKeypoint.new(1,1)}
      or {NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(1,.05)})
    g.Parent=v
  end
  local function panel(name,width,height)
    local frame=Instance.new("Frame")
    frame.Name=name
    frame.AnchorPoint=Vector2.new(.5,.5)
    frame.Position=UDim2.fromScale(.5,.5)
    frame.Size=UDim2.new(.9,0,0,height)
    frame.BackgroundColor3=Color3.fromRGB(15,26,23)
    frame.BackgroundTransparency=.08
    frame.BorderSizePixel=0
    frame.ZIndex=2
    frame.Parent=backdrop
    local sizeLimit=Instance.new("UISizeConstraint")
    sizeLimit.MaxSize=Vector2.new(width,height)
    sizeLimit.Parent=frame
    local corner=Instance.new("UICorner")
    corner.CornerRadius=UDim.new(0,18)
    corner.Parent=frame
    local stroke=Instance.new("UIStroke")
    stroke.Color=Color3.fromRGB(226,188,112)
    stroke.Thickness=3
    stroke.Parent=frame
    local strokeGrad=Instance.new("UIGradient")
    strokeGrad.Color=ColorSequence.new({
      ColorSequenceKeypoint.new(0,Color3.fromRGB(255,232,160)),
      ColorSequenceKeypoint.new(.5,Color3.fromRGB(170,126,60)),
      ColorSequenceKeypoint.new(1,Color3.fromRGB(255,226,150)),
    })
    strokeGrad.Rotation=90
    strokeGrad.Parent=stroke
    local fill=Instance.new("UIGradient")
    fill.Color=ColorSequence.new(Color3.fromRGB(30,48,42),Color3.fromRGB(10,18,16))
    fill.Rotation=90
    fill.Parent=frame
    -- 안쪽 금빛 가는 테두리(상용 게임 패널의 이중 프레임)
    local inner=Instance.new("Frame")
    inner.Name="InnerFrame"
    inner.AnchorPoint=Vector2.new(.5,.5);inner.Position=UDim2.fromScale(.5,.5)
    inner.Size=UDim2.new(1,-14,1,-14);inner.BackgroundTransparency=1;inner.ZIndex=2;inner.Active=false;inner.Parent=frame
    local innerCorner=Instance.new("UICorner");innerCorner.CornerRadius=UDim.new(0,13);innerCorner.Parent=inner
    local innerStroke=Instance.new("UIStroke");innerStroke.Color=Color3.fromRGB(226,188,112);innerStroke.Thickness=1;innerStroke.Transparency=.55;innerStroke.Parent=inner
    return frame
  end
  local function label(parent,name,value,y,height,size,color)
    local t=Instance.new("TextLabel")
    t.Name=name
    t.Position=UDim2.new(0,10,0,y)
    t.Size=UDim2.new(1,-20,0,height)
    t.BackgroundTransparency=1
    t.Text=value
    t.Font=Enum.Font.GothamBold
    t.TextSize=size
    t.TextColor3=color or Color3.fromRGB(255,232,170)
    t.TextWrapped=true
    t.TextStrokeColor3=Color3.fromRGB(10,14,12)
    t.TextStrokeTransparency=.35
    t.ZIndex=3
    t.Parent=parent
    return t
  end
  local function button(parent,name,value,y)
    local primary=name=="Continue" or name=="Confirm"
    local b=Instance.new("TextButton")
    b.Name=name
    b.Position=UDim2.new(0,24,0,y)
    b.Size=UDim2.new(1,-48,0,44)
    b.BackgroundColor3=primary and Color3.fromRGB(236,196,106) or Color3.fromRGB(40,62,52)
    b.TextColor3=primary and Color3.fromRGB(52,32,8) or Color3.fromRGB(255,244,214)
    b.Font=Enum.Font.GothamBlack
    b.TextSize=primary and 19 or 16
    b.Text=value
    b.AutoButtonColor=true
    b.ZIndex=4
    b.Parent=parent
    local corner=Instance.new("UICorner")
    corner.CornerRadius=UDim.new(0,12)
    corner.Parent=b
    local edge=Instance.new("UIStroke")
    edge.Color=primary and Color3.fromRGB(255,240,190) or Color3.fromRGB(190,156,92)
    edge.Thickness=primary and 2.5 or 1.5
    edge.ApplyStrokeMode=Enum.ApplyStrokeMode.Border
    edge.Parent=b
    local shine=Instance.new("UIGradient")
    shine.Color=primary and ColorSequence.new(Color3.fromRGB(255,224,140),Color3.fromRGB(190,138,60))
      or ColorSequence.new(Color3.fromRGB(62,92,76),Color3.fromRGB(28,44,38))
    shine.Rotation=90
    shine.Parent=b
    return b
  end
  local titlePanel=panel("MeadowTitle",390,306)
  -- [시작 화면 생성] 장식 변수는 생성 구간에서만 유지해 Luau 지역변수 한도를 지킨다.
  do
    local gameName=label(titlePanel,"GameName","마 력 숲",14,60,44,Color3.new(1,1,1))
    gameName.TextStrokeTransparency=0
    gameName.TextStrokeColor3=Color3.fromRGB(70,40,8)
    local logoGrad=Instance.new("UIGradient")
    logoGrad.Color=ColorSequence.new({ColorSequenceKeypoint.new(0,Color3.fromRGB(255,246,200)),
      ColorSequenceKeypoint.new(.55,Color3.fromRGB(246,198,98)),ColorSequenceKeypoint.new(1,Color3.fromRGB(176,118,40))})
    logoGrad.Rotation=90
    logoGrad.Parent=gameName
    local logoLine=Instance.new("Frame")
    logoLine.Name="LogoDivider";logoLine.AnchorPoint=Vector2.new(.5,0);logoLine.Position=UDim2.new(.5,0,0,74)
    logoLine.Size=UDim2.new(.6,0,0,2);logoLine.BorderSizePixel=0;logoLine.BackgroundColor3=Color3.fromRGB(226,188,112);logoLine.ZIndex=3;logoLine.Parent=titlePanel
    local lineGrad=Instance.new("UIGradient")
    lineGrad.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.5,0),NumberSequenceKeypoint.new(1,1)})
    lineGrad.Parent=logoLine
  end
  label(titlePanel,"GameSubtitle","안개가 걷히면, 또 다른 이야기가 시작된다",80,28,13,Color3.fromRGB(214,226,204))
  local continueButton=button(titlePanel,"Continue","이어하기",116)
  local newButton=button(titlePanel,"NewGame","새 게임",168)
  local settingButton=button(titlePanel,"Settings","설정 · 프롤로그 보기",220)
  local titleStatus=label(titlePanel,"SaveState","저장 기록 확인 중",266,29,12,Color3.fromRGB(203,214,195))

  local options=panel("MeadowTitleSettings",390,368)
  options.Visible=false
  label(options,"SettingsTitle","환경 설정",18,44,25)
  local effectsButton=button(options,"Effects","효과음",83)
  local ambienceButton=button(options,"Ambience","환경음",135)
  local cameraButton=button(options,"CameraMode","카메라 시점",187)
  local replayButton=button(options,"ReplayPrologue","프롤로그 보고 입장",239)
  local settingsBack=button(options,"Back","돌아가기",295)
  local function refreshArrivalOptions()
    effectsButton.Text="효과음  "..math.floor(meadowEffectsGroup.Volume*100+.5).."%"
    ambienceButton.Text="환경음  "..math.floor(meadowAmbienceGroup.Volume*100+.5).."%"
    cameraButton.Text="카메라  ·  "..meadowCameraModes[meadowCameraMode]
  end
  cameraButton.Activated:Connect(function()
    cycleMeadowCameraMode()
    refreshArrivalOptions()
  end)
  effectsButton.Activated:Connect(function()
    meadowEffectsGroup.Volume=meadowEffectsGroup.Volume>.9 and 0 or math.min(1,meadowEffectsGroup.Volume+.25)
    refreshArrivalOptions()
  end)
  ambienceButton.Activated:Connect(function()
    meadowAmbienceGroup.Volume=meadowAmbienceGroup.Volume>.9 and 0 or math.min(1,meadowAmbienceGroup.Volume+.25)
    refreshArrivalOptions()
  end)
  settingButton.Activated:Connect(function()
    refreshArrivalOptions()
    titlePanel.Visible=false
    options.Visible=true
  end)
  settingsBack.Activated:Connect(function()
    options.Visible=false
    titlePanel.Visible=true
  end)

  local confirmPanel=panel("MeadowNewGameConfirm",390,244)
  confirmPanel.Visible=false
  label(confirmPanel,"Warning","기존 진행도를 삭제할까?",18,46,24)
  label(confirmPanel,"Details","숙련도·재화·의뢰·탐험 기록이 처음부터 시작돼.\n기존 저장은 되돌릴 수 없어.",68,54,14,Color3.fromRGB(251,218,185))
  local confirmButton=button(confirmPanel,"Confirm","삭제 확인 · 새 게임 시작",130)
  local cancelButton=button(confirmPanel,"Cancel","취소",182)
  cancelButton.Activated:Connect(function()
    confirmPanel.Visible=false
    titlePanel.Visible=true
  end)

  -- [로딩 화면] 허구의 발견 지도/구역 배지/안개 표식 대신 제목과 실제 진행만 표시.
  local loadPanel=panel("MeadowMapLoading",390,178)
  loadPanel.Visible=false
  loadPanel.BackgroundColor3=Color3.fromRGB(24,43,34)
  label(loadPanel,"LoadingGameTitle","마력숲",20,48,29,Color3.fromRGB(242,226,177))
  local loadingStatus=label(loadPanel,"LoadingStatus","서버 확인 중",69,30,14,Color3.fromRGB(216,227,205))
  local progressTrack=Instance.new("Frame")
  progressTrack.Name="ProgressTrack"
  progressTrack.Position=UDim2.new(0,24,0,118)
  progressTrack.Size=UDim2.new(1,-48,0,10)
  progressTrack.BackgroundColor3=Color3.fromRGB(60,70,57)
  progressTrack.BorderSizePixel=0
  progressTrack.Parent=loadPanel
  -- [시작 화면 생성] 장식 변수는 생성 구간에서만 유지해 Luau 지역변수 한도를 지킨다.
  do
    local progressCorner=Instance.new("UICorner")
    progressCorner.CornerRadius=UDim.new(0,5)
    progressCorner.Parent=progressTrack
  end
  local progressFill=Instance.new("Frame")
  progressFill.Name="VerifiedProgress"
  progressFill.Size=UDim2.fromScale(0,1)
  progressFill.BackgroundColor3=Color3.fromRGB(166,196,117)
  progressFill.BorderSizePixel=0
  progressFill.Parent=progressTrack
  -- [시작 화면 생성] 장식 변수는 생성 구간에서만 유지해 Luau 지역변수 한도를 지킨다.
  do
    local fillCorner=Instance.new("UICorner")
    fillCorner.CornerRadius=UDim.new(0,5)
    fillCorner.Parent=progressFill
  end


  -- [2.5D 오프닝 / 메인] 실물 월드와 완성 그림을 분리해 중복 인물 노출을 막는다.
  -- 미승인 전쟁 NPC/괴물/배경 모델은 생성하지 않는다. 기존 HUD·저장·전투 판정 불변.
  local introPanel=Instance.new("Frame")
  introPanel.Name="FirstArrivalScene"
  introPanel.Size=UDim2.fromScale(1,1)
  introPanel.BackgroundColor3=Color3.fromRGB(7,12,18)
  introPanel.BackgroundTransparency=.38
  introPanel.BorderSizePixel=0
  introPanel.Active=true
  introPanel.Visible=false
  introPanel.Parent=backdrop
  local introTint=Instance.new("Frame")
  introTint.Name="StoryAtmosphere"
  introTint.Size=UDim2.fromScale(1,1)
  introTint.BorderSizePixel=0
  introTint.BackgroundColor3=Color3.fromRGB(23,34,43)
  introTint.BackgroundTransparency=.65
  introTint.ZIndex=3
  introTint.Parent=introPanel
  -- [기억의 무대] 승인 원화의 투명·불규칙한 가장자리를 마법 안개로 감싼다.
  -- 직사각형 크롭이나 별도 이미지 복제 없이 같은 오프닝 GUI에서만 표현한다.
  local storyVision=Instance.new("Frame")
  storyVision.Name="MemoryVisionStage"
  storyVision.BackgroundColor3=Color3.fromRGB(61,43,78)
  storyVision.BackgroundTransparency=1
  storyVision.BorderSizePixel=0
  storyVision.Position=UDim2.fromScale(.075,.13)
  storyVision.Size=UDim2.fromScale(.85,.66)
  storyVision.ZIndex=4
  storyVision.Visible=false
  storyVision.Parent=introPanel
  local storyVisionGradient=Instance.new("UIGradient")
  storyVisionGradient.Color=ColorSequence.new(
    Color3.fromRGB(20,13,36),Color3.fromRGB(91,50,113))
  storyVisionGradient.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,.92),
    NumberSequenceKeypoint.new(.20,.36),
    NumberSequenceKeypoint.new(.50,.08),
    NumberSequenceKeypoint.new(.80,.36),
    NumberSequenceKeypoint.new(1,.92),
  })
  storyVisionGradient.Rotation=12
  storyVisionGradient.Parent=storyVision
  -- [2.5D 오프닝 원화] 기존 완성 원화를 직사각형 절편으로 자르거나 복제하지 않는다.
  -- [인물 연기] 별도 등록된 투명 인물 원화는 실제 월드 후경과 독립적으로 움직인다.
  local storyPaintStage=Instance.new("Frame")
  storyPaintStage.Name="IntroPainted25DStage"
  storyPaintStage.AnchorPoint=Vector2.new(.5,.5)
  storyPaintStage.Position=UDim2.fromScale(.5,.45)
  storyPaintStage.Size=UDim2.fromScale(.96,.71)
  storyPaintStage.BackgroundTransparency=1
  storyPaintStage.BorderSizePixel=0
  storyPaintStage.ClipsDescendants=true
  storyPaintStage.ZIndex=6
  storyPaintStage.Visible=false
  storyPaintStage.Parent=introPanel
  local storyArtwork=Instance.new("ImageLabel")
  storyArtwork.Name="OriginalScenePainting"
  storyArtwork.AnchorPoint=Vector2.new(.5,.5)
  storyArtwork.Position=UDim2.fromScale(.5,.5)
  storyArtwork.Size=UDim2.fromScale(1.12,1.12)
  storyArtwork.BackgroundTransparency=1
  storyArtwork.BorderSizePixel=0
  storyArtwork.ScaleType=Enum.ScaleType.Fit
  storyArtwork.ImageTransparency=1
  storyArtwork.ZIndex=6
  storyArtwork.Visible=false
  storyArtwork.Parent=storyPaintStage
  local actorMotionFrame=Instance.new("Frame")
  actorMotionFrame.Name="OriginalCharacterDepth"
  actorMotionFrame.AnchorPoint=Vector2.new(.5,.5)
  actorMotionFrame.Position=UDim2.fromScale(.5,.5)
  actorMotionFrame.Size=UDim2.fromScale(1,1)
  actorMotionFrame.BackgroundTransparency=1
  actorMotionFrame.BorderSizePixel=0
  actorMotionFrame.ZIndex=8
  actorMotionFrame.Visible=false
  actorMotionFrame.Parent=storyPaintStage
  local storyForeground=Instance.new("ImageLabel")
  storyForeground.Name="AnimatedOriginalCharacter"
  storyForeground.AnchorPoint=Vector2.new(.5,.5)
  storyForeground.Position=UDim2.fromScale(.5,.5)
  storyForeground.Size=UDim2.fromScale(1,1)
  storyForeground.BackgroundTransparency=1
  storyForeground.BorderSizePixel=0
  storyForeground.ScaleType=Enum.ScaleType.Fit
  storyForeground.ImageTransparency=1
  storyForeground.ZIndex=8
  storyForeground.Visible=false
  storyForeground.Parent=actorMotionFrame
  -- [먼 공기 / 별도 시차층] 전경 PNG나 배경 JPG의 재사용 없이 깊이만 만드는 안개층.
  local storyFarHaze=Instance.new("Frame")
  storyFarHaze.Name="StoryFarDepthHaze"
  storyFarHaze.Position=UDim2.fromScale(-.06,.58)
  storyFarHaze.Size=UDim2.fromScale(1.12,.38)
  storyFarHaze.BackgroundColor3=Color3.fromRGB(151,189,204)
  storyFarHaze.BackgroundTransparency=.91
  storyFarHaze.BorderSizePixel=0
  storyFarHaze.ZIndex=7
  storyFarHaze.Visible=false
  storyFarHaze.Parent=introPanel
  local storyFarGradient=Instance.new("UIGradient")
  storyFarGradient.Rotation=90
  storyFarGradient.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,1),
    NumberSequenceKeypoint.new(.34,.94),
    NumberSequenceKeypoint.new(.72,.32),
    NumberSequenceKeypoint.new(1,1),
  })
  storyFarGradient.Parent=storyFarHaze
  -- [화면 분위기] 기존 승인 원화 한 장과 별도 조명·대기층만 사용한다.
  local storyAtmosphere=Instance.new("Frame")
  storyAtmosphere.Name="CinematicParticles"
  storyAtmosphere.BackgroundTransparency=1
  storyAtmosphere.Size=UDim2.fromScale(1,1)
  storyAtmosphere.ClipsDescendants=true
  -- [실제 화면 연출] 승인 원화의 앞에서 그림자와 안개만 흐른다. 자막은 가리지 않는다.
  storyAtmosphere.ZIndex=9
  storyAtmosphere.Parent=introPanel
  -- [광선 / 연출효과] 가벼운 화면 그라디언트로 위치·강도를 따로 움직인다.
  local cinematicLight=Instance.new("Frame")
  cinematicLight.Name="IntroLayeredMoonlight"
  cinematicLight.AnchorPoint=Vector2.new(.5,.5)
  cinematicLight.Position=UDim2.fromScale(-.22,.4)
  cinematicLight.Size=UDim2.fromScale(.36,1.34)
  cinematicLight.BackgroundColor3=Color3.fromRGB(171,207,240)
  cinematicLight.BackgroundTransparency=.93
  cinematicLight.BorderSizePixel=0
  cinematicLight.Rotation=14
  cinematicLight.ZIndex=9
  cinematicLight.Visible=false
  cinematicLight.Parent=storyAtmosphere
  local cinematicLightFade=Instance.new("UIGradient")
  cinematicLightFade.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,1),
    NumberSequenceKeypoint.new(.16,.98),
    NumberSequenceKeypoint.new(.45,.32),
    NumberSequenceKeypoint.new(.65,.68),
    NumberSequenceKeypoint.new(1,1),
  })
  cinematicLightFade.Parent=cinematicLight
  -- [시네마틱 명암] 기존 승인 원화에만 적용하는 무소재 비네트. 인물·건물 모델을 생성하지 않는다.
  local cinematicVignette=Instance.new("Frame")
  cinematicVignette.Name="DarkFantasyVignette"
  cinematicVignette.Size=UDim2.fromScale(1,1)
  cinematicVignette.BorderSizePixel=0
  cinematicVignette.BackgroundColor3=Color3.fromRGB(3,6,8)
  cinematicVignette.BackgroundTransparency=.86
  cinematicVignette.ZIndex=7
  cinematicVignette.Parent=introPanel
  local vignetteGradient=Instance.new("UIGradient")
  vignetteGradient.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,.18),
    NumberSequenceKeypoint.new(.5,1),
    NumberSequenceKeypoint.new(1,.18),
  })
  vignetteGradient.Parent=cinematicVignette
  -- [별도 반딧불] 직사각형 파츠 대신 기존 Roblox 내장 텍스처를 사용한다.
  local cinematicParticles={}
  for n=1,16 do
    local spark=Instance.new("ImageLabel")
    spark.Name="CinematicParticle"..n
    spark.Size=UDim2.fromOffset(5+(n%4)*2,5+(n%4)*2)
    spark.BackgroundTransparency=1
    spark.Image="rbxasset://textures/particles/sparkles_main.dds"
    spark.ImageColor3=Color3.fromRGB(232,190,124)
    spark.ImageTransparency=.5
    spark.ScaleType=Enum.ScaleType.Fit
    spark.Rotation=n*19
    spark.ZIndex=9
    spark.Parent=storyAtmosphere
    cinematicParticles[n]=spark
  end
  -- [그림자 시네마] 할로우 나이트식 깊이감을 기존 원화 위의 지나가는 어둠으로 연출한다.
  -- 광선·섬광은 쓰지 않고 한 장면의 명암과 시선 이동으로 긴장감을 만든다.
  local cinematicShadow=Instance.new("Frame")
  cinematicShadow.Name="MemoryPassingShadow"
  cinematicShadow.AnchorPoint=Vector2.new(.5,.5)
  cinematicShadow.Position=UDim2.fromScale(-.55,.5)
  cinematicShadow.Size=UDim2.fromScale(.68,1.6)
  cinematicShadow.Rotation=8
  cinematicShadow.BackgroundColor3=Color3.fromRGB(7,11,16)
  cinematicShadow.BackgroundTransparency=.84
  cinematicShadow.BorderSizePixel=0
  cinematicShadow.ZIndex=9
  cinematicShadow.Visible=false
  cinematicShadow.Parent=storyAtmosphere
  local shadowFalloff=Instance.new("UIGradient")
  shadowFalloff.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,1),
    NumberSequenceKeypoint.new(.18,.91),
    NumberSequenceKeypoint.new(.43,.32),
    NumberSequenceKeypoint.new(.58,.37),
    NumberSequenceKeypoint.new(.84,.91),
    NumberSequenceKeypoint.new(1,1),
  })
  shadowFalloff.Parent=cinematicShadow
  -- [장면 환경] 새벽 안개·차원 균열만 화면 하단에서 흘러들어온다.
  local cinematicMist=Instance.new("Frame")
  cinematicMist.Name="CinematicMovingMist"
  cinematicMist.Size=UDim2.fromScale(1,.4)
  cinematicMist.Position=UDim2.fromScale(0,1)
  cinematicMist.BackgroundColor3=Color3.fromRGB(120,176,153)
  cinematicMist.BackgroundTransparency=.88
  cinematicMist.BorderSizePixel=0
  cinematicMist.ZIndex=9
  cinematicMist.Visible=false
  cinematicMist.Parent=storyAtmosphere
  local mistFalloff=Instance.new("UIGradient")
  mistFalloff.Rotation=90
  mistFalloff.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,1),
    NumberSequenceKeypoint.new(.23,.96),
    NumberSequenceKeypoint.new(.65,.54),
    NumberSequenceKeypoint.new(1,.96),
  })
  mistFalloff.Parent=cinematicMist
  local introGradient=Instance.new("UIGradient")
  introGradient.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,Color3.fromRGB(8,12,20)),
    ColorSequenceKeypoint.new(.55,Color3.fromRGB(70,66,56)),
    ColorSequenceKeypoint.new(1,Color3.fromRGB(7,10,16)),
  })
  introGradient.Rotation=90
  introGradient.Parent=introTint
  local cinematicBars={}
  for _,top in ipairs({true,false}) do
    local bar=Instance.new("Frame")
    bar.Name=top and "CinemaTopBar" or "CinemaBottomBar"
    bar.Position=top and UDim2.fromScale(0,0) or UDim2.fromScale(0,.89)
    bar.Size=UDim2.fromScale(1,.11)
    bar.BackgroundColor3=Color3.fromRGB(2,4,7)
    bar.BorderSizePixel=0
    bar.ZIndex=10
    bar.Parent=introPanel
    cinematicBars[top and 1 or 2]=bar
  end
  -- [오프닝 자막] 장면 제목 1개와 대사 1개만 남기고 인물 화면을 확보한다.
  local subtitlePlate=Instance.new("Frame")
  subtitlePlate.Name="CharacterSubtitlePlate"
  subtitlePlate.AnchorPoint=Vector2.new(.5,1)
  subtitlePlate.Position=UDim2.fromScale(.5,.866)
  subtitlePlate.Size=UDim2.fromScale(.90,.155)
  subtitlePlate.BackgroundColor3=Color3.fromRGB(7,11,17)
  subtitlePlate.BackgroundTransparency=.16
  subtitlePlate.BorderSizePixel=0
  subtitlePlate.ZIndex=11
  subtitlePlate.Parent=introPanel
  local subtitleShade=Instance.new("UIGradient")
  subtitleShade.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,Color3.fromRGB(7,12,18)),
    ColorSequenceKeypoint.new(.68,Color3.fromRGB(20,24,27)),
    ColorSequenceKeypoint.new(1,Color3.fromRGB(7,12,18)),
  })
  subtitleShade.Rotation=12
  subtitleShade.Parent=subtitlePlate
  local subtitleOutline=Instance.new("UIStroke")
  subtitleOutline.Color=Color3.fromRGB(207,171,106)
  subtitleOutline.Thickness=1
  subtitleOutline.Transparency=.58
  subtitleOutline.Parent=subtitlePlate
  -- [상단 제목] 고딕 판타지 금색 제목 한 줄.
  local regionIntro=label(introPanel,"RegionReveal","",0,85,32,Color3.fromRGB(238,209,145))
  regionIntro.AnchorPoint=Vector2.new(.5,0)
  regionIntro.Position=UDim2.fromScale(.5,.14)
  regionIntro.Size=UDim2.fromScale(.86,.088)
  regionIntro.TextScaled=true
  regionIntro.TextWrapped=false
  regionIntro.Font=Enum.Font.Antique
  regionIntro.TextStrokeColor3=Color3.fromRGB(4,5,10)
  regionIntro.TextStrokeTransparency=.12
  regionIntro.ZIndex=14
  -- [시작 화면 생성] 장식 변수는 생성 구간에서만 유지해 Luau 지역변수 한도를 지킨다.
  do
    local titleSize=Instance.new("UITextSizeConstraint")
    titleSize.MinTextSize=21;titleSize.MaxTextSize=39;titleSize.Parent=regionIntro
  end
  -- [하단 대사] 화자·설명 표식 없이 최대 두 줄만 표시한다.
  local introDialogue=label(introPanel,"DialogueLine","",0,90,20,Color3.fromRGB(255,242,211))
  introDialogue.AnchorPoint=Vector2.new(.5,0)
  introDialogue.Position=UDim2.fromScale(.5,.741)
  introDialogue.Size=UDim2.fromScale(.84,.103)
  introDialogue.TextXAlignment=Enum.TextXAlignment.Center
  introDialogue.TextYAlignment=Enum.TextYAlignment.Center
  introDialogue.TextWrapped=true
  introDialogue.TextScaled=true
  introDialogue.Font=Enum.Font.Antique
  introDialogue.TextStrokeColor3=Color3.fromRGB(2,5,10)
  introDialogue.TextStrokeTransparency=.2
  introDialogue.ZIndex=14
  -- [시작 화면 생성] 장식 변수는 생성 구간에서만 유지해 Luau 지역변수 한도를 지킨다.
  do
    local dialogueSize=Instance.new("UITextSizeConstraint")
    dialogueSize.MinTextSize=15;dialogueSize.MaxTextSize=23;dialogueSize.Parent=introDialogue
  end
  -- [모바일 자막] 화면 비율이 바뀌어도 제목·대사 두 곳만 유지하고 인물의 중앙을 비운다.
  local function layoutIntroCaptions()
    local size=introPanel.AbsoluteSize
    if size.X<1 or size.Y<1 then return end
    local portrait=size.Y>size.X*1.1
    -- [글자 영역 분리] 제목은 상단 레터박스, 대사는 하단 레터박스에 둔다.
    regionIntro.Position=UDim2.fromScale(.5,portrait and .035 or .028)
    regionIntro.Size=UDim2.fromScale(portrait and .72 or .66,portrait and .068 or .065)
    subtitlePlate.Position=UDim2.fromScale(.5,.982)
    subtitlePlate.Size=UDim2.fromScale(portrait and .96 or .90,.135)
    introDialogue.Position=UDim2.fromScale(.5,portrait and .860 or .856)
    introDialogue.Size=UDim2.fromScale(portrait and .90 or .84,.105)
    -- [화면비 보호] 인물·전장 전체를 실제 안전 구역 안에 Fit으로 표시한다.
    storyVision.Position=UDim2.fromScale(portrait and .035 or .075,portrait and .145 or .13)
    storyVision.Size=UDim2.fromScale(portrait and .93 or .85,portrait and .635 or .66)
    -- [화면비] 원본 일러스트와 투명 인물 원화는 자르거나 늘이지 않고 동일 화면비를 유지한다.
    local ratio=16/9
    local viewWidth=size.X*(portrait and .98 or .96)
    local viewHeight=size.Y*(portrait and .70 or .76)
    local fitWidth=math.min(viewWidth,viewHeight*ratio)
    storyPaintStage.Size=UDim2.fromOffset(math.floor(fitWidth),math.floor(fitWidth/ratio))
    storyPaintStage.Position=UDim2.fromScale(.5,portrait and .45 or .47)
    actorMotionFrame.Position=UDim2.fromScale(.5,.5)
    actorMotionFrame.Size=UDim2.fromScale(1,1)
  end
  layoutIntroCaptions()
  introPanel:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutIntroCaptions)
  local storyCurtain=Instance.new("Frame")
  storyCurtain.Name="MemoryInkCurtain"
  storyCurtain.Size=UDim2.fromScale(1,1)
  storyCurtain.BackgroundColor3=Color3.fromRGB(5,8,14)
  storyCurtain.BackgroundTransparency=1
  storyCurtain.BorderSizePixel=0
  storyCurtain.ZIndex=19
  storyCurtain.Parent=introPanel
  local storyProgressTrack=Instance.new("Frame")
  storyProgressTrack.Name="StoryProgressTrack"
  storyProgressTrack.Position=UDim2.fromScale(0,.989)
  storyProgressTrack.Size=UDim2.fromScale(1,.005)
  storyProgressTrack.BackgroundColor3=Color3.fromRGB(61,66,63)
  storyProgressTrack.BorderSizePixel=0
  storyProgressTrack.ZIndex=21
  storyProgressTrack.Parent=introPanel
  local storyProgress=Instance.new("Frame")
  storyProgress.Name="StoryProgress"
  storyProgress.Size=UDim2.fromScale(0,1)
  storyProgress.BackgroundColor3=Color3.fromRGB(222,185,116)
  storyProgress.BorderSizePixel=0
  storyProgress.ZIndex=22
  storyProgress.Parent=storyProgressTrack
  local skipButton=button(introPanel,"Skip","건너뛰기",170)
  skipButton.AnchorPoint=Vector2.new(1,0)
  skipButton.Position=UDim2.new(1,-16,0,12)
  skipButton.Size=UDim2.fromOffset(112,40)
  skipButton.ZIndex=30
  skipButton.BackgroundColor3=Color3.fromRGB(35,39,42)
  -- [시네마틱 음향] 기존 Roblox 내장 착지 음원을 사건 박자에만 짧게 재생한다.
  local introBeatSound=Instance.new("Sound")
  introBeatSound.Name="MeadowPrologueBeat"
  introBeatSound.SoundId="rbxasset://sounds/action_jump_land.mp3"
  introBeatSound.SoundGroup=meadowEffectsGroup
  introBeatSound.Volume=0
  introBeatSound.Looped=false
  introBeatSound.Parent=game:GetService("SoundService")
  local entranceOpen=true
  local openingCamera=workspace.CurrentCamera
  local originalCameraType=openingCamera and openingCamera.CameraType
  local originalSubject=openingCamera and openingCamera.CameraSubject
  local originalFieldOfView=openingCamera and openingCamera.FieldOfView
  local activeTween=nil
  local activeFovTween=nil
  local activeStoryFocusTween=nil
  local activeStoryRevealTween=nil
  local activeStoryColorTween=nil
  local activeVignetteTween=nil
  local activeCurtainTween=nil
  local activeParticleTweens={}
  local activeShadowTween=nil
  local activeMistTween=nil
  local activeLightTween=nil
  local activeFarHazeTween=nil
  local introHiddenParts={}
  local function setIntroPlayerHidden(hidden)
    -- [원화/캐릭터 중복 방지] 인물 PNG 컷에만 3D 아바타를 로컬에서 감추고 원래 값을 복구한다.
    -- 서버 캐릭터와 HP/전투/장비/망토/저장 정보는 절대로 변경하지 않는다.
    for part,transparency in pairs(introHiddenParts) do
      if part.Parent then part.LocalTransparencyModifier=transparency end
    end
    table.clear(introHiddenParts)
    if not hidden then return end
    local character=player.Character
    if not character then return end
    for _,part in ipairs(character:GetDescendants()) do
      if part:IsA("BasePart") then
        introHiddenParts[part]=part.LocalTransparencyModifier
        part.LocalTransparencyModifier=1
      end
    end
  end
  local activeArtImpactTween=nil
  local activeActorGestureTween=nil
  local activeActorEraseTween=nil
  local activeDepthTween=nil
  local activeFogDepthTween=nil
  local cameraMotionValue=nil
  local cameraMotionConnection=nil
  local cameraMotionIntensity=0
  local cameraMotionStart=0
  local runToken=0
  local currentStoryScene=0
  local introAmbienceBefore=nil
  local introEffectsBefore=nil
  local activeAmbienceTween=nil
  local activeEffectsTween=nil
  local function arrivalControls(enabled)
    local scripts=player:FindFirstChild("PlayerScripts")
    local module=scripts and scripts:FindFirstChild("PlayerModule")
    if module then
      pcall(function()
        local controls=require(module):GetControls()
        if enabled then controls:Enable() else controls:Disable() end
      end)
    end
  end
  local function restoreCamera()
    if activeTween then activeTween:Cancel();activeTween=nil end
    if activeFovTween then activeFovTween:Cancel();activeFovTween=nil end
    if activeStoryFocusTween then activeStoryFocusTween:Cancel();activeStoryFocusTween=nil end
    storyPaintStage.Visible=false
    actorMotionFrame.Visible=false
    storyArtwork.Visible=false
    storyForeground.Visible=false
    if activeStoryRevealTween then activeStoryRevealTween:Cancel();activeStoryRevealTween=nil end
    if activeStoryColorTween then activeStoryColorTween:Cancel();activeStoryColorTween=nil end
    if activeVignetteTween then activeVignetteTween:Cancel();activeVignetteTween=nil end
    if activeCurtainTween then activeCurtainTween:Cancel();activeCurtainTween=nil end
    if activeShadowTween then activeShadowTween:Cancel();activeShadowTween=nil end
    if activeMistTween then activeMistTween:Cancel();activeMistTween=nil end
    if activeLightTween then activeLightTween:Cancel();activeLightTween=nil end
    if activeFarHazeTween then activeFarHazeTween:Cancel();activeFarHazeTween=nil end
    setIntroPlayerHidden(false)
    storyFarHaze.Visible=false
    if activeArtImpactTween then activeArtImpactTween:Cancel();activeArtImpactTween=nil end
    if activeActorGestureTween then activeActorGestureTween:Cancel();activeActorGestureTween=nil end
    if activeActorEraseTween then activeActorEraseTween:Cancel();activeActorEraseTween=nil end
    if activeDepthTween then activeDepthTween:Cancel();activeDepthTween=nil end
    if activeFogDepthTween then activeFogDepthTween:Cancel();activeFogDepthTween=nil end
    introBeatSound:Stop()
    introBeatSound:Destroy()
    cinematicShadow.Visible=false
    cinematicMist.Visible=false
    cinematicLight.Visible=false
    storyCurtain.BackgroundTransparency=1
    introDialogue.MaxVisibleGraphemes=-1
    regionIntro.MaxVisibleGraphemes=-1
    if activeAmbienceTween then activeAmbienceTween:Cancel();activeAmbienceTween=nil end
    if activeEffectsTween then activeEffectsTween:Cancel();activeEffectsTween=nil end
    if introAmbienceBefore~=nil then meadowAmbienceGroup.Volume=introAmbienceBefore;introAmbienceBefore=nil end
    if introEffectsBefore~=nil then meadowEffectsGroup.Volume=introEffectsBefore;introEffectsBefore=nil end
    for _,particleTween in ipairs(activeParticleTweens) do particleTween:Cancel() end
    table.clear(activeParticleTweens)
    if cameraMotionConnection then cameraMotionConnection:Disconnect();cameraMotionConnection=nil end
    if cameraMotionValue then cameraMotionValue:Destroy();cameraMotionValue=nil end
    if openingCamera and openingCamera.Parent then
      openingCamera.CameraType=Enum.CameraType.Custom
      if originalFieldOfView then openingCamera.FieldOfView=originalFieldOfView end
      local character=player.Character
      local humanoid=character and character:FindFirstChildOfClass("Humanoid")
      if humanoid then openingCamera.CameraSubject=humanoid
      elseif originalSubject and originalSubject.Parent then openingCamera.CameraSubject=originalSubject end
    end
  end
  -- [첫 마을 실플레이 등장] 기존 캐릭터와 완성형 초원 마을을 실제 카메라로 보여 준다.
  -- 첫 오프닝 재생/새 게임에만 사용하며 이어하기·복구 위치·저장 규칙은 건드리지 않는다.
  local function closeArrival(showVillageReveal)
    if not entranceOpen then return end
    entranceOpen=false
    runToken+=1
    remote:FireServer("meadow:enter-world")
    restoreCamera()
    local function finishArrival()
      gui.Enabled=true
      meadowVitalsGui.Enabled=true
      arrivalControls(true)
      -- [입장/복구] 첫 플레이와 이어하기 모두 선택한 카메라 시점을 사용한다.
      player:SetAttribute("MeadowEnteredWorld",true)
      if arrivalGui.Parent then arrivalGui:Destroy() end
    end
    if not showVillageReveal then finishArrival();return end
    local character=player.Character
    local rootPart=character and character:FindFirstChild("HumanoidRootPart")
    local humanoid=character and character:FindFirstChildOfClass("Humanoid")
    local camera=workspace.CurrentCamera
    if not character or not rootPart or not humanoid or not camera or humanoid.Health<=0 then
      finishArrival()
      return
    end
    -- 기존 UI 뒷배경을 걷어 실제 마을과 실제 R15 아바타가 보이게 한다.
    backdrop.Visible=false
    local reveal=Instance.new("Frame")
    reveal.Name="FirstVillageArrival"
    reveal.Size=UDim2.fromScale(1,1)
    reveal.BackgroundColor3=Color3.fromRGB(5,9,10)
    reveal.BackgroundTransparency=0
    reveal.BorderSizePixel=0
    reveal.Parent=arrivalGui
    -- [첫 마을] 실제 카메라·월드가 준비될 때까지 암전으로 가리고 나서 화면을 연다.
    local topBar=Instance.new("Frame")
    topBar.Name="CinematicTop"
    topBar.Size=UDim2.fromScale(1,.09)
    topBar.BackgroundColor3=Color3.fromRGB(8,17,15)
    topBar.BackgroundTransparency=.04
    topBar.BorderSizePixel=0
    topBar.Parent=reveal
    local bottomBar=Instance.new("Frame")
    bottomBar.Name="CinematicBottom"
    bottomBar.AnchorPoint=Vector2.new(0,1)
    bottomBar.Position=UDim2.fromScale(0,1)
    bottomBar.Size=UDim2.fromScale(1,.23)
    bottomBar.BackgroundColor3=Color3.fromRGB(8,17,15)
    bottomBar.BackgroundTransparency=.12
    bottomBar.BorderSizePixel=0
    bottomBar.Parent=reveal
    local chapter=Instance.new("TextLabel")
    chapter.Name="FirstVillageTitle"
    chapter.Position=UDim2.new(0,16,.77,0)
    chapter.Size=UDim2.new(1,-32,0,35)
    chapter.BackgroundTransparency=1
    chapter.Font=Enum.Font.GothamBold
    chapter.TextSize=26
    chapter.TextColor3=Color3.fromRGB(247,215,156)
    chapter.TextStrokeTransparency=.35
    chapter.TextXAlignment=Enum.TextXAlignment.Left
    chapter.Text="제1장  ·  초원 마을"
    chapter.Parent=reveal
    local line=Instance.new("TextLabel")
    line.Name="VillageArrivalNarration"
    line.Position=UDim2.new(0,16,.77,40)
    line.Size=UDim2.new(1,-32,0,54)
    line.BackgroundTransparency=1
    line.Font=Enum.Font.GothamMedium
    line.TextSize=15
    line.TextWrapped=true
    line.TextColor3=Color3.fromRGB(229,230,212)
    line.TextXAlignment=Enum.TextXAlignment.Left
    line.TextYAlignment=Enum.TextYAlignment.Top
    line.Text="기억을 잃은 카인 앞에, 숲속 작은 마을의 등불이 나타났다."
    line.Parent=reveal
    local skipReveal=Instance.new("TextButton")
    skipReveal.Name="SkipVillageArrival"
    skipReveal.AnchorPoint=Vector2.new(1,0)
    skipReveal.Position=UDim2.new(1,-12,0,12)
    skipReveal.Size=UDim2.fromOffset(108,40)
    skipReveal.BackgroundColor3=Color3.fromRGB(28,43,35)
    skipReveal.BackgroundTransparency=.15
    skipReveal.BorderSizePixel=0
    skipReveal.Text="건너뛰기"
    skipReveal.TextColor3=Color3.fromRGB(252,238,205)
    skipReveal.Font=Enum.Font.GothamBold
    skipReveal.TextSize=15
    skipReveal.Parent=reveal
    local skipCorner=Instance.new("UICorner")
    skipCorner.CornerRadius=UDim.new(0,8)
    skipCorner.Parent=skipReveal
    local revealActive=true
    local revealTween
    local function finishReveal()
      if not revealActive then return end
      revealActive=false
      if revealTween then revealTween:Cancel();revealTween=nil end
      if camera and camera.Parent then
        camera.CameraType=Enum.CameraType.Custom
        camera.CameraSubject=humanoid
        if originalFieldOfView then camera.FieldOfView=originalFieldOfView end
      end
      finishArrival()
    end
    skipReveal.Activated:Connect(finishReveal)
    task.spawn(function()
      -- [스트리밍 안전] 마을이 늦게 도착하더라도 시간 제한 후 캐릭터로 진입한다.
      local world=workspace:FindFirstChild("FantasySurvivalWorld")
      local deadline=os.clock()+2.5
      while revealActive and world and world:GetAttribute("MeadowVillageWellReady")~=true
        and os.clock()<deadline do task.wait(.1) end
      if not revealActive then return end
      if player.Character~=character or humanoid.Health<=0 or not rootPart.Parent then
        finishReveal()
        return
      end
      camera.CameraType=Enum.CameraType.Scriptable
      camera.FieldOfView=70
      camera.CFrame=CFrame.lookAt(Vector3.new(-28,26,-48),Vector3.new(0,5,-113))
      -- [첫 마을 오픈] 스트리밍 뒤 실제 월드를 바라보는 카메라가 잡힌 다음 암전을 걷는다.
      TweenService:Create(reveal,TweenInfo.new(1.25,Enum.EasingStyle.Sine),{
        BackgroundTransparency=1,
      }):Play()
      local origin=rootPart.Position
      local destination=CFrame.lookAt(origin+Vector3.new(10,9,17),origin+Vector3.new(0,3,-5))
      -- 카메라가 실물 마을을 내려다본 뒤 실제 플레이어 망토·얼굴 쪽으로 이동한다.
      local revealSeconds=reducedEffects and 2.4 or 3.4
      revealTween=TweenService:Create(camera,TweenInfo.new(revealSeconds,
        Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
          CFrame=destination,FieldOfView=59,
        })
      revealTween:Play()
      -- [흙먼지 등장] 기존 캐릭터에 있던 발걸음 파티클만 재사용한다.
      local dustOrigin=rootPart:FindFirstChild("MeadowFootstepDustOrigin")
      local dust=dustOrigin and dustOrigin:FindFirstChild("MeadowNativeFootstepDust")
      if dust then dust:Emit(reducedEffects and 4 or 11) end
      task.wait(revealSeconds)
      if not revealActive then return end
      line.Text="첫 단서는 마을의 촌장 나린에게 있다. 여기서 다시 여정이 시작된다."
      chapter.Text="초원 마을  ·  새로운 여정"
      task.wait(reducedEffects and .6 or 1.5)
      finishReveal()
    end)
  end
  local function showArrivalCamera()
    openingCamera=workspace.CurrentCamera
    if not openingCamera then return end
    originalCameraType=openingCamera.CameraType
    originalSubject=openingCamera.CameraSubject
    originalFieldOfView=openingCamera.FieldOfView
    openingCamera.CameraType=Enum.CameraType.Scriptable
    openingCamera.CFrame=CFrame.lookAt(Vector3.new(31,26,44),Vector3.new(0,5,-70))
  end
  gui.Enabled=false
  meadowVitalsGui.Enabled=false
  arrivalControls(false)
  showArrivalCamera()
  player.CharacterAdded:Connect(function()
    if entranceOpen then task.defer(function()
      if entranceOpen and titlePanel.Visible then showArrivalCamera() end
    end) end
  end)
  local function updateTitleStatus()
    local ready=player:GetAttribute("ProfileReady")==true
    local saved=player:GetAttribute("MeadowProfileHadSave")==true
    local sessionOnly=player:GetAttribute("SaveStatus")=="SESSION_ONLY"
    local loadFailed=player:GetAttribute("MeadowProfileLoadState")=="FAILED"
    continueButton.Text=loadFailed and "서버 연결 다시 시도" or saved and "이어하기" or "모험 시작"
    titleStatus.Text=not ready and (loadFailed and "서버 데이터 준비 오류 · 재시도 가능"
      or "서버 연결 중 · 버튼을 누르면 준비 후 시작")
      or sessionOnly and "임시 플레이 · 저장소 연결 실패"
      or saved and "저장된 진행도 확인됨" or "새로운 모험 준비 완료"
    -- 프로필 지연 중에도 시작 입력은 받고 실제 입장만 서버 승인 후 수행한다.
    continueButton.Active=true
    newButton.Active=not sessionOnly
    continueButton.BackgroundTransparency=ready and 0 or .25
    newButton.BackgroundTransparency=(ready and not sessionOnly) and 0 or .25
  end
  player:GetAttributeChangedSignal("ProfileReady"):Connect(updateTitleStatus)
  player:GetAttributeChangedSignal("SaveStatus"):Connect(updateTitleStatus)
  player:GetAttributeChangedSignal("MeadowProfileHadSave"):Connect(updateTitleStatus)
  player:GetAttributeChangedSignal("MeadowProfileLoadState"):Connect(updateTitleStatus)
  updateTitleStatus()

  -- [로딩 상태] 가짜 지역 등록과 발견 배지를 생성하지 않는다.
  local function setProgress(done,total,message)
    local ratio=total>0 and math.clamp(done/total,0,1) or 0
    progressFill.Size=UDim2.fromScale(ratio,1)
    loadingStatus.Text=message.." · "..math.floor(ratio*100+.5).."%"
  end

  -- [메인] 2.5D 원화+실물 월드 교차 컷. 완성 그림과 인물 분리본 동시 노출 금지.
  -- 실제 주민의 기존 순찰·플레이어의 현재 좌표를 활용하며 퀘스트·전투·저장·이동 상태는 변경하지 않는다.
  -- 기존 12장면과 자막은 보존한다. 과거 등장인물의 미승인 대체 모델은 생성하지 않는다.
  local function startIntro(isFresh)
    loadPanel.Visible=false
    introPanel.Visible=isFresh
    if not isFresh then closeArrival();return end
    local token=runToken
    introAmbienceBefore=meadowAmbienceGroup.Volume
    introEffectsBefore=meadowEffectsGroup.Volume
    -- [24컷 2.5D 오프닝] 오너 제작 원화 24컷(배경·인물·전경 3층)을 60초 동안 시차로 움직인다.
    -- 로블록스 이미지 ID 72개가 모두 등록된 경우에만 사용하고, 아니면 아래 기존 12장면 오프닝을 그대로 쓴다.
    do
      local openingOk,openingModule=pcall(function() return require(Shared:WaitForChild("Opening24",3)) end)
      local openingScenes=openingOk and type(openingModule)=="table" and openingModule.Resolve() or nil
      if openingScenes then
        local RunService=game:GetService("RunService")
        local ContentProvider=game:GetService("ContentProvider")
        local stage=Instance.new("Frame")
        stage.Name="Opening24Stage"
        stage.Size=UDim2.fromScale(1,1)
        stage.BackgroundColor3=Color3.new(0,0,0)
        stage.BorderSizePixel=0
        stage.ClipsDescendants=true
        stage.ZIndex=20
        stage.Parent=introPanel
        local function imageLayer(name,z)
          local image=Instance.new("ImageLabel")
          image.Name=name
          image.AnchorPoint=Vector2.new(.5,.5)
          image.Position=UDim2.fromScale(.5,.5)
          image.Size=UDim2.fromScale(1,1)
          image.BackgroundTransparency=1
          image.BorderSizePixel=0
          -- [잘림 방지] 그림 전체가 보이도록 Fit. 비율이 다르면 검은 여백이 생기고 그림은 잘리지 않는다.
          image.ScaleType=Enum.ScaleType.Fit
          image.ZIndex=z
          image.Parent=stage
          return image
        end
        local bgLayer,chLayer,fgLayer=imageLayer("Background",21),imageLayer("Character",22),imageLayer("Foreground",23)
        -- [컷 전환] 직전 컷을 위에 겹쳐 두고 서서히 지워 크로스 디졸브로 넘어간다.
        local ghostBg,ghostCh,ghostFg=imageLayer("GhostBackground",26),imageLayer("GhostCharacter",26),imageLayer("GhostForeground",26)
        ghostBg.ImageTransparency=1;ghostCh.ImageTransparency=1;ghostFg.ImageTransparency=1
        local function solidFrame(name,z,color)
          local f=Instance.new("Frame")
          f.Name=name
          f.BorderSizePixel=0
          f.BackgroundColor3=color
          f.ZIndex=z
          f.Parent=stage
          return f
        end
        -- [자막 가독성] 화면 아래에 어두운 그라데이션을 깔아 어떤 그림 위에서도 글씨가 읽히게 한다.
        local subtitleShade=solidFrame("SubtitleShade",27,Color3.new(0,0,0))
        subtitleShade.AnchorPoint=Vector2.new(0,1)
        subtitleShade.Position=UDim2.fromScale(0,1)
        subtitleShade.Size=UDim2.fromScale(1,.3)
        subtitleShade.BackgroundTransparency=0
        local shadeGradient=Instance.new("UIGradient")
        shadeGradient.Rotation=90
        shadeGradient.Transparency=NumberSequence.new({
          NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.55,.55),NumberSequenceKeypoint.new(1,.12),
        })
        shadeGradient.Parent=subtitleShade
        local topBar=solidFrame("LetterboxTop",27,Color3.new(0,0,0))
        topBar.Size=UDim2.fromScale(1,0)
        local bottomBar=solidFrame("LetterboxBottom",27,Color3.new(0,0,0))
        bottomBar.AnchorPoint=Vector2.new(0,1)
        bottomBar.Position=UDim2.fromScale(0,1)
        bottomBar.Size=UDim2.fromScale(1,0)
        local curtain=solidFrame("Curtain",28,Color3.new(0,0,0))
        curtain.Size=UDim2.fromScale(1,1)
        curtain.BackgroundTransparency=0
        local flash=solidFrame("Flash",29,Color3.fromRGB(255,225,225))
        flash.Size=UDim2.fromScale(1,1)
        flash.BackgroundTransparency=1
        local fog=solidFrame("Mist",25,Color3.fromRGB(215,232,226))
        fog.Size=UDim2.fromScale(1,1)
        fog.BackgroundTransparency=.86
        fog.Visible=false
        local fogGradient=Instance.new("UIGradient")
        fogGradient.Transparency=NumberSequence.new({
          NumberSequenceKeypoint.new(0,.9),NumberSequenceKeypoint.new(.35,.25),
          NumberSequenceKeypoint.new(.65,.7),NumberSequenceKeypoint.new(1,.9),
        })
        fogGradient.Parent=fog
        local function textLayer(name,z,size)
          local label=Instance.new("TextLabel")
          label.Name=name
          label.BackgroundTransparency=1
          label.Font=Enum.Font.GothamBold
          label.TextScaled=true
          label.Text=""
          label.TextTransparency=1
          label.TextStrokeColor3=Color3.new(0,0,0)
          label.TextStrokeTransparency=1
          label.ZIndex=z
          label.Parent=stage
          local limit=Instance.new("UITextSizeConstraint")
          limit.MaxTextSize=size
          limit.MinTextSize=14
          limit.Parent=label
          return label
        end
        local subtitle=textLayer("Subtitle",30,46)
        subtitle.AnchorPoint=Vector2.new(.5,1)
        subtitle.Position=UDim2.fromScale(.5,.93)
        subtitle.Size=UDim2.fromScale(.9,.085)
        subtitle.TextScaled=false
        subtitle.TextColor3=Color3.new(1,1,1)
        local speakerLabel=textLayer("Speaker",30,30)
        speakerLabel.AnchorPoint=Vector2.new(.5,1)
        speakerLabel.Position=UDim2.fromScale(.5,.855)
        speakerLabel.Size=UDim2.fromScale(.4,.045)
        speakerLabel.TextScaled=false
        speakerLabel.TextColor3=Color3.fromRGB(232,196,120)
        local title=textLayer("OpeningTitle",26,110)
        title.AnchorPoint=Vector2.new(.5,.5)
        title.Position=UDim2.fromScale(.72,.55)
        title.Size=UDim2.fromScale(.4,.22)
        title.Text="마력숲"
        title.TextColor3=Color3.fromRGB(240,220,160)
        local chapterLabel=textLayer("OpeningChapter",30,30)
        chapterLabel.AnchorPoint=Vector2.new(0,0)
        chapterLabel.Position=UDim2.fromScale(.045,.06)
        chapterLabel.Size=UDim2.fromScale(.5,.06)
        chapterLabel.TextScaled=false
        chapterLabel.TextXAlignment=Enum.TextXAlignment.Left
        chapterLabel.TextColor3=Color3.fromRGB(232,196,120)
        chapterLabel.Text="프롤로그  ·  마지막 전장"
        local sparks={}
        local sparkRandom=Random.new(2411)
        for i=1,(reducedEffects and 18 or 36) do
          local dot=Instance.new("Frame")
          dot.Name="Spark"
          dot.BorderSizePixel=0
          dot.BackgroundTransparency=1
          dot.ZIndex=24
          dot.Visible=false
          dot.Parent=stage
          local round=Instance.new("UICorner")
          round.CornerRadius=UDim.new(1,0)
          round.Parent=dot
          sparks[i]={
            frame=dot,x=sparkRandom:NextNumber(),y=sparkRandom:NextNumber(),
            vx=sparkRandom:NextNumber(-25,25)/1280,vy=-sparkRandom:NextNumber(40,130)/720,
            size=sparkRandom:NextNumber(2,5),phase=sparkRandom:NextNumber(0,6.28),
            pick=i%3,streak=sparkRandom:NextNumber(14,46),
          }
        end
        -- 기존 12장면용 겹침 장치는 숨겨 두 오프닝이 한 화면에 섞이지 않게 한다.
        storyVision.Visible=false
        storyPaintStage.Visible=false
        actorMotionFrame.Visible=false
        storyFarHaze.Visible=false
        cinematicShadow.Visible=false
        cinematicMist.Visible=false
        cinematicLight.Visible=false
        for _,spark in ipairs(cinematicParticles) do spark.Visible=false end
        storyCurtain.BackgroundTransparency=1
        introPanel.BackgroundTransparency=0
        local finished=false
        local connection=nil
        local openingScore=nil
        local openingScoreEq=nil
        local function finishOpening24()
          if finished then return end
          finished=true
          if connection then connection:Disconnect();connection=nil end
          if openingScore then
            openingScoreEq=nil
            -- 건너뛰기·종료 때 음악은 갑자기 끊지 않고 0.6초 동안 줄이며 끈다.
            local score=openingScore;openingScore=nil
            pcall(function()
              TweenService:Create(score,TweenInfo.new(.6),{Volume=0}):Play()
              task.delay(.7,function() score:Destroy() end)
            end)
          end
          if stage.Parent then stage:Destroy() end
          if token==runToken then closeArrival(true) end
        end
        skipButton.Activated:Once(finishOpening24)
        local function smooth(p)
          p=math.clamp(p,0,1)
          return p*p*(3-2*p)
        end
        -- [카메라] 장면별 감속과 정지를 사용하고 충격은 중요한 순간에만 부여한다.
        -- [카메라 연출] 24컷 각각의 감정에 맞는 구도·정적·시선 이동. 공통 등속 흔들기 금지.
        local function cameraFor(scene,lt)
          local u=math.clamp(lt/scene.seconds,0,1)
          local p=smooth(u)
          local id=scene.id
          local scale,rotation,tx,ty=1.025,0,0,0
          if id==1 then scale=1.012+.037*p;tx=-8+16*p;ty=4-8*p
          elseif id==2 then scale=1.038;tx=16-31*smooth(math.clamp(u/.78,0,1));rotation=-.25+.5*p
          elseif id==3 then scale=1.015+.045*p;ty=7-12*p
          elseif id==4 then scale=1.050+.008*p;tx=-3+6*p
          elseif id==5 then scale=1.021+.043*p;tx=7-11*p;ty=3-6*p
          elseif id==6 then scale=1.030+.010*p;tx=-5+7*p
          elseif id==7 then scale=1.024+.040*p;tx=5-9*p
          elseif id==8 then scale=1.047;tx=-17+33*smooth(math.clamp(u/.75,0,1))
          elseif id==9 then scale=1.021+.047*p;rotation=-.40+.8*p;ty=6-9*p
          elseif id==10 then scale=1.029+.026*p;tx=6-11*p
          elseif id==11 then
            -- 배신: 짧게 화면을 고정한 후 급격히 인물에게 접근한다.
            local reveal=smooth(math.clamp((u-.21)/.55,0,1))
            scale=1.022+.059*reveal
            tx=-4+8*reveal
          elseif id==12 then scale=1.044+.011*p;ty=4-6*p
          elseif id==13 then scale=1.049+.015*p;tx=3-6*p
          elseif id==14 then scale=1.035+.029*p;ty=-4+7*p
          elseif id==15 then
            -- 렌스의 목소리만 남는 빈 전장, 금지된 인물 원화는 사용하지 않는다.
            scale=1.015+.012*p
          elseif id==16 then scale=1.025+.053*p;ty=8-12*p
          elseif id==17 then scale=1.060-.026*p;tx=-8+12*p
          elseif id==18 then scale=1.011+.024*p;ty=6-11*p
          elseif id==19 then scale=1.023+.061*smooth(math.clamp(u/.68,0,1));rotation=-.65+1.3*p;ty=-5+11*p
          elseif id==20 then scale=1.095-.070*p;ty=-13+22*p
          elseif id==21 then scale=1.046-.020*p;ty=11-14*p
          elseif id==22 then scale=1.030+.015*p;tx=-7+11*p
          elseif id==23 then scale=1.022+.021*p;ty=5-8*p
          elseif id==24 then scale=1.054-.034*p;tx=4-7*p
          end
          -- [충돌] 한 번의 감쇠 진동. 컷 전체 흔들기와 임의 회전은 제거한다.
          local impactAt=(id==4 and .09) or (id==7 and .18) or (id==13 and .16) or (id==19 and .08)
          if impactAt then
            local d=lt-impactAt
            local duration=(id==19 and .34 or .27)
            if d>0 and d<duration then
              local amount=(id==19 and 4.4 or 2.8)*math.sin(math.pi*d/duration)*(1-smooth(d/duration))
              tx+=amount*math.sin(d*55)
              ty+=amount*.65*math.sin(d*46+.5)
            end
          end
          return p,scale,rotation,tx,ty
        end
        local function updateSparks(fx,t,k,localTime,duration)
          local show=fx=="embers" or fx=="magic" or fx=="rift"
          -- [입자] 컷 시작과 끝에서 자연스럽게 나타나고 사라진다.
          local softness=smooth(math.clamp(localTime/.35,0,1))*smooth(math.clamp((duration-localTime)/.35,0,1))
          for _,spark in ipairs(sparks) do
            spark.frame.Visible=show
            if show then
              local vx,vy=spark.vx,spark.vy
              if fx=="magic" then vy=spark.vy*.35+.02
              elseif fx=="rift" then vx=0;vy=spark.vy*4.2 end
              local sway=fx=="rift" and 0 or .011*math.sin(t*1.5+spark.phase)
              spark.frame.Position=UDim2.fromScale((spark.x+vx*t+sway)%1,(spark.y+vy*t)%1)
              local twinkle=.6+.4*math.sin(t*6+spark.phase)
              if fx=="rift" then
                spark.frame.Size=UDim2.fromOffset(math.max(1,2*k),spark.streak*k)
                spark.frame.BackgroundColor3=spark.pick==0 and Color3.new(1,1,1) or Color3.fromRGB(170,190,255)
                spark.frame.BackgroundTransparency=1-.7*softness
              else
                local dotSize=math.max(2,spark.size*k*1.6)
                spark.frame.Size=UDim2.fromOffset(dotSize,dotSize)
                if fx=="embers" then spark.frame.BackgroundColor3=Color3.fromRGB(255,190,100)
                elseif spark.pick==0 then spark.frame.BackgroundColor3=Color3.fromRGB(200,130,255)
                elseif spark.pick==1 then spark.frame.BackgroundColor3=Color3.fromRGB(255,110,150)
                else spark.frame.BackgroundColor3=Color3.fromRGB(150,170,255) end
                spark.frame.BackgroundTransparency=1-.9*twinkle*softness
              end
            end
          end
        end
        task.spawn(function()
          local imageIds={}
          for _,scene in ipairs(openingScenes) do
            imageIds[#imageIds+1]=scene.bg
            if scene.ch~="" then imageIds[#imageIds+1]=scene.ch end
            imageIds[#imageIds+1]=scene.fg
          end
          local preloaded=false
          -- 오프닝 음악(60초, 컷 시작 시각에 맞춰 합성한 곡). ID가 없으면 소리 없이 진행한다.
          local scoreOk,scoreIds=pcall(function() return require(Shared:WaitForChild("OpeningAudioId",3)) end)
          local scoreId=scoreOk and type(scoreIds)=="table" and scoreIds.score or nil
          if type(scoreId)=="string" and scoreId:match("^rbxassetid://%d+$") and not finished then
            local score=Instance.new("Sound")
            score.Name="MeadowOpeningScore"
            score.SoundId=scoreId
            score.Volume=.24
            score.Looped=false
            -- [초반 음악] 기존 등록곡을 낮은 현·저음 중심으로 재편곡한 전주처럼 들리게 시작한다.
            -- 전쟁이 시작되는 4~10초에 고·중음과 박력을 점진적으로 회복한다.
            local eq=Instance.new("EqualizerSoundEffect")
            eq.Name="PrologueWarPrelude"
            eq.LowGain=4
            eq.MidGain=-22
            eq.HighGain=-40
            eq.Parent=score
            openingScoreEq=eq
            if meadowEffectsGroup then score.SoundGroup=meadowEffectsGroup end
            score.Parent=game:GetService("SoundService")
            openingScore=score
            imageIds[#imageIds+1]=score
          end
          task.spawn(function()
            pcall(function() ContentProvider:PreloadAsync(imageIds) end)
            preloaded=true
          end)
          local waited=0
          while not preloaded and waited<7 and not finished do waited+=task.wait(.1) end
          -- [미리 불러오기] 다음 컷 몇 장을 투명한 작은 이미지로 먼저 그려 두어 컷 전환 때 검은 화면이 없게 한다.
          local prefetch={}
          for slot=1,12 do
            local label=Instance.new("ImageLabel")
            label.Name="Prefetch"..slot
            label.BackgroundTransparency=1
            label.ImageTransparency=.98
            label.Size=UDim2.fromOffset(2,2)
            label.Position=UDim2.fromOffset(slot*3,0)
            label.ZIndex=2
            label.Parent=stage
            prefetch[slot]=label
          end
          local function warm(fromIndex)
            for k=0,3 do
              local scene=openingScenes[fromIndex+k]
              local a=k*3
              if scene then
                prefetch[a+1].Image=scene.bg
                prefetch[a+2].Image=scene.ch or ""
                prefetch[a+3].Image=scene.fg
              end
            end
          end
          warm(1)
          do
            local warmWait=0
            while not finished and warmWait<8 do
              local ready=true
              for slot=1,6 do if not prefetch[slot].IsLoaded then ready=false end end
              if ready then break end
              warmWait+=task.wait(.1)
            end
          end
          if finished or not entranceOpen or token~=runToken then return end
          local total=0
          local starts={}
          for i,scene in ipairs(openingScenes) do starts[i]=total;total+=scene.seconds end
          storyProgress.Size=UDim2.fromScale(0,1)
          TweenService:Create(storyProgress,TweenInfo.new(total,Enum.EasingStyle.Linear),{
            Size=UDim2.fromScale(1,1),
          }):Play()
          local startClock=os.clock()
          if openingScore then openingScore.TimePosition=0;openingScore:Play() end
          local current=0
          connection=RunService.RenderStepped:Connect(function()
            if finished then return end
            if not entranceOpen or token~=runToken then finishOpening24();return end
            local t=os.clock()-startClock
            if t>=total then finishOpening24();return end
            -- [음악 동기화] 조용한 저음 전주 → 돌격 상승 → 배신·희생의 정적 → 균열 재상승.
            if openingScore then
              local rise=smooth(math.clamp((t-3.2)/7,0,1))
              if openingScoreEq then
                openingScoreEq.LowGain=4*(1-rise)
                openingScoreEq.MidGain=-22*(1-rise)
                openingScoreEq.HighGain=-40*(1-rise)
              end
              local quiet=1
              if t>=24.4 and t<25.35 then
                quiet=.44+.56*smooth(math.clamp((t-24.4)/.95,0,1))
              elseif t>=33.6 and t<35.1 then
                quiet=.32+.68*smooth(math.clamp((t-33.6)/1.5,0,1))
              end
              openingScore.Volume=(.24+.56*rise)*quiet
            end
            local index=math.max(current,1)
            while index<#openingScenes and t>=starts[index]+openingScenes[index].seconds do index+=1 end
            local scene=openingScenes[index]
            if index~=current then
              if current>0 then
                local previousScene=openingScenes[current]
                ghostBg.Image=previousScene.bg;ghostCh.Image=previousScene.ch or "";ghostFg.Image=previousScene.fg
                ghostBg.Size=bgLayer.Size;ghostBg.Position=bgLayer.Position;ghostBg.Rotation=bgLayer.Rotation
                ghostCh.Size=chLayer.Size;ghostCh.Position=chLayer.Position;ghostCh.Rotation=chLayer.Rotation
                ghostFg.Size=fgLayer.Size;ghostFg.Position=fgLayer.Position;ghostFg.Rotation=fgLayer.Rotation
              end
              current=index
              currentStoryScene=index
              warm(index+1)
              bgLayer.Image=scene.bg
              chLayer.Image=scene.ch or ""
              fgLayer.Image=scene.fg
              subtitle.Text=scene.line
            end
            local lt=t-starts[index]
            local camera=workspace.CurrentCamera
            local k=camera and camera.ViewportSize.X/1280 or 1
            local p,scale,rot,tx,ty=cameraFor(scene,lt)
            -- [원화 합성] 중간 9~18컷은 배경·인물·전경을 하나의 화판처럼 묶어 정렬을 고정한다.
            -- 먼 전장·안개 숲만 제한된 시차를 허용한다. 따로 튀는 크기·회전·호흡은 금지.
            local locked=scene.id>=9 and scene.id<=18
            local depth=locked and 0 or (scene.fx=="mist" and .20 or .36)
            local travel=(p-.5)*2
            local offsetX=tx*k
            local offsetY=ty*k
            local plateScale=scale+.018
            local farShift=scene.chShift[1]*.28*travel*depth*k
            local nearShift=scene.fgShift[1]*.22*travel*depth*k
            bgLayer.Size=UDim2.fromScale(plateScale,plateScale)
            chLayer.Size=UDim2.fromScale(plateScale,plateScale)
            fgLayer.Size=UDim2.fromScale(plateScale,plateScale)
            bgLayer.Position=UDim2.new(.5,offsetX,.5,offsetY)
            chLayer.Position=UDim2.new(.5,offsetX+farShift,.5,offsetY)
            fgLayer.Position=UDim2.new(.5,offsetX+nearShift,.5,offsetY)
            bgLayer.Rotation=rot
            chLayer.Rotation=rot
            fgLayer.Rotation=rot
            -- 직전 컷 크로스 디졸브(0.5초). 충격 컷(하드 컷)은 디졸브 없이 번쩍임으로 넘어간다.
            local hardCut=scene.id==4 or scene.id==7 or scene.id==11 or scene.id==13 or scene.id==15 or scene.id==19 or scene.id==21
            local dissolveTime=scene.fx=="mist" and .75 or (scene.fx=="embers" and .32 or .48)
            local fade=(hardCut or index==1) and 1 or smooth(math.clamp(lt/dissolveTime,0,1))
            ghostBg.ImageTransparency=fade;ghostCh.ImageTransparency=fade;ghostFg.ImageTransparency=fade
            -- [화면비] 영화 띠는 모바일 자막 영역 바깥에 유지한다.
            local barOpen=smooth(math.clamp(t/.65,0,1))*smooth(math.clamp((total-t)/.7,0,1))
            local barHeight=(scene.fx=="mist" and .018 or .032)*barOpen
            topBar.Size=UDim2.fromScale(1,barHeight)
            bottomBar.Size=UDim2.fromScale(1,barHeight)
            local opacity=0
            if t<.6 then opacity=1-smooth(t/.6) end
            if t>total-.8 then opacity=math.max(opacity,1-smooth((total-t)/.8)) end
            if scene.camera=="fade" then
              opacity=math.max(opacity,.12*math.sin(math.pi*math.clamp((p-.52)/.48,0,1)))
            elseif scene.id==15 then
              -- [무언의 전장] 인물을 지운 장면에 짧은 검은 정적을 둔다.
              opacity=math.max(opacity,.43*(1-smooth(math.clamp(lt/.38,0,1))))
            end
            curtain.BackgroundTransparency=1-opacity
            -- [충격] 전장·배신·균열 순간의 짧은 광량 변화.
            local flashPower=({[4]=.35,[7]=.2,[9]=.25,[11]=.5,[13]=.26,[19]=.64,[21]=.18})[scene.id]
            local flashDuration=scene.id==19 and .24 or .18
            local flashPulse=(flashPower and lt<flashDuration) and flashPower*(1-smooth(lt/flashDuration)) or 0
            flash.BackgroundTransparency=1-flashPulse
            local subtitleAlpha=0
            if scene.line~="" and lt>.15 then
              subtitleAlpha=math.clamp(math.min(lt/.2,(scene.seconds-.1-lt)/.2),0,1)
            end
            subtitle.MaxVisibleGraphemes=scene.line~="" and math.floor(math.max(0,lt-.2)*17)+1 or -1
            subtitle.TextSize=math.clamp(math.floor(31*k),18,46)
            speakerLabel.TextSize=math.clamp(math.floor(21*k),13,30)
            speakerLabel.Text=scene.speaker or ""
            speakerLabel.TextTransparency=1-subtitleAlpha
            speakerLabel.TextStrokeTransparency=1-subtitleAlpha
            subtitle.TextColor3=(scene.speaker~=nil and scene.speaker~="") and Color3.new(1,1,1) or Color3.fromRGB(214,205,182)
            subtitle.TextTransparency=1-subtitleAlpha
            subtitle.TextStrokeTransparency=1-subtitleAlpha
            local chapterAlpha=0
            if t>.9 and t<4.4 then chapterAlpha=math.clamp(math.min((t-.9)/.7,(4.4-t)/.7),0,1) end
            chapterLabel.TextSize=math.clamp(math.floor(20*k),13,30)
            chapterLabel.TextTransparency=1-chapterAlpha
            chapterLabel.TextStrokeTransparency=1-chapterAlpha
            subtitleShade.BackgroundTransparency=1-math.clamp(subtitleAlpha,0,1)
            local titleAlpha=(index==#openingScenes and lt>1.8) and smooth((lt-1.8)/1) or 0
            title.TextTransparency=1-titleAlpha
            title.TextStrokeTransparency=1-titleAlpha
            fog.Visible=true
            local grade=({embers={Color3.fromRGB(255,120,40),.86},magic={Color3.fromRGB(160,70,230),.89},rift={Color3.fromRGB(100,150,255),.87},mist={Color3.fromRGB(205,232,214),.9}})[scene.fx]
            fog.BackgroundColor3=grade[1]
            local flicker=scene.fx=="embers" and .05*math.sin(t*9)*math.sin(t*3.1+1) or .025*math.sin(t*2.3)
            fog.BackgroundTransparency=math.clamp(grade[2]+flicker,.7,.98)
            fogGradient.Offset=Vector2.new(math.sin(t*.26)*.13,0)
            updateSparks(scene.fx,t,k,lt,scene.seconds)
          end)
        end)
        return
      end
    end
    -- [카메라 장면] 서버에 이미 있는 마을 경비·촌장·추적자·계약판·본인 R15을 촬영.
    -- 위치 오프셋만 카메라에 적용하고 NPC/플레이어의 실제 CFrame은 절대로 변경하지 않는다.
    local scenes={
      {seconds=5,title="마지막 전선",subtitle="렌스기사단은 성문 앞에 도착했다.",
        cinema="siege",actor="RUIN_1",start=Vector3.new(-48,28,35),finish=Vector3.new(-19,17,27),fov=74},
      {seconds=5,title="네 명의 돌격",subtitle="렌스, 카인, 닉, 미나가 성문을 향해 달려갔다.",
        cinema="charge",actor="PLAYER",start=Vector3.new(16,9,26),finish=Vector3.new(5,7,13),fov=66},
      {seconds=5,title="빅브라더",subtitle="수고했다. 모두 너희를 기억할 것이다.",
        cinema="crown",actor="RUIN_2",start=Vector3.new(8,6,14),finish=Vector3.new(-6,5,9),fov=52},
      {seconds=4,title="퇴각 명령",subtitle="잠깐, 우리 병사들이 왜 물러나는 거야?",
        cinema="freeze",actor="RUIN_1",start=Vector3.new(-5,12,19),finish=Vector3.new(-5,12,19),fov=62},
      {seconds=5,title="미러",subtitle="미러? 무슨 일이야? 전투는 아직 안 끝났어.",
        cinema="omen",actor="RUIN_2",start=Vector3.new(-12,6,18),finish=Vector3.new(6,5,10),fov=56},
      {seconds=6,title="배신과 봉인",subtitle="계획이 바뀌었어. 너희는 여기서 끝이야.",
        cinema="betrayal",actor="RUIN_3",start=Vector3.new(13,7,10),finish=Vector3.new(-7,6,16),fov=50},
      {seconds=5,title="사라지는 동료들",subtitle="카인! 손 잡아!",
        cinema="reach",actor="PLAYER",start=Vector3.new(-9,5,12),finish=Vector3.new(4,4,7),fov=65},
      {seconds=4,title="역사 삭제",subtitle="이 일은 누구에게도 알려져서는 안 된다.",
        cinema="erasure",actor="RUIN_3",start=Vector3.new(0,24,16),finish=Vector3.new(0,24,16),fov=47},
      {seconds=5,title="추락",subtitle="카인은 끝없이 아래로 떨어졌다.",
        cinema="rift",actor="PLAYER",start=Vector3.new(1,52,18),finish=Vector3.new(-5,10,14),fov=78},
      {seconds=6,title="낯선 숲",subtitle="...여긴 어디지?",
        cinema="dawn",actor="PLAYER",start=Vector3.new(35,22,-32),finish=Vector3.new(12,10,18),fov=71},
      {seconds=5,title="기사단의 흔적",subtitle="낡은 깃발에 기사단의 문양이 남아 있었다.",
        cinema="relic",actor="RUIN_2",start=Vector3.new(-11,12,16),finish=Vector3.new(3,6,8),fov=57},
      {seconds=5,title="첫 번째 여정",subtitle="렌스, 닉, 미나는 어디에 있을까.",
        cinema="journey",actor="PLAYER",start=Vector3.new(-25,16,24),finish=Vector3.new(13,9,18),fov=64},
    }
    local total=0
    for _,scene in ipairs(scenes) do total+=scene.seconds end
    -- [2.5D 신규 연출] 원본 투명 인물의 대규모 카메라형 이동과 실제 월드의 깊이를 합성한다.
    -- 같은 장면 JPG는 인물 자산 다운로드가 명확히 실패했을 때만 대체 배경으로 사용한다.
    backdrop.BackgroundTransparency=.08
    introPanel.BackgroundTransparency=.12
    introTint.BackgroundTransparency=.86
    storyVision.Visible=true
    storyArtwork.Visible=false
    storyPaintStage.Visible=false
    actorMotionFrame.Visible=false
    storyForeground.Visible=false
    cinematicShadow.Visible=false
    cinematicMist.Visible=false
    cinematicLight.Visible=false
    storyFarHaze.Visible=false
    for _,spark in ipairs(cinematicParticles) do spark.Visible=false end
    task.defer(function()
      local ids={}
      for _,id in ipairs(Config.CinematicIntroSceneIds or {}) do
        if type(id)=="string" and id:match("^rbxassetid://%d+$") then ids[#ids+1]=id end
      end
      for _,id in pairs(Config.CinematicIntroForegroundIds or {}) do
        if type(id)=="string" and id:match("^rbxassetid://%d+$") then ids[#ids+1]=id end
      end
      if #ids>0 then
        pcall(function() game:GetService("ContentProvider"):PreloadAsync(ids) end)
      end
    end)
    storyCurtain.BackgroundColor3=Color3.fromRGB(5,8,11)
    storyCurtain.BackgroundTransparency=0
    storyProgress.Size=UDim2.fromScale(0,1)
    TweenService:Create(storyProgress,TweenInfo.new(total,Enum.EasingStyle.Linear),{
      Size=UDim2.fromScale(1,1),
    }):Play()

    -- [실제 기억 장소] 화면에 존재하지 않는 빅브라더·미러를 마을 주민으로 위장하지 않는다.
    -- 기존 CC0 석벽 유적 세 곳과 플레이어 R15만 실물 촬영 대상으로 사용한다.
    local ruinHomes={
      RUIN_1=Vector3.new(-122,3,-147),RUIN_2=Vector3.new(137,3,139),
      RUIN_3=Vector3.new(-154,3,122),
    }
    local function sceneFocus(scene)
      local world=workspace:FindFirstChild("FantasySurvivalWorld")
      local model=scene.actor=="PLAYER" and player.Character
        or (world and world:FindFirstChild("Meadow_"..(scene.actor=="RUIN_1" and "Ruin_1"
          or scene.actor=="RUIN_2" and "Ruin_2" or "Ruin_3")))
      local root=model and (model:FindFirstChild("HumanoidRootPart")
        or model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart",true))
      if root then
        return root.Position+Vector3.new(0,scene.actor=="PLAYER" and 1.6 or 3,0),model
      end
      local fallback=ruinHomes[scene.actor]
      if fallback then return fallback+Vector3.new(0,3,0),nil end
      local character=player.Character
      local playerRoot=character and character:FindFirstChild("HumanoidRootPart")
      return playerRoot and playerRoot.Position+Vector3.new(0,1.6,0)
        or Vector3.new(0,7,-115),character
    end

    -- [시네마틱 시각 효과] 기존 월드의 픽셀과 CC0 VFX 모듈만 가공한다.
    -- 새 건물·몬스터·임시 인물·Part 모델은 만들지 않는다. 모바일 성능에 따라 후처리 강도를 낮춘다.
    local Lighting=game:GetService("Lighting")
    local introGrade=Instance.new("ColorCorrectionEffect")
    introGrade.Name="MeadowIntroColorGrade";introGrade.Enabled=true
    introGrade.Parent=Lighting
    local introBloom=Instance.new("BloomEffect")
    introBloom.Name="MeadowIntroBloom";introBloom.Enabled=true
    introBloom.Intensity=.16;introBloom.Size=18;introBloom.Threshold=2
    introBloom.Parent=Lighting
    local introBlur=Instance.new("BlurEffect")
    introBlur.Name="MeadowIntroBlur";introBlur.Size=0;introBlur.Parent=Lighting
    local introDepth=Instance.new("DepthOfFieldEffect")
    introDepth.Name="MeadowIntroFocus";introDepth.Enabled=not reducedEffects
    introDepth.FarIntensity=.12;introDepth.NearIntensity=.06
    introDepth.InFocusRadius=16;introDepth.FocusDistance=20
    introDepth.Parent=Lighting
    local approvedFXModule=Shared:FindFirstChild("RobloxCommonVFX")
    local approvedFX=nil
    if approvedFXModule and approvedFXModule:IsA("ModuleScript") then
      local ok,result=pcall(require,approvedFXModule)
      if ok and type(result)=="table" and type(result.Create)=="function" then approvedFX=result end
    end
    local activeSubjectHighlight=nil
    local introFxCues={
      siege="DESTRUCTION_BURST",charge="WEATHER_GUST_PULSE",
      crown="BOSS_WARNING_PULSE",omen="STATUS_PULSE",
      betrayal="DEBUFF_PULSE",reach="CRITICAL_BURST",
      erasure="DISMANTLE_SHARDS",rift="WEATHER_GUST_PULSE",
      dawn="ENVIRONMENT_MOTE_PULSE",relic="QUEST_UPDATE_PULSE",
      journey="ENVIRONMENT_MOTE_PULSE",
    }
    local introPalettes={
      siege=Color3.fromRGB(222,116,72),charge=Color3.fromRGB(241,167,105),
      crown=Color3.fromRGB(213,178,109),freeze=Color3.fromRGB(117,127,146),
      omen=Color3.fromRGB(161,103,207),betrayal=Color3.fromRGB(115,65,187),
      reach=Color3.fromRGB(119,146,230),erasure=Color3.fromRGB(88,89,111),
      rift=Color3.fromRGB(92,116,239),dawn=Color3.fromRGB(151,197,146),
      relic=Color3.fromRGB(179,171,118),journey=Color3.fromRGB(111,166,153),
    }
    local function playSceneFX(scene,sceneIndex)
      if not entranceOpen or token~=runToken or currentStoryScene~=sceneIndex then return end
      local asset=introFxCues[scene.cinema]
      if approvedFX and asset then
        local location=sceneFocus(scene)
        local color=introPalettes[scene.cinema] or Color3.fromRGB(212,207,200)
        -- 기존 공용 이펙트 중 섬광·원형 충격파는 숨기고 원본 파편·안개만 재생한다.
        pcall(approvedFX.Create,asset,{
          parent=workspace,cframe=CFrame.new(location),
          color=color,accent=color,
          count=reducedEffects and 4 or 12,scale=reducedEffects and .95 or 2.2,
          duration=.65,mist=scene.cinema=="omen" or scene.cinema=="betrayal"
            or scene.cinema=="rift" or scene.cinema=="dawn",
          hideFlash=true,hideRing=true,particlesOnly=true,
          reducedMotion=reducedEffects,
        })
      end
    end
    local finished=false
    local function finish()
      if finished or token~=runToken then return end
      finished=true
      if activeSubjectHighlight then activeSubjectHighlight:Destroy();activeSubjectHighlight=nil end
      introGrade:Destroy()
      introBloom:Destroy()
      introBlur:Destroy()
      introDepth:Destroy()
      closeArrival(true)
    end
    skipButton.Activated:Once(finish)

    -- [카메라] 기존 RunService·TweenService로 실제 월드의 카메라만 이동하고
    -- 촬영 대상의 이동 위치를 매 프레임 따라가며 보간한다.
    local RunService=game:GetService("RunService")
    task.spawn(function()
      for index,scene in ipairs(scenes) do
        if not entranceOpen or token~=runToken then return end
        currentStoryScene=index
        local camera=workspace.CurrentCamera
        if not camera then finish();return end
        openingCamera=camera
        if activeTween then activeTween:Cancel();activeTween=nil end
        if activeFovTween then activeFovTween:Cancel();activeFovTween=nil end
        if activeCurtainTween then activeCurtainTween:Cancel();activeCurtainTween=nil end
        if activeVignetteTween then activeVignetteTween:Cancel();activeVignetteTween=nil end
        if activeAmbienceTween then activeAmbienceTween:Cancel();activeAmbienceTween=nil end
        if activeEffectsTween then activeEffectsTween:Cancel();activeEffectsTween=nil end

        -- [장면 감독] 한 화면에 완성 JPG + 같은 장면 PNG를 절대 중첩하지 않는다.
        storyCurtain.BackgroundTransparency=0
        if activeStoryFocusTween then activeStoryFocusTween:Cancel() end
        if activeStoryRevealTween then activeStoryRevealTween:Cancel() end
        if activeArtImpactTween then activeArtImpactTween:Cancel() end
        if activeDepthTween then activeDepthTween:Cancel() end
        if activeActorGestureTween then activeActorGestureTween:Cancel() end
        if activeActorEraseTween then activeActorEraseTween:Cancel() end
        if activeShadowTween then activeShadowTween:Cancel() end
        if activeMistTween then activeMistTween:Cancel() end
        if activeLightTween then activeLightTween:Cancel() end
        if activeFarHazeTween then activeFarHazeTween:Cancel() end
        for _,motion in ipairs(activeParticleTweens) do motion:Cancel() end
        table.clear(activeParticleTweens)
        local artworkId=(Config.CinematicIntroSceneIds or {})[index]
        local foregroundId=(Config.CinematicIntroForegroundIds or {})[index]
        local artworkAvailable=type(artworkId)=="string" and artworkId:match("^rbxassetid://%d+$")~=nil
        local foregroundAvailable=type(foregroundId)=="string" and foregroundId:match("^rbxassetid://%d+$")~=nil
        -- [인물별 2.5D] 빅브라더·미러 포함 11컷은 전경 PNG를 실제 월드와 합성한다.
        -- 완성 그림 JPG와 같은 장면의 PNG는 중복 표시하지 않는다.
        local useWorldActor=foregroundAvailable
        local usePaintedBackdrop=artworkAvailable and not useWorldActor
        local activeVisual=usePaintedBackdrop or useWorldActor
        setIntroPlayerHidden(useWorldActor and scene.actor=="PLAYER")
        storyPaintStage.Visible=activeVisual
        storyArtwork.Visible=usePaintedBackdrop
        actorMotionFrame.Visible=useWorldActor
        storyForeground.Visible=useWorldActor
        storyArtwork.Image=artworkAvailable and artworkId or ""
        storyForeground.Image=useWorldActor and foregroundId or ""
        storyArtwork.ImageTransparency=1
        storyForeground.ImageTransparency=1
        storyArtwork.Position=UDim2.fromScale(.5,.5)
        storyArtwork.Size=UDim2.fromScale(1.10,1.10)
        storyArtwork.Rotation=0
        storyForeground.Position=UDim2.fromScale(.5,.5)
        storyForeground.Size=UDim2.fromScale(1,1)
        storyForeground.Rotation=0
        storyVision.Visible=false
        backdrop.BackgroundTransparency=usePaintedBackdrop and .06 or 1
        introPanel.BackgroundTransparency=usePaintedBackdrop and .1 or 1
        introTint.BackgroundTransparency=usePaintedBackdrop and .9 or .98
        layoutIntroCaptions()
        local direction=index%2==0 and -1 or 1
        local artDuration=math.max(1,scene.seconds-.45)
        if usePaintedBackdrop then
          -- [원화 카메라] 전체 원화만 한 번 사용하고 카메라 도리·확대만 적용한다.
          storyArtwork.Position=UDim2.fromScale(.5-direction*.025,.51)
          activeDepthTween=TweenService:Create(storyArtwork,
            TweenInfo.new(artDuration,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
              Position=UDim2.fromScale(.5+direction*.025,.485),
              Size=UDim2.fromScale(1.20,1.20),
              Rotation=direction*.5,
            })
          activeStoryRevealTween=TweenService:Create(storyArtwork,
            TweenInfo.new(.7,Enum.EasingStyle.Sine),{ImageTransparency=.02})
          activeDepthTween:Play()
          activeStoryRevealTween:Play()
        end
        if useWorldActor then
          -- [2.5D 실제 화면 이동] 인물 분리 원화의 독립 무대에서 장면마다 서로 다른 큰 동작을 수행한다.
          -- 원본 한 장을 잘라 팔/몸을 가짜로 조립하지 않고, 원화 전체를 하나의 인물로 유지한다.
          local isFall=scene.cinema=="rift"
          local isCharge=scene.cinema=="charge" or scene.cinema=="reach"
          local isThreat=scene.cinema=="crown" or scene.cinema=="betrayal"
          local isStill=scene.cinema=="freeze" or scene.cinema=="erasure"
          local fromScale=isFall and 1.31 or isCharge and .79 or isThreat and .83 or .94
          local toScale=isFall and .67 or isCharge and 1.34 or isThreat and 1.29
            or isStill and 1.035 or 1.16
          local fromX=.5+direction*(isCharge and .185 or isThreat and .085 or .12)
          local toX=.5-direction*(isCharge and .165 or isStill and .026 or .085)
          local fromY=isFall and .14 or isCharge and .58 or isThreat and .55 or .54
          local toY=isFall and .86 or isCharge and .46 or isThreat and .47 or .49
          actorMotionFrame.Position=UDim2.fromScale(fromX,fromY)
          actorMotionFrame.Size=UDim2.fromScale(fromScale,fromScale)
          actorMotionFrame.Rotation=isFall and -direction*9 or isCharge and direction*4
            or scene.cinema=="omen" and -direction*3 or 0
          activeActorGestureTween=TweenService:Create(actorMotionFrame,
            TweenInfo.new(artDuration,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
              Position=UDim2.fromScale(toX,toY),
              Size=UDim2.fromScale(toScale,toScale),
              Rotation=isFall and direction*11 or isCharge and -direction*4.5
                or scene.cinema=="betrayal" and -direction*5
                or scene.cinema=="omen" and direction*3.5 or direction*1.3,
            })
          activeActorEraseTween=TweenService:Create(storyForeground,
            TweenInfo.new(.55,Enum.EasingStyle.Sine),{ImageTransparency=.015})
          activeArtImpactTween=TweenService:Create(storyForeground,
            TweenInfo.new(reducedEffects and 2.4 or (1.02+index*.10),
              Enum.EasingStyle.Sine,Enum.EasingDirection.InOut,-1,true),{
                Position=UDim2.fromScale(.5,.5-(reducedEffects and .002 or .015)),
                Rotation=direction*(reducedEffects and .12 or .72),
            })
          activeActorGestureTween:Play()
          activeActorEraseTween:Play()
          activeArtImpactTween:Play()
          -- [로딩 병목 교정] 2.3초 동안 미로딩인 것을 실패로 오판해
          -- 새 인물 연출을 예전 JPG 정지 화면으로 교체하던 동작을 제거한다.
          -- 실제 다운로드 Failure만 예전 그림으로 복구하며, Loading/TimedOut은 기다린다.
          if artworkAvailable then
            local expectedIndex=index
            task.delay(math.min(2.3,scene.seconds*.52),function()
              if not entranceOpen or token~=runToken or currentStoryScene~=expectedIndex then return end
              if storyForeground.IsLoaded then return end
              local ok,status=pcall(function()
                return ContentProvider:GetAssetFetchStatus(foregroundId)
              end)
              if ok and status==Enum.AssetFetchStatus.Failure then
                if activeActorGestureTween then activeActorGestureTween:Cancel() end
                if activeArtImpactTween then activeArtImpactTween:Cancel() end
                actorMotionFrame.Visible=false
                storyForeground.Visible=false
                storyArtwork.Visible=true
                storyArtwork.ImageTransparency=.04
                storyArtwork.Position=UDim2.fromScale(.48,.5)
                storyArtwork.Size=UDim2.fromScale(1.13,1.13)
                activeDepthTween=TweenService:Create(storyArtwork,
                  TweenInfo.new(math.max(.6,scene.seconds-2.3),Enum.EasingStyle.Sine),{
                    Position=UDim2.fromScale(.52,.49),Size=UDim2.fromScale(1.2,1.2),
                  })
                activeDepthTween:Play()
                warn("[마력숲 오프닝] 인물 원화 실제 다운로드 실패: 장면 "..expectedIndex)
              end
            end)
          end
        end
        -- [제작한 2.5D 연출] 먼 안개/가까운 안개/빛줄기는 모두 서로 다른 깊이·속도.
        local isDramatic=scene.cinema=="siege" or scene.cinema=="betrayal"
          or scene.cinema=="erasure" or scene.cinema=="rift"
        local isWarm=scene.cinema=="siege" or scene.cinema=="charge"
          or scene.cinema=="dawn" or scene.cinema=="journey"
        local isVoid=scene.cinema=="betrayal" or scene.cinema=="omen"
          or scene.cinema=="rift" or scene.cinema=="erasure"
        storyFarHaze.Visible=activeVisual
        storyFarHaze.BackgroundColor3=isVoid and Color3.fromRGB(121,102,179)
          or isWarm and Color3.fromRGB(209,193,149) or Color3.fromRGB(143,183,198)
        storyFarHaze.BackgroundTransparency=reducedEffects and .97 or .90
        storyFarHaze.Position=UDim2.fromScale(-direction*.065,.59)
        activeFarHazeTween=TweenService:Create(storyFarHaze,
          TweenInfo.new(artDuration,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
            Position=UDim2.fromScale(direction*.04,.55),
            BackgroundTransparency=reducedEffects and .99 or .94,
          })
        if storyFarHaze.Visible then activeFarHazeTween:Play() end
        cinematicShadow.Visible=activeVisual and not reducedEffects and isDramatic
        cinematicMist.Visible=activeVisual
        cinematicMist.BackgroundTransparency=reducedEffects and .97 or .88
        cinematicMist.BackgroundColor3=isVoid and Color3.fromRGB(115,95,177)
          or isWarm and Color3.fromRGB(205,210,172) or Color3.fromRGB(120,176,153)
        cinematicLight.Visible=activeVisual and not reducedEffects
          and scene.cinema~="freeze" and scene.cinema~="erasure"
        cinematicLight.BackgroundColor3=(scene.cinema=="betrayal" or scene.cinema=="rift")
          and Color3.fromRGB(122,127,229)
          or (scene.cinema=="dawn" or scene.cinema=="journey")
          and Color3.fromRGB(208,230,184)
          or Color3.fromRGB(238,197,149)
        cinematicLight.Position=UDim2.fromScale(direction>0 and -.24 or 1.12,.40)
        cinematicLight.Rotation=direction>0 and -18 or 18
        cinematicLight.BackgroundTransparency=.93
        activeLightTween=TweenService:Create(cinematicLight,
          TweenInfo.new(artDuration,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
            Position=UDim2.fromScale(direction>0 and .08 or .87,.47),
            BackgroundTransparency=.96,
          })
        if cinematicLight.Visible then activeLightTween:Play() end
        cinematicShadow.Position=UDim2.fromScale(-.65,.5)
        cinematicMist.Position=UDim2.fromScale(-direction*.075,.85)
        activeShadowTween=TweenService:Create(cinematicShadow,
          TweenInfo.new(artDuration,Enum.EasingStyle.Sine),{
            Position=UDim2.fromScale(1.60,.5)})
        activeMistTween=TweenService:Create(cinematicMist,
          TweenInfo.new(artDuration,Enum.EasingStyle.Sine),{
            Position=UDim2.fromScale(direction*.05,.79),
            BackgroundTransparency=.94})
        if cinematicShadow.Visible then activeShadowTween:Play() end
        if cinematicMist.Visible then activeMistTween:Play() end
        for n,spark in ipairs(cinematicParticles) do
          spark.Visible=activeVisual and (not reducedEffects or n<=5)
          if spark.Visible then
            spark.ImageColor3=(scene.cinema=="dawn" or scene.cinema=="journey")
              and Color3.fromRGB(173,221,183) or Color3.fromRGB(226,168,112)
            spark.Position=UDim2.fromScale((n*37%99)/100,.58+(n*13%32)/100)
            spark.ImageTransparency=.52
            local particleTween=TweenService:Create(spark,
              TweenInfo.new(artDuration,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
                Position=spark.Position+UDim2.fromScale(direction*.021,-.082),
                ImageTransparency=.98,
              })
            activeParticleTweens[#activeParticleTweens+1]=particleTween
            particleTween:Play()
          end
        end
        local focus,focusSubject=sceneFocus(scene)
        -- [월드 원형 강조] 기존 모델을 변경하지 않고 촬영 중 로컬 윤곽만 비춘다.
        if activeSubjectHighlight then activeSubjectHighlight:Destroy();activeSubjectHighlight=nil end
        if not useWorldActor and focusSubject and (focusSubject:IsA("Model") or focusSubject:IsA("BasePart")) then
          activeSubjectHighlight=Instance.new("Highlight")
          activeSubjectHighlight.Name="MeadowStorySubject"
          activeSubjectHighlight.Adornee=focusSubject
          activeSubjectHighlight.FillColor=introPalettes[scene.cinema] or Color3.fromRGB(222,218,203)
          activeSubjectHighlight.OutlineColor=activeSubjectHighlight.FillColor
          activeSubjectHighlight.FillTransparency=reducedEffects and .96 or .89
          activeSubjectHighlight.OutlineTransparency=reducedEffects and .88 or .66
          activeSubjectHighlight.DepthMode=Enum.HighlightDepthMode.Occluded
          activeSubjectHighlight.Parent=camera
        end
        local starting=CFrame.lookAt(focus+scene.start,focus)
        local ending=CFrame.lookAt(focus+scene.finish,focus)
        -- [색·초점 감독] 12개 사건을 같은 필터로 처리하지 않고 각 컷에 맞게 조정한다.
        local sceneTint=introPalettes[scene.cinema] or Color3.fromRGB(255,255,255)
        TweenService:Create(introGrade,TweenInfo.new(.78,Enum.EasingStyle.Sine),{
          TintColor=sceneTint,
          Saturation=(scene.cinema=="freeze" or scene.cinema=="erasure") and -.82
            or scene.cinema=="dawn" and .11 or -.25,
          Contrast=(scene.cinema=="betrayal" or scene.cinema=="rift") and .38 or .17,
          Brightness=(scene.cinema=="dawn" or scene.cinema=="journey") and .10
            or scene.cinema=="erasure" and -.20 or -.035,
        }):Play()
        TweenService:Create(introBloom,TweenInfo.new(.8,Enum.EasingStyle.Sine),{
          Intensity=(scene.cinema=="dawn" or scene.cinema=="omen") and .32
            or scene.cinema=="erasure" and 0 or .16,
          Threshold=scene.cinema=="dawn" and 1.35 or 1.85,
        }):Play()
        TweenService:Create(introBlur,TweenInfo.new(.75,Enum.EasingStyle.Sine),{
          Size=scene.cinema=="erasure" and (reducedEffects and 2 or 5)
            or scene.cinema=="freeze" and 1.4 or 0,
        }):Play()
        introDepth.FocusDistance=(focus-starting.Position).Magnitude
        if not cameraMotionValue then cameraMotionValue=Instance.new("CFrameValue") end
        cameraMotionValue.Value=starting
        camera.CameraType=Enum.CameraType.Scriptable
        camera.FieldOfView=scene.fov
        local activeScene=index
        local sceneStarted=os.clock()
        if cameraMotionConnection then cameraMotionConnection:Disconnect() end
        cameraMotionConnection=RunService.RenderStepped:Connect(function()
          if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
          local liveCamera=workspace.CurrentCamera
          if not liveCamera or not cameraMotionValue then return end
          local target=sceneFocus(scene)
          local at=cameraMotionValue.Value.Position
          if (target-at).Magnitude<.1 then return end
          local elapsed=os.clock()-sceneStarted
          -- [실제 카메라 반동] 전쟁 충격·배신의 기울임·추락의 회전, 플레이어 위치는 그대로.
          local beat=(scene.cinema=="siege" or scene.cinema=="charge") and 1.1
            or scene.cinema=="betrayal" and 1.85 or scene.cinema=="rift" and 1.85 or 0
          local kick=beat>0 and math.exp(-math.abs(elapsed-beat)*7) or 0
          local shake=kick*(reducedEffects and .028 or .11)
          local roll=scene.cinema=="rift" and math.sin(elapsed*.8)*.025
            or scene.cinema=="betrayal" and .013
            or scene.cinema=="freeze" and 0 or math.sin(elapsed*.4)*.003
          local offset=Vector3.new(math.sin(elapsed*39)*shake,
            math.cos(elapsed*33)*shake*.55,0)
          liveCamera.CFrame=CFrame.lookAt(at+offset,target)*CFrame.Angles(0,0,roll)
          if introDepth.Enabled then introDepth.FocusDistance=(target-at).Magnitude end
        end)
        if scene.cinema~="freeze" and scene.cinema~="erasure" then
          activeTween=TweenService:Create(cameraMotionValue,
            TweenInfo.new(scene.seconds*.92,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
              Value=ending,
            })
          activeTween:Play()
        end
        activeFovTween=TweenService:Create(camera,TweenInfo.new(scene.seconds*.68,
          Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{
          FieldOfView=scene.fov+(scene.cinema=="rift" and 13
            or scene.cinema=="charge" and 7 or scene.cinema=="dawn" and -7 or -3),
        })
        activeFovTween:Play()
        cinematicVignette.BackgroundTransparency=(scene.cinema=="betrayal" or scene.cinema=="erasure")
          and .62 or scene.cinema=="dawn" and .92 or .83
        local isSilent=scene.cinema=="freeze" or scene.cinema=="erasure"
        local volume=isSilent and 0 or scene.cinema=="dawn" and .85
          or scene.cinema=="charge" and .20 or scene.cinema=="betrayal" and .18 or .45
        activeAmbienceTween=TweenService:Create(meadowAmbienceGroup,
          TweenInfo.new(.7,Enum.EasingStyle.Sine),{
            Volume=(introAmbienceBefore or 0)*volume,
          })
        activeEffectsTween=TweenService:Create(meadowEffectsGroup,
          TweenInfo.new(.45,Enum.EasingStyle.Sine),{
            Volume=(introEffectsBefore or 0)*(isSilent and 0 or 1),
          })
        activeAmbienceTween:Play()
        activeEffectsTween:Play()
        local barHeight=(scene.cinema=="betrayal" or scene.cinema=="rift") and .15
          or scene.cinema=="dawn" and .065 or .105
        TweenService:Create(cinematicBars[1],TweenInfo.new(.6,Enum.EasingStyle.Sine),{
          Size=UDim2.fromScale(1,barHeight),
        }):Play()
        TweenService:Create(cinematicBars[2],TweenInfo.new(.6,Enum.EasingStyle.Sine),{
          Position=UDim2.fromScale(0,1-barHeight),Size=UDim2.fromScale(1,barHeight),
        }):Play()
        regionIntro.Text=scene.title
        regionIntro.TextTransparency=1
        regionIntro.MaxVisibleGraphemes=-1
        introDialogue.Text=scene.subtitle
        introDialogue.TextTransparency=1
        introDialogue.MaxVisibleGraphemes=0
        subtitlePlate.BackgroundTransparency=.36
        subtitlePlate.Position=UDim2.fromScale(.5,.982)
        regionIntro.TextColor3=(scene.cinema=="omen" or scene.cinema=="betrayal")
          and Color3.fromRGB(228,199,246)
          or scene.cinema=="dawn" and Color3.fromRGB(220,236,203)
          or Color3.fromRGB(236,214,169)
        introDialogue.TextColor3=Color3.fromRGB(244,238,221)

        activeCurtainTween=TweenService:Create(storyCurtain,
          TweenInfo.new(scene.cinema=="dawn" and 1.65 or .88,Enum.EasingStyle.Sine),{
            BackgroundTransparency=1,
          })
        activeCurtainTween:Play()
        task.delay(.45,function()
          if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
          TweenService:Create(regionIntro,TweenInfo.new(.62,Enum.EasingStyle.Sine),{
            TextTransparency=0,
          }):Play()
          TweenService:Create(introDialogue,TweenInfo.new(.58,Enum.EasingStyle.Sine),{
            TextTransparency=0,
          }):Play()
        end)
        task.delay(scene.cinema=="freeze" and 1.1 or .72,function()
          if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
          local count=utf8.len(scene.subtitle) or 0
          for i=1,count do
            if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
            introDialogue.MaxVisibleGraphemes=i
            task.wait(scene.cinema=="dawn" and .058 or .034)
          end
        end)
        -- [사건 큐] 사용자 효과음 볼륨 설정을 따르며 내장 소리만 시간에 맞춰 사용한다.
        local beatAt=(scene.cinema=="siege" or scene.cinema=="charge") and 1.1
          or (scene.cinema=="betrayal" or scene.cinema=="reach" or scene.cinema=="rift") and 1.85
          or scene.cinema=="crown" and 1.9 or scene.cinema=="omen" and 1.65
          or scene.cinema=="erasure" and 2.3 or scene.cinema=="dawn" and 2.1
          or scene.cinema=="relic" and 1.7 or scene.cinema=="journey" and 2.3 or nil
        if beatAt then
          task.delay(beatAt,function()
            if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
            playSceneFX(scene,activeScene)
            -- [무음 감정] 그날의 말과 침묵을 빛 대신 먼지·안개로 처리한다.
            if scene.cinema=="crown" or scene.cinema=="omen" or scene.cinema=="erasure"
              or scene.cinema=="dawn" or scene.cinema=="relic" or scene.cinema=="journey" then return end
            introBeatSound:Stop()
            introBeatSound.PlaybackSpeed=scene.cinema=="betrayal" and .62
              or scene.cinema=="rift" and .7 or .94
            introBeatSound.Volume=.27
            introBeatSound:Play()
          end)
        end
        if scene.cinema=="siege" or scene.cinema=="charge" or scene.cinema=="rift" then
          task.delay(scene.seconds*.70,function()
            playSceneFX(scene,activeScene)
          end)
        end
        if scene.cinema=="erasure" then
          task.delay(2.1,function()
            if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
            local glyphs=utf8.len(scene.title) or 0
            for count=glyphs,0,-1 do
              if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
              regionIntro.MaxVisibleGraphemes=count
              task.wait(.08)
            end
          end)
        end
        -- [장면 연결] 완성된 월드를 가렸다 여는 매치컷. 크롭된 이미지나 화면 섬광은 없다.
        task.delay(scene.seconds-.55,function()
          if not entranceOpen or token~=runToken or currentStoryScene~=activeScene then return end
          if activeCurtainTween then activeCurtainTween:Cancel() end
          activeCurtainTween=TweenService:Create(storyCurtain,TweenInfo.new(.5,Enum.EasingStyle.Sine),{
            BackgroundTransparency=0,
          })
          activeCurtainTween:Play()
        end)
        local started=os.clock()
        while entranceOpen and token==runToken and os.clock()-started<scene.seconds do
          task.wait(.05)
        end
      end
      finish()
    end)
  end
  local function loadRegion(isFresh)
    if not entranceOpen then return end
    runToken+=1
    local token=runToken
    titlePanel.Visible=false
    options.Visible=false
    confirmPanel.Visible=false
    loadPanel.Visible=true
    setProgress(0,0,"서버 및 저장 기록 확인")
    task.spawn(function()
      -- [입장 대기] 서버가 늦게 준비되어도 첫 터치가 사라지지 않도록 로딩 화면을 유지한다.
      -- 데이터 복원 실패는 기존 서버 저장 API로만 재시도한다. 클라이언트 저장 조작 없음.
      local profileDeadline=os.clock()+90
      local retrySent=false
      local retryStarted=0
      while entranceOpen and token==runToken and player:GetAttribute("ProfileReady")~=true
        and os.clock()<profileDeadline do
        local failed=player:GetAttribute("MeadowProfileLoadState")=="FAILED"
        if failed and not retrySent then
          retrySent=true
          retryStarted=os.clock()
          remote:FireServer("meadow:profile:retry")
        elseif failed and retrySent and os.clock()-retryStarted>14 then
          break
        end
        setProgress(0,0,failed and "서버 프로필 복구 재시도" or "서버 저장 정보 연결 중")
        task.wait(.2)
      end
      if not entranceOpen or token~=runToken then return end
      if player:GetAttribute("ProfileReady")~=true then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text=player:GetAttribute("MeadowProfileLoadState")=="FAILED"
          and "서버 프로필 준비 실패 · 다시 시작해" or "서버 연결 지연 · 다시 시도해"
        return
      end
      -- [신규 유저 오프닝] 저장이 없는 "모험 시작"도 첫 입장이므로 오프닝을 재생한다.
      if not isFresh and player:GetAttribute("MeadowProfileHadSave")~=true then
        isFresh=true
      end
      setProgress(0,0,"저장 데이터 확인")
      local resumeDeadline=os.clock()+26
      while entranceOpen and token==runToken
        and player:GetAttribute("MeadowResumeReady")==false
        and os.clock()<resumeDeadline do task.wait(.15) end
      if not entranceOpen or token~=runToken then return end
      if player:GetAttribute("MeadowResumeReady")==false then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text="이전 위치 복원 확인 중 · 다시 시도해"
        return
      end
      local world=workspace:WaitForChild("FantasySurvivalWorld",20)
      -- [캐릭터 준비] 생성 이벤트 무한 대기를 없애고 실제 몸체 확인 후에만 입장한다.
      local character,rootPart
      local characterDeadline=os.clock()+24
      local recoveryAt=os.clock()+4
      repeat
        if not entranceOpen or token~=runToken then return end
        character=player.Character
        rootPart=character and character:FindFirstChild("HumanoidRootPart")
        local humanoid=character and character:FindFirstChildOfClass("Humanoid")
        if character and character:IsDescendantOf(workspace) and rootPart
          and humanoid and humanoid.Health>0 then break end
        rootPart=nil
        setProgress(0,0,"캐릭터 생성 확인 중")
        if os.clock()>=recoveryAt then
          local endpoint=ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
          if endpoint and endpoint:IsA("RemoteEvent") then endpoint:FireServer("CHARACTER_RECOVERY") end
          recoveryAt=os.clock()+8
        end
        task.wait(.15)
      until os.clock()>=characterDeadline
      if not entranceOpen or token~=runToken then return end
      if not world or not rootPart then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text=not rootPart and "캐릭터 생성 지연 · 다시 시작해" or "월드 준비 실패 · 다시 시도해"
        return
      end
      local assets={}
      for _,descendant in ipairs(world:GetDescendants()) do
        if descendant:IsA("MeshPart") or descendant:IsA("Decal")
          or descendant:IsA("Texture") then
          assets[#assets+1]=descendant
          if #assets>=20 then break end
        end
      end
      -- [정확한 로딩] 완료된 원본 자산 처리 건수에 비례하여 진행한다.
      local total=1+#assets
      local loaded=0
      setProgress(loaded,total,"초원 지형 및 캐릭터 준비")
      local failed=0
      -- 진행 숫자는 실제 완료된 원본 파일의 PreloadAsync 호출 수로만 증가한다.
      for _,asset in ipairs(assets) do
        if not entranceOpen or token~=runToken then return end
        local ok=pcall(function() ContentProvider:PreloadAsync({asset}) end)
        if not ok then failed+=1 end
        loaded+=1
        setProgress(loaded,total,failed>0 and "일부 자산 로딩 실패" or "원본 모델 불러오는 중")
        task.wait()
      end
      if not entranceOpen or token~=runToken then return end
      loaded+=1
      setProgress(loaded,total,failed>0 and "일부 자산은 접속 후 다시 로드돼" or "월드 준비 완료")
      task.wait(.18)
      startIntro(isFresh)
    end)
  end
  replayButton.Activated:Connect(function()
    -- [저장 보존] 기존 진행도를 초기화하지 않고 새 오프닝만 다시 본 뒤 입장한다.
    loadRegion(true)
  end)
  continueButton.Activated:Connect(function()
    -- 이어하기는 서버 준비를 기다리되 입력 자체를 무시하지 않는다.
    loadRegion(false)
  end)
  local newGameWaiting=false
  newButton.Activated:Connect(function()
    if newGameWaiting or not entranceOpen then return end
    newGameWaiting=true
    -- [새 게임 첫 터치] 저장 데이터가 준비될 때까지 버튼이 먹통처럼 보이지 않게 한다.
    titlePanel.Visible=false
    options.Visible=false
    loadPanel.Visible=true
    setProgress(0,0,"새 게임 시작 전 기존 저장 확인")
    task.spawn(function()
      local deadline=os.clock()+90
      local retrySent=false
      local retryStarted=0
      while entranceOpen and player:GetAttribute("ProfileReady")~=true
        and os.clock()<deadline do
        local failed=player:GetAttribute("MeadowProfileLoadState")=="FAILED"
        if failed and not retrySent then
          retrySent=true
          retryStarted=os.clock()
          remote:FireServer("meadow:profile:retry")
        elseif failed and retrySent and os.clock()-retryStarted>14 then
          break
        end
        setProgress(0,0,failed and "저장 정보 복구 재시도" or "서버 저장 정보 연결 중")
        task.wait(.2)
      end
      newGameWaiting=false
      if not entranceOpen then return end
      if player:GetAttribute("ProfileReady")~=true then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text="서버 저장 정보 준비 실패 · 다시 시도해"
        return
      end
      if player:GetAttribute("SaveStatus")=="SESSION_ONLY" then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text="저장 연결 실패 · 기존 데이터 초기화 불가"
        return
      end
      if player:GetAttribute("MeadowProfileHadSave")~=true then
        loadRegion(true)
      else
        loadPanel.Visible=false
        titlePanel.Visible=false
        confirmPanel.Visible=true
      end
    end)
  end)
  confirmButton.Activated:Connect(function()
    if player:GetAttribute("ProfileReady")~=true then return end
    confirmButton.Active=false
    confirmButton.Text="서버에서 기존 저장 초기화 중"
    remote:FireServer("meadow:new-game:confirm")
  end)
  player:GetAttributeChangedSignal("MeadowNewGameResult"):Connect(function()
    if not entranceOpen then return end
    local result=player:GetAttribute("MeadowNewGameResult")
    if result=="SUCCESS" then
      confirmButton.Active=true
      confirmButton.Text="삭제 확인 · 새 게임 시작"
      loadRegion(true)
    elseif result=="SAVE_FAILED" or result=="UNAVAILABLE" then
      confirmButton.Active=true
      confirmButton.Text="다시 시도"
      local warning=confirmPanel:FindFirstChild("Details")
      if warning then warning.Text="저장소가 초기화를 승인하지 않았어.\n기존 진행도는 보존했어." end
    end
  end)
end

-- [마을 NPC 대화] 작은 모바일 선택창. 서버에 있는 계약 ID·선택지만 전송한다.
do
  local dialog=Instance.new("Frame")
  dialog.Name="MeadowVillageDialogue"
  dialog.AnchorPoint=Vector2.new(.5,.5)
  dialog.Position=UDim2.fromScale(.5,.5)
  dialog.Size=UDim2.new(.9,0,0,320)
  dialog.BackgroundColor3=Color3.fromRGB(28,38,32)
  dialog.BorderSizePixel=0
  dialog.ZIndex=70
  dialog.Visible=false
  dialog.Parent=gui
  local sizeLimit=Instance.new("UISizeConstraint")
  sizeLimit.MaxSize=Vector2.new(440,320)
  sizeLimit.Parent=dialog
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,12)
  corner.Parent=dialog
  local stroke=Instance.new("UIStroke")
  stroke.Color=Color3.fromRGB(180,143,88)
  stroke.Thickness=2
  stroke.Parent=dialog
  local title=Instance.new("TextLabel")
  title.Name="Speaker"
  title.Position=UDim2.fromOffset(12,10)
  title.Size=UDim2.new(1,-64,0,36)
  title.BackgroundTransparency=1
  title.TextColor3=Color3.fromRGB(251,225,174)
  title.Font=Enum.Font.GothamBold
  title.TextSize=18
  title.TextXAlignment=Enum.TextXAlignment.Left
  title.TextTruncate=Enum.TextTruncate.AtEnd
  title.ZIndex=71
  title.Parent=dialog
  local storyScroll=Instance.new("ScrollingFrame")
  storyScroll.Name="VillageStoryScroll"
  storyScroll.Position=UDim2.fromOffset(14,49)
  storyScroll.Size=UDim2.new(1,-28,0,136)
  storyScroll.BackgroundTransparency=1
  storyScroll.BorderSizePixel=0
  storyScroll.ScrollBarThickness=3
  storyScroll.AutomaticCanvasSize=Enum.AutomaticSize.Y
  storyScroll.CanvasSize=UDim2.new()
  storyScroll.ScrollingDirection=Enum.ScrollingDirection.Y
  storyScroll.ZIndex=71
  storyScroll.Parent=dialog
  local story=Instance.new("TextLabel")
  story.Name="DialogueText"
  story.Position=UDim2.fromOffset(0,2)
  story.Size=UDim2.new(1,-7,0,0)
  story.AutomaticSize=Enum.AutomaticSize.Y
  story.BackgroundTransparency=1
  story.TextColor3=Color3.fromRGB(237,241,224)
  story.Font=Enum.Font.GothamMedium
  story.TextSize=14
  story.TextWrapped=true
  story.TextYAlignment=Enum.TextYAlignment.Top
  story.TextXAlignment=Enum.TextXAlignment.Left
  story.ZIndex=71
  story.Parent=storyScroll
  local close=Instance.new("TextButton")
  close.Name="Close"
  close.Position=UDim2.new(1,-42,0,9)
  close.Size=UDim2.fromOffset(32,34)
  close.BackgroundColor3=Color3.fromRGB(70,61,51)
  close.Text="×"
  close.TextSize=22
  close.TextColor3=Color3.fromRGB(255,250,227)
  close.ZIndex=72
  close.Parent=dialog
  close.Activated:Connect(function()dialog.Visible=false end)
  local choices={}
  local choiceActions={}
  local dialogHeight=300
  local visibleChoices=2
  for i=1,5 do
    local button=Instance.new("TextButton")
    button.Name="Choice"..i
    button.Position=UDim2.new(0,14,0,182+(i-1)*61)
    button.Size=UDim2.new(1,-28,0,54)
    button.BackgroundColor3=Color3.fromRGB(73,94,72)
    button.TextColor3=Color3.fromRGB(255,252,232)
    button.Font=Enum.Font.GothamBold
    button.TextSize=13
    button.TextWrapped=true
    button.ZIndex=72
    button.Visible=false
    button.Parent=dialog
    local rounded=Instance.new("UICorner")
    rounded.CornerRadius=UDim.new(0,8)
    rounded.Parent=button
    choices[i]=button
    button.Activated:Connect(function()
      local action=choiceActions[i]
      if action and dialog.Visible then
        dialog.Visible=false
        for k=1,5 do choiceActions[k]=nil end
        remote:FireServer(action)
      end
    end)
  end
  local function layoutDialogue()
    local v=gui.AbsoluteSize
    if v.Y>0 then
      local h=math.clamp(v.Y-36,230,360)
      dialogHeight=h
      dialog.Size=UDim2.new(.9,0,0,h)
      -- 선택지가 많으면 버튼을 작게 줄이고 본문 영역을 남은 만큼만 쓴다.
      local count=math.max(1,visibleChoices)
      local bh=count>2 and 38 or 50
      local gap=count>2 and 42 or 56
      storyScroll.Size=UDim2.new(1,-28,0,math.max(60,h-60-count*gap))
      for i,button in ipairs(choices)do
        button.Position=UDim2.new(0,14,0,h-8-count*gap+(i-1)*gap)
        button.Size=UDim2.new(1,-28,0,bh)
      end
    end
  end
  gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutDialogue)
  layoutDialogue()
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind~="MEADOW_VILLAGE_DIALOG" or typeof(payload)~="table" then return end
    title.Text=tostring(payload.title or "마을 의뢰")
    story.Text=tostring(payload.message or "")
    storyScroll.CanvasPosition=Vector2.zero
    for i,button in ipairs(choices)do
      local option=typeof(payload.options)=="table" and payload.options[i] or nil
      local action=option and option.action
      local permitted=(typeof(action)=="string" and (action:match("^village:story:%d$") or action:match("^smith:%a+$") or action:match("^cook:%d$") or action:match("^cookp:%d$") or action:match("^lm:%d+:%d$")) ~= nil) or action=="wp:east" or action=="wp:west" or (action:match("^wp:near:[123]$")~=nil) or (action:match("^estate:%a:%d+$")~=nil) or (action:match("^mount:%a+:%d$")~=nil) or (action:match("^bounty:%a+:%d$")~=nil) or (action:match("^miner:%a+:%d$")~=nil) or (action:match("^estate:%a:%d+:%d+$")~=nil) or action=="co:toggle" or action=="ql:1" or action=="ql:2" or action=="ct:accept" or action=="ct:claim" or action=="village:accept" or action=="village:resolve:1" or action=="village:resolve:2" or action=="camp:upgrade" or action=="camp:rest" or action=="bounty:accept" or action=="bounty:resolve:1" or action=="bounty:resolve:2"
      button.Visible=permitted
      choiceActions[i]=permitted and action or nil
      if permitted then button.Text=tostring(option.label or "선택") end
    end
    local shown=0
    for i=1,5 do if choiceActions[i] then shown=i end end
    visibleChoices=math.max(1,shown)
    layoutDialogue()
    dialog.Visible=true
  end)
  player.CharacterAdded:Connect(function()dialog.Visible=false end)
  -- [대화 연출] 대화창이 열리면 시야각을 살짝 좁혀 인물에 집중시키고, 닫히면 원래 값으로 천천히 되돌린다(화면 효과만).
  do
    local fovTween=game:GetService("TweenService")
    local savedFov=nil
    dialog:GetPropertyChangedSignal("Visible"):Connect(function()
      local camera=workspace.CurrentCamera
      if not camera then return end
      if dialog.Visible then
        if savedFov==nil then savedFov=camera.FieldOfView end
        fovTween:Create(camera,TweenInfo.new(.45,Enum.EasingStyle.Sine,Enum.EasingDirection.Out),{FieldOfView=math.max(45,savedFov-14)}):Play()
      elseif savedFov~=nil then
        local back=savedFov;savedFov=nil
        fovTween:Create(camera,TweenInfo.new(.5,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{FieldOfView=back}):Play()
      end
    end)
  end
end

do
-- [초원 날씨 표시·네이티브 강수] 서버의 같은 날씨/시각을 모든 플레이어가 관측한다.
-- 날씨는 시각 효과 전용이다. 스킬 입력·몬스터 전투·저장/성장은 변경하지 않는다.
local meadowClimateWorld=workspace:WaitForChild("FantasySurvivalWorld",15)
local meadowClimateChip=Instance.new("TextLabel")
meadowClimateChip.Name="MeadowClimateStatus"
meadowClimateChip.Position=UDim2.fromOffset(9,203)
meadowClimateChip.Size=UDim2.fromOffset(202,28)
meadowClimateChip.BackgroundColor3=Color3.fromRGB(20,44,46)
meadowClimateChip.BackgroundTransparency=1 -- 글씨만 표시
meadowClimateChip.BorderSizePixel=0
meadowClimateChip.TextColor3=Color3.fromRGB(243,249,235)
meadowClimateChip.TextSize=13
meadowClimateChip.Font=Enum.Font.GothamBold
meadowClimateChip.TextXAlignment=Enum.TextXAlignment.Center
meadowClimateChip.Text="초원 날씨 불러오는 중"
meadowClimateChip.Active=false
meadowClimateChip.ZIndex=8
meadowClimateChip.Parent=gui
local climateCorner=Instance.new("UICorner")
climateCorner.CornerRadius=UDim.new(0,8)
climateCorner.Parent=meadowClimateChip
local climatePeriodNames={DAWN="새벽",DAY="낮",DUSK="저녁",NIGHT="밤"}
local climateWeatherNames={CLEAR="맑음",RAIN="비",FOG="안개",SNOW="눈",STORM="폭풍"}
local climateEmitter=nil
local climateLightningUntil=0
local climateNextLightningAt=os.clock()+19
local climateElapsed=0

-- 기존 아바타의 루트에 Roblox 네이티브 파티클만 붙인다. 도형 파츠·새 에셋 불필요.
local function bindMeadowRain(character)
  if climateEmitter and climateEmitter.Parent then climateEmitter:Destroy() end
  climateEmitter=nil
  local rootPart=character:WaitForChild("HumanoidRootPart",12)
  if not rootPart or not rootPart.Parent then return end
  local anchor=Instance.new("Attachment")
  anchor.Name="MeadowRainOrigin"
  anchor.Position=Vector3.new(0,17,0)
  anchor.Parent=rootPart
  local drops=Instance.new("ParticleEmitter")
  drops.Name="MeadowNativeRain"
  drops.Enabled=false
  drops.Rate=nativeTouchEnabled and 55 or 85
  drops.Lifetime=NumberRange.new(.42,.68)
  drops.Speed=NumberRange.new(42,56)
  drops.Acceleration=Vector3.new(3,-12,0)
  drops.SpreadAngle=Vector2.new(27,27)
  drops.EmissionDirection=Enum.NormalId.Bottom
  drops.Size=NumberSequence.new(.10)
  drops.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,.38),
    NumberSequenceKeypoint.new(.8,.24),
    NumberSequenceKeypoint.new(1,1),
  })
  drops.Color=ColorSequence.new(Color3.fromRGB(179,213,234))
  drops.LightEmission=.12
  drops.LightInfluence=0
  drops.Parent=anchor
  climateEmitter=drops
end
if player.Character then task.defer(bindMeadowRain,player.Character) end
player.CharacterAdded:Connect(bindMeadowRain)
-- [숲 생명감] 원본 나무와 승인된 CC0 입자만 사용하고 근거리·개수 제한을 둔다.
local forestClimateRows={}
local function bindForestClimate(model)
  if not model:IsA("Model") or model:GetAttribute("MeadowScenery")~=true or forestClimateRows[model] then return end
  local row={pivot=model:GetPivot(),parts={},phase=model:GetPivot().Position.X*.13,lastWet=nil}
  for _,mesh in ipairs(model:GetDescendants())do
    if mesh:IsA("MeshPart") then row.parts[#row.parts+1]={mesh=mesh,reflectance=mesh.Reflectance,color=mesh.Color} end
  end
  local index=tonumber(model.Name:match("(%d+)$")) or 1
  local host=model:FindFirstChildWhichIsA("MeshPart",true)
  if host and index%8==0 then
    local anchor=Instance.new("Attachment");anchor.Name="ForestMagicSource";anchor.Parent=host
    local groundRay=RaycastParams.new();groundRay.FilterType=Enum.RaycastFilterType.Include;groundRay.FilterDescendantsInstances={workspace.Terrain}
    local pivot=model:GetPivot().Position
    local floor=workspace:Raycast(pivot+Vector3.new(0,30,0),Vector3.new(0,-90,0),groundRay)
    if floor then anchor.Position=host.CFrame:PointToObjectSpace(floor.Position+Vector3.new(0,.5,0))end
    local fireflies=Instance.new("ParticleEmitter");fireflies.Name="ForestFireflies"
    fireflies.Texture="rbxassetid://120799643869835";fireflies.Rate=0
    fireflies.Lifetime=NumberRange.new(1.8,3);fireflies.Speed=NumberRange.new(.2,.55)
    fireflies.Size=NumberSequence.new(.08);fireflies.LightEmission=.9
    fireflies.Color=ColorSequence.new(Color3.fromRGB(122,213,245),Color3.fromRGB(185,246,182))
    fireflies.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.25,.25),NumberSequenceKeypoint.new(.7,.3),NumberSequenceKeypoint.new(1,1)})
    fireflies.SpreadAngle=Vector2.new(180,180);fireflies.Parent=anchor
    local mist=Instance.new("ParticleEmitter");mist.Name="ForestGroundMist"
    mist.Texture="rbxassetid://71208441396858";mist.Rate=0;mist.Lifetime=NumberRange.new(3,5)
    mist.Speed=NumberRange.new(.08,.2);mist.Size=NumberSequence.new(3,5)
    mist.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.3,.94),NumberSequenceKeypoint.new(1,1)})
    mist.Color=ColorSequence.new(Color3.fromRGB(196,218,222));mist.SpreadAngle=Vector2.new(180,0);mist.Parent=anchor
    row.anchor=anchor;row.fireflies=fireflies;row.mist=mist
  end
  forestClimateRows[model]=row
end
if meadowClimateWorld then
  meadowClimateWorld.ChildAdded:Connect(function(model)task.defer(bindForestClimate,model)end)
  meadowClimateWorld.ChildRemoved:Connect(function(model)
    local row=forestClimateRows[model]
    if row and row.anchor then row.anchor:Destroy()end
    forestClimateRows[model]=nil
  end)
end
local function renderMeadowClimate()
  local v=gui.AbsoluteSize
  local short=v.Y>0 and v.Y<440
  -- 위치·크기는 지도 아래 줄(초원 마을 옆)에서 layoutMeadowRadar가 정한다.
  meadowClimateChip.Visible=gui:GetAttribute("GameMenuOpen")~=true
    and gui:GetAttribute("StoryJournalOpen")~=true
  if not meadowClimateWorld then return end
  local weather=meadowClimateWorld:GetAttribute("MeadowWeather") or "CLEAR"
  local period=meadowClimateWorld:GetAttribute("MeadowDayPhase") or "DAWN"
  local clock=meadowClimateWorld:GetAttribute("MeadowClockMinutes") or 315
  meadowClimateChip.Text=string.format("%s·%s %02d:%02d",
    climatePeriodNames[period] or "초원",climateWeatherNames[weather] or "맑음",
    math.floor(clock/60),clock%60)
  if climateEmitter then
    climateEmitter.Enabled=weather=="RAIN" or weather=="STORM" or weather=="SNOW"
    -- 한 에미터에서 실제 날씨에 맞춰 강수 모양·속도·밀도를 전환한다.
    if weather=="SNOW" then
      climateEmitter.Rate=nativeTouchEnabled and 22 or 38
      climateEmitter.Speed=NumberRange.new(5,9)
      climateEmitter.Lifetime=NumberRange.new(1.4,2.1)
      climateEmitter.Acceleration=Vector3.new(1,-2.5,0)
      climateEmitter.Size=NumberSequence.new(.22)
      climateEmitter.Color=ColorSequence.new(Color3.fromRGB(246,251,255))
    else
      climateEmitter.Rate=nativeTouchEnabled and 55 or 85
      climateEmitter.Speed=NumberRange.new(42,56)
      climateEmitter.Lifetime=NumberRange.new(.42,.68)
      climateEmitter.Acceleration=Vector3.new(3,-12,0)
      climateEmitter.Size=NumberSequence.new(.10)
      climateEmitter.Color=ColorSequence.new(Color3.fromRGB(179,213,234))
    end
  end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(renderMeadowClimate)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(renderMeadowClimate)
gui:GetAttributeChangedSignal("StoryJournalOpen"):Connect(renderMeadowClimate)
if meadowClimateWorld then
  for _,name in ipairs({"MeadowWeather","MeadowDayPhase","MeadowClockMinutes"}) do
    meadowClimateWorld:GetAttributeChangedSignal(name):Connect(renderMeadowClimate)
  end
end
renderMeadowClimate()
-- 기존 생존 대기·색보정 객체를 재활용하고 상태 변화는 부드럽게 보간한다.
game:GetService("RunService").Heartbeat:Connect(function(dt)
  climateElapsed+=dt
  if climateElapsed<.3 then return end
  climateElapsed=0
  if not meadowClimateWorld then return end
  local weather=meadowClimateWorld:GetAttribute("MeadowWeather") or "CLEAR"
  local period=meadowClimateWorld:GetAttribute("MeadowDayPhase") or "DAWN"
  if climateEmitter then climateEmitter.Enabled=weather=="RAIN" or weather=="STORM" or weather=="SNOW" end
  local atmosphere=verifiedLearningLighting:FindFirstChild("VerifiedLearningAtmosphere")
  local fog=weather=="FOG"
  local storm=weather=="STORM"
  local rainy=weather=="RAIN"
  local night=period=="NIGHT"
  local snow=weather=="SNOW"
  local targetDensity=fog and .40 or storm and .32 or rainy and .27 or snow and .25 or period=="DAWN" and .24 or .17
  local targetHaze=fog and 2.5 or storm and 1.65 or rainy and 1.35 or snow and 1.25 or .85
  if atmosphere and atmosphere:IsA("Atmosphere") then
    atmosphere.Density=atmosphere.Density+(targetDensity-atmosphere.Density)*.14
    atmosphere.Haze=atmosphere.Haze+(targetHaze-atmosphere.Haze)*.14
    atmosphere.Glare=atmosphere.Glare+((storm and .01 or .07)-atmosphere.Glare)*.14
  end
  local tint=night and Color3.fromRGB(176,193,207)
    or period=="DAWN" and Color3.fromRGB(220,211,191)
    or period=="DUSK" and Color3.fromRGB(228,200,178)
    or Color3.fromRGB(216,227,213)
  if storm then tint=tint:Lerp(Color3.fromRGB(180,195,206),.35)
  elseif rainy then tint=tint:Lerp(Color3.fromRGB(204,215,221),.20)
  elseif snow then tint=tint:Lerp(Color3.fromRGB(223,233,238),.25) end
  local now=os.clock()
  local camera=workspace.CurrentCamera
  local wet=rainy or storm
  local lights=0
  for _,model in ipairs(meadowClimateWorld:GetChildren())do bindForestClimate(model)end
  for model,row in pairs(forestClimateRows)do
    if model.Parent then
      local near=camera and (row.pivot.Position-camera.CFrame.Position).Magnitude<95
      if near then
        local amplitude=reducedEffects and .002 or storm and .013 or rainy and .008 or .004
        model:PivotTo(row.pivot*CFrame.Angles(math.sin(now*.8+row.phase)*amplitude,0,math.sin(now*.65+row.phase)*amplitude))
      end
      if row.lastWet~=wet then
        row.lastWet=wet
        for _,part in ipairs(row.parts)do
          if part.mesh.Parent then part.mesh.Reflectance=wet and .1 or part.reflectance;part.mesh.Color=wet and part.color:Lerp(Color3.new(0,0,0),.08) or part.color end
        end
      end
      if row.fireflies then
        local active=near and night and not storm and not rainy and lights<6
        row.fireflies.Rate=active and (reducedEffects and .5 or 1.4) or 0
        local morning=near and (period=="DAWN" or fog) and lights<6
        if row.mist then row.mist.Rate=morning and (reducedEffects and .12 or .3) or 0 end
        if active or morning then lights+=1 end
      end
    end
  end
  if storm and now>=climateNextLightningAt then
    climateLightningUntil=now+.18
    climateNextLightningAt=now+math.random(16,30)
  elseif not storm then
    climateNextLightningAt=now+19
    climateLightningUntil=0
  end
  verifiedLearningColorGrade.TintColor=verifiedLearningColorGrade.TintColor:Lerp(tint,.12)
  verifiedLearningColorGrade.Saturation=verifiedLearningColorGrade.Saturation
    +((fog and -.21 or storm and -.16 or -.06)-verifiedLearningColorGrade.Saturation)*.12
  local flash=storm and now<climateLightningUntil
  local brightness=flash and .34 or (night and -.035 or 0)
  verifiedLearningColorGrade.Brightness=verifiedLearningColorGrade.Brightness
    +(brightness-verifiedLearningColorGrade.Brightness)*(flash and .9 or .15)
end)


end

-- [짧은 인트로] 실제 시작 초원 위에 연구 일지의 첫 사건만 표시한다.
-- 이동·전투·카메라·저장에는 관여하지 않으며 입력 즉시 건너뛸 수 있다.
do
  local shown=false
  local lastBossModel=nil
  local sceneCamera,sceneType,sceneSubject,sceneTween=nil,nil,nil,nil
  local intro=nil
  local inputConnection=nil
  local function closeIntro()
    if sceneTween then sceneTween:Cancel();sceneTween=nil end
    if sceneCamera and sceneCamera:GetAttribute("MeadowBossScene")==true then
      sceneCamera.CameraType=sceneType
      if sceneSubject and sceneSubject.Parent then sceneCamera.CameraSubject=sceneSubject end
      sceneCamera:SetAttribute("MeadowBossScene",nil)
    end
    sceneCamera=nil
    if inputConnection then inputConnection:Disconnect();inputConnection=nil end
    if intro then intro:Destroy();intro=nil end
  end
  local function showIntro(boss)
    local bossScene=typeof(boss)=="table"
    if (shown and not bossScene) or player:GetAttribute("ProfileReady")~=true then return end
    if not bossScene then shown=true end
    closeIntro()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    intro=Instance.new("Frame");intro.Name="MeadowStoryIntro"
    intro.AnchorPoint=Vector2.new(.5,.5);intro.Position=UDim2.fromScale(.5,.43)
    intro.Size=UDim2.new(.76,0,0,146);intro.BackgroundColor3=Color3.fromRGB(12,29,27)
    intro.BackgroundTransparency=.13;intro.BorderSizePixel=0;intro.Active=false;intro.ZIndex=55;intro.Parent=gui
    local size=Instance.new("UISizeConstraint");size.MaxSize=Vector2.new(540,146);size.Parent=intro
    local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,14);corner.Parent=intro
    local heading=Instance.new("TextLabel");heading.BackgroundTransparency=1
    heading.Position=UDim2.fromOffset(16,12);heading.Size=UDim2.new(1,-32,0,26)
    heading.Font=Enum.Font.GothamBold;heading.TextSize=18;heading.TextColor3=Color3.fromRGB(245,229,181)
    heading.Text=bossScene and tostring(boss.name or "초원 수문장") or (Config.StoryRecords and Config.StoryRecords[1].Title or "마력숲 · 초원 탐사")
    heading.ZIndex=56;heading.Parent=intro
    local detail=Instance.new("TextLabel");detail.BackgroundTransparency=1
    detail.Position=UDim2.fromOffset(16,44);detail.Size=UDim2.new(1,-32,0,52)
    detail.Font=Enum.Font.GothamMedium;detail.TextSize=13;detail.TextWrapped=true
    detail.TextColor3=Color3.fromRGB(231,243,226)
    detail.Text=bossScene and "초원의 수문장이 깨어났다." or (Config.StoryRecords and Config.StoryRecords[1].Text or "초원의 단서를 따라 기사단 연대기를 모아 봐.")
    detail.ZIndex=56;detail.Parent=intro
    local skip=Instance.new("TextButton");skip.BackgroundTransparency=1
    skip.AnchorPoint=Vector2.new(1,1);skip.Position=UDim2.fromScale(1,1);skip.Size=UDim2.fromOffset(144,44)
    skip.Text="건너뛰기  ›";skip.TextSize=13;skip.Font=Enum.Font.GothamBold
    skip.TextColor3=Color3.fromRGB(170,221,190);skip.ZIndex=57;skip.Parent=intro
    skip.Activated:Connect(closeIntro)
    inputConnection=UserInputService.InputBegan:Connect(function(input,processed)
      if input.UserInputType==Enum.UserInputType.Touch or (not processed and (input.UserInputType==Enum.UserInputType.MouseButton1 or input.KeyCode==Enum.KeyCode.W
        or input.KeyCode==Enum.KeyCode.A or input.KeyCode==Enum.KeyCode.S or input.KeyCode==Enum.KeyCode.D
        or input.KeyCode==Enum.KeyCode.Space)) then closeIntro() end
    end)
    if bossScene then
      local model=boss.model
      local mesh=typeof(model)=="Instance" and model:IsDescendantOf(workspace) and model:FindFirstChildWhichIsA("MeshPart",true)
      local camera=workspace.CurrentCamera
      if mesh and camera and not reducedEffects then
        sceneCamera=camera;sceneType=camera.CameraType;sceneSubject=camera.CameraSubject
        camera:SetAttribute("MeadowBossScene",true);camera.CameraType=Enum.CameraType.Scriptable
        local focus=mesh.Position
        local eye=focus+Vector3.new(12,6,14)
        local ray=RaycastParams.new();ray.FilterType=Enum.RaycastFilterType.Exclude;ray.FilterDescendantsInstances={model,player.Character}
        local wall=workspace:Raycast(focus,eye-focus,ray)
        if wall then eye=wall.Position+(focus-wall.Position).Unit*1.5 end
        sceneTween=game:GetService("TweenService"):Create(camera,TweenInfo.new(.3),{CFrame=CFrame.lookAt(eye,focus)})
        sceneTween:Play()
      end
    end
    local current=intro
    task.delay(bossScene and 1.5 or 2.5,function()if intro==current then closeIntro()end end)
  end
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind=="MEADOW_BOSS_INTRO" and typeof(payload)=="table"
      and typeof(payload.model)=="Instance" and payload.model~=lastBossModel then
      lastBossModel=payload.model;showIntro(payload)
    end
  end)
  player.CharacterAdded:Connect(closeIntro)
  player:GetAttributeChangedSignal("Health"):Connect(function()if sceneCamera then closeIntro()end end)
  player:GetAttributeChangedSignal("ProfileReady"):Connect(showIntro)
  gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()if gui:GetAttribute("GameMenuOpen")==true then closeIntro()end end)
  task.defer(showIntro)
end

-- [모바일 전체 화면 입력] 게임 월드 탭은 공격, 주민·의뢰판·단서 탭은 원본 대화 프롬프트를 사용한다.
-- 메뉴·대화 선택지·조이스틱·오른쪽 기술 버튼을 누른 터치는 공격으로 바꾸지 않는다.
local shownMeadowPrompts={}
local lastMeadowWorldTap=0
local function activateNearbyMeadowInteraction(screenPosition)
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  local camera=workspace.CurrentCamera
  if not rootPart then return false end
  local target,bestDistance=nil,math.huge
  for prompt in pairs(shownMeadowPrompts) do
    local host=prompt.Parent
    if (prompt.Name=="MeadowVillageInteraction" or prompt.Name=="MeadowSurvivalInspect"
      or prompt.Name=="GatherPrompt") and prompt.Enabled
      and host and host:IsA("BasePart") and prompt:IsDescendantOf(workspace) then
      local distance=(host.Position-rootPart.Position).Magnitude
      if distance<=prompt.MaxActivationDistance+(prompt.Name=="GatherPrompt" and 3 or 0) and distance<18 then
        local score=distance
        if screenPosition then
          if not camera then continue end
          local projected,visible=camera:WorldToViewportPoint(host.Position)
          if not visible or projected.Z<=0 then continue end
          local offset=(Vector2.new(projected.X,projected.Y)-screenPosition).Magnitude
          -- 나무·바위는 크고 중심점이 몸통 안쪽이라 화면에서 대충 눌러도 되게 허용 범위를 넓힌다.
          local tolerance=prompt.Name=="GatherPrompt" and 190 or 65
          if offset>tolerance then continue end
          score=offset+distance*.5
        end
        if score<bestDistance then target,bestDistance=prompt,score end
      end
    end
  end
  if not target then return false end
  -- [기존 상호작용] 임의의 클라이언트 대화/보상 없이 서버 ProximityPrompt.Triggered를 그대로 사용한다.
  target:InputHoldBegin()
  task.delay(math.max(.05,target.HoldDuration)+.08,function()
    if target.Parent then target:InputHoldEnd() end
  end)
  return true
end
local function isMeadowWorldTapBlocked(point)
  if gui.Enabled~=true or gui:GetAttribute("GameMenuOpen")==true then return true end
  local dialogue=gui:FindFirstChild("MeadowVillageDialogue")
  if dialogue and dialogue.Visible then return true end
  for _,control in ipairs(player.PlayerGui:GetGuiObjectsAtPosition(point.X,point.Y)) do
    if control:FindFirstAncestor("TouchGui") or control:IsA("GuiButton")
      or control:IsA("TextBox") or control:FindFirstAncestor("MeadowStoryIntro") then
      return true
    end
  end
  return false
end
local function activateMeadowWorldTap(point)
  if typeof(point)~="Vector2" or isMeadowWorldTapBlocked(point) then return end
  local now=os.clock()
  if now-lastMeadowWorldTap<.13 then return end
  lastMeadowWorldTap=now
  if activateNearbyMeadowInteraction(point) then return end
  -- [탭 조준] 화면에서 적을 직접 누르면 그 적을 향해 몸을 돌린 뒤 공격한다.
  pcall(function()
    local camera=workspace.CurrentCamera
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not camera or not root then return end
    local ray=camera:ViewportPointToRay(point.X,point.Y)
    local params=RaycastParams.new();params.FilterDescendantsInstances={player.Character}
    params.FilterType=Enum.RaycastFilterType.Exclude
    local hit=workspace:Raycast(ray.Origin,ray.Direction*120,params)
    local model=hit and hit.Instance:FindFirstAncestorOfClass("Model")
    if model and model:GetAttribute("EnemyHealth") then
      local pivot=model:GetPivot().Position
      if (pivot-root.Position).Magnitude<=28 then
        local flat=Vector3.new(pivot.X,root.Position.Y,pivot.Z)
        root.CFrame=CFrame.lookAt(root.Position,flat)
      end
    end
  end)
  if primaryCombatAction and activateMeadowAction(primaryCombatAction.Id) then
    meadowAttackAttemptAt=os.clock()
  end
end
-- 원본 월드 탭은 유지하고, 투명 HUD가 입력을 처리한 경우 TouchTap으로 정상 공격을 복구한다.
UserInputService.TouchTapInWorld:Connect(function(position,processedByUI)
  if processedByUI or gui:GetAttribute("GameMenuOpen")==true then return end
  -- 공식 이벤트는 배열이 아닌 단일 Vector2를 전달한다.
  activateMeadowWorldTap(position)
end)
UserInputService.TouchTap:Connect(function(positions)
  -- 전체 화면 터치 이벤트만 Vector2 배열이며, 실제 UI/조이스틱은 기존 필터가 제외한다.
  if positions and #positions==1 then activateMeadowWorldTap(positions[1]) end
end)
UserInputService.InputBegan:Connect(function(input,processed)
  if processed or UserInputService.TouchEnabled or gui:GetAttribute("GameMenuOpen")==true then return end
  if input.UserInputType==Enum.UserInputType.MouseButton1 then
    activateMeadowWorldTap(Vector2.new(input.Position.X,input.Position.Y))
  end
end)

-- [전투 UI] 상단 네 버튼: 연타 주먹·발 회피·막기·회복 물약. 기존 서버 액션을 그대로 사용한다.
-- 하단 상호작용·질주·가방은 고정하고, 상단 네 버튼만 옵션에서 위치를 조정한다.
local meadowSkillDock=Instance.new("Frame")
meadowSkillDock.Name="MeadowR15SkillDock"
meadowSkillDock.BackgroundTransparency=1
meadowSkillDock.ZIndex=35 -- [오른쪽 버튼] 일반 HUD 위에 실동작 터치 버튼을 배치.
meadowSkillDock.AnchorPoint=Vector2.new(1,1)
meadowSkillDock.Parent=player.PlayerGui:FindFirstChild("MeadowTouchLayer") or gui
-- 외부 CC0 등록 아틀라스의 실제 의미가 맞는 아이콘만 매칭한다.
local meleeSkills={
  {"meadow-unarmed-rush","연타",Color3.fromRGB(125,105,218),nil,"fist"},
  {"skill-meadow-dodge-left","회피",Color3.fromRGB(246,179,73),nil,"dodge"},
  {"skill-meadow-guard","막기",Color3.fromRGB(71,160,246),nil,"guard"},
  {"skill-meadow-heal","물약",Color3.fromRGB(224,85,94),nil,"potion"},
}
-- 네 위치는 기존 세이브의 별도 UI 문자열에만 보존한다. 전투·재화 값에는 영향이 없다.
-- [기본 삼각 편대] 연타·막기 원형의 하단을 작은 물약 원형의 하단과 정확히 일치시킨다.
-- 회피·물약 및 하단 상호작용·질주·가방은 기존 위치를 유지한다.
local alignedCombatY=.395-(74-46)/(2*260)
local meadowTopDefaults={{.160,alignedCombatY},{.500,.120},{.840,alignedCombatY},{.500,.395}}
local meadowTopPositions={}
for index,p in ipairs(meadowTopDefaults) do meadowTopPositions[index]={p[1],p[2]} end
local alignMeadowRadar
local function readMeadowTopLayout(value)
  if typeof(value)~="string" or #value>40 or not value:match("^%d+,%d+,%d+,%d+,%d+,%d+,%d+,%d+$") then return false end
  -- [기존 UI 저장 보존] 이전 기본 배치를 저장한 사용자는 새 기본 배치로만 옮기고,
  -- 사용자가 직접 변경한 버튼 위치와 저장 키는 그대로 유지한다.
  if value=="235,275,500,120,800,275,500,510"
    or value=="200,300,500,300,800,300,500,550"
    or value=="160,540,500,120,840,540,500,395" then
    for index,p in ipairs(meadowTopDefaults) do meadowTopPositions[index]={p[1],p[2]} end
    return true
  end
  local values={}
  for digit in value:gmatch("%d+") do values[#values+1]=tonumber(digit) end
  if #values~=8 then return false end
  for index=1,4 do
    local x,y=values[index*2-1],values[index*2]
    if x<120 or x>880 or y<100 or y>550 then return false end
  end
  -- [버튼 겹침 방지] 이전 저장 위치가 중첩되어 다른 버튼을 가리지 않도록 기본 배치를 사용한다.
  for index=1,3 do
    for other=index+1,4 do
      local dx=(values[index*2-1]-values[other*2-1])*235/1000
      local dy=(values[index*2]-values[other*2])*260/1000
      local minDistance=37+(other==4 and 23 or 37)+8
      if dx*dx+dy*dy<minDistance*minDistance then return false end
    end
  end
  for index=1,4 do meadowTopPositions[index]={values[index*2-1]/1000,values[index*2]/1000} end
  return true
end
readMeadowTopLayout(player:GetAttribute("MeadowTopButtonsLayout"))
local meadowSkillButtons={}
local meadowSkillCooldowns={}
-- [스킬 원형 테마] 처음 시안의 금빛 원형 테두리·검정 청동 배경을 기존 버튼에 직접 적용한다.
local function styleMeadowCombatButton(button,color)
  button.BackgroundColor3=Color3.fromRGB(24,25,23)
  button.TextColor3=Color3.fromRGB(255,242,207)
  button.BorderSizePixel=0
  button.AutoButtonColor=true
  button.Font=Enum.Font.GothamBold
  button.TextWrapped=true
  button.ZIndex=14
  button.Active=true;button.Interactable=true -- [모바일 입력] 실제 버튼만 터치를 처리한다.
  local aspect=Instance.new("UIAspectRatioConstraint")
  aspect.AspectRatio=1
  aspect.AspectType=Enum.AspectType.FitWithinMaxSize
  aspect.Parent=button
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(1,0);corner.Parent=button
  local border=Instance.new("UIStroke")
  border.Name="GoldSkillRim"
  border.Color=color
  border.Thickness=3.2;border.Transparency=.02;border.Parent=button
  -- [광택 금속 이중 링] 이미지가 아니라 실제 버튼 형태의 테두리만 강화한다.
  local inner=Instance.new("Frame")
  inner.Name="PolishedInnerRing"
  inner.AnchorPoint=Vector2.new(.5,.5)
  inner.Position=UDim2.fromScale(.5,.5)
  inner.Size=UDim2.fromScale(.89,.89)
  inner.BackgroundTransparency=1
  inner.ZIndex=15
  inner.Parent=button
  local innerCorner=Instance.new("UICorner")
  innerCorner.CornerRadius=UDim.new(1,0);innerCorner.Parent=inner
  local innerStroke=Instance.new("UIStroke")
  innerStroke.Color=Color3.fromRGB(255,235,202)
  innerStroke.Thickness=1.4
  innerStroke.Transparency=.41
  innerStroke.Parent=inner
  local gradient=Instance.new("UIGradient")
  gradient.Rotation=110
  gradient.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,color:Lerp(Color3.fromRGB(255,218,165),.22)),
    ColorSequenceKeypoint.new(.32,color:Lerp(Color3.fromRGB(21,32,38),.65)),
    ColorSequenceKeypoint.new(1,Color3.fromRGB(6,14,23))
  })
  gradient.Parent=button
end
-- [오른쪽 전용 그림 아이콘] 연타·회피·막기·상호작용·질주는 승인된 전용 그림으로 교체한다.
-- 물약과 가방은 현재 등록된 개별 CC0 이미지를 그대로 사용하고, 서버 액션 바인딩은 유지한다.
local function applyMeadowRightActionImage(button,role)
  local paintedCell=({sprint=Vector2.new(200,600),fist=Vector2.new(400,600),dodge=Vector2.new(600,600),jump=Vector2.new(800,600),guard=Vector2.new(200,800)})[role]
  local atlasX=({sprint=160,fist=40,dodge=120,interact=200,bag=240})[role] -- 막기는 승인된 512px 원본 사용
  local imageId=paintedCell and meadowPaintedHudAtlas or atlasX and "rbxassetid://81665484719308" or meadowRealActionIcons[role]
  if not imageId then return false end
  local icon=Instance.new("ImageLabel")
  icon.Name="OriginalRightActionIcon"
  icon.BackgroundTransparency=1
  icon.Image=imageId
  if paintedCell then
    icon.ImageRectOffset=paintedCell
    icon.ImageRectSize=Vector2.new(200,200)
  elseif atlasX then
    icon.ImageRectOffset=Vector2.new(atlasX,0)
    icon.ImageRectSize=Vector2.new(40,40)
  end
  icon.ScaleType=Enum.ScaleType.Fit
  icon.AnchorPoint=Vector2.new(.5,.5)
  icon.Position=UDim2.fromScale(.5,.5)
  icon.Size=UDim2.fromScale(1,1)
  icon.ZIndex=20
  icon.Active=false;icon.Interactable=false
  icon.Parent=button
  if paintedCell then
    -- [원화 테두리] 원형 동판/광택 테두리는 21종 이미지 자체에 있어 별도 테두리와 겹치지 않는다.
    button.BackgroundTransparency=1
    local rim=button:FindFirstChild("GoldSkillRim")
    if rim then rim.Enabled=false end
    local inner=button:FindFirstChild("PolishedInnerRing")
    if inner then inner.Visible=false end
    task.delay(25,function()
      if not icon.Parent or icon.IsLoaded then return end
      if role=="jump" then
        icon.Visible=false
        button.Text="↑"
        button.TextSize=28
      else
        -- [전투 아이콘] 해당 역할의 승인된 개별 원본을 사용한다.
        icon.ImageRectOffset=Vector2.zero
        icon.ImageRectSize=Vector2.zero
        icon.Image=meadowRealActionIcons[role]
      end
    end)
  end
  return true
end
-- [시안 이름표] 어두운 화면에서도 스킬명이 가려지지 않도록 버튼 아래 별도 검정·금색 이름표를 둔다.
local meadowSkillNameplates={}
for index,skill in ipairs(meleeSkills)do
  local button=Instance.new("TextButton")
  button.Name="R15Skill"..index
  button.Text=""
  styleMeadowCombatButton(button,skill[3])
  button.Parent=meadowSkillDock
  if meadowIconAtlas~="" and skill[4]~=nil then
    local icon=Instance.new("ImageLabel")
    icon.Name="CC0SkillIcon"
    icon.Image=meadowIconAtlas
    icon.ImageRectOffset=Vector2.new(skill[4]*64,0)
    icon.ImageRectSize=Vector2.new(64,64)
    icon.BackgroundTransparency=1
    icon.AnchorPoint=Vector2.new(.5,0)
    icon.Position=UDim2.fromScale(.5,.07)
    icon.Size=UDim2.fromScale(.78,.73)
    icon.ScaleType=Enum.ScaleType.Fit
    icon.ZIndex=16
    icon.ImageColor3=index==2 and Color3.fromRGB(255,225,188) or Color3.fromRGB(213,235,255)
    icon.Parent=button
    -- 어퍼컷은 CC0 장갑 원본, 막기는 CC0 방패 원본을 사용한다.
  end
  -- 전투 3종은 전용 아틀라스, 회복은 기존 붉은 물약 이미지를 사용한다.
  applyMeadowRightActionImage(button,skill[5])
  local nameplate=Instance.new("TextLabel")
  nameplate.Name="SkillNameplate"..index
  nameplate.BackgroundColor3=Color3.fromRGB(18,17,15)
  nameplate.BackgroundTransparency=.11
  nameplate.BorderSizePixel=0
  nameplate.Text=skill[2]
  nameplate.TextColor3=Color3.fromRGB(255,237,188)
  nameplate.TextStrokeColor3=Color3.fromRGB(15,11,8)
  nameplate.TextStrokeTransparency=.55
  nameplate.Font=Enum.Font.GothamBold
  nameplate.TextSize=13;nameplate.ZIndex=17
  nameplate.Active=false;nameplate.Interactable=false
  nameplate.Visible=true
  nameplate.Parent=meadowSkillDock
  local plateCorner=Instance.new("UICorner")
  plateCorner.CornerRadius=UDim.new(1,0);plateCorner.Parent=nameplate
  local plateStroke=Instance.new("UIStroke")
  plateStroke.Color=skill[3]
  plateStroke.Thickness=1.4;plateStroke.Parent=nameplate
  meadowSkillNameplates[index]=nameplate
  local cooldown=Instance.new("TextLabel")
  cooldown.Name="Cooldown"
  cooldown.Size=UDim2.fromScale(1,1)
  cooldown.BackgroundColor3=Color3.fromRGB(5,10,16)
  cooldown.BackgroundTransparency=.35
  cooldown.TextColor3=Color3.fromRGB(255,242,197)
  cooldown.Font=Enum.Font.GothamBold
  cooldown.TextSize=17
  cooldown.Visible=false
  cooldown.ZIndex=22;cooldown.Active=false;cooldown.Interactable=false -- 스킬 표시가 터치를 가리지 않는다.
  cooldown.Parent=button
  local cooldownCorner=Instance.new("UICorner")
  cooldownCorner.CornerRadius=UDim.new(1,0)
  cooldownCorner.Parent=cooldown
  meadowSkillButtons[index]=button
  meadowSkillCooldowns[index]=cooldown
  -- 1번 버튼은 스킬 페이지에서 등록한 퀵슬롯이다.
  local skillActionId=skill[1] -- [오른쪽 터치] 각 버튼의 서버 기술 ID를 자기 입력에 고정한다.
  button.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    local submitted=activateMeadowAction(index==1 and (meadowActionButtons.quickSkillId or skillActionId) or skillActionId)
    if index==2 and submitted then meadowDodgeAttemptAt=os.clock() end
  end)
end
-- [퀵슬롯 등록] 스킬 페이지에서 고른 기술을 1번 전투 버튼에 연결한다. 서버 기술 ID·쿨다운은 그대로 사용한다.
meadowActionButtons.setQuickSkill=function(id,cell,label,category)
  meadowActionButtons.quickSkillId=id
  local quick=meadowSkillButtons[1]
  if not quick then return end
  local fist=quick:FindFirstChild("OriginalRightActionIcon")
  if fist then fist.Visible=false end
  quick.BackgroundTransparency=0
  local rim=quick:FindFirstChild("GoldSkillRim")
  if rim then rim.Enabled=true end
  local inner=quick:FindFirstChild("PolishedInnerRing")
  if inner then inner.Visible=true end
  local icon=quick:FindFirstChild("QuickSkillIcon")
  if not icon then
    icon=Instance.new("ImageLabel");icon.Name="QuickSkillIcon";icon.BackgroundTransparency=1
    icon.AnchorPoint=Vector2.new(.5,.5);icon.Position=UDim2.fromScale(.5,.5);icon.Size=UDim2.fromScale(.66,.66)
    icon.Image=meadowIconAtlas;icon.ImageRectSize=Vector2.new(64,64);icon.ZIndex=20
    icon.Active=false;icon.Interactable=false;icon.Parent=quick
  end
  icon.Image=meadowIconAtlas;icon.ImageRectSize=Vector2.new(64,64)
  icon.ImageRectOffset=Vector2.new((cell or 2)*64,0)
  if id then meadowArt.skill(icon,id) end -- 스킬 시트의 전용 아이콘을 우선 사용
  icon.Visible=id~=nil
  quick.BackgroundColor3=Color3.fromRGB(30,31,29)
  gui:SetAttribute("MeadowQuickRevision",(gui:GetAttribute("MeadowQuickRevision") or 0)+1)
end
-- 기본 공격은 기존 화면 터치/키보드로 계속 사용하고 별도 공격 버튼은 제거한다.
-- [오른쪽 보조 버튼] 기존 회피·질주·채집과 인벤토리 탭을 시안의 4개 원형 버튼에 연결.
local meadowUtilityActions={
  {"scope-coreloop-1-6ebe58f496","상호작용",Color3.fromRGB(216,216,200),"",nil,nil,"interact"},
  {"skill-meadow-sprint","질주",Color3.fromRGB(58,173,230),"",nil,nil,"sprint"},
  {"MEADOW_INVENTORY","가방",Color3.fromRGB(219,184,124),"",nil,nil,"bag"},
}
local meadowSprintAuto=false
local meadowUtilityButtons={}
for index,info in ipairs(meadowUtilityActions)do
  local button=Instance.new("TextButton")
  button.Name="MeadowUtility"..index
  button.Text=info[4]
  button.TextSize=25
  button.TextYAlignment=Enum.TextYAlignment.Top
  styleMeadowCombatButton(button,info[3])
  button.Parent=meadowSkillDock
  if info[5] and meadowIconAtlas~="" then
    local icon=Instance.new("ImageLabel")
    icon.Name="CC0UtilityIcon"
    icon.Image=meadowIconAtlas
    icon.ImageRectOffset=Vector2.new(info[5]*64,0)
    icon.ImageRectSize=Vector2.new(64,64)
    icon.BackgroundTransparency=1
    icon.Position=UDim2.fromScale(.16,.12)
    icon.Size=UDim2.fromScale(.68,.68)
    icon.ZIndex=15;icon.Parent=button
  end
  applyMeadowRightActionImage(button,info[7])
  -- [이름표] 작은 하단 버튼에서도 조작 종류가 읽히도록 버튼 안에 표기.
  local label=Instance.new("TextLabel")
  label.Name="UtilityCaption"
  label.AnchorPoint=Vector2.new(.5,1)
  label.Position=UDim2.fromScale(.5,.96)
  label.Size=UDim2.new(1,-2,0,13)
  label.BackgroundTransparency=1
  label.Text=info[2]
  label.Visible=false -- [시안] 오른쪽 원형 터치 아이콘에는 중복 글자를 겹치지 않는다.
  label.TextColor3=Color3.fromRGB(255,245,222)
  label.TextStrokeColor3=Color3.fromRGB(5,8,13)
  label.TextStrokeTransparency=.25
  label.Font=Enum.Font.GothamBold
  label.TextScaled=true
  label.ZIndex=23
  label.Active=false;label.Interactable=false
  label.Parent=button
  button.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    if info[1]=="MEADOW_INVENTORY" then meadowMenu.open(2)
    elseif info[1]=="skill-meadow-sprint" then meadowSprintAuto=not meadowSprintAuto
    elseif info[1]=="scope-coreloop-1-6ebe58f496" then
      meadowInteractionAttemptAt=os.clock()
      if not activateNearbyMeadowInteraction(nil) then
        activateMeadowAction(info[1]) -- 채집 성공 시 서버가 갱신한 자원 속성으로만 다음 단계
      end
    else activateMeadowAction(info[1]) end
  end)
  meadowUtilityButtons[index]=button
end
do
-- [시안 주 공격] 검 모양 버튼도 기존 기본 공격 ID만 전달한다. 새 피해·쿨다운 없음.
local meadowPrimarySword=Instance.new("TextButton")
meadowPrimarySword.Name="ReferencePrimarySword"
meadowPrimarySword.Text=""
styleMeadowCombatButton(meadowPrimarySword,Color3.fromRGB(207,181,112))
meadowPrimarySword.Parent=meadowSkillDock
meadowSkillButtons.primarySword=meadowPrimarySword
local swordIcon=Instance.new("ImageLabel")
swordIcon.Name="ReferenceSwordIcon"
swordIcon.BackgroundTransparency=1
swordIcon.Image=meadowPaintedHudAtlas
swordIcon.ImageRectOffset=Vector2.new(0,800)
swordIcon.ImageRectSize=Vector2.new(200,200)
swordIcon.Position=UDim2.fromScale(0,0)
swordIcon.Size=UDim2.fromScale(1,1)
swordIcon.ZIndex=20
swordIcon.Parent=meadowPrimarySword
-- [원화 검] 원화에 포함된 원형 청동 링을 별도의 원형 테두리로 다시 그리지 않는다.
meadowPrimarySword.BackgroundTransparency=1
local swordRim=meadowPrimarySword:FindFirstChild("GoldSkillRim")
if swordRim then swordRim.Enabled=false end
local swordInner=meadowPrimarySword:FindFirstChild("PolishedInnerRing")
if swordInner then swordInner.Visible=false end
task.delay(25,function()
  if not swordIcon.Parent or swordIcon.IsLoaded then return end
  swordIcon.ImageRectOffset=Vector2.zero
  swordIcon.ImageRectSize=Vector2.new(40,40)
  swordIcon.Image="rbxassetid://71333073665947"
end)
meadowPrimarySword.Activated:Connect(function()
  if gui:GetAttribute("GameMenuOpen")~=true and primaryCombatAction then
    if activateMeadowAction(primaryCombatAction.Id) then meadowAttackAttemptAt=os.clock() end
  end
end)
-- [시안 점프] Roblox 기존 Humanoid 점프만 실행하고 기본 조이스틱은 유지.
local meadowReferenceJump=Instance.new("TextButton")
meadowReferenceJump.Name="ReferenceJump"
meadowReferenceJump.Text=""
meadowReferenceJump.TextSize=27
styleMeadowCombatButton(meadowReferenceJump,Color3.fromRGB(130,143,159))
meadowReferenceJump.Parent=meadowSkillDock
applyMeadowRightActionImage(meadowReferenceJump,"jump")
meadowSkillButtons.referenceJump=meadowReferenceJump
meadowReferenceJump.Activated:Connect(function()
  if gui:GetAttribute("GameMenuOpen")==true then return end
  local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  if human and human.Health>0 then human.Jump=true end
end)
end -- [기존 버튼 테이블] 아이콘 객체 생성 지역변수는 이 블록에서 정리.
-- [오른쪽 터치 UI] 기존 전투·회피·방어·회복은 버튼 객체와 실제 원격 명령을 유지한다.
local function layoutMeadowCombatUi()
  local touchLayer=player.PlayerGui:FindFirstChild("MeadowTouchLayer")
  local v=(touchLayer or gui).AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local landscape=v.X>v.Y
  -- [모바일 큰 버튼] 이전보다 약 1.3배, 버튼 사이 간격을 넓히고 가장자리 여유를 둔다.
  local scale=(landscape and math.clamp((v.Y-20)/370,.76,1.12)*1.3 or math.clamp(v.X/390,.76,1)*1.1)
  local offset=landscape and 14 or 104 -- [세로화면] Roblox 이동 조이스틱·기본 하단 공간.
  meadowSkillDock.Size=UDim2.fromOffset(math.floor(212*scale),math.floor(216*scale))
  meadowSkillDock.Position=UDim2.new(1,-math.floor(14*scale),1,-math.floor(offset*(landscape and 1 or scale)))
  -- [시안 참고] 오른쪽 큰 검 / 위쪽 마력·질주 / 좌측 회피 / 아래 점프.
  local positions={
    {66,165,44}, -- 퀵슬롯: 스킬 페이지에서 등록한 기술(등록 전에는 숨김)
    {110,165,54}, -- 회피: 검 바로 왼쪽(크게)
    {126,108,54}, -- 막기: 검 왼쪽 위(크게)
    {40,72,36}, -- 물약은 기존 단축바 5번
  }
  for index,button in ipairs(meadowSkillButtons) do
    local row=positions[index]
    local size=math.max(46,math.floor(row[3]*scale))
    local saved=meadowTopPositions[index]
    local default=meadowTopDefaults[index]
    -- [저장 보존] 기존 사용자 버튼 이동량을 시안 기본 위치에 이어서 적용한다.
    local visualX=row[1]+(saved[1]-default[1])*212
    local visualY=row[2]+(saved[2]-default[2])*216
    button.Size=UDim2.fromOffset(size,size)
    button.Position=UDim2.fromOffset(math.floor(visualX*scale-size*.5),
      math.floor(visualY*scale-size*.5))
    -- [시안 오른쪽] 검·기술·회피·질주·점프 5개만 표시.
    -- 숨긴 막기와 회복은 8·5번 단축바에 그대로 연결한다.
    button.Visible=index==2 or index==3 or (index==1 and meadowActionButtons.quickSkillId~=nil)
    local plate=meadowSkillNameplates[index]
    plate.Visible=false -- 원형 전투 아이콘만 유지해 참고 화면과 동일한 밀도로 표시.
    plate.Size=UDim2.fromOffset(0,0)
  end
  for index,button in ipairs(meadowUtilityButtons)do
    -- 보조 채집·가방은 하단 단축창에서도 접근할 수 있어 화면 오른쪽 중복 표시만 정리.
    button.Visible=index==2
    if index==2 then
      local size=math.max(42,math.floor(36*scale))
      button.Size=UDim2.fromOffset(size,size)
      -- 질주: 검 바로 위. 세 보조 버튼은 검 중심에서 같은 거리의 부채꼴로 배치한다.
      button.Position=UDim2.fromOffset(math.floor(182*scale-size*.5),math.floor(94*scale-size*.5))
    end
  end
  local swordSize=math.max(60,math.floor(66*scale))
  meadowSkillButtons.primarySword.Size=UDim2.fromOffset(swordSize,swordSize)
  meadowSkillButtons.primarySword.Position=UDim2.fromOffset(math.floor(146*scale),math.floor(132*scale))
  local jumpSize=math.max(54,math.floor(54*scale))
  meadowSkillButtons.referenceJump.Visible=false -- [요청] 점프 버튼 제거
  meadowSkillButtons.referenceJump.Size=UDim2.fromOffset(jumpSize,jumpSize)
  meadowSkillButtons.referenceJump.Position=UDim2.fromOffset(math.floor(30*scale),meadowSkillDock.Size.Y.Offset-jumpSize-math.floor(6*scale))
  -- [기존 점프 이중 터치 방지] 공식 모바일 JumpButton만 숨기고 실제 점프 기능은 위 버튼에 연결.
  if UserInputService.TouchEnabled then
    local touchGui=player.PlayerGui:FindFirstChild("TouchGui")
    local jump=touchGui and touchGui:FindFirstChild("JumpButton",true)
    if jump and jump:IsA("GuiButton") then
      jump.Visible=false
      jump.Active=false
      if jump:GetAttribute("MeadowJumpHidden")~=true then
        jump:SetAttribute("MeadowJumpHidden",true)
        jump:GetPropertyChangedSignal("Visible"):Connect(function()
          if jump.Visible then jump.Visible=false end
        end)
      end
    end
  end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowCombatUi)
gui:GetAttributeChangedSignal("MeadowQuickRevision"):Connect(layoutMeadowCombatUi)
do
  local layer=player.PlayerGui:FindFirstChild("MeadowTouchLayer")
  if layer then layer:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowCombatUi) end
end
-- 기본 모바일 JumpButton은 늦게 생기거나 리스폰 시 재생성되므로 해당 버튼만 숨긴다.
player.PlayerGui.DescendantAdded:Connect(function(descendant)
  if UserInputService.TouchEnabled and descendant.Name=="JumpButton" and descendant:IsA("GuiButton") then
    task.defer(layoutMeadowCombatUi)
  end
end)
layoutMeadowCombatUi()
-- [옵션] 상단 4개 버튼만 터치/마우스로 개별 이동한다. 하단 3개는 고정.
local editLayoutButton=CommonUI.CreatePrimaryButton({
  name="MeadowEditActionLayout",text="상단 4개 버튼 위치 변경",minHeight=52
})
editLayoutButton.LayoutOrder=5
editLayoutButton.Size=UDim2.new(1,-8,0,52)
editLayoutButton.Parent=meadowPages[4]
local editLayoutPreview=Instance.new("Frame")
editLayoutPreview.Name="MeadowTopActionPreview"
editLayoutPreview.LayoutOrder=6
editLayoutPreview.Size=UDim2.new(1,-8,0,220)
editLayoutPreview.BackgroundColor3=Color3.fromRGB(24,36,34)
editLayoutPreview.BorderSizePixel=0
editLayoutPreview.Visible=false
editLayoutPreview.Parent=meadowPages[4]
local previewCorner=Instance.new("UICorner")
previewCorner.CornerRadius=UDim.new(0,12)
previewCorner.Parent=editLayoutPreview
local previewHint=Instance.new("TextLabel")
previewHint.Name="EditorInstructions"
previewHint.BackgroundTransparency=1
previewHint.Size=UDim2.new(1,-12,0,28)
previewHint.Position=UDim2.fromOffset(6,3)
previewHint.Font=Enum.Font.Gotham
previewHint.TextColor3=Color3.fromRGB(228,237,219)
previewHint.TextSize=12
previewHint.Text="네 버튼을 누른 채 이동 · 아래 3개는 고정"
previewHint.Parent=editLayoutPreview
local previewCanvas=Instance.new("Frame")
previewCanvas.Name="EditableTopFour"
previewCanvas.BackgroundTransparency=1
previewCanvas.Position=UDim2.new(0,6,0,33)
previewCanvas.Size=UDim2.new(1,-12,1,-39)
previewCanvas.Parent=editLayoutPreview
local previewHandles={}
local function refreshTopEditor()
  for index,button in ipairs(previewHandles) do
    local p=meadowTopPositions[index]
    button.Position=UDim2.fromScale(p[1],p[2]/.66)
  end
  layoutMeadowCombatUi()
  if alignMeadowRadar then alignMeadowRadar() end
end
local activeDrag=nil
local dragInput=nil
for index,skill in ipairs(meleeSkills) do
  local handle=Instance.new("TextButton")
  handle.Name="EditableButton"..index
  handle.AnchorPoint=Vector2.new(.5,.5)
  handle.Size=UDim2.fromOffset(index==4 and 47 or 60,index==4 and 47 or 60)
  handle.BackgroundColor3=Color3.fromRGB(32,46,47)
  handle.Text=skill[2]
  handle.Font=Enum.Font.GothamBold
  handle.TextSize=12
  handle.TextColor3=Color3.fromRGB(247,246,231)
  handle.ZIndex=6
  handle.Parent=previewCanvas
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(1,0)
  corner.Parent=handle
  local border=Instance.new("UIStroke")
  border.Color=skill[3]
  border.Thickness=2
  border.Parent=handle
  previewHandles[index]=handle
  handle.InputBegan:Connect(function(input)
    if not editLayoutPreview.Visible then return end
    if input.UserInputType~=Enum.UserInputType.Touch
      and input.UserInputType~=Enum.UserInputType.MouseButton1 then return end
    activeDrag=index
    dragInput=input
    meadowPages[4].ScrollingEnabled=false
  end)
end
UserInputService.InputChanged:Connect(function(input)
  if not activeDrag or not editLayoutPreview.Visible then return end
  if dragInput.UserInputType==Enum.UserInputType.Touch and input~=dragInput then return end
  if dragInput.UserInputType==Enum.UserInputType.MouseButton1
    and input.UserInputType~=Enum.UserInputType.MouseMovement then return end
  local canvasSize=previewCanvas.AbsoluteSize
  if canvasSize.X<=0 or canvasSize.Y<=0 then return end
  local p=meadowTopPositions[activeDrag]
  local x=math.clamp((input.Position.X-previewCanvas.AbsolutePosition.X)/canvasSize.X,.12,.88)
  local y=math.clamp((input.Position.Y-previewCanvas.AbsolutePosition.Y)/canvasSize.Y*.66,.10,.55)
  -- [이동 편집] 실제 오른쪽 버튼 크기까지 고려해서 원래 다른 기술을 덮는 이동을 차단한다.
  local free=true
  for index,other in ipairs(meadowTopPositions) do
    if index~=activeDrag then
      local dx=(x-other[1])*235
      local dy=(y-other[2])*260
      local minDistance=(activeDrag==4 and 23 or 37)+(index==4 and 23 or 37)+8
      if dx*dx+dy*dy<minDistance*minDistance then free=false;break end
    end
  end
  if free then p[1],p[2]=x,y;refreshTopEditor() end
end)
UserInputService.InputEnded:Connect(function(input)
  if not activeDrag then return end
  if dragInput.UserInputType==Enum.UserInputType.Touch and input~=dragInput then return end
  if dragInput.UserInputType==Enum.UserInputType.MouseButton1
    and input.UserInputType~=Enum.UserInputType.MouseButton1 then return end
  activeDrag=nil
  dragInput=nil
  meadowPages[4].ScrollingEnabled=true
end)
local saveLayoutButton=CommonUI.CreatePrimaryButton({
  name="MeadowSaveActionLayout",text="버튼 배치 저장",minHeight=48
})
saveLayoutButton.LayoutOrder=6
saveLayoutButton.Size=UDim2.new(1,-8,0,48)
saveLayoutButton.Parent=meadowPages[4]
saveLayoutButton.Visible=false
local resetLayoutButton=CommonUI.CreatePrimaryButton({
  name="MeadowResetActionLayout",text="기본 배치로 되돌리기",minHeight=48
})
resetLayoutButton.LayoutOrder=7
resetLayoutButton.Size=UDim2.new(1,-8,0,48)
resetLayoutButton.Parent=meadowPages[4]
resetLayoutButton.Visible=false
editLayoutButton.Activated:Connect(function()
  local show=not editLayoutPreview.Visible
  editLayoutPreview.Visible=show
  saveLayoutButton.Visible=show
  resetLayoutButton.Visible=show
  editLayoutButton.Text=show and "버튼 위치 편집 닫기" or "상단 4개 버튼 위치 변경"
  if show then refreshTopEditor() end
end)
saveLayoutButton.Activated:Connect(function()
  if player:GetAttribute("ProfileReady")~=true then
    saveLayoutButton.Text="저장 정보 연결 중"
    return
  end
  local values={}
  for _,p in ipairs(meadowTopPositions) do
    values[#values+1]=tostring(math.floor(p[1]*1000+.5))
    values[#values+1]=tostring(math.floor(p[2]*1000+.5))
  end
  remote:FireServer("meadow:ui-layout:"..table.concat(values,","))
  saveLayoutButton.Text="배치 저장 요청 완료"
end)
resetLayoutButton.Activated:Connect(function()
  for index,p in ipairs(meadowTopDefaults) do meadowTopPositions[index]={p[1],p[2]} end
  refreshTopEditor()
  saveLayoutButton.Text="기본 위치 적용 · 저장을 눌러 확정"
end)
player:GetAttributeChangedSignal("MeadowTopButtonsLayout"):Connect(function()
  if readMeadowTopLayout(player:GetAttribute("MeadowTopButtonsLayout")) then
    refreshTopEditor()
    saveLayoutButton.Text="버튼 배치 저장 완료"
  end
end)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  meadowSkillDock.Visible=gui:GetAttribute("GameMenuOpen")~=true
end)
-- [미니맵] 실제 플레이어 좌표와 발견한 숲 지점만 표시한다.
-- 체력바와 같은 전체 화면 좌표계를 사용해 Roblox 기본 상단 UI 여백으로 인한 아래 밀림을 없앤다.
-- [미니맵 범위] 생성·갱신 콜백이 지도 객체를 보유하고 이후 시스템에는 변수를 남기지 않는다.
do
local meadowRadar=Instance.new("Frame")
meadowRadar.Name="MeadowExplorerRadar"
meadowRadar:SetAttribute("ReferenceRadarVisible",true) -- [상단 중앙 가로 지도] 기본 표시, 옵션에서 숨김
meadowRadar.AnchorPoint=Vector2.new(1,0)
meadowRadar.Size=UDim2.fromOffset(128,151)
meadowRadar.BackgroundColor3=Color3.fromRGB(13,30,28)
meadowRadar.BackgroundTransparency=1
meadowRadar.BorderSizePixel=0
meadowRadar.ZIndex=8
meadowRadar.Parent=player.PlayerGui:FindFirstChild("MeadowTouchLayer") or meadowVitalsGui
local radarCorner=Instance.new("UICorner")
radarCorner.CornerRadius=UDim.new(0,13)
radarCorner.Parent=meadowRadar
local radarStroke=Instance.new("UIStroke")
radarStroke.Color=Color3.fromRGB(220,176,91)
radarStroke.Thickness=2.5
radarStroke.Transparency=1
radarStroke.Parent=meadowRadar
local radarTitle=Instance.new("TextLabel")
radarTitle.Name="Area"
radarTitle.Position=UDim2.fromOffset(5,116)
radarTitle.Size=UDim2.new(1,-10,0,24)
radarTitle.BackgroundColor3=Color3.fromRGB(27,30,28)
radarTitle.BackgroundTransparency=.06
radarTitle.Text="초원지역"
radarTitle.TextColor3=Color3.fromRGB(251,231,186)
radarTitle.TextSize=10
radarTitle.Font=Enum.Font.Gotham
radarTitle.ZIndex=9
radarTitle.Parent=meadowRadar
local radarTitleCorner=Instance.new("UICorner")
radarTitleCorner.CornerRadius=UDim.new(1,0);radarTitleCorner.Parent=radarTitle
local radarTitleStroke=Instance.new("UIStroke")
radarTitleStroke.Color=Color3.fromRGB(216,174,102)
radarTitleStroke.Thickness=1.3;radarTitleStroke.Transparency=1;radarTitleStroke.Parent=radarTitle
local radarField=Instance.new("Frame")
radarField.Name="NearbyPlayers"
radarField.Position=UDim2.fromOffset(9,5)
radarField.Size=UDim2.fromOffset(110,110)
radarField.BackgroundColor3=Color3.fromRGB(26,58,47)
radarField.BorderSizePixel=0
radarField.ClipsDescendants=true
radarField.ZIndex=9
radarField.Parent=meadowRadar
local radarFieldCorner=Instance.new("UICorner")
radarFieldCorner.CornerRadius=UDim.new(0,10) -- 원형 대신 가로로 긴 사각 지도
radarFieldCorner.Parent=radarField
local radarTint=Instance.new("UIGradient")
radarTint.Color=ColorSequence.new(Color3.fromRGB(64,120,74),Color3.fromRGB(24,64,52)) -- 초원 느낌의 밝은 녹색 바탕
radarTint.Rotation=110
radarTint.Parent=radarField
local radarFieldStroke=Instance.new("UIStroke")
radarFieldStroke.Color=Color3.fromRGB(221,184,110)
radarFieldStroke.Thickness=3
radarFieldStroke.Transparency=.06
radarFieldStroke.Parent=radarField
-- 실제 서버의 흙길과 유적, 근처 몬스터만 지도에 표시한다.
local radarTrails={}
for route=1,36 do
  local segment=Instance.new("Frame")
  segment.Name="RealTrail"..route;segment.AnchorPoint=Vector2.new(.5,.5)
  segment.BorderSizePixel=0;segment.BackgroundColor3=Color3.fromRGB(214,184,120)
  segment.BackgroundTransparency=.25;segment.ZIndex=10;segment.Parent=radarField
  radarTrails[route]=segment
end
local radarRuinMarkers={}
for index=1,3 do
  local marker=Instance.new("TextLabel")
  marker.Name="RealRuin"..index;marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5);marker.Size=UDim2.fromOffset(15,15)
  marker.Font=Enum.Font.GothamBold;marker.Text="▣"
  marker.TextColor3=Color3.fromRGB(255,196,133);marker.TextSize=15
  marker.ZIndex=11;marker.Visible=false;marker.Parent=radarField
  radarRuinMarkers[index]=marker
end
-- [지도 그리기] 실제 월드의 나무 위치를 작은 숲 점으로 그려 지형 느낌을 준다(새 자산 없음).
local radarTerrain={dots={},trees={},scannedAt=-99}
for index=1,72 do
  local dot=Instance.new("Frame")
  dot.Name="TerrainTree"..index
  dot.AnchorPoint=Vector2.new(.5,.5)
  dot.Size=UDim2.fromOffset(5,5)
  dot.BackgroundColor3=Color3.fromRGB(52,132,70)
  dot.BorderSizePixel=0
  dot.ZIndex=9
  dot.Visible=false
  local dotCorner=Instance.new("UICorner");dotCorner.CornerRadius=UDim.new(1,0);dotCorner.Parent=dot
  local dotStroke=Instance.new("UIStroke");dotStroke.Color=Color3.fromRGB(20,66,40);dotStroke.Thickness=1;dotStroke.Parent=dot
  dot.Parent=radarField
  radarTerrain.dots[index]=dot
end
-- [초원 전체 탐험 지도] 서버의 오솔길과 외곽 길 36개를 동일 좌표로 표시한다.
-- 기존 8개 마을/숲 길 + 누락된 4개 숲 분기 + 네 모서리 연결 24개.
local radarTrailEndpoints={
  {-51,-48,-177,-176},
  {58,-49,183,-177},
  {-54,62,-184,188},
  {56,63,192,196},
  {-177,-176,-228,-219},
  {183,-177,231,-228},
  {-184,188,-234,233},
  {192,196,236,238}, -- 기존 표시 구간
  {-132,-126,-231,-93},
  {128,-128,226,-91},
  {-126,139,-220,211},
  {134,139,219,215}, -- 기존 숲 분기
  {-228,-219,-315,-193},
  {-233,-193,-315,-193},
  {-315,-193,-319,-94},
  {-315,-193,-319,-308},
  {-319,-308,-240,-315},
  {231,-228,316,-195},
  {235,-195,316,-195},
  {316,-195,319,-94},
  {316,-195,319,-308},
  {319,-308,241,-316},
  {-234,233,-309,308},
  {236,238,309,308},
  {-309,308,-155,316},
  {-155,316,0,317},
  {0,317,155,316},
  {155,316,309,308},
  {-309,308,-315,204},
  {-315,204,-315,100},
  {-315,100,-319,-3},
  {-319,-3,-319,-94},
  {309,308,315,204},
  {315,204,315,100},
  {315,100,319,-3},
  {319,-3,319,-94},
}
local radarRuinSites={{-122,-147},{137,139},{-154,122}}

for index=1,3 do
  local vertical=Instance.new("Frame")
  vertical.Name="GridVertical"..index
  vertical.Size=UDim2.new(0,1,1,0)
  vertical.Position=UDim2.fromScale(index/4,0)
  vertical.BackgroundColor3=Color3.fromRGB(146,192,137)
  vertical.BackgroundTransparency=.93
  vertical.BorderSizePixel=0
  vertical.ZIndex=9
  vertical.Parent=radarField
  local horizontal=Instance.new("Frame")
  horizontal.Name="GridHorizontal"..index
  horizontal.Size=UDim2.new(1,0,0,1)
  horizontal.Position=UDim2.fromScale(0,index/4)
  horizontal.BackgroundColor3=Color3.fromRGB(146,192,137)
  horizontal.BackgroundTransparency=.93
  horizontal.BorderSizePixel=0
  horizontal.ZIndex=9
  horizontal.Parent=radarField
end
local north=Instance.new("TextLabel")
north.Name="North"
north.Position=UDim2.fromOffset(3,2)
north.Size=UDim2.fromOffset(16,16)
north.BackgroundTransparency=1
north.Text="N"
north.TextColor3=Color3.fromRGB(242,216,154)
north.TextSize=12
north.Font=Enum.Font.GothamBold
north.ZIndex=11
north.Parent=radarField
-- [나침반] S 표시를 미니맵 원의 정중앙 하단에 고정한다.
local south=Instance.new("TextLabel")
south.Name="South"
south.AnchorPoint=Vector2.new(.5,1)
south.Position=UDim2.new(.5,0,1,-2)
south.Size=UDim2.fromOffset(16,16)
south.BackgroundTransparency=1
south.Text="S"
south.TextColor3=Color3.fromRGB(242,216,154)
south.TextSize=12
south.Font=Enum.Font.GothamBold
south.ZIndex=11
south.Parent=radarField
local radarCenter=Instance.new("TextLabel")
radarCenter.Name="Facing"
radarCenter.BackgroundTransparency=1
radarCenter.AnchorPoint=Vector2.new(.5,.5)
radarCenter.Position=UDim2.fromScale(.5,.5)
radarCenter.Size=UDim2.fromOffset(19,19)
radarCenter.Text="▲"
radarCenter.TextColor3=Color3.fromRGB(255,229,145)
radarCenter.TextSize=19
radarCenter.Font=Enum.Font.GothamBold
radarCenter.ZIndex=12
radarCenter.Parent=radarField
local grovePoints={
  -- 기존 발견 지점 4곳 + 같은 저장 비트를 공유하는 맵 네 모서리 조사 지점.
  {-258,-206,1},{261,-219,2},{-270,220,4},{258,240,8},
  {-318,-312,1},{318,-313,2},{-318,313,4},{317,312,8},
}
local groveMarkers={}
for index=1,#grovePoints do
  local marker=Instance.new("TextLabel")
  marker.Name="DiscoveredGrove"..index
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.Size=UDim2.fromOffset(13,13)
  marker.BackgroundTransparency=1
  marker.Text="✦"
  marker.TextColor3=Color3.fromRGB(204,242,143)
  marker.TextSize=13
  marker.Visible=false
  marker.ZIndex=10
  marker.Parent=radarField
  groveMarkers[index]=marker
end
local radarCoordinates=Instance.new("TextLabel")
radarCoordinates.Name="Coordinates"
radarCoordinates.Position=UDim2.fromOffset(7,138)
radarCoordinates.Size=UDim2.new(1,-12,0,21)
radarCoordinates.BackgroundTransparency=1
radarCoordinates.Text="위치 탐색 중"
radarCoordinates.TextColor3=Color3.fromRGB(219,238,219)
radarCoordinates.TextSize=10
radarCoordinates.Font=Enum.Font.Gotham
radarCoordinates.ZIndex=9
radarCoordinates.Parent=meadowRadar
-- 실제 스트리밍된 적 모델만 재사용 마커에 표시한다.
local radarEnemies={}
for index=1,12 do
  local marker=Instance.new("TextLabel")
  marker.Name="VisibleEnemy"..index;marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5);marker.Size=UDim2.fromOffset(14,14)
  marker.Text="●";marker.Font=Enum.Font.GothamBold
  marker.TextSize=14;marker.TextColor3=Color3.fromRGB(255,115,91)
  marker.Visible=false;marker.ZIndex=11;marker.Parent=radarField
  radarEnemies[index]=marker
end
local radarWoodlandMarkers={}
for index=1,20 do
  local marker=Instance.new("TextLabel")
  marker.Name="RealWoodland"..index
  marker.Size=UDim2.fromOffset(12,12)
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.BackgroundTransparency=1
  marker.Text="▲"
  marker.TextColor3=Color3.fromRGB(108,165,91)
  marker.TextSize=11;marker.Font=Enum.Font.GothamBold
  marker.ZIndex=10;marker.Visible=false
  marker.Parent=radarField
  radarWoodlandMarkers[index]=marker
end
-- [마을·의뢰 지도] 기존 미니맵에 실제 마을 중심 및 현재 계약 조사 좌표만 표시.
local radarVillage=Instance.new("TextLabel")
radarVillage.Name="MeadowVillageMarker"
radarVillage.BackgroundTransparency=1
radarVillage.AnchorPoint=Vector2.new(.5,.5)
radarVillage.Size=UDim2.fromOffset(23,23)
radarVillage.Text="⌂"
radarVillage.TextSize=21
radarVillage.TextColor3=Color3.fromRGB(252,221,145)
radarVillage.TextStrokeTransparency=.3
radarVillage.ZIndex=12
radarVillage.Visible=false
radarVillage.Parent=radarField
-- [주민 길찾기] 기존 네 명의 실제 R15 NPC 위치를 미니맵에 표시한다.
-- 추가 NPC/저장 필드 없이 기존 마을 배치와 움직이는 주민의 현재 위치만 읽는다.
local radarVillagers={}
for _,entry in ipairs({
  {"Elder","촌"},{"Herbalist","약"},{"Tracker","추"},{"Guard","경"},
}) do
  local marker=Instance.new("TextLabel")
  marker.Name="MeadowResidentMarker"..entry[1]
  marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.Size=UDim2.fromOffset(16,16)
  marker.Text=entry[2]
  marker.TextSize=12
  marker.Font=Enum.Font.GothamBold
  marker.TextColor3=Color3.fromRGB(255,237,186)
  marker.TextStrokeTransparency=.27
  marker.ZIndex=12
  marker.Visible=false
  marker.Parent=radarField
  radarVillagers[#radarVillagers+1]={id=entry[1],view=marker}
end
local radarContractSites={}
for index=1,2 do
  local marker=Instance.new("TextLabel")
  marker.Name=index==1 and "VillageClueMarker1" or "VillageCombatMarker"
  marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.Size=UDim2.fromOffset(19,19)
  marker.Text=index==1 and "?" or "⚔"
  marker.TextSize=19
  marker.Font=Enum.Font.GothamBold
  marker.TextColor3=Color3.fromRGB(247,207,125)
  marker.TextStrokeTransparency=.35
  marker.ZIndex=12
  marker.Visible=false
  marker.Parent=radarField
  radarContractSites[index]=marker
end
local radarPeers={}
local radarElapsed=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  radarElapsed+=dt
  if radarElapsed<.3 then return end
  radarElapsed=0
  local character=player.Character
  local mainRoot=character and character:FindFirstChild("HumanoidRootPart")
  if not mainRoot then return end
  radarCoordinates.Text=string.format("위치 %d, %d  ·  동료 %d",
    math.floor(mainRoot.Position.X),math.floor(mainRoot.Position.Z),math.max(0,#Players:GetPlayers()-1))
  local facing=mainRoot.CFrame.LookVector
  radarCenter.Rotation=math.deg(math.atan2(facing.X,-facing.Z))
  local world=workspace:FindFirstChild("FantasySurvivalWorld")
  -- [현재 위치 이름] 실제 생성된 마을·유적과 기존 숲 좌표에만 대응한다.
  -- 실물이 없는 던전은 지어내지 않고 기본 초원지역으로 표시한다.
  local areaName="초원지역"
  if world then
    local x,z=mainRoot.Position.X,mainRoot.Position.Z
    if (world:GetAttribute("MeadowVillageNPCCount") or 0)>0
      and x>=-280 and x<=280 and z>=-351 and z<=-42 then
      areaName=z<-250 and "초원 마을 · 농경지"
        or math.abs(x)>155 and "초원 마을 · 외곽 길목" or "초원 마을"
    else
      for index,site in ipairs(radarRuinSites) do
        local dx,dz=x-site[1],z-site[2]
        if world:FindFirstChild("Meadow_Ruin_"..index) and dx*dx+dz*dz<48*48 then
          areaName="오래된 유적"
          break
        end
      end
      if areaName=="초원지역" then
        -- [구역별 위치 안내] 네 모서리·북쪽 능선·외곽 늑대 길목을 실제 좌표로 식별.
        if x<=-275 and z<=-245 then areaName="북서 숲 외곽"
        elseif x>=275 and z<=-245 then areaName="북동 숲 외곽"
        elseif x<=-275 and z>=245 then areaName="남서 깊은 숲"
        elseif x>=275 and z>=245 then areaName="남동 깊은 숲"
        elseif z>=280 then areaName="남쪽 숲 능선"
        elseif x<=-280 and z<0 then areaName="서쪽 늑대 숲길"
        elseif x>=280 and z<0 then areaName="동쪽 물길 외곽"
        else
          for _,site in ipairs(grovePoints) do
            local dx,dz=x-site[1],z-site[2]
            if dx*dx+dz*dz<78*78 then
              areaName="숲 가장자리"
              break
            end
          end
        end
      end
    end
  end
  radarTitle.Text=areaName
  local trailsReady=world and (world:GetAttribute("MeadowNativeTrails") or 0)>=36
  local mapSize=radarField.AbsoluteSize
  local radarSpan=270 -- 플레이어 주위 실제 135스터드 반경
  local radarHalf=radarSpan*.5
  -- 실제 나무 위치(20초마다 다시 찾음)를 반경 안에서만 점으로 표시한다.
  if world and os.clock()-radarTerrain.scannedAt>20 then
    radarTerrain.scannedAt=os.clock()
    local found={}
    for _,child in ipairs(world:GetDescendants()) do
      if child:IsA("Model") then
        local childName=child.Name
        if childName:find("Woodland_",1,true) or childName:find("BoundaryTree_",1,true)
          or childName:find("InteriorTree_",1,true) then
          local okPivot,pivot=pcall(function() return child:GetPivot() end)
          if okPivot then found[#found+1]=pivot.Position end
        end
      end
    end
    radarTerrain.trees=found
  end
  local treeShown=0
  for _,treePosition in ipairs(radarTerrain.trees) do
    local tdx=treePosition.X-mainRoot.Position.X
    local tdz=treePosition.Z-mainRoot.Position.Z
    if math.abs(tdx)<radarHalf and math.abs(tdz)<radarHalf then
      treeShown+=1
      local dot=radarTerrain.dots[treeShown]
      if not dot then break end
      dot.Visible=true
      dot.Position=UDim2.fromScale(.5+tdx/radarSpan,.5+tdz/radarSpan)
    end
  end
  for index=treeShown+1,#radarTerrain.dots do radarTerrain.dots[index].Visible=false end
  local villageDx=0-mainRoot.Position.X
  local villageDz=-111-mainRoot.Position.Z
  radarVillage.Visible=world~=nil and (world:GetAttribute("MeadowVillageNPCCount") or 0)>0
    and villageDx*villageDx+villageDz*villageDz<radarHalf*radarHalf
  if radarVillage.Visible then
    radarVillage.Position=UDim2.fromScale(.5+villageDx/radarSpan,.5+villageDz/radarSpan)
  end
  -- [NPC 위치] 실제 현재 위치를 따라가므로 길목 순찰 중에도 위치를 잘못 안내하지 않는다.
  for _,row in ipairs(radarVillagers) do
    local npc=world and world:FindFirstChild("Meadow_Villager_"..row.id)
    local npcPosition=npc and npc:GetPivot().Position
    local dx=npcPosition and npcPosition.X-mainRoot.Position.X or math.huge
    local dz=npcPosition and npcPosition.Z-mainRoot.Position.Z or math.huge
    row.view.Visible=npcPosition~=nil and dx*dx+dz*dz<radarHalf*radarHalf
    if row.view.Visible then
      row.view.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan)
    end
  end
  local activeContract=Config.VillageContracts[player:GetAttribute("VillageContractIndex") or 1]
  local contractEvidence=player:GetAttribute("VillageContractEvidence") or 0
  for index,marker in ipairs(radarContractSites) do
    local site=activeContract and (index==1 and activeContract.Sites[1] or activeContract.EnemySite)
    local dx=site and site[1]-mainRoot.Position.X or math.huge
    local dz=site and site[2]-mainRoot.Position.Z or math.huge
    local requiredBit=index==1 and 8 or 64
    marker.Visible=site~=nil
      and (player:GetAttribute("VillageContractPhase") or 0)==1
      and bit32.band(contractEvidence,requiredBit)==0
      and dx*dx+dz*dz<radarHalf*radarHalf
    if marker.Visible then marker.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan) end
  end
  for index,route in ipairs(radarTrailEndpoints) do
    local frame=radarTrails[index]
    -- 기존 대각선 X 버그: 레이더 밖 끝점을 갖는 길은 표시하지 않는다.
    -- 좌표를 원 끝으로 강제 잘라 길 전체가 중앙을 관통하는 표시를 방지한다.
    local dx1=route[1]-mainRoot.Position.X
    local dz1=route[2]-mainRoot.Position.Z
    local dx2=route[3]-mainRoot.Position.X
    local dz2=route[4]-mainRoot.Position.Z
    frame.Visible=trailsReady and math.max(math.abs(dx1),math.abs(dz1),math.abs(dx2),math.abs(dz2))<=radarHalf
    if frame.Visible then
      local x1=.5+(route[1]-mainRoot.Position.X)/radarSpan
      local y1=.5+(route[2]-mainRoot.Position.Z)/radarSpan
      local x2=.5+(route[3]-mainRoot.Position.X)/radarSpan
      local y2=.5+(route[4]-mainRoot.Position.Z)/radarSpan
      local dx=(x2-x1)*mapSize.X
      local dy=(y2-y1)*mapSize.Y
      frame.Position=UDim2.fromScale((x1+x2)*.5,(y1+y2)*.5)
      frame.Size=UDim2.fromOffset(math.max(1,math.sqrt(dx*dx+dy*dy)),3)
      frame.Rotation=math.deg(math.atan2(dy,dx))
    end
  end
  for index,point in ipairs(radarRuinSites) do
    local marker=radarRuinMarkers[index]
    local ruin=world and world:FindFirstChild("Meadow_Ruin_"..index)
    local dx=point[1]-mainRoot.Position.X
    local dz=point[2]-mainRoot.Position.Z
    marker.Visible=ruin~=nil and dx*dx+dz*dz<=radarHalf*radarHalf
    if marker.Visible then marker.Position=UDim2.fromScale(math.clamp(.5+dx/radarSpan,.05,.95),math.clamp(.5+dz/radarSpan,.06,.94)) end
  end
  local discovered=player:GetAttribute("ExplorationGroves") or 0
  for index,point in ipairs(grovePoints)do
    local dx=point[1]-mainRoot.Position.X
    local dz=point[2]-mainRoot.Position.Z
    local marker=groveMarkers[index]
    local objective=(player:GetAttribute("QuestStage") or 1)==5
    marker.Visible=(objective or bit32.band(discovered,point[3])~=0) and dx*dx+dz*dz<=radarHalf*radarHalf
    marker.Text=objective and "◎" or "✦"
    marker.TextColor3=objective and Color3.fromRGB(255,228,125) or Color3.fromRGB(204,242,143)
    if marker.Visible then
      marker.Position=UDim2.fromScale(math.clamp(.5+dx/radarSpan,.05,.95),
        math.clamp(.5+dz/radarSpan,.06,.94))
    end
  end
  local visibleEnemies=0
  local visibleWoodlands=0
  if world then
    for _,model in ipairs(world:GetChildren()) do
      if model:IsA("Model") and visibleWoodlands<#radarWoodlandMarkers
        and model.Name:sub(1,16)=="Meadow_Woodland_" then
        local pos=model:GetPivot().Position
        local dx=pos.X-mainRoot.Position.X
        local dz=pos.Z-mainRoot.Position.Z
        if dx*dx+dz*dz<=radarHalf*radarHalf then
          visibleWoodlands+=1
          local marker=radarWoodlandMarkers[visibleWoodlands]
          marker.Visible=true;marker.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan)
        end
      end
      if visibleEnemies<#radarEnemies and model:IsA("Model") and typeof(model:GetAttribute("EnemyHealth"))=="number"
        and model:GetAttribute("EnemyHealth")>0 then
        local pos=model:GetPivot().Position
        local dx=pos.X-mainRoot.Position.X
        local dz=pos.Z-mainRoot.Position.Z
        if dx*dx+dz*dz<=radarHalf*radarHalf then
          visibleEnemies+=1
          local marker=radarEnemies[visibleEnemies]
          marker.Visible=true
          marker.Text=model:GetAttribute("Boss")==true and "◆" or "●"
          marker.TextColor3=model:GetAttribute("Boss")==true
            and Color3.fromRGB(255,207,104) or Color3.fromRGB(255,115,91)
          marker.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan)
        end
      end
    end
  end
  for index=visibleEnemies+1,#radarEnemies do radarEnemies[index].Visible=false end
  for index=visibleWoodlands+1,#radarWoodlandMarkers do radarWoodlandMarkers[index].Visible=false end
  local existing={}
  for _,peer in ipairs(Players:GetPlayers())do
    if peer~=player then
      local peerCharacter=peer.Character
      local peerRoot=peerCharacter and peerCharacter:FindFirstChild("HumanoidRootPart")
      if peerRoot and (peerRoot.Position-mainRoot.Position).Magnitude<radarHalf then
        local marker=radarPeers[peer]
        if not marker then
          marker=Instance.new("TextLabel")
          marker.Name="PlayerMarker"
          marker.BackgroundTransparency=1
          marker.AnchorPoint=Vector2.new(.5,.5)
          marker.Size=UDim2.fromOffset(14,14)
          marker.Text="◆"
          marker.TextColor3=Color3.fromRGB(144,220,251)
          marker.TextSize=14
          marker.ZIndex=11
          marker.Parent=radarField
          radarPeers[peer]=marker
        end
        local delta=peerRoot.Position-mainRoot.Position
        marker.Position=UDim2.fromScale(math.clamp(.5+delta.X/radarSpan,.05,.95),
          math.clamp(.5+delta.Z/radarSpan,.06,.94))
        existing[peer]=true
      end
    end
  end
  for peer,marker in pairs(radarPeers)do
    if not existing[peer] then marker:Destroy();radarPeers[peer]=nil end
  end
end)
local function layoutMeadowRadar()
  local layer=meadowRadar.Parent
  local v=layer and layer:IsA("ScreenGui") and layer.AbsoluteSize or gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  -- [상단 중앙 가로 지도] 화면 맨 위 가운데. 가로가 길고 세로는 낮게 둔다(좌우 메뉴·체력바와 겹치지 않음).
  -- 가로 화면: 로블록스 상단바(왼쪽)와 상단 메뉴 6개(오른쪽) 사이 빈 공간의 가운데에 둔다.
  local landscape=v.X>v.Y
  local menuStep=landscape and math.floor(math.clamp(v.X/15,47,55))
    or math.floor(math.clamp((v.X-18)/6,47,52))
  local freeLeft=landscape and math.floor(v.X*.29) or 8
  local freeRight=landscape and (v.X-menuStep*6-6-10) or (v.X-8)
  local mapWidth=math.floor(math.clamp((freeRight-freeLeft)*.72,140,236))
  local mapHeight=math.floor(math.clamp(mapWidth*.25,38,60))
  meadowRadar.Size=UDim2.fromOffset(mapWidth,mapHeight+20)
  meadowRadar.AnchorPoint=Vector2.new(.5,0)
  meadowRadar.Position=UDim2.fromOffset(math.floor((freeLeft+freeRight)*.5),landscape and 2 or menuStep+22)
  radarField.AnchorPoint=Vector2.new(.5,0)
  radarField.Position=UDim2.new(.5,0,0,1)
  radarField.Size=UDim2.fromOffset(mapWidth,mapHeight)
  radarTitle.Position=UDim2.fromOffset(0,mapHeight+4)
  radarTitle.Size=UDim2.new(.3,-2,0,16)
  radarTitle.TextSize=10
  -- [지도 아래 한 줄] 초원 마을 · 날씨/시간(글씨만) · 좌표
  local climateChip=gui:FindFirstChild("MeadowClimateStatus") or meadowRadar:FindFirstChild("MeadowClimateStatus")
  if climateChip then
    climateChip.Parent=meadowRadar
    climateChip.AnchorPoint=Vector2.zero
    climateChip.Position=UDim2.new(.3,0,0,mapHeight+4)
    climateChip.Size=UDim2.new(.36,0,0,16)
    climateChip.TextSize=10
    climateChip.ZIndex=10
  end
  radarCoordinates.Position=UDim2.new(.66,2,0,mapHeight+4)
  radarCoordinates.Size=UDim2.new(.34,-2,0,16)
  radarCoordinates.TextSize=9
  meadowRadar.Visible=meadowRadar:GetAttribute("ReferenceRadarVisible")==true and gui:GetAttribute("GameMenuOpen")~=true
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
meadowVitalsGui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
meadowVitalsGui:GetPropertyChangedSignal("AbsolutePosition"):Connect(layoutMeadowRadar)
meadowHealthTrack:GetPropertyChangedSignal("AbsolutePosition"):Connect(layoutMeadowRadar)
meadowSkillButtons[2]:GetPropertyChangedSignal("AbsolutePosition"):Connect(layoutMeadowRadar)
meadowSkillButtons[2]:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(layoutMeadowRadar)
alignMeadowRadar=layoutMeadowRadar
-- [기존 미니맵 기능 보존] 참고 화면에는 숨기고, 옵션에서 언제든 복구할 수 있다.
do
local mapToggle=CommonUI.CreatePrimaryButton({
  name="MeadowRadarToggle",text="미니맵 숨기기",minHeight=48
})
mapToggle.LayoutOrder=10
mapToggle.Size=UDim2.new(1,-8,0,48)
mapToggle.Parent=meadowPages[4]
mapToggle.Activated:Connect(function()
  local shown=meadowRadar:GetAttribute("ReferenceRadarVisible")==true
  meadowRadar:SetAttribute("ReferenceRadarVisible",not shown)
  mapToggle.Text=shown and "미니맵 표시" or "미니맵 숨기기"
  layoutMeadowRadar()
end)
end
layoutMeadowRadar()
end
do
-- [전투 UI 상태] 서버가 제공한 실제 쿨다운만 표시한다. 임의 쿨다운은 없다.
local skillDisplayElapsed=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  skillDisplayElapsed+=dt
  if skillDisplayElapsed<.1 then return end
  skillDisplayElapsed=0
  local now=workspace:GetServerTimeNow()
  local ready=player:GetAttribute("ProfileReady")==true
  local stamina=math.clamp(player:GetAttribute("MeadowStamina") or 0,0,100)
  energyFill.Size=UDim2.fromScale(ready and stamina/100 or 0,1)
  energyLabel.Text=ready and string.format("스테미너 %d / 100",math.floor(stamina+.5)) or "스테미너 불러오는 중"
  for index,button in ipairs(meadowSkillButtons)do
    local skill=meleeSkills[index]
    local deadline=player:GetAttribute("MeadowReady_"..(index==1 and meadowActionButtons.quickSkillId or skill[1]))
    local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
    local cost=0 -- 위치 재배치는 기존 기술의 서버 스테미너·쿨다운을 바꾸지 않는다.
    -- [기술 터치] 재사용 대기 중에도 버튼 입력을 막지 않고 서버에서 쿨다운을 검증한다.
    -- 비활성화된 GUI 버튼이 터치 자체를 삼켜 기술이 고장 난 것처럼 보이던 문제를 제거한다.
    button.Active=true -- [터치] 서버에서 프로필·스테미너·쿨다운을 검증한다.
    button.Text=""
    meadowSkillNameplates[index].TextTransparency=ready and 0 or .25
    local cooldown=meadowSkillCooldowns[index]
    cooldown.Visible=remaining>.05
    cooldown.Text=remaining>0 and string.format("%.1f",remaining) or ""
    button.BackgroundColor3=remaining>.05 and Color3.fromRGB(24,28,34) or Color3.fromRGB(30,31,29)
    if index==2 then
      -- [5단 회피 표시] 이어 누를 수 있는 동안 현재 단계를 버튼 모서리에 보여 준다.
      local tag=button:FindFirstChild("DodgeStageTag")
      if not tag then
        tag=Instance.new("TextLabel");tag.Name="DodgeStageTag";tag.AnchorPoint=Vector2.new(.5,1)
        tag.Position=UDim2.fromScale(.5,0);tag.Size=UDim2.fromOffset(46,20);tag.BackgroundColor3=Color3.fromRGB(246,179,73)
        tag.BorderSizePixel=0;tag.Font=Enum.Font.GothamBlack;tag.TextSize=13;tag.TextColor3=Color3.fromRGB(30,22,12)
        tag.ZIndex=30;tag.Visible=false;tag.Active=false;tag.Interactable=false;tag.Parent=button
        local tagCorner=Instance.new("UICorner");tagCorner.CornerRadius=UDim.new(1,0);tagCorner.Parent=tag
      end
      local stage=tonumber(player:GetAttribute("MeadowDodgeStage")) or 0
      local window=tonumber(player:GetAttribute("MeadowDodgeWindow")) or 0
      local maxStage=math.clamp(math.floor(tonumber(player:GetAttribute("MeadowTalentAgility")) or 0),1,5)
      local live=stage>0 and stage<maxStage and now<window
      tag.Visible=live
      if live then tag.Text=stage.."/"..maxStage.."  연속" end
    end
  end
  for index,button in ipairs(meadowUtilityButtons)do
    local info=meadowUtilityActions[index]
    local deadline=player:GetAttribute("MeadowReady_"..info[1])
    local remains=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
    button.Active=true -- [터치] 가방·상호작용·질주의 입력 차단 금지.
    button.Text=info[4]
    button.TextTransparency=button.Active and 0 or .3
    if info[1]=="skill-meadow-sprint" then
      local caption=button:FindFirstChild("UtilityCaption")
      if caption then
        caption.Visible=true
        caption.Text=meadowSprintAuto and "자동질주 ON" or "자동질주 OFF"
        caption.TextColor3=meadowSprintAuto and Color3.fromRGB(150,255,170) or Color3.fromRGB(255,170,160)
        caption.Position=UDim2.fromScale(.5,1.18);caption.Size=UDim2.new(1.5,0,0,15);caption.ZIndex=40
      end
      local ring=button:FindFirstChildOfClass("UIStroke")
      if ring then ring.Color=meadowSprintAuto and Color3.fromRGB(110,255,150) or Color3.fromRGB(150,150,150);ring.Thickness=meadowSprintAuto and 4 or 2 end
      if meadowSprintAuto and ready and remains<=.05 then
        local character=player.Character
        local human=character and character:FindFirstChildOfClass("Humanoid")
        if human and human.Health>0 and human.MoveDirection.Magnitude>.1 then
          activateMeadowAction(info[1]) -- 기존 8초 재사용 대기·3초 효과를 그대로 사용한다.
        end
      end
    end
  end
end)
end
do
-- [상호작용 표시] 네이티브 프롬프트가 실제로 표시될 때만 대상 테두리를 강조한다.
local promptHighlight=Instance.new("Highlight")
promptHighlight.Name="MeadowInteractionTarget";promptHighlight.FillTransparency=1
promptHighlight.OutlineColor=Color3.fromRGB(150,231,182)
promptHighlight.OutlineTransparency=.12;promptHighlight.DepthMode=Enum.HighlightDepthMode.Occluded
promptHighlight.Enabled=false;promptHighlight.Parent=gui
-- [실제 의뢰 목적지] 기존 서버 ProximityPrompt에만 마커를 연결한다. 가짜 위치·목표·보상 생성 금지.
local guidePrompts={}
_G.MeadowGuidePrompts=guidePrompts
local function registerMeadowPrompt(descendant)
  if not descendant:IsA("ProximityPrompt") then return end
  if descendant.Name=="MeadowVillageInteraction" then
    shownMeadowPrompts[descendant]=true
  end
  if descendant.Name=="MeadowVillageInteraction" or descendant.Name=="MeadowSurvivalInspect"
    or descendant.Name=="GatherPrompt" then
    guidePrompts[descendant]=true
  end
end
local worldPrompts=workspace:FindFirstChild("FantasySurvivalWorld")
-- [목적지 안내] 월드가 HUD보다 늦게 복제되어도 기존 실제 조사·채집 프롬프트를 등록한다.
local function bindMeadowQuestWorld(world)
  if not world or world.Name~="FantasySurvivalWorld" then return end
  worldPrompts=world
  for _,descendant in ipairs(world:GetDescendants()) do registerMeadowPrompt(descendant) end
  world.DescendantAdded:Connect(registerMeadowPrompt)
end
if worldPrompts then bindMeadowQuestWorld(worldPrompts) end
workspace.ChildAdded:Connect(bindMeadowQuestWorld)
local questWorldMarker=Instance.new("BillboardGui")
questWorldMarker.Name="MeadowQuestWorldMarker"
questWorldMarker.Size=UDim2.fromOffset(156,36)
questWorldMarker.StudsOffsetWorldSpace=Vector3.new(0,4,0)
questWorldMarker.AlwaysOnTop=true
questWorldMarker.MaxDistance=180
questWorldMarker.Enabled=false
questWorldMarker.Parent=player.PlayerGui
local questMarkerText=Instance.new("TextLabel")
questMarkerText.BackgroundColor3=Color3.fromRGB(19,42,35)
questMarkerText.BackgroundTransparency=.08
questMarkerText.BorderSizePixel=0
questMarkerText.Size=UDim2.fromScale(1,1)
questMarkerText.Text="◆ 현재 의뢰"
questMarkerText.TextColor3=Color3.fromRGB(252,224,153)
questMarkerText.Font=Enum.Font.GothamBold
questMarkerText.TextSize=13
questMarkerText.ZIndex=2
questMarkerText.Parent=questWorldMarker
local questMarkerCorner=Instance.new("UICorner")
questMarkerCorner.CornerRadius=UDim.new(0,8)
questMarkerCorner.Parent=questMarkerText
local function updateMeadowQuestDirection()
  questWorldMarker.Enabled=false
  if not meadowQuestNavLabel or gui.Enabled~=true or gui:GetAttribute("GameMenuOpen")==true then return end
  if player:GetAttribute("ProfileReady")~=true then
    meadowQuestNavLabel.Text="길잡이 · 기록 불러오는 중"
    return
  end
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return end
  local stage=math.clamp(player:GetAttribute("QuestStage") or 1,1,#Config.MainQuests+1)
  local villageStage=math.clamp(player:GetAttribute("VillageContractIndex") or 1,1,#Config.VillageContracts+1)
  local village=Config.VillageContracts[villageStage]
  local villagePhase=player:GetAttribute("VillageContractPhase") or 0
  local villageMask=player:GetAttribute("VillageContractEvidence") or 0
  local best,bestHost,bestDistance=nil,nil,math.huge
  local bestKind="메인 목표"
  for prompt in pairs(guidePrompts) do
    if not prompt:IsDescendantOf(workspace) then
      guidePrompts[prompt]=nil
    elseif prompt.Enabled then
      local host=prompt.Parent
      if host and host:IsA("BasePart") then
        local relevant=false
        local kind="메인 목표"
        if meadowTutorialStep==5 then
          relevant=true
          kind="조작 연습"
        elseif stage==1 and prompt.Name=="MeadowSurvivalInspect" then
          relevant=prompt.ObjectText~="오래된 유적"
        elseif stage==2 and (player:GetAttribute("QuestWood") or 0)==0 then
          relevant=prompt.Name=="GatherPrompt" and prompt.ActionText=="나무 채집"
        elseif stage==5 then
          relevant=prompt.Name=="MeadowSurvivalInspect" and prompt.ObjectText=="숲 가장자리"
        elseif stage>#Config.MainQuests and village then
          kind="마을 서브"
          if villagePhase==0 or villagePhase==2 then
            relevant=prompt.Name=="MeadowVillageInteraction" and prompt.ObjectText=="촌장 나린"
          elseif villagePhase==1 then
            local witnessBit=bit32.lshift(1,village.Witness-1)
            if bit32.band(villageMask,witnessBit)==0 then
              relevant=prompt.Name=="MeadowVillageInteraction" and prompt.ObjectText==village.WitnessName
            elseif bit32.band(villageMask,8)==0 then
              local node=host.Parent
              while node and node~=worldPrompts and node~=workspace do
                if node:GetAttribute("VillageContractIndex")==villageStage then relevant=true;break end
                node=node.Parent
              end
            end
          end
        end
        if relevant then
          local distance=(host.Position-rootPart.Position).Magnitude
          if distance<bestDistance then
            best,bestHost,bestDistance=prompt,host,distance
            bestKind=kind
          end
        end
      end
    end
  end
  if best and bestHost then
    local delta=bestHost.Position-rootPart.Position
    local direction=math.abs(delta.X)>math.abs(delta.Z)
      and (delta.X>0 and "동쪽" or "서쪽")
      or (delta.Z>0 and "남쪽" or "북쪽")
    meadowQuestNavLabel.Text=string.format("◆ %s · %s %d 거리",best.ObjectText,direction,math.floor(bestDistance+.5))
    questMarkerText.Text="◆ "..bestKind
    questWorldMarker.Adornee=bestHost
    questWorldMarker.Enabled=false -- [요청] 화면의 "메인 목표" 말풍선 표시 제거
  elseif meadowTutorialStep==5 then
    meadowQuestNavLabel.Text="◆ 주민·조사 대상 가까이 이동"
  elseif stage==2 and (player:GetAttribute("QuestWood") or 0)>0 then
    meadowQuestNavLabel.Text="◆ 메인 · 돌 채집 지점 탐색"
  elseif stage==3 or stage==4 then
    meadowQuestNavLabel.Text="◆ 메인 · 초원 몬스터 탐색"
  elseif stage==6 then
    meadowQuestNavLabel.Text="◆ 메인 · 마을 서쪽 숲 탐색"
  elseif stage>#Config.MainQuests then
    meadowQuestNavLabel.Text=village and ("◆ 서브 · "..village.Name) or "◆ 의뢰 모두 완료"
  else
    meadowQuestNavLabel.Text="◆ 메인 · 실제 조사 지점 탐색"
  end
end
local guideRefreshElapsed=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  guideRefreshElapsed+=dt
  if guideRefreshElapsed<1.1 then return end
  guideRefreshElapsed=0
  updateMeadowQuestDirection()
end)
updateMeadowQuestDirection()
local function updateMeadowPromptHighlight()
  promptHighlight.Enabled=false
  if gui:GetAttribute("GameMenuOpen")==true then return end
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return end
  for prompt in pairs(shownMeadowPrompts) do
    if prompt.Parent and prompt.Enabled then
      local host=prompt.Parent:IsA("Attachment") and prompt.Parent.Parent or prompt.Parent
      local hostPosition=host and (host:IsA("BasePart") and host.Position
        or host:IsA("Model") and host:GetPivot().Position)
      -- [모바일 상호작용] 멀리 등록된 주민은 실제 활성 거리 밖에서 강조하지 않는다.
      if hostPosition and (hostPosition-rootPart.Position).Magnitude<=prompt.MaxActivationDistance then
        promptHighlight.Adornee=host
        promptHighlight.Enabled=true
        return
      end
    end
  end
end
local promptService=game:GetService("ProximityPromptService")
promptService.PromptShown:Connect(function(prompt)
  local world=workspace:FindFirstChild("FantasySurvivalWorld")
  if world and prompt:IsDescendantOf(world) then shownMeadowPrompts[prompt]=true;updateMeadowPromptHighlight() end
end)
promptService.PromptHidden:Connect(function(prompt)
  shownMeadowPrompts[prompt]=nil;updateMeadowPromptHighlight()
end)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(updateMeadowPromptHighlight)
end

-- [모션·액션] 서버가 승인한 기존 COMBAT 입력만 R15 공용 관절 애니메이션에 연결한다.
-- 서버 피해·이동·콤보 판정, 원래 Animator, 저장값은 수정하지 않는다.
-- 이 경로는 미게시 원본 포즈를 직접 합성하며 실제 재생 QA 전까지 인증된 AnimationTrack이 아니다.
local combatMotionSource = nil
local combatMotionModule = Shared:WaitForChild("RobloxCommonMotion",12)
if combatMotionModule then
  local ok, source = pcall(require, combatMotionModule)
  if ok and type(source) == "table" and source.CreateCombatCombo and source.SampleCombatCombo
    and source.MapCombatPoseToR15 and source.BindJointPose then combatMotionSource = source
  else warn("마력숲 맨손 모션 원본 로딩 실패: "..tostring(source)) end
end
local RunService = game:GetService("RunService")
local authorizedCombatScopes = {}
for _, action in ipairs(Config.Actions) do
  if action.Kind == "COMBAT" then authorizedCombatScopes[action.Id] = true end
end
local dodgePoseUntil=0
local activeCombatCharacter = nil
local activeCombatController = nil
local activeCombatCombo = nil
local activeCombatStartedAt = 0
-- [검 3단계] 실제 연속 입력별 포즈 순서만 추적한다. 공격력·서버 판정·저장값과 무관하다.
local swordComboStage=0
local swordComboAt=0
local swordComboProfile=nil
local swordComboCharacter=nil
local combatPoseTargets = {}
local combatR15Targets = {}
local combatVFX = nil
local vfxModule=Shared:FindFirstChild("RobloxCommonVFX")
if vfxModule then
  local ok,module=pcall(require,vfxModule)
  if ok and type(module)=="table" and type(module.CreateImpactFlash)=="function"
    and type(module.AttachShortTrail)=="function" then combatVFX=module end
end
-- Only server-authorized impact messages may trigger contact sparks.
local lastSoftHitAt=0
remote.OnClientEvent:Connect(function(kind,payload)
  if kind~="MEADOW_IMPACT" or typeof(payload)~="table"
    or typeof(payload.position)~="Vector3" then return end
  local color=payload.boss and Color3.fromRGB(255,164,91)
    or payload.species=="bee" and Color3.fromRGB(255,234,124)
    or Color3.fromRGB(128,250,201)
  if combatVFX then combatVFX.CreateImpactFlash({
    cframe=CFrame.new(payload.position+Vector3.new(0,2,0)),
    color=color,accent=Color3.fromRGB(255,255,237),
    reducedMotion=reducedEffects,count=reducedEffects and 4 or 10,
    scale=payload.boss and 1.4 or .85,
    textureKey="slash",hideRing=true,duration=.22,distance=1.8,
  }) end
  -- [부드러운 타격음] 날카로운 검 휘두르기 대신 기존 내장 착지 둔탁음의 작은 음량 사용.
  -- 연타 소리가 겹쳐 시끄러워지는 것을 0.11초 간격 제한으로 방지한다.
  local soundNow=os.clock()
  if soundNow-lastSoftHitAt>=.11 then
    lastSoftHitAt=soundNow
    local myCharacter=player.Character
    local soundRoot=myCharacter and (myCharacter:FindFirstChild("HumanoidRootPart") or myCharacter.PrimaryPart)
    if soundRoot then
      local impact=Instance.new("Sound")
      impact.Name="MeadowSoftImpact"
      impact.SoundId="rbxasset://sounds/action_jump_land.mp3"
      impact.Volume=payload.finisher and .26 or (payload.boss and .21 or .16)
      impact.PlaybackSpeed=payload.finisher and .88 or .98
      impact.RollOffMinDistance=4
      impact.RollOffMaxDistance=22
      impact.SoundGroup=meadowEffectsGroup
      impact.Parent=soundRoot
      impact:Play()
      game:GetService("Debris"):AddItem(impact,1.2)
      -- 선명한 타격 레이어: 마무리는 묵직한 찌르기 소리를 더한다.
      meadowArt.sfx("hit",payload.finisher and .55 or .38,payload.finisher and .8 or (1.05+math.random()*.2))
      if payload.finisher then meadowArt.sfx("lunge",.35,.9) end
    end
  end
  if meadowArt.impactDetail then pcall(meadowArt.impactDetail,payload) end
  local hitFlash=Instance.new("Frame")
  hitFlash.Name="MeadowHitScreenFeedback"
  hitFlash.Size=UDim2.fromScale(1,1)
  hitFlash.BackgroundColor3=payload.finisher and Color3.fromRGB(255,202,110)
    or Color3.fromRGB(240,250,224)
  hitFlash.BackgroundTransparency=reducedEffects and 1 or (payload.finisher and .93 or .98)
  hitFlash.BorderSizePixel=0
  hitFlash.ZIndex=2
  hitFlash.Parent=gui
  game:GetService("TweenService"):Create(hitFlash,TweenInfo.new(.16),{
    BackgroundTransparency=1
  }):Play()
  game:GetService("Debris"):AddItem(hitFlash,.22)
  if payload.finisher and combatVFX and type(combatVFX.CreateCriticalBurst)=="function" then
    combatVFX.CreateCriticalBurst({
      cframe=CFrame.new(payload.position+Vector3.new(0,2.5,0)),
      reducedMotion=reducedEffects,count=reducedEffects and 3 or 8,
    })
  end
end)

-- [전투 피드백] 서버가 확정한 타격만 데미지 숫자와 보스 체력바로 보여 준다(판정·피해는 건드리지 않는다).
do
  local TweenSvc=game:GetService("TweenService")
  local DebrisSvc=game:GetService("Debris")
  local meadowShakeAmount=0
  local meadowHitStopActive=false
  do
    local hitFlash=Instance.new("Frame")
    hitFlash.Name="MeadowHitFlash";hitFlash.Size=UDim2.fromScale(1,1)
    hitFlash.BackgroundColor3=Color3.fromRGB(255,236,200);hitFlash.BackgroundTransparency=1
    hitFlash.BorderSizePixel=0;hitFlash.Active=false;hitFlash.ZIndex=1;hitFlash.Parent=gui
    game:GetService("RunService").RenderStepped:Connect(function(dt)
      local character=player.Character
      local humanoid=character and character:FindFirstChildOfClass("Humanoid")
      if not humanoid then return end
      if meadowShakeAmount>.01 then
        local a=meadowShakeAmount*.45
        humanoid.CameraOffset=Vector3.new((math.random()-.5)*a,(math.random()-.5)*a,0)
        meadowShakeAmount=meadowShakeAmount*math.max(0,1-dt*9)
      elseif humanoid.CameraOffset.Magnitude>0 then
        humanoid.CameraOffset=Vector3.zero
        meadowShakeAmount=0
      end
    end)
  end
  local function spawnDamageNumber(position,amount,crit,finisher,boss)
    if _G.MeadowDamageNumbersOff then return end
    local holder=Instance.new("Attachment")
    holder.Name="MeadowDamageNumber"
    holder.WorldPosition=position+Vector3.new((math.random()-.5)*1.6,3.2+math.random()*.6,(math.random()-.5)*1.6)
    holder.Parent=workspace.Terrain
    local board=Instance.new("BillboardGui")
    board.Adornee=holder;board.AlwaysOnTop=true;board.LightInfluence=0
    board.Size=UDim2.fromOffset(crit and 120 or 88,crit and 44 or 32);board.StudsOffset=Vector3.zero
    board.MaxDistance=90;board.Parent=holder
    local label=Instance.new("TextLabel")
    label.BackgroundTransparency=1;label.Size=UDim2.fromScale(1,1)
    label.Font=Enum.Font.GothamBlack;label.TextScaled=true
    label.Text=(crit and "치명 " or "")..tostring(math.max(0,math.floor(amount)))
    label.TextColor3=crit and Color3.fromRGB(255,204,72) or finisher and Color3.fromRGB(255,142,94) or boss and Color3.fromRGB(255,190,150) or Color3.fromRGB(240,246,232)
    label.TextStrokeColor3=Color3.fromRGB(20,10,6);label.TextStrokeTransparency=.15
    label.Parent=board
    TweenSvc:Create(holder,TweenInfo.new(.75,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),
      {WorldPosition=holder.WorldPosition+Vector3.new(0,crit and 3.4 or 2.4,0)}):Play()
    TweenSvc:Create(label,TweenInfo.new(.75,Enum.EasingStyle.Quad,Enum.EasingDirection.In),
      {TextTransparency=1,TextStrokeTransparency=1}):Play()
    DebrisSvc:AddItem(holder,.85)
  end
  -- 보스 체력바(화면 위 중앙): 마지막으로 때린 보스·우두머리를 보여 준다.
  local bossFrame=Instance.new("Frame")
  bossFrame.Name="MeadowBossBar";bossFrame.AnchorPoint=Vector2.new(.5,0)
  bossFrame.Position=UDim2.new(.5,0,0,64);bossFrame.Size=UDim2.fromOffset(320,34)
  bossFrame.BackgroundColor3=Color3.fromRGB(14,16,16);bossFrame.BackgroundTransparency=.3
  bossFrame.BorderSizePixel=0;bossFrame.Visible=false;bossFrame.ZIndex=40;bossFrame.Parent=gui
  Instance.new("UICorner",bossFrame).CornerRadius=UDim.new(0,8)
  local bossEdge=Instance.new("UIStroke");bossEdge.Color=Color3.fromRGB(218,189,126);bossEdge.Thickness=1.5;bossEdge.Parent=bossFrame
  local bossName=Instance.new("TextLabel")
  bossName.BackgroundTransparency=1;bossName.Position=UDim2.fromOffset(8,1);bossName.Size=UDim2.new(1,-16,0,16)
  bossName.Font=Enum.Font.GothamBold;bossName.TextSize=13;bossName.TextColor3=Color3.fromRGB(255,236,190)
  bossName.TextXAlignment=Enum.TextXAlignment.Left;bossName.ZIndex=41;bossName.Parent=bossFrame
  local bossTrack=Instance.new("Frame")
  bossTrack.Position=UDim2.fromOffset(8,19);bossTrack.Size=UDim2.new(1,-16,0,10)
  bossTrack.BackgroundColor3=Color3.fromRGB(44,24,24);bossTrack.BorderSizePixel=0;bossTrack.ZIndex=41;bossTrack.Parent=bossFrame
  Instance.new("UICorner",bossTrack).CornerRadius=UDim.new(0,5)
  local bossFill=Instance.new("Frame")
  bossFill.Size=UDim2.fromScale(1,1);bossFill.BackgroundColor3=Color3.fromRGB(204,62,52);bossFill.BorderSizePixel=0
  bossFill.ZIndex=42;bossFill.Parent=bossTrack
  Instance.new("UICorner",bossFill).CornerRadius=UDim.new(0,5)
  local bossModel,bossLastHit=nil,0
  local function refreshBossBar()
    local model=bossModel
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not model or not model.Parent or not root or os.clock()-bossLastHit>12 then bossFrame.Visible=false;return end
    local hp=tonumber(model:GetAttribute("EnemyHealth")) or 0
    local maxHp=math.max(1,tonumber(model:GetAttribute("EnemyMaxHealth")) or 1)
    if hp<=0 or (model:GetPivot().Position-root.Position).Magnitude>140 then bossFrame.Visible=false;return end
    local phase=tonumber(model:GetAttribute("BossPhase")) or 1
    bossName.Text=model.Name..(phase>=2 and "  · 격분" or "")
    bossFill.BackgroundColor3=phase>=2 and Color3.fromRGB(230,110,40) or Color3.fromRGB(204,62,52)
    TweenSvc:Create(bossFill,TweenInfo.new(.18),{Size=UDim2.fromScale(math.clamp(hp/maxHp,0,1),1)}):Play()
    bossFrame.Visible=gui:GetAttribute("GameMenuOpen")~=true
  end
  game:GetService("RunService").Heartbeat:Connect(function()
    if bossModel then refreshBossBar() end
  end)
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind=="MEADOW_BOSS_INTRO" and typeof(payload)=="table" and typeof(payload.model)=="Instance" then
      bossModel=payload.model;bossLastHit=os.clock()
      return
    end
    if kind~="MEADOW_IMPACT" or typeof(payload)~="table" or typeof(payload.position)~="Vector3" then return end
    if typeof(payload.damage)=="number" then
      spawnDamageNumber(payload.position,payload.damage,payload.crit==true,payload.finisher==true,payload.boss==true)
      -- [타격감] 강타·피니셔·보스 타격 때만 짧게 카메라를 흔들고 화면 가장자리를 번쩍인다. 판정과는 무관하다.
      local power=payload.finisher and 1 or (payload.boss and .7 or (payload.crit and .5 or 0))
      if power>0 then
        meadowShakeAmount=math.max(meadowShakeAmount,reducedEffects and power*.5 or power)
        -- [히트스톱] 내 공격 애니메이션만 아주 잠깐 늦춘다(0.07초). 서버 판정·쿨다운과 무관한 표시 효과다.
        if not meadowHitStopActive and power>=.5 then
          local character=player.Character
          local humanoid=character and character:FindFirstChildOfClass("Humanoid")
          local animator=humanoid and humanoid:FindFirstChildOfClass("Animator")
          if animator then
            meadowHitStopActive=true
            local frozen={}
            for _,track in ipairs(animator:GetPlayingAnimationTracks()) do
              frozen[#frozen+1]={track=track,speed=track.Speed}
              track:AdjustSpeed(.12)
            end
            task.delay(power>=1 and .09 or .06,function()
              for _,entry in ipairs(frozen) do
                if entry.track.IsPlaying then entry.track:AdjustSpeed(entry.speed) end
              end
              meadowHitStopActive=false
            end)
          end
        end
        local flash=gui:FindFirstChild("MeadowHitFlash")
        if flash then
          flash.BackgroundTransparency=.82
          TweenSvc:Create(flash,TweenInfo.new(.16),{BackgroundTransparency=1}):Play()
        end
      end
    end
    if payload.boss and typeof(payload.model)=="Instance" then
      bossModel=payload.model;bossLastHit=os.clock()
    end
  end)
end

-- Source-bound Roblox SKILL / VFX packages. Server approval is the only trigger.
-- UI actions never apply local damage, healing, knockback, cooldown or inventory.
local meadowSkillLoaded,meadowSkillPresentation=pcall(require,Shared:FindFirstChild("RobloxCommonSkillPresentation"))
local meadowVfxLoaded,meadowCommonVFX=pcall(require,Shared:FindFirstChild("RobloxCommonVFX"))
if not meadowSkillLoaded or type(meadowSkillPresentation)~="table" then meadowSkillPresentation=nil end
if not meadowVfxLoaded or type(meadowCommonVFX)~="table" then meadowCommonVFX=nil end
local actionsById={}
for _,action in ipairs(Config.Actions) do actionsById[action.Id]=action end
local debris=game:GetService("Debris")
local alreadyPlayedMeadowFX={}
-- [막기 반동] 서버가 실제 타격을 확인한 시점만 관절 반발과 타격 효과를 낸다.
local meadowGuardContactAt=-100
local meadowGuardContactPerfect=false
-- [스킬 고유 모션·타격 연출] 서버가 승인한 스킬마다 모양이 다른 충격파·궤적·입자·카메라 반응을 더한다.
-- 순수 시각 효과이며 피해·판정·쿨다운은 건드리지 않는다. 저사양(reducedEffects)에서는 입자·흔들림을 줄인다.
do
  -- 공용 모듈(RobloxCommonSkillSignature)이 스킬 시그니처 VFX·막기 연출·플레어를 설치한다. 실패해도 게임은 계속된다.
  local okSignature,signatureModule=pcall(function() return require(Shared:WaitForChild("RobloxCommonSkillSignature",10)) end)
  if okSignature and type(signatureModule)=="table" then
    local okInstall,installError=pcall(signatureModule.Install,{
      player=player,gui=gui,Config=Config,actionsById=actionsById,remote=remote,
      meadowArt=meadowArt,combatVFX=combatVFX,reducedEffects=function() return reducedEffects end,
    })
    if not okInstall then warn("SKILL_SIGNATURE_INSTALL_FAILED: "..tostring(installError))
    else meadowArt.signatureHandle=installError end
  else
    warn("SKILL_SIGNATURE_MODULE_MISSING")
  end
end
local function playApprovedMeadowEffect(actionId,overrideVfx,actorUserId,targetPosition,sequence)
  local action=actionsById[actionId]
  actorUserId=typeof(actorUserId)=="number" and actorUserId or player.UserId
  if sequence~=nil then
    local key=tostring(actorUserId)..":"..tostring(sequence)
    if alreadyPlayedMeadowFX[key] then return end
    alreadyPlayedMeadowFX[key]=true
    task.delay(8,function()alreadyPlayedMeadowFX[key]=nil end)
  end
  if not action then return end
  local sourcePlayer=Players:GetPlayerByUserId(actorUserId)
  local character=sourcePlayer and sourcePlayer.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return end
  local position=typeof(targetPosition)=="Vector3" and targetPosition or
    (sourcePlayer and sourcePlayer:GetAttribute("ApprovedActionTarget"))
  if typeof(position)~="Vector3" or (position-rootPart.Position).Magnitude>45 then
    position=rootPart.Position
  end
  if overrideVfx==nil and meadowArt.signature then
    pcall(meadowArt.signature,actionId,rootPart,position,actorUserId==player.UserId)
  end
  -- [서버 적중 확인] 게임이 실제 막기/튕겨내기를 승인한 때만 충격 불꽃을 출력한다.
  -- 상용 액션게임처럼 방어 태세와 타격 피드백을 분리한다. 대형 가짜 방패·3중 원형 파동 금지.
  local confirmedBlock=actionId=="skill-meadow-guard" and overrideVfx=="BLOCK_CONTACT"
  local confirmedParry=actionId=="skill-meadow-parry" and overrideVfx=="PARRY_CONFIRMED"
  if confirmedBlock or confirmedParry then
    local perfect=confirmedParry
    if meadowArt.guardHit then pcall(meadowArt.guardHit,character,rootPart,perfect) end
    meadowArt.guardSide=math.random()<.5 and -1 or 1
    -- [직접 만든 타격 반응] 공용 에셋이 없어도 방패 광휘가 번쩍이고 불꽃이 튄다.
    do
      local hitAnchor=Instance.new("Attachment")
      hitAnchor.Name="MeadowGuardHitAnchor";hitAnchor.Position=Vector3.new(0,1.4,-2.8);hitAnchor.Parent=rootPart
      local flash=Instance.new("ParticleEmitter")
      flash.Texture="rbxasset://textures/particles/smoke_main.dds";flash.Rate=0;flash.Lifetime=NumberRange.new(.3)
      flash.Speed=NumberRange.new(0,0);flash.LightEmission=1
      flash.Color=ColorSequence.new(perfect and Color3.fromRGB(255,226,150) or Color3.fromRGB(200,235,255))
      flash.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,3),NumberSequenceKeypoint.new(1,10)})
      flash.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.1),NumberSequenceKeypoint.new(1,1)})
      flash.Parent=hitAnchor;flash:Emit(1)
      local emitter=Instance.new("ParticleEmitter")
      emitter.Texture="rbxasset://textures/particles/sparkles_main.dds"
      emitter.Rate=0;emitter.Lifetime=NumberRange.new(.25,.5);emitter.Speed=NumberRange.new(14,26)
      emitter.SpreadAngle=Vector2.new(70,70);emitter.LightEmission=1;emitter.Drag=3
      emitter.Color=ColorSequence.new(perfect and Color3.fromRGB(255,214,120) or Color3.fromRGB(190,230,255))
      emitter.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.8),NumberSequenceKeypoint.new(1,0)})
      emitter.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,0),NumberSequenceKeypoint.new(1,1)})
      emitter.Parent=hitAnchor
      emitter:Emit(reducedEffects and 10 or (perfect and 34 or 24))
      debris:AddItem(hitAnchor,.9)
    end
    if meadowCommonVFX and type(meadowCommonVFX.Create)=="function"
      and hasStudioAssetAtom("VFX","IMPACT_FLASH") then
      local ok,err=pcall(meadowCommonVFX.Create,perfect and "PARRY_PERFECT_FLASH" or "BLOCK_IMPACT",{
        parent=workspace,cframe=rootPart.CFrame*CFrame.new(0,1.65,-1.45),
        color=perfect and Color3.fromRGB(255,246,185) or Color3.fromRGB(241,251,255),
        accent=perfect and Color3.fromRGB(255,177,72) or Color3.fromRGB(96,204,255),
        textureKey="slash",hideRing=true,
        duration=reducedEffects and .24 or (perfect and .55 or .42),
        startSize=perfect and 1.6 or 1.1,
        endSize=reducedEffects and 1.8 or (perfect and 6.4 or 4.6),
        count=reducedEffects and (perfect and 9 or 6) or (perfect and 30 or 22),
        distance=perfect and 6.5 or 4,
        reducedMotion=reducedEffects,
      })
      if not ok then warn("마력숲 확인된 막기 이펙트 오류: "..tostring(err)) end
    end
    local impactSound=Instance.new("Sound")
    impactSound.Name=perfect and "MeadowPerfectParryImpact" or "MeadowGuardContactImpact"
    impactSound.SoundId="rbxasset://sounds/action_jump_land.mp3"
    impactSound.Volume=perfect and .8 or .62
    impactSound.PlaybackSpeed=perfect and 1.22 or .78
    impactSound.RollOffMinDistance=4
    impactSound.RollOffMaxDistance=25
    impactSound.SoundGroup=meadowEffectsGroup
    impactSound.Parent=rootPart
    impactSound:Play()
    debris:AddItem(impactSound,1.1)
    if sourcePlayer==player then
      -- [모바일 안전] 화면을 가리지 않는 순간 명멸. 서버의 막기 성공에만 반응한다.
      local impactOverlay=Instance.new("Frame")
      impactOverlay.Name=perfect and "MeadowParryContactFlash" or "MeadowGuardContactFlash"
      impactOverlay.Size=UDim2.fromScale(1,1)
      impactOverlay.BackgroundColor3=perfect and Color3.fromRGB(255,221,146)
        or Color3.fromRGB(178,225,255)
      impactOverlay.BackgroundTransparency=reducedEffects and .975 or (perfect and .80 or .88)
      impactOverlay.BorderSizePixel=0
      impactOverlay.ZIndex=2
      impactOverlay.Parent=gui
      game:GetService("TweenService"):Create(impactOverlay,TweenInfo.new(perfect and .24 or .16),{
        BackgroundTransparency=1,
      }):Play()
      debris:AddItem(impactOverlay,.32)
      -- [막기 타격감] 서버가 막기를 승인한 순간 화면이 짧게 흔들린다(저사양·감소 효과 모드 제외).
      local shakeHumanoid=character:FindFirstChildOfClass("Humanoid")
      if shakeHumanoid and not reducedEffects then
        task.spawn(function()
          local startedAt=os.clock()
          local length=perfect and .32 or .22
          local power=perfect and .55 or .34
          while os.clock()-startedAt<length and shakeHumanoid.Parent do
            local fade=1-(os.clock()-startedAt)/length
            shakeHumanoid.CameraOffset=Vector3.new((math.random()-.5)*power*fade,(math.random()-.5)*power*fade,0)
            task.wait()
          end
          if shakeHumanoid.Parent then shakeHumanoid.CameraOffset=Vector3.zero end
        end)
      end
    end
    return
  end
  -- [막기 준비] 검술 하이 가드의 팔 움직임만 궤적으로 표시한다.
  -- 몸 전체에 파란빛을 칠하거나 입력 때 타격 성공처럼 충격파를 세 번 재생하지 않는다.
  if actionId=="skill-meadow-guard" or actionId=="skill-meadow-parry" then
    local parrying=actionId=="skill-meadow-parry"
    local tint=parrying and Color3.fromRGB(255,215,137) or Color3.fromRGB(193,218,224)
    local tweenService=game:GetService("TweenService")
    for _,side in ipairs(parrying and {"Right"} or {"Left","Right"}) do
      local forearm=character:FindFirstChild(side.."LowerArm")
        or character:FindFirstChild(side.." Arm")
      if forearm and forearm:IsA("BasePart")
        and meadowCommonVFX and type(meadowCommonVFX.AttachShortTrail)=="function" then
        local ok,trail,controller=pcall(meadowCommonVFX.AttachShortTrail,forearm,{
          lifetime=reducedEffects and .16 or .42,
          width=reducedEffects and .38 or .95,
          axis=Vector3.new(0,1,0),length=math.max(.75,forearm.Size.Y*1.15),
          color=tint,
        })
        if ok and trail and controller then
          trail.Name=parrying and "MeadowParryBladeLine" or "MeadowGuardHighArc"
          task.delay(parrying and .30 or .48,function() pcall(controller.Destroy) end)
        end
      end
    end
    if not parrying then
      -- [방어막] 공용 효과 에셋이 없어도 보이도록 Roblox 기본 입자로 푸른 방패 광휘와 불씨를 만든다.
      local life=(tonumber(player:GetAttribute("MeadowTalentDefense")) or 0)>=3 and 3.6 or 2.8
      local oldShield=rootPart:FindFirstChild("MeadowGuardShieldAnchor")
      if oldShield then oldShield:Destroy() end
      local shieldAnchor=Instance.new("Attachment")
      shieldAnchor.Name="MeadowGuardShieldAnchor";shieldAnchor.Position=Vector3.new(0,.5,-2.9);shieldAnchor.Parent=rootPart
      local glow=Instance.new("ParticleEmitter")
      glow.Name="GuardShieldGlow";glow.Texture="rbxasset://textures/particles/smoke_main.dds"
      glow.Rate=0;glow.Lifetime=NumberRange.new(life);glow.Speed=NumberRange.new(0,0);glow.LockedToPart=true
      glow.LightEmission=1;glow.Color=ColorSequence.new(Color3.fromRGB(110,185,255))
      glow.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,1.5),NumberSequenceKeypoint.new(.08,7),
        NumberSequenceKeypoint.new(1,6.2)})
      glow.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.08,.45),
        NumberSequenceKeypoint.new(.9,.6),NumberSequenceKeypoint.new(1,1)})
      glow.Parent=shieldAnchor
      if meadowArt.guardShield then pcall(meadowArt.guardShield,character,rootPart,life) end
      local embers=Instance.new("ParticleEmitter")
      embers.Name="GuardShieldEmbers";embers.Texture="rbxasset://textures/particles/sparkles_main.dds"
      embers.Rate=reducedEffects and 6 or 22;embers.Lifetime=NumberRange.new(.5,.9);embers.Speed=NumberRange.new(1,3)
      embers.SpreadAngle=Vector2.new(180,180);embers.LightEmission=1;embers.LockedToPart=true
      embers.Color=ColorSequence.new(Color3.fromRGB(190,230,255))
      embers.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.7),NumberSequenceKeypoint.new(1,0)})
      embers.Parent=shieldAnchor
      -- 시작 순간 한 번 크게 번쩍이는 충격 링.
      local startBurst=Instance.new("ParticleEmitter")
      startBurst.Name="GuardStartBurst";startBurst.Texture="rbxasset://textures/particles/smoke_main.dds"
      startBurst.Rate=0;startBurst.Lifetime=NumberRange.new(.35);startBurst.Speed=NumberRange.new(0,0)
      startBurst.LightEmission=1;startBurst.Color=ColorSequence.new(Color3.fromRGB(230,245,255))
      startBurst.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,2),NumberSequenceKeypoint.new(1,12)})
      startBurst.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.2),NumberSequenceKeypoint.new(1,1)})
      startBurst.Parent=shieldAnchor
      task.delay(life,function() embers.Enabled=false;embers.Rate=0 end)
      debris:AddItem(shieldAnchor,life+1)
      -- [유지 태세] 지속시간 2.8초에 맞춘 약한 호박색 윤곽만 남긴다.
      local aura=Instance.new("Highlight")
      aura.Name="MeadowGuardStanceAura"
      aura.Adornee=character
      aura.DepthMode=Enum.HighlightDepthMode.Occluded
      aura.FillColor=Color3.fromRGB(120,190,255)
      aura.FillTransparency=reducedEffects and .95 or .72
      aura.OutlineColor=Color3.fromRGB(190,235,255)
      aura.OutlineTransparency=reducedEffects and .5 or .05
      if not reducedEffects then
        -- [시작 임팩트] 방어 자세를 잡는 순간 강하게 빛났다가 유지 윤곽으로 가라앉는다.
        aura.FillTransparency=.35
        tweenService:Create(aura,TweenInfo.new(.35,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{FillTransparency=.72}):Play()
      end
      aura.Parent=character
      task.delay(2.35,function()
        if aura.Parent then
          tweenService:Create(aura,TweenInfo.new(.4),{
            FillTransparency=1,OutlineTransparency=1,
          }):Play()
        end
      end)
      debris:AddItem(aura,2.85)
    end
    return
  end
  local isDodge=actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right"
  local leadingSide=actionId=="skill-meadow-dodge-left" and "Left" or "Right"
  local hostPart=(isDodge and (
    character:FindFirstChild(leadingSide.."Foot")
    or character:FindFirstChild(leadingSide.."LowerLeg")
    or character:FindFirstChild(leadingSide.." Leg")))
    or character:FindFirstChild("RightHand") or rootPart
  local warm=Color3.fromRGB(132,245,169)
  local accent=Color3.fromRGB(231,255,189)
  if actionId=="skill-meadow-bolt" then warm=Color3.fromRGB(128,197,255) end
  if actionId=="skill-meadow-heavy" or actionId=="skill-meadow-sweep" then
    warm=Color3.fromRGB(255,187,109)
  end
  local settings={
    parent=workspace,cframe=CFrame.new(position),hostPart=hostPart,
    startPosition=hostPart.Position,endPosition=position,
    color=warm,accent=accent,duration=.46,
    radius=actionId=="skill-meadow-sweep" and 10 or 4,
    scale=1,autoCleanup=true,reducedMotion=UserInputService.TouchEnabled,
    vfx=meadowCommonVFX,
  }
  -- [회피 바람] 1단·2단·3단의 팔·다리 궤적을 기존 공용 광선 텍스처로 강조한다.
  if isDodge then
    if meadowCommonVFX and type(meadowCommonVFX.AttachShortTrail)=="function" then
      for _,side in ipairs({"Left","Right"}) do
        for _,limb in ipairs({"LowerLeg","LowerArm"}) do
          local part=character:FindFirstChild(side..limb)
            or (limb=="LowerLeg" and character:FindFirstChild(side.." Leg"))
            or (limb=="LowerArm" and character:FindFirstChild(side.." Arm"))
          if part and part:IsA("BasePart") then
            local ok,trail,controller=pcall(meadowCommonVFX.AttachShortTrail,part,{
              lifetime=reducedEffects and .16 or .42,
              width=reducedEffects and .43 or 1.18,
              axis=limb=="LowerLeg" and Vector3.new(1,0,0) or Vector3.new(0,1,0),
              length=math.max(.78,part.Size.Y*1.48),
              color=side==leadingSide and Color3.fromRGB(82,204,255)
                or Color3.fromRGB(251,198,103),
            })
            if ok and trail and controller then
              trail.Name="MeadowDodgeCinemaTrail"..side..limb
              task.delay(1.24,function() pcall(controller.Destroy) end)
            end
          end
        end
      end
    end
    local aura=Instance.new("Highlight")
    aura.Name="MeadowDodgeSpinAura"
    aura.Adornee=character
    aura.DepthMode=Enum.HighlightDepthMode.Occluded
    aura.FillColor=Color3.fromRGB(96,181,255)
    aura.FillTransparency=reducedEffects and .94 or .72
    aura.OutlineColor=Color3.fromRGB(244,218,147)
    aura.OutlineTransparency=reducedEffects and .65 or .08
    aura.Parent=character
    task.delay(.68,function()
      if aura.Parent then game:GetService("TweenService"):Create(aura,TweenInfo.new(.42),{
        FillTransparency=1,OutlineTransparency=1,
      }):Play() end
    end)
    debris:AddItem(aura,1.18)
    -- [회피 5단] 슬립/페인트/스텝/위빙/덤블링에 기존 공용 파동을 단계별로 연동.
    if meadowCommonVFX and type(meadowCommonVFX.Create)=="function"
      and hasStudioAssetAtom("VFX","IMPACT_FLASH") then
      local dodgeStage=math.clamp(tonumber(character:GetAttribute("MeadowDodgeStage")) or 1,1,5)
      local pulses=dodgeStage>=5 and {{.02,5},{.44,5}} or {{.04,dodgeStage},{.2,dodgeStage}}
      for _,pulse in ipairs(pulses) do
        local index,delaySec=pulse[2],pulse[1]
        task.delay(delaySec,function()
          if not rootPart.Parent or not character.Parent then return end
          local color=index==5 and Color3.fromRGB(255,222,155)
            or index%2==0 and Color3.fromRGB(255,210,127) or Color3.fromRGB(117,214,255)
          local accent=index%2==0 and Color3.fromRGB(255,153,77) or Color3.fromRGB(239,249,255)
          local ok,err=pcall(meadowCommonVFX.Create,
            index==5 and "SHAPE_BURST" or "DODGE_EVASION_PULSE",{
              parent=workspace,cframe=rootPart.CFrame*CFrame.new(0,-1.55,0),
              duration=reducedEffects and .21 or .42,
              color=color,accent=accent,
              startDiameter=index==5 and 2.6 or 1.3,
              endDiameter=reducedEffects and 3.4 or (index==5 and 10.8 or 6.2),
              startSize=.46,endSize=reducedEffects and .9 or 2.6,
              count=reducedEffects and 2 or (index==5 and 15 or 9),
              reducedMotion=reducedEffects,
            })
          if not ok then warn("마력숲 회피 파동 오류: "..tostring(err)) end
        end)
      end
    end
  end
  local selectedFx=overrideVfx or action.VfxAtom
  if meadowCommonVFX and selectedFx and hasStudioAssetAtom("VFX","IMPACT_FLASH") then
    local ok,err=pcall(meadowCommonVFX.Create,selectedFx,settings)
    if not ok then warn("마력숲 VFX source unavailable: "..tostring(err)) end
  end
  if meadowSkillPresentation and not overrideVfx and action.SkillAtom and action.SkillAtom~="SKILL_ICON_BADGE" and hasStudioAssetAtom("SKILL","CAST_HAND") then
    local ok,result,controller=pcall(meadowSkillPresentation.Create,action.SkillAtom,settings)
    if ok then
      if action.SkillAtom=="SHIELD_SHELL" and typeof(result)=="Instance" then
        debris:AddItem(result,2.8)
      elseif (action.SkillAtom=="DASH_STREAK" or action.SkillAtom=="SKILL_TRAIL") and controller then
        task.delay(.65,function() pcall(function()controller.Destroy() end) end)
      end
    else
      warn("마력숲 skill source unavailable: "..tostring(result))
    end
  end
end
player:GetAttributeChangedSignal("ApprovedActionFX"):Connect(function()
  local id,seq=tostring(player:GetAttribute("ApprovedActionFX") or ""):match("^([^:]+):(%d+)$")
  if id and seq then playApprovedMeadowEffect(id,nil,player.UserId,nil,tonumber(seq)) end
end)
remote.OnClientEvent:Connect(function(kind,payload,actionId,sequence,targetPosition)
  if kind=="MEADOW_ACTION_FX" then
    playApprovedMeadowEffect(actionId,nil,payload,targetPosition,sequence)
  elseif kind=="MEADOW_REACTION" and payload=="BLOCK" then
    -- [실제 방어 적중] 서버가 경감한 공격의 충격만 1회 재생한다.
    meadowGuardContactAt=os.clock()
    meadowGuardContactPerfect=false
    playApprovedMeadowEffect("skill-meadow-guard","BLOCK_CONTACT",player.UserId)
  elseif kind=="MEADOW_REACTION" and payload=="PARRY" then
    -- [완벽 막기] 실제 공격을 튕겼을 때만 금빛 충격과 몸통 반동을 출력한다.
    meadowGuardContactAt=os.clock()
    meadowGuardContactPerfect=true
    playApprovedMeadowEffect("skill-meadow-parry","PARRY_CONFIRMED",player.UserId)
  end
end)


-- [맨손 액션] 연타는 승인된 입력마다 1~5단의 고유 R15 관절 모션을 하나씩 사용한다.
-- 다른 무술의 5타 연속 시각 연출과 서버의 피해·적중·보상·쿨다운은 변경하지 않는다.
local basicUnarmedMoves={
  "U:JAB_LEFT","U:CROSS_RIGHT","U:HOOK_LEFT","U:ELBOW_RIGHT","U:FRONT_KICK_R",
}
-- [전신 무술] 4종 × 각 5타의 원본 키포즈를 관절별로 대폭 확장한다.
-- 허리·어깨·골반 회전 및 무릎과 공중 중심 이동만 조절한다. HRP/서버 물리 이동·피해량은 불변.
local function martialShot(key)
  local yaw,lean,twist,armL,armR,hipL,hipR,kneeL,kneeR,rise,elbowL,elbowR=unpack(key)
  local deg=math.rad
  return {
    Root=CFrame.new(0,math.clamp((rise or 0)*2.4,-.55,1.9),0)*
      CFrame.Angles(deg(lean*.47),deg(yaw*1.16),deg(twist*.23)),
    Spine=CFrame.Angles(deg(math.clamp(lean*1.43,-82,82)),deg(twist*1.32),deg(-twist*.40)),
    Chest=CFrame.Angles(deg(-lean*.49),deg(twist*.82),deg(twist*.27)),
    Head=CFrame.Angles(deg(-lean*.25),deg(-twist*.57),0),
    UpperArmL=CFrame.Angles(deg(math.clamp(armL*1.36,-166,150)),deg(-twist*.36),deg(-31-twist*.19)),
    UpperArmR=CFrame.Angles(deg(math.clamp(armR*1.36,-166,150)),deg(twist*.36),deg(31-twist*.19)),
    ForearmL=CFrame.Angles(deg(math.clamp((elbowL or -65)*1.16,-168,24)),0,deg(-17)),
    ForearmR=CFrame.Angles(deg(math.clamp((elbowR or -65)*1.16,-168,24)),0,deg(17)),
    ThighL=CFrame.Angles(deg(math.clamp(hipL*1.34,-162,125)),deg(twist*.24),deg(-15)),
    ThighR=CFrame.Angles(deg(math.clamp(hipR*1.34,-162,125)),deg(-twist*.24),deg(15)),
    ShinL=CFrame.Angles(deg(math.clamp(kneeL*1.11,-35,145)),0,0),
    ShinR=CFrame.Angles(deg(math.clamp(kneeR*1.11,-35,145)),0,0),
    FootL=CFrame.Angles(deg(-kneeL*.26),0,0),
    FootR=CFrame.Angles(deg(-kneeR*.26),0,0),
  }
end
-- 수치는 각 타격의 [루트회전, 전후기울기, 허리꼬임, 좌/우팔,
-- 좌/우허벅지, 좌/우무릎, 공중중심, 좌/우팔꿈치]를 지정한다.
-- 같은 동작을 다섯 번 복사하지 않고 총 40개의 독립된 영화식 키포즈를 저작한다.
local martialSkillTracks={
  ["meadow-unarmed-rush"]={
    name="FLASH_BOXING",speed=1.12,color=Color3.fromRGB(255,209,104),trailWidth=1.16,
    beats={
      {id="U:JAB_LEFT",
       load={-23,18,-31,-50,-58,27,-24,22,18,-.07,-78,-84},
       hit={28,-25,39,-122,-57,-32,30,8,28,.06,-10,-72}},
      {id="U:CROSS_RIGHT",
       load={35,15,42,-58,-67,-19,32,17,11,-.04,-81,-85},
       hit={-35,-29,-48,-48,-133,35,-31,30,7,.08,-78,-8}},
      {id="U:HOOK_LEFT",
       load={-39,12,-48,-72,-54,32,-26,24,16,-.08,-87,-79},
       hit={38,-25,55,-86,-45,-36,34,8,27,.07,-99,-69}},
      {id="U:HOOK_RIGHT",
       load={44,18,48,-54,-78,-23,35,16,23,-.06,-84,-92},
       hit={-41,-29,-54,-49,-98,36,-35,27,9,.10,-74,-102}},
      {id="U:BACKFIST_LEFT",
       load={-45,16,-47,-96,-53,35,-25,18,19,-.07,-110,-81},
       hit={49,-38,67,-128,-51,-38,44,8,32,.16,-23,-77}},
    },
  },
  ["meadow-unarmed-uppercut"]={
    name="RISING_DRAGON",speed=.92,color=Color3.fromRGB(255,151,105),trailWidth=1.24,
    beats={
      {id="U:UPPERCUT_RIGHT",
       load={-18,39,-23,-52,-24,50,48,68,71,-.18,-94,-119},
       hit={22,-34,32,-42,-136,-31,-41,8,5,.10,-73,-96}},
      {id="U:UPPERCUT_LEFT",
       load={25,43,28,-18,-65,46,49,74,80,-.17,-122,-97},
       hit={-27,-35,-38,-143,-44,-39,-34,7,8,.14,-93,-74}},
      {id="U:CROSS_RIGHT",
       load={-24,31,-29,-57,-35,39,47,68,58,-.16,-74,-98},
       hit={31,-31,48,-47,-132,-41,38,12,24,.14,-71,-9}},
      {id="U:UPPERCUT_LEFT",
       load={30,44,38,-33,-60,43,51,76,76,-.19,-127,-86},
       hit={-34,-42,-46,-151,-52,-44,-37,7,4,.23,-100,-63}},
      {id="U:UPPERCUT_RIGHT",
       load={-30,53,-47,-54,-34,54,55,91,92,-.21,-89,-124},
       hit={64,-65,76,-88,-169,-48,-56,24,27,.82,-64,-16}},
    },
  },
  ["meadow-unarmed-kick"]={
    name="TORNADO_TAEKWONDO",speed=.96,color=Color3.fromRGB(111,241,237),trailWidth=1.42,
    beats={
      {id="U:LOW_KICK_R",
       load={0,21,-33,-50,-43,26,51,17,85,-.08,-82,-87},
       hit={49,-22,43,-67,-83,23,-66,26,10,.06,-82,-79}},
      {id="U:ROUND_KICK_R",
       load={77,11,42,-58,-72,39,42,30,91,-.06,-80,-75},
       hit={152,-27,-65,-104,-38,45,-126,17,4,.56,-59,-75}},
      {id="U:SIDE_KICK_L",
       load={151,18,-49,-78,-48,59,30,94,25,-.09,-69,-78},
       hit={228,-33,65,-43,-119,-127,38,3,30,.71,-85,-76}},
      {id="U:FRONT_KICK_R",
       load={235,12,42,-67,-58,35,63,21,94,-.07,-65,-86},
       hit={312,-36,-61,-113,-48,39,-138,27,3,.87,-80,-75}},
      {id="U:ROUND_KICK_L",
       load={325,24,-64,-106,-51,75,27,74,27,.36,-68,-78},
       hit={432,-43,79,-43,-130,-149,47,2,30,1.19,-74,-81}},
    },
  },
  ["meadow-unarmed-elbow"]={
    name="CLOSE_QUARTERS_MUAY_THAI",speed=1.08,color=Color3.fromRGB(168,143,255),trailWidth=1.18,
    beats={
      {id="U:ELBOW_RIGHT",
       load={-37,24,-51,-71,-91,44,39,54,41,-.13,-113,-141},
       hit={29,-29,58,-48,-88,-36,39,6,41,.06,-112,-151}},
      {id="U:KNEE_LEFT",
       load={22,32,42,-91,-85,34,43,44,51,-.15,-119,-112},
       hit={-25,-25,-35,-133,-109,-110,47,118,36,.15,-128,-111}},
      {id="U:ELBOW_LEFT",
       load={-39,19,-48,-110,-89,39,45,37,52,-.13,-141,-111},
       hit={31,-29,56,-91,-44,42,-34,39,8,.10,-148,-104}},
      {id="U:KNEE_RIGHT",
       load={39,33,48,-78,-112,39,35,44,42,-.16,-118,-126},
       hit={-30,-26,-43,-114,-132,48,-116,32,121,.17,-108,-129}},
      {id="U:DIAGONAL_KNEE_LEFT",
       load={-44,29,-52,-119,-93,53,45,57,61,-.17,-127,-115},
       hit={43,-38,64,-147,-99,-119,55,125,41,.22,-142,-116}},
    },
  },
}
for _,style in pairs(martialSkillTracks) do
  for _,beat in ipairs(style.beats) do
    beat.loadPose=martialShot(beat.load)
    beat.hitPose=martialShot(beat.hit)
  end
end
-- [스킬 전용 관절 모션] 스킬 × 무기군별로 직접 저작한 키프레임. 기존 맨손 승룡권 5타와 같은 12값 키포즈(martialShot)를 쓰고
-- 루트 공중 회전·상승을 더해 승룡·회축·덤블링 같은 전신 동작을 만든다. 시각 전용이며 판정·이동 권한은 서버가 가진다.
-- 튜플: 루트회전,전후기울기,허리꼬임,좌팔,우팔,좌허벅지,우허벅지,좌무릎,우무릎,상승,좌팔꿈치,우팔꿈치,[공중축회전,공중피치,공중높이]
do
  local R0={0,6,0,-45,-45,-8,12,10,18,0,-80,-80}
  local function K(t,...) return {t=t,v={...}} end
  local function Kc(t,...) return {t=t,v={...},c=true} end
  local B,F,BOWV,STV={},{},{},{}
  -- ───── 기본(한손 검·도구) ─────
  B.slam={dur=.95,keys={K(0,unpack(R0)),
    K(.26,18,34,22,-158,-172,-18,24,28,42,.14,-40,-48,0,0,.1),
    K(.40,8,14,8,-150,-168,-30,10,20,30,.34,-30,-40,0,-8,.45),
    Kc(.52,-34,-52,-52,-75,-52,-48,20,70,18,-.2,-30,-12,0,6,-.1),
    K(.68,-30,-46,-46,-72,-55,-44,20,62,18,-.16,-34,-16,0,4,-.08),K(.95,unpack(R0))}}
  B.strike={dur=.65,keys={K(0,unpack(R0)),
    K(.2,40,12,45,-60,-120,-10,18,20,30,0,-90,-60),
    Kc(.34,-48,-30,-62,-50,-96,-34,26,48,20,.05,-80,-14),
    K(.5,-44,-26,-56,-52,-98,-30,24,44,20,.04,-80,-20),K(.65,unpack(R0))}}
  B.sweep={dur=.9,keys={K(0,unpack(R0)),
    K(.2,50,10,40,-80,-95,-10,22,28,36,-.05,-50,-50,0,0,0),
    Kc(.4,-80,-10,-70,-85,-90,-40,25,40,34,.08,-20,-15,-200,0,.1),
    K(.62,-80,-10,-70,-85,-90,-30,20,36,30,.04,-20,-15,-360,0,.04),
    K(.9,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,-360,0,0)}}
  B.dash={dur=.55,keys={K(0,unpack(R0)),
    K(.14,25,22,30,-50,-95,-40,35,60,20,-.1,-90,-130),
    Kc(.28,-35,-60,-50,-60,-92,-80,45,20,8,-.18,-60,-8),
    K(.42,-32,-52,-46,-62,-92,-76,42,22,10,-.16,-60,-10),K(.55,unpack(R0))}}
  B.stun={dur=.8,keys={K(0,unpack(R0)),
    K(.22,-20,14,-30,-40,-110,30,-20,25,20,.1,-90,-130),
    Kc(.38,30,-28,45,-100,-50,-118,20,105,12,.2,-20,-60,0,0,.15),
    K(.52,26,-22,38,-96,-54,-112,20,100,14,.16,-24,-60,0,0,.1),K(.8,unpack(R0))}}
  B.fury={dur=1.15,keys={K(0,unpack(R0)),
    K(.3,0,-20,0,-10,-12,-15,20,60,62,-.2,-40,-40),
    K(.55,0,30,0,-170,-170,-8,10,8,10,.32,-20,-20,0,0,.3),
    Kc(.75,-20,-48,-40,-62,-82,-44,22,60,20,-.15,-20,-12),
    K(.9,-18,-44,-36,-62,-80,-40,22,58,20,-.14,-24,-14),K(1.15,unpack(R0))}}
  B.multi={dur=1.0,keys={K(0,unpack(R0)),
    Kc(.14,45,-8,58,-100,-50,-30,22,40,24,.04,-30,-70),
    Kc(.28,-48,-16,-60,-52,-96,-30,22,44,22,.04,-70,-14),
    Kc(.42,50,-10,62,-120,-40,-26,24,38,26,.06,-14,-80),
    Kc(.56,-52,-18,-66,-44,-110,-34,24,46,20,.05,-80,-10),
    Kc(.72,0,-50,0,-130,-130,-50,22,70,18,-.15,-10,-10),
    K(.85,-4,-44,-4,-124,-124,-46,22,66,18,-.12,-14,-14),K(1.0,unpack(R0))}}
  B.pierce={dur=.85,keys={K(0,unpack(R0)),
    K(.3,50,10,55,-90,-70,-20,30,50,24,.02,-20,-140),
    Kc(.45,-45,-40,-70,-110,-95,-60,40,30,8,-.1,-8,-5),
    K(.62,-42,-36,-66,-108,-94,-56,38,32,10,-.08,-8,-6),K(.85,unpack(R0))}}
  B.backstab={dur=.6,keys={K(0,unpack(R0)),
    K(.15,10,-50,10,-40,-30,-20,30,80,70,-.3,-60,-120,0,0,-.1),
    Kc(.3,-70,-30,-75,-60,-105,-30,30,40,12,-.05,-60,-10,-90,0,0),
    K(.45,-60,-26,-66,-62,-100,-28,28,40,14,-.04,-60,-14,-90,0,0),K(.6,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,-90,0,0)}}
  B.ultimate={dur=2.0,keys={K(0,unpack(R0)),
    K(.4,0,-24,0,-14,-14,-20,20,70,72,-.3,-40,-40),
    K(.85,0,26,0,-165,-165,-6,6,6,6,.5,-20,-20,180,-6,.6),
    K(1.1,0,28,0,-170,-170,-6,6,6,6,.7,-18,-18,360,-8,.9),
    Kc(1.38,-24,-62,-30,-70,-90,-50,18,70,16,-.25,-12,-8,360,10,-.2),
    K(1.6,-22,-56,-28,-68,-88,-48,18,66,16,-.2,-14,-10,360),K(2.0,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,360)}}
  B.chain={dur=.75,keys={K(0,unpack(R0)),
    K(.2,55,6,50,-120,-60,-14,18,24,28,0,-20,-80),
    Kc(.36,-50,-12,-60,-60,-110,-20,22,30,24,.02,-70,-10),
    K(.55,-30,-8,-30,-70,-96,-16,20,28,24,.02,-60,-30),K(.75,unpack(R0))}}
  B.bolt={dur=.65,keys={K(0,unpack(R0)),
    K(.18,15,10,18,-60,-40,-12,16,20,30,0,-90,-125),
    Kc(.3,-20,-18,-28,-70,-92,-30,18,40,16,.03,-70,-5),
    K(.48,-18,-16,-24,-72,-92,-28,18,38,16,.03,-72,-6),K(.65,unpack(R0))}}
  B.burst={dur=.9,keys={K(0,unpack(R0)),
    K(.3,0,12,0,-82,-82,-10,14,28,30,.04,-120,-120),
    Kc(.5,0,-28,0,-96,-96,-32,18,44,14,.08,-6,-6),
    K(.7,0,-24,0,-94,-94,-30,18,42,14,.06,-8,-8),K(.9,unpack(R0))}}
  B.rain={dur=1.05,keys={K(0,unpack(R0)),
    K(.36,10,26,8,-100,-172,-14,18,16,26,.14,-60,-20),
    Kc(.62,-14,-34,-18,-70,-52,-34,18,52,20,-.05,-40,-14),
    K(.8,-12,-30,-16,-72,-54,-30,18,48,20,-.04,-40,-16),K(1.05,unpack(R0))}}
  B.root={dur=.9,keys={K(0,unpack(R0)),
    K(.3,0,8,0,-70,-70,-90,12,110,18,.2,-70,-70),
    Kc(.46,0,-38,0,-30,-30,-20,10,60,12,-.2,-12,-12),
    K(.7,0,-34,0,-28,-28,-18,10,58,12,-.18,-14,-14),K(.9,unpack(R0))}}
  B.mark={dur=.75,keys={K(0,unpack(R0)),
    K(.22,-20,6,-26,-20,-95,-8,14,16,24,0,-135,-4),
    K(.4,-22,4,-28,-18,-96,-8,14,16,24,0,-135,-3),
    K(.58,-22,4,-28,-18,-96,-8,14,16,24,0,-135,-3),K(.75,unpack(R0))}}
  B.heal={dur=1.2,keys={K(0,unpack(R0)),
    K(.35,0,2,0,-20,-20,-6,10,10,16,.02,-30,-30),
    K(.7,0,16,0,-150,-150,-6,8,8,10,.16,-20,-20),
    K(.95,0,18,0,-146,-146,-6,8,8,10,.18,-22,-22),K(1.2,unpack(R0))}}
  B.healaoe=B.heal
  B.kick={dur=.6,keys={K(0,unpack(R0)),
    K(.14,10,14,8,-70,-60,-6,10,12,100,.05,-100,-90),
    Kc(.26,-20,26,-24,-100,-30,10,-105,40,8,.14,-60,-70,0,0,.1),
    K(.4,-16,22,-20,-96,-34,10,-98,40,12,.1,-60,-70),K(.6,unpack(R0))}}
  B.rush={dur=.6,keys={K(0,unpack(R0)),
    K(.1,10,-30,12,-60,-70,-30,24,60,50,-.12,-130,-130),
    Kc(.22,-30,-60,-34,-104,-104,-70,36,34,10,-.18,-132,-132),
    K(.4,-26,-52,-30,-100,-100,-64,34,32,12,-.15,-132,-132),K(.6,unpack(R0))}}
  B.buff={dur=1.1,keys={K(0,unpack(R0)),
    K(.32,0,-16,0,-72,-72,-14,20,48,52,-.12,-150,-150),
    Kc(.55,0,16,0,-22,-22,-8,10,10,12,.22,-18,-18),
    K(.8,0,12,0,-30,-30,-8,12,12,14,.12,-30,-30),K(1.1,unpack(R0))}}
  B.oath={dur=1.7,keys={K(0,unpack(R0)),
    K(.45,0,-12,0,-40,-100,-92,-8,100,92,-.4,-80,-60),
    K(.9,0,10,0,-48,-170,-92,-8,100,92,-.36,-60,-8),
    K(1.3,0,12,0,-48,-172,-92,-8,100,92,-.36,-60,-8),K(1.7,unpack(R0))}}
  B.smoke={dur=.65,keys={K(0,unpack(R0)),
    K(.18,10,-40,10,-80,-80,-12,24,70,70,-.3,-140,-140),
    Kc(.4,0,-10,0,-90,-90,-12,18,30,30,.05,-100,-100,-270,0,0),
    K(.65,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,-360)}}
  B.guard={dur=.8,keys={K(0,unpack(R0)),
    K(.15,0,-8,0,-100,-100,-12,16,36,36,-.04,-130,-130),
    K(.55,0,-8,0,-100,-100,-12,16,36,36,-.04,-130,-130),K(.8,unpack(R0))}}
  B.parry={dur=.55,keys={K(0,unpack(R0)),
    K(.12,20,2,25,-70,-60,-12,16,24,26,0,-100,-100),
    Kc(.24,-30,-14,-40,-80,-120,-20,18,34,20,.02,-60,-10),K(.55,unpack(R0))}}
  -- ───── 맨손: 승룡권급 전신 기술 ─────
  F.slam={dur=1.05,keys={K(0,unpack(R0)),
    K(.16,25,34,32,-45,-70,5,-10,70,80,-.28,-100,-125,0,0,-.1),
    Kc(.30,-30,-8,-42,-60,-165,-35,-55,20,110,.6,-90,-20,90,-14,.4),
    K(.48,-20,18,-30,-50,-160,-30,-40,40,95,.55,-90,-40,220,-10,.55),
    K(.66,-25,-30,-20,-70,-90,-28,20,60,30,-.08,-60,-60,360,0,0),K(1.05,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,360)}}
  F.sweep={dur=.95,keys={K(0,unpack(R0)),
    K(.18,40,10,30,-55,-95,-30,10,40,60,-.1,-70,-90),
    Kc(.38,-10,22,-30,-95,-70,-30,-110,40,6,.3,-30,-40,-300,0,.25),
    K(.6,-8,12,-24,-70,-60,-20,20,50,40,.0,-60,-60,-360,0,0),K(.95,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,-360)}}
  F.dash={dur=.7,keys={K(0,unpack(R0)),
    K(.14,25,10,20,-50,-70,10,0,60,80,-.28,-100,-120),
    Kc(.30,0,42,0,-120,-45,25,-100,90,5,.55,-20,-80,0,-55,.4),
    K(.46,0,30,0,-110,-50,20,-90,80,10,.3,-30,-80,0,-30,.1),K(.7,unpack(R0))}}
  F.multi={dur=1.2,keys={K(0,unpack(R0)),
    Kc(.1,28,-25,39,-122,-57,-32,30,8,28,.06,-10,-72),
    Kc(.2,-35,-29,-48,-48,-133,35,-31,30,7,.08,-78,-8),
    Kc(.3,38,-25,55,-86,-45,-36,34,8,27,.07,-99,-69),
    Kc(.4,-41,-29,-54,-49,-98,36,-35,27,9,.1,-74,-102),
    Kc(.5,28,-25,39,-122,-57,-32,30,8,28,.06,-10,-72),
    Kc(.6,-35,-29,-48,-48,-133,35,-31,30,7,.08,-78,-8),
    Kc(.7,38,-25,55,-86,-45,-36,34,8,27,.07,-99,-69),
    Kc(.8,-41,-29,-54,-49,-98,36,-35,27,9,.1,-74,-102),
    K(.88,-5,22,-10,-60,-150,-20,14,50,60,.0,-80,-20),
    Kc(.98,-25,-34,-32,-60,-168,-34,-40,20,100,.5,-90,-15,0,-12,.35),K(1.2,unpack(R0))}}
  F.ultimate={dur=2.2,keys={K(0,unpack(R0)),
    K(.5,0,-28,0,-16,-16,-20,20,80,84,-.34,-40,-40),
    K(1.0,0,24,0,-170,-170,-6,-60,6,100,.9,-20,-20,360,-10,1.1),
    K(1.25,0,26,0,-172,-172,-6,-70,6,100,1.1,-18,-18,720,-12,1.5),
    Kc(1.5,-18,-70,-24,-30,-110,-30,15,100,10,-.3,-10,-6,720,-58,-.2),
    K(1.75,-14,-58,-20,-34,-100,-30,15,90,14,-.25,-14,-10,720,-20),K(2.2,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,720)}}
  F.stun={dur=.8,keys={K(0,unpack(R0)),
    K(.18,-10,14,-20,-80,-110,20,-10,30,40,.0,-90,-110),
    Kc(.34,0,-12,0,-150,-150,0,-125,20,125,.5,-80,-80,0,0,.2),
    K(.52,0,-8,0,-130,-130,0,-100,20,100,.3,-80,-80),K(.8,unpack(R0))}}
  -- ───── 활: 시위를 당겨 쏘는 동작 ─────
  local BOW0={45,2,28,-88,-62,-12,14,12,22,0,-6,-105}
  local DRAW={52,0,38,-92,-92,-14,16,14,24,0,-3,-152}
  local REL={50,5,34,-92,-70,-14,16,14,24,0,-3,-95}
  local function bowKeys(list)
    local keys={K(0,unpack(R0))}
    for _,e in ipairs(list) do keys[#keys+1]={t=e[1],c=e[3],v=e[2]} end
    return keys
  end
  local function shift(v,i,add) local c=table.clone(v);c[i]=(c[i] or 0)+add;return c end
  local DRAWK=shift(shift(shift(shift(DRAW,9,50),8,16),10,-.25),2,-4)
  local RELK=shift(shift(shift(shift(REL,9,50),8,16),10,-.25),2,-4)
  BOWV.single={dur=.95,keys=bowKeys({{.2,BOW0},{.38,DRAW},{.5,DRAW},{.56,REL,true},{.72,REL},{.95,R0}})}
  BOWV.snipe={dur=1.5,keys=bowKeys({{.25,shift(BOW0,9,50)},{.55,DRAWK},{.95,DRAWK},{1.0,RELK,true},{1.2,RELK},{1.5,R0}})}
  BOWV.multi={dur=1.15,keys=bowKeys({{.16,DRAW},{.26,REL,true},{.38,shift(DRAW,1,-14)},{.48,shift(REL,1,-14),true},
    {.6,shift(DRAW,1,14)},{.7,shift(REL,1,14),true},{1.15,R0}})}
  local UP=shift(shift(shift(DRAW,4,-56),5,-40),2,26)
  BOWV.rain={dur=1.05,keys=bowKeys({{.28,UP},{.5,UP},{.58,shift(UP,2,6),true},{.78,shift(UP,2,6)},{1.05,R0}})}
  BOWV.bash={dur=.75,keys=bowKeys({{.2,{-60,8,-50,-60,-60,-12,14,14,24,0,-60,-100}},{.36,{70,-14,60,-100,-60,-30,22,30,20,.04,-4,-80},true},{.75,R0}})}
  BOWV.spin={dur=1.1,keys=bowKeys({{.15,shift(R0,9,50)},{.5,shift(shift(DRAW,13,-360),4,0)},{.62,shift(DRAW,13,-360)},{.7,shift(REL,13,-360),true},{1.1,shift(R0,13,-360)}})}
  BOWV.flip={dur=1.1,keys=bowKeys({{.1,shift(R0,9,40)},{.3,shift(shift(R0,14,180),15,.6)},{.5,shift(shift(R0,14,360),15,.4)},
    {.62,shift(DRAW,14,360)},{.7,shift(REL,14,360),true},{1.1,shift(R0,14,360)}})}
  -- ───── 지팡이: 올려 들고 내려 찍는 영창 ─────
  local STF_UP={10,16,8,-150,-160,-14,16,20,28,.1,-60,-60}
  local STF_TH={-14,-30,-22,-96,-100,-30,18,38,16,-.05,-8,-6}
  STV.single={dur=.85,keys={K(0,unpack(R0)),K(.28,unpack(STF_UP)),Kc(.42,unpack(STF_TH)),K(.62,unpack(STF_TH)),K(.85,unpack(R0))}}
  STV.spin={dur=1.0,keys={K(0,unpack(R0)),K(.2,30,8,20,-92,-92,-30,30,30,30,0,-30,-30),
    Kc(.45,-40,0,-40,-90,-90,-20,20,34,30,.05,-24,-24,-200),K(.68,-40,0,-40,-90,-90,-20,20,34,30,.05,-24,-24,-360),
    K(1.0,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,-360)}}
  STV.slam={dur=1.0,keys={K(0,unpack(R0)),K(.26,10,20,10,-160,-168,-18,24,28,42,.2,-50,-50,0,0,.1),
    K(.4,0,14,0,-160,-168,-30,10,20,30,.4,-50,-50,0,-6,.5),
    Kc(.52,-10,-48,-26,-60,-70,-40,20,60,18,-.2,-12,-10,0,6,-.1),K(.72,-10,-44,-24,-62,-72,-38,20,58,18,-.16,-14,-12),K(1.0,unpack(R0))}}
  -- ───── 무기군 변환 ─────
  local function xform(src,fn,durScale)
    local out={dur=src.dur*durScale,keys={}}
    for i,k in ipairs(src.keys) do
      local v=table.clone(k.v)
      for j=1,15 do v[j]=v[j] or 0 end
      fn(v)
      out.keys[i]={t=k.t*durScale,v=v,c=k.c}
    end
    return out
  end
  local function two(v) v[4]=v[5];v[11]=v[12];v[1]*=1.2;v[2]*=1.15;v[3]*=1.1;v[8]+=8;v[9]+=8 end
  local function blunt(v) v[2]*=1.15;v[10]*=1.2;v[9]+=6 end
  local function dagger(v) v[1]*=1.2;v[2]*=.8;v[8]+=14;v[9]+=14;v[10]-=.05;v[11]=v[11]*1.1;v[12]=v[12]*1.1 end
  local ATTACK={slam=1,strike=1,sweep=1,dash=1,stun=1,fury=1,multi=1,bolt=1,pierce=1,rain=1,backstab=1,ultimate=1,burst=1,chain=1}
  local bowMap={slam="snipe",strike="single",sweep="spin",dash="flip",stun="bash",fury="multi",multi="multi",bolt="single",
    pierce="snipe",rain="rain",backstab="flip",ultimate="rain",burst="single",chain="multi"}
  local stMap={slam="slam",strike="single",sweep="spin",dash="single",stun="slam",fury="spin",multi="spin",bolt="single",
    pierce="single",rain="single",backstab="single",ultimate="slam",burst="single",chain="spin"}
  local cache={}
  local motion={}
  motion.family=function()
    local item=Config.MeadowEquipment and Config.MeadowEquipment[tonumber(player:GetAttribute("MeadowEquipWeapon")) or 0]
    local cls=item and Config.GearWeaponClass[item.Id]
    local tool=player.Character and player.Character:FindFirstChildOfClass("Tool")
    if cls=="Bow" then return "bow" elseif cls=="Staff" then return "staff" elseif cls=="Greatsword" then return "h2"
    elseif cls=="Axe" or cls=="Hammer" then return "blunt" elseif cls=="Dagger" then return "dagger" end
    if cls=="Sword" or tool then return "h1" end
    return "fist"
  end
  motion.build=function(style,family)
    local base=B[style]
    if not base then return nil end
    if family=="fist" then return F[style] or base end
    if family=="bow" and ATTACK[style] then return BOWV[bowMap[style]] end
    if family=="staff" and ATTACK[style] then
      local s=STV[stMap[style]]
      return s
    end
    if family=="h2" then return xform(base,two,1.2) end
    if family=="blunt" then return xform(base,blunt,1.15) end
    if family=="dagger" then return xform(base,dagger,.8) end
    return base
  end
  motion.track=function(actionId)
    local style=meadowArt.styleOf and meadowArt.styleOf(actionId)
    if not style then return nil end
    local family=motion.family()
    local key=style.."|"..family
    local tr=cache[key]
    if tr==nil then
      tr=motion.build(style,family) or false
      cache[key]=tr
    end
    return tr or nil,style,family
  end
  local function lerpKey(a,b,u,out)
    for i=1,15 do
      local x,y=a[i] or 0,b[i] or 0
      out[i]=x+(y-x)*u
    end
  end
  local tmp={}
  -- 시간 t(초)의 포즈를 out에 채운다. 접촉 키로 향하는 구간은 빠르게 꽂히도록 가속한다.
  motion.pose=function(track,t,out)
    local keys=track.keys
    local last=keys[#keys]
    if t>=last.t then lerpKey(last.v,last.v,0,tmp)
    else
      local a,b=keys[1],keys[2]
      for i=2,#keys do
        if t<=keys[i].t then a,b=keys[i-1],keys[i];break end
      end
      local u=math.clamp((t-a.t)/math.max(.001,b.t-a.t),0,1)
      u=b.c and (u*u*(3-2*u)*.45+u*u*u*.55) or u*u*(3-2*u)
      lerpKey(a.v,b.v,u,tmp)
    end
    local shot=martialShot(tmp)
    for joint,cf in pairs(shot) do out[joint]=cf end
    local base=out.Root or CFrame.identity
    out.FlipRoot=CFrame.new(0,tmp[15],0)*CFrame.Angles(0,math.rad(tmp[13]),0)*base*CFrame.Angles(math.rad(tmp[14]),0,0)
    out.Root=nil
  end
  -- ───── 막기 자세: 무기군별 가드 + 피격 반동 ─────
  local GUARD={
    fist={22,-6,14,-108,-100,-24,18,40,48,-.08,-138,-142},
    h1={-26,-8,-14,-84,-102,-20,16,38,44,-.08,-125,-92},
    h2={-18,-6,-8,-112,-112,-26,20,50,54,-.1,-78,-78},
    blunt={0,-4,0,-150,-142,-18,14,42,46,-.08,-60,-92},
    dagger={10,-24,12,-86,-84,-30,14,72,76,-.26,-145,-150},
    bow={32,-2,16,-96,-62,-14,16,38,44,-.06,-18,-112},
    staff={-12,-4,-10,-92,-90,-18,14,34,40,-.06,-82,-82},
  }
  local gtmp={}
  -- brace 0~1(자세 전환), hit 0~1(방금 막은 충격), side ±1(충격 방향), t 초(호흡)
  motion.guard=function(family,brace,hit,side,t,out)
    local G=GUARD[family] or GUARD.h1
    for i=1,12 do gtmp[i]=R0[i]+(G[i]-R0[i])*brace end
    local breath=math.sin(t*3.4)*brace
    gtmp[2]+=1.4*breath+17*hit
    gtmp[10]+=.012*breath-.09*hit
    gtmp[8]+=18*hit;gtmp[9]+=14*hit
    gtmp[4]+=12*hit;gtmp[5]+=12*hit
    gtmp[11]+=10*hit;gtmp[12]+=10*hit
    gtmp[1]+=side*11*hit;gtmp[3]+=side*9*hit
    gtmp[13]=0;gtmp[14]=7*hit;gtmp[15]=0
    local shot=martialShot(gtmp)
    for joint,cf in pairs(shot) do out[joint]=cf end
    out.FlipRoot=CFrame.new(0,0,-.04*hit)*(out.Root or CFrame.identity)*CFrame.Angles(math.rad(gtmp[14]),0,0)
    out.Root=nil
  end
  -- 완벽 막기: 가드 → 걷어내는 쳐올림 → 반격 자세
  B.parry={dur=.6,keys={K(0,unpack(R0)),
    K(.1,-10,-8,-8,-90,-100,-20,16,40,44,-.08,-120,-100),
    Kc(.2,-46,-14,-52,-70,-140,-30,22,50,30,.02,-70,-20,-40,0,0),
    K(.34,-40,-24,-44,-60,-120,-34,24,52,26,-.04,-60,-24,-40,0,0),
    K(.6,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,0,0,0)}}
  F.parry={dur=.6,keys={K(0,unpack(R0)),
    K(.1,20,-8,14,-108,-100,-24,18,40,48,-.08,-138,-142),
    Kc(.2,-50,-10,-60,-60,-150,-34,22,52,26,.04,-100,-14,-60,0,0),
    K(.36,-44,-20,-52,-54,-130,-36,24,54,24,-.02,-96,-22,-60,0,0),
    K(.6,0,6,0,-45,-45,-8,12,10,18,0,-80,-80,0,0,0)}}
  meadowArt.motion=motion
end
-- [연타 5단계] 같은 연타 버튼을 연속 입력할 때마다 1→2→3→4→5→1단.
-- 승인된 공격 1회당 시각 모션 한 단계만 사용한다. 1.4초를 넘기면 첫 단계로 복귀.
local activeCombatRushStage=0
-- 재생 중 다른 기술을 누르면 해당 기술은 기존 순서에 예약한다.
-- 서버 타격 횟수·피해를 늘리거나 허공 명중 판정을 만들지 않는다.
local activeCombatMartialTrack=nil
local activeMartialScope=nil
local activeMartialApproved=false
local activeMartialFinisherPlayed=false
local queuedMartialAction=nil
local function filmEase(t)
  t=math.clamp(t,0,1)
  return t*t*(3-2*t)
end
local activeStrikeTrail=nil
local activeStrikeTrailIndex=0
local function stopStrikeTrail()
  if activeStrikeTrail then activeStrikeTrail.Destroy();activeStrikeTrail=nil end
end
-- Upper-body and real leg joints are both owned only while a melee pose plays.
-- The normal Roblox walk/run Animator is followed, not replaced.
local combatUpperJoints = {Root=true, Waist=true, Neck=true, LeftShoulder=true, RightShoulder=true,
  LeftElbow=true, RightElbow=true, LeftWrist=true, RightWrist=true,
  LeftHip=true,RightHip=true,LeftKnee=true,RightKnee=true,LeftAnkle=true,RightAnkle=true}
local combatRecoveryUntil = nil
local function finishNativeCombatMotion()
  stopStrikeTrail()
  if activeCombatController then activeCombatController.Destroy(true) end
  if activeCombatCharacter and activeCombatCharacter.Parent then
    activeCombatCharacter:SetAttribute("NativeCombatMotionState", "IDLE")
  end
  activeCombatController = nil
  activeStrikeTrailIndex = 0
  combatRecoveryUntil = nil
  activeCombatCombo = nil
  activeCombatMartialTrack = nil
  activeCombatRushStage = 0
  activeMartialScope = nil
  activeMartialApproved = false
  activeMartialFinisherPlayed = false
  queuedMartialAction = nil
  activeCombatCharacter = nil
  table.clear(combatPoseTargets)
  table.clear(combatR15Targets)
end
player.CharacterAdded:Connect(function()
  finishNativeCombatMotion()
  swordComboStage=0
  swordComboAt=0
  swordComboProfile=nil
  swordComboCharacter=nil
  local rush=martialSkillTracks["meadow-unarmed-rush"]
  rush.stage=0
  rush.at=0
  rush.character=nil
  if meadowSkillNameplates[1] then meadowSkillNameplates[1].Text="연타" end
  predictedCombatUntil=0
  table.clear(pendingCombatMotion)
end)
playNativeCombatMotion=function(approvedScope,approvedEvent,serverApproved)
  if os.clock()<dodgePoseUntil then return false end
  if not authorizedCombatScopes[approvedScope] then return false end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not combatMotionSource or not humanoid or humanoid.Health <= 0 then return end
  local r6=humanoid.RigType==Enum.HumanoidRigType.R6
  local tool = character:FindFirstChildOfClass("Tool")
  local equipment = tool and (tool:GetAttribute("WeaponMotionProfile") or tool.Name) or "UNARMED"
  -- 기존 장검·철검 도구를 공용 SWORD 원본 모션에 연결한다. 도구 실물을 새로 만들지 않는다.
  if equipment=="장검" or equipment=="철검" then equipment="SWORD" end
  local profile = equipment == "UNARMED" and "UNARMED" or combatMotionSource.ResolveWeaponProfile(equipment)
  if not profile then
    character:SetAttribute("NativeCombatMotionState", "MATCHING_WEAPON_MOTION_REQUIRED")
    return
  end
  -- [공식 Roblox 관절·자산 계약] 원본 3단계 검술과 맨손은 각각 승인된 실제 자산을 요구한다.
  -- 공용 R15 포즈는 Animator를 덮지 않고 PreSimulation에서 기존 Transform 위에 섞는다.
  local swordProfile=profile=="SWORD" or profile=="LONGSWORD" or profile=="GREATSWORD"
  if not hasStudioAssetAtom("MOTION", "ATTACK_LIGHT_1") then
    character:SetAttribute("NativeCombatMotionState", "APPROVED_MOTION_ATOM_REQUIRED")
    return
  end
  if swordProfile and (not hasStudioAssetAtom("MOTION","ATTACK_LIGHT_2")
    or not hasStudioAssetAtom("MOTION","ATTACK_LIGHT_3")) then
    character:SetAttribute("NativeCombatMotionState", "APPROVED_MOTION_ATOM_REQUIRED")
    return
  end
  if profile=="UNARMED" then
    if not hasStudioAssetAtom("CHARACTER","HAND_BARE") then return end
  elseif swordProfile then
    local bladeAtom=profile=="GREATSWORD" and "BLADE_HEAVY" or "BLADE_LONG"
    if not hasStudioAssetAtom("WEAPON",bladeAtom) then
      character:SetAttribute("NativeCombatMotionState", "APPROVED_WEAPON_ATOM_REQUIRED")
      return
    end
  end
  local motionOk, authoredMotion = pcall(combatMotionSource.Describe, "LIGHT_ATTACK_1")
  if not motionOk or not authoredMotion or authoredMotion.rig ~= "R15" then
    character:SetAttribute("NativeCombatMotionState", "R15_MOTION_SOURCE_REQUIRED")
    return
  end
  local joints = {}
  for _, descendant in ipairs(character:GetDescendants()) do
    -- Roblox Avatar Joint Upgrade uses AnimationConstraint for new R15 avatars.
    -- Prefer it over legacy Motor6D when both exist on an imported rig.
    local nativeJoint=descendant:IsA("AnimationConstraint") or descendant:IsA("Motor6D")
    local connected=nativeJoint and (
      (descendant:IsA("AnimationConstraint") and descendant.Attachment0 and descendant.Attachment1
        and descendant.Attachment0.Parent and descendant.Attachment1.Parent)
      or (descendant:IsA("Motor6D") and descendant.Part0 and descendant.Part1))
    if connected
      and (combatUpperJoints[descendant.Name] or (r6 and (descendant.Name=="RootJoint" or descendant.Name=="Left Shoulder" or descendant.Name=="Right Shoulder" or descendant.Name=="Left Hip" or descendant.Name=="Right Hip"))) then
      if not joints[descendant.Name] or descendant:IsA("AnimationConstraint") then
        joints[descendant.Name] = descendant
      end
    end
  end
  if not ((r6 and joints.RootJoint and joints["Left Shoulder"] and joints["Right Shoulder"])
    or (not r6 and joints.Waist and joints.LeftShoulder and joints.RightShoulder
    and joints.LeftElbow and joints.RightElbow)) then
    character:SetAttribute("NativeCombatMotionState", "COMPATIBLE_R15_JOINTS_REQUIRED")
    return
  end
  if activeCombatCharacter ~= character then finishNativeCombatMotion() end
  -- [연타 입력] 같은 버튼 재입력은 현재 시각 타를 끝내고 다음 단계로 전환한다.
  -- 동일 입력의 서버 승인 재통지는 새 단계를 시작하지 않고 승인 상태만 동기화한다.
  -- 다른 무술과 검의 기존 자동 5타/3단계 재생을 끊지 않는다.
  local stagedRush=profile=="UNARMED" and approvedScope=="meadow-unarmed-rush"
    and martialSkillTracks[approvedScope]~=nil
  if activeCombatCombo and activeCombatCharacter==character
    and os.clock()-activeCombatStartedAt < activeCombatCombo.duration then
    if stagedRush and serverApproved~=true then
      finishNativeCombatMotion()
    else
      if profile=="UNARMED" and martialSkillTracks[approvedScope]
        and martialSkillTracks[approvedScope]~=activeCombatMartialTrack then
        queuedMartialAction={scope=approvedScope,sequence=approvedEvent,confirmed=serverApproved==true}
      elseif serverApproved==true and activeMartialScope==approvedScope then
        activeMartialApproved=true
      end
      return true
    end
  end
  local approvedIndex=tonumber(approvedEvent) or 1
  local chosenMoves={}
  -- [검 1·2·3타] 같은 검으로 1.15초 이내 이어 누르면 오른베기→왼베기→찌르기.
  -- 타격 요청은 기존 공격 입력 1회당 1회만 보내며 서버의 .42초 재사용 시간을 따른다.
  local swordStage=0
  if swordProfile then
    swordStage=(swordComboCharacter==character and swordComboProfile==profile
      and os.clock()-swordComboAt<=1.15) and (swordComboStage%math.clamp(player:GetAttribute("MeadowComboMax") or 1,1,5)+1) or 1
  end
  local martialTrack=profile=="UNARMED" and martialSkillTracks[approvedScope] or nil
  local selectedRushStage=0
  if stagedRush then
    -- [수동 5단] 연속 터치 1회=원본 1개 포즈. 공용 스킬·검 모션 재생 순서와 독립.
    local now=os.clock()
    selectedRushStage=(martialTrack.character==character and now-(martialTrack.at or 0)<=1.4)
      and ((martialTrack.stage or 0)%5+1) or 1
    chosenMoves[1]=martialTrack.beats[selectedRushStage].id
  elseif martialTrack then
    -- 나머지 3종의 기존 5타 자동 연출은 그대로 유지한다.
    for i,beat in ipairs(martialTrack.beats) do chosenMoves[i]=beat.id end
  elseif profile=="UNARMED" then
    local offset=(approvedIndex-1)%#basicUnarmedMoves
    for i=1,5 do chosenMoves[i]=basicUnarmedMoves[(offset+i-1)%#basicUnarmedMoves+1] end
  else
    -- 검은 연속 입력 순서에 맞는 원본 키포즈 1개를 재생한다. 다른 무기는 기존 선택을 유지한다.
    local routeOk,route=pcall(combatMotionSource.CreateCombatCombo,profile)
    if not routeOk or not route or #route.steps==0 then return end
    if swordProfile and #route.steps<3 then return end
    chosenMoves[1]=route.steps[swordProfile and ((swordStage-1)%3+1) or ((approvedIndex-1)%#route.steps+1)].id
  end
  -- 공용 CreateCombatCombo는 불변 객체다. 기존 맨손 5타와 검 1타별 포즈를 재사용한다.
  local ok,combo=pcall(combatMotionSource.CreateCombatCombo,
    profile,chosenMoves,{speed=martialTrack and martialTrack.speed or (profile=="UNARMED" and 1.22 or 1)})
  if not ok or not combo or not combo.steps or #combo.steps~=#chosenMoves then return end
  if stagedRush then
    martialTrack.stage=selectedRushStage
    martialTrack.at=os.clock()
    martialTrack.character=character
    if meadowSkillNameplates[1] then
      meadowSkillNameplates[1].Text="연타 "..selectedRushStage.."/5"
    end
    local lastRushInput=martialTrack.at
    task.delay(1.4,function()
      if martialTrack.at==lastRushInput and meadowSkillNameplates[1] then
        meadowSkillNameplates[1].Text="연타"
      end
    end)
  end
  if swordProfile then
    swordComboStage=swordStage
    swordComboAt=os.clock()
    swordComboProfile=profile
    swordComboCharacter=character
  elseif swordComboProfile then
    swordComboStage=0
    swordComboAt=0
    swordComboProfile=nil
    swordComboCharacter=nil
  end
  combatRecoveryUntil = nil
  activeCombatCharacter = character
  activeCombatCombo = combo
  activeCombatMartialTrack = martialTrack
  activeCombatRushStage = selectedRushStage
  activeMartialScope = martialTrack and approvedScope or nil
  activeMartialApproved = serverApproved==true
  activeMartialFinisherPlayed = false
  queuedMartialAction = nil
  activeCombatStartedAt = os.clock()
  if swordProfile then
    local deep=swordStage or 1
    meadowArt.sfx(deep>=5 and "lunge" or "swing",.5,.9+deep*.07)
  elseif profile=="UNARMED" then
    meadowArt.sfx("whoosh",.3,1.3)
  end
  activeCombatController = activeCombatController or combatMotionSource.BindJointPose(joints, {
    followAnimator = true,response = 42,
  })
  stopStrikeTrail()
  activeStrikeTrailIndex=0

  character:SetAttribute("NativeCombatJointCount",activeCombatController.jointCount)
  character:SetAttribute("NativeCombatMotionAtom", "LIGHT_ATTACK_1")
  character:SetAttribute("NativeCombatActionId", chosenMoves[1])
  character:SetAttribute("NativeCombatStrikeCount", stagedRush and 5 or #chosenMoves)
  character:SetAttribute("NativeCombatRushStage",selectedRushStage)
  character:SetAttribute("NativeSwordComboStage",swordStage)
  character:SetAttribute("NativeCombatStyle", swordProfile and "SWORD_THREE_STRIKES"
    or martialTrack and martialTrack.name or "BASIC")
  character:SetAttribute("NativeCombatMotionProfile", profile)
  character:SetAttribute("NativeCombatMotionState", "SOURCE_POSE_PLAYING_UNVERIFIED")
  return true
end
player:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(function()
  local scope,serial=tostring(player:GetAttribute("ApprovedCombatMotion") or ""):match("^([^:]+):(%d+)$")
  if not scope or not serial then return end
  local predictedAt=pendingCombatMotion[scope]
  pendingCombatMotion[scope]=nil
  -- 동일 입력의 서버 승인으로 모션을 두 번 시작하지 않는다.
  if predictedAt and os.clock()-predictedAt<1 then
    -- 예측 모션은 끊지 않고 서버 승인 사실만 동기화한다.
    if activeMartialScope==scope then activeMartialApproved=true end
    if queuedMartialAction and queuedMartialAction.scope==scope then
      queuedMartialAction.confirmed=true
    end
    return
  end
  playNativeCombatMotion(scope,tonumber(serial),true)
end)
-- [스킬 모션 지역 범위] 기존 서버 승인 신호·관절 제어를 한 영역으로 묶어 레지스터를 절약한다.
do
local function connectMeadowSkillMotion()
-- Original Roblox 61-motion library: cast, guard, parry, dodge, craft,
-- gather and emote use only available R15 joints and server-approved actions.
-- Existing Animator continues driving walk/run/jump underneath visual overlays.
local skillMotionR15=nil
local skillMotionCharacter=nil
local skillMotionDeadline=0
local skillMotionState=nil
local skillMotionStart=0
local skillMotionDuration=0
local skillAuthored=nil
local skillHoldUntil=0
local skillGuardFamily="h1"
local skillMotionJoints={}
local skillMotionAvailable={}
local skillMotionTargets={}
local skillMotionR15Targets={}
local skillMotionMapping={
  Waist="Spine",Neck="Head",LeftShoulder="UpperArmL",RightShoulder="UpperArmR",
  LeftElbow="ForearmL",RightElbow="ForearmR",LeftWrist="HandL",RightWrist="HandR",
  LeftHip="ThighL",RightHip="ThighR",LeftKnee="ShinL",RightKnee="ShinR",
  Root="FlipRoot",RootJoint="Spine",["Left Shoulder"]="UpperArmL",["Right Shoulder"]="UpperArmR",
  ["Left Hip"]="ThighL",["Right Hip"]="ThighR",
}
-- 관절별 {X,Y,Z} 라디안. brace(0~1)만큼 섞인다.
local meadowGuardArmedPoses={
  [1]={FlipRoot={0,.55,0},Spine={-.10,.45,0},Chest={0,.18,0},Head={.05,-.55,0},
    UpperArmR={-1.5,.1,.22},ForearmR={-.4,0,0},HandR={-.1,0,0},
    UpperArmL={-.6,-.1,-1.05},ForearmL={-1.9,0,0},HandL={0,0,0},
    ThighR={-.5,0,.12},ShinR={.7,0,0},FootR={-.15,0,0},ThighL={.38,0,-.12},ShinL={.3,0,0},FootL={0,0,0}},
  [2]={FlipRoot={0,.15,0},Spine={-.08,.1,0},Chest={-.12,0,0},Head={.12,0,0},
    UpperArmR={-2.6,0,.3},ForearmR={-.7,0,0},HandR={-.3,0,0},
    UpperArmL={-2.2,0,-.25},ForearmL={-1.0,0,0},HandL={0,0,0},
    ThighR={-.18,0,.1},ShinR={.3,0,0},FootR={-.08,0,0},ThighL={.1,0,-.1},ShinL={.2,0,0},FootL={0,0,0}},
  [3]={FlipRoot={0,.35,0},Spine={-.2,.3,0},Chest={-.06,0,0},Head={.1,-.3,0},
    UpperArmR={-1.35,.55,.1},ForearmR={-1.35,0,0},HandR={0,0,0},
    UpperArmL={-1.2,-.45,-.1},ForearmL={-1.45,0,0},HandL={0,0,0},
    ThighR={-.3,0,.1},ShinR={.5,0,0},FootR={-.1,0,0},ThighL={.25,0,-.1},ShinL={.4,0,0},FootL={0,0,0}},
}
local skillMotionStates={
  INTERACT_USE="INTERACT",GATHER_SWING="INTERACT",CRAFT_LOOP="INTERACT",
  HEAVY_ATTACK_1="ATTACK",CAST_BURST="ATTACK",PARRY_PERFECT="ATTACK",
  DODGE_LEFT="GESTURE",DODGE_RIGHT="GESTURE",BLOCK_HOLD="INTERACT",
  CHANNEL_LOOP="GESTURE",SPRINT="START",EMOTE_WAVE="GESTURE",
  LIGHT_ATTACK_1="ATTACK",
}
meadowArt.motionHold=function(sec) if skillAuthored then skillHoldUntil=os.clock()+sec end end
local function finishMeadowSkillPose()
  if skillMotionR15 then skillMotionR15.Destroy(true) end
  skillMotionR15=nil
  skillMotionCharacter=nil
  skillMotionState=nil
  skillAuthored=nil
  table.clear(skillMotionJoints)
  table.clear(skillMotionAvailable)
  table.clear(skillMotionTargets)
  table.clear(skillMotionR15Targets)
end
player.CharacterAdded:Connect(function()
  dodgePoseUntil=0
  finishMeadowSkillPose()
end)
player:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(function()
  -- [액션 모션 유지] 공격 승인 신호는 방어·회피·스킬 포즈의 종료 신호가 아니다.
  -- 서버가 승인한 액션별 연출 시간 동안 기존 모션을 끊지 않는다.
  if skillMotionR15 and (os.clock()>=skillMotionDeadline
    or (skillMotionCharacter
      and (skillMotionCharacter:GetAttribute("NativeSkillActionId")=="skill-meadow-dodge-left"
        or skillMotionCharacter:GetAttribute("NativeSkillActionId")=="skill-meadow-dodge-right")
      and os.clock()>=dodgePoseUntil)) then
    finishMeadowSkillPose()
  end
end)
player:GetAttributeChangedSignal("ApprovedActionMotion"):Connect(function()
  local id,serial=tostring(player:GetAttribute("ApprovedActionMotion") or ""):match("^([^:]+):(%d+)$")
  local action=id and actionsById[id]
  if not serial or not action or action.Kind=="COMBAT" or not action.MotionAtom then return end
  local isDodge=id=="skill-meadow-dodge-left" or id=="skill-meadow-dodge-right"
  local isGuard=id=="skill-meadow-guard"
  local isParry=id=="skill-meadow-parry"
  -- [막기 복구] 회피 중·회피 직후에도 서버가 승인한 방어는 즉시 새 자세로 전환한다.
  -- 회피 우선권은 일반 공격에만 남기고 방어와 완벽 막기에는 잘못 적용하지 않는다.
  if os.clock()<dodgePoseUntil and not (isDodge or isGuard or isParry) then return end
  if isGuard or isParry then dodgePoseUntil=0 end
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health<=0
    or not combatMotionSource or not combatMotionSource.SampleProceduralActorMotion then return end
  local state=skillMotionStates[action.MotionAtom]
  if not state then return end
  local good,meta=pcall(combatMotionSource.Describe,action.MotionAtom)
  if not good or not meta or meta.rig~="R15" then return end
  finishMeadowSkillPose()
  finishNativeCombatMotion()
  for _,joint in ipairs(character:GetDescendants()) do
    -- Share the real R15 pose path with both legacy and upgraded avatar joints.
    local nativeJoint=joint:IsA("AnimationConstraint") or joint:IsA("Motor6D")
    local connected=nativeJoint and (
      (joint:IsA("AnimationConstraint") and joint.Attachment0 and joint.Attachment1
        and joint.Attachment0.Parent and joint.Attachment1.Parent)
      or (joint:IsA("Motor6D") and joint.Part0 and joint.Part1))
    if connected and skillMotionMapping[joint.Name] then
      if not skillMotionJoints[joint.Name] or joint:IsA("AnimationConstraint") then
        skillMotionJoints[joint.Name]=joint
      end
      skillMotionAvailable[skillMotionMapping[joint.Name]]=true
    end
  end
  local r6=humanoid.RigType==Enum.HumanoidRigType.R6
  if r6 then
    if not (skillMotionJoints.RootJoint and skillMotionJoints["Left Shoulder"]
      and skillMotionJoints["Right Shoulder"]) then return end
  elseif not (skillMotionJoints.Waist and skillMotionJoints.LeftShoulder and
    skillMotionJoints.RightShoulder and skillMotionJoints.LeftElbow and
    skillMotionJoints.RightElbow) then return end
  skillMotionAvailable.Chest=true
  -- Roblox 공식 Transform 방식: Animator 위에 PreSimulation 관절만 혼합한다.
  skillMotionR15=combatMotionSource.BindJointPose(skillMotionJoints,{
    followAnimator=true,response=27,responseByJoint={Root=110,RootJoint=110},
  })
  skillMotionCharacter=character
  skillMotionState=state
  skillMotionStart=os.clock()
  -- [연속 회피 연출] 시각 모션만 1.06초, 서버 회피 판정 .46초는 불변.
  -- 기존 공격 잠금도 .46+.12초만 유지한다.
  skillMotionDuration=isGuard and 2.8 or isParry and .42 or isDodge and 1.06
    or math.clamp(tonumber(meta.duration) or .7,.25,1.4)
  skillMotionDeadline=skillMotionStart+skillMotionDuration+(isGuard and 0 or .12)
  meadowArt.motionDeadline=skillMotionDeadline
  -- [5단 회피] 서버가 알려 준 단계별로 모션 길이를 줄인다. 1~4단 .5초, 5단 배후 도약 .85초.
  if isDodge then
    local motionStage=math.clamp(tonumber(character:GetAttribute("MeadowDodgeStage")) or 1,1,5)
    skillMotionDuration=motionStage>=5 and .85 or .5
    skillMotionDeadline=skillMotionStart+skillMotionDuration+.12
    meadowArt.motionDeadline=skillMotionDeadline
    dodgePoseUntil=skillMotionStart+(motionStage>=5 and .7 or .46)+.12
  end
  skillAuthored=nil
  skillGuardFamily=meadowArt.motion and meadowArt.motion.family() or "h1"
  if not (isDodge or isGuard) and meadowArt.motion then
    local track,style,family=meadowArt.motion.track(id)
    if track then
      skillAuthored=track
      skillMotionDuration=track.dur
      skillMotionDeadline=skillMotionStart+track.dur+.12
      meadowArt.motionDeadline=skillMotionDeadline
      character:SetAttribute("NativeSkillStyle",style.."|"..family)
      if meadowArt.motionTrail then pcall(meadowArt.motionTrail,id,track) end
    end
  end
  character:SetAttribute("NativeSkillMotionAtom",action.MotionAtom)
  character:SetAttribute("NativeSkillActionId",id)
end)
RunService.PreSimulation:Connect(function(dt)
  if not skillMotionR15 or not skillMotionCharacter then return end
  local humanoid=skillMotionCharacter:FindFirstChildOfClass("Humanoid")
  if player.Character~=skillMotionCharacter or not humanoid or humanoid.Health<=0
    or os.clock()>=skillMotionDeadline then
    finishMeadowSkillPose()
    return
  end
  table.clear(skillMotionTargets)
  table.clear(skillMotionR15Targets)
  -- [피격 정지] 적중 순간 동작이 아주 짧게 멈췄다 이어진다(시각 전용).
  if os.clock()<skillHoldUntil then
    skillMotionStart+=dt;skillMotionDeadline+=dt
  end
  local phase=math.clamp((os.clock()-skillMotionStart)/skillMotionDuration,0,1)
  local actionId=skillMotionCharacter:GetAttribute("NativeSkillActionId")
  local isDodge=actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right"
  local isGuard=actionId=="skill-meadow-guard"
  local isParry=actionId=="skill-meadow-parry"
  -- [회피 전용 관절 포즈] 일반 손짓 제스처를 섞지 않고 원본 R15 몸통·팔·양다리만 구동한다.
  -- 서버가 회피를 승인했을 때만 실행하며 실제 위치·피해·무적 판정은 서버 소유.
  if isDodge then
    local sign=actionId=="skill-meadow-dodge-left" and -1 or 1
    local leadLeft=sign<0
    -- [5단 회피 스킬] 1 전신 슬립 → 2 역방향 페인트 → 3 크로스 도약 → 4 급강하 위빙 → 5 공중 덤블링 착지.
    -- [전투 권한] 실제 R15/R6 관절만 움직인다. 7스터드 이동·무적·쿨타임은 서버 원본 그대로.
    -- 단계별로 한 동작만 크게 보여 준다. 5단은 웅크림 → 공중 회전 → 착지.
    local bump=math.sin(math.pi*phase)
    local skillMotionStage=math.clamp(tonumber(skillMotionCharacter:GetAttribute("MeadowDodgeStage")) or 1,1,5)
    local first,second,third,fourth=0,0,0,0
    local flip=0
    if skillMotionStage==1 then first=bump
    elseif skillMotionStage==2 then second=bump
    elseif skillMotionStage==3 then third=bump
    elseif skillMotionStage==4 then fourth=bump
    else
      first=math.sin(math.pi*math.clamp(phase/.22,0,1))
      flip=math.clamp((phase-.14)/.7,0,1)
    end
    local flipping=math.sin(math.pi*flip)
    local finish=math.clamp((phase-.95)/.05,0,1)
    finish=finish*finish*(3-2*finish)
    local anticipation=math.sin(math.pi*math.clamp(phase/.10,0,1))
    -- [실루엣] 좌우 몸통 비틀기와 가슴·팔 반동을 크게 잡고, 실제 루트 위치는 건드리지 않는다.
    skillMotionTargets.FlipRoot=CFrame.new(0,.20*second+.34*third+.18*fourth+1.33*flipping,0)
      *CFrame.Angles(-2*math.pi*flip,-sign*(.15*first-.25*second+.27*third),
        sign*(.43*first-.48*second+.54*third-.35*fourth))
    skillMotionTargets.Spine=CFrame.new(0,-.11*anticipation+.16*third-.14*fourth-.045*finish,0)
      *CFrame.Angles(-.44*first+.32*second+.29*third-.51*fourth,
        sign*(-.68*second+.86*third),sign*(-.52*first+.57*second-.46*fourth))
    skillMotionTargets.Chest=CFrame.Angles(-.15*first+.31*third-.37*fourth,
      sign*(-.42*second+.48*third),sign*(-.27*first+.25*second))
    skillMotionTargets.Head=CFrame.Angles(.33*first-.18*third+.40*fourth,
      sign*.30*third,0)
    -- [발동작] 낮은 위빙으로 공격선을 피한 뒤 무릎을 모아 공중제비를 돌아 착지한다.
    local leadHip=-1.24*first+.65*second-1.13*third-.82*fourth-1.46*flipping+.16*finish
    local backHip=.70*first-1.18*second+.96*third+.60*fourth-1.34*flipping+.12*finish
    local leadKnee=.48*first+.35*second+.65*fourth+2.16*flipping
    local backKnee=.78*second+.40*third+.82*fourth+2.16*flipping
    skillMotionTargets.ThighL=CFrame.Angles(leadLeft and leadHip or backHip,0,
      leadLeft and -.35*second+.35*third or .42*second-.38*third)
    skillMotionTargets.ThighR=CFrame.Angles(leadLeft and backHip or leadHip,0,
      leadLeft and -.42*second+.38*third or .35*second-.35*third)
    skillMotionTargets.ShinL=CFrame.Angles(leadLeft and leadKnee or backKnee,0,0)
    skillMotionTargets.ShinR=CFrame.Angles(leadLeft and backKnee or leadKnee,0,0)
    skillMotionTargets.FootL=CFrame.Angles(-.35*second-.34*fourth-.37*flipping+.16*finish,0,0)
    skillMotionTargets.FootR=CFrame.Angles(-.39*second-.37*flipping+.14*finish,0,0)
    -- [팔동작] 슬립 반동 → 역회전 페인트 → 가로 펼침 → 위빙 가드 → 덤블링 접기.
    skillMotionTargets.UpperArmL=CFrame.Angles(
      leadLeft and (-1.43*first-.60*second+.48*third-.94*fourth-1.04*flipping)
        or (.79*first-1.08*second-.88*third-.97*fourth-1.04*flipping),
      0,-.46*first+.44*second-.90*third+.36*fourth+.24*flipping)
    skillMotionTargets.UpperArmR=CFrame.Angles(
      leadLeft and (.79*first-1.08*second-.88*third-.97*fourth-1.04*flipping)
        or (-1.43*first-.60*second+.48*third-.94*fourth-1.04*flipping),
      0,.46*first-.44*second+.90*third-.36*fourth-.24*flipping)
    skillMotionTargets.ForearmL=CFrame.Angles(-.51*first-.40*second-.47*third-1.24*fourth-1.46*flipping,0,0)
    skillMotionTargets.ForearmR=CFrame.Angles(-.51*first-.41*second-1.46*flipping,0,0)
    skillMotionTargets.HandL=CFrame.Angles(-.20*flipping,0,0)
    skillMotionTargets.HandR=CFrame.Angles(-.20*flipping,0,0)
  elseif isGuard then
    -- [무기별 막기] 빠르게 자세를 잡고, 호흡하며 버티고, 막을 때마다 몸이 밀렸다 돌아온다.
    local elapsed=os.clock()-skillMotionStart
    local rise=math.clamp(elapsed/.09,0,1);rise=rise*rise*(3-2*rise)
    local release=math.clamp((skillMotionDuration-elapsed)/.16,0,1);release=release*release*(3-2*release)
    local sinceHit=os.clock()-meadowGuardContactAt
    local hit=math.sin(math.pi*math.clamp(sinceHit/(meadowGuardContactPerfect and .3 or .24),0,1))
    meadowArt.motion.guard(skillGuardFamily,rise*release,hit,meadowArt.guardSide or 1,elapsed,skillMotionTargets)
  elseif isParry and not skillAuthored then
    -- [중세 검술 하이 가드] 몸을 숙이는 X자 막기를 없애고 서서 정면을 방호한다.
    -- 오른 전완은 얼굴 앞 세로, 왼 전완은 가슴 앞 사선. 발은 지면에 유지한다.
    local rise=math.clamp(phase/(isParry and .17 or .045),0,1)
    rise=rise*rise*(3-2*rise)
    local release=math.clamp((1-phase)/(isParry and .22 or .055),0,1)
    release=release*release*(3-2*release)
    local brace=rise*release
    local elapsed=os.clock()-meadowGuardContactAt
    local hit=math.sin(math.pi*math.clamp(elapsed/(meadowGuardContactPerfect and .25 or .19),0,1))
    local breath=math.sin((os.clock()-skillMotionStart)*3.4)*.014*brace
    if isGuard and skillMotionCharacter:FindFirstChildOfClass("Tool") then
      -- [검 든 막기] 검을 든 손 모양에 맞춘 세 가지 자세. 1=옆으로 선 중단 막기, 2=머리 위 지붕 막기, 3=두 손 수평 막기.
      local variant=math.clamp(math.floor(tonumber(player:GetAttribute("QAGuardVariant")) or 3),1,3)
      local pose=meadowGuardArmedPoses[variant]
      local recoil=.16*hit
      for joint,v in pairs(pose) do
        skillMotionTargets[joint]=CFrame.Angles(v[1]*brace+((joint=="UpperArmR" or joint=="UpperArmL") and recoil or 0),v[2]*brace,v[3]*brace)
      end
      skillMotionTargets.Spine=CFrame.new(0,-.05*brace+.04*hit+breath,0)*(skillMotionTargets.Spine or CFrame.identity)
    elseif isGuard then
      -- [강한 읽힘] 준비→전면 가드→서버 적중 반동→자세 복귀. 대미지/이동은 건드리지 않는다.
      local lift=math.sin(math.pi*math.clamp(phase/.055,0,1))
      skillMotionTargets.FlipRoot=CFrame.Angles(0,.13*brace-.07*hit,.04*brace)
      skillMotionTargets.Spine=CFrame.new(0,.065*brace+.065*hit+breath,-.028*brace)
        *CFrame.Angles(-.11*brace+.13*hit,.21*brace-.14*hit,-.055*brace)
      skillMotionTargets.Chest=CFrame.Angles(-.09*brace+.08*hit,.08*brace,.04*brace)
      skillMotionTargets.Head=CFrame.Angles(.12*brace-.13*hit,-.06*brace,0)
      -- [양팔 하이 가드] 두 팔을 얼굴·가슴 앞에 대칭으로 세워 막는다. 타격 시 어깨가 밀렸다 복원된다.
      skillMotionTargets.UpperArmR=CFrame.Angles(-1.12*brace-.12*lift+.22*hit,
        .30*brace,.42*brace)
      skillMotionTargets.ForearmR=CFrame.Angles(-1.68*brace+.30*hit,.12*brace,.10*brace)
      skillMotionTargets.HandR=CFrame.Angles(.14*brace-.14*hit,0,.08*brace)
      skillMotionTargets.UpperArmL=CFrame.Angles(-1.12*brace-.12*lift+.22*hit,
        -.30*brace,-.42*brace)
      skillMotionTargets.ForearmL=CFrame.Angles(-1.68*brace+.30*hit,-.12*brace,-.10*brace)
      skillMotionTargets.HandL=CFrame.Angles(.14*brace-.14*hit,0,-.08*brace)
      -- [하체] 무릎을 살짝 굽혀 낮게 버티는 자세. 위치 이동·공중 회전 없음.
      skillMotionTargets.ThighL=CFrame.Angles(-.20*brace-.05*hit,0,-.10*brace)
      skillMotionTargets.ThighR=CFrame.Angles(.14*brace,0,.10*brace)
      skillMotionTargets.ShinL=CFrame.Angles(.34*brace+.08*hit,0,0)
      skillMotionTargets.ShinR=CFrame.Angles(.24*brace,0,0)
      skillMotionTargets.FootL=CFrame.Angles(-.14*brace,0,-.035*brace)
      skillMotionTargets.FootR=CFrame.Angles(-.10*brace,0,.035*brace)
    else
      -- [완벽 막기] 세키로식 짧은 전방 쳐내기 동작. 성공 여부는 서버만 결정한다.
      local snap=math.sin(math.pi*math.clamp((phase-.09)/.67,0,1))
      skillMotionTargets.FlipRoot=CFrame.Angles(0,-.26*snap,.08*snap)
      skillMotionTargets.Spine=CFrame.new(0,.035*brace+.055*hit,0)
        *CFrame.Angles(-.16*brace+.13*hit,-.24*snap,.075*snap)
      skillMotionTargets.Chest=CFrame.Angles(-.11*brace,.14*snap,0)
      skillMotionTargets.Head=CFrame.Angles(.10*brace-.08*hit,.10*snap,0)
      skillMotionTargets.UpperArmR=CFrame.Angles(-1.75*brace-.24*snap+.32*hit,
        .38*brace,.52*brace)
      skillMotionTargets.ForearmR=CFrame.Angles(-1.24*brace-.34*snap+.22*hit,0,.14*brace)
      skillMotionTargets.HandR=CFrame.Angles(-.22*brace,0,.16*brace)
      skillMotionTargets.UpperArmL=CFrame.Angles(-.86*brace+.28*snap,-.14*brace,-.32*brace)
      skillMotionTargets.ForearmL=CFrame.Angles(-1.04*brace,0,-.15*brace)
      skillMotionTargets.HandL=CFrame.Angles(.12*brace,0,0)
      skillMotionTargets.ThighL=CFrame.Angles(-.025*brace,0,-.06*brace)
      skillMotionTargets.ThighR=CFrame.Angles(.025*brace,0,.06*brace)
      skillMotionTargets.ShinL=CFrame.identity
      skillMotionTargets.ShinR=CFrame.identity
      skillMotionTargets.FootL=CFrame.identity
      skillMotionTargets.FootR=CFrame.identity
    end
  elseif skillAuthored then
    meadowArt.motion.pose(skillAuthored,os.clock()-skillMotionStart,skillMotionTargets)
  else
    local _,matched=combatMotionSource.SampleProceduralActorMotion(skillMotionState,phase,{
      bodyPlan="BIPED",actorClass="PLAYER",availableJoints=skillMotionAvailable,
      mobileTier=nativeTouchEnabled and "LOW" or "HIGH",secondary=.65,
    },skillMotionTargets)
    if not matched then finishMeadowSkillPose();return end
  end
  if humanoid.RigType==Enum.HumanoidRigType.R6 then
    -- [구형 아바타 회피] 기존 실제 몸통·팔·다리 관절에 같은 좌우 피하기 포즈를 연결한다.
    skillMotionR15Targets.RootJoint=skillMotionTargets.FlipRoot
      and (skillMotionTargets.FlipRoot*skillMotionTargets.Spine) or skillMotionTargets.Spine
    skillMotionR15Targets["Left Shoulder"]=skillMotionTargets.UpperArmL
    skillMotionR15Targets["Right Shoulder"]=skillMotionTargets.UpperArmR
    skillMotionR15Targets["Left Hip"]=skillMotionTargets.ThighL
    skillMotionR15Targets["Right Hip"]=skillMotionTargets.ThighR
  else
    combatMotionSource.MapCombatPoseToR15(skillMotionTargets,skillMotionR15Targets)
    -- R15 기존 루트 관절만 활용하는 전신 시각 회전.
    if skillMotionJoints.Root and skillMotionTargets.FlipRoot then
      skillMotionR15Targets.Root=skillMotionTargets.FlipRoot
    end
  end
  skillMotionR15.Step(skillMotionR15Targets,dt)
end)
end
connectMeadowSkillMotion()
end -- [스킬 모션 지역 범위 종료] 전투 콤보 감시자는 별도로 유지한다.

RunService.PreSimulation:Connect(function(dt)
  if not (activeCombatController and activeCombatCombo and activeCombatCharacter) then return end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if character ~= activeCombatCharacter or not humanoid or humanoid.Health <= 0 then
    finishNativeCombatMotion()
    return
  end
  table.clear(combatPoseTargets)
  table.clear(combatR15Targets)
  if combatRecoveryUntil then
    activeCombatController.Step(nil, dt) -- 중립 복귀는 공격 프레임 입력과 구분한다.
    if os.clock() >= combatRecoveryUntil then
      local queued=queuedMartialAction
      finishNativeCombatMotion()
      if queued then playNativeCombatMotion(queued.scope,queued.sequence,queued.confirmed) end
    end
    return
  end
  local timeInAction=os.clock()-activeCombatStartedAt
  local _,strikeIndex,finished=combatMotionSource.SampleCombatCombo(
    activeCombatCombo,timeInAction,combatPoseTargets
  )
  local currentStep=activeCombatCombo.steps[strikeIndex]
  local stepPhase=math.clamp((timeInAction-currentStep.start)/math.max(.05,currentStep.duration),0,1)
  if type(combatMotionSource.RefineActorCinematicPose)=="function" then
    combatMotionSource.RefineActorCinematicPose(combatPoseTargets,{
      actorClass="PLAYER",bodyPlan="BIPED",weaponStyle=activeCombatCombo.profileId,
      actionPhase=stepPhase,
      authorizedImpact=true,grounded=humanoid.FloorMaterial~=Enum.Material.Air,
      visualSpeed=humanoid.MoveDirection.Magnitude,
      mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
      comboContinuity=(#activeCombatCombo.steps==5 or activeCombatRushStage>0) and .82 or 0,
      intensity=(#activeCombatCombo.steps==5 or activeCombatRushStage>0) and 1.5 or 1,secondary=.7,
    })
  end
  if activeCombatMartialTrack then
    -- 공통 잽/킥 반복 대신 4개 무술 × 5타의 독립된 실제 관절 키포즈를 샘플한다.
    -- 준비 자세에서 타격으로 폭발하고, 다음 타의 준비 자세로 연속 블렌딩한다.
    local beat=activeCombatMartialTrack.beats[activeCombatRushStage>0 and activeCombatRushStage or strikeIndex]
    local elapsed=timeInAction-currentStep.start
    local fromPose,toPose,alpha
    if elapsed<currentStep.ready then
      fromPose=beat.loadPose;toPose=beat.loadPose;alpha=0
    elseif elapsed<currentStep.contact then
      fromPose=beat.loadPose;toPose=beat.hitPose
      alpha=filmEase((elapsed-currentStep.ready)/math.max(.001,currentStep.contact-currentStep.ready))
    elseif elapsed<currentStep.recoil then
      fromPose=beat.hitPose;toPose=beat.hitPose;alpha=0
    else
      -- 수동 연타는 다음 버튼 입력 전에는 다음 타의 준비 포즈를 자동으로 실행하지 않는다.
      local nextBeat=nil
      if activeCombatRushStage==0 then
        nextBeat=activeCombatMartialTrack.beats[strikeIndex+1]
      end
      fromPose=beat.hitPose
      toPose=nextBeat and nextBeat.loadPose or nil
      alpha=filmEase((elapsed-currentStep.recoil)/math.max(.001,currentStep.duration-currentStep.recoil))
    end
    for joint,from in pairs(fromPose) do
      local target=from:Lerp(toPose and toPose[joint] or CFrame.identity,alpha)
      local source=combatPoseTargets[joint]
      -- 4개 무술의 저작된 팔·허리·다리 폭을 95% 이상 사용해 작은 기본 포즈에 묻히지 않게 한다.
      combatPoseTargets[joint]=joint=="Root" and target
        or (source and source:Lerp(target,.97) or target)
    end
    if activeCombatMartialTrack.name=="RISING_DRAGON" then
      -- 승룡권식 축회전과 공중 상승: R15 관절만 움직이고 실제 위치·피해 권한은 변경하지 않는다.
      local risePhase=filmEase(math.clamp(elapsed/math.max(.001,currentStep.duration),0,1))
      combatPoseTargets.Root=(combatPoseTargets.Root or CFrame.identity)*
        CFrame.Angles(math.rad(-24*risePhase),math.rad(75*risePhase),0)
    elseif activeCombatMartialTrack.name=="TORNADO_TAEKWONDO" then
      -- 각 타의 한 바퀴 회전을 포즈 보간에 맡기지 않고 프레임별로 구동한다.
      -- CFrame:Lerp는 360도 방향을 최단경로로 접으므로 회전 프레임은 별도로 누적한다.
      local sweep=filmEase(math.clamp(elapsed/math.max(.001,currentStep.duration),0,1))
      combatPoseTargets.Root=(combatPoseTargets.Root or CFrame.identity)*
        CFrame.Angles(0,math.rad(360*sweep),0)
    end
  elseif activeCombatCombo.profileId=="UNARMED" then
    -- 기본 공격은 기존 저작 포즈를 보존하되 팔·골반의 가시성을 높인다.
    for name,pose in pairs(combatPoseTargets) do
      if typeof(pose)=="CFrame" then
        local axis,angle=pose:ToAxisAngle()
        local gain=(name=="Spine" or name=="Chest") and 1.34
          or name=="Head" and 1.13
          or (name:find("Arm",1,true) or name:find("Thigh",1,true)) and 1.28
          or (name:find("Shin",1,true) or name:find("Forearm",1,true)) and 1.16
          or 1.1
        combatPoseTargets[name]=CFrame.fromAxisAngle(axis,math.min(angle*gain,math.rad(156)))
      end
    end
  end
  -- [연타 잔상] 맨손 5타 및 검 1·2·3단계에 기존 짧은 궤적을 재사용한다.
  if strikeIndex~=activeStrikeTrailIndex then
    activeStrikeTrailIndex=strikeIndex
    if activeCombatCharacter then
      activeCombatCharacter:SetAttribute("NativeCombatStrikeIndex",
        activeCombatRushStage>0 and activeCombatRushStage or strikeIndex)
    end
    stopStrikeTrail()
    local swordSwing=activeCombatCombo.profileId=="SWORD"
      or activeCombatCombo.profileId=="LONGSWORD" or activeCombatCombo.profileId=="GREATSWORD"
    if combatVFX and (activeCombatCombo.profileId=="UNARMED" or swordSwing)
      and timeInAction<activeCombatCombo.duration then
      local chosenMove=currentStep.id
      local leg=chosenMove:find("KICK",1,true) or chosenMove:find("KNEE",1,true)
      local left=chosenMove:find("LEFT",1,true) or chosenMove:match("_L$")
      local hostName=leg and (left and "LeftFoot" or "RightFoot")
        or (left and "LeftHand" or "RightHand")
      local equipped=character:FindFirstChildOfClass("Tool")
      local swordHandle=swordSwing and equipped and equipped:FindFirstChild("Handle")
      local host=swordHandle and swordHandle:IsA("BasePart") and swordHandle
        or character:FindFirstChild(swordSwing and "RightHand" or hostName)
      if host and host:IsA("BasePart") then
        local style=activeCombatMartialTrack
        local color=style and style.color or swordSwing and
          (swordComboStage>=5 and Color3.fromRGB(255,120,90) or swordComboStage>=3 and Color3.fromRGB(255,221,174) or Color3.fromRGB(195,214,219))
          or (leg and Color3.fromRGB(124,245,220) or Color3.fromRGB(255,207,112))
        local ok,_,controller=pcall(combatVFX.AttachShortTrail,host,{
          color=color,lifetime=nativeTouchEnabled and .19 or .32,
          width=style and style.trailWidth or swordSwing and (.4+swordComboStage*.12) or (nativeTouchEnabled and .6 or .76),
          length=style and 3.2 or swordSwing and (({1.5,1.9,2.4,2.9,4.2})[math.clamp(swordComboStage,1,5)]) or 1.3,
        })
        if ok and controller then activeStrikeTrail=controller end
      end
    end
  end
  if activeStrikeTrail then
    local within=timeInAction-currentStep.start
    activeStrikeTrail.SetEnabled(within>=currentStep.ready*.4 and within<currentStep.recoil)
  end
  if humanoid.RigType==Enum.HumanoidRigType.R6 then
    -- 기존 R6 관절만 사용한다. 없는 팔꿈치·무릎을 생성하지 않는다.
    local torso=character:FindFirstChild("Torso")
    local mapping={RootJoint="Spine",Neck="Head",["Left Shoulder"]="UpperArmL",
      ["Right Shoulder"]="UpperArmR",["Left Hip"]="ThighL",["Right Hip"]="ThighR"}
    if torso then
      for _,joint in ipairs(character:GetDescendants()) do
        local channel=joint:IsA("Motor6D") and mapping[joint.Name]
        if channel then
          local pose=combatPoseTargets[channel] or CFrame.identity
          if channel=="Spine" then
            pose=(combatPoseTargets.Root or CFrame.identity)*pose*(combatPoseTargets.Chest or CFrame.identity)
          end
          local basis=joint.C0.Rotation
          combatR15Targets[joint.Name]=basis:Inverse()*pose*basis
        end
      end
    end
  else
    combatMotionSource.MapCombatPoseToR15(combatPoseTargets, combatR15Targets)
    if combatPoseTargets.Root then combatR15Targets.Root=combatPoseTargets.Root end
  end
  activeCombatController.Step(combatR15Targets, dt)
  -- [5타 막타] 서버 승인·다섯 번째 접촉에서 원본 손발에 곡선 Beam 연출을 만든다.
  -- 네모 입자 스프라이트 대신 빛의 곡선 궤적을 사용하고, 임의 메시/파트는 만들지 않는다.
  if activeCombatMartialTrack and activeMartialApproved and not activeMartialFinisherPlayed
    and (strikeIndex==5 or activeCombatRushStage==5)
    and timeInAction-currentStep.start>=currentStep.contact then
    activeMartialFinisherPlayed=true
    local style=activeCombatMartialTrack
    local limbName=style.name=="TORNADO_TAEKWONDO" and "LeftFoot"
      or style.name=="FLASH_BOXING" and "LeftHand"
      or style.name=="RISING_DRAGON" and "RightHand" or "LeftHand"
    local limb=character:FindFirstChild(limbName)
    local rootPart=character:FindFirstChild("HumanoidRootPart")
    if limb and limb:IsA("BasePart") and rootPart then
      for arc=1,4 do
        local a0=Instance.new("Attachment")
        a0.Name="MartialFinisherStart"
        a0.Position=Vector3.new(-1.8+(arc-1)*.65,-.5+(arc-1)*.35,-1.5)
        a0.CFrame=CFrame.Angles(0,math.rad((arc-1)*26),math.rad(20))
        a0.Parent=rootPart
        local a1=Instance.new("Attachment")
        a1.Name="MartialFinisherEnd"
        a1.Position=Vector3.new((arc-2)*.25,1.1+arc*.26,0)
        a1.CFrame=CFrame.Angles(0,math.rad(-25*arc),math.rad(-18))
        a1.Parent=limb
        local beam=Instance.new("Beam")
        beam.Name="MartialFinisherArc"
        beam.Attachment0=a0
        beam.Attachment1=a1
        beam.CurveSize0=style.name=="RISING_DRAGON" and 6.4 or 4.5
        beam.CurveSize1=style.name=="RISING_DRAGON" and -5.2 or -3.8
        beam.Segments=24
        beam.FaceCamera=true
        beam.LightEmission=1
        beam.LightInfluence=0
        beam.Width0=.08+arc*.11
        beam.Width1=arc==2 and 1.25 or .48
        beam.Color=ColorSequence.new(Color3.fromRGB(255,255,239),style.color)
        beam.Transparency=NumberSequence.new({
          NumberSequenceKeypoint.new(0,.88),
          NumberSequenceKeypoint.new(.18,.05),
          NumberSequenceKeypoint.new(.8,.13),
          NumberSequenceKeypoint.new(1,1),
        })
        beam.Parent=a0
        debris:AddItem(a0,.43)
        debris:AddItem(a1,.43)
      end
      local flash=Instance.new("Highlight")
      flash.Name="MartialFinisherGlow"
      flash.Adornee=character
      flash.FillColor=style.color
      flash.FillTransparency=.66
      flash.OutlineColor=Color3.fromRGB(255,245,211)
      flash.OutlineTransparency=.18
      flash.DepthMode=Enum.HighlightDepthMode.Occluded
      flash.Parent=character
      debris:AddItem(flash,.27)
    end
  end
  if finished then combatRecoveryUntil = os.clock() + .18 end
end)


-- [원본 몹 모션] 관련 상태·이벤트를 단일 책임 함수에 격리해 Luau 로컬 레지스터 상한 준수.
local function initializeMeadowNativeMobMotion()
-- Native 3D mob actions: existing CC0 MeshParts only. The game does not
-- invent limbs, bones or model parts. Server-owned attack states remain authoritative.
local meadowMobWorld=workspace:WaitForChild("FantasySurvivalWorld")
local meadowMobMotion=combatMotionSource
local meadowMobControllers={}
local meadowMobRigWarnings={}
local nativeMobMotionMap={
  IDLE="IDLE",CHASE="RUN",RUN="RUN",RETURN_TO_SPAWN="WALK",WALK="WALK",
  ANTICIPATION="ANTICIPATION",ATTACK="ATTACK",RECOVERY="RECOVERY",HIT="HIT",DEATH="DEATH",
}
-- [4족 애니메이션] 걷기는 네 발 순차 접지, 질주는 앞·뒷발 묶음 접지를 사용한다.
local quadrupedFootPhases={
  -- [실제 보행] 네 발의 접지가 1/4주기씩 어긋난다. 질주는 기존 대각 발 트로트.
  {"FL",0,0},{"FR",.5,.5},{"BL",.75,.5},{"BR",.25,0},
}
-- [늑대 질주] 뒷발 추진 → 앞발 착지 순서. 트로트처럼 두 발을 동시에 찍지 않는다.
local wolfGallopOffsets={FL=.52,FR=.60,BL=.04,BR=.12}
-- [사슴 원본 질주] 뒷발 추진 다음 앞발 착지: 걷기용 트로트와 다른 실제 4족 갤럽.
local deerGallopOffsets={FL=.60,FR=.67,BL=.06,BR=.13}
-- [몹 실제 리깅] 기존 Bone/Motor6D/AnimationConstraint의 채널명을 재사용한다.
local nativeMobJointAlias={
  FrontLeftShoulder="FLHip",FrontRightShoulder="FRHip",
  FrontLeftHip="FLHip",FrontRightHip="FRHip",
  HindLeftHip="BLHip",HindRightHip="BRHip",
  RearLeftHip="BLHip",RearRightHip="BRHip",
  FrontLeftKnee="FLKnee",FrontRightKnee="FRKnee",
  RearLeftKnee="BLKnee",RearRightKnee="BRKnee",
  TailBaseJoint="Tail",ChestJoint="Chest",SpineJoint="Spine",
  NeckJoint="Neck",JawJoint="Jaw",TailBase="Tail",TailTip="Tail",
  WingLeft="WingL",WingRight="WingR",
}
-- [몬스터 공통 임팩트] 기존 공용 풀링 VFX만 사용한다. 피해·쿨다운·히트박스는 서버 전용.
local function mobVfx(pattern,where,stage,facing)
  if not combatVFX or typeof(where)~="Vector3" then return end
  local boss=pattern=="GOLEM_SLAM" or pattern=="GOLEM_SHOCKWAVE"
  local flying=pattern=="BEE_SWEEP" or pattern=="BEE_STING"
    or pattern=="BAT_DIVE" or pattern=="BAT_SWEEP"
  local wolf=pattern=="WOLF_BITE" or pattern=="WOLF_LUNGE"
  local boar=pattern=="BOAR_CHARGE" or pattern=="BOAR_TUSK"
  local arcane=pattern=="ARCANE_BOLT" or pattern=="ARCANE_NOVA"
  local tint=arcane and Color3.fromRGB(176,110,255)
    or boss and Color3.fromRGB(255,131,91)
    or flying and Color3.fromRGB(243,224,123)
    or wolf and Color3.fromRGB(173,217,245)
    or boar and Color3.fromRGB(210,157,119)
    or Color3.fromRGB(163,219,164)
  local accent=arcane and Color3.fromRGB(235,214,255)
    or boss and Color3.fromRGB(255,222,168)
    or wolf and Color3.fromRGB(222,246,255)
    or Color3.fromRGB(244,241,219)
  local charge=pattern=="WOLF_LUNGE" or pattern=="BOAR_CHARGE" or pattern=="ARCANE_NOVA"
    or pattern=="GOLEM_SLAM" or pattern=="GOLEM_SHOCKWAVE"
  local effect=stage=="DEATH" and "DESTRUCTION_BURST"
    or stage=="ANTICIPATION" and (boss and "BOSS_WARNING_PULSE" or "ATTACK_TELEGRAPH_PULSE")
    or stage=="IMPACT" and (charge and "SHAPE_BURST" or "IMPACT_FLASH")
    or "STATUS_PULSE"
  local forward=typeof(facing)=="Vector3"
    and Vector3.new(facing.X,0,facing.Z) or Vector3.zero
  if forward.Magnitude>.1 then forward=forward.Unit else forward=Vector3.zero end
  local impactPoint=where
  if stage=="IMPACT" and forward.Magnitude>.1 then
    impactPoint+=forward*(boss and 1.2 or wolf and 1.45 or 1.0)
      +Vector3.new(0,boss and 1.0 or flying and 1.7 or .85,0)
  end
  local ground=nil
  if boss then
    local ray=RaycastParams.new();ray.FilterType=Enum.RaycastFilterType.Include
    ray.FilterDescendantsInstances={workspace.Terrain}
    ground=workspace:Raycast(where+Vector3.new(0,24,0),Vector3.new(0,-80,0),ray)
  end
  if ground and stage=="ANTICIPATION" then impactPoint=ground.Position+Vector3.new(0,.08,0) end
  local cframe=forward.Magnitude>.1 and CFrame.lookAt(impactPoint,impactPoint+forward)
    or CFrame.new(impactPoint)
  local ok,err=pcall(combatVFX.Create,effect,{
    cframe=cframe,parent=workspace,color=tint,accent=accent,
    scale=boss and 1 or charge and .86 or .72,
    duration=stage=="ANTICIPATION" and (boss and .68 or .4)
      or stage=="DEATH" and .55 or .28,
    reducedMotion=reducedEffects,
    -- [공격 범위 의미] 실제 광역 판정은 기존 수문장 충격파에만 있다.
    startDiameter=boss and (pattern=="GOLEM_SHOCKWAVE" and 16.8 or 10.4) or nil,
    endDiameter=boss and (pattern=="GOLEM_SHOCKWAVE" and 16.8 or 10.4) or nil,
    textureKey=wolf and stage=="IMPACT" and "slash" or nil,
    hideFlash=stage=="ANTICIPATION",
    hideRing=pattern=="GOLEM_SLAM" or stage=="IMPACT" and not charge,
    mist=stage=="DEATH" and not reducedEffects,
    count=reducedEffects and 2 or stage=="DEATH" and 7 or stage=="IMPACT" and 5 or 3,
  })
  if not ok then warn("Original mob VFX unavailable: "..tostring(err)) end
end
local function bindOriginalMob(model)
  if not model:IsA("Model") or meadowMobControllers[model] then return end
  local species=model:GetAttribute("Species") or model:GetAttribute("MeadowWildlife")
  if species==nil then
    -- Attribute replication can arrive after a source CC0 Model. Both enemy
    -- Species and passive MeadowWildlife are real server-authored roles.
    local function onceReady()
      if model.Parent and not meadowMobControllers[model] then bindOriginalMob(model) end
    end
    model:GetAttributeChangedSignal("Species"):Once(onceReady)
    model:GetAttributeChangedSignal("MeadowWildlife"):Once(onceReady)
    return
  end
  if species~="wolf" and species~="bee" and species~="golem"
    and species~="deer" and species~="boar" and species~="rabbit"
    and species~="bat" and species~="ghost" then return end
  -- [적 표시] 실제 서버 적 모델만 표시하고 벽 뒤·먼 거리의 화면 혼잡을 줄인다.
  if model:GetAttribute("Species") and not model:FindFirstChild("MeadowEnemyLabel") then
    local host=model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart",true)
    if host then
      local boxCf,bounds=model:GetBoundingBox()
      local plate=Instance.new("BillboardGui");plate.Name="MeadowEnemyLabel"
      -- 이름표·체력바는 몸 중심이 아니라 모델 맨 위(머리 위)에 띄운다.
      local topOffset=math.max(bounds.Y*.65+1,(boxCf.Position.Y+bounds.Y*.5)-host.Position.Y+1.6)
      plate.Adornee=host;plate.AlwaysOnTop=false;plate.MaxDistance=55
      plate.Size=UDim2.fromOffset(154,44);plate.StudsOffsetWorldSpace=Vector3.new(0,topOffset,0)
      plate.Parent=model
      local name=Instance.new("TextLabel");name.Name="EnemyIdentity";name.BackgroundTransparency=1
      name.Size=UDim2.new(1,0,0,24);name.Font=Enum.Font.GothamBold;name.TextSize=13
      name.TextColor3=Color3.fromRGB(255,236,219);name.TextStrokeTransparency=.25;name.Parent=plate
      local bar,control=CommonUI.CreateHealthBar({name="EnemyHealth",textSize=10})
      bar.Position=UDim2.fromOffset(12,25);bar.Size=UDim2.new(1,-24,0,12);bar.Parent=plate
      local function updateEnemyLabel()
        local hp=model:GetAttribute("EnemyHealth") or 0
        local maximum=model:GetAttribute("EnemyMaxHealth") or math.max(1,hp)
        local state=model:GetAttribute("AttackState")
        plate.Enabled=hp>0
        name.Text=(model:GetAttribute("Boss") and "보스 · " or "")..model.Name
          ..(model:GetAttribute("BossPhase")==2 and " · 2단계" or "")
          ..(state=="STUNNED" and " · 기절" or "")
        control.SetRatio(hp/math.max(1,maximum),string.format("%d",hp))
      end
      model:GetAttributeChangedSignal("EnemyHealth"):Connect(updateEnemyLabel)
      model:GetAttributeChangedSignal("EnemyMaxHealth"):Connect(updateEnemyLabel)
      model:GetAttributeChangedSignal("BossPhase"):Connect(updateEnemyLabel)
      model:GetAttributeChangedSignal("AttackState"):Connect(updateEnemyLabel)
      updateEnemyLabel()
    end
  end
  -- [움직이는 원본 관절] 이름이 다르거나 Blender식 접미사가 붙어도 실제 메시의 뼈를 매핑한다.
  local joints,available={},{}
  local sourceChannels={
    FLHip=true,FRHip=true,BLHip=true,BRHip=true,
    FLKnee=true,FRKnee=true,BLKnee=true,BRKnee=true,
    FLAnkle=true,FRAnkle=true,BLAnkle=true,BRAnkle=true,
    WingL=true,WingR=true,WingL2=true,WingR2=true,WingL3=true,WingR3=true,
    WingL4=true,WingR4=true,Tail=true,Chest=true,Spine=true,
    Neck=true,Jaw=true,Head=true,ThighL=true,ThighR=true,
    ShinL=true,ShinR=true,UpperArmL=true,UpperArmR=true,
    ForearmL=true,ForearmR=true,
  }
  -- [늑대 원본 리그] 해시 확인 FBX의 실제 스킨 관절과 IK 기준으로 앞·뒤·좌·우를 연결한다.
  -- IK 조작용 뼈를 가짜 다리로 쓰지 않고 실제 가중치가 있는 Bone.008~019만 구동한다.
  local wolfSourceChannels={
    bone001="Chest",bone002="Neck",bone003="Head",bone004="Tail",
    bone014="FRHip",bone015="FRKnee",bone016="FRAnkle",
    bone017="FLHip",bone018="FLKnee",bone019="FLAnkle",
    bone008="BLHip",bone009="BLKnee",bone010="BLAnkle",
    bone011="BRHip",bone012="BRKnee",bone013="BRAnkle",
  }
  -- [46본 사슴] GLB 원본 명칭을 실제 스킨 관절에 직접 연결한다.
  -- IK와 End 뼈는 구동하지 않고 어깨/골반 위쪽 원본 뼈만 고관절로 사용한다.
  local deerSourceChannels={
    torso="Spine",torso2="Chest",neck1="Neck",head="Head",tail1="Tail",
    frontupperlegl="FLHip",frontupperlegr="FRHip",
    frontlowerlegl="FLKnee",frontlowerlegr="FRKnee",
    backupperlegl="BLHip",backupperlegr="BRHip",
    backlowerlegl="BLKnee",backlowerlegr="BRKnee",
  }
  -- [쥐 원본 리그] 쥐는 UpLeg/LowLeg 이름을 쓴다. 보조 뼈(FrontLeg 등)는 구동하지 않는다.
  local ratSourceChannels={
    torso="Spine",neck="Neck",head="Head",tail1="Tail",
    frontuplegl="FLHip",frontuplegr="FRHip",frontlowlegl="FLKnee",frontlowlegr="FRKnee",
    backuplegl="BLHip",backuplegr="BRHip",backlowlegl="BLKnee",backlowlegr="BRKnee",
  }
  -- [리그 판별] 변종 모델은 종류가 다른 뼈대를 가진다. 이름으로 4족/2족/곤충을 구분해 알맞은 관절 채널을 쓴다.
  -- 합성 신화 괴물의 부속 조각(MythicParts)은 정적이므로 본체 뼈만 읽는다.
  local rigNames={}
  for _,item in ipairs(model:GetDescendants()) do
    if (item:IsA("Bone") or item:IsA("Motor6D")) and not item:FindFirstAncestor("MythicParts") then
      rigNames[item.Name:lower():gsub("[^%w]","")]=true
    end
  end
  if species=="wolf" or species=="deer" then
    if rigNames.frontupperlegl or rigNames.frontuplegl then
      species=species=="deer" and "deer" or "wolf"
    elseif rigNames.upperarml and rigNames.upperlegl then
      species="golem"
    elseif rigNames.wing4l then
      species="bat"
    elseif rigNames.wingl and rigNames.wingr then
      species="bee"
    end
  end
  -- 뼈 이름이 정확히 일치하는 실제 다리·팔 뼈를 보조 뼈보다 우선한다.
  local preferredBones={upperlegl=true,upperlegr=true,lowerlegl=true,lowerlegr=true,upperarml=true,upperarmr=true}
  local bounds,size=model:GetBoundingBox()
  for _,joint in ipairs(model:GetDescendants()) do
   if not joint:FindFirstAncestor("MythicParts") then
    -- 실제 관절 종류별 연결점을 읽는다. AnimationConstraint는 Attachment를 우선한다.
    local motor=joint:IsA("Motor6D") and joint.Part0 and joint.Part1
    local constraint=joint:IsA("AnimationConstraint") and joint.Attachment0 and joint.Attachment1
    if motor or constraint or joint:IsA("Bone") then
      local raw=joint.Name:lower()
      local key=raw:gsub("[^%w]","")
      local name=(species=="wolf" and (wolfSourceChannels[key] or deerSourceChannels[key] or ratSourceChannels[key]))
        or (species=="deer" and deerSourceChannels[key])
        or nativeMobJointAlias[joint.Name] or joint.Name
      local location=joint:IsA("Bone") and joint.WorldPosition
        or constraint and joint.Attachment1.WorldPosition or joint.Part1.Position
      local relative=bounds:PointToObjectSpace(location)
      local left=key:find("left",1,true) or raw:match("[._%-]l%d*$")
      local right=key:find("right",1,true) or raw:match("[._%-]r%d*$")
      local side=left and "L" or right and "R"
      if not side and math.abs(relative.X)>size.X*.09 then
        side=relative.X<0 and "L" or "R"
      end
      local limb=key:find("leg",1,true) or key:find("hip",1,true)
        or key:find("thigh",1,true) or key:find("shin",1,true)
        or key:find("knee",1,true) or key:find("paw",1,true)
        or key:find("foot",1,true) or key:find("ankle",1,true)
      if not limb and joint:IsA("Bone") then
        limb=relative.Y<-.08*size.Y and math.abs(relative.X)>.12*size.X
          and math.abs(relative.Z)>.12*size.Z
      end
      -- [박쥐 실제 FBX 뼈] Wing1.L~Wing4.R 8마디를 각각 독립 채널로 연결한다.
      -- 날개 뼈를 다리나 만들어 낸 관절로 잘못 분류하지 않는다.
      local batWingSegment=species=="bat" and key:match("wing([1-4])") or nil
      if batWingSegment and side then
        name="Wing"..side..(batWingSegment=="1" and "" or batWingSegment)
      elseif species=="bat" and key=="bodyroot" then
        name="Spine"
      elseif species=="bat" and key=="body" then
        name="Chest"
      elseif species=="bat" and limb and side then
        name=(key:find("lower",1,true) and "Shin" or "Thigh")..side
      elseif not sourceChannels[name] and limb and side then
        local lower=key:find("knee",1,true) or key:find("shin",1,true)
          or key:find("calf",1,true) or key:find("lowerleg",1,true)
        local foot=key:find("foot",1,true) or key:find("paw",1,true)
          or key:find("ankle",1,true)
        if species=="golem" then
          name=(lower or foot) and ("Shin"..side) or ("Thigh"..side)
        else
          local front=key:find("front",1,true) or key:find("fore",1,true)
          local rear=key:find("rear",1,true) or key:find("hind",1,true)
            or key:find("back",1,true)
          -- [실제 사슴 관절] 원본 46관절 앞·뒷다리 이름을 우선하고 좌표는 폴백으로만 쓴다.
          local position=front and "F" or rear and "B"
            or ((species=="deer") == (relative.Z>0)) and "F" or "B"
          name=position..side..(foot and "Ankle" or lower and "Knee" or "Hip")
        end
      elseif not sourceChannels[name] and (species=="bee" or species=="bat") then
        if key:find("wing",1,true) and side then name="Wing"..side end
      elseif not sourceChannels[name] and species=="golem" then
        if (key:find("arm",1,true) or key:find("shoulder",1,true)) and side then
          name="UpperArm"..side
        end
      end
      if sourceChannels[name] and (not joints[name] or constraint
        or (species=="wolf" and joint:IsA("Bone") and not joints[name]:IsA("Bone"))
        or (species=="wolf" and (deerSourceChannels[key] or ratSourceChannels[key]) and joint:IsA("Bone"))
        or (species=="golem" and preferredBones[key] and joint:IsA("Bone"))
        or (species=="deer" and deerSourceChannels[key] and joint:IsA("Bone"))) then
        -- [원본 스킨 우선] 같은 이름의 연결부가 중복되면 늑대 메시를 실제로 변형하는 Bone을 사용한다.
        -- 다리를 새로 만들지 않고 기존 정규화된 원본 스킨 관절을 재사용한다.
        joints[name]=joint
        available[name]=true
      end
    end
   end
  end
  -- [관절 축 보정] FBX/GLB 뼈마다 로컬 X축 방향이 달라서(늑대 뒷다리는 몸 앞뒤 방향) 같은 각도를 넣으면
  -- 다리가 좌우로 휘둘린다. 모든 포즈는 '몸 기준(오른쪽=X, 위=Y, 뒤=Z)'으로 만들고
  -- 각 뼈의 처음 방향으로 바꿔서 넣는다. 4족(늑대·사슴)만 적용한다.
  local axisFix=nil
  if (species=="wolf" or species=="deer") and available.FLHip and available.FRHip
    and available.BLHip and available.BRHip
    and joints.FLHip:IsA("Bone") and joints.FRHip:IsA("Bone")
    and joints.BLHip:IsA("Bone") and joints.BRHip:IsA("Bone") then
    local front=(joints.FLHip.WorldPosition+joints.FRHip.WorldPosition)*.5
    local back=(joints.BLHip.WorldPosition+joints.BRHip.WorldPosition)*.5
    local forward=Vector3.new(front.X-back.X,0,front.Z-back.Z)
    if forward.Magnitude>.05 then
      forward=forward.Unit
      local upAxis=Vector3.yAxis
      local canon=CFrame.fromMatrix(Vector3.zero,forward:Cross(upAxis),upAxis,-forward)
      axisFix={}
      for name,joint in pairs(joints) do
        if joint:IsA("Bone") then
          local rest=(joint.WorldCFrame*joint.Transform:Inverse()).Rotation
          axisFix[name]={pre=rest:Inverse()*canon,post=canon:Inverse()*rest}
        end
      end
    end
  end
  local count=0
  for _ in pairs(joints) do count+=1 end
  local bodyPlan=(species=="bee" or species=="bat") and "FLYER" or
    species=="golem" and "GIANT" or "QUADRUPED"
  local movingJoints=(species=="bee" or species=="bat") and
      (available.WingL or available.WingR or available.UpperArmL or available.UpperArmR)
    or species=="golem" and
      (available.ThighL or available.ThighR or available.UpperArmL or available.UpperArmR)
    or (available.FLHip or available.FRHip or available.BLHip or available.BRHip)
  -- [실제 원본 사슴·늑대 모션] 등록된 AnimationId가 있으면 저작된 걷기/달리기를 우선한다.
  -- 단순 뼈 회전은 원본 애니메이션을 찾지 못할 때만 기존 책임 관절에 적용한다.
  local nativeAnimations={}
  -- [사슴 46본] 정식 게시된 원본 Idle/Walk/Gallop 클립이 있으면 우선 사용한다.
  -- 클립 ID가 없거나 재생 불가하면 기존 네 다리 Bone 보행·질주를 그대로 사용한다.
  if species=="wolf" or species=="bat" or species=="deer" then
    for _,animation in ipairs(model:GetDescendants()) do
      if animation:IsA("Animation") and animation.AnimationId:match("^rbxassetid://[1-9]%d*$") then
        -- [공식 Animator] 이름에 Idle_HitReact가 포함되어도 대기 클립으로 잘못 선택하지 않는다.
        -- 저작 GLB 애니메이션은 Roblox AnimationId로 독립 게시된 경우에만 재생한다.
        local key=animation.Name:lower():match("[^|]+$") or animation.Name:lower()
        local mode=key=="idle" and "IDLE"
          or key=="walk" and "WALK"
          or (key=="gallop" or key=="run") and "RUN"
          or key=="fly" and "FLY"
          or (key:find("hitreact",1,true) or key=="hit") and "HIT"
          or key:find("attack",1,true) and "ATTACK"
          or (key=="dead" or key=="death") and "DEATH" or nil
        if mode and not nativeAnimations[mode] then nativeAnimations[mode]=animation end
      end
    end
  end
  local nativeTracks=nil
  if (nativeAnimations.IDLE and nativeAnimations.WALK)
    or (species=="bat" and nativeAnimations.FLY and nativeAnimations.ATTACK) then
    local animationController=model:FindFirstChildWhichIsA("AnimationController",true)
    if not animationController then
      animationController=Instance.new("AnimationController")
      animationController.Name="OriginalWildlifeAnimationController"
      animationController.Parent=model
    end
    local animator=animationController:FindFirstChildOfClass("Animator")
    if not animator then animator=Instance.new("Animator");animator.Parent=animationController end
    local tracks={}
    for mode,animation in pairs(nativeAnimations) do
      local ok,track=pcall(function()return animator:LoadAnimation(animation)end)
      if ok and track then
        track.Looped=mode=="WALK" or mode=="RUN" or mode=="IDLE" or mode=="FLY"
        -- [공식 우선순위] 대기 < 이동 < 공격/피격/사망.
        track.Priority=(mode=="ATTACK" or mode=="HIT" or mode=="DEATH")
          and Enum.AnimationPriority.Action
          or mode=="IDLE" and Enum.AnimationPriority.Idle
          or Enum.AnimationPriority.Movement
        tracks[mode]=track
      end
    end
    if (tracks.IDLE and tracks.WALK)
      or (species=="bat" and tracks.FLY and tracks.ATTACK) then nativeTracks=tracks end
  end
  -- [실제 원본 4족 관절] 네 고관절 또는 원본 걷기 애니메이션이 있어야 정상 모션으로 인정.
  local wolfFourLegRig=species~="wolf" or
    (available.FLHip and available.FRHip and available.BLHip and available.BRHip)
  local deerFourLegRig=species~="deer" or
    (available.FLHip and available.FRHip and available.BLHip and available.BRHip)
  -- 좌우 원본 날개가 네 마디씩 실제로 존재해야 박쥐를 정상 리깅으로 인정한다.
  local batEightWingRig=species~="bat" or (available.WingL and available.WingR
    and available.WingL2 and available.WingR2 and available.WingL3 and available.WingR3
    and available.WingL4 and available.WingR4)
  local actualRig=count>=2 and movingJoints==true and wolfFourLegRig==true
    and deerFourLegRig==true and batEightWingRig==true
  -- [모션 복구] 정식 AnimationTrack이 로딩 실패/빈 클립이면 같은 원본 관절로 즉시 이어갈 수 있게 준비한다.
  -- 정상 원본 클립 재생 중에는 공용 포즈를 절대 덮지 않는다.
  local controller=actualRig and meadowMobMotion and meadowMobMotion.BindJointPose(joints,{
    followAnimator=true,response=26,
  }) or nil
  local row={controller=controller,nativeTracks=nativeTracks,available=available,plan=bodyPlan,axisFix=axisFix,
    species=species,phase=0,poses={},lastMode=nil,motionStartedAt=os.clock(),
    lastPosition=model:GetPivot().Position,travel=0,groundSpeed=0,renderAccumulator=0,
    lastHeading=model:GetPivot().LookVector,turnLean=0,
    originalTrackWaitStartedAt=os.clock(),
    -- [모션] 실제 관절의 직전 포즈를 저장해 정지·추적·공격 사이를 매끄럽게 잇는다.
    transitionFrom={},renderedPoses={},transitionStartedAt=0,transitionDuration=0}
  model:SetAttribute("NativeCreatureRigMode",nativeTracks and "ORIGINAL_ANIMATION_TRACKS"
    or actualRig and "ORIGINAL_JOINT_RIG" or "UNRIGGED_SOURCE_MESH_NEEDS_ANIMATED_ASSET")
  if not actualRig and not nativeTracks and not meadowMobRigWarnings[species] then
    meadowMobRigWarnings[species]=true
    warn("마력숲 원본 애니메이션 뼈 미연결: "..species..", 탐지 관절="..count)
  end
  meadowMobControllers[model]=row
  model:GetAttributeChangedSignal("AttackState"):Connect(function()
    if not model.Parent then return end
    if model:GetAttribute("AttackState")=="ANTICIPATION" then
      mobVfx(model:GetAttribute("AttackPattern"),model:GetPivot().Position,"ANTICIPATION")
    end
  end)
  model.Destroying:Connect(function()
    if controller then controller.Destroy(false) end
    if nativeTracks then for _,track in pairs(nativeTracks) do track:Stop(0) end end
    meadowMobControllers[model]=nil
  end)
end
for _,model in ipairs(meadowMobWorld:GetChildren()) do bindOriginalMob(model) end
meadowMobWorld.ChildAdded:Connect(function(model)
  if model:IsA("Model") then
    bindOriginalMob(model)
    if not meadowMobControllers[model] then
      task.defer(function() if model.Parent then bindOriginalMob(model) end end)
    end
  end
end)
-- [거리별 로딩] Roblox 스트리밍으로 멀어진 몬스터가 사라지면 기존 관절 제어기를 정리한다.
-- 다시 근처로 오면 위 ChildAdded에서 새로 연결한다. 서버의 몬스터/보상 상태와 무관하다.
meadowMobWorld.ChildRemoved:Connect(function(model)
  local row=meadowMobControllers[model]
  if not row then return end
  if row.controller then row.controller.Destroy(false) end
  if row.nativeTracks then for _,track in pairs(row.nativeTracks) do track:Stop(0) end end
  meadowMobControllers[model]=nil
end)
game:GetService("RunService").PreSimulation:Connect(function(dt)
  -- [성능] 멀리(140스터드 초과) 있는 몹은 화면에 거의 안 보이므로 관절·클립 갱신을 건너뛴다.
  local lodRoot=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  local lodPos=lodRoot and lodRoot.Position
  for model,row in pairs(meadowMobControllers) do
    local farAway=false
    if lodPos and model.Parent then
      local d=model:GetPivot().Position-lodPos
      farAway=d.X*d.X+d.Z*d.Z>19600
    end
    if model.Parent and not farAway and (row.controller or row.nativeTracks) then
      local requested=model:GetAttribute("NativeMobMotion")
      -- 상태값을 먼저 보존하고, 서버 상태가 없을 때만 종별 기본 모션을 사용한다.
      local mode=nativeMobMotionMap[requested]
      if not mode then
        local wildlife=row.species=="deer" or row.species=="boar" or row.species=="rabbit"
        mode=wildlife and "WALK" or "IDLE"
      end
      -- [박쥐 비행] 걷기/질주/대기도 지상 발구르기 대신 원본 날개 비행으로 재생한다.
      if row.species=="bat" and (mode=="IDLE" or mode=="WALK" or mode=="RUN") then
        mode="FLY"
      end
      -- [원본 애니메이션] Idle/Walk/Run/Attack 클립은 실제 메쉬의 Animator가 구동한다.
      -- 질주 클립이 없는 사슴은 걷기 클립을 빠르게 재생한다. 합성 관절은 동시에 구동하지 않는다.
      if row.nativeTracks then
        -- [늑대 동작 복구] 원본 걷기/달리기 클립은 유지하고,
        -- 공격 예고·피격·회복 또는 공격 클립이 없는 경우 기존 원본 뼈의 절차 모션을 재사용한다.
        -- [사슴·늑대] 저작 클립이 없는 예고/회복은 Idle로 덮지 않고 실제 관절로 연출한다.
        local quadrupedAction=(row.species=="wolf" or row.species=="deer") and row.controller
          and (mode=="ANTICIPATION" or mode=="RECOVERY"
            or (mode=="HIT" and not row.nativeTracks.HIT)
            or (mode=="ATTACK" and not row.nativeTracks.ATTACK))
        if quadrupedAction then
          if row.playingTrack then row.playingTrack:Stop(.1);row.playingTrack=nil end
        else
          local track=row.nativeTracks[mode] or
            (row.species=="bat" and row.nativeTracks.FLY)
            or (mode=="RUN" and row.nativeTracks.WALK)
            or (mode=="ANTICIPATION" or mode=="RECOVERY" or mode=="HIT") and row.nativeTracks.IDLE
            or row.nativeTracks.IDLE
          if track and track~=row.playingTrack then
            if row.playingTrack then row.playingTrack:Stop(.16) end
            track:Play(.16,1,mode=="RUN" and not row.nativeTracks.RUN and 1.55 or 1)
            row.playingTrack=track
          end
          if track and track.IsPlaying then
            track:AdjustSpeed(mode=="RUN" and not row.nativeTracks.RUN and 1.55 or 1)
          end
          -- 원본 클립이 실행 불가/길이 0이면 기존 4족 본 모션으로 전환한다.
          local missing=not track or not track.IsPlaying or track.Length<=0
          if (row.species=="wolf" or row.species=="deer") and row.controller and missing
            and os.clock()-row.originalTrackWaitStartedAt>=2.5 then
            for _,original in pairs(row.nativeTracks) do original:Stop(.12) end
            row.nativeTracks=nil
            row.playingTrack=nil
            model:SetAttribute("NativeCreatureRigMode","ORIGINAL_JOINT_RIG")
          else
            continue
          end
        end
      end
      -- 서버 적중시각으로 공격 충격과 복귀만 연출한다. 피해 판정은 서버가 유지한다.
      local forcedPhase=nil
      local impactAt=tonumber(model:GetAttribute("NativeMobLastImpact")) or 0
      local eventAt=tonumber(model:GetAttribute("NativeMobMotionStartedAt")) or 0
      local impactAge=workspace:GetServerTimeNow()-impactAt
      if requested=="RECOVERY" and impactAt>=eventAt and impactAge>=0 and impactAge<.56 then
        if impactAge<.20 then
          mode="ATTACK"
          forcedPhase=math.clamp(.38+impactAge/.20*.45,0,1)
        else
          mode="RECOVERY"
          forcedPhase=math.clamp((impactAge-.20)/.36,0,1)
        end
      end
      -- [4족 접지] 시간만으로 다리를 휘두르면 제자리에서도 발이 미끄러진다.
      -- 실제 서버 메시 피벗의 수평 이동거리로 보폭을 맞추고 멈추면 가볍게 정지한다.
      local position=model:GetPivot().Position
      local moved=Vector3.new(position.X-row.lastPosition.X,0,position.Z-row.lastPosition.Z)
      row.lastPosition=position
      local traveled=moved.Magnitude
      -- [늑대 회전 관성] 서버가 실제로 바라보는 방향과 전진축의 차이만 관절에 부드럽게 전달.
      if row.species=="wolf" then
        local heading=model:GetPivot().LookVector
        local previous=row.lastHeading or heading
        local bend=math.clamp(previous:Cross(heading).Y*2.2,-.28,.28)
        row.turnLean+=(bend-row.turnLean)*math.min(1,dt*9)
        row.lastHeading=heading
      end
      local step=math.clamp(dt,1/120,.12)
      local rawSpeed=traveled>5 and 0 or math.min(traveled/step,24)
      row.groundSpeed+=(rawSpeed-row.groundSpeed)*math.min(1,step*9)
      local footTravel=(mode=="WALK" or mode=="RUN") and row.plan=="QUADRUPED"
      if footTravel then
        if traveled>.015 and traveled<=5 then row.travel+=traveled end
        if row.groundSpeed<.35 then mode="IDLE" end
      end
      -- [달릴 때 흙먼지] 늑대·사슴·멧돼지가 달리면 발밑에 흙먼지가 날린다(표시용 효과).
      if row.plan=="QUADRUPED" then
        if not row.dust then
          local anchor=Instance.new("Attachment");anchor.Name="MobDustAnchor";anchor.Parent=workspace.Terrain
          local emitter=Instance.new("ParticleEmitter");emitter.Name="MobDust";emitter.Parent=anchor
          emitter.Texture="rbxasset://textures/particles/smoke_main.dds"
          emitter.Color=ColorSequence.new(Color3.fromRGB(150,132,104))
          emitter.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.55),NumberSequenceKeypoint.new(1,1)})
          emitter.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.5),NumberSequenceKeypoint.new(1,1.9)})
          emitter.Lifetime=NumberRange.new(.35,.7);emitter.Speed=NumberRange.new(.8,2.2)
          emitter.SpreadAngle=Vector2.new(25,25);emitter.Rate=0;emitter.LightEmission=0;emitter.Drag=3
          emitter.Acceleration=Vector3.new(0,1.2,0)
          local box,boxSize=model:GetBoundingBox()
          row.dustFoot=(box.Position.Y-boxSize.Y*.5)-model:GetPivot().Position.Y
          row.dust=emitter;row.dustAnchor=anchor
          model.Destroying:Once(function() anchor:Destroy() end)
        end
        local pivotPosition=model:GetPivot().Position
        row.dustAnchor.WorldPosition=pivotPosition+Vector3.new(0,row.dustFoot+.15,0)
        row.dust.Rate=(mode=="RUN" and row.groundSpeed>2.5) and (row.species=="wolf" and 26 or 20) or 0
      end
      if mode~=row.lastMode then
        -- [모션 전환] 이전 원본 리그 포즈에서 새 행동으로 연속 보간한다.
        table.clear(row.transitionFrom)
        for joint,pose in pairs(row.renderedPoses) do
          row.transitionFrom[joint]=pose
        end
        row.transitionStartedAt=os.clock()
        row.transitionDuration=mode=="ATTACK" and .10
          or mode=="HIT" and .12 or mode=="DEATH" and .18 or .24
        row.lastMode=mode
        row.motionStartedAt=os.clock()
        row.phase=0
      end
      local epoch=model:GetAttribute("NativeMobMotionStartedAt")
      local serverAge=typeof(epoch)=="number" and math.max(0,workspace:GetServerTimeNow()-epoch) or nil
      if serverAge then row.phase=serverAge else row.phase+=math.min(dt,.12) end
      local repeating=mode=="IDLE" or mode=="WALK" or mode=="RUN" or mode=="FLY"
      local duration=mode=="DEATH" and 1.32 or mode=="ATTACK" and .75
        or mode=="ANTICIPATION" and .42 or mode=="RECOVERY" and .38
        or mode=="HIT" and .46 or mode=="START" and .36
        or mode=="RUN" and .82 or mode=="FLY" and .86 or 1.15
      local authoredDuration=model:GetAttribute("NativeMobMotionDuration")
      if mode=="ANTICIPATION" and typeof(authoredDuration)=="number" then
        duration=math.max(.12,authoredDuration)
      end
      local phase=repeating and (row.phase%duration)/duration
        or math.clamp((os.clock()-row.motionStartedAt)/duration,0,1)
      if footTravel and mode~="IDLE" then
        -- 걷기/달리기 모두 실제 전진 거리당 한 걸음: 앞뒤 대각 발의 접지와 일치.
        local stride=mode=="RUN" and (row.species=="deer" and 4.2 or 5.5)
          or (row.species=="deer" and 2.7 or 3.9)
        phase=(row.travel%stride)/stride
      end
      if not repeating and serverAge then phase=math.clamp(serverAge/duration,0,1) end
      if forcedPhase then phase=forcedPhase end
      -- [모바일 최적화] 멀리 있는 관절만 저주기로 갱신한다. 서버 AI/피해/표적 상태는 그대로 둔다.
      row.renderAccumulator+=dt
      local camera=workspace.CurrentCamera
      local visualDistance=camera and (camera.CFrame.Position-position).Magnitude or 0
      local sampleInterval=visualDistance>(nativeTouchEnabled and 90 or 150) and 1/18
        or visualDistance>55 and nativeTouchEnabled and 1/28 or 0
      if sampleInterval>0 and row.renderAccumulator<sampleInterval then continue end
      local poseDt=math.min(row.renderAccumulator,.12)
      row.renderAccumulator=0
      table.clear(row.poses)
      local _,matched=meadowMobMotion.SampleProceduralActorMotion(mode,
        phase,{
          bodyPlan=row.plan,actorClass=model:GetAttribute("Boss") and "BOSS" or "CREATURE",
          availableJoints=row.available,mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
          secondary=.7,intensity=footTravel and 1.08 or 1.24,
          profile={limbArc=footTravel and 1.08 or 1.3,footContact=1.28,attackStrike=1.22},
        },row.poses)
      if matched then
        -- [공통 생동감] 원본 리그가 갖춘 관절만 사용한다. 정지·피격·죽음·예고를 종별로 보간한다.
        local cycle=phase*math.pi*2
        local heavy=row.species=="golem" or row.species=="boar"
        if mode=="IDLE" then
          local breath=math.sin(cycle)*(heavy and .018 or .032)
          if row.available.Chest then row.poses.Chest=CFrame.Angles(breath,0,0) end
          if row.available.Spine then row.poses.Spine=CFrame.Angles(breath*.65,0,0) end
          if row.available.Neck then row.poses.Neck=CFrame.Angles(-breath*.6,0,0) end
          if row.available.Head then row.poses.Head=CFrame.Angles(-breath*.55,math.sin(cycle*.5)*.065,0) end
          if row.available.Tail then row.poses.Tail=CFrame.Angles(0,math.sin(cycle*.7)*.105,0) end
          -- [종별 대기] 사슴은 귀를 기울이는 목·머리의 경계 동작, 늑대는 코로 흔적을 찾는다.
          -- 실제 Bone만 구동하고 AI/탐지거리/공격 판정은 절대 변경하지 않는다.
          if row.species=="deer" then
            local look=math.sin(cycle*.55)
            -- [사슴 직립] CC0 원본 기본 목과 머리는 이미 위를 본다. 과도한 고개 숙임을 없앤다.
            if row.available.Chest then row.poses.Chest=CFrame.Angles(.012*math.sin(cycle),0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(-.12+math.sin(cycle)*.022,look*.035,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(-.11+math.sin(cycle*.7)*.025,look*.06,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(0,look*.10,0) end
          elseif row.species=="wolf" then
            local scent=math.sin(cycle*.8)
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.045+scent*.08,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(-.04+scent*.10,math.sin(cycle*.4)*.11,0) end
          end
          -- [4족 대기] 호흡에 맞춰 어깨와 뒷다리에 체중을 번갈아 실어 생명감을 준다.
          if row.plan=="QUADRUPED" then
            local weight=math.sin(cycle*.5)*(row.species=="boar" and .035 or .055)
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles((front and -.035 or .025)+weight*(front and 1 or -.6),0,0)
              end
              if row.available[key.."Knee"] then
                row.poses[key.."Knee"]=CFrame.Angles(.045+math.abs(weight)*.35,0,0)
              end
            end
          end
          if row.plan=="FLYER" then
            local flap=math.sin(cycle*2)*.24
            if row.available.WingL then row.poses.WingL=CFrame.Angles(0,0,flap) end
            if row.available.WingR then row.poses.WingR=CFrame.Angles(0,0,-flap) end
          end
        elseif mode=="HIT" or mode=="DEATH" then
          local reaction=mode=="DEATH" and math.sin(math.min(phase,1)*math.pi*.5)
            or math.sin(phase*math.pi)
          if row.available.Chest then row.poses.Chest=CFrame.Angles(-reaction*(heavy and .18 or .28),0,reaction*.12) end
          if row.available.Head then row.poses.Head=CFrame.Angles(reaction*.23,0,-reaction*.16) end
          if row.available.Neck then row.poses.Neck=CFrame.Angles(reaction*.15,0,0) end
          if row.available.Tail then row.poses.Tail=CFrame.Angles(0,-reaction*.25,0) end
          -- [4족 피격·사망] 앞다리 버팀과 뒷다리 주저앉기를 서로 다르게 연출한다.
          if row.plan=="QUADRUPED" then
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles(reaction*(front and -.20 or .24),0,0)
              end
              if row.available[key.."Knee"] then
                row.poses[key.."Knee"]=CFrame.Angles(reaction*(front and .34 or .56),0,0)
              end
              if row.available[key.."Ankle"] then
                row.poses[key.."Ankle"]=CFrame.Angles(-reaction*(front and .08 or .17),0,0)
              end
            end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(-reaction*.16,0,reaction*.07) end
          end
          if row.plan=="FLYER" then
            if row.available.WingL then row.poses.WingL=CFrame.Angles(0,0,reaction*.35) end
            if row.available.WingR then row.poses.WingR=CFrame.Angles(0,0,-reaction*.35) end
          end
        elseif row.species~="wolf" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY") then
          local ready=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
          local strike=mode=="ATTACK" and math.sin(phase*math.pi) or 0
          local release=mode=="RECOVERY" and 1-phase or 0
          if row.available.Chest then
            row.poses.Chest=CFrame.Angles(-ready*.20+strike*(heavy and .40 or .30)-release*.08,0,0)
          end
          if row.available.Head then
            row.poses.Head=CFrame.Angles(ready*.16-strike*.26+release*.12,0,0)
          end
          if row.available.Neck then row.poses.Neck=CFrame.Angles(ready*.12-strike*.25,0,0) end
          if row.available.Jaw then row.poses.Jaw=CFrame.Angles(ready*.12+strike*.42,0,0) end
          if row.plan=="QUADRUPED" then
            for _,key in ipairs({"FL","FR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(-ready*.20+strike*.28,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(ready*.17+strike*.10,0,0) end
            end
          elseif row.plan=="FLYER" then
            if row.available.WingL then row.poses.WingL=CFrame.Angles(0,0,ready*.40-strike*.48) end
            if row.available.WingR then row.poses.WingR=CFrame.Angles(0,0,-ready*.40+strike*.48) end
          else
            if row.available.UpperArmL then row.poses.UpperArmL=CFrame.Angles(-ready*.55+strike*.80,0,-ready*.20) end
            if row.available.UpperArmR then row.poses.UpperArmR=CFrame.Angles(-ready*.48+strike*.90,0,ready*.20) end
          end
        end
        -- [황혼 박쥐 8마디 실제 날개] 원본 Bat.fbx의 좌·우 Wing1~Wing4 뼈를 연속 구동한다.
        -- 날갯짓 파동은 몸쪽에서 날개 끝으로 늦게 전달된다. 서버 피해/충돌과 무관하다.
        if row.species=="bat" then
          local cycle=phase*math.pi*2
          local ready=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
          local strike=mode=="ATTACK" and math.sin(phase*math.pi) or 0
          local recover=mode=="RECOVERY" and 1-phase or 0
          local hit=mode=="HIT" and math.sin(phase*math.pi) or 0
          local death=mode=="DEATH" and math.sin(phase*math.pi*.5) or 0
          local flapStrength=mode=="FLY" and .74 or mode=="IDLE" and .35
            or mode=="ANTICIPATION" and .22 or mode=="RECOVERY" and .28 or .12
          for _,side in ipairs({"L","R"}) do
            local direction=side=="L" and 1 or -1
            for segment=1,4 do
              local channel="Wing"..side..(segment==1 and "" or tostring(segment))
              if row.available[channel] then
                local lag=(segment-1)*.31
                local wave=math.sin(cycle-lag)
                local spread=flapStrength*wave*(1-(segment-1)*.13)
                local fold=.42*ready-.52*strike+.24*recover-.25*hit-.62*death
                local extension=(segment-1)*(.065*math.cos(cycle-lag)-.11*strike)
                row.poses[channel]=CFrame.Angles(.04*wave*(segment-1),extension,
                  direction*(spread+fold))
              end
            end
          end
          if row.available.Chest then
            row.poses.Chest=CFrame.Angles(-.12*ready+.24*strike-.10*recover,0,0)
          end
          if row.available.Neck then
            row.poses.Neck=CFrame.Angles(.12*ready-.22*strike,0,0)
          end
          if row.available.Head then
            row.poses.Head=CFrame.Angles(.15*ready-.30*strike+.08*recover,0,0)
          end
          if row.available.ThighL then row.poses.ThighL=CFrame.Angles(.25+.14*strike,0,0) end
          if row.available.ThighR then row.poses.ThighR=CFrame.Angles(.25+.14*strike,0,0) end
          if row.available.ShinL then row.poses.ShinL=CFrame.Angles(-.18,0,0) end
          if row.available.ShinR then row.poses.ShinR=CFrame.Angles(-.18,0,0) end
        end
        -- [4족 걷기/질주] 실제 발의 지지·회수·공중 구간을 원본 관절로만 연출한다.
        -- 서버 속도/피해/접촉 판정은 변경하지 않고 원본 Bone의 로컬 회전만 갱신한다.
        if row.plan=="QUADRUPED" then
          if mode=="WALK" or mode=="RUN" then
            local running=mode=="RUN"
            local wolf=row.species=="wolf"
            local heavy=row.species=="boar"
            local deer=row.species=="deer"
            -- 사슴은 느리게 걸어도 다리가 보이도록 최소 보폭을 키우고, 달릴 땐 크게 뛴다.
            local pace=math.clamp(row.groundSpeed/(running and 7 or 3),deer and .7 or .35,1)
            -- [동작 보정] 달릴 때 발이 계속 공중에 떠 접지가 안 보이고 무릎이 과하게 접혀 보였다.
            -- 진폭·공중 구간·무릎 접힘을 줄이고 지지 구간을 늘려 발이 땅을 딛는 것처럼 보이게 한다.
            local amplitude=(running and (wolf and .56 or deer and .70 or .52)
              or deer and .50 or heavy and .30 or .36)*pace
            local stance=running and (wolf and .42 or deer and .54 or .43) or deer and .66 or heavy and .67 or .61
            local cycle=phase*math.pi*2
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local front=key:sub(1,1)=="F"
              local offset=running
                and (wolf and wolfGallopOffsets[key]
                  or row.species=="deer" and deerGallopOffsets[key] or foot[3])
                or foot[2]
              local legPhase=(phase+offset)%1
              local hip,knee,ankle
              if legPhase<stance then
                -- 착지 후 지지: 발목이 뒤로 미끄러지지 않게 무릎을 펴고 체중을 전달.
                local p=legPhase/stance
                local load=math.sin(math.pi*p)
                hip=amplitude*(1-p*2)
                knee=.015+load*(wolf and .065 or heavy and .065 or .040)
                ankle=-.018+load*(wolf and .09 or .042)
                if wolf and running then
                  -- 지지 구간 말미 뒷발로 추진하고 앞발이 충격을 흡수한다.
                  knee+=front and .08*load or -.035*load
                  ankle+=front and -.08*load or .14*math.sin(p*math.pi*.5)
                end
              else
                -- 회수: 어깨/고관절 스윙, 무릎 접힘, 발끝 끌림 방지.
                local p=(legPhase-stance)/(1-stance)
                local lift=math.sin(math.pi*p)
                local ease=p*p*(3-2*p)
                hip=-amplitude*(1-2*ease)
                knee=lift*(running and (wolf and (front and .58 or .70) or deer and .42 or .68)
                  or deer and .30 or heavy and .38 or .48)
                ankle=-lift*(running and (wolf and .24 or deer and .16 or .22) or deer and .10 or .15)
              end
              if not front then hip*=heavy and .83 or wolf and .97 or .92 end
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles(hip,0,wolf and (key:sub(2)=="L" and 1 or -1)*.028*pace or 0)
              end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(knee,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(ankle,0,0) end
            end
            -- 네 발의 힘이 척추·어깨·목·꼬리를 따라 전달된다.
            local suspension=math.sin(cycle*(running and 2 or 1))
            local deerRun=row.species=="deer" and running
            local bounce=suspension*(running and (wolf and .075 or deerRun and .072 or .057)
              or heavy and .020 or .030)*pace
            local roll=math.sin(cycle)*(running and .027 or .034)*pace
            local chestPitch=wolf and running and -.055*math.cos(cycle)
              or deerRun and -.085*math.cos(cycle-.25)*pace or bounce
            local waistPitch=wolf and running and .11*math.cos(cycle-.48)
              or deerRun and .10*math.cos(cycle-.65)*pace or -bounce*.46
            local turn=wolf and row.turnLean or 0
            if row.available.Chest then
              row.poses.Chest=CFrame.Angles(chestPitch,turn*.24,roll+turn*.33)
            end
            if row.available.Spine then
              row.poses.Spine=CFrame.Angles(waistPitch,-turn*.16,-roll*.65+turn*.17)
            end
            if row.available.Neck then
              row.poses.Neck=CFrame.Angles(row.species=="deer" and
                (-.12+math.sin(cycle)*.022) or -chestPitch*.72,turn*.21,-roll*.34-turn*.21)
            end
            if row.available.Head then
              row.poses.Head=CFrame.Angles(row.species=="deer" and
                (-.10+math.cos(cycle-.18)*.018) or -chestPitch*.50,-turn*.38,-roll*.20-turn*.15)
            end
            if row.species=="deer" then
              -- [사슴 발 지지] 원본 기본 척추와 머리 높이를 지키면서 보폭만 표현한다.
              if row.available.Chest then row.poses.Chest=CFrame.Angles(.018*math.sin(cycle),0,roll*.23) end
              if row.available.Spine then row.poses.Spine=CFrame.Angles(-.024*math.sin(cycle),0,-roll*.20) end
            end
            if row.available.Tail then
              row.poses.Tail=CFrame.Angles(-waistPitch*.26,
                math.sin(cycle-.55)*.12*pace-turn*.35,0)
            end
          elseif row.species=="wolf" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY") then
            -- [늑대 공격] 뒷다리에 체중을 실어 웅크림 → 전방 돌진 → 목/턱 물기 → 자세 회복.
            local windup=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
            local bite=mode=="ATTACK" and math.sin(math.pi*phase) or 0
            local settle=mode=="RECOVERY" and (1-phase) or 0
            local lunge=model:GetAttribute("AttackPattern")=="WOLF_LUNGE" and 1.25 or 1
            -- [늑대 영화식 포식 액션] 크게 웅크림 → 뒷발 추진 → 상체 급격히 전진 → 목과 턱으로 물기.
            if row.available.Chest then row.poses.Chest=CFrame.Angles(-.29*windup-.58*bite*lunge+.19*settle,0,.08*windup) end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(.37*windup-.34*bite*lunge,0,-.10*bite) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.40*windup-.74*bite*lunge+.18*settle,0,.10*bite) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.48*windup-.91*bite*lunge+.22*settle,0,-.12*bite) end
            if row.available.Jaw then row.poses.Jaw=CFrame.Angles(.34*windup+1.01*bite,0,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(.27*windup-.34*bite,math.sin(phase*math.pi*2)*.13,0) end
            for _,key in ipairs({"FL","FR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(-.39*windup+.56*bite*lunge,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.40*windup+.28*bite,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(-.15*windup-.26*bite,0,0) end
            end
            for _,key in ipairs({"BL","BR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(.33*windup-.48*bite*lunge,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.50*windup+.15*bite,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(-.24*windup+.19*bite,0,0) end
            end
          elseif mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY" then
            -- [기존 초식동물] 사슴·멧돼지·토끼의 공격 연출은 그대로 유지한다.
            local ready=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
            local strike=mode=="ATTACK" and math.sin(phase*math.pi) or 0
            local recover=mode=="RECOVERY" and 1-phase or 0
            local charge=row.species=="boar" and 1.20 or row.species=="deer" and .95 or .72
            if row.available.Spine then row.poses.Spine=CFrame.Angles(.12*ready-.23*strike*charge+.10*recover,0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.17*ready-.32*strike*charge+.10*recover,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.22*ready-.40*strike*charge+.14*recover,0,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(-.10*ready+.18*strike,0,0) end
            for _,key in ipairs({"FL","FR","BL","BR"}) do
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles((front and -.25 or .21)*ready
                  +(front and .31 or -.29)*strike*charge,0,0)
              end
              if row.available[key.."Knee"] then
                row.poses[key.."Knee"]=CFrame.Angles((front and .24 or .31)*ready
                  +(front and .08 or .19)*strike,0,0)
              end
            end
          elseif mode=="IDLE" then
            -- [대기 숨쉬기] 4족 몹이 가만히 있어도 호흡·꼬리·귀 쪽 머리 움직임이 있어 얼어붙어 보이지 않는다. 사슴은 가끔 풀을 뜯듯 머리를 숙인다.
            local t=os.clock()+(row.idleSeed or 0)
            row.idleSeed=row.idleSeed or (math.random()*20)
            local breath=math.sin(t*1.7)
            local deer=row.species=="deer"
            local graze=deer and math.max(0,math.sin(t*.35))^3 or 0
            if row.available.Chest then row.poses.Chest=CFrame.Angles(.016*breath,0,0) end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(-.010*breath,0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.05*graze*4+math.sin(t*.6)*.018,math.sin(t*.43)*.07,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.10*graze*4+math.sin(t*.8)*.02,math.sin(t*.43+.6)*.10,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(0,math.sin(t*(deer and 2.4 or 1.3))*(deer and .16 or .12),0) end
          elseif mode=="HIT" then
            -- [피격 반응] 맞는 순간 몸이 뒤로 젖혀지고 머리가 들리며 네 다리가 버틴다.
            local flinch=math.sin(math.pi*math.clamp(phase,0,1))
            if row.available.Chest then row.poses.Chest=CFrame.Angles(.30*flinch,0,.06*flinch) end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(.20*flinch,0,-.05*flinch) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(-.34*flinch,.10*flinch,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(-.42*flinch,.14*flinch,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(-.30*flinch,0,0) end
            for _,key in ipairs({"FL","FR","BL","BR"}) do
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles((front and .26 or -.20)*flinch,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.16*flinch,0,0) end
            end
          elseif mode=="DEATH" then
            -- [쓰러짐] 다리가 접히고 몸통이 옆으로 기울며 머리가 떨어진다. 끝 자세를 유지한다.
            local ease=math.clamp(phase,0,1)
            ease=ease*ease*(3-2*ease)
            if row.available.Chest then row.poses.Chest=CFrame.Angles(.12*ease,0,.95*ease) end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(.06*ease,0,.40*ease) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.30*ease,0,.22*ease) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.34*ease,0,.18*ease) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(.25*ease,0,0) end
            for _,key in ipairs({"FL","FR","BL","BR"}) do
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles((front and -.55 or .55)*ease,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.85*ease,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(-.30*ease,0,0) end
            end
          end
        end
        -- [수문장 액션] 실제 원본 팔·다리만 큰 예비 동작과 충격 뒤 복귀에 연결한다.
        if row.species=="golem" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY" or mode=="HIT") then
          local shock=model:GetAttribute("AttackPattern")=="GOLEM_SHOCKWAVE"
          local lift=(mode=="ANTICIPATION" or mode=="ATTACK") and math.sin(phase*math.pi*.5) or (1-phase)
          local pitch=(mode=="ANTICIPATION" or mode=="ATTACK") and -(shock and .75 or 1.35)*lift or .5*lift
          if row.available.UpperArmL then row.poses.UpperArmL=CFrame.Angles(pitch,0,-.22*lift) end
          if row.available.UpperArmR then row.poses.UpperArmR=CFrame.Angles(pitch,0,.22*lift) end
          if row.available.ThighL then row.poses.ThighL=CFrame.Angles(shock and -.32*lift or .12*lift,0,0) end
          if row.available.ThighR then row.poses.ThighR=CFrame.Angles(shock and .26*lift or .12*lift,0,0) end
        end
        -- 실제 원본 관절이 있는 몹에만 종별 공격·추적 동작을 크게 합성한다.
        local gain=mode=="ATTACK" and (row.species=="golem" and 1.75
          or row.species=="wolf" and 1.92 or 1.6)
          or mode=="RUN" and (row.plan=="QUADRUPED" and 1.08 or 1.42)
          or 1.10
        for joint,pose in pairs(row.poses) do
          if typeof(pose)=="CFrame" then
            local axis,angle=pose:ToAxisAngle()
            if angle>.001 then
              row.poses[joint]=CFrame.fromAxisAngle(axis,math.min(angle*gain,math.rad(112)))
            end
          end
        end
        -- [관절 블렌딩] 공격/추적 전환 때 발·목·날개가 순간적으로 꺾이지 않게 한다.
        -- 새 모션에 없는 이전 관절도 중립 자세까지 부드럽게 복귀시킨다.
        local blend=math.clamp((os.clock()-row.transitionStartedAt)
          /math.max(.01,row.transitionDuration),0,1)
        blend=blend*blend*(3-2*blend)
        if blend<1 then
          for joint,previous in pairs(row.transitionFrom) do
            row.poses[joint]=previous:Lerp(row.poses[joint] or CFrame.identity,blend)
          end
        end
        table.clear(row.renderedPoses)
        for joint,pose in pairs(row.poses) do
          row.renderedPoses[joint]=pose
        end
        local fixes=row.axisFix
        if fixes then
          local converted={}
          for joint,pose in pairs(row.poses) do
            local fix=fixes[joint]
            local source=pose
            -- 사슴은 무릎·발목이 앞으로 접혀 어색했다. 발이 뒤로 접히도록 굽힘 방향을 뒤집는다.
            if row.species=="deer" and typeof(pose)=="CFrame"
              and (joint:sub(-4)=="Knee" or joint:sub(-5)=="Ankle") then
              source=pose.Rotation:Inverse()
            end
            converted[joint]=(fix and typeof(source)=="CFrame") and (fix.pre*source.Rotation*fix.post) or source
          end
          row.controller.Step(converted,poseDt)
        else
          row.controller.Step(row.poses,poseDt)
        end
      end
    end
  end
end)
-- [활 사격 연출] 화살 모델 없이 빛줄기(Beam)와 명중 섬광만 쓴다. 실제 피해는 서버가 계산한 값이다.
remote.OnClientEvent:Connect(function(kind,payload)
  if kind~="MEADOW_BOW_SHOT" or typeof(payload)~="table"
    or typeof(payload.from)~="Vector3" or typeof(payload.to)~="Vector3" then return end
  local TweenService=game:GetService("TweenService")
  local terrain=workspace.Terrain
  local a0=Instance.new("Attachment");a0.WorldPosition=payload.from;a0.Parent=terrain
  local a1=Instance.new("Attachment");a1.WorldPosition=payload.from;a1.Parent=terrain
  local beam=Instance.new("Beam")
  beam.Attachment0=a0;beam.Attachment1=a1
  beam.FaceCamera=true;beam.LightEmission=1;beam.Width0=.16;beam.Width1=.03
  beam.Color=ColorSequence.new(payload.weak and Color3.fromRGB(255,214,110) or Color3.fromRGB(235,244,255))
  beam.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.1),NumberSequenceKeypoint.new(1,.55)})
  beam.Parent=terrain
  local flight=math.clamp((payload.to-payload.from).Magnitude/160,.08,.3)
  local tween=TweenService:Create(a1,TweenInfo.new(flight,Enum.EasingStyle.Linear),{WorldPosition=payload.to})
  tween:Play()
  tween.Completed:Once(function()
    local fade=TweenService:Create(a0,TweenInfo.new(.12),{WorldPosition=payload.to})
    fade:Play()
    if payload.weak then
      local flash=Instance.new("PointLight");flash.Color=Color3.fromRGB(255,214,110);flash.Range=10;flash.Brightness=3;flash.Parent=a1
    end
    task.delay(.14,function() beam:Destroy();a0:Destroy();a1:Destroy() end)
  end)
end)
-- [궁극기 연출] 입자·빛만 쓴다(모델/Part 형상 없음). 무기 클래스마다 색과 퍼짐이 다르다.
do
  local ultColors={Greatsword=Color3.fromRGB(255,170,70),Hammer=Color3.fromRGB(255,200,90),Axe=Color3.fromRGB(240,90,70),
    Dagger=Color3.fromRGB(170,110,235),Bow=Color3.fromRGB(110,230,150),Staff=Color3.fromRGB(100,170,255),Sword=Color3.fromRGB(255,235,170)}
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind~="MEADOW_ULT_FX" or typeof(payload)~="table" or typeof(payload.position)~="Vector3" then return end
    local color=ultColors[payload.class] or ultColors.Sword
    -- Part 대신 Terrain 위 Attachment에 입자·빛을 붙인다(형상 없음).
    local holder=Instance.new("Attachment")
    holder.Name="MeadowUltFx";holder.WorldPosition=payload.position+Vector3.new(0,1,0);holder.Parent=workspace.Terrain
    local burst=Instance.new("ParticleEmitter")
    burst.Color=ColorSequence.new(color);burst.LightEmission=1;burst.Rate=0
    burst.Lifetime=NumberRange.new(.5,.9)
    burst.Speed=NumberRange.new(payload.alt and 34 or 24,payload.alt and 52 or 38)
    burst.SpreadAngle=Vector2.new(180,180)
    burst.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,1.4),NumberSequenceKeypoint.new(1,0)})
    burst.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,0),NumberSequenceKeypoint.new(1,1)})
    burst.Parent=holder
    burst:Emit(70)
    local light=Instance.new("PointLight");light.Color=color;light.Range=26;light.Brightness=5;light.Parent=holder
    game:GetService("TweenService"):Create(light,TweenInfo.new(.8),{Brightness=0}):Play()
    game:GetService("Debris"):AddItem(holder,1.4)
  end)
  -- 아드레날린 100%: 내 캐릭터가 금빛으로 빛난다(로컬 표시 전용).
  local function refreshAdrenalineGlow()
    local character=player.Character
    if not character then return end
    local glow=character:FindFirstChild("MeadowAdrenalineGlow")
    local full=(tonumber(player:GetAttribute("MeadowAdrenaline")) or 0)>=100
    if full and not glow then
      glow=Instance.new("Highlight");glow.Name="MeadowAdrenalineGlow"
      glow.FillColor=Color3.fromRGB(255,200,80);glow.FillTransparency=.78
      glow.OutlineColor=Color3.fromRGB(255,230,150);glow.OutlineTransparency=.2
      glow.DepthMode=Enum.HighlightDepthMode.Occluded;glow.Parent=character
    elseif not full and glow then
      glow:Destroy()
    end
  end
  player:GetAttributeChangedSignal("MeadowAdrenaline"):Connect(refreshAdrenalineGlow)
  player.CharacterAdded:Connect(function() task.wait(1);refreshAdrenalineGlow() end)
end
remote.OnClientEvent:Connect(function(kind,payload)
  if typeof(payload)~="table" or typeof(payload.position)~="Vector3" then return end
  if kind=="MEADOW_MOB_ATTACK" then mobVfx(payload.pattern,payload.position,"IMPACT",payload.facing)
  elseif kind=="MEADOW_MOB_DEATH" then
    mobVfx(payload.pattern,payload.position,"DEATH")
  end
end)


end
initializeMeadowNativeMobMotion()

-- [초원 자연 음향] Roblox Creator Store에서 배포하는 새소리·숲 음원만 사용한다.
-- 플레이어별 로컬 재생: 서버 전투/오디오 이벤트에 영향을 주지 않고 실제 소리가 허용되지 않으면 조용히 유지.
-- 잦은 재생/고음량을 피하고, 사슴·토끼 서식지와 숲 외곽에 가까울수록 새소리가 선명해진다.
task.delay(5,function()
  local soundService=game:GetService("SoundService")
  local forestBed=Instance.new("Sound")
  forestBed.Name="MeadowForestAmbience"
  forestBed.SoundId="rbxassetid://9116971475" -- Creator Store: Morning Forest Birds 4
  -- [오디오] 기존 숲 소리에 승인된 환경음 atom을 직접 적용한다.
  -- 선택값이 Sound.Volume까지 이어져야 패키지에서 실제 자산 사용으로 검증된다.
  local forestAudioEnabled=hasStudioAssetAtom("AUDIO","ENV_FOREST")
  forestBed.Volume=forestAudioEnabled and .045 or 0
  forestBed.Looped=true
  forestBed.PlaybackSpeed=.96
  forestBed.SoundGroup=meadowAmbienceGroup
  forestBed.Parent=soundService
  local birdChirp=Instance.new("Sound")
  birdChirp.Name="MeadowNearbyBirds"
  birdChirp.SoundId="rbxassetid://140708444684424" -- Creator Store: Birds Chirping SFX
  birdChirp.Volume=.14
  birdChirp.Looped=false
  birdChirp.SoundGroup=meadowAmbienceGroup
  birdChirp.Parent=soundService
  local groves={
    Vector2.new(-258,-206),Vector2.new(261,-219),
    Vector2.new(-270,220),Vector2.new(258,240),
  }
  forestBed:Play()
  local nextChirp=os.clock()+math.random(7,13)
  while forestBed.Parent and birdChirp.Parent do
    task.wait(1)
    local character=player.Character
    local rootPart=character and character:FindFirstChild("HumanoidRootPart")
    if rootPart then
      local distance=math.huge
      for _,grove in ipairs(groves) do
        local dx=rootPart.Position.X-grove.X
        local dz=rootPart.Position.Z-grove.Y
        distance=math.min(distance,math.sqrt(dx*dx+dz*dz))
      end
      local forestPresence=1-math.clamp((distance-25)/235,0,1)
      -- [시간·날씨 음향] 서버가 정한 실제 시간/날씨를 읽고 야간·우천 새소리만 줄인다.
      local climate=workspace:FindFirstChild("FantasySurvivalWorld")
      local phase=climate and climate:GetAttribute("MeadowDayPhase") or "DAY"
      local sky=climate and climate:GetAttribute("MeadowWeather") or "CLEAR"
      local quiet=phase=="NIGHT" or sky=="RAIN" or sky=="SNOW" or sky=="STORM"
      forestBed.Volume=forestAudioEnabled and ((.035+.085*forestPresence)*(quiet and .28 or 1)) or 0
      birdChirp.Volume=forestAudioEnabled and ((.085+.17*forestPresence)*(quiet and .18 or 1)) or 0
      if os.clock()>=nextChirp then
        if forestPresence>.12 and not quiet then
          birdChirp.PlaybackSpeed=.91+math.random()*.17
          birdChirp:Play()
        end
        nextChirp=os.clock()+math.random(17,29)
      end
    end
  end
end)



-- [전체 지도] 미니맵을 누르거나 M 키를 누르면 대륙 전체(13개 지역)를 보여준다. 발견한 이정표를 누르면 서버 검증 후 빠른 이동.
-- 지역 발견은 서버가 기록한 WorldDiscovered 비트, 이정표 발견은 WaypointMask 비트, 위치는 실제 캐릭터 좌표만 쓴다.
;(function()
  local RunService=game:GetService("RunService")
  local UserInputService=game:GetService("UserInputService")
  local playerGui=player:FindFirstChildOfClass("PlayerGui") or player:WaitForChild("PlayerGui")
  local radar=nil
  for _=1,60 do
    radar=playerGui:FindFirstChild("MeadowExplorerRadar",true)
    if radar then break end
    task.wait(.5)
  end
  if not radar then return end
  local layer=radar.Parent
  local world=Config.WorldMap
  local bounds=world.Bounds
  local width,height=bounds.X1-bounds.X0,bounds.Z1-bounds.Z0
  local mapImage=world.MapImage
  local function fx(x)
    local t=(x-bounds.X0)/width
    if mapImage and mapImage.Left then return mapImage.Left+mapImage.SpanX*t end
    return t
  end
  local function fz(z)
    local t=(z-bounds.Z0)/height
    if mapImage then return mapImage.Top+mapImage.Span*t end
    return t
  end
  local overlay=Instance.new("TextButton")
  overlay.Name="MeadowFullMap";overlay.Text="";overlay.AutoButtonColor=false
  overlay.Size=UDim2.fromScale(1,1);overlay.BackgroundColor3=Color3.fromRGB(4,10,10)
  overlay.BackgroundTransparency=.3;overlay.ZIndex=60;overlay.Visible=false;overlay.Parent=layer
  local panel=Instance.new("Frame")
  panel.AnchorPoint=Vector2.new(.5,.5);panel.Position=UDim2.fromScale(.5,.5)
  panel.Size=UDim2.new(.96,0,.92,0);panel.BackgroundColor3=Color3.fromRGB(26,22,16)
  panel.ZIndex=61;panel.Parent=overlay
  local limit=Instance.new("UISizeConstraint");limit.MaxSize=Vector2.new(1100,640);limit.Parent=panel
  Instance.new("UICorner",panel).CornerRadius=UDim.new(0,14)
  local border=Instance.new("UIStroke");border.Color=Color3.fromRGB(218,189,126);border.Thickness=2.5;border.Parent=panel
  local title=Instance.new("TextLabel")
  title.BackgroundTransparency=1;title.Position=UDim2.fromOffset(16,6);title.Size=UDim2.new(1,-70,0,26)
  title.Font=Enum.Font.GothamBlack;title.TextSize=19;title.TextXAlignment=Enum.TextXAlignment.Left
  title.TextColor3=Color3.fromRGB(255,244,214);title.Text="마력숲 대륙 전체 지도";title.ZIndex=62;title.Parent=panel
  local legend=Instance.new("TextLabel")
  legend.BackgroundTransparency=1;legend.Position=UDim2.fromOffset(16,32);legend.Size=UDim2.new(1,-32,0,18)
  legend.Font=Enum.Font.Gotham;legend.TextSize=12;legend.TextXAlignment=Enum.TextXAlignment.Left
  legend.TextColor3=Color3.fromRGB(190,208,196);legend.ZIndex=62;legend.Parent=panel
  legend.Text="★ 랜드마크  ⌂ 마을  ▲ 영주 거점  ❖ 저주받은 자  ? 미발견  ! 퀘스트  ◆ 이정표(이동)  ◇ 미발견  ▣ 마을  ● 내 위치   확대: 두 손가락 · +/- 버튼"
  local close=Instance.new("TextButton")
  close.Text="X";close.Font=Enum.Font.GothamBold;close.TextSize=20;close.TextColor3=Color3.fromRGB(255,244,214)
  close.BackgroundColor3=Color3.fromRGB(70,38,38);close.Position=UDim2.new(1,-48,0,6);close.Size=UDim2.fromOffset(38,32)
  close.ZIndex=63;close.Parent=panel;Instance.new("UICorner",close).CornerRadius=UDim.new(0,9)
  local field=Instance.new("Frame")
  field.AnchorPoint=Vector2.new(.5,1);field.Position=UDim2.new(.5,0,1,-10)
  field.Size=UDim2.new(1,-20,1,-62);field.BackgroundColor3=Color3.fromRGB(14,16,14);field.ZIndex=62;field.ClipsDescendants=true;field.Parent=panel
  local ratio=Instance.new("UIAspectRatioConstraint");ratio.AspectRatio=mapImage and mapImage.W/mapImage.H or width/height;ratio.AspectType=Enum.AspectType.ScaleWithParentSize
  ratio.DominantAxis=Enum.DominantAxis.Width;ratio.Parent=field
  -- 확대/이동용 캔버스: 지도 그림과 모든 표시가 이 안에 들어간다. field는 잘라내는 창 역할.
  local canvas=Instance.new("Frame")
  canvas.Name="MapCanvas";canvas.BackgroundTransparency=1;canvas.BorderSizePixel=0
  canvas.Size=UDim2.fromScale(1,1);canvas.Position=UDim2.fromScale(0,0);canvas.ZIndex=62;canvas.Parent=field
  local zoom,panX,panY=1,0,0
  local function applyZoom(newZoom,fx_,fy_)
    newZoom=math.clamp(newZoom,1,5)
    local cx=(fx_-panX)/zoom;local cy=(fy_-panY)/zoom
    zoom=newZoom
    panX=math.clamp(fx_-cx*zoom,1-zoom,0);panY=math.clamp(fy_-cy*zoom,1-zoom,0)
    canvas.Size=UDim2.fromScale(zoom,zoom);canvas.Position=UDim2.fromScale(panX,panY)
  end
  local function zoomButton(text,order,fn)
    local b=Instance.new("TextButton")
    b.AnchorPoint=Vector2.new(1,0);b.Position=UDim2.new(1,-8,0,8+order*40);b.Size=UDim2.fromOffset(34,34)
    b.BackgroundColor3=Color3.fromRGB(32,24,16);b.BackgroundTransparency=.1;b.Font=Enum.Font.GothamBlack;b.TextSize=20
    b.TextColor3=Color3.fromRGB(255,240,205);b.Text=text;b.ZIndex=80;b.Parent=field
    Instance.new("UICorner",b).CornerRadius=UDim.new(0,8)
    b.Activated:Connect(fn)
  end
  zoomButton("+",0,function() applyZoom(zoom*1.5,.5,.5) end)
  zoomButton("-",1,function() applyZoom(zoom/1.5,.5,.5) end)
  zoomButton("1",2,function() applyZoom(1,.5,.5) end)
  do
    local dragging,startPos,startPan
    field.InputBegan:Connect(function(input)
      if input.UserInputType==Enum.UserInputType.MouseButton1 or input.UserInputType==Enum.UserInputType.Touch then
        dragging=true;startPos=input.Position;startPan=Vector2.new(panX,panY)
      end
    end)
    field.InputEnded:Connect(function(input)
      if input.UserInputType==Enum.UserInputType.MouseButton1 or input.UserInputType==Enum.UserInputType.Touch then dragging=false end
    end)
    UserInputService.InputChanged:Connect(function(input)
      if not overlay.Visible then return end
      if dragging and zoom>1 and (input.UserInputType==Enum.UserInputType.MouseMovement or input.UserInputType==Enum.UserInputType.Touch) then
        local size=field.AbsoluteSize
        local dx=(input.Position.X-startPos.X)/size.X
        local dy=(input.Position.Y-startPos.Y)/size.Y
        panX=math.clamp(startPan.X+dx,1-zoom,0);panY=math.clamp(startPan.Y+dy,1-zoom,0)
        canvas.Position=UDim2.fromScale(panX,panY)
      elseif input.UserInputType==Enum.UserInputType.MouseWheel then
        applyZoom(zoom*(input.Position.Z>0 and 1.25 or .8),.5,.5)
      end
    end)
    local pinchBase=1
    UserInputService.TouchPinch:Connect(function(positions,scale,velocity,state)
      if not overlay.Visible then return end
      if state==Enum.UserInputState.Begin then pinchBase=zoom;dragging=false end
      local size,origin=field.AbsoluteSize,field.AbsolutePosition
      local cx,cy=.5,.5
      if positions and positions[1] and positions[2] then
        local mid=(positions[1]+positions[2])/2
        cx=math.clamp((mid.X-origin.X)/size.X,0,1);cy=math.clamp((mid.Y-origin.Y)/size.Y,0,1)
      end
      applyZoom(pinchBase*scale,cx,cy)
    end)
  end
  if mapImage then
    local picture=Instance.new("ImageLabel")
    picture.BackgroundTransparency=1;picture.Size=UDim2.fromScale(1,1);picture.Image="rbxassetid://"..mapImage.Asset
    picture.ScaleType=Enum.ScaleType.Stretch;picture.ZIndex=62;picture.Parent=canvas
  end
  -- 지역 칸(100스터드)을 처음 열 때 나눠서 만든다. 색은 지역색, 미발견 지역은 어둡게.
  local tiles={}
  local cellFrames={}
  for index,zone in ipairs(world.Zones) do
    local label=Instance.new("TextLabel")
    label.BackgroundTransparency=1;label.AnchorPoint=Vector2.new(.5,.5);label.Size=UDim2.fromScale(.14,.06)
    label.Font=Enum.Font.GothamBold;label.TextScaled=true;label.TextColor3=Color3.fromRGB(255,250,232);label.TextStrokeTransparency=.2
    label.ZIndex=64;label.Parent=canvas
    local cap=Instance.new("UITextSizeConstraint");cap.MaxTextSize=16;cap.MinTextSize=7;cap.Parent=label
    tiles[index]={name=label,seen=nil}
    cellFrames[index]={}
  end
  local built=false
  local function buildCells()
    if built then return end
    built=true
    task.spawn(function()
      local sumX,sumZ,count={},{},{}
      for row=1,world.Rows do
        for col=1,world.Cols do
          local index=world.Grid[row][col]
          local frame=Instance.new("Frame")
          frame.BorderSizePixel=0
          frame.Visible=not mapImage
          frame.Position=UDim2.fromScale((col-1)/world.Cols,(row-1)/world.Rows)
          frame.Size=UDim2.fromScale(1/world.Cols+.0006,1/world.Rows+.0006)
          local zone=world.Zones[index]
          frame.BackgroundColor3=Color3.fromRGB(zone.Color[1],zone.Color[2],zone.Color[3])
          frame.ZIndex=63;frame.Parent=canvas
          table.insert(cellFrames[index],frame)
          sumX[index]=(sumX[index] or 0)+col;sumZ[index]=(sumZ[index] or 0)+row;count[index]=(count[index] or 0)+1
        end
        if row%3==0 then task.wait() end
      end
      -- 큰길 · 강 · 경계 산맥(전체 지도 장식, 실제 지형과 같은 공식).
      if not mapImage then
      local function bar(x0,z0,x1,z1,color,thick,order)
        local ax,az,bx,bz=fx(x0),fz(z0),fx(x1),fz(z1)
        local f=Instance.new("Frame");f.BorderSizePixel=0;f.BackgroundColor3=color;f.ZIndex=order
        f.AnchorPoint=Vector2.new(.5,.5);f.Position=UDim2.fromScale((ax+bx)/2,(az+bz)/2)
        local aw,ah=field.AbsoluteSize.X,field.AbsoluteSize.Y
        local dx,dy=(bx-ax)*aw,(bz-az)*ah
        f.Size=UDim2.fromOffset(math.sqrt(dx*dx+dy*dy)+1,thick);f.Rotation=math.deg(math.atan2(dy,dx));f.Parent=canvas
      end
      bar(bounds.X0,0,bounds.X1,0,Color3.fromRGB(214,180,130),3,65)
      bar(0,bounds.Z0,0,bounds.Z1,Color3.fromRGB(214,180,130),3,65)
      bar(3000,bounds.Z0,3000,bounds.Z1,Color3.fromRGB(214,180,130),3,65)
      for _,river in ipairs({{-1100,420},{1800,380},{4050,360}})do
        local px,pz=nil,nil
        for z=bounds.Z0+40,bounds.Z1-40,80 do
          local x=river[1]+river[2]*.28*math.sin(z/river[2]*2.4)
          if px then bar(px,pz,x,z,Color3.fromRGB(110,170,225),3,66) end
          px,pz=x,z
        end
        task.wait()
      end
      for row=1,world.Rows-1 do
        for col=1,world.Cols-1 do
          local here=world.Grid[row][col]
          if here~=world.Grid[row][col+1] or here~=world.Grid[row+1][col] then
            local x=bounds.X0+(col-.5)*world.Cell
            local z=bounds.Z0+(row-.5)*world.Cell
            local nearRoad=math.abs(z)<90 or math.abs(x)<90 or math.abs(x-3000)<90
            if not nearRoad and (row*7+col*13)%10<6 then
              local mark=Instance.new("TextLabel")
              mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5);mark.Position=UDim2.fromScale(fx(x),fz(z))
              mark.Size=UDim2.fromOffset(10,10);mark.Font=Enum.Font.GothamBold;mark.TextSize=10;mark.Text="▲"
              mark.TextColor3=Color3.fromRGB(96,84,74);mark.ZIndex=65;mark.Parent=canvas
            end
          end
        end
        if row%6==0 then task.wait() end
      end
      end
      for index,tile in ipairs(tiles) do
        local n=count[index] or 1
        tile.name.Position=UDim2.fromScale((sumX[index] or 1)/n/world.Cols,fz(bounds.Z0+((sumZ[index] or 1)/n/world.Rows)*height))
        tile.seen=nil
      end
    end)
  end
  -- 마을 표시.
  local village=world.Village
  local villageMark=Instance.new("TextLabel")
  villageMark.BackgroundTransparency=1;villageMark.AnchorPoint=Vector2.new(.5,.5)
  villageMark.Position=UDim2.fromScale(fx(0),fz(0));villageMark.Size=UDim2.fromOffset(30,30)
  villageMark.Font=Enum.Font.GothamBlack;villageMark.TextSize=24;villageMark.Text="▣";villageMark.TextColor3=Color3.fromRGB(255,236,170)
  villageMark.TextStrokeTransparency=0;villageMark.ZIndex=66;villageMark.Parent=canvas
  -- 이정표 버튼.
  local markers={}
  for index,spec in ipairs(world.Waypoints) do
    local marker=Instance.new("TextButton")
    marker.AnchorPoint=Vector2.new(.5,.5);marker.Position=UDim2.fromScale(fx(spec[2]),fz(spec[3]))
    marker.Size=UDim2.fromOffset(24,24);marker.BackgroundTransparency=1
    marker.Font=Enum.Font.GothamBlack;marker.TextSize=20;marker.Text="◇";marker.TextColor3=Color3.fromRGB(200,200,200)
    marker.TextStrokeTransparency=0;marker.ZIndex=67;marker.Parent=canvas
    local label=Instance.new("TextLabel")
    label.BackgroundTransparency=1;label.Position=UDim2.new(.5,-50,1,-2);label.Size=UDim2.fromOffset(100,14)
    label.Font=Enum.Font.GothamBold;label.TextSize=10;label.TextColor3=Color3.fromRGB(255,244,214);label.TextStrokeTransparency=.2
    label.Text="";label.ZIndex=68;label.Parent=marker
    marker.Activated:Connect(function()
      if bit32.band(player:GetAttribute("WaypointMask") or 0,bit32.lshift(1,index-1))~=0 then
        remote:FireServer("wp:map:"..index)
        overlay.Visible=false
      end
    end)
    markers[index]={button=marker,label=label}
  end
  local poiMarkers={}
  for index,poi in ipairs(world.Pois or {}) do
    local mark=Instance.new("TextLabel")
    mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5);mark.Position=UDim2.fromScale(fx(poi.X),fz(poi.Z))
    mark.Size=UDim2.fromOffset(14,14);mark.Font=Enum.Font.GothamBlack;mark.TextSize=12;mark.Text=poi.Icon
    mark.TextColor3=Color3.fromRGB(255,236,170);mark.TextStrokeTransparency=0;mark.ZIndex=65;mark.Visible=false;mark.Parent=canvas
    poiMarkers[index]=mark
  end
  -- 지도 하단 안내줄: 랜드마크·마을을 누르면 설명이 뜬다.
  local info=Instance.new("TextLabel")
  info.AnchorPoint=Vector2.new(.5,1);info.Position=UDim2.new(.5,0,1,-6);info.Size=UDim2.new(.94,0,0,44)
  info.BackgroundColor3=Color3.fromRGB(32,24,16);info.BackgroundTransparency=.12;info.TextWrapped=true
  info.Font=Enum.Font.GothamMedium;info.TextSize=12;info.TextColor3=Color3.fromRGB(255,240,205)
  info.TextXAlignment=Enum.TextXAlignment.Left;info.Visible=false;info.ZIndex=75;info.Parent=field
  Instance.new("UICorner",info).CornerRadius=UDim.new(0,8)
  local infoPad=Instance.new("UIPadding");infoPad.PaddingLeft=UDim.new(0,10);infoPad.PaddingRight=UDim.new(0,10);infoPad.Parent=info
  local goBtn=Instance.new("TextButton")
  goBtn.AnchorPoint=Vector2.new(1,.5);goBtn.Position=UDim2.new(1,-6,.5,0);goBtn.Size=UDim2.fromOffset(64,30)
  goBtn.BackgroundColor3=Color3.fromRGB(60,120,150);goBtn.Font=Enum.Font.GothamBold;goBtn.TextSize=13
  goBtn.TextColor3=Color3.fromRGB(255,255,255);goBtn.Text="이동";goBtn.Visible=false;goBtn.ZIndex=76;goBtn.Parent=info
  Instance.new("UICorner",goBtn).CornerRadius=UDim.new(0,8)
  local goAction=nil
  goBtn.Activated:Connect(function()
    if goAction then remote:FireServer(goAction);overlay.Visible=false end
  end)
  local function showInfo(text,action)
    info.Text=text;info.Visible=true;goAction=action;goBtn.Visible=action~=nil
  end
  info.Active=true
  local function pin(mark,textFn)
    mark.Activated:Connect(function() showInfo(textFn()) end)
  end
  local function zoneSeen(zoneId)
    local discovered=player:GetAttribute("WorldDiscovered") or 1
    for _,zone in ipairs(world.Zones) do if zone.Id==zoneId then return bit32.band(discovered,zone.Bit)~=0 end end
    return false
  end
  local lmMarks={}
  for index,lm in ipairs(world.Landmarks or {}) do
    local mark=Instance.new("TextButton")
    mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5);mark.Position=UDim2.fromScale(fx(lm.X),fz(lm.Z))
    mark.Size=UDim2.fromOffset(22,22);mark.Font=Enum.Font.GothamBlack;mark.TextSize=18;mark.Text="★"
    mark.TextColor3=Color3.fromRGB(255,170,80);mark.TextStrokeTransparency=0;mark.ZIndex=65;mark.Visible=false;mark.Parent=canvas
    local name=Instance.new("TextLabel")
    name.BackgroundTransparency=1;name.Position=UDim2.new(.5,-55,1,-4);name.Size=UDim2.fromOffset(110,12)
    name.Font=Enum.Font.GothamBold;name.TextSize=9;name.TextColor3=Color3.fromRGB(255,222,160);name.TextStrokeTransparency=.1
    name.Text="";name.ZIndex=66;name.Parent=mark
    mark.Activated:Connect(function()
      local lmMask=player:GetAttribute("LandmarkMask") or 0
      if bit32.band(lmMask,bit32.lshift(1,index-1))~=0 then showInfo("★ "..lm.Name.."\n"..lm.Lore,"wp:lm:"..index)
      else showInfo("? 아직 가 보지 못한 곳. 이 지역 어딘가에 거대한 무언가가 있다는 소문이 돈다.") end
    end)
    lmMarks[index]={mark=mark,name=name}
  end
  local townMarks={}
  for index,town in ipairs(world.Towns or {}) do
    local mark=Instance.new("TextButton")
    mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5);mark.Position=UDim2.fromScale(fx(town.X),fz(town.Z))
    mark.Size=UDim2.fromOffset(22,22);mark.Font=Enum.Font.GothamBlack;mark.TextSize=18;mark.Text="⌂"
    mark.TextColor3=Color3.fromRGB(255,214,140);mark.TextStrokeTransparency=0;mark.ZIndex=66;mark.Visible=false;mark.Parent=canvas
    local name=Instance.new("TextLabel")
    name.BackgroundTransparency=1;name.Position=UDim2.new(.5,-40,1,-4);name.Size=UDim2.fromOffset(80,13)
    name.Font=Enum.Font.GothamBold;name.TextSize=10;name.TextColor3=Color3.fromRGB(255,240,205);name.TextStrokeTransparency=.2
    name.Text=town.Name;name.ZIndex=67;name.Parent=mark
    mark.Activated:Connect(function()
      showInfo("⌂ "..town.Name.." ("..town.Hold..")\n여관 "..town.Inn.." · 상인 "..town.Merchant.." · 정보통 "..town.Scout,"wp:town:"..index)
    end)
    townMarks[index]=mark
  end
  -- 영주 거점(발견한 지역): 누르면 영주 이름과 사연 퀘스트 안내.
  local lordMarks={}
  for _,zone in ipairs(world.Zones) do
    local mark=Instance.new("TextButton")
    mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5)
    mark.Size=UDim2.fromOffset(20,20);mark.Font=Enum.Font.GothamBlack;mark.TextSize=16;mark.Text="▲"
    mark.TextColor3=Color3.fromRGB(235,90,80);mark.TextStrokeTransparency=0;mark.ZIndex=65;mark.Visible=false;mark.Parent=canvas
    mark.Activated:Connect(function()
      local who=workspace:GetAttribute("LordName_"..zone.Id)
      showInfo("▲ "..zone.Name.." 영주 거점"..(who and ("\n"..who.." · 쓰러뜨리면 지역의 비밀이 풀린다.") or ""))
    end)
    lordMarks[zone.Id]={mark=mark,zone=zone}
  end
  -- 저주받은 3인: 추적 퀘스트가 그 보스 단계일 때만 표시.
  local cursedMarks={}
  for index,c in ipairs(world.Cursed or {}) do
    local mark=Instance.new("TextButton")
    mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5);mark.Position=UDim2.fromScale(fx(c.X),fz(c.Z))
    mark.Size=UDim2.fromOffset(24,24);mark.Font=Enum.Font.GothamBlack;mark.TextSize=20;mark.Text="❖"
    mark.TextColor3=Color3.fromRGB(200,90,255);mark.TextStrokeTransparency=0;mark.ZIndex=69;mark.Visible=false;mark.Parent=canvas
    local name=Instance.new("TextLabel")
    name.BackgroundTransparency=1;name.Position=UDim2.new(.5,-60,1,-4);name.Size=UDim2.fromOffset(120,12)
    name.Font=Enum.Font.GothamBold;name.TextSize=9;name.TextColor3=Color3.fromRGB(230,190,255);name.TextStrokeTransparency=.1
    name.Text=c.Name;name.ZIndex=70;name.Parent=mark
    mark.Activated:Connect(function() showInfo("❖ "..c.Name.."\n저주를 깨뜨려야 본모습으로 돌아온다. 추적 퀘스트가 이 단계에서 이곳을 가리킨다.") end)
    cursedMarks[index]=mark
  end
  local dot=Instance.new("TextLabel")
  dot.BackgroundTransparency=1;dot.AnchorPoint=Vector2.new(.5,.5);dot.Size=UDim2.fromOffset(22,22)
  dot.Font=Enum.Font.GothamBlack;dot.TextSize=22;dot.Text="●";dot.TextColor3=Color3.fromRGB(255,222,92)
  dot.TextStrokeTransparency=0;dot.ZIndex=70;dot.Parent=canvas
  local questMarks={}
  for index,line in ipairs(Config.QuestLines or {})do
    local mark=Instance.new("TextLabel")
    mark.BackgroundTransparency=1;mark.AnchorPoint=Vector2.new(.5,.5);mark.Size=UDim2.fromOffset(22,22)
    mark.Font=Enum.Font.GothamBlack;mark.TextSize=22;mark.Text="!";mark.TextColor3=Color3.fromRGB(255,214,60)
    mark.TextStrokeTransparency=0;mark.ZIndex=69;mark.Visible=false;mark.Parent=canvas
    questMarks[index]=mark
  end
  local goal=Instance.new("TextLabel")
  goal.BackgroundTransparency=1;goal.AnchorPoint=Vector2.new(.5,.5);goal.Size=UDim2.fromOffset(22,22)
  goal.Font=Enum.Font.GothamBlack;goal.TextSize=22;goal.Text="★";goal.TextColor3=Color3.fromRGB(255,120,90)
  goal.TextStrokeTransparency=0;goal.ZIndex=69;goal.Parent=canvas
  local zoneOfStage=function(stage)
    local q=Config.MainQuests and Config.MainQuests[stage]
    return stage<=6 and "meadow" or stage<=9 and "worldtree" or stage==10 and "volcano" or stage<=12 and "oasis" or (q and q.Zone) or nil
  end
  local function refresh()
    if not overlay.Visible then return end
    local discovered=player:GetAttribute("WorldDiscovered") or 1
    local mask=player:GetAttribute("WaypointMask") or 0
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    local x=root and root.Position.X or 0
    local z=root and root.Position.Z or 0
    local target=zoneOfStage(player:GetAttribute("QuestStage") or 1)
    goal.Visible=false
    for index,zone in ipairs(world.Zones) do
      local seen=bit32.band(discovered,zone.Bit)~=0
      tiles[index].name.Text=seen and zone.Name or "???"
      if tiles[index].seen~=seen then
        tiles[index].seen=seen
        for _,frame in ipairs(cellFrames[index]) do frame.BackgroundTransparency=seen and 0 or .55 end
      end
      if zone.Id==target then
        goal.Visible=true
        goal.Position=UDim2.new(tiles[index].name.Position.X.Scale,0,tiles[index].name.Position.Y.Scale-.04,0)
      end
    end
    for index,marker in ipairs(markers) do
      local found=bit32.band(mask,bit32.lshift(1,index-1))~=0
      marker.button.Text=found and "◆" or "◇"
      marker.button.TextColor3=found and Color3.fromRGB(130,230,255) or Color3.fromRGB(170,170,170)
      marker.label.Text=found and world.Waypoints[index][1] or ""
    end
    for index,line in ipairs(Config.QuestLines or {})do
      local stage=player:GetAttribute(line.Field) or 0
      local step=line.Steps[stage]
      local mark=questMarks[index]
      if stage>=1 and step and step.X then
        mark.Visible=true;mark.Position=UDim2.fromScale(fx(step.X),fz(step.Z))
      else mark.Visible=false end
    end
    local found1,found2=player:GetAttribute("PoiFound1") or 0,player:GetAttribute("PoiFound2") or 0
    for index,mark in ipairs(poiMarkers) do
      local flag=bit32.lshift(1,(index-1)%30)
      mark.Visible=bit32.band(index<=30 and found1 or found2,flag)~=0
    end
    for index,mark in ipairs(townMarks) do
      mark.Visible=zoneSeen(world.Towns[index].Zone)
    end
    local lmMask=player:GetAttribute("LandmarkMask") or 0
    for index,entry in ipairs(lmMarks) do
      local lm=world.Landmarks[index]
      local seen=bit32.band(lmMask,bit32.lshift(1,index-1))~=0
      entry.mark.Visible=seen or zoneSeen(lm.Zone)
      entry.mark.Text=seen and "★" or "?"
      entry.mark.TextColor3=seen and Color3.fromRGB(255,170,80) or Color3.fromRGB(190,190,190)
      entry.name.Text=seen and lm.Name or ""
    end
    for zoneId,entry in pairs(lordMarks) do
      local seat=workspace:GetAttribute("LordSeat_"..zoneId)
      if seat and zoneSeen(zoneId) then
        entry.mark.Visible=true;entry.mark.Position=UDim2.fromScale(fx(seat.X),fz(seat.Z))
      else entry.mark.Visible=false end
    end
    for index,c in ipairs(world.Cursed or {}) do
      local stage=player:GetAttribute(c.Field) or 0
      local show=false
      for _,line in ipairs(Config.QuestLines or {}) do
        if line.Field==c.Field then
          local step=line.Steps[stage]
          show=stage>=1 and step~=nil and step.Type=="kill" and step.Boss==c.Id
        end
      end
      cursedMarks[index].Visible=show
    end
    dot.Position=UDim2.fromScale(math.clamp(fx(x),.01,.99),math.clamp(fz(z),.01,.99))
  end
  local acc=0
  RunService.Heartbeat:Connect(function(dt)
    if not overlay.Visible then return end
    acc+=dt
    if acc>=.25 then acc=0;refresh() end
  end)
  local function setOpen(value)
    overlay.Visible=value
    if value then buildCells();refresh() end
  end
  close.Activated:Connect(function() setOpen(false) end)
  overlay.Activated:Connect(function() setOpen(false) end)
  local tap=Instance.new("TextButton")
  tap.Name="MeadowFullMapOpen";tap.Text="";tap.BackgroundTransparency=1
  tap.Size=UDim2.fromScale(1,1);tap.ZIndex=30;tap.Parent=radar
  tap.Activated:Connect(function() setOpen(true) end)
  UserInputService.InputBegan:Connect(function(input,processed)
    if processed or UserInputService:GetFocusedTextBox() then return end
    if input.KeyCode==Enum.KeyCode.M then setOpen(not overlay.Visible) end
  end)
  for _,name in ipairs({"WorldDiscovered","WaypointMask","QuestStage","PoiFound1","PoiFound2","LandmarkMask","QLWind","QLHunt","QLBog","QLRoot","QLTrack1","QLTrack2","QLTrack3","QLLordMeadow","QLLordVolcano","QLLordOasis","QLLordSwamp","QLLordCitadel","QLLordCanyon","QLLordChaos","QLLordDesert","QLLordDeadmarsh","QLPRowen","QLPDoran","QLPIfa","QLPHar","QLPRia","QLPMorgan","QLPBaren","QLPTibo","QLPCassian","QLMirror","QLMina","QLNick","QLSera","QLGarden","QLSeraJ","QLRowenJ","QLDoranJ","QLIfaJ","QLHarJ","QLRiaJ","QLMorganJ","QLBarenJ","QLTiboJ","QLCassianJ","CompanionOwned","CompanionActive"}) do
    player:GetAttributeChangedSignal(name):Connect(refresh)
  end
end)()

-- [칼든 자세] 검을 든 동안 전투 중이 아닐 때 오른팔을 앞으로 들어 올려 칼끝을 세운 '준비 자세'로 보이게 한다.
-- 걷기·대기 애니메이션 위에 오른쪽 어깨·팔꿈치만 더하고, 공격·스킬 모션 중에는 즉시 물러난다.
;(function()
  local weight=0
  local function swordEquipped(character)
    local tool=character and character:FindFirstChildOfClass("Tool")
    if not tool then return false end
    local profile=tool:GetAttribute("WeaponMotionProfile") or tool.Name
    return profile=="장검" or profile=="철검" or profile=="SWORD" or profile=="LONGSWORD" or profile=="GREATSWORD"
  end
  RunService.PreSimulation:Connect(function(dt)
    local character=player.Character
    local busy=activeCombatCombo~=nil or os.clock()<(meadowArt.motionDeadline or 0)
    local want=(not busy) and swordEquipped(character)
    weight+=((want and 1 or 0)-weight)*math.min(1,dt*9)
    if weight<.02 or not character then return end
    pcall(function()
      local shoulder=character:FindFirstChild("RightShoulder",true)
      local elbow=character:FindFirstChild("RightElbow",true)
      if shoulder and (shoulder:IsA("Motor6D") or shoulder:IsA("AnimationConstraint")) then
        shoulder.Transform=shoulder.Transform*CFrame.Angles(math.rad(-38)*weight,0,math.rad(-8)*weight)
      end
      if elbow and (elbow:IsA("Motor6D") or elbow:IsA("AnimationConstraint")) then
        elbow.Transform=elbow.Transform*CFrame.Angles(math.rad(-48)*weight,0,0)
      end
    end)
  end)
end)()

-- [획득 알림 3D] 재료를 얻으면 화면 오른쪽 가운데에 해당 아이템이 3D로 돌며 "+수량 이름"이 잠깐 뜬다.
;(function()
  local list=Instance.new("Frame")
  list.Name="MeadowLootToasts";list.AnchorPoint=Vector2.new(1,.5);list.Position=UDim2.new(1,-10,.42,0)
  list.Size=UDim2.fromOffset(170,240);list.BackgroundTransparency=1;list.ZIndex=40;list.Parent=gui
  local layout=Instance.new("UIListLayout")
  layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.VerticalAlignment=Enum.VerticalAlignment.Bottom;layout.HorizontalAlignment=Enum.HorizontalAlignment.Right
  layout.Padding=UDim.new(0,4);layout.Parent=list
  local names={Wood="나무",Stone="돌",Coins="재화"}
  local fields={"Wood","Stone"}
  for _,mat in ipairs(Config.Materials or {}) do names[mat.Field]=mat.Name;table.insert(fields,mat.Field) end
  local keys={Wood="item_woodlog",Stone="item_rock_1",Ore="item_mineral",Magma="item_mineral",Fang="item_bone",Claw="item_bone",Ectoplasm="item_skull",Crystal="item_crystal1",Ingot="item_mineral",Steel="item_gold_ingots",Meat="item_chickenleg",Leather="item_bone"}
  local order=0
  local last={}
  local function toast(field,amount)
    order+=1
    local row=Instance.new("Frame")
    row.LayoutOrder=order;row.Size=UDim2.fromOffset(160,48);row.BackgroundColor3=Color3.fromRGB(14,20,22);row.BackgroundTransparency=.45
    row.BorderSizePixel=0;row.ZIndex=41;row.Parent=list
    Instance.new("UICorner",row).CornerRadius=UDim.new(0,10)
    local icon=Instance.new("ImageLabel")
    icon.BackgroundTransparency=1;icon.Size=UDim2.fromOffset(44,44);icon.Position=UDim2.fromOffset(2,2);icon.ZIndex=42;icon.Parent=row
    local text=Instance.new("TextLabel")
    text.BackgroundTransparency=1;text.Position=UDim2.fromOffset(50,0);text.Size=UDim2.new(1,-54,1,0)
    text.Font=Enum.Font.GothamBold;text.TextSize=14;text.TextXAlignment=Enum.TextXAlignment.Left;text.TextWrapped=true
    text.TextColor3=Color3.fromRGB(255,244,214);text.TextStrokeTransparency=.3;text.ZIndex=43
    text.Text="+"..amount.."  "..(names[field] or field);text.Parent=row
    local key=keys[field]
    if key then
      local view=meadowArt.new3D(icon)
      meadowArt.set3D(view,key)
      meadowArt.refresh3D(view)
    end
    task.delay(2.6,function()
      if not row.Parent then return end
      local tween=game:GetService("TweenService"):Create(row,TweenInfo.new(.4),{BackgroundTransparency=1})
      tween:Play();text.TextTransparency=.6
      task.delay(.4,function() if row.Parent then row:Destroy() end end)
    end)
  end
  local armed=false
  task.spawn(function()
    for _=1,60 do
      if player:GetAttribute("ProfileReady")==true then break end
      task.wait(.5)
    end
    task.wait(1.5)
    for _,field in ipairs(fields) do last[field]=tonumber(player:GetAttribute(field)) or 0 end
    armed=true
  end)
  for _,field in ipairs(fields) do
    player:GetAttributeChangedSignal(field):Connect(function()
      local now=tonumber(player:GetAttribute(field)) or 0
      local before=last[field] or now
      last[field]=now
      if armed and now>before then toast(field,now-before) end
    end)
  end
end)()

-- [하단 퀵슬롯] 5칸. 칸마다 무기·채집·체력약·기력약·오일·기술 중 골라 등록한다(보관함 메뉴의 퀵슬롯 칸).
;(function()
  local COUNT=5
  local bar=Instance.new("Frame")
  bar.Name="MeadowQuickBar";bar.AnchorPoint=Vector2.new(.5,1);bar.Position=UDim2.new(.5,0,1,-8)
  bar.Size=UDim2.fromOffset(COUNT*52+(COUNT-1)*4,52);bar.BackgroundTransparency=1;bar.ZIndex=30;bar.Parent=gui
  local layout=Instance.new("UIListLayout")
  layout.FillDirection=Enum.FillDirection.Horizontal;layout.Padding=UDim.new(0,4);layout.Parent=bar
  local slots={}
  local function findSword()
    local backpack=player:FindFirstChildOfClass("Backpack")
    if not backpack then return nil end
    local first=nil
    for _,tool in ipairs(backpack:GetChildren())do
      if tool:IsA("Tool") then
        first=first or tool
        local profile=tool:GetAttribute("WeaponMotionProfile") or tool.Name
        if profile=="장검" or profile=="철검" or profile=="SWORD" or profile=="LONGSWORD" then return tool end
      end
    end
    return first
  end
  local function toggleWeapon()
    local character=player.Character
    local human=character and character:FindFirstChildOfClass("Humanoid")
    if not human or human.Health<=0 then return end
    if character:FindFirstChildOfClass("Tool") then
      human:UnequipTools();meadowArt.sfx("click",.4,.9)
    else
      local tool=findSword()
      if tool then human:EquipTool(tool);meadowArt.sfx("unsheath",.5,1) end
    end
  end
  -- 눌렀는데 아무 일도 없으면 이유를 잠깐 보여 준다.
  local quickMsg=Instance.new("TextLabel")
  quickMsg.Name="MeadowQuickMessage";quickMsg.AnchorPoint=Vector2.new(.5,1);quickMsg.Position=UDim2.new(.5,0,1,-66)
  quickMsg.Size=UDim2.fromOffset(260,24);quickMsg.BackgroundColor3=Color3.fromRGB(14,20,22);quickMsg.BackgroundTransparency=.3
  quickMsg.Font=Enum.Font.GothamBold;quickMsg.TextSize=14;quickMsg.TextColor3=Color3.fromRGB(255,236,180);quickMsg.Text=""
  quickMsg.Visible=false;quickMsg.ZIndex=60;quickMsg.Parent=gui
  Instance.new("UICorner",quickMsg).CornerRadius=UDim.new(0,8)
  local quickMsgToken=0
  local function quickSay(text)
    quickMsgToken+=1;local token=quickMsgToken
    quickMsg.Text=text;quickMsg.Visible=true
    task.delay(1.6,function() if token==quickMsgToken then quickMsg.Visible=false end end)
  end
  local function press(i)
    if gui:GetAttribute("GameMenuOpen")==true then quickSay("메뉴를 닫아야 쓸 수 있어") return end
    if player:GetAttribute("ProfileReady")~=true then quickSay("저장 정보를 불러오는 중이야") return end
    local id=meadowArt.quickIds[i]
    if not id then quickSay("빈 칸이야 · 가방 > 퀵슬롯에서 등록") return end
    if id=="@weapon" then
      if not (player.Character and player.Character:FindFirstChildOfClass("Tool")) and not findSword() then quickSay("꺼낼 무기가 없어") return end
      toggleWeapon()
    elseif id=="@interact" then activateMeadowAction("scope-coreloop-1-6ebe58f496")
    elseif id=="@hp" then
      if (tonumber(player:GetAttribute("MeadowPotionHealth")) or 0)<=0 then quickSay("체력약이 없어") return end
      remote:FireServer("meadow:rpg:tonic:use:herbal_tonic")
    elseif id=="@sp" then
      if (tonumber(player:GetAttribute("MeadowPotionStamina")) or 0)<=0 then quickSay("기력약이 없어") return end
      remote:FireServer("meadow:rpg:tonic:use:energy_tonic")
    elseif id=="@oil" then
      if (tonumber(player:GetAttribute("MeadowOilCharges")) or 0)<=0 then quickSay("오일이 없어") return end
      remote:FireServer("oil:auto")
    else
      local deadline=player:GetAttribute("MeadowReady_"..id)
      local left=typeof(deadline)=="number" and deadline-workspace:GetServerTimeNow() or 0
      if left>.05 then quickSay("쿨타임 "..math.ceil(left).."초") return end
      local lock=meadowArt.skillLock(id)
      if lock then quickSay("아직 못 배웠어 · "..lock) return end
      if activateMeadowAction(id)==false then quickSay("지금은 쓸 수 없어(기력·무기 확인)") end
    end
  end
  local holdToken,holdFired={},{}
  local quickEditMode=false
  local openQuickPicker=nil
  local editButton
  for i=1,COUNT do
    local slot=Instance.new("TextButton")
    slot.Name="QuickSlot"..i;slot.Text="";slot.AutoButtonColor=true;slot.Size=UDim2.fromOffset(52,52)
    slot.BackgroundColor3=Color3.fromRGB(18,30,30);slot.BackgroundTransparency=.2;slot.BorderSizePixel=0;slot.LayoutOrder=i
    slot.ZIndex=30;slot.Parent=bar
    local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,11);c.Parent=slot
    local e=Instance.new("UIStroke");e.Color=Color3.fromRGB(218,189,126);e.Thickness=2;e.Transparency=.2;e.Parent=slot
    local icon=Instance.new("ImageLabel")
    icon.BackgroundTransparency=1;icon.Size=UDim2.fromOffset(40,40);icon.AnchorPoint=Vector2.new(.5,.5)
    icon.Position=UDim2.fromScale(.5,.5);icon.ZIndex=31;icon.Parent=slot
    local key=Instance.new("TextLabel")
    key.BackgroundTransparency=1;key.Position=UDim2.fromOffset(4,1);key.Size=UDim2.fromOffset(12,12)
    key.Font=Enum.Font.GothamBlack;key.TextSize=11;key.Text=tostring(i);key.TextColor3=Color3.fromRGB(255,240,197)
    key.TextStrokeTransparency=.3;key.ZIndex=34;key.Parent=slot
    local count=Instance.new("TextLabel")
    count.AnchorPoint=Vector2.new(1,1);count.Position=UDim2.new(1,-3,1,-1);count.Size=UDim2.fromOffset(24,13)
    count.BackgroundTransparency=1;count.Font=Enum.Font.GothamBlack;count.TextSize=12;count.Text=""
    count.TextXAlignment=Enum.TextXAlignment.Right;count.TextColor3=Color3.new(1,1,1)
    count.TextStrokeTransparency=.2;count.ZIndex=34;count.Parent=slot
    local shade=Instance.new("Frame")
    shade.BackgroundColor3=Color3.new(0,0,0);shade.BackgroundTransparency=.45;shade.BorderSizePixel=0
    shade.Size=UDim2.fromScale(1,1);shade.Visible=false;shade.ZIndex=32;shade.Parent=slot
    local sc=Instance.new("UICorner");sc.CornerRadius=UDim.new(0,11);sc.Parent=shade
    local timer=Instance.new("TextLabel")
    timer.BackgroundTransparency=1;timer.Size=UDim2.fromScale(1,1);timer.Font=Enum.Font.GothamBlack;timer.TextSize=18
    timer.TextColor3=Color3.new(1,1,1);timer.Text="";timer.ZIndex=35;timer.Parent=slot
    -- 칸 교체는 '편집' 모드에서만 한다(길게 눌러 고르기 기능은 제거).
    slot.Activated:Connect(function()
      if holdFired[i] then holdFired[i]=false return end
      if quickEditMode then if openQuickPicker then openQuickPicker(i) end return end
      press(i)
    end)
    slots[i]={slot=slot,icon=icon,shade=shade,timer=timer,edge=e,count=count}
  end
  -- [3D 아이템] 칸 위에 뷰포트를 얹어 CC0 아이템 메시를 천천히 돌려 보여 준다. 모델이 아직 없으면 평면 아이콘을 쓴다.
  local itemKeyOf={["@weapon"]="item_sword",["@interact"]="item_axe_small",["@hp"]="item_potion1_filled",["@sp"]="item_potion3_filled",["@oil"]="item_potion4_filled"}
  local spinners={}
  local itemFolder=ReplicatedStorage:FindFirstChild("MeadowItemModels")
  local function ensureViewport(slotUi,key)
    local holder=slotUi.slot
    local view=holder:FindFirstChild("Item3D")
    itemFolder=itemFolder or ReplicatedStorage:FindFirstChild("MeadowItemModels")
    local template=itemFolder and itemFolder:FindFirstChild(key)
    if not template then
      if view then view.Visible=false end
      return false
    end
    if view and view:GetAttribute("ItemKey")==key then view.Visible=true return true end
    if view then view:Destroy();spinners[view]=nil end
    view=Instance.new("ViewportFrame")
    view.Name="Item3D";view:SetAttribute("ItemKey",key);view.BackgroundTransparency=1;view.BorderSizePixel=0
    view.Size=UDim2.fromScale(1,1);view.ZIndex=31;view.Interactable=false;view.Ambient=Color3.fromRGB(190,190,200);view.LightColor=Color3.fromRGB(255,244,220)
    view.Parent=holder
    local model=template:Clone();model.Parent=view
    local cframe,size=model:GetBoundingBox()
    model:PivotTo(CFrame.new(-cframe.Position)*model:GetPivot())
    local radius=math.max(size.X,size.Y,size.Z)
    local camera=Instance.new("Camera");camera.FieldOfView=35
    camera.CFrame=CFrame.new(Vector3.new(0,radius*.35,radius*2.1),Vector3.new(0,0,0))
    view.CurrentCamera=camera;camera.Parent=view
    spinners[view]={model=model,angle=math.random()*6}
    return true
  end
  RunService.Heartbeat:Connect(function(dt)
    for view,entry in pairs(spinners) do
      if not view.Parent then spinners[view]=nil
      elseif view.Visible then
        entry.angle+=dt*1.1
        entry.model:PivotTo(CFrame.Angles(math.rad(-18),entry.angle,math.rad(12)))
      end
    end
  end)
  function meadowArt.setQuickIcon(icon,id,slotUi)
    icon.ImageColor3=Color3.new(1,1,1)
    if slotUi then
      local key=itemKeyOf[id]
      if key and ensureViewport(slotUi,key) then icon.Visible=false return end
      local view=slotUi.slot:FindFirstChild("Item3D")
      if view then view.Visible=false end
    end
    if id=="@weapon" then meadowArt.gear(icon,0)
    elseif id=="@interact" then icon.Image=meadowRealActionIcons.interact;icon.ImageRectSize=Vector2.zero;icon.ImageRectOffset=Vector2.zero
    elseif id=="@hp" then meadowArt.gear(icon,32)
    elseif id=="@sp" then meadowArt.gear(icon,33)
    elseif id=="@oil" then meadowArt.gear(icon,33);icon.ImageColor3=Color3.fromRGB(255,190,70)
    elseif id then meadowArt.skill(icon,id) end
  end
  meadowArt.refreshQuickHud=function()
    for i=1,COUNT do
      local id=meadowArt.quickIds[i]
      slots[i].icon.Visible=id~=nil and id~=false
      if id then meadowArt.setQuickIcon(slots[i].icon,id,slots[i])
      else local view=slots[i].slot:FindFirstChild("Item3D");if view then view.Visible=false end end
    end
    if meadowArt.refreshQuickTray then meadowArt.refreshQuickTray() end
  end
  -- [퀵슬롯 선택창] 무기·채집·약·오일·전투 기술 중 하나를 골라 칸에 넣는다.
  do
    local picker=Instance.new("Frame")
    picker.Name="MeadowQuickPicker";picker.AnchorPoint=Vector2.new(.5,.5);picker.Position=UDim2.fromScale(.5,.5)
    picker.Size=UDim2.fromOffset(300,300);picker.BackgroundColor3=Color3.fromRGB(18,28,28);picker.BackgroundTransparency=.06
    picker.Visible=false;picker.ZIndex=90;picker.Parent=gui
    Instance.new("UICorner",picker).CornerRadius=UDim.new(0,12)
    local stroke=Instance.new("UIStroke");stroke.Color=Color3.fromRGB(218,189,126);stroke.Thickness=2;stroke.Parent=picker
    local title=Instance.new("TextLabel")
    title.BackgroundTransparency=1;title.Position=UDim2.fromOffset(12,6);title.Size=UDim2.new(1,-60,0,26)
    title.Font=Enum.Font.GothamBlack;title.TextSize=16;title.TextXAlignment=Enum.TextXAlignment.Left
    title.TextColor3=Color3.fromRGB(255,240,205);title.ZIndex=91;title.Parent=picker
    local closeBtn=Instance.new("TextButton")
    closeBtn.AnchorPoint=Vector2.new(1,0);closeBtn.Position=UDim2.new(1,-8,0,6);closeBtn.Size=UDim2.fromOffset(34,28)
    closeBtn.BackgroundColor3=Color3.fromRGB(120,40,40);closeBtn.Font=Enum.Font.GothamBlack;closeBtn.TextSize=16
    closeBtn.TextColor3=Color3.new(1,1,1);closeBtn.Text="X";closeBtn.ZIndex=92;closeBtn.Parent=picker
    Instance.new("UICorner",closeBtn).CornerRadius=UDim.new(0,8)
    local list=Instance.new("ScrollingFrame")
    list.BackgroundTransparency=1;list.BorderSizePixel=0;list.Position=UDim2.fromOffset(8,38);list.Size=UDim2.new(1,-16,1,-46)
    list.ScrollBarThickness=5;list.CanvasSize=UDim2.new();list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.ZIndex=91;list.Parent=picker
    local lay=Instance.new("UIListLayout");lay.Padding=UDim.new(0,4);lay.SortOrder=Enum.SortOrder.LayoutOrder;lay.Parent=list
    local target=1
    local function choose(id)
      if meadowArt.assignQuick then meadowArt.assignQuick(target,id) end
      meadowArt.refreshQuickHud()
      picker.Visible=false
    end
    local function option(order,label,onTap,locked)
      local b=Instance.new("TextButton")
      b.LayoutOrder=order;b.Size=UDim2.new(1,-4,0,38);b.BackgroundColor3=locked and Color3.fromRGB(40,40,40) or Color3.fromRGB(33,50,48);b.BorderSizePixel=0
      b.Font=Enum.Font.GothamBold;b.TextSize=14;b.TextColor3=locked and Color3.fromRGB(140,140,140) or Color3.new(1,1,1);b.Text=label;b.ZIndex=92;b.Parent=list
      Instance.new("UICorner",b).CornerRadius=UDim.new(0,8)
      b.Activated:Connect(onTap)
    end
    local function clearList()
      for _,c in ipairs(list:GetChildren()) do if c:IsA("TextButton") then c:Destroy() end end
    end
    closeBtn.Activated:Connect(function() picker.Visible=false end)
    -- 칸을 먼저 골랐을 때: 넣을 것을 고른다. 배우지 못한 기술은 회색으로 잠겨 있다.
    local fromBar=false
    gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
      if fromBar and gui:GetAttribute("GameMenuOpen")==true then picker.Visible=false end
    end)
    openQuickPicker=function(i)
      fromBar=true;target=i;title.Text=i.."번 칸에 넣을 것";clearList()
      local order=0
      for _,id in ipairs(meadowArt.quickSpecial) do order+=1;option(order,meadowArt.quickSpecialLabel[id],function() choose(id) end) end
      for _,action in ipairs(Config.Actions) do
        if (action.Kind=="COMBAT" or action.Kind=="SKILL") and action.Label and action.Id~="skill-meadow-emote" then
          order+=1
          local lock=meadowArt.skillLock(action.Id)
          option(order,lock and ("잠김 · "..action.Label.." ("..lock..")") or ("기술 · "..action.Label),function()
            if lock then quickSay("아직 못 배웠어 · "..lock) return end
            choose(action.Id)
          end,lock~=nil)
        end
      end
      order+=1;option(order,"비우기",function() choose(false) end)
      picker.Visible=true
    end
    -- 스킬창에서 기술을 먼저 골랐을 때: 몇 번 칸에 넣을지 고른다.
    meadowArt.openSlotChooser=function(actionId,label)
      local lock=meadowArt.skillLock(actionId)
      if lock then quickSay("아직 못 배웠어 · "..lock) return end
      fromBar=false;title.Text=label.." → 몇 번 칸?";clearList()
      for i=1,COUNT do
        option(i,i.."번 칸",function()
          if meadowArt.assignQuick then meadowArt.assignQuick(i,actionId) end
          meadowArt.refreshQuickHud();picker.Visible=false
          quickSay(i.."번 칸에 "..label.." 등록")
        end)
      end
      picker.Visible=true
    end
    -- 편집 단추: 켜 두면 칸을 눌러 바로 바꾼다.
    editButton=Instance.new("TextButton")
    editButton.Name="QuickEdit";editButton.LayoutOrder=99;editButton.Size=UDim2.fromOffset(40,52)
    editButton.BackgroundColor3=Color3.fromRGB(18,30,30);editButton.BackgroundTransparency=.2;editButton.BorderSizePixel=0
    editButton.Font=Enum.Font.GothamBold;editButton.TextSize=12;editButton.TextColor3=Color3.fromRGB(255,240,197);editButton.Text="편집"
    editButton.ZIndex=30;editButton.Parent=bar
    Instance.new("UICorner",editButton).CornerRadius=UDim.new(0,11)
    bar.Size=UDim2.fromOffset(COUNT*52+(COUNT-1)*4+44,52)
    editButton.Activated:Connect(function()
      quickEditMode=not quickEditMode
      editButton.Text=quickEditMode and "완료" or "편집"
      editButton.BackgroundColor3=quickEditMode and Color3.fromRGB(70,110,60) or Color3.fromRGB(18,30,30)
      if quickEditMode then quickSay("바꿀 칸을 눌러 · 길게 눌러도 돼") end
    end)
  end
  meadowArt.refreshQuickHud()
  -- [저장된 3조합 즉시 반영] 서버에서 승인한 5칸 코드만 로컬 아이콘/버튼에 복원한다.
  local function syncSavedQuick()
    if player:GetAttribute("ProfileReady")~=true or
      (tonumber(player:GetAttribute("QuickInit")) or 0)<1 then return end
    for slot=1,COUNT do
      local code=tonumber(player:GetAttribute("QuickSlot"..slot)) or 0
      local id=false
      if code>=1 and code<=5 then id=meadowArt.quickSpecial[code]
      elseif code>=1001 and Config.MeadowSkillNodes[code-1000] then
        id=Config.MeadowSkillNodes[code-1000].Id
      elseif code>=10 and Config.Actions[code-9] then
        id=Config.Actions[code-9].Id
      end
      meadowArt.quickIds[slot]=id
    end
    meadowArt.refreshQuickHud()
    if meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
  end
  player:GetAttributeChangedSignal("MeadowLoadoutActive"):Connect(syncSavedQuick)
  -- 저장된 배치를 프로필이 준비되면 한 번 불러온다.
  task.spawn(function()
    for _=1,60 do
      if player:GetAttribute("ProfileReady")==true then break end
      task.wait(.5)
    end
    -- 서버가 3D 아이템 모델을 올릴 때까지 몇 번 다시 그린다.
    task.spawn(function()
      for _=1,15 do task.wait(2);if meadowArt.refreshQuickHud then meadowArt.refreshQuickHud() end end
    end)
    if (tonumber(player:GetAttribute("QuickInit")) or 0)>=1 then
      for i=1,COUNT do
        local code=tonumber(player:GetAttribute("QuickSlot"..i)) or 0
        local id=false
        if code>=1 and code<=5 then id=meadowArt.quickSpecial[code]
        elseif code>=1001 and Config.MeadowSkillNodes[code-1000] then id=Config.MeadowSkillNodes[code-1000].Id
        elseif code>=10 and Config.Actions[code-9] then id=Config.Actions[code-9].Id end
        meadowArt.quickIds[i]=id
      end
      meadowArt.refreshQuickHud()
    end
  end)
  local elapsed=0
  RunService.Heartbeat:Connect(function(dt)
    elapsed+=dt
    if elapsed<.1 then return end
    elapsed=0
    local old=gui:FindFirstChild("MeadowReferenceHotbar")
    if old and old.Visible then old.Visible=false end
    bar.Visible=gui:GetAttribute("GameMenuOpen")~=true
    local now=workspace:GetServerTimeNow()
    local armed=player.Character and player.Character:FindFirstChildOfClass("Tool")~=nil
    local hp=math.floor(tonumber(player:GetAttribute("MeadowPotionHealth")) or 0)
    local sp=math.floor(tonumber(player:GetAttribute("MeadowPotionStamina")) or 0)
    local oilCharges=math.floor(tonumber(player:GetAttribute("MeadowOilCharges")) or 0)
    for i=1,COUNT do
      local id=meadowArt.quickIds[i]
      local slotUi=slots[i]
      slotUi.edge.Color=Color3.fromRGB(218,189,126)
      slotUi.count.Text="";slotUi.icon.ImageTransparency=0
      local view3d=slotUi.slot:FindFirstChild("Item3D")
      if view3d then view3d.ImageTransparency=0 end
      slotUi.shade.Visible=false;slotUi.timer.Text=""
      if id=="@weapon" then
        slotUi.edge.Color=armed and Color3.fromRGB(120,255,170) or Color3.fromRGB(218,189,126)
      elseif id=="@hp" then
        slotUi.count.Text=hp>0 and tostring(hp) or "";slotUi.icon.ImageTransparency=hp>0 and 0 or .6;if view3d then view3d.ImageTransparency=hp>0 and 0 or .6 end
      elseif id=="@sp" then
        slotUi.count.Text=sp>0 and tostring(sp) or "";slotUi.icon.ImageTransparency=sp>0 and 0 or .6;if view3d then view3d.ImageTransparency=sp>0 and 0 or .6 end
      elseif id=="@oil" then
        slotUi.count.Text=oilCharges>0 and tostring(oilCharges) or "";slotUi.icon.ImageTransparency=oilCharges>0 and 0 or .45;if view3d then view3d.ImageTransparency=oilCharges>0 and 0 or .45 end
      elseif id and id~="@interact" then
        local deadline=player:GetAttribute("MeadowReady_"..id)
        local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
        slotUi.shade.Visible=remaining>.05
        slotUi.timer.Text=remaining>.05 and tostring(math.ceil(remaining)) or ""
      end
    end
  end)
  UserInputService.InputBegan:Connect(function(input,processed)
    if processed or UserInputService:GetFocusedTextBox() then return end
    local keys={Enum.KeyCode.One,Enum.KeyCode.Two,Enum.KeyCode.Three,Enum.KeyCode.Four,Enum.KeyCode.Five}
    for i,code in ipairs(keys)do if input.KeyCode==code then press(i) end end
  end)
  task.spawn(function()
    for _=1,10 do
      pcall(function() game:GetService("StarterGui"):SetCoreGuiEnabled(Enum.CoreGuiType.Backpack,false) end)
      task.wait(1)
    end
  end)
end)()

-- [길 안내 + 첫 접속 튜토리얼] 외부 게임(젤다·원신식 목표 마커, 단계별 코치 카드)을 참고했다.
-- 목표 마커는 현재 퀘스트 위치를 화면에 띄우고, 화면 밖이면 가장자리 화살표로 방향을 알려 준다. 왼쪽 버튼으로 켜고 끈다.
;(function()
  local guiRoot=gui
  local function pref(key,value) pcall(function() remote:FireServer("ui:pref:"..key..":"..value) end) end
  local guideOff=false
  local tutorialStep=0
  local started=false
  -- ===== 목표 찾기 =====
  local function zoneSeed(id)
    for _,z in ipairs(Config.WorldMap.Zones) do if z.Id==id then return z.Seed[1],z.Seed[2] end end
  end
  local function stepTarget(step)
    if step.X then return step.X,step.Z end
    if step.Type=="kill" then
      if step.Boss then
        for _,c in ipairs(Config.WorldMap.Cursed or {}) do if c.Id==step.Boss then return c.X,c.Z end end
      end
      if step.Lord and step.Zone then
        local seat=workspace:GetAttribute("LordSeat_"..step.Zone)
        if typeof(seat)=="Vector3" then return seat.X,seat.Z end
      end
      if step.Named and step.Zone then
        local seat=workspace:GetAttribute("NamedSeat_"..step.Zone)
        if typeof(seat)=="Vector3" then return seat.X,seat.Z end
      end
      if step.Zone then return zoneSeed(step.Zone) end
    end
    return nil
  end
  local function findTarget()
    local lines=Config.QuestLines or {}
    local function fromLines(wantMain)
      for _,line in ipairs(lines) do
        if (line.Kind=="Main")==wantMain then
          local stage=player:GetAttribute(line.Field) or 0
          local step=line.Steps[stage]
          if stage>=1 and step then
            local x,z=stepTarget(step)
            if x then return x,z,step.Title end
          end
        end
      end
    end
    if gui:GetAttribute("TutorialAnvil")==true then
      local st=Config.SmithStations.Anvil
      return st.X,st.Z,"대장간 모루"
    end
    -- [메인 퀘스트 길 안내] 초원 1~6단계와 이후 지역 이동 단계도 표시한다.
    do
      local stage=player:GetAttribute("QuestStage") or 1
      local quest=Config.MainQuests and Config.MainQuests[stage]
      local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      local function nearestPrompt(match)
        local best,bestD=nil,math.huge
        for prompt in pairs(_G.MeadowGuidePrompts or {}) do
          local host=prompt.Parent
          if prompt.Enabled and host and host:IsA("BasePart") and prompt:IsDescendantOf(workspace) and match(prompt) and root then
            local d=(host.Position-root.Position).Magnitude
            if d<bestD then best,bestD=host,d end
          end
        end
        return best
      end
      if quest then
        local host
        if stage==1 then host=nearestPrompt(function(pr) return pr.Name=="MeadowSurvivalInspect" and pr.ObjectText~="오래된 유적" end)
        elseif stage==2 then
          local needWood=(player:GetAttribute("QuestWood") or 0)==0
          host=nearestPrompt(function(pr) return pr.Name=="GatherPrompt" and (pr.ActionText=="나무 채집")==needWood end)
        elseif stage==5 then host=nearestPrompt(function(pr) return pr.Name=="MeadowSurvivalInspect" and pr.ObjectText=="숲 가장자리" end)
        elseif stage==6 then return -321,-193,"서쪽 숲 우두머리 늑대"
        end
        if host then return host.Position.X,host.Position.Z,quest.Name end
        local zoneId=quest.Zone or ({[7]="worldtree",[8]="worldtree",[9]="worldtree",[10]="volcano",[11]="oasis",[12]="oasis"})[stage]
        if zoneId then
          for _,zone in ipairs(Config.WorldMap.Zones) do
            if zone.Id==zoneId then return zone.Seed[1],zone.Seed[2],quest.Name end
          end
        end
      end
    end
    local x,z,label=fromLines(true)
    if x then return x,z,label end
    local idx=player:GetAttribute("VillageContractIndex") or 1
    local village=Config.VillageContracts and Config.VillageContracts[idx]
    if village then
      local phase=player:GetAttribute("VillageContractPhase") or 0
      local mask=player:GetAttribute("VillageContractEvidence") or 0
      if phase==1 then
        -- 1) 주민 진술(약초상·추적자·경비병) → 2) 현장 단서 → 3) 전투 순서로 안내한다.
        local witnessAt={[1]={-68,-122},[2]={69,-129},[3]={-2,-188}}
        local w=village.Witness
        if w and witnessAt[w] and bit32.band(mask,bit32.lshift(1,w-1))==0 then
          return witnessAt[w][1],witnessAt[w][2],(village.WitnessName or "주민").." (진술 듣기)"
        end
        if bit32.band(mask,8)==0 and village.Sites and village.Sites[1] then
          return village.Sites[1][1],village.Sites[1][2],"단서 조사: "..village.Name
        end
        if bit32.band(mask,64)==0 and village.EnemySite then
          return village.EnemySite[1],village.EnemySite[2],village.EnemyName
        end
      else
        return 0,-111,village.Issuer.." (마을 광장)"
      end
    end
    return fromLines(false)
  end
  -- ===== 아이콘: 오너 제작 길 안내 시트(guide-icons.png) — 왼쪽 퀘스트 마커, 오른쪽 안내 화살표(기본 방향=아래) =====
  local GUIDE_SHEET="rbxassetid://109238389541686"
  local function makeArrow(parent,px,name,baseZ,kind)
    local a=Instance.new("ImageLabel")
    a.Name=name;a.AnchorPoint=Vector2.new(.5,.5);a.Size=UDim2.fromOffset(px,px);a.BackgroundTransparency=1
    a.Image=GUIDE_SHEET;a.ImageRectSize=Vector2.new(256,256);a.ImageRectOffset=Vector2.new(kind=="pin" and 0 or 256,0)
    a.ScaleType=Enum.ScaleType.Fit;a.ZIndex=(baseZ or 0)+1;a.Parent=parent
    return a,function(color) a.ImageColor3=color end
  end
  -- ===== 화면 마커(크고 움직이는 목표 표시) =====
  -- 외부 게임(젤다·원신·WoW 퀘스트 화살표) 방식: 큰 핀이 위아래로 튀고, 파동 링이 퍼지고, 먼 목표는 하늘로 빛기둥이 솟는다.
  local marker=Instance.new("Frame")
  marker.Name="MeadowGuideMarker";marker.AnchorPoint=Vector2.new(.5,.5);marker.Size=UDim2.fromOffset(190,150)
  marker.BackgroundTransparency=1;marker.Visible=false;marker.ZIndex=25;marker.Parent=guiRoot
  local pulse=Instance.new("Frame")
  pulse.AnchorPoint=Vector2.new(.5,.5);pulse.Position=UDim2.fromOffset(95,56);pulse.Size=UDim2.fromOffset(60,60)
  pulse.BackgroundTransparency=1;pulse.ZIndex=25;pulse.Parent=marker
  Instance.new("UICorner",pulse).CornerRadius=UDim.new(1,0)
  local pulseStroke=Instance.new("UIStroke");pulseStroke.Color=Color3.fromRGB(255,214,70);pulseStroke.Thickness=4;pulseStroke.Parent=pulse
  local pin,pinColor=makeArrow(marker,66,"MarkerArrow",27,"pin")
  pin.Position=UDim2.fromOffset(95,56)
  local infoLabel=Instance.new("TextLabel")
  infoLabel.AnchorPoint=Vector2.new(.5,0);infoLabel.Position=UDim2.fromOffset(95,98)
  infoLabel.BackgroundColor3=Color3.fromRGB(12,22,22);infoLabel.BackgroundTransparency=.2
  infoLabel.Size=UDim2.fromOffset(150,38);infoLabel.Font=Enum.Font.GothamMedium;infoLabel.TextSize=13;infoLabel.TextWrapped=true
  infoLabel.TextColor3=Color3.fromRGB(255,244,205);infoLabel.TextStrokeTransparency=1;infoLabel.ZIndex=27;infoLabel.Parent=marker
  Instance.new("UICorner",infoLabel).CornerRadius=UDim.new(0,10)
  local infoStroke=Instance.new("UIStroke");infoStroke.Color=Color3.fromRGB(255,214,70);infoStroke.Thickness=1;infoStroke.ApplyStrokeMode=Enum.ApplyStrokeMode.Border;infoStroke.Parent=infoLabel
  -- 목표 위 빛기둥: Part 대신 두 Attachment를 잇는 Beam(형상 없음). 기존 beam.CFrame/beam.Parent 사용법은 그대로 둔다.
  local beamBottom=Instance.new("Attachment");beamBottom.Name="MeadowGuideBeamBottom"
  local beamTop=Instance.new("Attachment");beamTop.Name="MeadowGuideBeamTop"
  local beamLine=Instance.new("Beam");beamLine.Name="MeadowGuideBeam"
  beamLine.Attachment0=beamBottom;beamLine.Attachment1=beamTop
  beamLine.Color=ColorSequence.new(Color3.fromRGB(255,214,70));beamLine.Transparency=NumberSequence.new(.6)
  beamLine.LightEmission=1;beamLine.Width0=3;beamLine.Width1=3;beamLine.FaceCamera=true;beamLine.Segments=1
  local beamCenter=Vector3.zero
  local beam=setmetatable({},{__newindex=function(_,key,value)
    if key=="CFrame" then
      beamCenter=value.Position
    elseif key=="Parent" then
      local host=value and workspace.Terrain or nil
      beamBottom.Parent=host;beamTop.Parent=host;beamLine.Parent=host
      if host then
        beamBottom.WorldPosition=beamCenter-Vector3.new(0,45,0)
        beamTop.WorldPosition=beamCenter+Vector3.new(0,45,0)
      end
    end
  end})
  local camera=workspace.CurrentCamera
  local tx,tz,tlabel=nil,nil,nil
  local lastFind=0
  RunService.RenderStepped:Connect(function()
    if guideOff or player:GetAttribute("ProfileReady")~=true or gui:GetAttribute("GameMenuOpen")==true then marker.Visible=false beam.Parent=nil return end
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    camera=workspace.CurrentCamera
    if not root or not camera then marker.Visible=false beam.Parent=nil return end
    if os.clock()-lastFind>.7 then lastFind=os.clock();tx,tz,tlabel=findTarget() end
    if not tx then marker.Visible=false beam.Parent=nil return end
    local dx,dz=tx-root.Position.X,tz-root.Position.Z
    local dist=math.sqrt(dx*dx+dz*dz)
    if dist<12 then marker.Visible=false beam.Parent=nil return end
    beam.CFrame=CFrame.new(tx,root.Position.Y+40,tz);beam.Parent=workspace
    local pos=Vector3.new(tx,root.Position.Y+9,tz)
    local sp,onScreen=camera:WorldToViewportPoint(pos)
    local size=guiRoot.AbsoluteSize
    local px,py=sp.X,sp.Y
    local rot=0
    if sp.Z<0 then px,py=size.X-px,size.Y-py end
    local margin=80
    local inside=onScreen and px>margin and px<size.X-margin and py>margin and py<size.Y-margin-40
    if not inside then
      local cx,cy=size.X/2,size.Y/2
      local vx,vy=px-cx,py-cy
      local scale=math.min((cx-margin)/math.max(1,math.abs(vx)),(cy-margin-50)/math.max(1,math.abs(vy)))
      px,py=cx+vx*scale,cy+vy*scale
      rot=math.deg(math.atan2(vy,vx))-90
    end
    -- 왼쪽 퀘스트창 위에 목표 마커·거리표가 겹치지 않도록 창 오른쪽 바깥으로 밀어낸다.
    do
      -- questTracker가 아직 없거나(nil) 이 범위에서 보이지 않으면 건너뛴다 (캡처 콘솔에서 매 프레임 오류가 났던 곳)
      local qt=_G.MeadowQuestTracker
      if qt and guiRoot and qt.Visible then
        local qp,qs=qt.AbsolutePosition-meadowArt.origin(guiRoot),qt.AbsoluteSize
        if px<qp.X+qs.X+100 and py>qp.Y-70 and py<qp.Y+qs.Y+80 then
          px=qp.X+qs.X+100
        end
      end
    end
    marker.Position=UDim2.fromOffset(px,py)
    -- 안: ▼ 핀이 통통 튄다. 밖: 같은 큰 화살표(▼)를 목표 방향으로 돌린다.
    pin.Rotation=inside and 0 or rot
    pin.Position=UDim2.fromOffset(95,56+(inside and math.abs(math.sin(os.clock()*4))*-14 or math.sin(os.clock()*6)*4))
    local t=(os.clock()*1.1)%1
    pulse.Size=UDim2.fromOffset(40+t*110,40+t*110)
    pulseStroke.Transparency=t
    pulse.Visible=false
    local near=dist<45
    pinColor(near and Color3.fromRGB(190,255,200) or Color3.new(1,1,1))
    infoLabel.Text=string.format("%s\n%dm",tlabel or "목표",math.floor(dist))
    marker.Visible=true
  end)
  -- ===== 길 안내 버튼: 지도 바로 아래 =====
  local guideChip=Instance.new("TextButton")
  guideChip.Name="MeadowGuideChip";guideChip.AnchorPoint=Vector2.new(.5,0);guideChip.Size=UDim2.new(0,24,1,-20)
  guideChip.BackgroundColor3=Color3.fromRGB(13,30,28);guideChip.BackgroundTransparency=.1;guideChip.BorderSizePixel=0
  guideChip.Font=Enum.Font.Gotham;guideChip.TextSize=11;guideChip.TextStrokeTransparency=1;guideChip.TextColor3=Color3.fromRGB(255,240,197);guideChip.ZIndex=29;guideChip.Parent=guiRoot
  Instance.new("UICorner",guideChip).CornerRadius=UDim.new(0,9)
  local guideChipStroke=Instance.new("UIStroke");guideChipStroke.Color=Color3.fromRGB(220,176,91);guideChipStroke.Thickness=1.5;guideChipStroke.ApplyStrokeMode=Enum.ApplyStrokeMode.Border;guideChipStroke.Parent=guideChip
  local function paintGuide()
    guideChip.Text=guideOff and "◇\n길\n안\n내" or "◆\n길\n안\n내"
    guideChip.TextColor3=guideOff and Color3.fromRGB(150,150,140) or Color3.fromRGB(140,235,160)
    guideChip.BackgroundColor3=guideOff and Color3.fromRGB(30,28,28) or Color3.fromRGB(13,30,28)
  end
  gui:GetAttributeChangedSignal("MeadowGuideForceOn"):Connect(function()
    if guideOff then guideOff=false;paintGuide();pref("guide",0) end
  end)
  guideChip.Activated:Connect(function()
    guideOff=not guideOff;paintGuide();pref("guide",guideOff and 1 or 0)
    meadowArt.sfx("click",.4,1)
  end)
  -- 지도 프레임 안(맨 위 중앙)에 붙인다. 지도가 숨겨지면 같이 숨겨진다.
  task.spawn(function()
    local radar
    repeat
      radar=player.PlayerGui:FindFirstChild("MeadowExplorerRadar",true)
      if not radar then task.wait(.5) end
    until radar
    guideChip.AnchorPoint=Vector2.new(1,0)
    guideChip.Position=UDim2.new(0,-4,0,0)
    guideChip.ZIndex=30
    guideChip.Parent=radar
  end)
  -- ===== 튜토리얼: 조작 → 메뉴 → 스킬창 → 기술 1개 배우기 (실제로 할 때까지 안 끝난다) =====
  local function findText(cls,text)
    for _,d in ipairs(player.PlayerGui:GetDescendants()) do
      if d:IsA(cls) and d.Text==text and d.AbsoluteSize.X>0 then return d end
    end
  end
  local function center(o) return Vector2.new(o.AbsolutePosition.X+o.AbsoluteSize.X/2,o.AbsolutePosition.Y+o.AbsoluteSize.Y/2) end
  local function anyTalent()
    -- 스킬창 머리글 "90개 중 습득 N단계"를 읽어 실제 습득 여부를 판단한다.
    local header=player.PlayerGui:FindFirstChild("TalentPoints",true)
    local n=header and tonumber(tostring(header.Text):match("습득%s*(%d+)"))
    if n and n>0 then return true end
    for _,name in ipairs({"MeadowTalentMartial","MeadowTalentSigns","MeadowTalentDefense","MeadowTalentAgility"}) do
      if (tonumber(player:GetAttribute(name)) or 0)>0 then return true end
    end
    return false
  end
  local function menuOpen() return gui:GetAttribute("GameMenuOpen")==true end
  local function skillPageOpen()
    if not menuOpen() then return false end
    local tree=player.PlayerGui:FindFirstChild("WitcherSkillTree",true)
    if not tree or tree.AbsoluteSize.X<=0 then return false end
    local o=tree
    while o and o:IsA("GuiObject") do
      if not o.Visible then return false end
      o=o.Parent
    end
    return true
  end
  -- 각 단계: 제목, 설명, 가리킬 곳(함수, 화면 좌표·방향 반환), 자동 완료 조건(없으면 버튼)
  local steps={
    {"이동하기","왼쪽 아래 조이스틱을 밀어 걸어 봐.",function() return Vector2.new(guiRoot.AbsoluteSize.X*.1,guiRoot.AbsoluteSize.Y*.8),"up" end,"move"},
    {"카메라 돌리기","화면 오른쪽 빈 곳을 끌면 시야가 돌아가.",function() return Vector2.new(guiRoot.AbsoluteSize.X*.62,guiRoot.AbsoluteSize.Y*.45),"down" end,nil},
    {"전투 버튼","큰 칼 = 공격 · 방패 = 막기 · 소용돌이 = 회피 · 질주 = 자동질주 ON/OFF",function() return Vector2.new(guiRoot.AbsoluteSize.X*.9,guiRoot.AbsoluteSize.Y*.72),"left" end,nil},
    {"퀵슬롯","아래 1~5칸을 누르면 바로 써. '편집'을 눌러 칸을 바꿀 수 있어.",function()
      local bar=player.PlayerGui:FindFirstChild("MeadowQuickBar",true)
      local edit=bar and (bar:FindFirstChild("QuickEdit",true) or findText("TextButton","편집"))
      if edit and edit.AbsoluteSize.X>0 then return Vector2.new(edit.AbsolutePosition.X+edit.AbsoluteSize.X/2,edit.AbsolutePosition.Y),"down" end
      if bar and bar.AbsoluteSize.X>0 then return Vector2.new(bar.AbsolutePosition.X+bar.AbsoluteSize.X/2,bar.AbsolutePosition.Y),"down" end
      return Vector2.new(guiRoot.AbsoluteSize.X*.5,guiRoot.AbsoluteSize.Y*.88),"down"
    end,nil},
    {"퀘스트와 길 안내","왼쪽 퀘스트창이 지금 할 일이야. 노란 보석 표시를 따라가면 돼.",function() local c=guideChip.Visible and center(guideChip) or Vector2.new(guiRoot.AbsoluteSize.X*.5,guiRoot.AbsoluteSize.Y*.28);return c,"up" end,nil},
    {"길 안내 켜고 끄기","지도 왼쪽 '길 안내' 버튼을 눌러 봐. 끄면 표시가 사라지고, 다시 누르면 켜져.",function() local c=guideChip.Visible and center(guideChip) or nil;return c,"up" end,"guide"},
    {"메뉴 열기","오른쪽 위 '가방'을 눌러 메뉴를 열어 봐.",function() local l=findText("TextLabel","가방");return l and (center(l)+Vector2.new(0,-26)) or Vector2.new(guiRoot.AbsoluteSize.X*.62,40),"up" end,"menu"},
    {"스킬 탭","메뉴 아래쪽 탭에서 '스킬'을 눌러.",function() local t=findText("TextButton","스킬");return t and center(t) or nil,"down" end,"skillpage"},
    {"기술 배우기","'전사' 탭의 맨 위 첫 기술을 눌러 고르고, 아래 '습득' 버튼을 눌러. 첫 점수는 선물이야!",function()
      local function shown(o)
        while o and o:IsA("GuiObject") do
          if not o.Visible then return false end
          o=o.Parent
        end
        return true
      end
      local learn=player.PlayerGui:FindFirstChild("SkillNodeLearnA",true)
      if learn and learn.AbsoluteSize.X>0 and shown(learn) and not tostring(learn.Text):find("잠김") then return center(learn),"down" end
      local node=player.PlayerGui:FindFirstChild("TalentNode_1",true)
      if node and node.AbsoluteSize.X>0 and shown(node) then return center(node),"down" end
      return nil,"down"
    end,"learned"},
    {"퀵슬롯 편집","잘했어! 메뉴를 닫고 아래 '편집'을 누르면 칸마다 기술·약·무기를 바꿀 수 있어.",function()
      local edit=player.PlayerGui:FindFirstChild("QuickEdit",true)
      if edit and edit.AbsoluteSize.X>0 and not menuOpen() then return Vector2.new(edit.AbsolutePosition.X+edit.AbsoluteSize.X/2,edit.AbsolutePosition.Y),"down" end
      return nil,"down"
    end,nil},
    {"대장간 가기","마을 서쪽 대장간(대장장이 브란)으로 가 봐. 모루 근처에서만 장비를 만들 수 있어. 길 안내 ▼를 따라가.",function()
      local cam=workspace.CurrentCamera
      local st=Config.SmithStations.Anvil
      if cam then
        local sp,on=cam:WorldToViewportPoint(Vector3.new(st.X,6,st.Z))
        if on and sp.Z>0 then return Vector2.new(sp.X,sp.Y-30),"down" end
      end
      return nil,"down"
    end,"anvil"},
    {"모루에서 제작","메뉴 '가방'에서 만들 장비를 골라 '제작'을 눌러. 재료가 모자라면 상인에게서 기본 장비를 살 수도 있어. 요리·물약은 식당 화덕에서 해.",function() return nil,"down" end,nil},
    {"시작!","이제 노란 ▼ 표시를 따라 모험을 시작해! 메뉴는 오른쪽 위 설정 옆 '도우미'에서 다시 볼 수 있어.",function() return nil,"down" end,nil},
  }
  local card=Instance.new("Frame")
  card.Name="MeadowTutorialCard";card.AnchorPoint=Vector2.new(.5,1);card.Position=UDim2.new(.5,0,1,-20)
  card.Size=UDim2.fromOffset(460,132);card.BackgroundColor3=Color3.fromRGB(10,18,18);card.BackgroundTransparency=1
  card.Visible=false;card.ZIndex=120;card.Active=false;card.Parent=guiRoot
  local ctitle=Instance.new("TextLabel")
  ctitle.BackgroundTransparency=1;ctitle.Position=UDim2.fromOffset(0,0);ctitle.Size=UDim2.new(1,0,0,26)
  ctitle.Font=Enum.Font.GothamMedium;ctitle.TextSize=19;ctitle.TextXAlignment=Enum.TextXAlignment.Center
  ctitle.TextStrokeColor3=Color3.new(0,0,0);ctitle.TextStrokeTransparency=.35
  ctitle.TextColor3=Color3.fromRGB(255,232,160);ctitle.ZIndex=121;ctitle.Parent=card
  local cbody=Instance.new("TextLabel")
  cbody.BackgroundTransparency=1;cbody.Position=UDim2.fromOffset(0,28);cbody.Size=UDim2.new(1,0,0,66)
  cbody.Font=Enum.Font.Gotham;cbody.TextSize=17;cbody.TextWrapped=true;cbody.TextXAlignment=Enum.TextXAlignment.Center
  cbody.TextStrokeColor3=Color3.new(0,0,0);cbody.TextStrokeTransparency=.35
  cbody.TextYAlignment=Enum.TextYAlignment.Top;cbody.TextColor3=Color3.fromRGB(236,242,230);cbody.ZIndex=121;cbody.Parent=card
  local nextBtn=Instance.new("TextButton")
  nextBtn.AnchorPoint=Vector2.new(.5,1);nextBtn.Position=UDim2.new(.5,0,1,-2);nextBtn.Size=UDim2.fromOffset(96,30)
  nextBtn.BackgroundColor3=Color3.fromRGB(54,112,84);nextBtn.Font=Enum.Font.GothamMedium;nextBtn.TextSize=16
  nextBtn.TextColor3=Color3.new(1,1,1);nextBtn.ZIndex=122;nextBtn.Parent=card
  Instance.new("UICorner",nextBtn).CornerRadius=UDim.new(0,10)
  -- 큰 포인터(▼▲◀) + 퍼지는 링
  local pointer=makeArrow(guiRoot,70,"TutorialPointer",130,"chevron")
  pointer.Visible=false
  local ring=Instance.new("Frame")
  ring.AnchorPoint=Vector2.new(.5,.5);ring.BackgroundTransparency=1;ring.Visible=false;ring.ZIndex=129;ring.Parent=guiRoot
  Instance.new("UICorner",ring).CornerRadius=UDim.new(1,0)
  local ringStroke=Instance.new("UIStroke");ringStroke.Color=Color3.fromRGB(255,214,70);ringStroke.Thickness=4;ringStroke.Parent=ring
  local function idx(title) for i,st in ipairs(steps) do if st[1]==title then return i end end return 1 end
  local current=0
  local moveStart=nil
  local granted=false
  local guideAtShow=false
  local function finish()
    current=0;card.Visible=false;pointer.Visible=false;ring.Visible=false
    tutorialStep=99;pref("tut",99)
    gui:SetAttribute("TutorialAnvil",false)
    gui:SetAttribute("TutorialOverviewDone",true)
    if menuOpen() then pcall(function() meadowMenu.close() end) end
  end
  local function show(i)
    if i>#steps then finish() return end
    current=i
    local s=steps[i]
    ctitle.Text=string.format("튜토리얼 %d/%d · %s",i,#steps,s[1])
    cbody.Text=s[2]
    local auto=s[4]~=nil
    nextBtn.Visible=not auto
    nextBtn.Text=i==#steps and "시작!" or "다음"
    card.Visible=true
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    moveStart=root and root.Position or nil
    guideAtShow=guideOff
    gui:SetAttribute("TutorialAnvil",s[4]=="anvil")
    if s[4]=="menu" and not granted then granted=true;pref("grant",1) end
    if i<50 then pref("tut",math.min(i,49)) end
  end
  nextBtn.Activated:Connect(function() meadowArt.sfx("click",.4,1);show(current+1) end)
  meadowTutorialRestart=function() granted=true;show(1) end
  local arrows={up="▲",down="▼",left="◀",right="▶"}
  local tutorialRadar,tutorialPos,tutorialDir,tutorialPosAt,tutorialPosStep
  RunService.RenderStepped:Connect(function()
    if current==0 then return end
    local s=steps[current]
    -- 완료 조건 확인
    local cond=s[4]
    if cond=="move" then
      local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      if root and moveStart and (root.Position-moveStart).Magnitude>10 then show(current+1) return end
    elseif cond=="guide" and guideOff~=guideAtShow then
      -- 눌러 본 뒤에는 다시 켜 둔다.
      guideOff=false;paintGuide();pref("guide",0);show(current+1) return
    elseif cond=="menu" and menuOpen() then show(current+1) return
    elseif cond=="skillpage" and skillPageOpen() then show(current+1) return
    elseif cond=="learned" and anyTalent() then show(current+1) return
    elseif cond=="anvil" then
      local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      local st=Config.SmithStations.Anvil
      if root and (Vector2.new(root.Position.X-st.X,root.Position.Z-st.Z)).Magnitude<=st.Radius+6 then show(current+1) return end
    end
    -- 메뉴가 닫히면 메뉴 단계로 되돌린다.
    if (cond=="skillpage" or cond=="learned") and not menuOpen() then show(idx("메뉴 열기")) return end
    if cond=="learned" and not skillPageOpen() then show(idx("스킬 탭")) return end
    -- 카드 위치: 평소엔 위쪽(퀵슬롯·버튼을 안 가림), 메뉴가 열려 있으면 아래쪽.
    -- [성능] 매 프레임 PlayerGui 전체를 뒤지지 않도록 레이더는 한 번 찾아 캐시한다.
    if not (tutorialRadar and tutorialRadar.Parent) then
      tutorialRadar=player.PlayerGui:FindFirstChild("MeadowExplorerRadar",true)
    end
    local radar=tutorialRadar
    if menuOpen() then
      -- 메뉴창(스킬 칸)을 가리지 않도록 화면 맨 위에 작게 붙인다.
      card.AnchorPoint=Vector2.new(.5,0);card.Position=UDim2.new(.5,0,0,2);card.BackgroundTransparency=.25
      -- 창 제목줄(탐험 / 스킬)과 왼쪽 로블록스 버튼을 가리지 않게 폭·높이를 줄인다.
      card.Size=UDim2.fromOffset(380,nextBtn.Visible and 74 or 46)
      ctitle.TextSize=13;ctitle.Size=UDim2.new(1,0,0,16)
      cbody.TextSize=12;cbody.Position=UDim2.fromOffset(0,17);cbody.Size=UDim2.new(1,0,0,28)
    else
      local y=radar and (radar.AbsolutePosition.Y+radar.AbsoluteSize.Y-meadowArt.origin(guiRoot).Y+6) or 84
      card.AnchorPoint=Vector2.new(.5,0);card.Position=UDim2.new(.5,0,0,y);card.BackgroundTransparency=1
      card.Size=UDim2.fromOffset(460,132)
      ctitle.TextSize=19;ctitle.Size=UDim2.new(1,0,0,26)
      cbody.TextSize=17;cbody.Position=UDim2.fromOffset(0,28);cbody.Size=UDim2.new(1,0,0,66)
    end
    -- [성능] 목표 좌표 탐색(GUI 전체 검색 포함)은 0.1초마다만 하고 그 사이엔 결과를 재사용한다.
    local nowT=os.clock()
    if not tutorialPosAt or nowT-tutorialPosAt>=.1 or tutorialPosStep~=current then
      tutorialPosAt=nowT;tutorialPosStep=current
      tutorialPos,tutorialDir=s[3]()
    end
    local pos,dir=tutorialPos,tutorialDir
    if pos then
      -- 화살표 끝이 목표 좌표에 닿도록 반 크기(35)만큼 띄우고, 통통 튈 때만 최대 10px 떨어진다.
      local bob=math.abs(math.sin(os.clock()*5))*10
      local gap=35+bob
      local off=dir=="up" and Vector2.new(0,gap) or dir=="down" and Vector2.new(0,-gap)
        or dir=="left" and Vector2.new(gap,0) or Vector2.new(-gap,0)
      pointer.Rotation=dir=="up" and 180 or dir=="down" and 0 or dir=="left" and 90 or -90
      local o=meadowArt.origin(guiRoot)
      pointer.Position=UDim2.fromOffset(pos.X+off.X-o.X,pos.Y+off.Y-o.Y)
      local t=(os.clock()*1.2)%1
      pointer.Visible=true;ring.Visible=false
    else
      pointer.Visible=false;ring.Visible=false
    end
  end)
  -- ===== 저장값 읽기, 완료 전이면 자동 시작 =====
  task.spawn(function()
    while player:GetAttribute("ProfileReady")~=true do task.wait(.5) end
    guideOff=(player:GetAttribute("GuideOff") or 0)==1
    tutorialStep=player:GetAttribute("TutorialStep") or 0
    paintGuide()
    while gui.Enabled~=true do task.wait(.5) end
    tutorialStep=player:GetAttribute("TutorialStep") or tutorialStep
    if tutorialStep<99 and not started then
      started=true
      task.wait(2.5)
      if menuOpen() then show(idx("메뉴 열기")) else show(1) end
    else
      gui:SetAttribute("TutorialOverviewDone",true)
    end
  end)
end)()

-- [QA 훅] Studio 점검에서 서버가 QAAction 속성("기술ID|번호")을 바꾸면 내 캐릭터가 그 기술을 쓴다. 내 정상 기술 경로만 호출한다.
;(function()
  player:GetAttributeChangedSignal("QAAction"):Connect(function()
    local v=tostring(player:GetAttribute("QAAction") or "")
    local id=v:match("^([^|]+)")
    if id then pcall(activateMeadowAction,id) end
  end)
end)()

-- [탈것 빠른 버튼] 탈것을 하나라도 샀으면 화면 오른쪽에 버튼이 나온다. 누르면 마지막 탈것을 타고, 타는 중이면 내린다(서버가 마을·전투 상태를 검사).
;(function()
  local playerGui=player:FindFirstChildOfClass("PlayerGui") or player:WaitForChild("PlayerGui")
  local gui=Instance.new("ScreenGui");gui.Name="MountQuickGui";gui.ResetOnSpawn=false;gui.DisplayOrder=30;gui.Parent=playerGui
  local button=Instance.new("TextButton")
  button.Name="MountQuickButton";button.AnchorPoint=Vector2.new(1,.5);button.Position=UDim2.new(1,-14,.5,60);button.Size=UDim2.fromOffset(56,56)
  button.BackgroundColor3=Color3.fromRGB(60,44,30);button.BackgroundTransparency=.12;button.TextColor3=Color3.fromRGB(255,232,180)
  button.Font=Enum.Font.GothamBold;button.TextSize=13;button.Text="탈것";button.AutoButtonColor=true;button.Visible=false;button.Parent=gui
  local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(1,0);corner.Parent=button
  local stroke=Instance.new("UIStroke");stroke.Color=Color3.fromRGB(230,190,110);stroke.Thickness=2;stroke.Parent=button
  local function refresh()
    local owned=tonumber(player:GetAttribute("MountOwned")) or 0
    button.Visible=owned~=0
    button.Text=(tonumber(player:GetAttribute("MountRiding")) or 0)~=0 and "내리기" or "탈것"
  end
  player:GetAttributeChangedSignal("MountOwned"):Connect(refresh)
  player:GetAttributeChangedSignal("MountRiding"):Connect(refresh)
  refresh()
  button.Activated:Connect(function()
    remote:FireServer("mount:quick:0")
  end)
end)()

