-- 백수대전쟁 V4: 실물 CC0 3D 모델, Terrain 바닥 밀착. Part 생성 0.
-- 각 메시의 Cloud Model 사용 권한은 owner workflow에서 이 Universe에 부여한다.
local AssetService=game:GetService("AssetService")
local Debris=game:GetService("Debris")
local IDs=require(script.Parent:WaitForChild("VisualAssetIds"))
local Kit={}
local templates={}
local expected={'sparrow','ant','beetle','wolf','turtle','slime','golem','dragon','home','gate','tree','rock'}
-- 수입 메시마다 기준점이 다르므로 지형과 실제 발끝 높이를 기준으로 배치한다.
local groundRay=RaycastParams.new()
groundRay.FilterType=Enum.RaycastFilterType.Include
groundRay.FilterDescendantsInstances={workspace.Terrain}
local function terrainHeight(x,z)
 local hit=workspace:Raycast(Vector3.new(x,96,z),Vector3.new(0,-160,0),groundRay)
 return hit and hit.Position.Y or .5
end
local function baseY(model)
 local bounds,extents=model:GetBoundingBox()
 return bounds.Position.Y-extents.Y*.5
end
local function seatOnGround(model,x,z)
 -- Pivot이 머리/중앙/발에 있어도 실제 메시 최하단을 지면과 맞춘다.
 local shift=terrainHeight(x,z)+.04-baseY(model)
 model:PivotTo(model:GetPivot()+Vector3.new(0,shift,0))
end
function Kit.PoseCreature(actor,x,z,yaw)
 local offset=actor:GetAttribute("PivotAboveFeet")
 if type(offset)~="number" then
  offset=actor:GetPivot().Position.Y-baseY(actor)
  actor:SetAttribute("PivotAboveFeet",offset)
 end
 actor:PivotTo(CFrame.new(x,terrainHeight(x,z)+offset+.04,z)*CFrame.Angles(0,yaw or 0,0))
end
for _,key in ipairs(expected) do
 local id=IDs[key]
 assert(type(id)=="number" and id>0,"백수대전쟁 3D 모델 ID 누락: "..key)
end
-- 게임 시작 때 모델을 미리 적재. 전투 Heartbeat 중에는 네트워크를 호출하지 않는다.
function Kit.Preload()
 for _,key in ipairs(expected) do
  if not templates[key] then
   local ok,asset=pcall(function()return AssetService:LoadAssetAsync(IDs[key])end)
   if not ok or not asset then error("필수 3D 모델 적재 실패: "..key..": "..tostring(asset)) end
   -- 외부 에셋 스크립트는 절대 실행하지 않는다.
   for _,desc in ipairs(asset:GetDescendants()) do
    if desc:IsA("BaseScript") or desc:IsA("ModuleScript") then desc:Destroy() end
   end
   assert(asset:FindFirstChildWhichIsA("MeshPart",true)~=nil,
    "3D 메시 실물 누락: "..key)
   asset.Parent=nil
   templates[key]=asset
  end
 end
end
local function meshClone(key,parent,cf,size,team)
 local source=templates[key]
 if not source then return nil end
 local root=source:Clone()
 root.Name=key.."-native-mesh"
 root.Parent=parent
 -- 모델 로딩으로 받은 메시들의 물리는 서버 전투 계산과 분리한다.
 for _,inst in ipairs(root:GetDescendants()) do
  if inst:IsA("BasePart") then
   inst.Anchored=true;inst.CanCollide=false;inst.CanTouch=false
   inst.CastShadow=true
   if team=="ENEMY" then inst.Color=inst.Color:Lerp(Color3.fromRGB(198,95,92),.18) end
  end
 end
 -- 임포터에서 가져온 실물 메시의 Pivot을 보존하고 실제 크기만 조절한다.
 local largest=root:GetExtentsSize().Magnitude
 if largest>0 and size then
  local target=math.max(size.X,size.Y,size.Z)
  local factor=math.clamp(target/math.max(root:GetExtentsSize().X,root:GetExtentsSize().Y,root:GetExtentsSize().Z),.02,60)
  root:ScaleTo(factor)
 end
 root:PivotTo(cf)
 return root,root:FindFirstChildWhichIsA("BasePart",true)
end
function Kit.BuildCreature(folder,cf,unit,level,team)
 local actor,root=meshClone(unit.Id,folder,cf,Vector3.new(3.5,3.8,4),team)
 if not actor or not root then return nil end
 local scale=1+math.min(level-1,9)*.055
 actor:ScaleTo(actor:GetScale()*scale)
 Kit.PoseCreature(actor,cf.Position.X,cf.Position.Z,team=="ENEMY" and math.pi or 0)
 if level>=5 then
  local highlight=Instance.new("Highlight")
  highlight.Name="진화 효과";highlight.FillTransparency=.86
  highlight.OutlineTransparency=.23;highlight.OutlineColor=Color3.fromRGB(255,221,108)
  highlight.Adornee=actor;highlight.Parent=actor
 end
 if level>=10 then
  local highlight=actor:FindFirstChildOfClass("Highlight") or Instance.new("Highlight")
  highlight.FillTransparency=.76
  highlight.OutlineColor=Color3.fromRGB(255,176,38)
  highlight.Parent=actor
 end
 return root,actor
end
function Kit.BuildHome(folder,pos,unit,level)
 local home=meshClone("home",folder,CFrame.new(pos.X,.3,pos.Z),
  Vector3.new(9,10,9),nil)
 if not home then return end
 -- 건물 성장: 메시 모델 자체 확대, 레벨/유닛 색만 시각적으로 적응.
 local scale=1+math.min(level-1,9)*.035
 home:ScaleTo(home:GetScale()*scale)
 seatOnGround(home,pos.X,pos.Z)
 for _,inst in ipairs(home:GetDescendants()) do
  if inst:IsA("MeshPart") and inst.Name:lower():find("roof") then
   inst.Color=unit.Color:Lerp(inst.Color,.5)
  end
 end
 return home
end
function Kit.DecorateGate(folder,x,z,enemy)
 local model=meshClone("gate",folder,CFrame.new(x,0,z),Vector3.new(50,25,12),enemy and "ENEMY" or "ALLY")
 if model then seatOnGround(model,x,z) end
 return model
end
function Kit.BuildWorld(folder,x)
 for i=-5,5 do
  if math.abs(i)>1 then
   for _,side in ipairs({-1,1}) do
    local xx=x+side*29
    local z=i*9
    local tree=meshClone("tree",folder,CFrame.new(xx,.3,z),Vector3.new(9,14,9))
    if tree then seatOnGround(tree,xx,z) end
   end
  end
 end
 for _,side in ipairs({-1,1}) do
  for _,z in ipairs({-23,-6,13,30}) do
   local xx=x+side*23
   local rock=meshClone("rock",folder,CFrame.new(xx,.4,z),Vector3.new(5,4,5))
   if rock then seatOnGround(rock,xx,z) end
  end
 end
end
function Kit.HitSpark(folder,position,team)
 -- 2D/mesh-free VFX. Terrain Attachment는 별도 Part가 아니다.
 local attachment=Instance.new("Attachment")
 attachment.Name="타격 번쩍임"
 attachment.Parent=workspace.Terrain
 attachment.WorldPosition=Vector3.new(position.X,2.8,position.Z)
 local light=Instance.new("PointLight")
 light.Color=team=="ALLY" and Color3.fromRGB(255,211,102) or Color3.fromRGB(255,91,91)
 light.Brightness=1.5;light.Range=8;light.Parent=attachment
 Debris:AddItem(attachment,.16)
end
return Kit
