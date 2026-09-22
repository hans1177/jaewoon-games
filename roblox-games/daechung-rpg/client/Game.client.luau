-- roblox-games/daechung-rpg/client/Game.client.luau
-- Whatever RPG 모바일 전투 HUD / 전투 우선 조작

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
local bgm=sound("RPGBackground",C.Audio.Background,.17,true)
local battleBgm=sound("RPGBattleBGM",C.Audio.Battle,.18,true)
local bossBgm=sound("RPGBossBGM",C.Audio.Boss,.2,true)
local actionSfx=sound("RPGAction",C.Audio.Action,.28,false)
local hitSfx=sound("RPGHit",C.Audio.Hit,.26,false)
local skillSfx=sound("RPGSkill",C.Audio.Skill,.3,false)
local levelSfx=sound("RPGLevelUp",C.Audio.LevelUp,.34,false)
local bossAppearSfx=sound("RPGBossAppear",C.Audio.BossAppear,.34,false)
local victorySfx=sound("RPGVictory",C.Audio.Victory,.34,false)
local lastBosses=p:GetAttribute("BossesDefeated")or 0
bgm:Play()

-- UI 공통
local gui=Instance.new("ScreenGui")
gui.Name="DaechungRPGHUD"
gui.ResetOnSpawn=false
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets
gui.Parent=p:WaitForChild("PlayerGui")

local function roundify(target,radius)
 local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,radius or 12);corner.Parent=target
end

local function outline(target,transparency)
 local stroke=Instance.new("UIStroke");stroke.Thickness=1.5;stroke.Transparency=transparency or .4;stroke.Parent=target
end

local function makeButton(parent,text,color)
 local b=Instance.new("TextButton")
 b.BackgroundColor3=color
 b.TextColor3=Color3.fromRGB(255,255,255)
 b.Text=text
 b.TextScaled=true
 b.Font=Enum.Font.GothamBold
 b.Parent=parent
 roundify(b,12);outline(b,.48)
 return b
end

local flash=Instance.new("Frame")
flash.Size=UDim2.fromScale(1,1)
flash.BackgroundTransparency=1
flash.BorderSizePixel=0
flash.ZIndex=20
flash.Parent=gui
local function pulse(color)
 flash.BackgroundColor3=color;flash.BackgroundTransparency=.78
 task.delay(.14,function()if flash.Parent then flash.BackgroundTransparency=1 end end)
end

-- 상단 캐릭터/파티 HUD
local hud=Instance.new("Frame")
hud.Name="RPGTopHUD"
hud.AnchorPoint=Vector2.new(0,0)
hud.Position=UDim2.fromOffset(8,8)
hud.Size=UDim2.fromOffset(230,54)
hud.BackgroundColor3=Color3.fromRGB(31,29,43)
hud.BackgroundTransparency=.06
hud.Parent=gui
roundify(hud,14);outline(hud,.38)

local status=Instance.new("TextLabel")
status.Size=UDim2.new(1,-16,0,46)
status.Position=UDim2.fromOffset(8,3)
status.BackgroundTransparency=1
status.TextColor3=Color3.fromRGB(240,236,255)
status.TextWrapped=true
status.TextScaled=false
status.TextSize=13
status.Font=Enum.Font.Gotham
status.Parent=hud

local note=Instance.new("TextLabel")
note.Size=UDim2.fromOffset(260,26)
note.AnchorPoint=Vector2.new(.5,0)
note.Position=UDim2.new(.5,0,0,8)
note.BackgroundColor3=Color3.fromRGB(52,46,70)
note.BackgroundTransparency=.1
note.TextColor3=Color3.fromRGB(255,215,115)
note.TextWrapped=true
note.TextScaled=true
note.Font=Enum.Font.GothamBold
note.Parent=gui
roundify(note,9)

-- 전투 버튼: 오른손/왼손 모두 닿는 하단 중앙
local combatDock=Instance.new("Frame")
combatDock.Name="CombatDock"
combatDock.AnchorPoint=Vector2.new(1,.5)
combatDock.Position=UDim2.new(1,-12,.62,0)
combatDock.Size=UDim2.fromOffset(62,174)
combatDock.BackgroundTransparency=1
combatDock.Parent=gui

local combatActions={
 {C.Actions.ATTACK,"공격",Color3.fromRGB(167,67,63)},
 {C.Actions.SKILL,"스킬",Color3.fromRGB(105,72,184)},
 {C.Actions.DODGE,"회피",Color3.fromRGB(55,111,145)},
}
for i,a in ipairs(combatActions)do
 local b=makeButton(combatDock,a[2],a[3])
 b.Size=UDim2.fromOffset(58,50)
 b.Position=UDim2.fromOffset(2,(i-1)*58)
 b.Activated:Connect(function()
  if a[1]==C.Actions.SKILL then skillSfx.TimePosition=0;skillSfx:Play()else actionSfx.TimePosition=0;actionSfx:Play()end
  remote:FireServer(a[1])
 end)
end

-- 보조 설정은 접어서 전투 화면을 가리지 않음
local menuButton=makeButton(gui,"파티/장비",Color3.fromRGB(68,61,92))
menuButton.Name="PartyMenuButton"
menuButton.AnchorPoint=Vector2.new(1,0)
menuButton.Position=UDim2.new(1,-10,0,8)
menuButton.Size=UDim2.fromOffset(88,32)

local secondary=Instance.new("Frame")
secondary.Name="PartyMenu"
secondary.AnchorPoint=Vector2.new(1,0)
secondary.Position=UDim2.new(1,-10,0,46)
secondary.Size=UDim2.fromOffset(168,154)
secondary.BackgroundColor3=Color3.fromRGB(35,32,48)
secondary.BackgroundTransparency=.05
secondary.Visible=false
secondary.Parent=gui
roundify(secondary,14);outline(secondary,.4)

local secondaryActions={
 {C.Actions.NEXT_CLASS,"직업 변경"},
 {C.Actions.NEXT_AI,"AI 성향"},
 {C.Actions.NEXT_RELIC,"장비 효과"},
 {C.Actions.UPGRADE_WEAPON,"무기 강화"},
}
for i,a in ipairs(secondaryActions)do
 local b=makeButton(secondary,a[2],Color3.fromRGB(77,68,104))
 b.Size=UDim2.new(1,-16,0,30)
 b.Position=UDim2.fromOffset(8,8+(i-1)*35)
 b.Activated:Connect(function()remote:FireServer(a[1])end)
end

menuButton.Activated:Connect(function()
 secondary.Visible=not secondary.Visible
 menuButton.Text=secondary.Visible and"메뉴 닫기"or"파티/장비"
end)

-- 상태
local function className()
 local id=p:GetAttribute("ClassId")or"BREAKER"
 for _,x in ipairs(C.Classes)do if x.Id==id then return x.Name end end
 return id
end

local function companionNames()
 local t={}
 for _,x in ipairs(C.Companions)do if p:GetAttribute("Companion_"..x.Id)==true then table.insert(t,x.Name)end end
 return #t>0 and table.concat(t,", ")or"없음"
end

local function render()
 status.Text=string.format("%s  Lv.%d  XP %d  골드 %d\n무기 T%d · 파티 %d/4 · 처치 %d",
  className(),p:GetAttribute("Level")or 1,p:GetAttribute("XP")or 0,p:GetAttribute("Gold")or 0,
  p:GetAttribute("WeaponTier")or 1,p:GetAttribute("PartySize")or 1,p:GetAttribute("Kills")or 0)
 note.Text=p:GetAttribute("LastAction")or"이장에게 가서 첫 동료를 만나."

 local bossEngaged=p:GetAttribute("BossEngaged")==true
 local inCombat=p:GetAttribute("InCombat")==true
 if bossEngaged then
  if bgm.IsPlaying then bgm:Stop()end
  if battleBgm.IsPlaying then battleBgm:Stop()end
  if not bossBgm.IsPlaying then bossBgm:Play()end
  note.BackgroundColor3=Color3.fromRGB(91,37,102)
 elseif inCombat then
  if bgm.IsPlaying then bgm:Stop()end
  if bossBgm.IsPlaying then bossBgm:Stop()end
  if not battleBgm.IsPlaying then battleBgm:Play()end
  note.BackgroundColor3=Color3.fromRGB(82,48,53)
 else
  if battleBgm.IsPlaying then battleBgm:Stop()end
  if bossBgm.IsPlaying then bossBgm:Stop()end
  if not bgm.IsPlaying then bgm:Play()end
  note.BackgroundColor3=Color3.fromRGB(52,46,70)
 end

 local bosses=p:GetAttribute("BossesDefeated")or 0
 if bosses>lastBosses then victorySfx.TimePosition=0;victorySfx:Play();pulse(Color3.fromRGB(245,200,90))end
 lastBosses=bosses
end

local keys={"ClassId","Level","XP","Gold","WeaponTier","AIStyle","Relic","PartyMemory","Kills","PartySize","LastAction","BossesDefeated","InCombat","BossEngaged"}
for _,x in ipairs(C.Companions)do table.insert(keys,"Companion_"..x.Id)end
for _,k in ipairs(keys)do p:GetAttributeChangedSignal(k):Connect(render)end

p:GetAttributeChangedSignal("FeedbackEvent"):Connect(function()
 local value=tostring(p:GetAttribute("FeedbackEvent")or"")
 if value:find("^ATTACK:")then hitSfx.TimePosition=0;hitSfx:Play();pulse(Color3.fromRGB(245,235,220))
 elseif value:find("^SKILL:")then skillSfx.TimePosition=0;skillSfx:Play();pulse(Color3.fromRGB(150,115,255))
 elseif value:find("^LEVEL_UP:")then levelSfx.TimePosition=0;levelSfx:Play();pulse(Color3.fromRGB(255,220,100))
 elseif value:find("^BOSS_APPEAR:")then bossAppearSfx.TimePosition=0;bossAppearSfx:Play();pulse(Color3.fromRGB(160,70,190))
 elseif value:find("^ELITE_KILL:")or value:find("^KILL:")then hitSfx.TimePosition=0;hitSfx:Play()
 elseif value:find("^VICTORY:")then victorySfx.TimePosition=0;victorySfx:Play();pulse(Color3.fromRGB(255,205,90))end
end)

remote.OnClientEvent:Connect(function(kind,snapshot)
 if kind~="MULTIPLAYER_SYNC"or typeof(snapshot)~="table"then return end
 p:SetAttribute("SyncedParticipants",tonumber(snapshot.ParticipantCount)or 1)
 p:SetAttribute("SyncedSharedObjective",tonumber(snapshot.SharedObjective)or 0)
end)

render()
