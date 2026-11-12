import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibeFacialRig,createVibeHandRig,createVibeKeyframePlayer,vibePremiumAssetSpec,inspectVibeCharacterRig,createVibeRigRetargeter,createVibeJointConstraints,createVibeSecondaryDeformation} from '../assets/vibe-premium-character-pipeline.mjs';
test('facial channels control blendshape weights',()=>{
 const mesh={morphTargetDictionary:{jawOpen:0,smile:1},morphTargetInfluences:[0,0]};
 const model={traverse(fn){fn(mesh)}};
 const rig=createVibeFacialRig(model);
 assert.equal(rig.set('jawOpen',.8),true);assert.equal(mesh.morphTargetInfluences[0],.8);
 rig.pose({mouthSmileLeft:1,mouthSmileRight:1});assert.equal(mesh.morphTargetInfluences[1],1);
 rig.reset();assert.deepEqual(mesh.morphTargetInfluences,[0,0]);
});
test('finger rig applies gesture to named bones',()=>{
 const bone={isBone:true,name:'LeftHandIndex1',rotation:{x:0}};
 const model={traverse(fn){fn(bone)}};
 const rig=createVibeHandRig(model);assert.equal(rig.curl('left','index',1),1);
 assert.ok(bone.rotation.x<0);rig.reset();assert.equal(bone.rotation.x,0);
});
test('keyframe player interpolates authored motion',()=>{
 let x=0;const player=createVibeKeyframePlayer({fps:10,targets:{x:value=>{x=value}},tracks:{move:{x:[{frame:0,value:0},{frame:10,value:10}]}}});
 player.play('move',{loop:false});for(let i=0;i<10;i++)player.update(.1);
 assert.ok(Math.abs(x-10)<1e-6);assert.equal(player.active,'move');
});
test('asset spec describes face, hand and texture requirements',()=>{
 assert.equal(vibePremiumAssetSpec.hands.jointsPerFinger,3);
 assert.equal(vibePremiumAssetSpec.textures.baseColor,4096);
});

test('Vibe 5.9 rig audit blocks missing skin weights and accepts normalized approved skin',()=>{
 const bones={isBone:true,name:'LeftHand'};
 const mesh={isSkinnedMesh:true,name:'Body',geometry:{attributes:{skinWeight:{
  count:2,itemSize:4,getComponent:(i,j)=>j===0?1:0
 }}}};
 const model={traverse(fn){fn(bones);fn(mesh)}};
 const result=inspectVibeCharacterRig(model);
 assert.equal(result.productionEligible,true);assert.equal(result.weightsSampled,2);
 const bad=inspectVibeCharacterRig({traverse(fn){fn(bones);fn({...mesh,geometry:{attributes:{}}})}});
 assert.equal(bad.productionEligible,false);
 assert.ok(bad.issues.some(issue=>issue.includes('MISSING_SKIN_WEIGHTS')));
});

test('Vibe 5.9 joint constraints honor rest and reset without adding bones',()=>{
 const bone={isBone:true,name:'LeftHand',rotation:{x:.2,y:0,z:0}};
 const model={traverse(fn){fn(bone)}};
 const constraints=createVibeJointConstraints(model,{limits:{LeftHand:{x:.5,y:.1,z:.1}}});
 assert.equal(constraints.apply({LeftHand:{x:10,y:.05,z:0}}),1);
 assert.ok(Math.abs(bone.rotation.x-.7)<1e-8);
 constraints.reset();assert.equal(bone.rotation.x,.2);
});

test('Vibe 5.9 reuses existing secondary morphs only and restores their rest values',()=>{
 const mesh={morphTargetDictionary:{clothSwing:0},morphTargetInfluences:[.2]};
 const rig=createVibeSecondaryDeformation({traverse(fn){fn(mesh)}});
 assert.deepEqual(rig.available,['clothSwing']);
 assert.equal(rig.update(.1,{clothSwing:1}),1);
 assert.ok(mesh.morphTargetInfluences[0]>.2);
 rig.reset();assert.equal(mesh.morphTargetInfluences[0],.2);
});

test('Vibe 5.9 retarget maps existing differently-named bones without writing source or root',()=>{
 class Q{constructor(v=0){this.v=v}clone(){return new Q(this.v)}invert(){this.v=-this.v;return this}multiply(other){this.v+=other.v;return this}copy(other){this.v=other.v;return this}slerp(other,t){this.v+=(other.v-this.v)*t;return this}}
 const donor={isBone:true,name:'mixamorig:LeftArm',quaternion:new Q(.2)};
 const dest={isBone:true,name:'UpperArm.L',quaternion:new Q(.5)};
 const hips={isBone:true,name:'Hips',quaternion:new Q(1)};
 const src={traverse(fn){fn(donor)}},dst={traverse(fn){fn(dest);fn(hips)}};
 const retarget=createVibeRigRetargeter(src,dst);
 assert.equal(retarget.matched,1);
 donor.quaternion.v=.8;retarget.update();
 assert.ok(Math.abs(dest.quaternion.v-1.1)<1e-8);
 assert.equal(hips.quaternion.v,1);retarget.reset();assert.equal(dest.quaternion.v,.5);
});
