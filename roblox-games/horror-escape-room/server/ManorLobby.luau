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
local C=require(RS.Shared.GameConfig)
local Manor={}
Manor.__index=Manor

local function part(parent,name,pos,size,ground)
 local p=Instance.new("Part");p.Name=name;p.Position=pos;p.Size=size;p.Anchored=true
 p.Transparency=1;p.CanCollide=true;p.CanTouch=false
 -- 카메라/시야 raycast는 투명 충돌벽에 막히지 않는다. 실제 지면만 query 대상으로 둔다.
 p.CanQuery=ground==true
 p:SetAttribute("WalkableGround",ground==true);p.Parent=parent;return p
end
local function namedParts(model,prefix)
 local result={}
 for _,d in ipairs(model:GetDescendants())do
  if d:IsA("BasePart")and string.sub(d.Name,1,#prefix)==prefix then table.insert(result,d)end
 end
 return result
end
local function manorPlaque(parent,owner,origin)
 local anchor=part(parent,"ManorOwnerPlaque",origin+Vector3.new(0,17.8,-.20),Vector3.new(8.2,1.45,.18),false)
 anchor.Transparency=1;anchor.CanCollide=false;anchor.CanTouch=false;anchor.CanQuery=false
 local gui=Instance.new("SurfaceGui");gui.Name="ManorOwnerPlaqueGui";gui.Adornee=anchor;gui.Face=Enum.NormalId.Back
 gui.CanvasSize=Vector2.new(820,145);gui.AlwaysOnTop=false;gui.LightInfluence=.15;gui.Parent=anchor
 local text=Instance.new("TextLabel");text.Name="OwnerPlaqueText";text.Size=UDim2.fromScale(1,1);text.BackgroundTransparency=1
 text.Font=Enum.Font.Antique;text.TextScaled=true;text.TextColor3=Color3.fromRGB(222,196,137);text.TextStrokeTransparency=.68;text.Parent=gui
 local function refresh()
  local public=owner:GetAttribute("ManorVisibility")=="PUBLIC"
  local visibility=public and"공개"or"비공개"
  local visitors=math.max(0,tonumber(owner:GetAttribute("ManorVisitorCount"))or 0)
  text.Text=string.format("%s의 저택  ·  %s  ·  방문 %d",owner.DisplayName,visibility,visitors)
  text.TextColor3=public and Color3.fromRGB(232,204,145)or Color3.fromRGB(164,145,112)
 end
 refresh()
 return anchor,refresh
end
local function stamp(p,speaker,text)
 p:SetAttribute("LobbyStoryEvent",speaker.."|"..text.."|"..tostring(workspace:GetServerTimeNow()))
end

function Manor.new(remote,selectMap)
 assert(Assets.ModelId>0,"MANOR_NATIVE_ASSET_NOT_PUBLISHED")
 local self=setmetatable({remote=remote,selectMap=selectMap,rooms={},slots={},ready=false},Manor)
 local old=workspace:FindFirstChild("MidnightLobby");if old then old:Destroy()end
 self.root=Instance.new("Folder");self.root.Name="MidnightLobby";self.root.Parent=workspace
 -- 게시 빌드에 검증된 모델을 포함해 새 서버가 자산 서버를 다시 기다리지 않게 한다.
 local packaged=game:GetService("ServerStorage"):FindFirstChild("ManorTemplate")
 local ok,template=true,packaged and packaged:Clone()
 if not template then ok,template=pcall(AssetService.LoadAssetAsync,AssetService,Assets.ModelId)end
 assert(ok and template,"MANOR_NATIVE_ASSET_LOAD_FAILED")
 for _,d in ipairs(template:GetDescendants())do
  if d:IsA("LuaSourceContainer")or d:IsA("RemoteEvent")or d:IsA("RemoteFunction")or d:IsA("Tool")or d:IsA("JointInstance")or d:IsA("WeldConstraint")then d:Destroy()
  elseif d:IsA("BasePart")then
   -- 수입 GLB는 100% 시각 레이어다. 이동 충돌은 아래의 단순 서버 충돌체만 담당한다.
   d.Anchored=true;d.CanCollide=false;d.CanTouch=false;d.CanQuery=false
   local finish=Assets.Finishes and(Assets.Finishes[d.Name]or(d.Parent and Assets.Finishes[d.Parent.Name]))
   if finish then d.Material=Enum.Material[finish]end
  end
 end
 local _,size=template:GetBoundingBox()
 assert(size.X>1 and #namedParts(template,"Butler_")>0,"MANOR_NATIVE_MODEL_INVALID")
 template:ScaleTo(template:GetScale()*Assets.SourceWidth/size.X)
 -- Roblox 변환 뒤에는 HallFloor→Courtyard 실제 방향과 거리를 authored 좌표에 맞춘다.
 -- 이 쌍이 앞/뒤 뒤집힘까지 교정하며, 기준 파츠가 없거나 비정상이면 nonfatal fallback한다.
 local function exactVisualPart(name)
  for _,d in ipairs(template:GetDescendants())do
   if d:IsA("BasePart")and d.Name==name then return d end
  end
  return nil
 end
 local expectedHall=Vector3.new(0,.1,-29)
 local expectedCourtyard=Vector3.new(0,-.2,20)
 local hallAnchor=exactVisualPart("HallFloor")
 local courtyardAnchor=exactVisualPart("Courtyard")
 if hallAnchor and courtyardAnchor then
  local actualSpan=courtyardAnchor.Position-hallAnchor.Position
  local actualFlat=Vector3.new(actualSpan.X,0,actualSpan.Z)
  local expectedFlat=Vector3.new(0,0,49)
  if actualFlat.Magnitude>10 then
   local pairScale=expectedFlat.Magnitude/actualFlat.Magnitude
   template:ScaleTo(template:GetScale()*pairScale)
   hallAnchor=exactVisualPart("HallFloor")
   courtyardAnchor=exactVisualPart("Courtyard")
   actualSpan=courtyardAnchor.Position-hallAnchor.Position
   actualFlat=Vector3.new(actualSpan.X,0,actualSpan.Z)
   local heading=math.atan2(actualFlat.X,actualFlat.Z)
   local transform=CFrame.new(expectedHall)*CFrame.Angles(0,-heading,0)*CFrame.new(-hallAnchor.Position)
   template:PivotTo(transform*template:GetPivot())
   hallAnchor=exactVisualPart("HallFloor")
   courtyardAnchor=exactVisualPart("Courtyard")
   self.visualAnchorMode="HALL_COURTYARD_PAIR"
   self.visualAnchorPairScale=pairScale
   self.visualAnchorYawDegrees=math.deg(heading)
  else
   local delta=expectedHall-hallAnchor.Position
   template:PivotTo(CFrame.new(delta)*template:GetPivot())
   self.visualAnchorMode="HALL_FLOOR_TRANSLATION"
  end
 elseif hallAnchor then
  local delta=expectedHall-hallAnchor.Position
  template:PivotTo(CFrame.new(delta)*template:GetPivot())
  self.visualAnchorMode="HALL_FLOOR_TRANSLATION"
 else
  local bbox=template:GetBoundingBox()
  template:PivotTo(CFrame.new(Assets.SourceCenter)*bbox:Inverse()*template:GetPivot())
  self.visualAnchorMode="SOURCE_CENTER_FALLBACK"
 end
 hallAnchor=exactVisualPart("HallFloor")
 courtyardAnchor=exactVisualPart("Courtyard")
 self.visualAnchorHallError=hallAnchor and(hallAnchor.Position-expectedHall).Magnitude or -1
 self.visualAnchorCourtyardError=courtyardAnchor and(courtyardAnchor.Position-expectedCourtyard).Magnitude or -1
 template.Parent=nil;self.template=template
 self.ranking=DSS:GetOrderedDataStore("midnight-manor-archive-v1")
 self.rankingCache={};self.rankingAt=0;self.rankingRequests={}
 for _,name in ipairs({"ManorGag","ManorAvatar"})do pcall(function()PhysicsService:RegisterCollisionGroup(name)end)end
 PhysicsService:CollisionGroupSetCollidable("ManorGag","ManorAvatar",false)
 PhysicsService:CollisionGroupSetCollidable("ManorGag","ManorGag",false)
 Players.PlayerRemoving:Connect(function(p)self:Remove(p)end)
 self.ready=true
 workspace:SetAttribute("PersonalLobby",true)
 workspace:SetAttribute("LobbyArtPass","REBUILD_PENDING_STUDIO")
 workspace:SetAttribute("LobbyBuildRevision","BLENDER_MANOR_REBUILD_20261002")
 workspace:SetAttribute("ManorVisualAnchorMode",self.visualAnchorMode or"UNKNOWN")
 workspace:SetAttribute("ManorVisualAnchorHallError",self.visualAnchorHallError or -1)
 workspace:SetAttribute("ManorVisualAnchorCourtyardError",self.visualAnchorCourtyardError or -1)
 workspace:SetAttribute("ManorVisualAnchorPairScale",self.visualAnchorPairScale or 1)
 workspace:SetAttribute("ManorVisualAnchorYawDegrees",self.visualAnchorYawDegrees or 0)
 return self
end

function Manor:Get(p)
 if self.rooms[p]then return self.rooms[p]end
 local index=0;while self.slots[index]do index+=1 end;self.slots[index]=p
 local origin=Vector3.new(index*256,0,270)
 local folder=Instance.new("Model");folder.Name="PersonalManor_"..p.UserId;folder:SetAttribute("OwnerUserId",p.UserId)
 local scene=self.template:Clone();scene.Name="ManorScene";scene:PivotTo(CFrame.new(origin)*scene:GetPivot());scene.Parent=folder
 part(folder,"PersonalGround",origin+Vector3.new(0,-.15,10),Vector3.new(160,1,156),true)
 for _,spec in ipairs({{-80,12,10,1,28,156},{80,12,10,1,28,156},{0,12,-68,160,28,1},{0,12,88,160,28,1}})do
  part(folder,"ManorBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 -- 확장 저택 구조 충돌은 시각 GLB 병합과 분리한다. 정적 메시 이름이 합쳐져도 보행/벽 충돌은 유지된다.
 for _,spec in ipairs({
  {-75,11,-31,1.2,22,64},{75,11,-31,1.2,22,64},
  {-58,11,-63,35,22,1.2},{58,11,-63,35,22,1.2},
  {0,13,-65,110,26,1.5},
  {-43,13,-2,34,26,2},{43,13,-2,34,26,2},
  {-54,13,-61.5,1.5,26,7},{54,13,-61.5,1.5,26,7},
  {-54,13,-43.5,1.5,26,13},{54,13,-43.5,1.5,26,13},
  {-54,13,-22.5,1.5,26,13},{54,13,-22.5,1.5,26,13},
  {-54,13,-.5,1.5,26,15},{54,13,-.5,1.5,26,15},
 })do
  part(folder,"ManorStructureBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 -- 좌우 날개 각 방의 벽 충돌도 중앙 8stud 출입구를 비운다.
 for _,x in ipairs({-58,58})do
  for _,z in ipairs({-54,-33,-12})do
   part(folder,"WingRoomBoundary",origin+Vector3.new(x-10.5,7,z),Vector3.new(13,14,1),false)
   part(folder,"WingRoomBoundary",origin+Vector3.new(x+10.5,7,z),Vector3.new(13,14,1),false)
  end
 end
 -- 2층 객실은 잠긴 문이므로 실제 충돌을 유지한다.
 for _,x in ipairs({-36,-22,-8,8,22,36})do
  part(folder,"LockedGuestBoundary",origin+Vector3.new(x,15,-63.7),Vector3.new(5.3,8.6,.7),false)
 end
 -- 1층 위치가 실제 화면에서 확정될 때까지 로비의 상층 투명 충돌은 만들지 않는다.
 -- 캐릭터는 PersonalGround만 밟으며, 계단/2층은 시각 레이어로만 남긴다.

 -- 현관 포치의 시각 계단과 보행면을 정확히 맞춘다.
 for step=0,4 do
  local width=22-step*1.4
  part(folder,"PorchStepGround",origin+Vector3.new(0,.16+step*.28,8.8-step*.95),Vector3.new(width,.30,2.0),true)
 end
 part(folder,"PorchPlinthGround",origin+Vector3.new(0,.72,4.9),Vector3.new(20.5,1.0,9.8),true)
 -- 포치→현관문→그랜드홀 사이를 한 장의 연속 보행면으로 보강한다.
 -- 시각 문턱/지붕/벽 메시와 무관하게 캐릭터가 걸어서 반드시 진입할 수 있어야 한다.
 part(folder,"EntranceWalkwayGround",origin+Vector3.new(0,.18,-5.0),Vector3.new(18,.34,28),true)
 for _,x in ipairs({-8.6,-7.6,7.6,8.6})do
  local z=math.abs(x)>8 and 8.2 or 3.2
  part(folder,"PorchColumnBoundary",origin+Vector3.new(x,6.7,z),Vector3.new(1.25,11.4,1.25),false)
 end
 -- 장의사 적재 베이는 문틀/플랫폼만 단순 충돌체로 잡아 장식 바퀴나 레일에 끼이지 않게 한다.
 part(folder,"MortuaryLoadingPlatformGround",origin+Vector3.new(67.2,.65,-43),Vector3.new(12.8,1.1,15.2),true)
 for _,z in ipairs({-48.7,-37.3})do
  part(folder,"MortuaryPortalBoundary",origin+Vector3.new(72.9,6.0,z),Vector3.new(2.0,12.0,1.5),false)
 end
 -- 마당 주요 소품은 단순 안정 충돌체를 사용해 복잡한 장식 메시 끼임을 막는다.
 for _,spec in ipairs({
  {0,2.5,39,15,5,15},{46,2.6,47,10,5,7},
  {-31,2.0,35,7,4,5},{31,2.0,35,7,4,5},{45,2.0,54,7,4,5},
  {-57,2.0,10,2,4,7},{57,2.0,10,2,4,7},
  {-57,4.4,69.1,13.1,8.8,2.0},
  {-62.2,2.1,66.0,1.2,4.2,8.6},{-51.8,2.1,66.0,1.2,4.2,8.6},
 })do
  part(folder,"GardenBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 -- 폐쇄 온실은 네 벽만 단순 충돌체로 막고 내부 장식 메시에는 복잡 충돌을 주지 않는다.
 for _,spec in ipairs({
  {44.3,5.6,69,1,9.2,17.5},{69.7,5.6,69,1,9.2,17.5},
  {57,5.6,60.25,25.5,9.2,1},{57,5.6,77.75,25.5,9.2,1},
 })do
  part(folder,"GreenhouseBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 -- Version 82 안정 경로: 개인 저택은 실제 SpawnLocation을 소유하고 플레이어 RespawnLocation에 직접 결박한다.
 local spawn=Instance.new("SpawnLocation");spawn.Name="PersonalSpawn";spawn.Position=origin+Vector3.new(0,.55,60)
 spawn.Size=Vector3.new(14,.2,12);spawn.Anchored=true;spawn.Transparency=1;spawn.CanCollide=false;spawn.CanTouch=false;spawn.CanQuery=false
 spawn.Neutral=true;spawn.Duration=0;spawn.Enabled=true;spawn.Parent=folder
 local room={folder=folder,scene=scene,origin=origin,spawn=spawn,index=index,busy=false,gag=0,lastPrompt=0,connections={},lastGhostCompleted=tonumber(p:GetAttribute("GhostCompleted"))or 0,lastRoundState=tostring(p:GetAttribute("RoundState")or"")}
 self.rooms[p]=room
 p:SetAttribute("ManorOriginX",origin.X);p:SetAttribute("ManorOriginZ",origin.Z)
 if p:GetAttribute("ManorVisibility")==nil then p:SetAttribute("ManorVisibility","PRIVATE")end
 if p:GetAttribute("VisitedManorOwnerUserId")==nil then p:SetAttribute("VisitedManorOwnerUserId",0)end
 if p:GetAttribute("VisitedManorOwnerName")==nil then p:SetAttribute("VisitedManorOwnerName","")end
 p:SetAttribute("ManorVisitorCount",0)
 p.RespawnLocation=spawn
 room.ownerPlaque,room.refreshOwnerPlaque=manorPlaque(folder,p,origin)
 local function prompt(name,pos,caption,menu)
  local anchor=part(folder,name,origin+pos,Vector3.new(1,1,1),false);anchor.CanCollide=false
  local pr=Instance.new("ProximityPrompt");pr.ObjectText=caption;pr.ActionText=type(menu)=="number"and"건드려 보기"or"이야기하기";pr.MaxActivationDistance=8;pr.RequiresLineOfSight=false;pr.HoldDuration=.15;pr.Parent=anchor
  pr.Triggered:Connect(function(visitor)
   if visitor~=p or not p.Parent or p:GetAttribute("RoundState")=="RUNNING"then return end
   local rr=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
   if not rr or(rr.Position-anchor.Position).Magnitude>14 or os.clock()-room.lastPrompt<.5 then return end
   room.lastPrompt=os.clock()
   if type(menu)=="number"then task.spawn(function()self:Gag(p,menu)end);return end
   self.remote:FireClient(p,"MANOR_MENU",menu)
   if name=="ButlerPrompt"then
    stamp(p,"집사 모티머",p:GetAttribute("MonsterPreference")=="MONSTER"and"오늘은 사냥하러 나가시는군요. 현관 매트에는 발톱을 닦아주십시오."or"무사히 돌아오십시오. 관은 아직 주문하지 않았습니다.")
   elseif name=="ArchivistPrompt"then stamp(p,"기록관 에드윈","목격담은 세 번 확인합니다. 제 머리 위치만 빼고요.")
   elseif name=="MerchantPrompt"then stamp(p,"장의사","옷은 오래 입으셔도 됩니다. 이 집의 장례복은 특히 오래 갑니다.")end
  end)
 end
 prompt("ButlerPrompt",Vector3.new(5,4,-9),"집사 모티머 · 출정","PLAY")
 prompt("ArchivistPrompt",Vector3.new(-18,4,-27),"목 없는 기록관 · 도감","BOOK")
 prompt("ArchiveCabinetPrompt",Vector3.new(-44,4.5,-57),"괴담 유물 진열장","BOOK")
 prompt("MerchantPrompt",Vector3.new(20,4,-22),"장의사 · 의상실","DRESS")
 prompt("InvitationPrompt",Vector3.new(-12,4,-18),"막내 유령 · 가족 초대장","EVENT")
 prompt("ArmorPrompt",Vector3.new(-16,4,-11),"졸고 있는 갑옷",2)
 prompt("CoffinPrompt",Vector3.new(17,3,-14),"누군가의 낮잠",3)
 prompt("TeaPrompt",Vector3.new(-15,4,-18),"막내가 훔친 찻잔",4)

 -- 희귀 괴담 케이스의 황동 명패. 기존 카탈로그 이름만 읽는 표시 전용 SurfaceGui다.
 local rareCaseZ={KRASUE=-58.8,WHITE_LADY=-55.1,PONTIANAK=-51.4,BLACK_SHUCK=-47.7}
 for _,ghost in ipairs(C.GhostCatalog or{})do
  local z=rareCaseZ[ghost.Id]
  if z then
   local plaque=part(folder,"RareCaseLabel_"..ghost.Id,origin+Vector3.new(-72.82,1.56,z),Vector3.new(.08,.50,2.05),false)
   plaque.CanCollide=false;plaque.CanTouch=false;plaque.CanQuery=false
   local surface=Instance.new("SurfaceGui");surface.Name="RareCaseLabelGui";surface.Adornee=plaque;surface.Face=Enum.NormalId.Right
   surface.CanvasSize=Vector2.new(410,100);surface.AlwaysOnTop=false;surface.LightInfluence=.2;surface.Parent=plaque
   local text=Instance.new("TextLabel");text.Size=UDim2.fromScale(1,1);text.BackgroundTransparency=1
   text.Text="희귀 기록 · "..ghost.Name;text.TextColor3=Color3.fromRGB(47,27,24);text.TextStrokeTransparency=.9
   text.Font=Enum.Font.Antique;text.TextScaled=true;text.Parent=surface
  end
 end

 -- 벽지도는 실제 공간에서 선택하지만 최종 승인은 Game.server의 selectLobbyMap 한 곳이 담당한다.
 for _,map in ipairs(C.Maps or{})do
  local z=map.Id=="SCHOOL"and-39 or map.Id=="HOSPITAL"and-31 or-23
  local anchor=part(folder,"MapPrompt_"..map.Id,origin+Vector3.new(-68,5.5,z),Vector3.new(1.2,1.2,1.2),false)
  anchor.CanCollide=false;anchor.CanTouch=false
  local pr=Instance.new("ProximityPrompt");pr.Name="WallMapPrompt";pr.ObjectText=map.Name
  pr.ActionText="출정지 선택";pr.MaxActivationDistance=9;pr.RequiresLineOfSight=false;pr.HoldDuration=.12;pr.Parent=anchor
  pr.Triggered:Connect(function(visitor)
   if visitor~=p or p:GetAttribute("RoomServer")==true or p:GetAttribute("RoundState")=="RUNNING"then return end
   local selected=self.selectMap and self.selectMap(p,map.Id)
   if selected then
    stamp(p,"집사 모티머",selected.Name.."으로 예약서를 준비하겠습니다.")
    self.remote:FireClient(p,"MANOR_MENU","PLAY")
   end
  end)
 end
 -- 홀/기능실 조명. 방별 색온도를 아주 약하게 달리해 재질과 역할이 읽히되 전투/입력에는 영향이 없다.
 for _,spec in ipairs({
  {Vector3.new(0,16,-24),2.1,38,true,Color3.fromRGB(255,217,167)},
  {Vector3.new(-21,7,15),1.4,25,false,Color3.fromRGB(255,216,174)},{Vector3.new(23,7,19),1.4,25,false,Color3.fromRGB(255,213,168)},
  {Vector3.new(-19,9,-22),1.7,23,false,Color3.fromRGB(255,215,171)},{Vector3.new(20,9,-14),1.7,23,false,Color3.fromRGB(255,209,160)},
  {Vector3.new(0,3,-60),1.8,22,true,Color3.fromRGB(255,205,145)},
  {Vector3.new(5,9,-3),1.65,23,false,Color3.fromRGB(255,219,180)},{Vector3.new(0,9,9),1.35,26,false,Color3.fromRGB(255,216,174)},
  {Vector3.new(-58,8,-54),.72,16,false,Color3.fromRGB(244,203,154)},
  {Vector3.new(-58,8,-33),.68,16,false,Color3.fromRGB(223,214,165)},
  {Vector3.new(-58,8,-12),.66,16,false,Color3.fromRGB(246,195,166)},
  {Vector3.new(58,8,-54),.70,16,false,Color3.fromRGB(226,190,156)},
  {Vector3.new(58,8,-33),.72,16,false,Color3.fromRGB(248,188,165)},
  {Vector3.new(58,8,-12),.66,16,false,Color3.fromRGB(221,211,184)},
  {Vector3.new(-70.0,5.0,-56.8),.55,12,false,Color3.fromRGB(244,205,158)},
  {Vector3.new(-70.0,5.0,-49.2),.55,12,false,Color3.fromRGB(244,205,158)}
 })do
  local anchor=part(folder,"WarmLight",origin+spec[1],Vector3.one,false);anchor.CanCollide=false;anchor.CanQuery=false
  local light=Instance.new("PointLight");light.Color=spec[5];light.Brightness=spec[2];light.Range=spec[3];light.Shadows=spec[4];light.Parent=anchor
 end
 -- 외부 하우징 조명: 따뜻한 생활광 + 차가운 달빛 윤곽만 사용하고 그림자는 끈다.
 for _,spec in ipairs({
  {Vector3.new(-5.6,7.8,9.8),1.15,18,Color3.fromRGB(255,205,143)},
  {Vector3.new(5.6,7.8,9.8),1.15,18,Color3.fromRGB(255,205,143)},
  {Vector3.new(-58.3,37,-47),1.00,17,Color3.fromRGB(224,190,132)},
  {Vector3.new(70.5,8.5,-43),.92,16,Color3.fromRGB(221,164,121)},
  {Vector3.new(-57,4.3,65),.78,14,Color3.fromRGB(214,170,104)},
  {Vector3.new(57,7.0,61.5),.55,13,Color3.fromRGB(180,202,192)},
  {Vector3.new(0,34,-5),.42,24,Color3.fromRGB(169,187,217)},
  {Vector3.new(-72,18,-31),.36,20,Color3.fromRGB(156,177,211)},
  {Vector3.new(72,18,-31),.36,20,Color3.fromRGB(156,177,211)},
  {Vector3.new(0,7,52),.30,22,Color3.fromRGB(172,193,218)}
 })do
  local exterior=part(folder,"ExteriorHouseLight",origin+spec[1],Vector3.one,false);exterior.CanCollide=false;exterior.CanQuery=false
  local light=Instance.new("PointLight");light.Color=spec[4];light.Brightness=spec[2];light.Range=spec[3];light.Shadows=false;light.Parent=exterior
 end
 -- 움직이는 장식은 비충돌, 가구의 몸체만 기존 바닥 위에서 이동을 막는다.
 for _,spec in ipairs({
  {-33.5,2,-59.5,18,4,3},{33.5,2,-59.5,18,4,3},
  {24,4,-31,5,8,3},
  {0,3,-61.2,17,7,4}
 })do
  part(folder,"FurnitureBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 -- 좌우 기능실의 큰 가구만 외벽 쪽 단순 충돌로 잡는다. 중앙 통로/8stud 출입구는 침범하지 않는다.
 for _,spec in ipairs({
  {-69,4,-58.8,4.5,8,3.8},
  {-69,3.8,-38.2,4.2,7.5,3.5},{-69,3.8,-28.2,4.2,7.5,3.5},
  {-67,2.1,-12,5.5,4.2,7.2},
  {66.5,2.0,-54,4.8,3.8,7.4},
  {69,4.2,-37.8,4.5,8.5,3.8},{69,4.2,-28.2,4.5,8.5,3.8},
  {67,2.1,-13.5,5.5,4.2,7.2},
 })do
  part(folder,"WingFurnitureBoundary",origin+Vector3.new(spec[1],spec[2],spec[3]),Vector3.new(spec[4],spec[5],spec[6]),false)
 end
 for _,mesh in ipairs(scene:GetDescendants())do
  if mesh:IsA("BasePart")then
   -- 시각 메시 충돌/쿼리를 다시 켜지 않는다. CrookedRoof/BackWall 같은 큰 MeshPart의
   -- convex collision hull이 현관·2층 동선을 덮는 문제를 원천 차단한다.
   mesh.CanCollide=false;mesh.CanTouch=false;mesh.CanQuery=false
   if mesh.Name:match("^HearthFlame")or mesh.Name:match("^ChandelierFlame")then
    mesh.Material=Enum.Material.Neon;mesh.Color=Color3.fromRGB(255,185,99)
   end
  end
 end
 -- 양쪽 경첩을 중심으로 열리는 현관문. 문짝은 사람을 밀거나 가두지 않는다.
 room.doors={};room.doorOpen=nil
 for _,side in ipairs({-1,1})do
  local node=scene:FindFirstChild("EntryDoor"..side,true)
  if node then
   local doorMeshes={}
   if node:IsA("BasePart")then table.insert(doorMeshes,node)end
   for _,mesh in ipairs(node:GetDescendants())do if mesh:IsA("BasePart")then table.insert(doorMeshes,mesh)end end
   for _,mesh in ipairs(doorMeshes)do
    mesh.CanCollide=false;mesh.CanTouch=false;mesh.CanQuery=true
    table.insert(room.doors,{mesh=mesh,home=mesh.CFrame,pivot=origin+Vector3.new(side*7.2,.5,-2),side=side})
   end
  end
 end
 -- 개인 저택 진행도: 초상화, 실물 장부 책, 맵 추억 유물, 2층 봉인을 기존 저장 속성으로만 갱신한다.
 local function ghostStages()
  local stages={}
  for id,n in string.gmatch(tostring(p:GetAttribute("GhostProgress")or""),"([^:,]+):(%d+)")do stages[id]=tonumber(n)or 0 end
  return stages
 end
 local function refreshDisplays()
  local seen=math.clamp(tonumber(p:GetAttribute("GhostSeenCount"))or 0,0,12)
  local completed=math.clamp(tonumber(p:GetAttribute("GhostCompleted"))or 0,0,12)
  local selected=tostring(p:GetAttribute("SelectedLobbyMap")or"SCHOOL")
  local stages=ghostStages()

  for i=1,12 do
   for _,mesh in ipairs(namedParts(scene,"PortraitCanvas"..i))do
    if mesh.Name=="PortraitCanvas"..i then mesh.Color=i<=seen and Color3.fromRGB(255,239,206)or Color3.fromRGB(130,122,119)end
   end
  end

  -- 현관 가문 문장은 괴담 2개 완성마다 한 조각씩 채워진다. 새 저장값 없이 GhostCompleted만 시각화한다.
  for i=1,6 do
   local reached=completed>=i*2
   for _,mesh in ipairs(namedParts(scene,"ManorCrestSegment"..i))do
    mesh.Transparency=reached and 0 or .78
    mesh.Reflectance=reached and .12 or 0
    mesh.CanCollide=false;mesh.CanTouch=false;mesh.CanQuery=false
   end
  end

  -- 괴담별 대표 유물은 각 기록의 실제 단계만 따른다. 희귀 케이스도 같은 GhostProgress만 사용한다.
  local featureId=nil
  local featureStage=-1
  for _,ghost in ipairs(C.GhostCatalog or{})do
   local stage=math.clamp(tonumber(stages[ghost.Id])or 0,0,3)
   if stage>featureStage then featureStage=stage;featureId=ghost.Id end
   for _,mesh in ipairs(namedParts(scene,"GhostRelic_"..ghost.Id))do
    mesh.Transparency=stage==0 and .92 or stage==1 and .56 or stage==2 and .24 or 0
    mesh.Reflectance=stage==3 and .08 or 0
    mesh.CanQuery=false;mesh.CanTouch=false;mesh.CanCollide=false
   end
   -- 기존 등장 가중치가 낮은 괴담만 전용 유리 케이스를 사용한다. 게임 확률 자체는 전혀 바꾸지 않는다.
   if (tonumber(ghost.Weight)or math.huge)<=58 then
    for _,mesh in ipairs(namedParts(scene,"RareRelic_"..ghost.Id))do
     mesh.Transparency=stage==0 and .94 or stage==1 and .64 or stage==2 and .30 or 0
     mesh.Reflectance=stage==3 and .12 or 0
     mesh.CanQuery=false;mesh.CanTouch=false;mesh.CanCollide=false
    end
   end
  end

  local allComplete=(tonumber(p:GetAttribute("GhostCompleted"))or 0)>=#(C.GhostCatalog or{})
  -- 벽난로 대표 슬롯은 가장 진척된 기존 괴담 하나만 보여주며 전체 완성 기념물이 나타나면 비운다.
  for _,ghost in ipairs(C.GhostCatalog or{})do
   local show=not allComplete and featureStage>0 and ghost.Id==featureId
   for _,mesh in ipairs(namedParts(scene,"FireplaceFeature_"..ghost.Id))do
    mesh.Transparency=show and 0 or .96
    mesh.Reflectance=show and featureStage==3 and .10 or 0
    mesh.CanQuery=false;mesh.CanTouch=false;mesh.CanCollide=false
   end
  end
  for _,mesh in ipairs(namedParts(scene,"MasterCollectionRelic"))do
   mesh.Transparency=allComplete and 0 or .92
   mesh.Reflectance=allComplete and .10 or 0
   mesh.CanCollide=false;mesh.CanTouch=false;mesh.CanQuery=false
  end

  for _,map in ipairs(C.Maps or{})do
   local chosen=map.Id==selected
   for _,mesh in ipairs(namedParts(scene,"MapPin_"..map.Id))do mesh.Transparency=chosen and 0 or .78 end

   local discovered=false;local full=true;local count=0
   for _,ghost in ipairs(C.GhostCatalog or{})do
    if ghost.Map==map.Id then
     count+=1
     local stage=stages[ghost.Id]or 0
     if stage>0 then discovered=true end
     if stage<3 then full=false end
    end
   end
   if count==0 then full=false end
   for _,mesh in ipairs(namedParts(scene,"MemoryRelic_"..map.Id))do
    mesh.Transparency=discovered and 0 or .82
    mesh.Reflectance=full and .10 or 0
    mesh.CanCollide=false;mesh.CanTouch=false;mesh.CanQuery=false
   end
   -- 지역 100% 대형 전시와 2층 완성 세트는 같은 기존 GhostProgress의 full 판정만 시각화한다.
   for _,prefix in ipairs({"MapMasterpiece_","GallerySet_"})do
    for _,mesh in ipairs(namedParts(scene,prefix..map.Id))do
     mesh.Transparency=full and 0 or .94
     mesh.Reflectance=full and .12 or 0
     mesh.CanCollide=false;mesh.CanTouch=false;mesh.CanQuery=false
    end
   end
  end

 end
 local function connect(signal,fn)local connection=signal:Connect(fn);table.insert(room.connections,connection);return connection end
 connect(p:GetAttributeChangedSignal("GhostSeenCount"),refreshDisplays)
 connect(p:GetAttributeChangedSignal("GhostProgress"),refreshDisplays)
 connect(p:GetAttributeChangedSignal("SelectedLobbyMap"),refreshDisplays)
 connect(p:GetAttributeChangedSignal("GhostCompleted"),function()
  local value=tonumber(p:GetAttribute("GhostCompleted"))or 0
  if value>room.lastGhostCompleted then stamp(p,"기록관 에드윈","새 괴담 기록을 저택 장부에 정리했습니다.")end
  room.lastGhostCompleted=value;refreshDisplays()
 end)
 connect(p:GetAttributeChangedSignal("RoundState"),function()
  local newState=tostring(p:GetAttribute("RoundState")or"")
  local oldState=room.lastRoundState
  room.lastRoundState=newState
  if newState=="ROOM_BROWSER"and(oldState=="RUNNING"or oldState=="SPECTATING"or string.match(oldState,"^RESULT_"))then
   stamp(p,"집사 모티머","돌아오셨군요. 오늘 밤의 흔적은 그대로 보관해두었습니다.")
  end
 end)
 refreshDisplays()
 folder.Parent=self.root
 p:SetAttribute("PersonalLobbyOwner",p.UserId)
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
 -- 현관 앞 마당 고정 스폰. 카메라는 현관문/저택 중앙을 바라본다.
 return room.origin+Vector3.new(0,3,60),room.origin+Vector3.new(0,5,-2),room.spawn
end

function Manor:RefreshVisitorCounts()
 for owner in pairs(self.rooms)do
  if owner.Parent==Players then
   local count=0
   for _,visitor in ipairs(Players:GetPlayers())do
    if visitor~=owner and tonumber(visitor:GetAttribute("VisitedManorOwnerUserId"))==owner.UserId then count+=1 end
   end
   owner:SetAttribute("ManorVisitorCount",count)
   local room=self.rooms[owner]
   if room and room.refreshOwnerPlaque then room.refreshOwnerPlaque()end
  end
 end
end

function Manor:SetVisibility(owner,value)
 self:Get(owner)
 local visibility=string.upper(tostring(value or"PRIVATE"))=="PUBLIC"and"PUBLIC"or"PRIVATE"
 owner:SetAttribute("ManorVisibility",visibility)
 local ownerRoom=self.rooms[owner]
 if ownerRoom and ownerRoom.refreshOwnerPlaque then ownerRoom.refreshOwnerPlaque()end
 local ejected={}
 if visibility=="PRIVATE"then
  for _,visitor in ipairs(Players:GetPlayers())do
   if visitor~=owner and tonumber(visitor:GetAttribute("VisitedManorOwnerUserId"))==owner.UserId then
    visitor:SetAttribute("VisitedManorOwnerUserId",0)
    visitor:SetAttribute("VisitedManorOwnerName","")
    table.insert(ejected,visitor)
   end
  end
 end
 self:RefreshVisitorCounts()
 return ejected
end

function Manor:Visit(visitor,ownerUserId)
 if not visitor or not visitor.Parent then return nil,nil,"방문자 확인 실패"end
 if visitor:GetAttribute("RoomServer")==true or visitor:GetAttribute("RoundState")=="RUNNING"then return nil,nil,"경기 중에는 저택을 방문할 수 없음"end
 local id=math.floor(tonumber(ownerUserId)or 0)
 local owner=id>0 and Players:GetPlayerByUserId(id)or nil
 if not owner or owner==visitor then return nil,nil,"방문할 저택을 찾을 수 없음"end
 if owner:GetAttribute("ManorVisibility")~="PUBLIC"then return nil,nil,"비공개 저택"end
 if owner:GetAttribute("RoomServer")==true or owner:GetAttribute("RoundState")=="RUNNING"then return nil,nil,"저택 주인이 출정 중"end
 local room=self.rooms[owner]or self:Get(owner)
 visitor:SetAttribute("VisitedManorOwnerUserId",owner.UserId)
 visitor:SetAttribute("VisitedManorOwnerName",owner.DisplayName)
 self:RefreshVisitorCounts()
 return room.origin+Vector3.new(0,3,60),room.origin+Vector3.new(0,5,-2),nil
end

function Manor:ReturnHome(visitor)
 visitor:SetAttribute("VisitedManorOwnerUserId",0)
 visitor:SetAttribute("VisitedManorOwnerName","")
 self:RefreshVisitorCounts()
 return self:GetSpawn(visitor)
end

function Manor:CloseVisitors(owner)
 return self:SetVisibility(owner,"PRIVATE")
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
function Manor:Gag(p,requested)
 local room=self.rooms[p];if not room or room.busy then return end
 local rr=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
 if not rr or(rr.Position-room.origin).Magnitude>90 then return end
 if os.clock()-(room.lastGag or -20)<5 then return end
 room.lastGag=os.clock();room.busy=true;room.gag=requested or(room.gag%4+1)
 local prefix=room.gag==1 and"ButlerHead"or room.gag==2 and"ArmorHelmet"or room.gag==3 and"CoffinLid"or"Tea"
 local pieces=namedParts(room.scene,prefix)
 -- The head's face meshes travel together; an invisible assembly root is unnecessary.
 if room.gag==1 then
  pieces={}
  for _,name in ipairs({"ButlerHead","Butler_Nose","Butler_Sclera","Butler_Iris","Butler_Pupil","Butler_UpperLid","Butler_LowerLid","Butler_Brow","Butler_UpperLip","Butler_LowerLip","Butler_Ear","Butler_Moustache","Butler_Hair"})do
   for _,part0 in ipairs(namedParts(room.scene,name))do table.insert(pieces,part0)end
  end
 end
 local saved={};local rootPart=pieces[1]
 for _,mesh in ipairs(pieces)do if not rootPart or mesh.Size.Magnitude>rootPart.Size.Magnitude then rootPart=mesh end end
 if rootPart then
  for _,mesh in ipairs(pieces)do
   saved[mesh]=mesh.CFrame;mesh.CollisionGroup="ManorGag";mesh.Anchored=false;mesh.CanCollide=mesh==rootPart;mesh.CanQuery=false
   mesh.CustomPhysicalProperties=PhysicalProperties.new(.5,.65,.18,1,1)
   if mesh~=rootPart then local weld=Instance.new("WeldConstraint");weld.Name="ManorGagWeld";weld.Part0=rootPart;weld.Part1=mesh;weld.Parent=rootPart end
  end
  rootPart:SetNetworkOwner(nil)
  rootPart:ApplyImpulse((room.gag==3 and Vector3.new(0,12,2)or Vector3.new(-2,2,3))*rootPart.AssemblyMass)
  rootPart.AssemblyAngularVelocity=Vector3.new(.6,0,room.gag==3 and 1 or 3)
  stamp(p,room.gag==1 and"집사 모티머"or room.gag==2 and"갑옷 경비"or room.gag==3 and"장의사"or"막내 유령",
   room.gag==1 and"고개를 너무 깊이 숙였군요. 잠시만 실례하겠습니다."or room.gag==2 and"위협적인 자세는 관절 보증에 포함되지 않습니다."or room.gag==3 and"아직 영업시간입니다. 안에서 기다리세요."or"찻잔이 먼저 도망갔어. 내가 쏟은 거 아니야!")
  task.wait(2.2)
  for mesh in pairs(saved)do if mesh.Parent then mesh.Anchored=true;mesh.CanCollide=false;mesh.AssemblyLinearVelocity=Vector3.zero;mesh.AssemblyAngularVelocity=Vector3.zero end end
  if rootPart.Parent then for _,w in ipairs(rootPart:GetChildren())do if w.Name=="ManorGagWeld"then w:Destroy()end end end
  for mesh,cf in pairs(saved)do if mesh.Parent then TweenService:Create(mesh,TweenInfo.new(.7,Enum.EasingStyle.Back),{CFrame=cf}):Play()end end
  task.wait(.8)
 end
 room.busy=false
end
function Manor:Recover(p)
 local ownRoom=self:Get(p);local room=ownRoom
 local visitingId=math.floor(tonumber(p:GetAttribute("VisitedManorOwnerUserId"))or 0)
 if visitingId>0 then
  local owner=Players:GetPlayerByUserId(visitingId)
  local target=owner and self.rooms[owner]or nil
  if owner and target and owner:GetAttribute("ManorVisibility")=="PUBLIC"and owner:GetAttribute("RoomServer")~=true and owner:GetAttribute("RoundState")~="RUNNING"then
   room=target
  else
   return self:ReturnHome(p)
  end
 end
 local r=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
 if not r then return nil end
 local localPos=r.Position-room.origin
 local nearDoor=math.abs(localPos.X)<18 and localPos.Z> -24 and localPos.Z<24
 if room.doorOpen~=nearDoor then
  room.doorOpen=nearDoor
  for _,door in ipairs(room.doors)do
   if door.mesh.Parent then
    local target=nearDoor and(CFrame.new(door.pivot)*CFrame.Angles(0,door.side*math.rad(88),0)*CFrame.new(-door.pivot)*door.home)or door.home
    TweenService:Create(door.mesh,TweenInfo.new(1.15,Enum.EasingStyle.Sine,Enum.EasingDirection.InOut),{CFrame=target}):Play()
   end
  end
 end
 if localPos.Y< -3 or localPos.Y>30 or math.abs(localPos.X)>78 or localPos.Z< -67 or localPos.Z>86 then
  if room~=ownRoom then return room.origin+Vector3.new(0,3,60),room.origin+Vector3.new(0,5,-2),room.spawn end
  return self:GetSpawn(p)
 end
 return nil
end
function Manor:Remove(p)
 local r=self.rooms[p];if not r then return end
 p:SetAttribute("VisitedManorOwnerUserId",0);p:SetAttribute("VisitedManorOwnerName","")
 for _,connection in ipairs(r.connections or{})do connection:Disconnect()end
 self.slots[r.index]=nil;self.rooms[p]=nil;self.rankingRequests[p]=nil;r.folder:Destroy()
 self:RefreshVisitorCounts()
end
return Manor
