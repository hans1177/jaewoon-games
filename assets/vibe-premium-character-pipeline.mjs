// 파일명: assets/vibe-premium-character-pipeline.mjs
// [메인] 승인된 실제 캐릭터의 리그·변형·표정 제어. 원본 메쉬 자동대체 금지.
// Supports imported GLTF skinned meshes, facial blendshapes, finger bones, keyframe tracks and PBR textures.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const VIBE_FACE_CHANNELS=Object.freeze(['browInnerUp','browDownLeft','browDownRight','eyeBlinkLeft','eyeBlinkRight','eyeWideLeft','eyeWideRight','cheekPuff','jawOpen','mouthSmileLeft','mouthSmileRight','mouthFrownLeft','mouthFrownRight','mouthPucker','mouthFunnel','mouthClose','noseSneerLeft','noseSneerRight']);
const aliases={eyeBlinkLeft:['eyeBlinkLeft','eyeBlink_L','blinkLeft'],eyeBlinkRight:['eyeBlinkRight','eyeBlink_R','blinkRight'],jawOpen:['jawOpen','mouthOpen'],mouthSmileLeft:['mouthSmileLeft','smileLeft','smile'],mouthSmileRight:['mouthSmileRight','smileRight','smile']};
export function createVibeFacialRig(model,{mapping={}}={}){
 if(!model?.traverse)throw Error('A Three.js model is required');
 const targets=new Map();
 model.traverse(mesh=>{
  if(!mesh.morphTargetDictionary||!mesh.morphTargetInfluences)return;
  for(const channel of VIBE_FACE_CHANNELS){
   const candidates=[mapping[channel],...(aliases[channel]||[channel])].filter(Boolean);
   for(const candidate of candidates){
    const index=mesh.morphTargetDictionary[candidate];
    if(Number.isInteger(index)){if(!targets.has(channel))targets.set(channel,[]);targets.get(channel).push({mesh,index});break}
   }
  }
 });
 return {
  channels:[...targets.keys()],
  set(channel,value){if(!VIBE_FACE_CHANNELS.includes(channel))throw Error('Unknown facial channel: '+channel);for(const {mesh,index} of targets.get(channel)||[])mesh.morphTargetInfluences[index]=clamp(Number(value)||0);return targets.has(channel)},
  pose(weights={}){for(const [name,value] of Object.entries(weights))this.set(name,value)},
  reset(){for(const channel of targets.keys())this.set(channel,0)}
 };
}
const fingers=['Thumb','Index','Middle','Ring','Pinky'];
export function createVibeHandRig(model,{leftPrefix='LeftHand',rightPrefix='RightHand'}={}){
 const bones=new Map();
 model.traverse(object=>{if(object.isBone)bones.set(object.name.toLowerCase(),object)});
 const hands={};
 for(const [side,prefix] of [['left',leftPrefix],['right',rightPrefix]]){
  hands[side]={};
  for(const finger of fingers){
   const chain=[];
   for(let i=1;i<=3;i++){
    const candidates=[prefix+finger+i,side+'_'+finger.toLowerCase()+'_'+String(i).padStart(2,'0'),side+finger+i];
    const bone=candidates.map(name=>bones.get(name.toLowerCase())).find(Boolean);
    if(bone)chain.push({bone,rest:bone.rotation.x});
   }
   hands[side][finger.toLowerCase()]=chain;
  }
 }
 return {
  hands,
  curl(side,finger,amount){const chain=hands[side]?.[finger];if(!chain)throw Error('Unknown finger');for(const {bone,rest} of chain)bone.rotation.x=rest+(side==='left'?-1:1)*clamp(amount)*1.15;return chain.length},
  gesture(side,gesture){const presets={open:[0,0,0,0,0],fist:[.85,1,1,1,1],point:[.7,0,1,1,1],grip:[.6,.8,.8,.8,.8]};const values=presets[gesture];if(!values)throw Error('Unknown hand gesture');fingers.forEach((finger,i)=>this.curl(side,finger.toLowerCase(),values[i]))},
  reset(){for(const hand of Object.values(hands))for(const chain of Object.values(hand))for(const {bone,rest} of chain)bone.rotation.x=rest}
 };
}
export function createVibeKeyframePlayer({targets={},tracks={},fps=30}={}){
 if(!Number.isFinite(fps)||fps<=0)throw Error('Invalid fps');
 let active=null,time=0,playing=false;
 const interpolate=(keys,frame)=>{
  if(frame<=keys[0].frame)return keys[0].value;
  for(let i=1;i<keys.length;i++)if(frame<=keys[i].frame){
   const a=keys[i-1],b=keys[i],t=(frame-a.frame)/(b.frame-a.frame),e=t*t*(3-2*t);
   return a.value+(b.value-a.value)*e;
  }
  return keys.at(-1).value;
 };
 return {
  play(name,{loop=true}={}){if(!tracks[name])throw Error('Unknown animation');active={name,loop};time=0;playing=true},
  update(dt){if(!playing||!Number.isFinite(dt)||dt<=0)return;time+=Math.min(dt,.1);const track=tracks[active.name],end=Math.max(0,...Object.values(track).flatMap(keys=>keys.map(k=>k.frame)));const frame=active.loop&&end>0?(time*fps)%end:Math.min(time*fps,end);
   for(const [path,keys] of Object.entries(track)){if(!Array.isArray(keys)||!keys.length)continue;const setter=targets[path];if(typeof setter==='function')setter(interpolate(keys,frame))}
   if(!active.loop&&frame>=end)playing=false;
  },
  stop(){playing=false},get active(){return active?.name??null}
 };
}
export async function applyVibePBRTextures(THREE,model,{baseColor,normal,roughness,metalness,ao}, {textureLoader=new THREE.TextureLoader(),maxAnisotropy=8}={}){
 const textures={};
 for(const [channel,url] of Object.entries({map:baseColor,normalMap:normal,roughnessMap:roughness,metalnessMap:metalness,aoMap:ao})){
  if(!url)continue;
  const texture=await textureLoader.loadAsync(url);
  if(channel==='map')texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(maxAnisotropy,8);textures[channel]=texture;
 }
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!material?.isMeshStandardMaterial)continue;
   Object.assign(material,textures);material.needsUpdate=true;
  }
 });
 return {textures,dispose(){for(const texture of Object.values(textures))texture.dispose()}};
}
// [메인: 리그 검사] 실측 스킨 가중치와 본 구성을 진단한다. 결손을 가짜 뼈로 대체하지 않는다.
export function inspectVibeCharacterRig(model,{sampleLimit=4096}={}){
 if(!model?.traverse)throw Error('A Three.js model is required');
 // [리그 검사] 메쉬를 먼저 수집해 검사 예산을 공정하게 배분한다. 원본 스킨 데이터는 수정하지 않는다.
 const bones=[],skinned=[],issues=[];let sampled=0,unweighted=0,unnormalized=0,invalidWeights=0,invalidIndices=0;
 model.traverse(o=>{if(o?.isBone)bones.push(o);if(o?.isSkinnedMesh)skinned.push(o)});
 const budget=Number.isFinite(sampleLimit)?Math.max(1,Math.min(65536,Math.floor(sampleLimit))):4096;
 if(skinned.length>budget)issues.push('RIG_AUDIT_COVERAGE_INCOMPLETE');
 for(const [meshIndex,mesh] of skinned.entries()){
  const name=String(mesh.name||'unnamed');
  const weights=mesh.geometry?.attributes?.skinWeight;
  if(!weights||!Number.isInteger(weights.count)||weights.count<1){
   issues.push('MISSING_SKIN_WEIGHTS:'+name);continue;
  }
  const components=weights.itemSize||4;
  if(!Number.isInteger(components)||components<1||components>4){
   issues.push('INVALID_SKIN_INFLUENCE_COUNT:'+name);continue;
  }
  const indices=mesh.geometry?.attributes?.skinIndex;
  const boneCount=Array.isArray(mesh.skeleton?.bones)?mesh.skeleton.bones.length:null;
  if(boneCount===0)issues.push('EMPTY_BOUND_SKELETON:'+name);
  if(boneCount!==null&&!indices)issues.push('MISSING_SKIN_INDICES:'+name);
  if(indices&&(indices.count!==weights.count||indices.itemSize<components))
   issues.push('SKIN_INDEX_LAYOUT_MISMATCH:'+name);
  // 메쉬가 많을 때도 뒤쪽 메쉬를 반드시 검사한다. 예산 미달은 통과시키지 않는다.
  const quota=Math.floor(budget/skinned.length)+(meshIndex<budget%skinned.length?1:0);
  const count=Math.min(weights.count,quota);
  for(let k=0;k<count;k++){
   const i=Math.floor((k+.5)*weights.count/count);
   let sum=0;
   for(let j=0;j<components;j++){
    const value=Number(weights.getComponent?weights.getComponent(i,j):weights.array?.[i*components+j]);
    if(!Number.isFinite(value)||value<0||value>1){invalidWeights++;continue;}
    sum+=value;
    if(value>0&&indices&&indices.count===weights.count&&indices.itemSize>=components){
     const joint=Number(indices.getComponent?indices.getComponent(i,j):indices.array?.[i*indices.itemSize+j]);
     if(!Number.isInteger(joint)||joint<0||(boneCount!==null&&joint>=boneCount))invalidIndices++;
    }
   }
   sampled++;if(sum<.0001)unweighted++;else if(Math.abs(sum-1)>.035)unnormalized++;
  }
 }
 if(!bones.length)issues.push('NO_BONES');
 if(!skinned.length)issues.push('NO_SKINNED_MESH');
 if(unweighted)issues.push('UNWEIGHTED_VERTICES');
 if(unnormalized)issues.push('NON_NORMALIZED_SKIN_WEIGHTS');
 if(invalidWeights)issues.push('INVALID_SKIN_WEIGHTS');
 if(invalidIndices)issues.push('INVALID_SKIN_INDICES');
 return Object.freeze({bones:bones.length,skinnedMeshes:skinned.length,weightsSampled:sampled,
  unweighted,unnormalized,invalidWeights,invalidIndices,issues:Object.freeze(issues),
  productionEligible:issues.length===0,rigRepairPerformed:false,sourcePreserved:true});
}

// [유틸: 본 식별] 주요 로블록스·믹사모·블렌더 이름을 기존 실제 본에 대응한다.
function canonicalVibeRigBone(name){
 let n=String(name||'').toLowerCase().replace(/^mixamorig:?/,'').replace(/[^a-z0-9]/g,'');
 let side='';
 if(n.startsWith('left')){side='l';n=n.slice(4)}
 else if(n.startsWith('right')){side='r';n=n.slice(5)}
 else if(n.endsWith('left')){side='l';n=n.slice(0,-4)}
 else if(n.endsWith('right')){side='r';n=n.slice(0,-5)}
 else if(n.length>2&&/[lr]$/.test(n)){side=n.slice(-1);n=n.slice(0,-1)}
 const synonyms={arm:'upperarm',forearm:'lowerarm',hand:'hand',upleg:'upperleg',thigh:'upperleg',leg:'lowerleg',
  calf:'lowerleg',foot:'foot',toe:'toe',wrist:'hand',hips:'hips',pelvis:'hips'};
 return side+(synonyms[n]||n);
}

// [메인: 리타게팅] 서로 다른 승인 모델의 실제 뼈 회전만 복사한다. 위치/게임 Root는 불변.
export function createVibeRigRetargeter(sourceModel,targetModel,{mapping={},weight=1}={}){
 if(!sourceModel?.traverse||!targetModel?.traverse)throw Error('Source and target models required');
 const source=new Map(),target=new Map();
 sourceModel.traverse(o=>{if(o?.isBone&&o.quaternion?.clone)source.set(canonicalVibeRigBone(o.name),o)});
 targetModel.traverse(o=>{if(o?.isBone&&o.quaternion?.clone)target.set(canonicalVibeRigBone(o.name),o)});
 const pairs=[],missing=[];
 for(const [key,dest] of target){
  if(/^(?:hips|root|lhips|rhips)$/.test(key))continue;
  const sourceKey=canonicalVibeRigBone(mapping[dest.name]||dest.name);
  const donor=source.get(sourceKey);
  if(!donor){missing.push(dest.name);continue;}
  pairs.push({donor,dest,sourceRest:donor.quaternion.clone(),targetRest:dest.quaternion.clone()});
 }
 const blend=clamp(Number(weight)||0);
 return {
  matched:pairs.length,missing:Object.freeze(missing),
  update(){
   for(const pair of pairs){
    const delta=pair.sourceRest.clone().invert().multiply(pair.donor.quaternion);
    const end=pair.targetRest.clone().multiply(delta);
    pair.dest.quaternion.copy(pair.targetRest).slerp(end,blend);
   }
   return pairs.length;
  },
  reset(){for(const pair of pairs)pair.dest.quaternion.copy(pair.targetRest)}
 };
}

// [메인: 관절 제약] 현재 본의 휴식 포즈를 기준으로 안전 회전 범위를 적용한다.
export function createVibeJointConstraints(model,{limits={}}={}){
 if(!model?.traverse)throw Error('A Three.js model is required');
 const joints=new Map();
 model.traverse(o=>{
  if(!o?.isBone||!o.rotation)return;
  const key=canonicalVibeRigBone(o.name),bound=limits[o.name]||limits[key];
  if(!bound)return;
  joints.set(key,{bone:o,rest:{x:o.rotation.x,y:o.rotation.y,z:o.rotation.z},
   max:{x:Math.max(0,Number(bound.x)||0),y:Math.max(0,Number(bound.y)||0),z:Math.max(0,Number(bound.z)||0)}});
 });
 return{
  supported:[...joints.keys()],
  apply(pose={}){
   let adjusted=0;
   for(const [name,angle] of Object.entries(pose)){
    const joint=joints.get(canonicalVibeRigBone(name));if(!joint)continue;
    for(const axis of ['x','y','z']){
     if(!Number.isFinite(angle?.[axis]))continue;
     joint.bone.rotation[axis]=joint.rest[axis]+Math.max(-joint.max[axis],Math.min(joint.max[axis],angle[axis]));
    }
    adjusted++;
   }
   return adjusted;
  },
  reset(){for(const j of joints.values())for(const axis of ['x','y','z'])j.bone.rotation[axis]=j.rest[axis]}
 };
}

// [메인: 옷·근육] 원본의 실제 보조 모프만 부드럽게 구동하며 새 메쉬나 가짜 모프를 생성하지 않는다.
export function createVibeSecondaryDeformation(model,{channels=['clothSwing','hairSwing','muscleFlex','capeSwing'],response=10}={}){
 if(!model?.traverse)throw Error('A Three.js model is required');
 const targets=new Map();
 model.traverse(mesh=>{
  if(!mesh?.morphTargetDictionary||!mesh?.morphTargetInfluences)return;
  for(const name of channels){
   const index=mesh.morphTargetDictionary[name];if(!Number.isInteger(index))continue;
   if(!targets.has(name))targets.set(name,[]);
   targets.get(name).push({mesh,index,rest:Number(mesh.morphTargetInfluences[index])||0});
  }
 });
 return{
  available:[...targets.keys()],
  update(dt,signals={}){
   if(!Number.isFinite(dt)||dt<=0)return 0;
   const alpha=1-Math.exp(-Math.min(.1,dt)*Math.max(.1,response));
   for(const [name,entries] of targets){
    const goal=clamp(Number(signals[name])||0);
    for(const {mesh,index,rest} of entries){
     const current=Number(mesh.morphTargetInfluences[index])||0;
     mesh.morphTargetInfluences[index]=current+(Math.max(0,Math.min(1,rest+goal))-current)*alpha;
    }
   }
   return targets.size;
  },
  reset(){for(const entries of targets.values())for(const {mesh,index,rest} of entries)mesh.morphTargetInfluences[index]=rest}
 };
}

export const vibePremiumAssetSpec=Object.freeze({
 geometry:{recommendedTriangles:[25000,85000],lods:3,uvSets:2},
 face:{blendshapeChannels:VIBE_FACE_CHANNELS.length,eyeControls:2,jawJoint:true},
 hands:{fingersPerHand:5,jointsPerFinger:3},
 textures:{baseColor:4096,normal:4096,roughness:2048,metalness:2048,ao:2048,format:'KTX2 or WebP'},
 animation:{authoringFps:30,required:['idle','walk','run','attack','react','talk'],rootMotion:true},
 quality:{target:'stylized high-end game',mobileLodRequired:true,textureStreamingRecommended:true}
});
