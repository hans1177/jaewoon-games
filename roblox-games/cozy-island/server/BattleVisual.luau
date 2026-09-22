local TweenService=game:GetService("TweenService")
local Active={}
local BattleVisual={}

local function makePart(parent,name,size,pos,color,material)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.Size=size;p.Position=pos;p.Color=color
 p.Material=material or Enum.Material.SmoothPlastic;p.Parent=parent;return p
end

function BattleVisual.cleanup(player)
 local folder=Active[player]
 if folder then folder:Destroy();Active[player]=nil end
end

function BattleVisual.start(player,index,troops,config,style)
 BattleVisual.cleanup(player)
 local region=style.Regions[index+1]
 local base=config.Bases[index]
 if not region or not base then return end
 local world=workspace:FindFirstChild("CozyConquestWorld")or workspace
 local folder=Instance.new("Folder");folder.Name="Battle_"..player.UserId;folder.Parent=world;Active[player]=folder
 local start=style.Regions[1].Pos+Vector3.new(0,5,-18)
 local target=region.Pos+Vector3.new(0,region.Size.Y/2+3,0)
 local count=math.clamp(troops,3,12)
 for i=1,count do
  local soldier=makePart(folder,"병사",Vector3.new(2,4,2),start+Vector3.new((i%4)*3,0,math.floor((i-1)/4)*3),Color3.fromRGB(70,116,165))
  local goal=target+Vector3.new(((i%4)-2)*3,0,math.floor((i-1)/4)*3)
  TweenService:Create(soldier,TweenInfo.new(1.8,Enum.EasingStyle.Linear),{Position=goal}):Play()
 end
 local defenderColor=index==1 and Color3.fromRGB(120,112,105)
  or index==2 and Color3.fromRGB(151,126,76)
  or index==3 and Color3.fromRGB(105,100,96)
  or index==4 and Color3.fromRGB(170,120,58)
  or Color3.fromRGB(118,47,38)
 local strength=base.Strength or 20
 local defenders=base.Boss and 9 or math.min(8,math.max(3,math.floor(strength/15)))
 for i=1,defenders do
  local d=makePart(folder,base.Enemy or"수비병",Vector3.new(base.Boss and 2.8 or 2,base.Boss and 5 or 4,base.Boss and 2.8 or 2),target+Vector3.new((i%4)*4-8,0,-7+math.floor((i-1)/4)*4),defenderColor)
  d.Material=base.Boss and Enum.Material.Slate or Enum.Material.SmoothPlastic
 end
 if base.Boss then
  local boss=makePart(folder,"Boss_"..(base.BossName or"최종수비대"),Vector3.new(9,12,9),target+Vector3.new(0,5,-2),Color3.fromRGB(79,39,34),Enum.Material.Basalt)
  local light=Instance.new("PointLight");light.Color=region.Accent;light.Range=26;light.Brightness=3;light.Parent=boss
  local gui=Instance.new("BillboardGui");gui.Size=UDim2.fromOffset(220,48);gui.StudsOffset=Vector3.new(0,8,0);gui.AlwaysOnTop=true;gui.Parent=boss
  local label=Instance.new("TextLabel");label.Size=UDim2.fromScale(1,1);label.BackgroundTransparency=1;label.TextScaled=true;label.Text=(base.BossName or"최종 보스").." · "..base.Name;label.TextColor3=Color3.fromRGB(255,195,110);label.TextStrokeTransparency=.2;label.Parent=gui
 end
 local pulse=makePart(folder,"BattlePulse",Vector3.new(3,3,3),target+Vector3.new(0,5,0),region.Accent,Enum.Material.Neon)
 pulse.Shape=Enum.PartType.Ball;pulse.Transparency=.25
 TweenService:Create(pulse,TweenInfo.new(base.Boss and 2.8 or 2,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Size=base.Boss and Vector3.new(30,30,30)or Vector3.new(18,18,18),Transparency=1}):Play()
end

function BattleVisual.finish(player,won)
 local folder=Active[player];if not folder then return end
 local banner=Instance.new("Part");banner.Name=won and"점령성공"or"전투패배";banner.Anchored=true;banner.CanCollide=false
 banner.Size=Vector3.new(5,10,1);banner.Color=won and Color3.fromRGB(70,170,105)or Color3.fromRGB(170,65,65);banner.Material=Enum.Material.Neon
 local sum=Vector3.new();local count=0
 for _,x in ipairs(folder:GetChildren())do if x:IsA("BasePart")then sum+=x.Position;count+=1 end end
 banner.Position=count>0 and sum/count+Vector3.new(0,7,0)or Vector3.new(0,10,0);banner.Parent=folder
 task.delay(1.2,function()BattleVisual.cleanup(player)end)
end

return BattleVisual
