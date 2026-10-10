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
 // 직업별 외형은 얼굴색만 바꾸지 않고 스킨 메시의 장비·의복·실루엣을 변경한다.
 const roleParts={
  samurai:[
   [1,1,vertical(0,-.10,[1.11,.90,.72,.58]),[.30,.38,.40,.34],[.06,.08,.07,.06]],
   [8,5,vertical(0,0,[2.15,2.22,2.31]),[.18,.20,.015],[.18,.20,.015]],
   [8,6,[[-.33,1.79,0],[-.43,1.68,0],[-.56,1.54,0]],[.15,.18,.07],[.12,.14,.08]],
   [8,9,[[.33,1.79,0],[.43,1.68,0],[.56,1.54,0]],[.15,.18,.07],[.12,.14,.08]],
   [8,1,[[-.29,1.02,-.15],[-.32,.76,-.17],[-.34,.49,-.18]],[.04,.03,.008],[.03,.02,.008]]
  ],
  archer:[
   [0,3,vertical(0,-.19,[1.73,1.50,1.21,.97]),[.28,.36,.35,.28],[.075,.09,.07,.05]],
   [6,5,vertical(0,-.03,[2.16,2.29,2.36]),[.18,.22,.07],[.18,.22,.07]],
   [2,3,[[.19,1.75,-.24],[.24,1.47,-.29],[.26,1.20,-.33]],[.14,.17,.08],[.075,.08,.05]],
   [8,8,[[-.90,1.12,.04],[-.99,1.41,.13],[-1.05,1.75,.22],[-.97,2.09,.10],[-.92,2.18,.04]],[.020,.017,.021,.017,.020],[.015,.014,.016,.014,.015]]
  ],
  mage:[
   [0,1,vertical(0,-.02,[1.13,.95,.73,.50]),[.29,.40,.50,.59],[.16,.17,.14,.10]],
   [6,5,vertical(0,0,[2.14,2.27,2.45,2.65]),[.18,.23,.12,.003],[.18,.23,.12,.003]],
   [5,5,vertical(0,0,[2.17,2.21,2.25]),[.25,.26,.13],[.24,.24,.12]],
   [2,11,[[.92,1.10,.06],[.96,1.63,.06],[.97,2.18,.07],[.99,2.55,.07]],[.034,.037,.026,.014],[.032,.034,.023,.014]]
  ],
  rogue:[
   [6,5,vertical(0,-.09,[2.15,2.27,2.35]),[.20,.22,.05],[.19,.21,.05]],
   [6,5,vertical(0,.16,[1.97,2.04,2.11]),[.17,.19,.19],[.08,.11,.11]],
   [2,3,[[-.34,1.79,-.20],[-.25,1.51,-.26],[-.04,1.24,-.29]],[.16,.15,.07],[.06,.07,.05]],
   [8,11,[[.91,1.12,.02],[.94,.96,.07],[.97,.77,.10]],[.04,.028,.004],[.023,.016,.004]],
   [8,8,[[-.91,1.12,.02],[-.94,.99,.07],[-.97,.84,.10]],[.035,.024,.004],[.023,.014,.004]]
  ],
  lancer:[
   [8,6,[[-.34,1.81,.02],[-.43,1.67,.02],[-.56,1.54,.02]],[.17,.18,.07],[.12,.15,.07]],
   [8,9,[[.34,1.81,.02],[.43,1.67,.02],[.56,1.54,.02]],[.17,.18,.07],[.12,.15,.07]],
   [1,3,vertical(0,.12,[1.55,1.68,1.78]),[.26,.31,.18],[.075,.085,.055]],
   [2,18,[[.92,.51,.09],[.92,1.16,.09],[.92,1.89,.09],[.92,2.64,.09],[.92,2.99,.09]],[.035,.038,.030,.023,.003],[.035,.038,.030,.023,.003]],
   [8,18,[[.92,2.78,.09],[.92,2.98,.09],[.92,3.18,.09]],[.063,.052,.003],[.037,.033,.003]]
  ],
  blacksmith:[
   [2,3,vertical(0,.19,[1.64,1.48,1.15,.81]),[.23,.30,.31,.32],[.05,.06,.065,.05]],
   [4,1,vertical(0,.17,[.95,.84,.66]),[.30,.34,.30],[.07,.08,.05]],
   [8,7,[[-.62,1.45,.01],[-.73,1.28,.01],[-.81,1.14,.01]],[.087,.10,.07],[.08,.09,.06]],
   [8,10,[[.62,1.45,.01],[.73,1.28,.01],[.81,1.14,.01]],[.087,.10,.07],[.08,.09,.06]],
   [8,11,[[.91,1.13,.04],[.92,1.44,.04],[.93,1.59,.04]],[.044,.044,.034],[.039,.039,.029]],
   [8,11,[[.93,1.59,.04],[.93,1.66,.04],[.93,1.72,.04]],[.13,.13,.08],[.11,.11,.07]]
  ]
 };
 for(const [material,bone,points,rx,rz] of roleParts[kind]||[])loft(material,bone,points,rx,rz,12);
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
 gltf.meshes=[{name:guardian?'GuardianBody':kind==='traveler'?'TravelerBody':kind[0].toUpperCase()+kind.slice(1)+'Body',primitives}];
 gltf.nodes=joints.map(j=>({name:j[0],translation:j[2]}));
 joints.forEach((j,i)=>{if(j[1]>=0)(gltf.nodes[j[1]].children||(gltf.nodes[j[1]].children=[])).push(i)});
 const meshNode=gltf.nodes.push({name:'SkinnedActor',mesh:0,skin:0})-1;
 gltf.scenes=[{nodes:[0,meshNode]}];
 const ibm=[];for(const [x,y,z] of world)ibm.push(1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1);
 gltf.skins=[{name:'ReusableHumanoidRig',skeleton:0,joints:joints.map((_,i)=>i),inverseBindMatrices:acc(new Float32Array(ibm),'MAT4',5126)}];
 const quat=(x=0,y=0,z=0)=>{x*=deg/2;y*=deg/2;z*=deg/2;const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);return [sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz,cx*cy*cz+sx*sy*sz]};
 const defs=[['IDLE_BREATH',2.2,17],['WALK',1.12,21],['RUN',.78,21],['SPRINT',.67,21],['COMBAT_READY',1.8,17],['ATTACK_LIGHT_JAB',.58,13],['ATTACK_LIGHT_SLASH',.84,15],['ATTACK_HEAVY',1.08,17],['GUARD_BLOCK',.9,13],['DODGE_LEFT',.72,13],['HIT_FRONT',.6,13],['JUMP',.9,13],['CAST_SPELL',1.2,17],['DEATH_FRONT',1.4,17],['GET_UP',1.18,17]];
  // 직업별 독립 관절 클립. 공용 동작 시각화이며 전투 판정·스킬 권한 없음.
  const roleActions={
   samurai:{clip:'SAMURAI_IAI_DRAW',duration:.87,pre:.28,contact:.58,bones:{Chest:[-14,23,18,-30],Shoulder_R:[27,-98,-13,24],Elbow_R:[-44,28,0,0],Shoulder_L:[-26,22,0,0],Hips:[6,-10,-18,26],UpperLeg_L:[18,-13,0,0]}},
   archer:{clip:'ARCHER_DRAW_RELEASE',duration:1.12,pre:.42,contact:.75,bones:{Chest:[-8,15,13,-7],Shoulder_L:[-88,20,-12,3],Shoulder_R:[-75,23,19,-9],Elbow_R:[-93,87,0,0],Hips:[4,-3,-11,7],Head:[-6,9,5,-4]}},
   mage:{clip:'MAGE_AREA_CAST',duration:1.28,pre:.41,contact:.72,bones:{Chest:[-21,30,15,-15],Shoulder_L:[-106,60,-16,6],Shoulder_R:[-109,53,14,-8],Elbow_L:[-34,21,0,0],Elbow_R:[-33,19,0,0],Hips:[-9,12,0,0]}},
   rogue:{clip:'ROGUE_BACKSTEP_CUT',duration:.76,pre:.25,contact:.59,bones:{Chest:[-22,29,-22,28],Shoulder_R:[38,-96,0,-18],Elbow_R:[-32,25,0,0],Hips:[-17,19,20,-26],UpperLeg_R:[35,-18,0,0],UpperLeg_L:[-28,18,0,0]}},
   lancer:{clip:'LANCER_SPEAR_THRUST',duration:.83,pre:.33,contact:.65,bones:{Chest:[-23,35,14,-13],Shoulder_R:[-60,-30,0,0],Shoulder_L:[-59,-30,0,0],Elbow_L:[-38,16,0,0],Elbow_R:[-39,18,0,0],Hips:[-11,15,-14,0]}},
   blacksmith:{clip:'BLACKSMITH_FORGE_HAMMER',duration:1.26,pre:.44,contact:.77,bones:{Chest:[-26,36,14,-11],Shoulder_R:[-108,98,8,0],Shoulder_L:[-80,79,-8,0],Elbow_R:[-41,28,0,0],Elbow_L:[-30,22,0,0],Hips:[15,-24,-9,0]}}
  };
  // 공용 3D 직업 마스터별 실제 관절 액션: 전투·방어·생활·시전의 서로 다른 포즈와 타이밍.
  const careerMoves={
    "samurai": [
      {
        "clip": "SAMURAI_PARRY_RIPOSTE",
        "duration": 0.79,
        "pre": 0.27,
        "contact": 0.6,
        "bones": {
          "Chest": [
            -18,
            29,
            24,
            -31
          ],
          "Shoulder_R": [
            -45,
            -112,
            25,
            -20
          ],
          "Elbow_R": [
            -72,
            18,
            0,
            0
          ],
          "Shoulder_L": [
            -64,
            -4,
            0,
            12
          ],
          "Hips": [
            -11,
            20,
            -20,
            27
          ],
          "UpperLeg_R": [
            21,
            -12,
            0,
            0
          ],
          "Head": [
            -4,
            13,
            -8,
            6
          ]
        }
      },
      {
        "clip": "SAMURAI_CRESCENT_CUT",
        "duration": 1.04,
        "pre": 0.34,
        "contact": 0.73,
        "bones": {
          "Chest": [
            -29,
            48,
            -38,
            47
          ],
          "Shoulder_R": [
            -122,
            68,
            -22,
            19
          ],
          "Elbow_R": [
            -71,
            40,
            0,
            0
          ],
          "Shoulder_L": [
            -12,
            -56,
            18,
            -27
          ],
          "Hips": [
            -23,
            24,
            27,
            -39
          ],
          "UpperLeg_L": [
            -19,
            31,
            0,
            0
          ],
          "Head": [
            13,
            -16,
            0,
            0
          ]
        }
      },
      {
        "clip": "SAMURAI_SHEATH_READY",
        "duration": 0.89,
        "pre": 0.22,
        "contact": 0.62,
        "bones": {
          "Chest": [
            -9,
            11,
            -12,
            8
          ],
          "Shoulder_R": [
            -61,
            18,
            12,
            -11
          ],
          "Elbow_R": [
            -91,
            66,
            0,
            0
          ],
          "Shoulder_L": [
            -88,
            69,
            9,
            -6
          ],
          "Hips": [
            6,
            -8,
            8,
            -9
          ],
          "Head": [
            -8,
            4,
            -7,
            9
          ]
        }
      }
    ],
    "archer": [
      {
        "clip": "ARCHER_KNEEL_FOCUS",
        "duration": 1.21,
        "pre": 0.34,
        "contact": 0.65,
        "bones": {
          "Chest": [
            -8,
            12,
            -9,
            10
          ],
          "Shoulder_L": [
            -104,
            57,
            -21,
            10
          ],
          "Shoulder_R": [
            -95,
            64,
            26,
            -13
          ],
          "Elbow_R": [
            -124,
            88,
            0,
            0
          ],
          "Hips": [
            8,
            15,
            3,
            -11
          ],
          "UpperLeg_L": [
            68,
            -27,
            0,
            0
          ],
          "Knee_L": [
            58,
            -20,
            0,
            0
          ]
        }
      },
      {
        "clip": "ARCHER_MULTI_SHOT",
        "duration": 1.05,
        "pre": 0.24,
        "contact": 0.7,
        "bones": {
          "Chest": [
            -13,
            28,
            18,
            -23
          ],
          "Shoulder_L": [
            -88,
            39,
            -21,
            7
          ],
          "Shoulder_R": [
            -114,
            85,
            10,
            -12
          ],
          "Elbow_R": [
            -104,
            74,
            0,
            0
          ],
          "Hips": [
            -12,
            10,
            -9,
            14
          ],
          "Head": [
            8,
            -11,
            0,
            0
          ]
        }
      },
      {
        "clip": "ARCHER_EVADE_SHOT",
        "duration": 0.83,
        "pre": 0.21,
        "contact": 0.56,
        "bones": {
          "Chest": [
            13,
            -19,
            31,
            -26
          ],
          "Shoulder_L": [
            -55,
            -10,
            -12,
            8
          ],
          "Shoulder_R": [
            -76,
            59,
            18,
            -15
          ],
          "Elbow_R": [
            -50,
            23,
            0,
            0
          ],
          "Hips": [
            -18,
            22,
            -27,
            33
          ],
          "UpperLeg_R": [
            48,
            -24,
            0,
            0
          ],
          "Head": [
            -11,
            18,
            -6,
            11
          ]
        }
      }
    ],
    "mage": [
      {
        "clip": "MAGE_BARRIER_WARD",
        "duration": 1.16,
        "pre": 0.34,
        "contact": 0.67,
        "bones": {
          "Chest": [
            -24,
            27,
            -4,
            7
          ],
          "Shoulder_L": [
            -71,
            92,
            -39,
            12
          ],
          "Shoulder_R": [
            -76,
            93,
            38,
            -15
          ],
          "Elbow_L": [
            -93,
            52,
            0,
            0
          ],
          "Elbow_R": [
            -91,
            55,
            0,
            0
          ],
          "Hips": [
            13,
            -7,
            0,
            0
          ],
          "Head": [
            -8,
            10,
            0,
            0
          ]
        }
      },
      {
        "clip": "MAGE_CHAIN_BOLT",
        "duration": 0.92,
        "pre": 0.23,
        "contact": 0.57,
        "bones": {
          "Chest": [
            -9,
            21,
            -26,
            29
          ],
          "Shoulder_L": [
            -99,
            30,
            34,
            -12
          ],
          "Shoulder_R": [
            -57,
            118,
            -26,
            31
          ],
          "Elbow_L": [
            -67,
            41,
            0,
            0
          ],
          "Elbow_R": [
            -21,
            70,
            0,
            0
          ],
          "Hips": [
            -14,
            17,
            8,
            -17
          ],
          "Head": [
            -12,
            9,
            0,
            0
          ]
        }
      },
      {
        "clip": "MAGE_CHANNEL_RITUAL",
        "duration": 1.52,
        "pre": 0.36,
        "contact": 0.76,
        "bones": {
          "Chest": [
            -35,
            18,
            0,
            0
          ],
          "Shoulder_L": [
            -145,
            67,
            -24,
            -8
          ],
          "Shoulder_R": [
            -144,
            72,
            28,
            8
          ],
          "Elbow_L": [
            -60,
            28,
            0,
            0
          ],
          "Elbow_R": [
            -57,
            35,
            0,
            0
          ],
          "Hips": [
            9,
            -9,
            12,
            -8
          ],
          "Head": [
            21,
            -11,
            0,
            0
          ]
        }
      }
    ],
    "rogue": [
      {
        "clip": "ROGUE_DUAL_BLADE_CHAIN",
        "duration": 0.72,
        "pre": 0.18,
        "contact": 0.48,
        "bones": {
          "Chest": [
            -26,
            35,
            -38,
            43
          ],
          "Shoulder_R": [
            -86,
            66,
            33,
            -19
          ],
          "Shoulder_L": [
            -94,
            82,
            -30,
            17
          ],
          "Elbow_R": [
            -64,
            21,
            0,
            0
          ],
          "Elbow_L": [
            -59,
            34,
            0,
            0
          ],
          "Hips": [
            -31,
            26,
            30,
            -27
          ],
          "UpperLeg_L": [
            29,
            -13,
            0,
            0
          ]
        }
      },
      {
        "clip": "ROGUE_SMOKE_THROW",
        "duration": 0.83,
        "pre": 0.32,
        "contact": 0.61,
        "bones": {
          "Chest": [
            -40,
            24,
            15,
            -8
          ],
          "Shoulder_L": [
            -15,
            -48,
            -21,
            10
          ],
          "Shoulder_R": [
            -81,
            142,
            32,
            -16
          ],
          "Elbow_R": [
            -111,
            73,
            0,
            0
          ],
          "Hips": [
            -24,
            29,
            -14,
            21
          ],
          "UpperLeg_R": [
            46,
            -21,
            0,
            0
          ],
          "Head": [
            16,
            -12,
            0,
            0
          ]
        }
      },
      {
        "clip": "ROGUE_BACK_DODGE",
        "duration": 0.69,
        "pre": 0.16,
        "contact": 0.54,
        "bones": {
          "Chest": [
            31,
            -27,
            27,
            -36
          ],
          "Shoulder_R": [
            -48,
            37,
            18,
            -9
          ],
          "Shoulder_L": [
            -52,
            32,
            -16,
            11
          ],
          "Hips": [
            -41,
            18,
            -27,
            30
          ],
          "UpperLeg_R": [
            53,
            -12,
            0,
            0
          ],
          "UpperLeg_L": [
            -48,
            14,
            0,
            0
          ],
          "Head": [
            13,
            -7,
            5,
            -8
          ]
        }
      }
    ],
    "lancer": [
      {
        "clip": "LANCER_SPEAR_SWEEP",
        "duration": 1.02,
        "pre": 0.37,
        "contact": 0.68,
        "bones": {
          "Chest": [
            -28,
            35,
            -49,
            47
          ],
          "Shoulder_R": [
            -54,
            31,
            -28,
            23
          ],
          "Shoulder_L": [
            -74,
            46,
            26,
            -22
          ],
          "Elbow_R": [
            -65,
            36,
            0,
            0
          ],
          "Elbow_L": [
            -59,
            38,
            0,
            0
          ],
          "Hips": [
            -11,
            21,
            28,
            -24
          ],
          "UpperLeg_L": [
            27,
            -20,
            0,
            0
          ]
        }
      },
      {
        "clip": "LANCER_SHAFT_PARRY",
        "duration": 0.76,
        "pre": 0.22,
        "contact": 0.54,
        "bones": {
          "Chest": [
            -14,
            21,
            24,
            -17
          ],
          "Shoulder_R": [
            -91,
            36,
            29,
            -24
          ],
          "Shoulder_L": [
            -89,
            30,
            -28,
            23
          ],
          "Elbow_R": [
            -92,
            45,
            0,
            0
          ],
          "Elbow_L": [
            -97,
            50,
            0,
            0
          ],
          "Hips": [
            7,
            15,
            -23,
            16
          ],
          "Head": [
            9,
            -8,
            0,
            0
          ]
        }
      },
      {
        "clip": "LANCER_JUMP_THRUST",
        "duration": 0.94,
        "pre": 0.29,
        "contact": 0.65,
        "bones": {
          "Chest": [
            -33,
            59,
            16,
            -25
          ],
          "Shoulder_R": [
            -80,
            -9,
            8,
            0
          ],
          "Shoulder_L": [
            -87,
            -11,
            -8,
            0
          ],
          "Elbow_R": [
            -54,
            23,
            0,
            0
          ],
          "Elbow_L": [
            -51,
            27,
            0,
            0
          ],
          "Hips": [
            -15,
            24,
            11,
            -19
          ],
          "UpperLeg_R": [
            38,
            -26,
            0,
            0
          ],
          "Knee_R": [
            41,
            -19,
            0,
            0
          ]
        }
      }
    ],
    "blacksmith": [
      {
        "clip": "BLACKSMITH_FORGE_REPAIR",
        "duration": 1.42,
        "pre": 0.35,
        "contact": 0.72,
        "bones": {
          "Chest": [
            -28,
            45,
            12,
            -17
          ],
          "Shoulder_R": [
            -85,
            79,
            3,
            8
          ],
          "Shoulder_L": [
            -46,
            35,
            -14,
            5
          ],
          "Elbow_R": [
            -89,
            67,
            0,
            0
          ],
          "Elbow_L": [
            -35,
            16,
            0,
            0
          ],
          "Hips": [
            18,
            -25,
            -8,
            11
          ],
          "Head": [
            19,
            -10,
            0,
            0
          ]
        }
      },
      {
        "clip": "BLACKSMITH_BUILD_RAISE",
        "duration": 1.17,
        "pre": 0.28,
        "contact": 0.63,
        "bones": {
          "Chest": [
            -16,
            29,
            -25,
            32
          ],
          "Shoulder_R": [
            -114,
            96,
            38,
            -34
          ],
          "Shoulder_L": [
            -116,
            99,
            -31,
            30
          ],
          "Elbow_R": [
            -87,
            36,
            0,
            0
          ],
          "Elbow_L": [
            -89,
            38,
            0,
            0
          ],
          "Hips": [
            -15,
            16,
            12,
            -9
          ],
          "UpperLeg_L": [
            34,
            -15,
            0,
            0
          ]
        }
      },
      {
        "clip": "BLACKSMITH_HAMMER_GUARD",
        "duration": 0.84,
        "pre": 0.19,
        "contact": 0.55,
        "bones": {
          "Chest": [
            -10,
            16,
            24,
            -14
          ],
          "Shoulder_R": [
            -67,
            20,
            29,
            -19
          ],
          "Shoulder_L": [
            -83,
            19,
            -33,
            24
          ],
          "Elbow_R": [
            -105,
            70,
            0,
            0
          ],
          "Elbow_L": [
            -68,
            37,
            0,
            0
          ],
          "Hips": [
            -7,
            9,
            -18,
            11
          ],
          "Head": [
            12,
            -5,
            0,
            0
          ]
        }
      }
    ]
  };
  const availableCareerMoves=[...(roleActions[kind]?[roleActions[kind]]:[]),...(careerMoves[kind]||[])];
  for(const move of availableCareerMoves)defs.push([move.clip,move.duration,25]);
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
  // 스킬 준비→관절 접촉 포즈→회복의 키프레임. 이동·타격 시점은 게임 소유.
   const roleAction=availableCareerMoves.find(move=>move.clip===name);
   if(roleAction&&name===roleAction.clip){
     const wind=pulse(u,roleAction.pre,.20),impact=pulse(u,roleAction.contact,.15);
     for(const [bone,angles] of Object.entries(roleAction.bones))
       E[bone]=[angles[0]*wind+angles[1]*impact,angles[2]*wind+angles[3]*impact,0];
     T[1]-=.032*wind-.014*impact;
   }
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
const defaultRoles=['traveler','guardian'];
const availableRoles=[...defaultRoles,'samurai','archer','mage','rogue','lancer','blacksmith'];
const roleArg=process.argv.find(value=>value.startsWith('--roles='));
const requestedRoles=roleArg?roleArg.slice(8).split(',').map(x=>x.trim()).filter(Boolean):defaultRoles;
if(!requestedRoles.length||requestedRoles.some(role=>!availableRoles.includes(role)))throw Error('UNKNOWN_SHARED_HUMANOID_ROLE');
for(const role of [...new Set(requestedRoles)]){
  const asset=buildSharedHumanoid(role);
  const destination=path.join(outputDir,'humanoid-'+role+'.glb');
  fs.writeFileSync(destination,asset.bytes);
  console.log(JSON.stringify({path:destination,vertices:asset.vertexCount,triangles:asset.triangleCount,joints:asset.jointCount,animations:asset.clipNames,nativeRuntimeVerified:false}));
}
