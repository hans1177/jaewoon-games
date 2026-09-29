// 파일명: tools/company-unity-web-first-stage.mjs

import fs from 'node:fs';
import path from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{
  const m=v.match(/^--([^=]+)=(.*)$/);
  return m?[m[1],m[2]]:[v.replace(/^--/,''),'true'];
}));

const gameId=String(args['game-id']||'').trim();
const sourceRoot=String(args['source-root']||`unity-games/${gameId}`).replaceAll('\\','/').replace(/\/$/,'');
const requestPath=String(args.request||`.build-requests/unity-web/${gameId}.json`).replaceAll('\\','/');
const sourceCommit=String(args['source-commit']||process.env.GITHUB_SHA||'').trim();
const buildMethod=String(args['build-method']||'SeedAndroidBuild.BuildWeb').trim();

if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`INVALID_GAME_ID:${gameId}`);
if(sourceRoot!==`unity-games/${gameId}`)throw new Error(`UNITY_WEB_CANONICAL_SOURCE_REQUIRED:${sourceRoot}`);
if(!/^\.build-requests\/unity-web\/[A-Za-z0-9._-]+\.json$/.test(requestPath)||requestPath.includes('..'))throw new Error(`INVALID_REQUEST_PATH:${requestPath}`);
if(!/^[A-Za-z0-9_.]+$/.test(buildMethod))throw new Error(`INVALID_BUILD_METHOD:${buildMethod}`);

const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const contract=policy?.unityWebFirstStage;
if(contract?.status!=='OWNER_DIRECT_LOCKED'||contract?.scope!=='UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR'||contract?.enabled!==true||contract?.developmentAdmissionAuthority!==true||contract?.validationSurfaceOnly!==false)throw new Error('UNITY_WEB_DEVELOPMENT_FLOOR_POLICY_MISSING');
if(contract?.canonicalGameSourceRoot!=='unity-games/<gameId>/'||contract?.publicWebBuildRoot!=='web-games/<gameId>/')throw new Error('UNITY_WEB_SOURCE_BUILD_BOUNDARY_MISMATCH');
if(contract?.upperPlatformDevelopmentReadinessGate!=='company-learning/platform-release-roadmap.json#directNativeDualPlatformDevelopment.upperPlatformDevelopmentReadinessGate')throw new Error('UPPER_PLATFORM_READINESS_GATE_BINDING_REQUIRED');

const required=[
  `${sourceRoot}/Assets`,
  `${sourceRoot}/Packages/manifest.json`,
  `${sourceRoot}/ProjectSettings/ProjectVersion.txt`,
];
for(const item of required){
  if(!fs.existsSync(item))throw new Error(`UNITY_WEB_SOURCE_MISSING:${item}`);
}
const scriptsRoot=path.join(sourceRoot,'Assets','Scripts');
if(!fs.existsSync(scriptsRoot))throw new Error(`UNITY_WEB_SOURCE_MISSING:${scriptsRoot}`);
const scriptFiles=[];
const walk=dir=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()&&entry.name.endsWith('.cs'))scriptFiles.push(full.replaceAll('\\','/'));
  }
};
walk(scriptsRoot);
if(scriptFiles.length===0)throw new Error('UNITY_WEB_CSHARP_SOURCE_REQUIRED');

const editorRoot=path.join(sourceRoot,'Assets','Editor');
const editorFiles=[];
if(fs.existsSync(editorRoot)){
  const walkEditor=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walkEditor(full);
      else if(entry.isFile()&&entry.name.endsWith('.cs'))editorFiles.push(full.replaceAll('\\','/'));
    }
  };
  walkEditor(editorRoot);
}
const methodName=buildMethod.split('.').pop();
const methodOwner=buildMethod.split('.').slice(0,-1).pop();
const methodPattern=new RegExp(`(?:class|static\\s+class)\\s+${methodOwner.replace(/[.*+?^${\}()|[\]\\]/g,'\\$&')}[\\s\\S]*?\\b${methodName.replace(/[.*+?^${\}()|[\]\\]/g,'\\$&')}\\s*\\(`);
const buildMethodPresent=editorFiles.some(file=>methodPattern.test(fs.readFileSync(file,'utf8')));
if(!buildMethodPresent)throw new Error(`UNITY_WEB_BUILD_METHOD_NOT_FOUND:${buildMethod}`);

const primitiveSignals=[];
for(const file of scriptFiles){
  const text=fs.readFileSync(file,'utf8');
  if(/GameObject\.CreatePrimitive\s*\(/.test(text))primitiveSignals.push(file);
}
const metadataPath=path.join(sourceRoot,'prototype-source.json');
if(fs.existsSync(metadataPath)){
  try{
    const meta=JSON.parse(fs.readFileSync(metadataPath,'utf8'));
    if(String(meta?.purpose||'').includes('TECHNICAL_VALIDATION')||String(meta?.purpose||'').includes('TECHNICAL_PROTOTYPE')){
      throw new Error('UNITY_WEB_TECHNICAL_PROTOTYPE_CANNOT_BE_CANONICAL_FIRST_STAGE');
    }
  }catch(error){
    if(String(error?.message||'').startsWith('UNITY_WEB_TECHNICAL_PROTOTYPE'))throw error;
  }
}

fs.mkdirSync(path.dirname(requestPath),{recursive:true});
const request={
  version:1,
  kind:'UNITY_WEB_DEVELOPMENT_FLOOR_BUILD',
  gameId,
  projectPath:sourceRoot,
  buildMethod,
  sourceCommit:sourceCommit||null,
  outputRoot:`web-games/${gameId}`,
  canonicalSource:true,
  legacyWebFallbackAllowedDuringMigration:false,
  primitiveSignals,
  primitiveSignalsAreDebugReviewOnly:true,
  fullGameplayPassAuthority:false,
  requestEvidenceOnly:true,
  nativeGateAuthority:false,
  developmentAdmissionAuthority:false,
  upperPlatformReadinessRequired:true,
  upperPlatformReadinessEvidence:`web-games/${gameId}/upper-platform-development-readiness.json`,
  releaseAuthority:false,
  homepageTestSurface:true,
  postGateAction:'EVALUATE_UPPER_PLATFORM_DEVELOPMENT_READY_THEN_START_ROBLOX_UNITY',
};
fs.writeFileSync(requestPath,JSON.stringify(request,null,2)+'\n');

console.log(`UNITY_WEB_GAME_ID=${gameId}`);
console.log(`UNITY_WEB_CANONICAL_SOURCE=${sourceRoot}`);
console.log(`UNITY_WEB_REQUEST=${requestPath}`);
console.log(`UNITY_WEB_CSHARP_FILES=${scriptFiles.length}`);
console.log(`UNITY_WEB_BUILD_METHOD=${buildMethod}`);
console.log(`UNITY_WEB_PRIMITIVE_SIGNALS=${primitiveSignals.length}`);
console.log('UNITY_WEB_REQUEST_STATUS=READY');
