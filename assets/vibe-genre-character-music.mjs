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
export function createVibeGenreCharacter(THREE,base,genre='storybook'){
 const spec=genreAssets[genre];if(!spec)throw Error('Unknown genre');
 const root=base?.root||base;if(!root?.add)throw Error('Character group required');
 const group=new THREE.Group();group.name='Original_'+genre;root.add(group);
 const mat=new THREE.MeshStandardMaterial({color:spec.color,roughness:.72}),gold=new THREE.MeshStandardMaterial({color:0xe2bc78,metalness:.3,roughness:.4});
 const add=(name,geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.name=name;o.position.set(x,y,z);o.castShadow=true;group.add(o);return o};
 add('shoulder_L',new THREE.SphereGeometry(.22,12,8),mat,-.39,1.5,0);
 add('shoulder_R',new THREE.SphereGeometry(.22,12,8),mat,.39,1.5,0);
 const cap=add('genre_headwear',new THREE.ConeGeometry(.3,.23,genre==='voxel'?4:12),mat,0,2.58,0);
 if(genre==='wuxia')cap.scale.set(.5,1.6,.5);
 if(spec.prop==='blade'||spec.prop==='staff'||spec.prop==='pickaxe'){
  const tool=add('gear_'+spec.prop,new THREE.CylinderGeometry(.035,.04,spec.prop==='staff'?1.1:.72,8),gold,.62,1.06,.12);tool.rotation.z=.35;
  if(spec.prop==='pickaxe')add('pickaxe_head',new THREE.BoxGeometry(.4,.1,.13),gold,.5,1.4,.12);
 }else if(spec.prop==='satchel')add('satchel',new THREE.BoxGeometry(.32,.32,.2),gold,.48,1.05,.12);
 else if(spec.prop==='lantern')add('lantern',new THREE.BoxGeometry(.18,.24,.17),gold,.56,.85,.14);
 else add('scanner',new THREE.BoxGeometry(.22,.13,.13),gold,.56,1.02,.14);
 return {group,spec,dispose(){root.remove(group);group.traverse(o=>{if(o.isMesh)o.geometry.dispose()});mat.dispose();gold.dispose()}};
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
