import {test} from 'node:test';import assert from 'node:assert/strict';import {discoverClimbSkeleton,createAdaptiveClimbIK} from '../assets/vibe-adaptive-climb-ik.mjs';
test('detects varied humanoid naming and missing limbs',()=>{const make=(name,parent=null)=>({isBone:true,name,parent});const a=make('LeftUpperArm'),b=make('LeftForeArm',a),c=make('LeftHand',b),d=make('RightUpperArm'),e=make('RightForeArm',d),f=make('RightHand',e);const root={traverse(fn){for(const bone of [a,b,c,d,e,f])fn(bone)}};const rig=discoverClimbSkeleton(root);assert.deepEqual(rig.found.sort(),['leftHand','rightHand']);assert.equal(rig.chains.leftHand.joints[0],b);assert.ok(rig.missing.includes('leftFoot'))});

test('Vibe 5.9 axial head IK is opt-in and uses only existing neck/spine bones',()=>{
 const make=(name,parent=null)=>({isBone:true,name,parent});
 const hips=make('Hips'),spine=make('Spine',hips),neck=make('Neck',spine),head=make('Head',neck);
 const root={traverse(fn){for(const b of [hips,spine,neck,head])fn(b)}};
 assert.equal(discoverClimbSkeleton(root).found.includes('head'),false);
 const rig=discoverClimbSkeleton(root,{includeAxial:true});
 assert.equal(rig.found.includes('head'),true);
 assert.equal(rig.chains.head.joints[0],neck);
});

test('Vibe 5.9 generic IK rejects missing world targets and preserves untouched root',()=>{
 const THREE={Vector3:class{},Quaternion:class{}};
 let updates=0;
 const avatar={updateMatrixWorld(){updates++}};
 const ik=createAdaptiveClimbIK(THREE,{avatar,rig:{chains:{},found:[],missing:[]}});
 assert.deepEqual(ik.updateTargets({leftHand:{x:NaN,y:0,z:0}}),{});
 assert.deepEqual(ik.update(null),{});
 ik.reset();assert.equal(updates,1);
});
