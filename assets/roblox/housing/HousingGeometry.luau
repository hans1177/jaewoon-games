local G={}
function G.rotate(x,z,degrees)
 local a=math.rad(degrees);return x*math.cos(a)-z*math.sin(a),x*math.sin(a)+z*math.cos(a)
end
function G.polygon(def)
 if def.triangle then return {{-def.w/2,-def.d/3},{def.w/2,-def.d/3},{0,def.d*2/3}}end
 return {{-def.w/2,-def.d/2},{def.w/2,-def.d/2},{def.w/2,def.d/2},{-def.w/2,def.d/2}}
end
function G.world(points,p)
 local out={}
 for _,v in ipairs(points)do local x,z=G.rotate(v[1],v[2],p.yaw);table.insert(out,{x+p.x,z+p.z})end
 return out
end
function G.inside(point,polygon)
 local sign=nil
 for i,a in ipairs(polygon)do local b=polygon[i%#polygon+1]
  local cross=(b[1]-a[1])*(point[2]-a[2])-(b[2]-a[2])*(point[1]-a[1])
  if math.abs(cross)>.001 then local current=cross>0;if sign~=nil and sign~=current then return false end;sign=current end
 end
 return true
end
function G.overlap(a,b)
 -- Strict SAT: shared faces/edges are permitted; actual interior overlap is rejected.
 for _,poly in ipairs({a,b})do
  for i,p in ipairs(poly)do
   local q=poly[i%#poly+1];local nx=-(q[2]-p[2]);local nz=q[1]-p[1]
   local length=math.sqrt(nx*nx+nz*nz);nx/=length;nz/=length
   local minA,maxA,minB,maxB=math.huge,-math.huge,math.huge,-math.huge
   for _,v in ipairs(a)do local d=v[1]*nx+v[2]*nz;minA=math.min(minA,d);maxA=math.max(maxA,d)end
   for _,v in ipairs(b)do local d=v[1]*nx+v[2]*nz;minB=math.min(minB,d);maxB=math.max(maxB,d)end
   if math.min(maxA,maxB)-math.max(minA,minB)<=.035 then return false end
  end
 end
 return true
end
function G.edge(def,index)
 local poly=G.polygon(def);local a=poly[index];if not a then return nil end
 local b=poly[index%#poly+1];local dx,dz=b[1]-a[1],b[2]-a[2]
 local length=math.sqrt(dx*dx+dz*dz)
 return {x=(a[1]+b[1])/2,z=(a[2]+b[2])/2,yaw=math.deg(math.atan2(-dx,dz))+90,length=length}
end
function G.volumes(def,p)
 local localBoxes={}
 local function box(x,y,z,w,h,d)table.insert(localBoxes,{x=x,y=y,z=z,w=w,h=h,d=d})end
 if def.shape=="doorframe" or def.shape=="gateframe" or def.shape=="arch" then
  local opening=def.gate and 5.8 or 3.2;local height=def.gate and 9.5 or 4.8
  local post=(def.w-opening)/2
  box(-(opening+post)/2+def.d/4,0,0,post-def.d/2,def.h,def.d);box((opening+post)/2-def.d/4,0,0,post-def.d/2,def.h,def.d)
  box(0,height,0,opening,def.h-height,def.d)
 elseif def.shape=="window" then
  box(-2.8,0,0,2.35,def.h,def.d);box(2.8,0,0,2.35,def.h,def.d)
  box(0,0,0,3.2,2,def.d);box(0,4.5,0,3.2,1.5,def.d)
 elseif def.triangle then
  return {{polygon=G.world(G.polygon(def),p),minY=p.y,maxY=p.y+def.h}}
 else box(0,0,0,def.wall and def.w-def.d or def.w,def.h,def.d)end
 local out={}
 for _,b in ipairs(localBoxes)do
  local dx,dz=G.rotate(b.x,b.z,p.yaw)
  table.insert(out,{polygon=G.world(G.polygon({w=b.w,d=b.d}),{x=p.x+dx,z=p.z+dz,yaw=p.yaw}),minY=p.y+b.y,maxY=p.y+b.y+b.h})
 end
 return out
end
function G.bounds(volumes)
 local b={minX=math.huge,maxX=-math.huge,minZ=math.huge,maxZ=-math.huge}
 for _,volume in ipairs(volumes)do for _,p in ipairs(volume.polygon)do
  b.minX=math.min(b.minX,p[1]);b.maxX=math.max(b.maxX,p[1]);b.minZ=math.min(b.minZ,p[2]);b.maxZ=math.max(b.maxZ,p[2])
 end end;return b
end
function G.collides(a,b)
 for _,va in ipairs(a)do for _,vb in ipairs(b)do
  if math.min(va.maxY,vb.maxY)-math.max(va.minY,vb.minY)>.035 and G.overlap(va.polygon,vb.polygon)then return true end
 end end;return false
end
return G
