local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local remote=RS:WaitForChild(C.RemoteName)
local function sound(name,id,volume,looped)
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Looped=looped;s.Parent=SoundService;return s
end
local bgm=sound("RPGBackground",C.Audio.Background,.17,true)
local battleSfx=sound("RPGBattle",C.Audio.Battle,.18,false)
local actionSfx=sound("RPGAction",C.Audio.Action,.3,false)
local victorySfx=sound("RPGVictory",C.Audio.Victory,.32,false)
local lastBosses=p:GetAttribute("BossesDefeated")or 0
bgm:Play()

local gui=Instance.new("ScreenGui");gui.Name="DaechungRPGHUD";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame");root.AnchorPoint=Vector2.new(.5,1);root.Position=UDim2.fromScale(.5,.98);root.Size=UDim2.new(1,-18,0,360);root.BackgroundTransparency=.08;root.Parent=gui
local status=Instance.new("TextLabel");status.Size=UDim2.new(1,-12,0,140);status.Position=UDim2.fromOffset(6,4);status.BackgroundTransparency=1;status.TextWrapped=true;status.TextScaled=true;status.Parent=root
local note=Instance.new("TextLabel");note.Size=UDim2.new(1,-12,0,44);note.Position=UDim2.fromOffset(6,142);note.BackgroundTransparency=1;note.TextWrapped=true;note.TextScaled=true;note.Parent=root

local A={{C.Actions.ATTACK,"공격"},{C.Actions.SKILL,"스킬"},{C.Actions.DODGE,"회피"},{C.Actions.NEXT_CLASS,"직업"},{C.Actions.NEXT_AI,"AI성향"},{C.Actions.NEXT_RELIC,"장비효과"},{C.Actions.UPGRADE_WEAPON,"무기강화"}}
for i,a in ipairs(A)do
 local b=Instance.new("TextButton");local c=(i-1)%4;local r=math.floor((i-1)/4)
 b.Size=UDim2.new(.235,0,0,70);b.Position=UDim2.new(.015+c*.247,0,0,196+r*78);b.Text=a[2];b.TextScaled=true;b.Parent=root
 b.Activated:Connect(function()
  if a[1]==C.Actions.ATTACK or a[1]==C.Actions.SKILL or a[1]==C.Actions.DODGE then actionSfx.TimePosition=0;actionSfx:Play()end
  if a[1]==C.Actions.SKILL then battleSfx.TimePosition=0;battleSfx:Play()end
  remote:FireServer(a[1])
 end)
end
local function className()
 local id=p:GetAttribute("ClassId")or"BREAKER";for _,x in ipairs(C.Classes)do if x.Id==id then return x.Name end end;return id
end
local function companionNames()
 local t={};for _,x in ipairs(C.Companions)do if p:GetAttribute("Companion_"..x.Id)==true then table.insert(t,x.Name)end end
 return #t>0 and table.concat(t,", ")or"아직 없음"
end
local function render()
 status.Text=string.format("4인 파티 RPG | %s\nLv.%d XP%d 골드%d 무기T%d | 파티 %d/4\n동료: %s\nAI:%s · 장비:%s · 기억%d · 처치%d",
  className(),p:GetAttribute("Level")or 1,p:GetAttribute("XP")or 0,p:GetAttribute("Gold")or 0,p:GetAttribute("WeaponTier")or 1,p:GetAttribute("PartySize")or 1,
  companionNames(),p:GetAttribute("AIStyle")or"PROTECT",p:GetAttribute("Relic")or"FURY",p:GetAttribute("PartyMemory")or 0,p:GetAttribute("Kills")or 0)
 note.Text=p:GetAttribute("LastAction")or"이장에게 가서 첫 동료를 만나."
 local bosses=p:GetAttribute("BossesDefeated")or 0
 if bosses>lastBosses then victorySfx.TimePosition=0;victorySfx:Play()end
 lastBosses=bosses
end
local keys={"ClassId","Level","XP","Gold","WeaponTier","AIStyle","Relic","PartyMemory","Kills","PartySize","LastAction","BossesDefeated"}
for _,x in ipairs(C.Companions)do table.insert(keys,"Companion_"..x.Id)end
for _,k in ipairs(keys)do p:GetAttributeChangedSignal(k):Connect(render)end
render()

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedSharedObjective",tonumber(snapshot.SharedObjective)or 0)
end)
