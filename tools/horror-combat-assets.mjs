// 파일명: tools/horror-combat-assets.mjs
// 저장소 원본 스킨드 GLB를 심야 대탈출 전용 Roblox Model 자산으로 등록한다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';
import {evaluateCrossPlatform3dMasterGlb} from './vibe2-asset-production-plan.mjs';

const source='assets/roblox/world-ghosts/native/mesh/bride.glb';
const evidencePath='assets/roblox/world-ghosts/native/combat-roblox-assets.json';
const output='roblox-games/horror-escape-room/shared/CombatAssets.luau';
const file=fs.readFileSync(source);
if(file.toString('utf8',0,4)!=='glTF'||file.readUInt32LE(4)!==2)throw Error('INVALID_COMBAT_GLB');
const hash=crypto.createHash('sha256').update(file).digest('hex');
const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
const rawCookie=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
if(!key)throw Error('ROBLOX_OPEN_CLOUD_API_KEY_MISSING');
const cookie=rawCookie.includes('.ROBLOSECURITY=')?rawCookie:(rawCookie?'.ROBLOSECURITY='+rawCookie+';':'');
const universeId='10767445796';
let csrf='';
async function request(url,options={}){
 const authenticated=!!cookie&&url.startsWith('https://apis.roblox.com/');
 if(authenticated&&url.startsWith('https://apis.roblox.com/assets/v1/'))url=url.replace('/assets/v1/','/assets/user-auth/v1/');
 const headers={...(options.headers||{})};
 if(authenticated){delete headers['x-api-key'];headers.cookie=cookie;if(csrf)headers['x-csrf-token']=csrf;}
 let r=await fetch(url,{...options,headers,signal:AbortSignal.timeout(60000)});
 if(authenticated&&r.status===403&&r.headers.get('x-csrf-token')){
  csrf=r.headers.get('x-csrf-token');
  r=await fetch(url,{...options,headers:{...headers,'x-csrf-token':csrf},signal:AbortSignal.timeout(60000)});
 }
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error('ROBLOX_HTTP_'+r.status+':'+new URL(url).pathname);
 return d;
}
let creator=null;
if(cookie){
 const r=await fetch('https://develop.roblox.com/v1/universes/'+universeId,{headers:{cookie},signal:AbortSignal.timeout(30000)});
 const d=await r.json().catch(()=>({}));
 if(r.ok&&String(d.id)===universeId&&Number(d.creatorTargetId)>0&&['User','Group'].includes(d.creatorType)){
  creator={[d.creatorType==='Group'?'groupId':'userId']:String(d.creatorTargetId)};
 }
 console.log('COMBAT_PRIVATE_OWNER_LOOKUP='+r.status+':'+(creator?'RESOLVED':'UNRESOLVED'));
}
if(!creator){
 const scope=await introspectRobloxApiKey({apiKey:key});
 const candidates=[];
 for(const row of scope.scopes){
  if(!/asset/i.test(row.name)||!(/write|create/i.test(row.name)||row.operations.some(x=>/write|create/i.test(x))))continue;
  for(const id of row.userIds)if(/^[1-9]\d*$/.test(id))candidates.push({userId:id});
  for(const id of row.groupIds)if(/^[1-9]\d*$/.test(id))candidates.push({groupId:id});
 }
 const unique=[...new Map(candidates.map(x=>[JSON.stringify(x),x])).values()];
 if(unique.length!==1)throw Error('COMBAT_ASSET_CREATOR_NOT_RESOLVED');
 creator=unique[0];
}
// 공용 원본도 이 기존 네이티브 등록 경로를 사용한다. 원본 파일은 수정하지 않는다.
const registryPath='company-asset-library.json';
const registry=process.argv.includes('--include-shared-models')?JSON.parse(fs.readFileSync(registryPath,'utf8')):null;
const candidates=process.argv.includes('--shared-ui-only')?[]:[{id:'midnight-combat-ghost',path:source,sha256:hash,combat:true}];
const failures=[];
for(const asset of registry?.assets||[]){
 if(asset.companyCommonBase!==true||!['CC0-1.0','project-original'].includes(asset.license))continue;
 const modelPath=String(asset.masterGlb||asset.path||'').replace(/^\//,'');
 const expected=String(asset.masterGlbHash||asset.sourceHash||'');
 if(!/^assets\/[a-zA-Z0-9_./-]+\.glb$/.test(modelPath)||modelPath.split('/').includes('..'))continue;
 try{
  // Missing registry metadata must not silently discard an existing good common master.
  // Inspect preserved bytes/rig/motion; an existing declared hash still has to match.
  const inspected=evaluateCrossPlatform3dMasterGlb({repoRoot:process.cwd(),source:{...asset,path:modelPath},family:asset.family||asset.category});
  if(inspected.pass!==true||!/^([a-f0-9]{64})$/.test(String(inspected.sourceHash||'')))throw Error('SHARED_MASTER_STATIC_QA_FAILED');
  if(expected&&expected!==inspected.sourceHash)throw Error('NATIVE_SOURCE_HASH_MISMATCH');
  candidates.push({id:asset.id,path:modelPath,sha256:inspected.sourceHash,asset});
 }catch(error){
  failures.push(asset.id);
  console.error('NATIVE_SOURCE_IMPORT_FAILED='+asset.id+':'+String(error.message));
 }
}
const importedByHash=new Map();
for(const candidate of candidates){
 try{
  const bytes=fs.readFileSync(candidate.path);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==candidate.sha256)throw Error('NATIVE_SOURCE_HASH_MISMATCH');
  if(bytes.length<20||bytes.toString('utf8',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('NATIVE_GLB_INVALID');
  const jsonBytes=bytes.readUInt32LE(12);
  if(bytes.readUInt32LE(16)!==0x4e4f534a||20+jsonBytes>bytes.length)throw Error('NATIVE_GLB_JSON_INVALID');
  const document=JSON.parse(bytes.toString('utf8',20,20+jsonBytes));
  const primitives=(document.meshes||[]).flatMap(mesh=>mesh.primitives||[]);
  if(!primitives.length||primitives.some(p=>p.attributes?.POSITION===undefined||p.attributes?.NORMAL===undefined))throw Error('NATIVE_MESH_GEOMETRY_REQUIRED');
  for(const primitive of primitives){
   const position=document.accessors?.[primitive.attributes.POSITION],normal=document.accessors?.[primitive.attributes.NORMAL];
   if(position?.type!=='VEC3'||normal?.type!=='VEC3'||position.count<3||position.count!==normal.count)throw Error('NATIVE_VERTEX_ACCESSOR_INVALID');
  }
  if((document.buffers||[]).some(buffer=>buffer.uri&&!String(buffer.uri).startsWith('data:')))throw Error('NATIVE_EXTERNAL_BUFFER_FORBIDDEN');
  let binding=candidate.combat?(fs.existsSync(evidencePath)?JSON.parse(fs.readFileSync(evidencePath,'utf8')):{}):candidate.asset.platformVariants?.ROBLOX||{};
  let assetId=candidate.combat?binding.humanoidModelId:binding.assetId;
  if(binding.sha256!==candidate.sha256||!(Number(assetId)>0)){
   assetId=importedByHash.get(candidate.sha256);
   if(!assetId){
    const form=new FormData();
    form.append('request',JSON.stringify({assetType:'Model',displayName:candidate.combat?'Midnight Authored Combat Ghost':String(candidate.id).slice(0,50),description:'Preserved repository source '+candidate.sha256,creationContext:{creator}}));
    form.append('fileContent',new Blob([bytes],{type:'model/gltf-binary'}),'source.glb');
    let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
    const opPath=op.path;
    if(!/^operations\/[a-zA-Z0-9-]+$/.test(opPath||''))throw Error('NATIVE_ASSET_OPERATION_INVALID');
    const deadline=Date.now()+240000;
    while(!op.done&&Date.now()<deadline){
     await new Promise(resolve=>setTimeout(resolve,4000));
     op=await request('https://apis.roblox.com/assets/v1/'+opPath,{headers:{'x-api-key':key}});
    }
    assetId=op.response?.assetId;
    if(!op.done||op.error||!(Number(assetId)>0))throw Error('NATIVE_ASSET_IMPORT_FAILED');
   }
   binding={assetId:String(assetId),sha256:candidate.sha256,creator,sourcePath:candidate.path,sourceRevision:process.env.GITHUB_SHA,importedAt:new Date().toISOString(),productionVerified:false,runtimeVerificationState:'NATIVE_IMPORT_PASS_RUNTIME_REVIEW_PENDING'};
  }
  importedByHash.set(candidate.sha256,String(assetId));
  if(candidate.combat){
   const grants=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},body:JSON.stringify({subjectType:'Universe',subjectId:universeId,action:'Use',requests:[{assetId:Number(assetId),grantToDependencies:true}]})});
   if(grants.errors?.length)throw Error('COMBAT_ASSET_PERMISSION_FAILED');
   fs.writeFileSync(evidencePath,JSON.stringify({...binding,version:1,humanoidModelId:String(assetId)},null,2)+'\n');
   fs.writeFileSync(output,`-- 파일명: shared/CombatAssets.luau\n-- 저장소 원본 스킨드 GLB ${hash}\nreturn {\n HumanoidModelId=${Number(assetId)},\n HumanoidSourceSha256=${JSON.stringify(hash)},\n AssetSource=${JSON.stringify(source)},\n}\n`);
  }else{
   // Persist only observed source metadata after a successful native registration.
   candidate.asset.masterGlbHash=candidate.sha256;
   candidate.asset.sourceHash=candidate.sha256;
   candidate.asset.platformVariants={...(candidate.asset.platformVariants||{}),ROBLOX:binding};
   candidate.asset.robloxAssetId=String(assetId);
   candidate.asset.nativeBindingRequired=true;
   candidate.asset.productionVerified=false;candidate.asset.verifiedCompanyReusable=false;
   candidate.asset.runtimeVerificationState='NATIVE_IMPORT_PASS_RUNTIME_REVIEW_PENDING';
   fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
   for(const target of ['10767445796','10767445741','10767445769']){
    const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},body:JSON.stringify({subjectType:'Universe',subjectId:target,action:'Use',requests:[{assetId:Number(assetId),grantToDependencies:true}]})});
    if(grant.errors?.length)throw Error('SHARED_MODEL_PERMISSION_FAILED:'+target);
   }
  }
  console.log('NATIVE_SOURCE_IMPORTED='+candidate.id+':'+assetId);
 }catch(error){
  failures.push(candidate.id);
  console.error('NATIVE_SOURCE_IMPORT_FAILED='+candidate.id+':'+String(error.message));
  if(candidate.combat)throw error;
 }
}
if(failures.length)process.exitCode=1;
console.log('SHARED_NATIVE_IMPORT_CANDIDATES='+String(Math.max(0,candidates.length-1)));
console.log('SHARED_NATIVE_IMPORT_FAILED='+String(failures.length));

// Extend this existing native import job with the owner-requested shared library.
// Import success records IDs and hashes only; runtime/image QA retains promotion authority.
if(process.argv.includes('--include-shared-materials')){
 const materialRoot='assets/roblox/common-materials-v1';
 const manifest=JSON.parse(fs.readFileSync(`${materialRoot}/manifest.json`,'utf8'));
 const nativePath=`${materialRoot}/native-bindings.json`;
 const native=fs.existsSync(nativePath)?JSON.parse(fs.readFileSync(nativePath,'utf8')):{version:1,maps:{},productionVerified:false};
 const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const targetUniverses=['10767445796','10767445741','10767445769'];
 for(const material of manifest.materials){
  if(material.license!=='CC0-1.0'||material.normalConvention!=='OPENGL_TANGENT_SPACE')throw Error('MATERIAL_SOURCE_CONTRACT_INVALID');
  for(const [channel,map]of Object.entries(material.maps)){
   if(!['color','normal','roughness','metalness'].includes(channel)||!map.path.startsWith(materialRoot+'/sources/')||map.path.includes('..'))throw Error('MATERIAL_MAP_PATH_INVALID');
   const bytes=fs.readFileSync(map.path);
   if(digest(bytes)!==map.sha256||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('MATERIAL_MAP_IMAGE_OR_HASH_INVALID');
   const id=`${material.id}:${channel}`;
   let binding=native.maps[id];
   if(binding?.sha256!==map.sha256||!(Number(binding?.assetId)>0)){
    const form=new FormData();
    form.append('request',JSON.stringify({assetType:'Image',displayName:`Vibe ${material.id} ${channel}`,description:`ambientCG CC0 material channel. ${map.sha256}`,creationContext:{creator}}));
    form.append('fileContent',new Blob([bytes],{type:'image/png'}),`${material.id}-${channel}.png`);
    let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
    if(!/^operations\/[a-zA-Z0-9-]+$/.test(op.path||''))throw Error('MATERIAL_IMPORT_OPERATION_INVALID');
    const operationPath=op.path,deadline=Date.now()+240000;
    while(!op.done&&Date.now()<deadline){
     await new Promise(resolve=>setTimeout(resolve,4000));
     op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
    }
    if(!op.done||op.error||!(Number(op.response?.assetId)>0))throw Error('MATERIAL_IMPORT_FAILED:'+id);
    binding={assetId:String(op.response.assetId),sha256:map.sha256,sourcePath:map.path,sourceRevision:process.env.GITHUB_SHA,importedAt:new Date().toISOString(),productionVerified:false};
    native.maps[id]=binding;
    fs.writeFileSync(nativePath,JSON.stringify(native,null,2)+'\n');
   }
   for(const target of targetUniverses){
    const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
     method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
     body:JSON.stringify({subjectType:'Universe',subjectId:target,action:'Use',requests:[{assetId:Number(binding.assetId),grantToDependencies:true}]})
    });
    if(grant.errors?.length)throw Error('MATERIAL_PERMISSION_FAILED:'+id+':'+target);
   }
  }
 }
 // Rojo authors protected MaterialVariant map properties before the game starts.
 const sources={Wood:['Wood062'],WoodPlanks:['WoodFloor051','Wood062'],Slate:['Rock035'],Rock:['Rock030'],Limestone:['Rock030'],Cobblestone:['Rock035'],Concrete:['Concrete034','Concrete046'],Marble:['Marble012'],Brick:['Bricks059','Bricks079'],Metal:['Metal046A'],CorrodedMetal:['Metal032'],DiamondPlate:['MetalPlates006'],Fabric:['Fabric026','Fabric030','Leather008','Leather026'],Ground:['Ground037'],Grass:['Grass001'],LeafyGrass:['Grass001'],Mud:['Ground054']};
 const variants={$className:'MaterialService'};
 for(const [base,ids]of Object.entries(sources))for(const id of ids){
  const properties={BaseMaterial:base,StudsPerTile:base==='Fabric'?2:base==='Wood'?4:8};
  for(const [channel,property]of Object.entries({color:'ColorMap',normal:'NormalMap',roughness:'RoughnessMap',metalness:'MetalnessMap'})){
   const binding=native.maps[`${id}:${channel}`];
   if(binding)properties[property]='rbxassetid://'+binding.assetId;
  }
  if(!properties.ColorMap||!properties.NormalMap||!properties.RoughnessMap)throw Error('MATERIAL_VARIANT_INCOMPLETE:'+id);
  variants[`Vibe_${base}_${id}`]={$className:'MaterialVariant',$properties:properties};
 }
 for(const gameId of ['horror-escape-room','cozy-island','daechung-rpg']){
  const projectPath=`roblox-games/${gameId}/default.project.json`;
  const project=JSON.parse(fs.readFileSync(projectPath,'utf8'));
  // Preserve any existing game-specific variants.
  project.tree.MaterialService={...(project.tree.MaterialService||{}),...variants};
  fs.writeFileSync(projectPath,JSON.stringify(project,null,2)+'\n');
 }
 native.runtimeVisualReview='REQUIRED_EXACT_NATIVE_SOURCE_AND_IMAGES';
 native.productionVerified=false;
 fs.writeFileSync(nativePath,JSON.stringify(native,null,2)+'\n');
 console.log('SHARED_MATERIAL_NATIVE_CHANNELS='+Object.keys(native.maps).length);
}

// 오너 승인 UI 이미지도 기존 이미지 등록·권한 부여 경로에서 처리한다.
if(process.argv.includes('--shared-ui-only')){
 const catalogPath='assets/roblox/common-ui-v1/catalog.json';
 const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
 const gameIds=['horror-escape-room','cozy-island','daechung-rpg'];
 const universes=['10767445796','10767445741','10767445769'];
 for(const field of ['generatedIconAtlas','generatedPanelSkin']){
  const art=catalog[field];
  if(art?.source!=='OWNER_REQUESTED_IMAGE_GENERATION'||art.license!=='OWNER_AUTHORIZED_GENERATED_UI_NOT_CC0'
   ||!art.authorization||!['assets/roblox/common-ui-v1/icons.png','assets/roblox/common-ui-v1/panel.png'].includes(art.path))throw Error('UI_ART_AUTHORIZATION_MISSING');
  const bytes=fs.readFileSync(art.path);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==art.sha256
   ||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
   ||bytes.readUInt32BE(16)!==art.width||bytes.readUInt32BE(20)!==art.height)throw Error('UI_ART_SOURCE_MISMATCH');
  let assetId=art.nativeAssetId;
  if(!/^[1-9]\d*$/.test(String(assetId||''))||art.importedSourceHash!==art.sha256){
   const form=new FormData();
   form.append('request',JSON.stringify({assetType:'Image',displayName:field==='generatedIconAtlas'?'Vibe Adventure UI Icons':'Vibe Fantasy Panel',description:'Owner authorized original generated UI art '+art.sha256,creationContext:{creator}}));
   form.append('fileContent',new Blob([bytes],{type:'image/png'}),field+'.png');
   let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
   if(!/^operations\/[a-zA-Z0-9-]+$/.test(op.path||''))throw Error('UI_ART_OPERATION_INVALID');
   const operationPath=op.path,deadline=Date.now()+240000;
   while(!op.done&&Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,4000));
    op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
   }
   if(!op.done||op.error||!(/^[1-9]\d*$/.test(String(op.response?.assetId||''))))throw Error('UI_ART_IMPORT_FAILED');
   assetId=String(op.response.assetId);
   // 업로드 영수증을 먼저 보존한다. 권한 부여 실패 시 같은 이미지를 중복 등록하지 않는다.
   art.nativeAssetId=assetId;art.importedSourceHash=art.sha256;art.importedRevision=process.env.GITHUB_SHA;
   fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  }
  for(const universe of universes){
   const grants=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
    method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
    body:JSON.stringify({subjectType:'Universe',subjectId:universe,action:'Use',requests:[{assetId:Number(assetId),grantToDependencies:true}]})
   });
   if(grants.errors?.length)throw Error('UI_ART_PERMISSION_FAILED:'+universe);
  }
  art.nativeImportVerified=true;art.authorizedUniverseIds=universes;art.runtimeVerified=false;
  fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  const targets=['assets/roblox/common-ui-v1/RobloxCommonUI.luau',...gameIds.map(id=>'roblox-games/'+id+'/shared/RobloxCommonUI.luau')];
  for(const target of targets){
   // 판타지 원목/금속 스킨을 공포·포근섬에 일괄 강제하지 않는다.
   if(field==='generatedPanelSkin'&&target!=='roblox-games/daechung-rpg/shared/RobloxCommonUI.luau')continue;
   const before=fs.readFileSync(target,'utf8');
   const pattern=field==='generatedIconAtlas'?/local ICON_ATLAS_IMAGE = "[^"]*" -- NATIVE_UI_ATLAS_IMAGE/:/PanelTexture = "[^"]*", -- NATIVE_UI_PANEL_IMAGE/;
   if(!pattern.test(before))throw Error('UI_ART_BINDING_ANCHOR_MISSING:'+target);
   const replacement=field==='generatedIconAtlas'?'local ICON_ATLAS_IMAGE = "rbxassetid://'+assetId+'" -- NATIVE_UI_ATLAS_IMAGE':'PanelTexture = "rbxassetid://'+assetId+'", -- NATIVE_UI_PANEL_IMAGE';
   fs.writeFileSync(target,before.replace(pattern,replacement));
  }
  console.log('UI_ART_NATIVE_IMPORTED='+field+':'+assetId);
 }
}
