// 파일명: assets/native-authoring/build-shared-creature.mjs
// 임포트: 기존 GRAPHICS_PRODUCTION의 엔진 중립 공용 크리처 원본 제작.
// 메인: 실제 다관절 스킨 3D 모델과 종족별 이동·공격·스킬 키프레임 제작.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SHARED_CREATURE_SPECIES=Object.freeze({
  wolf:{bodyPlan:'QUADRUPED_CANINE',pairs:2,height:.90,signature:'WOLF_PACK_HOWL',palette:[.34,.34,.33]},
  spider:{bodyPlan:'ARACHNID',pairs:4,height:.73,signature:'SPIDER_WEB_THREAT',palette:[.19,.14,.20]},
  beetle:{bodyPlan:'HEXAPOD_INSECT',pairs:3,height:.61,signature:'BEETLE_HORN_CHARGE',palette:[.14,.31,.24]},
  golem:{bodyPlan:'HEAVY_GOLEM_OR_BOSS',pairs:1,height:1.70,signature:'GOLEM_CORE_PULSE',palette:[.42,.42,.41]},
  serpent:{bodyPlan:'REPTILE_OR_SERPENT',pairs:0,height:.44,signature:'SERPENT_COIL_STRIKE',palette:[.17,.35,.24]}
});
// 공용 종별 모션 확장팩. 플랫폼 독립 스킨·관절 키프레임이며 기존 원본 보존.
export const SHARED_CREATURE_ACTION_LIBRARY=Object.freeze({
 wolf:['WOLF_STALK_CROUCH','WOLF_FLANK_LUNGE','WOLF_POUNCE_PIN','WOLF_PACK_HOWL_LOOP','WOLF_GUARD_BACKSTEP','WOLF_HEAVY_HIT','WOLF_GET_UP','WOLF_BOSS_PHASE_TELL'],
 spider:['SPIDER_SILK_DESCENT','SPIDER_WALL_PIVOT','SPIDER_TWO_LEG_STAB','SPIDER_FANG_BURST','SPIDER_WEB_AIM','SPIDER_SHELL_BRACE','SPIDER_KNOCKBACK','SPIDER_BOSS_PHASE_TELL'],
 beetle:['BEETLE_HORN_UPSWEEP','BEETLE_TURN_RAM','BEETLE_SHELL_BLOCK','BEETLE_HORN_FEINT','BEETLE_MANDIBLE_CLAMP','BEETLE_LEG_STOMP','BEETLE_REEL_BACK','BEETLE_BOSS_PHASE_TELL'],
 golem:['GOLEM_CORE_CHANNEL','GOLEM_DOUBLE_FIST_SLAM','GOLEM_GROUND_STOMP','GOLEM_GUARD_BRACE','GOLEM_SLOW_TURN','GOLEM_HEAD_RECOIL','GOLEM_FALL_RECOVER','GOLEM_BOSS_PHASE_TELL'],
 serpent:['SERPENT_COIL_CHARGE','SERPENT_SIDE_FANG','SERPENT_TAIL_WHIP','SERPENT_SPIRAL_EVADE','SERPENT_VENOM_AIM','SERPENT_HIT_COIL','SERPENT_UNCOIL_RECOVER','SERPENT_BOSS_PHASE_TELL']
});
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(a=>a/n)};
const pulse=(t,p,w)=>Math.exp(-2*Math.pow((t-p)/w,2));
const quaternion=(x,y,z)=>{
 const a=Math.cos(x/2),b=Math.sin(x/2),c=Math.cos(y/2),d=Math.sin(y/2),e=Math.cos(z/2),f=Math.sin(z/2);
 return [b*c*e-a*d*f,a*d*e+b*c*f,a*c*f-b*d*e,a*c*e+b*d*f];
};
export function buildSharedCreature(species='wolf',{extended=false}={}){
 const id=String(species).toLowerCase(),cfg=SHARED_CREATURE_SPECIES[id];
 if(!cfg)throw Error('UNKNOWN_SHARED_CREATURE:'+id);
 const joints=[],world=[],addJoint=(name,parent,position)=>{
   const k=joints.length;joints.push({name,parent,position});
   world.push(parent<0?position:add(world[parent],position));return k;
 };
 const root=addJoint('Root',-1,[0,0,0]);
 const torso=addJoint('Torso',root,[0,cfg.height,0]);
 const head=addJoint('Head',torso,[0,.08,id==='golem'?0:-.49]);
 const jaw=addJoint(id==='beetle'?'Horn':id==='spider'?'Fangs':id==='golem'?'Core':'Jaw',head,[0,-.10,-.14]);
 const tail=addJoint('Tail',torso,[0,.06,.53]);
 const legs=[],extras=[];
 for(let p=0;p<cfg.pairs;p++)for(const side of [-1,1]){
   const prefix='Leg'+p+(side<0?'L':'R'),depth=cfg.pairs===1?0:p/(cfg.pairs-1)-.5;
   const hip=addJoint(prefix,torso,[side*(id==='golem'?.34:.30),id==='golem'?-0.54:-.22,depth*.96]);
   const knee=addJoint(prefix+'Knee',hip,[side*(id==='golem'?.03:.30),id==='golem'?-.57:-.27,.03]);
   const foot=addJoint(prefix+'Foot',knee,[side*.06,id==='golem'?-.42:-.30,-.10]);
   legs.push({hip,knee,foot,p,side});
 }
 if(id==='golem'){
   for(const side of [-1,1]){
     const arm=addJoint('Arm'+side,torso,[side*.60,.30,0]);
     const fist=addJoint('Fist'+side,arm,[side*.17,-.53,0]);
     extras.push(arm,fist);
   }
 }
 if(id==='serpent'){
   let parent=tail;
   for(let i=0;i<12;i++){parent=addJoint('Spine'+i,parent,[0,0,.25]);extras.push(parent)}
 }
 const base=cfg.palette,colors=[
   [base[0],base[1],base[2],1],
   [Math.min(1,base[0]*1.38),Math.min(1,base[1]*1.25),Math.min(1,base[2]*1.17),1],
   [.75,.69,.41,1],[.10,.12,.14,1],[.38,.62,.70,1]
 ];
 const groups=colors.map(()=>({p:[],n:[],uv:[],bones:[],weights:[],indices:[]}));
 function vertex(mat,bone,pos,normal,u,v){
   const g=groups[mat],index=g.p.length/3;
   g.p.push(...pos);g.n.push(...norm(normal));g.uv.push(u,v);
   g.bones.push(bone,0,0,0);g.weights.push(1,0,0,0);
   return index;
 }
 function ball(mat,bone,center,radii,sides=14,rings=9){
   const g=groups[mat],rows=[];
   for(let i=0;i<=rings;i++){
     const a=i/rings*Math.PI,row=[];
     for(let k=0;k<=sides;k++){
       const b=k/sides*2*Math.PI,n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];
       row.push(vertex(mat,bone,add(center,n.map((v,j)=>v*radii[j])),n.map((v,j)=>v/radii[j]),k/sides,i/rings));
     }rows.push(row);
   }
   for(let i=0;i<rings;i++)for(let k=0;k<sides;k++){
     const a=rows[i][k],b=rows[i+1][k];g.indices.push(a,b,a+1,a+1,b,b+1);
   }
 }
 function pipe(mat,bone,from,to,r0,r1,sides=10){
   const g=groups[mat],dir=norm(diff(to,from)),reference=Math.abs(dir[1])>.9?[0,0,1]:[0,1,0];
   const axis=norm(cross(dir,reference)),other=norm(cross(dir,axis)),rings=[];
   for(let j=0;j<3;j++){
     const t=j/2,r=r0*(1-t)+r1*t,center=add(from,mul(diff(to,from),t)),row=[];
     for(let k=0;k<=sides;k++){
       const v=k/sides*2*Math.PI,n=add(mul(axis,Math.cos(v)),mul(other,Math.sin(v)));
       row.push(vertex(mat,bone,add(center,mul(n,r)),n,k/sides,t));
     }rings.push(row);
   }
   for(let j=0;j<2;j++)for(let k=0;k<sides;k++){
     const a=rings[j][k],b=rings[j+1][k];g.indices.push(a,b,a+1,a+1,b,b+1);
   }
 }
 ball(0,torso,world[torso],id==='golem'?[.55,.64,.37]:id==='serpent'?[.31,.25,.54]:[.35,.28,.54],18,10);
 ball(1,head,world[head],id==='golem'?[.33,.33,.30]:[.26,.22,.29]);
 ball(id==='golem'?4:2,jaw,world[jaw],[.13,.08,.15],10,7);
 if(id==='spider'||id==='beetle')ball(1,tail,world[tail],[.37,.32,.42],17,10);
 if(id==='wolf')pipe(1,tail,world[tail],add(world[tail],[0,.18,.40]),.14,.05);
 if(id==='golem')ball(4,jaw,add(world[torso],[0,.10,-.33]),[.15,.18,.07]);
 for(const leg of legs){
   pipe(0,leg.hip,world[leg.hip],world[leg.knee],id==='golem'?.24:.115,.07);
   pipe(1,leg.knee,world[leg.knee],world[leg.foot],id==='golem'?.18:.08,.035);
   ball(2,leg.foot,world[leg.foot],id==='golem'?[.23,.10,.27]:[.075,.04,.11],10,6);
 }
 for(let i=0;i<extras.length;i++){
   const k=extras[i],center=world[k],parent=joints[k].parent;
   if(id==='golem'){
     if(joints[k].name.startsWith('Arm'))pipe(0,k,world[parent],center,.20,.14);
     else ball(1,k,center,[.23,.25,.24]);
   }else pipe(i%2?1:0,k,center,add(center,[0,0,.31]),Math.max(.04,.29-i*.017),Math.max(.03,.27-i*.018),12);
 }
 const extraClips=extended?SHARED_CREATURE_ACTION_LIBRARY[id]:[];
 const clips=['IDLE_BREATH','WALK','RUN','TURN','ATTACK_A','ATTACK_B','SKILL_PREPARE','SKILL_RELEASE','HIT_FRONT','DEATH',cfg.signature,...extraClips];
 function pose(clip,t){
   const a=t*Math.PI*2,locomotion=clip==='WALK'||clip==='RUN',fast=clip==='RUN';
   const wind=pulse(t,.26,.18),contact=pulse(t,.57,.17),rebound=pulse(t,.78,.15);
   const charge=pulse(t,.44,.32),impact=pulse(t,.69,.15),idle=Math.sin(a);
   const angles={
     [torso]:[.028*idle,clip==='TURN'?.33*idle:0,.03*Math.cos(a)],
     [head]:[.036*idle,.025*Math.cos(a),0],
     [tail]:[.09*Math.sin(a+.5),.19*Math.sin(a+.7),0],
     [jaw]:[.023*idle,0,0]
   };
   // 종족별 공격: 이빨/뿔의 전방 찌르기와 측면 쓸기 동작이 분리된다.
   if(clip==='ATTACK_A'){
     angles[torso]=[-.28*wind+.34*contact,-.09*wind,.06*rebound];
     angles[head]=[-.36*wind+.57*contact,0,-.05*contact];
     angles[jaw]=[.30*wind-.64*contact,0,0];
   }else if(clip==='ATTACK_B'){
     angles[torso]=[.08*wind-.20*contact,-.37*wind+.53*contact,.18*wind-.21*contact];
     angles[head]=[.18*wind-.32*contact,.29*wind-.44*contact,.13*wind];
     angles[tail]=[-.14*wind+.29*contact,.54*wind-.71*contact,0];
     angles[jaw]=[-.19*wind+.30*contact,0,.13*wind];
   }else if(clip==='SKILL_PREPARE'){
     angles[torso]=[-.34*charge,.12*charge,.10*charge];
     angles[head]=[-.42*charge,.17*charge,0];
     angles[jaw]=[-.30*charge,0,0];
     angles[tail]=[.21*charge,-.22*charge,.07*charge];
   }else if(clip==='SKILL_RELEASE'){
     angles[torso]=[-.27*wind+.46*impact,.21*impact,.13*rebound];
     angles[head]=[-.39*wind+.68*impact,-.24*impact,0];
     angles[jaw]=[-.34*wind+.78*impact,0,0];
     angles[tail]=[.17*wind-.43*impact,-.20*wind+.52*impact,0];
   }else if(clip===cfg.signature){
     angles[torso]=[-.38*wind+.49*contact,.17*wind-.19*contact,.12*contact];
     angles[head]=[-.65*wind+.74*contact,.22*contact,.11*wind];
     angles[jaw]=[-.50*wind+.83*contact,0,0];
     angles[tail]=[.40*wind-.38*contact,.44*wind+.25*contact,0];
   }
   // 실제 다리·팔·척추 관절은 몸통과 서로 다른 시간차를 가진다.
   for(const l of legs){
     const phase=a+Math.PI*(l.p+(l.side<0?0:1));
     const step=Math.sin(phase),k=locomotion?(fast?.67:.36):.032;
     angles[l.hip]=[k*step,.09*step,l.side*.20*k*step];
     angles[l.knee]=[Math.max(0,-step)*k*.73,0,0];
     angles[l.foot]=[-Math.max(0,-step)*k*.38,.04*step,0];
     if(clip==='ATTACK_A'){
       const front=l.p===0?1:.35;
       angles[l.hip][0]+=-.35*wind*front+.43*contact*front;
       angles[l.knee][0]+=.31*contact*front;
     }else if(clip==='ATTACK_B'){
       angles[l.hip][1]+=l.side*(.29*wind-.44*contact);
       angles[l.foot][2]+=l.side*.19*contact;
     }else if(clip==='SKILL_PREPARE'){
       angles[l.hip][0]+=.26*charge;
       angles[l.knee][0]+=.29*charge;
     }else if(clip==='SKILL_RELEASE'){
       angles[l.hip][0]+=-.31*wind+.39*impact;
       angles[l.knee][0]+=.37*impact;
     }else if(clip===cfg.signature){
       angles[l.hip][0]+=l.p%2===0?-.31*wind+.39*contact:.21*wind-.27*contact;
       angles[l.knee][0]+=.33*contact;
     }
   }
   for(let i=0;i<extras.length;i++){
     const k=extras[i],phase=a-i*.39,delay=pulse(t,.58+i*.016,.19);
     angles[k]=[.12*Math.sin(phase),.18*Math.sin(phase*.78),.05*Math.cos(phase)];
     if(clip==='ATTACK_A')angles[k][0]+=-.34*wind+.44*contact;
     else if(clip==='ATTACK_B')angles[k][1]+=.40*wind-.49*contact;
     else if(clip==='SKILL_PREPARE')angles[k][0]+=-.31*charge;
     else if(clip==='SKILL_RELEASE')angles[k][0]+=.52*delay;
     else if(clip===cfg.signature){angles[k][0]+=.51*delay;angles[k][1]+=.35*contact}
   }
   // 종별 특징은 같은 일반 공격 프레임을 색상만 바꿔 공유하지 않는다.
   if(id==='wolf'){
     if(clip==='ATTACK_A'||clip===cfg.signature)angles[head][0]+=-.20*wind+.24*contact;
     if(clip===cfg.signature)angles[head][0]-=.40*wind;
   }else if(id==='spider'){
     if(clip==='ATTACK_B')angles[tail][0]+=.39*contact;
     if(clip==='SKILL_RELEASE'||clip===cfg.signature)angles[head][1]+=.35*impact;
   }else if(id==='beetle'){
     if(clip==='ATTACK_A'||clip===cfg.signature)angles[jaw][0]+=-.40*wind+.34*contact;
     if(clip==='SKILL_PREPARE')angles[tail][0]+=.34*charge;
   }else if(id==='golem'){
     if(clip==='ATTACK_B')angles[torso][0]+=.42*contact;
     if(clip===cfg.signature)angles[jaw][0]+=.52*contact;
   }else if(id==='serpent'){
     if(clip==='ATTACK_B')angles[tail][1]+=.70*contact;
     if(clip==='SKILL_PREPARE')angles[torso][1]+=.29*charge;
   }
   if(clip==='HIT_FRONT'){
     angles[torso]=[-.35*pulse(t,.32,.23),0,.15*pulse(t,.37,.19)];
     angles[head]=[.36*pulse(t,.31,.21),0,0];
   }else if(clip==='DEATH'){
     angles[torso]=[.74*t,.10*t,.17*t];
     angles[head]=[-.34*t,0,0];
     for(const l of legs)angles[l.hip]=[.47*t,0,l.side*.25*t];
     for(let i=0;i<extras.length;i++)angles[extras[i]]=[.37*t,.19*t,0];
   }
   // 종족 신체·관절 위상에 맞게 모션을 제작하며 피해·히트박스·AI·이동 권한은 포함하지 않는다.
   const mode=extraClips.indexOf(clip);
   if(mode>=0){
     const brace=pulse(t,.25,.16),act=pulse(t,.56,.17),rest=pulse(t,.82,.17),wave=Math.sin(Math.PI*t);
     const side=mode%2===0?1:-1,shape=[
       [-.18,.10,-.25,.15,.13],[-.36,.52,-.43,.65,.24],[-.45,.36,-.28,.78,.32],
       [-.33,.10,-.70,.35,.47],[.28,-.09,.36,-.16,-.23],[.52,-.21,.48,-.14,-.42],
       [.34,-.16,-.27,.22,-.31],[-.49,.24,-.53,.52,.45]
     ][mode];
     angles[torso]=[shape[0]*brace+shape[1]*act,.18*side*(act-brace),.17*side*(brace-rest)];
     angles[head]=[shape[2]*brace+shape[3]*act,.14*side*Math.sin(a),.09*side*act];
     angles[jaw]=[shape[4]*brace-.42*act,0,0];
     angles[tail]=[.28*wave-.19*act,.31*side*(wave-act),.07*Math.sin(a)];
     if(mode===0||mode===3||mode===7){angles[torso][0]-=.21*wave;angles[head][0]-=.27*wave;}
     for(const leg of legs){
       const phase=Math.sin(a+leg.p*.72+(leg.side<0?0:Math.PI)),lead=leg.p===0?1:.55;
       angles[leg.hip]=[-.25*brace*lead+.41*act*lead,.17*side*leg.side*act,.15*leg.side*brace];
       angles[leg.knee]=[.18*wave+.23*act*lead,0,.06*phase];
       angles[leg.foot]=[-.17*act,.07*phase,.08*leg.side*act];
       if(mode===4){angles[leg.hip][0]*=-1;angles[leg.hip][1]*=1.5;}
       if(mode===6)angles[leg.knee][0]+=.34*(1-t)*wave;
       if(id==='spider')angles[leg.hip][0]+=(leg.p%2?1:-1)*.20*pulse(t,.51+leg.p*.021,.2);
     }
     for(let index=0;index<extras.length;index++){
       const limb=extras[index],phase=pulse(t,.53+index*.025,.18),sign=index%2?1:-1;
       angles[limb]=[-.27*brace+.53*phase*sign,.26*side*wave-.18*act,.12*Math.sin(a-index*.42)];
       if(id==='serpent')angles[limb]=[.12*Math.sin(a*1.4-index*.4),.26*Math.sin(a-index*.48)+.16*side*act,.11*Math.sin(a-index*.25)];
       if(id==='golem')angles[limb]=[-.35*brace+.55*act,.18*sign*brace-.18*sign*act,.11*sign*wave];
     }
     if(id==='wolf')angles[head][0]+=-.21*brace+.23*act;
     if(id==='beetle')angles[jaw][0]+=-.30*brace+.39*act;
     if(id==='serpent')angles[tail][1]+=.47*side*act;
     if(id==='spider')angles[head][1]+=.23*side*act;
   }
   return angles;
 }
 const doc={asset:{version:'2.0',generator:'Jaewoon shared GRAPHICS_PRODUCTION creature'},
   scene:0,scenes:[{nodes:[0,joints.length]}],
   nodes:joints.map(j=>({name:j.name,translation:j.position,children:[]})),
   meshes:[],skins:[],accessors:[],bufferViews:[],materials:[],animations:[],buffers:[]};
 for(let i=0;i<joints.length;i++)if(joints[i].parent>=0)doc.nodes[joints[i].parent].children.push(i);
 for(let i=0;i<joints.length;i++)if(!doc.nodes[i].children.length)delete doc.nodes[i].children;
 doc.nodes.push({name:'SkinnedCreature',mesh:0,skin:0});
 const pieces=[];let length=0;
 function view(data,target){
   const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength),padding=(4-bytes.length%4)%4,
    o={buffer:0,byteOffset:length,byteLength:bytes.length};
   if(target)o.target=target;
   pieces.push(bytes);if(padding)pieces.push(new Uint8Array(padding));
   length+=bytes.length+padding;return doc.bufferViews.push(o)-1;
 }
 function accessor(data,type,componentType,target=undefined,min=undefined,max=undefined){
   const n={bufferView:view(data,target),type,componentType,count:data.length/({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[type])};
   if(min)n.min=min;if(max)n.max=max;return doc.accessors.push(n)-1;
 }
 doc.materials=colors.map((v,i)=>({name:'Material'+i,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:i===2?.12:.02,roughnessFactor:.84}}));
 doc.meshes=[{name:'CreatureMesh',primitives:groups.filter(g=>g.indices.length).map(g=>{
   if(g.p.length/3>=65535)throw Error('MOBILE_CREATURE_VERTEX_BUDGET_EXCEEDED');
   const positionMin=[0,1,2].map(axis=>Math.min(...g.p.filter((_,i)=>i%3===axis)));
   const positionMax=[0,1,2].map(axis=>Math.max(...g.p.filter((_,i)=>i%3===axis)));
   return {mode:4,material:groups.indexOf(g),attributes:{
     POSITION:accessor(new Float32Array(g.p),'VEC3',5126,34962,positionMin,positionMax),
     NORMAL:accessor(new Float32Array(g.n),'VEC3',5126,34962),
     TEXCOORD_0:accessor(new Float32Array(g.uv),'VEC2',5126,34962),
     JOINTS_0:accessor(new Uint16Array(g.bones),'VEC4',5123,34962),
     WEIGHTS_0:accessor(new Float32Array(g.weights),'VEC4',5126,34962)
   },indices:accessor(new Uint16Array(g.indices),'SCALAR',5123,34963)};
 })}];
 const inverse=[];for(const w of world)inverse.push(1,0,0,0,0,1,0,0,0,0,1,0,-w[0],-w[1],-w[2],1);
 doc.skins=[{name:'CreatureRig',joints:joints.map((_,i)=>i),skeleton:0,
    inverseBindMatrices:accessor(new Float32Array(inverse),'MAT4',5126)}];
 for(const clip of clips){
   const frames=25,duration=clip==='IDLE_BREATH'?2:clip==='DEATH'?1.4:clip===cfg.signature?1.3:.9,
    time=accessor(Float32Array.from({length:frames},(_,i)=>i/(frames-1)*duration),'SCALAR',5126,undefined,[0],[duration]);
   const animation={name:clip,samplers:[],channels:[]};
   for(let bone=1;bone<joints.length;bone++){
     const values=[];for(let i=0;i<frames;i++)values.push(...quaternion(...(pose(clip,i/(frames-1))[bone]||[0,0,0])));
     const out=accessor(new Float32Array(values),'VEC4',5126);
     animation.channels.push({sampler:animation.samplers.push({input:time,output:out,interpolation:'LINEAR'})-1,target:{node:bone,path:'rotation'}});
   }doc.animations.push(animation);
 }
 const binary=new Uint8Array(length);let offset=0;for(const part of pieces){binary.set(part,offset);offset+=part.length}
 doc.buffers=[{byteLength:length}];
 const json=JSON.stringify(doc),encoded=Uint8Array.from(json,x=>x.charCodeAt(0));
 if([...json].some(x=>x.charCodeAt(0)>127))throw Error('CREATURE_GLTF_JSON_REQUIRES_ASCII');
 const jsonSize=(encoded.length+3)&~3,binarySize=(binary.length+3)&~3,total=12+8+jsonSize+8+binarySize,
   output=new Uint8Array(total),dv=new DataView(output.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);
 dv.setUint32(12,jsonSize,true);dv.setUint32(16,0x4e4f534a,true);
 output.fill(32,20,20+jsonSize);output.set(encoded,20);
 const binAt=20+jsonSize;
 dv.setUint32(binAt,binarySize,true);dv.setUint32(binAt+4,0x004e4942,true);
 output.set(binary,binAt+8);
 return {bytes:output,bodyPlan:cfg.bodyPlan,vertices:groups.reduce((n,g)=>n+g.p.length/3,0),
   triangles:groups.reduce((n,g)=>n+g.indices.length/3,0),jointCount:joints.length,clipNames:clips,
   sourceVerified:false,nativeRuntimeVerified:false,productionVerified:false,gameplayAuthority:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=process.argv.find(x=>x.startsWith('--species='));
  const wanted=arg?arg.slice(10).split(',').map(x=>x.trim()).filter(Boolean):Object.keys(SHARED_CREATURE_SPECIES);
  const targetArg=process.argv.slice(2).find(x=>!x.startsWith('--'));
  const targetDir=path.resolve(targetArg||'assets/shared');
  const extended=process.argv.includes('--extended-actions');
  if(!wanted.length)throw Error('NO_CREATURE_SPECIES_REQUESTED');
  fs.mkdirSync(targetDir,{recursive:true});
  for(const id of new Set(wanted)){
    const actor=buildSharedCreature(id,{extended}),file=path.join(targetDir,'creature-'+id+(extended?'-actions':'')+'.glb');
    fs.writeFileSync(file,actor.bytes);
    console.log(JSON.stringify({file,bodyPlan:actor.bodyPlan,triangles:actor.triangles,skinnedJoints:actor.jointCount,clips:actor.clipNames,nativeRuntimeVerified:false}));
  }
}
