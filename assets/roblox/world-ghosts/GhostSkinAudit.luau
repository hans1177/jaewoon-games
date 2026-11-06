-- Run inside an isolated Studio gallery. This is structural evidence, not an art/gameplay PASS.
local Factory=require(script.Parent:WaitForChild("GhostSkinFactory"))
local Motion=require(script.Parent:WaitForChild("GhostSkinMotion"))
local Audit={}
function Audit.Run(parent,onProgress,shouldCancel)
 local report={kind="WORLD_GHOST_NATIVE_STRUCTURE",schemaVersion=1,tested=0,failed=0,results={},productionVerified=false,artVerified=false,multiplayerVerified=false}
 local skins=Factory.List()
 for index,skin in ipairs(skins)do
  if shouldCancel and shouldCancel()then report.cancelled=true;break end
  local model=nil;local binding=nil
  local ok,message=pcall(function()
   model=Factory.Create(skin.id,{parent=parent,quality="near"})
   assert(model.PrimaryPart and model.PrimaryPart.Anchored,"ROOT_NOT_ANCHORED")
   local vertices=0;local joints=0;local welded={};local byPart={}
   for _,object in ipairs(model:GetDescendants())do
    if object:IsA("WeldConstraint")then
     assert(object.Part0 and object.Part1 and object.Part0:IsDescendantOf(model) and object.Part1:IsDescendantOf(model),"UNBOUND_WELD")
     welded[object.Part1]=true
    elseif object:IsA("Motor6D")then
     assert(object.Part0 and object.Part1 and object.Part0:IsDescendantOf(model) and object.Part1:IsDescendantOf(model),"UNBOUND_MOTOR")
     assert(not byPart[object.Part1],"DUPLICATE_MOTOR_CHILD");byPart[object.Part1]=object.Part0;joints+=1
    elseif object:IsA("BasePart")then
     assert(not object.CanCollide and not object.CanTouch and not object.CanQuery,"COSMETIC_COLLISION_ENABLED")
     assert(object.Size.X>0 and object.Size.Y>0 and object.Size.Z>0,"EMPTY_PART")
     if object.Transparency<1 then vertices+=1 end
    end
   end
   for _,object in ipairs(model:GetDescendants())do
    if object:IsA("BasePart")and object.Transparency<1 then assert(welded[object],"UNWELDED_VISIBLE_PART")end
    if object:IsA("BasePart")and object~=model.PrimaryPart and object.Transparency==1 then
     local part=object;local seen={}
     while part~=model.PrimaryPart do assert(not seen[part] and byPart[part],"DISCONNECTED_RIG");seen[part]=true;part=byPart[part]end
    end
   end
   binding=Motion.Bind(model)
   local rootBefore=model.PrimaryPart.CFrame
   for _,state in ipairs(Motion.States)do
    binding.step(.3,state)
    task.wait()
    assert((model.PrimaryPart.Position-rootBefore.Position).Magnitude<.001,"COSMETIC_ROOT_MOVED")
    for _,object in ipairs(model:GetDescendants())do if object:IsA("BasePart")then
     local p=object.Position
     assert(p.X==p.X and p.Y==p.Y and p.Z==p.Z and (p-model.PrimaryPart.Position).Magnitude<50,"INVALID_POSED_PART")
    end end
   end
   binding.destroy();binding=nil
   local _,size=model:GetBoundingBox()
   assert(size.X>0 and size.Y>0 and size.Z>0,"EMPTY_NATIVE_MODEL")
   table.insert(report.results,{id=skin.id,structurePassed=true,visibleParts=vertices,motorCount=joints,bounds={size.X,size.Y,size.Z}})
  end)
  if binding then binding.destroy()end
  if model then model:Destroy()end
  report.tested+=1
  if not ok then report.failed+=1;table.insert(report.results,{id=skin.id,structurePassed=false,error=tostring(message)})end
  if onProgress then onProgress(index,#skins,skin.id,ok)end
  task.wait() -- only one model exists at a time; no 100-model burst
 end
 report.structurePassed=report.tested==100 and report.failed==0
 return report
end
return Audit
