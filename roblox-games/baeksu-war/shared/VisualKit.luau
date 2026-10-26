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
-- 외부 3D Model 요청은 맵/Remote 초기화를 막지 않도록 별도 스레드에서 병렬 실행한다.
-- 실패한 모델은 검증되지 않은 파츠로 대체하지 않는다. 다음 재시도에서만 다시 요청한다.
function Kit.Ready()
 for _,key in ipairs(expected) do if not templates[key] then return false end end
 return true
end
function Kit.Preload()
 local remaining=0
 local failed={}
 for _,key in ipairs(expected) do
  if not templates[key] then
   remaining+=1
   task.spawn(function()
    local ok,asset=pcall(function()return AssetService:LoadAssetAsync(IDs[key])end)
    if ok and asset and asset:IsA("Model") and asset:FindFirstChildWhichIsA("MeshPart",true) then
     -- Roblox 외부 모델은 신뢰할 수 있는 메시로만 사용하고 모든 스크립트를 폐기한다.
     for _,desc in ipairs(asset:GetDescendants()) do
      if desc:IsA("BaseScript") or desc:IsA("ModuleScript") then desc:Destroy() end
     end
     asset.Parent=nil
     templates[key]=asset
    else
     table.insert(failed,key)
     warn("백수대전쟁 3D 원본 모델 로딩 실패: "..key.." / "..tostring(asset))
     if typeof(asset)=="Instance" then asset:Destroy() end
    end
    remaining-=1
   end)
  end
 end
 while remaining>0 do task.wait(.08) end
 if #failed>0 then warn("백수대전쟁 원본 모델 미적재: "..table.concat(failed,",")) end
 return Kit.Ready()
end
-- 검증된 CC0 메시의 재질을 Roblox에서 재구성한다.
-- 원본 메시를 바꾸지 않고 외형 톤만 보정한다. TextureID가 있는 경우 색 보정을 약하게 준다.
local function finishMeshMaterials(mesh,creatureColor,team)
 local shade=creatureColor
 local name=mesh.Name:lower()
 if name:find("eye") or name:find("pupil") then
  shade=Color3.fromRGB(26,35,43)
 elseif name:find("horn") or name:find("tooth") or name:find("teeth") or name:find("claw") then
  shade=Color3.fromRGB(226,218,195)
 elseif name:find("shell") or name:find("armor") then
  shade=creatureColor:Lerp(Color3.fromRGB(24,47,46),.32)
 elseif name:find("wing") or name:find("feather") or name:find("tail") then
  shade=creatureColor:Lerp(Color3.fromRGB(238,208,161),.2)
 end
 local textured=mesh:IsA("MeshPart") and mesh.TextureID~="" or mesh:FindFirstChildWhichIsA("SurfaceAppearance")~=nil
 mesh.Color=textured and mesh.Color:Lerp(shade,.3) or shade
 if not textured then mesh.Material=Enum.Material.SmoothPlastic end
 if team=="ENEMY" then mesh.Color=mesh.Color:Lerp(Color3.fromRGB(190,74,71),.14) end
end
local function meshClone(key,parent,cf,size,team,creatureColor)
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
   if creatureColor then finishMeshMaterials(inst,creatureColor,team)
   elseif team=="ENEMY" then inst.Color=inst.Color:Lerp(Color3.fromRGB(198,95,92),.18) end
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
 local actor,root=meshClone(unit.Id,folder,cf,Vector3.new(3.1,3.5,3.6),team,unit.Color)
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
 local model=meshClone("gate",folder,CFrame.new(x,0,z),Vector3.new(11,8,6),enemy and "ENEMY" or "ALLY")
 if model then seatOnGround(model,x,z) end
 return model
end
function Kit.BuildWorld(folder,x)
 -- 여러 섬 구역에 원본 CC0 나무/암석을 분산시킨다. 파츠 소품 추가 금지.
 -- 기지와 도로 시야를 열어 두고 바깥 숲·해안·언덕을 중심으로 장식한다.
 for i=0,9 do
  local z=-438+i*95
  if math.abs(z+174)>38 and math.abs(z-208)>38 then
   for _,side in ipairs({-1,1}) do
    for j=1,2 do
     local xx=x+side*(j==1 and (135+math.sin(i*2.7+side)*21) or (293+math.cos(i*1.91+side)*24))
     local zz=z+math.sin(i*3.1+j*2.2+side)*16
     local scale=j==1 and Vector3.new(8,11,8) or Vector3.new(10,14,10)
     local tree=meshClone("tree",folder,CFrame.new(xx,.3,zz),scale)
     if tree then seatOnGround(tree,xx,zz) end
    end
   end
  end
 end
 for i=0,11 do
  local z=-428+i*73
  if math.abs(z+174)>35 and math.abs(z-208)>35 then
   for _,side in ipairs({-1,1}) do
    local xx=x+side*(250+math.sin(i*2.4+side)*23)
    local zz=z+math.cos(i*1.7+side)*12
    local rock=meshClone("rock",folder,CFrame.new(xx,.4,zz),Vector3.new(7,6,7))
    if rock then seatOnGround(rock,xx,zz) end
   end
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
