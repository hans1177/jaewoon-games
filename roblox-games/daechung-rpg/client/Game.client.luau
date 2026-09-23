-- 파일명: roblox-games/daechung-rpg/client/Game.client.luau
-- 대충 RPG 모바일 HUD: 마을 허브 + 포탈 사냥터 + 전투 UI
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local TweenService=game:GetService("TweenService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
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
 local b=Instance.new("TextButton");b.Text=text;b.TextScaled=false;b.TextSize=14;b.TextWrapped=true;b.Font=Enum.Font.GothamBold;b.TextColor3=Color3.new(1,1,1);b.BackgroundColor3=color;b.AutoButtonColor=true;b.Parent=parent;corner(b,12);stroke(b,.55);return b
end
local function bar(parent,name,pos,size,backColor,fillColor)
 local back=Instance.new("Frame");back.Name=name.."Back";back.Position=pos;back.Size=size;back.BackgroundColor3=backColor;back.BorderSizePixel=0;back.Parent=parent;corner(back,99)
 local fill=Instance.new("Frame");fill.Name=name;fill.Size=UDim2.fromScale(1,1);fill.BackgroundColor3=fillColor;fill.BorderSizePixel=0;fill.Parent=back;corner(fill,99)
 return fill
end

-- Compact mobile HUD: status stays in corners, objectives only appear when active,
-- and transient messages use a toast instead of covering the center of the screen.
local stats=Instance.new("Frame");stats.Name="RPGTopHUD";stats.Size=touchEnabled and UDim2.fromOffset(196,78)or UDim2.fromOffset(248,82);stats.Position=UDim2.fromOffset(10,10);stats.BackgroundColor3=Color3.fromRGB(18,21,27);stats.BackgroundTransparency=.14;stats.Parent=gui;corner(stats,14);stroke(stats,.58)
local title=Instance.new("TextLabel");title.Size=UDim2.new(1,-16,0,20);title.Position=UDim2.fromOffset(8,5);title.BackgroundTransparency=1;title.Text="대충 RPG";title.TextColor3=Color3.fromRGB(255,225,164);title.TextXAlignment=Enum.TextXAlignment.Left;title.Font=Enum.Font.GothamBold;title.TextSize=14;title.Parent=stats
local statLine=Instance.new("TextLabel");statLine.Size=UDim2.new(1,-16,0,27);statLine.Position=UDim2.fromOffset(8,25);statLine.BackgroundTransparency=1;statLine.TextColor3=Color3.fromRGB(228,232,239);statLine.TextXAlignment=Enum.TextXAlignment.Left;statLine.TextYAlignment=Enum.TextYAlignment.Top;statLine.TextWrapped=true;statLine.TextSize=10;statLine.Font=Enum.Font.Gotham;statLine.Parent=stats
local hpFill=bar(stats,"HP",UDim2.fromOffset(8,54),UDim2.new(1,-16,0,6),Color3.fromRGB(54,57,64),Color3.fromRGB(200,78,72))
local xpFill=bar(stats,"XP",UDim2.fromOffset(8,64),UDim2.new(1,-16,0,4),Color3.fromRGB(48,51,59),Color3.fromRGB(221,184,85))
local classBadge=Instance.new("TextLabel");classBadge.Name="ClassBadge";classBadge.Size=UDim2.new(1,-16,0,10);classBadge.Position=UDim2.fromOffset(8,68);classBadge.BackgroundTransparency=1;classBadge.TextColor3=Color3.fromRGB(185,205,255);classBadge.TextXAlignment=Enum.TextXAlignment.Left;classBadge.TextSize=9;classBadge.Font=Enum.Font.GothamBold;classBadge.Parent=stats

local objective=Instance.new("TextLabel");objective.Name="QuestObjective";objective.AnchorPoint=Vector2.new(.5,0);objective.Position=UDim2.new(.5,0,0,14);objective.Size=touchEnabled and UDim2.fromOffset(250,30)or UDim2.fromOffset(310,32);objective.BackgroundColor3=Color3.fromRGB(24,27,34);objective.BackgroundTransparency=.15;objective.TextColor3=Color3.fromRGB(255,220,146);objective.TextWrapped=true;objective.TextSize=12;objective.Font=Enum.Font.GothamBold;objective.Visible=false;objective.Parent=gui;corner(objective,10);stroke(objective,.58)

local toast=Instance.new("TextLabel");toast.Name="ActionToast";toast.AnchorPoint=Vector2.new(.5,1);toast.Position=UDim2.new(.5,0,1,-58);toast.Size=touchEnabled and UDim2.fromOffset(260,32)or UDim2.fromOffset(330,34);toast.BackgroundColor3=Color3.fromRGB(26,28,35);toast.BackgroundTransparency=.12;toast.TextColor3=Color3.fromRGB(242,238,226);toast.TextWrapped=true;toast.TextSize=11;toast.Font=Enum.Font.GothamBold;toast.Visible=false;toast.Parent=gui;corner(toast,10);stroke(toast,.6)
local toastToken=0
local function showToast(text)
 if not text or text==""then return end
 toastToken+=1;local token=toastToken;toast.Text=text;toast.Visible=true;toast.TextTransparency=0;toast.BackgroundTransparency=.12
 task.delay(2.25,function()
  if token~=toastToken or not toast.Parent then return end
  TweenService:Create(toast,TweenInfo.new(.22),{TextTransparency=1,BackgroundTransparency=1}):Play()
  task.wait(.24);if token==toastToken and toast.Parent then toast.Visible=false end
 end)
end

local party=Instance.new("Frame");party.Name="PartyStatus";party.AnchorPoint=Vector2.new(1,0);party.Position=UDim2.new(1,-10,0,10);party.Size=touchEnabled and UDim2.fromOffset(108,46)or UDim2.fromOffset(126,50);party.BackgroundColor3=Color3.fromRGB(20,23,29);party.BackgroundTransparency=.14;party.Parent=gui;corner(party,12);stroke(party,.58)
local partyText=Instance.new("TextLabel");partyText.Size=UDim2.new(1,-10,1,-8);partyText.Position=UDim2.fromOffset(5,4);partyText.BackgroundTransparency=1;partyText.TextColor3=Color3.fromRGB(220,230,238);partyText.TextSize=10;partyText.TextWrapped=true;partyText.Font=Enum.Font.GothamBold;partyText.Parent=party

local combat=Instance.new("Frame");combat.Name="CombatDock";combat.AnchorPoint=Vector2.new(1,1);combat.Position=UDim2.new(1,-12,1,-74);combat.Size=UDim2.fromOffset(116,116);combat.BackgroundTransparency=1;combat.Parent=gui
local attack=button(combat,"공격",Color3.fromRGB(162,67,57));attack.Size=UDim2.fromOffset(54,54);attack.Position=UDim2.fromOffset(0,0)
local skill=button(combat,"스킬",Color3.fromRGB(94,70,153));skill.Size=UDim2.fromOffset(54,54);skill.Position=UDim2.fromOffset(62,0)
local block=button(combat,"막기",Color3.fromRGB(68,97,142));block.Name="BlockParry";block.Size=UDim2.fromOffset(54,54);block.Position=UDim2.fromOffset(0,62)
local dodge=button(combat,"회피",Color3.fromRGB(51,108,128));dodge.Size=UDim2.fromOffset(54,54);dodge.Position=UDim2.fromOffset(62,62)
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

local returnButton=button(gui,"마을 귀환",Color3.fromRGB(61,111,86));returnButton.Name="ReturnVillage";returnButton.AnchorPoint=Vector2.new(.5,1);returnButton.Position=UDim2.new(.5,0,1,-12);returnButton.Size=UDim2.fromOffset(104,32);returnButton.TextSize=12
returnButton.Activated:Connect(function()remote:FireServer(C.Actions.RETURN_VILLAGE)end)

local multi=button(gui,"방 1",Color3.fromRGB(49,67,103));multi.Name="MultiplayerCode";multi.AnchorPoint=Vector2.new(1,0);multi.Position=UDim2.new(1,-10,0,62);multi.Size=UDim2.fromOffset(74,28);multi.TextSize=11
multi.Activated:Connect(function()remote:FireServer(C.Actions.NEXT_ROOM_CODE)end)

local hint=Instance.new("TextLabel");hint.Name="WorldHint";hint.AnchorPoint=Vector2.new(0,1);hint.Position=UDim2.new(0,10,1,-10);hint.Size=touchEnabled and UDim2.fromOffset(150,27)or UDim2.fromOffset(205,29);hint.BackgroundColor3=Color3.fromRGB(22,25,31);hint.BackgroundTransparency=.26;hint.TextColor3=Color3.fromRGB(221,226,232);hint.TextSize=10;hint.Font=Enum.Font.Gotham;hint.TextWrapped=true;hint.Text="포탈 입장 · 보스 동료는 마을에서 편성";hint.Parent=gui;corner(hint,9)
if touchEnabled then task.delay(7,function()if hint.Parent then hint.Visible=false end end)end

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
 statLine.Text=string.format("%s · HP %d/%d · 공격 %d\n골드 %d · 무기T%d 방어T%d · 유물 %s%s",levelLabel,hp,maxHP,p:GetAttribute("AttackPower")or 10,p:GetAttribute("Gold")or 0,p:GetAttribute("WeaponTier")or 1,p:GetAttribute("ArmorTier")or 1,tostring(p:GetAttribute("RelicId")or"NONE"),mastery>0 and(" · 숙련"..mastery)or"")
 hpFill.Size=UDim2.fromScale(math.clamp(hp/math.max(1,maxHP),0,1),1)
 local nextXP=level>=(C.LevelCap or 60)and 1 or math.max(1,level*100);xpFill.Size=UDim2.fromScale(level>=(C.LevelCap or 60)and 1 or math.clamp(xp/nextXP,0,1),1)
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local cd=C.Classes[classId];local adv=tostring(p:GetAttribute("AdvancementId")or"");local second=tostring(p:GetAttribute("SecondAdvancementId")or"")
 local advName="";if cd and adv~=""then for _,a in pairs(cd.Advancements)do if a.Id==adv then advName=" → "..a.Name;if second~=""and a.SecondId==second then advName=advName.." → "..(a.SecondName or second)end;break end end end
 classBadge.Text=(cd and cd.Name or"직업 미선택")..advName
 local zone=p:GetAttribute("CurrentZone")or 0
 local qp=p:GetAttribute("QuestPortal")or 0
 local qk=p:GetAttribute("QuestKills")or 0
 local qn=p:GetAttribute("QuestNeed")or 0
 objective.Visible=qp>0
 if qp>0 then objective.Text=string.format("퀘스트 · %s %d/%d",zoneName(qp),qk,qn)end
 local pc=p:GetAttribute("PartyCount")or 0
 local pk=p:GetAttribute("PartyKills")or 0
 local contrib=p:GetAttribute("Contribution")or 0
 partyText.Text=(p:GetAttribute("PartyHuntActive")==true)and string.format("파티 %d/4 · 사냥 %d/%d\n기여 %d",pc+1,pk,C.PartyHuntTarget,contrib)or string.format("파티 %d/4 · 동료 %d\n마을에서 편성",pc+1,pc)
 local combatLocked=p:GetAttribute("InCombat")==true
 returnButton.Visible=zone>0
 returnButton.Text=combatLocked and"전투 중 귀환 불가"or"마을 귀환"
 returnButton.BackgroundColor3=combatLocked and Color3.fromRGB(104,65,65)or Color3.fromRGB(61,111,86)
 multi.Text="방 "..tostring(p:GetAttribute("RoomCode")or 1)
 local trial=p:GetAttribute("AdvancementTrialActive")==true
 if trial then objective.Visible=true;objective.Text=string.format("전직 시험 · %d/%d",p:GetAttribute("AdvancementTrialProgress")or 0,C.AdvancementTrialTarget)end
 local guard=math.floor(p:GetAttribute("Guard")or C.GuardMax);local blocking=p:GetAttribute("Blocking")==true
 block.Text=(blocking and"막는중 "or"막기 ")..guard
 block.BackgroundColor3=blocking and Color3.fromRGB(83,139,177)or Color3.fromRGB(74,102,151)
 if zone==1 then hint.Text="RUN "..tostring(p:GetAttribute("CurrentRunSeed")or 0).." · 노랑 패링 / 빨강 회피"else hint.Text=zone==0 and"포탈 입장 · 보스 동료는 마을에서 편성"or(zoneName(zone).." · 멀어지면 어그로 해제")end
 if classId=="BREAKER"then skill.Text="파쇄"elseif classId=="SHADOW"then skill.Text="그림자"elseif classId=="RUNE"then skill.Text="룬"elseif classId=="SOUL"then skill.Text="영혼"else skill.Text="스킬"end
 renderClassPanel()
end
for _,k in ipairs({"Level","XP","MaxHP","AttackPower","Gold","WeaponTier","ArmorTier","RelicId","MasteryLevel","SecondAdvancementId","CompanionUnlockCount","CurrentZone","QuestPortal","QuestKills","QuestNeed","PartyCount","PartyKills","Contribution","PartyHuntActive","InCombat","RoomCode","ClassId","AdvancementId","AdvancementTrialActive","AdvancementTrialProgress","AdvancementTrialPassed","RespecReady","RuneElement","SoulCharge","Guard","Blocking","GuardBrokenUntil","ParryCount","CurrentRunSeed"})do p:GetAttributeChangedSignal(k):Connect(render)end
p:GetAttributeChangedSignal("LastAction"):Connect(function()showToast(tostring(p:GetAttribute("LastAction")or""));render()end)
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

QACamera.install(C,gui,function()
 local shots={{label="rpg-village",position=Vector3.new(0,120,170),lookAt=Vector3.new(0,2,0)}}
 for _,z in ipairs(C.Portals)do table.insert(shots,{label="rpg-portal-"..z.Id,position=z.Center+Vector3.new(0,95,150),lookAt=z.Center})end
 return shots
end)
render()
