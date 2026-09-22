-- roblox-games/horror-escape-room/client/Game.client.luau
-- 심야 술래잡기 모바일 추격 HUD / 상황별 행동 UI

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
local function makeSound(name,id,volume,looped)
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Looped=looped;s.Parent=SoundService;return s
end
local bgm=makeSound("MidnightBackground",C.Audio.Background,.18,true)
local chase=makeSound("MidnightChase",C.Audio.Chase,.22,true)
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
hud.Size=UDim2.new(1,-16,0,110)
hud.BackgroundColor3=Color3.fromRGB(22,24,31)
hud.BackgroundTransparency=.12
hud.ZIndex=10
hud.Parent=gui
roundify(hud,14);outline(hud,.5)

local mapLine=Instance.new("TextLabel")
mapLine.Size=UDim2.new(1,-16,0,35)
mapLine.Position=UDim2.fromOffset(8,5)
mapLine.BackgroundTransparency=1
mapLine.TextColor3=Color3.fromRGB(235,237,244)
mapLine.TextScaled=true
mapLine.Font=Enum.Font.GothamBold
mapLine.Parent=hud

local roleLine=Instance.new("TextLabel")
roleLine.Size=UDim2.new(1,-16,0,31)
roleLine.Position=UDim2.fromOffset(8,41)
roleLine.BackgroundTransparency=1
roleLine.TextColor3=Color3.fromRGB(212,218,230)
roleLine.TextScaled=true
roleLine.Font=Enum.Font.Gotham
roleLine.Parent=hud

local roundLine=Instance.new("TextLabel")
roundLine.Size=UDim2.new(1,-16,0,29)
roundLine.Position=UDim2.fromOffset(8,75)
roundLine.BackgroundColor3=Color3.fromRGB(46,49,61)
roundLine.BackgroundTransparency=.12
roundLine.TextColor3=Color3.fromRGB(255,203,121)
roundLine.TextScaled=true
roundLine.Font=Enum.Font.GothamBold
roundLine.Parent=hud
roundify(roundLine,9)

-- 로비 선택 패널
local setupPanel=Instance.new("Frame")
setupPanel.Name="RoleSetup"
setupPanel.AnchorPoint=Vector2.new(.5,.5)
setupPanel.Position=UDim2.fromScale(.5,.56)
setupPanel.Size=UDim2.new(1,-32,0,230)
setupPanel.BackgroundColor3=Color3.fromRGB(25,27,35)
setupPanel.BackgroundTransparency=.04
setupPanel.ZIndex=10
setupPanel.Parent=gui
roundify(setupPanel,16);outline(setupPanel,.35)

local setupTitle=Instance.new("TextLabel")
setupTitle.Size=UDim2.new(1,-16,0,38)
setupTitle.Position=UDim2.fromOffset(8,8)
setupTitle.BackgroundTransparency=1
setupTitle.Text="이번 판 역할 선호"
setupTitle.TextColor3=Color3.fromRGB(255,255,255)
setupTitle.TextScaled=true
setupTitle.Font=Enum.Font.GothamBold
setupTitle.ZIndex=11
setupTitle.Parent=setupPanel

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
 b.Size=UDim2.new(.465,0,0,65)
 b.Position=UDim2.new(.025+col*.485,0,0,53+row*73)
 b.Activated:Connect(function()
  actionSfx.TimePosition=0;actionSfx:Play()
  remote:FireServer(a[1])
  setupPanel.Visible=false
 end)
end

local monsterCycle=makeButton(setupPanel,"괴물 변경",Color3.fromRGB(76,58,96))
monsterCycle.ZIndex=11
monsterCycle.Size=UDim2.new(.45,0,0,34)
monsterCycle.Position=UDim2.new(.275,0,1,-39)
monsterCycle.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.NEXT_MONSTER)end)

-- 라운드 행동 버튼: 역할에 따라 딱 필요한 버튼만 노출
local actionDock=Instance.new("Frame")
actionDock.Name="RoundActions"
actionDock.AnchorPoint=Vector2.new(.5,1)
actionDock.Position=UDim2.new(.5,0,1,-12)
actionDock.Size=UDim2.new(1,-28,0,88)
actionDock.BackgroundTransparency=1
actionDock.ZIndex=10
actionDock.Parent=gui

local rescueButton=makeButton(actionDock,"친구 구출",Color3.fromRGB(42,126,151))
rescueButton.Size=UDim2.new(.48,0,0,76);rescueButton.Position=UDim2.new(.01,0,0,6);rescueButton.ZIndex=11
rescueButton.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.RESCUE)end)

local dashButton=makeButton(actionDock,"대시",Color3.fromRGB(58,94,146))
dashButton.Size=UDim2.new(.48,0,0,76);dashButton.Position=UDim2.new(.51,0,0,6);dashButton.ZIndex=11
dashButton.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.DASH)end)

local abilityButton=makeButton(actionDock,"괴물 스킬",Color3.fromRGB(157,49,65))
abilityButton.Size=UDim2.new(.7,0,0,76);abilityButton.Position=UDim2.new(.15,0,0,6);abilityButton.ZIndex=11
abilityButton.Activated:Connect(function()actionSfx.TimePosition=0;actionSfx:Play();remote:FireServer(C.Actions.ABILITY)end)

local function monsterName()
 local id=p:GetAttribute("MonsterForm")or"DRAK"
 for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f.Name end end
 return"드라크"
end

local function render()
 local role=p:GetAttribute("Role")or"WAITING"
 local round=p:GetAttribute("RoundState")or"WAITING"
 local running=round=="RUNNING"
 local frozen=p:GetAttribute("Frozen")==true
 local mapName=p:GetAttribute("CurrentMap")or"맵 준비"
 local eventName=p:GetAttribute("CurrentMapEvent")or""
 local seconds=math.max(0,math.floor((p:GetAttribute("TimeLeft")or 0)+.5))

 mapLine.Text=mapName..(eventName~=""and(" · "..eventName)or"")
 roleLine.Text=string.format("%s · %s · 괴물 %s · 생존 %d / 얼음 %d",role,frozen and"얼음 상태"or"이동 가능",monsterName(),p:GetAttribute("AliveCount")or 0,p:GetAttribute("FrozenCount")or 0)
 roundLine.Text=running and(string.format("남은 시간 %d초 · XP %d · 코인 %d",seconds,p:GetAttribute("MonsterXP")or 0,p:GetAttribute("Coins")or 0))or round

 setupPanel.Visible=not running and not round:find("^RESULT_")
 actionDock.Visible=running
 rescueButton.Visible=running and role=="SURVIVOR"and not frozen
 dashButton.Visible=running and role=="SURVIVOR"and not frozen
 abilityButton.Visible=running and role=="MONSTER"

 if running then
  if bgm.IsPlaying then bgm:Stop()end
  if not chase.IsPlaying then chase:Play()end
  chaseTint.BackgroundTransparency=role=="SURVIVOR"and .94 or .975
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

for _,k in ipairs({"RoundState","TimeLeft","Role","Frozen","MonsterForm","MonsterXP","Coins","AliveCount","FrozenCount","CurrentMap","CurrentMapEvent"})do
 p:GetAttributeChangedSignal(k):Connect(render)
end

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

render()
