-- 파일명: roblox-games/daechung-rpg/client/Game.client.luau
-- 대충 RPG 모바일 HUD: 마을 허브 + 포탈 사냥터 + 전투 UI
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local QACamera=require(RS:WaitForChild("Shared"):WaitForChild("QACamera"))
local remote=RS:WaitForChild(C.RemoteName)

local function sound(name,id,volume) local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Parent=SoundService;return s end
 local s=Instance.new("Sound");s.Name=name;s.SoundId=id;s.Volume=volume;s.Parent=SoundService;return s
end
local actionSfx=sound("RPGAction",C.Audio.Action,.22)
local hitSfx=sound("RPGHit",C.Audio.Hit,.2)
local skillSfx=sound("RPGSkill",C.Audio.Skill,.24)
local levelSfx=sound("RPGLevel",C.Audio.LevelUp,.26)

local gui=Instance.new("ScreenGui");gui.Name="RPGHUD";gui.ResetOnSpawn=false;gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets;gui:SetAttribute("TouchEnabled",touchEnabled);gui.Parent=p:WaitForChild("PlayerGui")
local function corner(x,r)local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r or 10);c.Parent=x end
local function stroke(x,t)local s=Instance.new("UIStroke");s.Thickness=1.3;s.Transparency=t or .5;s.Parent=x end
local function button(parent,text,color)
 local b=Instance.new("TextButton");b.Text=text;b.TextScaled=true;b.Font=Enum.Font.GothamBold;b.TextColor3=Color3.new(1,1,1);b.BackgroundColor3=color;b.Parent=parent;corner(b,11);stroke(b,.48);return b
end

local stats=Instance.new("Frame");stats.Name="RPGTopHUD";stats.Size=touchEnabled and UDim2.fromOffset(200,64)or UDim2.fromOffset(254,72);stats.Position=UDim2.fromOffset(8,8);stats.BackgroundColor3=Color3.fromRGB(25,28,35);stats.BackgroundTransparency=.1;stats.Parent=gui;corner(stats,13);stroke(stats,.5)
local title=Instance.new("TextLabel");title.Size=UDim2.new(1,-14,0,23);title.Position=UDim2.fromOffset(7,4);title.BackgroundTransparency=1;title.Text="대충 RPG";title.TextColor3=Color3.fromRGB(255,223,157);title.TextXAlignment=Enum.TextXAlignment.Left;title.Font=Enum.Font.GothamBold;title.TextSize=16;title.Parent=stats
local statLine=Instance.new("TextLabel");statLine.Size=UDim2.new(1,-14,0,39);statLine.Position=UDim2.fromOffset(7,27);statLine.BackgroundTransparency=1;statLine.TextColor3=Color3.fromRGB(230,234,241);statLine.TextXAlignment=Enum.TextXAlignment.Left;statLine.TextYAlignment=Enum.TextYAlignment.Top;statLine.TextWrapped=true;statLine.TextSize=12;statLine.Font=Enum.Font.Gotham;statLine.Parent=stats

local objective=Instance.new("TextLabel");objective.Name="QuestObjective";objective.AnchorPoint=Vector2.new(.5,0);objective.Position=touchEnabled and UDim2.new(.5,0,0,78)or UDim2.new(.5,0,0,8);objective.Size=touchEnabled and UDim2.fromOffset(276,34)or UDim2.fromOffset(330,38);objective.BackgroundColor3=Color3.fromRGB(31,34,43);objective.BackgroundTransparency=.12;objective.TextColor3=Color3.fromRGB(255,220,146);objective.TextWrapped=true;objective.TextSize=13;objective.Font=Enum.Font.GothamBold;objective.Parent=gui;corner(objective,11);stroke(objective,.52)

local party=Instance.new("Frame");party.Name="PartyStatus";party.AnchorPoint=Vector2.new(1,0);party.Position=UDim2.new(1,-8,0,8);party.Size=touchEnabled and UDim2.fromOffset(116,58)or UDim2.fromOffset(142,64);party.BackgroundColor3=Color3.fromRGB(29,32,40);party.BackgroundTransparency=.1;party.Parent=gui;corner(party,12);stroke(party,.5)
local partyText=Instance.new("TextLabel");partyText.Size=UDim2.new(1,-12,1,-10);partyText.Position=UDim2.fromOffset(6,5);partyText.BackgroundTransparency=1;partyText.TextColor3=Color3.fromRGB(220,232,241);partyText.TextSize=11;partyText.TextWrapped=true;partyText.Font=Enum.Font.GothamBold;partyText.Parent=party

local combat=Instance.new("Frame");combat.Name="CombatDock";combat.AnchorPoint=Vector2.new(1,.5);combat.Position=UDim2.new(1,-12,.5,30);combat.Size=UDim2.fromOffset(62,174);combat.BackgroundTransparency=1;combat.Parent=gui
local attack=button(combat,"공격",Color3.fromRGB(166,65,55));attack.Size=UDim2.fromOffset(58,50);attack.Position=UDim2.fromOffset(2,0)
local skill=button(combat,"스킬",Color3.fromRGB(100,69,166));skill.Size=UDim2.fromOffset(58,50);skill.Position=UDim2.fromOffset(2,58)
local dodge=button(combat,"회피",Color3.fromRGB(54,115,139));dodge.Size=UDim2.fromOffset(58,50);dodge.Position=UDim2.fromOffset(2,116)
attack.Activated:Connect(function()actionSfx:Play();remote:FireServer(C.Actions.ATTACK)end)
skill.Activated:Connect(function()skillSfx:Play();remote:FireServer(C.Actions.SKILL)end)
dodge.Activated:Connect(function()remote:FireServer(C.Actions.DODGE)end)

local returnButton=button(gui,"마을 귀환",Color3.fromRGB(61,111,86));returnButton.Name="ReturnVillage";returnButton.AnchorPoint=Vector2.new(.5,1);returnButton.Position=UDim2.new(.5,0,1,-10);returnButton.Size=UDim2.fromOffset(116,36)
returnButton.Activated:Connect(function()remote:FireServer(C.Actions.RETURN_VILLAGE)end)

local multi=button(gui,"멀티 코드 1",Color3.fromRGB(55,76,119));multi.Name="MultiplayerCode";multi.AnchorPoint=touchEnabled and Vector2.new(1,1)or Vector2.new(1,0);multi.Position=touchEnabled and UDim2.new(1,-8,1,-10)or UDim2.new(1,-8,0,80);multi.Size=UDim2.fromOffset(112,32)
multi.Activated:Connect(function()remote:FireServer(C.Actions.NEXT_ROOM_CODE)end)

local hint=Instance.new("TextLabel");hint.Name="WorldHint";hint.AnchorPoint=Vector2.new(0,1);hint.Position=UDim2.new(0,8,1,-10);hint.Size=touchEnabled and UDim2.fromOffset(170,32)or UDim2.fromOffset(220,34);hint.BackgroundColor3=Color3.fromRGB(25,28,35);hint.BackgroundTransparency=.3;hint.TextColor3=Color3.fromRGB(226,230,235);hint.TextSize=11;hint.Font=Enum.Font.Gotham;hint.TextWrapped=true;hint.Text="마을 포탈로 이동 · AI는 두 번 터치해 파티 초대";hint.Parent=gui;corner(hint,9)
if touchEnabled then task.delay(9,function()if hint.Parent then hint.Visible=false end end)end

local function zoneName(id)
 if id==0 then return"마을"end
 local z=C.Portals[id];return z and z.Name or"지역"
end
local function render()
 local level=p:GetAttribute("Level")or 1
 local xp=p:GetAttribute("XP")or 0
 local hp=0;local maxHP=p:GetAttribute("MaxHP")or 100
 local h=p.Character and p.Character:FindFirstChildOfClass("Humanoid");if h then hp=math.floor(h.Health)end
 statLine.Text=string.format("Lv.%d  HP %d/%d  공격 %d
골드 %d · 무기 T%d · 방어구 T%d",level,hp,maxHP,p:GetAttribute("AttackPower")or 10,p:GetAttribute("Gold")or 0,p:GetAttribute("WeaponTier")or 1,p:GetAttribute("ArmorTier")or 1)
 local zone=p:GetAttribute("CurrentZone")or 0
 local qp=p:GetAttribute("QuestPortal")or 0
 local qk=p:GetAttribute("QuestKills")or 0
 local qn=p:GetAttribute("QuestNeed")or 0
 if qp>0 then objective.Text=string.format("퀘스트 · %s 몬스터 %d/%d",zoneName(qp),qk,qn)else objective.Text=(p:GetAttribute("LastAction")or"마을 이장에게 퀘스트를 받아.")end
 local pc=p:GetAttribute("PartyCount")or 0
 local pk=p:GetAttribute("PartyKills")or 0
 local contrib=p:GetAttribute("Contribution")or 0
 partyText.Text=(p:GetAttribute("PartyHuntActive")==true)and string.format("파티 %d/4
사냥 %d/%d · 기여 %d",pc+1,pk,C.PartyHuntTarget,contrib)or string.format("파티 %d/4
AI 두번 터치",pc+1)
 local combatLocked=p:GetAttribute("InCombat")==true
 returnButton.Visible=zone>0
 returnButton.Text=combatLocked and"전투 중 귀환 불가"or"마을 귀환"
 returnButton.BackgroundColor3=combatLocked and Color3.fromRGB(104,65,65)or Color3.fromRGB(61,111,86)
 multi.Text="멀티 코드 "..tostring(p:GetAttribute("RoomCode")or 1)
 hint.Text=zone==0 and"포탈 1~5 선택 · AI 두번 터치로 파티"or(zoneName(zone).." · 몹은 멀어지면 어그로 해제")
end
for _,k in ipairs({"Level","XP","MaxHP","AttackPower","Gold","WeaponTier","ArmorTier","CurrentZone","QuestPortal","QuestKills","QuestNeed","LastAction","PartyCount","PartyKills","Contribution","PartyHuntActive","InCombat","RoomCode"})do p:GetAttributeChangedSignal(k):Connect(render)end
local function bindChar(c)local h=c:WaitForChild("Humanoid");h.HealthChanged:Connect(render);render()end
if p.Character then task.defer(bindChar,p.Character)end;p.CharacterAdded:Connect(bindChar)
p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 local v=tostring(p:GetAttribute("FeedbackEvent")or"")
 if v:find("LEVEL_UP")then levelSfx:Play()elseif v:find("ATTACK")or v:find("KILL")then hitSfx:Play()end
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
