// Reusable hit detection, health and two-bone ledge IK utilities.
export function createVibeDamageReceiver({health=100,maxHealth=100,invulnerability=.35,onDamage=()=>{}}={}){
 if(!Number.isFinite(health)||!Number.isFinite(maxHealth)||maxHealth<=0)throw Error('Invalid health');
 let hp=Math.max(0,Math.min(maxHealth,health)),timer=0;
 return {get health(){return hp},get alive(){return hp>0},tick(dt){timer=Math.max(0,timer-Math.max(0,dt))},hit(amount){if(!Number.isFinite(amount)||amount<0)throw Error('Invalid damage');if(!hp||timer>0)return false;hp=Math.max(0,hp-amount);timer=invulnerability;onDamage({amount,health:hp,maxHealth,dead:hp===0});return true},heal(amount){if(!Number.isFinite(amount)||amount<0)throw Error('Invalid heal');hp=Math.min(maxHealth,hp+amount);return hp}};
}
export function checkVibeMeleeHit({attacker,target,range=2,arcDegrees=120,height=2.2}){
 if(!attacker?.position||!target?.position)return false;
 const dx=target.position.x-attacker.position.x,dz=target.position.z-attacker.position.z;
 const distance=Math.hypot(dx,dz);
 if(distance>range||Math.abs(target.position.y-attacker.position.y)>height)return false;
 if(distance<.001)return true;
 const forward=attacker.forward||{x:0,z:1},length=Math.hypot(forward.x,forward.z)||1;
 const dot=(dx*forward.x+dz*forward.z)/(distance*length);
 return dot>=Math.cos(arcDegrees*Math.PI/360);
}
export function solveVibeTwoBoneIK({root,target,upperLength,lowerLength,bendSign=1}){
 const dx=target.x-root.x,dy=target.y-root.y,d=Math.hypot(dx,dy);
 const reach=Math.max(.0001,Math.min(d,upperLength+lowerLength-.0001));
 const inner=Math.max(-1,Math.min(1,(upperLength**2+reach**2-lowerLength**2)/(2*upperLength*reach)));
 const base=Math.atan2(dy,dx),shoulder=base+bendSign*Math.acos(inner);
 const elbow={x:root.x+Math.cos(shoulder)*upperLength,y:root.y+Math.sin(shoulder)*upperLength};
 return {elbow,shoulder,elbowAngle:Math.atan2(target.y-elbow.y,target.x-elbow.x),reachable:d<=upperLength+lowerLength};
}
export function createVibeClimbIkRig(THREE,{avatar,limbs={},onSolve=()=>{}}={}){
 const targets={leftHand:{x:-.35,y:0,z:0},rightHand:{x:.35,y:0,z:0},leftFoot:{x:-.25,y:-1,z:0},rightFoot:{x:.25,y:-1,z:0}};
 return {update(ledge,{phase='hang',weight=1}={}){
  if(!ledge)return [];
  const solutions=[];
  for(const [id,bones] of Object.entries(limbs)){
   if(!bones?.upper||!bones?.lower)continue;
   const local=targets[id];if(!local)continue;
   const target=new THREE.Vector3(ledge.x+local.x,ledge.y+local.y+(phase==='mantle'?.35:0),ledge.z+local.z);
   const upperWorld=new THREE.Vector3();bones.upper.getWorldPosition(upperWorld);
   const root={x:upperWorld.x,y:upperWorld.y},goal={x:target.x,y:target.y};
   const upperLength=bones.upperLength||.48,lowerLength=bones.lowerLength||.48;
   const result=solveVibeTwoBoneIK({root,target:goal,upperLength,lowerLength,bendSign:id.includes('Hand')?1:-1});
   const desired=Math.atan2(target.y-upperWorld.y,target.x-upperWorld.x);
   bones.upper.rotation.z+=(desired-bones.upper.rotation.z)*Math.max(0,Math.min(1,weight));
   bones.lower.rotation.z+=(result.elbowAngle-bones.lower.rotation.z)*Math.max(0,Math.min(1,weight));
   solutions.push({id,...result});onSolve({id,...result});
  }
  return solutions
 }};
}
