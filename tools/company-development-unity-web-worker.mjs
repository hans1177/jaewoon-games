// 파일명: tools/company-development-unity-web-worker.mjs
// 역할: DEVELOPMENT_CONFIRMED의 1차 Unity Web 소스 준비와 child build 결과를 fail-closed로 판정한다.

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
if(contract?.status!=='OWNER_DIRECT_LOCKED'||contract?.scope!=='FIRST_WEB_GAME_STAGE_ONLY')throw new Error('UNITY_WEB_FIRST_STAGE_POLICY_MISSING');
if(contract?.canonicalGameSourceRoot!=='unity-games/<gameId>/'||contract?.publicWebBuildRoot!=='web-games/<gameId>/')throw new Error('UNITY_WEB_SOURCE_BUILD_BOUNDARY_MISMATCH');
if(contract?.postUnityWebGatePipelineUnchanged!==true)throw new Error('POST_UNITY_WEB_PIPELINE_MUST_REMAIN_UNCHANGED');

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
function failureResult({gameId,sourceRoot,baselineSha='',sourceTree='',buildRunId=null,reason,bootstrap=false}){
  const stamp=new Date().toISOString();
  return{
    gameId,pass:false,update:{
      status:'ACTIVE',
      currentStep:bootstrap?'VIBE_WEB_BASE_IMPLEMENTATION':'VIBE_WEB_REPAIR',
      canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      sourcePath:sourceRoot,
      webSourcePath:`web-games/${gameId}`,
      webValidationRequired:true,
      unityWebFirstStagePassed:false,
      unityWebFirstStagePassedAt:null,
      unityWebFirstStageEvidencePath:null,
      unityWebFirstStageBuildRunId:buildRunId,
      unityWebFirstStageSourceTreeSha:sourceTree||null,
      unityWebFirstStageDesignBaselineSha256:baselineSha||null,
      vibeWebImplementationRequired:true,
      vibeWebRequestedStage:bootstrap?'WEB_BASE_IMPLEMENTATION':'WEB_REPAIR',
      vibeWebImplementationReason:reason,
      sourceRootBootstrapRequired:bootstrap,
      homepageTestEligible:false,
      homepageTestCandidate:false,
      formalImplementationPassed:false,
      routingBlockers:[`unity-web-first-stage:${reason}`],
      webValidationLastAttemptAt:stamp,
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
  const bootstrap=explicitFailure==='UNITY_WEB_CANONICAL_SOURCE_MISSING';
  let result;
  const persistRoot=path.join(outputRoot,'persist');
  const publicRoot=path.join(outputRoot,'public');
  const resultsRoot=path.join(outputRoot,'results');
  fs.rmSync(outputRoot,{recursive:true,force:true});
  fs.mkdirSync(persistRoot,{recursive:true});
  fs.mkdirSync(publicRoot,{recursive:true});
  fs.mkdirSync(resultsRoot,{recursive:true});
  if(explicitFailure){
    result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:explicitFailure,bootstrap});
  }else{
    const files=findFiles(childRoot);
    const buildFile=files.find(file=>path.basename(file)==='unity-web-build.json');
    const qaFile=files.find(file=>path.basename(file)==='unity-web-gameplay-validation.json');
    const indexSuffix=`/web-games/${gameId}/index.html`;
    const indexFile=files.find(file=>file.replaceAll('\\','/').endsWith(indexSuffix));
    if(!buildFile||!qaFile||!indexFile){
      result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:'UNITY_WEB_CHILD_EVIDENCE_INCOMPLETE'});
    }else{
      const build=JSON.parse(fs.readFileSync(buildFile,'utf8'));
      const qa=JSON.parse(fs.readFileSync(qaFile,'utf8'));
      const gate={
        boot:build?.bootSmoke==='PASS'&&qa?.boot?.pass===true,
        input:qa?.input?.pass===true,
        gameplay:qa?.gameplay?.pass===true,
        coreFun:qa?.coreFun?.pass===true,
        mobile:qa?.mobile?.pass===true,
        performance:qa?.performance?.pass===true,
        noCriticalRuntimeError:qa?.noCriticalRuntimeError===true,
      };
      gate.pass=Object.values(gate).every(Boolean);
      if(!gate.pass){
        const missing=Object.entries(gate).filter(([key,value])=>key!=='pass'&&!value).map(([key])=>key).join(',');
        result=failureResult({gameId,sourceRoot,baselineSha,sourceTree,buildRunId,reason:`UNITY_WEB_GATE_INCOMPLETE:${missing}`});
      }else{
        const stamp=new Date().toISOString();
        const evidenceRelative=baselineSource.replace(/[^/]+$/,'unity-web-first-stage-validation.json');
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
          gameplayEvidence:qa,
          postUnityWebGatePipelineUnchanged:true,
          generatedAt:stamp,
        };
        const evidenceOut=path.join(persistRoot,evidenceRelative);
        fs.mkdirSync(path.dirname(evidenceOut),{recursive:true});
        fs.writeFileSync(evidenceOut,JSON.stringify(combined,null,2)+'\n','utf8');
        const publicOut=path.join(publicRoot,'web-games',gameId);
        fs.mkdirSync(publicOut,{recursive:true});
        fs.cpSync(path.dirname(indexFile),publicOut,{recursive:true});
        result={gameId,pass:true,update:{
          status:'PENDING',
          currentStep:'TARGET_PLATFORM_SOURCE_BIND',
          canonicalState:'PENDING_SELECTED_PLATFORM_BIND',
          sourcePath:sourceRoot,
          webSourcePath:`web-games/${gameId}`,
          webValidationRequired:true,
          webValidationPassedAt:stamp,
          webValidationEvidencePath:evidenceRelative,
          unityWebFirstStagePassed:true,
          unityWebFirstStagePassedAt:stamp,
          unityWebFirstStageEvidencePath:evidenceRelative,
          unityWebFirstStageBuildRunId:buildRunId,
          unityWebFirstStageSourceTreeSha:sourceTree,
          unityWebFirstStageDesignBaselineSha256:baselineSha,
          unityWebFirstStageGate:gate,
          vibeWebImplementationRequired:false,
          vibeWebRequestedStage:null,
          vibeWebImplementationReason:null,
          sourceRootBootstrapRequired:false,
          homepageTestEligible:true,
          homepageTestCandidate:false,
          homepageTestVerdict:'UNITY_WEB_GATE_PASS',
          formalImplementationPassed:false,
          formalImplementationVerdict:'UNITY_WEB_GATE_PASS',
          routingBlockers:[],
          webValidationLastAttemptAt:stamp,
          updatedAt:stamp,
        }};
      }
    }
  }
  writeJson(path.join(resultsRoot,`${safeId(gameId)}.json`),result);
  console.log(`UNITY_WEB_RUNTIME_RESULT=${gameId}:${result.pass?'PASS':'REPAIR_REQUIRED'}`);
  process.exit(0);
}

throw new Error(`UNKNOWN_MODE:${mode||'EMPTY'}`);
