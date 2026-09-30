-- Pure, server-owned state. Client supplies intent, never authoritative transforms/costs.
local Catalog=require(script.Parent:WaitForChild("HousingCatalog"))
local G=require(script.Parent:WaitForChild("HousingGeometry"))
local Core={};Core.__index=Core
local materials={wood=true,stone=true,metal=true,fiber=true}
local function finite(v)return type(v)=="number" and v==v and math.abs(v)<1e16 end
local function integer(v,min,max)return finite(v) and v%1==0 and v>=min and v<=max end
local function copy(value)
 if type(value)~="table"then return value end
 local out={};for k,v in pairs(value)do out[k]=copy(v)end;return out
end
local function fail(reason)return nil,reason end
local function cost(def,style)
 local out={};for key,value in pairs(def.cost)do out[key]=value*Catalog.Styles[style].tier end;return out
end
function Core.new(options)
 options=options or {}
 assert(integer(options.ownerId,1,1e15),"OWNER_REQUIRED")
 local self=setmetatable({},Core)
 self.ownerId=options.ownerId;self.builders={};self.items={};self.buckets={};self.count=0;self.nextId=1;self.revision=0
 self.limit=options.limit or 2000;self.radius=options.radius or 256;self.maxHeight=options.maxHeight or 120
 self.stock=copy(options.stock or {wood=0,stone=0,metal=0,fiber=0});self.creative=options.creative==true
 for key,value in pairs(self.stock)do assert(materials[key] and integer(value,0,1e9),"INVALID_STOCK")end
 return self
end
function Core:canEdit(actor)return actor==self.ownerId or self.builders[tostring(actor)]==true end
function Core:guard(actor,revision)
 if not self:canEdit(actor)then return false,"NO_PERMISSION"end
 if revision~=self.revision then return false,"STALE_REVISION"end
 return true
end
function Core:cells(volumes)
 local b=G.bounds(volumes);local out={}
 for x=math.floor(b.minX/8),math.floor(b.maxX/8)do for z=math.floor(b.minZ/8),math.floor(b.maxZ/8)do table.insert(out,x..":"..z)end end
 return out
end
function Core:index(item,remove)
 for _,cell in ipairs(self:cells(item.volumes))do
  if remove then
   local bucket=self.buckets[cell];if bucket then bucket[item.id]=nil;if next(bucket)==nil then self.buckets[cell]=nil end end
  else self.buckets[cell]=self.buckets[cell] or {};self.buckets[cell][item.id]=true end
 end
end
function Core:affordable(required)
 if self.creative then return true end
 for key,value in pairs(required)do if (self.stock[key]or 0)<value then return false end end;return true
end
function Core:pay(required,direction)
 if self.creative then return end
 for key,value in pairs(required)do self.stock[key]=(self.stock[key]or 0)+direction*value end
end
function Core:resolve(request)
 if type(request)~="table"then return fail("INVALID_REQUEST")end
 local def=Catalog.Pieces[request.piece];if not def or not Catalog.Styles[request.style]then return fail("UNKNOWN_PIECE_OR_STYLE")end
 local yaw=request.rotation or 0
 if not integer(yaw,0,345)or yaw%15~=0 then return fail("INVALID_ROTATION")end
 local p={x=0,y=0,z=0,yaw=yaw};local parent=nil;local score=100
 local normalized={piece=request.piece,style=request.style,rotation=yaw}
 if request.targetId then
  if type(request.targetId)~="string" or #request.targetId>24 then return fail("INVALID_TARGET")end
  parent=self.items[request.targetId];if not parent then return fail("TARGET_MISSING")end
  local target=Catalog.Pieces[parent.piece];local socket=request.socket
  if type(socket)~="string"then return fail("SOCKET_REQUIRED")end
  normalized.targetId=parent.id;normalized.socket=socket
  p={x=parent.x,y=parent.y+target.h,z=parent.z,yaw=parent.yaw+yaw}
  local edgeIndex=tonumber(string.match(socket,"^edge:(%d+)$"))
  if edgeIndex and target.tile then
   local edge=G.edge(target,edgeIndex);if not edge then return fail("INVALID_SOCKET")end
   local x,z=G.rotate(edge.x,edge.z,parent.yaw);p.x+=x;p.z+=z;p.yaw=parent.yaw+edge.yaw
   if def.tile then
    local childEdge=G.edge(def,1)
    if math.abs(childEdge.length-edge.length)>.05 then return fail("EDGE_LENGTH_MISMATCH")end
    p.yaw=p.yaw+180-childEdge.yaw
    local cx,cz=G.rotate(childEdge.x,childEdge.z,p.yaw);p.x-=cx;p.z-=cz
    p.y=parent.y+target.h-def.h
   elseif def.placement~="edge" then return fail("INCOMPATIBLE_SOCKET")end
  elseif socket=="door" then
   if def.placement~="door" or not target.doorSocket or (def.gate==true)~=(target.gate==true)then return fail("INCOMPATIBLE_SOCKET")end
   p.y=parent.y;p.yaw=parent.yaw
  elseif socket=="top" then
   if not(target.top or target.tile) or not(def.tile or def.placement=="walltop" or def.vertical or def.placement=="edge")then return fail("INCOMPATIBLE_SOCKET")end
   if def.tile and target.wall then local x,z=G.rotate(0,def.triangle and def.d/3 or def.d/2,parent.yaw);p.x+=x;p.z+=z end
  elseif socket=="center" then
   if not target.tile or def.placement~="center" then return fail("INCOMPATIBLE_SOCKET")end
  elseif socket=="surface" then
   if not target.tile or def.placement~="surface"then return fail("INCOMPATIBLE_SOCKET")end
   local x,z=request.offsetX or 0,request.offsetZ or 0
   if not finite(x)or not finite(z)or math.abs(x)>8 or math.abs(z)>8 then return fail("INVALID_OFFSET")end
   x=math.round(x*4)/4;z=math.round(z*4)/4;normalized.offsetX=x;normalized.offsetZ=z
   local dx,dz=G.rotate(x,z,parent.yaw);p.x+=dx;p.z+=dz
   local surface=G.world(G.polygon(target),parent)
   for _,vertex in ipairs(G.world(G.polygon(def),p))do if not G.inside(vertex,surface)then return fail("OUTSIDE_SUPPORT")end end
  else return fail("INCOMPATIBLE_SOCKET")end
  score=parent.stability-(def.loss or 0)
 else
  if not def.ground then return fail("FOUNDATION_REQUIRED")end
  if not finite(request.x)or not finite(request.z)then return fail("INVALID_POSITION")end
  p.x=math.round(request.x/8)*8;p.z=math.round(request.z/8)*8
  normalized.x=p.x;normalized.z=p.z
 end
 p.yaw=p.yaw%360
 return {piece=def.id,style=request.style,x=p.x,y=p.y,z=p.z,yaw=p.yaw,parentId=parent and parent.id or nil,stability=score,request=normalized}
end
function Core:preview(actor,request,context)
 if not self:canEdit(actor)then return fail("NO_PERMISSION")end
 if self.count>=self.limit then return fail("PIECE_LIMIT")end
 local item,reason=self:resolve(request);if not item then return fail(reason)end
 local def=Catalog.Pieces[item.piece];context=context or {}
 if def.ground then
  if type(context.groundHeight)~="function"then return fail("GROUND_CHECK_REQUIRED")end
  local expected=nil
  local probes=G.world(G.polygon(def),item);table.insert(probes,{item.x,item.z})
  for _,p in ipairs(probes)do
   local height=context.groundHeight(p[1],p[2])
   if not finite(height)then return fail("NO_GROUND")end
   expected=expected or height
   if math.abs(height-expected)>.6 then return fail("UNEVEN_GROUND")end
  end
  if item.parentId and math.abs(item.y-expected)>.6 then return fail("NO_GROUND")end
  item.y=expected
 end
 if item.stability<=0 then return fail("NO_STABILITY")end
 if item.y< -1 or item.y+def.h>self.maxHeight then return fail("HEIGHT_LIMIT")end
 item.volumes=G.volumes(def,item);local bounds=G.bounds(item.volumes)
 if bounds.minX< -self.radius or bounds.maxX>self.radius or bounds.minZ< -self.radius or bounds.maxZ>self.radius then return fail("OUTSIDE_PLOT")end
 if context.position then
  local pos=context.position
  if not(finite(pos.x)and finite(pos.y)and finite(pos.z))then return fail("INVALID_ACTOR_POSITION")end
  if (item.x-pos.x)^2+(item.y-pos.y)^2+(item.z-pos.z)^2>(context.reach or 40)^2 then return fail("OUT_OF_REACH")end
 elseif not context.restoring then return fail("ACTOR_POSITION_REQUIRED")end
 local seen={}
 for _,cell in ipairs(self:cells(item.volumes))do
  for id in pairs(self.buckets[cell]or {})do if not seen[id]then
   seen[id]=true
   local other=self.items[id]
   if item.piece==other.piece and math.abs(item.x-other.x)<.01 and math.abs(item.y-other.y)<.01 and math.abs(item.z-other.z)<.01 and item.yaw==other.yaw then return fail("DUPLICATE_PLACEMENT")end
   local overlay=def.overlay or Catalog.Pieces[other.piece].overlay
   if not overlay and G.collides(item.volumes,other.volumes)then return fail("OVERLAP")end
  end end
 end
 if context.blocked and context.blocked(item,def)then return fail("WORLD_OBSTRUCTION")end
 item.cost=cost(def,item.style)
 if not self:affordable(item.cost)then return fail("NOT_ENOUGH_MATERIALS")end
 return item
end
function Core:place(actor,request,revision,context)
 local allowed,reason=self:guard(actor,revision);if not allowed then return fail(reason)end
 local item;item,reason=self:preview(actor,request,context);if not item then return fail(reason)end
 item.id=tostring(self.nextId);self.nextId+=1;item.children={};item.storage={};item.open=false
 self:pay(item.cost,-1);self.items[item.id]=item;self.count+=1;self.revision+=1
 if item.parentId then self.items[item.parentId].children[item.id]=true end
 self:index(item,false)
 return copy(item)
end
function Core:remove(actor,id,revision)
 local allowed,reason=self:guard(actor,revision);if not allowed then return fail(reason)end
 local item=self.items[id];if not item then return fail("TARGET_MISSING")end
 if next(item.children)then return fail("HAS_DEPENDENTS")end
 if next(item.storage)then return fail("STORAGE_NOT_EMPTY")end
 self:index(item,true);self.items[id]=nil;self.count-=1;self.revision+=1
 if item.parentId then self.items[item.parentId].children[id]=nil end
 local refund={};for key,value in pairs(item.cost)do refund[key]=math.floor(value*.5)end;self:pay(refund,1)
 return {id=id,refund=refund}
end
function Core:upgrade(actor,id,style,revision)
 local allowed,reason=self:guard(actor,revision);if not allowed then return fail(reason)end
 local item=self.items[id];if not item then return fail("TARGET_MISSING")end
 if not Catalog.Styles[style]then return fail("UNKNOWN_STYLE")end
 if style==item.style then return fail("ALREADY_THIS_STYLE")end
 if Catalog.Styles[style].tier<Catalog.Styles[item.style].tier then return fail("DOWNGRADE_NOT_ALLOWED")end
 local nextCost=cost(Catalog.Pieces[item.piece],style);local delta={}
 for key,value in pairs(nextCost)do delta[key]=math.max(0,value-(item.cost[key]or 0))end
 if not self:affordable(delta)then return fail("NOT_ENOUGH_MATERIALS")end
 self:pay(delta,-1);item.style=style;item.request.style=style;item.cost=nextCost;self.revision+=1
 return copy(item)
end
function Core:share(actor,userId,enabled,revision)
 if actor~=self.ownerId then return fail("OWNER_ONLY")end
 if revision~=self.revision then return fail("STALE_REVISION")end
 if not integer(userId,1,1e15)or type(enabled)~="boolean"then return fail("INVALID_MEMBER")end
 self.builders[tostring(userId)]=enabled or nil;self.revision+=1;return true
end
function Core:interact(actor,id,revision)
 local allowed,reason=self:guard(actor,revision);if not allowed then return fail(reason)end
 local item=self.items[id];if not item then return fail("TARGET_MISSING")end
 local def=Catalog.Pieces[item.piece]
 if not def.interaction then return fail("NO_INTERACTION")end
 if def.interaction=="door"then item.open=not item.open;self.revision+=1 end
 return {id=id,kind=def.interaction,open=item.open,station=def.station,storage=copy(item.storage),capacity=def.capacity}
end
function Core:transfer(actor,id,key,amount,revision)
 local allowed,reason=self:guard(actor,revision);if not allowed then return fail(reason)end
 local item=self.items[id];if not item then return fail("TARGET_MISSING")end
 local def=Catalog.Pieces[item.piece]
 if def.interaction~="storage"or not materials[key]or not integer(math.abs(type(amount)=="number"and amount or 0),1,1000)then return fail("INVALID_TRANSFER")end
 local total=0;for _,value in pairs(item.storage)do total+=value end
 if amount>0 and ((self.stock[key]or 0)<amount or total+amount>def.capacity)then return fail("STORAGE_OR_STOCK_LIMIT")end
 if amount<0 and (item.storage[key]or 0)<-amount then return fail("NOT_IN_STORAGE")end
 self.stock[key]=(self.stock[key]or 0)-amount;item.storage[key]=(item.storage[key]or 0)+amount
 if item.storage[key]==0 then item.storage[key]=nil end;self.revision+=1
 return copy(item.storage)
end
function Core:snapshot()
 local rows={}
 for _,item in pairs(self.items)do table.insert(rows,{id=item.id,request=copy(item.request),storage=copy(item.storage),open=item.open})end
 table.sort(rows,function(a,b)return tonumber(a.id)<tonumber(b.id)end)
 return {schemaVersion=Catalog.SchemaVersion,ownerId=self.ownerId,revision=self.revision,nextId=self.nextId,stock=copy(self.stock),builders=copy(self.builders),pieces=rows}
end
function Core.restore(data,options,context)
 if type(data)~="table"or data.schemaVersion~=Catalog.SchemaVersion then return fail("UNSUPPORTED_SNAPSHOT")end
 if data.ownerId~=options.ownerId or type(data.pieces)~="table"or #data.pieces>(options.limit or 2000)then return fail("INVALID_SNAPSHOT")end
 if not integer(data.revision,0,1e12)or not integer(data.nextId,1,1e12)or type(data.stock)~="table"or type(data.builders)~="table"then return fail("INVALID_SNAPSHOT")end
 for key,value in pairs(data.stock)do if not materials[key]or not integer(value,0,1e9)then return fail("INVALID_STOCK")end end
 for key,value in pairs(data.builders)do if not integer(tonumber(key),1,1e15)or value~=true then return fail("INVALID_MEMBER")end end
 local settings=copy(options);settings.creative=true;settings.stock=data.stock
 local state=Core.new(settings);local last=0;local ctx=table.clone(context or {});ctx.restoring=true;ctx.position=nil
 for _,saved in ipairs(data.pieces)do
  if type(saved)~="table"or type(saved.id)~="string"or not integer(tonumber(saved.id),last+1,data.nextId-1)or type(saved.storage)~="table"or type(saved.open)~="boolean"then return fail("INVALID_RECORD")end
  state.nextId=tonumber(saved.id)
  local item,reason=state:place(state.ownerId,saved.request,state.revision,ctx);if not item then return fail("INVALID_RECORD:"..reason)end
  local live=state.items[item.id];local capacity=Catalog.Pieces[live.piece].capacity or 0;local total=0
  for key,value in pairs(saved.storage)do if not materials[key]or not integer(value,1,1000)then return fail("INVALID_STORAGE")end;total+=value end
  if total>capacity then return fail("INVALID_STORAGE")end
  live.storage=copy(saved.storage);live.open=saved.open;last=tonumber(saved.id)
 end
 state.creative=options.creative==true;state.stock=copy(data.stock);state.revision=data.revision;state.nextId=data.nextId;state.builders=copy(data.builders)
 return state
end
Core.copy=copy
return Core
