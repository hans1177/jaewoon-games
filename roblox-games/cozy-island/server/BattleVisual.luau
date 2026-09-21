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
 if not region then return end
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
 local strength=config.Bases[index].Strength or 20
 for i=1,math.min(8,math.max(3,math.floor(strength/15)))do
  makePart(folder,"수비병",Vector3.new(2,4,2),target+Vector3.new((i%4)*4-8,0,-7+math.floor((i-1)/4)*4),Color3.fromRGB(157,73,62))
 end
 local pulse=makePart(folder,"BattlePulse",Vector3.new(3,3,3),target+Vector3.new(0,5,0),region.Accent,Enum.Material.Neon)
 pulse.Shape=Enum.PartType.Ball;pulse.Transparency=.25
 TweenService:Create(pulse,TweenInfo.new(2,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Size=Vector3.new(18,18,18),Transparency=1}):Play()
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
