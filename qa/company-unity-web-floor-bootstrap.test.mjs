import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const tool=new URL('../tools/company-unity-web-floor-bootstrap.mjs',import.meta.url);

test('Unity Web floor bootstrap creates canonical non-release source and remains below graphics readiness',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-floor-bootstrap-'));
  const old=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{
      identity:'Test survival identity',
      coreLoop:['EXPLORE','ACT','REWARD'],
      multiplayerMode:'SINGLE_PLAYER',
      platformProfiles:{UNITY:{
        platform:'UNITY',
        inputModel:'mobile and keyboard input',
        sessionModel:'session progression model',
        multiplayerRuntime:'single player runtime',
        performanceBudget:'mobile sixty fps budget',
        uiUx:'touch first readable ui',
        saveAndNetwork:'local save and future network',
        platformContentAdaptation:'unity web and app adaptation',
        internalReleaseTarget:'private internal target',
        validationEvidence:'runtime qa regression evidence'
      }}
    }},null,2));
    execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-survival',
      '--game-name=Test Survival',
      '--baseline='+baseline,
      '--output=unity-games/test-survival'
    ],{stdio:'pipe'});
    const source=JSON.parse(fs.readFileSync('unity-games/test-survival/unity-web-floor-source.json','utf8'));
    const runtime=fs.readFileSync('unity-games/test-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
    const build=fs.readFileSync('unity-games/test-survival/Assets/Editor/UnityWebFloorBuild.cs','utf8');
    assert.equal(source.purpose,'UNITY_WEB_DEVELOPMENT_FLOOR');
    assert.equal(source.presentationState,'BOOTSTRAP_REQUIRES_GRAPHICS_BUILDUP');
    assert.equal(source.upperPlatformReady,false);
    assert.equal(source.releaseOrDeploymentAuthority,false);
    assert.equal(source.buildUpDirectiveConsumed,false);
    assert.equal(source.buildUpDirectiveCompletionClaim,false);
    assert.equal(source.buildUpDirectiveId,null);
    assert.equal(source.buildMethod,'UnityWebFloorBuild.BuildWeb');
    assert.match(build,/public static void BuildWeb\(\)/);
    assert.match(runtime,/JAEWOON_UNITY_WEB_QA BOOT/);
    assert.match(runtime,/JAEWOON_UNITY_WEB_QA MOBILE_TARGET/);
    assert.match(runtime,/JAEWOON_UNITY_WEB_QA CORE_FUN/);
    assert.match(runtime,/PlayerPrefs\.Save\(\)/);
    assert.match(runtime,/enemy\.transform\.Rotate/);
    for(const dir of ['Art','Prefabs','Materials','Animations']){
      assert.equal(fs.existsSync(path.join('unity-games/test-survival/Assets',dir,'unity-web-floor-domain.json')),true);
    }
  }finally{
    process.chdir(old);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Unity Web floor bootstrap rejects non-canonical output path',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-floor-bootstrap-invalid-'));
  const old=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{platformProfiles:{UNITY:{
      platform:'UNITY',
      inputModel:'mobile input model',
      sessionModel:'session model long enough',
      multiplayerRuntime:'single player runtime',
      performanceBudget:'performance budget enough',
      uiUx:'touch first ui ux',
      saveAndNetwork:'save and network contract',
      platformContentAdaptation:'platform adaptation contract',
      internalReleaseTarget:'private internal release',
      validationEvidence:'runtime evidence contract'
    }}}}));
    assert.throws(()=>execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-game','--baseline='+baseline,'--output=web-games/test-game'
    ],{stdio:'pipe'}));
  }finally{
    process.chdir(old);
    fs.rmSync(root,{recursive:true,force:true});
  }
});


test('Unity Web floor consumes the exact Vibe directive without creating a platform-local goal',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-floor-directive-'));
  const old=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    const directive=path.join(root,'directive.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{
      identity:'Garden insect defense',
      coreLoop:['READ_WAVE','PLACE_INSECT','DEFEND','UPGRADE'],
      multiplayerMode:'SINGLE_PLAYER',
      platformProfiles:{UNITY:{
        platform:'UNITY',inputModel:'mobile and keyboard input',sessionModel:'session progression model',
        multiplayerRuntime:'single player runtime',performanceBudget:'mobile sixty fps budget',
        uiUx:'touch first readable ui',saveAndNetwork:'local save and future network',
        platformContentAdaptation:'unity web and app adaptation',internalReleaseTarget:'private internal target',
        validationEvidence:'runtime qa regression evidence'
      }}
    }}));
    fs.writeFileSync(directive,JSON.stringify({
      directiveId:'test-survival-build-up-g7-shared',
      directiveFingerprint:'f'.repeat(64),
      gameId:'test-survival',
      generation:7,
      thisLoopPrimaryGoal:'곤충별 역할과 공격 전조를 실제 전투에서 구별한다.'
    }));
    execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-survival','--game-name=Test Survival','--baseline='+baseline,
      '--output=unity-games/test-survival','--build-up-directive='+directive
    ],{stdio:'pipe'});
    const source=JSON.parse(fs.readFileSync('unity-games/test-survival/unity-web-floor-source.json','utf8'));
    assert.equal(source.buildUpDirectiveConsumed,true);
    assert.equal(source.buildUpDirectiveCompletionClaim,false);
    assert.equal(source.buildUpDirectiveId,'test-survival-build-up-g7-shared');
    assert.equal(source.buildUpGeneration,7);
    assert.equal(source.buildUpGoal,'곤충별 역할과 공격 전조를 실제 전투에서 구별한다.');
  }finally{
    process.chdir(old);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Unity Web floor bootstrap fans out exact game ids without a global workflow lock or internal parallel cap',()=>{
  const parent=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const worker=fs.readFileSync('.github/workflows/unity-web-floor-source-bootstrap.yml','utf8');
  assert.match(parent,/unity_web_bootstrap_json/);
  assert.match(parent,/dispatch-unity-web-bootstrap:[\s\S]*?strategy:[\s\S]*?matrix:[\s\S]*?game_id:/);
  assert.match(parent,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml[\s\S]*?game_id: \$\{\{ matrix\.game_id \}\}/);
  assert.doesNotMatch(parent,/dispatch-unity-web-bootstrap:[\s\S]*?max-parallel:/);
  assert.match(worker,/run-name: Unity Web Floor Bootstrap \$\{\{ inputs\.game_id \}\}/);
  assert.match(worker,/workflow_call:[\s\S]*?game_id:/);
  assert.doesNotMatch(worker,/^concurrency:/m);
  assert.doesNotMatch(worker,/GAME_IDS|inputs\.game_ids|for\(const gameId of ids\)/);
  assert.match(worker,/GAME_ID: \$\{\{ inputs\.game_id \}\}/);
});

