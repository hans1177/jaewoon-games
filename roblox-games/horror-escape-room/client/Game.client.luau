-- 파일명: roblox-games/horror-escape-room/client/Game.client.luau
-- roblox-games/horror-escape-room/client/Game.client.luau
-- 심야 술래잡기 모바일 추격 HUD / 상황별 행동 UI

-- 서비스
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local RunService=game:GetService("RunService")

-- 참조
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local QACamera=require(RS:WaitForChild("Shared"):WaitForChild("QACamera"))
local remote=RS:WaitForChild(C.RemoteName)

-- 사운드
local function makeSound(name,id,volume,looped)
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Looped=looped;s.Parent=SoundService;return s
end
local bgm=makeSound("MidnightBackground",C.Audio.Background,.11,true)
local chase=makeSound("MidnightChase",C.Audio.Chase,.14,true)
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
bgm:Play()

-- UI 공통
local gui=Instance.new("ScreenGui")
gui.Name="MidnightTagHUD"
gui.ResetOnSpawn=false
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets
gui.Parent=p:WaitForChild("PlayerGui")

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

local chaseTint=Instance.new("Frame")
chaseTint.Size=UDim2.fromScale(1,1)
chaseTint.BackgroundColor3=Color3.fromRGB(120,8,18)
chaseTint.BackgroundTransparency=1
chaseTint.BorderSizePixel=0
chaseTint.ZIndex=7
chaseTint.Parent=gui

-- 상단 HUD: 추격 중에도 최소 정보만 표시
local hud=Instance.new("Frame")
hud.Name="MidnightTopHUD"
hud.AnchorPoint=Vector2.new(.5,0)
hud.Position=UDim2.new(.5,0,0,8)
hud.Size=UDim2.fromOffset(330,62)
hud.BackgroundColor3=Color3.fromRGB(34,37,45)
hud.BackgroundTransparency=.03
hud.ZIndex=10
hud.Parent=gui
roundify(hud,14);outline(hud,.5)

local mapLine=Instance.new("TextLabel")
mapLine.Size=UDim2.new(.6,-8,0,18)
mapLine.Position=UDim2.fromOffset(8,3)
mapLine.BackgroundTransparency=1
mapLine.TextColor3=Color3.fromRGB(235,237,244)
mapLine.TextScaled=true
mapLine.Font=Enum.Font.GothamBold
mapLine.Parent=hud

local roleLine=Instance.new("TextLabel")
roleLine.Size=UDim2.new(1,-16,0,16)
roleLine.Position=UDim2.fromOffset(8,24)
roleLine.BackgroundTransparency=1
roleLine.TextColor3=Color3.fromRGB(236,240,248)
roleLine.TextScaled=false
roleLine.TextSize=11
roleLine.Font=Enum.Font.Gotham
roleLine.Parent=hud

local roundLine=Instance.new("TextLabel")
roundLine.Size=UDim2.new(.38,-8,0,38)
roundLine.Position=UDim2.new(.62,0,0,4)
roundLine.BackgroundColor3=Color3.fromRGB(46,49,61)
roundLine.BackgroundTransparency=.12
roundLine.TextColor3=Color3.fromRGB(255,203,121)
roundLine.TextScaled=false
roundLine.TextSize=13
roundLine.Font=Enum.Font.GothamBold
roundLine.Parent=hud
roundify(roundLine,9)

local objectiveLine=Instance.new("TextLabel")
objectiveLine.Name="ObjectiveProgress"
objectiveLine.Size=UDim2.new(1,-16,0,15)
objectiveLine.Position=UDim2.fromOffset(8,44)
objectiveLine.BackgroundTransparency=1
objectiveLine.TextColor3=Color3.fromRGB(177,238,203)
objectiveLine.TextSize=10
objectiveLine.Font=Enum.Font.GothamBold
objectiveLine.TextXAlignment=Enum.TextXAlignment.Left
objectiveLine.Parent=hud

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
ruleTitle.Text="심야 술래잡기 · 게임 방법"
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
survivorRule.Text="생존자  1 패널 4개 작동  →  2 얼은 친구 구조  →  3 탈출구로 탈출"
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
monsterRule.Text="괴물  생존자를 터치해 얼리고 전부 얼리면 승리"
monsterRule.ZIndex=11
monsterRule.Parent=ruleCard
roundify(monsterRule,8)

-- 로비 선택 패널
local setupPanel=Instance.new("Frame")
setupPanel.Name="RoleSetup"
setupPanel.AnchorPoint=Vector2.new(.5,.5)
setupPanel.Position=UDim2.fromScale(.5,.62)
setupPanel.Size=UDim2.fromOffset(286,164)
setupPanel.BackgroundColor3=Color3.fromRGB(25,27,35)
setupPanel.BackgroundTransparency=.04
setupPanel.ZIndex=10
setupPanel.Parent=gui
roundify(setupPanel,16);outline(setupPanel,.35)

local setupTitle=Instance.new("TextLabel")
setupTitle.Size=UDim2.new(1,-16,0,28)
setupTitle.Position=UDim2.fromOffset(8,8)
setupTitle.BackgroundTransparency=1
setupTitle.Text="이번 판 역할 선호"
setupTitle.TextColor3=Color3.fromRGB(255,255,255)
setupTitle.TextScaled=true
setupTitle.Font=Enum.Font.GothamBold
setupTitle.ZIndex=11
setupTitle.Parent=setupPanel

local setupChosen=false
local setupButtons={
 {C.Actions.PREFER_SURVIVOR,"생존자 선호",Color3.fromRGB(50,112,145)},
 {C.Actions.PREFER_MONSTER,"괴물 선호",Color3.fromRGB(145,48,59)},
 {C.Actions.SOLO_SURVIVOR,"1인 생존자",Color3.fromRGB(63,91,118)},
 {C.Actions.SOLO_MONSTER,"1인 괴물",Color3.fromRGB(112,48,65)},
}
for i,a in ipairs(setupButtons)do
 local b=makeButton(setupPanel,a[2],a[3])
 b.ZIndex=11
 local col=(i-1)%2
 local row=math.floor((i-1)/2)
 b.Size=UDim2.new(.465,0,0,46)
 b.Position=UDim2.new(.025+col*.485,0,0,41+row*52)
 b.Activated:Connect(function()
  actionSfx.TimePosition=0;actionSfx:Play()
  remote:FireServer(a[1])
  setupChosen=true
  setupPanel.Visible=false
 end)
end

local monsterCycle=makeButton(setupPanel,"괴물 변경",Color3.fromRGB(76,58,96))
monsterCycle.ZIndex=11
monsterCycle.Size=UDim2.new(.45,0,0,28)
monsterCycle.Position=UDim2.new(.275,0,1,-32)
monsterCycle.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.NEXT_MONSTER)end)

-- 라운드 행동 버튼: 역할에 따라 딱 필요한 버튼만 노출
local actionDock=Instance.new("Frame")
actionDock.Name="RoundActions"
actionDock.AnchorPoint=Vector2.new(.5,1)
actionDock.Position=UDim2.new(.5,0,1,-12)
actionDock.Size=UDim2.fromOffset(194,48)
actionDock.BackgroundTransparency=1
actionDock.ZIndex=10
actionDock.Parent=gui

local rescueButton=makeButton(actionDock,"친구 구출",Color3.fromRGB(42,126,151))
rescueButton.Size=UDim2.fromOffset(91,40);rescueButton.Position=UDim2.fromOffset(4,4);rescueButton.ZIndex=11
rescueButton.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.RESCUE)end)

local dashButton=makeButton(actionDock,"대시",Color3.fromRGB(58,94,146))
dashButton.Size=UDim2.fromOffset(91,40);dashButton.Position=UDim2.fromOffset(99,4);dashButton.ZIndex=11
dashButton.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.DASH)end)

local abilityButton=makeButton(actionDock,"괴물 스킬",Color3.fromRGB(157,49,65))
abilityButton.Size=UDim2.fromOffset(112,40);abilityButton.Position=UDim2.fromOffset(41,4);abilityButton.ZIndex=11
abilityButton.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.ABILITY)end)

local function monsterName()
 local id=p:GetAttribute("MonsterForm")or"DRACULA"
 for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f.Name end end
 return"드라큘라"
end

local function render()
 local role=p:GetAttribute("Role")or"WAITING"
 local round=p:GetAttribute("RoundState")or"WAITING"
 local running=round=="RUNNING"
 local frozen=p:GetAttribute("Frozen")==true
 local mapName=p:GetAttribute("CurrentMap")or"맵 준비"
 local eventName=p:GetAttribute("CurrentMapEvent")or""
 local seconds=math.max(0,math.floor((p:GetAttribute("TimeLeft")or 0)+.5))
 local mapId=tostring(workspace:GetAttribute("CurrentMapId")or"SCHOOL")
 drawMiniMap(mapId)
 miniTitle.Text="지도 · "..mapName
 mapPanel.Visible=running

 mapLine.Text=mapName..(eventName~=""and(" · "..eventName)or"")
 local roleText=role=="MONSTER"and"괴물"or role=="SURVIVOR"and"생존자"or"대기"
 roleLine.Text=string.format("%s · %s · 생존 %d / 얼음 %d",roleText,frozen and"얼음"or"정상",p:GetAttribute("AliveCount")or 0,p:GetAttribute("FrozenCount")or 0)
 local done=p:GetAttribute("ObjectivesDone")or 0;local total=p:GetAttribute("ObjectivesTotal")or C.ObjectiveCount
 if role=="MONSTER"then
  objectiveLine.Text="괴물 목표 · 생존자를 찾아 모두 얼려라"
 elseif frozen then
  objectiveLine.Text="얼음 상태 · 친구 구조를 기다려"
 elseif workspace:GetAttribute("EscapeUnlocked")==true then
  objectiveLine.Text="3단계 · 비상 탈출구로 이동"
 else
  objectiveLine.Text=string.format("1단계 · 패널 작동 %d/%d  |  얼은 친구는 구출",done,total)
 end
 roundLine.Text=running and(string.format("%d초",seconds))or round

 if round:find("^RESULT_") then setupChosen=false end
 setupPanel.Visible=not setupChosen and not running and not round:find("^RESULT_")
 ruleCard.Visible=setupPanel.Visible
 actionDock.Visible=running
 mapPanel.Visible=running
 rescueButton.Visible=running and role=="SURVIVOR"and not frozen
 dashButton.Visible=running and role=="SURVIVOR"and not frozen
 abilityButton.Visible=running and role=="MONSTER"

 if running then
  -- 라운드 시작 자체는 추격이 아니다. 평상시엔 가벼운 서스펜스만 유지한다.
  if not bgm.IsPlaying then bgm:Play()end
  chaseTint.BackgroundTransparency=1
 else
  chaseTint.BackgroundTransparency=1
  if chase.IsPlaying then chase:Stop()end
  if round:find("^RESULT_")then
   if bgm.IsPlaying then bgm:Stop()end
   if round~=lastRoundState then resultSfx.TimePosition=0;resultSfx:Play()end
  elseif not bgm.IsPlaying then bgm:Play()end
 end

 if frozen and not wasFrozen then warningSfx.TimePosition=0;warningSfx:Play()end
 wasFrozen=frozen
 lastRoundState=round
end

for _,k in ipairs({"RoundState","TimeLeft","Role","Frozen","MonsterForm","MonsterXP","Coins","AliveCount","FrozenCount","CurrentMap","CurrentMapEvent","ObjectivesDone","ObjectivesTotal","Escaped"})do
 p:GetAttributeChangedSignal(k):Connect(render)
end

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
 local ai=arena and arena:FindFirstChild("AI_MONSTER",true)
 if ai and ai:IsA("BasePart")then best=math.min(best,(ai.Position-root.Position).Magnitude)end
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

p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 local value=tostring(p:GetAttribute("FeedbackEvent")or"")
 if value:find("^FREEZE:")then freezeSfx.TimePosition=0;freezeSfx:Play();chaseTint.BackgroundTransparency=.78
 elseif value:find("^RESCUE:")then rescueSfx.TimePosition=0;rescueSfx:Play();chaseTint.BackgroundTransparency=.9
 elseif value:find("^RESULT:")then resultSfx.TimePosition=0;resultSfx:Play()end
end)

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedRoundScore",tonumber(snapshot.RoundScore)or 0)
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


render()
