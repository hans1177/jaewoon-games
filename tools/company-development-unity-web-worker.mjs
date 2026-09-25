// 파일명: tools/company-development-unity-web-worker.mjs
// 역할: DEVELOPMENT_CONFIRMED Unity Web development-floor의 호환 준비/child 결과를 판정한다. 상위 플랫폼 진입 권한은 main-bound readiness evidence에만 있다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args=Object.fromEntries(process.argv.slice(3).map(raw=>{
  const m=raw.match(/^--([^=]+)=(.*)$/);
  return m?[m[1],m[2]]:[raw.replace(/^--/,''),'true'];
}));
const mode=String(process.argv[2]||'').trim();
const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const sha256File=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'game';
const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const contract=policy?.unityWebFirstStage;
if(contract?.status!=='OWNER_DIRECT_LOCKED'||contract?.scope!=='UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR'||contract?.enabled!==true||contract?.developmentAdmissionAuthority!==true||contract?.validationSurfaceOnly!==false)throw new Error('UNITY_WEB_DEVELOPMENT_FLOOR_POLICY_MISSING');
if(contract?.canonicalGameSourceRoot!=='unity-games/<gameId>/'||contract?.publicWebBuildRoot!=='web-games/<gameId>/')throw new Error('UNITY_WEB_SOURCE_BUILD_BOUNDARY_MISMATCH');
if(contract?.upperPlatformDevelopmentReadinessGate!=='company-learning/platform-release-roadmap.json#directNativeDualPlatformDevelopment.upperPlatformDevelopmentReadinessGate')throw new Error('UPPER_PLATFORM_READINESS_GATE_BINDING_REQUIRED');

function discoverBuildMethod(sourceRoot){
  const editorRoot=path.join(sourceRoot,'Assets','Editor');
  const files=[];
  const walk=dir=>{
    if(!fs.existsSync(dir))return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);
      else if(entry.isFile()&&entry.name.endsWith('.cs'))files.push(full);
    }
  };
  walk(editorRoot);
  const methods=[];
  for(const file of files){
    const text=fs.readFileSync(file,'utf8');
    if(!/\bpublic\s+static\s+void\s+BuildWeb\s*\(/.test(text))continue;
    const namespaceName=text.match(/\bnamespace\s+([A-Za-z_][A-Za-z0-9_.]*)/)?.[1]||'';
    const before=text.slice(0,text.search(/\bpublic\s+static\s+void\s+BuildWeb\s*\(/));
    const classes=[...before.matchAll(/\b(?:public\s+)?(?:static\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/g)];
    const className=classes.at(-1)?.[1]||'';
    if(className)methods.push([namespaceName,className,'BuildWeb'].filter(Boolean).join('.'));
  }
  return [...new Set(methods)];
}
function projectReady(sourceRoot){
  return fs.existsSync(path.join(sourceRoot,'ProjectSettings','ProjectVersion.txt'))
    &&fs.existsSync(path.join(sourceRoot,'Packages','manifest.json'))
    &&fs.existsSync(path.join(sourceRoot,'Assets','Scripts'));
}
function sourceTreeSha(sourceRoot){
  try{return clean(execFileSync('git',['rev-parse',`HEAD:${sourceRoot}`],{encoding:'utf8'}));}catch{return'';}
}
function findFiles(root){
  const rows=[];
  const walk=dir=>{
    if(!fs.existsSync(dir))return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);else if(entry.isFile())rows.push(full);
    }
  };
  walk(root);
  return rows;
}
function deployableUnityWebBundle(files,gameId){
  const marker=`/web-games/${gameId}/Build/`;
  const rows=files.map(file=>({file,normalized:file.replaceAll('\\','/')})).filter(row=>row.normalized.includes(marker));
  const groups={
    loader:rows.filter(row=>/\.loader\.js$/.test(row.normalized)),
    data:rows.filter(row=>/\.data(?:\.|$)/.test(row.normalized)),
    framework:rows.filter(row=>/\.framework\.js(?:\.|$)/.test(row.normalized)),
    wasm:rows.filter(row=>/\.wasm(?:\.|$)/.test(row.normalized)),
  };
  const missing=Object.entries(groups).filter(([,items])=>items.length===0).map(([name])=>name);
  const oversized=rows.filter(row=>fs.statSync(row.file).size>25*1024*1024).map(row=>path.basename(row.file));
  return{
    pass:missing.length===0&&oversized.length===0,
    missing,
    oversized,
    files:rows.map(row=>({path:row.normalized.slice(row.normalized.indexOf(marker)+1),bytes:fs.statSync(row.file).size}))
  };
}
function failureResult({gameId,sourceRoot,baselineSha='',sourceTree='',buildRunId=null,reason}){
  const stamp=new Date().toISOString();
  return{
    gameId,pass:false,update:{
      unityWebValidationSurfacePassed:false,
      unityWebValidationSurfacePassedAt:null,
      unityWebValidationSurfaceEvidencePath:null,
      unityWebValidationSurfaceBuildRunId:buildRunId,
      unityWebValidationSurfaceSourceTreeSha:sourceTree||null,
      unityWebValidationSurfaceDesignBaselineSha256:baselineSha||null,
      unityWebValidationSurfaceFailureReason:reason,
      unityWebTestAvailable:false,
      unityWebTestUrl:null,
      webValidationRequired:false,
      unityWebValidationSurfaceLastAttemptAt:stamp,
      updatedAt:stamp
    }
  };
}

if(mode==='prepare'){
  const gameId=clean(args['game-id']);
  const sourceRoot=posix(args['source-root']||`unity-games/${gameId}`);
  const baselineFile=posix(args.baseline||'');
  const output=clean(args.output);
  const sourceCommit=clean(args['source-commit']||process.env.GITHUB_SHA||'');
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`INVALID_GAME_ID:${gameId}`);
  if(sourceRoot!==`unity-games/${gameId}`)throw new Error(`UNITY_WEB_CANONICAL_SOURCE_REQUIRED:${sourceRoot}`);
  const sourceTree=sourceTreeSha(sourceRoot);
  const baselineSha=baselineFile&&fs.existsSync(baselineFile)?sha256File(baselineFile):'';
  if(!projectReady(sourceRoot)){
    writeJson(output,{version:1,gameId,ready:false,reason:'UNITY_WEB_CANONICAL_SOURCE_MISSING',sourceRoot,sourceTreeSha:sourceTree||null,designBaselineSha256:baselineSha||null});
    process.exit(0);
  }
  if(!baselineSha){
    writeJson(output,{version:1,gameId,ready:false,reason:'UNITY_WEB_DESIGN_BASELINE_MISSING',sourceRoot,sourceTreeSha:sourceTree||null,designBaselineSha256:null});
    process.exit(0);
  }
  if(!sourceTree){
    writeJson(output,{version:1,gameId,ready:false,reason:'UNITY_WEB_SOURCE_TREE_MISSING',sourceRoot,sourceTreeSha:null,designBaselineSha256:baselineSha});
    process.exit(0);
  }
  const methods=discoverBuildMethod(sourceRoot);
  if(methods.length!==1){
    writeJson(output,{version:1,gameId,ready:false,reason:`UNITY_WEB_BUILD_METHOD_COUNT:${methods.length}`,sourceRoot,sourceTreeSha:sourceTree,designBaselineSha256:baselineSha,buildMethods:methods});
    process.exit(0);
  }
  const requestPath=`.build-requests/unity-web/${gameId}.runtime.json`;
  try{
    execFileSync(process.execPath,[
      'tools/company-unity-web-first-stage.mjs',
      `--game-id=${gameId}`,
      `--source-root=${sourceRoot}`,
      `--build-method=${methods[0]}`,
      `--source-commit=${sourceCommit}`,
      `--request=${requestPath}`
    ],{stdio:'pipe',encoding:'utf8'});
  }catch(error){
    const detail=clean(error?.stderr||error?.stdout||error?.message||error).replace(/\s+/g,' ').slice(0,300);
    writeJson(output,{version:1,gameId,ready:false,reason:`UNITY_WEB_SOURCE_PREFLIGHT_FAILED:${detail}`,sourceRoot,sourceTreeSha:sourceTree,designBaselineSha256:baselineSha,buildMethod:methods[0]});
    process.exit(0);
  }
  writeJson(output,{version:1,gameId,ready:true,reason:'READY',sourceRoot,sourceTreeSha:sourceTree,designBaselineSha256:baselineSha,buildMethod:methods[0],sourceCommit});
  console.log(`UNITY_WEB_RUNTIME_PREPARE=PASS:${gameId}:${methods[0]}`);
  process.exit(0);
}

if(mode==='result'){
  const gameId=clean(args['game-id']);
  const sourceRoot=posix(args['source-root']||`unity-games/${gameId}`);
  const baselineFile=posix(args.baseline||'');
  const baselineSource=posix(args['baseline-source']||baselineFile);
  const sourceTree=clean(args['source-tree']);
  const childRoot=clean(args['child-root']);
  const outputRoot=clean(args['output-root']||'/tmp/web-worker');
  const buildRunId=Number(args['build-run-id']||0)||null;
  const explicitFailure=clean(args.failure);
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`INVALID_GAME_ID:${gameId}`);
  const baselineSha=baselineFile&&fs.existsSync(baselineFile)?sha256File(baselineFile):'';
  let result;
  const persistRoot=path.join(outputRoot,'persist');
  const publicRoot=path.join(outputRoot,'public');
  const resultsRoot=path.join(outputRoot,'results');
  fs.rmSync(outputRoot,{recursive:true,force:true});
  fs.mkdirSync(persistRoot,{recursive:true});
  fs.mkdirSync(publicRoot,{recursive:true});
  fs.mkdirSync(resultsRoot,{recursive:true});
  if(explicitFailure){
    result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:explicitFailure});
  }else{
    const files=findFiles(childRoot);
    const buildFile=files.find(file=>path.basename(file)==='unity-web-build.json');
    const qaFile=files.find(file=>path.basename(file)==='unity-web-gameplay-validation.json');
    const indexSuffix=`/web-games/${gameId}/index.html`;
    const indexFile=files.find(file=>file.replaceAll('\\','/').endsWith(indexSuffix));
    const deployBundle=deployableUnityWebBundle(files,gameId);
    if(!buildFile||!qaFile||!indexFile){
      result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:'UNITY_WEB_CHILD_EVIDENCE_INCOMPLETE'});
    }else if(!deployBundle.pass){
      const detail=[deployBundle.missing.length?`missing=${deployBundle.missing.join(',')}`:'',deployBundle.oversized.length?`oversized=${deployBundle.oversized.join(',')}`:''].filter(Boolean).join(';');
      result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:`UNITY_WEB_DEPLOY_BUNDLE_INCOMPLETE:${detail}`});
    }else{
      const build=JSON.parse(fs.readFileSync(buildFile,'utf8'));
      const qa=JSON.parse(fs.readFileSync(qaFile,'utf8'));
      const qaMarkers=Array.isArray(qa?.markers)?qa.markers.map(String):[];
      const coreFunMarkers=Array.isArray(qa?.coreFun?.markers)?qa.coreFun.markers.map(String):[];
      const realMobileEvidence=qa?.mobile?.pass===true
        &&qa?.mobile?.actualBrowserTouchDispatched===true
        &&qa?.mobile?.realGameTouchHandlerObserved===true
        &&qa?.input?.mobileInputObserved===true
        &&String(qa?.input?.qaMode||'').includes('REAL_BROWSER_TOUCH')
        &&Number.isFinite(Number(qa?.mobile?.target?.x))
        &&Number.isFinite(Number(qa?.mobile?.target?.y))
        &&Number(qa.mobile.target.x)>0&&Number(qa.mobile.target.x)<1
        &&Number(qa.mobile.target.y)>0&&Number(qa.mobile.target.y)<1
        &&qaMarkers.some(marker=>marker.includes(' MOBILE_TARGET ')&&marker.includes('role=action'))
        &&qaMarkers.some(marker=>marker.includes(' MOBILE_INPUT ')&&marker.includes('role=action')&&marker.includes('status=PASS'));
      const realCoreFunEvidence=qa?.coreFun?.pass===true
        &&Number(qa?.coreFun?.markerCount||0)>0
        &&coreFunMarkers.some(marker=>marker.includes(' CORE_FUN ')&&marker.includes('status=PASS'))
        &&qaMarkers.some(marker=>marker.includes(' CORE_FUN ')&&marker.includes('status=PASS'))
        &&qa?.gameplay?.progressObserved===true
        &&qa?.gameplay?.coreActionObserved===true;
      const gate={
        boot:build?.bootSmoke==='PASS'&&qa?.boot?.pass===true,
        input:qa?.input?.pass===true&&realMobileEvidence,
        gameplay:qa?.gameplay?.pass===true&&qa?.gameplay?.gameplayStartObserved===true&&qa?.gameplay?.safeReturnOrResetObserved===true,
        coreFun:realCoreFunEvidence,
        mobile:realMobileEvidence,
        saveRestore:qa?.saveRestore?.pass===true,
        performance:qa?.performance?.pass===true,
        noCriticalRuntimeError:qa?.noCriticalRuntimeError===true,
      };
      gate.pass=Object.values(gate).every(Boolean);
      if(!gate.pass){
        const missing=Object.entries(gate).filter(([key,value])=>key!=='pass'&&!value).map(([key])=>key).join(',');
        result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:`UNITY_WEB_GATE_INCOMPLETE:${missing}`});
      }else{
        const stamp=new Date().toISOString();
        const evidenceRelative=baselineSource.replace(/[^/]+$/,'unity-web-validation-surface.json');
        const combined={
          version:1,
          engine:'UNITY_WEB',
          gameId,
          pass:true,
          gate,
          canonicalSourceRoot:sourceRoot,
          buildOutputRoot:`web-games/${gameId}`,
          sourceCommit:build?.sourceCommit||null,
          sourceTreeSha:sourceTree,
          designBaselineSource:baselineSource,
          designBaselineSha256:baselineSha,
          buildRunId,
          buildEvidence:build,
          deployBundle,
          gameplayEvidence:qa,
          validationSurfaceOnly:false,
          compatibilityEvidenceOnly:true,
          nativeGateAuthority:false,
          developmentAdmissionAuthority:false,
          upperPlatformReadinessRequired:true,
          upperPlatformReadinessEvidence:`web-games/${gameId}/upper-platform-development-readiness.json`,
          releaseAuthority:false,
          postGateAction:'EVALUATE_UPPER_PLATFORM_DEVELOPMENT_READY_THEN_START_ROBLOX_UNITY',
          generatedAt:stamp,
        };
        const evidenceOut=path.join(persistRoot,evidenceRelative);
        fs.mkdirSync(path.dirname(evidenceOut),{recursive:true});
        fs.writeFileSync(evidenceOut,JSON.stringify(combined,null,2)+'\n','utf8');
        const publicOut=path.join(publicRoot,'web-games',gameId);
        fs.mkdirSync(publicOut,{recursive:true});
        fs.cpSync(path.dirname(indexFile),publicOut,{recursive:true});
        result={gameId,pass:true,update:{
          unityWebValidationSurfacePassed:true,
          unityWebValidationSurfacePassedAt:stamp,
          unityWebValidationSurfaceEvidencePath:evidenceRelative,
          unityWebValidationSurfaceBuildRunId:buildRunId,
          unityWebValidationSurfaceSourceTreeSha:sourceTree,
          unityWebValidationSurfaceDesignBaselineSha256:baselineSha,
          unityWebValidationSurfaceGate:gate,
          unityWebValidationSurfaceFailureReason:null,
          unityWebTestAvailable:true,
          unityWebTestUrl:`/web-games/${gameId}/`,
          webValidationRequired:false,
          unityWebValidationSurfaceLastAttemptAt:stamp,
          updatedAt:stamp,
        }};
      }
    }
  }
  writeJson(path.join(resultsRoot,`${safeId(gameId)}.json`),result);
  console.log(`UNITY_WEB_VALIDATION_SURFACE_RESULT=${gameId}:${result.pass?'PASS':'UNAVAILABLE'}`);
  process.exit(0);
}

throw new Error(`UNKNOWN_MODE:${mode||'EMPTY'}`);
