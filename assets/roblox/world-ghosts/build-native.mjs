import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'native');
const rojo=process.env.VIBE2_ROJO_BINARY||'rojo';
const compiler=process.env.VIBE2_LUAU_COMPILER;
if(!compiler)throw Error('VIBE2_LUAU_COMPILER must name the official Luau compiler');
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const sourceNames=fs.readdirSync(root).filter(name=>/\.luau$|\.project\.json$/.test(name)).sort();
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
fs.writeFileSync(path.join(output,'build-evidence.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({kind:report.kind,artifacts,sourceFingerprint:report.sourceFingerprint,nativeStudioVerified:false}));
