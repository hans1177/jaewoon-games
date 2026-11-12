// 파일명: qa/vibe-cinematic-polish.test.mjs
// [임포트] 기존 시네마틱 모듈 회귀검사
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVibeLightingDirector,createVibeShotComposer,createVibeExpressionDirector,inspectVibeRenderedScene,inspectVibeCharacterAsset,vibeLightingPresets,createVibeRenderQualityController,createVibeAuthoredMeshLOD,batchVibeExistingStaticMeshes} from '../assets/vibe-cinematic-polish.mjs';
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
 // [QA] 넓은 액션 화각도 장르 값 그대로 적용하고 기본 프레이밍은 보존한다.
 shot.update(.016,{...controls,subjectPosition:{x:2,y:0,z:0},fieldOfView:65,reducedMotion:true});
 assert.equal(camera.fov,65);
 shot.update(.016,{...controls,subjectPosition:{x:2,y:0,z:0},fieldOfView:999,reducedMotion:true});
 assert.equal(camera.fov,95);
 shot.update(.016,{...controls,subjectPosition:{x:2,y:0,z:0},fieldOfView:15,reducedMotion:true});
 assert.equal(camera.fov,20);
 shot.update(.016,{...controls,subjectPosition:{x:2,y:0,z:0},reducedMotion:true});
 assert.equal(camera.fov,44.5);
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
 const focused={children:[],fog:null,add(x){this.children.push(x)},remove(x){this.children.splice(this.children.indexOf(x),1)}};
 const separated=createVibeLightingDirector(THREE,focused,{subjectSeparation:.28,shadows:false});
 assert.equal(focused.children.length,4);
 assert.equal(focused.children[1].castShadow,false);
 assert.ok(focused.children[0].intensity<vibeLightingPresets.forest.ambient);
 assert.ok(focused.children[3].intensity>vibeLightingPresets.forest.rimPower);
 separated.dispose();
});
// [메인: 3D 미리보기] 조작창, 렌더 색공간, 오디오 클록의 통합 연결을 확인한다.
test('3D art preview uses the canonical lighting rig and a touch-safe panel',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.match(html,/createVibeLightingDirector\(THREE,scene,\{mobile:mobileView,subjectSeparation:\.28\}\)/);
 assert.match(html,/renderer\.toneMapping=THREE\.ACESFilmicToneMapping/);
 assert.match(html,/studioControls\.append\(picker,audioButton\)/);
 assert.match(html,/studioControls\.className='studio-panel'/);
 assert.match(html,/viewport-fit=cover/);
 assert.match(html,/window\.performance\.now\(\)/);
 assert.match(html,/characterPerformance\.update\(delta\)/);
 assert.doesNotMatch(html,/scene\.add\(new THREE\.HemisphereLight/);
 assert.doesNotMatch(html,/now:performance\.now\(\)\/1000/);
 assert.match(html,/if\(mobileView\)\{/);
 assert.match(html,/sampleFrames\+\+/);
 assert.match(html,/fps<22/);
 assert.match(html,/fps>28/);
 assert.match(html,/Math\.max\(\.85,currentPixelRatio-\.25\)/);
 assert.match(html,/if\(document\.hidden\)\{sampleStarted=0/);
 assert.match(html,/expressionDirector\.update\(delta,\{reducedMotion:gameUi\.ui\.settings\.reducedMotion\}\)/);
 // [QA] 단일 카메라 책임 함수와 모바일 포인터가 기존 이동 집합에 직접 연결되어야 한다.
 assert.match(html,/createVibeShotComposer\(THREE,camera\)/);
 assert.match(html,/shotComposer\.update\(delta,\{/);
 assert.match(html,/fieldOfView:view\.fov/);
 assert.match(html,/if\(showcaseActive\)cinematic\.update\(delta\);\s*\/\/[^\n]*\n else if\(activeModel\)/);
 assert.match(html,/touchControls\.className='vibe-touch-controls'/);
 assert.match(html,/touchKeys\.has\('ArrowRight'\)/);
 assert.match(html,/touchKeys\.has\('ArrowUp'\)/);
 assert.match(html,/button\.setPointerCapture\(event\.pointerId\)/);
 assert.match(html,/button\.addEventListener\('pointercancel',release\)/);
 assert.match(html,/button\.addEventListener\('lostpointercapture',release\)/);
 assert.match(html,/window\.addEventListener\('blur',/);
 assert.match(html,/touch-action:none/);
});

// [실제 화면 판독] 가상 입력/소스 마커는 품질 합격으로 승격하지 않는다.
test('visual director only diagnoses observed WebGL pixels and never grants release PASS',()=>{
 const dark=new Uint8Array(25*4);
 for(let i=0;i<25;i++){dark.set([28,28,28,255],i*4)}
 const result=inspectVibeRenderedScene({pixels:dark,width:640,height:480,source:'webgl-readpixels',observed:true});
 assert.equal(result.observed,true);
 assert.equal(result.status,'PIXEL_DIAGNOSTIC_ONLY');
 assert.equal(result.samples,25);
 assert.equal(result.exposureDelta,.05);
 assert.ok(result.findings.includes('underexposed-frame'));
 assert.ok(result.findings.includes('weak-value-separation'));
 assert.equal(result.releaseAuthority,false);
 assert.equal(result.visualQualityPass,false);
 const bright=new Uint8Array(25*4);
 for(let i=0;i<25;i++)bright.set([250,250,250,255],i*4);
 assert.equal(inspectVibeRenderedScene({pixels:bright,width:640,height:480,source:'webgl-readpixels',observed:true}).exposureDelta,-.05);
 const marker=inspectVibeRenderedScene({pixels:dark,width:640,height:480,source:'source-marker',observed:true});
 assert.equal(marker.observed,false);
 assert.equal(marker.releaseAuthority,false);
 const absent=inspectVibeRenderedScene({});
 assert.equal(absent.status,'NO_RUNTIME_PIXELS');
});
// [화면 연결] 장르·월드·캐릭터·시네마틱·관측 픽셀 모두 실제 기존 미리보기에서 연결한다.
test('3D preview connects five art directors without extra model primitives',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.match(html,/resolveVibeGenre\(genrePicker\.value\)\.artDirection/);
 assert.match(html,/storybookWorld\.transitionRegion\(worldPicker\.value,1\)/);
 assert.match(html,/createVibeGenreCharacter\(THREE,activeModel,genrePicker\.value\)/);
 assert.match(html,/stageBeats:true/);
 assert.match(html,/onEvent:event=>/);
 assert.match(html,/gl\.readPixels\(/);
 assert.match(html,/inspectVibeRenderedScene\(\{pixels:samples,width:w,height:h,source:'webgl-readpixels',observed:true\}\)/);
 assert.match(html,/visualReviewPhase==='candidate'/);
 assert.match(html,/visualReviewBaseline\.result\.luminance/);
 assert.match(html,/if\(asset&&\(\!/);
 assert.doesNotMatch(html,/storybookWorld\.dispose\(\);storybookWorld=createVibeStorybookWorld/);
});

test('Vibe 5.9 real renderer quality degrades after sustained high draw calls and restores source settings',()=>{
 const calls=[],renderer={shadowMap:{enabled:true},getPixelRatio(){return this.ratio||1.5},setPixelRatio(v){this.ratio=v;calls.push(v)}};
 const quality=createVibeRenderQualityController(renderer,{mobile:true,maxPixelRatio:1.5,targetFps:29});
 for(let i=0;i<65;i++)quality.sample(.1,{drawCalls:500});
 assert.equal(quality.tier,'MID');
 assert.ok(renderer.ratio<1.5);
 quality.dispose();assert.equal(renderer.ratio,1.5);assert.equal(renderer.shadowMap.enabled,true);
});

test('Vibe 5.9 only switches between artist-authored LOD meshes and keeps the originals',()=>{
 class Vec3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}}
 const rows=[0,1,2].map(i=>({isMesh:true,name:'Tree_LOD'+i,visible:true}));
 const root={traverse(fn){rows.forEach(fn)},getWorldPosition(v){return v.set(0,0,0)}};
 const lod=createVibeAuthoredMeshLOD({Vector3:Vec3},root,{distances:[5,15]});
 assert.equal(lod.groups,1);
 lod.update({position:new Vec3(0,0,2)});assert.deepEqual(rows.map(x=>x.visible),[true,false,false]);
 lod.update({position:new Vec3(0,0,20)});assert.deepEqual(rows.map(x=>x.visible),[false,false,true]);
 lod.reset();assert.ok(rows.every(x=>x.visible));
});

test('Vibe 5.9 authored LOD activates initially hidden lower-detail geometry and reset restores authoring',()=>{
 class Vec3{set(x,y,z){this.x=x;this.y=y;this.z=z;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}}
 const parent={},high={parent,isMesh:true,name:'Cliff_LOD0',visible:true};
 const low={parent,isMesh:true,name:'Cliff_LOD1',visible:false};
 const root={traverse(fn){fn(high);fn(low)},getWorldPosition(v){return v.set(0,0,0)}};
 const lod=createVibeAuthoredMeshLOD({Vector3:Vec3},root,{distances:[10]});
 lod.update({position:{x:0,y:0,z:25}});
 assert.equal(high.visible,false);
 assert.equal(low.visible,true);
 lod.update({position:{x:0,y:0,z:2}});
 assert.equal(high.visible,true);
 assert.equal(low.visible,false);
 lod.reset();
 assert.equal(high.visible,true);
 assert.equal(low.visible,false);
});

test('Vibe 5.9 LOD selection uses the individual authored object world position',()=>{
 class Vec3{set(x,y,z){this.x=x;this.y=y;this.z=z;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}}
 const parentNear={getWorldPosition(v){return v.set(0,0,0)}};
 const parentFar={getWorldPosition(v){return v.set(100,0,0)}};
 const rows=[];
 for(const parent of [parentNear,parentFar])for(let level=0;level<2;level++)
  rows.push({parent,isMesh:true,name:'Tree_LOD'+level,visible:true});
 const root={traverse(fn){rows.forEach(fn)},getWorldPosition(v){return v.set(0,0,0)}};
 const lod=createVibeAuthoredMeshLOD({Vector3:Vec3},root,{distances:[10]});
 assert.equal(lod.groups,2);
 lod.update({position:{x:0,y:0,z:0}});
 assert.deepEqual(rows.map(r=>r.visible),[true,false,false,true]);
 lod.update({position:{x:100,y:0,z:0}});
 assert.deepEqual(rows.map(r=>r.visible),[false,true,true,false]);
 lod.reset();assert.ok(rows.every(r=>r.visible));
});

test('Vibe 5.9 static batching preserves shadow, layer, render-order and culling differences',()=>{
 class InstancedMesh{
  constructor(geometry,material,count){this.count=count;this.instanceMatrix={needsUpdate:false};this.layers={mask:1};this.matrices=[]}
  setMatrixAt(i,m){this.matrices[i]=m}dispose(){}
 }
 const geometry={uuid:'geo'},material={uuid:'mat'};
 const make=(i,opts={})=>({name:'Stone'+i,isMesh:true,visible:true,geometry,material,
  castShadow:true,receiveShadow:false,renderOrder:0,layers:{mask:1},frustumCulled:true,
  updateMatrix(){},matrix:{i},...opts});
 const grouped=Array.from({length:4},(_,i)=>make(i));
 const mismatched=[make(5,{castShadow:false}),make(6,{layers:{mask:2}}),
  make(7,{renderOrder:12}),make(8,{frustumCulled:false})];
 const original=[...grouped,...mismatched];
 const root={children:[...original],add(o){this.children.push(o)},remove(o){this.children.splice(this.children.indexOf(o),1)}};
 const batch=batchVibeExistingStaticMeshes({InstancedMesh},root,{minimum:4});
 assert.equal(batch.batched,4);
 assert.equal(batch.drawCallsSaved,3);
 assert.ok(grouped.every(r=>!r.visible));
 assert.ok(mismatched.every(r=>r.visible));
 const merged=root.children.at(-1);
 assert.equal(merged.castShadow,true);assert.equal(merged.receiveShadow,false);
 assert.equal(merged.layers.mask,1);assert.equal(merged.renderOrder,0);assert.equal(merged.frustumCulled,true);
 batch.dispose();assert.ok(original.every(r=>r.visible));assert.equal(root.children.length,8);
});

test('Vibe 5.9 batches only repeated nonanimated static source meshes and disposes safely',()=>{
 class InstancedMesh{
  constructor(geo,mat,count){this.count=count;this.instanceMatrix={needsUpdate:false};this.matrices=[]}
  setMatrixAt(i,m){this.matrices[i]=m}
  dispose(){this.disposed=true}
 }
 const geometry={uuid:'geo-a'},material={uuid:'mat-a'};
 const rows=Array.from({length:4},(_,i)=>({isMesh:true,name:'Tree'+i,visible:true,
  geometry,material,matrix:{i},updateMatrix(){},castShadow:false,receiveShadow:true}));
 rows.push({isMesh:true,isSkinnedMesh:true,geometry,material,visible:true});
 const root={children:[...rows],add(x){this.children.push(x)},remove(x){this.children.splice(this.children.indexOf(x),1)}};
 const batch=batchVibeExistingStaticMeshes({InstancedMesh},root,{minimum:4});
 assert.equal(batch.batched,4);assert.equal(batch.drawCallsSaved,3);
 assert.equal(rows[4].visible,true);assert.ok(rows.slice(0,4).every(x=>!x.visible));
 batch.dispose();assert.ok(rows.every(x=>x.visible));assert.equal(root.children.length,5);
});

test('Vibe 5.9 static batching preserves hidden, transparent and manual-matrix meshes',()=>{
 class InstancedMesh{
  constructor(geometry,material,count){this.count=count;this.instanceMatrix={needsUpdate:false};this.matrices=[]}
  setMatrixAt(i,m){this.matrices[i]=m}
  dispose(){this.disposed=true}
 }
 const geometry={uuid:'shared-geo'},material={uuid:'shared-mat'};
 const plain=i=>({isMesh:true,name:'Foliage'+i,visible:true,matrixAutoUpdate:true,
  geometry,material,matrix:{i},updateMatrix(){},castShadow:false,receiveShadow:true});
 const visible=Array.from({length:4},(_,i)=>plain(i));
 const hidden={...plain(4),visible:false};
 const manual={...plain(5),matrixAutoUpdate:false};
 const translucent=Array.from({length:4},(_,i)=>({...plain(10+i),material:{uuid:'glass',transparent:true}}));
 const root={children:[...visible,hidden,manual,...translucent],
  add(o){this.children.push(o)},remove(o){this.children.splice(this.children.indexOf(o),1)}};
 const batch=batchVibeExistingStaticMeshes({InstancedMesh},root,{minimum:4});
 assert.equal(batch.batched,4);
 assert.equal(batch.drawCallsSaved,3);
 assert.equal(hidden.visible,false);
 assert.equal(manual.visible,true);
 assert.ok(translucent.every(o=>o.visible));
 batch.dispose();
 assert.ok(visible.every(o=>o.visible));
 assert.equal(hidden.visible,false);
 assert.equal(root.children.length,10);
});

test('Vibe 5.9 graphics are attached to the existing WebGL preview, not a duplicate runtime',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 for(const symbol of ['createVibeAuthoredMeshLOD(THREE,model)','batchVibeExistingStaticMeshes(THREE,model',
  'desktopQuality?.sample(delta','lightingDirector.setShadowQuality(fps<22','new bloomModule.UnrealBloomPass']){
  assert.ok(html.includes(symbol),symbol);
 }
 assert.match(html,/else renderer\.render\(scene,camera\)/);
});

test('Vibe 5.9 LOD keeps all repeated authored meshes at chosen detail level',()=>{
 class Vec3{set(x,y,z){this.x=x;this.y=y;this.z=z;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}}
 const parent={},rows=[];
 for(let level=0;level<=1;level++)for(let n=0;n<3;n++)rows.push({parent,isMesh:true,name:'Forest_LOD'+level,visible:true});
 const root={traverse(fn){rows.forEach(fn)},getWorldPosition(v){return v.set(0,0,0)}};
 const controller=createVibeAuthoredMeshLOD({Vector3:Vec3},root,{distances:[5]});
 controller.update({position:{x:0,y:0,z:8}});
 assert.equal(rows.filter(x=>x.visible).length,3);
 assert.ok(rows.filter(x=>x.visible).every(x=>x.name==='Forest_LOD1'));
 controller.reset();assert.equal(rows.filter(x=>x.visible).length,6);
});


test('Vibe 5.9 approved GLTF preview uses one motion adapter and applies actual input movement',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.ok(html.includes('characterMotion.move({speed:Math.min(1,motionState.speed'));
 assert.ok(html.includes('if(activeModel&&!climbMotion?.busy()&&playerHealth.alive)'));
 assert.ok(html.includes("animationPicker.addEventListener('change',()=>adapter.play(animationPicker.value))"));
 assert.ok(!html.includes('mixer=new THREE.AnimationMixer(model)'));
 assert.ok(!html.includes('adapter.action(\'idle\')'));
});
