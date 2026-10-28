-- 파일명: roblox-games/cozy-island/server/BattleVisual.luau
-- 전투 결과/데미지/보상은 기존 Game.server.luau 소유. 아래는 시각 전용 연출.
-- 단일 직육면체 병사 대신 관절이 실제로 움직이는 저폴리 부대/수비병/보스.
local TweenService=game:GetService("TweenService")
local Active={}
local BattleVisual={}

local function makePart(parent,name,size,pos,color,material)
 local p=Instance.new("Part")
 p.Name=name;p.Anchored=true;p.CanCollide=false;p.CanTouch=false;p.CanQuery=false
 p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth
 p.Size=size;p.Position=pos;p.Color=color
 p.Material=material or Enum.Material.SmoothPlastic
 p.Parent=parent
 return p
end
local function shade(color,factor)
 return Color3.new(math.clamp(color.R*factor,0,1),math.clamp(color.G*factor,0,1),math.clamp(color.B*factor,0,1))
end
local function limb(model,root,name,offset,size,color,material)
 local item=makePart(model,name,size,root.Position+offset,color,material)
 item.Anchored=false;item.Massless=true
 local motor=Instance.new("Motor6D")
 motor.Name=name.."Joint";motor.Part0=root;motor.Part1=item
 motor.C0=CFrame.new(offset);motor.C1=CFrame.identity;motor.Parent=root
 return motor,item
end
local function makeActor(folder,name,pos,baseColor,scale,defender,boss)
 local model=Instance.new("Model")
 model.Name=name;model.Parent=folder
 model:SetAttribute("CozyBattleVisualOnly",true)
 model:SetAttribute("OwnsCombatAuthority",false)
 model:SetAttribute("OwnsDamageAuthority",false)
 model:SetAttribute("MotionRig","MOTOR6D_ARTICULATED_PRESENTATION")
 local root=makePart(model,"VisualRigRoot",Vector3.new(.6,.6,.6)*scale,pos,baseColor)
 root.Transparency=1;root.CastShadow=false
 model.PrimaryPart=root
 local metal=Enum.Material.Metal
 local tunic=shade(baseColor,defender and .77 or .9)
 limb(model,root,"Torso",Vector3.new(0,.1,0)*scale,Vector3.new(1.65,2.12,.88)*scale,tunic,Enum.Material.SmoothPlastic)
 limb(model,root,"Head",Vector3.new(0,1.49,0)*scale,Vector3.new(.93,.93,.87)*scale,Color3.fromRGB(207,165,125))
 local helmet=limb(model,root,"Helmet",Vector3.new(0,1.90,0)*scale,Vector3.new(1.07,.34,.97)*scale,shade(baseColor,.63),metal)
 local leftArm=limb(model,root,"LeftArm",Vector3.new(-1.15,.05,0)*scale,Vector3.new(.55,1.77,.64)*scale,shade(baseColor,1.13))
 local rightArm=limb(model,root,"RightArm",Vector3.new(1.15,.05,0)*scale,Vector3.new(.55,1.77,.64)*scale,shade(baseColor,1.13))
 local leftLeg=limb(model,root,"LeftLeg",Vector3.new(-.47,-1.57,0)*scale,Vector3.new(.64,1.78,.72)*scale,shade(tunic,.72))
 local rightLeg=limb(model,root,"RightLeg",Vector3.new(.47,-1.57,0)*scale,Vector3.new(.64,1.78,.72)*scale,shade(tunic,.72))
 limb(model,root,"ChestPlate",Vector3.new(0,.16,-.52)*scale,Vector3.new(1.33,1.22,.20)*scale,shade(baseColor,1.25),metal)
 limb(model,root,"Belt",Vector3.new(0,-.90,-.50)*scale,Vector3.new(1.72,.32,.30)*scale,Color3.fromRGB(78,64,52))
 if boss then
  limb(model,root,"Crest",Vector3.new(0,2.30,0)*scale,Vector3.new(.42,.58,.45)*scale,Color3.fromRGB(232,160,73),Enum.Material.Neon)
 end
 return {root=root,model=model,leftArm=leftArm,rightArm=rightArm,leftLeg=leftLeg,rightLeg=rightLeg,
  leftArmBase=leftArm.C0,rightArmBase=rightArm.C0,leftLegBase=leftLeg.C0,rightLegBase=rightLeg.C0}
end
local function poseJoint(motor,base,angle,duration)
 if not motor.Parent then return end
 TweenService:Create(motor,TweenInfo.new(duration,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),
  {C0=base*CFrame.Angles(angle,0,0)}):Play()
end
-- All animation is driven by actual Motor6D joints; moving the visual root
-- alone is not counted as a character action. The rig is never a hitbox.
local function setPose(rig,legAngle,armAngle,duration)
 poseJoint(rig.leftLeg,rig.leftLegBase,legAngle,duration)
 poseJoint(rig.rightLeg,rig.rightLegBase,-legAngle,duration)
 poseJoint(rig.leftArm,rig.leftArmBase,-armAngle,duration)
 poseJoint(rig.rightArm,rig.rightArmBase,armAngle,duration)
end
local function marchAndStrike(folder,rig,arrival)
 for phase=0,4 do
  task.delay(phase*.32,function()
   if folder.Parent and rig.model.Parent then
    setPose(rig,phase%2==0 and .32 or -.32,phase%2==0 and .22 or -.22,.24)
   end
  end)
 end
 task.delay(arrival,function()
  if folder.Parent and rig.model.Parent then setPose(rig,-.17,1.05,.19)end
 end)
 task.delay(arrival+.24,function()
  if folder.Parent and rig.model.Parent then setPose(rig,0,-.52,.20)end
 end)
 task.delay(arrival+.53,function()
  if folder.Parent and rig.model.Parent then setPose(rig,0,0,.28)end
 end)
end

function BattleVisual.cleanup(player)
 local folder=Active[player]
 if folder then Active[player]=nil;folder:Destroy()end
end

function BattleVisual.start(player,index,troops,config,style)
 BattleVisual.cleanup(player)
 local region=style.Regions[index+1]
 local base=config.Bases[index]
 if not region or not base then return end
 local world=workspace:FindFirstChild("CozyConquestWorld")or workspace
 local folder=Instance.new("Folder")
 folder.Name="Battle_"..player.UserId;folder.Parent=world;Active[player]=folder
 folder:SetAttribute("CozyBattlePresentation","ARTICULATED_LOW_POLY")
 folder:SetAttribute("CozyBattleVisualOnly",true)
 local start=style.Regions[1].Pos+Vector3.new(0,5,-18)
 local target=region.Pos+Vector3.new(0,region.Size.Y/2+3,0)
 local count=math.clamp(troops,3,12)
 local attackerColor=Color3.fromRGB(70,116,165)
 for i=1,count do
  local slot=i-1
  local formation=Vector3.new(((slot%4)-1.5)*3,0,math.floor(slot/4)*3)
  local rig=makeActor(folder,"병사",start+formation,attackerColor,1,false,false)
  local goal=target+formation
  TweenService:Create(rig.root,TweenInfo.new(1.8,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{Position=goal}):Play()
  marchAndStrike(folder,rig,1.8)
 end
 local defenderColor=index==1 and Color3.fromRGB(120,112,105)
  or index==2 and Color3.fromRGB(151,126,76)
  or index==3 and Color3.fromRGB(105,100,96)
  or index==4 and Color3.fromRGB(170,120,58)
  or Color3.fromRGB(118,47,38)
 local strength=base.Strength or 20
 local defenders=base.Boss and 9 or math.min(8,math.max(3,math.floor(strength/15)))
 for i=1,defenders do
  local slot=i-1
  local formation=Vector3.new(((slot%4)-1.5)*4,0,-7+math.floor(slot/4)*4)
  local rig=makeActor(folder,base.Enemy or "수비병",target+formation,defenderColor,1,true,false)
  task.delay(1.67+(i%3)*.06,function()
   if folder.Parent and rig.model.Parent then setPose(rig,.1,.76,.22)end
  end)
  task.delay(2.08,function()
   if folder.Parent and rig.model.Parent then setPose(rig,0,0,.25)end
  end)
 end
 if base.Boss then
  local rig=makeActor(folder,"Boss_"..(base.BossName or "최종수비대"),
   target+Vector3.new(0,5,-2),Color3.fromRGB(79,39,34),1.9,true,true)
  local light=Instance.new("PointLight")
  light.Color=region.Accent;light.Range=26;light.Brightness=3;light.Parent=rig.root
  local gui=Instance.new("BillboardGui")
  gui.Size=UDim2.fromOffset(220,48);gui.StudsOffset=Vector3.new(0,5.5,0)
  gui.AlwaysOnTop=true;gui.Adornee=rig.root;gui.Parent=rig.model
  local label=Instance.new("TextLabel")
  label.Size=UDim2.fromScale(1,1);label.BackgroundTransparency=1;label.TextScaled=true
  label.Text=(base.BossName or "최종 보스").." · "..base.Name
  label.TextColor3=Color3.fromRGB(255,195,110);label.TextStrokeTransparency=.2;label.Parent=gui
  task.delay(1.68,function()
   if folder.Parent and rig.model.Parent then setPose(rig,-.2,1.2,.26)end
  end)
 end
 local pulse=makePart(folder,"BattlePulse",Vector3.new(3,3,3),target+Vector3.new(0,5,0),region.Accent,Enum.Material.Neon)
 pulse.Shape=Enum.PartType.Ball;pulse.Transparency=.75
 TweenService:Create(pulse,TweenInfo.new(base.Boss and 2.8 or 2,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),
  {Size=base.Boss and Vector3.new(30,30,30)or Vector3.new(18,18,18),Transparency=1}):Play()
end

function BattleVisual.finish(player,won)
 local folder=Active[player];if not folder or not folder.Parent then return end
 local sum=Vector3.zero;local count=0
 for _,x in ipairs(folder:GetDescendants())do
  if x:IsA("BasePart")and x.Name=="VisualRigRoot"then sum+=x.Position;count+=1 end
 end
 local position=count>0 and sum/count+Vector3.new(0,7,0)or Vector3.new(0,10,0)
 local marker=makePart(folder,won and "점령성공"or "전투패배",Vector3.new(2,2,2),
  position,won and Color3.fromRGB(70,170,105)or Color3.fromRGB(170,65,65),Enum.Material.Neon)
 marker.Shape=Enum.PartType.Ball;marker.Transparency=.25
 local ui=Instance.new("BillboardGui")
 ui.Size=UDim2.fromOffset(210,46);ui.StudsOffset=Vector3.new(0,3.2,0)
 ui.AlwaysOnTop=true;ui.Adornee=marker;ui.Parent=marker
 local label=Instance.new("TextLabel")
 label.Size=UDim2.fromScale(1,1);label.BackgroundTransparency=1
 label.Text=won and "거점 점령 성공"or "전투 패배"
 label.TextColor3=Color3.fromRGB(255,255,240);label.TextStrokeTransparency=.18
 label.Font=Enum.Font.GothamBold;label.TextScaled=true;label.Parent=ui
 TweenService:Create(marker,TweenInfo.new(.8,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),
  {Size=Vector3.new(4,4,4),Transparency=1}):Play()
 task.delay(1.2,function()
  if Active[player]==folder then BattleVisual.cleanup(player)end
 end)
end

return BattleVisual
