local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local remote=RS:WaitForChild(C.RemoteName)

local gui=Instance.new("ScreenGui");gui.Name="MidnightTagHUD";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame");root.AnchorPoint=Vector2.new(.5,1);root.Position=UDim2.fromScale(.5,.98);root.Size=UDim2.new(1,-18,0,330);root.BackgroundTransparency=.08;root.Parent=gui
local status=Instance.new("TextLabel");status.Size=UDim2.new(1,-12,0,120);status.Position=UDim2.fromOffset(6,4);status.BackgroundTransparency=1;status.TextWrapped=true;status.TextScaled=true;status.Parent=root

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
 status.Text=string.format("%s | %s | %.0f초\n역할 %s · %s · %s\n생존 %d / 얼음 %d · XP %d · 코인 %d",
  C.GameName,round,p:GetAttribute("TimeLeft")or 0,role,p:GetAttribute("Frozen")==true and"얼음!"or"이동 가능",monsterName(),
  p:GetAttribute("AliveCount")or 0,p:GetAttribute("FrozenCount")or 0,p:GetAttribute("MonsterXP")or 0,p:GetAttribute("Coins")or 0)
 local running=round=="RUNNING"
 local showSetup=not running and not setupDismissed
 root.Size=UDim2.new(1,-18,0,(running or showSetup)and 330 or 132)
 root.BackgroundTransparency=(running or showSetup)and .08 or .35
 for _,x in ipairs(buttons)do
  if x.mode=="MONSTER"then x.button.Visible=running and role=="MONSTER"
  elseif x.mode=="SURVIVOR"then x.button.Visible=running and role=="SURVIVOR"
  else x.button.Visible=showSetup end
 end
end
for _,k in ipairs({"RoundState","TimeLeft","Role","Frozen","MonsterForm","MonsterXP","Coins","AliveCount","FrozenCount"})do p:GetAttributeChangedSignal(k):Connect(render)end
render()

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedRoundScore",tonumber(snapshot.RoundScore)or 0)
end)
