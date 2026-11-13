import {VibeGameplayController} from './vibe-gameplay-controller.mjs';
// Optional game integration. Games can bind a character without modifying the shared engine.
import {VibeMotionEngine,createFixedStepMotionLoop} from './vibe-motion-engine.mjs';
export async function connectVibeCharacter({character,clips,genre='realistic',THREE,controls}={}){
 if(!character||!THREE||!Array.isArray(clips))throw Error('character, THREE and clips are required');
 const response=await fetch(new URL('./vibe-visual-design-system.json',import.meta.url));
 if(!response.ok)throw Error('visual design unavailable');
 const design=await response.json();
 const mixer=new THREE.AnimationMixer(character),actions=new Map();
 for(const clip of clips)if(clip?.name)actions.set(clip.name.toLowerCase(),mixer.clipAction(clip));
 let active=null;
 // [메인: 원본 모션 탐색] 엔진 상태와 원본 GLB 이름을 연결한다. 없는 원본은 생성/대체하지 않는다.
 const play=(state,{blendSeconds=.15}={})=>{
  const raw=String(state||'').toLowerCase(),key=raw.replace(/[^a-z0-9]/g,'');
  const aliases={
   idle:['idle','stand','breathing'],walk:['walk','walking','locomotionwalk'],run:['run','running','sprint'],
   jog:['jog','jogging','run','walk'],sprint:['sprint','run','running'],strafe:['sidestep','strafe'],
   attack:['attack','slash','strike','hit'],wave:['wave','waving','greet','greeting'],
   react:['react','reaction','hitreact','damage'],'light-attack':['lightattack','attack','slash'],
   'heavy-attack':['heavyattack','attack'],dodge:['evade','roll'],land:['landing'],
   fall:['falling'],climb:['climbing']
  };
  const names=[key,...(aliases[raw]||[])];
  const clipEntries=[...actions.entries()].map(([name,action])=>({name:name.replace(/[^a-z0-9]/g,''),action}));
  let match=null;
  for(const expected of names){match=clipEntries.find(row=>row.name===expected)?.action;if(match)break;}
  // [원본 클립 이름] 장식 접두어보다 정확한 동작 단어를 우선하고 유사 동작 오인식을 차단한다.
  if(!match)for(const expected of names){match=[...actions.entries()].find(([name])=>expected&&name.split(/[^a-z0-9]+/).includes(expected))?.[1];if(match)break;}
  if(!match)for(const expected of names){match=[...actions.entries()].find(([name])=>expected&&name.split(/[^a-z0-9]+/).some(token=>token===expected||['cycle','loop','forward','inplace'].some(suffix=>token===expected+suffix)))?.[1];if(match)break;}
  if(!match)return false;
  if(match===active)return true;
  const duration=Number.isFinite(blendSeconds)?Math.max(0,Math.min(.5,blendSeconds)):.15;
  // [메인: 동작 혼합] 원본 클립 전환 시 이전 페이드 잔여값을 지우고 실제 교차 혼합한다.
  match.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(active){if(duration>0)match.crossFadeFrom(active,duration,true);else active.stop();}
  active=match;return true;
 };
 const engine=new VibeMotionEngine(design,{play});
 engine.setGenre(genre);
 const step=createFixedStepMotionLoop(engine,{hz:design.motionSystem.runtime.fixedStepHz});
 const api={
  engine,mixer,play,
  createGameplayController(options={}){return new VibeGameplayController({motion:engine,...options});},
  update(delta){if(!Number.isFinite(delta)||delta<=0)return;step(delta);mixer.update(Math.min(delta,.1));},
  move(input){engine.setMovement(input);},
  action(state,options){return options?.buffered ? engine.queueAction(state,options) : engine.enter(state,options);},
  registerClipEvents(state,events){engine.registerClipEvents(state,events);},
  onAnimationEvent(listener){if(typeof listener!=='function')throw Error('listener required');const previous=engine.adapter.onEvent;engine.adapter.onEvent=event=>{previous?.(event);listener(event)};return ()=>{engine.adapter.onEvent=previous}},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(character);},
 };
 if(controls?.subscribe){api.unsubscribe=controls.subscribe(input=>api.move(input));}
 return api;
}
