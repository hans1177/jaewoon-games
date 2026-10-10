import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyUpperPlatformAdmission,
  unitySourceTreeSha256,
  evaluateUnityWebBuildUpGrowth,
  auditUnityWebNativeSystems,
  evaluateUnityWebPrecisionQa,
} from '../tools/company-upper-platform-admission.mjs';

const write=(root,rel,data)=>{
  const file=path.join(root,rel);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2));
};
const baseItem=gameId=>({
  gameId,
  minimumDesignContract:{pass:true},
  platformDesignProfiles:{ROBLOX:{source:'design.json'},UNITY:{source:'design.json'}},
  concurrentTargetPlatforms:['ROBLOX','UNITY'],
  currentStep:'TARGET_PLATFORM_SOURCE_BIND',
});

const withNativeSystemAndPrecisionEvidence=(evidence,id,sourceTree)=>({
  ...evidence,nativeSystemAuditRequired:true,precisionQaRequired:true,
  nativeSystemAuditSourceTreeSha256:sourceTree,
  criteria:{...evidence.criteria,
    nativeSystems:{pass:true},precisionQa:{pass:true}},
  nativeSystemAudit:{
    gameId:id,platform:'UNITY_WEB',pass:true,
    staticCoverageComplete:true,runtimeValid:true,
    status:'SOURCE_SYSTEM_AND_RUNTIME_BEHAVIOR_VERIFIED',
    inputEntrypointCount:1,
    roles:[{
      systemId:'RULE_A',role:'MAIN',staticComplete:true,runtimeComplete:true,
      reachableOutputWriters:[{key:'GameState',runtimeObserved:true,writers:[
        {file:'unity-games/'+id+'/Assets/Scripts/Game.cs',symbol:'Act',line:12}
      ]}]
    }],
    edges:[]
  },
  precisionQa:{
    gameId:id,platform:'UNITY_WEB',pass:true,
    status:'VERIFIED_THREE_DISTINCT_REAL_BROWSER_SCENARIOS',
    checks:['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'].map(stage=>({stage,pass:true}))
  }
});


test('Unity Web C# code audit verifies two different authored systems through real input, state def-use, feedback and 3-run state transitions',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-native-system-audit-'));
  const id='native-systems';
  const file='unity-games/'+id+'/Assets/Scripts/LiveGame.cs';
  const code=[
    'using UnityEngine;',
    'public sealed class LiveGame : MonoBehaviour {',
    ' public int RouteState; public int RiskState; public int ResourceState;',
    ' private string _message;',
    ' public void OnGUI(){ if(GUI.Button(new Rect(0,0,64,64),"Explore")) ExecuteAction(); }',
    ' private void ExecuteAction(){ RiskState=RouteState+1; ResourceState=RiskState+5; _message="Reward acquired"; '+
    'Debug.Log("JAEWOON_UNITY_WEB_QA SYSTEM_STATE game=native-systems system=SOURCE_MAIN state=RiskState before="); '+
    'Debug.Log("JAEWOON_UNITY_WEB_QA SYSTEM_STATE game=native-systems system=SOURCE_A state=ResourceState before="); }',
    ' public void Update(){ GUILayout.Label(ResourceState.ToString()); }',
    '}'
  ].join('\n');
  const design={content:{
    signatureSystems:[
      {id:'SOURCE_MAIN',grammarRole:'MAIN',stateInputs:['RouteState'],stateOutputs:['RiskState']},
      {id:'SOURCE_A',grammarRole:'A',stateInputs:['RiskState'],stateOutputs:['ResourceState']}
    ],
    systemInterconnections:[{fromId:'SOURCE_MAIN',toId:'SOURCE_A',stateKeys:['RiskState']}]
  }};
  const transitionLines=[
    'JAEWOON_UNITY_WEB_QA SYSTEM_STATE game='+id+' system=SOURCE_MAIN state=RiskState before=0 after=1 status=PASS',
    'JAEWOON_UNITY_WEB_QA SYSTEM_STATE game='+id+' system=SOURCE_A state=ResourceState before=0 after=6 status=PASS'
  ];
  const proofs={
    play:{gameId:id,pass:true,spatialGameplay:{pass:true},
      precisionQa:{scenarioId:'actual-play',pass:true,liveSystemMarkers:transitionLines}},
    independent:{gameId:id,pass:true,spatialGameplay:{pass:true},
      precisionQa:{scenarioId:'independent-qa',pass:true,liveSystemMarkers:transitionLines}},
    regression:{gameId:id,pass:true,spatialGameplay:{pass:true},
      precisionQa:{scenarioId:'regression',pass:true,liveSystemMarkers:transitionLines}},
  };
  const inspect=(override={})=>auditUnityWebNativeSystems({
    repoRoot:root,gameId:id,designRecord:design,...proofs,...override
  });
  try{
    write(root,file,code);
    const result=inspect();
    assert.equal(result.pass,true,JSON.stringify(result.roles.map(row=>row.failures)));
    assert.equal(result.staticCoverageComplete,true);
    assert.equal(result.nativeMethodCount,3);
    assert.equal(result.roles.length,2);
    assert.equal(result.edges[0].sourceConnectivityCandidate,true);
    assert.equal(result.inputEntrypointCount,1);
    assert.ok(result.algorithms.includes('INTERPROCEDURAL_CALL_GRAPH_BFS'));
    assert.ok(result.algorithms.includes('FIELD_DEF_USE_DATA_FLOW'));
    assert.ok(result.roles.every(row=>row.reachableOutputWriters.every(
      out=>out.writers.some(writer=>writer.symbol==='ExecuteAction'))));
    assert.ok(result.roles.every(row=>row.runtimeComplete));

    // Mutation testing: a C# method that is no longer called from a real UI event cannot pass.
    write(root,file,code.replace('ExecuteAction();',';'));
    const unreachable=inspect();
    assert.equal(unreachable.pass,false);
    assert.equal(unreachable.interactiveReachableMethodCount,1);
    assert.ok(unreachable.roles.some(row=>row.failures.some(reason=>reason.startsWith('PLAYER_INPUT_TO_STATE_WRITE_UNREACHABLE:'))));

    // Comments, debug strings and "fake" PASS markers do not count as C# field assignment.
    write(root,file,code.replace('ResourceState=RiskState+5;', '/* ResourceState=RiskState+5; */ Debug.Log("ResourceState=99");'));
    const comment=inspect();
    assert.equal(comment.pass,false);
    assert.ok(comment.roles.find(row=>row.systemId==='SOURCE_A')
      .failures.includes('PLAYER_INPUT_TO_STATE_WRITE_UNREACHABLE:ResourceState'));

    // Identity writes and no-op mutation cannot satisfy the behavior contract.
    write(root,file,code.replace('ResourceState=RiskState+5;', 'ResourceState=ResourceState;'));
    const noOp=inspect();
    assert.equal(noOp.pass,false);
    assert.ok(noOp.roles.find(row=>row.systemId==='SOURCE_A')
      .failures.includes('PLAYER_INPUT_TO_STATE_WRITE_UNREACHABLE:ResourceState'));

    // A state identifier declared only as a local variable is not game-owned state.
    write(root,file,code.replace('public int RouteState;','')
      .replace('RiskState=RouteState+1;', 'int RouteState=7; RiskState=RouteState+1;'));
    const shadow=inspect();
    assert.equal(shadow.pass,false);
    assert.ok(shadow.roles[0].failures.includes('NATIVE_FIELD_OR_PROPERTY_MISSING:RouteState'));

    write(root,file,code);
    const missingSecondRun=inspect({independent:{
      ...proofs.independent,
      precisionQa:{...proofs.independent.precisionQa,liveSystemMarkers:transitionLines.slice(0,1)}
    }});
    assert.equal(missingSecondRun.staticCoverageComplete,true);
    assert.equal(missingSecondRun.pass,false);
    assert.ok(missingSecondRun.roles[1].failures
      .includes('THREE_RUN_NATIVE_SYSTEM_TRANSITION_UNOBSERVED:ResourceState'));
    const forgedNoTransition=inspect({play:{
      ...proofs.play,precisionQa:{...proofs.play.precisionQa,liveSystemMarkers:[
        transitionLines[0].replace('after=1','after=0'),transitionLines[1]
      ]}
    }});
    assert.equal(forgedNoTransition.pass,false);
    const missingDesign=inspect({designRecord:{}});
    assert.equal(missingDesign.pass,false);
    assert.ok(missingDesign.problems.includes('VERIFIED_DESIGN_SIGNATURE_SYSTEMS_REQUIRED'));
    const wrongEdges=inspect({designRecord:{content:{
      ...design.content,systemInterconnections:[{fromId:'SOURCE_MAIN',toId:'SOURCE_A',stateKeys:['ResourceState']}]
    }}});
    assert.equal(wrongEdges.pass,false);
    assert.ok(wrongEdges.edges[0].failures.includes('PRODUCER_OUTPUT_NOT_AUTHORED:ResourceState'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// 회귀/변이 검증: 각 설계 핵심 시스템의 고유 C# 메서드가 실제 UI 입력에서
// 호출돼야 하며, 타 시스템의 동일 상태 기록으로 대체되어서는 안 된다.
// 정적 검증은 독립 브라우저 3회 결과 없이 절대로 최종 PASS가 되지 않는다.
test('Daechung four design systems each own real C# input-to-state code; disconnect one to fail closed',()=>{
  const originalRoot=path.resolve(new URL('../',import.meta.url).pathname);
  const id='daechung-rpg';
  const design={content:{signatureSystems:[
    {id:'VIBE_MAIN',grammarRole:'MAIN',stateInputs:['WorldAccessState','IntentState'],
      stateOutputs:['RouteState','WorldAccessState']},
    {id:'VIBE_A',grammarRole:'A',stateInputs:['RouteState','RiskState'],
      stateOutputs:['RiskState','ResourceState']},
    {id:'VIBE_B',grammarRole:'B',stateInputs:['RiskState','ResourceState'],
      stateOutputs:['RouteState','RiskState']},
    {id:'VIBE_DELVE',grammarRole:'DELVE',stateInputs:['RouteState','RiskState'],
      stateOutputs:['WorldAccessState','IntentState']}
  ]}};
  const inspect=root=>auditUnityWebNativeSystems({repoRoot:root,gameId:id,designRecord:design});
  const source=inspect(originalRoot);
  assert.equal(source.roles.length,4);
  assert.equal(source.staticCoverageComplete,true,JSON.stringify(source.roles.map(
    role=>({id:role.systemId,failures:role.failures,handlers:role.roleBoundNativeMethods}))));
  assert.equal(source.pass,false,'C# source static coverage alone cannot prove a compiled WebGL playtest');
  assert.equal(source.runtimeValid,false);
  for(const role of source.roles){
    assert.equal(role.staticComplete,true,role.systemId);
    assert.ok(role.roleBoundNativeMethods.some(method=>method.symbol==='Record'+({
      VIBE_MAIN:'WorldChoice',VIBE_A:'ConsequenceChoice',
      VIBE_B:'ExplorationOutcome',VIBE_DELVE:'DelveOutcome'
    })[role.systemId]),role.systemId);
  }
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'daechung-system-role-mutation-'));
  try{
    const relative='unity-games/'+id+'/Assets/Scripts';
    const nativeScripts=path.join(originalRoot,relative);
    const copiedScripts=path.join(root,relative);
    fs.mkdirSync(path.dirname(copiedScripts),{recursive:true});
    fs.cpSync(nativeScripts,copiedScripts,{recursive:true});
    const runtime=path.join(copiedScripts,'RuntimeBootstrap.cs');
    const original=fs.readFileSync(runtime,'utf8');
    for(const [role,call] of [
      ['VIBE_MAIN','_core.RecordWorldChoice();'],
      ['VIBE_A','_core.RecordConsequenceChoice();'],
      ['VIBE_B','_core.RecordExplorationOutcome();'],
      ['VIBE_DELVE','_core.RecordDelveOutcome();']
    ]){
      assert.ok(original.includes(call),call);
      fs.writeFileSync(runtime,original.replace(call,''));
      const mutated=inspect(root);
      assert.equal(mutated.staticCoverageComplete,false,'mutation of '+role+' must block static acceptance');
      assert.equal(mutated.roles.find(row=>row.systemId===role).staticComplete,false);
      assert.ok(mutated.roles.find(row=>row.systemId===role).failures.some(
        reason=>reason.startsWith('DESIGN_SYSTEM_OWN_NATIVE_INPUT_STATE_HANDLER_MISSING')
          ||reason.startsWith('PLAYER_INPUT_TO_STATE_WRITE_UNREACHABLE')),
        role);
      fs.writeFileSync(runtime,original);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// 3D 검증은 출력 문구가 아닌 Unity MeshFilter 및 실제 OBJ 임포트만 대상으로 한다.
// 이 정적 회귀 테스트 통과만으로 실제 WebGL 장면 검증을 통과 처리하지 않는다.
test('Daechung Unity Web canonical actors use imported 3D OBJ not active SpriteRenderer gameplay',()=>{
  const root=path.resolve(new URL('../',import.meta.url).pathname);
  const models=['torso_cloth','head_canine','shoulder_light','boar',
    'flamefox','leafturtle','hornbull','rockgator','stormeagle'];
  const directory=path.join(root,'unity-games/daechung-rpg/Assets/Art/Resources/DaechungModels');
  for(const model of models){
    const file=path.join(directory,model+'.obj');
    assert.ok(fs.existsSync(file),'missing original Unity-importable 3D OBJ: '+model);
    assert.ok(fs.statSync(file).size>300,'empty or placeholder source mesh: '+model);
    // 원본 3D 모델을 단순 문자열/평면/가짜 면 데이터로 바꾸면 정적 검사부터 차단한다.
    const lines=fs.readFileSync(file,'utf8').split(/\\r?\\n/);
    const vertices=lines.filter(line=>/^v\\s+/.test(line))
      .map(line=>line.trim().split(/\\s+/).slice(1,4).map(Number));
    const faces=lines.filter(line=>/^f\\s+/.test(line));
    assert.ok(vertices.length>8&&faces.length>8,'missing native mesh geometry: '+model);
    assert.ok(vertices.every(vertex=>vertex.length===3&&vertex.every(Number.isFinite)),
      'invalid 3D source vertices: '+model);
    const bounds=[0,1,2].map(axis=>{
      const values=vertices.map(vertex=>vertex[axis]);
      return Math.max(...values)-Math.min(...values);
    });
    assert.ok(bounds.every(value=>value>0.02),'flat or degenerate 3D source: '+model);
    for(const face of faces){
      const indices=face.trim().split(/\\s+/).slice(1).map(value=>Number(value.split('/')[0]));
      assert.ok(indices.length>=3&&indices.every(index=>Number.isInteger(index)
        &&index>=1&&index<=vertices.length),'invalid 3D faces: '+model);
    }
  }
  const visual=fs.readFileSync(path.join(root,
    'unity-games/daechung-rpg/Assets/Scripts/PrototypeAnimatedVisuals.cs'),'utf8');
  assert.doesNotMatch(visual,/AddComponent<SpriteRenderer>\s*\(/);
  assert.match(visual,/Resources\.Load<GameObject>\("DaechungModels\/" \+ modelId\)/);
  assert.match(visual,/GetComponentsInChildren<MeshFilter>/);
  assert.match(visual,/worldMeshes3d >= 2 && worldDepthCm >= 50/);
  assert.match(visual,/spriteGameplayActors == 0/);
  assert.match(visual,/SPATIAL_DEPTH game=daechung-rpg/);
  assert.match(visual,/NativeMeshReady/);
  // 원격 픽셀 시트가 로드되더라도 네이티브 3D 임포트 실패가 PASS로 뒤집히면 안 된다.
  assert.doesNotMatch(visual,/^\\s*_ready\\s*=\\s*true;\\s*$/m);
  assert.match(visual,/if \\(!_enemy\\.NativeMeshReady\\)/);
  assert.match(visual,/if \\(!_ready \\|\\| !_player\\.NativeMeshReady \\|\\| !_enemy\\.NativeMeshReady/);
  assert.match(visual,/REPAIR_REQUIRED · NATIVE 3D MODEL/);
});

test('Unity Web full precision gate refuses fake state transitions and requires a distinct replay after reload',()=>{
  const id='precision-systems',hash='c'.repeat(64);
  const proof=(scenario)=>({
    engine:'UNITY_WEB',gameId:id,playableBrowserTest:true,boot:{pass:true},
    input:{pass:true},mobile:{realGameTouchHandlerObserved:true},
    saveRestore:{pass:true,persistentChangedKeys:['gold'],restoredKeys:['gold']},
    spatialGameplay:{requiredDimension:'3D',pass:true,depthPass:true,
      perspectiveCamera:true,observedMeshCount:4,observedTriangles:180},
    visualQa:{
      nativeUnityMesh:{pass:true},
      renderedScene:{pass:true,sceneCapturePersisted:true,sceneCaptureSha256:hash,
        pixels:{source:'REAL_UNITY_CANVAS_SCREENSHOT'}}
    },
    precisionQa:{
      version:1,gameId:id,scenarioId:scenario,pass:true,
      runtimeOrigin:'PLAYWRIGHT_CHROMIUM_ANDROID_PROFILE_REAL_WEBGL_BUILD',
      distinctRoute:scenario==='independent-qa'?'REAL_BROWSER_TOUCH_FIRST':'KEYBOARD_DIGIT1',
      markerOnlyPassForbidden:true,saveRestoreConfirmed:true,
      liveActionState:{
        measuredFromNativeGameState:true,actionAfterLiveEntry:true,rewardAfterLiveActions:true,
        coreFunAfterLiveActions:true,
        stateMeasuredBefore:'JAEWOON_UNITY_WEB_QA STATE gold=0',
        stateMeasuredAfter:'JAEWOON_UNITY_WEB_QA STATE gold=5',
        changedKeys:['gold']
      },
      secondaryCycleRequired:scenario==='regression',
      secondaryCycle:scenario==='regression'?{
        pass:true,resumedAfterReload:true,mobileInputObserved:true,actionObserved:true,
        rewardObserved:true,changedPersistentKeys:['gold']
      }:null
    }
  });
  const params={
    gameId:id,
    play:proof('actual-play'),
    independent:proof('independent-qa'),
    regression:proof('regression')
  };
  assert.equal(evaluateUnityWebPrecisionQa(params).pass,true);
  assert.equal(evaluateUnityWebPrecisionQa({...params,independent:{
    ...params.independent,
    precisionQa:{...params.independent.precisionQa,distinctRoute:'KEYBOARD_DIGIT1'}
  }}).pass,false,'the independent run must actually start from real touch');
  assert.equal(evaluateUnityWebPrecisionQa({...params,regression:{
    ...params.regression,
    precisionQa:{...params.regression.precisionQa,secondaryCycle:null}
  }}).pass,false,'regression must repeat a real game cycle after save reload');
  assert.equal(evaluateUnityWebPrecisionQa({...params,play:{
    ...params.play,
    precisionQa:{...params.play.precisionQa,liveActionState:{
      ...params.play.precisionQa.liveActionState,
      stateMeasuredBefore:'JAEWOON_UNITY_WEB_QA STATE gold=5'
    }}
  }}).pass,false,'unchanged native state does not prove the action');
});

test('Unity Web existing F0-F9 build workflow audits real C# source and runtime state across different WebGL scenarios',()=>{
  const source=fs.readFileSync(new URL('../tools/company-unity-web-gameplay-validation.mjs',import.meta.url),'utf8');
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/--scenario=actual-play/);
  assert.match(workflow,/--scenario=independent-qa/);
  assert.match(workflow,/--scenario=regression/);
  assert.match(workflow,/auditUnityWebNativeSystems/);
  assert.match(workflow,/verifiedDesignRecord=JSON\.parse\(execFileSync\('git',\['show'/);
  assert.match(workflow,/nativeSystems:\{pass:nativeSystemAudit\.pass/);
  assert.match(workflow,/precisionQa:\{pass:precisionQa\.pass/);
  assert.match(workflow,/nativeSystemAuditRequired:true/);
  assert.match(workflow,/precisionQaRequired:true/);
  assert.match(source,/liveSystemMarkers=markers\.slice\(combatMarkerStart\)/);
  assert.match(source,/UNITY_WEB_QA_REGRESSION_REAL_SECOND_CYCLE_MISSING/);
  assert.match(source,/UNITY_WEB_QA_REAL_GAMEPLAY_STATE_TRANSITION_MISSING/);
  const native=fs.readFileSync(new URL('../tools/company-upper-platform-admission.mjs',import.meta.url),'utf8');
  assert.match(native,/INTERPROCEDURAL_CALL_GRAPH_BFS/);
  assert.match(native,/FIELD_DEF_USE_DATA_FLOW/);
  assert.match(native,/THREE_RUN_STATE_TRANSITION_INTERSECTION/);
  assert.match(native,/READINESS_REAL_NATIVE_GAME_SYSTEM_IMPLEMENTATION_REQUIRED/);
});

test('Unity Web BUILD_UP records source and three actual browser observations without claiming baseline growth',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-observed-growth-'));
  const id='observed-growth';
  const unity='unity-games/'+id+'/Assets/';
  const shape=marker=>({
    gameId:id,pass:true,playableBrowserTest:true,boot:{pass:true},
    gameplay:{pass:true},coreFun:{pass:true},saveRestore:{pass:true,restoredKeys:['gold']},
    mobile:{pass:true},
    spatialGameplay:{requiredDimension:'3D',pass:true,observedMeshCount:8,worldMeshes3d:6,gameplayActors3d:2},
    visualQa:{renderedScene:{pass:true,sceneCaptureSha256:'a'.repeat(64),
      pixels:{source:'REAL_UNITY_CANVAS_SCREENSHOT',distinctColorBuckets:160}}},
    performance:{framePacing:{p95FrameMs:60},bootMilliseconds:2200},
    markers:['JAEWOON_UNITY_WEB_QA CORE_FUN game='+id+' status=PASS',
      'JAEWOON_UNITY_WEB_QA REGION game='+id+' region=forest']
  });
  const check=(sourceTreeSha256,previousReadiness=null,focus='CORE_FUN',overrides={})=>{
    const proof=shape();
    const play={...proof,...(overrides.play||{})};
    const independent={...proof,...(overrides.independent||{})};
    const regression={...proof,...(overrides.regression||{})};
    return evaluateUnityWebBuildUpGrowth({
      repoRoot:root,gameId:id,sourceTreeSha256,previousReadiness,
      play,independent,regression,focus
    });
  };
  try{
    write(root,unity+'Scripts/GameCore.cs','public class GameCore { public int Health; public void Attack(){ Health -= 2; } }');
    write(root,unity+'Prefabs/Tree.prefab','MeshRenderer tree');
    const first=check('1'.repeat(64));
    assert.equal(first.status,'INITIAL_VERIFIED_BROWSER_BASELINE_NO_PRIOR_COMPARISON');
    assert.equal(first.verifiedGrowth,false);
    assert.equal(first.observed.source.scriptsFiles,1);
    assert.equal(first.observed.source.graphicsFiles,1);
    assert.equal(first.runtimeQaVerified,true);
    assert.equal(first.noArtificialContentCountOrGenerationLimit,true);

    const previous={gameId:id,pass:true,unitySourceTreeSha256:'1'.repeat(64),buildUpGrowth:first};
    const unchanged=check('1'.repeat(64),previous);
    assert.equal(unchanged.status,'UNCHANGED_UNITY_SOURCE_REVALIDATION_NOT_GROWTH');
    assert.equal(unchanged.verifiedGrowth,false);

    write(root,unity+'Scripts/GameCore.cs','// new level boss pending\npublic class GameCore { public int Health; public void Attack(){ Health -= 2; } }');
    const commentOnly=check('2'.repeat(64),previous,'CORE_FUN');
    assert.equal(commentOnly.status,'NON_GAME_SOURCE_CHANGE_NOT_GROWTH');
    assert.deepEqual(commentOnly.changedKinds,[]);
    assert.equal(commentOnly.verifiedGrowth,false);

    write(root,unity+'Scripts/GameCore.cs','public class GameCore { public int Health; public void Attack(){ Health -= 2; } public void EnterCave(){ Health -= 1; } }');
    const caveMarkers=[...shape().markers,
      'JAEWOON_UNITY_WEB_QA STATE game='+id+' region=cave',
      'JAEWOON_UNITY_WEB_QA REGION game='+id+' region=cave'];
    const caveState={pass:true,restoredKeys:['gold','caveCleared']};
    const actual=check('3'.repeat(64),previous,'CORE_FUN',{
      play:{markers:caveMarkers,saveRestore:caveState},
      independent:{markers:caveMarkers,saveRestore:caveState},
      regression:{markers:caveMarkers,saveRestore:caveState}
    });
    assert.equal(actual.status,'VERIFIED_PLAYER_FACING_GROWTH');
    assert.equal(actual.verifiedGrowth,true);
    assert.deepEqual(actual.signals.newContentIds,['region:cave']);
    assert.deepEqual(actual.signals.newPersistentStateKeys,['caveCleared']);
    assert.deepEqual(actual.changedKinds,['scripts']);

    const staticOnly=check('4'.repeat(64),previous,'CORE_FUN');
    assert.equal(staticOnly.verifiedGrowth,false);
    assert.equal(staticOnly.status,'SOURCE_CHANGED_PLAYER_FACING_GROWTH_UNVERIFIED');
    const improvedScene={renderedScene:{pass:true,sceneCaptureSha256:'b'.repeat(64),
      pixels:{source:'REAL_UNITY_CANVAS_SCREENSHOT',distinctColorBuckets:162}}};
    const pixelOnly=check('4'.repeat(64),previous,'PRESENTATION',{
      play:{visualQa:improvedScene},
      independent:{visualQa:improvedScene},
      regression:{visualQa:improvedScene}
    });
    assert.equal(pixelOnly.verifiedGrowth,true,'a valid changed Unity native source and visible browser image can prove presentation changes');
    const invalidRuntime=check('4'.repeat(64),previous,'CORE_FUN',{independent:{pass:false}});
    assert.equal(invalidRuntime.runtimeQaVerified,false);
    assert.equal(invalidRuntime.verifiedGrowth,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Web growth comparison never treats markers or arbitrary new data file counts as player growth',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-unverified-'));
  const id='growth-unverified';
  const base='unity-games/'+id+'/Assets/';
  try{
    write(root,base+'Scripts/World.cs','public class World { void Update(){ } }');
    const qa=()=>({
      gameId:id,pass:true,playableBrowserTest:true,boot:{pass:true},gameplay:{pass:true},
      coreFun:{pass:true},saveRestore:{pass:true,restoredKeys:['gold']},mobile:{pass:true},
      spatialGameplay:{pass:true,requiredDimension:'3D',observedMeshCount:2,worldMeshes3d:2,gameplayActors3d:1},
      visualQa:{renderedScene:{pass:true,sceneCaptureSha256:'a'.repeat(64),pixels:{source:'REAL_UNITY_CANVAS_SCREENSHOT',distinctColorBuckets:40}}},
      markers:['JAEWOON_UNITY_WEB_QA CORE_FUN game='+id+' status=PASS'],
      performance:{framePacing:{p95FrameMs:60},bootMilliseconds:2000}
    });
    const run=(sourceTreeSha256,previousReadiness)=>evaluateUnityWebBuildUpGrowth({
      repoRoot:root,gameId:id,sourceTreeSha256,previousReadiness,
      play:qa(),independent:qa(),regression:qa()
    });
    const before=run('1'.repeat(64),null);
    const previous={pass:true,gameId:id,unitySourceTreeSha256:'1'.repeat(64),buildUpGrowth:before};
    write(root,base+'Data/fake.json',{newContent:'NEVER_USED_IN_RUNTIME'});
    const after=run('2'.repeat(64),previous);
    assert.deepEqual(after.changedKinds,['content']);
    assert.equal(after.verifiedGrowth,false);
    assert.equal(after.status,'SOURCE_CHANGED_PLAYER_FACING_GROWTH_UNVERIFIED');
    assert.equal(after.signals.gameplay,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Web existing readiness stage consumes growth proof without changing Roblox workflow or F0-F9 sequence',()=>{
  const root=process.cwd();
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/unity-web-first-stage-build.yml'),'utf8');
  assert.match(workflow,/evaluateUnityWebBuildUpGrowth/);
  assert.match(workflow,/buildUpGrowthRequired/);
  assert.match(workflow,/buildUpGrowth:\{pass:growth\.verifiedGrowth/);
  assert.match(workflow,/manifest\.buildUpGrowth=/);
  assert.match(workflow,/taskPhase==='BUILD_UP'/);
  assert.match(workflow,/const pass=Object\.values\(criteria\)\.every\(row=>row\.pass===true\)/);
  const continuous=fs.readFileSync(path.join(root,'.github/workflows/vibe2-continuous-core.yml'),'utf8');
  assert.match(continuous,/F9/);
});

test('Unity Web required growth gate fails closed without main source-bound runtime evidence',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-growth-readiness-'));
  const gameId='growth-readiness';
  try{
    write(root,'unity-games/'+gameId+'/Assets/Scripts/GameCore.cs','public class GameCore { public void Play(){} }');
    write(root,'unity-games/'+gameId+'/Assets/Editor/WebBuild.cs','public static class WebBuild { public static void BuildWeb(){} }');
    const sourceTree=unitySourceTreeSha256(path.join(root,'unity-games',gameId));
    const record={
      version:1,gameId,state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true,
      unitySourceTreeSha256:sourceTree,releaseOrDeploymentAuthority:false,
      buildUpGrowthRequired:true,
      criteria:{
        design:{pass:true},code:{pass:true},
        graphics:{pass:true,native3dVerified:true,requiredDimension:'3D',
          native3dChecks:['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'].map(stage=>({
            stage,pass:true,requiredDimension:'3D',
            source:'UNITY_RUNTIME_MESH_FILTER_TRIANGLE_AND_3AXIS_WORLD_DEPTH_PROOF',
            observedMeshCount:5,observedTriangles:150,depthPass:true,perspectiveCamera:true,
            worldMeshes3d:5,worldDepthCm:150,gameplayActors3d:1,spriteGameplayActors:0
          }))},
        webglBuild:{pass:true},actualPlay:{pass:true},qa:{pass:true},portability:{pass:true},
        buildUpGrowth:{pass:false}
      }
    };
    const evidence='web-games/'+gameId+'/upper-platform-development-readiness.json';
    write(root,evidence,record);
    let result=classifyUpperPlatformAdmission(baseItem(gameId),{repoRoot:root});
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_BUILD_UP_GROWTH_EVIDENCE_REQUIRED');
    record.criteria.buildUpGrowth.pass=true;
    record.buildUpGrowth={
      gameId,platform:'UNITY_WEB',status:'VERIFIED_PLAYER_FACING_GROWTH',
      verifiedGrowth:true,runtimeQaVerified:true,comparisonAvailable:true,
      sourceTreeSha256:sourceTree,previousSourceTreeSha256:'f'.repeat(64)
    };
    write(root,evidence,record);
    result=classifyUpperPlatformAdmission(baseItem(gameId),{repoRoot:root});
    assert.equal(result.web.reason,'READINESS_NATIVE_SYSTEM_CODE_AND_PRECISION_QA_NOT_YET_VERIFIED');
    const complete=withNativeSystemAndPrecisionEvidence(record,gameId,sourceTree);
    write(root,evidence,complete);
    result=classifyUpperPlatformAdmission(baseItem(gameId),{repoRoot:root});
    assert.equal(result.web.state,'UNITY_WEB_VERIFIED');
    complete.buildUpGrowth.previousSourceTreeSha256=sourceTree;
    write(root,evidence,complete);
    result=classifyUpperPlatformAdmission(baseItem(gameId),{repoRoot:root});
    assert.equal(result.web.reason,'READINESS_BUILD_UP_GROWTH_EVIDENCE_REQUIRED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('new upper-platform entry stays in Unity Web floor until readiness exists',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-floor-'));
  try{
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    const result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_EVIDENCE_MISSING');
    assert.equal(result.web.buildMethod,'Demo.WebBuild.BuildWeb');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('seven-domain pass only opens Unity Web after exact native C# system and precision evidence',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-ready-'));
  try{
    write(root,'unity-games/new-game/Assets/Scripts/Game.cs','public class Game {}');
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    const tree=unitySourceTreeSha256(path.join(root,'unity-games/new-game'));
    const readiness={
      version:1,gameId:'new-game',state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true,
      unitySourceTreeSha256:tree,releaseOrDeploymentAuthority:false,
      criteria:{
        design:{pass:true},code:{pass:true},graphics:{pass:true,native3dVerified:true,requiredDimension:'3D',native3dChecks:[
          ...['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'].map(stage=>({
            stage,pass:true,requiredDimension:'3D',source:'UNITY_RUNTIME_MESH_FILTER_TRIANGLE_AND_3AXIS_WORLD_DEPTH_PROOF',
            observedMeshCount:6,observedTriangles:240,depthPass:true,perspectiveCamera:true,
             worldMeshes3d:6,worldDepthCm:450,gameplayActors3d:2,spriteGameplayActors:0
          }))
        ]},webglBuild:{pass:true},
        actualPlay:{pass:true},qa:{pass:true},portability:{pass:true}
      }
    };
    const file='web-games/new-game/upper-platform-development-readiness.json';
    write(root,file,readiness);
    let result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.web.reason,'READINESS_NATIVE_SYSTEM_CODE_AND_PRECISION_QA_NOT_YET_VERIFIED');
    write(root,file,withNativeSystemAndPrecisionEvidence(readiness,'new-game',tree));
    result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.reason,'MINIMUM_DESIGN_READY');
    assert.equal(result.grandfathered,false);
    assert.equal(result.web.state,'UNITY_WEB_VERIFIED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('older 2D readiness and boolean-only 3D markers cannot reopen Unity Web development gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-3d-proof-'));
  try{
    write(root,'unity-games/new-game/Assets/Scripts/Game.cs','public class Game {}');
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs','namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }');
    const tree=unitySourceTreeSha256(path.join(root,'unity-games/new-game'));
    const evidence={
      version:1,gameId:'new-game',state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true,
      unitySourceTreeSha256:tree,releaseOrDeploymentAuthority:false,
      criteria:{
        design:{pass:true},code:{pass:true},graphics:{pass:true,native3dVerified:true},
        webglBuild:{pass:true},actualPlay:{pass:true},qa:{pass:true},portability:{pass:true}
      }
    };
    write(root,'web-games/new-game/upper-platform-development-readiness.json',evidence);
    let result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_NATIVE_3D_MESH_EVIDENCE_REQUIRED');
    evidence.criteria.graphics={pass:true,native3dVerified:true,requiredDimension:'3D',native3dChecks:[
      ...['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'].map(stage=>({
        stage,pass:true,requiredDimension:'3D',source:'UNITY_RUNTIME_MESH_FILTER_AND_TRIANGLE_PROOF',
        observedMeshCount:0,observedTriangles:0
      }))
    ]};
    write(root,'web-games/new-game/upper-platform-development-readiness.json',evidence);
    result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_NATIVE_3D_MESH_EVIDENCE_REQUIRED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('pseudo 2.5D sprite actors fail admission even when the terrain has genuine 3D triangles',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-sprite-gate-'));
  try{
    write(root,'unity-games/flat-actors/Assets/Scripts/Game.cs','public class Game {}');
    write(root,'unity-games/flat-actors/Assets/Editor/WebBuild.cs','public static class WebBuild { public static void BuildWeb(){} }');
    const tree=unitySourceTreeSha256(path.join(root,'unity-games/flat-actors'));
    write(root,'web-games/flat-actors/upper-platform-development-readiness.json',{
      version:1,gameId:'flat-actors',state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true,
      unitySourceTreeSha256:tree,releaseOrDeploymentAuthority:false,
      criteria:{
        design:{pass:true},code:{pass:true},
        graphics:{pass:true,native3dVerified:true,requiredDimension:'3D',native3dChecks:
          ['BROWSER_PLAY','INDEPENDENT_QA','REGRESSION'].map(stage=>({
            stage,pass:true,requiredDimension:'3D',
            source:'UNITY_RUNTIME_MESH_FILTER_TRIANGLE_AND_3AXIS_WORLD_DEPTH_PROOF',
            observedMeshCount:6,observedTriangles:240,depthPass:true,perspectiveCamera:true,
            worldMeshes3d:6,worldDepthCm:450,gameplayActors3d:0,spriteGameplayActors:2
          }))},
        webglBuild:{pass:true},actualPlay:{pass:true},qa:{pass:true},portability:{pass:true}
      }
    });
    const state=classifyUpperPlatformAdmission(baseItem('flat-actors'),{repoRoot:root});
    assert.equal(state.web.state,'UNITY_WEB_FLOOR');
    assert.equal(state.web.reason,'READINESS_NATIVE_3D_MESH_EVIDENCE_REQUIRED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity source drift invalidates readiness and returns the new game to Unity Web floor',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-stale-'));
  try{
    write(root,'unity-games/new-game/Assets/Scripts/Game.cs','public class Game {}');
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    const tree=unitySourceTreeSha256(path.join(root,'unity-games/new-game'));
    write(root,'web-games/new-game/upper-platform-development-readiness.json',{
      version:1,gameId:'new-game',state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true,
      unitySourceTreeSha256:tree,releaseOrDeploymentAuthority:false,
      criteria:{
        design:{pass:true},code:{pass:true},graphics:{pass:true},webglBuild:{pass:true},
        actualPlay:{pass:true},qa:{pass:true},portability:{pass:true}
      }
    });
    write(root,'unity-games/new-game/Assets/Scripts/Game.cs','public class Game { public int Changed; }');
    const result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_SOURCE_STALE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('already-started native games remain grandfathered from durable progress evidence without an explicit game allowlist',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-grandfather-'));
  try{
    const item={...baseItem('existing-game'),currentStep:'TARGET_PLATFORM_SOURCE_BIND',robloxFoundationF0Passed:true};
    const result=classifyUpperPlatformAdmission(item,{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.reason,'MINIMUM_DESIGN_READY');
    assert.equal(result.grandfathered,true);
    assert.equal(result.grandfatherSource,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('readiness must pass all seven domains and may never gain release authority',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-seven-domains-'));
  try{
    write(root,'unity-games/new-game/Assets/Scripts/Game.cs','public class Game {}');
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    const tree=unitySourceTreeSha256(path.join(root,'unity-games/new-game'));
    write(root,'web-games/new-game/upper-platform-development-readiness.json',{
      version:1,gameId:'new-game',state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true,
      unitySourceTreeSha256:tree,releaseOrDeploymentAuthority:false,
      criteria:{
        design:{pass:true},code:{pass:true},graphics:{pass:true},webglBuild:{pass:true},
        actualPlay:{pass:true},qa:{pass:false},portability:{pass:true}
      }
    });
    let result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_CRITERIA_INCOMPLETE');

    const evidence=JSON.parse(fs.readFileSync(path.join(root,'web-games/new-game/upper-platform-development-readiness.json'),'utf8'));
    evidence.criteria.qa.pass=true;
    evidence.releaseOrDeploymentAuthority=true;
    write(root,'web-games/new-game/upper-platform-development-readiness.json',evidence);
    result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
    assert.equal(result.web.reason,'READINESS_RELEASE_AUTHORITY_INVALID');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('any durable native progress continues without backtracking, regardless of game id',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-native-progress-'));
  try{
    for(const item of [
      {...baseItem('existing-source'),robloxSourceCommit:'0123456789012345678901234567890123456789',robloxSourceBootstrapPassedAt:'2026-09-25T05:36:30.138Z'},
      {...baseItem('existing-build'),robloxBuildOrPackagePassed:true},
      {...baseItem('existing-runtime'),robloxRuntimeCandidateEvidence:{published:true}},
      {...baseItem('existing-unity'),unityRuntimePassed:true},
    ]){
      const result=classifyUpperPlatformAdmission(item,{repoRoot:root});
      assert.equal(result.state,'UPPER_PLATFORM');
      assert.equal(result.reason,'MINIMUM_DESIGN_READY');
      assert.equal(result.grandfathered,true);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('a source bootstrap timestamp without an exact native source commit cannot bypass the Unity Web gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-bootstrap-only-'));
  try{
    const item={...baseItem('bootstrap-only'),robloxSourceBootstrapPassedAt:'2026-09-25T05:36:30.138Z'};
    let result=classifyUpperPlatformAdmission(item,{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_BOOTSTRAP');
    write(root,'unity-games/bootstrap-only/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    result=classifyUpperPlatformAdmission(item,{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('a native-looking currentStep without durable evidence cannot bypass the Unity Web gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-step-only-'));
  try{
    const item={...baseItem('step-only'),currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION'};
    let result=classifyUpperPlatformAdmission(item,{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_BOOTSTRAP');
    write(root,'unity-games/step-only/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    result=classifyUpperPlatformAdmission(item,{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('an explicit migration id without durable native progress cannot bypass the Unity Web gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-explicit-no-evidence-'));
  try{
    let result=classifyUpperPlatformAdmission(baseItem('listed-but-new'),{repoRoot:root,grandfatherGameIds:['listed-but-new']});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_BOOTSTRAP');
    write(root,'unity-games/listed-but-new/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    result=classifyUpperPlatformAdmission(baseItem('listed-but-new'),{repoRoot:root,grandfatherGameIds:['listed-but-new']});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.web.state,'UNITY_WEB_FLOOR');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('upper-platform orchestration uses reusable workflows instead of rate-limited API dispatch',()=>{
  const root=process.cwd();
  const orchestration=fs.readFileSync(path.join(root,'.github','workflows','company-development-confirmed-runtime.yml'),'utf8');
  const roblox=fs.readFileSync(path.join(root,'.github','workflows','company-development-roblox-runtime.yml'),'utf8');
  const unity=fs.readFileSync(path.join(root,'.github','workflows','company-development-unity-runtime.yml'),'utf8');
  const web=fs.readFileSync(path.join(root,'.github','workflows','unity-web-first-stage-build.yml'),'utf8');
  const bootstrap=fs.readFileSync(path.join(root,'.github','workflows','unity-web-floor-source-bootstrap.yml'),'utf8');

  assert.match(orchestration,/eligible_json:/);
  assert.match(orchestration,/unity_web_json:/);
  assert.match(orchestration,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(orchestration,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(orchestration,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.match(orchestration,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.doesNotMatch(orchestration,/gh workflow run company-development-(?:roblox|unity)-runtime\.yml/);
  assert.doesNotMatch(orchestration,/gh workflow run unity-web-(?:first-stage-build|floor-source-bootstrap)\.yml/);

  for(const workflow of [roblox,unity,web,bootstrap])assert.match(workflow,/workflow_call:/);
});
