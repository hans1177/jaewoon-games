import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibeFacialRig,createVibeHandRig,createVibeKeyframePlayer,vibePremiumAssetSpec} from '../assets/vibe-premium-character-pipeline.mjs';
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
