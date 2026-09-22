local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local remote=RS:WaitForChild(C.RemoteName)

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

local gui=Instance.new("ScreenGui");gui.Name="MidnightTagHUD";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame");root.AnchorPoint=Vector2.new(.5,1);root.Position=UDim2.fromScale(.5,.98);root.Size=UDim2.new(1,-18,0,330);root.BackgroundTransparency=.08;root.Parent=gui
local status=Instance.new("TextLabel");status.Size=UDim2.new(1,-12,0,120);status.Position=UDim2.fromOffset(6,4);status.BackgroundTransparency=1;status.TextWrapped=true;status.TextScaled=true;status.Parent=root
local chaseTint=Instance.new("Frame");chaseTint.Size=UDim2.fromScale(1,1);chaseTint.BackgroundColor3=Color3.fromRGB(120,8,18);chaseTint.BackgroundTransparency=1;chaseTint.BorderSizePixel=0;chaseTint.ZIndex=7;chaseTint.Parent=gui

local defs={
 {C.Actions.PREFER_MONSTER,"몬스터 선호","PREF"},{C.Actions.PREFER_SURVIVOR,"생존자 선호","PREF"},
 {C.Actions.SOLO_MONSTER,"1인 몬스터","SOLO"},{C.Actions.SOLO_SURVIVOR,"1인 생존자","SOLO"},
 {C.Actions.RESCUE,"친구 해동","SURVIVOR"},{C.Actions.DASH,"대시","SURVIVOR"},
 {C.Actions.ABILITY,"몬스터 스킬","MONSTER"},{C.Actions.NEXT_MONSTER,"몬스터 변경","PREF"}
}
local buttons={}
local setupDismissed=false
for i,a in ipairs(defs)do
 local b=Instance.new("TextButton");local c=(i-1)%4;local r=math.floor((i-1)/4)
 b.Size=UDim2.new(.235,0,0,72);b.Position=UDim2.new(.015+c*.247,0,0,132+r*82);b.Text=a[2];b.TextScaled=true;b.Parent=root
 b.Activated:Connect(function()
  actionSfx.TimePosition=0;actionSfx:Play()
  remote:FireServer(a[1])
  if a[3]=="PREF"or a[3]=="SOLO"then
   setupDismissed=true
   for _,x in ipairs(buttons)do if x.mode=="PREF"or x.mode=="SOLO"then x.button.Visible=false end end
   root.Size=UDim2.new(1,-18,0,132);root.BackgroundTransparency=.35
  end
 end);buttons[i]={button=b,mode=a[3]}
end
local function monsterName()
 local id=p:GetAttribute("MonsterForm")or"DRAK";for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f.Name end end;return"드라크"
end
local function render()
 local role=p:GetAttribute("Role")or"WAITING";local round=p:GetAttribute("RoundState")or"WAITING"
 status.Text=string.format("%s | %s | %.0f초\n%s · %s\n역할 %s · %s · %s\n생존 %d / 얼음 %d · XP %d · 코인 %d",
  C.GameName,round,p:GetAttribute("TimeLeft")or 0,p:GetAttribute("CurrentMap")or"맵 준비",p:GetAttribute("CurrentMapEvent")or"",
  role,p:GetAttribute("Frozen")==true and"얼음!"or"이동 가능",monsterName(),
  p:GetAttribute("AliveCount")or 0,p:GetAttribute("FrozenCount")or 0,p:GetAttribute("MonsterXP")or 0,p:GetAttribute("Coins")or 0)
 local running=round=="RUNNING"
 if running then
  if bgm.IsPlaying then bgm:Stop()end
  if not chase.IsPlaying then chase:Play()end
  chaseTint.BackgroundTransparency=role=="SURVIVOR" and .94 or .975
 else
  chaseTint.BackgroundTransparency=1
  if chase.IsPlaying then chase:Stop()end
  if round:find("^RESULT_")then
   if bgm.IsPlaying then bgm:Stop()end
   if round~=lastRoundState then resultSfx.TimePosition=0;resultSfx:Play()end
  elseif not bgm.IsPlaying then bgm:Play()end
 end
 local frozen=p:GetAttribute("Frozen")==true
 if frozen and not wasFrozen then warningSfx.TimePosition=0;warningSfx:Play()end
 wasFrozen=frozen
 lastRoundState=round
 local showSetup=not running and not setupDismissed
 root.Size=UDim2.new(1,-18,0,(running or showSetup)and 330 or 132)
 root.BackgroundTransparency=(running or showSetup)and .08 or .35
 for _,x in ipairs(buttons)do
  if x.mode=="MONSTER"then x.button.Visible=running and role=="MONSTER"
  elseif x.mode=="SURVIVOR"then x.button.Visible=running and role=="SURVIVOR"
  else x.button.Visible=showSetup end
 end
end
for _,k in ipairs({"RoundState","TimeLeft","Role","Frozen","MonsterForm","MonsterXP","Coins","AliveCount","FrozenCount","CurrentMap","CurrentMapEvent"})do p:GetAttributeChangedSignal(k):Connect(render)end

local function bindFootsteps(character)
 local humanoid=character:WaitForChild("Humanoid",5)
 if not humanoid then return end
 humanoid.Running:Connect(function(speed)
  if speed>4 and p:GetAttribute("RoundState")=="RUNNING"and p:GetAttribute("Frozen")~=true then
   local now=os.clock()
   if now-stepClock>.34 then stepClock=now;footstepSfx.TimePosition=0;footstepSfx.PlaybackSpeed=p:GetAttribute("Role")=="MONSTER"and .82 or 1.08;footstepSfx:Play()end
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
render()

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedRoundScore",tonumber(snapshot.RoundScore)or 0)
end)
