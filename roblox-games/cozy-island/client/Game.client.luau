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
local remote=RS:WaitForChild(C.RemoteName)

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
gui.Parent=p:WaitForChild("PlayerGui")

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
hud.AnchorPoint=Vector2.new(.5,0)
hud.Position=UDim2.new(.5,0,0,8)
hud.Size=UDim2.new(1,-16,0,128)
hud.BackgroundColor3=Color3.fromRGB(38,67,61)
hud.BackgroundTransparency=.08
hud.Parent=gui
roundify(hud,14);outline(hud,.4)

local title=Instance.new("TextLabel")
title.Size=UDim2.new(1,-16,0,28)
title.Position=UDim2.fromOffset(8,5)
title.BackgroundTransparency=1
title.Text="포근섬 · 5거점 정복"
title.TextColor3=Color3.fromRGB(255,244,208)
title.TextXAlignment=Enum.TextXAlignment.Left
title.TextScaled=true
title.Font=Enum.Font.GothamBold
title.Parent=hud

local resources=Instance.new("TextLabel")
resources.Size=UDim2.new(1,-16,0,46)
resources.Position=UDim2.fromOffset(8,35)
resources.BackgroundTransparency=1
resources.TextColor3=Color3.fromRGB(235,245,238)
resources.TextWrapped=true
resources.TextScaled=true
resources.Font=Enum.Font.Gotham
resources.Parent=hud

local objective=Instance.new("TextLabel")
objective.Size=UDim2.new(1,-16,0,38)
objective.Position=UDim2.fromOffset(8,84)
objective.BackgroundColor3=Color3.fromRGB(29,50,46)
objective.BackgroundTransparency=.18
objective.TextColor3=Color3.fromRGB(255,232,158)
objective.TextWrapped=true
objective.TextScaled=true
objective.Font=Enum.Font.GothamBold
objective.Parent=hud
roundify(objective,9)

-- 하단 조작: 채집 / 성장 / 전투를 시각적으로 분리
local controls=Instance.new("Frame")
controls.Name="ActionDock"
controls.AnchorPoint=Vector2.new(.5,1)
controls.Position=UDim2.new(.5,0,1,-8)
controls.Size=UDim2.new(1,-16,0,210)
controls.BackgroundColor3=Color3.fromRGB(26,43,39)
controls.BackgroundTransparency=.07
controls.Parent=gui
roundify(controls,16);outline(controls,.45)

local sectionTitles={"채집","마을 성장","정복"}
for i,text in ipairs(sectionTitles)do
 local label=Instance.new("TextLabel")
 label.Size=UDim2.new(.32,0,0,24)
 label.Position=UDim2.new(.013+(i-1)*.329,0,0,6)
 label.BackgroundTransparency=1
 label.Text=text
 label.TextColor3=i==1 and Color3.fromRGB(139,226,156) or i==2 and Color3.fromRGB(250,210,116) or Color3.fromRGB(255,135,106)
 label.TextScaled=true
 label.Font=Enum.Font.GothamBold
 label.Parent=controls
end

local groups={
 {
  color=Color3.fromRGB(63,133,84),
  actions={{C.Actions.CHOP,"벌목"},{C.Actions.FOOD,"식량"},{C.Actions.HIRE,"주민"}},
 },
 {
  color=Color3.fromRGB(139,104,48),
  actions={{C.Actions.WOOD_JOB,"벌목배치"},{C.Actions.FOOD_JOB,"식량배치"},{C.Actions.BARRACKS,"병영강화"}},
 },
 {
  color=Color3.fromRGB(150,67,52),
  actions={{C.Actions.RECRUIT,"병사모집"},{C.Actions.ATTACK,"기지공격"},{C.Actions.SUPPORT,"원정지원"}},
 },
}

for groupIndex,group in ipairs(groups)do
 for row,a in ipairs(group.actions)do
  local b=makeButton(controls,a[2],group.color)
  b.Size=UDim2.new(.305,0,0,50)
  b.Position=UDim2.new(.018+(groupIndex-1)*.329,0,0,32+(row-1)*57)
  b.Activated:Connect(function()
   if a[1]==C.Actions.ATTACK or a[1]==C.Actions.RECRUIT or a[1]==C.Actions.BARRACKS then actionSfx.TimePosition=0;actionSfx:Play()end
   remote:FireServer(a[1])
  end)
 end
end

-- 상태 갱신
local function render()
 local idx=p:GetAttribute("NextBaseIndex")or 1
 local b=C.Bases[idx]
 local target=b and (b.Name.." · "..(b.Enemy or"수비대").." · 전력 "..b.Strength)or"5개 거점 정복 완료"
 resources.Text=string.format("나무 %d  식량 %d  코인 %d  |  철 %d  말 %d  돌 %d  금 %d  유황 %d\n주민 %d · 병영 Lv.%d · 병사 %d · 점령 %d/5",
  p:GetAttribute("Wood")or 0,p:GetAttribute("Food")or 0,p:GetAttribute("Coins")or 0,p:GetAttribute("Iron")or 0,p:GetAttribute("Horses")or 0,p:GetAttribute("Stone")or 0,p:GetAttribute("Gold")or 0,p:GetAttribute("Sulfur")or 0,
  p:GetAttribute("Residents")or 0,p:GetAttribute("BarracksLevel")or 1,p:GetAttribute("Troops")or 0,p:GetAttribute("CapturedBases")or 0)

 local inBattle=p:GetAttribute("InBattle")==true
 local activity=p:GetAttribute("LastActivity")or"채집해서 병력을 키우고 다음 거점을 정복해"
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

render()
