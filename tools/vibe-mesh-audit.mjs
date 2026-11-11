// 파일명: tools/vibe-mesh-audit.mjs
// 캐릭터 메쉬·리그 품질 판정기. 측정은 tools/vibe_mesh_audit.py(Blender/bpy), 판정은 여기서 한다.
// 사용: node tools/vibe-mesh-audit.mjs <hero.blend|hero.glb> [--out audit.json]
// 환경: VIBE2_BLENDER_BINARY=blender 가 있으면 Blender로, 없으면 python3 의 bpy 모듈로 측정한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const LIMITS={maxInfluences:4,groundTolerance:0.03,symmetryTolerance:0.08,floatingGapRatio:0.03,maxTriangles:150000,primitiveShareBlock:0.3};

// 측정 JSON → {pass, failures[], productionBlockers[], stats}
// failures = 리그/메쉬가 고장난 것. productionBlockers = 오너 규칙상 제품 에셋으로 못 쓰는 사유(고장은 아님).
export function evaluateAudit(a,limits=LIMITS){
  const failures=[],productionBlockers=[];
  const meshes=a.meshes||[];
  if(!meshes.length)failures.push('NO_MESH');
  if(!(a.armatures||[]).length)failures.push('NO_ARMATURE');
  for(const arm of a.armatures||[])if(arm.roots!==1)failures.push(`ARMATURE_ROOTS:${arm.name}:${arm.roots}`);
  for(const m of meshes){
    if(m.orphan)failures.push(`ORPHAN_MESH:${m.name}`);
    if(m.unweightedVertices>0)failures.push(`UNWEIGHTED_VERTICES:${m.name}:${m.unweightedVertices}`);
    if(m.maxInfluences>limits.maxInfluences)failures.push(`TOO_MANY_INFLUENCES:${m.name}:${m.maxInfluences}`);
    if(m.unnormalizedVertices>0)failures.push(`UNNORMALIZED_WEIGHTS:${m.name}:${m.unnormalizedVertices}`);
    if(m.nearestGapRatio>limits.floatingGapRatio&&!/^Handheld_/i.test(m.name))failures.push(`FLOATING_PART:${m.name}:${m.nearestGapRatio}`);
  }
  if(Math.abs(a.groundOffsetRatio)>limits.groundTolerance)failures.push(`GROUND_OFFSET:${a.groundOffsetRatio}`);
  for(const p of a.symmetry||[])if(Math.max(p.sizeErr,p.posErr,p.zErr)>limits.symmetryTolerance)failures.push(`ASYMMETRIC:${p.pair.join('/')}`);
  if(a.triangles>limits.maxTriangles)failures.push(`TRIANGLE_BUDGET:${a.triangles}`);
  const prim=meshes.filter(m=>m.primitiveLike).length;
  const share=meshes.length?prim/meshes.length:0;
  if(share>limits.primitiveShareBlock)productionBlockers.push(`PRIMITIVE_BUILT_MESH:${prim}/${meshes.length}`);
  return {pass:failures.length===0,failures,productionBlockers,productionEligible:failures.length===0&&productionBlockers.length===0,
    stats:{meshes:meshes.length,triangles:a.triangles,bones:(a.armatures||[]).reduce((n,x)=>n+x.bones,0),actions:(a.actions||[]).length,primitiveShare:Number(share.toFixed(3))}};
}

// [모션 곡선 정적 감사] 실제 뼈 키프레임의 존재·움직임만 판정한다.
// 애니메이션 재생, 충돌, 공격 타이밍, 게임 적용 성공을 대신하지 않는다.
export function evaluateMotionCurves(actions=[]){
  const rows=Array.isArray(actions)?actions:[];
  const inspected=rows.filter(row=>row?.curvesInspected===true);
  const valid=inspected.filter(row=>{
    const range=row.frames;
    return Array.isArray(range)&&range.length===2&&
      Number.isFinite(range[0])&&Number.isFinite(range[1])&&range[1]>range[0]&&
      Number.isSafeInteger(row.keyframeCount)&&row.keyframeCount>=2&&
      Number.isSafeInteger(row.validBoneCurves)&&row.validBoneCurves>0&&
      Number.isSafeInteger(row.movingBoneCurves)&&row.movingBoneCurves>0&&
      row.movingBoneCurves<=row.validBoneCurves&&
      row.invalidCurves===0;
  });
  return {observedClips:rows.length,inspectedClips:inspected.length,
    validMovingClips:valid.length,
    validClipNames:valid.slice(0,64).map(row=>String(row.name||'').slice(0,90)),
    invalidOrUnmeasuredClips:rows.length-valid.length,
    observedBoneCurves:inspected.reduce((n,row)=>n+(Number.isSafeInteger(row.boneCurves)?row.boneCurves:0),0),
    movingBoneCurves:valid.reduce((n,row)=>n+row.movingBoneCurves,0),
    curveMeasurementAvailable:inspected.length>0,
    gameplayMotionVerified:false,nativeRuntimeVerified:false,gameApplied:false};
}

export function measure(input,{blender=process.env.VIBE2_BLENDER_BINARY,out}={}){
  const script=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'vibe_mesh_audit.py');
  const output=out||path.join(fs.mkdtempSync(path.join(os.tmpdir(),'vibe-audit-')),'audit.json');
  let r;
  if(blender)r=spawnSync(blender,['--background','--factory-startup','--python-exit-code','1','--python',script,'--','--input',path.resolve(input),'--output',output],{encoding:'utf8',maxBuffer:1<<26});
  else r=spawnSync('python3',['-c',`import sys,runpy;sys.argv=['x','--','--input',${JSON.stringify(path.resolve(input))},'--output',${JSON.stringify(output)}];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<26});
  if(r.status!==0||!fs.existsSync(output))throw new Error('MESH_AUDIT_MEASURE_FAILED: '+String(r.stderr||r.stdout).split('\n').slice(-6).join('\n'));
  return JSON.parse(fs.readFileSync(output,'utf8'));
}

export function blenderAvailable(){
  if(process.env.VIBE2_BLENDER_BINARY)return spawnSync(process.env.VIBE2_BLENDER_BINARY,['--version']).status===0;
  return spawnSync('python3',['-c','import bpy']).status===0;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const input=process.argv[2];
  if(!input){console.error('usage: node tools/vibe-mesh-audit.mjs <hero.blend|hero.glb> [--out audit.json]');process.exit(2);}
  const outArg=process.argv.indexOf('--out');
  const raw=measure(input);
  const verdict=evaluateAudit(raw);
  if(outArg>0)fs.writeFileSync(process.argv[outArg+1],JSON.stringify({verdict,raw},null,1));
  console.log(JSON.stringify(verdict,null,1));
  console.log(verdict.pass?'VIBE_MESH_AUDIT=PASS':'VIBE_MESH_AUDIT=FAIL');
  console.log(verdict.productionEligible?'VIBE_MESH_PRODUCTION=ELIGIBLE':'VIBE_MESH_PRODUCTION=BLOCKED');
  process.exit(verdict.pass?0:1);
}
