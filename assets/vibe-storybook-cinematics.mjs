// Original hand-painted storybook look + expressive feature-animation-inspired timing.
// All scene elements are procedural; no copied characters, frames, or third-party visual assets.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export const vibeStorybookPresets=Object.freeze({
 enchantedForest:{background:0x93b6a1,fog:0x7c9b83,ground:0x486b51,accent:0xf7d89c,wind:.8,particles:22,exposure:1.05},
 sunsetVillage:{background:0xf2ba91,fog:0xd49b85,ground:0x9c9a65,accent:0xffdfaa,wind:.4,particles:12,exposure:1.12},
 moonlitRuins:{background:0x304660,fog:0x405773,ground:0x3c515b,accent:0xa6d9ff,wind:.3,particles:17,exposure:.85},
 emberVolcano:{background:0x513d40,fog:0x664345,ground:0x433a39,accent:0xffa25d,wind:1.1,particles:32,exposure:.9}
});
export function createVibeStorybookWorld(THREE,scene,{preset='enchantedForest',seed=1337,reducedMotion=false}={}){
 if(!vibeStorybookPresets[preset])throw Error('Unknown storybook preset');
 let state=seed>>>0||1;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const root=new THREE.Group();root.name='VibeStorybookWorld';scene.add(root);
 const palette=vibeStorybookPresets[preset];const oldBackground=scene.background,oldFog=scene.fog;
 scene.background=new THREE.Color(palette.background);scene.fog=new THREE.FogExp2(palette.fog,.018);
 const material=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
 const grass=material(palette.ground),bark=material(0x715e4d),leaf=material(0x668b65),warm=material(palette.accent);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),grass);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
 const props=[],sway=[];
 for(let i=0;i<26;i++){
  const angle=rand()*Math.PI*2,radius=6+rand()*23,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  const tree=new THREE.Group();tree.position.set(x,0,z);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.14,.23,2.2,7),bark);trunk.position.y=1.1;trunk.castShadow=true;tree.add(trunk);
  for(let j=0;j<3;j++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.9+j*.16,1),leaf);crown.position.set((j-1)*.32,2.1+j*.34,0);crown.castShadow=true;tree.add(crown)}
  root.add(tree);props.push(tree);sway.push({object:tree,phase:rand()*6.28,scale:.3+rand()*.6});
 }
 const motes=[];const moteGeo=new THREE.SphereGeometry(.035,5,4);
 for(let i=0;i<palette.particles;i++){
  const mote=new THREE.Mesh(moteGeo,warm);mote.position.set((rand()-.5)*20,.6+rand()*5,(rand()-.5)*20);root.add(mote);
  motes.push({mesh:mote,origin:mote.position.clone(),phase:rand()*6.28,speed:.35+rand()*.6});
 }
 let time=0;
 return {
  update(dt){if(!Number.isFinite(dt)||dt<=0||reducedMotion)return;time+=Math.min(dt,.1);
   for(const item of sway)item.object.rotation.z=Math.sin(time*.7*palette.wind+item.phase)*.018*item.scale;
   for(const item of motes){item.mesh.position.y=item.origin.y+Math.sin(time*item.speed+item.phase)*.18;item.mesh.position.x=item.origin.x+Math.cos(time*.33+item.phase)*.14}
  },
  setReducedMotion(value){reducedMotion=!!value},
  dispose(){scene.remove(root);root.traverse(o=>{if(o.isMesh)o.geometry.dispose()});for(const m of [grass,bark,leaf,warm])m.dispose();scene.background=oldBackground;scene.fog=oldFog},
  root
 };
}
export function createVibePerformanceTiming({fps=60}={}){
 let phase=0;
 return {
  sample(t,{anticipation=.16,action=.25,settle=.3,overshoot=.12}={}){
   t=Math.max(0,t);const total=anticipation+action+settle;
   if(t<anticipation)return {phase:'anticipation',weight:-overshoot*ease(t/Math.max(.001,anticipation)),secondary:0};
   if(t<anticipation+action){const p=ease((t-anticipation)/Math.max(.001,action));return {phase:'action',weight:lerp(-overshoot,1+overshoot,p),secondary:p*.1}}
   if(t<total){const p=ease((t-anticipation-action)/Math.max(.001,settle));return {phase:'settle',weight:lerp(1+overshoot,1,p),secondary:(1-p)*.1}}
   return {phase:'done',weight:1,secondary:0}
  },
  get fps(){return fps}
 };
}
export function createVibeAtmosphericSound({audioContext=null}={}){
 let context=audioContext;
 const active=new Set();
 return {
  async unlock(){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!context&&C)context=new C();if(context?.state==='suspended')await context.resume();return !!context},
  play(type,{volume=.1,pan=0}={}){
   if(!context||context.state!=='running')return false;
   const duration=type==='wind'?.9:type==='chime'?.65:.16;
   const oscillator=context.createOscillator(),gain=context.createGain(),panner=context.createStereoPanner?.();
   oscillator.type=type==='footstep'?'triangle':'sine';
   oscillator.frequency.setValueAtTime(type==='footstep'?125:type==='chime'?660:165,context.currentTime);
   oscillator.frequency.exponentialRampToValueAtTime(type==='footstep'?65:type==='chime'?880:100,context.currentTime+duration);
   gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,clamp(volume,0,.35)),context.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration);
   if(panner){panner.pan.value=clamp(pan,-1,1);oscillator.connect(gain);gain.connect(panner);panner.connect(context.destination)}else{oscillator.connect(gain);gain.connect(context.destination)}
   oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();gain.disconnect();panner?.disconnect()};
   active.add(oscillator);oscillator.start();oscillator.stop(context.currentTime+duration+.01);return true
  },
  dispose(){for(const o of active){try{o.stop()}catch{}}active.clear()}
 };
}
export function createVibeScreenFxOverlay(documentRef,{reducedMotion=false}={}){
 const layer=documentRef.createElement('div');layer.setAttribute('aria-hidden','true');
 layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147481000;opacity:0;transition:none;background:transparent';
 documentRef.body.append(layer);
 return {
  render(effects=[]){const fx=effects.at(-1);if(!fx){layer.style.opacity='0';return}
   layer.style.opacity=String(clamp(fx.opacity)*(reducedMotion?.3:1));
   if(fx.type==='letterbox')layer.style.background='linear-gradient(to bottom,#111 0%,#111 10%,transparent 10%,transparent 90%,#111 90%,#111 100%)';
   else if(fx.type==='vignette')layer.style.background='radial-gradient(ellipse,transparent 35%,rgba(10,16,25,.85) 100%)';
   else layer.style.background=fx.color||'#ffffff';
  },
  setReducedMotion(value){reducedMotion=!!value},
  dispose(){layer.remove()}
 };
}
