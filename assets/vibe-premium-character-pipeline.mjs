// Authoring bridge for original premium stylized character assets.
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
export const vibePremiumAssetSpec=Object.freeze({
 geometry:{recommendedTriangles:[25000,85000],lods:3,uvSets:2},
 face:{blendshapeChannels:VIBE_FACE_CHANNELS.length,eyeControls:2,jawJoint:true},
 hands:{fingersPerHand:5,jointsPerFinger:3},
 textures:{baseColor:4096,normal:4096,roughness:2048,metalness:2048,ao:2048,format:'KTX2 or WebP'},
 animation:{authoringFps:30,required:['idle','walk','run','attack','react','talk'],rootMotion:true},
 quality:{target:'stylized high-end game',mobileLodRequired:true,textureStreamingRecommended:true}
});
