import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const clean=value=>String(value??'').trim();

export function unitySourceTreeSha256(root){
  if(!fs.existsSync(root))return null;
  const files=[];
  const walk=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      const rel=path.relative(root,full).replaceAll('\\','/');
      if(entry.isDirectory()){
        if(rel==='Library'||rel.startsWith('Library/')||rel==='Temp'||rel.startsWith('Temp/'))continue;
        walk(full);
      }else if(entry.isFile())files.push(rel);
    }
  };
  walk(root);files.sort();
  const hash=crypto.createHash('sha256');
  for(const rel of files){
    hash.update(rel);hash.update('\0');hash.update(fs.readFileSync(path.join(root,rel)));hash.update('\0');
  }
  return hash.digest('hex');
}

export function discoverUnityWebBuildMethod(repoRoot,gameId){
  const editor=path.join(repoRoot,'unity-games',gameId,'Assets','Editor');
  if(!fs.existsSync(editor))return null;
  const files=[];
  const walk=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);
      else if(entry.isFile()&&entry.name.endsWith('.cs'))files.push(full);
    }
  };
  walk(editor);
  const methods=[];
  for(const file of files){
    const source=fs.readFileSync(file,'utf8');
    if(!/public\s+static\s+void\s+BuildWeb\s*\(/.test(source))continue;
    const namespaceName=source.match(/\bnamespace\s+([A-Za-z_][A-Za-z0-9_.]*)/)?.[1]||'';
    const classes=[...source.matchAll(/(?:public\s+)?static\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map(m=>m[1]);
    if(classes.length===1)methods.push([namespaceName,classes[0],'BuildWeb'].filter(Boolean).join('.'));
  }
  const unique=[...new Set(methods)];
  return unique.length===1?unique[0]:null;
}

export function nativeUpperPlatformAlreadyStarted(item={}){
  const robloxSourceBound=Boolean(clean(item.robloxSourceCommit))&&Boolean(item.robloxSourceBootstrapPassedAt);
  const unitySourceBound=Boolean(clean(item.unitySourceCommit))&&Boolean(item.unitySourceBootstrapPassedAt);
  if(robloxSourceBound||item.robloxBuildOrPackagePassed===true||item.robloxFoundationF0Passed===true||item.robloxRuntimeCandidateEvidence?.published===true||item.robloxInternalReleasePublished===true)return true;
  if(unitySourceBound||item.unityBuildOrPackagePassed===true||item.unityBuildPassed===true||item.unityRuntimePassed===true||item.unityIndependentQaPassed===true||item.unityRegressionPassed===true)return true;
  return false;
}

export function readUpperPlatformReadiness(repoRoot,gameId){
  const file=path.join(repoRoot,'web-games',gameId,'upper-platform-development-readiness.json');
  if(!fs.existsSync(file))return{pass:false,reason:'READINESS_EVIDENCE_MISSING'};
  let data;
  try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return{pass:false,reason:'READINESS_EVIDENCE_INVALID_JSON'};}
  const currentTree=unitySourceTreeSha256(path.join(repoRoot,'unity-games',gameId));
  const requiredDomains=['design','code','graphics','webglBuild','actualPlay','qa','portability'];
  if(data.pass!==true||data.state!=='UPPER_PLATFORM_DEVELOPMENT_READY')return{pass:false,reason:'READINESS_NOT_PASS',data,currentTree};
  if(requiredDomains.some(key=>data.criteria?.[key]?.pass!==true))return{pass:false,reason:'READINESS_CRITERIA_INCOMPLETE',data,currentTree};
  if(!currentTree||data.unitySourceTreeSha256!==currentTree)return{pass:false,reason:'READINESS_SOURCE_STALE',data,currentTree};
  if(data.releaseOrDeploymentAuthority!==false)return{pass:false,reason:'READINESS_RELEASE_AUTHORITY_INVALID',data,currentTree};
  // 기존의 2D/2.5D 검증 기록은 3D 전용 정책이 적용된 새 런타임 증거가 아니다.
  const graphics=data.criteria?.graphics||{};
  const native3dChecks=Array.isArray(graphics.native3dChecks)?graphics.native3dChecks:[];
  const requiredProofStages=['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'];
  const native3dEvidencePass=graphics.native3dVerified===true
    &&graphics.requiredDimension==='3D'
    &&native3dChecks.length===requiredProofStages.length
    &&native3dChecks.every((proof,index)=>
      proof?.stage===requiredProofStages[index]&&proof.pass===true
      &&proof.requiredDimension==='3D'
      &&proof.source==='UNITY_RUNTIME_MESH_FILTER_TRIANGLE_AND_3AXIS_WORLD_DEPTH_PROOF'
      &&Number.isSafeInteger(proof.observedMeshCount)&&proof.observedMeshCount>0
      &&Number.isSafeInteger(proof.observedTriangles)&&proof.observedTriangles>0
      &&proof.depthPass===true&&proof.perspectiveCamera===true
      &&Number.isSafeInteger(proof.worldMeshes3d)&&proof.worldMeshes3d>=2
      &&Number.isSafeInteger(proof.worldDepthCm)&&proof.worldDepthCm>=50
      &&Number.isSafeInteger(proof.gameplayActors3d)&&proof.gameplayActors3d>=1
      &&proof.spriteGameplayActors===0);
  if(!native3dEvidencePass)return{pass:false,reason:'READINESS_NATIVE_3D_MESH_EVIDENCE_REQUIRED',data,currentTree};
  return{pass:true,reason:'READY',data,currentTree};
}

export function classifyUpperPlatformAdmission(item,{repoRoot='.',grandfatherGameIds=[]}={}){
  const gameId=clean(item?.gameId);
  if(!gameId)throw new Error('UPPER_PLATFORM_GAME_ID_REQUIRED');
  if(item.minimumDesignContract?.pass!==true)return{gameId,state:'BLOCKED',reason:'MINIMUM_DESIGN_CONTRACT_REQUIRED'};
  const profiles=item.platformDesignProfiles||{};
  if(!profiles.ROBLOX?.source||!profiles.UNITY?.source)return{gameId,state:'BLOCKED',reason:'DUAL_PLATFORM_DESIGN_PROFILE_REQUIRED'};
  const targets=new Set(item.concurrentTargetPlatforms||[]);
  if(!targets.has('ROBLOX')||!targets.has('UNITY'))return{gameId,state:'BLOCKED',reason:'DUAL_NATIVE_TARGETS_REQUIRED'};
  const nativeStarted=nativeUpperPlatformAlreadyStarted(item);
  const grandfathered=new Set((Array.isArray(grandfatherGameIds)?grandfatherGameIds:[]).map(clean));
  const readiness=readUpperPlatformReadiness(repoRoot,gameId);
  const method=readiness.pass?null:discoverUnityWebBuildMethod(repoRoot,gameId);
  const web=readiness.pass?{state:'UNITY_WEB_VERIFIED',reason:'CURRENT_UNITY_WEB_QA_VERIFIED',readiness}
    :method?{state:'UNITY_WEB_FLOOR',reason:readiness.reason,buildMethod:method}
    :fs.existsSync(path.join(repoRoot,'unity-games',gameId))?{state:'UNITY_WEB_SOURCE_REPAIR',reason:'EXISTING_UNITY_SOURCE_REPAIR_REQUIRED'}
    :{state:'UNITY_WEB_BOOTSTRAP',reason:readiness.reason+':CANONICAL_UNITY_WEB_SOURCE_REQUIRED'};
  return{gameId,state:'UPPER_PLATFORM',reason:'MINIMUM_DESIGN_READY',grandfathered:nativeStarted,
    grandfatherSource:nativeStarted?(grandfathered.has(gameId)?'EXPLICIT_MIGRATION_LIST':'DURABLE_NATIVE_PROGRESS_EVIDENCE'):null,web};
}
