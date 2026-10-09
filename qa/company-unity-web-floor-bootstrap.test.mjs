// 파일명: qa/company-unity-web-floor-bootstrap.test.mjs
// 역할: 유니티 웹 기존 부트스트랩·학습·승인 환경 생성의 소스 및 비권한 계약 회귀 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

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
    assert.equal(source.requiredGameplayDimension,'3D');
    assert.equal(source.f0Native3dSourceRequired,true);
    assert.equal(source.f0Native3dSourcePassed,true);
    assert.deepEqual(source.f0Native3dSourceEvidence,{camera:true,worldMesh:true,spatialTransform:true});
    assert.equal(source.f0SourceOnlyNotRuntimeProof,true);
    assert.equal(source.native3dRuntimeMeshQaPending,true);
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
    assert.match(runtime,/CORE_FUN[^\n]+status=REPAIR_REQUIRED reason=BOOTSTRAP_ONLY_GAMEPLAY_NOT_IMPLEMENTED/);
    assert.doesNotMatch(runtime,/CORE_FUN[^\n]+status=PASS/);
    assert.match(runtime,/PlayerPrefs\.Save\(\)/);
    assert.match(runtime,/Camera\.main/);
    assert.match(runtime,/AddComponent<Camera>/);
    assert.match(runtime,/GameObject\.CreatePrimitive\(PrimitiveType\.Capsule\)/);
    assert.match(runtime,/GameObject\.CreatePrimitive\(PrimitiveType\.Sphere\)/);
    assert.doesNotMatch(runtime,/\b(?:SpriteRenderer|Rigidbody2D|Collider2D|Physics2D)\b/);
    assert.match(runtime,/enemy\.transform\.Rotate/);
    for(const dir of ['Art','Prefabs','Materials','Animations']){
      assert.equal(fs.existsSync(path.join('unity-games/test-survival/Assets',dir,'unity-web-floor-domain.json')),true);
    }
  }finally{
    process.chdir(old);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('legacy 2D design becomes a native 3D floor without claiming final graphics PASS',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-floor-legacy-dimension-'));
  const old=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{
      identity:'Legacy survival source',spatialLayout:{dimension:'2.5D'},
      platformProfiles:{UNITY:{platform:'UNITY'}}
    }}));
    const playbooks=writeVerifiedPlaybooks(root);
    execFileSync(process.execPath,[tool.pathname,'--game-id=legacy-survival',
      '--baseline='+baseline,'--playbooks='+playbooks,'--output=unity-games/legacy-survival'
    ],{stdio:'pipe'});
    const manifest=JSON.parse(fs.readFileSync('unity-games/legacy-survival/unity-web-floor-source.json','utf8'));
    const runtime=fs.readFileSync('unity-games/legacy-survival/Assets/Scripts/UnityWebFloorGame.cs','utf8');
    assert.equal(manifest.legacy2dOr2_5dPresentationRequires3dReplacement,true);
    assert.equal(manifest.requiredGameplayDimension,'3D');
    assert.equal(manifest.f0Native3dSourcePassed,true);
    assert.equal(manifest.upperPlatformReady,false);
    assert.match(runtime,/GameObject\.CreatePrimitive\(PrimitiveType\.Plane\)/);
    assert.match(runtime,/AddComponent<Camera>/);
    assert.doesNotMatch(runtime,/SpriteRenderer|Rigidbody2D/);
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

test('Unity Web/native shared source no longer treats primitive root motion as character-motion PASS',()=>{
  const generator=fs.readFileSync(path.resolve('tools/company-unity-web-floor-bootstrap.mjs'),'utf8');
  assert.match(generator,/public sealed class JaewoonNativeMotionActor/);
  assert.match(generator,/private void OnAnimatorIK\(int layerIndex\)/);
  assert.match(generator,/FindObjectsByType<Animator>\(FindObjectsSortMode\.None\)/);
  assert.match(generator,/reason=ANIMATOR_REQUIRED/);
  assert.doesNotMatch(generator,/JAEWOON_UNITY_WEB_QA MOTION game=" \+ GameId \+ " status=PASS"/);

  for(const gameId of ['survival','monster-adventure']){
    const runtime=fs.readFileSync(path.resolve('unity-games',gameId,'Assets','Scripts','UnityWebFloorGame.cs'),'utf8');
    assert.match(runtime,/public sealed class JaewoonNativeMotionActor/);
    assert.match(runtime,/private void OnAnimatorIK\(int layerIndex\)/);
    assert.match(runtime,/BindNativeMotionActors\(\)/);
    assert.match(runtime,/reason=ANIMATOR_REQUIRED/);
    assert.doesNotMatch(runtime,/JAEWOON_UNITY_WEB_QA MOTION game=" \+ GameId \+ " status=PASS"/);
  }
});

test('approved Unity Web design generates playable-scene visual data in canonical Unity project only',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-approved-layout-'));
  const before=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    const input={
      content:{
        identity:'Mountain village for Unity Web',coreLoop:['EXPLORE','ENTER_SETTLEMENT'],
        platformProfiles:{UNITY:{platform:'UNITY'}},
        spatialLayout:{dimension:'3D',proceduralWorld:{
          approvedDesign:true,seed:'unity-web-layout-1',dimension:'3D',
          width:24,height:24,cellSize:2,mobile:true,density:.75,
          biome:'MOUNTAIN',climate:'COLD_WET',buildingStyle:'GOTHIC'
        }}
      }
    };
    fs.writeFileSync(baseline,JSON.stringify(input));
    const playbooks=writeVerifiedPlaybooks(root);
    execFileSync(process.execPath,[tool.pathname,
      '--game-id=approved-world','--game-name=Approved World',
      '--baseline='+baseline,'--playbooks='+playbooks,'--output=unity-games/approved-world'
    ],{stdio:'pipe'});
    const project='unity-games/approved-world';
    const manifest=JSON.parse(fs.readFileSync(path.join(project,'unity-web-floor-source.json'),'utf8'));
    const dataFile=path.join(project,'Assets/Resources/vibe-world-layout.json');
    const rawLayout=fs.readFileSync(dataFile,'utf8');
    const layout=JSON.parse(rawLayout);
    assert.equal(manifest.proceduralEnvironment.layoutHash,createHash('sha256').update(rawLayout).digest('hex'));
    assert.equal(manifest.proceduralEnvironment.seed,'unity-web-layout-1');
    const runtime=fs.readFileSync(path.join(project,'Assets/Scripts/UnityWebFloorGame.cs'),'utf8');
    assert.equal(manifest.proceduralEnvironment.approval,'APPROVED_DESIGN_3D_ONLY');
    assert.equal(manifest.proceduralEnvironment.status,'DATA_AUTHORED_RUNTIME_UNVERIFIED');
    assert.equal(manifest.proceduralEnvironment.renderedInRuntime,false);
    assert.equal(manifest.proceduralEnvironment.visualMeshAuthoringSource,true);
    assert.equal(manifest.proceduralEnvironment.terrainCells,24*24);
    assert.equal(manifest.proceduralEnvironment.buildingCount,layout.buildings.length);
    assert.equal(manifest.proceduralEnvironment.vegetationCount,layout.vegetation.length);
    assert.equal(manifest.upperPlatformReady,false);
    assert.equal(manifest.releaseOrDeploymentAuthority,false);
    assert.equal(manifest.buildMethod,'UnityWebFloorBuild.BuildWeb');
    assert.equal(layout.version,1);
    assert.equal(layout.mobile,true);
    assert.equal(layout.maxSlopeDegrees,35);
    assert.equal(layout.heights.length,576);
    assert.equal(layout.types.length,576);
    assert.ok(layout.types.some(type=>type===1),'approved mountain must include ridge');
    assert.ok(layout.roads.length>0);
    assert.ok(layout.buildings.length>0);
    assert.ok(layout.buildings.length<=22);
    assert.ok(layout.vegetation.length<=64);
    assert.ok(layout.buildings.every(lot=>lot.roof===1&&lot.size===2));
    const ids=[...layout.buildings,...layout.vegetation].map(item=>item.id);
    assert.ok(ids.every(id=>/^WORLD_[A-Z0-9]+:(LOT|NATURE):/.test(id)));
    assert.equal(new Set(ids).size,ids.length);
    assert.ok(layout.buildings.every(lot=>layout.roads.includes(lot.roadZ*layout.width+lot.roadX)));
    assert.ok(layout.buildings.every(lot=>Number.isFinite(lot.x)&&Number.isFinite(lot.z)&&Number.isFinite(lot.door)));
    assert.equal(layout.gameplayCollisionAuthority,false);
    assert.equal(layout.saveMutation,false);
    assert.equal(layout.engineRuntimeVerified,false);
    assert.match(runtime,/private bool BuildApprovedWorldVisuals\(\)/);
    assert.match(runtime,/approvedEnvironmentReady = BuildApprovedWorldVisuals\(\);/);
    assert.match(runtime,/return true;/);
    assert.match(runtime,/return false;/);
    assert.match(runtime,/APPROVED_ENVIRONMENT_AUTHORING_FAILED/);
    assert.match(runtime,/Resources.Load<TextAsset>\("vibe-world-layout"\)/);
    assert.match(runtime,/surface.SetTriangles\(groups\[k\],k\)/);
    assert.match(runtime,/roads.vertices=roadV.ToArray\(\)/);
    assert.match(runtime,/baked.CombineMeshes\(models\[k\].ToArray\(\),true,true\)/);
    assert.match(runtime,/var models=new List<CombineInstance>\[9\]/);
    assert.match(runtime,/Mathf.Clamp\(lot.material,0,3\)/);
    assert.doesNotMatch(runtime,/new List<CombineInstance>\[6\]/);
    assert.match(runtime,/approvedEnvironmentReady \? "PASS" : "REPAIR_REQUIRED/);
    assert.match(runtime,/primitive.GetComponent<Collider>\(\).enabled=false/);
    assert.match(runtime,/primitive.SetActive\(false\);Destroy\(primitive\);/);
    assert.match(runtime,/collider=UNCHANGED save=UNCHANGED native_qa=REQUIRED/);
    assert.match(runtime,/data\.mobile&&\(data\.width>48/);
    assert.match(runtime,/WORLD_DOOR_ROAD_DISCONNECTED/);
    assert.match(runtime,/WORLD_OBJECT_ID_DUPLICATED/);
    assert.match(runtime,/WORLD_OBJECT_ID_REQUIRED/);
    assert.match(runtime,/WORLD_ROAD_CELL_DUPLICATED/);
    assert.match(runtime,/WORLD_TERRAIN_INVALID/);
    assert.match(runtime,/WORLD_DOOR_ROAD_STEEP/);
    assert.match(runtime,/new GameObject\("WorldObject_"\+lot.id\)/);
    assert.match(runtime,/new GameObject\("WorldObject_"\+plant.id\)/);
    assert.doesNotMatch(runtime,/Input\.touchCount/);
    assert.doesNotMatch(runtime,/AddComponent<MeshCollider>/);
    assert.match(runtime,/var worldIds=new HashSet<string>/);
    assert.doesNotMatch(runtime,/RegisterDestroyedObject/);
    assert.doesNotMatch(runtime,/BuildApprovedWorldVisuals\(\);[\s\S]*UNITY_WEB_WORLD=PASS/);
    assert.match(runtime,/PlayerPrefs\.Save\(\)/);
    assert.match(runtime,/status=REPAIR_REQUIRED reason=BOOTSTRAP_ONLY_GAMEPLAY_NOT_IMPLEMENTED/);
  }finally{
    process.chdir(before);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Unity Web world authoring stays opt-in and rejects unapproved or disconnected world layouts',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-procedural-guards-'));
  const before=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design-revised.json');
    const playbooks=writeVerifiedPlaybooks(root);
    const original={content:{identity:'Existing unchanged world',platformProfiles:{UNITY:{platform:'UNITY'}},
      spatialLayout:{dimension:'3D',proceduralWorld:{approvedDesign:false,dimension:'3D',width:24,height:24,seed:'not-approved'}}}};
    fs.writeFileSync(baseline,JSON.stringify(original));
    const args=['--game-id=unchanged-world','--baseline='+baseline,'--playbooks='+playbooks,'--output=unity-games/unchanged-world'];
    execFileSync(process.execPath,[tool.pathname,...args],{stdio:'pipe'});
    const unchanged='unity-games/unchanged-world';
    const src=JSON.parse(fs.readFileSync(path.join(unchanged,'unity-web-floor-source.json'),'utf8'));
    const runtime=fs.readFileSync(path.join(unchanged,'Assets/Scripts/UnityWebFloorGame.cs'),'utf8');
    assert.equal(src.proceduralEnvironment,null);
    assert.equal(fs.existsSync(path.join(unchanged,'Assets/Resources/vibe-world-layout.json')),false);
    assert.doesNotMatch(runtime,/BuildApprovedWorldVisuals/);
    original.content.spatialLayout.dimension='2D';
    original.content.spatialLayout.proceduralWorld={approvedDesign:true,dimension:'2D',seed:'2d-not-3d'};
    fs.writeFileSync(baseline,JSON.stringify(original));
    assert.throws(()=>execFileSync(process.execPath,[tool.pathname,...args],{stdio:'pipe'}));
    original.content.spatialLayout.dimension='3D';
    original.content.spatialLayout.proceduralWorld={
      approvedDesign:true,dimension:'3D',width:24,height:24,seed:'blocked',
      reservedCells:Array.from({length:24},(_,z)=>({x:12,z}))
    };
    fs.writeFileSync(baseline,JSON.stringify(original));
    assert.throws(()=>execFileSync(process.execPath,[tool.pathname,...args],{stdio:'pipe'}));
    assert.equal(fs.existsSync(path.join(unchanged,'Assets/Resources/vibe-world-layout.json')),false);
  }finally{
    process.chdir(before);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Unity Web and Android share verified-only destructible world interactions with additive saves',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-approved-world-harvest-'));
  const previous=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'design.json');
    const directive=path.join(root,'build-up.json');
    const output='unity-games/test-harvest';
    const design={content:{
      identity:'Verified procedural resource gathering',multiplayerMode:'SINGLE_PLAYER',
      verifiedRuntimeInteractionContract:true,platformProfiles:{UNITY:{platform:'UNITY'}},
      spatialLayout:{dimension:'3D',proceduralWorld:{
        approvedDesign:true,seed:'rpg-mountain-1',width:24,height:24,density:.8,biome:'MOUNTAIN',climate:'COLD_WET',buildingStyle:'GOTHIC',
        runtimeInteractionsApproved:true,
        interactionRules:{
          GATHER:{maxHealth:80,hitDamage:20,rewardItemId:'wood_01',minDrop:2,maxDrop:3,respawnSeconds:60},
          MINE:{maxHealth:120,hitDamage:30,rewardItemId:'stone_01',minDrop:1,maxDrop:2,respawnSeconds:120}
        }
      }}
    }};
    fs.writeFileSync(baseline,JSON.stringify(design));
    fs.writeFileSync(directive,JSON.stringify({
      directiveId:'test-harvest-build-up-g1',gameId:'test-harvest',
      designContextMode:'APPROVED_OR_MINIMUM_DESIGN'
    }));
    const playbooks=writeVerifiedPlaybooks(root);
    const args=['--game-id=test-harvest','--game-name=Verified Harvest','--baseline='+baseline,
      '--playbooks='+playbooks,'--build-up-directive='+directive,'--output='+output];
    const rejectionReason=()=>{try{execFileSync(process.execPath,[tool.pathname,...args],{stdio:'pipe'});return 'NOT_REJECTED';}catch(error){return String(error.stderr||error);}};
    execFileSync(process.execPath,[tool.pathname,...args],{stdio:'pipe'});
    const data=JSON.parse(fs.readFileSync(path.join(output,'Assets/Resources/vibe-world-layout.json'),'utf8'));
    const runtime=fs.readFileSync(path.join(output,'Assets/Scripts/UnityWebFloorGame.cs'),'utf8');
    const build=fs.readFileSync(path.join(output,'Assets/Editor/UnityWebFloorBuild.cs'),'utf8');
    const manifest=JSON.parse(fs.readFileSync(path.join(output,'unity-web-floor-source.json'),'utf8'));
    assert.ok(data.vegetation.some(node=>node.maxHealth===80&&node.rewardItemId==='wood_01'));
    assert.ok(data.vegetation.some(node=>node.maxHealth===120&&node.rewardItemId==='stone_01'));
    assert.ok(data.vegetation.every(node=>node.maxHealth===0||node.hitDamage>0));
    assert.match(runtime,/public interface IInteractable/);
    assert.match(runtime,/class VibeHarvestableObject : MonoBehaviour, IInteractable/);
    assert.match(runtime,/void HitHarvest\(VibeHarvestableObject target\)/);
    assert.match(runtime,/OnInteract\(Transform actor\)/);
    assert.match(runtime,/PrepareWorldDebrisPool/);
    assert.match(runtime,/AddExplosionForce/);
    assert.match(runtime,/detectCollisions=false/);
    assert.match(runtime,/GetString\(SavePrefix\+"world-objects-v1"/);
    assert.match(runtime,/OnApplicationPause\(bool paused\)/);
    assert.match(runtime,/OnApplicationQuit/);
    assert.match(runtime,/DrawWorldInteractionControls/);
    assert.match(runtime,/Input.GetKeyDown\(KeyCode.E\)/);
    assert.match(build,/public static void BuildWeb\(\)/);
    assert.match(build,/public static void Build\(\)/);
    assert.equal(manifest.releaseOrDeploymentAuthority,false);
    assert.equal(manifest.upperPlatformReady,false);
    assert.match(runtime,/CORE_FUN[^\n]+status=REPAIR_REQUIRED/);
    assert.doesNotMatch(runtime,/CORE_FUN[^\n]+status=PASS/);
    design.content.verifiedRuntimeInteractionContract=false;
    fs.writeFileSync(baseline,JSON.stringify(design));
    assert.match(rejectionReason(),/UNITY_WEB_INTERACTION_VERIFIED_GAME_DESIGN_REQUIRED/);
    design.content.verifiedRuntimeInteractionContract=true;
    design.content.multiplayerMode='COOP';
    fs.writeFileSync(baseline,JSON.stringify(design));
    assert.match(rejectionReason(),/UNITY_WEB_INTERACTION_CLIENT_AUTHORITY_FORBIDDEN_FOR_MULTIPLAYER/);
    design.content.multiplayerMode='SINGLE_PLAYER';
    design.content.spatialLayout.proceduralWorld.interactionRules.GATHER.minDrop=-1;
    fs.writeFileSync(baseline,JSON.stringify(design));
    assert.match(rejectionReason(),/UNITY_WEB_INTERACTION_RULE_INVALID:GATHER/);
    assert.equal(fs.existsSync(path.join(output,'Assets/Scripts/UnityWebFloorGame.cs')),true);
  }finally{
    process.chdir(previous);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('approved procedural Unity bootstrap never overwrites an existing gameplay source',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-world-preserve-'));
  const original=process.cwd();
  try{
    process.chdir(root);
    const baseline=path.join(root,'approved-design.json');
    fs.writeFileSync(baseline,JSON.stringify({content:{identity:'preserve existing Unity source',platformProfiles:{UNITY:{platform:'UNITY'}},spatialLayout:{dimension:'3D',proceduralWorld:{approvedDesign:true,dimension:'3D',seed:'preserve',width:24,height:24}}}}));
    const verified=writeVerifiedPlaybooks(root);
    const script='unity-games/preserved-world/Assets/Scripts/UnityWebFloorGame.cs';
    fs.mkdirSync(path.dirname(script),{recursive:true});
    const existing='// existing authored gameplay state; never delete';
    fs.writeFileSync(script,existing);
    assert.throws(()=>execFileSync(process.execPath,[tool.pathname,'--game-id=preserved-world','--baseline='+baseline,'--playbooks='+verified,'--output=unity-games/preserved-world'],{stdio:'pipe'}),/Command failed/);
    assert.equal(fs.readFileSync(script,'utf8'),existing);
    assert.equal(fs.existsSync('unity-games/preserved-world/Assets/Resources/vibe-world-layout.json'),false);
  }finally{
    process.chdir(original);
    fs.rmSync(root,{recursive:true,force:true});
  }
});
