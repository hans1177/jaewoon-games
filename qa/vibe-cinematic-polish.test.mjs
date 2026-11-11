// 파일명: qa/vibe-cinematic-polish.test.mjs
// [임포트] 기존 시네마틱 모듈 회귀검사
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVibeLightingDirector,createVibeShotComposer,createVibeExpressionDirector,inspectVibeCharacterAsset,vibeLightingPresets} from '../assets/vibe-cinematic-polish.mjs';
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

// [메인: 조명] 단일 조명 감독기가 네 광원을 소유하며 모바일 그림자 예산을 낮춘다.
test('cinematic lighting owns one rig, transitions mood and releases scene fog',()=>{
 class Color{
  constructor(value=0){this.value=value}
  copy(other){this.value=other.value;return this}
  lerp(other,t){this.value=this.value+(other.value-this.value)*t;return this}
  getHex(){return Math.round(this.value)}
 }
 class Light{
  constructor(){
   this.color=new Color();this.groundColor=new Color();this.intensity=0;
   this.position={set(){}};
   this.shadow={mapSize:{set:(w,h)=>{this.shadow.size=[w,h]}},camera:{}};
  }
 }
 class FogExp2{constructor(color,density){this.color=new Color(color);this.density=density}}
 const THREE={Color,HemisphereLight:Light,DirectionalLight:Light,FogExp2};
 const existingFog={original:true};
 const scene={children:[],fog:existingFog,add(x){this.children.push(x)},remove(x){this.children.splice(this.children.indexOf(x),1)}};
 const director=createVibeLightingDirector(THREE,scene,{mobile:true});
 assert.equal(scene.children.length,4);
 assert.equal(scene.children.filter(l=>l.castShadow).length,1);
 assert.deepEqual(scene.children[1].shadow.size,[1024,1024]);
 assert.equal(scene.fog.density,vibeLightingPresets.forest.density);
 director.transition('volcano',.3);
 for(let i=0;i<4;i++)director.update(.1);
 assert.equal(scene.fog.density,vibeLightingPresets.volcano.density);
 director.transition('laboratory',0);
 assert.equal(scene.fog.density,vibeLightingPresets.laboratory.density);
 assert.throws(()=>director.transition('unknown'),/Unknown lighting/);
 director.dispose();
 assert.equal(scene.children.length,0);
 assert.equal(scene.fog,existingFog);
 const desktop={children:[],fog:null,add(x){this.children.push(x)},remove(x){this.children.splice(this.children.indexOf(x),1)}};
 const hi=createVibeLightingDirector(THREE,desktop,{mobile:false});
 assert.deepEqual(desktop.children[1].shadow.size,[2048,2048]);
 hi.dispose();
});
// [메인: 3D 미리보기] 조작창, 렌더 색공간, 오디오 클록의 통합 연결을 확인한다.
test('3D art preview uses the canonical lighting rig and a touch-safe panel',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.match(html,/createVibeLightingDirector\(THREE,scene,\{mobile:mobileView\}\)/);
 assert.match(html,/renderer\.toneMapping=THREE\.ACESFilmicToneMapping/);
 assert.match(html,/studioControls\.append\(picker,audioButton\)/);
 assert.match(html,/studioControls\.className='studio-panel'/);
 assert.match(html,/viewport-fit=cover/);
 assert.match(html,/window\.performance\.now\(\)/);
 assert.match(html,/characterPerformance\.update\(delta\)/);
 assert.doesNotMatch(html,/scene\.add\(new THREE\.HemisphereLight/);
 assert.doesNotMatch(html,/performance\.now\(\)\/1000/);
});
