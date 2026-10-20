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
 const play=(state,{blendSeconds=.15}={})=>{
  const key=state.toLowerCase().replace(/-/g,'');
  const match=[...actions.entries()].find(([name])=>name.replace(/[^a-z0-9]/g,'').includes(key))?.[1];
  if(!match||match===active)return false;
  match.reset().fadeIn(blendSeconds).play();
  if(active)active.fadeOut(blendSeconds);
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
