// 파일명: qa/roblox-survival-wildlife-sample.test.mjs
// 역할: 생존 야생동물 자산이 Roblox 네이티브 3D 관절 애니메이션 패키지로 유지되는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const readJson=path=>JSON.parse(read(path));

test('factory builds a real Roblox 3D articulated animal with AnimationController and Animator',()=>{
  const src=read('assets/roblox/survival-wildlife/WildlifeFactory.luau');
  assert.match(src,/Instance\.new\("Model"\)/);
  assert.match(src,/Motor6D/);
  assert.match(src,/Instance\.new\("AnimationController"\)/);
  assert.match(src,/Instance\.new\("Animator"\)/);
  assert.match(src,/CollectionService:AddTag\(model, "VibeSurvivalWildlife"\)/);
  assert.match(src,/addLeg/);
  assert.match(src,/HeadJoint/);
  assert.match(src,/JawJoint/);
  assert.match(src,/TailBaseJoint/);
  assert.doesNotMatch(src,/BillboardGui|ImageLabel|SurfaceGui/);
  assert.match(src,/TwoDimensionalPresentationForbidden/);
  assert.match(src,/RootOnlyLocomotionForbidden/);
});

test('animator uses character-animation principles instead of rigid body motion',()=>{
  const src=read('assets/roblox/survival-wildlife/WildlifeAnimator.luau');
  assert.match(src,/springNumber/);
  assert.match(src,/stanceSample/);
  assert.match(src,/controller\.locomotionBlend/);
  assert.match(src,/controller\.spineLag/);
  assert.match(src,/controller\.headLag/);
  assert.match(src,/footPlant/);
  assert.match(src,/ANTICIPATION|anticipate/);
  assert.match(src,/FOLLOW_THROUGH|follow/);
  assert.match(src,/SETTLE|settle/);
  assert.match(src,/joint\.Transform = joint\.Transform:Lerp/);
  assert.match(src,/applyLeg\(targets, "FL"/);
  assert.match(src,/applyLeg\(targets, "BR"/);
  assert.match(src,/applyLeg\(targets, "FR"/);
  assert.match(src,/applyLeg\(targets, "BL"/);
  assert.doesNotMatch(src,/BillboardGui|ImageLabel/);
});

test('server package exposes spawn state speed skin and destroy APIs',()=>{
  const src=read('assets/roblox/survival-wildlife/SurvivalWildlife.luau');
  for(const symbol of ['Wildlife.Spawn','Wildlife.SetMotionState','Wildlife.SetDesiredSpeed','Wildlife.ApplySkin','Wildlife.Destroy']){
    assert.match(src,new RegExp(symbol.replace('.','\\.')));
  }
  assert.match(src,/RunService:IsServer/);
  assert.match(src,/VibeSurvivalWildlife/);
});

test('client bootstrap automatically binds tagged Roblox animals',()=>{
  const src=read('assets/roblox/survival-wildlife/WildlifeClient.client.luau');
  assert.match(src,/CollectionService:GetTagged\("VibeSurvivalWildlife"\)/);
  assert.match(src,/GetInstanceAddedSignal\("VibeSurvivalWildlife"\)/);
  assert.match(src,/WildlifeAnimator\.bind/);
  assert.match(src,/WildlifeMotionState/);
  assert.match(src,/WildlifeDesiredSpeed/);
});

test('bear sample uses server-authoritative root and client joint animation',()=>{
  const src=read('assets/roblox/survival-wildlife/BearWalkSample.server.luau');
  for(const state of ['WALK','RUN','ALERT','ATTACK'])assert.match(src,new RegExp(state));
  assert.match(src,/Wildlife\.Spawn/);
  assert.match(src,/Wildlife\.SetDesiredSpeed/);
  assert.match(src,/Wildlife\.SetMotionState/);
  assert.match(src,/PivotTo/);
  assert.doesNotMatch(src,/Animator\.bind\(bear/);
});

test('Rojo project installs package modules and client animation runtime into Roblox services',()=>{
  const project=readJson('assets/roblox/survival-wildlife/default.project.json');
  const tree=project.tree;
  assert.ok(tree.ReplicatedStorage.SurvivalWildlife.WildlifeCatalog);
  assert.ok(tree.ReplicatedStorage.SurvivalWildlife.WildlifeFactory);
  assert.ok(tree.ReplicatedStorage.SurvivalWildlife.WildlifeAnimator);
  assert.ok(tree.ReplicatedStorage.SurvivalWildlife.SurvivalWildlife);
  assert.ok(tree.StarterPlayer.StarterPlayerScripts.WildlifeClient);
  assert.ok(tree.ServerScriptService.BearWalkSample);
});

test('company library points to Roblox native sample rather than web preview',()=>{
  const lib=readJson('company-asset-library.json');
  const pack=lib.survivalWildlifePack;
  assert.equal(pack.roblox3dImplementation.runtime,'ROBLOX_NATIVE');
  assert.equal(pack.roblox3dImplementation.animationController,true);
  assert.equal(pack.roblox3dImplementation.animatorInstance,true);
  assert.equal(pack.roblox3dImplementation.clientSideVisualAnimation,true);
  assert.equal(pack.roblox3dImplementation.serverAuthoritativeRootAndState,true);
  assert.equal(pack.roblox3dImplementation.billboardOrSpriteAnimalForbidden,true);
  assert.equal(pack.roblox3dImplementation.rootOnlyLocomotionForbidden,true);
  assert.equal(pack.preview.type,'ROBLOX_NATIVE_STUDIO_SAMPLE');
  assert.equal(pack.preview.subject,'BEAR_DARK_BROWN');
  assert.ok(pack.motionQuality.includes('SPRING_BLEND_WALK_RUN'));
  assert.ok(pack.motionQuality.includes('SPINE_OVERLAP'));
  assert.ok(pack.motionQuality.includes('HEAD_FOLLOW_THROUGH'));
});
