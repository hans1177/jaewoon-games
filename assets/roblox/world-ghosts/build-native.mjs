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
 const profiles=ids.map(id=>'Profiles["'+id+'"]=(function()'+read('motions/'+id+'/init.luau')+'\nend)()').join('\n');
 const harness=`
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
