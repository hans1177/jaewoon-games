// Standalone enemy dummy with real Three.js attack clips and contact events.
import {createEnemyAnimationCombat} from './vibe-advanced-3d-interactions.mjs';
export function createVibeEnemyDummy(THREE,scene,{position={x:2,y:0,z:0},onHit=()=>{},onTelegraph=()=>{}}={}){
 const root=new THREE.Group();root.name='VibeTrainingEnemy';root.position.set(position.x,position.y,position.z);
 const material=new THREE.MeshStandardMaterial({color:0x994f53,roughness:.78});
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.9,5,9),material);body.position.y=1.2;body.castShadow=true;root.add(body);
 const armPivot=new THREE.Group();armPivot.position.set(-.35,1.65,0);root.add(armPivot);
 const arm=new THREE.Mesh(new THREE.BoxGeometry(.18,.7,.2),material);arm.position.y=-.35;armPivot.add(arm);
 const weapon=new THREE.Mesh(new THREE.BoxGeometry(.08,.85,.1),new THREE.MeshStandardMaterial({color:0xbec8d6,metalness:.7,roughness:.3}));weapon.position.y=-.95;armPivot.add(weapon);
 scene.add(root);
 const clip=new THREE.AnimationClip('EnemySlash',.9,[new THREE.NumberKeyframeTrack(armPivot.name+'.rotation[z]',[0,.25,.48,.7,.9],[-.5,-2.1,.95,.4,-.5])]);
 armPivot.name='EnemyAttackArm';
 const mixer=new THREE.AnimationMixer(root);
 const combat=createEnemyAnimationCombat(THREE,{mixer,clips:{slash:clip},onHit,onTelegraph});
 return {root,combat,attack(){combat.attack('slash',{duration:.9,impactAt:.48})},update(dt){mixer.update(dt);return combat.update(dt)},parry(){return combat.parry()},dispose(){combat.stop();scene.remove(root);root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}})}};
}
