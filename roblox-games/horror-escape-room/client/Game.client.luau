local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local p=Players.LocalPlayer;local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"));local remote=RS:WaitForChild(C.RemoteName)
local gui=Instance.new("ScreenGui");gui.Name="MidnightTagHUD";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame");root.AnchorPoint=Vector2.new(.5,1);root.Position=UDim2.fromScale(.5,.98);root.Size=UDim2.new(1,-18,0,310);root.Parent=gui
local status=Instance.new("TextLabel");status.Size=UDim2.new(1,-12,0,115);status.Position=UDim2.fromOffset(6,4);status.BackgroundTransparency=1;status.TextWrapped=true;status.TextScaled=true;status.Parent=root
local A={{C.Actions.PREFER_MONSTER,"몬스터 선호"},{C.Actions.PREFER_SURVIVOR,"생존자 선호"},{C.Actions.SOLO_MONSTER,"1인 몬스터"},{C.Actions.SOLO_SURVIVOR,"1인 생존자"},{C.Actions.RESCUE,"해동"},{C.Actions.ABILITY,"몬스터 스킬"},{C.Actions.NEXT_MONSTER,"몬스터 변경"}}
for i,a in ipairs(A)do local b=Instance.new("TextButton");local c=(i-1)%3;local r=math.floor((i-1)/3);b.Size=UDim2.new(.31,0,0,62);b.Position=UDim2.new(.02+c*.325,0,0,126+r*70);b.Text=a[2];b.TextScaled=true;b.Parent=root;b.Activated:Connect(function()remote:FireServer(a[1])end)end
local function monsterName()local id=p:GetAttribute("MonsterForm")or"DRAK";for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f.Name end end;return"드라크"end
local function render()status.Text=string.format("%s | %s | %.0f초\n역할 %s · %s · 선택몬스터 %s\n몬스터XP %d · 코인 %d",
 C.GameName,p:GetAttribute("RoundState")or"WAITING",p:GetAttribute("TimeLeft")or 0,p:GetAttribute("Role")or"WAITING",p:GetAttribute("Frozen")==true and"얼음!"or"이동 가능",monsterName(),p:GetAttribute("MonsterXP")or 0,p:GetAttribute("Coins")or 0)end
for _,k in ipairs({"RoundState","TimeLeft","Role","Frozen","MonsterForm","MonsterXP","Coins"})do p:GetAttributeChangedSignal(k):Connect(render)end;render()
