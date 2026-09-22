local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local SoundService=game:GetService("SoundService")
local touchEnabled=UserInputService.TouchEnabled
local p=Players.LocalPlayer;local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"));local remote=RS:WaitForChild(C.RemoteName)
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
local gui=Instance.new("ScreenGui");gui.Name="CozyConquest";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame");root.AnchorPoint=Vector2.new(.5,1);root.Position=UDim2.fromScale(.5,.98);root.Size=UDim2.new(1,-18,0,420);root.Parent=gui
local status=Instance.new("TextLabel");status.Size=UDim2.new(1,-12,0,120);status.Position=UDim2.fromOffset(6,4);status.BackgroundTransparency=1;status.TextWrapped=true;status.TextScaled=true;status.Parent=root
local note=Instance.new("TextLabel");note.Size=UDim2.new(1,-12,0,40);note.Position=UDim2.fromOffset(6,122);note.BackgroundTransparency=1;note.TextScaled=true;note.Parent=root
local feedbackFlash=Instance.new("Frame");feedbackFlash.Size=UDim2.fromScale(1,1);feedbackFlash.BackgroundTransparency=1;feedbackFlash.BorderSizePixel=0;feedbackFlash.ZIndex=8;feedbackFlash.Parent=gui
local function flash(color)
 feedbackFlash.BackgroundColor3=color;feedbackFlash.BackgroundTransparency=.72
 task.delay(.16,function()if feedbackFlash.Parent then feedbackFlash.BackgroundTransparency=1 end end)
end
local A={{C.Actions.CHOP,"벌목"},{C.Actions.FOOD,"식량"},{C.Actions.HIRE,"주민고용"},{C.Actions.WOOD_JOB,"벌목배치"},{C.Actions.FOOD_JOB,"식량배치"},{C.Actions.BARRACKS,"병영강화"},{C.Actions.RECRUIT,"병사모집"},{C.Actions.ATTACK,"기지공격"},{C.Actions.SUPPORT,"원정지원"}}
for i,a in ipairs(A)do local b=Instance.new("TextButton");local c=(i-1)%3;local r=math.floor((i-1)/3);b.Size=UDim2.new(.31,0,0,70);b.Position=UDim2.new(.02+c*.325,0,0,170+r*80);b.Text=a[2];b.TextScaled=true;b.Parent=root;b.Activated:Connect(function()
 if a[1]==C.Actions.ATTACK or a[1]==C.Actions.RECRUIT or a[1]==C.Actions.BARRACKS then actionSfx.TimePosition=0;actionSfx:Play()end
 remote:FireServer(a[1])
 end)end
local function render()
 local idx=p:GetAttribute("NextBaseIndex")or 1;local b=C.Bases[idx];local target=b and (b.Name.." 전력"..b.Strength)or"공개기지 완료"
 status.Text=string.format("나무%d 식량%d 코인%d | 철%d 말%d 돌%d 금%d 유황%d\n주민%d(벌목%d/식량%d) 병영Lv.%d 병사%d\n점령기지%d 섬%d | %s",
  p:GetAttribute("Wood")or 0,p:GetAttribute("Food")or 0,p:GetAttribute("Coins")or 0,p:GetAttribute("Iron")or 0,p:GetAttribute("Horses")or 0,p:GetAttribute("Stone")or 0,p:GetAttribute("Gold")or 0,p:GetAttribute("Sulfur")or 0,
  p:GetAttribute("Residents")or 0,p:GetAttribute("WoodWorkers")or 0,p:GetAttribute("Farmers")or 0,p:GetAttribute("BarracksLevel")or 1,p:GetAttribute("Troops")or 0,p:GetAttribute("CapturedBases")or 0,p:GetAttribute("CapturedIslands")or 0,target)
 local inBattle=p:GetAttribute("InBattle")==true
 note.Text=(p:GetAttribute("LastActivity")or"READY")..(inBattle and(" · 전투 "..(p:GetAttribute("BattleProgress")or 0).."%")or"")
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
for _,k in ipairs({"Wood","Food","Coins","Iron","Horses","Stone","Gold","Sulfur","Residents","WoodWorkers","Farmers","BarracksLevel","Troops","CapturedBases","CapturedIslands","NextBaseIndex","BattleProgress","LastActivity","InBattle"})do p:GetAttributeChangedSignal(k):Connect(render)end;render()
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
