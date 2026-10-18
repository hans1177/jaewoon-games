// Original cinematic polish tools for THREE scenes. No external copyrighted assets.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
export const vibeLightingPresets=Object.freeze({
 forest:{sky:0xa4c8ff,ground:0x304638,ambient:1.2,key:0xffe1b0,keyPower:2.6,fill:0x90bbff,fillPower:1.2,rim:0xb4ffd9,rimPower:1.6,fog:0x647d75,density:.018},
 volcano:{sky:0xffb68d,ground:0x36241f,ambient:.72,key:0xff7d3b,keyPower:3.5,fill:0x8f9ee6,fillPower:.45,rim:0xff3922,rimPower:2.7,fog:0x4d2926,density:.032},
 laboratory:{sky:0xdceaff,ground:0x414b55,ambient:1.5,key:0xf4f8ff,keyPower:2.2,fill:0x8fcfff,fillPower:1.6,rim:0xb9ffe8,rimPower:.85,fog:0x9aa9b8,density:.006}
});
export function createVibeLightingDirector(THREE,scene,{preset='forest',shadows=true}={}){
 if(!vibeLightingPresets[preset])throw Error('Unknown lighting preset');
 const hemi=new THREE.HemisphereLight(),key=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight(),rim=new THREE.DirectionalLight();
 key.position.set(4,7,5);fill.position.set(-5,3,3);rim.position.set(1,4,-6);
 key.castShadow=!!shadows;if(shadows){key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;key.shadow.normalBias=.025;key.shadow.camera.near=.1;key.shadow.camera.far=30;}
 for(const light of [hemi,key,fill,rim])scene.add(light);
 const oldFog=scene.fog;const fog=new THREE.FogExp2(0xffffff,.01);scene.fog=fog;
 let current={...vibeLightingPresets[preset]},start={...current},target={...current},duration=0,elapsed=0;
 const color=(hex)=>new THREE.Color(hex);
 function apply(v){
  hemi.color.copy(color(v.sky));hemi.groundColor.copy(color(v.ground));hemi.intensity=v.ambient;
  key.color.copy(color(v.key));key.intensity=v.keyPower;
  fill.color.copy(color(v.fill));fill.intensity=v.fillPower;
  rim.color.copy(color(v.rim));rim.intensity=v.rimPower;
  fog.color.copy(color(v.fog));fog.density=v.density;
 }
 apply(current);
 return {
  transition(name,seconds=1){if(!vibeLightingPresets[name])throw Error('Unknown lighting preset');start={...current};target={...vibeLightingPresets[name]};duration=Math.max(0,seconds);elapsed=0;if(!duration){current={...target};apply(current)}},
  update(dt){if(!Number.isFinite(dt)||dt<=0||elapsed>=duration)return;elapsed=Math.min(duration,elapsed+Math.min(dt,.1));const t=smooth(elapsed/duration);current=Object.fromEntries(Object.keys(target).map(k=>[k,k==='ambient'||k.endsWith('Power')||k==='density'?lerp(start[k],target[k],t):color(start[k]).lerp(color(target[k]),t).getHex()]));apply(current)},
  dispose(){for(const light of [hemi,key,fill,rim])scene.remove(light);if(scene.fog===fog)scene.fog=oldFog}
 };
}
export function createVibeShotComposer(THREE,camera,{subject=null}={}){
 const target=new THREE.Vector3(),velocity=new THREE.Vector3();let last=null;
 return {
  update(dt,{subjectPosition=null,offset=[2,1.6,4],lookOffset=[0,1.4,0],damping=7,deadZone=.02,framing=.5}={}){
   if(!Number.isFinite(dt)||dt<=0)return;
   const origin=subjectPosition?new THREE.Vector3(subjectPosition.x,subjectPosition.y,subjectPosition.z):subject?.getWorldPosition?.(new THREE.Vector3())||new THREE.Vector3();
   const desired=origin.clone().add(new THREE.Vector3(...offset));
   const alpha=1-Math.exp(-Math.min(dt,.1)*Math.max(.1,damping));
   if(!last){camera.position.copy(desired);last=desired.clone()}
   else if(camera.position.distanceTo(desired)>deadZone)camera.position.lerp(desired,alpha);
   target.copy(origin).add(new THREE.Vector3(...lookOffset));
   camera.lookAt(target);camera.fov=lerp(camera.fov,clamp(framing,.1,1)*35+20,alpha);camera.updateProjectionMatrix();
   velocity.copy(desired).sub(camera.position);
  },
  get velocity(){return velocity.clone()},
  reset(){last=null}
 };
}
export function createVibeExpressionDirector(face,{blinkSeconds=3.4}={}){
 let elapsed=0,lastBlink=-10;
 const presets={neutral:{},joy:{mouthSmileLeft:.8,mouthSmileRight:.8,cheekPuff:.2},fear:{browInnerUp:.8,eyeWideLeft:.55,eyeWideRight:.55,jawOpen:.28},anger:{browDownLeft:.75,browDownRight:.75,mouthClose:.4},sad:{browInnerUp:.6,mouthFrownLeft:.65,mouthFrownRight:.65},pain:{eyeBlinkLeft:.7,eyeBlinkRight:.7,mouthFrownLeft:.55,mouthFrownRight:.55,jawOpen:.25}};
 let current='neutral',intensity=1;
 return {
  set(name,weight=1){if(!presets[name])throw Error('Unknown expression');current=name;intensity=clamp(weight)},
  update(dt,{speaking=false}={}){
   if(!Number.isFinite(dt)||dt<=0)return;
   elapsed+=Math.min(dt,.1);const cycle=elapsed%blinkSeconds;
   const blink=cycle<.14?Math.sin(Math.PI*cycle/.14):0;
   const weights=Object.fromEntries(Object.entries(presets[current]).map(([key,value])=>[key,value*intensity]));
   weights.eyeBlinkLeft=Math.max(weights.eyeBlinkLeft||0,blink);
   weights.eyeBlinkRight=Math.max(weights.eyeBlinkRight||0,blink);
   weights.jawOpen=Math.max(weights.jawOpen||0,speaking?.12+.17*Math.abs(Math.sin(elapsed*11)):0);
   face.pose(weights);
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
