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
// Unity Web 전용 소스 정밀 검증. 외부 정적 분석 기법인 interprocedural call graph,
// definition/use chains, reachable event paths, negative/mutation canaries를 기존 게이트에서 이용한다.
// 정규식 기반 C# 보수적 분석으로 Roslyn/Unity 컴파일러의 타입 검사나 실제 실행을 대신하지 않는다.
export function auditUnityWebNativeSystems({
  repoRoot='.',gameId='',designRecord={},play=null,independent=null,regression=null
}={}){
  const id=clean(gameId);
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id))throw new Error('UNITY_WEB_SYSTEM_AUDIT_GAME_ID_INVALID');
  const content=designRecord?.content&&typeof designRecord.content==='object'?designRecord.content:designRecord;
  const systems=Array.isArray(content?.signatureSystems)?content.signatureSystems:[];
  const interconnections=Array.isArray(content?.systemInterconnections)?content.systemInterconnections:[];
  const originalRoot=path.resolve(repoRoot,'unity-games',id,'Assets','Scripts');
  const problems=[],files=[],program=[];
  if(systems.length===0)problems.push('VERIFIED_DESIGN_SIGNATURE_SYSTEMS_REQUIRED');
  const underRoot=file=>file.startsWith(originalRoot+path.sep)&&file.endsWith('.cs');
  if(fs.existsSync(originalRoot)){
    const trustedRoot=fs.realpathSync(originalRoot);
    const walk=dir=>{
      for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
        const full=path.join(dir,entry.name);
        if(entry.isSymbolicLink()){problems.push('C_SHARP_SYMLINK_NOT_AUDITED');continue;}
        if(entry.isDirectory()){walk(full);continue;}
        if(!entry.isFile()||!underRoot(full))continue;
        const real=fs.realpathSync(full);
        if(!real.startsWith(trustedRoot+path.sep)){
          problems.push('C_SHARP_SOURCE_ESCAPES_CANONICAL_GAME_ROOT');continue;
        }
        const stat=fs.statSync(real);
        if(stat.size>2*1024*1024){problems.push('C_SHARP_SOURCE_FILE_TOO_LARGE_FOR_PRECISE_AUDIT');continue;}
        const relative=path.relative(path.resolve(repoRoot),real).replaceAll('\\','/');
        files.push({file:relative,text:fs.readFileSync(real,'utf8')});
      }
    };
    walk(originalRoot);
  }else problems.push('CANONICAL_UNITY_GAME_SCRIPTS_MISSING');
  files.sort((a,b)=>a.file.localeCompare(b.file));
  if(!files.length)problems.push('NATIVE_C_SHARP_GAME_SCRIPTS_MISSING');
  // 문자열 안의 "WorldState += 99", 주석, QA PASS 문구를 소스 구현으로 오인하지 않는다.
  const mask=text=>{
    let out='',state='code';
    for(let i=0;i<text.length;i++){
      const char=text[i],next=text[i+1]||'',prev=text[i-1]||'';
      if(state==='code'){
        if(char==='/'&&next==='/'){out+='  ';i++;state='line';continue;}
        if(char==='/'&&next==='*'){out+='  ';i++;state='block';continue;}
        if(char==='"'){out+=' ';state=prev==='@'?'verbatim':'double';continue;}
        if(char==="'"){out+=' ';state='single';continue;}
        out+=char;continue;
      }
      if(state==='line'){
        if(char==='\n'){out+='\n';state='code';}else out+=' ';
        continue;
      }
      if(state==='block'){
        if(char==='*'&&next==='/'){out+='  ';i++;state='code';}
        else out+=char==='\n'?'\n':' ';
        continue;
      }
      if(state==='verbatim'){
        if(char==='"'&&next==='"'){out+='  ';i++;continue;}
        if(char==='"'){out+=' ';state='code';}else out+=char==='\n'?'\n':' ';
        continue;
      }
      if(char==='\\'){out+=' ';if(i+1<text.length){out+=text[++i]==='\n'?'\n':' ';}continue;}
      if((state==='double'&&char==='"')||(state==='single'&&char==="'")){
        out+=' ';state='code';
      }else out+=char==='\n'?'\n':' ';
    }
    return out;
  };
  const sanitized=new Map(files.map(row=>[row.file,mask(row.text)]));
  const declarations=[];
  // 접근 제한자를 포함하는 메서드와 일반 Unity 이벤트 메서드: balanced brace로 본문만 분석.
  const signature=/(?:^|[;{}]\s*|\n\s*)(?:(?:public|private|protected|internal|static|override|virtual|sealed|async|new|partial|extern)\s+)*(?:[A-Za-z_][\w.<>\[\],?]*\s+)+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;{}]*\)\s*\{/gm;
  for(const [file,text] of sanitized){
    const matches=[...text.matchAll(signature)],bodySpans=[];
    for(const m of matches){
      const name=m[1],start=m.index+m[0].lastIndexOf('{');
      if(['if','else','switch','while','for','foreach','using','lock','catch'].includes(name))continue;
      let depth=0,end=-1;
      for(let j=start;j<text.length;j++){
        if(text[j]==='{')depth++;
        if(text[j]==='}'&&--depth===0){end=j;break;}
      }
      if(end<0){problems.push('C_SHARP_UNBALANCED_METHOD_BLOCK:'+file);continue;}
      const body=text.slice(start+1,end);
      const line=1+text.slice(0,start).split('\n').length-1;
      // 메서드별 원본 리터럴은 설계 역할/상태 증거 바인딩에만 사용한다.
      // C# 읽기·쓰기 판정은 주석과 문자열을 제거한 body로 유지한다.
      const rawBody=files.find(row=>row.file===file).text.slice(start+1,end);
      declarations.push({id:file+'#'+name+'@'+line,file,name,body,rawBody,line});
      bodySpans.push([m.index,end+1]);
    }
    const outside=text.split('');
    for(const [start,end] of bodySpans)
      for(let i=start;i<end;i++)if(outside[i]!=='\n')outside[i]=' ';
    const members=outside.join('');
    for(const member of members.matchAll(/\b(?:(?:public|private|protected|internal)\s+)(?:(?:static|readonly|volatile|new)\s+)*[A-Za-z_][\w<>\[\],.?]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?=[;={])/g)){
      // 선언은 상태 소유의 후보일 뿐 실제 입력·전이·출력 증거는 아니다.
      declarations.push({id:file+'#FIELD:'+member[1],file,name:member[1],body:null,kind:'FIELD'});
    }
    for(const property of members.matchAll(/\b[A-Za-z_][\w<>\[\],.?]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*get\b/g))
      declarations.push({id:file+'#PROPERTY:'+property[1],file,name:property[1],body:null,kind:'FIELD'});
  }
  const methods=declarations.filter(row=>typeof row.body==='string');
  const declaredStateNames=new Set(declarations.filter(row=>row.kind==='FIELD').map(row=>row.name));
  const byName=new Map();
  for(const method of methods)byName.set(method.name,[...(byName.get(method.name)||[]),method]);
  const callGraph=new Map(methods.map(row=>[row.id,new Set()]));
  const ambiguousCalls=new Set();
  const inputPattern=/\b(?:Input\s*\.\s*(?:GetKey|GetMouseButton|GetTouch|touchCount|GetAxis|GetButton)|(?:GUI|GUILayout)\s*\.\s*Button|Event\s*\.\s*current|onClick\s*\.\s*AddListener|OnPointer(?:Click|Down|Up))\b/;
  const feedbackPattern=/\b(?:GUI|GUILayout)\s*\.\s*(?:Label|TextField)|\b(?:TextMeshProUGUI|TextMesh|AudioSource|ParticleSystem)\b|\b(?:SetRegionVisual|PlayCombatExchange|Play[A-Z]\w*|Show[A-Z]\w*)\s*\(|\b_message\s*=(?!=)/;
  const callPattern=/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  const clickable=new Set(),feedback=new Set();
  for(const method of methods){
    if(inputPattern.test(method.body))clickable.add(method.id);
    if(feedbackPattern.test(method.body))feedback.add(method.id);
    const calls=new Set([...method.body.matchAll(callPattern)].map(m=>m[1]));
    for(const targetName of calls){
      if(['if','while','for','foreach','switch','catch','return','throw','new','nameof','typeof','sizeof'].includes(targetName))continue;
      const candidates=byName.get(targetName)||[];
      const local=candidates.filter(target=>target.file===method.file);
      const selected=local.length?local:candidates.length===1?candidates:[];
      if(!selected.length&&candidates.length>1)ambiguousCalls.add(method.id+'->'+targetName);
      for(const target of selected)callGraph.get(method.id).add(target.id);
    }
  }
  const unityCallbacks=new Set(['Awake','Start','Update','FixedUpdate','LateUpdate','OnGUI',
    'OnEnable','OnDisable','OnMouseDown','OnPointerDown','OnPointerUp','OnPointerClick',
    'OnTriggerEnter','OnCollisionEnter','OnTriggerStay','OnApplicationFocus']);
  const callbacks=methods.filter(row=>unityCallbacks.has(row.name));
  // BFS reachability: 이벤트 미연결 메서드는 상태를 써도 "실제 구현"으로 인정하지 않는다.
  const bfs=starts=>{
    const visited=new Set(starts),queue=[...starts];
    while(queue.length){
      const current=queue.shift();
      for(const next of callGraph.get(current)||[]){
        if(visited.has(next))continue;
        visited.add(next);queue.push(next);
      }
    }
    return visited;
  };
  const callbackReachable=bfs(callbacks.map(row=>row.id));
  const inputEntrypoints=[...clickable].filter(ref=>callbackReachable.has(ref));
  const eventReachable=bfs(inputEntrypoints);
  const callbackMethods=methods.filter(row=>callbackReachable.has(row.id));
  const outputPat=key=>new RegExp('\\b'+key+'\\s*(?:\\+\\+|--|[+*\\/%-]?=(?!=))','g');
  const readPat=key=>new RegExp('\\b'+key+'\\b');
  const noOpAssignment=key=>new RegExp('\\b'+key+'\\s*=\\s*(?:this\\.)?'+key+'\\s*;','g');
  const stateMethods=(key,kind)=>{
    if(!/^[A-Za-z_]\w*$/.test(key))return[];
    const rows=callbackMethods.filter(method=>{
      let body=method.body;
      if(kind==='WRITE'){
        body=body.replace(noOpAssignment(key),' ');
        body=body.replace(new RegExp('\\b'+key+'\\s*(?:\\+|-)=\\s*0\\s*;','g'),' ');
        return outputPat(key).test(body)&&eventReachable.has(method.id);
      }
      // 단순 "State = 1"의 왼쪽을 읽기 계약으로 오인하지 않는다.
      body=body.replace(outputPat(key),' ');
      return readPat(key).test(body);
    });
    return rows.map(method=>({file:method.file,symbol:method.name,line:method.line,id:method.id}));
  };
  const qaRuns=[play,independent,regression];
  const runtimeValid=qaRuns.every((e,index)=>e?.gameId===id&&e?.precisionQa?.scenarioId
    ===['actual-play','independent-qa','regression'][index]&&e?.precisionQa?.pass===true
    &&e?.pass===true&&e?.spatialGameplay?.pass===true);
  // 출력 상태의 변화는 3회 실제 Unity WebGL 입력 이후 발생해야 하며,
  // 텍스트 로그 자체가 소스/동작 검증을 대체하지는 못한다.
  const runTrace=e=>{
    const transitions=new Set();
    for(const line of e?.precisionQa?.liveSystemMarkers||[]){
      if(typeof line!=='string'||!line.includes('JAEWOON_UNITY_WEB_QA SYSTEM_STATE ')
        ||!line.includes('game='+id))continue;
      const fields=Object.fromEntries(line.split(/\s+/).slice(2).map(token=>{
        const at=token.indexOf('=');return at>0?[token.slice(0,at),token.slice(at+1)]:null;
      }).filter(Boolean));
      if(fields.game!==id||!fields.system||!fields.state
        ||fields.before===undefined||fields.after===undefined||fields.before===fields.after
        ||fields.status!=='PASS')continue;
      transitions.add(fields.system+'|'+fields.state);
    }
    return transitions;
  };
  const transitionSets=qaRuns.map(runTrace);
  const commonTransitions=runtimeValid?[...transitionSets[0]].filter(token=>
    transitionSets.every(run=>run.has(token))):[];
  const roleAudit=systems.map(system=>{
    const role=clean(system.grammarRole),systemId=clean(system.id);
    const inputKeys=[...new Set((system.stateInputs||[]).map(clean).filter(Boolean))];
    const outputKeys=[...new Set((system.stateOutputs||[]).map(clean).filter(Boolean))];
    const missingDeclaration=[...new Set([...inputKeys,...outputKeys])]
      .filter(key=>!declaredStateNames.has(key));
    // 각 설계 시스템은 자기 역할의 C# 메서드 안에서 입력 상태를 실제로 읽고
    // 출력 상태를 실제로 기록해야 한다. 다른 시스템의 우연한 동일 상태 쓰기/로그로
    // 역할별 구현을 통과시키는 교차 역할 오탐을 금지한다.
    const roleMethods=methods.filter(method=>eventReachable.has(method.id)
      &&method.rawBody.includes('JAEWOON_UNITY_WEB_QA SYSTEM_STATE game='+id+' system='+systemId+' state='));
    const roleMethodIds=new Set(roleMethods.map(method=>method.id));
    const inputs=inputKeys.map(key=>({key,owners:stateMethods(key,'READ')
      .filter(owner=>roleMethodIds.has(owner.id))}));
    const outputs=outputKeys.map(key=>({
      key,writers:stateMethods(key,'WRITE').filter(writer=>
        roleMethodIds.has(writer.id)&&roleMethods.some(method=>
          method.id===writer.id&&method.rawBody.includes(
            'JAEWOON_UNITY_WEB_QA SYSTEM_STATE game='+id+' system='+systemId+' state='+key+' before='))),
      runtimeObserved:commonTransitions.includes(systemId+'|'+key)
    }));
    const missingInputReads=inputs.filter(x=>!x.owners.length).map(x=>x.key);
    const missingEventDrivenWrites=outputs.filter(x=>!x.writers.length).map(x=>x.key);
    const missingNativeRuntimeTransitions=outputs.filter(x=>!x.runtimeObserved).map(x=>x.key);
    const hasPlayerFeedback=outputs.some(x=>x.writers.some(w=>
      feedback.has(w.id)||callbackMethods.some(m=>feedback.has(m.id)
        &&new RegExp('\\b'+x.key+'\\b').test(m.body))));
    const authored=Boolean(systemId&&role&&inputKeys.length&&outputKeys.length);
    const staticComplete=authored&&roleMethods.length>0&&missingDeclaration.length===0
      &&missingInputReads.length===0&&missingEventDrivenWrites.length===0
      &&hasPlayerFeedback&&inputEntrypoints.length>0;
    const runtimeComplete=staticComplete&&runtimeValid&&missingNativeRuntimeTransitions.length===0;
    const failures=[
      ...(!authored?['DESIGN_ROLE_STATE_CONTRACT_INCOMPLETE']:[]),
      ...(!roleMethods.length?['DESIGN_SYSTEM_OWN_NATIVE_INPUT_STATE_HANDLER_MISSING']:[]),
      ...missingDeclaration.map(key=>'NATIVE_FIELD_OR_PROPERTY_MISSING:'+key),
      ...missingInputReads.map(key=>'LIVE_CODE_STATE_READ_UNREACHABLE:'+key),
      ...missingEventDrivenWrites.map(key=>'PLAYER_INPUT_TO_STATE_WRITE_UNREACHABLE:'+key),
      ...(!hasPlayerFeedback?['STATE_TO_PLAYER_FEEDBACK_NOT_CONNECTED']:[]),
      ...(!inputEntrypoints.length?['GAMEPLAY_INPUT_EVENT_SOURCE_MISSING']:[]),
      ...(!runtimeValid?['THREE_REAL_WEBGL_SCENARIOS_NOT_VERIFIED']:missingNativeRuntimeTransitions
        .map(key=>'THREE_RUN_NATIVE_SYSTEM_TRANSITION_UNOBSERVED:'+key))
    ];
    return{
      systemId,role,staticComplete,runtimeComplete,failures,
      roleBoundNativeMethods:roleMethods.map(({file,name,line})=>({file,symbol:name,line})),
      declaredInputKeys:inputKeys,declaredOutputKeys:outputKeys,
      foundNativeStateDeclarationKeys:[...new Set([...inputKeys,...outputKeys])]
        .filter(key=>declaredStateNames.has(key)),
      reachableInputReaders:inputs,reachableOutputWriters:outputs,
      hasPlayerFeedback,unverifiedCodeMarkersAreNotPass:true
    };
  });
  const byRoleId=new Map(roleAudit.map(row=>[row.systemId,row]));
  const edges=interconnections.map(edge=>{
    const from=byRoleId.get(clean(edge.fromId)),to=byRoleId.get(clean(edge.toId));
    const keys=[...new Set((edge.stateKeys||[]).map(clean).filter(Boolean))];
    const reasons=[];
    if(!from||!to)reasons.push('EDGE_REFERENCES_UNKNOWN_DESIGN_SYSTEM');
    for(const key of keys){
      if(!from?.declaredOutputKeys.includes(key))reasons.push('PRODUCER_OUTPUT_NOT_AUTHORED:'+key);
      if(!to?.declaredInputKeys.includes(key))reasons.push('CONSUMER_INPUT_NOT_AUTHORED:'+key);
      if(!from?.reachableOutputWriters.some(x=>x.key===key&&x.writers.length))
        reasons.push('PRODUCER_LIVE_NATIVE_WRITE_MISSING:'+key);
      if(!to?.reachableInputReaders.some(x=>x.key===key&&x.owners.length))
        reasons.push('CONSUMER_LIVE_NATIVE_READ_MISSING:'+key);
    }
    return{fromId:clean(edge.fromId),toId:clean(edge.toId),stateKeys:keys,
      sourceConnectivityCandidate:reasons.length===0,runtimeVerified:false,failures:reasons};
  });
  const staticCoverageComplete=roleAudit.length>0&&problems.length===0
    &&roleAudit.every(row=>row.staticComplete)
    &&edges.every(edge=>edge.sourceConnectivityCandidate);
  const pass=staticCoverageComplete&&roleAudit.every(row=>row.runtimeComplete);
  return{
    version:1,gameId:id,platform:'UNITY_WEB',
    pass,status:pass?'SOURCE_SYSTEM_AND_RUNTIME_BEHAVIOR_VERIFIED':'NATIVE_SYSTEM_IMPLEMENTATION_REPAIR_REQUIRED',
    staticCoverageComplete,runtimeValid,
    algorithms:['INTERPROCEDURAL_CALL_GRAPH_BFS','FIELD_DEF_USE_DATA_FLOW',
      'PLAYER_INPUT_REACHABILITY','DESIGN_PRODUCER_CONSUMER_DEPENDENCY_PROOF',
      'THREE_RUN_STATE_TRANSITION_INTERSECTION','MUTATION_SENSITIVE_NEGATIVE_CANARIES'],
    sourceFiles:files.map(row=>row.file),nativeMethodCount:methods.length,
    callbackMethodCount:callbacks.length,inputEntrypointCount:inputEntrypoints.length,
    reachableMethodCount:callbackReachable.size,interactiveReachableMethodCount:eventReachable.size,
    ambiguousCalls:[...ambiguousCalls].sort(),problems,roles:roleAudit,
    edges,sourceStaticPassIsNeverActualRuntimePass:true,
    automatedAnalysisCannotProveFullCSemantics:true,
    actualCompilerAndWebglQaRemainMandatory:true
  };
}

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
  if(data.nativeSystemAuditRequired!==true||data.precisionQaRequired!==true)
    return{pass:false,reason:'READINESS_NATIVE_SYSTEM_CODE_AND_PRECISION_QA_NOT_YET_VERIFIED',data,currentTree};
  {
    const audit=data.nativeSystemAudit||{};
    if(data.nativeSystemAuditSourceTreeSha256!==currentTree
      ||data.criteria?.nativeSystems?.pass!==true||audit.pass!==true
      ||audit.gameId!==gameId||audit.platform!=='UNITY_WEB'
      ||audit.staticCoverageComplete!==true||audit.runtimeValid!==true
      ||audit.status!=='SOURCE_SYSTEM_AND_RUNTIME_BEHAVIOR_VERIFIED'
      ||!Array.isArray(audit.roles)||audit.roles.length===0
      ||audit.roles.some(role=>role.staticComplete!==true||role.runtimeComplete!==true
        ||!Array.isArray(role.reachableOutputWriters)
        ||role.reachableOutputWriters.some(out=>out.runtimeObserved!==true||!out.writers?.length))
      ||!Array.isArray(audit.edges)||audit.edges.some(edge=>edge.sourceConnectivityCandidate!==true)
      ||!Number.isInteger(audit.inputEntrypointCount)||audit.inputEntrypointCount<1)
      return{pass:false,reason:'READINESS_REAL_NATIVE_GAME_SYSTEM_IMPLEMENTATION_REQUIRED',data,currentTree};
  }
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
