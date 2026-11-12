import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVibeFacialRig,createVibeHandRig,createVibeKeyframePlayer,vibePremiumAssetSpec,inspectVibeCharacterRig,createVibeRigRetargeter,createVibeJointConstraints,createVibeSecondaryDeformation,applyVibePBRTextures} from '../assets/vibe-premium-character-pipeline.mjs';
test('facial channels control blendshape weights',()=>{
 const mesh={morphTargetDictionary:{jawOpen:0,smile:1},morphTargetInfluences:[0,0]};
 const model={traverse(fn){fn(mesh)}};
 const rig=createVibeFacialRig(model);
 assert.equal(rig.set('jawOpen',.8),true);assert.equal(mesh.morphTargetInfluences[0],.8);
 rig.pose({mouthSmileLeft:1,mouthSmileRight:1});assert.equal(mesh.morphTargetInfluences[1],1);
 rig.reset();assert.deepEqual(mesh.morphTargetInfluences,[0,0]);
});
test('Vibe 5.9 imported Mixamo and Blender finger names map to original bones',()=>{
 const left={isBone:true,name:'mixamorig:LeftHandIndex1',rotation:{x:.12}};
 const right={isBone:true,name:'index.02.R',rotation:{x:-.2}};
 const model={traverse(fn){fn(left);fn(right)}};
 const hand=createVibeHandRig(model);
 assert.equal(hand.hands.left.index.length,1);
 assert.equal(hand.hands.right.index.length,1);
 assert.equal(hand.curl('left','index',1),1);
 assert.equal(hand.curl('right','index',1),1);
 assert.ok(left.rotation.x<.12);
 assert.ok(right.rotation.x>-.2);
 hand.reset();
 assert.equal(left.rotation.x,.12);
 assert.equal(right.rotation.x,-.2);
});
test('Vibe 5.9 preview applies hand poses after authored clip update without creating bones',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.ok(html.includes("handGestureButton.addEventListener('click',()=>{"));
 assert.ok(html.includes("if(handGesture&&handRig){handRig.gesture('left',handGesture);handRig.gesture('right',handGesture)}"));
 assert.ok(html.includes('if(!supported)'));
 assert.ok(html.includes('if(!handGesture)handRig.reset()'));
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

test('Vibe 5.9 PBR cleanup restores shared real material maps and disposes only loaded textures',async()=>{
 const previousMap={id:'original'},previousNormal={id:'normal'},disposals=[],requested=[];
 const shared={isMeshStandardMaterial:true,map:previousMap,normalMap:previousNormal};
 const separate={isMeshStandardMaterial:true,map:null};
 const model={traverse(fn){fn({isMesh:true,material:shared});fn({isMesh:true,material:[shared,separate]})}};
 const textureLoader={async loadAsync(url){
  requested.push(url);
  return{dispose(){disposals.push(url)}};
 }};
 const result=await applyVibePBRTextures({SRGBColorSpace:'srgb'},model,
  {baseColor:'approved-color',normal:'approved-normal'},{textureLoader,maxAnisotropy:32});
 assert.deepEqual(requested,['approved-color','approved-normal']);
 assert.equal(result.textures.map.colorSpace,'srgb');
 assert.equal(result.textures.map.anisotropy,8);
 assert.equal(shared.map,result.textures.map);
 assert.equal(shared.normalMap,result.textures.normalMap);
 assert.equal(separate.map,result.textures.map);
 assert.equal(separate.normalMap,result.textures.normalMap);
 result.dispose();
 assert.equal(shared.map,previousMap);
 assert.equal(shared.normalMap,previousNormal);
 assert.equal(separate.map,null);
 assert.equal(Object.hasOwn(separate,'normalMap'),false);
 assert.deepEqual(disposals,['approved-color','approved-normal']);
 result.dispose();
 assert.equal(disposals.length,2);
});
test('Vibe 5.9 PBR loader failure keeps authored materials unchanged and frees loaded maps',async()=>{
 const old={id:'existing'},material={isMeshStandardMaterial:true,map:old};
 const model={traverse(fn){fn({isMesh:true,material})}};
 let loadedDisposed=0,calls=0;
 const textureLoader={async loadAsync(){
  if(++calls===2)throw Error('texture source unavailable');
  return{dispose(){loadedDisposed++}};
 }};
 await assert.rejects(()=>applyVibePBRTextures({SRGBColorSpace:'srgb'},model,
  {baseColor:'approved-color',normal:'missing-normal'},{textureLoader}),/source unavailable/);
 assert.equal(material.map,old);
 assert.equal(loadedDisposed,1);
});
test('Vibe 5.9 rig audit blocks missing skin weights and accepts normalized approved skin',()=>{
 const bones={isBone:true,name:'LeftHand'};
 const mesh={isSkinnedMesh:true,name:'Body',skeleton:{bones:[bones]},geometry:{attributes:{
  skinWeight:{count:2,itemSize:4,getComponent:(i,j)=>j===0?1:0},
  skinIndex:{count:2,itemSize:4,getComponent:(i,j)=>0}
 }}};
 const model={traverse(fn){fn(bones);fn(mesh)}};
 const result=inspectVibeCharacterRig(model);
 assert.equal(result.productionEligible,true);assert.equal(result.weightsSampled,2);
 const bad=inspectVibeCharacterRig({traverse(fn){fn(bones);fn({...mesh,geometry:{attributes:{}}})}});
 assert.equal(bad.productionEligible,false);
 assert.ok(bad.issues.some(issue=>issue.includes('MISSING_SKIN_WEIGHTS')));
});

test('Vibe 5.9 rejects skinned geometry without actual bound bones or skin indices',()=>{
 const bone={isBone:true,name:'Hips'},weights={count:2,itemSize:4,getComponent:(i,j)=>j===0?1:0};
 const indices={count:2,itemSize:4,getComponent:()=>0};
 const noSkeleton={isSkinnedMesh:true,name:'Body',geometry:{attributes:{skinWeight:weights,skinIndex:indices}}};
 const model=mesh=>({traverse(fn){fn(bone);fn(mesh)}});
 const a=inspectVibeCharacterRig(model(noSkeleton));
 assert.equal(a.coverageComplete,true);assert.equal(a.productionEligible,false);
 assert.ok(a.issues.includes('MISSING_BOUND_SKELETON:Body'));
 const noIndex={...noSkeleton,skeleton:{bones:[bone]},geometry:{attributes:{skinWeight:weights}}};
 const b=inspectVibeCharacterRig(model(noIndex));
 assert.equal(b.coverageComplete,true);assert.equal(b.productionEligible,false);
 assert.ok(b.issues.includes('MISSING_SKIN_INDICES:Body'));
 const invalid={...noSkeleton,skeleton:{bones:[{}]}};
 const c=inspectVibeCharacterRig(model(invalid));
 assert.equal(c.productionEligible,false);
 assert.ok(c.issues.includes('INVALID_BOUND_BONES:Body'));
 const approved={...noSkeleton,skeleton:{bones:[bone]}};
 assert.equal(inspectVibeCharacterRig(model(approved)).productionEligible,true);
 assert.equal(approved.geometry.attributes.skinWeight,weights);
 assert.equal(approved.geometry.attributes.skinIndex,indices);
});

test('Vibe 5.9 rig audit checks later meshes under a shared sample budget',()=>{
 const bone={isBone:true,name:'Root'};
 const attr=values=>({count:values.length,itemSize:4,getComponent:(i,j)=>j===0?values[i]:0});
 const front={isSkinnedMesh:true,name:'Front',geometry:{attributes:{skinWeight:attr([1,1,1,1])}}};
 const rear={isSkinnedMesh:true,name:'Rear',geometry:{attributes:{skinWeight:attr([0])}}};
 const model={traverse(fn){fn(bone);fn(front);fn(rear)}};
 const audit=inspectVibeCharacterRig(model,{sampleLimit:2});
 assert.equal(audit.weightsSampled,2);
 assert.equal(audit.unweighted,1);
 assert.equal(audit.productionEligible,false);
 assert.ok(audit.issues.includes('UNWEIGHTED_VERTICES'));
 const insufficient=inspectVibeCharacterRig(model,{sampleLimit:1});
 assert.equal(insufficient.productionEligible,false);
 assert.ok(insufficient.issues.includes('RIG_AUDIT_COVERAGE_INCOMPLETE'));
 assert.equal(insufficient.sourcePreserved,true);
});
test('Vibe 5.9 rig audit detects out-of-range bound bone indices without mutating source',()=>{
 const bone={isBone:true,name:'Root'};
 const weights={count:2,itemSize:4,getComponent:(i,j)=>j===0?1:0};
 const indices={count:2,itemSize:4,getComponent:(i,j)=>j===0?3:0};
 const mesh={isSkinnedMesh:true,name:'Body',skeleton:{bones:[bone]},geometry:{attributes:{skinWeight:weights,skinIndex:indices}}};
 const audit=inspectVibeCharacterRig({traverse(fn){fn(bone);fn(mesh)}});
 assert.equal(audit.invalidIndices,2);
 assert.ok(audit.issues.includes('INVALID_SKIN_INDICES'));
 assert.equal(audit.productionEligible,false);
 assert.equal(indices.getComponent(0,0),3);
});

test('Vibe 5.9 rig QA keeps partial real skin weights unverified',()=>{
 const bone={isBone:true,name:'Spine'};
 const mesh={isSkinnedMesh:true,name:'Body',skeleton:{bones:[bone]},geometry:{attributes:{
  skinWeight:{count:10,itemSize:4,getComponent:(i,j)=>j===0?1:0},
  skinIndex:{count:10,itemSize:4,getComponent:()=>0}
 }}};
 const model={traverse(fn){fn(bone);fn(mesh)}};
 const partial=inspectVibeCharacterRig(model,{sampleLimit:3});
 assert.equal(partial.totalVertices,10);
 assert.equal(partial.weightsSampled,3);
 assert.equal(partial.coverageComplete,false);
 assert.equal(partial.productionEligible,false);
 assert.ok(partial.issues.includes('RIG_AUDIT_COVERAGE_INCOMPLETE'));
 const full=inspectVibeCharacterRig(model,{sampleLimit:10});
 assert.equal(full.weightsSampled,10);
 assert.equal(full.coverageComplete,true);
 assert.equal(full.productionEligible,true);
});
test('Vibe 5.9 rig QA fully inspects uneven mesh sizes within budget',()=>{
 const bone={isBone:true,name:'Spine'};
 const attribute=n=>({count:n,itemSize:4,getComponent:(i,j)=>j===0?1:0});
 const meshes=[1,9].map((n,i)=>({isSkinnedMesh:true,name:'Mesh'+i,skeleton:{bones:[bone]},
  geometry:{attributes:{skinWeight:attribute(n),skinIndex:{count:n,itemSize:4,getComponent:()=>0}}}}));
 const model={traverse(fn){fn(bone);meshes.forEach(fn)}};
 const full=inspectVibeCharacterRig(model,{sampleLimit:10});
 assert.equal(full.weightsSampled,10);
 assert.equal(full.coverageComplete,true);
 assert.equal(full.productionEligible,true);
 assert.equal(inspectVibeCharacterRig(model,{sampleLimit:9}).productionEligible,false);
});
test('Vibe 5.9 GLTF preview displays real rig audit without mutating the mesh',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.ok(html.includes('inspectVibeCharacterRig(activeModel,{sampleLimit:4096})'));
 assert.ok(html.includes('report.coverageComplete'));
 assert.ok(html.includes('studioControls.append(rigAuditButton)'));
 assert.ok(html.includes('if(!url||!activeModel)'));
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
