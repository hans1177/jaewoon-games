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

// 메인: Unity Web 전용 BUILD_UP 비교. 소스 파일/표식만으로 게임 성장 PASS를 만들지 않는다.
// 기존 WebGL 실기동·독립 QA·회귀 증거를 이전 검증본과 같은 게임/소스 기준으로 대조한다.
export function evaluateUnityWebBuildUpGrowth({
  repoRoot='.',gameId='',sourceTreeSha256='',previousReadiness=null,
  play={},independent={},regression={},focus='CORE_FUN'
}={}){
  const id=clean(gameId),platform='UNITY_WEB';
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id))throw new Error('UNITY_WEB_GROWTH_GAME_ID_INVALID');
  const sourceRoot=path.join(repoRoot,'unity-games',id,'Assets');
  const sources={scripts:[],graphics:[],content:[]};
  const roots={
    scripts:['Scripts'],
    graphics:['Scenes','Prefabs','Art','Materials','Animations','Audio'],
    content:['Data','Resources']
  };
  for(const [kind,folders] of Object.entries(roots)){
    for(const folder of folders){
      const root=path.join(sourceRoot,folder);
      if(!fs.existsSync(root))continue;
      const visit=dir=>{
        for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
          const file=path.join(dir,entry.name);
          if(entry.isSymbolicLink())continue;
          if(entry.isDirectory()){visit(file);continue;}
          if(!entry.isFile()||entry.name.endsWith('.meta'))continue;
          const stat=fs.statSync(file);
          // 큰 바이너리의 파일명/크기만으로 개선을 주장하지 않는다.
          if(stat.size>25*1024*1024)continue;
          const relative=path.relative(sourceRoot,file).replaceAll('\\','/');
          const ext=path.extname(file).toLowerCase();
          if(kind==='scripts'&&ext!=='.cs')continue;
          const bytes=fs.readFileSync(file);
          const meaningful=kind==='scripts'
            ?bytes.toString('utf8').replace(/\/\*[\s\S]*?\*\//g,' ')
              .split('\n').map(line=>line.replace(/\/\/.*$/,'').trim()).filter(Boolean).join('\n')
            :bytes;
          sources[kind].push({file:relative,bytes:meaningful});
        }
      };
      visit(root);
    }
  }
  const sourceSnapshot={};
  for(const [kind,files] of Object.entries(sources)){
    const digest=crypto.createHash('sha256');
    for(const row of files.sort((a,b)=>a.file.localeCompare(b.file))){
      digest.update(row.file).update('\0').update(row.bytes).update('\0');
    }
    sourceSnapshot[kind+'Sha256']=files.length?digest.digest('hex'):null;
    sourceSnapshot[kind+'Files']=files.length;
  }
  const qaRuns=[play,independent,regression];
  const runtimeQaVerified=qaRuns.every(e=>e?.gameId===id
    &&e.pass===true&&e.playableBrowserTest===true
    &&e.boot?.pass===true&&e.gameplay?.pass===true&&e.coreFun?.pass===true
    &&e.saveRestore?.pass===true&&e.mobile?.pass===true
    &&e.spatialGameplay?.requiredDimension==='3D'&&e.spatialGameplay?.pass===true
    &&e.visualQa?.renderedScene?.pass===true
    &&e.visualQa?.renderedScene?.pixels?.source==='REAL_UNITY_CANVAS_SCREENSHOT'
    &&/^[a-f0-9]{64}$/.test(clean(e.visualQa.renderedScene.sceneCaptureSha256)));
  const metric=key=>Math.min(...qaRuns.map(e=>Math.max(0,Number(e?.spatialGameplay?.[key])||0)));
  // 서로 다른 3회 브라우저 실행에서 재현되고, 실제 GAME STATE에도 도달한 콘텐츠만 사용한다.
  // 콘솔 이벤트/상태키의 이름만 추가한 결과는 독립된 성장 증거로 인정하지 않는다.
  const runtimeRuns=qaRuns.map(e=>{
    const lines=(Array.isArray(e?.markers)?e.markers:[])
      .filter(line=>typeof line==='string'&&line.includes('JAEWOON_UNITY_WEB_QA ')&&line.includes('game='+id));
    const states=lines.filter(line=>line.includes(' STATE '));
    const ids=new Set(),kinds=new Set();
    for(const line of lines){
      const kind=line.match(/JAEWOON_UNITY_WEB_QA\s+([A-Z_]+)/)?.[1]||'';
      if(!['REGION','QUEST','ENCOUNTER','BOSS','SKILL','ITEM','REWARD','PROGRESS','CORE_FUN'].includes(kind))continue;
      kinds.add(kind);
      for(const key of ['region','quest','enemy','boss','skill','item','ability','content','event']){
        const value=line.match(new RegExp('\\b'+key+'=([A-Za-z][A-Za-z0-9_-]{1,63})\\b'))?.[1];
        if(!value||['none','unknown','null','true','false','pass','failed','ready'].includes(value.toLowerCase()))continue;
        if(states.some(state=>state.includes(key+'='+value)))ids.add(key+':'+value);
      }
    }
    return{ids,kinds,restored:new Set((e?.saveRestore?.restoredKeys||[]).map(clean).filter(Boolean))};
  });
  const shared=(field)=>[...runtimeRuns[0][field]].filter(value=>runtimeRuns.every(run=>run[field].has(value))).sort();
  const minValue=e=>Math.max(0,Number(e)||0);
  const observation={
    source:sourceSnapshot,
    runtime:{
      nativeMeshCount:metric('observedMeshCount'),
      worldMeshes3d:metric('worldMeshes3d'),
      gameplayActors3d:metric('gameplayActors3d'),
      persistentStateKeys:shared('restored'),
      eventKinds:shared('kinds'),
      contentIds:shared('ids'),
      sceneCaptureSha256:clean(play?.visualQa?.renderedScene?.sceneCaptureSha256)||null,
      colorBuckets:minValue(play?.visualQa?.renderedScene?.pixels?.distinctColorBuckets),
      p95FrameMs:minValue(play?.performance?.framePacing?.p95FrameMs),
      bootMilliseconds:minValue(play?.performance?.bootMilliseconds)
    }
  };
  const previous=previousReadiness?.gameId===id&&previousReadiness?.pass===true
    &&/^[a-f0-9]{64}$/.test(clean(previousReadiness.unitySourceTreeSha256))
    ?previousReadiness:null;
  const priorObservation=previous?.buildUpGrowth?.observed;
  const comparable=Boolean(priorObservation?.source?.scriptsSha256&&priorObservation?.runtime?.sceneCaptureSha256);
  const sourceChanged=Boolean(previous&&sourceTreeSha256
    &&previous.unitySourceTreeSha256!==sourceTreeSha256);
  const changedKinds=comparable?Object.keys(sources).filter(kind=>
    sourceSnapshot[kind+'Sha256']!==priorObservation.source[kind+'Sha256']):[];
  const previousRuntime=priorObservation?.runtime||{};
  const newIds=observation.runtime.contentIds.filter(x=>!new Set(previousRuntime.contentIds||[]).has(x));
  const newStateKeys=observation.runtime.persistentStateKeys.filter(x=>!new Set(previousRuntime.persistentStateKeys||[]).has(x));
  const newEvents=observation.runtime.eventKinds.filter(x=>!new Set(previousRuntime.eventKinds||[]).has(x));
  const gameplayExpanded=changedKinds.some(kind=>kind==='scripts'||kind==='content')
    &&Boolean(newStateKeys.length
      ||(newIds.length&&observation.runtime.sceneCaptureSha256!==previousRuntime.sceneCaptureSha256));
  const nativeGraphicsExpanded=changedKinds.some(kind=>kind==='scripts'||kind==='graphics')
    &&(observation.runtime.nativeMeshCount>minValue(previousRuntime.nativeMeshCount)
      ||observation.runtime.worldMeshes3d>minValue(previousRuntime.worldMeshes3d)
      ||observation.runtime.gameplayActors3d>minValue(previousRuntime.gameplayActors3d));
  const visiblePresentationChanged=changedKinds.some(kind=>kind==='graphics'||kind==='scripts')
    &&qaRuns.every(e=>e.visualQa?.renderedScene?.sceneCaptureSha256!==previousRuntime.sceneCaptureSha256
      &&minValue(e.visualQa?.renderedScene?.pixels?.distinctColorBuckets)>=minValue(previousRuntime.colorBuckets)+2);
  const measuredOptimization=changedKinds.includes('scripts')
    &&((previousRuntime.p95FrameMs>0&&observation.runtime.p95FrameMs>0
      &&observation.runtime.p95FrameMs<=previousRuntime.p95FrameMs*0.9)
      ||(previousRuntime.bootMilliseconds>0&&observation.runtime.bootMilliseconds>0
        &&observation.runtime.bootMilliseconds<=previousRuntime.bootMilliseconds*0.9));
  const focusKey=clean(focus).toUpperCase();
  const signals={
    gameplay:gameplayExpanded,graphics:nativeGraphicsExpanded,
    visiblePresentation:visiblePresentationChanged,performance:measuredOptimization,
    newContentIds:newIds,newPersistentStateKeys:newStateKeys,newEventKinds:newEvents
  };
  const focusGrowth=['CORE_FUN','PROGRESSION'].includes(focusKey)?gameplayExpanded:
    focusKey==='PRESENTATION'?nativeGraphicsExpanded||visiblePresentationChanged:
      focusKey==='STABILITY'?measuredOptimization||gameplayExpanded:
        focusKey==='USABILITY'?measuredOptimization||gameplayExpanded:
          gameplayExpanded||nativeGraphicsExpanded||visiblePresentationChanged||measuredOptimization;
  const verifiedGrowth=Boolean(runtimeQaVerified&&comparable&&sourceChanged&&changedKinds.length&&focusGrowth);
  const status=!runtimeQaVerified?'RUNTIME_QA_NOT_VERIFIED'
    :!previous?'INITIAL_VERIFIED_BROWSER_BASELINE_NO_PRIOR_COMPARISON'
      :!comparable?'PRIOR_VERIFIED_BASELINE_LACKS_COMPARABLE_MEASUREMENTS'
        :!sourceChanged?'UNCHANGED_UNITY_SOURCE_REVALIDATION_NOT_GROWTH'
          :!changedKinds.length?'NON_GAME_SOURCE_CHANGE_NOT_GROWTH'
            :verifiedGrowth?'VERIFIED_PLAYER_FACING_GROWTH'
              :'SOURCE_CHANGED_PLAYER_FACING_GROWTH_UNVERIFIED';
  return{
    version:1,platform,gameId:id,status,verifiedGrowth,comparisonAvailable:comparable,
    sourceChanged,changedKinds,focus:focusKey,runtimeQaVerified,
    sourceTreeSha256:clean(sourceTreeSha256)||null,
    previousSourceTreeSha256:previous?.unitySourceTreeSha256||null,
    signals,observed:observation,baselineIsActualThreeBrowserRuns:runtimeQaVerified,
    sourceOnlyOrMarkerOnlyNeverPass:true,
    noArtificialContentCountOrGenerationLimit:true,
    preserveBalanceSaveAndNetworkAuthority:true
  };
}

// Unity Web 기존 검증 단계의 3개 Playwright 실행이 서로 다른 실제 조작 경로를 통과했는지 판정.
// 별도 파이프라인을 만들지 않고 기존 browser/independent/regression 증거만 소비한다.
export function evaluateUnityWebPrecisionQa({gameId='',play=null,independent=null,regression=null}={}){
  const id=clean(gameId);
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id))throw new Error('UNITY_WEB_PRECISION_GAME_ID_INVALID');
  const runs=[
    {stage:'BROWSER_PLAY',scenarioId:'actual-play',evidence:play},
    {stage:'INDEPENDENT_QA',scenarioId:'independent-qa',evidence:independent},
    {stage:'REGRESSION',scenarioId:'regression',evidence:regression}
  ];
  const failures=[];
  const checks=runs.map(({stage,scenarioId,evidence:e})=>{
    const p=e?.precisionQa||{},native=e?.spatialGameplay||{},visual=e?.visualQa?.renderedScene||{};
    const action=p.liveActionState||{};
    const replay=p.secondaryCycle||{};
    const checks={
      exactGameAndScenario:e?.gameId===id&&p.gameId===id
        &&e.engine==='UNITY_WEB'&&p.scenarioId===scenarioId,
      actualWebglBrowserRun:e?.playableBrowserTest===true&&e.boot?.pass===true
        &&p.runtimeOrigin==='PLAYWRIGHT_CHROMIUM_ANDROID_PROFILE_REAL_WEBGL_BUILD',
      inputAndRealGameState:e?.input?.pass===true&&e.mobile?.realGameTouchHandlerObserved===true
        &&action.measuredFromNativeGameState===true
        &&typeof action.stateMeasuredBefore==='string'&&action.stateMeasuredBefore.includes(' STATE ')
        &&typeof action.stateMeasuredAfter==='string'&&action.stateMeasuredAfter.includes(' STATE ')
        &&action.stateMeasuredBefore!==action.stateMeasuredAfter
        &&Array.isArray(action.changedKeys)&&action.changedKeys.length>0
        &&action.actionAfterLiveEntry===true&&action.rewardAfterLiveActions===true
        &&action.coreFunAfterLiveActions===true,
      persistentSaveAndRestore:e?.saveRestore?.pass===true&&p.saveRestoreConfirmed===true
        &&Array.isArray(e?.saveRestore?.persistentChangedKeys)
        &&e.saveRestore.persistentChangedKeys.length>0
        &&Array.isArray(e.saveRestore.restoredKeys)
        &&e.saveRestore.persistentChangedKeys.every(key=>e.saveRestore.restoredKeys.includes(key)),
      native3dPixels:native.requiredDimension==='3D'&&native.pass===true&&native.depthPass===true
        &&native.perspectiveCamera===true&&Number(native.observedMeshCount)>0
        &&Number(native.observedTriangles)>0
        &&e?.visualQa?.nativeUnityMesh?.pass===true
        &&visual.pass===true&&visual.pixels?.source==='REAL_UNITY_CANVAS_SCREENSHOT'
        &&visual.sceneCapturePersisted===true&&/^[a-f0-9]{64}$/.test(clean(visual.sceneCaptureSha256)),
      independentTouchFirst:scenarioId!=='independent-qa'
        ||p.distinctRoute==='REAL_BROWSER_TOUCH_FIRST',
      regressionReplay:scenarioId!=='regression'||(
        p.secondaryCycleRequired===true&&replay.pass===true
        &&replay.resumedAfterReload===true&&replay.mobileInputObserved===true
        &&replay.actionObserved===true&&replay.rewardObserved===true
        &&Array.isArray(replay.changedPersistentKeys)&&replay.changedPersistentKeys.length>0),
      noMarkerOnlyShortcut:p.markerOnlyPassForbidden===true
    };
    const bad=Object.entries(checks).filter(([,pass])=>!pass).map(([key])=>key);
    for(const key of bad)failures.push(stage+':'+key);
    return{stage,scenarioId,pass:bad.length===0,failedChecks:bad};
  });
  const pass=failures.length===0;
  return Object.freeze({
    version:1,gameId:id,platform:'UNITY_WEB',pass,
    status:pass?'VERIFIED_THREE_DISTINCT_REAL_BROWSER_SCENARIOS':'PRECISION_RUNTIME_REPAIR_REQUIRED',
    checks:Object.freeze(checks),failures:Object.freeze(failures),
    actualIndependentQaScenarioRequired:true,postReloadSecondGameplayCycleRequired:true,
    sourceMarkersAloneNeverProvePass:true,
    noRobloxOrUnityAndroidGateChanges:true
  });
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
  // 기존 7개 게이트 순서는 바꾸지 않는다. Unity Web BUILD_UP이 성장 검증을 요구한 경우에만 추가 근거를 확인한다.
  if(data.buildUpGrowthRequired===true){
    const growth=data.buildUpGrowth||{};
    if(growth.gameId!==gameId||growth.platform!=='UNITY_WEB'
      ||growth.verifiedGrowth!==true||growth.runtimeQaVerified!==true
      ||growth.comparisonAvailable!==true
      ||growth.status!=='VERIFIED_PLAYER_FACING_GROWTH'
      ||growth.sourceTreeSha256!==currentTree
      ||!/^[a-f0-9]{64}$/.test(clean(growth.previousSourceTreeSha256))
      ||growth.previousSourceTreeSha256===currentTree
      ||data.criteria?.buildUpGrowth?.pass!==true)
      return{pass:false,reason:'READINESS_BUILD_UP_GROWTH_EVIDENCE_REQUIRED',data,currentTree};
  }
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
  if(data.precisionQaRequired===true){
    const precision=data.precisionQa||{};
    if(data.criteria?.precisionQa?.pass!==true||precision.pass!==true
      ||precision.gameId!==gameId||precision.platform!=='UNITY_WEB'
      ||precision.status!=='VERIFIED_THREE_DISTINCT_REAL_BROWSER_SCENARIOS'
      ||!Array.isArray(precision.checks)||precision.checks.length!==3
      ||precision.checks.some((check,index)=>check.pass!==true
        ||check.stage!==['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'][index]))
      return{pass:false,reason:'READINESS_PRECISE_PLAYTEST_EVIDENCE_REQUIRED',data,currentTree};
  }
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
