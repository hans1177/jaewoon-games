// 파일명: assets/vibe-cinematic-polish.mjs
// [임포트] 외부 에셋 없이 기존 Three.js 표현 계층에 연결되는 시네마틱 연출
// Original cinematic polish tools for THREE scenes. No external copyrighted assets.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
export const vibeLightingPresets=Object.freeze({
 forest:{sky:0xa4c8ff,ground:0x304638,ambient:1.2,key:0xffe1b0,keyPower:2.6,fill:0x90bbff,fillPower:1.2,rim:0xb4ffd9,rimPower:1.6,fog:0x647d75,density:.018},
 volcano:{sky:0xffb68d,ground:0x36241f,ambient:.72,key:0xff7d3b,keyPower:3.5,fill:0x8f9ee6,fillPower:.45,rim:0xff3922,rimPower:2.7,fog:0x4d2926,density:.032},
 laboratory:{sky:0xdceaff,ground:0x414b55,ambient:1.5,key:0xf4f8ff,keyPower:2.2,fill:0x8fcfff,fillPower:1.6,rim:0xb9ffe8,rimPower:.85,fog:0x9aa9b8,density:.006}
});
// [메인: 장면 조명] 단일 키/보조/윤곽 조명으로 명암을 통일하고 모바일 그림자 비용을 제한한다.
export function createVibeLightingDirector(THREE,scene,{preset='forest',shadows=true,mobile=false,subjectSeparation=0}={}){
 if(!vibeLightingPresets[preset])throw Error('Unknown lighting preset');
 const hemi=new THREE.HemisphereLight(),key=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight(),rim=new THREE.DirectionalLight();
 key.position.set(4,7,5);fill.position.set(-5,3,3);rim.position.set(1,4,-6);
 key.castShadow=!!shadows;
 if(shadows){
  const resolution=mobile?1024:2048;
  key.shadow.mapSize.set(resolution,resolution);
  key.shadow.bias=-.00015;key.shadow.normalBias=.025;
  key.shadow.camera.near=.1;key.shadow.camera.far=30;
 }
 for(const light of [hemi,key,fill,rim])scene.add(light);
 const oldFog=scene.fog,fog=new THREE.FogExp2(0xffffff,.01);scene.fog=fog;
 // [조명: 피사체 분리] 기존 조명 수/배경 에셋을 늘리지 않고 반사광 대비만 조절한다.
 const separation=clamp(subjectSeparation,0,.5);
 let current={...vibeLightingPresets[preset]},start={...current},target={...current};
 let duration=0,elapsed=0;
 const color=(hex)=>new THREE.Color(hex);
 function apply(v){
  hemi.color.copy(color(v.sky));hemi.groundColor.copy(color(v.ground));hemi.intensity=v.ambient*(1-separation*.7);
  key.color.copy(color(v.key));key.intensity=v.keyPower;
  fill.color.copy(color(v.fill));fill.intensity=v.fillPower;
  rim.color.copy(color(v.rim));rim.intensity=v.rimPower*(1+separation);
  fog.color.copy(color(v.fog));fog.density=v.density;
 }
 apply(current);
 return {
  transition(name,seconds=1){
   if(!vibeLightingPresets[name])throw Error('Unknown lighting preset');
   start={...current};target={...vibeLightingPresets[name]};
   duration=Number.isFinite(seconds)?Math.max(0,seconds):0;elapsed=0;
   if(!duration){current={...target};apply(current)}
  },
  update(dt){
   if(!Number.isFinite(dt)||dt<=0||elapsed>=duration)return;
   elapsed=Math.min(duration,elapsed+Math.min(dt,.1));
   const t=smooth(elapsed/duration);
   current=Object.fromEntries(Object.keys(target).map(k=>[k,
    k==='ambient'||k.endsWith('Power')||k==='density'
     ?lerp(start[k],target[k],t)
     :color(start[k]).lerp(color(target[k]),t).getHex()
   ]));
   apply(current);
  },
  dispose(){
   for(const light of [hemi,key,fill,rim])scene.remove(light);
   if(scene.fog===fog)scene.fog=oldFog;
   key.castShadow=false;
  }
 };
}
// [메인: 3D 카메라] 관성/피사체 예측/시선 보간은 렌더 전용이며 이동 판정과 분리한다.
export function createVibeShotComposer(THREE,camera,{subject=null}={}){
 const target=new THREE.Vector3(),velocity=new THREE.Vector3();
 const origin=new THREE.Vector3(),previous=new THREE.Vector3(),motion=new THREE.Vector3();
 const offsetVector=new THREE.Vector3(),aim=new THREE.Vector3(),desired=new THREE.Vector3(),delta=new THREE.Vector3();
 let initialized=false;
 const number=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
 return {
  update(dt,{subjectPosition=null,offset=[2,1.6,4],lookOffset=[0,1.4,0],damping=7,
    lookDamping=9,deadZone=.02,framing=.5,leadSeconds=.12,maxLead=.7,reducedMotion=false}={}){
   if(!Number.isFinite(dt)||dt<=0)return;
   const step=Math.min(dt,.1),follow=1-Math.exp(-step*Math.max(.1,number(damping,7)));
   const gaze=1-Math.exp(-step*Math.max(.1,number(lookDamping,9)));
   if(subjectPosition)origin.set(number(subjectPosition.x),number(subjectPosition.y),number(subjectPosition.z));
   else if(subject?.getWorldPosition)subject.getWorldPosition(origin);
   else origin.set(0,0,0);
   offsetVector.set(number(offset[0]),number(offset[1]),number(offset[2]));
   delta.copy(origin).sub(previous);
   // 큰 순간이동은 직전 속도를 이어 쓰지 않아 화면이 엉뚱한 방향으로 쏠리지 않게 한다.
   const teleport=initialized&&delta.length()>Math.max(4,offsetVector.length()*3);
   if(!initialized||teleport)motion.set(0,0,0);
   else motion.lerp(delta.multiplyScalar(1/Math.max(dt,.001)),1-Math.exp(-step*8));
   previous.copy(origin);
   delta.copy(motion).multiplyScalar(Math.max(0,Math.min(.25,number(leadSeconds,.12))));
   const leadLimit=Math.max(0,Math.min(2,number(maxLead,.7)));
   if(delta.length()>leadLimit)delta.multiplyScalar(leadLimit/delta.length());
   desired.copy(origin).add(offsetVector).add(delta);
   aim.copy(origin).add(delta).add(offsetVector.set(number(lookOffset[0]),number(lookOffset[1]),number(lookOffset[2])));
   if(!initialized||teleport||reducedMotion){
    camera.position.copy(desired);target.copy(aim);
   }else{
    if(camera.position.distanceTo(desired)>Math.max(0,number(deadZone,.02)))camera.position.lerp(desired,follow);
    target.lerp(aim,gaze);
   }
   camera.lookAt(target);
   const requestedFov=Math.min(55,Math.max(23.5,Math.min(1,Math.max(.1,number(framing,.5)))*35+20));
   const currentFov=number(camera.fov,45);
   const nextFov=reducedMotion?requestedFov:lerp(currentFov,requestedFov,follow);
   if(Math.abs(nextFov-currentFov)>.001){
    camera.fov=nextFov;camera.updateProjectionMatrix();
   }
   velocity.copy(desired).sub(camera.position);
   initialized=true;
  },
  get velocity(){return velocity.clone()},
  reset(){initialized=false;motion.set(0,0,0);velocity.set(0,0,0)}
 };
}
// [메인: 캐릭터 연기] 표정 전환을 보간하고 중립 표정에서 이전 모프 값을 반드시 해제한다.
export function createVibeExpressionDirector(face,{blinkSeconds=3.4,transitionSeconds=.18}={}){
 let elapsed=0,initialized=false,current='neutral',intensity=1;
 const presets={
  neutral:{},joy:{mouthSmileLeft:.8,mouthSmileRight:.8,cheekPuff:.2},
  fear:{browInnerUp:.8,eyeWideLeft:.55,eyeWideRight:.55,jawOpen:.28},
  anger:{browDownLeft:.75,browDownRight:.75,mouthClose:.4},
  sad:{browInnerUp:.6,mouthFrownLeft:.65,mouthFrownRight:.65},
  pain:{eyeBlinkLeft:.7,eyeBlinkRight:.7,mouthFrownLeft:.55,mouthFrownRight:.55,jawOpen:.25}
 };
 const channels=[...new Set([...Object.values(presets).flatMap(p=>Object.keys(p)),'eyeBlinkLeft','eyeBlinkRight','jawOpen'])];
 const pose=Object.fromEntries(channels.map(key=>[key,0]));
 const blinkPeriod=Number.isFinite(blinkSeconds)&&blinkSeconds>.3?blinkSeconds:3.4;
 return {
  set(name,weight=1){if(!presets[name])throw Error('Unknown expression');current=name;intensity=clamp(weight)},
  update(dt,{speaking=false,reducedMotion=false}={}){
   if(!Number.isFinite(dt)||dt<=0)return;
   const step=Math.min(dt,.1);elapsed+=step;
   const alpha=!initialized||reducedMotion||transitionSeconds<=0?1:1-Math.exp(-step/transitionSeconds);
   const expression=presets[current];
   for(const key of channels)pose[key]=lerp(pose[key],(expression[key]||0)*intensity,alpha);
   // 눈깜박임은 짧게 유지하고, 입 모양은 음성 상태에 즉시 반응한다.
   const cycle=elapsed%blinkPeriod;
   const blink=cycle<.14?Math.sin(Math.PI*cycle/.14):0;
   const weights={...pose};
   weights.eyeBlinkLeft=Math.max(weights.eyeBlinkLeft,blink);
   weights.eyeBlinkRight=Math.max(weights.eyeBlinkRight,blink);
   if(speaking)weights.jawOpen=Math.max(weights.jawOpen,.12+.17*Math.abs(Math.sin(elapsed*11)));
   face.pose(weights);
   initialized=true;
  },
  get expression(){return current}
 };
}
export function inspectVibeCharacterAsset(model){
 const result={meshes:0,triangles:0,bones:0,morphTargets:0,materials:0,missingUV:[],warnings:[]};const materials=new Set();
 model.traverse(o=>{
  if(o.isBone)result.bones++;
  if(!o.isMesh)return;
  result.meshes++;
  const geo=o.geometry;
  if(geo){const count=geo.index?geo.index.count:geo.attributes.position?.count||0;result.triangles+=Math.floor(count/3);if(!geo.attributes.uv)result.missingUV.push(o.name||'unnamed')}
  result.morphTargets+=Object.keys(o.morphTargetDictionary||{}).length;
  for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat)materials.add(mat);
 });
 result.materials=materials.size;
 if(result.bones<20)result.warnings.push('Detailed skeletal rig recommended (20+ bones)');
 if(result.morphTargets<18)result.warnings.push('Facial blendshapes below 18-channel target');
 if(result.triangles>100000)result.warnings.push('Provide lower-detail LOD for mobile');
 if(result.missingUV.length)result.warnings.push('Meshes without UV maps cannot be texture painted reliably');
 return result;
}
