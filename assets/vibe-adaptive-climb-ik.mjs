// Adaptive skeleton retargeting: discover limb chains and solve world-space targets using CCD.
const aliases={leftHand:[/left.*(hand|wrist)/i,/(hand|wrist).*([._ ]l|left)$/i,/mixamorigLeftHand/i],rightHand:[/right.*(hand|wrist)/i,/(hand|wrist).*([._ ]r|right)$/i],leftFoot:[/left.*(foot|ankle)/i,/(foot|ankle).*([._ ]l|left)$/i],rightFoot:[/right.*(foot|ankle)/i,/(foot|ankle).*([._ ]r|right)$/i]};
export function discoverClimbSkeleton(root,{overrides={}}={}){
 const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o)});
 const chains={};for(const [key,patterns] of Object.entries(aliases)){
  const tip=overrides[key]||bones.find(b=>patterns.some(p=>p.test(b.name)));if(!tip)continue;
  const chain=[];let p=tip.parent;while(p&&chain.length<3){if(p.isBone)chain.push(p);p=p.parent}
  if(chain.length>=2)chains[key]={tip,joints:chain.slice(0,2)};
 }
 return {chains,found:Object.keys(chains),missing:Object.keys(aliases).filter(k=>!chains[k])};
}
export function createAdaptiveClimbIK(THREE,{avatar,rig=discoverClimbSkeleton(avatar),iterations=8,tolerance=.035}={}){
 const v=()=>new THREE.Vector3(),q=()=>new THREE.Quaternion();
 const pos=(o)=>o.getWorldPosition(v());
 const tmpAxis=v();
 function solve(chain,target,weight){
  const {tip,joints}=chain;let error=Infinity;
  for(let pass=0;pass<iterations;pass++){
   for(const joint of joints){
    avatar.updateMatrixWorld(true);
    const pivot=pos(joint),end=pos(tip),a=end.sub(pivot).normalize(),b=target.clone().sub(pivot).normalize();
    const dot=THREE.MathUtils.clamp(a.dot(b),-1,1);if(dot>.99999)continue;
    tmpAxis.crossVectors(a,b);if(tmpAxis.lengthSq()<1e-9)continue;tmpAxis.normalize();
    const worldDelta=q().setFromAxisAngle(tmpAxis,Math.acos(dot)*weight);
    const parentWorld=joint.parent.getWorldQuaternion(q());
    const localDelta=parentWorld.clone().invert().multiply(worldDelta).multiply(parentWorld);
    joint.quaternion.premultiply(localDelta).normalize();
   }
   avatar.updateMatrixWorld(true);error=pos(tip).distanceTo(target);if(error<tolerance)break;
  }
  return error;
 }
 return {rig,update(ledge,{phase='hang',weight=1,footContacts=null}={}){
  if(!ledge)return {};
  const out={},forward=phase==='mantle'?.15:0;
  const targets={leftHand:[-.27,0,forward],rightHand:[.27,0,forward],leftFoot:[-.22,-.85,-.18],rightFoot:[.22,-.85,-.18]};
  for(const [key,chain] of Object.entries(rig.chains)){
   const offset=targets[key],contact=footContacts?.[key];
   const target=contact?new THREE.Vector3(contact.x,contact.y,contact.z):new THREE.Vector3(ledge.x+offset[0],ledge.y+offset[1],ledge.z+offset[2]);
   out[key]={error:solve(chain,target,Math.max(0,Math.min(1,weight))),target:target.toArray()};
  }
  return out;
 }};
}
