// Three.js integration for animation-driven enemy hits, ledge raycasts and survival effects.
import {createVibeAttackTimeline,resolveVibeClimbContact} from './vibe-advanced-interactions.mjs';
export function createEnemyAnimationCombat(THREE,{mixer,clips={},onHit=()=>{},onTelegraph=()=>{}}={}){
 if(!mixer)throw Error('Animation mixer required');let active=null,action=null;
 return {
  attack(name,{impactAt=.45,duration=null,unblockable=false}={}){
   const clip=clips[name];if(!clip)throw Error('Missing enemy animation '+name);
   action?.stop();action=mixer.clipAction(clip);action.reset();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
   const length=duration||clip.duration;active={name,timeline:createVibeAttackTimeline({duration:length,impactAt,unblockable}),unblockable};
   onTelegraph({name,duration:length,impactAt,unblockable});
  },
  update(dt){if(!active)return null;const event=active.timeline.advance(dt);if(event.impact)onHit({name:active.name,unblockable:active.unblockable});if(event.phase==='finished')active=null;return event},
  parry(){return active?active.timeline.parry(): 'noAttack'},
  stop(){action?.stop();active=null}
 };
}
export function createLedgeRaycastController(THREE,{scene,colliders=[],maxReach=1.5}={}){
 if(!scene)throw Error('Scene required');const ray=new THREE.Raycaster();
 return {
  find(character,{facing={x:0,z:-1},obstacles=[]}={}){
   const origin=new THREE.Vector3(character.x,character.y+1.15,character.z);
   const direction=new THREE.Vector3(facing.x,0,facing.z).normalize();if(direction.lengthSq()<.001)return {canGrab:false,reason:'noDirection'};
   ray.set(origin,direction);ray.far=maxReach;
   const hit=ray.intersectObjects(colliders.length?colliders:scene.children,true).find(x=>x.object.userData?.climbable===true);
   if(!hit)return {canGrab:false,reason:'noLedge'};
   const box=new THREE.Box3().setFromObject(hit.object);
   const ledge={x:hit.point.x,y:box.max.y,z:hit.point.z};
   const result=resolveVibeClimbContact({character,ledge,obstacles,maxReach});
   if(!result.canGrab)return result;
   const landing=new THREE.Vector3(ledge.x,ledge.y+.55,ledge.z);
   const clearance=new THREE.Box3().setFromCenterAndSize(landing,new THREE.Vector3(.65,1.1,.65));
   const blocked=(colliders.length?colliders:scene.children).some(object=>object!==hit.object&&object.userData?.solid===true&&clearance.intersectsBox(new THREE.Box3().setFromObject(object)));
   return blocked?{canGrab:false,reason:'blocked'}:result;
  }
 };
}
export function createSurvivalSceneEffects(THREE,{scene,camera,documentRef=typeof document==='undefined'?null:document}={}){
 const fog=scene.fog,baseFog=scene.fog?.density??0;let overlay=null;
 if(documentRef){overlay=documentRef.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9000;opacity:0;transition:opacity .2s';documentRef.body.append(overlay)}
 let current={danger:0,heat:0,cold:0};
 return {
  update(vitals,{reducedMotion=false}={}){
   const danger=Math.max(0,1-Math.min(vitals.thirst,vitals.hunger,vitals.health)/35);
   const heat=Math.max(0,Math.min(1,(vitals.temperature-36)/12));
   const cold=Math.max(0,Math.min(1,(8-vitals.temperature)/25));
   current={danger,heat,cold};
   if(overlay){overlay.style.background=heat>.2?'radial-gradient(circle,transparent 35%,rgba(255,100,25,.5))':cold>.2?'radial-gradient(circle,transparent 35%,rgba(110,175,255,.45))':'radial-gradient(circle,transparent 45%,rgba(160,0,0,.5))';overlay.style.opacity=String(Math.min(.8,Math.max(danger,heat,cold))*(reducedMotion?.6:1))}
   if(scene.fog?.isFogExp2)scene.fog.density=baseFog+danger*.008+cold*.006;
   return {...current}
  },
  dispose(){if(scene.fog===fog&&fog?.isFogExp2)fog.density=baseFog;overlay?.remove()}
 };
}
