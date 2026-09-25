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
    assert.equal(source.buildMethod,'UnityWebFloorBuild.BuildWeb');
    assert.match(source.bootstrapRuntimeSha256,/^[a-f0-9]{64}$/);
    assert.match(source.bootstrapBuildSha256,/^[a-f0-9]{64}$/);
    assert.equal(source.presentationDevelopmentContract.requiredState,'DEVELOPED_GAME_SPECIFIC_PRESENTATION');
    assert.equal(source.presentationDevelopmentContract.sourceDeltaFromBootstrapRequired,true);
    assert.equal(source.presentationDevelopmentContract.flagOnlyPromotionForbidden,true);
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


test('Unity Web readiness workflow requires substantive presentation beyond bootstrap flags',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/bootstrapRuntimeSha256/);
  assert.match(workflow,/bootstrapSourceDelta/);
  assert.match(workflow,/DEVELOPED_GAME_SPECIFIC_PRESENTATION/);
  assert.match(workflow,/developedAssetCount>=3\|\|primitiveCount===0/);
  assert.match(workflow,/bootstrapGenerated&&!substantivePresentation/);
  assert.match(workflow,/graphics:\{pass:graphicsPass,assetCounts:graphicsCounts,bootstrapGraphicsBlocked,bootstrapSourceDelta,developedAssetCount,primitiveCount,substantivePresentation\}/);
});
