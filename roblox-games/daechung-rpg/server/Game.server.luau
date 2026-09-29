-- 파일명: roblox-games/daechung-rpg/server/Game.server.luau
-- 대충 RPG: 마을 허브 + 포탈 전투 + 보스 수집형 AI 동료 파티
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local AssetService=game:GetService("AssetService")
local TweenService=game:GetService("TweenService")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))

-- 네트워크 Remote는 로컬 exact Studio에서도 먼저 준비해서 클라이언트 부팅을 막지 않는다.
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS
local qaCaptureRemote=RS:FindFirstChild(C.QACaptureRemoteName or "QACaptureReport")or Instance.new("RemoteEvent")
qaCaptureRemote.Name=C.QACaptureRemoteName or "QACaptureReport";qaCaptureRemote.Parent=RS
local foundationRemote=RS:FindFirstChild("RuntimeFoundationReport")or Instance.new("RemoteEvent")
foundationRemote.Name="RuntimeFoundationReport";foundationRemote.Parent=RS

-- 미게시 로컬 exact Place에서는 GetDataStore 자체가 실패할 수 있다.
-- 배포 Place에서는 기존 DataStore 이름과 저장 구조를 그대로 사용한다.
local store
local qaCaptureStore
local foundationStore
do
 local ok,value=pcall(function()return DSS:GetDataStore("daechung-rpg-portal-v1")end);if ok then store=value end
 ok,value=pcall(function()return DSS:GetDataStore("qa-camera-captures-v1")end);if ok then qaCaptureStore=value end
 ok,value=pcall(function()return DSS:GetDataStore("native-foundation-sentinel-v1")end);if ok then foundationStore=value end
end
local qaCaptureLast={}

local world
local foundationSpawn
local enemies={}
local aiUsers={}
local activeCompanions={}
local parties={}
local clickTimes={}
local lastRequest={}
local lastBlockRequest={}
local lastCombat={}
local movementProbeStart={}
local foundationSeen={}
local foundationSequence=0
local foundationLast={}
local assetCache={}
local meadowRunCounter=0
local meadowRunState={seed=0,hiddenBossId="",generated=false}
local generateMeadowRun
local meadowPlayersInside
local ASSETS={Nature=6933438443,City=6933556508,Dungeon=6934021345,StonePortal=12931228293,MedievalArmor=C.MedievalCharacterAssetId,MedievalHouseA=C.MedievalHouseAssetIds[1],MedievalHouseB=C.MedievalHouseAssetIds[2]}

local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number"and v or d end
local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function feedback(p,k)p:SetAttribute("FeedbackEvent",k..":"..tostring(math.floor(os.clock()*1000)))end
local function msg(p,t)p:SetAttribute("LastAction",t)end
local function portalDef(id)for _,z in ipairs(C.Portals)do if z.Id==id then return z end end end
local function classDef(id)return C.Classes[tostring(id or"")]end
local function advancementDef(classId,advId)
 local c=classDef(classId);if not c then return nil end
 for _,a in pairs(c.Advancements or{})do if a.Id==advId then return a end end
 return nil
end
local function classDisplay(classId,advId,secondId)
 local a=advancementDef(classId,advId)
 if a and secondId~=""and a.SecondId==secondId then return a.SecondName or a.Name end
 if a then return a.Name end
 local c=classDef(classId);return c and c.Name or"직업 미선택"
end
local function loadFoundationState()
 if not foundationStore then return end
 local ok,old=pcall(function()return foundationStore:GetAsync("latest")end)
 if not ok or typeof(old)~="table"then return end
 if tostring(old.gameId or"")~=tostring(C.GameId)or tonumber(old.placeId)~=game.PlaceId or tonumber(old.placeVersion)~=game.PlaceVersion then return end
 local checkpoints=typeof(old.checkpoints)=="table"and old.checkpoints or{}
 for name,row in pairs(checkpoints)do
  foundationSeen[name]=true
  foundationSequence=math.max(foundationSequence,math.floor(tonumber(row.sequence)or 0))
 end
 foundationSequence=math.max(foundationSequence,math.floor(tonumber(old.sequence)or 0))
end
local function foundationCheckpoint(name,p,extra)
 if foundationSeen[name]then return true end
 if not foundationStore then return false end
 local payload={name=name,at=os.time(),userId=p and p.UserId or 0,gameId=C.GameId,placeId=tostring(game.PlaceId),placeVersion=game.PlaceVersion}
 if typeof(extra)=="table"then for k,v in pairs(extra)do if typeof(v)=="number"or typeof(v)=="string"or typeof(v)=="boolean"then payload[k]=v end end end
 local committedSequence=foundationSequence
 local lastError=nil
 for attempt=1,4 do
  local ok,err=pcall(function()
   foundationStore:UpdateAsync("latest",function(old)
    local exact=typeof(old)=="table"and tonumber(old.placeVersion)==game.PlaceVersion and tonumber(old.placeId)==game.PlaceId and tostring(old.gameId or"")==tostring(C.GameId)
    local data=exact and old or{version=3,gameId=C.GameId,placeId=tostring(game.PlaceId),placeVersion=game.PlaceVersion,checkpoints={},sequence=0}
    data.version=3;data.gameId=C.GameId;data.placeId=tostring(game.PlaceId);data.placeVersion=game.PlaceVersion;data.updatedAt=os.time()
    data.requirements={saveEnabled=C.SaveEnabled==true,multiplayerRequired=C.MultiplayerRequired==true}
    data.checkpoints=typeof(data.checkpoints)=="table"and data.checkpoints or{}
    if typeof(data.checkpoints[name])=="table"then committedSequence=math.floor(tonumber(data.checkpoints[name].sequence)or foundationSequence);return data end
    committedSequence=math.max(foundationSequence,math.floor(tonumber(data.sequence)or 0))+1
    local row={};for k,v in pairs(payload)do row[k]=v end;row.sequence=committedSequence
    data.sequence=committedSequence;data.checkpoints[name]=row
    return data
   end)
  end)
  if ok then
   foundationSeen[name]=true;foundationSequence=math.max(foundationSequence,committedSequence)
   workspace:SetAttribute("Foundation_"..name,true)
   return true
  end
  lastError=err
  if attempt<4 then task.wait(.15*attempt)end
 end
 if p then p:SetAttribute("FoundationFailure","CHECKPOINT_WRITE_FAILED:"..name)end
 warn("Foundation checkpoint write failed",name,lastError)
 return false
end
loadFoundationState()
foundationCheckpoint("SERVER_BOOT",nil,{placeVersion=game.PlaceVersion})
foundationCheckpoint("MODULE_GRAPH_READY",nil,{modulesReady=true})

local function ppart(parent,name,size,pos,color,material)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color
 x.Material=material or Enum.Material.SmoothPlastic;x.TopSurface=Enum.SurfaceType.Smooth;x.BottomSurface=Enum.SurfaceType.Smooth;x.Parent=parent
 return x
end
local function attach(rootPart,name,size,offset,color,material,shape,rotation)
 local x=Instance.new("Part");x.Name=name;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Massless=true;x.Anchored=false
 local rot=rotation or Vector3.zero
 x.CFrame=rootPart.CFrame*CFrame.new(offset)*CFrame.Angles(math.rad(rot.X),math.rad(rot.Y),math.rad(rot.Z))
 if shape then x.Shape=shape end;x.Parent=rootPart
 local w=Instance.new("WeldConstraint");w.Part0=rootPart;w.Part1=x;w.Parent=x
 return x
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
local function chooseMesh(assetId,keywords,seed)
 local rootAsset=loadAsset(assetId);if not rootAsset then return nil end
 local preferred,all={},{}
 for _,d in ipairs(rootAsset:GetDescendants())do
  if d:IsA("MeshPart")then
   table.insert(all,d);local low=string.lower(d.Name)
   for _,k in ipairs(keywords)do if string.find(low,string.lower(k),1,true)then table.insert(preferred,d);break end end
  end
 end
 local pool=#preferred>0 and preferred or all;if #pool==0 then return nil end
 return pool[((seed or 1)-1)%#pool+1]
end
local function assetProp(parent,assetId,keywords,pos,scale,seed,collide)
 local t=chooseMesh(assetId,keywords,seed);if not t then return nil end
 local x=t:Clone();x.Name="AssetProp_"..t.Name;x.Anchored=true;x.CanCollide=collide==true;x.CanTouch=false;x.Size=x.Size*(scale or 1)
 x.CFrame=CFrame.new(pos)*CFrame.Angles(0,math.rad(((seed or 1)*41)%360),0);x.Parent=parent;return x
end
local function wholeAsset(parent,assetId,pos,scale,name,yaw)
 local t=loadAsset(assetId);if not t then return nil end
 local x=t:Clone();x.Name=name or("AssetModel_"..assetId);stripAsset(x);x.Parent=parent
 pcall(function()x:ScaleTo(scale or 1)end);pcall(function()x:PivotTo(CFrame.new(pos)*CFrame.Angles(0,math.rad(yaw or 0),0))end);return x
end
local function decorateVillageAssets(parent)
 task.spawn(function()
  for i=1,24 do
   local a=i/24*math.pi*2;local r=94+(i%3)*18
   assetProp(parent,ASSETS.Nature,{"tree","bush","flower","rock","log"},Vector3.new(math.cos(a)*r,2,math.sin(a)*r),.65+(i%4)*.08,i,false)
  end
  for i=1,12 do
   local a=i/12*math.pi*2
   assetProp(parent,ASSETS.City,{"bench","lamp","fence","trash","sign","table"},Vector3.new(math.cos(a)*58,2,math.sin(a)*58),.65,i,false)
  end
 end)
end
local function decorateZoneAssets(parent,z)
 task.spawn(function()
  local pack=(z.Theme=="MEADOW"or z.Theme=="SNOW")and ASSETS.Nature or ASSETS.Dungeon
  local keys=(pack==ASSETS.Nature)and{"tree","bush","rock","log","plant"}or{"rock","rune","pillar","wall","bridge","crate","barrel"}
  for i=1,34 do
   local a=i/34*math.pi*2;local r=72+(i%7)*20
   assetProp(parent,pack,keys,z.Center+Vector3.new(math.cos(a)*r,2,math.sin(a)*r),.7+(i%5)*.07,i,false)
  end
 end)
end

local function label(target,text,color,maxDistance)
 local g=Instance.new("BillboardGui");g.Name="WorldLabel";g.Size=UDim2.fromOffset(128,24);g.StudsOffset=Vector3.new(0,4.8,0)
 g.AlwaysOnTop=false;g.MaxDistance=maxDistance or 34;g.LightInfluence=.35;g.Parent=target
 local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundColor3=Color3.fromRGB(22,24,29);t.BackgroundTransparency=.28
 t.Text=text;t.TextColor3=color or Color3.new(1,1,1);t.TextStrokeTransparency=.72;t.TextScaled=true;t.Font=Enum.Font.GothamBold;t.Parent=g
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,5);c.Parent=t
 return g
end
local function prompt(target,objectText,actionText)
 local p=Instance.new("ProximityPrompt");p.ObjectText=objectText;p.ActionText=actionText;p.MaxActivationDistance=11;p.HoldDuration=.12
 p.RequiresLineOfSight=false;p.Parent=target;return p
end
local function humanoidFigure(parent,name,pos,color,accent,scale)
 scale=math.clamp(scale or 1,.74,1.06)
 local skin=Color3.fromRGB(218,181,145)
 local r=ppart(parent,name,Vector3.new(2.2,6.4,1.8)*scale,pos,color,Enum.Material.SmoothPlastic);r.CanCollide=true;r.Transparency=1
 local function add(nm,size,off,col,mat,shape,rot)return attach(r,nm,size*scale,off*scale,col,mat,shape,rot)end
 add("RPGChest",Vector3.new(3,3.35,1.95),Vector3.new(0,.35,0),color,Enum.Material.Fabric)
 add("RPGWaist",Vector3.new(2.35,.8,1.7),Vector3.new(0,-1.45,0),accent,Enum.Material.Fabric)
 add("RPGHead",Vector3.new(2.05,2.25,2),Vector3.new(0,2.75,-.05),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 add("RPGEyeL",Vector3.new(.18,.22,.12),Vector3.new(-.4,2.82,-1.02),Color3.fromRGB(31,35,40),Enum.Material.Neon,Enum.PartType.Ball)
 add("RPGEyeR",Vector3.new(.18,.22,.12),Vector3.new(.4,2.82,-1.02),Color3.fromRGB(31,35,40),Enum.Material.Neon,Enum.PartType.Ball)
 add("RPGHairBack",Vector3.new(2.2,1.05,2.15),Vector3.new(0,3.55,.2),Color3.fromRGB(55,43,40),Enum.Material.Fabric,Enum.PartType.Ball)
 add("RPGArmL",Vector3.new(3,.64,.64),Vector3.new(-1.75,.15,0),color,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,82))
 add("RPGArmR",Vector3.new(3,.64,.64),Vector3.new(1.75,.15,0),color,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,98))
 add("RPGGloveL",Vector3.new(.72,.72,.72),Vector3.new(-1.92,-1.2,-.03),accent,Enum.Material.Fabric,Enum.PartType.Ball)
 add("RPGGloveR",Vector3.new(.72,.72,.72),Vector3.new(1.92,-1.2,-.03),accent,Enum.Material.Fabric,Enum.PartType.Ball)
 add("RPGLegL",Vector3.new(2.8,.72,.72),Vector3.new(-.65,-2.7,0),accent,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
 add("RPGLegR",Vector3.new(2.8,.72,.72),Vector3.new(.65,-2.7,0),accent,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
 add("RPGBootL",Vector3.new(.95,.65,1.45),Vector3.new(-.65,-3.95,-.3),Color3.fromRGB(54,46,43),Enum.Material.Fabric)
 add("RPGBootR",Vector3.new(.95,.65,1.45),Vector3.new(.65,-3.95,-.3),Color3.fromRGB(54,46,43),Enum.Material.Fabric)
 if name=="VillageChief"then
  add("ChiefCape",Vector3.new(3,3.25,.22),Vector3.new(0,.25,1.05),Color3.fromRGB(88,48,43),Enum.Material.Fabric)
  add("ChiefPauldrons",Vector3.new(5.1,.72,2.1),Vector3.new(0,1.2,0),Color3.fromRGB(116,98,76),Enum.Material.Metal)
  add("ChiefCrownBand",Vector3.new(2.3,.4,2.2),Vector3.new(0,3.75,0),Color3.fromRGB(185,144,61),Enum.Material.Metal)
 elseif name=="WeaponMerchant"then
  add("WeaponHarness",Vector3.new(.32,3.5,2),Vector3.new(-.5,.2,-1),Color3.fromRGB(104,70,48),Enum.Material.Fabric,nil,Vector3.new(0,0,12))
  add("Sword",Vector3.new(4.3,.28,.28),Vector3.new(2,-.2,.2),Color3.fromRGB(178,184,194),Enum.Material.Metal,Enum.PartType.Cylinder,Vector3.new(0,0,90))
  add("SwordGuard",Vector3.new(1.35,.26,.32),Vector3.new(2,1.6,.2),Color3.fromRGB(201,157,72),Enum.Material.Metal)
 elseif name=="ArmorMerchant"then
  add("ArmorChest",Vector3.new(3.15,2.2,2.05),Vector3.new(0,.45,-.08),Color3.fromRGB(102,112,120),Enum.Material.Metal)
  add("ShoulderL",Vector3.new(1.35,.7,1.8),Vector3.new(-1.65,1.15,0),Color3.fromRGB(92,103,110),Enum.Material.Metal,Enum.PartType.Ball)
  add("ShoulderR",Vector3.new(1.35,.7,1.8),Vector3.new(1.65,1.15,0),Color3.fromRGB(92,103,110),Enum.Material.Metal,Enum.PartType.Ball)
 elseif name=="VillageHealer"then
  add("HealerHood",Vector3.new(2.8,1.25,2.75),Vector3.new(0,3.25,.1),Color3.fromRGB(183,209,226),Enum.Material.Fabric,Enum.PartType.Ball)
  add("HealerStaff",Vector3.new(.35,6,.35),Vector3.new(2.15,-.4,0),Color3.fromRGB(101,75,56),Enum.Material.Wood,Enum.PartType.Cylinder)
  add("HealerCrystal",Vector3.new(1,1.35,1),Vector3.new(2.15,2.65,0),Color3.fromRGB(100,218,237),Enum.Material.Neon,Enum.PartType.Ball)
 elseif string.find(name,"Resident",1,true)or string.find(name,"AI_",1,true)then
  add("AdventurerMantle",Vector3.new(3.1,.85,2),Vector3.new(0,1.15,.2),accent,Enum.Material.Fabric,Enum.PartType.Ball)
 end
 return r
end
local function gearPart(folder,body,name,size,offset,color,material,shape,rotation)
 if not body then return nil end
 local x=Instance.new("Part");x.Name=name;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Massless=true;x.Anchored=false;if shape then x.Shape=shape end
 local rot=rotation or Vector3.zero
 x.CFrame=body.CFrame*CFrame.new(offset)*CFrame.Angles(math.rad(rot.X),math.rad(rot.Y),math.rad(rot.Z));x.Parent=folder
 local w=Instance.new("WeldConstraint");w.Part0=body;w.Part1=x;w.Parent=x
 return x
end
local function wearMedievalChest(model,folder,variant)
 local torso=model:FindFirstChild("UpperTorso");if not torso then return false end
 local t=chooseMesh(ASSETS.MedievalArmor,{"armor","chest","torso","plate","knight"},variant or 1);if not t then return false end
 local x=t:Clone();x.Name="MedievalAssetArmor";x.Anchored=false;x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Massless=true
 local maxAxis=math.max(x.Size.X,x.Size.Y,x.Size.Z);if maxAxis<=0 then x:Destroy();return false end
 x.Size=x.Size*(3.65/maxAxis);x.CFrame=torso.CFrame*CFrame.Angles(0,math.rad(180),0);x.Parent=folder
 local w=Instance.new("WeldConstraint");w.Part0=torso;w.Part1=x;w.Parent=x
 return true
end
local function addWeaponTrail(part,color)
 if not part then return end
 local a0=Instance.new("Attachment");a0.Name="TrailA";a0.Position=Vector3.new(0,part.Size.Y*.42,0);a0.Parent=part
 local a1=Instance.new("Attachment");a1.Name="TrailB";a1.Position=Vector3.new(0,-part.Size.Y*.42,0);a1.Parent=part
 local tr=Instance.new("Trail");tr.Name="CombatTrail";tr.Attachment0=a0;tr.Attachment1=a1;tr.Lifetime=.12;tr.MinLength=.08;tr.Enabled=false
 tr.Color=ColorSequence.new(color);tr.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.05),NumberSequenceKeypoint.new(1,1)});tr.Parent=part
end
local function decorateCharacterModel(model,classId,variant,advancementId)
 if not model then return end
 local old=model:FindFirstChild("DaechungClassGear");if old then old:Destroy()end
 local cd=classDef(classId);if not cd then return end
 local ad=advancementDef(classId,advancementId);local color=(ad and ad.Color)or cd.Color
 local gear=Instance.new("Folder");gear.Name="DaechungClassGear";gear.Parent=model
 local torso=model:FindFirstChild("UpperTorso");local head=model:FindFirstChild("Head")
 local right=model:FindFirstChild("RightHand")or model:FindFirstChild("RightLowerArm");local left=model:FindFirstChild("LeftHand")or model:FindFirstChild("LeftLowerArm")
 local usedAsset=wearMedievalChest(model,gear,variant)
 if not usedAsset and torso then gearPart(gear,torso,"ClassChest",Vector3.new(2.25,2.2,1.25),Vector3.new(0,0,-.08),color,Enum.Material.Metal)end
 if torso then
  gearPart(gear,torso,"ClassShoulderL",Vector3.new(.78,.48,1.05),Vector3.new(-1.25,.65,0),color,Enum.Material.Metal,Enum.PartType.Ball)
  gearPart(gear,torso,"ClassShoulderR",Vector3.new(.78,.48,1.05),Vector3.new(1.25,.65,0),color,Enum.Material.Metal,Enum.PartType.Ball)
 end
 if classId=="BREAKER"then
  local w=gearPart(gear,right,"ClassWeapon",Vector3.new(.28,5.2,.38),Vector3.new(0,-1.9,-.2),Color3.fromRGB(183,188,197),Enum.Material.Metal,nil,Vector3.new(0,0,-8));addWeaponTrail(w,color)
  if torso then gearPart(gear,torso,"BreakerCape",Vector3.new(2.3,2.9,.16),Vector3.new(0,-.1,.72),color,Enum.Material.Fabric)end
 elseif classId=="SHADOW"then
  local w1=gearPart(gear,right,"ClassWeaponR",Vector3.new(.2,2.15,.26),Vector3.new(0,-.8,-.15),Color3.fromRGB(176,180,190),Enum.Material.Metal,nil,Vector3.new(0,0,-12));addWeaponTrail(w1,color)
  local w2=gearPart(gear,left,"ClassWeaponL",Vector3.new(.2,2.15,.26),Vector3.new(0,-.8,-.15),Color3.fromRGB(176,180,190),Enum.Material.Metal,nil,Vector3.new(0,0,12));addWeaponTrail(w2,color)
  if head then gearPart(gear,head,"ShadowHood",Vector3.new(2.25,1.05,2.2),Vector3.new(0,.42,.08),color,Enum.Material.Fabric,Enum.PartType.Ball)end
 elseif classId=="RUNE"then
  local staff=gearPart(gear,right,"ClassWeapon",Vector3.new(.22,5,.22),Vector3.new(0,-1.8,0),Color3.fromRGB(92,70,55),Enum.Material.Wood,nil,Vector3.new(0,0,-5))
  if staff then local orb=gearPart(gear,staff,"RuneOrb",Vector3.new(.8,.8,.8),Vector3.new(0,2.5,0),color,Enum.Material.Neon,Enum.PartType.Ball);if orb then orb.Name="RuneGlow"end end
  if torso then gearPart(gear,torso,"RuneMantle",Vector3.new(2.45,.72,1.45),Vector3.new(0,.72,.08),color,Enum.Material.Fabric,Enum.PartType.Ball)end
 elseif classId=="SOUL"then
  local staff=gearPart(gear,right,"ClassWeapon",Vector3.new(.24,4.8,.24),Vector3.new(0,-1.7,0),Color3.fromRGB(70,62,61),Enum.Material.Wood,nil,Vector3.new(0,0,6))
  if staff then local orb=gearPart(gear,staff,"SoulOrb",Vector3.new(.85,.85,.85),Vector3.new(0,2.45,0),color,Enum.Material.Neon,Enum.PartType.Ball);if orb then orb.Name="SoulGlow"end end
  if torso then gearPart(gear,torso,"SoulCape",Vector3.new(2.4,3.1,.18),Vector3.new(0,-.1,.75),color,Enum.Material.Fabric)end
 end
 model:SetAttribute("ClassId",classId);model:SetAttribute("AdvancementId",advancementId or"")
end
local function pulseWeaponTrail(character)
 if not character then return end
 for _,d in ipairs(character:GetDescendants())do
  if d:IsA("Trail")and d.Name=="CombatTrail"then d.Enabled=true;task.delay(.16,function()if d.Parent then d.Enabled=false end end)end
 end
end
local function combatFlash(pos,color,size)
 if not world or not world.Parent then return end
 local x=Instance.new("Part");x.Name="CombatFlash";x.Shape=Enum.PartType.Ball;x.Anchored=true;x.CanCollide=false;x.CanTouch=false;x.CanQuery=false
 x.Material=Enum.Material.Neon;x.Color=color;x.Transparency=.2;x.Size=Vector3.new(size or 1.3,size or 1.3,size or 1.3);x.Position=pos;x.Parent=world
 TweenService:Create(x,TweenInfo.new(.2,Enum.EasingStyle.Quad),{Size=x.Size*2.1,Transparency=1}):Play();task.delay(.24,function()if x.Parent then x:Destroy()end end)
end
local function attackTelegraph(e,attack,target)
 if not e.part or not e.part.Parent then return end
 local unblockable=attack.Unblockable==true
 local color=unblockable and Color3.fromRGB(235,68,72)or Color3.fromRGB(255,207,82)
 combatFlash(e.part.Position+Vector3.new(0,1.2,0),color,unblockable and 1.9 or 1.45)
 e.part:SetAttribute("AttackName",attack.Name or"공격");e.part:SetAttribute("AttackParryable",attack.Parryable~=false);e.part:SetAttribute("AttackUnblockable",unblockable)
 if target then msg(target,(unblockable and"회피 필요 · "or"패링 가능 · ")..tostring(attack.Name or"공격"))end
end
local function facingEnemy(p,e)
 local pr=root(p);if not pr or not e.part then return false end
 local delta=Vector3.new(e.part.Position.X-pr.Position.X,0,e.part.Position.Z-pr.Position.Z)
 if delta.Magnitude<.01 then return true end
 return pr.CFrame.LookVector:Dot(delta.Unit)>.05
end
local function classGuardReduction(p)
 local classId=tostring(p:GetAttribute("ClassId")or"")
 local adv=tostring(p:GetAttribute("AdvancementId")or"")
 if classId=="BREAKER"then return adv=="IRON_BREAKER"and .82 or .72 end
 if classId=="SHADOW"then return .45 end
 if classId=="RUNE"then return .56 end
 if classId=="SOUL"then return adv=="GUARDIAN_MEDIUM"and .68 or .6 end
 return .5
end
local function classParryWindow(p)
 local classId=tostring(p:GetAttribute("ClassId")or"")
 if classId=="SHADOW"then return C.ParryWindow+.06 end
 if classId=="RUNE"then return C.ParryWindow+.02 end
 if classId=="SOUL"then return C.ParryWindow+.03 end
 return C.ParryWindow
end
local function staggerEnemy(e,amount,now)
 if not e or e.hp<=0 then return end
 e.stagger=math.max(0,(e.stagger or e.staggerMax or 40)-(amount or 20));e.part:SetAttribute("Stagger",e.stagger)
 if e.stagger<=0 then
  e.stunnedUntil=now+(e.boss and 2.1 or 1.45);e.attackPending=false;e.attackToken=(e.attackToken or 0)+1;e.stagger=e.staggerMax or 40;e.part:SetAttribute("Stagger",e.stagger);e.part:SetAttribute("Staggered",true)
  task.delay(e.boss and 2.1 or 1.45,function()if e.part and e.part.Parent then e.part:SetAttribute("Staggered",false)end end)
 end
end
local function resolveIncomingAttack(p,e,attack)
 local h=hum(p);local pr=root(p);if not h or not pr or h.Health<=0 or not e.part or not e.part.Parent then return end
 local now=os.clock()
 if n(p,"EvasionUntil",0)>now then feedback(p,"DODGE");msg(p,"회피 성공");return end
 local damage=(e.damage or 8)*(attack.DamageMult or 1)
 if e.enragedUntil and e.enragedUntil>now then damage*=1.22 end
 local blocking=p:GetAttribute("Blocking")==true and n(p,"GuardBrokenUntil",0)<=now and facingEnemy(p,e)
 local skillGuard=n(p,"GuardUntil",0)>now and facingEnemy(p,e)
 if blocking and attack.Parryable~=false then
  local started=n(p,"BlockStartedAt",0)
  if started>0 and now-started<=classParryWindow(p)then
   p:SetAttribute("ParryCount",n(p,"ParryCount",0)+1);p:SetAttribute("Guard",math.min(C.GuardMax,n(p,"Guard",C.GuardMax)+12))
   feedback(p,"PARRY");msg(p,"완벽 패링 · "..tostring(attack.Name or"공격"))
   staggerEnemy(e,(attack.GuardDamage or 20)*1.55,now)
   local classId=tostring(p:GetAttribute("ClassId")or"");local adv=tostring(p:GetAttribute("AdvancementId")or"")
   if classId=="BREAKER"then p:SetAttribute("GuardUntil",now+1.2)end
   if classId=="SHADOW"then p:SetAttribute("BackstabUntil",now+2.4)end
   if classId=="RUNE"then p:SetAttribute("RuneElement",n(p,"RuneElement",1)%3+1)end
   if classId=="SOUL"then p:SetAttribute("SoulCharge",math.min(5,n(p,"SoulCharge",0)+1))end
   return
  end
 end
 if blocking and attack.Unblockable~=true then
  local guard=math.max(0,n(p,"Guard",C.GuardMax)-(attack.GuardDamage or 20));p:SetAttribute("Guard",guard)
  damage*=1-classGuardReduction(p);feedback(p,"BLOCK");msg(p,"막기 · "..math.floor(guard).."/"..C.GuardMax)
  if guard<=0 then
   p:SetAttribute("Blocking",false);p:SetAttribute("GuardBrokenUntil",now+C.GuardBreakSeconds);feedback(p,"GUARD_BREAK");msg(p,"가드 브레이크")
   damage*=1.8
  end
 elseif blocking and attack.Unblockable==true then
  feedback(p,"UNBLOCKABLE_HIT");msg(p,"막을 수 없는 공격!")
 elseif skillGuard and attack.Unblockable~=true then
  damage*=.45;feedback(p,"GUARD");msg(p,"스킬 가드")
 end
 if damage>0 then h:TakeDamage(damage)end
 lastCombat[p]=now;p:SetAttribute("InCombat",true)
 local special=tostring(attack.Special or"")
 if special=="POISON_STING"and h.Health>0 then
  task.spawn(function()for _=1,3 do task.wait(.7);if h.Parent and h.Health>0 then h:TakeDamage(math.max(1,(e.damage or 7)*.22))end end end)
 elseif special=="ROOT_SNARE"or special=="ROOT_ERUPTION"then
  local old=h.WalkSpeed;h.WalkSpeed=math.min(old,7);task.delay(1.1,function()if h.Parent then h.WalkSpeed=old end end)
 elseif special=="HOWL_COMMAND"then
  e.enragedUntil=now+4;combatFlash(e.part.Position,Color3.fromRGB(171,225,116),2)
 elseif special=="SHELL_BASH"then
  local knock=pr.Position-e.part.Position;if knock.Magnitude>.01 then pr.AssemblyLinearVelocity=knock.Unit*32+Vector3.new(0,8,0)end
 elseif special=="GROUND_STOMP"or special=="HOWL_BLAST"then
  local knock=pr.Position-e.part.Position;if knock.Magnitude>.01 then pr.AssemblyLinearVelocity=knock.Unit*38+Vector3.new(0,10,0)end
  combatFlash(e.part.Position,Color3.fromRGB(224,102,72),3)
 end
end
local function chooseEnemyAttack(e)
 local def=e.def
 if def and typeof(def.Attacks)=="table"and #def.Attacks>0 then
  e.attackIndex=((e.attackIndex or 0)%#def.Attacks)+1
  if e.boss and e.hp/e.max<.5 and #def.Attacks>=3 then e.attackIndex=math.max(2,e.attackIndex)end
  return def.Attacks[e.attackIndex]
 end
 if def and typeof(def.Attack)=="table"then return def.Attack end
 return {Name="기본 공격",Telegraph=.4,Cooldown=1.2,Range=5.5,Parryable=true,GuardDamage=20,Special="STRIKE"}
end
local function beginEnemyAttack(e,target,now)
 if e.attackPending or now<(e.stunnedUntil or 0)then return end
 local attack=chooseEnemyAttack(e);if not attack then return end
 e.attackPending=true;e.attackToken=(e.attackToken or 0)+1;local attackToken=e.attackToken;e.lastAttack=now;e.nextAttackAt=now+(attack.Cooldown or 1.2);attackTelegraph(e,attack,target)
 local special=tostring(attack.Special or"");local tr0=root(target)
 if tr0 then
  local flat=Vector3.new(tr0.Position.X,e.part.Position.Y,tr0.Position.Z)
  if(flat-e.part.Position).Magnitude>.01 then e.part.CFrame=CFrame.lookAt(e.part.Position,flat)end
 end
 if special=="TAIL_SWEEP"or special=="HOWL_BLAST"then
  TweenService:Create(e.part,TweenInfo.new(math.max(.18,(attack.Telegraph or .5)*.65),Enum.EasingStyle.Quad),{CFrame=e.part.CFrame*CFrame.Angles(0,math.rad(150),0)}):Play()
 elseif special=="CHARGE"or special=="ANTLER_CHARGE"or special=="MOON_POUNCE"or special=="POUNCE"or special=="FANG_CHAIN"then
  local tr=root(target);if tr then
   local d=Vector3.new(tr.Position.X-e.part.Position.X,0,tr.Position.Z-e.part.Position.Z)
   if d.Magnitude>.1 then e.part.CFrame=e.part.CFrame+d.Unit*math.min(d.Magnitude,5)end
  end
 elseif special=="FEINT_SLASH"then
  task.delay(math.max(.18,(attack.Telegraph or .7)*.45),function()if e.part and e.part.Parent then combatFlash(e.part.Position,Color3.fromRGB(255,229,125),.85)end end)
 end
 local telegraph=attack.Telegraph or .4
 task.delay(telegraph,function()
  if not e.part or not e.part.Parent or e.hp<=0 or e.attackToken~=attackToken then e.attackPending=false;return end
  local hits=math.max(1,attack.Hits or 1);local gap=attack.HitGap or .2
  task.spawn(function()
   for hit=1,hits do
    if e.hp<=0 or not e.part.Parent or e.attackToken~=attackToken then break end
    local tr=root(target);local hh=hum(target);local range=(attack.Range or 5.5)+1.5
    if tr and hh and hh.Health>0 and(tr.Position-e.part.Position).Magnitude<=range then resolveIncomingAttack(target,e,attack)end
    if hit<hits then task.wait(gap)end
   end
   e.attackPending=false
  end)
 end)
end

local function applyPlayerAppearance(p)
 local c=p.Character;if not c then return end
 decorateCharacterModel(c,tostring(p:GetAttribute("ClassId")or"NONE"),(p.UserId%7)+1,tostring(p:GetAttribute("AdvancementId")or""))
 local weaponTier=n(p,"WeaponTier",1);local armorTier=n(p,"ArmorTier",1);local gear=c:FindFirstChild("DaechungClassGear")
 if gear then
  for _,d in ipairs(gear:GetDescendants())do
   if d:IsA("BasePart")and string.find(d.Name,"ClassWeapon",1,true)then
    if weaponTier>=4 then d.Material=Enum.Material.Neon;d.Color=weaponTier>=5 and Color3.fromRGB(255,221,133)or Color3.fromRGB(169,207,255)end
   end
  end
  local torso=c:FindFirstChild("UpperTorso")
  if torso and armorTier>=4 then
   local rune=gearPart(gear,torso,"ArmorTierRune",Vector3.new(.55,.55,.12),Vector3.new(0,.15,-.72),armorTier>=5 and Color3.fromRGB(255,214,116)or Color3.fromRGB(142,196,230),Enum.Material.Neon,Enum.PartType.Ball)
   if rune then local light=Instance.new("PointLight");light.Brightness=.35;light.Range=5;light.Color=rune.Color;light.Parent=rune end
  end
 end
end
local function tree(parent,pos,scale)
 scale=scale or 1
 local trunk=ppart(parent,"TreeTrunk",Vector3.new(2.2,8,2.2)*scale,pos+Vector3.new(0,4*scale,0),Color3.fromRGB(91,67,47),Enum.Material.Wood)
 local crown=ppart(parent,"TreeCrown",Vector3.new(7.5,7.5,7.5)*scale,trunk.Position+Vector3.new(0,6*scale,0),Color3.fromRGB(62,120,68),Enum.Material.Grass);crown.Shape=Enum.PartType.Ball
end
local function rock(parent,pos,scale,color)
 scale=scale or 1
 local r=ppart(parent,"Rock",Vector3.new(5,4,5)*scale,pos+Vector3.new(0,2*scale,0),color or Color3.fromRGB(92,91,96),Enum.Material.Rock)
 r.Orientation=Vector3.new(math.random(-10,10),math.random(0,180),math.random(-10,10))
end
local function teleportPlayer(p,pos)
 local r=root(p);if r then r.AssemblyLinearVelocity=Vector3.zero;r.CFrame=CFrame.new(pos+Vector3.new(0,4,0))end
end
local function setStats(p,heal)
 local level=math.clamp(n(p,"Level",1),1,C.LevelCap or 60);p:SetAttribute("Level",level)
 local wt=n(p,"WeaponTier",1);local at=n(p,"ArmorTier",1)
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local cd=classDef(classId)
 local advId=tostring(p:GetAttribute("AdvancementId")or"");local ad=advancementDef(classId,advId)
 local secondId=(level>=(C.SecondAdvancementLevel or 40)and ad and ad.SecondId)or""
 p:SetAttribute("SecondAdvancementId",secondId)
 local hpMult=cd and cd.HPMult or 1;local attackMult=cd and cd.AttackMult or 1
 local maxHP=math.floor((C.BaseMaxHP+(level-1)*C.LevelHPGain+(C.ArmorBonus[at]or 0))*hpMult+.5)
 local attack=math.floor((C.BaseAttack+(level-1)*C.LevelAttackGain+(C.WeaponBonus[wt]or 0))*attackMult+.5)
 p:SetAttribute("MaxHP",maxHP);p:SetAttribute("AttackPower",attack);p:SetAttribute("ClassName",classDisplay(classId,advId,secondId))
 local h=hum(p);if h then h.MaxHealth=maxHP;if heal then h.Health=maxHP else h.Health=math.min(h.Health,maxHP)end end
end
local function addMasteryXP(p,amount)
 local xp=n(p,"MasteryXP",0)+(amount or 0);local mastery=n(p,"MasteryLevel",0);local gained=false
 while xp>=1000 do xp-=1000;mastery+=1;gained=true end
 p:SetAttribute("MasteryXP",xp);p:SetAttribute("MasteryLevel",mastery)
 if gained then msg(p,"직업 숙련 "..mastery.." · 전투력 증가 없이 숙련 보상 해금");feedback(p,"MASTERY_UP")end
end
local function grantXP(p,amount)
 local cap=C.LevelCap or 60;local level=math.clamp(n(p,"Level",1),1,cap);local xp=n(p,"XP",0)
 if level>=cap then p:SetAttribute("XP",0);addMasteryXP(p,amount);return end
 xp+=amount;local leveled=false;local before=level
 while level<cap and xp>=level*100 do xp-=level*100;level+=1;leveled=true end
 if level>=cap and xp>0 then addMasteryXP(p,xp);xp=0 end
 p:SetAttribute("XP",xp);p:SetAttribute("Level",level)
 if leveled then
  setStats(p,true)
  if before<(C.SecondAdvancementLevel or 40)and level>=(C.SecondAdvancementLevel or 40)and tostring(p:GetAttribute("SecondAdvancementId")or"")~=""then
   msg(p,"Lv."..level.." · 2차 전직 완료 · "..tostring(p:GetAttribute("ClassName")or""));feedback(p,"ADVANCE_2")
  elseif level>=cap then msg(p,"Lv."..cap.." MAX · 직업 숙련 개방");feedback(p,"LEVEL_UP")
  else msg(p,"레벨 "..level.." · 최대체력/공격력 +10");feedback(p,"LEVEL_UP")end
 end
end
-- Save schema v3 preserves every earlier key and adds level-cap, relic and boss-companion progression.
local SAVE={"Gold","XP","Level","WeaponTier","ArmorTier","RelicId","QuestPortal","QuestKills","QuestNeed","RoomCode","ClassId","AdvancementId","SecondAdvancementId","MasteryXP","MasteryLevel","UnlockedCompanions","CompanionUnlockCount"}
local function init(p)
 p:SetAttribute("Gold",100);p:SetAttribute("XP",0);p:SetAttribute("Level",1);p:SetAttribute("WeaponTier",1);p:SetAttribute("ArmorTier",1);p:SetAttribute("RelicId",C.RelicDefault or"NONE")
 p:SetAttribute("ClassId","NONE");p:SetAttribute("AdvancementId","");p:SetAttribute("SecondAdvancementId","");p:SetAttribute("ClassName","직업 미선택")
 p:SetAttribute("MasteryXP",0);p:SetAttribute("MasteryLevel",0);p:SetAttribute("UnlockedCompanions","");p:SetAttribute("CompanionUnlockCount",0)
p:SetAttribute("AdvancementTrialActive",false);p:SetAttribute("AdvancementTrialProgress",0);p:SetAttribute("AdvancementTrialPassed",false);p:SetAttribute("RespecReady",false)
 p:SetAttribute("RuneElement",1);p:SetAttribute("SoulCharge",0);p:SetAttribute("BackstabUntil",0);p:SetAttribute("EvasionUntil",0);p:SetAttribute("GuardUntil",0);p:SetAttribute("OverloadCount",0)
 p:SetAttribute("Guard",C.GuardMax);p:SetAttribute("Blocking",false);p:SetAttribute("BlockStartedAt",0);p:SetAttribute("ParryRearmUntil",0);p:SetAttribute("GuardBrokenUntil",0);p:SetAttribute("ParryCount",0);p:SetAttribute("CurrentRunSeed",0)
 p:SetAttribute("CurrentZone",0);p:SetAttribute("InCombat",false);p:SetAttribute("QuestPortal",0);p:SetAttribute("QuestKills",0);p:SetAttribute("QuestNeed",0)
 p:SetAttribute("PartyCount",0);p:SetAttribute("PartyKills",0);p:SetAttribute("Contribution",0);p:SetAttribute("PartyHuntActive",false);p:SetAttribute("RoomCode",1)
 msg(p,"직업을 고르고 보스를 격파해 AI 동료를 해금해.")
 parties[p]={};clickTimes[p]={};setStats(p,true)
end
local function load(p)
 init(p)
 if not store then setStats(p,true);return end
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
 if ok and typeof(d)=="table"then for _,k in ipairs(SAVE)do if d[k]~=nil then p:SetAttribute(k,d[k])end end end
 setStats(p,true)
end
local function save(p)
 if not store then return end
 local d={};for _,k in ipairs(SAVE)do d[k]=p:GetAttribute(k)end
 pcall(function()store:SetAsync("p:"..p.UserId,d)end)
end
task.spawn(function()
 if C.SaveEnabled~=true or foundationSeen.SAVE_ROUNDTRIP or not store then return end
 local probeKey="__foundation_probe__:"..tostring(game.PlaceVersion)
 local token=C.GameId..":"..tostring(game.PlaceVersion)..":"..tostring(os.time())
 local ok,readBack=pcall(function()
  store:SetAsync(probeKey,{token=token,at=os.time()})
  local value=store:GetAsync(probeKey)
  return typeof(value)=="table"and value.token or nil
 end)
 if ok and readBack==token then
  pcall(function()store:RemoveAsync(probeKey)end)
  foundationCheckpoint("SAVE_ROUNDTRIP",nil,{roundtrip=true})
 end
end)
local function updatePartyCount(p)
 local count=0;for _ in pairs(parties[p]or{})do count+=1 end;p:SetAttribute("PartyCount",count)
end
local function partyHas(p,id)return parties[p]and parties[p][id]==true end
local function roomParticipants(p)
 local code=n(p,"RoomCode",1)
 local members={}
 for _,other in ipairs(Players:GetPlayers())do
  if n(other,"RoomCode",1)==code then table.insert(members,other)end
 end
 return members
end
local function companionDef(id)
 for _,def in ipairs(C.BossCompanions or{})do if def.Id==id then return def end end
end
local function companionUnlocked(p,id)
 local packed=","..tostring(p:GetAttribute("UnlockedCompanions")or"")..","
 return packed:find(","..tostring(id)..",",1,true)~=nil
end
local function unlockCompanion(p,id)
 local def=companionDef(id);if not def or companionUnlocked(p,id)then return false end
 local current=tostring(p:GetAttribute("UnlockedCompanions")or"")
 p:SetAttribute("UnlockedCompanions",current==""and id or(current..","..id))
 p:SetAttribute("CompanionUnlockCount",n(p,"CompanionUnlockCount",0)+1)
 msg(p,"보스 동료 해금 · "..def.Name.." · 마을에서 두 번 터치해 파티 편성");feedback(p,"COMPANION_UNLOCK")
 return true
end
local function unlockBossCompanion(killer,e)
 if not e or e.boss~=true then return end
 local bossId=e.def and e.def.Id;if not bossId or not companionDef(bossId)then return end
 for _,member in ipairs(roomParticipants(killer))do
  if n(member,"CurrentZone",0)==e.zone then unlockCompanion(member,bossId)end
 end
end

local function broadcastMultiplayerSync(actor)
 local members=roomParticipants(actor)
 local sharedObjective=0
 for _,member in ipairs(members)do sharedObjective=math.max(sharedObjective,n(member,"PartyKills",0))end
 remote:FireAllClients("MULTIPLAYER_SYNC",{
  ActorUserId=actor.UserId,
  RoomCode=n(actor,"RoomCode",1),
  ParticipantCount=#members,
  SharedObjective=sharedObjective,
 })
 if #members>=2 then foundationCheckpoint("MULTIPLAYER_SYNC",actor,{participantCount=#members,roomCode=n(actor,"RoomCode",1)})end
end

local function fantasyHouse(parent,index,pos,yaw)
 local assetId=index%2==0 and ASSETS.MedievalHouseA or ASSETS.MedievalHouseB
 local model=wholeAsset(parent,assetId,pos,.42,"MedievalVillageHouse"..index,yaw)
 if model then return model end
 local body=ppart(parent,"VillageHouse",Vector3.new(20,11,17),pos+Vector3.new(0,5,0),Color3.fromRGB(145,108,76),Enum.Material.WoodPlanks)
 ppart(parent,"VillageRoof",Vector3.new(23,2,20),body.Position+Vector3.new(0,6.5,0),index%3==0 and Color3.fromRGB(103,62,55)or Color3.fromRGB(78,68,73),Enum.Material.Slate)
 ppart(parent,"HouseDoor",Vector3.new(4,7,.6),body.Position+Vector3.new(0,-1,-8.7),Color3.fromRGB(83,59,44),Enum.Material.Wood)
 local window=ppart(parent,"HouseWindow",Vector3.new(4,3,.35),body.Position+Vector3.new(6,1,-8.9),Color3.fromRGB(128,191,209),Enum.Material.Glass);window.Transparency=.22
 ppart(parent,"HouseChimney",Vector3.new(2.2,5,2.2),body.Position+Vector3.new(-6,8,3),Color3.fromRGB(91,78,72),Enum.Material.Brick)
 return body
end
local function trialInstruction(classId)
 if classId=="BREAKER"then return"파쇄기사 시험 · 스킬 공격 5회 적중"
 elseif classId=="SHADOW"then return"그림자추적자 시험 · 회피 직후 공격 5회 적중"
 elseif classId=="RUNE"then return"룬술사 시험 · 룬 스킬 5회 적중"
 elseif classId=="SOUL"then return"영혼소환사 시험 · 적 영혼 5개 수집"end
 return"직업을 먼저 선택해."
end
local function startAdvancementTrial(p)
 local classId=tostring(p:GetAttribute("ClassId")or"NONE")
 if not classDef(classId)then msg(p,"직업을 먼저 선택해.")return end
 if n(p,"Level",1)<C.AdvancementLevel then msg(p,"전직은 Lv."..C.AdvancementLevel.."부터 가능")return end
 if tostring(p:GetAttribute("AdvancementId")or"")~=""then
  if n(p,"Gold",0)<C.AdvancementSwitchCost then msg(p,"재전직 비용 "..C.AdvancementSwitchCost.."골드 필요")return end
  p:SetAttribute("RespecReady",true);msg(p,"재전직 준비 완료 · A/B 중 선택하면 "..C.AdvancementSwitchCost.."골드 사용");return
 end
 if p:GetAttribute("AdvancementTrialPassed")==true then msg(p,"전직 시험 완료 · 화면에서 A/B 전직을 선택해.")return end
 p:SetAttribute("AdvancementTrialActive",true);p:SetAttribute("AdvancementTrialProgress",0);p:SetAttribute("SoulCharge",0)
 msg(p,trialInstruction(classId))
end
local function advanceTrial(p,amount)
 if p:GetAttribute("AdvancementTrialActive")~=true or p:GetAttribute("AdvancementTrialPassed")==true then return end
 local value=math.min(C.AdvancementTrialTarget,n(p,"AdvancementTrialProgress",0)+(amount or 1));p:SetAttribute("AdvancementTrialProgress",value)
 if value>=C.AdvancementTrialTarget then
  p:SetAttribute("AdvancementTrialActive",false);p:SetAttribute("AdvancementTrialPassed",true)
  msg(p,"전직 시험 완료 · A/B 전직을 선택해.");feedback(p,"ADVANCEMENT_READY")
 end
end

local function makeVillage()
 local f=Instance.new("Folder");f.Name="Village";f.Parent=world
 foundationSpawn=Instance.new("SpawnLocation");foundationSpawn.Name="VillageSpawn";foundationSpawn.Size=Vector3.new(12,1,12);foundationSpawn.Position=C.VillageCenter+Vector3.new(0,2,0);foundationSpawn.Anchored=true;foundationSpawn.Neutral=true;foundationSpawn.Transparency=1;foundationSpawn.CanCollide=true;foundationSpawn.Parent=f
 ppart(f,"VillageGround",Vector3.new(300,2,300),Vector3.new(0,0,0),Color3.fromRGB(93,141,85),Enum.Material.Grass)
 ppart(f,"VillagePlaza",Vector3.new(96,2.3,96),Vector3.new(0,1.2,0),Color3.fromRGB(128,122,111),Enum.Material.Cobblestone)
 for _,z in ipairs({-112,-84,-56,56,84,112})do ppart(f,"MainRoad",Vector3.new(16,1,36),Vector3.new(0,1.15,z),Color3.fromRGB(119,105,88),Enum.Material.Cobblestone)end
 for i=1,12 do local a=i/12*math.pi*2;tree(f,Vector3.new(math.cos(a)*126,1,math.sin(a)*126),.9+(i%3)*.08)end
 for i=1,10 do
  local a=i/10*math.pi*2;local pos=Vector3.new(math.cos(a)*82,1,math.sin(a)*82);fantasyHouse(f,i,pos,math.deg(-a)+90)
 end
 -- Functional buildings read clearly from the plaza instead of looking like ten identical houses.
 for _,entry in ipairs({
  {Text="대장간",Pos=Vector3.new(31,4,14),Color=Color3.fromRGB(194,112,65)},
  {Text="방어구점",Pos=Vector3.new(31,4,-14),Color=Color3.fromRGB(122,151,158)},
  {Text="치유소",Pos=Vector3.new(-31,4,-14),Color=Color3.fromRGB(128,191,203)},
  {Text="전직소",Pos=Vector3.new(-31,4,14),Color=Color3.fromRGB(154,112,186)},
 })do
  local sign=ppart(f,"ServiceSign",Vector3.new(8,3,.5),entry.Pos,entry.Color,Enum.Material.WoodPlanks);label(sign,entry.Text,Color3.new(1,1,1),32)
 end
 for _,x in ipairs({-48,-24,24,48})do
  local pole=ppart(f,"VillageLamp",Vector3.new(1,8,1),Vector3.new(x,5,25),Color3.fromRGB(70,66,62),Enum.Material.Metal)
  local light=ppart(f,"VillageLampGlow",Vector3.new(2,2,2),pole.Position+Vector3.new(0,4,0),Color3.fromRGB(245,202,116),Enum.Material.Neon);light.CanCollide=false
  local pl=Instance.new("PointLight");pl.Color=light.Color;pl.Range=20;pl.Brightness=.75;pl.Parent=light
 end
 for i=1,4 do
  local stall=ppart(f,"MarketStall",Vector3.new(12,5,7),Vector3.new(-30+i*20,3.5,38),Color3.fromRGB(126,88,61),Enum.Material.WoodPlanks)
  ppart(f,"MarketAwning",Vector3.new(14,.6,9),stall.Position+Vector3.new(0,3.2,0),i%2==0 and Color3.fromRGB(164,74,67)or Color3.fromRGB(197,157,82),Enum.Material.Fabric)
 end
 decorateVillageAssets(f)
 local fountain=ppart(f,"Fountain",Vector3.new(14,3,14),Vector3.new(0,3,0),Color3.fromRGB(90,112,124),Enum.Material.Slate);label(fountain,"마을 광장",Color3.fromRGB(255,232,168),28)

 local chief=humanoidFigure(f,"VillageChief",Vector3.new(-18,6,10),Color3.fromRGB(142,98,68),Color3.fromRGB(80,67,54),1);label(chief,"이장",Color3.fromRGB(255,221,145),28)
 prompt(chief,"마을 이장","퀘스트 받기").Triggered:Connect(function(p)
  local level=n(p,"Level",1);local id=math.clamp(math.floor((level-1)/3)+1,1,5);local need=5+id
  p:SetAttribute("QuestPortal",id);p:SetAttribute("QuestKills",0);p:SetAttribute("QuestNeed",need)
  msg(p,string.format("%s 몬스터 %d마리 처치",C.Portals[id].Name,need))
 end)

 local weapon=humanoidFigure(f,"WeaponMerchant",Vector3.new(22,6,8),Color3.fromRGB(85,92,112),Color3.fromRGB(170,120,65),.95);label(weapon,"무기상인",Color3.fromRGB(255,215,140),28)
 prompt(weapon,"무기상인","다음 무기 구매").Triggered:Connect(function(p)
  local tier=n(p,"WeaponTier",1);if tier>=5 then msg(p,"최고급 무기 보유")return end
  local cost=C.WeaponPrices[tier+1];if n(p,"Gold",0)<cost then msg(p,"무기 구매 골드 부족 · "..cost)return end
  p:SetAttribute("Gold",n(p,"Gold",0)-cost);p:SetAttribute("WeaponTier",tier+1);setStats(p,false);msg(p,"무기 "..(tier+1).."단계 구매")
 end)
 local armor=humanoidFigure(f,"ArmorMerchant",Vector3.new(22,6,-10),Color3.fromRGB(92,112,102),Color3.fromRGB(80,91,77),.95);label(armor,"방어구상인",Color3.fromRGB(180,235,190),28)
 prompt(armor,"방어구상인","다음 방어구 구매").Triggered:Connect(function(p)
  local tier=n(p,"ArmorTier",1);if tier>=5 then msg(p,"최고급 방어구 보유")return end
  local cost=C.ArmorPrices[tier+1];if n(p,"Gold",0)<cost then msg(p,"방어구 구매 골드 부족 · "..cost)return end
  p:SetAttribute("Gold",n(p,"Gold",0)-cost);p:SetAttribute("ArmorTier",tier+1);setStats(p,true);msg(p,"방어구 "..(tier+1).."단계 구매")
 end)
 local healer=humanoidFigure(f,"VillageHealer",Vector3.new(-18,6,-10),Color3.fromRGB(208,221,235),Color3.fromRGB(116,169,193),.95);label(healer,"치유사",Color3.fromRGB(180,232,255),28)
 prompt(healer,"치유사","회복").Triggered:Connect(function(p)local h=hum(p);if h then h.Health=h.MaxHealth;msg(p,"체력 완전 회복")end end)
 local master=humanoidFigure(f,"AdvancementMaster",Vector3.new(-24,6,14),Color3.fromRGB(112,88,145),Color3.fromRGB(67,56,82),.95);label(master,"전직 교관",Color3.fromRGB(225,196,255),30)
 prompt(master,"전직 교관","전직 시험").Triggered:Connect(startAdvancementTrial)

 for i=1,6 do
  local a=i/6*math.pi*2;local npc=humanoidFigure(f,"Resident"..i,Vector3.new(math.cos(a)*43,6,math.sin(a)*43),Color3.fromRGB(110+i*8,105+i*5,96+i*4),Color3.fromRGB(72,70,68),.82)
  label(npc,"주민",Color3.fromRGB(225,225,218),22)
 end

 local portalAngles={-80,-40,0,40,80}
 for i,z in ipairs(C.Portals)do
  local x=(i-3)*46
  local pad=ppart(f,"Portal"..i,Vector3.new(28,2,20),Vector3.new(x,2,-112),z.Color,Enum.Material.Neon)
  wholeAsset(f,ASSETS.StonePortal,pad.Position+Vector3.new(0,0,-2),.28,"StonePortalAsset"..i)
  ppart(f,"PortalArchL"..i,Vector3.new(3,18,3),pad.Position+Vector3.new(-11,10,0),z.Color,Enum.Material.Slate)
  ppart(f,"PortalArchR"..i,Vector3.new(3,18,3),pad.Position+Vector3.new(11,10,0),z.Color,Enum.Material.Slate)
  label(pad,i.." · "..z.Name,z.Color,48)
  prompt(pad,z.Name,"포탈 입장").Triggered:Connect(function(p)
   if z.Id==1 and meadowPlayersInside()==0 and generateMeadowRun then
    local seed=(os.time()%1000000)*100+n(p,"RoomCode",1)+meadowRunCounter*13;generateMeadowRun(seed)
   end
   p:SetAttribute("CurrentZone",z.Id);p:SetAttribute("InCombat",false);p:SetAttribute("Blocking",false);lastCombat[p]=0
   if z.Id==1 then p:SetAttribute("CurrentRunSeed",meadowRunState.seed)else p:SetAttribute("CurrentRunSeed",0)end
   teleportPlayer(p,z.Center+Vector3.new(0,0,170));msg(p,z.Name.." 입장"..(z.Id==1 and(" · RUN "..tostring(meadowRunState.seed))or""))
   if n(p,"PartyCount",0)>0 then p:SetAttribute("PartyHuntActive",true);p:SetAttribute("PartyKills",0);p:SetAttribute("Contribution",0)end
  end)
 end
end

local function themedProp(f,z,i)
 local a=i/24*math.pi*2;local r=115+(i%5)*17;local pos=z.Center+Vector3.new(math.cos(a)*r,0,math.sin(a)*r)
 if z.Theme=="MEADOW"then tree(f,pos,.8+(i%3)*.12)
 elseif z.Theme=="CANYON"then rock(f,pos,1+(i%3)*.2,Color3.fromRGB(147,86,63))
 elseif z.Theme=="RUINS"then
  local p=ppart(f,"RuinPillar",Vector3.new(5,8+(i%4)*4,5),pos+Vector3.new(0,6,0),Color3.fromRGB(86,82,99),Enum.Material.Slate)
  if i%4==0 then local c=ppart(f,"RuneCrystal",Vector3.new(2.5,7,2.5),p.Position+Vector3.new(0,8,0),z.Color,Enum.Material.Neon);c.Orientation=Vector3.new(0,i*17,20)end
 elseif z.Theme=="SNOW"then
  tree(f,pos,.72+(i%2)*.1);local s=ppart(f,"SnowPatch",Vector3.new(12,.5,9),pos+Vector3.new(4,.7,3),Color3.fromRGB(221,235,241),Enum.Material.Snow)
 elseif z.Theme=="ABYSS"then
  local ob=ppart(f,"AbyssObelisk",Vector3.new(5,13+(i%3)*4,5),pos+Vector3.new(0,7,0),Color3.fromRGB(58,48,72),Enum.Material.Slate)
  local glow=ppart(f,"AbyssRune",Vector3.new(2,4,.6),ob.Position+Vector3.new(0,1,-2.8),z.Color,Enum.Material.Neon);glow.CanCollide=false
 end
end
local function makeZone(z)
 local f=Instance.new("Folder");f.Name="Zone"..z.Id;f.Parent=world
 local groundColor=z.Theme=="MEADOW"and Color3.fromRGB(75,126,67)or z.Theme=="CANYON"and Color3.fromRGB(136,83,60)or z.Theme=="RUINS"and Color3.fromRGB(74,70,86)or z.Theme=="SNOW"and Color3.fromRGB(188,211,220)or Color3.fromRGB(49,43,62)
 local material=z.Theme=="MEADOW"and Enum.Material.Grass or z.Theme=="CANYON"and Enum.Material.Sand or z.Theme=="SNOW"and Enum.Material.Snow or Enum.Material.Slate
 ppart(f,"ZoneGround",Vector3.new(440,2,440),z.Center+Vector3.new(0,0,0),groundColor,material)
 if z.Theme~="MEADOW"then
  ppart(f,"ZoneInnerRoad",Vector3.new(22,1,330),z.Center+Vector3.new(0,1,0),Color3.fromRGB(105,100,94),Enum.Material.Cobblestone)
  for i=1,34 do themedProp(f,z,i)end
 end
 if z.Theme=="SNOW"then
  for i=1,28 do
   local a=i/28*math.pi*2;local radius=48+(i%6)*27
   local p=z.Center+Vector3.new(math.cos(a)*radius,1.2,math.sin(a)*radius)
   local mound=ppart(f,"SnowMound",Vector3.new(8+(i%3)*2,1.4+(i%2)*.5,7+(i%4)),p,Color3.fromRGB(218,232,238),Enum.Material.Snow);mound.Shape=Enum.PartType.Ball;mound.CanCollide=false
   if i%4==0 then
    local ice=ppart(f,"IceShard",Vector3.new(1.7,5+(i%3)*2,1.7),p+Vector3.new(2,3,-2),Color3.fromRGB(155,205,222),Enum.Material.Glass);ice.Transparency=.18;ice.Orientation=Vector3.new(0,i*19,12)
   end
  end
 end
 for i=1,8 do
  local a=i/8*math.pi*2;local lamp=ppart(f,"Guide"..i,Vector3.new(1.2,8,1.2),z.Center+Vector3.new(math.cos(a)*86,5,math.sin(a)*86),Color3.fromRGB(75,73,76),Enum.Material.Metal)
  local glow=ppart(f,"GuideGlow"..i,Vector3.new(2.2,2.2,2.2),lamp.Position+Vector3.new(0,5,0),z.Color,Enum.Material.Neon);glow.CanCollide=false
 end
 if z.Theme~="MEADOW"then decorateZoneAssets(f,z)end
 local ret=ppart(f,"ReturnPortal",Vector3.new(26,2,18),z.Center+Vector3.new(0,2,190),Color3.fromRGB(112,180,205),Enum.Material.Neon);label(ret,"마을 귀환",Color3.fromRGB(180,235,255),36)
 prompt(ret,"마을","귀환").Triggered:Connect(function(p)
  local combat=os.clock()-(lastCombat[p]or 0)<C.CombatLockSeconds
  if combat or p:GetAttribute("InCombat")==true then msg(p,"전투 중에는 마을로 돌아갈 수 없어")return end
  p:SetAttribute("CurrentZone",0);p:SetAttribute("PartyHuntActive",false);teleportPlayer(p,C.VillageCenter);local h=hum(p);if h then h.Health=h.MaxHealth end;msg(p,"마을 귀환 · 체력 회복")
 end)
 if z.Boss then
  local arena=ppart(f,"BossArena",Vector3.new(96,1,96),z.Center+Vector3.new(0,1,-86),Color3.fromRGB(73,60,82),Enum.Material.Slate)
  for i=1,8 do local a=i/8*math.pi*2;ppart(f,"BossPillar",Vector3.new(4,15,4),arena.Position+Vector3.new(math.cos(a)*39,8,math.sin(a)*39),z.Color,Enum.Material.Slate)end
 end
end

local function enemyModel(parent,z,pos,boss,enemyDef)
 local spec=enemyDef or(boss and z.Boss or nil);local displayName=spec and spec.Name or z.Enemy
 local bossVisual=boss and z.Theme~="MEADOW"
 local rootPart=ppart(parent,displayName,boss and Vector3.new(6.8,7.5,6.2)or Vector3.new(4.2,4.6,5.2),pos,boss and Color3.fromRGB(66,44,82)or z.Color,boss and Enum.Material.Slate or Enum.Material.SmoothPlastic)
 rootPart.CanCollide=true;rootPart.Transparency=1
 local function add(nm,size,off,col,mat,shape,rot)return attach(rootPart,nm,size,off,col,mat,shape,rot)end
 if bossVisual then
  local body=Color3.fromRGB(92,67,108);local armor=Color3.fromRGB(58,52,72)
  add("BossBody",Vector3.new(5.8,5.8,4.2),Vector3.new(0,-1.1,0),body,Enum.Material.Slate,Enum.PartType.Ball)
  add("BossChest",Vector3.new(5.4,2.2,4),Vector3.new(0,.1,-.35),armor,Enum.Material.Metal,Enum.PartType.Ball)
  add("BossHead",Vector3.new(3.7,3.5,3.4),Vector3.new(0,2.9,-.35),body,Enum.Material.Slate,Enum.PartType.Ball)
  add("BossArmL",Vector3.new(4.2,1.25,1.25),Vector3.new(-3.1,-1.05,0),armor,Enum.Material.Slate,Enum.PartType.Cylinder,Vector3.new(0,0,78))
  add("BossArmR",Vector3.new(4.2,1.25,1.25),Vector3.new(3.1,-1.05,0),armor,Enum.Material.Slate,Enum.PartType.Cylinder,Vector3.new(0,0,102))
  add("BossLegL",Vector3.new(3.8,1.45,1.45),Vector3.new(-1.35,-4.1,.2),armor,Enum.Material.Slate,Enum.PartType.Cylinder,Vector3.new(0,0,90))
  add("BossLegR",Vector3.new(3.8,1.45,1.45),Vector3.new(1.35,-4.1,.2),armor,Enum.Material.Slate,Enum.PartType.Cylinder,Vector3.new(0,0,90))
  add("BossHornL",Vector3.new(.7,.7,3.2),Vector3.new(-1.25,4.85,-.2),z.Color,Enum.Material.Neon,nil,Vector3.new(-20,0,-18))
  add("BossHornR",Vector3.new(.7,.7,3.2),Vector3.new(1.25,4.85,-.2),z.Color,Enum.Material.Neon,nil,Vector3.new(-20,0,18))
  add("BossCore",Vector3.new(1.35,1.35,.42),Vector3.new(0,.3,-2.15),z.Color,Enum.Material.Neon,Enum.PartType.Ball)
 elseif z.Theme=="MEADOW"then
  local id=spec and spec.Id or"GRASS_WOLF";local scale=boss and 1.34 or 1
  local function S(v)return v*scale end
  if id=="GRASS_WOLF"or id=="DIRE_WOLF"or id=="WHITE_FANG"then
   local fur=id=="WHITE_FANG"and Color3.fromRGB(226,232,220)or id=="DIRE_WOLF"and Color3.fromRGB(60,58,61)or Color3.fromRGB(100,92,82)
   local dark=id=="WHITE_FANG"and Color3.fromRGB(160,174,166)or Color3.fromRGB(72,68,62)
   add("WolfBody",S(Vector3.new(4.1,2.6,5.5)),S(Vector3.new(0,-1.35,.2)),fur,Enum.Material.Fabric,Enum.PartType.Ball)
   add("WolfChest",S(Vector3.new(3.6,2.9,3.8)),S(Vector3.new(0,-1.1,-1.15)),fur,Enum.Material.Fabric,Enum.PartType.Ball)
   add("WolfHead",S(Vector3.new(2.8,2.35,2.8)),S(Vector3.new(0,-.55,-3.2)),fur,Enum.Material.Fabric,Enum.PartType.Ball)
   add("WolfMuzzle",S(Vector3.new(1.9,1.15,1.75)),S(Vector3.new(0,-.75,-4.55)),dark,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("WolfEyeL",S(Vector3.new(.22,.25,.15)),S(Vector3.new(-.62,-.25,-4.45)),id=="WHITE_FANG"and Color3.fromRGB(116,215,255)or Color3.fromRGB(245,191,68),Enum.Material.Neon,Enum.PartType.Ball)
   add("WolfEyeR",S(Vector3.new(.22,.25,.15)),S(Vector3.new(.62,-.25,-4.45)),id=="WHITE_FANG"and Color3.fromRGB(116,215,255)or Color3.fromRGB(245,191,68),Enum.Material.Neon,Enum.PartType.Ball)
   add("WolfEarL",S(Vector3.new(.62,1.15,.58)),S(Vector3.new(-.85,.85,-3.1)),dark,Enum.Material.Fabric,nil,Vector3.new(0,0,-18))
   add("WolfEarR",S(Vector3.new(.62,1.15,.58)),S(Vector3.new(.85,.85,-3.1)),dark,Enum.Material.Fabric,nil,Vector3.new(0,0,18))
   for _,x in ipairs({-1.15,1.15})do for _,zz in ipairs({-1.25,1.45})do add("WolfLeg",S(Vector3.new(2.2,.62,.62)),S(Vector3.new(x,-3.05,zz)),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))end end
   add("WolfTail",S(Vector3.new(3.2,.55,.55)),S(Vector3.new(0,-1,3)),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,28,28))
   if id=="WHITE_FANG"then add("MoonCrest",S(Vector3.new(.3,2.4,2.4)),S(Vector3.new(0,1.5,-.2)),Color3.fromRGB(154,224,255),Enum.Material.Neon,Enum.PartType.Cylinder,Vector3.new(0,0,90))end
  elseif id=="CHARGE_BOAR"then
   add("BoarBody",Vector3.new(5.4,3.5,6.2),Vector3.new(0,-1.4,.2),Color3.fromRGB(103,77,61),Enum.Material.Fabric,Enum.PartType.Ball)
   add("BoarHead",Vector3.new(3.8,3.1,3.5),Vector3.new(0,-.8,-3.5),Color3.fromRGB(122,89,66),Enum.Material.Fabric,Enum.PartType.Ball)
   add("BoarSnout",Vector3.new(2.4,1.4,1.7),Vector3.new(0,-1,-5),Color3.fromRGB(151,105,82),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("TuskL",Vector3.new(.35,.35,1.9),Vector3.new(-.9,-1.3,-5.5),Color3.fromRGB(234,224,196),Enum.Material.SmoothPlastic,nil,Vector3.new(18,0,-12))
   add("TuskR",Vector3.new(.35,.35,1.9),Vector3.new(.9,-1.3,-5.5),Color3.fromRGB(234,224,196),Enum.Material.SmoothPlastic,nil,Vector3.new(18,0,12))
  elseif id=="THORN_WASP"then
   add("WaspBody",Vector3.new(2.2,2.2,4.2),Vector3.new(0,-.4,0),Color3.fromRGB(222,181,58),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("WaspStripe",Vector3.new(2.35,.6,2.2),Vector3.new(0,-.4,.8),Color3.fromRGB(47,44,41),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("WingL",Vector3.new(.18,2.6,3.2),Vector3.new(-1.4,.6,.3),Color3.fromRGB(194,229,232),Enum.Material.Glass,nil,Vector3.new(0,0,-28))
   add("WingR",Vector3.new(.18,2.6,3.2),Vector3.new(1.4,.6,.3),Color3.fromRGB(194,229,232),Enum.Material.Glass,nil,Vector3.new(0,0,28))
   add("Stinger",Vector3.new(.35,.35,2.4),Vector3.new(0,-.4,3),Color3.fromRGB(79,58,52),Enum.Material.Metal,nil,Vector3.new(90,0,0))
  elseif id=="FOREST_LIZARD"then
   add("LizardBody",Vector3.new(4.6,2.1,6.4),Vector3.new(0,-1.5,.2),Color3.fromRGB(88,133,78),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("LizardHead",Vector3.new(3,2.1,3.3),Vector3.new(0,-1,-3.7),Color3.fromRGB(105,151,90),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("LizardTail",Vector3.new(.9,.9,6.2),Vector3.new(0,-1.4,5),Color3.fromRGB(72,116,70),Enum.Material.SmoothPlastic,Enum.PartType.Cylinder,Vector3.new(90,0,0))
  elseif id=="HORN_DEER"or id=="GOLDEN_ANTLER"then
   local big=id=="GOLDEN_ANTLER"and 1.45 or 1
   local body=id=="GOLDEN_ANTLER"and Color3.fromRGB(183,137,71)or Color3.fromRGB(145,107,68)
   local head=id=="GOLDEN_ANTLER"and Color3.fromRGB(205,160,82)or Color3.fromRGB(158,119,75)
   local antler=id=="GOLDEN_ANTLER"and Color3.fromRGB(255,214,103)or Color3.fromRGB(100,78,54)
   add("DeerBody",Vector3.new(4,2.8,5.6)*big,Vector3.new(0,-1.4,.3)*big,body,Enum.Material.Fabric,Enum.PartType.Ball)
   add("DeerHead",Vector3.new(2.5,2.6,2.6)*big,Vector3.new(0,.15,-3.2)*big,head,Enum.Material.Fabric,Enum.PartType.Ball)
   add("AntlerL",Vector3.new(.32,3.4,.32)*big,Vector3.new(-.75,2,-3.1)*big,antler,id=="GOLDEN_ANTLER"and Enum.Material.Neon or Enum.Material.Wood,nil,Vector3.new(0,0,-25))
   add("AntlerR",Vector3.new(.32,3.4,.32)*big,Vector3.new(.75,2,-3.1)*big,antler,id=="GOLDEN_ANTLER"and Enum.Material.Neon or Enum.Material.Wood,nil,Vector3.new(0,0,25))
   if id=="GOLDEN_ANTLER"then
    add("GoldenCrest",Vector3.new(2.2,.35,2.2),Vector3.new(0,2.3,-2.9)*big,Color3.fromRGB(255,230,132),Enum.Material.Neon,Enum.PartType.Ball)
   end
  elseif id=="VINE_CRAWLER"or id=="ANCIENT_HEART"then
   local big=id=="ANCIENT_HEART"and 1.4 or 1
   add("VineCore",Vector3.new(4.8,5.2,4.2)*big,Vector3.new(0,-1,0),Color3.fromRGB(75,104,61),Enum.Material.Wood,Enum.PartType.Ball)
   add("VineGlow",Vector3.new(1.2,1.2,.45)*big,Vector3.new(0,-.5,-2.2)*big,Color3.fromRGB(119,230,112),Enum.Material.Neon,Enum.PartType.Ball)
   for i=1,4 do local a=i/4*math.pi*2;add("VineArm",Vector3.new(.55,.55,5.2)*big,Vector3.new(math.cos(a)*2.6,-1.5,math.sin(a)*2.6),Color3.fromRGB(55,92,49),Enum.Material.Wood,Enum.PartType.Cylinder,Vector3.new(0,math.deg(a),25))end
   if id=="ANCIENT_HEART"then add("AncientCrown",Vector3.new(5.6,1.2,5.6),Vector3.new(0,2.8,0),Color3.fromRGB(89,126,68),Enum.Material.Grass,Enum.PartType.Ball)end
  elseif id=="MEADOW_BANDIT"or id=="WOLF_TAMER"then
   local cloth=id=="WOLF_TAMER"and Color3.fromRGB(84,105,63)or Color3.fromRGB(116,72,54)
   add("BanditTorso",Vector3.new(3.1,3.6,2),Vector3.new(0,-1.25,0),cloth,Enum.Material.Fabric,Enum.PartType.Ball)
   add("BanditHead",Vector3.new(2.35,2.3,2.2),Vector3.new(0,1.25,-.05),Color3.fromRGB(199,155,120),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("BanditHood",Vector3.new(2.65,1.05,2.6),Vector3.new(0,2,.05),Color3.fromRGB(65,57,48),Enum.Material.Fabric,Enum.PartType.Ball)
   add(id=="WOLF_TAMER"and"TamerSpear"or"BanditBlade",Vector3.new(4.2,.28,.3),Vector3.new(2.15,-1.25,-.35),Color3.fromRGB(170,172,178),Enum.Material.Metal,Enum.PartType.Cylinder,Vector3.new(0,0,90))
  elseif id=="MOSS_TURTLE"then
   add("TurtleShell",Vector3.new(5.8,2.8,6),Vector3.new(0,-1.3,.4),Color3.fromRGB(74,101,62),Enum.Material.Slate,Enum.PartType.Ball)
   add("Moss",Vector3.new(5.1,1.1,5.2),Vector3.new(0,.1,.4),Color3.fromRGB(74,126,67),Enum.Material.Grass,Enum.PartType.Ball)
   add("TurtleHead",Vector3.new(2.4,2,2.8),Vector3.new(0,-1.1,-3.6),Color3.fromRGB(99,127,79),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  end
 elseif z.Theme=="SNOW"then
  local fur=Color3.fromRGB(218,230,235);local shade=Color3.fromRGB(116,140,150);local dark=Color3.fromRGB(70,91,101)
  add("SnowBeastBody",Vector3.new(5.4,3.6,6.6),Vector3.new(0,-1.4,.2),fur,Enum.Material.Fabric,Enum.PartType.Ball)
  add("SnowBeastShoulder",Vector3.new(5.1,4,4.4),Vector3.new(0,-1.1,-1.45),Color3.fromRGB(204,222,229),Enum.Material.Fabric,Enum.PartType.Ball)
  add("SnowBeastMane",Vector3.new(5.45,4.5,3.2),Vector3.new(0,-.8,-2.05),Color3.fromRGB(232,239,242),Enum.Material.Fabric,Enum.PartType.Ball)
  add("SnowBeastHead",Vector3.new(3.5,3,3.45),Vector3.new(0,-.25,-3.85),shade,Enum.Material.Fabric,Enum.PartType.Ball)
  add("SnowBeastMuzzle",Vector3.new(2.25,1.45,1.9),Vector3.new(0,-.55,-5.35),Color3.fromRGB(137,158,166),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("SnowBeastNose",Vector3.new(1.1,.65,.34),Vector3.new(0,-.45,-6.25),dark,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
   add("SnowHornL",Vector3.new(.45,.45,2.6),Vector3.new(-1.3,1.65,-3.65),Color3.fromRGB(174,210,224),Enum.Material.Ice,nil,Vector3.new(-25,0,-18))
   add("SnowHornR",Vector3.new(.45,.45,2.6),Vector3.new(1.3,1.65,-3.65),Color3.fromRGB(174,210,224),Enum.Material.Ice,nil,Vector3.new(-25,0,18))
  add("SnowBeastEarL",Vector3.new(.78,1.25,.62),Vector3.new(-1.15,1.25,-3.55),dark,Enum.Material.Fabric,nil,Vector3.new(0,0,-20))
  add("SnowBeastEarR",Vector3.new(.78,1.25,.62),Vector3.new(1.15,1.25,-3.55),dark,Enum.Material.Fabric,nil,Vector3.new(0,0,20))
  for _,x in ipairs({-1.55,1.55})do for _,zz in ipairs({-1.6,1.75})do
   add("SnowBeastLeg",Vector3.new(2.55,.8,.8),Vector3.new(x,-3.45,zz),dark,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,90))
   add("SnowBeastPaw",Vector3.new(1.15,.55,1.55),Vector3.new(x,-4.55,zz-.25),Color3.fromRGB(91,112,120),Enum.Material.SmoothPlastic)
  end end
  add("SnowBeastTail",Vector3.new(3.4,.72,.72),Vector3.new(0,-1,3.55),fur,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,25,35))
 elseif z.Theme=="RUINS"then
  local rock=Color3.fromRGB(79,76,88);local edge=Color3.fromRGB(99,95,108)
  add("GolemBody",Vector3.new(4.3,4.7,3.6),Vector3.new(0,-1.4,0),rock,Enum.Material.Rock,Enum.PartType.Ball)
  add("GolemHead",Vector3.new(2.7,2.4,2.5),Vector3.new(0,1.55,-.3),edge,Enum.Material.Rock,Enum.PartType.Ball)
  add("GolemShoulderL",Vector3.new(2.1,2.1,2.1),Vector3.new(-2.65,-.4,0),edge,Enum.Material.Rock,Enum.PartType.Ball)
  add("GolemShoulderR",Vector3.new(2.1,2.1,2.1),Vector3.new(2.65,-.4,0),edge,Enum.Material.Rock,Enum.PartType.Ball)
  add("GolemArmL",Vector3.new(3.2,1.05,1.05),Vector3.new(-3.15,-2,0),rock,Enum.Material.Rock,Enum.PartType.Cylinder,Vector3.new(0,0,85))
  add("GolemArmR",Vector3.new(3.2,1.05,1.05),Vector3.new(3.15,-2,0),rock,Enum.Material.Rock,Enum.PartType.Cylinder,Vector3.new(0,0,95))
  add("GolemCore",Vector3.new(1.05,1.05,.36),Vector3.new(0,-.6,-1.85),z.Color,Enum.Material.Neon,Enum.PartType.Ball)
   add("GolemRuneL",Vector3.new(.4,1.4,.4),Vector3.new(-2.7,1.6,.2),z.Color,Enum.Material.Neon,Enum.PartType.Ball)
   add("GolemRuneR",Vector3.new(.4,1.4,.4),Vector3.new(2.7,1.6,.2),z.Color,Enum.Material.Neon,Enum.PartType.Ball)
 elseif z.Theme=="CANYON"then
  local skin=Color3.fromRGB(199,155,120);local cloth=Color3.fromRGB(115,69,51);local dark=Color3.fromRGB(71,52,45)
  add("BanditTorso",Vector3.new(3.1,3.6,2),Vector3.new(0,-1.25,0),cloth,Enum.Material.Fabric,Enum.PartType.Ball)
  add("BanditHead",Vector3.new(2.35,2.3,2.2),Vector3.new(0,1.25,-.05),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("BanditHood",Vector3.new(2.65,1.05,2.6),Vector3.new(0,2,.05),dark,Enum.Material.Fabric,Enum.PartType.Ball)
  add("BanditArmL",Vector3.new(2.8,.75,.75),Vector3.new(-1.85,-1.4,0),cloth,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,82))
  add("BanditArmR",Vector3.new(2.8,.75,.75),Vector3.new(1.85,-1.4,0),cloth,Enum.Material.Fabric,Enum.PartType.Cylinder,Vector3.new(0,0,98))
  add("BanditBlade",Vector3.new(3.3,.24,.3),Vector3.new(2.15,-1.25,-.35),Color3.fromRGB(170,172,178),Enum.Material.Metal,Enum.PartType.Cylinder,Vector3.new(0,0,90))
   add("BanditScarf",Vector3.new(3,.55,2.2),Vector3.new(0,.45,.05),Color3.fromRGB(152,62,49),Enum.Material.Fabric,Enum.PartType.Ball)
 else
  local armor=Color3.fromRGB(56,51,66);local glow=z.Color
  add("KnightTorso",Vector3.new(3.4,4,2.4),Vector3.new(0,-1.35,0),armor,Enum.Material.Metal,Enum.PartType.Ball)
  add("KnightHelm",Vector3.new(2.7,2.65,2.5),Vector3.new(0,1.3,-.1),Color3.fromRGB(66,61,75),Enum.Material.Metal,Enum.PartType.Ball)
  add("KnightVisor",Vector3.new(2.25,.7,.35),Vector3.new(0,1.25,-1.35),glow,Enum.Material.Neon)
  add("KnightShoulderL",Vector3.new(1.55,1.15,1.75),Vector3.new(-2.15,-.45,0),armor,Enum.Material.Metal,Enum.PartType.Ball)
  add("KnightShoulderR",Vector3.new(1.55,1.15,1.75),Vector3.new(2.15,-.45,0),armor,Enum.Material.Metal,Enum.PartType.Ball)
  add("AbyssBlade",Vector3.new(4.1,.3,.38),Vector3.new(2.55,-1.5,-.2),glow,Enum.Material.Neon,Enum.PartType.Cylinder,Vector3.new(0,0,90))
   add("KnightCape",Vector3.new(3.1,4.1,.2),Vector3.new(0,-1,.95),Color3.fromRGB(36,31,48),Enum.Material.Fabric)
   add("KnightShield",Vector3.new(.5,3.3,2.6),Vector3.new(-2.7,-1.2,0),Color3.fromRGB(67,60,83),Enum.Material.Metal)
 end
 label(rootPart,boss and("BOSS · "..displayName)or displayName,boss and Color3.fromRGB(255,198,105)or Color3.new(1,1,1),boss and 58 or 32)
 return rootPart
end
local function spawnEnemy(z,boss,index,enemyDef,spawnOverride,hiddenBoss)
 local parent=world:FindFirstChild("Zone"..z.Id);if not parent then return end
 local spec=enemyDef or(boss and z.Boss or nil)
 local a=(index or math.random(1,100))/10*math.pi*2
 local radius=boss and 86 or 55+((index or math.random(1,8))%5)*24
 local spawn=spawnOverride or(z.Center+Vector3.new(math.cos(a)*radius,boss and 6 or 4,math.sin(a)*radius))
 if boss and not spawnOverride then spawn=z.Center+Vector3.new(0,6,-86)end
 local part=enemyModel(parent,z,spawn,boss,spec)
 local hp=spec and spec.HP or(boss and z.Boss and z.Boss.HP or z.EnemyHP)
 local damage=spec and spec.Damage or(boss and z.Boss and z.Boss.Damage or z.EnemyDamage)
 local gold=spec and spec.Gold or(boss and z.Boss and z.Boss.Gold or z.RewardGold)
 local xp=spec and spec.XP or(boss and z.Boss and z.Boss.XP or z.RewardXP)
 local stagger=spec and spec.Stagger or(boss and 120 or 40)
 local runBoss=spec and z.RunBoss and spec.Id==z.RunBoss.Id
 local e={part=part,zone=z.Id,hp=hp,max=hp,damage=damage,gold=gold,xp=xp,spawn=spawn,boss=boss==true,hiddenBoss=hiddenBoss==true,runBoss=runBoss==true,def=spec,lastAttack=0,target=nil,attackPending=false,attackIndex=0,stagger=stagger,staggerMax=stagger,stunnedUntil=0,speed=spec and spec.Speed or(boss and 9 or 7),runSeed=z.Id==1 and meadowRunState.seed or 0}
 part:SetAttribute("HP",hp);part:SetAttribute("MaxHP",hp);part:SetAttribute("Zone",z.Id);part:SetAttribute("EnemyId",spec and spec.Id or"DEFAULT");part:SetAttribute("Stagger",stagger);part:SetAttribute("StaggerMax",stagger);part:SetAttribute("HiddenBoss",hiddenBoss==true)
 local status=Instance.new("BillboardGui");status.Name="EnemyStatus";status.Size=UDim2.fromOffset(boss and 110 or 84,12);status.StudsOffset=Vector3.new(0,boss and 7.4 or 5.7,0);status.AlwaysOnTop=false;status.MaxDistance=80;status.Parent=part
 local hpBack=Instance.new("Frame");hpBack.Name="HPBack";hpBack.Size=UDim2.new(1,0,.45,0);hpBack.BackgroundColor3=Color3.fromRGB(48,45,46);hpBack.BorderSizePixel=0;hpBack.Parent=status
 local hpBar=Instance.new("Frame");hpBar.Name="HP";hpBar.Size=UDim2.fromScale(1,1);hpBar.BackgroundColor3=Color3.fromRGB(194,73,67);hpBar.BorderSizePixel=0;hpBar.Parent=hpBack
 local stBack=Instance.new("Frame");stBack.Name="StaggerBack";stBack.Position=UDim2.new(0,0,.58,0);stBack.Size=UDim2.new(1,0,.32,0);stBack.BackgroundColor3=Color3.fromRGB(44,44,50);stBack.BorderSizePixel=0;stBack.Parent=status
 local stBar=Instance.new("Frame");stBar.Name="Stagger";stBar.Size=UDim2.fromScale(1,1);stBar.BackgroundColor3=Color3.fromRGB(222,184,78);stBar.BorderSizePixel=0;stBar.Parent=stBack
 local function refreshBars()
  if not part.Parent then return end
  hpBar.Size=UDim2.fromScale(math.clamp(n(part,"HP",hp)/math.max(1,n(part,"MaxHP",hp)),0,1),1)
  stBar.Size=UDim2.fromScale(math.clamp(n(part,"Stagger",stagger)/math.max(1,n(part,"StaggerMax",stagger)),0,1),1)
 end
 part:GetAttributeChangedSignal("HP"):Connect(refreshBars);part:GetAttributeChangedSignal("Stagger"):Connect(refreshBars);refreshBars()
 table.insert(enemies,e);return e
end
local function nearestEnemy(pos,zone,range)
 local best,bd=nil,range
 for _,e in ipairs(enemies)do
  if e.hp>0 and e.zone==zone and e.part.Parent and e.dormant~=true then
   local d=(e.part.Position-pos).Magnitude;if d<bd then best=e;bd=d end
  end
 end
 return best
end

local function clearMeadowRunEnemies()
 for i=#enemies,1,-1 do
  local e=enemies[i]
  if e.zone==1 then if e.part and e.part.Parent then e.part:Destroy()end;table.remove(enemies,i)end
 end
end
meadowPlayersInside=function()
 local count=0
 for _,p in ipairs(Players:GetPlayers())do if n(p,"CurrentZone",0)==1 then count+=1 end end
 return count
end
local function meadowPath(parent,a,b,index)
 local delta=b-a;local distance=delta.Magnitude;if distance<1 then return end
 local path=ppart(parent,"RunPath"..index,Vector3.new(13,1,distance),a:Lerp(b,.5)+Vector3.new(0,.55,0),Color3.fromRGB(112,104,82),Enum.Material.Ground)
 path.CFrame=CFrame.lookAt(path.Position,b+Vector3.new(0,.55,0))
end
local function meadowRoom(parent,pos,kind,index,rng)
 local color=kind=="ELITE"and Color3.fromRGB(115,104,83)or kind=="EVENT"and Color3.fromRGB(91,128,86)or kind=="TREASURE"and Color3.fromRGB(130,119,72)or Color3.fromRGB(77,126,69)
 local pad=ppart(parent,"RunRoom_"..kind.."_"..index,Vector3.new(52,1.2,52),pos+Vector3.new(0,.7,0),color,kind=="TREASURE"and Enum.Material.Cobblestone or Enum.Material.Grass)
 pad.CanCollide=true
 for j=1,8 do
  local a=j/8*math.pi*2+rng:NextNumber(-.2,.2);local rr=27+rng:NextNumber(2,9)
  if j%3==0 then rock(parent,pos+Vector3.new(math.cos(a)*rr,1,math.sin(a)*rr),.75+rng:NextNumber(0,.45),Color3.fromRGB(104,102,88))
  else tree(parent,pos+Vector3.new(math.cos(a)*rr,1,math.sin(a)*rr),.72+rng:NextNumber(0,.32))end
 end
 if kind=="EVENT"then
  local altar=ppart(parent,"MemoryAltar",Vector3.new(5,2,5),pos+Vector3.new(0,2,0),Color3.fromRGB(111,170,122),Enum.Material.Slate);label(altar,"기억 제단",Color3.fromRGB(199,255,204),28)
  prompt(altar,"기억 제단","조사").Triggered:Connect(function(p)
   if n(p,"CurrentZone",0)~=1 then return end
   local key="MeadowAltar_"..tostring(meadowRunState.seed);if p:GetAttribute(key)==true then msg(p,"이미 조사한 제단")return end
   p:SetAttribute(key,true);p:SetAttribute("Gold",n(p,"Gold",0)+25);msg(p,"기억 파편 발견 · 골드 +25");feedback(p,"SECRET_FOUND")
  end)
 elseif kind=="TREASURE"then
  local chest=ppart(parent,"HiddenChest",Vector3.new(5,3,4),pos+Vector3.new(0,2.2,0),Color3.fromRGB(143,101,55),Enum.Material.WoodPlanks);label(chest,"낡은 보물상자",Color3.fromRGB(255,224,143),24)
  prompt(chest,"보물상자","열기").Triggered:Connect(function(p)
   if n(p,"CurrentZone",0)~=1 then return end
   local key="MeadowChest_"..tostring(meadowRunState.seed);if p:GetAttribute(key)==true then msg(p,"빈 상자")return end
   p:SetAttribute(key,true);p:SetAttribute("Gold",n(p,"Gold",0)+40);msg(p,"숨은 보상 · 골드 +40");feedback(p,"SECRET_FOUND")
  end)
 end
 return pad
end
generateMeadowRun=function(seed)
 local z=portalDef(1);local zone=world and world:FindFirstChild("Zone1");if not z or not zone then return end
 clearMeadowRunEnemies()
 local old=zone:FindFirstChild("ProceduralRun");if old then old:Destroy()end
 local f=Instance.new("Folder");f.Name="ProceduralRun";f.Parent=zone
 meadowRunCounter+=1;seed=math.floor(tonumber(seed)or(100000+game.PlaceVersion*31+meadowRunCounter*97));local rng=Random.new(seed)
 meadowRunState={seed=seed,hiddenBossId="",generated=true};workspace:SetAttribute("MeadowRunSeed",seed);workspace:SetAttribute("MeadowHiddenBossDefeated",false);workspace:SetAttribute("MeadowHiddenBossId","");workspace:SetAttribute("MeadowRunBossDefeated",false)
 local roomKinds={"START","COMBAT","COMBAT","EVENT","ELITE","COMBAT","TREASURE","EXIT"}
 for i=2,#roomKinds-1 do local j=rng:NextInteger(2,#roomKinds-1);roomKinds[i],roomKinds[j]=roomKinds[j],roomKinds[i]end
 roomKinds[1]="START";roomKinds[#roomKinds]="EXIT"
 local nodes={}
 for i=1,#roomKinds do
  local zOffset=155-(i-1)*(310/(#roomKinds-1))
  local xOffset=(i==1 or i==#roomKinds)and 0 or rng:NextInteger(-115,115)
  if i>1 and nodes[i-1]then xOffset=math.clamp(xOffset,nodes[i-1].X-z.Center.X-80,nodes[i-1].X-z.Center.X+80)end
  nodes[i]=z.Center+Vector3.new(xOffset,1,zOffset)
 end
 for i=1,#nodes do
  meadowRoom(f,nodes[i],roomKinds[i],i,rng)
  if i>1 then meadowPath(f,nodes[i-1],nodes[i],i)end
 end
 local roster=z.EnemyRoster or{}
 for i=2,#nodes-1 do
  local kind=roomKinds[i]
  if kind=="COMBAT"or kind=="ELITE"then
   local count=kind=="ELITE"and 2 or rng:NextInteger(2,3)
   for j=1,count do
    local minIndex=kind=="ELITE"and math.max(1,#roster-3)or 1
    local def=roster[rng:NextInteger(minIndex,#roster)]
    local spawn=nodes[i]+Vector3.new(rng:NextInteger(-15,15),4,rng:NextInteger(-15,15))
    local e=spawnEnemy(z,false,i*10+j,def,spawn,false)
    if e and kind=="ELITE"then
     e.hp=math.floor(e.hp*1.45);e.max=e.hp;e.damage*=1.2;e.staggerMax=math.floor(e.staggerMax*1.25);e.stagger=e.staggerMax
     e.part:SetAttribute("HP",e.hp);e.part:SetAttribute("MaxHP",e.max);e.part:SetAttribute("Stagger",e.stagger);e.part:SetAttribute("Elite",true)
    end
   end
  end
 end
 local runBossDef=z.RunBoss
 if runBossDef then
  local bossPos=nodes[#nodes]+Vector3.new(0,6,-4)
  local runBoss=spawnEnemy(z,true,777,runBossDef,bossPos,false)
  if runBoss then
   runBoss.dormant=true;runBoss.part:SetAttribute("Dormant",true)
   local seal=Instance.new("Folder");seal.Name="RunBossSeal";seal.Parent=f
   local c=nodes[#nodes]+Vector3.new(0,5,0);local wallColor=Color3.fromRGB(255,211,91)
   for _,row in ipairs({
    {Size=Vector3.new(54,10,2),Pos=c+Vector3.new(0,0,-27)},
    {Size=Vector3.new(54,10,2),Pos=c+Vector3.new(0,0,27)},
    {Size=Vector3.new(2,10,54),Pos=c+Vector3.new(-27,0,0)},
    {Size=Vector3.new(2,10,54),Pos=c+Vector3.new(27,0,0)},
   })do
    local wall=ppart(seal,"BossSealWall",row.Size,row.Pos,wallColor,Enum.Material.ForceField);wall.Transparency=.42
   end
  end
 end
 local secretChance=z.Procedural and z.Procedural.SecretChance or .8
 if rng:NextNumber()<=secretChance then
  local side=rng:NextNumber()<.5 and-1 or 1;local secretPos=z.Center+Vector3.new(side*rng:NextInteger(145,178),1,rng:NextInteger(-110,110))
  local grove=ppart(f,"SecretGrove",Vector3.new(34,1,34),secretPos+Vector3.new(0,.65,0),Color3.fromRGB(59,103,63),Enum.Material.Grass);grove.Transparency=.08
  for j=1,10 do local a=j/10*math.pi*2;tree(f,secretPos+Vector3.new(math.cos(a)*22,1,math.sin(a)*22),.9)end
  local stone=ppart(f,"SecretRuneStone",Vector3.new(3,6,3),secretPos+Vector3.new(0,3.5,0),Color3.fromRGB(75,91,72),Enum.Material.Slate)
  local hiddenBossChance=z.Procedural and z.Procedural.HiddenBossChance or .35
  local hiddenBoss=rng:NextNumber()<=hiddenBossChance
  local bossDef=hiddenBoss and z.HiddenBosses[rng:NextInteger(1,#z.HiddenBosses)]or nil
  meadowRunState.hiddenBossId=bossDef and bossDef.Id or""
  workspace:SetAttribute("MeadowHiddenBossId",bossDef and bossDef.Id or"")
  local pr=prompt(stone,"수상한 룬석","조사")
  pr.Triggered:Connect(function(p)
   if n(p,"CurrentZone",0)~=1 or stone:GetAttribute("Revealed")==true then return end
   stone:SetAttribute("Revealed",true);pr.Enabled=false
   if bossDef then
    msg(p,"히든 보스 출현 · "..bossDef.Name);feedback(p,"HIDDEN_BOSS_APPEAR")
    spawnEnemy(z,true,99,bossDef,secretPos+Vector3.new(0,6,-10),true)
   else
    p:SetAttribute("Gold",n(p,"Gold",0)+65);msg(p,"비밀 숲 발견 · 골드 +65");feedback(p,"SECRET_FOUND")
    local reward=ppart(f,"SecretMemoryCrystal",Vector3.new(2.5,5,2.5),secretPos+Vector3.new(0,3,-8),Color3.fromRGB(131,225,165),Enum.Material.Neon);reward.CanCollide=false
   end
  end)
 end
 for _,p in ipairs(Players:GetPlayers())do if n(p,"CurrentZone",0)==1 then p:SetAttribute("CurrentRunSeed",seed)end end
 workspace:SetAttribute("MeadowRunRooms",#nodes);workspace:SetAttribute("MeadowRosterCount",#roster)
end

local function wakeMeadowRunBossIfReady()
 local seed=meadowRunState.seed
 if seed==0 or workspace:GetAttribute("MeadowRunBossDefeated")==true then return end
 for _,e in ipairs(enemies)do
  if e.zone==1 and e.runSeed==seed and e.hp>0 and e.part and e.part.Parent and e.runBoss~=true and e.hiddenBoss~=true then return end
 end
 for _,e in ipairs(enemies)do
  if e.zone==1 and e.runSeed==seed and e.runBoss==true and e.hp>0 and e.part and e.part.Parent and e.dormant==true then
   e.dormant=false;e.part:SetAttribute("Dormant",false);e.nextAttackAt=os.clock()+1.2
   local zone=world and world:FindFirstChild("Zone1");local run=zone and zone:FindFirstChild("ProceduralRun");local seal=run and run:FindFirstChild("RunBossSeal")
   if seal then seal:Destroy()end
   combatFlash(e.part.Position,Color3.fromRGB(255,211,91),3.2)
   for _,p in ipairs(Players:GetPlayers())do
    if n(p,"CurrentZone",0)==1 then msg(p,"초원 런 보스 봉인 해제 · "..tostring(e.def and e.def.Name or"보스"));feedback(p,"RUN_BOSS_AWAKEN")end
   end
   return
  end
 end
end

local function completeQuestIfNeeded(p,zone)
 if n(p,"QuestPortal",0)~=zone then return end
 local kills=n(p,"QuestKills",0)+1;p:SetAttribute("QuestKills",kills)
 local need=n(p,"QuestNeed",0)
 if need>0 and kills>=need then
  local rewardGold=C.QuestBaseGold+(zone-1)*25;local rewardXP=C.QuestBaseXP+(zone-1)*30
  p:SetAttribute("Gold",n(p,"Gold",0)+rewardGold);grantXP(p,rewardXP);p:SetAttribute("QuestPortal",0);p:SetAttribute("QuestNeed",0)
  msg(p,string.format("퀘스트 완료 · 골드 %d / 경험치 %d",rewardGold,rewardXP));feedback(p,"QUEST")
 end
end
local function partyKill(p,contribution)
 if p:GetAttribute("PartyHuntActive")~=true then return end
 local zone=n(p,"CurrentZone",0)
 for _,member in ipairs(roomParticipants(p))do
  if member:GetAttribute("PartyHuntActive")==true and n(member,"CurrentZone",0)==zone then
   local kills=n(member,"PartyKills",0)+1
   member:SetAttribute("PartyKills",kills)
   if member==p then member:SetAttribute("Contribution",n(member,"Contribution",0)+contribution)end
   if kills>=C.PartyHuntTarget then
    local c=n(member,"Contribution",0);local rewardGold=80+c*5;local rewardXP=80+c*6
    member:SetAttribute("Gold",n(member,"Gold",0)+rewardGold);grantXP(member,rewardXP);member:SetAttribute("PartyHuntActive",false)
    msg(member,string.format("파티 사냥 완료 · 공동 목표 · 기여도 %d · 골드 %d / 경험치 %d",c,rewardGold,rewardXP));feedback(member,"PARTY_COMPLETE")
   end
  end
 end
 broadcastMultiplayerSync(p)
end
local function killEnemy(p,e,contribution)
 if e.hp>0 then return end
 local z=portalDef(e.zone);local display=e.def and e.def.Name or(e.boss and z.Boss and z.Boss.Name or z.Enemy)
 if e.part.Parent then e.part:Destroy()end
 local classId=tostring(p:GetAttribute("ClassId")or"NONE")
 if classId=="SOUL"then
  p:SetAttribute("SoulCharge",math.min(5,n(p,"SoulCharge",0)+1))
  if p:GetAttribute("AdvancementTrialActive")==true then advanceTrial(p,1)end
 end
 p:SetAttribute("Gold",n(p,"Gold",0)+e.gold);grantXP(p,e.xp);completeQuestIfNeeded(p,e.zone);partyKill(p,contribution or 2);unlockBossCompanion(p,e)
 if e.hiddenBoss then
  workspace:SetAttribute("MeadowHiddenBossDefeated",true);msg(p,"히든 보스 격파 · "..display);feedback(p,"HIDDEN_BOSS_KILL")
 elseif e.runBoss then
  workspace:SetAttribute("MeadowRunBossDefeated",true);msg(p,"초원 런 보스 격파 · "..display);feedback(p,"BOSS_KILL")
 else
  msg(p,(e.boss and"보스 격파 · "or"처치 · ")..display);feedback(p,e.boss and"BOSS_KILL"or"KILL")
  if e.zone==1 and e.runBoss~=true and e.hiddenBoss~=true then task.defer(wakeMeadowRunBossIfReady)end
  local killedRun=e.runSeed
  task.delay(e.boss and 18 or 8,function()
   if world and world.Parent and(z.Id~=1 or meadowRunState.seed==killedRun)then spawnEnemy(z,e.boss,math.random(1,80),e.def,nil,false)end
  end)
 end
end
local function playerAttack(p,skill)
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local cd=classDef(classId)
 if not cd then msg(p,"먼저 시작 직업을 선택해.")return end
 local zone=n(p,"CurrentZone",0);if zone==0 then msg(p,"포탈을 타고 사냥터로 이동해")return end
 local r=root(p);if not r then return end;local range=skill and(classId=="RUNE"and 28 or classId=="SOUL"and 26 or 20)or 15
 local e=nearestEnemy(r.Position,zone,range);if not e then msg(p,"사거리 안에 몬스터가 없어")return end
 local now=os.clock();local adv=tostring(p:GetAttribute("AdvancementId")or"");local damage=n(p,"AttackPower",10)*(skill and cd.SkillMult or 1)
 local backstab=classId=="SHADOW"and n(p,"BackstabUntil",0)>now
 if classId=="BREAKER"then
  if adv=="RAGE_BREAKER"then local h=hum(p);if h and h.Health/h.MaxHealth<=.5 then damage*=1.28 end end
  if adv=="IRON_BREAKER"and skill then p:SetAttribute("GuardUntil",now+1.5)end
  if skill and p:GetAttribute("AdvancementTrialActive")==true then advanceTrial(p,1)end
 elseif classId=="SHADOW"then
  if backstab then damage*=adv=="ASSASSIN_TRACKER"and 1.75 or 1.38;p:SetAttribute("BackstabUntil",0);if p:GetAttribute("AdvancementTrialActive")==true then advanceTrial(p,1)end end
 elseif classId=="RUNE"and skill then
  local element=n(p,"RuneElement",1);p:SetAttribute("RuneElement",element%3+1)
  if adv=="OVERLOAD_RUNER"then
   local count=n(p,"OverloadCount",0)+1
   if count>=3 then damage*=1.55;count=0;feedback(p,"RUNE_OVERLOAD")end
   p:SetAttribute("OverloadCount",count)
  elseif adv=="ELEMENTAL_RUNER"then
   for _,other in ipairs(enemies)do
    if other~=e and other.hp>0 and other.zone==zone and other.part.Parent and(other.part.Position-e.part.Position).Magnitude<=8 then
     other.hp-=damage*.35;other.part:SetAttribute("HP",math.max(0,other.hp))
    end
   end
  end
  if p:GetAttribute("AdvancementTrialActive")==true then advanceTrial(p,1)end
 elseif classId=="SOUL"and skill then
  local charge=n(p,"SoulCharge",0)
  if charge>0 then p:SetAttribute("SoulCharge",charge-1);damage*=adv=="WRAITH_MASTER"and 1.48 or 1.22 end
  if adv=="GUARDIAN_MEDIUM"then
   local h=hum(p);if h then h.Health=math.min(h.MaxHealth,h.Health+h.MaxHealth*.14)end
   for _,member in ipairs(roomParticipants(p))do
    if member~=p and n(member,"CurrentZone",0)==zone then local mh=hum(member);local mr=root(member);if mh and mr and(mr.Position-r.Position).Magnitude<=30 then mh.Health=math.min(mh.MaxHealth,mh.Health+mh.MaxHealth*.08)end end
   end
  end
 end
 e.hp-=damage;e.part:SetAttribute("HP",math.max(0,e.hp));staggerEnemy(e,skill and 18 or 8,now);lastCombat[p]=now;p:SetAttribute("InCombat",true)
 pulseWeaponTrail(p.Character);combatFlash(e.part.Position,cd.Color,skill and 1.7 or 1.15);feedback(p,skill and"SKILL"or"ATTACK")
 if e.hp<=0 then killEnemy(p,e,skill and 3 or 2)end
 local stamp=lastCombat[p];task.delay(C.CombatLockSeconds,function()if p.Parent and lastCombat[p]==stamp then p:SetAttribute("InCombat",false)end end)
end

local function bossSpecForCompanion(def)
 local z=portalDef(def.Zone);if not z then return nil,nil end
 if z.RunBoss and z.RunBoss.Id==def.Id then return z,z.RunBoss end
 for _,b in ipairs(z.HiddenBosses or{})do if b.Id==def.Id then return z,b end end
 if z.Boss and z.Boss.Id==def.Id then return z,z.Boss end
 return z,nil
end
local function setCompanionLabel(part,text,color)
 local gui=part and part:FindFirstChildOfClass("BillboardGui");local t=gui and gui:FindFirstChildOfClass("TextLabel")
 if t then t.Text=text;t.TextColor3=color or Color3.fromRGB(235,235,230)end
end
local function despawnActiveCompanion(p,id)
 local owned=activeCompanions[p];local ai=owned and owned[id];if not ai then return end
 if ai.root and ai.root.Parent then ai.root:Destroy()end
 for i=#aiUsers,1,-1 do if aiUsers[i]==ai then table.remove(aiUsers,i)break end end
 owned[id]=nil
end
local function clearPlayerCompanions(p)
 local owned=activeCompanions[p];if not owned then return end
 local ids={};for id in pairs(owned)do table.insert(ids,id)end
 for _,id in ipairs(ids)do despawnActiveCompanion(p,id)end
 activeCompanions[p]=nil
end
local function spawnActiveCompanion(p,def)
 if not p or not p.Parent or not def then return end
 activeCompanions[p]=activeCompanions[p]or{}
 if activeCompanions[p][def.Id]then return end
 local z,spec=bossSpecForCompanion(def);local folder=world and world:FindFirstChild("ActiveBossCompanions")
 if not z or not spec or not folder then return end
 local lr=root(p);local pos=lr and(lr.Position+Vector3.new(0,3,8))or(C.VillageCenter+Vector3.new(0,5,8))
 local part=enemyModel(folder,z,pos,true,spec);part.Name="Companion_"..p.UserId.."_"..def.Id;part.CanCollide=false
 part:SetAttribute("CompanionId",def.Id);part:SetAttribute("CompanionOwner",p.UserId);setCompanionLabel(part,def.Name.." · 동료",def.Color)
 local slot=1;for _ in pairs(activeCompanions[p])do slot+=1 end
 local ai={id=def.Id,def=def,root=part,part=part,model=part,owner=p,zone=0,slot=slot,lastAttack=0,nextSkillAt=os.clock()+2}
 activeCompanions[p][def.Id]=ai;table.insert(aiUsers,ai)
end
local function moveBossCompanion(ai,destination,dt)
 if not ai.root or not ai.root.Parent then return end
 local current=ai.root.Position;local flat=Vector3.new(destination.X-current.X,0,destination.Z-current.Z)
 if flat.Magnitude<=.08 then return end
 local step=math.min(flat.Magnitude,(ai.def.Speed or 11)*dt);local nextPos=current+flat.Unit*step
 ai.root.CFrame=CFrame.lookAt(nextPos,nextPos+flat.Unit)
end
local function companionFormation(ai,leaderRoot)
 local slot=ai.slot or 1;local side=(slot-2)*6
 return leaderRoot.CFrame:PointToWorldSpace(Vector3.new(side,0,7+(slot%2)*2))
end
local function companionAttack(ai,leader,e,now)
 if not e or e.hp<=0 or not e.part.Parent or not leader then return end
 local def=ai.def;local dist=(e.part.Position-ai.root.Position).Magnitude
 if dist>(def.Range or 12)then return end
 if now-(ai.lastAttack or 0)<(def.AttackInterval or 1)then return end
 ai.lastAttack=now
 local skill=now>=(ai.nextSkillAt or 0);if skill then ai.nextSkillAt=now+(def.SkillCooldown or 7)end
 local level=math.clamp(n(leader,"Level",1),1,C.LevelCap or 60)
 local damage=(def.BaseDamage or 8)+level*(def.DamagePerLevel or .7)
 if skill then damage*=def.SkillMult or 1.5 end
 if def.Trait=="FINISHER"and e.hp/math.max(1,e.max)<=.35 then damage*=1.35 end
 if def.Trait=="ABYSS_EXECUTE"and e.stagger<=e.staggerMax*.4 then damage*=1.25 end
 e.hp-=damage;e.part:SetAttribute("HP",math.max(0,e.hp));combatFlash(e.part.Position,def.Color or Color3.fromRGB(220,200,145),skill and 1.55 or 1)
 if skill then
  if def.Trait=="STAGGER_CHARGE"then staggerEnemy(e,30,now)
  elseif def.Trait=="ROOT_GUARD"then
   e.stunnedUntil=math.max(e.stunnedUntil or 0,now+.75);local h=hum(leader);if h then h.Health=math.min(h.MaxHealth,h.Health+h.MaxHealth*.05)end
  elseif def.Trait=="RUNE_GUARD"then leader:SetAttribute("Guard",math.min(C.GuardMax,n(leader,"Guard",C.GuardMax)+18));staggerEnemy(e,16,now)
  elseif def.Trait=="ABYSS_EXECUTE"then staggerEnemy(e,20,now)
  end
 end
 if e.hp<=0 then killEnemy(leader,e,1)end
end
local function makeBossCompanionRoster()
 local roster=Instance.new("Folder");roster.Name="BossCompanionRoster";roster.Parent=world
 local active=Instance.new("Folder");active.Name="ActiveBossCompanions";active.Parent=world
 for i,def in ipairs(C.BossCompanions or{})do
  local z,spec=bossSpecForCompanion(def)
  if z and spec then
   local a=i/math.max(1,#C.BossCompanions)*math.pi*2;local pos=C.VillageCenter+Vector3.new(math.cos(a)*76,6,math.sin(a)*76)
   local part=enemyModel(roster,z,pos,true,spec);part.Name="Roster_"..def.Id;part.CanCollide=false;part:SetAttribute("CompanionId",def.Id);part:SetAttribute("RosterPreview",true)
   setCompanionLabel(part,"동료 · "..def.Name.." · 보스 격파 해금",def.Color)
   local cd=Instance.new("ClickDetector");cd.MaxActivationDistance=20;cd.Parent=part
   cd.MouseClick:Connect(function(p)
    if not companionUnlocked(p,def.Id)then msg(p,def.Name.." 보스를 먼저 격파해야 동료로 영입 가능")return end
    clickTimes[p]=clickTimes[p]or{};local now=os.clock();local last=clickTimes[p][def.Id]or 0;clickTimes[p][def.Id]=now
    if now-last>.55 then msg(p,def.Name.." · 한 번 더 눌러 파티 초대/제외")return end
    parties[p]=parties[p]or{}
    if parties[p][def.Id]then
     parties[p][def.Id]=nil;despawnActiveCompanion(p,def.Id);msg(p,def.Name.." 파티에서 제외")
    else
     local count=0;for _ in pairs(parties[p])do count+=1 end
     if count>=C.PartySlots-1 then msg(p,"동료 슬롯 3칸이 가득 찼어")return end
     parties[p][def.Id]=true;spawnActiveCompanion(p,def);msg(p,def.Name.." 파티 참가 · "..def.Role)
    end
    updatePartyCount(p)
   end)
  end
 end
end

local function buildWorld()
 local old=workspace:FindFirstChild("DaechungRPGWorld");if old then old:Destroy()end
 world=Instance.new("Folder");world.Name="DaechungRPGWorld";world.Parent=workspace
 Lighting.Brightness=2.2;Lighting.ClockTime=13.5;Lighting.FogEnd=1400;Lighting.Ambient=Color3.fromRGB(132,136,145);Lighting.OutdoorAmbient=Color3.fromRGB(145,150,160)
 makeVillage();for _,z in ipairs(C.Portals)do makeZone(z)end;makeBossCompanionRoster()
 for _,z in ipairs(C.Portals)do
  if z.Id~=1 then for i=1,10 do spawnEnemy(z,false,i)end end
  if z.Boss then spawnEnemy(z,true,1)end
 end
 if generateMeadowRun then generateMeadowRun(100000+game.PlaceVersion*31)end
 workspace:SetAttribute("WorldArtPass","RPG_FANTASY_PORTAL_WORLD_V5");workspace:SetAttribute("CharacterArtDirection","RPG_STYLIZED_TOY_FANTASY_R15");workspace:SetAttribute("MedievalAssetBase",tostring(C.MedievalCharacterAssetId))
 foundationCheckpoint("WORLD_READY",nil,{worldReady=true})
 if foundationSpawn and foundationSpawn.Parent then foundationCheckpoint("SPAWN_READY",nil,{spawnY=foundationSpawn.Position.Y})end
end

local CLASS_ACTIONS={
 [C.Actions.SELECT_BREAKER]="BREAKER",[C.Actions.SELECT_SHADOW]="SHADOW",[C.Actions.SELECT_RUNE]="RUNE",[C.Actions.SELECT_SOUL]="SOUL",
}
local function selectClass(p,classId)
 if n(p,"CurrentZone",0)~=0 then msg(p,"직업 선택은 마을에서 가능")return false end
 if tostring(p:GetAttribute("ClassId")or"NONE")~="NONE"then msg(p,"이미 시작 직업을 선택했어.")return false end
 if not classDef(classId)then return false end
 p:SetAttribute("ClassId",classId);p:SetAttribute("AdvancementId","");setStats(p,true);applyPlayerAppearance(p)
 msg(p,"시작 직업 · "..classDisplay(classId,""));feedback(p,"CLASS_SELECTED");return true
end
local function chooseAdvancement(p,key)
 if n(p,"CurrentZone",0)~=0 then msg(p,"전직은 마을에서 가능")return false end
 local classId=tostring(p:GetAttribute("ClassId")or"NONE");local cd=classDef(classId);if not cd then return false end
 if n(p,"Level",1)<C.AdvancementLevel then msg(p,"Lv."..C.AdvancementLevel.."부터 전직 가능")return false end
 local choice=cd.Advancements[key];if not choice then return false end
 local old=tostring(p:GetAttribute("AdvancementId")or"")
 if old==""then
  if p:GetAttribute("AdvancementTrialPassed")~=true then msg(p,"전직 교관의 시험을 먼저 완료해.")return false end
 else
  if p:GetAttribute("RespecReady")~=true then msg(p,"전직 교관에게 재전직을 신청해.")return false end
  if old==choice.Id then p:SetAttribute("RespecReady",false);msg(p,"이미 "..choice.Name.."이야.")return false end
  if n(p,"Gold",0)<C.AdvancementSwitchCost then p:SetAttribute("RespecReady",false);msg(p,"재전직 골드 부족")return false end
  p:SetAttribute("Gold",n(p,"Gold",0)-C.AdvancementSwitchCost)
 end
 p:SetAttribute("AdvancementId",choice.Id);p:SetAttribute("AdvancementTrialPassed",false);p:SetAttribute("AdvancementTrialProgress",0);p:SetAttribute("RespecReady",false)
 setStats(p,true);applyPlayerAppearance(p);msg(p,"1차 전직 · "..choice.Name.." · "..choice.Role);feedback(p,"ADVANCEMENT_COMPLETE");return true
end
remote.OnServerEvent:Connect(function(p,a)
 if typeof(a)~="string"then return end
 local now=os.clock();local isBlock=a==C.Actions.BLOCK_START or a==C.Actions.BLOCK_END
 if isBlock then
  if now-(lastBlockRequest[p]or 0)<.02 then return end;lastBlockRequest[p]=now
 else
  if now-(lastRequest[p]or 0)<C.RemoteMinInterval then return end;lastRequest[p]=now
 end
 local accepted=false
 if CLASS_ACTIONS[a]then accepted=selectClass(p,CLASS_ACTIONS[a])
 elseif a==C.Actions.ADVANCE_A then accepted=chooseAdvancement(p,"A")
 elseif a==C.Actions.ADVANCE_B then accepted=chooseAdvancement(p,"B")
 elseif a==C.Actions.START_ADVANCEMENT_TRIAL then startAdvancementTrial(p);accepted=true
 elseif a==C.Actions.BLOCK_START then
  if n(p,"GuardBrokenUntil",0)<=now and n(p,"Guard",C.GuardMax)>0 then
   p:SetAttribute("Blocking",true)
   if now>=n(p,"ParryRearmUntil",0)then p:SetAttribute("BlockStartedAt",now);p:SetAttribute("ParryRearmUntil",now+C.ParryRearmSeconds);feedback(p,"BLOCK_READY")
   else p:SetAttribute("BlockStartedAt",0)end
   accepted=true
  end
 elseif a==C.Actions.BLOCK_END then p:SetAttribute("Blocking",false);accepted=true
 elseif a==C.Actions.ATTACK then p:SetAttribute("Blocking",false);playerAttack(p,false);accepted=true
 elseif a==C.Actions.SKILL then p:SetAttribute("Blocking",false);playerAttack(p,true);accepted=true
 elseif a==C.Actions.DODGE then
  p:SetAttribute("Blocking",false);local r=root(p);if r then
   local classId=tostring(p:GetAttribute("ClassId")or"NONE");local adv=tostring(p:GetAttribute("AdvancementId")or"")
   local evade=adv=="MIRAGE_TRACKER"and .75 or .45;p:SetAttribute("EvasionUntil",now+evade)
   if classId=="SHADOW"then p:SetAttribute("BackstabUntil",now+2.2)end
   r.AssemblyLinearVelocity=r.CFrame.LookVector*52+Vector3.new(0,r.AssemblyLinearVelocity.Y,0);accepted=true;feedback(p,"DODGE")
  end
 elseif a==C.Actions.RETURN_VILLAGE then
  if os.clock()-(lastCombat[p]or 0)<C.CombatLockSeconds or p:GetAttribute("InCombat")==true then msg(p,"전투 중에는 마을 귀환 불가")return end
  p:SetAttribute("CurrentZone",0);p:SetAttribute("PartyHuntActive",false);teleportPlayer(p,C.VillageCenter);setStats(p,true);msg(p,"마을 귀환 · 체력 완전 회복");accepted=true
 elseif a==C.Actions.NEXT_ROOM_CODE then
  local code=n(p,"RoomCode",1)%10+1;p:SetAttribute("RoomCode",code);msg(p,"멀티 코드 "..code);accepted=true
 end
 if accepted then foundationCheckpoint("CORE_LOOP_READY",p,{action=a})end
 broadcastMultiplayerSync(p)
end)

local function validateCharacterFoundation(p,c)
 local h=c:WaitForChild("Humanoid",10);local r=c:WaitForChild("HumanoidRootPart",10)
 if not h or not r then p:SetAttribute("FoundationFailure","CHARACTER_FOUNDATION_FAILURE");return end
 if not foundationSpawn or not foundationSpawn.Parent then p:SetAttribute("FoundationFailure","SPAWN_FOUNDATION_MISSING");return end
 h.PlatformStand=false;h.AutoRotate=true;r.Anchored=false;p.RespawnLocation=foundationSpawn
 local pos=r.Position
 if pos.X~=pos.X or pos.Y~=pos.Y or pos.Z~=pos.Z or math.abs(pos.X)==math.huge or math.abs(pos.Y)==math.huge or math.abs(pos.Z)==math.huge then p:SetAttribute("FoundationFailure","INVALID_ROOT_POSITION");return end
 foundationCheckpoint("CHARACTER_READY",p,{rootAnchored=r.Anchored,platformStand=h.PlatformStand,rootX=pos.X,rootY=pos.Y,rootZ=pos.Z})
 task.spawn(function()
  local deadline=os.clock()+3
  local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Exclude;params.FilterDescendantsInstances={c}
  repeat
   if not c.Parent or not r.Parent then return end
   local hit=workspace:Raycast(r.Position,Vector3.new(0,-14,0),params)
   if hit and h.FloorMaterial~=Enum.Material.Air then foundationCheckpoint("GROUND_CONTACT",p,{groundY=hit.Position.Y,rootY=r.Position.Y});return end
   task.wait(.1)
  until os.clock()>=deadline
  p:SetAttribute("FoundationFailure","GROUND_CONTACT_FAILURE")
 end)
end

buildWorld()

local function bindPlayer(p)
 load(p)
 local function refreshAppearance()task.defer(function()task.wait(.05);setStats(p,false);applyPlayerAppearance(p)end)end
 p:GetAttributeChangedSignal("ClassId"):Connect(refreshAppearance);p:GetAttributeChangedSignal("AdvancementId"):Connect(refreshAppearance);p:GetAttributeChangedSignal("WeaponTier"):Connect(refreshAppearance);p:GetAttributeChangedSignal("ArmorTier"):Connect(refreshAppearance)
 p.CharacterAdded:Connect(function(c)
  task.wait(.35);setStats(p,true);p:SetAttribute("CurrentZone",0);p:SetAttribute("Blocking",false);p:SetAttribute("Guard",C.GuardMax);teleportPlayer(p,C.VillageCenter);applyPlayerAppearance(p);validateCharacterFoundation(p,c)
 end)
 if p.Character then task.defer(function()task.wait(.35);setStats(p,true);teleportPlayer(p,C.VillageCenter);applyPlayerAppearance(p);validateCharacterFoundation(p,p.Character)end)end
end
Players.PlayerAdded:Connect(bindPlayer)
for _,p in ipairs(Players:GetPlayers())do bindPlayer(p)end
Players.PlayerRemoving:Connect(function(p)save(p);clearPlayerCompanions(p);parties[p]=nil;clickTimes[p]=nil;lastRequest[p]=nil;lastBlockRequest[p]=nil;lastCombat[p]=nil;qaCaptureLast[p]=nil;movementProbeStart[p]=nil;foundationLast[p]=nil end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

foundationRemote.OnServerEvent:Connect(function(p,name)
 if typeof(name)~="string"then return end
 if name=="REMOTE_PING"then foundationRemote:FireClient(p,"REMOTE_PONG");return end
 if name=="REMOTE_ROUNDTRIP"then foundationCheckpoint("REMOTE_ROUNDTRIP",p,{roundtrip=true});return end
 local now=os.clock();if now-(foundationLast[p]or 0)<.05 then return end;foundationLast[p]=now
 if name=="CAMERA_READY"or name=="INPUT_READY"then foundationCheckpoint(name,p,{clientReported=true})end
end)

qaCaptureRemote.OnServerEvent:Connect(function(p,labelName,value)
 if C.QACameraEnabled~=true or not qaCaptureStore then return end;if typeof(labelName)~="string"then return end
 local raw=tostring(value or"");if #raw<1 or #raw>160 then return end;local isStatus=labelName=="STATUS";if not isStatus and not raw:match("^%d+$")then return end
 local now=os.clock();if now-(qaCaptureLast[p]or 0)<.18 then return end;qaCaptureLast[p]=now
 local rec={gameId=C.GameId,label=labelName,userId=p.UserId,capturedAt=os.time(),kind=isStatus and"STATUS"or"CAPTURE"}
 if isStatus then rec.status=raw else rec.assetId=raw end
 pcall(function()qaCaptureStore:UpdateAsync("latest",function(old)local d=typeof(old)=="table"and old or{captures={}};d.captures=typeof(d.captures)=="table"and d.captures or{};table.insert(d.captures,rec);while #d.captures>30 do table.remove(d.captures,1)end;d.updatedAt=os.time();d.gameId=C.GameId;return d end)end)
end)

RunService.Heartbeat:Connect(function(dt)
 local now=os.clock()
 for _,p in ipairs(Players:GetPlayers())do
  local h=hum(p);local r=root(p)
  if h and r and h.MoveDirection.Magnitude>.05 then
   local start=movementProbeStart[p]
   if not start then movementProbeStart[p]=r.Position
   elseif (r.Position-start).Magnitude>=2 then foundationCheckpoint("MOVEMENT_CONFIRMED",p,{displacement=(r.Position-start).Magnitude});movementProbeStart[p]=nil end
  elseif h and h.MoveDirection.Magnitude<=.05 then movementProbeStart[p]=nil end
 end
 -- 몬스터: 같은 지역 플레이어만 추적, 일정 거리 밖이면 원위치로 돌아간다.
 for _,e in ipairs(enemies)do
  if e.hp>0 and e.part.Parent then
   local z=portalDef(e.zone)
   if e.dormant==true then
    e.part.AssemblyLinearVelocity=Vector3.zero
   else
   local target,bd=nil,z.Aggro
   for _,p in ipairs(Players:GetPlayers())do
    if n(p,"CurrentZone",0)==e.zone then local r=root(p);local h=hum(p);if r and h and h.Health>0 then local d=(r.Position-e.part.Position).Magnitude;if d<bd then target=p;bd=d end end end
   end
   if target then
    local tr=root(target);local d=tr and Vector3.new(tr.Position.X-e.part.Position.X,0,tr.Position.Z-e.part.Position.Z)
    local attackDef=e.def and e.def.Attack;local engage=(attackDef and attackDef.Range)or(e.def and e.def.Attacks and 18)or 5.5
    if d and d.Magnitude>math.max(4,engage*.78)and now>=(e.stunnedUntil or 0)and not e.attackPending then e.part.CFrame=e.part.CFrame+d.Unit*math.min(d.Magnitude,(e.speed or 7)*dt)end
    if tr and(tr.Position-e.part.Position).Magnitude<=engage and now>=(e.nextAttackAt or 0)and now>=(e.stunnedUntil or 0)then beginEnemyAttack(e,target,now)end
   else
    local back=Vector3.new(e.spawn.X-e.part.Position.X,0,e.spawn.Z-e.part.Position.Z)
    if back.Magnitude>2 then e.part.CFrame=e.part.CFrame+back.Unit*math.min(back.Magnitude,9*dt)end
   end
   if (e.part.Position-e.spawn).Magnitude>z.Leash then e.part.CFrame=CFrame.new(e.spawn)end
   end
  end
 end

 -- 보스 동료: 해금한 보스 중 최대 3명을 편성하고, 전투력은 리더 레벨에 자동 동기화한다.
 for _,ai in ipairs(aiUsers)do
  local leader=ai.owner
  if leader and leader.Parent and partyHas(leader,ai.id)and ai.root and ai.root.Parent then
   local zone=n(leader,"CurrentZone",0);local lr=root(leader)
   if lr then
    local desired=companionFormation(ai,lr)
    if ai.zone~=zone or(ai.root.Position-lr.Position).Magnitude>90 then
     ai.zone=zone;ai.root.CFrame=lr.CFrame*CFrame.new((ai.slot-2)*6,0,8)
    elseif(ai.root.Position-desired).Magnitude>3 then moveBossCompanion(ai,desired,dt)end
    if zone>0 then
     local e=nearestEnemy(ai.root.Position,zone,math.max(24,(ai.def.Range or 12)+10))
     if e then
      local dist=(e.part.Position-ai.root.Position).Magnitude
      if dist>(ai.def.Range or 12)*.82 then moveBossCompanion(ai,e.part.Position,dt)end
      companionAttack(ai,leader,e,now)
     end
    end
   end
  end
 end

 for _,p in ipairs(Players:GetPlayers())do
  local zone=n(p,"CurrentZone",0)
  if zone==0 then local h=hum(p);if h and h.Health<h.MaxHealth then h.Health=math.min(h.MaxHealth,h.Health+25*dt)end end
  if p:GetAttribute("Blocking")~=true and now>=n(p,"GuardBrokenUntil",0)then
   local guard=n(p,"Guard",C.GuardMax);if guard<C.GuardMax then p:SetAttribute("Guard",math.min(C.GuardMax,guard+C.GuardRegenPerSecond*dt))end
  end
  if p:GetAttribute("InCombat")==true and now-(lastCombat[p]or 0)>=C.CombatLockSeconds then p:SetAttribute("InCombat",false)end
 end
 for i=#enemies,1,-1 do if enemies[i].hp<=0 or not enemies[i].part.Parent then table.remove(enemies,i)end end
end)
