-- 파일명: roblox-games/cozy-island/client/Game.client.luau
-- roblox-games/cozy-island/client/Game.client.luau
-- 포근섬 모바일 우선 HUD / 채집·건설·전투 조작

-- 서비스
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")

-- 참조
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 1
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
 local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,radius or 12);corner.Parent=target
end

local function outline(target,transparency)
 local stroke=Instance.new("UIStroke");stroke.Thickness=1.5;stroke.Transparency=transparency or .35;stroke.Parent=target
end

local function makeButton(parent,text,color)
 local b=Instance.new("TextButton")
 b.AutoButtonColor=true
 b.BackgroundColor3=color
 b.TextColor3=Color3.fromRGB(255,255,255)
 b.Text=text
 b.TextScaled=true
 b.Font=Enum.Font.GothamBold
 b.Parent=parent
 roundify(b,12);outline(b,.5)
 return b
end

local feedbackFlash=Instance.new("Frame")
if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = feedbackFlash
end
feedbackFlash:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
feedbackFlash:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))

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
local hud=Instance.new("Frame")
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
resources.TextWrapped=false
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
objective.TextScaled=true
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
gatherHint.Text="나무/작물에 가까이 가서 직접 채집"
gatherHint.Parent=gui
roundify(gatherHint,8)
if touchEnabled then task.delay(9,function()if gatherHint.Parent then gatherHint.Visible=false end end)end

-- 하단 조작: 채집은 월드 상호작용, 여기에는 마을 운영/정복만 표시
local controls=Instance.new("Frame")
controls.Name="ActionDock"
controls.AnchorPoint=Vector2.new(.5,1)
controls.Position=UDim2.new(.5,0,1,-10)
controls.Size=UDim2.fromOffset(196,42)
controls.BackgroundColor3=Color3.fromRGB(26,43,39)
controls.BackgroundTransparency=.12
controls.Parent=gui
roundify(controls,14);outline(controls,.5)

local actionPopup=Instance.new("Frame")
actionPopup.Name="ActionPopup"
actionPopup.AnchorPoint=Vector2.new(.5,1)
actionPopup.Position=UDim2.new(.5,0,1,-56)
actionPopup.Size=UDim2.fromOffset(252,82)
actionPopup.BackgroundColor3=Color3.fromRGB(26,43,39)
actionPopup.BackgroundTransparency=.08
actionPopup.Visible=false
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
local popupToken=0
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
 popupToken+=1
 local token=popupToken
 task.delay(4.5,function()
  if popupToken==token and actionPopup.Visible then
   actionPopup.Visible=false
   openGroup=nil
  end
 end)
end

for groupIndex,group in ipairs(groups)do
 local tab=makeButton(controls,group.title,group.color)
 tab.Size=UDim2.new(.46,0,0,32)
 tab.Position=UDim2.new(.035+(groupIndex-1)*.49,0,0,5)
 tab.Activated:Connect(function()showGroup(groupIndex)end)

 for row,a in ipairs(group.actions)do
  local b=makeButton(actionPopup,a[2],group.color)
  b.Size=UDim2.fromOffset(116,32)
  local col=(row-1)%2
  local line=math.floor((row-1)/2)
  b.Position=UDim2.fromOffset(7+col*122,7+line*36)
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

-- 상태 갱신
local function render()
  local idx=p:GetAttribute("NextBaseIndex")or 1
  local b=C.Bases[idx]
  local target=b and (b.Name .. " · " .. (b.Enemy or "수비대") .. " · 전력 " .. b.Strength)or "5개 거점 정복 완료"
  resources.Text=string.format("나무 %d · 식량 %d · 코인 %d
병사 %d · 병영 Lv.%d · 점령 %d/5",
   p:GetAttribute("Wood")or 0,p:GetAttribute("Food")or 0,p:GetAttribute("Coins")or 0,
   p:GetAttribute("Troops")or 0,p:GetAttribute("BarracksLevel")or 1,p:GetAttribute("CapturedBases")or 0)

  local inBattle=p:GetAttribute("InBattle")==true
  local activity=p:GetAttribute("LastActivity")or "나무/작물에 가까이 가서 직접 채집"
  objective.Text=inBattle and ("⚔ " .. target .. " · 전투 " .. (p:GetAttribute("BattleProgress")or 0) .. "%") or (activity .. "  |  다음: " .. target)

  if inBattle then
    if bgm.IsPlaying then bgm:Stop() end
    if not battleBgm.IsPlaying then battleBgm:Play() end
  else
    if battleBgm.IsPlaying then battleBgm:Stop() end
    if not bgm.IsPlaying then bgm:Play() end
  end

  local captured=p:GetAttribute("CapturedBases")or 0
  if captured>lastCaptured then victorySfx.TimePosition=0;victorySfx:Play() end
  lastCaptured=captured
end

for _,k in ipairs({"Wood","Food","Coins","Iron","Horses","Stone","Gold","Sulfur","Residents","WoodWorkers","Farmers","BarracksLevel","Troops","CapturedBases","CapturedIslands","NextBaseIndex","BattleProgress","LastActivity","InBattle"})do
  p:GetAttributeChangedSignal(k):Connect(render)
end

p:GetAttributeChangedSignal("FeedbackEvent"):Co
 local idx=p:GetAttribute("NextBaseIndex")or 1
 local b=C.Bases[idx]
 local target=b and (b.Name.." · "..(b.Enemy or"수비대").." · 전력 "..b.Strength)or"5개 거점 정복 완료"
 resources.Text=string.format("나무 %d · 식량 %d · 코인 %d\n병사 %d · 병영 Lv.%d · 점령 %d/5",
  p:GetAttribute("Wood")or 0,p:GetAttribute("Food")or 0,p:GetAttribute("Coins")or 0,
  p:GetAttribute("Troops")or 0,p:GetAttribute("BarracksLevel")or 1,p:GetAttribute("CapturedBases")or 0)

 local inBattle=p:GetAttribute("InBattle")==true
 local activity=p:GetAttribute("LastActivity")or"나무/작물에 가까이 가서 직접 채집"
 objective.Text=inBattle and ("⚔ "..target.." · 전투 "..(p:GetAttribute("BattleProgress")or 0).."%") or (activity.."  |  다음: "..target)

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
  {label="cozy-east-regions",position=Vector3.new(270,135,5),lookAt=Vector3.new(170,5,0)},
  {label="cozy-west-regions",position=Vector3.new(-270,135,5),lookAt=Vector3.new(-170,5,0)},
  {label="cozy-volcano",position=Vector3.new(0,145,-350),lookAt=Vector3.new(0,12,-232)},
 }
end)


render()
