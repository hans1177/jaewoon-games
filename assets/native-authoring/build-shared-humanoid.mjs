// 파일명: assets/native-authoring/build-shared-humanoid.mjs
// 임포트: 기존 GRAPHICS_PRODUCTION 내부의 엔진 독립적인 3D 마스터 제작 레시피.
// 메인: 원본 리그/메시/모션 제작만 담당. 게임 이동·판정·저장 로직은 변경하지 않는다.
import fs from 'node:fs';
import path from 'node:path';

function buildSharedHumanoid(kind='traveler'){
 const guardian=kind==='guardian', deg=Math.PI/180;
 const joints=[
 ['Root',-1,[0,0,0]],['Hips',0,[0,1.03,0]],['Spine',1,[0,.22,0]],['Chest',2,[0,.31,0]],['Neck',3,[0,.27,0]],['Head',4,[0,.16,0]],
 ['Shoulder_L',3,[-.34,.16,0]],['Elbow_L',6,[-.28,-.27,0]],['Hand_L',7,[-.24,-.25,0]],['Shoulder_R',3,[.34,.16,0]],['Elbow_R',9,[.28,-.27,0]],['Hand_R',10,[.24,-.25,0]],
 ['UpperLeg_L',1,[-.17,-.11,0]],['Knee_L',12,[0,-.43,.02]],['Foot_L',13,[0,-.41,.08]],['UpperLeg_R',1,[.17,-.11,0]],['Knee_R',15,[0,-.43,.02]],['Foot_R',16,[0,-.41,.08]],['WeaponGrip',11,[0,-.06,.10]]
 ];
 const world=[];for(const b of joints)world.push(b[1]<0?[...b[2]]:b[2].map((v,i)=>v+world[b[1]][i]));
 const palette=guardian?[[.17,.22,.28,1],[.34,.41,.49,1],[.18,.14,.12,1],[.71,.46,.31,1],[.12,.14,.18,1],[.79,.58,.27,1],[.15,.19,.24,1],[.03,.04,.05,1],[.66,.73,.78,1]]:
 [[.18,.32,.29,1],[.34,.46,.42,1],[.29,.18,.11,1],[.81,.57,.41,1],[.12,.15,.17,1],[.78,.56,.28,1],[.12,.10,.08,1],[.03,.04,.05,1],[.60,.68,.67,1]];
 const groups=palette.map(()=>({p:[],n:[],uv:[],bone:[],weight:[],ind:[]}));
 const sum=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),scale=(a,s)=>a.map(x=>x*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
 function loft(material,bone,pts,rx,rz,sides=12){
   const g=groups[material],start=g.p.length/3;
   for(let k=0;k<pts.length;k++){
     const tan=unit(sub(pts[Math.min(k+1,pts.length-1)],pts[Math.max(0,k-1)]));
     const ref=Math.abs(tan[2])>.9?[0,1,0]:[0,0,1],u=unit(cross(ref,tan)),v=unit(cross(tan,u));
     for(let i=0;i<=sides;i++){
       const a=i/sides*2*Math.PI,c=Math.cos(a),s=Math.sin(a),normal=unit(sum(scale(u,c/Math.max(.001,rx[k])),scale(v,s/Math.max(.001,rz[k]))));
       g.p.push(...sum(pts[k],sum(scale(u,c*rx[k]),scale(v,s*rz[k]))));
       g.n.push(...normal);g.uv.push(i/sides,k/(pts.length-1));g.bone.push(bone,0,0,0);g.weight.push(1,0,0,0);
     }
   }
   for(let k=0;k<pts.length-1;k++)for(let i=0;i<sides;i++){const a=start+k*(sides+1)+i,b=a+sides+1;g.ind.push(a,b,a+1,a+1,b,b+1);}
 }
 const vertical=(x,z,ys)=>ys.map(y=>[x,y,z]);
 function ell(mat,bone,center,r,sides=16,rings=10){
   const pts=[],rx=[],rz=[];
   for(let i=0;i<=rings;i++){const a=i*Math.PI/rings;pts.push([center[0],center[1]+Math.cos(a)*r[1],center[2]]);rx.push(Math.max(.0005,r[0]*Math.sin(a)));rz.push(Math.max(.0005,r[2]*Math.sin(a)));}
   loft(mat,bone,pts,rx,rz,sides);
 }
 // 메인: 머리/몸/장갑/의상/장식 모두 뼈 스킨으로 구성한다.
 loft(0,2,vertical(0,0,[1.01,1.13,1.29,1.42,1.58]),[.23,.27,.25,.27,.31],[.15,.15,.16,.18,.18],20);
 loft(1,3,vertical(0,0,[1.51,1.58,1.68,1.77,1.80]),[.30,.34,.35,.25,.14],[.18,.195,.195,.15,.10],20);
 loft(2,1,vertical(0,.015,[.93,1.00,1.075,1.12]),[.235,.26,.255,.24],[.16,.18,.175,.16],18);
 loft(5,1,vertical(0,.02,[1.015,1.04,1.085]),[.258,.265,.255],[.183,.188,.178],20);
 ell(3,5,[0,2.045,.025],[.175,.235,.168],22,12);
 ell(3,4,[0,1.869,0],[.098,.115,.096],14,8);
 ell(6,5,[0,2.165,-.008],[.184,.143,.165],22,10);
 for(const sign of [-1,1]){
   ell(6,5,[sign*.096,2.205,.111],[.086,.08,.09],12,8);
   ell(3,5,[sign*.176,2.033,.02],[.034,.068,.035],12,8);
   ell(7,5,[sign*.071,2.073,.175],[.024,.016,.008],12,6);
   ell(8,5,[sign*.07,2.072,.183],[.009,.009,.004],10,6);
   loft(6,5,[[sign*.064,2.105,.17],[sign*.065,2.12,.177],[sign*.073,2.126,.179]],[.044,.044,.018],[.013,.017,.01],10);
 }
 ell(3,5,[0,1.981,.185],[.033,.042,.05],12,7);
 loft(2,5,[[0,1.918,.135],[0,1.922,.172],[0,1.92,.179]],[.06,.069,.044],[.01,.012,.007],12);
 for(const sign of [-1,1]){
   const shoulder=sign<0?6:9,elbow=sign<0?7:10,hand=sign<0?8:11;
   loft(0,shoulder,[[sign*.31,1.79,0],[sign*.34,1.72,0],[sign*.46,1.62,0],[sign*.62,1.45,0]],[.105,.117,.107,.07],[.11,.125,.104,.072],12);
   loft(2,elbow,[[sign*.61,1.48,0],[sign*.62,1.45,0],[sign*.76,1.32,0],[sign*.86,1.20,0]],[.076,.083,.073,.05],[.082,.09,.071,.05],12);
   ell(3,hand,[sign*.91,1.12,.02],[.074,.119,.06],12,8);
   loft(4,hand,[[sign*.82,1.21,0],[sign*.87,1.14,.01],[sign*.90,1.08,.017]],[.083,.078,.048],[.081,.077,.05],12);
   if(guardian){
     ell(1,shoulder,[sign*.37,1.76,-.01],[.186,.134,.17],16,9);
     loft(8,shoulder,[[sign*.47,1.77,.005],[sign*.51,1.68,.01],[sign*.49,1.60,.015]],[.125,.116,.095],[.15,.12,.08],14);
   }else{
     loft(5,shoulder,[[sign*.34,1.73,.02],[sign*.43,1.64,.033],[sign*.48,1.56,.044]],[.122,.13,.096],[.13,.13,.092],12);
   }
   const thigh=sign<0?12:15,shin=sign<0?13:16,foot=sign<0?14:17,x=sign*.165;
   loft(0,thigh,[[x,.99,0],[x,.91,0],[x,.73,.008],[x,.54,.02]],[.147,.166,.151,.105],[.17,.168,.145,.105],16);
   loft(4,shin,[[x,.57,.017],[x,.48,.028],[x,.27,.04],[x,.10,.068]],[.105,.115,.095,.075],[.113,.122,.098,.084],14);
   loft(2,shin,[[x,.48,.034],[x,.39,.042],[x,.32,.048]],[.119,.125,.115],[.126,.133,.12],14);
   ell(4,foot,[x,.078,.145],[.117,.09,.233],16,10);
   loft(5,foot,[[x,.062,.24],[x,.085,.304],[x,.10,.331]],[.108,.088,.044],[.09,.075,.044],12);
 }
 if(guardian){
   loft(8,3,vertical(0,.10,[1.47,1.53,1.66,1.75]),[.26,.32,.31,.20],[.068,.082,.09,.05],22);
   loft(5,3,vertical(0,.175,[1.57,1.61,1.66]),[.235,.28,.235],[.027,.032,.028],20);
   loft(8,5,vertical(0,-.005,[2.15,2.22,2.30,2.32]),[.178,.181,.095,.018],[.168,.174,.105,.018],18);
 }else{
   loft(0,1,vertical(0,-.13,[.83,.94,1.03,1.12]),[.32,.33,.29,.24],[.12,.14,.13,.12],20);
   loft(5,3,vertical(0,.11,[1.57,1.64,1.73]),[.243,.255,.205],[.06,.078,.057],18);
   ell(2,3,[.28,1.26,-.20],[.18,.245,.13],15,9);
   loft(0,3,vertical(0,-.21,[.72,.93,1.12,1.36,1.64]),[.40,.39,.32,.28,.26],[.045,.052,.052,.050,.035],24);
   loft(2,3,[[.27,1.55,.19],[.17,1.36,.16],[.08,1.08,.12]],[.051,.047,.043],[.028,.03,.027],10);
 }
 const gltf={asset:{version:'2.0',generator:'jaewoon-shared-3d-authoring'},scene:0,scenes:[],nodes:[],meshes:[],materials:[],skins:[],animations:[],accessors:[],bufferViews:[],buffers:[]};
 let bufferSize=0;const chunks=[];
 function view(array,target){const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),align=(4-bufferSize%4)%4;if(align){chunks.push(new Uint8Array(align));bufferSize+=align;}const offset=bufferSize;chunks.push(new Uint8Array(bytes));bufferSize+=bytes.length;return gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...(target?{target}:{})})-1;}
 function acc(array,type,componentType,target,extra={}){const count=array.length/({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[type]);return gltf.accessors.push({bufferView:view(array,target),componentType,count,type,...extra})-1;}
 const primitives=[];
 for(let m=0;m<groups.length;m++){
  const g=groups[m];if(!g.p.length)continue;
  const xyz=[g.p.filter((_,i)=>i%3===0),g.p.filter((_,i)=>i%3===1),g.p.filter((_,i)=>i%3===2)];
  const min=xyz.map(a=>Math.min(...a)),max=xyz.map(a=>Math.max(...a));
  primitives.push({attributes:{
   POSITION:acc(new Float32Array(g.p),'VEC3',5126,34962,{min,max}),
   NORMAL:acc(new Float32Array(g.n),'VEC3',5126,34962),
   TEXCOORD_0:acc(new Float32Array(g.uv),'VEC2',5126,34962),
   JOINTS_0:acc(new Uint16Array(g.bone),'VEC4',5123,34962),
   WEIGHTS_0:acc(new Float32Array(g.weight),'VEC4',5126,34962)
  },indices:acc(new Uint16Array(g.ind),'SCALAR',5123,34963),material:m,mode:4});
 }
 gltf.materials=palette.map((v,i)=>({name:['Cloth','Armor','Leather','Skin','Boot','Trim','Hair','Eye','Metal'][i],doubleSided:true,pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:[1,8].includes(i)?.48:0,roughnessFactor:[3,7].includes(i)?.72:.53}}));
 gltf.meshes=[{name:guardian?'GuardianBody':'TravelerBody',primitives}];
 gltf.nodes=joints.map(j=>({name:j[0],translation:j[2]}));
 joints.forEach((j,i)=>{if(j[1]>=0)(gltf.nodes[j[1]].children||(gltf.nodes[j[1]].children=[])).push(i)});
 const meshNode=gltf.nodes.push({name:'SkinnedActor',mesh:0,skin:0})-1;
 gltf.scenes=[{nodes:[0,meshNode]}];
 const ibm=[];for(const [x,y,z] of world)ibm.push(1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1);
 gltf.skins=[{name:'ReusableHumanoidRig',skeleton:0,joints:joints.map((_,i)=>i),inverseBindMatrices:acc(new Float32Array(ibm),'MAT4',5126)}];
 const quat=(x=0,y=0,z=0)=>{x*=deg/2;y*=deg/2;z*=deg/2;const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);return [sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz,cx*cy*cz+sx*sy*sz]};
 const defs=[['IDLE_BREATH',2.2,17],['WALK',1.12,21],['RUN',.78,21],['SPRINT',.67,21],['COMBAT_READY',1.8,17],['ATTACK_LIGHT_JAB',.58,13],['ATTACK_LIGHT_SLASH',.84,15],['ATTACK_HEAVY',1.08,17],['GUARD_BLOCK',.9,13],['DODGE_LEFT',.72,13],['HIT_FRONT',.6,13],['JUMP',.9,13],['CAST_SPELL',1.2,17],['DEATH_FRONT',1.4,17],['GET_UP',1.18,17]];
 const pulse=(u,at=.42,w=.3)=>Math.exp(-Math.pow((u-at)/w,2)*2);
 function pose(name,u){
  const s=Math.sin(2*Math.PI*u),c=Math.cos(2*Math.PI*u),E={},T=[0,1.03,0];
  if(name==='IDLE_BREATH'){E.Spine=[1.5*s,1.3*c,0];E.Chest=[2.8*s,2*c,1.2*c];E.Head=[-1.5*s,3*c,0];E.Shoulder_L=[s,0,-3];E.Shoulder_R=[s,0,3];T[1]+=.007*s;}
  if(['WALK','RUN','SPRINT'].includes(name)){
   const k=name==='WALK'?31:name==='RUN'?54:66;E.UpperLeg_L=[k*s,0,0];E.UpperLeg_R=[-k*s,0,0];E.Knee_L=[Math.max(0,-s)*25+(name==='WALK'?5:12),0,0];E.Knee_R=[Math.max(0,s)*25+(name==='WALK'?5:12),0,0];
   E.Shoulder_L=[-k*.82*s,0,-4];E.Shoulder_R=[k*.82*s,0,4];E.Elbow_L=[name==='WALK'?-6:-40,0,0];E.Elbow_R=[name==='WALK'?-6:-40,0,0];
   E.Chest=[name==='WALK'?5:13,0,2*c];E.Head=[-3,-1.6*c,0];E.Hips=[0,3*s,2*c];T[1]+=(name==='WALK'?.02:.045)*Math.cos(4*Math.PI*u);
  }
  if(name==='COMBAT_READY'){E.Shoulder_L=[-45,0,-10];E.Shoulder_R=[-48,0,10];E.Elbow_L=[-48,0,-7];E.Elbow_R=[-48,0,7];E.Chest=[6+2*s,9*s,0];E.Head=[-3,3*s,0];E.UpperLeg_L=[8,0,4];E.UpperLeg_R=[8,0,-4];T[1]-=.07;}
  if(name.startsWith('ATTACK_')){
   const q=pulse(u,name==='ATTACK_LIGHT_JAB'?.41:.55,.31),prep=pulse(u,.17,.2),rec=pulse(u,.8,.28);
   E.Shoulder_R=[-35-(name==='ATTACK_HEAVY'?110:70)*q+35*prep,0,12+45*prep-18*q];E.Elbow_R=[-38+25*q,0,-15*q];
   E.Shoulder_L=[-20-20*q,0,-8];E.Elbow_L=[-25,0,0];E.Chest=[4+22*q,-18*prep+31*q-8*rec,8*prep-13*q];
   E.Hips=[0,8*q-4*prep,0];E.Head=[-4,-12*q,0];E.UpperLeg_L=[5+16*q,0,0];E.UpperLeg_R=[-5-10*q,0,0];T[1]-=.025*q;
  }
  if(name==='GUARD_BLOCK'){const q=Math.max(0,Math.min(1,u*5,(1-u)*6));E.Shoulder_L=[-66*q,0,-18*q];E.Shoulder_R=[-68*q,0,18*q];E.Elbow_L=[-75*q,0,0];E.Elbow_R=[-73*q,0,0];E.Chest=[-9*q,0,0];E.Head=[7*q,0,0];}
  if(name==='DODGE_LEFT'){const q=pulse(u,.49,.38);E.Chest=[12*q,0,-35*q];E.Hips=[0,0,-19*q];E.Head=[-9*q,0,15*q];E.UpperLeg_L=[39*q,0,16*q];E.UpperLeg_R=[-31*q,0,-9*q];E.Shoulder_L=[-28*q,0,-22*q];E.Shoulder_R=[-30*q,0,-14*q];T[1]-=.13*q;}
  if(name==='HIT_FRONT'){const q=pulse(u,.38,.33);E.Chest=[-30*q,0,8*q];E.Head=[28*q,0,0];E.Shoulder_L=[23*q,0,18*q];E.Shoulder_R=[23*q,0,-18*q];E.Hips=[-11*q,0,0];}
  if(name==='JUMP'){const q=Math.sin(Math.PI*u);E.UpperLeg_L=[29*q,0,0];E.UpperLeg_R=[18*q,0,0];E.Knee_L=[34*q,0,0];E.Knee_R=[35*q,0,0];E.Shoulder_L=[-68*q,0,-10*q];E.Shoulder_R=[-65*q,0,10*q];T[1]+=.12*q;}
  if(name==='CAST_SPELL'){const q=pulse(u,.55,.51);E.Shoulder_L=[-110*q,0,-17*q];E.Shoulder_R=[-120*q,0,17*q];E.Elbow_L=[-24*q,0,0];E.Elbow_R=[-24*q,0,0];E.Chest=[-15*q,4*q,0];E.Head=[-12*q,0,0];T[1]+=.03*q;}
  if(name==='DEATH_FRONT'||name==='GET_UP'){const q=name==='DEATH_FRONT'?u:u<.2?1:1-(u-.2)/.8;E.Chest=[55*q,0,0];E.Head=[-37*q,0,0];E.UpperLeg_L=[-54*q,0,10*q];E.UpperLeg_R=[-50*q,0,-8*q];E.Knee_L=[71*q,0,0];E.Knee_R=[69*q,0,0];E.Shoulder_L=[31*q,0,-22*q];E.Shoulder_R=[40*q,0,25*q];T[1]-=.45*q;}
  return {E,T};
 }
 for(const [name,d,n] of defs){
  const times=Float32Array.from({length:n},(_,i)=>d*i/(n-1)),input=acc(times,'SCALAR',5126,undefined,{min:[0],max:[d]});
  const frames=Array.from({length:n},(_,i)=>pose(name,i/(n-1))),a={name,samplers:[],channels:[]};
  for(let bone=1;bone<joints.length-1;bone++){
   const rotations=frames.flatMap(p=>quat(...(p.E[joints[bone][0]]||[0,0,0])));
   const output=acc(new Float32Array(rotations),'VEC4',5126);
   const s=a.samplers.push({input,output,interpolation:'LINEAR'})-1;a.channels.push({sampler:s,target:{node:bone,path:'rotation'}});
  }
  const out=acc(new Float32Array(frames.flatMap(p=>p.T)),'VEC3',5126);
  a.channels.push({sampler:a.samplers.push({input,output:out,interpolation:'LINEAR'})-1,target:{node:1,path:'translation'}});gltf.animations.push(a);
 }
 const bin=new Uint8Array(bufferSize);let offset=0;for(const c of chunks){bin.set(c,offset);offset+=c.length;}gltf.buffers=[{byteLength:bin.length}];
 const json=JSON.stringify(gltf),jl=(json.length+3)&~3,jb=new Uint8Array(jl);for(let i=0;i<jl;i++)jb[i]=i<json.length?json.charCodeAt(i):32;
 const padded=(bin.length+3)&~3,total=12+8+jl+8+padded,out=new Uint8Array(total),dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,jl,true);dv.setUint32(16,0x4e4f534a,true);out.set(jb,20);
 const off=20+jl;dv.setUint32(off,padded,true);dv.setUint32(off+4,0x004e4942,true);out.set(bin,off+8);
 return {bytes:out,vertexCount:groups.reduce((v,g)=>v+g.p.length/3,0),triangleCount:groups.reduce((v,g)=>v+g.ind.length/3,0),jointCount:joints.length,clipNames:defs.map(x=>x[0]),gltf};
}

const outputDir=path.resolve(process.argv[2]||'assets/shared');
fs.mkdirSync(outputDir,{recursive:true});
for(const role of ['traveler','guardian']){
  const asset=buildSharedHumanoid(role);
  const destination=path.join(outputDir,'humanoid-'+role+'.glb');
  fs.writeFileSync(destination,asset.bytes);
  console.log(JSON.stringify({path:destination,vertices:asset.vertexCount,triangles:asset.triangleCount,joints:asset.jointCount,animations:asset.clipNames,nativeRuntimeVerified:false}));
}
