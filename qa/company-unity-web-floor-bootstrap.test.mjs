import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const tool=new URL('../tools/company-unity-web-floor-bootstrap.mjs',import.meta.url);

function writeVerifiedPlaybooks(root){
  const file=path.join(root,'vibe3-task-playbooks.json');
  const reuse=[
    {
      id:'external-black-box-alpha',project:'alpha',sourceRevision:'sha256:'+ 'a'.repeat(64),
      distilledApplicationPrinciples:['id=menu-flow; scope=menu; lesson=make gameplay entry distinct; apply=clear menu-to-play transition'],
      distilledAvoidancePrinciples:['id=avoid-copy; scope=visual; lesson=do not clone distinctive expression; apply=reauthor with game identity'],
      distilledLearningUseAllowed:['menu flow timing','spatial feedback']
    },
    {
      id:'external-black-box-beta',project:'beta',sourceRevision:'sha256:'+ 'b'.repeat(64),
      distilledApplicationPrinciples:['id=motion-feedback; scope=motion; lesson=respond immediately after input; apply=visible local motion feedback']
    }
  ];
  fs.writeFileSync(file,JSON.stringify({version:1,generatedFrom:'VERIFIED_MEMORY_ONLY',taskTypes:{
    unity:{authority:'verified-task-playbook',checklist:['unity-runtime-check'],reuse},
    graphics:{authority:'verified-task-playbook',checklist:['graphics-style-check'],reuse},
    coding:{authority:'verified-task-playbook',checklist:['coding-qa-check'],reuse},
    general:{authority:'verified-task-playbook',checklist:['general-verified-check'],reuse}
  }},null,2));
  return file;
}

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
    const playbooks=writeVerifiedPlaybooks(root);
    execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-survival',
      '--game-name=Test Survival',
      '--baseline='+baseline,
      '--output=unity-games/test-survival',
      '--playbooks='+playbooks,
      '--learning-revision='+ 'c'.repeat(40)
    ],{stdio:'pipe'});
    const source=JSON.parse(fs.readFileSync('unity-games/test-survival/unity-web-floor-source.json','utf8'));
    const verifiedLearning=JSON.parse(fs.readFileSync('unity-games/test-survival/Assets/verified-external-learning.json','utf8'));
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
    assert.equal(source.verifiedLearningApplication.mandatoryApplicationCoveragePct,100);
    assert.equal(source.verifiedLearningApplication.allRetrievedVerifiedExternalLearningApplied,true);
    assert.equal(source.verifiedLearningApplication.retrievedCount,2);
    assert.equal(source.verifiedLearningApplication.appliedCount,2);
    assert.equal(source.verifiedLearningApplication.applicationCoveragePct,100);
    assert.deepEqual(source.verifiedLearningApplication.externalLearningIds,['external-black-box-alpha','external-black-box-beta']);
    assert.deepEqual(source.verifiedLearningApplication.externalApplicationPrinciples,[
      'id=menu-flow; scope=menu; lesson=make gameplay entry distinct; apply=clear menu-to-play transition',
      'id=motion-feedback; scope=motion; lesson=respond immediately after input; apply=visible local motion feedback'
    ]);
    assert.deepEqual(source.verifiedLearningApplication.externalAvoidancePrinciples,[
      'id=avoid-copy; scope=visual; lesson=do not clone distinctive expression; apply=reauthor with game identity'
    ]);
    assert.deepEqual(source.verifiedLearningApplication.externalLearningUseAllowed,['menu flow timing','spatial feedback']);
    assert.equal(verifiedLearning.coveragePct,100);
    assert.deepEqual(verifiedLearning.externalApplicationPrinciples,source.verifiedLearningApplication.externalApplicationPrinciples);
    assert.deepEqual(verifiedLearning.externalAvoidancePrinciples,source.verifiedLearningApplication.externalAvoidancePrinciples);
    assert.deepEqual(verifiedLearning.externalLearningUseAllowed,source.verifiedLearningApplication.externalLearningUseAllowed);
    assert.deepEqual(source.verifiedLearningApplication.applyAxes,[
      'MENU_FLOW_AND_INFORMATION_ARCHITECTURE',
      'UI_UX_LAYOUT_FEEDBACK_AND_TOUCH_READABILITY',
      'GRAPHICS_ART_DIRECTION_MATERIAL_LIGHTING_AND_COMPOSITION',
      'MOTION_ANIMATION_TRANSITIONS_IMPACT_AND_SECONDARY_MOTION',
      'ENVIRONMENT_WORLD_DENSITY_LANDMARK_AND_READABILITY',
      'VFX_CAMERA_AUDIO_VISUAL_FEEDBACK_LANGUAGE',
      'GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT'
    ]);
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
    const playbooks=writeVerifiedPlaybooks(root);
    execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-survival','--game-name=Test Survival','--baseline='+baseline,
      '--output=unity-games/test-survival','--build-up-directive='+directive,
      '--playbooks='+playbooks,'--learning-revision='+ 'd'.repeat(40)
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


test('Unity Web floor bootstrap rejects id-only verified external learning',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-floor-learning-content-required-'));
  const old=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{platformProfiles:{UNITY:{
      platform:'UNITY',inputModel:'mobile input model',sessionModel:'session model long enough',multiplayerRuntime:'single player runtime',
      performanceBudget:'performance budget enough',uiUx:'touch first ui ux',saveAndNetwork:'save and network contract',
      platformContentAdaptation:'platform adaptation contract',internalReleaseTarget:'private internal release',validationEvidence:'runtime evidence contract'
    }}}}));
    const playbooks=writeVerifiedPlaybooks(root);
    const data=JSON.parse(fs.readFileSync(playbooks,'utf8'));
    for(const row of Object.values(data.taskTypes||{})){
      for(const item of row.reuse||[])if(item.id==='external-black-box-beta')item.distilledApplicationPrinciples=[];
    }
    fs.writeFileSync(playbooks,JSON.stringify(data,null,2));
    assert.throws(()=>execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-game','--baseline='+baseline,'--output=unity-games/test-game',
      '--playbooks='+playbooks,'--learning-revision='+ 'e'.repeat(40)
    ],{stdio:'pipe'}),/Command failed/);
  }finally{
    process.chdir(old);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Unity Web floor bootstrap refuses development when verified external learning is missing',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-floor-learning-required-'));
  const old=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{platformProfiles:{UNITY:{
      platform:'UNITY',inputModel:'mobile input model',sessionModel:'session model long enough',multiplayerRuntime:'single player runtime',
      performanceBudget:'performance budget enough',uiUx:'touch first ui ux',saveAndNetwork:'save and network contract',
      platformContentAdaptation:'platform adaptation contract',internalReleaseTarget:'private internal release',validationEvidence:'runtime evidence contract'
    }}}}));
    assert.throws(()=>execFileSync(process.execPath,[tool.pathname,
      '--game-id=test-game','--baseline='+baseline,'--output=unity-games/test-game'
    ],{stdio:'pipe'}),/Command failed/);
  }finally{
    process.chdir(old);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Unity Web floor bootstrap runs per game without a global workflow serialization lock',()=>{
  const parent=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-floor-source-bootstrap.yml',import.meta.url),'utf8');
  const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.match(parent,/unity_web_bootstrap_json:/);
  assert.match(parent,/matrix:[\s\S]*game_id: \$\{\{ fromJSON\(needs\.native-plan\.outputs\.unity_web_bootstrap_json\) \}\}/);
  assert.match(parent,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml[\s\S]*game_id: \$\{\{ matrix\.game_id \}\}/);
  assert.match(workflow,/run-name: Unity Web Floor Bootstrap \$\{\{ inputs\.game_id \}\}/);
  assert.match(workflow,/workflow_call:[\s\S]*game_id:/);
  assert.doesNotMatch(header,/^concurrency:\s*$/m);
  assert.match(workflow,/GAME_ID: \$\{\{ inputs\.game_id \}\}/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin vibe2-learning-runtime/);
  assert.match(workflow,/vibe3-task-playbooks\.json > \/tmp\/vibe3-task-playbooks\.json/);
  assert.match(workflow,/--playbooks=\/tmp\/vibe3-task-playbooks\.json/);
  assert.match(workflow,/--learning-revision=/);
  assert.doesNotMatch(workflow,/for\(const gameId of ids\)/);
  assert.match(workflow,/git add "unity-games\/\$GAME_ID"/);
});

test('Unity Web source bootstrap uses slim control capacity',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-floor-source-bootstrap.yml',import.meta.url),'utf8');
  assert.match(workflow,/\n  bootstrap:\n\s+runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(workflow,/runs-on:\s*ubuntu-latest/);
});
