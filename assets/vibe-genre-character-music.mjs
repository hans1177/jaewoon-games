// Original genre-specific character accessories, animation profiles and procedural music.
export const genreAssets=Object.freeze({
 storybook:{name:'숲의 안내자',color:0x47876a,prop:'staff',bpm:88,scale:[0,2,4,7,9],stride:.4},
 illustration:{name:'수채화 여행자',color:0x93a8bd,prop:'satchel',bpm:72,scale:[0,2,5,7,9],stride:.32},
 wuxia:{name:'강호 검객',color:0x344c65,prop:'blade',bpm:132,scale:[0,3,5,7,10],stride:.8},
 action:{name:'전투 요원',color:0x783c37,prop:'blade',bpm:148,scale:[0,2,3,7,10],stride:.72},
 voxel:{name:'블록 탐험가',color:0x57975e,prop:'pickaxe',bpm:112,scale:[0,2,4,7,9],stride:.56},
 fantasy:{name:'마법 수호자',color:0x58519a,prop:'staff',bpm:108,scale:[0,2,5,7,11],stride:.48},
 horror:{name:'유적 조사원',color:0x494a55,prop:'lantern',bpm:68,scale:[0,1,5,6,10],stride:.3},
 sciFi:{name:'우주 정찰병',color:0x2c7180,prop:'scanner',bpm:126,scale:[0,2,5,7,9],stride:.64},
 cozy:{name:'마을 주민',color:0xc28c6a,prop:'satchel',bpm:78,scale:[0,2,4,7,9],stride:.28},
 platformer:{name:'점프 모험가',color:0x5975bc,prop:'satchel',bpm:136,scale:[0,2,4,7,9],stride:.75}
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
// [메인: 캐릭터 디자인 감독] 승인되지 않은 원형 장비를 합성하지 않고 이미 장착된 의상 재질만 변주한다.
export function createVibeGenreCharacter(THREE,base,genre='storybook'){
 const spec=genreAssets[genre];if(!spec)throw Error('Unknown genre');
 const root=base?.root||base;if(!root?.traverse)throw Error('Character group required');
 const originals=new Map(),accent=new THREE.Color(spec.color);
 root.traverse(mesh=>{
  if(!mesh.isMesh||!/outfit|armor|coat|cloth|fabric|robe|tunic|sleeve|jacket|shirt|pants|skirt|cape/i.test(mesh.name||''))return;
  for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
   if(!material?.color?.clone||originals.has(material))continue;
   originals.set(material,material.color.clone());
   // 원본 텍스처·UV·지오메트리·캐릭터 실루엣은 변경하지 않는다.
   material.color.lerp(accent,.22);material.needsUpdate=true;
  }
 });
 return {group:root,spec,applied:originals.size,assetCreated:false,
  dispose(){for(const [material,color] of originals){material.color.copy(color);material.needsUpdate=true}originals.clear()}
 };
}
export function createVibeGenreAnimation(character,genre='storybook'){
 const spec=genreAssets[genre];if(!spec)throw Error('Unknown genre');
 const root=character?.root||character;const baseY=root.position.y,baseZ=root.rotation.z;let t=0,action='idle';
 return {play(name){if(!['idle','walk','run','attack','react'].includes(name))throw Error('Unknown animation');action=name;t=0},
  update(dt){if(!Number.isFinite(dt)||dt<=0)return;t+=Math.min(dt,.1);
   const moving=action==='walk'||action==='run',attack=action==='attack';
   root.position.y=baseY+Math.sin(t*(moving?12:2.3))*(moving?spec.stride*.1:.018);
   root.rotation.z=baseZ+Math.sin(t*(attack?15:moving?7:1.5))*(attack?.12:moving?.06:.015);
  },dispose(){root.position.y=baseY;root.rotation.z=baseZ},get action(){return action}};
}
export function createVibeGenreMusic({audioContext=null,volume=.07}={}){
 let ctx=audioContext,master=null,genre='storybook',playing=false,next=0,step=0;const active=new Set();
 async function unlock(){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!ctx&&C)ctx=new C();if(ctx?.state==='suspended')await ctx.resume();if(ctx&&!master){master=ctx.createGain();master.gain.value=clamp(volume,0,.3);master.connect(ctx.destination)}return !!ctx}
 function note(freq,start,duration){const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=['action','voxel','sciFi'].includes(genre)?'triangle':'sine';osc.frequency.setValueAtTime(freq,start);env.gain.setValueAtTime(.0001,start);env.gain.exponentialRampToValueAtTime(.22,start+.015);env.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(env);env.connect(master);osc.onended=()=>{active.delete(osc);osc.disconnect();env.disconnect()};active.add(osc);osc.start(start);osc.stop(start+duration+.01)}
 return {async start(name='storybook'){if(!genreAssets[name])throw Error('Unknown genre');await unlock();genre=name;next=ctx?.currentTime||0;step=0;playing=!!ctx;return playing},
  setGenre(name){if(!genreAssets[name])throw Error('Unknown genre');genre=name;step=0;next=ctx?.currentTime||0},
  update(){if(!playing||!ctx)return;const spec=genreAssets[genre],beat=60/spec.bpm;let count=0;while(next<ctx.currentTime+.12&&count++<8){const semitone=spec.scale[step%spec.scale.length]+12*(Math.floor(step/spec.scale.length)%2);note(220*2**(semitone/12),next,beat*.7);next+=beat;step++}if(next<ctx.currentTime)next=ctx.currentTime},
  stop(){playing=false;for(const osc of active){try{osc.stop()}catch{}}active.clear()},dispose(){this.stop();master?.disconnect()},get genre(){return genre}};
}
