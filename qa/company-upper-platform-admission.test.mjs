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

test('already-started native games remain grandfathered and are never rewound to Unity Web floor',()=>{
  const item={...baseItem('existing-game'),currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION'};
  const result=classifyUpperPlatformAdmission(item,{repoRoot:fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-grandfather-')),grandfatherGameIds:['existing-game']});
  assert.equal(result.state,'UPPER_PLATFORM');
  assert.equal(result.reason,'GRANDFATHERED_NATIVE_PROGRESS');
  assert.equal(result.grandfathered,true);
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


test('native-started games outside the explicit grandfather list still enter Unity Web floor or bootstrap',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-non-grandfather-'));
  try{
    const item={...baseItem('existing-other'),currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION'};
    let result=classifyUpperPlatformAdmission(item,{repoRoot:root,grandfatherGameIds:['cozy-island','daechung-rpg']});
    assert.equal(result.state,'UNITY_WEB_BOOTSTRAP');
    assert.match(result.reason,/CANONICAL_UNITY_WEB_SOURCE_REQUIRED/);

    write(root,'unity-games/existing-other/Assets/Editor/WebBuild.cs',`namespace Demo { public static class WebBuild { public static void BuildWeb(){} } }`);
    result=classifyUpperPlatformAdmission(item,{repoRoot:root,grandfatherGameIds:['cozy-island','daechung-rpg']});
    assert.equal(result.state,'UNITY_WEB_FLOOR');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('only the owner-scoped cozy-island and daechung-rpg examples may grandfather native progress',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'upper-platform-owner-scope-'));
  try{
    for(const gameId of ['cozy-island','daechung-rpg']){
      const result=classifyUpperPlatformAdmission({...baseItem(gameId),currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION'},{repoRoot:root,grandfatherGameIds:['cozy-island','daechung-rpg']});
      assert.equal(result.state,'UPPER_PLATFORM');
      assert.equal(result.grandfathered,true);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
