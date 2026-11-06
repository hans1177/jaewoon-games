// 파일명: qa/roblox-survival-wildlife-sample.test.mjs
// 역할: 생존 야생동물 샘플이 2D/통짜 이동으로 퇴행하지 않고 실제 3D 관절 구조를 유지하는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const readJson=path=>JSON.parse(read(path));

test('wildlife factory creates articulated 3D anatomy instead of sprite animals',()=>{
  const src=read('assets/roblox/survival-wildlife/WildlifeFactory.luau');
  assert.match(src,/Motor6D/);
  assert.match(src,/addLeg/);
  assert.match(src,/HeadJoint/);
  assert.match(src,/JawJoint/);
  assert.match(src,/TailBaseJoint/);
  assert.doesNotMatch(src,/Instance\.new\("(?:BillboardGui|ImageLabel|SurfaceGui)"\)/);
  assert.match(src,/TwoDimensionalPresentationForbidden/);
  assert.match(src,/RootOnlyLocomotionForbidden/);
});

test('wildlife animator uses smooth joint transforms with diagonal quadruped gait',()=>{
  const src=read('assets/roblox/survival-wildlife/WildlifeAnimator.luau');
  assert.match(src,/Motor6D/);
  assert.match(src,/joint\.Transform = joint\.Transform:Lerp/);
  assert.match(src,/applyLeg\(targets, "FL", phase/);
  assert.match(src,/applyLeg\(targets, "BR", phase/);
  assert.match(src,/applyLeg\(targets, "FR", phase \+ math\.pi/);
  assert.match(src,/applyLeg\(targets, "BL", phase \+ math\.pi/);
  assert.match(src,/turnUsesBodyArc|BodyJoint|ChestJoint/);
  assert.doesNotMatch(src,/BillboardGui|ImageLabel/);
});

test('bear sample cycles visible 3D walk run alert and attack states',()=>{
  const src=read('assets/roblox/survival-wildlife/BearWalkSample.server.luau');
  for(const state of ['WALK','RUN','ALERT','ATTACK'])assert.match(src,new RegExp(state));
  assert.match(src,/Factory\.create\("BEAR", "DARK_BROWN"\)/);
  assert.match(src,/Animator\.bind/);
  assert.match(src,/PivotTo/);
});

test('owner-removed wildlife test page stays deleted without deleting shared motion code',()=>{
  assert.equal(fs.existsSync('web-games/wildlife-motion-sample/index.html'),false);
  const catalog=readJson('game-catalog.json');
  assert.ok(catalog.permanentRemovalPolicy.ids.includes('wildlife-motion-sample'));
  assert.equal(fs.existsSync('assets/roblox/survival-wildlife/WildlifeFactory.luau'),true);
});

test('company asset library registers the real 3D sample and forbids 2D fallback',()=>{
  const lib=readJson('company-asset-library.json');
  const pack=lib.survivalWildlifePack;
  assert.equal(pack.roblox3dImplementation.dimensionality,'FULL_3D');
  assert.equal(pack.roblox3dImplementation.articulatedMotor6D,true);
  assert.equal(pack.roblox3dImplementation.billboardOrSpriteAnimalForbidden,true);
  assert.equal(pack.roblox3dImplementation.rootOnlyLocomotionForbidden,true);
  assert.equal(pack.preview.type,'SOURCE_ONLY');
  assert.equal(pack.preview.path,null);
  assert.equal(pack.preview.subject,'BEAR_DARK_BROWN');
});
