-- 파일명: roblox-games/cozy-island/server/Game.server.luau
-- 포근섬: 수동 채집 + 주민 자동화 + 기본섬 NPC/몹 + 5거점 정복
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local Lighting=game:GetService("Lighting")
local RunService=game:GetService("RunService")
local AssetService=game:GetService("AssetService")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))
local BattleVisual=require(script.Parent:WaitForChild("BattleVisual"))

local store=DSS:GetDataStore("cozy-island-conquest-v3")
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS
local qaCaptureStore=DSS:GetDataStore("qa-camera-captures-v1")
local qaCaptureRemote=RS:FindFirstChild(C.QACaptureRemoteName or "QACaptureReport")or Instance.new("RemoteEvent")
qaCaptureRemote.Name=C.QACaptureRemoteName or "QACaptureReport";qaCaptureRemote.Parent=RS

local world
local lastRequest,battling,gatherCooldown,qaCaptureLast={},{},{},{}
local mobs={}
local assetCache={}
local ASSETS={Nature=6933438443,City=6933556508,Forest=6432306802}

local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number"and v or d end
local function s(p,k,v)p:SetAttribute(k,math.max(0,math.floor(v)))end
local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function msg(p,t)p:SetAttribute("LastActivity",t)end
local function feedback(p,k)p:SetAttribute("FeedbackEvent",k..":"..tostring(math.floor(os.clock()*1000)))end

local function part(parent,name,size,pos,color,material)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.TopSurface=Enum.SurfaceType.Smooth;x.BottomSurface=Enum.SurfaceType.Smooth;x.Parent=parent;return x
end
local function attach(rootPart,name,size,offset,color,material,shape,rotation)
 local x=Instance.new("Part");x.Name=name;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Massless=true;x.Anchored=false
 local rot=rotation or Vector3.zero
 x.CFrame=rootPart.CFrame*CFrame.new(offset)*CFrame.Angles(math.rad(rot.X),math.rad(rot.Y),math.rad(rot.Z))
 if shape then x.Shape=shape end;x.Parent=rootPart
 local w=Instance.new("WeldConstraint");w.Part0=rootPart;w.Part1=x;w.Parent=x;return x
end
local function stripAsset(root)
 for _,d in ipairs(root:GetDescendants())do
  if d:IsA("LuaSourceContainer")or d:IsA("Tool")or d:IsA("RemoteEvent")or d:IsA("RemoteFunction")then d:Destroy()
  elseif d:IsA("BasePart")then d.Anchored=true;d.CanTouch=false end
 end
 return root
end
local function loadAsset(id)
 if assetCache[id]then return assetCache[id]end
 local ok,result=pcall(AssetService.LoadAssetAsync,AssetService,id)
 if not ok or not result then return nil end
 stripAsset(result);result.Parent=nil;assetCache[id]=result;return result
end
local function assetProp(parent,assetId,keywords,pos,scale,seed)
 local asset=loadAsset(assetId);if not asset then return nil end
 local preferred,all={},{}
 for _,d in ipairs(asset:GetDescendants())do
  if d:IsA("MeshPart")then
   table.insert(all,d);local low=string.lower(d.Name)
   for _,k in ipairs(keywords)do if string.find(low,string.lower(k),1,true)then table.insert(preferred,d);break end end
  end
 end
 local pool=#preferred>0 and preferred or all;if #pool==0 then return nil end
 local t=pool[((seed or 1)-1)%#pool+1];local x=t:Clone();x.Name="AssetProp_"..t.Name;x.Anchored=true;x.CanCollide=false;x.CanTouch=false;x.Size=x.Size*(scale or 1)
 x.CFrame=CFrame.new(pos)*CFrame.Angles(0,math.rad(((seed or 1)*43)%360),0);x.Parent=parent;return x
end
local function decorateHomeAssets(parent,topY)
 task.spawn(function()
  for i=1,40 do
   local a=i/28*math.pi*2;local r=58+(i%5)*19
   assetProp(parent,ASSETS.Nature,{"tree","bush","flower","rock","log","stump"},Vector3.new(math.cos(a)*r,topY+1,math.sin(a)*r),.62+(i%4)*.08,i)
  end
  for i=1,12 do
   local a=i/12*math.pi*2
   assetProp(parent,ASSETS.City,{"bench","lamp","fence","table","trash","sign"},Vector3.new(math.cos(a)*44,topY+1,math.sin(a)*44),.62,i)
  end
 end)
end
local function decorateRemoteIsland(parent,r,topY,index)
 task.spawn(function()
  local pack=index==3 and ASSETS.Forest or ASSETS.Nature
  for i=1,16 do
   local a=i/16*math.pi*2;local radius=34+(i%4)*14
   assetProp(parent,pack,{"tree","bush","rock","log","plant"},Vector3.new(r.Pos.X+math.cos(a)*radius,topY+1,r.Pos.Z+math.sin(a)*radius),.6+(i%3)*.1,index*30+i)
  end
 end)
end

local function label(target,text,color,maxDist)
 local g=Instance.new("BillboardGui");g.Name="WorldLabel";g.Size=UDim2.fromOffset(118,24);g.StudsOffset=Vector3.new(0,4.8,0);g.AlwaysOnTop=false;g.MaxDistance=maxDist or 34;g.LightInfluence=.35;g.Parent=target
 local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundColor3=Color3.fromRGB(25,35,31);t.BackgroundTransparency=.3;t.Text=text;t.TextColor3=color or Color3.new(1,1,1);t.TextScaled=true;t.Font=Enum.Font.GothamBold;t.TextStrokeTransparency=.7;t.Parent=g
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,6);c.Parent=t
end
local function prompt(target,objectText,actionText)
 local pr=Instance.new("ProximityPrompt");pr.ObjectText=objectText;pr.ActionText=actionText;pr.MaxActivationDistance=10;pr.HoldDuration=.15;pr.RequiresLineOfSight=false;pr.Parent=target;return pr
end
local function figure(parent,name,pos,color,accent,scale)
 scale=math.clamp(scale or 1,.72,1.05)
 local skin=Color3.fromRGB(226,190,154)
 local r=part(parent,name,Vector3.new(2.2,5.8,1.8)*scale,pos,color);r.CanCollide=true;r.Transparency=1
 local function add(nm,size,off,col,mat,shape,rot)return attach(r,nm,size*scale,off*scale,col,mat,shape,rot)end
 add("Torso",Vector3.new(2.7,3.1,1.75),Vector3.new(0,.2,0),color,Enum.Material.Fabric,Enum.PartType.Ball)
 add("Waist",Vector3.new(2.35,1.15,1.55),Vector3.new(0,-1.35,0),accent,Enum.Material.Fabric,Enum.PartType.Ball)
 add("Head",Vector3.new(2.2,2.25,2.05),Vector3.new(0,2.55,-.05),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 add("Hair",Vector3.new(2.28,.68,2.1),Vector3.new(0,3.38,.05),Color3.fromRGB(74,55,43),Enum.Material.Fabric,Enum.PartType.Ball)
 add("EyeL",Vector3.new(.2,.27,.14),Vector3.new(-.42,2.68,-1.03),Color3.fromRGB(40,43,43),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 add("EyeR",Vector3.new(.2,.27,.14),Vector3.new(.42,2.68,-1.03),Color3.fromRGB(40,43,43),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 add("ArmL",Vector3.new(2.55,.66,.66),Vector3.new(-1.55,.05,0),color,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,82))
 add("ArmR",Vector3.new(2.55,.66,.66),Vector3.new(1.55,.05,0),color,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,98))
 add("HandL",Vector3.new(.72,.72,.72),Vector3.new(-1.7,-1.08,-.04),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 add("HandR",Vector3.new(.72,.72,.72),Vector3.new(1.7,-1.08,-.04),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 add("LegL",Vector3.new(2.55,.72,.72),Vector3.new(-.63,-2.45,0),accent,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
 add("LegR",Vector3.new(2.55,.72,.72),Vector3.new(.63,-2.45,0),accent,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
 add("ShoeL",Vector3.new(.92,.48,1.3),Vector3.new(-.63,-3.58,-.28),Color3.fromRGB(69,58,51),Enum.Material.SmoothPlastic)
 add("ShoeR",Vector3.new(.92,.48,1.3),Vector3.new(.63,-3.58,-.28),Color3.fromRGB(69,58,51),Enum.Material.SmoothPlastic)
 if name=="Chief"then
  add("ChiefHat",Vector3.new(3.05,.34,3.05),Vector3.new(0,3.72,0),Color3.fromRGB(96,65,45),Enum.Material.Fabric)
  add("ChiefSash",Vector3.new(.34,2.9,1.82),Vector3.new(.52,.12,-.86),Color3.fromRGB(214,176,91),Enum.Material.Fabric,nil,Vector3.new(0,0,-13))
 elseif name=="LumberMaster"then
  add("LumberCap",Vector3.new(2.62,.34,2.55),Vector3.new(0,3.68,0),Color3.fromRGB(64,94,58),Enum.Material.Fabric)
  add("AxeHandle",Vector3.new(3.1,.2,.2),Vector3.new(1.75,-.3,0),Color3.fromRGB(112,78,48),Enum.Material.Wood,Enum.PartType.Cylinder,Vector3.new(0,0,90))
  add("AxeHead",Vector3.new(1.05,.7,.32),Vector3.new(1.75,1.05,0),Color3.fromRGB(132,139,145),Enum.Material.Metal)
 elseif name=="Farmer"then
  add("StrawHat",Vector3.new(3.3,.28,3.3),Vector3.new(0,3.7,0),Color3.fromRGB(205,174,91),Enum.Material.Fabric)
  add("Apron",Vector3.new(2.05,2.35,.16),Vector3.new(0,.0,-.91),Color3.fromRGB(201,188,151),Enum.Material.Fabric)
 elseif name=="Captain"then
  add("ShoulderL",Vector3.new(1.02,.5,1.55),Vector3.new(-1.28,1,0),Color3.fromRGB(86,88,96),Enum.Material.Metal,Enum.PartType.Ball)
  add("ShoulderR",Vector3.new(1.02,.5,1.55),Vector3.new(1.28,1,0),Color3.fromRGB(86,88,96),Enum.Material.Metal,Enum.PartType.Ball)
  add("Belt",Vector3.new(2.5,.3,1.65),Vector3.new(0,-1.15,0),Color3.fromRGB(71,56,48),Enum.Material.SmoothPlastic)
 elseif string.find(name,"Villager",1,true)then
  add("Vest",Vector3.new(2.05,2.15,.16),Vector3.new(0,.1,-.9),accent,Enum.Material.Fabric)
 end
 return r
end
local function tree(parent,pos,scale)
 scale=scale or 1
 local trunk=part(parent,"TreeTrunk",Vector3.new(2.4,8,2.4)*scale,pos+Vector3.new(0,4*scale,0),Color3.fromRGB(106,74,48),Enum.Material.Wood)
 local crown=part(parent,"TreeCrown",Vector3.new(8,8,8)*scale,trunk.Position+Vector3.new(0,6*scale,0),Color3.fromRGB(77,150,78),Enum.Material.Grass);crown.Shape=Enum.PartType.Ball
 return trunk
end
local function rock(parent,pos,scale,color)
 scale=scale or 1;local r=part(parent,"Rock",Vector3.new(6,4,5)*scale,pos+Vector3.new(0,2*scale,0),color or Color3.fromRGB(104,103,108),Enum.Material.Rock)
 r.Orientation=Vector3.new(math.random(-8,8),math.random(0,180),math.random(-8,8));return r
end

local function gather(p,key,amount,text)
 local now=os.clock();gatherCooldown[p]=gatherCooldown[p]or{};local last=gatherCooldown[p][key]or 0
 if now-last<C.GatherCooldownSeconds then return end;gatherCooldown[p][key]=now
 s(p,key,n(p,key,0)+amount);msg(p,text.." +"..amount);feedback(p,"RESOURCE")
end

local function freeResidents(p)return n(p,"Residents",0)-n(p,"WoodWorkers",0)-n(p,"Farmers",0)end
local function hire(p)if n(p,"Coins",0)<10 then msg(p,"주민 고용 코인 부족")return end;s(p,"Coins",n(p,"Coins",0)-10);s(p,"Residents",n(p,"Residents",0)+1);msg(p,"주민 고용")end
local function job(p,key)
 if freeResidents(p)<=0 then msg(p,"배치할 주민 없음")return end
 s(p,key,n(p,key,0)+1);msg(p,key=="WoodWorkers"and"벌목 주민 배치"or"농장 주민 배치")
end
local function barracks(p)
 local lv=n(p,"BarracksLevel",1);local wc=14+lv*8;local fc=10+lv*6;local ic=math.max(0,(lv-1)*4)
 if n(p,"Wood",0)<wc or n(p,"Food",0)<fc or n(p,"Iron",0)<ic then msg(p,string.format("병영 재료 부족 · 나무%d 식량%d 철%d",wc,fc,ic))return end
 s(p,"Wood",n(p,"Wood",0)-wc);s(p,"Food",n(p,"Food",0)-fc);s(p,"Iron",n(p,"Iron",0)-ic);s(p,"BarracksLevel",lv+1);msg(p,"병영 Lv."..(lv+1));feedback(p,"BUILD")
end
local function recruit(p)
 local lv=n(p,"BarracksLevel",1);local fc=4+lv;local wc=2+math.floor(lv/2);local ic=lv>=3 and 1 or 0
 if n(p,"Food",0)<fc or n(p,"Wood",0)<wc or n(p,"Iron",0)<ic then msg(p,"병사 모집 자원 부족")return end
 s(p,"Food",n(p,"Food",0)-fc);s(p,"Wood",n(p,"Wood",0)-wc);s(p,"Iron",n(p,"Iron",0)-ic);s(p,"Troops",n(p,"Troops",0)+1);msg(p,"병사 +1");feedback(p,"BUILD")
end
local function supportPower(p)local total=0;for _,o in ipairs(Players:GetPlayers())do if o~=p and o:GetAttribute("SupportReady")==true then total+=n(o,"Troops",0)*2 end end;return total end
local function broadcastMultiplayerSync(actor)
 local participants=Players:GetPlayers()
 local sharedObjective=0
 local sharedSupportPower=0
 for _,o in ipairs(participants)do
  sharedObjective=math.max(sharedObjective,n(o,"CapturedBases",0))
  if o:GetAttribute("SupportReady")==true then sharedSupportPower+=n(o,"Troops",0)*2 end
 end
 remote:FireAllClients("MULTIPLAYER_SYNC",{
  ActorUserId=actor and actor.UserId or 0,
  ParticipantCount=#participants,
  SharedObjective=sharedObjective,
  SharedSupportPower=sharedSupportPower,
 })
end
local function attackBase(p)
 if battling[p]then msg(p,"전투 중")return end
 local idx=n(p,"NextBaseIndex",1);local b=C.Bases[idx];if not b then msg(p,"5개 거점 정복 완료")return end
 local troops=n(p,"Troops",0);if troops<=0 then msg(p,"병사가 필요해")return end
 battling[p]=true;p:SetAttribute("InBattle",true);p:SetAttribute("BattleTarget",b.Name);p:SetAttribute("BattleEnemy",b.Enemy);p:SetAttribute("BattlePower",troops*(6+n(p,"BarracksLevel",1)*2)+supportPower(p));feedback(p,"HIT");BattleVisual.start(p,idx,troops,C,Style);broadcastMultiplayerSync(p)
 task.spawn(function()
  for i=1,4 do if not p.Parent then battling[p]=nil return end;s(p,"BattleProgress",i*25);task.wait(.55)end
  local power=troops*(6+n(p,"BarracksLevel",1)*2)+supportPower(p);local won=power*(.92+math.random()*.16)>=b.Strength
  local lost=math.max(1,math.floor(troops*(won and .14 or .34)));s(p,"Troops",math.max(0,n(p,"Troops",0)-lost))
  if won then s(p,b.Reward,n(p,b.Reward,0)+b.Amount);s(p,"Coins",n(p,"Coins",0)+b.Coins);s(p,"CapturedBases",n(p,"CapturedBases",0)+1);if b.IslandFinal then s(p,"CapturedIslands",n(p,"CapturedIslands",0)+1)end;s(p,"NextBaseIndex",idx+1);msg(p,b.Name.." 점령!");feedback(p,"CAPTURE")
  else msg(p,b.Name.." 패배 · 병력/병영을 강화해");feedback(p,"HIT")end
  s(p,"BattleProgress",0);p:SetAttribute("InBattle",false);p:SetAttribute("BattleTarget","");battling[p]=nil;BattleVisual.finish(p,won);broadcastMultiplayerSync(p)
 end)
end

local function spawnMob(kind,pos)
 local folder=world:FindFirstChild("HomeMobs")or Instance.new("Folder");folder.Name="HomeMobs";folder.Parent=world
 local isRaider=kind=="RAIDER";local hp=isRaider and C.HomeIslandMobs.RaiderHP or C.HomeIslandMobs.BoarHP
 local damage=isRaider and C.HomeIslandMobs.RaiderDamage or C.HomeIslandMobs.BoarDamage
 local r=part(folder,isRaider and"IslandRaider"or"WildBoar",isRaider and Vector3.new(3.2,5.4,2.5)or Vector3.new(5.4,3.2,6.5),pos,isRaider and Color3.fromRGB(137,75,66)or Color3.fromRGB(113,83,64),Enum.Material.SmoothPlastic)
 r.CanCollide=true;r.Transparency=1
 if isRaider then
  local skin=Color3.fromRGB(211,174,141);local cloth=Color3.fromRGB(117,69,62);local dark=Color3.fromRGB(60,53,52)
  attach(r,"RaiderTorso",Vector3.new(2.9,3.4,1.9),Vector3.new(0,-.45,0),cloth,Enum.Material.Fabric,Enum.PartType.Ball)
  attach(r,"RaiderHead",Vector3.new(2.3,2.35,2.2),Vector3.new(0,2.15,-.1),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  attach(r,"RaiderHood",Vector3.new(2.55,1.05,2.45),Vector3.new(0,2.95,.05),dark,Enum.Material.Fabric,Enum.PartType.Ball)
  attach(r,"RaiderArmL",Vector3.new(2.8,.72,.72),Vector3.new(-1.75,-.45,0),cloth,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,82))
  attach(r,"RaiderArmR",Vector3.new(2.8,.72,.72),Vector3.new(1.75,-.45,0),cloth,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,98))
  attach(r,"RaiderLegL",Vector3.new(2.7,.82,.82),Vector3.new(-.72,-2.8,0),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
  attach(r,"RaiderLegR",Vector3.new(2.7,.82,.82),Vector3.new(.72,-2.8,0),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
 else
  local fur=Color3.fromRGB(105,76,58);local dark=Color3.fromRGB(69,52,45);local muzzle=Color3.fromRGB(143,98,73)
  attach(r,"BoarBody",Vector3.new(5.5,3.25,6.5),Vector3.new(0,-1.85,.25),fur,Enum.Material.Fabric,Enum.PartType.Ball)
  attach(r,"BoarShoulder",Vector3.new(5.15,3.5,4.2),Vector3.new(0,-1.65,-1.25),Color3.fromRGB(116,83,62),Enum.Material.Fabric,Enum.PartType.Ball)
  attach(r,"BoarHead",Vector3.new(3.45,2.85,3.3),Vector3.new(0,-1.25,-3.65),fur,Enum.Material.Fabric,Enum.PartType.Ball)
  attach(r,"BoarSnout",Vector3.new(2.5,1.45,1.65),Vector3.new(0,-1.5,-5.25),muzzle,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  attach(r,"BoarNose",Vector3.new(1.45,.8,.32),Vector3.new(0,-1.45,-6.05),Color3.fromRGB(78,55,51),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  attach(r,"BoarEarL",Vector3.new(.75,1.15,.6),Vector3.new(-1.15,.12,-3.45),dark,Enum.Material.Fabric,nil,Vector3.new(0,0,-20))
  attach(r,"BoarEarR",Vector3.new(.75,1.15,.6),Vector3.new(1.15,.12,-3.45),dark,Enum.Material.Fabric,nil,Vector3.new(0,0,20))
  for _,x in ipairs({-1.55,1.55})do for _,z in ipairs({-1.65,1.65})do
   attach(r,"BoarLeg",Vector3.new(2.1,.72,.72),Vector3.new(x,-3.65,z),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
   attach(r,"BoarHoof",Vector3.new(.85,.5,1),Vector3.new(x,-4.58,z-.12),Color3.fromRGB(49,43,39),Enum.Material.SmoothPlastic)
  end end
  attach(r,"BoarTail",Vector3.new(1.8,.3,.3),Vector3.new(0,-1.35,3.45),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,25,35))
  attach(r,"TuskL",Vector3.new(.34,.34,1.15),Vector3.new(-.92,-1.58,-5.8),Color3.fromRGB(235,225,195),Enum.Material.SmoothPlastic,nil,Vector3.new(-18,0,0))
  attach(r,"TuskR",Vector3.new(.34,.34,1.15),Vector3.new(.92,-1.58,-5.8),Color3.fromRGB(235,225,195),Enum.Material.SmoothPlastic,nil,Vector3.new(-18,0,0))
 end
 label(r,isRaider and"섬 약탈병"or"멧돼지",isRaider and Color3.fromRGB(255,166,142)or Color3.fromRGB(240,222,180),28)
 local pr=prompt(r,isRaider and"섬 약탈병"or"멧돼지","공격")
 local e={part=r,kind=kind,hp=hp,max=hp,damage=damage,spawn=pos,lastHit=0};table.insert(mobs,e);r:SetAttribute("HP",hp)
 pr.Triggered:Connect(function(p)
  if e.hp<=0 then return end;e.hp-=25+n(p,"BarracksLevel",1)*2;r:SetAttribute("HP",math.max(0,e.hp));feedback(p,"HIT")
  if e.hp<=0 then
   if kind=="RAIDER"then s(p,"Coins",n(p,"Coins",0)+8);s(p,"Wood",n(p,"Wood",0)+2);msg(p,"약탈병 처치 · 코인+8 나무+2")
   else s(p,"Food",n(p,"Food",0)+4);msg(p,"멧돼지 처치 · 식량+4")end
   r:Destroy();task.delay(C.HomeIslandMobs.RespawnSeconds,function()if world and world.Parent then spawnMob(kind,pos)end end)
  end
 end)
 return e
end

local function buildWorld()
 local old=workspace:FindFirstChild("CozyConquestWorld");if old then old:Destroy()end
 world=Instance.new("Folder");world.Name="CozyConquestWorld";world.Parent=workspace
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 local terrain=workspace.Terrain
 local seaLevel=Style.SeaLevel or 2
 terrain.WaterColor=Style.Water
 terrain.WaterTransparency=.22
 terrain.WaterWaveSize=.14
 terrain.WaterWaveSpeed=9
 terrain:FillBlock(CFrame.new(0,seaLevel-10,0),Vector3.new(940,20,940),Enum.Material.Water)
 workspace:SetAttribute("SeaSwimmable",true)
 for index,r in ipairs(Style.Regions)do
  local island=part(world,r.Name,r.Size,r.Pos,r.Color,r.Material);label(island,r.Name,r.Accent,58)
  local topY=r.Pos.Y+r.Size.Y/2
  local base=part(world,"Base_"..index,Vector3.new(22,9,22),Vector3.new(r.Pos.X,topY+4.5,r.Pos.Z),r.Accent,Enum.Material.Brick)
  part(world,"Roof_"..index,Vector3.new(26,2,26),base.Position+Vector3.new(0,5.5,0),Style.Banner,Enum.Material.WoodPlanks)
  if index~=1 then decorateRemoteIsland(world,r,topY,index)end
  if index==1 then
   part(world,"BeachShelf",Vector3.new(196,1.6,196),Vector3.new(0,seaLevel-12,0),Color3.fromRGB(220,203,151),Enum.Material.Sand)
   part(world,"VillagePlaza",Vector3.new(60,1,60),Vector3.new(0,topY+.55,4),Color3.fromRGB(166,154,128),Enum.Material.Cobblestone)
   part(world,"FarmPlot",Vector3.new(38,1,28),Vector3.new(-36,topY+.7,-31),Color3.fromRGB(116,91,56),Enum.Material.Ground)
   part(world,"BarracksYard",Vector3.new(40,1,30),Vector3.new(39,topY+.65,-29),Color3.fromRGB(132,121,103),Enum.Material.Cobblestone)
   part(world,"Dock",Vector3.new(18,2,38),Vector3.new(0,topY-1,78),Color3.fromRGB(125,89,56),Enum.Material.WoodPlanks)
   for _,x in ipairs({-7,7})do for _,z in ipairs({62,78,94})do part(world,"DockPost",Vector3.new(1.2,7,1.2),Vector3.new(x,topY-4,z),Color3.fromRGB(91,63,42),Enum.Material.Wood)end end
   local boat=part(world,"VillageBoat",Vector3.new(9,1.4,15),Vector3.new(23,topY-4.2,82),Color3.fromRGB(116,78,49),Enum.Material.WoodPlanks);boat.Orientation=Vector3.new(0,18,4);boat.CanCollide=false
   for _,x in ipairs({-72,-54,-36,-18,0,18,36,54,72})do part(world,"Path",Vector3.new(12,.5,6),Vector3.new(x,topY+.5,0),Color3.fromRGB(174,165,139),Enum.Material.Cobblestone)end
   for _,z in ipairs({-66,-44,-22,22,44,66})do part(world,"Path",Vector3.new(6,.5,12),Vector3.new(0,topY+.5,z),Color3.fromRGB(174,165,139),Enum.Material.Cobblestone)end

   local forest=Instance.new("Folder");forest.Name="ManualGatherForest";forest.Parent=world
   for i=1,14 do
    local x=-72+((i-1)%4)*18;local z=18+math.floor((i-1)/4)*17
    local trunk=tree(forest,Vector3.new(x,topY,z),.72+(i%3)*.08);trunk.Name="WoodNode"..i;label(trunk,"나무",Color3.fromRGB(200,238,188),18)
    prompt(trunk,"나무","벌목").Triggered:Connect(function(p)gather(p,"Wood",C.ManualGatherAmount,"벌목")end)
   end
   local farm=Instance.new("Folder");farm.Name="ManualGatherFarm";farm.Parent=world
   for i=1,10 do
    local row=math.floor((i-1)/5);local col=(i-1)%5
    local crop=part(farm,"FoodNode"..i,Vector3.new(5,2.4,5),Vector3.new(-52+col*8,topY+1.9,-38+row*12),Color3.fromRGB(127,182,72),Enum.Material.Grass)
    crop.Shape=Enum.PartType.Ball;label(crop,"작물",Color3.fromRGB(231,242,163),17)
    prompt(crop,"작물","수확").Triggered:Connect(function(p)gather(p,"Food",C.ManualGatherAmount,"수확")end)
   end

   decorateHomeAssets(world,topY)
   local npcs=Instance.new("Folder");npcs.Name="HomeNPCs";npcs.Parent=world
   local chief=figure(npcs,"Chief",Vector3.new(0,topY+6,8),Color3.fromRGB(157,109,73),Color3.fromRGB(77,67,57),1);label(chief,"마을 이장",Color3.fromRGB(255,221,145),30);prompt(chief,"마을 이장","주민 고용").Triggered:Connect(hire)
   local lumber=figure(npcs,"LumberMaster",Vector3.new(-32,topY+6,14),Color3.fromRGB(86,126,78),Color3.fromRGB(67,76,58),.9);label(lumber,"벌목반장",Color3.fromRGB(202,239,189),26);prompt(lumber,"벌목반장","주민 배치").Triggered:Connect(function(p)job(p,"WoodWorkers")end)
   local farmer=figure(npcs,"Farmer",Vector3.new(-30,topY+6,-12),Color3.fromRGB(168,139,73),Color3.fromRGB(83,76,55),.9);label(farmer,"농장주",Color3.fromRGB(242,226,151),26);prompt(farmer,"농장주","주민 배치").Triggered:Connect(function(p)job(p,"Farmers")end)
   local captain=figure(npcs,"Captain",Vector3.new(36,topY+6,-12),Color3.fromRGB(111,87,75),Color3.fromRGB(68,66,70),.95);label(captain,"병영대장",Color3.fromRGB(235,194,153),26);prompt(captain,"병영대장","병영 강화").Triggered:Connect(barracks)
   for i=1,5 do local a=i/5*math.pi*2;local vill=figure(npcs,"Villager"..i,Vector3.new(math.cos(a)*24,topY+6,28+math.sin(a)*17),Color3.fromRGB(100+i*9,120+i*5,93+i*4),Color3.fromRGB(65,70,61),.78);label(vill,"주민",Color3.fromRGB(235,238,225),18)end

   for i=1,5 do spawnMob("BOAR",Vector3.new(-58+i*18,topY+4,62+(i%2)*8))end
   for i=1,3 do spawnMob("RAIDER",Vector3.new(42+i*11,topY+5,46+(i%2)*14))end
  elseif index==2 then
   for i=1,18 do local a=i/18*math.pi*2;rock(world,r.Pos+Vector3.new(math.cos(a)*40,topY-r.Pos.Y,math.sin(a)*40),.7+(i%3)*.14,Color3.fromRGB(86,91,101))end
   for i=1,7 do part(world,"IronVein",Vector3.new(4,7,4),Vector3.new(r.Pos.X-35+i*10,topY+3,r.Pos.Z+27),Color3.fromRGB(145,158,171),Enum.Material.Metal)end
  elseif index==3 then
   for i=1,14 do tree(world,r.Pos+Vector3.new(-55+i*8,topY-r.Pos.Y,34+(i%3)*9),.7)end
   for i=1,8 do local bale=part(world,"HayBale",Vector3.new(6,5,6),Vector3.new(r.Pos.X-42+i*10,topY+2.5,r.Pos.Z-31+(i%2)*8),Color3.fromRGB(214,183,96),Enum.Material.Fabric);bale.Shape=Enum.PartType.Cylinder;bale.Orientation=Vector3.new(0,0,90)end
  elseif index==4 then
   for i=1,24 do local a=i/24*math.pi*2;rock(world,r.Pos+Vector3.new(math.cos(a)*(32+(i%3)*9),topY-r.Pos.Y,math.sin(a)*(32+(i%3)*9)),.65+(i%4)*.12)end
  elseif index==5 then
   for i=1,12 do rock(world,r.Pos+Vector3.new(-52+i*8,topY-r.Pos.Y,30+(i%2)*13),.62,Color3.fromRGB(159,124,69))end
   for i=1,6 do part(world,"GoldVein",Vector3.new(4,6,4),Vector3.new(r.Pos.X-33+i*11,topY+3,r.Pos.Z-30),Color3.fromRGB(244,197,71),Enum.Material.Neon)end
  else
   for i=1,20 do local a=i/20*math.pi*2;rock(world,r.Pos+Vector3.new(math.cos(a)*(36+(i%2)*11),topY-r.Pos.Y,math.sin(a)*(36+(i%2)*11)),.7,Color3.fromRGB(57,55,59))end
   for i=1,8 do part(world,"SulfurVent",Vector3.new(4,8,4),Vector3.new(r.Pos.X-40+i*10,topY+4,r.Pos.Z+28),Color3.fromRGB(239,163,53),Enum.Material.Neon)end
  end
 end
 workspace:SetAttribute("WorldArtPass","COZY_STYLIZED_ASSET_WORLD_V7")
end

local function init(p)
 for k,v in pairs(C.InitialState)do p:SetAttribute(k,v)end
 p:SetAttribute("SupportReady",false);p:SetAttribute("InBattle",false);msg(p,"나무/작물에 가까이 가서 직접 채집해.")
 local h=hum(p);if h then h.MaxHealth=100;h.Health=100 end
end
local function load(p)
 init(p);local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
 if ok and typeof(d)=="table"then for k,v in pairs(C.InitialState)do if typeof(d[k])=="number"then p:SetAttribute(k,d[k])end end;if typeof(d.SupportReady)=="boolean"then p:SetAttribute("SupportReady",d.SupportReady)end end
end
local function save(p)local d={SupportReady=p:GetAttribute("SupportReady")==true};for k in pairs(C.InitialState)do d[k]=p:GetAttribute(k)end;pcall(function()store:SetAsync("p:"..p.UserId,d)end)end

local H={
 [C.Actions.HIRE]=hire,[C.Actions.WOOD_JOB]=function(p)job(p,"WoodWorkers")end,[C.Actions.FOOD_JOB]=function(p)job(p,"Farmers")end,
 [C.Actions.BARRACKS]=barracks,[C.Actions.RECRUIT]=recruit,[C.Actions.ATTACK]=attackBase,
 [C.Actions.SUPPORT]=function(p)p:SetAttribute("SupportReady",not(p:GetAttribute("SupportReady")==true));msg(p,p:GetAttribute("SupportReady")and"원정지원 ON"or"원정지원 OFF")end,
}
remote.OnServerEvent:Connect(function(p,a)
 if typeof(a)~="string"or not H[a]then return end
 local now=os.clock();if now-(lastRequest[p]or 0)<C.RateLimitSeconds then return end
 lastRequest[p]=now
 H[a](p)
 broadcastMultiplayerSync(p)
end)

Players.PlayerAdded:Connect(function(p)load(p);p.CharacterAdded:Connect(function(c)local h=c:WaitForChild("Humanoid");h.MaxHealth=100;h.Health=100 end)end)
for _,p in ipairs(Players:GetPlayers())do load(p)end
Players.PlayerRemoving:Connect(function(p)save(p);lastRequest[p]=nil;battling[p]=nil;gatherCooldown[p]=nil;qaCaptureLast[p]=nil;BattleVisual.cleanup(p)end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

task.spawn(function()
 while true do task.wait(C.AutomationTickSeconds)
  for _,p in ipairs(Players:GetPlayers())do
   local w=n(p,"WoodWorkers",0);local f=n(p,"Farmers",0)
   if w>0 then s(p,"Wood",n(p,"Wood",0)+w)end;if f>0 then s(p,"Food",n(p,"Food",0)+f)end
  end
 end
end)

RunService.Heartbeat:Connect(function(dt)
 local now=os.clock()
 for _,p in ipairs(Players:GetPlayers())do
  local h=hum(p)
  if h and h.FloorMaterial==Enum.Material.Water and h:GetState()~=Enum.HumanoidStateType.Swimming then h:ChangeState(Enum.HumanoidStateType.Swimming)end
 end
 for i=#mobs,1,-1 do
  local e=mobs[i]
  if not e.part or not e.part.Parent or e.hp<=0 then table.remove(mobs,i)
  else
   local target,bd=nil,28
   for _,p in ipairs(Players:GetPlayers())do local r=root(p);local h=hum(p);if r and h and h.Health>0 then local d=(r.Position-e.part.Position).Magnitude;if d<bd then target=p;bd=d end end end
   if target then
    local tr=root(target);local d=Vector3.new(tr.Position.X-e.part.Position.X,0,tr.Position.Z-e.part.Position.Z)
    if d.Magnitude>4 then e.part.CFrame=e.part.CFrame+d.Unit*math.min(d.Magnitude,(e.kind=="RAIDER"and 8 or 6)*dt)end
    if(tr.Position-e.part.Position).Magnitude<=5 and now-e.lastHit>1.4 then e.lastHit=now;local h=hum(target);if h then h:TakeDamage(e.damage)end end
   else
    local back=Vector3.new(e.spawn.X-e.part.Position.X,0,e.spawn.Z-e.part.Position.Z);if back.Magnitude>3 then e.part.CFrame=e.part.CFrame+back.Unit*math.min(back.Magnitude,6*dt)end
   end
   if(e.part.Position-e.spawn).Magnitude>42 then e.part.CFrame=CFrame.new(e.spawn)end
  end
 end
end)

qaCaptureRemote.OnServerEvent:Connect(function(p,labelName,value)
 if C.QACameraEnabled~=true then return end;local raw=tostring(value or"");if typeof(labelName)~="string"or#raw<1 or#raw>160 then return end
 local isStatus=labelName=="STATUS";if not isStatus and not raw:match("^%d+$")then return end;local now=os.clock();if now-(qaCaptureLast[p]or 0)<.18 then return end;qaCaptureLast[p]=now
 local rec={gameId=C.GameId,label=labelName,userId=p.UserId,capturedAt=os.time(),kind=isStatus and"STATUS"or"CAPTURE"};if isStatus then rec.status=raw else rec.assetId=raw end
 pcall(function()qaCaptureStore:UpdateAsync("latest",function(old)local d=typeof(old)=="table"and old or{captures={}};d.captures=typeof(d.captures)=="table"and d.captures or{};table.insert(d.captures,rec);while#d.captures>30 do table.remove(d.captures,1)end;d.updatedAt=os.time();d.gameId=C.GameId;return d end)end)
end)

buildWorld()
