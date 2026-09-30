// 파일명: assets/roblox/survival-wildlife/build-native.mjs
// 역할: Roblox 네이티브 rbxmx/rbxlx 패키지를 공식 Luau compiler + Rojo로 재생성한다.

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
for(const [project,file] of [
  ['model.project.json','survival-wildlife.rbxmx'],
  ['default.project.json','bear-animation-sample.rbxlx']
]){
  const target=path.join(output,file);
  const result=spawnSync(rojo,['build',path.join(root,project),'-o',target],{encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||String(result.error));
  artifacts.push({file,sha256:digest(fs.readFileSync(target)),bytes:fs.statSync(target).size});
}

const sources=sourceNames.map(file=>({file,sha256:digest(fs.readFileSync(path.join(root,file))) }));
const report={
  schemaVersion:1,
  kind:'ROBLOX_SURVIVAL_WILDLIFE_NATIVE_PACKAGE',
  sourceFingerprint:digest(JSON.stringify(sources)),
  sources,
  artifacts,
  speciesCount:17,
  sampleSpecies:'BEAR',
  sampleMotions:['WALK','RUN','ALERT','ATTACK'],
  animationRuntime:'ANIMATIONCONTROLLER_ANIMATOR_MOTOR6D_CLIENT',
  animationPrinciples:['KEY_POSE','ANTICIPATION','CONTACT','FOLLOW_THROUGH','SETTLE','SPRING_BLEND','FOOT_PLANT','SPINE_OVERLAP','HEAD_FOLLOW_THROUGH','SECONDARY_MOTION'],
  officialLuauCompiled:true,
  nativeStudioVerified:false,
  artVerified:false,
  gameplayVerified:false
};
fs.writeFileSync(path.join(output,'build-evidence.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
