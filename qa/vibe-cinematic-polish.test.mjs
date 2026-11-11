// 파일명: qa/vibe-cinematic-polish.test.mjs
// [임포트] 기존 시네마틱 모듈 회귀검사
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibeShotComposer,createVibeExpressionDirector,inspectVibeCharacterAsset,vibeLightingPresets} from '../assets/vibe-cinematic-polish.mjs';
test('expressions emit facial muscle channels and speech cues',()=>{
 const frames=[];const director=createVibeExpressionDirector({pose:p=>frames.push(p)});
 director.set('fear');director.update(.05,{speaking:true});
 assert.ok(frames[0].browInnerUp>.5);
 assert.ok(frames[0].jawOpen>.2);
 assert.throws(()=>director.set('unknown'));
});
test('asset inspection identifies missing rigging and UV',()=>{
 const model={traverse(fn){fn({isMesh:true,name:'Body',geometry:{attributes:{position:{count:30}}},material:{}})}};
 const report=inspectVibeCharacterAsset(model);
 assert.equal(report.triangles,10);
 assert.equal(report.missingUV[0],'Body');
 assert.ok(report.warnings.length>=2);
});
test('three lighting environments available',()=>{
 assert.deepEqual(Object.keys(vibeLightingPresets),['forest','volcano','laboratory']);
});

 
// [메인: 카메라] 실제 3D 수학 연산과 동등한 최소 벡터로 추적·시선·순간이동을 확인한다.
test('3D camera follows subject smoothly, leads within bounds, and snaps on teleport',()=>{
 class Vec3{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  clone(){return new Vec3(this.x,this.y,this.z)}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
  distanceTo(v){return this.clone().sub(v).length()}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this}
 }
 const views=[],camera={position:new Vec3(),fov:45,lookAt(v){views.push(v.clone())},updateProjectionMatrix(){}};
 const shot=createVibeShotComposer({Vector3:Vec3},camera);
 const controls={offset:[3,2,6],lookOffset:[0,1,0],framing:.7,maxLead:.5};
 shot.update(.016,{...controls,subjectPosition:{x:0,y:0,z:0}});
 assert.equal(camera.position.x,3);
 assert.equal(views.at(-1).y,1);
 shot.update(.016,{...controls,subjectPosition:{x:1,y:0,z:0}});
 assert.ok(camera.position.x>3&&camera.position.x<4.5);
 assert.ok(views.at(-1).x>0&&views.at(-1).x<1.5);
 shot.update(.016,{...controls,subjectPosition:{x:50,y:0,z:0}});
 assert.equal(camera.position.x,53);
 assert.equal(views.at(-1).x,50);
 shot.reset();
 shot.update(.016,{...controls,subjectPosition:{x:2,y:0,z:0},reducedMotion:true});
 assert.equal(camera.position.x,5);
 assert.ok(shot.velocity.length()<1e-9);
});
 
// [메인: 표정] 감정 교체 때 이전 모프가 남지 않으면서 중간 프레임은 자연스럽게 섞인다.
test('facial acting blends emotion and clears stale channels at neutral',()=>{
 const frames=[],director=createVibeExpressionDirector({pose:weights=>frames.push({...weights})});
 director.set('fear');director.update(.05);
 assert.ok(frames.at(-1).browInnerUp>.5);
 director.set('neutral');director.update(.05);
 assert.ok(frames.at(-1).browInnerUp>0&&frames.at(-1).browInnerUp<.8);
 for(let i=0;i<35;i++){director.set('neutral');director.update(.1)}
 assert.ok(frames.at(-1).browInnerUp<.001);
 director.set('pain');director.update(.05,{reducedMotion:true});
 assert.ok(frames.at(-1).mouthFrownLeft>.5);
 director.set('neutral');director.update(.05,{reducedMotion:true});
 assert.equal(frames.at(-1).mouthFrownLeft,0);
 assert.equal(frames.at(-1).browInnerUp,0);
});
