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
// [마력숲 오른쪽 실제 아이콘] 외부 PNG 5종 등록, 기존 CC0 물약·가방 2종 보존.
// 사진에서 자른 40px 아틀라스나 게임 안에서 임의로 조립한 아이콘을 금지한다.
if(process.argv.includes('--magic-action-icons-only')){
 const {execFileSync}=await import('node:child_process');
 const registryPath='roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json';
 const clientPath='roblox-games/fantasy-survival/client/Game.client.luau';
 const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 // [기존 승인 자산] 다운로드 원본·등록 ID·게임 바인딩까지 일치하면 권한 API를 반복 호출하지 않는다.
 const verifiedRoles={fist:['lorc','punch-blast'],dodge:['darkzaitzev','acrobatic'],
   guard:['delapouite','attached-shield'],interact:['lorc','grab'],sprint:['lorc','sprint']};
 const importedIcons=registry.nativeActionIcons?.icons||{};
 const existingClient=fs.readFileSync(clientPath,'utf8');
 const verifiedExisting=registry.gameId==='fantasy-survival'
   &&registry.nativeActionIcons?.registrationVerified===true
   &&Object.entries(verifiedRoles).every(([role,[author,name]])=>{
     const row=importedIcons[role];
     const path='roblox-games/fantasy-survival/action-icons/'+role+'.png';
     return row?.license==='CC-BY-3.0'&&row?.importVerified===true
       &&row.author===author&&row.sourceEntry===name+'.png'
       &&row.sourceUrl==='https://game-icons.net/icons/ffffff/transparent/1x1/'+author+'/'+name+'.png'
       &&row.authorizedUniverseIds?.includes('10773436325')
       &&/^[1-9]\d*$/.test(String(row.assetId))
       &&fs.existsSync(path)
       &&crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')===row.sourceSha256
       &&existingClient.includes(role+'="rbxassetid://'+row.assetId+'"');
   })
   &&[['potion','120656085154237'],['bag','127437456512278']].every(([role,id])=>
     importedIcons[role]?.assetId===id&&importedIcons[role]?.license==='CC0-1.0'
       &&importedIcons[role]?.authorizedUniverseIds?.includes('10773436325')
       &&existingClient.includes(role+'="rbxassetid://'+id+'"'))
   &&existingClient.includes('meadowRadar.Position=UDim2.new(1,-12,0,8)');
 if(verifiedExisting){
   console.log('FOREST_EXTERNAL_ACTION_ICONS_ALREADY_BOUND=YES');
   process.exit(0);
 }
 const archive=registry.interfaceIcons?.sourceArchives?.find(x=>x.path==='assets/external/simple-rpg/icons-vfx-npc/fantasy-rpg-icons.zip');
 if(!archive||registry.gameId!=='fantasy-survival'||registry.interfaceIcons?.license!=='CC0-1.0'
   ||registry.interfaceIcons?.universeId!=='10773436325')throw Error('FOREST_REAL_ICONS_CC0_PROVENANCE_INVALID');
 if(crypto.createHash('sha256').update(fs.readFileSync(archive.path)).digest('hex')!==archive.sha256)
   throw Error('FOREST_REAL_ICONS_SOURCE_ARCHIVE_HASH_MISMATCH');
 const entries=execFileSync('unzip',['-Z','-1',archive.path],{encoding:'utf8',maxBuffer:1024*1024})
   .split(/\r?\n/).filter(Boolean);
 const roles=[
   ['fist','punch-blast.png','lorc'],
   ['dodge','acrobatic.png','darkzaitzev'],
   ['guard','attached-shield.png','delapouite'],
   ['potion','icon_potionred.png',null],
   ['interact','grab.png','lorc'],
   ['sprint','sprint.png','lorc'],
   ['bag','icon_bag.png',null]
 ];
 const originalIconData={};
 for(const [role,filename,author] of roles){
   let original,entry=filename,sourceUrl=null;
   if(author){
     sourceUrl='https://game-icons.net/icons/ffffff/transparent/1x1/'+author+'/'+filename;
     const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(60000)});
     if(!response.ok||!String(response.headers.get('content-type')||'').toLowerCase().includes('image/png'))
       throw Error('FOREST_EXTERNAL_ICON_DOWNLOAD_FAILED:'+role+':'+response.status);
     original=Buffer.from(await response.arrayBuffer());
   }else{
     const paths=entries.filter(e=>e.toLowerCase().split('/').pop()===filename);
     if(paths.length!==1||paths[0].includes('..')||paths[0].startsWith('/'))
       throw Error('FOREST_CC0_ORIGINAL_ICON_MISSING_OR_AMBIGUOUS:'+role);
     entry=paths[0];
     original=execFileSync('unzip',['-p',archive.path,entry],{maxBuffer:4*1024*1024});
   }
   if(original.length<400||original.length>2*1024*1024
     ||!original.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
     throw Error('FOREST_EXTERNAL_ICON_INVALID_PNG:'+role);
   const width=original.readUInt32BE(16),height=original.readUInt32BE(20);
   if(width<16||width>1024||height<16||height>1024)
     throw Error('FOREST_EXTERNAL_ICON_INVALID_SIZE:'+role);
   originalIconData[role]={entry,filename,author,sourceUrl,bytes:original,
     sha256:crypto.createHash('sha256').update(original).digest('hex'),width,height};
 }
 const stored=registry.nativeActionIcons?.icons||{};
 const imported={};
 for(const [role,filename] of roles){
   const source=originalIconData[role],prior=stored[role];
   // [보존] 물약·가방 원본 ID·SHA를 변경하지 않는다.
   if(!source.author&&(String(prior?.assetId||'')!==(role==='potion'?'120656085154237':'127437456512278')
     ||prior?.sourceSha256!==source.sha256||prior?.license!=='CC0-1.0'||prior?.importVerified!==true))
     throw Error('FOREST_PROTECTED_ICON_CHANGED:'+role);
   let assetId=String(prior?.assetId||'');
   if(!/^[1-9]\d*$/.test(assetId)||prior?.sourceSha256!==source.sha256
     ||prior?.sourceEntry!==source.entry||(prior?.sourceUrl||null)!==(source.sourceUrl||null)
     ||prior?.license!==(source.author?'CC-BY-3.0':'CC0-1.0')||prior?.importVerified!==true){
     const form=new FormData();
     form.append('request',JSON.stringify({
       assetType:'Image',displayName:'Mana Forest '+role+' Action Icon',
       description:(source.author?'Game-icons.net '+source.author+' CC BY 3.0 ':'Drummyfish CC0 ')+filename+' sha256 '+source.sha256,
       creationContext:{creator}
     }));
     form.append('fileContent',new Blob([source.bytes],{type:'image/png'}),filename);
     let op=await request('https://apis.roblox.com/assets/v1/assets',{
       method:'POST',headers:{'x-api-key':key},body:form
     });
     if(!/^operations\/[a-zA-Z0-9-]+$/.test(String(op.path||'')))
       throw Error('FOREST_CC0_ICON_UPLOAD_OPERATION_INVALID:'+role);
     const operationPath=op.path,deadline=Date.now()+240000;
     while(!op.done&&Date.now()<deadline){
       await new Promise(resolve=>setTimeout(resolve,4000));
       op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
     }
     assetId=String(op.response?.assetId||'');
     if(!op.done||op.error||!/^[1-9]\d*$/.test(assetId))
       throw Error('FOREST_CC0_ICON_UPLOAD_FAILED:'+role);
   }
   // [429 보호] 원본·ID·기존 승인 증빙이 같으면 권한 API 반복 호출을 생략한다.
   const permissionCurrent=String(prior?.assetId||'')===assetId
     &&prior?.sourceSha256===source.sha256&&prior?.importVerified===true
     &&prior?.authorizedUniverseIds?.includes('10773436325');
   if(!permissionCurrent){
     const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
       method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
       body:JSON.stringify({subjectType:'Universe',subjectId:'10773436325',action:'Use',
         requests:[{assetId:Number(assetId),grantToDependencies:true}]})
     });
     if(grant.errors?.length)throw Error('FOREST_ICON_UNIVERSE_GRANT_FAILED:'+role);
   }
   if(source.author){
     fs.mkdirSync('roblox-games/fantasy-survival/action-icons',{recursive:true});
     fs.writeFileSync('roblox-games/fantasy-survival/action-icons/'+role+'.png',source.bytes);
   }
   imported[role]={
     assetId,sourceEntry:source.entry,sourceSha256:source.sha256,
     sourceUrl:source.sourceUrl,author:source.author,
     licenseEvidence:source.author?'https://game-icons.net/1x1/'+source.author+'/'+filename.replace('.png','.html'):'https://opengameart.org/content/fantasy-rpg-icons-0',
     width:source.width,height:source.height,
     license:source.author?'CC-BY-3.0':'CC0-1.0',importVerified:true,runtimeVerified:false,
     authorizedUniverseIds:['10773436325']
   };
   console.log('FOREST_CC0_NATIVE_ACTION_ICON='+role+':'+assetId);
   registry.nativeActionIcons={
     source:'EXTERNAL_ACTION_ICONS_WITH_ORIGINAL_CC0',
     license:'MIXED_CC_BY_3_0_AND_CC0',licenseEvidence:'https://game-icons.net/about.html',
     sourceArchive:archive.path,sourceArchiveSha256:archive.sha256,
     universeId:'10773436325',icons:{...stored,...imported},
     registrationVerified:false,importedRevision:process.env.GITHUB_SHA
   };
   fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 }
 if(roles.some(([role])=>!/^[1-9]\d*$/.test(String(imported[role]?.assetId||''))))
   throw Error('FOREST_CC0_REAL_ICONS_INCOMPLETE');
 registry.nativeActionIcons.registrationVerified=true;
 registry.rightActionIcons.runtimeReplacedBy='nativeActionIcons';
 fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 // [원본 게임 UI] 등록 완료된 개별 이미지 ID만 바인딩한다.
 let client=fs.readFileSync(clientPath,'utf8');
 const iconStart=client.indexOf('-- [오른쪽 아이콘]');
 const iconEnd=client.indexOf('local reducedEffects=',iconStart);
 if(iconStart<0||iconEnd<iconStart)throw Error('FOREST_EXTERNAL_ICON_BINDING_ANCHOR_MISSING');
 const iconEntries=roles.map(([role])=>'  '+role+'="rbxassetid://'+imported[role].assetId+'"').join(',\n');
 client=client.slice(0,iconStart)+'-- [오른쪽 아이콘] 외부 액션 5종 / 기존 물약·가방 2종\n'
   +'local meadowRealActionIcons={\n'+iconEntries+'\n} -- CC0_REAL_ACTION_ICONS\n'+client.slice(iconEnd);
 if(/meadowRightActionAtlas|meadowRightActionRects|paintMeadowActionArt/.test(client))
   throw Error('FOREST_SCREENSHOT_ICON_FALLBACK_STILL_PRESENT');
 fs.writeFileSync(clientPath,client);
 console.log('FOREST_EXTERNAL_ACTION_ICONS_READY=YES');
 process.exit(0);
}

// [마력숲 사슴 원본 교체] 기존 잘못된 사슴 FBX는 사용하지 않는다.
// 원본 GLB를 공식 무료 목록에서 검증해 저장하고, 기존 네이티브 모델 등록 경로로 전송한다.
if(process.argv.includes('--forest-deer-only')){
 // [실제 사슴] Quaternius 공식 CC0 동물 팩의 원본 46관절·26클립 GLB를 사용한다.
 // 실물 메시에 있는 스킨·대기·걷기·질주 애니메이션을 검증하고 기존 Roblox Model 등록을 재사용한다.
 const nativePath='assets/shared/forest/deer-animated.glb';
 const licenseUrl='https://quaternius.com/packs/ultimateanimatedanimals.html';
 const sourceUrl='https://github.com/nishit47/Blender-Pre-vis-Pipeline---Screenplay-to-Animatic/blob/main/assets/Animated%20Animal%20Pack-glb/Deer.glb';
 const bytes=fs.readFileSync(nativePath);
 if(bytes.length<1000||bytes.length>18*1024*1024||bytes.toString('ascii',0,4)!=='glTF'
   ||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length
   ||bytes.readUInt32LE(16)!==0x4e4f534a)throw Error('FOREST_DEER_INVALID_GLTF');
 const jsonSize=bytes.readUInt32LE(12);
 if(20+jsonSize>bytes.length)throw Error('FOREST_DEER_GLTF_JSON_BOUNDS');
 const gltf=JSON.parse(bytes.subarray(20,20+jsonSize).toString('utf8'));
 const jointNames=new Set((gltf.nodes||[]).map(node=>node.name));
 const requiredJoints=['Head','Torso','FrontUpperLeg.L','FrontUpperLeg.R',
   'FrontLowerLeg.L','FrontLowerLeg.R','BackUpperLeg.L','BackUpperLeg.R',
   'BackLowerLeg.L','BackLowerLeg.R'];
 const requiredClips=['Idle','Walk','Gallop'];
 if(!Array.isArray(gltf.meshes)||gltf.meshes.length!==1
   ||!gltf.skins?.some(skin=>skin.joints?.length>=40)
   ||requiredJoints.some(name=>!jointNames.has(name))
   ||requiredClips.some(name=>!gltf.animations?.some(clip=>clip.name===name)))
   throw Error('FOREST_DEER_FOUR_LEG_RIG_OR_AUTHORED_MOTION_MISSING');
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const registryPath='roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json';
 const manifestPath='roblox-games/fantasy-survival/native-assets.json';
 const visualPath='roblox-games/fantasy-survival/shared/VisualAssetIds.luau';
 const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 const native=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(native.gameId!=='fantasy-survival'||native.ownerApproved!==true
   ||registry.gameId!=='fantasy-survival'||!registry.models?.deer
   ||native.models?.deer?.role!=='PASSIVE_MEADOW_WILDLIFE')
   throw Error('FOREST_DEER_CROSS_GAME_PROVENANCE_INVALID');
 const oldId=Number(registry.models.deer.assetId);
 let assetId=oldId;
 if(registry.models.deer.sha256!==digest||registry.models.deer.sourceFile!==nativePath
   ||!Number.isSafeInteger(assetId)||assetId<1){
   const form=new FormData();
   form.append('request',JSON.stringify({
     assetType:'Model',displayName:'Mana Forest Quaternius Animated Deer',
     description:'Quaternius CC0 original 46-bone 26-clip deer, sha256 '+digest,
     creationContext:{creator}
   }));
   form.append('fileContent',new Blob([bytes],{type:'model/gltf-binary'}),'deer-animated.glb');
   let op=await request('https://apis.roblox.com/assets/v1/assets',{
     method:'POST',headers:{'x-api-key':key},body:form
   });
   if(!/^operations\\/[a-zA-Z0-9-]+$/.test(String(op.path||'')))
     throw Error('FOREST_DEER_IMPORT_OPERATION_INVALID');
   const operationPath=op.path,deadline=Date.now()+240000;
   while(!op.done&&Date.now()<deadline){
     await new Promise(resolve=>setTimeout(resolve,4000));
     op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
   }
   assetId=Number(op.response?.assetId);
   if(!op.done||op.error||!Number.isSafeInteger(assetId)||assetId<1||assetId===oldId)
     throw Error('FOREST_DEER_NATIVE_UPLOAD_FAILED');
 }
 const permission=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
   method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
   body:JSON.stringify({subjectType:'Universe',subjectId:'10773436325',action:'Use',
     requests:[{assetId,grantToDependencies:true}]})
 });
 if(permission.errors?.length)throw Error('FOREST_DEER_UNIVERSE_PERMISSION_FAILED');
 // 게시 자산 ID와 대상 게임 사용 권한을 확인한 뒤에만 기존 등록 파일을 갱신한다.
 native.models.deer={
   atom:'ANTLER',sourcePath:nativePath,sourceSha256:digest,
   licenseEvidence:licenseUrl,role:'PASSIVE_MEADOW_WILDLIFE'
 };
 const newNative=JSON.stringify(native,null,2)+'\n';
 registry.models.deer={
   assetId,sha256:digest,source:'VERIFIED_CC0_ORIGINAL',
   sourceFile:nativePath,sourceSha256:digest,license:'CC0-1.0',
   licenseEvidence:licenseUrl,universeId:'10773436325',
   creator:'Quaternius',sourceUrl,importedRevision:process.env.GITHUB_SHA,
   rigged:true,walkAnimation:true,runAnimation:true,originalAnimationClips:26,runtimeVerified:false
 };
 registry.sourceManifestSha256=crypto.createHash('sha256').update(newNative).digest('hex');
 registry.runtimeVerified=false;
 const visual=fs.readFileSync(visualPath,'utf8');
 if(!/^\\s*deer=\\d+,/m.test(visual))throw Error('FOREST_DEER_NATIVE_ID_ANCHOR_MISSING');
 fs.writeFileSync(manifestPath,newNative);
 fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 fs.writeFileSync(visualPath,visual.replace(/^\\s*deer=\\d+,/m,' deer='+assetId+','));
 console.log('FOREST_DEER_QUATERNIUS_NATIVE_REGISTERED='+assetId);
 console.log('FOREST_DEER_SOURCE_SHA256='+digest);
 console.log('FOREST_DEER_ORIGINAL_ASSET_REPLACED='+oldId+':'+assetId);
 process.exit(0);
}
// 공용 원본도 이 기존 네이티브 등록 경로를 사용한다. 원본 파일은 수정하지 않는다.
const registryPath='company-asset-library.json';
const registry=process.argv.includes('--include-shared-models')?JSON.parse(fs.readFileSync(registryPath,'utf8')):null;
const candidates=(process.argv.includes('--shared-ui-only')||process.argv.includes('--shared-vfx-only')||process.argv.includes('--magic-ui-only'))?[]:[{id:'midnight-combat-ghost',path:source,sha256:hash,combat:true}];
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
  if(field==='generatedPanelSkin'){
   const menuPath='roblox-games/daechung-rpg/shared/RPGMenu.luau';
   const menu=fs.readFileSync(menuPath,'utf8');
   const anchor=/local generatedPanelImage="[^"]*" -- NATIVE_RPG_PANEL_IMAGE/;
   if(!anchor.test(menu))throw Error('RPG_PANEL_BINDING_ANCHOR_MISSING');
   fs.writeFileSync(menuPath,menu.replace(anchor,'local generatedPanelImage="rbxassetid://'+assetId+'" -- NATIVE_RPG_PANEL_IMAGE'));
  }
  console.log('UI_ART_NATIVE_IMPORTED='+field+':'+assetId);
 }
}

// 공용 이펙트도 같은 네이티브 자산 등록 경로를 사용한다. 원본 CC0 해시와 사용 권한을 보존한다.
if(process.argv.includes('--shared-vfx-only')){
 const catalogPath='assets/roblox/common-vfx-v1/catalog.json';
 const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
 const universes=['10767445796','10767445741','10767445769'];
 const seen=new Set();
 for(const art of catalog.nativeSprites||[]){
  if(!['spark','ring','slash','smoke','light'].includes(art.key)||seen.has(art.key)||art.license!=='CC0-1.0'
   ||art.path!=='assets/roblox/common-vfx-v1/sources/'+art.key+'.png'
   ||art.sourceArchive!=='assets/external/simple-rpg/icons-vfx-npc/particles.zip')throw Error('VFX_SOURCE_CONTRACT_INVALID');
  seen.add(art.key);
  const archive=fs.readFileSync(art.sourceArchive),bytes=fs.readFileSync(art.path);
  if(crypto.createHash('sha256').update(archive).digest('hex')!==art.sourceArchiveSha256
   ||crypto.createHash('sha256').update(bytes).digest('hex')!==art.sha256
   ||art.sha256!==art.sourceSha256||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('VFX_SOURCE_HASH_MISMATCH');
  let assetId=art.assetId;
  if(!/^[1-9]\d*$/.test(String(assetId||''))||art.importedSourceHash!==art.sha256){
   const form=new FormData();
   form.append('request',JSON.stringify({assetType:'Image',displayName:'Vibe CC0 '+art.key,description:'Kenney CC0 particle source; native game-specific tint and envelope adaptation. '+art.sha256,creationContext:{creator}}));
   form.append('fileContent',new Blob([bytes],{type:'image/png'}),art.key+'.png');
   let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
   if(!/^operations\/[a-zA-Z0-9-]+$/.test(op.path||''))throw Error('VFX_IMPORT_OPERATION_INVALID');
   const operationPath=op.path,deadline=Date.now()+240000;
   while(!op.done&&Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,4000));
    op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
   }
   if(!op.done||op.error||!(/^[1-9]\d*$/.test(String(op.response?.assetId||''))))throw Error('VFX_IMPORT_FAILED:'+art.key);
   assetId=String(op.response.assetId);art.assetId=assetId;art.importedSourceHash=art.sha256;art.importedRevision=process.env.GITHUB_SHA;
   fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  }
  for(const universe of universes){
   const grants=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
    method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
    body:JSON.stringify({subjectType:'Universe',subjectId:universe,action:'Use',requests:[{assetId:Number(assetId),grantToDependencies:true}]})
   });
   if(grants.errors?.length)throw Error('VFX_PERMISSION_FAILED:'+art.key+':'+universe);
  }
  art.importVerified=true;art.authorizedUniverseIds=universes;art.runtimeVerified=false;
  fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  console.log('VFX_NATIVE_IMPORTED='+art.key+':'+assetId);
 }
 if(seen.size!==5)throw Error('VFX_REQUIRED_SPRITES_MISSING');
}

// 파일 구분: 마력숲 CC0 아이콘을 기존 이미지 등록·사용 권한 경로로만 연결한다.
if(process.argv.includes('--magic-ui-only')){
 const registryPath='roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json';
 const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 const art=registry.interfaceIcons;
 if(art?.license!=='CC0-1.0'||art.path!=='roblox-games/fantasy-survival/icons.png'
  ||art.universeId!=='10773436325'||art.width!==512||art.height!==64)throw Error('MAGIC_UI_CONTRACT_INVALID');
 for(const source of art.sourceArchives||[]){
  if(!['assets/external/simple-rpg/icons-vfx-npc/fantasy-rpg-icons.zip','assets/external/simple-rpg/icons-vfx-npc/game-icons.zip'].includes(source.path)
   ||crypto.createHash('sha256').update(fs.readFileSync(source.path)).digest('hex')!==source.sha256)throw Error('MAGIC_UI_ARCHIVE_MISMATCH');
 }
 const bytes=fs.readFileSync(art.path);
 if(art.sourceArchives?.length!==2||crypto.createHash('sha256').update(bytes).digest('hex')!==art.sha256
  ||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  ||bytes.readUInt32BE(16)!==512||bytes.readUInt32BE(20)!==64)throw Error('MAGIC_UI_HASH_MISMATCH');
 let assetId=art.assetId;
 if(!/^[1-9]\d*$/.test(String(assetId||''))||art.importedSourceHash!==art.sha256){
  const form=new FormData();
  form.append('request',JSON.stringify({assetType:'Image',displayName:'Mana Forest CC0 Interface Icons',description:'Preserved Drummyfish and Kenney CC0 icon atlas '+art.sha256,creationContext:{creator}}));
  form.append('fileContent',new Blob([bytes],{type:'image/png'}),'magic-icons.png');
  let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
  if(!/^operations\/[a-zA-Z0-9-]+$/.test(op.path||''))throw Error('MAGIC_UI_OPERATION_INVALID');
  const operationPath=op.path,deadline=Date.now()+240000;
  while(!op.done&&Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,4000));
   op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
  }
  if(!op.done||op.error||!(/^[1-9]\d*$/.test(String(op.response?.assetId||''))))throw Error('MAGIC_UI_IMPORT_FAILED');
  assetId=String(op.response.assetId);art.assetId=assetId;art.importedSourceHash=art.sha256;
  art.importedRevision=process.env.GITHUB_SHA;fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 }
 const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
  method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
  body:JSON.stringify({subjectType:'Universe',subjectId:art.universeId,action:'Use',requests:[{assetId:Number(assetId),grantToDependencies:true}]})
 });
 if(grant.errors?.length)throw Error('MAGIC_UI_PERMISSION_FAILED');
 art.importVerified=true;art.authorizedUniverseIds=[art.universeId];art.runtimeVerified=false;
 fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 const clientPath='roblox-games/fantasy-survival/client/Game.client.luau';
 const client=fs.readFileSync(clientPath,'utf8');
 const anchor=/local meadowIconAtlas="[^"]*" -- CC0_INTERFACE_ATLAS/;
 if(!anchor.test(client))throw Error('MAGIC_UI_BINDING_ANCHOR_MISSING');
 fs.writeFileSync(clientPath,client.replace(anchor,'local meadowIconAtlas="rbxassetid://'+assetId+'" -- CC0_INTERFACE_ATLAS'));
 // [시안 그림 자산] 사용자 제공 사진에서 오른쪽 버튼 7개만 추출해 기존 등록 경로에 연결한다.
 const right=registry.rightActionIcons;
 if(right){
  if(right.source!=='OWNER_PROVIDED_REFERENCE_CAPTURE'||right.license!=='OWNER_AUTHORIZED_SCREENSHOT_UI'
    ||!right.authorization||right.scope!=='RIGHT_ACTION_HUD_ONLY'
    ||right.path!=='roblox-games/fantasy-survival/right-icons.png'
    ||right.width!==320||right.height!==40||right.columns!==8
    ||right.universeId!==art.universeId||right.keys?.join(',')!=='kick,uppercut,guard,dodge,sprint,interact,bag,')
    throw Error('MAGIC_RIGHT_ICON_PROVENANCE_INVALID');
  const rightBytes=fs.readFileSync(right.path);
  if(crypto.createHash('sha256').update(rightBytes).digest('hex')!==right.sha256
    ||!rightBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    ||rightBytes.readUInt32BE(16)!==320||rightBytes.readUInt32BE(20)!==40)
    throw Error('MAGIC_RIGHT_ICON_SOURCE_MISMATCH');
  let rightId=right.assetId;
  if(!/^[1-9]\d*$/.test(String(rightId||''))||right.importedSourceHash!==right.sha256){
   const form=new FormData();
   form.append('request',JSON.stringify({assetType:'Image',displayName:'Mana Forest Right Action HUD',description:'Owner provided right-side screenshot sprites '+right.sha256,creationContext:{creator}}));
   form.append('fileContent',new Blob([rightBytes],{type:'image/png'}),'right-icons.png');
   let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
   if(!/^operations\/[a-zA-Z0-9-]+$/.test(op.path||''))throw Error('MAGIC_RIGHT_ICON_OPERATION_INVALID');
   const operationPath=op.path,deadline=Date.now()+240000;
   while(!op.done&&Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,4000));
    op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
   }
   if(!op.done||op.error||!(/^[1-9]\d*$/.test(String(op.response?.assetId||''))))throw Error('MAGIC_RIGHT_ICON_IMPORT_FAILED');
   rightId=String(op.response.assetId);
   right.assetId=rightId;
   right.importedSourceHash=right.sha256;
   right.importedRevision=process.env.GITHUB_SHA;
   fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
  }
  const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
   method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
   body:JSON.stringify({subjectType:'Universe',subjectId:right.universeId,action:'Use',requests:[{assetId:Number(rightId),grantToDependencies:true}]})
  });
  if(grant.errors?.length)throw Error('MAGIC_RIGHT_ICON_PERMISSION_FAILED');
  right.importVerified=true;
  right.authorizedUniverseIds=[right.universeId];
  right.runtimeVerified=false;
  fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
  const clientPath='roblox-games/fantasy-survival/client/Game.client.luau';
  const before=fs.readFileSync(clientPath,'utf8');
  const anchor=/local meadowRightActionAtlas="[^"]*" -- RIGHT_ACTION_ICON_ATLAS/;
  if(!anchor.test(before))throw Error('MAGIC_RIGHT_ICON_BINDING_ANCHOR_MISSING');
  fs.writeFileSync(clientPath,before.replace(anchor,'local meadowRightActionAtlas="rbxassetid://'+rightId+'" -- RIGHT_ACTION_ICON_ATLAS'));
  console.log('MAGIC_RIGHT_ICON_NATIVE_IMPORTED='+rightId);
 }
 // 이미 등록된 CC0 입자 이미지는 새로 업로드하지 않고 마력숲 사용 권한만 부여한다.
 const vfx=JSON.parse(fs.readFileSync('assets/roblox/common-vfx-v1/catalog.json','utf8'));
 registry.interfaceVfx=[];
 for(const sprite of vfx.nativeSprites||[]){
  if(!['spark','ring','slash','smoke','light'].includes(sprite.key)||sprite.license!=='CC0-1.0'
   ||sprite.importVerified!==true||!Number(sprite.assetId)
   ||crypto.createHash('sha256').update(fs.readFileSync(sprite.path)).digest('hex')!==sprite.sha256)throw Error('MAGIC_VFX_SOURCE_INVALID');
  const result=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
   method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
   body:JSON.stringify({subjectType:'Universe',subjectId:art.universeId,action:'Use',requests:[{assetId:Number(sprite.assetId),grantToDependencies:true}]})
  });
  if(result.errors?.length)throw Error('MAGIC_VFX_PERMISSION_FAILED:'+sprite.key);
  registry.interfaceVfx.push({key:sprite.key,assetId:sprite.assetId,sourceSha256:sprite.sha256,license:sprite.license,authorizedUniverseIds:[art.universeId],runtimeVerified:false});
  fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 }
 if(registry.interfaceVfx.length!==5)throw Error('MAGIC_VFX_REQUIRED_SPRITES_MISSING');
 console.log('MAGIC_UI_NATIVE_IMPORTED='+assetId);
}
