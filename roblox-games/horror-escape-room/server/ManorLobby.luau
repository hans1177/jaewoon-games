-- 파일명: roblox-games/horror-escape-room/server/ManorLobby.luau
-- 블렌더 저택 · 개인 공간, 서버 권한 상호작용, 기존 세이브 및 전투 흐름 유지.
-- 임포트
local Players=game:GetService("Players")
local AssetService=game:GetService("AssetService")
local TweenService=game:GetService("TweenService")
local PhysicsService=game:GetService("PhysicsService")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local Assets=require(RS.Shared.ManorAssets)
local Manor={}
Manor.__index=Manor

local function part(parent,name,pos,size,ground)
 local p=Instance.new("Part");p.Name=name;p.Position=pos;p.Size=size;p.Anchored=true
 p.Transparency=1;p.CanCollide=true;p.CanTouch=false;p.CanQuery=true
 p:SetAttribute("WalkableGround",ground==true);p.Parent=parent;return p
end
local function namedParts(model,prefix)
 local result={}
 for _,d in ipairs(model:GetDescendants())do
  if d:IsA("BasePart")and string.sub(d.Name,1,#prefix)==prefix then table.insert(result,d)end
 end
 return result
end
local function move(parts,delta,duration)
 for _,p in ipairs(parts)do
  if p.Parent then TweenService:Create(p,TweenInfo.new(duration,Enum.EasingStyle.Quad),{CFrame=delta*p.CFrame}):Play()end
 end
end
local function stamp(p,speaker,text)
 p:SetAttribute("LobbyStoryEvent",speaker.."|"..text.."|"..tostring(workspace:GetServerTimeNow()))
end

function Manor.new(remote)
 assert(Assets.ModelId>0,"MANOR_NATIVE_ASSET_NOT_PUBLISHED")
 local self=setmetatable({remote=remote,rooms={},slots={},ready=false},Manor)
 local old=workspace:FindFirstChild("MidnightLobby");if old then old:Destroy()end
 self.root=Instance.new("Folder");self.root.Name="MidnightLobby";self.root.Parent=workspace
 local ok,template=pcall(AssetService.LoadAssetAsync,AssetService,Assets.ModelId)
 assert(ok and template,"MANOR_NATIVE_ASSET_LOAD_FAILED")
 for _,d in ipairs(template:GetDescendants())do
  if d:IsA("LuaSourceContainer")or d:IsA("RemoteEvent")or d:IsA("RemoteFunction")or d:IsA("Tool")or d:IsA("JointInstance")or d:IsA("WeldConstraint")then d:Destroy()
  elseif d:IsA("BasePart")then d.Anchored=true;d.CanCollide=false;d.CanTouch=false end
 end
 local _,size=template:GetBoundingBox()
 assert(size.X>1 and #namedParts(template,"Butler_")>0,"MANOR_NATIVE_MODEL_INVALID")
 template:ScaleTo(template:GetScale()*Assets.SourceWidth/size.X)
 local bbox=template:GetBoundingBox()
 template:PivotTo(CFrame.new(Assets.SourceCenter)*bbox:Inverse()*template:GetPivot())
 template.Parent=nil;self.template=template
 self.ranking=DSS:GetOrderedDataStore("midnight-manor-archive-v1")
 self.rankingCache={};self.rankingAt=0;self.rankingRequests={}
 for _,name in ipairs({"ManorGag","ManorAvatar"})do pcall(function()PhysicsService:RegisterCollisionGroup(name)end)end
 PhysicsService:CollisionGroupSetCollidable("ManorGag","ManorAvatar",false)
 PhysicsService:CollisionGroupSetCollidable("ManorGag","ManorGag",false)
 Players.PlayerRemoving:Connect(function(p)self:Remove(p)end)
 self.ready=true
 workspace:SetAttribute("PersonalLobby",true)
 workspace:SetAttribute("LobbyArtPass","BLENDER_MONSTER_FAMILY_V2")
 workspace:SetAttribute("LobbyBuildRevision","BLENDER_MANOR_20260930")
 return self
end

function Manor:Get(p)
 if self.rooms[p]then return self.rooms[p]end
 local index=0;while self.slots[index]do index+=1 end;self.slots[index]=p
 local origin=Vector3.new(index*256,0,270)
 local folder=Instance.new("Model");folder.Name="PersonalManor_"..p.UserId;folder:SetAttribute("OwnerUserId",p.UserId);folder.Parent=self.root
 local scene=self.template:Clone();scene.Name="ManorScene";scene:PivotTo(CFrame.new(origin)*scene:GetPivot());scene.Parent=folder
 part(folder,"PersonalGround",origin+Vector3.new(0,-.15,-2),Vector3.new(84,1,90),true)
 for _,spec in ipairs({{-42,8,-2,1,18,90},{42,8,-2,1,18,90},{0,8,-47,84,18,1},{0,8,43,84,18,1},
  {-29,10,-23,1.5,20,40},{29,10,-23,1.5,20,40},{0,10,-43,58,20,1},{-20,10,-3,24,20,2},{20,10,-3,24,20,2}})do
  part(folder,"ManorBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 local spawn=Instance.new("SpawnLocation");spawn.Name="PersonalSpawn";spawn.Position=origin+Vector3.new(0,.4,-9)
 spawn.Size=Vector3.new(8,.1,8);spawn.Anchored=true;spawn.Transparency=1;spawn.CanCollide=false;spawn.CanTouch=false;spawn.Neutral=true;spawn.Duration=0;spawn.Parent=folder
 local room={folder=folder,scene=scene,origin=origin,spawn=spawn,index=index,busy=false,gag=0,lastPrompt=0}
 self.rooms[p]=room
 p:SetAttribute("ManorOriginX",origin.X);p:SetAttribute("PersonalLobbyOwner",p.UserId)
 p.RespawnLocation=spawn
 local function prompt(name,pos,caption,menu)
  local anchor=part(folder,name,origin+pos,Vector3.new(1,1,1),false);anchor.CanCollide=false
  local pr=Instance.new("ProximityPrompt");pr.ObjectText=caption;pr.ActionText="살펴보기";pr.MaxActivationDistance=11;pr.RequiresLineOfSight=false;pr.HoldDuration=.1;pr.Parent=anchor
  pr.Triggered:Connect(function(visitor)
   if visitor~=p or not p.Parent or p:GetAttribute("RoundState")=="RUNNING"then return end
   local rr=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
   if not rr or(rr.Position-anchor.Position).Magnitude>14 or os.clock()-room.lastPrompt<.5 then return end
   room.lastPrompt=os.clock();self.remote:FireClient(p,"MANOR_MENU",menu)
   if name=="ButlerPrompt"then
    stamp(p,"집사 모티머",p:GetAttribute("MonsterPreference")=="MONSTER"and"오늘은 사냥하러 나가시는군요. 현관 매트에는 발톱을 닦아주십시오."or"무사히 돌아오십시오. 관은 아직 주문하지 않았습니다.")
   elseif name=="ArchivistPrompt"then stamp(p,"기록관 에드윈","목격담은 세 번 확인합니다. 제 머리 위치만 빼고요.")
   elseif name=="MerchantPrompt"then stamp(p,"의상실 주인 벨라","옷은 오래 입으셔도 됩니다. 저희 가족은 시간이 많거든요.")end
  end)
 end
 prompt("ButlerPrompt",Vector3.new(5,4,-9),"집사 모티머 · 출정","PLAY")
 prompt("ArchivistPrompt",Vector3.new(-18,4,-27),"목 없는 기록관 · 도감","BOOK")
 prompt("MerchantPrompt",Vector3.new(20,4,-20),"처녀귀신 벨라 · 의상실","DRESS")
 prompt("InvitationPrompt",Vector3.new(-12,4,-18),"막내 유령 · 가족 초대장","EVENT")
 for _,pos in ipairs({Vector3.new(0,15,-22),Vector3.new(-21,6,15),Vector3.new(23,6,19),Vector3.new(-18,8,-25),Vector3.new(20,8,-19),Vector3.new(0,5,-38)})do
  local anchor=part(folder,"WarmLight",origin+pos,Vector3.one,false);anchor.CanCollide=false
  local light=Instance.new("PointLight");light.Color=Color3.fromRGB(244,171,95);light.Brightness=1.6;light.Range=30;light.Shadows=true;light.Parent=anchor
 end
 -- 움직이는 장식은 비충돌, 가구의 몸체만 기존 바닥 위에서 이동을 막는다.
 for _,spec in ipairs({{-21,2,-39,13,4,3},{20,2,-38,13,4,3},{24,4,-31,5,8,3},{0,3,-41,13,6,4}})do
  part(folder,"FurnitureBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 for _,mesh in ipairs(scene:GetDescendants())do
  if mesh:IsA("BasePart")and (mesh.Name:match("^HearthFlame")or mesh.Name:match("^ChandelierFlame"))then
   mesh.Material=Enum.Material.Neon;mesh.Color=Color3.fromRGB(255,185,99)
  end
 end
 -- Owner records turn the back wall into a personal collection display.
 local function collection()
  local count=math.clamp(tonumber(p:GetAttribute("GhostSeenCount"))or 0,0,12)
  for i=1,12 do for _,mesh in ipairs(namedParts(scene,"PortraitCanvas"..i))do
   if mesh.Name=="PortraitCanvas"..i then mesh.Color=i<=count and Color3.fromRGB(255,239,206)or Color3.fromRGB(130,122,119)end
  end end
 end
 room.collection=p:GetAttributeChangedSignal("GhostSeenCount"):Connect(collection);collection()
 task.spawn(function()
  while folder.Parent and p.Parent do
   task.wait(24+math.random()*16)
   if folder.Parent and p:GetAttribute("RoundState")=="ROOM_BROWSER"then self:Gag(p)end
  end
 end)
 return room
end

function Manor:GetSpawn(p)
 local room=self:Get(p)
 return room.origin+Vector3.new(0,3,-9),room.origin+Vector3.new(0,4,-27),room.spawn
end
function Manor:Dress(p)
 local char=p.Character;if not char then return end
 local old=char:FindFirstChild("ManorDecoration");if old then old:Destroy()end
 local id=p:GetAttribute("EquippedCosmetic")or"DEFAULT";if id=="DEFAULT"then return end
 local head=char:FindFirstChild("Head");local torso=char:FindFirstChild("UpperTorso")or char:FindFirstChild("Torso")
 if not head or not torso then return end
 local model=Instance.new("Model");model.Name="ManorDecoration";model.Parent=char
 local colors={MIDNIGHT_RED=Color3.fromRGB(165,38,65),MOON_BLUE=Color3.fromRGB(56,81,130),TOXIC_GREEN=Color3.fromRGB(63,145,99),VOID_PURPLE=Color3.fromRGB(112,63,138)}
 local specs=id=="MOON_BLUE"and{{"UndertakerHatBrim",head,Vector3.new(0,.65,0),.6},{"UndertakerHat",head,Vector3.new(0,1.3,0),.6}}
  or{{"Butler_BowTie",torso,Vector3.new(0,.55,-.65),1.25}}
 for _,spec in ipairs(specs)do
  local template=nil
  for _,candidate in ipairs(namedParts(self.template,spec[1]))do if candidate.Name==spec[1]then template=candidate;break end end
  if template then
   local mesh=template:Clone();mesh.Anchored=false;mesh.CanCollide=false;mesh.CanTouch=false;mesh.Massless=true
   mesh.Size*=spec[4];mesh.Color=colors[id]or Color3.new(1,1,1);mesh.CFrame=spec[2].CFrame*CFrame.new(spec[3]);mesh.Parent=model
   local weld=Instance.new("WeldConstraint");weld.Part0=spec[2];weld.Part1=mesh;weld.Parent=mesh
  end
 end
end
function Manor:Rank(p)
 if os.clock()-(self.rankingRequests[p]or-100)<15 then self.remote:FireClient(p,"MANOR_RANKING",self.rankingCache);return end
 self.rankingRequests[p]=os.clock()
 local score=(p:GetAttribute("GhostCompleted")or 0)*100+(p:GetAttribute("GhostSeenCount")or 0)
 local ok=pcall(function()self.ranking:SetAsync(tostring(p.UserId),score)end)
 if os.clock()-self.rankingAt>60 or self.rankingAt==0 then
  ok=pcall(function()
   local rows=self.ranking:GetSortedAsync(false,10):GetCurrentPage();local result={}
   for _,row in ipairs(rows)do
    local id=tonumber(row.key);local name="조사원 "..row.key
    if id then local found,display=pcall(Players.GetNameFromUserIdAsync,Players,id);if found then name=display end end
    table.insert(result,{Name=name,Complete=math.floor(row.value/100),Seen=row.value%100})
   end
   self.rankingCache=result;self.rankingAt=os.clock()
  end)
 end
 self.remote:FireClient(p,"MANOR_RANKING",ok and self.rankingCache or false)
end
function Manor:Gag(p)
 local room=self.rooms[p];if not room or room.busy then return end
 local rr=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
 if not rr or(rr.Position-room.origin).Magnitude>90 then return end
 room.busy=true;room.gag=room.gag%3+1
 local prefix=room.gag==1 and"Butler_Skull"or room.gag==2 and"ArmorHelmet"or"CoffinLid"
 local pieces=namedParts(room.scene,prefix)
 -- The head's face meshes travel together; an invisible assembly root is unnecessary.
 if room.gag==1 then
  pieces={}
  for _,name in ipairs({"Butler_Skull","Butler_Nose","Butler_Eye","Butler_Brow","Butler_Mouth"})do
   for _,part0 in ipairs(namedParts(room.scene,name))do table.insert(pieces,part0)end
  end
 end
 local saved={};local rootPart=pieces[1]
 if rootPart then
  for _,mesh in ipairs(pieces)do
   saved[mesh]=mesh.CFrame;mesh.CollisionGroup="ManorGag";mesh.Anchored=false;mesh.CanCollide=true
   if mesh~=rootPart then local weld=Instance.new("WeldConstraint");weld.Name="ManorGagWeld";weld.Part0=rootPart;weld.Part1=mesh;weld.Parent=rootPart end
  end
  rootPart:SetNetworkOwner(nil)
  rootPart.AssemblyLinearVelocity=room.gag==3 and Vector3.new(0,12,2)or Vector3.new(-3,3,5)
  rootPart.AssemblyAngularVelocity=Vector3.new(1,0,room.gag==3 and 1 or 4)
  stamp(p,room.gag==1 and"집사 모티머"or room.gag==2 and"갑옷 경비"or"의상실 주인 벨라",
   room.gag==1 and"고개를 너무 깊이 숙였군요. 잠시만 실례하겠습니다."or room.gag==2 and"위협적인 자세는 관절 보증에 포함되지 않습니다."or"아직 영업시간입니다. 안에서 기다리세요.")
  task.wait(2.2)
  for mesh in pairs(saved)do if mesh.Parent then mesh.Anchored=true;mesh.CanCollide=false;mesh.AssemblyLinearVelocity=Vector3.zero;mesh.AssemblyAngularVelocity=Vector3.zero end end
  for _,w in ipairs(rootPart:GetChildren())do if w.Name=="ManorGagWeld"then w:Destroy()end end
  for mesh,cf in pairs(saved)do if mesh.Parent then TweenService:Create(mesh,TweenInfo.new(.7,Enum.EasingStyle.Back),{CFrame=cf}):Play()end end
  task.wait(.8)
 end
 room.busy=false
end
function Manor:Recover(p)
 local room=self:Get(p);local r=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
 if not r then return nil end
 local localPos=r.Position-room.origin
 if localPos.Y< -2 or localPos.Y>22 or math.abs(localPos.X)>42 or localPos.Z< -47 or localPos.Z>43 then return self:GetSpawn(p)end
 return nil
end
function Manor:Remove(p)
 local r=self.rooms[p];if not r then return end
 if r.collection then r.collection:Disconnect()end
 self.slots[r.index]=nil;self.rooms[p]=nil;self.rankingRequests[p]=nil;r.folder:Destroy()
end
return Manor
