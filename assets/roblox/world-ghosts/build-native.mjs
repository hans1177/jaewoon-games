import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'native');
const priorEvidencePath=path.join(output,'build-evidence.json');
const priorEvidence=fs.existsSync(priorEvidencePath)?JSON.parse(fs.readFileSync(priorEvidencePath,'utf8')):{};
const rojo=process.env.VIBE2_ROJO_BINARY||'rojo';
const compiler=process.env.VIBE2_LUAU_COMPILER;
if(!compiler)throw Error('VIBE2_LUAU_COMPILER must name the official Luau compiler');
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const sourceNames=[...fs.readdirSync(root).filter(name=>/\.luau$|\.project\.json$/.test(name)),...fs.readdirSync(path.join(root,'motions'),{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>'motions/'+entry.name+'/init.luau')].sort();
for(const name of sourceNames.filter(name=>name.endsWith('.luau'))){
 const result=spawnSync(compiler,[path.join(root,name)],{stdio:['ignore','ignore','pipe'],encoding:'utf8'});
 if(result.status!==0)throw Error(result.stderr||String(result.error));
}
fs.mkdirSync(output,{recursive:true});
const artifacts=[];
for(const [project,file]of [['default.project.json','world-ghosts-gallery.rbxlx'],['model.project.json','world-ghost-skins.rbxmx']]){
 const target=path.join(output,file);
 const result=spawnSync(rojo,['build',path.join(root,project),'-o',target],{encoding:'utf8'});
 if(result.status!==0)throw Error(result.stderr||String(result.error));
 artifacts.push({file,sha256:digest(fs.readFileSync(target)),bytes:fs.statSync(target).size});
}
const sources=sourceNames.map(file=>({file,sha256:digest(fs.readFileSync(path.join(root,file)))}));
const report={schemaVersion:1,kind:'ROBLOX_ASSET_PACKAGE_BUILD',sourceFingerprint:digest(JSON.stringify(sources)),sources,artifacts,skinCount:100,bodyFormCount:27,motionStates:6,officialLuauCompiled:true,nativeStudioVerified:false,artVerified:false,gameplayVerified:false};
// Keep authored audit history separate from the reproducible compiler/package result.
if(priorEvidence.sourceAudit){
 const auditedSourceFingerprint=priorEvidence.sourceAuditBinding?.auditedSourceFingerprint||priorEvidence.sourceFingerprint||null;
 report.sourceAudit=priorEvidence.sourceAudit;
 report.sourceAuditBinding={auditedSourceFingerprint,currentSourceFingerprint:report.sourceFingerprint,
  currentSourceVerified:Boolean(auditedSourceFingerprint)&&auditedSourceFingerprint===report.sourceFingerprint,
  status:auditedSourceFingerprint===report.sourceFingerprint?'SAME_SOURCE_AUDIT':'HISTORICAL_AUDIT_REVIEW_REQUIRED',
  claim:'PRESERVED_INTERNAL_AUDIT_NOT_CURRENT_MOTION_QUALITY_OR_RUNTIME_PASS'};
}
if(priorEvidence.qualityImprovementPlan)report.qualityImprovementPlan=priorEvidence.qualityImprovementPlan;
fs.writeFileSync(path.join(output,'build-evidence.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({kind:report.kind,artifacts,sourceFingerprint:report.sourceFingerprint,nativeStudioVerified:false}));

 // Execute the authored Luau itself; the browser never reimplements motion curves.
 const interpreter=process.env.VIBE2_LUAU_BINARY;
 if(!interpreter)throw Error('VIBE2_LUAU_BINARY must name the official Luau interpreter');
 const ids=['ghoul','banshee','dullahan','kelpie','leshy','boitata','ifrit','redcap','mare','poltergeist'];
 const read=name=>fs.readFileSync(path.join(root,name),'utf8');
 const allIds=sourceNames.filter(name=>name.startsWith('motions/')).map(name=>name.split('/')[1]);
 const profiles=allIds.map(id=>'Profiles["'+id+'"]=(function()'+read('motions/'+id+'/init.luau')+'\nend)()').join('\n');
 const prelude=`
local Catalog=(function()${read('GhostSkinCatalog.luau')}\nend)()
local script={Parent={WaitForChild=function()return 'catalog'end}}
local require=function()return Catalog end
local Factory=(function()${read('GhostSkinFactory.luau')}\nend)()
local Motion=(function()${read('GhostSkinMotion.luau')}\nend)()
local Profiles={}
${profiles}
local function json(value)
 local kind=type(value)
 if kind=="string"then return string.format("%q",value)end
 if kind=="number"then assert(value==value and math.abs(value)<1e12);return string.format("%.6f",value)end
 if kind=="boolean"then return tostring(value)end
 assert(kind=="table")
 local out={}
 if #value>0 then for _,item in ipairs(value)do table.insert(out,json(item))end;return "["..table.concat(out,",").."]"end
 local keys={};for key in pairs(value)do table.insert(keys,key)end;table.sort(keys)
 for _,key in ipairs(keys)do table.insert(out,json(key)..":"..json(value[key]))end
 return "{"..table.concat(out,",").."}"
end
`;
 const harness=prelude+`
for _,id in ipairs(${JSON.stringify(ids).replace('[','{').replace(']','}')})do
 local profile=Profiles[id]
 local model=Factory.Describe(id,'mid')
 local names={};for name in pairs(model.bones)do table.insert(names,name)end;table.sort(names)
 local frames={};local before={}
 for frame=0,120 do
  local t=profile.Duration*frame/120
  local pose=profile[profile.AuthoredClip](model.form,model.bones,t)
  local original=Motion.Sample(model.form,model.bones,t,profile.AuthoredClip)
  local values={};local old={}
  for _,name in ipairs(names)do
   local p=pose[name];local o=original[name]
   table.insert(values,{p.x,p.y,p.z,p.rx,p.ry,p.rz})
   table.insert(old,{o.x,o.y,o.z,o.rx,o.ry,o.rz})
  end
  table.insert(frames,values);table.insert(before,old)
 end
 print(json({id=id,title=profile.Intent,clip=profile.AuthoredClip,duration=profile.Duration,
  model=model,boneNames=names,frames=frames,before=before}))
end
`;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ghost-motion-preview-'));
 let experiments;
 try{
  const file=path.join(temp,'sample.luau');fs.writeFileSync(file,harness);
  const result=spawnSync(interpreter,[file],{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
  if(result.status!==0)throw Error(result.stderr||String(result.error));
  experiments=result.stdout.trim().split('\n').map(line=>JSON.parse(line));
  if(experiments.length!==10)throw Error('Expected ten authored motion experiments');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 const preview={schemaVersion:1,sourceFingerprint:report.sourceFingerprint,
  sampledBy:'OFFICIAL_LUAU',nativeStudioVerified:false,productionVerified:false,experiments};
 fs.writeFileSync(path.join(output,'motion-experiments.json'),JSON.stringify(preview)+'\n');
 console.log(JSON.stringify({kind:'AUTHORED_MOTION_SAMPLES',count:experiments.length,sourceFingerprint:report.sourceFingerprint}));

// Publish the same canonical source build as a lazy-loaded browser gallery.
// Geometry and poses come from official Luau; this is not a Studio/runtime pass.
const environmentPath=path.join(root,'../common-environment-v1/RobloxCommonEnvironment.luau');
const environmentCatalog=JSON.parse(fs.readFileSync(path.join(root,'../common-environment-v1/catalog.json'),'utf8'));
const environmentSource=fs.readFileSync(environmentPath,'utf8');
const gallerySources=[{file:'assets/roblox/world-ghosts/build-native.mjs',sha256:digest(fs.readFileSync(fileURLToPath(import.meta.url)))},...sources.map(row=>({file:'assets/roblox/world-ghosts/'+row.file,sha256:row.sha256})),
 {file:'assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau',sha256:digest(environmentSource)},
 {file:'assets/roblox/common-environment-v1/catalog.json',sha256:digest(fs.readFileSync(path.join(root,'../common-environment-v1/catalog.json')))}];
const galleryFingerprint=digest(JSON.stringify(gallerySources));
function executeSamples(source){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'asset-gallery-'));
 try{
  const file=path.join(dir,'sample.luau');fs.writeFileSync(file,source);
  const result=spawnSync(interpreter,[file],{encoding:'utf8',timeout:60000,maxBuffer:128*1024*1024});
  if(result.status!==0)throw Error(result.stderr||String(result.error));
  return result.stdout.trim().split('\n').map(line=>JSON.parse(line));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const monsters=executeSamples(prelude+`
for _,skin in ipairs(Catalog)do
 local model=Factory.Describe(skin.id,'mid')
 local profile=Profiles[skin.id]
 local names={};for name in pairs(model.bones)do table.insert(names,name)end;table.sort(names)
 local clips={}
 for _,state in ipairs(Motion.States)do
  local authored=profile and (state=="walk" or state=="attack") and profile[state]
  local duration=(authored and profile.AuthoredClip==state and profile.Duration) or
   (state=="walk" and math.pi or state=="chase" and math.pi*.8 or 3.2)
  local frames={}
  for frame=0,120 do
   local t=duration*frame/120
   local pose=authored and authored(model.form,model.bones,t) or Motion.Sample(model.form,model.bones,t,state)
   local values={}
   for _,name in ipairs(names)do
    local p=pose[name];table.insert(values,{p.x,p.y,p.z,p.rx,p.ry,p.rz})
   end
   table.insert(frames,values)
  end
  table.insert(clips,{id=state,duration=duration,loop=state=="idle" or state=="walk" or state=="chase",frames=frames})
 end
 print(json({id=skin.id,title=skin.name,form=skin.form,region=skin.region,role=skin.role,
  model=model,boneNames=names,clips=clips}))
end
`);
// Capture visual primitive properties from the actual environment factory.
const environments=executeSamples(prelude+`
local Vector3={};local vec={}
function Vector3.new(x,y,z)return setmetatable({X=x or 0,Y=y or 0,Z=z or 0},vec)end
vec.__add=function(a,b)return Vector3.new(a.X+b.X,a.Y+b.Y,a.Z+b.Z)end
vec.__mul=function(a,b)return Vector3.new(a.X*b,a.Y*b,a.Z*b)end
local Color3={fromRGB=function(r,g,b)return {r,g,b}end}
local enum=setmetatable({},{__index=function(_,key)return key end})
local Enum={Material=enum,SurfaceType=enum,PartType=enum}
local parts={}
local Instance={new=function(kind)
 local part={kind=kind,SetAttribute=function()end,Orientation=Vector3.new(),Shape="Block",Transparency=0}
 if kind=="Part" then table.insert(parts,part)end
 return part
end}
local Environment=(function()${environmentSource}\nend)()
local function xyz(v)return {v.X,v.Y,v.Z}end
for _,id in ipairs(${JSON.stringify(environmentCatalog.biomes).replace('[','{').replace(']','}')})do
 parts={};Environment.CreateBiomeKit(id,{})
 local model={parts={}}
 for _,p in ipairs(parts)do table.insert(model.parts,{name=p.Name,shape=p.Shape,size=xyz(p.Size),
  position=xyz(p.Position),rotation=xyz(p.Orientation),color=p.Color,transparency=p.Transparency})end
 print(json({id=string.lower(id),title=id,model=model}))
end
`);
const galleryDir=path.join(output,'gallery');fs.mkdirSync(galleryDir,{recursive:true});
const metadata={schemaVersion:1,sampledBy:'OFFICIAL_LUAU',sourceFingerprint:galleryFingerprint,
 nativeStudioVerified:false,productionVerified:false};
const keep=new Set();
function publishRow(row,kind){
 if(!/^[a-z0-9-]+$/.test(row.id))throw Error('Invalid gallery asset ID');
 const file=kind+'-'+row.id+'.json';keep.add(file);
 const bytes=JSON.stringify({...metadata,...row})+'\n';fs.writeFileSync(path.join(galleryDir,file),bytes);
 return {id:row.id,title:row.title,...(kind==='monster'?{form:row.form,region:row.region,role:row.role,clips:row.clips.map(clip=>clip.id)}:{}),
  path:'/assets/roblox/world-ghosts/native/gallery/'+file,sha256:digest(bytes),bytes:Buffer.byteLength(bytes)};
}
const gallery={...metadata,sources:gallerySources,monsters:monsters.map(row=>publishRow(row,'monster')),
 environments:environments.map(row=>publishRow(row,'environment'))};
// Remove only obsolete generated shards owned by this build.
for(const file of fs.readdirSync(galleryDir))if(/^(monster|environment)-[a-z0-9-]+\.json$/.test(file)&&!keep.has(file))fs.unlinkSync(path.join(galleryDir,file));
fs.writeFileSync(path.join(output,'asset-gallery.json'),JSON.stringify(gallery)+'\n');
console.log(JSON.stringify({kind:'ASSET_GALLERY_SAMPLES',monsters:monsters.length,environments:environments.length,sourceFingerprint:galleryFingerprint}));
