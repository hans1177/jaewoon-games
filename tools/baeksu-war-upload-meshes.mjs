#!/usr/bin/env node
// 파일명: tools/baeksu-war-upload-meshes.mjs
// 변환한 원본 CC0 3D 에셋의 해시·라이선스·게임별 권한을 확인하고 기존 Place용으로 등록.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';
const UNIVERSE='10773115989', PLACE='120481433333785';
const fantasy=process.argv.includes('--game-id=fantasy-survival');
const targetUniverse=fantasy?String(process.env.ROBLOX_UNIVERSE_ID||'').trim():UNIVERSE;
const dir=process.argv[2]||'/tmp/baeksu-art';
const receipt=process.argv[3]||'/tmp/baeksu-art-upload.json';
const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
if(!key)throw new Error('OPEN_CLOUD_KEY_REQUIRED');
// [인증] 이전 계정의 세션 대신 현재 Cloud 키의 소유자와 권한만 검증한다.
let creator=String(process.env.ROBLOX_CREATOR_USER_ID||'').trim();
if(!creator){
 const scope=await introspectRobloxApiKey({apiKey:key});
 if(scope.enabled!==true||scope.expired===true)throw Error('MODEL_CREATOR_AUTHORIZATION_UNVERIFIED');
 const writable=scope.scopes.filter(entry=>/asset/i.test(entry.name||'')
  &&entry.operations.some(x=>/write|create/i.test(x)));
 const ids=new Set();
 for(const entry of writable)for(const id of entry.userIds)if(/^[1-9][0-9]*$/.test(id))ids.add(id);
 if(ids.size===1)creator=[...ids][0];
 const authorized=String(scope.authorizedUserId||'');
 if(!creator&&/^[1-9][0-9]*$/.test(authorized)
  &&writable.some(entry=>entry.userIds.includes('*')||entry.userIds.includes(authorized)))creator=authorized;
}
if(!/^[1-9][0-9]*$/.test(creator))throw Error('MODEL_CREATOR_UNKNOWN_FAIL_CLOSED');
async function req(url,opts={}){
 const r=await fetch(url,{
  ...opts,
  headers:{...(opts.headers||{}),'x-api-key':key},
  signal:AbortSignal.timeout(60000),
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error('ROBLOX_ASSET_API_'+r.status+':'+JSON.stringify(data).slice(0,650));
 return data;
}
// [FOREST_GEAR_REGISTER_ORIGINAL_CC0] 마력숲 무기·갑옷 독립 원본을 기존 Open Cloud 책임 경로로 등록한다.
// 기존 장비 번호·AssetIds 및 다른 게임의 업로더는 그대로 유지한다.
if(fantasy&&(process.argv.includes('--register-forest-gear')
  ||process.argv.includes('--register-forest-distinct-weapons')
  ||process.argv.includes('--register-forest-kaykit-weapons'))){
 const distinct=process.argv.includes('--register-forest-distinct-weapons');
 const kaykit=process.argv.includes('--register-forest-kaykit-weapons');
 if(targetUniverse!=='10773436325')throw Error('FOREST_GEAR_UNIVERSE_NOT_APPROVED');
 const {execFileSync}=await import('node:child_process');
 const root='roblox-games/fantasy-survival';
 const registryFile=root+'/CC0-ASSET-REGISTRY.json';
 const idsFile=root+'/shared/VisualAssetIds.luau';
 const sourceRoot='assets/external/simple-rpg/priority-v1';
 const licenseSources={
  'swordtember-30-glb.zip':'https://opengameart.org/content/30-unique-lowpoly-swords-cc0-swordtember2022',
  'rpg-items-8.zip':'https://opengameart.org/content/rpg-item-collection-1',
  'rpg-items-armor-8.zip':'https://opengameart.org/content/rpg-item-collection-2',
 };
 const manifest=JSON.parse(await fs.readFile(sourceRoot+'/manifest.json','utf8'));
 const expected={
  'swordtember-30-glb.zip':'7bd10d5ab0aae89bf9a639ab8a21a336ba1652a537307bff0b2ab0cb8b59ff29',
  'rpg-items-8.zip':'51acd89645ae49d9563a11f7314fea1b33ee16e764c071d8814c0c3b1642efc8',
  'rpg-items-armor-8.zip':'1a91b47a47b911f74d47ca09de4d40d58166cfa41139687236d9fc0bce4588cb',
 };
 const temp='/tmp/forest-gear-originals';
 await fs.mkdir(temp,{recursive:true});
 const archiveMap=new Map();
 for(const [file,sha] of Object.entries(expected)){
  const found=(manifest.packs||[]).find(p=>p.file===file);
  const zip=path.join(sourceRoot,file);
  const bytes=await fs.readFile(zip);
  if(found?.sha256!==sha||found.licenseDeclared!=='CC0-1.0'
   ||found.licenseSourceUrl!==licenseSources[file]
   ||crypto.createHash('sha256').update(bytes).digest('hex')!==sha)
   throw Error('FOREST_GEAR_SOURCE_HASH_OR_LICENSE_INVALID:'+file);
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:1024*1024}).split(/\r?\n/).filter(Boolean);
  if(names.some(n=>n.startsWith('/')||n.split('/').includes('..')||n.includes('\\')))
   throw Error('FOREST_GEAR_ARCHIVE_UNSAFE:'+file);
  archiveMap.set(file,{zip,names});
 }
 const plan=[];
 const sword=archiveMap.get('swordtember-30-glb.zip');
 const swordEntries=sword.names.filter(n=>n.toLowerCase().endsWith('.glb')).sort();
 if(swordEntries.length<12)throw Error('FOREST_GEAR_SWORD_SOURCE_COUNT_LOW:'+swordEntries.length);
 for(let i=0;i<12;i++)plan.push({
  key:'gear_sword_'+String(i+1).padStart(2,'0'),archive:'swordtember-30-glb.zip',entry:swordEntries[i],
 });
 for(const [key,archive,word] of [
  ['gear_relic_sword','rpg-items-8.zip','sword'],
  ['gear_relic_axe','rpg-items-8.zip','axe'],
  ['gear_relic_hammer','rpg-items-8.zip','hammer'],
  ['gear_relic_staff','rpg-items-8.zip','staff'],
  ['gear_relic_shield','rpg-items-8.zip','shield'],
  ['gear_relic_dagger','rpg-items-armor-8.zip','dagger'],
  ['gear_relic_crossbow','rpg-items-armor-8.zip','crossbow'],
  ['gear_relic_armor','rpg-items-armor-8.zip','armor'],
 ]){
  const pack=archiveMap.get(archive);
  const candidates=pack.names.filter(n=>/\.(glb|fbx|obj)$/i.test(n)
    &&n.toLowerCase().includes(word)).sort((a,b)=>{
     const priority=n=>n.toLowerCase().endsWith('.glb')?0:n.toLowerCase().endsWith('.fbx')?1:2;
     return priority(a)-priority(b)||a.localeCompare(b);
    });
  if(!candidates.length)throw Error('FOREST_GEAR_MODEL_NOT_IN_ARCHIVE:'+key);
  plan.push({key,archive,entry:candidates[0]});
 }
 if(plan.length!==20||new Set(plan.map(p=>p.key)).size!==20)
  throw Error('FOREST_GEAR_PLAN_INVALID');
 // [무기 원본 확장] V1 기존 20종은 그대로 두고, 독립 검 18종+중세 무기 24종만 V2에 등록.
 let medievalSource=null;
 if(distinct){
  if(swordEntries.length<30)throw Error('FOREST_DISTINCT_SWORD_SOURCE_COUNT_INVALID');
  const sourceFolder=sourceRoot+'/medieval-weapons';
  medievalSource=JSON.parse(await fs.readFile(sourceFolder+'/manifest.json','utf8'));
  if(medievalSource.gameId!=='fantasy-survival'||medievalSource.modelCount!==24
   ||medievalSource.license!=='CC0-1.0'||medievalSource.sourceDownloadedVerified!==true
   ||medievalSource.sourceCommit!=='c06a6fa9a1b13576edf3bd62d7b52aba334f8fc0'
   ||medievalSource.files.length!==24)throw Error('FOREST_DISTINCT_CC0_MANIFEST_INVALID');
  licenseSources['medieval-weapons']='https://quaternius.com/packs/medievalweapons.html';
  expected['medieval-weapons']=medievalSource.sourceCommit;
  plan.length=0;
  for(let i=12;i<30;i++)plan.push({
   key:'gear_sword_'+String(i+1).padStart(2,'0'),
   archive:'swordtember-30-glb.zip',entry:swordEntries[i],
  });
  for(const row of medievalSource.files){
   if(!/^[A-Za-z0-9_]+\.glb$/.test(row.file)
    ||!/^[a-f0-9]{64}$/.test(row.sha256)||!/^[a-f0-9]{40}$/.test(row.gitSha))
    throw Error('FOREST_DISTINCT_MODEL_EVIDENCE_INVALID:'+row.file);
   plan.push({key:'gear_medieval_'+row.file.slice(0,-4),
    archive:'medieval-weapons',entry:row.file});
  }
  if(plan.length!==42||new Set(plan.map(p=>p.key)).size!==42)
   throw Error('FOREST_DISTINCT_PLAN_INVALID');
 }
 // [무기 실물 추가] 카이킷 원본 48개는 glTF 메시·BIN·PBR 색상 텍스처 원형 보존.
 let kaykitSource=null;
 if(kaykit){
  const folder=sourceRoot+'/kaykit-weapons';
  const original=await fs.readFile(folder+'/manifest.json');
  kaykitSource=JSON.parse(original.toString('utf8'));
  if(kaykitSource.gameId!=='fantasy-survival'||kaykitSource.license!=='CC0-1.0'
   ||kaykitSource.sourceCount!==48||kaykitSource.models.length!==48
   ||kaykitSource.files.length!==97
   ||kaykitSource.upstreamRevision!=='4376b8becf4218424edaba18c0e43a5989c189f6')
   throw Error('FOREST_KAYKIT_SOURCE_MANIFEST_INVALID');
  for(const row of kaykitSource.files){
   const bytes=await fs.readFile(folder+'/'+row.file);
   if(row.bytes!==bytes.length||crypto.createHash('sha256').update(bytes).digest('hex')!==row.sha256)
    throw Error('FOREST_KAYKIT_SOURCE_DIGEST_MISMATCH:'+row.file);
  }
  expected['kaykit-weapons']=crypto.createHash('sha256').update(original).digest('hex');
  licenseSources['kaykit-weapons']='https://kaylousberg.itch.io/fantasy-weapons-bits';
  plan.length=0;
  for(const file of kaykitSource.models){
   if(!/^[A-Za-z0-9_]+\.gltf$/.test(file))throw Error('FOREST_KAYKIT_UNSAFE_MODEL_NAME');
   plan.push({key:'gear_kaykit_'+file.slice(0,-5),archive:'kaykit-weapons',entry:file});
  }
  if(plan.length!==48||new Set(plan.map(p=>p.key)).size!==48)
   throw Error('FOREST_KAYKIT_48_SOURCE_COUNT_INVALID');
 }
 // [기존 3D 모델 변환] 원본 OBJ/FBX를 Blender에서 그대로 GLB로 내보낸다. 도형 자동 생성 금지.
 const python=[
  'import bpy,os',
  'bpy.ops.object.select_all(action="SELECT")',
  'bpy.ops.object.delete(use_global=False)',
  'p=os.environ["FOREST_GEAR_INPUT"]',
  'if p.lower().endswith(".obj"):',
  '  bpy.ops.wm.obj_import(filepath=p) if hasattr(bpy.ops.wm,"obj_import") else bpy.ops.import_scene.obj(filepath=p)',
  'elif p.lower().endswith(".fbx"):',
  '  bpy.ops.import_scene.fbx(filepath=p)',
  'elif p.lower().endswith(".gltf"): bpy.ops.import_scene.gltf(filepath=p)',
  'else: raise RuntimeError("UNSUPPORTED_FOREST_GEAR_SOURCE")',
  'if not any(o.type=="MESH" for o in bpy.data.objects): raise RuntimeError("FOREST_GEAR_MESH_MISSING")',
  'bpy.ops.export_scene.gltf(filepath=os.environ["FOREST_GEAR_OUTPUT"],export_format="GLB")',
 ].join('\n');
 const modelFiles=new Map();
 for(const item of plan){
  const pack=archiveMap.get(item.archive);
  let binary;
  if(kaykit&&item.archive==='kaykit-weapons'){
   const input=path.join(sourceRoot,'kaykit-weapons',item.entry);
   const output=path.join(temp,item.key+'.glb');
   execFileSync('blender',['--background','--python-expr',python],{
    env:{...process.env,FOREST_GEAR_INPUT:input,FOREST_GEAR_OUTPUT:output},
    timeout:180000,maxBuffer:1024*1024,
   });
   binary=await fs.readFile(output);
  }else if(distinct&&item.archive==='medieval-weapons'){
   binary=await fs.readFile(sourceRoot+'/medieval-weapons/'+item.entry);
   const evidence=medievalSource.files.find(x=>x.file===item.entry);
   if(!evidence||evidence.bytes!==binary.length
    ||crypto.createHash('sha256').update(binary).digest('hex')!==evidence.sha256)
    throw Error('FOREST_DISTINCT_ORIGINAL_MESH_CHANGED:'+item.entry);
  }else if(item.entry.toLowerCase().endsWith('.glb')){
   binary=execFileSync('unzip',['-p',pack.zip,item.entry],{maxBuffer:20*1024*1024});
  }else{
   const folder=path.join(temp,item.archive.replace(/[^a-z0-9_-]/gi,'_'));
   await fs.mkdir(folder,{recursive:true});
   execFileSync('unzip',['-o','-qq',pack.zip,'-d',folder],{maxBuffer:1024*1024});
   const input=path.join(folder,item.entry),output=path.join(temp,item.key+'.glb');
   execFileSync('blender',['--background','--python-expr',python],{
    env:{...process.env,FOREST_GEAR_INPUT:input,FOREST_GEAR_OUTPUT:output},timeout:180000,maxBuffer:1024*1024,
   });
   binary=await fs.readFile(output);
  }
  if(binary.length<1000||binary.length>19*1024*1024||binary.subarray(0,4).toString()!=='glTF')
   throw Error('FOREST_GEAR_INVALID_GLTF:'+item.key);
  modelFiles.set(item.key,{...item,binary,sha256:crypto.createHash('sha256').update(binary).digest('hex')});
 }
 // [등록 증거] 전부 실물과 일치함을 검사한 뒤에만 Roblox 업로드를 시작한다.
 const registry=JSON.parse(await fs.readFile(registryFile,'utf8'));
 if(registry.gameId!=='fantasy-survival')throw Error('FOREST_GEAR_WRONG_GAME');
 const group=(kaykit?registry.gearExpansionV3:distinct?registry.gearExpansionV2:registry.gearExpansionV1)||{version:kaykit?3:distinct?2:1,gameId:'fantasy-survival',universeId:targetUniverse,
  sourceVerified:true,license:'CC0-1.0',sourcePacks:expected,
  licenseSources,modelCount:kaykit?48:distinct?42:20,models:{},nativeRegistrationVerified:false,
  universeUseGrantVerified:false,runtimeVerified:false};
 if(group.gameId!=='fantasy-survival'||group.universeId!==targetUniverse||group.modelCount!==(kaykit?48:distinct?42:20))
  throw Error('FOREST_GEAR_REGISTRY_CONFLICT');
 group.models||={};
 if(kaykit)registry.gearExpansionV3=group;else if(distinct)registry.gearExpansionV2=group;else registry.gearExpansionV1=group;
 const save=()=>fs.writeFile(registryFile,JSON.stringify(registry,null,2)+'\n');
 for(const item of plan){
  const {binary,sha256,archive,entry,key}=modelFiles.get(item.key);
  const prior=group.models[key];
  if(prior&&(prior.sha256!==sha256||prior.archiveEntry!==entry||prior.sourceArchive!==archive
     ||prior.license!=='CC0-1.0'))throw Error('FOREST_GEAR_SOURCE_CHANGED:'+key);
  let id=Number(prior?.assetId||0);
  if(!Number.isSafeInteger(id)||id<1){
   const form=new FormData();
   form.set('request',JSON.stringify({assetType:'Model',displayName:'마력숲 3D 장비 '+key,
    description:'CC0 original '+archive+'#'+entry+' sha256 '+sha256,
    creationContext:{creator:{userId:Number(creator)}}}));
   form.set('fileContent',new Blob([binary],{type:'model/gltf-binary'}),key+'.glb');
   const start=await req('https://apis.roblox.com/assets/v1/assets',{method:'POST',body:form});
   if(!/^operations\/[A-Za-z0-9_/-]+$/.test(String(start.path||'')))
    throw Error('FOREST_GEAR_UPLOAD_OPERATION_INVALID:'+key);
   for(let n=0;n<40;n++){
    await new Promise(resolve=>setTimeout(resolve,1500));
    const result=await req('https://apis.roblox.com/assets/v1/'+start.path);
    if(result.error)throw Error('FOREST_GEAR_UPLOAD_REJECTED:'+key);
    if(result.done){id=Number(result.response?.assetId||result.response?.asset?.assetId||0);break;}
   }
   if(!Number.isSafeInteger(id)||id<1)throw Error('FOREST_GEAR_UPLOAD_TIMEOUT:'+key);
  }
  group.models[key]={assetId:id,sha256,sourceArchive:archive,sourceArchiveSha256:expected[archive],
   archiveEntry:entry,license:'CC0-1.0',licenseEvidence:licenseSources[archive],
   universeId:targetUniverse,sourceVerified:true,nativeRegistrationVerified:true,
   universeUseGrantVerified:prior?.universeUseGrantVerified===true||false,runtimeVerified:false};
  await save(); // 외부 업로드 후 작업이 끊겨도 이미 얻은 ID를 기록한다.
  if(!group.models[key].universeUseGrantVerified){
   const grant=await req('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
    method:'PATCH',headers:{'content-type':'application/json'},
    body:JSON.stringify({subjectType:'Universe',subjectId:targetUniverse,action:'Use',
     requests:[{assetId:id,grantToDependencies:true}]}),
   });
   if(Array.isArray(grant.errors)&&grant.errors.length)
    throw Error('FOREST_GEAR_USE_PERMISSION_DENIED:'+key);
   group.models[key].universeUseGrantVerified=true;
   await save();
  }
  console.log((kaykit?'FOREST_KAYKIT_NATIVE_MODEL=':distinct?'FOREST_DISTINCT_NATIVE_MODEL=':'FOREST_GEAR_REGISTERED_AND_GRANTED=')+key+':'+id);
 }
 const valid=plan.every(({key})=>group.models[key]?.nativeRegistrationVerified===true
  &&group.models[key]?.universeUseGrantVerified===true
  &&Number.isSafeInteger(group.models[key].assetId)&&group.models[key].assetId>0);
 if(!valid)throw Error('FOREST_GEAR_PROOF_INCOMPLETE');
 const lua=await fs.readFile(idsFile,'utf8');
 const extra=[];
 for(const {key} of plan){
  const id=group.models[key].assetId;
  const regex=new RegExp('^\\s*'+key+'\\s*=\\s*(\\d+)\\s*,?\\s*$','m');
  const found=lua.match(regex);
  if(found&&Number(found[1])!==id)throw Error('FOREST_GEAR_PREVIOUS_ID_MISMATCH:'+key);
  if(!found)extra.push(' '+key+'='+id+',');
 }
 if(!/}\s*$/.test(lua))throw Error('FOREST_GEAR_ASSET_IDS_FORMAT_INVALID');
 const merged=lua.replace(/}\s*$/,extra.join('\n')+(extra.length?'\n':'')+'}\n');
 group.nativeRegistrationVerified=true;
 group.universeUseGrantVerified=true;
 group.status='REGISTERED_AND_UNIVERSE_USE_GRANTED_PENDING_RUNTIME';
 await fs.writeFile(idsFile,merged);
 await save();
 console.log((kaykit?'FOREST_KAYKIT_MODELS_REGISTERED=':distinct?'FOREST_DISTINCT_MODELS_REGISTERED=':'FOREST_GEAR_ALL_REGISTERED=')+plan.length+' UNIVERSE='+targetUniverse);
 process.exit(0);
}

const provenance=JSON.parse(await fs.readFile(path.join(dir,'provenance.json'),'utf8'));
const manifestBytes=fantasy?await fs.readFile('roblox-games/fantasy-survival/native-assets.json'):null;
const manifest=fantasy?JSON.parse(manifestBytes):null;
const oldRegistry=fantasy?JSON.parse(await fs.readFile('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8').catch(()=>'{"models":{}}')):null;
const villageRows=fantasy&&oldRegistry.villagePrefabs?.sourceVerified===true
 ?oldRegistry.villagePrefabs.models||{}:{};
// [게임 원본 의상] 기존 네이티브 에셋 등록기가 프로젝트 소유 망토 하나를 추가 검증한다.
const capeRow=fantasy&&oldRegistry.capePrefab?.sourceVerified===true?oldRegistry.capePrefab:null;
const names=fantasy?[...Object.keys(manifest.models),...Object.keys(villageRows),...(capeRow?['wornCape']:[])]
 :['sparrow','ant','beetle','wolf','turtle','slime','golem','dragon','home','gate','tree','rock'];
if(fantasy&&(manifest.gameId!=='fantasy-survival'||manifest.ownerApproved!==true||manifest.license!=='CC0-1.0'
 ||Object.keys(manifest.models||{}).sort().join(',')!=='bat,bee,boar,deer,golem,mushroom,rabbit,ruin,skeleton,tree,wolf'
 ||provenance.gameId!=='fantasy-survival'||provenance.sourceManifestSha256!==crypto.createHash('sha256').update(manifestBytes).digest('hex')))throw Error('FANTASY_NATIVE_APPROVAL_OR_MANIFEST_MISMATCH');
if(provenance.version!==(fantasy?5:4)||!provenance.roles||Object.keys(provenance.roles).sort().join(',')!==[...names].sort().join(','))throw Error('CC0_PROVENANCE_ROLES_MISMATCH');
const ids={};const records={};const verifiedModels=new Map();
for(const name of names){
 const originSource=fantasy?(manifest.models[name]||villageRows[name]||(name==='wornCape'?capeRow:null)):null;
 // [대체 돌우물] 첫 다운로드 원본은 기존 24종 등록기의 provenance SHA와 실제 원본 파일로만 승인한다.
 const wellReplacement=fantasy&&name==='villageWell'
   &&provenance.roles[name]?.sourceFile==='assets/shared/party/village-well.glb'
   &&provenance.roles[name]?.licenseEvidence==='https://www.innerscene.com/tools/library/3d-parts/low-poly-medieval-well-7f4acee5';
 const legacyWellPending=wellReplacement&&originSource?.sourceFile==='assets/external/simple-rpg/kenney_fantasy-town-kit_2.0.zip'
   &&originSource?.assetId==null
   &&originSource?.sourceSha256==='1a7530c09f4d2fa2cdee259876f089334f8b1f27fa86a0c4f54ef86cdd8676ef';
 const registeredWell=wellReplacement&&originSource?.sourceFile==='assets/shared/party/village-well.glb'
   &&originSource?.sourceSha256===provenance.roles[name].sourceSha256
   &&originSource?.licenseEvidence===provenance.roles[name].licenseEvidence;
 const verifiedOrigin=wellReplacement
   &&(legacyWellPending||registeredWell)
   &&crypto.createHash('sha256').update(await fs.readFile('assets/shared/party/village-well.glb')).digest('hex')===provenance.roles[name].sourceSha256;
 const extension=fantasy?(provenance.roles[name]?.format||path.extname(originSource?.sourcePath||originSource?.sourceFile||originSource?.archiveEntry||'').slice(1)).toLowerCase():'glb';
 if(fantasy&&!['fbx','glb'].includes(extension))throw Error('FANTASY_UNSUPPORTED_NATIVE_FORMAT:'+name);
 const file=path.join(dir,name+'.'+extension);
 const bytes=await fs.readFile(file);
 if(bytes.length<1000||bytes.length>18*1024*1024||(extension==='fbx'?!bytes.subarray(0,18).toString().startsWith('Kaydara FBX Binary'):bytes.subarray(0,4).toString()!=='glTF'))throw Error('BAD_NATIVE_MODEL:'+name);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const origin=provenance.roles[name];
 const ownerCape=fantasy&&name==='wornCape'
 &&origin?.license==='PROJECT_ORIGINAL'&&originSource?.license==='PROJECT_ORIGINAL'
 &&origin.hemTearCount===4&&originSource.hemTearCount===4
 &&origin.clothBones===3&&originSource.clothBones===3
 &&origin.length==='HIP_LENGTH'&&originSource.length==='HIP_LENGTH'
 &&origin.sourceFile==='roblox-games/fantasy-survival/assets/worn-cape.obj'
 &&originSource.parentSourceGitBlob==='6a011e694414ae3a5ef03d348158fdfbef9da93a'
 &&crypto.createHash('sha256').update(await fs.readFile(origin.sourceFile)).digest('hex')===origin.sourceSha256;
 const validLicense=origin?.license==='CC0-1.0'||ownerCape;
 if(!origin||(fantasy?origin.sha256!==digest||(!verifiedOrigin&&(originSource?.sourceSha256!==origin.sourceSha256||origin.licenseEvidence!==originSource?.licenseEvidence)):origin.glbSha256!==digest)||!validLicense||!/^https:\/\//.test(origin.licenseEvidence||'')||!(/^[a-f0-9]{64}$/).test(origin.sourceSha256||'')||(!fantasy&&(!Number.isInteger(origin.modelPolygons)||origin.modelPolygons<4))){throw Error((name==='wornCape'?'OWNER_ORIGINAL_SOURCE_HASH_UNVERIFIED:':'CC0_SOURCE_LICENSE_OR_HASH_UNVERIFIED:')+name);}
 verifiedModels.set(name,{bytes,digest,origin,extension});
}
// Validate every original before the first irreversible Model registration.
// Keep existing authorized IDs instead of reuploading the seven deployed originals.
for(const name of names){
 const {bytes,digest,origin,extension}=verifiedModels.get(name);
 const ownerCape=fantasy&&name==='wornCape'&&origin.license==='PROJECT_ORIGINAL';
 const prior=oldRegistry?.models?.[name]||villageRows[name]||(name==='wornCape'?oldRegistry?.capePrefab:null);
 if(prior&&Number.isSafeInteger(prior.assetId)&&prior.assetId>0
   &&prior.sourceSha256===origin.sourceSha256&&prior.sha256===digest
   &&prior.license===origin.license&&prior.licenseEvidence===origin.licenseEvidence){
   ids[name]=prior.assetId;
   records[name]=prior;
   console.log('FANTASY_NATIVE_MODEL_REUSED='+name+':'+prior.assetId);
   continue;
 }
 const form=new FormData();
 form.set('request',JSON.stringify({assetType:'Model',displayName:(fantasy?'마력숲 생존기':'백수대전쟁')+' 3D '+name,
  description:(origin.license==='PROJECT_ORIGINAL'?'Game owner original authored cape':'Licensed CC0 original 3D asset')+' for '+(fantasy?'fantasy-survival':'baeksu-war')+'. Source sha256 '+origin.sourceSha256+'. Model sha256 '+digest,
  creationContext:{creator:{userId:Number(creator)}}}));
 form.set('fileContent',new Blob([bytes],{type:extension==='fbx'?'model/fbx':'model/gltf-binary'}),name+'.'+extension);
 const op=await req('https://apis.roblox.com/assets/v1/assets',{method:'POST',body:form});
 if(!/^operations\/[a-zA-Z0-9_/-]+$/.test(op.path||''))throw Error('ASSET_UPLOAD_NO_OPERATION:'+name);
 let id=null;
 for(let i=0;i<40;i++){
  await new Promise(r=>setTimeout(r,1400));
  const info=await req('https://apis.roblox.com/assets/v1/'+op.path);
  if(info.error)throw Error('UPLOAD_FAILED:'+name+':'+JSON.stringify(info.error).slice(0,240));
  if(info.done){id=Number(info.response?.assetId??info.response?.asset?.assetId);break;}
 }
 if(!Number.isSafeInteger(id)||id<1)throw Error('ASSET_ID_INVALID:'+name);
 if(!fantasy){
 const grant=await req('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
  method:'PATCH',headers:{'content-type':'application/json'},
  body:JSON.stringify({subjectType:'Universe',subjectId:UNIVERSE,action:'Use',
    requests:[{assetId:id,grantToDependencies:true}]})
 });
 if(Array.isArray(grant.errors)&&grant.errors.length)throw Error('UNIVERSE_GRANT_FAILED:'+name+':'+JSON.stringify(grant.errors).slice(0,300));
 }
 ids[name]=id;records[name]={assetId:id,sha256:digest,source:ownerCape?'VERIFIED_OWNER_ORIGINAL':'VERIFIED_CC0_ORIGINAL',sourceFile:origin.sourceFile,sourceSha256:origin.sourceSha256,sourceModel:origin.sourceModel,license:origin.license,licenseEvidence:origin.licenseEvidence,universeId:fantasy?null:UNIVERSE,...(ownerCape?{hemTearCount:4}:{} )};
 console.log((fantasy?'FANTASY_NATIVE_MODEL_REGISTERED=':'BAEKSU_WAR_CC0_MESH_GRANTED=')+name+':'+id);
 await fs.writeFile(receipt,JSON.stringify({version:fantasy?5:4,gameId:fantasy?'fantasy-survival':'baeksu-war',universeId:fantasy?null:UNIVERSE,placeId:fantasy?null:PLACE,models:records},null,2)+'\n');
}
const lua=[
 '-- V4: source-verified CC0 real-model IDs, with baeksu-war Universe permissions.',
 '-- DO NOT substitute procedural Part geometry if an asset is missing.',
 'return {',
 ...names.map(name=>' '+name+'='+ids[name]+','),
 '}',
 ''
].join('\n');
await fs.writeFile('roblox-games/'+(fantasy?'fantasy-survival':'baeksu-war')+'/shared/VisualAssetIds.luau',fantasy?lua.replace('-- V4: source-verified CC0 real-model IDs, with baeksu-war Universe permissions.','-- Source-verified original CC0 FBX/GLB models. Exact Universe grant is required by canonical publishing.'):lua);
if(fantasy){
 const core={};
 const village={};
 let registeredCape=null;
 for(const [role,row] of Object.entries(records)){
   if(Object.prototype.hasOwnProperty.call(manifest.models,role))core[role]=row;
   else if(Object.prototype.hasOwnProperty.call(villageRows,role))village[role]=row;
   else if(role==='wornCape'&&capeRow)registeredCape=row;
   else throw Error('FOREST_UNEXPECTED_ASSET_ROLE:'+role);
 }
 const villagePrefabs=oldRegistry.villagePrefabs&&Object.keys(villageRows).length>0
   ?{...oldRegistry.villagePrefabs,models:village,registrationVerified:Object.keys(village).length===Object.keys(villageRows).length,
     status:'REGISTERED_PENDING_EXACT_UNIVERSE_GRANT',runtimeVerified:false}
   :oldRegistry.villagePrefabs;
 await fs.writeFile('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json',
  JSON.stringify({...oldRegistry,version:2,gameId:'fantasy-survival',nativeRegistrationVersion:1,
   registrationVerified:true,sourceManifestSha256:provenance.sourceManifestSha256,
   grantRequiredAtPublish:true,runtimeVerified:false,models:core,villagePrefabs,
   ...(registeredCape?{capePrefab:{...capeRow,...registeredCape,registrationVerified:true,status:'REGISTERED_PENDING_EXACT_UNIVERSE_GRANT',runtimeVerified:false}}:{})},null,2)+'\n');
}
console.log((fantasy?'FANTASY_NATIVE_REGISTERED_MODELS=':'BAEKSU_WAR_VERIFIED_CC0_MODELS=')+names.length);
