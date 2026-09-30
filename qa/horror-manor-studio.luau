local RS=game:GetService("ReplicatedStorage")
local Assets=require(RS.Shared.ManorAssets)
assert(Assets.ModelId>0 and Assets.LobbyMusicId>0 and Assets.IconsId>0,"Published asset IDs required")
local Module=require(game.ServerScriptService.GameServer.ManorLobby)
local remote=Instance.new("RemoteEvent");remote.Name="ManorQARemote";remote.Parent=RS
local lobby=Module.new(remote)
local function mock(id)
 local signals={};local attrs={};local p={UserId=id,DisplayName="QA"..id,Parent=nil}
 function p:SetAttribute(k,v)attrs[k]=v;if signals[k]then signals[k]:Fire()end end
 function p:GetAttribute(k)return attrs[k]end
 function p:GetAttributeChangedSignal(k)
  if not signals[k]then signals[k]=Instance.new("BindableEvent")end
  return signals[k].Event
 end
 return p
end
local a,b=mock(70101),mock(70102)
local roomA,roomB=lobby:Get(a),lobby:Get(b)
assert((roomA.origin-roomB.origin).Magnitude>=256,"Personal spaces overlap")
assert(roomA.folder:GetAttribute("OwnerUserId")==a.UserId,"Wrong owner")
assert(roomB.folder:GetAttribute("OwnerUserId")==b.UserId,"Wrong owner")
local meshCount=0
for _,d in ipairs(roomA.scene:GetDescendants())do
 if d:IsA("MeshPart")then meshCount+=1;assert(d.Anchored and not d.CanCollide,"Unmanaged scene collision")end
 assert(not d:IsA("LuaSourceContainer"),"Unexpected imported script")
end
assert(meshCount>=200,"Native mesh import incomplete")
for _,owner in ipairs({a,b})do
 local pos,look,spawn=lobby:GetSpawn(owner)
 local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Include;params.FilterDescendantsInstances={lobby:Get(owner).folder.PersonalGround}
 local hit=workspace:Raycast(pos+Vector3.new(0,10,0),Vector3.new(0,-30,0),params)
 assert(hit and math.abs(hit.Position.Y-.35)<.03,"Spawn has no ground")
 assert(spawn and not spawn.CanCollide and spawn.Position.Z==lobby:Get(owner).origin.Z-9,"Unsafe spawn")
 assert(look.Z<pos.Z,"Spawn faces away from manor")
end
assert(roomA.folder:FindFirstChild("ButlerPrompt"),"Butler interaction missing")
assert(roomA.folder:FindFirstChild("ArchivistPrompt"),"Book interaction missing")
assert(roomA.folder:FindFirstChild("MerchantPrompt"),"Wardrobe interaction missing")
lobby:Remove(a);assert(not roomA.folder.Parent and roomB.folder.Parent,"Removing one owner affected another")
lobby:Remove(b)
print("MANOR_NATIVE_MESH_COUNT="..meshCount)
print("MANOR_NATIVE_QA=PASS")
