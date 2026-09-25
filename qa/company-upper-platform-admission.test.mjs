import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyUpperPlatformAdmission,
  unitySourceTreeSha256,
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

test('new upper-platform entry stays in Unity Web floor until readiness exists',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-floor-'));
  try{
    write(root,'unity-games/new-game/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    const result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UNITY_WEB_FLOOR');
    assert.equal(result.reason,'READINESS_EVIDENCE_MISSING');
    assert.equal(result.buildMethod,'Demo.WebBuild.BuildWeb');
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
        design:{pass:true},code:{pass:true},graphics:{pass:true},webglBuild:{pass:true},
        actualPlay:{pass:true},qa:{pass:true},portability:{pass:true}
      }
    });
    const result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UPPER_PLATFORM');
    assert.equal(result.reason,'UPPER_PLATFORM_DEVELOPMENT_READY');
    assert.equal(result.grandfathered,false);
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
    assert.equal(result.state,'UNITY_WEB_FLOOR');
    assert.equal(result.reason,'READINESS_SOURCE_STALE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('already-started native games remain grandfathered from durable progress evidence without an explicit game allowlist',()=>{
  const item={...baseItem('existing-game'),currentStep:'TARGET_PLATFORM_SOURCE_BIND',robloxFoundationF0Passed:true};
  const result=classifyUpperPlatformAdmission(item,{repoRoot:fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-grandfather-'))});
  assert.equal(result.state,'UPPER_PLATFORM');
  assert.equal(result.reason,'GRANDFATHERED_NATIVE_PROGRESS');
  assert.equal(result.grandfathered,true);
  assert.equal(result.grandfatherSource,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
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
    assert.equal(result.state,'UNITY_WEB_FLOOR');
    assert.equal(result.reason,'READINESS_CRITERIA_INCOMPLETE');

    const evidence=JSON.parse(fs.readFileSync(path.join(root,'web-games/new-game/upper-platform-development-readiness.json'),'utf8'));
    evidence.criteria.qa.pass=true;
    evidence.releaseOrDeploymentAuthority=true;
    write(root,'web-games/new-game/upper-platform-development-readiness.json',evidence);
    result=classifyUpperPlatformAdmission(baseItem('new-game'),{repoRoot:root});
    assert.equal(result.state,'UNITY_WEB_FLOOR');
    assert.equal(result.reason,'READINESS_RELEASE_AUTHORITY_INVALID');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('any durable native progress continues without backtracking, regardless of game id',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-native-progress-'));
  try{
    for(const item of [
      {...baseItem('existing-source'),robloxSourceBootstrapPassedAt:'2026-09-25T05:36:30.138Z'},
      {...baseItem('existing-build'),robloxBuildOrPackagePassed:true},
      {...baseItem('existing-runtime'),currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION'},
      {...baseItem('existing-unity'),unityRuntimePassed:true},
    ]){
      const result=classifyUpperPlatformAdmission(item,{repoRoot:root});
      assert.equal(result.state,'UPPER_PLATFORM');
      assert.equal(result.reason,'GRANDFATHERED_NATIVE_PROGRESS');
      assert.equal(result.grandfathered,true);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('an explicit migration id without durable native progress cannot bypass the Unity Web gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-explicit-no-evidence-'));
  try{
    let result=classifyUpperPlatformAdmission(baseItem('listed-but-new'),{repoRoot:root,grandfatherGameIds:['listed-but-new']});
    assert.equal(result.state,'UNITY_WEB_BOOTSTRAP');
    write(root,'unity-games/listed-but-new/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    result=classifyUpperPlatformAdmission(baseItem('listed-but-new'),{repoRoot:root,grandfatherGameIds:['listed-but-new']});
    assert.equal(result.state,'UNITY_WEB_FLOOR');
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
