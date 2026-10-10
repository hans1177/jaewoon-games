import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyUpperPlatformAdmission,
  unitySourceTreeSha256,
  evaluateUnityWebBuildUpGrowth,
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
    const actual=check('3'.repeat(64),previous,'CORE_FUN',{play:{
      markers:[...shape().markers,'JAEWOON_UNITY_WEB_QA REGION game='+id+' region=cave'],
      saveRestore:{pass:true,restoredKeys:['gold','caveCleared']}
    }});
    assert.equal(actual.status,'VERIFIED_PLAYER_FACING_GROWTH');
    assert.equal(actual.verifiedGrowth,true);
    assert.deepEqual(actual.signals.newContentIds,['region:cave']);
    assert.deepEqual(actual.signals.newPersistentStateKeys,['caveCleared']);
    assert.deepEqual(actual.changedKinds,['scripts']);

    const staticOnly=check('4'.repeat(64),previous,'CORE_FUN');
    assert.equal(staticOnly.verifiedGrowth,false);
    assert.equal(staticOnly.status,'SOURCE_CHANGED_PLAYER_FACING_GROWTH_UNVERIFIED');
    const pixelOnly=check('4'.repeat(64),previous,'PRESENTATION',{play:{visualQa:{
      renderedScene:{pass:true,sceneCaptureSha256:'b'.repeat(64),
        pixels:{source:'REAL_UNITY_CANVAS_SCREENSHOT',distinctColorBuckets:162}}
    }}});
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

test('seven-domain pass with exact current Unity source opens Roblox and Unity upper platforms',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-ready-'));
  try{
    write(root,'unity-games/new-game/Assets/Scripts/Game.cs','public class Game {}');
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    const tree=unitySourceTreeSha256(path.join(root,'unity-games/new-game'));
    write(root,'web-games/new-game/upper-platform-development-readiness.json',{
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
    });
    const result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
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
