// Original stylized hero with articulated bones, morph-target face, hand-authored poses and cinematic lighting.
// Uses injected THREE; no third-party character assets or external model license.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export function createVibeHero(THREE,{palette='forest'}={}){
 const colors=palette==='volcano'?{suit:0x8d3026,trim:0xf4b55e}: {suit:0x266c66,trim:0xd2b66c};
 const root=new THREE.Group();root.name='VibeOriginalHero';
 const body=new THREE.Group();root.add(body);
 const mat=(color,metalness=0,roughness=.72)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const suit=mat(colors.suit),trim=mat(colors.trim,.42,.35),skin=mat(0xf4c49b),dark=mat(0x20313d),white=mat(0xfff8eb);
 const sphere=new THREE.SphereGeometry(1,24,16),box=new THREE.BoxGeometry(1,1,1);
 function part(parent,name,geo,material,pos,scale){const mesh=new THREE.Mesh(geo,material);mesh.name=name;mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 part(body,'torso',sphere,suit,[0,1.28,0],[.38,.54,.24]);
 part(body,'belt',box,dark,[0,.91,0],[.68,.13,.42]);
 part(body,'neck',sphere,skin,[0,1.85,0],[.12,.17,.12]);
 const head=new THREE.Group();head.position.set(0,1.99,0);body.add(head);
 part(head,'head',sphere,skin,[0,.18,0],[.32,.38,.3]);
 part(head,'hair',sphere,dark,[0,.48,-.045],[.33,.18,.31]);
 for(const side of [-1,1]){
  part(head,'ear',sphere,skin,[side*.32,.16,0],[.08,.13,.1]);
  part(head,'eye-white',sphere,white,[side*.125,.23,.274],[.088,.08,.035]);
  part(head,'pupil',sphere,dark,[side*.125,.23,.304],[.035,.05,.022]);
 }
 // Face controls are actual named blendshapes, not decorative labels.
 const faceGeo=new THREE.SphereGeometry(1,32,20),position=faceGeo.attributes.position;
 const smile=new Float32Array(position.array.length),frown=new Float32Array(position.array.length),talk=new Float32Array(position.array.length);
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i),j=i*3;
  smile[j]=x;smile[j+1]=y+(y<-.1&&z>.2?Math.abs(x)*.22:0);smile[j+2]=z;
  frown[j]=x;frown[j+1]=y-(y<-.1&&z>.2?Math.abs(x)*.17:0);frown[j+2]=z;
  talk[j]=x;talk[j+1]=y*(y<0?1.14:1);talk[j+2]=z;
 }
 faceGeo.morphAttributes.position=[new THREE.Float32BufferAttribute(smile,3),new THREE.Float32BufferAttribute(frown,3),new THREE.Float32BufferAttribute(talk,3)];
 const face=part(head,'face-rig',faceGeo,skin,[0,.18,0],[.321,.381,.301]);
 face.morphTargetDictionary={smile:0,frown:1,talk:2};face.morphTargetInfluences=[0,0,0];
 const mouth=part(head,'mouth',sphere,dark,[0,.065,.298],[.07,.025,.016]);
 const joints={head,body,arms:[],legs:[],face,mouth};
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.37,1.64,0);body.add(arm);
  part(arm,'sleeve',sphere,suit,[side*.075,-.28,0],[.16,.35,.16]);
  part(arm,'hand',sphere,skin,[side*.09,-.62,0],[.12,.14,.12]);
  joints.arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.19,.85,0);body.add(leg);
  part(leg,'pants',sphere,dark,[0,-.31,0],[.17,.38,.18]);
  part(leg,'boot',sphere,trim,[0,-.69,.09],[.18,.15,.27]);
  joints.legs.push(leg);
 }
 return {root,joints,face,dispose(){root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}})}};
}
export function createVibeHandAnimation(hero){
 let elapsed=0,action='idle',transition=0,from={};
 const joints=hero.joints;
 function capture(){return {arms:joints.arms.map(a=>a.rotation.x),legs:joints.legs.map(a=>a.rotation.x),head:joints.head.rotation.z}}
 return {
  play(name){if(!['idle','walk','run','attack','wave','react','look'].includes(name))throw Error('Unknown action');from=capture();action=name;transition=0;elapsed=0},
  update(dt,{emotion='neutral',talking=false}={}){
   dt=clamp(dt,0,.1);elapsed+=dt;transition=Math.min(1,transition+dt/.24);
   const t=elapsed,cycle=Math.sin(t*(action==='run'?12:8)),blend=ease(transition);
   const walk=action==='walk'?.53:action==='run'?.85:0;
   const attack=action==='attack'?Math.sin(Math.PI*clamp(t/.48)):0;
   const wave=action==='wave'?Math.sin(t*7)*.25-.85:0;
   const react=action==='react'?Math.sin(Math.PI*clamp(t/.45))*.32:0;
   const targetArms=[walk*cycle*.7-attack*1.3+wave, -walk*cycle*.7+attack*.4];
   const targetLegs=[walk*cycle,-walk*cycle];
   joints.arms.forEach((a,i)=>a.rotation.x=mix(from.arms[i],targetArms[i],blend));
   joints.legs.forEach((a,i)=>a.rotation.x=mix(from.legs[i],targetLegs[i],blend));
   joints.head.rotation.z=mix(from.head,react+Math.sin(t*1.3)*.025,blend);
   joints.body.position.y=Math.sin(t*(walk?12:2.2))*(walk?.035:.014);
   const f=joints.face.morphTargetInfluences;
   f[0]=mix(f[0],emotion==='joy'?0.65:0,clamp(dt*8));
   f[1]=mix(f[1],emotion==='fear'||emotion==='pain'?.55:0,clamp(dt*8));
   f[2]=mix(f[2],talking?(.3+.25*Math.sin(t*14)):0,clamp(dt*12));
   joints.mouth.scale.y=.025*(1+f[2]*3);
  },
  get action(){return action}
 };
}
export function setupVibeCinematicLighting(THREE,scene,{quality='high'}={}){
 const lights=[],ambient=new THREE.HemisphereLight(0xc4e8ff,0x544331,1.3);scene.add(ambient);lights.push(ambient);
 for(const [color,intensity,x,y,z] of [[0xffe3b1,2.6,4,7,5],[0x7ebdff,1.6,-4,3,-5],[0xffa878,.7,1,1,-4]]){
  const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);light.castShadow=quality==='high'&&lights.length===1;
  if(light.castShadow){light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0003}scene.add(light);lights.push(light);
 }
 return {lights,dispose(){for(const l of lights)scene.remove(l)}};
}
export const vibeSceneShots=Object.freeze({
 introduction:[{at:0,position:{x:3,y:2.3,z:6},lookAt:{x:0,y:1.2,z:0},fov:48},{at:2,position:{x:2,y:2.1,z:4.5},lookAt:{x:0,y:1.5,z:0},fov:38}],
 confrontation:[{at:0,position:{x:-3,y:1.8,z:4},lookAt:{x:0,y:1.4,z:0},fov:45},{at:.6,position:{x:-1.5,y:1.7,z:2.8},lookAt:{x:0,y:1.65,z:0},fov:36,event:'impact'}],
 reaction:[{at:0,position:{x:1.4,y:2.3,z:3.6},lookAt:{x:0,y:2,z:0},fov:42},{at:1.1,position:{x:.65,y:2.25,z:2.4},lookAt:{x:0,y:2.15,z:0},fov:32}]
});
