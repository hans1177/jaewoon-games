-- 공용 재질을 실제 월드 오브젝트에 적용한다. 네이티브 PBR 없이는 통과로 기록하지 않는다.
local Shared=game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Materials=require(Shared:WaitForChild("RobloxCommonMaterials"))
local Style=require(Shared:WaitForChild("VisualStyle"))
local queue={}
local scheduled=false
local style=Style.MaterialStyle or "COZY"
local function flush()
 local head=1
 while head<=#queue do
  local stop=math.min(#queue,head+63)
  for i=head,stop do
   local part=queue[i]
   if part:IsDescendantOf(workspace)then Materials.ApplyAuthoredSurface(part,style)end
  end
  head=stop+1
  if head<=#queue then task.wait()end
 end
 queue={};scheduled=false
end
local function enqueue(instance)
 if not instance:IsA("BasePart")then return end
 table.insert(queue,instance)
 if not scheduled then scheduled=true;task.defer(flush)end
end
workspace.DescendantAdded:Connect(enqueue)
for _,part in ipairs(workspace:GetDescendants())do enqueue(part)end
