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
  // [조명: 기기별 실제 그림자] 화질 등급이 내려가면 광원 수를 늘리지 않고 그림자 비용만 줄인다.
  setShadowQuality(level='HIGH'){
   const tier=String(level).toUpperCase();
   const enabled=Boolean(shadows)&&tier!=='LOW';
   const resolution=mobile?(tier==='HIGH'?1024:512):(tier==='HIGH'?2048:1024);
   if(key.castShadow!==enabled||key.shadow.mapSize.x!==resolution){
    key.castShadow=enabled;
    key.shadow.mapSize.set(resolution,resolution);
    if(key.shadow.map){key.shadow.map.dispose();key.shadow.map=null;}
   }
   return{enabled,resolution};
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
    lookDamping=9,deadZone=.02,framing=.5,fieldOfView=null,leadSeconds=.12,maxLead=.7,reducedMotion=false}={}){
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
   // [카메라] 장르별 넓은 화각은 명시적 설정일 때만 적용해 기존 프레이밍과 호환한다.
   const requestedFov=Number.isFinite(fieldOfView)
    ?Math.max(20,Math.min(95,fieldOfView))
    :Math.min(55,Math.max(23.5,Math.min(1,Math.max(.1,number(framing,.5)))*35+20));
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
// [메인: 실제 프레임 예산] 품질 변경을 안정화하고 기존 렌더러 설정을 직접 제어한다.
export function createVibeRenderQualityController(renderer,{mobile=false,maxPixelRatio=2,minPixelRatio=.8,initialTier='HIGH',targetFps=60,onTierChange=null}={}){
 if(!renderer?.setPixelRatio||!renderer?.shadowMap)throw Error('Three.js renderer required');
 const limit=Math.max(minPixelRatio,Number(maxPixelRatio)||1),floor=Math.max(.5,Math.min(limit,Number(minPixelRatio)||.8));
 const tiers=['LOW','MID','HIGH'];let index=Math.max(0,tiers.indexOf(String(initialTier).toUpperCase()));
 let frames=0,elapsed=0,slowWindows=0,fastWindows=0;
 const initialShadow=renderer.shadowMap.enabled,initialRatio=renderer.getPixelRatio?.()||limit;
 const ratios=[Math.max(floor,limit*.6),Math.max(floor,limit*.8),limit];
 const apply=()=>{
  const tier=tiers[index],ratio=ratios[index];
  if(Math.abs((renderer.getPixelRatio?.()||0)-ratio)>.01)renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=initialShadow&&index>0;
  onTierChange?.(tier);
  return{tier,ratio};
 };
 apply();
 return{
  sample(dt,{drawCalls=0}={}){
   if(!Number.isFinite(dt)||dt<=0)return null;
   elapsed+=Math.min(.25,dt);frames++;
   if(elapsed<3)return null;
   const fps=frames/elapsed,target=Math.max(12,Math.min(120,Number(targetFps)|| (mobile?29:55)));
   if(fps<target*.8||drawCalls>450){slowWindows++;fastWindows=0;}
   else if(fps>target*.98&&drawCalls<250){fastWindows++;slowWindows=0;}
   else{slowWindows=0;fastWindows=0;}
   if(slowWindows>=2&&index>0){index--;slowWindows=0;apply();}
   if(fastWindows>=3&&index<2){index++;fastWindows=0;apply();}
   frames=0;elapsed=0;
   return Object.freeze({fps:Number(fps.toFixed(1)),tier:tiers[index],pixelRatio:ratios[index],
    drawCalls:Number.isFinite(drawCalls)?drawCalls:null,performanceObservationOnly:true});
  },
  get tier(){return tiers[index];},
  dispose(){renderer.shadowMap.enabled=initialShadow;renderer.setPixelRatio(initialRatio);}
 };
}

// [메인: 저작권 보호 LOD] 기존 승인된 3D 에셋에 내장된 LOD만 거리로 전환한다. 메쉬 생성 금지.
export function createVibeAuthoredMeshLOD(THREE,root,{distances=[12,30]}={}){
 if(!root?.traverse)throw Error('Model required');
 // 동일한 이름의 나무가 여러 개 있어도 각 부모·메쉬 계열로 묶어 누락 렌더를 막는다.
 const families=new Map();
 root.traverse(mesh=>{
  if(!mesh?.isMesh||mesh.isSkinnedMesh||mesh.morphTargetInfluences?.length)return;
  const match=String(mesh.name||'').match(/^(.*?)[_.-]LOD([0-9]+)$/i);
  if(!match)return;
  const parent=mesh.parent||root;
  if(!families.has(parent))families.set(parent,new Map());
  const byName=families.get(parent),key=match[1];
  if(!byName.has(key))byName.set(key,[]);
  byName.get(key).push({mesh,level:Number(match[2]),visible:mesh.visible});
 });
 const groups=[...families.entries()].flatMap(([parent,value])=>[...value.values()].map(rows=>({parent,rows})))
  .filter(group=>new Set(group.rows.map(row=>row.level)).size>1)
  .map(group=>({...group,levels:[...new Set(group.rows.map(row=>row.level))].sort((a,b)=>a-b)}));
 const world=new THREE.Vector3(),steps=distances.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
 return{
  groups:groups.length,
  update(camera){
   if(!camera?.position||!groups.length)return 0;
   for(const group of groups){
    // [메쉬 LOD] 맵 전체 중심이 아니라 실제 해당 원본 메쉬 부모까지의 거리로 선택한다.
    const origin=group.parent?.getWorldPosition?group.parent:root;
    origin.getWorldPosition(world);
    const distance=world.distanceTo(camera.position);
    const step=steps.filter(value=>distance>=value).length;
    const level=group.levels[Math.min(step,group.levels.length-1)];
    // LOD 보조 메쉬는 제작 시 숨겨져 있어도 선택된 레벨에서 보여야 한다. reset은 원래 가시성 복원.
    for(const row of group.rows)row.mesh.visible=row.level===level;
   }
   return groups.length;
  },
  reset(){for(const group of groups)for(const row of group.rows)row.mesh.visible=row.visible}
 };
}

// [메인: GPU 배칭] 원본 GLB의 직계 자식인 동일 정적 메쉬만 인스턴싱한다.
// 스킨·모프·애니메이션·개별 상호작용 개체는 절대 배칭하지 않는다.
export function batchVibeExistingStaticMeshes(THREE,root,{minimum=4,animated=false}={}){
 if(!root?.children||animated)return{batched:0,drawCallsSaved:0,dispose(){}};
 const groups=new Map(),hidden=[],batches=[];
 for(const o of root.children){
  // [GPU 배칭: 원본 보존] 자식 장식·기존 인스턴스·맞춤 렌더 콜백을 합치면 실제 메시가 사라진다.
  if(!o?.isMesh||!o.visible||o.isInstancedMesh||o.isSkinnedMesh||o.morphTargetInfluences?.length||
   o.children?.length||o.userData?.noBatch||Object.prototype.hasOwnProperty.call(o,'onBeforeRender')||
   o.matrixAutoUpdate===false||o.material?.transparent===true||/[._-]LOD[0-9]+$/i.test(o.name||'')||Array.isArray(o.material))continue;
  // [GPU 배칭: 행렬] Three.js 인스턴스는 음수 행렬식(거울상), 0 스케일을 지원하지 않는다.
  const scale=o.scale;
  if(scale&&(![scale.x,scale.y,scale.z].every(Number.isFinite)||scale.x*scale.y*scale.z<=0))continue;
  if(!o.geometry||!o.material)continue;
  // UUID와 ID가 둘 다 없는 임시 객체를 같은 에셋으로 잘못 묶지 않는다.
  const geometryKey=o.geometry.uuid??o.geometry.id,materialKey=o.material.uuid??o.material.id;
  if(!(typeof geometryKey==='string'&&geometryKey||Number.isSafeInteger(geometryKey))||
   !(typeof materialKey==='string'&&materialKey||Number.isSafeInteger(materialKey)))continue;
  // [GPU 배칭] 개별 조명 그림자·레이어·렌더 순서가 다르면 절대 한 호출로 합치지 않는다.
  const key=[geometryKey,materialKey,
   Number(Boolean(o.castShadow)),Number(Boolean(o.receiveShadow)),o.renderOrder??0,
   o.layers?.mask??1,Number(o.frustumCulled!==false)].join(':');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(o);
 }
 for(const group of groups.values()){
  if(group.length<Math.max(2,minimum))continue;
  const source=group[0],instanced=new THREE.InstancedMesh(source.geometry,source.material,group.length);
  instanced.name=source.name+'-instances';instanced.castShadow=source.castShadow;
  instanced.receiveShadow=source.receiveShadow;
  instanced.renderOrder=source.renderOrder??0;
  instanced.frustumCulled=source.frustumCulled!==false;
  if(instanced.layers&&source.layers)instanced.layers.mask=source.layers.mask;
  for(let i=0;i<group.length;i++){
   const mesh=group[i];mesh.updateMatrix();instanced.setMatrixAt(i,mesh.matrix);
   hidden.push({mesh,visible:mesh.visible});mesh.visible=false;
  }
  instanced.instanceMatrix.needsUpdate=true;
  instanced.computeBoundingSphere?.();
  root.add(instanced);batches.push(instanced);
 }
 return{
  batched:hidden.length,drawCallsSaved:hidden.length-batches.length,
  dispose(){for(const entry of hidden)entry.mesh.visible=entry.visible;
   for(const batch of batches){root.remove(batch);batch.dispose?.();}}
 };
}

// [메인: 실제 화면 품질 판독] WebGL readPixels 관측치를 계산한다. 코드 마커나 추정 화면은 판독 불가.
// 이 값은 미술감독의 진단 데이터일 뿐, 독립된 골든 씬 심사/배포 PASS 증거가 아니다.
export function inspectVibeRenderedScene({pixels=null,width=0,height=0,source='',observed=false}={}){
 const verifiedInput=source==='webgl-readpixels'&&observed===true&&Number.isInteger(width)&&width>0
  &&Number.isInteger(height)&&height>0
  &&pixels&&(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)
  &&pixels.length>=9*4&&pixels.length%4===0;
 if(!verifiedInput)return Object.freeze({observed:false,status:'NO_RUNTIME_PIXELS',findings:['runtime-pixels-required'],
  exposureDelta:0,releaseAuthority:false,visualQualityPass:false});
 const values=[],saturations=[];
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
  values.push(.2126*r+.7152*g+.0722*b);
  saturations.push(Math.max(r,g,b)-Math.min(r,g,b));
 }
 const count=values.length,mean=values.reduce((a,b)=>a+b,0)/count;
 const sorted=values.slice().sort((a,b)=>a-b);
 const range=sorted[Math.floor((count-1)*.9)]-sorted[Math.floor((count-1)*.1)];
 const center=values[Math.floor(count/2)];
 const corners=[values[0],values[Math.floor(Math.sqrt(count))-1],values[count-Math.floor(Math.sqrt(count))],values[count-1]];
 const background=corners.reduce((a,b)=>a+b,0)/4;
 const focusContrast=Math.abs(center-background);
 const clippedShadows=values.filter(x=>x<.05).length/count;
 const clippedHighlights=values.filter(x=>x>.95).length/count;
 const findings=[];
 if(mean<.23)findings.push('underexposed-frame');
 if(mean>.77)findings.push('overexposed-frame');
 if(range<.18)findings.push('weak-value-separation');
 if(focusContrast<.085)findings.push('weak-center-background-contrast');
 if(clippedShadows>.5)findings.push('clipped-shadow-area');
 if(clippedHighlights>.45)findings.push('clipped-highlight-area');
 const exposureDelta=mean<.23?.05:mean>.77?-.05:0;
 return Object.freeze({
  observed:true,status:'PIXEL_DIAGNOSTIC_ONLY',samples:count,
  luminance:Number(mean.toFixed(3)),valueRange:Number(range.toFixed(3)),
  centerContrast:Number(focusContrast.toFixed(3)),
  saturation:Number((saturations.reduce((a,b)=>a+b,0)/count).toFixed(3)),
  clippedShadows:Number(clippedShadows.toFixed(3)),
  clippedHighlights:Number(clippedHighlights.toFixed(3)),
  findings:Object.freeze(findings),exposureDelta,releaseAuthority:false,visualQualityPass:false
 });
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
