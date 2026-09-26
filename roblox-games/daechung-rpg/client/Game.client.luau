-- 파일명: roblox-games/daechung-rpg/client/Game.client.luau
-- 대충 RPG 모바일 HUD: 마을 허브 + 포탈 사냥터 + 전투 UI
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 2
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
 local b=Instance.new("TextButton");b.Text=text;b.TextScaled=true;b.Font=Enum.Font.GothamBold;b.TextColor3=Color3.new(1,1,1);b.BackgroundColor3=color;b.Parent=parent;corner(b,11);stroke(b,.48);return b
end

local stats=Instance.new("Frame");
if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = stats
end
stats:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
stats:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))
stats.Name="RPGTopHUD";stats.Size=touchEnabled and UDim2.fromOffset(214,82)or UDim2.fromOffset(270,88);stats.Position=UDim2.fromOffset(8,8);stats.BackgroundColor3=Color3.fromRGB(25,28,35);stats.BackgroundTransparency=.1;stats.Parent=gui;corner(stats,13);stroke(stats,.5)
local title=Instance.new("TextLabel");title.Size=UDim2.new(1,-14,0,23);title.Position=UDim2.fromOffset(7,4);title.BackgroundTransparency=1;title.Text="대충 RPG";title.TextColor3=Color3.fromRGB(255,223,157);title.TextXAlignment=Enum.TextXAlignment.Left;title.Font=Enum.Font.GothamBold;title.TextSize=16;title.Parent=stats
local statLine=Instance.new("TextLabel");statLine.Size=UDim2.new(1,-14,0,38);statLine.Position=UDim2.fromOffset(7,27);statLine.BackgroundTransparency=1;statLine.TextColor3=Color3.fromRGB(230,234,241);statLine.TextXAlignment=Enum.TextXAlignment.Left;statLine.TextYAlignment=Enum.TextYAlignment.Top;statLine.TextWrapped=true;statLine.TextSize=12;statLine.Font=Enum.Font.Gotham;statLine.Parent=stats

local classBadge=Instance.new("TextLabel");classBadge.Name="ClassBadge";classBadge.Size=UDim2.new(1,-14,0,16);classBadge.Position=UDim2.fromOffset(7,64);classBadge.BackgroundTransparency=1;classBadge.TextColor3=Color3.fromRGB(190,207,255);classBadge.TextXAlignment=Enum.TextXAlignment.Left;classBadge.TextSize=11;classBadge.Font=Enum.Font.GothamBold;classBadge.Parent=stats

local objective=Instance.new("TextLabel");objective.Name="QuestObjective";objective.AnchorPoint=Vector2.new(.5,0);objective.Position=touchEnabled and UDim2.new(.5,0,0,96)or UDim2.new(.5,0,0,8);objective.Size=touchEnabled and UDim2.fromOffset(276,34)or UDim2.fromOffset(330,38);objective.BackgroundColor3=Color3.fromRGB(31,34,43);objective.BackgroundTransparency=.12;objective.TextColor3=Color3.fromRGB(255,220,146);objective.TextWrapped=true;objective.TextSize=13;objective.Font=Enum.Font.GothamBold;objective.Parent=gui;corner(objective,11);stroke(objective,.52)

local party=Instance.new("Frame");party.Name="PartyStatus";party.AnchorPoint=Vector2.new(1,0);party.Position=UDim2.new(1,-8,0,8);party.Size=touchEnabled and UDim2.fromOffset(116,58)or UDim2.fromOffset(142,64);party.BackgroundColor3=Color3.fromRGB(29,32,40);party.BackgroundTransparency=.1;party.Parent=gui;corner(party,12);stroke(party,.5)
local partyText=Instance.new("TextLabel");partyText.Size=UDim2.new(1,-12,1,-10);partyText.Position=UDim2.fromOffset(6,5);partyText.BackgroundTransparency=1;partyText.TextColor3=Color3.fromRGB(220,232,241);partyText.TextSize=11;partyText.TextWrapped=true;partyText.Font=Enum.Font.GothamBold;partyText.Parent=party

local combat=Instance.new("Frame");combat.Name="CombatDock";combat.AnchorPoint=Vector2.new(1,.5);combat.Position=UDim2.new(1,-12,.5,30);combat.Size=UDim2.fromOffset(62,232);combat.BackgroundTransparency=1;combat.Parent=gui
local attack=button(combat,"공격",Color3.fromRGB(166,65,55));attack.Size=UDim2.fromOffset(58,50);attack.Position=UDim2.fromOffset(2,0)
local skill=button(combat,"스킬",Color3.fromRGB(100,69,166));skill.Size=UDim2.fromOffset(58,50);skill.Position=UDim2.fromOffset(2,58)
local block=button(combat,"막기",Color3.fromRGB(74,102,151));block.Name="BlockParry";block.Size=UDim2.fromOffset(58,50);block.Position=UDim2.fromOffset(2,116)
local dodge=button(combat,"회피",Color3.fromRGB(54,115,139));dodge.Size=UDim2.fromOffset(58,50);dodge.Position=UDim2.fromOffset(2,174)
local combatTracks={}
local function playCombatAnimation(skillCast)
 local c=p.Character;local h=c and c:FindFirstChildOfClass("Humanoid");if not h then return end
 local animator=h:FindFirstChildOfClass("Animator")or Instance.new("Animator",h)
 local key=skillCast and"LUNGE"or"SLASH";local track=combatTracks[key]
 if not track or track.Parent==nil then
  local a=Instance.new("Animation");a.AnimationId=skillCast and"rbxassetid://522638767"or"rbxassetid://522635514"
  local ok,t=pcall(function()return animator:LoadAnimation(a)end);a:Destroy();if ok then track=t;combatTracks[key]=t end
 end
 if track then
  track.Priority=Enum.AnimationPriority.Action
  local classId=tostring(p:GetAttribute("ClassId")or"NONE");local speed=classId=="SHADOW"and 1.45 or classId=="BREAKER"and .82 or 1
  track:Play(.08,1,speed)
 end
end
local blockHeld=false
local function setBlock(on)
 if blockHeld==on then return end;blockHeld=on
 remote:FireServer(on and C.Actions.BLOCK_START or C.Actions.BLOCK_END)
end
attack.Activated:Connect(function()setBlock(false);playCombatAnimation(false);actionSfx:Play();remote:FireServer(C.Actions.ATTACK)end)
skill.Activated:Connect(function()setBlock(false);playCombatAnimation(true);skillSfx:Play();remote:FireServer(C.Actions.SKILL)end)
dodge.Activated:Connect(function()setBlock(false);remote:FireServer(C.Actions.DODGE)end)
block.InputBegan:Connect(function(input)
 if input.UserInputType==Enum.UserInputType.Touch or input.UserInputType==Enum.UserInputType.MouseButton1 then setBlock(true)end
end)
block.InputEnded:Connect(function(input)
 if input.UserInputType==Enum.UserInputType.Touch or input.UserInputType==Enum.UserInputType.MouseButton1 then setBlock(false)end
end)
UserInputService.InputBegan:Connect(function(input,processed)
 if not processed and input.KeyCode==Enum.KeyCode.F then setBlock(true)end
end)
UserInputService.InputEnded:Connect(function(input)
 if input.KeyCode==Enum.KeyCode.F then setBlock(false)end
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

local hint=Instance.new("TextLabel");hint.Name="WorldHint";hint.AnchorPoint=Vector2.new(0,1);hint.Position=UDim2.new(0,8,1,-10);hint.Size=touchEnabled and UDim2.fromOffset(170,32)or UDim2.fromOffset(220,34);hint.BackgroundColor3=Color3.fromRGB(25,28,35);hint.BackgroundTransparency=.3;hint.TextColor3=Color3.fromRGB(226,230,235);hint.TextSize=11;hint.Font=Enum.Font.Gotham;hint.TextWrapped=true;hint.Text="마을 포탈로 이동 · AI는 두 번 터치해 파티 초대";hint.Parent=gui;corner(hint,9)
if touchEnabled then task.delay(9,function()if hint.Parent then hint.Visible=false end end)end

local function zoneName(id)
 if id==0 then return"마을"end
 local z=C.Portals[id];return z and z.Name or"지역"
end
local function renderClassPanel()
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local adv=tostring(p:GetAttribute("AdvancementId")or"")
 local chooseStart=classId=="NONE";local chooseAdvance=classId~="NONE"and((p:GetAttribute("AdvancementTrialPassed")==true)or(p:GetAttribute("RespecReady")==true))
 classPanel.Visible=chooseStart or chooseAdvance
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
 statLine.Text=string.format("%s  HP %d/%d  공격 %d\n골드 %d · 무기 T%d · 방어구 T%d · 유물 %s%s",levelLabel,hp,maxHP,p:GetAttribute("AttackPower")or 10,p:GetAttribute("Gold")or 0,p:GetAttribute("WeaponTier")or 1,p:GetAttribute("ArmorTier")or 1,tostring(p:GetAttribute("RelicId")or"NONE"),mastery>0 and(" · 숙련 "..mastery)or"")
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
 if zone==1 then hint.Text="초원 RUN "..tostring(p:GetAttribute("CurrentRunSeed")or 0).." · 노랑=패링 / 빨강=회피"else hint.Text=zone==0 and"포탈 1~5 선택 · 보스 동료 두번 터치로 파티"or(zoneName(zone).." · 몹은 멀어지면 어그로 해제")end
 if classId=="BREAKER"then skill.Text="파쇄"elseif classId=="SHADOW"then skill.Text="그림자"elseif classId=="RUNE"then skill.Text="룬"elseif classId=="SOUL"then skill.Text="영혼"else skill.Text="스킬"end
 renderClassPanel()
end
for _,k in ipairs({"Level","XP","MaxHP","AttackPower","Gold","WeaponTier","ArmorTier","RelicId","MasteryLevel","SecondAdvancementId","CompanionUnlockCount","CurrentZone","QuestPortal","QuestKills","QuestNeed","LastAction","PartyCount","PartyKills","Contribution","PartyHuntActive","InCombat","RoomCode","ClassId","AdvancementId","AdvancementTrialActive","AdvancementTrialProgress","AdvancementTrialPassed","RespecReady","RuneElement","SoulCharge","Guard","Blocking","GuardBrokenUntil","ParryCount","CurrentRunSeed"})do p:GetAttributeChangedSignal(k):Connect(render)end
local function bindChar(c)combatTracks={};local h=c:WaitForChild("Humanoid");h.HealthChanged:Connect(render);render()end
if p.Character then task.defer(bindChar,p.Character)end;p.CharacterAdded:Connect(bindChar)
p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 local v=tostring(p:GetAttribute("FeedbackEvent")or"")
 if v:find("LEVEL_UP")then levelSfx:Play()elseif v:find("PARRY")then skillSfx:Play()elseif v:find("GUARD_BREAK")then hitSfx:Play()elseif v:find("ATTACK")or v:find("KILL")then hitSfx:Play()end
end)

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 if tonumber(snapshot.RoomCode)~=(p:GetAttribute("RoomCode")or 1)then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedSharedObjective",tonumber(snapshot.SharedObjective)or 0)
 render()
end)

QACamera.install(C,gui,function(anim) {
    anim: anim;
    gui: gui;
    C: C;
    return function(anim) {
        // 추가적인 로직 또는 기존 로직의 수정
        return anim;
    };
}
 local shots={{label="rpg-village",position=Vector3.new(0,120,170),lookAt=Vector3.new(0,2,0)}}
 for _,z in ipairs(C.Portals)do table.insert(shots,{label="rpg-portal-"..z.Id,position=z.Center+Vector3.new(0,95,150),lookAt=z.Center})end
 return shots
end)
render()
