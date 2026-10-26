-- 파일명: MaterialPresentation.client.luau
-- 임포트: 기존 네이티브 재질 소유자를 사용한다. 물리·저장·게임 규칙은 변경하지 않는다.
local Shared=game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Materials=require(Shared:WaitForChild("RobloxCommonMaterials"))
-- 메인: 같은 오브젝트의 대기 작업을 합치고 처리한 참조는 즉시 해제한다.
local queue={}
local pending=setmetatable({},{__mode="k"})
local head,tail=1,0
local scheduled=false
local alive=true
local style="HORROR"
-- 표시: 승인된 기존 배경 이름과 실제 리그 몸체만 스타일을 구분한다.
local backgroundNames={VillageGround=true,ZoneGround=true,VillageCentralWalk=true,MainRoad=true,
 MultiverseTradeSquare=true,ZoneInnerRoad=true,VillagePlaza=true,VillageGreen=true,
 BarracksYard=true,Path=true,SchoolCourtyard=true}
local function flush()
 while alive and head<=tail do
  local started=os.clock()
  local processed=0
  repeat
   local part=queue[head]
   queue[head]=nil
   head+=1
   pending[part]=nil
   if part:IsDescendantOf(workspace)then
    if part.Transparency<1 then
     local background=backgroundNames[part.Name] or string.match(part.Name,"^RunPath%d+$")
       or string.match(part.Name,"^EmptyEstatePlot_%d+$")
     if background and part:IsA("Part")and part.Shape==Enum.PartType.Block and part.Anchored
       and part.CanCollide and part.CFrame.UpVector.Y>.95 and part.Size.Y<=math.min(part.Size.X,part.Size.Z)*.25 then
      part:SetAttribute("SurfaceRole","TOY_STUDDED")
      part:SetAttribute("RefreshToySurface",true)
      part:SetAttribute("SurfaceStudsEnabled",true)
      part:SetAttribute("PreserveAuthoredTint",true)
     elseif part.Name~="HumanoidRootPart"and part.Material~=Enum.Material.Neon
       and part.Material~=Enum.Material.ForceField then
      local owner=part.Parent
      while owner and owner~=workspace do
       if owner:IsA("Model")and(owner:FindFirstChildOfClass("Humanoid")or owner:FindFirstChildOfClass("AnimationController"))then
        part:SetAttribute("SurfaceRole","TOY_PLASTIC")
        part:SetAttribute("RefreshToySurface",true)
        part:SetAttribute("PreserveAuthoredTint",true)
        break
       end
       owner=owner.Parent
      end
     end
    end
    Materials.ApplyAuthoredSurface(part,style)
   end
   processed+=1
  until head>tail or processed>=64 or os.clock()-started>=0.003
  if alive and head<=tail then task.wait()end
 end
 queue={};head=1;tail=0;scheduled=false
end
local function enqueue(instance)
 if not alive then return end
 -- 리그 제어기가 늦게 붙어도 기존 몸체를 같은 제한된 처리 경로에 합친다.
 if instance:IsA("Humanoid")or instance:IsA("AnimationController")then
  local owner=instance.Parent
  if owner and owner:IsA("Model")then
   for _,part in ipairs(owner:GetDescendants())do
    if part:IsA("BasePart")then enqueue(part)end
   end
  end
  return
 end
 if not instance:IsA("BasePart")or pending[instance]then return end
 pending[instance]=true
 tail+=1;queue[tail]=instance
 if not scheduled then scheduled=true;task.defer(flush)end
end
local added=workspace.DescendantAdded:Connect(enqueue)
script.Destroying:Connect(function()
 alive=false;added:Disconnect()
 table.clear(queue);table.clear(pending)
end)
for _,part in ipairs(workspace:GetDescendants())do enqueue(part)end
