local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local p=Players.LocalPlayer;local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"));local remote=RS:WaitForChild(C.RemoteName)
local gui=Instance.new("ScreenGui");gui.Name="DaechungRPGHUD";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame");root.AnchorPoint=Vector2.new(.5,1);root.Position=UDim2.fromScale(.5,.98);root.Size=UDim2.new(1,-18,0,320);root.Parent=gui
local status=Instance.new("TextLabel");status.Size=UDim2.new(1,-12,0,110);status.Position=UDim2.fromOffset(6,4);status.BackgroundTransparency=1;status.TextWrapped=true;status.TextScaled=true;status.Parent=root
local A={{C.Actions.ATTACK,"공격"},{C.Actions.SKILL,"스킬"},{C.Actions.DODGE,"회피"},{C.Actions.NEXT_CLASS,"직업변경"},{C.Actions.NEXT_AI,"AI성향"},{C.Actions.NEXT_RELIC,"장비효과"},{C.Actions.UPGRADE_WEAPON,"무기강화"}}
for i,a in ipairs(A)do local b=Instance.new("TextButton");local c=(i-1)%3;local r=math.floor((i-1)/3);b.Size=UDim2.new(.31,0,0,62);b.Position=UDim2.new(.02+c*.325,0,0,120+r*70);b.Text=a[2];b.TextScaled=true;b.Parent=root;b.Activated:Connect(function()remote:FireServer(a[1])end)end
local function className()local id=p:GetAttribute("ClassId")or"BREAKER";for _,x in ipairs(C.Classes)do if x.Id==id then return x.Name end end;return id end
local function render()status.Text=string.format("4인 파티 RPG | %s\nLv.%d XP%d 골드%d 무기T%d | AI:%s 장비:%s\n파티기억 %d | 보스동료:%s",
 className(),p:GetAttribute("Level")or 1,p:GetAttribute("XP")or 0,p:GetAttribute("Gold")or 0,p:GetAttribute("WeaponTier")or 1,p:GetAttribute("AIStyle")or"PROTECT",p:GetAttribute("Relic")or"FURY",p:GetAttribute("PartyMemory")or 0,(p:GetAttribute("BossCompanionUnlocked")or 0)>0 and"해금"or"미해금")end
for _,k in ipairs({"ClassId","Level","XP","Gold","WeaponTier","AIStyle","Relic","PartyMemory","BossCompanionUnlocked"})do p:GetAttributeChangedSignal(k):Connect(render)end;render()
