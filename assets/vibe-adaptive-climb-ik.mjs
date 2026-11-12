// 파일명: assets/vibe-adaptive-climb-ik.mjs
// [메인] 승인된 실제 본의 전신 IK. 게임 루트·충돌·판정 권한은 수정하지 않는다.
const limbAliases={
 leftHand:[/left.*(hand|wrist)/i,/(hand|wrist).*([._ ]l|left)$/i,/mixamorigLeftHand/i],
 rightHand:[/right.*(hand|wrist)/i,/(hand|wrist).*([._ ]r|right)$/i],
 leftFoot:[/left.*(foot|ankle)/i,/(foot|ankle).*([._ ]l|left)$/i],
 rightFoot:[/right.*(foot|ankle)/i,/(foot|ankle).*([._ ]r|right)$/i]
};
const axialAliases={
 head:[/^head$/i,/mixamorig:?(?:head)$/i,/neck.*head/i]
};

// [리깅] 존재하는 본 체인만 탐색한다. 없는 본은 만들거나 임의 에셋으로 바꾸지 않는다.
export function discoverClimbSkeleton(root,{overrides={},includeAxial=false}={}){
 if(!root?.traverse)throw Error('A skinned model is required');
 const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o)});
 const targets=includeAxial?{...limbAliases,...axialAliases}:limbAliases;
 const chains={};
 for(const [key,patterns] of Object.entries(targets)){
  const tip=overrides[key]||bones.find(b=>patterns.some(p=>p.test(b.name)));
  if(!tip||!tip.isBone)continue;
  const chain=[];let p=tip.parent;
  while(p&&chain.length<3){if(p.isBone)chain.push(p);p=p.parent}
  if(chain.length>=2)chains[key]={tip,joints:chain.slice(0,2)};
 }
 return {chains,found:Object.keys(chains),missing:Object.keys(targets).filter(k=>!chains[k])};
}

// [메인: CCD 전신 IK] 손·발·머리의 기존 체인을 월드 목표에 맞추고 옵션 관절 제한 적용.
export function createAdaptiveClimbIK(THREE,{avatar,rig=discoverClimbSkeleton(avatar),
 iterations=8,tolerance=.035,jointLimitRadians=Math.PI}={}){
 if(!THREE?.Vector3||!THREE?.Quaternion||!avatar?.updateMatrixWorld)throw Error('3D avatar and Three.js are required');
 const v=()=>new THREE.Vector3(),q=()=>new THREE.Quaternion();
 const pos=o=>o.getWorldPosition(v()),tmpAxis=v();
 const bounds=new Map();
 for(const chain of Object.values(rig.chains||{}))for(const bone of chain.joints)
  if(!bounds.has(bone))bounds.set(bone,bone.quaternion.clone());
 const limit=Math.max(.05,Math.min(Math.PI,Number(jointLimitRadians)||Math.PI));
 const validPoint=p=>p&&['x','y','z'].every(axis=>Number.isFinite(p[axis]));
 function solve(chain,target,weight){
  const {tip,joints}=chain;let error=Infinity;
  if(weight<=0)return pos(tip).distanceTo(target);
  for(let pass=0;pass<Math.max(1,Math.min(16,Math.floor(iterations)));pass++){
   for(const joint of joints){
    avatar.updateMatrixWorld(true);
    const pivot=pos(joint),a=pos(tip).sub(pivot),b=target.clone().sub(pivot);
    if(a.lengthSq()<1e-10||b.lengthSq()<1e-10)continue;
    a.normalize();b.normalize();
    const dot=THREE.MathUtils.clamp(a.dot(b),-1,1);if(dot>.99999)continue;
    tmpAxis.crossVectors(a,b);if(tmpAxis.lengthSq()<1e-9)continue;tmpAxis.normalize();
    const worldDelta=q().setFromAxisAngle(tmpAxis,Math.acos(dot)*weight);
    const parentWorld=joint.parent.getWorldQuaternion(q());
    const localDelta=parentWorld.clone().invert().multiply(worldDelta).multiply(parentWorld);
    joint.quaternion.premultiply(localDelta).normalize();
    if(limit<Math.PI){
     const rest=bounds.get(joint),angle=rest.angleTo(joint.quaternion);
     if(angle>limit){const solved=joint.quaternion.clone();joint.quaternion.copy(rest).slerp(solved,limit/angle);}
    }
   }
   avatar.updateMatrixWorld(true);error=pos(tip).distanceTo(target);if(error<tolerance)break;
  }
  return error;
 }
 function applyTargets(targets,weights,weight){
  const out={};
  for(const [key,chain] of Object.entries(rig.chains||{})){
   const target=targets?.[key];if(!validPoint(target))continue;
   const dest=new THREE.Vector3(target.x,target.y,target.z);
   const strength=Math.max(0,Math.min(1,Number(weights?.[key]??weight)||0));
   out[key]={error:solve(chain,dest,strength),target:dest.toArray()};
  }
  return out;
 }
 return{
  rig,
  // 기존 난간 오르기 동작 호환.
  update(ledge,{phase='hang',weight=1,footContacts=null}={}){
   if(!validPoint(ledge))return {};
   const forward=phase==='mantle'?.15:0;
   const offsets={leftHand:[-.27,0,forward],rightHand:[.27,0,forward],
    leftFoot:[-.22,-.85,-.18],rightFoot:[.22,-.85,-.18]};
   const targets={};
   for(const [key,offset] of Object.entries(offsets)){
    const source=footContacts?.[key]||footContacts?.[key==='leftFoot'?'left':key==='rightFoot'?'right':key];
    targets[key]=validPoint(source)?source:{x:ledge.x+offset[0],y:ledge.y+offset[1],z:ledge.z+offset[2]};
   }
   return applyTargets(targets,null,weight);
  },
  // 새 게임도 기존 IK 책임 함수에 손·발·머리 월드 좌표를 직접 전달할 수 있다.
  updateTargets(targets={},options={}){
   return applyTargets(targets,options.weights,options.weight??1);
  },
  reset(){for(const [bone,rest] of bounds)bone.quaternion.copy(rest);avatar.updateMatrixWorld(true);}
 };
}
